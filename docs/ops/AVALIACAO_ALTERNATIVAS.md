# Avaliação de Alternativas — Currículo Político

**Data:** 2026-10-12 · **Método:** medição direta em produção (Vercel/Supabase), leitura do
repositório, sondagem das fontes oficiais e consulta a documentação oficial dos fornecedores.

> Tudo nesta avaliação foi **medido ou lido em fonte oficial nesta sessão**. Números que
> dependem de página renderizada por JS e que não pude confirmar estão marcados como
> **não confirmado** em vez de estimados. Onde a hipótese inicial se mostrou errada, o
> registro da correção está no próprio texto.

---

## 1. Sumário executivo

| # | Decisão recomendada | Custo | Esforço | Resolve |
|---|---|---|---|---|
| **R1** | Rodar as funções na **região `gru1` (São Paulo)**, co-localizadas com o banco | US$ 0 | 10 min | Latência de todas as páginas dinâmicas |
| **R2** | **Cache/read model** para as páginas que hoje são `force-dynamic` | US$ 0 | 1–2 dias | Latência **e** o gargalo de egress |
| **R3** | **Transaction pooler (6543)** + `connection_limit=1` | US$ 0 | 30 min | Queda de 500/503 a cada deploy |
| **R4** | **Backup real** (`pg_dump` semanal para storage privado) | US$ 0 | 2 h | Perda total de dados + afirmação incorreta no RIPD |
| **R5** | **Supabase Pro** quando houver tráfego real | US$ 25/mês | 15 min | Egress 5→250 GB, backup diário, sem pausa |
| **R6** | Destravar **Integridade** com dados do TCU **já baixados** + Portal da Transparência | US$ 0 | 3–5 dias | 25% do IDIP hoje em baseline 50 |
| **R7** | **Re-rodar os ETLs** de TSE e Querido Diário (fontes voltaram) | US$ 0 | 1 dia | Patrimônio/receitas e diários municipais |
| **R8** | **E-mail (Resend) + verificação obrigatória + rate limit compartilhado** — em par | US$ 0 | 1 dia | Risco LGPD registrado no RIPD |
| **R9** | **Sentry (DSN) + alerta de cron** | US$ 0 | 40 min | Falhas invisíveis |
| **R10** | **Testes automatizados** e fim dos `catch {}` silenciosos | US$ 0 | 2–3 dias | Regressões e diagnóstico |
| **R11** | Atualizar **Next 15.5.26 → 15.5.27** | US$ 0 | 15 min | Advisory moderado (cache poisoning SSG/ISR) |
| **R12** | `/status` com **saúde real das fontes** (hoje o texto é fixo e está errado) | US$ 0 | 3 h | Credibilidade da página de transparência |

**Ordem sugerida:** R1 → R3 → R11 → R4 → R2 → R9 → R8 → R12 → R6 → R7 → R5 (por gatilho) → R10.
Nenhuma exige trocar de fornecedor.

---

## 2. Diagnóstico medido (2026-10-12)

### 2.1 Latência: as funções estão longe do banco

| Medição | Valor |
|---|---|
| `/ranking` em produção (10 requisições, página 2) | mín 1.543 ms · máx 2.460 ms · **média 1.738 ms** |
| `/ranking` no servidor local, **mesmo build**, máquina no Brasil | **505 ms** |
| Região das funções Vercel (`serverlessFunctionRegion`) | **`iad1` — Washington, D.C.** |
| Região do banco Supabase | **`sa-east-1` — São Paulo** |

O mesmo código e o mesmo banco respondem em 0,5 s quando a aplicação roda perto do banco e
em 1,7 s quando roda em Washington. A diferença é distância física por requisição — não é
código, não é query.

### 2.2 Egress: o gargalo real do plano gratuito

| Medição | Valor |
|---|---|
| Dados devolvidos pelo banco em **cada** request de `/ranking` | **177 KB** |
| Cota do Supabase Free (egress unificado: banco + auth + storage + realtime) | **5 GB/mês** |
| `/ranking` sozinho com 28 mil visitas/mês | **~5 GB — consome 100% da cota** |
| Com 100 mil visitas/mês (só `/ranking`) | **~17,7 GB — 3,5× a cota** |

Confirmado na documentação oficial: a cota de egress é **unificada** entre serviços e, quando
estourada no Free, a organização entra em período de graça e depois é **restrita**. Backups
manuais pelo pooler **também contam** como egress.

### 2.3 Cache: tudo que é dinâmico bate no banco sempre

| Rota | `x-vercel-cache` | `cache-control` |
|---|---|---|
| `/`, `/metodologia` | **HIT** | `public, must-revalidate, max-age=0` |
| `/ranking`, `/status`, `/partidos` | **MISS** | `no-store, private` |

**10 das 27 páginas declaram `force-dynamic`** e o build marca **13 das 27 como dinâmicas** (ƒ)
— as demais caem no modo dinâmico por usarem cookies/sessão, não por escolha explícita. A causa
raiz é legítima: o build do CI roda **sem banco** (`DATABASE_URL` falso), então as páginas que
dependem de dados não podem ser pré-renderizadas no build.

### 2.4 Conexões: a queda que ocorreu hoje

| Medição | Valor |
|---|---|
| Erro capturado | `FATAL: (EMAXCONNSESSION) max clients reached in session mode - pool_size: 15` |
| Pooler em uso | Session mode, porta **5432** |
| `connection_limit` no `prisma.ts` | **ausente** |
| Efeito real | HTTP **500/503 por 1–2 min** em páginas dinâmicas após deploys |
| Teste do pooler em **transaction mode (6543)** com Prisma deste projeto | **funciona** — `count` 688 ms (vs 3.995 ms), ranking 163 ms, `$transaction([...])` OK |

### 2.5 Dados e volume

| Item | Valor |
|---|---|
| Tamanho do banco | **98 MB** (limite Free: 500 MB) |
| Maior tabela | `SessionAttendance` — 53 MB, 166.825 linhas |
| Modelos **sem nenhum dado** | **13 de 27** (inclui `LegalRecord`, todos os `Stf*`, `HistoricalPolitician`, `MunicipalExpense`) |
| Usuários / votos / retificações | **0** — base pré-lançamento |

### 2.6 Desempenho da busca (correção de hipótese)

A primeira medição deu **4.190 ms** para `"saúde"` e sugeria falta de índice. **Estava errado**:
era *cold start*. Medições repetidas deram 105–900 ms, e o `EXPLAIN ANALYZE` mostra
`Seq Scan` com **0,5 ms de execução** (o `LIMIT 8` para cedo). **A busca não é problema de
índice** — o custo é ida e volta até o banco. Criar `pg_trgm`/`tsvector` continua útil para
volume futuro (`pg_trgm` e `unaccent` estão disponíveis, não instaladas), mas **não** é a
prioridade que a primeira medição sugeria.

### 2.7 Segurança das dependências (auditado)

| Achado | Situação real |
|---|---|
| `npm audit` | 5 high + 1 moderate |
| **`next` 15.5.26** — cache poisoning de SSG/ISR (moderado) | **Afetado.** Corrigido em **15.5.27** (já publicada). `latest` geral é 16.4.0 |
| `postcss` 8.5.28 instalado | Faixa vulnerável é `<= 8.5.22` → **não afetado** |
| `source-map-js` 1.2.1 | Faixa `1.0.0–1.2.1` → no limite; corrigir junto com o Next |
| `deepmerge-ts` 7.1.5 (via `@prisma/config`) | Só **CLI/build** — o app não importa `@prisma/config` em runtime |

> **Correção importante de um alarme falso.** Um levantamento paralelo apontou **duas CVEs de
> account takeover no NextAuth** como "ação urgente hoje". Verifiquei nas fontes primárias:
> as CVEs existem (GHSA-x445-f3h2-j279 e GHSA-7rqj-j65f-68wh, publicadas em **23/07/2026**,
> não em agosto), mas o NextAuth vulnerável é `<= 4.24.14` (média) e `< 4.24.15` (crítica) —
> **e o projeto já está em `next-auth@4.24.15`**, a versão `latest` do v4. **Não há nada a
> fazer.** Além disso, a CVE crítica é do fluxo de e-mail/magic-link, que **este projeto não
> usa** (credenciais + Google). O alerta veio de pesquisa que não conferiu a versão instalada.

### 2.8 Backup — divergência entre documento e realidade

| Onde | O que diz |
|---|---|
| `docs/security/RIPD.md` §4 | Mitigação do risco de vazamento inclui "**backups Supabase**" |
| Realidade | **Não existe nenhum backup**: nenhum `pg_dump`, nenhum workflow, e o **plano Free do Supabase não inclui backup automático** (confirmado na tabela oficial de preços: Free = "Automatic backups: Not included"; Pro = 7 dias) |

98 MB de dados curados (31.815 proposições, 166.825 presenças) e, no futuro, votos de usuários
(dado sensível) estão **sem cópia de segurança** — e o RIPD afirma o contrário.

### 2.9 Estado atual das fontes de dados (sondagem ao vivo)

| Fonte | Status hoje | Observação |
|---|---|---|
| Câmara dos Deputados | ✅ 200 | em uso |
| Senado Federal | ✅ 200 | em uso |
| **CDN do TSE** | ✅ **200** | declarado "bloqueado" em `/status` — **não está mais** |
| **Querido Diário (API)** | ✅ **200** | declarado "bloqueado" — **funciona** |
| Portal do TCU | ✅ 200 | HTML |
| `api-publica.tcu.gov.br` | ❌ erro de conexão | sem credencial |
| Portal do STF | ❌ **403** | segue bloqueado |
| CNJ DataJud (API pública) | ⚠️ **401** | exige chave pública do CNJ |
| Portal da Transparência | ⚠️ **401** | exige chave gratuita |

---

## 3. Frente A — Banco e conexões

### 3.1 O que foi verificado

Testei o pooler em **transaction mode (6543)** com o Prisma **deste** projeto, incluindo a
única transação existente (`$transaction([...])` em `api/consent/route.ts`): **funciona e é
mais rápido no primeiro acesso**. Logo, a recomendação é segura e não exige mudança de código.

### 3.2 Alternativas

| Opção | Custo/mês | Região BR | Egress/limite | Esforço | Risco |
|---|---|---|---|---|---|
| **Supabase Free + transaction pooler + cache** (recomendado agora) | **US$ 0** | ✅ sa-east-1 | **5 GB** — teto real | 30 min | Baixo. Egress é o teto |
| **Supabase Pro** | **US$ 25** | ✅ sa-east-1 | 250 GB | 15 min | Baixo. É a saída natural do teto |
| Neon | ver plano | ✅ (AWS São Paulo) | generoso no free | médio (driver/URL) | pooling próprio; migração de schema simples |
| Railway / Render / Fly.io | ~US$ 5–20 | parcial | varia | médio | menos previsível que Supabase |
| Postgres em VPS (Hetzner + Coolify) | ~US$ 5–10 | ❌ (EUA/UE) | ilimitado | alto | **você opera backup, patch e HA**; LGPD/residência piora |
| Cloudflare Hyperdrive + Postgres | baixo | ❌ | — | alto | muda a plataforma de execução |

> Preços de Neon/Railway/Render/Fly não foram confirmados em fonte oficial nesta rodada —
> **não confirmado**. As duas linhas que importam (Free e Pro do Supabase) estão confirmadas.

### 3.3 Recomendação

1. **Agora (US$ 0):** `DATABASE_URL` de produção → porta **6543** com
   `?pgbouncer=true&connection_limit=1`. Manter `directUrl` (ou uma variável separada) na 5432
   para `prisma migrate`, que **não** funciona em transaction mode.
2. **Gatilho para o Pro:** quando o egress mensal passar de ~4 GB ou o egress for restringido.
   US$ 25 compra 250 GB, backup diário de 7 dias e fim da pausa por inatividade.

---

## 4. Frente B — Backup e continuidade (prioridade alta)

**Recomendação:** workflow semanal no GitHub Actions rodando `pg_dump` (formato custom,
comprimido) e enviando para **storage privado** — Cloudflare R2 ou Backblaze B2 (faixa gratuita
de 10 GB é suficiente para os ~98 MB atuais). Retenção de 4 semanais + 1 mensal.

**Regras inegociáveis:**
- **Nunca** publicar o dump como artefato/release do GitHub — o repositório é **público** e o
  dump conterá e-mails e votos (opinião política = dado sensível).
- Cifrar antes de subir (`age`/`gpg`) e guardar a chave fora do repositório.
- Custo de egress: cada dump de 98 MB consome cota; com compressão cai bastante — **semanal é
  suficiente** e cabe no orçamento de 5 GB.
- **Corrigir o RIPD**: ou o backup passa a existir de fato, ou a linha "backups Supabase" sai
  da tabela de mitigações. Documento de compliance não pode afirmar controle inexistente.
- Testar **restauração** pelo menos uma vez (`pg_restore` em banco local) — backup não testado
  não é backup.

---

## 5. Frente C — Plataforma, região e custo

### 5.1 Vercel Hobby: pode continuar

Verificado na **Fair Use Guidelines oficial** (atualizada em 2026-09-14): *"Hobby teams are
restricted to non-commercial personal use only"*, mas com a ressalva explícita:
> **"Asking for Donations does not fall under commercial usage."**

Ou seja: a página `/apoie` **não** torna o projeto comercial. **Vira comercial** se houver
anúncios, link de afiliado como propósito principal, venda de produto/serviço, ou pagamento a
alguém para criar/manter o site. **Esse é o gatilho documentado para migrar de plano.**

Limites do Hobby relevantes: 100 GB de transferência, 1M invocações, **4 CPU-hrs**, 100
deploys/dia, **logs de runtime de apenas 1 hora**, sem suporte por e-mail. Middleware em Edge
tem teto de fair use de **50 ms de CPU em média** — relevante porque o middleware atual faz
verificação de JWT (`getToken`) e roda em **todas** as rotas.

### 5.2 A correção mais barata: região

A Vercel permite **escolher a região única** no Hobby (`regions: ["gru1"]` no `vercel.json`, ou
Settings → Functions). Com o banco em `sa-east-1`, rodar em `gru1` (São Paulo) elimina a
travessia do continente em cada query. **Custo zero, sem mudança de código, reversível.**

### 5.3 Alternativas de plataforma

| Opção | Custo estimado | Next.js 15 App Router + middleware + Prisma | Migração | Risco |
|---|---|---|---|---|
| **Vercel Hobby (atual)** | US$ 0 | nativo | — | logs de 1 h; teto de CPU no middleware |
| Vercel Pro | US$ 20/usuário + uso | nativo | 0 | custo fixo para projeto sem receita |
| Cloudflare Workers/Pages (OpenNext) | faixa gratuita generosa | **parcial** — adaptador, nem tudo é suportado | alto | reescrever bordas; Prisma precisa de driver HTTP |
| Netlify / Railway / Render | US$ 0–20 | bom | médio | ecossistema menor para App Router |
| VPS + Coolify/Dokploy | US$ 5–10 | você opera | alto | vira sysadmin: deploy, TLS, backup, patch |

**Recomendação:** **permanecer no Hobby**, aplicar `gru1` e cache. Migrar para **Pro** apenas no
gatilho comercial ou de limite. Migrar de plataforma **não** resolve o problema de hoje: o
gargalo é arquitetural (banco remoto por request), e isso se resolve com cache — não com outro
hospedeiro.

---

## 6. Frente D — Arquitetura de leitura (maior ganho, menor risco)

O problema: páginas dinâmicas consultam o Supabase a cada visita, atravessando o continente, e
consomem cota de egress proporcional ao tráfego. O conteúdo, porém, **muda quando os scores são
recalculados** (mensal ou manualmente) — não a cada segundo.

**Solução compatível com o build sem banco** (não quebra o CI):

1. Manter `force-dynamic` e envolver as leituras em **`unstable_cache`** (ou `use cache`) com
   `revalidate` (ex.: 1 h) e **tags** por domínio (`ranking`, `partidos`, `politico:<id>`).
2. Após `recalculate-scores`/`db:snapshot`, chamar **`revalidateTag`** por uma rota interna
   protegida por token — publica a mudança na hora, sem esperar o TTL.
3. Reduzir o que trafega: a query de `/ranking` já foi enxugada com `select`; o próximo passo é
   **não buscar 594 linhas por request** — paginar no banco (já há paginação de 100) e cachear.

**Ganho esperado:** `/ranking` sai de ~1,7 s para dezenas de ms e o egress da rota cai a
praticamente zero no regime de cache — resolvendo simultaneamente a latência (§2.1) e o teto de
egress (§2.2). Isso é o que permite continuar no plano gratuito com tráfego real.

**Alternativa complementar:** read model materializado (tabela `RankingCache` ou JSON gerado no
pipeline mensal e servido do edge). Ganho parecido, mas exige mais código e um passo de
invalidação — começar pelo cache de dados, que é menor e reversível.

---

## 7. Frente E — Fontes de dados e a dimensão Integridade

### 7.1 A boa notícia: as fontes "bloqueadas" em boa parte não estão

A sondagem (§2.9) mostra **CDN do TSE e Querido Diário respondendo 200**. O texto fixo do
`/status` está desatualizado e afirma o contrário — corrigir (R12) e **re-rodar os ETLs**
(`etl:bens-historico`, `etl:receitas`, `etl:tse`, `etl:municipal`).

### 7.2 A descoberta que destrava a Integridade (25% do IDIP)

Durante esta avaliação foram **baixados e verificados** conjuntos oficiais que cobrem exatamente
o que falta para `LegalRecord`:

| Conjunto | Registros | Colunas-chave |
|---|---|---|
| TCU — **contas julgadas irregulares** | **47.980 linhas** (10,6 MB) | `Nome`, `CPF/CNPJ`, `UF`, `Município`, `Processo`, `Link do processo`, `Acórdãos`, **`Trânsito em julgado`** |
| TCU — responsáveis **inidôneos** | 128 | inclui `Data final da sanção` |
| TCU — responsáveis **inabilitados** | 781 | inclui `Data final da sanção` |
| Portal da Transparência — **OpenAPI com 109 endpoints** | — | **`/ceis`**, **`/cnep`**, **`/ceaf`**, **`/peps`**, `/acordos-leniencia`, `/servidores` |
| TSE — candidaturas **2026** | **21.013** (Dep. Federal 7.803) | eleição de **04/10/2026**, dados gerados em 11/10/2026 |

O arquivo de contas irregulares tem **a coluna que a metodologia exige**: `Trânsito em julgado`.
É o que separa "réu" de "condenação transitada em julgado" — a trava de integridade só pode
disparar com decisão definitiva, conforme a Constituição do projeto.

### 7.3 Como usar isso com segurança (procedimento proposto)

1. **Não armazenar CPF** (Constituição do projeto proíbe). O `LegalRecord` não tem campo de CPF —
   usar CPF **apenas em memória** para casar, descartando antes de gravar.
2. **Casar por CPF quando possível** (é o único identificador confiável) e, na ausência,
   **nome normalizado + UF**, sempre com **fila de revisão humana** para média confiança — o
   projeto já tem `resolve-identity.ts` com esse fluxo.
3. Só aplicar **trava** onde `Trânsito em julgado` estiver preenchido; o resto vira registro
   informativo com a linguagem jurídica estrita já adotada.
4. **Fonte citada por linha** (`sourceUrl` do processo no TCU) — requisito de auditabilidade.
5. Registrar a operação no RIPD (dados de natureza jurídica sobre pessoas identificadas).

**Isto não foi executado** — é recomendação. Carregar registros judiciais reais sobre pessoas
nomeadas afeta reputação e exige decisão explícita do controlador, além de revisão humana dos
matches por homônimo.

### 7.4 Oportunidade de calendário

A eleição foi em **04/10/2026** (há 8 dias) e há um turno em disputa. Os dados de candidaturas
2026 já estão públicos. A plataforma ainda reflete a composição anterior — há uma janela clara
de relevância editorial em incorporar o resultado eleitoral.

---

## 8. Frente F — E-mail, autenticação, rate limiting e observabilidade

### 8.1 O par indivisível: e-mail + rate limit

O RIPD registra o risco: *"conta com e-mail não verificado votando (dado sensível)"*. Resolver
exige **e-mail transacional** (não existe hoje) **e** rate limiting com estado compartilhado.
Fazer só o e-mail **cria um vetor novo**: qualquer script dispara reenvios, queima a cota diária
do provedor e **derruba a recuperação de senha de todo mundo**.

O rate limit atual (`middleware.ts`) é **Token Bucket em memória, por instância** — o próprio
comentário do código reconhece. Em serverless o limite efetivo é `60 req/min × nº de instâncias`
e zera a cada cold start. **Não conta como mitigação de brute-force.**

### 8.2 Recomendações verificadas

| Frente | Recomendação | Custo |
|---|---|---|
| E-mail | **Resend free** (3.000/mês, teto 100/dia, região São Paulo), subdomínio dedicado, DKIM+SPF+DMARC; `suporte@` por Cloudflare Email Routing | US$ 0 |
| Verificação | E-mail verificado **antes** de permitir voto; gate no servidor, não só na UI | US$ 0 |
| Rate limit | **Upstash Redis free** (500k comandos/mês) + `@upstash/ratelimit`, **só em rotas sensíveis**; falhar fechado em auth/voto | US$ 0 |
| Erros | **Sentry free** — o código já está instrumentado e dormente; falta só o DSN | US$ 0 |
| Cron/uptime | Manter UptimeRobot (já em uso) + heartbeat para o snapshot mensal | US$ 0 |
| Captcha | Cloudflare Turnstile em cadastro/reenvio (grátis) | US$ 0 |

**Sobre autenticação:** não migrar NextAuth v4 → v5 (o v5 está em `5.0.0-beta.32` e o Auth.js foi
absorvido pelo time do Better Auth; a própria mantenedora recomenda Better Auth para projetos
novos). O v4 está em modo manutenção de segurança **e está atualizado** (4.24.15). Com **0
usuários**, migrar para Better Auth custaria 1–3 dias; depois do lançamento, custa muito mais.
É uma janela que fecha — decisão do controlador, não urgência técnica.

**LGPD ao ativar cada serviço:** Sentry, Resend, Upstash e Turnstile viram **subprocessadores**
(registrar no RIPD e na Política); Resend e Sentry guardam dados nos **EUA** (transferência
internacional, art. 33) — desligar armazenamento de mensagens no Resend e usar
`sendDefaultPii: false` + denylist no Sentry, nunca enviando e-mail, voto ou IP cru.

---

## 9. Frente G — Engenharia e qualidade

| Lacuna | Evidência | Recomendação |
|---|---|---|
| **Zero testes automatizados** | não há Vitest/Jest/Playwright; só `verify:scoring` e `verify:identity` | Adicionar **Vitest** cobrindo rotas de API e motores; o CI já existe e leva ~1 min |
| **Erros engolidos** | `catch {}` em 8 rotas; `/api/rankings` devolve `BANCO_INDISPONIVEL` **para qualquer** erro | Logar a causa real no servidor (agora invisível sem Sentry) e devolver status correto |
| **Sem `error.tsx` de segmento** | só `global-error.tsx` | Um erro em uma rota derruba a página inteira |
| **`/status` e `/metodologia` com texto fixo** | Afirmam que **TSE e Querido Diário estão bloqueados** — a sondagem de hoje mostra **HTTP 200 nos dois**. Ocorrências: [`status/page.tsx`](../..//apps/web/src/app/status/page.tsx#L113), [`metodologia/page.tsx`](../..//apps/web/src/app/metodologia/page.tsx#L81) ("aguardando acesso ao CDN do TSE") e [`metodologia/page.tsx`](../..//apps/web/src/app/metodologia/page.tsx#L475) | Tornar a saúde das fontes **medida** pelo mesmo probe usado nesta avaliação; corrigir os textos estáticos. Numa plataforma de transparência, errar sobre as próprias fontes custa credibilidade |
| **Middleware em todas as rotas** | matcher cobre tudo, inclusive páginas estáticas | Restringir a matcher (`/api/*` + rotas com CSP necessário) reduz CPU no Edge |
| **`.env` local aponta para produção** | `db:seed`, `db:load-*` gravam em produção | Já mitigado com guarda no `db:seed`; estender aos demais scripts destrutivos |

---

## 10. Roadmap priorizado

### Agora — 1 dia, US$ 0 (risco baixo, ganho alto)

1. `regions: ["gru1"]` no `apps/web/vercel.json` + redeploy (**R1**).
2. `DATABASE_URL` → 6543 com `pgbouncer=true&connection_limit=1` (**R3**).
3. `next` → 15.5.27 (**R11**).
4. Sentry DSN (**R9**).
5. Corrigir a linha de backup no RIPD (**R4**, parte documental).

### Próximas 2 semanas — US$ 0

6. Cache de dados com `unstable_cache` + `revalidateTag` nas rotas dinâmicas (**R2**).
7. Workflow de `pg_dump` cifrado para R2/B2 + teste de restauração (**R4**).
8. Resend + verificação de e-mail + Upstash rate limit, **no mesmo ciclo** (**R8**).
9. `/status` com probe real das fontes (**R12**).
10. Vitest nos motores e nas rotas de API (**R10**).

### 30–90 dias — decisões

11. **Integridade**: carga do TCU + Portal da Transparência, com revisão humana (**R6**).
12. Re-rodar ETLs de TSE e Querido Diário (**R7**).
13. **Supabase Pro (US$ 25)** no gatilho de egress (**R5**).
14. Avaliar **Better Auth** enquanto a base é 0.
15. Decidir sobre incorporar o resultado eleitoral de 2026.

---

## 11. O que NÃO fazer

- **Não migrar NextAuth v4 → v5** — beta de projeto absorvido; a versão atual está segura.
- **Não trocar de plataforma** para resolver latência: o ganho vem de região + cache, não de
  outro hospedeiro.
- **Não usar Vercel Pro como primeira resposta** ao egress: o cache resolve antes e de graça.
- **Não indexar a busca como prioridade** — o `Seq Scan` leva 0,5 ms; o custo é rede.
- **Não armazenar CPF** nem publicar dumps em repositório público.
- **Não aplicar trava de integridade sem `trânsito em julgado`** — viola a promessa de presunção
  de inocência da metodologia.
- **Não ativar e-mail transacional sem rate limit compartilhado** — derruba a recuperação de
  senha de todos.

---

## 12. Anexo — como cada número foi obtido

| Evidência | Comando/origem |
|---|---|
| Latência `/ranking` | 10 requisições HTTP sequenciais à produção, cronometradas |
| 177 KB/request | `JSON.stringify` do resultado da query real de `/ranking` |
| Cota de egress unificada | `supabase.com/docs/guides/platform/manage-your-usage/egress` |
| Preços/limites Supabase | `supabase.com/pricing.md` |
| Fair use Vercel (doações) | `vercel.com/docs/limits/fair-use-guidelines` (atualizado 2026-09-14) |
| Regiões de função | `vercel.com/docs/functions/configuring-functions/region.md` + API de projetos |
| `EMAXCONNSESSION` | erro literal do Prisma/Postgres capturado em produção |
| Transaction pooler | teste com `PrismaClient({ datasourceUrl })` nas portas 5432 e 6543 |
| CVEs do NextAuth | `api.github.com/advisories/GHSA-x445-f3h2-j279` e `GHSA-7rqj-j65f-68wh` + versão instalada |
| Vulnerabilidades de deps | `npm audit --omit=dev` |
| Estado das fontes | requisições HTTP diretas aos endpoints oficiais (§2.9) |
| Tamanho do banco | `pg_database_size` e `pg_total_relation_size` por tabela |
| Modelos vazios | `count()` em 27 modelos |
