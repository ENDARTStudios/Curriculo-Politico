# Changelog

Registro do que mudou, derivado do histórico real do Git
(`git log --date=short --pretty=format:"%h|%ad|%s"`). **Não há tags nem releases
versionadas neste repositório** — a única versão versionada é a do motor IDIP
(`packages/idip/package.json`), hoje **1.1.0**. As entradas estão agrupadas por
**data de commit** e por tema, com o hash curto para rastreio.

> **Formato.** O projeto usa [Conventional Commits](https://www.conventionalcommits.org/)
> em português, com escopo opcional: `feat:`, `fix:`, `docs:`, `perf:`, `chore:`,
> `refactor:`, `security:`, `lgpd:`, `merge:`. Ver
> [`RULES.md`](../03-development-process/RULES.md) §2.

---

## Não publicado — mudanças na árvore de trabalho

Há alterações **não commitadas** no momento da escrita deste changelog (verificadas
por `git status`): `README.md`, `apps/pipeline/scripts/verify-scoring.ts`,
`apps/web/prisma/schema.prisma`, `apps/web/src/app/page.tsx`,
`apps/web/src/app/stf/page.tsx`, `apps/web/src/lib/methodology.ts`,
`tests/e2e/home.spec.ts` e a reorganização de `docs/`. **Não entram neste changelog**
até serem commitadas — o changelog registra história, não estado de trabalho.

---

## 2026-10-12 — SEO, acessibilidade, performance e reorganização da documentação

O dia mais denso do histórico: 21 commits. Três frentes independentes.

### Performance: região, pool e versão do Next

- **`780e941`** `perf:` — região das funções para **`gru1` (São Paulo)**, co-localizada
  com o banco em `sa-east-1`; `DATABASE_URL` de produção para o pooler em
  **transaction mode (6543)** com `pgbouncer=true&connection_limit=1`; `directUrl`
  (5432) no schema e nas envs; **next 15.5.0 → 15.5.27** (corrige
  GHSA-4jqv-mc3x-m676 e GHSA-mcj8-r9mp-w47p).
  **Resultado medido:** `/ranking` de **1.740 ms** para **354 ms** de média em
  10 requisições — queda de 80% — sem alterar código de aplicação.
- **`36a8174`**, **`18afca1`** `docs:` — registro das medições (região + transaction
  pooler).
- **`9917add`** `docs:` — correção do mecanismo de cache do Next 15: `force-dynamic`
  equivale a `fetch(..., { cache: 'no-store' })` e **não** desliga o Data Cache.
  Correção também dos limites reais do plano Hobby.
- **`259fb2e`**, **`ad96088`** `docs:` — correção de premissa: `pool_size: 15` não é
  teto do plano gratuito, é default configurável (teto do compute Nano: 60 conexões
  diretas / 200 via pooler). Citação da fonte oficial da regra dos 80%.
- **`2fcd032`** `docs:` — registro da fragilidade do pool de conexões
  (`EMAXCONNSESSION` → HTTP 500/503 por 1–2 min após deploys).

### Diagnóstico e correção de deploy

- **`172f0ed`**, **`811b858`** `docs:` — causa raiz do bloqueio de deploy (recurso de
  integração suspenso) e resolução.
- **`1019afa`** `docs:` — incidente da Vercel na verificação do deploy e correção de
  fuso horário.
- **`e76f5b0`** `fix:` — **snapshots formatados em UTC**. O fuso local exibia o mês
  errado.
- **`c76c1b2`** `fix:` — deploy Vercel (Root Directory = `apps/web`), snapshots e
  **ranking paginado**.

### Pesquisa e avaliação

- **`6cba12c`** `docs:` — avaliação de alternativas com medições e recomendações
  verificadas (o documento que originou as correções acima).
- **`28f4a21`** `docs:` — integração das fontes de integridade verificadas (TCU,
  STF, TSE) e anexo dos relatórios de pesquisa brutos.

### Acessibilidade, design e UI

- **`cc2dcdd`** `feat(design):` — infraestrutura de UI-UX, **acessibilidade
  auditável** e detector de anti-padrões (Impeccable).
- **`6c66d02`** `fix(a11y):` — **219 falhas de contraste AA** corrigidas, links
  distinguidos só por cor e foco. Inclui as medições: `text-slate-500` a **4,23:1**
  em 167 lugares → `slate-400`; CTA branco sobre `sky-500` a **2,71:1** →
  `text-slate-950` sobre `sky-500` a **7,45:1**; 44 links em 24 arquivos corrigidos
  por WCAG 1.4.1.
- **`52f45d9`** `feat(home):` — redesenho da hero com **funil de conversão** e
  números reais do banco.
- **`5ee448f`** `feat(home):` — card do Judiciário, metadata própria e **marca
  clicável** (o logo era um `<span>` inerte).
- **`e5956f4`** `fix:` — correção de textos desatualizados sobre fontes em `/status`
  e `/metodologia`.

### SEO

- **`77bd4df`** `feat(seo):` — **sitemap index paginado**, `robots.txt`, ícone e
  `metadataBase`.
- **`11c56db`** `feat(seo):` — **metadata em todas as rotas** e canonical por página.

---

## 2026-10-03 — Monorepo

- **`f3c7630`** `refactor:` — **reestruturação em monorepo**: `apps/web` +
  `apps/pipeline` + `packages/idip` + `docs/`. npm workspaces. A raiz passou a conter
  apenas configuração global e todos os comandos passaram a delegar para o workspace.
- **`256c96d`** `chore:` — web autocontida: `seed-dev` movido para o pipeline;
  `.vercelignore` por app.

---

## 2026-09-30 — LGPD, rate limiting, CI e IDIP v1.1

- **`0a79609`** `fix:` — **recálculo sobe `version` para 1.1.0 no branch de update**
  (scores nunca recriados).
- **`a5aed39`** `feat:` — **CI ativo**, Sentry **condicional** (dormente sem DSN),
  dimensão Campanha medida, página `/conta`.
- **`36cfead`** `security:` — **rate limiting Token Bucket** com tiers por identidade
  (usuário autenticado / IP): 60 req/min geral, 10 req/min no crítico.
- **`4d6651b`** `lgpd:` — implementação do **P0** (consentimento específico para dado
  sensível) + 9 P1 da 2ª auditoria jurídica.
- **`aee0d55`** `perf:` — loads de proposições e presenças **em lote**
  (`createMany` + skip-existing).
- **`ff0125f`**, **`0169203`** `docs:` — `ACAO:*` em cache HITs da Vercel é benigno
  (documentado); correção da auditoria: middleware e rate limit verificados
  **ativos** em produção.

---

## 2026-09-29 — Produção, jurídico, dados reais e documentação

- **`3b1df73`** `docs:` — **auditoria técnica de produção**: 20 rotas, APIs, dados e
  segurança.
- **`cde23b7`** `fix:` — LGPD: reconhece `UserBillVote` como **dado sensível** e
  adiciona a **API de exclusão de conta** (Art. 18, VI).
- **`15138e0`** `fix:` — auditoria jurídica: Termos com 9 seções, Política de
  Privacidade em LGPD completa, **cookie banner**.
- **`bc464e3`** `feat:` — **Google OAuth ativo em produção** + `.specify`
  constitution.
- **`b8342c0`** `feat:` — implementação de "3 tiers": `curl_cffi` nos ETLs,
  `SKILL.md`, `codebase-memory-mcp`.
- **`3135efc`** `feat:` — **produção populada**: Supabase ativo, patrimônio real,
  `/status` público.
- **`3426f8f`** `docs:` — análise de **17 projetos open source** e aplicação no
  Currículo Político.
- **`c5a930e`** `fix:` — gera Prisma Client no build da Vercel (install-scripts
  bloqueados).
- **`f4c87f5`** `feat:` — login Google, **resumos de projetos**, `/apoie` e páginas
  LGPD / Privacidade / Cookies.
- **`02caedd`** `feat:` — deploy de produção ativo + **middleware de segurança** +
  status + contribuição.
- **`724c61a`** `feat:` — **CEAP real via bulk**, patrimônio multi-eleição e
  **Querido Diário** (Requisito #26 completo).
- **`86fb3d3`** `feat:` — **custo total do político** (Requisito #26) + **IDIP
  v1.1**.
- **`b2ee91d`** `feat:` — **NextAuth credentials**, **votação popular ativa**, busca
  global e regras de carreira.
- **`86bc08b`** `feat:` — nota composta dos partidos, ranking histórico, **cron
  mensal**, revisão de confiança MEDIUM e **fact-checking**.
- **`eb6c8b8`** `docs:` — estrutura de documentação completa (8 diretórios,
  61 arquivos).
- **`51acac2`** `chore:` — remoção de duplicação em `docs/`.
- **`d141bb3`** `chore:` — `.vercelignore` para excluir `data/raw` do upload da CLI
  (500 MB de prestação de contas em ZIP).
- **`b333971`** `merge:` — integração do histórico do repositório remoto.

---

## 2026-09-28 — Fundação: dados, IDIP, perfil, jurídico e votação

O dia em que o projeto saiu do esqueleto para uma aplicação com dados reais.

- **`976fc02`** — *Initial commit*.
- **`9cbc1d2`** — correção de formatação do título no `README.md`.
- **`c2db00f`** `feat:` — **pacote fundador do "Radar Cívico"** (nome anterior do
  projeto).
- **`aa6ee30`** `feat:` — **banco de dados ativo**: migração, seed e validação ponta
  a ponta.
- **`15eb6cc`** `feat:` — **base real Câmara + Senado**, pipeline de votações e UI de
  ranking/perfil.
- **`8c6f7e5`** `feat:` — **resolução de identidade TSE**, financiamento
  (schema/pipeline) e partidos.
- **`e4fdc41`** `feat:` — **censo da Câmara (513 deputados)** + seção de
  financiamento no perfil.
- **`6fd4cb0`** `feat:` — histórico de votações, proposições autorais e presença —
  **confiança multi-fonte**.
- **`8eac072`** `feat:` — **blindagem jurídica**: `/sobre`, Termos, Privacidade,
  Metodologia e **Retificação**.
- **`3f2798a`** `feat:` — perfil dashboard (votos / autorias / presença) +
  **comparação** de políticos e partidos.
- **`13e8202`** `feat:` — novo slogan, **metodologia de 5 pilares** e infraestrutura
  de votação popular.
- **`9e5df42`** `feat:` — projetos de lei navegáveis, **rastreamento temporal** e
  páginas institucionais.
- **`077f01c`** `feat:` — **orientação partidária**, gráficos de partido,
  **afinidade** e pipeline jurídico.

---

## Notas de leitura

### Sobre a numeração

Não há `v1.0` do produto. O projeto está **pré-lançamento** na medição de
12/10/2026: **0 usuários, 0 votos e 0 retificações**. O número "v1.1" que aparece em
`/metodologia` é a **versão do motor IDIP**, não de release do produto.

### Sobre "Radar Cívico"

O nome aparece em `c2db00f` (pacote fundador) e sobrevive na senha do Postgres de
desenvolvimento (`radar_civico`, em `docker-compose.yml` e no `.env.example`). É
resíduo histórico, não um segundo produto.

### Sobre o que este changelog **não** é

- **Não é release notes.** Sem tags, sem pacote publicado, sem migração de versão.
- **Não substitui [`MEMORY.md`](../08-knowledge-management/MEMORY.md).** Aqui está
  **o que mudou**; lá está **por que** as decisões foram tomadas e quais armadilhas
  foram descobertas. Um commit como `6c66d02` ("corrige 219 falhas de contraste")
  está aqui; a regra que proíbe `text-slate-500` para texto está em
  `MEMORY.md` e em [`RULES.md`](../03-development-process/RULES.md).
- **Não é gerado automaticamente.** Foi derivado do `git log` e agrupado por tema e
  data. Ao commitar, não atualize este arquivo a cada commit — atualize por bloco
  significativo, como está organizado acima.

### Como reconstruir este documento

```bash
git log --date=short --pretty=format:"%h|%ad|%s"
```

Para ver as mudanças de um bloco específico:

```bash
git log --oneline --since=2026-10-12 --until=2026-10-13
git show --stat 780e941
```
