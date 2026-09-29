/**
 * Recálculo multi-fonte do IDIP para todos os políticos:
 *   votações (taxa de participação) + autorias de proposições + presenças.
 * Usa groupBy no banco (não carrega ações na memória).
 *   npm run recalculate-scores
 */
import { PrismaClient, ReliabilityStatus } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import {
  applyCostEfficiency,
  calculateIDIP,
  type LegislativeMetrics,
} from "../src/lib/scoring";
import { CostCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function recalculate() {
  const metaPath = join(process.cwd(), "data", "raw", "camara_votacoes_historico_meta.json");
  let totalNominalSessions = 0;
  try {
    const metadata = JSON.parse(readFileSync(metaPath, "utf-8"));
    totalNominalSessions = metadata.votacoes_nominais ?? 0;
  } catch {
    console.log("⚠️ Metadata do crawl histórico ausente — taxa de participação fica indeterminada.");
  }

  const [voteCounts, billCounts, attendCounts] = await Promise.all([
    prisma.legislativeAction.groupBy({
      by: ["termId"],
      _count: { _all: true },
      where: { actionType: "VOTED" },
    }),
    prisma.billAuthorship.groupBy({ by: ["personId"], _count: { _all: true } }),
    prisma.sessionAttendance.groupBy({ by: ["termId"], _count: { _all: true } }),
  ]);

  const votesPorTerm = new Map(voteCounts.map((v) => [v.termId, v._count._all]));
  const billsPorPerson = new Map(billCounts.map((b) => [b.personId, b._count._all]));
  const presencaPorTerm = new Map(attendCounts.map((a) => [a.termId, a._count._all]));

  const pessoas = await prisma.person.findMany({
    // Seeds são fixtures didáticos (GREEN/RED curados) — o recálculo em massa
    // não pode sobrescrevê-los.
    where: { externalId: { not: { startsWith: "seed-" } } },
    include: {
      terms: {
        orderBy: { startYear: "desc" },
        take: 1,
        include: { costs: true },
      },
    },
  });

  console.log(
    `🔄 Recalculando ${pessoas.length} políticos | sessões nominais: ${totalNominalSessions} | autores: ${billCounts.length} | termos com presença: ${attendCounts.length}\n`,
  );

  const distribuicao: Record<ReliabilityStatus, number> = {
    GREEN: 0, YELLOW: 0, RED: 0, GRAY: 0,
  };
  let updated = 0;

  for (const person of pessoas) {
    const term = person.terms[0];
    if (!term) continue;

    const votesCount = votesPorTerm.get(term.id) ?? 0;
    const billsCount = billsPorPerson.get(person.id) ?? 0;
    const attended = presencaPorTerm.get(term.id) ?? 0;

    const participationRate =
      totalNominalSessions > 0 ? votesCount / totalNominalSessions : 0;

    // Confiança multi-fonte (30 base + até 65):
    //  - votações: até +30 pela taxa de participação real;
    //  - autorias: até +15 (10 proposições satura);
    //  - presença: +15 se ≥20 sessões deliberativas, +10 a partir de 4.
    const dataCompleteness = Math.min(
      95,
      30 +
        Math.min(30, participationRate * 30) +
        Math.min(15, billsCount * 1.5) +
        (attended >= 20 ? 15 : Math.min(10, attended * 2.5)),
    );

    // Presença métrica = participação em votações nominais (sinal real);
    // presenças em sessões são só-positivas (sem ausências) — não viram taxa.
    const presence = Math.min(100, participationRate * 100);
    const productivity = Math.min(100, billsCount * 5);

    // Custo/Benefício (v1.1): real quando há custo anual coletado
    // (CEAP etc., excluindo PATRIMONY que não é gasto público)
    const anoAtual = new Date().getFullYear();
    const mesesDecorridos = new Date().getMonth() + 1;
    const annualCost = term.costs
      .filter((cost) => cost.category !== "PATRIMONY")
      .reduce(
        (sum, cost) =>
          sum + cost.amount * (cost.year === anoAtual ? 12 / mesesDecorridos : 1),
        0,
      );
    const costEfficiency =
      annualCost > 0 ? applyCostEfficiency(annualCost, productivity) : 50;

    const metrics: LegislativeMetrics = {
      integrity: 50,
      productivity,
      approval: 50,
      oversight: 50,
      presence,
      transparency: 50,
      costEfficiency,
      campaign: 50,
      hasFinalCondemnation: false,
      hasRejectedAccounts: false,
      dataCompleteness,
    };
    const result = calculateIDIP(metrics);
    distribuicao[result.reliability]++;

    await prisma.score.upsert({
      where: { id: `score_${term.id}_v1` },
      update: {
        finalScore: result.finalScore,
        confidenceScore: result.confidence,
        reliabilityStatus: result.reliability,
        integrityScore: result.breakdown.integrity.rawValue,
        productivityScore: metrics.productivity,
        transparencyScore: metrics.transparency,
        costEfficiencyScore: annualCost > 0 ? costEfficiency : null,
      },
      create: {
        id: `score_${term.id}_v1`,
        termId: term.id,
        version: "1.1.0",
        finalScore: result.finalScore,
        confidenceScore: result.confidence,
        reliabilityStatus: result.reliability,
        integrityScore: result.breakdown.integrity.rawValue,
        productivityScore: metrics.productivity,
        transparencyScore: metrics.transparency,
        costEfficiencyScore: annualCost > 0 ? costEfficiency : null,
      },
    });

    updated++;
    if (updated % 100 === 0) {
      console.log(`   Progresso: ${updated}/${pessoas.length}`);
    }
  }

  console.log(
    `\n✅ ${updated} scores recalculados → 🟢 ${distribuicao.GREEN} | 🟡 ${distribuicao.YELLOW} | 🔴 ${distribuicao.RED} | ⚪ ${distribuicao.GRAY}`,
  );
}

recalculate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
