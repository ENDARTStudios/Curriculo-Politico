# Política de depreciação

## Aviso: o que existe e o que não existe

**O projeto não tem política de depreciação formalizada, e não tem mecanismo técnico
de depreciação.** Não há cabeçalho `Deprecation`, não há `Sunset`, não há
versionamento de rota de API, não há processo escrito para remover uma métrica do
IDIP.

Este documento faz duas coisas: **(1)** consolida o que o projeto **já faz** e que
funciona como depreciação na prática — porque existe e está verificável no código e
no histórico — e **(2)** lista o que precisaria ser decidido antes que uma remoção
real aconteça. **Não inventa um processo que ninguém aplicou.**

## 1. Por que depreciação é um problema **maior** aqui do que num app comum

Três características deste produto tornam remoção de dado ou de cálculo um assunto
de compliance, não de refatoração:

| Característica | Consequência |
|---|---|
| **Notas históricas são auditáveis e citáveis** | Uma nota IDIP publicada em outubro de 2026 pode estar num print, numa matéria, numa resposta de IA. Mudar retroativamente o significado dela é reescrever um fato publicado |
| **O motor é versionado (`Score.version`)** | Cada `Score` tem a versão do motor que o calculou. Isso é justamente o que permite mudar a fórmula sem apagar a história — mas **só se a versão for respeitada** |
| **Há dado sensível e dado de terceiros** | Remover uma tabela pode significar apagar manifestação política de usuário (Art. 18, VI) ou dívida de retenção legal. As duas coisas exigem tratamento diferente |

Ou seja: depreciação aqui tem **três objetos distintos** que não podem ser tratados
com a mesma regra.

## 2. Os três objetos de depreciação

| Objeto | Exemplo | Regra correta |
|---|---|---|
| **Fórmula / métrica do IDIP** | Remover uma dimensão, mudar um peso | **Versionar, nunca recalcular retroativamente.** O histórico permanece com a versão antiga |
| **Dado de terceiro (agente político)** | Uma fonte deixa de existir, um campo é descontinuado | **Não apagar.** Marcar como indisponível e declarar na interface. Dado público já publicado não deixa de ser público |
| **Dado pessoal de usuário** | Voto, consentimento, conta | **Apagar de verdade, com cascade.** É obrigação legal, não depreciação |
| **Rota de API / campo de resposta** | Renomear um campo de `/api/rankings` | **Não existe processo.** Ver §5 |

## 3. O que o projeto já faz — e é um padrão de depreciação real

### 3.1 Versionamento do motor IDIP: a regra já funciona

Este é o mecanismo de depreciação mais maduro do projeto, e ele existe porque a
alternativa já causou um defeito.

**A regra, de `CONTRIBUTING.md`:**

> *"Versionamento do IDIP: qualquer mudança de fórmula exige bump de versão
> (`Score.version`) e atualização de `/metodologia` + `verify-scoring.ts`."*

**O caso concreto que a originou** (commit `0a79609`, "fix: recálculo sobe version p/
1.1.0 no branch update (scores nunca recriados)"):

O IDIP foi de v1.0 para **v1.1** com mudança de pesos — **Produção de 20% para 18%**
e **Custo de 5% para 7%**. O recálculo **sobe a versão** no branch de `update` e
**nunca recria** os scores: o histórico com a fórmula antiga permanece identificável.
O commit é explícito — *"scores nunca recriados"*.

**O defeito que aparece quando a versão não é respeitada:** a home anunciava
**"IDIP v1.0"** com os pesos antigos enquanto o motor já rodava **v1.1**. Isso não é
depreciação mal feita — é **depreciação incomunicada**. E foi tratado como o defeito
mais caro possível, porque o diferencial declarado do produto é "algoritmos abertos":

> *"Numa plataforma cujo diferencial é 'algoritmos abertos', a tela divergir da
> fórmula é o defeito mais caro possível. Aqui ele vira teste."*
> — `tests/e2e/home.spec.ts`

**Os gates que hoje impedem a repetição:**

| Gate | Onde | O que garante |
|---|---|---|
| Versão do motor casa com a versão exibida na UI | `verify-scoring.ts`, verificação `WEB-001` | `lib/methodology.ts` e `packages/idip/package.json` não divergem |
| A home não exibe versão obsoleta | `tests/e2e/home.spec.ts` (caso "não exibe nenhuma versão obsoleta") | Qualquer `IDIP vX.Y` no HTML que não seja a versão atual **falha o teste** |
| Soma dos pesos = 1.0 nos perfis | `verify-scoring.ts` | Uma métrica removida sem rebalancear os pesos falha |
| A home exibe a soma dos pesos dos **três** perfis | `tests/e2e/home.spec.ts` | Um perfil removido silenciosamente falha |

**Este é o modelo a aplicar em qualquer depreciação:** mudar, versionar, comunicar em
`/metodologia`, e ter um teste que falha se a comunicação divergir do motor.

### 3.2 Renomeação de produto: "Radar Cívico" → "Currículo Político"

Depreciação de **nome**, com resíduo conhecido e aceito.

O nome antigo aparece em `c2db00f` ("pacote fundador do Radar Cívico"). O que
sobrou **não foi removido**, e isso é correto:

| Resíduo | Onde | Situação |
|---|---|---|
| `radar_civico` (senha do Postgres de dev) | `docker-compose.yml`, `apps/web/.env.example` | Resíduo de infraestrutura local. **Não vale o custo de migrar** — mudar a senha exigiria recriar o volume e reconfigurar o ambiente de todo mundo, por zero ganho |
| "Radar Cívico" no histórico do Git | commits antigos | **Não se reescreve história** |

Registrado em [`CHANGELOG.md`](CHANGELOG.md) para que quem encontrar a senha
`radar_civico` não pense que existe um segundo produto.

**Lição:** nem todo resíduo de depreciação precisa ser eliminado. Eliminar resíduo
inofensivo tem custo e risco; o que importa é que ele esteja **explicado**.

### 3.3 Remoção de conteúdo da home: depreciação de mensagem

O redesenho da home (commit `52f45d9`) removeu elementos, e cada remoção foi
**registrada com motivo** em
[`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md):

| Removido | Motivo registrado |
|---|---|
| Selo "MVP em construção · Fase 0 concluída" | Bastidor interno no espaço mais valioso da página; comunica fragilidade, não valor. O status real vive em `/status` |
| 7 botões de navegação idênticos na hero | Zero hierarquia. Substituído por 1 CTA primário + secundários menores |
| "Metodologia IDIP v1.0" hardcoded | Contradizia o motor real |
| Seção "API pública (em construção)" | Interessa a desenvolvedor, não ao eleitor |

**Este é o padrão correto de depreciação de conteúdo:** remover **e registrar o
motivo no documento que governa aquela superfície**. A tabela acima é o registro de
depreciação do funil.

### 3.4 Retirada de dado por obrigação legal

O caso mais bem definido do projeto — e o único com **mecanismo técnico completo**:

| Ação | Efeito | Onde |
|---|---|---|
| `DELETE /api/consent` | Registra `politicalConsentWithdrawnAt` **e elimina todos os votos** do usuário, em transação | `apps/web/src/app/api/consent/route.ts` |
| `DELETE /api/account` | `user.delete()` com cascade para `UserBillVote`, `Session`, `Account` | `apps/web/src/app/api/account/route.ts` |
| Ocultação automática de registro judicial | Filtro remove `type === "CLEARED"` e `status === "ARQUIVADO"` da resposta pública | `apps/web/src/app/api/politicians/[id]/route.ts` |

A ocultação de registro judicial é a forma mais elegante de depreciação do projeto:
**o dado permanece no banco** (com `sourceUrl` e `retrievedAt`, para auditoria), mas
é **retirado da apresentação pública** por regra explícita. Não é apagar — é deixar
de expor, com critério.

**Este é o padrão a seguir para "depreciar" dado de terceiro:** não apague; pare de
exibir, com regra explícita e verificável.

### 3.5 Correção de premissa em documentação: depreciação de **afirmação**

O projeto tem um histórico consistente de depreciar as próprias afirmações erradas —
e isso é tratado como manutenção, não como constrangimento:

| Afirmação depreciada | Correção | Commit |
|---|---|---|
| "TCU: api-publica exige credenciais (401) — sem endpoint aberto estável" | O host **não existe**; o TCU tem API pública aberta em outro endereço | anexo em `docs/ops/anexos/` |
| "CDN do TSE bloqueada" | Responde **HTTP 200** em todos os testes | idem |
| "STF: portal sem API consolidada (403)" | **Confirmado** — a premissa estava certa | idem |
| "`force-dynamic` desliga todo cache" | Equivale a `fetch({ cache: 'no-store' })`; o Data Cache continua ativo | `9917add` |
| "`pool_size: 15` é teto do plano gratuito" | É **default configurável**; o teto do Nano é 60/200 | `ad96088`, `259fb2e` |
| "`/status` diz que TSE e Querido Diário estão bloqueados" | Ambos respondem 200 | `e5956f4` |
| "Alerta de CVE do NextAuth exige ação hoje" | **Incorreto** — o projeto já rodava `next-auth@4.24.15` | nota no topo do anexo |

**Padrão:** a correção é feita **no lugar** (ou com nota de correção no topo do
documento original), citando a medição que a motivou. Não se apaga o texto antigo
silenciosamente — registra-se que estava errado e por quê. Ver
[`MEMORY.md`](MEMORY.md).

## 4. O que **não** existe

| Item | Situação |
|---|---|
| Política escrita de depreciação de API | ❌ **não existe** |
| Cabeçalho `Deprecation` / `Sunset` (RFC 8594 / 9745) | ❌ não implementado |
| Versionamento de rota (`/api/v1/`) | ❌ não existe — nenhuma rota é versionada (ver [API.md](../04-api-integrations/API.md) §1) |
| Negociação de versão | ❌ não existe |
| Registro de "campos obsoletos" nas respostas | ❌ não existe |
| Período de carência declarado para remoção | ❌ não existe |
| Política de remoção de dimensão do IDIP | 🟡 a prática existe (bump de versão); **o procedimento não está escrito** |
| Processo para descontinuar uma **fonte de dados** | ❌ não existe |
| Aviso de descontinuação in-product | ❌ não existe |

## 5. O que precisa ser decidido antes da primeira depreciação real

A pergunta que vai aparecer: **as rotas de API são públicas?** A resposta do projeto
hoje é **não** — não há API pública publicada ([API.md](../04-api-integrations/API.md) §1).
Isso muda o custo da decisão:

| Se a rota é... | Obrigação |
|---|---|
| **Interna** (status atual) | Renomear é aceitável: só a própria UI consome. Ainda assim, o smoke de produção usa `/api/rankings` e `/api/search` — **quebrar o smoke é quebrar o monitoramento** |
| **Pública** (não é o caso) | Exige período de carência, versão nova em paralelo, `Sunset` e comunicação |

**Decisões pendentes, em ordem:**

1. **Publicar ou não uma API pública.** Enquanto a resposta for "não", não faz sentido
   construir maquinaria de depreciação de API. Ver [API.md](../04-api-integrations/API.md) §1.
2. **Qual o canal de comunicação** de uma depreciação. Não há changelog publicado no
   site, nem feed, nem canal de anúncio. O [`CHANGELOG.md`](CHANGELOG.md) é interno e
   derivado do Git.
3. **Como depreciar uma dimensão do IDIP.** O `HARD_CAP` de 39,9 e o baseline neutro
   50 fazem parte de uma promessa pública em `/metodologia`. Remover uma dimensão
   muda o significado de **toda nota histórica** — e a versão só resolve se a UI e
   `/metodologia` comunicarem a mudança (os gates de §3.1 existem exatamente para
   isso).
4. **O que fazer com `ScoreSnapshot` histórico** de uma fórmula depreciada. O
   snapshot mensal (`monthly-snapshot.yml`) existe para dar série temporal; o
   histórico **precisa** permanecer legível com a versão que o gerou.

   **Lacuna verificada:** o modelo `ScoreSnapshot` no schema **não tem campo
   `version`**. Os campos são `termId`, `snapshotDate`, `finalScore`,
   `confidenceScore`, `reliabilityStatus`, `breakdown` (Json) e `events` (Json), com
   `@@unique([termId, snapshotDate])`. O script (`snapshot-scores.ts`) grava
   `finalScore`, `confidenceScore`, `reliabilityStatus`, `breakdown` e `events` — mas
   **não a versão do motor**.

   **Consequência concreta:** um snapshot de outubro/2026 e outro de, digamos,
   janeiro/2027 podem ter sido calculados por motores diferentes **sem que o
   snapshot registre isso**. A série temporal parece contínua e não é comparável. Se
   o IDIP for para v1.2 mantendo o `Score.version` apenas na tabela `Score`, o
   histórico de snapshots perde a capacidade de dizer "esta nota foi calculada
   assim". **Recomendação:** adicionar `version` a `ScoreSnapshot` e gravá-la no
   script — mudança pequena, e é exatamente o que a regra de versionamento do
   IDIP exige para ser aplicável ao histórico.

## 6. Regras que se aplicam hoje

1. **Mudou a fórmula do IDIP? Suba `Score.version`** e atualize `/metodologia` +
   `verify-scoring.ts`. `CONTRIBUTING.md` §3.
2. **Nunca recalcule score histórico** com a fórmula nova por cima do antigo.
   *"scores nunca recriados"*, commit `0a79609`.
3. **Nunca apague dado de terceiro.** Pare de exibir, com regra explícita —
   modelo de `CLEARED`/`ARQUIVADO`.
4. **Sempre apague dado pessoal de usuário quando houver revogação/exclusão.**
   É obrigação legal, com cascade.
5. **Registre a remoção de conteúdo de UI no documento que governa aquela
   superfície** — modelo da tabela "O que foi removido da home e por quê".
6. **Ao corrigir uma afirmação errada, registre que estava errada e o que a
   motivou.** Não apague silenciosamente.
7. **Não elimine resíduo inofensivo só por limpeza.** Explique-o. Modelo:
   a senha `radar_civico`.
8. **Antes de renomear ou remover rota usada pelo smoke de produção, atualize o
   workflow junto.** `production-smoke.yml` depende de `/api/search?q=lula` e
   `/api/rankings?limit=5` e da string `"Indisponível"` na `/status`.
9. **Toda remoção que afeta o usuário passa por
   [`CONTENT.md`](../04-api-integrations/CONTENT.md)** — inclusive a mensagem de
   despedida. Nada de "recurso morto", "legado" ou jargão.

## 7. Não verificado

- Se alguma rota de API, campo ou dimensão do IDIP **já foi removida** desde o início
  do projeto. Não foi feita arqueologia de todas as mudanças de schema — apenas a
  leitura do histórico de commits.
- Se existe **comunicação pública** de mudanças (feed, changelog no site, anúncio).
  Verificado que **não há canal no repositório**; pode existir fora dele.
- Se há **consumidores externos** das rotas de API além do smoke de produção e da
  própria UI. O `README.md` menciona que a home antiga prometia uma API pública —
  e ela foi removida da home —, mas **não foi verificado** se algum terceiro chegou
  a consumi-la.
- Se o `ScoreSnapshot` mensal guarda a versão do motor junto com a nota — **lido e
  verificado: não guarda.** Ver §5.4.
- Se existe **migração de schema revertida** em algum momento (o histórico do
  `prisma/migrations` não foi percorrido).
