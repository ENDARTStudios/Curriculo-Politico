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
