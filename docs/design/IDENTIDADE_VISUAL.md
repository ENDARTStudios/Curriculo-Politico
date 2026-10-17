# IDENTIDADE_VISUAL — Documento de design no FigCraft

**Projeto:** Currículo Político · **Data:** 2026-10-17
**Fonte:** `design/construir-identidade.mjs` (gerador) · **Artefato:** `design/curriculo-politico.figcraft`
**Revisão visual:** `design/export/*.png`

---

## 1. O que foi produzido

Catorze artboards de 1440 de largura: seis de **sistema** (fundamentos e
componentes) e oito de **arquétipo de página** (as 28 rotas do app).

### 1.1 Sistema

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

### 1.2 Arquétipos de página

As 28 rotas não são 28 desenhos. Desenhar uma a uma produziria 20 variações do
mesmo layout — e, pior, deixaria o sistema sem regra, porque cada página viraria
um caso. O **arquétipo** é a unidade que se mantém: uma rota nova herda o template
em vez de inventar um.

| Página | Rotas que cobre |
|---|---|
| **06 · Listagem** | `/ranking`, `/ranking/personalizado`, `/partidos`, `/projetos`, `/stf`, `/calendario-eleitoral`, `/historia`, `/espectro` |
| **07 · Perfil** | `/politicos/[id]`, `/partidos/[acronym]`, `/projetos/[id]` |
| **08 · Comparação** | `/comparar`, `/partidos/comparar` |
| **09 · Editorial** | `/como-funciona`, `/metodologia`, `/faq` |
| **10 · Jurídico** | `/privacidade`, `/termos-de-uso`, `/cookies`, `/lgpd` |
| **11 · Conta** | `/conta`, `/auth/signin` |
| **12 · Retificação** | `/retificacao`, `/contato`, `/apoie` |
| **13 · Status** | `/status`, `/sobre` |
| **14 · Mobile** | O sistema em 375px: hero, linha do ranking como card, formulário com erro por campo — e as regras do layout estreito |

Somadas a `/` (página 03), são as 28 rotas do `apps/web/src/app`.

Chrome comum a todas: `navegacao()` desenha a faixa de topo e `cabecalhoPagina()`
devolve o `y` onde o conteúdo começa — nenhuma página posiciona o cabeçalho à mão,
pela mesma razão do cursor em `gradeSwatches`.

### 1.3 Decisões de arquétipo que não são óbvias

- **Listagem**: a barra de nota é compartilhada entre linhas, então a distância
  entre duas notas é visível. Número sozinho não se compara.
- **Perfil**: a nota vem **antes** das evidências. É a pergunta que trouxe a
  pessoa ali; invertê-la faz o leitor rolar para descobrir o que já queria saber.
- **Comparação**: a coluna de **diferença** existe porque o olho não calcula
  subtração entre dois números grandes. O sinal `+/−` é o portador não-cromático
  (WCAG 1.4.1), então não há rótulo redundante de "melhor".
- **Editorial**: medida de leitura em ~65 caracteres. Texto corrido em 1280px é
  ilegível — a linha fica longa demais para o olho voltar.
- **Jurídico**: quatro documentos, um template. Muda o título e o corpo; a
  estrutura é a mesma porque a função é a mesma.
- **Conta**: card estreito e centrado. Autenticação não é lugar de explorar
  layout — a pessoa quer entrar e sair, e qualquer elemento extra é atrito.
- **Retificação**: orientação ao lado do formulário. Ela não é decorativa: reduz
  pedido incompleto, e este é o canal formal do titular (LGPD Art. 18).
- **Status**: a página é desenhada **no estado degradado**. Um status todo verde
  não prova nada; o caso que importa é quando uma verificação falha. Por isso o
  resumo no topo reflete a pior linha — a primeira versão dizia "todos os sistemas
  operacionais" em verde com uma linha âmbar logo abaixo, e se contradizia.

### 1.4 Como reconstruir

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

## 1.6 Arquitetura de informação

O documento de identidade cuidava de cor, tipo e espaçamento — e a **estrutura**
nunca foi desenhada. O sintoma mais visível: a barra superior.

### 1.6.1 O que havia

Doze links planos num `flex-wrap`: Ranking, Partidos, Projetos, Comparar, Meu
Espectro, História, Como Funciona, Calendário, STF, FAQ, Metodologia, Sobre.

| Defeito | Consequência |
|---|---|
| 12 itens no mesmo nível, sem agrupamento | Nenhum destino se destacava; era preciso ler doze rótulos para achar um |
| `flex-wrap` sem hierarquia | Quebrava em **duas linhas** no desktop |
| Todos `<a>`, não `<Link>` | Cada clique recarregava a página inteira |
| Sem estado ativo | Nada indicava onde a pessoa estava |
| Conta só no rodapé | Login era o 11º link, entre Cookies e Retificação |

O problema não era o número de destinos — eram 28 no site. Era a **falta de
modelo**: cada rota tinha o mesmo peso, então o menu não ajudava a decidir.

### 1.6.2 O modelo atual

Cinco grupos, agrupados por **intenção de quem chega**, não por tipo de dado:

| Grupo | Itens | Intenção |
|---|---|---|
| **Ranking** ▾ | Ranking IDIP · personalizado · Meu Espectro · STF | "quero ver quem presta" |
| **Partidos** ▾ | Todos · Comparar partidos | "quero ver por agremiação" |
| **Projetos** | — | "quero ver o que foi proposto" |
| **Comparar** | — | "quero decidir entre dois" |
| **Metodologia** ▾ | IDIP · como funciona · História · Calendário · FAQ · Sobre | "posso confiar no número?" |

A fonte única é `apps/web/src/lib/navegacao.ts`. Header, drawer mobile e rodapé
leem dela — e é por isso que não podem divergir. A barra chegou a doze itens
porque cada rota nova era acrescentada num lugar e esquecida nos outros.

### 1.6.3 Decisões

**A conta subiu para o header.** Login é ação de topo de página em qualquer
produto. No rodapé, era preciso rolar a página inteira e saber de antemão que o
acesso morava ali.

**Disclosure, não `role="menu"`.** `role="menu"` promete ao leitor de tela
navegação por setas, `aria-activedescendant` e foco gerenciado. Sem implementar
tudo isso, o papel mente — foi o erro que cometi no dropdown de busca. O padrão
disclosure (botão com `aria-expanded` + painel de links comuns) é honesto.

**Abre por clique, não por hover.** Hover aciona sem intenção ao passar o mouse a
caminho de outro item, e é inacessível a teclado e a toque.

**Drawer mobile com os mesmos grupos**, mais os institucionais — no desktop eles
vivem no rodapé. Escape fecha; clicar fora fecha; a rolagem do fundo trava.

**Rodapé em quatro colunas por finalidade** (Explorar, Entender, Projeto,
Jurídico). Antes eram onze links numa fileira, misturando produto e política de
privacidade com o mesmo peso.

### 1.6.4 Largura: cinco containers, nenhum alinhado

O header usava `max-w-6xl`; as páginas de dados, `max-w-5xl`; metodologia e as
legais, `max-w-4xl`; conta e contato, `max-w-3xl`. Como todos são centralizados,
**cada largura tem uma borda esquerda diferente** — a logo nunca alinhava com o
título, e o desalinhamento mudava de tela para tela.

Normalizado para `max-w-5xl` em 26 rotas. Ficaram estreitos só os formulários
(`max-w-2xl` na retificação, `max-w-md` no login): campo largo é pior de digitar,
e um cartão de login centrado não precisa alinhar. Parágrafos seguem em
`max-w-3xl` — é o que garante linha legível, independente do container.

### 1.6.5 A home: mostrar o produto, não descrevê-lo

A home anterior era um funil de texto — título, parágrafo, CTA — seguido de
quatro cartões do Termômetro e **três cartões de pesos da metodologia**. Não
exibia nenhum dado da plataforma acima da dobra.

A regra do conceito é "o dado é o herói", e a home a violava: o herói era o texto.

| Antes | Depois |
|---|---|
| Herói só de texto | Herói dividido: promessa à esquerda, **ranking real** à direita |
| Busca só no header | Busca no herói — é a tarefa nº 1 |
| 3 cartões de pesos | Movidos para `/metodologia`, onde pertencem |
| 4 cartões grandes do Termômetro | Faixa horizontal de 4 estados (reconhecer, não estudar) |
| Fecho pedindo ação sem oferecer porta | "Por onde começar": 3 caminhos explícitos |

Os pesos não foram apagados, foram **movidos**: a soma visível é garantia
metodológica (pesos que não fecham em 100% são defeito), e o teste de e2e foi
movido junto. Se ele continuasse apontando para a home, exigiria que a duplicação
voltasse.

### 1.6.6 O que a verificação pegou

Nenhum destes apareceu por leitura — todos por teste ou captura:

- **Nome acessível duplicado**: a logo do rodapé repetia o `aria-label` do header,
  e o leitor de tela passava a listar dois destinos idênticos. O teste de
  navegação quebrou em modo estrito.
- **`id` duplicado no DOM**: duas buscas na home emitiam `#busca-resultados`.
  Corrigido com `idLista` configurável.
- **Dois campos com o mesmo nome acessível**: mesma causa, corrigido com
  `rotuloBusca`. Nomes distintos também melhoram a navegação por formulário.
- **Logo reduzida a um emoji em 375px** (`hidden sm:inline` no nome) — parecia
  ícone quebrado.
- **Placeholder truncado** em duas larguras diferentes: "(Ctrl+" no mobile e
  "partido o" no desktop.
- **Variável `preenchido` órfã** e **comentário JSX inválido** (`{/* */}` onde se
  espera um filho), pegos pelo `typecheck`.

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

### 6.1 O que a auditoria encontrou

Medido no código, não suposto:

| Regra | Antes | Depois |
|---|---|---|
| `<label htmlFor>` | 9 ocorrências (só `signin` e `retificacao`) | todos os controles |
| `aria-label` onde não há rótulo visual | 0 | busca, link de compartilhamento |
| anúncio do resultado da busca | 0 | `role="status"` com a contagem (`N resultados para "x"`) |
| `role="alert"` | **0** | erro de `/retificacao` (por campo) e de `/auth/signin` |
| `aria-invalid` + `aria-describedby` por campo | **0** | `/retificacao`: cada campo aponta para o próprio erro |
| `role="status"` | **0** | resultado da consulta de protocolo |
| `aria-busy` | **0** | botão de envio da retificação |
| Envio desabilitado preventivamente | **sim** (`!preenchido`) | não — a validação explica o campo |

O caso mais grave era o **envio desabilitado preventivamente**. `disabled` remove o
controle da árvore de acessibilidade: o leitor de tela não anuncia o botão nem a
razão do bloqueio, e a pessoa fica sem saber o que falta preencher.

### 6.1.1 Por que `noValidate`

A validação por campo só passou a existir depois de **desligar** a validação
nativa. Com `required`/`minLength` ativos, o evento `submit` **nunca dispara**
quando há campo inválido — a bolha do navegador o intercepta antes — e
`aria-invalid` jamais chegava ao DOM.

O teste de e2e pegou isso: o campo continuava com `aria-invalid` nulo depois do
clique. Três razões para assumir a validação no cliente:

1. A mensagem nativa **não é estilizável** e muda de texto por navegador.
2. Ela **não é ligada ao campo** por `aria-describedby`, então o leitor anuncia o
   campo sem dizer o que está errado nele.
3. O projeto precisa da mesma mensagem em todos os navegadores.

Os atributos `required`/`minLength` **permanecem** no HTML: eles anunciam ao
leitor de tela que o campo é obrigatório. O que saiu foi só a interceptação.

Ao falhar, o foco vai para o **primeiro campo inválido** — teclado e leitor
seguem o foco, e a pessoa não precisa procurar onde está o problema.

### 6.1.2 O combobox que não era combobox

A busca recebeu `role="combobox"` no campo e `role="listbox"` no painel. Era
**inválido**, e o axe só pegou quando o teste passou a abrir o painel:
`aria-required-children`.

Um `listbox` só aceita `option` ou `group` como filhos. Este painel contém seções
com título e `<a>` — são **links de navegação**, não opções selecionáveis. Declarar
`combobox` prometia ao leitor de tela um comportamento (navegação por setas,
`aria-activedescendant`, seleção) que o componente não tem.

O padrão correto para uma lista de atalhos agrupada é: **links nativos** (já
alcançáveis por teclado) + uma região viva que anuncia quantos resultados existem.
O `role="status"` cumpre o que o `aria-expanded` prometia, sem mentir sobre o
controle.

Converter o painel em listbox de verdade exigiria lista plana de opções e perderia
os agrupamentos, que são informação útil. Não valia o custo.

Também havia **rótulo visível sem associação** em `ProjetoFilters` e
`ComparacaoCards`: o `<label>` existia na tela e não existia para o leitor de tela,
porque faltava `htmlFor` e o `id` no controle.

### 6.2 O guard

`npm run verify:formularios` falha quando um `<input>`, `<textarea>` ou `<select>`
não tem nome acessível — `<label htmlFor>` correspondente, associação implícita
(controle dentro de `<label>`) ou `aria-label`.

Duas armadilhas que o próprio guard teve, e que valem registro:

1. **Falso positivo em associação implícita.** `<label>` envolvendo o `<input>` é
   válido pela spec e é o padrão dos checkboxes de termos. A primeira versão acusou
   três checkboxes corretos. Guard com falso positivo ensina a ignorá-lo.
2. **O `>` de `=>` encerrava a tag.** O parser ingênuo lia a tag até o primeiro
   `>`, então tudo depois de `onChange={(e) => ...}` ficava invisível — e o
   `aria-label` do campo de busca, que estava correto, era reportado como ausente.
   A correção é a alternância `(?:=>|[^>])`, com `=>` **antes**.

## 7. Implementação no código

O documento desenha; o código precisa **concordar** com ele. O primeiro ponto em
que discordava era o mais visível de todos: o formato do número.

### 7.1 O número era exibido com ponto decimal

O app mostrava `70.0` — convenção de `en-US` — em **catorze** pontos da
interface, enquanto o documento usa `70,0` desde o primeiro artboard. Numa
plataforma brasileira isso não é cosmético: quem lê `70.0` tende a ler "setenta",
sem decimais, e o número que é o produto parece inteiro.

Corrigido com `apps/web/src/lib/formato.ts` (`formatarNota`, `formatarPercentual`,
`formatarInteiro`), consumido por ranking, perfil de político, partido, STF,
comparação e os gráficos.

Duas decisões:

- **`null` devolve `—`, nunca `0,0`.** Nota zero é um resultado; ausência de nota é
  outro, e o projeto trava publicação de nota com confiança baixa justamente para
  não confundir os dois.
- **`npm run verify:formato`** falha se um campo de domínio (`finalScore`,
  `avgScore`, `confidenceScore`, `nota`…) voltar a usar `toFixed`. `toFixed` não
  tem locale, então aceita qualquer idioma — inclusive nenhum. Valores técnicos
  (coordenada de SVG, largura de barra) seguem livres.

### 7.2 Barra de magnitude na listagem

O arquétipo 06 pede que a distância entre duas notas seja **visível**. O ranking
passou a ter uma barra de escala fixa (0–100) e largura constante em todas as
linhas, sob o número.

Ela é **azul, não cor de estado**: o Termômetro na coluna ao lado já carrega
confiabilidade, e repetir a mesma cor duas vezes na linha faria a cor deixar de
significar uma coisa só.

### 7.3 Nome acessível dos gráficos

Os `<title>` de SVG tinham vários filhos de texto. O React avisa, e o nome
acessível fica instável — alguns leitores leem só o primeiro nó, então o valor da
média se perdia justamente para quem depende do texto. Passaram a ser um único
string.

### 7.4 O que a verificação visual pegou

As páginas foram abertas com o **banco de produção** (túnel Railway, 594
registros) e capturadas em 1440px. Confirmado: `70,0` no ranking e no perfil,
`Confiança: 95%`, barras de magnitude. O aviso do React sobre `<title>` apareceu
só nessa execução — nenhum teste de unidade o pegaria.

## 8. Estados de sistema

Três estados que o usuário encontra e que não estavam desenhados nem
implementados: 404, erro de rota e carregamento.

| Arquivo | Estado | Decisão |
|---|---|---|
| `app/not-found.tsx` | 404 | A saída principal é o **ranking**, não a home: quem buscava um político e caiu aqui ainda quer o político |
| `app/error.tsx` | erro de rota | Mantém a moldura do site; a `global-error` substitui o layout inteiro e deixa a pessoa sem caminho de volta |
| `app/loading.tsx` | carregamento | Esqueleto com a forma do conteúdo, não spinner |

### 8.1 Por que esqueleto e não spinner

A auditoria de produção mediu **3,1 s** de resposta no ranking. Nesse tempo, um
spinner informa apenas "espere"; um esqueleto informa **o que está vindo** e faz a
espera parecer menor, porque a atenção já está no lugar certo quando o dado chega.

O esqueleto é genérico de propósito: `app/loading.tsx` cobre todas as rotas, e
desenhar a forma de uma página mentiria nas outras.

### 8.2 Acessibilidade destes estados

- O 404 e o erro mantêm `<h1>` e a navegação — não são telas isoladas.
- O erro mostra o `digest` do Next: sem ele um relato de problema não é acionável.
  Não é stack trace, é um identificador curto.
- O esqueleto usa `role="status"` com texto oculto ("Carregando o conteúdo…") e
  `motion-reduce:animate-none`: a animação é desligada por `prefers-reduced-motion`,
  e quem a desliga precisa continuar sabendo que algo está em andamento — por isso
  o texto existe no DOM.
- O 404 é auditado junto com as 28 rotas (`npm run audit:visual`), porque é uma
  página que o usuário vê.

## 9. Responsivo — página 14

O responsivo era a última lacuna declarada: todos os artboards eram 1440, e o
comportamento em 375px estava **verificado** por teste, não **desenhado**.

Verificação não é decisão. Sem artboard, cada ajuste de mobile vira improviso na
hora de codar, e as decisões ficam implícitas no CSS — difíceis de revisar e
fáceis de contradizer depois.

| Regra | Desktop | 375px |
|---|---|---|
| Gutter | 80px | 16px, uma coluna |
| h1 | 72px | 30px |
| Alvo de toque | — | 44px de altura mínima |
| Ranking | tabela de 6 colunas | card |

### 9.1 A tabela que vira card

Em 375px seis colunas não cabem. A tabela vira região de rolagem horizontal — que
**funciona** e passa em acessibilidade, mas esconde a **nota**, que é o motivo de a
pessoa estar ali.

O documento passou a pedir card, e o card foi implementado em `/ranking`
(`CartaoRanking`, visível abaixo de `md`; a tabela fica `hidden md:block`). Ele
mantém na primeira dobra: posição, nome, partido/UF, nota, termômetro, confiança e
a barra de magnitude.

### 9.2 O defeito que só o render mostrou

A primeira versão da página 14 tinha dois problemas invisíveis para o gerador,
porque ele não mede altura de texto:

1. O rótulo de cada tela encostava na segunda linha do parágrafo de apoio do
   cabeçalho.
2. As quatro regras do layout caíam fora do canvas de 1240px e não apareciam.

Corrigidos com `mobTopo = yMob + 64` e canvas de 1430px. É o mesmo padrão de
defeito das páginas 00–13: sobreposição só se vê no PNG.

## 10. O que não está coberto

- **Modo claro**: o tema é dark fixo por decisão de produto, então não há variante.
- **Tokens exportados para CSS**: o FigCraft sabe exportar as variables como
  custom properties (`variable.export --format css`). Não foi feito porque o
  `@theme` do Tailwind já é a fonte que o app consome — ter as duas seria criar
  justamente a segunda fonte de verdade que este documento evita.
