/**
 * Load do patrimônio histórico multi-eleição → PatrimonyHistory.
 *
 * Matching SEGURO:
 * 1. tseId === sq (exato — o SQ da eleição que elegeu o político está na base)
 * 2. fallback: igualdade exata de nome completo normalizado
 *    (substring NÃO vale — homônimos são reais)
 *   npm run db:load-patrimony-history
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { normalizeName } from "../src/lib/identity";

const prisma = new PrismaClient();

interface PatrimonyRecord {
  sq: string;
  nome: string;
  year: number;
  total: number;
  count: number;
}

async function load() {
  const rawPath = join(
    process.cwd(),
    "data",
    "raw",
    "tse_patrimony_history_raw.json",
  );
  if (!existsSync(rawPath)) {
    console.error(`❌ ${rawPath} ausente. Rode: npm run etl:bens-historico`);
    process.exit(1);
  }

  const raw: PatrimonyRecord[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`💎 ${raw.length} registros de patrimônio histórico\n`);

  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: { startsWith: "seed-" } } },
    select: { id: true, tseId: true, politicalName: true, civilName: true },
  });

  const porTseId = new Map(pessoas.filter((p) => p.tseId).map((p) => [p.tseId!, p]));
  const porNomeMap = new Map(
    pessoas.map((p) => [normalizeName(p.politicalName), p] as const),
  );

  let loaded = 0;
  let matched = 0;

  for (const r of raw) {
    if (r.total <= 0) continue;

    // 1. match exato por SQ da eleição
    let person = porTseId.get(r.sq);

    // 2. fallback: nome completo normalizado exato
    if (!person) {
      person = porNomeMap.get(normalizeName(r.nome));
    }
    if (!person) continue;
    matched++;

    await prisma.patrimonyHistory.upsert({
      where: {
        personId_electionYear: {
          personId: person.id,
          electionYear: r.year,
        },
      },
      update: { declaredValue: r.total, assetCount: r.count },
      create: {
        personId: person.id,
        electionYear: r.year,
        declaredValue: r.total,
        assetCount: r.count,
        source: `TSE_${r.year}`,
        sourceUrl: "https://dadosabertos.tse.jus.br/",
      },
    });
    loaded++;
  }

  console.log(`\n✅ ${loaded} registros carregados (${matched} pessoas com match).`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
