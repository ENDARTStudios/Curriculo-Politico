import type { Metadata } from "next";

/**
 * Metadata mora no layout, não na página, porque `faq/page.tsx` é um Client
 * Component (`"use client"` — usa `useState` para abrir/fechar as perguntas) e o
 * Next **proíbe** exportar `metadata` de um componente cliente. O build falha
 * com "You are attempting to export metadata from a component marked with use
 * client", e o `tsc` não pega isso porque é uma regra do compilador do Next, não
 * do TypeScript.
 *
 * O layout é Server Component e envolve a página, então é o lugar correto para a
 * metadata da rota.
 */
export const metadata: Metadata = {
  title: "Perguntas Frequentes",
  description:
    "Como o IDIP é calculado, de onde vêm os dados, o que o Termômetro mede e por que a votação popular não altera a nota.",
  alternates: { canonical: "/faq" },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
