/**
 * Formatação das datas de `ScoreSnapshot`.
 *
 * A data canônica do snapshot é o **primeiro dia do mês à meia-noite UTC**
 * (apps/pipeline/scripts/snapshot-date.ts). Formatar com o fuso local empurra
 * `2026-10-01T00:00:00Z` para 30/09 em qualquer fuso a oeste de Greenwich — era
 * o que fazia /status exibir "setembro de 2026" para o snapshot de outubro.
 * Por isso toda formatação aqui fixa `timeZone: "UTC"`.
 */

/** "outubro de 2026" */
export function mesAnoSnapshot(value: Date | string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "out/2026" */
export function mesCurtoSnapshot(value: Date | string): string {
  return new Date(value)
    .toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })
    .replace(". de ", "/");
}

/** "out." */
export function mesAbrevSnapshot(value: Date | string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    month: "short",
    timeZone: "UTC",
  });
}

/** "01/10/2026" */
export function diaSnapshot(value: Date | string): string {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** "2026-10-01" — chave de agrupamento estável por mês. */
export function chaveDiaSnapshot(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}
