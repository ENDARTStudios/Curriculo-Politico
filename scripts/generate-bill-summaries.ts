/**
 * Gera resumos em linguagem simples para proposições taggeadas.
 * TRANSPARÊNCIA: os resumos são por CATEGORIA TEMÁTICA (template da tag),
 * não análise do conteúdo individual de cada lei — o rótulo na UI deixa
 * isso explícito. Quando houver LLM no pipeline, substitui este gerador.
 *   npm run generate-summaries
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEMPLATES: Record<string, { summary: string; impact: string }> = {
  saude: {
    summary:
      "Este projeto trata de questões relacionadas à saúde pública, incluindo acesso a medicamentos, hospitais e programas de prevenção.",
    impact:
      "Pode afetar seu acesso ao SUS, disponibilidade de medicamentos gratuitos e qualidade do atendimento em postos de saúde.",
  },
  educacao: {
    summary:
      "Este projeto aborda temas de educação, incluindo escolas, universidades, professores e programas educacionais.",
    impact:
      "Pode impactar a qualidade das escolas públicas, acesso a universidades e valorização dos professores.",
  },
  seguranca: {
    summary:
      "Este projeto trata de segurança pública, incluindo policiamento, combate ao crime e sistema penitenciário.",
    impact:
      "Pode afetar a segurança no seu bairro, atuação da polícia e políticas de combate à violência.",
  },
  economia: {
    summary:
      "Este projeto aborda questões econômicas, incluindo impostos, gastos públicos e política fiscal.",
    impact:
      "Pode impactar o valor dos impostos que você paga, preços de produtos e estabilidade econômica do país.",
  },
  meio_ambiente: {
    summary:
      "Este projeto trata de questões ambientais, incluindo proteção de florestas, mudanças climáticas e energia renovável.",
    impact:
      "Pode afetar a qualidade do ar e da água, preservação de áreas naturais e combate às mudanças climáticas.",
  },
  direitos_sociais: {
    summary:
      "Este projeto aborda direitos trabalhistas, previdência e assistência social.",
    impact:
      "Pode impactar seus direitos no trabalho, aposentadoria e acesso a programas sociais.",
  },
  infraestrutura: {
    summary:
      "Este projeto trata de infraestrutura, incluindo transporte, rodovias, ferrovias, saneamento e energia.",
    impact:
      "Pode afetar a qualidade das estradas, o transporte público da sua cidade e o acesso a serviços básicos.",
  },
  administrativo: {
    summary:
      "Este projeto trata da administração pública, incluindo servidores, concursos, licitações e regras de transparência.",
    impact:
      "Pode afetar o funcionamento dos serviços públicos, concursos na sua área e a transparência do governo.",
  },
};

async function generate() {
  console.log("📝 Gerando resumos por categoria temática...\n");

  let generated = 0;
  let semTemplate = 0;
  let total = 0;

  // Loop em lotes de 500 até esgotar bills com tags e sem resumo
  for (;;) {
    const bills = await prisma.bill.findMany({
      where: { simpleSummary: null, tags: { not: undefined } },
      select: { id: true, title: true, type: true, date: true, tags: true },
      take: 500,
      skip: 0, // os atualizados saem do filtro naturalmente
    });
    if (bills.length === 0) break;

    for (const bill of bills) {
      total++;
      const tags = (bill.tags as string[] | null) ?? [];
      const templateKey = tags.find((t) => t in TEMPLATES);
      if (!templateKey) {
        semTemplate++;
        // marca com string vazia para sair do filtro sem ficar eternamente re-scaneado
        await prisma.bill.update({
          where: { id: bill.id },
          data: { simpleSummary: "" },
        });
        continue;
      }

      const tpl = TEMPLATES[templateKey];
      const keyPoints = [
        bill.title.length > 100 ? bill.title.slice(0, 100) + "…" : bill.title,
        `Tipo: ${bill.type ?? "Projeto de Lei"}`,
        bill.date ? `Apresentado em ${new Date(bill.date).toLocaleDateString("pt-BR")}` : "Data não informada",
      ];

      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          simpleSummary: tpl.summary,
          citizenImpact: tpl.impact,
          keyPoints,
        },
      });
      generated++;
    }
    console.log(`   lote: ${total} processados | ${generated} resumos gerados`);
    if (bills.length < 500) break;
  }
  console.log(`\n✅ ${generated} resumos gerados (${semTemplate} sem template, marcados).`);
}

generate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
