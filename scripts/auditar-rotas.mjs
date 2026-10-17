#!/usr/bin/env node
/**
 * Auditoria visual das rotas do site.
 *
 * ── Por que existe ──────────────────────────────────────────────────────────
 * A suíte de e2e verifica oito rotas. O app tem 28. Sem percorrer todas, "o
 * desenvolvimento visual está concluído" é uma afirmação sobre o que foi olhado,
 * não sobre o que existe — e a diferença é exatamente onde os problemas moram
 * (rotas antigas, escritas antes do conceito, que ninguém revisita).
 *
 * Para cada rota mede três coisas, e as três já revelaram defeito real neste
 * projeto:
 *
 * 1. **axe em WCAG 2.2 AA** — a mesma tag da suíte, com as cinco tags corretas.
 * 2. **Overflow horizontal** — em 375px, `scrollWidth > clientWidth` significa
 *    conteúdo cortado ou rolagem lateral, que é o defeito de responsivo mais
 *    comum e o mais invisível em desktop.
 * 3. **Captura de tela** — o único jeito de julgar hierarquia, contraste real e
 *    excesso de peso visual.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/auditar-rotas.mjs --base http://localhost:3033 \
 *     --politico <id> --partido <SIGLA> --projeto <id>
 *
 * Sem `--politico`/`--partido`/`--projeto`, as rotas dinâmicas são puladas.
 * Escreve `auditoria-visual.json` e as capturas em `.design-review/auditoria/`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const BASE = arg("base") ?? "http://localhost:3033";
const POLITICO = arg("politico");
const PARTIDO = arg("partido");
const PROJETO = arg("projeto");

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** As 28 rotas, com as dinâmicas resolvidas quando os ids são passados. */
const ROTAS = [
  "/",
  "/apoie",
  "/auth/signin",
  "/calendario-eleitoral",
  "/como-funciona",
  "/comparar",
  "/conta",
  "/contato",
  "/cookies",
  "/espectro",
  "/faq",
  "/historia",
  "/lgpd",
  "/metodologia",
  "/partidos",
  PARTIDO ? `/partidos/${PARTIDO}` : null,
  "/partidos/comparar",
  POLITICO ? `/politicos/${POLITICO}` : null,
  "/privacidade",
  "/projetos",
  PROJETO ? `/projetos/${PROJETO}` : null,
  "/ranking",
  "/ranking/personalizado",
  "/retificacao",
  "/sobre",
  "/status",
  "/stf",
  "/termos-de-uso",
  // Estado de 404: é uma página que o usuário vê, e ela também precisa passar
  // em acessibilidade. Fica na lista para não ser a única sem auditoria.
  "/rota-que-nao-existe-auditoria",
].filter(Boolean);

/** Larguras de referência do projeto. */
const VIEWPORTS = [
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "mobile", width: 375, height: 812 },
];

function slug(rota) {
  return rota === "/" ? "home" : rota.replace(/^\//, "").replace(/[/?=&]+/g, "-");
}

const dirCapturas = path.join(raiz, ".design-review", "auditoria");
mkdirSync(dirCapturas, { recursive: true });

const navegador = await chromium.launch({ channel: "chrome" });
const resultados = [];

for (const vp of VIEWPORTS) {
  const contexto = await navegador.newContext({
    viewport: { width: vp.width, height: vp.height },
    colorScheme: "dark",
  });
  const page = await contexto.newPage();

  for (const rota of ROTAS) {
    const entrada = { rota, viewport: vp.nome, status: null, violacoes: [], overflow: 0, erro: null };
    try {
      const resposta = await page.goto(`${BASE}${rota}`, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      entrada.status = resposta?.status() ?? null;

      // Overflow horizontal: conteúdo mais largo que a viewport.
      entrada.overflow = await page.evaluate(
        () => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      );

      const analise = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      entrada.violacoes = analise.violations.map((v) => ({
        id: v.id,
        impacto: v.impact ?? "n/a",
        ajuda: v.help,
        alvos: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
        total: v.nodes.length,
      }));

      if (vp.nome === "desktop") {
        await page.screenshot({
          path: path.join(dirCapturas, `${slug(rota)}.png`),
          fullPage: true,
        });
      }
    } catch (e) {
      entrada.erro = String(e.message).split("\n")[0].slice(0, 200);
    }
    resultados.push(entrada);
    process.stdout.write(`  ${vp.nome.padEnd(8)} ${rota.padEnd(34)} ${entrada.erro ? "ERRO" : `${entrada.status} · ${entrada.violacoes.length} viol. · ${entrada.overflow}px`}\n`);
  }

  await contexto.close();
}

await navegador.close();

const arquivo = path.join(raiz, "auditoria-visual.json");
writeFileSync(arquivo, JSON.stringify(resultados, null, 1), "utf8");

/* ── Resumo ──────────────────────────────────────────────────────────────── */

const comProblema = resultados.filter((r) => r.erro || r.violacoes.length > 0 || r.overflow > 0);
console.log(`\n  ${resultados.length} verificações · ${comProblema.length} com problema`);

if (comProblema.length > 0) {
  const porRota = new Map();
  for (const r of comProblema) {
    const atual = porRota.get(r.rota) ?? { rotas: new Set(), violacoes: new Map(), overflow: 0 };
    atual.rotas.add(r.viewport);
    if (r.overflow > 0) atual.overflow = Math.max(atual.overflow, r.overflow);
    for (const v of r.violacoes) {
      const chave = v.id;
      const reg = atual.violacoes.get(chave) ?? { ajuda: v.ajuda, impacto: v.impacto, total: 0, alvos: new Set(), viewports: new Set() };
      reg.total += v.total;
      reg.viewports.add(r.viewport);
      for (const a of v.alvos) reg.alvos.add(a);
      atual.violacoes.set(chave, reg);
    }
    porRota.set(r.rota, atual);
  }

  console.log("\n=== Rotas com problema ===");
  for (const [rota, info] of [...porRota.entries()].sort()) {
    const partes = [info.rotas.has("desktop") ? "desktop" : null, info.rotas.has("mobile") ? "mobile" : null].filter(Boolean).join("+");
    console.log(`\n  ${rota}  [${partes}]${info.overflow > 0 ? `  overflow ${info.overflow}px` : ""}`);
    for (const [id, v] of info.violacoes) {
      console.log(`    [${v.impacto}] ${id} — ${v.ajuda} (${v.total} nó(s))`);
      for (const alvo of [...v.alvos].slice(0, 3)) console.log(`        ${alvo}`);
    }
  }
}

console.log(`\n  relatório: ${path.relative(raiz, arquivo)}`);
console.log(`  capturas:  ${path.relative(raiz, dirCapturas)}`);
process.exitCode = comProblema.length > 0 ? 1 : 0;
