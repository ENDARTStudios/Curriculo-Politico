/**
 * Calcula o contraste WCAG 2.x de pares de cor usados no projeto.
 *
 * Os valores são a paleta OKLCH do Tailwind v4 convertida para sRGB — o
 * detector do Impeccable reportou `slate-500` = `#62748e` sobre `#020618`
 * (`slate-950`), o que confirma essa conversão e permite checar o resto da
 * escala com o mesmo critério em vez de estimar no olho.
 */

const CORES = {
  "slate-950": "#020618",
  "slate-900": "#0f172b",
  "slate-800": "#1d293d",
  "slate-500": "#62748e",
  "slate-400": "#90a1b9",
  "slate-300": "#cad5e2",
  "slate-200": "#e2e8f0",
  "sky-400": "#00bcff",
  "sky-500": "#00a6f4",
  "sky-600": "#0084d1",
  "sky-700": "#0069a8",
  "emerald-300": "#5ee9b5",
  "emerald-400": "#00d492",
  "amber-300": "#ffd236",
  "red-300": "#ffa2a2",
  "slate-100": "#f1f5f9",
};

function paraRgb(hex) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminância relativa conforme WCAG 2.x. */
function luminancia(hex) {
  const [r, g, b] = paraRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, escuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (escuro + 0.05);
}

/** Fundos efetivos: os cards usam /60 sobre slate-950 — aproximamos pelo tom cheio. */
const FUNDOS = ["slate-950", "slate-900"];

const FRENTES = [
  "slate-500",
  "slate-400",
  "slate-300",
  "slate-200",
  "slate-100",
  "sky-400",
  "emerald-300",
  "amber-300",
  "red-300",
];

console.log("limite AA: 4.5:1 (texto normal) | 3.0:1 (texto grande >=24px ou >=18.66px bold)\n");

for (const fundo of FUNDOS) {
  console.log(`=== sobre ${fundo} (${CORES[fundo]}) ===`);
  const linhas = FRENTES.map((frente) => {
    const r = contraste(CORES[frente], CORES[fundo]);
    const veredito =
      r >= 4.5 ? "AA ok" : r >= 3 ? "so texto grande" : "REPROVA";
    return { frente, razao: r, veredito };
  }).sort((a, b) => b.razao - a.razao);

  for (const l of linhas) {
    console.log(
      `  ${l.frente.padEnd(12)} ${l.razao.toFixed(2).padStart(6)}:1  ${l.veredito}`,
    );
  }
  console.log("");
}
