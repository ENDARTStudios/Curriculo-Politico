"use client";

import * as Sentry from "@sentry/nextjs";

/** Instrumentação do cliente — ativa apenas com SENTRY_DSN definido. */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}
