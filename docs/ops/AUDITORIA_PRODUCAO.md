# Auditoria Técnica de Produção — curriculopolitico.org

**Data:** 2026-09-29 | **Método:** curl/CLI + Supabase Management API + Data API

---

## 0. Atualização 2026-10-12 — correções aplicadas

> Esta seção atualiza os achados abaixo. Onde houver divergência, **esta seção
> prevalece**; os números das §3 e §8 são históricos (fotografia de 2026-09-29).

### 0.1 Dados — cargas concluídas ✅

Os loads interrompidos relatados em §3 foram concluídos. Contagem direta no
banco em 2026-10-12:

| Tabela | 2026-09-29 | 2026-10-12 |
|---|---|---|
| Person | 594 | **594** |
| Score | 594 | **594** |
| Bill | 24.643 (77%) | **31.815 (100%)** |
| BillAuthorship | 38.677 (77%) | **50.479 (100%)** |
| LegislativeAction | 6.457 | **6.457** |
| SessionAttendance | 95.511 (57%) | **166.825 (100%)** |
| PatrimonyHistory | 539 | **539** |
| CampaignFinance | 500 | **500** |
| PoliticianCost | — | **2.452** (1.966 de CEAP com valor > 0) |
| VerifiedClaim | — | **13** |
| LegalRecord | — | **0** ⚠️ (ver §0.6) |

### 0.2 Deploy automático da Vercel — estava quebrado 🔴 → corrigido

**Sintoma.** O deployment por Git de `main` falhava *depois* de um build Next.js
íntegro:

```
Error: The file "/vercel/path0/.next/routes-manifest.json" couldn't be found.
```

**Causa.** O refactor do monorepo (`f3c7630`, 03/10) moveu a aplicação para
`apps/web`, mas o projeto Vercel permaneceu com **Root Directory = `.`**. O build
rodava a partir da raiz, o Next.js escrevia em `apps/web/.next` e a Vercel
procurava `.next` na raiz do repositório.

**Impacto.** Último deploy por Git bem-sucedido: `7sov9itnh` (01/10, `0a79609`),
ainda com a aplicação na raiz. Depois do refactor, produção só recebeu deploy
manual (`npx vercel --prod` executado de `apps/web`: `a6t5cvlm7` e `pa4ah9vn4`,
03/10). O commit `256c96d` teve o deployment Git em `Error` (`5qtrqo0b2`) e
qualquer push novo em `main` falharia.

**Correção (12/10).** `PATCH /v9/projects/<projeto> { "rootDirectory": "apps/web" }`
— o projeto agora aponta para o diretório real da aplicação, alinhado ao
`apps/web/.vercelignore` e ao `package.json` autocontido.

> ⚠️ **Verificação pendente de plataforma.** Em 2026-10-12 a Vercel estava em
> **incidente parcial de build/deploy** ("Increased build and deployment
> failures", investigado às 13:35 UTC, em monitoramento a partir das 19:56 UTC).
> Na janela do incidente, **todo** deployment novo — por Git e por CLI, em
> qualquer configuração — retornava `Resource provisioning failed`, inclusive
> reexecuções do commit corrigido. A correção de Root Directory está aplicada,
> mas a reexecução do pipeline por push precisa ser confirmada após o
> incidente encerrar. Produção permaneceu no último deployment íntegro
> (`pa4ah9vn4`), sem interrupção de serviço.

### 0.3 Snapshot mensal — datação corrigida

`snapshot-scores.ts` datava o snapshot com o **último dia do mês corrente às
23:59:59 no fuso do executor**. Isso produzia três defeitos:

1. data ~1 mês no futuro — `/status` exibia "novembro de 2026" em 12/10;
2. **duplicata do mesmo mês** — o GitHub Actions roda em UTC
   (`2026-10-31T23:59:59Z`) e a execução local em BRT gravava outro instante
   (`2026-11-01T02:59:59Z`) para o mesmo mês de referência;
3. reexecução não idempotente no mesmo dia.

**Correção.** Novo módulo `apps/pipeline/scripts/snapshot-date.ts` define a data
canônica como **primeiro dia do mês corrente à meia-noite UTC**, consumido por
`snapshot-scores.ts` e `verify-snapshot.ts`. Os dados existentes foram
normalizados:

| Antes | Depois |
|---|---|
| `2026-10-01T02:59:59Z` (509) | `2026-09-01T00:00:00Z` (509) — setembro/2026 |
| `2026-10-31T23:59:59Z` (509) | `2026-10-01T00:00:00Z` (509) — outubro/2026 |
| `2026-11-01T02:59:59Z` (509) | removida — duplicata de outubro/2026 |

Reexecução verificada: `npm run db:snapshot` → 0 criados (idempotente);
`verify-snapshot.ts` → 509 snapshots para `2026-10-01`. Sem datas futuras.

**Exibição também corrigida.** A data canônica é meia-noite UTC; formatar com o
fuso local empurra `2026-10-01T00:00:00Z` para 30/09 em qualquer fuso a oeste de
Greenwich — `/status` exibia "setembro de 2026" para o snapshot de outubro
quando renderizado em BRT. O novo `apps/web/src/lib/snapshot.ts` fixa
`timeZone: "UTC"` em toda formatação de snapshot (`/status`, `TimelineChart` de
`/politicos/[id]`, `PartyPerformanceChart` de `/partidos/[acronym]`), e
`/metodologia` documenta a regra de datação.

### 0.4 `/ranking` — paginação

1,5 MB / ~3,1 s → **100 linhas por página** (`?pagina=N`) e aba própria para os
85 parlamentares com confiança < 60 (`?grupo=insuficientes`), antes renderizados
na mesma tabela de 594 linhas. A ordem e a semântica (último mandato, último
score, corte de confiança em 60) não mudaram.

### 0.5 Higiene de dados fictícios

`seed-*` (dados de desenvolvimento do `npm run db:seed`) passa a ser filtrado
também em `/ranking`, `/api/rankings` e `/status` — com
`OR externalId IS NULL`, porque `externalId` é nullable e o filtro ingênuo
descartaria registros legítimos sem ID externo. Adicionalmente, `db:seed` agora
**recusa** execução contra banco remoto, salvo `CP_ALLOW_REMOTE_SEED=1`, já que
o `apps/web/.env` local aponta para o Supabase de produção.

### 0.6 Versão de Node alinhada

Vercel rodava Node 24.x enquanto CI e `engines` declaravam 22. Alinhado em
**Node 24** (`engines` na raiz e em `apps/web`, `ci.yml`,
`monthly-snapshot.yml`, README), eliminando o aviso de upgrade automático da
Vercel.

### 0.7 Pendências externas — não resolvíveis por código

1. **`LegalRecord = 0`** — TCU (`api-publica` exige credencial, retorna 401) e
   STF (sem API consolidada, 403). A dimensão **Integridade (25%, maior peso)**
   permanece em baseline neutro 50, identificado na interface, e as **travas de
   integridade nunca disparam** com dado real. O ETL opera em modo *local-first*:
   basta depositar `data/raw/tcu_contas_rejeitadas_raw.json` e
   `data/raw/stf_acoes_penais_raw.json` e rodar `npm run etl:legal` seguido de
   `npm run db:load-legal`. O TCU publica listas periódicas de "Responsáveis com
   contas julgadas irregulares" (exportação manual em PDF).
2. ~~**Encarregado (DPO)** — nome e caixa postal não publicados (P1-02).~~
   ✅ **Resolvido em 2026-10-12**: encarregado publicado como **Equipe END ART
   Studios** com canais operacionais — `endart.studios+privacidade@gmail.com`
   (DPO), `+direitos` (Art. 18), `+security` (incidentes), `+contato`
   (institucional/imprensa), `+suporte` e `+reembolso`. Endereços
   `@curriculopolitico.org` substituídos por não terem caixa postal ativa.
   Ver `docs/security/RIPD.md` §5 e §6.1.
3. **SCCs** de Vercel/Sentry não assinados (P1-03).
4. **Revisão jurídica humana** de Termos, Política de Privacidade e RIPD antes de
   campanha.

---

## 1. Rotas — 20/20 HTTP 200 ✅

| Rota | Status | Tempo | Tamanho |
|---|---|---|---|
| / | 200 | 0.20s | 27KB |
| /ranking | 200 | **3.12s** | **1.5MB** |
| /projetos | 200 | 2.31s | 65KB |
| /comparar | 200 | 1.91s | — |
| /status | 200 | 2.52s | 20KB |
| /historia | 200 | 0.52s | — |
| /partidos | 200 | 2.05s | — |
| /metodologia | 200 | 0.54s | — |
| /sobre | 200 | 0.47s | — |
| /termos-de-uso | 200 | 0.48s | — |
| /privacidade | 200 | 0.46s | — |
| /lgpd | 200 | 0.46s | — |
| /cookies | 200 | 0.44s | — |
| /retificacao | 200 | 0.42s | — |
| /contato | 200 | 0.47s | — |
| /auth/signin | 200 | 0.52s | — |
| /stf | 200 | 0.53s | — |
| /como-funciona | 200 | 0.44s | — |
| /calendario-eleitoral | 200 | 0.42s | — |
| /faq | 200 | 0.40s | — |

**⚠️ Performance:** `/ranking` demora 3.1s e retorna 1.5MB (598 parlamentares em
uma única tabela HTML). Aceitável para MVP, mas otimizar com paginação ou lazy
loading quando houver tráfego real.

---

## 2. APIs — Todas 200 ✅

| Rota | Status | Tempo |
|---|---|---|
| /api/search?q=lula | 200 | 2.79s |
| /api/rankings?limit=3 | 200 | 1.47s |
| /api/bills?limit=2 | 200 | 1.26s |
| /api/bills/2643776/vote | 200 | 0.06s |
| /api/compare?ids= | 200 | 0.05s |

**Busca "lula" encontra:** 1 político (Lula da Fonte) + 2 históricos (Lula
2003-2010 e Lula 3º mandato). Correto.

**Rankings:** Top 5 com dados reais — Benes Leocádio (64.0, 90% conf),
Ana Paula Leão (64.0), Delegada Katarina (64.0, 75%). Correto.

---

## 3. Dados no Supabase — Integridade

| Tabela | Registros | Esperado | Status |
|---|---|---|---|
| Person | 594 | 594 | ✅ |
| Person com tseId | 556 | 556 | ✅ |
| Score | 594 | 594 | ✅ |
| Bill | 24.643 | 31.815 | ⚠️ 77% (load interrompido) |
| BillAuthorship | 38.677 | 50.479 | ⚠️ 77% |
| LegislativeAction | 6.457 | 6.465 | ✅ 99.9% |
| SessionAttendance | 95.511 | 166.825 | ⚠️ 57% (load interrompido) |
| PatrimonyHistory | 539 | 539 | ✅ |
| CampaignFinance | 500 | 500 | ✅ |
| ScoreSnapshot | 370 | 370 | ✅ |

**Causa:** Os loads de proposições e presenças foram interrompidos por
instabilidade do pooler Supabase (P1001: Can't reach database server).
Todos os loads são idempotentes — reexecutar `npm run seed:production`
preenche os registros faltantes.

---

## 4. Segurança — Headers ✅ RESOLVIDO (re-verificado 2026-09-29)

| Header | Status |
|---|---|
| Strict-Transport-Security | ✅ Ativo (Vercel default) |
| Content-Security-Policy | ✅ Ativo (middleware) |
| X-Frame-Options: DENY | ✅ Ativo |
| X-Content-Type-Options: nosniff | ✅ Ativo |
| Referrer-Policy: strict-origin-when-cross-origin | ✅ Ativo |
| Permissions-Policy | ✅ Ativo |

**Correção:** o achado crítico da primeira auditoria era falso — o teste
foi feito contra um deploy anterior à inclusão do middleware. Re-verificação
em 2026-09-29 confirmou todos os headers presentes tanto em páginas (cache
PRERENDER) quanto em rotas `/api/*`. O middleware `src/middleware.ts` está
executando normalmente no runtime Edge da Vercel.

---

## 5. Rate Limiting ✅ VERIFICADO EM PRODUÇÃO (2026-09-29)

Teste real: 65 requisições rápidas em `GET /api/search?q=...` a partir de
um único IP.

**Resultado:** 59× HTTP 200, depois **429** nas requisições seguintes com
`Retry-After: 60` — exatamente o limite de 60 req/min configurado (o 1º
request do teste de headers consumiu 1 do quota: 1 + 59 = 60).

Observação: a falha do teste anterior foi o redirect do apex
(curriculopolitico.org → www), que mudava de IP de saída a cada conexão.

### 5.1 `Access-Control-Allow-Origin: *` em cache HITs — benigno

Páginas estáticas servidas com `X-Vercel-Cache: HIT` incluem
`Access-Control-Allow-Origin: *`; respostas MISS (servidor) não incluem.
É comportamento da camada de cache de borda da Vercel, não do código
(nenhum header CORS no repositório). Risco nulo: afeta apenas páginas
públicas, e navegadores rejeitam `ACAO:*` em requisições credenciadas,
logo não expõe dado de usuário.

---

## 6. Google OAuth ✅

Botão "Continuar com Google" visível em `/auth/signin`.
`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurados no Vercel Production.
`NEXT_PUBLIC_GOOGLE_ENABLED=1` configurado.

---

## 7. Dados por Dimensão IDIP (produção)

| Dimensão | Fonte | Peso | Status |
|---|---|---|---|
| Integridade | LegalRecord (TCU/STF) | 25% | ⚪ baseline 50 (fontes bloqueadas) |
| Produção | BillAuthorship | 18% | ✅ real (50k autorias) |
| Aprovação | — | 15% | ⚪ baseline 50 (sem dados de aprovação) |
| Fiscalização | — | 10% | ⚪ baseline 50 |
| Presença | Votações nominais | 10% | ✅ real (taxa participação) |
| Transparência | — | 10% | ⚪ baseline 50 |
| Custo/Benefício | CEAP + CampaignFinance | 7% | ⚠️ parcial (dados parciais) |
| Campanha | — | 5% | ⚪ baseline 50 |

---

## 8. Arquivos do Repositório GitHub

- Branch: main
- Commit: d141bb3
- Total: ~13 commits de produção
- Workflows: ci.yml, monthly-snapshot.yml, production-smoke.yml
- Documentação: 61 arquivos em 8 diretórios
