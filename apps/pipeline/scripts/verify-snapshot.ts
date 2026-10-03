/**
 * Verificação pós-snapshot (usado pelo cron mensal no GitHub Actions).
 * Falha (exit 1) se o snapshot do mês não for criado.
 *   npx tsx scripts/verify-snapshot.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const snapshotDate = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate(),
    23, 59, 59,
  );

  const count = await prisma.scoreSnapshot.count({
    where: { snapshotDate },
  });

  console.log(
    `📊 Snapshots para ${snapshotDate.toISOString().split("T")[0]}: ${count}`,
  );

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
