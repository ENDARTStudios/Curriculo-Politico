/**
 * Resolução de Identidade — cruza parlamentares (Câmara + Senado) com
 * candidatos do TSE (consulta_cand 2022 e 2018) e preenche tseId + birthYear.
 *
 * Entrada: data/raw/tse_candidatos_{ano}_raw.json (etl/tse_candidatos.py)
 * Saída:   atualizações no Person + data/identity_resolution_report.json
 *
 * Segurança do matching:
 * - UF + cargo sempre exigidos (homônimos ficam em circunscrições distintas);
 * - cada candidato só pode ser reivindicado por um político (used set);
 * - MEDIUM exige similaridade ≥ 0.85 e não pode empatar.
 *
 *   npm run resolve-identity
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  resolveMatch,
  type MatchConfidence,
  type MatchResult,
  type TSECandidate,
} from "../src/lib/identity";

const prisma = new PrismaClient();

function cargoDoOffice(officeName: string): string | null {
  const n = officeName.toLowerCase();
  if (n.includes("deputado federal")) return "DEPUTADO FEDERAL";
  if (n.includes("senador")) return "SENADOR";
  return null;
}

async function loadCandidatos(): Promise<TSECandidate[]> {
  const todos: TSECandidate[] = [];
  for (const ano of [2022, 2018]) {
    const path = join(process.cwd(), "data", "raw", `tse_candidatos_${ano}_raw.json`);
    if (!existsSync(path)) {
      console.log(`⚠️  Base ${ano} ausente (${path}) — rode: python etl/tse_candidatos.py --ano ${ano}`);
      continue;
    }
    const data: TSECandidate[] = JSON.parse(readFileSync(path, "utf-8"));
    console.log(`📥 ${data.length} candidatos do TSE/${ano}`);
    todos.push(...data);
  }
  return todos;
}

async function resolve() {
  const candidatos = await loadCandidatos();
  if (candidatos.length === 0) {
    console.error("\n❌ Nenhuma base TSE disponível. Nada a fazer.");
    process.exit(2);
  }

  const pessoas = await prisma.person.findMany({
    include: {
      terms: { include: { office: true, party: true }, orderBy: { startYear: "desc" }, take: 1 },
    },
  });
  console.log(`📊 Cruzando com ${pessoas.length} parlamentares...\n`);

  const used = new Set<string>();
  const resumo: Record<MatchConfidence, number> = { HIGH: 0, MEDIUM: 0, NONE: 0 };
  const detalhes: Array<{
    politicalName: string;
    confidence: MatchConfidence;
    reason: string;
    tseId?: string;
    birthYear?: number | null;
  }> = [];

  for (const pessoa of pessoas) {
    const term = pessoa.terms[0];
    const cargo = term ? cargoDoOffice(term.office.name) : null;
    const uf = term?.office.jurisdiction ?? null;

    let result: MatchResult;
    if (!cargo || !uf) {
      result = { candidate: null, confidence: "NONE", reason: `Cargo/UF indefinidos` };
    } else {
      result = resolveMatch(
        {
          politicalName: pessoa.politicalName,
          uf,
          partyAcronym: term.party?.acronym ?? null,
          cargo,
        },
        candidatos,
      );
    }

    // Cada SQ_CANDIDATO pertence a um único político
    if (result.candidate && used.has(`${result.candidate.ano}:${result.candidate.tse_id}`)) {
      result = { ...result, candidate: null, confidence: "NONE", reason: `Candidato já reivindicado (${result.reason})` };
    }

    resumo[result.confidence]++;

    if (result.candidate) {
      used.add(`${result.candidate.ano}:${result.candidate.tse_id}`);
      // Re-execuções podem reatribuir um SQ: solta o dono anterior primeiro
      await prisma.person.updateMany({
        where: { tseId: result.candidate.tse_id, NOT: { id: pessoa.id } },
        data: { tseId: null },
      });
      await prisma.person.update({
        where: { id: pessoa.id },
        data: {
          tseId: result.candidate.tse_id,
          birthYear: result.candidate.ano_nascimento ?? null,
        },
      });
      console.log(
        `[${result.confidence.padEnd(6)}] ${pessoa.politicalName.padEnd(26)} → TSE/${result.candidate.ano} ${result.candidate.tse_id} | ${result.reason}`,
      );
    } else {
      console.log(`[NONE  ] ${pessoa.politicalName.padEnd(26)} → ${result.reason}`);
    }

    detalhes.push({
      politicalName: pessoa.politicalName,
      confidence: result.confidence,
      reason: result.reason,
      tseId: result.candidate?.tse_id,
      birthYear: result.candidate?.ano_nascimento,
    });
  }

  // Limpeza idempotente: NONE não pode herdar dados de rodadas anteriores
  const limpos = await prisma.person.updateMany({
    where: { tseId: null, birthYear: { not: null } },
    data: { birthYear: null },
  });
  if (limpos.count > 0) {
    console.log(`🧹 ${limpos.count} birthYear(s) órfão(s) de rodadas anteriores removido(s).`);
  }

  const relatorio = {
    resolvedAt: new Date().toISOString(),
    candidatosBase: candidatos.length,
    parlamentares: pessoas.length,
    resumo,
    detalhes,
  };
  const reportPath = join(process.cwd(), "data", "identity_resolution_report.json");
  writeFileSync(reportPath, JSON.stringify(relatorio, null, 2), "utf-8");

  console.log(
    `\n🎉 HIGH: ${resumo.HIGH} | MEDIUM: ${resumo.MEDIUM} | sem match: ${resumo.NONE} (relatório em data/identity_resolution_report.json)`,
  );
}

resolve()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
