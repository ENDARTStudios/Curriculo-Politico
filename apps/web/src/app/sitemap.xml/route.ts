import {
  CABEÇALHO_XML,
  calcularIds,
  xmlDoIndice,
} from "@/lib/sitemap";

/**
 * Índice do sitemap em `/sitemap.xml` — o ponto de entrada padrão que o
 * `robots.txt` anuncia.
 *
 * Ver a explicação completa em `@/lib/sitemap`: não usamos `generateSitemaps`
 * porque (1) ele não cria `/sitemap.xml` e (2) o arquivo de metadata tem
 * precedência sobre um Route Handler na mesma rota, então o handler era
 * ignorado e `/sitemap.xml` servia o urlset do id 0.
 *
 * Se o banco estiver indisponível, `calcularIds` devolve ao menos `[0]` e o
 * índice continua válido apontando para o arquivo base.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const ids = await calcularIds();
  return new Response(xmlDoIndice(ids), { headers: CABEÇALHO_XML });
}
