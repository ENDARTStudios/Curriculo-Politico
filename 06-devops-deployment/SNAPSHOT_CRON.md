# Cron Mensal de Snapshots

## Propósito
Gerar snapshots mensais das notas IDIP para alimentar o gráfico de evolução
temporal nos perfis de políticos e partidos.

## Agendamento
- **Quando:** Dia 1 de cada mês às 03:00 UTC
- **Onde:** GitHub Actions (`.github/workflows/monthly-snapshot.yml`)
- **O que faz:** Executa `npm run db:snapshot` e verifica a criação
  (`scripts/verify-snapshot.ts`)

## Requisitos
- `DATABASE_URL` configurado como secret no GitHub
- Banco acessível via internet (Railway, Render, Supabase)

## Execução Manual
Para gerar um snapshot fora do cron:
1. Acesse Actions → Monthly Score Snapshot
2. Clique em "Run workflow"

Localmente: `npm run db:snapshot`

## Verificação
Após a execução, acesse qualquer perfil de político e confirme que o gráfico
"Evolução Histórica" tem um novo ponto.

## Retenção
Snapshots são mantidos indefinidamente. Para limpeza futura:
- Manter no mínimo 12 meses de histórico
- Arquivar snapshots com mais de 5 anos
