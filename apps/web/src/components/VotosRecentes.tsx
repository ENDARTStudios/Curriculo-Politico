import type { LegislativeAction } from "@prisma/client";

const VOTO_STYLE: Record<string, string> = {
  Sim: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Não: "border-red-500/40 bg-red-500/10 text-red-300",
  Abstenção: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  Obstrução: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

interface VotosRecentesProps {
  votos: LegislativeAction[];
  total: number;
  fonteUrl?: (votacaoId: string) => string;
}

export function VotosRecentes({ votos, total }: VotosRecentesProps) {
  if (votos.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-100">Votos em Plenário</h2>
        <p className="text-sm text-slate-500">
          Nenhum voto nominal registrado nas sessões plenárias do período.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-4 text-xl font-bold text-slate-100">
        Votos em Plenário
      </h2>
      <div className="space-y-3">
        {votos.map((voto) => {
          const style = VOTO_STYLE[voto.voteDirection ?? ""] ?? "border-slate-500/40 bg-slate-500/10 text-slate-300";
          return (
            <div key={voto.id} className="flex items-start justify-between gap-3 border-l-4 border-sky-500/50 py-1 pl-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-200">
                  Votação {voto.billId}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {voto.date
                    ? new Date(voto.date).toLocaleDateString("pt-BR")
                    : "Data não informada"}
                  {" · "}
                  <a
                    href={`https://dadosabertos.camara.leg.br/api/v2/votacoes/${voto.billId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    fonte original
                  </a>
                </div>
              </div>
              <span className={`shrink-0 rounded border px-2 py-1 text-xs font-semibold ${style}`}>
                {voto.voteDirection ?? "N/A"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs italic text-slate-500">
        Exibindo os {votos.length} votos mais recentes de {total} registrados
        nesta legislatura. Cada voto é auditável na fonte oficial da votação.
      </p>
    </div>
  );
}
