# Rotas de API

Referência das rotas HTTP que existem em `apps/web/src/app/api/`. Todo parâmetro,
código de status e formato de resposta abaixo foi lido do código-fonte — não há
especificação aspiracional aqui.

> ## ⚠️ Não existe API pública publicada
>
> **Esta API não é um produto e não tem contrato de estabilidade.** As rotas
> existem para servir a própria interface (`/ranking`, `/comparar`, busca global,
> votação em projetos) e são verificadas pelo smoke de produção por `curl`. Elas
> **não são anunciadas em nenhuma página** — a seção "API pública (em construção)"
> foi removida da home justamente por não pertencer ao funil do eleitor
> ([`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md)).
>
> Antes de publicar qualquer uma delas como API pública, resolva as três lacunas
> da §1: versionamento, autenticação por chave e rate limit **distribuído**.

## 1. Estado atual e o que falta para ser pública

| Requisito de uma API pública | Situação hoje |
|---|---|
| Versionamento (`/api/v1/...`) | ❌ Não existe prefixo de versão |
| Autenticação por chave/token | ❌ Nenhuma rota exige credencial. Todas são abertas |
| Rate limit | 🟡 Sim, mas **por instância**: Token Bucket em memória no `middleware.ts`, 60 req/min para `/api/*`, chave = usuário autenticado (JWT) e, sem sessão, IP |
| Rate limit distribuído | ❌ Não existe — depende de Cloudflare/WAF na frente do deploy, não implementado |
| CORS explícito | ❌ Não há cabeçalho `Access-Control-Allow-*`; qualquer origem pode ler via `fetch` no browser (as rotas são GET sem credencial) |
| Documentação de contrato | ⛔ Este arquivo. Não há OpenAPI/schema versionado |
| Deprecação | ⚠️ Política escrita em [`DEPRECATION_POLICY.md`](../08-knowledge-management/DEPRECATION_POLICY.md), **sem mecanismo técnico** (sem header `Sunset`, sem negociação de versão) |
| Paginação estável | 🟡 `/api/bills` tem; as demais devolvem listas truncadas sem cursor |
| Estabilidade de forma | ⚠️ Os campos são montados `map()` a `map()` nas rotas; renomear uma propriedade do Prisma e a rota muda sem aviso |

**Conclusão honesta:** o que existe é uma **API interna do front-end**, não uma API
de dados públicos. Tratá-la como pública geraria uma promessa que o projeto não
consegue cumprir hoje.

## 2. Convenções comuns

### Prefixo de rate limit

O `middleware.ts` intercepta `pathname.startsWith("/api/")` **antes** de qualquer
rota. Toda resposta de API carrega:

```
X-RateLimit-Limit: 60            # ou 10 no tier crítico
X-RateLimit-Remaining: <n>
```

Ao estourar:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: <segundos>
Content-Type: application/json

{ "error": "RATE_LIMITED",
  "message": "Limite de 60 requisições/minuto excedido. Tente novamente em instantes." }
```

**Tier crítico (10 req/min):** `POST` em `/api/auth/register` e
`/api/auth/callback*`, e `GET` em `/api/auth/callback*`. Alvo: brute-force e sybil.

**Chave do balde:** `u:<id do usuário>` quando há JWT NextAuth válido; caso
contrário `ip:<x-forwarded-for | x-real-ip | "desconhecido">`. O balde é
identificado por `"<limite>:<chave>"`, então o tier geral e o crítico não
consomem do mesmo balde.

### Headers de segurança

Aplicados a **todas** as respostas (não só `/api/`), por `middleware.ts`:

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:;
  script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
  connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self';
  form-action 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Envelope de erro

Duas formas convivem no código, e a diferença importa para quem consome:

| Forma | Onde | Exemplo |
|---|---|---|
| `{ "error": "<CODIGO>", "message": "<texto para humano>" }` | rotas com tratamento elaborado | `/api/rankings`, `/api/compare`, `/api/retificacao`, `/api/bills/[id]/vote`, `/api/account` |
| `{ "error": "<TEXTO>" }` | rotas mais simples | `/api/consent` (`AUTH_REQUIRED`), `/api/bills/[id]/vote` em alguns ramos (`JSON inválido`, `INVALID_VOTE`, `PROJETO_NAO_ENCONTRADO`) |

**Não há um schema único de erro.** Ao consumir, trate `error` como string opaca.

### `dynamic` — 9 das 11 rotas, não todas

Verificação direta por `Select-String -Pattern 'export const dynamic'` em cada
`route.ts`:

| Rota | Declara `dynamic` |
|---|---|
| `account` | ✅ |
| `auth/register` | ❌ |
| `auth/[...nextauth]` | — (só reexporta o handler do NextAuth) |
| `bills` | ✅ |
| `bills/[id]/vote` | ✅ |
| `compare` | ✅ |
| `consent` | ✅ |
| `politicians/[id]` | ✅ |
| `rankings` | ✅ |
| `retificacao` | ✅ |
| `search` | ✅ |

**9 de 11** declaram; `auth/register` e o handler do NextAuth não. Isso é
relevante para quem lê a afirmação "todas as rotas têm `force-dynamic`" — não
têm. O `force-dynamic` existe para impedir pré-renderização, necessária porque o
build do CI roda sem banco (`DATABASE_URL` falso), conforme
[`docs/03-development-process/TESTING.md`](../03-development-process/TESTING.md) §2.
As duas exceções não leem banco no caminho de página, então não sofrem do problema
— mas é uma exceção, não uma regra aplicada uniformemente.

### Tratamento de erro — 5 das 11, também não todas

| Rota | Tem `try/catch` |
|---|---|
| `account`, `auth/register`, `rankings`, `retificacao`, `politicians/[id]` | ✅ |
| `bills`, `bills/[id]/vote`, `compare`, `consent`, `search` | ❌ |

Nas rotas **sem** `try/catch`, uma falha de banco propaga e vira a página de erro
padrão do Next (HTTP 500), **não** o envelope `503 BANCO_INDISPONIVEL`. O contrato
de erro do projeto é aplicado de forma parcial — cada seção abaixo diz qual é o
caso daquela rota.

Nas rotas **com** `try/catch`, quando o `catch` não tem binding (`catch {}`) a
causa real não é registrada em lugar nenhum — ver T-07 em
[`TASKS.md`](../03-development-process/TASKS.md).

---

## 3. `GET /api/rankings`

**Arquivo:** `apps/web/src/app/api/rankings/route.ts`
**Para quê:** é o que a página `/ranking` consome — o topo do IDIP.

### Parâmetros de query

| Nome | Tipo | Default | Regras |
|---|---|---|---|
| `cargo` | string | ausente = todos | Aceita somente `LEGISLATIVE` ou `EXECUTIVE`. Comparado em maiúsculas (`toUpperCase()`), então `legislative` funciona |
| `limit` | número | `10` | `Math.min(Math.max(valor, 1), 50)`. Valor não numérico cai em 10 (`Number(x) \|\| 10`) |

### Filtros aplicados (fixos, não parametrizáveis)

1. `confidenceScore >= 60` — quem tem confiança menor (GRAY) fica **fora do
   ranking**, conforme a metodologia
   ([`docs/02-architecture-design/SCORING_METHODOLOGY.md`](../02-architecture-design/SCORING_METHODOLOGY.md) §5).
   Este arquivo documenta **o contrato da rota**; a **fórmula** do IDIP (pesos por
   perfil, hard caps de 39.9, regra de ranking) está naquele documento e não é
   duplicada aqui.
2. Exclusão de dados fictícios de desenvolvimento:
   `person.externalId` nulo **ou** que não comece com `seed-`. Um `db:seed` local
   nunca contamina o ranking público.
3. Ordenação por `finalScore` descendente. `position` é o índice na lista
   (`index + 1`), não um rank persistido.

### Resposta 200

```json
{
  "filters": { "cargo": "EXECUTIVE", "limit": 10 },
  "ranking": [
    {
      "position": 1,
      "politicalName": "Nome Político",
      "office": "Governador",
      "jurisdiction": "SP",
      "party": "XX",
      "finalScore": 64.0,
      "reliability": "GREEN",
      "confidence": 90
    }
  ]
}
```

`party` é `null` quando o termo não tem partido. `cargo` devolve `"TODOS"` quando
o parâmetro não foi informado.

### Erros

| Status | Corpo | Quando |
|---|---|---|
| `400` | `{ "error": "CARGO_INVALIDO", "message": "Parâmetro \"cargo\" deve ser EXECUTIVE ou LEGISLATIVE." }` | `cargo` presente e fora do conjunto |
| `503` | `{ "error": "BANCO_INDISPONIVEL", "message": "Não foi possível acessar o banco de dados. Suba o Postgres com: docker compose up -d db" }` | **qualquer** exceção do Prisma |

### Limitações

- O `catch` é **sem binding** (`catch {}`): a causa real do erro não é registrada
  em lugar nenhum. Com o Sentry desativado (sem DSN), um erro de query é
  invisível. Registrado como T-07 em
  [`TASKS.md`](../03-development-process/TASKS.md).
- `503` é devolvido para **qualquer** erro, inclusive um bug de código. O status
  não distingue "banco fora" de "query quebrada".
- A mensagem de erro expõe um comando de desenvolvimento (`docker compose up -d db`)
  na resposta HTTP de produção.

---

## 4. `GET /api/politicians/[id]`

**Arquivo:** `apps/web/src/app/api/politicians/[id]/route.ts`
**Para quê:** perfil público — dados cadastrais, todos os termos com a última nota
de cada um, e registros jurídicos filtrados por LGPD.

### Path parameter

| Nome | Regras |
|---|---|
| `id` | Aceita **o id interno (cuid) ou o `externalId` da fonte** (Câmara/Senado/TSE). `findFirst({ where: { OR: [{ id }, { externalId: id }] } })` |

Aceitar as duas formas é o que permite usar a URL da fonte na barra de endereço e
o que faz `/sitemap` poder anunciar `externalId ?? id`.

### Resposta 200

```json
{
  "id": "cuid...",
  "externalId": "204554",
  "civilName": "Nome Civil",
  "politicalName": "Nome Político",
  "photoUrl": "https://www.camara.leg.br/...",
  "terms": [
    {
      "office": { "type": "LEGISLATIVE", "name": "Deputado Federal", "jurisdiction": "SP" },
      "party": { "acronym": "XX", "name": "Partido X" },
      "startYear": 2023,
      "endYear": null,
      "score": {
        "version": "1.1.0",
        "finalScore": 72.4,
        "confidence": 85,
        "reliability": "GREEN",
        "dimensions": { "integrity": 50, "productivity": 78, "transparency": 90 },
        "calculatedAt": "2026-10-01T00:00:00.000Z"
      }
    }
  ],
  "legalRecords": [
    { "type": "...", "status": "...", "court": "...", "sourceUrl": "...", "retrievedAt": "..." }
  ]
}
```

`terms` vem ordenado por `startYear` **descendente** e cada termo traz **apenas a
nota mais recente** (`take: 1`, `orderBy: calculatedAt desc`). `score` é `null`
quando o termo não tem nota calculada. `party` é `null` sem partido.
`legalRecords` vem ordenado por `retrievedAt` descendente.

### Filtro LGPD aplicado na resposta

Antes de serializar, a rota remove:

```ts
.filter((record) => record.type !== "CLEARED" && record.status !== "ARQUIVADO")
```

Ou seja: absolvição (`CLEARED`) e processo **arquivado** nunca saem pela API.
Os campos expostos são só `type`, `status`, `court`, `sourceUrl`, `retrievedAt` —
deliberadamente **não** há número de processo completo nem nome de terceiro.
Regra em `AGENTS.md` §LGPD e
[`RULES.md`](../03-development-process/RULES.md) §1.5.

### Erros

| Status | Corpo | Quando |
|---|---|---|
| `404` | `{ "error": "POLITICO_NAO_ENCONTRADO", "message": "Nenhum político encontrado para o identificador \"<id>\"." }` | Nada encontrado por id interno nem externo |
| `503` | `{ "error": "BANCO_INDISPONIVEL", ... }` | Qualquer exceção do Prisma (mesmo `catch {}` sem log de `/api/rankings`) |

### Limitações

- Sem paginação de `terms` nem de `legalRecords`: o payload cresce com o histórico
  do político.
- O `id` informado é ecoado na mensagem de 404 **sem escape**, em uma resposta
  `application/json` — não há XSS refletido (o content-type é JSON), mas o texto
  não é sanitizado.

---

## 5. `GET /api/bills`

**Arquivo:** `apps/web/src/app/api/bills/route.ts`
**Para quê:** listagem paginada de proposições com autorias e contagem de voto
popular. É a única rota com paginação de verdade.

### Parâmetros de query

| Nome | Tipo | Default | Regras |
|---|---|---|---|
| `page` | inteiro | `1` | `Math.max(parseInt(valor) \|\| 1, 1)`. Negativo ou `0` vira 1 |
| `limit` | inteiro | `20` | `Math.min(parseInt(valor) \|\| 20, 50)` — **teto de 50**, sem piso explícito antes do `Math.min` (valor negativo chega ao `take`) |
| `q` | string | vazio | Busca `contains` **insensitive** em `title` |
| `type` | string | vazio | Igualdade exata em `Bill.type` |
| `year` | string numérica | vazio | Intervalo `[YYYY-01-01, YYYY-12-31]` em `Bill.date` |

### Resposta 200

```json
{
  "bills": [
    {
      "id": "cuid...",
      "externalId": "2643776",
      "title": "PL 1234/2023",
      "type": "PL",
      "date": "2023-04-11T00:00:00.000Z",
      "authors": ["Nome Político"],
      "popularVotes": { "favor": 0, "contra": 0 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 32000, "totalPages": 1600 }
}
```

`authors` traz no máximo **3** nomes (`take: 3`). `date` pode ser `null` (o campo é
nullable no schema). `popularVotes` é a contagem da votação popular — **camada de
engajamento que nunca altera o IDIP**.

### Detalhe de eficiência

A contagem de votos por proposição é feita com **uma** query
(`prisma.userBillVote.groupBy({ by: ["billId", "vote"], where: { billId: { in: [...] } } })`)
e depois agregada em `Map`, em vez de N queries por página. O comentário no código
registra a intenção.

### Erros

Esta rota **não tem `try/catch`**. Uma falha de banco propaga e vira a página de
erro padrão do Next — ou seja, o contrato de `503` das outras rotas **não vale
aqui**. Consistência de tratamento de erro é uma lacuna conhecida.

| Status | Quando |
|---|---|
| `200` | Sempre, se o banco responder |
| `500` | Falha de banco não tratada (comportamento padrão do Next) |

---

## 6. `GET`/`POST /api/bills/[id]/vote`

**Arquivo:** `apps/web/src/app/api/bills/[id]/vote/route.ts`
**Para quê:** votação popular em projetos. É a rota com **mais regras de negócio**
do projeto e a que carrega a camada LGPD de dado sensível.

### `GET` — contagens públicas + meu estado

Path parameter `id`: aceita id interno **ou** `externalId`.

Resposta `200`:

```json
{
  "bill": { "id": "...", "externalId": "...", "title": "...", "type": "PL" },
  "favor": 12,
  "contra": 3,
  "votingOpen": true,
  "me": { "vote": "FAVOR", "consented": true }
}
```

- `favor` / `contra` vêm de `groupBy(["vote"])`; ausência do grupo resulta em `0`.
- `votingOpen` é **hardcoded `true`** — não existe janela de votação implementada.
  Não interprete o campo como funcionalidade.
- `me` é `null` para visitante anônimo **ou** para usuário autenticado que ainda
  não votou naquele projeto.
- `me.consented` reflete `consentimentoPoliticoAtivo()`, calculado sobre o estado
  atual do usuário.

Erro: `404 { "error": "PROJETO_NAO_ENCONTRADO" }`.

### `POST` — registrar/alterar voto

**Corpo:**

```json
{ "vote": "FAVOR" }
```

`vote` aceita **exatamente** `"FAVOR"` ou `"CONTRA"` (comparação estrita, sem
normalização de caixa).

**Ordem das verificações — a ordem é o contrato:**

| # | Verificação | Status | Corpo |
|---|---|---|---|
| 1 | Sessão ausente | `401` | `{ "error": "AUTH_REQUIRED", "message": "Faça login para votar (contas são gratuitas)." }` |
| 2 | Corpo não é JSON | `400` | `{ "error": "JSON inválido" }` |
| 3 | `vote` diferente de `FAVOR`/`CONTRA` | `400` | `{ "error": "INVALID_VOTE" }` |
| 4 | Projeto inexistente | `404` | `{ "error": "PROJETO_NAO_ENCONTRADO" }` |
| 5 | Conta com menos de 24h | `403` | `{ "error": "ACCOUNT_TOO_NEW", "message": "Contas com menos de 24 horas ainda não podem votar." }` |
| 6 | Sem consentimento específico ativo | `403` | `{ "error": "CONSENT_REQUIRED", "message": "Votar requer consentimento específico para tratamento de opinião política (dado sensível). Autorize no painel de votação — é revogável a qualquer momento." }` |
| — | Sucesso | `200` | o objeto `UserBillVote` persistido |

**Notas de implementação que importam:**

- A verificação de consentimento vem **depois** da de idade da conta. Um usuário
  novo sem consentimento recebe `ACCOUNT_TOO_NEW`, não `CONSENT_REQUIRED`.
- `MIN_AGE_MS = 24 * 60 * 60 * 1000`, comparado a `Date.now() - user.createdAt`.
  Com `user` nulo, a idade calculada é enorme e a checagem **passa** — a proteção
  real é o gate de consentimento imediatamente depois.
- A gravação é `upsert` sobre a chave composta `userId_billId`: **um voto por
  usuário por projeto, alterável**.
- O consentimento é verificado **antes** da escrita. Sem ele, nada é persistido.

**LGPD.** O voto é tratado como **dado pessoal sensível** (opinião política,
Art. 5º, II e Art. 11 da LGPD). O texto do consentimento está em
`apps/web/src/lib/consent.ts` (`POLITICAL_CONSENT_TEXTO`) e afirma explicitamente:
uso exclusivo para exibir a contagem agregada e o próprio voto, nunca
compartilhado, **nunca altera a nota IDIP**, revogável com eliminação dos votos.

### Limitações

- Sem `try/catch`: falha de banco vira erro padrão do Next, não `503`.
- `votingOpen: true` hardcoded (ver acima).
- Nenhum teste unitário cobre os 6 ramos. Registrado como prioridade 1 em T-04.

---

## 7. `GET /api/search`

**Arquivo:** `apps/web/src/app/api/search/route.ts`
**Para quê:** busca unificada em **4 entidades** — políticos, partidos,
proposições e figuras históricas. Alimenta a `SearchBar` do header.

### Parâmetros

| Nome | Regras |
|---|---|
| `q` | `trim()`. Se `q.length < 2`, **retorna cedo**: `{ "results": null, "total": 0 }` com status 200 |

Note a assimetria: com consulta curta, `results` é `null`; com consulta válida, é
um objeto. Consumidores precisam tratar os dois casos.

### Resposta 200 (consulta válida)

```json
{
  "results": {
    "politicians": [{ "id": "...", "name": "...", "party": "XX", "office": "Deputado Federal", "photo": "https://..." }],
    "parties": [{ "id": "...", "acronym": "XX", "name": "...", "position": "...", "memberCount": 42 }],
    "bills": [{ "id": "...", "externalId": "...", "title": "...", "type": "PL", "authors": ["..."], "date": "..." }],
    "historical": [{ "id": "...", "name": "...", "office": "...", "era": "...", "score": 88 }]
  },
  "total": 4
}
```

**Limite de 8 por categoria** (as 4 consultas usam `take: 8`), executadas em
`Promise.all`. `total` é a **soma dos resultados efetivamente devolvidos**, não a
contagem no banco — portanto nunca passa de 32.

Campos de fallback: `party` e `office` de político viram `"—"` (travessão) quando
não há termo/partido. `era` é `null` se a figura histórica não tem era.

### Campos pesquisados

| Entidade | Campos | Ordenação |
|---|---|---|
| Políticos | `politicalName`, `civilName` (insensitive) | `politicalName` asc |
| Partidos | `acronym`, `name`, `ideology` (insensitive) | — |
| Proposições | `title` (insensitive) | `date` desc |
| Históricas | `name` (insensitive) | — |

### Erros

Sem `try/catch` — falha de banco vira erro padrão do Next.

### Limitação de performance

O `EXPLAIN ANALYZE` medido (`Seq Scan` com **0,5 ms** de execução) mostra que a
busca **não** é problema de índice; o custo é a ida e volta até o banco. `pg_trgm`
e `unaccent` estão disponíveis no Postgres mas **não instaladas** — item de escala,
não de dor atual (`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` §2.6).

---

## 8. `GET /api/compare`

**Arquivo:** `apps/web/src/app/api/compare/route.ts`
**Para quê:** dados para comparação lado a lado (até 5 políticos).

### Parâmetros

| Nome | Regras |
|---|---|
| `ids` | **Obrigatório.** Lista separada por vírgula. `split(",")` + `trim()` + `filter(Boolean)` + `slice(0, 5)` |

### Resposta 200

```json
{
  "politicians": [
    {
      "id": "...",
      "externalId": "...",
      "name": "Nome Político",
      "party": "XX",
      "office": "Deputado Federal",
      "uf": "SP",
      "score": {
        "final": 72.4, "confidence": 85, "status": "GREEN",
        "dimensions": { "integrity": 50, "productivity": 78, "transparency": 90 }
      },
      "stats": { "votes": 120, "bills": 14, "attendance": 88 }
    }
  ]
}
```

**Dois detalhes de contrato:**

1. Só o **último termo** de cada pessoa entra (`take: 1`, `startYear` desc), e só a
   **nota mais recente** dele.
2. A ordem do array **preserva a ordem dos ids pedidos** — o código faz
   `idList.map(id => resultado.find(r => r.id === id) ?? null)`. Um id inexistente
   ou com `externalId` não suportado vira **`null` na posição**, não é omitido.
   Atenção: esta rota casa **apenas por `id` interno** (`where: { id: { in: idList } }`),
   diferente de `/api/politicians/[id]` que aceita `externalId`.

### Erros

| Status | Corpo | Quando |
|---|---|---|
| `400` | `{ "error": "IDS_OBRIGATORIO", "message": "Parâmetro \"ids\" é obrigatório (ex: ids=id1,id2)." }` | `ids` ausente |
| `400` | `{ "error": "IDS_OBRIGATORIO", "message": "Nenhum id válido informado." }` | `ids` presente mas vazio após o filtro |

Sem `try/catch` para erro de banco.

---

## 9. `POST`/`GET /api/retificacao`

**Arquivo:** `apps/web/src/app/api/retificacao/route.ts`
**Para quê:** canal de retificação e direitos do titular (LGPD Art. 18).
**Público, sem login** — o titular pode não ter conta na plataforma.

### `POST` — registrar solicitação

**Corpo:**

```json
{
  "requesterName": "Nome Completo",
  "requesterEmail": "email@dominio.com",
  "targetType": "POLITICO",
  "targetName": "Nome do alvo",
  "description": "Descrição com pelo menos 20 caracteres",
  "sourceUrl": "https://fonte-oficial..."
}
```

| Campo | Regra | Default |
|---|---|---|
| `requesterName` | `trim()`, mínimo **3** caracteres | — |
| `requesterEmail` | `trim().toLowerCase()`, validado por regex `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` | — |
| `description` | `trim()`, mínimo **20** caracteres | — |
| `targetType` | Só aceita `POLITICO`, `USUARIO`, `OUTRO` | Qualquer outro valor vira `"OUTRO"` (não é erro) |
| `targetName` | `trim()` ou `null` | `null` |
| `sourceUrl` | `trim()` ou `null` | `null` |

**Resposta `201`:**

```json
{ "protocolo": "RET-2026-A7K2M9", "status": "...", "createdAt": "..." }
```

**Formato do protocolo** (`gerarProtocolo()`): `RET-<ano atual>-<6 caracteres>`.
O alfabeto exclui caracteres ambíguos (`I`, `O`, `0`, `1`) e usa
`crypto.getRandomValues` — é imprevisível, não sequencial.

**Erros de validação:**

| Status | Corpo |
|---|---|
| `400` | `{ "error": "JSON inválido" }` |
| `400` | `{ "error": "NOME_INVALIDO", "message": "Informe seu nome completo." }` |
| `400` | `{ "error": "EMAIL_INVALIDO", "message": "Informe um e-mail válido para retorno." }` |
| `400` | `{ "error": "DESCRICAO_CURTA", "message": "Descreva a solicitação com pelo menos 20 caracteres." }` |

### `GET` — consultar status

| Parâmetro | Regras |
|---|---|
| `protocolo` | `trim()`; busca com `equals` + `mode: "insensitive"` |
| `email` | `trim().toLowerCase()` — tem de **casar exatamente** com o do registro |

Resposta `200`:

```json
{ "protocolo": "RET-2026-A7K2M9", "status": "...", "createdAt": "...", "updatedAt": "..." }
```

| Status | Corpo |
|---|---|
| `400` | `{ "error": "PARAMETROS_AUSENTES", "message": "Informe protocolo e e-mail." }` |
| `404` | `{ "error": "NAO_ENCONTRADA", "message": "Protocolo e e-mail não correspondem." }` |

Exigir protocolo **e** e-mail para consultar é o controle de acesso: só quem
recebeu o protocolo consegue ver o status. Não há e-mail de confirmação
implementado (o envio transacional está no roadmap, não no código).

---

## 10. `POST /api/auth/register`

**Arquivo:** `apps/web/src/app/api/auth/register/route.ts`
**Para quê:** criar conta por e-mail e senha (bcrypt). Alvo do tier crítico de rate
limit (10 req/min).

**Corpo:**

```json
{
  "email": "email@dominio.com",
  "password": "mínimo 8 caracteres",
  "name": "Nome opcional",
  "termsAccepted": true,
  "adult": true,
  "politicalConsent": false
}
```

| Campo | Regra |
|---|---|
| `email` | Obrigatório, `trim().toLowerCase()`, regex de e-mail |
| `password` | Mínimo **8** caracteres |
| `termsAccepted` | **Obrigatório `true`** — clickwrap (Art. 8º LGPD) |
| `adult` | **Obrigatório `true`** — plataforma restrita a 18+ |
| `name` | `trim()` ou `null` |
| `politicalConsent` | **Opcional e granular.** Sem ele a conta é criada normalmente; o usuário apenas não pode votar |

**Resposta `201`:** `{ "user": { "id": "...", "email": "...", "name": "..." } }` —
**nunca** inclui hash de senha.

**Erros:**

| Status | Corpo |
|---|---|
| `400` | `{ "error": "JSON inválido" }` |
| `400` | `{ "error": "EMAIL_INVALIDO" }` |
| `400` | `{ "error": "SENHA_CURTA", "message": "A senha precisa de pelo menos 8 caracteres." }` |
| `400` | `{ "error": "TERMS_REQUIRED", "message": "É preciso aceitar os Termos de Uso e a Política de Privacidade." }` |
| `400` | `{ "error": "ADULT_REQUIRED", "message": "A Plataforma é restrita a maiores de 18 anos." }` |
| `409` | `{ "error": "EMAIL_EM_USO", "message": "Este e-mail já possui conta. Faça login." }` |

**O que é gravado no aceite:** `termsVersion` (valor de `TERMS_VERSION` em
`lib/consent.ts`), `termsAcceptedAt` (timestamp) e, se houver consentimento
político, `politicalConsentVersion` + `politicalConsentAt`. As versões vigentes
são `"2026-09-30"` para `TERMS_VERSION`, `PRIVACY_VERSION` e
`POLITICAL_CONSENT_VERSION`.

Sem `try/catch`: e-mail duplicado em corrida vira erro padrão do Next, não `409`.

---

## 11. `POST`/`DELETE /api/consent`

**Arquivo:** `apps/web/src/app/api/consent/route.ts`
**Para quê:** consentimento específico para dado sensível (opinião política).

Ambos exigem sessão. Sem ela: `401 { "error": "AUTH_REQUIRED" }` (envelope curto).

### `POST` — conceder ou reconceder

Sem corpo. Efeito: grava `politicalConsentVersion` (versão vigente) e
`politicalConsentAt` (agora), e **limpa** `politicalConsentWithdrawnAt` (permite
reconceder após revogação).

Resposta `200`: `{ "consented": true, "politicalConsentAt": "...", "politicalConsentVersion": "2026-09-30" }`

### `DELETE` — revogar

Efeito, em **transação** (`prisma.$transaction([...])`):

1. `prisma.userBillVote.deleteMany({ where: { userId } })` — **elimina TODOS os
   votos do usuário na plataforma**, em todos os projetos.
2. `prisma.user.update({ data: { politicalConsentWithdrawnAt: new Date() } })` —
   registra o timestamp da revogação.

Resposta `200`: `{ "consented": false, "politicalConsentWithdrawnAt": "..." }`

Após a revogação, `POST /api/bills/[id]/vote` passa a responder `403
CONSENT_REQUIRED`. A função `consentimentoPoliticoAtivo()` retorna
`!!politicalConsentAt && !politicalConsentWithdrawnAt`.

**Este é o comportamento mais destrutivo de qualquer rota do projeto.** Um bug
aqui é incidente de LGPD, não bug de UX — é por isso que está na prioridade 1 da
lista de testes ausentes (T-04).

---

## 12. `DELETE /api/account`

**Arquivo:** `apps/web/src/app/api/account/route.ts`
**Para quê:** exclusão de conta e dados pessoais (LGPD Art. 18, VI). Sem corpo.

| Status | Corpo |
|---|---|
| `401` | `{ "error": "AUTH_REQUIRED", "message": "Faça login para eliminar sua conta." }` |
| `200` | `{ "message": "Conta e todos os dados pessoais eliminados em conformidade com o Art. 18, VI da LGPD.", "deletedAt": "<ISO>" }` |
| `500` | `{ "error": "DB_ERROR", "message": "Erro ao eliminar conta." }` |

A exclusão é `prisma.user.delete({ where: { id } })`, e o cascade do schema leva
`UserBillVote` (dado sensível), `Session` e `Account`. **Dados públicos de agentes
políticos não são afetados** — são outro universo de dados.

A rota declara `dynamic = "force-dynamic"` e tem `try/catch` com binding, sendo
uma das poucas que devolve `500 DB_ERROR` em vez de `503 BANCO_INDISPONIVEL`.

---

## 13. `GET`/`POST /api/auth/[...nextauth]`

**Arquivo:** `apps/web/src/app/api/auth/[...nextauth]/route.ts`
**Para quê:** handler do NextAuth v4. É a única rota cuja lógica **não** está neste
diretório — ela vive em `apps/web/src/lib/auth.ts`.

| Configuração | Valor |
|---|---|
| Estratégia de sessão | `jwt` |
| Adapter | `@auth/prisma-adapter` |
| Página de login | `/auth/signin` |
| Providers | `GoogleProvider` **somente** se `GOOGLE_CLIENT_ID` **e** `GOOGLE_CLIENT_SECRET` existirem; `CredentialsProvider` (e-mail + senha, `bcrypt.compare`) sempre |
| Callbacks | `signIn` grava o aceite de Termos no primeiro login OAuth quando `termsAcceptedAt` é nulo; `jwt` injeta `token.id`; `session` expõe `session.user.id` |

O `session.user.id` exposto no callback é o que todas as rotas autenticadas usam
para identificar o usuário.

**Este arquivo não foi lido integralmente nesta documentação** — os arquivos
`[...nextauth]/route.ts` foram verificados quanto à existência e à lógica
delegada em `lib/auth.ts`. Detalhes do handler (por exemplo, se há customização
além do `NextAuth(authOptions)` padrão) não verificados.

---

## 14. Rotas que **não** existem

Documentado para evitar suposição:

| Rota esperada | Situação |
|---|---|
| `/api/parties`, `/api/partidos` | ❌ Não existe. Dados de partido só via página `/partidos` |
| `/api/metodologia` | ❌ Não existe. Metodologia é conteúdo estático em `/metodologia` |
| `/api/snapshot` | ❌ Não existe. Snapshot é script de pipeline (`npm run db:snapshot`) |
| `/api/health`, `/api/status` | ❌ Não existem. Saúde é a **página** `/status` (renderizada no servidor), e o smoke de produção a lê por HTML, procurando a string "Indisponível" |
| `/api/v1/*` | ❌ Nenhuma rota é versionada |
| Webhooks de entrada | ❌ Não existem |

A ausência de endpoint de saúde é uma lacuna real: um monitor de uptime só
consegue verificar a home por HTTP 200, não a saúde do **banco**. O smoke
contorna isso chamando `/api/rankings` e exigindo `ranking.length >= 1`.
