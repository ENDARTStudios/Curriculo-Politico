import type { ReliabilityStatus } from "@prisma/client";

const STATUS_CONFIG: Record<
  ReliabilityStatus,
  { color: string; bg: string; border: string; label: string; emoji: string }
> = {
  GREEN: {
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    label: "Confiável",
    emoji: "🟢",
  },
  YELLOW: {
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    label: "Atenção",
    emoji: "🟡",
  },
  RED: {
    color: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    label: "Não Confiável",
    emoji: "🔴",
  },
  GRAY: {
    color: "text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-500/40",
    label: "Dados Insuficientes",
    emoji: "⚪",
  },
};

export function Termometro({ status }: { status: ReliabilityStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
      title="Termômetro de Confiabilidade — mede risco e transparência, separado da nota"
    >
      <span className="text-lg leading-none">{cfg.emoji}</span>
      {cfg.label}
    </div>
  );
}
