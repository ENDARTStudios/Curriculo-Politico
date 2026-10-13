# Acessibilidade

WCAG **2.2 AA** neste projeto não é meta aspiracional: é requisito declarado em
`AGENTS.md` ("Acessibilidade AA é requisito, não melhoria") com **gate automatizado
no CI**. Este documento explica como o gate funciona, o que foi medido e corrigido,
e — a parte que costuma faltar — **o que o gate não pega**.

Documentos relacionados:
[TESTING.md](../03-development-process/TESTING.md) (a suíte completa),
[`docs/design/avaliacao-ferramentas.md`](../design/avaliacao-ferramentas.md)
(as correções medidas), [ERROR_HANDLING.md](ERROR_HANDLING.md) (a fronteira de erro
também precisa ser acessível).

## 1. O requisito: 2.2, não 2.1

O gate é `tests/e2e/acessibilidade.spec.ts`, com `@axe-core/playwright`:

```ts
const TAGS_WCAG22AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
await new AxeBuilder({ page }).withTags(TAGS_WCAG22AA).analyze();
```

**O detalhe que quase todos erram, e que está escrito no próprio arquivo de
teste:** o exemplo da documentação do Playwright usa apenas
`wcag2a, wcag2aa, wcag21a, wcag21aa`. Isso é **WCAG 2.1**, não 2.2. Sem a tag
**`wcag22aa`**, a suíte valida 2.1 e produz **falsa sensação de conformidade** — o
pior resultado possível para um gate de acessibilidade.

**Regra:** a lista de tags é imutável. Se alguém "simplificar" removendo
`wcag22aa`, o projeto deixa de cumprir o requisito declarado sem nenhum sinal
visível.

### As três páginas auditadas

| Rota | O que exercita |
|---|---|
| `/` | Funil completo, faixa de prova com N formas, CTA, Termômetro |
| `/ranking` | Tabela grande com muitos links e paginação |
| `/metodologia` | Texto longo, tabelas de pesos, hierarquia de headings |

Rodadas em **dois projetos** Playwright (`desktop` 1440×900 e `mobile` 390×844),
porque o público é majoritariamente celular e algumas falhas de acessibilidade só
aparecem em viewport estreita.

**O que fica de fora:** perfis de político, proposições, partidos, `/comparar`,
`/status`, `/stf`, `/historia`, `/calendario-eleitoral`, `/conta`,
`/auth/signin` — justamente as telas que exibem gráficos e o Termômetro em
contexto. É a lacuna T-14 em [`TASKS.md`](../03-development-process/TASKS.md).

## 2. Por que o gate existe: as medições que o originaram

O gate não foi criado por cerimônia. Foi criado **depois** de o detector e as
medições encontrarem defeitos que estavam em produção, invisíveis para o
TypeScript. Medições registradas em
[`docs/design/avaliacao-ferramentas.md`](../design/avaliacao-ferramentas.md):

| Defeito | Medida | Correção aplicada |
|---|---|---|
| `text-slate-500` para texto | **4,23:1** — reprova AA (mínimo 4,5:1) em **167 lugares / 40 arquivos** | substituído por `text-slate-400` = **7,66:1** |
| `text-slate-600` para texto | **2,65:1** em 8 lugares | `text-slate-400` |
| CTA do hero: **branco** sobre `sky-500` | **2,71:1** — muito abaixo de 4,5:1 | passou a `text-slate-950` sobre `sky-500` = **7,45:1** |
| Placeholder da busca | 4,2:1 | `placeholder-slate-400` |
| Links de texto distinguidos **só por cor** (WCAG 1.4.1) | **1,2:1** contra o texto ao redor, em **44 links / 24 arquivos** | sublinhado permanente por contexto (ver §4) |
| `<pre>` rolável sem acesso por teclado (mobile) | WCAG 2.1.1 | `tabIndex={0}` + `role="region"` + rótulo |
| `border-l-4` / `border-t-4` ("side-tab") | tell visual de UI gerada por IA | borda normal + ponto colorido com a semântica |
| Linhas de texto ~102 caracteres | legibilidade | `max-w-[65ch]` nos parágrafos de apoio |

Conjunto de correções agrupado no commit **`6c66d02` — "fix(a11y): corrige 219
falhas de contraste AA, links só por cor e foco"**.

Números são **medidos**, não estimados: o cálculo de contraste é feito por script
(`.design-review/contraste.cjs`) seguindo a fórmula de luminância relativa da WCAG,
e o contraste do CTA é **recalculado em tempo de teste** pela mesma fórmula
(`tests/e2e/home.spec.ts`, caso "o CTA primário tem contraste AA") com asserção
`>= 4.5`. Um novo design que reintroduza o CTA branco sobre `sky-500` **falha o
teste**.

## 3. O que o gate verifica em cada execução

1. **`axe-core` com as 5 tags** nas 3 páginas, em 2 viewports. Zero violações é o
   critério (`expect(r.violations.length).toBe(0)`), e a mensagem de falha lista
   `impact`, `id`, `help` e os 3 primeiros alvos — para que a falha diga *o que* e
   *onde*.
2. **Contraste do CTA calculado de verdade** — não é `axe`, é a fórmula da WCAG
   aplicada ao `getComputedStyle` do elemento.
3. **Navegação por teclado até o CTA primário** — até 40 `Tab` a partir do topo.
   O header tem 11 links de navegação; se o CTA não for alcançável, o teste falha.
4. **Um `h1` por página** em todas as rotas críticas (hierarquia de headings).
5. **`colorScheme: "dark"` fixo no Playwright** — deliberado: sem isso o Chrome
   pode simular `prefers-color-scheme` e **esconder problemas de contraste
   específicos do tema real**. O tema do projeto é dark fixo.

## 4. A regra de link em texto (WCAG 1.4.1)

Critério 1.4.1 (Uso da Cor) exige que um link dentro de texto corrido **não** se
distinga do texto ao redor **apenas pela cor**, quando o contraste entre eles é
menor que 3:1. No projeto: `sky-400` (#00bcff) sobre `slate-400` (#90a1b9) dá
**1,2:1** — muito abaixo. `hover:underline` **não resolve**, porque o critério vale
no **estado de repouso**.

A correção está em `apps/web/src/app/globals.css` e é **aplicada por contexto**:

```css
p a:not([class*="rounded"]):not([class*="block"]),
li a:not([class*="rounded"]):not([class*="block"]),
td a:not([class*="rounded"]):not([class*="block"]) {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
```

Por que por contexto e não global: só em `p`, `li` e `td` o link está de fato
imerso em texto. Sublinhar **todos** os links do app pioraria a leitura e mudaria a
identidade visual sem ganho — navegação, botões e cards ficam intocados.

**Escape hatch:** a utility `link-sem-sublinhado` (definida em `globals.css` com
`@utility`) remove o sublinhado. Usá-la exige **justificar no comentário** que o
contraste entre link e texto vizinho é **≥ 3:1**. Não é um atalho para "não gostei
do sublinhado".

## 5. `prefers-reduced-motion` — e a lacuna real

### O que está implementado

`apps/web/src/app/globals.css`, em `@layer base`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

O `!important` é intencional: precisa **vencer** as utilities `animate-*` do
Tailwind. Isso neutraliza com segurança as três animações do projeto — os keyframes
`rise`, `fade` e `aurora`, definidos como tokens `--animate-*` no `@theme`.

### A lacuna: esta regra **não** alcança animação por JavaScript

A regra zera `animation-duration`, `animation-iteration-count` e
`transition-duration`. **Nenhuma dessas propriedades é consultada por:**

| Mecanismo | Afetado pela regra CSS? |
|---|---|
| CSS `@keyframes` / `transition` | ✅ sim — é exatamente o que a regra cobre |
| **Web Animations API** (`element.animate()`) | ❌ **não** |
| **`requestAnimationFrame`** (GSAP, Anime.js, canvas, WebGL) | ❌ **não** |
| `scroll-behavior` via JS (`scrollTo({ behavior })`) | ❌ **não** — só a propriedade CSS é neutralizada |

**Estado atual do risco: baixo, por acidente feliz.** Hoje o projeto **não tem
animação JavaScript nenhuma** — as três animações são CSS puro. A lacuna é real e
documentada, mas ainda não há o que ela possa deixar passar.

**Estado atual da mitigação: nenhuma.** Não existe `matchMedia` no código, não
existe `useReducedMotion`, não existe `MotionConfig`. Não há biblioteca de animação
instalada.

### O que fazer antes da primeira animação JS

Esta é uma **decisão pendente**, registrada como T-13 em
[`TASKS.md`](../03-development-process/TASKS.md) e em
[RESEARCH.md](../08-knowledge-management/RESEARCH.md). As duas opções avaliadas:

| Opção | Custo | Cobertura |
|---|---|---|
| Escrever `matchMedia("(prefers-reduced-motion: reduce)")` à mão | zero dependência nova; responsabilidade de acessibilidade volta para **cada componente** | Só onde for implementado |
| Adotar **Motion** (MIT) com `MotionConfig reducedMotion="user"` | dependência nova (não há necessidade comprovada hoje) | Automática para todos os componentes `motion` |

A técnica recomendada para a opção manual, aproveitada da avaliação do GSAP: com
reduced-motion ativo, a animação deve **"pular para o fim"** (`duration: 0`),
preservando o estado final acessível — e não sumir com o elemento. Sumir com o
elemento troca um problema de movimento por um problema de conteúdo ausente.

### Como testar manualmente (o axe não pega)

1. Ative **"Reduzir movimento"** no sistema operacional.
   - Windows: Configurações → Acessibilidade → Efeitos visuais → "Efeitos de
     animação".
   - macOS: Acessibilidade → Monitor → "Reduzir movimento".
   - Chrome DevTools → Rendering → **"Emulate CSS media feature
     prefers-reduced-motion: reduce"** (mais rápido).
2. Recarregue a home e confirme que os blocos da hero **aparecem no estado final**,
   sem cascata de entrada.
3. Se — e somente se — houver animação JS nova: reproduza com o **throttling de CPU
   em 6×** (DevTools → Performance) e verifique se a animação continua rodando. Se
   continuar, a lacuna §5 foi ativada e a decisão acima precisa ser tomada antes do
   merge.

## 6. O que testar manualmente que o axe **não** pega

O próprio arquivo de teste registra o limite com honestidade: teste automatizado
detecta **uma minoria** dos problemas de acessibilidade (ordem de grandeza: **um
terço**) e **não alcança regiões ocultas** — modais, menus fechados, conteúdo que
exige interação. O gate é um **piso, não uma certificação**.

Checklist manual obrigatório antes de considerar uma UI pronta:

### Teclado

- [ ] Percorrer a página inteira só com `Tab` / `Shift+Tab`. **Nenhum** elemento
      interativo inalcançável.
- [ ] A ordem de foco segue a ordem visual. Não há "pulo" causado por `tabIndex`
      positivo.
- [ ] O foco é **sempre visível** — `:focus-visible` com outline de 2px `sky-400`
      (definido em `globals.css`). Nunca remova sem substituir por indicador
      equivalente.
- [ ] Nenhuma armadilha de foco: dá para **entrar e sair** de todo componente.
- [ ] `Esc` fecha o que abriu (modal, painel, dropdown).
- [ ] Elemento com rolagem própria é alcançável e rolável por teclado (WCAG 2.1.1 —
      foi exatamente o defeito do `<pre>` rolável no mobile).

### Regiões que o axe não vê

- [ ] **Modais / diálogos:** abrir e auditar com o modal aberto. Foco preso dentro,
      `Esc` funciona, foco devolvido ao elemento de origem ao fechar, `aria-modal`
      e rótulo corretos.
- [ ] **Menus e dropdowns fechados:** abrir por teclado, navegar por setas,
      fechar com `Esc`. Estado `aria-expanded` correto.
- [ ] **Estados de carregamento e vazio:** o leitor de tela anuncia a mudança?
      `aria-live` onde a mudança é assíncrona?
- [ ] **Mensagens de erro de formulário:** associadas ao campo (`aria-describedby`),
      anunciadas, e não só sinalizadas por cor.
- [ ] **Estados de foco/hover** de cada controle.

### Leitor de tela (o teste que substitui nenhum outro)

- [ ] Percorrer a home, `/ranking` e um perfil com **NVDA (Windows)**, **VoiceOver
      (macOS/iOS)** ou TalkBack (Android).
- [ ] O nome acessível de cada link e botão faz sentido **fora de contexto** — é
      assim que um leitor de tela lista os links.
- [ ] Nenhum emoji é anunciado como conteúdo (o header usa `aria-hidden="true"` no
      emoji e `aria-label` no link, exatamente por isso).
- [ ] A faixa de prova é compreensível quando lida em sequência linear.
- [ ] O Termômetro comunica o estado por **texto**, não só pela cor (🟢/🟡/🔴/⚪
      têm rótulos: Confiável / Atenção / Não Confiável / Dados Insuficientes).

### Responsividade e movimento

- [ ] `overflow` horizontal igual a **0** em 320, 390, 768, 1280 e 1440 px —
      medido com `node .design-review/capture.cjs <url> <largura> <altura> <saida.png>`,
      não estimado no olho.
- [ ] Zoom de **200%** sem perda de conteúdo nem sobreposição (WCAG 1.4.4).
- [ ] Reflow em 320 px sem rolagem horizontal (WCAG 1.4.10).
- [ ] `prefers-reduced-motion` — §5.
- [ ] Contraste em **estado de hover e de foco**, não só em repouso.

### Ferramentas locais de apoio

| Ferramenta | Para quê |
|---|---|
| `node .design-review/axe.cjs <url> [largura]` | violações em JSON **com seletor e HTML** — o detector diz *que* há problema, este diz *onde* |
| `node .design-review/contraste.cjs` | contraste WCAG da paleta, calculado |
| `node .design-review/linhas.cjs <url> [largura]` | **qual** elemento tem linhas longas (>80 chars) |
| `node .design-review/capture.cjs ...` | captura na largura exata + medição de overflow |

Detalhe operacional: essas ferramentas exigem o Chrome em
`--remote-debugging-port=9222`. E `--headless --screenshot --window-size` **não
serve**: foi medido que `--window-size` é ignorado e a captura sai em 756×481
independentemente do valor pedido — o que "prova" overflow que não existe.

## 7. Regras de implementação

1. **Foco visível é intocável.** `:focus-visible` global com outline 2px `sky-400`.
   Nunca `outline: none` sem indicador equivalente.
2. **Alvo de toque ≥ 44px.** O link da marca no header usa `-m-2 p-2` para ampliar
   a área sem deslocar o layout — é o padrão a copiar.
3. **Nenhum estado comunicado só por cor.** Estados do Termômetro têm rótulo
   textual além da cor.
4. **Um `h1` por página.** Verificado por teste em todas as rotas críticas.
5. **Texto alternativo significativo** — ver
   [CONTENT.md](../04-api-integrations/CONTENT.md) §6.
6. **Contraste mínimo AA (4,5:1) para texto normal; 3:1 para texto grande e
   componentes de UI.** Medido, não estimado. As classes seguras do projeto são
   `slate-400` (7,66:1 sobre `slate-950`) e acima; **`slate-500` e `slate-600` são
   proibidas para texto**.
7. **Tempo de animação não pode ser a única indicação de mudança de estado.**
8. **Nada de dependência de animação sem decidir §5 antes.**

## 8. Cobertura atual — resumo honesto

| Item | Situação |
|---|---|
| WCAG 2.2 AA com `wcag22aa` | ✅ implementado e no CI, contra produção |
| Páginas auditadas | 3 de ~27 |
| Viewports | 2 (1440×900 e 390×844) |
| Contraste | ✅ medido e coberto por teste no CTA; demais por script e revisão |
| Link só por cor (1.4.1) | ✅ corrigido em 44 links / 24 arquivos |
| `prefers-reduced-motion` em CSS | ✅ global |
| `prefers-reduced-motion` em JS | ❌ **lacuna real** — sem mitigação, sem animação JS hoje (T-13) |
| Regiões ocultas (modais) | ❌ não auditadas |
| Leitor de tela | ❌ sem teste documentado |
| Zoom / reflow | ⚠️ verificação manual, sem gate |
| Correção automática de violações | ❌ sem gate que bloqueie merge por a11y (o `a11y.yml` roda agendado, não em PR) |

**Ponto que merece atenção do time:** o `a11y.yml` roda por **cron a cada 6h** e por
`workflow_dispatch` — **não** a cada PR. Uma violação de acessibilidade introduzida
num PR chega a produção e só é detectada na próxima janela agendada. A justificativa
para isso está escrita no próprio workflow (uma suíte de browser no caminho crítico
do PR atrasaria todo PR e traria flakiness). É um trade-off consciente, não um
esquecimento — mas significa que o gate de a11y é **detecção**, não **prevenção**.
Quem mexer em UI deve rodar `npm run e2e` localmente (ou, no mínimo,
`npm run e2e:prod` contra produção) antes de abrir o PR.
