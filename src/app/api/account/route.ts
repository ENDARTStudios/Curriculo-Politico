import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/account — Exclusão de conta e dados pessoais (Art. 18, VI LGPD).
 * Elimina: UserBillVote (dado sensível), Sessions, Accounts, User (cascade).
 * Dados públicos de agentes políticos (Universo A) NÃO são afetados.
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Faça login para eliminar sua conta." },
      { status: 401 },
    );
  }

  const userId = session.user.id;

  try {
    // Cascade: UserBillVote (dado sensível) é eliminado automaticamente
    // (onDelete: Cascade no schema). Sessions e Accounts também.
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({
      message:
        "Conta e todos os dados pessoais eliminados em conformidade com o Art. 18, VI da LGPD.",
      deletedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "DB_ERROR", message: "Erro ao eliminar conta." },
      { status: 500 },
    );
  }
}
