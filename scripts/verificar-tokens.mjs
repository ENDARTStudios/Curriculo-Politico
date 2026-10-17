#!/usr/bin/env node
/**
 * Garante que a paleta de estado tenha uma fonte só e que ela derive do tema.
 *
 * ── O que isto previne ──────────────────────────────────────────────────────
 * `PartyMembersChart` mantinha a própria cópia da paleta de confiabilidade. Como
 * o projeto migrou do Tailwind v3 para o v4 e os literais do gráfico não
 * acompanharam, o **mesmo card** pintava o partido numa geração de paleta e os
 * membros noutra — e ninguém viu, porque não havia nada comparando os dois.
 *
 * Duas verificações, na ordem em que falham na prática:
 *
 * 1. **`STATUS_HEX` confere com o tema.** O mapa hex existe porque atributo de
 *    SVG não aceita classe Tailwind. Ele precisa ser *derivado* de
 *    `node_modules/tailwindcss/theme.css`, não digitado de memória. Se o Tailwind
 *    mudar a paleta, isto falha em vez de a UI divergir em silêncio.
 * 2. **Ninguém redefine a paleta.** Um arquivo que declare os quatro estados com
 *    hex está duplicando a fonte única, mesmo que os valores estejam certos hoje
 *    — porque amanhã não estarão.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/verificar-tokens.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONTE = path.join(raiz, "apps", "web", "src", "lib", "status-visual.ts");
const SRC = path.join(raiz, "apps", "web", "src");
const TEMA = path.join(raiz, "node_modules", "tailwindcss", "theme.css");

/** OKLCH → sRGB hex (algoritmo de Björn Ottosson). */
function oklchParaHex(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const g = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  return (
    "#" +
    lin
      .map((v) => Math.round(Math.min(1, Math.max(0, g(v))) * 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function lerTema() {
  if (!existsSync(TEMA)) {
    throw new Error(`theme.css do Tailwind não encontrado em ${TEMA}. Rode \`npm ci\`.`);
  }
  const css = readFileSync(TEMA, "utf8");
  const cores = {};
  const re = /--color-([a-z]+)-(\d+):\s*oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const [, fam, tom, l, pct, c, h] = m;
    cores[`${fam}-${tom}`] = oklchParaHex(
      pct === "%" ? Number(l) / 100 : Number(l),
      Number(c),
      Number(h),
    );
  }
  return cores;
}

/** Arquivos `.ts`/`.tsx` sob apps/web/src, recursivamente. */
function arquivosFonte(dir = SRC, saida = []) {
  for (const nome of readdirSync(dir)) {
    const completo = path.join(dir, nome);
    if (statSync(completo).isDirectory()) {
      arquivosFonte(completo, saida);
    } else if (/\.(ts|tsx)$/.test(nome)) {
      saida.push(completo);
    }
  }
  return saida;
}

const problemas = [];

/* ── 1. STATUS_HEX deriva do tema? ───────────────────────────────────────── */

const tema = lerTema();
const fonte = readFileSync(FONTE, "utf8");

// Cada estado referencia dois tokens do Tailwind. O mapa é lido do próprio
// arquivo: se alguém trocar `#00BC7D` por `#10B981`, a comparação pega.
const ESPERADO = [
  ["GREEN", "barra", "emerald-500"],
  ["GREEN", "texto", "emerald-300"],
  ["YELLOW", "barra", "amber-500"],
  ["YELLOW", "texto", "amber-300"],
  ["RED", "barra", "red-500"],
  ["RED", "texto", "red-300"],
  ["GRAY", "barra", "slate-500"],
  ["GRAY", "texto", "slate-300"],
];

for (const [estado, papel, token] of ESPERADO) {
  const re = new RegExp(`${estado}:\\s*\\{[^}]*${papel}:\\s*"(#[0-9A-Fa-f]{6})"`);
  const encontrado = fonte.match(re);
  if (!encontrado) {
    problemas.push(
      `STATUS_HEX.${estado}.${papel} não encontrado em status-visual.ts — ` +
        `esperava o hex de ${token}.`,
    );
    continue;
  }
  const atual = encontrado[1].toUpperCase();
  const canonico = tema[token];
  if (!canonico) {
    problemas.push(`Token ${token} não existe no tema do Tailwind.`);
    continue;
  }
  if (atual !== canonico) {
    problemas.push(
      `STATUS_HEX.${estado}.${papel} = ${atual}, mas ${token} no Tailwind v4 é ` +
        `${canonico}. O hex do gráfico está numa geração de paleta diferente da UI.`,
    );
  }
}

/* ── 2. Alguém redefiniu a paleta fora da fonte? ─────────────────────────── */

const CAMPOS_DE_ESTADO = ["GREEN", "YELLOW", "RED", "GRAY"];

for (const arquivo of arquivosFonte()) {
  if (arquivo === FONTE) continue;
  const conteudo = readFileSync(arquivo, "utf8");

  // Um mapa de estado tem os quatro campos, cada um apontando para um hex. Exigir
  // os quatro evita falso positivo em código que só consulta um estado.
  const temOsQuatro = CAMPOS_DE_ESTADO.every((c) =>
    new RegExp(`${c}:\\s*"#[0-9A-Fa-f]{6}"`).test(conteudo),
  );
  if (temOsQuatro) {
    problemas.push(
      `${path.relative(raiz, arquivo)} redefine a paleta de estado com os quatro ` +
        `hex. Importe STATUS_HEX de @/lib/status-visual.`,
    );
  }
}

/* ── Resultado ───────────────────────────────────────────────────────────── */

if (problemas.length > 0) {
  console.error(`\n[tokens] ${problemas.length} problema(s):\n`);
  for (const p of problemas) console.error(`  ${p}`);
  console.error(
    "\n  A paleta de confiabilidade tem uma fonte única: apps/web/src/lib/status-visual.ts.\n" +
      "  Classe Tailwind não funciona em atributo de SVG, e é por isso que STATUS_HEX\n" +
      "  existe — mas ele também é derivado do tema, não digitado.\n",
  );
  process.exit(1);
}

console.log(
  `[tokens] STATUS_HEX confere com o Tailwind v4 nos ${ESPERADO.length} campos; ` +
    `nenhuma paleta duplicada em ${arquivosFonte().length} arquivo(s).`,
);
