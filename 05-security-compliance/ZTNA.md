# ZTNA — Zero Trust Network Access

## Princípio Zero Trust aplicado
"Nunca confie, sempre verifique" — mesmo dentro da infraestrutura.

## Implementação Atual
| Camada | Verificação |
|---|---|
| Identidade | NextAuth JWT em cada request |
| Transporte | HTTPS everywhere (Vercel SSL) |
| APIs | Rate limit + CSP headers |
| Banco | Role dedicado curriculo_app (não superuser) |

## Princípios Atendidos
1. Sem confiança implícita em rede interna
2. Autenticação em cada acesso
3. Menor privilégio (curriculo_app sem superuser)
4. Logs de acesso (Sentry, quando configurado)

## Próximos Passos
- Audit logging de queries administrativas
- Rotação de credenciais (NEXTAUTH_SECRET)
- Secrets manager (Vercel Encrypted / Supabase Vault)
