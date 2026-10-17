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

  /*
    Páginas de formulário e de filtro.

    Estas ficaram fora da varredura original — e são justamente onde as regras do
    §6 do documento de identidade se aplicam: nome acessível do controle, erro
    anunciado, estado de carregamento. Auditar só páginas de leitura deixava o
    gate cego para a maior parte da superfície interativa.
  */
  const PAGINAS_COM_FORMULARIO = [
    { rota: "/retificacao", nome: "retificação (canal LGPD)" },
    { rota: "/auth/signin", nome: "entrada / cadastro" },
    { rota: "/comparar", nome: "comparação (filtros)" },
    { rota: "/projetos", nome: "projetos (filtros)" },
    { rota: "/partidos", nome: "partidos (índice)" },
  ];

  for (const { rota, nome } of PAGINAS_COM_FORMULARIO) {
    test(`${nome} não tem violações`, async ({ page }) => {
      await page.goto(rota, { waitUntil: "networkidle" });
      const r = await auditar(page);
      expect(r.violations.length, `Violações em ${rota}:\n${resumir(r.violations)}`).toBe(0);
    });
  }

  /*
    Região que só existe depois de interação.

    O dropdown de busca é renderizado com `{open && query.length >= 2 && ...}` — a
    varredura passiva **nunca o vê**.

    Este é o limite honesto do axe: ele audita o DOM no momento em que roda, então
    estado que exige ação precisa de teste que execute a ação.

    ── O que este teste pegou ──────────────────────────────────────────────────
    A primeira versão declarava `role="combobox"` no campo e `role="listbox"` no
    painel. Era inválido: `listbox` só aceita `option`/`group` como filhos, e o
    painel contém seções com título e `<a>`. O axe reprovou com
    `aria-required-children` assim que o painel abriu — a varredura passiva nunca
    teria visto.
  */
  test("dropdown de busca não tem violações", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const campo = page.getByRole("textbox", { name: /buscar políticos/i });
    await expect(campo).toHaveCount(1);

    // Duas letras: é o mínimo para o dropdown abrir.
    await campo.fill("si");
    const lista = page.locator("#busca-resultados");
    await expect(lista).toBeVisible();

    // O painel é uma lista de links agrupada, não um listbox de opções.
    await expect(lista).not.toHaveAttribute("role", "listbox");
    await expect(campo).not.toHaveAttribute("role", "combobox");

    const r = await auditar(page);
    expect(r.violations.length, `Violações na busca:\n${resumir(r.violations)}`).toBe(0);
  });
});
