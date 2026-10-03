import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POLITICAL_CONSENT_VERSION } from "@/lib/consent";

export const dynamic = "force-dynamic";

/**
 * Consentimento ESPECÍFICO para tratamento de dado sensível — opinião
 * política (LGPD Art. 11 + Art. 8º), necessário para votar em projetos.
 *
 * POST   /api/consent → registra consentimento (versão + timestamp)
 * DELETE /api/consent → revoga e ELIMINA todos os votos do usuário
 *   (a revogação apaga a manifestação vinculada à conta, Art. 18, VI).
 *
 * Sem consentimento ativo, a API de voto responde 403 CONSENT_REQUIRED.
 */
async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function POST() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      politicalConsentVersion: POLITICAL_CONSENT_VERSION,
      politicalConsentAt: new Date(),
      politicalConsentWithdrawnAt: null,
    },
    select: { politicalConsentAt: true, politicalConsentVersion: true },
  });

  return NextResponse.json({ consented: true, ...user });
}

export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  // Revogação: registra o timestamp e elimina a manifestação sensível
  const [, user] = await prisma.$transaction([
    prisma.userBillVote.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { politicalConsentWithdrawnAt: new Date() },
      select: { politicalConsentWithdrawnAt: true },
    }),
  ]);

  return NextResponse.json({ consented: false, ...user });
}
