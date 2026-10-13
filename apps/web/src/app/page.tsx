import type { Metadata } from "next";
import Link from "next/link";
import { HeroStats } from "@/components/HeroStats";
import { carregarNumerosHero } from "@/lib/hero-stats";
import {
  DIMENSOES_LEGISLATIVO,
  DIMENSOES_EXECUTIVO,
  DIMENSOES_STF,
  METODOLOGIA_VERSAO,
  NOTA_MAXIMA_TRAVADA,
} from "@/lib/methodology";
import { STATUS_ORDEM, STATUS_VISUAL } from "@/lib/status-visual";

export const metadata: Metadata = {
  title: "Currículo Político",
  description:
    "Nota de 0 a 100 para cada parlamentar e governante brasileiro, calculada só com dados públicos da Câmara, do Senado e do TSE. Sem enquete, sem opinião.",
  alternates: { canonical: "/" },
};


/**
 * A home é um funil em quatro estágios, nesta ordem:
 *   1. Gancho      — a dor do eleitor nos primeiros 3 segundos
 *   2. Promessa    — o que a plataforma faz e por que resolve
 *   3. Prova       — números reais do banco + metodologia aberta
 *   4. CTA         — uma ação primária clara
 *
 * O racional completo está em `docs/design/estrategia-marketing.md` e nas skills
 * `.dsh/skills/curriculo-*`. Regra ao editar: todo elemento novo precisa
 * responder à dor central ("vou votar e não sei em quem confiar"). O que não
 * responde não pertence à home.
 */

/**
 * Define `ReliabilityStatus` dinâmica: os números de prova e a distribuição do
 * Termômetro mudam a cada carga dos ETLs, então não podem ser congelados no
 * build (que também exigiria banco acessível durante o `next build`).
 * Convenção seguida por todas as páginas com dados (ver `ranking/page.tsx`).
 */
export const dynamic = "force-dynamic";

/** Ações secundárias: mesma intenção de aprofundar, fora do caminho principal. */
const ACOES_SECUNDARIAS = [
  { href: "/comparar", label: "Comparar dois políticos" },
  { href: "/projetos", label: "Ver projetos de lei" },
  { href: "/partidos", label: "Desempenho dos partidos" },
] as const;

export default async function Home() {
  const numeros = await carregarNumerosHero();

  return (
    <>
      {/* ────────────────────────────────────────────────────────────────────
          1 + 2 + 4 — Gancho, Promessa e CTA
          ──────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
        {/* Brilho de fundo: profundidade sem competir com o texto. Decorativo,
            portanto `aria-hidden` e atrás do conteúdo (`z-0` / `z-10`). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 motion-safe:animate-aurora"
        >
          <div className="absolute left-1/2 top-[-16rem] h-[36rem] w-[68rem] -translate-x-1/2 rounded-full bg-sky-500/20 blur-[130px]" />
          <div className="absolute bottom-[-18rem] right-[-10rem] h-[30rem] w-[42rem] rounded-full bg-emerald-500/10 blur-[130px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 motion-safe:animate-rise sm:py-28">
          {/* Gancho de dor — o que o visitante sente, dito antes do produto */}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            Antes de votar, confira o que ele fez
          </p>

          {/* Gancho de marca — o maior elemento da página */}
          {/*
            Gancho de marca — o maior elemento da página e a assinatura do
            produto. O detector do Impeccable sinaliza `oversized-h1` (72px,
            70 caracteres, 29% da altura do viewport). É uma exceção
            DELIBERADA, não um descuido: o gancho é curto em palavras (11), a
            headline é a identidade do projeto, e a métrica que realmente
            importava — comprimento de linha — foi corrigida no parágrafo
            abaixo (`max-w-[65ch]`). Registrado aqui para que ninguém
            "conserte" isto sem saber que foi uma decisão.
          */}
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Uma campanha política não revela o seu candidato.
            <span className="mt-2 block text-sky-400">
              O currículo dele sim.
            </span>
          </h1>

          {/* Promessa — o que é e como funciona, sem jargão */}
          <p className="mt-7 max-w-[65ch] text-lg leading-relaxed text-slate-300 sm:text-xl">
            Damos uma nota de <strong className="font-semibold text-slate-100">0 a 100</strong>{" "}
            para cada parlamentar e governante, calculada só com dados públicos
            auditáveis: como votou, o que propôs, se apareceu e quanto custou.
            Sem enquete, sem opinião, sem voto popular.
          </p>

          {/* CTA — uma ação primária, e só uma */}
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/ranking"
              className="rounded-lg bg-sky-500 px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:bg-sky-400"
            >
              Ver o ranking completo
            </Link>
            <a
              href="#prova"
              className="text-sm font-medium text-sky-400 transition hover:text-sky-300"
            >
              Ver a auditoria por trás das notas ↓
            </a>
          </div>

          {/* Ações secundárias — peso visual deliberadamente menor que o CTA */}
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-800/80 pt-6 text-sm text-slate-400">
            {ACOES_SECUNDARIAS.map((acao) => (
              <Link
                key={acao.href}
                href={acao.href}
                className="transition hover:text-slate-100"
              >
                {acao.label}
              </Link>
            ))}
          </div>

          {/* Selo de método — reforça a promessa sem virar um segundo CTA */}
          <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
              <span aria-hidden="true">🟢</span> Código aberto · AGPL-3.0
            </span>
            <span>
              Metodologia IDIP v{METODOLOGIA_VERSAO} pública e versionada em{" "}
              <Link
                href="/metodologia"
                className="underline decoration-slate-600 underline-offset-2 transition hover:text-slate-200"
              >
                /metodologia
              </Link>
            </span>
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          3 — Prova: números reais do banco
          Some inteira se o banco estiver vazio ou indisponível; a home segue
          funcionando com gancho, promessa e CTA.
          ──────────────────────────────────────────────────────────────────── */}
      <div id="prova" className="scroll-mt-20">
        <HeroStats numeros={numeros} />
      </div>

      <main className="mx-auto max-w-6xl px-6">
        {/* ──────────────────────────────────────────────────────────────────
            Prova metodológica: o Termômetro.
            Mostra que existem critérios públicos e que "sem dados" não é
            "ruim" — a distinção que sustenta a neutralidade do índice.
            ────────────────────────────────────────────────────────────────── */}
        <section id="termometro" className="scroll-mt-20 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
            Nota alta não basta: existe o risco
          </h2>
          <p className="mt-3 max-w-[65ch] leading-relaxed text-slate-400">
            A nota mede desempenho. O Termômetro de Confiabilidade mede risco e
            transparência, e aparece sempre ao lado dela. Um político com boa
            produção, mas com condenação transitada em julgado, não passa de{" "}
            {NOTA_MAXIMA_TRAVADA.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
            })}{" "}
            — a trava de integridade é automática, não editorial.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {STATUS_ORDEM.map((status) => {
              const cfg = STATUS_VISUAL[status];
              return (
                <div
                  key={status}
                  className={`rounded-xl border p-5 ${cfg.border} ${cfg.bg}`}
                >
                  <h3 className={`font-semibold ${cfg.color}`}>
                    <span aria-hidden="true">{cfg.emoji}</span> {cfg.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {cfg.descricao}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-slate-400">
            Os critérios completos, com fórmula e pesos, estão em{" "}
            <Link
              href="/metodologia"
              className="font-medium text-sky-400 underline decoration-sky-800 underline-offset-2 transition hover:text-sky-300"
            >
              metodologia
            </Link>
            .
          </p>
        </section>

        {/* ──────────────────────────────────────────────────────────────────
            Prova: os pesos reais do motor.
            Derivados de `@/lib/methodology`, que é validado contra
            `WEIGHTS` do motor pelo teste WEB-001 em `verify-scoring.ts`.
            NUNCA redigite estes números aqui: a home já divergiu do motor
            exibindo v1.0 quando a fórmula já era v1.1.
            ────────────────────────────────────────────────────────────────── */}
        <section id="metodologia" className="scroll-mt-20 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
            Como a nota é calculada
          </h2>
          <p className="mt-3 max-w-[65ch] leading-relaxed text-slate-400">
            Pesos diferentes para quem legisla e para quem governa — as duas
            funções não se medem do mesmo jeito. Toda dimensão sem dado
            disponível recebe um baseline neutro e é sinalizada na interface.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <PesosCartao
              titulo="Legislativo"
              descricao="Deputados federais e senadores"
              dimensoes={DIMENSOES_LEGISLATIVO}
            />
            <PesosCartao
              titulo="Executivo"
              descricao="Presidente e governadores"
              dimensoes={DIMENSOES_EXECUTIVO}
            />
            {/*
              O Judiciário tem índice PRÓPRIO (IDIP-STF), e os pesos abaixo não
              são os mesmos do Legislativo de propósito: ministro do STF é
              nomeado, não eleito, então Aprovação/Campanha/Presença não se
              aplicam, e o que importa num tribunal constitucional é produção,
              coerência decisória, publicidade e conduta. Os pesos espelham os
              campos de `StfScore` no schema — não há dimensão sem onde gravar.

              A coleta ainda não existe: as tabelas do STF estão vazias (as
              decisões saem no DJE sem API consolidada). Os pesos são a
              metodologia declarada; a nota entra quando o ETL entrar.
            */}
            <PesosCartao
              titulo="Judiciário"
              descricao="Ministros do Supremo Tribunal Federal"
              dimensoes={DIMENSOES_STF}
              nota="Índice próprio (IDIP-STF), com pesos diferentes do Legislativo: ministro é nomeado, não eleito. A coleta das decisões do STF está em construção — elas são publicadas no Diário de Justiça Eletrônico sem API consolidada — então ainda não há nota publicada."
            />
          </div>

          <p className="mt-6 text-sm leading-relaxed text-slate-400">
            O que a plataforma já acompanha sobre o STF, com fonte oficial, está
            em{" "}
            <Link
              href="/stf"
              className="font-medium text-sky-400 underline decoration-sky-800 underline-offset-2 transition hover:text-sky-300"
            >
              /stf
            </Link>
            .
          </p>
        </section>

        {/* ──────────────────────────────────────────────────────────────────
            Fecho do funil: repetir o CTA depois da prova. Quem leu até aqui já
            foi convencido; não deixe essa pessoa sem o próximo passo.
            ────────────────────────────────────────────────────────────────── */}
        <section className="border-t border-slate-800 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
            Confira quem representa você
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-slate-400">
            Leva menos de um minuto. Se a nota parecer errada, o cálculo é
            aberto e há canal de retificação com protocolo rastreável.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              href="/ranking"
              className="rounded-lg bg-sky-500 px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:bg-sky-400"
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

/**
 * Cartão de pesos de um perfil.
 *
 * Aceita `nota` para representar um perfil que AINDA NÃO é pontuado. Sem isso, a
 * única forma de falar do Judiciário seria inventar pesos — o que quebraria a
 * regra do projeto de que nenhuma regra entra na nota sem estar implementada em
 * `scoring.ts` (ver `.claude/skills/curriculo-idip`). Uma plataforma de
 * auditoria não pode inventar metodologia para preencher um cartão.
 *
 * A soma dos pesos é exibida de propósito: pesos que não fecham em 100% são um
 * defeito de metodologia, e defeito de metodologia deve ficar visível na tela
 * em vez de escondido no código.
 */
function PesosCartao({
  titulo,
  descricao,
  dimensoes,
  nota,
}: {
  titulo: string;
  descricao: string;
  dimensoes?: readonly { label: string; percent: number }[];
  nota?: string;
}) {
  const soma = dimensoes?.reduce((total, d) => total + d.percent, 0) ?? 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="font-semibold text-slate-100">{titulo}</h3>
      <p className="mt-0.5 text-sm text-slate-400">{descricao}</p>

      {dimensoes && (
        <>
          <ul className="mt-5 space-y-2.5">
            {dimensoes.map((d) => (
              <li
                key={d.label}
                className="flex items-baseline justify-between gap-4"
              >
                <span className="text-sm text-slate-300">{d.label}</span>
                <span className="flex flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800"
                  >
                    <span
                      className="block h-full rounded-full bg-sky-500/70"
                      style={{ width: `${d.percent * 3}%` }}
                    />
                  </span>
                  <span className="w-10 text-right font-mono text-sm tabular-nums text-slate-400">
                    {d.percent}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-400">
            Soma dos pesos:{" "}
            <span className="font-mono tabular-nums">{soma}%</span>
          </p>
        </>
      )}

      {nota && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Sem nota publicada
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{nota}</p>
        </div>
      )}
    </div>
  );
}
