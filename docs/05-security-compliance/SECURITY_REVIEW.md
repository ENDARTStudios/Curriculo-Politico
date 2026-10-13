# SECURITY REVIEW — revisão de segurança da aplicação

**Projeto:** Currículo Político (`curriculopolitico.org`) · **Data da revisão:** 2026-10-12
**Método:** revisão de código (*white-box*) sobre o repositório: `apps/web/src/**`, `apps/web/prisma/**`, `.github/workflows/*.yml`, `docker-compose.yml`, `next.config.ts`, `apps/pipeline/scripts/**`
**Escopo:** superfície HTTP da aplicação, autenticação, autorização, camada de dados, configuração de segurança de borda, cadeia de build/deploy e postura de segredos
**Fora de escopo:** configuração efetiva dos painéis Vercel/Supabase/GitHub (**não verificável** a partir do repositório) e segurança interna dos provedores

> **Como ler.** Cada achado traz **evidência com caminho e linha**, **severidade**
> e **o que não foi verificado**. Nada aqui é hipótese apresentada como fato:
> onde não houve verificação, está escrito **não verificado**.

---

## 1. Sumário executivo

O estado de segurança da aplicação é **adequado para o porte e a fase do
projeto**, com uma ressalva importante: os controles de borda e de modelo de
dados estão **acima da média** para um MVP (pooler em transaction mode com
`connection_limit=1`, região co-localizada com o banco, CSP + headers
completos, rate limiting funcional, `next-auth` na versão corrigida, autorização
por dono em todas as rotas de escrita, zero `$queryRaw`, `.env` fora do git).

O que **não** está resolvido é a **camada de identidade e de privilégio**: não há
MFA, não há verificação de e-mail, não há recuperação de senha, não há papéis,
não há log de autenticação, e a credencial de banco é única e total. A
consequência agregada é que **um erro do operador ou o comprometimento de uma
conta de painel tem alcance total e é invisível**.

| Severidade | Quantidade | Natureza |
|---|---|---|
| 🔴 Alta | 3 | Ausência de guarda em scripts de escrita; Sentry sem scrubbing na ativação; ausência de backup |
| 🟠 Média | 7 | Enumeração de conta; bcrypt cost 10; rate limit sem estado; retificação no tier geral; versão de consentimento sem gate; sem CSRF explícito; egress/DoS econômico |
| 🟡 Baixa | 6 | CSP enfraquecida por `unsafe-*`; matcher amplo do middleware; mínimo de senha 8 sem complexidade; `/api/retificacao` público; ausência de `security.txt`; sem log de auth |
| ✅ Verificado sem achado | 6 | Ver §5 |

**Nenhum achado desta revisão é explorável remotamente sem pré-condição.** Os
três de severidade alta exigem ou acesso ao segredo (operador) ou uma ação
deliberada de configuração (ativar o Sentry).

---

## 2. Achados

### 🔴 ALTA

#### A-01 · Scripts de escrita em produção sem guarda de host

**Evidência.** Apenas `seed-dev.ts` verifica o destino:

```ts
// apps/pipeline/scripts/seed-dev.ts L92
const url = process.env.DATABASE_URL ?? "";
```

Nenhum dos demais scripts de escrita tem guarda equivalente. Foram localizados
**33 pontos** de `new PrismaClient()` em `apps/pipeline/scripts/`, incluindo:

| Script | Operação |
|---|---|
| `recalculate-scores.ts` L17 | `UPDATE` em `Score` (reescreve o IDIP de todos) |
| `apply-integrity-caps.ts` L10 | aplica teto de nota |
| `snapshot-scores.ts` L12 | insere `ScoreSnapshot` |
| `load-*-*.ts` (≈18 arquivos) | `createMany` em massa |
| `load-legal-records.ts` L12 | insere `LegalRecord` (dado jurídico sobre pessoa real) |

**Contexto agravante documentado no próprio repositório:** `AGENTS.md`
("`DATABASE_URL` decide tudo — todo script de dados grava no banco que ela
apontar, inclusive produção") e `AUDITORIA_PRODUCAO.md` §0.5 ("o `apps/web/.env`
local aponta para o Supabase de produção").

**Impacto.** Um `npm run recalculate-scores` ou `db:load-*` executado por engano
sobrescreve produção. Não há backup para restaurar ([`BACKUP_DR.md`](../06-devops-deployment/BACKUP_DR.md)).

**Recomendação.** Extrair a guarda de `seed-dev.ts` para um módulo compartilhado
(`apps/pipeline/scripts/lib/db-guard.ts`) aplicado a **todo** script que escreve:
recusar host remoto sem `CP_ALLOW_REMOTE_WRITE=1`; manter `DATABASE_URL` de
produção fora do `.env` local. Referência cruzada:
[`THREAT_MODELING.md`](./THREAT_MODELING.md) T3.

#### A-02 · Sentry sem scrubbing de PII e sem configuração de privacidade

**Evidência.** [`apps/web/src/instrumentation.ts`](../../apps/web/src/instrumentation.ts) L16–20:

```ts
Sentry.init({
  dsn,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0.1,
});
```

Não há `sendDefaultPii: false`, `beforeSend` com denylist, `denyUrls`,
`ignoreErrors` nem limpeza de querystring. Não há `Sentry.setUser()` no código —
o que hoje é favorável.

**Impacto.** **Hoje é inócuo** (sem DSN, o SDK não entra no bundle — verificado
em L12–13). No momento em que `SENTRY_DSN` for definido, o Sentry passa a
receber dados de requests, incluindo URLs. A preocupação concreta é o vínculo
identidade↔opinião política e tokens em querystring. O anexo de observabilidade
(`docs/ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md` §4.4) lista as regras
exigidas.

**Recomendação.** Implementar `sendDefaultPii: false` + `beforeSend` com
denylist (`email`, `cpf`, `vote`, `token`, `answer`) + *scrubbing* de querystring
**antes** de configurar o DSN. Anotar a ordem em `INCIDENT_RESPONSE.md` §5.
Classificado como Alta não pelo estado atual, mas por ser uma armadilha
armada: a ação "ativar o Sentry" é de 30 minutos e não tem lembrete.

#### A-03 · Ausência total de backup (perda de dados não mitigada)

**Evidência.** Não existe workflow, script ou documentação de `pg_dump` no
repositório. `AUDITORIA_PRODUCAO.md` não menciona backup; `AVALIACAO_ALTERNATIVAS.md`
§2.8 registra explicitamente que **não existe nenhum backup** e que o RIPD §4
afirma o contrário ("backups Supabase"), enquanto o plano Free do Supabase não
inclui backup automático.

**Impacto.** Perda irrecuperável de ~98 MB de dados curados (31.815 proposições,
166.825 presenças, 594 scores, a série temporal de `ScoreSnapshot`) e, no
futuro, votos de usuários (dado sensível). Também transforma qualquer incidente
de integridade (T2 no modelo de ameaças) em perda permanente.

**Recomendação e detalhamento:** [`BACKUP_DR.md`](../06-devops-deployment/BACKUP_DR.md).
Inclui corrigir a afirmação do RIPD §4.

---

### 🟠 MÉDIA

#### M-01 · Enumeração de contas por mensagem de erro no cadastro

**Evidência.** [`api/auth/register/route.ts`](../../apps/web/src/app/api/auth/register/route.ts) L68–74:

```ts
const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  return NextResponse.json(
    { error: "EMAIL_EM_USO", message: "Este e-mail já possui conta. Faça login." },
    { status: 409 },
  );
}
```

O login por credenciais **não** enumera (retorna `null` genérico em
`lib/auth.ts` L30–38) — a assimetria é o que torna o cadastro o vetor.

**Impacto.** Um atacante confirma se um e-mail tem conta na plataforma — e "ter
conta no Currículo Político" é, por si, um sinal de interesse político. Não
expõe o voto, mas expõe a **existência do vínculo**.

**Recomendação.** Resposta uniforme no cadastro (enviar e-mail de "conta já
existe" em vez de responder 409 na API) — depende do serviço de e-mail
inexistente. Mitigação intermediária: mover `POST /api/auth/register` para o
tier crítico (já está, 10/min) e registrar tentativas.

#### M-02 · `bcrypt` com cost 10

**Evidência.** `api/auth/register/route.ts` L76 — `bcrypt.hash(password, 10)`.

**Impacto.** O anexo de autenticação recomenda **cost ≥ 12**. Cost 10 é
aceitável, não ótimo; com um dump do banco ([`RLS.md`](./RLS.md) §5), a
diferença de custo de quebra é de ~4×.

**Recomendação.** Elevar para 12 e re-hash transparente no próximo login
bem-sucedido (compara `bcrypt.getRounds(hash)` e regrava se abaixo do alvo).

#### M-03 · Rate limiting em memória — não é teto global

**Evidência.** [`middleware.ts`](../../apps/web/src/middleware.ts) L15–17 (comentário do próprio autor), L21–22 (60/10 req por janela), L29 (`const baldes = new Map()`), L46–68 (Token Bucket), L70–76 (expurgo acima de 5.000 chaves).

**Impacto.** Em serverless, o teto efetivo é `limite × nº de instâncias` e o
balde **zera a cada cold start**. Isso invalida a contagem como mitigação de
força bruta, de sybil e de abuso de escrita. A auditoria de produção
(`AUDITORIA_PRODUCAO.md` §5) confirma que o limite **funciona por instância** —
o que não é o mesmo que funcionar globalmente.

**Recomendação.** Rate limit com estado compartilhado (Upstash Redis ou tabela
no Postgres) **apenas nas rotas sensíveis** (`/api/auth/*`, `/api/retificacao`,
`POST /api/bills/[id]/vote`), com *fail-closed* em auth e voto. Desenho e
orçamento de comandos em `anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md` §3.

#### M-04 · `/api/retificacao` no tier geral, não no crítico

**Evidência.** `middleware.ts` L32–37 — o tier crítico cobre apenas
`/api/auth/(register|callback)`. `POST /api/retificacao` cai no **tier geral de
60/min** (`api/retificacao/route.ts` documenta isso no comentário L13) e é uma
**rota pública de `INSERT`** com validação apenas de formato
(nome ≥ 3, e-mail com regex, descrição ≥ 20 caracteres).

**Impacto.** Flood que enche a tabela e **enterra solicitações legítimas de
direito de resposta** — degradação do canal jurídico do projeto. Ameaça D2 em
[`THREAT_MODELING.md`](./THREAT_MODELING.md).

**Recomendação.** Mover para tier crítico (10/min), adicionar captcha
(Turnstile) e alerta de volume anômalo.

#### M-05 · Mudança de versão de consentimento não invalida aceite anterior

**Evidência.** [`lib/consent.ts`](../../apps/web/src/lib/consent.ts) L18–23 —
`consentimentoPoliticoAtivo()` só olha `politicalConsentAt` e
`politicalConsentWithdrawnAt`; **não compara** `politicalConsentVersion` com
`POLITICAL_CONSENT_VERSION` (L9). O gate em `api/bills/[id]/vote/route.ts`
L133–142 usa essa função.

**Impacto.** Ao incrementar a versão por mudança substancial do texto, usuários
com o aceite antigo **continuam votando sem novo aceite** — a base legal do
tratamento do dado sensível passa a apontar para um texto que o titular não
aceitou.

**Recomendação.** Gate de versão: exigir
`politicalConsentVersion === POLITICAL_CONSENT_VERSION` para votar. Documentado
em [`COMPLIANCE.md`](./COMPLIANCE.md) §4.

#### M-06 · Rotas de escrita sem proteção CSRF explícita

**Evidência.** `POST /api/consent`, `DELETE /api/consent`,
`POST /api/bills/[id]/vote`, `DELETE /api/account` autenticam por
`getServerSession` e **não** verificam `Origin`/`Referer` nem token CSRF.
[`lib/auth.ts`](../../apps/web/src/lib/auth.ts) **não define** a opção `cookies`,
portanto o atributo `SameSite` do cookie de sessão é o padrão da biblioteca —
**não verificado** neste repositório (o NextAuth v4 usa `Lax` por padrão em
produção, mas isso não foi confirmado por leitura de fonte primária aqui).

**Impacto.** Com `SameSite=Lax`, requisições `POST` de cross-site não carregam
cookie — o que bloqueia o CSRF clássico por formulário. O risco residual é (a)
`Lax` não cobrir todos os cenários, e (b) navegador antigo/sem o atributo.

**Recomendação.** Declarar explicitamente `cookies` (httpOnly, secure,
`sameSite: "lax"`) em `authOptions`, e adicionar checagem de `Origin` nas rotas
de escrita de dado sensível.

#### M-07 · Egress e custo como vetor de negação de serviço

**Evidência.** `AVALIACAO_ALTERNATIVAS.md` §2.2 e §5.1: `/ranking` devolve
**177 KB por request**; a cota de egress do Supabase Free é **5 GB/mês
unificada**; a Vercel Hobby **não tem pay-as-you-go** — estourar significa
esperar 30 dias. `unstable_cache` (recomendação R2) **ainda não foi implementado**.

**Impacto.** Um scraper (ameaça I1) não derruba um serviço, derruba **um mês de
plataforma** — e o `robots.txt` permite `Allow: /` (verificado em
`tests/e2e/seo.spec.ts` L26, que exige essa diretiva).

**Recomendação.** Implementar `unstable_cache` com tags por domínio nas rotas
dinâmicas (R2); instrumentar egress por origem; considerar WAF.

---

### 🟡 BAIXA

| ID | Achado | Evidência | Observação |
|---|---|---|---|
| B-01 | **CSP enfraquecida por `unsafe-inline` e `unsafe-eval`** | `middleware.ts` L105 | Necessário ao runtime do Next, mas anula boa parte do valor da CSP contra XSS. Alternativa: nonce/hash de script |
| B-02 | **`matcher` do middleware cobre quase tudo** | `middleware.ts` L153–155 | Inclui páginas estáticas; `getToken()` só roda em `/api/*`, mas os headers são recalculados em cada resposta. Consome CPU (fair use ~50 ms no Hobby) |
| B-03 | **Senha mínima de 8 caracteres, sem complexidade** | `api/auth/register/route.ts` L43–48 | Aceitável; considerar verificação contra listas de senhas vazadas |
| B-04 | **Canal público de escrita de dados pessoais** | `api/retificacao/route.ts` L74–85 | Decisão de projeto (o titular pode ser terceiro), mas exige captcha/rate limit reforçado |
| B-05 | **Sem `security.txt` (RFC 9116)** | `.well-known/` não existe | Ver [`VULNERABILITY_DISCLOSURE.md`](./VULNERABILITY_DISCLOSURE.md) §4 |
| B-06 | **Sem log de eventos de autenticação** | Nenhuma tabela; Sentry dormente | Login, falha de login e login de novo dispositivo são invisíveis |

---

## 3. Verificado e **sem achado** (o que está correto)

Registrar o que passou é tão importante quanto listar o que falhou — evita
retrabalho e evita "revisar de novo" o que já está certo.

| # | Verificação | Como foi checado | Resultado |
|---|---|---|---|
| 1 | **Sem IDOR nas rotas de escrita** | Leitura de `api/consent`, `api/account`, `api/bills/[id]/vote` | ✅ O alvo vem **sempre** da sessão (`requireUserId()` / `session.user.id`), nunca do corpo. Não há parâmetro de id de usuário |
| 2 | **Sem risco de SQL injection** | Busca por `$queryRaw` / `$executeRaw` em `apps/web/src` | ✅ **Zero ocorrências**. Todo acesso é Prisma parametrizado |
| 3 | **Sem injeção de HTML** | Busca por `dangerouslySetInnerHTML` / `eval(` | ✅ Zero ocorrências |
| 4 | **`.env` fora do controle de versão** | `git ls-files` + `git log --diff-filter=A --name-only -- "*.env"` | ✅ Apenas `apps/web/.env.example` é versionado; **nenhum `.env` real aparece no histórico** |
| 5 | **Segredos nunca hardcoded** | Busca por `process.env.*SECRET` e leitura de `auth.ts`/`middleware.ts` | ✅ `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET` vêm só de ambiente |
| 6 | **Erros não vazam stack trace ao cliente** | Leitura dos `catch` das rotas | ✅ Respostas genéricas (`DB_ERROR`, `BANCO_INDISPONIVEL`) |
| 7 | **`next-auth` na versão corrigida das CVEs de 2026** | `apps/web/package.json` L23 = `^4.24.15` | ✅ (as CVEs afetam `<= 4.24.14`) |
| 8 | **Headers de segurança ativos em produção** | `middleware.ts` L142–149 + `AUDITORIA_PRODUCAO.md` §4 | ✅ CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` — re-verificados em produção |
| 9 | **Pool de conexões corrigido** | `schema.prisma` L7–13, `vercel.json` | ✅ Transaction pooler (6543) + `connection_limit=1`; região `gru1` co-localizada com `sa-east-1` |
| 10 | **SDK do Sentry não entra no bundle sem DSN** | `instrumentation.ts` L12–13 | ✅ Importação dinâmica condicionada |

---

## 4. Não verificado nesta revisão

Itens que **não** podem ser afirmados nem negados a partir do repositório.
Listá-los é parte da revisão — silêncio seria falsa conformidade.

1. **Estado dos painéis:** se 2FA está ativo nas contas Vercel, Supabase, GitHub e Google.
2. **Membros das organizações** GitHub/Vercel e se há exigência de 2FA na organização.
3. **Env de produção:** quais das "23 variáveis manuais" da Vercel existem e se
   as credenciais de produção são **distintas** das usadas localmente.
4. **RLS e papéis do Postgres:** confirmado que **nenhuma migration cria policy
   ou papel**; **não verificado** se foram criados manualmente pelo painel do Supabase.
5. **Configuração de cookies do NextAuth** (`SameSite`, `httpOnly`, `secure`) —
   não há `cookies` em `authOptions`; o padrão da biblioteca não foi confirmado em fonte primária.
6. **Atributo `SameSite` efetivo** do cookie `__Secure-next-auth.session-token` em produção.
7. **`npm audit` atual:** `AVALIACAO_ALTERNATIVAS.md` §2.7 registra 5 high + 1 moderate
   na data de 2026-10-12, com análise de falso positivo; **não re-executado** nesta revisão.
8. **IP allowlist / network restrictions** no Supabase (**não aplicável no plano Free**).
9. **Logs de auditoria do Supabase** (quem acessou o quê) — disponibilidade e estado.
10. **Segurança física** e política de dispositivo do operador.
11. **SLA/contrato** dos provedores (transferência internacional, SCCs).

---

## 5. Plano de remediação priorizado

| Ordem | Achado | Ação | Esforço | Fecha |
|---|---|---|---|---|
| 1 | A-01 | Guarda de banco remoto compartilhada em todos os scripts de escrita | Horas | `THREAT_MODELING.md` T3 |
| 2 | — | **Exigir 2FA** nas contas GitHub/Vercel/Supabase/Google; 2FA na org do GitHub | Minutos | `IAM_IGA.md` §7.1 · `MFA.md` §4 |
| 3 | A-03 | `pg_dump` semanal cifrado + **teste de restore** + corrigir o RIPD §4 | ~2 h + teste | `BACKUP_DR.md` |
| 4 | A-02 | `sendDefaultPii: false` + `beforeSend` denylist **antes** do DSN | Horas | `THREAT_MODELING.md` I4 |
| 5 | M-04 | `/api/retificacao` no tier crítico + captcha | Horas | D2 |
| 6 | M-05 | Gate de versão no consentimento político | Horas | `COMPLIANCE.md` §4 |
| 7 | M-02 | `bcrypt` cost 12 + re-hash no login | Horas | `THREAT_MODELING.md` I2 |
| 8 | M-06 | Declarar `cookies` explicitamente + checagem de `Origin` | Horas | E3 |
| 9 | M-03 | Rate limit com estado compartilhado nas rotas sensíveis | 2–4 h | E4 · S1 |
| 10 | M-01 | Resposta uniforme no cadastro (depende de e-mail) | Dias | S4 |
| 11 | M-07 | `unstable_cache` + monitorar egress | 1–2 dias | I1 · D3 |
| 12 | B-01 | Nonce/hash de script na CSP | Dias | B-01 |
| 13 | B-06 | Log de eventos de autenticação | Dias | R4 · `MFA.md` §2.2 |

---

## 6. Próxima revisão

**Gatilhos:** (a) primeira expansão relevante de base de usuários; (b) ativação
de qualquer subprocessador novo (Sentry, Resend, Upstash); (c) entrada de área
administrativa ou RBAC; (d) ligar o ETL de integridade (`LegalRecord`); (e)
migração de biblioteca de autenticação; (f) qualquer incidente de segurança.
**Sem gatilho, revisar em 6 meses.**

Fonte de dados desta revisão: commit `5ee448f` (`feat(home): card do
Judiciário, metadata própria e marca clicável`) — com alterações não commitadas
em `apps/pipeline/scripts/verify-scoring.ts`, `apps/web/prisma/schema.prisma`,
`apps/web/src/app/page.tsx`, `apps/web/src/app/stf/page.tsx`,
`apps/web/src/lib/methodology.ts` e `tests/e2e/home.spec.ts` no momento da leitura.
