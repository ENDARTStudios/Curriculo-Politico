/**
 * CONVERSOR TCU — transforma o CSV oficial em `data/raw/tcu_contas_rejeitadas_raw.json`.
 *
 *   npm run bot:tcu             (converte e relata)
 *   npm run bot:tcu -- --dry    (só relata, não escreve)
 *
 * ── O que estava acontecendo ──────────────────────────────────────────────
 * `data/raw/tcu/` tem os CSV oficiais baixados (contas irregulares, inidôneos,
 * inabilitados) e `etl:legal` nunca os converteu, porque ele é **local-first** e
 * espera um JSON já no formato final. Resultado: a área "Registros jurídicos"
 * ficou com 0 linhas mesmo com a fonte em disco.
 *
 * ── Por que só pessoa física ──────────────────────────────────────────────
 * A maior parte das linhas de contas irregulares é **empresa** (`CPF/CNPJ` com 14
 * dígitos). Empresa não é político, e o banco só tem `Person` — carregar CNPJ
 * geraria milhares de linhas sem destino. Filtramos por CPF (11 dígitos).
 *
 * ── Por que não carrega sozinho ───────────────────────────────────────────
 * Homônimo é o risco central desta base: "José da Silva" aparece muitas vezes. O
 * `load-legal-records.ts` exige nome completo normalizado igual, o que reduz mas
 * não elimina o problema. Este conversor **converte e relata**; a carga é um passo
 * separado (`--carregar`), depois de olhar os números.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const RAIZ = resolve(__dirname, "..", "..", "..");
const CSV = join(RAIZ, "data", "raw", "tcu", "responsaveis-contas-irregulares.csv");
const BASE_CONVERTIDA = join(RAIZ, "data", "raw", "tcu_base_convertida.json");

const DRY = process.argv.includes("--dry");

interface Linha {
  nome: string;
  processo: string;
  uf?: string;
  data_decisao?: string;
  orgao?: string;
}

/**
 * Converte o CSV.
 *
 * O arquivo declara `sep=|` na primeira linha e tem cabeçalho na segunda. O
 * encoding é Windows-1252 (os acentos chegam como `Munic�pio`), então lemos como
 * latin1 — que preserva byte a byte o que o TCU publicou, sem inventar caractere.
 */
function lerCsv(): { total: number; pessoas: Linha[]; empresas: number; semDoc: number } {
  if (!existsSync(CSV)) throw new Error(`CSV ausente: ${CSV}`);

  const texto = readFileSync(CSV, "latin1");
  const linhas = texto.split(/\r?\n/);

  // [0] = "sep=|", [1] = cabeçalho
  const cabecalho = linhas[1]?.split("|") ?? [];
  const iNome = cabecalho.findIndex((c) => /^nome$/i.test(c.trim()));
  const iDoc = cabecalho.findIndex((c) => /cpf/i.test(c));
  const iProcesso = cabecalho.findIndex((c) => /^processo$/i.test(c.trim()));
  const iLink = cabecalho.findIndex((c) => /link do processo/i.test(c));
  const iUf = cabecalho.findIndex((c) => /^uf$/i.test(c.trim()));

  if (iNome < 0 || iDoc < 0 || iProcesso < 0) {
    throw new Error(
      `cabeçalho inesperado (nome=${iNome}, doc=${iDoc}, processo=${iProcesso})`,
    );
  }

  const pessoas: Linha[] = [];
  let empresas = 0;
  let semDoc = 0;

  for (let i = 2; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha || !linha.includes("|")) continue;

    const campos = linha.split("|");
    const nome = (campos[iNome] ?? "").trim();
    const doc = (campos[iDoc] ?? "").replace(/\D/g, "");
    const processo = (campos[iProcesso] ?? "").trim();

    if (!nome || !processo) continue;
    if (!doc) {
      semDoc++;
      continue;
    }
    // 11 dígitos = CPF (pessoa física); 14 = CNPJ (empresa).
    if (doc.length !== 11) {
      empresas++;
      continue;
    }

    const link = iLink >= 0 ? (campos[iLink] ?? "").trim() : "";

    const uf = iUf >= 0 ? (campos[iUf] ?? "").trim().toUpperCase() : "";

    pessoas.push({
      nome,
      processo,
      orgao: "TCU",
      ...(uf ? { uf } : {}),
      ...(link ? { data_decisao: undefined } : {}),
    });
  }

  return { total: linhas.length - 2, pessoas, empresas, semDoc };
}

/** Mesma normalização do carregador: acento e caixa não devem separar nome igual. */
function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function main() {
  console.log("\n⚖️  CONVERSOR TCU\n");

  const { total, pessoas, empresas, semDoc } = lerCsv();
  console.log(`   linhas de dados: ${total}`);
  console.log(`   pessoa física (CPF): ${pessoas.length}`);
  console.log(`   empresa (CNPJ): ${empresas}`);
  console.log(`   sem documento: ${semDoc}`);

  const nomesUnicos = new Set(pessoas.map((p) => normalizar(p.nome)));
  console.log(`   nomes únicos (normalizados): ${nomesUnicos.size}`);

  /* ── Casamento com o acervo ───────────────────────────────────────────────
     A pergunta que decide se vale carregar: quantos destes nomes existem no
     banco, e quantos são ambíguos. Sem isso, carregar seria apostar. */
  const prisma = new PrismaClient();

  // Declarados fora do `try` porque são usados depois do `finally`, na gravação
  // dos candidatos — dentro do bloco, sairiam de escopo.
  const casados: {
    nome: string;
    id: string;
    processo: string;
    ufPolitico: string | null;
    ufTcu: string | null;
    evidencia: "nome+uf" | "nome";
  }[] = [];
  const ambiguos: string[] = [];
  const descartadosPorUf: { nome: string; ufTcu: string; ufPolitico: string }[] = [];

  try {
    const pessoasBanco = await prisma.person.findMany({
      select: {
        id: true,
        politicalName: true,
        civilName: true,
        // A UF vem do cargo, não de uma coluna nova: o carregador cria um
        // `Office` por UF com `jurisdiction` de 2 letras. Verificado: 594/594
        // termos têm UF e nenhuma pessoa tem mais de uma.
        terms: { select: { office: { select: { jurisdiction: true } } } },
      },
    });
    const porNome = new Map<
      string,
      { id: string; nome: string; ufs: Set<string> }[]
    >();
    for (const p of pessoasBanco) {
      const ufs = new Set(
        p.terms
          .map((t) => t.office.jurisdiction ?? "")
          .filter((j) => /^[A-Z]{2}$/.test(j)),
      );
      for (const n of [p.politicalName, p.civilName]) {
        const k = normalizar(n);
        const atual = porNome.get(k) ?? [];
        atual.push({ id: p.id, nome: p.politicalName, ufs });
        porNome.set(k, atual);
      }
    }

    for (const linha of pessoas) {
      const achados = porNome.get(normalizar(linha.nome));
      if (!achados || achados.length === 0) continue;
      if (achados.length > 1) {
        ambiguos.push(linha.nome);
        continue;
      }

      const alvo = achados[0];
      const ufTcu = linha.uf ?? null;
      const ufPolitico = [...alvo.ufs][0] ?? null;

      /*
        UF como evidência, não como certeza.

        Nome completo igual **e** mesmo estado é um indício forte; nome igual em
        estado diferente é quase certamente homônimo e é descartado. Mas dois
        "Carlos Gomes" no mesmo estado ainda são possíveis — por isso o resultado
        continua sendo candidato para curadoria, e não carga automática.
      */
      if (ufTcu && ufPolitico && ufTcu !== ufPolitico) {
        descartadosPorUf.push({ nome: linha.nome, ufTcu, ufPolitico });
        continue;
      }

      casados.push({
        nome: alvo.nome,
        id: alvo.id,
        processo: linha.processo,
        ufPolitico,
        ufTcu,
        evidencia: ufTcu && ufPolitico ? "nome+uf" : "nome",
      });
    }

    const comUf = casados.filter((c) => c.evidencia === "nome+uf");
    console.log(`\n   casados com o acervo: ${casados.length}`);
    console.log(`      com nome + UF: ${comUf.length}`);
    console.log(`      só nome (sem UF no CSV ou no acervo): ${casados.length - comUf.length}`);
    console.log(`   descartados por UF divergente: ${descartadosPorUf.length}`);
    console.log(`   ambíguos (mais de uma pessoa com o mesmo nome): ${ambiguos.length}`);

    for (const c of casados.slice(0, 10)) {
      console.log(
        `      ${c.nome} (${c.ufPolitico ?? "??"}) — processo ${c.processo} [${c.evidencia}]`,
      );
    }
    if (descartadosPorUf.length > 0) {
      console.log(`\n   descartados por UF (provável homônimo):`);
      for (const d of descartadosPorUf.slice(0, 5)) {
        console.log(`      ${d.nome} — TCU:${d.ufTcu} vs acervo:${d.ufPolitico}`);
      }
    }
    if (ambiguos.length > 0) {
      console.log(`\n   ⚠️  ambíguos NÃO devem ser carregados sem revisão:`);
      for (const a of ambiguos.slice(0, 5)) console.log(`      ${a}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  if (DRY) {
    console.log("\n   (dry-run: nada escrito)\n");
    return;
  }

  /*
    ── Saída: candidatos, NÃO arquivo de carga ──────────────────────────────

    A primeira versão escrevia `tcu_contas_rejeitadas_raw.json`, que é o arquivo
    que `db:load-legal` consome. Isso criava um caminho de um comando só entre
    "converter" e "atribuir sanção do TCU a pessoas reais" — e o casamento é só
    por nome completo normalizado, sem documento nem UF no acervo (`Term` não
    guarda estado).

    "Carlos Gomes", "Diego Coronel" e "Dr Flávio" são nomes comuns: atribuir a
    eles uma sanção do TCU com base apenas em homonímia seria publicar acusação
    sem prova. O arquivo de carga passa a exigir curadoria humana.
  */
  const CANDIDATOS = join(RAIZ, "data", "raw", "tcu_casamentos_candidatos.json");
  writeFileSync(CANDIDATOS, JSON.stringify(casados, null, 2), "utf8");

  writeFileSync(BASE_CONVERTIDA, JSON.stringify(pessoas, null, 2), "utf8");
  console.log(`\n   ✅ ${pessoas.length} registros em data/raw/tcu_base_convertida.json`);
  console.log(`   ✅ ${casados.length} candidato(s) em data/raw/tcu_casamentos_candidatos.json`);
  console.log(
    "\n   ⚠️  NADA foi escrito em tcu_contas_rejeitadas_raw.json de propósito.\n" +
      "      Atribuir sanção a pessoa por nome comum exige revisão com documento\n" +
      "      ou UF — o acervo não guarda nenhum dos dois. Revise os candidatos e\n" +
      "      monte o arquivo de carga à mão com os casos confirmados.\n",
  );
}

main().catch((e) => {
  console.error("\n❌ Falhou:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
