import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodologia IDIP — Currículo Político",
  description:
    "Como o IDIP é calculado: pesos por cargo, travas de integridade, termômetro de confiabilidade e fórmula de confiança dos dados.",
};

const PESOS_LEGISLATIVO = [
  ["Integridade", "25%"],
  ["Produção", "20%"],
  ["Aprovação", "15%"],
  ["Fiscalização", "10%"],
  ["Presença", "10%"],
  ["Transparência", "10%"],
  ["Custo/Benefício", "5%"],
  ["Campanha", "5%"],
];

const PESOS_EXECUTIVO = [
  ["Integridade", "25%"],
  ["Responsabilidade Fiscal", "20%"],
  ["Entrega de Governo", "20%"],
  ["Transparência", "15%"],
  ["Custo/Eficiência", "10%"],
  ["Campanha", "5%"],
  ["Governança", "5%"],
];

const FONTES_STATUS = [
  { fonte: "Votações nominais do Plenário (Câmara)", status: "ativa", detalhe: "taxa de participação sobre 19 sessões nominais registradas desde 02/2023" },
  { fonte: "Proposições de autoria (Câmara)", status: "ativa", detalhe: "50 mil autorias, últimas 100 por deputado" },
  { fonte: "Presença em Sessões Deliberativas (Câmara)", status: "ativa", detalhe: "apenas-positivos (API não registra ausências)" },
  { fonte: "Cadastro (Câmara/Senado)", status: "ativa", detalhe: "nome, partido, UF, foto, mandato" },
  { fonte: "Receitas de campanha (TSE)", status: "pendente", detalhe: "aguardando acesso ao CDN do TSE" },
  { fonte: "Despesas e cota parlamentar (Câmara)", status: "pendente", detalhe: "dimensiona Custo/Benefício e Transparência" },
  { fonte: "Registros jurídicos (STF/STJ/TSE/CNJ)", status: "pendente", detalhe: "alimenta Integridade e as travas reais" },
];

export default function MetodologiaPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Metodologia IDIP v1.0
      </h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Índice de Desempenho e Integridade Pública: nota de 0 a 100 calculada
        algoritmicamente sobre dados públicos. Sem voto popular. Código aberto
        e auditável (
        <a
          href="https://github.com/"
          className="text-sky-400 hover:underline"
          title="repositório do projeto"
        >
          src/lib/scoring.ts
        </a>
        ).
      </p>

      {/* Princípios */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-3 text-xl font-bold text-slate-100">Princípios</h2>
        <ul className="space-y-1 text-sm text-slate-400">
          <li>• Sem voto popular — apenas dados públicos auditáveis.</li>
          <li>• Dados faltantes reduzem a <strong className="text-slate-200">Confiança</strong>, nunca geram pontuação fictícia.</li>
          <li>• A versão da fórmula acompanha cada nota (<code className="text-slate-300">version</code>); recalibrações geram nova versão, não reescrita silenciosa.</li>
        </ul>
      </section>

      {/* Pesos */}
      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-100">Pesos — Legislativo</h2>
          <ul className="space-y-1 text-sm text-slate-400">
            {PESOS_LEGISLATIVO.map(([dim, peso]) => (
              <li key={dim} className="flex justify-between">
                <span>{dim}</span>
                <span className="font-mono text-slate-300">{peso}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-100">Pesos — Executivo</h2>
          <ul className="space-y-1 text-sm text-slate-400">
            {PESOS_EXECUTIVO.map(([dim, peso]) => (
              <li key={dim} className="flex justify-between">
                <span>{dim}</span>
                <span className="font-mono text-slate-300">{peso}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Travas */}
      <section className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <h2 className="mb-3 text-xl font-bold text-slate-100">
          Travas de Integridade (hard caps)
        </h2>
        <p className="text-sm leading-relaxed text-slate-400">
          Condenação transitada em julgado, impeachment, inelegibilidade ou
          contas rejeitadas: a dimensão Integridade vai a <strong className="text-slate-200">zero</strong>,
          a nota final é limitada a <strong className="text-slate-200">39.9 (Reprovado)</strong> e
          o Termômetro fica <strong className="text-red-300">🔴 Não Confiável</strong>.
        </p>
      </section>

      {/* Termômetro */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-3 text-xl font-bold text-slate-100">
          Termômetro de Confiabilidade (TIC)
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-slate-400">
          Mede risco e transparência, exibido ao lado da nota (não é a nota).
          Precedência: ⚪ → 🔴 → 🟡 → 🟢.
        </p>
        <ul className="space-y-1 text-sm text-slate-400">
          <li>• <strong className="text-slate-200">⚪ Dados Insuficientes:</strong> confiança &lt; 60% — fora do ranking</li>
          <li>• <strong className="text-slate-200">🔴 Não Confiável:</strong> trava de integridade acionada</li>
          <li>• <strong className="text-slate-200">🟡 Atenção:</strong> confiança 60–79% ou integridade &lt; 60</li>
          <li>• <strong className="text-slate-200">🟢 Confiável:</strong> confiança ≥ 80% e integridade ≥ 60</li>
        </ul>
      </section>

      {/* Confiança */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-3 text-xl font-bold text-slate-100">
          Como calculamos a Confiança dos dados
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-slate-400">
          A Confiança (0–100%) mede quanta informação necessária conseguimos
          coletar — nunca gera nota fictícia. Fórmula vigente (v1.0):
        </p>
        <pre className="mb-4 overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-300">
{`confiança = min(95,
  30                                  // base: cadastro verificado
  + min(30, taxa_participação × 30)   // votos ÷ sessões nominais
  + min(15, autorias × 1.5)           // proposições apresentadas
  + (presenças ≥ 20 ? 15              // sessões deliberativas
     : min(10, presenças × 2.5))
)`}
        </pre>
        <p className="text-sm leading-relaxed text-slate-400">
          Produtividade e Presença derivam da mesma taxa; as demais dimensões
          ficam no baseline neutro (50) até que suas fontes entrem no pipeline.
        </p>
      </section>

      {/* Status das fontes */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-3 text-xl font-bold text-slate-100">
          Fontes do pipeline e status
        </h2>
        <ul className="space-y-2 text-sm">
          {FONTES_STATUS.map((f) => (
            <li key={f.fonte} className="flex flex-wrap items-baseline gap-2">
              <span
                className={`rounded border px-2 py-0.5 text-xs ${
                  f.status === "ativa"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                }`}
              >
                {f.status === "ativa" ? "ativa" : "pendente"}
              </span>
              <span className="text-slate-300">{f.fonte}</span>
              <span className="text-slate-500">— {f.detalhe}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Dimensões sem fonte ativa usam baseline neutro (50). Elas entram
          automaticamente quando o respectivo pipeline é ativado — a nota é
          recalculada em massa e versionada.
        </p>
      </section>
    </main>
  );
}
