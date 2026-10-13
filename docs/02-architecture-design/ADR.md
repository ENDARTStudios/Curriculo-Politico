# ADR — Architecture Decision Records

Decisões de arquitetura **já tomadas** neste projeto, no formato
Contexto / Decisão / Consequências. Nenhuma é hipotética: todas têm evidência no
repositório, e a evidência está citada.

Convenção de status: **Aceita** (vigente), **Aceita com ressalva** (vigente, com
custo conhecido), **Superada** (substituída por outra).

Índice: [001](#adr-001--licença-agpl-30-only) ·
[002](#adr-002--supabase-com-pooler-em-transaction-mode) ·
[003](#adr-003--nextjs-15-com-app-router) ·
[004](#adr-004--tailwind-v4-css-first-sem-tailwindconfigjs) ·
[005](#adr-005--packagesidip-publica-apenas-typescript-fonte) ·
[006](#adr-006--monorepo-npm-workspaces-com-root-directory-na-vercel) ·
[007](#adr-007--force-dynamic-nas-rotas-que-consultam-banco) ·
[008](#adr-008--idip-stf-com-pesos-próprios-e-sem-celeridade) ·
[009](#adr-009--sitemap-por-route-handlers-em-vez-de-generatesitemaps) ·
[010](#adr-010--camada-raw-imutável-em-dataraw) ·
[011](#adr-011--votação-popular-isolada-da-nota) ·
[012](#adr-012--rate-limit-token-bucket-no-middleware-edge) ·
[013](#adr-013--baseline-neutro-50-em-vez-de-estimativa) ·
[014](#adr-014--playwright-como-suíte-e2e-e-porta-dedicada-3033)

---

## ADR-001 — Licença AGPL-3.0-only

**Status:** Aceita

**Contexto.** O produto é uma plataforma de auditoria pública cujo argumento
central é "algoritmo aberto e auditável". Se outra entidade pudesse hospedar uma
versão modificada do IDIP — com pesos silenciosamente alterados — e não publicar
o código, o argumento seria destruído justamente na dimensão que o projeto vende.
O projeto também precisa impedir que o motor seja embutido em produto fechado
apresentado como "índice independente".

**Decisão.** Licenciar todo o código sob **AGPL-3.0-only**: `LICENSE` na raiz e
`"license": "AGPL-3.0-only"` em todos os `package.json` (raiz, `apps/web`,
`apps/pipeline`, `packages/idip`). A documentação é separada e vai sob
**CC BY 4.0** (declarado no rodapé de `apps/web/src/app/layout.tsx`).

**Consequências.**

- Qualquer operador que ofereça o software como serviço de rede precisa
  disponibilizar o código-fonte modificado aos usuários. Isso fecha o modelo
  comercial de "SaaS proprietário sobre este código" — ver
  [PRICING_MONETIZATION.md](../01-product-discovery/PRICING_MONETIZATION.md) §3.
- AGPL não é compatível com incorporar código de licenças mais restritivas; novas
  dependências precisam ser verificadas antes de entrar.
- Habilita o modo de contribuição real do projeto: quem audita o índice pode
  apontar a linha exata da fórmula.
- Não impede uso comercial legítimo (hospedagem gerenciada com código aberto
  continua permitida).

**Evidência:** `LICENSE`, os quatro `package.json`, `README.md` §Licenças,
`CONTRIBUTING.md`.

---

## ADR-002 — Supabase com pooler em transaction mode

**Status:** Aceita (após incidente em produção)

**Contexto.** As funções serverless da Vercel abrem conexões próprias. Com o
`DATABASE_URL` apontando para o pooler do Supabase em **session mode** e sem
`connection_limit` definido, dois deploys em sequência esgotavam o pool e
páginas dinâmicas devolviam **HTTP 500 por 1–2 minutos** após cada deploy. Erro
medido em produção:

```
FATAL: (EMAXCONNSESSION) max clients reached in session mode
- max clients are limited to pool_size: 15
```

Havia também um problema independente de latência: as funções rodavam em `iad1`
(Washington) com o banco em `sa-east-1` (São Paulo).

**Decisão.**

1. `DATABASE_URL` de produção no pooler em **transaction mode** — porta **6543**
   com `?pgbouncer=true&connection_limit=1`.
2. `directUrl` (**`DIRECT_URL`**, porta 5432) no bloco `datasource` para
   `prisma migrate`/`db push` e para os ETLs de carga, porque essas operações
   **não** funcionam em transaction mode.
3. `regions: ["gru1"]` em `apps/web/vercel.json`.

**Consequências.**

- Resultado medido em `/ranking` (10 requisições): média **1.740 ms → 354 ms**,
  mediana **1.625 ms → 328 ms** — queda de ~80%, **sem alterar código de
  aplicação**.
- Toda operação que não seja query simples (migrations, cargas em massa) precisa
  usar `DIRECT_URL` explicitamente. Isso é uma armadilha real: um script novo que
  ignore o `directUrl` pode falhar ou ser lento.
- O `connection_limit=1` reduz o paralelismo por instância; cargas pesadas usam
  `createMany` em chunks em vez de upsert sequencial
  (`apps/pipeline/README.md`).
- **Correção de premissa registrada:** o `pool_size: 15` **não** é teto do plano
  gratuito — é um default configurável no painel (teto do compute Nano: 60
  conexões diretas / 200 via pooler). Ver `AVALIACAO_ALTERNATIVAS.md` §2.4 e §3.

**Evidência:** `apps/web/prisma/schema.prisma` (comentários do `datasource`),
`apps/web/.env.example`, `apps/web/vercel.json`,
`docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.7 item 5.

---

## ADR-003 — Next.js 15 com App Router

**Status:** Aceita

**Contexto.** A aplicação é majoritariamente leitura de banco + renderização
editorial, com um pequeno núcleo interativo (busca, votação, comparação). O
conteúdo precisa ser indexável (SEO é requisito: sitemap de ~9 arquivos) e
acessível, e a maior parte da UI não justifica JavaScript no cliente.

**Decisão.** Next.js **15.5** com **App Router** (`apps/web/src/app/`), React
**19.3**, React Server Components por padrão. Interatividade isolada em
componentes `"use client"` (`SearchBar`, `BillVote`, `AffinityFilter`,
`CookieBanner`, `ContaAcoes`, `Comparacao*`).

**Consequências.**

- Praticamente toda página é um `async` Server Component que consulta o Prisma
  direto — sem camada de fetching intermediária, o que reduz superfície de erro.
- `metadata` e `generateMetadata` por rota dão canonical, Open Graph e título
  template sem biblioteca extra; `metadataBase` em `layout.tsx` é o que permite
  URL absoluta em canonical.
- Parâmetros de rota e `searchParams` são **Promises** e exigem `await`
  (`{ params }: { params: Promise<{ id: string }> }`) — padrão do App Router 15.
- Rotas de API são Route Handlers no mesmo diretório (`app/api/*/route.ts`), com
  `export const dynamic = "force-dynamic"` onde há banco.
- Ter um diretório `app/` e outro `.next/` compartilhado entre `next dev` e
  `next build` cria a armadilha documentada em `AGENTS.md` (builds intermitentes
  e enganosos com dev server ativo ou órfão).

**Evidência:** `apps/web/package.json`, `apps/web/src/app/layout.tsx`,
`playwright.config.ts` (nota sobre a armadilha da porta 3000),
`apps/web/README.md`.

---

## ADR-004 — Tailwind v4 CSS-first, sem `tailwind.config.js`

**Status:** Aceita

**Contexto.** A camada visual é pequena e semântica: estados do Termômetro,
superfícies dark, tipografia editorial. Um arquivo de configuração JavaScript
com centenas de tokens não era necessário; o que importava era ter **poucos
tokens com significado** e evitar valores soltos repetidos pelos componentes.

**Decisão.** Tailwind **v4** com a diretiva CSS `@import "tailwindcss"` e os
tokens declarados em `@theme` dentro de `apps/web/src/app/globals.css`. **Não
existe `tailwind.config.js` / `.ts` no repositório.** Plugin PostCSS:
`@tailwindcss/postcss`.

**Consequências.**

- Tokens de movimento são os únicos declarados em `@theme`
  (`--ease-out-soft`, `--ease-in-out-soft`, `--animate-rise`, `--animate-fade`,
  `--animate-aurora`). **Decisão explícita de não criar token de cor para os
  estados de confiabilidade** — o comentário no próprio arquivo explica: um token
  fixo de "verde" convidaria a usá-lo fora do significado de estado.
- Regras globais de acessibilidade vivem no mesmo arquivo, em `@layer base`:
  `prefers-reduced-motion` desliga animação/transição (com `!important`
  intencional), `:focus-visible` com outline de 2px, e sublinhado permanente em
  links **dentro de texto corrido** (`p a`, `li a`, `td a`) para atender
  WCAG 1.4.1. Há a utility de escape `@utility link-sem-sublinhado`.
- Quem procura `tailwind.config.js` para adicionar um token não vai encontrar —
  o lugar é `globals.css`.
- Cores de estado são aplicadas em classes semânticas a partir de
  `src/lib/status-visual.ts`, que é a fonte única.

**Evidência:** `apps/web/src/app/globals.css`, `apps/web/package.json`,
ausência de `tailwind.config.*` no repositório,
`.dsh/skills/curriculo-design-system`.

---

## ADR-005 — `packages/idip` publica apenas TypeScript fonte

**Status:** Aceita com ressalva

**Contexto.** Os motores (IDIP e resolução de identidade) precisam ser
executados por dois consumidores muito diferentes: `apps/pipeline`, que roda via
`tsx` e transpila na hora, e `apps/web`, que compila com o bundler do Next. A
alternativa era adicionar um passo de build ao pacote (`dist/` + `tsc`), criando
um artefato compilado que pode ficar desatualizado em relação à fonte — o que,
num projeto cujo argumento é "a fórmula é auditável", é um risco de credibilidade.

**Decisão.** `packages/idip/package.json` aponta `main`/`types`/`exports` para
`./index.ts`. Sem `build`, sem `dist`. O pacote é importado diretamente por
`apps/pipeline` (declarado em `apps/pipeline/package.json` como
`"@cp/idip": "*"`).

**Consequências.**

- **`apps/web` não importa o motor.** Importar TypeScript não compilado no build
  do Next exigiria `transpilePackages` — configuração que a decisão registrada em
  `src/lib/methodology.ts` preferiu não introduzir "às vésperas de um deploy só
  para renderizar quatro números".
- Como a UI precisa exibir os pesos, ela mantém uma **cópia de leitura** em
  `apps/web/src/lib/methodology.ts`. Esse é o custo da decisão.
- O custo é fechado por um teste: **WEB-001**, em
  `apps/pipeline/scripts/verify-scoring.ts`, compara cada `percent` exibido com
  `WEIGHTS` do motor, exige que a UI cubra **todas** as dimensões do motor (uma
  omissão faria os pesos não fecharem em 100%) e valida a versão exibida. Roda no
  CI — sem ele, a UI volta a divergir em silêncio.
- **Esse defeito já aconteceu:** a home exibia "IDIP v1.0" com Produção 20% e
  Custo/Benefício 5% enquanto o motor rodava v1.1 (18% e 7%). Está documentado em
  três lugares (o próprio `methodology.ts`, `docs/design/estrategia-marketing.md`
  e o comentário do WEB-001) justamente para não ser "consertado" por engano.
- A regra operacional derivada: **mudar a fórmula exige editar `scoring.ts`
  primeiro** e depois `methodology.ts`, até o `verify:scoring` voltar a passar.
- `apps/pipeline` importa `methodology.ts` do `apps/web` por **caminho relativo**
  (`../../web/src/lib/methodology`), de propósito: adicionar `@cp/web` como
  dependência inverteria a direção correta entre app e pipeline.

**Evidência:** `packages/idip/package.json`, `apps/pipeline/package.json`,
`apps/web/src/lib/methodology.ts`, `apps/pipeline/scripts/verify-scoring.ts`
(WEB-001), `.github/workflows/ci.yml`.

---

## ADR-006 — Monorepo npm workspaces com Root Directory na Vercel

**Status:** Aceita (após incidente de deploy)

**Contexto.** O repositório começou com a aplicação na raiz. O refactor do
monorepo (commit `f3c7630`) moveu a aplicação para `apps/web`, mas o projeto
Vercel permaneceu com **Root Directory = `.`**. O build rodava da raiz, o Next
escrevia em `apps/web/.next` e a Vercel procurava `.next` na raiz:

```
Error: The file "/vercel/path0/.next/routes-manifest.json" couldn't be found.
```

Qualquer push novo em `main` falhava. Um segundo bloqueio independente foi
encontrado em seguida: o recurso da integração Supabase vinculado ao projeto
estava **suspenso**, e todo deployment era abortado antes do build
(`integrations.status: error`, `Resource provisioning failed`).

**Decisão.**

1. Monorepo **npm workspaces** (`apps/*`, `packages/*`), com a raiz contendo
   apenas configuração global e delegação de scripts para o workspace correto.
2. Vercel com **Root Directory = `apps/web`** e `regions: ["gru1"]`.
3. Desconectar o recurso da integração Supabase do projeto Vercel — ação sem
   impacto funcional, já que as 23 variáveis de ambiente são manuais e o app não
   consome `SUPABASE_*`/`POSTGRES_*`.
4. Node alinhado em **24** entre `engines` (raiz e `apps/web`), CI e
   `monthly-snapshot.yml`.

**Consequências.**

- Todo comando funciona **a partir da raiz** (`npm run db:*`, `etl:*`, `build`,
  `typecheck`), porque o `package.json` raiz delega.
- Caminhos relativos importam: `apps/pipeline` lê o `.env` do monorepo via
  `--env-file-if-exists=apps/web/.env` (raiz) ou
  `--env-file-if-exists=../../apps/web/.env` (de dentro do pipeline).
- O `.vercelignore` da raiz exclui `docs/`, `apps/pipeline/` e `data/` do upload.
- Existem **dois** arquivos de ignore com escopos diferentes (raiz e
  `apps/web`), o que é uma fonte de confusão ao depurar o que foi enviado.

**Evidência:** `package.json` (raiz), `apps/web/vercel.json`,
`docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.2 e §0.6, `.vercelignore`,
`apps/web/.vercelignore`.

---

## ADR-007 — `force-dynamic` nas rotas que consultam banco

**Status:** Aceita

**Contexto.** O Next faria, por padrão, pré-renderização estática das páginas no
`next build`. Isso criaria dois problemas: (1) o build passaria a exigir banco
acessível, e o CI roda com `DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci"`
— um banco que não existe; (2) os números exibidos (notas, contagens, cobertura,
estado do Termômetro) mudam a cada carga dos ETLs e ficariam congelados no
artefato de build.

**Decisão.** Declarar `export const dynamic = "force-dynamic"` em **toda** rota
que consulta banco — páginas e Route Handlers. Convenção seguida em 25 arquivos
de `apps/web/src/app/`, incluindo a home, `/ranking`, `/politicos/[id]`,
`/partidos/**`, `/comparar`, `/status`, `/stf`, `/historia`, `/projetos/**`
e todas as rotas de `/api/*`.

**Consequências.**

- O CI consegue rodar `npm run build` sem banco real (o workflow prova isso).
- Nenhuma página serve número obsoleto.
- **Custo:** toda requisição bate no banco. Foi o que tornou a paginação do
  `/ranking` necessária (1.506 KB / ~3,1 s → 270 KB com 100 linhas por página) e
  o que motiva o cache de rankings no roadmap.
- A alternativa (`revalidate`) é aceitável apenas para conteúdo que não muda com
  carga de dados — o sitemap usa cache **de borda** via header
  (`s-maxage=3600, stale-while-revalidate=86400`) mantendo o handler dinâmico.
- Quem adicionar uma página nova com dados precisa lembrar da diretiva; esquecer
  produz build que exige banco e/ou dado congelado.

**Evidência:** 25 ocorrências de `export const dynamic = "force-dynamic"` em
`apps/web/src/app/`; `apps/web/src/app/page.tsx` (comentário explicando a
convenção); `.github/workflows/ci.yml`.

---

## ADR-008 — IDIP-STF com pesos próprios e sem celeridade

**Status:** Aceita

**Contexto.** O STF decide sobre os próprios políticos que a plataforma avalia,
gasta orçamento público e seus ministros têm mandato até a aposentadoria — não há
eleição como válvula de escape. É poder público, e a plataforma existe para
tornar poder público auditável. Mas ministro do STF é **nomeado, não eleito**:
as dimensões que fazem sentido para um mandato eletivo (Aprovação, Campanha,
Presença em sessão deliberativa) não existem ali. Aplicar os pesos do Legislativo
a um ministro "mediria a coisa errada com aparência de rigor".

Havia ainda um defeito concreto: a versão anterior de `/stf` listava cinco
dimensões, incluindo **"Celeridade" a 15%**, mas `StfCase` tem `decisionDate` e
**não tem data de autuação/distribuição** — sem o marco inicial, tempo até a
decisão é **imensurável**.

**Decisão.**

1. Índice **próprio** (IDIP-STF), com pesos: **Integridade 25, Produtividade 25,
   Consistência 30, Transparência 20**. Consistência é a maior dimensão porque
   previsibilidade é o que se espera de um tribunal constitucional.
2. **Não existe dimensão de celeridade.** Eliminada por ser imensurável com o
   schema real.
3. Integridade mantém os mesmos 25% do Legislativo e do Executivo — é a âncora
   do índice.
4. Os pesos espelham **exatamente** os quatro campos de `StfScore`
   (`integrityScore`, `productivityScore`, `consistencyScore`,
   `transparencyScore`). Um peso sem campo correspondente no banco seria
   metodologia que o banco não consegue honrar.
5. Os pesos ficam em `DIMENSOES_STF` (`apps/web/src/lib/methodology.ts`), na
   mesma fonte usada pela home, para que `/` e `/stf` não possam divergir.

**Consequências.**

- **A coleta não existe:** as tabelas do STF estão vazias. `/stf` publica a
  metodologia **e** o aviso de que não há nota, nessa ordem — o visitante precisa
  saber que não há nota antes de ler pesos que pareceriam estar em uso.
- O motor de cálculo do IDIP-STF **ainda não existe** em `packages/idip`: há
  pesos e campos de banco, mas nenhuma função. Ver
  [STF_SCORING.md](STF_SCORING.md) e [ROADMAP B2](../01-product-discovery/ROADMAP.md).
- A coleção de dados depende de LAI (não há API pública do STF; o DataJud não
  cobre o STF e não expõe nome de parte) — o custo é administrativo, não técnico.
- A home teve que ganhar um terceiro cartão de pesos com uma `nota` textual
  ("Sem nota publicada"): sem isso, a única forma de falar do Judiciário seria
  inventar pesos, o que quebraria a regra de que nenhuma regra entra na nota sem
  estar implementada.

**Evidência:** `apps/web/src/lib/methodology.ts` (bloco
`IDIP-STF` e `DIMENSOES_STF`), `apps/web/src/app/stf/page.tsx`,
`apps/web/prisma/schema.prisma` (`StfScore`),
`apps/web/src/app/page.tsx` (cartão Judiciário),
`tests/e2e/home.spec.ts` ("a home exibe a soma dos pesos dos três perfis"),
`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §3.

---

## ADR-009 — Sitemap por Route Handlers, em vez de `generateSitemaps`

**Status:** Aceita (após duas tentativas que falharam)

**Contexto.** A convenção do Next seria `src/app/sitemap.ts` com
`generateSitemaps`. Foi tentado e falhou de duas formas concretas, ambas
verificadas no projeto:

1. O Next gerava `/sitemap/0.xml`, `/sitemap/1.xml`, … mas **não**
   `/sitemap.xml` — confirmado no `app-paths-manifest.json`, que só tinha
   `/sitemap/[__metadata_id__]/route`. Isso deixa o crawler sem o ponto de
   entrada padrão do protocolo, que é o que o `robots.txt` anuncia.
2. Ao tentar resolver com um Route Handler em `app/sitemap.xml/route.ts`, o
   `/sitemap.xml` continuou servindo o **urlset** do `sitemap.ts` (id 0): o
   arquivo de metadata tem **precedência** na mesma rota e o handler era
   ignorado.

**Decisão.** Controlar o XML inteiro por Route Handlers:
`src/app/sitemap.xml/route.ts` (índice) e `src/app/sitemap/[id]/route.ts`
(arquivos), com dados e serialização em `src/lib/sitemap.ts` como fonte única.

**Consequências.**

- O resultado é o que o protocolo define, e o comportamento é verificável por
  teste (`tests/e2e/seo.spec.ts`).
- `calcularIds()` é usado tanto pelo índice quanto pela validação de faixa: é
  **impossível** o índice anunciar um arquivo que não existe.
- Id fora da faixa devolve **404**, não XML vazio — "um sitemap vazio declarado é
  pior que ausente: o crawler o considera válido e para de procurar".
- Paginação em **4.000 proposições por arquivo**, para manter cada XML bem abaixo
  do limite de 50.000 do protocolo. `/politicos` **não** entra no sitemap porque
  essa rota de lista não existe (só `/politicos/[id]`).
- O índice está sujeito a mudar de tamanho com o catálogo — o número de arquivos
  é derivado de `prisma.bill.count()`.
- **Contrato de falha:** se a consulta falhar (build sem banco, banco fora do
  ar), o índice devolve ao menos `[0]` e o arquivo base traz as rotas estáticas.
  O sitemap nunca quebra a página; degrada.

**Evidência:** `apps/web/src/lib/sitemap.ts` (comentário com o diagnóstico),
`apps/web/src/app/sitemap.xml/route.ts`, `apps/web/src/app/sitemap/[id]/route.ts`,
`apps/web/src/app/robots.ts`, `tests/e2e/seo.spec.ts`.

---

## ADR-010 — Camada raw imutável em `data/raw/`

**Status:** Aceita

**Contexto.** Os ETLs consomem APIs oficiais que podem mudar de formato, de
disponibilidade ou de conteúdo — e o TCU muda a lista eleitoral **diariamente**
até a diplomação. Se a carga lesse direto da rede, um dado que mudou na origem
seria irrecuperável, e não haveria como reproduzir a nota publicada em uma data
passada. Num projeto de auditoria, isso é inaceitável.

**Decisão.** Separação estrita em duas etapas:

1. `python apps/pipeline/etl/*.py` → grava JSON em **`data/raw/`**, na raiz do
   monorepo (gitignored). Nenhum ETL escreve no banco.
2. `tsx apps/pipeline/scripts/load-*.ts` → lê de `data/raw/` e grava no banco
   com `upsert`/`createMany`.

**Consequências.**

- **Reprocessar é reexecutar o `load-*`**, nunca re-baixar. A carga é idempotente
  por IDs determinísticos (ex.: `tcu_${personId}_${processo}`).
- Erro de transformação é corrigível sem tocar na rede, e a mesma camada raw
  pode alimentar cargas diferentes.
- `data/` é gitignored e está no `.vercelignore`: o dado bruto não é versionado
  no repositório. A recomendação de versionar CSV bruto com `sha256` por data
  (`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §6) **ainda não foi
  implementada** — é uma lacuna de rastreabilidade, não uma decisão.
- O ETL jurídico atual opera em **modo local-first**: espera que um humano
  deposite o arquivo em `data/raw/` (`tcu_contas_rejeitadas_raw.json`,
  `stf_acoes_penais_raw.json`). Isso é consequência direta da decisão e é o que
  explica `LegalRecord = 0`.

**Evidência:** `apps/pipeline/README.md`, `apps/pipeline/etl/legal_records.py`,
`apps/pipeline/scripts/load-legal-records.ts`, `README.md` §ETL,
`apps/pipeline/scripts/recalculate-scores.ts` (lê metadados de
`data/raw/camara_votacoes_historico_meta.json`).

---

## ADR-011 — Votação popular isolada da nota

**Status:** Aceita

**Contexto.** Existe demanda legítima por participação (votar em projetos de
lei), e existe o risco de que essa participação seja confundida com a nota —
tanto por usuários quanto, pior, por acusação de manipulação. A plataforma se
posiciona como medição de fatos auditáveis; opinião agregada é outra coisa.

**Decisão.** Isolar a camada de engajamento em **tabelas próprias**, sem relação
com `Score`:

- `UserBillVote` (userId, billId, vote "FAVOR"/"CONTRA", único por par) — sem
  nenhuma FK ou campo ligando a `Score`/`StfScore`.
- Consentimento **específico e versionado** para opinião política (dado sensível,
  LGPD Art. 11), gravado com versão e timestamp; revogação **elimina** os votos.
- Anti-bot: conta com menos de 24h não vota.

E deixar a regra explícita no lugar onde ela pode ser quebrada: o schema, o
comentário do model, a página `/metodologia` e a interface.

**Consequências.**

- A neutralidade algorítmica deixa de ser promessa de copy e passa a ser
  **propriedade do schema**: não há caminho de dados de `UserBillVote` até
  `Score`.
- A UI tem obrigação correlata: **não pode sugerir** que o voto altera a nota.
  `/ranking/personalizado` exibe um aviso explícito em caixa âmbar dizendo que o
  ranking é pessoal e não altera o IDIP; o rodapé repete "Sem voto popular: notas
  derivadas exclusivamente de dados públicos auditáveis".
- O consentimento cria obrigações operacionais verificáveis: `POST /api/consent`
  registra versão+timestamp, `DELETE /api/consent` revoga e elimina votos,
  `POST /api/bills/[id]/vote` devolve **403 `CONSENT_REQUIRED`** sem
  consentimento ativo. Um `UserAffinity` que existia no schema e contradizia a
  política foi **removido** (auditoria jurídica P1-06); o `AffinityFilter` ficou
  100% em `localStorage`, sem nenhum fetch.
- Diferença que a arquitetura precisa sustentar: afinidade é calculada em cima
  de **autorias** (fato), não de preferência declarada que altere nota.

**Evidência:** `apps/web/prisma/schema.prisma` (`UserBillVote`, `User`,
comentário "Camada de ENGAJAMENTO PESSOAL — nunca altera o IDIP"),
`apps/web/src/app/api/bills/[id]/vote/route.ts`, `apps/web/src/lib/consent.ts`,
`apps/web/src/app/ranking/personalizado/page.tsx`,
`docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md` (P0-01, P1-06).

---

## ADR-012 — Rate limit Token Bucket no middleware Edge

**Status:** Aceita com ressalva

**Contexto.** Há dois alvos distintos de abuso: raspagem das rotas de conteúdo
(que consultam o banco e são `force-dynamic`) e ataques de força bruta / criação
em massa de contas nos endpoints de autenticação. Uma janela fixa simples
penaliza picos legítimos; e a Vercel não oferece limitador de aplicação embutido.

**Decisão.** Rate limiting por **Token Bucket** em `apps/web/src/middleware.ts`
(Edge Runtime), sem dependência externa:

- **Tier geral: 60 req/min** em `/api/*`; **tier crítico: 10 req/min** em
  `POST /api/auth/register` e callbacks de login (credentials/OAuth).
- Capacidade inicial = limite (permite rajada total no instante inicial) e
  recarga linear contínua — picos legítimos passam, abuso sustentado não.
- Chave de identidade: **id do usuário no JWT NextAuth** (cookie `__Secure-` em
  HTTPS) e, sem sessão, o **IP** (`x-forwarded-for` / `x-real-ip`).
- Falha com **429** + `Retry-After` + `X-RateLimit-Limit`/`X-RateLimit-Remaining`.
- Expurgo de baldes ociosos quando o mapa passa de 5.000 entradas, para conter
  memória sob flood.

**Consequências.**

- **Limite explícito e registrado no próprio código:** os baldes são em memória,
  **por instância**. O limite vale "por instância-visita"; um atacante
  distribuído entre instâncias multiplica a cota efetiva. A proteção distribuída
  por IP depende do Cloudflare/WAF na frente do deploy. Corrigir isso exige
  estado compartilhado (Redis) — ver [ROADMAP C1/D3](../01-product-discovery/ROADMAP.md).
- Verificado em produção: 65 requisições rápidas a `/api/search` de um mesmo IP
  → 59× HTTP 200 e depois **429 com `Retry-After: 60`** (60 do limite, sendo 1
  consumida pelo teste de headers anterior).
- A escolha por não usar biblioteca mantém o middleware sem dependência e
  auditável, mas significa que qualquer melhoria (janela deslizante, custo por
  rota) é escrita à mão.
- O mesmo arquivo acumulou os headers de segurança (CSP, `X-Frame-Options`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`) — uma responsabilidade por
  vez seria mais limpo, mas duas passagens de middleware custariam latência.

**Evidência:** `apps/web/src/middleware.ts`,
`docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §4 e §5.

---

## ADR-013 — Baseline neutro 50 em vez de estimativa

**Status:** Aceita

**Contexto.** A maior parte das dimensões do IDIP não tem fonte ativa
(Integridade, Aprovação, Fiscalização, Transparência). As saídas possíveis eram:
estimar por proxy (nota "plausível" sem dado), zerar (punir quem não tem fonte),
ou neutralizar. Estimar destrói a auditabilidade; zerar pune o avaliado por uma
lacuna do projeto.

**Decisão.**

1. Dimensão sem fonte ativa recebe **valor neutro 50** — ausência de dado, não
   desempenho medido.
2. A interface **identifica** cada dimensão nesse estado com o selo
   "sem dados · neutro" (`ScoreBreakdown`).
3. `/metodologia` publica uma **tabela de status por dimensão** dizendo o que é
   medido e o que é baseline em cada versão.
4. A variável honesta é a **Confiança** (`dataCompleteness`), que cai quando
   falta fonte — e é ela que decide o corte do ranking (GRAY < 60).
5. O selo de baseline no perfil é alinhado ao `recalculate-scores.ts` (cobertura
   real vs. baseline), não a uma lista escrita à mão.

**Consequências.**

- Efeito colateral **esperado e documentado**: com todas as dimensões em
  baseline, a nota gravita perto de 50 por construção. `/metodologia` avisa
  isso explicitamente ("confira sempre a Confiança exibida e os selos de
  baseline antes de comparar parlamentares").
- Na prática, é por isso que o ranking atual é dominado por Produção e Presença
  (as duas dimensões medidas) e que as notas se concentram em faixa estreita.
- Impede que a nota seja lida como "quão bom é o político" quando é, hoje,
  "quanto conseguimos medir dele".
- Exige que a interface nunca mostre o total de cadastrados sem nota como se
  fosse alcance: `hero-stats.ts` conta **termos com nota calculada**, de
  propósito.
- Corrigir isso **não** é ajustar o baseline — é implementar a fonte
  ([ROADMAP trilha A](../01-product-discovery/ROADMAP.md)).

**Evidência:** `apps/web/src/lib/methodology.ts`,
`apps/pipeline/scripts/recalculate-scores.ts` (métricas com `integrity: 50`,
`approval: 50`, `oversight: 50`, `transparency: 50`),
`apps/web/src/app/metodologia/page.tsx` (seção "Baseline Neutro (50)"),
`apps/web/src/lib/hero-stats.ts`,
`docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md` (P1-09).

---

## ADR-014 — Playwright como suíte e2e e porta dedicada 3033

**Status:** Aceita

**Contexto.** Antes do Playwright, o projeto tinha `curl` (smoke de produção) e
verificadores de matemática (`verify:scoring`, `verify:identity`), mas **nenhum
teste que renderizasse uma página**. Ficava sem cobertura justamente a camada
onde o TypeScript não enxerga erro: contraste, semântica, rótulos acessíveis e
estados do Termômetro. Uma varredura do detector encontrou **duas falhas reais de
contraste** que passaram despercebidas: o CTA da home (branco sobre `sky-500` =
2,71:1) e `text-slate-500` usado como texto em 167 lugares (4,23:1).
Além disso, a suíte local subia na porta 3000, que nesta máquina é disputada por
outros projetos Next — o `next dev` trocava de porta sozinho e derrubava a suíte
com `ERR_CONNECTION_REFUSED` no meio da execução.

**Decisão.**

1. **Playwright** como suíte e2e (`tests/e2e/`), com o eixo de maior valor na
   **auditoria de acessibilidade com axe-core na tag `wcag22aa`** — WCAG 2.2, não
   2.1 (o exemplo da documentação do Playwright usa só `wcag2a/2aa/21a/21aa`, o
   que daria falsa sensação de conformidade).
2. Dois alvos: local (sobe `next dev` em **porta 3033**) e **produção**
   (`E2E_BASE_URL` + `E2E_NO_SERVER=1`, rodando apenas asserções `@readonly`).
3. `channel: "chrome"` — usa o Chrome do sistema, sem baixar ~280 MB de browser.
4. Dois projetos (`desktop` 1440×900, `mobile` 390×844) e `colorScheme: "dark"`
   fixo, porque o tema do projeto é dark fixo e simular `prefers-color-scheme`
   esconderia problemas reais de contraste.
5. O workflow `a11y.yml` é **separado** do `ci.yml` e roda contra produção
   a cada 6h (+30 min do smoke), para não atrasar todo PR e para auditar o
   ambiente que as pessoas realmente usam.

**Consequências.**

- Defeitos de honestidade de dados também viraram teste: `home.spec.ts` verifica
  que a versão de metodologia exibida é a do motor (lendo
  `packages/idip/package.json`), que a home não menciona versão obsoleta, que a
  soma dos pesos dos **três** perfis aparece, e que o CTA primário tem contraste
  AA calculado a partir do estilo computado.
- `seo.spec.ts` fixa o contrato do sitemap: índice `sitemapindex` (não `urlset`),
  arquivo base com home/ranking/perfil, arquivo 1 só com `/projetos/`, 404 fora
  da faixa.
- **Limite honesto registrado no código:** teste automatizado detecta uma minoria
  dos problemas de acessibilidade e não cobre regiões ocultas (modais, menus
  fechados). É um piso, não uma certificação.
- Custo operacional: subir `next dev` na 3033 exige que não haja outro servidor
  naquela porta; e `reuseExistingServer: false` é intencional — o objetivo é
  testar o código atual, não um servidor antigo que ficou de pé.
- Coexistência com o `.next` compartilhado: `next dev` e `next build` usam o
  mesmo diretório. Um `next dev` órfão durante um build produz falhas
  intermitentes e enganosas (`AGENTS.md`).

**Evidência:** `playwright.config.ts`, `tests/e2e/acessibilidade.spec.ts`,
`tests/e2e/home.spec.ts`, `tests/e2e/seo.spec.ts`,
`.github/workflows/a11y.yml`, `AGENTS.md`.

---

## ADRs em aberto (decisão ainda não tomada)

Registradas para que a ausência seja explícita:

| Tema | Por que está aberto |
|---|---|
| Estado compartilhado de rate limit (Redis) | Depende da decisão de adotar Redis em produção; hoje o `docker-compose.yml` sobe Redis sem consumidor |
| Estratégia de cache de rankings | Cache de aplicação vs. cache de borda vs. materializar uma tabela de ranking — nenhuma escolhida |
| Contrato e versionamento da API pública | Não existe API pública; ver [ROADMAP E1](../01-product-discovery/ROADMAP.md) |
| Modelo de sustentação além de doação | Hipótese de serviço gerenciado, sem decisão registrada — ver [PRICING_MONETIZATION.md](../01-product-discovery/PRICING_MONETIZATION.md) §6 |
| Escopo municipal | Exige fonte por TCE; não há decisão de prioridade |

## Como adicionar um ADR

1. Numere em sequência (`ADR-015`…). Não renumere os existentes — comentários de
   código e documentos apontam para estes números.
2. Título com a decisão, não o problema ("ADR-015 — Sitemap por Route
   Handlers", não "ADR-015 — Problema do sitemap").
3. Status explícito: **Aceita**, **Aceita com ressalva**, **Superada** ou
   **Proposta**.
4. Contexto com **evidência concreta** (erro medido, commit, número). Decisão sem
   contexto verificável vira opinião.
5. Consequências **incluindo as ruins**. Um ADR sem custo registrado esconde o
   custo.
6. Citar os arquivos que provam a decisão.
