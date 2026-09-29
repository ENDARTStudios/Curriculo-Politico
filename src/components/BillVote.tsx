"use client";

import { useEffect, useState } from "react";

interface BillVoteProps {
  billId: string;
}

/**
 * Votação popular em projetos — camada de engajamento pessoal, separada
 * do IDIP (Neutralidade Algorítmica). Contagens são públicas; o voto
 * pessoal abre com a autenticação (Fase 4).
 */
export function BillVote({ billId }: BillVoteProps) {
  const [counts, setCounts] = useState<{ favor: number; contra: number } | null>(null);

  useEffect(() => {
    fetch(`/api/bills/${billId}/vote`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCounts({ favor: data.favor, contra: data.contra });
      })
      .catch(() => setCounts(null));
  }, [billId]);

  const total = counts ? counts.favor + counts.contra : 0;
  const favorPct = total ? (counts!.favor / total) * 100 : 50;
  const contraPct = total ? (counts!.contra / total) * 100 : 50;

  return (
    <div className="my-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-slate-100">Votação Popular</h4>
        <span className="text-xs text-slate-500">{total} votos</span>
      </div>

      {/* Barra de progresso */}
      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="bg-emerald-500 transition-all" style={{ width: `${favorPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${contraPct}%` }} />
      </div>

      <div className="mb-4 flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-slate-400">
            A Favor: {counts?.favor ?? 0} ({favorPct.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-slate-400">
            Contra: {counts?.contra ?? 0} ({contraPct.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Botões de voto — abrem com a autenticação (Fase 4) */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled
          className="flex-1 cursor-not-allowed rounded-lg bg-slate-700 px-4 py-2 font-semibold text-slate-400 opacity-70"
        >
          👍 A Favor
        </button>
        <button
          type="button"
          disabled
          className="flex-1 cursor-not-allowed rounded-lg bg-slate-700 px-4 py-2 font-semibold text-slate-400 opacity-70"
        >
          👎 Contra
        </button>
      </div>
      <p className="mt-3 text-xs italic leading-relaxed text-slate-500">
        A votação pessoal abre com a autenticação de usuários (Fase 4 do
        roadmap) — um voto por projeto por usuário, alterável, com proteção
        anti-bot (contas com menos de 24h não votam).{" "}
        <strong className="text-slate-400">
          Esta votação não altera a nota IDIP do autor.
        </strong>
      </p>
    </div>
  );
}
