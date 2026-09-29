/**
 * Ranking de Afinidade — camada PESSOAL do usuário, separada do IDIP
 * (Neutralidade Algorítmica, /metodologia).
 *
 * Vigente: afinidade por AUTORIA — quantos projetos nos temas escolhidos
 * pelo usuário cada político authored.
 * Planejado: quando a ponte votação↔proposição tiver dados suficientes
 * (LegislativeAction.proposicaoId), o ranking passa a usar o histórico de
 * votos (Sim/Não) nos temas selecionados.
 */
import { prisma } from "@/lib/prisma";

export type Stance = "FAVOR" | "CONTRA";

export interface AffinityEntry {
  id: string;
  name: string;
  photo: string | null;
  party: string | null;
  uf: string | null;
  matches: number;
}

export async function computeAuthorshipAffinity(
  topics: string[],
  positions: Record<string, Stance>,
): Promise<{
  totalBillsAnalyzed: number;
  modo: "autorias";
  ranking: AffinityEntry[];
}> {
  const tagged = await prisma.bill.findMany({
    where: { tags: { not: undefined } },
    select: { id: true, externalId: true, tags: true },
  });

  const relevantes = tagged.filter((b) => {
    const tags = (b.tags as string[] | null) ?? [];
    return tags.some((t) => topics.includes(t));
  });

  if (relevantes.length === 0) {
    return { totalBillsAnalyzed: 0, modo: "autorias", ranking: [] };
  }

  const billIds = new Set(relevantes.map((b) => b.id));

  const autorias = await prisma.billAuthorship.findMany({
    where: { billId: { in: [...billIds] } },
    include: {
      person: { select: { id: true, politicalName: true, photoUrl: true } },
      bill: { select: { externalId: true, tags: true } },
    },
  });

  const score = new Map<
    string,
    { name: string; photo: string | null; matches: number; contraMatches: number }
  >();

  for (const a of autorias) {
    const billTags = (a.bill.tags as string[] | null) ?? [];
    const topicsDoBill = billTags.filter((t) => topics.includes(t));
    if (topicsDoBill.length === 0) continue;

    const entry =
      score.get(a.personId) ??
      {
        name: a.person.politicalName,
        photo: a.person.photoUrl,
        matches: 0,
        contraMatches: 0,
      };

    // Peso: +1 se o tema é de apoio do usuário; temas de oposição contam
    // como "exposição" ao tema (não subtraem — autorias são fato, não posição).
    const apoia = topicsDoBill.some((t) => positions[t] === "FAVOR");
    if (apoia) entry.matches += 1;
    else entry.contraMatches += 1;

    score.set(a.personId, entry);
  }

  // Enriquecer com partido/UF do mandato atual
  const pessoas = await prisma.person.findMany({
    where: { id: { in: [...score.keys()] } },
    select: {
      id: true,
      terms: {
        orderBy: { startYear: "desc" },
        take: 1,
        select: { party: { select: { acronym: true } }, office: { select: { jurisdiction: true } } },
      },
    },
  });
  const infoPorPessoa = new Map(
    pessoas.map((p) => [
      p.id,
      { party: p.terms[0]?.party?.acronym ?? null, uf: p.terms[0]?.office?.jurisdiction ?? null },
    ]),
  );

  const ranking: AffinityEntry[] = [...score.entries()]
    .map(([id, d]) => ({
      id,
      name: d.name,
      photo: d.photo,
      party: infoPorPessoa.get(id)?.party ?? null,
      uf: infoPorPessoa.get(id)?.uf ?? null,
      matches: d.matches,
    }))
    .filter((d) => d.matches > 0)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 50);

  return { totalBillsAnalyzed: relevantes.length, modo: "autorias", ranking };
}
