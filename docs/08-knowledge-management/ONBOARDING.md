# Onboarding

Roteiro para quem entra no projeto hoje. **Ordenado pelo que desbloqueia o próximo
passo** — não por completude documental.

Tempo estimado para o primeiro código rodando: **~30 minutos** (a maior parte é
`npm install` e o download da imagem do Postgres).

## 1. Em uma frase

Plataforma open-source (**AGPL-3.0-only**) de transparência política que agrega dados
públicos da Câmara, do Senado e do TSE e calcula o **IDIP** — Índice de Desempenho e
Integridade Pública — para pessoas e partidos. Produção:
https://www.curriculopolitico.org

**O diferencial declarado é "algoritmos abertos".** É por isso que divergência entre a
UI e a fórmula é tratada como o defeito mais caro possível, e por isso existe um teste
para detectá-la.

## 2. Os cinco conceitos que você precisa ter na cabeça

### 2.1 IDIP e Termômetro

**IDIP (0–100)** mede desempenho com pesos distintos para Legislativo, Executivo e
Judiciário (STF tem pesos próprios porque ministro é **nomeado, não eleito** — as
dimensões de mandato não se aplicam).

**Termômetro de Confiabilidade** é o estado ao lado da nota: 🟢 Confiável ·
🟡 Atenção · 🔴 Não Confiável · ⚪ **Dados Insuficientes** (GRAY — **fora do
ranking**).

Versão atual do motor: **1.1.0** (exibida como v1.1). Fonte de verdade:
`packages/idip/src/scoring.ts` + `apps/web/src/lib/methodology.ts`.

### 2.2 Baseline neutro 50

Dimensão **sem dados** recebe **50**, e a interface **identifica** isso como baseline
por ausência de dados. Hoje a **Integridade (25%, maior peso)** opera em baseline
porque `LegalRecord` está **vazio** — e as travas de integridade nunca disparam.

Isso não é bug: é limitação de fonte declarada. É também a **maior lacuna aberta** do
projeto (T-01).

### 2.3 A votação popular não altera a nota

Votar em projetos é uma camada de engajamento **separada**. Nunca altera o IDIP, e a
UI **não pode sugerir o contrário**.

O voto é tratado como **dado pessoal sensível** (opinião política, Art. 11 LGPD):
exige consentimento específico ativo, e a revogação **elimina todos os votos do
usuário**.

### 2.4 Linguagem jurídica estrita

Apenas **"Réu em Ação Penal"** e **"Condenação Transitada em Julgado"**. Nunca
"crime", "criminoso" ou juízo moral sobre pessoas. Vale para código, copy,
`description` de metadata, `alt` de imagem e comentário de commit.

### 2.5 A prova é opcional; a página não é

Toda página pública que depende do banco tem contrato de falha: **a prova
desaparece, a página continua**. E **nunca** se renderiza "0 políticos avaliados".

## 3. Primeiros 30 minutos

```bash
git clone https://github.com/ENDARTStudios/Curriculo-Politico.git
cd Curriculo-Politico
npm install

docker compose up -d                      # Postgres 15432 + Redis 16379
cp apps/web/.env.example apps/web/.env    # já aponta para localhost:15432

npm run db:migrate
npm run db:seed                           # 3 perfis fictícios: GREEN, YELLOW, RED
npm run dev                               # http://localhost:3000
```

> ### ⚠️ Leia isto antes de qualquer script de dados
>
> **`DATABASE_URL` manda em tudo.** Todo script de dados (`db:load-*`, `db:seed*`,
> `seed:production`, `recalculate-scores`, `db:snapshot`) grava no banco que ela
> apontar — **inclusive o Supabase de produção**.
>
> A única salvaguarda implementada é em `db:seed`, que **recusa** rodar contra banco
> remoto (salvo `CP_ALLOW_REMOTE_SEED=1`). Os outros scripts **não têm** essa guarda.
>
> Detalhes: [`SETUP.md`](../03-development-process/SETUP.md) §5.

### Verificação de que o ambiente está de pé

```bash
npm run typecheck        # deve passar
npm run verify:scoring   # não precisa de banco
npm run verify:identity  # não precisa de banco
```

Se `npm run build` falhar com `ENOENT .../route.js.nft.json` ou
`Invariant: no direct app page entry found for /_not-found`: **não é bug no código** —
é um `next dev` ativo (inclusive órfão) escrevendo em `apps/web/.next`. Mate o
processo. Ver [`DEVELOPMENT.md`](../03-development-process/DEVELOPMENT.md) §6.1.

## 4. Ordem de leitura (não leia tudo)

| Ordem | Documento | Por que agora |
|---|---|---|
| 1 | Este arquivo | Orientação |
| 2 | [`SETUP.md`](../03-development-process/SETUP.md) | Ambiente funcionando, com troubleshooting |
| 3 | [`DEVELOPMENT.md`](../03-development-process/DEVELOPMENT.md) | Onde as coisas vivem + armadilhas |
| 4 | [`RULES.md`](../03-development-process/RULES.md) | As regras que não se negociam |
| 5 | [`TESTING.md`](../03-development-process/TESTING.md) | O que rodar antes de abrir PR |
| 6 | [`MEMORY.md`](MEMORY.md) | **Por que** as decisões foram tomadas. Leia as seções A e F primeiro |
| 7 | [`TASKS.md`](../03-development-process/TASKS.md) | O que está aberto, para escolher por onde começar |

Depois, conforme a área em que você vai mexer:

| Se você vai mexer em... | Leia |
|---|---|
| Qualquer interface | [`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md) + as skills de design (§7) |
| Acessibilidade | [`ACCESSIBILITY.md`](../07-operations-marketing/ACCESSIBILITY.md) |
| SEO / metadata / sitemap | [`SEO.md`](../07-operations-marketing/SEO.md) |
| Texto, copy, resumo de projeto | [`CONTENT.md`](../04-api-integrations/CONTENT.md) |
| Rotas de API | [`API.md`](../04-api-integrations/API.md) |
| ETL / fontes de dados | [`INTEGRATIONS.md`](../04-api-integrations/INTEGRATIONS.md) |
| Performance | [`PERFORMANCE.md`](../07-operations-marketing/PERFORMANCE.md) |
| Erro e estado vazio | [`ERROR_HANDLING.md`](../07-operations-marketing/ERROR_HANDLING.md) |
| Deploy / infra | [`docs/06-devops-deployment/`](../06-devops-deployment/) |

## 5. Mapa do repositório

```
apps/
  web/          Next.js 15.5 App Router · React 19 · Tailwind v4 · Prisma — deploy Vercel
  pipeline/     Scripts TS de carga + ETLs Python 3.12
packages/
  idip/         Motores puros (só TS fonte, sem build): scoring.ts + identity.ts
tests/e2e/      Playwright — 48 testes em 3 arquivos
.design-review/ Ferramentaria local de captura/medição (NÃO é código de produto)
.dsh/skills/    Skills de design e domínio
docs/           Documentação (03 a 08 + design/ + ops/anexos)
data/raw/       Camada raw imutável do ETL (gitignored)
.github/workflows  CI · a11y · snapshot mensal · smoke de produção
docker-compose.yml Postgres 15432 + Redis 16379
```

**A raiz contém apenas configuração global.** Não crie código de aplicação na raiz.

**Todo comando roda da raiz** e delega para o workspace: `npm run dev`, `npm run
build`, `npm run db:*`, `npm run etl:*`, `npm run verify:*`.

## 6. Ferramentas que você vai usar

| Ferramenta | Como | Para quê |
|---|---|---|
| **Playwright** | `npm run e2e` (sobe servidor na **3033**) · `npm run e2e:ui` · `npm run e2e:prod` | Acessibilidade, SEO, funil, rotas. 48 testes |
| **Impeccable** | `npm run design:detect` | Detector determinístico de anti-padrões. **Deve sair com exit 0** |
| **axe** (local) | `node .design-review/axe.cjs <url> [largura]` | Violações com seletor e HTML. Exige Chrome em `--remote-debugging-port=9222` |
| **capture** | `node .design-review/capture.cjs <url> <largura> <altura> <saida.png>` | Captura no viewport **exato** + mede overflow |
| **contraste** | `node .design-review/contraste.cjs` | Contraste WCAG da paleta, calculado |
| **linhas** | `node .design-review/linhas.cjs <url> [largura]` | Qual elemento tem linhas longas (>80 chars) |
| **Prisma Studio** | `npx prisma studio --schema=apps/web/prisma/schema.prisma` | Inspecionar o banco. **Pare o dev server antes** (`prisma generate` falha com `EPERM`) |

Nota: `chrome --headless --screenshot --window-size=...` **não funciona** neste
projeto — `--window-size` é ignorado e a captura sai em 756×481. Use `capture.cjs`.
Ver [`MEMORY.md`](MEMORY.md) A-04.

## 7. Interfaces com agente (se você usa IA no fluxo)

O repositório tem **skills carregáveis** que são a fonte de verdade de design e
domínio. Carregue-as antes de mexer na área correspondente:

**Design** (`.dsh/skills/`):

| Skill | Use para |
|---|---|
| `curriculo-design-system` | Tokens, cores semânticas do Termômetro, tipografia, espaçamento, acessibilidade |
| `curriculo-marketing-funnel` | Gancho → Promessa → Prova → CTA; compliance jurídico da copy |
| `curriculo-hero` | Padrão da home/hero e busca de números reais |
| `curriculo-design-review` | Auditar uma UI antes de considerá-la pronta |

**Domínio** (`.claude/skills/`): `curriculo-idip`,
`curriculo-data-pipeline`, `curriculo-infra`, `curriculo-juridico`.

Briefs de subagentes de design: [`docs/design/agents/`](../design/agents/)
(ui-ux-designer, critico-visual, copywriter-conversao, auditor-acessibilidade).

## 8. Onde começar a contribuir

O projeto tem **backlog real e verificado** em
[`TASKS.md`](../03-development-process/TASKS.md). Sugestões por perfil:

| Você quer... | Comece por | Por quê |
|---|---|---|
| **Entender o motor** | T-04 (testes unitários dos motores e rotas) | `verify-scoring.ts` mostra o padrão; as rotas de API não têm nenhum teste |
| **Mexer em dados** | T-01 (carga de `LegalRecord`) | Maior lacuna do produto. **O lado TCU está destravado** por uma API pública sem autenticação |
| **Mexer em front-end** | T-14 (estender o gate de a11y) | Custo baixo, valor direto: o padrão de teste é um `goto` + auditar |
| **Mexer em infra** | T-03 (teste de restauração de backup) | Backup nunca restaurado não é backup |
| **Melhorar confiabilidade** | T-06 + T-07 (fronteiras de erro) | Um erro de render derruba a página inteira hoje; erros de banco não são registrados |
| **Documentação** | T-15 + T-16 (referências quebradas) | O `CONTRIBUTING.md` da raiz descreve a estrutura pré-monorepo, e `SECURITY_BASELINE.md` é citado em 5 arquivos sem existir |

Escolha **um** item 🔴 (não ⛔) que caiba na sua sessão, e fatie com
[`TASK_BREAKING_DOWN.md`](../03-development-process/TASK_BREAKING_DOWN.md).

### Documentos de referência em outras áreas

| Documento | Para quê |
|---|---|
| [`docs/02-architecture-design/ARCHITECTURE.md`](../02-architecture-design/ARCHITECTURE.md) | Componentes, fluxo de dados, fronteiras e invariantes |
| [`docs/02-architecture-design/SCORING_METHODOLOGY.md`](../02-architecture-design/SCORING_METHODOLOGY.md) | A fórmula do IDIP em detalhe: pesos, hard caps, regra de ranking |
| [`docs/02-architecture-design/DATA_MODEL.md`](../02-architecture-design/DATA_MODEL.md) | Modelo de dados |
| [`docs/05-security-compliance/COMPLIANCE.md`](../05-security-compliance/COMPLIANCE.md) | LGPD, base legal por operação, retenção |
| [`docs/06-devops-deployment/`](../06-devops-deployment/) | Deploy, backup/DR, CI/CD, FinOps |

## 9. As cinco armadilhas que vão te custar tempo se você não ler

1. **`next dev` + `next build` no mesmo `.next`** → falhas de build intermitentes e
   enganosas. Mate o dev server antes de buildar.
2. **`prisma generate` com o dev server rodando** → `EPERM` no lock do
   `query_engine-windows.dll.node`.
3. **`DATABASE_URL` aponta para produção** → seus comandos locais alteram produção.
4. **A porta 3000 é disputada** → use a 3033 (a suíte já usa).
5. **`--window-size` do Chrome headless é ignorado** → use `capture.cjs`.

Todas estão detalhadas em [`MEMORY.md`](MEMORY.md) seção A.

## 10. Como pedir ajuda

| Assunto | Canal |
|---|---|
| Bug, dado incorreto, dúvida técnica | **Issue** no repositório (é o canal documentado no `/faq`) |
| Dado incorreto (você é o titular) | Canal `/retificacao` do site — com protocolo rastreável |
| Vulnerabilidade de segurança | `endart.studios+security@gmail.com` |
| Privacidade / LGPD (DPO: Equipe END ART Studios) | `endart.studios+privacidade@gmail.com` |
| Direitos do titular (Art. 18/19) | `endart.studios+direitos@gmail.com` |
| Institucional / imprensa | `endart.studios+contato@gmail.com` |

A lista completa e canônica está em `apps/web/src/lib/contato.ts`. **Não use endereços
`@curriculopolitico.org`** — não têm caixa postal operacional.

**Conduta:** o projeto não tem código de conduta formal nem canal dedicado. Ver
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — lá está o compromisso real (uma frase) e a
lacuna declarada.

## 11. Regras em uma tela

```
Nunca:
  ✗ "crime" / "criminoso" / juízo moral sobre pessoa
  ✗ exibir número sem consulta real ao banco
  ✗ renderizar "0 políticos avaliados"
  ✗ redigitar versão/pesos do IDIP na UI (derivar do motor)
  ✗ sugerir que a votação popular afeta a nota
  ✗ propagar CPF, endereço ou dado familiar
  ✗ criar tailwind.config.js (Tailwind v4 é CSS-first, tokens em globals.css)
  ✗ adicionar dependência sem necessidade comprovada
  ✗ licença incompatível com AGPL-3.0-only
  ✗ `catch {}` sem binding em código novo

Sempre:
  ✓ medir antes de concluir (cold start já enganou este projeto)
  ✓ degradar a página, nunca quebrá-la
  ✓ rodar typecheck + verify:scoring + verify:identity + build antes do PR
  ✓ rodar e2e e impeccable quando mexer em UI
  ✓ conferir em 375px / 768px / 1280px
  ✓ atualizar o documento que afirma o comportamento alterado
  ✓ commit em português, imperativo
```

## 12. Não verificado

- Se existe **processo de revisão de PR** além do CI (revisor obrigatório, template de
  PR). Não há template `.github/pull_request_template.md` no repositório; a
  configuração de branch protection não é visível no código.
- Se há **canal de comunicação da equipe** (chat, lista) além das issues.
- Se existe **documentação de produto** anterior (PRD, roadmap) — o
  `CONTRIBUTING.md` da raiz cita `01-product-discovery/` e
  `02-architecture-design/`, que **não existem** hoje na estrutura (ver T-15/T-16).
