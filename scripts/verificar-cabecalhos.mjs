#!/usr/bin/env node
/**
 * Garante que o `<h1>` de página venha de `<CabecalhoPagina>`.
 *
 * ── O que isto previne ──────────────────────────────────────────────────────
 * Cada uma das 25 rotas internas montava o próprio cabeçalho à mão. O resultado
 * foi divergência silenciosa: o `<h1>` apareceu em `text-3xl` em metade das telas,
 * `text-4xl` na outra metade e `text-2xl` num componente; e o parágrafo de
 * abertura — o mesmo papel em todas — apareceu em três tamanhos e três
 * espaçamentos.
 *
 * Nada disso foi decisão de design. Foi o que aconteceu por reescrever o mesmo
 * elemento vinte e cinco vezes. O componente resolve; este guard impede que a
 * divergência volte.
 *
 * ── As exceções são explícitas e justificadas ───────────────────────────────
 * Quatro telas têm `<h1>` próprio, e cada uma por um motivo diferente — não por
 * esquecimento. Elas ficam listadas abaixo com o motivo. Acrescentar uma nova
 * exige editar este arquivo, o que força a decisão a ser consciente em vez de
 * acidental.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/verificar-cabecalhos.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(raiz, "apps", "web", "src");

/** Arquivos que podem declarar `<h1>` fora de `<CabecalhoPagina>`. */
const EXCECOES = new Map([
  ["app/page.tsx", "herói da home — escala editorial própria, decisão do conceito"],
  ["app/auth/signin/page.tsx", "título de cartão centrado, contexto de modal"],
  ["app/partidos/[acronym]/page.tsx", "cabeçalho de entidade dentro do card do partido"],
  ["app/politicos/[id]/page.tsx", "cabeçalho de entidade dentro do card do político"],
  ["components/BillDetails.tsx", "título da proposição — cabeçalho de entidade"],
  ["components/CabecalhoPagina.tsx", "o próprio componente"],
  [
    "app/global-error.tsx",
    "fronteira de erro global: renderiza o próprio <html> e não pode depender de componentes do app",
  ],
]);

function arquivos(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    const completo = path.join(dir, nome);
    if (statSync(completo).isDirectory()) arquivos(completo, saida);
    else if (/\.tsx$/.test(nome)) saida.push(completo);
  }
  return saida;
}

/** Remove comentários preservando o número de linhas (para a mensagem). */
function semComentarios(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
}

const problemas = [];

for (const arquivo of [...arquivos(path.join(SRC, "app")), ...arquivos(path.join(SRC, "components"))]) {
  const rel = path.relative(SRC, arquivo).replace(/\\/g, "/");
  if (EXCECOES.has(rel)) continue;

  const linhas = semComentarios(readFileSync(arquivo, "utf8")).split(/\r?\n/);
  linhas.forEach((linha, i) => {
    if (/<h1\b/.test(linha)) {
      problemas.push({ rel, linha: i + 1, trecho: linha.trim().slice(0, 90) });
    }
  });
}

if (problemas.length > 0) {
  console.error(`\n[cabecalhos] ${problemas.length} <h1> declarado fora de <CabecalhoPagina>:\n`);
  for (const p of problemas) {
    console.error(`  ${p.rel}:${p.linha}  ${p.trecho}`);
  }
  console.error(
    "\n  Use `@/components/CabecalhoPagina` — ele fixa a escala do título, o\n" +
      "  espaçamento, o limite de leitura do lead e o olho de seção. Se a página\n" +
      "  precisa de um cabeçalho de ENTIDADE (nome dentro de um card), acrescente-a\n" +
      "  à lista de exceções com o motivo — exceção tem de ser decisão, não esquecimento.\n",
  );
  process.exit(1);
}

console.log(
  `[cabecalhos] todo <h1> vem de CabecalhoPagina, salvo as ${EXCECOES.size} exceções documentadas.`,
);
