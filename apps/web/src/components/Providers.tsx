"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/lib/i18n/cliente";
import type { Locale } from "@/lib/i18n/config";

/**
 * Provedores do cliente.
 *
 * Recebe o idioma resolvido no servidor (`layout.tsx`) e o repassa ao
 * `LocaleProvider`, para que componentes cliente usem o mesmo idioma do HTML
 * servido — sem leitura de cookie no navegador e sem divergência de hidratação.
 */
export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <SessionProvider>
      <LocaleProvider locale={locale}>{children}</LocaleProvider>
    </SessionProvider>
  );
}
