import type { ReliabilityStatus } from "@prisma/client";

/**
 * Aparência e leitura dos quatro estados do Termômetro de Confiabilidade.
 *
 * Fonte única: `enum ReliabilityStatus` em `apps/web/prisma/schema.prisma`.
 * Antes desta extração, `Termometro.tsx` e a home mantinham cada um a sua
 * própria cópia do mapa de cores — o que permitia os dois divergirem
 * silenciosamente. Qualquer lugar que precise pintar um estado importa daqui.
 *
 * Regra de marca (ver `.dsh/skills/curriculo-design-system`): verde/âmbar/
 * vermelho existem **apenas** para carregar estado de confiabilidade. Nunca use
 * estas cores como decoração, e nunca use azul/roxo para um estado.
 *
 * A cor nunca é o único portador da informação: cada estado traz emoji **e**
 * rótulo textual, o que mantém a leitura possível para quem não distingue cor
 * (WCAG 1.4.1).
 */
export interface StatusVisual {
  /** Rótulo curto usado em badges e listas. */
  label: string;
  /** Leitura longa, para títulos e explicações. */
  descricao: string;
  emoji: string;
  /** Cor do texto. */
  color: string;
  /** Fundo translúcido. */
  bg: string;
  /** Borda translúcida. */
  border: string;
  /**
   * Cor sólida da barra de proporção. Usa o tom 500 (e não 300) porque a barra
   * é um bloco grande sem texto sobreposto e precisa de presença.
   */
  bar: string;
}

export const STATUS_VISUAL: Record<ReliabilityStatus, StatusVisual> = {
  GREEN: {
    label: "Confiável",
    descricao:
      "Dados completos (>80%), sem condenações ou inelegibilidade, e gastos dentro da mediana.",
    emoji: "🟢",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    bar: "bg-emerald-500",
  },
  YELLOW: {
    label: "Atenção / Risco",
    descricao:
      "Dados incompletos (60–79%), réu em ação penal pública, contas com ressalvas ou gastos atípicos.",
    emoji: "🟡",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    bar: "bg-amber-500",
  },
  RED: {
    label: "Não Confiável",
    descricao:
      "Condenação transitada em julgado, improbidade, contas rejeitadas, cassação ou inelegibilidade.",
    emoji: "🔴",
    color: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    bar: "bg-red-500",
  },
  GRAY: {
    label: "Dados Insuficientes",
    descricao:
      "Confiança abaixo de 60%. O político fica fora do ranking até que os dados sejam completados.",
    emoji: "⚪",
    color: "text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-500/40",
    bar: "bg-slate-500",
  },
};

/**
 * Ordem de exibição dos estados: do melhor para o pior, com o estado sem
 * veredito (GRAY) por último. Não use a ordem do enum — ela é GREEN, YELLOW,
 * RED, GRAY por acaso da declaração, e não por intenção de leitura.
 */
export const STATUS_ORDEM: readonly ReliabilityStatus[] = [
  "GREEN",
  "YELLOW",
  "RED",
  "GRAY",
] as const;

/** Rótulo curto de um estado, sem precisar montar a config inteira. */
export function statusLabel(status: ReliabilityStatus): string {
  return STATUS_VISUAL[status].label;
}
