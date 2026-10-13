import type { MetadataRoute } from "next";

/**
 * robots.txt do site.
 *
 * O que estava errado: não existia `robots.txt` nenhum. Em produção isso rende
 * 404 na rota mais consultada por crawlers, e deixa o comportamento de
 * indexação para o acaso — sem diretiva de sitemap e sem regra para as áreas
 * que não devem ser rastreadas.
 *
 * A plataforma existe para ser encontrada (auditoria pública de dados), então a
 * política é permissiva por padrão. As exceções são áreas de sessão e rotas de
 * API: não têm valor de busca e algumas devolvem dado por usuário.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.curriculopolitico.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Área autenticada: conteúdo por usuário, sem valor de indexação.
          "/conta",
          "/auth/",
          // API não é conteúdo; expor convida a crawl desnecessário.
          "/api/",
          // Formulário de retificação e consentimento: fluxos, não páginas.
          "/retificacao",
        ],
      },
    ],
    // Aponta para o índice. O Next, ao usar `generateSitemaps`, gera os
    // arquivos /sitemap/N.xml mas NÃO cria /sitemap.xml — então esse índice é
    // produzido por `src/app/sitemap.xml/route.ts`. Sem ele, o crawler teria
    // que adivinhar as URLs de cada arquivo.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
