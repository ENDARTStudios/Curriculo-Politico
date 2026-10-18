/**
 * BOT DE ACERVO — inventaria o que existe, coleta o que falta.
 *
 *   npm run bot:acervo                (inventário, read-only)
 *   npm run bot:acervo -- --coletar   (roda ETL + carga do que está ausente/velho)
 *   npm run bot:acervo -- --area=leis (só uma área)
 *
 * ── Como se diferencia de `bot:gaps` / `bot:fix` ───────────────────────────
 * `bot:gaps` varre o banco atrás de lacunas e classifica; `bot:fix` conserta o que
 * é seguro (tags, resumos) e roda a cadeia canônica. Este bot olha para o
 * **acervo**: cada fonte pública, quanto já foi carregado, há quanto tempo o raw
 * não é atualizado, e se a coleta é automatizável.
 *
 * A separação importa porque as três perguntas são diferentes: "o que está
 * faltando?" (gaps), "o que dá para consertar?" (fix), "o que já temos e de onde
 * veio?" (acervo).
 *
 * ── O que ele nunca faz ────────────────────────────────────────────────────
 * Não coleta fontes que exigem decisão humana ou são bloqueadas: TCU (dados
 * abertos com rate limit agressivo), STF (sem API consolidada) e o bulk do TSE
 * (arquivos de centenas de MB). Essas aparecem no relatório como `manual`, com o
 * motivo — em vez de o bot quebrar silenciosamente ou baixar 500 MB por engano.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { CADEIA } from "./lib/cadeia";

const prisma = new PrismaClient();
const RAIZ = resolve(__dirname, "..", "..", "..");
const DIR_RAW = join(RAIZ, "data", "raw");

const COLETAR = process.argv.includes("--coletar");
const AREA_FILTRO = process.argv.find((a) => a.startsWith("--area="))?.split("=")[1];

/** Um arquivo raw é considerado velho depois disso. */
const DIAS_VELHO = 7;

/**
 * Passos que transformam métrica em nota, aplicam travas e atualizam o
 * snapshot — os três últimos da cadeia canônica.
 *
 * Derivados de `CADEIA` em vez de redigitados: se a ordem mudar lá, muda aqui.
 */
const PASSOS_DERIVADOS = CADEIA.filter((p) =>
  ["recalculate-scores", "apply-integrity-caps", "snapshot-scores"].includes(p.script),
).map((p) => p.script);

const TSX_CLI = join(RAIZ, "node_modules", "tsx", "dist", "cli.mjs");
const PYTHON = process.platform === "win32" ? "python" : "python3";

type Automacao = "auto" | "manual";

interface AreaAcervo {
  id: string;
  nome: string;
  /** Arquivo em data/raw que a coleta produz. */
  raw: string | null;
  etl: string | null;
  carga: string | null;
  /** Coluna `tabela` só para contagem; `null` quando não há tabela direta. */
  tabela: { nome: string; contar: () => Promise<number> } | null;
  automacao: Automacao;
  /** Por que não é automático — obrigatório quando `manual`. */
  motivo?: string;
}

const AREAS: AreaAcervo[] = [
  {
    id: "parlamentares",
    nome: "Parlamentares (Câmara + Senado)",
    raw: "camara_deputados_raw.json",
    etl: "etl:camara",
    carga: "db:load-camara-completa",
    tabela: { nome: "Person", contar: () => prisma.person.count() },
    automacao: "auto",
  },
  {
    id: "votacoes",
    nome: "Votações nominais",
    raw: "camara_votacoes_historico_raw.json",
    etl: "etl:votacoes-historico",
    carga: "db:load-votacoes-historico",
    tabela: {
      nome: "LegislativeAction",
      contar: () => prisma.legislativeAction.count(),
    },
    automacao: "auto",
  },
  {
    id: "leis",
    nome: "Proposições e projetos",
    raw: "camara_proposicoes_raw.json",
    etl: "etl:proposicoes",
    carga: "db:load-proposicoes",
    tabela: { nome: "Bill", contar: () => prisma.bill.count() },
    automacao: "auto",
  },
  {
    id: "presenca",
    nome: "Presença em sessões",
    raw: "camara_presenca_raw.json",
    etl: "etl:presenca",
    carga: "db:load-presenca",
    tabela: {
      nome: "SessionAttendance",
      contar: () => prisma.sessionAttendance.count(),
    },
    automacao: "auto",
  },
  {
    id: "despesas",
    nome: "Cota parlamentar (CEAP)",
    raw: "camara_despesas_bulk_raw.json",
    etl: "etl:ceap-bulk",
    carga: "db:load-ceap-bulk",
    tabela: { nome: "PoliticianCost", contar: () => prisma.politicianCost.count() },
    automacao: "auto",
  },
  {
    id: "patrimonio",
    nome: "Bens declarados (TSE)",
    raw: "tse_bens_raw.json",
    etl: "etl:bens",
    carga: "db:load-patrimony",
    tabela: { nome: "PatrimonyHistory", contar: () => prisma.patrimonyHistory.count() },
    automacao: "auto",
  },
  {
    id: "financiamento",
    nome: "Receitas de campanha (TSE)",
    raw: "camara_receitas_2022_agg.json",
    etl: "etl:receitas",
    carga: "db:load-receitas",
    tabela: { nome: "CampaignFinance", contar: () => prisma.campaignFinance.count() },
    automacao: "auto",
  },
  {
    id: "juridico",
    nome: "Registros jurídicos",
    raw: null,
    etl: null,
    carga: null,
    tabela: { nome: "LegalRecord", contar: () => prisma.legalRecord.count() },
    /*
      Corrigido de `auto` para `manual`.

      A primeira versão classificava como automático porque existia `etl:legal`.
      Mas aquele script é **local-first**: não coleta nada, só repassa arquivos
      que alguém colocou em `data/raw/`. Chamar de automático prometia uma coleta
      que nunca existiria.

      O bloqueio é em duas camadas: (1) TCU retorna 401 sem credenciais e o STF
      não tem API consolidada; (2) mesmo com os CSV oficiais em disco, atribuir a
      sanção a uma pessoa exige casar identidade — o acervo não guarda CPF nem UF
      por mandato, e homônimo é o caso comum ("Carlos Gomes").
    */
    automacao: "manual",
    motivo:
      "Fonte local-first (TCU 401, STF sem API) e casamento de identidade inseguro. `npm run bot:tcu` converte os CSV e gera candidatos; a carga exige curadoria humana.",
  },
  {
    id: "checagem",
    nome: "Checagem de fatos (RSS)",
    raw: "fact_checking_raw.json",
    etl: "etl:fact-checking",
    carga: "db:load-fact-checking",
    tabela: { nome: "VerifiedClaim", contar: () => prisma.verifiedClaim.count() },
    automacao: "auto",
  },
  {
    id: "partidos",
    nome: "Metadados de partidos",
    raw: null,
    etl: null,
    carga: "db:seed-parties",
    tabela: { nome: "Party", contar: () => prisma.party.count() },
    automacao: "auto",
  },
  {
    id: "tcu",
    nome: "Listas do TCU (inelegíveis)",
    raw: null,
    etl: null,
    carga: null,
    tabela: null,
    automacao: "manual",
    motivo:
      "Dados abertos do TCU com rate limit agressivo e formato instável. Coleta manual com revisão, para não publicar lista de inelegibilidade desatualizada.",
  },
  {
    id: "stf",
    nome: "Decisões do STF",
    raw: null,
    etl: null,
    carga: null,
    tabela: null,
    automacao: "manual",
    motivo:
      "Publicadas no Diário de Justiça Eletrônico sem API consolidada. Exige parser de PDF e revisão jurídica — declarado em /stf como acervo em construção.",
  },
  {
    id: "tse-bulk",
    nome: "Bulk de prestação de contas do TSE",
    raw: null,
    etl: null,
    carga: null,
    tabela: null,
    automacao: "manual",
    motivo:
      "Arquivos de centenas de MB. Baixar isso num bot de rotina consumiria banda e disco sem garantia de sucesso; roda sob demanda.",
  },
];

function idadeDias(caminho: string): number | null {
  if (!existsSync(caminho)) return null;
  const ms = Date.now() - statSync(caminho).mtimeMs;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * Resolve um script do `package.json` em (comando, argumentos) executável.
 *
 * ── Por que não usar `npm run` ─────────────────────────────────────────────
 * Com `shell: false`, `spawnSync("npm", …)` falha no Windows porque `npm` é
 * `npm.cmd` — e habilitar shell só para isso reintroduz o problema de codepage e
 * de quoting que este bot tenta evitar.
 *
 * Lendo o `package.json`, o bot honra a mesma declaração que um humano usaria e
 * executa o binário direto: `python` vira o interpretador do sistema, `tsx` vira
 * `node node_modules/tsx/dist/cli.mjs`. Nada de convenção inventada — foi uma
 * convenção inventada (`fact-checking.py`) que fez a coleta "não achar" o ETL.
 */
function resolverScript(nome: string): { cmd: string; args: string[] } | null {
  const pkg = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf-8")) as {
    scripts?: Record<string, string>;
  };
  const linha = pkg.scripts?.[nome];
  const cli = join(RAIZ, "node_modules", "tsx", "dist", "cli.mjs");

  /*
    Duas convenções convivem no projeto, e ambas são legítimas:

    - `package.json` usa nomes com prefixo (`db:snapshot`, `etl:camara`);
    - `lib/cadeia.ts` usa o nome do arquivo (`snapshot-scores`, `load-senado`).

    A primeira versão só entendia a primeira, então a cadeia de derivados
    imprimia "script snapshot-scores não encontrado" e seguia **sem atualizar o
    snapshot** — deixando a nota nova e o histórico velho, que é exatamente a
    divergência que este trabalho tentou eliminar.
  */
  if (!linha) {
    const arquivo = join(RAIZ, "apps", "pipeline", "scripts", `${nome}.ts`);
    if (existsSync(arquivo)) return { cmd: process.execPath, args: [cli, arquivo] };
    return null;
  }

  const partes = linha.trim().split(/\s+/);

  if (partes[0] === "python" || partes[0] === "python3") {
    return { cmd: PYTHON, args: partes.slice(1) };
  }
  if (partes[0] === "tsx") {
    return { cmd: process.execPath, args: [cli, ...partes.slice(1)] };
  }

  return null;
}

function rodar(cmd: string, args: readonly string[], desc: string): boolean {
  console.log(`\n   ▶️ ${desc}`);
  const res = spawnSync(cmd, [...args], {
    stdio: "inherit",
    cwd: RAIZ,
    shell: false,
    env: {
      ...process.env,
      /*
        ── Por que force UTF-8 nos ETLs ──────────────────────────────────────────
        Os scripts Python imprimem emoji (📥, ✅) e, no Windows, o `stdout` do
        subprocesso herda a codepage do console (cp1252). O resultado é
        `UnicodeEncodeError: 'charmap' codec can't encode character '\U0001f4e5'`
        e o ETL morre **antes de buscar qualquer dado**.

        Foi assim que a coleta "falhava" sem motivo aparente: a mensagem de erro
        ficava enterrada no meio do traceback do Python. Forçar `PYTHONIOENCODING`
        resolve para todos os ETLs de uma vez, sem editar 17 arquivos.

        É a mesma família de armadilha de codepage que o AGENTS.md já documenta
        para o PowerShell neste caminho com acento.
      */
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    },
  });
  if (res.status !== 0) {
    console.warn(`   ⚠️  falhou (seguindo): ${desc}`);
    return false;
  }
  return true;
}

async function main() {
  console.log(`\n📦 BOT DE ACERVO ${COLETAR ? "(coletando)" : "(inventário)"}\n`);

  const linhas: string[] = [];
  let coletados = 0;

  for (const area of AREAS) {
    if (AREA_FILTRO && area.id !== AREA_FILTRO) continue;

    const qtd = area.tabela ? await area.tabela.contar() : null;
    const idade = area.raw ? idadeDias(join(DIR_RAW, area.raw)) : null;

    const estado =
      area.automacao === "manual"
        ? "manual"
        : idade === null
          ? "SEM RAW"
          : idade > DIAS_VELHO
            ? `velho (${idade}d)`
            : `ok (${idade}d)`;

    console.log(
      `   ${area.nome.padEnd(34)} ${String(qtd ?? "—").padStart(7)} reg.  ${estado}`,
    );
    if (area.motivo) console.log(`      ↳ ${area.motivo}`);

    linhas.push(
      `| ${area.nome} | ${qtd ?? "—"} | ${estado} | ${area.automacao} |`,
    );

    // Coleta apenas o que é automático e está ausente/velho.
    const precisa = area.automacao === "auto" && (idade === null || idade > DIAS_VELHO);
    if (COLETAR && precisa) {
      for (const passo of [area.etl, area.carga]) {
        if (!passo) continue;
        const cmd = resolverScript(passo);
        if (!cmd) {
          console.log(`   ⚠️  script "${passo}" não encontrado no package.json — pulando`);
          continue;
        }
        rodar(cmd.cmd, cmd.args, passo);
      }
      coletados++;
    } else if (COLETAR && area.automacao === "manual") {
      console.log(`   ⏭️  ${area.id}: manual — decisão humana, não coletado.`);
    }
  }

  console.log("\n─── Resumo ─────────────────────────────────────────────");
  console.log(`   áreas: ${linhas.length} · coletas disparadas: ${coletados}`);

  /*
    ── Nenhuma carga termina sem recalcular ─────────────────────────────────

    Este bloco nasceu de um incidente: rodar `--coletar --area=parlamentares`
    recarregou os 513 deputados e **derrubou o ranking inteiro**. As 594 notas
    viraram GRAY 50,00, porque `load-camara-completa` recria a linha de `Score`
    no baseline inicial — e os passos que transformam métrica em nota, aplicam as
    travas de integridade e atualizam o snapshot nunca rodaram.

    O dado bruto estava certo; o derivado, destruído. Numa plataforma cujo produto
    é a nota, isso é o pior defeito possível: silencioso e total.

    A importação de `lib/cadeia` não é decoração — é o que impede esta lista de
    divergir da cadeia canônica usada por `bot:fix` e pelo seed de produção.
  */
  if (COLETAR && coletados > 0) {
    console.log("\n   🔄 recalculando derivados (a carga invalida nota e snapshot)");
    for (const passo of PASSOS_DERIVADOS) {
      const cmd = resolverScript(passo);
      if (!cmd) {
        console.log(`   ⚠️  script "${passo}" não encontrado — derivados podem estar inconsistentes`);
        continue;
      }
      rodar(cmd.cmd, cmd.args, passo);
    }
  }

  console.log(
    "\n   O acervo não é uma fila infinita: área `manual` não vira tarefa\n" +
      "   automática por insistência. Elas estão listadas com o motivo.\n",
  );
}

main()
  .catch((e) => {
    console.error("\n❌ Falhou:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
