"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/cliente";

type Tipo = "POLITICIAN" | "PARTY" | "BILL";

/**
 * Botão de acompanhar.
 *
 * ── O que este componente não faz ──────────────────────────────────────────
 * Não decide sozinho que a pessoa pode acompanhar. O servidor é a autoridade:
 * devolve 401 sem sessão e 403 sem consentimento (LGPD Art. 11 — a lista de
 * políticos que alguém segue é opinião política). A interface só reage.
 *
 * ── Estado otimista, com recuo ─────────────────────────────────────────────
 * O botão muda na hora e volta se o servidor recusar. Sem isso, um clique parece
 * não ter feito nada enquanto a requisição viaja; com isso, o erro precisa ser
 * visível quando acontece — e é, com a razão do servidor.
 */
export function BotaoAcompanhar({
  tipo,
  alvoId,
  inicial,
  logado,
}: {
  tipo: Tipo;
  alvoId: string;
  inicial: boolean;
  logado: boolean;
}) {
  const t = useT();
  const [seguindo, setSeguindo] = useState(inicial);
  const [erro, setErro] = useState<{ mensagem: string; painel?: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  if (!logado) {
    return (
      <Link
        href={`/auth/signin?callbackUrl=${encodeURIComponent(`/`)}`}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
      >
        <Estrela preenchida={false} />
        {t("seguir.entrarPara")}
      </Link>
    );
  }

  function alternar() {
    const proximo = !seguindo;
    setErro(null);
    setSeguindo(proximo);

    iniciar(async () => {
      try {
        const resposta = proximo
          ? await fetch("/api/follow", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tipo, alvoId }),
            })
          : await fetch(
              `/api/follow?tipo=${tipo}&alvoId=${encodeURIComponent(alvoId)}`,
              { method: "DELETE" },
            );

        if (!resposta.ok) {
          const dados = (await resposta.json().catch(() => ({}))) as {
            message?: string;
            painel?: string;
          };
          setSeguindo(!proximo); // recua
          setErro({
            mensagem: dados.message ?? t("seguir.erro"),
            painel: dados.painel,
          });
        }
      } catch {
        setSeguindo(!proximo);
        setErro({ mensagem: t("seguir.erro") });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={alternar}
        disabled={pendente}
        aria-pressed={seguindo}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          seguindo
            ? "border border-sky-500/60 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
            : "bg-sky-500 text-slate-950 hover:bg-sky-400"
        }`}
      >
        <Estrela preenchida={seguindo} />
        {seguindo ? t("seguir.seguindo") : t("seguir.seguir")}
      </button>

      {erro && (
        <p role="alert" className="max-w-xs text-xs leading-relaxed text-amber-300">
          {erro.mensagem}{" "}
          {erro.painel && (
            <Link href={erro.painel} className="underline hover:text-amber-200">
              {t("conta.dashboard")}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

/** Estrela vazada/preenchida — o estado não depende só da cor. */
function Estrela({ preenchida }: { preenchida: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill={preenchida ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        d="M10 2.5l2.3 4.7 5.2.7-3.8 3.7.9 5.1L10 14.2l-4.6 2.5.9-5.1L2.5 7.9l5.2-.7z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
