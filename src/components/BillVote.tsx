"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { POLITICAL_CONSENT_TEXTO } from "@/lib/consent";

interface BillVoteProps {
  billId: string;
}

interface VoteState {
  favor: number;
  contra: number;
  me: { vote: string; consented: boolean } | null;
}

/**
 * Votação popular em projetos — camada de engajamento pessoal, separada
 * do IDIP (Neutralidade Algorítmica). Requer login + consentimento
 * ESPECÍFICO p/ dado sensível (opinião política, Art. 11 LGPD), concedido
 * e revogável na própria interface (revogação elimina os votos).
 */
export function BillVote({ billId }: BillVoteProps) {
  const { status } = useSession();
  const [state, setState] = useState<VoteState | null>(null);
  const [mostrarConsentimento, setMostrarConsentimento] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    fetch(`/api/bills/${billId}/vote`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setState({
            favor: data.favor,
            contra: data.contra,
            me: data.me ?? null,
          });
      })
      .catch(() => setState(null));
  }, [billId]);

  useEffect(carregar, [carregar]);

  async function votar(vote: "FAVOR" | "CONTRA") {
    setMensagem(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/bills/${billId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (res.ok) {
        setMostrarConsentimento(false);
        carregar();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data.error === "CONSENT_REQUIRED") {
          setMostrarConsentimento(true);
        } else {
          setMensagem(
            data.message ?? "Não foi possível registrar o voto agora.",
          );
        }
      }
    } finally {
      setEnviando(false);
    }
  }

  async function autorizarConsentimento() {
    setEnviando(true);
    try {
      const res = await fetch("/api/consent", { method: "POST" });
      if (res.ok) {
        setMostrarConsentimento(false);
      } else {
        setMensagem("Não foi possível registrar o consentimento.");
      }
    } finally {
      setEnviando(false);
    }
  }

  async function revogarConsentimento() {
    if (
      !confirm(
        "Revogar o consentimento elimina TODOS os seus votos na plataforma (em todos os projetos) e impede novos votos até nova autorização. Continuar?",
      )
    )
      return;
    setEnviando(true);
    try {
      const res = await fetch("/api/consent", { method: "DELETE" });
      if (res.ok) {
        setMostrarConsentimento(false);
        carregar();
      } else {
        setMensagem("Não foi possível revogar agora.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const total = state ? state.favor + state.contra : 0;
  const favorPct = total ? (state!.favor / total) * 100 : 50;
  const contraPct = total ? (state!.contra / total) * 100 : 50;
  const autenticado = status === "authenticated";
  const consentido = state?.me?.consented ?? false;

  return (
    <div className="my-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-slate-100">Votação Popular</h4>
        <span className="text-xs text-slate-500">{total} votos</span>
      </div>

      {/* Barra de progresso */}
      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="bg-emerald-500 transition-all" style={{ width: `${favorPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${contraPct}%` }} />
      </div>

      <div className="mb-4 flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-slate-400">
            A Favor: {state?.favor ?? 0} ({favorPct.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-slate-400">
            Contra: {state?.contra ?? 0} ({contraPct.toFixed(0)}%)
          </span>
        </div>
      </div>

      {autenticado ? (
        <>
          {state?.me && (
            <p className="mb-2 text-sm text-slate-300">
              Seu voto:{" "}
              <strong className={state.me.vote === "FAVOR" ? "text-emerald-400" : "text-red-400"}>
                {state.me.vote === "FAVOR" ? "👍 A Favor" : "👎 Contra"}
              </strong>{" "}
              <span className="text-xs text-slate-500">(alterável)</span>
            </p>
          )}

          {mostrarConsentimento && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-amber-100/90">
                <input
                  type="checkbox"
                  checked={aceito}
                  onChange={(e) => setAceito(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-amber-400"
                />
                <span>
                  {POLITICAL_CONSENT_TEXTO}{" "}
                  <Link href="/privacidade" className="underline hover:text-amber-50">
                    Detalhes na Política de Privacidade
                  </Link>
                  .
                </span>
              </label>
              <button
                type="button"
                disabled={!aceito || enviando}
                onClick={autorizarConsentimento}
                className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-40"
              >
                Autorizar e habilitar meu voto
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={enviando}
              onClick={() => votar("FAVOR")}
              className={`flex-1 rounded-lg px-4 py-2 font-semibold transition disabled:opacity-50 ${
                state?.me?.vote === "FAVOR"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              👍 A Favor
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => votar("CONTRA")}
              className={`flex-1 rounded-lg px-4 py-2 font-semibold transition disabled:opacity-50 ${
                state?.me?.vote === "CONTRA"
                  ? "bg-red-500 text-slate-950"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              👎 Contra
            </button>
          </div>

          {consentido && (
            <button
              type="button"
              onClick={revogarConsentimento}
              disabled={enviando}
              className="mt-2 text-xs text-slate-500 underline transition hover:text-slate-300"
            >
              Revogar consentimento e apagar meus votos
            </button>
          )}
        </>
      ) : (
        <div className="flex gap-2">
          <Link
            href="/auth/signin"
            className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-center font-semibold text-slate-200 transition hover:bg-slate-600"
          >
            Entrar para votar
          </Link>
        </div>
      )}

      {mensagem && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {mensagem}
        </p>
      )}

      <p className="mt-3 text-xs italic leading-relaxed text-slate-500">
        Voto pessoal requer login, conta com 24h+ (anti-bot) e consentimento
        específico para tratamento de opinião política (dado sensível) —
        revogável a qualquer momento.{" "}
        <strong className="text-slate-400">
          Esta votação não altera a nota IDIP do autor.
        </strong>
      </p>
    </div>
  );
}
