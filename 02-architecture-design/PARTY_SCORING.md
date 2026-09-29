# Metodologia de Nota dos Partidos

> **Status:** 70% vigente (média dos membros), 30% placeholder (Transparência
> Institucional e Conformidade Eleitoral aguardam integração com dados do TSE —
> prestação de contas partidária). O placeholder usa 50 (neutro) e está marcado
> como tal na UI.

## Fórmula

```
Nota do Partido =
  (70% × Média das Notas dos Membros Ranqueados) +
  (20% × Transparência Institucional) +
  (10% × Conformidade Eleitoral)
```

## Componentes

### 1. Média dos Membros (70%)
- Considera apenas membros com confiança ≥ 60% (não-GRAY)
- Média simples das notas IDIP individuais
- Se nenhum membro ranqueado: componente = 0

### 2. Transparência Institucional (20%)
- Prestação de contas ao TSE em dia: +10
- Portal de transparência próprio ativo: +5
- Estatuto e dirigentes públicos: +5
- **Status:** placeholder (50) até integração TSE

### 3. Conformidade Eleitoral (10%)
- Contas aprovadas pelo TSE nos últimos 4 anos: +10
- Contas com ressalvas: +5
- Contas rejeitadas: 0
- **Status:** placeholder (50) até integração TSE

## Nota Exibida
A nota principal do partido é a soma ponderada acima. O breakdown completo é
exibido na página do partido (`PartyScoreBreakdown`).

## Neutralidade
A nota do partido nunca considera ideologia ou posição no espectro. Partidos de
esquerda, centro e direita são avaliados pelos mesmos critérios técnicos.
