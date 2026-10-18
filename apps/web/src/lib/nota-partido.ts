/**
 * Nota do partido, com a honestidade que a plataforma exige.
 *
 * ── O defeito que este arquivo corrige ────────────────────────────────────
 * A nota era calculada assim:
 *
 *     partyScore = médiaDosParlamentares * 0.7 + 50 * 0.2 + 50 * 0.1
 *
 * Ou seja: **30% do número publicado era a constante 50**. O componente de
 * detalhamento rotulava esses dois fatores como "placeholder (50) até integração
 * TSE" — mas o número grande, no topo da página e na coluna "Nota do Partido" da
 * lista, aparecia como se fosse integralmente medido.
 *
 * A regra de produto nº 3 do projeto é explícita: *nenhum número exibido sem
 * consulta real ao banco*. Um composto de 70% de dado com 30% de constante não é
 * uma medida: é uma medida disfarçada de medida.
 *
 * ── A regra agora ─────────────────────────────────────────────────────────
 * O composto só é publicado quando **todos** os componentes existem. Enquanto
 * transparência e conformidade não têm fonte, a nota do partido é a média real
 * dos parlamentares — um número menor em escopo, mas inteiro em verdade — e a
 * interface diz que a nota composta está pendente de integração.
 *
 * Preferimos um número que se explica a um número que impressiona.
 */

export interface EntradaNotaPartido {
  /** Média das notas dos parlamentares do partido (real). */
  mediaParlamentares: number | null;
  /** Componente de transparência partidária. `null` = sem fonte ainda. */
  transparencia: number | null;
  /** Componente de conformidade partidária. `null` = sem fonte ainda. */
  conformidade: number | null;
}

export interface NotaPartido {
  /** O número publicável — sempre integralmente medido. */
  valor: number | null;
  /**
   * `true` quando o composto de três componentes pôde ser calculado.
   * `false` significa que o valor é a média dos parlamentares, e a interface
   * precisa dizer isso.
   */
  completa: boolean;
  /** Quais componentes faltam, para a mensagem na tela. */
  faltando: ("transparencia" | "conformidade")[];
}

const PESO_PARLAMENTARES = 0.7;
const PESO_TRANSPARENCIA = 0.2;
const PESO_CONFORMIDADE = 0.1;

export function notaPartido({ mediaParlamentares, transparencia, conformidade }: EntradaNotaPartido): NotaPartido {
  const faltando: ("transparencia" | "conformidade")[] = [];
  if (transparencia === null) faltando.push("transparencia");
  if (conformidade === null) faltando.push("conformidade");

  if (mediaParlamentares === null) {
    return { valor: null, completa: false, faltando };
  }

  // Todos presentes: o composto da metodologia vale.
  if (faltando.length === 0) {
    return {
      valor:
        mediaParlamentares * PESO_PARLAMENTARES +
        transparencia! * PESO_TRANSPARENCIA +
        conformidade! * PESO_CONFORMIDADE,
      completa: true,
      faltando: [],
    };
  }

  // Falta componente: publicamos só o que é medido.
  return { valor: mediaParlamentares, completa: false, faltando };
}
