# Método de quebra de tarefas

Como transformar um item de [TASKS.md](TASKS.md) em trabalho executável sem
sessões de "investigação infinita". O método é derivado do que este repositório já
faz na prática — cada princípio abaixo tem um exemplo real do projeto.

## 1. O problema que este método resolve

Neste repositório, tarefa mal quebrada tem três sintomas reconhecíveis, todos já
observados:

| Sintoma | Exemplo real |
|---|---|
| **Premissa errada faz o trabalho ser jogado fora** | O ETL jurídico afirma "TCU: api-publica retorna 401". A sondagem ao vivo mostrou que `api-publica.tcu.gov.br` não resolve em DNS — mas existe uma API pública sem autenticação em outro host. A premissa certa teria mudado o escopo |
| **Medição vira conclusão** | 4.190 ms para a busca foi interpretado como falta de índice. Era *cold start*; o `EXPLAIN ANALYZE` mostrou 0,5 ms. Uma tarefa de "criar índice" teria sido trabalho perdido |
| **Defeito visível só na tela renderizada** | A home anunciava IDIP v1.0 com pesos antigos enquanto o motor rodava v1.1. Nenhum `typecheck` pega isso — só um teste que compara UI com motor |

Conclusão operacional: **a primeira fatia de qualquer tarefa é eliminar a
premissa**, não escrever código.

## 2. Os cinco portões

Toda tarefa atravessa estes portões, na ordem. Não pule para o portão 3.

### Portão 1 — Qual é a pergunta verificável?

Escreva a tarefa como uma afirmação que pode ser **falsificada** por um comando,
uma medição ou uma leitura de arquivo. Se não puder, a tarefa ainda é um tema.

| Tema (ruim) | Pergunta verificável (bom) |
|---|---|
| "Melhorar a integridade dos dados" | "Quantos `LegalRecord` existem no banco e quantos têm `sourceUrl`?" |
| "Otimizar o ranking" | "Quanto pesa o HTML de `/ranking` hoje, com a paginação em vigor?" |
| "Melhorar tratamento de erro" | "Quantas rotas usam `catch {}` sem binding?" |

Comando de exemplo — a resposta cabe em uma linha:

```powershell
Select-String -Path "apps\web\src\app\api\*\route.ts","apps\web\src\app\api\*\*\route.ts" -Pattern "catch\s*\{"
```

### Portão 2 — O que já foi decidido sobre isso?

**Sempre** procure a decisão antes de propor solução. Neste repositório, decisões
passadas restringem fortemente o espaço de solução:

- Licença AGPL-3.0-only elimina GSAP, React Bits, Aceternity e 21st.dev.
- CSP sem `media-src` elimina áudio/vídeo remoto; `connect-src 'self'` elimina
  `fetch` para terceiro.
- Tailwind v4 sem `tailwind.config.js` elimina qualquer receita de instalação que
  peça esse arquivo.
- "Sem dependência nova sem necessidade comprovada" elimina Motion enquanto não
  houver animação JS.

Fontes onde as decisões vivem, em ordem de autoridade:

1. `AGENTS.md` — regras de produto
2. [`RULES.md`](RULES.md) — regras de engenharia consolidadas
3. [`docs/08-knowledge-management/MEMORY.md`](../08-knowledge-management/MEMORY.md)
   — decisões e armadilhas com data
4. [`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md)
   — decisões de plataforma, com medição
5. [`docs/design/avaliacao-ferramentas.md`](../design/avaliacao-ferramentas.md)
   — decisões de ferramenta de UI

Se a sua solução contradiz uma decisão registrada, ou você tem medição nova que a
invalida (registre isso), ou você está errado.

### Portão 3 — Qual é o contrato de falha?

Todo código deste projeto que depende do banco e serve página pública responde
antes a "e quando falhar?" do que a "e quando funcionar?". O padrão está em
[`RULES.md`](RULES.md) §3.6 e tem três implementações de referência:

- `apps/web/src/lib/hero-stats.ts` → erro devolve `null`, faixa não renderiza
- `apps/web/src/lib/sitemap.ts` → erro devolve fallback estático, log por
  `console.warn`
- rotas de API → `503` com `{ error, message }`

Antes de codificar, escreva a resposta a: *banco fora, banco vazio, dado
parcialmente ausente, usuário não autenticado.* Se a resposta for "mostra zero",
está errado.

### Portão 4 — Qual é o gate de verificação?

A fatia só está pronta quando existe um comando que **falha** se ela regredir.

| Tipo de mudança | Gate |
|---|---|
| Motor IDIP / identidade | caso novo em `apps/pipeline/scripts/verify-scoring.ts` ou `verify-identity.ts` |
| Página renderizada | caso novo em `tests/e2e/` (e, se exibe dado, um que leia o código-fonte como o bloco de consistência UI↔motor) |
| Acessibilidade | acrescentar a rota em `tests/e2e/acessibilidade.spec.ts` com as tags WCAG 2.2 |
| SEO | `tests/e2e/seo.spec.ts` |
| Contrato de API | hoje **não há** gate unitário (ver T-04) — escreva o teste junto da fatia, ou registre a dívida |
| Dados | carga idempotente: rodar duas vezes tem de dar o mesmo resultado |

**Regra do repositório:** mudança de UI que só passou por `dev` não está
verificada (`AGENTS.md`). Confira a tela renderizada em 375px / 768px / 1280px.

### Portão 5 — A fatia é reversível?

Uma fatia deve poder ser abandonada sem deixar o repositório pior. Na prática:

- Migração de schema: existe `down` ou o campo é nullable?
- Dado de produção: qual é o `DATABASE_URL` e como reverter a carga?
- Dependência nova: dá para remover sem tocar em 20 arquivos?

## 3. Granularidade: o teste da meia jornada

Uma fatia está bem dimensionada quando:

- **cabe em menos de um dia** de trabalho focado;
- **produz um artefato verificável** (teste, medição, arquivo, migração);
- **não deixa estado ambíguo** — ao final, o CI está verde ou você sabe
  exatamente o que ficou vermelho e por quê.

Sinais de fatia grande demais (todas já apareceram aqui):

- "refatorar as rotas de API" → quanto? quais? com que gate?
- "migrar para Vitest" → qual é a primeira rota testada?
- "arrumar a acessibilidade" → qual critério, em qual página, com qual ferramenta?

Sinais de fatia pequena demais:

- "adicionar `force-dynamic` em uma rota" sem citar **por que** ela precisa (o
  critério é: a rota consulta estado vivo?).

## 4. Ordem de execução: risco de premissa primeiro

Ordene as fatias por **(chance de estar errado) × (custo de descobrir tarde)**.
Isso produz uma ordem diferente da ordem "natural" de implementação.

Exemplo aplicado ao T-01 (carga de integridade):

| # | Fatia | Por que nesta ordem |
|---|---|---|
| 1 | Reproduzir **uma** requisição à API do TCU e guardar a resposta bruta | Se o endpoint não funcionar do ambiente de execução, todo o resto morre. Custo: minutos |
| 2 | Escrever o parser do CSV (Latin-1, separador `\|`) e imprimir contagens, **sem gravar no banco** | Valida o formato antes de qualquer schema |
| 3 | Decidir o tratamento de homonímia e documentar a decisão | Decisão cara de reverter depois de gravar |
| 4 | Migração/schema de `LegalRecord`, se necessário | Só agora o schema é conhecido |
| 5 | `load-legal.ts` idempotente | Carga |
| 6 | Teste de que `CLEARED`/`ARQUIVADO` não vaza para `/api/politicians/[id]` | Gate |
| 7 | Atualizar `/metodologia` e `/status` para refletir o dado real | Efeito visível |

Note que **as três primeiras fatias produzem zero código de produto** — e é
correto: elas existem para não construir em cima de premissa falsa.

## 5. Template de fatia

Copie e preencha antes de começar:

```markdown
### F-<n> — <título imperativo curto>

**Pergunta.** <a afirmação falsificável que esta fatia resolve>
**Premissa atual.** <o que assumimos hoje> — <como vou confirmar>
**Não-objetivo.** <o que esta fatia explicitamente NÃO faz>

**Entregável.** <arquivo(s) ou medição concreta>
**Gate.** <comando que falha se regredir>
**Contrato de falha.** <o que acontece com banco fora / vazio / sem permissão>

**Evidência coletada.** <comando + resultado>
**Decisão tomada.** <se houve, e onde foi registrada>
**Feito quando.** <critério objetivo de encerramento>
```

O campo **Não-objetivo** é o que impede a fatia de crescer. O campo **Evidência
coletada** é o que impede a próxima pessoa de refazer a investigação — ao final,
ele vai para [MEMORY.md](../08-knowledge-management/MEMORY.md).

## 6. Quando a tarefa não se deixa quebrar

Se depois do portão 1 você não consegue formular uma pergunta verificável, a
tarefa é uma das três coisas:

1. **Uma decisão, não uma tarefa.** Escreva as opções, o critério de escolha e a
   decisão. Exemplo: T-13 (`prefers-reduced-motion` em animação JS) é uma decisão
   entre escrever `matchMedia` à mão e adotar Motion — não é código.
2. **Uma pesquisa.** Vá para
   [RESEARCH.md](../08-knowledge-management/RESEARCH.md): o padrão de pesquisa
   deste projeto é declarar método, citar URL de cada afirmação, marcar
   **não verificado** onde não confirmou, e terminar com veredito e o que
   aproveitar exatamente.
3. **Uma dependência externa.** Marque ⛔ em TASKS.md com o bloqueio nomeado. Não
   fique em loop: a mesma condição por três rodadas é bloqueio, não dificuldade.

## 7. Após a fatia

1. Rode os gates de [TESTING.md](TESTING.md) — os mesmos do CI.
2. Atualize o documento que ficou desatualizado. Documentação divergente do código
   é defeito, não dívida estética: `/status` afirmando que uma fonte está bloqueada
   quando ela responde 200 é um defeito de credibilidade, e este projeto já foi
   corrigido por isso.
3. Se a fatia mudou uma regra ou revelou uma armadilha, registre em
   [`MEMORY.md`](../08-knowledge-management/MEMORY.md) — com data, motivo e o que
   foi descartado.
4. Se o item saiu de TASKS.md, marque. Backlog que não reflete a realidade é pior
   que backlog nenhum.
