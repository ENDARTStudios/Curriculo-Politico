---
name: curriculo-infra
description: Infraestrutura Vercel/Supabase, portas locais, CLIs, variáveis de ambiente e armadilhas de deploy
---

# Infraestrutura — Currículo Político

## Produção
- URL: https://curriculopolitico.org (Vercel + domínio próprio)
- Banco: Supabase (rwglxjovfhfnycgceubp, sa-east-1)
- Pooler: aws-0-sa-east-1.pooler.supabase.com:5432 (username = role.ref)

## Portas Locais (CONFLITOS!)
| Serviço | Porta | Motivo |
|---|---|---|
| Postgres Docker | 15432 | 5432 ocupado |
| Redis Docker | 16379 | 6379 ocupado |
| Next dev | 3000 | Default |
| Test server | 3100 | Para não conflitar |

## CLIs — Armadilhas
### GITHUB_TOKEN
Env var inválida sobrescreve keyring! Sempre `unset GITHUB_TOKEN` antes de gh/push.

### Vercel
- `vercel env pull` mascara valores Sensitive (ilegíveis)
- SSO Protection desativar via API v9: PATCH ssoProtection:null
- Env vars: escrever OK, ler bloqueado

### Supabase
- Management API precisa de SUPABASE_ACCESS_TOKEN (sbp_), não SECRET_KEY
- SQL endpoint: POST /database/query (sem superuser)
- Role curriculo_app criado via CREATE ROLE (senha em data/_appdb.txt)
- Pooler username = role.project_ref (não role sozinho)

### Prisma
- migrate dev bloqueado em shell não-interativo → usar migrate diff + deploy
- prisma generate DEVE estar no build script (install-scripts bloqueados)
- DATABASE_URL com pooler: username = role.project_ref

## Build na Vercel
Build script: `prisma generate && next build`
(install-scripts bloqueados = generate explícito obrigatório)
