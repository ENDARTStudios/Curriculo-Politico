/**
 * Load do patrimônio declarado ao TSE → PoliticianCost (PATRIMONY).
 * Patrimônio NÃO entra no custo anual — é exibido como contexto.
 *   npm run db:load-patrimony
 */
import { PrismaClient, CostCategory } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface BemRaw {
  tse_id: string;
  total_declarado: number;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "tse_bens_2022_raw.json");
  if (!existsSync(rawPath)) {
    console.error(`❌ ${rawPath} ausente. Rode primeiro: npm run etl:bens`);
    process.exit(1);
  }

  const raw: BemRaw[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`💎 ${raw.length} candidatos com patrimônio declarado\n`);

  const pessoas = await prisma.person.findMany({
    where: { tseId: { not: null }, externalId: { not: { startsWith: "seed-" } } },
    include: { terms: { orderBy: { startYear: "desc" }, take: 1 } },
  });
  const porTseId = new Map(pessoas.filter((p) => p.terms[0]).map((p) => [p.tseId!, p]));

  let loaded = 0;
  for (const bem of raw) {
    const pessoa = porTseId.get(bem.tse_id);
    if (!pessoa) continue;
    const term = pessoa.terms[0];

    await prisma.politicianCost.upsert({
      where: {
        termId_category_year_description: {
          termId: term.id,
          category: CostCategory.PATRIMONY,
          year: 2022,
          description: "Patrimônio total declarado ao TSE",
        },
      },
      update: { amount: bem.total_declarado },
      create: {
        termId: term.id,
        category: CostCategory.PATRIMONY,
        year: 2022,
        amount: bem.total_declarado,
        description: "Patrimônio total declarado ao TSE",
        source: "TSE",
        sourceUrl: "https://divulgacandcontas.tse.jus.br/",
      },
    });
    loaded++;
  }

  console.log(`✅ ${loaded} políticos com patrimônio carregado (contexto — não é custo anual).`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
