---
name: curriculo-idip
description: Fórmula IDIP v1.1 — pesos, travas, termômetro, confiança e regras de versionamento
---

# IDIP v1.1 — Regras do Motor de Scoring

## Pesos Legislativo (v1.1)
Integridade 25%, Produção 18%, Aprovação 15%, Fiscalização 10%,
Presença 10%, Transparência 10%, Custo/Benefício 7%, Campanha 5%.

## Pesos Executivo
Integridade 25%, Resp.Fiscal 20%, Entrega 20%, Transparência 15%,
Custo 10%, Campanha 5%, Governança 5%.

## Travas de Integridade
Condenação TJ / contas rejeitadas / impeachment / inelegibilidade:
→ Integridade = 0, nota máxima 39.9, termômetro RED.

## Termômetro (precedência)
GRAY (confiança<60) → RED (trava) → YELLOW (60-79 ou integridade<60) → GREEN

## Confiança (fórmula v1.1)
min(95, 30 + min(30,taxa_votação×30) + min(15,autorias×1.5) + presença)

## Regras de versionamento
- Mudança de fórmula = bump de versão (Score.version) + atualizar /metodologia
- Nenhuma regra entra na nota sem estar implementada em scoring.ts
- Seeds ('seed-*') excluídos do recálculo em massa

## Arquivo
Motor: src/lib/scoring.ts | Testes: scripts/verify-scoring.ts (27 casos)
