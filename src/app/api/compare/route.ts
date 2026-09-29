import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/compare?ids=id1,id2[,id3...] — dados para comparação lado a lado.
 * Máximo de 5 ids por requisição.
 */
export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json(
      { error: "IDS_OBRIGATORIO", message: 'Parâmetro "ids" é obrigatório (ex: ids=id1,id2).' },
      { status: 400 },
    );
  }

  const idList = ids.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  if (idList.length === 0) {
    return NextResponse.json(
      { error: "IDS_OBRIGATORIO", message: "Nenhum id válido informado." },
      { status: 400 },
    );
  }

  const people = await prisma.person.findMany({
    where: { id: { in: idList } },
    include: {
      terms: {
        orderBy: { startYear: "desc" },
        take: 1,
        include: {
          office: true,
          party: true,
          scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
          _count: { select: { actions: true, sessionAttendances: true } },
        },
      },
      _count: { select: { billAuthorships: true } },
    },
  });

  const resultado = people.map((p) => {
    const term = p.terms[0];
    const score = term?.scores[0];
    return {
      id: p.id,
      externalId: p.externalId,
      name: p.politicalName,
      party: term?.party?.acronym ?? null,
      office: term?.office?.name ?? null,
      uf: term?.office?.jurisdiction ?? null,
      score: score
        ? {
            final: score.finalScore,
            confidence: score.confidenceScore,
            status: score.reliabilityStatus,
            dimensions: {
              integrity: score.integrityScore,
              productivity: score.productivityScore,
              transparency: score.transparencyScore,
            },
          }
        : null,
      stats: {
        votes: term?._count.actions ?? 0,
        bills: p._count.billAuthorships,
        attendance: term?._count.sessionAttendances ?? 0,
      },
    };
  });

  // Preserva a ordem solicitada
  const ordenado = idList.map(
    (id) => resultado.find((r) => r.id === id) ?? null,
  );

  return NextResponse.json({ politicians: ordenado });
}
