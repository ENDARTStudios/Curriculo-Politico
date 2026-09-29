# Task Breaking Down

Como quebrar tarefas grandes em tarefas pequenas e testáveis.

## Regra dos 3 Níveis
1. **Épico** → "Integrar fonte de dados X" (dias/semanas)
2. **Feature** → "Criar ETL para endpoint Y" (horas/dias)
3. **Task** → "Parsear campo Z do CSV" (minutos/horas)

## Exemplo Real: "Integrar Votações Nominais"
```
Épico: Votações Nominais
├── Feature: ETL de votações
│   ├── Task: Identificar endpoint correto (idOrgao=180, sem dataFim)
│   ├── Task: Paginar resultados (itens=100)
│   ├── Task: Filtrar siglaOrgao=PLEN (comissões não têm voto nominal)
│   ├── Task: Baixar votos por votação (campo deputado_)
│   └── Task: Agregar por deputado e salvar JSON raw
├── Feature: Load no banco
│   ├── Task: Agrupar votos por deputado
│   ├── Task: Upsert em LegislativeAction (idempotente)
│   ├── Task: Calcular taxa de participação
│   └── Task: Recalcular Score com fórmula v1.1
└── Feature: Exibir no perfil
    ├── Task: Componente VotosRecentes
    ├── Task: Integração na query do perfil
    └── Task: Total real via count (não length do take)
```

## Sinais de que uma task está bem quebrada
- [ ] Pode ser implementada em < 2 horas
- [ ] Tem critério de aceitação verificável
- [ ] Não depende de mais de 1 outra task
- [ ] É idempotente (pode reexecutar)

## Sinais de que precisa quebrar mais
- [ ] O commit teria +500 linhas
- [ ] O teste tem mais de 3 asserts diferentes
- [ ] Você não sabe explicar em 1 frase o que a task faz
