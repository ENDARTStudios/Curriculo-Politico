# Monitoramento

## Camadas
| Camada | Ferramenta | Status |
|---|---|---|
| Erros | Sentry (DSN pendente) | ⚙️ Wired |
| Uptime | UptimeRobot (script pronto) | ⚙️ Pendente API key |
| CI Smoke | production-smoke.yml (cron 6h) | ✅ Ativo |
| Health | /status público | ✅ Ativo |

## Métricas Monitoradas
- Home, /ranking, /status: HTTP 200
- API busca: retorna resultados
- API rankings: tem dados
- /status: sem "Indisponível"
- Sentry: erros não capturados

## Alertas
- Sentry: > 10 erros/min → alertar
- UptimeRobot: down > 2 checks → alertar
- Smoke test CI: falha → notificar GitHub
