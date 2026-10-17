/**
 * Tagging automático de proposições por tema (keywords do título).
 * Alimenta o Filtro de Afinidade — camada pessoal, nunca altera o IDIP.
 *   npm run tag-bills
 *
 * INCREMENTAL: processa apenas bills com tags IS NULL (nunca analisadas).
 * O matching por keyword é determinístico sobre o título — re-analisar o
 * que já tem tags (mesmo []) não muda nada e custava 31.8k round-trips
 * por execução (~1h no Gap Bot semanal). Para re-rotular tudo após mudar
 * as regras: UPDATE "Bill" SET tags = NULL; e reexecutar.
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

function emChunks<T>(arr: T[], tamanho: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += tamanho) {
    chunks.push(arr.slice(i, i + tamanho));
  }
  return chunks;
}

async function tagBills() {
  console.log("🏷️ Aplicando tags automáticas em projetos (incremental)...\n");

  // Raw SQL: filtro Json IS NULL sem ambiguidade de filtros do Prisma
  const pendentes = await prisma.$queryRaw<{ id: string; title: string }[]>`
    SELECT "id", "title" FROM "Bill" WHERE "tags" IS NULL`;

  let tagged = 0;
  let i = 0;

  // 1 round-trip por chunk (500) — UPDATE ... FROM jsonb_to_recordset
  for (const chunk of emChunks(pendentes, 500)) {
    const payload = JSON.stringify(
      chunk.map((b) => ({ id: b.id, tags: extractTags(b.title) })),
    );
    await prisma.$executeRaw`
      UPDATE "Bill" AS b SET "tags" = v."tags"
      FROM (
        SELECT x->>'id' AS id, (x->'tags') AS tags
        FROM jsonb_array_elements(${payload}::jsonb) AS x
      ) v
      WHERE b."id" = v."id"`;
    tagged += chunk.filter((b) => extractTags(b.title).length > 0).length;
    i += chunk.length;
    if (i % 5000 === 0) console.log(`   ${i}/${pendentes.length} | com tags: ${tagged}`);
  }

  console.log(`\n✅ ${pendentes.length} projetos novos analisados, ${tagged} com tags.`);
}

tagBills()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
