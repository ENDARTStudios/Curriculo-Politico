/**
 * Detecta e marca votos sigilosos (Penalização por Votos Secretos —
 * /metodologia, função applySecretVotePenalty).
 * A API da Câmara não expõe voto secreto por deputado hoje; o script
 * prepara o flag para quando a fonte existir.
 *   npm run detect-secret-votes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SIGILOSOS = ["Sigiloso", "Secreto", "Não divulgado"];

async function detectSecretVotes() {
  console.log("🔍 Detectando votos secretos...\n");

  const secretVotes = await prisma.legislativeAction.findMany({
    where: { voteDirection: { in: SIGILOSOS } },
    select: { id: true },
  });

  if (secretVotes.length > 0) {
    await prisma.legislativeAction.updateMany({
      where: { id: { in: secretVotes.map((v) => v.id) } },
      data: { isSecretVote: true },
    });
  }

  console.log(`✅ ${secretVotes.length} votos secretos marcados.`);
  if (secretVotes.length === 0) {
    console.log("   (esperado: a API da Câmara não registra voto secreto individual hoje)");
  }
}

detectSecretVotes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
