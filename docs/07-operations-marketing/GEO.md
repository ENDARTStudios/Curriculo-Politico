# GEO — Generative Engine Optimization

> ## Aviso de escopo e honestidade
>
> **GEO é uma disciplina emergente e, na maior parte, especulativa.** A sigla foi
> popularizada por um artigo acadêmico (Aggarwal et al., "GEO: Generative Engine
> Optimization", 2023) que testou **9 métodos de modificação de conteúdo** em um
> benchmark próprio — não em um motor de produção com contrato estável. A partir
> disso, surgiu um mercado de "otimização para IA" com promessas que **não são
> verificáveis**.
>
> Este documento faz três coisas e nada além: **(1)** descreve o que é verificável,
> **(2)** conecta com o que este projeto **já** tem — que é bastante, e por razões
> que nada têm a ver com GEO — e **(3)** recusa-se a inventar métrica. Onde não há
> verificação, está escrito **não verificado**.

Documentos relacionados: [AEO.md](AEO.md) (extração de trecho — **a parte
verificável**), [AIO.md](AIO.md) (política de crawler),
[SEO.md](SEO.md), [ANALYTICS.md](ANALYTICS.md).

## 1. GEO vs. AEO vs. AIO — a distinção que importa

| | Pergunta | Grau de verificação |
|---|---|---|
| **SEO** | O buscador indexa minha página? | ✅ Alto — comportamento documentado, resultado medível |
| **AEO** | Meu conteúdo é extraído como resposta/snippet? | 🟡 Médio — o mecanismo existe há uma década; o resultado é parcialmente observável |
| **AIO** | Deixo crawlers de IA coletarem? | ✅ Alto para a **política** (o `robots.txt` é verificável); ❌ nulo para o **efeito** |
| **GEO** | Um modelo generativo me **cita** na resposta que compõe? | ❌ **Baixo.** Sem contrato, sem métrica acessível, sem estabilidade entre versões |

**Recomendação de prioridade, se houver apetite limitado:** trabalhe **AEO antes de
GEO**. Todo trabalho de AEO já é útil para SEO e é verificável por teste. Trabalho de
GEO, hoje, é aposta.

## 2. O que é verificável sobre GEO

Pouca coisa, e é honesto dizer isso.

### 2.1 O que o estudo original realmente mediu

Os 9 métodos testados incluíram coisas como citar fontes, adicionar citações de
autoridade, adicionar estatísticas e usar linguagem mais fluente. Os resultados
**variaram por domínio** — nenhum método ganhou em todos os casos. A conclusão
defensável é fraca: *"conteúdo com fatos verificáveis e fontes citadas tende a se
sair melhor em alguns benchmarks"*.

Isso **não** é uma receita. E é importante notar que os benchmarks usados eram dos
próprios autores, não de motores de produção.

### 2.2 O que é razoavelmente sólido

| Observação | Confiança |
|---|---|
| Motores generativos consomem o que já está indexado — SEO e AEO são pré-requisitos | 🟢 Alta |
| Conteúdo factual, com data e fonte, é mais citável que opinião | 🟢 Alta (e é o que este projeto faz por regra) |
| Dados estruturados ajudam a máquina a entender o que a página **é** | 🟡 Média — efeito conhecido em busca tradicional; em motores generativos, **não verificado** |
| Bloquear o crawler **impede** a citação | 🟢 Alta — consequência lógica direta ([AIO.md](AIO.md) §2) |
| Existe "truque" para ser citado | 🔴 **Falso.** Não há |

### 2.3 O que é especulação de mercado

Marcado como especulação, sem exceção:

- "Otimizar para aparecer no ChatGPT/Gemini/Perplexity" como serviço com garantia de
  resultado.
- "Escrever em formato de pergunta e resposta garante citação".
- "Adicionar `llms.txt` melhora a citação" — **não verificado**, ver
  [AIO.md](AIO.md) §3.
- "Modelos preferem texto de 200 palavras / listas / tabelas" — afirmações
  repetidas em blogs, sem estudo replicável por trás.
- Qualquer "score de visibilidade em IA" vendido como métrica objetiva.

## 3. Por que este projeto está **bem posicionado** sem ter feito nada de GEO

Este é o ponto central do documento. A plataforma tem quatro propriedades que são
exatamente o que se argumenta que ajuda em GEO — e todas existem por outros motivos
(regra editorial, compliance, auditoria). Isso é **muito** melhor que implementar
táticas de GEO: significa que a base não vai ser desfeita quando a moda mudar.

### 3.1 Afirmações falsificáveis, com fonte

Em vez de "político X é ruim", a plataforma produz:

> Nota IDIP **72,4** de 100, estado **Confiável**, dimensões Integridade /
> Produtividade / Transparência, metodologia **v1.1** aberta em `/metodologia`,
> calculada a partir de dados públicos da Câmara, do Senado e do TSE, com
> `sourceUrl` e `retrievedAt` por registro.

Um modelo pode usar isso sem risco de estar afirmando difamação. É exatamente o tipo
de trecho que um sistema generativo prefere citar — **não porque foi otimizado, mas
porque é verificável**.

Onde a plataforma **não** tem dado, ela diz que não tem (baseline neutro 50,
rotulado na interface). Isso é raro e é o ativo mais valioso.

### 3.2 Metodologia pública e versionada

`/metodologia` + `packages/idip/src/scoring.ts` + `lib/methodology.ts` formam uma
**fonte primária de um cálculo**. A maioria dos sites de avaliação não publica a
fórmula. Isso é o que distingue:

| | Citação |
|---|---|
| Site de opinião | "segundo o site X, o político é ruim" — o modelo assume o risco de reproduzir juízo |
| Plataforma com metodologia aberta | "o IDIP é calculado assim, versão 1.1, pesos publicados" — o modelo cita o método, não o juízo |

Há um teste automatizado que garante que a UI e o motor não divergem
(`tests/e2e/home.spec.ts`, bloco "Consistência entre UI e motor IDIP"). Sem ele, a
metodologia publicada poderia estar desatualizada em relação ao cálculo real — e uma
citação baseada nisso seria falsa.

### 3.3 Licenças declaradas

`README.md`: código sob **AGPL-3.0-only**, documentação sob **CC BY 4.0**. Um
consumidor automatizado sabe o que pode usar e com que obrigação de atribuição. Isso
é incomum e é um facilitador real de citação legítima.

### 3.4 Identidade resolvida com revisão humana

`apps/pipeline/scripts/resolve-identity.ts` e `review-medium.ts` implementam
resolução de identidade com faixa de confiança: automático acima de limiar alto,
**revisão humana** na faixa intermediária. Homônimo é o problema clássico de dados
políticos brasileiros.

**Por que isso é GEO, na prática:** o pior cenário de citação em motor generativo é
atribuir a ficha de uma pessoa a outra. A plataforma investe em não fazer isso. Nenhum
`llms.txt` compensa um erro de homonímia.

## 4. O que **falta** e é verificável

| Lacuna | Verificação | Efeito plausível em GEO |
|---|---|---|
| **Zero dados estruturados** | Busca por `application/ld+json` / `schema.org` / `jsonLd` em `apps/web/src`: **nenhuma ocorrência** | 🔴 É a lacuna mais defensável de corrigir. Ver §5 |
| **Respostas do FAQ fora do HTML inicial** | `apps/web/src/app/faq/page.tsx` é `"use client"` com renderização condicional | 🔴 Texto que não chega no HTML não é consumido |
| **Sem `llms.txt`** | Ausente | ⚪ Efeito **não verificado**; recomendação é não implementar ([AIO.md](AIO.md) §3) |
| **Sem versão em texto/markdown do conteúdo** | Ausente | ⚪ Não recomendado agora — criaria segunda fonte de verdade |
| **Sem sinal de atualização confiável** | O `lastmod` das rotas estáticas usa `new Date()` (data do request), não data real de modificação ([SEO.md](SEO.md) §7) | 🟡 Frescor é um critério plausível de seleção; declarar data falsa é pior que não declarar |
| **`LegalRecord` vazio** | 0 registros | 🔴 **O maior problema de conteúdo do projeto**, e é a T-01. A dimensão de maior peso opera em baseline 50. Nenhuma técnica de GEO compensa ausência de dado |
| **Sem métrica de citação** | Sem analytics ([ANALYTICS.md](ANALYTICS.md)) | ⚪ Torna todo este documento não mensurável — e é por isso que ele é honesto sobre isso |

## 5. Trabalho defensável hoje

Ordem por relação ganho/risco. **Nenhum item é específico de GEO** — todos servem a
SEO e AEO, que são verificáveis.

1. **Resolver T-01 (carga de `LegalRecord`).** É a prioridade, e não é GEO: é o
   produto. De nada serve ser citável sobre uma nota cuja dimensão de 25% está sem
   dado. Ver [`TASKS.md`](../03-development-process/TASKS.md) T-01 — o lado TCU está
   destravado por uma API pública sem autenticação.
2. **Mover as respostas do FAQ para o HTML inicial** e marcar `FAQPage`
   ([AEO.md](AEO.md) §5.1). Ganho concreto, verificável por teste, sem risco.
3. **`Dataset` em `/metodologia`** e `BreadcrumbList` nas rotas de detalhe. A
   metodologia é um dataset com versão e licença — encaixe direto em dados
   estruturados.
4. **Consertar o `lastmod`** das rotas estáticas para refletir data real de
   modificação. Barato e correto — independente de GEO.
5. **Avaliar se as perguntas ao produto têm resposta em página própria.** As buscas
   reais do público ("quem é meu deputado", "como votou X") apontam para onde o
   conteúdo precisa existir. Isso é estratégia de conteúdo, e precede qualquer
   táctica.

## 6. O que **não** fazer

1. **Não contratar "SEO para IA".** O mercado promete o que não pode medir. Este
   projeto não tem orçamento para apostar, e o `README` mostra que ele prefere
   decisão com medição (o padrão de
   `docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`).
2. **Não reescrever a copy "para o modelo".** Viola
   [CONTENT.md](../04-api-integrations/CONTENT.md) §2 e prejudica a leitura humana —
   a única métrica que existe hoje.
3. **Não criar conteúdo duplicado para consumo de IA.** Segunda fonte de verdade
   divergindo do banco é o defeito que este projeto mais teme.
4. **Não bloquear crawler por medo** sem decidir antes ([AIO.md](AIO.md) §2).
5. **Não apresentar este documento como plano com prazo.** É um mapa de
   incerteza com três ações verificáveis no §5.

## 7. Não verificado

Praticamente tudo o que é específico de GEO:

- Se o site é citado por qualquer motor generativo, e com que frequência.
- Se dados estruturados influenciam citação em motores generativos.
- Se existe qualquer relação entre `llms.txt` e citação.
- Se os 9 métodos do estudo original se replicam em motores de produção atuais.
- Se frescor de conteúdo influencia seleção de fonte em resposta gerada.
- Qualquer afirmação quantitativa sobre "tráfego vindo de IA" neste site.
- **A data e a versão do estudo citado em §2.1 não foram reverificadas** durante a
  escrita deste documento; foi descrito de memória do debate público sobre o tema.
  Trate como referência qualitativa, não como citação bibliográfica.

**A ausência de métrica não é uma lacuna deste documento — é o estado real.** Sem
[ANALYTICS.md](ANALYTICS.md) resolvido, nenhuma disciplina de "otimização" neste
projeto pode ser avaliada, seja SEO, AEO, AIO ou GEO.
