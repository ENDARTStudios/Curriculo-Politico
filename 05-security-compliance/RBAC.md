# RBAC — Controle de Acesso Baseado em Funções

## Status: Planejado (Fase 4)

## Roles Planejados
| Role | Permissões |
|---|---|
| visitante | Leitura de tudo público |
| usuario | + Votação popular, afinidade |
| moderador | + Revisar retificações, gerenciar checagens |
| admin | + Gerenciar usuários, recalcular scores, editar metodologia |

## Implementação
NextAuth JWT com role no token. Middleware verifica role para rotas admin.
Prisma: campo `role` no User (default: "usuario").
