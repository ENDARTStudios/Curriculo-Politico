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
 * ── Por que só nota e percentual ────────────────────────────────────────────
 * `toFixed` é legítimo para valor técnico (coordenada de SVG, largura de barra).
 * O que não pode é um **número exibido ao leitor** sair com ponto decimal. O
 * padrão busca os campos de domínio — score, nota, confiança — e não `toFixed`
 * em geral, para não punir uso correto.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *   node scripts/verificar-formato.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(raiz, "apps", "web", "src");

/**
 * Campos que sempre representam um número mostrado à pessoa.
 *
 * Lista curta de propósito: cada item aqui é um valor de domínio, não um
 * identificador qualquer. `score` cobre `finalScore`, `avgScore`,
 * `confidenceScore`, `membersComponent` etc. pelo sufixo.
 */
const CAMPOS = /\b(finalScore|confidenceScore|avgScore|avgMembersScore|membersComponent|transparencyComponent|complianceComponent|nota)\b/;

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
  const linhas = readFileSync(arquivo, "utf8").split(/\r?\n/);
  linhas.forEach((linha, i) => {
    // `X.toFixed(n)` onde X é um campo de domínio.
    const re = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.toFixed\(/g;
    let m;
    while ((m = re.exec(linha)) !== null) {
      const alvo = m[1];
      const folha = alvo.split(".").pop() ?? alvo;
      if (!CAMPOS.test(folha)) continue;
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
    "\n  Use `@/lib/formato`: formatarNota (uma casa, vírgula), formatarPercentual\n" +
      "  ou formatarInteiro. `toFixed` não tem locale, então `70.0` sai igual em\n" +
      "  qualquer idioma — e numa plataforma brasileira isso muda a leitura do número.\n",
  );
  process.exit(1);
}

console.log(
  `[formato] nenhum número exibido com ponto decimal em ${arquivosFonte().length} arquivo(s).`,
);
