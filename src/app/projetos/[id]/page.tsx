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

      <BillDetails bill={bill} authorships={bill.authorships} />

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
