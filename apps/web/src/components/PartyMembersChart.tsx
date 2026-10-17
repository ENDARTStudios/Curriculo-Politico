"use client";

import { STATUS_HEX } from "@/lib/status-visual";

export interface MemberData {
  id: string;
  name: string;
  score: number;
  reliability: string;
}

/**
 * Cor da barra por estado de confiabilidade.
 *
 * Consome `STATUS_HEX` em vez de manter a própria cópia. A cópia local tinha os
 * hex do Tailwind **v3** (`#10b981` para emerald-500, `#94a3b8` para GRAY),
 * enquanto o resto da UI roda **v4** (`#00BC7D`, `#62748E`) — o mesmo card
 * mostrava o partido numa paleta e os membros noutra. É exatamente a duplicação
 * que o docstring de `status-visual.ts` já alertava ter causado divergência.
 *
 * O fallback `partyColor` cobre um `reliability` fora do enum, que pode chegar de
 * dado antigo no banco.
 */
function corDoEstado(reliability: string, partyColor: string): string {
  const hex = STATUS_HEX[reliability as keyof typeof STATUS_HEX];
  return hex ? hex.barra : partyColor;
}

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
            <div className="w-7 text-right text-xs text-slate-400">{i + 1}º</div>
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
                    backgroundColor: corDoEstado(m.reliability, partyColor),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
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
