/**
 * Tabela de referência de subsídios e benefícios por cargo (valores públicos
 * notórios, legislatura 2023–2027). Médias quando o valor varia por UF.
 *   npm run db:seed-benefits
 */
import { PrismaClient, CostCategory } from "@prisma/client";

const prisma = new PrismaClient();

const FIXED_BENEFITS: Array<{
  officeType: string;
  category: CostCategory;
  monthlyValue: number;
  description: string;
}> = [
  { officeType: "PRESIDENTE", category: CostCategory.SALARY, monthlyValue: 46366.19, description: "Subsídio mensal (teto constitucional)" },
  { officeType: "PRESIDENTE", category: CostCategory.HOUSING, monthlyValue: 0, description: "Residência oficial (Palácio do Alvorada)" },
  { officeType: "VICE_PRESIDENTE", category: CostCategory.SALARY, monthlyValue: 46366.19, description: "Subsídio mensal" },
  { officeType: "MINISTRO_ESTADO", category: CostCategory.SALARY, monthlyValue: 46366.19, description: "Subsídio mensal" },
  { officeType: "MINISTRO_ESTADO", category: CostCategory.HOUSING, monthlyValue: 5500.0, description: "Auxílio-moradia ou residência funcional" },
  { officeType: "SENADOR", category: CostCategory.SALARY, monthlyValue: 46366.19, description: "Subsídio mensal" },
  { officeType: "SENADOR", category: CostCategory.CEAPS, monthlyValue: 44270.0, description: "Cota para Exercício da Atividade Parlamentar (média; varia R$ 30k–50k por UF)" },
  { officeType: "SENADOR", category: CostCategory.OFFICE_BUDGET, monthlyValue: 1000000.0 / 12, description: "Verba de Gabinete (média mensal, ~R$ 1M/ano)" },
  { officeType: "SENADOR", category: CostCategory.HOUSING, monthlyValue: 5500.0, description: "Auxílio-moradia (se não utilizar imóvel funcional)" },
  { officeType: "SENADOR", category: CostCategory.HEALTH_PLAN, monthlyValue: 15000.0, description: "Plano de saúde vitalício (média estimada)" },
  { officeType: "SENADOR", category: CostCategory.RELOCATION, monthlyValue: 46366.19 / 48, description: "Ajuda de custo (parcelada em 4 anos)" },
  { officeType: "DEPUTADO_FEDERAL", category: CostCategory.SALARY, monthlyValue: 46366.19, description: "Subsídio mensal" },
  { officeType: "DEPUTADO_FEDERAL", category: CostCategory.CEAP, monthlyValue: 41000.0, description: "Cota para Exercício da Atividade Parlamentar (média; varia R$ 30k–60k)" },
  { officeType: "DEPUTADO_FEDERAL", category: CostCategory.OFFICE_BUDGET, monthlyValue: 165806.07, description: "Verba de Gabinete (até 25 secretários parlamentares)" },
  { officeType: "DEPUTADO_FEDERAL", category: CostCategory.HOUSING, monthlyValue: 4253.0, description: "Auxílio-moradia (se não utilizar imóvel funcional)" },
  { officeType: "DEPUTADO_FEDERAL", category: CostCategory.RELOCATION, monthlyValue: 46366.19 / 24, description: "Ajuda de custo (parcelada em 2 anos)" },
  { officeType: "GOVERNADOR", category: CostCategory.SALARY, monthlyValue: 34000.0, description: "Subsídio mensal (média nacional; varia R$ 21k–46k)" },
  { officeType: "DEPUTADO_ESTADUAL", category: CostCategory.SALARY, monthlyValue: 34774.64, description: "Subsídio mensal (75% do deputado federal)" },
  { officeType: "PREFEITO_CAPITAL", category: CostCategory.SALARY, monthlyValue: 35251.0, description: "Subsídio mensal (teto municipal de capital)" },
  { officeType: "VEREADOR_CAPITAL", category: CostCategory.SALARY, monthlyValue: 26080.0, description: "Subsídio mensal máximo (cidade > 500 mil hab.)" },
];

const EFFECTIVE_FROM = new Date("2023-01-01");

async function seed() {
  console.log(`💰 Populando tabela de benefícios fixos...\n`);

  for (const b of FIXED_BENEFITS) {
    await prisma.fixedBenefit.upsert({
      where: {
        officeType_category_effectiveFrom: {
          officeType: b.officeType,
          category: b.category,
          effectiveFrom: EFFECTIVE_FROM,
        },
      },
      update: { monthlyValue: b.monthlyValue, description: b.description },
      create: {
        officeType: b.officeType,
        category: b.category,
        monthlyValue: b.monthlyValue,
        description: b.description,
        effectiveFrom: EFFECTIVE_FROM,
      },
    });
    console.log(
      `✅ ${b.officeType.padEnd(20)} | ${b.category.padEnd(14)} | R$ ${b.monthlyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    );
  }

  console.log(`\n🎉 ${FIXED_BENEFITS.length} benefícios fixos cadastrados.`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
