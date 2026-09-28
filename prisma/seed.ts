/**
 * Seed de desenvolvimento: três mandatos fictícios (um GREEN, um YELLOW,
 * um RED) com notas calculadas pelo motor IDIP real. Idempotente.
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { calculateIDIP, type LegislativeMetrics } from "../src/lib/scoring";

const prisma = new PrismaClient();

const PARTY = { acronym: "EXM", name: "Partido Exemplo (seed)", ideology: "Nenhuma — dados fictícios" };
const OFFICE = { id: "dep-federal-br", type: "LEGISLATIVE", name: "Deputado Federal", jurisdiction: "BR" };

type LegalSeed = { type: "INVESTIGATION" | "CONDEMNATION"; status: string; court: string; sourceUrl: string };

type SeedCase = {
  externalId: string;
  civilName: string;
  politicalName: string;
  metrics: LegislativeMetrics;
  legal?: LegalSeed[];
};

const CASES: SeedCase[] = [
  {
    externalId: "seed-0001",
    civilName: "Cidadã Exemplo A (Fictícia)",
    politicalName: "Exemplo A",
    metrics: {
      integrity: 100, productivity: 85, approval: 70, oversight: 90,
      presence: 95, transparency: 100, costEfficiency: 80, campaign: 90,
      hasFinalCondemnation: false, hasRejectedAccounts: false, dataCompleteness: 95,
    },
  },
  {
    externalId: "seed-0002",
    civilName: "Cidadão Exemplo B (Fictício)",
    politicalName: "Exemplo B",
    metrics: {
      integrity: 90, productivity: 60, approval: 40, oversight: 50,
      presence: 75, transparency: 70, costEfficiency: 65, campaign: 80,
      hasFinalCondemnation: false, hasRejectedAccounts: false, dataCompleteness: 70,
    },
    // LGPD: inquérito arquivado NÃO deve aparecer na API pública.
    legal: [
      {
        type: "INVESTIGATION",
        status: "ARQUIVADO",
        court: "STF (fictício — seed)",
        sourceUrl: "https://exemplo.invalid/inquerito-arquivado-seed",
      },
    ],
  },
  {
    externalId: "seed-0003",
    civilName: "Cidadão Exemplo C (Fictício)",
    politicalName: "Exemplo C",
    metrics: {
      integrity: 80, productivity: 95, approval: 90, oversight: 80,
      presence: 100, transparency: 90, costEfficiency: 85, campaign: 95,
      hasFinalCondemnation: true, hasRejectedAccounts: false, dataCompleteness: 90,
    },
    legal: [
      {
        type: "CONDEMNATION",
        status: "TRANSITADO_EM_JULGADO",
        court: "STF (fictício — seed)",
        sourceUrl: "https://exemplo.invalid/decisao-seed",
      },
    ],
  },
  {
    // Confiança < 60: termômetro GRAY, deve ficar FORA do ranking.
    externalId: "seed-0004",
    civilName: "Cidadã Exemplo D (Fictícia)",
    politicalName: "Exemplo D (Dados Insuficientes)",
    metrics: {
      integrity: 100, productivity: 100, approval: 100, oversight: 100,
      presence: 100, transparency: 100, costEfficiency: 100, campaign: 100,
      hasFinalCondemnation: false, hasRejectedAccounts: false, dataCompleteness: 55,
    },
  },
];

async function main() {
  const party = await prisma.party.upsert({
    where: { acronym: PARTY.acronym },
    update: {},
    create: PARTY,
  });

  const office = await prisma.office.upsert({
    where: { id: OFFICE.id },
    update: {},
    create: OFFICE,
  });

  for (const seed of CASES) {
    const result = calculateIDIP(seed.metrics, "LEGISLATIVE");

    const person = await prisma.person.upsert({
      where: { externalId: seed.externalId },
      update: {},
      create: {
        externalId: seed.externalId,
        civilName: seed.civilName,
        politicalName: seed.politicalName,
        birthYear: 1970,
      },
    });

    const term = await prisma.term.upsert({
      where: { id: `term-${seed.externalId}` },
      update: {},
      create: {
        id: `term-${seed.externalId}`,
        personId: person.id,
        officeId: office.id,
        partyId: party.id,
        startYear: 2023,
        endYear: 2027,
      },
    });

    const existing = await prisma.score.findFirst({ where: { termId: term.id } });
    const scoreData = {
      termId: term.id,
      version: "1.0.0",
      finalScore: result.finalScore,
      confidenceScore: result.confidence,
      reliabilityStatus: result.reliability,
      integrityScore: result.breakdown.integrity.rawValue,
      productivityScore: result.breakdown.productivity.rawValue,
      transparencyScore: result.breakdown.transparency.rawValue,
    };
    if (existing) {
      await prisma.score.update({ where: { id: existing.id }, data: scoreData });
    } else {
      await prisma.score.create({ data: scoreData });
    }

    if (seed.legal) {
      for (const legal of seed.legal) {
        const existingLegal = await prisma.legalRecord.findFirst({
          where: { personId: person.id, type: legal.type, status: legal.status },
        });
        if (!existingLegal) {
          await prisma.legalRecord.create({
            data: { personId: person.id, ...legal },
          });
        }
      }
    }

    console.log(`Seed OK: ${seed.politicalName} → nota ${result.finalScore} (${result.reliability})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
