# COMPLIANCE — LGPD, publicidade de dados públicos e linguagem jurídica

**Projeto:** Currículo Político (`curriculopolitico.org`) · **Licença do código:** AGPL-3.0-only
**Última revisão deste documento:** 2026-10-12
**Documento normativo de referência:** [`RIPD.md`](./RIPD.md) (Relatório de Impacto à Proteção de Dados Pessoais, v1.1)
**Controlador:** ENDART Studios — identidade empresarial formal **pendente de constituição** (registrado no RIPD §cabeçalho)

> **Como ler este documento.** Ele consolida o que está **implementado em código**
> e o que é **compromisso documental ainda sem controle técnico**. Onde não foi
> possível verificar lendo o repositório, está escrito **não verificado**. Este
> arquivo **não substitui** o RIPD nem parecer jurídico.

---

## 1. Dois universos de dados que não se misturam

O projeto trata duas categorias de dados com naturezas jurídicas distintas. A
separação não é retórica: ela está no schema do banco.

| | **Universo A — agentes públicos** | **Universo B — usuários da plataforma** |
|---|---|---|
| Quem | Políticos, partidos, ministros do STF, políticos históricos | Pessoas que criam conta |
| Dado | Nome, mandato, partido, votações nominais, presenças, autorias, CEAP, patrimônio declarado, registros jurídicos oficiais | E-mail, senha (hash), nome opcional, **opinião política** (voto FAVOR/CONTRA em projetos), solicitações de retificação |
| Origem | Fontes oficiais públicas (Câmara, Senado, TSE, TCU) | Coleta direta do titular |
| Modelos Prisma | `Person`, `Term`, `Party`, `Office`, `Bill`, `BillAuthorship`, `LegislativeAction`, `SessionAttendance`, `CampaignFinance`, `PatrimonyHistory`, `PoliticianCost`, `LegalRecord`, `Score`, `ScoreSnapshot`, `Stf*`, `HistoricalPolitician`, `VerifiedClaim`, `MunicipalExpense` | `User`, `Account`, `Session`, `UserBillVote`, `RetificationRequest` |
| Base legal dominante | LAI (Lei 12.527/2011) + CF/88 Art. 37 + LGPD Art. 7º §4º | LGPD Art. 7º, I (consentimento) e **Art. 11, I** (dado sensível) |
| Fonte da verdade | [`apps/web/prisma/schema.prisma`](../../apps/web/prisma/schema.prisma) | idem |

**Regra estrutural:** `UserBillVote` (Universo B) **não participa** de
`calculateIDIP` nem de qualquer agregação de `Score` (Universo A). A votação
popular é camada de engajamento; ela **nunca altera a nota**. Isso é uma
garantia de neutralidade algorítmica e, ao mesmo tempo, uma medida de
minimização: o dado sensível não influencia nenhuma decisão automatizada sobre
terceiros.

---

## 2. Base legal por operação de tratamento

Tabela derivada do RIPD §2 e conferida contra o schema e as rotas reais.

| # | Operação | Dados | Base legal | Onde está no código |
|---|---|---|---|---|
| 1 | Publicação de dados públicos de agentes políticos | Nome, mandato, partido, votações, presenças, autorias, CEAP, patrimônio, registros jurídicos oficiais | LAI Art. 7º/8º + CF/88 Art. 37 (publicidade) + LGPD Art. 7º §4º (dado tornado manifestamente público) | `apps/web/prisma/schema.prisma` (`Person`, `Term`, `LegalRecord`…) |
| 2 | Tratamento analítico próprio (IDIP) | Derivados da operação 1 (notas, faixas de confiabilidade, snapshots) | LGPD Art. 7º §4º e Art. 10 (finalidade de interesse público); dados manifestamente públicos | [`packages/idip/src/scoring.ts`](../../packages/idip/src/scoring.ts), `Score`, `ScoreSnapshot` |
| 3 | Conta de usuário | E-mail, hash bcrypt da senha, nome opcional, versão+data do aceite | LGPD Art. 7º, I — **consentimento em clickwrap versionado** | [`api/auth/register/route.ts`](../../apps/web/src/app/api/auth/register/route.ts), [`lib/consent.ts`](../../apps/web/src/lib/consent.ts) |
| 4 | **Votação popular (dado sensível)** | FAVOR/CONTRA por projeto, vinculado à conta | LGPD **Art. 11, I — consentimento específico e destacado** | [`api/consent/route.ts`](../../apps/web/src/app/api/consent/route.ts), [`api/bills/[id]/vote/route.ts`](<../../apps/web/src/app/api/bills/[id]/vote/route.ts>) |
| 5 | Segurança e antifraude | IP e/ou id de usuário em memória (rate limiting), idade da conta | LGPD Art. 7º, IX — legítimo interesse | [`apps/web/src/middleware.ts`](../../apps/web/src/middleware.ts) (Token Bucket), `MIN_AGE_MS` na rota de voto |
| 6 | Canal de direitos do titular | Nome, e-mail, conteúdo da solicitação, URL de origem | LGPD Art. 18 — cumprimento de obrigação legal | `RetificationRequest`, [`api/retificacao/route.ts`](../../apps/web/src/app/api/retificacao/route.ts) |
| 7 | Monitoramento de erros | Stack traces | **Condicional** — dormente sem DSN (ver §6) | [`instrumentation.ts`](../../apps/web/src/instrumentation.ts) |

### 2.1 O que **não** é tratado

Nenhum CPF, endereço, telefone, dado de familiar, dado de saúde, biometria,
religião, origem racial ou geolocalização precisa é coletado. Preferências de
afinidade ficam **exclusivamente no `localStorage` do navegador** — não há
model Prisma correspondente (o antigo `UserAffinity` foi removido do schema;
ver `AUDITORIA_JURIDICA_2_RESPOSTA.md`, achado P1-06).

> **Nota de precisão sobre CPF.** O CPF **aparece nas fontes oficiais** (a API
> da Câmara devolve `cpf` do deputado; as listas do TCU identificam por CPF; o
> TSE publica `NR_CPF_CANDIDATO`). Se e quando o ETL de integridade for ligado,
> o CPF deve ser usado **apenas em memória** para casamento determinístico e
> **descartado antes de gravar** — nunca persistido nem exibido. Isso está
> descrito em `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5.2 e §7.5
> como requisito, **não** como algo já implementado: hoje `LegalRecord` está
> vazio (`count = 0`).

---

## 3. Direitos do titular — o que existe de fato

| Direito (LGPD Art. 18) | Como é atendido | Evidência no código |
|---|---|---|
| Confirmação e acesso | Painel da própria conta; solicitação via `/retificacao` | [`app/retificacao/page.tsx`](../../apps/web/src/app/retificacao/page.tsx) |
| Correção / retificação | Canal público com **protocolo rastreável** (`RET-AAAA-XXXXXX`); consulta de status por protocolo + e-mail | [`api/retificacao/route.ts`](../../apps/web/src/app/api/retificacao/route.ts) L16–23, L90–113 |
| Eliminação (Art. 18, VI) | `DELETE /api/account` apaga `User` e, em cascata, `UserBillVote`, `Session`, `Account` | [`api/account/route.ts`](../../apps/web/src/app/api/account/route.ts) L28 |
| Revogação de consentimento (Art. 8º §5) | `DELETE /api/consent` grava `politicalConsentWithdrawnAt` e **elimina todos os votos** em uma única transação | [`api/consent/route.ts`](../../apps/web/src/app/api/consent/route.ts) L50–57 |
| Portabilidade | **Não implementado** — não há endpoint de exportação de dados do titular | — |
| Informação sobre compartilhamento | Política de Privacidade com tabela de retenção e de transferência internacional | **não verificado neste repositório** (documento publicado no site, não no repo) |
| Oposição | Atendida pela via de revogação e de exclusão | idem acima |

**Prazos compromissados.** O RIPD §5 e `AUDITORIA_JURIDICA_2_RESPOSTA.md`
(P1-08) registram: retificação com resposta em **72 h úteis para agentes
políticos**; incidentes comunicados a titulares e ANPD em **3 dias úteis**;
requisições do Art. 19 em **15 dias**; exclusão de conta **imediata ou no
máximo 30 dias**. Esses prazos são **compromissos documentais** — não há
automação de SLA, alerta de vencimento nem fila de atendimento no código.

---

## 4. Consentimento versionado

Fonte única de verdade: [`apps/web/src/lib/consent.ts`](../../apps/web/src/lib/consent.ts).

```ts
export const TERMS_VERSION = "2026-09-30";
export const PRIVACY_VERSION = "2026-09-30";
export const POLITICAL_CONSENT_VERSION = "2026-09-30";
```

| Mecanismo | Onde | O que grava |
|---|---|---|
| Clickwrap de Termos + Privacidade (cadastro por credenciais) | `api/auth/register/route.ts` L49–57, L83–84 | `User.termsVersion` + `User.termsAcceptedAt` |
| Clickwrap em OAuth (primeiro login) | [`lib/auth.ts`](../../apps/web/src/lib/auth.ts) callback `signIn` L46–56 | `termsVersion` + `termsAcceptedAt` quando ainda nulos |
| Declaração de maioridade (18+) | `api/auth/register/route.ts` L58–66 | Recusa cadastro sem `adult` |
| **Consentimento específico de opinião política** | `POST /api/consent` | `politicalConsentVersion` + `politicalConsentAt` |
| Gate no servidor | `api/bills/[id]/vote/route.ts` L131–142 | `403 CONSENT_REQUIRED` sem consentimento ativo |

**Ponto de atenção real:** a mudança de versão em `lib/consent.ts` **não
invalida consentimentos anteriores automaticamente**. O aceite antigo continua
gravado, e o gate de voto olha apenas `politicalConsentAt`/`WithdrawnAt` via
`consentimentoPoliticoAtivo()` — **não compara a versão vigente**. Ou seja: se
`POLITICAL_CONSENT_VERSION` for incrementado por mudança substancial, usuários
com o aceite antigo **seguem votando sem novo aceite**, salvo se uma migration
ou job zerar os campos. Isso é uma lacuna de implementação, não uma decisão
documentada. Recomendação: gate que exija
`politicalConsentVersion === POLITICAL_CONSENT_VERSION`.

> O anexo `docs/ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md` §2.5 propõe
> uma tabela `ConsentRecord` *append-only* com `documentHash` (SHA-256 do texto
> aceito) — hoje o aceite é um par de campos no `User`, sem registro histórico
> imutável e **sem hash do texto aceito**. É uma lacuna de prova (prova-se "que
> horas aceitou", não "exatamente o quê").

---

## 5. Retenção

| Dado | Retenção | Mecanismo | Status |
|---|---|---|---|
| `UserBillVote` (dado sensível) | **Eliminação imediata** na revogação de consentimento ou na exclusão da conta | `DELETE /api/consent`, `DELETE /api/account` (cascade) | ✅ Implementado |
| `User`, `Session`, `Account` | Enquanto a conta existir; eliminados a pedido | `onDelete: Cascade` + `DELETE /api/account` | ✅ Implementado |
| `RetificationRequest` | **Não definida** — sem TTL, sem rotina de expurgo | — | ⚠️ Lacuna |
| Dados públicos de agentes (Universo A) | Indefinida (dado histórico de interesse público) | — | Decisão registrada no RIPD §2 |
| Snapshots históricos (`ScoreSnapshot`) | Indefinida (série temporal do índice — é o produto) | `@@unique([termId, snapshotDate])` | Decisão de produto |
| Logs de rate limiting | Em memória, expurgados após 2 janelas (120 s) acima de 5.000 chaves | `expurgar()` em `middleware.ts` L70–76 | ✅ Implementado |
| Erros (Sentry) | 30 dias no plano Developer | — | **Dormente** — sem DSN |

> **Retenção de `RetificationRequest` é a lacuna mais concreta.** A tabela
> guarda nome, e-mail e o texto livre da solicitação (que pode conter dado
> sensível do próprio reclamante ou de terceiro) **sem prazo de expurgo
> definido**. Definir prazo e implementar expurgo é ação pendente.

---

## 6. Subprocessadores e transferência internacional

| Fornecedor | Papel | Dados | Residência | Status |
|---|---|---|---|---|
| **Supabase** | Postgres gerenciado | Todo o banco, incluindo votos | `sa-east-1` (São Paulo, BR) | Em uso |
| **Vercel** | Hospedagem (Hobby), região `gru1` | Tráfego, logs de runtime (1 h no Hobby) | EUA (empresa); funções em São Paulo | Em uso — **SCCs não assinadas** |
| **Sentry** | Error tracking | Stack traces | EUA/UE escolhido na criação | **Dormente** — `SENTRY_DSN` ausente |
| **GitHub Actions** | Cron (snapshot mensal, smoke 6h) | Recebe `secrets.DATABASE_URL` | EUA | Em uso |
| **Resend / Upstash / Turnstile** | E-mail, rate limit distribuído, captcha | — | — | **Recomendados, não adotados** |

**Pendência registrada no RIPD §6.2:** formalização contratual das Cláusulas
Contratuais Padrão (Res. CD/ANPD nº 19/2024) com Vercel e Sentry. Ressalva do
RIPD: ADF/DPF **não** equivale a decisão de adequação da ANPD.

---

## 7. Linguagem jurídica estrita e publicidade de atos processuais

Esta é a obrigação de compliance que mais expõe o projeto — e a que tem regra
de produto explícita em [`AGENTS.md`](../../AGENTS.md) (regra 1) e em
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) §3.

### 7.1 Vocabulário permitido e proibido

| ✅ Permitido | ❌ Proibido |
|---|---|
| "Réu em Ação Penal" | "criminoso", "bandido", "corrupto" |
| "Condenação Transitada em Julgado" | "crime" sem trânsito em julgado |
| "Consta na lista oficial X do TCU em DD/MM/AAAA, com trânsito em julgado em DD/MM/AAAA" | "condenado por corrupção" (quando a decisão não diz isso) |
| "Contas rejeitadas" / "contas julgadas irregulares" | "inelegível" (só a Justiça Eleitoral declara) |
| "processo em tramitação — sem decisão definitiva" | Qualquer juízo moral sobre a pessoa |

O enum `LegalStatus` do schema já reflete esse vocabulário controlado:
`INVESTIGATION`, `LAWSUIT`, `CRIMINAL_ACTION`, `CONDEMNATION`, `IMPEACHMENT`,
`CLEARED`, `ACCOUNTS_REJECTED` — e `LegalRecord.status` distingue `"ATIVO"`,
`"ARQUIVADO"`, `"TRANSITADO_EM_JULGADO"`.

### 7.2 Ocultação automática de registros não definitivos

**Compromisso:** registros **arquivados** ou **absolvidos** são ocultados
automaticamente; apenas decisões com **trânsito em julgado** pontuam.
Pressuposto constitucional: CF/88 Art. 5º, LVII (presunção de inocência).

**Status de verificação:** com `LegalRecord = 0` registros em produção
(confirmado em `AVALIACAO_ALTERNATIVAS.md` §2.5 e `AUDITORIA_PRODUCAO.md` §0.7),
a regra **não está exercitada por dado real**. Consequência prática registrada
na auditoria: a dimensão Integridade (25%, o maior peso do IDIP) permanece em
**baseline neutro 50** e **as travas de integridade nunca disparam**.

### 7.3 Risco de homonímia — o maior risco jurídico do projeto

Se o ETL de integridade for ligado casando pessoas **por nome**, o resultado
são **falsos positivos** que atribuem a um parlamentar um registro de outra
pessoa. Isso é risco de difamação (CP arts. 138–140; CC arts. 186, 187, 927).
As mitigações **exigidas** (anexo de fontes, §5.2 e §7.5) e **ainda não
implementadas**:

1. Casamento por **CPF** (via TSE/Câmara), determinístico — nunca similaridade de nome isolada.
2. Na ausência de CPF, exigir **≥ 2 atributos independentes** concordantes.
3. Limiar: **≥ 0,95** automático; **0,88–0,95** com revisão humana.
4. Registrar `matchMethod` e `matchScore` para auditoria.
5. *Soft delete* + histórico para nomes que **saem** das listas do TCU (a lista
   eleitoral é atualizada **diariamente** até 18/12/2026 — nomes entram e saem).
6. **Tolerar falso negativo em vez de falso positivo.**

### 7.4 Travas de integridade e o teto de nota

O motor aplica teto de **39.9** para condenação transitada em julgado,
impeachment, inelegibilidade ou contas rejeitadas — coberto por
`npm run verify:scoring`. Como as travas dependem de `LegalRecord`, hoje **o
teto não é alcançável por dado real**; ele é testado apenas por caso sintético.

---

## 8. Direito de resposta — canal de retificação

**Existe e é público, sem login** (o titular pode não ter conta): página
[`/retificacao`](../../apps/web/src/app/retificacao/page.tsx) + API
[`POST/GET /api/retificacao`](../../apps/web/src/app/api/retificacao/route.ts).

| Característica | Estado |
|---|---|
| Acesso sem autenticação | ✅ (decisão de projeto: titular pode ser terceiro) |
| Protocolo rastreável | ✅ `RET-{ano}-{6 chars}` gerado com `crypto.getRandomValues` (alfabeto sem caracteres ambíguos) |
| Validação de entrada | ✅ nome ≥ 3 chars, e-mail com regex, descrição ≥ 20 chars |
| Tipos de alvo | ✅ `POLITICO` / `USUARIO` / `OUTRO` |
| Ciclo de vida | ✅ `RECEBIDO → EM_ANALISE → CONCLUIDO → DEFERIDO/INDEFERIDO` |
| Consulta de status | ✅ por protocolo + e-mail (comparação `insensitive` no protocolo) |
| Notificação ao solicitante | ❌ **Impossível hoje** — não há serviço de e-mail transacional (RIPD §6.5) |
| SLA / fila / alerta | ❌ Nenhum |
| `changelog` público de retificações | ❌ Não existe |
| Rate limiting específico | ⚠️ Usa o tier **geral** (60 req/min), não o crítico — ver [`THREAT_MODELING.md`](./THREAT_MODELING.md) |
| Verificação de posse do e-mail | ❌ Qualquer pessoa que saiba protocolo + e-mail consulta; quem **possui** o e-mail não é comprovado |

> ⚠️ **Sem serviço de e-mail, o canal de retificação não fecha o ciclo.** O
> protocolo é gerado e armazenado, mas o solicitante **não recebe confirmação**
> e o controlador **não recebe notificação**. Na prática, o canal depende de
> alguém consultar o banco manualmente. Um canal de direito de resposta que não
> responde é pior do que a ausência dele do ponto de vista de fiscalização.

---

## 9. Controles de segurança com efeito de compliance

| Controle | Onde | Limitação real |
|---|---|---|
| CSP estrita (`default-src 'self'`, `frame-ancestors 'none'`) | `middleware.ts` L100–112, L142 | `script-src` inclui `'unsafe-inline'` e `'unsafe-eval'` — necessário para o runtime do Next, **reduz o valor da CSP contra XSS** |
| Headers `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` | `middleware.ts` L143–149 | ✅ Ativos (verificado em produção — `AUDITORIA_PRODUCAO.md` §4) |
| HSTS | Camada Vercel (default) | Não definido no repositório |
| Senhas com bcrypt | `api/auth/register/route.ts` L76 — `bcrypt.hash(password, 10)` | **Cost 10**, abaixo do ≥ 12 recomendado no anexo de auth |
| Sessão por cookie `__Secure-next-auth.session-token` | `lib/auth.ts` (`strategy: "jwt"`) | ✅ em https |
| Rate limiting | `middleware.ts` | ⚠️ **Em memória, por instância** — não é teto global (ver `THREAT_MODELING.md`) |
| MFA | — | ❌ Não existe — ver [`MFA.md`](./MFA.md) |
| RLS no Postgres | — | ❌ Não configurado — ver [`RLS.md`](./RLS.md) |
| Verificação de e-mail | — | ❌ Bloqueada por ausência de serviço de e-mail |

---

## 10. Licenciamento e propriedade intelectual

| Ativo | Licença | Arquivo |
|---|---|---|
| Código | **AGPL-3.0-only** | [`LICENSE`](../../LICENSE), `"license"` em [`package.json`](../../package.json) |
| Documentação | **CC BY 4.0** | Declarado no README §Licenças |
| Dados de terceiros | Conforme a fonte (LAI, dados abertos Câmara/Senado/TSE, CC-BY no Querido Diário) | Registrar por fonte no ETL |

**Implicação da AGPL:** quem operar versão modificada como serviço de rede deve
oferecer o código-fonte correspondente aos usuários. Isso é coerente com o
propósito de transparência e **não** impede o uso do DataJud (CNJ) — mas note
que o **Termo de Uso do DataJud restringe uso comercial e exige dar ciência ao
CNJ de publicações derivadas**. O projeto atualmente **não usa DataJud**
(descartado por não trazer nomes de partes nem cobrir o STF).

---

## 11. Pendências de compliance (ordenadas por risco)

| # | Pendência | Risco | Bloqueio |
|---|---|---|---|
| 1 | **Verificação de e-mail antes de votar** | Conta descartável vota dado sensível; identidade frágil | Serviço de e-mail inexistente (RIPD §6.5) |
| 2 | **Backup não existe** — e o RIPD §4 afirma "backups Supabase" | Perda total de dados + afirmação incorreta em documento de compliance | Ver [`BACKUP_DR.md`](../06-devops-deployment/BACKUP_DR.md) |
| 3 | **Senha bcrypt cost 10** | Custo de quebra menor que o recomendado | Nenhum — troca é trivial (re-hash no próximo login) |
| 4 | **Gate de versão de consentimento** | Aceite antigo continua válido após mudança de versão | Nenhum |
| 5 | **Retenção de `RetificationRequest` indefinida** | Retenção sem finalidade + dado sensível em texto livre | Definição do controlador |
| 6 | **Canal de retificação sem notificação** | Direito do titular atendido de forma incompleta | Serviço de e-mail |
| 7 | **SCCs não assinadas** (Vercel, Sentry) | Transferência internacional sem salvaguarda formalizada | Ação contratual |
| 8 | **Revisão jurídica humana** de Termos, Política e RIPD antes de campanha | Texto jurídico sem validação profissional | Contratação |
| 9 | **Nome isolado nunca pontua** (regra de homonímia) | Difamação por falso positivo | ETL de integridade não implementado (mitigação preventiva: manter desligado) |
| 10 | **`LegalRecord = 0`** | Integridade em baseline 50; travas nunca disparam com dado real | Fontes: TCU tem API pública; STF depende de LAI |

---

## 12. Referências no repositório

- [`RIPD.md`](./RIPD.md) — relatório de impacto, riscos e pendências formais
- [`AUDITORIA_JURIDICA_2_RESPOSTA.md`](./AUDITORIA_JURIDICA_2_RESPOSTA.md) — resposta achado a achado a 1 P0 + 9 P1 + 4 P2
- [`THREAT_MODELING.md`](./THREAT_MODELING.md) — STRIDE sobre os ativos reais
- [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) — severidades, papéis, comunicação à ANPD
- [`VULNERABILITY_DISCLOSURE.md`](./VULNERABILITY_DISCLOSURE.md) — política proposta (canal ainda não publicado)
- [`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md`](../ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md) — viabilidade jurídica das fontes de integridade
- [`docs/ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md`](../ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md) — e-mail, auth, rate limit e observabilidade com LGPD
