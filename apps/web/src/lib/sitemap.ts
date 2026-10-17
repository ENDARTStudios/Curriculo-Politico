import { prisma } from "@/lib/prisma";

/**
 * Dados e XML do sitemap.
 *
 * ── Por que não usamos `generateSitemaps` ───────────────────────────────────
 * A convenção do Next seria `src/app/sitemap.ts` com `generateSitemaps`. Foi
 * tentado e falhou de duas formas concretas, ambas verificadas neste projeto:
 *
 * 1. O Next gera `/sitemap/0.xml`, `/sitemap/1.xml`, … mas **não** gera
 *    `/sitemap.xml`. Confirmei no `app-paths-manifest.json`: só existia
 *    `/sitemap/[__metadata_id__]/route`. Isso deixa o crawler sem o ponto de
 *    entrada padrão do protocolo.
 * 2. Tentando resolver isso com um Route Handler em `app/sitemap.xml/route.ts`,
 *    o `/sitemap.xml` continuou servindo o **urlset** do `sitemap.ts` (id 0) —
 *    o arquivo de metadata tem precedência na rota e o handler era ignorado.
 *
 * Em vez de depender dessa precedência, controlamos o XML inteiro: o índice em
 * `/sitemap.xml` e cada arquivo em `/sitemap/{id}.xml`. É mais código, mas o
 * resultado é o que o protocolo define, e o comportamento é verificável.
 *
 * ── Contrato de falha ───────────────────────────────────────────────────────
 * As rotas dinâmicas vêm do banco, mas o sitemap não pode depender dele. Se a
 * consulta falhar (build sem `DATABASE_URL`, banco fora do ar), o índice e o
 * arquivo base ainda saem, com as rotas estáticas. Mesmo contrato de
 * `src/lib/hero-stats.ts`.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.curriculopolitico.org";

/** Proposições por arquivo. Mantém cada XML bem abaixo do limite de 50.000. */
export const PROPOSICOES_POR_ARQUIVO = 4_000;

export interface EntradaSitemap {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

/** Data de modificação padrão dos conjuntos que vêm de consulta agregada. */
function agora(): string {
  return new Date().toISOString();
}

export function urlDe(caminho: string): string {
  return `${SITE_URL}${caminho}`;
}

function entrada(
  caminho: string,
  priority: number,
  changefreq: string,
  lastmod?: Date,
): EntradaSitemap {
  return {
    loc: urlDe(caminho),
    lastmod: (lastmod ?? new Date()).toISOString(),
    changefreq,
    priority,
  };
}

/**
 * Rotas estáticas. A ordem reflete prioridade de negócio: o ranking é onde a
 * promessa da home se entrega.
 *
 * Não inclui `/politicos`: essa rota de lista não existe (só `/politicos/[id]`),
 * e anunciar apontaria o crawler para um 404.
 */
function estaticas(): EntradaSitemap[] {
  return [
    entrada("/", 1, "daily"),
    entrada("/ranking", 0.9, "daily"),
    entrada("/projetos", 0.8, "daily"),
    entrada("/partidos", 0.8, "weekly"),
    entrada("/comparar", 0.7, "weekly"),
    entrada("/ranking/personalizado", 0.6, "weekly"),
    entrada("/espectro", 0.6, "monthly"),
    entrada("/metodologia", 0.8, "monthly"),
    entrada("/como-funciona", 0.7, "monthly"),
    entrada("/stf", 0.6, "weekly"),
    entrada("/historia", 0.6, "monthly"),
    entrada("/calendario-eleitoral", 0.6, "weekly"),
    entrada("/faq", 0.6, "monthly"),
    entrada("/sobre", 0.5, "monthly"),
    entrada("/apoie", 0.4, "monthly"),
    entrada("/contato", 0.3, "yearly"),
    entrada("/termos-de-uso", 0.2, "yearly"),
    entrada("/privacidade", 0.2, "yearly"),
    entrada("/lgpd", 0.2, "yearly"),
    entrada("/cookies", 0.2, "yearly"),
  ];
}

/**
 * Quantos arquivos existem. O `0` é o arquivo base (estáticas + perfis +
 * partidos); os demais são blocos de proposições.
 */
export async function calcularIds(): Promise<number[]> {
  let paginas = 1;
  try {
    const total = await prisma.bill.count();
    paginas = Math.max(1, Math.ceil(total / PROPOSICOES_POR_ARQUIVO));
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : JSON.stringify(erro);
    console.warn(
      "[sitemap] contagem de proposições falhou; gerando apenas o arquivo base:",
      detalhe,
    );
  }
  return Array.from({ length: paginas + 1 }, (_, id) => id);
}

/** Entradas de um arquivo do sitemap. */
export async function entradasDoArquivo(
  id: number,
): Promise<EntradaSitemap[]> {
  if (id === 0) {
    try {
      const [pessoas, partidos] = await Promise.all([
        prisma.person.findMany({ select: { id: true } }),
        prisma.party.findMany({ select: { acronym: true } }),
      ]);
      return [
        ...estaticas(),
        ...pessoas.map((p) => entrada(`/politicos/${p.id}`, 0.7, "weekly")),
        ...partidos.map((p) =>
          entrada(`/partidos/${encodeURIComponent(p.acronym)}`, 0.6, "weekly"),
        ),
      ];
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : JSON.stringify(erro);
      console.warn(
        "[sitemap] perfis/partidos indisponíveis; apenas rotas estáticas:",
        detalhe,
      );
      return estaticas();
    }
  }

  const pular = (id - 1) * PROPOSICOES_POR_ARQUIVO;
  try {
    const proposicoes = await prisma.bill.findMany({
      select: { id: true, externalId: true, date: true },
      orderBy: { id: "asc" },
      skip: pular,
      take: PROPOSICOES_POR_ARQUIVO,
    });
    // A rota aceita `id` ou `externalId`; usar o mesmo critério dos links da
    // interface (`externalId ?? id`) evita anunciar uma URL duplicada.
    return proposicoes.map((b) =>
      entrada(`/projetos/${b.externalId ?? b.id}`, 0.5, "monthly", b.date ?? undefined),
    );
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : JSON.stringify(erro);
    console.warn(`[sitemap] proposições (arquivo ${id}) indisponíveis:`, detalhe);
    return [];
  }
}

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Serializa um arquivo de sitemap (urlset). */
export function xmlDoUrlset(entradas: EntradaSitemap[]): string {
  const urls = entradas
    .map(
      (e) =>
        `  <url>\n` +
        `    <loc>${escaparXml(e.loc)}</loc>\n` +
        `    <lastmod>${e.lastmod}</lastmod>\n` +
        `    <changefreq>${e.changefreq}</changefreq>\n` +
        `    <priority>${e.priority.toFixed(1)}</priority>\n` +
        `  </url>`,
    )
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  );
}

/** Serializa o índice (sitemapindex) que aponta para cada arquivo. */
export function xmlDoIndice(ids: number[]): string {
  const carimbo = agora();
  const arquivos = ids
    .map(
      (id) =>
        `  <sitemap>\n` +
        `    <loc>${escaparXml(urlDe(`/sitemap/${id}.xml`))}</loc>\n` +
        `    <lastmod>${carimbo}</lastmod>\n` +
        `  </sitemap>`,
    )
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${arquivos}\n` +
    `</sitemapindex>\n`
  );
}

export const CABEÇALHO_XML = {
  "Content-Type": "application/xml; charset=utf-8",
  // O sitemap muda pouco e é caro de montar (varre o catálogo): vale cache de
  // borda com revalidação em segundo plano.
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
} as const;
