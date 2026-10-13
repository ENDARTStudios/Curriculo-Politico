# STF_SCORING — IDIP-STF (Índice de Desempenho e Integridade Pública do Judiciário)

Metodologia do índice aplicado a **ministros do Supremo Tribunal Federal**.

Diferença de status em relação ao IDIP: o IDIP (Legislativo/Executivo) tem
**motor implementado, testado e em produção** — ver
[SCORING_METHODOLOGY.md](SCORING_METHODOLOGY.md). O IDIP-STF tem **metodologia
definida e pesos publicados**, mas **motor não implementado e sem dado coletado**.
Este documento descreve o que está especificado e o que ainda não existe, sem
misturar os dois.

> **Numeração de seções é contrato.** O IDIP-STF usa a mesma numeração do IDIP:
> **§2** = pesos, **§4** = travas de integridade, **§5** = regra de ranking.
> Assim os comentários de código que apontam para `SCORING_METHODOLOGY.md §2/§4/§5`
> permanecem válidos quando o índice do Judiciário for implementado.

---

## §1 — Por que o Judiciário precisa de índice próprio

Ministro do STF **é nomeado, não eleito**. Três consequências que quebram a
aplicação direta dos pesos do Legislativo:

1. **Não há responsabilização nas urnas.** As dimensões que pressupõem resposta ao
   eleitor (Aprovação, Campanha) não têm o mesmo significado.
2. **Dimensões de mandato não existem.** Não há "sessão deliberativa" com
   presença a medir no sentido parlamentar, nem base eleitoral, nem prestação de
   contas de campanha.
3. **Medir a coisa errada com aparência de rigor** é pior que não medir. Aplicar
   25/18/15/10/10/10/7/5 a um ministro produziria um número com cara de auditoria
   e significado nenhum.

Ao mesmo tempo, **não avaliar o STF não é uma opção neutra**: o tribunal decide
sobre os próprios políticos que a plataforma avalia, gasta orçamento público e
seus ministros têm mandato até a aposentadoria — não há eleição como válvula de
escape. É poder público, e a plataforma existe para tornar poder público
auditável. A página `/stf` registra esse raciocínio: manter a página **documenta
a lacuna**; removê-la esconderia.

O que **é** mensurável num tribunal constitucional é outra lista:

| Pergunta | Dimensão |
|---|---|
| Ele produz? | Produtividade |
| Decide com coerência em casos semelhantes? | Consistência |
| Trabalha à luz do público? | Transparência |
| A conduta resiste ao escrutínio? | Integridade |

---

## §2 — Pesos do IDIP-STF

Definidos em `DIMENSOES_STF`, em `apps/web/src/lib/methodology.ts` — a **mesma
fonte** que a home usa para exibir pesos. Isso é deliberado: `/` e `/stf` não
podem divergir.

| Dimensão | Chave | Peso | O que mede |
|---|---|---|---|
| **Integridade** | `integrity` | **25%** | Condenações transitadas em julgado, impedimentos e suspeições |
| **Produtividade** | `productivity` | **25%** | Relatorias concluídas, votos proferidos e participação em julgamentos |
| **Consistência** | `consistency` | **30%** | Coerência decisória em casos semelhantes |
| **Transparência** | `transparency` | **20%** | Publicidade dos votos, fundamentação das decisões e resposta a pedidos de vista |
| | | **100%** | A soma é exibida na própria tabela de `/stf`, de propósito |

### §2.1 Por que Consistência é a maior dimensão (30%)

Previsibilidade é o que se espera de um **tribunal constitucional**. Um ministro
pode ser produtivo e ainda assim produzir insegurança jurídica se decidir de
formas diferentes em casos semelhantes. Consistência é a dimensão que captura
isso, e por isso vale mais que Produtividade.

### §2.2 Por que Integridade mantém 25%

É a **âncora do índice** — o mesmo piso de conduta nos três perfis (Legislativo,
Executivo, Judiciário). A trava de integridade (§4) vale aqui também, e o rodapé
da tabela em `/stf` diz isso explicitamente.

### §2.3 Por que os pesos são exatamente quatro

`DIMENSOES_STF` espelha **exatamente** os quatro campos de dimensão de
`StfScore` no schema:

```
StfScore.integrityScore     = 25
StfScore.productivityScore  = 25
StfScore.consistencyScore   = 30
StfScore.transparencyScore  = 20
```

**Metodologia que o banco não pode honrar é metodologia decorativa.** Um peso sem
campo correspondente no banco não teria onde ser gravado, e o índice exibiria uma
dimensão que nunca poderia ser calculada. O comentário no schema sobre
`integrityScore Float @default(50)` registra exatamente esse raciocínio.

Qualquer quinta dimensão futura exige, **no mesmo PR**: campo em `StfScore`,
entrada em `DIMENSOES_STF` e migration.

---

## §3 — Fórmula especificada

> **Não implementada.** Não existe função equivalente a `calculateIDIP` para o
> STF em `packages/idip`. O que segue é a especificação derivada do IDIP e dos
> campos existentes — a ser implementada com os mesmos invariantes.

### §3.1 Estrutura (espelhando o IDIP)

```
IDIP_STF = Σ (dimensão_i × peso_i)          com integridade já travada
           pesos: 0.25 / 0.25 / 0.30 / 0.20  (somam 1.00)
```

Invariantes obrigatórios, herdados de `calculateIDIP`:

1. Soma dos pesos verificada na carga do módulo (lança se ≠ 1).
2. Cada dimensão validada em 0–100; valor inválido (`NaN`, fora do intervalo)
   **lança**, não é silenciado.
3. Trava de integridade automática (§4).
4. `breakdown` por dimensão devolvido para auditoria
   (`weight`, `rawValue`, `weightedValue`).
5. Nota final com uma casa decimal.
6. Soma dos pesos exibida na UI (`/stf` já exibe — é o invariante visível).

### §3.2 Insumos disponíveis no schema

| Dimensão | Campos de `StfVote` / `StfCase` / `StfJustice` | Observação |
|---|---|---|
| Produtividade | `StfVote.wasRapporteur`, contagem de votos por período, `StfVote.voteDate`, `StfJustice.active` | Relatorias e votos são contáveis |
| Consistência | `StfVote.dissent` (divergência), `StfVote.voteDirection` ("PROCEDENTE"/"IMPROCEDENTE"/"PARCIAL"), `StfCase.category` ("ADI", "ADPF", "RE", "HC") | Depende de agrupar casos **semelhantes** — o critério de semelhança é decisão metodológica ainda não tomada |
| Transparência | `StfCase.status`, `decisionDate`, publicidade do voto | **Não há campo de pedido de vista** no schema; "resposta a pedidos de vista" é descrição aspiracional |
| Integridade | — | **Nenhum campo.** Não há `LegalRecord` do ministro nem tabela equivalente; equacionar isso é decisão aberta |

### §3.3 Insumos que faltam (a implementar antes do cálculo)

| Lacuna | Impacto |
|---|---|
| Não há campo de tempo de tramitação no `StfCase` (só `decisionDate`) | Impede qualquer dimensão de celeridade (§6) |
| Não há campo de pedido de vista | Transparência fica sem uma das três descrições públicas |
| Não há registro de impedimento/suspeição | Integridade fica sem insumo próprio; a descrição da UI menciona isso |
| `StfVote.voteDirection` é texto livre | Cálculo de Consistência exige conjunto fechado de valores |
| Não há agrupamento de "casos semelhantes" | Consistência não é calculável sem definir semelhança (por `category`, por `assuntos`, por tema?) |

**Consequência honesta:** das quatro dimensões publicadas, apenas **duas**
(Produtividade e uma parte de Consistência) têm insumo direto no schema atual.
Implementar o motor exige decidir essas lacunas — é [ROADMAP B2](../01-product-discovery/ROADMAP.md),
não um ajuste de código.

---

## §4 — Travas de integridade

**Regra:** as travas de integridade **valem também para o Judiciário**. Isso está
declarado na interface (`/stf`, rodapé da tabela de pesos) e em `DESCRICAO.integrity`
na própria página:

> "Condenações transitadas em julgado, impedimentos e suspeições. Mesma trava do
> IDIP: zera a dimensão e limita a nota."

Pela mesma lógica do IDIP ([SCORING_METHODOLOGY.md §4](SCORING_METHODOLOGY.md)):

1. Integridade vai a **0**.
2. Nota final limitada a **`HARD_CAP = 39.9`**.
3. Termômetro **RED** (se o IDIP-STF adotar o TIC — ver §5.3).
4. `hardCapApplied = true` registrado para auditoria.

### §4.1 Estado real

**Nada disso pode ser executado hoje.** Motivos, em ordem:

1. Não existe motor de cálculo do IDIP-STF.
2. Não existe campo de trava em `StfScore` — nada como
   `hasFinalCondemnation` / `hasRejectedAccounts`. As travas do IDIP são
   parâmetros de entrada de `calculateIDIP`; o equivalente do STF não foi
   definido.
3. Não há fonte de dado de integridade para ministros. `LegalRecord` aponta para
   `Person` (político eleito), não para `StfJustice`; e `LegalRecord` está
   **vazio** em produção.
4. As tabelas do STF estão **vazias** — não há o que travar.

A página `/stf` publica essa condição **antes** da metodologia, de propósito: o
visitante precisa saber que ainda não há nota antes de ler pesos que pareceriam
estar em uso.

---

## §5 — Regra de ranking

### §5.1 A regra que se aplica

> **Confiança < 60 fica fora do ranking.**

`StfScore` tem `confidenceScore`, exatamente como `Score`. A regra do IDIP
([SCORING_METHODOLOGY.md §5](SCORING_METHODOLOGY.md)) se aplica sem alteração: um
ministro com dado insuficiente não entra em ordenação comparativa e é apresentado
em separado, sem posição. A razão é a mesma — baseline neutro e dado parcial
produzem comparação enganosa.

### §5.2 O que a página faz hoje

`/stf` **não ordena** e **não cria ranking**. Ela:

- lista os ministros `active: true` em ordem alfabética (`orderBy: { name: "asc" }`);
- inclui o score mais recente (`orderBy: { calculatedAt: "desc" }, take: 1`);
- informa quantos têm nota publicada ("N de M ministros com nota publicada");
- mostra `finalScore.toFixed(1)` quando existe, ou "Sem pontuação ainda".

Ou seja: a rota está preparada para exibir nota, mas **não implementa a regra de
corte de confiança** — porque não há score para cortar. Ao implementar o motor,
`/stf` precisa ganhar a mesma partição `ranked` / `insufficient` de
`/partidos/[acronym]`.

### §5.3 Pendência de decisão: o IDIP-STF tem Termômetro?

**Em aberto.** `StfScore` **não tem** campo `ReliabilityStatus`. O IDIP usa o TIC
ao lado da nota como parte central do produto ("Nota alta não basta: existe o
risco"). Aplicar o TIC ao Judiciário exige responder:

1. O que é "GRAY" para um ministro — qual conjunto de fontes conta para a
   completude?
2. O que é "YELLOW" — dado incompleto, ou divergência decisória elevada?
3. O que é "GREEN" — o que significa "dados completos" num tribunal?

Enquanto isso não for decidido, a página exibe apenas a nota. Registrado como
decisão em aberto em [ADR.md](ADR.md#adrs-em-aberto-decisão-ainda-não-tomada).

### §5.4 Índice separado, não uma linha do ranking de eleitos

O IDIP-STF é um **índice próprio**, e não uma categoria do ranking de políticos.
Motivo: misturar nomeados e eleitos numa mesma ordenação sugeriria comparação
válida entre coisas medidas de formas diferentes. É a mesma razão pela qual os
pesos são próprios (§1).

---

## §6 — Por que NÃO existe dimensão de celeridade

Esta seção existe para que a decisão não seja "refeita" por engano no futuro —
e porque a dimensão **já existiu** na interface e foi removida.

### §6.1 O defeito original

A versão anterior de `/stf` listava **cinco** dimensões, incluindo **"Celeridade"**
com **15%** dos pesos. A soma naquela versão não batia com o que o schema podia
armazenar.

### §6.2 A causa

`StfCase` tem **`decisionDate`** e **não tem** data de autuação, distribuição ou
recebimento:

```prisma
model StfCase {
  ...
  decisionDate DateTime?   // ← só isto
}
```

Sem o **marco inicial**, tempo até a decisão é **imensurável**. Qualquer número de
celeridade seria inventado — não haveria como calcular "dias até decidir" sem
saber o dia em que o caso chegou.

### §6.3 A correção

1. A dimensão foi **eliminada**, não estimada.
2. Os pesos passaram a vir de `@/lib/methodology` (mesma fonte da home) e a
   espelhar exatamente os campos de `StfScore` — quatro dimensões, não cinco.
3. O comentário em `methodology.ts` registra o motivo, e o comentário em
   `/stf/page.tsx` registra o histórico: *"Metodologia que o banco não pode
   honrar é metodologia decorativa."*

### §6.4 Se a celeridade for desejada no futuro

O caminho é **adicionar o dado**, não o peso: incluir a data de autuação/
distribuição em `StfCase` (migration + campo no ETL) e então reavaliar a
distribuição de pesos do §2 — o que exige redefinir de onde saem os pontos, já
que a soma deve continuar em 100%.

---

## §7 — Estado de implementação (checklist honesto)

| Item | Status | Evidência |
|---|---|---|
| Metodologia definida (4 dimensões, pesos, racional) | ✅ | `apps/web/src/lib/methodology.ts` (`DIMENSOES_STF`), `/stf` |
| Pesos publicados na UI com a soma exibida | ✅ | `/stf`, `tests/e2e/home.spec.ts` (3 perfis) |
| Schema preparado | ✅ | `StfJustice`, `StfCase`, `StfVote`, `StfScore` |
| Campos do schema espelham os pesos exatamente | ✅ | 4 campos de dimensão em `StfScore` |
| Página pública com aviso de coleta pendente | ✅ | `/stf` (bloco âmbar acima da metodologia) |
| Motor de cálculo | ❌ | Não existe função em `packages/idip` |
| Teste do motor / sincronia WEB-001 estendida a `DIMENSOES_STF` | ❌ | WEB-001 cobre Legislativo e Executivo; **não** cobre `DIMENSOES_STF` |
| ETL de decisões | ❌ | `StfJustice`/`StfCase`/`StfVote` vazios |
| Composição do tribunal cadastrada (11 assentos) | ❌ | `StfJustice` vazio; `/stf` declara que será o primeiro passo |
| Trava de integridade aplicável | ❌ | Sem campo de trava, sem fonte de integridade para ministros |
| Termômetro (TIC) aplicado ao Judiciário | ❌ / decisão aberta | `StfScore` não tem `ReliabilityStatus` (§5.3) |
| Regra de corte de confiança < 60 em `/stf` | ❌ | Página lista alfabeticamente, sem partição |

**Lacuna de teste identificada:** o WEB-001 valida a sincronia UI ↔ motor apenas
para `LEGISLATIVE` e `EXECUTIVE`. `DIMENSOES_STF` não tem contraparte no motor —
o que é coerente enquanto o motor não existe, mas significa que **hoje não há
nenhum teste** garantindo que os quatro pesos do STF somem 100%. A soma é
calculada em tempo de render (`DIMENSOES_STF.reduce(...)`) e exibida; um erro de
digitação apareceria na tela, não quebraria o CI.

---

## §8 — Estratégia de coleta (por que é a integração mais cara do projeto)

**Não existe API pública de processos do STF.** Isso foi testado e documentado em
`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §3:

| Tentativa | Resultado verificado |
|---|---|
| `portal.stf.jus.br/processos/` | **HTTP 403** após a primeira chamada; a busca é formulário HTML |
| URLs legadas de certidão | **404** (mortas) |
| `certidoes.stf.jus.br` | **HTTP 405** em todo GET — parece POST-only, não documentado |
| `jurisprudencia.stf.jus.br/api/search/search` | **HTTP 202** com corpo vazio — não utilizável |
| **DataJud (CNJ)** | Alias `api_publica_stf` → **HTTP 404**: o STF **não está** no DataJud |
| DataJud onde funciona (STJ, TSE, TRFs, TJs…) | Retorna **apenas metadados de capa e movimentos** — **sem nome de parte**. Não permite identificar ministro nem processo por pessoa |
| **Corte Aberta** (`transparencia.stf.jus.br`) | Bases **estatísticas agregadas** (acervo, decisões, tempo de tramitação) em XLSX/CSV — **não** serve para avaliação individual |

### §8.1 Caminho correto: LAI

O caminho legítimo é **LAI** (Lei 12.527/2011), via Fala.BR, pedindo o rol de
**Ações Penais (AP) e Inquéritos (Inq) de competência originária**, com número,
classe, relator, data e situação/trânsito em julgado. Prazo legal de 20 dias,
prorrogável por 10.

Isso é **processo administrativo, não código**. É a razão pela qual o IDIP-STF não
avança por engenharia: falta o dado, e o dado não está disponível por API.

### §8.2 O que é coletável primeiro

A **composição do tribunal** (nome, Presidente que indicou, data de posse,
aposentadoria) é o dado mais simples e mais estável — muda apenas quando há
nomeação. `/stf` declara isso: *"É o primeiro passo da integração, porque é o
dado mais simples de obter e o mais estável."* E aponta a fonte pública
(`portal.stf.jus.br`), os 11 assentos.

### §8.3 Restrição de uso

**Não** contornar os bloqueios (403 do portal, 405 de `certidoes.stf.jus.br`).
Além do risco jurídico, o Termo de Uso do DataJud restringe o uso a finalidades
**não comerciais** e exige dar ciência ao CNJ de publicações derivadas — ver
`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5.2 e
[PRICING_MONETIZATION.md](../01-product-discovery/PRICING_MONETIZATION.md) §3.

---

## §9 — O que o índice **não** mede

1. **Orientação ideológica do voto.** "O índice nunca avalia se um voto foi
   'progressista' ou 'conservador' — isso não é mensurável e não é o papel da
   plataforma." (texto de `/stf`.) Mede-se o que é verificável no processo.
2. **Mérito da decisão.** Se o tribunal decidiu "certo" ou "errado" é juízo
   político, não auditoria.
3. **Celeridade** — imensurável com o schema atual (§6).
4. **Popularidade, exposição midiática ou concordância com o governo.**

---

## §10 — Referências

- `apps/web/src/lib/methodology.ts` — `DIMENSOES_STF`, `ChaveDimensaoStf` (fonte dos pesos).
- `apps/web/src/app/stf/page.tsx` — página pública, texto de cada dimensão e aviso de coleta.
- `apps/web/src/app/page.tsx` — cartão "Judiciário" da home, com a nota "Sem nota publicada".
- `apps/web/prisma/schema.prisma` — bloco `StfJustice`/`StfCase`/`StfVote`/`StfScore`.
- [SCORING_METHODOLOGY.md](SCORING_METHODOLOGY.md) — o índice dos eleitos (mesma numeração de seções).
- [DATA_MODEL.md](DATA_MODEL.md) §8 — os models do Judiciário.
- [ADR-008](ADR.md#adr-008) — decisão registrada dos pesos próprios e da remoção da celeridade.
- `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §3 — testes ao vivo das fontes do STF.
- `tests/e2e/home.spec.ts` — asserção de que a home exibe a soma dos pesos dos **três** perfis.
- [ROADMAP B1–B3](../01-product-discovery/ROADMAP.md) — lacunas ordenadas.
