import { formatarNota } from "@/lib/formato";

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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Composição da Nota</h2>
        <div className="text-4xl font-bold text-slate-100">
          {formatarNota(finalScore)}
        </div>
      </div>

      {/*
        A soma, escrita por extenso.

        A tela mostrava três números (59,8, 64,0, 44,8) e o leitor tinha de
        descobrir sozinho como se relacionavam. Não se relacionavam por acidente:
        cada componente tem **peso próprio** (de 70, de 20, de 10), e o
        `membersComponent` é a média dos membros já multiplicada pelo peso dela.
        Deixar a conta visível é o mesmo princípio do "pesos que não fecham em
        100% ficam na tela" — o método é auditável ou não é.
      */}
      <p className="mb-6 text-xs leading-relaxed text-slate-400">
        Nota do partido ={" "}
        <span className="font-mono tabular-nums">
          {formatarNota(membersComponent)} + {formatarNota(transparencyComponent)} +{" "}
          {formatarNota(complianceComponent)} = {formatarNota(finalScore)}
        </span>
      </p>

      <div className="space-y-4">
        {/* 1. Média dos membros */}
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-slate-300">
              Média dos Membros Ranqueados
            </span>
            <span className="whitespace-nowrap text-sm font-bold text-slate-200">
              {formatarNota(membersComponent)}{" "}
              <span className="text-xs text-slate-400">de 70</span>
            </span>
          </div>
          {/*
            Todas as barras em `sky`: são três medidas da MESMA natureza
            (magnitude dentro do próprio peso). A versão anterior pintava uma de
            `sky`, uma de `emerald` e uma de `purple` — e verde, neste sistema,
            significa confiabilidade GREEN, não "transparência institucional".
            Magenta não existe na paleta. Cor aqui é magnitude, não categoria.
          */}
          <div className="mb-1 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-sky-500"
              style={{ width: `${(membersComponent / 70) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-400">
            {rankedCount}/{memberCount} membros com dados suficientes • Média:{" "}
            {formatarNota(avgMembersScore)} (já multiplicada pelo peso de 70%)
          </div>
        </div>

        {/* 2. Transparência institucional */}
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-slate-300">
              Transparência Institucional
            </span>
            <span className="whitespace-nowrap text-sm font-bold text-slate-200">
              {formatarNota(transparencyComponent)}{" "}
              <span className="text-xs text-slate-400">de 20</span>
            </span>
          </div>
          <div className="mb-1 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-sky-500"
              style={{ width: `${(transparencyComponent / 20) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-400">
            Prestação de contas ao TSE, portal próprio, estatuto público —{" "}
            <span className="text-amber-300/80">placeholder (50) até integração TSE</span>
          </div>
        </div>

        {/* 3. Conformidade eleitoral */}
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-slate-300">
              Conformidade Eleitoral
            </span>
            <span className="whitespace-nowrap text-sm font-bold text-slate-200">
              {formatarNota(complianceComponent)}{" "}
              <span className="text-xs text-slate-400">de 10</span>
            </span>
          </div>
          <div className="mb-1 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-sky-500"
              style={{ width: `${(complianceComponent / 10) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-400">
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
