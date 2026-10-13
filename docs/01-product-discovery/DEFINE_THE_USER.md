# DEFINE_THE_USER — quem a plataforma serve

Documento de descoberta. Descreve **para quem** o Currículo Político existe, com
base no que o produto faz hoje (rotas reais, dados reais) e não em personas
genéricas de manual.

## 1. A dor central

> "Eu vou votar e não sei em quem confiar."

Toda a home existe para responder a essa frase. O racional está em
`docs/design/estrategia-marketing.md` (funil de 4 estágios: Gancho → Promessa →
Prova → CTA) e na skill `.dsh/skills/curriculo-marketing-funnel`. A regra
derivada dela: **todo elemento novo na home precisa responder a essa dor; o que
não responde não pertence à home.**

A dor tem três componentes distintos, e cada um gera um usuário diferente:

1. **"Não sei o que a pessoa fez"** — falta de acesso a dado que existe, mas
   está disperso em APIs da Câmara, do Senado e do TSE.
2. **"Não sei se o que achei é verdade"** — desconfiança da informação
   disponível, inclusive de resumos de terceiros.
3. **"Não sei comparar"** — dois políticos com números soltos não produzem uma
   decisão.

## 2. Usuário primário — eleitor decidindo o voto

**O que quer:** uma resposta curta e defensável sobre um nome.

**Onde ele entra:** na home (`apps/web/src/app/page.tsx`), na busca
(`apps/web/src/components/SearchBar.tsx` → `/api/search`) ou direto no ranking
(`/ranking`).

**O que o produto entrega:** nota IDIP 0–100, Termômetro de Confiabilidade ao
lado da nota, decomposição por dimensão e link para a fonte de cada dado.

**O que ele não recebe, de propósito:** recomendação de voto. A plataforma nunca
diz "vote em X". Ela mede atividade, integridade e transparência — não julga
mérito de projeto nem posição ideológica
(`docs/design/estrategia-marketing.md`, regras inegociáveis 1 e 4).

**Dispositivo:** o público é majoritariamente celular — o projeto de teste
`mobile` do Playwright usa viewport **390×844** como referência
(`playwright.config.ts`) e o `AGENTS.md` exige verificação em 375px / 768px /
1280px.

**Estado do usuário:** quase sempre anônimo e de passagem. Por isso todas as
páginas de conteúdo são públicas e nenhuma exige login. Login existe apenas para
a camada de engajamento (votar em projetos, consentir, pedir/revogar).

## 3. Usuário secundário — jornalista, pesquisador e auditor

**O que quer:** reprodutibilidade. Precisa conferir a nota, não acreditar nela.

**O que o produto entrega:**

- `packages/idip/src/scoring.ts` — o motor de cálculo, aberto (AGPL-3.0-only).
- `apps/web/src/lib/methodology.ts` — os pesos exibidos na UI, validados contra o
  motor pelo teste WEB-001.
- `StfScore` e `Score.breakdown` por dimensão, com o valor bruto que entrou em
  cada uma.
- `ScoreSnapshot` — série mensal por mandato, para responder "a nota mudou?".
- `/status` — volumes vivos da base, para saber o que **não** foi coletado.

Este público é a razão de existirem coisas que um site comum não teria: o selo
"sem dados · neutro" em cada dimensão no baseline 50, a exposição da soma dos
pesos na home, e a separação explícita entre "vigente" e "planejado" em
`/metodologia`.

## 4. Usuário afetado — o político avaliado

Não é cliente, é **titular de dados pessoais** e sujeito da avaliação. A LGPD
(Lei 13.709/2018) se aplica a ele integralmente, e o projeto trata isso como
requisito de produto:

| Direito / risco | O que o produto faz | Onde |
|---|---|---|
| Acesso e correção (Art. 18) | Canal público `/retificacao`, sem login, com protocolo rastreável (`model RetificationRequest`) | `apps/web/src/app/retificacao/page.tsx`, `apps/web/src/app/api/retificacao/route.ts` |
| Presunção de inocência (CF, art. 5º, LVII) | Só "Réu em Ação Penal" e "Condenação Transitada em Julgado"; ver `LEGAL_TERMS.md` | `apps/web/src/lib/status-visual.ts`, `docs/01-product-discovery/LEGAL_TERMS.md` |
| Minimização (Art. 6º, III) | Nenhum CPF, endereço ou dado familiar no schema público | `apps/web/prisma/schema.prisma` (`Person` não tem CPF) |
| Registros arquivados | Ocultados automaticamente da API pública | `apps/web/src/app/api/politicians/[id]/route.ts` (filtro `CLEARED` / `ARQUIVADO`) |
| Homonímia (risco de difamação) | O casamento TCU↔político exige nome normalizado exato; CPF seria a ponte, mas ainda não é usada | `apps/pipeline/scripts/load-legal-records.ts`, `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5.2 |

**Consequência de produto:** a dimensão Integridade (25%, a maior) está hoje no
baseline neutro 50 porque `LegalRecord` tem **0 registros** — as fontes estão
documentadas e testadas (`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md`),
mas o ETL não foi implementado. Isso é dito na interface, não escondido
(`/metodologia`, seção "Baseline Neutro (50)").

## 5. Usuário institucional — partido e imprensa

As páginas `/partidos` e `/partidos/[acronym]` agregam por sigla do mandato
atual. A nota de partido usa **70% da média dos membros com confiança ≥ 60** e
**30% em placeholders (50)** até a integração TSE — regra vigente descrita em
[SCORING_METHODOLOGY.md §5.1](../02-architecture-design/SCORING_METHODOLOGY.md).

O produto **não** avalia ideologia: `Party.position` e `Party.ideology` existem
para contexto e comparação lado a lado, nunca como fator da nota. Ver
`apps/web/src/components/PartyScoreBreakdown.tsx`.

## 6. Usuário desenvolvedor / contribuidor

O projeto é open source sob AGPL-3.0-only e existe por contribuição voluntária
(`CONTRIBUTING.md`). Este usuário quer:

- rodar o projeto localmente: `npm install` + `docker compose up -d` +
  `npm run db:migrate` + `npm run db:seed` (3 perfis fictícios: GREEN, YELLOW, RED);
- contribuir com dados: todo dado novo exige ETL com URL da fonte e `retrievedAt`;
- contribuir com código: `typecheck`, `verify:scoring`, `verify:identity` e
  `build` são gate de PR (`.github/workflows/ci.yml`).

## 7. Quem **não** é o usuário

| Não é usuário | Por quê |
|---|---|
| Eleitor buscando recomendação de voto | A plataforma não recomenda voto, por decisão de produto (neutralidade algorítmica). |
| Cliente pagante | Não existe plano comercial, cobrança ou recurso pago (`PRICING_MONETIZATION.md`). |
| Candidato querendo promover a própria imagem | Perfil não é editável pelo avaliado; correção passa pela fonte oficial. |
| Consumidor de API pública | **Não existe API pública documentada nem versionada.** As rotas `/api/*` servem a própria UI e têm rate limit de 60 req/min (`apps/web/src/middleware.ts`). Está no roadmap. |

## 8. Critérios de sucesso observáveis hoje

Não há métrica de produto instrumentada no repositório (nenhum analytics no
código). O que é verificável:

- **Cobertura do ranking:** `cobertura` em `apps/web/src/lib/hero-stats.ts` — a
  fração dos avaliados que tem dados suficientes para entrar no ranking. A home
  mostra esse número de propósito.
- **Integridade do sitemap:** `tests/e2e/seo.spec.ts` valida que o índice anuncia
  apenas arquivos existentes e devolve 404 fora da faixa.
- **Acessibilidade:** `tests/e2e/acessibilidade.spec.ts` (axe-core, tag
  `wcag22aa`) em home, ranking e metodologia, com zero violações como gate.
- **Disponibilidade:** `.github/workflows/production-smoke.yml` a cada 6h
  (home, ranking, `/api/search`, `/api/rankings`, `/status` sem "Indisponível").

## Referências

- `docs/design/estrategia-marketing.md` — funil e regras inegociáveis de UI.
- [PRD.md](PRD.md) — o produto que existe, rota por rota.
- [LEGAL_TERMS.md](LEGAL_TERMS.md) — vocabulário obrigatório.
- `docs/05-security-compliance/RIPD.md` — tratamento de dados pessoais.
- `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` — números de produção medidos.
