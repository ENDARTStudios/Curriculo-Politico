# Custo de Build na Vercel — diagnóstico e alternativas

Registro do problema relatado (limite de gastos estourado por **Build CPU Minutes**
no plano PRO), do que foi medido e das opções, para não refazer a investigação.

## Como o custo é gerado

Build CPU Minutes são consumidos **por deploy**, não por acesso ao site. Três
multiplicadores:

1. **Todo push constrói.** Sem `ignoreCommand`, a Vercel constrói em qualquer
   alteração no repositório.
2. **Cada PR gera um preview deploy**, e cada novo push no PR gera outro.
3. **O CI já constrói de novo.** `.github/workflows/ci.yml` roda `npm run build`
   no GitHub Actions a cada push. Ou seja: o mesmo build é pago duas vezes, em
   orçamentos diferentes.

O que **não** consome build minutes: cron de `/api/health`, o workflow de
acessibilidade (roda contra produção a cada 6h) e o tráfego do site.

## O que foi medido neste repositório

```
commits totais ..................... 124
commits que tocam apps/web .........  70
commits que NÃO tocam apps/web .....  54  (44%)
últimos 40 commits .................  30 com web · 10 sem web (25%)
```

Mudanças em `apps/pipeline/`, `docs/` e `.github/` não alteram o site — mas
geravam build completo do Next + Prisma.

**`.vercelignore` não resolve isso.** Ele reduz o que é enviado para a Vercel, mas
o build continua rodando. A configuração correta é `ignoreCommand`.

## Correção aplicada

`apps/web/vercel.json` passou a declarar:

```json
"ignoreCommand": "cd \"$(git rev-parse --show-toplevel)\" && node scripts/vercel-ignorar-build.mjs"
```

`scripts/vercel-ignorar-build.mjs` compara o commit atual com
`VERCEL_GIT_PREVIOUS_SHA` e decide. Semântica da Vercel: **saída 0 = pular**,
saída ≠ 0 = construir.

Constrói se mudou: `apps/web/**`, `packages/**`, `package.json`,
`package-lock.json`, `.npmrc`, `tsconfig*`, `scripts/vercel-*`.

Pula se só mudou: `apps/pipeline/**`, `docs/**`, `.github/**`, `data/**`, README.

Falha para o lado seguro: sem commit anterior, sem `git` ou com erro de leitura,
**constrói**. Pular um build necessário publicaria versão velha — pior que gastar
minutos.

Verificado com commits reais:

```
e56683f (só apps/pipeline/scripts/acervo.ts)  → PULAR    (exit 0)
HEAD    (package.json)                        → CONSTRUIR (exit 1)
```

## Alternativas estruturais

### A. Manter Vercel, só cortar desperdício — **aplicado**

Ganho estimado: 25–44% dos builds, pela proporção histórica. Risco: baixo.
Não resolve o caso de muitos PRs que mexem em `apps/web`.

### B. Construir no GitHub Actions e enviar pronto (`vercel deploy --prebuilt`) — **workflow pronto**

O repositório é **público**, e GitHub Actions é **gratuito e sem limite de minutos
para repositórios públicos**. A Vercel passaria a apenas servir o artefato — custo
de Build CPU Minutes vai a **zero**.

Implementado em `.github/workflows/deploy-vercel-prebuilt.yml`, com disparo
**manual** de propósito: ligá-lo a `push` antes de validar significaria publicar sem
rede — se o build no Actions falhar, produção continua na versão anterior sem
ninguém perceber.

Requisitos: secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; e desligar
o build automático da Vercel (Project → Settings → Git → *Ignored Build Step* =
`exit 0`), senão ela constrói de novo e o custo continua. As variáveis da aplicação
(`DATABASE_URL`, `NEXTAUTH_SECRET`…) não precisam ser duplicadas: `vercel pull` as
traz do projeto.

Custo: um workflow novo, e o deploy passa a depender do Actions estar verde.
Risco: médio (muda o caminho de publicação).

### C. Migrar o app para o Railway (já contratado)

O projeto já paga Railway para Postgres e Redis. Railway cobra por uso de
CPU/RAM do serviço, não por "build minutes" separados, e o build roda no mesmo
lugar do runtime. Elimina a conta da Vercel, mas troca um problema de custo por
uma decisão de arquitetura (Dockerfile, healthcheck, rollback, preview por PR
inexistente). Risco: alto para o momento atual.

### D. Cloudflare Pages / Workers

Build gratuito (500/mês) e execução barata, mas Next 16 no Cloudflare exige o
adaptador OpenNext, com arestas conhecidas em ISR e middleware. O projeto usa
`proxy`/middleware com next-auth — migração a validar antes de prometer. Risco:
alto.

## Recomendação

1. **Agora**: o `ignoreCommand` já está no repositório. Além dele, no painel da
   Vercel: *Settings → Git* → limitar preview deploys (ex.: "Only build production
   branch" ou filtrar por branch), e conferir *Settings → Billing* → **Spend
   Management** em "Pause" ao atingir o limite, para o excedente não continuar.
2. **Se o volume de PRs em `apps/web` continuar alto**: B, que zera o custo de
   build na Vercel usando minutos gratuitos do Actions.
3. **C e D**: só se houver motivo além de custo.

## O que ainda não foi medido

Não há número de duração de build neste registro — seria preciso ler o histórico
de deployments na Vercel (`vercel ls --meta` ou o painel). Sem esse dado, os
ganhos acima estão expressos em **proporção de builds**, que é o que o repositório
permite afirmar.

## Achado posterior: o consumo é do TIME, não só deste projeto

A conta `end-art-studios` hospeda **7 projetos** e Build CPU Minutes é um pool
**compartilhado**:

```
curriculo-politico · auto-trader · shop-finder · nexus-alpha
tank-wallet · almanaque-dos-clubes · media-rate
```

Os outros seis tinham deploys recentes no momento da investigação. Ou seja:
otimizar só o Currículo Político **não resolve** um estouro de conta. A ordem
certa é olhar o consumo por projeto em *Team Settings → Usage → Builds* e aplicar
`ignoreCommand`/filtro de branch nos que mais publicam.

Deste projeto, o que se sabe: builds levam **26–33 s** (medido em `vercel ls`), e
44% dos commits históricos não tocavam o app.
