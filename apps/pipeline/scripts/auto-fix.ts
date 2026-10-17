/**
 * BOT CONSERTADOR — corrige o que é seguro e idempotente, na ordem:
 *
 *   1. gap-scan inicial (antes)
 *   2. tags temáticas + resumos de projetos (template, sem I/O de rede)
 *   3. [--with-etl] coletas Câmara/Senado para raws ausentes/antigos (>7d)
 *   4. cadeia canônica de carga (lib/cadeia.ts — cargas idempotentes + recálculo + snapshot)
 *   5. gap-scan final (depois) → delta em data/gaps/<data>-fix.md
 *
 *   npm run bot:fix          (da raiz — sem coletas de rede)
 *   npm run bot:fix:etl      (com ETLs Câmara/Senado)
 *
 * Nunca executa: fontes bloqueadas (TCU/STF), bulk TSE 500MB, decisões
 * jurídicas/humanas — essas ficam no relatório como manuais.
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { RAIZ, executarCadeia } from "./lib/cadeia";

const COM_ETL = process.argv.includes("--with-etl");
const DIR_SCRIPTS = join(RAIZ, "apps", "pipeline", "scripts");
// tsx via node direto (sem shell): o caminho do repo contém espaços
const TSX_CLI = join(RAIZ, "node_modules", "tsx", "dist", "cli.mjs");
const PYTHON = process.platform === "win32" ? "python" : "python3";

function rodar(desc: string, cmd: string, args: readonly string[], tolerarFalha = true): boolean {
  console.log(`\n▶️ ${desc}`);
  const res = spawnSync(cmd, [...args], { stdio: "inherit", cwd: RAIZ, shell: false, env: process.env });
  if (res.status !== 0) {
    if (tolerarFalha) {
      console.warn(`⚠️  Falhou (seguindo): ${desc}`);
      return false;
    }
    console.error(`❌ Obrigatório falhou: ${desc}`);
    process.exit(1);
  }
  return true;
}

function rodarTsx(desc: string, script: string, tolerarFalha = true): boolean {
  return rodar(desc, process.execPath, [TSX_CLI, script], tolerarFalha);
}

/** Relatório de gaps do dia (escrito pelo gap-scan). */
function ultimoRelatorio(): { jsonPath: string; json: any } {
  const hoje = new Date().toISOString().slice(0, 10);
  const jsonPath = join(RAIZ, "data", "gaps", `${hoje}-gaps.json`);
  if (!existsSync(jsonPath)) throw new Error(`Relatório não encontrado: ${jsonPath}`);
  return { jsonPath, json: JSON.parse(readFileSync(jsonPath, "utf8")) };
}

// ─────────────────────────────────────────────────────────────────────────────

console.log("🤖 BOT CONSERTADOR — Currículo Político");
console.log(`   Modo: ${COM_ETL ? "com ETLs (Câmara/Senado)" : "seguro (sem coletas de rede)"}\n`);

// 1) Scan ANTES
rodarTsx("Scan inicial", join(DIR_SCRIPTS, "gap-scan.ts"), false);
const antes = ultimoRelatorio();

// 2) Conteúdo (templates — sem rede)
rodarTsx("Tags temáticas de projetos", join(DIR_SCRIPTS, "tag-bills.ts"));
rodarTsx("Resumos em linguagem simples", join(DIR_SCRIPTS, "generate-bill-summaries.ts"));

// 3) ETLs opcionais (fontes públicas e abertas; raw ausente ou >7 dias)
if (COM_ETL) {
  const diasLimite = 7;
  const pares: { raw: string; etl: string }[] = [
    { raw: "camara_deputados_raw.json", etl: "camara_deputados" },
    { raw: "senado_federal_raw.json", etl: "senado_federal" },
    { raw: "camara_votacoes_historico_raw.json", etl: "camara_votacoes_historico" },
    { raw: "camara_proposicoes_raw.json", etl: "camara_proposicoes" },
    { raw: "camara_presenca_raw.json", etl: "camara_presenca" },
  ];
  for (const par of pares) {
    const p = join(RAIZ, "data", "raw", par.raw);
    const idade = existsSync(p)
      ? Math.floor((Date.now() - statSync(p).mtimeMs) / 86_400_000)
      : Infinity;
    if (idade <= diasLimite) {
      console.log(`⏭️  ${par.etl}: raw fresco (${idade === 0 ? "hoje" : `${idade}d`}) — pulando`);
      continue;
    }
    rodar(
      `Coleta ${par.etl} (raw ${idade === Infinity ? "ausente" : `${idade}d`})`,
      PYTHON,
      [join(RAIZ, "apps", "pipeline", "etl", `${par.etl}.py`)],
    );
  }
}

// 4) Cadeia canônica (cargas idempotentes + identidade + recálculo + snapshot)
console.log("\n🔗 Cadeia canônica de carga/recálculo");
const cadeia = executarCadeia();

// 5) Scan DEPOIS + delta
rodarTsx("Scan final", join(DIR_SCRIPTS, "gap-scan.ts"), false);
const depois = ultimoRelatorio();

const antesAuto = antes.json.totais.automatizaveis as number;
const depoisAuto = depois.json.totais.automatizaveis as number;
const delta = antesAuto - depoisAuto;

const hoje = new Date().toISOString().slice(0, 10);
const resumo = `# Execução do Gap Bot — ${hoje}

- Cadeia: **${cadeia.ok ? "✅ completa" : "❌ interrompida"}**${cadeia.falhas.length ? ` (falhas opcionais: ${cadeia.falhas.join(", ")})` : ""}
- Gaps automatizáveis: **${antesAuto} → ${depoisAuto}** (Δ ${delta >= 0 ? "-" : "+"}${Math.abs(delta)})
- Gaps manuais/externos: ${depois.json.totais.manuais}
- Modo: ${COM_ETL ? "com ETLs" : "seguro (sem rede)"}

Detalhe completo: ${depois.jsonPath}
`;
writeFileSync(join(RAIZ, "data", "gaps", `${hoje}-fix.md`), resumo);
console.log(resumo);
console.log(`RELATORIO=${join(RAIZ, "data", "gaps", `${hoje}-fix.md`)}`);
process.exit(cadeia.ok ? 0 : 1);
