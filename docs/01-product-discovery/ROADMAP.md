# ROADMAP — lacunas reais do repositório

Este roadmap é derivado de leitura do código, não de intenção. Cada item aponta o
arquivo onde a lacuna existe e o critério de aceite. **Não há prazos** — o
projeto é mantido por contribuição voluntária e não existe capacidade alocada
para prometer datas. A ordem é por dependência, não por entusiasmo.

Legenda de esforço: **P** (pequeno, 1 arquivo bem delimitado) · **M** (médio,
múltiplos arquivos, sem fonte externa nova) · **G** (grande, depende de fonte ou
ETL novo).

---

## Trilha A — Fechar a lacuna de integridade (a nota depende disso)

A dimensão **Integridade é 25% do IDIP**, o maior peso, e está no baseline neutro
50 porque `LegalRecord` tem **0 registros**. Consequência direta: as travas de
integridade **nunca dispararam com dado real**
(`docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.7).

### A1 — ETL do TCU (API pública de certidões) · **G**

- **Onde:** `apps/pipeline/etl/legal_records.py` hoje está em modo *local-first*
  e afirma que a API do TCU "exige credenciais (401)". Isso descreve o host
  errado: a plataforma de certidões expõe `certidoes.apps.tcu.gov.br` com
  exportação CSV em massa **sem autenticação**.
- **Fonte e evidência:** `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §2 —
  endpoints testados, formato real (CSV `sep=|`, Latin-1, BOM, cabeçalho na
  linha 2) e os números de referência (CADIRREG 47.978 registros; lista eleitoral
  2026 com 9.201).
- **Aceite:** `LegalRecord.count() > 0`; CSV bruto versionado em `data/raw/` com
  `sha256`; reexecução idempotente; nenhum registro creditado sem trânsito em
  julgado.
- **Risco dominante:** homonímia. Ver A2 — **não implemente A1 sem A2**.

### A2 — Ponte determinística de identidade (CPF com hash) · **G**

- **Onde:** `apps/pipeline/scripts/load-legal-records.ts` casa por **nome
  normalizado exato**. É conservador de propósito (evita atribuir registro à
  pessoa errada), mas não escala e não cobre variações.
- **Caminho documentado:** TSE publica `consulta_cand_YYYY_BRASIL.csv` com
  `NR_CPF_CANDIDATO` em claro; a API da Câmara devolve `cpf` no detalhe do
  deputado; o Senado **não** devolve CPF (a ponte para senador também vem do
  TSE). Ver `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §4.2 e §4.3.
- **Restrição de LGPD:** o CPF **não** vira coluna pública. Armazenar como hash
  com salt e manter apenas o vínculo; `Person` **não** ganha campo de CPF
  legível. Ver [LEGAL_TERMS.md](../01-product-discovery/LEGAL_TERMS.md) §4.
- **Aceite:** 0 falsos positivos em casos adversariais (mesmo nome em UFs
  diferentes, com/sem acento, PJ vs PF); teste automatizado ao lado de
  `apps/pipeline/scripts/verify-identity.ts`.

### A3 — Fechar as travas de impeachment e inelegibilidade no motor · ✅ **RESOLVIDO (2026-10-13)**

- **Estava:** `hardCapApplied` em `packages/idip/src/scoring.ts` considerava
  apenas `hasFinalCondemnation` e `hasRejectedAccounts`, enquanto `/metodologia`
  e `/` prometiam **quatro** gatilhos.
- **Agravante confirmado:** `apply-integrity-caps.ts` **detectava**
  `type = IMPEACHMENT` e não repassava o sinal — um político apenas destituído
  por impeachment não sofria a trava.
- **Correção aplicada:** `LegislativeMetrics` e `ExecutiveMetrics` ganharam
  `hasImpeachment?` e `hasIneligibility?` (opcionais, para não quebrar chamadas
  existentes); o cálculo passou a considerar as quatro condições;
  `apply-integrity-caps.ts` repassa `hasImpeachment`; `verify-scoring.ts` cobre
  as quatro travas individualmente mais um caso de controle sem trava.
- **Não exigiu bump de versão:** o código passou a executar o que a metodologia
  já publicava — não houve regra nova.
- **Restrição remanescente:** `hasIneligibility` está implementado no motor mas
  **não recebe dado**, porque não existe `LegalStatus.INELEGIBILITY` nem coleta
  que produza o sinal. Isso segue aberto e é o novo conteúdo desta trilha.
- **Aceite original:** cumprido (`verify:scoring` tem "somente impeachment" e
  "somente inelegibilidade").

### A4 — Não misturar versões de motor no ranking · **P**

- **Onde:** `apps/pipeline/scripts/recalculate-scores.ts` grava `version:
  "1.1.0"`, mas o default do schema é `"1.0.0"` e não há filtro por versão nas
  consultas de `/ranking` (`ranking/page.tsx`), `/api/rankings`,
  `/partidos` e `/politicos/[id]` — todas usam `orderBy: calculatedAt desc`.
- **Consequência:** um score antigo nunca recalculado ainda pode ser o mais
  recente de um mandato e aparecer no ranking com metodologia v1.0.
- **Aceite:** toda leitura filtra ou normaliza a versão vigente, e o CI falha se
  houver score de versão diferente em produção.

---

## Trilha B — IDIP-STF deixa de ser só metodologia

### B1 — ETL de decisões do STF · **G**

- **Onde:** schema pronto e vazio (`StfJustice`, `StfCase`, `StfVote`,
  `StfScore`); `/stf` declara "coleta em construção".
- **Bloqueio real, verificado:** não existe API pública de processos do STF. O
  portal devolve 403 a acesso automatizado; as URLs legadas de certidão estão
  mortas (404) ou POST-only (405); o **DataJud não cobre o STF** (alias
  `api_publica_stf` → 404) e, mesmo onde cobre, **não expõe nome de parte**. Ver
  `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §3.
- **Caminho indicado:** LAI via Fala.BR ao STF, pedindo o rol de AP/Inq de
  competência originária com indicação de parlamentar. É o caminho legítimo, e
  não é código — é processo administrativo.
- **Aceite:** `StfJustice` com os 11 assentos cadastrados (dado estável, o mais
  simples de obter); `StfVote` populado a partir de fonte oficial citável.

### B2 — Motor de cálculo do IDIP-STF · **M**

- **Onde:** `apps/web/src/lib/methodology.ts` define `DIMENSOES_STF` (25/25/30/20)
  e o schema tem os quatro campos. **Não existe função de cálculo** equivalente a
  `calculateIDIP` — nenhum código em `packages/idip/` consome `StfScore`.
- **Aceite:** função pura testável, com os mesmos invariantes do IDIP (soma dos
  pesos = 1, validação de métrica 0–100, trava de integridade, confiança),
  espelhada pelo teste WEB-001 estendido. Metodologia em
  [STF_SCORING.md](../02-architecture-design/STF_SCORING.md).

### B3 — Exibir o IDIP-STF em `/stf` quando houver dado · **P**

- **Onde:** a página já renderiza `finalScore` quando `j.scores[0]` existe; o que
  falta é o Termômetro e o breakdown por dimensão, hoje ausentes nessa rota.

---

## Trilha C — Performance e custo por acesso

### C1 — Cache de rankings (Redis) · **M**

- **Onde:** `docker-compose.yml` sobe Redis na porta 16379; `apps/web/.env.example`
  traz `REDIS_URL` comentado como "cache de rankings — Fase 3". **Nenhum código
  consome Redis hoje.**
- **Por que importa:** `/ranking` monta o HTML em memória a partir de **todas** as
  `Person` com o último `Term` e o último `Score`, e só então ordena e fatia
  (`ranking/page.tsx`, `PAGE_SIZE = 100`). A paginação resolveu o payload
  (1.506 KB → 270 KB, medido em `AUDITORIA_PRODUCAO.md` §0.4), mas o trabalho de
  consulta continua proporcional ao total da base a cada requisição, e a rota é
  `force-dynamic`.
- **Aceite:** resposta do ranking servida de cache com invalidação no recálculo
  (`recalculate-scores`) e no snapshot mensal; medição antes/depois registrada.

### C2 — Empurrar ordenação e paginação para o banco · **M**

- **Onde:** mesma rota. `Score` tem índice em `finalScore`
  (`apps/web/prisma/schema.prisma`), mas o código não usa `orderBy`/`skip`/`take`
  de score — ordena em JavaScript.
- **Aceite:** `/ranking` com consulta paginada; comportamento idêntico nas duas
  abas (`ranking` e `insuficientes`).

### C3 — Afinidade sem carregar todas as proposições em memória · **M**

- **Onde:** `apps/web/src/lib/affinity.ts` faz `prisma.bill.findMany` de todas as
  proposições com `tags` e filtra/agrega em JavaScript. Com 31.815 proposições
  isso funciona; com o catálogo completo da Câmara, não.
- **Aceite:** filtro de tags resolvido no banco (índice ou campo dedicado), com
  resultado idêntico para o mesmo conjunto de temas.

---

## Trilha D — Engajamento e conta

### D1 — Abrir a votação popular em produção · **P**

- **Onde:** infraestrutura completa e gate de integridade aplicado — consentimento
  específico versionado (`apps/web/src/lib/consent.ts`), anti-bot de 24h,
  voto único por usuário/projeto, revogação que **elimina** os votos
  (`apps/web/src/app/api/bills/[id]/vote/route.ts`, `/api/consent`).
- **Dependência dura:** `/metodologia` declara que a votação abre "com a
  autenticação (Fase 4)". Sem cadastro operante em produção, não há eleitor
  autenticado.
- **Aceite:** `/projetos/[id]` mostra votação com contagem real; teste e2e do
  fluxo conceder → votar → revogar.

### D2 — Verificação de e-mail e recuperação de senha · **M**

- **Onde:** não existe. Bloqueado pela ausência de serviço de e-mail transacional
  — pendência 4 de `docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md`
  e registrado no RIPD §6.5.
- **Aceite:** cadastro com verificação; fluxo de recuperação; nada de e-mail em
  texto claro de senha.

### D3 — Proteção distribuída de rate limit · **M**

- **Onde:** `apps/web/src/middleware.ts` mantém os baldes **em memória, por
  instância** — o próprio comentário do arquivo registra que o limite vale "por
  instância-visita" e que a proteção distribuída depende do Cloudflare/WAF na
  frente. Sem Redis (C1), cada instância nova recomeça com o balde cheio.
- **Aceite:** limite consistente entre instâncias, com evidência de teste real
  como o de `AUDITORIA_PRODUCAO.md` §5 (65 requisições → 429 com `Retry-After`).

---

## Trilha E — API pública

### E1 — API pública documentada e versionada · **G**

- **Onde:** não existe. As rotas `/api/*` servem a própria UI, não têm contrato
  publicado nem chave, e estão sob rate limit de 60 req/min. A home chegou a ter
  uma seção "API pública (em construção)", removida do funil por interessar a
  desenvolvedor e não ao eleitor (`docs/design/estrategia-marketing.md`).
- **Pré-requisitos:** C1/C2 (capacidade de servir sem derrubar a UI), A3/A4
  (nota estável e versionada) e uma decisão explícita sobre licença de dado —
  `PRICING_MONETIZATION.md` §6 (não usar fonte cujo termo proíbe uso comercial).
- **Aceite:** esquema publicado, versionamento por caminho, limites por chave e
  página de termos de uso de dado. Sem isso, "API pública" é promessa vazia.

---

## Trilha F — Expansão

### F1 — Ranking Executivo com dados · **G**

- **Onde:** os pesos do Executivo existem e são testados
  (`WEIGHTS.EXECUTIVE`; `calculateIDIP(metrics, "EXECUTIVE")` cobre 7 dimensões e
  passa no `verify:scoring`), mas **não há dado na base**. `/metodologia` diz
  "implementado; sem dados na base ainda".
- **Aceite:** ao menos responsabilidade fiscal e entrega de governo com fonte
  oficial, no mesmo padrão de honestidade das demais dimensões.

### F2 — Escopo municipal · **G**

- **Onde:** `MunicipalExpense` (menções em diários oficiais municipais via
  Querido Diário/OKBR) existe no schema como preparação e está declarado como
  **fora do IDIP v1**. O ETL (`apps/pipeline/etl/municipal_gazettes.py`) e o load
  (`load-municipal.ts`) existem.
- **Bloqueio:** as listas do TCU cobrem **União**. Cada TCE estadual faz a própria
  lista — município exige fonte por estado
  (`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5.3).

### F3 — Nota de partido com componente real · **M**

- **Onde:** hoje a nota de partido é **70% média dos membros ranqueados + 30% de
  placeholders (50)**. Duas implementações divergentes do mesmo número:
  - `/partidos` (`partidos/page.tsx`): `avgScore * 0.7 + 50 * 0.3` (30% agregado).
  - `/partidos/[acronym]` (`partidos/[acronym]/page.tsx`):
    `avgMembersScore * 0.7 + 50 * 0.2 + 50 * 0.1` (mesma matemática, decomposta).
- **Divergência a corrigir:** o componente
  `apps/web/src/components/PartyScoreBreakdown.tsx` **não calcula** — ele
  recompõe a barra a partir de `transparencyScore` e `complianceScore` fixos em
  50 e exibe `finalScore` recebido por prop. Isso é consistente hoje, mas o
  componente deixaria de ser se qualquer um dos dois lados mudasse.
- **Aceite:** fonte única para a composição da nota de partido, e o documento
  referenciado (`02-architecture-design/PARTY_SCORING.md`) escrito ou a referência
  removida do código.

---

## Trilha G — Dívida de documentação (referências quebradas)

Comentários de código apontam para documentos que **não existem** no
repositório. Cada um é uma promessa não cumprida dentro do próprio código:

| Referência no código | Documento | Ação |
|---|---|---|
| `packages/idip/src/scoring.ts` linha 4 e 76; `apps/web/src/app/api/rankings/route.ts`; `apps/web/src/app/ranking/page.tsx`; `apps/web/src/app/partidos/page.tsx`; `apps/web/src/app/comparar/page.tsx`; `apps/pipeline/scripts/apply-integrity-caps.ts` | `02-architecture-design/SCORING_METHODOLOGY.md` | ✅ **Resolvido** — documento criado, com §2 pesos, §4 travas e §5 ranking |
| `apps/web/src/components/PartyScoreBreakdown.tsx` linha 11; `apps/web/src/app/partidos/[acronym]/page.tsx` linha 108; `apps/web/src/app/partidos/page.tsx` linha 62 | `02-architecture-design/PARTY_SCORING.md` | Escrever (F3) ou remover a citação |
| `apps/web/src/middleware.ts` linha 5; `apps/web/src/app/api/politicians/[id]/route.ts` linha 52; `apps/web/src/app/politicos/[id]/page.tsx` linha 105 | `05-security-compliance/SECURITY_BASELINE.md` | Escrever, ou repontar o código para `05-security-compliance/COMPLIANCE.md §7` (linguagem jurídica e ocultação de registros não definitivos) + `06-devops-deployment/AUDITORIA_PRODUCAO.md` §4–§5 (headers e rate limit). **`CONTRIBUTING.md` já foi corrigido** por outra frente |
| `apps/pipeline/scripts/load-camara.ts` linha 67 | `02-architecture-design/DATA_MODEL.md` | ✅ **Resolvido** — documento criado |
| `CONTRIBUTING.md` §4 descreve a estrutura do repositório como se a aplicação estivesse na raiz (`src/`, `prisma/`, `etl/`, `scripts/`) | — | Corrigir: hoje é monorepo (`apps/web`, `apps/pipeline`, `packages/idip`) |
| `CONTRIBUTING.md` cita `src/lib/scoring.ts` e `src/lib/identity.ts` como alvo de teste, e `cp .env.example .env` | — | Os motores vivem em `packages/idip/src/` e o env fica em `apps/web/.env`. O `CONTRIBUTING.md` **já foi parcialmente corrigido** em outra frente (link jurídico); os caminhos acima continuam desatualizados |
| `apps/web/src/app/metodologia/page.tsx` linha 98 aponta `href="https://github.com/"` com texto `packages/idip/src/scoring.ts` | — | Link genérico para o GitHub, não para o arquivo. Corrigir para o caminho real do repositório |

---

## O que **não** está no roadmap, e por quê

- **Reduzir o peso da Integridade enquanto a fonte não existe.** Mascararia a
  lacuna em vez de resolvê-la. A escolha vigente — manter 25% no baseline 50 e
  sinalizar na tela — é a honesta.
- **Permitir que votação popular altere a nota.** Contraria o princípio declarado
  e a regra 4 de `docs/design/estrategia-marketing.md`.
- **Coletar dado de fonte que bloqueia automação** (portal do STF, certidões do
  TCU com captcha). O caminho legítimo é LAI, não contorno de bloqueio —
  `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5.3.
- **Publicar CPF** para facilitar o casamento de registros. A ponte é hash
  interno, não dado público.

## Como usar este roadmap

1. Escolha **um** item e verifique o estado atual no arquivo citado antes de
   começar — a lacuna pode ter sido fechada.
2. Siga os critérios de aceite de `CONTRIBUTING.md` e
   [PRD.md §7](../01-product-discovery/PRD.md).
3. Mudança de fórmula exige bump de versão e atualização simultânea de
   `packages/idip/src/scoring.ts` e `apps/web/src/lib/methodology.ts`.
4. Ao fechar um item, atualize o documento correspondente e o badge
   "vigente/planejado" em `/metodologia` — a UI é a promessa pública do estado
   real.
