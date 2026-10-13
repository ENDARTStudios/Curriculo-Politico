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
} from "@cp/idip";

/**
 * Módulo de metodologia exibido na UI. Importado por caminho relativo de
 * propósito: `apps/pipeline` não depende de `@cp/web` (que é uma aplicação
 * Next, não uma biblioteca), e adicionar essa dependência só para ler uma
 * constante inverteria a direção correta entre app e pipeline.
 */
import {
  DIMENSOES as DIMENSOES_WEB,
  METODOLOGIA_VERSAO as METODOLOGIA_VERSAO_WEB,
} from "../../web/src/lib/methodology";

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

/**
 * WEB-001 — sincronia entre a metodologia exibida na UI e o motor.
 *
 * A home renderiza os pesos a partir de `apps/web/src/lib/methodology.ts`, e não
 * de `WEIGHTS`: `@cp/idip` publica apenas TypeScript não compilado, e importá-lo
 * no build do Next exigiria `transpilePackages`. Essa cópia só é aceitável
 * enquanto houver um teste que a mantenha honesta — sem isto, a UI volta a
 * divergir do motor em silêncio.
 *
 * Já aconteceu: a home exibia "IDIP v1.0" com Produção 20% e Custo/Benefício 5%
 * enquanto o motor rodava v1.1 (18% e 7%). Numa plataforma cujo diferencial é
 * "algoritmos abertos", isso é o defeito mais caro possível.
 *
 * O teste importa o módulo real, então também garante que ele continua
 * carregável (um erro de sintaxe ali quebra o CI aqui antes de quebrar o build).
 */
console.log("\nSincronia UI ↔ motor (WEB-001)");
{
  const perfis = [
    { nome: "LEGISLATIVE", web: DIMENSOES_WEB.LEGISLATIVE },
    { nome: "EXECUTIVE", web: DIMENSOES_WEB.EXECUTIVE },
  ] as const;

  for (const { nome, web } of perfis) {
    const motor = WEIGHTS[nome as keyof typeof WEIGHTS] as Record<string, number>;

    for (const dimensao of web) {
      const esperado = Math.round(motor[dimensao.key] * 100);
      check(
        `${nome}.${dimensao.key} = ${esperado}%`,
        dimensao.percent === esperado,
        `UI exibe ${dimensao.percent}% e o motor usa ${esperado}%`,
      );
    }

    // Nenhuma dimensão do motor pode ficar sem representação na UI: uma
    // dimensão omitida faria os pesos exibidos não fecharem em 100%.
    const chavesMotor = Object.keys(motor).sort();
    const chavesWeb = web.map((d) => d.key).sort();
    check(
      `${nome}: UI cobre todas as ${chavesMotor.length} dimensões do motor`,
      chavesMotor.join(",") === chavesWeb.join(","),
      `motor [${chavesMotor.join(", ")}] × UI [${chavesWeb.join(", ")}]`,
    );

    const somaUI = web.reduce((total, d) => total + d.percent, 0);
    check(`${nome}: pesos exibidos somam 100%`, somaUI === 100, `soma ${somaUI}%`);
  }

  check(
    "versão exibida é 1.1",
    METODOLOGIA_VERSAO_WEB === "1.1",
    `obtido ${METODOLOGIA_VERSAO_WEB}`,
  );
}

if (failures > 0) {
  console.error(`\n❌ ${failures} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("\n✅ Motor IDIP: todas as verificações passaram.");
