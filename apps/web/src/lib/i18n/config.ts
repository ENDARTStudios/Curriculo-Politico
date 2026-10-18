/**
 * Configuração de idiomas.
 *
 * ── Os três idiomas, e o que cada um significa aqui ────────────────────────
 * O site é sobre política brasileira, então `pt-BR` é o idioma de origem e a
 * fonte das traduções. `es-US` (espanhol dos Estados Unidos) e `es-ES` (espanhol
 * da Espanha) existem para dois públicos distintos: a comunidade brasileira e
 * latina nos EUA, e leitores na Espanha que acompanham política internacional.
 *
 * Eles compartilham a maior parte do vocabulário, mas **não são o mesmo idioma**
 * na prática: `computadora` vs `ordenador`, `carro` vs `coche`. Por isso são
 * dicionários separados, e não um `es` com substituições pontuais.
 *
 * ── Por que sem rota `/[locale]` ───────────────────────────────────────────
 * O caminho convencional (segmento de locale na URL) exigiria mover as 28 rotas
 * para dentro de `[locale]`, reescrever o sitemap, criar redirecionamentos e
 * refazer os testes de SEO. É a escolha certa para um site multilíngue de
 * conteúdo; aqui o conteúdo é dado político brasileiro e o idioma muda a
 * **interface**, não o dado.
 *
 * A escolha fica num cookie, lida no servidor — sem flash de idioma errado, sem
 * mudar nenhuma URL existente.
 */

export const LOCALES = ["pt-BR", "es-US", "es-ES"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_PADRAO: Locale = "pt-BR";

/** Cookie que guarda a escolha. `SameSite=Lax` e um ano de validade. */
export const COOKIE_IDIOMA = "cp_idioma";

/** Rótulo de cada idioma, escrito **no próprio idioma**. */
export const ROTULO_IDIOMA: Record<Locale, string> = {
  "pt-BR": "Português",
  "es-US": "Español (EE. UU.)",
  "es-ES": "Español (España)",
};

/** Código BCP-47 para `<html lang>` e para `Intl`. */
export const TAG_HTML: Record<Locale, string> = {
  "pt-BR": "pt-BR",
  "es-US": "es-US",
  "es-ES": "es-ES",
};

/**
 * Normaliza um valor arbitrário para um `Locale` válido.
 *
 * Aceita as formas que chegam de cookie, de `Accept-Language` e de formulário:
 * `es`, `es-MX`, `es-419`, `pt`, `pt-PT`, `es-US`, `es-us`. Qualquer coisa
 * desconhecida cai no padrão em vez de quebrar a página.
 */
export function normalizarLocale(valor: string | undefined | null): Locale {
  if (!valor) return LOCALE_PADRAO;
  const v = valor.trim().toLowerCase();

  for (const locale of LOCALES) {
    if (locale.toLowerCase() === v) return locale;
  }

  if (v.startsWith("pt")) return "pt-BR";
  // `es-US` é o público latino nos EUA; qualquer outro espanhol cai em es-ES,
  // que é a variante com mais material de referência.
  if (v === "es-us" || v === "es_us") return "es-US";
  if (v.startsWith("es")) return "es-ES";

  return LOCALE_PADRAO;
}

/**
 * Escolhe o idioma a partir do header `Accept-Language`.
 *
 * Usado só quando não há cookie — a primeira visita. Respeita a ordem de
 * preferência declarada pelo navegador em vez de pegar o primeiro item.
 */
export function localeDoAcceptLanguage(header: string | null): Locale {
  if (!header) return LOCALE_PADRAO;

  const preferencias = header
    .split(",")
    .map((parte) => {
      const [tag, q] = parte.trim().split(";q=");
      return { tag: tag.trim(), peso: q ? Number.parseFloat(q) : 1 };
    })
    .filter((p) => p.tag && !Number.isNaN(p.peso))
    .sort((a, b) => b.peso - a.peso);

  for (const { tag } of preferencias) {
    const normalizado = normalizarLocale(tag);
    // `normalizarLocale` devolve o padrão para desconhecidos; só aceitamos se a
    // tag realmente casar com algum idioma suportado.
    const suportado = /^(pt|es)(-|$)/i.test(tag);
    if (suportado) return normalizado;
  }

  return LOCALE_PADRAO;
}
