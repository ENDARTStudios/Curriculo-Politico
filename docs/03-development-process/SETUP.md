# Setup do ambiente

Passo a passo verificado contra os arquivos do repositório. Se algo aqui divergir
do que o `npm` faz, o arquivo vence — e este documento deve ser corrigido.

Referências cruzadas: [DEVELOPMENT.md](DEVELOPMENT.md) (processo),
[TESTING.md](TESTING.md) (verificação),
[`docs/04-api-integrations/INTEGRATIONS.md`](../04-api-integrations/INTEGRATIONS.md)
(ETLs).

## 1. Pré-requisitos

| Requisito | Versão | Onde está declarado | Para quê |
|---|---|---|---|
| Node.js | **24.x** | `engines.node` na raiz e em `apps/web/package.json`; `setup-node: 24` em todos os workflows | Tudo que é TS/Next |
| npm | vem com o Node | `package-lock.json` versionado; o CI usa `npm ci` | Workspaces |
| Docker | qualquer recente | `docker-compose.yml` | Postgres local |
| Python | **3.12+** | `README.md` (apenas para ETL) | Apenas `npm run etl:*` |

Não há `pnpm`/`yarn` neste repositório: `package-lock.json` é npm e o CI roda
`npm ci`.

## 2. Clonar e instalar

```bash
git clone https://github.com/ENDARTStudios/Curriculo-Politico.git
cd Curriculo-Politico
npm install
```

`npm install` na raiz instala os três workspaces de uma vez (`apps/web`,
`apps/pipeline`, `packages/idip`) porque `workspaces: ["apps/*", "packages/*"]`.

**Nenhum browser é baixado.** A suíte Playwright usa
`channel: "chrome"` (`playwright.config.ts`), isto é, o Chrome já instalado na
máquina — evita ~280 MB de download por browser. O workflow `a11y.yml` instala
explicitamente (`npx playwright install --with-deps chrome`) porque o runner do
GitHub não tem Chrome.

## 3. Banco de dados local

```bash
docker compose up -d
```

`docker-compose.yml` sobe dois serviços:

| Serviço | Imagem | Porta no host | Credenciais |
|---|---|---|---|
| `db` (`container_name: curriculo-db`) | `postgres:16-alpine` | **15432** → 5432 | user `postgres`, senha `radar_civico`, database `curriculo` |
| `redis` (`container_name: curriculo-redis`) | `redis:7-alpine` | **16379** → 6379 | sem auth |

As portas são altas por motivo registrado no próprio arquivo: `5432/5433` e
`6379/6380` já estavam ocupadas na máquina de referência do projeto.

> **Redis está definido mas não é usado.** Busca no fonte por `redis`,
> `unstable_cache` e `revalidateTag` não retorna nenhuma ocorrência em
> `apps/web/src`. O `REDIS_URL` do `.env.example` está comentado e marcado como
> "Fase 3". Subir o Redis hoje não altera comportamento nenhum da aplicação.

Se você **não** for usar o Docker, pode apontar `DATABASE_URL` para o Supabase —
mas leia §5 antes.

## 4. Variáveis de ambiente

**Arquivo único do monorepo:** `apps/web/.env`, criado a partir do exemplo.

```bash
cp apps/web/.env.example apps/web/.env
```

Todos os scripts TS de dados são executados com
`tsx --env-file-if-exists=apps/web/.env`, então esse é o único `.env` que importa.

### Obrigatórias

| Variável | Papel |
|---|---|
| `DATABASE_URL` | **Decide tudo.** É o banco que a aplicação lê e que todo script de dados escreve |
| `DIRECT_URL` | Conexão direta exigida pelo Prisma para `migrate`/`db push` — não funciona em transaction mode |

Valor local do exemplo:

```
DATABASE_URL="postgresql://postgres:radar_civico@localhost:15432/curriculo?schema=public"
DIRECT_URL="postgresql://postgres:radar_civico@localhost:15432/curriculo?schema=public"
```

### Opcionais (a aplicação funciona sem)

| Variável | Efeito quando ausente |
|---|---|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry fica **dormente**; o SDK nem entra no bundle (import dinâmico em `src/instrumentation.ts` e `src/instrumentation-client.ts`) |
| `UPTIMEROBOT_API_KEY` | `npm run uptimerobot` sai com exit 1 e mensagem orientando a criar a key |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | O provider Google nem é registrado (`src/lib/auth.ts` monta a lista de providers condicionalmente) |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | Botão de login social não é exibido |
| `NEXT_PUBLIC_SITE_URL` | Cai no default `https://www.curriculopolitico.org` em `layout.tsx`, `robots.ts` e `lib/sitemap.ts` — **em preview/desenvolvimento isso faz o canonical apontar para produção** |
| `NEXTAUTH_SECRET` | Login (credentials e JWT) não funciona |
| `REDIS_URL` | Nada — não há consumidor no código |

### Pool de conexões (produção)

O comentário no `.env.example` registra a armadilha medida: o pooler do Supabase
em **session mode (5432)** aceita 15 clientes por padrão e esgota durante
deploys, produzindo `EMAXCONNSESSION` → HTTP 500. Em produção:

```
DATABASE_URL="...pooler...:6543/...?pgbouncer=true&connection_limit=1"
DIRECT_URL="...:5432/..."     # migrate/db push e ETLs de carga
```

Evidências e medição completa:
[`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md) §2.4 e §3.

## 5. A armadilha central: `DATABASE_URL` manda em tudo

> ⚠️ Todo script de dados — `db:load-*`, `db:seed*`, `seed:production`,
> `recalculate-scores`, `apply-integrity-caps`, `db:snapshot` — grava no banco
> que `DATABASE_URL` apontar. Se você preencher o `.env` local com o Supabase de
> **produção**, seus comandos locais alteram produção.

Salvaguarda implementada: `npm run db:seed` **recusa** rodar contra banco
remoto, a menos que `CP_ALLOW_REMOTE_SEED=1` seja definido explicitamente. A
checagem está em `apps/pipeline/scripts/seed-dev.ts` e testa se a URL casa com
`@(localhost|127.0.0.1|host.docker.internal)[:/]`.

O texto do próprio script quando força:

```
⚠️  CP_ALLOW_REMOTE_SEED=1 — inserindo dados FICTÍCIOS em banco REMOTO.
```

Os **demais** scripts não têm guarda equivalente. Para trabalho isolado, mantenha
`localhost:15432` e deixe as credenciais de produção fora do `.env` de
desenvolvimento.

## 6. Schema e dados

```bash
npm run db:migrate   # prisma migrate dev (schema em apps/web/prisma/schema.prisma)
npm run db:seed      # 3 perfis fictícios: GREEN, YELLOW e RED
npm run dev          # http://localhost:3000
```

O seed cria dados **fictícios**, identificáveis por `externalId` iniciando com
`seed-`. As consultas públicas filtram esses registros
(`/api/rankings` e `/status` usam `{ externalId: { not: { startsWith: "seed-" } } }`),
então eles não aparecem no ranking nem nas contagens públicas.

Para dados reais, o caminho é ETL → carga:

```bash
pip install -r apps/pipeline/etl/requirements.txt
npm run etl:camara
npm run db:load-camara
```

Ou a cadeia completa de produção (idempotente, mas veja §5):
`npm run seed:production`.

## 7. ETL Python

`apps/pipeline/etl/requirements.txt` declara exatamente duas dependências:
`requests>=2.32` e `pandas>=2.2`. Cada ETL grava JSON em
`data/raw/` na **raiz do monorepo** (gitignored), e a carga nunca re-baixa: a
camada raw é imutável e reprocessar significa re-executar o `load-*`
(`apps/pipeline/README.md`).

Cada ETL também é executável diretamente, útil para amostra:

```bash
python apps/pipeline/etl/camara_deputados.py --limit 10
```

Limitações de fonte (STF sem API consolidada, TCU com caminho alternativo) estão
em [`docs/04-api-integrations/INTEGRATIONS.md`](../04-api-integrations/INTEGRATIONS.md).

## 8. Verificação do ambiente

Depois do setup, estes comandos devem passar sem erro:

```bash
npm run typecheck
npm run verify:scoring     # não precisa de banco
npm run verify:identity    # não precisa de banco
npm run build
```

`npm run build` roda `prisma generate && next build`. **Pare o `next dev` antes**
— os dois compartilham `apps/web/.next` e a falha é intermitente e enganosa
(ver `DEVELOPMENT.md` §6.1).

## 9. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `ENOENT .../route.js.nft.json`, `Invariant: no direct app page entry found for /_not-found`, `Cannot find module './chunks/vendor-chunks/next.js'` | `next dev` ativo (inclusive órfão) escrevendo em `apps/web/.next` durante o build | Mate o processo `next dev` e builde de novo. Não procure bug no código |
| `EPERM` em `prisma generate` | Dev server segurando lock do `query_engine-windows.dll.node` | Pare o dev server |
| Playwright com `ERR_CONNECTION_REFUSED` no meio da suíte | `next dev` trocou de porta porque a 3000 estava ocupada | A suíte usa 3033; não aponte para outra porta |
| `P1001` / `Can't reach database server` | `docker compose up -d` não subiu, ou `DATABASE_URL` aponta para outro host | `docker compose ps`; confira a porta **15432** |
| `prisma migrate` falha em transaction mode | `DIRECT_URL` ausente ou apontando para a 6543 | `migrate` exige a conexão direta (5432) |
| HTTP 500/503 nas primeiras requisições após deploy | Pool de conexões esgotado (`EMAXCONNSESSION`) | Ver §4, "Pool de conexões" |
| `db:seed` recusado com mensagem sobre banco remoto | `DATABASE_URL` não é local | Aponte para `localhost:15432` — ou, ciente do risco, `CP_ALLOW_REMOTE_SEED=1` |
| Home sem a faixa de números | Comportamento **esperado** com banco vazio | Não é bug: `HeroStats` retorna `null`. Ver [ERROR_HANDLING.md](../07-operations-marketing/ERROR_HANDLING.md) |

## 10. Zero instalação (só quer ler o código)

Nada além de Node é necessário para ler o repositório, rodar
`npm run verify:scoring`/`verify:identity` (motores puros, sem banco) ou o
`npx impeccable detect apps/web/src`. Banco, Docker e Python só entram quando
você quer executar a aplicação ou o pipeline.

## 11. Não verificado

- Instalação em macOS/Linux **no ambiente deste documento**: os caminhos de
  troubleshooting de processo (`Win32_Process`, `EPERM` em `.dll.node`) são
  específicos de Windows porque a máquina de referência do projeto é Windows.
  No CI (Ubuntu) o fluxo equivalente passa, mas não há documentação de setup
  Linux local escrita.
- Não há `.nvmrc` nem `.node-version` no repositório; a versão do Node é
  declarada apenas em `engines` e nos workflows.
