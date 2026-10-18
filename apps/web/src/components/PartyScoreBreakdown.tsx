import { formatarNota } from "@/lib/formato";

interface PartyScoreBreakdownProps {
  avgMembersScore: number;
  memberCount: number;
  rankedCount: number;
  /** `null` = componente sem fonte de dados ainda. */
  transparencyScore: number | null;
  /** `null` = componente sem fonte de dados ainda. */
  complianceScore: number | null;
  finalScore: number | null;
}

/**
 * Breakdown da nota do partido (PARTY_SCORING).
 *
 * A metodologia prevê 70% média dos membros + 20% transparência institucional +
 * 10% conformidade eleitoral.
 *
 * ── O que mudou, e por quê ────────────────────────────────────────────────
 * A versão anterior recebia `50` fixo nos dois últimos componentes e publicava
 * `média * 0.7 + 50 * 0.2 + 50 * 0.1` como "Nota do partido". Trinta por cento
 * do número era constante — uma medida com um terço de recheio, exibida com a
 * mesma autoridade dos 70% reais.
 *
 * O rodapé de cada componente dizia "placeholder (50) até integração TSE", o que
 * era honesto no detalhe e desonesto no total: quem lia só o número grande não
 * tinha como saber.
 *
 * Agora o componente aceita `null` e, quando falta fonte, **não exibe número para
 * esse componente nem soma com ele**. A tela mostra a média dos parlamentares —
 * que é medida de ponta a ponta — e diz que a nota composta está pendente.
 *
 * Um número menor em escopo e inteiro em verdade vale mais que um número redondo
 * com um terço inventado.
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

  const temTransparencia = transparencyScore !== null;
  const temConformidade = complianceScore !== null;
  const completa = temTransparencia && temConformidade;

  const transparencyComponent = temTransparencia ? transparencyScore * 0.2 : null;
  const complianceComponent = temConformidade ? complianceScore * 0.1 : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-100">
          {completa ? "Composição da Nota" : "Média dos Parlamentares"}
        </h2>
        <div className="text-4xl font-bold text-slate-100">
          {finalScore === null ? "—" : formatarNota(finalScore)}
        </div>
      </div>

      {/*
        A soma, escrita por extenso — mas só com os termos que existem.

        Compor a linha com `+ 0,0` para os componentes ausentes seria pior que não
        mostrar: daria a impressão de que foram medidos e valem zero.
      */}
      <p className="mb-6 text-xs leading-relaxed text-slate-400">
        {completa ? (
          <>
            Nota do partido ={" "}
            <span className="font-mono tabular-nums">
              {formatarNota(membersComponent)} + {formatarNota(transparencyComponent!)} +{" "}
              {formatarNota(complianceComponent!)} = {formatarNota(finalScore)}
            </span>
          </>
        ) : (
          <>
            Média das notas dos parlamentares ranqueados —{" "}
            <span className="font-mono tabular-nums">{formatarNota(avgMembersScore)}</span>. A
            nota composta (70% membros + 20% transparência + 10% conformidade) ainda não pode
            ser calculada: dois dos três componentes não têm fonte de dados.
          </>
        )}
      </p>

      <div className="space-y-4">
        {/* 1. Média dos membros — o único componente medido hoje. */}
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-slate-300">
              Média dos Membros Ranqueados
            </span>
            <span className="whitespace-nowrap text-sm font-bold text-slate-200">
              {formatarNota(avgMembersScore)}
              <span className="text-xs text-slate-400"> · peso 70%</span>
            </span>
          </div>
          <div className="mb-1 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-sky-500"
              style={{ width: `${Math.min(100, (avgMembersScore / 100) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-400">
            {rankedCount}/{memberCount} membros com dados suficientes
          </div>
        </div>

        {/* 2. Transparência institucional — sem fonte. */}
        <ComponenteAusente
          titulo="Transparência Institucional"
          peso="20%"
          descricao="Prestação de contas ao TSE, portal próprio, estatuto público"
          medido={temTransparencia}
          valor={transparencyComponent}
          maximo={20}
        />

        {/* 3. Conformidade eleitoral — sem fonte. */}
        <ComponenteAusente
          titulo="Conformidade Eleitoral"
          peso="10%"
          descricao="Contas julgadas pelo TSE nos últimos 4 anos"
          medido={temConformidade}
          valor={complianceComponent}
          maximo={10}
        />
      </div>

      <div className="mt-6 rounded-lg bg-slate-800/60 p-3">
        <p className="text-xs text-slate-400">
          <strong>Nota:</strong> A nota do partido nunca considera ideologia ou posição no
          espectro político. Todos os partidos são avaliados pelos mesmos critérios técnicos.
          Metodologia em{" "}
          <a href="/metodologia" className="text-sky-400 hover:underline">
            /metodologia
          </a>
          .
        </p>
      </div>
    </div>
  );
}

/**
 * Componente sem fonte de dados.
 *
 * Não desenha barra vazia nem mostra `0,0`: barra em zero comunica "medimos e deu
 * zero", que é uma afirmação falsa. Mostra a ausência como ausência.
 */
function ComponenteAusente({
  titulo,
  peso,
  descricao,
  medido,
  valor,
  maximo,
}: {
  titulo: string;
  peso: string;
  descricao: string;
  medido: boolean;
  valor: number | null;
  maximo: number;
}) {
  if (medido && valor !== null) {
    return (
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-slate-300">{titulo}</span>
          <span className="whitespace-nowrap text-sm font-bold text-slate-200">
            {formatarNota(valor)}
            <span className="text-xs text-slate-400"> de {maximo}</span>
          </span>
        </div>
        <div className="mb-1 h-2 w-full rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-sky-500"
            style={{ width: `${(valor / maximo) * 100}%` }}
          />
        </div>
        <div className="text-xs text-slate-400">{descricao}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-300">{titulo}</span>
        <span className="whitespace-nowrap text-xs font-medium text-amber-300/90">
          sem fonte · peso {peso}
        </span>
      </div>
      <div className="text-xs text-slate-400">
        {descricao} — não entra no cálculo enquanto não houver dado oficial
        integrado. Não exibimos valor estimado para não sugerir medição.
      </div>
    </div>
  );
}
