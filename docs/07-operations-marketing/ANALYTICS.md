# Analytics e medição

## 1. Estado atual: **não existe nenhuma ferramenta de analytics**

Verificado no repositório. Busca no código-fonte de `apps/web/src` pelos termos
`analytics`, `gtag`, `dataLayer`, `gtm`, `posthog`, `plausible`, `umami` e
`vercel/analytics`: **nenhuma ocorrência**. E `apps/web/package.json` não declara
nenhuma dependência de medição.

Não há:

- Ferramenta de terceiros (GA4, Plausible, Umami, PostHog, Matomo…)
- Script injetado, container de tag manager ou pixel
- Evento de conversão, funil de clique ou meta de medição
- **Google Search Console** implementado: nenhum arquivo de verificação no
  repositório (`apps/web/public/` contém apenas `avatar-placeholder.svg`) e nenhuma
  marcação `google-site-verification`
- Bing Webmaster Tools, ou qualquer outro painel de busca
- Painel interno de métricas

### O que **existe** e é frequentemente confundido com analytics

| Recurso | O que é de fato | Onde |
|---|---|---|
| `/status` | Página que exibe **volumes do banco** (contagens de tabelas) e o último snapshot, consultados a cada acesso | `apps/web/src/app/status/page.tsx` |
| Smoke de produção por `curl` a cada 6h | Verificação de **disponibilidade e de dado** — 5 asserções sobre status HTTP e conteúdo | `.github/workflows/production-smoke.yml` |
| UptimeRobot | Monitor de **uptime** externo, criado por script | `apps/pipeline/scripts/uptimerobot-monitor.ts` |
| Sentry (dormente) | **Erros**, quando o DSN existir | `apps/web/src/instrumentation.ts` |
| Playwright contra produção a cada 6h | Verificação de **acessibilidade e SEO**, não de uso | `.github/workflows/a11y.yml` |

**Nenhum desses mede comportamento de usuário.** `/status` conta linhas de tabela;
o smoke verifica se a página responde. Nenhum responde a "quantas pessoas visitaram",
"de onde vieram", "o que clicaram" ou "quantas converteram".

Ver [MONITORING.md](MONITORING.md) para esses mecanismos em detalhe.

## 2. A restrição que qualquer analytics futuro tem de respeitar

Isto não é uma preferência: é uma **afirmação já publicada no produto**, e
contradizê-la retroativamente seria defeito de compliance, não de feature.

`apps/web/src/components/CookieBanner.tsx`, exibido a todo visitante novo, diz:

> *"Utilizamos apenas **cookies essenciais** de sessão e armazenamento local para
> preferências. **Nenhum cookie de rastreamento ou publicidade.**"*

O comentário no código é explícito:

> *"Banner informativo de cookies — informa sobre cookies essenciais de sessão
> (NextAuth) e armazenamento local. **Não há cookies de rastreamento.** Aparece
> apenas na primeira visita."*

E o banner grava em `localStorage` (`curriculo_politico_cookie_consent`) apenas o
fato de o aviso ter sido visto:

```json
{ "essenciais": true, "data": "..." }
```

Não é consentimento granular por finalidade — porque **não há finalidade a
consentir** hoje.

### Consequências diretas para a escolha de ferramenta

| Restrição | Consequência |
|---|---|
| "Nenhum cookie de rastreamento" é afirmação pública | Ferramenta que use cookie de rastreamento exige **mudar o banner**, o `/cookies` e possivelmente a Política de Privacidade — e a versão dos documentos (`PRIVACY_VERSION` em `lib/consent.ts`) teria de subir |
| O público é titular de dados sob LGPD | IP é dado pessoal. Medição que persista IP exige base legal declarada |
| O produto trata **opinião política** (dado sensível, Art. 11) | Cruzar dado sensível com perfil de navegação seria um risco desproporcional ao ganho |
| Não há cookie de rastreamento hoje | Ferramenta **sem cookie** (contagem agregada, sem identificador persistente) preserva a afirmação atual |

**A conclusão é restritiva:** a escolha que respeita o que o produto já afirma é uma
ferramenta **sem cookie e sem perfil**. Qualquer outra exige mexer nos documentos
legais e reemitir consentimento — decisão de compliance, não de marketing.

## 3. O que falta, e por que importa mais do que parece

### 3.1 O gate de SEO é conformidade técnica, não resultado

[SEO.md](SEO.md) documenta um gate sólido: 9 testes que garantem robots, sitemap,
canonical e metadata corretos. Mas nenhum deles diz se **alguém chegou**. A
distinção:

| O que se sabe | O que não se sabe |
|---|---|
| O `robots.txt` permite indexação | Se o site **está** indexado, e em que profundidade |
| O sitemap anuncia ~32.450 URLs válidas | Quantas foram **descobertas** e quantas geram erro de crawl |
| Toda página tem canonical absoluto | Qual é a página de entrada real das visitas |
| A metadata é factual e completa | Qual `description` gera clique e qual não |
| O funil tem um CTA primário | Se alguém clica nele |

**Sem isso, a maior parte do trabalho de SEO é fé.** E a mesma lacuna invalida
[AEO.md](AEO.md), [AIO.md](AIO.md) e [GEO.md](GEO.md) — os três documentos dizem
explicitamente que não há métrica de resultado, e essa ausência é o mesmo problema
visto de três ângulos.

### 3.2 O produto é uma plataforma de dados e **não mede seu próprio uso**

A ironia é registrável: a plataforma avalia desempenho de terceiros com metodologia
publicada, e não tem nenhum dado sobre o próprio desempenho. Não há como responder
"o produto funciona?" com evidência.

### 3.3 Custo de egress precisa de medição contínua

A avaliação de plataforma (`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`
§2.2) mede que cada request de `/ranking` devolvia **177 KB** do banco, e que a cota
de egress do plano gratuito é **5 GB/mês unificados**. Com 28 mil visitas/mês,
`/ranking` sozinho consumiria ~100% da cota.

**Isso não é analytics de marketing — é capacidade.** Hoje a única forma de saber o
consumo é o painel do Supabase. Uma medição contínua de requisições por rota
permitiria decidir sobre cache (T-10) com dado em vez de estimativa.

## 4. Opções avaliadas

Nenhuma foi implementada. Comparação qualitativa, sem número inventado:

| Opção | Cookie de rastreamento | Preserva a afirmação do banner | Observação |
|---|---|---|---|
| **Vercel Web Analytics** | Sem cookie (contagem agregada) | ✅ Sim | O deploy já é Vercel; **não verificado** no repositório se o plano atual cobre, nem se há custo |
| **Vercel Speed Insights** | Sem cookie | ✅ Sim | Mede **Core Web Vitals reais** — é a lacuna de [PERFORMANCE.md](PERFORMANCE.md) §4 |
| **Plausible / Umami / Matomo (self-hosted)** | Sem cookie | ✅ Sim | Exige hospedagem nova. Umami e Matomo podem ser self-hosted; **custo/operação não avaliados** |
| **GA4** | Usa cookie/identificador | ❌ **Não** | Exige mudar banner, `/cookies` e Política; GA4 como processador de dados de titulares brasileiros exige avaliação de transferência internacional |
| **Sentry (como fonte de uso)** | Não é analytics | ✅ Sim | Já instrumentado e **dormente** — ver T-08. Não mede uso |
| **Logs da Vercel** | Sem cookie | ✅ Sim | Existem, mas **não verificado** o período de retenção no plano atual, e não há coleta estruturada no repositório |
| **`navigator.sendBeacon` / endpoint próprio** | Depende do desenho | ✅ possível | Custo de construir e manter; exigiria rota de API que não existe hoje |

**Recomendação (não implementada):** se houver decisão de medir, começar por
**Vercel Web Analytics + Speed Insights** pela combinação de (a) não introduzir
cookie, (b) estar na plataforma já contratada e (c) o Speed Insights resolver a
lacuna de CWV reais — que é a única medição de performance que o projeto
efetivamente não tem. Exige, ainda assim, atualizar `/privacidade` e `/cookies` para
declarar o novo processador (transferência internacional, LGPD art. 33) e registrar
a decisão em [`MEMORY.md`](../08-knowledge-management/MEMORY.md).

## 5. O que medir, quando houver medição

Em ordem de valor, sem inventar meta numérica:

| Pergunta | Por que importa agora |
|---|---|
| **Indexação:** quantas URLs do sitemap foram descobertas? Quantos erros de crawl? | É a única forma de validar o trabalho de SEO. Search Console responde direto e é **gratuito** |
| **Entrada:** por qual página as pessoas chegam? | Se for perfil de político por busca nominal, a prioridade de conteúdo é diferente de se for a home |
| **Conversão:** quantos clicam no CTA primário ("Ver o ranking completo")? | É o único objetivo declarado do funil |
| **Core Web Vitals reais** (LCP, INP, CLS) por rota | Não há nenhuma medição de CWV real hoje — ver [PERFORMANCE.md](PERFORMANCE.md) §4 |
| **Requisições por rota e egress estimado** | Capacidade: decide sobre cache (T-10) e sobre o gatilho de upgrade de plano |
| **Uso da votação popular:** quantos usuários concedem consentimento e votam? | A base estava em **0 usuários, 0 votos, 0 retificações** na medição de 12/10/2026. É o módulo com mais regra de negócio e nenhum dado de uso |
| **Uso do canal de retificação** | Métrica de saúde institucional, não de marketing |

### O que **não** medir

- **Comportamento individual de leitura política.** Cruzar navegação com opinião
  política é tratar dado sensível por inferência. Não fazer — nem "anonimizado".
- **Qualquer coisa que exija reter IP** sem base legal declarada.
- **Métricas de vaidade** sem decisão associada (tempo na página, scroll depth) antes
  de haver uso real para calibrar.

## 6. Regras

1. **Nenhuma ferramenta de medição entra sem atualizar, no mesmo commit:**
   `CookieBanner.tsx`, `/cookies`, `/privacidade`, `PRIVACY_VERSION` em
   `lib/consent.ts` e o RIPD. A afirmação do banner é pública.
2. **Nada que use cookie de rastreamento** enquanto a afirmação "nenhum cookie de
   rastreamento" estiver no produto.
3. **Nenhum dado sensível cruzado com navegação.**
4. **Medição não pode degradar a experiência.** Script de terceiro no caminho
   crítico afeta LCP. A CSP atual tem `script-src 'self' 'unsafe-inline'
   'unsafe-eval'` — um script de domínio externo **exige alterar a CSP** em
   `middleware.ts`, o que deve ser tratado como decisão de segurança, não detalhe
   de implementação.
5. **Toda decisão de medição é registrada** em
   [`MEMORY.md`](../08-knowledge-management/MEMORY.md), com data e motivo.
6. **Não prometa resultado de SEO sem [§5](#5-o-que-medir-quando-houver-medição)
   resolvido.** Vale para [AEO.md](AEO.md), [AIO.md](AIO.md) e [GEO.md](GEO.md), que
   já declaram essa ausência.

## 7. Não verificado

- **Plano atual da Vercel** e se ele inclui Web Analytics e Speed Insights, e com que
  retenção de dados.
- **Período de retenção dos logs** da Vercel no plano atual.
- Se o **UptimeRobot** está efetivamente ativo em produção (a chave
  `UPTIMEROBOT_API_KEY` não está definida nos arquivos `.env` do repositório; o
  script existe para criar o monitor, mas não há registro de execução em produção).
  A página `/status` afirma que o monitoramento externo "é executado por serviço
  independente (UptimeRobot)" — **é texto fixo**, e a verificação dessa afirmação
  está pendente na T-05.
- Se há **conta criada** no Google Search Console ou no Bing para o domínio.
- Se existe contagem de visitas em **qualquer painel** (Vercel, Cloudflare,
  Supabase) usada informalmente pela equipe — o repositório não tem registro.
