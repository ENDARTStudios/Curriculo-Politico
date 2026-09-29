import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BillVote } from "@/components/BillVote";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Página de um Projeto de Lei: dados da proposição + votação popular
 * (camada de engajamento pessoal, separada do IDIP).
 */
export default async function ProjetoPage({ params }: Props) {
  const { id } = await params;

  const bill = await prisma.bill.findFirst({
    where: { OR: [{ id }, { externalId: id }] },
    include: {
      authorships: { include: { person: true }, take: 10 },
    },
  });

  if (!bill) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/ranking"
        className="mb-6 inline-block text-sm text-slate-400 transition hover:text-slate-100"
      >
        ← Voltar ao ranking
      </Link>

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
        </div>
        <h1 className="text-2xl font-bold leading-snug text-slate-100">
          {bill.title}
        </h1>

        {bill.authorships.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-300">Autores</h2>
            <div className="flex flex-wrap gap-2">
              {bill.authorships.map((a) => (
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

        {bill.externalId && (
          <a
            href={`https://dadosabertos.camara.leg.br/api/v2/proposicoes/${bill.externalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-xs text-sky-400 hover:underline"
          >
            Ver fonte original (Câmara dos Deputados) →
          </a>
        )}
      </div>

      <BillVote billId={bill.id} />

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        A votação popular é uma camada de engajamento pessoal e{" "}
        <strong className="text-slate-400">não altera a nota IDIP</strong> dos
        autores — conforme a{" "}
        <Link href="/metodologia" className="text-sky-400 hover:underline">
          Neutralidade Algorítmica
        </Link>
        .
      </p>
    </main>
  );
}
