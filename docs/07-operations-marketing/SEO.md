# SEO — Search Engine Optimization

O que está implementado, o que foi medido e o que falta. Toda afirmação aqui vem de
leitura do código em `apps/web/src` e dos testes em `tests/e2e/seo.spec.ts`.

> **A estratégia de conversão não está neste documento.** O funil
> Gancho → Promessa → Prova → CTA, a dor central do público e o registro do que foi
> removido da home vivem em
> [`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md). SEO
> aqui é **descoberta e indexação**; conversão é lá. Não duplique — os dois
> divergem.

Documentos vizinhos: [AEO.md](AEO.md), [AIO.md](AIO.md), [GEO.md](GEO.md)
(temas emergentes — leia o aviso de honestidade em cada um),
[PERFORMANCE.md](PERFORMANCE.md).

## 1. Estado do SEO: implementado, não planejado

Antes deste trabalho **não existia `robots.txt` nenhum** e nenhuma página tinha
`canonical`. Isso rendia 404 na rota mais consultada por crawlers e deixava o
comportamento de indexação ao acaso. O que existe hoje:

| Item | Arquivo | Estado |
|---|---|---|
| `metadataBase` + `title.template` + Open Graph + Twitter card | `apps/web/src/app/layout.tsx` | ✅ |
| `robots.txt` com diretiva `Sitemap` e `host` | `apps/web/src/app/robots.ts` | ✅ |
| Índice de sitemap (`sitemapindex`) | `apps/web/src/app/sitemap.xml/route.ts` | ✅ |
| Arquivos de sitemap (`urlset`) | `apps/web/src/app/sitemap/[id]/route.ts` | ✅ |
| Lógica de sitemap (fonte única) | `apps/web/src/lib/sitemap.ts` | ✅ |
| Favicon / ícone | `apps/web/src/app/icon.svg` | ✅ |
| Canonical + metadata por página | `generateMetadata` nas rotas dinâmicas; `export const metadata` nas estáticas | ✅ |
| Gate automatizado | `tests/e2e/seo.spec.ts` (9 casos) contra produção | ✅ |

A implementação está agrupada em três commits consecutivos: `77bd4df` (sitemap
index paginado, robots.txt, ícone e metadataBase), `11c56db` (metadata em todas as
rotas e canonical por página) e `5ee448f`.

## 2. `robots.txt`

`apps/web/src/app/robots.ts` gera a política. A postura é **permissiva por padrão**,
e a justificativa está no cabeçalho do arquivo: *"a plataforma existe para ser
encontrada (auditoria pública de dados), então a política é permissiva por padrão"*.

| Diretiva | Valor |
|---|---|
| `userAgent` | `*` |
| `allow` | `/` |
| `disallow` | `/conta`, `/auth/`, `/api/`, `/retificacao` |
| `sitemap` | `${SITE_URL}/sitemap.xml` |
| `host` | `${SITE_URL}` |

**Por que cada `disallow` existe:**

| Rota | Motivo (do próprio código) |
|---|---|
| `/conta` | área autenticada, conteúdo **por usuário**, sem valor de indexação |
| `/auth/` | fluxo de login |
| `/api/` | não é conteúdo; expor convida a crawl desnecessário |
| `/retificacao` | é um **formulário/fluxo**, não uma página de conteúdo |

Note que `/retificacao` está bloqueada apesar de `/retificacao` ser citado no
`README.md` como canal de direito de resposta. O bloqueio é sobre indexar o
formulário, não sobre existir — a página é alcançável e linkada do footer.

## 3. Sitemap: por que não é o caminho convencional do Next

Esta é a decisão técnica mais documentada do SEO do projeto, e vale entender porque
o resultado **parece** mais trabalhoso do que o habitual.

### O que foi tentado e falhou (registrado em `lib/sitemap.ts`)

A convenção do Next seria `src/app/sitemap.ts` com `generateSitemaps`. Foi tentado
e falhou de duas formas concretas, ambas verificadas no projeto:

1. O Next gera `/sitemap/0.xml`, `/sitemap/1.xml`, … mas **não gera
   `/sitemap.xml`**. Confirmado no `app-paths-manifest.json`: só existia
   `/sitemap/[__metadata_id__]/route`. Isso deixa o crawler **sem o ponto de entrada
   padrão do protocolo**.
2. Tentando resolver com um Route Handler em `app/sitemap.xml/route.ts`, o
   `/sitemap.xml` continuou servindo o **urlset** do `sitemap.ts` (id 0): o arquivo
   de metadata tem **precedência** na rota e o handler era ignorado.

### A solução adotada

**Controlar o XML inteiro**, em vez de depender da precedência do framework:

```
/sitemap.xml          → sitemapindex (índice), gerado por route handler
/sitemap/0.xml        → urlset do arquivo base
/sitemap/1.xml … N.xml → urlset de blocos de proposições
```

É mais código, mas o resultado é **o que o protocolo define** e o comportamento é
**verificável por teste**.

### Composição dos arquivos

| Arquivo | Conteúdo |
|---|---|
| `/sitemap/0.xml` | 19 rotas estáticas + **1 entrada por pessoa** (`/politicos/{id}`) + **1 por partido** (`/partidos/{sigla}`, com `encodeURIComponent`) |
| `/sitemap/1.xml` … `/sitemap/N.xml` | blocos de **4.000** proposições cada (`PROPOSICOES_POR_ARQUIVO = 4_000`), `orderBy: id asc`, `skip/take` |

**Volumetria medida:** ~**32.450 URLs** em **9 arquivos** — 1 base com estáticas +
**594 perfis** + **22 partidos**, e 8 arquivos de proposições com 4.000 cada.

O `4.000` mantém cada XML **bem abaixo do limite de 50.000 URLs** do protocolo —
margem de 12×, deliberada.

### As rotas estáticas, na ordem de prioridade de negócio

| Rota | `priority` | `changefreq` |
|---|---|---|
| `/` | 1.0 | daily |
| `/ranking` | 0.9 | daily |
| `/projetos` | 0.8 | daily |
| `/partidos` | 0.8 | weekly |
| `/metodologia` | 0.8 | monthly |
| `/comparar` | 0.7 | weekly |
| `/como-funciona` | 0.7 | monthly |
| `/ranking/personalizado` | 0.6 | weekly |
| `/stf` | 0.6 | weekly |
| `/historia` | 0.6 | monthly |
| `/calendario-eleitoral` | 0.6 | weekly |
| `/faq` | 0.6 | monthly |
| `/sobre` | 0.5 | monthly |
| `/apoie` | 0.4 | monthly |
| `/contato` | 0.3 | yearly |
| `/termos-de-uso`, `/privacidade`, `/lgpd`, `/cookies` | 0.2 | yearly |

O comentário no código explica a ordem: *"A ordem reflete prioridade de negócio: o
ranking é onde a promessa da home se entrega."*

**`/politicos` não está na lista, de propósito.** Essa rota de **lista não existe** —
só `/politicos/[id]`. Anunciá-la apontaria o crawler para um **404**. Esse é o tipo
de erro silencioso que degrada a confiança do crawler no sitemap inteiro.

### Detalhes que evitam armadilhas

- **`externalId ?? id` na URL das proposições.** A rota de projeto aceita os dois
  identificadores; usar o mesmo critério dos links da interface evita anunciar uma
  **URL duplicada**.
- **Arquivo de proposições vazio ⇒ 404, não XML vazio.** O código é explícito:
  *"um sitemap vazio declarado é pior que ausente: o crawler marca como válido e
  para de procurar"*. O arquivo `0` nunca é vazio (sempre tem as estáticas).
- **O índice e os arquivos saem da mesma fonte** (`calcularIds()`). É
  **impossível** o índice anunciar um arquivo que não existe.
- **`lastmod` das proposições usa a data da própria proposição** (`b.date`), não a
  data de geração — o que é semanticamente correto.
- **Cache de borda:** `Cache-Control: public, max-age=0, s-maxage=3600,
  stale-while-revalidate=86400`. O sitemap muda pouco e é caro de montar (varre o
  catálogo); vale revalidação em segundo plano.

### Contrato de falha do sitemap

O sitemap **não pode depender do banco** — é o mesmo contrato de
`lib/hero-stats.ts` (ver [ERROR_HANDLING.md](ERROR_HANDLING.md) §3):

| Falha | Comportamento |
|---|---|
| `prisma.bill.count()` falha | `console.warn` e gera **apenas o arquivo base** (`paginas = 1`) |
| `person`/`party` falham | `console.warn` e devolve **apenas as rotas estáticas** |
| `bill.findMany` de um bloco falha | `console.warn` e devolve array vazio |
| `DATABASE_URL` ausente no build | Índice e arquivo base **ainda saem** |

Ou seja: **o sitemap degrada, não quebra.** Um sitemap parcial é recuperável no
próximo crawl; um 500 é um sinal de saúde ruim para o buscador.

## 4. `metadataBase`, canonical e o problema de preview

`apps/web/src/app/layout.tsx`:

```ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  ?? "https://www.curriculopolitico.org";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Currículo Político — Transparência Política com Dados Públicos",
    template: "%s · Currículo Político",
  },
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "pt_BR", siteName: "Currículo Político", url: "/", ... },
  twitter: { card: "summary_large_image", ... },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  category: "politics",
};
```

**`metadataBase` é o que permite ao Next resolver URLs relativas** em
`alternates.canonical`, `openGraph.url` e imagens. Sem ele, o Next emite caminhos
relativos e o crawler não consegue montar a URL absoluta. Estava ausente — **nenhuma
página tinha canonical**.

**Por que lê de variável de ambiente:** para que previews da Vercel e `localhost`
**não** declarem canonical apontando para produção. Sem isso, o buscador
canonicalizaria o preview como se fosse o site real — efetivamente removendo o
preview do índice em favor da produção (ou pior, o contrário).

**Ação para quem trabalha em preview:** defina `NEXT_PUBLIC_SITE_URL` no ambiente de
preview. Caso contrário, o default de produção é usado.

### Títulos de página

O template `"%s · Currículo Político"` significa que **a página filha define apenas
o título curto**. Há teste de regressão específico para isso: se a home trouxer
"Currículo Político" no próprio título, o resultado seria "Currículo Político ·
Currículo Político" — e o teste conta as ocorrências e exige `<= 1`.

### Canonical nas rotas dinâmicas

As três rotas de detalhe declaram `alternates: { canonical: ... }` no
`generateMetadata`:

| Rota | Canonical |
|---|---|
| `/politicos/[id]` | `/politicos/${id}` |
| `/projetos/[id]` | `/projetos/${id}` |
| `/partidos/[acronym]` | (verificado no arquivo) |

## 5. Metadata por tipo de página

| Página | Estratégia | Fonte |
|---|---|---|
| Home | Título de marca + descrição com o IDIP e as fontes | `layout.tsx` (default) |
| Perfil de político | **Título = nome político** (é o que a pessoa digita na busca) + cargo · partido. Descrição **factual**: cargo, partido e a nota auditada com o rótulo do Termômetro. **Sem adjetivo sobre a pessoa** | `generateMetadata` em `/politicos/[id]` |
| Proposição | **Título = título da proposição.** Descrição prioriza `simpleSummary` → `citizenImpact` → `Situação: <status>`, cortada em ~155 caracteres **no limite de palavra** | `generateMetadata` em `/projetos/[id]` |
| Partido | `generateMetadata` por sigla | `/partidos/[acronym]` |
| Páginas institucionais e de lista | `export const metadata` estático | 17 arquivos em `apps/web/src/app` |

O comentário de `/politicos/[id]` registra a decisão: *"A descrição é factual:
informa cargo, partido e a nota auditada, sem adjetivo sobre a pessoa — a plataforma
descreve estado, não emite juízo (ver AGENTS.md, regras de neutralidade)."* Isso é
[política editorial](../04-api-integrations/CONTENT.md), não tática de SEO — mas o
resultado em SEO é bom por consequência: descrição com dado concreto performa melhor
que adjetivo vazio.

O comentário de `/projetos/[id]` registra por que o resumo em linguagem simples é
preferido: *"é o texto escrito para o cidadão entender, então é o melhor candidato a
aparecer num resultado de busca."*

## 6. Gate automatizado: `tests/e2e/seo.spec.ts`

**9 casos**, todos `@readonly`, portanto rodam **contra produção** via
`.github/workflows/a11y.yml`. O cabeçalho do arquivo explica a razão de existir:
SEO é fácil de quebrar em silêncio — um sitemap que deixa de ser gerado, um canonical
que some — e ninguém percebe até o tráfego cair.

| Caso | O que verifica |
|---|---|
| `robots.txt` existe e aponta para o índice | Status 200; `Sitemap: .../sitemap.xml` (o **índice**, não os arquivos internos); `Allow: /`; `Disallow: /conta`; `Disallow: /api/` |
| `sitemap.xml` é um índice válido | Status 200; `content-type` contém `xml`; contém `<sitemapindex` e **não** contém `<urlset`; todo `<loc>` casa com `/sitemap/\d+\.xml$` |
| Arquivo base traz home, ranking e um perfil | Contém `<urlset`; tem a home; tem `/ranking`; tem ao menos um `/politicos/...` e um `/partidos/...` |
| Arquivo de proposições traz **apenas** projetos | Todo `<loc>` contém `/projetos/` — se contivesse perfil, a paginação teria misturado os grupos e haveria **conteúdo duplicado** entre arquivos |
| Sitemap fora da faixa devolve 404 | `/sitemap/99999.xml` → 404, e **não** um XML vazio |
| Existe favicon/ícone | `/icon.svg` → 200 com `content-type` SVG |
| Home declara canonical e Open Graph | `link[rel=canonical]` existe e é URL absoluta (`^https?://`); `og:title` existe; `og:locale` = `pt_BR` |
| Título da home não duplica o sufixo | Contagem de "Currículo Político" no título `<= 1` |
| Marca no header volta para a home | Link com `aria-label` correto, `href="/"`, clique leva a `/` com `h1` único |

**Por que isso é um gate e não uma checagem manual:** o terceiro caso (o arquivo de
proposições não pode conter perfis) detecta um bug de paginação que **não** aparece
em nenhum teste unitário nem no `typecheck` — ele só aparece quando o sitemap é
gerado com o banco real.

## 7. O que **não** está implementado

| Item | Situação | Impacto |
|---|---|---|
| **Dados estruturados JSON-LD** | ❌ Nenhum. Busca por `application/ld+json`, `schema.org` e `jsonLd` em todo `apps/web/src` retorna **zero** ocorrências | Perda de rich results e de elegibilidade em answer engines — ver [AEO.md](AEO.md) |
| **Imagens Open Graph dedicadas** | ⚠️ `openGraph` não declara `images`. A `twitter.card` é `summary_large_image` sem imagem declarada | Compartilhamento social sem card visual |
| **`hreflang`** | ❌ Não existe — o produto é monolíngue (pt-BR) | Sem impacto hoje |
| **Feed RSS/Atom** | ❌ Não existe | Descoberta de atualizações depende do sitemap |
| **Submissão ao Search Console / Bing** | ⛔ **não verificável pelo repositório.** Não há arquivo de verificação nem registro de submissão | Sem dados de indexação, cobertura ou erros de crawl |
| **Monitoramento de posição / tráfego orgânico** | ❌ Não existe nenhuma ferramenta de analytics no repositório — ver [ANALYTICS.md](ANALYTICS.md) | Não se sabe se o SEO funciona |
| **Sitemap de imagens / de vídeo** | ❌ Não existe (não há vídeo no produto) | Sem impacto |
| **Paginação canônica em `/ranking`** | ⚠️ `/ranking` tem `PAGE_SIZE = 100` com paginação visível. **Não verificado** se as páginas 2+ declaram canonical para si mesmas ou para a página 1 | Possível conteúdo duplicado, **não confirmado** |
| **`lastmod` confiável nas estáticas** | ⚠️ Usa `new Date()` na geração (data do request), não data real de modificação | Crawler pode perder confiança no `lastmod` |
| **Teste de `og:image`, `hreflang`, JSON-LD** | ❌ Nenhum | — |

### A lacuna que mais importa

**Não há como saber se o SEO está funcionando.** Sem analytics e sem Search Console,
o projeto tem um gate que garante que os **artefatos** (robots, sitemap, canonical,
metadata) estão corretos — e nenhum sinal sobre **resultado** (impressões, cliques,
posição, cobertura de índice). É uma distinção importante: o que existe é
conformidade técnica, não desempenho de busca.

Ver [ANALYTICS.md](ANALYTICS.md) para o que falta e o que seria necessário.

## 8. Regras ao mexer em SEO

1. **O índice e os arquivos saem da mesma função.** Nunca gere a lista de arquivos
   em outro lugar — `calcularIds()` é a fonte única.
2. **Nunca anuncie uma rota que não existe.** `/politicos` é o exemplo: a rota de
   lista não existe. Antes de adicionar entrada no sitemap, confirme que a rota
   responde 200.
3. **Sitemap vazio para id inexistente é 404**, não `<urlset>` sem `<url>`.
4. **Página filha define título curto.** O sufixo vem do template.
5. **Toda rota nova com conteúdo precisa de canonical.** `alternates: { canonical:
   "<caminho absoluto a partir da raiz>" }`.
6. **Não coloque `noindex`** sem justificativa: a plataforma existe para ser
   encontrada.
7. **Ao mexer no sitemap, rode `npm run e2e`** — os 9 casos de `seo.spec.ts` pegam
   regressão de índice, de paginação e de canonical.
8. **Descrição com dado factual, não adjetivo.** Vale para SEO e é obrigatório por
   [CONTENT.md](../04-api-integrations/CONTENT.md).

## 9. Não verificado

- **Posição em buscadores, volume de impressões e cliques:** nenhum dado existe no
  repositório e não há ferramenta para obtê-lo.
- **Se o site está submetido ao Google Search Console ou ao Bing Webmaster Tools:**
  não há evidência no repositório (sem arquivo de verificação, sem registro em
  documentação).
- **Se o Google descobriu e indexou as ~32.450 URLs:** não verificável daqui.
- **Se `/sitemap/N.xml` com N alto responde dentro do tempo limite do crawler:**
  o arquivo com 4.000 entradas gera um XML substancial; **não foi medido** o tempo de
  resposta de um bloco de proposições em produção.
- **Números de volumetria** (~32.450 URLs, 9 arquivos, 594 perfis, 22 partidos) vêm
  de medição anterior registrada no projeto, não de contagem nova nesta
  documentação.
