/**
 * Load do histórico completo de votações + recálculo por TAXA de participação.
 * Denominador = sessões nominais do período (metadata do crawl).
 *   npm run db:load-votacoes-historico
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { calculateIDIP, type LegislativeMetrics } from "@cp/idip";

const prisma = new PrismaClient();

interface RawVote {
  votacao_id: string;
  votacao_data: string;
  votacao_descricao: string;
  deputado_id: string;
  voto: string | null;
}

interface CrawlMetadata {
  votacoes_nominais: number;
  total_votos_coletados: number;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_votacoes_historico_raw.json");
  const metaPath = join(process.cwd(), "data", "raw", "camara_votacoes_historico_meta.json");

  const votes: RawVote[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  const metadata: CrawlMetadata = JSON.parse(readFileSync(metaPath, "utf-8"));
  const totalNominalSessions = metadata.votacoes_nominais;

  console.log(`📥 Processando ${votes.length} votos de ${totalNominalSessions} sessões nominais...\n`);

  const grouped = votes.reduce<Record<string, RawVote[]>>((acc, v) => {
    if (!v.deputado_id) return acc;
    (acc[v.deputado_id] ??= []).push(v);
    return acc;
  }, {});

  console.log(`📊 ${Object.keys(grouped).length} deputados participaram\n`);

  // Toda a legislatura atual compartilha o mesmo Term (2023-2027) por pessoa;
  // mapear externalId → term uma única vez evita 2 queries por deputado.
  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: null } },
    include: { terms: { orderBy: { startYear: "desc" }, take: 1 } },
  });
  const termPorExternal = new Map(
    pessoas.filter((p) => p.terms[0]).map((p) => [p.externalId!, p.terms[0]]),
  );

  let updated = 0;
  for (const [extId, depVotes] of Object.entries(grouped)) {
    const term = termPorExternal.get(extId);
    if (!term) continue;

    for (const v of depVotes) {
      await prisma.legislativeAction.upsert({
        where: {
          termId_actionType_billId: {
            termId: term.id,
            actionType: "VOTED",
            billId: v.votacao_id,
          },
        },
        update: { voteDirection: v.voto },
        create: {
          termId: term.id,
          actionType: "VOTED",
          billId: v.votacao_id,
          voteDirection: v.voto,
          date: v.votacao_data ? new Date(v.votacao_data) : null,
        },
      });
    }

    // Confiança por TAXA de participação (não contagem bruta):
    // 0 votos = 30% | 50% das sessões = 60% (cruza o limiar) | 100% = 90%
    const totalVotes = depVotes.length;
    const participationRate = totalVotes / totalNominalSessions;
    const dataCompleteness = Math.min(95, 30 + participationRate * 60);
    const activityScore = Math.min(100, participationRate * 100);

    const metrics: LegislativeMetrics = {
      integrity: 50,
      productivity: activityScore,
      approval: 50,
      oversight: 50,
      presence: activityScore,
      transparency: 50,
      costEfficiency: 50,
      campaign: 50,
      hasFinalCondemnation: false,
      hasRejectedAccounts: false,
      dataCompleteness,
    };
    const result = calculateIDIP(metrics);

    await prisma.score.upsert({
      where: { id: `score_${term.id}_v1` },
      update: {
        finalScore: result.finalScore,
        confidenceScore: result.confidence,
        reliabilityStatus: result.reliability,
        integrityScore: result.breakdown.integrity.rawValue,
        productivityScore: metrics.productivity,
        transparencyScore: metrics.transparency,
      },
      create: {
        id: `score_${term.id}_v1`,
        termId: term.id,
        version: "1.0.0",
        finalScore: result.finalScore,
        confidenceScore: result.confidence,
        reliabilityStatus: result.reliability,
        integrityScore: result.breakdown.integrity.rawValue,
        productivityScore: metrics.productivity,
        transparencyScore: metrics.transparency,
      },
    });

    updated++;
    if (updated % 100 === 0) {
      console.log(`   Progresso: ${updated}/${Object.keys(grouped).length}`);
    }
  }

  console.log(`\n🎉 ${updated} deputados recalculados pela taxa de participação.`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
