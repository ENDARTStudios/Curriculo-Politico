import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Termometro } from "@/components/Termometro";
import { IdeologyBadge } from "@/components/IdeologyBadge";
import {
  PartyPerformanceChart,
} from "@/components/PartyPerformanceChart";
import { PartyMembersChart } from "@/components/PartyMembersChart";
import { PartyScoreBreakdown } from "@/components/PartyScoreBreakdown";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ acronym: string }>;
}

export default async function PartidoPage({ params }: Props) {
  const { acronym: rawAcronym } = await params;
  const acronym = decodeURIComponent(rawAcronym);

  // Party.members = Term[] (mandatos vinculados à sigla)
  const party = await prisma.party.findUnique({
    where: { acronym },
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

  if (!party) notFound();

  // Snapshots agregados do partido (média por data — Rastreamento Temporal)
  const termIds = party.members.map((t) => t.id);
  const snapshots = termIds.length
    ? await prisma.scoreSnapshot.findMany({
        where: { termId: { in: termIds } },
        orderBy: { snapshotDate: "asc" },
      })
    : [];

  const porData = new Map<string, { scores: number[]; date: Date }>();
  for (const s of snapshots) {
    const key = s.snapshotDate.toISOString().slice(0, 10);
    const acc = porData.get(key) ?? { scores: [], date: s.snapshotDate };
    acc.scores.push(s.finalScore);
    porData.set(key, acc);
  }
  const partySnapshots = [...porData.values()].map((v) => ({
    date: v.date.toISOString(),
    avgScore: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
    memberCount: v.scores.length,
  }));

  const members = party.members
    .map((term) => ({ person: term.person, term, score: term.scores[0] }))
    .sort((a, b) => (b.score?.finalScore ?? 0) - (a.score?.finalScore ?? 0));

  // Ranqueados primeiro (confiança ≥ 60); GRAY ficam ao final, sem posição.
  const ranked = members.filter((m) => m.score && m.score.confidenceScore >= 60);
  const insufficient = members.filter(
    (m) => !m.score || m.score.confidenceScore < 60,
  );

  const avgScore = ranked.length
    ? ranked.reduce((sum, m) => sum + m.score!.finalScore, 0) / ranked.length
    : null;

  const rankedMembers = ranked.map((m) => ({
    id: m.person.id,
    name: m.person.politicalName,
    score: m.score!.finalScore,
    reliability: m.score!.reliabilityStatus as string,
  }));

  // PARTY_SCORING.md: 70% média membros ranqueados + 30% placeholders (50)
  // até a integração TSE (transparência institucional + conformidade)
  const avgMembersScore = ranked.length
    ? ranked.reduce((sum, m) => sum + m.score!.finalScore, 0) / ranked.length
    : 0;
  const partyScore = avgMembersScore * 0.7 + 50 * 0.2 + 50 * 0.1;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/partidos"
        className="mb-6 inline-block text-sm text-slate-400 transition hover:text-slate-100"
      >
        ← Todos os partidos
      </Link>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-100">
          {party.acronym}
        </h1>
        <p className="mt-1 text-lg text-slate-400">{party.name}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <IdeologyBadge
            position={party.position}
            ideology={party.ideology}
            size="md"
          />
          {party.foundedYear && (
            <span className="text-sm text-slate-500">
              Fundado em {party.foundedYear}
            </span>
          )}
          {party.tseNumber && (
            <span className="text-sm text-slate-500">
              Nº TSE: {party.tseNumber}
            </span>
          )}
        </div>
        <div className="mt-4 flex gap-8">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Parlamentares
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {members.length}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Nota média (ranqueados)
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {avgScore !== null ? avgScore.toFixed(1) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {ranked.length > 0 ? (
          <PartyScoreBreakdown
            avgMembersScore={avgMembersScore}
            memberCount={members.length}
            rankedCount={ranked.length}
            transparencyScore={50}
            complianceScore={50}
            finalScore={partyScore}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-500">
            Nenhum membro ranqueado ainda — a nota do partido aparece quando
            houver membros com confiança ≥ 60%.
          </div>
        )}
      </div>

      {/* História do partido */}
      {party.history && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-100">História</h2>
          <p className="leading-relaxed text-slate-400">{party.history}</p>
          {party.ideology && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                Ideologia e Posicionamento
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <IdeologyBadge
                  position={party.position}
                  ideology={party.ideology}
                  size="md"
                />
                <span className="text-sm text-slate-400">{party.ideology}</span>
              </div>
              <p className="mt-2 text-xs italic text-slate-500">
                Classificação baseada em fontes públicas (registro TSE,
                programas partidários e ciência política consolidada). É
                contexto informativo — nunca influencia a nota IDIP.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gráficos de desempenho */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <PartyPerformanceChart
          snapshots={partySnapshots}
          partyColor={party.color ?? ""}
        />
        <PartyMembersChart
          members={rankedMembers}
          partyColor={party.color ?? ""}
        />
      </div>

      {/* Tabela ranqueados + GRAY */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-4">#</th>
              <th className="p-4">Político</th>
              <th className="p-4">Cargo</th>
              <th className="p-4 text-center">Termômetro</th>
              <th className="p-4 text-center">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {ranked.map((m, i) => (
              <tr key={m.term.id} className="transition hover:bg-slate-800/40">
                <td className="p-4 font-mono text-slate-500">{i + 1}º</td>
                <td className="p-4">
                  <Link
                    href={`/politicos/${m.person.id}`}
                    className="font-semibold text-slate-100 hover:underline"
                  >
                    {m.person.politicalName}
                  </Link>
                </td>
                <td className="p-4 text-slate-400">
                  {m.term.office.name} · {m.term.office.jurisdiction}
                </td>
                <td className="p-4 text-center">
                  <Termometro status={m.score!.reliabilityStatus} />
                </td>
                <td className="p-4 text-center text-lg font-bold text-slate-100">
                  {m.score!.finalScore.toFixed(1)}
                </td>
              </tr>
            ))}
            {insufficient.map((m) => (
              <tr key={m.term.id} className="opacity-60 transition hover:bg-slate-800/40">
                <td className="p-4 text-slate-600">—</td>
                <td className="p-4">
                  <Link
                    href={`/politicos/${m.person.id}`}
                    className="font-medium text-slate-300 hover:underline"
                  >
                    {m.person.politicalName}
                  </Link>
                </td>
                <td className="p-4 text-slate-500">
                  {m.term.office.name} · {m.term.office.jurisdiction}
                </td>
                <td className="p-4 text-center">
                  {m.score ? <Termometro status={m.score.reliabilityStatus} /> : "—"}
                </td>
                <td className="p-4 text-center font-bold text-slate-400">
                  {m.score?.finalScore.toFixed(1) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
