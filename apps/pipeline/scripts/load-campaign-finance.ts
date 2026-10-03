/**
 * Load de financiamento de campanha (raw TSE → Postgres).
 * casa por Person.tseId (SQ_CANDIDATO) — requer resolve-identity antes.
 *   npm run db:load-finance [-- --ano 2022]
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface Receita {
  tse_id: string;
  nome_urna: string;
  cargo: string;
  uf: string;
  total_received: number;
  donor_count: number;
  top_donors: Array<{ nome: string; valor: number }>;
}

async function load() {
  const anoIdx = process.argv.indexOf("--ano");
  const ano = anoIdx > -1 ? Number(process.argv[anoIdx + 1]) || 2022 : 2022;
  const rawPath = join(process.cwd(), "data", "raw", `tse_receitas_${ano}_raw.json`);

  if (!existsSync(rawPath)) {
    console.error(`❌ Arquivo não encontrado: ${rawPath}`);
    console.log(`   Rode o ETL primeiro: python apps/pipeline/etl/tse_receitas.py --ano ${ano}`);
    process.exit(1);
  }

  const raw: Receita[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`📥 Processando ${raw.length} candidatos com receitas de ${ano}...\n`);

  const pessoas = await prisma.person.findMany({
    where: { tseId: { not: null } },
    include: { terms: { orderBy: { startYear: "desc" }, take: 1 } },
  });
  const porTseId = new Map(pessoas.map((p) => [p.tseId!, p]));

  console.log(`📊 ${pessoas.length} parlamentares com tseId\n`);

  let matched = 0;
  for (const receita of raw) {
    const pessoa = porTseId.get(receita.tse_id);
    if (!pessoa) continue;
    const term = pessoa.terms[0];
    if (!term) continue;

    await prisma.campaignFinance.upsert({
      where: { termId_year: { termId: term.id, year: ano } },
      update: {
        totalReceived: receita.total_received,
        donorCount: receita.donor_count,
        topDonors: receita.top_donors,
      },
      create: {
        termId: term.id,
        year: ano,
        totalReceived: receita.total_received,
        donorCount: receita.donor_count,
        topDonors: receita.top_donors,
        totalSpent: 0, // gastos de campanha ainda não integrados
        source: `TSE_${ano}`,
      },
    });

    matched++;
    console.log(
      `✅ ${pessoa.politicalName.padEnd(26)} | R$ ${receita.total_received.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | ${receita.donor_count} doador(es)`,
    );
  }

  console.log(`\n🎉 ${matched}/${pessoas.length} parlamentares com dados de campanha ${ano}.`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
