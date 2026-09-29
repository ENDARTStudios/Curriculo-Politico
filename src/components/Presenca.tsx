import type { SessionAttendance } from "@prisma/client";

interface PresencaProps {
  presencas: SessionAttendance[];
  total: number;
}

export function Presenca({ presencas, total }: PresencaProps) {
  if (presencas.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-100">
          Presença em Sessões
        </h2>
        <p className="text-sm text-slate-500">
          Nenhum registro de presença em sessões deliberativas.
        </p>
      </div>
    );
  }

  // Agrupa por mês (YYYY-MM para ordenar corretamente)
  const porMes = new Map<string, number>();
  for (const p of presencas) {
    const chave = p.sessionDate.toISOString().slice(0, 7);
    porMes.set(chave, (porMes.get(chave) ?? 0) + 1);
  }
  const meses = [...porMes.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12);

  const maxCount = Math.max(...meses.map(([, c]) => c), 1);
  const mediaMensal =
    meses.length > 0 ? (total / meses.length).toFixed(1) : "0";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-4 text-xl font-bold text-slate-100">
        Presença em Sessões Deliberativas
      </h2>

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-slate-500">Total de presenças</div>
          <div className="text-3xl font-bold text-slate-100">{total}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">
            Média mensal ({meses.length} meses com registro)
          </div>
          <div className="text-3xl font-bold text-slate-100">{mediaMensal}</div>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-300">
        Últimos {meses.length} meses com registro
      </h3>
      <div className="space-y-2">
        {meses.map(([chave, count]) => {
          const [ano, mes] = chave.split("-");
          const label = new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", {
            month: "short",
            year: "numeric",
          });
          return (
            <div key={chave} className="flex items-center gap-3">
              <span className="w-24 text-sm capitalize text-slate-400">{label}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, (count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm font-semibold text-slate-200">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs italic text-slate-500">
        A API da Câmara registra apenas presenças (eventos com participação
        confirmada). Ausências não são contabilizadas — este número não é uma
        taxa de assiduidade.
      </p>
    </div>
  );
}
