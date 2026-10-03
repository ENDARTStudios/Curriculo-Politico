/**
 * Load das votações nominais da Câmara + recálculo de score.
 * Lê data/raw/camara_votacoes_raw.json (etl/camara_votacoes.py).
 *
 * Presença/produtividade provisionais: cada voto nominal conta como
 * participação; a completude sobe e pode tirar o político do GRAY.
 * Idempotente.
 *   npm run db:load-votacoes
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { calculateIDIP, type LegislativeMetrics } from "@cp/idip";

const prisma = new PrismaClient();

interface RawVote {
  votacao_id: string;
  deputado_id: string;
  nome: string | null;
  voto: string | null;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_votacoes_raw.json");

  let raw: RawVote[];
  try {
    raw = JSON.parse(readFileSync(rawPath, "utf-8"));
  } catch {
    console.error(`❌ Arquivo raw não encontrado: ${rawPath}`);
    console.log("   Rode o ETL primeiro: npm run etl:votacoes");
    process.exit(1);
  }

  console.log(`📥 Processando ${raw.length} votos nominais...`);

  const grouped = raw.reduce<Record<string, RawVote[]>>((acc, v) => {
    if (!v.deputado_id) return acc;
    (acc[v.deputado_id] ??= []).push(v);
    return acc;
  }, {});

  let recalculated = 0;
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
        },
      });
    }

    // Recálculo provisório: presença/produtividade derivadas de participação
    // real em votações; demais eixos ficam no baseline até novas fontes.
    const totalVotes = votes.length;
    const metrics: LegislativeMetrics = {
      integrity: 50,
      productivity: Math.min(100, totalVotes * 10),
      approval: 50,
      oversight: 50,
      presence: Math.min(100, totalVotes * 10),
      transparency: 50,
      costEfficiency: 50,
      campaign: 50,
      hasFinalCondemnation: false,
      hasRejectedAccounts: false,
      dataCompleteness: Math.min(95, 30 + totalVotes * 5),
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

    recalculated++;
    console.log(
      `✅ ${person.politicalName.padEnd(28)} ${totalVotes} voto(s) | Nota ${result.finalScore} | Confiança ${result.confidence}% | ${result.reliability}`,
    );
  }

  console.log(`\n🎉 ${recalculated} político(s) recalculado(s).`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
