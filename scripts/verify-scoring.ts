/**
 * Smoke test do motor IDIP. Roda sem dependências externas:
 *   npm run verify:scoring
 * Falha (exit 1) se qualquer asserção quebrar — usado no CI.
 */
import {
  applyCareerModifiers,
  applySecretVotePenalty,
  calculateIDIP,
  HARD_CAP,
  WEIGHTS,
  type LegislativeMetrics,
  type ExecutiveMetrics,
} from "../src/lib/scoring";

let failures = 0;

function check(name: string, condition: boolean, detail: string): void {
  if (condition) {
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.error(`  ❌ ${name} — ${detail}`);
  }
}

function approx(a: number, b: number, tol = 0.11): boolean {
  return Math.abs(a - b) <= tol;
}

const cleanLegislative: LegislativeMetrics = {
  integrity: 100, productivity: 85, approval: 70, oversight: 90,
  presence: 95, transparency: 100, costEfficiency: 80, campaign: 90,
  hasFinalCondemnation: false, hasRejectedAccounts: false, dataCompleteness: 95,
};

const condemnedLegislative: LegislativeMetrics = {
  integrity: 80, productivity: 95, approval: 90, oversight: 80,
  presence: 100, transparency: 90, costEfficiency: 85, campaign: 95,
  hasFinalCondemnation: true, hasRejectedAccounts: false, dataCompleteness: 90,
};

const cleanExecutive: ExecutiveMetrics = {
  integrity: 100, fiscalResponsibility: 90, governmentDelivery: 85,
  transparency: 100, costEfficiency: 80, campaign: 95, governance: 88,
  hasFinalCondemnation: false, hasRejectedAccounts: false, dataCompleteness: 92,
};

console.log("Pesos somam 1.0 em ambos os perfis");
for (const [profile, weights] of Object.entries(WEIGHTS)) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  check(profile, approx(sum, 1, 1e-9), `soma = ${sum}`);
}

console.log("\nPolítico limpo (Legislativo)");
{
  const r = calculateIDIP(cleanLegislative);
  // 25 + 15.3 + 10.5 + 9 + 9.5 + 10 + 5.6 + 4.5 = 89.4 (v1.1)
  check("nota = 89.4 (v1.1)", approx(r.finalScore, 89.4), `obtido ${r.finalScore}`);
  check("termômetro GREEN", r.reliability === "GREEN", `obtido ${r.reliability}`);
  check("sem trava", r.hardCapApplied === false, "trava acionada");
  check("confiança = 95", r.confidence === 95, `obtido ${r.confidence}`);
}

console.log("\nPolítico condenado (Legislativo) — trava de integridade");
{
  const r = calculateIDIP(condemnedLegislative);
  check(`nota limitada a ${HARD_CAP}`, r.finalScore === HARD_CAP, `obtido ${r.finalScore}`);
  check("integridade zerada no breakdown", r.breakdown.integrity.rawValue === 0, `obtido ${r.breakdown.integrity.rawValue}`);
  check("termômetro RED", r.reliability === "RED", `obtido ${r.reliability}`);
  check("trava registrada p/ auditoria", r.hardCapApplied === true, "trava não registrada");
}

console.log("\nContas rejeitadas também acionam trava");
{
  const r = calculateIDIP({ ...cleanLegislative, hasRejectedAccounts: true });
  check(`nota limitada a ${HARD_CAP}`, r.finalScore === HARD_CAP, `obtido ${r.finalScore}`);
  check("termômetro RED", r.reliability === "RED", `obtido ${r.reliability}`);
}

console.log("\nDados insuficientes (confiança < 60) — fora do ranking");
{
  const r = calculateIDIP({ ...cleanLegislative, dataCompleteness: 55 });
  check("termômetro GRAY", r.reliability === "GRAY", `obtido ${r.reliability}`);
  check("nota ainda calculada (não fictícia, mas marcada)", approx(r.finalScore, 89.4), `obtido ${r.finalScore}`);
}

console.log("\nZona de atenção (YELLOW)");
{
  const incompleto = calculateIDIP({ ...cleanLegislative, dataCompleteness: 70 });
  check("completude 70 → YELLOW", incompleto.reliability === "YELLOW", `obtido ${incompleto.reliability}`);

  const integridadeBaixa = calculateIDIP({ ...cleanLegislative, integrity: 50 });
  check("integridade 50 → YELLOW", integridadeBaixa.reliability === "YELLOW", `obtido ${integridadeBaixa.reliability}`);
}

console.log("\nPerfil Executivo");
{
  const r = calculateIDIP(cleanExecutive, "EXECUTIVE");
  // 25 + 18 + 17 + 15 + 8 + 4.75 + 4.4 = 92.15
  check("nota ≈ 92.2", approx(r.finalScore, 92.2), `obtido ${r.finalScore}`);
  check("termômetro GREEN", r.reliability === "GREEN", `obtido ${r.reliability}`);
  check("7 dimensões no breakdown", Object.keys(r.breakdown).length === 7, `obtido ${Object.keys(r.breakdown).length}`);

  const condenado = calculateIDIP({ ...cleanExecutive, hasFinalCondemnation: true }, "EXECUTIVE");
  check(`executivo condenado limitado a ${HARD_CAP}`, condenado.finalScore === HARD_CAP, `obtido ${condenado.finalScore}`);
}

console.log("\nValidação de entrada");
{
  let threw = false;
  try {
    calculateIDIP({ ...cleanLegislative, integrity: 150 });
  } catch {
    threw = true;
  }
  check("métrica > 100 rejeitada", threw, "aceitou integrity=150");

  threw = false;
  try {
    calculateIDIP({ ...cleanLegislative, presence: Number.NaN });
  } catch {
    threw = true;
  }
  check("NaN rejeitado", threw, "aceitou presence=NaN");
}


  console.log("\nModificadores de carreira e votos secretos");
{
  const iniciante = applyCareerModifiers(50, true, 0, 10);
  check("iniciante com base 50 fica em 50", iniciante === 50, `obtido ${iniciante}`);

  const inicianteBaixo = applyCareerModifiers(20, true, 0, 0);
  check("iniciante nunca desce abaixo de 35", inicianteBaixo === 35, `obtido ${inicianteBaixo}`);

  const veteranoInocuo = applyCareerModifiers(60, false, 5, 0);
  check("veterano 5 mandatos sem aprovações: -2", veteranoInocuo === 58, `obtido ${veteranoInocuo}`);

  const veteranoProdutivo = applyCareerModifiers(60, false, 5, 3);
  check("veterano com aprovações: sem penalidade", veteranoProdutivo === 60, `obtido ${veteranoProdutivo}`);

  const secreto = applySecretVotePenalty(70, 2, 1);
  check("votos secretos: -5×2 -10×1 = -20", secreto === 50, `obtido ${secreto}`);

  const piso = applySecretVotePenalty(10, 5, 5);
  check("penalidade nunca gera nota negativa", piso === 0, `obtido ${piso}`);
}

if (failures > 0) {
  console.error(`\n❌ ${failures} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("\n✅ Motor IDIP: todas as verificações passaram.");
