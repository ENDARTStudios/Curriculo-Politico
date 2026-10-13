# IAM / IGA — Gestão de identidades e de acessos

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Escopo:** o modelo de identidade e de acesso **que existe hoje**, com as lacunas de IGA (Identity Governance & Administration) explicitadas.
**Documentos irmãos:** [`RBAC.md`](./RBAC.md) · [`MFA.md`](./MFA.md) · [`RLS.md`](./RLS.md) · [`ZTNA.md`](./ZTNA.md) · [`NAC.md`](./NAC.md)

> **Resumo honesto em uma frase:** este projeto tem **duas identidades reais**
> (usuário anônimo e usuário com conta) e **um superpoder sem identidade**
> (possuir a `DATABASE_URL`). Não existe diretório, não existe papel, não existe
> MFA, não existe revisão de acesso e não existe trilha de auditoria de
> privilégio. A governança de identidade aqui é, na prática, **gestão de
> segredos**.

---

## 1. Identidades e provedores

| Identidade | Como é criada | Provedor | Armazenamento | Evidência |
|---|---|---|---|---|
| **Anônima** | Implícita (sem login) | — | Nenhum. Chave de rate limiting = IP (`middleware.ts` L79–98) | `middleware.ts` |
| **Usuário com conta — credenciais** | `POST /api/auth/register` com e-mail + senha + clickwrap + declaração 18+ | `CredentialsProvider` (NextAuth v4) | `User.email`, `User.password` (hash bcrypt) | [`api/auth/register/route.ts`](../../apps/web/src/app/api/auth/register/route.ts) |
| **Usuário com conta — Google** | Fluxo OAuth do Google | `GoogleProvider` — **condicional**: só é registrado se `GOOGLE_CLIENT_ID` **e** `GOOGLE_CLIENT_SECRET` existirem | `Account` (por `PrismaAdapter`), `User` | [`lib/auth.ts`](../../apps/web/src/lib/auth.ts) L13–22 |
| **Portador da `DATABASE_URL`** | Nenhum fluxo — é apenas um segredo | Supabase Postgres (pooler 6543 / direto 5432) | `.env` local, env da Vercel, `secrets.DATABASE_URL` no GitHub | `schema.prisma` L10–13, `.github/workflows/monthly-snapshot.yml` L31 |
| **Portador do `NEXTAUTH_SECRET`** | Nenhum fluxo | — | env da Vercel | `middleware.ts` L90 |

**Não existem:** diretório corporativo (LDAP/AD/Entra/Google Workspace),
SSO corporativo, conta de serviço formal, usuário administrativo da aplicação,
papel de "moderador" ou "curador". Confirmado por leitura: o schema não tem
tabela de papel nem campo de role; não há rota `/admin`.

---

## 2. A decisão de arquitetura com maior impacto em IAM: sessão em JWT

```ts
// apps/web/src/lib/auth.ts L11
session: { strategy: "jwt" },
```

O `PrismaAdapter` está configurado (`adapter: PrismaAdapter(prisma)`) **para
persistir usuários, contas e tokens de verificação**, mas a estratégia de sessão
é **JWT em cookie**, não sessão em banco.

Consequências de IGA que precisam estar explícitas:

| Consequência | Detalhe |
|---|---|
| **Não há revogação de sessão pelo servidor** | O modelo `Session` existe no schema, mas **não é usado para sessões ativas** com a estratégia JWT. Deslogar todos os dispositivos de um usuário, invalidar sessão após troca de senha ou após um incidente **não é suportado** sem rotacionar `NEXTAUTH_SECRET` — e isso desloga **todos os usuários de uma vez** |
| Eliminação de conta é efetiva | `DELETE /api/account` apaga o `User` (cascade em `Account`/`Session`/`UserBillVote`). O cookie JWT que estiver no navegador continua **criptograficamente válido** até expirar, mas a rota de voto falha porque o `User` não existe mais (a busca por `id` retorna `null` → `ACCOUNT_TOO_NEW`) |
| Cookie de sessão | `__Secure-next-auth.session-token` (https) ou `next-auth.session-token` (http) — a escolha é feita em `middleware.ts` L84–86 |
| Cadeia de sessão | `callbacks.jwt` injeta `token.id` e `callbacks.session` copia para `session.user.id` (`lib/auth.ts` L57–66). Todo o RBAC futuro depende desse `id` |

---

## 3. Ciclo de vida da conta (JML — Joiner / Mover / Leaver)

| Fase | O que existe | O que **não** existe |
|---|---|---|
| **Joiner (entrada)** | Cadastro por credenciais com clickwrap versionado; cadastro/entrada por Google; `signIn` grava o aceite de Termos quando ainda é nulo | Verificação de e-mail (`emailVerified` existe no schema e **nunca é preenchido** — busca no repositório não encontra escrita nesse campo); convite; aprovação |
| **Mover (mudança)** | **Não se aplica** — não há degrau de privilégio para onde subir. Todo usuário autenticado tem exatamente o mesmo poder | Promoção, delegação, conta de serviço, acesso temporário |
| **Leaver (saída)** | `DELETE /api/account` (autoatendimento, imediato). `DELETE /api/consent` revoga o consentimento e apaga os votos **sem** apagar a conta | Processo de offboarding assistido; exclusão por inatividade; expiração de conta |
| **Reativação** | Revogar consentimento é reversível: `POST /api/consent` grava novo `politicalConsentAt` e zera `withdrawnAt`. **Os votos anteriores não voltam** (foram apagados) | — |

**Lacuna de leaver:** a exclusão depende do titular agir. Não há rotina de
expurgo por inatividade. Em contrapartida, como não há dado de usuário retido
além do necessário, o risco é baixo.

---

## 4. Autenticação — força real dos fatores

| Controle | Estado | Evidência |
|---|---|---|
| Fator de conhecimento (senha) | ✅ `bcryptjs` — **cost 10** | `api/auth/register/route.ts` L76 |
| Regra de senha | ✅ mínimo **8 caracteres**, sem exigência de complexidade | idem L43–48 |
| Bloqueio por tentativas | ⚠️ Indireto: rate limit **10 req/min** por instância em `POST /api/auth/callback` e `GET /api/auth/callback` (OAuth) | `middleware.ts` L32–37 |
| Segundo fator (MFA/2FA) | ❌ **Inexistente** | ver [`MFA.md`](./MFA.md) |
| Verificação de e-mail | ❌ **Não implementada** (bloqueada por ausência de serviço de e-mail — RIPD §6.5) | — |
| Recuperação de senha | ❌ **Não existe** — não há rota de reset; depende de e-mail transacional | — |
| Política de expiração de senha | ❌ Não existe | — |
| Rotação de sessão em login | Comportamento padrão do NextAuth (**não verificado** explicitamente) | — |
| OAuth Google — validação de e-mail verificado do provedor | ⚠️ **Não há tratamento explícito** — o `signIn` callback retorna `true` incondicionalmente (`lib/auth.ts` L46–56). Não há checagem de `email_verified` nem política de *account linking* | `lib/auth.ts` |

> **A combinação "sem verificação de e-mail + sem MFA + sem reset de senha"**
> significa que, na prática, **a posse do e-mail não é comprovada em momento
> algum** — e é justamente essa posse que sustenta a atribuição de um voto
> (dado sensível) a uma pessoa. Está registrado como risco no RIPD §4.

---

## 5. Autorização — o modelo efetivo

Não há RBAC (ver [`RBAC.md`](./RBAC.md)). O que existe é um conjunto de
**checagens ad hoc por rota**:

| Rota | Método | Autorização aplicada | Código |
|---|---|---|---|
| `/api/search`, `/api/rankings`, `/api/bills`, `/api/compare`, `/api/politicians/[id]` | GET | Pública | — |
| `/api/retificacao` | POST / GET | **Pública** (decisão de projeto: o titular pode não ter conta) | `api/retificacao/route.ts` |
| `/api/auth/register` | POST | Pública (com clickwrap + 18+ obrigatórios) | `api/auth/register/route.ts` |
| `/api/bills/[id]/vote` | POST | `getServerSession` → `userId`; senão `401` | `api/bills/[id]/vote/route.ts` L77–88 |
| `/api/bills/[id]/vote` | POST | + **consentimento específico ativo** → senão `403 CONSENT_REQUIRED` | idem L131–142 |
| `/api/bills/[id]/vote` | POST | + **conta com ≥ 24 h** → senão `403 ACCOUNT_TOO_NEW` | idem L110–129 |
| `/api/consent` | POST / DELETE | `getServerSession` → `userId` | `api/consent/route.ts` L19–22 |
| `/api/account` | DELETE | `getServerSession` → `session.user.id` | `api/account/route.ts` L14–23 |

**Observações de autorização:**

1. **Ownership é garantido por construção, não por checagem.** As rotas operam
   sempre sobre `userId` extraído da sessão — **nunca** sobre um id vindo do
   corpo da requisição. Não há IDOR (Insecure Direct Object Reference) nessas
   rotas. É a decisão mais importante e está correta.
2. **A autorização vive no handler, não no middleware.** O middleware faz rate
   limit e headers de segurança — **`middleware.ts` não checa autorização**
   (não há `matcher` de rotas protegidas nem redirecionamento para `/auth/signin`
   lá; a checagem é por rota). Isso é aceitável hoje (poucas rotas), mas
   significa que **uma rota nova nasce desprotegida por padrão**.
3. **A ordem dos gates importa.** No voto, `ACCOUNT_TOO_NEW` é verificado
   **antes** do consentimento. Um usuário novo recebe `403` de idade de conta
   mesmo tendo consentido — mensagem correta, mas o gate de consentimento nunca
   é alcançado nesse caso.

---

## 6. Gestão de privilégios e de segredos (a IGA que realmente existe)

Como não há papéis, o controle de acesso efetivo é o cofre de variáveis.

| Segredo | Onde vive | Quem tem | Poder |
|---|---|---|---|
| `DATABASE_URL` (pooler 6543) | env da Vercel (runtime), `apps/web/.env` local | Operador | **Leitura e escrita em produção** |
| `DIRECT_URL` (direto 5432) | env local / CI | Operador | Migrations e ETL |
| `secrets.DATABASE_URL` (GitHub) | Repositório → Actions | Quem pode editar o repo e ler secrets | Escrita em produção (via `db:snapshot`) |
| `NEXTAUTH_SECRET` | env da Vercel | Operador | **Forjar sessão de qualquer usuário** |
| `GOOGLE_CLIENT_SECRET` | env da Vercel | Operador | Abuso do app OAuth |
| `SUPABASE_PROJECT_ID` / `_SECRET_KEY` / `_PUBLISHABLE_KEY` | `.env.example` (comentados) / painel | Operador | Administração do projeto Supabase |
| `SENTRY_DSN` | **não definido** | — | — |

**Ausências de IGA:** nenhum inventário formal de segredos; nenhuma política de
rotação; nenhuma data de última rotação registrada; nenhum cofre dedicado
(Vault/1Password/Doppler) — os segredos vivem em `.env` e no painel; nenhuma
revisão periódica de acessos; nenhuma trilha de auditoria de uso de segredo.

### 6.1 Achado relevante: contato de segurança sem governança de identidade

O RIPD §5 publica `endart.studios+security@gmail.com` como canal de segurança e
`endart.studios+privacidade@gmail.com` como DPO. São **aliases de um Gmail
pessoal** — não há caixa postal corporativa, MFA obrigatório documentado,
delegação, backup de acesso ou registro de quem leu o quê. Para um canal que
recebe **relato de vulnerabilidade** ([`VULNERABILITY_DISCLOSURE.md`](./VULNERABILITY_DISCLOSURE.md))
e **comunicação de incidente**, isso é um ponto único de falha humano.

### 6.2 Acesso de terceiros

| Terceiro | Acesso ao quê | Formalizado? |
|---|---|---|
| Vercel (GitHub App / Vercel CLI) | Deploy em produção, leitura das envs do projeto | Conta do operador |
| Supabase (painel/Management API) | Banco inteiro | `SUPABASE_SECRET_KEY` (**não verificado** se configurado fora do painel) |
| GitHub (ENDARTStudios/Curriculo-Politico) | Código, workflows e **secrets** | Organização/repo — **não verificado** quem são os membros e se há 2FA obrigatório na organização |

> A regra de 2FA obrigatória para membros de organização no GitHub é
> **configuração de conta, não de código** e portanto **não verificada** aqui.
> É o item de IGA de maior retorno e menor custo: com ela, o comprometimento de
> uma senha de mantenedor não leva ao `secrets.DATABASE_URL`.

---

## 7. Plano mínimo de IGA (o que fazer, em ordem)

Nada aqui é teórico; cada item fecha um risco listado na seção 6 ou em
[`THREAT_MODELING.md`](./THREAT_MODELING.md).

| # | Ação | Fecha | Esforço |
|---|---|---|---|
| 1 | **Exigir 2FA para todos os membros da organização GitHub** e para as contas Vercel/Supabase/Google | Comprometimento de conta de mantenedor → produção | Minutos |
| 2 | **Inventário de segredos** com data de criação e plano de rotação; migrar para cofre (ou, no mínimo, documentar onde cada um vive) | Ausência de rastreabilidade | Horas |
| 3 | **Rotacionar `NEXTAUTH_SECRET`** e documentar o procedimento (efeito: desloga todos) | Sessão forjável sem rastro | Minutos |
| 4 | **Separar papéis no Postgres**: um papel de **runtime** com `SELECT/INSERT/UPDATE/DELETE` nas tabelas da aplicação e **sem DDL**; um papel de **migração/ETL** com DDL, usado só pelo `DIRECT_URL` | Reduz o poder da `DATABASE_URL` se vazar | Dias |
| 5 | **Verificação de e-mail** no cadastro (depende de serviço de e-mail) | Conta não comprovada votando dado sensível | Dias |
| 6 | **Revisão de acesso semestral** dos mantenedores do repo, do time Vercel e do projeto Supabase | Contas órfãs | Horas/6 meses |
| 7 | **Trilha de auditoria de operação de dados**: registrar quem rodou `db:load-*`/`recalculate-scores`, contra qual host e quando | Repúdio (R3 no modelo de ameaças) | Horas |
| 8 | **Rotação documentada de credenciais Supabase/Vercel** com prazos (ver [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) §5) | Prontidão de incidente | Horas |

---

## 8. O que este documento **não** cobre

- **MFA** — tratado em [`MFA.md`](./MFA.md), inclusive por que não existe.
- **RBAC** — tratado em [`RBAC.md`](./RBAC.md), inclusive por que não existe.
- **Row Level Security** — tratado em [`RLS.md`](./RLS.md).
- **Membros efetivos das organizações GitHub/Vercel** — **não verificado**
  (estado de painel, não de repositório).
- **Se as envs de produção contêm credenciais distintas do local** —
  **não verificado**. A `AUDITORIA_PRODUCAO.md` §0.2 registra 23 variáveis
  manuais no projeto Vercel, sem listar os valores.
