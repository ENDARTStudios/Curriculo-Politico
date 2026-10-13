# PRD — Currículo Político

Documento de produto. Descreve **o que existe hoje no repositório** (rotas,
funcionalidades, fontes de dados) e marca explicitamente o que é **planejado**.
Nada aqui é aspiracional sem estar rotulado.

Versão do motor IDIP: **1.1** (`packages/idip/package.json` = `1.1.0`;
`apps/web/src/lib/methodology.ts` = `METODOLOGIA_VERSAO = "1.1"`).

## 1. Problema

O eleitor brasileiro decide o voto sem acesso prático ao histórico verificável
de quem se candidata. O dado existe — Câmara, Senado, TSE e TCU o publicam — mas
está disperso em APIs distintas, com identificadores diferentes e sem critério
comum de comparação. O resultado é decisão por impressão, não por fato.

Ver [DEFINE_THE_USER.md](DEFINE_THE_USER.md) para a dor central e os públicos.

## 2. Proposta

Agregar dados públicos federais e produzir, por mandato, uma nota de 0 a 100
(**IDIP**) acompanhada de um **Termômetro de Confiabilidade** (risco e
transparência), com a fórmula aberta, versionada e auditável.

Três compromissos que definem o produto:

1. **Nenhum número sem consulta real ao banco.** Se não há dado, a dimensão usa
   baseline neutro 50 e isso é sinalizado na tela — não se estima.
2. **Votação popular nunca altera a nota.** A camada de engajamento
   (`UserBillVote`) é isolada de `Score` no schema.
3. **Travas automáticas, não editoriais.** Condenação transitada em julgado ou
   contas rejeitadas zeram a Integridade e limitam a nota a 39.9 sem intervenção
   humana.

## 3. Escopo entregue — o produto que existe

Rotas verificadas em `apps/web/src/app/`.

### 3.1 Núcleo de avaliação

| Rota | O que faz | Fonte no código |
|---|---|---|
| `/` | Home: funil de 4 estágios, números reais do banco, Termômetro, os **três** conjuntos de pesos (Legislativo, Executivo, Judiciário) com a soma exibida | `src/app/page.tsx`, `src/lib/hero-stats.ts` |
| `/ranking` | Ranking paginado (100 linhas/página, `?pagina=N`), últimos mandatos, último score, corte de confiança em 60, aba separada para insuficientes (`?grupo=insuficientes`) | `src/app/ranking/page.tsx` |
| `/ranking/personalizado` | Ranking **pessoal** por afinidade de autorias — declaradamente não altera o IDIP | `src/app/ranking/personalizado/page.tsx`, `src/lib/affinity.ts` |
| `/politicos/[id]` | Perfil: nota, breakdown com selo "sem dados · neutro", presenças, proposições, votos recentes, patrimônio, custo, checagens, linha do tempo de snapshots | `src/app/politicos/[id]/page.tsx` |
| `/comparar` | Comparação lado a lado (até 5) + exportação CSV | `src/app/comparar/page.tsx`, `src/lib/export.ts` |
| `/partidos` · `/partidos/[acronym]` · `/partidos/comparar` | Agregação por sigla, distribuição do Termômetro e série histórica do partido | `src/app/partidos/**` |
| `/projetos` · `/projetos/[id]` | Catálogo de proposições com filtros; detalhe com resumo, impacto ao cidadão e votação popular | `src/app/projetos/**`, `src/components/BillVote.tsx` |
| `/metodologia` | Metodologia pública: 5 pilares, pesos por cargo, fórmula de confiança, travas, TIC, neutralidade, baseline neutro, fontes | `src/app/metodologia/page.tsx` |
| `/stf` | Composição do STF e os pesos do IDIP-STF, com aviso de que **não há nota publicada** (coleta pendente) | `src/app/stf/page.tsx` |
| `/historia` | Ranking histórico educacional por era (`HistoricalEra`, `HistoricalPolitician`) | `src/app/historia/page.tsx` |

### 3.2 API (interna, não é API pública)

Todas as rotas estão em `apps/web/src/app/api/` e servem a própria UI. Não há
versionamento, chave nem contrato publicado. Rate limit: **60 req/min** geral e
**10 req/min** em `/api/auth/register` e callbacks de login, por usuário
autenticado (JWT) ou por IP (`apps/web/src/middleware.ts`).

| Rota | Método | Função | Parâmetros / regras |
|---|---|---|---|
| `/api/search` | GET | Busca unificada em 4 entidades: políticos, partidos, projetos e figuras históricas | `q` (mín. 2 caracteres), 8 resultados por categoria |
| `/api/rankings` | GET | Top N por nota IDIP | `cargo=LEGISLATIVE\|EXECUTIVE`, `limit` 1–50 (padrão 10); exclui `confidenceScore < 60` e sementes `seed-*` |
| `/api/politicians/[id]` | GET | Perfil público + nota + registros jurídicos filtrados | aceita `id` interno ou `externalId`; oculta `CLEARED` e `ARQUIVADO` |
| `/api/compare` | GET | Dados de comparação | `ids` (até 5), preserva a ordem pedida |
| `/api/bills` | GET | Lista de proposições | — |
| `/api/bills/[id]/vote` | GET/POST | Votação popular em projeto | POST exige login + consentimento específico (LGPD Art. 11) + conta com ≥ 24h |
| `/api/consent` | POST/DELETE | Registra/revoga consentimento para opinião política | revogação **elimina** os votos existentes |
| `/api/account` | DELETE | Exclusão de conta (LGPD Art. 18, VI) | — |
| `/api/retificacao` | GET/POST | Canal de retificação com protocolo rastreável | público, sem login |
| `/api/auth/[...nextauth]` · `/api/auth/register` | — | Autenticação (NextAuth v4) e cadastro por credenciais | bcrypt; OAuth Google opcional |

### 3.3 Autenticação e conta

- Credenciais (email + senha com hash bcrypt) e Google OAuth (ativo quando
  `GOOGLE_CLIENT_ID`/`SECRET` e `NEXT_PUBLIC_GOOGLE_ENABLED` estão definidos).
- Clickwrap de Termos + Privacidade + maioridade, gravado com **versão e data**
  (`User.termsVersion`, `User.termsAcceptedAt`).
- Consentimento **específico e revogável** para opinião política, dado sensível
  (Art. 11), gravado com versão e timestamp
  (`apps/web/src/lib/consent.ts`).
- `/conta` permite revogar consentimento e excluir a conta.

### 3.4 SEO e acessibilidade (requisitos, não extras)

- `robots.txt` permissivo com exceções para `/conta`, `/auth/`, `/api/` e
  `/retificacao` (`src/app/robots.ts`).
- Sitemap em índice + arquivos: `/sitemap.xml` (índice) e `/sitemap/{id}.xml`,
  com **4.000 proposições por arquivo** e `calcularIds()` como fonte única
  (impossível o índice anunciar arquivo inexistente). Um id fora da faixa devolve
  **404**, nunca XML vazio (`src/lib/sitemap.ts`, `src/app/sitemap/**`).
- `metadataBase` + `alternates.canonical` por página; `NEXT_PUBLIC_SITE_URL`
  evita canonical de preview apontando para produção (`src/app/layout.tsx`).
- Acessibilidade **WCAG 2.2 AA** com gate automatizado: axe-core na tag
  `wcag22aa` em home, ranking e metodologia
  (`tests/e2e/acessibilidade.spec.ts`), rodando contra produção a cada 6h
  (`.github/workflows/a11y.yml`).
- Ícone em `src/app/icon.svg`.

### 3.5 Confiabilidade operacional

- CI de PR: `prisma generate` → `typecheck` → `verify:scoring` →
  `verify:identity` → `build` (`.github/workflows/ci.yml`).
- Snapshot mensal dos scores: dia 1, 03:00 UTC
  (`.github/workflows/monthly-snapshot.yml`), idempotente.
- Smoke de produção a cada 6h: home, ranking, `/api/search`,
  `/api/rankings` e `/status` não degradado
  (`.github/workflows/production-smoke.yml`).
- `/status` publica volumes vivos da base e o último snapshot.

## 4. Cobertura de dados por dimensão (estado real)

Medição de `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.1 (2026-10-12).
Volumes mudam a cada carga; trate como fotografia datada.

| Dimensão (Legislativo) | Peso | Fonte | Estado real |
|---|---|---|---|
| Integridade | 25% | `LegalRecord` (TCU/STF) | ⚪ **baseline 50** — `LegalRecord = 0`; fontes mapeadas e testadas, ETL não implementado |
| Produção | 18% | `BillAuthorship` | ✅ real (50.479 autorias) |
| Aprovação | 15% | — | ⚪ baseline 50 |
| Fiscalização | 10% | — | ⚪ baseline 50 |
| Presença | 10% | `LegislativeAction` (VOTED) | ✅ real (taxa de participação sobre sessões nominais) |
| Transparência | 10% | — | ⚪ baseline 50 |
| Custo/Benefício | 7% | `PoliticianCost` (CEAP) | ⚠️ parcial — real quando há CEAP (1.966 registros > 0) |
| Campanha | 5% | `CampaignFinance` | ✅ binária (100 = conta prestada; 50 = sem registro do pleito) |

A confiança (`dataCompleteness`) é a variável honesta aqui: ela cai quando falta
fonte, e é ela que decide quem entra no ranking. Fórmula vigente em
`/metodologia` e em `apps/pipeline/scripts/recalculate-scores.ts`.

## 5. Planejado (não implementado — explicitamente rotulado na UI)

| Item | Onde está declarado | Situação no código |
|---|---|---|
| ETL de decisões do STF (IDIP-STF pontuado) | `/stf`, `/` (card Judiciário) | Schema e pesos prontos (`StfJustice`, `StfCase`, `StfVote`, `StfScore`); **tabelas vazias**. DJE sem API consolidada |
| Integridade real (TCU + TSE + CGU) | `/metodologia`, `/status` | Fontes testadas em `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md`; ETL **local-first** apenas (`apps/pipeline/etl/legal_records.py`) |
| Modificadores de carreira | `/metodologia` (badge "planejado") | Função **existe e passa teste** (`applyCareerModifiers`), **não é aplicada** na nota pública |
| Penalização por votos secretos | `/metodologia` (badge "planejado") | Função existe (`applySecretVotePenalty`), não aplicada; script `detect-secret-votes.ts` presente |
| Aprovação e Fiscalização medidas | `/metodologia` tabela de baseline | Requer tramitação de proposições e pedidos/inquéritos estruturados |
| Ranking por votos nominais (afinidade) | `/ranking/personalizado` | Hoje o modo é **autorias**; a ponte é `LegislativeAction.proposicaoId` |
| Votação popular aberta ao público | `/metodologia` (Fase 4) | Infraestrutura completa (consentimento, anti-bot 24h, voto único); depende da autenticação em produção |
| API pública documentada | — | Não existe. Está em [ROADMAP.md](ROADMAP.md) |
| Cache de rankings (Redis) | `.env.example` (`REDIS_URL` comentado) | Não implementado; há Redis no `docker-compose.yml` (porta 16379) sem consumidor |
| Escopo municipal | `/metodologia` | `MunicipalExpense` (Querido Diário) existe como preparação; **fora do IDIP v1** |
| Ranking Executivo com dados | `/metodologia` | Pesos implementados (`WEIGHTS.EXECUTIVE`), **sem dados na base** |
| Verificação de e-mail e recuperação de senha | `docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md` (pendência 4) | Bloqueado por ausência de serviço de e-mail transacional |

## 6. Não-objetivos (o produto decide não fazer)

1. **Recomendar voto.** Nenhuma superfície sugere em quem votar.
2. **Julgar mérito de projeto de lei.** O algoritmo mede atividade — não se o
   projeto é bom. Posição do usuário é camada pessoal separada.
3. **Publicar CPF, endereço ou dado familiar.** Ver [LEGAL_TERMS.md](LEGAL_TERMS.md) §4.
4. **Pontuar por estimativa.** Dimensão sem fonte recebe 50 e é sinalizada.
5. **Deixar a votação popular influenciar a nota.** Isolado no schema e na UI.
6. **Exibir o total de cadastrados sem nota** como se fosse alcance. A home
   conta **termos com nota calculada** (`hero-stats.ts`).

## 7. Critérios de aceite por mudança

Herdados de `AGENTS.md` e de `CONTRIBUTING.md`:

- `npm run typecheck` com zero erros.
- `npm run verify:scoring` e `npm run verify:identity` passando (rodam no CI).
- `npm run build` limpo — **sem `next dev` ativo** (ver armadilhas em `AGENTS.md`).
- Mudança de UI conferida em 375px, 768px e 1280px.
- Mudança de fórmula exige bump de versão (`Score.version` + `METODOLOGIA_VERSAO`)
  e atualização simultânea de `packages/idip/src/scoring.ts` e
  `apps/web/src/lib/methodology.ts`, até o WEB-001 voltar a passar.
- Nenhum texto novo viola [LEGAL_TERMS.md](LEGAL_TERMS.md).

## 8. Referências

- [SCORING_METHODOLOGY.md](../02-architecture-design/SCORING_METHODOLOGY.md) — fórmula, pesos e travas.
- [STF_SCORING.md](../02-architecture-design/STF_SCORING.md) — pesos do Judiciário.
- [DATA_MODEL.md](../02-architecture-design/DATA_MODEL.md) — models e relacionamentos.
- [ROADMAP.md](ROADMAP.md) — lacunas ordenadas.
- `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` — medições de produção.
