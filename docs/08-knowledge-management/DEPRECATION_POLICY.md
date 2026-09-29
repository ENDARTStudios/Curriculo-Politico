# Política de Depreciação

## APIs
1. Aviso em /metodologia + CHANGELOG (30 dias antes)
2. Header `Deprecation: true` + `Sunset: <data>` na resposta
3. Remoção na próxima major version

## Dimensões do IDIP
1. Dimensão removida → baseline 50 (neutro) + aviso em /metodologia
2. Nova dimensão → peso realocado das existentes + bump de versão
3. Nunca remover uma dimensão sem substituta

## Fontes de Dados
1. Fonte bloqueada → dados preservados, pipeline marcado como pendente
2. Fonte removida → histórico mantido, nova coleta suspensa
