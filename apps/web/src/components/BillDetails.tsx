import type { Bill, BillAuthorship, Person } from "@prisma/client";
import Link from "next/link";

interface BillDetailsProps {
  bill: Bill;
  authorships: Array<BillAuthorship & { person: Person }>;
}

/**
 * Corpo do projeto: título, resumo temático em linguagem simples, impacto
 * ao cidadão e pontos-chave. Os resumos são POR CATEGORIA (template da tag),
 * rotulados como tal — não são análise do conteúdo individual da lei.
 */
export function BillDetails({ bill, authorships }: BillDetailsProps) {
  const keyPoints = (bill.keyPoints as string[] | null) ?? [];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {bill.type && (
          <span className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-300">
            {bill.type}
          </span>
        )}
        {bill.date && (
          <span className="text-xs text-slate-500">
            Apresentado em {new Date(bill.date).toLocaleDateString("pt-BR")}
          </span>
        )}
        {bill.externalId && (
          <a
            href={`https://dadosabertos.camara.leg.br/api/v2/proposicoes/${bill.externalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-400 hover:underline"
          >
            fonte original →
          </a>
        )}
      </div>

      <h1 className="text-2xl font-bold leading-snug text-slate-100">
        {bill.title}
      </h1>

      {bill.simpleSummary && (
        <div className="mt-6 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-sky-300">
            📖 Resumo em Linguagem Simples
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">
            {bill.simpleSummary}
          </p>
          <p className="mt-2 text-xs italic text-slate-500">
            Resumo pela categoria temática do projeto (não é análise do texto
            integral da lei).
          </p>
        </div>
      )}

      {bill.citizenImpact && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-300">
            👥 Como Pode Afetar o Cidadão
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">
            {bill.citizenImpact}
          </p>
        </div>
      )}

      {keyPoints.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-lg font-semibold text-slate-100">
            Principais Pontos
          </h3>
          <ul className="space-y-2">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 text-sky-400">•</span>
                <span className="text-slate-400">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {authorships.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Autores</h3>
          <div className="flex flex-wrap gap-2">
            {authorships.map((a) => (
              <Link
                key={a.id}
                href={`/politicos/${a.person.id}`}
                className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm text-slate-300 transition hover:text-slate-100"
              >
                {a.person.politicalName}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
