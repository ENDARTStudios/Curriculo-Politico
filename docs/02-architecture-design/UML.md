# UML — Diagramas de Estrutura

## Diagrama de Entidades (ERD simplificado)

```
Person 1──* Term *──1 Office
  │           │
  │           ├──* Score
  │           ├──* LegislativeAction
  │           ├──* SessionAttendance
  │           ├──* CampaignFinance
  │           └──* ScoreSnapshot
  │
  ├──* LegalRecord
  ├──* BillAuthorship *──1 Bill
  ├──* PatrimonyHistory
  ├──* VerifiedClaim
  ├──* UserBillVote (via User)
  └──* MunicipalExpense

Party 1──* Term (membros = mandatos)
User 1──* UserBillVote *──1 Bill
User 1──* UserAffinity
```

## Fluxo de Dados (Pipeline)

```
APIs Públicas                ETL Python              Banco (Supabase)           Next.js
─────────────               ──────────              ───────────────            ────────
Câmara /deputados    ──→  load-camara-completa ──→ Person ──────────→
Câmara /despesas     ──→  load-ceap-bulk       ──→ PoliticianCost ──→
Câmara /votacoes     ──→  load-votacoes-hist   ──→ LegislativeAction
Câmara /proposicoes  ──→  load-proposicoes     ──→ Bill + BillAuthorship
Câmara /eventos      ──→  load-presenca        ──→ SessionAttendance
Câmara /eventos      ──→  tag-bills            ──→ Bill.tags
Senado /lista/atual  ──→  load-senado          ──→ Person (senadores)
TSE /consulta_cand   ──→  resolve-identity     ──→ Person.tseId
TSE /bem_candidato   ──→  load-patrimony-full  ──→ PatrimonyHistory
                                                    │
                                              recalculate-scores
                                                    │
                                              Score (v1.1) ────→  /ranking
                                                                  /politicos/[id]
                                                                  /partidos
```

## Diagrama de Sequência — Votação Popular

```
Usuário          Browser         Next.js API         Supabase
───────          ───────         ───────────         ────────
  │  GET /projetos/2643776          │                    │
  │──────────────────────→  Server Component            │
  │                          │ prisma.bill.findFirst  │
  │                          │────────────────────────→│
  │  ← HTML (BillDetails + BillVote)               │
  │←─────────────────────  │                    │
  │  GET /api/bills/2643776/vote     │           │
  │─────────────────────→  │ groupBy vote        │
  │                          │────────────────────────→│
  │  ← { favor, contra }    │                    │
  │←─────────────────────  │                    │
  │  POST (com sessão)      │                    │
  │─────────────────────→  │ getServerSession    │
  │                          │ anti-bot 24h check  │
  │                          │ upsert UserBillVote │
  │                          │────────────────────────→│
  │  ← 200 { vote }         │                    │
```
