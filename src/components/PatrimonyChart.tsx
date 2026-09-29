"use client";

import type { PatrimonyHistory } from "@prisma/client";

interface PatrimonyChartProps {
  history: PatrimonyHistory[];
}

const formatBRL = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toFixed(2)}M`
    : v >= 1000
      ? `R$ ${(v / 1000).toFixed(0)}k`
      : `R$ ${v.toFixed(0)}`;

export function PatrimonyChart({ history }: PatrimonyChartProps) {
  if (history.length === 0) return null;

  const ordered = [...history].sort((a, b) => a.electionYear - b.electionYear);

  const maxValor = Math.max(...ordered.map((h) => h.declaredValue));
  const minValor = Math.min(...ordered.map((h) => h.declaredValue));
  const variacao =
    ordered.length > 1 && ordered[0].declaredValue > 0
      ? ((ordered[ordered.length - 1].declaredValue - ordered[0].declaredValue) /
          ordered[0].declaredValue) *
        100
      : 0;

  const chartHeight = 200;
  const chartWidth = Math.max(ordered.length * 80, 400);
  const plotWidth = chartWidth - 50;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-100">💎 Evolução Patrimonial</h2>
        <div className="flex gap-4 text-xs">
          {ordered.length > 1 && (
            <div className="text-center">
              <div className="text-slate-500">Variação total</div>
              <div
                className={`font-bold ${
                  variacao > 10
                    ? "text-red-300"
                    : variacao < -10
                      ? "text-emerald-300"
                      : "text-slate-200"
                }`}
              >
                {variacao > 0 ? "+" : ""}
                {variacao.toFixed(1)}%
              </div>
            </div>
          )}
          <div className="text-center">
            <div className="text-slate-500">Mais recente</div>
            <div className="font-bold text-slate-200">
              {formatBRL(ordered[ordered.length - 1].declaredValue)}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + 40} className="min-w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const valor = minValor + pct * (maxValor - minValor);
            const y = chartHeight - pct * chartHeight;
            return (
              <g key={pct}>
                <line
                  x1={50}
                  y1={y}
                  x2={chartWidth - 5}
                  y2={y}
                  className="stroke-slate-800"
                  strokeWidth={1}
                />
                <text
                  x={45}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px]"
                >
                  {formatBRL(valor)}
                </text>
              </g>
            );
          })}

          <path
            d={ordered
              .map((h, i) => {
                const x = 50 + i * (plotWidth / (ordered.length - 1 || 1));
                const pct = (h.declaredValue - minValor) / (maxValor - minValor || 1);
                const y = chartHeight - pct * chartHeight;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            className="stroke-purple-400"
            strokeWidth={2}
          />

          {ordered.map((h, i) => {
            const x = 50 + i * (plotWidth / (ordered.length - 1 || 1));
            const pct = (h.declaredValue - minValor) / (maxValor - minValor || 1);
            const y = chartHeight - pct * chartHeight;
            return (
              <g key={h.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={5}
                  fill="#a855f7"
                  stroke="#020617"
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px] font-semibold"
                >
                  {h.electionYear}
                </text>
                <title>
                  {h.electionYear}: {formatBRL(h.declaredValue)} ({h.assetCount} bens)
                </title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-4 text-xs md:grid-cols-4">
        {ordered.slice(-4).map((h) => (
          <div key={h.id} className="rounded bg-slate-800/60 p-2">
            <div className="font-semibold text-slate-200">{h.electionYear}</div>
            <div className="text-slate-400">{formatBRL(h.declaredValue)}</div>
            <div className="text-slate-500">{h.assetCount} bens</div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs italic leading-relaxed text-slate-500">
        Valores declarados ao TSE em cada eleição disputada. Não inclui bens não
        declarados nem transferências entre pleitos. Fonte:
        dadosabertos.tse.jus.br
      </p>
    </div>
  );
}
