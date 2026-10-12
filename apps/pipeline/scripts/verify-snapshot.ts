/**
 * Verificação pós-snapshot (usado pelo cron mensal no GitHub Actions).
 * Falha (exit 1) se o snapshot do mês não for criado.
 *   npx tsx scripts/verify-snapshot.ts
 */
import { PrismaClient } from "@prisma/client";
import { isoUtcDay, monthSnapshotDate } from "./snapshot-date";

const prisma = new PrismaClient();

async function verify() {
  const snapshotDate = monthSnapshotDate();

  const count = await prisma.scoreSnapshot.count({
    where: { snapshotDate },
  });

  console.log(`📊 Snapshots para ${isoUtcDay(snapshotDate)}: ${count}`);

  if (count === 0) {
    console.error("❌ Nenhum snapshot criado!");
    process.exit(1);
  }

  if (count < 400) {
    console.warn("⚠️  Menos de 400 snapshots (esperado ~500). Verifique o script.");
  }

  console.log("✅ Snapshot verificado com sucesso.");
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
