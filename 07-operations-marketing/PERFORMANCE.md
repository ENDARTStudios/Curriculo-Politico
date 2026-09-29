# Performance

## Métricas Atuais
| Métrica | Valor |
|---|---|
| First Load JS | ~103KB (shared) |
| Maior rota | /comparar 114KB |
| Menor rota | / 103KB |
| Static pages | 15/18 |
| Dynamic pages | 18 |

## Otimizações Implementadas
- Server Components (zero JS client para dados)
- Static generation para páginas institucionais
- `unoptimized` em imagens remotas
- Índices de banco em FKs

## Otimizações Planejadas
- `next/image` com loader customizado para fotos Câmara/Senado
- Cache de queries frequentes (Redis — pendente)
- Streaming de Server Components (React 19 Suspense)
- Lazy loading de componentes pesados (gráficos)
