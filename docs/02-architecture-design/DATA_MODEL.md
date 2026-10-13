# DATA_MODEL — modelo de dados

Descrição dos models **reais** de `apps/web/prisma/schema.prisma` (PostgreSQL).
Nenhum campo aqui é aspiracional: se não está no schema, não está neste
documento.

**Números verificados:** 29 models, 4 enums, 504 linhas de schema.

## 1. Visão por grupos

```
                    ┌──────────┐        ┌────────┐        ┌─────────┐
                    │  Person  │───┐    │ Party  │        │ Office  │
                    └────┬─────┘   │    └───┬────┘        └────┬────┘
                         │         │        │                  │
                         │         └────────┴──────────┬───────┘
                         │                            ▼
                         │                       ┌─────────┐
                         │                       │  Term   │  (mandato)
                         │                       └────┬────┘
      ┌──────────────────┼───────────────┬────────────┼──────────────┐
      ▼                  ▼               ▼            ▼              ▼
┌─────────────┐  ┌───────────────┐ ┌──────────┐ ┌────────────┐ ┌───────────┐
│BillAuthorship│ │ LegalRecord   │ │  Score   │ │ScoreSnapshot│ │PoliticianCost│
└──────┬──────┘  └───────────────┘ └──────────┘ └────────────┘ └───────────┘
       │                                              │
       ▼                                    ┌─────────┴──────────┬───────────────┐
┌──────────┐                                ▼                    ▼               ▼
│   Bill   │                        ┌────────────────┐ ┌──────────────────┐ ┌──────────┐
└────┬─────┘                        │SessionAttendance│ │LegislativeAction │ │Campaign- │
     │                              └────────────────┘ └──────────────────┘ │ Finance  │
     ├──────────────┐                                                      └──────────┘
     ▼              ▼
┌─────────────┐ ┌──────────────┐
│UserBillVote │ │  (tags Json) │
└─────────────┘ └──────────────┘
```

Grupos funcionais:

| Grupo | Models | Papel |
|---|---|---|
| Núcleo político | `Person`, `Party`, `Office`, `Term` | Quem é avaliado e em que mandato |
| Avaliação | `Score`, `ScoreSnapshot` | Nota vigente e série histórica |
| Atividade | `Bill`, `BillAuthorship`, `LegislativeAction`, `SessionAttendance` | O que a pessoa fez |
| Dinheiro | `CampaignFinance`, `PoliticianCost`, `FixedBenefit`, `PatrimonyHistory` | Quanto custou e o que declarou |
| Jurídico | `LegalRecord` | Situação jurídica (alimenta as travas) |
| Judiciário | `StfJustice`, `StfCase`, `StfVote`, `StfScore` | IDIP-STF |
| Identidade e conta | `User`, `Account`, `Session`, `VerificationToken` | NextAuth + consentimento |
| Engajamento | `UserBillVote`, `RetificationRequest` | Camada pessoal e direitos do titular |
| Contexto | `VerifiedClaim`, `HistoricalEra`, `HistoricalPolitician`, `MunicipalExpense` | Nunca altera o IDIP |

## 2. Enums

| Enum | Valores | Onde é usado |
|---|---|---|
| `ReliabilityStatus` | `GREEN`, `YELLOW`, `RED`, `GRAY` | `Score`, `ScoreSnapshot` — Termômetro de Confiabilidade |
| `LegalStatus` | `INVESTIGATION`, `LAWSUIT`, `CONDEMNATION`, `IMPEACHMENT`, `CLEARED`, `ACCOUNTS_REJECTED`, `CRIMINAL_ACTION` | `LegalRecord.type` |
| `ActionType` | `PROPOSED`, `APPROVED`, `VOTED`, `AUTHORED` | `LegislativeAction.actionType` |
| `CostCategory` | `SALARY`, `PATRIMONY`, `CEAP`, `CEAPS`, `OFFICE_BUDGET`, `HOUSING`, `RELOCATION`, `HEALTH_PLAN`, `TRANSPORT`, `OTHER_BENEFITS` | `PoliticianCost.category`, `FixedBenefit.category` |

Leitura de `LegalStatus` para a interface está normalizada em
[LEGAL_TERMS.md §3](../01-product-discovery/LEGAL_TERMS.md) — o valor do enum
não é o texto exibido.

## 3. Núcleo político

### `Person` — a pessoa avaliada

| Campo | Tipo | Observação |
|---|---|---|
| `id` | `String @id @default(cuid())` | Identificador interno |
| `externalId` | `String? @unique` | ID da fonte (Câmara/Senado/TSE). **Nullable**, e é o que os filtros de seed testam com `OR externalId IS NULL` |
| `tseId` | `String? @unique` | `SQ_CANDIDATO` da eleição que elegeu |
| `civilName` | `String` | Nome civil |
| `politicalName` | `String` | Nome de urna / nome político |
| `birthYear` | `Int?` | Ano — **nunca** data completa |
| `photoUrl` | `String?` | Imagem de domínio oficial |
| `createdAt` | `DateTime @default(now())` | — |

Relações: `terms[]`, `legalRecords[]`, `billAuthorships[]`, `verifiedClaims[]`,
`patrimonyHistory[]`, `municipalExpenses[]`.

**LGPD:** não há CPF, endereço, telefone ou dado familiar. A minimização é uma
propriedade do schema, não uma disciplina de código.

### `Party` — partido

| Campo | Tipo | Observação |
|---|---|---|
| `acronym` | `String @unique` | É a chave de rota (`/partidos/[acronym]`) |
| `name`, `ideology`, `position`, `foundedYear`, `history`, `tseNumber`, `color` | — | `position` é texto livre com valores combinados: `ESQUERDA`, `CENTRO_ESQUERDA`, `CENTRO`, `CENTRO_DIREITA`, `DIREITA`. `history` é `@db.Text` |

Relação: `members Term[]`. **Ideologia e posição nunca entram em cálculo de
nota** — são contexto (`PartyScoreBreakdown.tsx` registra isso na tela).

### `Office` — cargo

`type` (`"EXECUTIVE"` | `"LEGISLATIVE"`), `name` ("Deputado Federal",
"Governador"), `jurisdiction` (`"BR"`, `"SP"`…). É o que o `/api/rankings` usa
para filtrar por `cargo`, e o que `apps/pipeline/scripts/load-camara.ts` cria por
UF ("jurisdiction = circunscrição").

Os pesos do IDIP **não** vêm de `Office.type` diretamente: o perfil é passado
explicitamente para `calculateIDIP` (`"LEGISLATIVE"` | `"EXECUTIVE"`).

### `Term` — mandato

O elo central: liga pessoa, cargo, partido e **tudo** o que é medido.

| Campo | Tipo | Observação |
|---|---|---|
| `startYear` | `Int` | — |
| `endYear` | `Int?` | Nulo = em exercício |
| `isFirstTerm` | `Boolean @default(false)` | Usado pelos modificadores de carreira (`mark-first-terms.ts`) |
| `previousTerms` | `Int @default(0)` | Idem |

Relações: `scores[]`, `actions[]`, `finances[]`, `sessionAttendances[]`,
`scoreSnapshots[]`, `costs[]`. Índices: `@@index([personId])`,
`@@index([officeId])`.

**Convenção de leitura:** todas as páginas usam o **último** mandato
(`orderBy: { startYear: "desc" }, take: 1`) e, dentro dele, o **último** score
(`orderBy: { calculatedAt: "desc" }, take: 1`).

## 4. Avaliação

### `Score` — a nota IDIP de um mandato

| Campo | Tipo | Observação |
|---|---|---|
| `termId` | `String` | FK para `Term` |
| `version` | `String @default("1.0.0")` | Versão da metodologia. O recálculo grava `"1.1.0"` |
| `finalScore` | `Float` | 0–100, uma casa decimal |
| `confidenceScore` | `Float` | 0–100 (`dataCompleteness`) |
| `reliabilityStatus` | `ReliabilityStatus` | Termômetro |
| `integrityScore` | `Float` | Integridade (zerada quando há trava) |
| `productivityScore` | `Float` | Produção |
| `transparencyScore` | `Float` | Transparência |
| `costEfficiencyScore` | `Float?` | Custo/Benefício — **nulo quando não há custo coletado** |
| `calculatedAt` | `DateTime @default(now())` | — |

Índices: `@@index([termId])`, `@@index([finalScore])`.

**Três campos, não oito.** O schema guarda apenas 3 das 8 dimensões do
Legislativo (4 contando `costEfficiencyScore`). As outras vivem no `breakdown`
de `ScoreSnapshot` ou não são persistidas. Isso é uma limitação real: a API
`/api/politicians/[id]` expõe `dimensions` com exatamente esses três valores.
O `ScoreResult.breakdown` completo do motor **não** é persistido em `Score`.

**Não existe `@@unique` em `termId`.** A unicidade prática vem do id
determinístico gravado pelo recálculo (`score_${termId}_v1`) — um termo pode, em
tese, acumular várias linhas de `Score`, e a leitura sempre pega a mais recente
por `calculatedAt`.

**Dívida conhecida:** o `default` da versão é `"1.0.0"` e não há filtro por
versão nas consultas, então um score antigo nunca recalculado pode ser o mais
recente de um mandato. Ver [ROADMAP A4](../01-product-discovery/ROADMAP.md).

### `ScoreSnapshot` — série histórica

| Campo | Tipo | Observação |
|---|---|---|
| `termId` + `snapshotDate` | `@@unique([termId, snapshotDate])` | É o que torna o snapshot idempotente |
| `finalScore`, `confidenceScore`, `reliabilityStatus` | — | Cópia do estado no mês |
| `breakdown` | `Json?` | `{ integrity, productivity, transparency }` |
| `events` | `Json?` | Reservado para eventos do período |

`onDelete: Cascade` no `term`. Índice em `snapshotDate`.

**Regra de datação:** o snapshot é datado no **primeiro dia do mês corrente à
meia-noite UTC** (`apps/pipeline/scripts/snapshot-date.ts`). Antes disso, o
script usava o último dia do mês no fuso do executor, o que produzia data no
futuro, **duplicata do mesmo mês** (execução local em BRT vs. GitHub Actions em
UTC) e reexecução não idempotente (`AUDITORIA_PRODUCAO.md` §0.3). Toda formatação
de snapshot na UI fixa `timeZone: "UTC"` (`src/lib/snapshot.ts`).

**GRAY não gera snapshot:** `snapshot-scores.ts` filtra
`reliabilityStatus: { not: "GRAY" }` — baseline provisório não vale como
histórico.

## 5. Atividade

### `Bill` — proposição

`externalId @unique`, `title`, `type`, `status`, `date`, `fullText @db.Text`,
`simpleSummary @db.Text` (resumo por categoria temática), `citizenImpact @db.Text`
(como afeta o cidadão), `tags Json?` (array de strings para o Filtro de
Afinidade), `keyPoints Json?`.

Índices: `externalId`, `type`, `date`.

`tags` é `Json` — **não há índice GIN nem coluna dedicada**, o que é a raiz do
problema de performance de `src/lib/affinity.ts` (filtra em memória). Ver
[ROADMAP C3](../01-product-discovery/ROADMAP.md).

### `BillAuthorship` — autoria

`billId` + `personId` com `@@unique([billId, personId])`; `type` textual
("Autor", "Coautor", "Relator"). Índice em `personId`. É a fonte da dimensão
**Produção** (18%) e do ranking de afinidade.

### `LegislativeAction` — ação legislativa (votos)

| Campo | Observação |
|---|---|
| `actionType` | `ActionType` (`VOTED` é o usado no recálculo) |
| `billId` | **id da VOTAÇÃO** na Câmara (não é FK para `Bill`) |
| `proposicaoId` | id da **PROPOSIÇÃO** votada — a ponte para `Bill.tags`. Teoricamente permite o ranking por votos nominais em vez de autorias |
| `voteDirection` | Sentido do voto |
| `isSecretVote` | `Boolean @default(false)` — alimenta a penalização por voto secreto (função existe, não aplicada) |
| `date` | `DateTime?` |

`@@unique([termId, actionType, billId])` — é o que garante idempotência de carga.
Índices: `termId`, `proposicaoId`.

Atenção: `billId` e `proposicaoId` são **strings sem FK**. São identificadores da
fonte, não chaves estrangeiras — uma inconsistência deliberada para não falhar a
carga quando a proposição ainda não está no catálogo.

### `SessionAttendance` — presença

`sessionDate`, `sessionType`, `present Boolean`, `externalId` (id do evento na
Câmara, para idempotência). `@@unique([termId, sessionDate, externalId])`.

**Limitação real e documentada:** a API da Câmara registra apenas presenças, não
ausências. Por isso a métrica de Presença usa **taxa de participação em votações
nominais** e as presenças entram só na Confiança
(`recalculate-scores.ts`: "presenças em sessões são só-positivas (sem ausências)
— não viram taxa").

## 6. Dinheiro

### `CampaignFinance` — prestação de contas

`termId` + `year` (`@@unique`), `totalReceived`, `totalSpent`, `donorCount`,
`topDonors Json?` (array de `{nome, valor}`), `source` ("TSE_2022"),
`retrievedAt`.

Uso no recálculo: dimensão **Campanha** é **binária e factual** — `100` se há
prestação de contas com receita declarada, `50` se não há registro do pleito
(dado ausente **não** é penalizado; senadores eleitos em 2018 caem aqui). Também
soma +5 na Confiança quando `totalReceived > 0`.

### `PoliticianCost` — custo total

`termId`, `category` (`CostCategory`), `year`, `amount` (R$), `description?`,
`source` ("TSE", "CAMARA", "SENADO", "FIXED"), `sourceUrl?`, `retrievedAt`.

`@@unique([termId, category, year, description])` — o `description` faz parte da
chave de idempotência. Índices: `[termId, year]`, `[category]`.

**Regra de negócio:** `PATRIMONY` **não** entra no custo anual — patrimônio não é
gasto público (`recalculate-scores.ts` e o comentário de `applyCostEfficiency`).

### `FixedBenefit` — tabela de referência

`officeType` ("PRESIDENTE", "SENADOR", "DEPUTADO_FEDERAL"…), `category`,
`monthlyValue`, `description`, `effectiveFrom`, `effectiveTo?`.
`@@unique([officeType, category, effectiveFrom])`. É uma tabela de **referência**
(valores fixos por cargo), não o custo de uma pessoa — alimentada por
`seed-fixed-benefits.ts`.

### `PatrimonyHistory` — patrimônio declarado

`personId` + `electionYear` (`@@unique`), `declaredValue`, `assetCount`,
`source` ("TSE_2022"), `sourceUrl?`, `retrievedAt`. `onDelete: Cascade` no
`person`. Permite o "Rastreamento Patrimonial" multi-eleição, exibido por
`PatrimonyChart`.

## 7. Jurídico

### `LegalRecord` — o registro que dispara as travas

| Campo | Tipo | Observação |
|---|---|---|
| `personId` | `String` | FK para `Person` |
| `type` | `LegalStatus` | Tipo do registro |
| `status` | `String` | `"ATIVO"`, `"ARQUIVADO"`, `"TRANSITADO_EM_JULGADO"` — **texto livre, não enum** |
| `court` | `String?` | Ex.: "TCU — <órgão>", "STF" |
| `sourceUrl` | `String` | **Obrigatório** — um registro sem fonte não entra |
| `retrievedAt` | `DateTime @default(now())` | Data de consulta |

Índice em `personId`.

**Duas armadilhas deste model:**

1. `status` é `String`, não enum. Quem escreve ETL assume a responsabilidade de
   gravar exatamente os três valores esperados por
   `apps/pipeline/scripts/apply-integrity-caps.ts`.
2. **Está vazio em produção** (`LegalRecord = 0`). Consequência direta: a
   dimensão Integridade (25%) está no baseline 50 e as travas **nunca**
   dispararam com dado real. Ver [ROADMAP trilha A](../01-product-discovery/ROADMAP.md).

**Deduplicação por id determinístico:** `tcu_${personId}_${processo}` e
`stf_${personId}_${numero_processo}` — o `upsert` é idempotente sem consulta
prévia.

## 8. Judiciário (IDIP-STF)

### `StfJustice` — ministro

`name @unique`, `birthYear?`, `appointedBy?` (Presidente que indicou),
`appointmentDate?`, `active Boolean @default(true)`. Relações: `scores[]`,
`votes[]`. **Vazio em produção** — a página `/stf` declara que a composição será
cadastrada junto com o ETL.

### `StfCase` — processo

`externalId @unique` (ex.: "ADI 1234"), `title`, `category?` ("ADI", "ADPF",
"RE", "HC"), `status?`, **`decisionDate DateTime?`**.

**O que não existe:** data de autuação/distribuição. É a razão direta de o
IDIP-STF não ter dimensão de celeridade — ver [STF_SCORING.md](STF_SCORING.md) §6
e [ADR-008](ADR.md#adr-008).

### `StfVote` — voto

`justiceId` + `caseId` (`@@unique`), `voteDirection` ("PROCEDENTE",
"IMPROCEDENTE", "PARCIAL"), `wasRapporteur`, `dissent`, `voteDate?`. É a matéria-
prima da dimensão **Consistência** (30%) — `dissent` e `voteDirection` em casos
semelhantes.

### `StfScore` — nota do ministro

`justiceId` + `periodStart` (`@@unique`), `periodEnd`, `finalScore`,
`confidenceScore`, **`productivityScore`**, **`consistencyScore`**,
**`transparencyScore`**, **`integrityScore Float @default(50)`**,
`calculatedAt`.

Os quatro campos de dimensão espelham **exatamente** `DIMENSOES_STF` em
`apps/web/src/lib/methodology.ts` (25/25/30/20). O comentário do schema explica o
`default(50)` de `integrityScore`: sem o campo, o peso de Integridade do índice
não teria onde ser gravado.

**Sem `ReliabilityStatus`.** `StfScore` não tem campo de Termômetro — a página
`/stf` exibe apenas `finalScore`. Se o IDIP-STF for implementado, decidir se o
Termômetro se aplica ao Judiciário é decisão de produto em aberto.

## 9. Identidade e conta

### `User`

`email @unique?`, `name?`, `password?` (hash bcrypt), `emailVerified?`, `image?`,
e o bloco de conformidade:

| Campo | Função |
|---|---|
| `termsVersion`, `termsAcceptedAt` | Clickwrap de Termos/Privacidade com versão e data |
| `politicalConsentVersion`, `politicalConsentAt` | Consentimento **específico** para opinião política (dado sensível, LGPD Art. 11) |
| `politicalConsentWithdrawnAt` | Revogação — zera o direito de voto e elimina os votos existentes |

Relações: `accounts[]`, `sessions[]`, `billVotes[]`. A função
`consentimentoPoliticoAtivo()` (`src/lib/consent.ts`) é a checagem canônica:
`politicalConsentAt && !politicalConsentWithdrawnAt`.

### `Account`, `Session`, `VerificationToken`

Models padrão do adaptador NextAuth (`@auth/prisma-adapter`). `Account` tem
`@@unique([provider, providerAccountId])`; `Session.sessionToken` é único;
`VerificationToken` tem `@@unique([identifier, token])`.

**Não há `UserAffinity`.** O model existia e foi **removido** na auditoria
jurídica (P1-06): contradizia a política de privacidade. O `AffinityFilter` é
100% `localStorage`, sem fetch.

## 10. Engajamento e direitos

### `UserBillVote` — votação popular

`userId` + `billId` (`@@unique([userId, billId])`), `vote` ("FAVOR" | "CONTRA"),
`createdAt`, `updatedAt`. `onDelete: Cascade` nos dois lados.

**A propriedade mais importante deste model é o que ele NÃO tem:** nenhuma
ligação com `Score` ou `StfScore`. A neutralidade algorítmica é uma propriedade
do schema — ver [ADR-011](ADR.md#adr-011).

### `RetificationRequest` — canal de retificação

`protocolo @unique`, `requesterName`, `requesterEmail`, `targetType`
("POLITICO" | "USUARIO" | "OUTRO"), `targetName?`, `description`, `sourceUrl?`,
`status String @default("RECEBIDO")` (RECEBIDO | EM_ANALISE | CONCLUIDO |
DEFERIDO | INDEFERIDO). Índice em `requesterEmail`.

Público, **sem login** — o titular pode não ter conta. O nome do model está com
grafia não idiomática ("Retification", não "Rectification"); é o nome real no
schema e não deve ser "corrigido" sem migration.

## 11. Contexto (nunca altera o IDIP)

| Model | Conteúdo | Regra |
|---|---|---|
| `VerifiedClaim` | Checagem de agência independente: `claimText @db.Text`, `verdict` ("VERDADEIRO", "FALSO", "ENGANOSO", "IMPRECISO"), `source` ("Aos Fatos", "Lupa", "Comprova"), `sourceUrl`, `publishedAt?`, `topic?`, `fetchedAt`. `personId` **nullable** (claim pode não estar ligada a pessoa) | Comentário no schema: "contexto — nunca altera o IDIP" |
| `HistoricalEra` | `name @unique`, `startYear`, `endYear`, `description?` | Ranking histórico é **educacional**, com critérios adaptados por era |
| `HistoricalPolitician` | `name`, `office`, `startYear`, `endYear?`, `party?`, `achievements Json?`, `controversies Json?`, `historicalScore Float?`, `scoreBreakdown Json?`, `sources Json?`. `@@unique([name, office, startYear])` | Separado de `Person`/`Score`: não é o IDIP |
| `MunicipalExpense` | `politicianName`, `personId?`, `municipality`, `state`, `keyword?`, `publishedAt?`, `gazetteUrl`, `excerpt @db.Text`, `fetchedAt` | Comentário no schema: "preparação para a escala municipal (**fora do escopo IDIP v1**)" |

## 12. Padrões que se repetem no schema

1. **IDs determinísticos para idempotência** — não é só `cuid()`: as cargas usam
   ids compostos previsíveis (`score_${termId}_v1`, `tcu_${personId}_${processo}`)
   para que `upsert` não precise de leitura prévia.
2. **`retrievedAt` / `fetchedAt` em todo dado de fonte externa** — `LegalRecord`,
   `CampaignFinance`, `PatrimonyHistory`, `PoliticianCost`, `VerifiedClaim`,
   `MunicipalExpense`. É o que sustenta a regra "toda exibição carrega fonte e data".
3. **`source` / `sourceUrl`** — permite ao usuário conferir na origem.
4. **`@@unique` como contrato de idempotência**, não só de integridade:
   `[termId, snapshotDate]`, `[termId, category, year, description]`,
   `[termId, sessionDate, externalId]`, `[termId, actionType, billId]`,
   `[userId, billId]`, `[justiceId, caseId]`, `[justiceId, periodStart]`.
5. **`onDelete: Cascade` só onde o dependente não existe sem o pai** —
   `ScoreSnapshot`→`Term`, `PoliticianCost`→`Term`, `PatrimonyHistory`→`Person`,
   `Account`/`Session`/`UserBillVote`→`User`. Registros de auditoria
   (`LegalRecord`, `Score`) **não** têm cascade, de propósito.
6. **`Json` para listas sem esquema estável** — `tags`, `keyPoints`, `topDonors`,
   `breakdown`, `events`, `achievements`, `controversies`, `sources`. Comodidade
   que custa: nenhum desses campos é filtrável no banco (ver C3 do roadmap).
7. **Campos de "status" como `String`, não enum** — `Bill.status`,
   `LegalRecord.status`, `RetificationRequest.status`, `StfCase.status`,
   `PoliticianCost.source`. O enum ficou reservado onde o conjunto é fechado e
   conhecido.

## 13. Índices — resumo

| Model | Índices |
|---|---|
| `Term` | `personId`, `officeId` |
| `Score` | `termId`, `finalScore` |
| `ScoreSnapshot` | único `[termId, snapshotDate]`; `snapshotDate` |
| `Bill` | `externalId`, `type`, `date` |
| `BillAuthorship` | único `[billId, personId]`; `personId` |
| `LegislativeAction` | único `[termId, actionType, billId]`; `termId`, `proposicaoId` |
| `SessionAttendance` | único `[termId, sessionDate, externalId]`; `termId` |
| `CampaignFinance` | único `[termId, year]`; `termId` |
| `PoliticianCost` | único `[termId, category, year, description]`; `[termId, year]`, `category` |
| `FixedBenefit` | único `[officeType, category, effectiveFrom]` |
| `PatrimonyHistory` | único `[personId, electionYear]`; `personId` |
| `LegalRecord` | `personId` |
| `UserBillVote` | único `[userId, billId]`; `billId` |
| `RetificationRequest` | `requesterEmail` |
| `VerifiedClaim` | `personId`, `verdict` |
| `MunicipalExpense` | `municipality`, `personId` |
| `StfVote` | único `[justiceId, caseId]` |
| `StfScore` | único `[justiceId, periodStart]` |
| `Account` | único `[provider, providerAccountId]` |
| `HistoricalPolitician` | único `[name, office, startYear]` |

Consequências: `/ranking` tem índice em `Score.finalScore` mas **não o usa** para
ordenar (ordena em memória); `Bill.tags` (Json) não tem índice, o que obriga a
varredura completa na afinidade.

## 14. Migrations

As migrations vivem em `apps/web/prisma/migrations/` — **13 pastas**, da
`20260928221104_init` à `20260930_lgpd_consent_retificacao`. São aplicadas com
`npm run db:migrate` (que executa `prisma migrate dev` **de dentro de
`apps/web`**, onde está o `.env`). Em produção, `prisma migrate` precisa de
`DIRECT_URL` (5432) — **não funciona em transaction mode**.

## 15. Referências

- `apps/web/prisma/schema.prisma` — fonte de verdade deste documento.
- [SCORING_METHODOLOGY.md](SCORING_METHODOLOGY.md) — como esses campos viram nota.
- [STF_SCORING.md](STF_SCORING.md) — o bloco do Judiciário.
- [UML.md](UML.md) — diagrama de entidades em Mermaid.
- [LEGAL_TERMS.md](../01-product-discovery/LEGAL_TERMS.md) — leitura jurídica dos enums.
- `apps/pipeline/scripts/recalculate-scores.ts` e `apply-integrity-caps.ts` —
  quem escreve `Score` e `LegalRecord`.
