import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SearchBar } from "@/components/SearchBar";

export const metadata: Metadata = {
  title: "Currículo Político — Transparência Política com Dados Públicos",
  description:
    "Plataforma open-source que avalia e ranqueia políticos brasileiros com o IDIP, usando apenas dados públicos auditáveis da Câmara, do Senado e do TSE.",
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
              <span className="text-lg font-bold tracking-tight">
                📡 Currículo Político
              </span>
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

          <footer className="border-t border-slate-800/80 py-8 text-center text-sm text-slate-500">
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
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
