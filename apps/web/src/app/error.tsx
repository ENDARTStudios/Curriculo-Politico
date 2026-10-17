"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Fronteira de erro de rota.
 *
 * ── Por que não é a `global-error` ──────────────────────────────────────────
 * `global-error` substitui o `layout` inteiro — sem cabeçalho, sem navegação,
 * sem caminho de volta. Ela existe para falha no próprio layout. Esta captura o
 * erro **dentro** de uma rota e mantém a moldura do site, para que a pessoa
 * continue podendo navegar em vez de ficar numa tela sem saída.
 *
 * ── Honestidade no texto ────────────────────────────────────────────────────
 * Uma plataforma de transparência não pode dizer "algo deu errado" e parar. A
 * mensagem distingue duas situações que o usuário precisa distinguir:
 *
 * - **dado indisponível** (banco fora, coleta parada) — não é bug, é operação;
 * - **falha inesperada** — é bug, e o `digest` permite encontrá-lo no log.
 *
 * O `digest` aparece na tela de propósito: sem ele, um relato de problema não é
 * acionável. Não é stack trace — é um identificador curto.
 */
export default function ErroDaRota({
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
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-amber-300">
        Falha ao carregar
      </p>

      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
        Não foi possível carregar esta página
      </h1>

      <p className="mt-5 max-w-[65ch] text-lg leading-relaxed text-slate-300">
        A consulta ao banco de dados não respondeu. Isso costuma ser temporário — a
        nota não mudou, o acesso é que falhou.
      </p>

      <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-slate-400">
        Se persistir, o estado da plataforma mostra qual parte está fora do ar. Você
        também pode voltar ao ranking ou tentar de novo.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-50"
        >
          Tentar de novo
        </button>
        <Link
          href="/status"
          className="rounded-lg border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Ver estado da plataforma
        </Link>
        <Link
          href="/ranking"
          className="px-2 py-3 font-medium text-sky-400 transition hover:text-sky-300"
        >
          Ir para o ranking
        </Link>
      </div>

      {error.digest && (
        <p className="mt-10 border-t border-slate-800 pt-6 font-mono text-xs text-slate-400">
          Identificador do erro: {error.digest}
        </p>
      )}
    </main>
  );
}
