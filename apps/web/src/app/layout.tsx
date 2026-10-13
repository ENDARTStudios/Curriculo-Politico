import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SearchBar } from "@/components/SearchBar";
import { CookieBanner } from "@/components/CookieBanner";

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

const NAV_LINKS = [
  { href: "/ranking", label: "Ranking" },
  { href: "/partidos", label: "Partidos" },
  { href: "/projetos", label: "Projetos" },
  { href: "/comparar", label: "Comparar" },
  { href: "/historia", label: "História" },
  { href: "/como-funciona", label: "Como Funciona" },
  { href: "/calendario-eleitoral", label: "Calendário" },
  { href: "/stf", label: "STF" },
  { href: "/faq", label: "FAQ" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/sobre", label: "Sobre" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Providers>
          <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
              {/*
                A marca precisa voltar para a home: é o reflexo nº 1 de
                navegação e a única forma de "voltar ao início" que não depende
                de o usuário saber que existe um item de menu. Era um <span>
                inerte. O aria-label evita que leitores de tela anunciem o
                emoji, e o `-m-2 p-2` amplia o alvo de toque para ≥44px sem
                deslocar o layout.
              */}
              <Link
                href="/"
                aria-label="Currículo Político — página inicial"
                className="-m-2 flex items-center gap-1.5 rounded-lg p-2 text-lg font-bold tracking-tight transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <span aria-hidden="true">📡</span>
                <span>Currículo Político</span>
              </Link>
              <div className="hidden md:block">
                <SearchBar />
              </div>
              <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="transition hover:text-slate-100"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
            <div className="px-6 pb-3 md:hidden">
              <SearchBar />
            </div>
          </header>

          {children}

          <footer className="border-t border-slate-800/80 py-8 text-center text-sm text-slate-400">
            <p>
              Código sob AGPL-3.0 · Documentação sob CC BY 4.0 · Fontes: Câmara
              dos Deputados, Senado Federal e TSE
            </p>
            <p className="mt-1">
              Sem voto popular: notas derivadas exclusivamente de dados públicos
              auditáveis.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-5">
              <a href="/apoie" className="text-sky-400 transition hover:text-sky-300">
                💜 Apoie o projeto
              </a>
              <a href="/sobre" className="transition hover:text-slate-300">
                Sobre
              </a>
              <a href="/contato" className="transition hover:text-slate-300">
                Contato
              </a>
              <a href="/termos-de-uso" className="transition hover:text-slate-300">
                Termos de Uso
              </a>
              <a href="/privacidade" className="transition hover:text-slate-300">
                Privacidade
              </a>
              <a href="/lgpd" className="transition hover:text-slate-300">
                LGPD
              </a>
              <a href="/cookies" className="transition hover:text-slate-300">
                Cookies
              </a>
              <a href="/retificacao" className="transition hover:text-slate-300">
                Retificação
              </a>
              <a href="/conta" className="transition hover:text-slate-300">
                Minha conta
              </a>
            </div>
          </footer>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
