# Fontes de Conteúdo

## Dados Coletados (com pipeline ativo)

| Fonte | Endpoint/Dataset | Volume | Frequência | Status |
|---|---|---|---|---|
| Câmara /deputados | api/v2/deputados | 513 | Sob demanda | ✅ |
| Câmara /votacoes | api/v2/votacoes?idOrgao=180 | 7.220 votos | Sob demanda | ✅ |
| Câmara /proposicoes | api/v2/proposicoes?idDeputadoAutor | 50.479 | Sob demanda | ✅ |
| Câmara /eventos | api/v2/deputados/{id}/eventos | 166.825 | Sob demanda | ✅ |
| Câmara bulk CEAP | camara.leg.br/cotas/Ano-YYYY.zip | 1.966 | Anual | ✅ |
| Senado /lista/atual | legis.senado.leg.br/dadosabertos | 81 | Sob demanda | ✅ |
| TSE /consulta_cand | cdn.tse.jus.br (via curl_cffi) | 19.865 | Eleitoral | ✅ |
| TSE /bem_candidato | cdn.tse.jus.br (via curl_cffi) | 35.895 | Eleitoral | ✅ |
| TSE /receitas | cdn.tse.jus.br (via curl_cffi) | — | Eleitoral | ⚠️ 404 |

## Fontes Bloqueadas

| Fonte | Bloqueio | Alternativa |
|---|---|---|
| TCU | 401 (api-publica exige credenciais) | Lista manual de inidôneos |
| STF | 403 (WAF sem API consolidada) | Extração do DJe |
| CNJ/TJs | Captcha + autenticação | Parceria institucional |
| Querido Diário | 503 intermitente | Reexecutar quando voltar |

## Formato dos Dados
- Raw JSON em `data/raw/` (gitignored)
- Loads idempotentes (reexecutar não duplica)
- Cada registro guarda `sourceUrl` e `retrievedAt`
