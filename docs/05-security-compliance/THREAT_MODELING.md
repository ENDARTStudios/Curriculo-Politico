# THREAT_MODELING — STRIDE sobre os ativos reais

**Projeto:** Currículo Político · **Data:** 2026-10-12 · **Método:** STRIDE, escopo de aplicação (não de infraestrutura corporativa)
**Base:** leitura direta do código (`apps/web/src/…`, `apps/web/prisma/schema.prisma`, `.github/workflows/*.yml`) e das auditorias em [`docs/06-devops-deployment/`](../06-devops-deployment/)

> **Premissa de honestidade.** Este modelo descreve as ameaças que **existem hoje**,
> contra os controles que **existem hoje**. Não há ator de APT, grupo
> patrocinado por Estado ou cadeia de suprimentos sofisticada com justificativa
> neste projeto: a plataforma tem base de usuários próxima de zero, nenhuma
> receita e nenhum dado secreto — o que ela tem é **reputação** e **um dado
> sensível de baixo volume**. Os atores plausíveis são:
>
> 1. **Bot/scraper oportunista** — automatizado, custo marginal zero, busca volume de dados ou cota.
> 2. **Operador de engajamento político** — militante, campanha ou simpatizante que quer inflar/derrubar contagem de votos.
> 3. **Pessoa interessada em apagar/plantar informação** sobre um político específico.
> 4. **Pesquisador de segurança / curioso** que lê o código (é AGPL e público) e testa o que encontrou.
> 5. **Erro do próprio operador** — o insider mais provável é o dono do projeto rodando um script de dados contra produção (ver `AGENTS.md`).

---

## 1. Inventário de ativos

| # | Ativo | Onde vive | Por que importa | Sensibilidade |
|---|---|---|---|---|
| **A1** | Base de dados públicos de políticos (594 `Person`, 31.815 `Bill`, 166.825 `SessionAttendance`, CEAP, patrimônio) | Supabase `sa-east-1` | É o produto; ~98 MB de dados curados e caros de reconstruir | Pública, mas **cara** |
| **A2** | Notas e histórico do IDIP (`Score`, `ScoreSnapshot`) | idem | Credibilidade do índice; série temporal não reconstruível retroativamente com fidelidade | Pública, **insubstituível** |
| **A3** | **Credenciais de banco** (`DATABASE_URL`, `DIRECT_URL`) | Vercel env (23 variáveis manuais), GitHub Secrets, `.env` local | `DATABASE_URL` dá **escrita em produção** | **Crítica** |
| **A4** | Contas de usuário (`User`, `Account`, `Session`) | Supabase | Identidade das pessoas | Pessoal |
| **A5** | **Votos da camada de engajamento** (`UserBillVote`) | Supabase | **Opinião política = dado pessoal sensível (LGPD Art. 5º, II)**; vínculo identidade↔voto é o ativo mais sensível | **Sensível** |
| **A6** | Canal de retificação (`RetificationRequest`) | Supabase + `/retificacao` | Nome, e-mail e texto livre; **é o instrumento de defesa jurídica do projeto** | Pessoal + reputacional |
| **A7** | Segredos de aplicação: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_*` | Vercel / GitHub | `NEXTAUTH_SECRET` forja sessão; OAuth secret permite abuso do app Google | **Crítica** |
| **A8** | Repositório público GitHub + histórico git | GitHub | Código de segurança exposto; `.env` no histórico seria catastrófico | Público, com risco de vazamento |
| **A9** | Reputação jurídica e editorial da plataforma | — | Um falso positivo de homonímia ou um texto jurídico incorreto vale mais que qualquer vazamento de baixo volume | **Estratégica** |
| **A10** | Cota/plano dos fornecedores (Supabase Free 5 GB egress; Vercel Hobby sem pay-as-you-go) | — | Estouro = **30 dias de plataforma parada**, não uma fatura | Disponível |

---

## 2. Fronteiras de confiança e fluxo de dados

```
[Fontes oficiais: Câmara, Senado, TSE, TCU, Querido Diário]
        │  (HTTP público, sem autenticação; conteúdo NÃO confiável / não verificado)
        ▼
[ETL local: apps/pipeline/etl/*.py]  ──grava──► [data/raw/*.json]  (gitignored)
        │
        │  usa DIRECT_URL (5432)  ──►  ✱ FRONTEIRA 1: máquina do operador → produção
        ▼
[dados carregados por npm run db:load-*]  ──►  [Supabase Postgres sa-east-1]
                                                      ▲
   ✱ FRONTEIRA 2: Internet → Vercel Edge Middleware │  (DATABASE_URL, 6543 transaction pooler)
   ┌──────────────────────────────────────────────────┘
   │
[Vercel Edge: middleware.ts — rate limit em memória + CSP/headers]
   │
   ├─► [Rotas públicas /api/* e páginas]  ──► Prisma → Postgres
   │
   ├─► [NextAuth: /api/auth/*]  ──► Google OAuth | CredentialsProvider (bcrypt)
   │        │  sessão JWT em cookie __Secure-next-auth.session-token
   │        ▼
   ├─► [Rotas autenticadas: /api/consent, /api/account, /api/bills/[id]/vote]
   │
   └─► [Rotas públicas de escrita: /api/auth/register, /api/retificacao]  ✱ FRONTEIRA 3

[GitHub Actions: monthly-snapshot (dia 1), production-smoke (6h), a11y (6h), CI]
   │  usa secrets.DATABASE_URL — ✱ FRONTEIRA 4: Actions → produção
   ▼
[Produção Supabase]

[Vercel build ← push em main / npx vercel --prod]  ✱ FRONTEIRA 5: repositório → produção
[Operador humano]  ✱ FRONTEIRA 6: pessoa → todos os segredos (sem MFA, sem RBAC)
```

**Observação sobre a Fronteira 3:** `/api/auth/register` e `/api/retificacao` são
as duas únicas rotas **públicas de escrita** no banco. Elas são o alvo natural
de bot.

---

## 3. STRIDE por ativo

Notação de risco: probabilidade × impacto. Escala P/I = Baixa / Média / Alta.
**Risco residual** é o que sobra com os controles atuais (não com os desejados).

### S — Spoofing (falsificação de identidade)

| ID | Ameaça | Ativo | Como se materializa neste código | P | I | Controles atuais | Residual |
|---|---|---|---|---|---|---|---|
| S1 | **Sybil / conta descartável votando** | A5 | Não há verificação de e-mail (`emailVerified` nunca é preenchido). Um script cria N contas e vota. O único freio é `MIN_AGE_MS = 24 h` em `api/bills/[id]/vote/route.ts` L110–129 — **esperar 24 h é trivial** e o atacante pode criar as contas hoje e votar amanhã em lote | Alta | Médio | Conta 24 h; 1 voto/projeto (`@@unique([userId, billId])`); rate limit crítico 10/min em `POST /api/auth/register` | **Médio-alto** |
| S2 | Falsificação de sessão | A4, A7 | Se `NEXTAUTH_SECRET` vazar, sessões são forjáveis. O segredo é estático (sem rotação) | Baixa | Alto | JWT assinado; cookie `__Secure-` em https | Médio |
| S3 | Account takeover via OAuth (CVE histórica) | A4 | CVEs 2026 de *account linking* afetavam `next-auth <= 4.24.14`. O projeto está em **`^4.24.15`** (`apps/web/package.json` L23) | Baixa | Alto | Versão corrigida. **Verificado** | Baixo |
| S4 | Enumeração de e-mail no cadastro | A4 | `POST /api/auth/register` responde **409 `EMAIL_EM_USO`** com a mensagem "Este e-mail já possui conta" (L68–74) — confirma existência de conta. `authorize()` do CredentialsProvider responde genérico (retorna `null`), então o login **não** enumera | Média | Baixo | Rate limit crítico 10/min por IP/instância | **Médio** |
| S5 | Troca de identidade no canal de retificação | A6 | Qualquer pessoa que saiba `protocolo` + `e-mail` lê o status (`GET /api/retificacao`). O espaço do protocolo é 32⁶ ≈ 1,07 × 10⁹, **mas o e-mail é conhecido** pelo atacante se ele for o alvo — e o protocolo é enumerável dentro do rate limit | Baixa | Baixo | Protocolo aleatório via `crypto.getRandomValues`; exige os **dois** campos | Baixo |

### T — Tampering (adulteração)

| ID | Ameaça | Ativo | Como se materializa | P | I | Controles atuais | Residual |
|---|---|---|---|---|---|---|---|
| T1 | **Manipulação da votação popular** (inflar FAVOR ou CONTRA) | A5 | Combinação de S1 (sybil) + rate limit por instância. `POST` faz `upsert` (voto alterável) — sem idempotência por janela nem auditoria de mudança | Alta | Médio | `@@unique([userId, billId])`; consentimento obrigatório (reduz bots casuais); conta 24 h | **Médio-alto** |
| T2 | **`DATABASE_URL` vazada → escrita em produção** | A1, A2, A3 | A string de conexão do pooler permite `INSERT`/`UPDATE`/`DELETE` direto, **sem passar pela aplicação** (sem RLS — ver [`RLS.md`](./RLS.md)). Vetores: `.env` local commitado por engano; log/print acidental; `echo $DATABASE_URL` em step de CI; histórico git | Média | **Alto** | `.env` está em `.gitignore`; `db:seed` recusa banco remoto sem `CP_ALLOW_REMOTE_SEED=1` | **Médio-alto** |
| T3 | **Segunda execução de script de dados contra produção por engano** | A1, A2 | `AGENTS.md` registra explicitamente: *"`DATABASE_URL` decide tudo — todo script de dados grava no banco que ela apontar, inclusive produção"*, e o `.env` local aponta para o Supabase de produção (`AUDITORIA_PRODUCAO.md` §0.5). Só `db:seed` tem guarda; `db:load-*`, `recalculate-scores` e `apply-integrity-caps` **não têm** | **Alta** | Alto | Apenas a guarda do `db:seed` | **Alto** — é o risco mais concreto e o menos exótico |
| T4 | Alteração do IDIP por texto na UI | A2, A9 | A home já divergiu: exibia "IDIP v1.0" com o motor em v1.1 (`AGENTS.md`, regra 3) | Média | Médio | Teste Playwright que compara a versão renderizada com `packages/idip/package.json` (`tests/e2e/home.spec.ts` L30–54) | Baixo |
| T5 | **Injeção de comando/prompt via conteúdo externo** | A1 | O ETL ingere texto de terceiros: ementas e `fullText` de proposições, resumos, menções de diários municipais, `VerifiedClaim.claimText`. Hoje esses textos **não alimentam nenhum agente de IA** (não há LLM em runtime), então não há execução de instrução. **O risco é real apenas se**: (a) um agente de IA passar a operar sobre a base (o banco é público e legível); (b) um pipeline de resumo por LLM processar `fullText` de terceiros. Precedente documentado: a própria documentação da Upstash continha bloco dirigido a agentes de IA, que foi tratado como dado e ignorado (`anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md` §7) | Baixa **hoje** | Alto **se** LLM entrar | **Nenhum controle técnico** — apenas convenção documental | **Baixo hoje / Alto se mudar** |
| T6 | Adulteração de dados na origem | A1 | A plataforma **replica** a fonte oficial. Se a fonte errar, o erro entra | Média | Alto | Canal de retificação; citação de `sourceUrl` e `retrievedAt` em cada modelo | Médio |

### R — Repudiation (repúdio)

| ID | Ameaça | Ativo | Situação | P | I | Residual |
|---|---|---|---|---|---|---|
| R1 | Usuário nega ter votado | A5 | `UserBillVote` guarda `createdAt`/`updatedAt`, mas **não guarda a versão de consentimento vigente no momento do voto** nem histórico de alteração (`upsert` sobrescreve). Não há `ConsentRecord` imutável | Média | Médio | **Médio** — a prova de base legal é frágil |
| R2 | Controlador nega ter recebido solicitação de titular | A6 | `RetificationRequest` guarda protocolo, conteúdo, `createdAt`/`updatedAt` → **boa prova**. Mas **não há log de quem acessou/alterou** o registro | Baixa | Médio | Baixo |
| R3 | Operador nega ter rodado script contra produção | A1 | GitHub Actions registra execuções dos workflows; **execução local não deixa rastro** (nenhum log de auditoria de operação de dados) | Média | Médio | **Médio** |
| R4 | Ausência de log de autenticação | A4 | Não há tabela nem serviço de log de login/erro de login. Com Sentry dormente, **falhas de auth são invisíveis** | Média | Baixo | Médio |

### I — Information Disclosure (divulgação de informação)

| ID | Ameaça | Ativo | Como se materializa | P | I | Controles atuais | Residual |
|---|---|---|---|---|---|---|---|
| I1 | **Scraping em massa da base pública** | A1, A10 | O site é público e `robots.txt` **permite** rastreamento (`Allow: /`), com `Disallow: /conta` e `/api/`. O sitemap é um `sitemapindex` paginado. Um scraper consome páginas de perfil, `/api/search`, `/api/rankings` — e **cada request atravessa até o Supabase e conta egress** | Alta | Médio | Rate limit 60/min **por instância** (não global); `Disallow: /api/` no robots (honrado só por crawlers educados) | **Médio-alto** |
| I2 | Vazamento de `UserBillVote` + e-mails do banco | A4, A5 | Um dump dá a alguém a **opinião política nominal** de cada usuário — a categoria mais sensível da LGPD | Baixa | Alto | Criptografia em trânsito; bcrypt nas senhas; **sem RLS**; **sem backup** (o que também significa que um `DROP` é irrecuperável) | **Médio** |
| I3 | Vazamento de `DATABASE_URL` (ver T2) | A3 | — | Média | Alto | — | **Médio-alto** |
| I4 | PII de opinião política enviada a terceiro | A5 | [`instrumentation.ts`](../../apps/web/src/instrumentation.ts) inicializa o Sentry com `tracesSampleRate: 0.1` e **sem `sendDefaultPii: false`, sem `beforeSend` com denylist e sem scrubbing** (L16–20). Hoje é inócuo (sem DSN, o SDK nem entra no bundle); **ao definir o DSN, o scrubbing precisa existir antes** | Baixa hoje | Alto | SDK dormente por ausência de DSN | **Alto no momento da ativação** |
| I5 | Mensagens de erro reveladoras | A1 | `AUDITORIA_PRODUCAO.md` §9 do anexo registra `catch {}` em 8 rotas e `/api/rankings` devolvendo `BANCO_INDISPONIVEL` para **qualquer** erro; `DELETE /api/account` devolve `DB_ERROR` genérico. Não há stack trace ao cliente — bom | Baixa | Baixo | Erro genérico ao cliente | Baixo |
| I6 | Vazamento por histórico git | A8 | Repositório **público**. Um `git add -f .env` ou um valor colado em doc seria permanente | Baixa | Alto | `.gitignore` em raiz e em `apps/web/` | Médio |

### D — Denial of Service

| ID | Ameaça | Ativo | Como se materializa | P | I | Controles atuais | Residual |
|---|---|---|---|---|---|---|---|
| D1 | **Flood que esgota o pool do Supabase** | A10, A1 | Cada request dinâmico abre conexão. O `DATABASE_URL` usa o transaction pooler (6543) com `connection_limit=1` — **mitigação estrutural já aplicada**. Sem ela, um flood derrubava o site inteiro | Alta | Alto | Pooler transaction mode + `connection_limit=1`; region `gru1` co-localizada | **Médio** (mitigado, mas o teto de CPU do Hobby no middleware continua) |
| D2 | Flood de escrita em `/api/retificacao` | A6, A10 | Rota **pública** de `INSERT`, sem login, sem captcha, no **tier geral (60/min)** — não no crítico de 10/min. Um bot enche a tabela com lixo e **enterra solicitações legítimas de direito de resposta** | Alta | Médio | Apenas tier geral de 60/min por instância + validação de campos | **Alto** — e é o pior tipo: degrada justamente o canal jurídico |
| D3 | DoS econômico por egress | A10 | O Free do Supabase tem 5 GB/mês de egress **unificado**; `/ranking` sozinho devolve 177 KB por request (medido). A Vercel Hobby **não tem pay-as-you-go**: estourar = esperar 30 dias | Média | Alto | Cache de borda parcial; `unstable_cache` **ainda não implementado** | **Médio-alto** |
| D4 | Esgotamento de CPU do middleware | A10 | O middleware cobre **quase todas as rotas** (`matcher` em `middleware.ts` L153–155) e executa `getToken()` (verificação de JWT) em `/api/*`. O Hobby tem teto de fair use de ~50 ms de CPU médios | Média | Médio | Nenhum | Médio |
| D5 | Lossof de dados por ausência de backup | A1, A2 | Não existe `pg_dump` nem workflow. O plano Free do Supabase **não inclui backup automático** | Média | **Alto** | Nenhum | **Alto** — ver [`BACKUP_DR.md`](../06-devops-deployment/BACKUP_DR.md) |

### E — Elevation of Privilege

| ID | Ameaça | Ativo | Como se materializa | P | I | Controles atuais | Residual |
|---|---|---|---|---|---|---|---|
| E1 | **Não existe RBAC** | A1–A7 | Não há papéis, não há painel administrativo, não há distinção entre "usuário" e "operador". Quem tem `DATABASE_URL` tem poder total; quem não tem, não tem nenhum. Ver [`RBAC.md`](./RBAC.md) | — | Alto | Nenhum | **Estrutural** |
| E2 | Escalada por posse de segredo | A3, A7 | A única fronteira de privilégio real do projeto é **posse da string de conexão** | Média | Alto | Nenhum (sem MFA, sem rotação, sem auditoria) | **Alto** |
| E3 | XSS → roubo de sessão/CSRF em rota de escrita | A4, A5 | A CSP inclui `script-src 'unsafe-inline' 'unsafe-eval'` (`middleware.ts` L105) — reduz a defesa em profundidade contra XSS. As rotas `POST/DELETE` de consentimento e voto **não têm proteção CSRF própria** nem checagem de `Origin`; dependem do padrão same-site do cookie do NextAuth (**não verificado** o atributo `SameSite` explícito — não há `cookies:` configurado em `lib/auth.ts`) | Baixa | Alto | CSP (enfraquecida), `X-Frame-Options: DENY`, `form-action 'self'`, `base-uri 'self'` | **Médio** |
| E4 | Falha de rate limit por cold start | A5, D1 | Em serverless, o balde em memória **zera a cada cold start** e é multiplicado por instância | Alta | Médio | Nenhum (é limitação arquitetural reconhecida no comentário do próprio `middleware.ts` L15–17) | **Médio** |

---

## 4. Top 8 ameaças priorizadas

Ordenadas por **risco residual × custo de mitigação**, não por categoria.

| # | Ameaça | Residual | Mitigação mínima | Custo |
|---|---|---|---|---|
| 1 | **T3 — script de dados rodando contra produção por engano** | Alto | Estender a guarda de banco remoto do `db:seed` para **todos** os scripts de escrita (`db:load-*`, `recalculate-scores`, `apply-integrity-caps`): recusar host não-localhost sem `CP_ALLOW_REMOTE_WRITE=1`. Remover `DATABASE_URL` de produção do `.env` local | Horas |
| 2 | **D5 — sem backup** | Alto | Workflow semanal `pg_dump` cifrado para storage privado + **teste de restore** | ~2 h + teste |
| 3 | **D2 — flood em `/api/retificacao`** | Alto | Mover `/api/retificacao` (POST) para o **tier crítico** de 10/min; adicionar captcha (Turnstile) e/ou rate limit com estado compartilhado | Horas |
| 4 | **S1/T1 — sybil e manipulação de votação** | Médio-alto | Verificação de e-mail obrigatória antes de votar (bloqueada por ausência de e-mail) **ou** suspender a votação popular até existir; rate limit compartilhado | Dias (depende de e-mail) |
| 5 | **I1/D3 — scraping e egress** | Médio-alto | `unstable_cache` nas rotas dinâmicas + monitorar egress + WAF/Cloudflare na frente | 1–2 dias |
| 6 | **T2/I3 — vazamento de `DATABASE_URL`** | Médio-alto | Rotação de credenciais; **papel Postgres de runtime com privilégio mínimo** (sem DDL) separado do papel de ETL; RLS (defesa em profundidade) | Dias |
| 7 | **I4 — PII para o Sentry** | Alto na ativação | `sendDefaultPii: false` + `beforeSend` com denylist (`email`, `vote`, `cpf`…) + limpeza de querystring **antes** de definir `SENTRY_DSN` | Horas |
| 8 | **E3 — CSRF/sessão** | Médio | Declarar explicitamente `cookies` (httpOnly, secure, sameSite) e usar `bcrypt` cost ≥ 12; considerar `Origin` check nas rotas de escrita | Horas |

---

## 5. Ameaças avaliadas e **descartadas** (com justificativa)

Registrar o que não se aplica evita inflar o modelo e gastar esforço no lugar errado.

| Ameaça | Por que não se aplica |
|---|---|
| **Prompt injection via conteúdo externo em runtime** | Não há LLM, agente ou RAG no runtime da aplicação. O ETL é determinístico (parsers Python/TS). O risco existe apenas como **cenário futuro** (T5) e como **regra para agentes de IA que operem sobre o repo** — que é exatamente a convenção de `AGENTS.md`. |
| **Ataque de rede interna / movimento lateral** | Não há rede corporativa, VPN, domínio AD nem segmento interno a proteger. Ver [`NAC.md`](./NAC.md) e [`ZTNA.md`](./ZTNA.md). |
| **Exfiltração por endpoint administrativo** | Não existe painel administrativo nem rota de admin no código (11 rotas de API, todas de leitura pública ou de escrita do próprio titular). |
| **Ataque de insider com privilégio de DBA** | Não há DBA distinto — o projeto tem um operador. O risco de insider **coincide** com T3/E2 e é tratado ali. |
| **Ransomware em infraestrutura própria** | Não há infraestrutura própria; o pior caso equivalente é a perda/perversão do banco (D5, T2). |
| **Physical security / roubo de dispositivo** | Fora do escopo de um projeto sem sede nem equipamento corporativo. **Não verificado** se há política de dispositivo do operador. |
| **Supply chain de pacote npm malicioso** | Mitigado parcialmente por `npm ci` + lockfile e por `npm audit` registrado em `AVALIACAO_ALTERNATIVAS.md` §2.7. Não há Dependabot/Renovate nem SBOM (**não verificado**). Risco existente porém **genérico** — não é específico deste projeto. |

---

## 6. Cobertura do modelo e lacunas de verificação

| Área | Coberto? |
|---|---|
| Superfície HTTP da aplicação (rotas, middleware, auth) | ✅ Lida linha a linha |
| Modelo de dados e dados sensíveis | ✅ Schema lido integralmente |
| Pipelines de CI/CD | ✅ 4 workflows lidos |
| Postura de infraestrutura gerenciada (Supabase/Vercel) | ⚠️ **Parcial** — depende de configuração no painel, que este modelo **não verifica**: se RLS está desligado, quais roles Postgres existem, se há IP allowlist, se os logs de auditoria do Supabase estão ativos |
| Segredos efetivamente configurados na Vercel | ⚠️ **Não verificado** (`AUDITORIA_PRODUCAO.md` §0.2 registra "23 variáveis manuais, 0 geridas pela integração", mas a lista não está no repositório) |
| Rotação de credenciais | ❌ **Não verificado / inexistente** |
| Modelo de ameaça de terceiros (Vercel, Supabase, GitHub) | ❌ Fora do escopo — confiança contratual, não técnica |

**Revisão recomendada:** a cada mudança que (a) adicione rota de escrita,
(b) adicione subprocessador, (c) introduza LLM/agente, ou (d) amplie a coleta de
dados de usuário. Nenhuma dessas quatro aconteceu desde a redação inicial.
