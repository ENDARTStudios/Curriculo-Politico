"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marcarNovidadesVistas } from "@/lib/novidades";

/**
 * Server Action do botão "marcar como visto".
 *
 * A sessão é lida **aqui**, não recebida por parâmetro: uma action é um endpoint
 * público, e aceitar um `userId` do cliente permitiria marcar a leitura de outra
 * pessoa.
 */
export async function marcarComoVisto() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return { erro: "AUTH_REQUIRED" as const };
  }

  await marcarNovidadesVistas(userId);
  revalidatePath("/conta");
  return { ok: true as const };
}
