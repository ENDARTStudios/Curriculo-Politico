/**
 * Snapshot mensal do IDIP para o Rastreamento Temporal (/metodologia).
 * Rodar todo fim de mês (cron); re-execuções são idempotentes.
 *   npm run db:snapshot
 *
 * A data do snapshot vem de `monthSnapshotDate()` — ver snapshot-date.ts para
 * o motivo de não usar mais o último dia do mês no fuso do executor.
 */
import { PrismaClient } from "@prisma/client";
import { isoUtcDay, monthSnapshotDate } from "./snapshot-date";

const prisma = new PrismaClient();

async function snapshot() {
  const snapshotDate = monthSnapshotDate();

  console.log(`📸 Gerando snapshot de ${isoUtcDay(snapshotDate)}...\n`);

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
