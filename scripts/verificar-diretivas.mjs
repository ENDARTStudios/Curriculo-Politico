#!/usr/bin/env node
/**
 * Garante que a diretiva `"use client"` seja a primeira instrução do arquivo.
 *
 * ── O que isto previne ──────────────────────────────────────────────────────
 * O Next só reconhece a diretiva se ela for a **primeira instrução** do módulo.
 * Um `import` antes dela transforma o arquivo em *Server Component* — em
 * silêncio, sem erro de tipo e sem aviso do `tsc`. O sintoma aparece só em
 * runtime: `useState` lança, ou o componente é renderizado no servidor e perde
 * toda a interatividade.
 *
 * Aconteceu neste repositório: ao inserir imports de formatadores com um script,
 * dois arquivos (`PatrimonyChart`, `BillVote`) receberam o import na linha 1 e a
 * diretiva caiu para a linha 2. O `typecheck` passou; o defeito só seria visto
 * ao usar o gráfico e o botão de voto.
 *
 * ── O que conta como diretiva ───────────────────────────────────────────────
 * Só uma linha que, **fora de comentário e de string**, seja exatamente
 * `"use client";` (ou com aspas simples). Mencionar o texto num comentário não é
 * diretiva — a primeira versão desta checagem deu falso positivo em
 * `app/faq/layout.tsx`, que apenas documenta o assunto.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/verificar-diretivas.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = [
  path.join(raiz, "apps", "web", "src"),
  path.join(raiz, "packages"),
];

function arquivosTsx(dir, saida = []) {
  let itens;
  try {
    itens = readdirSync(dir);
  } catch {
    return saida;
  }
  for (const nome of itens) {
    if (nome === "node_modules" || nome.startsWith(".")) continue;
    const completo = path.join(dir, nome);
    if (statSync(completo).isDirectory()) arquivosTsx(completo, saida);
    else if (/\.(tsx|ts)$/.test(nome)) saida.push(completo);
  }
  return saida;
}

/** Remove comentários de bloco e de linha, preservando o número de linhas. */
function semComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, prefixo) => prefixo + " ".repeat(m.length - prefixo.length));
}

const problemas = [];

for (const dir of DIRS) {
  for (const arquivo of arquivosTsx(dir)) {
    const bruto = readFileSync(arquivo, "utf8");
    const limpo = semComentarios(bruto);
    const linhas = limpo.split(/\r?\n/);

    const indiceDiretiva = linhas.findIndex((l) => /^\s*["']use client["'];?\s*$/.test(l));
    if (indiceDiretiva === -1) continue;

    // Primeira linha com conteúdo (não vazia).
    const primeiroConteudo = linhas.findIndex((l) => l.trim() !== "");
    if (primeiroConteudo !== indiceDiretiva) {
      problemas.push({
        arquivo: path.relative(raiz, arquivo),
        diretiva: indiceDiretiva + 1,
        primeira: primeiroConteudo + 1,
        conteudo: linhas[primeiroConteudo].trim().slice(0, 80),
      });
    }
  }
}

if (problemas.length > 0) {
  console.error(`\n[diretivas] ${problemas.length} arquivo(s) com "use client" fora da primeira linha:\n`);
  for (const p of problemas) {
    console.error(`  ${p.arquivo}`);
    console.error(`      "use client" na linha ${p.diretiva}; a linha ${p.primeira} vem antes: ${p.conteudo}`);
  }
  console.error(
    '\n  O Next exige que "use client" seja a PRIMEIRA instrução do módulo. Um import\n' +
      "  antes dela transforma o arquivo em Server Component em silêncio: o typecheck\n" +
      "  passa e o componente só quebra em runtime, ao usar hooks.\n",
  );
  process.exit(1);
}

console.log("[diretivas] toda diretiva \"use client\" é a primeira instrução do módulo.");
