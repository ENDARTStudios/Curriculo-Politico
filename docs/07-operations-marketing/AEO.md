# AEO — Answer Engine Optimization

> ## Aviso de escopo e honestidade
>
> **Este documento descreve uma disciplina emergente, não uma prática consolidada
> deste projeto.** Não existe padrão publicado, especificação ou conjunto de
> métricas aceito para "AEO". O que existe é: (a) fatos verificáveis sobre o
> comportamento de indexação e de extração de trechos, (b) o que este repositório
> **já** faz que se aplica, e (c) trabalho futuro plausível.
>
> Onde uma afirmação não pôde ser verificada no repositório, está escrito **não
> verificado**. **Nenhuma métrica de resultado é apresentada** — não há nenhuma
> medida de AEO neste projeto, e inventar uma seria pior que não ter nenhuma.

Documentos relacionados: [SEO.md](SEO.md) (o que está implementado e medido),
[AIO.md](AIO.md), [GEO.md](GEO.md), [ANALYTICS.md](ANALYTICS.md) (por que não há
métricas).

## 1. O que "answer engine" quer dizer aqui

Distinção que evita confusão com [GEO.md](GEO.md):

| Termo | Pergunta que responde |
|---|---|
| **SEO** ([SEO.md](SEO.md)) | O buscador **indexa** minha página? |
| **AEO** (aqui) | Meu conteúdo é **extraído como resposta** — snippet destacado, painel de resposta, caixa de "resposta rápida"? |
| **GEO** ([GEO.md](GEO.md)) | Um **modelo generativo** me **cita** como fonte na resposta que ele compõe? |

AEO é sobre **ser o trecho escolhido**. O mecanismo subjacente mais bem documentado
e mais antigo é o *featured snippet* do Google, que existe desde ~2014 — muito antes
de qualquer discussão sobre IA. O que mudou recentemente é a interface: respostas
geradas passaram a consumir os mesmos trechos.

**Consequência prática:** AEO não exige uma técnica nova. Exige que a página tenha um
trecho curto, autossuficiente e factual que responda a uma pergunta real. É a mesma
coisa que já se chama de boa redação de conteúdo.

## 2. Por que este projeto **se aplica** a AEO

Diferente de [AIO.md](AIO.md) e [GEO.md](GEO.md), onde a resposta é "parcialmente", a
resposta aqui é **sim, e o projeto tem vantagem estrutural**. Três razões concretas:

1. **O conteúdo é factual por obrigação.** A política editorial proíbe adjetivo
   avaliativo sobre pessoas ([CONTENT.md](../04-api-integrations/CONTENT.md) §2). Um
   trecho que afirma "Deputado X é do partido Y e tem nota IDIP 72,4 (Confiável)" é
   exatamente o tipo de afirmação extraível — e é o que a plataforma produz por
   regra, não por tática.
2. **As páginas são respostas a perguntas reais.** `/politicos/[id]` responde "quem
   é e o que fez esse político". `/projetos/[id]` responde "o que essa proposta
   muda na minha vida" (`citizenImpact`). `/metodologia` responde "como essa nota é
   calculada".
3. **A plataforma é citável por natureza.** Auditoria pública de dados é fonte
   primária de um cálculo — não comentário sobre fato de terceiro.

## 3. O que o projeto já faz que conta como AEO

**Nada aqui foi implementado com o rótulo "AEO".** São recursos que existem por
outras razões e que se aplicam.

| O que existe | Onde | Por que conta para AEO |
|---|---|---|
| **`description` factual com dado concreto** | `generateMetadata` em `/politicos/[id]`: cargo · partido · nota · rótulo do Termômetro | Descrição com número e estado é candidata direta a trecho. Adjetivo não é |
| **`h1` único por página, com hierarquia correta** | Testado em todas as rotas críticas (`tests/e2e/home.spec.ts`) | O `h1` é a âncora de "sobre o que é esta página". Um por página, sempre |
| **HTML renderizado no servidor** | Next.js App Router com Server Components; 9 das 11 rotas de API e as rotas de dados são `force-dynamic`, mas o **HTML sai pronto** | O conteúdo está no HTML entregue, não montado por JS no cliente. Sem isso, extração é frágil |
| **Sitemap completo e verificável** | `/sitemap.xml` + 9 arquivos (~32.450 URLs) | Descoberta das ~594 páginas de perfil e das ~32 mil de proposição |
| **`robots.txt` permissivo** | `allow: "/"` | Nenhum bloqueio a crawler de indexação |
| **Canonical absoluto em toda página** | `metadataBase` + `alternates.canonical` | Evita que a variante de preview/perfil duplicado dilua a escolha do trecho |
| **Texto em português, linguagem direta** | `simpleSummary` + `citizenImpact` em `Bill` | Um resumo escrito "para o cidadão entender" é, por definição, extraível |
| **Aviso de origem do resumo** | `BillDetails.tsx`: *"Resumo pela categoria temática do projeto (não é análise do texto…)"* | Honestidade sobre o limite do dado — reduz o risco de o trecho ser citado como se fosse análise da lei |

## 4. O que **falta** e é verificável que falta

| Lacuna | Verificação | Impacto em AEO |
|---|---|---|
| **Zero dados estruturados** | Busca por `application/ld\+json`, `schema.org` e `jsonLd` em todo `apps/web/src`: **nenhuma ocorrência** | Alto. `FAQPage`, `Dataset`, `Person`/`Organization` e `BreadcrumbList` são o vocabulário que motores usam para entender o que a página **é** — não só o que ela diz |
| **Sem FAQ marcado** | Existe `/faq` (a página existe e está no sitemap), mas **sem marcação** de pergunta/resposta | A página de FAQ é o ativo de AEO mais óbvio do projeto e não está marcada |
| **As respostas do FAQ não estão no HTML inicial** | `apps/web/src/app/faq/page.tsx` é `"use client"` e renderiza a resposta sob `{openIndex === i && (...)}` — accordion fechado por padrão. **Medido por leitura do código**, não por requisição. O `h1` da página, por outro lado, existe | As **perguntas** estão no HTML; as **respostas** só existem depois de interação. Extração de trecho não interage — é a lacuna mais concreta deste documento |
| **Sem `llms.txt`** | Arquivo ausente do repositório. `apps/web/public/` contém apenas `avatar-placeholder.svg` | Ver [AIO.md](AIO.md) §4 |
| **Sem `og:image`** | `openGraph` em `layout.tsx` não declara `images`; `twitter.card` é `summary_large_image` **sem imagem** | Não afeta extração de texto; afeta apresentação em compartilhamento |
| **Sem métrica de resultado** | Sem analytics, sem Search Console ([ANALYTICS.md](ANALYTICS.md)) | **Não se sabe** se algum trecho foi extraído |

## 5. Trabalho que se justifica hoje

Em ordem de relação ganho/risco. Tudo isto serve a SEO **e** a AEO — não é trabalho
específico de uma disciplina emergente.

### 5.1 Marcar o FAQ com `FAQPage` (maior ganho, menor custo)

É o item com melhor retorno do documento: a página existe, o conteúdo é factual, e a
marcação é pequena e estável. Requer:

1. Resolver primeiro o **problema estrutural**: `apps/web/src/app/faq/page.tsx` é
   `"use client"` e só renderiza a resposta quando o item está aberto
   (`{openIndex === i && (...)}`). Resposta que não está no HTML não é extraível.
   A correção é renderizar **pergunta e resposta sempre no DOM**, e usar
   `openIndex` apenas para controlar visibilidade por CSS/atributo
   (`hidden`, `aria-expanded`, `max-height`). O texto passa a existir para
   qualquer consumidor que não interage.
2. Extrair perguntas e respostas para uma estrutura de dados única. Hoje o array
   `FAQS` guarda `resposta: React.ReactNode` — JSX não é serializável para JSON-LD.
   Seria necessário um campo textual paralelo, ou reescrever as respostas como
   string e renderizar.
3. Emitir `<script type="application/ld+json">` com `@type: "FAQPage"`. Como a rota
   é Client Component, isso provavelmente exige mover a marcação para o
   `layout.tsx` da rota (que hoje só carrega a metadata) ou converter a página em
   Server Component com um componente cliente isolado para o accordion.
4. Adicionar caso em `tests/e2e/seo.spec.ts` verificando que o JSON-LD existe, é
   JSON válido, e que o **texto das respostas aparece no HTML** — este último é o
   teste que impede a regressão do item 1.

**Cuidado:** a marcação precisa corresponder ao conteúdo **visível** na página.
Marcar perguntas que não estão na tela é *spam* de dados estruturados. Note que o
item 1 é exatamente o que torna a marcação legítima **e** útil.

### 5.2 `BreadcrumbList` nas rotas de detalhe

Perfis e proposições não têm breadcrumb hoje (**não verificado** se há breadcrumb
visual; a marcação certamente não existe). Marcar a hierarquia ajuda o motor a
entender que `/politicos/{id}` é um item de um conjunto.

Atenção: **`/politicos` não existe como rota de lista** — a trilha seria
`Início > Perfil`, sem nível intermediário. Não invente uma URL intermediária só
para a trilha.

### 5.3 Um bloco de resposta curta e autossuficiente em cada tipo de página

O padrão de trecho extraível: **2–3 frases, começo autossuficiente, com o sujeito
nomeado e o dado concreto.** Hoje a `description` faz isso, mas ela é metadata —
não é texto visível que o motor possa destacar como trecho.

Exemplo do formato, sem inventar dado novo (tudo já vem do banco):

> **[Nome político]** é **[cargo]** por **[UF]**, filiado a **[partido]**. A nota IDIP
> auditada é **72,4 de 100**, estado **Confiável**, calculada a partir de dados
> públicos da Câmara, do Senado e do TSE. Metodologia **v1.1**, aberta em
> [/metodologia].

Isso é uma **resposta**, não uma promoção. É exatamente o que a plataforma já sabe
produzir e o que a política editorial permite.

### 5.4 `Dataset` na metodologia

`/metodologia` descreve pesos, versão e fórmula de um cálculo sobre dados públicos.
`@type: "Dataset"` com `license`, `creator` e `version` é um encaixe direto — e a
licença já existe e é explícita no `README.md`: código AGPL-3.0-only, documentação
CC BY 4.0.

## 6. O que **não** se deve fazer

1. **Não inventar métrica.** Não há como medir "AEO" aqui. Qualquer número de
   "citação em answer engine" seria ficção.
2. **Não escrever para o robô.** Texto empilhado de palavras-chave quebra a regra de
   neutralidade e degrada a leitura humana — a única métrica que existe hoje é
   julgamento humano.
3. **Não marcar dado que não está visível.** §5.1.
4. **Não prometer resultado ao time.** Marcação correta **elegibiliza**; não
   **garante** exibição. Nenhuma das lacunas deste documento é um bug.
5. **Não tratar AEO como prioridade acima de T-01/T-02.** A maior fragilidade do
   produto em matéria de "ser citável" é a dimensão **Integridade em baseline neutro
   50** por ausência de `LegalRecord` (T-01 em
   [`TASKS.md`](../03-development-process/TASKS.md)). Marcar FAQ enquanto a nota não
   tem dado de integridade é otimizar a apresentação de um dado incompleto.

## 7. Não verificado

- Se este projeto aparece hoje em qualquer *featured snippet* ou painel de resposta.
- Se algum motor de resposta citou `curriculopolitico.org` como fonte — não há
  analytics nem monitoramento de menções.
- Se o `/faq` tem estrutura de perguntas e respostas extraível no formato atual — o
  arquivo **foi lido** para verificar o accordion descrito em §5.1, mas **não foi
  feita requisição HTTP** para confirmar o que realmente chega no HTML servido em
  produção. A conclusão é por leitura do código (`"use client"` + renderização
  condicional), que é forte mas não é a mesma coisa que ter medido.
- Quantas perguntas o FAQ tem e se alguma resposta depende de componente com
  interação própria.
- Se há breadcrumb **visual** em alguma página do produto.
- Qualquer afirmação sobre algoritmos de motores de busca: comportamento de
  extração não é documentado de forma estável por nenhum fornecedor.
