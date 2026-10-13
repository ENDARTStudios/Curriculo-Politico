# CI_CD_PIPELINE — Integração e entrega contínuas

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Fonte:** leitura dos 4 workflows em [`.github/workflows/`](../../.github/workflows/) e do [`package.json`](../../package.json) raiz
**Documentos irmãos:** [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md) · [`PREVIEW_DEPLOYMENT.md`](./PREVIEW_DEPLOYMENT.md) · [`QA_TESTING.md`](./QA_TESTING.md)

---

## 1. Visão geral

São **4 workflows**, com propósitos distintos e gatilhos distintos. Nenhum deles
faz deploy da aplicação — o deploy é feito pela **integração Git da Vercel**
(ver [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md)).

| Workflow | Arquivo | Gatilho | Alvo | Duração esperada |
|---|---|---|---|---|
| **CI** | [`ci.yml`](../../.github/workflows/ci.yml) | `push` em `main` + todo `pull_request` | Build local, **sem banco** | ~1 min (estimado no anexo de engenharia) |
| **Monthly Score Snapshot** | [`monthly-snapshot.yml`](../../.github/workflows/monthly-snapshot.yml) | `cron '0 3 1 * *'` (dia 1, 03:00 UTC) + manual | **Banco de produção** | minutos |
| **Production Smoke Test** | [`production-smoke.yml`](../../.github/workflows/production-smoke.yml) | `cron '0 */6 * * *'` (a cada 6 h) + manual | **Produção (HTTPS)** | segundos |
| **Acessibilidade (WCAG 2.2 AA)** | [`a11y.yml`](../../.github/workflows/a11y.yml) | `cron '30 */6 * * *'` + manual | **Produção (HTTPS)** | minutos |

**Gates reais:** apenas o `ci.yml` roda em `pull_request` — os outros três são
agendados/manuais. Ou seja: **o único gate de merge é o `ci.yml`**, e ele roda
sem banco e sem browser.

---

## 2. `ci.yml` — o gate de PR

```yaml
on:
  push: { branches: [main] }
  pull_request:
```

| Passo | Comando | O que valida | O que **não** valida |
|---|---|---|---|
| 1 | `actions/checkout@v4` | — | — |
| 2 | `actions/setup-node@v4` (node 24, cache npm) | — | — |
| 3 | `npm ci` | Lockfile instalável e íntegro | Vulnerabilidades de dependência (não há `npm audit`) |
| 4 | `npx prisma generate --schema=apps/web/prisma/schema.prisma` | **Schema Prisma é sintaticamente válido e gera cliente** | Se as **migrations** correspondem ao schema; se há migration pendente |
| 5 | `npm run typecheck` → `tsc --noEmit` (workspace `@cp/web`) | Tipos estritos em `apps/web` | Tipos em `apps/pipeline` (que é `tsx`, não passa por `tsc`) nem em `packages/idip` |
| 6 | `npm run verify:scoring` | Soma dos pesos = 1.0 nos perfis, teto 39.9 para condenados/contas rejeitadas, termômetro GREEN/YELLOW/RED/GRAY, rejeição de métricas inválidas | Que a **UI** exiba a mesma versão/pesos que o motor |
| 7 | `npm run verify:identity` | Motor de resolução de identidade | — |
| 8 | `npm run build` (`prisma generate && next build`) | Build de produção compila | Que o site **funcione** — o build roda **sem banco** |

### 2.1 A decisão estruturante: o CI não tem banco

```yaml
# ci.yml L36–38
env:
  DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci"
  DIRECT_URL: "postgresql://ci:ci@localhost:5432/ci"
```

Não há serviço Postgres no job. As URLs são strings **falsas** — servem apenas
para o Prisma Client inicializar durante o `build`. Duas consequências que
atravessam todo o projeto:

1. **A raiz do `force-dynamic`.** Como o build não pode consultar dados, as
   páginas que dependem de banco **não podem ser pré-renderizadas** — e o custo
   disso é o gargalo de egress e latência analisado em
   [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §2.3 ("10 das 27
   páginas declaram `force-dynamic` e o build marca 13 das 27 como dinâmicas").
2. **Nenhuma query é testada.** Um erro de SQL, um campo renomeado ou um
   `where` inválido **passa pelo CI** e só aparece em runtime. É a lacuna mais
   material deste pipeline.

### 2.2 Portas que não têm gate

| Porta | Existe no repositório? | Roda no CI? |
|---|---|---|
| `npm run e2e` (Playwright, 3 specs) | ✅ [`playwright.config.ts`](../../playwright.config.ts) | ❌ **Nenhuma execução em CI.** Use `a11y.yml` para o subconjunto `@readonly` |
| `npm run design:axe` (`.design-review/axe.cjs`) | ✅ | ❌ |
| `npm run design:detect` (`impeccable`) | ✅ | ❌ |
| `npm run db:migrate` / `prisma migrate deploy` | ✅ | ❌ **Nunca executado em CI** — não há verificação de que as migrations aplicam em banco limpo |
| `npm run etl:*` (Python) | ✅ | ❌ Nenhum workflow instala Python nem roda o ETL |
| Lint (`eslint`) | ❌ **Não existe script de lint** no `package.json` | — |
| `npm audit` | — | ❌ (a análise de 2026-10-12 em `AVALIACAO_ALTERNATIVAS.md` §2.7 foi **manual**) |
| Secret scanning / Dependabot / SBOM | ❌ Não há configuração | — |
| Restore de backup | ❌ Não existe backup | — |

---

## 3. `monthly-snapshot.yml` — o único workflow que escreve em produção

```yaml
on:
  schedule: [{ cron: '0 3 1 * *' }]   # dia 1, 03:00 UTC = 00:00 BRT
  workflow_dispatch:
```

| Passo | Detalhe |
|---|---|
| `npm ci` + `prisma generate` | Setup idêntico ao CI |
| `npm run db:snapshot` com `DATABASE_URL: ${{ secrets.DATABASE_URL }}` | Executa `snapshot-scores.ts` — **insere `ScoreSnapshot` em produção** |
| `npx tsx apps/pipeline/scripts/verify-snapshot.ts` com o mesmo secret | Verifica que o snapshot foi criado |

**O que este workflow valida:** que o snapshot do mês foi gravado e é
verificável. É a garantia da série temporal histórica do IDIP — ativo **não
reconstruível retroativamente** com fidelidade.

**Observações relevantes:**

1. **Não usa `DIRECT_URL`.** Apenas `DATABASE_URL` é injetada. O schema declara
   `directUrl = env("DIRECT_URL")`, mas scripts que só fazem `create`/`read`
   funcionam pelo pooler em transaction mode (6543). É coerente, mas significa
   que **a variável de ETL não é exercitada em CI**.
2. **Idempotência é o que impede duplicata.** A datação canônica foi corrigida
   em 2026-10-12 (`AUDITORIA_PRODUCAO.md` §0.3): o módulo
   `apps/pipeline/scripts/snapshot-date.ts` define o **primeiro dia do mês
   corrente à meia-noite UTC**, consumido por `snapshot-scores.ts` e
   `verify-snapshot.ts`. Antes disso havia duplicata de mês e data futura.
   A verificação é pelo `@@unique([termId, snapshotDate])` do schema.
3. **Não há alerta de falha.** Se o cron falhar, o workflow fica vermelho no
   Actions e **ninguém é notificado** — não há heartbeat (Healthchecks.io,
   Sentry Cron) nem notificação. Um mês sem snapshot seria descoberto por acaso.
4. **O secret dá escrita em produção.** É a variável mais poderosa do projeto
   (`THREAT_MODELING.md` A3/T2).

---

## 4. `production-smoke.yml` — saúde do deploy em 6/6 h

```yaml
env:
  PROD_URL: ${{ vars.PROD_URL || 'https://www.curriculopolitico.org' }}
```

| Verificação | Comando | Critério |
|---|---|---|
| Home responde | `curl -sL -o /dev/null -w "%{http_code}"` | `200` |
| `/ranking` responde | idem | `200` |
| `/api/search?q=lula` encontra parlamentar | `python3 -c 'json…d.get("total",0)'` | `total >= 1` |
| `/api/rankings?limit=5` tem dados | `python3` | `len(ranking) >= 1` |
| `/status` não degradado | `grep -q "Indisponível"` | ausência da string |

**O que isso cobre bem:** o caminho crítico de leitura e, indiretamente, a
conectividade com o banco (as duas checagens de API falham se o banco cair ou se
o pool esgotar — o sintoma histórico `EMAXCONNSESSION`).

**Limitações honestas:**

1. **Não cobre nenhuma rota autenticada** — não há login no smoke.
2. **Não cobre escrita** (nenhum `POST`), nem `/api/retificacao`.
3. **`www` é obrigatório no default** e o comentário explica: o apex responde
   `308` e o teste validaria redirect. Se `vars.PROD_URL` for configurado como
   apex, o smoke mede a coisa errada.
4. **A checagem de `/status` é frágil:**
   ```bash
   echo "$body" | grep -q "Indisponível" && (echo "FAIL …" && exit 1) || echo "status OK"
   ```
   O `||` cobre o caso de o `grep` falhar (o esperado), mas **também** marca como
   OK qualquer resposta que não contenha a string — inclusive uma página de erro
   de outro tipo, ou HTML que não renderizou. Um `curl` que devolva `500` com
   corpo diferente passa como "status OK". O código HTTP de `/status` **não** é
   verificado.
5. **O smoke não valida conteúdo numérico.** Como o próprio `AGENTS.md` prescreve,
   "nenhum número exibido sem consulta real ao banco" — mas nada no CI impede que
   a home exiba um valor obsoleto, **exceto** o teste de versão da metodologia em
   `tests/e2e/home.spec.ts`, que roda no `a11y.yml`.
6. **Sem retry e sem baseline.** Um `200` intermitente passa; um `429` por rate
   limit (se o IP do runner já consumiu cota) falha. Não há detecção de
   degradação gradual (latência).

---

## 5. `a11y.yml` — acessibilidade e funil contra produção

**Decisão declarada no cabeçalho do arquivo:** a suíte roda em workflow
**separado** porque o `ci.yml` é o gate de PR e precisa ser rápido; uma suíte de
browser traria flakiness para o caminho crítico. O alvo é **produção**, "que é
exatamente o ambiente cujo estado queremos afirmar".

```yaml
env:
  E2E_BASE_URL: ${{ vars.PROD_URL || 'https://www.curriculopolitico.org' }}
  E2E_NO_SERVER: '1'
steps: … npx playwright install --with-deps chrome
       … npx playwright test --grep @readonly --reporter=list
```

| O que roda | Spec | Conteúdo |
|---|---|---|
| Acessibilidade WCAG 2.2 AA | [`tests/e2e/acessibilidade.spec.ts`](../../tests/e2e/acessibilidade.spec.ts) | axe-core com tags `wcag2a, wcag2aa, wcag21a, wcag21aa, **wcag22aa**` em `/`, `/ranking`, `/metodologia`; exige **zero violações** |
| Consistência UI ↔ motor | [`tests/e2e/home.spec.ts`](../../tests/e2e/home.spec.ts) | Versão do IDIP exibida = `packages/idip/package.json`; **nenhuma** versão obsoleta no HTML; soma dos pesos; 3 perfis |
| Funil e teclado | idem | h1 único, CTA primário, contraste AA do CTA calculado por luminância, CTA alcançável por `Tab` |
| Rotas críticas | idem | 6 rotas com `200` e exatamente 1 `h1` |
| SEO | [`tests/e2e/seo.spec.ts`](../../tests/e2e/seo.spec.ts) | `robots.txt` (com `Disallow: /conta` e `/api/`), `sitemapindex`, `/sitemap/0.xml`, `/sitemap/1.xml`, `404` para sitemap fora da faixa, `/icon.svg`, canonical+OG, título sem sufixo duplicado, marca do header volta para a home |

**Valor real:** este é o workflow que protege as duas promessas de produto
declaradas em [`AGENTS.md`](../../AGENTS.md) — "acessibilidade AA é requisito" e
"dados honestos, nenhum número sem consulta real". O teste de versão do motor
existe porque **o defeito já aconteceu** (a home dizia v1.0 com o motor em v1.1).
É a única defesa automatizada contra a classe de erro "a tela afirma algo que o
motor não faz".

**Limitações honestas:**

1. **Roda só `@readonly`.** Nenhuma asserção escreve no banco — o que é correto
   contra produção, mas significa que **todo o caminho autenticado e de escrita
   fica fora**.
2. **Não roda em `pull_request`.** Um PR que quebra acessibilidade **passa no
   gate** e só é pego **até 6 h depois**, já em produção.
3. **O relatório vai como artifact de 14 dias** (`upload-artifact`, `retention-days: 14`)
   e não há notificação — a falha é vista por quem abrir o Actions.
4. **A suíte usa `waitUntil: "networkidle"`** nos testes de acessibilidade, em
   produção: é a espera mais propensa a flakiness do conjunto.
5. **Cobre 3 páginas** de acessibilidade (`/`, `/ranking`, `/metodologia`) — não
   cobre perfil de político, `/projetos`, `/comparar`, formulários nem modais
   (o próprio comentário do spec declara que teste automatizado pega ~1/3 dos
   problemas e não vê conteúdo oculto).

---

## 6. O que **não** é validado hoje (consolidado)

Esta é a lista que importa para decidir o próximo investimento em pipeline.

| # | Lacuna | Consequência real | Onde dói |
|---|---|---|---|
| 1 | **Nenhuma query roda em CI** | Erro de Prisma/SQL só aparece em runtime, em produção | `ci.yml` roda com banco falso |
| 2 | **Nenhuma migration é aplicada em CI** | `prisma migrate deploy` pode falhar em produção sem aviso; *drift* entre schema e banco passa despercebido | `ci.yml` só faz `prisma generate` |
| 3 | **Nenhum teste unitário** | Não há Vitest/Jest no projeto; a lógica de rotas não é testada | `QA_TESTING.md` §4 |
| 4 | **Nenhum E2E de fluxo autenticado** | Login, consentimento, voto, revogação e exclusão de conta **não têm teste** — e são justamente as rotas de dado sensível | `QA_TESTING.md` §4 |
| 5 | **Nenhum teste de restauração de backup** | Não existe backup; quando existir, não haverá teste | `BACKUP_DR.md` |
| 6 | **Sem lint** | Não há script `lint` no `package.json` | — |
| 7 | **Sem `npm audit` no pipeline** | Vulnerabilidade de dependência entra silenciosamente; a análise foi manual e única | `AVALIACAO_ALTERNATIVAS.md` §2.7 |
| 8 | **Sem Dependabot/Renovate** | Atualização de dependência depende de alguém lembrar (o `next` foi de 15.5.0 a 15.5.27 manualmente) | — |
| 9 | **Sem secret scanning / push protection** | Um `.env` commitado passaria | Verificado hoje: `.env` nunca entrou no histórico |
| 10 | **Sem SBOM / proveniência de build** | Sem rastreabilidade de artefato | — |
| 11 | **Sem alerta de falha de cron** | Um mês sem snapshot passa em branco | `monthly-snapshot.yml` |
| 12 | **Sem verificação de integridade dos dados** | Ninguém percebe `UPDATE`/`DELETE` em massa | `THREAT_MODELING.md` B-06/R4 |
| 13 | **Sem cobertura de código** | Não há métrica de cobertura (não há teste unitário a medir) | — |
| 14 | **Sem deploy condicionado a aprovação** | Ver [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md) §5 | — |

---

## 7. Próximos passos propostos (ordenados por retorno)

| # | Ação | Fecha | Esforço |
|---|---|---|---|
| 1 | **Adicionar serviço Postgres ao `ci.yml`** e rodar `prisma migrate deploy` + `prisma db seed` em banco efêmero | Lacunas 1 e 2 — as mais materiais | 1 dia |
| 2 | **Rodar o `a11y.yml` também em `pull_request`** (ou o subconjunto de consistência, que não depende de rede) | Lacuna de gate de acessibilidade | horas |
| 3 | **Vitest** nos motores e nas rotas de API, com banco efêmero | Lacuna 3 | 2–3 dias |
| 4 | **E2E autenticado** contra banco efêmero (não produção): cadastro → consentir → votar → revogar → excluir | Lacuna 4 | 2–3 dias |
| 5 | **`npm audit --omit=dev` + Dependabot** no workflow | Lacunas 7 e 8 | horas |
| 6 | **Heartbeat do snapshot** (Healthchecks.io ou equivalente) com alerta | Lacuna 11 | horas |
| 7 | **Workflow de `pg_dump` + teste de restore** | Lacuna 5 · ver [`BACKUP_DR.md`](./BACKUP_DR.md) | ~2 h + teste |
| 8 | **Script de lint** (`next lint`/`eslint`) como passo do `ci.yml` | Lacuna 6 | horas |

---

## 8. Conclusão

O pipeline atual é **enxuto e correto para o que se propõe**: valida tipos,
matemática do motor, build e a saúde do deploy em produção a cada 6 horas, com
zero segredo de banco no gate de PR. A separação entre `ci.yml` (rápido, sem
banco) e `a11y.yml` (browser, contra produção) é uma decisão **justificada no
próprio arquivo** e defensável.

O que ele **não** faz é o que mais dói: **não executa nenhuma consulta nem
nenhuma migration**. Todo o caminho de dados — que é o produto — é validado
apenas em produção, manualmente. Esse é o investimento de maior retorno na
próxima fase do CI.
