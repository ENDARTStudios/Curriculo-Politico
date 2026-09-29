"use client";

export interface MemberData {
  id: string;
  name: string;
  score: number;
  reliability: string;
}

const RELIABILITY_COLORS: Record<string, string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#ef4444",
  GRAY: "#94a3b8",
};

export function PartyMembersChart({
  members,
  partyColor,
}: {
  members: MemberData[];
  partyColor: string;
}) {
  const sorted = [...members].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...sorted.map((m) => m.score), 100);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-6 text-xl font-bold text-slate-100">
        Desempenho dos Membros ({sorted.length} ranqueados)
      </h2>

      <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
        {sorted.map((m, i) => (
          <div key={m.id} className="flex items-center gap-3">
            <div className="w-7 text-right text-xs text-slate-500">{i + 1}º</div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-200">
                  {m.name}
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {m.score.toFixed(1)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(m.score / maxScore) * 100}%`,
                    backgroundColor: RELIABILITY_COLORS[m.reliability] || partyColor,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Confiável
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Atenção
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Não confiável
        </span>
      </div>
    </div>
  );
}
