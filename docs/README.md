# Documentação — Currículo Político

Índice da documentação técnica e de produto do repositório. O que está aqui é
**derivado do código**; quando um documento e o código divergirem, o código é a
fonte da verdade e o documento deve ser corrigido.

Produção: https://www.curriculopolitico.org

## Estrutura

```
docs/
├── README.md                       (este índice)
├── 01-product-discovery/           Problema, usuário, PRD, termos legais, sustentação
├── 02-architecture-design/         Arquitetura, decisões, dados, IDIP e IDIP-STF, design
├── 03-development-process/         Setup, regras, tarefas, fluxo de desenvolvimento
├── 04-api-integrations/            API, conteúdo e integrações
├── 05-security-compliance/         RIPD, LGPD, ameaças, incidentes, identidade e acessos
├── 06-devops-deployment/           CI/CD, deploy, backup/DR, QA, code review, FinOps
├── 07-operations-marketing/        SEO, acessibilidade, analytics, operação
├── 08-knowledge-management/        Memória, pesquisa, políticas de conhecimento
├── design/                         Camada de UI/UX: estratégia, briefs de subagente, avaliações
└── ops/                            Anexos operacionais (observabilidade, fontes de integridade)
```

> As áreas **03, 04, 07 e 08** não são detalhadas neste índice por decisão de
> escopo: foram produzidas em outra frente. Consulte os arquivos diretamente.


## 01 — Product Discovery

| Documento | Conteúdo |
|---|---|
| [DEFINE_THE_USER.md](01-product-discovery/DEFINE_THE_USER.md) | Quem usa a plataforma, quem é afetado por ela e como cada público importa para a decisão. |
| [PRD.md](01-product-discovery/PRD.md) | O produto que **existe hoje** (rotas e funcionalidades reais) e o que está planejado. |
| [LEGAL_TERMS.md](01-product-discovery/LEGAL_TERMS.md) | Vocabulário jurídico obrigatório, presunção de inocência e o que nunca pode ser escrito. |
| [PRICING_MONETIZATION.md](01-product-discovery/PRICING_MONETIZATION.md) | Custo de infraestrutura, ausência de plano comercial e modelo de sustentação real (`/apoie`). |
| [ROADMAP.md](01-product-discovery/ROADMAP.md) | Lacunas reais do repositório, ordenadas por dependência. Sem prazos inventados. |

## 02 — Architecture & Design

| Documento | Conteúdo |
|---|---|
| [ARCHITECTURE.md](02-architecture-design/ARCHITECTURE.md) | Visão de componentes, fluxo de dados, deployment e observabilidade. |
| [CHOOSE_TECH_STACK.md](02-architecture-design/CHOOSE_TECH_STACK.md) | Cada dependência com a versão resolvida em `package-lock.json` e por que está no projeto. |
| [ADR.md](02-architecture-design/ADR.md) | Decisões de arquitetura já tomadas, no formato Contexto/Decisão/Consequências. |
| [DATA_MODEL.md](02-architecture-design/DATA_MODEL.md) | Os models reais de `apps/web/prisma/schema.prisma`, com relacionamentos e índices. |
| [UML.md](02-architecture-design/UML.md) | Diagramas Mermaid: entidades, sequência do cálculo do IDIP e fluxo de ETL. |
| [SCORING_METHODOLOGY.md](02-architecture-design/SCORING_METHODOLOGY.md) | IDIP: pesos (§2), travas (§4) e regra de ranking (§5). **Referenciado pelo código.** |
| [STF_SCORING.md](02-architecture-design/STF_SCORING.md) | IDIP-STF: pesos próprios do Judiciário, com a mesma numeração de seções. |
| [DESIGN.md](02-architecture-design/DESIGN.md) | Ponte para as skills de design e para `docs/design/` — tokens, funil, revisão. |
| [STYLE_GUIDE.md](02-architecture-design/STYLE_GUIDE.md) | Convenções de código, nomes, testes e commits verificáveis no repositório. |
| [GREEN_COMPUTING.md](02-architecture-design/GREEN_COMPUTING.md) | O que este projeto realmente faz para reduzir custo computacional — e o que não faz. |

## 05 — Segurança e Compliance

| Documento | Conteúdo |
|---|---|
| [RIPD.md](05-security-compliance/RIPD.md) | Relatório de Impacto à Proteção de Dados Pessoais (v1.1). |
| [COMPLIANCE.md](05-security-compliance/COMPLIANCE.md) | LGPD por operação (bases legais, direitos, retenção), subprocessadores e linguagem jurídica estrita. |
| [THREAT_MODELING.md](05-security-compliance/THREAT_MODELING.md) | STRIDE sobre os ativos reais (dados de políticos, contas, votos, credenciais, canal de retificação). |
| [SECURITY_REVIEW.md](05-security-compliance/SECURITY_REVIEW.md) | Revisão de código: achados com severidade, evidência e linha, e o que foi verificado sem achado. |
| [INCIDENT_RESPONSE.md](05-security-compliance/INCIDENT_RESPONSE.md) | Severidades, papéis, rotação de credenciais Supabase/Vercel/NextAuth e comunicação LGPD Art. 48. |
| [VULNERABILITY_DISCLOSURE.md](05-security-compliance/VULNERABILITY_DISCLOSURE.md) | Política proposta de divulgação responsável — **canal ainda não publicado**. |
| [IAM_IGA.md](05-security-compliance/IAM_IGA.md) | Identidades, ciclo de vida da conta, força real dos fatores e governança de segredos. |
| [SUPERFICIE_AGENTE.md](05-security-compliance/SUPERFICIE_AGENTE.md) | MCP, skills e hooks como superfície de ataque; varredura de segredos no pré-commit e o achado do MCP inexistente. |
| [RBAC.md](05-security-compliance/RBAC.md) | Por que **não há RBAC**, o que ocupa o lugar dele e quando passa a ser obrigatório. |
| [RLS.md](05-security-compliance/RLS.md) | Row Level Security **não configurado**: o modelo de acesso real via Prisma e por que RLS seria defesa em profundidade. |
| [MFA.md](05-security-compliance/MFA.md) | MFA **não implementado**: risco concreto e o que falta (inclusive a armadilha do OAuth). |
| [ZTNA.md](05-security-compliance/ZTNA.md) | **Não se aplica** — sem acesso de rede interna a proteger. |
| [NAC.md](05-security-compliance/NAC.md) | **Não se aplica** — sem rede corporativa; a aplicação é serverless. |
| [AUDITORIA_JURIDICA_2_RESPOSTA.md](05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md) | Resposta achado a achado à segunda rodada de auditoria jurídica (1 P0 + 9 P1 + 4 P2). |

> **Comece por:** [COMPLIANCE.md](05-security-compliance/COMPLIANCE.md) para o
> regime de dados e [THREAT_MODELING.md](05-security-compliance/THREAT_MODELING.md)
> para o que pode dar errado. Os documentos de controles ausentes
> (`MFA.md`, `RBAC.md`, `RLS.md`, `ZTNA.md`, `NAC.md`) explicam **por que não se
> aplicam ou por que não existem** — não os leia como pendências equivalentes.

## 06 — DevOps e Deployment

| Documento | Conteúdo |
|---|---|
| [CI_CD_PIPELINE.md](06-devops-deployment/CI_CD_PIPELINE.md) | Os 4 workflows reais, o que cada um valida e o que **não** é validado hoje. |
| [PRODUCTION_DEPLOY.md](06-devops-deployment/PRODUCTION_DEPLOY.md) | Vercel Hobby, região `gru1`, as duas armadilhas de deploy já ocorridas e as ordens corretas com migration. |
| [PREVIEW_DEPLOYMENT.md](06-devops-deployment/PREVIEW_DEPLOYMENT.md) | O que se sabe sobre preview (pouco) e o risco de o preview usar o banco de produção. |
| [QA_TESTING.md](06-devops-deployment/QA_TESTING.md) | Playwright (48 execuções em 2 viewports), os verificadores de motor e as lacunas reais. |
| [BACKUP_DR.md](06-devops-deployment/BACKUP_DR.md) | **Não existe backup** e **não há teste de restauração**: o que está em jogo, RPO/RTO propostos e o desenho a implementar. |
| [CODE_REVIEW.md](06-devops-deployment/CODE_REVIEW.md) | Ausência de processo formal de review, os 5 critérios do projeto e o checklist de pré-PR. |
| [FINOPS.md](06-devops-deployment/FINOPS.md) | Custo US$ 0/mês, egress como recurso escasso e o impacto real de `force-dynamic`. |
| [AUDITORIA_PRODUCAO.md](06-devops-deployment/AUDITORIA_PRODUCAO.md) | Auditoria técnica de produção com medições reais (rotas, APIs, headers, rate limit, pooler). |
| [AVALIACAO_ALTERNATIVAS.md](06-devops-deployment/AVALIACAO_ALTERNATIVAS.md) | Avaliação de alternativas de infraestrutura: egress, região, cache, backup, plataforma e custo. |

## design/ — Camada de UI/UX

- [estrategia-marketing.md](design/estrategia-marketing.md) — funil de 4 estágios e regras inegociáveis de interface.
- [IDENTIDADE_VISUAL.md](design/IDENTIDADE_VISUAL.md) — documento de identidade no FigCraft (gerado), contraste medido, achados de token e veredicto das 22 ferramentas de UI avaliadas.
- [agents/](design/agents/) — briefs de subagentes (`ui-ux-designer`, `critico-visual`, `copywriter-conversao`, `auditor-acessibilidade`).
- `avaliacao-ferramentas.md` e `avaliacao-bibliotecas-animacao.md` — avaliações pontuais.

As skills carregáveis que descrevem tokens, funil e protocolo de revisão vivem em
`.dsh/skills/` (`curriculo-design-system`, `curriculo-marketing-funnel`,
`curriculo-hero`, `curriculo-design-review`).

## ops/ — Anexos operacionais

Todo o conteúdo operacional que vivia em `docs/ops/` foi migrado para
[05-security-compliance/](05-security-compliance/) e
[06-devops-deployment/](06-devops-deployment/). O que restou — e permanece no
lugar de propósito, por volume e por se referenciarem entre si — são os
relatórios de pesquisa brutos. Ver [ops/README.md](ops/README.md).

- [anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md](ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md) — pesquisa e testes ao vivo das fontes de integridade (TCU, STF, DataJud, TSE, CGU).
- [anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md](ops/anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md) — e-mail transacional, autenticação, rate limit e observabilidade.

## Documentação por componente

| Onde | O que |
|---|---|
| [`README.md`](../README.md) | Visão geral, quickstart e comandos do monorepo. |
| [`AGENTS.md`](../AGENTS.md) | Regras de produto que não se negociam e armadilhas conhecidas. |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Como contribuir, verificação obrigatória e código de conduta. |
| [`apps/web/README.md`](../apps/web/README.md) | Aplicação Next.js: o que vive nela, ambiente, deploy. |
| [`apps/pipeline/README.md`](../apps/pipeline/README.md) | Pipeline de dados: idempotência, camada raw, regras. |

## O que este índice não cobre

Documentos previstos mas **ainda não escritos** neste repositório, referenciados
por comentários de código:

- `02-architecture-design/PARTY_SCORING.md` — composição da nota de partido.
  Enquanto não existe, a regra vigente está descrita em
  [SCORING_METHODOLOGY.md §5.1](02-architecture-design/SCORING_METHODOLOGY.md).
- `05-security-compliance/SECURITY_BASELINE.md` — baseline de segurança citado
  no **código**: `apps/web/src/middleware.ts` (linha 5),
  `apps/web/src/app/api/politicians/[id]/route.ts` (linha 52) e
  `apps/web/src/app/politicos/[id]/page.tsx` (linha 105). O documento não existe.
  O conteúdo correspondente hoje está em
  [COMPLIANCE.md §7](05-security-compliance/COMPLIANCE.md) (linguagem jurídica
  estrita e ocultação de registros não definitivos),
  [AUDITORIA_PRODUCAO.md §4 e §5](06-devops-deployment/AUDITORIA_PRODUCAO.md)
  (headers e rate limit) e
  [SECURITY_REVIEW.md](05-security-compliance/SECURITY_REVIEW.md) (achados de
  código). O `CONTRIBUTING.md` **já foi corrigido** na outra frente e aponta para
  `COMPLIANCE.md §7`.

## Convenção de manutenção

1. Documento que descreve uma fórmula (`SCORING_METHODOLOGY.md`, `STF_SCORING.md`)
   mantém a **numeração de seções** usada nos comentários do código: **§2** pesos,
   **§4** travas de integridade, **§5** regra de ranking. Ao renumerar, atualize os
   comentários que apontam para as seções.
2. Número exibido na interface não entra em documento sem indicar de onde vem.
   Pesos da UI vêm de `apps/web/src/lib/methodology.ts`, validado contra `WEIGHTS`
   de `packages/idip/src/scoring.ts` pelo teste **WEB-001** em
   `apps/pipeline/scripts/verify-scoring.ts`.
3. Contagem de dados (parlamentares, proposições, snapshots) muda a cada carga.
   Documento que citar volume deve dizer **de que data** é a medição.
