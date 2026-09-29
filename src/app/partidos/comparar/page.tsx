import { prisma } from "@/lib/prisma";
import { ComparacaoPartidos } from "@/components/ComparacaoPartidos";
import Link from "next/link";
import type { ReliabilityStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PartyStats {
  id: string;
  acronym: string;
  name: string;
  memberCount: number;
  avgScore: number | null;
  avgConfidence: number;
  distribution: Record<ReliabilityStatus, number>;
}

export default async function CompararPartidosPage() {
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

  const stats: PartyStats[] = parties
    .map((party) => {
      const scores = party.members
        .map((t) => t.scores[0])
        .filter((s) => !!s);

      const distribution: Record<ReliabilityStatus, number> = {
        GREEN: 0, YELLOW: 0, RED: 0, GRAY: 0,
      };
      for (const s of scores) distribution[s!.reliabilityStatus]++;

      // Média apenas de ranqueados (confiança ≥ 60), como em /partidos
      const ranked = scores.filter((s) => s!.confidenceScore >= 60);
      const avgScore = ranked.length
        ? ranked.reduce((sum, s) => sum + s!.finalScore, 0) / ranked.length
        : null;
      const avgConfidence = scores.length
        ? scores.reduce((sum, s) => sum + s!.confidenceScore, 0) / scores.length
        : 0;

      return {
        id: party.id,
        acronym: party.acronym,
        name: party.name,
        memberCount: party.members.length,
        avgScore,
        avgConfidence,
        distribution,
      };
    })
    .filter((p) => p.memberCount > 0)
    .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/partidos"
        className="mb-6 inline-block text-sm text-slate-400 transition hover:text-slate-100"
      >
        ← Todos os partidos
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Comparar Partidos
      </h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Selecione de 2 a 4 partidos para comparar desempenho agregado,
        distribuição do termômetro e confiança média dos dados.
      </p>

      <div className="mt-8">
        <ComparacaoPartidos parties={stats} />
      </div>
    </main>
  );
}
