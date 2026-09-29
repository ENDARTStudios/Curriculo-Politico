/**
 * Load do CEAP real (bulk oficial da Câmara) → PoliticianCost.
 * ideCadastro do bulk = mesmo id exposto pela API v2 (externalId).
 *   npm run db:load-ceap-bulk
 */
import { PrismaClient, CostCategory } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface BulkRecord {
  ideCadastro: string;
  ano: number;
  total: number;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_despesas_bulk_raw.json");
  if (!existsSync(rawPath)) {
    console.error(`❌ ${rawPath} ausente. Rode: npm run etl:ceap-bulk`);
    process.exit(1);
  }

  const raw: BulkRecord[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`💰 Carregando CEAP real: ${raw.length} registros...\n`);

  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: null } },
    include: { terms: { orderBy: { startYear: "desc" } } },
  });
  const termosPorExternal = new Map<string, typeof pessoas[number]["terms"]>();
  for (const p of pessoas) {
    if (p.externalId) termosPorExternal.set(p.externalId, p.terms);
  }

  let loaded = 0;
  let semMatch = 0;
  for (const r of raw) {
    if (r.total <= 0) continue;
    const termos = termosPorExternal.get(r.ideCadastro);
    if (!termos || termos.length === 0) {
      semMatch++;
      continue;
    }
    // Mandato vigente no ano da despesa
    const term =
      termos.find(
        (t) => t.startYear <= r.ano && (!t.endYear || t.endYear >= r.ano),
      ) ?? termos[0];

    await prisma.politicianCost.upsert({
      where: {
        termId_category_year_description: {
          termId: term.id,
          category: CostCategory.CEAP,
          year: r.ano,
          description: "CEAP — Despesas Reais (Bulk Câmara)",
        },
      },
      update: { amount: r.total, source: "CAMARA_BULK" },
      create: {
        termId: term.id,
        category: CostCategory.CEAP,
        year: r.ano,
        amount: r.total,
        description: "CEAP — Despesas Reais (Bulk Câmara)",
        source: "CAMARA_BULK",
        sourceUrl:
          "https://www2.camara.leg.br/transparencia/cota-para-exercicio-da-atividade-parlamentar/",
      },
    });
    loaded++;
  }

  console.log(`\n✅ ${loaded} registros de CEAP real carregados (${semMatch} sem match).`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
