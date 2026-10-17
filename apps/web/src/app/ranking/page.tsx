import type { Metadata } from "next";
import type { ReliabilityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatarNota, formatarPercentual } from "@/lib/formato";
import { Termometro } from "@/components/Termometro";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ranking IDIP",
  description:
    "Ranking completo de políticos brasileiros pela nota IDIP, com o Termômetro de Confiabilidade ao lado de cada nota. Metodologia aberta e auditável.",
  alternates: { canonical: "/ranking" },
};


export const dynamic = "force-dynamic";

/**
 * Linhas por página. A auditoria de produção de 2026-09-29 mediu 3,1 s e
 * 1,5 MB de HTML nesta rota: os 594 parlamentares eram renderizados em uma
 * única tabela. A paginação corta o payload sem alterar a ordem nem os dados.
 */
const PAGE_SIZE = 100;

type Grupo = "ranking" | "insuficientes";

type RankingRow = {
  id: string;
  politicalName: string;
  photoUrl: string | null;
  party: string | null;
  jurisdiction: string | null;
  score: {
    finalScore: number;
    confidenceScore: number;
    reliabilityStatus: ReliabilityStatus;
  } | null;
};

function parsePagina(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

function linkGrupo(grupo: Grupo, pagina = 1): string {
  if (grupo === "insuficientes") {
    return pagina > 1
      ? `/ranking?grupo=insuficientes&pagina=${pagina}`
      : "/ranking?grupo=insuficientes";
  }
  return pagina > 1 ? `/ranking?pagina=${pagina}` : "/ranking";
}

function LinhaRanking({ row, posicao }: { row: RankingRow; posicao: number | null }) {
  const destaque = posicao !== null;

  // Linha sem posição (dados insuficientes) usava `opacity-60`. Opacidade no
  // container multiplica sobre o texto que já é slate-400 e derruba o contraste
  // abaixo de AA — o axe reprovou 8 nós no calendário e 21 na página de partido
  // pelo mesmo motivo. O fundo mais escuro distingue sem custar legibilidade.
  return (
    <tr className={`transition hover:bg-slate-800/40 ${destaque ? "" : "bg-slate-900/30"}`}>
      <td className="p-4 font-mono text-slate-400">
        {posicao !== null ? `${posicao}º` : "—"}
      </td>
      <td className="p-4">
        <Link href={`/politicos/${row.id}`} className="flex items-center gap-3">
          <Image
            src={row.photoUrl || "/avatar-placeholder.svg"}
            alt=""
            width={40}
            height={40}
            className={`h-10 w-10 rounded-full object-cover ${destaque ? "" : "grayscale"}`}
            unoptimized
          />
          <span
            className={
              destaque
                ? "font-semibold text-slate-100 hover:underline"
                : "font-medium text-slate-300 hover:underline"
            }
          >
            {row.politicalName}
          </span>
        </Link>
      </td>
      <td className={destaque ? "p-4 text-slate-400" : "p-4 text-slate-400"}>
        {row.party ?? "—"} / {row.jurisdiction ?? "—"}
      </td>
      <td className="p-4 text-center">
        {row.score ? <Termometro status={row.score.reliabilityStatus} /> : "—"}
      </td>
      <td className="p-4">
        {row.score ? (
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={`font-bold tabular-nums ${
                destaque ? "text-lg text-slate-100" : "text-slate-400"
              }`}
            >
              {formatarNota(row.score.finalScore)}
            </span>
            {/*
              Barra de magnitude com escala fixa (0–100) e a mesma largura em
              todas as linhas: é o que torna a distância entre duas notas
              visível. Um número sozinho não se compara.
              Azul, não cor de estado: o Termômetro na coluna ao lado já carrega
              confiabilidade, e repetir a mesma cor duas vezes na linha faria a
              cor deixar de significar uma coisa só.
            */}
            <span className="block h-1 w-24 overflow-hidden rounded-full bg-slate-800">
              <span
                className="block h-full rounded-full bg-sky-500"
                style={{ width: `${Math.min(100, Math.max(0, row.score.finalScore))}%` }}
              />
            </span>
          </div>
        ) : (
          "—"
        )}
      </td>
      <td className="p-4 text-center tabular-nums text-slate-400">
        {formatarPercentual(row.score?.confidenceScore)}
      </td>
    </tr>
  );
}

/**
 * A linha do ranking como card — usada só abaixo de `md`.
 *
 * ── Por que card, e não a tabela rolando ────────────────────────────────────
 * Em 375px seis colunas não cabem: a tabela vira uma região de rolagem
 * horizontal, e a **nota** — que é o motivo de a pessoa estar ali — sai da tela.
 * A rolagem existe e funciona, mas esconde justamente o dado.
 *
 * O card mantém o que importa na primeira dobra: posição, nome, partido/UF, nota,
 * termômetro e confiança. É o mesmo conteúdo da linha, reorganizado.
 *
 * Desenhado no documento de identidade, página 14 (Responsivo).
 */
function CartaoRanking({ row, posicao }: { row: RankingRow; posicao: number | null }) {
  const destaque = posicao !== null;

  return (
    <li
      className={`rounded-xl border border-slate-800 p-4 ${
        destaque ? "bg-slate-900/60" : "bg-slate-900/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <Image
          src={row.photoUrl || "/avatar-placeholder.svg"}
          alt=""
          width={40}
          height={40}
          className={`h-10 w-10 shrink-0 rounded-full object-cover ${destaque ? "" : "grayscale"}`}
          unoptimized
        />

        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs text-slate-400">
            {posicao !== null ? `${posicao}º` : "—"}
          </div>
          <Link
            href={`/politicos/${row.id}`}
            className={`block truncate font-semibold hover:underline ${
              destaque ? "text-slate-100" : "text-slate-300"
            }`}
          >
            {row.politicalName}
          </Link>
          <div className="mt-0.5 truncate text-xs text-slate-400">
            {row.party ?? "—"} / {row.jurisdiction ?? "—"}
          </div>
          {row.score && (
            <div className="mt-2">
              <Termometro status={row.score.reliabilityStatus} />
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div
            className={`font-bold tabular-nums ${
              destaque ? "text-lg text-slate-100" : "text-slate-400"
            }`}
          >
            {row.score ? formatarNota(row.score.finalScore) : "—"}
          </div>
          <div className="text-xs tabular-nums text-slate-400">
            {formatarPercentual(row.score?.confidenceScore)}
          </div>
        </div>
      </div>

      {/* Mesma barra de magnitude da tabela: escala fixa 0–100, azul de ação. */}
      {row.score && (
        <span className="mt-3 block h-1 overflow-hidden rounded-full bg-slate-800">
          <span
            className="block h-full rounded-full bg-sky-500"
            style={{ width: `${Math.min(100, Math.max(0, row.score.finalScore))}%` }}
          />
        </span>
      )}
    </li>
  );
}

function Aba({ grupo, ativo, total }: { grupo: Grupo; ativo: boolean; total: number }) {
  const rotulo = grupo === "ranking" ? "Ranking" : "Dados insuficientes";
  return (
    <Link
      href={linkGrupo(grupo)}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        ativo
          ? "border-sky-500/50 bg-sky-500/10 text-sky-300"
          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
      }`}
    >
      {rotulo} <span className="font-normal text-slate-400">({total})</span>
    </Link>
  );
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; grupo?: string }>;
}) {
  const { pagina: paginaRaw, grupo: grupoRaw } = await searchParams;
  const grupo: Grupo = grupoRaw === "insuficientes" ? "insuficientes" : "ranking";

  // "seed-*" são dados fictícios de desenvolvimento (npm run db:seed). O filtro
  // com OR preserva quem tem externalId nulo (não exclui ninguém legítimo).
  const people = await prisma.person.findMany({
    where: {
      OR: [{ externalId: null }, { externalId: { not: { startsWith: "seed-" } } }],
    },
    select: {
      id: true,
      politicalName: true,
      photoUrl: true,
      terms: {
        select: {
          office: { select: { jurisdiction: true } },
          party: { select: { acronym: true } },
          scores: {
            orderBy: { calculatedAt: "desc" },
            take: 1,
            select: {
              finalScore: true,
              confidenceScore: true,
              reliabilityStatus: true,
            },
          },
        },
        orderBy: { startYear: "desc" },
        take: 1,
      },
    },
  });

  const rows: RankingRow[] = people.map((person) => {
    const term = person.terms[0];
    const score = term?.scores[0];
    return {
      id: person.id,
      politicalName: person.politicalName,
      photoUrl: person.photoUrl,
      party: term?.party?.acronym ?? null,
      jurisdiction: term?.office?.jurisdiction ?? null,
      score: score
        ? {
            finalScore: score.finalScore,
            confidenceScore: score.confidenceScore,
            reliabilityStatus: score.reliabilityStatus,
          }
        : null,
    };
  });

  // SCORING_METHODOLOGY.md §5: confiança < 60 (GRAY) não entra no ranking —
  // são listados em aba separada, sem posição, para transparência.
  const ranked = rows
    .filter((r) => r.score && r.score.confidenceScore >= 60)
    .sort((a, b) => b.score!.finalScore - a.score!.finalScore);
  const insufficient = rows
    .filter((r) => !r.score || r.score.confidenceScore < 60)
    .sort((a, b) => (b.score?.finalScore ?? 0) - (a.score?.finalScore ?? 0));

  const lista = grupo === "insuficientes" ? insufficient : ranked;
  const totalPaginas = Math.max(1, Math.ceil(lista.length / PAGE_SIZE));
  const pagina = Math.min(parsePagina(paginaRaw), totalPaginas);
  const inicio = (pagina - 1) * PAGE_SIZE;
  const visiveis = lista.slice(inicio, inicio + PAGE_SIZE);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
        Ranking IDIP
      </h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Políticos ordenados pelo Índice de Desempenho e Integridade Pública.
        Quem tem confiança abaixo de 60% (dados insuficientes) fica fora do
        ranking e aparece na aba ao final, sem posição.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Aba grupo="ranking" ativo={grupo === "ranking"} total={ranked.length} />
        <Aba
          grupo="insuficientes"
          ativo={grupo === "insuficientes"}
          total={insufficient.length}
        />
      </div>

      {/* Região rolável alcançável por teclado (WCAG 2.1.1). Sem `tabIndex`, quem
          navega sem mouse vê a tabela cortada em 375px e não consegue rolar. */}
      {/*
        A tabela só aparece de `md` para cima. Abaixo disso, seis colunas não cabem
        e a nota — o motivo da visita — sairia da tela. O card logo abaixo faz o
        mesmo papel; ver o comentário de `CartaoRanking`.
      */}
      <div
        className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 md:block"
        role="region"
        aria-label="Tabela do ranking IDIP"
        tabIndex={0}
      >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="p-4">#</th>
                <th className="p-4">Político</th>
                <th className="p-4">Partido / UF</th>
                <th className="p-4 text-center">Termômetro</th>
                <th className="p-4 text-center">Nota IDIP</th>
                <th className="p-4 text-center">Confiança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {visiveis.map((row, i) => (
                <LinhaRanking
                  key={row.id}
                  row={row}
                  posicao={grupo === "ranking" ? inicio + i + 1 : null}
                />
              ))}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum registro nesta lista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      {/* Versão card, só abaixo de `md`. */}
      <ul className="mt-4 space-y-3 md:hidden">
        {visiveis.map((row, i) => (
          <CartaoRanking
            key={row.id}
            row={row}
            posicao={grupo === "ranking" ? inicio + i + 1 : null}
          />
        ))}
        {visiveis.length === 0 && (
          <li className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
            Nenhum registro nesta lista.
          </li>
        )}
      </ul>

      {totalPaginas > 1 && (
        <nav
          aria-label="Paginação do ranking"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          {pagina > 1 ? (
            <Link
              href={linkGrupo(grupo, pagina - 1)}
              className="rounded-lg border border-slate-800 px-4 py-2 text-slate-300 hover:text-slate-100"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-lg border border-slate-800/50 px-4 py-2 text-slate-400">
              ← Anterior
            </span>
          )}

          <span className="text-slate-400">
            Página {pagina} de {totalPaginas} · {lista.length} registros
          </span>

          {pagina < totalPaginas ? (
            <Link
              href={linkGrupo(grupo, pagina + 1)}
              className="rounded-lg border border-slate-800 px-4 py-2 text-slate-300 hover:text-slate-100"
            >
              Próxima →
            </Link>
          ) : (
            <span className="rounded-lg border border-slate-800/50 px-4 py-2 text-slate-400">
              Próxima →
            </span>
          )}
        </nav>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Nota provisória para políticos com dados insuficientes: baseline neutro
        (50) — não representa desempenho real. Ela é recalculada conforme o
        pipeline ingere votações, proposições e dados financeiros.
      </p>

      <LegalDisclaimer />
    </main>
  );
}
