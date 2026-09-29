# Escolha do Tech Stack

## Critérios de Decisão
1. Deploy zero-config na Vercel
2. Type-safety de ponta a ponta
3. Custo $0 no tier gratuito
4. Open source e auditável

## Frontend + API
| Escolhido | Alternativas Consideradas | Por que escolhemos |
|---|---|---|
| **Next.js 15** | Remix, Nuxt, SvelteKit | App Router + Server Components + Vercel nativo |
| **TypeScript strict** | JavaScript, Flow | Zero erros de tipo = zero bugs de produção |
| **TailwindCSS 4** | styled-components, CSS modules | Utility-first, zero runtime, dark mode fácil |
| **Prisma** | Drizzle, TypeORM, raw SQL | Migrations versionadas + type-safety das queries |

## Banco de Dados
| Escolhido | Alternativas | Por que |
|---|---|---|
| **PostgreSQL** | MySQL, MongoDB | Dados relacionais complexos + Supabase gerencia grátis |
| **Supabase** | Railway, Neon, PlanetScale | Free tier + pooler + dashboard + auth integrado |

## Pipeline de Dados
| Escolhido | Alternativas | Por que |
|---|---|---|
| **Python + Requests** | Node.js, Go | Ecossistema rico p/ parsing de dados públicos BR |
| **Pandas** | Polars, raw CSV | Padrão p/ manipulação tabular |
| **curl_cffi** | requests, aiohttp | Impersona TLS de browser real (passa Akamai) |

## Infraestrutura
| Escolhido | Alternativas | Por que |
|---|---|---|
| **Vercel** | Railway, Fly.io, AWS | Deploy zero-config, edge network, preview URLs |
| **Supabase** | Railway Postgres, Neon | Free tier, pooler nativo, dashboard |
| **Cloudflare** | — | WAF/DDoS (pendente de configuração) |

## Rejeitados
| Tecnologia | Motivo da rejeição |
|---|---|
| Redis (cache) | Adicionado ao docker-compose mas não usado ainda — activar quando houver escala |
| Meilisearch | Busca global resolve com Prisma contains — migrar se precisar de fuzzy search |
| Apache Airflow | Overkill para o pipeline atual — scripts Python com cron são suficientes |
| Docker Swarm/K8s | Um único deploy Vercel atende — migrar se precisar de multi-region |
