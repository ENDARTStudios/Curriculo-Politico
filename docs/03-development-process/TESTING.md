# Testes e verificação

O que é verificado neste projeto, por qual mecanismo, e — tão importante quanto —
o que **não** é verificado. A seção de lacunas é parte do documento, não uma nota
de rodapé.

Escopo: [DEVELOPMENT.md](DEVELOPMENT.md) (processo),
[ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md) (o gate de a11y em
detalhe), [TASKS.md](TASKS.md) (as lacunas como tarefas).

## 1. Panorama

| Camada | Mecanismo | Onde | Roda no CI |
|---|---|---|---|
| Schema Prisma | `prisma generate` (valida o schema) | `.github/workflows/ci.yml` | ✅ |
| Tipos | `tsc --noEmit` | `npm run typecheck` | ✅ |
| Motor IDIP | Script próprio, sem banco | `apps/pipeline/scripts/verify-scoring.ts` | ✅ |
| Motor de identidade | Script próprio, sem banco | `apps/pipeline/scripts/verify-identity.ts` | ✅ |
| Build de produção | `prisma generate && next build` | `npm run build` | ✅ |
| Páginas renderizadas | Playwright, **48 testes em 3 arquivos** | `tests/e2e/` | ❌ (workflow separado) |
| Acessibilidade AA | axe-core com tags WCAG 2.2 | `tests/e2e/acessibilidade.spec.ts` | ✅ via `a11y.yml`, contra produção |
| SEO | Playwright `request`/`page` | `tests/e2e/seo.spec.ts` | ✅ via `a11y.yml` |
| UI/DOM (contraste, teclado, overflow) | Playwright + scripts de medição | `tests/e2e/home.spec.ts`, `.design-review/` | parcial |
| Smoke de produção | `curl` a cada 6h | `.github/workflows/production-smoke.yml` | ✅ agendado |
| Snapshot mensal | Script + verificação | `.github/workflows/monthly-snapshot.yml` | ✅ agendado |
| Anti-padrões de UI | Detector determinístico | `npx impeccable detect apps/web/src` | ❌ (local) |
| **Rotas de API (unitário)** | **não existe** | — | — |
| **Componentes isolados** | **não existe** | — | — |

Contagem de testes confirmada executando `npx playwright test --list`:
**48 testes em 3 arquivos**.

## 2. O gate de PR: `.github/workflows/ci.yml`

Roda em `push` para `main` e em **todo pull request**. É rápido de propósito —
sem banco real e sem browser — para poder ser o caminho crítico:

```yaml
- npm ci
- npx prisma generate --schema=apps/web/prisma/schema.prisma
- npm run typecheck
- npm run verify:scoring
- npm run verify:identity
- npm run build
  env:
    DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci"
    DIRECT_URL:   "postgresql://ci:ci@localhost:5432/ci"
```

**Detalhe que decide o desenho do resto:** o build do CI roda com um
`DATABASE_URL` **falso**, sem banco. Consequência registrada na avaliação de
alternativas: as páginas que dependem de dados **não podem** ser pré-renderizadas
no build, e é por isso que 10 das 27 páginas declaram `force-dynamic`. Não é
preferência — é consequência do gate.

### Equivalente local

```bash
npx prisma generate --schema=apps/web/prisma/schema.prisma
npm run typecheck
npm run verify:scoring
npm run verify:identity
npm run build
```

Rode **com o `next dev` parado**. Os dois compartilham `apps/web/.next` e as
falhas resultantes são intermitentes e enganosas — ver
[DEVELOPMENT.md](DEVELOPMENT.md) §6.1.

## 3. Verificadores dos motores (`verify:*`)

Diferente de um framework de teste: são **scripts TS executados com `tsx`**
(`package.json` raiz), sem runner, sem banco. Saem com exit code não-zero em
falha, o que é tudo o que o CI precisa.

```bash
npm run verify:scoring    # tsx apps/pipeline/scripts/verify-scoring.ts
npm run verify:identity   # tsx apps/pipeline/scripts/verify-identity.ts
```

**O que `verify:scoring` cobre** (`README.md` e o próprio script): soma dos pesos
= 1.0 nos perfis, teto `HARD_CAP = 39.9` para condenados/contas rejeitadas,
termômetro GREEN/YELLOW/RED/GRAY e rejeição de métricas inválidas. Além disso,
uma verificação de sincronia **UI ↔ motor** (identificada como `WEB-001` no
script): a versão exibida em `apps/web/src/lib/methodology.ts` tem de casar com
`version` de `packages/idip/package.json`.

Essa verificação existe por causa de um defeito real: a home anunciava
"IDIP v1.0" com pesos antigos enquanto o motor rodava v1.1. O `verify:scoring`
importa o módulo da UI por caminho relativo justamente para conseguir comparar.

**Regra:** mudança em `packages/idip/src/scoring.ts` ou `identity.ts` exige caso
novo no verificador correspondente. Está em `CONTRIBUTING.md` e em
[RULES.md](RULES.md) §3.

## 4. Suíte Playwright — 48 testes em 3 arquivos

`playwright.config.ts` define dois projetos, `desktop` (1440×900) e `mobile`
(390×844). **24 casos únicos × 2 projetos = 48 execuções.** O público é
majoritariamente celular, e é por isso que mobile não é opcional.

Configuração relevante:

| Ajuste | Valor | Motivo registrado |
|---|---|---|
| `channel` | `"chrome"` | Usa o Chrome do sistema — nenhum download de ~280 MB por browser |
| `colorScheme` | `"dark"` | O tema é dark fixo; sem isso o Chrome pode simular `prefers-color-scheme` e esconder problemas reais de contraste |
| `workers` | `1` no CI, `2` local | O Postgres local é compartilhado; paralelismo alto só gera flake |
| `retries` | `1` no CI | — |
| `timeout` / `globalTimeout` | 45 s / 10 min | — |
| `trace` / `screenshot` | `retain-on-failure` / `only-on-failure` | — |
| porta do `webServer` | **3033** | A 3000 é disputada nesta máquina; o `next dev` troca de porta sozinho e derruba a suíte |
| `reuseExistingServer` | `false` | O objetivo é testar o código atual, não um servidor antigo que ficou de pé |
| `timeout` do webServer | 180 s | O primeiro `next dev` compila middleware e instrumentation; 12 s dava falso negativo |

### Os três arquivos

**`tests/e2e/acessibilidade.spec.ts`** — 3 casos. Auditoria com
`@axe-core/playwright` nas tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`
em **home, `/ranking` e `/metodologia`**. A tag `wcag22aa` é o que faz o teste
valer 2.2 e não 2.1 — o exemplo da documentação do Playwright inclui só as quatro
primeiras. Detalhamento em
[ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md).

**`tests/e2e/seo.spec.ts`** — 9 casos em dois blocos:

- *SEO*: `robots.txt` responde 200 e anuncia `Sitemap: .../sitemap.xml` (o índice,
  não os arquivos internos) com `Allow: /`, `Disallow: /conta` e `Disallow: /api/`;
  `/sitemap.xml` é um **sitemapindex** válido e não um `urlset`; o arquivo base
  `/sitemap/0.xml` traz home, `/ranking`, um perfil e um partido; `/sitemap/1.xml`
  contém **apenas** URLs de `/projetos/` (se contivesse perfis, a paginação teria
  misturado os grupos); id fora da faixa devolve **404, não XML vazio** (sitemap
  vazio declarado é pior que ausente — o crawler o considera válido e para de
  procurar); `/icon.svg` responde 200 com content-type SVG; a home declara
  `link rel=canonical` absoluto, `og:title` e `og:locale = pt_BR`; o título da
  home **não duplica** "Currículo Político" (o template do layout já acrescenta o
  sufixo).
- *Estrutura de navegação*: a marca no header volta para a home (clique real, com
  verificação de URL e de `h1` único na página de destino).

**`tests/e2e/home.spec.ts`** — 12 casos em três blocos:

- *Consistência entre UI e motor IDIP*: a home exibe a versão lida diretamente de
  `packages/idip/package.json`; **nenhuma** menção a `IDIP vX.Y` divergente no HTML
  completo; a home exibe a soma dos pesos dos **três** perfis (Legislativo,
  Executivo e Judiciário — o STF tem pesos próprios porque ministro é nomeado, não
  eleito).
- *Funil da home*: os estágios do funil presentes e na ordem; `h1` único com o
  gancho; **exatamente um** CTA primário levando a `/ranking`; o contraste do CTA
  calculado em tempo real pela fórmula de luminância da WCAG com asserção
  `>= 4.5:1`; e o CTA alcançável por `Tab` (até 40 pressionamentos).
- *Rotas críticas*: `/`, `/ranking`, `/partidos`, `/projetos`, `/metodologia` e
  `/comparar` respondem 200 e renderizam **um** `h1`.

Note o padrão: os testes de consistência **leem o código-fonte** (sem banco) e os
demais são marcados `@readonly`. Isso permite rodar a mesma suíte contra produção.

## 5. Dois alvos: local e produção

```bash
npm run e2e          # sobe o servidor na 3033 e testa local (todos os testes)
npm run e2e:prod     # playwright test --grep @readonly
```

Contra produção, o alvo é definido por variável de ambiente:

```
E2E_BASE_URL=https://www.curriculopolitico.org
E2E_NO_SERVER=1      # não sobe servidor local
```

Só os testes marcados `@readonly` devem rodar nesse modo — não há banco de teste
sob nosso controle à frente, então nenhum teste pode escrever.

**Uso de `www` é deliberado:** o apex responde 308 para `www`; usar o apex faria a
suíte validar o redirect em vez da página.

## 6. Workflow de acessibilidade: `.github/workflows/a11y.yml`

Roda **separado do `ci.yml`**, com justificativa escrita no próprio arquivo: o job
`verify` do CI não tem banco nem browser, o que o mantém rápido; uma suíte de
browser precisa de servidor servindo páginas renderizadas, e colocá-la no caminho
crítico atrasaria todo PR e traria flakiness.

| Item | Valor |
|---|---|
| Gatilhos | `workflow_dispatch` e cron `30 */6 * * *` (30 min depois do smoke de produção, para não competir) |
| Alvo | produção (`vars.PROD_URL` ou `https://www.curriculopolitico.org`) |
| Comando | `npx playwright test --grep @readonly --reporter=list` |
| Extra | `npx playwright install --with-deps chrome` (o runner não tem Chrome) |
| Artefato | `playwright-report/`, retenção 14 dias |

Efeito colateral importante e honesto: **a suíte contra produção só passa depois
que o trabalho é publicado**. Não há teste que faça deploy.

## 7. Smoke de produção: `.github/workflows/production-smoke.yml`

`curl` puro, a cada 6h, contra produção. Cinco verificações:

| Verificação | Critério |
|---|---|
| Home | HTTP 200 |
| `/ranking` | HTTP 200 |
| `GET /api/search?q=lula` | `total >= 1` |
| `GET /api/rankings?limit=5` | `len(ranking) >= 1` |
| `/status` | corpo **não** contém "Indisponível" |

Os dois últimos são os mais valiosos: verificam **dados**, não só disponibilidade.
Uma página que responde 200 com banco vazio passaria nos dois primeiros testes e
falharia nesses.

## 8. Snapshot mensal: `.github/workflows/monthly-snapshot.yml`

Cron `0 3 1 * *` (dia 1, 03:00 UTC / 00:00 BRT). Roda `npm run db:snapshot`
(idempotente) com `DATABASE_URL` vindo de `secrets.DATABASE_URL` e, em seguida,
`npx tsx apps/pipeline/scripts/verify-snapshot.ts` — a verificação é **passo
separado** no workflow, então uma falha ali não é silenciosa.

Nota de histórico: houve um defeito em que snapshots eram formatados em fuso local
e exibiam o mês errado (corrigido no commit `e76f5b0`, "formata snapshots em UTC").

## 9. Revisão de UI fora do Playwright: `.design-review/`

Ferramentaria local, **não é código de produto e não é importada por nada**. Serve
para *ver* a interface e *medir* o que o detector só aponta como existente.

| Arquivo | Serve para | Uso |
|---|---|---|
| `capture.cjs` | Captura em largura exata via Chrome DevTools Protocol (`Emulation.setDeviceMetricsOverride`) **+ mede overflow** | `node .design-review/capture.cjs <url> <largura> <altura> <saida.png> [esperaMs]` |
| `contraste.cjs` | Calcula contraste WCAG da paleta | `node .design-review/contraste.cjs` |
| `linhas.cjs` | Acha **qual** elemento tem linhas longas (>80 chars) | `node .design-review/linhas.cjs <url> [largura]` |
| `axe.cjs` | Violações de acessibilidade em JSON (seletor + HTML) | `node .design-review/axe.cjs <url> [largura]` |
| `build-repro.ps1` | Reprodução do ambiente de build | — |

Requer Chrome escutando em `--remote-debugging-port=9222`.

**Por que `--headless --screenshot` não serve** (registrado no
`.design-review/README.md`): `--window-size` era **ignorado** e a captura saía em
756×481 independentemente do valor pedido. Uma captura com o viewport errado
"prova" um overflow que não existe — foi exatamente o que aconteceu: a conclusão
inicial de que a home quebrava no mobile era artefato do instrumento.
`capture.cjs` impõe o viewport por CDP e **mede** `documentElement.scrollWidth`,
listando cada elemento cujo `right` passa do viewport.

**Critério de aprovação de responsividade:** overflow igual a 0 nas larguras
**320, 390, 768, 1280 e 1440**. As únicas exceções legítimas são os brilhos
decorativos da hero, filhos de um `overflow-hidden` — qualquer outro ofensor é
defeito.

`linhas.cjs` e `axe.cjs` existem porque o detector diz *que* há problema, mas não
*onde*; sem medir o elemento, a correção vira chute.

## 10. Detector de anti-padrões: Impeccable

```bash
npm run design:detect    # impeccable detect apps/web/src
```

Detector determinístico (Apache-2.0, instalado em `.dsh/skills/impeccable/`, com
engine por plataforma). O estado atual é **exit 0, limpo** no código-fonte. Rodou
no projeto e encontrou 3 anti-padrões reais + falhas de contraste.

A engine (~20 MB) está no `.gitignore` porque é baixada automaticamente na
primeira execução e é específica de SO/arquitetura.

## 11. O que a suíte NÃO cobre

Esta seção é obrigatória: um gate superestimado é pior que gate nenhum.

| Lacuna | Detalhe | Tarefa |
|---|---|---|
| **Sem teste unitário de rotas de API** | Nenhum teste chama `/api/*` diretamente. As rotas com mais regras de negócio (`POST /api/bills/[id]/vote` tem 5 ramos de erro; `DELETE /api/consent` apaga votos) não têm cobertura | T-04 |
| **Sem teste de componente** | Nada de Vitest/Jest no projeto | T-04 |
| **A11y em 3 páginas** | Perfis, proposições, partidos, `/comparar`, `/status`, `/stf` ficam fora do gate | T-14 |
| **Regiões ocultas** | Modais, menus fechados e conteúdo que exige interação não são auditados pelo axe. Ordem de grandeza citada no próprio teste: teste automatizado detecta **uma minoria** dos problemas de acessibilidade (cerca de um terço) | [ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md) §6 |
| **Animação JS fora do reduced-motion** | A regra CSS global não alcança `requestAnimationFrame` nem Web Animations API. Não há teste que detecte isso | T-13 |
| **Sem teste de deploy** | A suíte contra produção só passa **depois** de publicado | — |
| **Sem cobertura de banco vazio** | O contrato de falha de `hero-stats.ts` (banco vazio → faixa não renderiza) é verificado por leitura e por revisão manual, **não** por teste automatizado | T-04 |
| **Sem teste de carga/egress** | A medição de 177 KB por request foi pontual, não contínua | T-10 |
| **Sem teste de restauração de backup** | Não existe backup automatizado nem teste de restore | T-03 |

## 12. Checklist antes de abrir PR

```bash
# 1. O CI exato
npx prisma generate --schema=apps/web/prisma/schema.prisma
npm run typecheck
npm run verify:scoring
npm run verify:identity
npm run build

# 2. Se mexeu em UI
npm run e2e
npx impeccable detect apps/web/src     # precisa sair com exit 0
```

Mais, para mudança de UI (`AGENTS.md`):

- [ ] Conferido renderizado em **375px, 768px e 1280px**
- [ ] Sem overflow horizontal
- [ ] Sem violação axe com as tags WCAG 2.2
- [ ] CTA com contraste AA calculado, não estimado
- [ ] Nenhum número exibido sem consulta real ao banco
- [ ] Nenhum texto jurídico fora de "Réu em Ação Penal" / "Condenação Transitada
      em Julgado"
- [ ] Nenhuma versão de metodologia redigitada (derivar de `lib/methodology.ts`)
