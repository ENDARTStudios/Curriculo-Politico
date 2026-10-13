# RLS — Row Level Security no PostgreSQL

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Status:** ❌ **RLS não está configurado.** Nenhuma tabela tem `ENABLE ROW LEVEL SECURITY`, nenhuma `POLICY` existe e nenhum papel de banco dedicado foi criado.

> Este documento descreve **o modelo de acesso que realmente existe** (Prisma com
> um único papel de banco), **por que a ausência de RLS importa** e **o que
> seria necessário para adotá-lo como defesa em profundidade**. RLS é um recurso
> do PostgreSQL/Supabase; ele **não** é configurado por Prisma e **não** é
> ligado por padrão.

---

## 1. Verificação: o que foi checado e o que foi encontrado

| Verificação | Método | Resultado |
|---|---|---|
| `ENABLE ROW LEVEL SECURITY` em qualquer migration | busca por `ROW LEVEL SECURITY` em `apps/web/prisma/migrations/**/*.sql` | ❌ **Nenhuma ocorrência** |
| `CREATE POLICY` | busca em `migrations/**/*.sql` | ❌ Nenhuma |
| `CREATE ROLE` / `GRANT` / `ALTER DEFAULT PRIVILEGES` | busca em `migrations/**/*.sql` | ❌ Nenhuma |
| Uso do cliente Supabase (`@supabase/supabase-js`) em runtime | busca no repositório | ❌ Não existe — **toda** a camada de dados é Prisma |
| Uso de `service_role` / chave anon do Supabase | busca no repositório | ❌ Não existe |

**Conclusão verificada:** o projeto fala com o Postgres **exclusivamente via
Prisma**. O Supabase aparece aqui como *Postgres gerenciado* — não como BaaS
com Data API/PostgREST no caminho. Isso é decisivo para avaliar o valor de RLS
neste projeto (§4).

---

## 2. O modelo de acesso atual, em detalhe

### 2.1 Uma única credencial, com poder total

```
                      ┌─────────────────────────────────────────────┐
   Navegador  ──────► │  Vercel Edge (middleware: rate limit + CSP) │
                      └───────────────────┬─────────────────────────┘
                                          │  Serverless (Node)
                                          ▼
                      ┌─────────────────────────────────────────────┐
                      │  Prisma Client  (apps/web/src/lib/prisma.ts)│
                      │  singleton por instância                    │
                      └───────────────────┬─────────────────────────┘
                                          │  DATABASE_URL (pooler 6543,
                                          │  transaction mode, connection_limit=1)
                                          ▼
                      ┌─────────────────────────────────────────────┐
                      │  Supabase Postgres sa-east-1                │
                      │  UM papel de banco · TODOS os privilégios   │
                      │  RLS: desligado em todas as tabelas         │
                      └─────────────────────────────────────────────┘

   ETL / migrações ─── DIRECT_URL (porta 5432) ──► mesmo banco, mesmo poder (+ DDL)
```

**Pontos que definem o modelo:**

1. **Não há identidade de usuário no banco.** `apps/web/src/lib/prisma.ts` cria
   **um** `PrismaClient` por instância serverless, sem qualquer parâmetro de
   sessão, sem `SET ROLE`, sem `SET app.current_user_id`. Para o Postgres, **todo
   request é o mesmo sujeito**.
2. **A autorização é 100% de aplicação.** O `WHERE userId = …` nas rotas é a
   única barreira que impede um usuário de ler/escrever dado de outro. Ele está
   correto hoje ([`RBAC.md`](./RBAC.md) §2.1), mas é **a única** barreira.
3. **A fronteira entre ETL e runtime não é de privilégio.** `DATABASE_URL` e
   `DIRECT_URL` são variáveis distintas (pooler vs. direto) por razões de
   *compatibilidade de protocolo* — transaction mode não suporta migrations — e
   **não** por menor privilégio. Ambos os papéis escrevem em produção com poder
   total. Confirmado: os 33 scripts de `apps/pipeline/scripts/` instanciam
   `new PrismaClient()` diretamente (ex.: `recalculate-scores.ts` L17,
   `load-legal-records.ts` L12), inclusive os que apenas leem
   (`verify-snapshot.ts` L9).
4. **Não há `SET` de contexto por transação.** O único `$transaction` do código
   é `prisma.$transaction([...])` em `api/consent/route.ts` L50–57 — uma
   transação em lote, sem contexto de identidade.
5. **A connection string é a chave-mestra.** Quem tem `DATABASE_URL` executa
   `DELETE FROM "UserBillVote"` sem passar por nenhuma checagem de aplicação.
   É a ameaça **T2** de [`THREAT_MODELING.md`](./THREAT_MODELING.md).

### 2.2 Consequência direta

O comentário do schema já registra a parte de conexão
([`schema.prisma`](../../apps/web/prisma/schema.prisma) L7–13). O que ele não
diz — e precisa estar dito em algum lugar — é que **`DATABASE_URL` de runtime e
`DIRECT_URL` de ETL têm o mesmo poder sobre os dados**. A separação é de
transporte, não de autorização.

---

## 3. Por que o Supabase não impõe nada por padrão

Fatos que explicam a ausência de RLS (e que costumam ser mal-entendidos):

- **RLS é opt-in.** No PostgreSQL, uma tabela **sem** `ENABLE ROW LEVEL
  SECURITY` é legível e gravável por qualquer papel com `GRANT` sobre ela. Nada
  é negado por omissão.
- **RLS só filtra para papéis não-*owner* — e `BYPASSRLS` ignora tudo.** O
  *owner* da tabela (e qualquer papel com `BYPASSRLS` ou `SUPERUSER`, como o
  `postgres` do Supabase) **atravessa as policies**. RLS **não** protege contra
  o próprio dono da conexão.
- **RLS é do PostgREST/Data API, no desenho original do Supabase.** Ele existe
  para permitir que o **cliente** (navegador, com a chave anon) fale direto com
  o banco com segurança. Neste projeto **o cliente nunca fala com o banco**:
  quem fala é o Prisma, no servidor, com uma credencial privilegiada.
- **Prisma não gerencia RLS.** Não há sintaxe no schema Prisma para policy; RLS
  exige SQL manual em migration (`CREATE POLICY`) ou execução no painel.

Portanto: **RLS não é "uma caixa que ficou desmarcada por descuido"** — é um
controle desenhado para um modelo de acesso que este projeto **não usa**.

---

## 4. Então RLS não serve para nada aqui? Não — serve como defesa em profundidade

Mesmo sem Data API, RLS tem valor real **se** combinado com um papel de banco de
privilégio mínimo e com contexto de sessão. O argumento honesto:

### 4.1 O que RLS **não** resolve neste projeto

| Expectativa | Realidade |
|---|---|
| "RLS impede o vazamento da `DATABASE_URL`" | ❌ **Não impede.** Com `BYPASSRLS`/owner, quem tem a string lê tudo. RLS só limita se o papel de conexão **não** for owner e não tiver `BYPASSRLS` |
| "RLS substitui a checagem de autorização nas rotas" | ❌ Não sem propagar identidade ao banco; e a autorização de aplicação precisaria existir de qualquer forma |
| "RLS protege a camada de engajamento por padrão" | ❌ Não, sem `ENABLE` + `POLICY` para o papel de runtime |

### 4.2 O que RLS **de fato** adiciona (cenários concretos)

| Cenário | Sem RLS | Com RLS + papel restrito |
|---|---|---|
| Bug em uma rota faz `userBillVote.findMany()` sem `where userId` | Devolve **os votos de todos** (dado sensível de todos) | Devolve apenas os votos do contexto da sessão — **falha segura** |
| Função nova esquece o filtro de dono | Vazamento silencioso | Vazamento impossível para o papel de runtime |
| `DATABASE_URL` de runtime vaza | `SELECT *` em tudo, incluindo e-mails e votos | Ainda lê tudo o que o papel de runtime pode ler — **mas** um papel de runtime sem `SELECT` em `User.password`/`Account.refresh_token` reduz o dano |
| Script de ETL roda por engano contra produção | Escreve em tabelas de usuário | Papel de ETL **sem** `INSERT/UPDATE/DELETE` nas tabelas de usuário → erro em vez de dano |
| Consulta ad hoc no painel Supabase (SQL editor) | Vê tudo | Vê o que o papel permitir (se o painel usar o papel restrito) |

O ganho real é **contra erro de aplicação**, não contra atacante com a
credencial. Isso é exatamente o que "defesa em profundidade" significa — e é
coerente com o fato de a ameaça mais provável deste projeto ser **o próprio
operador rodando o script errado** (`THREAT_MODELING.md` T3).

---

## 5. Riscos específicos do modelo atual que RLS atacaria

1. **Voto é dado sensível e mora na mesma tabela que o e-mail.** Alternativa mais
   simples e ainda eficaz que RLS: **mover `UserBillVote` para um schema
   separado** com `GRANT` distinto, ou pelo menos revisar os privilégios por
   tabela. RLS e separação de privilégio de tabela resolvem a mesma classe de
   problema; a segunda é mais simples de operar.
2. **`Account` guarda `refresh_token`, `access_token` e `id_token`.** Com Google
   OAuth ativo, esses campos contêm tokens OAuth de terceiros em texto claro.
   Nenhuma rota os expõe — mas nenhum privilégio de banco os protege.
3. **Um `User` com poder total de leitura sobre `User` significa que um bug de
   `select` vaza e-mails**, e o vínculo e-mail↔voto é precisamente o "ativo mais
   sensível do projeto" (anexo de observabilidade, §4.4).

---

## 6. Se for adotar RLS: o desenho que funcionaria neste projeto

Adotar RLS **sem** mudar o modelo de conexão não entrega nada. A sequência
mínima:

### Passo 1 — Criar papéis de banco distintos (independente de RLS, alto valor)

```sql
-- Runtime da aplicação: só o que o site precisa.
CREATE ROLE cp_runtime LOGIN PASSWORD '…' NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO cp_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cp_runtime;
-- Retirar o que não deve ser lido pela aplicação:
REVOKE SELECT (password) ON "User" FROM cp_runtime;   -- exemplos, ajustar por coluna
REVOKE ALL ON "Account" FROM cp_runtime;              -- se OAuth exigir, conceder só o necessário
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cp_runtime;

-- Curadoria/ETL: pode escrever dados públicos, NÃO escreve dado de usuário.
CREATE ROLE cp_etl LOGIN PASSWORD '…' NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO cp_etl;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "Person","Party","Office","Term","Bill","BillAuthorship","LegislativeAction",
  "SessionAttendance","CampaignFinance","PatrimonyHistory","PoliticianCost",
  "LegalRecord","Score","ScoreSnapshot","VerifiedClaim","MunicipalExpense",
  "StfJustice","StfCase","StfVote","StfScore","HistoricalEra","HistoricalPolitician",
  "FixedBenefit","Bill" TO cp_etl;
-- Sem GRANT algum em "User","Account","Session","UserBillVote","RetificationRequest"
```

Mapeamento para as variáveis: `DATABASE_URL` (runtime) → `cp_runtime`;
`DIRECT_URL` (migrations/ETL) → `cp_etl` (ou um terceiro papel de migration com
DDL). **Isso é o item de maior retorno da lista** — e não exige RLS.

### Passo 2 — RLS para as tabelas de dado pessoal

```sql
ALTER TABLE "UserBillVote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RetificationRequest" ENABLE ROW LEVEL SECURITY;

-- O contexto é definido por transação pela aplicação:
--   SET LOCAL app.current_user_id = '<userId>';
CREATE POLICY votos_do_proprio ON "UserBillVote"
  USING      ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));
-- (idem para User/Account/Session; RetificationRequest é escrita pública, então
--  a policy precisa permitir INSERT sem contexto e restringir SELECT)
```

### Passo 3 — Propagar contexto no Prisma (a parte que costuma ser esquecida)

RLS **só funciona** se cada request carregar a identidade até o banco. Com
Prisma isso significa:

- Executar `SET LOCAL app.current_user_id` **dentro da mesma transação/conexão**
  que fará a query. Com o **pooler em transaction mode (6543)** — que é o modo
  atual — cada statement pode cair em uma conexão diferente: **usar
  `prisma.$transaction` interativo é obrigatório**, e o `SET LOCAL` precisa ser
  o primeiro statement dessa transação.
- Isso muda o desenho do acesso a dados: consultas de página pública **não têm**
  `current_user_id` (por isso `RetificationRequest` e as tabelas públicas ficam
  fora do RLS, ou com policy permissiva explícita).
- Prisma não tem suporte nativo a RLS: o `SET LOCAL` é SQL cru
  (`$executeRaw`) dentro de uma transação interativa — o middleware do Prisma
  (`$extends`) é o lugar natural, e ele precisa saber qual é o usuário, o que
  hoje só existe no cookie/JWT lido no handler.

**Custo honesto:** é um refactor de médio porte na camada de dados, com risco de
regressão em todas as leituras públicas, e o Supabase recomenda-o justamente
para modelos com **muitos usuários e acesso direto ao banco**. Neste projeto, o
Passo 1 entrega a maior parte do benefício por uma fração do risco.

### Passo 4 — Verificar que as policies realmente bloqueiam

RLS mal configurado dá falsa segurança. Testes mínimos:

1. Conectar como `cp_runtime` e rodar `SELECT * FROM "UserBillVote"` **sem**
   `SET LOCAL` → deve retornar **0 linhas** (ou erro), nunca todas.
2. Com `SET LOCAL app.current_user_id = '<outro userId>'` → deve retornar 0.
3. Confirmar `SELECT rolbypassrls FROM pg_roles WHERE rolname='cp_runtime'`
   → `false`. **Se o papel tiver `BYPASSRLS`, todo o exercício é decorativo.**
4. `SELECT relrowsecurity FROM pg_class WHERE relname='UserBillVote'` → `true`.
5. Repetir o teste de páginas públicas (a home e `/ranking` **não** têm usuário
   na sessão) — elas não podem quebrar.

---

## 7. Recomendação

| Ação | Valor | Esforço | Prioridade |
|---|---|---|---|
| **Criar papéis `cp_runtime` e `cp_etl` com privilégio mínimo** | Alto — limita o dano de `DATABASE_URL` vazada e de script rodado por engano | Médio (1 dia + migrations de grant) | **1ª** |
| **Revogar leitura de colunas sensíveis** (`User.password`, `Account.refresh_token`/`access_token`) ao papel de runtime, se viável | Médio | Baixo | 2ª |
| **RLS nas tabelas de dado pessoal + `SET LOCAL` por transação** | Médio — defesa em profundidade contra bug de aplicação | **Alto** (refactor da camada de dados) | 3ª, **depois** de haver log de auditoria e papéis separados |
| **Manter RLS desligado como está, com este documento assumindo a decisão** | — | — | Aceitável por ora, **desde que o risco seja explicitamente assumido** |

**Registro da decisão atual:** RLS **não** é adotado. A justificativa não é
"não dá tempo": é que **o modelo de acesso deste projeto não passa pelo
Data API do Supabase**, o papel de conexão é privilegiado por construção e RLS
sem separação de papéis entregaria sensação de proteção sem proteção. A
alternativa tecnicamente superior **para este caso** é a separação de papéis no
Postgres (§6, Passo 1), que deve preceder qualquer adoção de RLS.
