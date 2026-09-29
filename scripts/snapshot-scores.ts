/**
 * Snapshot mensal do IDIP para o Rastreamento Temporal (/metodologia).
 * Rodar todo fim de mês (cron); re-execuções são idempotentes.
 *   npm run db:snapshot
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function snapshot() {
  // Usa o último dia do mês corrente como data do snapshot
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const snapshotDate = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate(),
    23, 59, 59,
  );

  console.log(
    `📸 Gerando snapshot de ${snapshotDate.toISOString().split("T")[0]}...\n`,
  );

  // GRAY usa baseline provisório — não vale como histórico
  const scores = await prisma.score.findMany({
    where: { reliabilityStatus: { not: "GRAY" } },
    select: {
      termId: true,
      finalScore: true,
      confidenceScore: true,
      reliabilityStatus: true,
      integrityScore: true,
      productivityScore: true,
      transparencyScore: true,
    },
  });

  const breakdown = (s: (typeof scores)[number]) => ({
    integrity: s.integrityScore,
    productivity: s.productivityScore,
    transparency: s.transparencyScore,
  });

  const data = scores.map((s) => ({
    termId: s.termId,
    snapshotDate,
    finalScore: s.finalScore,
    confidenceScore: s.confidenceScore,
    reliabilityStatus: s.reliabilityStatus,
    breakdown: breakdown(s),
  }));

  // createMany + skipDuplicates: mais rápido que upsert por linha (500+)
  const res = await prisma.scoreSnapshot.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`✅ ${res.count} snapshots criados (de ${scores.length} scores não-GRAY).`);
}

snapshot()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
