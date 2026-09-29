import type { PoliticianCost } from "@prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: "💰 Salário Base",
  PATRIMONY: "💎 Patrimônio Declarado",
  CEAP: "📋 Cota Parlamentar (CEAP)",
  CEAPS: "📋 Cota Parlamentar (CEAPS)",
  OFFICE_BUDGET: "🏢 Verba de Gabinete",
  HOUSING: "🏠 Auxílio-Moradia",
  RELOCATION: "🚚 Ajuda de Custo",
  HEALTH_PLAN: "🏥 Plano de Saúde",
  TRANSPORT: "🚗 Transporte Oficial",
  OTHER_BENEFITS: "📦 Outros Benefícios",
};

interface PoliticianCostProps {
  costs: PoliticianCost[];
  productivityScore: number;
}

type StatusCusto = "BAIXO" | "NORMAL" | "ALTO" | "CRITICO";

const STATUS_STYLE: Record<StatusCusto, { chip: string; label: string }> = {
  BAIXO: { chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", label: "✓ Custo-Benefício Bom" },
  NORMAL: { chip: "border-sky-500/40 bg-sky-500/10 text-sky-300", label: "● Custo Normal" },
  ALTO: { chip: "border-amber-500/40 bg-amber-500/10 text-amber-300", label: "⚠ Custo Alto" },
  CRITICO: { chip: "border-red-500/40 bg-red-500/10 text-red-300", label: "🚨 Crítico" },
};

const formatBRL = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CUSTO_MEDIO_ANUAL = 1200000; // ~R$ 1.2M/ano: parlamentar federal médio

/**
 * Custo Total do Político (Requisito #26): custos reais coletados (CEAP etc.)
 * + benefícios fixos de referência por cargo. Patrimônio é contexto, não
 * custo anual. O status compara custo com produtividade (IDIP).
 */
export function PoliticianCost({
  costs,
  fixedBenefits,
  productivityScore,
}: {
  costs: PoliticianCost[];
  fixedBenefits: Array<{ category: string; monthlyValue: number }>;
  productivityScore: number;
}) {
  const anoAtual = new Date().getFullYear();
  const mesesDecorridos = new Date().getMonth() + 1;

  // Custos reais por categoria; ano corrente é ANUALIZADO (parcial)
  const custosPorCategoria: Record<string, number> = {};
  for (const c of costs) {
    if (c.category === "PATRIMONY") continue;
    const fator = c.year === anoAtual ? 12 / mesesDecorridos : 1;
    custosPorCategoria[c.category] =
      (custosPorCategoria[c.category] ?? 0) + c.amount * fator;
  }

  const custoTotalReal = costs
    .filter((c) => c.category !== "PATRIMONY")
    .reduce((sum, c) => sum + c.amount, 0);
  const temCustoReal = custoTotalReal > 0;

  const patrimonio = costs
    .filter((c) => c.category === "PATRIMONY")
    .reduce((sum, c) => sum + c.amount, 0);

  // Categorias sem dado real usam benefício fixo de referência (anualizado)
  for (const fb of fixedBenefits) {
    if (fb.monthlyValue > 0 && !(fb.category in custosPorCategoria)) {
      custosPorCategoria[fb.category] = fb.monthlyValue * 12;
    }
  }

  const custoAnual = Object.values(custosPorCategoria).reduce((a, b) => a + b, 0);
  const custoRelativo = custoAnual / CUSTO_MEDIO_ANUAL;
  const eficiencia = productivityScore / (custoRelativo * 100);

  let status: StatusCusto;
  if (eficiencia >= 0.8) status = "BAIXO";
  else if (eficiencia >= 0.5) status = "NORMAL";
  else if (eficiencia >= 0.3) status = "ALTO";
  else status = "CRITICO";

  const entries = Object.entries(custosPorCategoria)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-100">💸 Custo para o Estado</h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status].chip}`}
        >
          {STATUS_STYLE[status].label}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-slate-800/60 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Custo Anual Total
          </div>
          <div className="text-2xl font-bold text-slate-100">{formatBRL(custoAnual)}</div>
          <div className="text-xs text-slate-500">{formatBRL(custoAnual / 12)}/mês</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Patrimônio Declarado (TSE 2022)
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {patrimonio > 0 ? formatBRL(patrimonio) : "—"}
          </div>
          <div className="text-xs text-slate-500">contexto, não é gasto público</div>
        </div>
      </div>

      {temCustoReal && (
        <p className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs leading-relaxed text-sky-200/80">
          CEAP com gasto <strong>real coletado</strong> (anualizado);
          categorias marcadas como referência usam benefícios fixos públicos
          por cargo — não representam o gasto individual do político nelas.
        </p>
      )}

      <div className="space-y-2">
        {entries.map(([cat, valor]) => (
          <div key={cat} className="border-l-4 border-sky-500/50 py-1.5 pl-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm font-medium text-slate-200">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div className="text-sm font-bold text-slate-100">{formatBRL(valor)}</div>
            </div>
            <div className="text-xs text-slate-500">{formatBRL(valor / 12)}/mês</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-slate-800/60 p-3">
        <p className="text-xs leading-relaxed text-slate-500">
          <strong className="text-slate-400">Como calculamos:</strong> o status
          considera a razão entre o custo anual estimado e a produtividade do
          político (nota IDIP). Custo elevado com baixa produtividade reduz a
          dimensão Custo/Benefício da nota (7% no Legislativo). Fontes oficiais
          linkadas quando disponíveis.
        </p>
      </div>
    </div>
  );
}
