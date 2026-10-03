/**
 * Carga do censo da Câmara (camara_completa_raw.json → Postgres).
 * Mesma convenção do load-camara.ts: office por UF, score inicial GRAY
 * (baseline 50, confiança 30). Idempotente — atualiza os 10 antigos in-place.
 *   npm run db:load-camara-completa
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { calculateIDIP, type LegislativeMetrics } from "@cp/idip";

const prisma = new PrismaClient();

interface RawDeputy {
  id: number;
  nomeCivil?: string;
  ultimoStatus?: {
    nomeEleitoral?: string;
    siglaPartido?: string;
    siglaUf?: string;
    urlFoto?: string;
  } | null;
}

function initialScore(): { metrics: LegislativeMetrics; result: ReturnType<typeof calculateIDIP> } {
  const metrics: LegislativeMetrics = {
    integrity: 50, productivity: 50, approval: 50, oversight: 50,
    presence: 50, transparency: 50, costEfficiency: 50, campaign: 50,
    hasFinalCondemnation: false, hasRejectedAccounts: false,
    dataCompleteness: 30,
  };
  return { metrics, result: calculateIDIP(metrics) };
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_completa_raw.json");
  let raw: RawDeputy[];
  try {
    raw = JSON.parse(readFileSync(rawPath, "utf-8"));
  } catch {
    console.error(`❌ Arquivo não encontrado: ${rawPath}`);
    console.log("   Rode o ETL primeiro: npm run etl:camara-completa");
    process.exit(1);
  }

  console.log(`📥 Carregando ${raw.length} deputados (censo da Câmara)...\n`);
  const { metrics, result } = initialScore();

  let loaded = 0;
  let erros = 0;
  for (const dep of raw) {
    const urna = dep.ultimoStatus?.nomeEleitoral ?? `(sem nome) ${dep.id}`;
    try {
      const sigla = dep.ultimoStatus?.siglaPartido ?? "SEM";
      const uf = dep.ultimoStatus?.siglaUf ?? "BR";

      const party = await prisma.party.upsert({
        where: { acronym: sigla },
        update: {},
        create: { acronym: sigla, name: sigla },
      });

      const office = await prisma.office.upsert({
        where: { id: `office_deputado_federal_${uf}` },
        update: {},
        create: {
          id: `office_deputado_federal_${uf}`,
          type: "LEGISLATIVE",
          name: "Deputado Federal",
          jurisdiction: uf,
        },
      });

      const person = await prisma.person.upsert({
        where: { externalId: String(dep.id) },
        update: {
          civilName: dep.nomeCivil ?? urna,
          politicalName: urna,
          photoUrl: dep.ultimoStatus?.urlFoto ?? null,
        },
        create: {
          externalId: String(dep.id),
          civilName: dep.nomeCivil ?? urna,
          politicalName: urna,
          photoUrl: dep.ultimoStatus?.urlFoto ?? null,
        },
      });

      const termId = `term_${person.id}_${office.id}_2023`;
      const term = await prisma.term.upsert({
        where: { id: termId },
        update: { partyId: party.id },
        create: {
          id: termId,
          personId: person.id,
          officeId: office.id,
          partyId: party.id,
          startYear: 2023,
          endYear: 2027,
        },
      });

      await prisma.score.upsert({
        where: { id: `score_${term.id}_v1` },
        update: {
          finalScore: result.finalScore,
          confidenceScore: result.confidence,
          reliabilityStatus: result.reliability,
          integrityScore: metrics.integrity,
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
          integrityScore: metrics.integrity,
          productivityScore: metrics.productivity,
          transparencyScore: metrics.transparency,
        },
      });

      loaded++;
      if (loaded % 50 === 0) {
        console.log(`   Progresso: ${loaded}/${raw.length}`);
      }
    } catch (e) {
      erros++;
      console.error(`❌ ${urna}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`\n🎉 ${loaded}/${raw.length} deputados carregados (${erros} erros).`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
