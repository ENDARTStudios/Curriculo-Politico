# GREEN_COMPUTING — custo computacional real deste projeto

Documento curto e concreto. **Não é um tratado de ESG.** O que está aqui é o que
este repositório **efetivamente faz** para não gastar recurso à toa, o que ele faz
**de propósito** mesmo custando mais, e o que **não faz** — incluindo onde a
ineficiência é conhecida e aceita.

A pergunta prática que este documento responde: *onde o Currículo Político gasta
CPU, conexão e bytes, e o que já foi feito a respeito?*

## 1. Onde o custo está concentrado

| Fonte de custo | Magnitude | Evidência |
|---|---|---|
| **Consultas ao Postgres por requisição** | Toda página de dados é `force-dynamic` — nenhuma é servida de cache de página | 25 ocorrências de `export const dynamic = "force-dynamic"` em `apps/web/src/app/` |
| **`/ranking`** | Reconstruído a cada requisição, com **varredura de todas as `Person`** + último `Term` + último `Score`, ordenação e partição em memória | `apps/web/src/app/ranking/page.tsx` |
| **ETL Python** | Coleta em massa das APIs oficiais; ZIPs de centenas de MB | `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §2.2 (CADIRREG = 11 MB; prestação de contas TSE = 548 MB) |
| **Cargas em lote** | Escrita de dezenas de milhares de linhas | 166.825 `SessionAttendance`, 50.479 `BillAuthorship` (`AUDITORIA_PRODUCAO.md` §0.1) |
| **Sitemap** | Varredura do catálogo de proposições ao montar os arquivos | `apps/web/src/lib/sitemap.ts` |
| **CI/build** | `prisma generate` + `tsc --noEmit` + 2 verificadores + `next build` a cada PR | `.github/workflows/ci.yml` |

Aplicação serverless: **a CPU é do provedor, mas a conta é do projeto** — e o
banco de produção tem compute com teto (60 conexões diretas / 200 via pooler,
`AUDITORIA_PRODUCAO.md` §0.7). Gastar query é gastar dinheiro de doação.

## 2. O que já foi feito (com resultado medido)

### 2.1 Pooler em transaction mode — o maior ganho isolado

| Antes | Depois | Variação |
|---|---|---|
| p50 **1.625 ms** / média **1.740 ms** | p50 **328 ms** / média **354 ms** | **~80% menos** |

Mudança: `DATABASE_URL` para o pooler em transaction mode (6543) com
`?pgbouncer=true&connection_limit=1`, e `regions: ["gru1"]` em
`apps/web/vercel.json` (as funções rodavam em `iad1`/Washington com o banco em
`sa-east-1`/São Paulo). **Sem alterar código de aplicação.** Ver
[ADR-002](ADR.md#adr-002).

**Efeito de eficiência energética:** 1.740 ms → 354 ms de função ativa por
requisição é, aproximadamente, **1/5 do tempo de CPU** e 1/5 da janela de conexão
aberta por acesso. É o tipo de ganho que vale mais que qualquer micro-otimização
de código.

### 2.2 Paginação do `/ranking` — 82% menos bytes

| Antes | Depois |
|---|---|
| ~3,1 s · **1.506 KB** de HTML · 594 linhas numa tabela | **270 KB** (`/ranking?pagina=6` = 43 KB) |

100 linhas por página (`PAGE_SIZE`), com aba separada para quem tem confiança
< 60. A ordem e a semântica não mudaram. Ver
[SCORING_METHODOLOGY.md §5.3](SCORING_METHODOLOGY.md).

**O que isso resolve:** bytes transferidos, parse de HTML no dispositivo do
usuário e memória de renderização. **O que não resolve:** o trabalho de consulta —
a página ainda lê todas as `Person` antes de fatiar (ver §4).

### 2.3 `groupBy` e agregação no banco, não na memória

`recalculate-scores.ts` usa `prisma.legislativeAction.groupBy`,
`billAuthorship.groupBy` e `sessionAttendance.groupBy` para contar votos,
autorias e presenças — em vez de carregar as linhas. `hero-stats.ts` usa
`score.groupBy({ by: ["termId"] })` para descobrir quais termos têm nota, em vez
de trazer todas as linhas de `Score`.

**Ganho:** memória do processo e tráfego banco↔aplicação, proporcional ao número
de linhas que **não** trafega.

### 2.4 `createMany` com `skipDuplicates` em vez de upsert por linha

`snapshot-scores.ts` usa `createMany({ data, skipDuplicates: true })`. O
comentário no código explica: "mais rápido que upsert por linha (500+)".
`apps/pipeline/README.md` eleva isso a regra: *"Cargas grandes usam `createMany`
em chunks — nunca upsert sequencial por registro (lento no pooler)."*

**Por que importa mais que o normal aqui:** o pooler em transaction mode com
`connection_limit=1` torna round-trips sequenciais caros. 500 upserts = 500 idas
ao banco; 1 `createMany` = 1.

### 2.5 Idempotência evita reprocessamento

IDs determinísticos (`score_${termId}_v1`, `tcu_${personId}_${processo}`) fazem
`upsert` funcionar **sem leitura prévia**. Reexecutar uma carga não duplica nem
exige verificar antes — e a camada raw imutável significa que **reprocessar nunca
re-baixa** o dado da rede ([ADR-010](ADR.md#adr-010)). Isso economiza banda,
tempo e chamadas às APIs públicas (que são bem de terceiros).

### 2.6 Cache de borda no único recurso caro e estável

O sitemap varre o catálogo de proposições, mas o resultado muda pouco:

```http
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400
```

Cache de 1 hora na borda, com revalidação em segundo plano por 24h. É a única
resposta da aplicação com cache explícito (`sitemap.ts`).

### 2.7 Assets: zero bibliotecas de terceiros no cliente

| Decisão | Efeito |
|---|---|
| **Sem webfont customizada** — stack padrão do Next | Zero requisição de fonte, zero bloqueio de render, menos dados móveis |
| **Sem biblioteca de animação** — CSS + Tailwind resolvem | Nenhum KB de JS de animação; decisão explícita em `.dsh/skills/curriculo-design-system` §8 |
| **Sem analytics de terceiros** | Nenhum script externo, nenhum beacon, nenhuma requisição de rastreamento |
| **Sem biblioteca de componentes** | Bundle do cliente restrito a interatividade real |
| **CSP `script-src 'self'`** | Impede que qualquer script de terceiro entre por engano |

### 2.8 Playwright sem baixar browser

`playwright.config.ts` usa `channel: "chrome"` (o Chrome do sistema) em vez de
`npx playwright install`: **evita ~280 MB de download por browser** em cada
execução de CI. O workflow de a11y instala **só** o Chrome
(`npx playwright install --with-deps chrome`).

### 2.9 CI rápido por desenho

O job `verify` do `ci.yml` roda **sem banco e sem browser**, com uma
`DATABASE_URL` fictícia (`postgresql://ci:ci@localhost:5432/ci`). Os
verificadores de motor são puros (sem I/O), então o gate de PR não precisa
provisionar infraestrutura. A suíte de browser foi para um workflow **separado**
(`a11y.yml`), rodando contra produção — a justificativa está registrada no próprio
arquivo: *"colocá-la ali atrasaria todo PR e traria flakiness para o caminho
crítico."*

**Efeito:** o CI mais frequente (todo PR) é o mais barato.

### 2.10 Administração com Postgres Alpine e Redis sem consumidor

`docker-compose.yml` usa `postgres:16-alpine` e `redis:7-alpine` — imagens
mínimas. O Redis **sobe mas não é consumido por nenhum código**: custo de
desenvolvimento, zero custo em produção.

## 3. O que é feito de propósito, mesmo custando mais

### 3.1 `force-dynamic` em todas as rotas de dados

Esta é a maior "ineficiência" deliberada do projeto: **nenhuma página de dados é
cacheada**. Cada acesso consulta o banco.

**Por que:** (a) os números mudam a cada carga dos ETLs e congelá-los no build
seria servir dado obsoleto — inaceitável numa plataforma de auditoria; (b) o
build passaria a exigir banco acessível, o que inviabilizaria o CI.

**Trade-off aceito:** correção sobre economia. O caminho para reduzir o custo
**sem** sacrificar correção é cache com invalidação no recálculo — ver §4 e
[ADR-007](ADR.md#adr-007).

### 3.2 `Next/Image` com `unoptimized` nas fotos de políticos

As fotos vêm de domínios oficiais externos (Câmara, Senado) e usam
`unoptimized` (padrão consolidado em `ranking/page.tsx` e na skill de design).
Isso significa **sem redimensionamento no servidor da Vercel** — o navegador
recebe o arquivo da origem.

**Trade-off:** não há gasto de CPU de otimização de imagem na função serverless,
e não há transformação de recurso de terceiro. O custo é bytes maiores no
dispositivo do usuário. É uma escolha que **reduz** consumo de servidor e
**aumenta** o do cliente — coerente com um público majoritariamente móvel?
**Não verificado** se há medição de LCP/bytes por página em produção; nenhum
relatório de performance foi encontrado no repositório.

### 3.3 Não usar Redis hoje

O Redis está disponível e **não é usado**. Não usar é a escolha conservadora: um
cache mal invalidado numa plataforma de auditoria serve nota desatualizada, o que
é pior que gastar query. A adoção exige definir a invalidação no recálculo e no
snapshot — por isso está como item de roadmap, não como melhoria trivial.

## 4. Onde a ineficiência é conhecida e não resolvida

Registrado honestamente. Nenhum destes é surpresa: todos estão no
[ROADMAP](../01-product-discovery/ROADMAP.md) com critério de aceite.

| # | Ineficiência | Custo | Item |
|---|---|---|---|
| 1 | **`/ranking` lê todas as `Person` e ordena em memória.** A paginação cortou bytes, não trabalho de consulta. Há índice em `Score.finalScore` que **não é usado** para ordenar | Proporcional ao total da base, a cada requisição | [C2](../01-product-discovery/ROADMAP.md) |
| 2 | **Sem cache de rankings.** A base de notas muda com recálculo/snapshot (frequência baixa), mas cada acesso refaz a consulta | Query repetida sem necessidade | [C1](../01-product-discovery/ROADMAP.md) |
| 3 | **Afinidade carrega todas as proposições com `tags` e filtra em JS** (`affinity.ts`). `tags` é `Json` e **não tem índice** | `findMany` completo em `/ranking/personalizado` | [C3](../01-product-discovery/ROADMAP.md) |
| 4 | **Rate limit em memória por instância** | Não é custo energético; é **desperdício de recurso sob flood** — baldes recomeçam cheios a cada instância nova | [D3](../01-product-discovery/ROADMAP.md) |
| 5 | **Sitemap monta o XML inteiro em memória** por arquivo (até 4.000 URLs) | Pico de memória por requisição; mitigado por `s-maxage` | — |
| 6 | **Reprocessamento de ETL sem verificação de `sha256`/hash de mudança** | Reexecuta carga mesmo quando o dado bruto não mudou. O hash está recomendado em `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §6, mas **não implementado** | — |

## 5. O que este projeto explicitamente **não** faz

1. **Não faz relatório de emissões de carbono.** Seria número inventado: o
   projeto não mede consumo energético, não tem telemetria de datacenter e não
   controla o PUE dos provedores. Alegar "X kg de CO₂ economizados" seria
   fabricação — e este é um projeto cujo critério de qualidade é não exibir número
   sem medição real.
2. **Não escolhe região por "energia limpa".** A escolha de `gru1` (São Paulo) foi
   por **latência** contra o banco em `sa-east-1`, com ganho medido de 80%. Menos
   tempo de CPU por requisição é o efeito ambiental real — e o motivo foi
   engenharia, não ESG.
3. **Não faz "green hosting" como decisão de produto.** Não há critério de
   sustentabilidade na escolha de provedor registrado no repositório.
4. **Não adota compressão/transformação de imagem** (`unoptimized` — ver §3.2).
5. **Não tem orçamento de performance medido.** Não há Lighthouse CI, nem
   `@next/bundle-analyzer`, nem medição de Web Vitals no repositório. **Não
   verificado** o Core Web Vitals de produção.

## 6. Regras práticas para quem contribui

Decorrentes de tudo acima:

1. **Não adicione dependência de cliente sem necessidade de interatividade.** A
   maioria das páginas é Server Component; um `"use client"` a mais custa JS
   enviado a cada visitante móvel.
2. **Use `groupBy`/agregação no banco**, não `findMany` + laço em JS. Se você
   precisa de um número, peça o número ao banco.
3. **Se você for carregar mais de ~1.000 linhas, use `createMany` em chunks.**
   `upsert` sequencial no pooler é o padrão a evitar.
4. **Idempotência com id determinístico.** Uma carga que precisa ler antes de
   escrever custa o dobro.
5. **Nunca re-baixe dado que já está em `data/raw/`.** Reprocessar é reexecutar o
   `load-*`.
6. **Se for cachear, defina a invalidação no mesmo PR.** Cache sem invalidação
   numa plataforma de auditoria é defeito de correção, não otimização.
7. **Meça antes e depois.** O padrão do projeto é registrar o número
   (`1.506 KB → 270 KB`, `1.740 ms → 354 ms`) no commit, no código ou na doc. Sem
   medição, "otimização" é opinião.
8. **Não adicione webfont, biblioteca de animação ou script de terceiro** sem
   necessidade comprovada e aprovação — há regra explícita para isso na skill de
   design.

## 7. Como medir o que este documento afirma

```bash
# Latência de uma rota (repetir 10× e olhar p50)
curl -o /dev/null -s -w "%{time_total}s  %{size_download} bytes\n" \
  https://www.curriculopolitico.org/ranking

# Volumes vivos da base (sem baixar dado)
curl -s https://www.curriculopolitico.org/api/rankings?limit=5

# Contraste/design (o detector reprova com exit 2)
npm run design:detect

# Verificador de matemática (não faz I/O)
npm run verify:scoring
```

Para medir query, use o log do Prisma ou o painel do Supabase — **não há
instrumentação de query no repositório**, então qualquer afirmação sobre número de
queries por página é **não verificada** sem essa medição.

## 8. Referências

- `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.4, §0.7 e §1–§2 — medições
  de latência, payload e pooler.
- `docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` — avaliação de alternativas
  de infraestrutura.
- [ADR-002](ADR.md#adr-002) (pooler), [ADR-007](ADR.md#adr-007) (`force-dynamic`),
  [ADR-010](ADR.md#adr-010) (camada raw).
- [ARCHITECTURE.md](ARCHITECTURE.md) §10 — riscos de arquitetura.
- [ROADMAP trilha C](../01-product-discovery/ROADMAP.md) — performance e custo.
- `apps/pipeline/README.md` — regras de idempotência e de carga em lote.
- `.dsh/skills/curriculo-design-system/SKILL.md` §8 — performance e imagens.
