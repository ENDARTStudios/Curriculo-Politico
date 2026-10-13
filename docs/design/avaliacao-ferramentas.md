# Avaliação das ferramentas de UI/UX — veredito consolidado

Análise das 24 ferramentas indicadas para o Currículo Político, com veredito e o
que foi de fato **instalado**, **implementado** ou **descartado**. As avaliações
detalhadas de cada frente estão nos relatórios filhos:
[`docs/avaliacao-ferramentas-externas.md`](../avaliacao-ferramentas-externas.md)
(Playwright, galerias, Replit) e
[`docs/design/avaliacao-bibliotecas-animacao.md`](avaliacao-bibliotecas-animacao.md)
(animação e registries de componentes).

## Critérios aplicados

O projeto tem restrições declaradas no `AGENTS.md` e nos `README`. Cada ferramenta
foi julgada contra elas, e não por popularidade:

1. **Licença compatível com AGPL-3.0-only.** Licença proprietária ou com cláusula
   anticompetitiva/anti-redistribuição está fora, por mais boa que seja a
   ferramenta.
2. **Stack real:** Next.js 15 App Router, React 19, **Tailwind v4 CSS-first**
   (não existe `tailwind.config.js`), tema dark fixo, deploy Vercel, CSP restritiva.
3. **Sem dependência nova sem necessidade comprovada** — regra explícita do projeto.
4. **Acessibilidade WCAG 2.2 AA é requisito**, incluindo `prefers-reduced-motion`.
5. **Nada pode criar uma segunda autoridade de design system** concorrendo com os
   tokens de `apps/web/src/app/globals.css`.

## Veredito consolidado

| Ferramenta | Tipo | Licença | Veredito | Ação tomada / motivo |
|---|---|---|---|---|
| **Impeccable** | Skill + CLI + detector (59 regras) | Apache-2.0 | ✅ **INSTALADO** | `npx impeccable install --providers=dsh`. Suporta DSH nativamente. Rodou no código e achou **3 anti-padrões reais** + falhas de contraste. Telemetria desligada em `.impeccable/config.json`. |
| **Playwright** | Test runner + browser | Apache-2.0 | ✅ **INSTALADO** | `@playwright/test` + `@axe-core/playwright`. **30 testes passando.** Custo: sem download de browser (usa `channel: 'chrome'`). |
| **Emil Kowalski — skills** | 15 Agent Skills | MIT | 🟡 **ADAPTAR** | Markdown puro, sem rede, ciente de Tailwind v4. Lacuna real: animação, dados *worst-case*, "feel" nativo mobile. Nada instalado automaticamente — candidato a vendorizar 4 skills. |
| **Kobra** (`kobra.systems`) | Regras de estilo p/ agentes | Free = **"Personal use only"** | 🟡 **REFERÊNCIA** | O `install.md` é excelente ("Color is information", "tabular-nums", "motion-reduce"), mas a tier grátis **proíbe uso comercial** — incompatível com repo público AGPL. Ler, não instalar. |
| **ObsidianUI** | Registry shadcn | MIT | 🟡 **REFERÊNCIA** | Ativo (474★, push 2026-10-12). Só textura/grid vale; adotar exigiria `components.json` do shadcn que não temos. |
| **Bencho** | Blocos React copiáveis | MIT (declarado no `llms.txt`) | 🟡 **REFERÊNCIA** | Blocks úteis (floating label, OTP). Licença precisa de confirmação no browser antes de vendorizar. |
| **loading.daniasyrofi** | Loaders copy-paste | MIT | 🟡 **REFERÊNCIA** | 1★, ativo. Um ou dois loaders, se surgir necessidade. |
| **FigmaToCode** | Plugin do Figma | GPL-3.0 | 🟡 **REFERÊNCIA** | Não é skill nem lib — roda no Figma, `permissions: []`. Saída é Tailwind arbitrário (`bg-[#F8FAFC]`) que **ignora nossos tokens**; nunca colar direto no repo. |
| **Motion** | Lib React de animação | MIT | 🔵 **NÃO ADOTADO (documentado)** | O único que resolve reduced-motion para JS automaticamente. Não instalamos porque **não há animação JS no projeto hoje** — seria dependência sem necessidade comprovada. Decisão registrada no relatório de animação. |
| **21st.dev** | Marketplace shadcn | Sem licença única; tier pago | ❌ **DESCARTAR** | Instalação exige membership paga + API key. |
| **Aceternity UI** | Registry copy-paste | Customizada, não-SPDX, anti-redistribuição | ❌ **DESCARTAR** | Licença incompatível + assume React 18 + efeitos de campanha, não institucional. |
| **React Bits** | Registry de efeitos | **MIT + Commons Clause** | ❌ **DESCARTAR** | A Commons Clause **proíbe redistribuir** — incompatível com AGPL-3.0-only. |
| **Kokonut UI** | Registry shadcn | MIT | ❌ **DESCARTAR** | Tailwind v4 e React 19 OK, mas o valor está em componentes "shimmery"/glitch, estética oposta à nossa. |
| **Bklit UI** | Registry de charts | MIT | ❌ **DESCARTAR** | Traria `@visx/*` + `d3-*` + Motion para um problema que os gráficos atuais já resolvem. Fica como referência de dataviz. |
| **Componentry** | Registry shadcn + MCP | MIT | ❌ **DESCARTAR** | Tailwind v4 não verificado, dependências por item não verificadas. |
| **GSAP** | Lib de animação | **Proprietária Webflow (não-OSI)** | ❌ **DESCARTAR** | Grátis desde a Webflow (inclusive os plugins antes pagos), mas licença proprietária com cláusula anticompetitiva — **incompatível com AGPL-3.0-only**. |
| **Anime.js** | Lib de animação | MIT | ❌ **DESCARTAR** | Licença ok, mas v4 declara `three` como peer e não tem integração React; sem caso de uso. |
| **Taste Skill** | Agent Skills | MIT | ❌ **DESCARTAR** | 89 KB num único arquivo com regras "mandatory" que **contradizem decisões tomadas**: exige dark+light (somos dark fixo), restringe eyebrow (nossa hero exige) e assume Motion/GSAP. |
| **UI UX Pro Max** | Skill + Python (22 MB) | MIT | ❌ **DESCARTAR** | Gerador de design system **concorrente** com o nosso (novas paletas/fontes/`tailwind.config.js`), exige Python e `${CLAUDE_PLUGIN_ROOT}`, sem alvo para DSH. |
| **metal-fx** (`metal.jakubantalik.com`) | Pacote npm WebGL | MIT | ❌ **DESCARTAR** | Legítimo e ativo, mas estética de campanha, custo WebGL no celular e `prefers-reduced-motion` não documentado. |
| **Refero** | Biblioteca de screenshots | Proprietária, paga | ❌ **DESCARTAR** | ToS **veda treinar/avaliar modelos** com o conteúdo e proíbe redistribuir. Zero código aproveitável. |
| **Replit** | Plataforma cloud | Proprietária, paga | ❌ **DESCARTAR** | Já temos Vercel (deploy), Actions (CI) e Postgres. Levar código AGPL para IDE cloud comercial adiciona risco de governança sem resolver nada. |
| **temp.obsidianui.dev** | (redireciona para ObsidianUI) | — | ❌ **DESCARTAR** | Domínio temporário; o projeto real é o ObsidianUI, avaliado acima. |

## O que foi efetivamente implementado

### Instalado

- **Impeccable** (Apache-2.0) em `.dsh/skills/impeccable/` + engine por plataforma.
  Comandos `/impeccable <cmd>`, e o detector `npx impeccable detect <alvo>`.
- **Playwright + axe-core** como devDependencies de `apps/web`.
- O engine do Impeccable (~20 MB) e os relatórios do Playwright ficaram no
  `.gitignore` — são reproduzíveis e específicos de SO.

### Bugs reais encontrados e corrigidos

O detector e o axe encontraram defeitos que estavam em produção:

| Defeito | Medida | Correção |
|---|---|---|
| `text-slate-500` para texto | **4,23:1** (reprova AA) em **167 lugares / 40 arquivos** | Substituído por `text-slate-400` (7,66:1) |
| `text-slate-600` para texto | **2,65:1** em 8 lugares | Substituído por `text-slate-400` |
| CTA do hero: branco sobre `sky-500` | **2,71:1** | Passou a `text-slate-950` sobre `sky-500` = **7,45:1** |
| Placeholder da busca | 4,2:1 | `placeholder-slate-400` |
| Links de texto só por cor (WCAG 1.4.1) | 1,2:1 contra o texto ao redor, em **44 links / 24 arquivos** | Sublinhado permanente por contexto em `p/li/td` |
| `<pre>` rolável sem acesso por teclado (mobile) | WCAG 2.1.1 | `tabIndex={0}` + `role="region"` + rótulo |
| `border-l-4` / `border-t-4` ("side-tab") | tell de UI gerada por IA | Substituído por borda normal e ponto colorido com a semântica |
| Linhas de texto ~102 caracteres | WCAG de legibilidade | `max-w-[65ch]` nos parágrafos de apoio |

### Verificação final

- `npm run typecheck` → **limpo**
- `npm run e2e` → **30/30 passando** (desktop + mobile), incluindo
  **WCAG 2.2 AA sem violações** na home, no ranking e na metodologia
- `npx impeccable detect apps/web/src` → **exit 0, limpo**
- `npm run verify:scoring` → 27 casos + a sincronia UI↔motor (WEB-001)

### O que a suíte não cobre (honestidade)

Teste automatizado detecta uma minoria dos problemas de acessibilidade e **não
alcança regiões ocultas** (modais, menus fechados). Ele é um piso, não uma
certificação. Também **não há teste que faça deploy** — a suíte contra produção
só passa depois que este trabalho for publicado.
