# Política editorial de conteúdo

Regras de texto, tom e apresentação de dados. Aplica-se a **todo** texto do
produto: página institucional, microcopy de botão, rótulo de gráfico, texto
alternativo de imagem, `description` de metadata, mensagem de erro de API e
resumo de proposição.

Base normativa: `AGENTS.md` §"Regras de produto que não se negociam",
`CONTRIBUTING.md` §"Regras do projeto" e
[`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md).

Documentos relacionados:
[`RULES.md`](../03-development-process/RULES.md) (regras de engenharia),
[SEO.md](../07-operations-marketing/SEO.md) (metadata e indexação),
[ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md) (texto alternativo
e rótulos acessíveis).

## 1. Linguagem jurídica estrita

**Permitido apenas:**

- **"Réu em Ação Penal"**
- **"Condenação Transitada em Julgado"**

**Proibido, sem exceção:** "crime", "criminoso", "bandido", "corrupto",
"ficha suja", "condenado" sem qualificação de trânsito em julgado, e qualquer
juízo moral sobre a pessoa.

### Por que a regra é literal

O produto é uma ferramenta de verificação de fatos sobre pessoas reais nomeadas,
com foto e nota pública. A diferença entre "réu" e "condenado" é a diferença entre
descrever um processo e afirmar um fato — e afirmar fato falso sobre pessoa
identificada é risco jurídico do projeto, não escolha estilística.

### Onde a regra alcança (e as pessoas esquecem)

| Superfície | Por que é fácil violar |
|---|---|
| `alt` de imagem e `aria-label` | costuma ser escrito rápido e não passa por revisão de copy |
| `description` de metadata | é lida pelo buscador antes de qualquer humano revisar |
| Mensagem de erro e estado vazio | parece texto de sistema, mas é texto do produto |
| Rótulo de série de gráfico | abreviação tende a endurecer o termo |
| Texto do funil na home | pressão de conversão empurra para o adjetivo forte |

### E o status do registro?

`LegalRecord.status` é valor de **enum**, não texto de interface. O que o usuário
vê é a tradução — e a tradução segue a mesma regra. Referência de comportamento
observável: `apps/web/src/components/LegalDisclaimer.tsx` e
`apps/web/src/app/api/politicians/[id]/route.ts`.

### Termos institucionais que já estão corretos no código

Use exatamente estes, não invente variações:

| Conceito | Termo no produto |
|---|---|
| Índice | **IDIP** — Índice de Desempenho e Integridade Pública |
| Estado de risco | **Termômetro de Confiabilidade** |
| Estados | 🟢 Confiável · 🟡 Atenção · 🔴 Não Confiável · ⚪ Dados Insuficientes |
| Estado ⚪ | "Dados Insuficientes" — **fora do ranking** |
| Travas | "Travas de integridade" |
| Camada de voto | "Votação popular" — sempre qualificada como **separada** da nota |

## 2. Neutralidade política

### Regras

1. **Nenhum viés partidário.** Não existe partido "melhor" nesta plataforma.
2. **A votação popular nunca altera a nota.** A UI **não pode** sugerir o
   contrário. O cabeçalho de `apps/web/src/app/api/bills/[id]/vote/route.ts`
   registra a regra no código, e `apps/web/src/lib/affinity.ts` a repete.
3. **Dimensões sem dados recebem baseline neutro 50** e isso é **identificado na
   interface** (`ScoreBreakdown` mostra o selo por dimensão). Apresentar baseline
   como medição é violação.
4. **Todo partido é avaliado pelos mesmos critérios técnicos** — está escrito em
   `apps/web/src/components/PartyScoreBreakdown.tsx`.
5. **Nada de adjetivo avaliativo sobre pessoa ou legenda.** A plataforma descreve
   estado, não emite juízo (`apps/web/src/app/politicos/[id]/page.tsx`, comentário
   de `generateMetadata`).

### O que isso proíbe na prática

- Ordenar partidos por posição no espectro ideológico como se fosse ranking de
  qualidade.
- Qualquer CTA do tipo "veja os piores políticos".
- Série de gráfico com nome pejorativo.
- Copy de marketing que trate a nota como veredito moral.
- Sugerir que votar no site influencia a nota — mesmo implicitamente, pela
  proximidade dos elementos na tela.

### O limite honesto da promessa

O FAQ do produto foi **reformulado** para não prometer "neutralidade absoluta".
O texto correto descreve neutralidade como **característica verificável da
metodologia aberta**, não como promessa de ausência de viés. Registrado na
auditoria jurídica: `docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md`.

## 3. Dados honestos na apresentação

### 3.1 Nenhum número sem consulta real

Número exibido tem de vir do banco, naquele request. Não existe número
"aproximado", "de exemplo" ou herdado de outro lugar. O padrão de implementação é
`apps/web/src/lib/hero-stats.ts` (ver
[ERROR_HANDLING.md](../07-operations-marketing/ERROR_HANDLING.md) §3).

### 3.2 Nunca renderize zero como prova

Proibido: "0 políticos avaliados", "0 projetos", "0 partidos" na faixa de prova.
Banco vazio ou indisponível ⇒ **a faixa não é renderizada**
(`HeroStats` retorna `null`). Um zero exibido transforma o argumento de
credibilidade em confissão de incapacidade.

### 3.3 Baseline neutro tem de estar rotulado

Dimensão sem dados = 50, e a interface **diz** que é baseline por ausência de
dados. A home exibe a soma dos pesos dos três perfis de propósito: um conjunto de
pesos que não fecha em 100% é defeito de metodologia, e o defeito fica visível.

### 3.4 Versão da metodologia vem do motor

A UI importa a versão de `apps/web/src/lib/methodology.ts`, que espelha
`version` de `packages/idip/package.json` (hoje `1.1.0` → exibido como **v1.1**).
**Nunca redigite "v1.0" ou "v1.2" em um texto.** O defeito já aconteceu: a home
anunciava v1.0 com pesos antigos (Produção 20% / Custo 5%) enquanto o motor rodava
v1.1 (Produção 18% / Custo 7%). Existe teste de regressão em
`tests/e2e/home.spec.ts`.

### 3.5 Dados fictícios de desenvolvimento nunca aparecem

O seed cria registros com `externalId` prefixado `seed-`. Consultas públicas os
excluem explicitamente (`/api/rankings`, `/status`). Ao escrever consulta nova que
liste pessoas, reproduza o filtro:

```ts
OR: [{ externalId: null }, { externalId: { not: { startsWith: "seed-" } } }]
```

O `OR` é necessário porque `externalId` é nullable — um `not` simples descartaria
registros legítimos sem id externo.

## 4. Resumo em linguagem simples

### Os dois campos

| Campo | Definição | Uso |
|---|---|---|
| `Bill.simpleSummary` | O que o projeto trata, em linguagem de cidadão | Melhor candidato a `description` de SEO |
| `Bill.citizenImpact` | Como isso afeta a vida de quem lê | Segundo candidato |
| `Bill.keyPoints` | Pontos-chave (Json) | — |

**Origem atual (importante e frequentemente mal-entendida):** os resumos **não são
análise do conteúdo de cada proposição**. São gerados **por categoria temática**,
a partir de templates, por
`apps/pipeline/scripts/generate-bill-summaries.ts`. O próprio cabeçalho do script
é explícito:

> *"TRANSPARÊNCIA: os resumos são por CATEGORIA TEMÁTICA (template da tag), não
> análise do conteúdo individual de cada lei — o rótulo na UI deixa isso explícito.
> Quando houver LLM no pipeline, substitui este gerador."*

As 8 categorias com template são: `saude`, `educacao`, `seguranca`, `economia`,
`meio_ambiente`, `direitos_sociais`, `infraestrutura`, `administrativo`.

### Regras ao escrever ou revisar um template

1. **Nunca afirme o mérito do projeto.** O template descreve assunto e impacto
   possível, nunca se é bom ou ruim. Note o uso consistente de **"Pode afetar…"** /
   **"Pode impactar…"** em todos os `impact`.
2. **Nunca prometa resultado.** "Pode impactar", não "vai melhorar".
3. **A categoria é a declaração honesta do limite.** O rótulo na UI tem de deixar
   claro que o resumo é por tema, não uma análise daquele projeto específico. A
   implementação de referência está em `apps/web/src/components/BillDetails.tsx`,
   que exibe o resumo sob "📖 Resumo em Linguagem Simples" e acrescenta
   *"Resumo pela categoria temática do projeto (não é análise do texto…)"*. Não
   remova esse aviso.
4. **Atualizar template exige retomar a geração.** Após mudar
   `generate-bill-summaries.ts`, rode `npm run generate-summaries` (ou
   `seed:summaries`, o mesmo script). O script processa em lotes de 500 e só toca
   proposições taggeadas **sem** resumo — proposição já resumida não é
   reprocessada, então mudança de template **não** reescreve o que já existe.
5. **Não introduza juízo no resumo de segurança.** É a categoria com maior risco de
   escorregar para linguagem moral. O template atual fala de "policiamento",
   "combate ao crime" e "sistema penitenciário" **como temas**, o que é correto.

### `description` de metadata da proposição

`apps/web/src/app/projetos/[id]/page.tsx` monta a descrição nesta ordem de
preferência: `simpleSummary` → `citizenImpact` → `Situação: <status>`. E corta em
~155 caracteres **no limite de palavra** (`replace(/\s+\S*$/, "")`) para não
terminar no meio de uma palavra. Mantenha esse comportamento: descrição truncada
no meio lê como descuido.

## 5. Títulos de página

O layout define `title.template = "%s · Currículo Político"`
(`apps/web/src/app/layout.tsx`). Consequências:

1. **Página filha define apenas o título curto.** Não inclua "Currículo Político"
   no título da página — o resultado seria "Currículo Político · Currículo
   Político". Há teste de regressão em `tests/e2e/seo.spec.ts`.
2. **Título de perfil usa o nome político**, porque é o que a pessoa digita na
   busca. Formato atual: `"<Nome> — <Cargo> · <Partido>"`.
3. **Descrição de perfil é factual**: informa cargo, partido e a nota auditada,
   com o rótulo do Termômetro. Sem adjetivo sobre a pessoa.

## 6. Texto alternativo e rótulos acessíveis

Regra de conteúdo, não só de acessibilidade:

- Imagem de pessoa → o nome que o usuário veria na tela, não "foto de perfil".
- Imagem decorativa → `aria-hidden="true"` e `alt=""`, **sem** descrever o enfeite.
- Emoji de marca no header → `aria-hidden="true"` no emoji e `aria-label` no link
  (`layout.tsx` faz exatamente isso: `aria-label="Currículo Político — página
  inicial"`, para que o leitor de tela não anuncie o emoji).
- Nenhum componente novo pode ter `alt` vazio em imagem informativa nem
  `aria-label` genérico ("clique aqui", "saiba mais").

## 7. Copy de conversão (fronteira com design)

A estratégia de conversão — funil **Gancho → Promessa → Prova → CTA**, a dor
central do público e o registro do que foi removido da home — vive em
[`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md).
**Não é duplicada aqui**, para não criar duas fontes que divergem.

O que esta política acrescenta à copy: os limites de §1 (linguagem jurídica), §2
(neutralidade) e §3 (dados honestos). Uma copy que converte mais mas afirma algo
que o motor não faz está proibida — é defeito de credibilidade, não ganho de
marketing. Foi exatamente esse o caso do "IDIP v1.0" na home.

## 8. Checklist editorial antes de publicar texto

- [ ] Nenhuma ocorrência de "crime"/"criminoso"/"condenado" sem "transitada em
      julgado"
- [ ] Nenhum adjetivo avaliativo sobre pessoa, partido ou proposição
- [ ] Nenhum número exibido sem consulta real ao banco
- [ ] Nenhum zero usado como prova social
- [ ] Baseline neutro rotulado como baseline
- [ ] Versão da metodologia derivada de `lib/methodology.ts`, não redigitada
- [ ] Nenhuma sugestão de que a votação popular afeta a nota
- [ ] Nenhum dado fictício `seed-` visível
- [ ] Texto alternativo significativo em toda imagem informativa
- [ ] Descrição de metadata com ~150–160 caracteres, cortada em limite de palavra
- [ ] Título de página sem o sufixo "· Currículo Político"
- [ ] Nenhum texto afirmando estado de fonte externa que não tenha sido medido
      (ver T-05 em [`TASKS.md`](../03-development-process/TASKS.md))

## 9. Não verificado

- **Não foi verificado se todos os templates de resumo estão em uso.** O script
  mapeia 8 categorias; quais categorias realmente existem nas tags do banco não foi
  conferido (exigiria consultar o banco ou ler `tag-bills.ts` em detalhe).
- **Não há revisão editorial humana documentada** como etapa obrigatória do fluxo.
  As regras acima são verificadas por teste automatizado apenas na parte de SEO
  (`tests/e2e/seo.spec.ts`) e de consistência UI↔motor
  (`tests/e2e/home.spec.ts`). A parte jurídica da copy depende de revisão humana —
  e o projeto registra que a revisão jurídica humana de Termos, Privacidade e RIPD
  está pendente antes de campanha.
