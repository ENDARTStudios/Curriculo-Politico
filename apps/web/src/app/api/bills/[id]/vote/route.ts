import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consentimentoPoliticoAtivo } from "@/lib/consent";

export const dynamic = "force-dynamic";

/**
 * Votação popular em PROJETOS — camada de engajamento pessoal que
 * NUNCA altera o IDIP (Neutralidade Algorítmica, /metodologia).
 *
 * GET  /api/bills/[id]/vote → contagens públicas (a favor/contra) +,
 *      autenticado, o estado do próprio voto e do consentimento.
 * POST /api/bills/[id]/vote → requer login + CONSENTIMENTO ESPECÍFICO
 *      p/ dado sensível (opinião política, Art. 11 LGPD — 403
 *      CONSENT_REQUIRED se ausente); conta com menos de 24h não vota
 *      (proteção anti-bot). Voto único por usuário por projeto, alterável.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const bill = await prisma.bill.findFirst({
    where: { OR: [{ id }, { externalId: id }] },
    select: { id: true, externalId: true, title: true, type: true },
  });
  if (!bill) {
    return NextResponse.json({ error: "PROJETO_NAO_ENCONTRADO" }, { status: 404 });
  }

  const [votes, session] = await Promise.all([
    prisma.userBillVote.groupBy({
      by: ["vote"],
      where: { billId: bill.id },
      _count: true,
    }),
    getServerSession(authOptions),
  ]);

  let me: { vote: string; consented: boolean } | null = null;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        politicalConsentAt: true,
        politicalConsentWithdrawnAt: true,
        billVotes: { where: { billId: bill.id }, select: { vote: true } },
      },
    });
    if (user) {
      const meuVoto = user.billVotes[0]?.vote;
      me = meuVoto
        ? { vote: meuVoto, consented: consentimentoPoliticoAtivo(user) }
        : null;
    }
  }

  return NextResponse.json({
    bill: { id: bill.id, externalId: bill.externalId, title: bill.title, type: bill.type },
    favor: votes.find((v) => v.vote === "FAVOR")?._count ?? 0,
    contra: votes.find((v) => v.vote === "CONTRA")?._count ?? 0,
    votingOpen: true,
    me,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: billLookupId } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return NextResponse.json(
      {
        error: "AUTH_REQUIRED",
        message: "Faça login para votar (contas são gratuitas).",
      },
      { status: 401 },
    );
  }

  let body: { vote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const vote = body.vote;
  if (vote !== "FAVOR" && vote !== "CONTRA") {
    return NextResponse.json({ error: "INVALID_VOTE" }, { status: 400 });
  }

  const bill = await prisma.bill.findFirst({
    where: { OR: [{ id: billLookupId }, { externalId: billLookupId }] },
    select: { id: true },
  });
  if (!bill) {
    return NextResponse.json({ error: "PROJETO_NAO_ENCONTRADO" }, { status: 404 });
  }

  // Proteção anti-bot: conta precisa ter 24h para votar
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      politicalConsentAt: true,
      politicalConsentWithdrawnAt: true,
    },
  });
  const accountAge = Date.now() - (user?.createdAt.getTime() ?? 0);
  const MIN_AGE_MS = 24 * 60 * 60 * 1000;
  if (accountAge < MIN_AGE_MS) {
    return NextResponse.json(
      {
        error: "ACCOUNT_TOO_NEW",
        message: "Contas com menos de 24 horas ainda não podem votar.",
      },
      { status: 403 },
    );
  }

  // Gate LGPD (Art. 11): sem consentimento ESPECÍFICO ativo p/ dado
  // sensível (opinião política), a manifestação não é registrada.
  if (!user || !consentimentoPoliticoAtivo(user)) {
    return NextResponse.json(
      {
        error: "CONSENT_REQUIRED",
        message:
          "Votar requer consentimento específico para tratamento de opinião política (dado sensível). Autorize no painel de votação — é revogável a qualquer momento.",
      },
      { status: 403 },
    );
  }

  const userVote = await prisma.userBillVote.upsert({
    where: { userId_billId: { userId, billId: bill.id } },
    update: { vote },
    create: { userId, billId: bill.id, vote },
  });

  return NextResponse.json(userVote);
}
