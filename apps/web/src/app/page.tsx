import type { Metadata } from "next";
import Link from "next/link";
import { HeroStats } from "@/components/HeroStats";
import { SearchBar } from "@/components/SearchBar";
import { carregarNumerosHero } from "@/lib/hero-stats";
import { formatarNota } from "@/lib/formato";
import { METODOLOGIA_VERSAO, NOTA_MAXIMA_TRAVADA } from "@/lib/methodology";
import { STATUS_ORDEM, STATUS_VISUAL } from "@/lib/status-visual";

export const metadata: Metadata = {
  title: "Currículo Político",
  description:
    "Nota de 0 a 100 para cada parlamentar e governante brasileiro, calculada só com dados públicos da Câmara, do Senado e do TSE. Sem enquete, sem opinião.",
  alternates: { canonical: "/" },
};

/**
 * A home.
 *
 * ── O que mudou, e por quê ──────────────────────────────────────────────────
 * A versão anterior era um funil de texto: título, parágrafo, CTA — e depois
 * quatro cartões do Termômetro e **três cartões de pesos da metodologia**. Ela
 * não mostrava nenhum dado da plataforma acima da dobra: um visitante não tinha
 * como saber, sem clicar, o que o produto entrega.
 *
 * A regra do conceito é "o dado é o herói". A home a violava — o herói era o
 * texto, e o dado só aparecia depois de duas rolagens.
 *
 * Estrutura nova:
 *   1. Herói dividido — a promessa à esquerda, o **ranking real** à direita
 *   2. Busca no herói — a tarefa nº 1 ("achar meu político") era possível só no
 *      header; aqui ela é a ação principal, onde o olho já está
 *   3. Números de prova
 *   4. Como ler a nota — os quatro estados, em faixa horizontal
 *   5. Três caminhos — para onde ir a seguir, explícito
 *   6. Fecho com o CTA
 *
 * Os cartões de pesos saíram: eles pertencem a `/metodologia`, que existe
 * exatamente para isso. Repeti-los aqui fazia a home parecer documentação.
 */
export const dynamic = "force-dynamic";

/** Os três caminhos, ditos como convite e não como menu. */
const CAMINHOS = [
  {
    href: "/ranking",
    titulo: "Ver quem está no topo",
    texto:
      "Os políticos com confiança suficiente para entrar no ranking, do maior para o menor.",
    rotulo: "Ranking IDIP",
  },
  {
    href: "/comparar",
    titulo: "Colocar dois lado a lado",
    texto:
      "Nota, dimensões, votos e financiamento de dois candidatos na mesma tela.",
    rotulo: "Comparar",
  },
  {
    href: "/espectro",
    titulo: "Descobrir seu espectro",
    texto:
      "Responda sobre os temas que importam e veja quais políticos se aproximam.",
    rotulo: "Meu Espectro",
  },
] as const;

export default async function Home() {
  const numeros = await carregarNumerosHero();
  const destaques = numeros?.destaques ?? [];

  return (
    <>
      {/* ── 1 + 2 · Herói: promessa à esquerda, produto à direita ─────────── */}
      <section className="border-b border-slate-800">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Antes de votar, confira o que ele fez
            </p>

            {/*
              O gancho de marca. O detector do Impeccable sinaliza `oversized-h1`
              aqui; é exceção DELIBERADA — o gancho tem 11 palavras, é a
              assinatura do projeto, e o que de fato prejudicava a leitura (linha
              longa) está controlado pelo `max-w` do parágrafo abaixo.
            */}
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-slate-50 sm:text-5xl">
              Uma campanha não revela o candidato.
              <span className="mt-2 block text-sky-400">O currículo dele sim.</span>
            </h1>

            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-slate-300">
              Uma nota de{" "}
              <strong className="font-semibold text-slate-100">0 a 100</strong> por
              parlamentar e governante, calculada só com dado público auditável:
              como votou, o que propôs, se apareceu e quanto custou. Sem enquete,
              sem opinião, sem voto popular.
            </p>

            {/*
              Busca no herói. É a tarefa nº 1 de quem chega — "quem é o meu
              político?" — e até então só existia no header, longe do olhar.
            */}
            <div className="mt-8 max-w-md">
              <SearchBar
                idLista="busca-home-resultados"
                rotuloBusca="Buscar político, partido ou projeto"
              />
              <p className="mt-2 text-xs text-slate-400">
                Busque por nome, partido ou tema. Ou{" "}
                <Link
                  href="/ranking"
                  className="font-medium text-sky-400 underline decoration-sky-800 underline-offset-2 transition hover:text-sky-300"
                >
                  veja o ranking completo
                </Link>
                .
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/ranking"
                className="rounded-lg bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-50"
              >
                Ver o ranking
              </Link>
              <Link
                href="/metodologia"
                className="text-sm font-medium text-slate-300 transition hover:text-slate-50"
              >
                Como a nota é calculada →
              </Link>
            </div>

            <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
                <span aria-hidden="true">🟢</span> Código aberto · AGPL-3.0
              </span>
              <span>Metodologia IDIP v{METODOLOGIA_VERSAO}, pública e versionada.</span>
            </p>
          </div>

          {/*
            O produto, visível. Quatro linhas reais do ranking com nota e
            Termômetro: em três segundos a pessoa entende o que a plataforma faz,
            sem ler um parágrafo. Se o banco estiver fora, o bloco desaparece e o
            herói continua funcionando sozinho.
          */}
          {destaques.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-100">Ranking IDIP</h2>
                <span className="text-xs text-slate-400">
                  {numeros?.politicosAvaliados.toLocaleString("pt-BR")} avaliados
                </span>
              </div>

              <ol className="mt-4 space-y-1">
                {destaques.map((d, i) => {
                  const cfg = STATUS_VISUAL[d.status];
                  return (
                    <li key={d.id}>
                      <Link
                        href={`/politicos/${d.id}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-slate-800/70"
                      >
                        <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-slate-400">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-100">
                            {d.nome}
                          </span>
                          <span className="block truncate text-xs text-slate-400">
                            {d.partido ?? "—"} · {d.cargo ?? "—"}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-base font-bold tabular-nums text-slate-50">
                            {formatarNota(d.nota)}
                          </span>
                          <span
                            className={`block text-[11px] font-medium ${cfg.color}`}
                            title={cfg.label}
                          >
                            <span aria-hidden="true">{cfg.emoji}</span> {cfg.label}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>

              <Link
                href="/ranking"
                className="mt-3 block rounded-lg border border-slate-700 px-4 py-2.5 text-center text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Ver o ranking completo →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 3 · Números de prova ─────────────────────────────────────────── */}
      <div id="prova" className="scroll-mt-20">
        <HeroStats numeros={numeros} />
      </div>

      <main className="mx-auto max-w-5xl px-6">
        {/* ── 4 · Como ler a nota ────────────────────────────────────────────
            Faixa horizontal em vez de quatro cartões grandes: aqui o objetivo é
            reconhecer o símbolo, não estudar cada estado. O detalhe está em
            /metodologia. */}
        <section id="termometro" className="scroll-mt-20 py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
              Nota alta não basta: existe o risco
            </h2>
            <Link
              href="/metodologia"
              className="text-sm font-medium text-sky-400 transition hover:text-sky-300"
            >
              Metodologia completa →
            </Link>
          </div>

          <p className="mt-3 max-w-[65ch] leading-relaxed text-slate-400">
            A nota mede desempenho. O Termômetro de Confiabilidade mede risco e
            transparência, e aparece sempre ao lado dela. Um político com boa
            produção, mas com condenação transitada em julgado, não passa de{" "}
            {formatarNota(NOTA_MAXIMA_TRAVADA)} — a trava de integridade é
            automática, não editorial.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_ORDEM.map((status) => {
              const cfg = STATUS_VISUAL[status];
              return (
                <li
                  key={status}
                  className={`rounded-xl border p-4 ${cfg.border} ${cfg.bg}`}
                >
                  <p className={`flex items-center gap-2 text-sm font-semibold ${cfg.color}`}>
                    <span aria-hidden="true">{cfg.emoji}</span> {cfg.label}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {cfg.descricao}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── 5 · Três caminhos ──────────────────────────────────────────────
            Diz para onde ir. A home anterior terminava pedindo "confira quem
            representa você" sem oferecer porta além do ranking. */}
        <section className="border-t border-slate-800 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
            Por onde começar
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CAMINHOS.map((caminho) => (
              <Link
                key={caminho.href}
                href={caminho.href}
                className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-400">
                  {caminho.rotulo}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">
                  {caminho.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {caminho.texto}
                </p>
                <span className="mt-4 inline-block text-sm font-medium text-slate-300 transition group-hover:text-sky-400">
                  Abrir →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 6 · Fecho ───────────────────────────────────────────────────── */}
        <section className="border-t border-slate-800 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
            Confira quem representa você
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-slate-400">
            Leva menos de um minuto. Se a nota parecer errada, o cálculo é aberto e
            há canal de retificação com protocolo rastreável.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              href="/ranking"
              className="rounded-lg bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-50"
            >
              Começar pelo ranking
            </Link>
            <Link
              href="/retificacao"
              className="text-sm font-medium text-slate-400 transition hover:text-slate-200"
            >
              Solicitar retificação
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
