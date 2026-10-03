/**
 * Motor de Pontuação do IDIP — Índice de Desempenho e Integridade Pública (v1.0)
 * v1.1: pesos do Legislativo ajustados (Produção 18%, Custo/Benefício 7%)
 * com a chegada de dados reais de CEAP. Metodologia: 02-architecture-design/SCORING_METHODOLOGY.md
 *
 * Princípios:
 * - Sem voto popular: apenas dimensões derivadas de dados públicos auditáveis.
 * - Dados faltantes reduzem a Confiança (dataCompleteness) e o Termômetro (TIC);
 *   nunca geram pontuação fictícia.
 * - Travas de integridade (hard caps) ficam registradas em `hardCapApplied`
 *   para auditoria (ScoreBreakdown).
 */

export type Profile = "LEGISLATIVE" | "EXECUTIVE";

export type Reliability = "GREEN" | "YELLOW" | "RED" | "GRAY";

export interface LegislativeMetrics {
  /** 0–100. Derivado de condenações, inelegibilidades e contas. */
  integrity: number;
  /** 0–100. Proposições apresentadas. */
  productivity: number;
  /** 0–100. Proposições aprovadas. */
  approval: number;
  /** 0–100. Atuação de fiscalização (requerimentos, CPIs, etc.). */
  oversight: number;
  /** 0–100. Presença em sessões e votações. */
  presence: number;
  /** 0–100. Transparência ativa (declaração de bens, rede de dados, etc.). */
  transparency: number;
  /** 0–100. Cota parlamentar vs. produtividade (mediana = referência). */
  costEfficiency: number;
  /** 0–100. Regularidade das contas de campanha. */
  campaign: number;
  hasFinalCondemnation: boolean;
  hasRejectedAccounts: boolean;
  /** 0–100. % dos dados necessários que conseguimos coletar. */
  dataCompleteness: number;
}

export interface ExecutiveMetrics {
  integrity: number;
  /** 0–100. Resultado primário, execução orçamentária, dívida. */
  fiscalResponsibility: number;
  /** 0–100. Entrega de programas e obras prometidos/previstos. */
  governmentDelivery: number;
  transparency: number;
  costEfficiency: number;
  campaign: number;
  /** 0–100. Estabilidade de equipe, adesão no Legislativo, decretações. */
  governance: number;
  hasFinalCondemnation: boolean;
  hasRejectedAccounts: boolean;
  dataCompleteness: number;
}

export interface DimensionBreakdown {
  weight: number;
  rawValue: number;
  weightedValue: number;
}

export interface ScoreResult {
  /** 0–100, uma casa decimal. */
  finalScore: number;
  /** Termômetro de Confiabilidade (TIC). */
  reliability: Reliability;
  /** 0–100 (% de completude dos dados). */
  confidence: number;
  /** true se a trava de integridade (teto 39.9) foi acionada. */
  hardCapApplied: boolean;
  /** Evidence para o ScoreBreakdown (auditoria). */
  breakdown: Record<string, DimensionBreakdown>;
}

/** Pesos do Legislativo — SCORING_METHODOLOGY.md §2 */
export const WEIGHTS: Record<Profile, Record<string, number>> = {
  LEGISLATIVE: {
    integrity: 0.25,
    productivity: 0.18,
    approval: 0.15,
    oversight: 0.1,
    presence: 0.1,
    transparency: 0.1,
    costEfficiency: 0.07,
    campaign: 0.05,
  },
  EXECUTIVE: {
    integrity: 0.25,
    fiscalResponsibility: 0.2,
    governmentDelivery: 0.2,
    transparency: 0.15,
    costEfficiency: 0.1,
    campaign: 0.05,
    governance: 0.05,
  },
};

/** Limite máximo da nota quando há trava de integridade. */
export const HARD_CAP = 39.9;

for (const [profile, weights] of Object.entries(WEIGHTS)) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`Pesos do perfil ${profile} somam ${sum}; devem somar 1.`);
  }
}

function assertMetric(value: number, name: string): void {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 100) {
    throw new Error(`Métrica inválida: ${name}=${value} (esperado número entre 0 e 100).`);
  }
}

/**
 * Calcula o IDIP de um mandato.
 * @param metrics  Dimensões normalizadas 0–100, flags jurídicas e completude dos dados.
 * @param profile  "LEGISLATIVE" (Deputados/Senadores) ou "EXECUTIVE" (Presidente/Governadores).
 */
export function calculateIDIP(
  metrics: LegislativeMetrics | ExecutiveMetrics,
  profile: Profile = "LEGISLATIVE",
): ScoreResult {
  const weights = WEIGHTS[profile];
  const numericMetrics = metrics as unknown as Record<string, number>;

  for (const dim of Object.keys(weights)) {
    assertMetric(numericMetrics[dim], dim);
  }
  assertMetric(numericMetrics.dataCompleteness, "dataCompleteness");

  // 1. Travas de integridade (Hard Caps): Condenação TJ, contas rejeitadas,
  //    impeachment ou inelegibilidade zeram a Integridade (§4).
  let integrityScore = numericMetrics.integrity;
  const hardCapApplied = metrics.hasFinalCondemnation || metrics.hasRejectedAccounts;
  if (hardCapApplied) {
    integrityScore = 0;
  }

  // 2. Nota bruta = soma ponderada das dimensões.
  const breakdown: Record<string, DimensionBreakdown> = {};
  let rawScore = 0;
  for (const [dim, weight] of Object.entries(weights)) {
    const rawValue = dim === "integrity" ? integrityScore : numericMetrics[dim];
    const weightedValue = rawValue * weight;
    breakdown[dim] = { weight, rawValue, weightedValue };
    rawScore += weightedValue;
  }

  // 3. Teto de reprovado para quem tem trava acionada (§4).
  const capped = hardCapApplied ? Math.min(rawScore, HARD_CAP) : rawScore;

  // 4. Termômetro de Confiabilidade (TIC, §5). Ordem de precedência:
  //    GRAY (sem dados) > RED (trava) > YELLOW (atenção) > GREEN.
  let reliability: Reliability;
  if (metrics.dataCompleteness < 60) {
    reliability = "GRAY"; // Dados insuficientes: fora do ranking.
  } else if (hardCapApplied) {
    reliability = "RED";
  } else if (metrics.dataCompleteness < 80 || integrityScore < 60) {
    // v1: gastos atípicos e infidelidade partidária ainda não têm gatilho
    // numérico definido; entram via `integrity`/completude nas próximas versões.
    reliability = "YELLOW";
  } else {
    reliability = "GREEN";
  }

  return {
    finalScore: Math.round(capped * 10) / 10,
    reliability,
    confidence: metrics.dataCompleteness,
    hardCapApplied,
    breakdown,
  };
}

/**
 * Modificadores de Carreira (planejados em /metodologia — FUNÇÃO DISPONÍVEL,
 * ainda não aplicada na nota pública: depende de ficha limpa e transparência
 * de campanha do TSE, fontes pendentes no pipeline).
 *
 * - Iniciantes (primeiro mandato): partem de 35 pontos (20 Ficha Limpa +
 *   15 Transparência de Campanha) e conquistam o restante com dados reais.
 * - Veteranos (mais de 3 mandatos): −1 ponto por mandato consecutivo sem
 *   projetos aprovados (longevidade inócua), limitado a −10.
 */
export function applyCareerModifiers(
  baseScore: number,
  isFirstTerm: boolean,
  previousTerms: number,
  approvedBills: number,
): number {
  let score = baseScore;

  if (isFirstTerm) {
    const base = 35; // 20 Ficha Limpa + 15 Transparência
    const earned = Math.min(65, baseScore - 35);
    score = base + Math.max(0, earned);
  }

  if (previousTerms > 3 && approvedBills === 0) {
    const penalty = Math.min(10, previousTerms - 3);
    score -= penalty;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Penalização por Votos Secretos (planejada em /metodologia — FUNÇÃO
 * DISPONÍVEL; ativa quando o pipeline registrar posicionamento em votação
 * secreta, hoje não coletado pela API da Câmara).
 *
 * - −5 pontos por voto secreto em pauta de alto interesse público
 * - −10 pontos por recusa pública em abrir voto quando o regimento permite
 */
export function applySecretVotePenalty(
  score: number,
  secretVotesCount: number,
  publicRefusalsCount: number,
): number {
  const penalty = secretVotesCount * 5 + publicRefusalsCount * 10;
  return Math.max(0, score - penalty);
}

/**
 * Dimensão Custo/Benefício (v1.1): razão entre produtividade e custo anual
 * relativo à média da categoria (R$ 1.2M/ano para parlamentar federal).
 * PATRIMONY não entra no custo anual (patrimônio não é gasto público).
 */
export function applyCostEfficiency(
  annualCost: number,
  productivityScore: number,
  averageCost = 1200000,
): number {
  const costRatio = Math.max(annualCost, 0) / averageCost;
  if (costRatio <= 0) return 50; // sem dado de custo: baseline neutro
  const efficiency = productivityScore / (costRatio * 100);
  return Math.min(100, Math.max(0, efficiency * 100));
}
