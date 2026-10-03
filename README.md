# Currículo Político

Plataforma open-source de transparência política que agrega dados públicos federais para avaliar, ranquear e auditar o desempenho de políticos e partidos no Brasil, usando o **IDIP** — Índice de Desempenho e Integridade Pública.

**Produção:** https://www.curriculopolitico.org

## Como funciona

- **Nota IDIP (0–100):** mede desempenho com pesos distintos para Legislativo e Executivo. Metodologia aberta e versionada em [/metodologia](https://www.curriculopolitico.org/metodologia).
- **Termômetro de Confiabilidade:** risco e transparência ao lado da nota (🟢 Confiável, 🟡 Atenção, 🔴 Não Confiável, ⚪ Dados Insuficientes — fora do ranking).
- **Travas de integridade:** condenação transitada em julgado, impeachment, inelegibilidade ou contas rejeitadas zeram a Integridade e limitam a nota a 39.9.
- **Neutralidade algorítmica:** o IDIP usa exclusivamente dados públicos auditáveis (Câmara, Senado, TSE). A votação popular é camada de engajamento separada — nunca altera a nota. Dimensões sem dados recebem baseline neutro 50, identificado na interface.

## Estrutura (monorepo — npm workspaces)

```
├── apps/
│   ├── web/            Aplicação Next.js 15 (UI + API routes + Prisma) — deploy Vercel
│   └── pipeline/       Dados: scripts TS de carga/recálculo + ETLs Python (Câmara/Senado/TSE)
├── packages/
│   └── idip/           Motores puros compartilhados: cálculo IDIP + resolução de identidade (@cp/idip)
├── docs/               Documentação (security/, ops/)
├── data/               Cache local de dados brutos do ETL (gitignored)
├── docker-compose.yml  Infra local de dev (Postgres 15432 + Redis 16379)
└── .github/workflows   CI · snapshot mensal de scores · smoke de produção (6h)
```

**A raiz contém apenas configuração global** (package.json de workspaces, README, LICENSE, ignores, compose). Código de aplicação vive em `apps/*`; documentação, em `docs/`.

## Quickstart

Pré-requisitos: Node 22+, Python 3.12+ (apenas para ETL) e Docker (para o Postgres local).

```bash
# 1. Dependências (instala os workspaces web + pipeline)
npm install

# 2. Banco local — ou aponte DATABASE_URL ao Supabase
docker compose up -d

# 3. Variáveis de ambiente (arquivo único do monorepo)
cp apps/web/.env.example apps/web/.env

# 4. Schema + dados fictícios (3 perfis: GREEN, YELLOW, RED)
npm run db:migrate
npm run db:seed

# 5. Aplicação
npm run dev          # http://localhost:3000
```

Todos os comandos (`npm run db:*`, `npm run etl:*`, `build`, `typecheck`…) funcionam **a partir da raiz** — o `package.json` raiz delega para o workspace certo.

## Comandos principais

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Aplicação web (apps/web) |
| `npm run db:migrate` / `db:seed` | Prisma migrate/seed (schema em apps/web/prisma) |
| `npm run db:snapshot` | Snapshot dos scores (idempotente; cron mensal no Actions) |
| `npm run recalculate-scores` | Recalcula o IDIP com os dados atuais |
| `npm run db:load-*` | Carga dos JSONs de `data/raw/` para o banco |
| `npm run etl:*` | Coletas Python (gravam em `data/raw/`) |
| `npm run verify:scoring` / `verify:identity` | Testes dos motores (rodam no CI) |

## ETL

```bash
pip install -r apps/pipeline/etl/requirements.txt
npm run etl:camara        # ou: python apps/pipeline/etl/camara_deputados.py --limit 10
```

Saída em `data/raw/` (gitignored): `*_raw.json` (camada raw imutável), consumida pelos `db:load-*`.

## Verificação

```bash
npm run typecheck         # TypeScript estrito
npm run verify:scoring    # Matemática do IDIP: pesos, hard caps, termômetro
npm run build             # Build de produção
```

`verify:scoring` cobre soma dos pesos = 1.0 nos dois perfis, teto 39.9 para condenados/contas rejeitadas, termômetro GREEN/YELLOW/RED/GRAY e rejeição de métricas inválidas. Roda no CI (`.github/workflows/ci.yml`).

## Deploy

- **Web:** Vercel, Root Directory = `apps/web`. Deploy por push em `main` (webhook) ou `npx vercel --prod` da raiz.
- **Cron:** snapshot mensal (dia 1, 03:00 UTC) e smoke de produção (6h) via GitHub Actions — requer secret `DATABASE_URL`.

## Compliance

- **Linguagem jurídica estrita:** apenas "Réu em Ação Penal" / "Condenação Transitada em Julgado"; nunca "crime" sem trânsito em julgado.
- **LGPD:** minimização de dados (nenhum CPF, endereço, dado familiar); registros judiciais arquivados/absolvidos ocultados automaticamente; consentimento específico versionado para a votação (dado sensível). Ver [`docs/security/RIPD.md`](docs/security/RIPD.md).
- **Direito de resposta:** canal de retificação com protocolo rastreável (`/retificacao`).

## Documentação

- [`docs/security/`](docs/security/) — RIPD e auditorias jurídicas
- [`docs/ops/`](docs/ops/) — auditorias técnicas de produção
- [`apps/web/README.md`](apps/web/README.md) · [`apps/pipeline/README.md`](apps/pipeline/README.md)

## Licenças

Código sob [AGPL-3.0-only](LICENSE) · Documentação sob CC BY 4.0.
