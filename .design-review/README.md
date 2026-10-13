# .design-review — captura e auditoria de UI

Ferramentaria local para **ver** a interface antes de aprová-la. Não é código de
produto e não é importado por nada.

## Por que existe

A auditoria de responsividade quase foi feita com o caminho óbvio:

```bash
chrome --headless --screenshot --window-size=390,2400 http://localhost:3000/
```

Isso **não funciona** e falha de um jeito perigoso: em vez de errar visivelmente,
`--window-size` foi ignorado e a captura saiu em 756×481 independentemente do
valor pedido. Uma captura com o viewport errado "prova" um overflow que não
existe — ou esconde um que existe. A conclusão inicial de que a home quebrava no
mobile era exatamente esse artefato.

`capture.cjs` resolve isso impondo o viewport por Chrome DevTools Protocol
(`Emulation.setDeviceMetricsOverride`), o mesmo mecanismo do modo dispositivo do
DevTools. Além da imagem, ele **mede** `documentElement.scrollWidth` e lista
cada elemento cujo `right` passa do viewport — que é a pergunta de verdade
("existe overflow horizontal?"), independente de interpretação visual.

## Uso

O Chrome precisa estar escutando em `--remote-debugging-port=9222`:

```bash
chrome --headless=new --disable-gpu --remote-debugging-port=9222 \
       --user-data-dir=/tmp/cp-chrome --no-first-run about:blank
```

Depois:

```bash
node .design-review/capture.cjs <url> <largura> <altura> <saida.png> [esperaMs]
```

Exemplo — largura real de iPhone:

```bash
node .design-review/capture.cjs http://localhost:3000/ 390 2600 home-390.png 9000
```

Saída: o JSON da medição de overflow (com os ofensores) e o PNG gravado.

## O que conta como aprovado

- `overflow` igual a 0 nas larguras 320, 390, 768, 1280 e 1440.
- Únicos elementos com `right` além do viewport: os brilhos decorativos da hero,
  que são filhos de um `overflow-hidden` e por isso não geram scroll. Qualquer
  outro ofensor é defeito.

## Os outros utilitários

| Arquivo | Serve para | Uso |
|---|---|---|
| `capture.cjs` | Captura em largura exata + mede overflow | `node .design-review/capture.cjs <url> <largura> <altura> <saida.png>` |
| `contraste.cjs` | Calcula contraste WCAG da nossa paleta | `node .design-review/contraste.cjs` |
| `linhas.cjs` | Acha **qual** elemento tem linhas longas (>80 chars) | `node .design-review/linhas.cjs <url> [largura]` |
| `axe.cjs` | Violações de acessibilidade em JSON (seletor + HTML) | `node .design-review/axe.cjs <url> [largura]` |

`linhas.cjs` e `axe.cjs` existem porque o detector diz *que* há um problema, mas
não *onde* — sem medir o elemento, a correção vira chute ("encolher tudo"
estragaria o layout). Ambos exigem o Chrome com `--remote-debugging-port=9222`.

Para a suíte completa (acessibilidade + funil + rotas), use `npm run e2e`: ela
sobe o próprio servidor na porta 3033 e não depende destes utilitários.

## Notas

- As capturas (`*.png`) não são versionadas; os scripts são.
- O servidor de desenvolvimento às vezes sobe em outra porta quando a 3000 já
  está ocupada por outro projeto. Confira a porta no log do `npm run dev` antes
  de culpar o layout — por isso a suíte Playwright usa a **3033**, dedicada.
- Rode `prisma generate` com o dev server **parado**: o servidor mantém um lock
  no `query_engine-windows.dll.node` e o comando falha com `EPERM`.
