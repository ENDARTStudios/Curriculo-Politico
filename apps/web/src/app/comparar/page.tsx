import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { prisma } from "@/lib/prisma";
import { ComparacaoCards } from "@/components/ComparacaoCards";

export const metadata: Metadata = {
  title: "Comparar",
  description:
    "Compare dois políticos lado a lado: nota IDIP por dimensão, Termômetro de Confiabilidade, presença, produção legislativa e custo.",
  alternates: { canonical: "/comparar" },
};


export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ ids?: string }>;
}

export default async function CompararPage({ searchParams }: Props) {
  const { ids } = await searchParams;
  const initialIds = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const politicians = await prisma.person.findMany({
    where: { externalId: { not: { startsWith: "seed-" } } },
    include: {
      terms: {
        orderBy: { startYear: "desc" },
        take: 1,
        include: {
          office: true,
          party: true,
          scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { politicalName: "asc" },
  });

  // Só quem tem nota (e está fora do GRAY entra na comparação pública,
  // seguindo SCORING_METHODOLOGY §5)
  const dados = politicians
    .map((p) => {
      const term = p.terms[0];
      const score = term?.scores[0];
      if (!score) return null;
      return {
        id: p.id,
        politicalName: p.politicalName,
        photoUrl: p.photoUrl,
        party: term?.party?.acronym ?? null,
        office: term?.office?.name ?? null,
        uf: term?.office?.jurisdiction ?? null,
        score: {
          final: score.finalScore,
          confidence: score.confidenceScore,
          status: score.reliabilityStatus as string,
        },
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null && p.score.confidence >= 60);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <CabecalhoPagina
        titulo="Comparar Políticos"
        lead={
          <>
            Selecione de 2 a 3 políticos para comparar desempenho e confiança lado
            a lado. Use os filtros para achar rapidamente entre {dados.length}{" "}
            parlamentares com confiança ≥ 60%.
          </>
        }
      />

      <div className="mt-8">
        <ComparacaoCards politicians={dados} initialIds={initialIds} />
      </div>
    </main>
  );
}
