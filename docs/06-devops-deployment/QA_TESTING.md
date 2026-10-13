# QA_TESTING — Estratégia e estado dos testes

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Base:** leitura de [`tests/e2e/`](../../tests/e2e/), [`playwright.config.ts`](../../playwright.config.ts), [`package.json`](../../package.json), `.github/workflows/*.yml`

---

## 1. Resumo honesto

O projeto tem **duas classes de verificação automatizada** e **nenhuma terceira**:

| Camada | Existe? | Volume | Roda em CI? |
|---|---|---|---|
| **Verificadores de motor** (matemática pura) | ✅ | 2 scripts (`verify:scoring`, `verify:identity`) | ✅ **em todo PR** |
| **Testes E2E de browser** (Playwright) | ✅ | 3 specs, 24 casos, × 2 viewports = **48 execuções** | ⚠️ **só o subconjunto `@readonly`**, em workflow agendado (6/6 h), **nunca em PR** |
| **Testes unitários / de integração** | ❌ | **zero** | — |

Isso define o perfil de risco do projeto: **a matemática do índice é muito bem
protegida**; **o comportamento HTTP e de dados não é protegido de forma alguma**.

---

## 2. Verificadores de motor (a defesa mais forte)

Executados via `tsx`, sem navegador e **sem banco** — por isso são rápidos e
rodam no gate de PR.

### 2.1 `npm run verify:scoring`

[`apps/pipeline/scripts/verify-scoring.ts`](../../apps/pipeline/scripts/verify-scoring.ts)
(`package.json` raiz L27)

| O que verifica | Por que importa |
|---|---|
| Soma dos pesos = **1.0** nos dois perfis | Um conjunto de pesos que não fecha em 100% é defeito de metodologia |
| **Teto 39.9** para condenados / contas rejeitadas | É a trava de integridade prometida em `/metodologia` e no README |
| Termômetro **GREEN / YELLOW / RED / GRAY** | As 4 faixas de confiabilidade exibidas na UI |
| Rejeição de **métricas inválidas** | Entrada fora de faixa não pode produzir nota silenciosamente errada |

Também é a verificação que protege a **neutralidade algorítmica** na prática: os
pesos e as fórmulas vêm de `packages/idip/src/scoring.ts`, e a UI não pode
redigitá-los (`AGENTS.md`, regra 3).

> ⚠️ **Nota de estado:** no momento da leitura, `apps/pipeline/scripts/verify-scoring.ts`
> estava com **alterações não commitadas** (`git status`). A verificação acima é
> do conteúdo em disco.

### 2.2 `npm run verify:identity`

[`apps/pipeline/scripts/verify-identity.ts`](../../apps/pipeline/scripts/verify-identity.ts)
(`package.json` raiz L28) — valida o motor de **resolução de identidade** em
`packages/idip`. É o motor que casa a mesma pessoa entre Câmara, Senado e TSE.
**Relevância jurídica direta:** é o mecanismo cuja falha produz **homonímia** —
o maior risco do projeto ([`../05-security-compliance/COMPLIANCE.md`](../05-security-compliance/COMPLIANCE.md) §7.3).

### 2.3 O que os verificadores **não** cobrem

- Não há teste de **homonímia adversarial** (mesmo nome em UFs diferentes, nome
  com/sem acento) — o anexo de fontes §7.5 lista esses casos como exigência
- Nenhum deles toca banco: não validam leitura/escrita real
- Não cobrem o motor do IDIP-STF (Judiciário) explicitamente além dos pesos

---

## 3. Suíte E2E (Playwright) — 24 casos × 2 viewports = 48

### 3.1 Configuração

[`playwright.config.ts`](../../playwright.config.ts):

| Aspecto | Valor | Justificativa (do próprio arquivo) |
|---|---|---|
| `testDir` | `./tests/e2e` | — |
| **Projetos** | `desktop` (1440×900) e `mobile` (390×844) | O público é majoritariamente celular |
| **Browser** | `channel: "chrome"` — **Chrome do sistema** | Evita ~280 MB de download; não usa `playwright install` |
| `colorScheme` | `dark` | O tema é dark fixo; simular `prefers-color-scheme` esconderia problemas reais de contraste |
| **`webServer`** | `npm run dev --workspace @cp/web -- -p 3033` | **Porta 3033 de propósito**: a 3000 é disputada por outros projetos da máquina, e o `next dev` troca de porta sozinho, derrubando a suíte com `ERR_CONNECTION_REFUSED` no meio da execução |
| `reuseExistingServer` | `false` | Testar o código atual, não um servidor antigo de pé |
| `timeout` do servidor | 180 s | O primeiro `next dev` compila middleware e instrumentation; 12 s dava falso negativo |
| `workers` | 1 em CI, 2 local | O servidor local compartilha um Postgres; paralelismo alto só gera flake |
| `retries` | 1 em CI, 0 local | — |
| Alvo de produção | `E2E_BASE_URL` + `E2E_NO_SERVER=1` | Nesse modo, **só `@readonly`** deve rodar (não há banco de teste sob controle) |

**Contagem:** 12 casos em `home.spec.ts` + 9 em `seo.spec.ts` + 3 em
`acessibilidade.spec.ts` = **24 por projeto** × 2 projetos = **48 execuções**.

### 3.2 `acessibilidade.spec.ts` — 3 casos

Auditoria com **axe-core** (`@axe-core/playwright`) nas páginas de maior
tráfego: `/`, `/ranking`, `/metodologia`. Exige **zero violações**.

**Detalhe que quase todos erram (declarado no próprio spec):** o exemplo da
documentação do Playwright usa apenas `wcag2a, wcag2aa, wcag21a, wcag21aa` —
isso é **WCAG 2.1**. Como o requisito do projeto é **2.2 AA**, a tag `wcag22aa`
precisa estar na lista, senão o teste dá falsa sensação de conformidade. A
constante do repositório inclui as cinco tags.

**Valor histórico comprovado:** a varredura encontrou **duas falhas reais de
contraste** que passaram despercebidas por revisão humana — o CTA do hero a
**2,71:1** e `text-slate-500` a **4,23:1** em 167 lugares.

**Limite honesto, escrito pelo próprio autor:** teste automatizado detecta uma
**minoria** dos problemas de acessibilidade (ordem de grandeza: **um terço**) e
**não cobre regiões ocultas** — modais, menus fechados, conteúdo que exige
interação. "Ele é um piso, não uma certificação."

### 3.3 `home.spec.ts` — 12 casos

Três grupos:

**a) Consistência UI ↔ motor IDIP** (3 casos) — *a razão de existir do arquivo*.
O cabeçalho do spec é explícito: existe uma classe de defeito que **nem o
TypeScript nem os verificadores de matemática pegam** — "a página afirma algo que
o motor não faz". Já aconteceu: a home anunciava "IDIP v1.0" com pesos antigos
enquanto o motor rodava v1.1.

| Caso | Verificação |
|---|---|
| Versão exibida = versão do motor | Lê `packages/idip/package.json`, extrai major.minor, exige `Metodologia IDIP v{versão}` visível |
| Nenhuma versão obsoleta | Extrai **todos** os matches de `IDIP vX.Y` do HTML e exige que nenhum difira do atual |
| Soma dos pesos | Exige o texto "Soma dos pesos:" **3 vezes** (Legislativo, Executivo, Judiciário) e "100%" visível |

Nota de manutenção registrada no spec: a asserção anterior usava
`locator("div").filter({ hasText: /^Legislativo/ })`, que casava com um wrapper
externo e **falhava sem haver bug no produto** — teste frágil, corrigido para
ancorar no texto exato.

**b) Funil da home** (3 casos)

| Caso | Verificação |
|---|---|
| Quatro estágios na ordem | `h1` único contendo "currículo dele sim"; promessa visível; CTA primário linkando `/ranking` |
| **Contraste AA do CTA** | Calcula a razão de contraste **por luminância relativa** a partir de `getComputedStyle`. Regressão específica: o CTA já foi branco sobre `sky-500` = **2,71:1**. Exige ≥ 4,5:1 |
| Navegável por teclado | Até 40 `Tab`s; exige alcançar o CTA |

**c) Rotas críticas** (6 casos, parametrizados) — `/`, `/ranking`, `/partidos`,
`/projetos`, `/metodologia`, `/comparar`: cada uma exige `200` e **exatamente 1 `h1`**.

### 3.4 `seo.spec.ts` — 9 casos

| Grupo | Casos |
|---|---|
| **SEO** (7) | `robots.txt` existe e anuncia o **índice** do sitemap (`Sitemap: …/sitemap.xml`), tem `Allow: /`, `Disallow: /conta`, `Disallow: /api/`; `sitemap.xml` é `sitemapindex` (não `urlset`) com URLs sob `/sitemap/N.xml`; `/sitemap/0.xml` traz home, `/ranking`, perfil de político e de partido; `/sitemap/1.xml` traz **apenas** `/projetos/` (garante que a paginação não misturou grupos); sitemap fora da faixa devolve **`404`**, não XML vazio; `/icon.svg` existe; a home declara canonical e `og:title`/`og:locale=pt_BR` |
| **Estrutura de navegação** (1) | A marca do header volta para a home (`href="/"`) e o clique navega |
| **Título** (1) | O título da home não duplica o sufixo do template (≤ 1 ocorrência de "Currículo Político") |

> O caso do sitemap vazio tem uma justificativa de produto no comentário:
> *"um sitemap vazio declarado é pior que ausente: o crawler o considera válido e
> para de procurar."*

### 3.5 A convenção `@readonly`

Todos os testes de `home.spec.ts`, `seo.spec.ts` e `acessibilidade.spec.ts` estão
marcados `@readonly` — **nenhum escreve no banco**. Isso é o que permite rodá-los
**contra produção** ([`a11y.yml`](../../.github/workflows/a11y.yml)) com
`E2E_NO_SERVER=1`, e é a razão de a suíte ser segura. O custo dessa escolha está
na §4.

---

## 4. Lacunas reais (o que **não** é testado)

Esta é a parte que importa. Nada abaixo é hipotético.

| # | Lacuna | Consequência concreta | Severidade |
|---|---|---|---|
| 1 | **Zero testes unitários** | Não há Vitest/Jest no projeto. Lógica de rota, validação de payload, parsing e regras de negócio não têm teste. `AVALIACAO_ALTERNATIVAS.md` §9 lista isso como lacuna "Zero testes automatizados" | **Alta** |
| 2 | **Zero E2E de fluxo autenticado** | **Nenhum** teste cobre: cadastro, login, aceite de Termos, consentimento político, voto FAVOR/CONTRA, revogação de consentimento, exclusão de conta. São exatamente as rotas que tratam **dado sensível** | **Alta** |
| 3 | **Nenhuma query é exercitada em CI** | O `build` roda com `DATABASE_URL` falsa. Um `where` inválido, um campo renomeado ou um erro de Prisma **passam no gate** e só aparecem em produção ([`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) §2.1) | **Alta** |
| 4 | **Nenhuma migration é aplicada em CI** | `prisma generate` valida a sintaxe do schema, **não** que `prisma migrate deploy` funciona. *Drift* entre schema e banco passa despercebido | **Alta** |
| 5 | **Sem teste de restore de backup** | Não existe backup; quando existir, "backup não testado não é backup" ([`BACKUP_DR.md`](./BACKUP_DR.md)) | **Alta** |
| 6 | **`a11y.yml` não roda em PR** | PR que quebra acessibilidade ou faz a UI divergir do motor **passa no gate** e só é detectado até **6 h depois**, em produção | **Alta** |
| 7 | **Testes dependentes de produção** | Consistência, SEO e a11y rodam contra o **deploy real**. Um deploy quebrado faz a suíte falhar por motivo que não é o código testado; e o ambiente de produção não é controlado (rate limit por IP do runner, dados que mudam) | Média |
| 8 | **Sem teste das rotas de API públicas** | `/api/search`, `/api/rankings`, `/api/bills`, `/api/compare`, `/api/politicians/[id]` só são tocados pelo smoke de 6 h (2 delas) e por nenhum teste de contrato | Média |
| 9 | **Sem teste de erro/degradação** | Nenhum teste cobre `BANCO_INDISPONIVEL`, `404`, `429` com `Retry-After`, `403 CONSENT_REQUIRED`, `409 EMAIL_EM_USO`. O anexo §9 registra `catch {}` em **8 rotas** que engolem o erro real — **nada** verifica o comportamento nesse caminho | Média |
| 10 | **Sem cobertura de código** | Não há métrica de cobertura (não há teste unitário a medir), então não se sabe o tamanho real do buraco | Média |
| 11 | **Sem teste de acessibilidade além de 3 páginas** | `/politicos/[id]` (a página de maior valor), `/projetos`, `/comparar`, formulários e modais não são auditados | Média |
| 12 | **Sem teste de performance / regressão de egress** | A otimização de `/ranking` (1,5 MB → 270 KB) foi medida **manualmente** em produção, não é teste | Média |
| 13 | **Cobertura mobile limitada ao mesmo conjunto** | Os 2 viewports rodam os **mesmos** casos; não há teste específico de comportamento responsivo (menu mobile, tabelas largas) | Baixa |
| 14 | **Sem teste de visual regression** | Existe `.design-review/capture.cjs` e `npm run design:detect`/`design:axe`, mas o baseline de captura é **por plataforma** e não é executado em CI | Baixa |

---

## 5. Ambiente de teste

| Item | Estado |
|---|---|
| Banco de teste dedicado | ❌ Não existe. Local usa o Postgres do `docker compose` (**porta 15432**); produção usa Supabase `sa-east-1` |
| Fixtures / seed de teste | `npm run db:seed` cria **3 perfis fictícios** (GREEN, YELLOW, RED). **Recusa** rodar contra banco remoto, salvo `CP_ALLOW_REMOTE_SEED=1` |
| Redis | ❌ Previsto (`docker-compose.yml` porta **16379**), **não usado** por nenhum código (`REDIS_URL` está comentado em `.env.example`) |
| Python / ETL | `docker-compose.yml` não instala Python; nenhum workflow roda `etl:*` |
| Isolamento entre testes | Nenhum — os testes `@readonly` não escrevem, então não há o que isolar |
| Dados sensíveis em teste | Nenhum; a suíte não autentica nem cria conta |

> ⚠️ **Atenção crítica sobre `DATABASE_URL`:** `AGENTS.md` e
> `.env.example` registram que **todo script de dados grava no banco que a
> variável apontar — inclusive produção**, e que o `.env` local já apontou para
> o Supabase de produção. Hoje, **apenas `db:seed` tem guarda**. Qualquer novo
> teste de integração que escreva deve usar o banco local.

---

## 6. Como executar

```bash
# Suíte completa (sobe o servidor na 3033)
npm run e2e

# Modo interativo
npm run e2e:ui

# Só os testes seguros contra um alvo remoto (produção)
npm run e2e:prod                 # equivale a: playwright test --grep @readonly
# exigem também: E2E_BASE_URL=https://www.curriculopolitico.org  E2E_NO_SERVER=1

# Verificadores de motor (rodam no CI)
npm run verify:scoring
npm run verify:identity

# Pré-requisito: banco local de pé
docker compose up -d db
```

---

## 7. Plano proposto (por ordem de retorno)

| # | Ação | Fecha lacuna | Esforço |
|---|---|---|---|
| 1 | **`a11y.yml` também em `pull_request`** | 6 | horas |
| 2 | **Rodar a suíte E2E local em PR** (servidor 3033 + Postgres do compose) | 7, 8 | 1 dia |
| 3 | **Vitest** nos motores e nas rotas de API | 1, 10 | 2–3 dias |
| 4 | **E2E autenticado** contra banco efêmero: cadastro → consentir → votar → revogar → excluir | 2 | 2–3 dias |
| 5 | **Postgres de serviço no `ci.yml`** + `prisma migrate deploy` | 3, 4 | 1 dia |
| 6 | **Testes de contrato das APIs públicas** (status, forma do JSON, `429` com `Retry-After`) | 8, 9 | 1–2 dias |
| 7 | **Workflow de restore de backup** (quando o backup existir) | 5 | 1 dia |
| 8 | Estender a auditoria de acessibilidade a `/politicos/[id]` e `/projetos` | 11 | horas |
| 9 | Substituir `catch {}` silenciosos por log com causa real e status correto | 9 | 1 dia |
| 10 | Testes adversariais de homonímia para `verify:identity` | (motor) | 1 dia |

---

## 8. Referências no repositório

- [`../../tests/e2e/acessibilidade.spec.ts`](../../tests/e2e/acessibilidade.spec.ts) · [`home.spec.ts`](../../tests/e2e/home.spec.ts) · [`seo.spec.ts`](../../tests/e2e/seo.spec.ts)
- [`../../playwright.config.ts`](../../playwright.config.ts) — configuração e justificativas
- [`../../apps/pipeline/scripts/verify-scoring.ts`](../../apps/pipeline/scripts/verify-scoring.ts) · [`verify-identity.ts`](../../apps/pipeline/scripts/verify-identity.ts)
- [`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) — como (e quando) os testes rodam no pipeline
- [`CODE_REVIEW.md`](./CODE_REVIEW.md) §4 — checklist de pré-PR
- [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §9 (Frente G) — lacunas de engenharia medidas
