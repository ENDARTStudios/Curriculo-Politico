# MFA — Autenticação multifator

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Status:** ❌ **não implementado** — nenhum segundo fator, para nenhum tipo de conta.

> Este documento existe para registrar **por que não existe**, **qual é o risco
> concreto** e **o que exatamente seria necessário** para implementar. Ele não
> descreve um controle que a plataforma possui.

---

## 1. O que existe hoje (verificado no código)

| Fator | Presente? | Evidência |
|---|---|---|
| Senha (conhecimento) | ✅ | `bcrypt.compare` no `CredentialsProvider` — [`lib/auth.ts`](../../apps/web/src/lib/auth.ts) L37 |
| Google OAuth (federação) | ⚠️ Condicional | Provider só é registrado com `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (`lib/auth.ts` L13–22). **Se configurado hoje, não é segundo fator — é login alternativo**, e não exige senha |
| TOTP / app autenticador | ❌ | Nenhuma dependência (`apps/web/package.json` não tem `otplib`, `speakeasy`, `otpauth`) |
| WebAuthn / passkey | ❌ | Nenhuma dependência |
| Código por e-mail | ❌ | Impossível: não há serviço de e-mail (RIPD §6.5) |
| SMS / telefone | ❌ | Nenhum telefone é coletado (minimização — RIPD §2) |
| Códigos de recuperação | ❌ | Não existem |
| Enforcement por tarefa sensível | ❌ | Nenhuma rota verifica segundo fator |
| MFA para o operador (Vercel/Supabase/GitHub) | ⚠️ **não verificado** | É configuração de painel, não de repositório — ver [`IAM_IGA.md`](./IAM_IGA.md) §6.2 |

**Fato arquitetural relevante:** o NextAuth v4 **não oferece MFA nativo**. Não
existe plugin oficial para TOTP no v4; qualquer MFA seria implementação própria
(ou migração de biblioteca). A pesquisa registrada em
`docs/ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md` §2.3 aponta o
**Better Auth** como a alternativa que traz 2FA nativo — mas migrar de
biblioteca de autenticação é decisão arquitetural, não um "habilitar flag".

---

## 2. Risco concreto de não ter MFA

Não é um risco abstrato. Traduzindo para este projeto:

### 2.1 O que **não** está em jogo (e é importante dizer)

- Não há painel administrativo, não há console de operador na aplicação, não há
  papel privilegiado a tomar. **Comprometer a conta de um usuário comum não dá
  acesso a nada além dos dados daquele próprio usuário** — e esses dados
  (e-mail, nome, votos) ele já pode ver logado.
- Não há dado financeiro, não há dado de saúde, não há CPF de usuário.

### 2.2 O que **está** em jogo

| Risco | Como se materializa | Gravidade |
|---|---|---|
| **Voto em nome de outra pessoa (dado sensível)** | Conta comprometida = manipulação de opinião política nominal. Em uma plataforma cujo produto é credibilidade pública, "fulano votou CONTRA" forjado é dano reputacional direto à pessoa | **Alto** |
| **Revogação de consentimento indevida** | `DELETE /api/consent` apaga **todos** os votos do usuário. Quem tem a conta pode destruir o histórico de engajamento da vítima | Médio |
| **Exclusão de conta (negação de serviço ao titular)** | `DELETE /api/account` apaga a conta e é irreversível (não há backup — ver [`BACKUP_DR.md`](../06-devops-deployment/BACKUP_DR.md)). Um atacante que tome a conta **destrói o dado** | **Alto** |
| **Uso do canal de retificação em nome da vítima** | Se a vítima for agente político, quem controla o e-mail pode protocolar solicitações falsas | Médio |
| **Reuso de senha em outro serviço** | Sem MFA, a única barreira é a senha. `bcrypt` **cost 10** é bom, mas não impede *credential stuffing* com senhas vazadas de terceiros | Médio |
| **Ausência de log de login** | Com Sentry dormente, uma conta tomada **não gera evidência nenhuma**. O titular não é notificado de acesso de novo dispositivo | **Alto** — é a pior parte: o incidente é invisível |

**Cenário realista e barato** (não exige atacante sofisticado): o projeto não
tem verificação de e-mail, não tem reset de senha e não tem notificação. Um
atacante com uma lista de e-mails e senhas vazadas de outros sites tenta login
por credenciais em `/api/auth/signin`. O rate limit crítico é de **10 req/min
por instância** (`middleware.ts` L21–22, L32–37) e **zera a cada cold start** —
em serverless, o teto efetivo é `10 × nº de instâncias × reinícios`. A tentativa
é silenciosa e não deixa rastro para o titular nem para o operador.

### 2.3 Por que o MFA resolveria só parcialmente

Como o Google OAuth, **se ativado**, entra sem exigir senha
(`lib/auth.ts` L13–22 — login alternativo, não segundo fator), um MFA de TOTP
aplicado só ao `CredentialsProvider` seria contornável **pelo próprio botão do
Google**, a menos que se exija MFA também para sessões vindas de OAuth. Isso é
uma armadilha de implementação comum e precisa estar decidida antes do código.

---

## 3. O que seria necessário para implementar

### 3.1 Pré-requisitos que **não** dependem de MFA (e deveriam vir antes)

Implementar MFA sobre uma base sem recuperação de conta cria um **risco novo**:
usuário que perde o autenticador perde a conta **e os votos permanentemente**
(não há backup, não há suporte, não há reset). Portanto:

1. **Serviço de e-mail transacional** (Resend/SMTP) — hoje inexistente, é o
   mesmo bloqueio que impede verificação de e-mail e reset de senha (RIPD §6.5).
2. **Recuperação de senha** — também inexistente.
3. **Log de eventos de autenticação** — para que "login de novo dispositivo"
   seja detectável e para que o resultado do MFA seja auditável. Hoje não há.
4. **Decisão sobre OAuth**: exigir segundo fator também para sessão Google, ou
   declarar explicitamente que o Google é um caminho sem MFA (e assumir o risco).

### 3.2 Implementação em NextAuth v4 (esforço alto — não recomendado isoladamente)

O v4 não tem MFA nativo. Seria preciso:

- **Modelo Prisma** para o segredo: `User.mfaSecret` (cifrado — não em texto
  claro), `mfaEnabledAt`, e uma tabela de códigos de recuperação com hash e uso
  único (o schema atual **não tem** nenhum desses campos).
- **Fluxo de dois passos** no `authorize()` do CredentialsProvider: validar
  senha → **não** emitir sessão → exigir segundo fator → emitir. O NextAuth v4
  não suporta isso sem customização do provider ou de `callbacks`.
- **Secret de criptografia** novo (`MFA_ENCRYPTION_KEY`) e sua rotação —
  hoje o projeto tem 23 variáveis manuais na Vercel e nenhum plano de rotação.
- **Gate nas rotas sensíveis** (`/api/bills/[id]/vote`, `/api/consent`,
  `/api/account`): exigir `session.mfaVerifiedAt` recente (*step-up auth*).
  Sem esse gate, MFA no login protege pouco contra sessão sequestrada por XSS.
- **Biblioteca TOTP** (`otplib`/`otpauth`) + QR code + validação de janela de
  tempo; e **rate limit no endpoint de verificação** (senão o segundo fator
  vira força bruta de 6 dígitos).

### 3.3 Alternativa considerada (e por que não é decisão deste documento)

| Opção | O que entrega | Custo | Observação |
|---|---|---|---|
| TOTP próprio no NextAuth v4 | MFA real, sem trocar de fornecedor | **Alto** — código de segurança próprio é o pior lugar para improvisar | requer os pré-requisitos da §3.1 |
| Migrar para **Better Auth** (2FA nativo) | MFA + verificação de e-mail + rate limiter nativo + reset de senha | 1–3 dias **com base em 0** (hoje); muito mais depois do lançamento | Pesquisa em `anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md` §2.3 e §5 |
| Passkeys/WebAuthn | Fator mais forte, sem senha | Alto | Nenhuma dependência hoje |
| Clerk/WorkOS (MFA gerenciado) | MFA pronto | Free tiers existem, mas **Clerk cobra pelo MFA (Pro US$ 20/mês)** e **a identidade sai do Postgres** — a um *join* do voto (dado sensível) → novo subprocessador + transferência internacional | Descartado pela pesquisa §2.3 |

**Decisão registrada:** não implementar MFA agora é **aceitável enquanto a base
de usuários é ~0 e a votação popular tem baixo volume** — o dano de um voto
forjado hoje é pequeno. Deixa de ser aceitável no momento em que a votação
ganhar visibilidade pública: a partir daí, um voto manipulado em nome de
alguém é um incidente reputacional e jurídico, e o projeto não teria nem
como detectá-lo (sem log de login) nem como reverter (sem backup).

---

## 4. Plano de ativação mínima (quando for decidido)

Ordem que evita criar risco novo:

1. Serviço de e-mail + verificação de e-mail obrigatória antes de votar.
2. Recuperação de senha.
3. Log de eventos de autenticação (tabela ou Sentry com scrubbing).
4. `bcrypt` cost **≥ 12** (hoje 10) e re-hash no próximo login bem-sucedido.
5. **MFA opcional** para todos os usuários (TOTP), com códigos de recuperação.
6. **MFA obrigatório** para quem tem qualquer privilégio de operação — e, aqui,
   a medida mais eficaz não é na aplicação: é **exigir 2FA nas contas
   GitHub/Vercel/Supabase/Google do operador** (ver [`IAM_IGA.md`](./IAM_IGA.md) §7, item 1).
7. *Step-up* nas rotas de escrita de dado sensível.

**Enquanto isso:** o risco é listado no RIPD §4 e a ausência de MFA está
declarada em [`COMPLIANCE.md`](./COMPLIANCE.md) §9 e em
[`THREAT_MODELING.md`](./THREAT_MODELING.md) (ameaças S1, I2).
