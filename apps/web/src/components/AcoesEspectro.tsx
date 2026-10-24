"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/cliente";
import { VERSAO_MODELO, type Pontuacoes } from "@/lib/espectro";

/**
 * Ações do resultado do espectro: salvar, baixar e compartilhar.
 *
 * ── Por que as três juntas ─────────────────────────────────────────────────
 * São o mesmo gesto em três formatos: guardar para depois, guardar fora do site
 * e mostrar para alguém. Separar em lugares diferentes da tela faria a pessoa
 * procurar o que já está na frente dela.
 *
 * ── Sobre "baixar" ─────────────────────────────────────────────────────────
 * Geramos um `.json` com os eixos e a versão do questionário, no próprio
 * navegador, via `Blob`. Não é PDF: um PDF exigiria uma biblioteca de renderização
 * (peso e mais uma dependência) e o dado exportado é o que interessa — o desenho
 * já está na tela.
 *
 * ── Sobre "compartilhar" ───────────────────────────────────────────────────
 * Usa `navigator.share` quando existe (celular) e cai para copiar o link no
 * desktop. O link leva a `/espectro`, não ao resultado: a posição política é dado
 * sensível e o projeto não publica a de ninguém sem ação explícita.
 */
export function AcoesEspectro({ pontuacoes }: { pontuacoes: Pontuacoes }) {
  const t = useT();
  const [estado, setEstado] = useState<"parado" | "salvando" | "salvo">("parado");
  const [recado, setRecado] = useState<string | null>(null);

  async function salvar() {
    setRecado(null);
    setEstado("salvando");
    try {
      const resposta = await fetch("/api/espectro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: pontuacoes, versao: VERSAO_MODELO }),
      });

      if (resposta.status === 401) {
        setEstado("parado");
        setRecado(t("espectro.entrarParaSalvar"));
        return;
      }
      if (!resposta.ok) {
        const dados = (await resposta.json().catch(() => ({}))) as { message?: string };
        setEstado("parado");
        setRecado(dados.message ?? t("espectro.erroSalvar"));
        return;
      }

      setEstado("salvo");
    } catch {
      setEstado("parado");
      setRecado(t("espectro.erroSalvar"));
    }
  }

  function baixar() {
    const conteudo = JSON.stringify(
      {
        versao: VERSAO_MODELO,
        eixos: pontuacoes,
        escala: "cada eixo vai de -100 a +100",
        geradoEm: new Date().toISOString(),
        fonte: "Currículo Político — /espectro",
      },
      null,
      2,
    );

    const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `espectro-politico-v${VERSAO_MODELO}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function compartilhar() {
    const url = `${window.location.origin}/espectro`;
    const titulo = "Currículo Político";

    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        return;
      } catch {
        // Cancelar o compartilhamento nativo não é erro — cai para copiar.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setRecado(t("espectro.copiado"));
    } catch {
      setRecado(url);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={estado === "salvando" || estado === "salvo"}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
        >
          {estado === "salvo" ? t("espectro.salvo") : t("espectro.salvar")}
        </button>

        <button
          type="button"
          onClick={baixar}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          {t("espectro.baixar")}
        </button>

        <button
          type="button"
          onClick={compartilhar}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          {t("espectro.compartilhar")}
        </button>

        <Link href="/conta" className="text-sm text-sky-400 transition hover:text-sky-300">
          {t("conta.dashboard")} →
        </Link>
      </div>

      {recado && (
        <p role="status" className="mt-3 text-xs leading-relaxed text-slate-300">
          {recado}{" "}
          {recado === t("espectro.entrarParaSalvar") && (
            <Link href="/auth/signin?callbackUrl=/espectro" className="underline">
              {t("conta.entrar")}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
