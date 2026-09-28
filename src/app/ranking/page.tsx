import { prisma } from "@/lib/prisma";
import { Termometro } from "@/components/Termometro";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const people = await prisma.person.findMany({
    include: {
      terms: {
        include: {
          office: true,
          party: true,
          scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
        },
        orderBy: { startYear: "desc" },
        take: 1,
      },
    },
  });

  const rows = people.map((p) => ({
    person: p,
    term: p.terms[0],
    score: p.terms[0]?.scores[0],
  }));

  // SCORING_METHODOLOGY.md §5: confiança < 60 (GRAY) não entra no ranking —
  // são listados ao final, sem posição, para transparência.
  const ranked = rows
    .filter((r) => r.score && r.score.confidenceScore >= 60)
    .sort((a, b) => b.score!.finalScore - a.score!.finalScore);
  const insufficient = rows
    .filter((r) => !r.score || r.score.confidenceScore < 60)
    .sort((a, b) => (b.score?.finalScore ?? 0) - (a.score?.finalScore ?? 0));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Ranking IDIP
      </h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Políticos ordenados pelo Índice de Desempenho e Integridade Pública.
        Quem tem confiança abaixo de 60% (dados insuficientes) fica fora do
        ranking e aparece ao final, sem posição.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
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
              {ranked.map((row, i) => (
                <tr key={row.person.id} className="transition hover:bg-slate-800/40">
                  <td className="p-4 font-mono text-slate-500">{i + 1}º</td>
                  <td className="p-4">
                    <Link href={`/politicos/${row.person.id}`} className="flex items-center gap-3">
                      <Image
                        src={row.person.photoUrl || "/avatar-placeholder.svg"}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                        unoptimized
                      />
                      <span className="font-semibold text-slate-100 hover:underline">
                        {row.person.politicalName}
                      </span>
                    </Link>
                  </td>
                  <td className="p-4 text-slate-400">
                    {row.term?.party?.acronym ?? "—"} / {row.term?.office?.jurisdiction ?? "—"}
                  </td>
                  <td className="p-4 text-center">
                    {row.score ? <Termometro status={row.score.reliabilityStatus} /> : "—"}
                  </td>
                  <td className="p-4 text-center text-lg font-bold text-slate-100">
                    {row.score?.finalScore.toFixed(1) ?? "—"}
                  </td>
                  <td className="p-4 text-center text-slate-500">
                    {row.score ? `${row.score.confidenceScore.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
              {insufficient.map((row) => (
                <tr key={row.person.id} className="opacity-60 transition hover:bg-slate-800/40">
                  <td className="p-4 text-slate-600">—</td>
                  <td className="p-4">
                    <Link href={`/politicos/${row.person.id}`} className="flex items-center gap-3">
                      <Image
                        src={row.person.photoUrl || "/avatar-placeholder.svg"}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover grayscale"
                        unoptimized
                      />
                      <span className="font-medium text-slate-300 hover:underline">
                        {row.person.politicalName}
                      </span>
                    </Link>
                  </td>
                  <td className="p-4 text-slate-500">
                    {row.term?.party?.acronym ?? "—"} / {row.term?.office?.jurisdiction ?? "—"}
                  </td>
                  <td className="p-4 text-center">
                    {row.score ? <Termometro status={row.score.reliabilityStatus} /> : "—"}
                  </td>
                  <td className="p-4 text-center font-bold text-slate-400">
                    {row.score?.finalScore.toFixed(1) ?? "—"}
                  </td>
                  <td className="p-4 text-center text-slate-600">
                    {row.score ? `${row.score.confidenceScore.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Nota provisória para políticos com dados insuficientes: baseline neutro
        (50) — não representa desempenho real. Ela é recalculada conforme o
        pipeline ingere votações, proposições e dados financeiros.
      </p>
    </main>
  );
}
