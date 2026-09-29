# Onboarding de Novos Contribuidores

## Dia 1 — Ambiente
1. Clonar repo: `git clone https://github.com/ENDARTStudios/Curriculo-Politico.git`
2. Seguir SETUP.md (03-development-process/)
3. Rodar `npm run dev` e abrir localhost:3000
4. Rodar `npm run verify:scoring` e `npm run verify:identity`

## Dia 2 — Contexto
1. Ler PRD (01-product-discovery/PRD.md)
2. Ler Metodologia IDIP (02-architecture-design/SCORING_METHODOLOGY.md)
3. Ler Baseline de Segurança (05-security-compliance/)
4. Ler Regras (03-development-process/RULES.md)
5. Navegar pelo site em produção (curriculopolitico.org)

## Dia 3 — Primeira Contribuição
1. Escolher uma issue com label `good-first-issue`
2. Criar branch: `feat/descricao` ou `fix/descricao`
3. Implementar + testar localmente
4. Abrir PR com descrição clara
5. Aguardar CI (typecheck + testes + build)

## Recursos
| Recurso | Onde |
|---|---|
| Metodologia IDIP | /metodologia (site) + SCORING_METHODOLOGY.md |
| API pública | /api + API.md |
| Regras LGPD | /lgpd + COMPLIANCE.md |
| Armadilhas de API | 04-api-integrations/INTEGRATIONS.md |
