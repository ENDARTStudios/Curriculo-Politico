import type { Score } from "@prisma/client";

export function ScoreBreakdown({ score }: { score: Score }) {
  const dims = [
    { label: "Integridade", value: score.integrityScore },
    { label: "Produção", value: score.productivityScore },
    { label: "Transparência", value: score.transparencyScore },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-1 text-xl font-bold text-slate-100">
        Composição da Nota (IDIP)
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Eixos principais — versão {score.version}
      </p>
      <div className="space-y-4">
        {dims.map((d) => (
          <div key={d.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-slate-400">{d.label}</span>
              <span className="font-semibold text-slate-200">
                {d.value.toFixed(1)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-sky-500 transition-all"
                style={{ width: `${Math.min(Math.max(d.value, 0), 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-slate-500">
        Metodologia completa e pesos por cargo em{" "}
        <a href="/metodologia" className="text-sky-400 hover:underline">
          /metodologia
        </a>
      </p>
    </div>
  );
}
