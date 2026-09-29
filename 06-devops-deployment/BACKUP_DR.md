# Backup e Disaster Recovery

## Backup Atual
| Camada | Método | Frequência | Retenção |
|---|---|---|---|
| Supabase | Backup automático (free tier) | Diário | 7 dias |
| GitHub | Código + migrations | Cada push | Indefinida |
| Raw data | data/raw/ local | Cada crawl | Indefinida |

## RPO / RTO
- **RPO** (perda máxima de dados): 24h (backup diário Supabase)
- **RTO** (tempo máximo de recuperação): 30min (redeploy Vercel + restore Supabase)

## Disaster Recovery
### Cenário: Supabase indisponível
1. Restaurar backup diário em novo projeto Supabase
2. Atualizar DATABASE_URL no Vercel
3. Redeploy (env change)

### Cenário: Vercel indisponível
1. Alternar para Railway/Render (migrations já versionadas)
2. Apontar DNS para novo host

### Cenário: Perda de código (GitHub)
1. Clones locais (D:\PROJETOS\Currículo Político)
2. Raw data preservada localmente (data/raw/)
