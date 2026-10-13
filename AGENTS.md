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
npm run typecheck       # TypeScript estrito
npm run build           # build de produção
npm run verify:scoring  # matemática do IDIP (roda no CI)
```

Mudança de UI que só passou por `dev` não está verificada: confira a tela
renderizada e o comportamento em 375px / 768px / 1280px.

## Armadilhas conhecidas

- **`next dev` e `next build` compartilham `apps/web/.next`.** Um servidor de
  desenvolvimento ativo — inclusive um **órfão** deixado por script
  (`Start-Process` + `cmd /c` deixa o filho vivo depois que o pai morre) — grava
  nesse diretório enquanto o build lê, e o resultado são falhas
  **intermitentes** e enganosas: `Invariant: no direct app page entry found for
  /_not-found`, `ENOENT .../route.js.nft.json` ou `Cannot find module
  './chunks/vendor-chunks/next.js'`. Medido neste repositório: builds com um dev
  server órfão ativo falharam de forma reprodutível; 14 builds sem nenhum
  passaram. Antes de buildar, confirme que não há `next dev` ativo:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'Curr' -and $_.CommandLine -match 'next' }`
- A suíte Playwright (`npm run e2e`) sobe o próprio servidor na **porta 3033** de
  propósito: a 3000 é disputada por outros projetos desta máquina e o `next dev`
  troca de porta sozinho, derrubando a suíte no meio da execução.
- A home usa `force-dynamic`; a faixa de prova deve sumir sem quebrar o layout
  quando o banco está vazio (nunca renderize "0 políticos avaliados").
- `DATABASE_URL` decide tudo — todo script de dados grava no banco que ela
  apontar, inclusive produção.
- Tema é dark fixo (`bg-slate-950` no `layout.tsx`); não assuma variantes light.
