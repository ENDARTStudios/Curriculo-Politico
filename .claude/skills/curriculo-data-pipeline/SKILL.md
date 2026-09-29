---
name: curriculo-data-pipeline
description: Ordem correta do pipeline de dados e armadilhas das APIs da Câmara, Senado e TSE
---

# Pipeline de Dados — Currículo Político

## Ordem OBRIGATÓRIA dos loads
1. load-camara-completa (513 deputados)
2. load-senado (81 senadores)
3. load-votacoes-historico (7220 votos)
4. load-proposicoes (50k autorias)
5. load-presenca (167k presenças)
6. resolve-identity (556 tseId)
7. load-ceap-bulk (1966 CEAP real)
8. load-fact-checking (13 checagens)
9. recalculate-scores (IDIP v1.1)
10. mark-first-terms + detect-secret-votes
11. db:snapshot (370 snapshots)

## Armadilhas das APIs
### Câmara
- `dataInicio+dataFim` juntos → 400 (usar só dataInicio)
- Votações PLEN = idOrgao=180; comissões não têm voto nominal
- Autor de proposição = `idDeputadoAutor=` (não `autor=`)
- `/despesas` v2 = VAZIO (usar bulk camara.leg.br/cotas/)
- `proposicaoObjeto` pode ser string ou dict

### Senado
- Endpoint: `/senador/lista/atual` (não `/senador/lista`)
- Campos: SiglaPartidoParlamentar, UfParlamentar, NomeCompletoParlamentar

### TSE
- CDN bloqueia com Akamai 403 intermitente — usar curl_cffi impersonate='chrome'
- DT_NASCIMENTO = DD/MM/AAAA (ano = últimos 4 dígitos)
- SQ_CANDIDATO NÃO é estável entre eleições
- bem_candidato CSV: SQ col 4, VR col 8 (DictReader resolve)

## Idempotência
Todos os loads podem reexecutar. Upserts usam chaves únicas.
Seeds ('seed-*') são excluídos do recálculo em massa.
