/**
 * Data canônica dos snapshots mensais do IDIP.
 *
 * REGRA (corrigida em 2026-10-12): o snapshot é rotulado com o **primeiro dia
 * do mês corrente à meia-noite UTC**.
 *
 * A versão anterior de `snapshot-scores.ts` usava o último dia do mês corrente
 * às 23:59:59 no fuso do executor, o que produzia três defeitos:
 *
 *   1. data ~1 mês no futuro — um snapshot gerado em 1º de outubro já nascia
 *      rotulado como fim de outubro, e /status exibia "novembro de 2026" no
 *      dia 12/10;
 *   2. linha duplicada para o mesmo mês — o GitHub Actions roda em UTC
 *      (gravava 2026-10-31T23:59:59Z) e a execução local em BRT gravava outro
 *      instante (2026-11-01T02:59:59Z) para o mesmo mês de referência;
 *   3. reexecução não idempotente no mesmo dia.
 *
 * O rótulo agora é estável, independente de fuso horário, ordenável e nunca
 * futuro. A unicidade `@@unique([termId, snapshotDate])` garante idempotência
 * para qualquer reexecução dentro do mesmo mês.
 */

/** Primeiro dia do mês corrente à meia-noite UTC. */
export function monthSnapshotDate(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/** Representação AAAA-MM-DD em UTC (logs e comparações). */
export function isoUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
