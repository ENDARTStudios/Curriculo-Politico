# Avaliação de bibliotecas de animação e componentes React

**Data da pesquisa:** outubro/2026 · **Autor:** agente de engenharia (pesquisa web, sem instalação)
**Escopo:** 3 bibliotecas de animação + 6 galerias de componentes React, avaliadas contra as
restrições reais de `apps/web`.

> **Método e honestidade.** Todos os fatos abaixo vêm de páginas oficiais, de `package.json`/
> `LICENSE` lidos diretamente no GitHub (via `raw.githubusercontent.com`) ou do registry do npm.
> Cada afirmação cita a URL. Onde não consegui confirmar, está escrito **não verificado**.
> Inferências estão marcadas como *(inferência)*. **Nada foi instalado.**
>
> Uma limitação: não consegui abrir a instância local em `http://127.0.0.1:19387` (o executor
> recusa hosts não públicos), então **não verifiquei a UI renderizada no DSH**. A análise de
> código local cobre apenas leitura de arquivos do repositório.

---

## 0. Situação real do projeto (base da avaliação)

Leitura direta dos arquivos do repo:

| Fato | Evidência |
|---|---|
| Licença do app: **AGPL-3.0-only** | `apps/web/package.json:6` |
| React **19.1**, Next **15.5**, TS 5.7 | `apps/web/package.json:22-25,37` |
| Tailwind **v4.1** com `@tailwindcss/postcss`; **não existe `tailwind.config.js`** | `apps/web/package.json:28,35`; `apps/web/postcss.config.mjs:1-5`; `glob` em `apps/web/tailwind.config.*` → nenhum resultado |
| Tokens via `@theme` em CSS | `apps/web/src/app/globals.css:17-31` |
| Animação hoje: 3 keyframes CSS (`rise`, `fade`, `aurora`) | `apps/web/src/app/globals.css:33-62` |
| **Reduced-motion já é global e à prova de JS? Não** — a regra zera `animation-duration`/`transition-duration`, que **não afetam** Web Animations API, `requestAnimationFrame` (GSAP/Anime/canvas/WebGL) | `apps/web/src/app/globals.css:64-76` |
| CSP: `default-src 'self'` · `script-src 'self' 'unsafe-inline' 'unsafe-eval'` · `style-src 'self' 'unsafe-inline'` · `img-src 'self' data: https:` · `connect-src 'self'` · `font-src 'self'`. **Não há `media-src`** → áudio/vídeo remoto cai em `default-src 'self'` e é **bloqueado**. Não há `worker-src` nem `child-src`. Sem `blob:` em lugar nenhum. | `apps/web/src/middleware.ts:100-112` |
| Tema dark fixo (`bg-slate-950`), sem variante light | AGENTS.md, "Armadilhas conhecidas" |

### As três armadilhas que decidem tudo

1. **Reduced-motion.** A regra CSS global do projeto neutraliza CSS animations/transitions, mas
   **não** neutraliza animação dirigida por JS. Toda biblioteca JS que anima por JS desloca a
   responsabilidade de acessibilidade para o código do componente. Isso é o critério mais
   importante desta avaliação.
2. **Tailwind v4 sem config.** Qualquer instrução de instalação que diga "adicione em
   `tailwind.config.js`" **não se aplica**. Componentes que trazem `@keyframes` em `<style jsx>`
   ou em CSS importado funcionam; os que esperam `theme.extend.animation` do v3, não.
3. **CSP.** `connect-src 'self'` mata qualquer componente que faça `fetch` para um domínio
   externo; a ausência de `media-src` mata áudio/vídeo remoto; a ausência de `worker-src`/`blob:`
   torna frágil qualquer coisa que instancie Workers ou `blob:` URLs. `img-src ... https:` é o
   único canal remoto que passa.

---

## 1. GSAP — https://gsap.com/

**a) O que é.** Biblioteca de animação JS *framework-agnostic* (não é React, não é Tailwind),
com core + plugins: ScrollTrigger, ScrollSmoother, SplitText, MorphSVG, Flip, Draggable,
Observer, Inertia, Physics2D, Text, DrawSVG, entre outros. Versão lida no npm: **3.15.0**
([registry.npmjs.org/gsap/latest](https://registry.npmjs.org/gsap/latest)).

**b) Distribuição.** Dependência npm única (`npm install gsap`), publicada no registry público do
npm. O antigo repositório npm privado foi descontinuado: *"The private NPM repository is no longer
maintained as GSAP and all the plugins are now freely available on npm"* — exige versão ≥ 3.13
([gsap.com/docs/v3/Installation/](https://gsap.com/docs/v3/Installation/)). O pacote npm é grande
(6,25 MB descompactado) mas tem `"sideEffects": false` e `"module"`, então tree-shaking funciona
desde que se registre plugins explicitamente com `gsap.registerPlugin()`. **Não usa Tailwind, não
usa React como peer dependency.**

**c) Licença — este é o ponto mais mal-entendido, e a resposta mudou.**
- O campo `license` do pacote npm é literalmente `"Standard 'no charge' license: https://gsap.com/standard-license."` — **não é MIT, não é Apache, e não é AGPL.**
- A *Standard "No Charge" GSAP License* ([gsap.com/community/standard-license](https://gsap.com/community/standard-license/), efetiva 30/04/2025) concede licença "non-exclusive, worldwide" para **Permitted Uses**, que inclui uso comercial. O FAQ oficial é explícito: *"Can I really use GSAP in commercial projects without paying anything? Yes, really!"*, e os plugins antes exclusivos de assinantes (SplitText, MorphSVG) agora entram no mesmo regime.
- **Como o modelo de licença realmente funciona hoje (pós-Webflow):** o núcleo **é grátis**, **todos os plugins ficaram grátis**, e a página [/pricing](https://gsap.com/pricing/) anuncia "GSAP is now free for everyone, thanks to Webflow's support". **Não há mais plugins pagos.** O que sobrou de restritivo são **restrições de uso**, não preço: (1) `Prohibited Uses` = usar GSAP dentro de ferramentas que permitam construir animações visuais sem código e que concorram com o Webflow; (2) não fazer engenharia reversa para criar produtos concorrentes; (3) não remover avisos de propriedade. Direitos autorais permanecem da Webflow, e a Webflow pode alterar os termos retroativamente para versões futuras.
- **Compatível com AGPL-3.0? Não.** GSAP é *proprietary source-available*, não open source (não é OSI-approved). Isso cria atrito real com o nosso **AGPL-3.0-only**: um derivado AGPL precisa poder ser redistribuído sob AGPL, e a licença GSAP não concede esse direito — pelo contrário, mantém a titularidade na Webflow e proíbe certos usos. **Não é uma dependência que se possa relicenciar junto com o nosso repo.** Além disso, a cláusula de "Prohibited Uses" é uma restrição de campo de uso (field-of-use), que o AGPL-7(e)/10 não tolera bem.
- *Nuance importante:* nosso projeto é um site de dados cívicos, **não** é um construtor visual de animação. Portanto a restrição prática **não nos atinge**. O problema não é o uso, é a **incompatibilidade de licenciamento** num repo AGPL.

**d) React 19 / Tailwind v4.** Irrelevante por design: GSAP não tem peer dependency de React nem
de Tailwind e não gera classes utilitárias. Suporte a React existe via pacote oficial separado
`@gsap/react` (hook `useGSAP`), com a própria página [GSAP & React](https://gsap.com/resources/React).
**Sem conflito v3/v4.**

**e) Reduzir peso / CSP.** Sem `framer-motion`, sem `three`, sem imagens/áudio remotos. Como
escreve estilos inline via o plugin CSS interno, funciona sob `style-src 'self' 'unsafe-inline'`.
**Não quebra a CSP.** O risco é de peso: é **um motor completo** importado para reimplementar
`rise`/`fade` que hoje custam 0 KB de JS.

**f) Reduced-motion.** **Suporte de primeira classe, mas opt-in.** `gsap.matchMedia()` aceita um
objeto de condições incluindo `"(prefers-reduced-motion: reduce)"` e entrega `context.conditions`
booleano, revertendo automaticamente as animações criadas quando a condição deixa de valer
([gsap.com/docs/v3/GSAP/gsap.matchMedia()](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/)).
Ou seja: **a biblioteca oferece o mecanismo, mas o componente precisa usá-lo — ela não respeita
reduced-motion sozinha.** Para o nosso requisito WCAG 2.2 AA, isso significa que cada uso exige
código explícito de `matchMedia`; a rede de segurança CSS que temos hoje **não cobre GSAP**.

**g) Veredito: APENAS REFERÊNCIA.**
A licença proprietária da Webflow torna GSAP um corpo estranho dentro de um repositório
AGPL-3.0-only, e o ganho é nulo para o nosso caso (temos 3 keyframes CSS que já funcionam e já
são cobertos pela regra global de reduced-motion). **O que aproveitar exatamente:** a *técnica* de
`gsap.matchMedia()` com bloco `reduceMotion` como **padrão de código** para qualquer animação JS
que venhamos a escrever à mão — inclusive a ideia de que, com reduced-motion ativo, a animação
deve "pular para o fim" (`duration: 0`) em vez de sumir, preservando o estado final acessível.
Não instalar o pacote.

---

## 2. Anime.js — https://animejs.com/

**a) O que é.** Motor de animação JS "all-in-one": `animate`, `createTimeline`, `createDraggable`,
`createScope`, `createSpring`, `onScroll` (Scroll Observer), utilitários de SVG (`morphTo`,
`createDrawable`, `createMotionPath`), animação de propriedades CSS individuais de transform com
`composition: 'blend'`, e adapter para WAAPI. Versão lida no npm: **animejs 4.5.0**
([registry.npmjs.org/animejs/latest](https://registry.npmjs.org/animejs/latest)). O site exibe
"4.0.0 · 3.2.2 · 2.1.0" como seletor de versão da documentação
([animejs.com](https://animejs.com/)). A API é **modular e tree-shakeable**: a home publica o
tamanho de cada módulo (Timer 5,60 KB, Animation +5,20 KB, Scroll +4,30 KB, Draggable 6,41 KB…)
somando **24,50 KB** para o conjunto — *esses números são os do site oficial, em KB de bundle, e
não os verifiquei em build próprio.*

**b) Distribuição.** Dependência npm pura: `npm i animejs`. Sem CLI, sem registry, sem cópia de
código. `"type": "module"` com exports ESM/CJS por submódulo (`animejs/svg`, `animejs/scroll`,
`animejs/easings/spring`, `animejs/adapters/three`…). É um pacote **realmente modular**, o que é
uma vantagem concreta sobre GSAP para o nosso caso.

**c) Licença.** **MIT.** Confirmado em duas fontes independentes: o campo `license: "MIT"` no
`package.json` do npm e o texto integral em
[raw.githubusercontent.com/juliangarnier/anime/master/LICENSE.md](https://raw.githubusercontent.com/juliangarnier/anime/master/LICENSE.md)
("The MIT License — Copyright (c) 2025 Julian Garnier").
**Compatível com AGPL-3.0: sim.** MIT é permissiva, compatível com AGPL (o conjunto combinado
distribui-se sob AGPL e mantém-se o aviso MIT). A v4 **não** mudou o modelo de licença — continua
MIT; o que mudou na v4 foi a **API** (funções `create*` em vez de `anime()` global). O site afirma
"Anime.js is 100% free and is only made possible with the help of our sponsors" — financiamento
por patrocínio, não por licença.

**d) React 19 / Tailwind v4.** Nenhum dos dois é peer dependency. Existe uma página oficial
"Using with React" na documentação ([animejs.com/documentation/getting-started/using-with-react](https://animejs.com/documentation/getting-started/using-with-react)),
ou seja, o suporte a React é por integração manual (refs + `useEffect`), não por componentes.
**Sem conflito v3/v4** — não gera classes Tailwind. O único peer dependency declarado é
**opcional**: `three >=0.150.0` e `@types/three`, usados apenas pelo subpath
`animejs/adapters/three`; com `peerDependenciesMeta` marcando ambos como `optional`, **não é
instalado** por quem não importa o adapter.

**e) Peso / CSP.** Sem `framer-motion`, sem `three` (a menos que se importe o adapter
explicitamente), sem assets remotos. Anima por estilo inline → compatível com
`style-src 'self' 'unsafe-inline'`. **Não quebra a CSP.**

**f) Reduced-motion.** Suporte via **Scope** com `mediaQueries`, incluindo
`(prefers-reduced-motion: reduce)`, onde o callback recebe `matches` e decide os valores
([animejs.com/documentation/scope/scope-parameters/mediaqueries](https://animejs.com/documentation/scope/scope-parameters/mediaqueries)).
Mesma ressalva do GSAP: **existe o mecanismo, o respeito não é automático** — o componente tem
que consultar `matches.reducedMotion`.

**g) Veredito: DESCARTAR.**
Tecnicamente é a candidata mais limpa das três (MIT, modular, tree-shakeable, peer deps
opcionais, sem conflito de Tailwind e sem risco de CSP), mas **não há necessidade comprovada**:
o projeto resolve hoje `rise`/`fade`/`aurora` com keyframes CSS a custo zero de JS, e a regra
"não adicionar dependência de animação sem necessidade comprovada" só se satisfaz com um caso de
uso concreto — stagger/scroll-linked/timeline complexa — que ainda não existe. **O que
aproveitar exatamente:** o padrão de **Scope com `mediaQueries`** e o design de **módulos
importáveis individualmente** como referência de arquitetura; e, se algum dia precisarmos mesmo
de animação JS, Anime.js é a primeira da fila a reconsiderar, justamente por ser MIT.

---

## 3. Motion (ex-Framer Motion) — https://motion.dev/

**a) O que é.** Biblioteca de animação para React, JavaScript e Vue. Oferece: componente
`<motion>` declarativo, transforms independentes (`x`/`y`/`rotate`/`scale` sem wrappers), layout
animations (`layout`, `layoutId`), `AnimatePresence` (animação de saída), scroll-linked motion
(`useScroll`), gestos nativos (`hover`, `press`, `drag`), springs reais, timelines via
`variants`/`stagger`, `useMotionValue` e derivados. Versão: **14.1.0** (changelog e npm).

**b) Distribuição — e a resposta à pergunta "é `motion` ou `framer-motion`?".**
**O pacote React é `motion`.** O guia de upgrade é explícito:

> *"To upgrade to Motion for React, uninstall `framer-motion` and install `motion`"* … e depois
> trocar os imports de `"framer-motion"` por `"motion/react"`.
> — [motion.dev/docs/react-upgrade-guide](https://motion.dev/docs/react-upgrade-guide)

Verificação no registry ([registry.npmjs.org/motion/latest](https://registry.npmjs.org/motion/latest)):
`"name": "motion"`, `"version": "14.1.0"`, `"license": "MIT"`, e **`"dependencies": { "tslib": "^2.4.0", "framer-motion": "14.1.0" }`**. Isto é um detalhe prático relevante:
`framer-motion` **continua sendo instalado como dependência transitiva** (pinada na versão exata),
mas o **import correto e documentado é `motion/react`** — `framer-motion` é mantido apenas por
compatibilidade entre versões internas. Não importar de `framer-motion` em código novo.

**c) Há versão "mini" sem dependências?** **Sim, e é uma das melhores coisas da biblioteca para
nós.** O `package.json` expõe subpaths dedicados: `./mini`, `./react-m`, `./react-mini`,
`./react-client`, `./three`, `./vgpu`. O guia oficial de redução de bundle
([motion.dev/docs/react-reduce-bundle-size](https://motion.dev/docs/react-reduce-bundle-size)) dá
os números: `<motion>` é impossível de tree-shakar abaixo de **34 kb**; com `m` + `LazyMotion`
cai para **~4,6 kb** no render inicial; `useAnimate` mini é **2,3 kb** e usa só WAAPI. Pacotes de
features: `domAnimation` +15 kb, `domMax` +25 kb. *Tamanhos citados pelo próprio site.*
Isso significa que dá para usar Motion **sem** pagar 34 kb, e que um único hook
(`useReducedMotion`) custa ~1 kb (afirmação do próprio guia).

**d) Suporte a React 19: SIM, verificado.** `"peerDependencies": { "react": "^18.0.0 || ^19.0.0", "react-dom": "^18.0.0 || ^19.0.0" }` (registry npm, versão 14.1.0). Docs afirmam
"Motion is only compatible with React versions `18.2` and higher"
([motion.dev/docs/react-installation](https://motion.dev/docs/react-installation)). **Next.js App
Router é suportado explicitamente**, com duas receitas: `"use client"` + `import { motion } from "motion/react"`, ou — melhor para nós — `import * as motion from "motion/react-client"` para
reduzir o JS entregue ao cliente.

**e) Suporte a Tailwind v4: SIM.** Existe página oficial de integração
([motion.dev/docs/react-tailwind](https://motion.dev/docs/react-tailwind)) e a Motion UI é
descrita como "drop-in to your design system via shadcn tokens"
([motion.dev/magazine/introducing-motion-ui](https://motion.dev/magazine/introducing-motion-ui)).
Ou seja: o Motion trabalha **com** tokens CSS, não exige `tailwind.config.js`. **Não há conflito
com o nosso `@theme`.** *(Inferência: como o Motion anima por estilo inline e MotionValues, ele é
agnóstico ao mecanismo de geração das classes; não depende do Tailwind em nenhuma direção.)*

**f) Dependências pesadas / CSP.** Sem `three` por padrão — `./three` é um **subpath opcional**
(existe também `./vgpu`), não uma dependência do núcleo. Sem imagens/áudio remotos: é uma
biblioteca de animação de DOM, não traz assets. Anima por estilo inline → compatível com
`style-src 'self' 'unsafe-inline'`. O `useScroll` moderno usa `ScrollTimeline`/`ViewTimeline`
nativos onde disponíveis e faz fallback em main thread (changelog 13.4.x/13.5.0), **sem Workers
nem `blob:`** — relevante porque nossa CSP não tem `worker-src` nem libera `blob:`.
**Não quebra a CSP.**

**g) Reduced-motion — a melhor resposta das nove ferramentas.** É o **único** dos avaliados que
respeita reduced-motion **automaticamente, sem código por componente**:

> *"By setting `reducedMotion` to `"user"`, all `motion` components will automatically disable
> transform and layout animations, while preserving the animation of other values like `opacity`
> and `backgroundColor`."*
> — [motion.dev/docs/react-accessibility](https://motion.dev/docs/react-accessibility)

Ou seja, `<MotionConfig reducedMotion="user">` no root cobre a aplicação inteira, e há ainda o
hook `useReducedMotion()` para casos bespoke (substituir `transform` por `opacity`, desligar
autoplay de vídeo, desligar parallax — exatamente os três padrões que a doc recomenda). Isso
**cobre o buraco da nossa regra CSS global**, que hoje só neutraliza animação CSS e não animação
JS. Como rede de segurança adicional, a doc de acessibilidade cita os guias do A List Apart e da
Smashing Magazine sobre motion sickness.

**h) Veredito: ADAPTAR (com escopo estreito e justificativa explícita).**
Motion é a única ferramenta avaliada que atende simultaneamente aos três requisitos duros do
projeto — **React 19 verificado**, **Tailwind v4 sem config**, e **reduced-motion automático via
`MotionConfig reducedMotion="user"`** — e resolve um problema que temos hoje sem solução: animação
JS que escapa da nossa regra CSS de `prefers-reduced-motion`. Licença MIT é compatível com
AGPL-3.0. **O que aproveitar exatamente, sem generalizar:**
1. **`MotionConfig reducedMotion="user"` + `useReducedMotion`** como camada de acessibilidade —
   este é o único motivo forte para instalar algo. Entra no root de `apps/web`.
2. No máximo **1–2 interações nomeadas** onde JS é genuinamente necessário (candidatos típicos
   numa plataforma de dados: entrada/saída com `AnimatePresence` de um painel de detalhe ou
   drawer de filtros, e realce de barras de um gráfico).
3. Importar via **`motion/react-client`** e considerar **`m` + `LazyMotion`** em vez de `<motion>`
   para não levar 34 kb.
4. **Não** usar para o que `rise`/`fade`/`aurora` já fazem — esses três keyframes ficam como estão.
   Não há justificativa para substituir CSS funcionando por JS.
5. Atenção ao **major 14** (changelog: `14.0.0` em 02/10/2026) — se instalar, **pinar a versão
   exata**, porque majors recentes e trocas de versão interna pinada (`framer-motion` interno)
   são fonte de churn.

---

## 4. 21st.dev — https://21st.dev/

**a) O que é.** Marketplace/registro agregador: **"12.000+ crafted React components, templates, and
shadcn themes"**, com mais de 2.000 blocos de marketing e 2.100 componentes de UI
([21st.dev](https://21st.dev/)). Não é uma biblioteca autoral: agrega bibliotecas de terceiros
(shadcn/ui, Aceternity UI, Kokonut UI, Magic UI, Origin UI, Kibo UI, visx, HextaUI, Ruixen UI…),
cada uma com autor próprio.

**b) Distribuição.** Modelo misto, e a parte "de graça" tem asterisco:
- **Copiar-e-colar / prompt:** o site empurra forte o fluxo "Copy the prompt. Paste it anywhere"
  (Claude Code, Codex, Lovable, v0). O código vai para o nosso repo — bom em princípio.
- **CLI de registry (shadcn):** `npx shadcn@latest add "<url-do-item>"`. Funciona com qualquer
  registry que sirva JSON de item, e o CLI escreve os arquivos seguindo os aliases do
  `components.json` do projeto; há flags `--yes`, `--silent`, `--cwd`, `--overwrite`
  ([21st.dev/blog/install-component-from-registry-url](https://21st.dev/blog/install-component-from-registry-url)).
- **O problema — exige conta e API key pagos:** o mesmo artigo oficial diz, com todas as letras,
  que o registry deles precisa de `API_KEY_21ST` e que **"That key comes from your 21st account,
  and installs require a membership"**. E, na tabela comparativa do próprio post: *"21st MCP —
  Installing from the editor, with the preview before the file — **Installs require a
  membership**"*. Ou seja: **o caminho automatizado é paywalled e introduz um serviço remoto com
  chave no nosso fluxo**; `401/403` por chave ausente/expirada é listado como a falha mais comum.
- **MCP/CLI:** o pacote histórico `@21st-dev/magic` existe no npm (versão **0.2.3**, licença
  **ISC**), mas a própria descrição do pacote diz que é **apenas um proxy de compatibilidade**:
  *"Magic MCP is now the 21st MCP. This package is a compatibility proxy kept for old configs —
  new setups should use `npx @21st-dev/cli@latest init`"*
  ([registry.npmjs.org/@21st-dev/magic/latest](https://registry.npmjs.org/@21st-dev/magic/latest)).
  É ferramenta de agente/editor, não runtime — mas depende do serviço remoto deles.

**c) Licença.** Não existe uma licença única: **a licença é a de cada biblioteca de origem**. O
21st é um agregador. Consequência prática: **não se pode afirmar "21st.dev é MIT"** nem
"compatível com AGPL" — depende do item. Alguns contribuintes são MIT (Kokonut, Componentry,
Bklit), outros são *MIT + Commons Clause* (React Bits) ou licença própria com cláusula
anticompetitiva (Aceternity, GSAP), **todos pós-OSI ou não-OSI em graus diferentes**. **Não
verifiquei** uma página de termos/licença própria e unificada do 21st (não localizei
`/legal` nem `/terms`). Há plano gratuito e planos pagos (a página [/pricing](https://21st.dev/pricing)
existe).
**Compatível com AGPL-3.0: parcial e não determinável pelo agregador** — tem que ser avaliado
item a item, e no mínimo os itens *Commons Clause* / anticompetitivos **não** são compatíveis.

**d) React 19 / Tailwind v4.** **Não verificado de forma centralizada** — o agregador não tem um
contrato único; cada item tem o seu. O que **foi verificado** é que as bibliotecas de origem dos
itens populares já operam em Tailwind v4 (Kokonut UI roda `tailwindcss ^4.3.0` +
`@tailwindcss/postcss ^4.3.0`, ver §5) e que o CLI é o do shadcn, cujo projeto documenta
suporte a Tailwind v4 ([ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4)).
Ainda assim, `components.json` é um artefato novo que não temos — e vários itens v3-style pedem
edição de `tailwind.config.js`.

**e) Peer deps pesadas / CSP.** Como agregador, herda o pior de cada origem: há itens com
`three`/`@react-three/fiber`, canvas, WebGL, shaders e *shader/liquid/metal backgrounds* (a
própria home lista as categorias **Shaders**, **Liquid & metal**, **Gradients**). Imagens de
preview vêm de `cdn.21st.dev`. Nada disso é obrigatório, mas é o grosso do catálogo que a
plataforma promove.

**f) Tema dark.** Misto — há temas shadcn (light/dark) e blocos de marketing com cores
hardcoded. Sem padrão uniforme.

**g) Veredito: DESCARTAR.**
Três motivos independentes, qualquer um suficiente: (1) **o fluxo de instalação oficial exige
membership paga e uma API key** (`API_KEY_21ST`), o que contradiz diretamente a regra de não
adicionar dependência/acoplamento sem necessidade comprovada e injeta um serviço remoto no nosso
processo; (2) **não há licença única**, então "compatível com AGPL" é indemonstrável no nível da
plataforma; (3) é um catálogo orientado a marketing/shader, o oposto do nosso viés
editorial/dados. **O que aproveitar exatamente:** o **catálogo como fonte de descoberta** — se
algum componente específico interessar, ir **direto ao repositório do autor original** e avaliar
a licença e as dependências lá, ignorando o intermediário. Vale também reter o conselho técnico
do post deles sobre registry: *não* instalar componentes em CI/build ("a CI job that fetches them
at build time gives up the review and adds a network dependency to your deploy") — isso é um bom
princípio para qualquer registry que venhamos a usar.

---

## 5. Kokonut UI — https://kokonutui.com/

**a) O que é.** Coleção de **100+ componentes open-source** React + Tailwind + **Motion** +
shadcn/ui: fundos (beams, flow-field em canvas), cards (spotlight, bento, liquid-glass),
navegação (morphic navbar), inputs, AI (prompt, voice, loading), textos (shimmer, glitch, matrix,
typewriter, sliced, swoosh), botões (gradient, particle, hold, magnet). Há um produto separado
**Kokonut UI Pro** com 100+ componentes e 7+ templates — **não é o que avaliamos aqui**.

**b) Distribuição.** **Registry shadcn — código vai para o nosso repo.**
`npx shadcn@latest add @kokonutui/<name>`; alternativamente copy-paste ou "Open in v0". O site
oferece ainda registry machine-readable, MCP e `llms.txt`
([kokonutui.com](https://kokonutui.com/)). **Sem dependência de serviço remoto em runtime** — os
`files` do registry apontam para componentes locais (ex.: `components/kokonutui/shimmer-text.tsx`).
Porém: **é um registry que precisa ser adicionado ao `components.json`**, arquivo que hoje não
temos.

**c) Licença.** **MIT.** Verificado na API do GitHub:
`"license": { "key": "mit", "name": "MIT License", "spdx_id": "MIT" }`
([api.github.com/repos/kokonut-labs/kokonutui](https://api.github.com/repos/kokonut-labs/kokonutui));
o site confirma "100% Free & Open Source". (O arquivo `LICENSE.md` na raiz deu 404 — a licença
está registrada via API e o campo SPDX é MIT.)
**Compatível com AGPL-3.0: sim.**

**d) React 19 / Tailwind v4: SIM, e é o mais bem posicionado dos componentes.** O `package.json`
da demo deles
([raw…/kokonutui/main/package.json](https://raw.githubusercontent.com/kokonut-labs/kokonutui/main/package.json))
declara `react ^19.2.7`, `react-dom ^19.2.7`, `tailwindcss ^4.3.0`, `@tailwindcss/postcss ^4.3.0`,
`motion ^12.23.25`, `next ^16.2.10`. O site Pro descreve os componentes como "Built with React,
TypeScript and **Tailwind CSS v4**" e "Animations with **Motion**" (visto na página do componente
[shimmer-text](https://kokonutui.com/docs/texts/shimmer-text)). **Sem `tailwind.config.js`** —
Tailwind v4 CSS-first. **Conflito v3/v4: não detectado.** Ressalva honesta: os componentes pedem
`motion` como dependência, então adotar Kokonut implica adotar Motion (§3).

**e) Peer deps / CSP.** Do registry, as dependências declaradas são **leves e locais**:
`motion`, `lucide-react`, `clsx`, `tailwind-merge`, mais primitivas shadcn
(`button`, `card`, `input`, `dropdown-menu`, `drawer`/vaul, `textarea`). **Não vi `three`,
`@react-three/fiber` nem `@tsparticles`** em nenhum item do registry que li. Sem imagens/áudio
remotos no código dos componentes — as únicas URLs externas notadas são `v0.dev` (para o botão
"Open in v0", opcional) e o domínio do próprio site para previews. Alguns itens usam **canvas**
(`beams-background`, `flow-field`), o que é CPU/GPU-intensivo mas **não viola a CSP** (canvas não
é Worker nem `blob:`).

**f) Tema dark.** Maioria com suporte a dark (classes `dark:`), mas **assume alternância
light/dark**: existe item `switch-button` explicitamente descrito como *"Light and dark theme
toggle button... built with React, **next-themes**"*, e a demo usa `next-themes`. Isso **não
encaixa** no nosso tema dark fixo — usaríamos só os itens que funcionam sob dark permanente, e
removendo as classes de variante light. Vários componentes são decorativos/shimmery
(shimmer-text, glitch-text, matrix-text, swoosh-text, particle-button) — estética que **não**
combina com "editorial/dados sério".

**g) Veredito: ADAPTAR (muito seletivamente) ou DESCARTAR, dependendo de quais itens forem
realmente necessários.**
É a galeria com a **melhor combinação técnica** para nós: MIT (compatível com AGPL), React 19 e
Tailwind v4 confirmados no próprio `package.json`, registry shadcn que escreve código no repo,
sem `three` e sem assets remotos. Mas o catálogo é dominado por efeitos decorativos que violam a
regra "nada de efeito chamativo gratuito", e a maioria dos itens **arrasta `motion` junto**.
**O que aproveitar exatamente:** (1) **`utils.ts` (o `cn` com `clsx` + `tailwind-merge`)** — se
ainda não temos esse helper, é o item mais útil e mais barato do catálogo; (2) itens
**funcionais** e sóbrios, se e quando existir a necessidade — candidatos plausíveis pelo perfil
do projeto: `file-upload` (importação de dados), `hold-button` (confirmação destrutiva),
`action-search-bar` (busca), `smooth-tab`/`smooth-drawer` (navegação em painéis); (3) a
**arquitetura do registry** (JSON tipado por item, com `dependencies` e `registryDependencies`
declaradas) como referência para o nosso próprio registry, se um dia tivermos um. **Não**
adotar `switch-button` nem nada que dependa de `next-themes`, e **não** adotar itens
puramente shimmery/glitch/matrix.

---

## 6. Bklit UI — https://bklit.com/

**a) O que é.** Biblioteca open-source de **UI e visualização de dados** — é a única das galerias
avaliadas cujo foco é exatamente **dados**: área, barra, candlestick, choropleth, composto,
funnel, gauge, heatmap, linha, live line, profit/loss, pizza, radar, ring, scatter, sankey,
sunburst, além de utilitários (legend, grid, background, reference-area, projection-line,
tooltip, brush, eixos X/Y, `useChart`)
([bklit.com](https://bklit.com/)). Site: *"Design engineered data visualization components"*.

**b) Distribuição.** **Registry shadcn** (`bklit.com/r/registry.json`), com **dependências
declaradas por item** — código no nosso repo, sem serviço remoto em runtime. Exemplo real lido do
registry: o item `area-chart` declara `registryDependencies` de
`@bklit/chart-context, @bklit/chart-animation, @bklit/chart-series, @bklit/grid, @bklit/x-axis,
@bklit/chart-tooltip, @bklit/shimmering-text, @bklit/utils` e `dependencies` de
`@visx/curve@4.0.0, @visx/gradient@4.0.0, @visx/shape@4.0.0, motion`. Além do registry, existe um
pacote `@bklitui/ui` referenciado na doc de theming (monorepo pnpm com `packages/ui`) — **não
verifiquei** se esse pacote é publicado e instalável como dependência npm; o caminho documentado é
o registry.

**c) Licença.** **MIT.** O arquivo de licença foi lido integralmente:
"MIT License — Copyright (c) 2026 uixmat"
([raw.githubusercontent.com/bklit/bklit-ui/main/LICENSE](https://raw.githubusercontent.com/bklit/bklit-ui/main/LICENSE));
a API do GitHub confirma `spdx_id: "MIT"`
([api.github.com/repos/bklit/bklit-ui](https://api.github.com/repos/bklit/bklit-ui)).
**Compatível com AGPL-3.0: sim.**

**d) React 19 / Tailwind v4.** O repositório é monorepo pnpm/turbo com TypeScript; o registry usa
o schema do shadcn (`https://ui.shadcn.com/schema/registry.json`) e entrega **`cssVars`** — não
`tailwind.config.js` — com valores em `oklch()` para `light` e `dark`
(variações `--chart-1..5`, `--chart-grid`, `--chart-tooltip-*`, `--chart-scale-*`). Isso é
**exatamente o formato do Tailwind v4 CSS-first** e **não conflita** com o nosso `@theme`. A doc
de theming confirma o modelo por custom properties
([bklit.com/docs/theming](https://bklit.com/docs/theming)).
**React 19: não verificado explicitamente** — o repositório não tem uma declaração de peer
dependency de React acessível no `package.json` raiz (é monorepo, `private: true`); o registry é
código-fonte TS, então a compatibilidade depende de compilar sob React 19, o que é provável mas
**não confirmado por documentação**.

**e) Peer deps pesadas / CSP — este é o custo real.** O registry arrasta uma árvore grande:
`@visx/*` (`event`, `responsive`, `scale`, `shape`, `grid`, `pattern`, `gradient`, `curve`,
`sankey`, `geo`, `heatmap`), `d3-array`, `d3-shape`, `d3-scale`, `d3-sankey`, `d3-geo`,
`topojson-client`, `motion`, `@number-flow/react`, `@base-ui/react`, `react-use-measure`, e nos
blocos `@central-icons-react/all`. O choropleth e o stat-card de mapa precisam de dados
geográficos (`topojson-client`, tipos `geojson`/`topojson-specification`) — **de onde vêm esses
dados não foi verificado**, e se vierem de CDN externo batem em `connect-src 'self'`.
**Sem `three`/WebGL.** Anima com `motion`; usa `oklch()` e `<svg>` — nenhum asset remoto obrigatório
identificado. Risco de CSP: **baixo**, condicionado à origem dos dados de mapa.

**f) Tema dark.** **Excelente encaixe** — o registry fornece tokens `dark` prontos em `oklch()`
via `cssVars` e a doc de theming documenta `chartCssVars` para acesso tipado. É o único dos seis
projetado para funcionar bem em ambos os temas **sem** presumir light. Mesmo assim, adotaríamos
apenas o bloco `dark` (ignorando `light`), e os tons `oklch` do Bklit **não** são os nossos
tokens do Termômetro — precisariam ser remapeados para a semântica do IDIP.

**g) Reduced-motion.** **Não verificado** — não encontrei menção a `prefers-reduced-motion` na doc
de theming nem nos itens que li. Os itens declaram `@bklit/chart-animation` com "motion helpers
for chart enter transitions, clip reveals, and staggered animations", o que sugere animação de
entrada/stagger em JS — **sem rede de segurança CSS**. Se adotado, cada gráfico precisa de
tratamento explícito de reduced-motion.

**g) Veredito: ADAPTAR (condicional e com escopo) ou APENAS REFERÊNCIA.**
É a única ferramenta cujo domínio coincide com o do produto — **dados cívicos em gráficos** — e
resolve um problema que ainda não temos solução (não há biblioteca de gráficos no
`apps/web/package.json`). Licença MIT, tokens em CSS vars compatíveis com Tailwind v4, sem WebGL,
sem `three`, sem estética de marketing. O freio é o **custo de dependências por gráfico**:
`@visx/*` + `d3-*` + `motion` + `@number-flow/react` + `@base-ui/react` são vários pacotes novos
para **um** gráfico. **O que aproveitar exatamente, em ordem:** (1) **`APENAS REFERÊNCIA` para a
maioria** — usar Bklit como referência de *design de visualização* de dados séria (eixos, grid,
reference-area para faixas de threshold, projection-line, brush, legend, tooltip tipado); (2)
**`ADAPTAR` se e somente se** um gráfico específico for requisito de produto (o sankey e o
heatmap são candidatos naturais para fluxo de dinheiro de campanha e densidade de votações),
aceitando naquele momento a árvore `visx`+`d3`+`motion` e **remapeando as cores para os tokens do
IDIP**; (3) reusar o padrão de **`cssVars` dark em `oklch` no registry** como modelo para
publicarmos nossos próprios componentes/tokens.

---

## 7. React Bits — https://reactbits.dev/

**a) O que é.** A maior das galerias por estrelas: **49.007 stars**
([api.github.com/repos/DavidHDev/react-bits](https://api.github.com/repos/DavidHDev/react-bits)).
Organizada em **Text Animations, Animations, Components, Backgrounds, Micro Interactions**
([reactbits.dev](https://reactbits.dev/)): cursor effects, sparks, borders elétricos, textos
cinéticos, carrosséis, glitch, backgrounds WebGL. Auto-descrição: *"React components for creative
developers"*.

**b) Distribuição.** **Registry shadcn/jsrepo — código no repo.** O comando é
`npx shadcn@latest add @react-bits/SplitText-TS-TW`, com sufixo escolhendo variante
(**JS|TS** × **CSS|TW**), ou cópia manual
([reactbits.dev/get-started/installation](https://reactbits.dev/get-started/installation)).
O registry em `reactbits.dev/r/registry.json` foi lido: cada item declara `dependencies` e
`files` explicitamente. O build do registry usa `jsrepo build` e `@jsrepo/shadcn`
(package.json do repo). **Sem serviço remoto em runtime**, mas requer `components.json` (shadcn).

**c) Licença — o ponto que decide, e é ruim para nós.**
> **MIT + Commons Clause License Condition v1.0** — *"You may use this Software, including for any
> commercial purpose, **so long as you do not sell, sublicense, or redistribute the components
> themselves — whether alone, in a bundle, or as a ported version**."*
> — [raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md](https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md)

A API do GitHub confirma licença não-padrão: `"license": { "key": "other", "spdx_id": "NOASSERTION" }`.
A Commons Clause **remove o direito de redistribuir/vender o software**, que é justamente a
liberdade central que a AGPL-3.0 exige conceder a terceiros. **Não é OSI-approved** e **não é
compatível com um repositório AGPL-3.0-only** no qual o código-fonte dos componentes fica
versionado e redistribuído. (Uso comercial *dentro* do nosso produto seria permitido; o problema é
o **nosso** licenciamento do repo.)

**d) React 19 / Tailwind v4.** O repositório é **Tailwind v4 nativo**: `tailwindcss ^4.0.3` e
`@tailwindcss/vite ^4.0.3`, `react ^19.0.0`/`react-dom ^19.0.0` no `package.json` — **sem
`tailwind.config.js`**. As variantes `-TW` entregam classes Tailwind, as `-CSS` entregam um `.css`
ao lado do componente (ex.: `BlobCursor.css`, `Cubes.css`, `GlareHover.css`), com `target`
apontando para `@components/...`. **Conflito v3/v4: não detectado** — pelo contrário, é o mais
alinhado com Tailwind v4 depois do Kokonut.

**e) Peer deps pesadas / CSP — o problema maior na prática.** O `package.json` do repo lista, entre
outros: **`gsap ^3.13.0`, `@gsap/react`, `motion ^12.23.12`, `three ^0.180.0`,
`@react-three/fiber ^9.3.0`, `@react-three/drei`, `@react-three/postprocessing`,
`@react-three/rapier`, `postprocessing`, `ogl ^1.0.11`, `vgpu`, `matter-js`, `mathjs`, `lenis`,
`meshline`, `gl-matrix`, `maath`, `face-api.js`, `react-confetti`, `@hugeicons/*`.**
E o registry confirma que isso é **por componente**: `AnimatedContent`, `FadeContent`, `SplitText`,
`TextType`, `Shuffle`, `ScrollFloat`, `ScrollReveal`, `ImageTrail` → **`gsap`**;
`ScrollVelocity`, `TrueFocus`, `VariableProximity` → **`motion`**;
`BlobCursor` → **`three@^0.180.0`**; `CrystalizedBall`, `ElectricLogo`, `DitherVeil`, `WarpText` →
**`ogl@^1.0.11`**. `ClickSpark`, `Crosshair`, `Cubes`, `ElectricBorder`, `GradualBlur`,
`ShinyText`, `TextPressure`, `ParticleText`, `SplitFlapText`, `TechText` → **zero dependências**.
Ou seja: o peso depende inteiramente do que se escolhe; mas os itens de destaque do catálogo são
WebGL/3D/cursor-effect. **Sobre a CSP:** as dependências em si não violam a política (sem áudio,
sem `media-src`, sem Workers), mas `three`/`r3f`/`ogl`/`vgpu` são **centenas de KB de JS** e
`face-api.js` baixa **modelos** de rede — isso bateria em `connect-src 'self'`. **Não verifiquei**
URLs externas item a item no código-fonte.

**f) Tema dark.** Componentes de efeito geralmente assumem **fundo escuro e cores vivas**
(cursors luminosos, arco-elétrico, glitch colorido, matrix rain) — funciona em `bg-slate-950`
do ponto de vista técnico, mas a **estética** é o oposto de editorial/dados sério. `next-themes`
aparece no repo.

**g) Reduced-motion.** **Não verificado** — não encontrei declaração explícita nos docs; a busca de
código no GitHub exige autenticação e retornou erro. Pelo tipo de efeito (cursor-following, WebGL,
brilhos em loop), a presunção razoável é **ausência de tratamento**, o que agravaria o requisito
WCAG 2.2 AA. Marcado como não verificado, não como ausente.

**g) Veredito: DESCARTAR.**
A **Commons Clause é incompatível com o nosso AGPL-3.0-only** — este é um bloqueio de licença, não
uma preferência estética, e é suficiente por si só. Somam-se o pilar do catálogo ser
cursor-effect/WebGL/partículas (viola "nada de efeito chamativo gratuito") e a dependência de
`three`/`ogl`/`gsap`/`motion` na maior parte dos itens. **O que aproveitar exatamente:**
**nada de código.** No máximo, como **referência de leitura**, dois padrões: (1) a divisão
**JS|TS × CSS|TW** no registry — a ideia de servir a mesma peça em variante "só CSS" é
exatamente o que combina com um projeto que anima por CSS; e (2) itens com **zero dependências**
(`Crosshair`, `GradualBlur`, `TextPressure`) mostram que efeito sem biblioteca é viável — mas
mesmo esses não justificam adotar o registry por causa da licença.

---

## 8. Aceternity UI — https://ui.aceternity.com/

**a) O que é.** Biblioteca copy-paste de componentes React/Next, *"200+ production-ready
components, blocks and templates built with React, Tailwind CSS and Motion"*, com **116
componentes gratuitos** e um tier pago All-Access (180 blocks premium, 12–17 templates, páginas
completas) ([ui.aceternity.com](https://ui.aceternity.com/), [pricing](https://ui.aceternity.com/pricing)).
Foco declarado: *"The React component library for beautiful landing pages"* — heroes, bento grids,
backgrounds, shaders, aurora, wavy/vortex backgrounds, sparkles, meteors, tooltips animados,
typewriter, 3D pin, 3D globe, webcam pixel grid, teclado Mac com som.

**b) Distribuição — sem runtime, mas com pegadinhas.** Fonte pela página do componente **ou**
CLI shadcn: `npx shadcn@latest add @aceternity/<component>`; *"there is no runtime dependency on
Aceternity UI and no version to upgrade"* (llms-full). Requer `cn` (clsx + tailwind-merge), que é
o item `utils` também usado por outros registries. **Pegadinhas de asset remoto:** os previews do
site ficam em `assets.aceternity.com`, e existem componentes com **som** e **vídeo de fundo**
(ex.: *Keyboard — "A mac style keyboard component with mechanical keys sound effects"*;
*Background With Full Video*), além de *Webcam Pixel Grid* (usa câmera — e nosso
`Permissions-Policy` já é `camera=(), microphone=()`). **Som/vídeo remoto viola nossa CSP**, porque
não há `media-src` e `default-src 'self'` bloqueia. Mas isso só nos afetaria se escolhêssemos
esses itens.

**c) Licença.** Não há `LICENSE` na raiz do repo (tentativas em `/LICENSE` e `/LICENSE.md`
retornaram **404**). A licença está publicada na documentação e no índice para LLMs
([ui.aceternity.com/llms-full.txt](https://ui.aceternity.com/llms-full.txt)):
> *"Licence: components are free to use in unlimited personal and commercial projects. **Reselling
> or redistributing the components as a competing library is not permitted.**"* … e *"The only
> restriction is that you cannot resell or redistribute the components themselves as a competing
> template or component library."*

O site diz que os componentes gratuitos são *"free, open source"*. **Ressalva técnica:** é uma
licença **customizada e não-padronizada** (sem SPDX na API do GitHub), com cláusula
anticompetitiva/anti-redistribuição — o mesmo gênero de restrição da Commons Clause.
**Compatível com AGPL-3.0: provavelmente não.** A cláusula "não redistribuir os componentes"
tensiona com a obrigação AGPL de permitir redistribuição de derivados. Diferente do GSAP (que
restringe só ferramentas visuais concorrentes e é mais fácil de argumentar como inócuo para nós),
aqui o objeto da restrição é **o próprio componente que ficaria versionado no nosso repo público**.
Recomendo tratar como **não compatível** salvo parecer jurídico.

**d) React 19 / Tailwind v4.** A própria documentação responde: *"Built for: **React 18+**,
Next.js 14+, **Tailwind CSS v3 and v4**, TypeScript, Motion"* (llms-full). Ou seja, **Tailwind v4 é
suportado oficialmente** — o conflito v3/v4 que era a suspeita principal **não se confirma** neste
caso. Ainda assim, a instalação pede passo "Set up Tailwind CSS" + `cn` + instalar `motion` como
peer dependency: *"Animated components require `motion`. Run `npm install motion`. Some 3D
components additionally require `three` and `@react-three/fiber`."* React 19: "React 18+" é
compatível, mas **não verifiquei uma matriz de teste com React 19**.

**e) Peer deps pesadas / CSP.** Confirmado pela doc oficial: **`motion`** é exigido pela maioria;
**`three` + `@react-three/fiber`** aparecem em componentes 3D (3D Globe, 3D Marquee, Comet Card,
3D Pin). O catálogo é densamente **canvas/WebGL/shader** (Cloud Shader, Dither Shader, ASCII Art,
Pixelated Canvas, Chromatic Image, Canvas Text, Webcam Pixel Grid). Assets remotos em
`assets.aceternity.com`; há componentes de áudio e de vídeo. **Risco de CSP real e concreto**
não pelo JS, mas pelos assets de mídia.

**f) Tema dark.** O site tem **toggle de tema** (a home tem `Toggle theme`) e os componentes usam
classes `dark:`/`light` em vez de cores fixas escuras. Blocos premium são descritos com
*"automatic dark mode support"*. **Encaixe ruim:** nosso tema é dark **fixo**, sem variante light
— adotar componentes deles implica remover as classes `dark:`/`light` e reescrever as cores base,
que são de paleta de landing page, não dos nossos tokens do Termômetro.

**g) Reduced-motion.** **Não verificado.** A doc para LLMs não menciona `prefers-reduced-motion`,
acessibilidade ou motion sickness em nenhum ponto, apesar de o catálogo ser predominantemente de
movimento contínuo e scroll-linked (parallax, tracing beam, infinite moving cards, auto-loop de
card stack). Isso é um sinal ruim para o nosso requisito AA, mas registro como **não verificado**
em vez de afirmação.

**g) Veredito: DESCARTAR.**
Três razões convergentes: (1) a **licença é customizada, com cláusula anti-redistribuição**, e é
arriscada num repo AGPL-3.0-only — exatamente o tipo de risco jurídico que o projeto não deve
correr por causa de um efeito visual; (2) o **propósito do catálogo é landing page de marketing**
(*"The React component library for beautiful landing pages"*), o oposto da nossa estética
editorial/dados; (3) exige `motion` na maioria e `three`/`@react-three/fiber` em vários, além de
itens com **áudio/vídeo remoto que a nossa CSP bloqueia** (sem `media-src`). **O que aproveitar
exatamente: APENAS REFERÊNCIA visual, zero código.** Vale olhar como **referência de composição**
em três casos pontuais e sóbrios — e mesmo assim reimplementando: o padrão de **bento grid** para
resumo de dados, o padrão de **timeline com beam de scroll** (útil para linha do tempo
processual), e o **`glowing-effect`/hover de borda** como ideia de affordance de "card
selecionável" — todos reconstruíveis em CSS com os nossos tokens, sem instalar nada.

---

## 9. Componentry — https://componentry.dev/

**a) O que é.** *"Animated, production-ready UI components"* / *"A growing collection of animated
primitives for React"* — ~56 componentes catalogados. Categorias: **Text Animations** (Letter
Cascade, Text Repel, Text Morph, Particle Typography, Kinetic Text Reveal, Velocity Scroll),
**Components** (Lens Clock, Annotated Text, Case Study Flip Stack, Sticky Scroll Cards, Magnetic
Dock, Github Calendar, Split Flap Display, Eye Tracking, Signature, Liquid Glass Carousel, Spiral
3D Slider, Newsletter Bookshelf, Mac Keyboard, Music Player, Flight Status Card),
**Hero Backgrounds** (Grain Gradient, Spectral Ribbon, Hero Geometric, Dither Prism Hero),
**Visual Effects** (Image Ripple Effect, Dithered Logo, Ripple Transition, WebGL Liquid)
([componentry.dev/docs](https://componentry.dev/docs)). Descrição do repo no GitHub: *"Animated,
production-ready UI components. Built the way real products need them."*

**b) Distribuição.** **Registry shadcn + MCP.** O site diz: *"Animated React components with
editable source code. Install via shadcn CLI or your AI editor with MCP"*
([componentry.dev](https://componentry.dev/)). O registry em `componentry.dev/r/registry.json` foi
lido e está no schema do shadcn, com `aliases: ["componentry", "componentryui", "ui", "cmp"]` e
`homepage: "https://componentry.fun"` (nota: o registry aponta para `.fun`, não `.dev`).
**Observação importante:** esse `registry.json` **não traz `dependencies` nem `files`** por item —
apenas `name`/`type` no índice; as dependências provavelmente estão nos JSONs por item
(`componentry.dev/r/<name>.json`), que **não verifiquei**. Sem dependência de serviço remoto em
runtime no que foi lido.

**c) Licença.** **MIT.** API do GitHub: `"license": { "key": "mit", "name": "MIT License",
"spdx_id": "MIT" }`
([api.github.com/repos/harshjdhv/componentry](https://api.github.com/repos/harshjdhv/componentry)).
481 → 601 stars; repo criado em 24/12/2025. **Compatível com AGPL-3.0: sim.**

**d) React 19 / Tailwind v4.** O `package.json` raiz do repo é um monorepo pnpm (`private: true`,
`"dependencies": {}`, scripts de registry/blocks com turbo e playwright) — **não declara versões de
React nem de Tailwind na raiz**, e portanto **não confirma nada** por esse caminho. O repo é
TypeScript. **Tailwind v4: não verificado** por documentação lida; o schema do registry é o do
shadcn (que suporta v4) mas não vi `cssVars` no índice. **Conflito v3/v4: não verificado** — este
é um ponto em aberto que exigiria abrir um item específico antes de qualquer adoção.

**e) Peer deps pesadas / CSP — o maior risco entre os seis.** A linguagem do catálogo é
inequivocamente **WebGL / shaders / 3D / física**: *"WebGL-powered cursor ripples"*, *"WebGL
liquid-glass lens — chromatic rim"*, *"WebGL image transitions with noisy refractive waves"*,
*"particle logo... dithered canvas field"*, *"3D newsletter archive with hover lift, camera
browsing"*, *"physics-based text where each letter reacts to cursor proximity with spring
dynamics"*, *"spiral 3D slider"*, *"cinematic rotating-wheel picker with inertial drag"*,
*"eye tracking — hyper-realistic eyes"*, *"music player with swinging tonearm"*. Componentes com
imagens (`case-study-flip-stack`, `fisheye-infinite-grid`, `wheel-carousel`,
`liquid-glass-carousel`) são demos de **galeria de imagens**. Há também `music-player` (áudio).
**Dependências por item: não verificado**, mas pelo vocabulário é seguro afirmar que a maioria usa
`motion`/`framer-motion` e uma parcela relevante usa WebGL (três, ogl ou equivalente). **Risco de
CSP:** os shaders em si **não** violam a política (WebGL/canvas não são Worker nem `blob:`
obrigatoriamente), **mas** qualquer carregamento de modelo/textura de CDN bateria em
`connect-src 'self'`, e o `music-player` bateria na ausência de `media-src`.

**f) Tema dark.** O site tem `Toggle theme`, então presume alternância light/dark. Vários itens
foram desenhados para **fundo preto puro** (`spectral-ribbon`: *"on pure black"*), o que é
tecnicamente compatível com `bg-slate-950` mas com contraste agressivo. **Encaixe estético ruim:**
é o catálogo com a linguagem mais "showcase criativo" dos seis.

**g) Reduced-motion.** **Não verificado.**

**g) Veredito: DESCARTAR.**
É MIT (bom) e é registry shadcn com código no repo (bom), mas o catálogo é **WebGL/shaders/física
3D/eye-tracking/music-player/galerias de imagem** — o pior encaixe estético e o maior risco de peso
entre todos os avaliados, e ainda com **`dependencies` por item não verificadas** e **Tailwind v4
não verificado**. Nada aqui resolve um problema que o projeto tenha hoje. **O que aproveitar
exatamente: praticamente nada; na melhor hipótese, leitura.** Dois itens poderiam, em tese, virar
referência *remota* para telas específicas — `github-calendar` (heatmap de contribuições, que é
conceitualmente próximo de um **heatmap de presença/votação por período**) e `annotated-text`
(marcações manuscritas sobre texto inline, próximo de **anotar um trecho de proposição**) — mas
ambos seriam **reescritos em CSS/SVG com nossos tokens**, não instalados. Não adotar o registry.

---

## 10. Tabela-resumo

| Ferramenta | Tipo | Licença | React19 / TW4 | Veredito | O que aproveitar |
|---|---|---|---|---|---|
| **GSAP** | Lib de animação JS (npm `gsap` 3.15.0) | **Proprietária Webflow**, "Standard No Charge": comercial grátis, plugins todos grátis, mas **não-OSI**, com cláusulas anticompetitivas. **Incompatível com AGPL-3.0-only** | Não usa React nem Tailwind → **N/A** (sem conflito v3/v4) | **APENAS REFERÊNCIA** | O **padrão `gsap.matchMedia()` com condição `prefers-reduced-motion`** e a ideia de "pular para o fim" (`duration: 0`) em vez de remover o estado final. **Não instalar.** |
| **Anime.js** | Lib de animação JS (npm `animejs` **4.5.0**) | **MIT** (LICENSE.md lido) → **compatível com AGPL** | Sem React/Tailwind como deps; peer `three` é **opcional** → **sem conflito v3/v4** | **DESCARTAR** | Padrão de **Scope com `mediaQueries`** e o **design modular** (import por submódulo). Reconsiderar **primeiro** se algum dia precisarmos de animação JS. |
| **Motion** (ex-Framer Motion) | Lib de animação React (npm **`motion`** 14.1.0; `framer-motion` só como dep transitiva pinada) | **MIT** → compatível com AGPL | **React 19: SIM** (`peerDependencies ^18 \|\| ^19`). **TW4: SIM** (integração por tokens/estilo inline, sem `tailwind.config.js`) | **ADAPTAR** ✅ | **`MotionConfig reducedMotion="user"` + `useReducedMotion`** — única solução automática de reduced-motion para JS entre as 9. Mais: `motion/react-client`, `m`+`LazyMotion` (~4,6 kb). Usar em **1–2** interações nomeadas. Pinar major 14. |
| **21st.dev** | Marketplace/registro agregador de componentes shadcn | **Sem licença única** (herda de cada autor); há tier pago | **Não verificado** centralmente; CLI é o do shadcn (suporta v4) | **DESCARTAR** | O **catálogo como índice de descoberta** → ir ao repositório do autor original. E o conselho deles: **não instalar componentes em CI/build**. |
| **Kokonut UI** | Registry shadcn de 100+ componentes (React+TW+Motion) | **MIT** (SPDX via GitHub API) → compatível | **React 19 SIM** (`react ^19.2.7`) e **TW4 SIM** (`tailwindcss ^4.3.0`, sem config) | **ADAPTAR** (muito seletivo) | **`utils.ts`/`cn`** (clsx+tailwind-merge). Itens funcionais sóbrios se houver necessidade (`file-upload`, `hold-button`, `action-search-bar`, `smooth-tab`). **Evitar** `switch-button`/`next-themes` e tudo shimmery/glitch. |
| **Bklit UI** | Registry shadcn de **charts/visualização de dados** | **MIT** (LICENSE lido) → compatível | **TW4 SIM** (`cssVars` dark em `oklch`, sem config). **React 19: não verificado** | **ADAPTAR (condicional) / APENAS REFERÊNCIA** | **Referência de design de dataviz séria**: eixos, grid, `reference-area` (thresholds), `projection-line`, `brush`, legend, tooltip. Adotar de fato **só se** um gráfico for requisito (sankey/heatmap), aceitando `@visx/*`+`d3-*`+`motion`. |
| **React Bits** | Registry shadcn/jsrepo de efeitos animados | **MIT + Commons Clause** (sem redistribuir) → **incompatível com AGPL-3.0-only** | React 19 e **TW4 SIM** (repo em `tailwindcss ^4.0.3`, sem config) | **DESCARTAR** | **Nada de código.** Só o padrão **JS\|TS × CSS\|TW** do registry (servir variante "só CSS" combina com o nosso caso). |
| **Aceternity UI** | Registry shadcn, copy-paste (116 grátis + tier pago) | **Customizada, não-SPDX**, com cláusula anti-redistribuição → **provavelmente incompatível** | **React 18+** (19 não verificado) e **TW v3 E v4 suportados** oficialmente | **DESCARTAR** | **Referência visual apenas**: bento grid, timeline com beam de scroll, hover-glowing como affordance de card. Reimplementar em CSS com nossos tokens. |
| **Componentry** | Registry shadcn + MCP, ~56 componentes | **MIT** (SPDX via GitHub API) → compatível | **TW4 não verificado**; deps por item **não verificadas** | **DESCARTAR** | Quase nada. No máximo **referência remota** para `github-calendar` (heatmap presença/votação) e `annotated-text` (anotar trecho de proposição). Não adotar o registry. |

---

## 11. Riscos transversais (o que decidir antes de instalar qualquer coisa)

1. **Reduced-motion é o critério decisivo, não a licença.** A regra em
   [globals.css:64-76](apps/web/src/app/globals.css) só neutraliza CSS. **Toda** animação dirigida
   por JS (GSAP, Anime.js, Motion, e todos os componentes das 6 galerias que usam `motion`/`gsap`)
   escapa dela. Entre as 9 ferramentas, **somente Motion respeita `prefers-reduced-motion`
   automaticamente** (`MotionConfig reducedMotion="user"`); GSAP e Anime.js oferecem API mas exigem
   código por uso; e nas 6 galerias eu **não consegui verificar** tratamento algum. Se adotarmos
   qualquer componente JS-animado, o requisito WCAG 2.2 AA passa a depender de revisão manual
   caso a caso — e as skills `curriculo-design-review`/`curriculo-design-system` deveriam ganhar
   um item de checklist explícito para "animação JS sob reduced-motion".
2. **Tailwind v3/v4 é menos grave do que a suspeita inicial.** Verificando as fontes primárias,
   **Kokonut (v4), React Bits (v4), Aceternity (v3 *e* v4), Bklit (`cssVars` v4) e 21st (via CLI
   shadcn)** não exigem `tailwind.config.js`. O conflito que existia de fato é **criar um
   `components.json`** e adotar a convenção de `cn`/aliases do shadcn — não o Tailwind em si.
   Ficaram como **não verificado**: Componentry (v4) e React 19 no Bklit.
3. **CSP: o problema é asset de mídia, não JavaScript.** `img-src` libera `https:`, então imagens
   remotas passam. Mas **não existe `media-src`**, então áudio e vídeo remotos caem em
   `default-src 'self'` e são **bloqueados** — isso inviabiliza itens concretos (Aceternity
   *Keyboard* com sons, *Background With Full Video*, Componentry *music-player*).
   `connect-src 'self'` bloqueia `fetch` externo (`face-api.js` do React Bits, dados de mapa do
   choropleth do Bklit). E não há `worker-src` nem `blob:` liberado, o que torna frágil qualquer
   biblioteca que instancie Workers.
4. **Peso real, em número.** Motion `<motion>` = **34 kb** (piso, não tree-shakável), com
   `m`+`LazyMotion` **~4,6 kb**, `useAnimate` mini **2,3 kb**, hook isolado **~1 kb** — *números do
   próprio site*. Anime.js: **24,5 kb** no conjunto, modular por peça — *números do site*. GSAP:
   pacote npm de 6,25 MB descompactado. React Bits/Bklit/Aceternity: variável, com `three`/`@visx`
   /`d3` em parte dos itens. Nosso baseline de animação hoje é **0 KB de JS**.
5. **Compatibilidade de licença com AGPL-3.0-only, em três categorias.**
   - ✅ **MIT** → Anime.js, Motion, Kokonut, Bklit, Componentry.
   - ⚠️ **Proprietária/restritiva, incompatível ou arriscada** → GSAP (Webflow, não-OSI), React
     Bits (*Commons Clause*), Aceternity (customizada, anti-redistribuição).
   - ❓ **Indeterminável** → 21st.dev, por ser agregador sem licença própria.
6. **Nada aqui justifica substituir o que já funciona.** Os três keyframes `rise`/`fade`/`aurora`
   custam zero JS e já são cobertos por reduced-motion. A barra para introduzir qualquer uma
   dessas dependências deve ser um caso de uso **nomeado** que CSS não resolva.
