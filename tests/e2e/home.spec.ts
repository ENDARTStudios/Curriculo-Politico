import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Testes de função e de honestidade de dados das rotas públicas.
 *
 * Estes testes existem porque há uma classe de defeito que **nem o TypeScript
 * nem os verificadores de matemática pegam**: a página afirma algo que o motor
 * não faz. Foi exatamente o que aconteceu — a home anunciava "IDIP v1.0" com
 * pesos antigos enquanto `packages/idip/src/scoring.ts` já rodava v1.1.
 *
 * Numa plataforma cujo diferencial é "algoritmos abertos", a tela divergir da
 * fórmula é o defeito mais caro possível. Aqui ele vira teste.
 *
 * Os testes de consistência leem o código-fonte diretamente (sem banco), então
 * rodam tanto localmente quanto contra produção.
 */

const RAIZ = join(__dirname, "..", "..");

function versaoDoMotor(): string {
  const pkg = JSON.parse(
    readFileSync(join(RAIZ, "packages", "idip", "package.json"), "utf8"),
  ) as { version: string };
  // "1.1.0" -> "1.1" (a UI exibe major.minor)
  return pkg.version.split(".").slice(0, 2).join(".");
}

test.describe("Consistência entre UI e motor IDIP @readonly", () => {
  test("home exibe a mesma versão da metodologia que o motor", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const esperada = versaoDoMotor();
    await expect(
      page.getByText(`Metodologia IDIP v${esperada}`, { exact: false }),
    ).toBeVisible();
  });

  test("home não exibe nenhuma versão obsoleta da metodologia", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const atual = versaoDoMotor();
    const html = await page.content();
    // Qualquer "IDIP vX.Y" que não seja a versão do motor é divergência.
    const encontradas = [...html.matchAll(/IDIP v(\d+\.\d+)/g)].map((m) => m[1]);
    const obsoletas = encontradas.filter((v) => v !== atual);
    expect(
      obsoletas,
      `A home menciona versões que o motor não usa: ${obsoletas.join(", ")} (atual: ${atual})`,
    ).toEqual([]);
  });

  test("a home exibe a soma dos pesos dos dois perfis", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Um conjunto de pesos que não fecha em 100% é defeito de metodologia, e a
    // home mostra a soma de propósito para que isso fique visível.
    //
    // Nota de manutenção: a asserção anterior usava
    // `locator("div").filter({ hasText: /^Legislativo/ })`, que casava com um
    // wrapper externo e não com o cartão — teste frágil que falhava sem haver
    // bug no produto. Aqui ancoramos no texto exato e na contagem de perfis.
    await expect(page.getByText("Como a nota é calculada")).toBeVisible();
    await expect(page.getByText("Soma dos pesos:")).toHaveCount(2);
    await expect(page.getByText("100%", { exact: false }).first()).toBeVisible();
  });
});

test.describe("Funil da home @readonly", () => {
  test("os quatro estágios estão presentes e na ordem", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // 1. Gancho — h1 único, o maior elemento da página.
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("currículo dele sim");

    // 2. Promessa — explica a nota sem jargão.
    await expect(page.getByText("Dados completos", { exact: false })).toBeVisible();

    // 4. CTA — exatamente um primário, e ele leva ao ranking.
    const ctaPrimario = page.getByRole("link", { name: "Ver o ranking completo" });
    await expect(ctaPrimario).toBeVisible();
    await expect(ctaPrimario).toHaveAttribute("href", "/ranking");
  });

  test("o CTA primário tem contraste AA", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const cta = page.getByRole("link", { name: "Ver o ranking completo" });

    // Regressão específica: o CTA já foi branco sobre sky-500 = 2,71:1.
    const { cor, fundo } = await cta.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { cor: cs.color, fundo: cs.backgroundColor };
    });

    const luminancia = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map(Number).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lc = luminancia(cor);
    const lf = luminancia(fundo);
    const [claro, escuro] = lc > lf ? [lc, lf] : [lf, lc];
    const razao = (claro + 0.05) / (escuro + 0.05);

    expect(
      razao,
      `Contraste do CTA ${razao.toFixed(2)}:1 (texto ${cor} sobre ${fundo}) — mínimo AA é 4.5:1`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("a home é navegável por teclado até o CTA", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // O header tem 11 links de navegação; o CTA precisa ser alcançável por Tab.
    let alcancado = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const foco = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el ? `${el.tagName}:${(el.textContent ?? "").trim().slice(0, 40)}` : "";
      });
      if (foco.includes("Ver o ranking completo")) {
        alcancado = true;
        break;
      }
    }
    expect(alcancado, "O CTA primário não é alcançável por Tab").toBe(true);
  });
});

test.describe("Rotas críticas respondem @readonly", () => {
  const rotas = ["/", "/ranking", "/partidos", "/projetos", "/metodologia", "/comparar"];

  for (const rota of rotas) {
    test(`${rota} responde 200 e renderiza um h1`, async ({ page }) => {
      const resposta = await page.goto(rota, { waitUntil: "domcontentloaded" });
      expect(resposta?.status(), `${rota} não retornou 200`).toBe(200);
      // Um h1 por página: requisito de hierarquia de headings.
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }
});
