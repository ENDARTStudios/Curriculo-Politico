import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendário Eleitoral — Currículo Político",
  description:
    "Eleições brasileiras: calendário de eleições gerais e municipais, cargos em disputa e regras do sistema eleitoral.",
};

interface EleicaoAno {
  ano: number;
  tipo: "Geral" | "Municipal" | "Suplementar";
  cargos: string[];
  observacao?: string;
}

const ELEICOES: EleicaoAno[] = [
  {
    ano: 2024,
    tipo: "Municipal",
    cargos: ["Prefeitos", "Vereadores"],
    observacao: "Eleição municipal. Mandatos 2025–2028.",
  },
  {
    ano: 2026,
    tipo: "Geral",
    cargos: [
      "Presidente da República",
      "Governadores (27)",
      "Senadores (27 — 1/3 do Senado)",
      "Deputados Federais (513)",
      "Deputados Estaduais/Distritais (1.060)",
    ],
    observacao: "Eleição geral. 1º turno em outubro. Mandatos 2027–2030/2034.",
  },
  {
    ano: 2028,
    tipo: "Municipal",
    cargos: ["Prefeitos", "Vereadores"],
    observacao: "Eleição municipal. Mandatos 2029–2032.",
  },
  {
    ano: 2030,
    tipo: "Geral",
    cargos: [
      "Presidente da República",
      "Governadores (27)",
      "Senadores (54 — 2/3 do Senado)",
      "Deputados Federais (513)",
      "Deputados Estaduais/Distritais (1.060)",
    ],
    observacao: "Eleição geral. Renovação de 2/3 do Senado. Mandatos 2031–2034/2038.",
  },
];

export default function CalendarioEleitoralPage() {
  const hoje = new Date().getFullYear();
  const proxima = ELEICOES.find((e) => e.ano >= hoje);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Calendário Eleitoral Brasileiro
      </h1>
      <p className="mt-3 max-w-3xl text-xl leading-relaxed text-slate-400">
        Eleições ocorrem a cada 2 anos, alternando entre gerais (Federais +
        Estaduais) e municipais. Sempre no primeiro domingo de outubro, com
        eventual 2º turno no último domingo do mês.
      </p>

      {proxima && (
        <div className="mt-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-800 p-6 text-white">
          <div className="mb-1 text-sm opacity-80">Próxima eleição</div>
          <div className="mb-2 text-3xl font-bold">{proxima.ano}</div>
          <div className="text-lg">
            <strong>
              {proxima.tipo === "Geral" ? "Eleição Geral" : "Eleição Municipal"}
            </strong>
          </div>
          <div className="mt-3 text-sm">
            Cargos em disputa: {proxima.cargos.join(", ")}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {ELEICOES.map((e) => {
          const isPassada = e.ano < hoje;
          const isProxima = proxima?.ano === e.ano;

          return (
            <div
              key={e.ano}
              className={`rounded-xl border bg-slate-900/60 p-6 ${
                isProxima
                  ? "border-sky-500"
                  : isPassada
                    ? "border-slate-800 opacity-60"
                    : "border-slate-700"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-slate-100">{e.ano}</div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      e.tipo === "Geral"
                        ? "border border-sky-500/30 bg-sky-500/10 text-sky-300"
                        : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {e.tipo}
                  </span>
                </div>
                {isPassada && <span className="text-xs text-slate-500">Realizada</span>}
                {isProxima && (
                  <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-300">
                    Próxima
                  </span>
                )}
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {e.cargos.map((cargo) => (
                  <div key={cargo} className="flex items-start text-sm text-slate-400">
                    <span className="mr-2 text-sky-400">•</span>
                    {cargo}
                  </div>
                ))}
              </div>

              {e.observacao && (
                <div className="mt-4 border-t border-slate-800 pt-3 text-xs italic text-slate-500">
                  {e.observacao}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="mb-3 text-lg font-bold text-slate-100">📅 Regras Gerais</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>
            <strong className="text-slate-200">Frequência:</strong> a cada 2
            anos, sempre em anos pares.
          </li>
          <li>
            <strong className="text-slate-200">1º turno:</strong> primeiro
            domingo de outubro.
          </li>
          <li>
            <strong className="text-slate-200">2º turno:</strong> último
            domingo de outubro (apenas cargos executivos, com mais de 2
            candidatos e nenhum com maioria absoluta).
          </li>
          <li>
            <strong className="text-slate-200">Voto:</strong> obrigatório para
            alfabetizados entre 18 e 70 anos. Facultativo para analfabetos,
            16–17 anos e maiores de 70.
          </li>
          <li>
            <strong className="text-slate-200">Reeleição:</strong> permitida
            uma única vez consecutiva para cargos do Executivo.
          </li>
        </ul>
      </div>
    </main>
  );
}
