/**
 * Instrumentação server/edge (Next.js auto-carrega este arquivo).
 *
 * Sentry permanece DORMENTE até que SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN
 * estejam configurados no ambiente (Política de Privacidade §5 — disclosure
 * condicional). A importação é dinâmica: sem DSN, o SDK nem entra no bundle.
 *
 * Para ativar: criar projeto em sentry.io (plataforma Next.js), definir
 * SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN na Vercel e redeployar.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}

export async function onRequestError(...args: unknown[]) {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  (captureRequestError as (...a: unknown[]) => void)(...args);
}
