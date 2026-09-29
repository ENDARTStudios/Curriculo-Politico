import * as Sentry from "@sentry/nextjs";

/**
 * Monitoramento de erros (Sentry) — ATIVO apenas quando SENTRY_DSN está
 * definido no ambiente. Sem DSN, é no-op e o custo é zero.
 * DSN em: https://sentry.io/settings/projects/ → Client Keys (DSN)
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}
