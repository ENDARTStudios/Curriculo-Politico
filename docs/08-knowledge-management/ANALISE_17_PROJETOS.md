# Análise de 17 Projetos Open Source — Aplicação no Currículo Político

> Análise de aplicação prática de cada projeto no contexto atual do Currículo
> Político (produção em curriculopolitico.org, 598 parlamentares, IDIP v1.1,
> 27+ rotas, bloqueios de fonte TCU/STF/TSE-CDN/QD documentados).

---

## TIER 1 — Implementação Imediata (impacto direto nos bloqueios atuais)

---

### 1. browser-use/jev-ultrafast

**O que é:** Automação de browser ultra-rápida (MIT) com técnicas de percepção
de página e execução de ações otimizadas. Foco em velocidade de navegação
headless e extração de conteúdo.

**Aplicação no projeto — DESBLOQUEIO DE FONTES:**

O maior gargalo de dados hoje é que **TCU (401), STF (403), TSE CDN (403
intermitente) e Querido Diário (503)** bloqueiam requisições HTTP diretas. O
jev-ultrafast opera um browser real headless que passa por WAFs como Akamai
porque executa JavaScript, carrega cookies de sessão e apresenta fingerprint
de browser legítimo.

**Implementação concreta:**
- Substituir `requests.get()` nos ETLs bloqueados (`tse_candidatos.py`,
  `tse_receitas.py`, `tse_bens.py`) por sessões browser-use
- O ETL `etl/tse_patrimony_history.py` usaria o browser para navegar até o
  CDN, esperar o challenge Akamai resolver, e baixar o ZIP
- Para o TCU: navegar até o portal de inidôneos, extrair a lista de contas
  rejeitadas que hoje retorna 401 na API

**Esforço:** Baixo — os ETLs já têm a lógica de parse; só troca o transporte.

**Prioridade:** 🔴 Máxima — destrava CEAP real, patrimônio e ficha criminal.

---

### 2. usestrix/strix

**O que é:** Agente autônomo de segurança que simula um hacker real — executa
código dinamicamente, encontra vulnerabilidades e valida com proof-of-concept.
Publica achados com exploit reprodutível.

**Aplicação no projeto — OWASP AUTOMATIZADO:**

O checklist pré-lançamento exige OWASP Top 10. O Strix executa isso
automaticamente contra `curriculopolitico.org`:
- Testa multi-tenant authorization (crítico: NextAuth + curriculo_app role)
- Valida se o rate limiting do middleware realmente protege
- Testa SQL injection nas rotas Prisma (mitigado, mas valida)
- Verifica se os headers CSP/X-Frame-Options realmente protegem

**Implementação concreta:**
```bash
pip install strix-agent
strix --target https://curriculopolitico.org --full-audit
```
Integrar ao CI como job manual (`workflow_dispatch`) para não rodar em cada
push.

**Esforço:** Baixo — ferramenta pronta, só apontar.

**Prioridade:** 🔴 Alta — checklist de segurança do lançamento.

---

### 3. github/spec-kit

**O que é:** Toolkit de Spec-Driven Development (SDD) do GitHub. Inverte o
fluxo: escreve a especificação primeiro, gera plano, quebra em tarefas, e
implementa com agentes AI. Comandos `/specify`, `/plan`, `/tasks`,
`/implement`.

**Aplicação no projeto — METODOLOGIA COMO FONTE DE VERDADE:**

O IDIP v1.1 tem regras complexas distribuídas em 4 lugares:
1. `SCORING_METHODOLOGY.md` (documentação)
2. `src/lib/scoring.ts` (código)
3. `scripts/verify-scoring.ts` (testes)
4. `/metodologia` (UI pública)

O spec-kit garante que a spec é a fonte única e o código/tests/UI derivam
dela. Cada mudança de peso, trava ou fórmula de confiança começa com um
`/specify`, valida o impacto, e só depois implementa.

**Implementação concreta:**
```bash
uv tool install specify-cli --from github://github/spec-kit
specify init  # cria .specify/ no repo
# .specify/idip-formula.md → fonte de verdade
# /implement gera scoring.ts + verify-scoring.ts + página /metodologia
```

**Esforço:** Médio — requer disciplina de processo, não código.

**Prioridade:** 🟡 Média — o projeto já tem 12 commits de regras espalhadas.

---

### 4. typesafe.ai (TypeSafe AI — Jev API)

**O que é:** API de classificação/scoring com outputs estruturados
calibrados (0.0–1.0). Integra com Pydantic V2 para validação type-safe.

**Aplicação no projeto — SUBSTITUIR TEMPLATES POR CLASSIFICAÇÃO REAL:**

Os 8.262 resumos de proposições hoje usam templates por categoria (gerados
em `generate-bill-summaries.ts`). A TypeSafe AI Jev classificaria cada
proposição em temas reais com probabilidade calibrada:
- Input: ementa + texto da proposição
- Output: `{tema: "saude", confianca: 0.94}`, `{tema: "previdencia", confianca: 0.71}`
- Substitui o keyword matching de `tag-bills.ts` por classificação semântica

**Implementação concreta:**
- Adicionar `typesafe-ai` como dependência
- Criar `scripts/classify-bills-ai.ts` que usa a API Jev com Pydantic schema
- Atualizar `Bill.tags` com os temas classificados + confiança
- Rotular na UI: "Classificação por IA (confiança 94%)" vs. template atual

**Esforço:** Médio — requer conta TypeSafe AI e refactoring do pipeline de tags.

**Prioridade:** 🟡 Média — melhora qualidade do Filtro de Afinidade.

---

### 5. anthropics/skills

**O que é:** Formato de Skills para agentes AI (SKILL.md com metadata +
instruções + scripts). Adotado por Claude Code, GitHub Copilot e outros.
Cada skill ensina o agente a executar uma classe de tarefas.

**Aplicação no projeto — EMPACOTAR CONHECIMENTO DO DOMÍNIO:**

O Currículo Político tem conhecimento único que um agente AI precisa para
contribuir:
- Como rodar o pipeline de dados (ordem importa!)
- Regras do IDIP (pesos, travas, neutralidade)
- Armadilhas das APIs (Câmara, Senado, TSE — documentadas na memória)
- Regras LGPD e linguagem jurídica estrita
- Convenções do código (dark theme, pooler URLs, portas locais)

**Implementação concreta:**
```
.claude/skills/
├── curriculo-data-pipeline/
│   └── SKILL.md      # Ordem dos loads, armadilhas de API
├── curriculo-idip/
│   └── SKILL.md      # Pesos v1.1, travas, fórmula de confiança
├── curriculo-juridico/
│   └── SKILL.md      # LGPD, linguagem estrita, LGPD Art. 7º/11
└── curriculo-infra/
    └── SKILL.md      # Vercel, Supabase, portas, GITHUB_TOKEN fix
```

Qualquer contribuidor com Claude Code (ou Copilot) herda o contexto completo
do projeto ao clonar o repo.

**Esforço:** Baixo — só escrever SKILL.md files.

**Prioridade:** 🟡 Média — acelera onboarding de contribuidores.

---

## TIER 2 — Curto Prazo (infraestrutura e qualidade)

---

### 6. trailhq/Graft

**O que é:** MCP server de inteligência de código — indexa codebase em grafo
semântico e permite busca por natural language, impacto de mudanças, e
navegação estrutural. **Já ativo nesta sessão** (tools `graft_*`).

**Aplicação no projeto — NAVEGAÇÃO DO CÓDIGO CRESCENTE:**

Com 35 rotas, 17 scripts, 19 componentes e 4 migrations, o projeto já se
beneficia do Graft para:
- `graft_find_code("recalculate-scores cost dimension")` → encontra sem grep
- `graft_trace_calls("calculateIDIP")` → blast radius de mudanças na fórmula
- `graft_check_freshness()` → detecta drift entre graph e código

**Implementação:** Já implementado — o `.graft/` está no repo (adicionar ao
`.gitignore` se não estiver). Configurar como MCP server permanente no
`.claude/settings.json` para que todos os contribuidores tenham acesso.

**Esforço:** Zero (já está funcionando).

**Prioridade:** ✅ Implementado — usar ativamente.

---

### 7. DeusData/codebase-memory-mcp

**O que é:** MCP server que indexa codebase em knowledge graph persistente,
com busca em milissegundos. Complementa o Graft com memória persistente
entre sessões.

**Aplicação no projeto — MEMÓRIA ENTRE SESSÕES:**

Complementa o Graft (que é busca estrutural) com memória semântica: o que
cada função faz, por que foi implementada assim, e qual a relação com a
metodologia IDIP. Útil quando o projeto tem múltiplos contribuidores.

**Implementação:**
```json
// .claude/settings.json
{
  "mcpServers": {
    "codebase-memory": {
      "command": "npx",
      "args": ["-y", "@deusdata/codebase-memory-mcp"],
      "env": { "CODEBASE_PATH": "." }
    }
  }
}
```

**Esforço:** Baixo — configurar MCP server.

**Prioridade:** 🟡 Quando houver múltiplos contribuidores.

---

### 8. ollama/ollama

**O que é:** Runtime local para LLMs (MIT, 162k stars). Executa Llama 3.x,
Mistral, Qwen etc. localmente com API OpenAI-compatible. Zero custo de
inference, dados nunca saem da máquina.

**Aplicação no projeto — SUBSTITUIR TEMPLATES E TYPESAFE POR IA LOCAL:**

- **Resumos de proposições:** em vez de templates por categoria ou TypeSafe
  AI (que custa), rodar um Llama 3.2 3B local via Ollama para gerar resumos
  reais de cada proposição usando a ementa como input
- **Classificação de tags:** substituir keyword matching por classificação
  semântica local
- **Análise de sentimento em votações:** detectar padrões sem expor dados

**Implementação concreta:**
```bash
ollama pull llama3.2:3b
# scripts/summarize-ollama.ts
# POST http://localhost:11434/api/generate com prompt de resumo
```

**Esforço:** Médio — requer GPU local e script de integração.

**Prioridade:** 🟢 Quando houver GPU disponível.

---

### 9. langflow-ai/langflow

**O que é:** Builder visual de workflows LLM/multi-agent (50k+ stars). Canvas
drag-and-drop com componentes conectáveis. Exporta APIs instantâneas.

**Aplicação no projeto — PIPELINE DE DADOS VISUAL:**

O pipeline de dados do Currículo Político (crawl → parse → tag → load →
recalculate) tem 17 passos com dependências. Um flow no Langflow poderia:
- Visualizar o pipeline como grafo
- Conectar Câmara API → tagger → Supabase em nós visuais
- Adicionar nós de LLM (Ollama local) para classificação no meio do fluxo
- Exportar como API para o cron mensal chamar

**Esforço:** Alto — migrar scripts existentes para componentes Langflow.

**Prioridade:** ⚪ Fase futura — os scripts Python já funcionam; Langflow
seria refactoring visual, não ganho funcional.

---

### 10. all-hands-ai/openhands

**O que é:** Plataforma de agente AI desenvolvedor de software (86k stars).
Agentes autônomos escrevem código, rodam comandos, navegam web e abrem PRs.

**Aplicação no projeto — AUTOMAÇÃO DE TAREFAS REPETITIVAS:**

- Re-executar ETLs quando fontes abrirem (agente monitora e roda)
- Corrigir os 22 MEDIUM de identidade (agente pesquisa cada caso)
- Manter dependências atualizadas (background agent abre PRs)

**Esforço:** Alto — requer setup do OpenHands + config de modelo.

**Prioridade:** ⚪ Fase futura — melhor para quando o projeto tiver
múltiplos repositórios ou demanda de manutenção contínua.

---

## TIER 3 — Referência e Descoberta (não implementação direta)

---

### 11. ripienaar/free-for-dev

**O que é:** Lista curada de serviços gratuitos para desenvolvedores (DNS,
CI/CD, monitoring, emails, etc).

**Aplicação:** O projeto já usa o tier grátis de Vercel, Supabase, Cloudflare,
Sentry e UptimeRobot. Esta lista pode revelar serviços adicionais gratuitos
que o projeto ainda não usa (ex: Better Stack para uptime, Resend para
emails transacionais, Supabase Storage para arquivos).

**Ação:** Consultar como referência ao buscar novos serviços. Não é
implementação.

---

### 12. public-apis/public-apis

**O que é:** Lista massiva de APIs públicas organizadas por categoria.

**Aplicação:** Encontrar APIs brasileiras que o projeto ainda não integrou:
- Portal da Transparência (já documentado como pendente)
- TCE-SP, TCE-MG (dados de contas estaduais)
- DataJud/CNJ (processos judiciais)
- IBGE (indicadores sociais para o pilar "Impacto Social")
- Portal de Compras Públicas

**Ação:** Consultar para descobrir fontes alternativas às bloqueadas.

---

### 13. sindresorhus/awesome

**O que é:** Meta-lista de listas curadas — o padrão-ouro para descobrir
projetos de qualidade em qualquer categoria.

**Ação:** Usar como ponto de partida para encontrar ferramentas específicas
(ex: awesome-brasil para fontes brasileiras, awesome-gov para govtech).

---

### 14. punkpeye/awesome-mcp-servers

**O que é:** Lista curada de MCP servers da comunidade.

**Aplicação:** Encontrar MCP servers que possam ser adicionados ao
`.claude/settings.json` do projeto:
- Servidores de database (Postgres MCP)
- Servidores de web scraping
- Servidores de documentação (MDN, etc.)

**Ação:** Consultar quando precisar de nova capacidade de agente.

---

### 15. shubhamsaboo/awesome-llm-apps

**O que é:** Coleção de exemplos de apps LLM com código (RAG, agents,
multi-modal).

**Aplicação:** Referência de padrões para:
- Sumarização de proposições com Ollama local
- RAG sobre a legislação brasileira
- Agente que responde perguntas sobre parlamentares

**Ação:** Consultar ao implementar features de IA.

---

### 16. every-app/open-seo

**O que é:** Buscas não retornaram resultados relevantes — o repositório
pode ser muito novo, renomeado ou de baixa visibilidade.

**Ação:** Verificar diretamente em `github.com/every-app`. Se for uma
ferramenta de SEO open source, aplicar ao lançamento público do site (meta
tags, sitemap.xml, robots.txt, structured data JSON-LD para os perfis).

**Nota:** O projeto já tem SEO básico via `metadata` exports em cada página.
Ferramentas de SEO audit seriam úteis no checklist pré-lançamento.

---

### 17. bzsasson/screaming-frog-mcp

**O que é:** MCP server que encapsula o CLI do Screaming Frog SEO Spider
(paid, ~$279/ano, free tier 500 URLs) para que agentes AI executem crawls
e auditem SEO programaticamente.

**Aplicação:** Auditoria de SEO das 35+ rotas do site antes do lançamento
(titles, meta descriptions, broken links, structured data). Alternativa
gratuita: usar o middleware para gerar `sitemap.xml` dinâmico + JSON-LD nos
perfis.

**Esforço:** Médio — requer licença Screaming Frog (ou usar tier free).
**Ação:** O middleware já adiciona headers; adicionar `sitemap.xml` via
`app/sitemap.ts` nativo do Next.js seria o primeiro passo sem custo.

---

## Resumo Executivo — Priorização Final

| # | Projeto | Ação | Impacto | Esforço | Quando |
|---|---|---|---|---|---|
| 1 | jev-ultrafast | ETLs com browser real | 🔴 Destrava 4 fontes | Baixo | **Imediato** |
| 2 | strix | OWASP automatizado | 🔴 Segurança | Baixo | **Pré-lançamento** |
| 3 | spec-kit | Spec-driven IDIP | 🟡 Qualidade | Médio | Curto prazo |
| 4 | typesafe.ai | Classificar bills com IA | 🟡 Afinidade | Médio | Curto prazo |
| 5 | anthropics/skills | Empacotar conhecimento | 🟡 Onboarding | Baixo | Curto prazo |
| 6 | Graft | Já implementado | ✅ Ativo | Zero | — |
| 7 | codebase-memory-mcp | Memória persistente | 🟡 Colaboração | Baixo | Quando houver equipe |
| 8 | ollama | IA local p/ resumos | 🟢 Custo zero | Médio | Quando houver GPU |
| 9 | langflow | Pipeline visual | ⚪ Refactoring | Alto | Fase futura |
| 10 | openhands | Agente dev autônomo | ⚪ Manutenção | Alto | Fase futura |
| 11–17 | Listas/Referências | Consulta | ℹ️ Referência | — | Conforme necessário |
