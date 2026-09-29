/**
 * Aplica as travas de integridade (SCORING_METHODOLOGY §4) aos scores já
 * calculados, com base nos LegalRecord existentes. Rodar APÓS o
 * recalculate-scores. Exclui seeds.
 *   npm run apply-integrity-caps
 */
import { PrismaClient } from "@prisma/client";
import { calculateIDIP, type LegislativeMetrics } from "../src/lib/scoring";

const prisma = new PrismaClient();

async function applyCaps() {
  console.log("🔒 Aplicando travas de integridade...\n");

  const politicians = await prisma.person.findMany({
    where: { externalId: { not: { startsWith: "seed-" } } },
    include: {
      legalRecords: true,
      terms: { orderBy: { startYear: "desc" }, take: 1, include: { scores: { take: 1 } } },
    },
  });

  let capped = 0;

  for (const person of politicians) {
    const term = person.terms[0];
    const currentScore = term?.scores[0];
    if (!term || !currentScore) continue;

    const hasCondemnation = person.legalRecords.some(
      (r) => r.type === "CONDEMNATION" && r.status === "TRANSITADO_EM_JULGADO",
    );
    const hasAccountsRejected = person.legalRecords.some(
      (r) => r.type === "ACCOUNTS_REJECTED",
    );
    const hasImpeachment = person.legalRecords.some(
      (r) => r.type === "IMPEACHMENT",
    );

    if (!hasCondemnation && !hasAccountsRejected && !hasImpeachment) continue;

    const metrics: LegislativeMetrics = {
      integrity: 0, // trava §4: zerada
      productivity: currentScore.productivityScore,
      approval: 50,
      oversight: 50,
      presence: 50,
      transparency: currentScore.transparencyScore,
      costEfficiency: 50,
      campaign: 50,
      hasFinalCondemnation: hasCondemnation,
      hasRejectedAccounts: hasAccountsRejected,
      dataCompleteness: currentScore.confidenceScore,
    };
    const result = calculateIDIP(metrics);

    await prisma.score.update({
      where: { id: currentScore.id },
      data: {
        finalScore: result.finalScore,
        reliabilityStatus: result.reliability,
        integrityScore: 0,
      },
    });

    capped++;
    console.log(
      `🔴 ${person.politicalName.padEnd(30)} | ${currentScore.finalScore.toFixed(1)} → ${result.finalScore.toFixed(1)}`,
    );
  }

  console.log(`\n✅ ${capped} político(s) com trava de integridade aplicada.`);
}

applyCaps()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
