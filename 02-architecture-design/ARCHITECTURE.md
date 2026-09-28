# Arquitetura do Sistema

## Padrão
Monólito Modular com Pipeline de Dados Assíncrono. Foco em simplicidade, cache agressivo e segurança de borda.

## Stack Tecnológica
- **Frontend/API:** Next.js (App Router) + TypeScript + TailwindCSS
- **ETL / Data Science:** Python (Pandas, Requests, BeautifulSoup) + Apache Airflow
- **Banco de Dados:** PostgreSQL (Relacional) + Redis (Cache de Rankings)
- **Busca:** Meilisearch (Busca de políticos e projetos)
- **Infraestrutura:** Vercel (Frontend) + Railway/Render (ETL/Banco)
- **Segurança de Borda:** Cloudflare (WAF, DDoS, Bot Management)

## Fluxo de Dados
1. **Coleta:** Scripts Python rodam diariamente (cron jobs).
2. **Raw:** Dados salvos em S3/Storage imutável (JSON/CSV).
3. **Processamento:** Validação, resolução de identidade e cálculo do IDIP.
4. **Serving:** Next.js consome o Postgres e gera páginas estáticas (SSG) para SEO, com revalidação incremental (ISR).
