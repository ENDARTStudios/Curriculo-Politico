/**
 * Motor de Resolução de Identidade — cruza parlamentares (Câmara/Senado)
 * com candidatos do TSE, em 3 estágios:
 *   1. Nome de urna exato + UF + cargo          → HIGH
 *      (partido divergente não invalida: troca de partido é comum)
 *   2. Nome similar (≥0.85) + UF + cargo        → MEDIUM
 *   3. Sem match (suplente, eleito em outro ano, ou dado inconsistente) → NONE
 *
 * Puramente funcional para ser auditável e testável (scripts/verify-identity.ts).
 */

export interface TSECandidate {
  tse_id: string;
  ano: number;
  nome_urna: string;
  nome_civil: string;
  partido_sigla: string;
  uf: string;
  cargo: string; // "DEPUTADO FEDERAL" | "SENADOR"
  ano_nascimento: number | null;
  situacao?: string;
}

export type MatchConfidence = "HIGH" | "MEDIUM" | "NONE";

export interface MatchResult {
  candidate: TSECandidate | null;
  confidence: MatchConfidence;
  reason: string;
}

const SUFFIXES = new Set(["jr", "júnior", "filho", "neto", "sobrinho"]);

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !SUFFIXES.has(t))
    .join(" ");
}

/** Levenshtein clássico (distância de edição). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Similaridade de nomes normalizados (0–1):
 * - token containment captura "Fausto Pinato" ⊂ "Fausto Pinato da Silva";
 * - Jaccard captura reordenação de tokens;
 * - Levenshtein captura grafias próximas (" Russomanno"/"Rossomanno").
 * Containment só vale com ≥2 tokens no nome menor (evita "Silva" ≈ qualquer um).
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const intersection = [...ta].filter((t) => tb.has(t)).length;

  let containment = 0;
  const minTokens = Math.min(ta.size, tb.size);
  if (minTokens > 0) {
    containment = intersection / minTokens;
    if (minTokens < 2) containment = Math.min(containment, 0.5);
  }

  const union = new Set([...ta, ...tb]).size;
  const jaccard = union ? intersection / union : 0;

  const lev =
    1 - levenshtein(na, nb) / Math.max(na.length, nb.length);

  return Math.max(containment, jaccard, lev);
}

export interface MatchInput {
  politicalName: string;
  uf: string | null | undefined;
  partyAcronym: string | null | undefined;
  /** Cargo normalizado: "DEPUTADO FEDERAL" | "SENADOR" */
  cargo: string;
}

/** "ELEITO", "ELEITO POR QP", "ELEITO POR MÉDIA" → true; "NÃO ELEITO"/"#NULO#"/"SUPLENTE" → false. */
function foiEleito(c: TSECandidate): boolean {
  return (c.situacao ?? "").toUpperCase().startsWith("ELEITO");
}

function tokens(name: string): Set<string> {
  return new Set(normalizeName(name).split(" ").filter(Boolean));
}

/**
 * Resolve o match do parlamentar contra a base de candidatos do TSE.
 * Os estágios exigem UF + cargo: homônimos só existem em circunscrições
 * distintas ou em cargos distintos.
 */
export function resolveMatch(
  input: MatchInput,
  candidates: TSECandidate[],
): MatchResult {
  const nomeNorm = normalizeName(input.politicalName);
  const uf = (input.uf ?? "").toUpperCase();
  const pool = candidates.filter(
    (c) => c.uf.toUpperCase() === uf && c.cargo === input.cargo,
  );

  // Estágio 1 — exato: nome de urna + UF + cargo.
  const exatos = pool.filter((c) => normalizeName(c.nome_urna) === nomeNorm);
  if (exatos.length === 1) {
    const c = exatos[0];
    const mesmoPartido =
      input.partyAcronym && c.partido_sigla === input.partyAcronym;
    return {
      candidate: c,
      confidence: "HIGH",
      reason: mesmoPartido
        ? "Nome + UF + cargo exatos"
        : "Nome + UF + cargo exatos (partido divergente da eleição)",
    };
  }
  if (exatos.length > 1) {
    // O mesmo político aparece em várias eleições (elegeu-se em 2018 e 2022).
    // O mandato ATUAL vem do registro mais recente E eleito.
    const maisRecente = Math.max(...exatos.map((c) => c.ano));
    const eleitosRecentes = exatos.filter((c) => c.ano === maisRecente && foiEleito(c));
    if (eleitosRecentes.length === 1) {
      return {
        candidate: eleitosRecentes[0],
        confidence: "HIGH",
        reason: `Nome exato — reeleito: registro TSE/${maisRecente}`,
      };
    }
    const comPartido = eleitosRecentes.filter(
      (c) => input.partyAcronym && c.partido_sigla === input.partyAcronym,
    );
    if (comPartido.length === 1) {
      return {
        candidate: comPartido[0],
        confidence: "HIGH",
        reason: `Nome + partido exatos (homônimos desempatados, TSE/${maisRecente})`,
      };
    }
    return {
      candidate: null,
      confidence: "NONE",
      reason: `Ambíguo: ${exatos.length} registros exatos sem desempate`,
    };
  }

  // Estágio 2 — contenção de tokens corroborada por partido: cobre nomes de
  // urna curtos ("FRAGA" para Alberto Fraga, "CAMILO" para Camilo Santana).
  const nomeTokens = tokens(input.politicalName);
  const contidos = pool.filter((c) => {
    const ct = tokens(c.nome_urna);
    if (ct.size === 0 || nomeTokens.size === 0) return false;
    const urnaDentroPolitico = [...ct].every((t) => nomeTokens.has(t));
    const politicoDentroUrna = [...nomeTokens].every((t) => ct.has(t));
    return urnaDentroPolitico || politicoDentroUrna;
  });
  if (contidos.length > 0) {
    const comPartido = contidos.filter(
      (c) => input.partyAcronym && c.partido_sigla === input.partyAcronym,
    );
    const alvo = (lista: TSECandidate[]) => {
      const eleitos = lista.filter(foiEleito);
      const base = eleitos.length > 0 ? eleitos : lista;
      const maisRecente = Math.max(...base.map((c) => c.ano));
      return base.filter((c) => c.ano === maisRecente);
    };
    if (comPartido.length > 0) {
      const finais = alvo(comPartido);
      if (finais.length === 1) {
        return {
          candidate: finais[0],
          confidence: "HIGH",
          reason: `Nome contido + partido (${finais[0].nome_urna}, TSE/${finais[0].ano})`,
        };
      }
    }
    const semPartido = alvo(contidos);
    if (semPartido.length === 1 && comPartido.length === 0) {
      return {
        candidate: semPartido[0],
        confidence: "MEDIUM",
        reason: `Contenção de nome, partido divergente (${semPartido[0].nome_urna}) — revisar`,
      };
    }
  }

  // Estágio 3 — fuzzy: similaridade ≥ 0.85 dentro de UF + cargo
  // ("DELEGADO ALESSANDRO VIEIRA" ≈ "Alessandro Vieira").
  const fuzzy = pool
    .map((c) => ({ c, sim: nameSimilarity(c.nome_urna, input.politicalName) }))
    .filter((m) => m.sim >= 0.85)
    .sort((a, b) => b.sim - a.sim);
  if (fuzzy.length >= 1 && (fuzzy.length === 1 || fuzzy[0].sim > fuzzy[1].sim)) {
    return {
      candidate: fuzzy[0].c,
      confidence: "MEDIUM",
      reason: `Similaridade ${(fuzzy[0].sim * 100).toFixed(1)}% (${fuzzy[0].c.nome_urna})`,
    };
  }
  if (fuzzy.length > 1) {
    return {
      candidate: null,
      confidence: "NONE",
      reason: `Ambíguo: ${fuzzy.length} candidatos com similaridade empatada`,
    };
  }

  return {
    candidate: null,
    confidence: "NONE",
    reason: "Sem candidato com nome/UF/cargo compatíveis",
  };
}
