/**
 * Revisão dos casos MEDIUM de identidade com critérios objetivos de promoção:
 *   1. Partido atual = partido da candidatura mais recente (≥ 2022)
 *   2. Situação ELEITO na eleição de 2022 (mandato atual)
 *   3. Nome de urna é substring do nome atual
 * Casos que não atendem nenhum critério ficam para revisão manual.
 *   npm run review-medium
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { normalizeName } from "@cp/idip";

const prisma = new PrismaClient();

interface ReportDetalhe {
  politicalName: string;
  confidence: string;
  reason: string;
  tseId?: string;
}

interface TSECandidate {
  tse_id: string;
  ano: number;
  nome_urna: string;
  partido_sigla: string;
  uf: string;
  cargo: string;
  situacao?: string;
  ano_nascimento: number | null;
}

async function loadCandidatos(): Promise<TSECandidate[]> {
  const todos: TSECandidate[] = [];
  for (const ano of [2022, 2018]) {
    const path = join(process.cwd(), "data", "raw", `tse_candidatos_${ano}_raw.json`);
    if (!existsSync(path)) continue;
    todos.push(...JSON.parse(readFileSync(path, "utf-8")));
  }
  return todos;
}

async function review() {
  const reportPath = join(process.cwd(), "data", "identity_resolution_report.json");
  if (!existsSync(reportPath)) {
    console.error("❌ Relatório não encontrado. Rode primeiro: npm run resolve-identity");
    process.exit(1);
  }

  const report = JSON.parse(readFileSync(reportPath, "utf-8"));
  const mediumCases: ReportDetalhe[] = (report.detalhes ?? []).filter(
    (d: ReportDetalhe) => d.confidence === "MEDIUM" && d.tseId,
  );

  console.log(`🔍 Analisando ${mediumCases.length} casos MEDIUM...\n`);
  const candidatos = await loadCandidatos();
  console.log(`📥 ${candidatos.length} candidatos TSE carregados\n`);

  let promovidos = 0;

  for (const caso of mediumCases) {
    const person = await prisma.person.findFirst({
      where: { politicalName: caso.politicalName },
      include: { terms: { orderBy: { startYear: "desc" }, take: 1, include: { party: true } } },
    });
    if (!person) continue;

    const candidato = candidatos.find(
      (c) => c.tse_id === caso.tseId,
    );
    if (!candidato) continue;

    const currentParty = person.terms[0]?.party?.acronym;
    const tseParty = candidato.partido_sigla;
    const tseStatus = candidato.situacao ?? "";
    const tseYear = candidato.ano;

    // Critérios objetivos de promoção (mesmos estágios do resolver)
    let promotionReason = "";
    if (currentParty === tseParty && tseYear >= 2022) {
      promotionReason = `Partido atual (${currentParty}) = partido TSE/${tseYear}`;
    } else if (tseStatus.toUpperCase().startsWith("ELEITO") && tseYear === 2022) {
      promotionReason = `ELEITO em 2022 (mandato atual)`;
    } else if (
      normalizeName(person.politicalName).includes(normalizeName(candidato.nome_urna)) &&
      normalizeName(candidato.nome_urna).length >= 2
    ) {
      promotionReason = `Nome de urna é substring do nome atual`;
    }

    if (promotionReason) {
      await prisma.person.update({
        where: { id: person.id },
        data: {
          tseId: candidato.tse_id,
          birthYear: person.birthYear ?? candidato.ano_nascimento ?? null,
        },
      });
      promovidos++;
      console.log(
        `✅ PROMOVER: ${person.politicalName.padEnd(26)} | ${promotionReason}`,
      );
    } else {
      console.log(
        `⚠️  MANTER:  ${person.politicalName.padEnd(26)} | ${caso.reason}`,
      );
    }
  }

  console.log(`\n📊 ${promovidos}/${mediumCases.length} casos promovidos para HIGH.`);
  console.log("   Reexecute npm run resolve-identity para atualizar o relatório.");
}

review()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
