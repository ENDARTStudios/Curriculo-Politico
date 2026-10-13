import { test, expect } from "@playwright/test";

/**
 * Auditoria de acessibilidade com axe-core nas páginas de maior tráfego.
 *
 * ── Por que este é o teste mais valioso do conjunto ─────────────────────────
 * "Acessibilidade AA é requisito" está no `AGENTS.md`, mas até agora não havia
 * **nenhum** gate automatizado para isso — a conformidade dependia de leitura
 * humana. Uma varredura do detector já encontrou duas falhas reais de contraste
 * que passaram despercebidas (CTA do hero a 2,71:1 e `text-slate-500` a 4,23:1
 * em 167 lugares). Este teste transforma isso em regressão impossível.
 *
 * ── Detalhe que quase todos erram ───────────────────────────────────────────
 * O exemplo da documentação do Playwright usa apenas
 * `wcag2a, wcag2aa, wcag21a, wcag21aa` — isso é **WCAG 2.1**, não 2.2. Como o
 * requisito do projeto é 2.2 AA, a tag `wcag22aa` precisa estar na lista, senão
 * o teste dá uma falsa sensação de conformidade.
 *
 * ── Limite honesto ──────────────────────────────────────────────────────────
 * Teste automatizado detecta uma minoria dos problemas de acessibilidade
 * (ordem de grandeza: um terço) e não cobre regiões ocultas — modais, menus
 * fechados, conteúdo que exige interação. Ele é um piso, não uma certificação.
 */

const TAGS_WCAG22AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function auditar(page: import("@playwright/test").Page) {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  return new AxeBuilder({ page }).withTags(TAGS_WCAG22AA).analyze();
}

function resumir(violacoes: Awaited<ReturnType<typeof auditar>>["violations"]) {
  return violacoes
    .map((v) => {
      const alvos = v.nodes
        .slice(0, 3)
        .map((n) => `      ${n.target.join(" ")}`)
        .join("\n");
      return `  [${v.impact ?? "n/a"}] ${v.id} — ${v.help}\n${alvos}`;
    })
    .join("\n");
}

test.describe("Acessibilidade WCAG 2.2 AA @readonly", () => {
  test("home não tem violações", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const r = await auditar(page);
    expect(r.violations.length, `Violações:\n${resumir(r.violations)}`).toBe(0);
  });

  test("ranking não tem violações", async ({ page }) => {
    await page.goto("/ranking", { waitUntil: "networkidle" });
    const r = await auditar(page);
    expect(r.violations.length, `Violações:\n${resumir(r.violations)}`).toBe(0);
  });

  test("metodologia não tem violações", async ({ page }) => {
    await page.goto("/metodologia", { waitUntil: "networkidle" });
    const r = await auditar(page);
    expect(r.violations.length, `Violações:\n${resumir(r.violations)}`).toBe(0);
  });
});
