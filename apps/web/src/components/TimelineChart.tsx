"use client";

import type { ScoreSnapshot } from "@prisma/client";

interface TimelineChartProps {
  snapshots: ScoreSnapshot[];
}

export function TimelineChart({ snapshots }: TimelineChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-100">
          Evolução Histórica
        </h2>
        <p className="text-sm text-slate-500">
          Sem histórico suficiente para exibir o gráfico. Os snapshots são
          coletados mensalmente (rastreamento temporal —{" "}
          <a href="/metodologia" className="text-sky-400 hover:underline">
            /metodologia
          </a>
          ).
        </p>
      </div>
    );
  }

  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime(),
  );

  const melhor = ordered.reduce((max, s) => (s.finalScore > max.finalScore ? s : max), ordered[0]);
  const pior = ordered.reduce((min, s) => (s.finalScore < min.finalScore ? s : min), ordered[0]);

  const chartHeight = 200;
  const chartWidth = Math.max(ordered.length * 60, 420);
  const plotWidth = chartWidth - 50;
  const fmtMes = (d: Date) =>
    d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(". de ", "/");

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-100">Evolução Histórica</h2>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-300">
            🏆 {fmtMes(new Date(melhor.snapshotDate))} — {melhor.finalScore.toFixed(1)}
          </span>
          {pior.id !== melhor.id && (
            <span className="flex items-center gap-1 text-red-300">
              ⚠️ {fmtMes(new Date(pior.snapshotDate))} — {pior.finalScore.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + 40} className="min-w-full">
          {[0, 25, 50, 75, 100].map((y) => (
            <g key={y}>
              <line
                x1={45}
                y1={chartHeight - (y / 100) * chartHeight}
                x2={chartWidth - 5}
                y2={chartHeight - (y / 100) * chartHeight}
                className="stroke-slate-800"
                strokeWidth={1}
              />
              <text
                x={38}
                y={chartHeight - (y / 100) * chartHeight + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px]"
              >
                {y}
              </text>
            </g>
          ))}

          <path
            d={ordered
              .map((s, i) => {
                const x = 50 + i * (plotWidth / (ordered.length - 1 || 1));
                const y = chartHeight - (s.finalScore / 100) * chartHeight;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            className="stroke-sky-500"
            strokeWidth={2}
          />

          {ordered.map((s, i) => {
            const x = 50 + i * (plotWidth / (ordered.length - 1 || 1));
            const y = chartHeight - (s.finalScore / 100) * chartHeight;
            const isMelhor = s.id === melhor.id;
            const isPior = s.id === pior.id;
            return (
              <g key={s.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={isMelhor || isPior ? 6 : 4}
                  fill={isMelhor ? "#10b981" : isPior ? "#ef4444" : "#0ea5e9"}
                />
                <text
                  x={x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px]"
                >
                  {new Date(s.snapshotDate).toLocaleDateString("pt-BR", { month: "short" })}
                </text>
                <title>
                  {new Date(s.snapshotDate).toLocaleDateString("pt-BR")}:{" "}
                  {s.finalScore.toFixed(1)} (confiança {s.confidenceScore.toFixed(0)}%)
                </title>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-4 text-xs italic text-slate-500">
        Snapshots mensais do IDIP. Quedas bruscas podem indicar eventos
        jurídicos ou mudança de padrão de votações.
      </p>
    </div>
  );
}
