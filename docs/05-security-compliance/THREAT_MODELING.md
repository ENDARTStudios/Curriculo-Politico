# Threat Modeling — Currículo Político

## Ativos a Proteger
1. Dados de parlamentares (públicos, mas integridade importa)
2. Dados de usuários (email, votos — confidenciais)
3. Integridade do algoritmo IDIP (manipulação = perda de credibilidade)
4. Disponibilidade do site (DDoS político é cenário real)

## Ameaças (STRIDE)
| Ameaça | Vetor | Mitigação |
|---|---|---|
| **S**poofing | Fake accounts para votar | Anti-bot 24h + bcrypt |
| **T**ampering | Manipular score no banco | Prisma parametrizado + role sem superuser |
| **R**epudiation | Negar voto | JWT + createdAt no UserBillVote |
| **I**nformation disclosure | Vazar dados de usuário | LGPD minimization + RLS (planejado) |
| **D**enial of Service | DDoS político | Cloudflare (pendente) + rate limit |
| **E**levation of Privilege | Escalar de usuario para admin | RBAC (planejado) + sem SQL direto |

## Ameaças Específicas do Domínio
| Ameaça | Risco | Mitigação |
|---|---|---|
| SLAPP suits | Processos para derrubar o site | Termos claros, fontes linkadas, retificação |
| Campanha de difamação | Acusar viés ideológico | Neutralidade algorítmica documentada |
| Manipulação de dados | Injetar dado falso na fonte | Sempre link para fonte oficial |
| Compromisso do GitHub | Push malicioso | Branch protection (pendente) |
