# Tasks — Backlog e Estado

## Concluído
- [x] Fase 0: Fundação (docs, schema, scoring, ETL Câmara/Senado/TSE)
- [x] Produção no ar (Vercel + Supabase + domínio próprio + SSL)
- [x] CEAP real via bulk (1.966 registros de 520 deputados)
- [x] Identity resolution (556/598 parlamentares)
- [x] Votações nominais + scores com taxa de participação
- [x] Proposições autorais (50k autorias)
- [x] Presenças em sessões (166k registros)
- [x] Resumos de projetos (8.262 por categoria)
- [x] Busca global (4 entidades, Ctrl+K)
- [x] Comparação de políticos e partidos
- [x] Votação popular (NextAuth + anti-bot)
- [x] Páginas legais (termos, privacidade, LGPD, cookies, retificação)
- [x] Middleware CSP + rate limit
- [x] /status público
- [x] GitHub repo + CI + cron snapshots

## Em Andamento
- [ ] Completar proposições/presenças no Supabase (seed interrompido)

## Backlog Priorizado
- [ ] Realizar revisão manual de 22 MEDIUM de identidade
- [ ] consulta_cand_2020 (eleições suplementares — 2 senadores sem match)
- [ ] Receitas TSE via curl_cffi (403 Akamai — contornar com browser)
- [ ] Gráfico temporal no perfil (Recharts ou SVG nativo)
- [ ] Integrar CNJ/TJs para ficha criminal
- [ ] Agências de checagem (Aos Fatos, Lupa) para polêmicas
- [ ] Filtro de Afinidade por histórico de votos (requer mais votações)
- [ ] Sub-votações pré-2023 (163 PLEN × múltiplas votações internas)
- [ ] Aumentar votações nominais (varrer 2019–2022 também)
- [ ] Cron mensal ativo (requer DATABASE_URL secret no GitHub)
