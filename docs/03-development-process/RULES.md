# Regras do projeto

Regras que existem porque já foram violadas, ou porque violá-las compromete a
proposta da plataforma. Não são preferências de estilo.

Fontes originais: `AGENTS.md` (regras de produto), `CONTRIBUTING.md` (regras de
contribuição),
[`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md)
(regras inegociáveis de UI).

## 1. Regras de produto que não se negociam

Transcritas de `AGENTS.md`, que é a fonte de verdade:

### 1.1 Linguagem jurídica estrita

Apenas **"Réu em Ação Penal"** e **"Condenação Transitada em Julgado"**. Nunca
"crime", "criminoso" ou qualquer juízo moral sobre pessoas — inclusive em
microcopy, rótulo de gráfico e texto alternativo de imagem.

Detalhamento e política editorial completa:
[`docs/04-api-integrations/CONTENT.md`](../04-api-integrations/CONTENT.md).

### 1.2 Neutralidade política e algorítmica

Nenhum viés partidário. **A votação popular nunca altera a nota** e a UI não pode
sugerir o contrário. A votação popular é uma camada de engajamento separada — está
documentado no cabeçalho de `apps/web/src/app/api/bills/[id]/vote/route.ts`.

Consequência prática: nada de ordenar partidos por espectro ideológico, nada de
adjetivo ("melhor", "pior") sobre legendas, e toda lista de comparação usa os
mesmos critérios técnicos.

### 1.3 Dados honestos

**Nenhum número exibido sem consulta real ao banco.** Se a consulta falha ou o
banco está vazio, o número desaparece — não vira zero.
`apps/web/src/components/HeroStats.tsx` implementa o corte:

```ts
if (!numeros || numeros.politicosAvaliados === 0) return null;
```

Pesos e versão da metodologia **derivam de `packages/idip/src/scoring.ts`** e são
espelhados em `apps/web/src/lib/methodology.ts`; nunca são redigitados na UI. A
home já divergiu assim: dizia IDIP v1.0 com pesos antigos enquanto o motor rodava
v1.1. Hoje existe um teste para isso
(`tests/e2e/home.spec.ts`, bloco "Consistência entre UI e motor IDIP") e uma
verificação Web-001 em `apps/pipeline/scripts/verify-scoring.ts`.

**Baseline neutro:** dimensão sem dados recebe 50 e isso é **identificado na
interface** (`ScoreBreakdown` mostra o selo "sem dados · neutro" por dimensão).
Não é permitido apresentar baseline como se fosse medição.

### 1.4 Acessibilidade AA é requisito, não melhoria

WCAG **2.2** AA, com gate automatizado em
`tests/e2e/acessibilidade.spec.ts`. A tag `wcag22aa` é obrigatória na lista —
sem ela o teste valida 2.1 e dá falsa conformidade. Ver
[ACCESSIBILITY.md](../07-operations-marketing/ACCESSIBILITY.md).

### 1.5 LGPD

Nunca exponha **CPF, endereço ou dado familiar**. Note que a API da Câmara
devolve CPF em claro (`/deputados/{id}` — ver
[`INTEGRATIONS.md`](../04-api-integrations/INTEGRATIONS.md) §6); a regra existe
justamente porque a fonte entrega esse dado e ele **não** pode ser propagado para
o banco do produto nem para a UI.

Registros judiciais **arquivados** ou com status `CLEARED` são ocultados
automaticamente do perfil público — filtro em
`apps/web/src/app/api/politicians/[id]/route.ts`.

## 2. Regras de contribuição

De `CONTRIBUTING.md`:

- **Fontes oficiais apenas.** Todo dado novo precisa de ETL com URL da fonte e
  `retrievedAt`.
- **Toda correção passa pela fonte oficial** — nunca editamos dados manualmente.
  Quem é o político afetado usa também o canal `/retificacao`.
- **Versionamento do IDIP:** qualquer mudança de fórmula exige bump de versão
  (`Score.version`) e atualização de `/metodologia` + `verify-scoring.ts`.
- **Testes primeiro** para os motores: mudanças em `scoring.ts`/`identity.ts`
  exigem casos novos em `apps/pipeline/scripts/verify-*.ts`.
- **Commit em português, imperativo:** `feat: adiciona X`, `fix: corrige Y`.
- **TypeScript estrito:** `tsc --noEmit` zerado é obrigatório.

## 3. Regras de engenharia

### 3.1 Idempotência é obrigatória no pipeline

Todas as cargas podem ser re-executadas (upsert / `createMany` com skip-existing).
Cargas grandes usam `createMany` em chunks — **nunca** upsert sequencial por
registro, que é lento no pooler (`apps/pipeline/README.md`).

### 3.2 Camada raw imutável

ETL grava JSON em `data/raw/`. A carga **nunca re-baixa**: reprocessar é
re-executar o `load-*`.

### 3.3 Mudança de dado de dimensão exige recálculo

Qualquer alteração em dados que alimentam dimensões do IDIP exige:

```bash
npm run recalculate-scores
npm run db:snapshot
```

### 3.4 Sem dependência nova sem necessidade comprovada

Regra explícita, usada como critério de corte na avaliação de ferramentas
([`docs/design/avaliacao-ferramentas.md`](../design/avaliacao-ferramentas.md)).
Corolários já aplicados:

- **Licença tem de ser compatível com AGPL-3.0-only.** GSAP (proprietária
  Webflow), React Bits (MIT + Commons Clause), Aceternity UI (licença
  customizada anti-redistribuição) e 21st.dev (instalação paga) foram recusados
  por licença, não por gosto.
- **Nada pode criar uma segunda autoridade de design system** concorrendo com os
  tokens de `apps/web/src/app/globals.css`.
- **Nada de efeito chamativo gratuito** — a estética é editorial/dados.

### 3.5 Uma única fonte de verdade para design tokens

Tailwind v4 CSS-first: tokens em `@theme` (`globals.css`). **`tailwind.config.js`
não existe e não deve ser criado.** Cores de estado do Termômetro (`GREEN`,
`YELLOW`, `RED`, `GRAY`) derivam do `enum ReliabilityStatus` e são aplicadas como
classes semânticas no componente — de propósito **não** viram token de marca, para
não convidar ao uso de "verde" fora do significado de estado.

### 3.6 Contrato de falha: a prova é opcional, a página não é

Padrão obrigatório em código que depende do banco e serve página pública:

- `apps/web/src/lib/hero-stats.ts` → qualquer erro devolve `null`; a faixa de
  prova não é renderizada e a home continua servindo promessa e CTA.
- `apps/web/src/lib/sitemap.ts` → se a consulta falhar, o índice e o arquivo base
  saem com as rotas estáticas; log via `console.warn`, nunca throw.
- APIs → erro de banco devolve `503` com envelope `{ error, message }`
  (`BANCO_INDISPONIVEL`), não um 500 cru.

Nunca renderize "0 políticos avaliados". Nunca quebre a página porque o banco caiu.

### 3.7 CSP e segurança de borda

`apps/web/src/middleware.ts` aplica CSP e headers de segurança em **todas** as
rotas (matcher exclui apenas `_next/static`, `_next/image`, `favicon.ico` e
`avatar-placeholder.svg`). A política atual:

```
default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Consequências que já inviabilizaram ferramentas:

- `connect-src 'self'` → componente que faz `fetch` para domínio externo **não
  funciona**.
- **Não há `media-src`** → áudio/vídeo remoto cai em `default-src 'self'` e é
  **bloqueado**.
- Não há `worker-src` nem `blob:` → qualquer coisa que instancie Worker ou use
  `blob:` URL é frágil.
- `img-src ... https:` é o único canal remoto liberado.

Ao adicionar qualquer recurso externo, verifique a CSP **antes** de escrever o
componente.

### 3.8 Rate limiting

O middleware implementa Token Bucket em memória, por instância
(`middleware.ts` §"Nota serverless"):

| Tier | Limite | Alvo |
|---|---|---|
| Geral | 60 req/min | `/api/*` — chave = usuário autenticado (JWT) e, sem sessão, IP |
| Crítico | 10 req/min | `POST /api/auth/register` e callbacks de login |

Resposta: `429` + `Retry-After` + `X-RateLimit-Limit` / `X-RateLimit-Remaining`.

**Limite conhecido e documentado no código:** os baldes são em memória, por
instância serverless, então o limite vale "por instância-visita". A proteção
distribuída completa por IP depende de Cloudflare/WAF na frente do deploy — **isso
não está implementado no repositório** (ver
[ERROR_HANDLING.md](../07-operations-marketing/ERROR_HANDLING.md) e
[MONITORING.md](../07-operations-marketing/MONITORING.md)).

### 3.9 Rotas de API ao tocar no banco

`export const dynamic = "force-dynamic"` em todas as rotas de API que consultam
banco — verificado nas 11 rotas em `apps/web/src/app/api/`. Não remova: é o que
impede o Next de tentar pré-renderizar uma rota que depende de estado vivo.

### 3.10 Não mexa em produção por acidente

Ver §5 de [SETUP.md](SETUP.md). `DATABASE_URL` decide o destino de todo script de
dados. Antes de qualquer script destrutivo, imprima o host da `DATABASE_URL` e
confirme que é o que você quer.

## 4. Regras de conteúdo e copy

De `AGENTS.md`, `CONTRIBUTING.md` e
[`docs/design/estrategia-marketing.md`](../design/estrategia-marketing.md):

1. A copy segue o funil **Gancho → Promessa → Prova → CTA** (a estratégia de
   conversão vive em `docs/design/estrategia-marketing.md`; não é duplicada aqui).
2. **Um** CTA primário por página.
3. UI sem frases opinativas. A plataforma descreve estado, não emite juízo.
4. Nenhuma promessa que o motor não cumpra. A versão e os pesos vêm do motor.
5. Títulos de página não duplicam o sufixo do template do layout
   (`"%s · Currículo Político"`) — há teste de regressão em `tests/e2e/seo.spec.ts`.
6. Toda mudança de interface exige justificativa de conversão **ou** de
   acessibilidade. Elementos decorativos que não servem a nenhum dos dois são
   removidos.

## 5. O que fazer quando a regra atrapalha

Nenhuma destas regras é imutável por dogma — mas mudá-las exige **registrar a
decisão**, não contorná-la em silêncio:

1. Escreva a decisão em
   [`docs/08-knowledge-management/MEMORY.md`](../08-knowledge-management/MEMORY.md),
   com data, motivo e o que foi descartado.
2. Atualize o documento que continha a regra (`AGENTS.md`, `RULES.md` ou o doc
   temático).
3. Se a regra existia por causa de um defeito medido, mantenha o teste que
   detectaria a volta do defeito.

Exemplo já registrado: a regra "não adicionar dependência de animação sem
necessidade comprovada" fez Motion ser avaliado e **não** adotado, mesmo sendo a
única biblioteca que resolve `prefers-reduced-motion` em animação JS
automaticamente — porque não há animação JS no projeto hoje.
