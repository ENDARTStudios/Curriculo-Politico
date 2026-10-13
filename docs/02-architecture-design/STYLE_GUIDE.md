# STYLE_GUIDE — convenções de código, dados e commits

Convenções **observadas no repositório** e as que são exigidas por
`AGENTS.md` e `CONTRIBUTING.md`. Onde a convenção é verificável por ferramenta,
o comando está indicado.

## 1. Linguagem e tipografia de código

| Item | Convenção | Evidência |
|---|---|---|
| **Comentários e mensagens ao usuário** | **Português do Brasil** | Todo o repositório: `scoring.ts`, `middleware.ts`, `sitemap.ts`, mensagens de API ("Faça login para votar", "Contas com menos de 24 horas ainda não podem votar") |
| **Identificadores de código** | **Inglês** para o domínio (`politicalName`, `finalScore`, `confidenceScore`, `hasFinalCondemnation`) | `schema.prisma`, `scoring.ts` |
| **Identificadores em português** | Aceitos onde o domínio é local: helpers de UI (`carregarNumerosHero`, `chaveDiaSnapshot`, `mesAnoSnapshot`), variáveis de laço (`pessoas`, `distribuicao`, `baldes`), constantes de site (`CABEÇALHO_XML`, `PROPOSICOES_POR_ARQUIVO`) | `hero-stats.ts`, `snapshot.ts`, `sitemap.ts`, `middleware.ts` |
| **Erros e códigos de API** | Código em `SCREAMING_SNAKE` + mensagem em português | `RATE_LIMITED`, `BANCO_INDISPONIVEL`, `CARGO_INVALIDO`, `CONSENT_REQUIRED`, `ACCOUNT_TOO_NEW`, `POLITICO_NAO_ENCONTRADO`, `IDS_OBRIGATORIO` |
| **Nomes de model Prisma** | PascalCase singular | `Person`, `Score`, `LegalRecord` |
| **Enums** | PascalCase no tipo, `SCREAMING_SNAKE` nos valores | `ReliabilityStatus.GREEN`, `CostCategory.OTHER_BENEFITS` |

**Exceção histórica que não deve ser "corrigida":** `RetificationRequest` está com
grafia não idiomática (deveria ser "Rectification"). É o nome real no schema;
corrigir exige migration e renomear todas as referências.

## 2. TypeScript

| Regra | Detalhe |
|---|---|
| **Estrito, zero erros** | `npm run typecheck` (`tsc --noEmit`) é gate de CI. "Zero erros é obrigatório" (`CONTRIBUTING.md`) |
| **Sem `any` explícito** | Não há `any` no código de aplicação. Onde o dado externo é livre, usa-se `unknown`/tipo de união ou `Record<string, number>` com cast justificado (ex.: `metrics as unknown as Record<string, number>` em `scoring.ts`) |
| **Funções de motor são puras** | `packages/idip` não faz I/O, não importa Prisma, não faz fetch. É o que permite os verificadores rodarem no CI sem infraestrutura |
| **Validação que lança, não silencia** | `assertMetric` lança em `NaN` ou fora de 0–100; a soma dos pesos lança na carga do módulo |
| **Tipos de saída explícitos** | `ScoreResult`, `MatchResult`, `NumerosHero` — os motores publicam interfaces, não objetos anônimos |
| **Uniões fechadas em vez de `string`** | `ChaveDimensao` em `methodology.ts` é union literal **de propósito**: permite que o teste WEB-001 leia o valor sem cast. O comentário no código explica isso |
| **`const` no topo do módulo** | `WEIGHTS`, `HARD_CAP`, `PAGE_SIZE`, `JANELA_MS`, `TIER_GERAL`, `STATUS_VISUAL`, `NAV_LINKS` |

## 3. Comentários — o padrão mais característico do projeto

O estilo deste repositório é **comentário que registra o porquê e a evidência**,
não o que. Os comentários bons aqui respondem "por que não foi feito do jeito
óbvio?" e citam número medido, commit, erro ou teste.

### 3.1 O que um comentário precisa conter

| Situação | O que o comentário deve ter |
|---|---|
| **Decisão contra o óbvio** | O motivo + o que foi tentado antes + o resultado medido |
| **Limitação conhecida** | Que existe, qual o impacto, onde está rastreada |
| **Número mágico** | De onde veio (medido, calculado, exigido por norma) |
| **Divergência aceita** | Por que é aceita e o que a fecha |
| **Exceção deliberada** | A palavra "DELIBERADA" e a razão (ex.: `oversized-h1` da hero) |

### 3.2 Exemplos reais que servem de modelo

- **Limitação declarada dentro do próprio código** — `middleware.ts`:
  *"Nota serverless: os baldes são em memória, por instância — o limite vale 'por
  instância-visita'. A proteção completa e distribuída por IP vem do
  Cloudflare/WAF na frente do deploy."*
- **Diagnóstico registrado** — `sitemap.ts` documenta as **duas** tentativas que
  falharam (`generateSitemaps` não gera `/sitemap.xml`; o arquivo de metadata tem
  precedência sobre o Route Handler) e aponta a evidência
  (`app-paths-manifest.json`).
- **Defeito histórico como aviso** — `methodology.ts`: *"Isto já aconteceu: a home
  exibia 'IDIP v1.0' com Produção 20% e Custo/Benefício 5% enquanto o motor já
  rodava v1.1."*
- **Número medido** — `globals.css`: *"Medido: 44 links em 24 arquivos eram
  afetados"*; *"`sky-400` (#00bcff) sobre `slate-400` (#90a1b9) dá 1.2:1"*.
- **Exceção marcada** — `page.tsx`: *"É uma exceção DELIBERADA, não um descuido…
  Registrado aqui para que ninguém 'conserte' isto sem saber que foi uma decisão."*

### 3.3 O que **não** fazer

- Comentário que repete o código (`// incrementa i`).
- Comentário que descreve o que o nome do arquivo já diz.
- `TODO` sem referência. O projeto prefere apontar o item do roadmap ou o arquivo
  onde a lacuna está rastreada.

## 4. Estilo de UI (resumo; detalhe em `DESIGN.md`)

Detalhamento completo em [DESIGN.md](DESIGN.md) e na skill
`.dsh/skills/curriculo-design-system`. O essencial para escrever código:

1. Tema **dark fixo** — `bg-slate-950` no `<body>`. Nunca assuma variante light.
2. **`text-slate-400` é o piso de texto de apoio.** `text-slate-500` é proibido
   para texto (4,23:1 sobre `slate-950`, reprova em AA).
3. **Botão primário:** `bg-sky-500 text-slate-950` — **nunca** `text-white`
   (2,71:1).
4. **Card:** `border border-slate-800 bg-slate-900/60`; raio `rounded-xl`.
5. **Cor de estado só vem de `status-visual.ts`.** Nunca escreva
   `text-emerald-400` para "confiável" inline.
6. **Um CTA primário por seção.**
7. Alvo de toque ≥ 44px; `aria-hidden="true"` em emoji decorativo; `alt=""` em
   imagem decorativa.
8. Sem webfont e sem biblioteca de animação (CSS + Tailwind resolvem).

## 5. Acessibilidade no código

Não é etapa final, é requisito de escrita:

- Hierarquia de headings: **um `<h1>` por página**, sem pular níveis. Verificado
  por `tests/e2e/home.spec.ts` nas rotas críticas.
- Rolagem horizontal precisa de `tabIndex={0}` + `role` + rótulo — sem isso, quem
  não usa mouse perde o conteúdo. Exemplo modelo em
  `metodologia/page.tsx` (a fórmula de confiança é uma região rolável com
  `aria-label`), motivado pelo `scrollable-region-focusable` do axe.
- Foco visível: **nunca remova outline**. Customização com
  `focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`.
- Nada clicável em `<div>`: use `<a>`, `<button>` ou `<Link>`.
- `prefers-reduced-motion`: use `motion-safe:` ou `motion-reduce:animate-none` —
  além da regra global em `globals.css`.
- A tag do axe é **`wcag22aa`**. Incluir apenas `wcag2a/2aa/21a/21aa` audita
  WCAG **2.1**, não 2.2, e dá falsa conformidade.

## 6. Estrutura de arquivos

```
apps/web/src/
├── app/            rotas (App Router) + route handlers
│   ├── api/        Route Handlers (/api/*)
│   └── <rota>/     page.tsx (+ layout.tsx quando necessário)
├── components/     componentes reutilizáveis (client e server)
├── lib/            lógica sem JSX: prisma, auth, consent, methodology,
│                   hero-stats, sitemap, snapshot, status-visual, affinity, export
└── instrumentation*.ts

apps/pipeline/
├── etl/            Python: só coleta, grava em data/raw/
└── scripts/        TS: load-*, recalculate, apply-*, snapshot, seed-*, verify-*

packages/idip/src/  scoring.ts, identity.ts (motores puros)
```

Regras derivadas:

- **Componente** é o que renderiza JSX; **lib** é o que calcula, consulta ou
  formata. Um cálculo em componente deve ser extraído para `lib/` — foi o que se
  fez com `status-visual.ts` (antes duplicado em `Termometro.tsx` e na home, o que
  permitia os dois divergirem em silêncio).
- **Client Component** exige `"use client"` e justificativa de interatividade. A
  maioria das páginas é Server Component.
- **Nada de regra de negócio na UI.** Pesos vêm de `methodology.ts`; corte de
  confiança vem do motor; se um número depende de decisão de produto, ele tem um
  lugar canônico.

## 7. Banco de dados e migrations

| Regra | Detalhe |
|---|---|
| **Schema é fonte única** | `apps/web/prisma/schema.prisma`. Migration para qualquer mudança |
| **Idempotência por id determinístico** | Cargas usam ids compostos previsíveis (`score_{termId}_v1`, `tcu_{personId}_{processo}`) para que `upsert` não precise de leitura prévia |
| **`createMany` em chunks, nunca upsert sequencial** | Lento no pooler (`apps/pipeline/README.md`) |
| **Mudança de dimensão exige** `recalculate-scores` **e** `db:snapshot` | Idem |
| **`DATABASE_URL` manda em tudo** | Todo script grava no banco que ela apontar, inclusive produção. Salvaguarda: `db:seed` recusa banco remoto sem `CP_ALLOW_REMOTE_SEED=1` |
| **`DIRECT_URL` para migrate** | `prisma migrate` não funciona em transaction mode (6543) |
| **Nunca exponha CPF/endereço/dado familiar** | `Person` não tem esses campos. Se um dia precisar casar por CPF, é **hash com salt**, nunca em claro |
| **Toda fonte externa carrega `sourceUrl` + `retrievedAt`** | Padrão em `LegalRecord`, `CampaignFinance`, `PatrimonyHistory`, `PoliticianCost`, `VerifiedClaim`, `MunicipalExpense` |

## 8. Commit e PR

| Regra | Valor |
|---|---|
| **Idioma da mensagem** | Português, imperativo (`CONTRIBUTING.md`) |
| **Formato** | Conventional Commits com escopo: `feat:`, `fix:`, `docs:`, `chore:` |
| **Exemplos reais do histórico** | `feat(home): card do Judiciário, metadata própria e marca clicável` · `feat(seo): metadata em todas as rotas e canonical por página` · `fix(a11y): corrige 219 falhas de contraste AA, links só por cor e foco` |
| **Escopos usados** | `home`, `seo`, `a11y`, `ranking`, `stf`, `docs` |

**Verificação obrigatória antes do PR** (de `CONTRIBUTING.md` e do `AGENTS.md`):

```bash
npm run typecheck       # zero erros
npm run verify:scoring  # matemática do IDIP + sincronia WEB-001
npm run verify:identity # motor de identidade
npm run build           # build limpo
```

> **Atenção:** o `CONTRIBUTING.md` pede `npx tsc --noEmit` a partir da raiz e
> `cp .env.example .env`. **Os dois caminhos estão desatualizados** no próprio
> `CONTRIBUTING.md`: o typecheck correto é `npm run typecheck` (delega para
> `@cp/web`) e o env fica em `apps/web/.env`. Corrigir o `CONTRIBUTING.md` está em
> [ROADMAP trilha G](../01-product-discovery/ROADMAP.md).

### Regras de conteúdo do PR (inegociáveis)

1. Nenhuma contribuição introduz julgamento ideológico no IDIP.
2. Linguagem jurídica estrita em qualquer texto novo (ver
   [LEGAL_TERMS.md](../01-product-discovery/LEGAL_TERMS.md)).
3. Fontes oficiais apenas, com URL e `retrievedAt`.
4. Nada de CPF, endereço, telefone ou dado familiar.
5. **Mudança de fórmula exige bump de versão** (`Score.version` +
   `METODOLOGIA_VERSAO`) e atualização de `/metodologia` + `verify-scoring.ts`.
6. Mudança em motor exige caso novo em `verify-*.ts`.
7. Mudança de UI conferida em **375px / 768px / 1280px**.

## 9. Armadilhas de ambiente (`AGENTS.md`)

Estas já causaram falha real neste repositório:

| Armadilha | Sintoma | Verificação |
|---|---|---|
| **`next dev` e `next build` compartilham `apps/web/.next`** | Falhas **intermitentes e enganosas**: `Invariant: no direct app page entry found for /_not-found`, `ENOENT .../route.js.nft.json`, `Cannot find module './chunks/vendor-chunks/next.js'` | Antes de buildar: `Get-CimInstance Win32_Process -Filter "Name='node.exe'" \| Where-Object { $_.CommandLine -match 'Curr' -and $_.CommandLine -match 'next' }` |
| **Dev server órfão** deixado por `Start-Process` + `cmd /c` | O filho sobrevive ao pai e continua gravando em `.next` | Mesmo comando acima |
| **Porta 3000 disputada** por outros projetos da máquina | `next dev` troca de porta sozinho e o Playwright falha com `ERR_CONNECTION_REFUSED` no meio da execução | A suíte sobe o servidor na **3033** de propósito |
| **`DATABASE_URL` decide tudo** | Todo script de dados grava no banco que ela apontar, inclusive produção | Manter `apps/web/.env` apontando para `localhost:15432`; `db:seed` recusa remoto sem `CP_ALLOW_REMOTE_SEED=1` |
| **Tema dark fixo** | Assumir variante light quebra contraste | Não usar variantes light |

## 10. Verificação por tipo de mudança

| Tipo de mudança | O que rodar |
|---|---|
| Qualquer código | `npm run typecheck` · `npm run build` |
| Motor IDIP (`packages/idip`) | + `npm run verify:scoring` (e caso novo no script) |
| Motor de identidade | + `npm run verify:identity` |
| Pesos exibidos na UI | + `npm run verify:scoring` (WEB-001 falha se divergir) |
| Dados / dimensões | + `npm run recalculate-scores` e `npm run db:snapshot` |
| Interface | + `npm run e2e`, `npm run design:detect`, conferir 375/768/1280 |
| SEO | + `npm run e2e -- --grep SEO` (índice, arquivo base, 404, canonical, OG) |
| Acessibilidade | + `tests/e2e/acessibilidade.spec.ts` (axe, `wcag22aa`) |
| Migração de schema | `npx prisma generate --schema=apps/web/prisma/schema.prisma` + migration |
| Documentação | Nenhum gate. Mas referência quebrada é dívida registrada no [ROADMAP trilha G](../01-product-discovery/ROADMAP.md) |

## 11. Referências

- `CONTRIBUTING.md` (com as ressalvas da §8) · `AGENTS.md`
- [DESIGN.md](DESIGN.md) · `.dsh/skills/curriculo-design-system/SKILL.md`
- [SCORING_METHODOLOGY.md](SCORING_METHODOLOGY.md) · [DATA_MODEL.md](DATA_MODEL.md)
- [LEGAL_TERMS.md](../01-product-discovery/LEGAL_TERMS.md)
- `apps/pipeline/README.md` · `apps/web/README.md`
