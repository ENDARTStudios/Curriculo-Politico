# AGENTS.md — Currículo Político

Plataforma open-source de transparência política (IDIP) — dados públicos da
Câmara, do Senado e do TSE. Monorepo npm workspaces: `apps/web` (Next.js 15 +
Tailwind v4 + Prisma) e `apps/pipeline` (ETL). Detalhes em `README.md`.

## Antes de mexer em qualquer interface

Carregue as skills de design. Elas são a fonte de verdade de tokens, funil de
conversão e protocolo de revisão:

| Skill | Use para |
|---|---|
| `curriculo-design-system` | Tokens, cores semânticas do Termômetro, tipografia, espaçamento, acessibilidade |
| `curriculo-marketing-funnel` | Gancho → Promessa → Prova → CTA; compliance jurídico da copy |
| `curriculo-hero` | Padrão da home/hero e busca de números reais |
| `curriculo-design-review` | Auditar uma UI antes de considerar pronta |

Estratégia consolidada: `docs/design/estrategia-marketing.md`.
Briefs de subagentes de design: `docs/design/agents/`.

Skills de domínio já existentes em `.claude/skills/`: `curriculo-idip`,
`curriculo-data-pipeline`, `curriculo-infra`, `curriculo-juridico`.

## Regras de produto que não se negociam

1. **Linguagem jurídica estrita** — apenas "Réu em Ação Penal" e "Condenação
   Transitada em Julgado". Nunca "crime" ou juízo moral sobre pessoas.
2. **Neutralidade política e algorítmica** — nenhum viés partidário; votação
   popular nunca altera a nota e a UI não pode sugerir o contrário.
3. **Dados honestos** — nenhum número exibido sem consulta real ao banco. Pesos e
   versão da metodologia derivam de `packages/idip/src/scoring.ts`; nunca os
   redigite na UI (a home já divergiu assim: dizia v1.0 quando o motor roda v1.1).
4. **Acessibilidade AA** é requisito, não melhoria.
5. **LGPD** — nunca exponha CPF, endereço ou dado familiar.

## Verificação obrigatória

```bash
npm run typecheck           # TypeScript estrito
npm run build               # build de produção (aciona o guard de `next dev` antes)
npm run verify:scoring      # matemática do IDIP (roda no CI)
npm run verify:secrets      # varredura de segredos em todo o repositório
npm run verify:secrets:test # autoteste das regras do scanner
npm run verify:formato      # proíbe `.toFixed(` em .tsx (número com ponto decimal)
npm run verify:formularios  # todo controle de formulário com nome acessível
npm run verify:diretivas    # `"use client"` como primeira instrução do módulo
npm run verify:tokens       # paleta de estado em fonte única
npm run audit:visual        # 28 rotas × 2 viewports: axe + overflow + captura
```

Mudança de UI que só passou por `dev` não está verificada: confira a tela
renderizada e o comportamento em 375px / 768px / 1280px.

### Guardas automatizados

Sete proteções existem porque as armadilhas abaixo já custaram tempo e risco
reais. Todas são scripts versionados, não disciplina — e todas foram escritas
depois de um defeito concreto, não antes.

| Guard | Impede | Nasceu de |
|---|---|---|
| `prebuild` (`verificar-dev-ativo`) | build com `next dev` ativo | falhas intermitentes de `.next` |
| `pre-commit` (`verificar-segredos`) | credencial no commit | `.env` já foi destruído neste repo |
| `verify:formato` | `.toFixed(` em `.tsx` | `/partidos` exibindo `62.6` e eixo `R$ 1.50M` |
| `verify:formularios` | controle sem nome acessível | `aria-invalid`/`aria-describedby` em zero |
| `verify:diretivas` | `"use client"` fora da 1ª linha | dois arquivos quebrados por script de import |
| `verify:tokens` | paleta de estado redefinida | cor duplicada fora de `status-visual.ts` |
| `audit:visual` | axe, overflow e regressão em 28 rotas | 6 rotas com defeito que o e2e não cobria |

Dois deles rodam sozinhos (`prebuild`, `pre-commit`); os outros são passo de
verificação. O `pre-commit` é ativado uma vez por clone:

```bash
npm run hooks:install   # git config core.hooksPath .githooks
```

O scanner bloqueia credencial em conteúdo adicionado, arquivo que nunca deve ser
versionado (`.env`, chaves) ou `.gitignore` que tenha perdido a regra `.env*`.
Cobre prefixos conhecidos (Supabase, GitHub, AWS, Google, Vercel…), não entropia
genérica — um scanner que dá falso positivo é desligado.

Pular conscientemente: `git commit --no-verify`. Pular por reflexo anula a
proteção.

## Armadilhas conhecidas

- **`next dev` e `next build` compartilham `apps/web/.next`.** Um servidor de
  desenvolvimento ativo — inclusive um **órfão** deixado por script
  (`Start-Process` + `cmd /c` deixa o filho vivo depois que o pai morre) — grava
  nesse diretório enquanto o build lê, e o resultado são falhas
  **intermitentes** e enganosas: `Invariant: no direct app page entry found for
  /_not-found`, `ENOENT .../route.js.nft.json` ou `Cannot find module
  './chunks/vendor-chunks/next.js'`. Medido neste repositório: builds com um dev
  server órfão ativo falharam de forma reprodutível; 14 builds sem nenhum
  passaram. **`npm run build` agora bloqueia sozinho** (ver `prebuild` acima).
- **Caminhos com acento corrompem saída do PowerShell.** O projeto vive em
  `Currículo Político`, e a saída padrão do PowerShell no Windows usa a codepage
  do console: `Currículo` chega como `Curr?culo`. Qualquer script que leia saída
  do PowerShell e compare caminhos precisa forçar
  `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8` **e** tolerar a perda
  (comparando caractere não-ASCII como curinga). O guard de `next dev` falhava em
  silêncio por isso — existia e nunca bloqueava.
- **`prisma generate` falha com `EPERM` enquanto `next dev` roda.** O passo
  `prisma generate` do build renomeia `query_engine-windows.dll.node` dentro de
  `node_modules/.prisma/client`, e o servidor de desenvolvimento mantém essa DLL
  carregada. O erro é
  `EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmpNNN'`
  e derruba o build inteiro. Encerre o `next dev` antes de buildar — o guard do
  `prebuild` cobre o `.next`, mas não este lock.
- A suíte Playwright (`npm run e2e`) sobe o próprio servidor na **porta 3033** de
  propósito: a 3000 é disputada por outros projetos desta máquina e o `next dev`
  troca de porta sozinho, derrubando a suíte no meio da execução.
- A home usa `force-dynamic`; a faixa de prova deve sumir sem quebrar o layout
  quando o banco está vazio (nunca renderize "0 políticos avaliados").
- `DATABASE_URL` decide tudo — todo script de dados grava no banco que ela
  apontar, inclusive produção.
- Tema é dark fixo (`bg-slate-950` no `layout.tsx`); não assuma variantes light.
- **Nunca declare MCP via `npx -y <pacote>` sem versão.** O `.claude/settings.json`
  tinha `@deusdata/codebase-memory-mcp`, pacote que **não existe** no npm (o scopo
  nunca foi registrado). Um `npx -y` sobre nome não reivindicado executa o que
  quer que seja publicado ali, em toda sessão. Fixe versão ou não declare.
