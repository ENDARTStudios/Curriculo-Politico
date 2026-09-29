/**
 * Load do CEAP coletado da Câmara → PoliticianCost (CEAP).
 *   npm run db:load-ceap
 */
import { PrismaClient, CostCategory } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface CeapRaw {
  deputado_id: string;
  ano: number;
  total_ceap: number;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_ceap_raw.json");
  if (!existsSync(rawPath)) {
    console.error(`❌ ${rawPath} ausente. Rode primeiro: npm run etl:ceap`);
    process.exit(1);
  }

  const raw: CeapRaw[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`💰 Carregando CEAP de ${raw.length} deputados...\n`);

  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: null } },
    include: { terms: { orderBy: { startYear: "desc" }, take: 1 } },
  });
  const termPorExternal = new Map(
    pessoas.filter((p) => p.terms[0]).map((p) => [p.externalId!, p.terms[0]]),
  );

  let loaded = 0;
  for (const r of raw) {
    const term = termPorExternal.get(r.deputado_id);
    if (!term) continue;

    await prisma.politicianCost.upsert({
      where: {
        termId_category_year_description: {
          termId: term.id,
          category: CostCategory.CEAP,
          year: r.ano,
          description: "CEAP — Cota para o Exercício da Atividade Parlamentar",
        },
      },
      update: { amount: r.total_ceap },
      create: {
        termId: term.id,
        category: CostCategory.CEAP,
        year: r.ano,
        amount: r.total_ceap,
        description: "CEAP — Cota para o Exercício da Atividade Parlamentar",
        source: "CAMARA",
        sourceUrl: "https://www.camara.leg.br/cota-parlamentar/",
      },
    });
    loaded++;
  }

  console.log(`✅ ${loaded} registros de CEAP carregados.`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
