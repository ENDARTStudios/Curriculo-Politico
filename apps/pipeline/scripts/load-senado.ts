/**
 * Carga dos senadores em exercício (raw → Postgres).
 * Lê data/raw/senado_federal_raw.json gerado por etl/senado_federal.py.
 * Office por UF (jurisdição = estado). Score inicial GRAY (só cadastro).
 *   npm run db:load-senado
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { calculateIDIP, type LegislativeMetrics } from "@cp/idip";

const prisma = new PrismaClient();

interface RawSenator {
  id_senado: string;
  nome_civil: string;
  nome_urna: string;
  partido_sigla: string;
  uf: string;
  url_foto: string;
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

async function loadSenado() {
  const rawPath = join(process.cwd(), "data", "raw", "senado_federal_raw.json");

  let raw: RawSenator[];
  try {
    raw = JSON.parse(readFileSync(rawPath, "utf-8"));
  } catch {
    console.error(`❌ Arquivo raw não encontrado: ${rawPath}`);
    console.log("   Rode o ETL primeiro: npm run etl:senado");
    process.exit(1);
  }

  console.log(`📥 Carregando ${raw.length} senadores reais...\n`);
  const { metrics, result } = initialScore();

  let loaded = 0;
  for (const sen of raw) {
    if (!sen.id_senado) continue;
    const urna = sen.nome_urna || `(sem nome) ${sen.id_senado}`;
    try {
      const party = await prisma.party.upsert({
        where: { acronym: sen.partido_sigla },
        update: {},
        create: { acronym: sen.partido_sigla, name: sen.partido_sigla },
      });

      const office = await prisma.office.upsert({
        where: { id: `office_senador_${sen.uf}` },
        update: {},
        create: {
          id: `office_senador_${sen.uf}`,
          type: "LEGISLATIVE",
          name: "Senador",
          jurisdiction: sen.uf,
        },
      });

      const person = await prisma.person.upsert({
        where: { externalId: sen.id_senado },
        update: {
          civilName: sen.nome_civil || urna,
          politicalName: urna,
          photoUrl: sen.url_foto || null,
        },
        create: {
          externalId: sen.id_senado,
          civilName: sen.nome_civil || urna,
          politicalName: urna,
          photoUrl: sen.url_foto || null,
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
          endYear: 2031,
        },
      });

      await prisma.score.upsert({
        where: { id: `score_${term.id}_v1` },
        update: {
          finalScore: result.finalScore,
          confidenceScore: result.confidence,
          reliabilityStatus: result.reliability,
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
      console.log(`✅ ${urna.padEnd(28)} | ${sen.partido_sigla}/${sen.uf} | ${result.reliability}`);
    } catch (e) {
      console.error(`❌ Erro ao carregar ${urna}:`, e);
    }
  }

  console.log(`\n🎉 Carga concluída: ${loaded}/${raw.length} senadores.`);
}

loadSenado()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
