"use client";

import { mesCurtoSnapshot } from "@/lib/snapshot";
import { formatarNota } from "@/lib/formato";

export interface SnapshotPoint {
  date: string;
  avgScore: number;
  memberCount: number;
}

export function PartyPerformanceChart({
  snapshots,
  partyColor,
}: {
  snapshots: SnapshotPoint[];
  partyColor: string;
}) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-100">
          Evolução da Nota Média
        </h2>
        <p className="text-sm text-slate-400">
          Histórico ainda insuficiente. Os snapshots são coletados mensalmente
          (rastreamento temporal).
        </p>
      </div>
    );
  }

  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const chartHeight = 200;
  const chartWidth = Math.max(ordered.length * 80, 400);
  const plotWidth = chartWidth - 50;
  const cor = partyColor || "#0ea5e9";
  const fmt = (d: string | Date) => mesCurtoSnapshot(d);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-4 text-xl font-bold text-slate-100">
        Evolução da Nota Média do Partido
      </h2>
      <div className="overflow-x-auto" role="region" aria-label="Gráfico da evolução da nota média" tabIndex={0}>
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
                const y = chartHeight - (s.avgScore / 100) * chartHeight;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            stroke={cor}
            strokeWidth={2}
          />

          {ordered.map((s, i) => {
            const x = 50 + i * (plotWidth / (ordered.length - 1 || 1));
            const y = chartHeight - (s.avgScore / 100) * chartHeight;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={4} fill={cor} />
                <text
                  x={x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px]"
                >
                  {fmt(s.date)}
                </text>
                {/*
                  Um só string: `<title>` de SVG com vários filhos faz o React
                  avisar e produz nome acessível instável. Alguns leitores de
                  tela leem apenas o primeiro nó, então o valor da média se
                  perdia justamente para quem depende do texto.
                */}
                <title>{`${fmt(s.date)}: média ${formatarNota(s.avgScore)} (${s.memberCount} membros ranqueados)`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
