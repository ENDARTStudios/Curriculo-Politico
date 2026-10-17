#!/usr/bin/env node
/**
 * Barra segredos antes que entrem no repositório.
 *
 * ── Por que isto existe ─────────────────────────────────────────────────────
 * Este projeto já perdeu credenciais de produção de forma destrutiva: o
 * `apps/web/.env` foi sobrescrito por engano e, por ser gitignored, **o Git não
 * tinha como recuperar** — os valores sobreviveram apenas em serviços externos.
 * Um segundo risco é o oposto: um segredo que *entra* no histórico do Git, onde
 * remover exige reescrever commits e rotacionar tudo.
 *
 * O `.gitignore` cobre `.env*`, mas ignora o caso em que alguém copia uma chave
 * para dentro de um arquivo versionado — um script de pipeline, um exemplo, uma
 * nota. Este scanner cobre essa lacuna.
 *
 * ── Modos ───────────────────────────────────────────────────────────────────
 *   node scripts/verificar-segredos.mjs            # só o que está em staging
 *   node scripts/verificar-segredos.mjs --all      # todos os arquivos versionados
 *   node scripts/verificar-segredos.mjs --test     # autoteste das regras
 *
 * Sai com código 1 ao encontrar algo. **Nunca imprime o segredo** — apenas o
 * arquivo, a linha, o tipo e um prefixo curto, para dar para identificar sem
 * espalhar o valor em logs de CI, transcript ou terminal compartilhado.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Regras de detecção.
 *
 * São baseadas em **prefixos conhecidos**, não em entropia genérica. Entropia
 * produz falsos positivos em hashes, minificação e fixtures, e um scanner que
 * grita errado é desligado — o que o torna pior que inútil. Aqui cada regex
 * corresponde a um formato real de credencial.
 */
const REGRAS = [
  {
    id: "supabase-access-token",
    descricao: "Supabase personal access token",
    regex: /sbp_[a-f0-9]{40,}/g,
  },
  {
    id: "supabase-secret-key",
    descricao: "Supabase secret key",
    regex: /sb_secret_[A-Za-z0-9_-]{16,}/g,
  },
  {
    id: "github-token",
    descricao: "GitHub token",
    regex: /\bgh[pousr]_[A-Za-z0-9]{36,}/g,
  },
  {
    id: "github-fine-grained-token",
    descricao: "GitHub fine-grained token",
    regex: /\bgithub_pat_[A-Za-z0-9_]{22,}/g,
  },
  {
    id: "aws-access-key-id",
    descricao: "AWS access key id",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: "google-oauth-client-secret",
    descricao: "Google OAuth client secret",
    regex: /\bGOCSPX-[A-Za-z0-9_-]{20,}/g,
  },
  {
    id: "google-api-key",
    descricao: "Google API key",
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: "chave-privada",
    descricao: "Chave privada em PEM",
    regex: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/g,
  },
  {
    id: "vercel-token",
    descricao: "Token da Vercel",
    regex: /\bvck_[A-Za-z0-9]{20,}/g,
  },
  {
    id: "typesafe-api-key",
    descricao: "Chave da Typesafe",
    regex: /\bapikey_[a-f0-9]{32,}/g,
  },
  {
    // Só URLs com credencial embutida e host real. `localhost`, `127.0.0.1` e
    // domínios internos do Railway/Docker são legítimos em dev e em compose, e
    // sinalizá-los treinaria quem lê a ignorar o alerta.
    id: "url-com-senha",
    descricao: "URL de conexão com senha embutida",
    regex:
      /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]{6,}@(?!localhost|127\.0\.0\.1|host\.docker\.internal|postgres\.railway\.internal)[^\s/]+/g,
  },
];

/** Formatos que nunca podem ser versionados, independente de conteúdo. */
const NOMES_PROIBIDOS = [
  { teste: (p) => /(^|\/)\.env$/i.test(p), motivo: "arquivo .env" },
  { teste: (p) => /(^|\/)\.env\.(?!example)[a-z]+$/i.test(p), motivo: "variante de .env" },
  { teste: (p) => /\.(pem|p12|pfx|jks)$/i.test(p), motivo: "arquivo de chave" },
  { teste: (p) => /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i.test(p), motivo: "chave SSH privada" },
];

function mascarar(valor) {
  if (valor.length <= 8) return `«${valor.length} caracteres»`;
  return `${valor.slice(0, 4)}…«${valor.length} caracteres»`;
}

/**
 * Converte um conteúdo em ocorrências.
 *
 * Recebe linhas já numeradas para que o relatório aponte a linha real do arquivo
 * ou do diff, não a linha do bloco analisado.
 */
function escanearLinhas(linhas) {
  const achados = [];
  for (const { numero, texto } of linhas) {
    for (const regra of REGRAS) {
      regra.regex.lastIndex = 0;
      let m;
      while ((m = regra.regex.exec(texto)) !== null) {
        achados.push({
          regra: regra.id,
          descricao: regra.descricao,
          linha: numero,
          evidencia: mascarar(m[0]),
        });
        // Evita laço infinito em regex de largura zero (nenhuma destas é, mas o
        // guarda é barato e protege regras futuras).
        if (m.index === regra.regex.lastIndex) regra.regex.lastIndex++;
      }
    }
  }
  return achados;
}

/** Executa git e devolve stdout como texto. */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Extrai as linhas **adicionadas** do diff em staging.
 *
 * Só as adicionadas: sinalizar uma linha antiga já presente no repositório
 * bloquearia qualquer commit que tocasse o arquivo, sem que aquele commit tenha
 * introduzido o problema. O relatório precisa apontar para o que está sendo
 * introduzido agora.
 */
function linhasAdicionadasNoStaging() {
  const porArquivo = new Map();

  let diff;
  try {
    diff = git(["diff", "--cached", "--unified=0", "--diff-filter=ACM", "--no-color"]);
  } catch {
    return porArquivo;
  }
  if (!diff.trim()) return porArquivo;

  let arquivoAtual = null;
  let numeroNovo = 0;

  for (const linha of diff.split("\n")) {
    if (linha.startsWith("+++ ")) {
      const alvo = linha.slice(4).trim();
      arquivoAtual = alvo === "/dev/null" ? null : alvo.replace(/^b\//, "");
      if (arquivoAtual) porArquivo.set(arquivoAtual, []);
      continue;
    }
    if (linha.startsWith("@@")) {
      // Formato: @@ -a,b +c,d @@  — interessa o início do lado novo (c).
      const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(linha);
      numeroNovo = m ? Number(m[1]) : 0;
      continue;
    }
    if (!arquivoAtual) continue;

    if (linha.startsWith("+")) {
      porArquivo.get(arquivoAtual).push({ numero: numeroNovo, texto: linha.slice(1) });
      numeroNovo++;
    } else if (linha.startsWith(" ")) {
      numeroNovo++;
    }
    // Linhas "-" não ocupam posição no lado novo do diff.
  }

  return porArquivo;
}

function arquivosEmStaging() {
  try {
    return git(["diff", "--cached", "--name-only", "--diff-filter=ACM"])
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function arquivosVersionados() {
  return git(["ls-files"]).split("\n").map((l) => l.trim()).filter(Boolean);
}

/**
 * O `.gitignore` ainda protege os arquivos de ambiente?
 *
 * Esta é a verificação que faltou quando as credenciais foram perdidas: se
 * alguém remover a regra `.env*` do `.gitignore`, o próximo `git add .` colocaria
 * segredos no histórico. Verificar isso é barato e o dano evitado é caro.
 */
function verificarGitignore() {
  let conteudo;
  try {
    conteudo = readFileSync(path.resolve(process.cwd(), ".gitignore"), "utf8");
  } catch {
    return { ok: false, motivo: ".gitignore não encontrado ou ilegível" };
  }

  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const cobreEnv = linhas.some(
    (l) => l === ".env" || l === ".env*" || l === "*.env" || l === "/.env" || l === "/.env*",
  );

  return cobreEnv
    ? { ok: true }
    : {
        ok: false,
        motivo:
          ".gitignore não contém uma regra para `.env`/`.env*`. Sem ela, `git add .` " +
          "versionaria credenciais de produção.",
      };
}

function relatar(problemas) {
  if (problemas.length === 0) return;

  console.error(`\n[segredos] ${problemas.length} problema(s) encontrado(s):\n`);
  for (const p of problemas) {
    if (p.tipo === "arquivo") {
      console.error(`  ${p.arquivo}: ${p.motivo}`);
    } else if (p.tipo === "gitignore") {
      console.error(`  .gitignore: ${p.motivo}`);
    } else {
      console.error(
        `  ${p.arquivo}:${p.linha}  ${p.descricao}  (${p.evidencia})`,
      );
    }
  }
  console.error(
    "\n  Nada foi impresso por completo de propósito: o relatório vai para logs de\n" +
      "  CI e transcripts. Identifique pelo arquivo e linha.\n" +
      "\n  Se for falso positivo, ajuste a regra em scripts/verificar-segredos.mjs.\n" +
      "  Se for real, NÃO faça commit: remova o valor e, se ele já foi exposto,\n" +
      "  rotacione a credencial.\n",
  );
}

/** Autoteste: prova que as regras detectam sem precisar de arquivo real. */
function autoteste() {
  // Os fixtures são **compostos**, não literais. Um cabeçalho PEM literal dentro
  // deste arquivo seria acusado pelo próprio scanner ao varrer o repositório —
  // foi exatamente o que aconteceu na primeira versão, e travava todo commit que
  // tocasse este arquivo. Montar as partes mantém o teste válido e o arquivo
  // escaneável. (Até esta explicação, escrita com o literal, disparava a regra.)
  const cabecalhoPem = ["-----BEGIN", "RSA", "PRIVATE", "KEY-----"].join(" ");
  const urlComSenha = [
    "postgresql://postgres:",
    "senhaforte",
    "@db.exemplo.com:5432/postgres",
  ].join("");

  const amostras = [
    { texto: `token=sbp_${"a".repeat(40)}`, esperado: "supabase-access-token" },
    { texto: `k=sb_secret_${"B".repeat(24)}`, esperado: "supabase-secret-key" },
    { texto: `t=ghp_${"c".repeat(36)}`, esperado: "github-token" },
    { texto: `t=github_pat_${"d".repeat(24)}`, esperado: "github-fine-grained-token" },
    { texto: `id=AKIA${"E".repeat(16)}`, esperado: "aws-access-key-id" },
    { texto: `s=GOCSPX-${"f".repeat(24)}`, esperado: "google-oauth-client-secret" },
    { texto: `k=AIza${"G".repeat(35)}`, esperado: "google-api-key" },
    { texto: cabecalhoPem, esperado: "chave-privada" },
    { texto: `v=vck_${"h".repeat(24)}`, esperado: "vercel-token" },
    { texto: `a=apikey_${"1".repeat(40)}`, esperado: "typesafe-api-key" },
    { texto: `DATABASE_URL=${urlComSenha}`, esperado: "url-com-senha" },
  ];

  let falhas = 0;
  for (const { texto, esperado } of amostras) {
    const achados = escanearLinhas([{ numero: 1, texto }]);
    const bateu = achados.some((a) => a.regra === esperado);
    if (!bateu) {
      console.error(`  FALHOU: esperava "${esperado}" em ${mascarar(texto)}`);
      falhas++;
    }
  }

  // Os negativos importam tanto quanto os positivos: um scanner que acusa
  // localhost e domínio interno do Railway é desligado na primeira semana.
  const negativos = [
    "DATABASE_URL=postgresql://postgres:radar_civico@localhost:15432/radarcivico",
    "DATABASE_URL=postgresql://postgres:abc@127.0.0.1:5432/db",
    "redis://redis.railway.internal:6379",
    "use sbp_ tokens, nunca os versione",
    "npm run typecheck && git push",
  ];
  for (const texto of negativos) {
    const achados = escanearLinhas([{ numero: 1, texto }]);
    if (achados.length > 0) {
      console.error(
        `  FALSO POSITIVO: "${achados[0].regra}" em ${mascarar(texto)}`,
      );
      falhas++;
    }
  }

  if (falhas === 0) {
    console.log(
      `  ✅ ${amostras.length} detecções e ${negativos.length} não-detecções OK`,
    );
    return;
  }
  process.exitCode = 1;
}

function principal() {
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    autoteste();
    return;
  }

  const problemas = [];

  // 1. O .gitignore precisa continuar protegendo os arquivos de ambiente.
  const gitignore = verificarGitignore();
  if (!gitignore.ok) {
    problemas.push({ tipo: "gitignore", motivo: gitignore.motivo });
  }

  // 2. Nomes de arquivo que nunca podem ser versionados.
  const arquivos = args.includes("--all") ? arquivosVersionados() : arquivosEmStaging();
  for (const arquivo of arquivos) {
    for (const regra of NOMES_PROIBIDOS) {
      if (regra.teste(arquivo)) {
        problemas.push({ tipo: "arquivo", arquivo, motivo: regra.motivo });
      }
    }
  }

  // 3. Conteúdo.
  if (args.includes("--all")) {
    for (const arquivo of arquivos) {
      if (NOMES_PROIBIDOS.some((r) => r.teste(arquivo))) continue;
      let conteudo;
      try {
        conteudo = readFileSync(path.resolve(process.cwd(), arquivo), "utf8");
      } catch {
        continue; // binário ou ilegível
      }
      if (conteudo.includes("\u0000")) continue; // binário
      const linhas = conteudo
        .split(/\r?\n/)
        .map((texto, i) => ({ numero: i + 1, texto }));
      for (const a of escanearLinhas(linhas)) {
        problemas.push({ tipo: "conteudo", arquivo, ...a });
      }
    }
  } else {
    for (const [arquivo, linhas] of linhasAdicionadasNoStaging()) {
      if (NOMES_PROIBIDOS.some((r) => r.teste(arquivo))) continue;
      for (const a of escanearLinhas(linhas)) {
        problemas.push({ tipo: "conteudo", arquivo, ...a });
      }
    }
  }

  if (problemas.length > 0) {
    relatar(problemas);
    process.exitCode = 1;
    return;
  }

  const escopo = args.includes("--all") ? "arquivos versionados" : "staging";
  console.log(`[segredos] nada encontrado em ${escopo} (${arquivos.length} arquivo(s)).`);
}

principal();
