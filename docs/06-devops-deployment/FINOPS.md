# FINOPS — Custos, cotas e eficiência de recursos

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Fonte dos números:** [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §2.2, §2.3, §2.4, §2.5, §5.1, §5.3, §6 — **medições e leitura de documentação oficial em 2026-10-12**
**Fonte da configuração:** [`apps/web/next.config.ts`](../../apps/web/next.config.ts), [`apps/web/vercel.json`](../../apps/web/vercel.json), [`apps/web/.env.example`](../../apps/web/.env.example), `.github/workflows/*.yml`

> **Regra deste documento:** todo número vem de medição ou de documentação
> oficial citada na avaliação de alternativas. O que dependia de página
> renderizada por JS e não pôde ser confirmado está marcado **não confirmado**
> no documento de origem — e é reproduzido assim aqui, em vez de estimado.

---

## 1. Custo atual: **US$ 0/mês**

| Serviço | Plano | Custo | O que entrega |
|---|---|---|---|
| **Vercel** | **Hobby** | **US$ 0** | Hospedagem Next.js 15, funções em `gru1` (São Paulo), CDN, middleware Edge |
| **Supabase** | **Free** | **US$ 0** | Postgres 16, `sa-east-1`, 500 MB de banco, **5 GB/mês de egress**, Supavisor pooling |
| **GitHub** | Free (repositório público) | **US$ 0** | Repositório, Actions (minutos generosos para repo público), secrets |
| **Google Cloud** (OAuth) | Free tier | **US$ 0** | Login social |
| **Domínio** `curriculopolitico.org` | — | **custo não verificado** (registro anual) | — |
| **UptimeRobot** | Free | **US$ 0** | Monitor de uptime (em uso, `npm run uptimerobot`) |
| **Sentry** | Developer (free) | **US$ 0** — **não ativado** | Instrumentado e dormente, falta o DSN |
| **Redis** | — | **US$ 0** — **não usado** | Previsto em `docker-compose.yml` (porta 16379), `REDIS_URL` comentado |

**Custo operacional real: US$ 0.** O custo do projeto é **tempo**, não dinheiro —
e é isso que torna a análise de FinOps aqui diferente da usual: o recurso
escasso **não é orçamento**, é **cota** (§2) e **atenção** (§7).

---

## 2. O recurso escasso: **egress do Supabase**

Esta é a descoberta central da avaliação de alternativas (§2.2) e o gargalo real
do plano gratuito — **mais que conexões**, ao contrário da intuição inicial.

| Medição | Valor |
|---|---|
| Dados devolvidos pelo banco em **cada** request de `/ranking` | **177 KB** |
| Cota do Supabase Free (**egress unificado**: banco + auth + storage + realtime) | **5 GB/mês** |
| `/ranking` sozinho com **28 mil visitas/mês** | **~5 GB — consome 100% da cota** |
| Com **100 mil visitas/mês** (só `/ranking`) | **~17,7 GB — 3,5× a cota** |
| Tamanho do banco | **98 MB** (limite Free: **500 MB**) |
| Maior tabela | `SessionAttendance` — **53 MB**, 166.825 linhas |

### 2.1 Nuance que muda a prioridade

O consumo **não vem só das visitas ao site**. Também contam:

- **Cada `createMany` em lote do ETL** rodando da máquina local;
- **Cada dump do ETL**;
- **Backups manuais pelo pooler** (a documentação oficial confirma que contam como egress);
- Migrações e consultas ad-hoc.

**Sem esse número separado por origem, não há decisão econômica defensável.** A
recomendação da avaliação é explícita: *instrumentar o egress como recurso
escasso* e descobrir quanto vem de página pública e quanto vem do ETL local.
**Isso ainda não foi feito.**

### 2.2 O que acontece ao estourar (e por que é pior que uma fatura)

> *"The Hobby plan does not have pay-as-you-go — ao estourar uma cota, you will
> have to wait until 30 days have passed before you can use the feature again."*

Não é uma conta inesperada. É **um mês de plataforma parada**. A avaliação chama
isso de *"o argumento mais forte para cache (R2) e para instrumentar o consumo"*.

E o Supabase Free, ao estourar o egress, entra em **período de graça e depois é
restrito** (a cota é **unificada** entre serviços).

---

## 3. O que consome — decisões de arquitetura e o seu custo

### 3.1 `force-dynamic` — a decisão que mais custa

**O fato verificado (§2.3 da avaliação):**

| Rota | `x-vercel-cache` | `cache-control` |
|---|---|---|
| `/`, `/metodologia` | **HIT** | `public, must-revalidate, max-age=0` |
| `/ranking`, `/status`, `/partidos` | **MISS** | `no-store, private` |

- **10 das 27 páginas** declaram `force-dynamic` explicitamente;
- O build marca **13 das 27** como dinâmicas (ƒ);
- As demais caem em modo dinâmico **por usarem cookies/sessão**, não por escolha.

**A causa raiz é legítima e está documentada:** o build do CI roda **sem banco**
(`DATABASE_URL` falsa — [`ci.yml`](../../.github/workflows/ci.yml) L36–38), então
páginas que dependem de dados **não podem ser pré-renderizadas**.

**Custo direto de `force-dynamic`:**

| Efeito | Impacto em FinOps |
|---|---|
| Desliga o cache de rota | Toda visita é uma invocação de função **e** uma ida ao banco |
| Cada ida ao banco devolve dado por egress | `/ranking`: **177 KB por visita** |
| Aumenta invocações na Vercel | Aproxima o limite de 1M invocações do Hobby |
| Aumenta consumo de CPU das funções | Limite de **4 CPU-hrs** no Hobby |

**Correção conhecida e ainda não aplicada (`R2`):** a brecha é
**`unstable_cache` dentro de uma rota `force-dynamic`**.

> **Precisão técnica que evita perder horas** (a avaliação dedica uma seção a isso,
> porque **as três crenças comuns estão erradas**):
>
> | Crença | Realidade |
> |---|---|
> | "`force-dynamic` desliga todo cache" | **Não.** Equivale a marcar `fetch()` como `{cache:'no-store'}` — é uma afirmação sobre **`fetch`**. O **Data Cache** continua ativo, e `unstable_cache` usa exatamente esse cache: *"persist the result across requests and deployments"* |
> | "Basta `export const revalidate = 3600`" | **Não funciona junto com `force-dynamic`** — são mutuamente exclusivos, e `force-dynamic` vence. ISR de rota inteira exigiria **remover** `force-dynamic`, o que **quebraria o build no CI** (que roda sem banco) |
> | "Usar `use cache`, que é o novo" | **Não no Next 15.** `use cache` só estabilizou no **Next 16** (`cacheComponents`); no 15 é experimental. Pior: a chave de cache **inclui o Build ID**, então as entradas **não sobrevivem a um deploy** — a própria doc orienta `unstable_cache` para dados que precisam persistir |

**Ganho esperado:** `/ranking` sai de ~1,7 s para dezenas de ms, e o egress da
rota cai a praticamente zero em regime de cache — resolvendo **ao mesmo tempo** a
latência (§2.1 da avaliação) e o teto de egress. **Custo: US$ 0. Esforço: 1–2 dias.**

### 3.2 Região: a correção de custo zero já aplicada

`regions: ["gru1"]` em [`apps/web/vercel.json`](../../apps/web/vercel.json) levou as
funções de `iad1` (Washington) para `gru1` (São Paulo), co-localizadas com o
banco. **US$ 0, 10 minutos, reversível.** Resultado medido em `/ranking`:

| | min | p50 | máx | média |
|---|---|---|---|---|
| Antes | 1.563 ms | 1.625 ms | 2.621 ms | **1.740 ms** |
| Depois | **238 ms** | **328 ms** | 661 ms | **354 ms** |

**Queda de 80% na média e na mediana, sem mudar código.** Menos tempo de CPU por
invocação é, também, menos pressão sobre o teto de 4 CPU-hrs.

### 3.3 Pool de conexões: custo zero, resolve indisponibilidade

`DATABASE_URL` de produção foi para o pooler em **transaction mode (6543)** com
`pgbouncer=true&connection_limit=1`, mais `directUrl` (5432) no schema.

**Correção de premissa relevante** (a avaliação §2.4 corrige o próprio diagnóstico
inicial): o `pool_size: 15` **não é teto do plano gratuito** — é um **default
configurável** no painel, e o teto do compute Nano (Free) é de **60 conexões
diretas / 200 via pooler**. Existe, portanto, uma segunda mitigação gratuita
(elevar o `pool_size` para ~40), mas a correção estrutural é o transaction pooler.

### 3.4 Cache de borda e `Access-Control-Allow-Origin: *`

`AUDITORIA_PRODUCAO.md` §5.1 registra que páginas estáticas servidas com
`X-Vercel-Cache: HIT` incluem `Access-Control-Allow-Origin: *`, e respostas MISS
não incluem. É **comportamento da camada de cache da Vercel**, não do código
(nenhum header CORS no repositório). **Risco nulo** — afeta apenas páginas
públicas não credenciadas.

### 3.5 Otimização já entregue: `/ranking` paginado

| | Antes | Depois |
|---|---|---|
| `/ranking` | **1.506 KB** | **270 KB** |
| `/ranking?pagina=6` | — | 43 KB |

**Redução de 82%** de payload por uma mudança de paginação (100 linhas/página) e
uma aba separada para os 85 parlamentares com confiança < 60. Custo: zero.

### 3.6 Middleware em todas as rotas — custo de CPU

O `matcher` do [`middleware.ts`](../../apps/web/src/middleware.ts) L153–155 cobre
quase tudo (exceto `_next/static`, `_next/image`, `favicon.ico`,
`avatar-placeholder.svg`). O middleware roda em **Edge** e executa `getToken()`
(verificação de JWT) em `/api/*`.

O Hobby tem teto de **fair use de ~50 ms de CPU em média** no middleware.
Restringir o `matcher` (`/api/*` + rotas que realmente precisam de CSP) é uma
economia de CPU citada na avaliação §9 (Frente G). **Não verificado** o consumo
médio atual.

---

## 4. Roteiro de custo: quando e quanto

| Gatilho | Plano necessário | Custo | O que se ganha |
|---|---|---|---|
| **Estado atual** | Vercel Hobby + Supabase Free | **US$ 0** | Plataforma no ar, base pré-lançamento |
| **Egress > ~4 GB/mês** (ou restrição aplicada) | **Supabase Pro** | **US$ 25/mês** | Egress 5 GB → **250 GB**; **backup automático diário de 7 dias**; sem pausa por inatividade |
| **Transferência > 80 GB**, origem > 8 GB, invocações > 800 mil, **ou receita que não seja doação** | **Vercel Pro** | **US$ 20/mês** (fee, com US$ 20 de crédito e Flat Rate CDN de 1 TB + 1M req) | Limites maiores, logs mais longos, suporte |
| **Cron mais frequente que 1×/dia** | ❌ **impossível no Hobby** | — | Uma expressão de cron mais frequente **faz o deploy falhar**: `Hobby accounts are limited to daily cron jobs` |

**Análise custo-benefício do Pro do Supabase (US$ 25):** a avaliação conclui que
**nenhuma alternativa verificada** entrega **região em São Paulo + backup + zero
operação** por menos que isso. Migrar de provedor para economizar US$ 25 —
perdendo a **residência no Brasil** (Railway não tem região de compute no Brasil;
Hetzner também não; Cloudflare Hyperdrive é inviável nesta arquitetura) — é
**economicamente ruim e pior para LGPD**.

**Análise do Pro da Vercel (US$ 20):** a avaliação recomenda **não** tratá-lo como
primeira resposta ao egress — *"o cache resolve antes e de graça"*. O gatilho
correto é mensurável (§ acima).

**Sobre a `/apoie`:** a página de doações **não torna o projeto comercial**. A
Fair Use Guidelines da Vercel (atualizada em 2026-09-14) diz explicitamente
*"Asking for Donations does not fall under commercial usage"*. O que torna
comercial: anúncios, link de afiliado como propósito principal, venda de
produto/serviço, ou pagamento a alguém para criar/manter o site. **Esse é o
gatilho documentado para migrar de plano.**

---

## 5. Serviços recomendados: todos custo zero

A avaliação propõe seis serviços para fechar lacunas de segurança/operação,
**todos no free tier**:

| Serviço | Free tier | Resolve | Custo |
|---|---|---|---|
| **Resend** | **3.000 e-mails/mês, teto 100/dia**, 3 domínios, **sem overage** (não existe cobrança) | Verificação de e-mail, reset de senha, notificação de retificação. **Egress/LGPD:** o e-mail sai da região `sa-east-1`, mas **os dados de conta ficam nos EUA** (*"All account data … is stored in the United States regardless of the sending region"*) → transferência internacional (Art. 33) | US$ 0 |
| **Upstash Redis** | **500.000 comandos/mês**, 250 MB, 1 banco, sem SLA/SOC-2 | Rate limit **com estado compartilhado** — só nas rotas sensíveis | US$ 0 |
| **Sentry Developer** | 5.000 erros, 5 GB logs, 5 GB métricas, 5M spans, 50 replays, 1 monitor de cron, 1 de uptime; **retenção 30 dias** | Error tracking — **o código já está instrumentado e dormente** | US$ 0 |
| **Cloudflare Turnstile** | Grátis | Captcha em cadastro/retificação | US$ 0 |
| **Cloudflare Email Routing** | Grátis em todos os planos | `suporte@` — receber e encaminhar | US$ 0 |
| **Healthchecks.io / Better Stack** | 20 jobs / 10 monitores | Heartbeat do snapshot mensal e do backup | US$ 0 |

**Orçamento de comandos do Upstash (a conta que decide o desenho):** com sliding
window, cada requisição permitida custa **4 comandos** (5 na primeira vez);
token bucket, 4. Portanto:

- Rate limit em **todo** o tráfego: `500.000 / 4` = **125.000 requisições/mês** (~4.100/dia) — **pouco** para middleware global;
- Rate limit **só em rotas sensíveis** (`POST /api/auth/*`, reenvio, `POST` de voto, `/api/retificacao`): 125.000 é **20 a 100×** o volume esperado nos primeiros meses;
- Com `analytics: true` (5 comandos): 100.000 req/mês.

**Conclusão de FinOps:** o desenho economicamente correto é **manter a suavização
geral leve e concentrar o rate limit com estado compartilhado nas rotas
sensíveis**. Isso cabe no free tier com folga.

**Cuidado de custo oculto:** o único serviço avaliado que **cobra overage
automaticamente e não permite limitar** é o **Postmark** (Developer: 100
e-mails/mês, excedente faturado) — por isso foi descartado em favor do Resend,
cujo free tier **para** no limite em vez de faturar. Para um projeto sem receita,
*"risco de conta inesperada = zero"* vale mais que 3.000 e-mails.

---

## 6. Tabela de limites que importam (com o que fazer)

| Recurso | Limite | Consumo atual | Risco | Ação |
|---|---|---|---|---|
| **Egress Supabase** | 5 GB/mês | **não medido por origem** | 🔴 **Alto** — `/ranking` sozinho com 28k visitas = 100% da cota | `unstable_cache` (R2); instrumentar por origem |
| Tamanho do banco | 500 MB (Free) | **98 MB** (20%) | 🟢 Baixo | `SessionAttendance` é 53 MB; cresce com novas legislaturas |
| Conexões | 60 diretas / 200 pooler (Nano) | `connection_limit=1` por instância | 🟢 Mitigado | Monitorar |
| **Vercel códigos de cron** | **1×/dia**; mais frequente **quebra o deploy** | 0 (os crons estão no Actions) | 🟢 | **Manter no Actions** — é a decisão correta, não gambiarra |
| Vercel transferência | 100 GB | não medido | 🟡 | Monitorar; gatilho do Pro em 80 GB |
| Vercel origem (build) | 10 GB | não medido | 🟡 | — |
| Vercel invocações | 1M/mês | não medido | 🟡 | Gatilho do Pro em 800 mil |
| Vercel CPU | **4 CPU-hrs** | não medido | 🟡 | Região `gru1` já reduziu; restringir `matcher` ajudaria |
| Vercel deploys | 100/dia | baixo | 🟢 | — |
| **Vercel logs de runtime** | **1 hora** | — | 🟠 | Em incidente, **copiar imediatamente** ([`../05-security-compliance/INCIDENT_RESPONSE.md`](../05-security-compliance/INCIDENT_RESPONSE.md) §7) |
| Middleware Edge (Hobby) | fair use **~50 ms de CPU** médios | não medido | 🟡 | Considerar restringir o `matcher` |
| Resend | 100 e-mails/dia | 0 (não adotado) | — | — |
| Upstash | 500k comandos/mês | 0 (não adotado) | — | Usar **só** em rotas sensíveis |

---

## 7. O custo que não aparece na fatura

Em um projeto assim, o recurso mais consumido é **tempo de uma pessoa**. O que
FinOps significa aqui:

| Item | Observação |
|---|---|
| **Custo de reconstruir os dados** | `SessionAttendance` tem 166.825 linhas e a carga **já foi interrompida uma vez** por instabilidade do pooler. Sem backup ([`BACKUP_DR.md`](./BACKUP_DR.md)), refazer o ETL é dias de trabalho humano |
| **Custo de `ScoreSnapshot` perdido** | **Não reconstruível** em nenhum valor de dinheiro — a nota de um mês passado não se recria |
| **Custo de falso positivo jurídico** | Uma trava de integridade aplicada à pessoa errada tem custo jurídico e reputacional que nenhuma economia de nuvem compensa |
| **Custo de migrar de plataforma** | A avaliação estima **1–3 dias** para Cloudflare Workers + OpenNext, com **risco de segunda migração** em 1–2 anos (a Cloudflare passou a recomendar `vinext` e reposicionou o OpenNext como manutenção). Contra ~US$ 15/mês de economia → **retorno negativo** |
| **Custo de ficar no Free do Supabase sem backup** | Em caso de perda: dias de ETL + perda permanente da série de snapshots |

**Decisão registrada:** permanecer no **Hobby**, aplicar **região** (feito) e
**cache** (pendente). Ir para Pro **no gatilho mensurável**. Migrar de plataforma
**não resolve o problema de hoje** — o gargalo é arquitetural (banco remoto por
request) e se resolve com região + cache.

---

## 8. Plano de FinOps (ordenado por retorno sobre esforço)

| # | Ação | Custo | Retorno | Esforço | Estado |
|---|---|---|---|---|---|
| 1 | **Região `gru1`** | US$ 0 | **−80% de latência** e menos CPU por invocação | 10 min | ✅ **aplicado** (2026-10-12, commit `780e941`) |
| 2 | **Transaction pooler (6543) + `connection_limit=1`** | US$ 0 | Fim dos HTTP 500/503 a cada deploy | 30 min | ✅ **aplicado** (idem) |
| 3 | **`next` 15.5.0 → 15.5.27** | US$ 0 | Correção de 2 advisories | 15 min | ✅ **aplicado** (idem) |
| 4 | **Paginação de `/ranking`** | US$ 0 | **−82% de payload** (1.506 KB → 270 KB) | — | ✅ **aplicado** |
| 5 | **`unstable_cache` + tags nas rotas dinâmicas** | US$ 0 | Egress da rota → ~0; `/ranking` em dezenas de ms | 1–2 dias | ❌ **pendente — maior ganho restante** |
| 6 | **Instrumentar egress por origem** (página vs. ETL) | US$ 0 | Permite decidir com número em vez de intuição | horas | ❌ pendente |
| 7 | **Alerta ao se aproximar de 4 GB de egress** | US$ 0 | Evita o cenário de **30 dias parado** | horas | ❌ pendente |
| 8 | **Revalidar destino do snapshot via `revalidateTag`** disparado pelo Actions | US$ 0 | Contorna o limite de cron do Hobby e mantém o dado fresco em minutos | meio dia | ❌ pendente |
| 9 | **Restringir o `matcher` do middleware** | US$ 0 | Reduz CPU no Edge (fair use ~50 ms) | horas | ❌ pendente |
| 10 | **Supabase Pro (US$ 25)** | **US$ 25/mês** | 250 GB egress + **backup diário 7 dias** + sem pausa | 15 min | ⏳ **gatilho: egress > ~4 GB** |
| 11 | **Vercel Pro (US$ 20)** | **US$ 20/mês** | Limites maiores, logs mais longos | 15 min | ⏳ **gatilho: > 80 GB / 800k invocações / receita não-doação** |

**Observação sobre o item 5:** o cache é, simultaneamente, a melhor decisão de
**FinOps**, de **performance** e de **resiliência a scraping** (ameaças I1/D3 de
[`../05-security-compliance/THREAT_MODELING.md`](../05-security-compliance/THREAT_MODELING.md)).
É o item de maior alavancagem pendente em todo o projeto.

---

## 9. O que **não** fazer (por razões de custo)

| ❌ | Por quê |
|---|---|
| **Migrar de plataforma para economizar ~US$ 15/mês** | Custo de migração (1–3 dias) + risco de segunda migração > economia. Perde região no Brasil (LGPD) |
| **Usar o Pro da Vercel como primeira resposta ao egress** | O cache resolve antes e de graça |
| **Rodar Redis agora** | Cabe no gratuito, mas adiciona um serviço, ponto de falha, região a mais (latência contra `sa-east-1`) e mais uma camada de invalidação. `unstable_cache` resolve dentro da Vercel. **Redis não entra nesta fase** |
| **Indexar a busca como prioridade de performance** | `EXPLAIN ANALYZE` mostra `Seq Scan` com **0,5 ms**; o custo é rede, não índice. Criar `pg_trgm`/`tsvector` é útil para volume futuro, mas não é a prioridade |
| **Planejar cron horário na Vercel** | **Impossível no Hobby** — a expressão mais frequente faz o **deploy** falhar |
| **Adotar Postmark** | Overage **cobrado automaticamente e não limitável** — risco de conta inesperada para projeto sem receita |
| **Instalar GA4** | Cookies + consentimento + transferência internacional sem necessidade |

---

## 10. Referências no repositório

- [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) — **§2.2** (egress), §2.3 (cache), §2.4 (conexões), §2.5 (volume), §3 (Frente A — banco), §4 (Frente B — backup), §5.1 (limites do Hobby), §5.2 (região), §5.3 (alternativas de plataforma), §6 (arquitetura de leitura), §8.2 (serviços), §10 (roadmap e resultados medidos), §11 (o que não fazer), §12 (como cada número foi obtido)
- [`AUDITORIA_PRODUCAO.md`](./AUDITORIA_PRODUCAO.md) §0.4 (paginação de `/ranking`), §0.7.5 (pool e região), §5.1 (CORS em HIT)
- [`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) §2.1 — por que o CI não tem banco, e como isso força `force-dynamic`
- [`BACKUP_DR.md`](./BACKUP_DR.md) §4 — restrição de egress do dump
- [`../05-security-compliance/THREAT_MODELING.md`](../05-security-compliance/THREAT_MODELING.md) D3/I1 — DoS econômico e scraping
- [`../../apps/web/vercel.json`](../../apps/web/vercel.json) — `regions: ["gru1"]`
