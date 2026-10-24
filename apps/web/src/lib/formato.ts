/**
 * Formatação numérica em pt-BR.
 *
 * ── O problema que isto corrige ─────────────────────────────────────────────
 * O app exibia `70.0` — ponto decimal, convenção de `en-US` — em toda a
 * interface. Numa plataforma brasileira de transparência isso não é detalhe
 * cosmético: quem lê `70.0` em português tende a ler "setenta", sem decimais, e
 * a nota parece inteira. O número é o produto; a leitura dele precisa ser
 * inequívoca.
 *
 * A identidade visual usa `70,0` desde o primeiro artboard. O código ficou para
 * trás, e este módulo fecha a distância.
 *
 * ── Por que um módulo, e não `toFixed` em cada tela ────────────────────────
 * `toFixed` não sabe de locale, e cada chamada decidia sozinha quantas casas
 * mostrar. Concentrar aqui garante que duas telas nunca discordem sobre como o
 * mesmo número aparece — que é como a divergência entre gráfico e Termômetro
 * começou.
 */

const NOTA = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const INTEIRO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Traço usado quando não há valor. Nunca `0` no lugar de "sem dado". */
export const SEM_VALOR = "—";

/**
 * Nota do IDIP com uma casa decimal: `70,0`.
 *
 * Devolve `—` para `null`/`undefined`/`NaN` em vez de `0,0`. A distinção importa:
 * nota zero é um resultado, ausência de nota é outro, e o projeto já trava a
 * publicação de nota com confiança baixa justamente para não confundir os dois.
 */
export function formatarNota(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return SEM_VALOR;
  return NOTA.format(valor);
}

/** Percentual sem casas: `95%`. */
export function formatarPercentual(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return SEM_VALOR;
  return `${INTEIRO.format(valor)}%`;
}

/** Número inteiro com separador de milhar: `31.815`. */
export function formatarInteiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return SEM_VALOR;
  return INTEIRO.format(valor);
}

/**
 * Decimal genérico, com a quantidade de casas pedida: `12,5` ou `3,42`.
 *
 * Existe porque havia telas formatando média de presença e variação patrimonial
 * com `toFixed(1)` — que devolve `12.5`, com ponto. `formatarNota` não serve
 * nesses casos: o nome diz "nota", e usar o formatador de nota para uma
 * variação de patrimônio mente sobre o que o número é.
 *
 * Casas negativas ou não finitas caem em 0, para nunca produzir `NaN` na tela.
 */
export function formatarDecimal(
  valor: number | null | undefined,
  casas = 1,
): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return SEM_VALOR;
  const n = Math.max(0, Math.min(6, Math.trunc(casas)));
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: n,
    maximumFractionDigits: n,
  }).format(valor);
}

/**
 * Valor monetário compacto em pt-BR, para eixos de gráfico: `R$ 1,5 mi`.
 *
 * ── Por que não `Intl` com `style: "currency"` ─────────────────────────────
 * Num eixo de gráfico, `R$ 1.500.000,00` não cabe e não ajuda: o leitor quer a
 * ordem de grandeza. Mas o sufixo também precisa ser português — a versão
 * anterior escrevia `R$ 1.50M`, com ponto decimal e sufixo inglês, num eixo que
 * o visitante brasileiro lê como "um real e cinquenta".
 *
 * `entrada` é o valor em reais.
 */
export function formatarMoedaCompacta(entrada: number | null | undefined): string {
  if (entrada === null || entrada === undefined || Number.isNaN(entrada)) return SEM_VALOR;
  const v = Math.abs(entrada);
  const sinal = entrada < 0 ? "-" : "";

  if (v >= 1_000_000) return `${sinal}R$ ${formatarDecimal(v / 1_000_000, 1)} mi`;
  if (v >= 1_000) return `${sinal}R$ ${formatarDecimal(v / 1_000, 0)} mil`;
  return `${sinal}R$ ${formatarDecimal(v, 0)}`;
}
