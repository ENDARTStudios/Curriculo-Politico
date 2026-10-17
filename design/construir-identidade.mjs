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

/**
 * Vinculações a executar numa terceira passada, quando os ids já existem.
 *
 * Node id só é conhecido em tempo de execução, então `variable.bind` não pode ser
 * emitido junto com a criação: ele precisa do id que a fase B devolveu. Guardamos
 * o **índice do comando** e o alvo, e a fase C resolve.
 */
const vinculacoes = [];

/**
 * Separa `__bind` das props reais.
 *
 * Fica dentro de `props` para não mudar a assinatura de cada primitiva de
 * desenho: quem chama acrescenta uma chave a mais e o resto não muda.
 */
function separarBind(props) {
  if (!props || !props.__bind) return [props, null];
  const { __bind, ...resto } = props;
  return [resto, Array.isArray(__bind) ? __bind : [__bind]];
}

function b(command, params = {}, bind = null) {
  faseB.push({ command, params: { ...params, parent: canvasAtual.indice } });
  if (bind) {
    for (const item of bind) {
      vinculacoes.push({ indice: faseB.length - 1, ...item });
    }
  }
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
  const [p, bind] = separarBind(props);
  b(
    "shape.rectangle",
    { x, y, width: largura, height: altura, name: p.name || "retangulo", props: p },
    bind,
  );
}

function elipse(x, y, largura, altura, props = {}) {
  const [p, bind] = separarBind(props);
  b(
    "shape.ellipse",
    { x, y, width: largura, height: altura, name: p.name || "elipse", props: p },
    bind,
  );
}

/** Frame dentro do canvas (card, botão, badge). */
function bloco(x, y, largura, altura, nome, props = {}) {
  const [p, bind] = separarBind(props);
  b("frame.create", { x, y, width: largura, height: altura, name: nome, props: p }, bind);
}

function texto(conteudo, x, y, props = {}, largura) {
  const [p, bind] = separarBind(props);
  const params = { text: conteudo, x, y, props: p };
  if (largura) params.width = largura;
  b("text.create", params, bind);
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

/* ───────────────────────────── Tokens ───────────────────────────────────── */

/**
 * Tokens do documento como `variables` do FigCraft.
 *
 * Sem isto, o arquivo é uma maquete: cada cor é um literal e mudar a paleta
 * significa editar dezenas de nós. Com variáveis, os nós ficam **vinculados** e a
 * paleta muda num lugar só — que é a razão de existir um design system.
 *
 * O nome usa `/` porque o FigCraft agrupa por esse separador: `estado/verde-barra`
 * aparece em "estado" no seletor. A nomenclatura espelha a classe Tailwind (ver
 * `TOKENS`), para que a tradução entre documento e código seja mecânica.
 */
const TOKENS = [
  ["superficie/base", "slate-950"],
  ["superficie/painel", "slate-900"],
  ["superficie/borda", "slate-800"],
  ["superficie/borda-forte", "slate-700"],
  ["texto/primario", "slate-50"],
  ["texto/secundario", "slate-300"],
  ["texto/terciario", "slate-400"],
  ["texto/fraco", "slate-500"],
  ["acao/primaria", "sky-500"],
  ["acao/rotulo", "sky-400"],
  ["estado/verde-barra", "emerald-500"],
  ["estado/verde-texto", "emerald-300"],
  ["estado/ambar-barra", "amber-500"],
  ["estado/ambar-texto", "amber-300"],
  ["estado/vermelho-barra", "red-500"],
  ["estado/vermelho-texto", "red-300"],
  ["estado/cinza-barra", "slate-500"],
  ["estado/cinza-texto", "slate-300"],
];

function declararTokens() {
  a("variable.createCollection", { name: "Cor" });
  for (const [nome, chave] of TOKENS) {
    a("variable.create", { collection: "Cor", name: nome, type: "color", value: T[chave] });
  }
}

declararTokens();

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
  {
    chave: "GREEN",
    label: "Confiável",
    barra: "emerald-500",
    textoCor: "emerald-300",
    tokenBarra: "verde-barra",
    tokenTexto: "verde-texto",
    valor: 88,
  },
  {
    chave: "YELLOW",
    label: "Atenção / Risco",
    barra: "amber-500",
    textoCor: "amber-300",
    tokenBarra: "ambar-barra",
    tokenTexto: "ambar-texto",
    valor: 64,
  },
  {
    chave: "RED",
    label: "Não Confiável",
    barra: "red-500",
    textoCor: "red-300",
    tokenBarra: "vermelho-barra",
    tokenTexto: "vermelho-texto",
    valor: 22,
  },
  {
    chave: "GRAY",
    label: "Dados Insuficientes",
    barra: "slate-500",
    textoCor: "slate-300",
    tokenBarra: "cinza-barra",
    tokenTexto: "cinza-texto",
    valor: null,
  },
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
    __bind: [
      { field: "fill", variable: "superficie/painel" },
      { field: "stroke", variable: "superficie/borda" },
    ],
  });

  // Ponto colorido em vez de emoji: o renderizador não tem fonte de emoji
  // colorido e os desenhava como círculos chapados. O app exibe o emoji do
  // STATUS_VISUAL; o documento mostra o portador de cor com fidelidade.
  elipse(x + 20, y + 26, 12, 12, {
    name: "ponto",
    fill: T[e.barra],
    __bind: { field: "fill", variable: `estado/${e.tokenBarra}` },
  });
  texto(
    e.label,
    x + 42,
    y + 22,
    {
      fontSize: 14,
      fontWeight: 600,
      fill: T[e.textoCor],
      __bind: { field: "fill", variable: `estado/${e.tokenTexto}` },
    },
    216,
  );

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

  retangulo(x + 20, y + 146, 240, 8, {
    name: "trilha",
    fill: T["slate-800"],
    cornerRadius: 4,
    __bind: { field: "fill", variable: "superficie/borda" },
  });
  if (e.valor !== null) {
    retangulo(x + 20, y + 146, Math.max(6, (240 * e.valor) / 100), 8, {
      name: "barra",
      fill: T[e.barra],
      cornerRadius: 4,
      __bind: { field: "fill", variable: `estado/${e.tokenBarra}` },
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

bloco(M, 224, 244, 52, "botao primario", {
  fill: T["sky-500"],
  cornerRadius: 10,
  __bind: { field: "fill", variable: "acao/primaria" },
});
texto("Ver ranking completo", M + 24, 240, {
  fontSize: 15,
  fontWeight: 600,
  fill: T["slate-950"],
  __bind: { field: "fill", variable: "superficie/base" },
});

bloco(M + 268, 224, 200, 52, "botao secundario", {
  fill: T["slate-900"],
  stroke: T["slate-700"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda-forte" },
  ],
});
texto("Como calculamos", M + 290, 240, {
  fontSize: 15,
  fontWeight: 500,
  fill: T["slate-300"],
  __bind: { field: "fill", variable: "texto/secundario" },
});

bloco(M + 492, 224, 244, 52, "botao foco", {
  fill: T["sky-500"],
  stroke: T["slate-50"],
  strokeWeight: 2,
  strokeAlign: "outside",
  cornerRadius: 10,
  __bind: [
    { field: "fill", variable: "acao/primaria" },
    { field: "stroke", variable: "texto/primario" },
  ],
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
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda" },
  ],
});

texto("LEGISLATIVO", M + 28, 388, {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "10%",
  fill: T["sky-400"],
  __bind: { field: "fill", variable: "acao/rotulo" },
});
texto("Deputados e senadores", M + 28, 410, {
  fontSize: 20,
  fontWeight: 600,
  fill: T["slate-50"],
  __bind: { field: "fill", variable: "texto/primario" },
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
  texto(nome, M + 28, y, {
    fontSize: 13,
    fill: T["slate-300"],
    __bind: { field: "fill", variable: "texto/secundario" },
  }, 170);
  retangulo(M + 206, y + 5, 180, 6, {
    name: `trilha ${nome}`,
    fill: T["slate-800"],
    cornerRadius: 3,
    __bind: { field: "fill", variable: "superficie/borda" },
  });
  retangulo(M + 206, y + 5, Math.max(4, (180 * peso) / 25), 6, {
    name: `barra ${nome}`,
    fill: T["sky-500"],
    cornerRadius: 3,
    __bind: { field: "fill", variable: "acao/primaria" },
  });
  texto(`${peso}%`, M + 400, y, {
    fontSize: 13,
    fontWeight: 600,
    fill: T["slate-400"],
    __bind: { field: "fill", variable: "texto/terciario" },
  });
});

texto("Soma dos pesos: 100%", M + 28, 736, {
  fontSize: 12,
  fill: T["slate-400"],
  __bind: { field: "fill", variable: "texto/terciario" },
});

rotulo("LINHA DE RANKING", M + 620, 330);

bloco(M + 620, 360, 660, 136, "linha ranking", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 12,
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda" },
  ],
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

bloco(M, 492, 268, 56, "cta primario", {
  fill: T["sky-500"],
  cornerRadius: 10,
  __bind: { field: "fill", variable: "acao/primaria" },
});
texto("Ver o ranking completo", M + 26, 510, {
  fontSize: 16,
  fontWeight: 600,
  fill: T["slate-950"],
  __bind: { field: "fill", variable: "superficie/base" },
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

/* ─────────────────────── Página 04 · Formulários ────────────────────────── */

pagina("04 · Formulários", 1440, 900);

texto("FORMULÁRIOS", M, 64, {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "10%",
  fill: T["sky-400"],
});
texto("Estados de campo, carregamento e feedback", M, 96, {
  fontSize: 44,
  fontWeight: 700,
  letterSpacing: "-1.5%",
  fill: T["slate-50"],
});
texto(
  "Estes estados vivem em /conta, /auth e no canal de retificação. Um formulário que não distingue erro de carregamento transfere ao usuário a tarefa de adivinhar o que aconteceu.",
  M,
  168,
  { fontSize: 17, lineHeight: "155%", fill: T["slate-400"] },
  1120,
);

const LARGURA_CAMPO = 420;

/**
 * Um campo de formulário em um estado.
 *
 * O rótulo e a mensagem são **nós separados do campo**, e não texto dentro do
 * frame: no app eles viram `<label>` e `<p id=...>`, ligados por `aria-describedby`.
 * Desenhar a mensagem dentro do campo esconderia essa separação e sugeriria um
 * padrão que não sobrevive à implementação.
 */
function campo({ y, rotulo: r, valor, corValor, borda, nota, corNota, destaque }) {
  texto(r, M, y, {
    fontSize: 13,
    fontWeight: 600,
    fill: T["slate-300"],
    __bind: { field: "fill", variable: "texto/secundario" },
  });

  bloco(M, y + 24, LARGURA_CAMPO, 48, `campo ${r}`, {
    fill: T["slate-900"],
    stroke: borda,
    // Anel de foco: fora do campo, como no CSS (`outline-offset`), para não
    // encolher o conteúdo quando o foco aparece.
    strokeWeight: destaque ? 2 : 1,
    strokeAlign: destaque ? "outside" : "inside",
    cornerRadius: 10,
    __bind: { field: "fill", variable: "superficie/painel" },
  });

  if (valor) {
    texto(valor, M + 16, y + 40, {
      fontSize: 15,
      fill: corValor,
      __bind: { field: "fill", variable: nota ? "texto/terciario" : "texto/primario" },
    });
  }

  if (nota) {
    texto(nota, M, y + 84, {
      fontSize: 12,
      lineHeight: "140%",
      fill: corNota,
      __bind: { field: "fill", variable: corNota === T["red-300"] ? "estado/vermelho-texto" : "texto/terciario" },
    }, 420);
  }
}

rotulo("CAMPOS", M, 250);

campo({
  y: 288,
  rotulo: "E-mail",
  valor: "voce@exemplo.com",
  corValor: T["slate-500"],
  borda: T["slate-700"],
  nota: "Usado só para entrar na conta. Nunca exibido publicamente.",
  corNota: T["slate-400"],
});

campo({
  y: 408,
  rotulo: "E-mail (com foco)",
  valor: "voce@exemplo.com",
  corValor: T["slate-50"],
  borda: T["sky-500"],
  destaque: true,
  nota: "Anel externo de 2px, visível no teclado.",
  corNota: T["slate-400"],
});

campo({
  y: 528,
  rotulo: "E-mail (erro)",
  valor: "voce@exemplo",
  corValor: T["slate-50"],
  borda: T["red-500"],
  nota: "Informe um e-mail válido, como nome@dominio.com.br.",
  corNota: T["red-300"],
});

campo({
  y: 648,
  rotulo: "CPF (desabilitado)",
  valor: "•••.•••.•••-••",
  corValor: T["slate-500"],
  borda: T["slate-800"],
  nota: "Só é coletado no fluxo de retificação, depois de autenticado. Nunca exibido.",
  corNota: T["slate-400"],
});

/* Coluna direita */

const XDIR = M + 560;

rotulo("AÇÕES E FEEDBACK", XDIR, 250);

// Botão carregando: anel em vez de spinner animado (o documento é estático).
bloco(XDIR, 288, 244, 52, "botao carregando", {
  fill: T["sky-500"],
  cornerRadius: 10,
  __bind: { field: "fill", variable: "acao/primaria" },
});
elipse(XDIR + 24, 306, 16, 16, {
  name: "anel carregando",
  fill: T["sky-500"],
  stroke: T["slate-950"],
  strokeWeight: 2,
  strokeAlign: "inside",
});
texto("Calculando nota…", XDIR + 52, 304, {
  fontSize: 15,
  fontWeight: 600,
  fill: T["slate-950"],
  __bind: { field: "fill", variable: "superficie/base" },
});
texto("aria-busy=\"true\" · o rótulo muda e o botão não muda de largura", XDIR, 352, {
  fontSize: 12,
  fill: T["slate-400"],
}, 380);

// Faixa de sucesso
bloco(XDIR, 400, 420, 64, "faixa sucesso", {
  fill: misturar(T["slate-950"], T["emerald-500"], 0.12),
  stroke: T["emerald-500"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
});
elipse(XDIR + 18, 424, 12, 12, {
  name: "ponto sucesso",
  fill: T["emerald-500"],
  __bind: { field: "fill", variable: "estado/verde-barra" },
});
texto("Nota recalculada com sucesso.", XDIR + 40, 417, {
  fontSize: 14,
  fontWeight: 600,
  fill: T["emerald-300"],
  __bind: { field: "fill", variable: "estado/verde-texto" },
});

// Faixa de erro
bloco(XDIR, 480, 420, 64, "faixa erro", {
  fill: misturar(T["slate-950"], T["red-500"], 0.12),
  stroke: T["red-500"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
});
elipse(XDIR + 18, 504, 12, 12, {
  name: "ponto erro",
  fill: T["red-500"],
  __bind: { field: "fill", variable: "estado/vermelho-barra" },
});
texto("Não foi possível salvar. Tente novamente.", XDIR + 40, 497, {
  fontSize: 14,
  fontWeight: 600,
  fill: T["red-300"],
  __bind: { field: "fill", variable: "estado/vermelho-texto" },
});

texto(
  "role=\"alert\" nas duas faixas: erro e sucesso precisam ser anunciados por leitor de tela, não apenas vistos. Cor nunca é o único sinal — o texto diz o que aconteceu.",
  XDIR,
  566,
  { fontSize: 13, lineHeight: "155%", fill: T["slate-400"] },
  420,
);

/* ───────────────────────── Página 05 · Conceito ─────────────────────────── */

/**
 * Síntese da identidade em uma página.
 *
 * As outras páginas mostram **o que** o sistema é; esta mostra **por que** ele é
 * assim. Um documento de design sem a tese vira catálogo de peças: quem chega
 * depois não sabe o que pode mudar nem o que está fora de negociação, e acaba
 * alterando o que dava sentido ao conjunto.
 */
pagina("05 · Conceito", 1440, 980);

texto("O CONCEITO", M, 64, {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "10%",
  fill: T["sky-400"],
});

texto("Instrumento de medição,\nnão campanha.", M, 104, {
  fontSize: 64,
  fontWeight: 700,
  lineHeight: "98%",
  letterSpacing: "-2.5%",
  fill: T["slate-50"],
});

texto(
  "A plataforma audita poder público. Cada decisão visual existe para que o número seja lido como medição — e não como opinião. Cor, escala e movimento não decoram: eles informam.",
  M,
  282,
  { fontSize: 20, lineHeight: "155%", fill: T["slate-300"] },
  900,
);

retangulo(M, 372, 1280, 1, { name: "divisor", fill: T["slate-800"] });

/** Uma das três leis, com uma prova visual pequena. */
const LEIS = [
  {
    titulo: "O dado é o herói",
    texto:
      "Números, notas e status dominam a hierarquia. Nada decorativo compete com um valor.",
  },
  {
    titulo: "Cor = significado",
    texto:
      "Verde, âmbar e vermelho carregam estado de confiabilidade e nada mais. Azul é ação.",
  },
  {
    titulo: "Escala editorial",
    texto:
      "Título grande com tracking apertado, corpo com entrelinha larga. O contraste sustenta a leitura.",
  },
];

const COLUNA = 380;
const ESPACO = 60;

LEIS.forEach((lei, i) => {
  const x = M + i * (COLUNA + ESPACO);
  const y = 418;

  texto(`0${i + 1}`, x, y, {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "10%",
    fill: T["sky-400"],
  });
  texto(lei.titulo, x, y + 26, { fontSize: 24, fontWeight: 700, letterSpacing: "-1%", fill: T["slate-50"] });
  texto(lei.texto, x, y + 64, { fontSize: 15, lineHeight: "155%", fill: T["slate-400"] }, COLUNA);

  const yProva = y + 150;

  if (i === 0) {
    // Prova: um número isolado, sem nada competindo.
    texto("70,0", x, yProva, {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: "-2.5%",
      fill: T["slate-50"],
      __bind: { field: "fill", variable: "texto/primario" },
    });
    texto("IDIP", x + 138, yProva + 24, {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "8%",
      fill: T["slate-400"],
      __bind: { field: "fill", variable: "texto/terciario" },
    });
  }

  if (i === 1) {
    // Prova: os quatro estados, e só eles.
    ESTADOS.forEach((e, j) => {
      elipse(x + j * 92, yProva + 10, 12, 12, {
        name: `ponto ${e.chave}`,
        fill: T[e.barra],
        __bind: { field: "fill", variable: `estado/${e.tokenBarra}` },
      });
      texto(e.chave, x + j * 92, yProva + 30, {
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "6%",
        fill: T["slate-400"],
      });
    });
  }

  if (i === 2) {
    // Prova: o salto entre display e corpo.
    texto("Aa", x, yProva - 6, {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: "-2%",
      fill: T["slate-50"],
    });
    texto("17px · entrelinha 155%", x + 96, yProva + 30, {
      fontSize: 13,
      fill: T["slate-400"],
    });
  }
});

retangulo(M, 700, 1280, 1, { name: "divisor 2", fill: T["slate-800"] });

texto("O QUE A IDENTIDADE RECUSA", M, 740, {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "8%",
  fill: T["sky-400"],
});

const RECUSAS = [
  "Verde, âmbar ou vermelho como decoração, gradiente ou destaque de marca.",
  "Placeholder como rótulo de campo, ou cor como único portador de um estado.",
  "Qualquer elemento que sugira que a votação popular altera a nota do IDIP.",
];

RECUSAS.forEach((r, i) => {
  const y = 782 + i * 34;
  retangulo(M, y + 9, 14, 2, { name: "marcador", fill: T["slate-600"] });
  texto(r, M + 26, y, { fontSize: 16, fill: T["slate-300"] }, 1200);
});

texto(
  "Esta página é a régua das outras cinco: o que não puder ser justificado por uma destas três leis não pertence à identidade.",
  M,
  900,
  { fontSize: 14, lineHeight: "155%", fill: T["slate-400"] },
  1280,
);

/* ═══════════════════════ Arquétipos de página ════════════════════════════
 *
 * As 28 rotas do app não são 28 desenhos. Elas caem em 8 arquétipos: as quatro
 * páginas jurídicas compartilham um template, as três de detalhe também. Desenhar
 * 28 artboards produziria 20 variações do mesmo layout — e, pior, deixaria o
 * sistema sem regra, porque cada página viraria um caso.
 *
 * O arquétipo é a unidade que se mantém: quando uma rota nova aparece, ela herda
 * o template em vez de inventar um.
 */

/**
 * Tabelas de apoio dos arquétipos.
 *
 * `STATUS_HEX_DOC` existe porque vários artefatos da página usam cor literal —
 * `fill` de elipse, `backgroundColor` de barra — e classe Tailwind não chega lá.
 * Os valores saem de `T`, o mesmo tema que as variables usam, então não há
 * segunda paleta. O guard `scripts/verificar-tokens.mjs` vigia o equivalente em
 * produção.
 */
const STATUS_HEX_DOC = {
  GREEN: { barra: T["emerald-500"], texto: T["emerald-300"] },
  YELLOW: { barra: T["amber-500"], texto: T["amber-300"] },
  RED: { barra: T["red-500"], texto: T["red-300"] },
  GRAY: { barra: T["slate-500"], texto: T["slate-300"] },
};

const TOKEN_ESTADO = {
  GREEN: "verde",
  YELLOW: "ambar",
  RED: "vermelho",
  GRAY: "cinza",
};

const ROTULO_ESTADO = {
  GREEN: "Confiável",
  YELLOW: "Atenção",
  RED: "Não confiável",
  GRAY: "Dados insuficientes",
};

/** Chrome comum: faixa de navegação no topo. */
function navegacao(ativo) {
  retangulo(0, 0, 1440, 64, { name: "nav", fill: misturar(FUNDO, T["slate-900"], 0.6) });
  retangulo(0, 63, 1440, 1, { name: "nav linha", fill: T["slate-800"] });

  texto("Currículo Político", M, 22, {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-1%",
    fill: T["slate-50"],
  });

  const ITENS = ["Ranking", "Políticos", "Partidos", "Metodologia"];
  ITENS.forEach((item, i) => {
    const eAtivo = item === ativo;
    texto(item, M + 236 + i * 108, 24, {
      fontSize: 14,
      fontWeight: eAtivo ? 600 : 400,
      fill: eAtivo ? T["slate-50"] : T["slate-400"],
    });
  });

  // Ação secundária no topo: nunca compete com o CTA do conteúdo.
  texto("Entrar", 1440 - M - 172, 24, {
    fontSize: 14,
    fontWeight: 500,
    fill: T["slate-300"],
  });
  bloco(1440 - M - 108, 16, 108, 32, "nav buscar", {
    fill: T["slate-800"],
    cornerRadius: 8,
  });
  texto("Buscar", 1440 - M - 88, 24, { fontSize: 13, fontWeight: 500, fill: T["slate-300"] });
}

/**
 * Cabeçalho de página: olho, título e linha de apoio.
 *
 * Devolve o `y` onde o conteúdo começa, para as páginas encadearem sem posições
 * mágicas — a mesma razão do cursor em `gradeSwatches`.
 */
function cabecalhoPagina(olho, titulo, apoioTexto) {
  texto(olho, M, 112, {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "10%",
    fill: T["sky-400"],
  });
  texto(titulo, M, 140, {
    fontSize: 46,
    fontWeight: 700,
    letterSpacing: "-1.5%",
    fill: T["slate-50"],
  });

  let y = 208;
  if (apoioTexto) {
    texto(apoioTexto, M, y, { fontSize: 17, lineHeight: "155%", fill: T["slate-400"] }, 980);
    y += 62;
  }
  return y + 16;
}

/** Barra de nota com trilha. Reaproveitada por listagem, perfil e comparação. */
function barraDeNota(x, y, largura, valor, cor) {
  retangulo(x, y, largura, 6, {
    name: "trilha nota",
    fill: T["slate-800"],
    cornerRadius: 3,
    __bind: { field: "fill", variable: "superficie/borda" },
  });
  retangulo(x, y, Math.max(4, (largura * valor) / 100), 6, {
    name: "barra nota",
    fill: cor,
    cornerRadius: 3,
  });
}

/* ─────────────────── 06 · Listagem (núcleo de dados) ────────────────────── */

/**
 * Cobre `/ranking`, `/ranking/personalizado`, `/partidos`, `/projetos`, `/stf`,
 * `/calendario-eleitoral`, `/historia` e `/espectro`.
 *
 * O padrão é sempre o mesmo: cabeçalho → controles → lista. O que muda entre as
 * rotas é a coluna de contexto (partido, UF, casa) e a métrica da direita.
 */
pagina("06 · Listagem", 1440, 1040);
navegacao("Ranking");

let yLista = cabecalhoPagina(
  "RANKING IDIP · 2026",
  "Ranking de políticos",
  "594 parlamentares avaliados com dado público da Câmara, do Senado e do TSE. A nota vai de 0 a 100 e só entra no ranking quem tem confiança acima de 60.",
);

// Controles
const CHIPS = ["Todos", "Câmara", "Senado", "Brasil", "Nordeste"];
CHIPS.forEach((c, i) => {
  const ativo = i === 0;
  const largura = 56 + c.length * 9;
  let x = M;
  for (let j = 0; j < i; j++) x += 56 + CHIPS[j].length * 9 + 12;

  bloco(x, yLista, largura, 36, `chip ${c}`, {
    fill: ativo ? T["slate-800"] : T["slate-900"],
    stroke: T["slate-700"],
    strokeWeight: 1,
    strokeAlign: "inside",
    cornerRadius: 999,
    __bind: ativo ? { field: "fill", variable: "superficie/borda" } : undefined,
  });
  texto(c, x + 18, yLista + 9, {
    fontSize: 13,
    fontWeight: ativo ? 600 : 400,
    fill: ativo ? T["slate-50"] : T["slate-300"],
  });
});

texto("Ordenar por:  IDIP ↓", M, yLista + 56, {
  fontSize: 13,
  fontWeight: 600,
  fill: T["slate-400"],
});

const RANKING = [
  { pos: "01", nome: "Adriana Ventura", meta: "NOVO · SP · Deputada Federal", nota: 70.0, estado: "YELLOW" },
  { pos: "02", nome: "Sargento Fahur", meta: "PSD · PR · Deputado Federal", nota: 70.0, estado: "YELLOW" },
  { pos: "03", nome: "Gilson Marques", meta: "NOVO · SC · Deputado Federal", nota: 70.0, estado: "YELLOW" },
  { pos: "04", nome: "Tabata Amaral", meta: "PSB · SP · Deputada Federal", nota: 68.4, estado: "GREEN" },
  { pos: "05", nome: "Kim Kataguiri", meta: "UNIÃO · SP · Deputado Federal", nota: 66.1, estado: "GREEN" },
  { pos: "06", nome: "Erika Hilton", meta: "PSOL · SP · Deputada Federal", nota: 64.7, estado: "YELLOW" },
];

let yLinha = yLista + 92;

RANKING.forEach((r, i) => {
  const hex = STATUS_HEX_DOC[r.estado];
  const y = yLinha + i * 92;

  bloco(M, y, 1280, 80, `linha ${r.pos}`, {
    fill: T["slate-900"],
    stroke: T["slate-800"],
    strokeWeight: 1,
    strokeAlign: "inside",
    cornerRadius: 12,
    __bind: [
      { field: "fill", variable: "superficie/painel" },
      { field: "stroke", variable: "superficie/borda" },
    ],
  });

  texto(r.pos, M + 24, y + 26, {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-2%",
    fill: T["slate-600"],
  });

  texto(r.nome, M + 80, y + 18, {
    fontSize: 17,
    fontWeight: 600,
    fill: T["slate-50"],
    __bind: { field: "fill", variable: "texto/primario" },
  });
  texto(r.meta, M + 80, y + 44, {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "6%",
    fill: T["slate-400"],
    __bind: { field: "fill", variable: "texto/terciario" },
  });

  // Estado como ponto + rótulo: cor nunca sozinha.
  elipse(M + 470, y + 30, 10, 10, {
    name: "ponto estado",
    fill: hex.barra,
    __bind: { field: "fill", variable: `estado/${TOKEN_ESTADO[r.estado]}-barra` },
  });
  texto(ROTULO_ESTADO[r.estado], M + 488, y + 26, {
    fontSize: 12,
    fontWeight: 600,
    fill: hex.texto,
    __bind: { field: "fill", variable: `estado/${TOKEN_ESTADO[r.estado]}-texto` },
  });

  barraDeNota(M + 700, y + 36, 300, r.nota, hex.barra);

  texto(r.nota.toFixed(1).replace(".", ","), M + 1060, y + 22, {
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: "-2%",
    fill: T["slate-50"],
    __bind: { field: "fill", variable: "texto/primario" },
  });
  texto("IDIP", M + 1176, y + 32, {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "8%",
    fill: T["slate-400"],
  });
});

texto("Mostrando 1–6 de 594", M, yLinha + RANKING.length * 92 + 20, {
  fontSize: 13,
  fill: T["slate-400"],
});
texto("Como o IDIP é calculado →", M + 980, yLinha + RANKING.length * 92 + 20, {
  fontSize: 13,
  fontWeight: 600,
  fill: T["sky-400"],
});

/* ─────────────────────── 07 · Perfil / detalhe ──────────────────────────── */

/**
 * Cobre `/politicos/[id]`, `/partidos/[acronym]` e `/projetos/[id]`.
 *
 * Ordem de leitura: identidade → nota → dimensões → evidências. A nota aparece
 * antes das evidências de propósito: é a pergunta que trouxe a pessoa aqui.
 */
pagina("07 · Perfil", 1440, 950);
navegacao("Políticos");

// Cabeçalho de identidade
texto("← Voltar ao ranking", M, 100, {
  fontSize: 13,
  fontWeight: 500,
  fill: T["sky-400"],
});

texto("DEPUTADO FEDERAL · SP · NOVO", M, 140, {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "10%",
  fill: T["sky-400"],
});
texto("Adriana Ventura", M, 166, {
  fontSize: 44,
  fontWeight: 700,
  letterSpacing: "-1.5%",
  fill: T["slate-50"],
});

// Badge de estado ao lado do nome
bloco(M + 400, 176, 132, 30, "badge perfil", {
  fill: T["slate-800"],
  cornerRadius: 999,
});
elipse(M + 414, 186, 10, 10, {
  name: "ponto badge",
  fill: "#FE9A00",
  __bind: { field: "fill", variable: "estado/ambar-barra" },
});
texto("Atenção", M + 432, 183, {
  fontSize: 12,
  fontWeight: 600,
  fill: T["amber-300"],
  __bind: { field: "fill", variable: "estado/ambar-texto" },
});

texto(
  "2 mandatos · 148 proposições · 1.204 presenças registradas",
  M,
  224,
  { fontSize: 15, fill: T["slate-400"] },
  760,
);

// Card de nota
bloco(M, 272, 560, 250, "card nota", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 16,
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda" },
  ],
});

texto("IDIP", M + 28, 296, {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "10%",
  fill: T["sky-400"],
});
texto("70,0", M + 28, 318, {
  fontSize: 64,
  fontWeight: 700,
  letterSpacing: "-2.5%",
  fill: T["slate-50"],
  __bind: { field: "fill", variable: "texto/primario" },
});
texto("/ 100", M + 190, 354, { fontSize: 14, fill: T["slate-400"] });

texto("Confiança dos dados: 95%", M + 28, 404, {
  fontSize: 13,
  fill: T["slate-400"],
});
barraDeNota(M + 28, 428, 240, 95, "#FE9A00");

texto("Dados completos", M + 300, 404, { fontSize: 13, fill: T["slate-400"] });
barraDeNota(M + 300, 428, 232, 95, "#00BC7D");

// Dimensões
bloco(M + 600, 272, 680, 250, "card dimensoes", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 16,
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda" },
  ],
});

texto("DIMENSÕES", M + 628, 296, {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "10%",
  fill: T["sky-400"],
});

const PERFIL_DIM = [
  ["Integridade", 25, 80],
  ["Produtividade", 18, 72],
  ["Aprovação", 15, 64],
  ["Fiscalização", 10, 58],
  ["Presença", 10, 91],
  ["Transparência", 10, 68],
  ["Custo-benefício", 7, 55],
  ["Campanha", 5, 74],
];

PERFIL_DIM.forEach(([nome, peso, valor], i) => {
  const y = 330 + i * 24;
  texto(nome, M + 628, y, { fontSize: 12, fill: T["slate-300"] }, 150);
  retangulo(M + 790, y + 4, 180, 5, { name: `trilha ${nome}`, fill: T["slate-800"], cornerRadius: 3 });
  retangulo(M + 790, y + 4, (180 * valor) / 100, 5, {
    name: `barra ${nome}`,
    fill: T["sky-500"],
    cornerRadius: 3,
    __bind: { field: "fill", variable: "acao/primaria" },
  });
  texto(`${peso}%`, M + 990, y, { fontSize: 11, fill: T["slate-400"] });
  texto(`${valor}`, M + 1050, y, {
    fontSize: 12,
    fontWeight: 600,
    fill: T["slate-200"],
  });
});

// Evidências
texto("EVIDÊNCIAS", M, 566, {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "8%",
  fill: T["sky-400"],
});

const EVIDENCIAS = [
  ["Réu em Ação Penal", "1 processo em tramitação no STF", "ambar"],
  ["Condenação Transitada em Julgado", "Nenhuma", "verde"],
  ["Despesas de cota", "R$ 312.480 no exercício · 4% abaixo da mediana", "verde"],
];

EVIDENCIAS.forEach(([titulo, detalhe, tom], i) => {
  const y = 606 + i * 78;
  bloco(M, y, 1280, 66, `evidencia ${i}`, {
    fill: T["slate-900"],
    stroke: T["slate-800"],
    strokeWeight: 1,
    strokeAlign: "inside",
    cornerRadius: 10,
    __bind: [
      { field: "fill", variable: "superficie/painel" },
      { field: "stroke", variable: "superficie/borda" },
    ],
  });
  elipse(M + 22, y + 27, 12, 12, {
    name: "ponto evidencia",
    fill: tom === "ambar" ? "#FE9A00" : "#00BC7D",
    __bind: {
      field: "fill",
      variable: tom === "ambar" ? "estado/ambar-barra" : "estado/verde-barra",
    },
  });
  texto(titulo, M + 46, y + 14, {
    fontSize: 14,
    fontWeight: 600,
    fill: T["slate-100"],
  });
  texto(detalhe, M + 46, y + 36, {
    fontSize: 13,
    fill: T["slate-400"],
  });
});

apoio(
  "Linguagem jurídica estrita: só “Réu em Ação Penal” e “Condenação Transitada em Julgado”. Nunca “crime”, nunca juízo moral — o selo é o fato processual, não a opinião.",
  M,
  858,
  1000,
);

/* ──────────────────────── 08 · Comparação ───────────────────────────────── */

/**
 * Cobre `/comparar` e `/partidos/comparar`.
 *
 * Comparar dois números grandes lado a lado não informa: o olho não calcula
 * diferença. Por isso a coluna de **delta** existe e a barra é compartilhada —
 * as duas notas correm na mesma escala, então a distância é visível.
 */
pagina("08 · Comparação", 1440, 940);
navegacao("Políticos");

let yComp = cabecalhoPagina(
  "COMPARAR",
  "Dois políticos, o mesmo critério",
  "As duas notas usam a mesma escala e os mesmos pesos. A coluna de diferença mostra onde a distância realmente está — e onde não há distância.",
);

const A = { nome: "Adriana Ventura", meta: "NOVO · SP", nota: 70.0 };
const B = { nome: "Erika Hilton", meta: "PSOL · SP", nota: 64.7 };

[
  [M, A, "A"],
  [M + 660, B, "B"],
].forEach(([x, p, marca]) => {
  bloco(x, yComp, 620, 96, `candidato ${marca}`, {
    fill: T["slate-900"],
    stroke: T["slate-800"],
    strokeWeight: 1,
    strokeAlign: "inside",
    cornerRadius: 12,
    __bind: [
      { field: "fill", variable: "superficie/painel" },
      { field: "stroke", variable: "superficie/borda" },
    ],
  });
  texto(marca, x + 24, yComp + 22, {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "10%",
    fill: T["slate-500"],
  });
  texto(p.nome, x + 24, yComp + 40, {
    fontSize: 20,
    fontWeight: 600,
    fill: T["slate-50"],
  });
  texto(p.meta, x + 24, yComp + 68, {
    fontSize: 12,
    letterSpacing: "6%",
    fill: T["slate-400"],
  });
  texto(p.nota.toFixed(1).replace(".", ","), x + 460, yComp + 30, {
    fontSize: 38,
    fontWeight: 700,
    letterSpacing: "-2%",
    fill: T["slate-50"],
  });
});

const yTab = yComp + 128;

texto("DIMENSÃO", M + 24, yTab, {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "8%",
  fill: T["slate-500"],
});
texto("A", M + 560, yTab, { fontSize: 11, fontWeight: 700, letterSpacing: "8%", fill: T["slate-500"] });
texto("B", M + 760, yTab, { fontSize: 11, fontWeight: 700, letterSpacing: "8%", fill: T["slate-500"] });
texto("DIFERENÇA", M + 960, yTab, {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "8%",
  fill: T["slate-500"],
});

retangulo(M, yTab + 22, 1280, 1, { name: "divisor tabela", fill: T["slate-800"] });

const COMPARACAO = [
  ["Integridade", 80, 72],
  ["Produtividade", 72, 88],
  ["Aprovação", 64, 70],
  ["Fiscalização", 58, 61],
  ["Presença", 91, 86],
  ["Transparência", 68, 74],
  ["Custo-benefício", 55, 49],
  ["Campanha", 74, 66],
];

COMPARACAO.forEach(([nome, a, b], i) => {
  const y = yTab + 48 + i * 42;

  texto(nome, M + 24, y, { fontSize: 14, fill: T["slate-200"] }, 400);
  texto(`${a}`, M + 560, y, { fontSize: 14, fontWeight: 600, fill: T["slate-100"] });
  texto(`${b}`, M + 760, y, { fontSize: 14, fontWeight: 600, fill: T["slate-100"] });

  const delta = a - b;
  const venceA = delta > 0;
  const cor = venceA ? T["sky-400"] : delta < 0 ? T["slate-300"] : T["slate-500"];
  // O sinal é o portador não-cromático da direção (WCAG 1.4.1). Um rótulo
  // "A melhor"/"B melhor" ao lado seria redundante e ruído numa tabela densa.
  texto(
    delta === 0 ? "—" : `${venceA ? "+" : "−"}${Math.abs(delta)}`,
    M + 960,
    y,
    { fontSize: 14, fontWeight: 600, fill: cor },
  );
});

// Veredito — nomeia TODAS as dimensões, não uma amostra: um resumo que escolhe
// os exemplos vira argumento, e a página existe para não argumentar.
bloco(M, yTab + 404, 1280, 80, "veredito", {
  fill: misturar(FUNDO, T["sky-500"], 0.1),
  stroke: T["sky-500"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 12,
});
texto(
  "Nenhum dos dois domina: A ganha em integridade, presença, custo-benefício e campanha; B em produtividade, aprovação, fiscalização e transparência.",
  M + 24,
  yTab + 418,
  { fontSize: 15, fontWeight: 600, lineHeight: "150%", fill: T["slate-100"] },
  1220,
);
apoio(
  "Comparação não é veredito moral. O texto nomeia onde cada um se sai melhor, sem eleger um vencedor absoluto.",
  M + 24,
  yTab + 452,
  1200,
);

/* ───────────────────────── 09 · Editorial ───────────────────────────────── */

/**
 * Cobre `/como-funciona`, `/metodologia` e `/faq`.
 *
 * Medida de leitura em ~65 caracteres e sumário lateral. Texto corrido numa
 * largura de 1280 é ilegível — a linha fica longa demais para o olho voltar.
 */
pagina("09 · Editorial", 1440, 940);
navegacao("Metodologia");

let yEd = cabecalhoPagina(
  "COMO FUNCIONA",
  "Como o IDIP é calculado",
  "Oito dimensões, pesos fixos e uma trava: nenhuma nota é publicada com confiança abaixo de 60. Tudo o que entra na conta é dado público.",
);

const MEDIDA = 660; // ~65 caracteres em 17px

texto("As oito dimensões", M, yEd, {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: "-0.5%",
  fill: T["slate-50"],
});
texto(
  "Cada dimensão mede uma coisa só, com peso declarado. Integridade carrega o maior peso (25%) porque fato processual é o que mais pesa para quem vota — e é o que o Tribunal de Contas e o STF publicam de forma verificável.",
  M,
  yEd + 40,
  { fontSize: 17, lineHeight: "165%", fill: T["slate-300"] },
  MEDIDA,
);

// Bloco de fórmula
bloco(M, yEd + 180, MEDIDA, 108, "bloco formula", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda" },
  ],
});
texto("IDIP = Σ (peso × dimensão normalizada)", M + 24, yEd + 206, {
  fontSize: 16,
  fontWeight: 600,
  fill: T["sky-400"],
});
texto("Trava: confiança < 60 → fora do ranking, sem nota publicada.", M + 24, yEd + 240, {
  fontSize: 14,
  fill: T["slate-400"],
});

texto(
  "O peso não é ajustável por votação popular. A camada de engajamento é visualmente separada da nota justamente para que ninguém leia a votação como se alterasse o IDIP.",
  M,
  yEd + 316,
  { fontSize: 17, lineHeight: "165%", fill: T["slate-300"] },
  MEDIDA,
);

// Sumário lateral
const XSUM = M + MEDIDA + 120;
texto("NESTA PÁGINA", XSUM, yEd, {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "10%",
  fill: T["slate-500"],
});

["As oito dimensões", "Pesos e por quê", "A trava de confiança", "O que não entra", "Como contestar"].forEach(
  (item, i) => {
    const y = yEd + 34 + i * 34;
    if (i === 0) {
      retangulo(XSUM - 14, y + 2, 2, 16, { name: "marcador secao", fill: T["sky-500"] });
    }
    texto(item, XSUM, y, {
      fontSize: 14,
      fontWeight: i === 0 ? 600 : 400,
      fill: i === 0 ? T["slate-50"] : T["slate-400"],
    });
  },
);

// Callout "em resumo"
bloco(M, yEd + 470, MEDIDA, 118, "callout resumo", {
  fill: misturar(FUNDO, T["emerald-500"], 0.1),
  stroke: T["emerald-500"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
});
texto("Em resumo", M + 24, yEd + 492, {
  fontSize: 14,
  fontWeight: 700,
  fill: T["emerald-300"],
  __bind: { field: "fill", variable: "estado/verde-texto" },
});
texto(
  "A nota é a mesma conta para todo mundo, com os mesmos pesos, sobre dado que qualquer pessoa pode baixar e conferir.",
  M + 24,
  yEd + 518,
  { fontSize: 16, lineHeight: "155%", fill: T["slate-200"] },
  MEDIDA - 48,
);

/* ────────────────────────── 10 · Jurídico ───────────────────────────────── */

/**
 * Cobre `/privacidade`, `/termos-de-uso`, `/cookies` e `/lgpd`.
 *
 * Quatro páginas, um template. O que muda é o título e o corpo; a estrutura é
 * idêntica porque a função é a mesma: texto longo, datado e verificável.
 */
pagina("10 · Jurídico", 1440, 900);
navegacao(null);

let yJur = cabecalhoPagina(
  "DOCUMENTO LEGAL",
  "Política de Privacidade",
  null,
);

texto("Versão 1.1 · atualizada em 13 de outubro de 2026", M, yJur + 2, {
  fontSize: 14,
  fill: T["slate-400"],
});

texto(
  "Esta política descreve quais dados pessoais o Currículo Político trata, com que base legal e por quanto tempo. Os dados de políticos são públicos por origem; os seus, não.",
  M,
  yJur + 30,
  { fontSize: 17, lineHeight: "165%", fill: T["slate-300"] },
  MEDIDA,
);

["1. Quais dados tratamos", "2. Base legal", "3. Retenção", "4. Seus direitos"].forEach((s, i) => {
  const y = yJur + 152 + i * 96;
  texto(s, M, y, { fontSize: 22, fontWeight: 700, letterSpacing: "-0.5%", fill: T["slate-50"] });
  texto(
    "Lorem ipsum não serve aqui: cada seção declara fato verificável, com link para o código ou para o serviço externo que sustenta a afirmação.",
    M,
    y + 34,
    { fontSize: 16, lineHeight: "165%", fill: T["slate-400"] },
    MEDIDA,
  );
});

const XSUMJ = M + MEDIDA + 120;
texto("NESTE DOCUMENTO", XSUMJ, yJur, {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "10%",
  fill: T["slate-500"],
});
["1. Quais dados tratamos", "2. Base legal", "3. Retenção", "4. Seus direitos"].forEach((item, i) => {
  texto(item, XSUMJ, yJur + 34 + i * 32, {
    fontSize: 13,
    fill: T["slate-400"],
  });
});

bloco(XSUMJ - 16, yJur + 200, 420, 96, "aviso juridico", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda" },
  ],
});
texto("Dúvida sobre seus dados?", XSUMJ, yJur + 220, {
  fontSize: 14,
  fontWeight: 600,
  fill: T["slate-100"],
});
texto("Fale pelo canal de retificação.", XSUMJ, yJur + 244, {
  fontSize: 13,
  fill: T["slate-400"],
});
texto("Abrir canal →", XSUMJ, yJur + 268, {
  fontSize: 13,
  fontWeight: 600,
  fill: T["sky-400"],
});

/* ─────────────────────────── 11 · Conta ─────────────────────────────────── */

/**
 * Cobre `/conta` e `/auth/signin`.
 *
 * Card estreito e centrado. Autenticação não é lugar para explorar layout: a
 * pessoa quer entrar e sair, e qualquer elemento extra é atrito.
 */
pagina("11 · Conta", 1440, 760);
navegacao(null);

const XCARTAO = 490;
const LCARTAO = 460;

bloco(XCARTAO, 180, LCARTAO, 470, "card conta", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 16,
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda" },
  ],
});

texto("Entrar na conta", XCARTAO + 32, 212, {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: "-1%",
  fill: T["slate-50"],
});
texto("Para votar e acompanhar seus políticos.", XCARTAO + 32, 248, {
  fontSize: 14,
  fill: T["slate-400"],
});

// Login social
bloco(XCARTAO + 32, 288, LCARTAO - 64, 48, "botao google", {
  fill: T["slate-800"],
  stroke: T["slate-700"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
});
texto("Continuar com Google", XCARTAO + 132, 304, {
  fontSize: 15,
  fontWeight: 600,
  fill: T["slate-100"],
});

// Divisor
retangulo(XCARTAO + 32, 368, (LCARTAO - 64) / 2 - 24, 1, { name: "divisor esq", fill: T["slate-700"] });
texto("ou", XCARTAO + LCARTAO / 2 - 8, 360, { fontSize: 12, fill: T["slate-500"] });
retangulo(XCARTAO + LCARTAO / 2 + 16, 368, (LCARTAO - 64) / 2 - 24, 1, {
  name: "divisor dir",
  fill: T["slate-700"],
});

// Campos
texto("E-mail", XCARTAO + 32, 400, {
  fontSize: 13,
  fontWeight: 600,
  fill: T["slate-300"],
});
bloco(XCARTAO + 32, 424, LCARTAO - 64, 48, "campo email conta", {
  fill: T["slate-950"],
  stroke: T["slate-700"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
});
texto("voce@exemplo.com", XCARTAO + 48, 440, {
  fontSize: 15,
  fill: T["slate-500"],
});

// Ação
bloco(XCARTAO + 32, 492, LCARTAO - 64, 48, "botao enviar conta", {
  fill: T["sky-500"],
  cornerRadius: 10,
  __bind: { field: "fill", variable: "acao/primaria" },
});
texto("Enviar link de acesso", XCARTAO + 118, 508, {
  fontSize: 15,
  fontWeight: 600,
  fill: T["slate-950"],
  __bind: { field: "fill", variable: "superficie/base" },
});

texto(
  "Ao entrar você aceita os Termos e a Política de Privacidade. Nenhum dado pessoal é exibido publicamente.",
  XCARTAO + 32,
  560,
  { fontSize: 12, lineHeight: "150%", fill: T["slate-400"] },
  LCARTAO - 64,
);

/* ─────────────────────── 12 · Retificação ───────────────────────────────── */

/**
 * Cobre `/retificacao`, `/contato` e `/apoie`.
 *
 * Duas colunas: formulário à esquerda, orientação à direita. A orientação não é
 * decorativa — é o que reduz pedido incompleto, e o formulário é o canal formal
 * do titular de dados (LGPD Art. 18).
 */
pagina("12 · Retificação", 1440, 900);
navegacao(null);

let yRet = cabecalhoPagina(
  "CANAL DE RETIFICAÇÃO",
  "Pedir correção de dado",
  "Se um dado sobre você está errado, este é o canal. Todo pedido é registrado com protocolo e prazo.",
);

// Indicador de etapas
const ETAPAS = ["Identificação", "O que corrigir", "Enviar"];
ETAPAS.forEach((etapa, i) => {
  const x = M + i * 240;
  const ativo = i === 0;
  elipse(x, yRet, 26, 26, {
    name: `etapa ${i + 1}`,
    fill: ativo ? T["sky-500"] : T["slate-800"],
  });
  texto(`${i + 1}`, x + 9, yRet + 6, {
    fontSize: 13,
    fontWeight: 700,
    fill: ativo ? T["slate-950"] : T["slate-400"],
  });
  texto(etapa, x + 38, yRet + 5, {
    fontSize: 14,
    fontWeight: ativo ? 600 : 400,
    fill: ativo ? T["slate-50"] : T["slate-400"],
  });
  if (i < ETAPAS.length - 1) {
    retangulo(x + 140, yRet + 13, 84, 2, { name: "linha etapa", fill: T["slate-800"] });
  }
});

const yForm = yRet + 62;

// Campos do formulário
[
  ["Nome completo", "Como consta no documento"],
  ["E-mail para retorno", "voce@exemplo.com"],
  ["Link do perfil", "curriculopolitico.org/politicos/…"],
].forEach(([rot, valor], i) => {
  const y = yForm + i * 92;
  texto(rot, M, y, { fontSize: 13, fontWeight: 600, fill: T["slate-300"] });
  bloco(M, y + 22, 700, 48, `campo ${rot}`, {
    fill: T["slate-900"],
    stroke: T["slate-700"],
    strokeWeight: 1,
    strokeAlign: "inside",
    cornerRadius: 10,
    __bind: { field: "fill", variable: "superficie/painel" },
  });
  texto(valor, M + 16, y + 38, {
    fontSize: 15,
    fill: T["slate-500"],
  });
});

texto("O que precisa ser corrigido", M, yForm + 276, {
  fontSize: 13,
  fontWeight: 600,
  fill: T["slate-300"],
});
bloco(M, yForm + 298, 700, 110, "campo detalhe", {
  fill: T["slate-900"],
  stroke: T["slate-700"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 10,
  __bind: { field: "fill", variable: "superficie/painel" },
});
texto("Descreva o dado incorreto e, se puder, a fonte correta.", M + 16, yForm + 316, {
  fontSize: 15,
  fill: T["slate-500"],
});

bloco(M, yForm + 428, 240, 48, "botao protocolar", {
  fill: T["sky-500"],
  cornerRadius: 10,
  __bind: { field: "fill", variable: "acao/primaria" },
});
texto("Registrar pedido", M + 56, yForm + 444, {
  fontSize: 15,
  fontWeight: 600,
  fill: T["slate-950"],
  __bind: { field: "fill", variable: "superficie/base" },
});

// Painel de orientação
const XORI = M + 780;
bloco(XORI, yForm, 420, 300, "painel orientacao", {
  fill: T["slate-900"],
  stroke: T["slate-800"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 12,
  __bind: [
    { field: "fill", variable: "superficie/painel" },
    { field: "stroke", variable: "superficie/borda" },
  ],
});

texto("ANTES DE ENVIAR", XORI + 24, yForm + 24, {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "10%",
  fill: T["sky-400"],
});

const ORIENTACOES = [
  "Você não precisa de conta: o pedido é identificado pelo e-mail.",
  "Um pedido por dado. Pedidos separados recebem protocolos separados.",
  "O prazo de resposta é de 15 dias, contado do protocolo.",
  "Não envie CPF, documento ou comprovante de residência.",
];

ORIENTACOES.forEach((o, i) => {
  const y = yForm + 56 + i * 56;
  retangulo(XORI + 24, y + 8, 14, 2, { name: "marcador", fill: T["slate-600"] });
  texto(o, XORI + 50, y, { fontSize: 14, lineHeight: "155%", fill: T["slate-300"] }, 340);
});

apoio(
  "O canal é público e a resposta é registrada. Dado pessoal enviado por aqui não é exibido em lugar nenhum da plataforma.",
  XORI + 24,
  yForm + 316,
  380,
);

/* ────────────────────────── 13 · Status ─────────────────────────────────── */

/**
 * Cobre `/status` e `/sobre`.
 *
 * Status é página de operação, não de marketing: números verificáveis, sem
 * adjetivo. "Operacional" precisa vir de uma consulta real, não de um texto fixo.
 */
pagina("13 · Status", 1440, 860);
navegacao(null);

let ySt = cabecalhoPagina(
  "STATUS",
  "Estado da plataforma",
  "Verificado a cada consulta. Se um número aqui estiver errado, o site está errado — não o contrário.",
);

// Faixa de resumo
//
// O resumo precisa **refletir a pior linha**, não o otimismo. A primeira versão
// dizia "Todos os sistemas operacionais" em verde enquanto "Coleta da Câmara"
// estava em âmbar na lista abaixo — a página se contradizia, e um status que se
// contradiz é pior que nenhum.
bloco(M, ySt, 1280, 84, "resumo status", {
  fill: misturar(FUNDO, T["amber-500"], 0.1),
  stroke: T["amber-500"],
  strokeWeight: 1,
  strokeAlign: "inside",
  cornerRadius: 12,
});
elipse(M + 28, ySt + 34, 16, 16, {
  name: "ponto geral",
  fill: T["amber-500"],
  __bind: { field: "fill", variable: "estado/ambar-barra" },
});
texto("1 sistema requer atenção", M + 56, ySt + 22, {
  fontSize: 18,
  fontWeight: 600,
  fill: T["slate-50"],
});
texto("5 verificações · última há 2 minutos · a coleta da Câmara não roda há 26 h", M + 56, ySt + 48, {
  fontSize: 13,
  fill: T["slate-400"],
});

// Checagens
const CHECAGENS = [
  ["Banco de dados", "Operacional", "18 ms", "verde"],
  ["Ranking com notas", "594 elegíveis", "—", "verde"],
  ["API de busca", "Operacional", "96 ms", "verde"],
  ["Snapshot mensal", "Setembro de 2026", "—", "verde"],
  ["Coleta da Câmara", "Sem execução em 26 h", "—", "ambar"],
];

CHECAGENS.forEach(([nome, valor, latencia, tom], i) => {
  const y = ySt + 112 + i * 64;
  bloco(M, y, 1280, 56, `checagem ${i}`, {
    fill: T["slate-900"],
    stroke: T["slate-800"],
    strokeWeight: 1,
    strokeAlign: "inside",
    cornerRadius: 10,
    __bind: [
      { field: "fill", variable: "superficie/painel" },
      { field: "stroke", variable: "superficie/borda" },
    ],
  });
  elipse(M + 22, y + 22, 12, 12, {
    name: "ponto checagem",
    fill: tom === "verde" ? T["emerald-500"] : T["amber-500"],
    __bind: {
      field: "fill",
      variable: tom === "verde" ? "estado/verde-barra" : "estado/ambar-barra",
    },
  });
  texto(nome, M + 46, y + 18, {
    fontSize: 15,
    fontWeight: 600,
    fill: T["slate-100"],
  });
  texto(valor, M + 620, y + 20, {
    fontSize: 14,
    fill: tom === "verde" ? T["emerald-300"] : T["amber-300"],
  });
  texto(latencia, M + 1080, y + 20, {
    fontSize: 14,
    fontWeight: 600,
    fill: T["slate-400"],
  });
});

apoio(
  "A página lê o banco a cada visita. Um status que não consulta nada é pior que nenhum: informa calma enquanto o site está quebrado.",
  M,
  ySt + 452,
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

  // Fase C — vinculação dos nós às variáveis.
  //
  // Precisa ser depois da fase B porque `variable.bind` exige o id do nó, que só
  // existe após a criação. `resultadoB[i]` corresponde a `faseB[i]`, então o
  // índice guardado em `vinculacoes` resolve direto.
  let vinculados = 0;
  if (vinculacoes.length > 0) {
    const cmdsC = [];
    for (const v of vinculacoes) {
      const id = resultadoB[v.indice]?.result?.id;
      if (!id) {
        throw new Error(
          `Nó do comando ${v.indice} (${faseB[v.indice]?.command}) não devolveu id; ` +
            `não é possível vincular a variável "${v.variable}".`,
        );
      }
      cmdsC.push({
        command: "variable.bind",
        params: { ids: [id], field: v.field, variable: v.variable },
      });
      vinculados++;
    }
    cmdsC.push({ command: "file.save", params: { path: path.relative(raiz, ARQUIVO) } });

    const scriptC = path.join(dirDesign, ".figcraft-c.json");
    writeFileSync(scriptC, JSON.stringify(cmdsC, null, 1), "utf8");

    const resultadoC = rodar(scriptC, path.relative(raiz, ARQUIVO));
    const falhasC = resultadoC.filter((r) => r.ok === false);
    if (falhasC.length > 0) {
      console.error("  Falhas na fase C:", JSON.stringify(falhasC.slice(0, 3)));
      throw new Error(`${falhasC.length} vinculação(ões) falharam.`);
    }
  }

  // Verificação do artefato, não do comando.
  //
  // `variable.bind` retornar `ok` só diz que a API aceitou a chamada. O que
  // interessa é se o vínculo **persistiu no arquivo**. Convertemos para JSON e
  // contamos as referências a variável.
  //
  // Conta apenas dentro dos blocos `bound`, que é como o documento serializa o
  // vínculo: `"bound": {"fill": "VariableID:2", "stroke": "VariableID:3"}`.
  //
  // Duas versões erradas antes desta, ambas pegas pela própria verificação:
  // contar `"bound"` dava um por nó em vez de um por campo (85 para 93), e
  // contar qualquer `"VariableID:n"` somava as 18 definições de variável
  // (`"id": "VariableID:1"`) ao total (111 para 93).
  const jsonTemporario = path.join(dirDesign, ".verificacao.json");
  execFileSync(CLI, ["convert", path.relative(raiz, ARQUIVO), jsonTemporario], {
    encoding: "utf8",
    cwd: raiz,
  });
  const documento = readFileSync(jsonTemporario, "utf8");
  const blocosBound = documento.match(/"bound":\s*\{[^}]*\}/g) || [];
  const vinculosNoArquivo = blocosBound.reduce(
    (total, bloco) => total + (bloco.match(/"VariableID:\d+"/g) || []).length,
    0,
  );
  rmSync(jsonTemporario, { force: true });

  if (vinculosNoArquivo !== vinculacoes.length) {
    throw new Error(
      `Vínculos não persistiram: ${vinculacoes.length} emitidos, ` +
        `${vinculosNoArquivo} encontrados no arquivo.`,
    );
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
  for (const lixo of [".figcraft-a.json", ".figcraft-b.json", ".figcraft-c.json"]) {
    rmSync(path.join(dirDesign, lixo), { force: true });
  }

  console.log(`\n  ✅ ${ARQUIVO.replace(raiz + path.sep, "")}`);
  console.log(`     fase A: ${faseA.length} comandos · fase B: ${faseB.length} comandos · fase C: ${vinculacoes.length} vinculações`);
  console.log(`     renders: ${nomesPaginas.length} páginas em design/export/`);
  console.log(`     ${TOKENS.length} tokens como variables do FigCraft, ${vinculosNoArquivo} vínculos verificados no arquivo`);
}

principal();
