import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Votação popular em PROJETOS — camada de engajamento pessoal que
 * NUNCA altera o IDIP (Neutralidade Algorítmica, /metodologia).
 *
 * GET  /api/bills/[id]/vote → contagens públicas (a favor/contra)
 * POST /api/bills/[id]/vote → requer autenticação
 *
 * AUTH (Fase 4 do roadmap): o POST já tem o contrato do plano definitivo —
 * basta substituir o guard 501 por:
 *
 *   import { getServerSession } from "next-auth";
 *   import { authOptions } from "@/lib/auth";
 *   const session = await getServerSession(authOptions);
 *   if (!session?.user?.id) return 401;
 *   // anti-bot: conta com menos de 24h não vota
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

  const votes = await prisma.userBillVote.groupBy({
    by: ["vote"],
    where: { billId: bill.id },
    _count: true,
  });

  return NextResponse.json({
    bill: { id: bill.id, externalId: bill.externalId, title: bill.title, type: bill.type },
    favor: votes.find((v) => v.vote === "FAVOR")?._count ?? 0,
    contra: votes.find((v) => v.vote === "CONTRA")?._count ?? 0,
    votingOpen: false, // abre com a autenticação (Fase 4)
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params; // contrato mantido para a Fase 4

  // --- Contrato definitivo (Fase 4 — NextAuth) ---
  // const session = await getServerSession(authOptions);
  // if (!session?.user?.id) return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 });
  // const { vote } = await request.json();
  // if (!["FAVOR", "CONTRA"].includes(vote)) return 400;
  // const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  // const MIN_AGE_MS = 24 * 60 * 60 * 1000; // anti-bot: conta < 24h não vota
  // if (Date.now() - user.createdAt.getTime() < MIN_AGE_MS) return 403;
  // return prisma.userBillVote.upsert({ where: { userId_billId: { userId, billId: params.id } }, update: { vote }, create: {...} });

  void request;
  return NextResponse.json(
    {
      error: "AUTH_PENDENTE",
      message:
        "A votação pessoal abre com a autenticação de usuários (Fase 4 do roadmap). As contagens públicas seguem disponíveis via GET.",
    },
    { status: 501 },
  );
}
