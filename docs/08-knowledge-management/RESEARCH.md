# Pesquisa e avaliação de tecnologias

Consolidação das avaliações que o projeto já fez: **o que foi avaliado, o veredito, o
critério aplicado e o que foi efetivamente instalado**. Todos os vereditos abaixo já
estão registrados no repositório — este documento consolida e aponta, não reavalia.

Fontes primárias (leia-as para o detalhamento por ferramenta):

- [`docs/design/avaliacao-ferramentas.md`](../design/avaliacao-ferramentas.md) —
  veredito consolidado de 24 ferramentas de UI/UX
- [`docs/design/avaliacao-bibliotecas-animacao.md`](../design/avaliacao-bibliotecas-animacao.md)
  — 3 bibliotecas de animação + 6 galerias de componentes, com URL por afirmação
- [`docs/avaliacao-ferramentas-externas.md`](../avaliacao-ferramentas-externas.md)
  — Playwright, galerias, Replit
- [`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md)
  — plataforma, banco, região, egress, backup, custo
- [`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md`](../ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md)
  — sondagem ao vivo de fontes de integridade
- [`docs/ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md`](../ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md)
  — e-mail transacional, auth, rate limit, observabilidade

**Decisões que decorrem destas pesquisas estão em
[`MEMORY.md`](MEMORY.md) seções C e G.** Este documento registra o **método** e os
**vereditos**; lá está o **porquê** de cada decisão que virou código.

## 1. O método de pesquisa deste projeto

O padrão está explicitado no cabeçalho de
`docs/design/avaliacao-bibliotecas-animacao.md` e vale como norma:

> *"Todos os fatos abaixo vêm de páginas oficiais, de `package.json`/`LICENSE` lidos
> diretamente no GitHub ou do registry do npm. Cada afirmação cita a URL. Onde não
> consegui confirmar, está escrito **não verificado**. Inferências estão marcadas como
> *(inferência)*. **Nada foi instalado**."*

Os cinco elementos obrigatórios de um relatório de pesquisa neste projeto:

| Elemento | Por quê |
|---|---|
| **Método declarado** (fonte de cada fato) | Distingue "li na documentação" de "testei o endpoint" |
| **URL por afirmação** | Permite reverificação quando a versão muda |
| **"não verificado" explícito** | Uma lacuna declarada é melhor que um fato suposto |
| **Data da pesquisa** | Disponibilidade e licença mudam — e mudaram várias vezes nestas avaliações |
| **Veredito + "o que aproveitar exatamente"** | Uma avaliação sem veredito não é avaliação; um veredito sem "o que aproveitar" joga fora conhecimento útil |

**Distinção crítica que o projeto aplica:** *documentado* ≠ *funciona de fato*. No
anexo de fontes de integridade, o método foi explicitamente
*"pesquisa documental + testes ao vivo de endpoints (GET/POST reais) para separar
'documentado' de 'funciona de fato'"* — e isso corrigiu três premissas erradas (§4).

### Sobre "nada foi instalado"

Avaliar sem instalar é uma decisão de método, e tem um custo: o veredito é baseado em
leitura de `LICENSE`, `package.json` e documentação, **não em protótipo**. Quando a
avaliação recomendou adaptar algo, ela indicou **o que exatamente** adaptar, sem
instalar — deixando a decisão de adoção para um momento com necessidade comprovada.

## 2. Critérios aplicados

Cada ferramenta foi julgada contra as restrições reais de `apps/web`, **não por
popularidade**:

1. **Licença compatível com AGPL-3.0-only.** Licença proprietária ou com cláusula
   anticompetitiva/anti-redistribuição está fora, por melhor que seja a ferramenta.
2. **Stack real:** Next.js 15 App Router, React 19, **Tailwind v4 CSS-first** (não
   existe `tailwind.config.js`), tema **dark fixo**, deploy Vercel, **CSP restritiva**.
3. **Sem dependência nova sem necessidade comprovada** — regra explícita do projeto.
4. **Acessibilidade WCAG 2.2 AA é requisito**, incluindo `prefers-reduced-motion`.
5. **Nada pode criar uma segunda autoridade de design system** concorrendo com os
   tokens de `apps/web/src/app/globals.css`.

## 3. Veredito consolidado — 24 ferramentas de UI/UX

Legenda: ✅ instalado · 🟡 referência/adaptar · 🔵 não adotado (documentado) ·
❌ descartado

| Ferramenta | Licença | Veredito | Ação / motivo |
|---|---|---|---|
| **Impeccable** | Apache-2.0 | ✅ **INSTALADO** | Skill + CLI + detector (59 regras). Suporta DSH nativamente. Achou **3 anti-padrões reais** + falhas de contraste. Telemetria desligada em `.impeccable/config.json` |
| **Playwright** | Apache-2.0 | ✅ **INSTALADO** | `@playwright/test` + `@axe-core/playwright`. Sem download de browser (`channel: 'chrome'`) |
| **Emil Kowalski — skills** | MIT | 🟡 **ADAPTAR** | Markdown puro, sem rede, ciente de Tailwind v4. Lacuna que cobre: animação, dados *worst-case*, "feel" nativo mobile. Nada instalado — candidato a vendorizar **4 skills** |
| **Kobra** | Free = *"Personal use only"* | 🟡 **REFERÊNCIA** | O `install.md` é excelente ("Color is information", "tabular-nums", "motion-reduce"), mas a tier grátis **proíbe uso comercial** — incompatível com repo público AGPL. **Ler, não instalar** |
| **ObsidianUI** | MIT | 🟡 **REFERÊNCIA** | Só textura/grid vale; adotar exigiria `components.json` do shadcn, que não temos |
| **Bencho** | MIT (declarado no `llms.txt`) | 🟡 **REFERÊNCIA** | Blocks úteis (floating label, OTP). Licença precisa de confirmação **no browser** antes de vendorizar |
| **loading.daniasyrofi** | MIT | 🟡 **REFERÊNCIA** | 1★, ativo. Um ou dois loaders, se surgir necessidade |
| **FigmaToCode** | GPL-3.0 | 🟡 **REFERÊNCIA** | Plugin do Figma, não é skill nem lib. A saída é Tailwind arbitrário (`bg-[#F8FAFC]`) que **ignora nossos tokens** — nunca colar direto no repo |
| **Motion** | MIT | 🔵 **NÃO ADOTADO** | Único que resolve reduced-motion para JS automaticamente. Não instalado porque **não há animação JS hoje** — seria dependência sem necessidade comprovada. Ver §5 |
| **21st.dev** | Sem licença única; tier pago | ❌ **DESCARTAR** | Instalação exige membership paga + API key (`API_KEY_21ST`) |
| **Aceternity UI** | Customizada, não-SPDX, anti-redistribuição | ❌ **DESCARTAR** | Licença incompatível + assume landing page, não estética editorial |
| **React Bits** | **MIT + Commons Clause** | ❌ **DESCARTAR** | A Commons Clause **proíbe redistribuir** — incompatível com AGPL-3.0-only |
| **Kokonut UI** | MIT | ❌ **DESCARTAR** | Tailwind v4 e React 19 OK, mas o valor está em componentes "shimmery"/glitch — estética oposta à nossa. Arrasta `motion` |
| **Bklit UI** | MIT | ❌ **DESCARTAR** | Traria `@visx/*` + `d3-*` + Motion para um problema que os gráficos atuais resolvem. Fica como referência de dataviz |
| **Componentry** | MIT | ❌ **DESCARTAR** | Tailwind v4 **não verificado**, dependências por item **não verificadas** |
| **GSAP** | **Proprietária (Webflow), não-OSI** | ❌ **DESCARTAR** | Grátis, mas licença proprietária com cláusula anticompetitiva — **incompatível com AGPL-3.0-only**. Ver §5 |
| **Anime.js** | MIT | ❌ **DESCARTAR** | Licença ok, mas v4 declara `three` como peer e não tem integração React; sem caso de uso |
| **Taste Skill** | MIT | ❌ **DESCARTAR** | 89 KB com regras "mandatory" que **contradizem decisões tomadas**: exige dark+light (somos dark fixo), restringe eyebrow (nossa hero exige) e assume Motion/GSAP |
| **UI UX Pro Max** | MIT | ❌ **DESCARTAR** | Gerador de design system **concorrente** com o nosso (novas paletas/fontes/`tailwind.config.js`), exige Python e `${CLAUDE_PLUGIN_ROOT}`, sem alvo para DSH |
| **metal-fx** | MIT | ❌ **DESCARTAR** | Legítimo e ativo, mas estética de campanha, custo WebGL no celular e `prefers-reduced-motion` **não documentado** |
| **Refero** | Proprietária, paga | ❌ **DESCARTAR** | ToS **veda treinar/avaliar modelos** com o conteúdo e proíbe redistribuir. Zero código aproveitável |
| **Replit** | Proprietária, paga | ❌ **DESCARTAR** | Já temos Vercel (deploy), Actions (CI) e Postgres. Levar código AGPL para IDE cloud comercial adiciona risco de governança sem resolver nada |
| **temp.obsidianui.dev** | — | ❌ **DESCARTAR** | Redireciona para o ObsidianUI, já avaliado |

**Placar:** 2 instaladas · 6 de referência · 1 não adotada por decisão · 15 descartadas.

**Para que serve este placar:** ele evita que a avaliação seja refeita. Das 15
descartadas, **7 foram recusadas por licença** — um critério que não muda com o tempo.

## 4. Premissas que a pesquisa corrigiu

O maior valor das pesquisas deste projeto não foi escolher ferramenta: foi **derrubar
crenças erradas**. Três casos, todos com medição ao vivo:

| Premissa anterior | O que a sondagem mostrou | Impacto |
|---|---|---|
| "TCU: `api-publica` exige credenciais (401) — sem endpoint aberto estável" | **`api-publica.tcu.gov.br` não existe** (DNS não resolve). Mas há **API pública aberta, sem autenticação**, em `certidoes.apps.tcu.gov.br`, com exportação CSV de 4 listas oficiais (~48 mil registros no CADIRREG) | A dimensão de **maior peso** do IDIP (Integridade, 25%) é **destravável** |
| "CDN do TSE bloqueada" | **HTTP 200** em `consulta_cand_2026.zip`, `consulta_cand_2022.zip`, `prestacao_de_contas...2022.zip` (548 MB) e `certidao_criminal_2026_BR.zip` (69 MB) | O bloqueio era de **rede/ambiente**, não do TSE |
| "`force-dynamic` desliga todo cache" | Equivale a `fetch({ cache: 'no-store' })`; o **Data Cache continua ativo** e é o que `unstable_cache` usa | Viabiliza a recomendação de cache (R2) sem remover a diretiva |

E uma premissa que **se confirmou**: o STF não tem API consolidada. `portal.stf.jus.br`
→ **403**; certidões históricas → **404**; `certidoes.stf.jus.br` → **405 em todo GET**;
e o **DataJud não cobre o STF** (`api_publica_stf` → **404**). Adicionalmente, o DataJud
**não traz nome de parte** — só metadados de capa e movimentos —, portanto **não permite
identificar um parlamentar**.

**Lição de método:** testar o endpoint ao vivo separou "documentado" de "funciona de
fato" em **três** casos. É o que justifica
[`TASK_BREAKING_DOWN.md`](../03-development-process/TASK_BREAKING_DOWN.md) portão 1.

## 5. Animação: a decisão mais interessante do projeto

Três bibliotecas avaliadas a fundo, com vereditos diferentes e coerentes entre si.

### GSAP — recusado por **licença**, não por qualidade

**Fato que costuma ser mal-entendido:** o GSAP **é grátis hoje**, inclusive todos os
plugins que antes eram pagos (pós-aquisição pela Webflow). O FAQ oficial diz
literalmente *"Can I really use GSAP in commercial projects without paying anything?
Yes, really!"*.

**O problema é outro:** a licença é a *Standard "No Charge" GSAP License* —
**proprietária, não OSI-approved**. Direitos autorais permanecem da Webflow, que pode
alterar os termos retroativamente para versões futuras, e há cláusula de **Prohibited
Uses** (restrição de campo de uso), que o AGPL não tolera bem.

**Nuance honesta:** o nosso caso **não cai** na restrição prática (não somos construtor
visual de animação concorrente do Webflow). **O problema não é o uso, é a
impossibilidade de relicenciar** a dependência junto com um repositório AGPL-3.0-only.

**O que foi aproveitado:** a técnica de `gsap.matchMedia()` com bloco `reduceMotion`
como **padrão de código** — inclusive a ideia de que, com reduced-motion ativo, a
animação deve **"pular para o fim"** (`duration: 0`), preservando o estado final, em
vez de sumir com o elemento.

### Anime.js — tecnicamente a mais limpa, **descartada por falta de necessidade**

**MIT**, modular e tree-shakeable, peer deps **opcionais** (`three` só se importar o
adapter), sem conflito com Tailwind v4, anima por estilo inline (compatível com a CSP).

**Por que não:** o projeto resolve `rise`/`fade`/`aurora` com **keyframes CSS a custo
zero de JS**, e a regra "não adicionar dependência de animação sem necessidade
comprovada" só se satisfaz com um caso concreto — stagger, scroll-linked ou timeline
complexa — **que não existe**.

**Se um dia precisar de animação JS:** Anime.js é a **primeira da fila** a reconsiderar,
justamente por ser MIT.

### Motion (ex-Framer Motion) — a melhor resposta, **não adotada**

É o **único** dos nove avaliados que respeita `prefers-reduced-motion`
**automaticamente, sem código por componente**:

> *"By setting `reducedMotion` to `"user"`, all `motion` components will automatically
> disable transform and layout animations, while preserving the animation of other
> values like `opacity` and `backgroundColor`."*

Isso cobriria **exatamente** a lacuna real do projeto: a regra CSS global de
`prefers-reduced-motion` **não alcança** Web Animations API nem `requestAnimationFrame`
(ver [`MEMORY.md`](MEMORY.md) F-01).

**Por que não hoje:** **não há animação JavaScript no projeto.** Adotar seria
dependência nova sem necessidade comprovada — a regra do projeto. Como o gatilho é
lacuna latente (e não defeito ativo), a decisão fica **pendente até a primeira
animação JS**.

**Se adotar, o escopo já foi definido na avaliação:**

1. `MotionConfig reducedMotion="user"` + `useReducedMotion` no root — **este é o único
   motivo forte** para instalar algo.
2. No máximo **1–2 interações nomeadas** onde JS é genuinamente necessário.
3. Importar via `motion/react-client` e considerar `m` + `LazyMotion` em vez de
   `<motion>` (34 kb → ~4,6 kb).
4. **Não** usar para o que `rise`/`fade`/`aurora` já fazem.
5. **Pinar a versão exata** (o major 14 é recente e troca a versão interna de
   `framer-motion`).

### A decisão consolidada

| | Hoje | Gatilho para mudar |
|---|---|---|
| Animação | CSS puro (3 keyframes) | — |
| Reduced-motion em CSS | ✅ global em `globals.css` | — |
| Reduced-motion em JS | ❌ **lacuna sem mitigação** | Antes da **primeira** animação JS: escolher entre `matchMedia` à mão ou Motion |

Registrado como T-13.

## 6. Gráficos e visualização de dados

**Situação:** `apps/web/package.json` **não declara nenhuma biblioteca de gráficos**.
Os componentes existentes (`TimelineChart`, `PartyMembersChart`,
`PartyPerformanceChart`, `PatrimonyChart`) são implementados no projeto.

**Bklit UI** foi a única galeria avaliada cujo domínio coincide com o do produto
(visualização de dados cívicos), com licença MIT e tokens em CSS vars compatíveis com
Tailwind v4. **Descartada** porque o custo por gráfico é alto: arrasta `@visx/*`,
`d3-*`, `motion`, `@number-flow/react`, `@base-ui/react`.

**Veredito registrado:** *"ADAPTAR se e somente se um gráfico específico for requisito
de produto"* — os candidatos naturais sendo **sankey** (fluxo de dinheiro de campanha)
e **heatmap** (densidade de votações). Hoje: **apenas referência de dataviz** (eixos,
grid, reference-area para faixas de threshold, projection-line, brush, legend, tooltip
tipado).

**Ponto de arquitetura aproveitável:** o registry do Bklit entrega `cssVars` dark em
`oklch()` — exatamente o formato do Tailwind v4 CSS-first — como modelo para
publicarmos nossos próprios tokens.

## 7. Avaliação de plataforma, banco e custo

De [`AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md).
Resumo dos vereditos; o detalhamento tem medição em cada item.

| Alternativa | Veredito | Motivo principal |
|---|---|---|
| **Railway** | ❌ | **Nenhuma região de compute no Brasil** — o "Olá, São Paulo" do changelog é **CDN, não compute**. PgBouncer desligado por padrão. **Alto risco LGPD** (banco fora do Brasil) |
| **Cloudflare Hyperdrive + Postgres** | ❌ **inviável nesta arquitetura** | A connection string *"only accessible from your Worker"* → **não funciona na Vercel**. Free limita a 100 mil statements/dia → inviável para o ETL |
| **Turso / libSQL** | ❌ | Não é PostgreSQL — troca de dialeto, reescreve schema, perde enums e recursos do Postgres |
| **Vercel Pro** | ⏸ **não como primeira resposta** | O cache resolve o egress antes e de graça |
| **Supabase Pro (US$ 25)** | ⏸ **no gatilho de egress** | Decisão registrada com condição de disparo |
| **Melhor Auth** | ⏸ avaliar enquanto a base é 0 usuários | — |
| **UptimeRobot** | ✅ script existe | Monitor de uptime |
| **Sentry free** | ✅ **código pronto, dormente** | Falta só o DSN |
| **Resend free** (e-mail) | 🟡 recomendado, **não implementado** | 3.000/mês, teto 100/dia, região São Paulo. **Não ativar sem rate limit compartilhado** — derruba a recuperação de senha de todos |
| **Upstash** (rate limit) | 🟡 recomendado, **não implementado** | Estado compartilhado para o token bucket por IP |
| **Migrar NextAuth v4 → v5** | 🚫 **não fazer** | Beta de projeto absorvido; a versão atual está segura |

**A conclusão que economizou mais dinheiro:** *"Nenhuma alternativa verificada entrega
**região em São Paulo + backup + zero operação** por menos [que o Supabase]."* Migrar
custaria 1–3 dias e risco, e o ganho estava em **região + cache**, não em trocar de
fornecedor.

## 8. Ferramentas de desenvolvimento: o que foi adotado

| Ferramenta | Licença | Estado | Critério decisivo |
|---|---|---|---|
| **Playwright** | Apache-2.0 | ✅ instalado | O projeto tinha `curl` (smoke) e verificadores de matemática, mas **nenhum teste que renderizasse uma página** — sem cobertura justamente na camada onde o TypeScript não vê (contraste, semântica, rótulos, estados do Termômetro) |
| **axe-core** (`@axe-core/playwright`) | MPL-2.0 | ✅ instalado | Exigido pelo requisito WCAG 2.2 AA declarado em `AGENTS.md`, que **não tinha nenhum gate automatizado** |
| **Impeccable** | Apache-2.0 | ✅ instalado | Detector determinístico, suporta DSH, telemetria desligável |
| **Vitest** | MIT | ❌ **recomendado, não instalado** | Ver §9 |
| **Motion** | MIT | 🔵 decidido, não adotado | Ver §5 |
| **GSAP / Anime.js** | Proprietária / MIT | ❌ descartados | Ver §5 |

**Sobre o eixo escolhido no Playwright:** a avaliação registra explicitamente que o
eixo de maior valor é a **auditoria de acessibilidade com `wcag22aa`**, **não** a
regressão visual — porque o baseline visual é por plataforma e já era coberto por
`.design-review/capture.cjs`. Escolher o eixo certo evitou construir uma suíte de
snapshot que daria falso negativo em toda máquina diferente.

## 9. O que está recomendado e **não** foi implementado

Itens com recomendação explícita no repositório e situação verificada:

| Item | Recomendação | Situação |
|---|---|---|
| **Vitest** nos motores e nas rotas de API | CI já existe, leva ~1 min | ❌ T-04 |
| **Cache de dados** (`unstable_cache` + `revalidateTag`) | R2, US$ 0 | ❌ T-10 |
| **Backup** `pg_dump` cifrado + **teste de restauração** | R4 | ❌ T-03 |
| **Probe real das fontes** em `/status` | R12 | ❌ T-05 |
| **Resend + verificação de e-mail + Upstash** | R8, no mesmo ciclo | ❌ |
| **Sentry DSN** | R9, US$ 0 | ❌ T-08 |
| **Logar a causa real** nos `catch {}` | *"Logar a causa real no servidor (agora invisível sem Sentry) e devolver status correto"* | ❌ T-07 |
| **`error.tsx` de segmento** | *"Um erro em uma rota derruba a página inteira"* | ❌ T-06 |
| **Restringir a matcher do middleware** | Reduz CPU no Edge (Hobby: 50 ms médios) | ❌ |
| **`pg_trgm`/`tsvector`** | Útil para volume futuro — **não** é prioridade (a busca não é problema de índice) | ❌ |
| **Elevar `pool_size`** para ~40 | Paliativo gratuito; a correção estrutural já foi aplicada | ❌ |
| **Andar o resultado eleitoral de 2026** | Decisão de produto | ❌ |

## 10. O que **não** fazer — lista de proibições consolidada

Do §11 da avaliação de alternativas e das avaliações de ferramentas:

- **Não migrar NextAuth v4 → v5.**
- **Não trocar de plataforma** para resolver latência: o ganho vem de região + cache.
- **Não usar Vercel Pro como primeira resposta ao egress**: o cache resolve antes e de
  graça.
- **Não indexar a busca como prioridade** — o `Seq Scan` leva 0,5 ms; o custo é rede.
- **Não armazenar CPF** nem publicar dumps em repositório público.
- **Não aplicar trava de integridade sem trânsito em julgado** — viola a presunção de
  inocência da metodologia.
- **Não ativar e-mail transacional sem rate limit compartilhado** — derruba a
  recuperação de senha de todos.
- **Não instalar** ferramenta com licença não-OSI ou com cláusula
  anti-redistribuição num repositório AGPL-3.0-only.
- **Não instalar dependência de animação** sem caso de uso concreto.
- **Não copiar componente de registry** sem ler a licença do autor original — o
  agregador não tem licença única.
- **Não instalar componentes em CI/build**: *"a CI job that fetches them at build time
  gives up the review and adds a network dependency to your deploy."*

## 11. Não verificado

- **Nada das avaliações foi reproduzido** durante a escrita deste documento. Os
  vereditos são os registrados nos relatórios originais, com as datas deles
  (a avaliação de animação é de outubro/2026; a de plataforma, de 12/10/2026).
- **Licenças mudam.** As afirmações de licença foram verificadas na data da pesquisa.
  Antes de adotar qualquer ferramenta hoje, **reverifique a licença no registry/repo**.
- **Versões mudam.** Números de versão (GSAP 3.15.0, Anime 4.5.0, Motion 14.1.0,
  Kokonut com `motion ^12.23.25`) são os lidos na data da pesquisa.
- **Estrelas e atividade de repositório** (49.007★ do React Bits, 474★ do ObsidianUI,
  datas de push) são fotografia de um momento.
- Se as **ferramentas de referência** (Emil Kowalski, Kobra, ObsidianUI, Bencho,
  loading.daniasyrofi, FigmaToCode) foram revisitadas desde a avaliação.
- Se algum componente específico de **Kokonut UI** (o helper `cn` com `clsx` +
  `tailwind-merge` foi apontado como o item mais útil) já existe no projeto — **não
  verificado**.
