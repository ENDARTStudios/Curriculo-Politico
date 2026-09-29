const POSITION_LABELS: Record<string, { label: string; style: string }> = {
  ESQUERDA: {
    label: "Esquerda",
    style: "border-red-500/40 bg-red-500/10 text-red-300",
  },
  CENTRO_ESQUERDA: {
    label: "Centro-esquerda",
    style: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  },
  CENTRO: {
    label: "Centro",
    style: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  },
  CENTRO_DIREITA: {
    label: "Centro-direita",
    style: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  },
  DIREITA: {
    label: "Direita",
    style: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
  },
};

interface IdeologyBadgeProps {
  position: string | null;
  ideology?: string | null;
  size?: "sm" | "md";
}

/**
 * Posicionamento no espectro político do partido — classificação pública
 * notória (registro TSE + ciência política), exibida como contexto.
 * Nunca influencia a nota IDIP.
 */
export function IdeologyBadge({ position, ideology, size = "sm" }: IdeologyBadgeProps) {
  if (!position) return null;

  const cfg = POSITION_LABELS[position];
  if (!cfg) return null;

  return (
    <span
      title={ideology || cfg.label}
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${cfg.style} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      {cfg.label}
    </span>
  );
}
