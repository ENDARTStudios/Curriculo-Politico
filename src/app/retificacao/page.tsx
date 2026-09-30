"use client";

import { useState } from "react";

/**
 * Canal de retificação e direitos do titular (LGPD Art. 18) — com backend:
 * POST /api/retificacao registra a solicitação e devolve protocolo
 * rastreável. Aberto a qualquer titular (usuários, agentes públicos,
 * assessores, terceiros afetados).
 */

const TIPOS = [
  { valor: "POLITICO", rotulo: "Sou o próprio agente político (ou assessoria)" },
  { valor: "USUARIO", rotulo: "Sou usuário cadastrado da plataforma" },
  { valor: "OUTRO", rotulo: "Outro tipo de solicitação (dados meus afetados)" },
] as const;

export default function RetificacaoPage() {
  const [tipo, setTipo] = useState<string>("POLITICO");
  const [solicitante, setSolicitante] = useState("");
  const [email, setEmail] = useState("");
  const [alvo, setAlvo] = useState("");
  const [dado, setDado] = useState("");
  const [fonte, setFonte] = useState("");
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Consulta de status
  const [consultaProtocolo, setConsultaProtocolo] = useState("");
  const [consultaEmail, setConsultaEmail] = useState("");
  const [statusResultado, setStatusResultado] = useState<string | null>(null);
  const [consultaErro, setConsultaErro] = useState<string | null>(null);

  const preenchido =
    solicitante.trim().length >= 3 &&
    email.trim() &&
    dado.trim().length >= 20;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/retificacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: solicitante,
          requesterEmail: email,
          targetType: tipo,
          targetName: alvo,
          description: dado,
          sourceUrl: fonte,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProtocolo(data.protocolo);
      } else {
        setErro(data.message ?? data.error ?? "Erro ao enviar solicitação.");
      }
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    setConsultaErro(null);
    setStatusResultado(null);
    try {
      const params = new URLSearchParams({
        protocolo: consultaProtocolo,
        email: consultaEmail,
      });
      const res = await fetch(`/api/retificacao?${params}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatusResultado(
          `Status: ${data.status} · Aberta em ${new Date(data.createdAt).toLocaleDateString("pt-BR")}`,
        );
      } else {
        setConsultaErro(data.message ?? "Solicitação não encontrada.");
      }
    } catch {
      setConsultaErro("Falha de conexão.");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Retificação e Direitos do Titular
      </h1>
      <p className="mt-2 text-slate-400">
        Canal para <strong className="text-slate-200">qualquer titular de dados</strong> —
        agentes públicos e assessorias, usuários cadastrados e terceiros —
        exercer os direitos do Art. 18 da LGPD: retificação, acesso,
        eliminação e demais solicitações.
      </p>

      {protocolo ? (
        <div className="mt-8 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6">
          <h2 className="text-lg font-semibold text-emerald-300">
            ✓ Solicitação registrada
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Protocolo:{" "}
            <strong className="font-mono text-lg text-emerald-300">{protocolo}</strong>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Guarde este número. Você pode acompanhar o status abaixo com o
            protocolo e o e-mail informado. Prazo de resposta: até 15 dias
            (Art. 19 LGPD). Retificações de dados públicos com comprovação na
            fonte oficial: até 72 horas úteis.
          </p>
          <button
            type="button"
            onClick={() => {
              setProtocolo(null);
              setDado("");
              setFonte("");
            }}
            className="mt-4 text-sm text-sky-400 underline hover:text-sky-300"
          >
            Nova solicitação
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-8 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div>
            <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-slate-300">
              Quem você é
            </label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={inputClass}
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="solicitante" className="mb-1 block text-sm font-medium text-slate-300">
              Seu nome completo
            </label>
            <input
              id="solicitante"
              type="text"
              required
              minLength={3}
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-300">
              Seu e-mail (para retorno)
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {tipo === "POLITICO" && (
            <div>
              <label htmlFor="alvo" className="mb-1 block text-sm font-medium text-slate-300">
                Nome de urna do político
              </label>
              <input
                id="alvo"
                type="text"
                value={alvo}
                onChange={(e) => setAlvo(e.target.value)}
                className={inputClass}
                placeholder="Ex.: nome como aparece no perfil"
              />
            </div>
          )}
          <div>
            <label htmlFor="dado" className="mb-1 block text-sm font-medium text-slate-300">
              Solicitação (dado incorreto, exclusão, acesso…)
            </label>
            <textarea
              id="dado"
              rows={4}
              required
              minLength={20}
              value={dado}
              onChange={(e) => setDado(e.target.value)}
              className={inputClass}
              placeholder="Descreva a solicitação e o motivo"
            />
          </div>
          <div>
            <label htmlFor="fonte" className="mb-1 block text-sm font-medium text-slate-300">
              Link da fonte oficial (opcional, acelera retificações)
            </label>
            <input
              id="fonte"
              type="url"
              value={fonte}
              onChange={(e) => setFonte(e.target.value)}
              className={inputClass}
              placeholder="https://..."
            />
          </div>

          {erro && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando || !preenchido}
            className="rounded-lg bg-sky-500 px-6 py-2 font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-40"
          >
            {enviando ? "Enviando…" : "Enviar solicitação"}
          </button>
          <p className="text-xs leading-relaxed text-slate-500">
            Os dados deste formulário (nome, e-mail e conteúdo da solicitação)
            são tratados exclusivamente para responder ao pedido, com base no
            Art. 18 da LGPD, e mantidos pelo prazo de resposta e eventual
            auditoria. Canal alternativo: dpo@curriculopolitico.org.
          </p>
        </form>
      )}

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-100">
          Consultar status de uma solicitação
        </h2>
        <form onSubmit={consultar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              required
              value={consultaProtocolo}
              onChange={(e) => setConsultaProtocolo(e.target.value)}
              className={inputClass}
              placeholder="Protocolo (RET-AAAA-XXXXXX)"
            />
            <input
              type="email"
              required
              value={consultaEmail}
              onChange={(e) => setConsultaEmail(e.target.value)}
              className={inputClass}
              placeholder="E-mail usado na solicitação"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Consultar
          </button>
          {statusResultado && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {statusResultado}
            </p>
          )}
          {consultaErro && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {consultaErro}
            </p>
          )}
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Como analisamos</h2>
        <ol className="space-y-2 text-sm text-slate-400">
          <li>1. Verificamos a identidade do titular e a solicitação.</li>
          <li>
            2. Para dados públicos: comprovada a fonte oficial, o registro é
            atualizado no pipeline (com nova data de coleta).
          </li>
          <li>
            3. A nota é recalculada e versionada — nunca editada manualmente.
          </li>
        </ol>
        <p className="mt-3 text-xs italic text-slate-500">
          Registros judiciais arquivados ou com absolvição já são ocultados
          automaticamente do perfil público, conforme nossa política de LGPD.
        </p>
      </div>
    </main>
  );
}
