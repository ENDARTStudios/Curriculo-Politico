import { DICIONARIO_ORIGEM, DICIONARIOS, type ChaveDicionario } from "./dicionarios";
import type { Locale } from "./config";

/**
 * Tradução com interpolação de parâmetros.
 *
 * `t("es-ES", "home.avaliados", { n: "594" })` devolve `594 evaluados`.
 *
 * ── Fallback em três níveis ────────────────────────────────────────────────
 * 1. a chave no idioma pedido;
 * 2. a chave em `pt-BR` — melhor mostrar português que a chave crua;
 * 3. a própria chave, que é feia mas identificável num relatório de bug.
 *
 * Nunca devolvemos `undefined`: uma tela com `undefined` no meio do texto é pior
 * que uma tela com `home.hero.titulo` e um relato preciso.
 */
export function t(
  locale: Locale,
  chave: ChaveDicionario,
  params?: Record<string, string | number>,
): string {
  const texto =
    DICIONARIOS[locale]?.[chave] ?? DICIONARIO_ORIGEM[chave] ?? String(chave);

  if (!params) return texto;

  return texto.replace(/\{(\w+)\}/g, (original, nome: string) => {
    const valor = params[nome];
    return valor === undefined ? original : String(valor);
  });
}

/** Atalho que amarra o idioma: `const tr = tradutor(locale)`. */
export function tradutor(locale: Locale) {
  return (chave: ChaveDicionario, params?: Record<string, string | number>) =>
    t(locale, chave, params);
}

export type { ChaveDicionario };
