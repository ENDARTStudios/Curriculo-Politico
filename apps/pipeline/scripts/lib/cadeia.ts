/**
 * Cadeia canônica de carga/recálculo — única fonte de verdade usada por
 * `seed-all-production.ts` e pelo bot `auto-fix.ts`.
 *
 * Todos os passos são idempotentes. Caminhos resolvidos a partir deste
 * arquivo (funciona de qualquer cwd); os scripts filhos herdam o cwd da
 * raiz do monorepo porque os loads leem data/raw/ relativo à raiz.
 */
import { spawnSync } from "child_process";
import { join, resolve } from "path";

export type Passo = { script: string; obrigatorio: boolean; desc: string };

export const CADEIA: Passo[] = [
  // 1. Cargos e parlamentares
  { script: "load-camara-completa", obrigatorio: true, desc: "513 deputados" },
  { script: "load-senado", obrigatorio: true, desc: "81 senadores" },
  // 2. Atividade parlamentar
  { script: "load-votacoes-historico", obrigatorio: true, desc: "votos nominais + scores iniciais" },
  { script: "load-proposicoes", obrigatorio: true, desc: "proposições e autorias" },
  { script: "load-presenca", obrigatorio: false, desc: "presenças em sessões" },
  { script: "load-ceap-bulk", obrigatorio: true, desc: "CEAP real (bulk Câmara)" },
  // 3. Identidade (TSE)
  { script: "resolve-identity", obrigatorio: true, desc: "tseId + birthYear" },
  { script: "review-medium", obrigatorio: false, desc: "promoção de casos MEDIUM (critérios objetivos)" },
  // 4. Contexto
  { script: "load-fact-checking", obrigatorio: false, desc: "checagens de agências" },
  { script: "mark-first-terms", obrigatorio: false, desc: "flags de carreira" },
  { script: "detect-secret-votes", obrigatorio: false, desc: "flags de voto secreto" },
  // 5. Seeds de conteúdo
  { script: "seed-party-data", obrigatorio: false, desc: "ideologia/história dos partidos" },
  { script: "seed-fixed-benefits", obrigatorio: false, desc: "benefícios fixos por cargo" },
  { script: "seed-historical", obrigatorio: false, desc: "ranking histórico" },
  // 6. Nota final
  { script: "recalculate-scores", obrigatorio: true, desc: "IDIP v1.1 multi-fonte" },
  { script: "apply-integrity-caps", obrigatorio: false, desc: "travas de integridade" },
  { script: "snapshot-scores", obrigatorio: false, desc: "snapshot mensal (bootstrap)" },
];

/** Raiz do monorepo — apps/pipeline/scripts/lib/ → ../../../../ */
export const RAIZ = resolve(__dirname, "..", "..", "..", "..");
const DIR_SCRIPTS = join(RAIZ, "apps", "pipeline", "scripts");

export interface ResultadoCadeia {
  ok: boolean;
  falhas: string[];
}

export function executarCadeia(logPrefixo = ""): ResultadoCadeia {
  const falhas: string[] = [];
  // tsx via node direto (sem shell): o caminho do repo contém espaços
  const tsxCli = join(RAIZ, "node_modules", "tsx", "dist", "cli.mjs");
  for (const passo of CADEIA) {
    console.log(`\n▶️ ${logPrefixo}${passo.desc} (tsx ${passo.script}.ts)`);
    const res = spawnSync(
      process.execPath,
      [tsxCli, join(DIR_SCRIPTS, `${passo.script}.ts`)],
      { stdio: "inherit", cwd: RAIZ, shell: false, env: process.env },
    );
    if (res.status !== 0) {
      if (passo.obrigatorio) {
        console.error(`\n❌ OBRIGATÓRIO FALHOU: ${passo.script}. Interrompendo.`);
        return { ok: false, falhas: [...falhas, passo.script] };
      }
      console.warn(`⚠️  Opcional falhou: ${passo.script} — seguindo.`);
      falhas.push(passo.script);
    }
  }
  return { ok: true, falhas };
}
