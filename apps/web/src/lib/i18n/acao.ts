"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_IDIOMA, LOCALES, normalizarLocale } from "@/lib/i18n/config";

/**
 * Server Action que grava a escolha de idioma.
 *
 * ── Por que Server Action, e não uma rota de API ───────────────────────────
 * O cookie é escrito no servidor, então a próxima navegação já chega com o idioma
 * certo — sem depender de o cliente reescrever a URL ou recarregar. Uma rota de
 * API exigiria um `fetch` e um `router.refresh()`; a action faz as duas coisas.
 *
 * `revalidatePath("/", "layout")` invalida o cache do layout inteiro: sem isso o
 * servidor continuaria servindo o idioma antigo em páginas em cache.
 */
export async function definirIdioma(formData: FormData) {
  const pedido = String(formData.get("locale") ?? "");
  const locale = LOCALES.includes(normalizarLocale(pedido) as never)
    ? normalizarLocale(pedido)
    : normalizarLocale(pedido);

  const jarro = await cookies();
  jarro.set(COOKIE_IDIOMA, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    // Não é segredo; o cliente precisa poder lê-lo para sincronizar o `<html lang>`.
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
}
