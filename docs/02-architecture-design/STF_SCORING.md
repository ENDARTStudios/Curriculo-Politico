# IDIP-STF: Metodologia para Ministros do Supremo Tribunal Federal

> **Status:** estrutura de dados, pesos e página criados. O ETL das decisões ainda
> não existe — o STF publica decisões no DJe e no portal.stf.jus.br sem API
> consolidada; a integração exigirá coleta dedicada + parsing (fase própria).

## Princípios

A pontuação de ministros do STF segue os mesmos princípios do IDIP original:
dados públicos verificáveis, sem julgamento ideológico de votos, auditabilidade
completa. A diferença é que, no Judiciário, "produtividade" não se mede por
quantidade, mas por rigor técnico e consistência.

## Pesos (100 pontos)

| Dimensão | Peso | O que medir |
|---|---:|---|
| Produtividade Jurídica | 25 | Relatorias, votos proferidos, acórdãos lavrados |
| Consistência Jurisprudencial | 25 | Coerência com precedentes próprios, fundamentação |
| Transparência | 20 | Pedidos de vista cumpridos em prazo, votos públicos, acesso |
| Celeridade | 15 | Tempo médio entre distribuição e voto |
| Integridade | 15 | Impedimentos declarados, ausências justificadas |

## Travas de Integridade

- Pedido de vista além do prazo legal: −5 pontos por ocorrência
- Ausências em sessões plenárias sem justificativa: −3 pontos cada
- Suspeições recusadas pelo plenário: −5 pontos cada

## Nota do Ministro

Cada ministro tem uma nota por ano judiciário (agosto a julho).
A nota exibida no perfil é a média dos últimos 3 anos.

## Neutralidade

O algoritmo não avalia se um voto foi "progressista" ou "conservador".
Um ministro que vota consistentemente de acordo com sua jurisprudência
declarada recebe a mesma pontuação de consistência que outro de linha oposta.
