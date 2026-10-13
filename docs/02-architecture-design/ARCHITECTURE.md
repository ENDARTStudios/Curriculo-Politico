# ARCHITECTURE — Currículo Político

Visão de arquitetura do sistema **como ele está no repositório**. Onde houver
componente planejado e não implementado, isso está dito.

Produção: https://www.curriculopolitico.org

## 1. Visão geral

Três camadas com fronteiras explícitas, em um monorepo npm workspaces
(`package.json` raiz → `workspaces: ["apps/*", "packages/*"]`):

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CAMADA 1 — APRESENTAÇÃO                       apps/web (Vercel, gru1)    │
│  Next.js 15.5 App Router · React 19 · Tailwind v4 CSS-first              │
│  Rotas públicas (RSC) · Route Handlers /api/* · middleware Edge          │
└──────────────────────────────────────────────────────────────────────────┘
                    │ Prisma Client (DATABASE_URL, pooler 6543)
                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  CAMADA 2 — DADOS                                     Supabase / Postgres│
│  apps/web/prisma/schema.prisma — 29 models, 4 enums                      │
│  Runtime: pooler transaction mode · Migrate/ETL: DIRECT_URL (5432)       │
└──────────────────────────────────────────────────────────────────────────┘
                    ▲
                    │ scripts TS (Prisma) — idempotentes
                    │
┌──────────────────────────────────────────────────────────────────────────┐
│  CAMADA 3 — PIPELINE                              apps/pipeline (offline)│
│  ETL Python 3.12 → data/raw/*.json (camada raw imutável, gitignored)     │
│  Loads TS → banco · recálculo do IDIP · snapshots · verificação          │
└──────────────────────────────────────────────────────────────────────────┘
                    ▲
                    │ import direto de TS fonte
                    │
┌──────────────────────────────────────────────────────────────────────────┐
│  MOTORES PUROS                                       packages/idip       │
│  scoring.ts (IDIP) · identity.ts (resolução TSE) — sem I/O, sem Prisma   │
└──────────────────────────────────────────────────────────────────────────┘
```

O `README.md` resume a regra: **a raiz contém apenas configuração global**;
código de aplicação vive em `apps/*`, documentação em `docs/`.

## 2. Componentes

### 2.1 `apps/web` — apresentação e API

| Peça | Responsabilidade |
|---|---|
| `src/app/**` | Páginas (React Server Components) e Route Handlers. 40 arquivos entre páginas, layouts e rotas de API. |
| `src/lib/prisma.ts` | Instância única do Prisma Client. |
| `src/lib/methodology.ts` | Projeção de **leitura** dos pesos do motor para a UI, validada pelo teste WEB-001. |
| `src/lib/hero-stats.ts` | Números de prova da home; devolve `null` em qualquer erro de banco — a faixa some, a página não quebra. |
| `src/lib/sitemap.ts` | Fonte única dos ids e das entradas do sitemap; contrato de falha que mantém o arquivo base válido sem banco. |
| `src/lib/status-visual.ts` | Aparência e leitura dos 4 estados de `ReliabilityStatus`, em um só lugar. |
| `src/lib/auth.ts` | NextAuth v4 (credentials + Google opcional), com gravação de aceite de termos no primeiro login. |
| `src/lib/consent.ts` | Versões de Termos/Privacidade e do consentimento específico para opinião política. |
| `src/lib/affinity.ts` | Ranking pessoal por autorias — camada isolada do IDIP. |
| `src/lib/snapshot.ts` | Datação e formatação de snapshots **em UTC** (`timeZone: "UTC"`). |
| `src/middleware.ts` | Rate limiting Token Bucket + headers de segurança (CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`). |
| `prisma/schema.prisma` | Schema e migrations. |
| `prisma/seed` + `apps/pipeline/scripts/seed-dev.ts` | 3 perfis fictícios (GREEN, YELLOW, RED) calculados pelo motor real. |

### 2.2 `apps/pipeline` — dados

Duas responsabilidades separadas por linguagem:

- **`etl/*.py` (Python 3.12)** — coleta nas APIs oficiais. Grava JSON bruto em
  `data/raw/` na **raiz do monorepo** (gitignored). Nenhum ETL escreve no banco.
- **`scripts/*.ts` (tsx)** — cargas idempotentes (`load-*.ts`), recálculo
  (`recalculate-scores.ts`), travas (`apply-integrity-caps.ts`), snapshots
  (`snapshot-scores.ts`), seeds e verificadores (`verify-*.ts`).

Regras do pipeline (`apps/pipeline/README.md`):

1. **Idempotência** obrigatória — toda carga pode ser reexecutada. Cargas grandes
   usam `createMany` em chunks, nunca upsert sequencial (lento no pooler).
2. **Camada raw imutável** — reprocessar é reexecutar o `load-*`, nunca
   re-baixar.
3. **Banco em produção** — scripts pesados preferem o pool transacional.
4. **Mudança de dimensão exige** `recalculate-scores` **e** `db:snapshot`.

### 2.3 `packages/idip` — motores puros

`packages/idip/package.json` aponta `main` e `types` para `./index.ts`. Publica
**apenas TypeScript não compilado**, sem `build`, sem `dist`. Importado por
`apps/pipeline` (via `tsx`, que transpila na hora) e **não** por `apps/web`.

- `scoring.ts` — `calculateIDIP(metrics, profile)`, `WEIGHTS`, `HARD_CAP`,
  `applyCareerModifiers`, `applySecretVotePenalty`, `applyCostEfficiency`.
  Valida pesos na carga do módulo (`soma deve ser 1`, senão lança).
- `identity.ts` — `resolveMatch(input, candidates)` em 3 estágios
  (exato → contenção de tokens → fuzzy ≥ 0.85), sempre exigindo UF + cargo.

Consequência arquitetural registrada em [ADR-005](ADR.md#adr-005): a UI **não**
importa o motor; ela mantém uma cópia de leitura dos pesos, fechada por teste.

## 3. Fluxo de dados

### 3.1 Ingestão (offline, operador dispara)

```
API oficial (Câmara/Senado/TSE)          arquivo manual (TCU/STF)
        │                                        │
        │ python etl/*.py                        │ data/raw/*.json
        ▼                                        ▼
   data/raw/*_raw.json  ──►  tsx scripts/load-*.ts  ──►  Postgres
                                                            │
                        tsx scripts/recalculate-scores.ts ──┤  (usa @cp/idip)
                        tsx scripts/apply-integrity-caps.ts ┤
                        tsx scripts/snapshot-scores.ts ─────┘
```

Os IDs dos registros carregados são **determinísticos** (ex.:
`score_${termId}_v1`, `tcu_${personId}_${processo}`), o que dá idempotência por
`upsert` sem consultar antes.

### 3.2 Leitura (runtime, por requisição)

```
Requisição → middleware Edge (rate limit + CSP)
           → Server Component (force-dynamic)
           → Prisma Client → pooler 6543 → Postgres
           → HTML
```

Convenção verificada: **toda** página que consulta banco declara
`export const dynamic = "force-dynamic"` (25 ocorrências em
`apps/web/src/app/`, incluindo as rotas de `sitemap` e as APIs). Motivo em
[ADR-007](ADR.md#adr-007): os números mudam a cada carga e o `next build` não
pode exigir banco acessível.

### 3.3 Exceção deliberada: o sitemap tem contrato de falha

`sitemap.xml` e `sitemap/{id}.xml` são dinâmicos, mas **não** podem depender do
banco: sem `DATABASE_URL` no build ou com banco fora do ar, `calcularIds()`
devolve ao menos `[0]` e `entradasDoArquivo(0)` devolve as rotas estáticas. Um
sitemap vazio declarado seria pior que ausente — o crawler o aceitaria como
válido e pararia de procurar. Id fora da faixa devolve **404**, não XML vazio.

## 4. Modelo de dados

Detalhado em [DATA_MODEL.md](DATA_MODEL.md). Resumo dos grupos:

| Grupo | Models |
|---|---|
| Núcleo político | `Person`, `Party`, `Office`, `Term` |
| Avaliação | `Score`, `ScoreSnapshot`, `StfScore` |
| Atividade | `Bill`, `BillAuthorship`, `LegislativeAction`, `SessionAttendance` |
| Dinheiro | `CampaignFinance`, `PoliticianCost`, `FixedBenefit`, `PatrimonyHistory` |
| Jurídico | `LegalRecord` |
| Judiciário | `StfJustice`, `StfCase`, `StfVote` |
| Identidade e conta | `User`, `Account`, `Session`, `VerificationToken` |
| Engajamento | `UserBillVote`, `RetificationRequest` |
| Contexto | `VerifiedClaim`, `HistoricalEra`, `HistoricalPolitician`, `MunicipalExpense` |

## 5. Fronteiras e invariantes

Invariantes que a arquitetura protege — quebrar qualquer um é regressão de
produto, não de estilo:

1. **`UserBillVote` nunca entra em `Score`.** São tabelas sem relação. A
   neutralidade algorítmica é uma propriedade do schema.
2. **Motores puros não fazem I/O.** `packages/idip` não importa Prisma nem faz
   fetch — é o que permite rodar `verify:scoring` e `verify:identity` no CI sem
   banco (`.github/workflows/ci.yml` roda com `DATABASE_URL` fictícia e ainda
   passa).
3. **A UI não redigita pesos.** Toda exibição de peso vem de
   `src/lib/methodology.ts`, que é conferida contra `WEIGHTS` pelo WEB-001.
4. **Nada renderiza número sem consulta real.** Dimensão sem fonte = 50 com selo
   "sem dados · neutro"; banco vazio = faixa de prova ausente, nunca
   "0 políticos avaliados".
5. **Arquivado e absolvido não aparecem** em nenhuma superfície pública.
6. **`DATABASE_URL` manda em tudo.** Todo script de dados grava no banco que ela
   apontar. Salvaguarda: `db:seed` recusa banco remoto sem
   `CP_ALLOW_REMOTE_SEED=1`.

## 6. Deployment

| Item | Configuração |
|---|---|
| Plataforma | Vercel, **Root Directory = `apps/web`** |
| Região das funções | `gru1` (São Paulo) — `apps/web/vercel.json`; corrigido por latência (banco em `sa-east-1`), ganho medido de ~80% na média de `/ranking` |
| Build | `prisma generate && next build` (`apps/web/package.json`) |
| Gatilho | Push em `main` (webhook) ou `npx vercel --prod` |
| Banco | Supabase Postgres; **runtime** no pooler transaction mode (6543, `?pgbouncer=true&connection_limit=1`), **migrate/ETL** em `DIRECT_URL` (5432) |
| Node | 24.x (`engines` na raiz e em `apps/web`) |

O `.vercelignore` da raiz exclui `docs/`, `apps/pipeline/`, `data/`, `node_modules`
e `.next`; o de `apps/web` exclui `.env*`, `node_modules` e `.next`.

## 7. Observabilidade e automação

| Mecanismo | O quê | Onde |
|---|---|---|
| CI de PR | `prisma generate` → `typecheck` → `verify:scoring` → `verify:identity` → `build` | `.github/workflows/ci.yml` |
| Smoke de produção (6h) | HTTP 200 em `/` e `/ranking`, `/api/search?q=lula` com resultado, `/api/rankings?limit=5` não vazio, `/status` sem "Indisponível" | `.github/workflows/production-smoke.yml` |
| Snapshot mensal | Dia 1, 03:00 UTC; idempotente; verificado por `verify-snapshot.ts` | `.github/workflows/monthly-snapshot.yml` |
| Acessibilidade (6h, +30 min) | Playwright + axe-core, tags WCAG 2.2 AA, contra **produção**, só asserções `@readonly` | `.github/workflows/a11y.yml` |
| Sentry | Erros de runtime; **no-op sem DSN** | `apps/web/src/instrumentation.ts`, `instrumentation-client.ts` |
| UptimeRobot | Uptime externo | `apps/pipeline/scripts/uptimerobot-monitor.ts` |
| `/status` | Volumes vivos da base + último snapshot + estado das fontes | `apps/web/src/app/status/page.tsx` |

O `a11y.yml` é separado do CI por decisão registrada no próprio arquivo: o job
`verify` roda sem banco e sem browser para permanecer rápido (é o gate de PR);
uma suíte de browser precisa de servidor servindo páginas renderizadas e
introduziria flakiness no caminho crítico.

## 8. Segurança

| Camada | O que faz | Onde |
|---|---|---|
| Edge | Rate limit Token Bucket: 60 req/min geral, 10 req/min em `POST /api/auth/register` e callbacks de login; identidade = id do usuário no JWT, senão IP | `apps/web/src/middleware.ts` |
| Headers | CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/microfone/geolocalização bloqueados) | idem |
| Aplicação | bcrypt para senha; consentimento versionado; exclusão de conta | `src/lib/auth.ts`, `src/app/api/account/route.ts` |
| Dados | Minimização: sem CPF, sem endereço, sem dado familiar; registros arquivados/absolvidos ocultados | `prisma/schema.prisma`, `api/politicians/[id]/route.ts` |

**Limite honesto, registrado no próprio código:** os baldes são em memória, por
instância, então o limite vale "por instância-visita". A proteção distribuída por
IP depende do Cloudflare/WAF à frente do deploy. Endereço de reporte de
vulnerabilidade: `endart.studios+security@gmail.com` (`src/lib/contato.ts`).

## 9. Decisões de arquitetura

Registradas em [ADR.md](ADR.md). As que mais afetam quem mexe no código:

| ADR | Decisão |
|---|---|
| [ADR-001](ADR.md#adr-001) | AGPL-3.0-only |
| [ADR-002](ADR.md#adr-002) | Supabase + pooler transaction mode (6543) com `DIRECT_URL` para migrate |
| [ADR-003](ADR.md#adr-003) | Next.js 15 App Router |
| [ADR-004](ADR.md#adr-004) | Tailwind v4 CSS-first, sem `tailwind.config.js` |
| [ADR-005](ADR.md#adr-005) | `packages/idip` publica só TS fonte; a UI não importa o motor (motiva o WEB-001) |
| [ADR-006](ADR.md#adr-006) | Monorepo npm workspaces, Vercel com Root Directory = `apps/web` |
| [ADR-007](ADR.md#adr-007) | `force-dynamic` nas rotas com dados |
| [ADR-008](ADR.md#adr-008) | IDIP-STF com pesos próprios |
| [ADR-009](ADR.md#adr-009) | Sitemap por Route Handlers, não `generateSitemaps` |
| [ADR-010](ADR.md#adr-010) | Camada raw imutável em `data/raw/` |
| [ADR-011](ADR.md#adr-011) | Votação popular isolada da nota |
| [ADR-012](ADR.md#adr-012) | Rate limit Token Bucket no middleware Edge |
| [ADR-013](ADR.md#adr-013) | Baseline neutro 50 em vez de estimativa |

## 10. Riscos de arquitetura conhecidos

| Risco | Impacto | Mitigação atual |
|---|---|---|
| Rate limit por instância | Flood distribuído não é contido pela aplicação | Cloudflare/WAF à frente; Redis em [ROADMAP C1/D3](../01-product-discovery/ROADMAP.md) |
| Ranking ordena em memória | Custo por requisição cresce com a base | Paginação de 100 linhas; cache e ordenação no banco no roadmap |
| Integridade sem fonte (`LegalRecord = 0`) | A dimensão de maior peso não mede nada | Baseline 50 sinalizado; fontes testadas em `docs/ops/anexos/` |
| Homonímia no casamento de registros jurídicos | Risco jurídico direto | Casamento por nome normalizado **exato**; CPF com hash no roadmap |
| Scores de versões diferentes no mesmo ranking | Comparação de notas incompatíveis | Lacuna conhecida — [ROADMAP A4](../01-product-discovery/ROADMAP.md) |
| `next dev` e `next build` compartilham `.next` | Builds falham de forma intermitente e enganosa | Verificação obrigatória de processo `next dev` ativo (`AGENTS.md`) |

## 11. Referências

- [ADR.md](ADR.md) · [DATA_MODEL.md](DATA_MODEL.md) · [UML.md](UML.md)
- [CHOOSE_TECH_STACK.md](CHOOSE_TECH_STACK.md) · [GREEN_COMPUTING.md](GREEN_COMPUTING.md)
- [SCORING_METHODOLOGY.md](SCORING_METHODOLOGY.md) · [STF_SCORING.md](STF_SCORING.md)
- `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` — medições que motivaram
  várias decisões aqui.
- `AGENTS.md` — armadilhas conhecidas que afetam o trabalho diário.
