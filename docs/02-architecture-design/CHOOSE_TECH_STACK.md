# CHOOSE_TECH_STACK — escolha e versões da stack

Cada item aqui está **em uso no repositório**, com a versão **resolvida no
`package-lock.json`** (não a faixa declarada no `package.json`) e o motivo pelo
qual está no projeto. Dependência sem motivo registrado é candidata a remoção.

A decisão arquitetural por trás de cada bloco está referenciada em
[ADR.md](ADR.md).

## 1. Plataforma de execução

| Item | Versão | Onde | Por quê |
|---|---|---|---|
| **Node.js** | **24.x** | `engines` na raiz e em `apps/web`; `setup-node@v4` nos workflows | Alinhado entre Vercel, CI e desenvolvimento. Estava 22 no CI e 24 na Vercel, gerando aviso de upgrade automático (`AUDITORIA_PRODUCAO.md` §0.6) |
| **npm** | workspaces nativos | `package.json` raiz: `workspaces: ["apps/*", "packages/*"]` | Monorepo sem ferramenta extra (sem pnpm/turbo/nx). Ver [ADR-006](ADR.md#adr-006) |
| **Python** | **3.12+** | `apps/pipeline/etl/*.py` | Apenas para ETL. O `README.md` cita Python 3.12+; **a versão exata não está fixada em nenhum arquivo** (não há `runtime.txt`, `.python-version` nem `pyproject.toml`) — não verificado |
| **Docker / Compose** | — | `docker-compose.yml` | Postgres 16-alpine (host 15432) e Redis 7-alpine (host 16379) para desenvolvimento local |

## 2. Aplicação web (`apps/web`)

### 2.1 Núcleo

| Pacote | Declarado | **Resolvido** | Por quê |
|---|---|---|---|
| `next` | `^15.5.27` | **15.5.27** | App Router, Server Components, Route Handlers, `metadata`/`generateMetadata`, `next/image`. Ver [ADR-003](ADR.md#adr-003) |
| `react` / `react-dom` | `^19.1.0` | **19.3.0** | Exigido pelo Next 15; Server Components por padrão |
| `typescript` | `^5.7.0` | **5.9.3** | TypeScript **estrito**; `tsc --noEmit` zerado é gate de CI |
| `tailwindcss` | `^4.1.0` | **4.3.3** | CSS-first com `@theme`; **sem `tailwind.config.js`**. Ver [ADR-004](ADR.md#adr-004) |
| `@tailwindcss/postcss` | `^4.1.0` | 4.x | Plugin PostCSS do Tailwind v4 |
| `postcss` | `^8.5.0` | 8.x | Pipeline de CSS |

### 2.2 Dados

| Pacote | Declarado | **Resolvido** | Por quê |
|---|---|---|---|
| `prisma` (CLI) | `^6.16.0` | **6.19.3** | Migrations, `generate`, `migrate dev`. `npm run build` executa `prisma generate && next build` |
| `@prisma/client` | `^6.16.0` | **6.19.3** | Acesso tipado ao Postgres |

Notas que importam na prática:

- O schema é **único** e fica em `apps/web/prisma/schema.prisma`, referenciado por
  caminho explícito em todos os scripts (`--schema=apps/web/prisma/schema.prisma`).
- O `datasource` usa **duas** URLs: `DATABASE_URL` (runtime, pooler 6543) e
  `DIRECT_URL` (migrate/ETL, 5432). Ver [ADR-002](ADR.md#adr-002).
- O Prisma Client é gerado no CI **antes** do typecheck, porque o `config` do
  Playwright e vários módulos importam tipos do schema.

### 2.3 Autenticação e sessão

| Pacote | Declarado | **Resolvido** | Por quê |
|---|---|---|---|
| `next-auth` | `^4.24.15` | **4.24.15** | Credentials + Google OAuth; sessão JWT; o id do usuário no JWT é a chave do rate limit no Edge |
| `@auth/prisma-adapter` | `^2.11.3` | 2.x | Persistência de `Account`/`Session`/`VerificationToken` |
| `bcryptjs` | `^3.0.3` | **3.0.3** | Hash de senha em runtime JS (sem dependência nativa). **Não** foi escolhido `bcrypt` nativo por causa do ambiente serverless |
| `@types/bcryptjs` | `^2.4.6` | 2.x | Tipos |

**Consequência conhecida:** não há serviço de e-mail transacional. Verificação de
e-mail e recuperação de senha **não existem** — pendência 4 de
`docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md` e item D2 do
[ROADMAP](../01-product-discovery/ROADMAP.md).

### 2.4 Observabilidade

| Pacote | Declarado | **Resolvido** | Por quê |
|---|---|---|---|
| `@sentry/nextjs` | `^11.1.0` | **11.1.0** | Erros de runtime e de cliente. **No-op sem DSN** — `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` |

### 2.5 Testes

| Pacote | Declarado | **Resolvido** | Por quê |
|---|---|---|---|
| `@playwright/test` | `^1.64.0` | **1.64.0** | Suíte e2e; usa `channel: "chrome"` para não baixar browser. Ver [ADR-014](ADR.md#adr-014) |
| `@axe-core/playwright` | `^4.13.0` | 4.x | Auditoria de acessibilidade com a tag **`wcag22aa`** (WCAG 2.2, não 2.1) |
| `tsx` | `^4.19.0` (raiz e `apps/web`) | 4.x | Executa TypeScript direto, sem build. É o que permite `packages/idip` publicar só fonte. `apps/pipeline` **não declara** `tsx` — ele o resolve do hoisting do workspace |

## 3. Pacotes do monorepo

| Pacote | Nome npm | Versão | Publica | Depende de |
|---|---|---|---|---|
| `apps/web` | `@cp/web` | 0.1.0 | `private: true` | — |
| `apps/pipeline` | `@cp/pipeline` | 0.1.0 | `private: true` | `@cp/idip: "*"` |
| `packages/idip` | `@cp/idip` | **1.1.0** | `private: true`; `main`/`types`/`exports` → `./index.ts` | nenhuma dependência de runtime |

`@cp/idip` sem dependências é uma **propriedade de projeto**, não coincidência: é
o que permite `verify:scoring` e `verify:identity` rodarem no CI sem banco e sem
rede. Ver [ADR-005](ADR.md#adr-005).

Relação de importação real:

```
apps/pipeline  ──importa──►  packages/idip        (via tsx, TS fonte)
apps/pipeline  ──importa──►  apps/web/src/lib/methodology.ts  (caminho relativo, só p/ WEB-001)
apps/pipeline  ──importa──►  @prisma/client       (cargas)
apps/web       ──NÃO importa──►  packages/idip    ← consequência do ADR-005
```

**Por que a raiz não tem dependências de aplicação:** as únicas `devDependencies`
da raiz são `prisma`, `tsx` e `typescript` — ferramentas usadas pelos scripts
delegados. Toda biblioteca de aplicação vive no workspace que a usa, com uma
exceção que vale saber: `apps/pipeline` invoca `tsx` em todos os seus scripts mas
**não o declara** em `dependencies`; ele é resolvido do `node_modules` hoisted.
Isso é uma fragilidade latente — se `apps/web` deixar de depender de `tsx`, o
pipeline quebra sem aviso no manifesto.

## 4. Serviços externos

| Serviço | Papel | Configuração no repositório | Observação |
|---|---|---|---|
| **Vercel** | Hosting + Edge Functions | `apps/web/vercel.json` (`regions: ["gru1"]`), Root Directory = `apps/web` | Deploy por push em `main` |
| **Supabase** | Postgres gerenciado | `DATABASE_URL` (6543 transaction) + `DIRECT_URL` (5432) | Projeto em `sa-east-1`; compute com teto de 60 conexões diretas |
| **GitHub Actions** | CI, snapshot mensal, smoke 6h, a11y 6h | `.github/workflows/` | 4 workflows |
| **Cloudflare** | WAF/CDN | — | Citado em `middleware.ts` e na lista de custos de `/apoie`; **não há arquivo de configuração no repositório** — não verificado no código |
| **UptimeRobot** | Uptime externo | `apps/pipeline/scripts/uptimerobot-monitor.ts`, `UPTIMEROBOT_API_KEY` | Opcional |
| **Google OAuth** | Login social | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_ENABLED` | Botão só aparece com as credenciais |
| **GitHub Sponsors / Pix** | Doação | `NEXT_PUBLIC_GITHUB_SPONSORS_URL`, `NEXT_PUBLIC_PIX_KEY` | Ver [PRICING_MONETIZATION.md](../01-product-discovery/PRICING_MONETIZATION.md) |

## 5. Fontes de dados (não são dependências de software)

| Fonte | Formato | Papel no produto | ETL |
|---|---|---|---|
| Câmara dos Deputados (dados abertos v2) | JSON | Cadastro, proposições, votações, presenças, CEAP | `camara_*.py` |
| Senado Federal (dados abertos) | JSON | Cadastro de senadores (**sem CPF**) | `senado_federal.py` |
| TSE — candidaturas | CSV Latin-1 com CPF | Identidade, patrimônio | `tse_candidatos.py`, `tse_bens.py` |
| TSE — prestação de contas | CSV/ZIP (grande) | `CampaignFinance` | `tse_receitas.py` |
| TCU — certidões | CSV `sep=\|`, Latin-1 | Integridade (contas rejeitadas) | **local-first**, sem automação |
| STF | — | IDIP-STF | **não existe** — portal bloqueia automação; caminho é LAI |
| Querido Diário (OKBR) | JSON | `MunicipalExpense` (fora do IDIP v1) | `municipal_gazettes.py` |
| Aos Fatos / Lupa / Comprova (RSS) | XML/HTML | `VerifiedClaim` (contexto, nunca altera nota) | `fact_checking_rss.py` |

## 6. O que foi **deliberadamente não adotado**

| Alternativa | Por que ficou fora |
|---|---|
| **pnpm / yarn / turbo / nx** | npm workspaces resolve; adicionar outra ferramenta de monorepo aumentaria a barreira de contribuição sem necessidade demonstrada |
| **`tailwind.config.js`** | Tailwind v4 é CSS-first; tokens significativos cabem em `@theme`. Menos arquivos, um lugar só para token |
| **Biblioteca de componentes (shadcn/Radix UI completa)** | A UI é pequena e o visual é específico (estados semânticos do Termômetro). O projeto já tem política explícita de não adicionar bibliotecas de animação sem necessidade comprovada (`.dsh/skills/curriculo-design-system` §8) |
| **ORM alternativo (Drizzle/TypeORM)** | Prisma já estava em uso e o schema é a documentação viva dos models |
| **`prisma migrate` em transaction mode** | Não funciona — daí a decisão de `DIRECT_URL`. Ver [ADR-002](ADR.md#adr-002) |
| **`generateSitemaps` do Next** | Falhou de duas formas verificadas. Ver [ADR-009](ADR.md#adr-009) |
| **`bcrypt` nativo** | Dependência de compilação nativa no ambiente serverless |
| **Analytics de terceiros (GA, Plausible)** | Não há nenhum no repositório. A CSP (`script-src 'self'`) e a ausência de consentimento de rastreamento explicam a escolha — **não há decisão formal registrada**; tratar como estado atual, não como ADR |
| **Redis em produção** | Existe no `docker-compose.yml` (16379) e `REDIS_URL` comentado no `.env.example`, mas **nenhum código consome**. Planejado em [ROADMAP C1](../01-product-discovery/ROADMAP.md) |
| **API pública versionada** | Não existe. Ver [ROADMAP E1](../01-product-discovery/ROADMAP.md) |

## 7. Critérios para adicionar uma dependência nova

Decorrentes das decisões existentes:

1. **Licença compatível com AGPL-3.0-only.** Verificar antes de instalar
   ([ADR-001](ADR.md#adr-001)).
2. **Resolve um problema real e demonstrado**, não hipotético — o padrão do
   projeto é não adicionar biblioteca de animação/UI sem necessidade comprovada.
3. **Não pode exigir banco nem rede** para os verificadores puros
   (`verify:scoring`, `verify:identity`), que precisam rodar no CI sem
   infraestrutura ([ADR-005](ADR.md#adr-005)).
4. **Não pode aumentar o bundle do cliente sem justificativa de interatividade**
   — a maioria das páginas é Server Component.
5. **Se a dependência é de dados**, ela precisa de URL de fonte e `retrievedAt`
   no registro (`CONTRIBUTING.md`: "Fontes oficiais apenas").
6. **Toda dependência nova que execute script de pós-instalação** precisa de
   revisão — o `plugin_manager` do harness, por exemplo, exige aprovação explícita
   para builds.

## 8. Versões que merecem atenção ao atualizar

| Item | Cuidado |
|---|---|
| `next` (major) | O `.next` é compartilhado entre `dev` e `build`; mudanças de major podem alterar precedência de rota (foi o que quebrou o sitemap) |
| `tailwindcss` (major) | Se exigir `tailwind.config.js`, o [ADR-004](ADR.md#adr-004) tem de ser revisitado |
| `prisma` (major) | `directUrl` e comportamento de pooler são sensíveis; testar migração contra a 6543 **antes** de produção |
| `@playwright/test` (minor) | A suíte fixa a tag `wcag22aa`; mudanças no axe podem alterar o resultado do gate |
| `@cp/idip` (qualquer) | Bump de versão do pacote **obriga** atualizar `METODOLOGIA_VERSAO` em `apps/web/src/lib/methodology.ts` e o teste WEB-001 |

## 9. Referências

- `package.json` (raiz, `apps/web`, `apps/pipeline`, `packages/idip`)
- `package-lock.json` — fonte das versões resolvidas
- [ARCHITECTURE.md](ARCHITECTURE.md) · [ADR.md](ADR.md) · [GREEN_COMPUTING.md](GREEN_COMPUTING.md)
- `apps/web/README.md` · `apps/pipeline/README.md`
- `docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` — comparação de opções de
  infraestrutura e pool de conexões.
