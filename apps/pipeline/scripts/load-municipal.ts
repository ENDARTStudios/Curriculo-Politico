/**
 * Load das menções do Querido Diário → MunicipalExpense.
 * Vincula ao person APENAS quando um nome completo normalizado da base
 * aparece no trecho; caso contrário grava sem vínculo.
 *   npm run db:load-municipal
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { normalizeName } from "@cp/idip";

const prisma = new PrismaClient();

interface Mention {
  municipality: string;
  state: string;
  published_at: string | null;
  gazette_url: string;
  keyword: string;
  excerpt: string;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "municipal_gazettes_raw.json");
  if (!existsSync(rawPath)) {
    console.error(`❌ ${rawPath} ausente. Rode: npm run etl:municipal`);
    process.exit(1);
  }

  const raw: Mention[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`🏛️ Carregando ${raw.length} menções municipais...\n`);

  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: { startsWith: "seed-" } } },
    select: { id: true, politicalName: true },
  });
  const nomes = pessoas
    .map((p) => ({ id: p.id, norm: normalizeName(p.politicalName) }))
    .filter((p) => p.norm.split(" ").length >= 2 && p.norm.length >= 8);

  let loaded = 0;
  let linked = 0;

  for (const m of raw) {
    const trechoNorm = normalizeName(m.excerpt);
    const hit = nomes.find((p) => trechoNorm.includes(p.norm));

    await prisma.municipalExpense.create({
      data: {
        politicianName: hit ? "vinculado" : "—",
        personId: hit?.id ?? null,
        municipality: m.municipality,
        state: m.state,
        keyword: m.keyword,
        publishedAt: m.published_at ? new Date(m.published_at) : null,
        gazetteUrl: m.gazette_url,
        excerpt: `[${m.keyword}] ${m.excerpt}`,
      },
    });
    loaded++;
    if (hit) linked++;
  }

  console.log(`\n✅ ${loaded} menções carregadas (${linked} vinculadas a parlamentares).`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
