# IDENTIDADE_VISUAL — Documento de design no FigCraft

**Projeto:** Currículo Político · **Data:** 2026-10-17
**Fonte:** `design/construir-identidade.mjs` (gerador) · **Artefato:** `design/curriculo-politico.figcraft`
**Revisão visual:** `design/export/*.png`

---

## 1. O que foi produzido

Seis páginas, cada uma um artboard 1440 de largura:

| Página | Conteúdo |
|---|---|
| **00 · Fundamentos** | Superfície, texto, as duas famílias do Termômetro (barra e texto), ação (CTA) e a escala tipográfica editorial |
| **01 · Termômetro** | O componente assinatura, nos quatro estados, com barra de proporção e chave do enum |
| **02 · Componentes** | Botões (primário, secundário, foco visível), card de poder com as 8 barras de peso e linha de ranking |
| **03 · Hero** | A composição da home: gancho → promessa → CTA → faixa de prova |
| **04 · Formulários** | Campo padrão, foco, erro, desabilitado; botão carregando; faixas de sucesso e de erro |
| **05 · Conceito** | A tese em uma página: **instrumento de medição, não campanha** — as três leis e o que a identidade recusa |

A página 05 é a **régua das outras**: o que não puder ser justificado por uma das
três leis (o dado é o herói · cor = significado · escala editorial) não pertence à
identidade. Sem ela, o documento é catálogo de peças — quem chega depois não sabe
o que está fora de negociação, e altera justamente o que dava sentido ao conjunto.

### 1.1 Como reconstruir

```bash
node design/construir-identidade.mjs          # gera o .figcraft e os PNGs
node design/construir-identidade.mjs --check  # só valida tokens e contraste
```

Abre no app pelo atalho do FigCraft, ou por CLI:

```powershell
& "C:\Program Files\FigCraft\figcraft-cli.exe" info design/curriculo-politico.figcraft
```

## 1.5 Tokens como variables, não como literais

As cores do documento não são valores soltos: são **18 variáveis** na coleção
`Cor`, e 93 campos de nó estão **vinculados** a elas. A nomenclatura espelha a
classe Tailwind (`estado/verde-barra` ↔ `emerald-500`), para que a tradução entre
documento e código seja mecânica.

| Grupo | Variáveis |
|---|---|
| `superficie/` | base, painel, borda, borda-forte |
| `texto/` | primario, secundario, terciario, fraco |
| `acao/` | primaria, rotulo |
| `estado/` | verde, ambar, vermelho, cinza — cada um em `-barra` e `-texto` |

Sem isso o arquivo é maquete: mudar a paleta significaria editar dezenas de nós.
Com as variáveis, muda-se num lugar só — que é a razão de existir um design system.

### 1.5.1 A vinculação exige três passadas

`variable.bind` precisa do **id do nó**, que só existe depois de criá-lo. O build
é portanto em três fases:

| Fase | O que faz | Por que separada |
|---|---|---|
| A | documento, páginas, canvas, variáveis | os ids dos canvas são devolvidos ao final |
| B | todos os filhos, com `parent` já resolvido | precisa dos ids da fase A |
| C | `variable.bind` em cada campo marcado | precisa dos ids da fase B |

O gerador marca a intenção no próprio nó (`__bind: { field: "fill", variable:
"acao/primaria" }`) e a fase C resolve o índice do comando para o id devolvido.

### 1.5.2 O verificador estava errado duas vezes

Comando retornar `ok` não prova que o vínculo persistiu. O build converte o
`.figcraft` para JSON e confere a contagem — e essa verificação falhou duas vezes
por erro **meu**, não do documento:

1. Contar `"bound"` dava **85 para 93** vínculos, porque um nó com fill e stroke
   vinculados tem um único objeto `bound` com dois campos.
2. Contar qualquer `"VariableID:n"` dava **111 para 93**, porque somava as 18
   definições de variável (`"id": "VariableID:1"`) ao total.

A versão correta conta as referências **dentro dos blocos `bound`**. O episódio
vale registrar: uma verificação que nunca falha não verifica nada, e a primeira
reação natural diante de uma divergência é culpar o artefato.

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

### 3.2 A paleta do Termômetro estava duplicada — e numa geração anterior

`status-visual.ts` documenta que é a **fonte única** das cores de estado e alerta
que a duplicação já permitiu divergência silenciosa. A duplicação continuava em
`PartyMembersChart.tsx`, que mantinha o próprio `RELIABILITY_COLORS`.

O primeiro diagnóstico foi "só o GRAY diverge". **Estava errado, e a correção
mostrou que era pior:** a cópia usava os hex do Tailwind **v3**, enquanto a UI
roda **v4** desde a migração. Nenhum dos quatro estados conferia.

| Estado | Cópia no gráfico (v3) | Tailwind v4 (canônico) |
|---|---|---|
| GREEN | `#10b981` | `#00BC7D` |
| YELLOW | `#f59e0b` | `#FE9A00` |
| RED | `#ef4444` | `#FB2C36` |
| GRAY | `#94a3b8` | `#62748E` |

O efeito visível: no mesmo card, a barra do partido (classe Tailwind) e as barras
dos membros (hex) saíam de gerações diferentes de paleta.

**Corrigido** com `STATUS_HEX` em `status-visual.ts` — o mapa hex que falta para
SVG, derivado dos mesmos tokens v4 — consumido pelo gráfico. E com
`npm run verify:tokens`, que falha em dois casos: se `STATUS_HEX` deixar de
conferir com o tema, e se algum arquivo voltar a declarar os quatro estados com
hex.

Ainda pendente, com decisão de design: `TimelineChart.tsx` usa verde/vermelho para
"melhor/pior nota" — semântica diferente de confiabilidade, e portanto uma
pergunta sobre a regra "cor = significado", não um bug de token.

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

## 6. Regras de formulário

A página 04 define a aparência; estas são as regras que precisam sobreviver à
implementação, porque a aparência sozinha não as garante.

| Regra | Motivo |
|---|---|
| O rótulo é um `<label for>` real, nunca placeholder | Placeholder desaparece ao digitar e não é lido de forma confiável por leitor de tela |
| Foco com anel **externo** de 2px (`outline-offset`) | Borda interna encolhe o conteúdo e desloca o texto no momento do foco |
| Erro ligado ao campo por `aria-describedby` + `aria-invalid` | Sem isso o leitor de tela anuncia o campo sem dizer o que está errado |
| Faixas de sucesso e erro com `role="alert"` | Mudança de estado precisa ser anunciada, não apenas vista |
| Botão de envio com `aria-busy="true"` e rótulo que muda | Rótulo diferente informa progresso sem o botão mudar de largura e empurrar o layout |
| Nunca desabilitar o envio preventivamente | Campo desabilitado não é anunciado e esconde a razão do bloqueio; valide e explique |
| Cor nunca é o único sinal | Mensagem textual acompanha todo estado — WCAG 1.4.1 |

O texto de ajuda fica **fora** do frame do campo, como nó separado, porque no app
ele vira um elemento próprio ligado por `aria-describedby`. Desenhá-lo dentro do
campo esconderia essa separação.

## 7. O que não está coberto

- **Responsivo**: os artboards são 1440. O comportamento em 375px está verificado
  por Playwright, não desenhado.
- **Modo claro**: o tema é dark fixo por decisão de produto, então não há variante.
- **Estados de carregamento de página inteira** (skeleton, erro de rota) — a
  página 04 cobre o carregamento **de ação**, não o de tela.
- **Tokens exportados para CSS**: o FigCraft sabe exportar as variables como
  custom properties (`variable.export --format css`). Não foi feito porque o
  `@theme` do Tailwind já é a fonte que o app consome — ter as duas seria criar
  justamente a segunda fonte de verdade que este documento evita.
