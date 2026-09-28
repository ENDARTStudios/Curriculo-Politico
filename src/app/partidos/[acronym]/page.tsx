import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Termometro } from "@/components/Termometro";

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

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/partidos" className="mb-6 inline-block text-sm text-slate-400 transition hover:text-slate-100">
        ← Todos os partidos
      </Link>

      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-100">{party.acronym}</h1>
        <p className="mt-1 text-lg text-slate-400">{party.name}</p>
        {party.ideology && (
          <p className="mt-1 text-sm text-slate-500">Ideologia registrada: {party.ideology}</p>
        )}
        <div className="mt-4 flex gap-8">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Parlamentares</div>
            <div className="text-2xl font-bold text-slate-100">{members.length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Nota média (ranqueados)</div>
            <div className="text-2xl font-bold text-slate-100">
              {avgScore !== null ? avgScore.toFixed(1) : "—"}
            </div>
          </div>
        </div>
      </div>

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
                  <Link href={`/politicos/${m.person.id}`} className="flex items-center gap-3">
                    <Image
                      src={m.person.photoUrl || "/avatar-placeholder.svg"}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                      unoptimized
                    />
                    <span className="font-semibold text-slate-100 hover:underline">
                      {m.person.politicalName}
                    </span>
                  </Link>
                </td>
                <td className="p-4 text-slate-400">
                  {m.term.office.name} · {m.term.office.jurisdiction}
                </td>
                <td className="p-4 text-center">
                  {m.score ? <Termometro status={m.score.reliabilityStatus} /> : "—"}
                </td>
                <td className="p-4 text-center text-lg font-bold text-slate-100">
                  {m.score?.finalScore.toFixed(1) ?? "—"}
                </td>
              </tr>
            ))}
            {insufficient.map((m) => (
              <tr key={m.term.id} className="opacity-60 transition hover:bg-slate-800/40">
                <td className="p-4 text-slate-600">—</td>
                <td className="p-4">
                  <Link href={`/politicos/${m.person.id}`} className="flex items-center gap-3">
                    <Image
                      src={m.person.photoUrl || "/avatar-placeholder.svg"}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover grayscale"
                      unoptimized
                    />
                    <span className="font-medium text-slate-300 hover:underline">
                      {m.person.politicalName}
                    </span>
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
