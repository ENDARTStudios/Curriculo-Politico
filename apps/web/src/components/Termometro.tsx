import type { ReliabilityStatus } from "@prisma/client";
import { STATUS_VISUAL } from "@/lib/status-visual";

export function Termometro({ status }: { status: ReliabilityStatus }) {
  const cfg = STATUS_VISUAL[status];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
      title={`${cfg.label} — ${cfg.descricao}`}
    >
      <span className="text-lg leading-none" aria-hidden="true">
        {cfg.emoji}
      </span>
      {cfg.label}
    </div>
  );
}
