/**
 * Seed unificado de PRODUÇÃO — popula o banco do Supabase em uma execução.
 * Assume DATABASE_URL apontando para o Supabase e raws presentes em data/raw/.
 *
 *   npm run seed:production      (da raiz do monorepo)
 *
 * A cadeia vive em lib/cadeia.ts (compartilhada com o bot auto-fix).
 */
import { executarCadeia } from "./lib/cadeia";

const { ok, falhas } = executarCadeia();

console.log(
  ok
    ? falhas.length
      ? `\n🎉 Produção populada (opcionais com falha: ${falhas.join(", ")}).`
      : "\n🎉 Produção populada."
    : "\n❌ Cadeia interrompida — corrija o passo obrigatório e reexecute (todos os loads são idempotentes).",
);
process.exit(ok ? 0 : 1);
