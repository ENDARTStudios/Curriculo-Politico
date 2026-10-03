# @cp/web — Aplicação Currículo Político

Next.js 15 (App Router) + TypeScript estrito + TailwindCSS 4 + Prisma + NextAuth v4.

## O que vive aqui

- `src/app/` — páginas (ranking, perfis, projetos, comparar, jurídicas…) e API REST (`src/app/api/*`)
- `src/lib/` — consentimentos (`consent.ts`), auth, cliente Prisma. Os motores puros (IDIP e identidade) vivem em `packages/idip` (@cp/idip), compartilhados com o pipeline
- `src/middleware.ts` — CSP + rate limiting Token Bucket (60/min geral, 10/min em autenticação, por usuário JWT ou IP)
- `prisma/` — schema do banco, migrations e seed de desenvolvimento
- `public/` — estáticos

## Ambiente

Este é o **único arquivo `.env` do monorepo** — o pipeline (`apps/pipeline`) o lê daqui via `--env-file`:

```bash
cp .env.example .env   # e preencha DATABASE_URL, NEXTAUTH_SECRET, etc.
```

Chaves relevantes: `DATABASE_URL` (Supabase pooler), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET` + `NEXT_PUBLIC_GOOGLE_ENABLED` (OAuth), `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (monitoramento — dormente sem DSN).

## Comandos (da raiz do monorepo)

```bash
npm run dev          # desenvolvimento (localhost:3000)
npm run build        # prisma generate && next build
npm run typecheck    # tsc --noEmit
npm run db:migrate   # prisma migrate dev (cwd aqui — lê ./.env)
```

## Deploy

Vercel com **Root Directory = `apps/web`**. Build: `prisma generate && next build`. Variáveis de ambiente vêm do store da Vercel (Production) — os arquivos `.env*` nunca são commitados.

## Notas de arquitetura

- **Neutralidade algorítmica:** votos populares (`UserBillVote`) são tabelas separadas de `Score` e nunca entram no cálculo do IDIP.
- **LGPD:** consentimento específico versionado para voto (dado sensível), clickwrap com versão/data, `/conta` com revogação e eliminação, registros judiciais arquivados/absolvidos ocultos.
- **Baseline neutro:** dimensões sem fonte ativa = 50, com selo "sem dados · neutro" no perfil (`ScoreBreakdown`).
