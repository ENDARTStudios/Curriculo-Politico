# Deploy de Produção

## Método Automático (recomendado)
Push para `main` → Vercel detecta → build → deploy → alias domínio.

## Método Manual (CLI)
```bash
vercel --prod --yes
```

## Deploy Inicial (executado)
```bash
vercel link --yes --project curriculo-politico
vercel --prod --yes
vercel alias set curriculo-politico.vercel.app curriculopolitico.org
vercel alias set curriculo-politico.vercel.app www.curriculopolitico.org
```

## Domínio
- curriculopolitico.org: registrado na Vercel, aliasado ao prod
- www.curriculopolitico.org: aliasado ao prod
- SSL: Let's Encrypt automático via Vercel

## Environment Variables (Production)
| Variável | Valor | Sensível |
|---|---|---|
| DATABASE_URL | Supabase pooler | Sim |
| NEXTAUTH_URL | https://curriculopolitico.org | Não |
| NEXTAUTH_SECRET | Gerado | Sim |
| NEXT_PUBLIC_GOOGLE_ENABLED | 1 | Não |
