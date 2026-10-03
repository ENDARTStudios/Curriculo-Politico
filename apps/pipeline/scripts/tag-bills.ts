/**
 * Tagging automático de proposições por tema (keywords do título).
 * Alimenta o Filtro de Afinidade — camada pessoal, nunca altera o IDIP.
 *   npm run tag-bills
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mapeamento de keywords → tags (temas legislativos reais)
const TAG_KEYWORDS: Record<string, string[]> = {
  saude: ["saúde", "hospital", "sus", "medicamento", "vacina", "pandemia", "epidemia", "médico"],
  educacao: ["educação", "escola", "universidade", "professor", "alfabetização", "ensino"],
  seguranca: ["segurança", "polícia", "crime", "penal", "armas", "violência", "trafico"],
  economia: ["economia", "tributário", "imposto", "fiscal", "orçamento", "dívida", "inflação"],
  privatizacao: ["privatização", "concessão", "desestatização", "estatização", "empresa pública"],
  meio_ambiente: ["meio ambiente", "ambiental", "clima", "desmatamento", "amazônia", "energia renovável"],
  direitos_sociais: ["trabalho", "salário", "aposentadoria", "previdência", "benefício", "assistência"],
  costumes: ["família", "religião", "cultura", "identidade", "gênero", "casamento"],
  administrativo: ["administração", "servidor", "concurso", "licitação", "transparência"],
  infraestrutura: ["infraestrutura", "transporte", "rodovia", "ferrovia", "saneamento", "energia"],
};

function extractTags(title: string): string[] {
  const normalized = title.toLowerCase();
  const tags: string[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) tags.push(tag);
  }
  return tags;
}

async function tagBills() {
  console.log("🏷️ Aplicando tags automáticas em projetos...\n");

  const bills = await prisma.bill.findMany({ select: { id: true, title: true } });
  let tagged = 0;
  let i = 0;

  for (const bill of bills) {
    const tags = extractTags(bill.title);
    await prisma.bill.update({
      where: { id: bill.id },
      data: { tags },
    });
    if (tags.length > 0) tagged++;
    i++;
    if (i % 5000 === 0) console.log(`   ${i}/${bills.length} | com tags: ${tagged}`);
  }

  console.log(`\n✅ ${bills.length} projetos analisados, ${tagged} com tags.`);
}

tagBills()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
