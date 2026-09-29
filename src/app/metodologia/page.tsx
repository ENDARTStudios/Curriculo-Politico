import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodologia IDIP — Currículo Político",
  description:
    "Como o IDIP é calculado: 5 pilares, pesos por cargo, travas de integridade, termômetro de confiabilidade, neutralidade algorítmica e a fórmula de confiança dos dados.",
};

const STATUS_BADGE = {
  vigente: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  planejado: "border-amber-500/30 bg-amber-500/10 text-amber-300",
} as const;

function Badge({ tipo }: { tipo: keyof typeof STATUS_BADGE }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[tipo]}`}>
      {tipo === "vigente" ? "vigente" : "planejado"}
    </span>
  );
}

const PILARES = [
  {
    title: "Eficácia e Cumprimento de Metas",
    desc: "Mede se as promessas de campanha e os objetivos dos planos de governo foram realizados na prática.",
    badge: "planejado" as const,
    hoje: "Entrega de Governo existe nos pesos do Executivo; cruzamento com planos de governo (TSE) ainda não implementado.",
  },
  {
    title: "Eficiência e Gestão de Recursos",
    desc: "Avalia a capacidade de otimizar o uso do dinheiro público (relação custo-benefício) na execução de obras e serviços.",
    badge: "planejado" as const,
    hoje: "Custo/Benefício no baseline (50) — fonte de despesas (cota parlamentar) pendente no pipeline.",
  },
  {
    title: "Transparência e Conduta Ética",
    desc: "Analisa o histórico de processos judiciais, o uso correto de verbas parlamentares e a clareza nas contas públicas.",
    badge: "planejado" as const,
    hoje: "Integridade e Transparência no baseline (50); pipeline jurídico (STF/STJ/TSE) pendente.",
  },
  {
    title: "Atividade Legislativa e Presença",
    desc: "Considera a assiduidade nas sessões, a elaboração de projetos de lei consistentes e a participação em debates essenciais.",
    badge: "vigente" as const,
    hoje: "Ativo: 6.465 votos nominais, 31.815 proposições e 166.825 presenças coletadas alimentam a nota.",
  },
  {
    title: "Impacto Social e Equidade",
    desc: "Verifica se as políticas públicas implementadas melhoraram os indicadores sociais da população e reduziram desigualdades.",
    badge: "planejado" as const,
    hoje: "Requer cruzar legisla aprovada com indicadores (IBGE etc.) — horizonte pós-MVP.",
  },
];

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
        algoritmicamente sobre dados públicos. Sem voto popular na{" "}
        <strong className="text-slate-200">nota</strong>. Código aberto e
        auditável —{" "}
        <a
          href="https://github.com/"
          className="text-sky-400 hover:underline"
          title="repositório do projeto"
        >
          src/lib/scoring.ts
        </a>
        .
      </p>
      <p className="mt-3 max-w-3xl rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-500">
        Esta página separa explicitamente o que o algoritmo{" "}
        <strong className="text-emerald-300">faz hoje</strong> do que está{" "}
        <strong className="text-amber-300">planejado</strong>. Nenhuma regra
        entra na nota sem estar implementada e versionada no código.
      </p>

      {/* 5 Pilares */}
      <section className="mt-10">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Critérios de Avaliação — 5 Pilares
          </h2>
          <Badge tipo="vigente" />
        </div>
        <p className="mb-6 text-slate-400">
          A visão de avaliação do Currículo Político em cinco pilares, com o
          status de implementação de cada um.
        </p>
        <div className="space-y-4">
          {PILARES.map((pilar) => (
            <div
              key={pilar.title}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="border-l-4 border-sky-500/60 pl-3 font-semibold text-slate-100">
                  {pilar.title}
                </div>
                <Badge tipo={pilar.badge} />
              </div>
              <p className="mt-2 pl-3 text-sm leading-relaxed text-slate-400">
                {pilar.desc}
              </p>
              <p className="mt-1 pl-3 text-xs text-slate-500">{pilar.hoje}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pesos vigentes */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Pesos por Cargo (fórmula vigente)
          </h2>
          <Badge tipo="vigente" />
        </div>
        <p className="mb-6 text-slate-400">
          A soma ponderada das dimensões normalizadas 0–100 produz a nota.
          Escopo municipal (vereadores/prefeitos) é expansão futura do mesmo
          modelo.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="mb-3 text-lg font-bold text-slate-100">
              🏛️ Legislativo (vigente: federais; senadores na base)
            </h3>
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
            <h3 className="mb-3 text-lg font-bold text-slate-100">
              ⚖️ Executivo (implementado; sem dados na base ainda)
            </h3>
            <ul className="space-y-1 text-sm text-slate-400">
              {PESOS_EXECUTIVO.map(([dim, peso]) => (
                <li key={dim} className="flex justify-between">
                  <span>{dim}</span>
                  <span className="font-mono text-slate-300">{peso}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Confiança */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Como calculamos a Confiança dos dados
          </h2>
          <Badge tipo="vigente" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            A Confiança (0–100%) mede quanta informação necessária conseguimos
            coletar — nunca gera nota fictícia. Fórmula vigente:
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
            ficam no baseline neutro (50) até que suas fontes entrem no
            pipeline.
          </p>
        </div>
      </section>

      {/* Travas */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Travas de Integridade (hard caps)
          </h2>
          <Badge tipo="vigente" />
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
          <p className="text-sm leading-relaxed text-slate-400">
            Condenação transitada em julgado, impeachment, inelegibilidade ou
            contas rejeitadas: a dimensão Integridade vai a{" "}
            <strong className="text-slate-200">zero</strong>, a nota final é
            limitada a <strong className="text-slate-200">39.9 (Reprovado)</strong>{" "}
            e o Termômetro fica{" "}
            <strong className="text-red-300">🔴 Não Confiável</strong>.
          </p>
        </div>
      </section>

      {/* TIC */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Termômetro de Confiabilidade (TIC)
          </h2>
          <Badge tipo="vigente" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
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
        </div>
      </section>

      {/* Neutralidade Algorítmica */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Neutralidade Algorítmica
          </h2>
          <Badge tipo="vigente" />
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h3 className="mb-3 text-lg font-semibold text-slate-100">
            O desafio das votações e polêmicas
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Para manter o site honesto e evitar acusações de viés ideológico, o
            algoritmo <strong className="text-slate-200">nunca julga se um
            projeto é bom ou ruim</strong>. A plataforma apenas lista as
            votações de forma transparente e permite que o usuário crie seu
            próprio <strong className="text-slate-200">Filtro de Afinidade</strong>.
          </p>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="border-l-4 border-amber-500/60 pl-3">
              <strong className="text-slate-200">Votações:</strong> o usuário
              poderá marcar preferências (ex: &quot;sou a favor de
              privatizações&quot;) e receber um ranking{" "}
              <strong className="text-slate-200">pessoal</strong> — que{" "}
              <strong className="text-slate-200">nunca altera a nota global
              factual</strong> do político. O IDIP permanece intocado.
            </div>
            <div className="border-l-4 border-amber-500/60 pl-3">
              <strong className="text-slate-200">Polêmicas:</strong> tratadas
              estritamente sob escopo jurídico ou auditoria de agências de
              checagem, com link da denúncia e espaço da defesa.
            </div>
            <div className="border-l-4 border-amber-500/60 pl-3">
              <strong className="text-slate-200">Projetos de Lei:</strong>{" "}
              usuários poderão votar nos projetos (a favor/contra), um voto por
              projeto por usuário, alterável. Proteção anti-bot: contas com
              menos de 24h não votam.{" "}
              <span className="text-amber-300">
                Infraestrutura criada; a votação pessoal abre com a
                autenticação (Fase 4 do roadmap).
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Modificadores de Carreira */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Modificadores de Carreira
          </h2>
          <Badge tipo="planejado" />
        </div>
        <p className="mb-6 text-slate-400">
          Regras desenhadas para equilibrar a comparação entre novatos e
          veteranos — entram na nota somente quando as fontes que as alimentam
          estiverem ativas.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="mb-3 text-lg font-bold text-slate-100">
              🌱 Políticos Iniciantes
            </h3>
            <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
              <div className="text-3xl font-bold text-sky-300">35 pontos</div>
              <div className="text-sm text-slate-400">
                Nota de partida (Conquista Factual Condicional)
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <strong className="text-slate-200">+20 pontos:</strong> Ficha
                Limpa Criminal (zero processos/condenações)
              </li>
              <li>
                <strong className="text-slate-200">+15 pontos:</strong>{" "}
                Transparência de Campanha (TSE 100% regular)
              </li>
              <li className="italic text-slate-500">
                Os outros 65 pontos são conquistados mês a mês com dados reais
                de mandato.
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="mb-3 text-lg font-bold text-slate-100">
              🏛️ Políticos Veteranos
            </h3>
            <div className="mb-4 rounded-lg bg-slate-800/60 p-4">
              <div className="text-3xl font-bold text-slate-100">
                Média Histórica
              </div>
              <div className="text-sm text-slate-400">
                Nota baseada no histórico completo de mandatos
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <strong className="text-slate-200">Fator de Consistência:</strong>{" "}
                mais de 3 mandatos = nota pela média histórica, não apenas o
                último ano
              </li>
              <li>
                <strong className="text-slate-200">Penalidade por Longevidade
                Inócua:</strong> −1 ponto por mandato consecutivo sem projetos
                de autoria aprovados
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Votos secretos */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            ⚠️ Penalização por Votos Secretos
          </h2>
          <Badge tipo="planejado" />
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            A transparência é pilar inegociável. Quando o pipeline tiver o
            registro de posicionamento por votação, o algoritmo aplicará
            penalidades automáticas:
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <strong className="text-slate-200">−5 pontos:</strong> voto
              secreto em pauta de alto interesse público ou abstenção
              estratégica
            </li>
            <li>
              <strong className="text-slate-200">−10 pontos:</strong> recusa
              pública em abrir voto quando o regimento permite divulgação
              voluntária
            </li>
          </ul>
        </div>
      </section>

      {/* Rastreamento temporal */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Rastreamento Temporal
          </h2>
          <Badge tipo="planejado" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Cada político terá um gráfico de linha com a evolução da nota ao
            final de cada ano legislativo (requer histórico anual de scores,
            coletado automaticamente desde o lançamento).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="mb-2 text-2xl">🏆</div>
              <div className="font-semibold text-slate-100">Melhor Ano</div>
              <div className="text-sm text-slate-400">
                Ano com maior pico de pontuação (ex: economia de cota, 100%
                presença, lei importante aprovada)
              </div>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="mb-2 text-2xl">⚠️</div>
              <div className="font-semibold text-slate-100">Pior Ano</div>
              <div className="text-sm text-slate-400">
                Ano com menor nota (ex: réu em improbidade, faltas cruciais,
                gastos máximos)
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs italic text-slate-500">
            Exemplo futuro: 🏆 Melhor Ano: 2023 — Nota 88 | ⚠️ Pior Ano: 2025 —
            Nota 42
          </p>
        </div>
      </section>

      {/* Fontes */}
      <section className="mt-12">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-100">
            Fontes do pipeline e status
          </h2>
          <Badge tipo="vigente" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
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
                  {f.status}
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
        </div>
      </section>
    </main>
  );
}
