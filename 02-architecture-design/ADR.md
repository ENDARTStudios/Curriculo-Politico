# Architecture Decision Records (ADR)

Registro das decisões arquiteturais significativas. Cada ADR é imutável —
decisões revertidas recebem um novo ADR que supersede o anterior.

---

## ADR-001: Monólito Modular com Next.js App Router

**Status:** Aceito | **Data:** 2026-09-28

**Contexto:** Precisávamos de uma arquitetura que permitisse lançamento rápido
com um único deploy, mas que pudesse escalar para microserviços se necessário.

**Decisão:** Next.js 15 (App Router) como monólito modular — rotas API,
scoring engine e pages no mesmo deploy. Separado logicamente em `src/lib/`
(pure), `src/app/api/` (rotas) e `src/app/` (pages).

**Consequências:** Deploy simplificado (Vercel). Refactoring para microserviços
possível pois as libs em `src/lib/` são puras e sem dependência de framework.

---

## ADR-002: PostgreSQL via Prisma ORM

**Status:** Aceito | **Data:** 2026-09-28

**Contexto:** Dados relacionais complexos (Person → Term → Score → breakdown)
com múltiplas relações e agregações.

**Decisão:** PostgreSQL (Supabase em produção, Docker local) com Prisma ORM
para type-safety e migrations versionadas.

**Consequências:** Migrations via `prisma migrate deploy` em produção.
`prisma generate` explícito no build (install-scripts bloqueados na Vercel).

---

## ADR-003: IDIP como Motor Puro e Versionado

**Status:** Aceito | **Data:** 2026-09-28

**Contexto:** A nota IDIP é o coração do projeto. Qualquer bug ou mudança de
fórmula afeta a credibilidade pública.

**Decisão:** Motor em `src/lib/scoring.ts` como função pura, sem I/O, com
pesos exportados e testáveis. Cada nota grava `version` — mudanças de fórmula
geram nova versão, nunca reescrita silenciosa.

**Consequências:** Recalibrações exigem bump de versão + atualização de
`/metodologia` + `verify-scoring.ts`. Score antigo preservado via snapshots.

---

## ADR-004: Neutralidade Algorítmica (Voto Popular Separado)

**Status:** Aceito | **Data:** 2026-09-28

**Contexto:** Votação popular de projetos poderia ser vista como viés ou
manipulação da nota.

**Decisão:** Arquitetura de duas camadas — IDIP (factual, baseado em dados
oficiais) e UserBillVote (engajamento pessoal, em tabelas separadas).
Nenhuma query do IDIP lê de UserBillVote.

**Consequências:** O IDIP é imune a campanhas de manipulação. O Filtro de
Afinidade é pessoal (localStorage) e nunca persiste no servidor.

---

## ADR-005: Supabase Pooler em Produção

**Status:** Aceito | **Data:** 2026-09-29

**Contexto:** Serverless (Vercel) abre muitas conexões curtas — o limite do
Postgres direto é rapidamente atingido.

**Decisão:** Conexão via Supavisor pooler (`aws-0-sa-east-1.pooler.supabase.com:5432`)
com username `role.project_ref`. Migrations usam a mesma URL.

**Consequências:** Prepared statements não funcionam via pooler transaction
mode. Prisma usa `?pgbouncer=true` implicitamente no session mode 5432.

---

## ADR-006: Rol Dedicado (`curriculo_app`) no Supabase

**Status:** Aceito | **Data:** 2026-09-29

**Contexto:** O role `postgres` não permite ALTER PASSWORD via Management API
sem superuser. A senha original é desconhecida.

**Decisão:** Criar `curriculo_app` com LOGIN, PASSWORD e GRANT ALL no schema
public via Management API SQL endpoint. Este role é usado no DATABASE_URL.

**Consequências:** Password reset do dashboard não afeta o role da aplicação.
O role `postgres` permanece para o dashboard/SQL editor.
