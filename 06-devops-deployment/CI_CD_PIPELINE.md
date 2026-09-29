# CI/CD Pipeline

## Workflows GitHub Actions
| Workflow | Trigger | O que faz |
|---|---|---|
| ci.yml | Push/PR | install → prisma generate → typecheck → verify:scoring → verify:identity → build |
| monthly-snapshot.yml | Cron dia 1, 03:00 UTC | db:snapshot → verify-snapshot |
| production-smoke.yml | Cron 6h | curl E2E no domínio (home, ranking, busca, API, status) |

## Deploy
| Ambiente | Trigger | URL |
|---|---|---|
| Production | Push para main (Vercel automático) | curriculopolitico.org |
| Preview | PR aberto | PR-URL.vercel.app |

## Pipeline de Deploy
```
Push → GitHub → Vercel detecta → npm ci → prisma generate → tsc → next build → deploy → alias domínio
```

## Secrets Necessários
| Secret | Onde | Uso |
|---|---|---|
| DATABASE_URL | GitHub Actions + Vercel | Conexão Supabase |
| NEXTAUTH_SECRET | Vercel | JWT |
| SENTRY_DSN | Vercel | Error tracking |
