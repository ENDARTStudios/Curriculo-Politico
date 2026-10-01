"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Ações de conta: sair, revogar consentimento (dado sensível) e eliminar
 * a conta (Art. 18, VI LGPD — DELETE /api/account, cascade imediato).
 */
export function ContaAcoes({ consentido }: { consentido: boolean }) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function revogarConsentimento() {
    if (
      !confirm(
        "Revogar o consentimento elimina TODOS os seus votos na plataforma e impede novos votos até nova autorização. Continuar?",
      )
    )
      return;
    setEnviando(true);
    try {
      const res = await fetch("/api/consent", { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        setMensagem("Não foi possível revogar agora. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  async function eliminarConta() {
    const confirmacao = prompt(
      "Esta ação ELIMINA permanentemente sua conta e todos os dados pessoais vinculados (votos, consentimentos, sessões). " +
        "Digite ELIMINAR para confirmar:",
    );
    if (confirmacao !== "ELIMINAR") return;
    setEnviando(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        await signOut({ redirect: false });
        window.location.href = "/?conta=eliminada";
      } else {
        setMensagem("Não foi possível eliminar a conta agora. Tente novamente ou use /retificacao.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Ações</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Sair
        </button>
        {consentido && (
          <button
            type="button"
            onClick={revogarConsentimento}
            disabled={enviando}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            Revogar consentimento e apagar meus votos
          </button>
        )}
        <button
          type="button"
          onClick={eliminarConta}
          disabled={enviando}
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          Eliminar minha conta
        </button>
      </div>
      {mensagem && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {mensagem}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        A exclusão técnica da conta é imediata (cascade no banco); o prazo
        contratual máximo é de 30 dias, conforme a Política de Privacidade.
      </p>
    </section>
  );
}
