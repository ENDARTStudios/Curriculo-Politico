import { test, expect } from "@playwright/test";

/**
 * Regras de formulário do §6 do documento de identidade, verificadas por
 * comportamento.
 *
 * ── Por que este teste existe ───────────────────────────────────────────────
 * O `verify:formularios` garante que todo controle tem **nome acessível**, mas
 * nome acessível não é suficiente: um campo pode ter rótulo e ainda assim não
 * dizer *o que está errado nele*. A regra seguinte — `aria-invalid` +
 * `aria-describedby` — só é verificável executando o formulário.
 *
 * Antes disso, `/retificacao` mostrava uma única mensagem no topo do formulário.
 * Para quem usa leitor de tela, isso é a diferença entre "corrija o formulário" e
 * "o campo E-mail está inválido".
 */
test.describe("Formulário de retificação @readonly", () => {
  test("erro é anunciado por campo, com foco no primeiro inválido", async ({ page }) => {
    await page.goto("/retificacao", { waitUntil: "networkidle" });

    // Envio com campos vazios: a validação do cliente assume antes da API.
    await page.getByRole("button", { name: /enviar solicitação/i }).click();

    const nome = page.locator("#solicitante");
    await expect(nome).toHaveAttribute("aria-invalid", "true");
    await expect(nome).toHaveAttribute("aria-describedby", "erro-solicitante");

    // O texto do erro existe, é o do campo e é uma região viva.
    const mensagem = page.locator("#erro-solicitante");
    await expect(mensagem).toBeVisible();
    await expect(mensagem).toHaveAttribute("role", "alert");

    // Foco no primeiro inválido: o teclado e o leitor seguem o foco.
    await expect(nome).toBeFocused();

    // Os demais campos também são marcados.
    await expect(page.locator("#email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#dado")).toHaveAttribute("aria-invalid", "true");
  });

  test("o erro do campo some quando a pessoa corrige", async ({ page }) => {
    await page.goto("/retificacao", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /enviar solicitação/i }).click();

    const email = page.locator("#email");
    await expect(email).toHaveAttribute("aria-invalid", "true");

    await email.fill("pessoa@exemplo.com");
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#erro-email")).toHaveCount(0);
  });

  test("o botão de envio não está desabilitado preventivamente", async ({ page }) => {
    await page.goto("/retificacao", { waitUntil: "networkidle" });

    // `disabled` remove o controle da árvore de acessibilidade e esconde a razão
    // do bloqueio. O botão precisa estar disponível; a validação explica o resto.
    const botao = page.getByRole("button", { name: /enviar solicitação/i });
    await expect(botao).toBeEnabled();
  });
});
