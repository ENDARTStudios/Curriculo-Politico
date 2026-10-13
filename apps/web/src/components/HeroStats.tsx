import Link from "next/link";
import type { NumerosHero } from "@/lib/hero-stats";
import { STATUS_ORDEM, STATUS_VISUAL } from "@/lib/status-visual";

/**
 * Faixa de prova social da home — o estágio "Prova" do funil.
 *
 * É um componente puramente apresentacional: os dados chegam prontos de
 * `carregarNumerosHero()`, o que mantém o acesso a banco fora da árvore de
 * renderização e torna este arquivo trivial de revisar visualmente.
 *
 * ── O corte mais importante ─────────────────────────────────────────────────
 * `if (!numeros || numeros.politicosAvaliados === 0) return null;`
 *
 * Uma faixa de prova vazia ("0 políticos avaliados") é pior do que faixa
 * nenhuma: ela transforma o argumento de credibilidade em confissão de
 * incapacidade. Com banco vazio ou indisponível, a home simplesmente passa do
 * gancho direto para o CTA — e continua funcionando.
 */

const FORMATO = new Intl.NumberFormat("pt-BR");

function formatar(valor: number): string {
  return FORMATO.format(valor);
}

export function HeroStats({ numeros }: { numeros: NumerosHero | null }) {
  if (!numeros || numeros.politicosAvaliados === 0) return null;

  const { primeiroLugar } = numeros;

  const contagens: Array<{ valor: number; rotulo: string; titulo: string }> = [
    {
      valor: numeros.politicosAvaliados,
      rotulo: "Avaliados",
      titulo: "Parlamentares e governantes com nota IDIP calculada",
    },
    {
      valor: numeros.notasCalculadas,
      rotulo: "Notas auditadas",
      titulo: "Notas derivadas de dados públicos da Câmara, do Senado e do TSE",
    },
    {
      valor: numeros.proposicoes,
      rotulo: "Projetos de lei",
      titulo: "Proposições legislativas registradas e consultáveis",
    },
    {
      valor: numeros.votacoes,
      rotulo: "Votações",
      titulo: "Decisões de voto registradas nas casas legislativas",
    },
    {
      valor: numeros.partidos,
      rotulo: "Partidos",
      titulo: "Legendas com desempenho agregado disponível",
    },
  ].filter((c) => c.valor > 0);

  return (
    <section
      aria-labelledby="prova-titulo"
      className="border-t border-slate-800 bg-slate-950/60"
    >
      <div className="mx-auto max-w-6xl px-6 py-14">
        <h2
          id="prova-titulo"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Auditoria em números
        </h2>
        <p className="mt-3 max-w-[65ch] text-lg leading-relaxed text-slate-300">
          Nada aqui é opinião: cada nota vem de votação, proposição, presença e
          prestação de contas publicadas pelos próprios órgãos públicos. O
          cálculo é aberto e versionado.
        </p>

        {/* Contagens reais do banco */}
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {contagens.map((c) => (
            <div key={c.rotulo} title={c.titulo}>
              <dd className="font-mono text-3xl font-bold tabular-nums text-slate-100 sm:text-4xl">
                {formatar(c.valor)}
              </dd>
              <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                {c.rotulo}
              </dt>
            </div>
          ))}
        </dl>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Distribuição por estado do Termômetro */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-sm font-semibold text-slate-200">
              Como estão distribuídos os {formatar(numeros.politicosAvaliados)}{" "}
              avaliados
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {numeros.cobertura}% têm dados suficientes para entrar no ranking.
              Os demais ficam de fora até que a base seja completada — não são
              penalizados por falta de dado.
            </p>

            <ul className="mt-5 space-y-3">
              {STATUS_ORDEM.map((status) => {
                const cfg = STATUS_VISUAL[status];
                const quantidade = numeros.distribuicao[status];
                const fracao =
                  numeros.politicosAvaliados > 0
                    ? (quantidade / numeros.politicosAvaliados) * 100
                    : 0;

                return (
                  <li key={status}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-300">
                        <span aria-hidden="true">{cfg.emoji}</span>
                        {cfg.label}
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {formatar(quantidade)}
                      </span>
                    </div>
                    {/* A barra é decorativa: a contagem acima já carrega o dado,
                        então ela não precisa de rótulo acessível. */}
                    <div
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800"
                    >
                      <div
                        className={`h-full rounded-full ${cfg.bar}`}
                        style={{ width: `${Math.max(fracao, quantidade > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Exemplo concreto: a maior nota do ranking */}
          {primeiroLugar && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-sm font-semibold text-slate-200">
                Maior nota do ranking agora
              </h3>
              <Link
                href={`/politicos/${primeiroLugar.id}`}
                className="mt-4 block rounded-lg border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-600 focus-visible:border-slate-600"
              >
                <p className="font-semibold text-slate-100">
                  {primeiroLugar.nome}
                </p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {[primeiroLugar.partido, primeiroLugar.cargo]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-4 font-mono text-4xl font-bold tabular-nums text-slate-100">
                  {primeiroLugar.nota.toFixed(1)}
                  <span className="ml-2 align-middle text-xs font-medium uppercase tracking-wider text-slate-400">
                    / 100
                  </span>
                </p>
                <p
                  className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_VISUAL[primeiroLugar.status].bg} ${STATUS_VISUAL[primeiroLugar.status].color} ${STATUS_VISUAL[primeiroLugar.status].border}`}
                >
                  <span aria-hidden="true">
                    {STATUS_VISUAL[primeiroLugar.status].emoji}
                  </span>
                  {STATUS_VISUAL[primeiroLugar.status].label}
                </p>
              </Link>
              <p className="mt-4 text-xs leading-relaxed text-slate-400">
                Primeiro colocado entre os que têm dados suficientes. A ordem
                muda conforme os ETLs atualizam a base — e qualquer pessoa pode
                recalcular.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
