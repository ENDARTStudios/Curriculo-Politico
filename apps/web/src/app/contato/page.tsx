import type { Metadata } from "next";
import Link from "next/link";
import { CONTATO, mailto } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Contato — Currículo Político",
  description:
    "Canais oficiais do Currículo Político: retificação de dados, privacidade e DPO, imprensa, suporte, colaboração open source e segurança.",
};

export default function ContatoPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Fale Conosco
      </h1>
      <p className="mt-2 text-slate-400">
        Canais oficiais de comunicação do Currículo Político.
      </p>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-2 text-xl font-bold text-slate-100">
            ⚖️ Retificação de Dados
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Se você é um político ou assessor e identificou dados incorretos em
            um perfil, use o canal dedicado de retificação.
          </p>
          <Link
            href="/retificacao"
            className="inline-block rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
          >
            Solicitar Retificação
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-2 text-xl font-bold text-slate-100">
            🔐 Privacidade e Dados (DPO)
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Encarregado pelo Tratamento de Dados Pessoais:{" "}
            <strong className="text-slate-300">{CONTATO.encarregado}</strong>.
            Para exercer direitos do titular (LGPD, Art. 18), tirar dúvidas
            sobre tratamento de dados ou reportar incidente de privacidade.
          </p>
          <p className="text-sm text-slate-400">
            <a
              href={mailto(CONTATO.privacidade)}
              className="text-sky-400 hover:underline"
            >
              {CONTATO.privacidade}
            </a>{" "}
            · direitos do titular:{" "}
            <a
              href={mailto(CONTATO.direitos)}
              className="text-sky-400 hover:underline"
            >
              {CONTATO.direitos}
            </a>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-2 text-xl font-bold text-slate-100">📰 Imprensa</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Para entrevistas, dados ou informações sobre o projeto, entre em
            contato pelo e-mail oficial.
          </p>
          <a
            href={mailto(CONTATO.geral)}
            className="text-sky-400 hover:underline"
          >
            {CONTATO.geral}
          </a>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-2 text-xl font-bold text-slate-100">
            🧾 Suporte e Doações
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Problemas com a conta, dúvidas de uso e reembolso de doações — que é
            integral e sem exigência de justificativa em até 7 dias.
          </p>
          <p className="text-sm text-slate-400">
            <a
              href={mailto(CONTATO.suporte)}
              className="text-sky-400 hover:underline"
            >
              {CONTATO.suporte}
            </a>{" "}
            · reembolso:{" "}
            <a
              href={mailto(CONTATO.reembolso)}
              className="text-sky-400 hover:underline"
            >
              {CONTATO.reembolso}
            </a>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-2 text-xl font-bold text-slate-100">🤝 Colaboração</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            O Currículo Político é open source. Contribua com código, dados ou
            documentação.
          </p>
          <a
            href="https://github.com/ENDARTStudios/Curriculo-Politico"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            GitHub →
          </a>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-2 text-xl font-bold text-slate-100">🔒 Segurança</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Encontrou uma vulnerabilidade? Reporte de forma responsável.
          </p>
          <a
            href={mailto(CONTATO.seguranca)}
            className="text-sky-400 hover:underline"
          >
            {CONTATO.seguranca}
          </a>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h3 className="mb-2 font-semibold text-slate-100">
            📋 SLA de Resposta
          </h3>
          <ul className="space-y-1 text-sm text-slate-400">
            <li>• <strong className="text-slate-200">Retificações:</strong> até 72 horas úteis</li>
            <li>• <strong className="text-slate-200">Direitos do titular (LGPD):</strong> até 15 dias (Art. 19)</li>
            <li>• <strong className="text-slate-200">Imprensa:</strong> até 48 horas úteis</li>
            <li>• <strong className="text-slate-200">Vulnerabilidades:</strong> até 24 horas</li>
            <li>• <strong className="text-slate-200">Colaborações:</strong> revisão em até 7 dias</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
