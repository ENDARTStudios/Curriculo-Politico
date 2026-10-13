# MEMORY — decisões e armadilhas

Registro do que o projeto **já decidiu** e das **armadilhas que já custaram tempo**.
Serve para duas coisas: (1) impedir que uma decisão seja rediscutida sem que a
medição que a motivou seja considerada, e (2) impedir que um defeito já diagnosticado
seja diagnosticado de novo.

**Diferença em relação aos documentos vizinhos:**

| Documento | O que contém |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | **O que mudou**, por data e commit |
| [`RULES.md`](../03-development-process/RULES.md) | **O que é obrigatório** hoje, como regra |
| [`RESEARCH.md`](RESEARCH.md) | **O que foi avaliado** e o veredito por ferramenta |
| **MEMORY.md** (este) | **Por que** uma decisão foi tomada e **qual defeito** ela evitou |

Cada entrada traz: **data**, **decisão**, **motivo com medição** e **o que foi
descartado**. Onde a informação não pôde ser confirmada no repositório, está escrito
**não verificado**.

---

## A. Armadilhas operacionais

### A-01 · `next dev` e `next build` compartilham `apps/web/.next`

**Descoberto:** durante o desenvolvimento, com falhas intermitentes de build.

**O problema.** Um servidor de desenvolvimento ativo — **inclusive um órfão** — grava
em `apps/web/.next` enquanto o build lê. Sintomas, todos enganosos:

```
Invariant: no direct app page entry found for /_not-found
ENOENT .../route.js.nft.json
Cannot find module './chunks/vendor-chunks/next.js'
```

**Agravante:** scripts que usam `Start-Process` + `cmd /c` deixam o processo filho
**vivo depois que o pai morre**. O dev server órfão é invisível.

**Medição registrada no repositório:** builds com um dev server órfão ativo falharam
de forma **reprodutível**; **14 builds sem nenhum passaram**.

**Regra:** antes de buildar, confirme que não há `next dev`:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'Curr' -and $_.CommandLine -match 'next' }
```

**Armadilha correlata:** `prisma generate` falha com `EPERM` se o dev server estiver
rodando — ele mantém lock no `query_engine-windows.dll.node`.

**Onde está:** `AGENTS.md`, `DEVELOPMENT.md` §6.1, `.design-review/README.md`.

---

### A-02 · `DATABASE_URL` manda em tudo, inclusive produção

**O problema.** Todo script de dados (`db:load-*`, `db:seed*`, `seed:production`,
`recalculate-scores`, `apply-integrity-caps`, `db:snapshot`) grava no banco que
`DATABASE_URL` apontar. Se o `.env` de desenvolvimento aponta para o Supabase de
produção — que é **exatamente o padrão que o `.env.example` documenta como risco** —
os comandos locais alteram produção.

**Salvaguarda implementada (única):** `npm run db:seed` recusa rodar contra banco
remoto. A checagem, em `apps/pipeline/scripts/seed-dev.ts`, testa
`/@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/` contra a URL. Para forçar:

```
CP_ALLOW_REMOTE_SEED=1
```

com o aviso literal: *"inserindo dados FICTÍCIOS em banco REMOTO."*

**Os demais scripts não têm guarda.** A avaliação de alternativas registra isso como
achado e recomenda *"estender aos demais scripts destrutivos"*.

**Regra:** antes de qualquer script destrutivo, imprima o host da `DATABASE_URL`.

**Onde está:** `README.md`, `AGENTS.md`, `apps/web/.env.example`,
`SETUP.md` §5.

---

### A-03 · A porta 3000 é disputada nesta máquina

**O problema.** Com a 3000 ocupada por outro projeto, o `next dev` troca de porta
sozinho (`Port 3000 is in use, using 3001`) e a suíte Playwright morre no meio da
execução com `ERR_CONNECTION_REFUSED`.

**Decisão:** a suíte sobe o servidor na **3033**, porta improvável, e usa
`reuseExistingServer: false` (o objetivo é testar o código atual, não um servidor
antigo que ficou de pé). O timeout do `webServer` é **180 s** porque o primeiro
`next dev` compila middleware e instrumentation — com 12 s havia falso negativo.

**Onde está:** `playwright.config.ts` (com o motivo escrito em comentário),
`DEVELOPMENT.md` §6.2.

---

### A-04 · `--headless --screenshot --window-size` **ignora** o viewport

**O problema.** A auditoria de responsividade quase foi feita com:

```bash
chrome --headless --screenshot --window-size=390,2400 http://localhost:3000/
```

Isso **não funciona** e falha de um jeito perigoso: em vez de errar visivelmente,
`--window-size` foi **ignorado** e a captura saiu em **756×481** independentemente do
valor pedido. Uma captura com o viewport errado **"prova" overflow que não existe**.

**Consequência real:** a conclusão inicial de que a home quebrava no mobile era
**artefato do instrumento**, não defeito.

**Solução:** `.design-review/capture.cjs` impõe o viewport por **Chrome DevTools
Protocol** (`Emulation.setDeviceMetricsOverride`) e, além da imagem, **mede**
`documentElement.scrollWidth` e lista cada elemento cujo `right` passa do viewport.
Mede a pergunta de verdade em vez de depender de interpretação visual.

**Onde está:** `.design-review/README.md`.

---

### A-05 · Um dev server troca de porta e o cache de `.env` não acompanha

**Nota de manutenção correlata:** o `.design-review/README.md` registra que o dev
server às vezes sobe em outra porta. Confira a porta no log do `npm run dev` antes de
culpar o layout — e lembre que a suíte usa a **3033** por isso (A-03).

**Não verificado:** se há outras armadilhas de ambiente além das documentadas.

---

## B. Antipadrões de medição (o projeto já errou assim)

### B-01 · Medir uma vez e concluir: o caso dos "4.190 ms" da busca

**O erro.** A busca foi medida em **4.190 ms** e a conclusão foi "falta índice".
**Estava errado** — era *cold start*. Medições repetidas deram **105–900 ms**, e o
`EXPLAIN ANALYZE` mostrou `Seq Scan` com **0,5 ms de execução** (o `LIMIT 8` para
cedo). **A busca não é problema de índice**; o custo é ida e volta até o banco.

**Consequência evitada:** criar `pg_trgm`/`tsvector` como prioridade, resolvendo nada.
(`pg_trgm` e `unaccent` estão disponíveis no Postgres, **não instaladas** — item de
escala futura, não de dor atual.)

**Regra:** meça mais de uma vez; distinga *cold start* de custo real; use
`EXPLAIN ANALYZE` antes de concluir sobre índice.

**Onde está:** `docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` §2.6,
`PERFORMANCE.md` §7.

---

### B-02 · Combinar medições de estados diferentes

As duas medições públicas de `/ranking` foram feitas em momentos e configurações
diferentes:

| Medição | Contexto |
|---|---|
| **3,12 s / 1,5 MB** | auditoria de 2026-09-29, funções em `iad1`, **sem** paginação |
| **354 ms** (média, 10 req) | após `gru1` + transaction pooler, 2026-10-12 |

**Além disso**, `PAGE_SIZE = 100` foi adicionado à página depois. **O tamanho atual do
HTML de `/ranking` não foi medido.** Tratar os 354 ms como "o ranking é rápido e leve"
combina duas medições que descrevem estados diferentes.

**Regra:** toda medição carrega data e configuração. Não combine.

---

### B-03 · `force-dynamic` **não** desliga todo cache

**Correção de premissa registrada no projeto:**

> `force-dynamic` equivale a marcar `fetch()` como `{ cache: 'no-store' }` — é uma
> afirmação sobre **`fetch`**. O **Data Cache** continua ativo, e `unstable_cache` usa
> exatamente esse cache: *"persist the result across requests and deployments"*.

| Camada | Afetada? |
|---|---|
| `fetch()` | ✅ vira `no-store` |
| Data Cache | ❌ continua ativo |
| `unstable_cache` | ❌ funciona |

**Consequência:** não remova `force-dynamic` "para poder cachear". E não conclua que
um cache é impossível porque a rota é dinâmica.

**Onde está:** `9917add`, `PERFORMANCE.md` §3.

---

### B-04 · `--window-size` mentiu sobre o mobile

Ver **A-04**. Registrado separadamente porque é um **antipadrão de medição**, não só
de ferramenta: o instrumento falhou em silêncio e produziu uma conclusão falsa.

---

### B-05 · `pool_size: 15` não é teto do plano gratuito

**Correção de premissa, duas vezes.** Primeiro o projeto tratou o `pool_size: 15` como
limite do Supabase Free. Depois corrigiu: é um **default configurável** no painel
(Connection pooling → Database Settings). O teto do compute Nano (Free) é
**60 conexões diretas / 200 via pooler**, com a regra oficial de comprometer até
**80% do `max_connections`** (40% se usar PostgREST intensivamente).

**Consequência:** existe uma **segunda mitigação gratuita** — elevar o `pool_size`
para ~40. A correção estrutural continua sendo o transaction pooler; elevar o
`pool_size` é paliativo útil.

**Onde está:** `ad96088`, `259fb2e`, `PERFORMANCE.md` §5.

---

## C. Decisões de plataforma

### C-01 · Região `gru1` (São Paulo) — a maior causa isolada de latência

**Decisão (12/10/2026, commit `780e941`):** fixar `regions: ["gru1"]` em
`apps/web/vercel.json`.

**Motivo medido:** as funções rodavam em **`iad1` (Washington)** com o banco em
**`sa-east-1` (São Paulo)**. O mesmo código e o mesmo banco respondiam em **505 ms**
localmente no Brasil e em **1.740 ms** de média em produção. A diferença era
**distância física por requisição** — não código, não query.

**Resultado:** `/ranking` de **1.740 ms** → **354 ms** de média (10 requisições),
**queda de ~80%**, sem alterar código de aplicação.

**Descartado:** trocar de plataforma para resolver latência. A avaliação registra
explicitamente *"Não trocar de plataforma para resolver latência: o ganho vem de
região + cache, não de outro hospedeiro"* — inclusive porque **Railway não tem
região de compute no Brasil** (o "Olá, São Paulo" do changelog deles é CDN, não
compute), e Cloudflare Hyperdrive é **inviável nesta arquitetura** (a connection
string só é acessível do Worker; o free limita a 100 mil statements/dia).

**Onde está:** `apps/web/vercel.json`,
`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` §5.2 e §10.

---

### C-02 · Transaction pooler (6543) em produção, `directUrl` na 5432

**Decisão:** `DATABASE_URL` de produção usa o pooler em **transaction mode (6543)**
com `?pgbouncer=true&connection_limit=1`; `directUrl` (5432) fica no schema e nas
envs, porque **`prisma migrate` não funciona em transaction mode**.

**Motivo medido:** o pooler em session mode esgotava com
`FATAL: (EMAXCONNSESSION) max clients reached in session mode - pool_size: 15`,
produzindo **HTTP 500/503 por 1–2 min após deploys**. O `prisma.ts` não definia
`connection_limit`, e o default do Prisma é `num_cpus × 2 + 1` — cada instância
serverless abria várias conexões.

**Validação antes de tocar em produção:** testado primeiro com o Prisma isolado,
depois com a aplicação inteira local contra a 6543 (`/ranking` 638 ms, `/partidos`
258 ms, `/projetos` 671 ms, todas as rotas 200), e só então a variável foi trocada na
Vercel. **Nenhuma janela de indisponibilidade.**

**Onde está:** `apps/web/.env.example`, `apps/web/prisma/schema.prisma`,
`PERFORMANCE.md` §5.

---

### C-03 · O recurso escasso é **egress**, não CPU

**Medição:** cada request de `/ranking` devolvia **177 KB** do banco; a cota do
Supabase Free é **5 GB/mês unificados** (banco + auth + storage + realtime). Com
28 mil visitas/mês, `/ranking` sozinho consumiria **~100% da cota**.

**Nuance que muda a prioridade:** o consumo **não vem só das visitas**. Cada
`createMany` em lote e cada dump do ETL local **também contam**. Backups manuais pelo
pooler também.

**Consequências decididas:** mitigar egress vale mais que mitigar latência; a
ferramenta é **cache**, não otimização de query; e a ordem de prioridade é
`região → read model → unstable_cache` (R1 → R2).

**Descartado:** Vercel Pro como primeira resposta ao egress — o cache resolve antes e
de graça.

**Onde está:** `PERFORMANCE.md` §2,
`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` §2.2.

---

### C-04 · **Não** migrar NextAuth v4 → v5

**Decisão registrada como "não fazer"** em `AVALIACAO_ALTERNATIVAS.md` §11: *"Não
migrar NextAuth v4 → v5 — beta de projeto absorvido; a versão atual está segura."*

**Correlato:** um anexo de pesquisa trazia um "alerta que exige ação hoje" sobre CVEs
do NextAuth. **Estava incorreto** — o projeto já rodava `next-auth@4.24.15`. A
correção está em nota no topo de
`docs/ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md`.

**Onde está:** `AVALIACAO_ALTERNATIVAS.md` §11, `apps/web/package.json`
(`next-auth: ^4.24.15`).

---

### C-05 · Next 15.5.0 → 15.5.27 por segurança

**Decisão:** subir o Next para **15.5.27**, que corrige **GHSA-4jqv-mc3x-m676** e
**GHSA-mcj8-r9mp-w47p** (afetadas `< 15.5.27`). Aplicado junto do `gru1` e do pooler
no commit `780e941`.

---

### C-06 · Supabase Pro apenas no gatilho de egress

**Decisão:** permanecer no **Hobby** e migrar para Pro (US$ 25/mês) **somente quando
o egress for o gargalo medido**. Ordem registrada: `região → read model →
unstable_cache` resolve antes, de graça.

**Onde está:** `AVALIACAO_ALTERNATIVAS.md` §5 e §10 (R5).

---

### C-07 · Redis está preparado e **não é usado**

**Situação:** `docker-compose.yml` sobe Redis na 16379 e o `.env.example` lista
`REDIS_URL` comentado, marcado como *"cache de rankings — Fase 3"*.

**Verificado:** busca em `apps/web/src` por `redis`/`Redis` — **nenhuma ocorrência**.
Subir o Redis não altera comportamento nenhum.

**Recomendação do projeto para cache é outra:** `unstable_cache` + `revalidateTag`.
A avaliação observa que *"um TTL simples de Redis faz o oposto (todos os requests
concorrentes…)"* — cache ingênuo sem proteção contra avalanche.

---

## D. Decisões de dados

### D-01 · `seed-*` nunca aparece em ranking público

**Decisão:** dados fictícios do `npm run db:seed` são identificados por `externalId`
começando com `seed-`, e as consultas públicas os excluem.

**Implementação (note o `OR`, é necessário):**

```ts
OR: [{ externalId: null }, { externalId: { not: { startsWith: "seed-" } } }]
```

O `OR` existe porque `externalId` é **nullable** — um `not` simples descartaria
registros legítimos sem id externo.

**Onde está:** `apps/web/src/app/api/rankings/route.ts`,
`apps/web/src/app/status/page.tsx`.

---

### D-02 · Baseline neutro 50 é **rotulado** na interface

**Decisão:** dimensão sem dados recebe 50 e a UI **identifica** isso como baseline por
ausência de dados (`ScoreBreakdown` mostra o selo por dimensão). Apresentar baseline
como medição é violação.

**Motivo:** a Integridade (**25%, maior peso**) está em baseline 50 porque
`LegalRecord` está vazio. Sem o rótulo, o usuário leria "50 de integridade" como
medição — e a plataforma estaria mentindo sem escrever nenhuma mentira.

**Correlato:** as travas de integridade (condenação transitada em julgado, contas
rejeitadas) **nunca disparam** com dado real. Isso é declarado, não escondido.

**Onde está:** `apps/web/src/components/ScoreBreakdown.tsx`, `/metodologia`,
`AGENTS.md`. Tarefa: T-01.

---

### D-03 · Votação popular **nunca** altera a nota

**Decisão:** a votação popular é camada de engajamento **separada**, e a UI não pode
sugerir o contrário.

**Implementação:** regra escrita no cabeçalho de
`apps/web/src/app/api/bills/[id]/vote/route.ts` e repetida em
`apps/web/src/lib/affinity.ts`. O rodapé do site afirma: *"Sem voto popular: notas
derivadas exclusivamente de dados públicos auditáveis."*

**Correlato LGPD:** o voto é **dado sensível** (opinião política, Art. 5º, II e
Art. 11). Sem consentimento específico ativo, a rota responde `403 CONSENT_REQUIRED`
e **nada é persistido**. A revogação (`DELETE /api/consent`) **elimina todos os votos
do usuário**, em transação.

**Onde está:** `apps/web/src/lib/consent.ts`,
`docs/05-security-compliance/RIPD.md`, `API.md` §6, `API.md` §11.

---

### D-04 · Presunção de inocência é regra de dado, não de copy

**Decisão:** nunca aplicar trava de integridade sem **trânsito em julgado**.
Registrado como proibição explícita: *"Não aplicar trava de integridade sem `trânsito
em julgado` — viola a promessa de presunção de inocência da metodologia."*

**Implementação:** registros com `type === "CLEARED"` ou `status === "ARQUIVADO"` são
**filtrados da resposta pública** em `api/politicians/[id]/route.ts`. O dado
permanece no banco (com `sourceUrl` e `retrievedAt`) para auditoria — **deixa de ser
exposto**, não apagado.

**Padrão reutilizável:** é o modelo de "depreciar dado de terceiro" — parar de exibir
com regra explícita, em vez de apagar. Ver
[`DEPRECATION_POLICY.md`](DEPRECATION_POLICY.md) §3.4.

---

### D-05 · Resumos de proposição são **por categoria temática**, e a UI diz isso

**Decisão:** os resumos em linguagem simples **não são análise do conteúdo de cada
lei**. São gerados por template de tag temática (8 categorias), e o rótulo na UI
deixa isso explícito.

**Motivo:** transparência. Um resumo que parecesse análise individual seria
afirmação não sustentada por dado.

**Onde está:** `apps/pipeline/scripts/generate-bill-summaries.ts` (cabeçalho
explícito), `apps/web/src/components/BillDetails.tsx` (*"Resumo pela categoria
temática do projeto (não é análise do texto…)"*).

**Nota operacional:** o script só processa proposições **sem** resumo — mudar um
template **não** reescreve o que já existe.

---

### D-06 · CPF nunca é propagado, mesmo quando a fonte entrega

**Decisão:** nunca expor CPF, endereço ou dado familiar. Regra do `AGENTS.md` §LGPD.

**Fato que a motiva:** a API da Câmara devolve **CPF em claro** em
`GET /deputados/{id}` — a sondagem registrou `"cpf":"36607606504"`. O Senado **não**
devolve CPF. A regra existe porque a fonte entrega o dado, não por precaução
genérica.

**Decisão correlata:** *"Não armazenar CPF nem publicar dumps em repositório
público."*

**Onde está:** `AGENTS.md`, `RULES.md` §1.5,
`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §4.3,
`INTEGRATIONS.md` §2.2.

---

### D-07 · ETL em lote, com camada raw imutável e idempotência

**Decisão (arquitetura de dados):** o ETL grava JSON em `data/raw/` e **a carga nunca
re-baixa**. Todas as cargas são idempotentes. Cargas grandes usam `createMany` em
chunks — **nunca** upsert sequencial por registro (lento no pooler).

**Descartado:** integração em tempo real com as fontes. Todas as integrações são em
lote.

**Onde está:** `apps/pipeline/README.md`, `INTEGRATIONS.md` §1.

---

## E. Armadilhas de fonte externa (premissas que estavam erradas)

### E-01 · `api-publica.tcu.gov.br` **não existe** — mas o TCU tem API aberta

**Premissa registrada no ETL** (`legal_records.py`): *"TCU: api-publica exige
credenciais (401) — sem endpoint aberto estável."*

**Realidade medida:** o host `api-publica.tcu.gov.br` **não resolve em DNS**. Mas o
TCU mantém **API pública real, aberta e sem autenticação** em
`https://certidoes.apps.tcu.gov.br/api/publico/...`, com paginação JSON e exportação
CSV em massa das **4 listas oficiais**: CADIRREG (**47.980** registros, 11 MB), Lista
Eleitoral (**9.203**), Inabilitados (**782**), Inidôneos (**129**).

**Pegadinhas medidas:** CSV com separador `|` e encoding **Latin-1**;
`tamanhoPagina` **não é honrado** no endpoint de exportação (é sempre full dump);
emissão de certidão exige **captcha** (HTTP 412 sem token) — **não automatizar**;
`certidoes-apf.apps.tcu.gov.br` tem **bloqueio de WAF**.

**Consequência:** a dimensão de maior peso (Integridade, 25%) é **destravável** pelo
lado TCU. Nenhum ETL a consome ainda. Tarefa T-01.

---

### E-02 · O CDN do TSE **não** estava bloqueado

**Premissa:** "CDN do TSE bloqueada" (aparecia em `/status` e `/metodologia`).

**Realidade medida:** `consulta_cand_2026.zip` **200** (3,2 MB),
`consulta_cand_2022.zip` **200** (4,4 MB),
`prestacao_de_contas_eleitorais_candidatos_2022.zip` **200 (548 MB)**,
`certidao_criminal_2026_BR.zip` **200 (69 MB)**. O bloqueio provavelmente era de
**rede/ambiente**, não do TSE.

**Correção aplicada:** textos de `/status` e `/metodologia` corrigidos no commit
`e5956f4`. Tarefa T-05 trata do resíduo.

---

### E-03 · O STF realmente não tem API — confirmado, não presumido

**Premissa:** "STF: portal sem API consolidada (403)". **Confirmada por teste:**

| Tentativa | Resultado |
|---|---|
| `portal.stf.jus.br/processos/` | **403** |
| URLs históricas de certidão | **404** (mortas) |
| `certidoes.stf.jus.br` | **405 em todo GET** (POST-only, não documentado) |
| `POST api-publica.datajud.cnj.jus.br/api_publica_stf/_search` | **404** — alias não existe |

**Achado mais importante sobre o DataJud:** ele **não traz nome de parte** — só
`id`, `tribunal`, `numeroProcesso`, `dataAjuizamento`, `grau`, `nivelSigilo`,
`formato`, `sistema`, `classe`, `assuntos`, `orgaoJulgador`, `movimentos`. **Não
permite identificar um parlamentar.** Uso **não comercial**.

**Caminho que resta e não está implementado:** o arquivo de **certidões criminais de
candidatos do TSE** (`certidao_criminal_2026_BR.zip`, 69 MB) cobre ações penais de
competência originária do STF. É o mais promissor.

**Onde está:** `INTEGRATIONS.md` §6, `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md`.

---

### E-04 · A API v2 da Câmara não serve para despesas nem para ausências

**Dois fatos medidos, ambos escritos no cabeçalho dos ETLs:**

- `/despesas` **está vazia**. O caminho real é o **bulk CSV**:
  `https://www.camara.leg.br/cotas/Ano-{YYYY}.csv.zip`.
- A API v2 **não expõe registro de AUSÊNCIAS** — a frequência oficial sai em **PDF**.
  A presença é **inferida de eventos**, não lida de um campo oficial. Isso é uma
  limitação **metodológica**, não só técnica: a ausência não é um dado da fonte.

**Outros detalhes:** a API não aceita `dataInicio` + `dataFim` juntos (retorna 400);
`/votacoes/{id}/votos` custa **uma requisição por votação** — daí existirem três ETLs
de votação (básico, expandido, histórico).

**Onde está:** `INTEGRATIONS.md` §2.2.

---

## F. Armadilhas de front-end

### F-01 · `prefers-reduced-motion` global **não** alcança animação por JavaScript

**Situação:** a regra em `apps/web/src/app/globals.css` (`@layer base`) zera
`animation-duration`, `animation-iteration-count` e `transition-duration` com
`!important`. Isso cobre **CSS** e **não** cobre:

- Web Animations API (`element.animate()`)
- `requestAnimationFrame` (GSAP, Anime.js, canvas, WebGL)
- `scroll-behavior` acionado por JS

**Mitigação atual: nenhuma.** O risco é **latente**: hoje o projeto **não tem
animação JavaScript** — os três keyframes (`rise`, `fade`, `aurora`) são CSS puro.

**Decisão pendente:** antes da primeira animação JS, escolher entre
(a) escrever `matchMedia("(prefers-reduced-motion: reduce)")` à mão — com o padrão
"pular para o estado final" (`duration: 0`), **não** sumir com o elemento — ou
(b) adotar Motion, a única biblioteca avaliada que respeita reduced-motion
automaticamente. Ver [`RESEARCH.md`](RESEARCH.md).

**Tarefa:** T-13. **Onde está:** `ACCESSIBILITY.md` §5.

---

### F-02 · Um `<pre>` rolável sem teclado reprova em WCAG 2.1.1

**Defeito encontrado em mobile:** bloco `<pre>` com rolagem própria, inalcançável por
teclado. Corrigido com `tabIndex={0}` + `role="region"` + rótulo.

**Generalização:** **todo** elemento com rolagem própria precisa ser alcançável e
rolável por teclado. Vale para tabelas com overflow e gráficos.

---

### F-03 · `text-slate-500` e `text-slate-600` são proibidas para texto

**Medições:** `text-slate-500` sobre `slate-950` = **4,23:1** (reprova AA, mínimo
4,5:1) — estava em **167 lugares / 40 arquivos**. `text-slate-600` = **2,65:1** em
8 lugares.

**Correção:** ambas substituídas por `text-slate-400` = **7,66:1**.

**Classes seguras do projeto:** `slate-400` e acima.

---

### F-04 · CTA branco sobre `sky-500` = 2,71:1

**Medição:** contraste de **2,71:1** — muito abaixo de 4,5:1.

**Correção:** `text-slate-950` sobre `sky-500` = **7,45:1**.

**Como a regressão é impedida:** um teste recalcula o contraste do CTA **em tempo de
execução**, pela fórmula de luminância da WCAG, e exige `>= 4.5`
(`tests/e2e/home.spec.ts`). Não é `axe` — é cálculo real. O padrão
`text-slate-950` sobre `bg-sky-500` também foi aplicado ao botão do
`global-error.tsx`.

---

### F-05 · Link dentro de texto distinguido só por cor reprova em WCAG 1.4.1

**Medição:** `sky-400` (#00bcff) sobre `slate-400` (#90a1b9) = **1,2:1** — abaixo do
mínimo de 3:1 do critério. Afetava **44 links em 24 arquivos**.

**Ponto que quase todos erram:** `hover:underline` **não resolve** — o critério vale no
**estado de repouso**.

**Correção:** sublinhado **permanente, aplicado por contexto** — só em `p`, `li` e
`td`, onde o link está de fato imerso em texto. Sublinhar **todos** os links pioraria
a leitura e mudaria a identidade visual sem ganho. Escape hatch:
`@utility link-sem-sublinhado`, cujo uso exige justificar contraste ≥ 3:1 no
comentário.

---

### F-06 · O `h1` da home é único, e o título não duplica o sufixo

**Duas armadilhas de SEO/estrutura, ambas com teste:**

1. **Um `h1` por página.** Requisito de hierarquia. Verificado nas rotas críticas.
2. **A página filha define apenas o título curto.** O template do layout
   (`"%s · Currículo Político"`) acrescenta o sufixo. Se a página também trouxer o
   nome, o resultado é "Currículo Político · Currículo Político" — e há teste que
   conta as ocorrências e exige `<= 1`.

---

### F-07 · `/politicos` **não existe** como rota de lista

**Armadilha de sitemap:** anunciar `/politicos` no sitemap apontaria o crawler para um
**404**. A rota só existe como `/politicos/[id]`. O comentário em `lib/sitemap.ts`
registra isso — e é uma armadilha fácil de reintroduzir ao "completar" a lista de
rotas estáticas.

**Regra:** antes de adicionar entrada no sitemap, confirme que a rota responde 200.

---

### F-08 · O `sitemap.ts` convencional do Next **não** gera `/sitemap.xml`

**Descoberta (duas falhas concretas, ambas verificadas):**

1. `generateSitemaps` gera `/sitemap/0.xml`, `/sitemap/1.xml`, … mas **não** gera
   `/sitemap.xml`. Confirmado no `app-paths-manifest.json`: só existia
   `/sitemap/[__metadata_id__]/route`. O crawler fica **sem o ponto de entrada padrão
   do protocolo**.
2. Tentar resolver com um Route Handler em `app/sitemap.xml/route.ts` **não funciona**:
   o arquivo de metadata tem **precedência** na rota e o handler é ignorado — o
   `/sitemap.xml` continuava servindo o `urlset` do id 0.

**Solução:** controlar o XML inteiro — índice em `/sitemap.xml` (route handler) e
arquivos em `/sitemap/{id}.xml`.

**Regra derivada:** sitemap vazio declarado é **pior** que ausente — o crawler o
considera válido e **para de procurar**. Por isso id fora da faixa devolve **404**,
não `<urlset>` vazio.

---

### F-09 · O FAQ renderiza as respostas **fora** do HTML inicial

**Situação verificada:** `apps/web/src/app/faq/page.tsx` é `"use client"` e renderiza
a resposta sob `{openIndex === i && (...)}`. As **perguntas** estão no HTML; as
**respostas** só existem depois de interação.

**Consequência:** consumidor que não interage (extração de trecho, crawler de
resposta) não vê o conteúdo. É a lacuna mais concreta de
[AEO.md](../07-operations-marketing/AEO.md) §4.

**Correção proposta:** renderizar pergunta e resposta **sempre no DOM** e usar
`openIndex` apenas para visibilidade (`hidden`, `aria-expanded`, `max-height`). É
pré-requisito para marcar `FAQPage` legitimamente.

---

## G. Decisões de ferramenta de desenvolvimento

### G-01 · Playwright adotado; o eixo é acessibilidade, não regressão visual

**Decisão:** adotar `@playwright/test` + `@axe-core/playwright`, com o eixo de maior
valor sendo a **auditoria de acessibilidade com `wcag22aa`** — não regressão visual.

**Motivo:** o projeto tinha `curl` (smoke) e verificadores de matemática, mas
**nenhum teste que renderizasse uma página**. Isso deixava sem cobertura justamente a
camada onde erros são invisíveis para o TypeScript: contraste, semântica, rótulos
acessíveis e estados do Termômetro. Regressão visual já era coberta por
`.design-review/capture.cjs` e o baseline é por plataforma.

**Custo evitado:** **não** se usa `npx playwright install` localmente — o Chrome do
sistema é usado via `channel: "chrome"`, evitando ~280 MB de download por browser. O
CI instala explicitamente porque o runner não tem Chrome.

**Descartado:** usar a suíte de browser no job de PR (o `verify` do CI roda sem banco
e sem browser, o que o mantém rápido). O workflow de a11y roda **agendado, contra
produção**.

**Consequência aceita:** o gate de a11y é **detecção**, não **prevenção** — uma
violação introduzida num PR chega a produção e é detectada na próxima janela.

**Onde está:** `playwright.config.ts` (com o racional escrito no cabeçalho),
`TESTING.md` §4 e §6.

---

### G-02 · Impeccable adotado com telemetria desligada

**Decisão:** instalar Impeccable (Apache-2.0) como skill + CLI + detector
(`npx impeccable install --providers=dsh`), com **telemetria desligada** em
`.impeccable/config.json`.

**Motivo:** suporta DSH nativamente; o detector é **determinístico** e roda no
código-fonte. Achou **3 anti-padrões reais** + falhas de contraste.

**Consequência de versionamento:** o engine (~20 MB por plataforma) está no
`.gitignore` — é baixado na primeira execução e é específico de SO/arquitetura. Os
artefatos compartilhados (`config.json`, `design.json`, `surfaces/`, `critique/`)
**são** versionados, de propósito: são o contrato de design do projeto.

**Regra:** `npx impeccable detect apps/web/src` deve sair com **exit 0**.

---

### G-03 · GSAP recusado por licença, não por qualidade

**Decisão:** **não** adotar GSAP.

**Motivo:** a licença é a *Standard "No Charge" GSAP License* da Webflow —
**proprietária, não OSI-approved**, mesmo com todos os plugins agora gratuitos. O
problema **não é preço nem uso** (o nosso caso não é construtor visual de animação):
é **incompatibilidade de licenciamento** num repositório **AGPL-3.0-only**. Um
derivado AGPL precisa poder ser redistribuído sob AGPL, e a licença GSAP não concede
esse direito.

**O que foi aproveitado:** a **técnica** de `gsap.matchMedia()` com bloco
`reduceMotion` como padrão de código — incluindo a ideia de que, com reduced-motion
ativo, a animação deve **"pular para o fim"** (`duration: 0`), preservando o estado
final, em vez de sumir com o elemento.

---

### G-04 · Motion: a melhor solução técnica, **não adotada** por falta de necessidade

**Decisão:** não adotar (ainda).

**Motivo:** é a **única** das nove ferramentas avaliadas que respeita
`prefers-reduced-motion` **automaticamente**, sem código por componente
(`MotionConfig reducedMotion="user"`) — o que cobriria exatamente a lacuna F-01. Mas
**não há animação JS no projeto hoje**: adotar seria dependência sem necessidade
comprovada, contra a regra do projeto.

**Se adotar:** pinar a versão exata (o major 14 é recente), importar via
`motion/react-client` e considerar `m` + `LazyMotion` em vez de `<motion>` para não
levar 34 kb. Máximo de **1–2 interações** onde JS é genuinamente necessário.

---

### G-05 · Bibliotecas recusadas por licença incompatível com AGPL

Registro consolidado — o critério foi licença, não estética:

| Ferramenta | Licença | Veredito |
|---|---|---|
| **GSAP** | Proprietária Webflow, não-OSI | ❌ | 
| **React Bits** | **MIT + Commons Clause** (proíbe redistribuir) | ❌ |
| **Aceternity UI** | Customizada, **anti-redistribuição** | ❌ |
| **21st.dev** | Sem licença única; instalação **paga** com API key | ❌ |
| **Kobra** | Free = *"Personal use only"* — proíbe uso comercial | 🟡 ler, não instalar |
| **Taste Skill** | MIT, mas **contradiz decisões tomadas** (exige dark+light; somos dark fixo) | ❌ |
| **UI UX Pro Max** | MIT, mas cria **design system concorrente** e pede `tailwind.config.js` | ❌ |
| **Refero** | Proprietária; ToS **veda treinar modelos** e proíbe redistribuir | ❌ |

**Detalhe que costuma passar:** a **Commons Clause** remove o direito de
redistribuir/vender — que é justamente a liberdade central que a AGPL-3.0 exige
conceder a terceiros. Num repositório onde o código dos componentes ficaria
versionado e redistribuído, isso é bloqueio, não preferência.

**Onde está:** [`RESEARCH.md`](RESEARCH.md),
`docs/design/avaliacao-ferramentas.md`.

---

### G-06 · A CSP decide quais ferramentas são sequer possíveis

**Situação:** `middleware.ts` aplica CSP em **todas** as rotas. Propriedades:

- `connect-src 'self'` → componente que faz `fetch` externo **não funciona**
- **Não há `media-src`** → áudio/vídeo remoto cai em `default-src 'self'` e é
  **bloqueado**
- Não há `worker-src` nem `blob:` → Worker/`blob:` é frágil
- `img-src ... https:` é o **único** canal remoto liberado

**Consequências já registradas na avaliação de ferramentas:** itens da Aceternity com
som/vídeo seriam bloqueados; `face-api.js` (React Bits) baixa modelos de rede e
bateria em `connect-src 'self'`.

**Regra:** ao avaliar um componente de terceiro, verifique a CSP **antes** de
escrever código.

**Decisão correlata em aberto:** a avaliação recomenda restringir a matcher do
middleware (hoje cobre tudo, inclusive páginas estáticas) para reduzir CPU no Edge —
relevante porque o Hobby tem teto de **50 ms de CPU em média**. **Não aplicado.**

---

### G-07 · Validar a premissa antes de construir: o método

**Padrão consolidado no projeto, e vale como decisão de processo:** a primeira fatia
de qualquer tarefa é **eliminar a premissa**, não escrever código.

Os dois casos que provam o valor:

| Premissa | Realidade medida | Trabalho evitado |
|---|---|---|
| "TCU exige credenciais (401)" | O host não existe; há API aberta em outro endereço | Construir em cima de beco sem saída |
| "Busca lenta = falta de índice" | `Seq Scan` com 0,5 ms; era *cold start* | Criar `pg_trgm` como prioridade, resolvendo nada |

**Onde está:** [`TASK_BREAKING_DOWN.md`](../03-development-process/TASK_BREAKING_DOWN.md)
§2 (portão 1) e §4 (ordem por risco de premissa).

---

## H. Estado do produto na última medição (12/10/2026)

Registrado para que números antigos não sejam confundidos com estado atual:

| Item | Valor |
|---|---|
| Pessoas | **594** (556 com `tseId`) |
| Notas IDIP | **594** |
| No ranking (confiança ≥ 60) | 509 |
| Tamanho do banco | **98 MB** (limite Free: 500 MB) |
| `LegalRecord` | **0** |
| Modelos sem nenhum dado | **13 de 27** (inclui `LegalRecord`, todos os `Stf*`, `HistoricalPolitician`, `MunicipalExpense`) |
| Usuários / votos / retificações | **0 / 0 / 0** — base pré-lançamento |
| Versão do motor IDIP | **1.1.0** (exibida como v1.1) |
| Rotas testadas em produção | 20/20 HTTP 200 |

**Consequência de leitura:** qualquer documento que afirme "o ranking tem X" precisa
de data. O estado acima é um retrato, não uma constante.

---

## I. Como adicionar uma entrada aqui

Uma entrada nova é obrigatória quando:

1. Uma **medição invalidou** uma premissa anterior (nova seção E ou B).
2. Uma **decisão** foi tomada entre alternativas (nova seção C, D ou G).
3. Um **defeito** custou tempo e a causa não era óbvia (nova seção A ou F).

Formato:

```markdown
### X-NN · <título curto e afirmativo>

**Data:** AAAA-MM-DD · **Commit:** `hash` (se houver)

**O problema / a decisão.**

**Motivo com medição.** <número, comando, arquivo>

**O que foi descartado** e por quê.

**Onde está:** <arquivos e documentos>
```

**Regra de honestidade:** se a informação não foi confirmada no repositório, escreva
**não verificado**. Uma entrada de memória com fato suposto é pior que uma lacuna
declarada — ela vira verdade por repetição.

**Regra de poda:** se uma entrada deixar de valer (a armadilha foi eliminada do
código, por exemplo), **não apague** — acrescente "resolvido em `hash`" e mantenha o
registro. A história de um defeito é o que impede a sua volta.
