/**
 * Copia todos os dados de um banco Prisma para outro — migração de provedor.
 *
 * ── Por que existe ──────────────────────────────────────────────────────────
 * Migrar Postgres costuma ser `pg_dump | psql`. Neste ambiente não havia
 * `pg_dump` (a instalação local do PostgreSQL não tem `bin/`) nem Docker de pé,
 * então a cópia é feita pelo Prisma — que já conhece o schema e portanto
 * **descobre a ordem de dependência sozinho**, em vez de depender de uma lista
 * escrita à mão que envelhece a cada model novo.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   SOURCE_DATABASE_URL="postgresql://..." \
 *   TARGET_DATABASE_URL="postgresql://..." \
 *   npx tsx apps/pipeline/scripts/migrar-banco.ts [--tabelas A,B,C] [--limpar]
 *
 * Sem `--tabelas`, copia todas. `--limpar` apaga o destino antes (útil para
 * reexecutar uma migração que falhou no meio; **destrutivo**).
 *
 * ── Decisões que importam ───────────────────────────────────────────────────
 * 1. Ordem topológica calculada a partir das relações do DMMF: uma tabela só é
 *    copiada depois de tudo que ela referencia, senão a FK falha.
 * 2. `createMany` em lotes, porque uma proposição em lote único estoura o
 *    limite de parâmetros do Postgres (65535). 31.815 proposições não cabem de
 *    uma vez.
 * 3. Auto-relacionamentos (ex.: `Person.terms`) são ignorados no cálculo de
 *    dependência — `Term` depende de `Person`, não o contrário.
 * 4. Nunca copia tabelas na ordem que o DMMF devolve: ele é alfabético, e
 *    ordem alfabética quebra FK.
 */

import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

const origemUrl = process.env.SOURCE_DATABASE_URL;
const destinoUrl = process.env.TARGET_DATABASE_URL;

if (!origemUrl || !destinoUrl) {
  console.error(
    "Defina SOURCE_DATABASE_URL e TARGET_DATABASE_URL.\n" +
      "Exemplo:\n" +
      '  $env:SOURCE_DATABASE_URL="postgresql://..."\n' +
      '  $env:TARGET_DATABASE_URL="postgresql://..."\n' +
      "  npx tsx apps/pipeline/scripts/migrar-banco.ts",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const apenasTabelas = (() => {
  const i = args.indexOf("--tabelas");
  return i >= 0 && args[i + 1] ? args[i + 1].split(",").map((s) => s.trim()) : null;
})();
const limparAntes = args.includes("--limpar");

/** Lote pequeno o bastante para não estourar parâmetros por statement. */
const LOTE = 400;

const origem = new PrismaClient({ datasources: { db: { url: origemUrl } } });
const destino = new PrismaClient({ datasources: { db: { url: destinoUrl } } });

type Modelo = (typeof Prisma.dmmf.datamodel.models)[number];

/** Dependências de FK de um modelo, ignorando auto-relacionamento. */
function dependencias(m: Modelo): string[] {
  const deps = m.fields
    .filter((f) => f.kind === "object" && f.relationFromFields?.length)
    .map((f) => f.type);
  return [...new Set(deps)].filter((d) => d !== m.name);
}

/** Ordem topológica: dependências antes de quem depende delas. */
function ordenar(modelos: Modelo[]): Modelo[] {
  const porNome = new Map(modelos.map((m) => [m.name, m]));
  const saida: Modelo[] = [];
  const estado = new Map<string, "visitando" | "pronto">();

  const visitar = (nome: string) => {
    if (estado.get(nome) === "pronto") return;
    if (estado.get(nome) === "visitando") {
      // Ciclo (não esperado neste schema): interrompe sem entrar em loop.
      return;
    }
    estado.set(nome, "visitando");
    const m = porNome.get(nome);
    if (m) {
      for (const d of dependencias(m)) visitar(d);
      saida.push(m);
    }
    estado.set(nome, "pronto");
  };

  for (const m of modelos) visitar(m.name);
  return saida;
}

/**
 * Ajusta a sequence de uma coluna serial/identity, se existir.
 *
 * Sem isso, inserir IDs explícitos deixa a sequence para trás e o **próximo
 * INSERT natural colide** — falha que só aparece depois, ao criar o primeiro
 * registro novo. Só se aplica a modelos com `Int @id @default(autoincrement())`;
 * os deste schema usam `cuid()` em String e não têm sequence.
 */
async function ajustarSequencia(modelName: string) {
  const tabela = modelName;
  try {
    const linhas = await destino.$queryRawUnsafe<{ col: string }[]>(
      `SELECT column_name AS col FROM information_schema.columns
       WHERE table_name = $1 AND column_default LIKE 'nextval%'`,
      tabela,
    );
    for (const { col } of linhas) {
      await destino.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${tabela}"', '${col}'),
                COALESCE((SELECT MAX("${col}") FROM "${tabela}"), 1), true)`,
      );
    }
  } catch {
    // Modelo sem sequence é o caso normal aqui; silêncio é correto.
  }
}

async function copiar(m: Modelo) {
  const clienteOrigem = (origem as unknown as Record<string, any>)[
    m.name.charAt(0).toLowerCase() + m.name.slice(1)
  ];
  const clienteDestino = (destino as unknown as Record<string, any>)[
    m.name.charAt(0).toLowerCase() + m.name.slice(1)
  ];

  if (!clienteOrigem) {
    console.log(`  ${m.name.padEnd(22)} PULADO (cliente não encontrado)`);
    return { nome: m.name, copiados: 0, pulado: true };
  }

  const total = await clienteOrigem.count();
  if (total === 0) {
    console.log(`  ${m.name.padEnd(22)} vazio`);
    return { nome: m.name, copiados: 0, pulado: false };
  }

  if (limparAntes) {
    await clienteDestino.deleteMany({});
  }

  let copiados = 0;
  for (let pular = 0; pular < total; pular += LOTE) {
    const linhas = await clienteOrigem.findMany({
      skip: pular,
      take: LOTE,
      orderBy: { id: "asc" },
    });
    await clienteDestino.createMany({ data: linhas, skipDuplicates: true });
    copiados += linhas.length;
    process.stdout.write(
      `\r  ${m.name.padEnd(22)} ${copiados}/${total}`,
    );
  }
  process.stdout.write("\n");
  await ajustarSequencia(m.name);
  return { nome: m.name, copiados, pulado: false };
}

async function principal() {
  const todos = [...Prisma.dmmf.datamodel.models];
  const alvos = apenasTabelas
    ? todos.filter((m) => apenasTabelas.includes(m.name))
    : todos;

  const ordenados = ordenar(todos).filter((m) =>
    alvos.some((a) => a.name === m.name),
  );

  console.log(
    `Copiando ${ordenados.length} modelo(s) em ordem de dependência` +
      (limparAntes ? " — LIMPANDO o destino antes" : "") +
      "\n",
  );

  const resultados: Awaited<ReturnType<typeof copiar>>[] = [];
  for (const m of ordenados) {
    try {
      resultados.push(await copiar(m));
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message.split("\n")[0] : String(erro);
      console.error(`\n  ${m.name} FALHOU: ${msg}`);
      throw erro;
    }
  }

  const totalCopiado = resultados.reduce((t, r) => t + r.copiados, 0);
  console.log(`\nTotal de registros copiados: ${totalCopiado.toLocaleString("pt-BR")}`);
}

principal()
  .catch((erro) => {
    console.error("\nMigração interrompida:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await origem.$disconnect();
    await destino.$disconnect();
  });
