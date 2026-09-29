"use client";

import { useState } from "react";

/**
 * Canal de retificação (SECURITY_BASELINE.md §3 — Direito de Resposta).
 * Sem backend nesta fase: o formulário monta um mailto com todo o contexto
 * se NEXT_PUBLIC_RETIFICACAO_EMAIL estiver definido; caso contrário, exibe
 * honestamente que o canal de e-mail ainda está em configuração.
 */
const DESTINATARIO = process.env.NEXT_PUBLIC_RETIFICACAO_EMAIL;

export default function RetificacaoPage() {
  const [nome, setNome] = useState("");
  const [dado, setDado] = useState("");
  const [fonte, setFonte] = useState("");

  const preenchido = nome.trim() && dado.trim() && fonte.trim();
  const assunto = encodeURIComponent(`[Retificação de dados] ${nome || "—"}`);
  const corpo = encodeURIComponent(
    `Político: ${nome}\n\nDado incorreto:\n${dado}\n\nFonte oficial corrigida:\n${fonte}\n\n—\nSolicitação via /retificacao (Currículo Político)`,
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Solicitar Retificação de Dados
      </h1>
      <p className="mt-2 text-slate-400">
        Se você é um político ou assessor e identificou dados incorretos em um
        perfil, preencha os campos abaixo. A correção é feita com base na{" "}
        <strong className="text-slate-200">fonte oficial</strong> — comprovada
        documentalmente, o dado é atualizado em até 72 horas úteis.
      </p>

      <div className="mt-8 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div>
          <label htmlFor="nome" className="mb-1 block text-sm font-medium text-slate-300">
            Nome do político
          </label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            placeholder="Nome de urna"
          />
        </div>
        <div>
          <label htmlFor="dado" className="mb-1 block text-sm font-medium text-slate-300">
            Dado incorreto
          </label>
          <textarea
            id="dado"
            rows={4}
            value={dado}
            onChange={(e) => setDado(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            placeholder="Descreva qual informação está incorreta e por quê"
          />
        </div>
        <div>
          <label htmlFor="fonte" className="mb-1 block text-sm font-medium text-slate-300">
            Link da fonte oficial corrigida
          </label>
          <input
            id="fonte"
            type="url"
            value={fonte}
            onChange={(e) => setFonte(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none"
            placeholder="https://..."
          />
        </div>

        {DESTINATARIO ? (
          <a
            href={`mailto:${DESTINATARIO}?subject=${assunto}&body=${corpo}`}
            className={`inline-block rounded-lg px-6 py-2 font-medium transition ${
              preenchido
                ? "bg-sky-500 text-slate-950 hover:bg-sky-400"
                : "pointer-events-none bg-slate-700 text-slate-400"
            }`}
            aria-disabled={!preenchido}
          >
            Enviar solicitação por e-mail
          </a>
        ) : (
          <div>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-slate-700 px-6 py-2 font-medium text-slate-400"
            >
              Enviar solicitação
            </button>
            <p className="mt-3 text-xs leading-relaxed text-amber-300/80">
              O canal por e-mail ainda está em configuração nesta fase. A
              estrutura acima já define os três elementos exigidos para análise:
              identificação, descrição do dado e fonte oficial corrigida.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Como analisamos</h2>
        <ol className="space-y-2 text-sm text-slate-400">
          <li>1. Verificamos a fonte oficial indicada.</li>
          <li>2. Atualizamos o registro no pipeline (com nova data de coleta).</li>
          <li>3. A nota é recalculada e versionada — nunca editada manualmente.</li>
        </ol>
        <p className="mt-3 text-xs italic text-slate-500">
          Registros judiciais arquivados ou com absolvição já são ocultados
          automaticamente do perfil público, conforme nossa política de LGPD.
        </p>
      </div>
    </main>
  );
}
