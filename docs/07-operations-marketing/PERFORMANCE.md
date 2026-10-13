# Performance

**Todos os números deste documento foram medidos e estão registrados no próprio
repositório.** Nenhum é estimado. Onde não há medição, está escrito **não medido**
ou **não verificado** — não há número inferido.

Fontes: [`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md),
[`docs/06-devops-deployment/AUDITORIA_PRODUCAO.md`](../06-devops-deployment/AUDITORIA_PRODUCAO.md),
`apps/web/vercel.json`, `apps/web/next.config.ts`, `apps/web/src/lib/prisma.ts`.

Documentos relacionados: [MONITORING.md](MONITORING.md) (o que é observado),
[ANALYTICS.md](ANALYTICS.md) (não há medição de CWV real),
[SEO.md](SEO.md) (o sitemap tem cache de borda próprio).

## 1. O ganho maior do projeto: região + pool (medido)

A maior causa isolada de lentidão era **física**, não de código: as funções
serverless rodavam em **`iad1` (Washington, D.C.)** com o banco em **`sa-east-1`
(São Paulo)**. Cada requisição atravessava o continente duas vezes.

Correções aplicadas no commit **`780e941`** ("perf: regiao gru1, transaction pooler
6543 e next 15.5.27") e registradas como R1 e R3:

| Item | Antes | Depois |
|---|---|---|
| Região das funções | `iad1` (Washington) | **`gru1` (São Paulo)** — `apps/web/vercel.json` |
| `DATABASE_URL` de produção | pooler em **session mode** (5432) | pooler em **transaction mode** (6543) com `pgbouncer=true&connection_limit=1` |
| `directUrl` | ausente | porta 5432, no schema e nas envs (exigido por `prisma migrate`) |
| `next` | 15.5.0 | **15.5.27** (corrige GHSA-4jqv-mc3x-m676 e GHSA-mcj8-r9mp-w47p) |

### Resultado medido em produção — `/ranking`, 10 requisições

| | min | p50 | máx | média |
|---|---|---|---|---|
| **Antes** | 1.563 ms | 1.625 ms | 2.621 ms | **1.740 ms** |
| **Depois** (após aquecer o cache de borda) | **238 ms** | **328 ms** | 661 ms | **354 ms** |

**Queda de ~80% na média e na mediana, sem alterar uma linha de código de
aplicação.** Só região, pool e versão.

**Evidência de que a causa era distância:** o mesmo código e o mesmo banco
respondiam em **505 ms** quando a aplicação rodava **no Brasil, localmente**. A
diferença de 1,2 s era travessia de continente por requisição.

### Validação antes de tocar em produção

O pooler em transaction mode foi testado **antes** de ir a produção: primeiro com o
Prisma isolado, depois com a aplicação inteira local contra a porta 6543 —
`/ranking` 638 ms, `/partidos` 258 ms, `/projetos` 671 ms, todas as rotas 200 — e só
então a variável foi trocada na Vercel. **Nenhuma janela de indisponibilidade.**

`count` no transaction mode: **688 ms** (vs 3.995 ms no session mode).

## 2. O recurso escasso é **egress**, não CPU

Segunda medição que muda prioridades. Do documento de avaliação (§2.2):

| Medição | Valor |
|---|---|
| Dados devolvidos pelo banco em **cada** request de `/ranking` | **177 KB** |
| Cota de egress do Supabase Free (unificado: banco + auth + storage + realtime) | **5 GB/mês** |
| `/ranking` sozinho com **28 mil** visitas/mês | ~**5 GB — 100% da cota** |
| Com **100 mil** visitas/mês (só `/ranking`) | ~**17,7 GB — 3,5× a cota** |
| Tamanho do banco | **98 MB** (limite Free: 500 MB) |
| Maior tabela | `SessionAttendance` — **53 MB**, 166.825 linhas |

**Nuance que muda tudo:** o consumo **não vem só das visitas ao site**. Cada
`createMany` em lote e cada dump do ETL rodando da máquina local **também contam egress**.
Backups manuais pelo pooler também. Ou seja: a carga de dados compete com o tráfego
pelo mesmo recurso.

**Quando a cota é estourada no Free:** a organização entra em período de graça e
depois é **restrita**.

Consequência de priorização: mitigar egress vale mais que mitigar latência. E a
ferramenta para isso é **cache**, não otimização de query.

## 3. Cache: o que `force-dynamic` realmente significa

**Correção de premissa importante, registrada no repositório:** *"`force-dynamic`
desliga todo cache"* é **falso**. Segundo a documentação do Next 15 citada na
avaliação:

> `force-dynamic` equivale a marcar `fetch()` como `{ cache: 'no-store' }` — é uma
> afirmação sobre **`fetch`**. O **Data Cache** continua ativo, e `unstable_cache` usa
> exatamente esse cache: *"persist the result across requests and deployments"*.

| Camada | Afetada por `force-dynamic`? |
|---|---|
| `fetch()` | ✅ sim, vira `no-store` |
| Data Cache do Next | ❌ **não** — continua disponível |
| `unstable_cache` | ❌ não — funciona e usa o Data Cache |
| Cache de borda da Vercel | ❌ não — depende de `Cache-Control` / `revalidate` |

### Medição de cache em produção

| Rota | `x-vercel-cache` | `cache-control` |
|---|---|---|
| `/`, `/metodologia` | **HIT** | `public, must-revalidate, max-age=0` |
| `/ranking`, `/status`, `/partidos` | **MISS** | `no-store, private` |

**Números do build:** **10 das 27 páginas** declaram `force-dynamic` e o build marca
**13 das 27 como dinâmicas (ƒ)**. As outras caem no modo dinâmico por usarem
cookies/sessão, não por escolha explícita.

**Causa raiz legítima:** o build do CI roda **sem banco** (`DATABASE_URL` falso), então
páginas que dependem de dados não podem ser pré-renderizadas no build. Ver
[TESTING.md](../03-development-process/TESTING.md) §2.

### O que **não** existe

Busca no fonte por `unstable_cache` e `revalidateTag`: **nenhuma ocorrência**. O
cache de dados **não está implementado** — é a recomendação R2 da avaliação, não uma
realidade. Ver T-10.

### O cache que existe: o sitemap

O único cache explícito no código é o cabeçalho do sitemap
(`apps/web/src/lib/sitemap.ts`):

```
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400
```

Justificativa no código: *"O sitemap muda pouco e é caro de montar (varre o
catálogo): vale cache de borda com revalidação em segundo plano."* É o padrão
correto e serve de modelo para o resto.

## 4. Core Web Vitals: **não medidos**

**Não há nenhuma medição de LCP, INP ou CLS neste projeto.** Não há Vercel Speed
Insights, não há `web-vitals`, não há CrUX. Verificado: nenhuma ocorrência de
`analytics`, `gtag` ou similar no fonte de `apps/web/src`.

O que existe são **medições de servidor** (tempo de resposta HTTP) — §1 — e
medições de **payload** (§2). Nenhuma delas é uma métrica de experiência de usuário:
um HTML que chega em 238 ms e bloqueia a thread principal por 3 s tem um LCP ruim e
uma resposta HTTP ótima.

**Esta é a maior lacuna de performance do projeto**, e está registrada em
[ANALYTICS.md](ANALYTICS.md) §4 como a recomendação mais defensável (Vercel Speed
Insights, sem cookie).

### O que se sabe sobre payload

Da auditoria de produção de 2026-09-29 (tamanho das respostas HTML):

| Rota | Tempo | Tamanho |
|---|---|---|
| `/` | 0,20 s | 27 KB |
| `/ranking` | **3,12 s** | **1,5 MB** |
| `/projetos` | 2,31 s | 65 KB |
| `/status` | 2,52 s | 20 KB |

O caso apontado: *"`/ranking` demora 3,1s e retorna 1,5MB (598 parlamentares em uma
única tabela HTML). Aceitável para MVP, mas otimizar com paginação ou lazy loading
quando houver tráfego real."*

**Estado atual:** `apps/web/src/app/ranking/page.tsx` tem `PAGE_SIZE = 100` e fatia a
lista antes de renderizar, com paginação acessível
(`aria-label="Paginação do ranking"`). O comentário do arquivo diz que a paginação
"corta o payload sem alterar a ordem nem os dados".

**O tamanho atual do HTML de `/ranking`, com a paginação em vigor, não foi medido.**
As duas medições existentes (1,5 MB e 354 ms) são de datas e configurações
diferentes e **não devem ser combinadas** como se descrevessem o mesmo estado.

### `next/image`

Configurado em `apps/web/next.config.ts`, com `remotePatterns` para **exatamente
quatro origens** (e só elas):

```
https://www.camara.leg.br
https://dadosabertos.camara.leg.br
https://www.senado.leg.br     (https e http)
```

É o mecanismo disponível para otimizar as fotos de parlamentar — as imagens vêm de
fontes oficiais e são o maior ativo visual das páginas de perfil. Adicionar origem
nova exige editar o `next.config.ts` **e** considerar a CSP
(`img-src 'self' data: https:` já permite `https:`, mas `next/image` falha
**antes** da CSP, no otimizador, se o host não estiver na lista).

**Não verificado:** qual formato/largura o otimizador está servindo em produção, se
as fotos usam `priority` na primeira dobra, e o peso médio de imagem por perfil.

## 5. Conexões: o incidente que definiu o pool

| Medição | Valor |
|---|---|
| Erro capturado | `FATAL: (EMAXCONNSESSION) max clients reached in session mode - pool_size: 15` |
| Sintoma | HTTP **500/503 por 1–2 min** em páginas dinâmicas após deploys |
| `connection_limit` em `prisma.ts` | **ausente** — o default do Prisma é `num_cpus × 2 + 1`, isto é, cada instância abria várias conexões |
| Teste do transaction mode com o Prisma **deste projeto** | **funciona** — `count` 688 ms (vs 3.995 ms), ranking 163 ms, `$transaction([...])` OK |

**Correção de premissa:** o `pool_size: 15` **não é teto do plano gratuito** — é um
**default configurável** no painel do Supabase. O teto do compute Nano (Free) é de
**60 conexões diretas / 200 via pooler**. Existe, portanto, uma **segunda mitigação
gratuita**: elevar o `pool_size` para ~40. O transaction pooler continua sendo a
correção estrutural; elevar o `pool_size` é paliativo útil.

**Nota sobre `lib/prisma.ts`:** o arquivo é mínimo (9 linhas) e **não define
`connection_limit`** — a limitação vem da URL (`?connection_limit=1`), não do código.
O padrão de instância única em desenvolvimento está lá
(`globalForPrisma.prisma`), mas isso é sobre hot reload, não sobre pool.

## 6. Redis: definido, não usado

`docker-compose.yml` sobe um Redis na porta 16379. O `.env.example` lista
`REDIS_URL` **comentado**, marcado como *"cache de rankings — Fase 3"*.

**Verificado:** busca no fonte de `apps/web/src` por `redis`/`Redis` não retorna
**nenhuma ocorrência**. O Redis é infraestrutura preparada, sem consumidor. Subi-lo
não altera comportamento nenhum.

O documento de avaliação discute cache com Redis e conclui que *"um TTL simples de
Redis faz o oposto (todos os requests concorrentes…)"* — isto é, cache ingênuo sem
proteção contra avalanche. A recomendação do projeto para cache é
`unstable_cache` + `revalidateTag`, não Redis.

## 7. O que foi recomendado e **não** foi aplicado

Da avaliação de alternativas, ordem por ganho/risco: **R1** (região) ✅, **R3**
(pooler transaction) ✅, **R11** (next 15.5.27) ✅. O restante:

| Item | Recomendação | Situação |
|---|---|---|
| **R2** | Cache de dados com `unstable_cache` + `revalidateTag` nas rotas dinâmicas | ❌ não aplicado (T-10) |
| **R4** | Workflow de `pg_dump` cifrado para R2/B2 + **teste de restauração** | ❌ não aplicado (T-03) |
| **R12** | `/status` com probe real das fontes | ❌ não aplicado (T-05) |
| **R5** | Supabase Pro (US$ 25) no **gatilho** de egress | ⏸ decisão futura |
| **R10** | Vitest nos motores e nas rotas de API | ❌ não aplicado (T-04) |

**Medição que corrigiu um diagnóstico errado:** a busca foi medida em **4.190 ms** e
isso sugeriu falta de índice. **Estava errado** — era *cold start*. Medições
repetidas deram 105–900 ms, e o `EXPLAIN ANALYZE` mostra `Seq Scan` com **0,5 ms de
execução** (o `LIMIT 8` para cedo). **A busca não é problema de índice**; o custo é
ida e volta até o banco. Criar `pg_trgm`/`tsvector` continua útil para volume futuro
(`pg_trgm` e `unaccent` **estão disponíveis, não instaladas**), mas **não** é a
prioridade que a primeira medição sugeria.

Esta é a lição metodológica do documento: **medir uma vez e concluir é como este
projeto já errou.**

## 8. Limites de plataforma que condicionam performance

| Limite | Valor | Efeito |
|---|---|---|
| Egress Supabase Free | **5 GB/mês** unificado | Já dimensionado em §2 |
| Tamanho do banco | 500 MB (Free) | 98 MB hoje — margem confortável |
| CPU do middleware no Hobby | **50 ms em média** (Fair Use Guidelines oficial, atualizada 2026-09-14) | Relevante: o `middleware.ts` roda em **todas** as rotas (matcher amplo). A avaliação recomenda restringir a matcher a `/api/*` + rotas que precisam de CSP |
| Região | Hobby = **região única** | É por isso que `gru1` foi escolhido em vez de multi-região |

## 9. Checklist ao mexer em performance

1. **Meça antes de concluir.** Repita a medição — *cold start* já produziu um
   diagnóstico falso de "falta de índice" neste projeto.
2. **Meça na mesma configuração que você vai afirmar.** As medições de 1,5 MB e de
   354 ms são de estados diferentes; combiná-las é erro.
3. **Pergunte qual recurso é escasso:** egress, não CPU.
4. **`force-dynamic` não impede cache.** Não remova a diretiva para "poder cachear" —
   use `unstable_cache`, que funciona com ela.
5. **Antes de adicionar dependência de performance, verifique a necessidade com
   medição.** A regra vale aqui como em qualquer lugar
   ([RULES.md](../03-development-process/RULES.md) §3.4).
6. **Se mexer em `/ranking`, meça o payload de novo** e atualize T-11.
7. **Nunca otimize o que não foi medido.** O projeto tem um caso documentado de
   diagnóstico errado por medição única.

## 10. Não medido / não verificado

- **Core Web Vitals reais (LCP, INP, CLS) em qualquer rota.** Não há instrumentação.
- **Tamanho atual do HTML de `/ranking`** com a paginação de `PAGE_SIZE = 100` em
  vigor.
- **Peso e formato das imagens** servidas por `next/image` em produção; se a foto
  principal do perfil usa `priority`.
- **Tempo de resposta dos blocos grandes do sitemap** (`/sitemap/N.xml` com 4.000
  entradas cada).
- **Custo de CPU do middleware** por requisição — relevante pelo teto de 50 ms
  médios do plano Hobby, mas não instrumentado.
- **Tempo de execução do `recalculate-scores`**: o `apps/pipeline/README.md` afirma
  "594 parlamentares ~1 min". **Não verificado** nesta documentação.
- **Impacto de performance de qualquer mudança feita após 2026-10-12** (a data da
  última medição registrada). O trabalho de SEO (`sitemap`, `robots`, metadata) e o
  redesenho da home são **posteriores** a essa medição: **o efeito deles em
  performance não foi medido**.
