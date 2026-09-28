/**
 * Load das votações plenárias expandidas + recálculo de score.
 * Lê data/raw/camara_votacoes_expandido_raw.json (etl/camara_votacoes_expandido.py).
 * Presença/produtividade relativas ao deputado mais ativo da amostra.
 *   npm run db:load-votacoes-expandido
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { calculateIDIP, type LegislativeMetrics } from "../src/lib/scoring";

const prisma = new PrismaClient();

interface RawVote {
  votacao_id: string;
  votacao_data: string | null;
  votacao_descricao: string | null;
  deputado_id: string;
  nome: string | null;
  voto: string | null;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_votacoes_expandido_raw.json");
  const raw: RawVote[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`📥 Processando ${raw.length} votos nominais...\n`);

  const grouped = raw.reduce<Record<string, RawVote[]>>((acc, v) => {
    if (!v.deputado_id) return acc;
    (acc[v.deputado_id] ??= []).push(v);
    return acc;
  }, {});

  const maxVotes = Math.max(...Object.values(grouped).map((v) => v.length));
  console.log(`📊 ${Object.keys(grouped).length} deputados participaram | máximo individual: ${maxVotes} votos\n`);

  for (const [extId, votes] of Object.entries(grouped)) {
    const person = await prisma.person.findUnique({ where: { externalId: extId } });
    if (!person) continue;

    const term = await prisma.term.findFirst({ where: { personId: person.id } });
    if (!term) continue;

    for (const v of votes) {
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

    const totalVotes = votes.length;
    const participacao = (totalVotes / maxVotes) * 100;
    const metrics: LegislativeMetrics = {
      integrity: 50,
      productivity: Math.min(100, participacao),
      approval: 50,
      oversight: 50,
      presence: Math.min(100, participacao),
      transparency: 50,
      costEfficiency: 50,
      campaign: 50,
      hasFinalCondemnation: false,
      hasRejectedAccounts: false,
      dataCompleteness: Math.min(95, 30 + totalVotes * 0.5),
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

    console.log(
      `✅ ${person.politicalName.padEnd(26)} | ${String(totalVotes).padStart(3)} votos | Nota ${String(result.finalScore).padEnd(5)} | Confiança ${result.confidence.toFixed(0)}% | ${result.reliability}`,
    );
  }
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
