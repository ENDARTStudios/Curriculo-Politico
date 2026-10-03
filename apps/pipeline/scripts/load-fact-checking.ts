/**
 * Load das checagens de agências independentes → VerifiedClaim.
 * Checagens NUNCA alteram o IDIP — são contexto, com atribuição e link.
 *
 * Vínculo com parlamentar: por NOME COMPLETO normalizado (ex:
 * "Flávio Bolsonaro" no texto). Menções de sobrenome só ("Lula",
 * "Moraes") NÃO vinculam — alto risco de homônimo.
 *   npm run db:load-fact-checking
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { normalizeName } from "@cp/idip";

const prisma = new PrismaClient();

interface Claim {
  title: string;
  link: string;
  pub_date: string | null;
  description: string | null;
  verdict: string;
  source: string;
  politicians: string[];
}

async function load() {
  const raw: Claim[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "raw", "fact_checking_raw.json"), "utf-8"),
  );
  console.log(`📥 Processando ${raw.length} checagens...\n`);

  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: { startsWith: "seed-" } } },
    select: { id: true, politicalName: true },
  });
  const pessoasNormalizadas = pessoas
    .map((p) => ({ id: p.id, norm: normalizeName(p.politicalName) }))
    .filter((p) => {
      const tokens = p.norm.split(" ");
      // Nomes com ≥2 tokens e razoavelmente únicos (reduz homônimos)
      return tokens.length >= 2 && p.norm.length >= 8;
    });

  let loaded = 0;
  let matched = 0;
  let semVeredito = 0;

  for (const claim of raw) {
    if (claim.verdict === "N/A" || !claim.link) {
      semVeredito++;
      continue;
    }

    const existing = await prisma.verifiedClaim.findFirst({
      where: { sourceUrl: claim.link },
      select: { id: true },
    });
    if (existing) continue;

    // Vínculo por nome completo normalizado no texto da checagem
    const textoNorm = normalizeName(`${claim.title} ${claim.description ?? ""}`);
    const personId =
      pessoasNormalizadas.find((p) => textoNorm.includes(p.norm))?.id ?? null;
    if (personId) matched++;

    await prisma.verifiedClaim.create({
      data: {
        personId,
        claimText: claim.title,
        verdict: claim.verdict,
        source: claim.source,
        sourceUrl: claim.link,
        publishedAt: claim.pub_date ? new Date(claim.pub_date) : null,
        topic: claim.politicians.join(", ") || null,
      },
    });
    loaded++;
  }

  console.log(`\n✅ ${loaded} checagens carregadas (${semVeredito} sem veredito ignoradas).`);
  console.log(`🔗 ${matched} vinculadas a parlamentares por nome completo.`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
