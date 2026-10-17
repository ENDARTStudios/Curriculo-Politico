"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  EIXOS_POR_ID,
  OPCOES_RESPOSTA,
  QUESTOES,
  type Resposta,
} from "@/lib/espectro";
import { EspectroResultado } from "@/components/EspectroResultado";

type Etapa = "intro" | "perguntas" | "resultado";

const TOTAL = QUESTOES.length;
/** Pausa após marcar a resposta, para o usuário ver a seleção antes de avançar. */
const PAUSA_AVANCO_MS = 350;

/**
 * Fluxo do teste de espectro: introdução → 24 perguntas → resultado.
 *
 * Toda a execução é client-side de propósito: opinião política é dado
 * pessoal sensível (LGPD, art. 5º, II), então as respostas vivem apenas no
 * estado do React — nada é enviado, salvo ou logado. Nem localStorage: a
 * aba fechada, o dado some.
 */
export function EspectroQuiz() {
  const [etapa, setEtapa] = useState<Etapa>("intro");
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, Resposta>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function aoResponder(valor: Resposta) {
    const questao = QUESTOES[indice];
    setRespostas((atual) => ({ ...atual, [questao.id]: valor }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (indice + 1 >= TOTAL) {
        setEtapa("resultado");
      } else {
        setIndice((i) => i + 1);
      }
    }, PAUSA_AVANCO_MS);
  }

  function aoVoltar() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIndice((i) => Math.max(0, i - 1));
  }

  function aoRefazer() {
    setRespostas({});
    setIndice(0);
    setEtapa("intro");
  }

  if (etapa === "resultado") {
    return <EspectroResultado respostas={respostas} aoRefazer={aoRefazer} />;
  }

  if (etapa === "intro") {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-100">Como funciona</h2>
        <ol className="mt-4 space-y-3 text-slate-300">
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-xs font-bold text-sky-300"
            >
              1
            </span>
            <span>
              Você responde <strong className="text-slate-100">{TOTAL} afirmações</strong>{" "}
              de política pública em uma escala de 5 pontos, de{" "}
              <em>discordo plenamente</em> a <em>concordo plenamente</em>.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-xs font-bold text-sky-300"
            >
              2
            </span>
            <span>
              Cada afirmação alimenta um de{" "}
              <strong className="text-slate-100">3 eixos</strong>: econômico
              (igualdade × mercado), sociocultural (autoridade × liberdade) e
              diplomático (nacionalismo × globalização).
            </span>
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-xs font-bold text-sky-300"
            >
              3
            </span>
            <span>
              No fim, você vê sua posição em um{" "}
              <strong className="text-slate-100">compasso político</strong>{" "}
              com gráficos — e por que o rótulo esquerda–direita conta só
              parte da história.
            </span>
          </li>
        </ol>

        <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm leading-relaxed text-slate-400">
          🔒 <strong className="text-slate-200">Privacidade:</strong> opinião
          política é dado sensível, então o teste roda{" "}
          <strong className="text-slate-200">inteiramente no seu navegador</strong>{" "}
          — as respostas não são enviadas, salvas ou compartilhadas. Levam
          cerca de 3 minutos.
        </p>

        <button
          type="button"
          onClick={() => setEtapa("perguntas")}
          className="mt-6 rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Começar o teste
        </button>
      </section>
    );
  }

  // ── Etapa: perguntas ────────────────────────────────────────────────────────
  const questao = QUESTOES[indice];
  const eixo = EIXOS_POR_ID[questao.eixo];
  const respondidas = indice;

  return (
    <section aria-live="polite" className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-300">
          Pergunta {indice + 1} de {TOTAL}
        </p>
        <p className="rounded-full border border-slate-700 px-3 py-0.5 text-xs uppercase tracking-wider text-slate-400">
          {eixo.nome}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Progresso do teste"
        aria-valuemin={0}
        aria-valuemax={TOTAL}
        aria-valuenow={respondidas}
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
          style={{ width: `${(respondidas / TOTAL) * 100}%` }}
        />
      </div>

      <fieldset className="mt-6">
        <legend className="text-xl font-semibold leading-snug text-slate-100 sm:text-2xl">
          {questao.texto}
        </legend>

        <div className="mt-5 space-y-2.5">
          {OPCOES_RESPOSTA.map((opcao) => (
            <label
              key={opcao.valor}
              className="flex cursor-pointer items-center rounded-lg border border-slate-700 px-4 py-3 text-slate-200 transition hover:border-slate-500 hover:text-white has-[:checked]:border-sky-400 has-[:checked]:bg-sky-500/10 has-[:checked]:text-sky-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-400 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-slate-950"
            >
              <input
                type="radio"
                name={`questao-${questao.id}`}
                value={opcao.valor}
                checked={respostas[questao.id] === opcao.valor}
                onChange={() => aoResponder(opcao.valor)}
                className="sr-only"
              />
              {opcao.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={aoVoltar}
          disabled={indice === 0}
          className="whitespace-nowrap rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-40"
        >
          ← Anterior
        </button>
        <p className="text-xs text-slate-400">
          Responder avança automaticamente.
        </p>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        🔒 Respostas processadas apenas no seu navegador.{" "}
        <Link href="/privacidade" className="text-sky-400 hover:text-sky-300">
          Saiba mais
        </Link>
      </p>
    </section>
  );
}
