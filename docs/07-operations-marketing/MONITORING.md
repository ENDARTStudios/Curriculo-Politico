# Monitoramento e observabilidade

O que existe, o que ele cobre de fato, e o que falta. Cada item abaixo foi
verificado no repositório; onde não foi, está escrito **não verificado**.

Documentos relacionados: [ERROR_HANDLING.md](ERROR_HANDLING.md) (o que fazer quando
falha), [ANALYTICS.md](ANALYTICS.md) (uso e resultado — **não existe**),
[PERFORMANCE.md](PERFORMANCE.md) (medições pontuais),
[TASKS.md](../03-development-process/TASKS.md) (as lacunas).

## 1. Inventário do que existe

| Mecanismo | O que cobre | Frequência | Onde está definido |
|---|---|---|---|
| **Smoke de produção** (`curl`) | Disponibilidade + **presença de dado** em 5 pontos | A cada **6h** + manual | `.github/workflows/production-smoke.yml` |
| **Suíte de a11y/SEO contra produção** | Acessibilidade WCAG 2.2 AA, SEO e funil | A cada **6h** (30 min após o smoke) + manual | `.github/workflows/a11y.yml` |
| **CI** | Tipos, motores IDIP/identidade, build | Push em `main` e **todo PR** | `.github/workflows/ci.yml` |
| **Snapshot mensal** | Integridade dos scores ao longo do tempo + verificação | Dia 1, 03:00 UTC | `.github/workflows/monthly-snapshot.yml` |
| **`/status`** | Volumes do banco e último snapshot, ao vivo | A cada acesso (página dinâmica) | `apps/web/src/app/status/page.tsx` |
| **Sentry** | Exceções de servidor, edge e cliente | Contínuo — **⚠️ dormente sem DSN** | `apps/web/src/instrumentation.ts`, `instrumentation-client.ts`, `global-error.tsx` |
| **UptimeRobot** | Uptime da URL, intervalo de 5 min | 🟡 requer `UPTIMEROBOT_API_KEY`; script existe, **não verificado** se está ativo | `apps/pipeline/scripts/uptimerobot-monitor.ts` |

**O que não existe:** nenhuma ferramenta de APM, nenhum painel interno de métricas,
nenhum alerta por e-mail/Slack, nenhuma medição de Core Web Vitals reais, nenhum
log estruturado, nenhuma instrumentação de erro sem Sentry.

## 2. Smoke de produção — o mecanismo mais valioso que existe

`.github/workflows/production-smoke.yml`, cron `0 */6 * * *`. Cinco verificações por
`curl` contra `vars.PROD_URL` (default `https://www.curriculopolitico.org`):

| # | Verificação | Critério |
|---|---|---|
| 1 | Home responde | `HTTP 200` |
| 2 | `/ranking` responde | `HTTP 200` |
| 3 | `GET /api/search?q=lula` | `total >= 1` |
| 4 | `GET /api/rankings?limit=5` | `len(ranking) >= 1` |
| 5 | `/status` | corpo **não** contém a string `"Indisponível"` |

**Por que 3 e 4 são os mais valiosos:** eles verificam **dado**, não disponibilidade.
Uma página que responde 200 com o banco vazio passaria nos testes 1 e 2 — e falharia
nesses. É o único mecanismo do projeto que detecta "o site está de pé mas a
plataforma não funciona".

**Por que 5 funciona:** a `/status` renderiza "Indisponível" em `text-red-300` quando
a contagem de parlamentares falha (`bancoOk === false`). O smoke procura essa string
no HTML. É um acoplamento deliberado entre o teste e o texto da página — **e é
frágil**: renomear o rótulo "Indisponível" em `/status` quebra o smoke sem que nada
esteja errado. Isso não está documentado no workflow.

**Limite:** é verificação **periódica**, não contínua. Uma indisponibilidade de 20
minutos entre execuções **não é detectada** por este mecanismo (seria pelo
UptimeRobot, se estiver ativo).

**Uso de `www` é deliberado:** o apex responde 308 e o teste não valida redirects.

## 3. `/status` — observabilidade visível ao público

`apps/web/src/app/status/page.tsx` é uma página **pública** que mede volumes vivos:

| Métrica exibida | Consulta |
|---|---|
| Banco de dados | derivado: `person.count()` funcionou? |
| Parlamentares na base | `person.count()` com filtro de `seed-*` |
| Notas IDIP calculadas | `score.count()` |
| Scores com custo real | `score.count({ costEfficiencyScore: { not: null } })` |
| Registros de CEAP | `politicianCost.count({ category: "CEAP", amount: { gt: 0 } })` |
| Proposições catalogadas | `bill.count()` |
| Votos nominais | `legislativeAction.count()` |
| Autorias legislativas | `billAuthorship.count()` |
| Presenças em sessões | `sessionAttendance.count()` |
| Último snapshot mensal | `scoreSnapshot.findFirst(orderBy: snapshotDate desc)` |
| Checagens de agências | `verifiedClaim.count()` |

### O desenho de falha é correto

Cada consulta passa por um helper `medir(fn)` que devolve `null` em erro. Consequência:

| Caso | Comportamento |
|---|---|
| Banco totalmente fora | `bancoOk = false` → cabeçalho muda para "Status: degradado", ponto âmbar pulsante, "Banco de dados: Indisponível" em `text-red-300` |
| Uma métrica falha isolada | Aquela linha mostra `—` (`item.valor ?? "—"`) e a página fica degradada |
| Tudo ok | "Status: operacional", ponto esmeralda |

**A página nunca quebra por causa do banco** — é o mesmo contrato de
[ERROR_HANDLING.md](ERROR_HANDLING.md) §3.

### A lacuna: texto fixo misturado com medição

O rodapé da página afirma estado de fontes externas em **texto fixo**, não medido:

> *"Monitoramento externo de uptime é executado por serviço independente
> (UptimeRobot). Câmara, Senado, TSE e Querido Diário estão acessíveis — seus
> pipelines podem ser reexecutados a qualquer momento. A coleta jurídica segue
> pendente: as listas públicas do TCU já foram localizadas, e o STF não expõe dados
> abertos automatizáveis (depende de pedido via LAI)."*

Misturar medição ao vivo com afirmação estática na mesma tela é o defeito: o leitor
não distingue o que foi verificado do que foi escrito. O caso concreto já
registrado no projeto é que essas afirmações **estavam erradas** (diziam que TSE e
Querido Diário estavam bloqueados quando ambos respondiam 200).

Também **não verificado**: se o UptimeRobot está de fato ativo. A afirmação está no
texto da página, mas `UPTIMEROBOT_API_KEY` não aparece definida nos arquivos `.env`
do repositório — o script existe para **criar** o monitor, e não há registro de
execução em produção.

Registrado como T-05.

## 4. Sentry — instrumentado e **dormente**

O código está completo. O que falta é o DSN.

### Server / edge — `apps/web/src/instrumentation.ts`

```ts
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;                                   // dormente
  const Sentry = await import("@sentry/nextjs");      // import dinâmico
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,                            // 10% das transações
  });
}

export async function onRequestError(...args) {
  const dsn = /* ... */;
  if (!dsn) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);                        // erros de request
}
```

### Browser — `apps/web/src/instrumentation-client.ts`

Mesmo padrão: guarda `if (dsn)`, import dinâmico, `tracesSampleRate: 0.1`.
O Next 15.3+ auto-carrega esse arquivo.

### Fronteira de erro — `apps/web/src/app/global-error.tsx`

Captura falhas de **render no cliente** e as envia antes de oferecer recuperação —
ver [ERROR_HANDLING.md](ERROR_HANDLING.md) §2.

### O que "dormente" significa na prática

| Sem DSN | Com DSN |
|---|---|
| O SDK **não entra no bundle** (import dinâmico) | SDK carregado sob demanda |
| Zero custo de performance | `tracesSampleRate: 0.1` — 10% das transações |
| Nenhuma exceção é capturada | Exceções de servidor, edge, request e cliente |
| `catch {}` nas rotas não deixa rastro | Ainda não deixaria: o `catch` não tem binding e não reporta nada |

**O último ponto é o mais importante e frequentemente esquecido:** ativar o Sentry
**não** faz `catch {}` reportar. Cinco rotas de API engolem a exceção sem binding
([ERROR_HANDLING.md](ERROR_HANDLING.md) §6) — o Sentry só captura o que chega até
`onRequestError` ou `global-error`, e uma exceção capturada e descartada não chega.
**Ativar o Sentry e corrigir os `catch {}` são tarefas independentes** (T-07 e T-08).

### Ativação (R9, US$ 0)

1. Criar o projeto no Sentry (plataforma Next.js).
2. Definir `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` na Vercel.
3. Redeployar.

**Revisar LGPD antes:** a avaliação do projeto recomenda `sendDefaultPii: false` e
`beforeSend` com **denylist**. O RIPD registra Sentry como operação **condicional**
(categoria "Monitoramento de erros": stack traces, com disclosure na Política de
Privacidade §5). O `.env.example` também documenta as duas variáveis como
"opcional, no-op sem DSN".

**Pendência correlata:** SCCs (Standard Contractual Clauses) de Vercel e Sentry
**não assinados**, registrado como P1-03 em
`docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md`. Ativar o Sentry
adiciona um processador de dados sem o contrato formalizado.

## 5. UptimeRobot

`apps/pipeline/scripts/uptimerobot-monitor.ts` cria um monitor na **API v2** do
UptimeRobot:

| Parâmetro | Valor |
|---|---|
| `friendly_name` | `Currículo Político — Home` |
| `url` | `process.argv[2] ?? "https://curriculopolitico.org"` |
| `type` | `1` (HTTP(S)) |
| `interval` | **300 s (5 min)** |
| Requisito | `UPTIMEROBOT_API_KEY` (tipo "Main") |

Sem a chave, o script **sai com exit 1** e mensagem orientando a criá-la. O
`.env.example` lista `UPTIMEROBOT_API_KEY` como comentada/opcional.

**Duas observações verificáveis:**

1. O default do script é o **apex** (`curriculopolitico.org`), que responde **308**
   para `www` — os workflows evitam o apex de propósito, mas o script de uptime não.
   Um monitor configurado assim conta redirects como disponibilidade, o que é
   aceitável para uptime mas não valida a página.
2. **Não há registro** — em `.env`, em documentação ou em workflow — de que o monitor
   foi efetivamente criado, nem de qual intervalo está em vigor. **Não verificado.**

## 6. Snapshot mensal

`.github/workflows/monthly-snapshot.yml`, cron `0 3 1 * *` (dia 1, 03:00 UTC /
00:00 BRT):

1. `npm ci` + `prisma generate`
2. `npm run db:snapshot` com `secrets.DATABASE_URL` — idempotente
3. `npx tsx apps/pipeline/scripts/verify-snapshot.ts` — **verificação como passo
   separado**, portanto falha não silenciosa

É o único mecanismo de **integridade histórica**: garante que a série temporal do
IDIP não tem buraco. Também é um dos que **consomem egress** (§7).

Defeito já corrigido: snapshots formatados em fuso local exibiam o **mês errado**
(commit `e76f5b0`, "fix: formata snapshots em UTC").

## 7. O que **falta** — em ordem de risco

| # | Lacuna | Risco concreto |
|---|---|---|
| 1 | **Sentry sem DSN** | Nenhuma exceção de produção é registrada. Um erro de query é invisível até alguém reclamar (T-08) |
| 2 | **`catch {}` sem binding em 5 rotas + `hero-stats`/`sitemap`** | Mesmo com Sentry ativo, a causa não é capturada — o erro é descartado antes de chegar a qualquer coletor (T-07) |
| 3 | **Sem alerta.** O smoke falha **em silêncio** para humanos | O GitHub Actions registra a falha; **não há notificação** por e-mail/Slack. Ninguém é avisado às 3h da manhã |
| 4 | **Sem medição de Core Web Vitals reais** | Performance percebida é desconhecida (ver [PERFORMANCE.md](PERFORMANCE.md) §4) |
| 5 | **UptimeRobot não verificado como ativo** | Se não estiver, a única detecção de indisponibilidade é o smoke de 6h — janela de até 6h |
| 6 | **`/status` mistura medição com texto fixo** | Afirmação sobre fonte externa pode estar errada sem ninguém notar (T-05) |
| 7 | **Sem rastreamento distribuído** (`tracesSampleRate` só existe quando há DSN) | Não se sabe **onde** o tempo é gasto num request lento. Foi exatamente o que dificultou o diagnóstico antes da correção de região |
| 8 | **Sem log estruturado** | `console.warn`/`console.error` vão para os logs da Vercel. Retenção no plano atual **não verificada**; sem agregação nem busca |
| 9 | **Sem monitoramento de egress/capacidade** | O recurso escasso do projeto (`5 GB/mês`) só é visível no painel do Supabase. Sem alerta de aproximação da cota (ver [PERFORMANCE.md](PERFORMANCE.md) §2) |
| 10 | **Sem verificação da cadeia de ETL** | Não há monitor que detecte "o ETL não roda há 3 meses". Os dados envelhecem silenciosamente |
| 11 | **Sem monitoramento de índice de busca** | Nenhum Search Console/Bing — não se sabe se a plataforma está indexada (ver [ANALYTICS.md](ANALYTICS.md) §3.1) |
| 12 | **Sem health check de API** | Não existe `/api/health`. O smoke contorna chamando `/api/rankings` e exigindo dado — funciona, mas não é um contrato |

### A lacuna que mais surpreende

**O item 3.** O projeto tem três mecanismos agendados que detectam problemas
(`production-smoke`, `a11y`, `monthly-snapshot`) e **nenhum deles notifica alguém**.
Uma falha no smoke fica registrada nas Actions e é descoberta quando alguém abre a
aba. Um gate que não avisa é um gate pela metade — o valor está na detecção, e a
detecção só vale se chegar a uma pessoa.

Um alerta simples (e-mail do GitHub Actions em falha de workflow agendado, ou um
canal de webhook) resolveria isso com custo próximo de zero. **Não foi encontrado
registro de que alguém tenha decidido não fazer isso.**

## 8. Observabilidade em LGPD

Toda ferramenta de observabilidade processa dados pessoais. Regras que qualquer
adição tem de respeitar:

| Regra | Origem |
|---|---|
| Sentry **condicional**, com disclosure na Política de Privacidade | `docs/05-security-compliance/RIPD.md` §5, operação 6 |
| `sendDefaultPii: false` e `beforeSend` com denylist ao ativar | `docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` §9 |
| Stack trace pode conter dado de usuário — não é inofensivo | RIPD, mesma operação |
| Nenhum instrumento pode reter IP sem base legal declarada | [ANALYTICS.md](ANALYTICS.md) §2 |
| SCCs de Vercel/Sentry **pendentes de assinatura** | P1-03 da auditoria jurídica |
| E-mail transacional **não** deve ser ativado sem rate limit compartilhado | `AVALIACAO_ALTERNATIVAS.md` §11 |

Correção de rota registrada no projeto:
`docs/ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md` traz nota no topo
informando que um "alerta que exige ação hoje" sobre CVEs do NextAuth estava
**incorreto** — o projeto já rodava `next-auth@4.24.15`.

## 9. Regras

1. **Detecção sem notificação é detecção pela metade.** Todo mecanismo agendado novo
   precisa definir **quem é avisado** e **como**.
2. **Nunca engula exceção.** `catch (erro)` com log — senão o Sentry não serve para
   nada.
3. **Não afirme estado de sistema em texto fixo.** Ou mede, ou remove a afirmação.
   Numa plataforma de transparência, errar sobre o próprio estado custa credibilidade.
4. **Observabilidade processa dado pessoal.** Passa por LGPD antes de entrar em
   produção.
5. **Meça o recurso escasso.** O egress é o gargalo do projeto; monitorá-lo vale mais
   que monitorar CPU.
6. **Não crie segundo painel de verdade.** `/status` é a fonte pública de estado;
   não duplique contagens em outro lugar.

## 10. Não verificado

- **Se o Sentry está ativo em produção.** O código está pronto e dormente; os
  arquivos `.env` do repositório não mostram DSN. Pode estar configurado apenas na
  Vercel — **não verificável daqui**.
- **Se o UptimeRobot está ativo**, com que intervalo e qual URL.
- **Retenção dos logs da Vercel** no plano atual.
- **Se alguém é notificado** quando um workflow agendado falha na prática
  (configuração de notificação do repositório no GitHub não é visível no código).
- **Se existe algum painel externo** (Supabase, Vercel) consultado informalmente pela
  equipe. Nenhum registro no repositório.
- **Se há alerta de cota** de egress configurado no Supabase.
- **Qualquer métrica de disponibilidade histórica** (uptime percentual): o projeto
  não mantém esse registro.
