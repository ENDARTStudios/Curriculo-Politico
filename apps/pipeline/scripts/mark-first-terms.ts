/**
 * Marca primeiros mandatos (Modificadores de Carreira — /metodologia).
 * Heurística v1: 1 termo na base + sem tseId de eleição anterior = estreante.
 *   npm run mark-first-terms
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function markFirstTerms() {
  console.log("🔍 Marcando primeiros mandatos...\n");

  const people = await prisma.person.findMany({
    where: { externalId: { not: { startsWith: "seed-" } } },
    include: { terms: true },
  });

  let estreantes = 0;
  let veteranos = 0;

  for (const person of people) {
    if (person.terms.length !== 1) {
      veteranos += person.terms.length > 1 ? person.terms.length : 0;
      continue;
    }
    const term = person.terms[0];
    // tseId de eleição anterior (2018) indica que não é estreante
    const temHistorico = person.tseId !== null;

    await prisma.term.update({
      where: { id: term.id },
      data: {
        isFirstTerm: !temHistorico,
        previousTerms: temHistorico ? 1 : 0,
      },
    });

    if (!temHistorico) estreantes++;
  }

  console.log(`✅ ${estreantes} estreantes marcados (base: ${veteranos} mandatos com histórico).`);
}

markFirstTerms()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
