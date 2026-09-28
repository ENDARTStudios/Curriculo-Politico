import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Cívico — Transparência Política com Dados Públicos",
  description:
    "Plataforma open-source que avalia e ranqueia políticos brasileiros com o IDIP, usando apenas dados públicos auditáveis da Câmara, do Senado e do TSE.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <header className="border-b border-slate-800/80">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            <span className="text-lg font-bold tracking-tight">📡 Radar Cívico</span>
            <nav className="flex gap-6 text-sm text-slate-400">
              <a href="/ranking" className="transition hover:text-slate-100">
                Ranking
              </a>
              <a href="#termometro" className="transition hover:text-slate-100">
                Termômetro
              </a>
              <a href="#metodologia" className="transition hover:text-slate-100">
                Metodologia
              </a>
              <a href="#api" className="transition hover:text-slate-100">
                API
              </a>
            </nav>
          </div>
        </header>

        {children}

        <footer className="border-t border-slate-800/80 py-8 text-center text-sm text-slate-500">
          <p>
            Código sob AGPL-3.0 · Documentação sob CC BY 4.0 · Fontes: Câmara dos
            Deputados, Senado Federal e TSE
          </p>
          <p className="mt-1">
            Sem voto popular: notas derivadas exclusivamente de dados públicos
            auditáveis.
          </p>
        </footer>
      </body>
    </html>
  );
}
