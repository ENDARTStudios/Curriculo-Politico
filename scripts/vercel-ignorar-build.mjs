#!/usr/bin/env node
/**
 * Decide se a Vercel deve PULAR o build.
 *
 * ── Semântica do `ignoreCommand` ──────────────────────────────────────────
 * O comando roda antes do build. **Saída 0 = pular**; saída diferente de 0 =
 * construir. É contraintuitivo, por isso o nome do arquivo é explícito e o
 * script imprime o veredito.
 *
 * ── O problema que ele resolve ────────────────────────────────────────────
 * Sem `ignoreCommand`, **todo push** dispara um build completo de Next + Prisma.
 * Neste repositório isso é caro: 54 dos primeiros 124 commits (44%) não tocaram
 * `apps/web` — foram mudanças em `apps/pipeline`, `docs/` e workflows. Cada uma
 * consumiu Build CPU Minutes integrais para produzir exatamente o mesmo site.
 *
 * O `.vercelignore` não resolve isto: ele reduz o que é enviado, mas o build
 * continua rodando.
 *
 * ── Regra ────────────────────────────────────────────────────────────────
 * Constrói se QUALQUER arquivo destes mudou:
 *   - `apps/web/**`            (o app)
 *   - `package.json`, `package-lock.json` (raiz — dependências içadas)
 *   - `packages/**`            (workspace; hoje o web não importa, mas barato)
 *   - `scripts/vercel-*.mjs`, `.npmrc`, `tsconfig*` da raiz
 *
 * Pula se só mudou: `apps/pipeline/**`, `docs/**`, `.github/**`, `data/**`,
 * marcadores e README.
 *
 * ── Falha para o lado seguro ─────────────────────────────────────────────
 * Em qualquer dúvida — sem commit anterior, `git` indisponível, erro de leitura —
 * o script **constrói**. Pular um build que era necessário publicaria uma versão
 * velha; construir à toa custa minutos. Assimetria decide.
 */

import { execFileSync } from "node:child_process";

const CAMINHOS_QUE_CONSTROEM = [
  /^apps\/web\//,
  /^packages\//,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^\.npmrc$/,
  /^tsconfig[^/]*\.json$/,
  /^scripts\/vercel-/,
];

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function decidir() {
  // `--base`/`--head` existem para testar a regra localmente sem depender do
  // estado do repositório no momento do deploy.
  const args = process.argv.slice(2);
  const baseArg = args.find((a) => a.startsWith("--base="))?.split("=")[1];
  const headArg = args.find((a) => a.startsWith("--head="))?.split("=")[1];

  let raiz;
  try {
    raiz = git(["rev-parse", "--show-toplevel"], process.cwd());
  } catch {
    return { construir: true, motivo: "git indisponível — construindo por segurança" };
  }

  // Na Vercel, `VERCEL_GIT_PREVIOUS_SHA` é o commit publicado anterior. Sem ele
  // (primeiro deploy do projeto, force-push, push de uma branch nova) não há
  // base confiável para comparar.
  const base =
    baseArg || process.env.VERCEL_GIT_PREVIOUS_SHA || (() => {
      try {
        return git(["rev-parse", "HEAD^"], raiz);
      } catch {
        return "";
      }
    })();

  const head = headArg || process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";

  if (!base) {
    return { construir: true, motivo: "sem commit anterior — construindo por segurança" };
  }

  let alterados;
  try {
    alterados = git(["diff", "--name-only", `${base}`, `${head}`], raiz)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return { construir: true, motivo: "falha ao comparar commits — construindo por segurança" };
  }

  if (alterados.length === 0) {
    return { construir: false, motivo: "nenhum arquivo alterado" };
  }

  const relevantes = alterados.filter((caminho) =>
    CAMINHOS_QUE_CONSTROEM.some((re) => re.test(caminho)),
  );

  if (relevantes.length > 0) {
    return {
      construir: true,
      motivo: `${relevantes.length} arquivo(s) afetam o app`,
      exemplos: relevantes.slice(0, 5),
    };
  }

  return {
    construir: false,
    motivo: `nenhum dos ${alterados.length} arquivo(s) afeta o app`,
    exemplos: alterados.slice(0, 5),
  };
}

const { construir, motivo, exemplos = [] } = decidir();

console.log(`[vercel-ignore] ${construir ? "CONSTRUIR" : "PULAR"} — ${motivo}`);
for (const e of exemplos) console.log(`[vercel-ignore]   ${e}`);

// 0 = pular, != 0 = construir.
process.exit(construir ? 1 : 0);
