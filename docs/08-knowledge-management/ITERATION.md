# Iteração

Como o projeto avança: o ciclo, o que define uma iteração "pronta", e as regras que
impedem que uma iteração piore o que a anterior construiu.

Documentos de apoio: [`DEVELOPMENT.md`](../03-development-process/DEVELOPMENT.md)
(ciclo de uma mudança), [`TASK_BREAKING_DOWN.md`](../03-development-process/TASK_BREAKING_DOWN.md)
(como fatiar), [`MEMORY.md`](MEMORY.md) (o que já foi decidido),
[`CHANGELOG.md`](CHANGELOG.md) (o que já foi feito).

## 1. O ciclo

```
   ┌─ pergunta verificável ─────────────────────────────────┐
   │  1. Qual afirmação eu quero poder fazer ao final?      │
   └────────────────────┬───────────────────────────────────┘
                        ▼
   ┌─ eliminação de premissa ───────────────────────────────┐
   │  2. Medir / sondar / ler ANTES de projetar             │
   │     (o projeto já construiu em cima de premissa falsa) │
   └────────────────────┬───────────────────────────────────┘
                        ▼
   ┌─ fatia ────────────────────────────────────────────────┐
   │  3. Entregável + gate + contrato de falha              │
   │     (cabe em menos de um dia)                          │
   └────────────────────┬───────────────────────────────────┘
                        ▼
   ┌─ verificação ──────────────────────────────────────────┐
   │  4. typecheck · verify:* · build · e2e · detect        │
   └────────────────────┬───────────────────────────────────┘
                        ▼
   ┌─ comunicação ──────────────────────────────────────────┐
   │  5. Doc temático + CHANGELOG + MEMORY (se decisão)     │
   └────────────────────┬───────────────────────────────────┘
                        ▼
                   próxima fatia
```

O ponto **2** é o que distingue este ciclo do ciclo comum. Em dois casos
documentados, medir primeiro evitou trabalho jogado fora:

| Premissa | Realidade | Trabalho evitado |
|---|---|---|
| "O TCU exige credenciais (401)" | O host não existe; há API pública aberta em outro endereço | Construir ETL sobre um beco sem saída |
| "Busca em 4.190 ms = falta de índice" | `Seq Scan` com 0,5 ms; era *cold start* | Criar `pg_trgm` como prioridade, resolvendo nada |

## 2. O que uma iteração **entrega**

Uma iteração deste projeto entrega, no mínimo:

| Item | Obrigatório? |
|---|---|
| Código (ou decisão documentada, quando não há código) | ✅ |
| Gate que falha se o comportamento regredir | ✅ para motor, página renderizada, acessibilidade e SEO |
| Atualização do documento temático afetado | ✅ |
| Entrada em [`CHANGELOG.md`](CHANGELOG.md) | ✅ por bloco significativo (não por commit) |
| Entrada em [`MEMORY.md`](MEMORY.md) | Só se houve **decisão** ou **defeito não óbvio** |
| Atualização de [`TASKS.md`](../03-development-process/TASKS.md) | Se o item estava lá |

**Sobre o gate:** a regra é dura e é o que dá valor à iteração. Um teste que só
confirma o caminho feliz não é gate. O que existe neste projeto como gate de verdade,
por tipo:

| Tipo de mudança | Gate |
|---|---|
| Motor IDIP / identidade | caso novo em `verify-scoring.ts` / `verify-identity.ts` |
| Divergência UI ↔ fórmula | caso em `tests/e2e/home.spec.ts` (bloco de consistência, que lê o código-fonte) |
| Página renderizada | caso em `tests/e2e/` + `npm run e2e` |
| Acessibilidade | rota nova em `tests/e2e/acessibilidade.spec.ts` com as tags WCAG 2.2 |
| SEO (robots, sitemap, canonical, título) | caso em `tests/e2e/seo.spec.ts` |
| Dados | carga idempotente: rodar duas vezes dá o mesmo resultado |

## 3. Regras de iteração

### 3.1 Nunca deixe a iteração piorar o que existe

Se a iteração não puder ser concluída, ela é **revertida**, não deixada pela metade.
A pergunta de cada fatia: *"posso abandonar isto sem deixar o repositório pior?"* Se a
resposta é não, a fatia está grande demais.

### 3.2 Documentação divergente do código é defeito

Não é dívida estética. O projeto já corrigiu isto três vezes porque a divergência
**custa credibilidade**:

| Divergência | Correção |
|---|---|
| Home anunciava "IDIP v1.0" com o motor em v1.1 | UI passou a importar a versão do motor + teste de regressão (`52f45d9`, `verify-scoring` WEB-001) |
| `/status` e `/metodologia` afirmavam que TSE e Querido Diário estavam bloqueados; ambos respondiam 200 | textos corrigidos (`e5956f4`) |
| Documentação dizia `force-dynamic` desliga todo cache | corrigido com a citação da documentação do Next (`9917add`) |

**Regra prática:** ao alterar um comportamento, procure quem **afirma** aquele
comportamento. Pode estar em `/status`, `/metodologia`, `/faq`, em um comentário de
código ou em `docs/`.

### 3.3 Prefira degradar a quebrar

Toda página pública que depende do banco tem contrato de falha explícito: a prova
desaparece, a página continua. Ver
[`ERROR_HANDLING.md`](../07-operations-marketing/ERROR_HANDLING.md) §3. Aplicar em
toda iteração nova.

### 3.4 Meça antes e depois, na mesma configuração

O projeto já combinou duas medições de estados diferentes (1,5 MB sem paginação com
354 ms pós-`gru1`) e isso descreve um estado que nunca existiu. Ao otimizar, registre
**data e configuração** junto do número.

### 3.5 Uma decisão não se rediscute sem medição nova

`MEMORY.md` existe para isso. Se você quer reverter uma decisão (por exemplo, "vamos
usar GSAP mesmo assim"), a réplica não é opinião — é uma medição ou um fato novo
(licença mudou, requisito apareceu). Ver
[`RULES.md`](../03-development-process/RULES.md) §5.

### 3.6 Não invente escopo para parecer produtivo

O projeto tem um backlog **real**, com itens verificáveis
([`TASKS.md`](../03-development-process/TASKS.md)). Não há necessidade de inventar
trabalho de produto: a lacuna mais grave — a dimensão de **maior peso** do IDIP
(Integridade, 25%) operando em baseline neutro por ausência de `LegalRecord` — está
aberta, e o caminho para destravá-la já foi identificado.

## 4. Tamanho e ritmo das iterações (o que o histórico mostra)

Leitura do `git log`: o projeto teve **um pico concentrado** — 2026-09-28 a
2026-09-29 (fundação: dados reais, IDIP, perfil, jurídico, votação, produção) e
2026-10-12 (21 commits: SEO, acessibilidade, performance, documentação). Entre eles,
poucos commits.

| Bloco | Natureza |
|---|---|
| **28–29/09** | Fundação. Muitas features por commit, sem gate de página renderizada |
| **30/09** | LGPD, rate limiting, CI, IDIP v1.1 |
| **03/10** | Reestruturação em monorepo |
| **12/10** | Qualidade: SEO, a11y, performance, medição, documentação |

**Padrão legível:** o projeto alterna entre **construir** e **consolidar**. O bloco de
12/10 é majoritariamente consolidação — corrigir contraste em 167 lugares, medir
latência, criar gate de acessibilidade, escrever documentação. Isso é iteração
saudável, e é o que permitiu que o projeto tivesse gate automatizado hoje.

**O que o histórico sugere para o próximo bloco:** a consolidação de 12/10 resolveu
qualidade de apresentação. O que resta é **profundidade de dado** (T-01: `LegalRecord`)
e **cobertura de teste** (T-04: nenhuma rota de API testada). São as duas frentes onde
o projeto tem lacuna verificável, não hipotética.

## 5. Quando parar e escrever um documento em vez de código

Três situações em que a iteração correta **não produz código**:

1. **É uma decisão, não uma tarefa.** Exemplo: T-13
   (`prefers-reduced-motion` em animação JS) é uma escolha entre escrever `matchMedia`
   à mão e adotar Motion. Escreva as opções, o critério e a decisão.
2. **Falta verificação.** Se você não consegue formular a pergunta falsificável, o
   próximo passo é **pesquisar**, no padrão de [`RESEARCH.md`](RESEARCH.md): método
   declarado, URL por afirmação, **não verificado** onde não confirmou, veredito e o
   que aproveitar exatamente.
3. **É bloqueio externo.** Marque ⛔ com o bloqueio nomeado. A mesma condição por três
   rodadas é bloqueio, não dificuldade.

Os três casos **válidos** e **honestos** — este projeto prefere um documento curto
dizendo "não se aplica ainda, e aqui está o que seria necessário" a um documento longo
fingindo processo.

## 6. Fim de iteração: checklist

```bash
# O gate exato do CI
npx prisma generate --schema=apps/web/prisma/schema.prisma
npm run typecheck
npm run verify:scoring
npm run verify:identity
npm run build

# Se mexeu em UI
npm run e2e
npx impeccable detect apps/web/src     # exit 0
```

E, manualmente:

- [ ] Renderizado conferido em **375px / 768px / 1280px**
- [ ] Sem overflow horizontal
- [ ] `MEMORY.md` atualizado **se** houve decisão ou defeito não óbvio
- [ ] `CHANGELOG.md` atualizado (bloco significativo)
- [ ] `TASKS.md` atualizado se o item estava listado
- [ ] Documento temático afetado corrigido
- [ ] Nenhum número exibido sem consulta real ao banco
- [ ] Nenhuma versão de metodologia redigitada
- [ ] Commit em português, imperativo

## 7. Não verificado

- Se existe **cadência de release** planejada. Não há tags, não há releases, não há
  documento de roadmap com datas no repositório. Ver
  [`DEPRECATION_POLICY.md`](DEPRECATION_POLICY.md) §1.
- Se o projeto tem **marcos ou metas** definidos fora do repositório.
- A duração real de cada bloco de trabalho — o `git log` mostra datas de commit, que
  não são a mesma coisa que duração de iteração (o pico de 12/10 tem 21 commits no
  mesmo dia, o que sugere uma sessão longa ou trabalho acumulado).
