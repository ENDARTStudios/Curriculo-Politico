# Tarefas abertas

Inventário do trabalho **realmente identificado no repositório**: dívidas
técnicas verificáveis no código, pendências registradas em documentos do próprio
projeto e limitações de fonte externa. Não há backlog de produto inventado aqui —
cada item aponta para o arquivo ou documento onde foi observado.

Notação de status: 🔴 aberto · 🟡 parcial · ⛔ bloqueado por terceiro.
Onde não foi possível confirmar algo lendo o repositório, está escrito
**não verificado**.

Método de quebra e estimativa: [TASK_BREAKING_DOWN.md](TASK_BREAKING_DOWN.md).

---

## 1. Dados e integridade

### T-01 ⛔⛔ Carga real da dimensão Integridade (TCU + STF)

**O que falta.** A dimensão **Integridade (25%, maior peso)** opera em baseline
neutro 50 porque `LegalRecord` está vazio. As travas de integridade (condenação
transitada em julgado, contas rejeitadas) **nunca disparam** com dado real.

**Estado verificado.** `apps/pipeline/etl/legal_records.py` opera em modo
*local-first*: não coleta nada, apenas reprocessa arquivos que o operador deposita
manualmente. O próprio cabeçalho do arquivo registra:

```
- TCU: api-publica exige credenciais (401) — sem endpoint aberto estável.
- STF: portal sem API consolidada (403 em endpoints de serviço).
- CNJ/TJs: autenticação/captcha — inviável sem parceria institucional.
```

**Achado que muda o item.** A sondagem ao vivo documentada em
[`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md`](../ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md)
corrige a premissa do ETL: o host `api-publica.tcu.gov.br` **não resolve em DNS**,
mas o TCU mantém **API pública real, sem autenticação**, em
`https://certidoes.apps.tcu.gov.br/api/publico/...`, com exportação CSV em massa
(4 listas: CADIRREG ~48 mil registros, Lista Eleitoral, Inidôneos, Inabilitados).
Ou seja: **o lado TCU é destravável**; o lado STF continua sem API (portal 403,
DataJud não cobre o STF — `api_publica_stf` retorna 404 — e DataJud não traz nome
de parte).

**Pré-requisitos antes de escrever código:**

1. Ler o anexo inteiro (ele traz endpoints testados, encoding Latin-1, formato CSV
   com separador `|` e avisos de WAF/captcha).
2. Decidir o tratamento de homonímia — a nota do anexo fala em cruzar fontes
   independentes com limiar alto e revisão humana.
3. Definir retenção jurídica: **não** armazenar CPF (RULES.md §1.5), e registros
   arquivados/absolvidos não podem chegar à UI.

**Definição de pronto:** um `load-*` idempotente que popula `LegalRecord` com
`sourceUrl` e `retrievedAt`, um teste de que `CLEARED`/`ARQUIVADO` não aparece em
`/api/politicians/[id]`, e `/metodologia` deixando de exibir baseline neutro para
Integridade onde houver dado.

**Bloqueio:** STF permanece ⛔ (depende de LAI/pedido institucional ou certidões
do TSE, que cobrem apenas ações penais de origem no STF).

---

### T-02 🟡 ETLs de TSE e Querido Diário — reexecução

**Registrado como pendente** em
[`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md)
§10 (item R7, prazo 30–90 dias), **com correção de premissa**: o texto afirma que
o CDN do TSE estava bloqueado, mas a sondagem ao vivo registrou **HTTP 200** em
`consulta_cand_2026.zip`, `prestacao_de_contas_eleitorais_candidatos_2022.zip`
(548 MB) e `certidao_criminal_2026_BR.zip` (69 MB).

**O que fazer.** Reexecutar `npm run etl:tse`, `etl:receitas`, `etl:bens` e
`etl:municipal`, então as cargas correspondentes. Antes, corrigir a afirmação
estática no `/status` (ver T-05).

**Atenção:** esses ETLs baixam centenas de MB. O egress do Supabase é o recurso
escasso do projeto — rodar carga em lote conta egress.

---

### T-03 🔴 Teste de restauração de backup

Registrado como **não existente** no próprio projeto. O
[`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md)
(item R4) descreve o workflow alvo — `pg_dump` cifrado para R2/B2 — e a
[`docs/05-security-compliance/COMPLIANCE.md`](../05-security-compliance/COMPLIANCE.md)
aponta explicitamente que **"backup não existe"** e que o RIPD afirmava
"backups Supabase" sem teste.

**O que falta:** (a) o workflow de dump cifrado; (b) o **teste de restauração**
com RPO/RTO medidos, não estimados. Um backup nunca restaurado não é backup.

---

## 2. Testes e verificação

### T-04 🔴 Testes unitários dos motores e das rotas de API

**Estado verificado.** Não há Vitest, Jest ou qualquer runner unitário no
repositório — os `devDependencies` de `apps/web` listam `@playwright/test` e
`@axe-core/playwright`, nada de unit testing. O que existe:

| Camada | Cobertura hoje |
|---|---|
| Motor IDIP | `npm run verify:scoring` (script próprio, roda no CI) |
| Motor de identidade | `npm run verify:identity` (roda no CI) |
| Páginas (render, a11y, SEO) | Playwright, 48 testes em 3 arquivos |
| **Rotas de API** | **nenhuma** — nenhum teste chama `/api/*` diretamente; só o smoke de produção por `curl` |
| Componentes isolados | nenhuma |

**Recomendação já registrada no projeto:** adicionar **Vitest** cobrindo rotas de
API e motores; "o CI já existe e leva ~1 min" (AVALIACAO_ALTERNATIVAS §9).

**Por onde começar (ordem sugerida, por risco):**

1. `POST /api/bills/[id]/vote` — é a rota com mais regras de negócio: 401 sem
   sessão, 400 voto inválido, 403 conta < 24h, 403 sem consentimento, 404
   projeto inexistente. Cinco ramos, nenhum testado.
2. `DELETE /api/consent` — a revogação **apaga todos os votos** do usuário. Erro
   aqui é violação de LGPD.
3. `POST /api/retificacao` — validações de nome/e-mail/descrição e geração de
   protocolo.
4. `GET /api/rankings` — filtro de `seed-*` e corte de confiança ≥ 60.
5. `packages/idip/src/scoring.ts` — casos de borda além dos que `verify-scoring.ts`
   já cobre.

---

### T-05 🔴 `/status` e `/metodologia` com texto fixo sobre a saúde das fontes

**Problema.** Os textos afirmam estado de fontes externas como se fosse medição.
A avaliação de alternativas registra o caso concreto: as páginas diziam que TSE e
Querido Diário estavam bloqueados, enquanto a sondagem ao vivo mostrava **HTTP 200
nos dois**. Ocorrências apontadas: `apps/web/src/app/status/page.tsx` (nota final
da página) e `apps/web/src/app/metodologia/page.tsx`.

Sintoma visível hoje em `/status`: a página exibe volumes **medidos** do banco
(parlamentares, notas, CEAP, proposições, votos, autorias, presenças, snapshot,
checagens) mas, no rodapé, afirma estado de fontes externas em texto fixo. Misturar
medição com texto fixo na mesma tela é o defeito.

**Recomendação registrada (R12):** tornar a saúde das fontes **medida** pelo mesmo
probe já usado na avaliação.

**Critério de pronto:** nenhuma afirmação sobre fonte externa em `/status` ou
`/metodologia` que não venha de uma verificação executada — ou remova a
afirmação, ou meça.

---

## 3. Tratamento de erro e resiliência

### T-06 🔴 Sem `error.tsx` de segmento

Verificado com busca por `error*.tsx` e `not-found*.tsx` em `apps/web/src`: os
únicos arquivos de fronteira são `apps/web/src/app/global-error.tsx` (global) e
`apps/web/src/app/api/*/route.ts`. **Não existe** `error.tsx` de segmento, nem
`not-found.tsx`, nem `loading.tsx`.

**Consequência.** Um erro de render em uma rota sobe até a fronteira global e
derruba a página inteira — o usuário perde header, navegação e o caminho de
volta. Um `notFound()` em `/politicos/[id]` cai no 404 padrão do Next, sem
identidade visual e sem link para a home.

**Ação:** criar `apps/web/src/app/not-found.tsx` e pelo menos um `error.tsx` por
segmento de risco (perfis, proposições, partidos, ranking). O
`global-error.tsx` já é um bom modelo: já captura para o Sentry quando o DSN
existe, já tem CTA de recuperação (`reset`) com contraste AA
(`text-slate-950` sobre `bg-sky-500`).

Ver [ERROR_HANDLING.md](../07-operations-marketing/ERROR_HANDLING.md).

---

### T-07 🟡 Erros de banco engolidos sem log da causa

**Estado verificado.** As rotas que consultam banco usam `try/catch` com `catch {}`
sem binding — por exemplo `apps/web/src/app/api/rankings/route.ts` e
`apps/web/src/app/api/politicians/[id]/route.ts` — e devolvem sempre o mesmo
envelope `BANCO_INDISPONIVEL` / 503. `apps/web/src/lib/hero-stats.ts` também
retorna `null` sem registrar nada.

A avaliação de alternativas registra isso como achado: *"`catch {}` em 8 rotas;
`/api/rankings` devolve `BANCO_INDISPONIVEL` para qualquer erro"* e recomenda
**logar a causa real no servidor** e devolver o status correto.

**Por que importa.** Sem Sentry configurado (ver T-08), um erro de query é
invisível. Durante a auditoria de produção, uma medição de 4.190 ms foi
inicialmente interpretada como falta de índice quando era *cold start* — o custo
de não conseguir ver a causa.

**Ação:** trocar `catch {}` por `catch (erro)` com `console.error` contendo
mensagem e contexto, e diferenciar 503 (banco fora) de 500 (erro inesperado).

---

### T-08 🔴 Sentry com DSN não configurado

**Estado verificado.** O código de instrumentação existe e está completo:
`apps/web/src/instrumentation.ts` (server/edge) e
`apps/web/src/instrumentation-client.ts` (browser), ambos com import dinâmico e
**dormentes sem DSN** — sem `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, o SDK nem
entra no bundle. `apps/web/src/app/global-error.tsx` também só chama
`Sentry.captureException` quando `NEXT_PUBLIC_SENTRY_DSN` existe.

O `.env.example` lista as duas variáveis como comentadas/opcionais, e a leitura
dos arquivos `apps/web/.env*` do repositório **não mostra DSN definido** em
nenhum deles. Conclusão verificável: a instrumentação está pronta, a ativação não
foi feita.

**Ação (R9, US$ 0):** criar o projeto no Sentry, definir as duas variáveis na
Vercel e redeployar. Antes, revisar LGPD: a própria avaliação recomenda
`sendDefaultPii: false` e `beforeSend` com denylist, e o RIPD registra Sentry
como operação **condicional**.

**Pendência correlata:** SCCs de Vercel/Sentry não assinados (registrado como
P1-03 em `docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md`).

---

### T-09 🔴 Rate limit distribuído

**O que existe:** Token Bucket em memória no `middleware.ts`, com tiers geral
(60/min) e crítico (10/min), e o próprio código documenta o limite: os baldes são
por instância serverless, então o limite vale "por instância-visita". A proteção
completa por IP depende de Cloudflare/WAF — **não implementado no repositório**.

**O que falta:** estado compartilhado. As opções já pesquisadas em
[`docs/ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md`](../ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md)
incluem Redis (Upstash) e rate limit no próprio Postgres. A avaliação de
alternativas agrupa isso no item R8 e alerta: **não ativar e-mail transacional sem
rate limit compartilhado** — "derruba a recuperação de senha de todos".

---

## 4. Performance

### T-10 🟡 Cache de dados nas rotas dinâmicas (R2)

**Estado verificado.** Não há `unstable_cache` nem `revalidateTag` em
`apps/web/src` (busca no fonte não retorna ocorrência). As rotas dinâmicas batem
no banco a cada requisição.

**Contexto medido** (AVALIACAO_ALTERNATIVAS §2.2): cada request de `/ranking`
devolvia **177 KB** do banco; a cota de egress do Supabase Free é **5 GB/mês**
unificada. `/ranking` sozinho com 28 mil visitas/mês consumiria ~100% da cota.
**O egress é o recurso escasso do projeto**, mais que conexões.

**Correção de premissa importante:** `force-dynamic` **não** desliga todo cache —
ele equivale a `fetch(..., { cache: 'no-store' })`, e o Data Cache continua ativo
(é o que `unstable_cache` usa). Ou seja: a solução convive com `force-dynamic`.

Detalhes de medição em [PERFORMANCE.md](../07-operations-marketing/PERFORMANCE.md).

---

### T-11 🟡 Paginação de `/ranking` — payload

**Estado verificado:** `apps/web/src/app/ranking/page.tsx` tem `PAGE_SIZE = 100`
e fatia a lista antes de renderizar; a auditoria de produção de 2026-09-29
media **1,5 MB** e 3,12 s numa tabela única de 598 parlamentares, e a paginação
foi adicionada depois. A medição de latência pós-`gru1` (**354 ms** de média em
10 requisições) é de outra data e provavelmente de outra configuração.

**O que falta:** uma medição nova do tamanho do HTML de `/ranking` **com** a
paginação em vigor. Sem isso, não se sabe se T-10 ainda é urgente. **O tamanho
atual não foi verificado neste documento.**

---

### T-12 🟡 `pg_trgm`/`tsvector` para busca em volume futuro

A avaliação de alternativas (§2.6) registra que a busca **não** é problema de
índice hoje: `EXPLAIN ANALYZE` mostra `Seq Scan` com **0,5 ms** de execução (o
`LIMIT 8` para cedo) e o custo é ida e volta até o banco. `pg_trgm` e `unaccent`
estão disponíveis mas **não instaladas**.

**Status honesto:** item de escala, não de dor atual. A própria avaliação conclui
"Não indexar a busca como prioridade".

---

## 5. Acessibilidade

### T-13 🔴 `prefers-reduced-motion` não alcança animação JavaScript

**Lacuna real e documentada.** A regra global em
`apps/web/src/app/globals.css` (`@layer base`) zera `animation-duration`,
`animation-iteration-count` e `transition-duration` com `!important`. Isso cobre
**CSS**, e não cobre:

- `requestAnimationFrame`
- Web Animations API (`element.animate()`)
- canvas/WebGL

**Mitigação atual: nenhuma, porque hoje não há animação JS no projeto** — os três
keyframes (`rise`, `fade`, `aurora`) são CSS puro. O risco é a introdução futura.
Ver [ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md) §5.

**Ação:** antes de adicionar a primeira animação JS, decidir entre (a) escrever
`matchMedia("(prefers-reduced-motion: reduce)")` à mão com o padrão "pular para o
estado final" (`duration: 0`), ou (b) adotar Motion, a única biblioteca avaliada
que respeita reduced-motion automaticamente
(`MotionConfig reducedMotion="user"`). A decisão está **pendente** e registrada
em [RESEARCH.md](../08-knowledge-management/RESEARCH.md).

---

### T-14 🟡 Cobertura de acessibilidade limitada a 3 páginas

O gate `@axe-core/playwright` audita **home, `/ranking` e `/metodologia`** apenas
(`tests/e2e/acessibilidade.spec.ts`). Ficam fora páginas de perfil de político,
proposição, partido, `/comparar`, `/status`, `/stf` — justamente as que exibem
gráficos, tabelas e o Termômetro em contexto.

**Ação:** estender a lista. Custo baixo (o padrão de teste é um `goto` + `auditar`),
mas exige dados reais presentes no alvo para o teste valer alguma coisa.

---

## 6. Documentação

### T-15 🔴 `CONTRIBUTING.md` da raiz está desatualizado

Problemas verificados no arquivo:

| Linha | Problema |
|---|---|
| Instruções de setup | `cp .env.example .env` — o caminho real é `apps/web/.env.example` → `apps/web/.env` |
| Verificação | `npx tsc --noEmit` — o comando do projeto é `npm run typecheck` |
| Migração | `npx prisma migrate deploy` — o script do projeto é `npm run db:migrate` |
| §4 "Estrutura do repositório" | Descreve `01-product-discovery/`, `02-architecture-design/`, `05-security-compliance/`, `06-devops-deployment/`, `etl/`, `prisma/`, `scripts/`, `src/` **na raiz** — estrutura pré-monorepo. Hoje é `apps/*` + `packages/*` + `docs/*` |
| §3 "Regras do projeto" | Aponta para `05-security-compliance/SECURITY_BASELINE.md`, que **não existe** |

**Decisão de localização:** a fonte permanece na raiz (convenção do GitHub + link
do README). Ver
[`docs/08-knowledge-management/CONTRIBUTING.md`](../08-knowledge-management/CONTRIBUTING.md).

---

### T-16 🟡 Referências a documentos que não existem (ou existem em outro lugar)

Verificado por busca no fonte e na documentação. Arquivos **citados por comentários
de código** que não estão no caminho apontado:

| Referência citada | Onde é citada | Situação |
|---|---|---|
| `SCORING_METHODOLOGY.md` (sem caminho) | `packages/idip/src/scoring.ts` (cabeçalho), `apps/pipeline/scripts/apply-integrity-caps.ts` (§4) | 🟡 **existe**, mas em `docs/02-architecture-design/SCORING_METHODOLOGY.md`. A citação não traz o caminho — apontar para lá |
| `SCORING_METHODOLOGY.md §5` | `apps/web/src/app/api/rankings/route.ts` | 🟡 mesmo caso |
| `ARCHITECTURE.md` (sem caminho) | `apps/pipeline/etl/camara_deputados.py` (camada raw imutável) | 🟡 **existe**, em `docs/02-architecture-design/ARCHITECTURE.md`. Atualizar a citação para o caminho completo |
| `SECURITY_BASELINE.md` | `apps/web/src/middleware.ts`, `apps/web/src/app/api/politicians/[id]/route.ts`, `CONTRIBUTING.md` (§3), `docs/01-product-discovery/LEGAL_TERMS.md`, `docs/01-product-discovery/ROADMAP.md` | ❌ **não existe** em nenhum lugar do repositório. O conteúdo equivalente mais próximo é `docs/05-security-compliance/COMPLIANCE.md` — **não confirmado** como substituto oficial |

**Ação:** atualizar os comentários de código e as referências em `docs/` para o
caminho vigente. O caso de `SECURITY_BASELINE.md` é o mais espalhado (5 arquivos) e
exige uma decisão: criar o documento, ou redirecionar todas as citações para
`COMPLIANCE.md`.

---

## 7. Itens fora do controle do código

| Item | Situação | Onde está registrado |
|---|---|---|
| SCCs de Vercel e Sentry | 🟡 não assinados | `docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md` (P1-03) |
| Revisão jurídica humana de Termos, Privacidade e RIPD | 🟡 pendente antes de campanha | `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.7 |
| `pool_size` do Supavisor | 🟡 paliativo não aplicado (15 → ~40). O transaction pooler já resolveu o sintoma | `docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` §3 |
| Supabase Pro (US$ 25/mês) | 🟡 decisão no gatilho de egress | idem (R5) |
| Migrar NextAuth v4 → v5 | 🚫 **não fazer** — decisão registrada | idem §11 |
| Base de usuários vazia | informativo: 0 usuários, 0 votos, 0 retificações na medição | idem §2.5 |

## 8. Pendências de UI registradas no design

De [`docs/design/avaliacao-ferramentas.md`](../design/avaliacao-ferramentas.md):

- **Emil Kowalski — skills (MIT):** candidato a vendorizar **4 skills** (markdown
  puro, sem rede, ciente de Tailwind v4). Nada instalado. Lacuna apontada:
  animação, dados *worst-case* e "feel" nativo mobile.
- **Motion:** não adotado. Reconsiderar **apenas** quando existir animação JS
  concreta — e nesse caso pinar a versão exata.
- **Bklit UI:** "ADAPTAR se e somente se" um gráfico específico for requisito de
  produto (sankey e heatmap são os candidatos naturais para fluxo de dinheiro de
  campanha e densidade de votações). Hoje: apenas referência.
- **Kokonut UI:** item mais útil é o helper `cn` (`clsx` + `tailwind-merge`) — **não
  verificado** se o projeto já tem equivalente.

---

## Como usar este documento

1. Escolha um item 🔴 (não ⛔) que caiba na sua sessão.
2. Abra [TASK_BREAKING_DOWN.md](TASK_BREAKING_DOWN.md) e fatie até cada fatia ser
   verificável em menos de um dia.
3. Antes de fechar: rode os gates de [TESTING.md](TESTING.md).
4. Se o item mudou de natureza (resolvido, bloqueado, redefinido), **atualize este
   arquivo** e registre a decisão em
   [`docs/08-knowledge-management/MEMORY.md`](../08-knowledge-management/MEMORY.md).
