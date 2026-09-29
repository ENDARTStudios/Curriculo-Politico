# Pesquisa e Análise

Ver documento completo: `docs/ANALISE_17_PROJETOS.md`

## Principais Descobertas

### Fontes de Dados Alternativas
- curl_cffi passa pelo Akamai do TSE (bem_candidato baixado com sucesso)
- Câmara bulk CSV funciona (API v2 despesas vazia)
- Querido Diário (OKBR) cobre 5.000+ municípios

### Ferramentas Avaliadas
- curl_cffi: bypass de WAF via TLS fingerprint (implementado em ETLs)
- Strix: OWASP automatizado (pendente de execução)
- Ollama: IA local para resumos (alternativa a templates)
- Spec-Kit: spec-driven development (processo)

### Referências
- free-for-dev, public-apis, awesome lists: descoberta de serviços
- awesome-mcp-servers, awesome-llm-apps: capacidades de IA
