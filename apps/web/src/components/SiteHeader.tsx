"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { NAV_PRIMARIA, grupoAtivo } from "@/lib/navegacao";
import { SearchBar } from "@/components/SearchBar";

/**
 * Barra superior do site.
 *
 * ── O que mudou, e por quê ──────────────────────────────────────────────────
 * Antes: doze links planos num `flex-wrap`, sem hierarquia, quebrando em duas
 * linhas no desktop, todos como `<a>` (recarregando a página inteira), sem
 * estado ativo, e com o acesso à conta **apenas no rodapé**.
 *
 * Agora: cinco grupos primários, três com submenu, estado ativo visível,
 * navegação cliente com `<Link>` e a conta no topo — onde ela é procurada.
 *
 * ── Por que disclosure, e não `role="menu"` ─────────────────────────────────
 * `role="menu"` promete ao leitor de tela navegação por setas, `aria-activedescendant`
 * e foco gerenciado. Se não implementarmos tudo isso, o papel mente — foi
 * exatamente o erro que cometi no dropdown de busca. O padrão *disclosure*
 * (botão com `aria-expanded` + painel de links comuns) é honesto: os links
 * continuam sendo links, alcançáveis por Tab, com o comportamento que o
 * navegador garante.
 *
 * Abre por clique, não por hover: hover aciona sem intenção ao passar o mouse a
 * caminho de outro item, e é inacessível a teclado e a toque.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { data: sessao, status } = useSession();
  const [aberto, setAberto] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const grupoAtual = grupoAtivo(pathname);

  // Navegou: fecha tudo. Sem isso o submenu fica aberto sobre a página nova.
  useEffect(() => {
    setAberto(null);
    setDrawer(false);
  }, [pathname]);

  // Escape fecha; clique fora fecha.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(null);
        setDrawer(false);
      }
    }
    function aoClicar(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(null);
      }
    }
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicar);
    };
  }, []);

  // Trava a rolagem do fundo enquanto o drawer está aberto.
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <header
      ref={containerRef}
      className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
        {/* Marca — o reflexo nº 1 de "voltar ao início". */}
        <Link
          href="/"
          aria-label="Currículo Político — página inicial"
          className="-m-2 flex shrink-0 items-center gap-2 rounded-lg p-2 text-base font-bold tracking-tight transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <span aria-hidden="true">📡</span>
          {/*
            O nome fica visível em TODA largura. Estava `hidden sm:inline`, e em
            375px sobrava um emoji de satélite solto no canto — que parece ícone
            quebrado, não marca. O texto cabe: são 17 caracteres a 15px, e o
            cluster da direita ocupa ~120px dos 375.
          */}
          <span className="text-[15px] sm:text-base">Currículo Político</span>
        </Link>

        {/* Navegação primária — só a partir de lg, onde há largura de verdade. */}
        <nav aria-label="Navegação principal" className="hidden lg:flex lg:items-center lg:gap-1">
          {NAV_PRIMARIA.map((grupo) => {
            const ativo = grupoAtual?.id === grupo.id;

            if (!grupo.itens) {
              return (
                <Link
                  key={grupo.id}
                  href={grupo.href!}
                  aria-current={ativo ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    ativo
                      ? "bg-slate-800 text-slate-50"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-50"
                  }`}
                >
                  {grupo.label}
                </Link>
              );
            }

            const expandido = aberto === grupo.id;
            return (
              <div key={grupo.id} className="relative">
                <button
                  type="button"
                  aria-expanded={expandido}
                  aria-controls={`submenu-${grupo.id}`}
                  onClick={() => setAberto(expandido ? null : grupo.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    ativo
                      ? "bg-slate-800 text-slate-50"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-50"
                  }`}
                >
                  {grupo.label}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className={`h-2.5 w-2.5 transition-transform ${expandido ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {expandido && (
                  <div
                    id={`submenu-${grupo.id}`}
                    className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl"
                  >
                    {grupo.itens.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={pathname === item.href ? "page" : undefined}
                        className="block rounded-lg px-3 py-2.5 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                      >
                        <span className="block text-sm font-medium text-slate-100">
                          {item.label}
                        </span>
                        {item.descricao && (
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                            {item.descricao}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Busca: largura fixa no desktop, para não empurrar a conta. */}
          <div className="hidden w-64 xl:block">
            <SearchBar />
          </div>

          <Conta status={status} nome={sessao?.user?.name ?? null} />

          {/* Hambúrguer: abaixo de lg. */}
          <button
            type="button"
            aria-expanded={drawer}
            aria-controls="menu-mobile"
            aria-label={drawer ? "Fechar menu" : "Abrir menu"}
            onClick={() => setDrawer((v) => !v)}
            className="rounded-lg border border-slate-700 p-2 text-slate-200 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 lg:hidden"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              {drawer ? (
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Drawer mobile ─────────────────────────────────────────────────── */}
      {drawer && (
        <div
          id="menu-mobile"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-800 bg-slate-950 px-4 pb-8 pt-4 lg:hidden"
        >
          <SearchBar />

          <nav aria-label="Navegação principal (mobile)" className="mt-6 space-y-6">
            {NAV_PRIMARIA.map((grupo) => (
              <div key={grupo.id}>
                {grupo.itens ? (
                  <>
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {grupo.label}
                    </p>
                    <ul className="mt-2 space-y-0.5">
                      {grupo.itens.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={pathname === item.href ? "page" : undefined}
                            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  /*
                    Link direto (Projetos, Comparar): mesmo peso dos itens de
                    submenu. Em negrito e sem cabeçalho acima, ele se confundia
                    com os títulos de grupo — parecia seção, não destino.
                  */
                  <Link
                    href={grupo.href!}
                    aria-current={grupoAtual?.id === grupo.id ? "page" : undefined}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                  >
                    {grupo.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Institucional: no mobile fica aqui, no desktop vive no rodapé. */}
          <div className="mt-8 border-t border-slate-800 pt-5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Projeto
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-2">
              {[
                { href: "/sobre", label: "Sobre" },
                { href: "/apoie", label: "Apoie" },
                { href: "/contato", label: "Contato" },
                { href: "/status", label: "Status" },
                { href: "/retificacao", label: "Retificação" },
                { href: "/termos-de-uso", label: "Termos" },
                { href: "/privacidade", label: "Privacidade" },
                { href: "/lgpd", label: "LGPD" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * Acesso à conta.
 *
 * ── O que isso conserta ─────────────────────────────────────────────────────
 * "Minha conta" existia **só no rodapé**, no meio de onze links jurídicos. Quem
 * queria entrar precisava rolar a página inteira e saber que o login morava ali.
 * Login é ação de topo de página em qualquer produto — a posição no rodapé era
 * o sintoma mais visível de que a barra nunca foi planejada, só preenchida.
 *
 * ── Por que "loading" renderiza "Entrar" ───────────────────────────────────
 * A primeira versão most rava um retângulo cinza do tamanho do botão enquanto a
 * sessão carregava, para evitar salto de layout. Na prática o visitante via um
 * **bloco vazio** no canto superior direito — que parece defeito, e na captura de
 * `/metodologia` apareceu exatamente assim.
 *
 * A maioria absoluta de quem chega é anônima, então o padrão certo é "Entrar":
 * ele é o estado final para quase todo mundo, e o usuário autenticado vê o
 * próprio nome trocar em milissegundos. Um flash de "Entrar" incomoda muito
 * menos que um retângulo sem significado.
 */
function Conta({ status, nome }: { status: string; nome: string | null }) {
  if (status === "authenticated") {
    const primeiroNome = nome?.split(" ")[0] ?? "Conta";
    return (
      <Link
        href="/conta"
        className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        <span
          aria-hidden="true"
          className="grid h-5 w-5 place-items-center rounded-full bg-sky-500 text-[11px] font-bold text-slate-950"
        >
          {primeiroNome.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{primeiroNome}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/auth/signin"
      className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-50"
    >
      Entrar
    </Link>
  );
}
