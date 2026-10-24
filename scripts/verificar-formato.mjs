#!/usr/bin/env node
/**
 * Impede que nota e percentual voltem a ser formatados com `toFixed`.
 *
 * ── O que isto previne ──────────────────────────────────────────────────────
 * O app exibia `70.0` — ponto decimal, convenção de `en-US` — em catorze pontos
 * da interface. Numa plataforma brasileira, quem lê `70.0` tende a ler "setenta",
 * sem decimais, e o número que é o produto parece inteiro.
 *
 * A correção foi `@/lib/formato`. Este guard impede que a próxima tela escrita
 * volte ao `toFixed`, que aceita qualquer locale porque não tem locale.
 *
 * ── Por que agora proíbe `toFixed` em `.tsx` por inteiro ────────────────────
 * A primeira versão olhava só campos de domínio conhecidos (`finalScore`,
 * `confidenceScore`, `nota`…). Parecia suficiente e não era: `partyScore`,
 * `avgConfidence`, `historicalScore`, `variacao`, `favorPct` e `d.value`
 * ficaram de fora, e o resultado foi `/partidos` exibindo **`62.6`** enquanto o
 * resto do site mostrava `70,0`; a composição da nota no perfil exibia `50.0`; e
 * o eixo patrimonial escrevia `R$ 1.50M` — ponto decimal e sufixo inglês.
 *
 * A lista de campos era o problema: qualquer lista é incompleta por construção.
 * Como não restou nenhum `toFixed` legítimo em `.tsx` — coordenada de SVG é
 * calculada direto em número, sem arredondar — o guard passou a proibir a
 * chamada em arquivo de componente e página. `.ts` (scripts, lib) segue livre.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/verificar-formato.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(raiz, "apps", "web", "src");

/** Arquivos `.ts`/`.tsx` sob apps/web/src. */
function arquivosFonte(dir = SRC, saida = []) {
  for (const nome of readdirSync(dir)) {
    const completo = path.join(dir, nome);
    if (statSync(completo).isDirectory()) arquivosFonte(completo, saida);
    else if (/\.(ts|tsx)$/.test(nome)) saida.push(completo);
  }
  return saida;
}

const problemas = [];

for (const arquivo of arquivosFonte()) {
  // Só componentes e páginas: `.ts` pode ter arredondamento de cálculo.
  if (!arquivo.endsWith(".tsx")) continue;

  const linhas = readFileSync(arquivo, "utf8").split(/\r?\n/);
  linhas.forEach((linha, i) => {
    const re = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.toFixed\(/g;
    let m;
    while ((m = re.exec(linha)) !== null) {
      problemas.push({
        arquivo: path.relative(raiz, arquivo),
        linha: i + 1,
        trecho: linha.trim().slice(0, 100),
      });
    }
  });
}

if (problemas.length > 0) {
  console.error(`\n[formato] ${problemas.length} número(s) exibido(s) com ponto decimal:\n`);
  for (const p of problemas) {
    console.error(`  ${p.arquivo}:${p.linha}  ${p.trecho}`);
  }
  console.error(
    "\n  Use `@/lib/formato`: formatarNota (uma casa, vírgula), formatarPercentual,\n" +
      "  formatarInteiro, formatarDecimal (casas configuráveis) ou\n" +
      "  formatarMoedaCompacta (R$ 1,5 mi). `toFixed` não tem locale, então `70.0`\n" +
      "  sai igual em qualquer idioma — e numa plataforma brasileira isso muda a\n" +
      "  leitura do número.\n",
  );
  process.exit(1);
}

console.log(
  `[formato] nenhum número exibido com ponto decimal em ${arquivosFonte().length} arquivo(s).`,
);
