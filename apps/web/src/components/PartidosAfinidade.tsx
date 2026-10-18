"use client";

import Link from "next/link";
import { LogoPartido } from "@/components/LogoPartido";
import { useT } from "@/lib/i18n/cliente";
import {
  calcularAfinidade,
  ladoEconomico,
  type PartidoAcervo,
} from "@/lib/afinidade-partidaria";
import type { Pontuacoes } from "@/lib/espectro";

/**
 * Partidos que se enquadram no espectro do usuário.
 *
 * ── O que este bloco NÃO faz ──────────────────────────────────────────────
 * Não diz "este partido é o seu". Diz **onde a classificação declarada do
 * partido fica no eixo econômico**, e o quanto isso está perto das respostas.
 * A diferença importa: uma plataforma que recomenda voto está fazendo política;
 * uma que mostra proximidade a partir de dado declarado está informando.
 *
 * ── Por que só o eixo econômico ───────────────────────────────────────────
 * O acervo guarda dos partidos uma classificação 1D (`position`), não uma posição
 * nos três eixos do teste. Usar o eixo econômico é defensável; inventar posição
 * sociocultural ou diplomática para 19 partidos seria fabricar dado político
 * sobre organizações reais. O bloco declara isso em vez de esconder.
 */
export function PartidosAfinidade({
  pontuacoes,
  partidos,
}: {
  pontuacoes: Pontuacoes;
  partidos: readonly PartidoAcervo[];
}) {
  const t = useT();
  const r = calcularAfinidade(pontuacoes, partidos);
  const lado = ladoEconomico(r.posicaoUsuario);

  const rotuloLado =
    lado === "igualdade"
      ? t("afinidade.ladoIgualdade")
      : lado === "mercado"
        ? t("afinidade.ladoMercado")
        : t("afinidade.ladoCentro");

  return (
    <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-50">
        {t("afinidade.titulo")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        {t("afinidade.lead", {
          posicao: r.posicaoUsuario > 0 ? `+${Math.round(r.posicaoUsuario)}` : String(Math.round(r.posicaoUsuario)),
          lado: rotuloLado,
        })}
      </p>

      {r.afinados.length === 0 ? (
        <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
          {t("afinidade.nenhum")}
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {r.afinados.map((p) => (
            <li
              key={p.acronym}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3"
            >
              <LogoPartido
                acronym={p.acronym}
                name={p.name}
                logoUrl={p.logoUrl}
                color={p.color}
                tamanho={36}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/partidos/${encodeURIComponent(p.acronym)}`}
                  className="block truncate text-sm font-semibold text-slate-100 hover:underline"
                >
                  {p.acronym}
                </Link>
                <div className="truncate text-xs text-slate-400">
                  {p.ideology ?? p.name}
                </div>
              </div>
              <span className="whitespace-nowrap text-xs tabular-nums text-slate-400">
                {t("afinidade.distancia", { n: Math.round(p.distancia) })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Transparência sobre o método — sem isto o bloco vira oráculo. */}
      <p className="mt-5 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-400">
        {t("afinidade.metodo")}
        {r.semClassificacao > 0 &&
          ` ${t("afinidade.semClassificacao", { n: r.semClassificacao })}`}
      </p>
    </section>
  );
}
