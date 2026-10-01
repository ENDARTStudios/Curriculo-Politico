"use client";

import { useEffect } from "react";

/**
 * Fronteira de erro global — captura falhas de render no cliente e as envia
 * ao Sentry (quando ativo) antes de oferecer recuperação ao usuário.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-100">
            Algo deu errado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Ocorreu um erro inesperado. Ele já foi registrado (quando o
            monitoramento está ativo) e nossa equipe será notificada.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-sky-500 px-6 py-2 font-medium text-slate-950 transition hover:bg-sky-400"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
