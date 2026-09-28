# Baseline de Segurança e Compliance

## 1. Segurança de Borda e Infraestrutura
- Todo tráfego passa por Cloudflare (Proxy Ativo).
- Rate Limiting estrito em APIs públicas (ex: 60 req/min por IP).
- Headers de Segurança: CSP, HSTS, X-Frame-Options.

## 2. Autenticação e Acesso
- Senhas hasheadas com Argon2id.
- MFA obrigatório para contas de Administrador/Moderador.
- Princípio do Menor Privilégio (RBAC).

## 3. Compliance Legal e LGPD
- **Minimização:** Nenhum CPF, endereço residencial ou dado familiar será exposto.
- **Linguagem:** Uso exclusivo de termos jurídicos (Ex: "Réu em Ação Penal", "Condenação em 2ª Instância"). Proibido usar "Crime" sem trânsito em julgado.
- **Retenção:** Dados judiciais arquivados/absolvidos devem ser ocultados do perfil público automaticamente.
- **Direito de Resposta:** Canal aberto para retificação de dados por parte do político avaliado, com SLA de resposta e auditoria.
