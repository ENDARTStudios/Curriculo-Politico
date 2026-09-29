# Integrações

## Ativas

### Câmara dos Deputados (Dados Abertos API v2)
- **Base:** https://dadosabertos.camara.leg.br/api/v2
- **Auth:** Nenhuma (pública)
- **Rate limit:** 0.25–0.5s entre requisições (educado)
- **Armadilhas descobertas:**
  - `dataInicio+dataFim` juntos → 400 (usar apenas dataInicio)
  - `siglaOrgao` não é parâmetro válido (filtrar client-side)
  - Autor de proposição é `idDeputadoAutor=` (não `autor=`)
  - `/despesas` retorna vazio (dados migraram p/ bulk)
  - Votações PLEN = `idOrgao=180`; comissões não têm voto nominal
  - `proposicaoObjeto` pode ser string ou dict

### Senado Federal (Dados Abertos)
- **Base:** https://legis.senado.leg.br/dadosabertos
- **Auth:** Nenhuma
- **Armadilhas:**
  - Endpoint correto: `/senador/lista/atual` (não `/senador/lista`)
  - Campos: `SiglaPartidoParlamentar` (não `SiglaPartido`)
  - Fotos em `http://` (não https)

### TSE (Dados Abertos via CDN)
- **Base:** https://cdn.tse.jus.br/estatistica/sead/odsele
- **Auth:** Nenhuma, mas Akamai WAF bloqueia intermitentemente
- **Bypass:** `curl_cffi` com `impersonate='chrome'`
- **Armadilhas:**
  - `DT_NASCIMENTO` = DD/MM/AAAA (ano = últimos 4 dígitos)
  - Autor de proposição: `idDeputadoAutor` (não `autor`)
  - Bem_candidato CSV: SQ na col 4, VR na col 8 (não 9/15)
  - SQ_CANDIDATO NÃO é estável entre eleições

## Planejadas

| Fonte | Uso | Bloqueio |
|---|---|---|
| TCU | Contas rejeitadas (travas) | 401 api-publica |
| STF | Ações penais originárias | 403 sem API |
| CNJ/TJs | Processos criminais | Captcha |
| Querido Diário | Menções municipais | 503 intermitente |
| Câmara bulk despesas | CEAP completo | ✅ Implementado |

## Rate Limiting
Todos os ETLs usam rate limiting educado (0.25–0.5s entre requisições).
O Akamai do TSE bloqueia após múltiplas requisições — aguardar cooldown
de 60–90s entre tentativas.
