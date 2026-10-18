import type { Pontuacoes } from "@/lib/espectro";

/**
 * Afinidade entre o resultado do espectro e a posição declarada dos partidos.
 *
 * ── O problema de honestidade, dito de frente ──────────────────────────────
 * O teste devolve **três eixos** (−100..+100): econômico, sociocultural e
 * diplomático. O banco guarda dos partidos uma classificação **1D**
 * (`Party.position`: ESQUERDA…DIREITA), que é editorial e resume o programa
 * declarado — não é resultado de teste.
 *
 * Casar três eixos com uma escala exige escolher onde a comparação é defensável.
 * Aqui ela é feita **só no eixo econômico**, porque é nele que a classificação
 * esquerda–direita brasileira carrega significado verificável (papel do Estado na
 * economia). Nos eixos sociocultural e diplomático não existe classificação por
 * partido no acervo — inventar uma seria criar dado político sobre pessoas
 * jurídicas reais, que é exatamente o que a plataforma não faz.
 *
 * A interface diz isso com todas as letras. Preferimos uma resposta limitada e
 * verdadeira a uma resposta redonda e inventada.
 */

/**
 * Centro de cada faixa no eixo econômico (igualdade −100 ↔ mercado +100).
 *
 * Os valores são **centros de faixa**, não medidas: `DIREITA` e `ESQUERDA` são
 * adjacentes no eixo porque a escala do banco tem cinco degraus, e atribuir a
 * cada um um ponto exato daria precisão que a classificação não tem.
 */
const CENTRO_ECONOMICO: Record<string, number> = {
  ESQUERDA: -75,
  CENTRO_ESQUERDA: -40,
  CENTRO: 0,
  CENTRO_DIREITA: 40,
  DIREITA: 75,
};

/**
 * Raio de tolerância, em pontos do eixo.
 *
 * 45 é o suficiente para um resultado de −20 alcançar `CENTRO_ESQUERDA` (−40) e
 * `CENTRO` (0) sem alcançar `DIREITA` (+75). Sem tolerância, só um partido por
 * faixa apareceria — e a pergunta do usuário é "quais partidos", no plural.
 */
const TOLERANCIA = 45;

export interface PartidoAcervo {
  acronym: string;
  name: string;
  position: string | null;
  ideology: string | null;
  color: string | null;
  logoUrl: string | null;
}

export interface PartidoAfim extends PartidoAcervo {
  /** Distância no eixo econômico, em pontos. */
  distancia: number;
  /** Posição esperada no eixo, para exibir a base do cálculo. */
  alvoEconomico: number;
}

export interface ResultadoAfinidade {
  /** Partidos dentro da tolerância, do mais próximo ao mais distante. */
  afinados: PartidoAfim[];
  /** Todos os partidos classificados, do mais próximo ao mais distante. */
  ranking: PartidoAfim[];
  /** Posição do usuário no eixo econômico. */
  posicaoUsuario: number;
  /** Partidos sem classificação de posição — não entram no cálculo. */
  semClassificacao: number;
}

export function calcularAfinidade(
  pontuacoes: Pontuacoes,
  partidos: readonly PartidoAcervo[],
): ResultadoAfinidade {
  const posicaoUsuario = pontuacoes.economico;

  const classificados: PartidoAfim[] = [];
  let semClassificacao = 0;

  for (const p of partidos) {
    const alvo = p.position ? CENTRO_ECONOMICO[p.position] : undefined;
    if (alvo === undefined) {
      semClassificacao++;
      continue;
    }
    classificados.push({
      ...p,
      alvoEconomico: alvo,
      distancia: Math.abs(posicaoUsuario - alvo),
    });
  }

  classificados.sort((a, b) => a.distancia - b.distancia);

  return {
    afinados: classificados.filter((p) => p.distancia <= TOLERANCIA),
    ranking: classificados,
    posicaoUsuario,
    semClassificacao,
  };
}

/**
 * Rótulo do eixo para a interface, com o polo em que o usuário caiu.
 *
 * Precisa ser linguagem descritiva: "mais próximo da igualdade" descreve a
 * resposta ao teste; "é de esquerda" seria rótulo político sobre a pessoa.
 */
export function ladoEconomico(posicao: number): "igualdade" | "mercado" | "centro" {
  if (Math.abs(posicao) <= 15) return "centro";
  return posicao < 0 ? "igualdade" : "mercado";
}
