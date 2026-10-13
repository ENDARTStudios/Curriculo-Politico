import type { Metadata } from "next";

/**
 * Metadata no layout porque `signin/page.tsx` é Client Component (usa `useState`
 * e `signIn` do next-auth) e o Next proíbe `export const metadata` em componente
 * cliente — o build quebra mesmo com o `tsc` limpo.
 *
 * `robots: index: false` de propósito: é fluxo de autenticação, não conteúdo.
 * Não tem valor de busca e não deve competir com as páginas públicas.
 */
export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta do Currículo Político.",
  alternates: { canonical: "/auth/signin" },
  robots: { index: false, follow: true },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
