import { test, expect } from "@playwright/test";

/**
 * Fronteira de erro (`app/error.tsx`), exercitada de verdade.
 *
 * ── Por que este arquivo tem config própria ────────────────────────────────
 * `error.tsx` só renderiza quando um Server Component lança. Não existe rota que
 * lance de propósito — e não deve existir: um caminho de falha no produto por
 * causa do teste é pior que a lacuna.
 *
 * A saída foi um `next dev` separado (`playwright.erro.config.ts`, porta 3034)
 * com `DATABASE_URL` apontando para uma porta sem listener. Toda página que
 * consulta o banco lança, e a fronteira entra em ação. É determinístico: não
 * depende de tempo, de corrida nem de violar uma conexão real.
 *
 * Fica fora de `tests/e2e` por dois motivos concretos: dois servidores simultâneos
 * levaram a suíte principal de 2,3 para 5,3 min e introduziram falhas por
 * contenção; e o CI roda o diretório principal com `--grep @readonly` **contra
 * produção**, onde esta expectativa falharia por motivo errado.
 *
 * ── O que já foi tentado e NÃO funciona ────────────────────────────────────
 * Abortar a requisição RSC durante navegação cliente. O Next detecta a falha e
 * cai para navegação dura; a página resolve normalmente e a fronteira nunca é
 * chamada. Verificado antes de escrever este teste.
 */
test.use({ baseURL: `http://localhost:${process.env.E2E_PORTA_ERRO ?? "3034"}` });

test.describe("Fronteira de erro @readonly", () => {
  test("mostra a falha, mantém a navegação e oferece recuperação", async ({ page }) => {
    await page.goto("/ranking", { waitUntil: "domcontentloaded" });

    // 1. O texto é honesto sobre o que aconteceu: falha de acesso ao dado, não
    //    bug do usuário nem "algo deu errado" genérico.
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveText(/não foi possível carregar/i, { timeout: 30_000 });

    // 2. O olho de seção em âmbar continua carregando significado: é falha, e a
    //    cor não é a única indicação.
    await expect(page.getByText(/falha ao carregar/i)).toBeVisible();

    // 3. A moldura do site permanece — a `global-error` substituiria o layout
    //    inteiro e deixaria a pessoa sem caminho de volta. Aqui o header existe.
    await expect(page.getByRole("link", { name: /página inicial/i }).first()).toBeVisible();

    // 4. Há saída explícita: tentar de novo e ver o estado da plataforma.
    //
    // Escopo em `main`: o rodapé também tem um link "Estado da plataforma", e
    // sem escopo o locator entra em modo estrito com dois elementos. Foi o
    // terceiro caso desta natureza na suíte — asserção de CTA de página precisa
    // de escopo, porque header e rodapé repetem os mesmos destinos.
    const conteudo = page.locator("main");
    await expect(
      conteudo.getByRole("button", { name: /tentar de novo/i }),
    ).toBeVisible();
    await expect(
      conteudo.getByRole("link", { name: /estado da plataforma/i }),
    ).toBeVisible();
  });

  test("a página de erro não expõe detalhe técnico cru", async ({ page }) => {
    await page.goto("/ranking", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    const corpo = await page.locator("main").innerText();

    // Stack trace, caminho de arquivo e string de conexão são vazamento, não
    // transparência. O `digest` do Next é identificador curto e pode aparecer.
    expect(corpo).not.toMatch(/at \w+ \(.*:\d+:\d+\)/);
    expect(corpo).not.toMatch(/\\node_modules\\|\/node_modules\//);
    expect(corpo).not.toMatch(/postgresql:\/\//);
  });
});
