import type { ReliabilityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Termometro } from "@/components/Termometro";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import Image from "next/image";
import Link from "next/link";

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

  return (
    <tr className={`transition hover:bg-slate-800/40 ${destaque ? "" : "opacity-60"}`}>
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
      <td
        className={`p-4 text-center font-bold ${
          destaque ? "text-lg text-slate-100" : "text-slate-400"
        }`}
      >
        {row.score ? row.score.finalScore.toFixed(1) : "—"}
      </td>
      <td className={`p-4 text-center ${destaque ? "text-slate-400" : "text-slate-400"}`}>
        {row.score ? `${row.score.confidenceScore.toFixed(0)}%` : "—"}
      </td>
    </tr>
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
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
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

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="overflow-x-auto">
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
      </div>

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
