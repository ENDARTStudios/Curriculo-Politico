---
name: curriculo-juridico
description: Regras LGPD, linguagem jurídica estrita, neutralidade algorítmica e direitos dos titulares
---

# Regras Jurídicas — Currículo Político

## LGPD
- Base legal: Art. 7º III + Art. 11 §4º (dados manifestamente públicos)
- NUNCA armazenar: CPF completo, endereço, telefone, dados de familiares
- Registros judiciais arquivados/absolvidos = ocultados por código na API

## Linguagem Jurídica Estrita
- "Réu em Ação Penal" (não "criminoso")
- "Condenação Transitada em Julgado" (sempre indicar instância)
- Sem condenação TJ = nunca usar "corrupto" ou "criminoso"

## Neutralidade Algorítmica
- Voto popular NUNCA altera o IDIP
- UserBillVote/UserAffinity = tabelas separadas de Score
- Filtro de Afinidade = pessoal (localStorage), nunca servidor

## Direitos dos Políticos
- Retificação: canal em /retificacao, SLA 72h úteis
- Esfera de privacidade reduzida (STF), mas dados funcionais não são removidos
- Sempre link para a fonte oficial em cada registro
