import { test, expect } from "@playwright/test";

/**
 * Estados de sistema: carregamento e 404.
 *
 * ── Por que este arquivo existe ─────────────────────────────────────────────
 * `audit:visual` percorre as 28 rotas e roda axe nelas — mas sempre no estado
 * **final**. O esqueleto de `app/loading.tsx` existe por milissegundos e nunca
 * era visto por teste nenhum; o mesmo vale para o instante em que ele some.
 *
 * ── Como o carregamento é capturado de forma determinística ────────────────
 * Navegação **dura** com `waitUntil: "commit"`: o Next transmite o shell com o
 * `loading.tsx` antes de a página resolver, então o esqueleto está no DOM desde o
 * primeiro instante. Medido neste repositório: visível já na primeira sonda, e o
 * HTML transmitido contém "Carregando o conteúdo".
 *
 * A alternativa — atrasar a requisição RSC numa navegação cliente — **não
 * funciona**: o Next pré-carrega os links do header, a navegação é instantânea e o
 * esqueleto nunca chega a aparecer. Foi a primeira tentativa, e ela falhou em
 * silêncio (o teste "passaria" sem verificar nada).
 *
 * ── Nota sobre a fronteira de erro ─────────────────────────────────────────
 * `app/error.tsx` **não é coberto aqui**. Ele só renderiza quando um Server
 * Component lança, e não há rota que lance de propósito — abortar o RSC faz o Next
 * cair para navegação dura e a página resolve normalmente (verificado).
 *
 * Cobri-lo exigiria uma de duas coisas: um servidor de produção com o banco
 * inacessível, ou uma rota que lance sob flag de ambiente. Nenhuma das duas foi
 * feita, e inventar um teste que "passa" sem exercitar a fronteira seria pior que
 * a lacuna declarada.
 */

/** Rota que consulta o banco — garante que a página demora o suficiente para ver o esqueleto. */
const ROTA_COM_DADOS = "/politicos/cmun05bup0001esfcdgcfvfbz";

test.describe("Estado de carregamento @readonly", () => {
  test("o esqueleto aparece e é anunciado", async ({ page }) => {
    await page.goto(ROTA_COM_DADOS, { waitUntil: "commit" });

    // Região viva: quem usa leitor de tela precisa saber que algo está vindo.
    const status = page.getByRole("status").filter({ hasText: /Carregando/i });
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("aria-live", "polite");

    // O anúncio vem do **conteúdo**, não do nome acessível: `role="status"` não
    // deriva nome dos filhos (contents-based naming não se aplica a status).
    // A primeira versão deste teste usava `toHaveAccessibleName` e falhou com
    // string vazia — o teste estava errado sobre ARIA, o componente não.
    await expect(status).toHaveText(/Carregando o conteúdo/i);
  });

  test("o esqueleto dá lugar ao conteúdo", async ({ page }) => {
    await page.goto(ROTA_COM_DADOS, { waitUntil: "commit" });

    const status = page.getByRole("status").filter({ hasText: /Carregando/i });
    await expect(status).toBeVisible();

    // Quando o conteúdo chega, o esqueleto some: não pode ficar anunciando
    // "carregando" sobre uma página já renderizada.
    await expect(page.locator("h1")).toBeVisible({ timeout: 30_000 });
    await expect(status).toBeHidden();
  });
});

test.describe("Estado 404 @readonly", () => {
  test("oferece saída, não um beco sem saída", async ({ page }) => {
    const resposta = await page.goto("/rota-que-nao-existe-teste", {
      waitUntil: "networkidle",
    });
    expect(resposta?.status()).toBe(404);

    // Um 404 sem caminho de volta obriga a pessoa a editar a URL na mão.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/não existe/i);
    // Nomes exatos: `/página inicial/i` casava também com o aria-label da logo no
    // header ("Currículo Político — página inicial") e o locator entrava em modo
    // estrito com dois elementos.
    await expect(
      page.getByRole("link", { name: "Ver o ranking completo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ir para a página inicial" }),
    ).toBeVisible();
  });
});
