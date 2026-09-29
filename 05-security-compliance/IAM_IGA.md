# IAM / IGA — Identidade e Governação de Acesso

## Modelo de Identidade
O Currículo Político NÃO tem controle de acesso baseado em funções para leitura —
todas as páginas e APIs de consulta são públicas (interesse público).

## Contas de Usuário (votação popular)
| Aspecto | Implementação |
|---|---|
| Provedor | NextAuth v4 credentials (email + bcrypt) |
| Sessão | JWT (30 dias) |
| Anti-bot | Conta < 24h não vota |
| Dados | Email + nome opcional (minimização LGPD) |

## Contas de Administração
Não existem ainda. Quando implementadas (Fase 4):
- MFA obrigatório (TOTP)
- RBAC com roles: admin, moderador, editor
- Auditoria de ações administrativas

## Princípios
1. Menor privilégio: cada role tem o mínimo necessário
2. Sem anonimato na retificação: político se identifica (LGPD Art. 18)
3. Separação de responsabilidades: quem carrega dados ≠ quem edita termos
