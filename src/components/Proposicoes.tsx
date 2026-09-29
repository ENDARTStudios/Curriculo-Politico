import type { BillAuthorship, Bill } from "@prisma/client";

type Autoria = BillAuthorship & { bill: Bill };

interface ProposicoesProps {
  autorias: Autoria[];
  total: number;
}

export function Proposicoes({ autorias, total }: ProposicoesProps) {
  if (autorias.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-100">
          Proposições Autorais
        </h2>
        <p className="text-sm text-slate-500">
          Nenhuma proposição de autoria registrada no período coberto pela
          coleta.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-4 text-xl font-bold text-slate-100">
        Proposições Autorais
      </h2>
      <div className="space-y-3">
        {autorias.map((autoria) => (
          <div key={autoria.id} className="flex items-start justify-between gap-3 border-l-4 border-purple-500/50 py-1 pl-3">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm leading-snug text-slate-200">
                {autoria.bill.title}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-300">
                  {autoria.bill.type ?? "Tipo não informado"}
                </span>
                <span className="text-xs text-slate-500">
                  {autoria.bill.date
                    ? new Date(autoria.bill.date).toLocaleDateString("pt-BR")
                    : "Data não informada"}
                </span>
                {autoria.bill.externalId && (
                  <a
                    href={`https://dadosabertos.camara.leg.br/api/v2/proposicoes/${autoria.bill.externalId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-400 hover:underline"
                  >
                    fonte original
                  </a>
                )}
              </div>
            </div>
            <span className="shrink-0 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-300">
              {autoria.type ?? "Autor"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs italic text-slate-500">
        Exibindo as {autorias.length} proposições mais recentes de {total}{" "}
        registradas na coleta atual.
      </p>
    </div>
  );
}
