# Processo de Iteração

## Ciclo de Release
1. **Coleta** → ETLs baixam dados das APIs públicas
2. **Load** → Scripts TS populam o banco (idempotente)
3. **Recálculo** → recalculate-scores aplica IDIP v1.1
4. **Snapshot** → score-scores grava estado mensal
5. **Deploy** → Vercel serve a nova versão

## Cadência
| Atividade | Frequência | Ferramenta |
|---|---|---|
| Votações | Semanal (manual) | npm run etl:votacoes-historico |
| Presenças | Mensal (manual) | npm run etl:presenca |
| Snapshots | Mensal (cron GitHub) | production-smoke.yml |
| Proposições | Mensal (manual) | npm run etl:proposicoes |
| CEAP | Anual (bulk) | npm run etl:ceap-bulk |
| Patrimônio | Eleitoral (2026, 2030) | npm run etl:bens-historico |

## Regras de Iteração
- Todos os loads são idempotentes (reexecutar não duplica)
- Recalculate é atômico (todos os scores ou nenhum)
- Seeds não são recalcultados em massa (fixtures preservadas)
