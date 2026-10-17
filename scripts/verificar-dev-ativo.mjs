#!/usr/bin/env node
/**
 * Aborta o build quando há um servidor `next dev` deste projeto ativo.
 *
 * ── O problema que isto resolve ─────────────────────────────────────────────
 * `next dev` e `next build` compartilham `apps/web/.next`. Um servidor de
 * desenvolvimento ativo — inclusive um **órfão** deixado por script
 * (`Start-Process` + `cmd /c` deixa o filho vivo depois que o pai morre) — grava
 * nesse diretório enquanto o build lê. O resultado são falhas **intermitentes e
 * enganosas**, que parecem bug do código:
 *
 *   Invariant: no direct app page entry found for /_not-found
 *   ENOENT .../route.js.nft.json
 *   Cannot find module './chunks/vendor-chunks/next.js'
 *
 * Isso já custou tempo real neste repositório: medido, builds falhavam de forma
 * reprodutível com um dev server órfão ativo, e 14/14 passaram sem nenhum. O
 * AGENTS.md documenta a armadilha, mas documentação depende de alguém lembrar.
 * Esta verificação transforma o lembrete em falha imediata e clara.
 *
 * ── Por que falhar em vez de só avisar ──────────────────────────────────────
 * O modo de falha que importa é o silencioso: o build quebra no meio com uma
 * mensagem que aponta para o lugar errado. Um aviso é ignorado; um erro com
 * instrução de correção não é.
 *
 * ── Limite deliberado ──────────────────────────────────────────────────────
 * Se não for possível enumerar processos (ambiente restrito, comando ausente),
 * o script **avisa e deixa o build seguir**. Bloquear por incapacidade de medir
 * tornaria o guard um problema maior que a armadilha que ele previne.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * O caminho do projeto aparece na linha de comando do processo?
 *
 * ── O bug que isto corrige ──────────────────────────────────────────────────
 * A primeira versão comparava com `comando.includes(raizProjeto)` e **nunca
 * casava neste repositório**. Motivo: o caminho contém acento (`Currículo`) e a
 * saída do PowerShell chega na codepage do console, não em UTF-8 — o `í` vira
 * `?`. Resultado medido: `D:\PROJETOS\Curr?culo Pol?tico`, que não é substring de
 * `D:\PROJETOS\Currículo Político`. O guard existia e era inerte, falhando em
 * silêncio — o pior modo possível.
 *
 * Duas defesas, porque só uma seria frágil:
 *
 * 1. A enumeração força UTF-8 (ver `listarProcessosNode`). É a correção de causa.
 * 2. Esta comparação tolera a perda: cada caractere não-ASCII do caminho vira
 *    `.` (qualquer caractere), então tanto faz se o `í` chega como `í` ou como
 *    `?`. Funciona mesmo se a codepage do console for outra.
 */
function contemCaminhoDoProjeto(comando) {
  if (comando.includes(raizProjeto)) return true;

  const escapado = Array.from(raizProjeto)
    .map((ch) => {
      if (ch.codePointAt(0) > 127) return ".";
      return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");

  try {
    return new RegExp(escapado, "i").test(comando);
  } catch {
    return false;
  }
}

/**
 * Lista processos `node` com a linha de comando, de forma multiplataforma.
 *
 * Devolve `null` quando não é possível medir — quem chama decide o que fazer.
 */
function listarProcessosNode() {
  try {
    if (process.platform === "win32") {
      // `Get-CimInstance` é o substituto atual do `wmic` (descontinuado). Usar a
      // API CIM evita depender de formato de saída de ferramenta removida.
      //
      // `[Console]::OutputEncoding = UTF8` é obrigatório, não cosmético: sem ele
      // o PowerShell serializa o JSON na codepage do console e caminhos com
      // acento voltam corrompidos (ver `contemCaminhoDoProjeto`).
      const saida = execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; " +
            "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
            "Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
        ],
        { encoding: "utf8", timeout: 20_000, windowsHide: true },
      );
      if (!saida.trim()) return [];
      const bruto = JSON.parse(saida);
      const lista = Array.isArray(bruto) ? bruto : [bruto];
      return lista.map((p) => ({
        pid: Number(p.ProcessId),
        comando: String(p.CommandLine ?? ""),
      }));
    }

    // POSIX: `ps` com formato portátil o bastante para Linux e macOS.
    const saida = execFileSync("ps", ["-eo", "pid=,args="], {
      encoding: "utf8",
      timeout: 20_000,
    });
    return saida
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean)
      .map((linha) => {
        const [pid, ...resto] = linha.split(/\s+/);
        return { pid: Number(pid), comando: resto.join(" ") };
      });
  } catch {
    return null;
  }
}

/** Um processo é `next dev` deste projeto? */
function ehDevDesteProjeto({ comando }) {
  if (!comando) return false;
  const minusculo = comando.toLowerCase();

  // Precisa ser um comando de desenvolvimento do Next.
  const ehNextDev =
    minusculo.includes("next") &&
    (/\bnext\s+dev\b/.test(minusculo) || minusculo.includes("next-dev"));
  if (!ehNextDev) return false;

  // Precisa pertencer a ESTE projeto. Sem este filtro, um dev server de outro
  // projeto da máquina bloquearia o build daqui — e outros projetos Next existem
  // nesta máquina, disputando as mesmas portas.
  return contemCaminhoDoProjeto(comando);
}

function principal() {
  const processos = listarProcessosNode();

  if (processos === null) {
    console.warn(
      "[guard] Não foi possível verificar processos ativos; seguindo com o build.\n" +
        "        Se o build falhar com erro de `.next`, verifique manualmente se há\n" +
        "        um `next dev` órfão ativo (ver AGENTS.md, Armarilhas conhecidas).",
    );
    return;
  }

  const devAtivos = processos.filter(
    (p) => p.pid !== process.pid && ehDevDesteProjeto(p),
  );

  if (devAtivos.length === 0) return;

  console.error(
    "\n[guard] Build cancelado: há um `next dev` deste projeto em execução.\n",
  );
  for (const { pid, comando } of devAtivos) {
    const resumo = comando.length > 110 ? `${comando.slice(0, 107)}...` : comando;
    console.error(`  PID ${pid}: ${resumo}`);
  }
  console.error(
    "\n  `next dev` e `next build` compartilham apps/web/.next. Com os dois\n" +
      "  ativos, o build falha de forma intermitente e enganosa:\n" +
      "    Invariant: no direct app page entry found for /_not-found\n" +
      "    ENOENT .../route.js.nft.json\n" +
      "    Cannot find module './chunks/vendor-chunks/next.js'\n" +
      "\n  Encerre o servidor de desenvolvimento e rode o build novamente.\n" +
      "  Se ele for órfão (o pai já morreu), encerre pelo PID acima.\n",
  );
  process.exitCode = 1;
}

principal();
