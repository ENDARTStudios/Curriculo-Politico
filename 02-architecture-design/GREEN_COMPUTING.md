# Green Computing — Eficiência Energética

## Princípios
1. **Server Components** — zero JavaScript enviado ao cliente para dados
2. **Static generation** — páginas institucionais pré-renderizadas (zero CPU por request)
3. **Edge network** — Vercel serve do POP mais próximo ao usuário
4. **Sem rastreadores** — zero scripts de terceiros = zero processamento no cliente

## Consumo Atual
| Componente | Consumo | Justificativa |
|---|---|---|
| Vercel (Hobby) | Compartilhado, carbono-neutral | Vercel compensa emissões |
| Supabase (Free) | Compartilhado | Data center sa-east-1 |
| ETL local | ~5 min/dia de CPU | Scripts Python com rate limiting |

## Otimizações Implementadas
- Static pages (`○`) para conteúdo que não muda (sobre, metodologia, cookies)
- Force-dynamic apenas onde necessário (ranking, perfis)
- Índices de banco em todas as foreign keys (queries eficientes)
- Sem imagens hero pesadas (emoji nativo como ícones)
- Zero bibliotecas de animação (CSS transitions nativas)

## Metas
- Manter total transferência por página < 200KB
- Manter First Contentful Paint < 1.5s
- Evitar adicionar dependências client-side (cada uma = mais JS parseado)
