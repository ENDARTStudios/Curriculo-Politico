import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/politicians/[id] — Perfil público + nota IDIP + registros jurídicos.
 * Aceita o id interno (cuid) ou o id externo da fonte (Câmara/Senado/TSE).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let person;
  try {
    person = await prisma.person.findFirst({
      where: { OR: [{ id }, { externalId: id }] },
      include: {
        terms: {
          orderBy: { startYear: "desc" },
          include: {
            office: true,
            party: true,
            scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
          },
        },
        legalRecords: { orderBy: { retrievedAt: "desc" } },
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

  if (!person) {
    return NextResponse.json(
      {
        error: "POLITICO_NAO_ENCONTRADO",
        message: `Nenhum político encontrado para o identificador "${id}".`,
      },
      { status: 404 },
    );
  }

  // LGPD / SECURITY_BASELINE.md §3: registros judiciais arquivados ou com
  // absolvição (CLEARED) são ocultados do perfil público automaticamente.
  const legalRecords = person.legalRecords
    .filter((record) => record.type !== "CLEARED" && record.status !== "ARQUIVADO")
    .map((record) => ({
      type: record.type,
      status: record.status,
      court: record.court,
      sourceUrl: record.sourceUrl,
      retrievedAt: record.retrievedAt,
    }));

  const terms = person.terms.map((term) => ({
    office: {
      type: term.office.type,
      name: term.office.name,
      jurisdiction: term.office.jurisdiction,
    },
    party: term.party ? { acronym: term.party.acronym, name: term.party.name } : null,
    startYear: term.startYear,
    endYear: term.endYear,
    score: term.scores[0]
      ? {
          version: term.scores[0].version,
          finalScore: term.scores[0].finalScore,
          confidence: term.scores[0].confidenceScore,
          reliability: term.scores[0].reliabilityStatus,
          dimensions: {
            integrity: term.scores[0].integrityScore,
            productivity: term.scores[0].productivityScore,
            transparency: term.scores[0].transparencyScore,
          },
          calculatedAt: term.scores[0].calculatedAt,
        }
      : null,
  }));

  return NextResponse.json({
    id: person.id,
    externalId: person.externalId,
    civilName: person.civilName,
    politicalName: person.politicalName,
    photoUrl: person.photoUrl,
    terms,
    legalRecords,
  });
}
