"use client";

/**
 * Instrumentação do browser (Next.js 15.3+ auto-carrega este arquivo).
 * Dormente sem NEXT_PUBLIC_SENTRY_DSN — import dinâmico mantém o SDK fora
 * do bundle principal enquanto não houver DSN configurado.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
  });
}
