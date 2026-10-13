/**
 * Migra os dados do Supabase de produção para outro Postgres, usando a
 * **Management API** do Supabase como origem.
 *
 * ── Por que pela API, e não por conexão direta ──────────────────────────────
 * O caminho normal seria `pg_dump`/`psql` com a connection string. Neste
 * ambiente faltavam as duas coisas: não há `pg_dump` instalado (a instalação
 * local do PostgreSQL não tem `bin/`) e **a senha do banco de produção foi
 * perdida** — ela vivia no `apps/web/.env` que foi destruído, e o Supabase não
 * a expõe em lugar nenhum.
 *
 * O `SUPABASE_ACCESS_TOKEN` da Management API resolve isso: o endpoint
 * `POST /v1/projects/{ref}/database/query` executa SQL no projeto **sem exigir a
 * senha do banco**. A origem passa a ser a API; o destino continua sendo
 * Prisma (o banco do Railway).
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   SUPABASE_ACCESS_TOKEN=sbp_... \
 *   SUPABASE_PROJECT_REF=xxxxxxxx \
 *   TARGET_DATABASE_URL="postgresql://..." \
 *   npx tsx apps/pipeline/scripts/migrar-supabase.ts [--limpar] [--tabelas A,B]
 *
 * ── Decisões que importam ───────────────────────────────────────────────────
 * 1. A ordem de cópia é derivada do DMMF do Prisma (relações), não escrita à
 *    mão — mesma lógica de `migrar-banco.ts`, e necessária porque o DMMF
 *    devolve os models em ordem alfabética, que quebra FK.
 * 2. A origem é lida em páginas (`limit`/`offset`) para não montar uma resposta
 *    gigante: `Bill` tem 31.815 linhas.
 * 3. A escrita no destino é feita com SQL parametrizado em lote, porque o
 *    conjunto de colunas precisa vir da origem (que pode ter colunas ainda não
 *    refletidas no cliente Prisma do destino).
 * 4. `--limpar` esvazia o destino antes (destrutivo). Útil para reexecutar uma
 *    migração interrompida.
 */

import { Prisma, PrismaClient } from "@prisma/client";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const destinoUrl = process.env.TARGET_DATABASE_URL;

if (!token || !ref || !destinoUrl) {
  console.error(
    "Defina SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF e TARGET_DATABASE_URL.",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const limparAntes = args.includes("--limpar");
const indiceTabelas = args.indexOf("--tabelas");
const apenasTabelas =
  indiceTabelas >= 0 && args[indiceTabelas + 1]
    ? args[indiceTabelas + 1].split(",").map((s) => s.trim())
    : null;

/** Linhas por página na leitura da origem. */
const PAGINA = 800;

const destino = new PrismaClient({
  datasources: { db: { url: destinoUrl } },
});

type Linha = Record<string, unknown>;

/** Executa SQL na origem pela Management API e devolve as linhas. */
async function sqlOrigem(texto: string): Promise<Linha[]> {
  const resposta = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: texto }),
    },
  );
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`origem HTTP ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
  const json = (await resposta.json()) as Linha[] | Linha;
  return Array.isArray(json) ? json : [json as Linha];
}

function dependencias(m: (typeof Prisma.dmmf.datamodel.models)[number]): string[] {
  const deps = m.fields
    .filter((f) => f.kind === "object" && f.relationFromFields?.length)
    .map((f) => f.type);
  return [...new Set(deps)].filter((d) => d !== m.name);
}

/** Ordem topológica — dependências antes de quem depende delas. */
function ordenar(modelos: (typeof Prisma.dmmf.datamodel.models)[number][]) {
  const porNome = new Map(modelos.map((m) => [m.name, m]));
  const saida: typeof modelos = [];
  const estado = new Map<string, "visitando" | "pronto">();
  const visitar = (nome: string) => {
    if (estado.get(nome) === "pronto" || estado.get(nome) === "visitando") return;
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

/** Nome físico da tabela como o Prisma o cria no Postgres. */
function tabelaFisica(modelName: string): string {
  return modelName;
}

/**
 * Esvazia as tabelas de destino antes de copiar.
 *
 * `DELETE` tabela a tabela não funciona aqui: apagar `Person` viola
 * `Term_personId_fkey` (RESTRICT), porque as tabelas dependentes ainda têm
 * linhas. `TRUNCATE` das tabelas envolvidas **num único comando com CASCADE**
 * resolve todas as FKs de uma vez e dispensa ordenar as exclusões.
 */
async function limparDestino(tabelas: string[]) {
  if (tabelas.length === 0) return;
  const lista = tabelas.map((t) => `"${t}"`).join(", ");
  await destino.$executeRawUnsafe(`TRUNCATE TABLE ${lista} CASCADE`);
  console.log(`Destino esvaziado: ${tabelas.length} tabelas (TRUNCATE CASCADE)\n`);
}

/**
 * Colunas da origem **com o tipo declarado** (`udt_name`).
 *
 * O tipo é essencial, não decorativo: a Management API devolve todo valor como
 * JSON, então um `timestamp` chega como string e o Postgres recusa
 * (`column "createdAt" is of type timestamp but expression is of type text`).
 * Casar cada parâmetro com o tipo da coluna resolve todos os tipos de uma vez —
 * data, numérico, booleano, enum e array — sem uma lista de conversões escrita à
 * mão que envelheceria a cada campo novo.
 */
async function colunasComTipo(
  tabela: string,
): Promise<Array<{ nome: string; tipo: string }>> {
  const linhas = await sqlOrigem(
    `select column_name as nome, udt_name as tipo
       from information_schema.columns
      where table_schema = 'public' and table_name = '${tabela}'
      order by ordinal_position`,
  );
  return linhas.map((l) => ({ nome: String(l.nome), tipo: String(l.tipo) }));
}

/**
 * Enums do DESTINO, indexados pelo nome normalizado (minúsculo).
 *
 * O cast é obrigatório, não opcional: o Postgres **não** coage `text` a enum
 * implicitamente num INSERT — sem cast falha com `column "reliabilityStatus" is
 * of type "ReliabilityStatus" but expression is of type text`.
 *
 * O nome precisa vir do destino e não da origem, porque a origem devolve
 * `udt_name` em minúsculo (`reliabilitystatus`) enquanto o tipo real no destino é
 * `"ReliabilityStatus"`. Interpolar o nome errado dá `type ... does not exist`, e
 * por isso o mapa guarda o nome exato para uso com aspas duplas.
 */
async function enumsDoDestino(): Promise<Map<string, string>> {
  const linhas = await destino.$queryRawUnsafe<{ nome: string }[]>(
    `select t.typname as nome
       from pg_type t
       join pg_namespace n on n.oid = t.typnamespace
      where t.typtype = 'e' and n.nspname = 'public'`,
  );
  return new Map(linhas.map((l) => [l.nome.toLowerCase(), l.nome]));
}

/**
 * Tipo utilizável numa cláusula de cast, ou `null` quando não se deve emitir
 * cast nenhum.
 *
 * `udt_name` vem como `_text` para arrays (convenção do Postgres: prefixo `_`),
 * então é traduzido para `text[]`. Enum devolve o nome **real do destino**, entre
 * aspas duplas, porque o identificador preserva maiúsculas.
 */
function tipoParaCast(udt: string, enums: Map<string, string>): string | null {
  const enumDireto = enums.get(udt.toLowerCase());
  if (enumDireto) return `"${enumDireto}"`;
  if (udt.startsWith("_")) {
    const interno = udt.slice(1);
    const enumInterno = enums.get(interno.toLowerCase());
    if (enumInterno) return `"${enumInterno}"[]`;
    return `${interno}[]`;
  }
  return udt;
}

/**
 * Ajusta o valor vindo da API para o que o Prisma aceita como parâmetro.
 *
 * A Management API já entrega os tipos JSON naturais (número, booleano, null,
 * objetos), então quase nada precisa mudar. Os casos que precisam:
 *
 * - **`undefined` → `null`**: uma coluna ausente na resposta não pode chegar como
 *   `undefined` ao driver, que o rejeita.
 * - **`json`/`jsonb` → string**: nesses tipos o driver exige a representação
 *   textual; passar o objeto direto faz o cast falhar. A decisão vem do **tipo da
 *   coluna**, nunca do formato do valor: `ScoreSnapshot.breakdown` é `jsonb` e
 *   contém um **array**, então uma heurística "array de escalares = array do
 *   Postgres" erra e produz `cannot cast type text[] to jsonb`. O tipo da coluna é
 *   a única fonte confiável.
 * - **`undefined`/objeto em coluna de array** permanece array, para o cast
 *   `::tipo[]` funcionar.
 *
 * Datas chegam como string ISO e funcionam no cast `::timestamp`, então
 * deliberadamente **não** são convertidas para `Date` — a conversão deixaria a
 * responsabilidade do fuso no meio do caminho, e o cast direto preserva o
 * instante que a origem enviou.
 */
function normalizarValor(valor: unknown, tipoColuna: string): unknown {
  if (valor === undefined) return null;
  if (valor === null) return null;

  const tipo = tipoColuna.toLowerCase();
  if (tipo === "json" || tipo === "jsonb") {
    return typeof valor === "string" ? valor : JSON.stringify(valor);
  }

  if (typeof valor === "object" && !(valor instanceof Date)) {
    return JSON.stringify(valor);
  }
  return valor;
}

/**
 * Coluna de ordenação estável para paginar. `id` é a chave primária em todos os
 * models deste schema; se faltar, cai para a primeira coluna e avisa.
 */
function colunaDeOrdem(colunas: string[], tabela: string): string {
  if (colunas.includes("id")) return "id";
  console.warn(`  ${tabela}: sem coluna "id"; paginando por "${colunas[0]}"`);
  return colunas[0];
}

async function copiarTabela(nomeModelo: string) {
  const tabela = tabelaFisica(nomeModelo);
  const colunasInfo = await colunasComTipo(tabela);
  if (colunasInfo.length === 0) {
    console.log(`  ${tabela.padEnd(22)} não existe na origem`);
    return 0;
  }

  const colunas = colunasInfo.map((c) => c.nome);
  const [{ n }] = (await sqlOrigem(
    `select count(*)::int as n from "${tabela}"`,
  )) as Array<{ n: number }>;

  if (n === 0) {
    console.log(`  ${tabela.padEnd(22)} vazio`);
    return 0;
  }

  const ordem = colunaDeOrdem(colunas, tabela);
  const listaColunas = colunas.map((c) => `"${c}"`).join(", ");
  const enums = await enumsDoDestino();
  let copiados = 0;

  for (let deslocamento = 0; deslocamento < n; deslocamento += PAGINA) {
    const linhas = await sqlOrigem(
      `select ${listaColunas} from "${tabela}" order by "${ordem}" limit ${PAGINA} offset ${deslocamento}`,
    );
    if (linhas.length === 0) break;

    // INSERT parametrizado em lote, com cast por coluna. Os valores vão como
    // parâmetros ($1..$n) para não depender de escape manual — o conteúdo inclui
    // texto jurídico com aspas e acentos — e o `::tipo` faz a conversão que a
    // API, devolvendo tudo como JSON, não preserva.
    const valores: unknown[] = [];
    const grupos = linhas.map((linha) => {
      const marcadores = colunasInfo.map((c) => {
        valores.push(normalizarValor(linha[c.nome], c.tipo));
        const cast = tipoParaCast(c.tipo, enums);
        return cast ? `$${valores.length}::${cast}` : `$${valores.length}`;
      });
      return `(${marcadores.join(", ")})`;
    });

    await destino.$executeRawUnsafe(
      `INSERT INTO "${tabela}" (${listaColunas}) VALUES ${grupos.join(", ")}
       ON CONFLICT DO NOTHING`,
      ...valores,
    );

    copiados += linhas.length;
    process.stdout.write(`\r  ${tabela.padEnd(22)} ${copiados}/${n}`);
  }
  process.stdout.write("\n");
  return copiados;
}

/**
 * Ajusta sequences, se existirem. Sem isto, o próximo INSERT natural colide com
 * os IDs copiados — falha que só aparece depois, ao criar o primeiro registro.
 */
async function ajustarSequencias() {
  try {
    const linhas = await destino.$queryRawUnsafe<{ tabela: string; col: string }[]>(
      `select table_name as tabela, column_name as col
         from information_schema.columns
        where table_schema = 'public' and column_default like 'nextval%'`,
    );
    let ajustadas = 0;
    for (const { tabela, col } of linhas) {
      await destino.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${tabela}"', '${col}'),
                COALESCE((SELECT MAX("${col}") FROM "${tabela}"), 1), true)`,
      );
      ajustadas++;
    }
    if (ajustadas > 0) console.log(`\nSequences ajustadas: ${ajustadas}`);
  } catch {
    // Schema sem sequence é o caso normal aqui (IDs são cuid/String).
  }
}

async function principal() {
  const inicio = Date.now();
  const todos = [...Prisma.dmmf.datamodel.models];
  const alvos = apenasTabelas
    ? todos.filter((m) => apenasTabelas.includes(m.name))
    : todos;
  const ordenados = ordenar(todos).filter((m) =>
    alvos.some((a) => a.name === m.name),
  );

  console.log(
    `Origem: Supabase ${ref} (Management API)`,
  );
  console.log(
    `Destino: ${destinoUrl.replace(/(:\/\/[^:]+:)[^@]+(@)/, "$1***$2")}`,
  );
  console.log(
    `${ordenados.length} model(s) em ordem de dependência` +
      (limparAntes ? " — LIMPANDO o destino antes" : "") +
      "\n",
  );

  let total = 0;
  if (limparAntes) {
    // Um único TRUNCATE CASCADE para todas as tabelas: dispensa ordenar as
    // exclusões, que é o que o DELETE tabela a tabela não conseguia fazer.
    await limparDestino(ordenados.map((m) => tabelaFisica(m.name)));
  }
  for (const m of ordenados) {
    total += await copiarTabela(m.name);
  }

  await ajustarSequencias();

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(
    `\nTotal: ${total.toLocaleString("pt-BR")} registros em ${segundos}s`,
  );
}

principal()
  .catch((erro) => {
    console.error(
      "\nMigração interrompida:",
      erro instanceof Error ? erro.message : erro,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await destino.$disconnect();
  });
