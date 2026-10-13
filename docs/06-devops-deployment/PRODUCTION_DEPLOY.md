# PRODUCTION_DEPLOY — Deploy de produção

**Projeto:** Currículo Político · **Data:** 2026-10-12 · **Produção:** https://www.curriculopolitico.org
**Fontes:** [`README.md`](../../README.md) §Deploy, [`AUDITORIA_PRODUCAO.md`](./AUDITORIA_PRODUCAO.md) §0.2, [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §5.1/§5.2/§10

---

## 1. Como a produção é atualizada

| Vias | Como | Observação |
|---|---|---|
| **Deploy por Git (padrão)** | `git push` em `main` → webhook da Vercel → build e deploy | Requer **Root Directory = `apps/web`** no projeto Vercel (ver §2) |
| **Deploy manual** | `npx vercel --prod` **executado de `apps/web`** | Foi o único caminho funcional entre 03/10 e 12/10/2026 |
| **Promoção de preview** | Deploy de preview → promover para produção no painel | Ver [`PREVIEW_DEPLOYMENT.md`](./PREVIEW_DEPLOYMENT.md) |

**Não há workflow de GitHub Actions que faça deploy.** Os 4 workflows fazem CI,
snapshot, smoke e acessibilidade — nenhum publica a aplicação
([`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md)).

---

## 2. As duas armadilhas que já derrubaram o deploy automático

Estas não são hipóteses: aconteceram em 2026 e estão documentadas em
[`AUDITORIA_PRODUCAO.md`](./AUDITORIA_PRODUCAO.md) §0.2.

### 2.1 Root Directory errado após o refactor do monorepo

**Sintoma:**

```
Error: The file "/vercel/path0/.next/routes-manifest.json" couldn't be found.
```

**Causa:** o refactor `f3c7630` (03/10) moveu a aplicação para `apps/web`, mas o
projeto Vercel permaneceu com **Root Directory = `.`**. O build rodava a partir
da raiz, o Next escrevia em `apps/web/.next`, e a Vercel procurava `.next` na raiz.

**Impacto medido:** último deploy por Git bem-sucedido antes da correção foi
`7sov9itnh` (01/10). Depois disso, produção só recebeu deploy manual
(`a6t5cvlm7`, `pa4ah9vn4`). O commit `256c96d` teve o deployment Git em `Error`
(`5qtrqo0b2`) e **qualquer push novo em `main` falharia**.

**Correção (12/10):** `PATCH /v9/projects/<projeto> { "rootDirectory": "apps/web" }`.

> ✅ **Verificação a fazer antes de qualquer mudança de estrutura:** o projeto
> Vercel aponta para `apps/web`, alinhado ao `apps/web/.vercelignore` e ao
> `package.json` autocontido. Se a estrutura do monorepo mudar, esta configuração
> **não muda sozinha**.

### 2.2 Integração Supabase suspensa

**Sintoma:** o deployment era criado e falhava em **~0,7 s** com
`Resource provisioning failed` (`errorCode: BUILD_FAILED`), **antes de qualquer
log de build**.

**Diagnóstico (evidências da auditoria):**

| Evidência | Resultado |
|---|---|
| `integrations` do deployment | `{"status":"error"}` — contra `{"status":"ready"}` no último deploy íntegro (`46TKRzo`) |
| Mesmo commit, Git **e** CLI | falhavam igualmente (não era o tipo de deploy) |
| Com e sem `rootDirectory` | falhavam igualmente |
| Projetos irmãos do time com o mesmo padrão | implantavam com sucesso |
| `vercel integration list curriculo-politico` | recurso `supabase-curriculo-politico` (`store_gEQUMEo790M6LY97`) com status **`Suspended`** |
| Variáveis do projeto | **23 manuais, 0 geridas pela integração** (nenhuma tem `configurationId`, inclusive `DATABASE_URL`) |

**Causa raiz:** o recurso da integração estava suspenso; todo deployment tentava
provisioná-lo, falhava no webhook e era abortado antes do build.

**Correção (12/10):**
`vercel integration resource disconnect supabase-curriculo-politico curriculo-politico`.
**Sem impacto funcional** — a integração não injetava nenhuma variável (todas as
23 são manuais) e o app não consome `SUPABASE_*`/`POSTGRES_*`. **Reversível** por
`vercel integration resource connect …` (requer o recurso ativo no painel *Stores*).

**Resultado:** deployment `f1eftiacn` publicado em 2 min (`Ready`) e promovido
para `www.curriculopolitico.org`.

---

## 3. Configuração de produção (estado verificado)

| Item | Valor | Evidência |
|---|---|---|
| Plataforma | **Vercel**, plano **Hobby** | `AVALIACAO_ALTERNATIVAS.md` §5.1 |
| Root Directory | `apps/web` | §2.1 |
| **Região das funções** | **`gru1` (São Paulo)** | [`apps/web/vercel.json`](../../apps/web/vercel.json) — `{"regions": ["gru1"]}` |
| Node | **24.x** | `engines` na raiz e em `apps/web`; alinhado ao CI em 2026-10-12 (`AUDITORIA_PRODUCAO.md` §0.6) |
| Banco | Supabase, região **`sa-east-1` (São Paulo)**, Postgres 16 | `AVALIACAO_ALTERNATIVAS.md` §2.1 |
| `DATABASE_URL` | pooler em **transaction mode, porta 6543**, com `?pgbouncer=true&connection_limit=1` | [`schema.prisma`](../../apps/web/prisma/schema.prisma) L7–13 |
| `DIRECT_URL` | conexão direta, **porta 5432** | idem L11–13; exigida por `prisma migrate` |
| Variáveis de ambiente | **23 manuais**, nenhuma gerida pela integração Supabase | `AUDITORIA_PRODUCAO.md` §0.2 |
| Headers de segurança | CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` — ativos | [`middleware.ts`](../../apps/web/src/middleware.ts) L142–149; re-verificado em produção na auditoria §4 |
| HSTS | Vercel default (não definido no repositório) | `AUDITORIA_PRODUCAO.md` §4 |

### 3.1 Por que a região importa tanto (medição)

As funções rodavam em **`iad1` (Washington)** com o banco em `sa-east-1`. A
correção para `gru1` foi a mudança de **melhor relação ganho/risco** da avaliação:

| `/ranking`, 10 requisições | min | p50 | máx | média |
|---|---|---|---|---|
| Antes | 1.563 ms | 1.625 ms | 2.621 ms | **1.740 ms** |
| Depois (após aquecer) | **238 ms** | **328 ms** | 661 ms | **354 ms** |

**Queda de 80% na média e na mediana, sem alterar uma linha de código.** Nenhuma
outra mudança deste projeto entregou tanto por tão pouco.

---

## 4. Procedimento de deploy

### 4.1 Deploy normal (por Git)

```bash
git checkout main
git pull
# … verificação obrigatória (ver §4.3) …
git push origin main
```

Acompanhar o deployment no painel da Vercel. Critérios de sucesso:
1. Build concluído (`Ready`).
2. O `production-smoke.yml` roda em até 6 h — **ou disparar manualmente** (`workflow_dispatch`) para não esperar.
3. Conferir `/status` e `/ranking` no navegador.

### 4.2 Deploy manual

```bash
cd apps/web                 # ⚠️ a partir de apps/web, não da raiz
npx vercel --prod
```

### 4.3 Verificação obrigatória antes de subir

De [`AGENTS.md`](../../AGENTS.md) §Verificação obrigatória:

```bash
npm run typecheck       # TypeScript estrito
npm run build           # build de produção
npm run verify:scoring  # matemática do IDIP (roda no CI)
```

> ⚠️ **Antes de buildar, confirme que não há `next dev` ativo.**
> `next dev` e `next build` **compartilham `apps/web/.next`**, e um dev server —
> inclusive **órfao** deixado por `Start-Process` + `cmd /c` — grava nesse
> diretório enquanto o build lê. O resultado são falhas **intermitentes e
> enganosas**: `Invariant: no direct app page entry found for /_not-found`,
> `ENOENT …/route.js.nft.json`, `Cannot find module './chunks/vendor-chunks/next.js'`.
> **Medido no repositório:** builds com dev server órfão ativo falharam de forma
> reprodutível; **14 builds sem nenhum passaram**.
>
> ```powershell
> Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
>   Where-Object { $_.CommandLine -match 'Curr' -and $_.CommandLine -match 'next' }
> ```

E, para mudança de UI, [`AGENTS.md`](../../AGENTS.md) é explícito: *"mudança de UI
que só passou por `dev` não está verificada"* — conferir a tela renderizada em
**375 px / 768 px / 1280 px**.

---

## 5. Riscos do processo de deploy atual

| # | Risco | Consequência | Mitigação |
|---|---|---|---|
| 1 | **Push em `main` publica direto** | Não há aprovação, *staging* nem *freeze*. Todo commit em `main` vai para produção | *Branch protection* + required status checks (**configuração de GitHub, não verificada**) |
| 2 | **O CI roda, mas não bloqueia necessariamente o deploy** | `ci.yml` roda em `push` e em PR, mas se o merge for feito sem exigir status check, um build quebrado chega a produção | Ativar *required status checks* |
| 3 | **Migrations não são aplicadas no deploy** | Nenhum workflow roda `prisma migrate deploy`. Uma migration nova precisa ser aplicada **manualmente** com `DIRECT_URL`, **antes** do deploy do código que a usa | Procedimento manual obrigatório (§5.1) |
| 4 | **`next build` roda sem banco** | Erro de query não é pego no build; aparece em runtime | [`QA_TESTING.md`](./QA_TESTING.md) §4 e [`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) §2.1 |
| 5 | **Sem janela de manutenção** | O deploy é atômico na Vercel, mas o pool de conexões pode esgotar durante a troca (sintoma histórico: `EMAXCONNSESSION`, HTTP 500 por 1–2 min) | Já mitigado pelo transaction pooler (6543) + `connection_limit=1`; validado antes de ir a produção, **sem janela de indisponibilidade** |
| 6 | **`force-dynamic` em 10 das 27 páginas** | Todo deploy passa a servir páginas que consultam o banco por request | Ver [`FINOPS.md`](./FINOPS.md) — impacto de custo |
| 7 | **Sem rollback automatizado** | O rollback é **promover o deployment anterior** no painel (minutos), o que é rápido — mas manual e depende de alguém estar disponível | Documentado em [`../05-security-compliance/INCIDENT_RESPONSE.md`](../05-security-compliance/INCIDENT_RESPONSE.md) §5.6 |
| 8 | **Sem `DIRECT_URL` nos secrets do Actions** | `monthly-snapshot.yml` só injeta `DATABASE_URL`. O backup proposto precisa de `DIRECT_URL` ([`BACKUP_DR.md`](./BACKUP_DR.md) §5) | Adicionar o secret |
| 9 | **Root Directory pode divergir de novo** | Se a estrutura mudar e a configuração não acompanhar, **todo deploy por Git falha** (§2.1) | Verificar após qualquer refactor |
| 10 | **Integração Supabase suspensa volta a bloquear** | Todo deployment falha em < 1 s, sem log (§2.2) | Monitorar `vercel integration list`; o recurso está **desconectado** hoje |

### 5.1 Ordem correta quando há migration

```bash
# 1. Aplicar a migration PRIMEIRO (contra a conexão direta, 5432)
DIRECT_URL="postgresql://…:5432/postgres" npx prisma migrate deploy

# 2. Só então publicar o código que depende do novo schema
git push origin main
```

**Por quê:** `prisma migrate` **não funciona em transaction mode**. Se o código
subir antes da migration, toda rota que toca a coluna nova devolve erro em
produção. A ordem inversa (migration antes do código) é segura porque uma
migration aditiva não quebra o código antigo.

> ⚠️ **Cuidado com migration destrutiva** (drop de coluna/tabela): nesse caso a
> ordem correta é o oposto — código primeiro (que para de usar a coluna), depois
> a migration. Não há automação para isso; é decisão humana.

---

## 6. Verificação pós-deploy

| Passo | Como | Critério |
|---|---|---|
| 1 | Disparar `production-smoke.yml` manualmente | Todos os 5 passos verdes |
| 2 | Abrir `/status` | Não exibe "Indisponível" |
| 3 | Abrir `/ranking` | `200`, com dados, sem página de erro |
| 4 | Conferir um perfil de político | Nota renderizada, Termômetro correto, versão da metodologia = versão do motor |
| 5 | **Verificar headers** | `curl -sI https://www.curriculopolitico.org/` — CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| 6 | Se o deploy mexeu em `/api/*` | Conferir o `429` com `Retry-After` após exceder o limite |
| 7 | Se o deploy mexeu em UI | Conferir em **375 / 768 / 1280 px** (`npm run e2e` cobre desktop e mobile) |

---

## 7. Limites do plano Hobby que afetam o deploy

De [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §5.1 — todos verificados na
documentação oficial da Vercel:

| Limite | Valor | Consequência para deploy |
|---|---|---|
| **Cron** | **1× por dia**; expressão mais frequente **faz o deploy falhar** | É por isso que os crons estão no GitHub Actions — *"não é gambiarra, é a decisão correta"*. Qualquer plano de cron horário **na Vercel** é impossível neste plano |
| **Pay-as-you-go** | **Não existe**: ao estourar uma cota, *"you will have to wait until 30 days have passed"* | Estourar egress = **um mês de plataforma parada**, não uma fatura |
| Transferência | 100 GB | — |
| Origem (build) | 10 GB | — |
| Invocações | 1M | — |
| CPU | **4 CPU-hrs** | — |
| Deploys | 100/dia | — |
| **Logs de runtime** | **1 hora** | Em incidente, os logs somem em 1 h — copiar imediatamente (`INCIDENT_RESPONSE.md` §7) |
| Middleware (Edge) | fair use de **~50 ms de CPU em média** | O middleware cobre quase todas as rotas e roda `getToken()` em `/api/*` — relevante |
| Região | **única** no Hobby | Não é possível multi-região |
| Google OAuth | ✅ Botão ativo — `GOOGLE_CLIENT_ID`/`SECRET` e `NEXT_PUBLIC_GOOGLE_ENABLED=1` configurados | `AUDITORIA_PRODUCAO.md` §6 |

**Gatilho para o Pro (US$ 20/mês, com US$ 20 de crédito):** transferência > 80 GB,
origem > 8 GB, invocações > 800 mil, **ou** aparecimento de receita que não seja
doação. **Anúncio de doação não torna o projeto comercial** — a Fair Use
Guidelines da Vercel diz explicitamente *"Asking for Donations does not fall
under commercial usage"*; o que torna comercial é anúncio, afiliado como
propósito principal, venda de produto/serviço ou pagamento a alguém para
manter o site.

---

## 8. Checklist de deploy

**Antes:**
- [ ] Nenhum `next dev` ativo (ver §4.3)
- [ ] `npm run typecheck` sem erros
- [ ] `npm run verify:scoring` e `verify:identity` verdes
- [ ] `npm run build` limpo
- [ ] Se mexeu em UI: conferido em 375/768/1280 px
- [ ] Se há migration: aplicada **antes**, com `DIRECT_URL`
- [ ] Se mudou variável de ambiente: atualizada na Vercel (Production **e** Preview)

**Durante:**
- [ ] Acompanhar o deployment até `Ready`
- [ ] Se falhar em < 1 s sem log: verificar integração Supabase (§2.2)
- [ ] Se falhar com `routes-manifest.json not found`: verificar Root Directory (§2.1)

**Depois:**
- [ ] `production-smoke.yml` disparado manualmente e verde
- [ ] `/status` e `/ranking` conferidos
- [ ] Headers de segurança conferidos
- [ ] Se mudou CSP/rate limit: testar o `429` com `Retry-After`
- [ ] Registrar o deployment (ID e commit) se a mudança for relevante para compliance

---

## 9. Referências no repositório

- [`AUDITORIA_PRODUCAO.md`](./AUDITORIA_PRODUCAO.md) — **§0.2** (as duas armadilhas de deploy), §0.3 (datação do snapshot), §0.7.5 (pool de conexões), §4 (headers), §5 (rate limit em produção)
- [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §5.1 (limites do Hobby), §5.2 (região), §10 (roadmap aplicado)
- [`PREVIEW_DEPLOYMENT.md`](./PREVIEW_DEPLOYMENT.md) — ambientes de preview
- [`../05-security-compliance/INCIDENT_RESPONSE.md`](../05-security-compliance/INCIDENT_RESPONSE.md) §5.6 — rollback
- [`../../AGENTS.md`](../../AGENTS.md) — verificação obrigatória e armadilhas
- [`../../apps/web/vercel.json`](../../apps/web/vercel.json) — região
