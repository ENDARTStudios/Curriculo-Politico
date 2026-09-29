# Setup — Ambiente de Desenvolvimento

## Pré-requisitos
- Node.js 20+ (recomendado: 24)
- Python 3.12+
- Docker Desktop (ou Docker Engine)
- Git

## Passo a Passo

```bash
# 1. Clonar
git clone https://github.com/ENDARTStudios/Curriculo-Politico.git
cd Curriculo-Politico

# 2. Instalar dependências Node
npm install

# 3. Subir banco local (Postgres + Redis)
docker compose up -d

# 4. Configurar variáveis
cp .env.example .env
# Editar .env com DATABASE_URL do Docker local

# 5. Aplicar migrations
npx prisma migrate deploy

# 6. Gerar Prisma Client
npx prisma generate

# 7. Popular com dados (em ordem)
npm run seed:production    # cadeia completa (usa raws em data/raw/)
# OU individualmente:
npm run db:load-camara-completa
npm run db:load-senado
npm run db:load-votacoes-historico
npm run db:load-proposicoes
npm run db:load-presenca
npm run resolve-identity
npm run db:load-ceap-bulk
npm run recalculate-scores
npm run db:snapshot

# 8. Iniciar
npm run dev
```

## Variáveis de Ambiente
| Variável | Obrigatória | Descrição |
|---|---|---|
| DATABASE_URL | ✅ | Postgres (local ou Supabase) |
| NEXTAUTH_URL | Auth | http://localhost:3000 em dev |
| NEXTAUTH_SECRET | Auth | openssl rand -base64 32 |
| SUPABASE_PROJECT_ID | Supabase | Ref do projeto |
| SUPABASE_SECRET_KEY | Supabase | Chave de serviço |
| SUPABASE_ACCESS_TOKEN | Supabase CLI | Token pessoal (sbp_) |
| SENTRY_DSN | Opcional | Monitoramento de erros |
| GOOGLE_CLIENT_ID | Opcional | OAuth Google |
| GOOGLE_CLIENT_SECRET | Opcional | OAuth Google |
| NEXT_PUBLIC_PIX_KEY | Opcional | Chave Pix para /apoie |

## Portas Locais
| Serviço | Porta | Motivo |
|---|---|---|
| Next.js dev | 3000 | Default |
| Postgres (Docker) | 15432 | 5432 ocupado por outro projeto |
| Redis (Docker) | 16379 | 6379 ocupado |
| Servidor de teste | 3100 | Para não conflitar com dev |
