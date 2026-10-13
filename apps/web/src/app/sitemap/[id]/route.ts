import {
  CABEÇALHO_XML,
  entradasDoArquivo,
  xmlDoUrlset,
} from "@/lib/sitemap";

/**
 * Um arquivo do sitemap, em `/sitemap/{id}.xml`.
 *
 * Os ids válidos vêm de `calcularIds()` em `@/lib/sitemap`, que é a mesma fonte
 * usada pelo índice — assim é impossível o índice anunciar um arquivo que não
 * existe. Um id fora da faixa devolve 404 em vez de um XML vazio, porque um
 * sitemap vazio declarado é pior que ausente: o crawler marca como válido e
 * para de procurar.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: idBruto } = await params;
  const id = Number.parseInt(idBruto.replace(/\.xml$/, ""), 10);

  if (!Number.isFinite(id) || id < 0) {
    return new Response("Sitemap não encontrado", { status: 404 });
  }

  const entradas = await entradasDoArquivo(id);

  // Um arquivo de proposições vazio significa id além do catálogo; o arquivo 0
  // nunca é vazio porque sempre contém as rotas estáticas.
  if (id > 0 && entradas.length === 0) {
    return new Response("Sitemap não encontrado", { status: 404 });
  }

  return new Response(xmlDoUrlset(entradas), { headers: CABEÇALHO_XML });
}
