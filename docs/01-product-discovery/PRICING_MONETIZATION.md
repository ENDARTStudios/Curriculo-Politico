# PRICING & MONETIZATION — como o projeto se sustenta

Documento honesto sobre dinheiro. O Currículo Político **não tem plano
comercial, não cobra pelo uso e não vende dado, visibilidade ou posição em
ranking**. Isso não é uma postura de marketing: é consequência da licença
(AGPL-3.0-only) e do tipo de produto.

Este documento descreve o que existe de fato (`/apoie`), quais são os custos
reais de infraestrutura, o que sustenta o projeto e o que **nunca** será
vendido.

## 1. Situação atual: não há receita de produto

| Item | Estado verificado no repositório |
|---|---|
| Cobrança / assinatura | **Não existe.** Nenhum gateway de pagamento, nenhum model de plano, nenhuma rota de checkout. |
| Anúncios | **Não existem.** Nenhum script de terceiros; a CSP em `apps/web/src/middleware.ts` só permite `script-src 'self'` (com `'unsafe-inline'`/`'unsafe-eval'` exigidos pelo Next), o que bloquearia rede de anúncios. |
| Venda de dado | **Não existe.** Não há export em massa, nem API comercial. |
| Doação | **Existe.** `/apoie` (`apps/web/src/app/apoie/page.tsx`) com Pix (CNPJ via `NEXT_PUBLIC_PIX_KEY`) e GitHub Sponsors (`NEXT_PUBLIC_GITHUB_SPONSORS_URL`). |

A própria página `/apoie` afirma o essencial, e o produto deve continuar
respeitando isso:

> "Doação não é compra de serviço: não há contrapartida, vantagem ou influência
> sobre notas, rankings ou conteúdo editorial."

E oferece reembolso integral em 7 dias, sem exigência de justificativa, pelo
canal `endart.studios+reembolso@gmail.com` (`apps/web/src/lib/contato.ts`).

## 2. Custo real de infraestrutura

O projeto é deliberadamente barato de operar. A tabela abaixo lista os
componentes **efetivamente usados**, não uma lista de desejos.

| Componente | Papel | Evidência no repositório | Observação de custo |
|---|---|---|---|
| **Vercel** | Hospedagem de `apps/web` (Root Directory = `apps/web`), região `gru1` | `apps/web/vercel.json` | O deploy por push em `main` foi reativado em 2026-10-12 (`docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.2) |
| **Supabase (Postgres)** | Banco de produção | `apps/web/prisma/schema.prisma`, `apps/web/.env.example` | Sinais de plano com compute limitado: teto de **60 conexões diretas / 200 via pooler** (Nano) documentado em `AUDITORIA_PRODUCAO.md` §0.7 |
| **GitHub Actions** | CI, snapshot mensal, smoke 6h e auditoria de acessibilidade | `.github/workflows/*.yml` | 4 workflows; sem uso de runner pago configurado |
| **Cloudflare** | WAF/CDN na frente do deploy | Citado em `apps/web/src/middleware.ts` (nota sobre limite distribuído) e na lista de custos de `/apoie` | O rate limit do middleware é **por instância**; a proteção distribuída depende dessa camada |
| **Sentry** | Monitoramento de erros (dormente sem DSN) | `apps/web/package.json`, `apps/web/src/instrumentation.ts` | Sem `SENTRY_DSN` a integração é no-op |
| **UptimeRobot** | Monitor de uptime externo | `apps/pipeline/scripts/uptimerobot-monitor.ts`, `/status` | — |
| **Docker local** | Postgres 15432 + Redis 16379 para desenvolvimento | `docker-compose.yml` | Custo zero em produção; o Redis **não tem consumidor** hoje |

O `docker-compose.yml` declara explicitamente o motivo das portas altas (5432,
5433, 6379 e 6380 já ocupadas na máquina de desenvolvimento). Não há indício de
que o Redis componha a arquitetura de produção.

**Custo real em reais: não verificado.** O repositório não registra valores
cobrados pelos provedores nem histórico de doações. Não invente esses números em
documento ou interface: a própria `/apoie` diz que a prestação de contas será
publicada "conforme o projeto receber doações" — ou seja, ainda não há o que
publicar.

## 3. Por que não existe plano comercial

Quatro razões concretas, não ideológicas:

1. **A licença impede o modelo óbvio.** AGPL-3.0-only (`LICENSE`, e
   `"license": "AGPL-3.0-only"` em todos os `package.json`) significa que
   qualquer operador que ofereça o software como serviço de rede precisa
   disponibilizar o código-fonte modificado aos usuários. Não há como vender
   exclusividade sobre o software.
2. **O produto não tem consumidor pagante natural.** O usuário primário é o
   eleitor de passagem, anônimo, no celular ([DEFINE_THE_USER.md](DEFINE_THE_USER.md) §2).
   Não há fricção de uso que justifique paywall, e um paywall sobre dado público
   de interesse público contraria a própria finalidade do projeto (LGPD Art. 7º,
   §§3º e 4º, sobre finalidade e interesse público).
3. **O produto avaliado não pode ser cliente.** Cobrar de político avaliado para
   melhorar nota, remover registro ou ganhar destaque destruiria o único ativo
   que o projeto tem: credibilidade. Isso está bloqueado como princípio em
   `/apoie` e em [LEGAL_TERMS.md](LEGAL_TERMS.md).
4. **Dado de terceiro com licença restritiva.** Há fontes que **não podem** ser
   usadas em produto comercial — o Termo de Uso do DataJud (CNJ) restringe o uso
   a "fins legais, não comerciais". Qualquer monetização transformaria uma fonte
   hoje descartada numa fonte proibida (`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §3.2 e §5.2).

## 4. Modelo de sustentação real

Quatro caminhos, todos já visíveis em `/apoie`, em ordem de importância prática:

| Caminho | Estado | O que financia |
|---|---|---|
| **Doação recorrente (GitHub Sponsors)** | Link configurável por env; hoje cai no repositório | Custo recorrente: banco, hospedagem, monitoramento |
| **Doação pontual (Pix)** | Chave configurável por env (`NEXT_PUBLIC_PIX_KEY`); sem chave, a página exibe "Chave em configuração" | Picos de custo: revisão jurídica, ferramentas |
| **Contribuição de código** | `CONTRIBUTING.md`; CI de PR ativo | O maior "custo" do projeto é engenharia: o ETL de integridade e o do STF são lacunas reais ([ROADMAP.md](ROADMAP.md)) |
| **Divulgação e reporte de erro** | `/apoie` ("Reportar Erros" → `/retificacao`) | Qualidade de dado, que é o produto |

A `/apoie` lista quatro destinos para o dinheiro: servidores e infraestrutura,
APIs de dados e coleta, revisão jurídica e contábil, e ferramentas de
desenvolvimento. Qualquer despesa fora dessa lista contradiz a página publicada.

### Sustentação institucional

O controlador é **ENDART Studios** (`apps/web/src/lib/contato.ts`), com canais
operacionais publicados para DPO, direitos do titular, segurança, suporte e
reembolso. A revisão jurídica e contábil é uma despesa explicitamente prevista —
e uma pendência registrada: a **revisão jurídica humana integral** dos Termos,
da Política de Privacidade e do RIPD antes de campanha de divulgação está em
aberto (`docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md`,
"Pendências externas restantes", item 3).

## 5. O que jamais será monetizado

Registrado aqui para que uma decisão futura não seja tomada por conveniência:

1. **Nota, posição no ranking ou Termômetro.** Nenhum pagamento altera `Score`,
   `StfScore` ou ordenação.
2. **Remoção de registro jurídico.** Correção passa pela fonte oficial e pelo
   canal `/retificacao`, com protocolo — nunca por pagamento.
3. **Destaque, selo ou "verificado" pago** para político ou partido.
4. **CPF, endereço ou dado familiar.** Não são publicados nem vendidos; a
   política é de minimização (`docs/05-security-compliance/RIPD.md`).
5. **Dado bruto sob licença de terceiro restritiva** (ex.: DataJud/CNJ).

## 6. Se um dia houver modelo comercial

O único desenho compatível com o que existe hoje seria **serviço, não dado**:
hospedagem gerenciada do software AGPL para redações, universidades ou órgãos de
controle, com obrigação de publicar as modificações. Isso ainda **não é uma
decisão do projeto** — não há código, contrato, precificação ou intenção
registrada no repositório. Tratar como hipótese, não como roadmap.

Se for adiante, três condições precedentes:

1. Não usar fonte cujo termo proíbe uso comercial.
2. Não restringir acesso ao dado público que a versão comunitária publica.
3. Publicar a prestação de contas que `/apoie` promete.

## 7. Referências

- `apps/web/src/app/apoie/page.tsx` — página pública de sustentação.
- `apps/web/src/lib/contato.ts` — canais oficiais, incluindo reembolso.
- `LICENSE` e `package.json` (raiz, `apps/web`, `apps/pipeline`, `packages/idip`) — AGPL-3.0-only.
- `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` — custos de latência e pooler que motivaram decisões de infraestrutura.
- `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5.2 — restrições de uso comercial por fonte.
