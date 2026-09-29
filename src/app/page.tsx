const THERMOMETER = [
  {
    emoji: "🟢",
    label: "Confiável",
    criteria: "Dados completos (>80%), sem condenações ou inelegibilidade, gastos dentro da mediana e transparência ativa.",
    color: "border-emerald-500/40 bg-emerald-500/10",
  },
  {
    emoji: "🟡",
    label: "Atenção / Risco",
    criteria: "Dados incompletos (60–79%), réu em ação penal pública, contas com ressalvas, gastos atípicos ou alta infidelidade partidária.",
    color: "border-amber-500/40 bg-amber-500/10",
  },
  {
    emoji: "🔴",
    label: "Não Confiável",
    criteria: "Condenação transitada em julgado, improbidade, contas rejeitadas, cassação, inelegibilidade ou ocultação de dados públicos.",
    color: "border-red-500/40 bg-red-500/10",
  },
  {
    emoji: "⚪",
    label: "Dados Insuficientes",
    criteria: "Confiança abaixo de 60%. O político fica fora do ranking até que os dados sejam completados.",
    color: "border-slate-500/40 bg-slate-500/10",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-700 to-blue-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="mb-4 inline-block rounded-full border border-white/25 px-3 py-1 text-xs font-medium tracking-wide text-white/85">
            MVP em construção · Fase 0 concluída
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Currículo Político
          </h1>
          <p className="mt-6 text-2xl font-light leading-relaxed text-white/95">
            Uma campanha política não revela o seu candidato,
            <br />
            <strong className="font-semibold">o currículo dele sim.</strong>
          </p>
          <p className="mt-6 text-slate-200/90">
            Transparência radical, dados públicos, algoritmos abertos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              { href: "/ranking", label: "Ver Ranking" },
              { href: "/projetos", label: "📋 Projetos" },
              { href: "/comparar", label: "⚖️ Comparar" },
              { href: "/como-funciona", label: "🏛️ Como Funciona" },
              { href: "/calendario-eleitoral", label: "📅 Calendário" },
              { href: "/faq", label: "FAQ" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Termômetro */}
      <section id="termometro" className="scroll-mt-20 py-10">
        <h2 className="text-2xl font-semibold">Termômetro de Confiabilidade</h2>
        <p className="mt-2 text-slate-400">
          Diferente da nota 0–100 (que mede desempenho), o termômetro mede risco
          e transparência. Ele é exibido ao lado da nota.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {THERMOMETER.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border p-5 ${item.color}`}
            >
              <h3 className="font-semibold">
                {item.emoji} {item.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {item.criteria}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Metodologia */}
      <section id="metodologia" className="scroll-mt-20 py-10">
        <h2 className="text-2xl font-semibold">Metodologia IDIP v1.0</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="font-semibold text-slate-200">Legislativo</h3>
            <ul className="mt-3 space-y-1 text-sm text-slate-400">
              <li>Integridade — 25%</li>
              <li>Produção — 20% · Aprovação — 15%</li>
              <li>Fiscalização — 10% · Presença — 10%</li>
              <li>Transparência — 10%</li>
              <li>Custo/Benefício — 5% · Campanha — 5%</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="font-semibold text-slate-200">Executivo</h3>
            <ul className="mt-3 space-y-1 text-sm text-slate-400">
              <li>Integridade — 25%</li>
              <li>Responsabilidade Fiscal — 20%</li>
              <li>Entrega de Governo — 20%</li>
              <li>Transparência — 15% · Custo/Eficiência — 10%</li>
              <li>Campanha — 5% · Governança — 5%</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          <strong className="text-slate-200">Travas de integridade:</strong>{" "}
          condenação transitada em julgado, impeachment, inelegibilidade ou
          contas rejeitadas zeram a dimensão Integridade e limitam a nota final
          a 39.9 (Reprovado).
        </p>
      </section>

      {/* API */}
      <section id="api" className="scroll-mt-20 py-10">
        <h2 className="text-2xl font-semibold">API pública (em construção)</h2>
        <div className="mt-6 space-y-3 font-mono text-sm">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-emerald-400">GET</span>{" "}
            <span className="text-slate-300">/api/rankings?cargo=LEGISLATIVE&limit=10</span>
            <p className="mt-1 font-sans text-xs text-slate-500">
              Top 10 legislativo (exclui confiança &lt; 60).
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-emerald-400">GET</span>{" "}
            <span className="text-slate-300">/api/politicians/[id]</span>
            <p className="mt-1 font-sans text-xs text-slate-500">
              Perfil, nota IDIP e registros jurídicos ativos (oculta arquivados/absolvidos).
            </p>
          </div>
        </div>
      </section>
    </main>
      </>
  );
}
