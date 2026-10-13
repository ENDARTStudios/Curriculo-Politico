# CONTRIBUTING — decisão de localização

## TL;DR

**A fonte canônica de `CONTRIBUTING.md` permanece na raiz do repositório.** Este
arquivo é um **ponteiro**, não uma cópia.

👉 **Leia: [`/CONTRIBUTING.md`](../../CONTRIBUTING.md)**

## A decisão, e por que foi tomada

Havia duas opções ao criar a documentação em `docs/08-knowledge-management/`:

| Opção | O que envolvia | Veredito |
|---|---|---|
| **A — Manter a fonte na raiz** e escrever um ponteiro aqui | Nada a mover; aqui fica um resumo com links para o documento real | ✅ **escolhida** |
| **B — `git mv CONTRIBUTING.md docs/08-knowledge-management/CONTRIBUTING.md`** | Mover o arquivo e atualizar as referências em `README.md` | ❌ recusada |

**Por que a opção A venceu:**

1. **É convenção do GitHub.** O GitHub procura `CONTRIBUTING.md` na raiz, em
   `.github/` e em `docs/` — e a **raiz** é a localização que ele reconhece e
   promove na interface (o link "Contributing" aparece automaticamente na página do
   repositório, e o arquivo é sugerido ao abrir uma issue ou um PR). Mover o arquivo
   para `docs/08-knowledge-management/` faria o GitHub **parar de reconhecê-lo**: a
   pasta `docs/` só é verificada na raiz do repositório (`docs/CONTRIBUTING.md`),
   não em subdiretório.
2. **O `README.md` já aponta para a raiz.** Verificado: o `README.md` não tem link
   direto para `CONTRIBUTING.md` hoje, mas a convenção está estabelecida no
   repositório e o GitHub a expõe. Mover exigiria criar e manter um link novo em um
   lugar onde ele é redundante.
3. **`AGENTS.md` e as skills leem a raiz.** Ferramentas de agente (incluindo as
   skills em `.dsh/skills/` e `.claude/skills/`) e ferramentas de revisão de PR
   procuram convenções de contribuição na raiz. Mover quebraria essa descoberta sem
   ganho.
4. **O custo de manter duas cópias é o defeito que este projeto mais teme.** O
   projeto já foi corrigido uma vez por ter duas fontes de verdade divergentes: a
   home anunciava "IDIP v1.0" enquanto o motor rodava v1.1. Duplicar o
   `CONTRIBUTING.md` criaria exatamente esse risco — um documento de contribuição
   atualizado pela metade.

**A convenção adotada neste projeto, para documentação em geral:**

| Tipo de arquivo | Onde vive | Por quê |
|---|---|---|
| Documento que a **plataforma** precisa descobrir (`README.md`, `CONTRIBUTING.md`, `LICENSE`, `CODE_OF_CONDUCT.md` se adotado) | **raiz** | Descoberta automática por GitHub e por ferramentas |
| Documento **temático** | `docs/<área>/` | Organização por assunto |
| Documento **operacional** necessário no build/deploy | junto ao workspace (`apps/web/README.md`) | Proximidade do código |

## Estado do documento na raiz: **desatualizado**

O `CONTRIBUTING.md` da raiz contém informações **incorretas** hoje. Foram verificadas
e estão listadas aqui para correção centralizada — **este arquivo não as corrige**,
para não criar uma segunda versão divergente.

| Item | O que o arquivo diz | O que é verdade |
|---|---|---|
| Variáveis de ambiente | `cp .env.example .env` | O exemplo está em `apps/web/.env.example` e o destino é `apps/web/.env` |
| Verificação de tipos | `npx tsc --noEmit` | `npm run typecheck` |
| Migração | `npx prisma migrate deploy` | `npm run db:migrate` (o deploy usa `migrate deploy` internamente) |
| Início do dev | `npm run dev` | ✅ correto |
| §4 "Estrutura do repositório" | `01-product-discovery/`, `02-architecture-design/`, `05-security-compliance/`, `06-devops-deployment/`, `etl/`, `prisma/`, `scripts/`, `src/` **na raiz** | Estrutura **pré-monorepo** (ver `git log`, commit `f3c7630`). Hoje: `apps/web`, `apps/pipeline`, `packages/idip`, `docs/`, `tests/e2e`, `data/` |
| §3 "Regras do projeto" | Aponta para `05-security-compliance/SECURITY_BASELINE.md` | **O arquivo não existe** em nenhum lugar do repositório. A citação está em **5 arquivos**: `CONTRIBUTING.md`, `apps/web/src/middleware.ts`, `apps/web/src/app/api/politicians/[id]/route.ts`, [`docs/01-product-discovery/LEGAL_TERMS.md`](../01-product-discovery/LEGAL_TERMS.md) e [`docs/01-product-discovery/ROADMAP.md`](../01-product-discovery/ROADMAP.md). O conteúdo equivalente mais próximo é [`docs/05-security-compliance/COMPLIANCE.md`](../05-security-compliance/COMPLIANCE.md) — **não confirmado** como substituto oficial. Exige decisão: criar o documento ou redirecionar as 5 citações |
| §3 "Regras do projeto" | Cita `SCORING_METHODOLOGY.md` sem caminho | O documento **existe** em [`docs/02-architecture-design/SCORING_METHODOLOGY.md`](../02-architecture-design/SCORING_METHODOLOGY.md); falta o caminho na citação |
| §2 "Contribuindo com código" | Descrição do fluxo | Válido, mas o guia completo é [`SETUP.md`](../03-development-process/SETUP.md) |

### O que continua correto e vale ler na raiz

- **§1 Reportando dados incorretos** — "toda correção passa pela fonte oficial,
  nunca editamos dados manualmente". É regra vigente e está em
  [`RULES.md`](../03-development-process/RULES.md) §2.
- **§3 Regras do projeto** — neutralidade algorítmica, linguagem jurídica estrita,
  fontes oficiais apenas, LGPD, versionamento do IDIP, testes primeiro. Todas
  vigentes e consolidadas em [`RULES.md`](../03-development-process/RULES.md).
- **§5 Estilo** — TypeScript estrito, commit em português imperativo, UI dark e
  acessível, sem frases opinativas. Vigente.
- **Código de Conduta** — uma frase, mas real. Ver
  [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Por onde começar (roteiro para quem vai contribuir agora)

O `CONTRIBUTING.md` da raiz assume que você já conhece o projeto. Para começar do
zero, a ordem correta é:

1. [`SETUP.md`](../03-development-process/SETUP.md) — ambiente, banco, variáveis,
   e a armadilha de `DATABASE_URL`.
2. [`DEVELOPMENT.md`](../03-development-process/DEVELOPMENT.md) — onde as coisas
   vivem, o ciclo de uma mudança e as armadilhas conhecidas (a mais importante: `next
   dev` e `next build` compartilham `apps/web/.next`).
3. [`RULES.md`](../03-development-process/RULES.md) — as regras que não se negociam.
4. [`TESTING.md`](../03-development-process/TESTING.md) — o que rodar antes de
   abrir PR. **Atalho:** `npm run typecheck && npm run verify:scoring && npm run
   verify:identity && npm run build`.
5. [`TASKS.md`](../03-development-process/TASKS.md) — trabalho aberto real, com
   [método de quebra](../03-development-process/TASK_BREAKING_DOWN.md) para fatiar.

## Se você quer mudar a estrutura de contribuição

Mudar a localização do `CONTRIBUTING.md` é uma decisão, não um ajuste. Se você tem
um motivo forte para mover (por exemplo, adoção de um monorepo com `docs/` como raiz
documental, onde `docs/CONTRIBUTING.md` passaria a ser reconhecido), o caminho é:

1. Registrar a decisão em [`MEMORY.md`](MEMORY.md), com data e o que foi descartado.
2. Fazer `git mv` (preserva o histórico) — **nunca** copiar e editar.
3. Atualizar **todas** as referências de uma vez (`README.md`, `AGENTS.md`, este
   arquivo e qualquer skill que aponte para a raiz).
4. Deixar um ponteiro na raiz apontando para o novo local, para não quebrar links
   externos e a descoberta por ferramentas antigas.
