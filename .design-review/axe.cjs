/**
 * Relatório de acessibilidade via axe-core injetado por CDP.
 *
 * Complementa `tests/e2e/acessibilidade.spec.ts`: o teste do Playwright diz
 * "passou/falhou", este script diz **exatamente o que** está errado (seletor,
 * trecho de HTML, mensagem) em JSON, o que é o que se precisa para corrigir.
 *
 * Uso: node .design-review/axe.cjs <url> [largura]
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const [, , url, larguraArg] = process.argv;
if (!url) {
  console.error("uso: node axe.cjs <url> [largura]");
  process.exit(2);
}

const largura = Number.parseInt(larguraArg ?? "1440", 10);
const porta = Number.parseInt(process.env.PROBE_CDP_PORT ?? "9222", 10);
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const pegarJson = (caminho) =>
  new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: porta, path: caminho }, (res) => {
      let c = "";
      res.setEncoding("utf8");
      res.on("data", (d) => (c += d));
      res.on("end", () => {
        try {
          resolve(JSON.parse(c));
        } catch (e) {
          reject(new Error(`não-JSON: ${e.message}`));
        }
      });
    });
    req.on("error", reject);
  });

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function principal() {
  // axe-core do pacote instalado: mesma versão que o teste usa.
  const axePath = require.resolve("axe-core/axe.min.js", {
    paths: [process.cwd()],
  });
  const axeSource = fs.readFileSync(axePath, "utf8");

  const alvos = await pegarJson("/json/list");
  const pagina = alvos.find((a) => a.type === "page" && a.webSocketDebuggerUrl);
  if (!pagina) throw new Error("nenhum alvo de página");

  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error("falha no WebSocket do CDP"));
  });

  let id = 1;
  const pendentes = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    const p = pendentes.get(m.id);
    if (p) {
      pendentes.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    }
  };
  const enviar = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = id++;
      pendentes.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await enviar("Page.enable");
  await enviar("Emulation.setDeviceMetricsOverride", {
    width: largura,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: largura < 768,
  });
  await enviar("Page.navigate", { url });
  await dormir(7000);

  await enviar("Runtime.evaluate", { expression: axeSource });
  const r = await enviar("Runtime.evaluate", {
    returnByValue: true,
    awaitPromise: true,
    expression: `axe.run(document, { runOnly: { type: 'tag', values: ${JSON.stringify(TAGS)} } })
      .then(res => res.violations.map(v => ({
        id: v.id, impact: v.impact, help: v.help,
        nodes: v.nodes.slice(0, 5).map(n => ({
          target: n.target.join(' '),
          html: (n.html || '').slice(0, 160),
          summary: (n.failureSummary || '').split('\\n').slice(0, 4).join(' | '),
        })),
      })))`,
  });

  ws.close();
  const violacoes = r.result.value ?? [];
  console.log(JSON.stringify({ url, largura, total: violacoes.length, violacoes }, null, 2));
  process.exit(violacoes.length > 0 ? 2 : 0);
}

principal().catch((e) => {
  console.error(`ERRO: ${e.message}`);
  process.exit(1);
});
