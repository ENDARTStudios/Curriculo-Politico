import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const OFFICE_TYPES = new Set(["EXECUTIVE", "LEGISLATIVE"]);

/**
 * GET /api/rankings?cargo=LEGISLATIVE|EXECUTIVE&limit=10
 * Top N por nota IDIP. Políticos com confiança < 60 (GRAY) ficam fora
 * do ranking, conforme SCORING_METHODOLOGY.md §5.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const cargo = params.get("cargo")?.toUpperCase();
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 10) || 10, 1), 50);

  if (cargo && !OFFICE_TYPES.has(cargo)) {
    return NextResponse.json(
      {
        error: "CARGO_INVALIDO",
        message: 'Parâmetro "cargo" deve ser EXECUTIVE ou LEGISLATIVE.',
      },
      { status: 400 },
    );
  }

  let scores;
  try {
    scores = await prisma.score.findMany({
      where: {
        confidenceScore: { gte: 60 },
        ...(cargo ? { term: { office: { type: cargo } } } : {}),
      },
      orderBy: { finalScore: "desc" },
      take: limit,
      include: {
        term: { include: { person: true, office: true, party: true } },
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "BANCO_INDISPONIVEL",
        message: "Não foi possível acessar o banco de dados. Suba o Postgres com: docker compose up -d db",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    filters: { cargo: cargo ?? "TODOS", limit },
    ranking: scores.map((score, index) => ({
      position: index + 1,
      politicalName: score.term.person.politicalName,
      office: score.term.office.name,
      jurisdiction: score.term.office.jurisdiction,
      party: score.term.party?.acronym ?? null,
      finalScore: score.finalScore,
      reliability: score.reliabilityStatus,
      confidence: score.confidenceScore,
    })),
  });
}
