/**
 * Load do patrimônio (bem_candidato TSE) → PatrimonyHistory + PoliticianCost.
 * Casamento por tseId (SQ_CANDIDATO da eleição) — mesmo formato das duas fontes.
 *   npm run db:load-patrimony
 */
import { PrismaClient, CostCategory } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface BemRaw {
  tse_id: string;
  total_declarado: number;
}

async function load() {
  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: { startsWith: "seed-" } } },
    select: { id: true, tseId: true, politicalName: true },
  });

  const comTse = pessoas.filter((p) => p.tseId);
  console.log(`📊 ${pessoas.length} pessoas | ${comTse.length} com tseId\n`);

  let totalLoaded = 0;
  let totalPessoas = 0;

  for (const ano of [2022, 2018]) {
    const rawPath = join(process.cwd(), "data", "raw", `tse_bens_${ano}_raw.json`);
    let bens: BemRaw[];
    try {
      bens = JSON.parse(readFileSync(rawPath, "utf-8"));
    } catch {
      console.log(`⚠️ ${rawPath} ausente`);
      continue;
    }

    const porSq = new Map(bens.map((b) => [b.tse_id, b]));
    let matched = 0;

    for (const p of comTse) {
      const bem = porSq.get(p.tseId!);
      if (!bem) continue;
      matched++;

      // PatrimonyHistory (gráfico temporal)
      await prisma.patrimonyHistory.upsert({
        where: { personId_electionYear: { personId: p.id, electionYear: ano } },
        update: { declaredValue: bem.total_declarado, assetCount: 1 },
        create: {
          personId: p.id,
          electionYear: ano,
          declaredValue: bem.total_declarado,
          assetCount: 1,
          source: `TSE_${ano}`,
          sourceUrl: "https://dadosabertos.tse.jus.br/",
        },
      });

      // PoliticianCost (PATRIMONY — contexto, não é custo anual)
      if (ano === 2022) {
        await prisma.politicianCost.upsert({
          where: {
            termId_category_year_description: {
              termId: term_id_from(p),
              category: CostCategory.PATRIMONY,
              year: ano,
              description: "Patrimônio total declarado ao TSE",
            },
          },
          update: { amount: bem.total_declarado },
          create: {
            termId: term_id_from(p),
            category: CostCategory.PATRIMONY,
            year: ano,
            amount: bem.total_declarado,
            description: "Patrimônio total declarado ao TSE",
            source: "TSE",
            sourceUrl: "https://divulgacandcontas.tse.jus.br/",
          },
        });
      }
    }

    console.log(`   ${ano}: ${matched} pessoas com patrimônio`);
    totalLoaded += matched * (ano === 2022 ? 2 : 1);
    totalPessoas += matched;
  }

  function term_id_from(p: { id: string }): string {
    return p.id; // precisa do termId real, buscar abaixo
  }

  // Precisa do termId real — vamos buscar
  console.log(
    `\n✅ ${totalLoaded} registros de patrimônio carregados para ${totalPessoas} pessoas.`,
  );
}

// Versão simplificada que usa tseId para achar o term corretamente
async function loadWithTerms() {
  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: { startsWith: "seed-" } }, tseId: { not: null } },
    include: { terms: { orderBy: { startYear: "desc" }, take: 1 } },
  });

  const comTerm = pessoas.filter((p) => p.terms[0]);
  console.log(`📊 ${comTerm.length} pessoas com tseId + term\n`);

  let histLoaded = 0;
  let costLoaded = 0;

  for (const ano of [2022, 2018]) {
    const rawPath = join(process.cwd(), "data", "raw", `tse_bens_${ano}_raw.json`);
    let bens: BemRaw[];
    try {
      bens = JSON.parse(readFileSync(rawPath, "utf-8"));
    } catch {
      continue;
    }
    const porSq = new Map(bens.map((b) => [b.tse_id, b]));

    for (const p of comTerm) {
      const bem = porSq.get(p.tseId!);
      if (!bem) continue;
      const term = p.terms[0];

      await prisma.patrimonyHistory.upsert({
        where: { personId_electionYear: { personId: p.id, electionYear: ano } },
        update: { declaredValue: bem.total_declarado, assetCount: 1 },
        create: {
          personId: p.id,
          electionYear: ano,
          declaredValue: bem.total_declarado,
          assetCount: 1,
          source: `TSE_${ano}`,
          sourceUrl: "https://dadosabertos.tse.jus.br/",
        },
      });
      histLoaded++;

      if (ano === 2022) {
        const exists = await prisma.politicianCost.findFirst({
          where: {
            termId: term.id,
            category: CostCategory.PATRIMONY,
            year: 2022,
          },
        });
        if (!exists) {
          await prisma.politicianCost.create({
            data: {
              termId: term.id,
              category: CostCategory.PATRIMONY,
              year: 2022,
              amount: bem.total_declarado,
              description: "Patrimônio total declarado ao TSE",
              source: "TSE",
              sourceUrl: "https://divulgacandcontas.tse.jus.br/",
            },
          });
        } else {
          await prisma.politicianCost.update({
            where: { id: exists.id },
            data: { amount: bem.total_declarado },
          });
        }
        costLoaded++;
      }
    }
  }

  console.log(`\n✅ PatrimonyHistory: ${histLoaded} | PoliticianCost (PATRIMONY): ${costLoaded}`);
}

loadWithTerms()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
