# @cp/pipeline — Pipeline de Dados

Cargas, recálculos e ETLs do Currículo Político. **Sem servidor próprio** — é a camada de dados que alimenta o banco do `apps/web`.

## O que vive aqui

- Motores puros (IDIP/identidade): pacote `@cp/idip` em `packages/idip`.
- `scripts/*.ts` — cargas idempotentes (`load-*.ts`), recálculo do IDIP (`recalculate-scores.ts`), snapshots (`snapshot-scores.ts`), seeds (`seed-*.ts`), verificação dos motores (`verify-*.ts`, usados no CI)
- `etl/*.py` — coletas nas APIs oficiais (Câmara, Senado, TSE) gravando em `data/raw/` na **raiz do monorepo** (gitignored, camada raw imutável)

## Ambiente

Os scripts TS leem o `.env` do monorepo (`apps/web/.env`) via `--env-file-if-exists` — configurado nos scripts npm da **raiz**, que é o ponto de entrada recomendado:

```bash
npm run db:snapshot          # snapshot dos scores
npm run recalculate-scores   # recalcula o IDIP (594 parlamentares ~1 min)
npm run db:load-proposicoes  # exemplo de carga idempotente
npm run etl:camara           # coleta Python (requer pip install -r etl/requirements.txt)
```

Execução direta (sem os scripts da raiz): `npx tsx --env-file-if-exists=../../apps/web/.env scripts/<arquivo>.ts` a partir desta pasta.

## Regras do pipeline

- **Idempotência:** todas as cargas podem ser re-executadas (upsert/createMany com skip-existing). Cargas grandes usam `createMany` em chunks — nunca upsert sequencial por registro (lento no pooler).
- **Camada raw imutável:** ETL grava JSON em `data/raw/`; a carga nunca re-baixa — reprocessar é re-executar o `load-*`.
- **Banco em produção:** para scripts pesados contra o Supabase, prefira o pool **transacional** (porta 6543 + `?pgbouncer=true`) — o pool de sessão (5432) tem 15 conexões e satura com a produção viva.
- **Scores:** qualquer mudança em dados de dimensão exige `npm run recalculate-scores` + `npm run db:snapshot`.

## CI

`verify:scoring` e `verify:identity` (puros, sem banco) rodam no `.github/workflows/ci.yml`; o snapshot mensal roda no `monthly-snapshot.yml` (requer secret `DATABASE_URL`).
