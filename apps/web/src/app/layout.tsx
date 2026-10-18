import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { obterIdioma } from "@/lib/i18n/servidor";
import { TAG_HTML } from "@/lib/i18n/config";

/**
 * URL canônica do site em produção.
 *
 * `metadataBase` é o que permite ao Next resolver URLs relativas em
 * `alternates.canonical`, `openGraph.url` e imagens — sem ele, o Next emite
 * caminhos relativos e o crawler não consegue montar a URL absoluta. Estava
 * ausente, então nenhuma página tinha canonical.
 *
 * Lê de `NEXT_PUBLIC_SITE_URL` para que previews da Vercel e
 * `localhost` não declarem canonical apontando para produção (o que faria o
 * buscador canonicalizar o preview como se fosse o site real).
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.curriculopolitico.org";

const DESCRICAO =
  "Plataforma open-source que avalia e ranqueia políticos brasileiros com o IDIP, usando apenas dados públicos auditáveis da Câmara, do Senado e do TSE.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Páginas filhas definem só o título curto; o sufixo é aplicado aqui.
    default: "Currículo Político — Transparência Política com Dados Públicos",
    template: "%s · Currículo Político",
  },
  description: DESCRICAO,
  applicationName: "Currículo Político",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Currículo Político",
    url: "/",
    title: "Currículo Político — Transparência Política com Dados Públicos",
    description: DESCRICAO,
  },
  twitter: {
    card: "summary_large_image",
    title: "Currículo Político",
    description: DESCRICAO,
  },
  // A plataforma serve auditoria pública: indexar tudo é o objetivo.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "politics",
};


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
    O idioma é resolvido no servidor (cookie → Accept-Language → padrão) e
    repassado ao `Providers`. Ler no cliente faria a página nascer em português e
    trocar de idioma na frente da pessoa.
  */
  const locale = await obterIdioma();

  return (
    <html lang={TAG_HTML[locale]}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Providers locale={locale}>
          <SiteHeader />
          {children}
          <SiteFooter />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
