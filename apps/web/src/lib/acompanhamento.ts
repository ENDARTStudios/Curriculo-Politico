import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type TipoAcompanhado = "POLITICIAN" | "PARTY" | "BILL";

/**
 * Estado de acompanhamento para uma página de detalhe.
 *
 * Devolve sempre os dois campos, mesmo sem sessão: a interface precisa saber se
 * mostra o botão ou o convite para entrar, e distinguir "não segue" de "não sei"
 * evitaria um botão piscando de um estado para o outro.
 *
 * A consulta é uma só e filtra pela coluna do tipo — não carrega os
 * acompanhamentos do usuário inteiros para depois filtrar em memória.
 */
export async function estadoAcompanhamento(
  tipo: TipoAcompanhado,
  alvoId: string,
): Promise<{ logado: boolean; seguindo: boolean }> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) return { logado: false, seguindo: false };

  const where =
    tipo === "POLITICIAN"
      ? { userId, personId: alvoId }
      : tipo === "PARTY"
        ? { userId, partyId: alvoId }
        : { userId, billId: alvoId };

  const existe = await prisma.follow.findFirst({ where, select: { id: true } });

  return { logado: true, seguindo: Boolean(existe) };
}

/** Todos os acompanhamentos do usuário, para a dashboard. */
export async function listarAcompanhamentos(userId: string) {
  const follows = await prisma.follow.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      person: { select: { id: true, politicalName: true, photoUrl: true } },
      party: { select: { id: true, acronym: true, name: true, color: true } },
      bill: { select: { id: true, title: true, type: true } },
    },
  });

  return {
    politicos: follows
      .filter((f) => f.person)
      .map((f) => ({ ...f.person!, criadoEm: f.createdAt })),
    partidos: follows
      .filter((f) => f.party)
      .map((f) => ({ ...f.party!, criadoEm: f.createdAt })),
    projetos: follows
      .filter((f) => f.bill)
      .map((f) => ({ ...f.bill!, criadoEm: f.createdAt })),
    total: follows.length,
  };
}
