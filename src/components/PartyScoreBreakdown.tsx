interface PartyScoreBreakdownProps {
  avgMembersScore: number;
  memberCount: number;
  rankedCount: number;
  transparencyScore: number;
  complianceScore: number;
  finalScore: number;
}

/**
 * Breakdown da nota do partido (02-architecture-design/PARTY_SCORING.md):
 * 70% média dos membros ranqueados + 20% transparência institucional
 * (placeholder até TSE) + 10% conformidade eleitoral (placeholder até TSE).
 */
export function PartyScoreBreakdown({
  avgMembersScore,
  memberCount,
  rankedCount,
  transparencyScore,
  complianceScore,
  finalScore,
}: PartyScoreBreakdownProps) {
  const membersComponent = avgMembersScore * 0.7;
  const transparencyComponent = transparencyScore * 0.2;
  const complianceComponent = complianceScore * 0.1;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Composição da Nota</h2>
        <div className="text-4xl font-bold text-slate-100">
          {finalScore.toFixed(1)}
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. Média dos membros */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-300">
              Média dos Membros Ranqueados
            </span>
            <span className="text-sm font-bold text-slate-200">
              {membersComponent.toFixed(1)}{" "}
              <span className="text-xs text-slate-500">de 70</span>
            </span>
          </div>
          <div className="mb-1 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-sky-500"
              style={{ width: `${(membersComponent / 70) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-500">
            {rankedCount}/{memberCount} membros com dados suficientes • Média:{" "}
            {avgMembersScore.toFixed(1)}
          </div>
        </div>

        {/* 2. Transparência institucional */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-300">
              Transparência Institucional
            </span>
            <span className="text-sm font-bold text-slate-200">
              {transparencyComponent.toFixed(1)}{" "}
              <span className="text-xs text-slate-500">de 20</span>
            </span>
          </div>
          <div className="mb-1 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${(transparencyComponent / 20) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-500">
            Prestação de contas ao TSE, portal próprio, estatuto público —{" "}
            <span className="text-amber-300/80">placeholder (50) até integração TSE</span>
          </div>
        </div>

        {/* 3. Conformidade eleitoral */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-300">
              Conformidade Eleitoral
            </span>
            <span className="text-sm font-bold text-slate-200">
              {complianceComponent.toFixed(1)}{" "}
              <span className="text-xs text-slate-500">de 10</span>
            </span>
          </div>
          <div className="mb-1 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-purple-500"
              style={{ width: `${(complianceComponent / 10) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-500">
            Contas julgadas pelo TSE nos últimos 4 anos —{" "}
            <span className="text-amber-300/80">placeholder (50) até integração TSE</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-slate-800/60 p-3">
        <p className="text-xs text-slate-400">
          <strong>Nota:</strong> A nota do partido nunca considera ideologia ou
          posição no espectro político. Todos os partidos são avaliados pelos
          mesmos critérios técnicos. Metodologia em{" "}
          <a href="/metodologia" className="text-sky-400 hover:underline">
            /metodologia
          </a>
          .
        </p>
      </div>
    </div>
  );
}
