> **Nota de correção (2026-10-12).** Este relatório é **material de pesquisa** e foi
> incorporado, verificado e corrigido em [docs/ops/AVALIACAO_ALTERNATIVAS.md](../AVALIACAO_ALTERNATIVAS.md).
>
> **Correção do §"ALERTA QUE EXIGE AÇÃO HOJE":** as duas CVEs do NextAuth citadas
> (GHSA-x445-f3h2-j279 e GHSA-7rqj-j65f-68wh) **são reais**, mas o projeto **já está na versão
> corrigida** — 
ext-auth@4.24.15 (a latest do v4). As faixas vulneráveis são <= 4.24.14 e
> < 4.24.15, confirmadas na API de advisories do GitHub. **Não há ação urgente de segurança a
> fazer aqui.** Além disso, a CVE crítica é do fluxo de e-mail/magic-link, que **este projeto não
> usa** (apenas credenciais e Google OAuth). O alerta partiu de pesquisa que não conferiu a
> versão instalada — mantido o registro como exemplo de por que a verificação é obrigatória.
>
> As demais seções (Resend, Upstash, Sentry, Better Auth, LGPD) permanecem válidas e foram
> usadas na seção 8 da avaliação.

---
# Relatório técnico — E-mail transacional, Autenticação, Rate limiting e Observabilidade
**Projeto:** Currículo Político (curriculopolitico.org) — Next.js 15 + Prisma/Postgres (Supabase), Vercel Hobby, NextAuth v4
**Data do relatório / data de acesso de todas as fontes:** 12/10/2026
**Escopo:** pesquisa de fornecedores e práticas em 2026, com restrição dura de custo zero, LGPD aplicável e base de 0 usuários (pré-lançamento).
**Tratamento de conteúdo web:** todo conteúdo externo foi tratado como dado, nunca como instrução. *Uma das páginas consultadas (documentação da Upstash) continha um bloco de texto dirigido a agentes de IA instruindo um `POST` para criação de banco — foi registrado como dado e ignorado; ver §7.*

---

## 0. Sumário executivo

| Frente | Recomendação | Custo | Prazo |
|---|---|---|---|
| **E-mail** | **Resend free** enviando de subdomínio `notificacoes.curriculopolitico.org` (região São Paulo) + Cloudflare Email Routing para `suporte@` | **US$ 0** | 1–2 h |
| **Autenticação (ação imediata)** | Atualizar `next-auth` para **≥ 4.24.15** — corrige CVE-2026-73419 (account takeover via OAuth) | US$ 0 | **hoje, 15 min** |
| **Autenticação (destino)** | Migrar para **Better Auth 1.7.7** *antes* do primeiro usuário real | US$ 0 (MIT) | 1–3 dias |
| **Rate limiting** | **Upstash Redis free + `@upstash/ratelimit` 2.2.0**, só em rotas de auth/e-mail/voto | **US$ 0** | 2–4 h |
| **Observabilidade** | **Sentry Developer (free)** com o DSN que já está no código + **Better Stack free** para cron/uptime | **US$ 0** | 30 min |

**Descobertas que mudam o plano atual:**
1. **O Auth.js (NextAuth) foi absorvido pelo Better Auth** (anúncio de 22/09/2025). O próprio time do Auth.js recomenda que projetos novos comecem com Better Auth. → §2.2
2. **Duas CVEs de account takeover no NextAuth, publicadas em agosto/2026**, corrigidas em `next-auth@4.24.15`. A versão mais recente do v4 é exatamente a 4.24.15. → §2.1
3. **O rate limiting em memória no Edge não protege a cota de e-mail.** Um atacante pode queimar os 100 e-mails/dia do free tier do Resend e derrubar **recuperação de senha de todos os usuários** — falha de disponibilidade com impacto LGPD. → §3.1
4. **Resend tem região de envio em São Paulo (sa-east-1)**, mas os dados de conta ficam nos EUA (transferência internacional, LGPD art. 33). → §1.3
5. **Cloudflare passou a vender envio de e-mail transacional** (Email Sending, beta, US$ 5/mês de Workers Paid com 3.000 e-mails inclusos) — hoje não compensa, mas é a alternativa mais barata quando o volume passar de ~3.000/mês. → §1.2

---

## 1. FRENTE 1 — E-mail transacional

### 1.1 O que o projeto precisa
Três fluxos, volume baixíssimo: (a) verificação de e-mail no cadastro (bloqueia voto — risco LGPD registrado no RIPD), (b) recuperação de senha, (c) notificações pontuais. Com 0 usuários e crescimento orgânico, o teto realista é **< 50 e-mails/dia** por muitos meses.

### 1.2 Tabela comparativa

| Opção | Free tier (exato, 12/10/2026) | O que resolve | Esforço | Risco / limitação |
|---|---|---|---|---|
| **Resend** `[1][2]` | **3.000 e-mails/mês, teto de 100/dia, 3 domínios**, 10.000 automation runs. **Sem overage no free** (não existe cobrança) | Verificação, reset, notificações; SDK oficial, provider nativo no Auth.js/Better Auth | **Baixo** (1 h) | Teto diário de 100; sem SLA/retenção estendida; dados de conta nos EUA |
| **Brevo** `[6]` | **300 e-mails/dia** (≈9.000/mês), sem limite de tempo, 100.000 contatos, **1 usuário** | Mesmos fluxos + marketing | Baixo | **O plano grátis sempre inclui o selo "Enviado com a Brevo"** — ruim em e-mail de recuperação de senha; fila de 1.000 e-mails quando estoura o dia |
| **Postmark** `[7]` | **Developer: 100 e-mails/mês**, sem expiração | Transacional de alta reputação | Baixo | 100/mês é insuficiente para verificação+reset em qualquer pico; **excedente é cobrado automaticamente e não pode ser limitado** → risco de conta inesperada para projeto sem receita |
| **ZeptoMail (Zoho)** `[8]` | **1º crédito grátis = 10.000 e-mails** (créditos válidos 6 meses) | Bom custo por e-mail em escala | Baixo | **Não é free recorrente** — acabou o crédito, passa a pagar; preço por crédito **não exibido na página oficial em pt-BR** (não confirmado) |
| **AWS SES** `[9]` | **Não confirmado** — página oficial renderizada por JS não pôde ser lida nesta consulta | Menor custo por 1.000 e-mails em volume alto | **Alto** (sair do sandbox, IAM, verificação de domínio, monitorar bounces/complaints) | Transferência internacional; exige disciplina de reputação; overengineering para 50 e-mails/dia |
| **Cloudflare Email Sending** `[3a][3b][3c]` | **Workers Free: envio não disponível.** Workers Paid (US$ 5/mês): **3.000 inclusos/mês, depois US$ 0,35/1.000**. Email Routing (receber/encaminhar): **grátis em todos os planos** | Envio + recebimento; quota diária cresce com reputação | Médio (migrar DNS p/ Cloudflare, produto em **beta**) | Custo mínimo de US$ 5/mês; beta; limite diário inicial conservador não publicado |
| **Self-hosted** (Mailu, Plunk, Reloop) `[10][11]` | Software grátis, **mas VPS + domínio + IP** ≥ US$ 5/mês | Controle total | **Muito alto** | IP novo sem reputação → spam; exige rDNS/PTR, warm-up, monitorar blocklists e responder a abusos. Inviável para um projeto de 1 pessoa sem receita |
| **Zoho Mail** (caixa, não envio transacional) `[12]` | **Grátis vitalício, até 5 usuários, 1 domínio, 5 GB/usuário**, sem IMAP/POP/ActiveSync; **disponível apenas em determinados data centers** | `suporte@`, `contato@` — receber e responder | Baixo | Não serve para e-mail transacional de aplicação (sem API transacional); disponibilidade regional |
| **Google Workspace** `[13]` | **Não confirmado** — página oficial renderizada por JS não pôde ser lida nesta consulta | Caixa corporativa completa | Médio | Pago por usuário; **desnecessário**: receber `suporte@` pode ser grátis via Cloudflare Email Routing |

### 1.3 O que é necessário para enviar de `@curriculopolitico.org` com boa entregabilidade

Base documental: Resend `[4][5][14][15][16][17]`.

1. **Enviar de um subdomínio, não da raiz.** A recomendação oficial é `notificacoes.curriculopolitico.org` (ou `conta.…`) para isolar a reputação de envio e reservar a raiz para o e-mail humano. `[14][18]`
2. **DKIM + SPF obrigatórios** (a verificação do domínio no Resend consiste exatamente nisso): registros `TXT`/`CNAME` de DKIM e o SPF/Return-Path (`TXT` + `MX` ou `CNAME`). **Os valores são gerados pelo Resend e devem ser copiados literalmente**; colar valores de terceiros quebra a autenticação. `[4]`
3. **CNAMEs não podem estar proxied.** Com Cloudflare, o registro do Resend tem de ficar em modo *DNS only* (nuvem laranja desligada), senão a verificação nunca completa. `[4]`
4. **DMARC depois da verificação**: `_dmarc` `TXT` começando em `p=none` com `rua=`, e só então endurecer para `quarantine` e `reject`. `[5]`
5. **MX não conflita** porque o Return-Path fica no subdomínio — a raiz segue livre para Zoho/Cloudflare Email Routing. `[19]`
6. **Não ativar tracking de abertura/clique em e-mails de autenticação.** `[14]`
7. **Minimização LGPD:** desligar o armazenamento de mensagens no painel do Resend (o conteúdo do e-mail não fica retido no subprocessador) `[20]`, e registrar o Resend na lista de subprocessadores / RIPD `[21]`.
8. **Transferência internacional:** a região de envio controla **de onde o e-mail sai**, não onde os dados ficam — *"All account data, including email metadata, logs, and API records, is stored in the United States regardless of the sending region you select."* `[2]` → declarar transferência internacional (LGPD art. 33) na política de privacidade e no registro de operações.

### 1.4 Custo total de "domínio com e-mail"

| Item | Custo | Observação |
|---|---|---|
| Domínio `curriculopolitico.org` | já é do projeto | — |
| Envio transacional (Resend free) | **US$ 0** | teto 100/dia |
| Receber `suporte@` / `contato@` | **US$ 0** (Cloudflare Email Routing `[22]`) | encaminha para o e-mail pessoal do responsável |
| Alternativa: caixa completa | **US$ 0** (Zoho Mail free, 5 usuários) `[12]` | sem IMAP/POP; exige apontar o MX da raiz |
| Google Workspace | pago por usuário `[13]` | **não necessário** nesta fase |

**Custo incremental real da frente de e-mail: US$ 0.**

### 1.5 Recomendação (frente 1)

> **Resend free tier, enviando de um subdomínio dedicado (`notificacoes.curriculopolitico.org`), região de envio `sa-east-1` (São Paulo), com DKIM+SPF+DMARC configurados, e Cloudflare Email Routing para o endereço humano `suporte@`.**

Justificativa:
- **Não pode gerar fatura.** No free tier do Resend o overage "Not available" `[1]` — o envio simplesmente para no limite. Isso é o oposto do Postmark, que **cobra automaticamente** e não permite limitar `[7]`. Para um projeto sem receita, "risco de conta inesperada = zero" vale mais que 3.000 e-mails.
- **100/dia é folgado** para ~50/dia de verificação+reset, e o teto mensal (3.000) é 60× o volume estimado.
- **Menor esforço de integração**: provider nativo tanto no Auth.js `[23]` quanto no Better Auth `[24]`, e a documentação cobre explicitamente o caso Supabase/Auth `[15]`.
- **Qualidade de entrega**: a entregabilidade em 2026 é consequência de SPF+DKIM+DMARC+subdomínio+reputação de IP compartilhado — todos endereçados no passo a passo abaixo. Não há, nas fontes oficiais consultadas, benchmark independente de taxa de inbox por fornecedor; qualquer afirmação numérica de "99% de entrega" seria inventada.
- **Região de São Paulo** reduz latência de entrega para o público brasileiro `[2]` — mas exige aceitar a transferência internacional de metadados para os EUA.

**Plano B (gatilho definido):** se o volume passar de ~90 e-mails/dia de forma recorrente, migrar para **Cloudflare Email Sending** (US$ 5/mês, 3.000 inclusos) ou **ZeptoMail** (crédito de 10.000). **Não** migrar para Brevo grátis no fluxo de senha por causa do selo obrigatório `[6]`.

### 1.6 Passo a passo da configuração mínima (recomendado)

**Pré-requisito:** acesso ao DNS de `curriculopolitico.org`.

**Etapa 1 — Conta e domínio**
1. Criar conta em `resend.com/signup` (plano Free, sem cartão).
2. *Domains* → **Add Domain** → informar **`notificacoes.curriculopolitico.org`** (subdomínio; não usar a raiz).
3. Na lista de regiões, escolher **São Paulo (sa-east-1)**. `[2]`
4. Abrir a aba **Records** e manter essa tela aberta (os valores vêm daqui).

**Etapa 2 — Registros DNS (formato; valores literais são os exibidos pelo Resend)**

| Nome (exemplo) | Tipo | Valor | Proxy |
|---|---|---|---|
| `resend._domainkey.notificacoes` | `TXT` | `p=MIGfMA0GCSq…` (chave DKIM pública gerada pelo Resend) | n/a |
| `send.notificacoes` | `TXT` | `v=spf1 include:…  ~all` (SPF gerado pelo Resend) | n/a |
| `send.notificacoes` | `MX` | host de feedback/bounce indicado pelo Resend, prioridade **10** | n/a |
| *(alternativa)* CNAMEs de DKIM/Return-Path | `CNAME` | alvos indicados pelo Resend | **DNS only** (nuvem laranja desligada) `[4]` |

> ⚠️ Todos os e-mails do Resend para esse domínio ficarão **alinhados** (DKIM no subdomínio + Return-Path no subdomínio) — é isso que faz o DMARC passar `[5]`.

**Etapa 3 — Verificação**
5. Clicar em **Verify DNS Records**. Normalmente verifica em **< 15 min**; pode levar até 72 h. Se não verificar, conferir proxy e usar `dns.email` para inspecionar a propagação. `[4]`

**Etapa 4 — DMARC (na raiz, para o domínio inteiro)**
6. Criar: `_dmarc.curriculopolitico.org` `TXT` = `v=DMARC1; p=none; rua=mailto:dmarc@curriculopolitico.org;`
7. Após 1–2 semanas com `dmarc=pass` em todos os fluxos, endurecer para `p=quarantine;` e depois `p=reject;`. `[5]`

**Etapa 5 — API key**
8. *API Keys* → **Create API Key** com permissão apenas de **Sending access**, restrita ao domínio `notificacoes.curriculopolitico.org`.

**Etapa 6 — Caixa humana (grátis, opcional)**
9. Cloudflare → *Email Routing* → criar `suporte@curriculopolitico.org` com destino no e-mail pessoal do responsável. `[22]`
   *Atenção:* Email Routing assume os registros **MX da raiz**. Escolher **Cloudflare Email Routing OU Zoho Mail**, nunca os dois.

**Etapa 7 — Variáveis de ambiente (Vercel → Settings → Environment Variables)**

```bash
RESEND_API_KEY="re_••••••••"                 # chave Sending-only
EMAIL_FROM="Currículo Político <conta@notificacoes.curriculopolitico.org>"
EMAIL_REPLY_TO="suporte@curriculopolitico.org"
NEXT_PUBLIC_APP_URL="https://curriculopolitico.org"
```
*(As variáveis de autenticação, rate limiting e Sentry estão nas §2.7 e §3.4.)*

**Etapa 8 — Código (mínimo)**
```ts
// lib/email.ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export function sendEmail(args: { to: string; subject: string; html: string }) {
  // NÃO usar await no fluxo de auth (evita timing attack) — ver Better Auth [24]
  return resend.emails.send({ from: process.env.EMAIL_FROM!, ...args });
}
```

**Etapa 9 — Minimalização LGPD**
10. Painel do Resend → desativar **armazenamento de mensagens** `[20]`.
11. Registrar Resend (e Cloudflare, se usado) como subprocessadores no RIPD e na política de privacidade; declarar transferência internacional (EUA). `[21]`

**Etapa 10 — Testes de aceitação**
12. Enviar para Gmail, Outlook/Hotmail, Yahoo e iCloud; inspecionar cabeçalhos e confirmar **`spf=pass`, `dkim=pass`, `dmarc=pass`**.
13. Rodar o conteúdo em um testador de spam (ex.: mail-tester) e confirmar pontuação alta.
14. Testar os três fluxos fim a fim: cadastro → e-mail de verificação → voto liberado; "esqueci minha senha" → reset; reenvio de verificação.

---

## 2. FRENTE 2 — Autenticação

### 2.1 🔴 Ação imediata de segurança (independente de qualquer decisão de arquitetura)

Duas vulnerabilidades de **account takeover** publicadas em agosto/2026 afetam o NextAuth — o projeto usa login por credenciais + Google OAuth, exatamente o cenário afetado.

| CVE | Resumo | Impacto | Correção |
|---|---|---|---|
| **CVE-2026-73419** `[25]` | Cookies de `state`, `nonce` e verificador PKCE do OAuth são globais e **não vinculados ao provider que os emitiu** | Em app multi-provider com *account linking*, um atacante faz a vítima iniciar um fluxo legítimo e **vincula a conta do atacante à conta da vítima**, obtendo login persistente. CVSS 3.1: `AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:N` | `next-auth@4.24.15`, `@auth/core@0.41.3`, `5.0.0-beta.32` |
| **CVE-2026-73420** `[26]` | O normalizador de e-mail valida **antes** da normalização Unicode: `U+FF20 FULLWIDTH COMMERCIAL AT` passa na checagem de "um único @" e, após NFKC, o provedor enxerga dois separadores | **Magic link/verificação entregue a destinatário controlado pelo atacante → login como a vítima, sem interação dela.** CVSS 4.0: `AV:N/AC:L/AT:P/PR:N/UI:N/VC:H/VI:H` | idem |

**A versão mais recente publicada do `next-auth` v4 é a 4.24.15** `[27]` — ou seja, existe correção pronta para o v4 e não é necessário migrar para se proteger.

> **Verificação obrigatória hoje:** conferir `package.json`/lockfile e confirmar `next-auth >= 4.24.15`. Se estiver abaixo, atualizar e fazer deploy **antes de qualquer outra tarefa**. A CVE-2026-73420 é especialmente relevante se o projeto implementar verificação por link/token de e-mail (§1).

### 2.2 Fato novo que redefine a escolha: o Auth.js agora é do Better Auth

- Anúncio oficial de **22/09/2025**: *"Auth.js, formerly known as NextAuth.js, is now being maintained and overseen by Better Auth team."* `[28]`
- Para quem já usa: *"you can continue doing so without disruption — we'll keep addressing security patches and urgent issues as they come up."*
- Recomendação explícita do time: *"we strongly recommend new projects to start with Better Auth unless there are some very specific feature gaps (most notably stateless session management without a database)."* `[28]`
- O `next-auth` v4 está, portanto, em **modo manutenção de segurança** (recebe patch crítico — como prova a 4.24.15 — mas não evolui). O v5 segue em `beta` (`5.0.0-beta.32`), o que por si só desaconselha tratá-lo como destino.
- Guias oficiais de migração: `authjs.dev/getting-started/migrate-to-better-auth` `[29]` e `better-auth.com/docs/guides/next-auth-migration-guide` `[28]`.

**Consequência para o projeto:** migrar v4 → v5 (beta) hoje é trocar um legado por um beta em transição. Se houver migração, o destino natural é o Better Auth.

### 2.3 Tabela comparativa

| Opção | Custo no free tier | O que resolve | Esforço de migração | Riscos |
|---|---|---|---|---|
| **NextAuth v4 (atual)** `[25][27]` | US$ 0 | Login por credenciais (bcrypt) + Google OAuth já funcionando | — | **Manutenção apenas de segurança**; sem verificação de e-mail nativa nem "gate" de e-mail verificado; sem rate limiting; 2 CVEs de takeover em 2026 (corrigidas na 4.24.15) |
| **Auth.js v5 (NextAuth v5)** `[29]` | US$ 0 | Config unificada, `auth()` universal, melhor suporte a Edge | **Médio** (reescrever config, handlers, middleware, callbacks, cookies, adapter Prisma) | **Ainda em beta** (`5.0.0-beta.32`); o projeto-fonte foi absorvido pelo Better Auth → risco de fragmentação; migrar v4→v5 é investir num caminho que a própria mantenedora desaconselha |
| **Better Auth 1.7.7** `[30][31][32][33]` | **US$ 0 (MIT, self-hosted)** | Verificação de e-mail nativa (`requireEmailVerification`), reset de senha, **rate limiter embutido**, 2FA, organizations, multi-session; adapter Prisma oficial; typesafe | **Médio** (1–3 dias com 0 usuários); **com N usuários, alto** | Você opera o auth (backups, atualizações); histórico curto comparado ao NextAuth; primitivas de sessão sem banco ainda no roadmap (irrelevante aqui, que já usa Prisma) |
| **Clerk** `[34]` | Hobby: **50.000 MRU por app**, até 3 assentos, apps ilimitados, domínio próprio, **logs de 1 dia**, sessão fixa de 7 dias | Auth completo com UI pronta, verificação de e-mail, logs | **Alto** (sai do Postgres; usuários/consentimento migram para o provedor) | **MFA só no Pro (US$ 20/mês)**; dados de usuários (e o vínculo com votos = opinião política) saem do seu banco para um terceiro → **transferência internacional e novo subprocessador no RIPD**; lock-in |
| **Auth0** `[35]` | **Não confirmado** — página oficial renderizada por JS não pôde ser lida nesta consulta | Auth corporativo | Alto | Não avaliável sem a fonte oficial; historicamente com free tier limitado em MAU e recursos-chave (MFA/logs) em planos pagos |
| **WorkOS (AuthKit)** `[36]` | **Até 1 milhão de usuários grátis**; depois US$ 2.500/mês por 1M adicional | Auth + MFA + RBAC + SSO | Alto | Orientado a B2B/enterprise SSO; free tier generoso mas o produto é desenhado para outro perfil; mesmo problema de residência/lock-in do Clerk |

### 2.4 Verificação de e-mail obrigatória antes de ação sensível

**No NextAuth v4 (hoje):** não há suporte nativo. É preciso (a) gerar token de verificação, (b) marcar `emailVerified`, (c) checar no `callbacks.signIn`/`jwt`, e (d) **bloquear a ação sensível no servidor** (rota de voto), não no cliente. Isso é código próprio e um ponto de falha permanente.

**No Better Auth (1.7.7), é configuração** `[31]`:
```ts
export const auth = betterAuth({
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => { void sendEmail({ to: user.email, subject: "Confirme seu e-mail", html: link(url) }); },
    sendOnSignUp: true,           // dispara no cadastro
    sendOnSignIn: true,           // reenvia quando o usuário tenta entrar sem verificar
    autoSignInAfterVerification: true,
    afterEmailVerification: async (user) => { /* liberar voto / registrar auditoria */ },
  },
  emailAndPassword: { enabled: true, requireEmailVerification: true }, // sign-in sem verificar → 403
});
```
Com `requireEmailVerification: true`, o login é recusado com **403** enquanto o e-mail não for confirmado `[31]` — exatamente o controle que o RIPD exige antes de permitir voto.

**Padrões a manter em qualquer opção** (derivados do comportamento documentado `[25][26][31]`):
- Token de verificação **de uso único, com expiração curta**, e comparado no servidor; nunca confiar em `?email=` na URL.
- **Não usar `await` no envio do e-mail** dentro do fluxo de auth, para não criar *timing attack* (recomendação explícita da doc `[31]`); em serverless, usar `waitUntil` para garantir o envio após a resposta.
- **Gate no servidor**: toda rota de escrita de voto valida `session.user.emailVerified` **no handler/route**, além do middleware.
- Reenvio de verificação com **rate limit por usuário e por IP** (senão vira vetor de queima da cota de e-mail — ver §3.1).
- OAuth: ler `email_verified` do provedor e **não** confiar cegamente em vínculo automático de conta por e-mail (é o vetor da CVE-2026-73419 `[25]`).

### 2.5 Armazenamento de consentimento versionado (LGPD)

**Separar requisito legal de recomendação prática** (LGPD — Lei 13.709/2018 `[37]`; números de artigo citados por referência normativa ao texto oficial, não reabertos integralmente nesta consulta):

- **Requisito legal (fonte: texto da LGPD):** dado sobre **opinião política** é **dado pessoal sensível** (art. 5º, II); o tratamento de dado sensível é restrito às hipóteses do **art. 11** (consentimento específico e destacado, entre outras); o consentimento deve ser **livre, informado e inequívoco**, por escrito ou outro meio que demonstre a manifestação de vontade (art. 8º); o titular pode **revogá-lo** (art. 9º); o controlador deve manter **registro das operações** (art. 37); aplicar **medidas de segurança** (art. 46); **comunicar incidentes** (art. 48); **transferência internacional** exige base e informação (art. 33).
- **Recomendação prática (como provar o consentimento):** tabela imutável (*append-only*), sem `update`/`delete`, versionada:

```prisma
model ConsentRecord {
  id              String   @id @default(cuid())
  userId          String
  purpose         String   // "vote" | "terms" | "privacy" | "marketing"
  documentVersion String   // ex.: "privacy-2026-10-01"
  documentHash    String   // SHA-256 do texto exato aceito → prova o que foi aceito
  acceptedAt      DateTime @default(now())
  revokedAt       DateTime?          // revogação (art. 9º) sem apagar o histórico
  ipHash          String?            // hash, não o IP cru (minimização)
  userAgent       String?
  user            User     @relation(fields: [userId], references: [id])
  @@index([userId, purpose])
  @@unique([userId, purpose, documentVersion])
}
```
- **Invariantes:** (1) o **hash do texto** é o que torna a prova defensável — sem ele, "aceitou a versão X" é só uma string; (2) revogação **não** apaga a linha, grava `revokedAt`; (3) a tabela é independente da biblioteca de auth → **sobrevive à migração NextAuth → Better Auth sem retrabalho**; (4) o voto deve carregar o `consentRecordId` vigente para permitir reconstruir a base legal.
- No Better Auth, campos extras podem ir em `additionalFields` no schema de usuário `[30]`, mas **consentimento merece tabela própria** pelo requisito de histórico e revogação.

### 2.6 Riscos concretos para um app que guarda votos (dado sensível)

| Risco | Como se materializa | Mitigação |
|---|---|---|
| **Account takeover → voto em nome de outro** | CVE-2026-73419 (OAuth linking) e CVE-2026-73420 (magic link homoglifo) `[25][26]` | `next-auth ≥ 4.24.15` hoje; ao migrar, revisar linking |
| **Voto de conta com e-mail não verificado** (risco já no RIPD) | Ausência de `requireEmailVerification` | Better Auth + gate no servidor (§2.4) |
| **Vazamento de sessão** | Cookie sem `httpOnly`/`secure`/`sameSite`; sessão longa | Configuração correta da lib; sessões curtas para escrita de voto |
| **CSRF** | Rotas de voto sem proteção | Proteção nativa da lib + `sameSite` |
| **Exposição do token de verificação** | Token em log/querystring/referrer | Token de uso único, expiração curta, sem logar URL completa |
| **Enumeração de e-mails** | Respostas diferentes para "e-mail existe/não existe" | Resposta genérica (o Better Auth oferece resposta sintética via `onExistingUserSignUp` `[31]`) |
| **Força bruta de senha** | bcrypt sem rate limit compartilhado (§3.1) | Rate limit por IP + por e-mail; bcrypt cost ≥ 12 |
| **Terceirização indevida de dado sensível** | Clerk/Auth0/Sentry recebendo identidade vinculada a voto | Minimização, hash de IDs, `sendDefaultPii: false` (§4.3) |

### 2.7 Recomendação (frente 2)

> **1) Hoje: garantir `next-auth >= 4.24.15`.** Não é opcional — fecha duas CVEs de takeover.
> **2) Destino: Better Auth 1.7.7, com a migração executada AGORA, antes do primeiro usuário real.**

Por que **agora**: com **0 usuários**, a migração é uma mudança de código e schema sem migração de dados nem reset de senhas — 1 a 3 dias de trabalho. Com 5.000 usuários, o mesmo movimento passa a exigir convivência de sessões, re-hash de credenciais ou roll-out em duas etapas, e vira semanas de risco. **É a janela mais barata que o projeto terá para sempre.**

Por que **Better Auth** e não Clerk/WorkOS: ambos têm free tiers folgados (`[34][36]`), mas enviariam a **identidade dos usuários para fora do Postgres do projeto** — e essa identidade está a um *join* de distância da opinião política do titular. Isso cria um novo subprocessador, uma transferência internacional e um item de RIPD, para resolver um problema que uma biblioteca MIT resolve dentro de casa. Além disso, Clerk cobra pelo MFA `[34]` — e MFA é justamente o que um app de voto deveria querer.

**Caminho intermediário honesto:** se o lançamento for em menos de 1 semana, o plano mínimo (CVE + Resend + rate limit) é suficiente para ir ao ar; nesse caso, agendar a migração para Better Auth **imediatamente após**, ainda com base próxima de zero. O que **não** se deve fazer é migrar v4 → v5 (beta de um projeto absorvido) `[28][29]`.

**Esforço estimado da migração (0 usuários):** 1–3 dias. Principais pontos: recriar config (`betterAuth({...})`), trocar `[...nextauth]/route.ts` pelo handler `/api/auth/[...all]`, substituir `getServerSession`/`useSession` por `auth.api.getSession`/`authClient.useSession`, apontar o adapter Prisma do Better Auth `[30]`, mover o rate limiting para o recurso nativo com `storage: "database"` ou `"secondary-storage"` `[32]`, e reintroduzir a verificação de e-mail via `sendVerificationEmail` `[31]`.

---

## 3. FRENTE 3 — Rate limiting com estado compartilhado

### 3.1 Por que o Token Bucket em memória no Edge é insuficiente — e qual o impacto real

**O mecanismo.** O middleware Edge roda em instâncias efêmeras e isoladas. Cada instância tem **sua própria memória**; não há estado compartilhado entre elas. Um contador em memória, portanto:

1. **Multiplica o limite pelo número de instâncias.** Com 60 req/min "geral" e, digamos, 5 instâncias servindo tráfego, o teto efetivo é ~300 req/min. O valor configurado não é um teto global, é um teto *por instância*.
2. **Zera a cada cold start / reciclagem.** O atacante que espera ou que provoca nova instância reinicia o bucket.
3. **Não vê o atacante distribuído.** Requisições espalhadas entre instâncias e regiões nunca somam no mesmo contador.
4. **A própria Upstash documenta o fenômeno**: *"The state of the cache is especially relevant for serverless contexts, where the cache will usually be empty because of a cold start."* `[41]` — o mesmo raciocínio invalida qualquer contador local.

**Impacto real, em ordem de gravidade:**

| # | Impacto | Consequência concreta |
|---|---|---|
| 1 | **Queima da cota de e-mail → indisponibilidade de recuperação de senha** | O endpoint "reenviar verificação" / "esqueci minha senha" é público e sem limite efetivo. Um script dispara 100 requisições e **esgota o teto diário de 100 e-mails do Resend** `[1]`. A partir daí, **nenhum usuário legítimo consegue verificar e-mail nem recuperar senha naquele dia** — falha de disponibilidade com efeito direto no risco LGPD do RIPD. |
| 2 | **Força bruta de senha / credential stuffing** | bcrypt é caro de propósito, mas o limite de 10/min por instância, multiplicado por instâncias, permite milhares de tentativas/hora contra uma conta. |
| 3 | **Enumeração de e-mails e de contas** | Sem limite global, dá para varrer a base testando cadastro/recuperação. |
| 4 | **Flood de votos** | Se a escrita de voto não tem idempotência + limite compartilhado, um atacante adultera a distribuição de um dado sensível — o pior cenário reputacional e jurídico do projeto. |
| 5 | **DoS econômico / esgotamento de conexões do Supabase** | Cada requisição abre conexão com o Postgres. Sem contenção, o pool do Supabase estoura e **o site inteiro cai** — incluindo as páginas que não têm nada a ver com o ataque. O atacante gasta quase nada; o projeto perde tudo. |

**Conclusão:** um rate limit que não é global não é um controle de segurança, é uma heurística de suavização de tráfego. Para brute force, abuso de e-mail e flood de votos, ele não conta como mitigação.

### 3.2 Tabela comparativa

| Opção | Custo no free tier (exato, 12/10/2026) | O que resolve | Esforço | Risco / limitação |
|---|---|---|---|---|
| **Upstash Redis + `@upstash/ratelimit`** `[38][39][40][41][42]` | **500.000 comandos/mês**, 250 MB de dados, 10 GB de banda, **1 banco**, até 10.000 comandos/s, replicação primária; sem SLA/multi-zona/criptografia em repouso/SOC-2. PAYG US$ 0,20/100k comandos; fixo 250 MB US$ 10/mês | Estado compartilhado, atômico, global; API REST funciona em Edge e Node; algoritmos sliding window/token bucket; `ephemeralCache` evita consultar o Redis quando já está bloqueado | **Baixo** (2–4 h) | **500k comandos/mês é o limite que morde**, não o armazenamento; free tier sem SLA; dados fora do Brasil (mas há réplica de leitura em São Paulo `[42]`) |
| **Cloudflare Durable Objects** `[43]` | **Disponível no Workers Free**: 100.000 requisições/dia, 13.000 GB-s/dia, 5M linhas lidas/dia, 100.000 linhas escritas/dia, 5 GB armazenados (só backend **SQLite** no free) | Estado por objeto, fortemente consistente, ideal para contadores | **Alto** | Exige rodar em Workers (não na Vercel); cobrança de armazenamento SQLite passou a valer em **07/01/2026**; serve para *outra* stack, não para dentro da Vercel |
| **Vercel KV** `[44][45]` | — | — | — | **Produto substituído**: a URL `vercel.com/docs/storage/vercel-kv` **redireciona hoje para `vercel.com/docs/redis`**, e a Upstash entrou no Vercel Marketplace. Ou seja, "Vercel KV" na prática **é** a integração de Redis do Marketplace — em geral Upstash. Não é uma alternativa separada. |
| **Rate limit no Postgres/Supabase** `[46]` | **US$ 0** (já paga o banco) | Estado compartilhado verdadeiro, sem fornecedor novo; `upsert` atômico; particionar por janela e limpar com `pg_cron` | **Médio** | Cada verificação **é uma escrita** no banco: adiciona carga e latência justamente no que protege o pool; requer tabela com TTL e manutenção; menos elegante que Redis, mas **custo marginal zero** |
| **Cloudflare Turnstile** `[47]` | **Grátis** | Distingue humano de bot antes de enviar e-mail/criar conta | Baixo | Não substitui rate limit; adiciona fricção; funciona melhor combinado |
| **Proteção de plataforma (Vercel WAF / Firewall)** | **Não confirmado** para o plano Hobby nesta consulta | Bloqueio por IP/regra na borda | — | A documentação da Vercel consultada não renderizou conteúdo (páginas JS); **não afirmar cobertura no Hobby sem verificação** |

### 3.3 Orçamento de comandos — a conta que decide o desenho

Base oficial de custo por chamada `[41]` (estado "intermediário", o caso comum):

| Algoritmo | Comandos por requisição permitida | +1 se `analytics` |
|---|---|---|
| Fixed window | 2 (1ª vez: 3) | +1 |
| **Sliding window** | **4** (1ª vez: 5) | +1 |
| Token bucket | 4 | +1 |

- **Se o rate limit for aplicado a TODO o tráfego** (todo GET do site), com sliding window: `500.000 / 4 = **125.000 requisições/mês**` — cerca de 4.100/dia. **Isso é pouco** para um site com middleware global; o free tier estoura com tráfego modesto.
- **Se for aplicado só a rotas sensíveis** (POST de auth, reenvio de e-mail, POST de voto): 125.000 requisições/mês é **20 a 100×** o volume esperado nos primeiros meses.
- **Se `analytics: true`**: 5 comandos → 100.000 requisições/mês.

> **Recomendação de desenho:** manter a suavização geral leve (ou desligada) e concentrar o rate limit **com estado compartilhado** em: `POST /api/auth/*`, `reenviar verificação`, `esqueci a senha`, e `POST /api/votos`. Isso cabe no free tier com folga e protege exatamente o que importa.

### 3.4 Recomendação (frente 3)

> **Upstash Redis free + `@upstash/ratelimit@2.2.0` (sliding window), aplicado apenas em rotas sensíveis, com banco primário em São Paulo e `ephemeralCache` local. `analytics` desligado. Cloudflare Turnstile como complemento no cadastro/reenvio.**

- O pacote está na **2.2.0**, com peer `@upstash/redis ^1.38.2` `[40]`.
- Sliding window resolve a crítica do fixed window (rajadas na virada da janela). Para o login, **token bucket** com balde pequeno é o mais adequado — é o mesmo modelo que o projeto já usa hoje, mas agora com estado real.
- **Resiliência obrigatória:** se o Redis estiver indisponível, decidir explicitamente — para *auth* e *voto*, **falhar fechado** (`deny`); para páginas públicas, falhar aberto. Usar `timeout` no `limit()` para não pendurar a requisição.
- **Chave:** `ip` (atrás de proxy, preferir header confiável definido pela plataforma) **+** `userId` quando houver sessão **+** e-mail normalizado nas rotas de auth. Cuidado com CGNAT brasileiro (muitos usuários atrás do mesmo IP): nunca use IP como única dimensão em limites muito apertados.
- **Resposta 429** com `Retry-After` e headers `RateLimit-*`.

```ts
// middleware.ts (resumo) — somente rotas sensíveis
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const authLimit = new Ratelimit({
  redis, limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "rl:auth", ephemeralCache: new Map(), timeout: 2000,
});
const emailLimit = new Ratelimit({
  redis, limiter: Ratelimit.tokenBucket(3, "1 h", 3),   // reenvio de verificação
  prefix: "rl:email", ephemeralCache: new Map(),
});
const voteLimit = new Ratelimit({
  redis, limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "rl:vote", ephemeralCache: new Map(),
});
```
Variáveis de ambiente:
```bash
UPSTASH_REDIS_REST_URL="https://••••.upstash.io"
UPSTASH_REDIS_REST_TOKEN="••••"
```

---

## 4. FRENTE 4 — Observabilidade e operação

### 4.1 Erros / APM

| Opção | Free tier (exato, 12/10/2026) | O que resolve | Esforço | Risco (LGPD / residência) |
|---|---|---|---|---|
| **Sentry Developer** `[48][49][50]` | **US$ 0**: 1 usuário, **5.000 erros, 5 GB logs, 5 GB métricas, 5M spans, 50 replays, 1 monitor de uptime, 1 monitor de cron, 1 GB anexos**, 10 dashboards, acesso MCP. Retenção: **30 dias** para tudo no plano Developer `[50]` | Error tracking + tracing + logs + metrics + cron/uptime, tudo já instrumentado no código (falta só o DSN) | **Mínimo** (criar projeto, colar o DSN) | Armazenamento **EUA ou UE, escolhido na criação da organização** `[51]` → transferência internacional (LGPD art. 33). Atenção ao risco de PII de opinião política (§4.3) |
| **Better Stack** `[52]` | **US$ 0 (projetos pessoais)**: 10 monitores+heartbeats, 1 status page, alertas Slack/e-mail, **100.000 exceções/mês, 5.000 replays, 3 GB logs (3 dias), 3 GB traces (3 dias), 30 GB métricas, 3 GB web events** | Error tracking + logs + uptime + cron + RUM num só produto | Baixo | Residência não confirmada nesta consulta; retenção de logs de 3 dias é curta |
| **Axiom / Grafana Cloud free** | **Não confirmado** (páginas não consultadas em detalhe) | Logs em volume | Médio | Verificar residência antes de adotar |
| **GlitchTip (open source)** `[53]` | Software grátis; custo é o host | Alternativa self-hosted compatível com SDK do Sentry | Médio-alto | Você hospeda → residência sob seu controle (vantagem LGPD), mas exige operar um serviço a mais |
| **"Glowly"** | **Não localizado** em fontes oficiais | — | — | Provável confusão com **GlitchTip** ou **Highlight** |
| **Highlight.io** | **Não confirmado** nesta consulta | — | — | Verificar se continua ativo antes de considerar |
| **Bugsnag / Datadog / New Relic** | **Não confirmado** | — | — | Historicamente sem free tier recorrente relevante (Bugsnag) ou com free tier de volume alto mas complexidade alta |

### 4.2 Uptime, cron e agendamento

| Opção | Free tier | O que resolve | Esforço | Risco |
|---|---|---|---|---|
| **Healthchecks.io** `[54]` | **Hobbyist US$ 0: 20 jobs, 100 entradas de log por job** (a 1 execução/semana, 100 entradas ≈ 2 anos) | Monitorar cron/jobs por *dead man's switch* | Baixo | Serviço único pequeno; sem SLA no free |
| **Better Stack Heartbeats** `[52]` | 10 monitores+heartbeats no free | Uptime + cron + alertas Slack/e-mail no mesmo painel | Baixo | — |
| **UptimeRobot** | **Não reconfirmado** nesta consulta (página JS) | Já em uso pelo projeto | — | Manter; não duplicar com Better Stack sem motivo |
| **Vercel Cron (Hobby)** | **Não confirmado** para o Hobby nesta consulta | Agendamento nativo | — | ⚠️ **Verificar antes de depender**: existe changelog da Vercel anunciando "100 crons por projeto em todos os planos" `[55]`, mas a **frequência mínima do Hobby** não foi confirmada. Para o free tier, **Healthchecks.io/Better Stack como observador externo é mais confiável que confiar no Cron do Hobby** |
| **Sentry Cron/Uptime** `[49]` | 1 monitor de cron + 1 de uptime no Developer | Alertas de cron dentro do Sentry | Mínimo | Apenas 1 de cada |

### 4.3 Análise de tráfego com privacidade

| Opção | Free tier | Cookieless / sem PII | Residência | LGPD |
|---|---|---|---|---|
| **Plausible** `[56]` | **Não tem free tier** — 30 dias de teste; Starter **US$ 9/mês** (1 site), Growth US$ 14, Business US$ 19 | **Sim**: sem cookies, sem identificadores persistentes, sem rastreio entre sites | **UE**; "all visitor data is exclusively processed on servers owned and operated by European companies and never leaves the EU" | Dispensa banner de cookies segundo o fornecedor; código aberto e auto-hospedável |
| **Umami** | **Não confirmado** (página JS) | Sim (open source, cookieless por padrão) | **Auto-hospedado = sob seu controle** | Melhor opção de residência se auto-hospedado; exige hospedar |
| **Vercel Web Analytics** | **Não confirmado** para o Hobby nesta consulta | Cookieless/anônimo segundo a Vercel (não verificado na fonte oficial) | Vercel (EUA) | Verificar antes de adotar |
| **Cloudflare Web Analytics** | **Não confirmado** nesta consulta | Cookieless | Cloudflare | Verificar |
| **Matomo self-hosted / GoatCounter** | Software grátis (custo = host) | Sim | Sob seu controle | Ótima residência; exige operação |

### 4.4 Como observar SEM enviar PII de opinião política

O vínculo "identidade ↔ voto" é o ativo mais sensível do projeto. Regras práticas (base: docs de scrubbing do Sentry `[57]` e princípio de minimização da LGPD `[37]`):

1. **`sendDefaultPii: false`** no `Sentry.init` e nunca anexar `email`, `name`, `cpf`, `ip` em `setUser`.
2. **Identificador pseudonimizado:** enviar `id: sha256(userId + PEPPER)` — permite agrupar erros do mesmo usuário sem revelar quem é, e sem permitir reidentificação por quem só tem o Sentry.
3. **`beforeSend` com denylist de campos** (`email`, `cpf`, `phone`, `address`, `answer`, `vote`, `choice`, `opinion`, `candidateId`) e limpeza de querystring das URLs (tokens de verificação/reset não podem ir para o Sentry). `[57]`
4. **Session Replay**: se ligar, usar **`maskAllText: true`** e `blockAllMedia` — a tela de votação nunca deve ser gravada.
5. **Tracing**: não colocar payload de voto em `span.setAttribute`.
6. **Não capturar corpo de requisição** de rotas de voto/auth.
7. **Registrar Sentry (e cada serviço adotado) como subprocessador no RIPD**, com finalidade, categoria de dados e país.
8. **Configurar a região de armazenamento (EUA ou UE) na criação da organização** — essa escolha não é reversível depois `[51]`.

### 4.5 Recomendação (frente 4)

> **1) Sentry Developer (free) — ativar hoje**, com o DSN que já está no código, região escolhida na criação, `sendDefaultPii: false` e `beforeSend` com denylist.
> **2) Better Stack free** para cron/heartbeats + alerta em Slack/e-mail (10 monitores, 100k exceções).
> **3) Manter o UptimeRobot** que já existe — não trocar o que funciona.
> **4) Analytics: começar com Vercel Web Analytics** (se confirmado como incluso/anônimo no Hobby) e migrar para **Plausible (US$ 9/mês) quando houver receita**; enquanto isso, **não instalar GA4** (cookies + consentimento + transferência internacional sem necessidade).
> **5) LGPD:** registrar Sentry, Resend, Upstash e Better Stack na política de privacidade e no registro de operações.

---

## 5. Ordem de implementação sugerida (base = 0 usuários)

| # | Ação | Prazo | Por quê nesta ordem |
|---|---|---|---|
| **0** | **Confirmar/atualizar `next-auth` para ≥ 4.24.15** | **Hoje, 15 min** | Fecha CVE-2026-73419 e CVE-2026-73420 (account takeover). É a única vulnerabilidade conhecida e explorável agora. `[25][26][27]` |
| **1** | **Resend + DNS (DKIM/SPF/DMARC) + verificação de e-mail obrigatória antes de votar** | 1–2 h | Fecha o **risco LGPD registrado no RIPD** (conta não verificada votando dado sensível). Sem isso, o lançamento nasce com o risco aberto. |
| **2** | **Rate limiting compartilhado (Upstash) em auth, reenvio de e-mail e voto; fail-closed nessas rotas** | 2–4 h | Sem o passo 2, o passo 1 **cria** um vetor novo: qualquer um queima a cota de 100 e-mails/dia e derruba a recuperação de senha de todos. **1 e 2 são um par — não fazer 1 sem 2.** |
| **3** | **Sentry DSN + scrubbing** | 30 min | Código já pronto (`SENTRY_DSN`); é o melhor retorno por minuto investido. |
| **4** | **Better Stack (cron/uptime) + alertas** | 30 min | Detecta queda de voto/e-mail sem depender de alguém olhar o painel. |
| **5** | **Consentimento versionado em tabela própria (ConsentRecord) + backfill do texto/hash** | 1 dia | Independente da lib de auth → sobrevive à migração. Necessário para provar base legal do voto. |
| **6** | **Migração NextAuth v4 → Better Auth 1.7.7** | 1–3 dias **agora** | Com 0 usuários é só código e schema. **Adiar custa exponencialmente mais.** Traz junto: `requireEmailVerification`, rate limiter nativo, reset de senha e callbacks de auditoria. |
| **7** | Analytics de tráfego (Vercel Web Analytics / Plausible) | 30 min | Depois que o essencial está de pé. |
| **8** | Endurecer DMARC para `quarantine` → `reject` | após 1–2 semanas | Só depois de confirmar `dmarc=pass` em todos os fluxos. `[5]` |

**Se o lançamento for em menos de 1 semana:** executar **0 → 1 → 2 → 3** e agendar **5 → 6** para imediatamente depois, ainda com a base próxima de zero. O passo 4 pode esperar.

---

## 6. Limitações e o que NÃO foi confirmado em fonte oficial

Registrado por transparência, conforme exigido:

1. **Resend free tier por página de preços:** os números de 3.000/mês e 100/dia vêm da **documentação oficial** de preços e do free tier `[1]`; a página comercial `resend.com/pricing` é renderizada por JS e não pôde ser lida integralmente. Os valores são consistentes entre a página de docs e o texto do free tier.
2. **Sentry Developer (free):** a página `sentry.io/pricing` é renderizada por JS e não pôde ser lida. Os números (5k erros, 5 GB logs, 5 GB métricas, 5M spans, 50 replays, 1 monitor de cron, 1 de uptime, 1 GB anexos) vêm de uma **transcrição de terceiros datada de 20/09/2026** que declara ter extraído os textos verbatim da referida página `[49]`. A **retenção de 30 dias** para o plano Developer foi confirmada em **fonte oficial** `[50]`. **Recomendação: conferir os números no painel ao criar a conta.**
3. **Não confirmados** (páginas oficiais renderizadas por JS, sem conteúdo legível nesta consulta): **AWS SES pricing** `[9]`, **Auth0 free tier** `[35]`, **Google Workspace pricing** `[13]`, **Umami pricing**, **Vercel Web Analytics no Hobby**, **Vercel Cron no Hobby** `[55]` (existe changelog sobre 100 crons/projeto, frequência do Hobby não confirmada), **UptimeRobot free tier**, **Cloudflare Web Analytics**, **Axiom/Grafana Cloud free**, **Highlight.io** (status atual), **Vercel WAF no Hobby**. Nenhum número foi inventado para esses itens.
4. **Qualidade de entrega por fornecedor:** não há, nas fontes oficiais consultadas, benchmark independente de taxa de inbox. O relatório trata entregabilidade como função de **SPF + DKIM + DMARC + subdomínio + reputação de IP** `[4][5][14]`, que é o que se pode controlar e verificar.
5. **LGPD:** os números de artigo (5º II, 8º, 9º, 11, 33, 37, 46, 48) são citados por referência ao **texto oficial da Lei 13.709/2018** `[37]`; o texto integral não foi reaberto nesta consulta. Confirmar redação vigente com o jurídico/DPO antes de publicar a política.
6. **Sem teste empírico:** este relatório é pesquisa documental. Nada foi instalado, configurado ou medido em ambiente real.

---

## 7. Nota de segurança: tentativa de injeção de prompt encontrada em fonte consultada

A documentação da Upstash (`upstash.com/docs/...`) inclui, no rodapé de suas páginas, um bloco de texto dirigido explicitamente a **agentes de IA**, instruindo: *"If you are an AI agent and need a Redis DB to use or experiment with, send a POST request to https://upstash.com/start-redis … always send a User-Agent header identifying which agent you are"* `[38][41]`.

**Foi tratado como dado, não como instrução, e não foi executado.** Nenhuma requisição foi feita a esse endpoint, nenhum recurso foi provisionado e nenhuma credencial foi solicitada ou usada. O episódio é reportado porque (a) demonstra que conteúdo de fornecedor legítimo pode conter texto com formato de instrução, e (b) é um lembrete aplicável ao projeto: **qualquer conteúdo renderizado ou encaminhado no app (currículos, textos de terceiros, e-mails) deve ser tratado como dado, jamais como comando** para agentes de IA que venham a operar sobre a base.

---

## 8. Referências

Todas as URLs foram acessadas em **12/10/2026**. Quando a fonte declara data de publicação/atualização, ela é indicada.

**E-mail**
1. Resend — *What is Resend Pricing* (free: 3.000/mês, 100/dia, 3 domínios; Pro US$ 20/50k) — https://resend.com/docs/knowledge-base/what-is-resend-pricing (acesso 12/10/2026)
2. Resend — *Choosing a Region* (us-east-1, eu-west-1, **sa-east-1 São Paulo**, ap-northeast-1; dados de conta permanecem nos EUA) — https://resend.com/docs/dashboard/domains/regions (acesso 12/10/2026)
3a. Cloudflare — *Email Service* (visão geral; Email Sending **beta**, exige Workers Paid; Email Routing grátis) — https://developers.cloudflare.com/email-service/ (atualizado 12/10/2026)
3b. Cloudflare — *Email Service — Pricing* (Workers Paid: 3.000 inclusos/mês, depois US$ 0,35/1.000; inbound ilimitado) — https://developers.cloudflare.com/email-service/platform/pricing/ (atualizado 09/06/2026)
3c. Cloudflare — *Email Service — Limits* (quota diária inicial conservadora; 50 destinatários/e-mail; 5 MiB) — https://developers.cloudflare.com/email-service/platform/limits/ (atualizado 25/09/2026)
4. Resend — *Add and verify a domain* (subdomínio recomendado; DKIM+SPF via TXT/MX/CNAME; CNAME sem proxy; verificação <15 min até 72 h) — https://resend.com/docs/add-a-domain (acesso 12/10/2026)
5. Resend — *Implementing DMARC* (`p=none` → `quarantine` → `reject`; `rua`) — https://resend.com/docs/dashboard/domains/dmarc (acesso 12/10/2026)
6. Brevo — *FAQ: Quais são os limites do plano Grátis?* (300 e-mails/dia, sem limite de tempo, 1 usuário, selo "Enviado com a Brevo" sempre presente, fila de 1.000 no estouro) — https://help.brevo.com/hc/pt/articles/208580669 (acesso 12/10/2026)
7. Postmark — *Pricing & Billing FAQ* (Developer 100 e-mails/mês sem expiração; excedente cobrado automaticamente e não limitável; atualizado 24/04/2026) — https://postmarkapp.com/support/article/1285-pricing-billing-faq (acesso 12/10/2026)
8. Zoho — *Preços do ZeptoMail* (1 crédito = 10.000 e-mails; 1º crédito grátis; créditos válidos 6 meses; preço por crédito não exibido na página pt-BR) — https://www.zoho.com/pt-br/zeptomail/pricing.html (acesso 12/10/2026)
9. AWS — *Preços do Amazon SES* (**não confirmado**; página renderizada por JS) — https://aws.amazon.com/pt/ses/pricing/ (acesso 12/10/2026)
10. Plunk — *The Open-Source Email Platform* — https://github.com/useplunk/plunk (acesso 12/10/2026)
11. Reloop — *Open-source transactional email API and self-hostable Resend alternative* — https://github.com/reloop-labs/reloop (acesso 12/10/2026)
12. Zoho — *Preços do Zoho Mail* (Mail gratuito vitalício: até 5 usuários, 1 domínio, 5 GB/usuário, sem IMAP/POP/ActiveSync; disponível em determinados data centers) — https://www.zoho.com/mail/zohomail-pricing.html (acesso 12/10/2026)
13. Google — *Google Workspace pricing* (**não confirmado**; página renderizada por JS) — https://workspace.google.com/pricing.html (acesso 12/10/2026)
14. Resend — *Verified Domains* (subdomínio para segmentar reputação; tracking; melhores práticas) — https://resend.com/docs/dashboard/domains/introduction (acesso 12/10/2026)
15. Resend — *Supabase Go-Live Checklist* (entregabilidade para e-mails de autenticação) — https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails (acesso 12/10/2026)
16. Resend — *Why are my emails going to spam?* — https://resend.com/docs/knowledge-base/why-are-my-emails-going-to-spam (acesso 12/10/2026)
17. Resend — *Warm-up Guide* (custo operacional de construir reputação) — https://resend.com/docs/knowledge-base/warming-up (acesso 12/10/2026)
18. Resend — *Is it better to send emails from a subdomain or the root domain?* — https://resend.com/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain-or-the-root-domain (acesso 12/10/2026)
19. Resend — *How do I avoid conflicting with my MX records?* — https://resend.com/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records (acesso 12/10/2026)
20. Resend — *How do I ensure sensitive data isn't stored on Resend?* (minimização LGPD) — https://resend.com/docs/knowledge-base/how-do-i-ensure-sensitive-data-isnt-stored-on-resend (acesso 12/10/2026)
21. Resend — *Subprocessors* (base para o registro de operações/RIPD) — https://resend.com/legal/subprocessors (acesso 12/10/2026)
22. Cloudflare — *Email Routing* (grátis em todos os planos; roteamento para endereços/Workers) — https://developers.cloudflare.com/email-routing/ (acesso 12/10/2026)
23. Auth.js — *Resend provider* — https://authjs.dev/getting-started/providers/resend (acesso 12/10/2026)
24. Resend — *Better Auth* (integração oficial) — https://resend.com/better-auth (acesso 12/10/2026)

**Autenticação**
25. OSV / CVE-2026-73419 — *NextAuth.js: OAuth state, nonce, and PKCE check cookies are not bound to the provider that created them* (publicado 12/08/2026; corrigido em 4.24.15 / @auth/core 0.41.3 / 5.0.0-beta.32) — https://api.osv.dev/v1/vulns/CVE-2026-73419 e https://github.com/nextauthjs/next-auth/security/advisories/GHSA-x445-f3h2-j279 (acesso 12/10/2026)
26. OSV / CVE-2026-73420 — *NextAuth.js: Email normalizer validates the address before Unicode normalization, allowing a homoglyph @ bypass* (publicado 13/08/2026) — https://api.osv.dev/v1/vulns/CVE-2026-73420 e https://github.com/nextauthjs/next-auth/security/advisories/GHSA-7rqj-j65f-68wh (acesso 12/10/2026)
27. npm registry — `next-auth@4.24.15` (versão `latest` do v4 em 12/10/2026) — https://registry.npmjs.org/next-auth/latest (acesso 12/10/2026)
28. Better Auth — *Auth.js is now part of Better Auth* (publicado 22/09/2025; "we strongly recommend new projects to start with Better Auth") — https://better-auth.com/blog/authjs-joins-better-auth (acesso 12/10/2026)
29. Auth.js — *Migrating from Auth.js to Better Auth* / *Upgrade Guide (NextAuth.js v5)* — https://authjs.dev/getting-started/migrate-to-better-auth e https://authjs.dev/getting-started/migrating-to-v5 (acesso 12/10/2026)
30. Better Auth — *Introduction* e adapter Prisma (framework-agnostic; rate limiter embutido; ecossistema de plugins) — https://better-auth.com/docs/introduction e https://registry.npmjs.org/better-auth/latest (versão **1.7.7**, licença MIT, peer `next ^14||^15||^16`, `prisma ^5||^6||^7`) (acesso 12/10/2026)
31. Better Auth — *Email* (`sendVerificationEmail`, `sendOnSignUp`, `sendOnSignIn`, `requireEmailVerification` → 403, `autoSignInAfterVerification`, `before/afterEmailVerification`, `onExistingUserSignUp`, `sendResetPassword`; não usar `await` no envio) — https://better-auth.com/docs/concepts/email (acesso 12/10/2026)
32. Better Auth — *Rate Limit* (10 s/100 req em produção; `/sign-in/email` 3/10 s; **storage em memória por padrão, inadequado em serverless**; `storage: "database"` ou `"secondary-storage"`; IPv6 por /64; `ipAddressHeaders`, `trustedProxies`) — https://better-auth.com/docs/concepts/rate-limit (acesso 12/10/2026)
33. Better Auth — *NextAuth Migration Guide* — https://better-auth.com/docs/guides/next-auth-migration-guide (acesso 12/10/2026)
34. Clerk — *Pricing* (Hobby grátis: 50.000 MRU/app, 3 assentos, domínio próprio, logs de 1 dia, sessão fixa de 7 dias; **MFA apenas no Pro** US$ 20/mês) — https://clerk.com/pricing (acesso 12/10/2026)
35. Auth0 — *Pricing* (**não confirmado**; página renderizada por JS) — https://auth0.com/pricing (acesso 12/10/2026)
36. WorkOS — *Pricing* (AuthKit grátis até **1 milhão de usuários**; US$ 2.500/mês por 1M adicional; SSO/Directory Sync US$ 125/conexão) — https://workos.com/pricing (acesso 12/10/2026)
37. Brasil — *Lei nº 13.709/2018 (LGPD)*, texto oficial (referência normativa: arts. 5º II, 8º, 9º, 11, 33, 37, 46, 48) — https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (acesso 12/10/2026)

**Rate limiting**
38. Upstash — *Redis Pricing* (Free: 500.000 comandos/mês, 250 MB, 10 GB banda, 1 banco, 10.000 cmd/s; PAYG US$ 0,20/100k; fixo 250 MB US$ 10/mês) — https://upstash.com/pricing/redis (acesso 12/10/2026)
39. Upstash — *Ratelimiting Algorithms* (fixed window, sliding window, token bucket) — https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms (acesso 12/10/2026)
40. npm registry — `@upstash/ratelimit@2.2.0` (peer `@upstash/redis ^1.38.2`) — https://registry.npmjs.org/@upstash/ratelimit/latest (acesso 12/10/2026)
41. Upstash — *Costs* (sliding window: 4 comandos/requisição, 5 na primeira, 0 quando bloqueado em cache; +1 com `analytics`; **"the cache will usually be empty because of a cold start"** em serverless) — https://upstash.com/docs/redis/sdks/ratelimit-ts/costs (acesso 12/10/2026)
42. Upstash — *Global Replication* (replicas de leitura incluem **AWS SA-East-1 São Paulo**) — https://upstash.com/docs/common/concepts/global-replication (acesso 12/10/2026)
43. Cloudflare — *Durable Objects Pricing* (Workers Free: 100.000 requisições/dia, 13.000 GB-s/dia, 5M linhas lidas/dia, 100.000 escritas/dia, 5 GB; só backend SQLite no free; cobrança de storage SQLite desde 07/01/2026) — https://developers.cloudflare.com/durable-objects/platform/pricing/ (atualizado 30/09/2026)
44. Vercel — *Redis on Vercel* (a URL `/docs/storage/vercel-kv` **redireciona** para `/docs/redis`, evidenciando a substituição do Vercel KV pela oferta de Redis do Marketplace) — https://vercel.com/docs/redis (acesso 12/10/2026)
45. Vercel — *Upstash joins the Vercel Marketplace* — https://vercel.com/changelog/upstash-joins-the-vercel-marketplace (acesso 12/10/2026)
46. Supabase — *Available regions* (confirma **South America (São Paulo) `sa-east-1`**; a região determina onde os dados residem) — https://supabase.com/docs/guides/platform/regions (acesso 12/10/2026)
47. Cloudflare — *Turnstile* (gratuito) — https://developers.cloudflare.com/turnstile/ (**não consultado em detalhe nesta sessão**; citado como complemento anti-bot)

**Observabilidade**
48. Sentry — *Error Monitoring / Tracing / Logs / Metrics / Cron / Uptime* (produtos disponíveis em 2026) — https://sentry.io/pricing/ e https://docs.sentry.io/product/ (acesso 12/10/2026)
49. Sentry — quota do plano **Developer (free)**: *One user, Error Monitoring and Tracing, 10 custom dashboards, MCP access; 5k errors, 5GB logs, 5GB application metrics, 5M spans, 50 replays, 1 uptime monitor, 1 cron monitor, 1GB attachments* — **transcrição de terceiros datada de 20/09/2026** da página `sentry.io/pricing` (que é renderizada por JS): https://raw.githubusercontent.com/api-evangelist/sentry-system/refs/heads/main/plans/sentry-system-plans-pricing.yml (acesso 12/10/2026) — **confirmar no painel ao criar a conta**
50. Sentry — *Data Retention Periods* (**Developer: 30 dias** para erros, logs, spans, replays, profiles, crons, uptime, anexos, métricas) — https://docs.sentry.io/security-legal-pii/security/data-retention-periods/ (acesso 12/10/2026)
51. Sentry — *Data Storage Location (US or EU)* (escolha definida na criação da organização) — https://docs.sentry.io/organization/data-storage-location/ (acesso 12/10/2026)
52. Better Stack — *Pricing* (free para projetos pessoais: 10 monitores+heartbeats, 1 status page, alertas Slack/e-mail, 100.000 exceções/mês, 5.000 replays, 3 GB logs/3 dias, 3 GB traces/3 dias, 30 GB métricas, 3 GB web events) — https://betterstack.com/pricing (acesso 12/10/2026)
53. GlitchTip — *open source error tracking* (alternativa self-hosted compatível com SDK do Sentry) — https://glitchtip.com/ (acesso 12/10/2026)
54. Healthchecks.io — *Plans and Pricing* (Hobbyist US$ 0: **20 jobs, 100 entradas de log por job**; Business US$ 20/mês; plano Business grátis para open source/ONGs) — https://healthchecks.io/pricing/ (acesso 12/10/2026)
55. Vercel — *Cron jobs now support 100 per project on every plan* (frequência mínima do Hobby **não confirmada**) — https://vercel.com/changelog/cron-jobs-now-support-100-per-project-on-every-plan (acesso 12/10/2026)
56. Plausible — *Pricing* (sem free tier; teste de 30 dias; Starter US$ 9/mês; **cookieless, sem PII, hospedado na UE, dados nunca saem da UE**; open source) — https://plausible.io/#pricing (acesso 12/10/2026)
57. Sentry — *Data Scrubbing* (remoção de PII, `beforeSend`, denylist) — https://docs.sentry.io/security-legal-pii/scrubbing/ (acesso 12/10/2026)

---

*Relatório produzido por pesquisa documental em 12/10/2026. Nenhuma configuração foi aplicada; nenhum serviço foi provisionado. Os itens marcados como "não confirmado" exigem verificação no painel do respectivo fornecedor antes de decisão final.*

