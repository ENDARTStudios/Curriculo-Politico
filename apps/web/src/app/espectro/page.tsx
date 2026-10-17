import type { Metadata } from "next";
import Link from "next/link";
import { EspectroQuiz } from "@/components/EspectroQuiz";
import { EIXOS, QUESTOES, VERSAO_MODELO } from "@/lib/espectro";

export const metadata: Metadata = {
  title: "Descubra seu espectro político",
  description:
    "Teste de autoavaliação em 3 eixos — econômico, sociocultural e diplomático. 24 perguntas, compasso político em gráfico e resultado imediato. Suas respostas ficam apenas no seu navegador.",
  alternates: { canonical: "/espectro" },
};

/**
 * "Descubra seu espectro político" — autoavaliação educativa do usuário.
 *
 * Página estática de propósito: não consulta o banco (nada aqui deriva de
 * dados de políticos), e o teste em si roda no cliente para que as respostas
 * — opinião política, dado sensível pela LGPD — nunca chegem ao servidor.
 */
export default function EspectroPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {/* Gancho + promessa */}
      <p className="text-xs uppercase tracking-wider text-slate-400">
        Autoavaliação educativa
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
        Você sabe onde está no espectro político?
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300">
        Esquerda e direita resumem só uma dimensão do debate. Responda{" "}
        {QUESTOES.length} afirmações e descubra sua posição em{" "}
        <strong className="text-slate-100">3 eixos</strong> — econômico,
        sociocultural e diplomático — com gráficos que mostram por que duas
        pessoas &ldquo;de esquerda&rdquo; ou &ldquo;de direita&rdquo; podem
        discordar completamente entre si.
      </p>

      <div className="mt-8">
        <EspectroQuiz />
      </div>

      {/* Prova: metodologia aberta e auditável */}
      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-100">
          Metodologia transparente
        </h2>
        <p className="mt-3 leading-relaxed text-slate-300">
          Como tudo nesta plataforma, o cálculo é aberto e auditável — o código
          é público sob AGPL-3.0.
        </p>
        <dl className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
          <div>
            <dt className="font-semibold text-slate-100">As questões</dt>
            <dd>
              Cada eixo recebe 8 afirmações, sendo 4 favoráveis a cada polo.
              Nenhuma afirmação tem resposta consolidada na Constituição ou em
              decisão de corte — são proposições genuinamente disputadas, sem
              opção &ldquo;certa&rdquo;.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-100">A escala</dt>
            <dd>
              Discordo plenamente vale &minus;2, discordo &minus;1, neutro 0,
              concordo +1 e concordo plenamente +2 — sempre na direção do polo
              citado na afirmação.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-100">A fórmula</dt>
            <dd>
              <code className="rounded bg-slate-950/60 px-1.5 py-0.5 font-mono text-xs text-sky-300">
                soma das respostas do eixo ÷ (2 × nº de questões do eixo) × 100
              </code>
              , gerando uma posição entre &minus;100 (polo A) e +100 (polo B).
              A fórmula é simétrica: espelhar todas as respostas espelha a
              pontuação.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-100">Os eixos</dt>
            <dd>
              <ul className="mt-1 space-y-1">
                {EIXOS.map((eixo) => (
                  <li key={eixo.id}>
                    <strong className="text-slate-200">{eixo.nome}</strong>:{" "}
                    {eixo.poloNegativo.nome} × {eixo.poloPositivo.nome} —{" "}
                    {eixo.descricao.charAt(0).toLowerCase() +
                      eixo.descricao.slice(1)}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-100">Os limites</dt>
            <dd>
              O teste mede preferência declarada, não conhecimento nem
              coerência — e nenhuma ideologia inteira cabe em{" "}
              {QUESTOES.length} frases. Ele é independente do IDIP: a nota dos
              políticos continua derivando exclusivamente de dados oficiais
              auditáveis (modelo do teste: 3 eixos v{VERSAO_MODELO}).
            </dd>
          </div>
        </dl>
      </section>

      {/* LGPD */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-100">
          Privacidade por desenho (LGPD)
        </h2>
        <p className="mt-3 leading-relaxed text-slate-300">
          Opinião política é{" "}
          <strong className="text-slate-100">dado pessoal sensível</strong>{" "}
          pela Lei Geral de Proteção de Dados (art. 5º, II). Por isso este
          teste foi desenhado para não poder vazar: ele roda inteiramente no
          seu navegador, sem enviar, salvar ou compartilhar qualquer resposta —
          nem com a plataforma, nem com terceiros. Fechou a aba, o dado deixa
          de existir. Detalhes em{" "}
          <Link href="/privacidade" className="text-sky-400 hover:text-sky-300">
            nossa política de privacidade
          </Link>
          .
        </p>
      </section>

      {/* CTA de fechamento */}
      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          O seu espectro você já conhece. O deles, também dá para conhecer.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-slate-300">
          Nota de 0 a 100 para cada político, calculada só com dados públicos
          auditáveis da Câmara, do Senado e do TSE — sem voto popular, sem
          opinião, sem caixa-preta.
        </p>
        <div className="mt-6">
          <Link
            href="/ranking"
            className="inline-block rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Ver o ranking
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Ou explore por onde quiser:{" "}
          <Link href="/partidos" className="text-sky-400 hover:text-sky-300">
            partidos
          </Link>{" "}
          ·{" "}
          <Link href="/comparar" className="text-sky-400 hover:text-sky-300">
            comparar políticos
          </Link>{" "}
          ·{" "}
          <Link href="/metodologia" className="text-sky-400 hover:text-sky-300">
            metodologia do IDIP
          </Link>
        </p>
      </section>
    </main>
  );
}
