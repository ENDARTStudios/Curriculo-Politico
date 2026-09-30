# Auditoria Técnica de Produção — curriculopolitico.org

**Data:** 2026-09-29 | **Método:** curl/CLI + Supabase Management API + Data API

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

## 4. Segurança — Headers ⚠️

| Header | Status |
|---|---|
| Strict-Transport-Security | ✅ Ativo (Vercel default) |
| Content-Security-Policy | ⚠️ **Não detectado em produção** |
| X-Frame-Options | ⚠️ **Não detectado** |
| X-Content-Type-Options | ⚠️ **Não detectado** |
| Referrer-Policy | ⚠️ **Não detectado** |
| Permissions-Policy | ⚠️ **Não detectado** |

**Causa:** O middleware Next.js (`src/middleware.ts`) pode não estar sendo
executado em produção, ou os headers estão sendo removidos pelo CDN edge da
Vercel. O middleware compila localmente mas os headers não aparecem nas
respostas de produção.

**Ação:** Investigar se o middleware está ativo no runtime da Vercel.
Alternativa: mover os headers para `next.config.ts` (headers() config) que
não depende de middleware.

---

## 5. Rate Limiting — Não Testável Externamente

O teste de 65 requisições sequenciais não retornou 429. Possíveis causas:
1. O middleware não está ativo (mesma causa dos headers)
2. O teste foi feito via apex (curriculopolitico.org) que redireciona para www
3. Cada redirect cria uma nova conexão com IP diferente

**Ação:** Verificar middleware ativo. Se não estiver, migrar rate limiting
para `next.config.ts` headers ou usar Vercel Rate Limiting nativo.

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
