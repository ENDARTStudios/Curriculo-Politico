import { test, expect } from "@playwright/test";

/**
 * Testes de SEO e de estrutura de navegação.
 *
 * Existem porque o SEO de um site é fácil de quebrar em silêncio: um sitemap que
 * deixa de ser gerado, um canonical que some, ou a marca do header deixando de
 * voltar para a home não aparecem em nenhum teste de componente — e ninguém
 * percebe até o tráfego cair. Aqui viram regressão.
 *
 * Todos são `@readonly`: servem tanto contra o servidor local quanto contra o
 * deploy em produção.
 */

test.describe("SEO @readonly", () => {
  test("robots.txt existe e aponta para o índice do sitemap", async ({
    request,
  }) => {
    const r = await request.get("/robots.txt");
    expect(r.status()).toBe(200);
    const corpo = await r.text();

    // A diretiva Sitemap precisa anunciar o índice, não os arquivos internos.
    expect(corpo).toMatch(/^Sitemap:\s+\S+\/sitemap\.xml\s*$/m);
    // O site existe para ser encontrado: não pode bloquear tudo.
    expect(corpo).toMatch(/^Allow:\s*\/\s*$/m);
    // Área autenticada e API não devem ser rastreadas.
    expect(corpo).toMatch(/^Disallow:\s*\/conta\s*$/m);
    expect(corpo).toMatch(/^Disallow:\s*\/api\/\s*$/m);
  });

  test("sitemap.xml é um índice válido", async ({ request }) => {
    const r = await request.get("/sitemap.xml");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("xml");

    const xml = await r.text();
    // Precisa ser sitemapindex, não urlset: é o ponto de entrada do protocolo.
    expect(xml).toContain("<sitemapindex");
    expect(xml).not.toContain("<urlset");

    const arquivos = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(arquivos.length).toBeGreaterThan(0);
    // Todo arquivo anunciado precisa terminar em .xml e estar sob /sitemap/.
    for (const url of arquivos) {
      expect(url).toMatch(/\/sitemap\/\d+\.xml$/);
    }
  });

  test("o arquivo base do sitemap traz home, ranking e um perfil", async ({
    request,
  }) => {
    const r = await request.get("/sitemap/0.xml");
    expect(r.status()).toBe(200);
    const xml = await r.text();

    expect(xml).toContain("<urlset");
    // As rotas de maior valor de negócio precisam estar no índice.
    expect(xml).toMatch(/<loc>[^<]+\/<\/loc>/);
    expect(xml).toContain("/ranking</loc>");
    // Perfis de políticos são o conteúdo pelo qual alguém busca o site.
    expect(xml).toMatch(/<loc>[^<]+\/politicos\/[^<]+<\/loc>/);
    expect(xml).toMatch(/<loc>[^<]+\/partidos\/[^<]+<\/loc>/);
  });

  test("um arquivo de proposições traz apenas URLs de projetos", async ({
    request,
  }) => {
    const r = await request.get("/sitemap/1.xml");
    expect(r.status()).toBe(200);
    const xml = await r.text();

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    // O arquivo 1 não pode conter perfis: isso indicaria que a paginação
    // misturou os grupos e que o conteúdo está duplicado entre arquivos.
    for (const url of locs) {
      expect(url).toContain("/projetos/");
    }
  });

  test("sitemap fora da faixa devolve 404, não um XML vazio", async ({
    request,
  }) => {
    // Um sitemap vazio declarado é pior que ausente: o crawler o considera
    // válido e para de procurar.
    const r = await request.get("/sitemap/99999.xml");
    expect(r.status()).toBe(404);
  });

  test("existe favicon/ícone", async ({ request }) => {
    const r = await request.get("/icon.svg");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("svg");
  });

  test("a home declara canonical e Open Graph", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical, "a home não tem <link rel=canonical>").toBeTruthy();
    expect(canonical).toMatch(/^https?:\/\//);

    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content");
    expect(ogTitle, "a home não tem og:title").toBeTruthy();

    const ogLocale = await page
      .locator('meta[property="og:locale"]')
      .getAttribute("content");
    expect(ogLocale).toBe("pt_BR");
  });

  test("o título da home não duplica o sufixo do template", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const titulo = await page.title();
    // O template do layout adiciona "· Currículo Político"; se a página também
    // trouxer o nome, o resultado fica "Currículo Político · Currículo Político".
    const ocorrencias = (titulo.match(/Currículo Político/g) ?? []).length;
    expect(ocorrencias, `título duplicado: "${titulo}"`).toBeLessThanOrEqual(1);
  });
});

test.describe("Estrutura de navegação @readonly", () => {
  test("a marca no header volta para a home", async ({ page }) => {
    // A partir de uma página interna, o clique na marca precisa levar à home —
    // é o reflexo nº 1 de navegação e não depende de achar o menu.
    await page.goto("/ranking", { waitUntil: "domcontentloaded" });

    const marca = page.getByRole("link", {
      name: /Currículo Político — página inicial/i,
    });
    await expect(marca).toBeVisible();
    await expect(marca).toHaveAttribute("href", "/");

    await marca.click();
    await page.waitForURL((u) => new URL(u).pathname === "/");
    await expect(page.locator("h1")).toHaveCount(1);
  });
});
