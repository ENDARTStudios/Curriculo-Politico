# Avaliação de ferramentas externas — Currículo Político / IDIP

**Data da pesquisa:** outubro de 2026
**Escopo:** avaliação de adoção. **Nada foi instalado.** Apenas leitura de sites, documentação,
licenças e repositórios.
**Método:** cada item foi aberto na fonte (docs oficiais, LICENSE, ToS, API do GitHub) ou marcado
explicitamente como **não verificado**. Onde o site não carregou conteúdo sem JavaScript, isso está
dito — não foi inventado conteúdo.

---

## Contexto de decisão

- `apps/web` = Next.js 15.5 App Router + React 19.1 + Tailwind v4, Prisma, Vercel, **AGPL-3.0-only**.
- Tema dark fixo, estética-alvo **"dados/editorial sério"** (credibilidade institucional).
- **WCAG 2.2 AA é requisito**, não melhoria. Público majoritário: eleitor no celular.
- CSP: `default-src 'self'`, `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, `img-src 'self' data: https:`.
- Já existe sistema de design próprio e um utilitário de screenshot via CDP.

**Estado real do repositório consultado nesta avaliação** (para ancorar a recomendação de CI):

| Arquivo | O que faz hoje |
|---|---|
| `.github/workflows/ci.yml` | `verify` em push/PR: `npm ci` → `prisma generate` → `typecheck` → `verify:scoring` → `verify:identity` → `build`. **Sem banco real** (usa `DATABASE_URL` dummy). Node 24, actions `@v4`. |
| `.github/workflows/production-smoke.yml` | Cron a cada 6h contra `PROD_URL`: 5 checagens via `curl` (home, ranking, `/api/search`, `/api/rankings`, `/status`). **Read-only, sem secrets.** |
| `.github/workflows/monthly-snapshot.yml` | Cron mensal do snapshot de scores. Não relacionado. |

> **Ressalva de honestidade:** o "utilitário de screenshot via Chrome DevTools Protocol" mencionado no
> briefing **não foi localizado neste workspace**. Busquei por `screenshot`,
> `Page.captureScreenshot`, `chrome-remote-interface`, `remote-debugging-port`, `9222`, `CDP`,
> `puppeteer`, `playwright` em `*.ts,*.js,*.mjs,*.cjs,*.json,*.yml,*.md` e não houve nenhuma
> ocorrência. Portanto a comparação "Playwright vs. o utilitário próprio" abaixo é feita **a partir da
> descrição que você deu**, não da leitura do código.

---

# A) TESTE E QUALIDADE

## 1. Playwright — https://github.com/microsoft/playwright

### a) O que é exatamente

Test runner + biblioteca de automação de browser da Microsoft (`@playwright/test`, `playwright`,
`playwright-core`). Instala e dirige builds próprios de **Chromium** (build open source + um
"chromium headless shell" separado para modo headless), **Firefox** (build com patches da Playwright —
não funciona com o Firefox de marca) e **WebKit** (derivado do main do WebKit, **não é o Safari** de
marca). Também **opera contra Chrome e Edge instalados na máquina** via canais (`chrome`, `msedge`,
`chrome-beta`, …). Faz E2E funcional, comparação visual (`toHaveScreenshot`), snapshots de ARIA,
trace viewer, e serve de base para auditoria de acessibilidade via `@axe-core/playwright`.

### b) Instalável? Sim, npm — e **o custo real é menor do que a fama sugere**

**A resposta direta à sua pergunta: sim, dá para instalar `@playwright/test` sem baixar nenhum browser
e usar um Chrome já instalado via `channel: 'chrome'`. São dois mecanismos independentes que se
combinam.**

**Mecanismo 1 — desde a v1.38 o `npm install` não baixa browsers.** Nota de release da v1.38.0
(13/09/2023), seção *"Breaking Changes: Playwright no longer downloads browsers automatically"*:

> "**v1.37 and earlier** — `playwright` package was downloading browsers during `npm install`, while
> `@playwright/test` was not.
> **v1.38 and later** — `playwright` and `@playwright/test` packages do not download browsers during
> `npm install`."

E ainda, no mesmo texto: *"If you are using `@playwright/test` package, this change **does not** affect
you."* Ou seja: `npm i -D @playwright/test` hoje custa **só o pacote npm** (a alguns MB), não 281 MB.
Os browsers só aparecem se você rodar `npx playwright install` de propósito.

> Se você quiser proibir o download mesmo que alguém rode o install por engano:
> `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. **Atenção:** na documentação oficial de *Browsers* esse
> recurso está anotado com `* langs: java` — isto é, a doc o apresenta no fluxo Java/.NET/Python, não no
> JS (justamente porque no JS o download já não acontece). A issue
> [microsoft/playwright#24607](https://github.com/microsoft/playwright/issues/24607) tem exatamente o
> título *"[BUG] PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD does not have effect"* — **não consegui ler o corpo
> da issue** (a página do GitHub veio truncada pela navegação), então o status atual dessa variável no
> pacote JS está **não verificado**. Recomendação: **não dependa dela**; dependa do fato documentado de
> que o install não baixa nada.

**Mecanismo 2 — `channel: 'chrome'`.** Config oficial:

```ts
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'Google Chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
});
```

A doc diz literalmente: *"it can operate against the branded Google Chrome and Microsoft Edge browsers
available on the machine (**note that Playwright doesn't install them by default**)"*. Canais
disponíveis: `chrome`, `msedge`, `chrome-beta`, `msedge-beta`, `chrome-dev`, `msedge-dev`,
`chrome-canary`, `msedge-canary`.

**Ressalvas documentadas do `channel: 'chrome'` (todas citadas da doc):**

1. *"Certain Enterprise Browser Policies may impact Playwright's ability to launch and control Google
   Chrome and Microsoft Edge. Running in an environment with browser policies is outside of the
   Playwright project's scope."*
2. *"Google Chrome and Microsoft Edge have switched to a new headless mode implementation that is
   closer to a regular headed mode. This differs from chromium headless shell that is used by Playwright
   by default when running headless, so expect different behavior in some cases. See issue #33566."*
3. Se você rodar `npx playwright install chrome`, ele instala no **local global padrão do SO,
   sobrescrevendo a instalação existente** (warning explícito da doc). Evite; use o Chrome que já existe.
4. `PLAYWRIGHT_BROWSERS_PATH` **não** se aplica a Chrome/Edge.
5. **Não verificado:** assumo que o runner `ubuntu-latest` do GitHub Actions já traz o Chrome estável
   pré-instalado, o que permitiria `channel: 'chrome'` **sem nenhum download** também no CI. Isso é
   conhecimento geral, não algo que eu tenha lido nesta sessão — **confirme no manifesto de software da
   imagem do runner** antes de prometer "zero download no CI".

### Tamanho em disco (números oficiais da doc)

A doc de *Browsers* mostra a saída de `du -hs ~/Library/Caches/ms-playwright/*`:

```
281M  chromium-XXXXXX
187M  firefox-XXXX
180M  webkit-XXXX
```

E afirma: *"These browsers will take a few hundred megabytes of disk space when installed."*
Locais de cache: `%USERPROFILE%\AppData\Local\ms-playwright` (Windows),
`~/Library/Caches/ms-playwright` (macOS), `~/.cache/ms-playwright` (Linux).

**Ordem de grandeza prática:**

| Cenário | Custo em disco |
|---|---|
| `npm i -D @playwright/test` (padrão hoje) | Alguns MB (só o pacote npm) |
| `+ channel: 'chrome'` | **0 MB** de browser gerenciado |
| `npx playwright install chromium` | ~281 MB + headless shell (as versões atuais separam o shell; a doc também oferece `--only-shell` / `--no-shell` para escolher) |
| `npx playwright install` (padrão = 3 browsers) | ~650 MB |

Há também `npx playwright uninstall` e garbage collection automática de browsers não usados
(`PLAYWRIGHT_SKIP_BROWSER_GC=1` desliga).

### Integração ao GitHub Actions existente

O YAML oficial atual (doc de CI) é:

```yaml
name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: lts/*
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npx playwright test
    - uses: actions/upload-artifact@v5
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

Pontos que importam para o **seu** caso:

- **Não quebre o `CI` rápido.** Não coloque Playwright dentro do job `verify` do `ci.yml`. Crie um
  workflow separado (`e2e.yml`) ou um job paralelo. O `verify` hoje roda sem banco e sem browser; isso é
  uma virtude.
- **O `ci.yml` não sobe servidor nem banco.** Para E2E autêntico você precisa de um alvo. A doc de
  Playwright tem a opção `webServer` no config (página *Web server* do menu de docs — **não li a página,
  não verificado**) para subir `next start`/`next dev` antes dos testes. Como a home é `force-dynamic` e
  `DATABASE_URL` decide tudo (aviso do seu próprio `AGENTS.md`), um E2E que sobe servidor local precisa de
  um banco de teste — e **jamais** apontado para produção.
- **O caminho mais barato e de maior valor: teste read-only contra o deploy, espelhando o
  `production-smoke.yml`.** A própria doc de CI tem um job para isso, e cita a Vercel nominalmente:

  ```yaml
  on:
    deployment_status:
  jobs:
    test:
      runs-on: ubuntu-latest
      if: github.event.deployment_status.state == 'success'
      steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        run: npx playwright test
        env:
          PLAYWRIGHT_TEST_BASE_URL: ${{ github.event.deployment_status.target_url }}
  ```

  A doc diz: *"Services like Vercel use this pattern so you can run your end-to-end tests on their
  deployed environment."* Isso encaixa perfeitamente no seu `production-smoke.yml`, que já faz smoke
  read-only contra `PROD_URL` sem secrets.
- A doc de CI recomenda `workers: process.env.CI ? 1 : undefined` e **sempre** um `globalTimeout`
  (o exemplo usa 1 hora) para que o reporter ainda produza relatório em vez de o runner matar o job.
- Para screenshots consistentes, a doc oferece a **imagem Docker oficial**
  `mcr.microsoft.com/playwright:v1.64.0-noble` com `options: --user 1001`, útil exatamente para
  "consistent environment for e.g. screenshots/visual regression testing".
- **Cache de browsers:** a doc de CI **não** recomenda cachear browsers — ela recomenda
  `npx playwright install --with-deps` a cada run (ou usar a imagem Docker). Não invente cache.
- **Versões de actions:** o exemplo oficial usa `actions/checkout@v6`, `setup-node@v6`,
  `upload-artifact@v5`. Seu `ci.yml` está em `@v4`. Se for unificar, faça o bump conscientemente.

### (a)(b)(c) — qual uso traz mais valor para quem já tem screenshot/overflow próprio

| Uso | Valor para nós | Por quê |
|---|---|---|
| **(c) Acessibilidade via `@axe-core/playwright`** | **MAIOR** | WCAG 2.2 AA é requisito e hoje **não há nenhum gate automatizado de acessibilidade no CI**. É a única das três capacidades que cobre um requisito que vocês declararam e não medem. |
| **(a) E2E funcional** | **ALTO, mas com custo** | Cobre fluxos reais (busca, perfil de parlamentar, ranking). Exige alvo com banco: ou deploy (read-only) ou banco de teste local. O `production-smoke.yml` já prova que o padrão read-only-por-cron é aceito pela equipe. |
| **(b) Regressão visual (`toHaveScreenshot`)** | **MÉDIO/BAIXO** | Vocês já têm medição de overflow em 375/768/1280 e screenshots via CDP. O ganho marginal é o *diffing com threshold e gate de CI*, não a captura. E há um custo real de infraestrutura (abaixo). |

**Sobre (b), as ressalvas documentadas são sérias** — a doc de *Visual comparisons* traz este warning:

> "Browser rendering can vary based on the host OS, version, settings, hardware, power source (battery
> vs. power adapter), headless mode, and other factors. For consistent screenshots, run tests in the same
> environment where the baseline screenshots were generated."

Consequência concreta: o nome do snapshot inclui **plataforma**
(`example-test-1-chromium-darwin.png` — *"the browser name and the platform. Screenshots differ between
browsers and platforms due to different rendering, fonts and more"*). Ou seja: **baseline gerada no seu
Windows local não serve no `ubuntu-latest`**. Você tem duas saídas: gerar baseline só no runner
(aceitando que ninguém valida visual localmente) ou fixar o ambiente com a imagem Docker oficial.
Ferramentas disponíveis: `maxDiffPixels` e `threshold` (pixelmatch; `threshold` default `0.2`),
`--update-snapshots`, e `stylePath` (um CSS aplicado durante a captura, *"allows filtering out dynamic
or volatile elements, hence improving the screenshot determinism"* — ex.: esconder iframes/elementos
voláteis). Ainda assim, isso é **reconstruir** parte do que seu utilitário próprio já faz, só que com
gate de CI. Se o objetivo é "não deixar passar regressão visual", vale; se é "medir overflow", não.

### (c) em detalhe — `@axe-core/playwright`

- **Versão atual:** `4.13.0`. **Licença: MPL-2.0** (campo `license` do `package.json`). Mantido pela
  **Deque**. Depende de `axe-core ~4.14.0`; peer `playwright-core >= 1.0.0`; **`engines.node >= 22.12.0`**
  (o seu CI usa Node 24 — compatível).
- Sendo **devDependency**, o axe não vai para o bundle servido ao usuário. MPL-2.0 é copyleft *por
  arquivo*; usando como ferramenta de teste não distribuída, não há conflito prático com AGPL-3.0. (Não é
  parecer jurídico.)
- **Snippet WCAG 2.2 AA.** A doc do Playwright mostra somente `['wcag2a', 'wcag2aa', 'wcag21a',
  'wcag21aa']` — **isso é WCAG 2.1, não 2.2**. Para cobrir 2.2 AA é preciso incluir `wcag22aa`
  explicitamente, e essa tag **existe e está documentada** na tabela *"Axe-core Tags"* do
  `doc/API.md` do axe-core: `wcag22aa` → *"WCAG 2.2 Level AA"*. (Não existe `wcag22a` na tabela — a
  WCAG 2.2 não adicionou critérios nível A novos, o que é coerente.)

  ```ts
  import { test, expect } from '@playwright/test';
  import AxeBuilder from '@axe-core/playwright';

  test('sem violações WCAG 2.2 AA detectáveis automaticamente', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
  ```

- **Limites — seja honesto com a equipe.** A própria doc do Playwright diz: *"Automated accessibility
  tests can detect some common accessibility problems… But many accessibility problems can only be
  discovered through manual testing"* e *"Note that automated testing cannot detect all types of WCAG
  violations."* Recomenda combinar com avaliação manual e testes com usuários, e cita o
  **Accessibility Insights for Web** (gratuito, open source) para avaliação manual.
  A cifra de cobertura mais citada no mercado é **~30–40% dos critérios WCAG** para scanners
  automatizados (axe, WAVE, Lighthouse). **Ressalva de fonte:** o número que li vem do blog da TestParty
  ([testparty.ai](https://testparty.ai/blog/automated-vs-manual-accessibility-audits-coverage)), que
  atribui a estimativa a "pesquisa da Deque" — **não li uma afirmação primária da Deque** confirmando
  isso. Trate 30–40% como ordem de grandeza de fonte secundária.
- **Pegadinha documentada:** o axe não testa regiões ocultas — *"Axe does not test hidden regions, such
  as inactive menus or modal windows. To test those for accessibility, write tests that activate or
  render the regions visible and run the analysis again."* A doc do Playwright reforça: interaja e faça
  `waitFor()` do estado **antes** de `analyze()`, senão o axe pode não ver os elementos.
- **Falsos positivos / dívida conhecida:** `AxeBuilder.exclude()` exclui o elemento **e todos os
  descendentes** e bloqueia **todas** as regras neles; `disableRules()` desliga regras. A doc sugere,
  para dívida pré-existente, snapshotar **fingerprints** de violação (`rule` + `targets`) e **nunca** o
  array `violations` inteiro (*"Don't do this! This is fragile"*).
- **CSP: não precisa mudar nada.** O axe é injetado no browser de teste; a sua CSP já permite
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, então não há atrito. E `img-src` não interfere.
  Também vale registrar: **se algum dia vocês endurecerem a CSP removendo `unsafe-inline`**, isso é um
  risco a checar para a injeção do axe — mas hoje é irrelevante.

### Verificação de atividade e licença

- **Licença: Apache-2.0**, confirmado no `LICENSE` do repositório
  (o arquivo traz "Portions Copyright (c) Microsoft Corporation. Portions Copyright 2017 Google Inc.").
- Mantido pela Microsoft; repositório ativo (a doc de CI referencia a versão `v1.64.0`).

### e) **VEREDITO: INSTALAR** — mas com escopo declarado

Instale `@playwright/test` + `@axe-core/playwright` para **(c) acessibilidade** e **(a) E2E read-only
contra o deploy**. Deixe **(b) regressão visual** para uma segunda fase, e só se quiserem gate de CI —
reconhecendo que baseline é por plataforma e que vocês já capturam tela por CDP. Custo de entrada baixo
(o `npm install` não baixa browser) e o ganho de maior valor é fechar o único requisito declarado
(WCAG 2.2 AA) que hoje não tem verificação automática nenhuma.

---

# B) DESIGN E INSPIRAÇÃO

> **Nota de método sobre esta seção.** Vários destes sites são SPA renderizados no cliente: o fetch
> retornou **apenas o `<title>`** para `refero.design`, `metal.jakubantalik.com`, `bencho.dev` e
> `bencho.dev/license`. **Não inventei conteúdo para eles** — onde isso aconteceu, busquei a fonte
> primária em outro lugar (repositório, `llms.txt`, `sitemap.xml`, API do GitHub) e marquei o que
> continues não verificado. `kobra.systems` e `obsidianui.dev` têm conteúdo server-rendered e foram
> lidos por inteiro.

## 2. Refero — https://refero.design/

### a) O que é exatamente

**Biblioteca de referências de UI/UX paga** — screenshots de telas, fluxos e projetos de produtos reais,
com busca, bookmarks/boards, plugin de Figma, "research chat" com IA, e um **servidor MCP**. **Não é
biblioteca de componentes e não tem código reutilizável.** O próprio título da página é
*"Refero — UI/UX Design Inspiration for Your Next Project"*. A página e a `/about` devolveram apenas o
título (SPA); o conteúdo real que li veio da documentação oficial em `doc.refero.design`.

### b) Instalável?

**Não** como dependência de código. É site + plugin de Figma + MCP (ambos pagos). Não há pacote npm.

### c) Licença e custo

Operado por **Refero Inc.**, corporação de Delaware. Planos (doc de *Plans*):

| Plano | O que dá |
|---|---|
| **Free** | Busca com resultados limitados; **sem acesso ao Refero MCP nem ao plugin de Figma** |
| **Pro** | Resultados completos, user flows, downloads, plugin Figma, **MCP** para o usuário licenciado, **Refero Skill** para agentes de IA |
| **Team** | Tudo do Pro + admin panel, bookmarks colaborativos, cobrança por assento |
| **Enterprise** | SAML SSO, contratos/procurement, DPA, suporte prioritário |
| **Lifetime** | Compra única, um usuário licenciado, inclui Pro + MCP |

- **Não há free trial** (*"Refero does not currently offer a free trial"*).
- **Preços: NÃO VERIFICADOS.** A doc diz *"See refero.design/pricing for current prices"*, e essa página
  é renderizada no cliente — o fetch retornou só o título. Não vou estimar valores.
- **Não pode compartilhar conta**: *"Each subscription is licensed to one user. Sharing credentials or
  providing access to others is not allowed."*
- Desconto estudante de 40% em Pro mensal/anual (Team e Lifetime excluídos).

**O que a licença permite e proíbe (ToS §10 e §13 — citando):**

- Screenshots, logos, marcas e materiais de terceiros **permanecem propriedade dos respectivos donos**.
  *"Their inclusion in Refero does not imply endorsement, sponsorship, or affiliation."*
- Permitido: *"use Refero Content through the Service for lawful design research, inspiration, internal
  reference, and ordinary product design work"* — inclusive em apresentações e arquivos Figma/FigJam.
- **Proibido** (a menos que autorizado por escrito): revender/redistribuir/sublicenciar/comercializar;
  fazer scraping ou extração sistemática fora dos downloads documentados; remover atribuição.
- **Proibido treinar modelos:** *"use Refero Content to train, fine-tune, evaluate, or improve machine
  learning models or datasets"* — vale para o conteúdo **e** para a saída do MCP (§13: *"This permission
  does not allow model training, fine-tuning, benchmarking, dataset creation, model evaluation"*).
- MCP tem limite de **8.000 requisições por período mensal** (salvo condição diversa), tokens **não podem
  ser publicados, compartilhados, embutidos em software cliente ou expostos em produto**.
- §15: a licença concedida é *"limited, revocable, non-exclusive, non-transferable"* e **não transfere
  propriedade**.

### d) O que é acionável para nós

**Nada de código.** É exatamente uma vitrine de referência visual — e uma vitrine com trava jurídica
explícita contra justamente o uso mais tentador num projeto com agentes de IA (alimentar/tunar modelo).
O que resta é legítimo e honesto: vocabulário visual, hierarquia tipográfica, padrões de tabela densa em
produtos de dados, tratamento de dark mode em produtos sérios (fintech/governo), e a organização de
fluxos.

**Aviso específico para este projeto:** o briefing menciona agentes/IA. Usar Refero MCP com um agente
para "aprender" o estilo é **expressamente vedado** pelo ToS (treinar/tunar/avaliar/criar dataset). Ler e
se inspirar é permitido; alimentar pipeline é não.

### e) **VEREDITO: APENAS REFERÊNCIA**

Nenhum código, licença proprietária, redistribuição vedada, MCP pago e com uso restrito — não é
instalável e não deve entrar em nenhum pipeline. Serve como referência visual, e só.

---

## 3. metal.jakubantalik.com

### a) O que é exatamente

**É um pacote npm real — não uma galeria.** `metal-fx`: *"Animated WebGL 'liquid metal' effect for
React. Wrap a button, chip, or icon and it gets a real-time metal ring with optional proximity
reflection on neighbouring elements."* O site `metal.jakubantalik.com` é apenas a **demo ao vivo**
(título da página: *"Liquid metal — Animated metal shader effect"*).

### b) Instalável? Sim

```bash
npm install metal-fx
```

```tsx
import { MetalFx } from 'metal-fx';

<MetalFx variant="button" preset="chromatic" theme="dark" strength={0.7}>
  <button className="upgrade-pill">Upgrade to Pro</button>
</MetalFx>
```

Variantes `button`/`circle`; presets `chromatic` (default, arco-íris iridescente), `silver`, `gold`;
`theme` `auto`/`dark`/`light`; `strength` 0–1; `paused`; `reflectionTargets` (só dark mode);
`borderRadius` (lê o `border-radius` computado do filho por padrão).

### c) Licença e custo

**MIT © Jakub Antalik** — confirmado no `README` (*"MIT © Jakub Antalik. See LICENSE"*) e na API do
GitHub (`"license": {"spdx_id": "MIT"}`). Grátis, sem conta.

**Estado de manutenção (API do GitHub, consultada agora):** 490 stars, 34 forks, criado em
2026-05-04, **último push em 2026-09-21**, `archived: false`, 2 issues abertas, linguagem TypeScript.
**Não está abandonado.**

### d) O que é acionável para nós — e por que não é

É tecnicamente excelente e o README mostra cuidado de engenharia que merece registro: **um único
contexto WebGL compartilhado** entre todos os `<MetalFx>` montados, **um único `requestAnimationFrame`**
para todas as instâncias, `IntersectionObserver` pausando instâncias fora da tela, `ResizeObserver`
com debounce via RAF, liberação do contexto GL quando o último unmount acontece, e **SSR-safe**
(*"renders a transparent placeholder during SSR and only mounts the WebGL pipeline after hydration"*).

Mas o encaixe no **nosso** projeto é ruim, e por três motivos concretos:

1. **Estética.** "Liquid metal" iridescente é linguagem de campanha publicitária / produto de consumo
   ("Upgrade to Pro" é literalmente o exemplo do README). O alvo é *"dados/editorial sério"* e
   *"credibilidade institucional, não campanha publicitária"*. É o oposto.
2. **Mobile.** O público majoritário é o eleitor no celular. Um shader WebGL animado permanente é custo
   de GPU/bateria para efeito puramente decorativo.
3. **Acessibilidade — lacuna real.** O README documenta `prefers-color-scheme` e um prop `paused`, mas
   **não documenta nenhum tratamento de `prefers-reduced-motion`**. Num requisito WCAG 2.2 AA, animação
   contínua sem respeitar redução de movimento é problema. Você teria que ligar `paused` à media query
   manualmente. **Não verificado no código-fonte** (li o README, não o `src`).

### e) **VEREDITO: DESCARTAR**

Ferramenta legítima, MIT, ativa e bem construída — mas conflita frontalmente com a estética-alvo e
adiciona custo de WebGL num público majoritariamente mobile, sem tratamento documentado de
`prefers-reduced-motion`. Se um dia quisessem um único acento metálico em CTA, é `npm i metal-fx` e
zero licenciamento; hoje, não.

---

## 4. loading.daniasyrofi.com

### a) O que é exatamente

*"Loading — Animated loaders for moments in between."* Um **registry de componentes de loader** no
estilo shadcn. A página tem três partes: **Installation** com abas *React* / *HTML* e a instrução
*"Run once from your project root. Loading is copied into `components/ui`"*; **Usage**; e um
**Playground** com controles de **Animation**, **Size** (64px / 32px / 20px) e **Speed** (1.00×), com
exemplo renderizado ("Orbit / 64px"). Autor: **Dani Asyrofi** (link para `daniasyrofi.com` e `@dani_asyrofi`
no X).

**Detalhe que conta a favor:** o playground exibe *"Reduced motion is on. Your preview stays still."* —
ou seja, **o loader respeita `prefers-reduced-motion`**. Para um requisito AA, isso é exatamente o tipo
de detalhe que importa.

### b) Instalável?

**Parcialmente, e por cópia — não por dependência.** O modelo é *copiar o código para `components/ui`*.
Isso é bom (você passa a ser dono do código) e ruim (não há versionamento/upgrade).

Existe repositório: **`daniasyrofi/loading`** — descrição *"A loading-state library exploring UI
feedback, motion, and waiting experiences with CSS, SVG, Canvas, and WebGL"*. Tópicos: `canvas`,
`css-animation`, `design-engineering`, `interaction-design`, `loading-animation`, `ui-components`,
`webgl`. **Não verifiquei se publica pacote no npm** — na página do site a instalação é por cópia, não
por `npm install`.

### c) Licença e custo

**MIT**, confirmado na API do GitHub (`"spdx_id": "MIT"`). Grátis. Nenhuma menção a conta.

**Estado de manutenção — este é o ponto que exige ceticismo (API do GitHub):**

| Métrica | Valor |
|---|---|
| Stars | **1** |
| Forks | **0** |
| Criado em | 2026-09-01 |
| Último push | **2026-09-06** |
| Issues abertas | 0 |
| Licença | MIT |

Ou seja: **projeto pessoal, de uma pessoa, com 5 dias de atividade e depois nada.** Não é "abandonado"
no sentido de expirado — é simplesmente **muito novo e sem tração**. Não há histórico para confiar em
manutenção. Isso não invalida o código (MIT, você pode vendorizar); invalida tratá-lo como dependência.

### d) O que é acionável para nós

Estados de carregamento são um ponto real num app `force-dynamic` com banco: *"Empty and loading states
are designed, not left blank"* é uma regra que qualquer sistema de design sério endossa. Daqui saem
coisas aproveitáveis: um ou dois loaders discretos, o padrão de **respeitar `prefers-reduced-motion` por
padrão** (copie a decisão, não necessariamente o componente), e a lista de tamanhos 64/32/20px que
conversa com a escala de um design system existente.

O que **não** aproveitar: os loaders de **Canvas/WebGL** — para uma plataforma de transparência, um
loader é um indicador de estado, não um número de espetáculo.

### e) **VEREDITO: ADAPTAR (escopo estreito)**

Copie 1–2 loaders em `components/ui`, mantenha o respeito a `prefers-reduced-motion`, e **não** crie
dependência: 1 star e 5 dias de commits não sustentam confiança de manutenção. Licença MIT torna a
vendorização limpa.

---

## 5. temp.obsidianui.dev — ObsidianUI

> **Achado de infraestrutura:** `https://temp.obsidianui.dev` responde **301 para
> `https://www.temp.obsidianui.dev`** (o fetch recusou seguir cross-origin; segui manualmente). O
> subdomínio **`temp.`** sugere deploy de staging/preview, e o canônico citado nos próprios metadados é
> **`obsidianui.dev`** (o registry aponta para `https://www.obsidianui.dev/r/{name}.json`). Ou seja: o
> endereço que você me deu é provavelmente um **ambiente temporário de uma ferramenta que existe em
> endereço próprio**. Use `obsidianui.dev` como canônico.

### a) O que é exatamente

**ObsidianUI — "React & Tailwind CSS Components Library"** (*"Design Less. Ship Better."*). **É uma
biblioteca de componentes de verdade, não uma galeria**: site de docs em Nextra com página de instalação,
instalação de Tailwind, "add utilities", **CLI/MCP**, e **uma página de docs por componente**.
Stack declarada na home: **React, TypeScript, Tailwind**. Autor: **Atharv** (`athrix.me`,
`@athrix_codes`).

O catálogo é **fortemente orientado a efeitos**, e isso é diagnóstico para nós:

- **WebGL Effects:** Fractal Glass, Book Flip, Curved Plane, Grid Lift, Hover Slider, Interactive Blur
  Reveal, Art Gallery
- **Cursor Effects:** Butterfly Trail, Colorful Cursor Aura, Interactive Arrows, Magnetic Image Trail,
  Mask Cursor, Rope Cursor
- **Scroll Animations:** Draggable Marquee, Flip Scroll, Flow Scroll, Glowing Scroll Indicator,
  Horizontal Scroll, Marquee on SVG Path, Parallax Gallery, Scroll Effect, Scroll Stack, SVG Pixel Reveal
- **Text Animations:** Flip Text, Rectangular Text Reveal, Text Fill Animation, Text Stream
- **Backgrounds:** **Dither Canvas, Dotted Grid**
- **Menus/Inputs/Media:** Apple Spotlight, Circle Menu, Magnet Tabs, Jelly Loader, **OTP Input**,
  Arrow Fill Button, Folder Preview, Hover Image, **Masonry Grid**, Pixelated Carousel, Trading Card

### b) Instalável? Sim — é um registry shadcn com MCP

A página `docs/cli` documenta o **shadcn MCP Server**: adicionar ao `components.json` do projeto

```json
{
  "registries": {
    "@obsidian": "https://www.obsidianui.dev/r/{name}.json"
  }
}
```

e então o agente/CLI instala os componentes do registry. Há também páginas `docs/installation`,
`docs/install-tailwind`, `docs/add-utilities` e `docs/cli` — a página de instalação que abri descreve o
`create-next-app`, ou seja, é o fluxo de quem vai começar; **os comandos exatos de `add` do registry não
estavam no trecho que li** (conteúdo truncado). Não invente o comando: o padrão shadcn é
`npx shadcn@latest add @obsidian/<componente>`, mas **não verifiquei essa linha na doc**.

### c) Licença e custo

- **MIT License © 2026 ObsidianUI** — confirmado no arquivo `LICENSE` do repositório (texto MIT padrão).
- Repositório: **`Atharvsinh-codez/ObsidianUI`** — *"React & Tailwind CSS Components Library"*.
- **Estado de manutenção (API do GitHub):** **474 stars**, 28 forks, TypeScript, criado em
  **2026-01-10**, **último push em 2026-10-12** (muito recente), `archived: false`, 1 issue aberta,
  homepage `https://obsidianui.dev`. **Projeto ativo e com tração real** — o contrário da suspeita de
  "abandonado/expirado".
- O rodapé tem links explícitos para *"Source code"* (GitHub) e *"MIT license"*, e a home diz **"New
  Component every week"**. Grátis, sem conta, sem assinatura.
- **Ressalva:** as perguntas do FAQ (*"Is ObsidianUI free and open source?"*, *"Can I use ObsidianUI in
  commercial projects?"*, *"Do I need an account or subscription?"*) aparecem na página como **acordeões
  fechados** — os **enunciados** foram lidos, as **respostas não** (não estão no HTML servido). A base
  para dizer "grátis, MIT, uso comercial" é o arquivo `LICENSE` + o link de rodapé, não o texto do FAQ.

### d) O que é acionável para nós

Sendo justo: **a maior parte do catálogo é o oposto do alvo.** Cursor com rastro de borboleta, WebGL
"fractal glass", marquee em path SVG e "parallax gallery" são linguagem de **site de estúdio criativo**,
não de plataforma de transparência com credibilidade institucional. Além disso, "respeita
`prefers-reduced-motion`" **não é afirmado em nenhum lugar que eu tenha lido** — e uma biblioteca cuja
especialidade é movimento contínuo precisa provar isso antes de entrar num requisito AA.

O que **realmente** pode ser aproveitado, e é pouco mas é honesto:

- **Dotted Grid / Dither Canvas** (categoria *Backgrounds*) — textura de fundo discreta que combina com
  um tema `bg-slate-950` editorial; é a única parte do catálogo cuja linguagem visual serve a "dados
  sérios".
- **OTP Input / Masonry Grid / Folder Preview** — primitivas neutras, se algum dia precisarem.
- **Jelly Loader** — um loader, com a mesma ressalva de movimento do item 4.

Fora isso: **referência visual de motion design**, nada mais.

### e) **VEREDITO: ADAPTAR (cherry-pick), não adotar**

MIT, ativo, 474 stars — juridicamente e tecnicamente instalável, então **não é caso de DESCARTAR**. Mas
adotar o catálogo seria importar a estética errada. Colha no máximo 1–2 itens neutros (Dotted Grid como
textura, talvez um loader) **copiados como código próprio**, e trate o resto como referência. Antes de
qualquer adoção com movimento, exija a prova de `prefers-reduced-motion` no código do componente.

---

## 6. kobra.systems

### a) O que é exatamente

**Kobra — biblioteca de componentes React para shadcn, instalada via shadcn CLI.** Definição do próprio
autor, do arquivo `install.md` (escrito explicitamente *"for coding agents"*):

> "A React component library for shadcn, installed through the shadcn CLI. 100+ components counting the
> variants inside them, indexed below under 81 names. 10 of those install free."

São **81 nomes de componente** em 8 categorias: **Free** (10), **Agents**, **Content**, **Feedback**,
**Form controls**, **Layout**, **Navigation**, **Overlays**. Base técnica: **Tailwind + Base UI**
("*Utilities you already read, on primitives that already handle the keyboard*"). Além dos componentes,
oferece: **servidor MCP**, **skills de agente** (motion, sound design, migração de design system), um
**Figma kit gratuito** na Community, e **interface sound design** ("*Short, quiet and synthesized, from
one layer you install once and mount around the app*").

**Componentes Free (sem conta):** `input-otp`, `navigation-menu`, `video`, `carousel`, `ai-editor`,
`command-menu`, `toast`, `conversation`, `halftone-dots`, `sound`.

Os componentes pagos incluem muita coisa de **AI/chat surfaces** (reasoning-steps, chat-history,
file-diff, streaming-text, inline-citations, plan-card, question-card, message-scroller) e primitivas
de dados (**table**, **grouped-table**, chart, item, badge, marker, kbd) — estas últimas são as
potencialmente relevantes para nós.

### b) Instalável? Sim — registry shadcn com token

```json
"registries": {
  "@kobra": {
    "url": "https://kobra.systems/r/{name}.json",
    "headers": { "Authorization": "Bearer ${KOBRA_TOKEN}" }
  }
}
```

```bash
npx shadcn@latest add @kobra/button
```

Os **10 gratuitos instalam sem conta**. Os demais exigem **registry token** obtido em
`kobra.systems/dashboard`, lido de `KOBRA_TOKEN` no ambiente. Opcionalmente:

```bash
claude mcp add --transport http kobra https://kobra.systems/api/mcp \
  --header "Authorization: Bearer ${KOBRA_TOKEN}"
npx skills add https://skills.sh/p/BCo1c0oBAtHom5It
```

O `install.md` afirma que ele é o **conteúdo inteiro** da interface: *"Everything below is the whole
interface — setup, the rules, the house style and every component: there is no separate documentation
site to fetch."* Também servido em `kobra.systems/design.md` e `kobra.systems/llms.txt`.

### c) Licença e custo — **este é o bloqueio**

Da página de preços:

| Plano | Preço | Termos de licença |
|---|---|---|
| **Free** | 0 USD | 10 componentes, para sempre, sem conta. **"Personal use only"** |
| **Individual** | **$249 → $199 USD** (desconto de lançamento), **pagamento único** | Todos os 100+ componentes, **"Unlimited commercial projects"**, atualizações vitalícias, MCP, suporte em 24h |
| **Teams** | **$599 USD pagamento único**, por assento (exibe 4 assentos; 2–25 assentos) | Tudo do Individual + POs/faturamento, suporte em 12h, 2 meses de Krafa Pro |

Suporte a **POs e faturamento customizado** no Teams. Preços "plus local taxes".

**O bloqueio, dito com todas as letras:** o plano gratuito é **"Personal use only"**. Este projeto é uma
**plataforma open-source pública sob AGPL-3.0-only** — o código-fonte é distribuído. Usar os 10
componentes "grátis" aqui **excede "personal use"** e ainda os redistribuiria publicamente no repositório
AGPL. **A tier gratuita é, na prática, inutilizável para nós.** Qualquer uso exigiria a licença
Individual de **$199 (pagamento único)**.

**Ponto de ceticismo que registro em vez de engolir:** a página de preços exibe uma parede de logos —
*"Trusted by developers and designers at"* **Stripe, Microsoft, Notion, Uber, Figma, Netflix, Dropbox,
Apple, Shopify, OpenAI, Airbnb, Google, Meta, Coinbase, Cursor, Ramp, Attio…** — **sem nenhuma
substanciação** (sem depoimentos, sem casos, sem indicação de que uma pessoa dessas empresas usou o
produto). **Não verifiquei e não é verificável a partir da página.** Trate como marketing não
comprovado; se um dia isso importar para uma decisão de compra, peça referências reais.

**Sobre acessibilidade — atenção à versão:** a página de preços afirma que os componentes são
*"screen reader tested, accessible to **WCAG 2.1 AA** and responsive"*. **É a alegação deles**, e é
**WCAG 2.1**, não 2.2. O nosso requisito é **2.2 AA**. Um componente que afirma conformidade 2.1 AA não
está, por isso, conforme 2.2 AA (a 2.2 acrescentou critérios como *Focus Not Obscured*, *Dragging
Movements*, *Target Size (Minimum)* e *Consistent Help*). Isso teria que ser reauditado por nós.

### d) O que é acionável para nós

Há duas coisas aqui com valor real, e uma delas **não custa nada**:

**1. O `install.md` / `design.md` — um documento de regras de estilo gratuito e muito bom.** É a parte
mais valiosa do achado. Trechos que conversam diretamente com a nossa estética-alvo e com AA:

- *"**Color is information.** The palette is gray — every neutral token is pure achromatic. Color arrives
  through content, and through the four status hues… A colored surface should mean something."* —
  exatamente o princípio de um produto de dados sério.
- *"**Two weights, not five.** 400 for everything, 700 for emphasis… Size and color carry hierarchy;
  weight is the last resort."*
- *"**Interface text is small and dense.** 14px is the body size, 13px for secondary labels… Line length
  caps around 60 characters."*
- *"**One hairline, then depth.** A surface gets a single border or a ring at about 10% opacity, and
  separation past that comes from a shadow, not a second heavier line."*
- *"**Motion is short and asymmetric.** Entrances 150–250ms… exits shorter… Animate transform, opacity
  and filter. **Everything answers `motion-reduce`.**"*
- *"**Focus is one ring.** `focus-visible:ring-3 ring-ring/50`, never an outline removed and not
  replaced. **`--ring` clears 3:1 against the page on its own.**"* — isto é WCAG 2.4.11/1.4.11 pensado
  desde o token.
- *"**A busy button keeps its word.** The label turns out and a spinner turns in; never swap it for
  'Saving…', and never disable it, which dims the spinner that is the state."*
- *"**Numbers that change get `tabular-nums`**, so a counter does not shuffle the layout under itself."*
  — para uma plataforma de ranking com scores, isso é diretamente aplicável.
- *"**Empty and loading states are designed**, not left blank."*

  Vale notar: essas regras não são só boas, são **as mesmas conclusões a que um projeto de transparência
  sério chegaria** — inclusive `tabular-nums` e `motion-reduce`. Sugiro ler esse documento e comparar
  com as nossas skills de design, adotando ideias que façam sentido (sem instalar nada).

**2. Componentes de dados, se um dia pagarem.** `table`, `grouped-table`, `chart`, `item`, `badge`,
`marker`, `kbd`, `alert`, `progress`, `skeleton`, `empty`, `pagination`, `breadcrumb`, `sidebar` — é o
subconjunto sóbrio. Mas: custam $199, entram em conflito com o **nosso** sistema de tokens (o
`install.md` instrui a usar os tokens **deles**: *"Use theme tokens — `bg-muted`, `text-foreground`,
`border` — never raw palette colors"*, e *"Colors, radius and type are CSS variables, so retheming is
editing those variables"*), e nós **já temos** sistema de design próprio com skills como fonte de
verdade. Misturar dois sistemas de tokens num projeto AGPL para economizar trabalho de UI é um péssimo
negócio.

### e) **VEREDITO: APENAS REFERÊNCIA**

Não instalar. A tier gratuita é **"personal use only"** e portanto incompatível com um repositório
público AGPL; a tier utilizável custa $199 e colidiria com o design system que já temos. Mas **leia o
`install.md`/`design.md`** — é uma referência de regras de estilo gratuita, densa e alinhada com
"dados/editorial sério", e as alegações de acessibilidade deles são WCAG **2.1** AA, um nível abaixo do
nosso requisito.

---

## 7. bencho.dev

### a) O que é exatamente

**Bencho — biblioteca de componentes React interativos e micro-interações.** A melhor descrição está no
próprio `llms.txt` do site (arquivo para agentes):

> "Bencho (bencho.dev) is a library of interactive React UI components and micro-interactions. **Every
> block is live, not a recording**: it can be played with, tuned with its own controls, and its source
> copied into a project.
> - Built with **React, TypeScript and framer-motion**.
> - The blocks are **MIT licensed**.
> - **48 blocks**, each with its own page, live demo and adjustable values; most include their full
>   source to copy.
> - **Finds**: a curated gallery of UI interactions by **other designers, credited to their makers**.
> - **Sounds**: a library of synthesised sounds for UI interactions.
> - **Bench**: a canvas for arranging and tuning blocks side by side.
> - Made by **Lorenzo Cabra**. On X: **@benchodev**."

Ou seja: **é um híbrido.** A parte "Blocks" é código real, copiável e (declaradamente) MIT. A parte
"Finds" é **exatamente a galeria de vitrine** que você suspeitava — e o próprio autor diz que é de
**outros designers**, com crédito. São coisas diferentes sob o mesmo domínio, e o veredito tem que
separá-las.

O `sitemap.xml` confirma a estrutura: `/`, `/finds`, `/sounds`, `/bench`, `/privacy`, `/licence`,
`/terms`, `/refunds`, `/sponsor`, ~140 URLs em `/finds/<autor>-<interação>`, e 48 URLs em
`/blocks/<nome>`. **`lastmod` mais recente: 2026-10-12** → **ativo**.

### b) Instalável?

**Não como pacote npm.** O modelo é **copiar o código-fonte do bloco** (a página de cada bloco tem
*demo ao vivo + valores ajustáveis + o código*). "Bench" é um canvas para testar blocos lado a lado.

**Ressalva de leitura, importante:** `bencho.dev/` e `bencho.dev/license` são **renderizados no
cliente** — o fetch devolveu **apenas o `<title>`** em ambos. **Não li o texto da página de licença.**
A afirmação "blocks são MIT" vem do **`llms.txt` do próprio site** (arquivo que eles publicam para
agentes), não da leitura da licença. **Confirme o texto em `bencho.dev/license` no browser antes de
vendorizar.** Registro também que o `llms.txt` aponta para `/license` enquanto o `sitemap.xml` lista
`/licence` — provavelmente a mesma página com alias, mas **não verifiquei**.

### c) Licença e custo

- **Blocks: MIT (declarado pelo autor em `llms.txt`)** — livre para reuso, inclusive comercial, com
  atribuição. **Não verificado no texto da licença.**
- **Finds: NÃO é código nosso para reusar.** É trabalho de terceiros, apenas creditado. Uma galeria que
  só permite "olhar" não é instalável — e essa parte merece **DESCARTAR como ferramenta**.
- **Sounds: licença não verificada.** O `llms.txt` atribui MIT **aos blocks**, não explicitamente aos
  sons. Não presuma.
- Custo: parece gratuito, sem conta. Há página `/sponsor` (modelo de financiamento) e `/refunds`/`/terms`
  (o que sugere que algo é vendido — **não verifiquei o quê**).

### d) O que é acionável para nós

Sendo rigoroso: **a maioria dos 48 blocos é decorativa e fora do alvo.** Tilt 3D card, magnetic chip
select, gooey metaball create menu, shader wall, dynamic island, particle/shockwave, glass bubble
refração, "runaway button", "dragging squishy ball" — linguagem de site de estúdio, o oposto de
credibilidade institucional. Vários são explicitamente estudos de física/metaball.

Mas há uma minoria **funcional e sóbria** que mapeia direto em problemas de um produto de dados, e é
onde está o valor real:

| Bloco | Por que serve a nós |
|---|---|
| **Floating Label Input** | Campo de formulário padrão; label vira placeholder e sobe no focus. Neutro e útil (busca de parlamentar). |
| **OTP Input / One-time code** | *"Six boxes for a verification code that **are really one field**, so paste, autofill and backspace all just work"* — é a forma correta de fazer, com acessibilidade de teclado resolvida. |
| **Upload dropzone** | Drag & drop com barra de progresso **e limite de tamanho com recusa** — útil em qualquer fluxo de envio de documento. |
| **Step Progress Indicator** | Indicador de progresso de etapas; honesto e sem espetáculo. |
| **Animated Checklist** | *"the only thing this block does is cross one out"* — discreto por design. |
| **Number Stepper with Drag** | *"Tap for one, hold to sweep… so the coarse move never costs you the fine one"* — bom padrão para filtros numéricos. |
| **Action Node Card** | Card de passo de automação com controles dobrados no canto. |
| **Inline Delete Confirmation** | Confirmação destrutiva **inline**, sem modal. Reduz atrito e é melhor para a11y que diálogo. |
| **Multi-Select List** | Lista de seleção com linhas que se elevam; útil para filtros de bancada/partido. |
| **Circular Dial / Tick Slider / Range Slider** | Controles de faixa; atenção ao critério 2.5.7 *Dragging Movements* da WCAG 2.2 — precisa de alternativa sem arrasto. |
| **Notify Me button** | Confirmação no próprio controle, sem toast a dispensar: *"there is nothing to read and nothing to dismiss"* — conversa com a regra de não ruído. |
| **Image Comparison Slider** | Comparação de duas imagens com slider — raro, mas potencialmente útil para dados visuais. |
| **Command Bar / Expanding Search Bar** | Padrão de busca que funde botão e campo num só objeto. |

Outro detalhe que vale copiar como **processo**, não como código: a proposta do **"Bench"** e dos
controles de tuning por bloco (*"each with its own page, live demo and **adjustable values**"*) é um
padrão de revisão de design muito superior a discutir um valor de easing num PR — é a mesma família de
ideia do nosso skill `curriculo-design-review`.

**Cuidado de acessibilidade a aplicar em tudo isso:** há blocos com arrasto (drag/slider/seek/reorder).
WCAG 2.2 AA traz o critério **2.5.7 Dragging Movements** (alternativa sem arrasto). Qualquer bloco
baseado em arrasto que vocês copiarem precisa de controle alternativo (botões, teclado).

### e) **VEREDITO: ADAPTAR** (com uma parte DESCARTAR)

- **Blocks → ADAPTAR:** copie **2–4 blocos funcionais sóbrios** como fonte MIT (floating label input,
  OTP de campo único, upload dropzone, step progress), após **confirmar o texto de
  `bencho.dev/license`**. Ignore o catálogo de física/3D/shader.
- **Finds → DESCARTAR como ferramenta:** é galeria de terceiros creditados, sem direito de reuso.
  Referência visual, no máximo.
- **Sounds → não recomendado** (licença não verificada; som numa plataforma de transparência levanta
  questões de UX e de acessibilidade antes de levantar questões de código).

**Correção honesta da suspeita do briefing:** ao contrário do que se supunha, o Bencho **não está
abandonado** (`lastmod` 2026-10-12) e os seus blocos **não são só vitrine** — o autor declara MIT e
publica o código. O que é "só vitrine" é a seção **Finds**, e o autor é explícito quanto a isso.

---

# C) PLATAFORMA

## 8. Replit — https://replit.com/

### a) O que é exatamente

Plataforma **cloud** de IDE + agente de IA para construir apps (modos Agent/Plan/Build/Power/Max),
hospedagem, banco, deploy e colaboração. **Nada a ver com o nosso stack de build/deploy**: é um
ambiente hospedado, não uma ferramenta local nem uma library.

### b) Instalável?

**Não.** Só serviço hospedado, com conta. Não há nada para instalar no monorepo.

### c) Licença e custo (da doc oficial de preços, out/2026)

| Plano | Preço | O que inclui |
|---|---|---|
| **Starter** | Grátis | Allowance diário de Agent, créditos de cloud mensais limitados, acesso básico ao Agent, **1 app publicado** |
| **Core** | **$20 em créditos/mês**; **$204/ano** no anual | Agent completo com Plan e Build modes, 1 tarefa paralela, até 5 colaboradores, apps publicados ilimitados, restore de banco de 7 dias |
| **Pro** | **$100/mês** | Mais uso de Free Mode, até 10 tarefas paralelas, até 15 builders, créditos em tiers, restore de 28 dias, **créditos não usados rolam por dois meses** |
| Credit packs | $100 / $290 / $480 / $950 | Créditos adicionais; aplicam-se a Agent, deploys, storage |

- **Sem free trial** para planos pagos: *"Replit doesn't offer a time-limited free trial for paid plans"*.
- Uso do Agent é cobrado por **esforço/complexidade**; créditos do **Core não rolam**, os do Pro sim.
- Não há desconto público divulgado além do programa de educação (regras na página de educação).

### d) Qual seria QUALQUER utilidade real aqui, se alguma?

**Para o que o projeto já tem, honestamente: nenhuma.**

- **Deploy:** a Vercel já cobre preview + produção com o adaptador de Next.js. Não há ganho.
- **Banco:** Prisma + Postgres já está resolvido fora do Replit.
- **CI:** GitHub Actions já rodam typecheck, build e verificação do motor IDIP. Um Replit não substitui.
- **Testes:** Playwright roda local e no Actions.

Usos "possíveis mas fracos", para ser completo em vez de dogmático:

1. **Sandbox descartável** para prototipar um componente sem tocar no monorepo — mas vocês já têm dev
   local e preview da Vercel, que testam o **ambiente real** (o que um sandbox não faz).
2. **Onboarding de alguém sem Node configurado** — mas o código já está no GitHub, então
   devcontainer/Codespaces ou o preview da Vercel são encaixes mais próximos.
3. **Ensino/demo pública** de um protótipo isolado. Nada relacionado ao produto.

E há um argumento **contra**, específico deste projeto: é uma plataforma de **transparência política sob
AGPL-3.0**, e o seu próprio `AGENTS.md` alerta que **`DATABASE_URL` decide tudo — todo script de dados
grava no banco que ela apontar, inclusive produção**. Levar uma cópia do projeto para um IDE cloud de
terceiros cria superfície de governança de dados e de licenciamento **em troca de zero benefício
funcional**. Não vale o risco.

### e) **VEREDITO: DESCARTAR**

Não há nenhuma utilidade real: Vercel resolve deploy, GitHub Actions resolve CI, Prisma/Postgres resolve
dados — e mover código de uma plataforma de transparência sob AGPL para um IDE cloud comercial só
adiciona risco sem resolver nada.

---

# TABELA-RESUMO

| Ferramenta | Tipo | Licença | Instalável? | Veredito | O que aproveitar |
|---|---|---|---|---|---|
| **Playwright** | Test runner + automação de browser (npm) | **Apache-2.0** | **Sim** — `npm i -D @playwright/test` (não baixa browser desde a v1.38); browsers só com `npx playwright install`; `channel: 'chrome'` usa o Chrome já instalado | **INSTALAR** | `@axe-core/playwright` com tag `wcag22aa` (**maior valor** — fecha o requisito AA sem verificação hoje); E2E read-only contra deploy espelhando `production-smoke.yml`; regressão visual só em 2ª fase |
| **Refero** | Biblioteca **paga** de screenshots de produtos reais + plugin Figma + MCP | **Proprietária** (ToS: uso p/ pesquisa/inspiração; veda redistribuir, extrair, **treinar modelos**) | **Não** (site + plugins pagos; MCP exige plano pago; sem free trial) | **APENAS REFERÊNCIA** | Vocabulário visual, hierarquia, padrões de tabela densa e dark mode sério. **Zero código.** Nunca alimentar pipeline de IA com o conteúdo |
| **metal-fx** (`metal.jakubantalik.com`) | Pacote npm React: efeito WebGL liquid-metal | **MIT** © Jakub Antalik | **Sim** — `npm i metal-fx` | **DESCARTAR** | Nada. Legítimo, ativo (490★, push 2026-09-21) e MIT, mas iridescente ≠ editorial; custo WebGL no celular; **sem `prefers-reduced-motion` documentado** |
| **loading.daniasyrofi.com** | Registry copy-paste de loaders animados (React/HTML) + playground | **MIT** (repo `daniasyrofi/loading`) | **Parcial** — copiar para `components/ui`; **sem pacote npm confirmado** | **ADAPTAR** (estreito) | 1–2 loaders discretos + o padrão de **respeitar `prefers-reduced-motion`**. Vendorizar, não depender: **1★**, criado 2026-09-01, último push 2026-09-06 |
| **ObsidianUI** (`temp.obsidianui.dev` → `obsidianui.dev`) | Component library React + Tailwind (registry shadcn + MCP + docs por componente) | **MIT** © 2026 ObsidianUI | **Sim** — registry `@obsidian` no `components.json` (comando exato de `add` não verificado) | **ADAPTAR** (cherry-pick) | Só o subconjunto **neutro**: **Dotted Grid**, Dither Canvas (textura p/ `bg-slate-950`), talvez um loader. Descartar o catálogo WebGL/cursor/marquee. **Ativo** (474★, push 2026-10-12) |
| **Kobra** (`kobra.systems`) | Component library React p/ shadcn + MCP + skills + som | **Comercial:** free = **"Personal use only"**; Individual **$199** pagamento único p/ uso comercial; Teams $599 | **Sim** (10 grátis sem conta; os 81 exigem `KOBRA_TOKEN`) | **APENAS REFERÊNCIA** | Ler **`kobra.systems/install.md` / `design.md`** — regras de estilo gratuitas e alinhadas ("color is information", `tabular-nums`, `motion-reduce`, focus ring 3:1). **Não instalar:** free é personal-use-only (incompatível com repo público AGPL) e pago colide com nosso design system |
| **Bencho** (`bencho.dev`) | Blocos React interativos copiáveis + galeria **Finds** + biblioteca **Sounds** + canvas **Bench** | **Blocks: MIT** (declarado no `llms.txt`; **texto da página de licença não lido**). **Finds: terceiros, só crédito** | **Parcial** — copiar a fonte do bloco; **sem npm** | **ADAPTAR** (blocks) / **DESCARTAR** (Finds) | 2–4 blocos funcionais sóbrios: **floating label input, OTP de campo único, upload dropzone, step progress**. Ignorar física/3D/shader. **Finds = só referência.** Ativo (`lastmod` 2026-10-12) |
| **Replit** | Plataforma cloud (IDE + Agent + hosting + DB) | **Proprietária, freemium** (Core $20 créditos/mês, $204/ano; Pro $100/mês; sem free trial) | **Não** (só serviço hospedado, requer conta) | **DESCARTAR** | Nada. Vercel faz deploy, Actions faz CI, Prisma/Postgres faz dados. Mover código AGPL para IDE cloud comercial só adiciona risco |

---

# Recomendação consolidada

1. **A única adoção que eu defendo com convicção é Playwright — e especificamente pelo eixo de
   acessibilidade.** WCAG 2.2 AA é requisito declarado e hoje não existe **nenhum** gate automatizado
   para ele. `@playwright/test` + `@axe-core/playwright` com
   `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])` fecha essa lacuna com custo de
   entrada baixo (o `npm install` **não** baixa browser desde a v1.38) e sem mexer na CSP.
   Lembre à equipe o limite honesto: automação pega uma **minoria** dos problemas de WCAG (~30–40% é a
   cifra de fonte secundária); ela **complementa**, não substitui, revisão manual e teste com usuários.
2. **Comece pelo alvo read-only**, num workflow novo espelhando o `production-smoke.yml` (que já roda
   sem secrets e contra `PROD_URL`), ou pelo gatilho `deployment_status` que a doc do Playwright cita
   nomeando a Vercel. Isso evita a armadilha do `DATABASE_URL`.
3. **Não coloque Playwright no job `verify`.** Ele hoje é rápido e sem browser/banco — preserve isso.
4. **Regressão visual é a parte menos atraente** para quem já tem captura via CDP: baseline é **por
   plataforma** (o nome do snapshot inclui a plataforma; screenshot varia por OS, hardware e modo
   headless, por aviso da própria doc) e o ganho marginal é o *diff/gate*, não a captura.
5. **Nos 6 sites de "inspiração", a suspeita do briefing se confirmou só em parte** — e vale registrar
   a correção: **ObsidianUI (474★) e Bencho (48 blocos, `lastmod` 2026-10-12) não estão abandonados** e
   ambos publicam código com licença permissiva (MIT). O que é genuinamente "só vitrine" é: **Refero**
   (proprietária, veda reuso de código **e** veda treinar modelo), a seção **Finds** do Bencho (trabalho
   de terceiros, só creditado) e a **tier gratuita da Kobra** (personal use only → DESCARTAR como
   ferramenta, ainda que sirva de referência escrita). **metal-fx** é o caso mais interessante: é uma
   ferramenta **boa** que simplesmente **não serve** esteticamente.
6. **Replit: descartar sem nuance.**

---

# Verificado vs. não verificado

**Confirmado na fonte primária:**

- Playwright: Apache-2.0 (`LICENSE`); break da v1.38 sobre download de browsers (release notes oficiais);
  números de disco 281/187/180 MB e locais de cache (doc de *Browsers*); `channel: 'chrome'` e seus
  warnings (doc de *Browsers*); YAML de GitHub Actions, `workers: 1`, `globalTimeout`, imagem Docker e
  gatilho `deployment_status` com menção à Vercel (doc de *CI*); aviso de variação de render por OS e
  nome de snapshot por plataforma, `maxDiffPixels`/`threshold`/`stylePath`/`--update-snapshots` (doc de
  *Visual comparisons*); limites e disclaimers de acessibilidade (doc de *Accessibility testing*).
- `@axe-core/playwright` **4.13.0**, **MPL-2.0**, `engines.node >= 22.12.0`, dependência
  `axe-core ~4.14.0` (`package.json` do pacote).
- Tag **`wcag22aa` = WCAG 2.2 Level AA** na tabela oficial de tags do axe-core (`doc/API.md`); nota de
  que o axe **não testa regiões ocultas** e precisa do estado visível antes de `analyze()`.
- Refero: planos, ausência de free trial, licença de 1 usuário (doc de *Plans*); §10 e §13 do ToS
  (restrições de redistribuição, scraping, **treino de modelo**), §15 (licença revogável), 8.000
  requisições/mês de MCP, proibição de embutir token em software cliente.
- metal-fx: **MIT** (README + API do GitHub), 490★/34 forks, push 2026-09-21, `archived: false`,
  capacidades e notas de performance/SSR (README).
- `daniasyrofi/loading`: **MIT**, **1★**, 0 forks, criado 2026-09-01, push 2026-09-06, 0 issues (API do
  GitHub); playground declara *"Reduced motion is on"*.
- ObsidianUI: **MIT** (arquivo `LICENSE`), 474★/28 forks, criado 2026-01-10, push 2026-10-12,
  `archived: false` (API do GitHub); catálogo completo de componentes e registry `@obsidian`
  (`docs/installation`, `docs/cli`, home server-rendered); redirect 301 de `temp.obsidianui.dev` para
  `www.temp.obsidianui.dev`.
- Kobra: catálogo de 81 componentes, 10 gratuitos, nomes e descrições (página de componente + `install.md`);
  preços $0 / $199 / $599 e o termo **"Personal use only"** na tier gratuita (página de preços);
  alegação de **WCAG 2.1 AA** (página de preços); MCP, skills, Figma kit e regras de estilo (`install.md`).
- Bencho: estrutura e conteúdo do `llms.txt` (48 blocos, Finds creditado, Sounds, Bench, autor Lorenzo
  Cabra, declaração de MIT para os blocks); `sitemap.xml` com `lastmod` 2026-10-12; **ausência** de
  conteúdo legível nas páginas `/`, `/license`, `/licence` (client-rendered).
- Replit: planos Starter/Core/Pro, valores, credit packs, ausência de free trial, cobrança por esforço
  (doc oficial de preços).
- Nosso repositório: conteúdo de `ci.yml`, `production-smoke.yml`, `monthly-snapshot.yml` e `package.json`
  (scripts, `license: AGPL-3.0-only`, Node 24).

**NÃO verificado — não use como fato:**

- **Preços do Refero.** A página `/pricing` é client-rendered e devolveu só o título; a doc aponta para
  ela sem listar valores. **Nenhum valor foi lido.**
- **Corpo da issue [microsoft/playwright#24607](https://github.com/microsoft/playwright/issues/24607)**
  (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD does not have effect`) — só o título. O status atual dessa variável
  no pacote **JS** é incerto; a doc a apresenta sob `* langs: java`. **Não dependa dela.**
- **Chrome pré-instalado no runner `ubuntu-latest`.** É conhecimento geral, não lido nesta sessão.
  Confirme no manifesto de software da imagem do runner antes de prometer "zero download no CI".
- **Texto da licença do Bencho.** `bencho.dev/license` não devolveu conteúdo; "MIT" vem do `llms.txt`
  do próprio site. Confirme no browser antes de vendorizar. Idem para a licença dos **Sounds**
  (não afirmada explicitamente) e para a página `/sponsor`/`/refunds` (indica que algo é vendido; **não
  verifiquei o quê**).
- **Respostas do FAQ da ObsidianUI** (acordeões fechados) — só os enunciados foram lidos. "Grátis, MIT,
  uso comercial" apoia-se no arquivo `LICENSE` e no link de rodapé, não no texto do FAQ.
- **Comando exato de `add` do registry `@obsidian`** — o trecho que li foi truncado. O padrão shadcn
  sugere `npx shadcn@latest add @obsidian/<componente>`, mas **isso não foi lido na doc deles**.
- **`prefers-reduced-motion` no `metal-fx` e nos componentes da ObsidianUI** — não afirmado nas fontes
  que li e não inspecionado no código. Exija a verificação antes de adotar qualquer coisa com movimento.
- **A parede de logos da Kobra** ("Trusted by… Stripe, Microsoft, Notion, Uber, Figma, Netflix,
  Apple…") — **sem nenhuma substanciação na página**. Marketing não comprovado.
- **A cifra de 30–40% de cobertura do axe** — fonte secundária (blog da TestParty) atribuindo a
  "pesquisa da Deque"; **não li afirmação primária da Deque**. Use como ordem de grandeza.
- **O utilitário de screenshot via CDP do projeto** — **não localizado neste workspace**; a comparação
  de valor marginal de Playwright contra ele baseia-se na sua descrição, não na leitura do código.
- **Página *Web server* da doc do Playwright** — referenciada no menu, **não lida**; a recomendação de
  usar `webServer` para subir o Next.js apoia-se na existência documentada da opção.
- **Publicação de `loading` no npm** — não verificada.
