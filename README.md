# 📡 Radar Cívico

Plataforma open-source de transparência política que agrega dados públicos federais e estaduais para avaliar, ranquear e auditar o desempenho de políticos e partidos no Brasil, usando o **IDIP** — Índice de Desempenho e Integridade Pública.

> **Status:** MVP em construção (Fase 0 concluída, Fase 1 em andamento). Veja o [Roadmap](01-product-discovery/ROADMAP.md).

## Como funciona

- **Nota IDIP (0–100):** mede desempenho, com pesos distintos para o Legislativo e o Executivo. Metodologia aberta e versionada em [`02-architecture-design/SCORING_METHODOLOGY.md`](02-architecture-design/SCORING_METHODOLOGY.md).
- **Termômetro de Confiabilidade:** mede risco e transparência, exibido ao lado da nota (🟢 Confiável, 🟡 Atenção, 🔴 Não Confiável, ⚪ Dados Insuficientes — fora do ranking).
- **Travas de integridade:** condenação transitada em julgado, impeachment, inelegibilidade ou contas rejeitadas zeram a Integridade e limitam a nota a 39.9.
- **Sem voto popular:** apenas dados públicos auditáveis (Câmara, Senado, TSE). Dados faltantes reduzem a Confiança, nunca geram nota fictícia.

## Estrutura do repositório

```
├── 01-product-discovery/       PRD e Roadmap
├── 02-architecture-design/     Arquitetura, Modelo de Dados e Metodologia IDIP
├── 05-security-compliance/     Baseline de Segurança e LGPD
├── etl/                        Pipeline de coleta (Python — Câmara dos Deputados)
├── prisma/                     Schema do banco + seed de desenvolvimento
├── scripts/                    Verificação do motor IDIP (usado no CI)
└── src/
    ├── app/                    Next.js App Router (home + API REST)
    └── lib/                    Motor IDIP (scoring.ts) e cliente Prisma
```

## Stack

Next.js 15 (App Router) + TypeScript + TailwindCSS · PostgreSQL (Prisma) · Redis (cache, Fase 3) · Python (ETL) · Vercel/Cloudflare (deploy e borda).

## Quickstart

Pré-requisitos: Node 20+, Python 3.12+ e Docker (para o Postgres local).

```bash
# 1. Dependências Node
npm install

# 2. Banco de dados local (Postgres + Redis)
docker compose up -d

# 3. Variáveis de ambiente
cp .env.example .env

# 4. Schema + dados fictícios (3 perfis: GREEN, YELLOW e RED)
npx prisma migrate dev --name init
npm run db:seed

# 5. Aplicação
npm run dev
```

- Home: http://localhost:3000
- Ranking: `GET /api/rankings?cargo=LEGISLATIVE&limit=10`
- Perfil: `GET /api/politicians/seed-0001` (também aceita o id interno do banco)

## ETL (Fase 1)

Coleta real da API de Dados Abertos da Câmara dos Deputados:

```bash
pip install -r etl/requirements.txt
python etl/camara_deputados.py --limit 10
```

Saída em `data/raw/` (gitignored): `camara_deputados_raw.json` (camada raw imutável) e `raw_data_camara.csv` (camada curada mínima).

## Verificação

```bash
npm run typecheck        # TypeScript estrito, zero erros
npm run verify:scoring   # Matemática do IDIP: pesos, hard caps e termômetro
npm run build            # Build de produção do Next.js
```

O `verify:scoring` cobre: soma dos pesos = 1.0 nos dois perfis, teto de 39.9 para condenados/contas rejeitadas, termômetro (GREEN/YELLOW/RED/GRAY) e rejeição de métricas inválidas. Roda no CI (`.github/workflows/ci.yml`).

## Compliance

- **Linguagem jurídica estrita:** apenas termos como "Réu em Ação Penal" ou "Condenação Transitada em Julgado"; nunca "crime" sem trânsito em julgado (ver [SECURITY_BASELINE.md](05-security-compliance/SECURITY_BASELINE.md)).
- **LGPD:** minimização de dados — nenhum CPF, endereço residencial ou dado familiar; registros judiciais arquivados/absolvidos são ocultados do perfil público automaticamente (implementado na API).
- **Direito de resposta:** canal de retificação com SLA e auditoria (planejado para a Fase 4).

## Licenças

- **Código:** [AGPL-3.0-only](LICENSE)
- **Documentação:** CC BY 4.0
