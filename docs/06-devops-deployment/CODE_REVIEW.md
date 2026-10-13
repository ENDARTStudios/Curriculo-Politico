# CODE_REVIEW — Revisão de código

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Base:** [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`AGENTS.md`](../../AGENTS.md), [`ci.yml`](../../.github/workflows/ci.yml), histórico de commits

---

## 1. Estado atual: não há processo formal de code review

Verificação honesta do que existe no repositório:

| Elemento de um processo de review | Existe? | Evidência |
|---|---|---|
| `CODEOWNERS` | ❌ **não existe** | nenhum arquivo `.github/CODEOWNERS` |
| Template de pull request | ❌ **não existe** | `.github/` contém apenas `workflows/` |
| Template de issue | ❌ **não existe** | idem |
| Branch protection / revisão obrigatória | ⚠️ **não verificado** — é configuração do GitHub, não do repositório | — |
| Gate automatizado em PR | ✅ **existe** | [`ci.yml`](../../.github/workflows/ci.yml) roda em `pull_request` |
| Convenção de commit | ✅ documentada e seguida | `CONTRIBUTING.md` §5; histórico real: `feat(home): …`, `feat(seo): …`, `fix: …` |
| Checklist de pré-PR | ✅ documentado | `CONTRIBUTING.md` §2 |
| Regras de projeto que não se negociam | ✅ documentadas | `AGENTS.md` (5 regras) |
| Segundo revisor humano | ❌ **não há** — o projeto é operado por uma pessoa | — |
| Registro de decisão de arquitetura (ADR) | ⚠️ **parcial**: decisões registradas em prosa dentro dos documentos de auditoria, não como ADR | `AVALIACAO_ALTERNATIVAS.md`, `AUDITORIA_PRODUCAO.md` |

**Conclusão:** o "code review" deste projeto é hoje **auto-revisão assistida por
CI** + **documentação obrigatória de verificação**. Isso é coerente com um
projeto de um mantenedor, mas tem uma consequência que precisa ser declarada:
**nenhuma mudança passa por um segundo par de olhos**, e nenhum gate automatizado
verifica as regras de produto que estão em `AGENTS.md`.

---

## 2. O gate que existe: `ci.yml`

Todo `pull_request` executa ([`ci.yml`](../../.github/workflows/ci.yml)):

| Passo | Comando | Bloqueia merge se falhar? |
|---|---|---|
| Instalação | `npm ci` | ✅ |
| Schema Prisma | `npx prisma generate --schema=apps/web/prisma/schema.prisma` | ✅ |
| Tipos | `npm run typecheck` (`tsc --noEmit`) | ✅ |
| Motor IDIP | `npm run verify:scoring` | ✅ |
| Motor de identidade | `npm run verify:identity` | ✅ |
| Build | `npm run build` (com `DATABASE_URL` falsa) | ✅ |

**O que este gate realmente protege:** que o código compila, que os tipos fecham
e que a **matemática do IDIP está correta**. A escolha de rodar `verify:scoring`
no CI é significativa — o cálculo do índice é o produto, e um erro de peso muda
a nota de 594 pessoas.

**O que ele não protege** (ver [`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) §6 para
a lista completa): nenhuma query roda, nenhuma migration é aplicada, nenhum teste
de browser roda em PR, não há lint, não há `npm audit`.

⚠️ **A suíte de acessibilidade e consistência NÃO roda em PR.**
[`a11y.yml`](../../.github/workflows/a11y.yml) é `schedule`/`workflow_dispatch`
apenas. Um PR que quebra a acessibilidade ou que faz a home divergir do motor
**passa no gate** e só é detectado **até 6 horas depois**, em produção. Como
esses dois testes existem justamente para proteger duas das cinco regras
inegociáveis de `AGENTS.md`, este é o furo mais relevante do processo.

---

## 3. Os 5 critérios de revisão deste projeto

Derivados das regras de `AGENTS.md` e de `CONTRIBUTING.md`. Cada um tem
**verificação sugerida** — porque "revisar com atenção" não é verificável.

### 3.1 Linguagem jurídica estrita — regra nº 1

| ✅ Aprovar | ❌ Bloquear |
|---|---|
| "Réu em Ação Penal", "Condenação Transitada em Julgado", "contas rejeitadas", "consta na lista oficial X em DD/MM/AAAA" | "crime" (sem trânsito em julgado), "criminoso", "corrupto", "bandido", "inelegível" (só a Justiça Eleitoral declara) |

**Verificação:** buscar a mudança por termos proibidos. O vocabulário controlado
já está no schema (`LegalStatus`: `INVESTIGATION`, `LAWSUIT`, `CRIMINAL_ACTION`,
`CONDEMNATION`, `IMPEACHMENT`, `CLEARED`, `ACCOUNTS_REJECTED`). Detalhamento em
[`../05-security-compliance/COMPLIANCE.md`](../05-security-compliance/COMPLIANCE.md) §7.

### 3.2 Neutralidade algorítmica — regra nº 2

**Bloquear** qualquer mudança que:
- faça `UserBillVote` (camada de engajamento) influenciar `Score`/`calculateIDIP`;
- apresente na UI algo que sugira que a votação popular altera a nota;
- introduza julgamento ideológico no índice.

**Verificação:** `packages/idip/src/scoring.ts` não pode importar nada de engajamento;
buscar por referências cruzadas no diff.

### 3.3 Dados honestos — regra nº 3

**Bloquear** qualquer número exibido sem consulta real ao banco, e **qualquer
redigitação de peso/versão na UI**. O caso concreto já ocorreu: a home dizia
"IDIP v1.0" enquanto o motor rodava v1.1.

**Verificação:** `tests/e2e/home.spec.ts` já cobre a versão do motor e a soma dos
pesos — **mas não roda em PR** (§2). Revisão manual obrigatória até que rode.

### 3.4 Acessibilidade AA — regra nº 4

**Bloquear** contraste abaixo de 4.5:1 (texto normal), ausência de rótulo
acessível, `h1` duplicado, perda de navegação por teclado.

**Verificação:** `npm run e2e` local (porta 3033, Chrome do sistema) e/ou
`npm run design:axe`. O spec declara o limite honesto: axe pega ~1/3 dos
problemas e não vê conteúdo oculto (modais, menus fechados) — **revisão humana de
UI continua obrigatória** para mudança visual.

### 3.5 LGPD — regra nº 5

**Bloquear** qualquer alteração que:
- exponha ou persista **CPF, endereço, telefone ou dado familiar**;
- exiba registro jurídico sem trânsito em julgado (`ARQUIVADO`/`CLEARED`);
- adicione coleta de dado novo sem atualizar `RIPD.md` e a Política de Privacidade;
- altere o texto de consentimento sem **incrementar a versão** em
  [`apps/web/src/lib/consent.ts`](../../apps/web/src/lib/consent.ts).

**Verificação:** grep por `cpf`, `address`, `phone` no diff; conferir
`git diff apps/web/src/lib/consent.ts`.

---

## 4. Checklist de pré-PR (de `CONTRIBUTING.md` §2, ampliado)

O `CONTRIBUTING.md` prescreve:

```bash
npx tsc --noEmit              # zero erros
npm run verify:scoring        # motor IDIP
npm run verify:identity       # motor de identidade
npm run build                 # build limpo
```

**Ampliação recomendada** (o que este documento sugere adicionar ao checklist):

```bash
npm run e2e                   # Playwright: a11y AA + consistência + SEO (porta 3033)
npm run design:axe            # auditoria axe rápida
npm audit --omit=dev          # dependências de produção
```

E, quando o diff tocar dados/rotas:

```bash
# verificação manual contra banco LOCAL (nunca produção)
docker compose up -d db
npm run db:migrate
npm run db:seed
```

> ⚠️ **Armadilha medida, registrada em `AGENTS.md`:** `next dev` e `next build`
> **compartilham `apps/web/.next`**. Um dev server ativo — inclusive **órfao**
> deixado por `Start-Process` + `cmd /c` — grava nesse diretório enquanto o build
> lê, produzindo falhas **intermitentes e enganosas** (`Invariant: no direct app
> page entry found for /_not-found`, `ENOENT …/route.js.nft.json`,
> `Cannot find module './chunks/vendor-chunks/next.js'`). Medido no repositório:
> builds com dev server órfão falharam de forma reprodutível; **14 builds sem
> nenhum passaram**. Antes de buildar:
>
> ```powershell
> Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
>   Where-Object { $_.CommandLine -match 'Curr' -and $_.CommandLine -match 'next' }
> ```
>
> Um revisor que ignore isso pode aprovar um "flake" que é, na verdade, ambiente.

---

## 5. Template de pull request proposto

`.github/pull_request_template.md` — não existe hoje; este é o conteúdo sugerido:

```markdown
## O que muda

## Por quê

## Verificação (marcar o que foi executado)
- [ ] `npm run typecheck`
- [ ] `npm run verify:scoring` / `verify:identity`
- [ ] `npm run build` (sem `next dev` ativo — ver AGENTS.md)
- [ ] `npm run e2e`
- [ ] UI conferida em 375px / 768px / 1280px
- [ ] `npm audit --omit=dev`

## Regras que não se negociam (AGENTS.md)
- [ ] Linguagem jurídica estrita (sem "crime" sem trânsito em julgado)
- [ ] Votação popular não altera a nota IDIP
- [ ] Nenhum número exibido sem consulta real ao banco
- [ ] Acessibilidade AA preservada
- [ ] Nenhum CPF, endereço ou dado familiar
- [ ] Se mudou texto de consentimento: versão incrementada em `lib/consent.ts`
- [ ] Se mudou peso/fórmula: `Score.version` incrementada + `/metodologia` atualizada

## Impacto em compliance
- [ ] Nenhum (ou) descrever: atualiza RIPD? Política? Termos?
```

---

## 6. Regras de revisão específicas por área

| Área | Regra adicional |
|---|---|
| `apps/web/src/lib/consent.ts` | Mudança de versão **exige** revisão jurídica e atualização do RIPD. Nunca alterar o texto sem incrementar a versão ([`SECURITY_REVIEW.md`](../05-security-compliance/SECURITY_REVIEW.md) M-05) |
| `packages/idip/src/scoring.ts` | Exige bump de versão + atualização de `/metodologia` + `verify-scoring.ts` (`CONTRIBUTING.md` §3) |
| `apps/web/prisma/schema.prisma` | Exige migration correspondente. **Atenção:** `migrations/` usa nomes com timestamp e há uma migration `20260930_lgpd_consent_retificacao` com formato de nome diferente — verificar consistência |
| `apps/web/src/middleware.ts` | Qualquer mudança de CSP, rate limit ou matcher afeta **todas** as rotas. Exige teste em produção após deploy |
| `apps/web/src/lib/auth.ts` | Caminho de autenticação. Mudança aqui invalida sessões e afeta o cookie. Revisão com atenção máxima |
| `apps/pipeline/scripts/*` | Script que **escreve**: exige confirmação de que não roda contra produção ([`SECURITY_REVIEW.md`](../05-security-compliance/SECURITY_REVIEW.md) A-01) |
| `.github/workflows/*` | Mudança em `monthly-snapshot.yml` toca `secrets.DATABASE_URL` — **escrita em produção**. Revisar como código privilegiado |
| `apps/web/.env.example` | Nunca conter valor real; é documentação |

---

## 7. Convenção de commits (em uso, verificada no histórico)

Formato: `<tipo>(<escopo>): <descrição no imperativo, em português>`

Exemplos reais do histórico:

```
feat(home): card do Judiciário, metadata própria e marca clicável
feat(seo): metadata em todas as rotas e canonical por página
feat(seo): sitemap index paginado, robots.txt, ícone e metadataBase
```

Escopos observados: `home`, `seo`, e (por analogia) módulos da aplicação.
Tipos: `feat`, `fix` (documentados em `CONTRIBUTING.md` §5); `chore`, `docs`,
`refactor`, `test` não estão documentados — **não verificado** se são usados.

---

## 8. Recomendações

| # | Ação | Fecha | Esforço |
|---|---|---|---|
| 1 | **Rodar `a11y.yml` também em `pull_request`** | O furo mais grave: acessibilidade e consistência de dados sem gate | horas |
| 2 | Criar `.github/pull_request_template.md` com o checklist da §5 | Checklist verificável em vez de memória | minutos |
| 3 | Criar `.github/CODEOWNERS` (`* @ENDARTStudios`) | Direcionamento automático de review | minutos |
| 4 | Ativar *branch protection* em `main`: exigir CI verde e PR antes de merge | Impede push direto em `main` (hoje o CI roda em push, mas não bloqueia) | minutos |
| 5 | Habilitar *required status checks* para o job `verify` | Torna o gate efetivo | minutos |
| 6 | Adicionar lane de *secret scanning* / push protection | Lacuna do pipeline | minutos |
| 7 | **Nunca** usar `db:load-*`/`recalculate-scores` apontando para produção durante review | Ameaça T3 | disciplina |

---

## 9. Referências no repositório

- [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) — regras do projeto e checklist de PR
- [`../../AGENTS.md`](../../AGENTS.md) — as 5 regras inegociáveis e armadilhas conhecidas
- [`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) — o que o CI valida e o que não valida
- [`QA_TESTING.md`](./QA_TESTING.md) — a suíte existente e as lacunas
- [`../05-security-compliance/COMPLIANCE.md`](../05-security-compliance/COMPLIANCE.md) §7 — linguagem jurídica estrita
- [`../05-security-compliance/SECURITY_REVIEW.md`](../05-security-compliance/SECURITY_REVIEW.md) — achados que mudanças futuras não devem reintroduzir
