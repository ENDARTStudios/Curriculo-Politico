# Avaliação de Alternativas — Currículo Político

**Data:** 2026-10-12 · **Método:** medição direta em produção (Vercel/Supabase), leitura do
repositório, sondagem das fontes oficiais e consulta a documentação oficial dos fornecedores.

> Tudo nesta avaliação foi **medido ou lido em fonte oficial nesta sessão**. Números que
> dependem de página renderizada por JS e que não pude confirmar estão marcados como
> **não confirmado** em vez de estimados. Onde a hipótese inicial se mostrou errada, o
> registro da correção está no próprio texto.

---

## 1. Sumário executivo

| # | Decisão recomendada | Custo | Esforço | Resolve |
|---|---|---|---|---|
| **R1** | Rodar as funções na **região `gru1` (São Paulo)**, co-localizadas com o banco | US$ 0 | 10 min | Latência de todas as páginas dinâmicas |
| **R2** | **Read model + `unstable_cache`** nas páginas hoje `force-dynamic` (**não** `use cache`, que é experimental no Next 15 e não sobrevive a deploy) | US$ 0 | 1–2 dias | Latência **e** o gargalo de egress |
| **R3** | **Transaction pooler (6543)** + `connection_limit=1` | US$ 0 | 30 min | Queda de 500/503 a cada deploy |
| **R4** | **Backup real** (`pg_dump` semanal para storage privado) | US$ 0 | 2 h | Perda total de dados + afirmação incorreta no RIPD |
| **R5** | **Supabase Pro** quando houver tráfego real | US$ 25/mês | 15 min | Egress 5→250 GB, backup diário, sem pausa |
| **R6** | Destravar **Integridade** com dados do TCU **já baixados** + Portal da Transparência | US$ 0 | 3–5 dias | 25% do IDIP hoje em baseline 50 |
| **R7** | **Re-rodar os ETLs** de TSE e Querido Diário (fontes voltaram) | US$ 0 | 1 dia | Patrimônio/receitas e diários municipais |
| **R8** | **E-mail (Resend) + verificação obrigatória + rate limit compartilhado** — em par | US$ 0 | 1 dia | Risco LGPD registrado no RIPD |
| **R9** | **Sentry (DSN) + alerta de cron** | US$ 0 | 40 min | Falhas invisíveis |
| **R10** | **Testes automatizados** e fim dos `catch {}` silenciosos | US$ 0 | 2–3 dias | Regressões e diagnóstico |
| **R11** | Atualizar **Next 15.5.26 → 15.5.27** | US$ 0 | 15 min | Advisory moderado (cache poisoning SSG/ISR) |
| **R12** | `/status` com **saúde real das fontes** (hoje o texto é fixo e está errado) | US$ 0 | 3 h | Credibilidade da página de transparência |

**Ordem sugerida:** R1 → R3 → R11 → R4 → R2 → R9 → R8 → R12 → R6 → R7 → R5 (por gatilho) → R10.
Nenhuma exige trocar de fornecedor.

---

## 2. Diagnóstico medido (2026-10-12)

### 2.1 Latência: as funções estão longe do banco

| Medição | Valor |
|---|---|
| `/ranking` em produção (10 requisições, página 2) | mín 1.543 ms · máx 2.460 ms · **média 1.738 ms** |
| `/ranking` no servidor local, **mesmo build**, máquina no Brasil | **505 ms** |
| Região das funções Vercel (`serverlessFunctionRegion`) | **`iad1` — Washington, D.C.** |
| Região do banco Supabase | **`sa-east-1` — São Paulo** |

O mesmo código e o mesmo banco respondem em 0,5 s quando a aplicação roda perto do banco e
em 1,7 s quando roda em Washington. A diferença é distância física por requisição — não é
código, não é query.

### 2.2 Egress: o gargalo real do plano gratuito

| Medição | Valor |
|---|---|
| Dados devolvidos pelo banco em **cada** request de `/ranking` | **177 KB** |
| Cota do Supabase Free (egress unificado: banco + auth + storage + realtime) | **5 GB/mês** |
| `/ranking` sozinho com 28 mil visitas/mês | **~5 GB — consome 100% da cota** |
| Com 100 mil visitas/mês (só `/ranking`) | **~17,7 GB — 3,5× a cota** |

Confirmado na documentação oficial: a cota de egress é **unificada** entre serviços e, quando
estourada no Free, a organização entra em período de graça e depois é **restrita**. Backups
manuais pelo pooler **também contam** como egress.

**Nuance que muda a prioridade:** o consumo **não vem só das visitas ao site** — cada `createMany`
em lote e cada dump do ETL rodando da máquina local também contam. O egress é o recurso escasso
do projeto, mais que as conexões.

### 2.3 Cache: tudo que é dinâmico bate no banco sempre

| Rota | `x-vercel-cache` | `cache-control` |
|---|---|---|
| `/`, `/metodologia` | **HIT** | `public, must-revalidate, max-age=0` |
| `/ranking`, `/status`, `/partidos` | **MISS** | `no-store, private` |

**10 das 27 páginas declaram `force-dynamic`** e o build marca **13 das 27 como dinâmicas** (ƒ)
— as demais caem no modo dinâmico por usarem cookies/sessão, não por escolha explícita. A causa
raiz é legítima: o build do CI roda **sem banco** (`DATABASE_URL` falso), então as páginas que
dependem de dados não podem ser pré-renderizadas no build.

### 2.4 Conexões: a queda que ocorreu hoje

| Medição | Valor |
|---|---|
| Erro capturado | `FATAL: (EMAXCONNSESSION) max clients reached in session mode - pool_size: 15` |
| Pooler em uso | Session mode, porta **5432** |
| `connection_limit` no `prisma.ts` | **ausente** — o padrão do Prisma é `num_cpus × 2 + 1`, ou seja, cada instância abre várias conexões |
| Efeito real | HTTP **500/503 por 1–2 min** em páginas dinâmicas após deploys |
| Teste do pooler em **transaction mode (6543)** com Prisma deste projeto | **funciona** — `count` 688 ms (vs 3.995 ms), ranking 163 ms, `$transaction([...])` OK |

> **Correção importante de premissa.** O `pool_size: 15` **não é um teto do plano gratuito** — é um
> **valor padrão configurável** no painel (Connection pooling → Database Settings). Confirmado na
> documentação oficial: *"You can change how many database connections Supavisor can manage by
> altering the pool size"*, com a regra de comprometer até **80% do `max_connections`** ao pool
> (40% se usar PostgREST intensivamente). O teto do compute Nano (Free) é de **60 conexões diretas
> / 200 via pooler** (doc de solução de problemas de conexão do Supabase). Isso significa que
> existe uma **segunda mitigação gratuita** — elevar o `pool_size` para ~40 — e que o 15 era
> apenas um default mal dimensionado para serverless. A correção estrutural continua sendo o
> transaction pooler; elevar o `pool_size` é paliativo útil.

### 2.5 Dados e volume

| Item | Valor |
|---|---|
| Tamanho do banco | **98 MB** (limite Free: 500 MB) |
| Maior tabela | `SessionAttendance` — 53 MB, 166.825 linhas |
| Modelos **sem nenhum dado** | **13 de 27** (inclui `LegalRecord`, todos os `Stf*`, `HistoricalPolitician`, `MunicipalExpense`) |
| Usuários / votos / retificações | **0** — base pré-lançamento |

### 2.6 Desempenho da busca (correção de hipótese)

A primeira medição deu **4.190 ms** para `"saúde"` e sugeria falta de índice. **Estava errado**:
era *cold start*. Medições repetidas deram 105–900 ms, e o `EXPLAIN ANALYZE` mostra
`Seq Scan` com **0,5 ms de execução** (o `LIMIT 8` para cedo). **A busca não é problema de
índice** — o custo é ida e volta até o banco. Criar `pg_trgm`/`tsvector` continua útil para
volume futuro (`pg_trgm` e `unaccent` estão disponíveis, não instaladas), mas **não** é a
prioridade que a primeira medição sugeria.

### 2.7 Segurança das dependências (auditado)

| Achado | Situação real |
|---|---|
| `npm audit` | 5 high + 1 moderate |
| **`next` 15.5.26** — cache poisoning de SSG/ISR (moderado) | **Afetado.** Corrigido em **15.5.27** (já publicada). `latest` geral é 16.4.0 |
| `postcss` 8.5.28 instalado | Faixa vulnerável é `<= 8.5.22` → **não afetado** |
| `source-map-js` 1.2.1 | Faixa `1.0.0–1.2.1` → no limite; corrigir junto com o Next |
| `deepmerge-ts` 7.1.5 (via `@prisma/config`) | Só **CLI/build** — o app não importa `@prisma/config` em runtime |

> **Correção importante de um alarme falso.** Um levantamento paralelo apontou **duas CVEs de
> account takeover no NextAuth** como "ação urgente hoje". Verifiquei nas fontes primárias:
> as CVEs existem (GHSA-x445-f3h2-j279 e GHSA-7rqj-j65f-68wh, publicadas em **23/07/2026**,
> não em agosto), mas o NextAuth vulnerável é `<= 4.24.14` (média) e `< 4.24.15` (crítica) —
> **e o projeto já está em `next-auth@4.24.15`**, a versão `latest` do v4. **Não há nada a
> fazer.** Além disso, a CVE crítica é do fluxo de e-mail/magic-link, que **este projeto não
> usa** (credenciais + Google). O alerta veio de pesquisa que não conferiu a versão instalada.

### 2.8 Backup — divergência entre documento e realidade

| Onde | O que diz |
|---|---|
| `docs/security/RIPD.md` §4 | Mitigação do risco de vazamento inclui "**backups Supabase**" |
| Realidade | **Não existe nenhum backup**: nenhum `pg_dump`, nenhum workflow, e o **plano Free do Supabase não inclui backup automático** (confirmado na tabela oficial de preços: Free = "Automatic backups: Not included"; Pro = 7 dias) |

98 MB de dados curados (31.815 proposições, 166.825 presenças) e, no futuro, votos de usuários
(dado sensível) estão **sem cópia de segurança** — e o RIPD afirma o contrário.

### 2.9 Estado atual das fontes de dados (sondagem ao vivo)

| Fonte | Status hoje | Observação |
|---|---|---|
| Câmara dos Deputados | ✅ 200 | em uso |
| Senado Federal | ✅ 200 | em uso |
| **CDN do TSE** | ✅ **200** | declarado "bloqueado" em `/status` — **não está mais** |
| **Querido Diário (API)** | ✅ **200** | declarado "bloqueado" — **funciona** |
| Portal do TCU | ✅ 200 | HTML |
| `api-publica.tcu.gov.br` | ❌ erro de conexão | sem credencial |
| Portal do STF | ❌ **403** | segue bloqueado |
| CNJ DataJud (API pública) | ⚠️ **401** | exige chave pública do CNJ |
| Portal da Transparência | ⚠️ **401** | exige chave gratuita |

---

## 3. Frente A — Banco e conexões

### 3.1 O que foi verificado

Testei o pooler em **transaction mode (6543)** com o Prisma **deste** projeto, incluindo a
única transação existente (`$transaction([...])` em `api/consent/route.ts`): **funciona e é
mais rápido no primeiro acesso**. Logo, a recomendação é segura e não exige mudança de código.

### 3.2 Alternativas

| Opção | Custo/mês | Região BR | Modelo de conexão | Esforço | Risco |
|---|---|---|---|---|---|
| **Supabase Free + transaction pooler + cache** (recomendado agora) | **US$ 0** | ✅ sa-east-1 | Supavisor transaction (6543); teto real do Nano: **60 diretas / 200 pooler** | Nenhum (só `DATABASE_URL`/`directUrl`) | Baixo. O teto é **egress**, não conexão |
| **Supabase Pro** (gatilho de egress) | **US$ 25** | ✅ sa-east-1 | idem | Nenhum | Muito baixo. 250 GB egress, backup 7 dias, sem pausa |
| Neon | **não confirmado** | ✅ (AWS São Paulo) | PgBouncer gerenciado + adapter Prisma documentado | Baixo | Preço/limites não verificados |
| **Railway** | US$ 5 (mínimo de uso) | ❌ **nenhuma região de compute no Brasil** — o "Olá, São Paulo" do changelog é **CDN, não compute** | PgBouncer **desligado por padrão**; 20 conexões de servidor por réplica | Baixo-médio | **Alto para LGPD** (banco fora do Brasil); cobra RAM ociosa |
| **Cloudflare Hyperdrive + Postgres** | US$ 5 (Workers Paid) | ❌ (região "Brazil" só em add-on enterprise) | Transaction pooling | — | **Inviável nesta arquitetura:** a connection string *"only accessible from your Worker"* → **não funciona na Vercel**; free limita a 100 mil statements/dia (conta INSERT/DDL) → inviável para o ETL |
| **Turso / libSQL** | não confirmado | não confirmado | libSQL, **não é PostgreSQL** | **Alto** — troca de dialeto, reescreve schema | Perde enums e recursos do Postgres |
| VPS própria (Hetzner + Coolify) | não confirmado | ❌ Hetzner não tem datacenter no Brasil | Postgres + PgBouncer que **você** opera | Alto (operação, não schema) | **Piora a residência LGPD** e transfere backup, patch e HA para você |
| Prisma Accelerate | não confirmado | — | Proxy de pooling/cache | Baixo | **Desnecessário** — o Supavisor já faz pooling |
| Render / Fly.io / PlanetScale | **não confirmado** | — | — | — | Não verificados nesta rodada |

> Preços de Neon, Render, Fly.io, PlanetScale e Hetzner **não foram confirmados em fonte
> oficial** nesta rodada — marcados como tal em vez de estimados. As duas linhas que decidem
> (Free e Pro do Supabase) estão confirmadas.

**O argumento econômico central:** o custo de trocar é US$ 0 e o de sair do teto é **US$ 25**.
Nenhuma alternativa verificada entrega **região em São Paulo + backup + zero operação** por menos
que isso. Migrar de provedor para economizar US$ 25 — perdendo a residência no Brasil — é
economicamente ruim.

### 3.3 Recomendação

1. **Agora (US$ 0):** `DATABASE_URL` de produção → porta **6543** com
   `?pgbouncer=true&connection_limit=1&connect_timeout=30`.
2. **Adicionar `directUrl`** no `datasource` do Prisma apontando para a 5432. **`prisma migrate`
   não funciona em transaction mode** — sem `directUrl`, as migrações quebram. O Prisma documenta
   exatamente esse par `DATABASE_URL` (pooled) / `directUrl` (direta) para Supabase e Neon.
3. **Elevar o `pool_size` do Supavisor** de 15 para ~40 (o teto do Nano é 200) — paliativo
   barato que também reduz o risco enquanto o cache não existe.
4. **Separar ETL de runtime:** o ETL continua na 5432 com `connection_limit=1`, fora de pico e
   com `createMany` em blocos (o `apps/pipeline/README.md` já prescreve isso). Nunca a mesma
   credencial/limite do runtime.
5. **Validar antes de considerar resolvido:** repetir o teste de pooler **em produção** e
   confirmar que um deploy sob tráfego não gera mais 500/503 (reprodução exata da dor original).
6. **Gatilho para o Pro:** quando o egress mensal passar de **~4 GB** ou o egress for restringido.
   US$ 25 compra 250 GB, backup diário de 7 dias e fim da pausa por inatividade.
7. **Instrumentar o egress como recurso escasso:** descobrir quanto do consumo vem de página
   pública e quanto vem do ETL local. Sem esse número, não há decisão econômica defensável.

---

## 4. Frente B — Backup e continuidade (prioridade alta)

**Recomendação:** workflow semanal no GitHub Actions rodando `pg_dump` (formato custom,
comprimido) e enviando para **storage privado** — Cloudflare R2 ou Backblaze B2 (faixa gratuita
de 10 GB é suficiente para os ~98 MB atuais). Retenção de 4 semanais + 1 mensal.

**Regras inegociáveis:**
- **Nunca** publicar o dump como artefato/release do GitHub — o repositório é **público** e o
  dump conterá e-mails e votos (opinião política = dado sensível).
- Cifrar antes de subir (`age`/`gpg`) e guardar a chave fora do repositório.
- Custo de egress: cada dump de 98 MB consome cota; com compressão cai bastante — **semanal é
  suficiente** e cabe no orçamento de 5 GB.
- **Corrigir o RIPD**: ou o backup passa a existir de fato, ou a linha "backups Supabase" sai
  da tabela de mitigações. Documento de compliance não pode afirmar controle inexistente.
- Testar **restauração** pelo menos uma vez (`pg_restore` em banco local) — backup não testado
  não é backup.

---

## 5. Frente C — Plataforma, região e custo

### 5.1 Vercel Hobby: pode continuar

Verificado na **Fair Use Guidelines oficial** (atualizada em 2026-09-14): *"Hobby teams are
restricted to non-commercial personal use only"*, mas com a ressalva explícita:
> **"Asking for Donations does not fall under commercial usage."**

Ou seja: a página `/apoie` **não** torna o projeto comercial. **Vira comercial** se houver
anúncios, link de afiliado como propósito principal, venda de produto/serviço, ou pagamento a
alguém para criar/manter o site. **Esse é o gatilho documentado para migrar de plano.**

Limites do Hobby relevantes: 100 GB de transferência, 10 GB de origem, 1M invocações, **4 CPU-hrs**,
100 deploys/dia, **logs de runtime de apenas 1 hora**, sem suporte por e-mail. Middleware em Edge
tem teto de fair use de **50 ms de CPU em média** — relevante porque o middleware atual faz
verificação de JWT (`getToken`) e roda em **todas** as rotas.

**O limite mais duro do Hobby não é comercial, é de cron:** cron na Vercel roda **apenas 1× por
dia**, e uma expressão mais frequente **faz o deploy falhar** (`Hobby accounts are limited to
daily cron jobs`). Consequência prática: **manter os crons no GitHub Actions não é gambiarra — é
a decisão correta**, e qualquer plano de "cron na Vercel atualizando o read model de hora em hora"
é impossível neste plano. O `monthly-snapshot.yml` e o `production-smoke.yml` já estão no lugar
certo.

**E o risco real de estouro:** o Hobby **não tem pay-as-you-go** — ao estourar uma cota,
*"you will have to wait until 30 days have passed before you can use the feature again"*. Isso
eleva bastante a aposta do teto de egress (§2.2): não é uma conta inesperada, é **um mês de
plataforma parada**. É o argumento mais forte para cache (R2) e para instrumentar o consumo.

### 5.2 A correção mais barata: região

A Vercel permite **escolher a região única** no Hobby (`regions: ["gru1"]` no `vercel.json`, ou
Settings → Functions) — confirmado no changelog oficial *"Hobby customers can now select their
preferred region for Serverless Functions"* e na tabela de limites do plano (Hobby = região
única). Com o banco em `sa-east-1`, rodar em `gru1` (São Paulo) elimina a travessia do continente
em cada query. **Custo zero, sem mudança de código, reversível — e é a melhor relação
ganho/risco de toda esta avaliação.**

### 5.3 Alternativas de plataforma

| Opção | Custo estimado | Next.js 15 + middleware + Prisma | Migração | Risco |
|---|---|---|---|---|
| **Vercel Hobby (atual)** | **US$ 0** | nativo | — | cron 1×/dia; logs de 1 h; teto de CPU no middleware; estouro = 30 dias de espera |
| **Vercel Pro** (gatilho) | **US$ 20** (fee, com US$ 20 de crédito e Flat Rate CDN de 1 TB + 1M req) | nativo | zero | custo fixo recorrente |
| Cloudflare Workers + OpenNext | ~US$ 5 | **bom com ressalvas**: exige **client Prisma por request** (singleton falha), não suporta `runtime = "edge"`, ISR precisa de R2 + Durable Object + D1, **ETLs Python não rodam**; piso Next ≥ 15.5.27 | **1–3 dias** | **estratégico**: a Cloudflare passou a recomendar **vinext** (beta) e reposicionou o OpenNext como manutenção → risco de **segunda migração** em 1–2 anos |
| Railway (Hobby) | US$ 5 + consumo | bom (Next standalone) | baixo-médio | **sem região de compute no Brasil**; egress a US$ 0,05/GB |
| Render / Fly.io / Netlify / Amplify | não confirmado | parcial | baixo–alto | free do Render **hiberna**; preços não verificados |
| VPS + Coolify/Dokploy | não confirmado | você opera | alto | vira SRE: TLS, backup, patch, HA, sem SLA |

**Cloudflare na frente da Vercel:** é **permitido** (Verified Proxy Lite, com `CF-Connecting-IP`),
mas a Vercel **não recomenda** — a CDN perde visibilidade do tráfego, ataque no proxy vira
**consumo de cota sua**, e um SSL/TLS em modo *Flexible* gera loop de redirecionamento (só
*Full (strict)* funciona). Cachear as páginas `force-dynamic` ali **não funciona**: elas saem com
`no-store` exatamente para não serem cacheadas por intermediários.

**Recomendação:** **permanecer no Hobby**, aplicar `gru1` e cache. Ir para **Pro** no gatilho
mensurável (transferência > 80 GB, origem > 8 GB, invocações > 800 mil) ou se surgir receita que
não seja doação. Migrar de plataforma **não** resolve o problema de hoje: o gargalo é arquitetural
(banco remoto por request) e se resolve com região + cache. O custo de migrar (1–3 dias + risco de
segunda migração) é maior que os ~US$ 15/mês que se economizaria.

---

## 6. Frente D — Arquitetura de leitura (maior ganho, menor risco)

O problema: páginas dinâmicas consultam o Supabase a cada visita, atravessando o continente, e
consomem cota de egress proporcional ao tráfego. O conteúdo, porém, **muda quando os scores são
recalculados** (mensal ou manualmente) — não a cada segundo.

### 6.1 A correção técnica que evita perder horas

Há três crenças comuns sobre cache no Next 15, e **as três estão erradas**:

| Crença | Realidade (documentação oficial) |
|---|---|
| "`force-dynamic` desliga todo cache" | **Não.** `force-dynamic` equivale a marcar `fetch()` como `{ cache: 'no-store' }` — é uma afirmação sobre **`fetch`**. O **Data Cache** continua ativo, e `unstable_cache` usa exatamente esse cache: *"persist the result across requests and deployments"* |
| "Basta `export const revalidate = 3600`" | **Não funciona junto com `force-dynamic`** — são mutuamente exclusivos e `force-dynamic` vence. ISR de rota inteira exigiria remover `force-dynamic`, o que **quebraria o build no CI** (que roda sem banco) |
| "Usar `use cache`, que é o novo" | **Não no Next 15.** `use cache` só estabilizou no **Next 16** (flag `cacheComponents`); no 15 é experimental. Pior para o nosso caso: a chave de cache **inclui o Build ID**, então as entradas **não sobrevivem a um deploy** — a própria doc orienta `unstable_cache` para dados que precisam persistir entre deploys |

**Conclusão:** a brecha é **`unstable_cache` dentro de uma rota `force-dynamic`**. Isso mantém o
build sem banco (CI intacto) e tira o banco do caminho crítico ao mesmo tempo.

### 6.2 Estratégia em três camadas — sem Redis e sem trocar de plataforma

1. **Read model materializado.** O ETL (que roda localmente/Actions) grava o ranking já pronto:
   tabela `ranking_snapshot` ou JSON versionado no repositório. Transforma a agregação de 594
   linhas em um `SELECT` de uma linha — ou em **zero** consultas, se o JSON for servido do
   repositório.
2. **`unstable_cache` na leitura.** Um wrapper único (`lib/data.ts`) por consulta, com **tags**
   por domínio (`ranking`, `partidos`, `politico:<id>`) e `revalidate` longo. Uma ida ao banco por
   janela, não por request.
3. **Invalidação dirigida pelo GitHub Actions.** Ao final do ETL, o workflow chama um Route
   Handler protegido por secret que executa `revalidateTag`. Isso contorna a limitação de cron do
   Hobby (§5.2) e mantém o dado fresco em minutos, não em 24 h.

**Cuidados que evitam bugs silenciosos:**
- `revalidate` precisa ser **estaticamente analisável** (`3600` funciona; `60 * 60` não).
- `unstable_cache` **não pode** chamar `cookies()`/`headers()` por dentro — leia fora e passe como
  argumento (o valor entra na chave de cache).
- A rota de revalidação **sem secret é vetor de DoS** — qualquer um força revalidação infinita.
- Não usar `NEXT_PUBLIC_` no secret de revalidação.

**Por que não Redis (Upstash) agora:** cabe no gratuito (500 mil comandos/mês) e é a resposta
certa quando houver várias instâncias compartilhando cache — mas adiciona um serviço, um ponto de
falha, uma região a mais (latência contra sa-east-1) e mais uma camada de invalidação para manter
coerente. `unstable_cache` resolve o mesmo problema dentro da Vercel. **Redis não entra nesta
fase.**

**Sobre avalanche de requisições:** ISR e `unstable_cache` usam *stale-while-revalidate* — quem
chega depois do vencimento recebe a versão anterior e a regeneração acontece em segundo plano,
sem avalanche de queries. Um TTL simples de Redis faz o oposto (todos os requests concorrentes
erram ao mesmo tempo). O header `x-nextjs-cache` (`HIT`/`STALE`/`MISS`/`REVALIDATED`) permite
medir o efeito real.

**Ganho esperado:** `/ranking` sai de ~1,7 s para dezenas de ms e o egress da rota cai a
praticamente zero no regime de cache — resolvendo **ao mesmo tempo** a latência (§2.1) e o teto de
egress (§2.2). É isso que permite continuar no plano gratuito com tráfego real.

**Ordem por ganho/risco:** região (minutos) → read model (1 dia) → `unstable_cache` (1 dia) →
invalidação (meio dia).

---

## 7. Frente E — Fontes de dados e a dimensão Integridade

### 7.1 A boa notícia: as fontes "bloqueadas" em boa parte não estão

A sondagem (§2.9) mostra **CDN do TSE e Querido Diário respondendo 200**. O texto fixo do
`/status` está desatualizado e afirma o contrário — corrigir (R12) e **re-rodar os ETLs**
(`etl:bens-historico`, `etl:receitas`, `etl:tse`, `etl:municipal`).

### 7.2 A descoberta que destrava a Integridade (25% do IDIP)

**Existe API pública, sem autenticação, do TCU**, com dados que a metodologia exige. Verificado
por requisição direta em 12/10/2026, host `https://certidoes.apps.tcu.gov.br`, `POST` com corpo
`{}` e **sem chave**:

| Endpoint (`POST`) | Registros | Conteúdo |
|---|---|---|
| `/api/publico/responsaveis-contas-irregulares/exportar-para-csv?paginaAtual=1&tamanhoPagina=100000` | **47.978** | CADIRREG histórico |
| `/api/publico/responsaveis-inidoneos/exportar-para-csv?...` | 127 | inidôneos |
| `/api/publico/responsaveis-inabilitados/exportar-para-csv?...` | 780 | inabilitados |
| `/api/publico/responsaveis-fins-eleitorais/exportar-para-csv?...&anoEleicao=2026` | **9.201** | Lista Eleitoral 2026 |

Colunas do CADIRREG: `Nome | CPF/CNPJ | UF | Município | Processo | Link do processo |
Acórdãos | Trânsito em julgado`. Versões JSON paginadas trazem também o número do acórdão.
Dados brutos preservados em `data/raw/tcu/` (gitignored).

**O achado decisivo para a promessa de presunção de inocência:** as quatro listas são, **por
construção, apenas de decisões com trânsito em julgado** — o TCU exclui decisões não transitadas,
arquivamentos terminativos, condenados só em multa e decisões anuladas ou suspensas. Ou seja: a
trava de integridade pode ser aplicada **sem julgamento editorial caso a caso**, que é
exatamente o que a metodologia exige.

**Periodicidade:** a Lista Eleitoral de 2026 foi publicada em 04/08/2026 e é **atualizada
diariamente até 18/12/2026** — nomes **entram e saem**. O ETL precisa **remover** quem saiu, não
apenas inserir; e o cadastro histórico é de atualização contínua.

**Armadilhas registradas:** `tamanhoPagina` é ignorado (é sempre *full dump*); encoding
**Latin-1 com BOM**; `sep=|` na primeira linha e cabeçalho na segunda; o campo `Município` é o
domicílio **residencial da Receita Federal**, não o eleitoral (não serve como sinal forte de
identidade); não há SLA formal (é a API do front-end, não documentada) → **salvar o CSV bruto +
SHA-256 por data** como prova de auditoria.

### 7.3 Hipóteses descartadas por verificação

| Hipótese inicial | Resultado da verificação |
|---|---|
| "Resolver o STF pelo CNJ DataJud" | **Descartada.** O alias `api_publica_stf` **não existe** (HTTP 404) — o STF não está no DataJud. Pior: o DataJud **não devolve nome de parte, advogado ou CPF**, só metadados do processo. **Valor para identificar parlamentar ≈ zero** |
| "Usar o Corte Aberta do STF" | **Descartada para este fim.** O domínio antigo não resolve (NXDOMAIN); o painel atual é agregado (acervo, decisões, tempo de tramitação) **sem recorte por parlamentar** e depende de engine Qlik. O portal bloqueia automação (403) |
| "Certidão do TCU automatizada" | **Descartada.** A emissão exige captcha (HTTP 412). As **listas** são automatizáveis; a **certidão** não |
| "Querido Diário inutilizável" | **Parcialmente incorreta.** O host responde (301); neste ambiente houve falha de TLS — vale re-testar antes de descartar |

**Conclusão do STF:** o caminho é **LAI/e-SIC** (Fala.BR, prazo de 20 + 10 dias) pedindo o rol de
AP/Inq contra parlamentares. Não há atalho técnico — e insistir em scraping do portal do STF só
gera 403 e risco jurídico.

### 7.4 Portal da Transparência: chave gratuita e o que rende

Spec OpenAPI completa e pública em `https://api.portaldatransparencia.gov.br/v3/api-docs`
(109 rotas). Autenticação por header `chave-api-dados`; **a chave é gratuita** e obtida em
`portaldatransparencia.gov.br/api-de-dados/cadastrar-email` — **o cadastro precisa ser feito no
navegador** (há verificação humana). Endpoints úteis: `/ceis`, `/cnep`, `/ceaf`,
`/acordos-leniencia`, `/peps` e `/servidores`.

Os parâmetros aceitam busca por **`nomeSancionado`** — ou seja, **dá para consultar sem CPF**.
Cobertura são sanções **federais** e atingem majoritariamente **pessoas jurídicas**, então o
rendimento direto sobre parlamentares pessoa física é baixo; o valor real é flagrar
**parlamentar sócio de empresa sancionada**.

### 7.5 Como casar com os 594 parlamentares sem armazenar CPF

A chave do problema: o projeto proíbe armazenar CPF, e as listas do TCU expõem CPF. Mas a
**API da Câmara também expõe o CPF do deputado** (verificado:
`GET dadosabertos.camara.leg.br/api/v2/deputados/{id}` → campo `cpf`). Isso permite:

| Nível | Método | Qualidade | Veredito |
|---|---|---|---|
| **A** | **CPF efêmero, nunca persistido**: monta o índice em memória, faz o join exato, **descarta o CPF antes de gravar**. Persiste só `matched`, `matchMethod`, `matchScore`, `sourceUrl`, processo/acórdão/trânsito | **Determinística** | **Recomendado** |
| B | Impressão não reversível: nome normalizado + nascimento + UF (TSE) | Boa, não determinística | Alternativa |
| C | Só nome + UF | Fraca | **Último recurso, nunca pontuando** |

**Risco de homônimos é o maior risco jurídico do projeto:** o CADIRREG tem 28.559 pessoas
distintas, com muitos nomes comuns. Mitigações obrigatórias: exigir **≥ 2 atributos
independentes** concordantes; limiar alto (≥ 0,95 automático, 0,88–0,95 para **revisão humana**);
**nome isolado nunca pontua**; tolerar falso negativo em vez de falso positivo; canal de
retificação (LGPD art. 18) e histórico de correções; `soft delete` para quem sai da lista.
Linguagem jurídica estrita já adotada no projeto.

**Expectativa realista:** o público dessas listas é majoritariamente municipal. O cruzamento com
594 parlamentares federais deve gerar **poucos matches** — isso é resultado legítimo, não falha.
Para dar densidade à dimensão, somar CEIS/CNEP por `nomeSancionado` e, se houver apetite, a LAI
ao STF.

### 7.6 Oportunidade de calendário

A eleição foi em **04/10/2026** (há 8 dias) e há turno em disputa. Os dados de candidaturas 2026
já estão públicos (`consulta_cand_2026.zip`, 21.013 registros) e a **Lista Eleitoral do TCU é
atualizada diariamente até a diplomação (18/12/2026)**. A plataforma ainda reflete a composição
anterior — há uma janela clara de relevância editorial.

---

## 8. Frente F — E-mail, autenticação, rate limiting e observabilidade

### 8.1 O par indivisível: e-mail + rate limit

O RIPD registra o risco: *"conta com e-mail não verificado votando (dado sensível)"*. Resolver
exige **e-mail transacional** (não existe hoje) **e** rate limiting com estado compartilhado.
Fazer só o e-mail **cria um vetor novo**: qualquer script dispara reenvios, queima a cota diária
do provedor e **derruba a recuperação de senha de todo mundo**.

O rate limit atual (`middleware.ts`) é **Token Bucket em memória, por instância** — o próprio
comentário do código reconhece. Em serverless o limite efetivo é `60 req/min × nº de instâncias`
e zera a cada cold start. **Não conta como mitigação de brute-force.**

### 8.2 Recomendações verificadas

| Frente | Recomendação | Custo |
|---|---|---|
| E-mail | **Resend free** (3.000/mês, teto 100/dia, região São Paulo), subdomínio dedicado, DKIM+SPF+DMARC; `suporte@` por Cloudflare Email Routing | US$ 0 |
| Verificação | E-mail verificado **antes** de permitir voto; gate no servidor, não só na UI | US$ 0 |
| Rate limit | **Upstash Redis free** (500k comandos/mês) + `@upstash/ratelimit`, **só em rotas sensíveis**; falhar fechado em auth/voto | US$ 0 |
| Erros | **Sentry free** — o código já está instrumentado e dormente; falta só o DSN | US$ 0 |
| Cron/uptime | Manter UptimeRobot (já em uso) + heartbeat para o snapshot mensal | US$ 0 |
| Captcha | Cloudflare Turnstile em cadastro/reenvio (grátis) | US$ 0 |

**Sobre autenticação:** não migrar NextAuth v4 → v5 (o v5 está em `5.0.0-beta.32` e o Auth.js foi
absorvido pelo time do Better Auth; a própria mantenedora recomenda Better Auth para projetos
novos). O v4 está em modo manutenção de segurança **e está atualizado** (4.24.15). Com **0
usuários**, migrar para Better Auth custaria 1–3 dias; depois do lançamento, custa muito mais.
É uma janela que fecha — decisão do controlador, não urgência técnica.

**LGPD ao ativar cada serviço:** Sentry, Resend, Upstash e Turnstile viram **subprocessadores**
(registrar no RIPD e na Política); Resend e Sentry guardam dados nos **EUA** (transferência
internacional, art. 33) — desligar armazenamento de mensagens no Resend e usar
`sendDefaultPii: false` + denylist no Sentry, nunca enviando e-mail, voto ou IP cru.

---

## 9. Frente G — Engenharia e qualidade

| Lacuna | Evidência | Recomendação |
|---|---|---|
| **Zero testes automatizados** | não há Vitest/Jest/Playwright; só `verify:scoring` e `verify:identity` | Adicionar **Vitest** cobrindo rotas de API e motores; o CI já existe e leva ~1 min |
| **Erros engolidos** | `catch {}` em 8 rotas; `/api/rankings` devolve `BANCO_INDISPONIVEL` **para qualquer** erro | Logar a causa real no servidor (agora invisível sem Sentry) e devolver status correto |
| **Sem `error.tsx` de segmento** | só `global-error.tsx` | Um erro em uma rota derruba a página inteira |
| **`/status` e `/metodologia` com texto fixo** | Afirmam que **TSE e Querido Diário estão bloqueados** — a sondagem de hoje mostra **HTTP 200 nos dois**. Ocorrências: [`status/page.tsx`](../..//apps/web/src/app/status/page.tsx#L113), [`metodologia/page.tsx`](../..//apps/web/src/app/metodologia/page.tsx#L81) ("aguardando acesso ao CDN do TSE") e [`metodologia/page.tsx`](../..//apps/web/src/app/metodologia/page.tsx#L475) | Tornar a saúde das fontes **medida** pelo mesmo probe usado nesta avaliação; corrigir os textos estáticos. Numa plataforma de transparência, errar sobre as próprias fontes custa credibilidade |
| **Middleware em todas as rotas** | matcher cobre tudo, inclusive páginas estáticas | Restringir a matcher (`/api/*` + rotas com CSP necessário) reduz CPU no Edge |
| **`.env` local aponta para produção** | `db:seed`, `db:load-*` gravam em produção | Já mitigado com guarda no `db:seed`; estender aos demais scripts destrutivos |

---

## 10. Roadmap priorizado

### Agora — 1 dia, US$ 0 (risco baixo, ganho alto)

1. `regions: ["gru1"]` no `apps/web/vercel.json` + redeploy (**R1**).
2. `DATABASE_URL` → 6543 com `pgbouncer=true&connection_limit=1` (**R3**).
3. `next` → 15.5.27 (**R11**).
4. Sentry DSN (**R9**).
5. Corrigir a linha de backup no RIPD (**R4**, parte documental).

### Próximas 2 semanas — US$ 0

6. Cache de dados com `unstable_cache` + `revalidateTag` nas rotas dinâmicas (**R2**).
7. Workflow de `pg_dump` cifrado para R2/B2 + teste de restauração (**R4**).
8. Resend + verificação de e-mail + Upstash rate limit, **no mesmo ciclo** (**R8**).
9. `/status` com probe real das fontes (**R12**).
10. Vitest nos motores e nas rotas de API (**R10**).

### 30–90 dias — decisões

11. **Integridade**: carga do TCU + Portal da Transparência, com revisão humana (**R6**).
12. Re-rodar ETLs de TSE e Querido Diário (**R7**).
13. **Supabase Pro (US$ 25)** no gatilho de egress (**R5**).
14. Avaliar **Better Auth** enquanto a base é 0.
15. Decidir sobre incorporar o resultado eleitoral de 2026.

---

## 11. O que NÃO fazer

- **Não migrar NextAuth v4 → v5** — beta de projeto absorvido; a versão atual está segura.
- **Não trocar de plataforma** para resolver latência: o ganho vem de região + cache, não de
  outro hospedeiro.
- **Não usar Vercel Pro como primeira resposta** ao egress: o cache resolve antes e de graça.
- **Não indexar a busca como prioridade** — o `Seq Scan` leva 0,5 ms; o custo é rede.
- **Não armazenar CPF** nem publicar dumps em repositório público.
- **Não aplicar trava de integridade sem `trânsito em julgado`** — viola a promessa de presunção
  de inocência da metodologia.
- **Não ativar e-mail transacional sem rate limit compartilhado** — derruba a recuperação de
  senha de todos.

---

## 12. Anexo — como cada número foi obtido

| Evidência | Comando/origem |
|---|---|
| Latência `/ranking` | 10 requisições HTTP sequenciais à produção, cronometradas |
| 177 KB/request | `JSON.stringify` do resultado da query real de `/ranking` |
| Cota de egress unificada | `supabase.com/docs/guides/platform/manage-your-usage/egress` |
| Preços/limites Supabase | `supabase.com/pricing.md` |
| Fair use Vercel (doações) | `vercel.com/docs/limits/fair-use-guidelines` (atualizado 2026-09-14) |
| Regiões de função | `vercel.com/docs/functions/configuring-functions/region.md` + API de projetos |
| `EMAXCONNSESSION` | erro literal do Prisma/Postgres capturado em produção |
| Transaction pooler | teste com `PrismaClient({ datasourceUrl })` nas portas 5432 e 6543 |
| CVEs do NextAuth | `api.github.com/advisories/GHSA-x445-f3h2-j279` e `GHSA-7rqj-j65f-68wh` + versão instalada |
| Vulnerabilidades de deps | `npm audit --omit=dev` |
| Estado das fontes | requisições HTTP diretas aos endpoints oficiais (§2.9) |
| Tamanho do banco | `pg_database_size` e `pg_total_relation_size` por tabela |
| Modelos vazios | `count()` em 27 modelos |
