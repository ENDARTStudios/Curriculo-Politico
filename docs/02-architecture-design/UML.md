# UML — diagramas do sistema

Diagramas em **Mermaid** (renderizam nativamente no GitHub, no VS Code e na
maioria dos visualizadores de Markdown). Todos representam o sistema **real**,
derivado de `apps/web/prisma/schema.prisma` e dos scripts de
`apps/pipeline/scripts/`.

Convenção: nomes de model e de arquivo são os reais. Onde o diagrama simplifica
(omite campos), isso está dito na legenda.

---

## 1. Modelo de dados (entidades e relacionamentos)

```mermaid
erDiagram
    Person ||--o{ Term : "tem mandatos"
    Person ||--o{ LegalRecord : "tem registros"
    Person ||--o{ BillAuthorship : "assina"
    Person ||--o{ VerifiedClaim : "é citado em"
    Person ||--o{ PatrimonyHistory : "declara"
    Person ||--o{ MunicipalExpense : "é mencionado em"

    Party ||--o{ Term : "filia"
    Office ||--o{ Term : "cargo de"

    Term ||--o{ Score : "recebe nota"
    Term ||--o{ ScoreSnapshot : "tem série"
    Term ||--o{ LegislativeAction : "pratica"
    Term ||--o{ SessionAttendance : "comparece"
    Term ||--o{ CampaignFinance : "presta contas"
    Term ||--o{ PoliticianCost : "custa"

    Bill ||--o{ BillAuthorship : "tem autores"
    Bill ||--o{ UserBillVote : "recebe voto popular"

    User ||--o{ Account : "autentica via"
    User ||--o{ Session : "mantém"
    User ||--o{ UserBillVote : "vota em"

    StfJustice ||--o{ StfVote : "profere"
    StfJustice ||--o{ StfScore : "recebe nota"
    StfCase ||--o{ StfVote : "é votado em"

    HistoricalEra ||--o{ HistoricalPolitician : "agrupa"
```

Campos principais de cada entidade do núcleo:

| Model | Campos que importam | Índice/chave |
|---|---|---|
| `Person` | `id`, `externalId?` (unique), `tseId?` (unique), `civilName`, `politicalName`, `birthYear?`, `photoUrl?` | — |
| `Party` | `acronym` (unique), `name`, `ideology?`, `position?`, `foundedYear?`, `tseNumber?`, `color?` | — |
| `Office` | `type` ("EXECUTIVE"/"LEGISLATIVE"), `name`, `jurisdiction` | — |
| `Term` | `personId`, `officeId`, `partyId?`, `startYear`, `endYear?`, `isFirstTerm`, `previousTerms` | `personId`, `officeId` |
| `Score` | `termId`, `version`, `finalScore`, `confidenceScore`, `reliabilityStatus`, `integrityScore`, `productivityScore`, `transparencyScore`, `costEfficiencyScore?`, `calculatedAt` | `termId`, `finalScore` |
| `ScoreSnapshot` | `termId`, `snapshotDate`, `finalScore`, `confidenceScore`, `reliabilityStatus`, `breakdown Json?`, `events Json?` | unique `[termId, snapshotDate]` |
| `Bill` | `externalId?` (unique), `title`, `type?`, `status?`, `date?`, `tags Json?`, `fullText?`, `simpleSummary?`, `citizenImpact?`, `keyPoints Json?` | `externalId`, `type`, `date` |
| `BillAuthorship` | `billId`, `personId`, `type?` | unique `[billId, personId]` |
| `LegislativeAction` | `termId`, `actionType`, `billId?`, `proposicaoId?`, `voteDirection?`, `isSecretVote`, `date?` | unique `[termId, actionType, billId]` |
| `SessionAttendance` | `termId`, `sessionDate`, `sessionType?`, `present`, `externalId?` | unique `[termId, sessionDate, externalId]` |
| `CampaignFinance` | `termId`, `year`, `totalReceived`, `totalSpent`, `donorCount`, `topDonors Json?`, `source` | unique `[termId, year]` |
| `PoliticianCost` | `termId`, `category`, `year`, `amount`, `description?`, `source`, `sourceUrl?` | unique `[termId, category, year, description]` |
| `PatrimonyHistory` | `personId`, `electionYear`, `declaredValue`, `assetCount`, `source` | unique `[personId, electionYear]` |
| `LegalRecord` | `personId`, `type` (enum), `status` (string), `court?`, `sourceUrl` (obrigatório), `retrievedAt` | `personId` |
| `User` | `email?` (unique), `password?` (bcrypt), `termsVersion?`, `termsAcceptedAt?`, `politicalConsentVersion?`, `politicalConsentAt?`, `politicalConsentWithdrawnAt?` | — |
| `UserBillVote` | `userId`, `billId`, `vote` ("FAVOR"/"CONTRA") | unique `[userId, billId]` |
| `RetificationRequest` | `protocolo` (unique), `requesterName`, `requesterEmail`, `targetType`, `description`, `sourceUrl?`, `status` | `requesterEmail` |
| `StfJustice` | `name` (unique), `birthYear?`, `appointedBy?`, `appointmentDate?`, `active` | — |
| `StfCase` | `externalId?` (unique), `title`, `category?`, `status?`, `decisionDate?` | — |
| `StfVote` | `justiceId`, `caseId`, `voteDirection`, `wasRapporteur`, `dissent`, `voteDate?` | unique `[justiceId, caseId]` |
| `StfScore` | `justiceId`, `periodStart`, `periodEnd`, `finalScore`, `confidenceScore`, `productivityScore`, `consistencyScore`, `transparencyScore`, `integrityScore (default 50)` | unique `[justiceId, periodStart]` |

### Duas ausências que são decisão, não esquecimento

```mermaid
graph LR
    subgraph engajamento["Camada de ENGAJAMENTO (pessoal)"]
        UBV[UserBillVote]
    end
    subgraph avaliacao["Camada de AVALIAÇÃO (factual)"]
        S[Score]
        SS[StfScore]
    end
    style UBV fill:#1e293b,stroke:#f59e0b,color:#e2e8f0
    style S fill:#0f172a,stroke:#10b981,color:#e2e8f0
    style SS fill:#0f172a,stroke:#10b981,color:#e2e8f0
```

**Não existe aresta** entre `UserBillVote` e `Score`/`StfScore`. A neutralidade
algorítmica é uma propriedade do schema — ver [ADR-011](ADR.md#adr-011).

---

## 2. Sequência — cálculo do IDIP

Fluxo completo, do dado bruto ao número que a interface exibe. Separado em dois
momentos: **cálculo** (pipeline, offline) e **leitura** (runtime, por requisição).

### 2.1 Cálculo (offline — operador dispara)

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operador
    participant ETL as apps/pipeline/etl/*.py
    participant Raw as data/raw/*.json
    participant Load as scripts/load-*.ts
    participant DB as Postgres
    participant Rec as scripts/recalculate-scores.ts
    participant Cap as scripts/apply-integrity-caps.ts
    participant Snap as scripts/snapshot-scores.ts
    participant Motor as packages/idip (scoring.ts)

    Op->>ETL: npm run etl:camara
    ETL->>Raw: grava *_raw.json (camada imutável)
    Op->>Load: npm run db:load-camara
    Load->>Raw: lê (não re-baixa)
    Load->>DB: upsert/createMany idempotente

    Op->>Rec: npm run recalculate-scores
    Rec->>DB: groupBy votos, autorias, presenças
    Rec->>DB: findMany Person + último Term + custos + finanças
    Note over Rec: deriva productivity, presence,<br/>campaign, costEfficiency e dataCompleteness
    Rec->>Motor: calculateIDIP(metrics, "LEGISLATIVE")
    Motor-->>Rec: finalScore, reliability, confidence, hardCapApplied, breakdown
    Rec->>DB: upsert Score (id = score_{termId}_v1, version "1.1.0")

    Op->>Cap: npm run apply-integrity-caps
    Cap->>DB: lê LegalRecord de cada Person
    Note over Cap: CONDEMNATION + TRANSITADO_EM_JULGADO<br/>ACCOUNTS_REJECTED<br/>IMPEACHMENT (detectado, mas não trava sozinho)
    Cap->>Motor: calculateIDIP({ integrity: 0, ... })
    Motor-->>Cap: nota limitada a 39.9, RED
    Cap->>DB: update Score (integrityScore = 0)

    Op->>Snap: npm run db:snapshot
    Snap->>DB: findMany Score WHERE reliabilityStatus != GRAY
    Note over Snap: snapshotDate = 1º dia do mês, 00:00 UTC
    Snap->>DB: createMany ScoreSnapshot (skipDuplicates)
```

**Pontos de atenção verificados:**

- O ETL Python **nunca** escreve no banco; o load TS nunca re-baixa dado
  ([ADR-010](ADR.md#adr-010)).
- `apply-integrity-caps` roda **depois** do recálculo — rodar antes não tem efeito.
- Snapshots **excluem GRAY**: baseline provisório não vale como histórico.
- A data do snapshot é o **1º dia do mês em UTC**, não o último dia (correção de
  duplicata e de data futura — `AUDITORIA_PRODUCAO.md` §0.3).

### 2.2 Leitura (runtime — por requisição)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant MW as middleware.ts (Edge)
    participant Page as Server Component
    participant Prisma as Prisma Client
    participant Pool as Supabase pooler (6543)
    participant DB as Postgres

    U->>MW: GET /ranking
    MW->>MW: headers de segurança (CSP, X-Frame-Options, nosniff…)
    Note over MW: rate limit só em /api/* (60/min; 10/min em auth)
    MW->>Page: NextResponse.next()
    Page->>Prisma: score.findMany({ confidenceScore >= 60, orderBy finalScore desc })
    Prisma->>Pool: query (connection_limit=1, transaction mode)
    Pool->>DB: —
    DB-->>Page: linhas
    Page->>Page: partição ranked / insufficient + slice (PAGE_SIZE 100)
    Page-->>U: HTML (RSC)
```

### 2.3 A regra de corte, em fluxo

```mermaid
flowchart TD
    A["Score calculado"] --> B{"dataCompleteness < 60?"}
    B -- sim --> GRAY["⚪ GRAY<br/>Dados Insuficientes<br/>FORA do ranking"]
    B -- não --> C{"hardCapApplied?<br/>(condenação TJ ou contas rejeitadas)"}
    C -- sim --> RED["🔴 RED<br/>nota ≤ 39.9"]
    C -- não --> D{"dataCompleteness < 80<br/>ou integrity < 60?"}
    D -- sim --> YEL["🟡 YELLOW<br/>Atenção / Risco"]
    D -- não --> GRN["🟢 GREEN<br/>Confiável"]
    GRN --> RANK["Entra no ranking<br/>ordenado por finalScore desc"]
    YEL --> RANK
    RED --> RANK
    GRAY --> ABA["Aba separada<br/>sem posição, opacidade menor"]

    style GRAY fill:#334155,stroke:#94a3b8,color:#f1f5f9
    style RED fill:#450a0a,stroke:#f87171,color:#fee2e2
    style YEL fill:#451a03,stroke:#fbbf24,color:#fef3c7
    style GRN fill:#022c22,stroke:#34d399,color:#d1fae5
```

Precedência **GRAY → RED → YELLOW → GREEN**: o primeiro que casar vence.
`RED` **entra** no ranking (com nota travada em 39.9); apenas `GRAY` fica fora.
Detalhamento em [SCORING_METHODOLOGY.md §4.5 e §5](SCORING_METHODOLOGY.md).

---

## 3. Sequência — travas de integridade em detalhe

```mermaid
sequenceDiagram
    autonumber
    participant Cap as apply-integrity-caps.ts
    participant DB as Postgres (LegalRecord)
    participant Motor as calculateIDIP
    participant Score as Score

    Cap->>DB: person.findMany({ externalId NOT startsWith "seed-" },<br/>include legalRecords + último Term + score)
    loop para cada Person
        Cap->>Cap: hasCondemnation = tipo CONDEMNATION e status TRANSITADO_EM_JULGADO
        Cap->>Cap: hasAccountsRejected = tipo ACCOUNTS_REJECTED
        Cap->>Cap: hasImpeachment = tipo IMPEACHMENT
        alt nenhum gatilho
            Cap->>Cap: skip (não altera a nota)
        else algum gatilho
            Cap->>Motor: calculateIDIP({ integrity: 0,<br/>hasFinalCondemnation, hasRejectedAccounts,<br/>productivity/transparency do score atual,<br/>demais dimensões em 50 })
            Motor->>Motor: integrity = 0
            Motor->>Motor: capped = min(rawScore, 39.9)
            Motor->>Motor: reliability = RED
            Motor-->>Cap: finalScore, hardCapApplied = true
            Cap->>Score: update({ finalScore, reliabilityStatus, integrityScore: 0 })
        end
    end
```

**Furo conhecido, visível no diagrama:** `hasImpeachment` é detectado mas **não é
passado ao motor** — a trava só dispara se condenação ou contas rejeitadas também
existirem. Ver [SCORING_METHODOLOGY.md §4.2](SCORING_METHODOLOGY.md) e
[ROADMAP A3](../01-product-discovery/ROADMAP.md).

---

## 4. Fluxo de ETL (pipeline completo)

```mermaid
flowchart TB
    subgraph fontes["Fontes oficiais"]
        CAM["Câmara — dados abertos v2<br/>(JSON)"]
        SEN["Senado — dados abertos<br/>(JSON, sem CPF)"]
        TSE["TSE — CDN<br/>(CSV/ZIP Latin-1, com CPF)"]
        TCU["TCU — certidões<br/>(CSV sep=pipe, Latin-1)"]
        QD["Querido Diário / OKBR<br/>(JSON)"]
        RSS["Agencias de checagem<br/>(RSS)"]
    end

    subgraph etl["apps/pipeline/etl/*.py — coleta (Python 3.12)"]
        E1["camara_deputados.py<br/>camara_completa.py<br/>camara_proposicoes.py"]
        E2["camara_votacoes*.py<br/>camara_presenca.py<br/>camara_ceap*.py"]
        E3["senado_federal.py"]
        E4["tse_candidatos.py<br/>tse_bens.py<br/>tse_receitas.py"]
        E5["legal_records.py<br/>(modo LOCAL-FIRST)"]
        E6["municipal_gazettes.py<br/>fact_checking_rss.py"]
    end

    RAW[("data/raw/*.json<br/>camada raw imutável<br/>gitignored")]

    subgraph load["apps/pipeline/scripts/load-*.ts — carga (tsx + Prisma)"]
        L1["load-camara*, load-senado"]
        L2["load-votacoes*, load-presenca"]
        L3["load-proposicoes, tag-bills"]
        L4["load-campaign-finance, load-receitas<br/>load-ceap*, load-patrimony*"]
        L5["load-legal-records"]
        L6["load-municipal, load-fact-checking"]
    end

    DB[("PostgreSQL<br/>Supabase")]

    CAM --> E1 --> RAW
    CAM --> E2 --> RAW
    SEN --> E3 --> RAW
    TSE --> E4 --> RAW
    TCU -.->|"arquivo manual<br/>(fonte bloqueada)"| E5 --> RAW
    QD --> E6 --> RAW
    RSS --> E6 --> RAW

    RAW --> L1 --> DB
    RAW --> L2 --> DB
    RAW --> L3 --> DB
    RAW --> L4 --> DB
    RAW --> L5 --> DB
    RAW --> L6 --> DB

    subgraph calc["Recálculo e séries"]
        R1["recalculate-scores.ts<br/>→ Score"]
        R2["apply-integrity-caps.ts<br/>→ trava §4"]
        R3["snapshot-scores.ts<br/>→ ScoreSnapshot"]
        R4["mark-first-terms.ts<br/>detect-secret-votes.ts"]
    end
    DB --> R1 --> DB
    DB --> R2 --> DB
    DB --> R3 --> DB
    DB --> R4 --> DB

    style E5 stroke-dasharray: 5 5
    style TCU stroke-dasharray: 5 5
```

**Linhas tracejadas** são os pontos de bloqueio real, não de estilo: o ETL
jurídico (TCU/STF) opera em modo *local-first*, esperando que um humano deposite o
arquivo em `data/raw/`. É a razão de `LegalRecord` ter 0 registros.

### 4.1 Ordem obrigatória de execução

```mermaid
flowchart LR
    A["1. npm run etl:*<br/>(coleta)"] --> B["2. npm run db:load-*<br/>(carga idempotente)"]
    B --> C["3. npm run recalculate-scores<br/>(nota)"]
    C --> D["4. npm run apply-integrity-caps<br/>(travas)"]
    D --> E["5. npm run db:snapshot<br/>(série mensal)"]
    E --> F["6. npm run verify:scoring<br/>verify:identity"]
```

Inverter 3 e 4 faz o recálculo sobrescrever a trava. Inverter 4 e 5 faz o
snapshot guardar o estado antes da trava — e GRAY nunca entra no snapshot, mas um
RED resultante da trava entraria com nota errada.

---

## 5. Fluxo de resolução de identidade

`packages/idip/src/identity.ts` — cruza parlamentar (Câmara/Senado) com
candidatura do TSE.

```mermaid
flowchart TD
    A["Parlamentar: politicalName, uf, partyAcronym, cargo"] --> B["normalizeName<br/>(NFD, sem acento, minúsculas,<br/>sem sufixos jr/filho/neto)"]
    B --> C["Filtra TSE por UF + cargo<br/>(homônimo só existe em outra<br/>circunscrição ou outro cargo)"]
    C --> D{"Estágio 1<br/>nome de urna exato?"}
    D -- "1 resultado" --> HIGH1["HIGH<br/>Nome + UF + cargo exatos<br/>(partido divergente não invalida)"]
    D -- ">1 resultado" --> D2{"Reeleito?<br/>registro mais recente E eleito"}
    D2 -- "1 eleito recente" --> HIGH2["HIGH<br/>reeleito: registro TSE/ano"]
    D2 -- "vários" --> D3{"Desempate por partido"}
    D3 -- "1" --> HIGH3["HIGH"]
    D3 -- "vários" --> NONE1["NONE<br/>Ambíguo: N registros sem desempate"]
    D -- "0 resultados" --> E{"Estágio 2<br/>contenção de tokens"}
    E -- "contido + partido" --> HIGH4["HIGH<br/>ex.: FRAGA para Alberto Fraga"]
    E -- "contido, partido divergente" --> MED1["MEDIUM<br/>revisar"]
    E -- "nenhum" --> F{"Estágio 3<br/>similaridade ≥ 0.85"}
    F -- "1 melhor, sem empate" --> MED2["MEDIUM<br/>ex.: DELEGADO ALESSANDRO VIEIRA"]
    F -- "empate" --> NONE2["NONE<br/>Ambíguo"]
    F -- "nenhum" --> NONE3["NONE<br/>Sem candidato compatível"]

    style HIGH1 fill:#022c22,stroke:#34d399,color:#d1fae5
    style HIGH2 fill:#022c22,stroke:#34d399,color:#d1fae5
    style HIGH3 fill:#022c22,stroke:#34d399,color:#d1fae5
    style HIGH4 fill:#022c22,stroke:#34d399,color:#d1fae5
    style MED1 fill:#451a03,stroke:#fbbf24,color:#fef3c7
    style MED2 fill:#451a03,stroke:#fbbf24,color:#fef3c7
    style NONE1 fill:#450a0a,stroke:#f87171,color:#fee2e2
    style NONE2 fill:#450a0a,stroke:#f87171,color:#fee2e2
    style NONE3 fill:#450a0a,stroke:#f87171,color:#fee2e2
```

A similaridade final é `max(containment, jaccard, levenshtein_normalizado)`.
`containment` é limitado a 0.5 quando o nome menor tem apenas 1 token — evita que
"Silva" seja semelhante a qualquer pessoa. Testado por
`apps/pipeline/scripts/verify-identity.ts`.

**Uso atual e limite:** este motor resolve a **identidade eleitoral**
(TSE), não o casamento de registros jurídicos. O casamento do TCU
(`load-legal-records.ts`) usa apenas `normalizeName` **exato** — deliberadamente
mais conservador, porque um falso positivo ali é risco jurídico direto.

---

## 6. Fluxo de autenticação, consentimento e votação

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant Reg as POST /api/auth/register
    participant Auth as NextAuth (/api/auth/[...nextauth])
    participant Con as /api/consent
    participant Vote as /api/bills/[id]/vote
    participant DB as Postgres

    U->>Reg: email + senha + clickwrap<br/>(Termos, Privacidade, 18+)
    Reg->>DB: User.create (bcrypt, termsVersion + termsAcceptedAt)
    Note over Reg: rate limit crítico: 10 req/min

    U->>Auth: login (credentials ou Google)
    Auth->>DB: valida / cria Account
    Note over Auth: OAuth grava aceite de termos no 1º login (callback signIn)

    U->>Con: POST (consentimento específico — opinião política, Art. 11)
    Con->>DB: politicalConsentVersion + politicalConsentAt

    U->>Vote: POST { vote: "FAVOR" }
    Vote->>Vote: sessão? (401 AUTH_REQUIRED se não)
    Vote->>DB: user.findUnique (createdAt, consentimento)
    alt conta com menos de 24h
        Vote-->>U: 403 ACCOUNT_TOO_NEW (anti-bot)
    else sem consentimento ativo
        Vote-->>U: 403 CONSENT_REQUIRED
    else ok
        Vote->>DB: UserBillVote.upsert (único por user+bill, alterável)
        Vote-->>U: 200
    end

    U->>Con: DELETE (revogação)
    Con->>DB: politicalConsentWithdrawnAt = now()
    Con->>DB: deleteMany UserBillVote (do usuário)
    Note over Con: revogação elimina os votos (LGPD Art. 18, VI)

    U->>Vote: GET (contagens públicas)
    Vote->>DB: userBillVote.groupBy(vote)
    Vote-->>U: { favor, contra, me }
```

---

## 7. Fluxo de SEO (sitemap e robots)

```mermaid
flowchart TD
    R["robots.txt<br/>src/app/robots.ts"] -->|"Sitemap: /sitemap.xml"| IDX

    IDX["/sitemap.xml<br/>src/app/sitemap.xml/route.ts"] --> CI["calcularIds()<br/>ceil(bill.count() / 4000) + 1"]
    CI --> IDX
    IDX -->|"um sitemap por id"| F0["/sitemap/0.xml<br/>rotas estáticas + perfis + partidos"]
    IDX --> F1["/sitemap/1.xml<br/>até 4.000 proposições"]
    IDX --> FN["/sitemap/N.xml"]

    F0 --> E0["entradasDoArquivo(0)"]
    F1 --> E1["entradasDoArquivo(1)<br/>skip (id-1)*4000, take 4000"]
    FN --> EN["entradasDoArquivo(N)"]

    E0 --> XML["xmlDoUrlset()"]
    E1 --> XML
    EN --> XML

    BAD["id fora da faixa"] --> N404["404 — nunca XML vazio"]

    style BAD fill:#450a0a,stroke:#f87171,color:#fee2e2
    style N404 fill:#450a0a,stroke:#f87171,color:#fee2e2
```

Contrato de falha: se o banco estiver indisponível, `calcularIds()` devolve ao
menos `[0]` e `entradasDoArquivo(0)` devolve as rotas estáticas — o índice
continua válido apontando para o arquivo base. Ver [ADR-009](ADR.md#adr-009).

---

## 8. Deployment e integração contínua

```mermaid
flowchart LR
    DEV["Desenvolvedor"] -->|"git push main"| GH["GitHub"]
    GH --> CI["ci.yml<br/>prisma generate → typecheck →<br/>verify:scoring → verify:identity → build"]
    CI -->|"sucesso"| VC["Vercel<br/>Root Directory apps/web<br/>regions gru1"]
    VC --> POOL["Supabase pooler 6543<br/>transaction mode"]
    VC --> WWW["www.curriculopolitico.org"]
    WWW --> CF["Cloudflare<br/>WAF / CDN"]

    SCH1["cron 0 3 1 * *"] --> SNAP["monthly-snapshot.yml<br/>db:snapshot + verify-snapshot"]
    SNAP --> SEC["secret DATABASE_URL"]
    SEC --> POOL

    SCH2["cron 0 */6 * * *"] --> SMOKE["production-smoke.yml<br/>home, ranking, /api/search,<br/>/api/rankings, /status"]
    SMOKE --> WWW

    SCH3["cron 30 */6 * * *"] --> A11Y["a11y.yml<br/>Playwright + axe (wcag22aa)<br/>contra PRODUÇÃO"]
    A11Y --> WWW

    style CI fill:#0f172a,stroke:#38bdf8,color:#e0f2fe
    style A11Y fill:#0f172a,stroke:#34d399,color:#d1fae5
    style SMOKE fill:#0f172a,stroke:#fbbf24,color:#fef3c7
    style SNAP fill:#0f172a,stroke:#a78bfa,color:#ede9fe
```

---

## 9. Notas de manutenção

1. Os diagramas descrevem o estado atual. Ao mudar o pipeline ou o motor,
   atualize o diagrama **no mesmo PR** — diagrama desatualizado é pior que
   ausente, porque é lido como verdade.
2. O diagrama de entidades permite `erDiagram` do Mermaid, que não suporta todos
   os campos; por isso a tabela de campos logo abaixo dele existe.
3. Os blocos `style` usam cores próximas dos tokens do projeto
   (`slate-950`/`emerald`/`amber`/`red`), apenas para leitura no GitHub — **não**
   são tokens de design e não devem ser reutilizados na UI.
4. Os estados do Termômetro derivam de `enum ReliabilityStatus`
   (`apps/web/prisma/schema.prisma`). A aparência real está em
   `apps/web/src/lib/status-visual.ts` — não replique as cores daqui em
   componente.

## 10. Referências

- [DATA_MODEL.md](DATA_MODEL.md) — descrição textual de cada model.
- [SCORING_METHODOLOGY.md](SCORING_METHODOLOGY.md) · [STF_SCORING.md](STF_SCORING.md)
- [ARCHITECTURE.md](ARCHITECTURE.md) · [ADR.md](ADR.md)
- `apps/web/prisma/schema.prisma` · `apps/pipeline/README.md` · `apps/pipeline/scripts/recalculate-scores.ts`
- `packages/idip/src/identity.ts` · `packages/idip/src/scoring.ts`
