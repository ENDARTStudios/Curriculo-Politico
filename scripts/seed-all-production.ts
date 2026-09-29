/**
 * Seed unificado de PRODUÇÃO — popula o banco do Supabase em uma execução.
 * Assume DATABASE_URL apontando para o Supabase e raws presentes em data/raw/.
 *
 *   DATABASE_URL="postgresql://..." npm run seed:production
 *
 * Ordem respeita dependências: cargas → identidade → custos → seeds → recálculo.
 * Scripts opcionais (fonte indisponível) falham sem interromper a cadeia.
 */
import { spawnSync } from "child_process";

type Passo = { script: string; obrigatorio: boolean; desc: string };

const CADEIA: Passo[] = [
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
  { script: "review-medium", obrigatorio: false, desc: "promoção de casos MEDIUM" },
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

function rodar(passo: Passo): boolean {
  console.log(`\n▶️  ${passo.desc} (tsx scripts/${passo.script}.ts)`);
  const res = spawnSync("npx", ["tsx", `scripts/${passo.script}.ts`], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    if (passo.obrigatorio) {
      console.error(`\n❌ OBRIGATÓRIO FALHOU: ${passo.script}. Interrompendo.`);
      return false;
    }
    console.warn(`⚠️  Opcional falhou: ${passo.script} — seguindo.`);
  }
  return true;
}

let ok = true;
for (const passo of CADEIA) {
  if (!rodar(passo)) {
    ok = false;
    break;
  }
}

console.log(
  ok
    ? "\n🎉 Produção populada. Próximo: apontar o cron de snapshots e validar /status."
    : "\n❌ Cadeia interrompida — corrija o passo obrigatório e reexecute (todos os loads são idempotentes).",
);
process.exit(ok ? 0 : 1);
