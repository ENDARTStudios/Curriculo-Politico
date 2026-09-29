# Memória do Projeto

## Decisões Fundadoras
- Nome: **Currículo Político** (nunca "Radar Cívico")
- Licença: AGPL-3.0 (código) + CC BY 4.0 (docs)
- MVP: Federal/Estadual (municipal é fase futura)
- IDIP: sem voto popular, dados oficiais auditáveis
- Neutralidade: voto popular NUNCA altera a nota factual

## Lições Aprendidas (armadilhas)
- TSE CDN: Akamai bloqueia intermitentemente — curl_cffi resolve
- Câmara API: dataInicio+dataFim juntos → 400; autor = idDeputadoAutor
- Senado: campos SiglaPartidoParlamentar, UfParlamentar, NomeCompletoParlamentar
- Supabase pooler: username = role.project_ref
- Prisma migrate dev bloqueado em shell não-interativo → usar migrate diff
- npm install-scripts bloqueados → prisma generate explícito no build
- DT_NASCIMENTO TSE = DD/MM/AAAA (ano = últimos 4 dígitos)
- Câmara /despesas v2 = vazio (usar bulk)
- Portas locais: 5432/6379/5433/6380 ocupadas → 15432/16379
