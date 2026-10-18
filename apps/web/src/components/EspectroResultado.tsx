import Link from "next/link";
import { AcoesEspectro } from "@/components/AcoesEspectro";
import { PartidosAfinidade } from "@/components/PartidosAfinidade";
import type { PartidoAcervo } from "@/lib/afinidade-partidaria";
import {
  EIXOS,
  FAIXAS_CLASSICAS,
  VERSAO_MODELO,
  pontuar,
  quadrante,
  repartir,
  rotuloClassico,
  type Eixo,
  type Resposta,
} from "@/lib/espectro";

interface EspectroResultadoProps {
  respostas: Record<number, Resposta>;
  aoRefazer: () => void;
  partidos: PartidoAcervo[];
}

/**
 * Resultado do teste de espectro: compasso 2D (econômico × sociocultural),
 * barras por eixo e leitura clássica esquerda–direita.
 *
 * Regra de honestidade visual: todo número do gráfico também aparece como
 * texto — quem usa leitor de tela (ou navega sem gráficos) recebe a mesma
 * informação. Nenhuma posição recebe conotação boa/ruim: as cores seguem o
 * acento de marca (sky), nunca os estados do Termômetro.
 */
export function EspectroResultado({
  respostas,
  aoRefazer,
  partidos,
}: EspectroResultadoProps) {
  const pontuacoes = pontuar(respostas);
  const q = quadrante(pontuacoes.economico, pontuacoes.sociocultural);

  const eco = repartir(pontuacoes.economico);
  const socio = repartir(pontuacoes.sociocultural);
  const diplo = repartir(pontuacoes.diplomatico);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do resultado ------------------------------------------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-wider text-slate-400">
          Seu posicionamento
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          {q.nome}
        </h2>
        <p className="mt-3 leading-relaxed text-slate-300">{q.descricao}</p>
      </section>

      {/* Compasso 2D ------------------------------------------------------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h3 className="font-semibold text-slate-100">
          Compasso político — econômico × sociocultural
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          O ponto marca sua posição cruzando os dois eixos. O modelo clássico
          de uma dimensão só enxergaria a linha horizontal; o modelo
          multidimensional mostra o quadrante inteiro.
        </p>
        <div className="mt-4">
          <CompassoChart
            economico={pontuacoes.economico}
            sociocultural={pontuacoes.sociocultural}
          />
        </div>
      </section>

      {/* Barras por eixo ---------------------------------------------------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h3 className="font-semibold text-slate-100">Sua posição em cada eixo</h3>
        <div className="mt-6 space-y-8">
          <BarraEixo eixo={EIXOS[0]} valor={pontuacoes.economico} />
          <BarraEixo eixo={EIXOS[1]} valor={pontuacoes.sociocultural} />
          <BarraEixo eixo={EIXOS[2]} valor={pontuacoes.diplomatico} />
        </div>
      </section>

      {/* Leitura clássica ---------------------------------------------------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h3 className="font-semibold text-slate-100">
          E a leitura clássica: esquerda ou direita?
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          O rótulo de uma dimensão resume sobretudo o eixo econômico. Sua
          leitura clássica aproximada é{" "}
          <strong className="text-slate-200">
            {rotuloClassico(pontuacoes.economico)}
          </strong>{" "}
          — mas, como o mapa acima mostra, ela não registra onde você está nos
          eixos sociocultural e diplomático. É por isso que a ciência política
          moderna usa modelos multidimensionais.
        </p>
        <div className="mt-5">
          <EscalaClassica economico={pontuacoes.economico} />
        </div>
      </section>

      {/* Explicação dos eixos ------------------------------------------------ */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h3 className="font-semibold text-slate-100">O que cada eixo significa</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {EIXOS.map((eixo) => (
            <div
              key={eixo.id}
              className="rounded-lg border border-slate-800 bg-slate-950/40 p-4"
            >
              <h4 className="text-sm font-semibold text-slate-100">
                {eixo.nome}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {eixo.descricao}
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {eixo.poloNegativo.nome}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {eixo.poloNegativo.descricao}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {eixo.poloPositivo.nome}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {eixo.poloPositivo.descricao}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Como ler / limites --------------------------------------------------- */}
      <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-6 text-sm leading-relaxed text-slate-300">
        <h3 className="font-semibold text-sky-300">Como ler o resultado</h3>
        <p className="mt-2">
          O teste mede <strong className="text-slate-200">preferência declarada</strong>{" "}
          em 24 proposições simplificadas —{" "}
          {eco.negativo}% igualdade / {eco.positivo}% mercado,{" "}
          {socio.negativo}% autoridade / {socio.positivo}% liberdade e{" "}
          {diplo.negativo}% nacionalismo / {diplo.positivo}% globalização, no
          modelo de 3 eixos v{VERSAO_MODELO}. Nenhuma posição é melhor ou pior
          que outra; e nenhuma ideologia inteira cabe em 24 frases. Use o
          resultado como ponto de partida para estudar as propostas reais de
          quem pede seu voto.
        </p>
      </section>

      {/* Próximos passos ------------------------------------------------------ */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h3 className="text-xl font-bold tracking-tight text-slate-100">
          Agora que você sabe onde está…
        </h3>
        <p className="mt-2 leading-relaxed text-slate-300">
          …veja o que os políticos{" "}
          <strong className="text-slate-100">efetivamente fizeram</strong>. O
          ranking do IDIP é calculado apenas com dados públicos oficiais da
          Câmara, do Senado e do TSE — sua posição no teste não interfere em
          nenhuma nota.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            href="/ranking"
            className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Ver o ranking
          </Link>
          <Link
            href="/partidos"
            className="text-sky-400 transition hover:text-sky-300"
          >
            Explorar partidos
          </Link>
          <button
            type="button"
            onClick={aoRefazer}
            className="text-slate-400 transition hover:text-slate-200"
          >
            Responder novamente
          </button>
        </div>

        <AcoesEspectro pontuacoes={pontuacoes} />
      </section>

      {/* Partidos afins — depois do resultado e das ações, porque a pergunta
          "quais partidos combinam comigo" só faz sentido depois que a pessoa viu
          onde ela mesma ficou. */}
      <PartidosAfinidade pontuacoes={pontuacoes} partidos={partidos} />
    </div>
  );
}

/* ── Gráfico: compasso 2D ──────────────────────────────────────────────────── */

const TAM = 440;
const MARGEM = 84;
const LADO = TAM - 2 * MARGEM;

function CompassoChart({
  economico,
  sociocultural,
}: {
  economico: number;
  sociocultural: number;
}) {
  const eco = repartir(economico);
  const socio = repartir(sociocultural);

  const pontoX = MARGEM + ((economico + 100) / 200) * LADO;
  // Autoridade (-100) fica no topo, como no compasso clássico.
  const pontoY = MARGEM + ((sociocultural + 100) / 200) * LADO;

  const quadro = (v: number) => MARGEM + ((v + 100) / 200) * LADO;

  return (
    <svg
      viewBox={`0 0 ${TAM} ${TAM}`}
      role="img"
      aria-label={`Compasso político: ${eco.negativo}% igualdade, ${eco.positivo}% mercado no eixo econômico; ${socio.negativo}% autoridade, ${socio.positivo}% liberdade no eixo sociocultural.`}
      className="mx-auto h-auto w-full max-w-md"
    >
      <title>
        Sua posição: {eco.negativo}% igualdade / {eco.positivo}% mercado e{" "}
        {socio.negativo}% autoridade / {socio.positivo}% liberdade.
      </title>

      {/* Área do compasso */}
      <rect
        x={MARGEM}
        y={MARGEM}
        width={LADO}
        height={LADO}
        className="fill-slate-950/60 stroke-slate-700"
        strokeWidth={1}
      />

      {/* Linhas de grade a cada 50 pontos; os eixos centrais mais fortes */}
      {[-50, 0, 50].map((v) => (
        <line
          key={`h${v}`}
          x1={MARGEM}
          y1={quadro(v)}
          x2={MARGEM + LADO}
          y2={quadro(v)}
          className={v === 0 ? "stroke-slate-600" : "stroke-slate-800"}
          strokeWidth={1}
        />
      ))}
      {[-50, 0, 50].map((v) => (
        <line
          key={`v${v}`}
          x1={quadro(v)}
          y1={MARGEM}
          x2={quadro(v)}
          y2={MARGEM + LADO}
          className={v === 0 ? "stroke-slate-600" : "stroke-slate-800"}
          strokeWidth={1}
        />
      ))}

      {/* Rótulos dos quadrantes (estruturais, sem juízo) */}
      <g className="fill-slate-400 text-[11px]">
        <text x={MARGEM + 8} y={MARGEM + 18}>
          Igualdade
        </text>
        <text x={MARGEM + 8} y={MARGEM + 32}>
          Autoridade
        </text>
        <text x={MARGEM + LADO - 8} y={MARGEM + 18} textAnchor="end">
          Mercado
        </text>
        <text x={MARGEM + LADO - 8} y={MARGEM + 32} textAnchor="end">
          Autoridade
        </text>
        <text x={MARGEM + 8} y={MARGEM + LADO - 22}>
          Igualdade
        </text>
        <text x={MARGEM + 8} y={MARGEM + LADO - 8}>
          Liberdade
        </text>
        <text x={MARGEM + LADO - 8} y={MARGEM + LADO - 22} textAnchor="end">
          Mercado
        </text>
        <text x={MARGEM + LADO - 8} y={MARGEM + LADO - 8} textAnchor="end">
          Liberdade
        </text>
      </g>

      {/* Rótulos dos polos, fora do quadro */}
      <g className="fill-slate-300 text-[13px] font-semibold">
        <text x={TAM / 2} y={26} textAnchor="middle">
          Autoridade
        </text>
        <text x={TAM / 2} y={TAM - 12} textAnchor="middle">
          Liberdade
        </text>
        <text x={MARGEM - 10} y={MARGEM + LADO / 2 + 4} textAnchor="end">
          Igualdade
        </text>
        <text x={MARGEM + LADO + 10} y={MARGEM + LADO / 2 + 4} textAnchor="start">
          Mercado
        </text>
      </g>

      {/* Cruzeta do ponto */}
      <g className="stroke-sky-500/60" strokeDasharray="4 3" strokeWidth={1}>
        <line x1={MARGEM} y1={pontoY} x2={pontoX} y2={pontoY} />
        <line x1={pontoX} y1={MARGEM} x2={pontoX} y2={pontoY} />
      </g>

      {/* Ponto do usuário */}
      <circle
        cx={pontoX}
        cy={pontoY}
        r={9}
        className="fill-sky-400/40 motion-safe:animate-ping"
      />
      <circle
        cx={pontoX}
        cy={pontoY}
        r={8}
        fill="#38bdf8"
        stroke="#020617"
        strokeWidth={2.5}
      />
    </svg>
  );
}

/* ── Gráfico: barra bipolar por eixo ──────────────────────────────────────── */

function BarraEixo({ eixo, valor }: { eixo: Eixo; valor: number }) {
  const { negativo, positivo } = repartir(valor);
  const marcadorPct = (valor + 100) / 2;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-semibold text-slate-100">{eixo.nome}</h4>
        <p className="text-sm text-slate-300">
          <span className="font-bold text-slate-100">{negativo}%</span>{" "}
          {eixo.poloNegativo.nome} ·{" "}
          <span className="font-bold text-slate-100">{positivo}%</span>{" "}
          {eixo.poloPositivo.nome}
        </p>
      </div>
      <div className="relative mt-3 h-3 rounded-full bg-slate-800" aria-hidden="true">
        <div
          className="absolute top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-full bg-sky-400"
          style={{ left: `calc(${marcadorPct}% - 3px)` }}
        />
        <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 bg-slate-600" />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>← {eixo.poloNegativo.nome}</span>
        <span>{eixo.poloPositivo.nome} →</span>
      </div>
    </div>
  );
}

/* ── Gráfico: escala clássica de 5 faixas ─────────────────────────────────── */

const ROTULOS_CURTOS: Record<(typeof FAIXAS_CLASSICAS)[number], string> = {
  Esquerda: "Esq.",
  "Centro-esquerda": "C-esq.",
  Centro: "Centro",
  "Centro-direita": "C-dir.",
  Direita: "Dir.",
};

function EscalaClassica({ economico }: { economico: number }) {
  const ativa = rotuloClassico(economico);

  return (
    <div
      role="img"
      aria-label={`Escala clássica esquerda–direita: sua posição fica em ${ativa}.`}
    >
      <div className="flex gap-1">
        {FAIXAS_CLASSICAS.map((faixa) => {
          const destacada = faixa === ativa;
          return (
            <div
              key={faixa}
              aria-hidden="true"
              className={`flex-1 rounded-lg border px-1.5 py-3 text-center text-xs sm:px-2 lg:text-sm ${
                destacada
                  ? "border-sky-500/60 bg-sky-500/10 font-semibold text-sky-300"
                  : "border-slate-800 bg-slate-950/40 text-slate-400"
              }`}
            >
              {/* Em telas estreitas o rótulo completo não cabe nas 5 células;
                  a abreviação basta porque o rótulo completo está no texto acima. */}
              <span className="sm:hidden">{ROTULOS_CURTOS[faixa]}</span>
              <span className="hidden sm:inline">{faixa}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">
        Leitura aproximada a partir do eixo econômico — marcada em destaque.
      </p>
    </div>
  );
}
