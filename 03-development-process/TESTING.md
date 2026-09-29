# Estratégia de Testes

## Camadas de Teste

### 1. Testes Unitários (motor IDIP)
**Arquivo:** `scripts/verify-scoring.ts` — roda a cada push no CI
- Pesos somam 1.0 em ambos os perfis
- Travas de integridade (teto 39.9)
- Termômetro (GREEN/YELLOW/RED/GRAY)
- Modificadores de carreira (iniciante 35pts, veterano -penalidade)
- Votos secretos (-5/-10)
- Validação de entrada (rejeita >100, NaN)

### 2. Testes Unitários (motor de identidade)
**Arquivo:** `scripts/verify-identity.ts` — roda a cada push no CI
- 13 casos: match exato, re-eleição, contenção de tokens, fuzzy Levenshtein,
  homônimos desempatados por partido, ambíguos, sem match

### 3. Smoke Tests (produção)
**Arquivo:** `.github/workflows/production-smoke.yml` — roda a cada 6h
- Home 200
- /ranking 200
- Busca "lula" retorna ≥1 resultado
- API rankings retorna ≥1 item
- /status sem "Indisponível"

### 4. Testes E2E (manual)
- Registro → login → voto em projeto (NextAuth + anti-bot)
- Busca → perfil → CEAP real → resumo temático
- Comparação lado a lado (2 políticos)
- Rate limit (429 após 60 req/min)

### 5. Testes de Integração (dados)
Cada script de load é idempotente — reexecutar não duplica nem corrompe:
```bash
npm run db:load-camara-completa   # 513 deputados
npm run db:load-senado            # 81 senadores
npm run db:load-votacoes-historico # 7220 votos
npm run db:load-proposicoes       # 50k autorias
npm run db:load-presenca          # 166k presenças
npm run db:load-ceap-bulk         # 1.966 CEAP real
```

## Cobertura Mínima
| Área | Cobertura | Método |
|---|---|---|
| scoring.ts | 27 casos | verify-scoring.ts |
| identity.ts | 13 casos | verify-identity.ts |
| APIs públicas | 5 rotas | production-smoke.yml |
| ETLs | idempotência | reexecução |
| Auth | E2E manual | registro→login→voto |

## O que NÃO testamos (e por quê)
- UI/UX (páginas renderizam corretamente — validação manual)
- Performance (benchmark com wrk planejado, não automatizado)
- Scraping de fontes bloqueadas (requer browser + WAF bypass)
