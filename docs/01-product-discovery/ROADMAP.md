# Roadmap de Execução

## Fase 0: Fundação (Atual)
- [x] Definição de PRD e Metodologia (IDIP)
- [x] Setup do Repositório e CI/CD básico
- [ ] Revisão Jurídica dos Termos de Uso e Privacidade

## Fase 1: Engenharia de Dados (O Coração do Projeto)
- [ ] Pipeline ETL (Python/Airflow)
- [ ] Ingestão: TSE (Eleições/Financiamento), Câmara e Senado
- [ ] Resolução de Identidade (Cruzamento de nomes/homônimos)
- [ ] Criação do Banco Curado (PostgreSQL)

## Fase 2: Motor de Pontuação (IDIP)
- [ ] Implementação do cálculo de Notas por Cargo (Executivo/Legislativo)
- [ ] Implementação do Termômetro de Confiabilidade
- [ ] Geração de Score Breakdown (Auditoria)

## Fase 3: Frontend e API Pública
- [ ] API REST (Next.js Route Handlers ou FastAPI)
- [ ] Páginas de Perfil (Político e Partido)
- [ ] Páginas de Ranking e Comparação
- [ ] Internacionalização (PT, EN, ES)

## Fase 4: Contas e Segurança
- [ ] Autenticação (NextAuth/Supabase) e Dashboard do Usuário
- [ ] Hardening de Segurança (WAF, Rate Limiting)
- [ ] Lançamento Público (Beta)
