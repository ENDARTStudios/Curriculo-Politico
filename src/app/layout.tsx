import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Currículo Político — Transparência Política com Dados Públicos",
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
            <span className="text-lg font-bold tracking-tight">📡 Currículo Político</span>
            <nav className="flex flex-wrap gap-5 text-sm text-slate-400">
              <a href="/ranking" className="transition hover:text-slate-100">
                Ranking
              </a>
              <a href="/partidos" className="transition hover:text-slate-100">
                Partidos
              </a>
              <a href="/projetos" className="transition hover:text-slate-100">
                Projetos
              </a>
              <a href="/comparar" className="transition hover:text-slate-100">
                Comparar
              </a>
              <a href="/como-funciona" className="transition hover:text-slate-100">
                Como Funciona
              </a>
              <a href="/calendario-eleitoral" className="transition hover:text-slate-100">
                Calendário
              </a>
              <a href="/historia" className="transition hover:text-slate-100">
                História
              </a>
              <a href="/stf" className="transition hover:text-slate-100">
                STF
              </a>
              <a href="/faq" className="transition hover:text-slate-100">
                FAQ
              </a>
              <a href="/metodologia" className="transition hover:text-slate-100">
                Metodologia
              </a>
              <a href="/sobre" className="transition hover:text-slate-100">
                Sobre
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
          <div className="mt-4 flex justify-center gap-5">
            <a href="/sobre" className="transition hover:text-slate-300">
              Sobre
            </a>
            <a href="/termos-de-uso" className="transition hover:text-slate-300">
              Termos de Uso
            </a>
            <a href="/privacidade" className="transition hover:text-slate-300">
              Privacidade
            </a>
            <a href="/retificacao" className="transition hover:text-slate-300">
              Retificação
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
