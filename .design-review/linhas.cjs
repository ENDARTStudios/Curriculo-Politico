/**
 * Utilitário de diagnóstico: mede quantos caracteres cada bloco de texto
 * realmente renderiza por linha, para achar violações de comprimento de linha.
 *
 * Por que existe: as ferramentas de detecção apontam "linhas longas" mas não
 * dizem QUAL elemento é o culpado. Sem medir, qualquer correção vira chute — e
 * "reduzir a largura de tudo" estraga o layout. Aqui medimos por elemento.
 *
 * Uso: node .design-review/linhas.cjs <url> [largura] [alturaMin]
 */

const http = require("node:http");

const [, , url, larguraArg] = process.argv;
if (!url) {
  console.error("uso: node linhas.cjs <url> [largura]");
  process.exit(2);
}

const largura = Number.parseInt(larguraArg ?? "1440", 10);
const porta = Number.parseInt(process.env.PROBE_CDP_PORT ?? "9222", 10);

const pegarJson = (caminho) =>
  new Promise((resolve, reject) => {
    const req = http.get(
      { host: "127.0.0.1", port: porta, path: caminho },
      (res) => {
        let corpo = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (corpo += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(corpo));
          } catch (e) {
            reject(new Error(`resposta não-JSON: ${e.message}`));
          }
        });
      },
    );
    req.on("error", reject);
  });

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function principal() {
  const alvos = await pegarJson("/json/list");
  const pagina = alvos.find((a) => a.type === "page" && a.webSocketDebuggerUrl);
  if (!pagina) throw new Error("nenhum alvo de página encontrado");

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
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await enviar("Page.navigate", { url });
  await dormir(6000);

  const r = await enviar("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const out = [];
      // Folhas de texto: só elementos cujo conteúdo é majoritariamente texto próprio.
      document.querySelectorAll('p, li, h1, h2, h3, dd, dt').forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const texto = (el.innerText || '').trim();
        if (texto.length < 40) return;

        // Mede a largura média de caractere para estimar chars por linha.
        const fs = parseFloat(cs.fontSize) || 16;
        const larguraEl = el.getBoundingClientRect().width;
        if (larguraEl < 40) return;

        // Conta as linhas reais pelo número de rects de linha do Range.
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = Array.from(range.getClientRects()).filter(r => r.height > 1);
        const linhas = Math.max(1, new Set(rects.map(r => Math.round(r.top))).size);

        // Largura média por caractere usando uma medição real.
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        const amostra = texto.slice(0, Math.min(120, texto.length));
        const larguraAmostra = ctx.measureText(amostra).width || 1;
        const porChar = larguraAmostra / amostra.length;
        const charsPorLinha = porChar > 0 ? Math.round(larguraEl / porChar) : 0;

        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 70),
          charsPorLinha,
          linhas,
          larguraPx: Math.round(larguraEl),
          inicio: texto.slice(0, 55).replace(/\\s+/g, ' '),
        });
      });
      return out.filter(o => o.charsPorLinha > 80).sort((a, b) => b.charsPorLinha - a.charsPorLinha).slice(0, 15);
    })()`,
  });

  ws.close();
  const ofensores = r.result.value ?? [];
  if (ofensores.length === 0) {
    console.log("Nenhum bloco de texto acima de 80 caracteres por linha.");
  } else {
    console.log(`Blocos com >80 chars/linha (viewport ${largura}px):\n`);
    for (const o of ofensores) {
      console.log(`  ${String(o.charsPorLinha).padStart(4)} ch/linha | ${o.linhas} linha(s) | ${o.larguraPx}px`);
      console.log(`       <${o.tag}> ${o.cls}`);
      console.log(`       "${o.inicio}..."\n`);
    }
  }
}

principal().catch((e) => {
  console.error(`ERRO: ${e.message}`);
  process.exit(1);
});
