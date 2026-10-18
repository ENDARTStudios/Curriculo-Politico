import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BillVote } from "@/components/BillVote";
import { BillDetails } from "@/components/BillDetails";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Página de um Projeto de Lei: dados da proposição + votação popular
 * (camada de engajamento pessoal, separada do IDIP).
 */
/**
 * Metadata da proposição. Usa o resumo em linguagem simples quando existe —
 * é o texto escrito para o cidadão entender, então é o melhor candidato a
 * aparecer num resultado de busca.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const bill = await prisma.bill.findFirst({
    where: { OR: [{ id }, { externalId: id }] },
    select: {
      title: true,
      type: true,
      status: true,
      simpleSummary: true,
      citizenImpact: true,
    },
  });

  if (!bill) return { title: "Projeto não encontrado" };

  const base =
    bill.simpleSummary?.trim() ||
    bill.citizenImpact?.trim() ||
    `Situação: ${bill.status ?? "não informada"}.`;

  // Descrições de ~150-160 caracteres são o que os buscadores exibem sem
  // truncar; cortamos no limite de palavra para não terminar no meio.
  const descricao =
    base.length > 155 ? `${base.slice(0, 152).replace(/\s+\S*$/, "")}...` : base;

  return {
    title: bill.title,
    description: descricao,
    alternates: { canonical: `/projetos/${id}` },
  };
}

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
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* O pai de um projeto de lei é a lista de projetos, não o ranking: quem
          estava em `/projetos` e abriu um item precisa voltar para os filtros que
          aplicou, não recomeçar do ranking. */}
      <Link
        href="/projetos"
        className="mb-6 inline-block text-sm text-slate-400 transition hover:text-slate-100"
      >
        ← Voltar aos projetos
      </Link>

      <BillDetails bill={bill} authorships={bill.authorships} />

      <BillVote billId={bill.id} />

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
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
