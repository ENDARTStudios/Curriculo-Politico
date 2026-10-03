import type { Score } from "@prisma/client";

/**
 * Cobertura de dados por dimensão — distingue "50 = medido" de
 * "50 = baseline neutro por ausência de dados" (transparência metodológica).
 * `coverage[label] = true` → dimensão com dado real; ausente/false → baseline.
 */
export type CoberturaDimensoes = Record<string, boolean>;

export function ScoreBreakdown({
  score,
  coverage = {},
}: {
  score: Score;
  coverage?: CoberturaDimensoes;
}) {
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
        {dims.map((d) => {
          const real = coverage[d.label] === true;
          return (
            <div key={d.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="text-slate-400">
                  {d.label}{" "}
                  {!real && (
                    <span
                      className="ml-1 rounded border border-slate-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500"
                      title="Sem dados suficientes nesta dimensão — valor neutro (50) por baseline, não desempenho medido"
                    >
                      sem dados · neutro
                    </span>
                  )}
                </span>
                <span className={`font-semibold ${real ? "text-slate-200" : "text-slate-400"}`}>
                  {d.value.toFixed(1)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800">
                <div
                  className={`h-2 rounded-full transition-all ${
                    real ? "bg-sky-500" : "bg-slate-600"
                  }`}
                  style={{ width: `${Math.min(Math.max(d.value, 0), 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        Dimensões marcadas como “sem dados · neutro” exibem o baseline 50 por
        ausência de dados na fonte correspondente — <strong>não</strong>{" "}
        representam desempenho medido. Elas ativam automaticamente quando o
        pipeline da fonte entra em operação.{" "}
        <a href="/metodologia" className="text-sky-400 hover:underline">
          Metodologia completa
        </a>
      </p>
    </div>
  );
}
