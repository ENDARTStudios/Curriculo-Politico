/**
 * Load das receitas de campanha (bulk TSE prestação de contas) → CampaignFinance.
 * Casamento por Person.tseId = SQ_CANDIDATO do dataset de receitas.
 *   npm run db:load-receitas
 */
import { PrismaClient, CostCategory } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface ReceitaAgg {
  tse_id: string;
  total_receitas: number;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_receitas_2022_agg.json");
  if (!existsSync(rawPath)) {
    console.error(`❌ ${rawPath} ausente. Rode o ETL de receitas primeiro.`);
    process.exit(1);
  }

  const raw: ReceitaAgg[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`💰 Carregando receitas de ${raw.length} candidatos...\n`);

  const pessoas = await prisma.person.findMany({
    where: {
      tseId: { not: null },
      externalId: { not: { startsWith: "seed-" } },
    },
    include: { terms: { orderBy: { startYear: "desc" }, take: 1 } },
  });

  const porTseId = new Map(
    pessoas.filter((p) => p.terms[0]).map((p) => [p.tseId!, p]),
  );

  let loaded = 0;
  let semMatch = 0;
  let totalReceitas = 0;

  for (const r of raw) {
    const pessoa = porTseId.get(r.tse_id);
    if (!pessoa) {
      semMatch++;
      continue;
    }
    const term = pessoa.terms[0];
    if (!term) continue;

    const existing = await prisma.campaignFinance.findFirst({
      where: { termId: term.id, year: 2022 },
    });

    if (existing) {
      await prisma.campaignFinance.update({
        where: { id: existing.id },
        data: { totalReceived: r.total_receitas },
      });
    } else {
      await prisma.campaignFinance.create({
        data: {
          termId: term.id,
          year: 2022,
          totalReceived: r.total_receitas,
          totalSpent: 0,
          donorCount: 0,
          source: "TSE_2022_BULK",
        },
      });
    }

    totalReceitas += r.total_receitas;
    loaded++;
  }

  console.log(
    `\n✅ ${loaded} parlamentares com receitas carregadas (${semMatch} sem match).`,
  );
  console.log(`   Total receitas carregadas: R$ ${(totalReceitas / 1e6).toFixed(1)}M`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
