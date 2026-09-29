# Plano de Resposta a Incidentes

## Classificação
| Severidade | Exemplo | Prazo de resposta |
|---|---|---|
| Crítica | Dados pessoais vazados | Imediata |
| Alta | Site indisponível / SQL injection | < 4h |
| Média | XSS refletido / rate limit bypass | < 24h |
| Baixa | Bug visual / dado faltante | < 72h |

## Fluxo
1. **Detectar** (Sentry, smoke test, report manual)
2. **Conter** (reverter deploy, bloquear IP, desativar rota)
3. **Comunicar** (ANPD se dados pessoais; usuários se afetados)
4. **Corrigir** (fix + testes de regressão)
5. **Documentar** (post-mortem em 72h)

## Contatos
- Segurança: security@curriculopolitico.org
- Vercel: status.vercel.com
- Supabase: status.supabase.com

## LGPD Art. 48
Incidente com risco a titulares: comunicar ANPD e titulares em prazo razoável.
