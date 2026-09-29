import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q= — busca unificada em 4 entidades:
 * políticos, partidos, projetos de lei e figuras históricas.
 * Mínimo de 2 caracteres; limite de 8 por categoria.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: null, total: 0 });
  }

  const [politicians, parties, bills, historical] = await Promise.all([
    prisma.person.findMany({
      where: {
        OR: [
          { politicalName: { contains: q, mode: "insensitive" } },
          { civilName: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        terms: {
          include: { party: true, office: true },
          take: 1,
          orderBy: { startYear: "desc" },
        },
      },
      take: 8,
      orderBy: { politicalName: "asc" },
    }),

    prisma.party.findMany({
      where: {
        OR: [
          { acronym: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { ideology: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { _count: { select: { members: true } } },
      take: 8,
    }),

    prisma.bill.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      include: {
        authorships: { include: { person: true }, take: 2 },
      },
      take: 8,
      orderBy: { date: "desc" },
    }),

    prisma.historicalPolitician.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      include: { era: true },
      take: 8,
    }),
  ]);

  const results = {
    politicians: politicians.map((p) => ({
      id: p.id,
      name: p.politicalName,
      party: p.terms[0]?.party?.acronym ?? "—",
      office: p.terms[0]?.office?.name ?? "—",
      photo: p.photoUrl,
    })),
    parties: parties.map((p) => ({
      id: p.id,
      acronym: p.acronym,
      name: p.name,
      position: p.position,
      memberCount: p._count.members,
    })),
    bills: bills.map((b) => ({
      id: b.id,
      externalId: b.externalId,
      title: b.title,
      type: b.type,
      authors: b.authorships.map((a) => a.person.politicalName),
      date: b.date,
    })),
    historical: historical.map((h) => ({
      id: h.id,
      name: h.name,
      office: h.office,
      era: h.era?.name ?? null,
      score: h.historicalScore,
    })),
  };

  const total =
    results.politicians.length +
    results.parties.length +
    results.bills.length +
    results.historical.length;

  return NextResponse.json({ results, total });
}
