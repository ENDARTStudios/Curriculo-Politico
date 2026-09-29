"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReliabilityStatus } from "@prisma/client";

export interface PartyComparavel {
  id: string;
  acronym: string;
  name: string;
  memberCount: number;
  avgScore: number | null;
  avgConfidence: number;
  distribution: Record<ReliabilityStatus, number>;
}

const MAX_SELECAO = 4;

const BARRA = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-500",
  RED: "bg-red-500",
  GRAY: "bg-slate-600",
} as const;

const EMOJI = { GREEN: "🟢", YELLOW: "🟡", RED: "🔴", GRAY: "⚪" } as const;

export function ComparacaoPartidos({ parties }: { parties: PartyComparavel[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id].slice(-MAX_SELECAO),
    );
  };

  const selecionados = parties.filter((p) => selected.includes(p.id));

  return (
    <div>
      {/* Seleção */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">
          Selecionar partidos ({selected.length}/{MAX_SELECAO})
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {parties.map((p) => {
            const isSel = selected.includes(p.id);
            const bloqueado = !isSel && selected.length >= MAX_SELECAO;
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={bloqueado}
                className={`rounded-lg border p-3 text-left transition ${
                  isSel
                    ? "border-sky-500 bg-sky-500/10"
                    : bloqueado
                      ? "cursor-not-allowed border-slate-800 opacity-40"
                      : "border-slate-700 hover:border-sky-500/50"
                }`}
              >
                <div className="text-lg font-bold text-slate-100">{p.acronym}</div>
                <div className="truncate text-xs text-slate-500">
                  {p.memberCount} parl. ·{" "}
                  {p.avgScore !== null ? p.avgScore.toFixed(1) : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparação */}
      {selecionados.length >= 2 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {selecionados.map((party) => {
            const total =
              party.distribution.GREEN +
              party.distribution.YELLOW +
              party.distribution.RED +
              party.distribution.GRAY;
            const pct = (n: number) => (total ? (n / total) * 100 : 0);

            return (
              <div key={party.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="mb-4">
                  <Link
                    href={`/partidos/${encodeURIComponent(party.acronym)}`}
                    className="text-3xl font-bold text-slate-100 hover:underline"
                  >
                    {party.acronym}
                  </Link>
                  <div className="mt-1 truncate text-sm text-slate-500">{party.name}</div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-slate-100">
                      {party.avgScore !== null ? party.avgScore.toFixed(1) : "—"}
                    </div>
                    <div className="text-xs text-slate-500">Nota média (ranqueados)</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-100">{party.memberCount}</div>
                    <div className="text-xs text-slate-500">Parlamentares</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="mb-2 text-sm font-semibold text-slate-300">
                    Distribuição de status
                  </div>
                  <div className="flex h-4 overflow-hidden rounded-full">
                    {(Object.keys(BARRA) as Array<ReliabilityStatus>)
                      .filter((k) => party.distribution[k] > 0)
                      .map((k) => (
                        <div
                          key={k}
                          className={BARRA[k]}
                          style={{ width: `${pct(party.distribution[k])}%` }}
                          title={`${EMOJI[k]} ${party.distribution[k]}`}
                        />
                      ))}
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>🟢 {party.distribution.GREEN}</span>
                    <span>🟡 {party.distribution.YELLOW}</span>
                    <span>🔴 {party.distribution.RED}</span>
                    <span>⚪ {party.distribution.GRAY}</span>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-400">Confiança média</span>
                    <span className="font-semibold text-slate-200">
                      {party.avgConfidence.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${Math.min(100, party.avgConfidence)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <p className="text-slate-400">Selecione pelo menos 2 partidos para comparar.</p>
        </div>
      )}
    </div>
  );
}
