import { cookies, headers } from "next/headers";
import {
  COOKIE_IDIOMA,
  LOCALE_PADRAO,
  localeDoAcceptLanguage,
  normalizarLocale,
  type Locale,
} from "./config";

/**
 * Resolve o idioma da requisição **no servidor**.
 *
 * Ordem: cookie de escolha explícita → `Accept-Language` do navegador → padrão.
 *
 * Ler no servidor, e não no cliente, evita o pior defeito de i18n: a página
 * aparecer em português, o JavaScript carregar e trocar tudo para espanhol na
 * frente da pessoa. O custo é que a escolha exige recarregar a rota — o que é
 * aceitável para uma preferência que muda raramente.
 */
export async function obterIdioma(): Promise<Locale> {
  const jarro = await cookies();
  const doCookie = jarro.get(COOKIE_IDIOMA)?.value;
  if (doCookie) return normalizarLocale(doCookie);

  const cabecalhos = await headers();
  return localeDoAcceptLanguage(cabecalhos.get("accept-language"));
}

/** `true` quando a interface está traduzida e o conteúdo longo, não. */
export function interfaceParcial(locale: Locale): boolean {
  return locale !== LOCALE_PADRAO;
}
