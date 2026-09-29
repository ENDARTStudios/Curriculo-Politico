# Error Handling

## APIs (Route Handlers)
Toda rota tem try/catch com resposta JSON:
```json
{ "error": "CÓDIGO", "message": "Descrição legível" }
```
| Código | HTTP | Significado |
|---|---|---|
| RATE_LIMITED | 429 | > 60 req/min |
| AUTH_REQUIRED | 401 | Sem sessão |
| ACCOUNT_TOO_NEW | 403 | Conta < 24h |
| POLITICIAN_NOT_FOUND | 404 | ID não existe |
| INVALID_VOTE | 400 | vote ≠ FAVOR/CONTRA |
| BANCO_INDISPONIVEL | 503 | Postgres fora |

## Páginas
- 404: notFound() em rotas dinâmicas
- 500: mensagem genérica (sem stack trace exposto)
- /status: degrada graciosamente com "Indisponível"

## Sentry
Quando SENTRY_DSN configurado, captura erros não tratados em server + client.
