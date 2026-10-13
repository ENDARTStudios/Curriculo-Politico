/**
 * PROBE TEMPORÁRIO — captura de tela em largura exata via Chrome DevTools
 * Protocol. Remova junto com o diretório `apps/web/src/app/probe-rt`.
 *
 * Por que existe: `chrome --headless --window-size=W,H --screenshot` não
 * respeita de forma confiável a largura de layout (verificado: `--window-size`
 * foi ignorado por completo em algumas invocações, e a captura saiu em 756×481
 * independentemente do valor pedido). Sem controlar o viewport, uma auditoria de
 * responsividade mede a largura errada e "prova" coisas que não aconteceram.
 *
 * Aqui o viewport é imposto por `Emulation.setDeviceMetricsOverride`, que é o
 * mesmo mecanismo do modo dispositivo do DevTools — determinístico e explícito.
 *
 * Uso:  node capture.cjs <url> <largura> <altura> <saida.png> [esperaMs]
 * Saída: o caminho do arquivo gravado.
 */

const fs = require("node:fs");
const http = require("node:http");

const [, , url, larguraArg, alturaArg, saida, esperaArg] = process.argv;

if (!url || !larguraArg || !alturaArg || !saida) {
  console.error(
    "uso: node capture.cjs <url> <largura> <altura> <saida.png> [esperaMs]",
  );
  process.exit(2);
}

const largura = Number.parseInt(larguraArg, 10);
const altura = Number.parseInt(alturaArg, 10);
const esperaMs = Number.parseInt(esperaArg ?? "3500", 10);
const porta = Number.parseInt(process.env.PROBE_CDP_PORT ?? "9222", 10);

function pegarJson(caminho) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: "127.0.0.1", port: porta, path: caminho },
      (res) => {
        let corpo = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (corpo += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(corpo));
          } catch (erro) {
            reject(new Error(`resposta não-JSON em ${caminho}: ${erro.message}`));
          }
        });
      },
    );
    req.on("error", reject);
  });
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function principal() {
  // O alvo precisa ser uma página (type === "page"), não o browser.
  const alvos = await pegarJson("/json/list");
  const pagina = alvos.find((a) => a.type === "page" && a.webSocketDebuggerUrl);
  if (!pagina) throw new Error("nenhum alvo de página com WebSocket encontrado");

  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("falha ao abrir o WebSocket do CDP"));
  });

  let proximoId = 1;
  const pendentes = new Map();
  ws.onmessage = (evento) => {
    const msg = JSON.parse(evento.data);
    const pendente = pendentes.get(msg.id);
    if (pendente) {
      pendentes.delete(msg.id);
      if (msg.error) pendente.reject(new Error(JSON.stringify(msg.error)));
      else pendente.resolve(msg.result);
    }
  };

  const enviar = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = proximoId++;
      pendentes.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await enviar("Page.enable");

  // O ponto central: viewport imposto, não sugerido.
  await enviar("Emulation.setDeviceMetricsOverride", {
    width: largura,
    height: altura,
    deviceScaleFactor: 1,
    mobile: largura < 768,
  });

  await enviar("Page.navigate", { url });
  await dormir(esperaMs);

  // Mede o overflow de verdade, no mesmo viewport da captura.
  const medicao = await enviar("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const de = document.documentElement;
      const vw = window.innerWidth;
      const ofensores = [];
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 1) {
          ofensores.push({
            tag: el.tagName.toLowerCase(),
            cls: typeof el.className === 'string' ? el.className.slice(0, 110) : '',
            right: Math.round(r.right),
            texto: (el.textContent || '').trim().slice(0, 40),
          });
        }
      });
      return {
        viewport: vw,
        scrollWidth: de.scrollWidth,
        overflow: de.scrollWidth - vw,
        ofensores: ofensores.slice(0, 12),
      };
    })()`,
  });

  const captura = await enviar("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });

  fs.writeFileSync(saida, Buffer.from(captura.data, "base64"));
  ws.close();

  console.log(JSON.stringify(medicao.result.value, null, 2));
  console.log(`GRAVADO ${saida}`);
}

principal().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exit(1);
});
