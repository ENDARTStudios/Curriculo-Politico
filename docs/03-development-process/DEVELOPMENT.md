# Processo de desenvolvimento

Como se trabalha neste repositório: onde o código vive, o que se roda antes de
considerar algo pronto e quais decisões de arquitetura não se renegociam.

Documentos irmãos: [SETUP.md](SETUP.md) (ambiente do zero),
[TESTING.md](TESTING.md) (o que é verificado e como), [RULES.md](RULES.md)
(regras de engenharia e de produto), [TASKS.md](TASKS.md) (trabalho aberto).

Documentos que vivem em outras áreas e você vai consultar:

| Documento | Para quê |
|---|---|
| [`docs/02-architecture-design/ARCHITECTURE.md`](../02-architecture-design/ARCHITECTURE.md) | Componentes, fluxo de dados, fronteiras e invariantes |
| [`docs/02-architecture-design/SCORING_METHODOLOGY.md`](../02-architecture-design/SCORING_METHODOLOGY.md) | A fórmula do IDIP em detalhe: pesos por perfil, hard caps, regra de ranking, versionamento |
| [`docs/02-architecture-design/DATA_MODEL.md`](../02-architecture-design/DATA_MODEL.md) | Modelo de dados |
| [`docs/05-security-compliance/COMPLIANCE.md`](../05-security-compliance/COMPLIANCE.md) | LGPD, base legal por operação, retenção, linguagem jurídica |
| [`docs/06-devops-deployment/`](../06-devops-deployment/) | Deploy, backup/DR, CI/CD, FinOps |
| [`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md) | Funil de conversão e regras de UI |

## 1. Onde as coisas vivem

Monorepo **npm workspaces**, definido em `package.json` (raiz) com
`workspaces: ["apps/*", "packages/*"]`:

| Caminho | O que é | Runtime |
|---|---|---|
| `apps/web` | Next.js 15.5 App Router, React 19, Tailwind v4, Prisma | Node 24.x |
| `apps/pipeline` | Cargas TS (Prisma) + ETL Python 3.12 | tsx / Python |
| `packages/idip` | Motores puros: cálculo IDIP (`src/scoring.ts`) e resolução de identidade (`src/identity.ts`) | TypeScript |
| `tests/e2e` | Suíte Playwright (48 testes, 3 arquivos) | Playwright |
| `.design-review` | Ferramentaria local de captura/medição de UI. **Não é código de produto** | Node |
| `data/raw` | Camada raw imutável do ETL (`*_raw.json`), gitignored | — |
| `docs` | Documentação (esta pasta e as demais áreas numeradas) | — |
| `.github/workflows` | CI, auditoria de acessibilidade, snapshot mensal, smoke de produção | — |

**Regra da raiz:** a raiz contém apenas configuração global (`package.json` de
workspaces, `README.md`, `CONTRIBUTING.md`, `LICENSE`, ignores, `docker-compose.yml`).
Código de aplicação vive em `apps/*`; documentação em `docs/`.

`packages/idip` é **só TS fonte** (`"main": "./index.ts"`, sem passo de build).
Quem importa consome TypeScript direto — não existe `dist/` a manter.

## 2. Os comandos rodam da raiz

O `package.json` da raiz delega para o workspace certo. Você **não** precisa
entrar em `apps/web` para rodar nada:

```bash
npm run dev            # next dev (apps/web)
npm run build          # prisma generate && next build
npm run typecheck      # tsc --noEmit
npm run e2e            # Playwright (sobe o servidor na porta 3033)
npm run db:migrate     # prisma migrate dev
npm run db:seed        # seed de desenvolvimento (3 perfis fictícios)
npm run recalculate-scores
npm run verify:scoring
npm run verify:identity
```

A raiz tem cerca de 50 scripts. Os grupos são:

| Prefixo | Natureza | Exemplos |
|---|---|---|
| `db:load-*` | Carga idempotente de JSON de `data/raw/` para o banco | `db:load-camara`, `db:load-proposicoes`, `db:load-ceap-bulk` |
| `db:seed*` | Dados **fictícios** ou de referência | `db:seed`, `db:seed-parties`, `db:seed-historical` |
| `seed:production` | Cadeia completa de carga de produção | `seed-all-production.ts` |
| `etl:*` | Coleta Python (grava em `data/raw/`) | `etl:camara`, `etl:senado`, `etl:tse` |
| `verify:*` | Verificação dos motores puros, sem banco | `verify:scoring`, `verify:identity` |
| `recalculate-*` / `apply-integrity-caps` | Reprocessamento do IDIP | `recalculate-scores` |
| `design:detect` / `design:axe` | Auditoria de UI | `impeccable detect apps/web/src` |

Cada script TS de dados é executado com
`tsx --env-file-if-exists=apps/web/.env`: **o `.env` do monorepo é
`apps/web/.env`**, não um `.env` por workspace. `apps/pipeline/package.json`
aponta para `../../apps/web/.env` nas suas próprias entradas.

## 3. Ciclo de uma mudança

1. **Confirme o ambiente.** Sem `next dev` ativo (ver §6, armadilha do `.next`).
2. **Decida se a mudança toca o motor.** Se tocar `packages/idip/src/scoring.ts`
   ou `identity.ts`, veja `RULES.md` §3 — exige bump de versão e caso novo no
   verificador.
3. **Escreva código com o vocabulário do projeto.** Dimensões, estados do
   Termômetro e pesos **derivam do motor**; nunca são redigitados na UI.
4. **Verifique na ordem do CI** (o mesmo que `.github/workflows/ci.yml` faz):

   ```bash
   npx prisma generate --schema=apps/web/prisma/schema.prisma   # valida o schema
   npm run typecheck
   npm run verify:scoring
   npm run verify:identity
   npm run build
   ```

5. **Se a mudança for de UI**, além do acima: `npm run e2e` (48 testes) e
   `npx impeccable detect apps/web/src` (deve sair com exit 0).
6. **Commit** em português, imperativo: `feat: adiciona X`, `fix: corrige Y`.

### Sobre `force-dynamic`

Praticamente toda rota que lê banco declara `export const dynamic = "force-dynamic"`
(API routes, `/ranking`, `/partidos`, `/projetos`, `/status`, `/stf`, `/historia`,
`/comparar`, `/conta`, perfis e proposições). Isso **não** significa "nenhum
cache": segundo a medição registrada em
[`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md) §2.3,
`force-dynamic` equivale a marcar `fetch()` como `no-store` — o Data Cache do
Next continua existindo e é o mecanismo que `unstable_cache` usaria. **No código
atual não há `unstable_cache` nem `revalidateTag`** (verificado por busca no
fonte); o cache de dados é uma recomendação do roadmap, não uma realidade.

Páginas puramente estáticas (`/metodologia`, `/sobre`, `/faq`, institucionais)
**não** declaram `force-dynamic` e aparecem como `HIT` de borda na medição.

### Acessibilidade e UI

Carregue as skills de design antes de mexer em interface — elas são a fonte de
verdade de tokens e de funil, conforme `AGENTS.md`:

- `.dsh/skills/curriculo-design-system/`
- `.dsh/skills/curriculo-marketing-funnel/`
- `.dsh/skills/curriculo-hero/`
- `.dsh/skills/curriculo-design-review/`

Estratégia consolidada: [`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md).
Briefs de subagentes: [`docs/design/agents/`](../design/agents/).

Tailwind é **v4 CSS-first**: os tokens nascem em `@theme` dentro de
`apps/web/src/app/globals.css`. **Não existe `tailwind.config.js`** e não se
deve criar um. Se um valor é recorrente, ele vira token em `@theme` — não classe
solta em cada componente.

## 4. Deploy

- **Alvo:** Vercel, **Root Directory = `apps/web`**.
- **Gatilho:** push em `main` (webhook) ou `npx vercel --prod` da raiz.
- **Previews automáticos por PR.**
- **Região das funções:** `gru1` (São Paulo), fixada em `apps/web/vercel.json`
  (`{"regions": ["gru1"]}`) para co-localizar com o banco em `sa-east-1`. A troca
  de `iad1` para `gru1` está registrada como a maior causa isolada de latência
  corrigida no projeto.
- **Cuidado com canonical em preview:** `metadataBase` e `SITE_URL` leem
  `NEXT_PUBLIC_SITE_URL`. Em preview, defina essa variável — caso contrário o
  preview declara canonical apontando para produção.

## 5. Assets e imagens

`apps/web/next.config.ts` libera `next/image` para quatro origens, e **só** elas:

- `https://www.camara.leg.br`
- `https://dadosabertos.camara.leg.br`
- `https://www.senado.leg.br` (https e http)
- `https://www.senado.leg.br`

Adicionar uma origem nova exige editar esse arquivo **e** considerar a CSP de
`apps/web/src/middleware.ts` (`img-src 'self' data: https:`).

## 6. Armadilhas conhecidas

Estas quatro já custaram tempo real neste repositório. Estão registradas em
`AGENTS.md` e em
[`docs/08-knowledge-management/MEMORY.md`](../08-knowledge-management/MEMORY.md).

### 6.1 `next dev` e `next build` compartilham `apps/web/.next`

Um servidor de desenvolvimento ativo — **inclusive um órfão** deixado por script
(`Start-Process` + `cmd /c` deixa o filho vivo depois que o pai morre) — grava
nesse diretório enquanto o build lê. O resultado são falhas **intermitentes e
enganosas**, sem relação com o código:

- `Invariant: no direct app page entry found for /_not-found`
- `ENOENT .../route.js.nft.json`
- `Cannot find module './chunks/vendor-chunks/next.js'`

Medição registrada no repositório: builds com um dev server órfão ativo falharam
de forma reprodutível; 14 builds sem nenhum passaram.

Antes de buildar, confirme que não há dev server:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'Curr' -and $_.CommandLine -match 'next' }
```

Efeito colateral relacionado: rode `prisma generate` com o dev server
**parado** — o servidor mantém lock no `query_engine-windows.dll.node` e o
comando falha com `EPERM` (registrado em `.design-review/README.md`).

### 6.2 A porta 3000 é disputada nesta máquina

A suíte Playwright sobe o servidor na **3033** de propósito
(`playwright.config.ts`). Com a 3000 ocupada, o `next dev` troca de porta
sozinho (`Port 3000 is in use, using 3001`) e derruba a suíte no meio da
execução com `ERR_CONNECTION_REFUSED`.

### 6.3 `DATABASE_URL` manda em tudo

Todo script de dados (`db:load-*`, `db:seed*`, `seed:production`,
`recalculate-scores`, `db:snapshot`) grava no banco que `DATABASE_URL` apontar —
**inclusive o Supabase de produção**, se o seu `apps/web/.env` apontar para lá.
Única salvaguarda implementada: `db:seed` **recusa** rodar contra banco remoto
(a checagem em `apps/pipeline/scripts/seed-dev.ts` testa
`@(localhost|127.0.0.1|host.docker.internal)[:/]`), salvo `CP_ALLOW_REMOTE_SEED=1`.
Os demais scripts **não** têm essa guarda.

### 6.4 Tema dark fixo

`bg-slate-950` está no `layout.tsx`. Não assuma variantes light: componentes com
classes `dark:` presumindo alternância não se encaixam. Vale para qualquer
componente de terceiros que se queira copiar — e é um dos critérios usados na
avaliação de ferramentas em
[`docs/design/avaliacao-ferramentas.md`](../design/avaliacao-ferramentas.md).

## 7. Como uma mudança é considerada pronta

| Camada | Critério mínimo |
|---|---|
| Motor (IDIP/identidade) | `verify:scoring` / `verify:identity` cobrindo o caso novo + bump de versão |
| Dados | Carga re-executável (idempotente) e evidente qual `DATABASE_URL` foi usada |
| Tipos | `npm run typecheck` sem erro |
| Build | `npm run build` limpo, sem dev server ativo |
| UI | `npm run e2e` verde + `npx impeccable detect apps/web/src` exit 0 + conferência em 375px / 768px / 1280px |
| Acessibilidade | Sem violação `wcag22aa` nas páginas auditadas (ver [ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md)) |
| Documentação | Se mudou comportamento, o documento correspondente muda junto |

Mudança de UI que só passou por `dev` **não está verificada** — é regra explícita
do `AGENTS.md`.
