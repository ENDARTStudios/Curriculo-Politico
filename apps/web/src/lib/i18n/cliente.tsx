"use client";

import { createContext, useContext, useMemo } from "react";
import { LOCALE_PADRAO, type Locale } from "./config";
import { tradutor, type ChaveDicionario } from "./t";

/**
 * Contexto de idioma para componentes cliente.
 *
 * Recebe o idioma resolvido no servidor pelo `Providers`, então não há leitura de
 * cookie no cliente — e portanto nenhuma divergência entre o HTML servido e a
 * primeira renderização.
 */
const Contexto = createContext<Locale>(LOCALE_PADRAO);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <Contexto.Provider value={locale}>{children}</Contexto.Provider>;
}

/** Idioma atual. */
export function useLocale(): Locale {
  return useContext(Contexto);
}

/**
 * Tradutor do componente.
 *
 *   const t = useT();
 *   <h1>{t("home.titulo1")}</h1>
 */
export function useT() {
  const locale = useLocale();
  return useMemo(
    () =>
      (chave: ChaveDicionario, params?: Record<string, string | number>) =>
        tradutor(locale)(chave, params),
    [locale],
  );
}
