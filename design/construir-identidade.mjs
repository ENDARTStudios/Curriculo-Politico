#!/usr/bin/env node
/**
 * Constrói o documento de identidade visual do Currículo Político no FigCraft.
 *
 * ── Por que um gerador, e não um arquivo desenhado à mão ────────────────────
 * A identidade precisa ser **rastreável até o código**. Um documento desenhado no
 * app envelhece em silêncio quando um token muda; um gerador que lê
 * `node_modules/tailwindcss/theme.css` e `status-visual.ts` não pode divergir sem
 * que alguém veja. Rodar de novo regenera tudo a partir da verdade atual.
 *
 * As cores são extraídas do **Tailwind v4 do próprio projeto** e convertidas de
 * OKLCH para sRGB aqui. Escrever hex "aproximados" criaria uma segunda fonte de
 * verdade — exatamente o erro que o projeto combate no IDIP (a home já exibiu
 * v1.0 com o motor rodando v1.1).
 *
 * ── Por que duas fases ──────────────────────────────────────────────────────
 * O `figcraft-cli run` é uma sessão headless stateless: cada execução começa do
 * zero e os ids dos nós só existem em tempo de execução. Para criar **hierarquia
 * real** (cards dentro do canvas, não irmãos flutuando sobre ele) é preciso saber
 * o id do frame pai — que ainda não existe quando o JSON é escrito.
 *
 * Então o build é em duas passadas:
 *   A) cria documento, páginas e os frames de canvas; salva; captura os ids
 *   B) reabre com `--in` e cria os filhos com `parent` apontando para eles
 *
 * Isso não é preciosismo: sem hierarquia, um retângulo que passa da borda do
 * canvas **extravasa o artboard** (o render passou a medir 1620×1060 em vez de
 * 1440×900) e o arquivo fica com 200 nós soltos, impossível de editar no app.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   node design/construir-identidade.mjs            # build completo + renders
 *   node design/construir-identidade.mjs --check    # só valida tokens/contraste
 *
 * Requer o FigCraft instalado. Caminho do CLI configurável por FIGCRAFT_CLI.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dirDesign = path.join(raiz, "design");
const ARQUIVO = path.join(dirDesign, "curriculo-politico.figcraft");
const CLI = process.env.FIGCRAFT_CLI || "C:\\Program Files\\FigCraft\\figcraft-cli.exe";

/* ────────────────────────────── Cor ─────────────────────────────────────── */

/**
 * OKLCH → sRGB hex (algoritmo de Björn Ottosson).
 *
 * O projeto usa Tailwind v4, cujas cores são declaradas em OKLCH; o FigCraft
 * trabalha em sRGB. A conversão é o que garante que o token do documento seja o
 * mesmo do runtime.
 */
function oklchParaHex(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  const gama = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  return `#${linear
    .map((v) => Math.round(Math.min(1, Math.max(0, gama(v))) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function lerCoresDoTema() {
  const arquivo = path.join(raiz, "node_modules", "tailwindcss", "theme.css");
  if (!existsSync(arquivo)) {
    throw new Error(`theme.css do Tailwind não encontrado (${arquivo}). Rode \`npm ci\`.`);
  }
  const css = readFileSync(arquivo, "utf8");
  const cores = {};
  const re = /--color-([a-z]+)-(\d+):\s*oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const [, familia, tom, l, pct, c, h] = m;
    cores[`${familia}-${tom}`] = oklchParaHex(pct === "%" ? Number(l) / 100 : Number(l), Number(c), Number(h));
  }
  return cores;
}

function luminancia(hex) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, escuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (escuro + 0.05);
}

/**
 * Mistura duas cores num alpha — usado no brilho do hero.
 *
 * A opacity de nó não se aplicou via `props` no render (o brilho saiu opaco e
 * chapado). Em vez de depender de um recurso incerto do renderizador, a cor já
 * sai composta. O resultado é o mesmo *pixel* e não depende de suporte a alpha.
 */
function misturar(base, topo, alpha) {
  const canais = (h) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
  const a = canais(base);
  const b = canais(topo);
  return `#${a
    .map((v, i) => Math.round(v * (1 - alpha) + b[i] * alpha).toString(16).padStart(2, "0"))
    .join("")}`;
}

/* ───────────────────── Motor de construção em 2 fases ───────────────────── */

const T = lerCoresDoTema();
const FUNDO = T["slate-950"];

/** Comandos da fase A (documento, páginas, frames de canvas). */
const faseA = [];
/** Comandos da fase B (filhos), com `parent` resolvido depois. */
const faseB = [];

/** Token que será trocado pelo id real do canvas na fase B. */
let canvasAtual = null;

/** Quantos canvas já foram declarados — a ordem casa com `frame.create` da fase A. */
let indiceCanvas = 0;

function a(command, params = {}) {
  faseA.push({ command, params });
}

function b(command, params = {}) {
  faseB.push({ command, params: { ...params, parent: canvasAtual.indice } });
}

/**
 * Declara uma página com seu artboard.
 *
 * `page.setBackground` acompanha: sem ele a área fora do canvas renderiza branca,
 * e um documento de tema escuro com moldura branca é confuso de revisar.
 */
function pagina(nome, largura, altura, renomear = false) {
  if (renomear) {
    a("page.rename", { name: nome });
  } else {
    a("page.add", { name: nome });
  }
  a("page.setBackground", { color: FUNDO });

  a("frame.create", {
    x: 0,
    y: 0,
    width: largura,
    height: altura,
    name: nome,
    props: { fill: FUNDO },
  });
  canvasAtual = { indice: indiceCanvas++, nome };
}

/* ── Primitivas de desenho (sempre filhas do canvas corrente) ────────────── */

const M = 80;

function retangulo(x, y, largura, altura, props = {}) {
  b("shape.rectangle", { x, y, width: largura, height: altura, name: props.name || "retangulo", props });
}

function elipse(x, y, largura, altura, props = {}) {
  b("shape.ellipse", { x, y, width: largura, height: altura, name: props.name || "elipse", props });
}

/** Frame dentro do canvas (card, botão, badge). */
function bloco(x, y, largura, altura, nome, props = {}) {
  b("frame.create", { x, y, width: largura, height: altura, name: nome, props });
}

function texto(conteudo, x, y, props = {}, largura) {
  const params = { text: conteudo, x, y, props };
  if (largura) params.width = largura;
  b("text.create", params);
}

/** Rótulo de seção: caixa alta, tracking largo, azul de ação. */
function rotulo(conteudo, x, y) {
  texto(conteudo, x, y, {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "8%",
    fill: T["sky-400"],
  });
}

/** Texto de apoio, sempre em slate-400 (o slate-500 reprova em AA). */
function apoio(conteudo, x, y, largura) {
  texto(conteudo, x, y, { fontSize: 13, lineHeight: "155%", fill: T["slate-400"] }, largura);
}

/* ─────────────────────── Página 00 · Fundamentos ────────────────────────── */

pagina("00 · Fundamentos", 1440, 2180, true);

texto("IDENTIDADE VISUAL · v1", M, 64, {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "10%",
  fill: T["sky-400"],
});
texto("Currículo Político", M, 96, {
  fontSize: 60,
  fontWeight: 700,
  letterSpacing: "-2%",
  fill: T["slate-50"],
});
texto(
  "Tokens extraídos do código em produção: node_modules/tailwindcss/theme.css (cores) e apps/web/src/lib/status-visual.ts (Termômetro). Documento gerado por design/construir-identidade.mjs — não editar à mão.",
  M,
  190,
  { fontSize: 18, lineHeight: "155%", fill: T["slate-400"] },
  1180,
);
retangulo(M, 278, 1280, 1, { fill: T["slate-800"], name: "divisor" });

const COL = 190;
const GAP = 20;

/**
 * Grade de swatches com nome do token e hex.
 *
 * **Devolve o `y` da próxima seção** em vez de receber posições fixas. A primeira
 * versão usava `y` cravado para cada seção e as notas de rodapé — que têm altura
 * variável, porque o texto quebra em 1 ou 2 linhas — passavam por cima do rótulo
 * seguinte. Layout sequencial com cursor elimina a classe inteira do problema, em
 * vez de acertar os números à mão até parecer certo.
 */
function gradeSwatches(titulo, tokens, y, nota) {
  const LINHA = 152;
  const linhas = Math.ceil(tokens.length / 6);

  rotulo(titulo, M, y);

  tokens.forEach((nome, i) => {
    const x = M + (i % 6) * (COL + GAP);
    const ySw = y + 34 + Math.floor(i / 6) * LINHA;

    retangulo(x, ySw, COL, 104, {
      name: `swatch ${nome}`,
      fill: T[nome],
      // Borda sempre presente: slate-950 sobre slate-950 seria invisível.
      stroke: T["slate-700"],
      strokeWeight: 1,
      strokeAlign: "inside",
      cornerRadius: 10,
    });
    texto(nome, x, ySw + 116, { fontSize: 14, fontWeight: 600, fill: T["slate-200"] });
    texto(T[nome].toUpperCase(), x, ySw + 136, { fontSize: 12, fill: T["slate-400"] });
  });

  let proximo = y + 34 + linhas * LINHA;

  if (nota) {
    // Estimativa de linhas por comprimento: 13px com ~0,5em por caractere cabe
    // cerca de 190 caracteres em 1280px. Serve para reservar altura, não para
    // medir tipografia.
    const alturaNota = Math.ceil(nota.length / 190) * 21 + 6;
    apoio(nota, M, proximo, 1280);
    proximo += alturaNota;
  }

  return proximo + 34;
}

let yFund = 330;

yFund = gradeSwatches("COR · SUPERFÍCIE", ["slate-950", "slate-900", "slate-800", "slate-700", "slate-600"], yFund);
yFund = gradeSwatches(
  "COR · TEXTO",
  ["slate-50", "slate-300", "slate-400", "slate-500"],
  yFund,
  "slate-500 mede 4,23:1 sobre slate-950 e reprova em AA para texto. Use slate-400 (7,66:1); slate-500 fica para bordas e ícones decorativos.",
);
yFund = gradeSwatches(
  "COR · TERMÔMETRO — BARRA",
  ["emerald-500", "amber-500", "red-500", "slate-500"],
  yFund,
  "Verde, âmbar e vermelho existem APENAS para carregar estado de confiabilidade: nunca como decoração e nunca para um estado diferente do que o enum ReliabilityStatus declara.",
);
yFund = gradeSwatches("COR · TERMÔMETRO — TEXTO", ["emerald-300", "amber-300", "red-300", "slate-300"], yFund);
yFund = gradeSwatches(
  "COR · AÇÃO (CTA)",
  ["sky-500", "sky-400"],
  yFund,
  "O CTA primário é sky-500 com texto slate-950 (7,45:1). Branco sobre sky-500 mede 2,59:1 e reprova — é o erro mais comum nesta paleta.",
);

rotulo("TIPOGRAFIA · ESCALA EDITORIAL", M, yFund);

const ESCALA = [
  ["display", 60, 700, "-2%"],
  ["h1", 44, 700, "-1.5%"],
  ["h2", 30, 600, "-1%"],
  ["h3", 22, 600, "-0.5%"],
  ["corpo", 17, 400, "0%"],
  ["miúdo", 14, 400, "0%"],
  ["rótulo", 12, 600, "8%"],
];

// Altura da linha derivada do próprio tamanho da fonte. Com passo fixo, o
// exemplar de 60px invadia a linha de 44px — o defeito apareceu no primeiro
// render.
let yTipo = yFund + 44;
ESCALA.forEach(([nome, px, peso, tracking]) => {
  texto(`${nome} · ${px}`, M, yTipo + px * 0.36, { fontSize: 12, fill: T["slate-400"] });
  texto("O dado é o herói", M + 200, yTipo, {
    fontSize: px,
    fontWeight: peso,
    letterSpacing: tracking,
    fill: T["slate-50"],
  });
  yTipo += px * 1.35 + 18;
});

apoio(
  "A tipografia não fixa família: o app usa o sans do sistema (Tailwind font-sans), então a leitura muda entre Windows, macOS e Android. Lacuna de identidade registrada em docs/design/IDENTIDADE_VISUAL.md.",
  M,
  yTipo + 10,
  1280,
);

/* ─────────────────────── Página 01 · Termômetro ─────────────────────────── */

pagina("01 · Termômetro", 1440, 800);

texto("COMPONENTE ASSINATURA", M, 64, {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "10%",
  fill: T["sky-400"],
});
texto("Termômetro de Confiabilidade", M, 96, {
  fontSize: 44,
  fontWeight: 700,
  letterSpacing: "-1.5%",
  fill: T["slate-50"],
});
texto(
  "Cada estado traz ponto colorido, rótulo textual e a chave do enum. A cor nunca é o único portador da informação (WCAG 1.4.1).",
  M,
  168,
  { fontSize: 17, lineHeight: "155%", fill: T["slate-400"] },
  1120,
);

const ESTADOS = [
  { chave: "GREEN", label: "Confiável", barra: "emerald-500", textoCor: "emerald-300", valor: 88 },
  { chave: "YELLOW", label: "Atenção / Risco", barra: "amber-500", textoCor: "amber-300", valor: 64 },
  { chave: "RED", label: "Não Confiável", barra: "red-500", textoCor: "red-300", valor: 22 },
  { chave: "GRAY", label: "Dados Insuficientes", barra: "slate-500", textoCor: "slate-300", valor: null },
];

ESTADOS.forEach((e, i) => {
  const x = M + i * (280 + 24);
  const y = 250;

  bloco(x, y, 280, 214, `card ${e.chave}`, {
    fill: T["slate-900"],
    stroke: T["slate-800"],
    strokeWeight: 1,
    strokeAlign: "inside",
    cornerRadius: 14,
  });

  // Ponto colorido em vez de emoji: o renderizador não tem fonte de emoji
  // colorido e os desenhava como círculos chapados. O app exibe o emoji do
  // STATUS_VISUAL; o documento mostra o portador de cor com fidelidade.
  elipse(x + 20, y + 26, 12, 12, { name: "ponto", fill: T[e.barra] });
  texto(e.label, x + 42, y + 22, { fontSize: 14, fontWeight: 600, fill: T[e.textoCor] }, 216);

  if (e.valor !== null) {
    texto(`${e.valor}`, x + 20, y + 66, {
      fontSize: 40,
      fontWeight: 700,
      letterSpacing: "-2%",
      fill: T["slate-50"],
    });
    texto("/ 100", x + 88, y + 88, { fontSize: 13, fill: T["slate-400"] });
  } else {
    // GRAY não tem nota: mostrar "—" acima de um rótulo exigiu empilhar em vez
    // de lado a lado, que era o que sobrepunha os dois textos.
    texto("Fora do ranking", x + 20, y + 78, {
      fontSize: 20,
      fontWeight: 600,
      fill: T["slate-300"],
    });
  }

  retangulo(x + 20, y + 146, 240, 8, { name: "trilha", fill: T["slate-800"], cornerRadius: 4 });
  if (e.valor !== null) {
    retangulo(x + 20, y + 146, Math.max(6, (240 * e.valor) / 100), 8, {
      name: "barra",
      fill: T[e.barra],
      cornerRadius: 4,
    });
  }

  texto(e.chave, x + 20, y + 168, {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "8%",
    fill: T["slate-400"],
  });
});

apoio(
  "GRAY é o único estado que remove o político do ranking: confiança abaixo de 60 significa dado insuficiente, não julgamento. A ordem de leitura é GREEN → YELLOW → RED → GRAY — intenção editorial, não a ordem de declaração do enum.",
  M,
  530,
  1280,
);

/* ─────────────────────── Página 02 · Componentes ────────────────────────── */

pagina("02 · Componentes", 1440, 880);

texto("COMPONENTES", M, 64, {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "10%",
  fill: T["sky-400"],
});
texto("Ações, card de poder e linha de ranking", M, 96, {
  fontSize: 44,
  fontWeight: 700,
  letterSpacing: "-1.5%",
  fill: T["slate-50"],
});

rotulo("BOTÕES", M, 194);

bloco(M, 224, 244, 52, "botao primario", { fill: T["sky-500"], cornerRadius: 10 });
texto("Ver ranking completo", M + 24, 240, {
  fontSize: 15,
  fontWeight: 600,
  fill: T["slate-950"],
});

bloco(M + 268, 224, 200, 52, "botao secundario", {
  fill: T["slate-900"],
  stroke: T["slate-700"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
});
texto("Como calculamos", M + 290, 240, {
  fontSize: 15,
  fontWeight: 500,
  fill: T["slate-300"],
});

bloco(M + 492, 224, 244, 52, "botao foco", {
  fill: T["sky-500"],
  stroke: T["slate-50"],
  strokeWeight: 2,
  strokeAlign: "outside",
  cornerRadius: 10,
});
texto("Foco visível", M + 516, 240, {
  fontSize: 15,
  fontWeight: 600,
  fill: T["slate-950"],
});
apoio("anel externo de 2px (slate-50)", M + 492, 286, 244);

rotulo("CARD DE PODER · BARRAS DE PESO", M, 330);

bloco(M, 360, 560, 404, "card legislativo", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 16,
});

texto("LEGISLATIVO", M + 28, 388, {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "10%",
  fill: T["sky-400"],
});
texto("Deputados e senadores", M + 28, 410, {
  fontSize: 20,
  fontWeight: 600,
  fill: T["slate-50"],
});

const DIMENSOES = [
  ["Integridade", 25],
  ["Produtividade", 18],
  ["Aprovação", 15],
  ["Fiscalização", 10],
  ["Presença", 10],
  ["Transparência", 10],
  ["Custo-benefício", 7],
  ["Campanha", 5],
];

DIMENSOES.forEach(([nome, peso], i) => {
  const y = 462 + i * 34;
  texto(nome, M + 28, y, { fontSize: 13, fill: T["slate-300"] }, 170);
  retangulo(M + 206, y + 5, 180, 6, { name: `trilha ${nome}`, fill: T["slate-800"], cornerRadius: 3 });
  retangulo(M + 206, y + 5, Math.max(4, (180 * peso) / 25), 6, {
    name: `barra ${nome}`,
    fill: T["sky-500"],
    cornerRadius: 3,
  });
  texto(`${peso}%`, M + 400, y, { fontSize: 13, fontWeight: 600, fill: T["slate-400"] });
});

texto("Soma dos pesos: 100%", M + 28, 736, { fontSize: 12, fill: T["slate-400"] });

rotulo("LINHA DE RANKING", M + 620, 330);

bloco(M + 620, 360, 660, 136, "linha ranking", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 12,
});

texto("01", M + 644, 384, {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: "-2%",
  fill: T["slate-600"],
});
texto("Adriana Ventura", M + 700, 384, { fontSize: 18, fontWeight: 600, fill: T["slate-50"] });
texto("NOVO · SP · Deputada Federal", M + 700, 410, {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "6%",
  fill: T["slate-400"],
});

texto("70,0", M + 1128, 380, {
  fontSize: 34,
  fontWeight: 700,
  letterSpacing: "-2%",
  fill: T["slate-50"],
});
texto("IDIP", M + 1240, 396, {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "8%",
  fill: T["slate-400"],
});

bloco(M + 700, 440, 132, 28, "badge estado", { fill: T["slate-800"], cornerRadius: 999 });
elipse(M + 712, 449, 10, 10, { name: "ponto badge", fill: T["amber-500"] });
texto("Atenção", M + 730, 446, { fontSize: 12, fontWeight: 600, fill: T["amber-300"] });

apoio(
  "O IDIP é o número dominante da linha. A camada de engajamento (votos da comunidade) nunca ocupa a posição visual da nota, porque a votação popular não altera o IDIP.",
  M + 620,
  522,
  660,
);

/* ────────────────────────── Página 03 · Hero ────────────────────────────── */

pagina("03 · Hero", 1440, 920);

// Brilho do hero: cor já composta em vez de opacity de nó (ver `misturar`).
retangulo(780, 40, 620, 460, {
  name: "brilho hero",
  fill: misturar(FUNDO, T["sky-500"], 0.1),
  cornerRadius: 320,
});

texto("496 POLÍTICOS AUDITADOS · 31.815 PROPOSIÇÕES · FONTES OFICIAIS", M, 150, {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "12%",
  fill: T["sky-400"],
});

texto("Quem te representa\nestá entregando?", M, 196, {
  fontSize: 76,
  fontWeight: 700,
  lineHeight: "98%",
  letterSpacing: "-2.5%",
  fill: T["slate-50"],
});

texto(
  "Uma nota de 0 a 100 por parlamentar, calculada só com dado público da Câmara, do Senado e do TSE — e aberta para você auditar a conta.",
  M,
  392,
  { fontSize: 20, lineHeight: "155%", fill: T["slate-300"] },
  720,
);

bloco(M, 492, 268, 56, "cta primario", { fill: T["sky-500"], cornerRadius: 10 });
texto("Ver o ranking completo", M + 26, 510, {
  fontSize: 16,
  fontWeight: 600,
  fill: T["slate-950"],
});
texto("Entenda a metodologia →", M + 296, 510, {
  fontSize: 16,
  fontWeight: 500,
  fill: T["slate-300"],
});

retangulo(M, 612, 1280, 1, { name: "divisor", fill: T["slate-800"] });

[
  ["496", "políticos avaliados"],
  ["31.815", "proposições analisadas"],
  ["8", "dimensões no IDIP"],
  ["100%", "dado público e auditável"],
].forEach(([valor, rot], i) => {
  const x = M + i * 320;
  texto(valor, x, 652, {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: "-2%",
    fill: T["slate-50"],
  });
  texto(rot, x, 706, { fontSize: 13, fill: T["slate-400"] });
});

apoio(
  "Funil: gancho (dor) → promessa (o que a nota é) → prova (números reais do banco) → CTA. A faixa de prova desaparece quando o banco está vazio — nunca renderiza zero.",
  M,
  786,
  1280,
);

/* ───────────────────────────── Auditoria ────────────────────────────────── */

function auditoria() {
  const ESPERADOS = { "slate-950": "#020617", "slate-400": "#90a1b9", "sky-400": "#00bcff" };
  const canais = (h) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
  let falhas = 0;

  for (const [token, esperado] of Object.entries(ESPERADOS)) {
    const obtido = T[token];
    const delta = Math.max(...canais(obtido).map((v, i) => Math.abs(v - canais(esperado)[i])));
    // Tolerância de 1/255: a conversão passa por duas matrizes e uma curva de
    // gama, então o arredondamento final pode cair de um lado ou do outro do
    // inteiro. Um erro real desvia dezenas de níveis, não um.
    if (delta > 1) {
      console.error(`  FALHA de conversão: ${token} = ${obtido} (esperado ${esperado}, Δ${delta})`);
      falhas++;
    }
  }
  if (falhas === 0) {
    console.log(`  ✅ conversão OK nos ${Object.keys(ESPERADOS).length} tokens de controle (tolerância 1/255)`);
  }

  const CASOS = [
    ["slate-50", "slate-950", "texto principal"],
    ["slate-300", "slate-950", "texto secundário"],
    ["slate-400", "slate-950", "texto terciário"],
    ["slate-500", "slate-950", "texto — REPROVA"],
    ["slate-950", "sky-500", "CTA primário"],
    ["slate-50", "sky-500", "CTA com texto branco — REPROVA"],
    ["emerald-300", "slate-900", "estado GREEN"],
    ["amber-300", "slate-900", "estado YELLOW"],
    ["red-300", "slate-900", "estado RED"],
    ["slate-300", "slate-900", "estado GRAY"],
  ];

  console.log("\n  Contraste medido (WCAG AA, texto normal: 4,5:1):");
  for (const [fg, bg, uso] of CASOS) {
    const r = contraste(T[fg], T[bg]);
    console.log(`    ${(r >= 4.5 ? "AA   " : "abaixo").padEnd(6)} ${r.toFixed(2).padStart(5)}:1  ${fg} sobre ${bg}  — ${uso}`);
  }

  return falhas;
}

/* ──────────────────────────────── Build ─────────────────────────────────── */

function rodar(script, arquivoIn) {
  const args = ["run", script];
  if (arquivoIn) args.push("--in", arquivoIn);
  let saida;
  try {
    saida = execFileSync(CLI, args, { encoding: "utf8", cwd: raiz, maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    const detalhe = (e.stdout || "") + (e.stderr || "");
    throw new Error(`figcraft-cli falhou:\n${detalhe.slice(0, 2000)}`);
  }
  return saida
    .split(/\r?\n/)
    .filter((l) => l.trim().startsWith("{"))
    .map((l) => JSON.parse(l));
}

function principal() {
  const falhas = auditoria();

  if (process.argv.includes("--check")) {
    if (falhas > 0) process.exitCode = 1;
    return;
  }
  if (falhas > 0) {
    console.error("\nAbortando: a paleta não confere com o código.");
    process.exit(1);
  }
  if (!existsSync(CLI)) {
    throw new Error(`FigCraft CLI não encontrado em ${CLI}. Defina FIGCRAFT_CLI.`);
  }

  mkdirSync(dirDesign, { recursive: true });

  // Fase A — documento, páginas e canvas, salvando na MESMA sessão.
  //
  // Salvar aqui, e não numa execução seguinte, é essencial: `run` é stateless, e
  // um segundo `run --in` abriria o arquivo **anterior** (ou um documento vazio,
  // se o arquivo ainda não existisse), descartando os canvas recém-criados. Foi
  // exatamente esse erro que fez a fase B apontar para ids inexistentes.
  const scriptA = path.join(dirDesign, ".figcraft-a.json");
  const cmdsA = [
    { command: "file.new", params: { name: "Currículo Político — Identidade Visual" } },
    ...faseA,
    { command: "file.save", params: { path: path.relative(raiz, ARQUIVO) } },
  ];
  writeFileSync(scriptA, JSON.stringify(cmdsA, null, 1), "utf8");

  const resultadoA = rodar(scriptA);
  const falhasA = resultadoA.filter((r) => r.ok === false);
  if (falhasA.length > 0) {
    console.error("  Falhas na fase A:", JSON.stringify(falhasA.slice(0, 3)));
    throw new Error(`${falhasA.length} comando(s) falharam na fase A.`);
  }

  const quadros = resultadoA.filter((r) => r.command === "frame.create");
  if (quadros.length !== indiceCanvas) {
    throw new Error(
      `Esperava ${indiceCanvas} canvas, a fase A criou ${quadros.length}.`,
    );
  }

  const scriptB = path.join(dirDesign, ".figcraft-b.json");
  const cmdsB = faseB.map((c) => {
    const id = quadros[c.params.parent]?.result?.id;
    if (!id) throw new Error(`Id do canvas ${c.params.parent} não resolvido na fase A.`);
    return { ...c, params: { ...c.params, parent: id } };
  });
  cmdsB.push({ command: "file.save", params: { path: path.relative(raiz, ARQUIVO) } });
  writeFileSync(scriptB, JSON.stringify(cmdsB, null, 1), "utf8");

  const resultadoB = rodar(scriptB, path.relative(raiz, ARQUIVO));
  const falhasB = resultadoB.filter((r) => r.ok === false);
  if (falhasB.length > 0) {
    console.error("  Falhas na fase B:", JSON.stringify(falhasB.slice(0, 3)));
    throw new Error(`${falhasB.length} comando(s) falharam na fase B.`);
  }

  // Renders para revisão. `export` usa a página atual, então renderizamos
  // página a página pelo nome.
  //
  // O slug remove acentos **antes** de trocar não-palavra por hífen. Sem isso,
  // "Termômetro" virava "Term-metro" (o `ô` não casa em `\w`), o build gravava
  // um arquivo de nome inesperado e um render antigo sobrevivia no diretório
  // parecendo atual — passei por isso: revisei uma imagem obsoleta achando que
  // era a nova. Artefato com nome que não corresponde ao que se revisa é pior
  // que artefato ausente.
  const dirExport = path.join(dirDesign, "export");
  mkdirSync(dirExport, { recursive: true });
  const nomesPaginas = faseA
    .filter((c) => c.command === "page.rename" || c.command === "page.add")
    .map((c) => c.params.name);
  const slug = (nome) =>
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "");
  for (const nome of nomesPaginas) {
    const arquivo = path.join(dirExport, `${slug(nome)}.png`);
    execFileSync(CLI, ["render", path.relative(raiz, ARQUIVO), "-o", arquivo, "--scale", "1", "--page", nome], {
      encoding: "utf8",
      cwd: raiz,
    });
  }

  // Limpa os intermediários: são artefatos de build, não fonte.
  for (const lixo of [".figcraft-a.json", ".figcraft-b.json"]) {
    rmSync(path.join(dirDesign, lixo), { force: true });
  }

  console.log(`\n  ✅ ${ARQUIVO.replace(raiz + path.sep, "")}`);
  console.log(`     fase A: ${faseA.length} comandos · fase B: ${faseB.length} comandos`);
  console.log(`     renders: ${nomesPaginas.length} páginas em design/export/`);
}

principal();
