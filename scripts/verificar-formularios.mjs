#!/usr/bin/env node
/**
 * Verifica as regras de formulário da identidade visual.
 *
 * ── Por que existe ──────────────────────────────────────────────────────────
 * O documento (`docs/design/IDENTIDADE_VISUAL.md` §6) fixa sete regras, e a
 * primeira é a que mais falha na prática: **rótulo real, não placeholder**.
 * Placeholder desaparece ao digitar e não é lido de forma confiável por leitor de
 * tela — o campo fica sem nome justamente quando a pessoa precisa conferir o que
 * digitou.
 *
 * Medido antes deste guard: `aria-invalid`, `aria-describedby` e `aria-busy`
 * tinham **zero** ocorrências no app, e a consulta de protocolo em `/retificacao`
 * usava só placeholder como rótulo.
 *
 * ── O que verifica ──────────────────────────────────────────────────────────
 * 1. Todo `<input>`, `<textarea>` e `<select>` tem **nome acessível**: `id` com
 *    `<label htmlFor>` correspondente, ou `aria-label`/`aria-labelledby`.
 * 2. Nenhum controle depende só de `placeholder` para se identificar.
 *
 * Não tentamos detectar `role="alert"` automaticamente: exigiria entender a
 * intenção do bloco de feedback, e um heurístico errado aqui viraria ruído.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/verificar-formularios.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(raiz, "apps", "web", "src");

function arquivosFonte(dir = SRC, saida = []) {
  for (const nome of readdirSync(dir)) {
    const completo = path.join(dir, nome);
    if (statSync(completo).isDirectory()) arquivosFonte(completo, saida);
    else if (/\.tsx$/.test(nome)) saida.push(completo);
  }
  return saida;
}

const problemas = [];

for (const arquivo of arquivosFonte()) {
  const src = readFileSync(arquivo, "utf8");
  const rel = path.relative(raiz, arquivo);

  // Todos os `htmlFor` do arquivo, para casar com os `id` dos controles.
  const rotulados = new Set();
  for (const m of src.matchAll(/htmlFor="([^"]+)"/g)) rotulados.add(m[1]);

  // Cada tag de controle, com seus atributos.
  //
  // `=>` vem ANTES de `[^>]` na alternância, e a ordem importa: se `[^>]` tentar
  // primeiro, ele consome o `=` sozinho e o `>` seguinte encerra a tag — tudo
  // depois do primeiro handler ficava invisível. Foi assim que o `aria-label` do
  // campo de busca passou batido e o guard acusou um controle que estava correto.
  const re = /<(input|textarea|select)\b((?:=>|[^>])*?)\/?>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const tag = m[1];
    const attrs = m[2];
    const linha = src.slice(0, m.index).split(/\r?\n/).length;

    // `type="hidden"` não é percebido nem precisa de rótulo.
    if (/type="hidden"/.test(attrs)) continue;

    const id = attrs.match(/\bid="([^"]+)"/)?.[1];
    const temAriaLabel = /\baria-label(?:ledby)?=/.test(attrs);
    const temPlaceholder = /\bplaceholder=/.test(attrs);

    if (id && rotulados.has(id)) continue;
    if (temAriaLabel) continue;

    /*
      `<label>` envolvendo o controle é associação **implícita** — válida pela
      spec e usada nos checkboxes de termos. Detectamos por posição: se o último
      `<label` antes do controle vem depois do último `</label>`, o controle está
      dentro de um label aberto.

      A primeira versão do guard não considerava isso e acusou três checkboxes
      corretos. Um guard com falso positivo é pior que nenhum: ensina a ignorá-lo.
    */
    const antes = src.slice(0, m.index);
    const ultimoAbre = antes.lastIndexOf("<label");
    const ultimoFecha = antes.lastIndexOf("</label>");
    if (ultimoAbre > ultimoFecha) continue;

    problemas.push({
      arquivo: rel,
      linha,
      tag,
      id: id ?? "(sem id)",
      temPlaceholder,
      motivo: !id
        ? "sem `id`, então nenhum `<label htmlFor>` pode apontar para ele"
        : `id="${id}" não tem <label htmlFor="${id}"> correspondente`,
    });
  }
}

if (problemas.length > 0) {
  console.error(`\n[formularios] ${problemas.length} controle(s) sem nome acessível:\n`);
  for (const p of problemas) {
    console.error(`  ${p.arquivo}:${p.linha}  <${p.tag}>  ${p.motivo}`);
    if (p.temPlaceholder) {
      console.error(
        "      usa placeholder como rótulo — ele desaparece ao digitar e não é",
      );
      console.error("      lido de forma confiável por leitor de tela.");
    }
  }
  console.error(
    "\n  Regra (docs/design/IDENTIDADE_VISUAL.md §6): todo campo tem `<label htmlFor>`\n" +
      "  real, ou `aria-label` quando o rótulo visual não existe por desenho.\n" +
      "  Placeholder é dica, nunca nome.\n",
  );
  process.exit(1);
}

console.log(
  `[formularios] todo controle tem nome acessível em ${arquivosFonte().length} arquivo(s).`,
);
