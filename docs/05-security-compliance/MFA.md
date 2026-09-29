# MFA — Autenticação Multifator

## Status: Planejado (Fase 4)
MFA será obrigatório para contas administrativas e opcional para usuários.

## Plano
- TOTP (Google Authenticator, Authy) via NextAuth
- Backup codes para recuperação
- Obrigatório para roles admin/moderador

## Por que ainda não implementamos
- Não há contas administrativas ainda
- Votação popular não requer MFA (anti-bot 24h é suficiente)
- Prioridade após deploy de contas reais
