import { prisma } from "@/lib/prisma";
import { IdeologyBadge } from "@/components/IdeologyBadge";
import Link from "next/link";
import type { ReliabilityStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PartyRow {
  id: string;
  acronym: string;
  name: string;
  position: string | null;
  ideology: string | null;
  memberCount: number;
  rankedCount: number;
  avgScore: number | null;
  partyScore: number | null;
  avgConfidence: number;
  distribution: Record<ReliabilityStatus, number>;
}

async function getPartyStats(): Promise<PartyRow[]> {
  // Party.members = Term[] (mandatos vinculados à sigla)
  const parties = await prisma.party.findMany({
    include: {
      members: {
        include: {
          office: true,
          person: true,
          scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return parties
    .map((party) => {
      const scores = party.members
        .map((term) => term.scores[0])
        .filter((s) => !!s);

      const distribution: Record<ReliabilityStatus, number> = {
        GREEN: 0, YELLOW: 0, RED: 0, GRAY: 0,
      };
      for (const s of scores) distribution[s!.reliabilityStatus]++;

      // SCORING_METHODOLOGY §5: a média do partido considera apenas membros
      // com confiança ≥ 60 — GRAY usa baseline provisório e distorceria a média.
      const ranked = scores.filter((s) => s!.confidenceScore >= 60);
      const avgScore = ranked.length
        ? ranked.reduce((sum, s) => sum + s!.finalScore, 0) / ranked.length
        : null;
      // PARTY_SCORING.md: 70% média membros + 30% placeholders (50) até TSE
      const partyScore = avgScore !== null ? avgScore * 0.7 + 50 * 0.3 : null;
      const avgConfidence = scores.length
        ? scores.reduce((sum, s) => sum + s!.confidenceScore, 0) / scores.length
        : 0;

      return {
        id: party.id,
        acronym: party.acronym,
        name: party.name,
        position: party.position,
        ideology: party.ideology,
        memberCount: party.members.length,
        rankedCount: ranked.length,
        avgScore,
        partyScore,
        avgConfidence,
        distribution,
      };
    })
    .filter((p) => p.memberCount > 0)
    .sort((a, b) => (b.partyScore ?? -1) - (a.partyScore ?? -1));
}

const CHIP = {
  GREEN: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  YELLOW: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  RED: "bg-red-500/10 text-red-300 border-red-500/30",
  GRAY: "bg-slate-500/10 text-slate-400 border-slate-500/30",
} as const;

const EMOJI = { GREEN: "🟢", YELLOW: "🟡", RED: "🔴", GRAY: "⚪" } as const;
const LABEL = {
  GREEN: "Confiável",
  YELLOW: "Atenção",
  RED: "Não Confiável",
  GRAY: "Dados Insuficientes",
} as const;

export default async function PartidosPage() {
  const stats = await getPartyStats();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Partidos</h1>
        <a
          href="/partidos/comparar"
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
        >
          ⚖️ Comparar Partidos
        </a>
      </div>
      <p className="-mt-4 mb-8 max-w-3xl text-slate-400">
        Agregação por sigla do mandato atual. A nota média considera apenas
        parlamentares com confiança ≥ 60% — perfis GRAY usam baseline
        provisório e distorceriam a média.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-4">Partido</th>
                <th className="p-4 text-center">Parlamentares</th>
                <th className="p-4">Ideologia</th>
                <th className="p-4 text-center">Nota do Partido</th>
                <th className="p-4 text-center">Confiança média</th>
                <th className="p-4">Distribuição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {stats.map((party) => (
                <tr key={party.id} className="transition hover:bg-slate-800/40">
                  <td className="p-4">
                    <Link
                      href={`/partidos/${encodeURIComponent(party.acronym)}`}
                      className="font-semibold text-slate-100 hover:underline"
                    >
                      {party.acronym}
                    </Link>
                    <div className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">
                      {party.name}
                    </div>
                  </td>
                  <td className="p-4 text-center text-slate-300">{party.memberCount}</td>
                  <td className="p-4">
                    {party.position ? (
                      <IdeologyBadge position={party.position} ideology={party.ideology} />
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="text-lg font-bold text-slate-100">
                      {party.partyScore !== null ? party.partyScore.toFixed(1) : "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {party.rankedCount}/{party.memberCount} ranqueados
                    </div>
                  </td>
                  <td className="p-4 text-center text-slate-500">
                    {party.avgConfidence.toFixed(0)}%
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 text-xs">
                      {(Object.keys(party.distribution) as Array<ReliabilityStatus>)
                        .filter((k) => party.distribution[k] > 0)
                        .map((k) => (
                          <span
                            key={k}
                            title={LABEL[k]}
                            className={`rounded border px-2 py-0.5 ${CHIP[k]}`}
                          >
                            {EMOJI[k]} {party.distribution[k]}
                          </span>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
