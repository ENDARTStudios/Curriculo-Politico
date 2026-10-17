# IDENTIDADE_VISUAL — Documento de design no FigCraft

**Projeto:** Currículo Político · **Data:** 2026-10-17
**Fonte:** `design/construir-identidade.mjs` (gerador) · **Artefato:** `design/curriculo-politico.figcraft`
**Revisão visual:** `design/export/*.png`

---

## 1. O que foi produzido

Quatro páginas, cada uma um artboard 1440 de largura:

| Página | Conteúdo |
|---|---|
| **00 · Fundamentos** | Superfície, texto, as duas famílias do Termômetro (barra e texto), ação (CTA) e a escala tipográfica editorial |
| **01 · Termômetro** | O componente assinatura, nos quatro estados, com barra de proporção e chave do enum |
| **02 · Componentes** | Botões (primário, secundário, foco visível), card de poder com as 8 barras de peso e linha de ranking |
| **03 · Hero** | A composição da home: gancho → promessa → CTA → faixa de prova |

### 1.1 Como reconstruir

```bash
node design/construir-identidade.mjs          # gera o .figcraft e os PNGs
node design/construir-identidade.mjs --check  # só valida tokens e contraste
```

Abre no app pelo atalho do FigCraft, ou por CLI:

```powershell
& "C:\Program Files\FigCraft\figcraft-cli.exe" info design/curriculo-politico.figcraft
```

## 2. Por que o documento é gerado, e não desenhado

A identidade precisa ser **rastreável até o código**. Um arquivo desenhado à mão
envelhece em silêncio quando um token muda; um gerador que lê
`node_modules/tailwindcss/theme.css` e `status-visual.ts` não pode divergir sem
que alguém veja.

As cores são extraídas do **Tailwind v4 do próprio projeto** e convertidas de
OKLCH para sRGB no gerador. Escrever hex "aproximados" criaria uma segunda fonte
de verdade — o mesmo erro que a home já cometeu ao exibir v1.0 com o motor
rodando v1.1.

O gerador se autoverifica: compara três tokens de controle com os valores
publicados (tolerância de 1/255, que é arredondamento de gama) e **aborta** se a
paleta não conferir.

### 2.1 O contraste é medido, não afirmado

O gerador calcula a razão WCAG de dez pares e imprime o resultado. Os números
citados no documento visual vêm dessa medição:

| Par | Razão | Situação |
|---|---|---|
| slate-50 sobre slate-950 | 19,27:1 | AA |
| slate-400 sobre slate-950 | 7,66:1 | AA |
| **slate-500 sobre slate-950** | **4,23:1** | **reprova** para texto |
| slate-950 sobre sky-500 (CTA) | 7,45:1 | AA |
| **slate-50 sobre sky-500** | **2,59:1** | **reprova** — nunca use texto branco no CTA |
| emerald-300 / amber-300 / red-300 / slate-300 sobre slate-900 | 9,29–12,32:1 | AA |

## 3. Achados

### 3.1 O app não fixa família tipográfica

Não há `next/font` nem `--font-sans` customizado: a interface usa o sans do
sistema. Consequência prática: a leitura muda entre Windows (Segoe UI), macOS
(SF) e Android (Roboto), e a "escala editorial" do design system fica sem
controle sobre a forma das letras.

**Recomendação:** definir uma família variável servida por `next/font` (self-host,
sem requisição a terceiros — coerente com a postura de privacidade do projeto) e
expô-la como `--font-sans` no `@theme`. É mudança de uma linha em `globals.css`
mais uma em `layout.tsx`, mas muda a percepção de marca em todas as telas.

### 3.2 A paleta do Termômetro está duplicada nos gráficos

`status-visual.ts` documenta que é a **fonte única** das cores de estado e alerta
que a duplicação já permitiu divergência silenciosa. A duplicação continua nos
gráficos:

| Arquivo | Valor para GRAY |
|---|---|
| `apps/web/src/lib/status-visual.ts` | `bg-slate-500` → `#62748E` |
| `apps/web/src/components/PartyMembersChart.tsx` | `#94a3b8` (slate-400) |

GREEN, YELLOW e RED conferem (`#10b981`, `#f59e0b`, `#ef4444`); **só o GRAY
diverge**, e o arquivo não importa `STATUS_VISUAL`. Outros gráficos
(`TimelineChart.tsx`, `PartyPerformanceChart.tsx`) também usam hex de estado
próprios.

**Recomendação:** extrair um mapa hex de `STATUS_VISUAL` (ou um token CSS por
estado) e consumi-lo nos gráficos, que não conseguem usar classes Tailwind dentro
de `<svg>`. Isso fecha a duplicação em vez de recriá-la.

### 3.3 O slate-500 reprova, e continua sendo usado

4,23:1 sobre slate-950 fica abaixo de 4,5:1 (AA para texto normal). A correção já
foi feita na UI (slate-400), e o documento visual registra a regra para que não
volte.

## 4. Ferramentas avaliadas

Veredicto consolidado. O critério é sempre o mesmo: **o que isso entrega ao
produto**, não o que a ferramenta promete.

### Adotadas

| Ferramenta | Papel | Motivo |
|---|---|---|
| **FigCraft Desktop** | Documento de identidade | CLI headless (`run`, `render`, `export`), hierarquia real, exporta PNG/SVG/PDF. Único caminho para design versionado e reproduzível por agente |
| **Impeccable** (Apache-2.0) | Detector determinístico de anti-padrões de UI | Já instalado; telemetria desligada. A autoridade dele sobre `PRODUCT.md`/`DESIGN.md` foi rejeitada |
| **Playwright + axe** | Verificação de render e acessibilidade | Já instalado; 24 casos × 2 projetos |
| **Emil Kowalski · skills** (MIT) | Referência de craft de interação | Markdown puro, 114 KB, 47k estrelas. **Candidata a adoção seletiva**, não em bloco |

### Rejeitadas

| Ferramenta | Motivo |
|---|---|
| **GSAP** | Licença proprietária (Webflow) — incompatível com AGPL-3.0-only |
| **React Bits** | MIT + Commons Clause: proíbe redistribuição, o que colide com a licença do projeto |
| **UI UX Pro Max** | 22 MB e gera concorrente; conflita com o design system próprio |
| **Taste Skill** | Conflita com decisões fixas (dark fixo, eyebrow, hierarquia) |
| **FigmaToCode** | Plugin do **Figma**, GPL-3.0. Não se aplica: o design agora vive no FigCraft, e o fluxo é código → documento, não o inverso |
| **21st.dev, Kokonut, Bklit, Aceternity, Componentry** | Componentes decorativos; competem com a regra "cor = significado" e "o dado é o herói" |
| **Refero** | Galeria de referências de UI de terceiros; sem licença de uso de assets |
| **Replit** | IDE hospedado; duplica o ambiente local e amplia a superfície de dados |
| **metal.jakubantalik, loading.daniasyrofi, temp.obsidianui.dev, kobra.systems, bencho.dev** | Vitrines de efeito visual. Nada entregam ao produto; o custo é peso de bundle e dívida de manutenção |
| **Motion, Anime.js** | Tecnicamente boas (Motion é MIT, React 19), mas **não há animação JS a fazer**. O projeto anima por CSS com `prefers-reduced-motion` global. Adotar antes de existir necessidade é dívida |

### Sobre "adquirir todas as habilidades possíveis"

Não é o que foi feito, deliberadamente. Adotar 22 toolkits de UI num projeto com
design system próprio dilui as regras que dão identidade a ele (linguagem jurídica
estrita, cor = significado, IDIP como número dominante). A avaliação do ECC na
sessão anterior mostrou o mesmo padrão: 311 skills genéricas contra 9 de domínio
curadas. **Curadoria é o que produz identidade; acúmulo produz inconsistência.**

## 5. Limitações do FigCraft encontradas na prática

Registradas porque custaram iteração e vão custar de novo:

| Limitação | Contorno |
|---|---|
| `run` é stateless entre execuções | Salvar (`file.save`) na **mesma** sessão; para hierarquia, build em duas fases (`--in`) |
| Ids dos nós só existem em tempo de execução | Duas fases: criar canvas, capturar id, então criar filhos com `parent` |
| Sem hierarquia, filhos **extravasam** o artboard | Sempre passar `parent`; validar com `info` que a página tem 1 nó de topo |
| `opacity` via `props` não se aplica no render | Compor a cor antes (`misturar`), em vez de confiar em alpha |
| Não há fonte de emoji colorido | Usar elipse colorida; o rótulo textual já carrega o estado |
| `render` usa a página atual, não o arquivo | `--page "<nome>"` sempre |
| Nome de página com acento quebra slug de arquivo | Normalizar NFD e remover diacríticos antes de gerar o nome do PNG |
| `page.setBackground` é necessário | Sem ele, a área fora do artboard renderiza branca |

## 6. O que não está coberto

- **Estados de formulário** (erro, sucesso, carregando) — relevantes para
  `/conta`, `/auth` e o canal de retificação.
- **Responsivo**: os artboards são 1440. O comportamento em 375px está verificado
  por Playwright, não desenhado.
- **Modo claro**: o tema é dark fixo por decisão de produto, então não há variante.
- **Tokens como variables do FigCraft**: o documento usa cores literais já
  resolvidas. Exportar collections e vincular por `variable.bind` tornaria o
  arquivo editável por token no app — próximo passo natural se o design passar a
  ser editado à mão.
