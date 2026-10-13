# SCORING_METHODOLOGY — IDIP (Índice de Desempenho e Integridade Pública)

Metodologia do motor de pontuação do Currículo Político. **Fonte de verdade do
código:** `packages/idip/src/scoring.ts`. Este documento descreve o que o motor
executa; se houver divergência, o código vence e este arquivo deve ser corrigido.

Versão vigente: **IDIP v1.1** (`packages/idip/package.json` = `1.1.0`;
`apps/web/src/lib/methodology.ts` = `METODOLOGIA_VERSAO = "1.1"`).

> **Numeração de seções é contrato.** Comentários no código apontam para seções
> específicas deste documento: **§2** = pesos, **§4** = travas de integridade,
> **§5** = regra de ranking. Não renumere sem atualizar os comentários.
>
> Referências existentes no código:
> `packages/idip/src/scoring.ts` (linhas 4 e 76),
> `apps/web/src/app/api/rankings/route.ts` (§5),
> `apps/web/src/app/ranking/page.tsx` (§5),
> `apps/web/src/app/partidos/page.tsx` (§5),
> `apps/web/src/app/comparar/page.tsx` (§5),
> `apps/pipeline/scripts/apply-integrity-caps.ts` (§4).

---

## §1 — Escopo e princípios

O IDIP mede **desempenho, integridade e transparência de um mandato**, em uma
escala de 0 a 100 com uma casa decimal. Ele não mede mérito de opinião, conteúdo
ideológico de voto, nem "boa pessoa / má pessoa".

Cinco princípios, todos verificáveis no código:

1. **Sem voto popular.** Apenas dimensões derivadas de dados públicos
   auditáveis. `UserBillVote` não tem caminho de dados até `Score` — ver
   [ADR-011](ADR.md#adr-011).
2. **Dado faltante reduz a Confiança, não gera nota fictícia.** A completude
   (`dataCompleteness`) é um insumo explícito do cálculo.
3. **Travas de integridade são automáticas e auditáveis.** O flag
   `hardCapApplied` é devolvido no resultado e persistido para auditoria.
4. **Neutralidade de perfil.** Pesos diferentes para funções diferentes
   (legislar ≠ governar), nunca pesos diferentes para partidos ou ideologias.
5. **Auditabilidade.** O resultado traz o `breakdown` por dimensão com
   `weight`, `rawValue` e `weightedValue` — é possível refazer a conta à mão.

**Escopo de aplicação:** mandatos eletivos federais (deputados federais e
senadores; presidente e governadores no perfil Executivo). O Judiciário tem
índice próprio — ver [STF_SCORING.md](STF_SCORING.md). O escopo municipal está
**fora do IDIP v1**.

---

## §2 — Pesos por perfil

Declarados em `WEIGHTS` (`packages/idip/src/scoring.ts`). A soma é **verificada na
carga do módulo**: se um perfil não somar 1, o módulo lança erro na importação, e
o `verify:scoring` falha no CI.

### §2.1 Legislativo (Deputados Federais e Senadores)

| Dimensão | Chave | Peso | O que mede | Fonte no pipeline |
|---|---|---|---|---|
| **Integridade** | `integrity` | **25%** | Condenações, inelegibilidades, contas | `LegalRecord` (TCU/STF/TSE) |
| **Produção** | `productivity` | **18%** | Proposições apresentadas | `BillAuthorship` |
| **Aprovação** | `approval` | **15%** | Proposições aprovadas | tramitação de proposições |
| **Fiscalização** | `oversight` | **10%** | Requerimentos, CPIs, pedidos de informação | pedidos/inquéritos estruturados |
| **Presença** | `presence` | **10%** | Presença em sessões e votações | `LegislativeAction` (VOTED) |
| **Transparência** | `transparency` | **10%** | Declaração de bens, redes de dados, publicidade ativa | sem fonte ativa hoje |
| **Custo/Benefício** | `costEfficiency` | **7%** | Cota parlamentar vs. produtividade (mediana = referência) | `PoliticianCost` (CEAP) |
| **Campanha** | `campaign` | **5%** | Regularidade das contas de campanha | `CampaignFinance` (TSE) |

Ajuste que define a v1.1: **Produção 20% → 18%** e **Custo/Benefício 5% → 7%**,
com a chegada de dados reais de CEAP. A home exibiu os valores antigos por um
período enquanto o motor já rodava v1.1 — é o defeito de credibilidade
documentado em [ADR-005](ADR.md#adr-005), fechado pelo teste WEB-001.

### §2.2 Executivo (Presidente e Governadores)

| Dimensão | Chave | Peso | O que mede |
|---|---|---|---|
| **Integridade** | `integrity` | **25%** | Mesma âncora do Legislativo |
| **Responsabilidade Fiscal** | `fiscalResponsibility` | **20%** | Resultado primário, execução orçamentária, dívida |
| **Entrega de Governo** | `governmentDelivery` | **20%** | Programas e obras prometidos/previstos |
| **Transparência** | `transparency` | **15%** | Publicidade ativa |
| **Custo/Eficiência** | `costEfficiency` | **10%** | Custo administrativo vs. entrega |
| **Campanha** | `campaign` | **5%** | Regularidade das contas |
| **Governança** | `governance` | **5%** | Estabilidade de equipe, adesão no Legislativo, decretações |

Executivo tem **7 dimensões** contra **8** do Legislativo — a asserção
correspondente existe em `verify:scoring`.

### §2.3 Integridade é a âncora

Integridade vale **25% nos dois perfis de eleitos** e também no IDIP-STF
(`StfScore.integrityScore @default(50)`). Esse alinhamento é deliberado: o índice
inteiro se sustenta sobre o mesmo piso de conduta, e é ele que aciona a trava.

### §2.4 Estado real das dimensões (o que é medido hoje)

Medição de `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.1 (2026-10-12).
Volumes são fotografia datada, não constante.

| Dimensão | Peso | Estado | Observação |
|---|---|---|---|
| Integridade | 25% | ⚪ **baseline 50** | `LegalRecord = 0`; fontes mapeadas e testadas, ETL não implementado |
| Produção | 18% | ✅ medida | 50.479 autorias |
| Aprovação | 15% | ⚪ baseline 50 | requer tramitação |
| Fiscalização | 10% | ⚪ baseline 50 | requer pedidos/inquéritos estruturados |
| Presença | 10% | ✅ medida | taxa de participação em votações nominais |
| Transparência | 10% | ⚪ baseline 50 | sem fonte ativa |
| Custo/Benefício | 7% | ⚠️ parcial | real quando há CEAP (1.966 registros > 0) |
| Campanha | 5% | ✅ binária | 100 = conta prestada; 50 = sem registro do pleito |

**Consequência que precisa ser dita:** com a maior parte das dimensões em
baseline, a nota gravita perto de 50 **por construção**. Compare sempre a
Confiança exibida. Ver [ADR-013](ADR.md#adr-013).

---

## §3 — Fórmula

### §3.1 Entrada

`calculateIDIP(metrics, profile = "LEGISLATIVE")`.

Cada dimensão é um número **0–100**, validado por `assertMetric`: valor não
numérico, `NaN` ou fora do intervalo **lança erro**. Métrica inválida não é
silenciada — o cálculo falha alto, e há teste para `integrity = 150` e
`presence = NaN`.

Além das dimensões, a entrada carrega:

| Campo | Tipo | Papel |
|---|---|---|
| `hasFinalCondemnation` | `boolean` | Aciona a trava (§4) |
| `hasRejectedAccounts` | `boolean` | Aciona a trava (§4) |
| `hasImpeachment` | `boolean?` | Aciona a trava (§4). Opcional; ausente = `false` |
| `hasIneligibility` | `boolean?` | Aciona a trava (§4). Opcional; ausente = `false` |
| `dataCompleteness` | `number` 0–100 | Percentual dos dados necessários que foram coletados |

### §3.2 Passos

```
1. Trava      → se (hasFinalCondemnation || hasRejectedAccounts
                    || hasImpeachment || hasIneligibility): integrity = 0
2. Nota bruta → Σ (dimensão_i × peso_i), usando integrity já travada
3. Teto       → se trava: nota = min(nota bruta, 39.9)
4. Termômetro → GRAY > RED > YELLOW > GREEN (§5)
5. Saída      → finalScore arredondado a 1 casa, reliability, confidence,
                hardCapApplied, breakdown{weight, rawValue, weightedValue}
```

> **Nota de manutenção (2026-10-13).** Até esta data o passo 1 honrava apenas as
> duas primeiras condições, e o `hasImpeachment` era detectado em
> `apply-integrity-caps.ts` sem nunca ser repassado ao motor — a trava existia na
> metodologia e não no cálculo. `hasIneligibility` foi criado junto com a
> correção; ele ainda não recebe sinal nenhum, porque não existe
> `LegalStatus.INELEGIBILITY` no schema nem coleta que o produza
> (ver §4.2). Está implementado para não virar de novo uma regra só declarada.
> `verify-scoring.ts` cobre as quatro condições, cada uma com asserção de nota
> teto, Integridade zerada, termômetro RED e `hardCapApplied`, mais um caso de
> controle sem trava.

### §3.3 Saída (`ScoreResult`)

| Campo | Tipo | Observação |
|---|---|---|
| `finalScore` | `number` | `Math.round(capped * 10) / 10` — uma casa decimal |
| `reliability` | `"GREEN" \| "YELLOW" \| "RED" \| "GRAY"` | Termômetro (TIC) |
| `confidence` | `number` | Igual a `dataCompleteness` |
| `hardCapApplied` | `boolean` | Evidência para auditoria |
| `breakdown` | `Record<string, { weight, rawValue, weightedValue }>` | Permite refazer a conta |

### §3.4 Exemplo verificado (teste do CI)

Político limpo, Legislativo: `integrity 100, productivity 85, approval 70,
oversight 90, presence 95, transparency 100, costEfficiency 80, campaign 90,
dataCompleteness 95`.

```
25.0 (integridade 100×0,25)  + 15.3 (85×0,18) + 10.5 (70×0,15) + 9.0 (90×0,10)
+ 9.5 (95×0,10) + 10.0 (100×0,10) + 5.6 (80×0,07) + 4.5 (90×0,05)
= 89.4  →  GREEN, confiança 95, sem trava
```

Esse valor exato é uma asserção de `apps/pipeline/scripts/verify-scoring.ts`.
O `cleanLegislative` do teste é idêntico ao perfil GREEN do seed de
desenvolvimento (`apps/pipeline/scripts/seed-dev.ts`).

### §3.5 Confiança (`dataCompleteness`)

Não é calculada pelo motor — o motor só a recebe, valida e propaga. Quem calcula
é o pipeline (`apps/pipeline/scripts/recalculate-scores.ts`), somando fontes com
teto de 95:

```
confiança = min(95,
     30                                  // base: cadastro verificado
   + min(30, taxa_participação × 30)     // votos ÷ sessões nominais
   + min(15, autorias × 1.5)             // proposições apresentadas
   + (presenças ≥ 20 ? 15 : min(10, presenças × 2.5))
   + (prestação de contas TSE com receita > 0 ? 5 : 0)
)
```

Os dois primeiros blocos coincidem com a explicação pública em `/metodologia`.
A parcela de **+5 por prestação de contas** existe no código e **não** está
listada na fórmula exibida em `/metodologia` — divergência conhecida de
documentação de UI (ver [ROADMAP trilha G](../01-product-discovery/ROADMAP.md)).

### §3.6 Dimensões derivadas no pipeline

| Dimensão | Cálculo vigente | Arquivo |
|---|---|---|
| `productivity` | `min(100, autorias × 5)` | `recalculate-scores.ts` |
| `presence` | `min(100, taxa_participação × 100)` — **participação em votações nominais**, não presença em sessão | idem |
| `campaign` | `100` se há `CampaignFinance` com `totalReceived > 0`; senão `50` | idem |
| `costEfficiency` | `annualCost > 0 ? applyCostEfficiency(annualCost, productivity) : 50` | idem |
| `integrity`, `approval`, `oversight`, `transparency` | `50` (baseline neutro) | idem |

`presence` **não** usa `SessionAttendance`: a API da Câmara registra apenas
presenças e não ausências, então a taxa de presença seria sempre 100%
("presenças são só-positivas — não viram taxa"). As presenças entram apenas na
Confiança.

### §3.7 Custo/Benefício

`applyCostEfficiency(annualCost, productivityScore, averageCost = 1_200_000)`:

```
costRatio  = max(annualCost, 0) / averageCost
            (costRatio <= 0 → retorna 50, baseline neutro: sem dado de custo)
eficiência = productivityScore / (costRatio × 100)
resultado  = clamp(eficiência × 100, 0, 100)
```

- `averageCost` = **R$ 1,2 milhão/ano**, referência de parlamentar federal.
- **`PATRIMONY` não entra no custo anual** — patrimônio não é gasto público. O
  filtro está no `recalculate-scores.ts`.
- No ano corrente o custo é **anualizado** (`amount × 12 / meses decorridos`).
- Quando não há custo coletado, o valor não é 0 nem 50 arbitrário no banco:
  `Score.costEfficiencyScore` é gravado como **`null`**, sinalizando ausência de
  dado em vez de dado baixo.

---

## §4 — Travas de integridade (hard caps)

Esta é a seção referenciada por `apps/pipeline/scripts/apply-integrity-caps.ts`.

### §4.1 Regra

Se **qualquer** gatilho estiver ativo:

1. A dimensão **Integridade vai a 0** (independentemente do valor de entrada).
2. A nota final é limitada a **`HARD_CAP = 39.9`** (`Math.min(rawScore, 39.9)`).
3. O Termômetro fica **RED**.
4. O resultado devolve `hardCapApplied = true` como evidência de auditoria.

A trava é **automática e não editorial** — não há intervenção humana, e a
interface diz isso ("a trava de integridade é automática, não editorial").

### §4.2 Gatilhos: o que a regra pretende vs. o que o motor executa

| Gatilho | Previsto na regra pública | No motor (`scoring.ts`) | No ETL de aplicação |
|---|---|---|---|
| **Condenação transitada em julgado** | ✅ | ✅ `hasFinalCondemnation` | `LegalRecord` type `CONDEMNATION` **e** status `TRANSITADO_EM_JULGADO` |
| **Contas rejeitadas** | ✅ | ✅ `hasRejectedAccounts` | `LegalRecord` type `ACCOUNTS_REJECTED` |
| **Impeachment** | ✅ | ✅ `hasImpeachment` | `LegalRecord` type `IMPEACHMENT`, repassado por `apply-integrity-caps.ts` |
| **Inelegibilidade** | ✅ | ⚠️ `hasIneligibility` implementado, **sem coleta** | Não existe `LegalStatus.INELEGIBILITY`. Inelegibilidade *por contas rejeitadas* já entra por `hasRejectedAccounts`; a declarada pela Justiça Eleitoral não é ingerida e portanto nunca chega |

> **Histórico.** Até 2026-10-13 o impeachment era detectado em
> `apply-integrity-caps.ts` e nunca repassado ao motor: a tabela acima marcava
> "❌ o motor não recebe esse sinal" e a divergência estava rastreada no ROADMAP
> A3. As assinaturas de `LegislativeMetrics` e `ExecutiveMetrics` ganharam os
> campos opcionais `hasImpeachment` e `hasIneligibility` (opcionais para não
> quebrar chamadas existentes), o passo 1 de §3.2 passou a considerar as quatro
> condições, e `verify:scoring` cobre cada uma delas.
>
> **Isto não exigiu bump de versão da metodologia.** A versão descreve a fórmula
> aplicada, e o que houve foi o código passar a executar o que a metodologia já
> publicava — não uma mudança de regra. Se fosse o contrário (regra nova), o bump
> seria obrigatório.

### §4.3 Estado real das travas em produção

`LegalRecord` tem **0 registros** (`AUDITORIA_PRODUCAO.md` §0.7).
Consequência: **nenhuma trava jamais disparou com dado real**. O teto de 39.9 é
exercitado apenas pelos testes do CI e pelos dados fictícios do seed
(`seed-0003`, com `hasFinalCondemnation: true`).

Isso é dito na interface: `/metodologia` publica que Integridade está em baseline
e que as listas do TCU são públicas enquanto o STF depende de LAI; `/status`
declara a coleta jurídica pendente.

### §4.4 Como as travas são aplicadas na prática

`npm run apply-integrity-caps`, **depois** de `npm run recalculate-scores`:

1. Percorre todas as `Person` (excluindo seeds `seed-*`).
2. Verifica `LegalRecord`: condenação com trânsito, contas rejeitadas,
   impeachment.
3. Reconstrói as métricas — com `integrity: 0` e **as demais dimensões em
   baseline 50**, exceto `productivity` e `transparency`, que vêm do score atual.
4. Recalcula com o motor e grava `finalScore`, `reliabilityStatus` e
   `integrityScore: 0`.

**Efeito colateral importante e intencional:** ao aplicar a trava, o script
**zera a contribuição medida** das dimensões que não preserva (aprovação,
fiscalização, presença, custo, campanha passam a 50). O resultado é um
"reprovado" homogêneo, não um reprovado com detalhe. Quem for alterar esse script
deve decidir conscientemente se quer preservar o perfil medido da pessoa.

### §4.5 Termômetro de Confiabilidade (TIC)

`§5` abaixo trata da regra de ranking; a definição dos estados fica aqui porque é
a mesma precedência usada pelo motor. A ordem é **GRAY > RED > YELLOW > GREEN** —
o primeiro que casar vence:

| Condição | Estado | Leitura | Emoji |
|---|---|---|---|
| `dataCompleteness < 60` | **GRAY** | Dados Insuficientes — **fora do ranking** | ⚪ |
| trava acionada (senão) | **RED** | Não Confiável | 🔴 |
| `dataCompleteness < 80` **ou** `integrity < 60` | **YELLOW** | Atenção / Risco | 🟡 |
| nenhuma das acima | **GREEN** | Confiável | 🟢 |

O nome interno do motor é **TIC**. A ordem de exibição na UI é a mesma
(`STATUS_ORDEM` em `apps/web/src/lib/status-visual.ts`), com o estado sem
veredito (GRAY) por último — e não a ordem de declaração do enum.

**O TIC não é a nota.** Ele mede risco e transparência e aparece **ao lado** dela.
Uma nota alta com trava continua 39.9 e vermelho.

### §4.6 Ancoragem de borda dos thresholds

Como `assertMetric` exige inteiros/decimais dentro de 0–100 e as comparações são
`<`, os limites são inclusivos para o estado melhor:

- `dataCompleteness = 60` → não é GRAY.
- `dataCompleteness = 80` com `integrity ≥ 60` → **GREEN**.
- `integrity = 60` com `dataCompleteness ≥ 80` → **GREEN**.
- `integrity = 59.9` → YELLOW.

Há teste explícito para `dataCompleteness = 55` (GRAY), `70` (YELLOW) e
`integrity = 50` (YELLOW).

---

## §5 — Regra de ranking

Esta seção é a referenciada por `apps/web/src/app/api/rankings/route.ts`,
`apps/web/src/app/ranking/page.tsx`, `apps/web/src/app/partidos/page.tsx` e
`apps/web/src/app/comparar/page.tsx`.

### §5.1 A regra

> **Confiança < 60 fica fora do ranking.**

Motivo: `confidence < 60` significa que não há dado suficiente para a nota ser
comparável. Baselines neutros e dados parciais produziriam comparação enganosa.
O político não é punido nem escondido: ele aparece em **aba separada**, sem
posição, com opacidade visual menor.

Aplicação por consumidor:

| Consumidor | Como aplica |
|---|---|
| `packages/idip/src/scoring.ts` | `dataCompleteness < 60` → `reliability = "GRAY"` |
| `/api/rankings` | `where: { confidenceScore: { gte: 60 } }` no banco |
| `/ranking` (`ranking/page.tsx`) | Partição em memória: `ranked` (≥ 60, ordenado por nota desc) e `insufficient` (< 60 **ou** sem score, sem posição) |
| `/partidos` | Média do partido considera apenas membros com `confidenceScore >= 60` |
| `/partidos/[acronym]` | `ranked` vs. `insufficient`; sem membro ranqueado, não exibe nota de partido |
| `/politicos/[id]` | Score é exibido independentemente, com o Termômetro indicando o estado |

### §5.2 Ordem dentro de cada grupo

1. Nota final **decrescente** (`finalScore`).
2. Empates não são desempatados por critério secundário — a ordem é a que o
   banco devolve.

Na página `/ranking`, "ranqueado" é definido pelo **último mandato**
(`orderBy startYear desc, take 1`) e o **último score calculado**
(`orderBy calculatedAt desc, take 1`). Um mandato mais recente sem score não
"herda" o score do anterior.

### §5.3 Paginação e abas

- **100 linhas por página** (`PAGE_SIZE`), via `?pagina=N`.
- Aba `?grupo=insuficientes` lista quem tem `confidence < 60` ou nenhum score.
- A paginação foi introduzida depois de a auditoria medir **3,1 s e 1,5 MB de
  HTML** nesta rota: 1.506 KB → **270 KB** (82% menos), com `/ranking?pagina=6`
  em 43 KB. A ordem e a semântica não mudaram.

### §5.4 Exclusão de dados fictícios

O ranking público **nunca** inclui dados de desenvolvimento. O filtro é:

```ts
person: { OR: [{ externalId: null }, { externalId: { not: { startsWith: "seed-" } } }] }
```

O `OR` com `externalId: null` é obrigatório: `externalId` é nullable e o filtro
ingênuo descartaria registros legítimos sem ID externo. O mesmo padrão está em
`/api/rankings`, `/ranking` e `/status`.

### §5.5 Partidos — composição da nota (regra vigente)

> Esta subseção substitui a referência ao documento
> `02-architecture-design/PARTY_SCORING.md`, que **não existe no repositório**
> (a citação está em `partidos/page.tsx`, `partidos/[acronym]/page.tsx` e
> `components/PartyScoreBreakdown.tsx`). A regra descrita é a que o código
> executa.

```
nota_do_partido = média_dos_membros_ranqueados × 0.7
                + 50 × 0.2      (transparência institucional — placeholder)
                + 50 × 0.1      (conformidade eleitoral — placeholder)
```

- Média calculada **apenas** sobre membros com `confidenceScore >= 60` (§5.1).
- Os 30% restantes são **placeholders constantes em 50** até a integração TSE.
  Efeito algébrico: `nota = média × 0,7 + 15`.
- Sem membro ranqueado, `partyScore` é `null` e a interface mostra "—" ou a
  mensagem de que a nota aparece quando houver membros com confiança ≥ 60.
- **A nota do partido nunca considera ideologia ou posição no espectro político**
  — isso é dito na própria tela (`PartyScoreBreakdown`).
- `PartyPerformanceChart` no perfil do partido usa a **média dos snapshots por
  data** (datas normalizadas por dia e formatadas em UTC), o que é um número
  diferente da nota do partido: é a evolução da média dos membros.

**Divergência a corrigir (não é bug hoje):** `/partidos` calcula
`avgScore * 0.7 + 50 * 0.3` (30% agregado) enquanto `/partidos/[acronym]` calcula
`avgMembersScore * 0.7 + 50 * 0.2 + 50 * 0.1` (mesma matemática, decomposta) — os
resultados são idênticos. O risco é o componente `PartyScoreBreakdown` **recompor
as barras** a partir de `transparencyScore` e `complianceScore` recebidos como
prop (hoje fixos em 50): ele não deriva da mesma expressão que gerou
`finalScore`. Uma mudança em um dos lados deixa de ser detectada. Consolidar em
uma fonte única é [ROADMAP F3](../01-product-discovery/ROADMAP.md).

### §5.6 Afinidade é ranking separado, não IDIP

`/ranking/personalizado` produz um ranking **pessoal** por autorias nos temas
escolhidos pelo usuário (`apps/web/src/lib/affinity.ts`). Ele:

- **não** altera `Score`, `reliability` nem a ordem do ranking oficial;
- é calculado no servidor a cada requisição, com as preferências do usuário em
  `localStorage` (`AffinityFilter` não faz fetch);
- exibe aviso explícito em caixa âmbar de que não altera a nota factual.

---

## §6 — Funções implementadas mas não aplicadas na nota pública

Ambas existem, são exportadas e **têm teste** em `verify:scoring`. Nenhuma entra
no `calculateIDIP`. `/metodologia` as marca como **"planejado"**.

### §6.1 Modificadores de carreira — `applyCareerModifiers`

```
applyCareerModifiers(baseScore, isFirstTerm, previousTerms, approvedBills)
```

- **Iniciante** (`isFirstTerm`): piso de **35** pontos (20 Ficha Limpa +
  15 Transparência de Campanha); os outros 65 são conquistados com dados reais.
  `iniciante com base 50 fica em 50`; `iniciante com base 20 fica em 35`.
- **Veterano** (`previousTerms > 3` **e** `approvedBills === 0`): **−1 ponto por
  mandato** acima de 3, limitado a **−10**.

*Estado:* **bloqueado**. Depende de "Ficha Limpa" e transparência de campanha do
TSE — fontes que **estão** no pipeline para campanha, mas a função não é chamada
por `recalculate-scores.ts`. Os campos `Term.isFirstTerm` e
`Term.previousTerms` já são populados (`mark-first-terms.ts`), então a
infraestrutura de dados está pronta.

### §6.2 Penalização por votos secretos — `applySecretVotePenalty`

```
applySecretVotePenalty(score, secretVotesCount, publicRefusalsCount)
penalidade = secretVotesCount × 5 + publicRefusalsCount × 10   // piso 0
```

*Estado:* **bloqueado**. A função depende do **posicionamento** em votação
secreta, que a API da Câmara **não registra**. Existe
`apps/pipeline/scripts/detect-secret-votes.ts` e o campo
`LegislativeAction.isSecretVote`, mas o sentido do voto secreto não é coletável.
Sem isso, a penalidade só poderia punir a existência de voto secreto — o que
puniria o regimento, não a pessoa.

---

## §7 — Como a metodologia chega ao usuário (e por que ela não pode divergir)

```
packages/idip/src/scoring.ts          ← motor: WEIGHTS, HARD_CAP, calculateIDIP
        │
        │  (copiado à mão — ADR-005)
        ▼
apps/web/src/lib/methodology.ts       ← UI: DIMENSOES_LEGISLATIVO, DIMENSOES_EXECUTIVO,
        │                                DIMENSOES_STF, METODOLOGIA_VERSAO, NOTA_MAXIMA_TRAVADA
        ├──► apps/web/src/app/page.tsx             (home, 3 cartões de pesos)
        ├──► apps/web/src/app/metodologia/page.tsx (página completa)
        └──► apps/web/src/app/stf/page.tsx         (pesos do Judiciário)
        │
        │  fechado pelo teste
        ▼
apps/pipeline/scripts/verify-scoring.ts → teste WEB-001 (roda no CI)
```

O teste WEB-001:

1. compara **cada** `percent` exibido com `Math.round(WEIGHTS[perfil][chave] * 100)`;
2. exige que a UI cubra **todas** as dimensões do motor (uma omissão faria os
   pesos exibidos não fecharem em 100%);
3. exige que os pesos exibidos somem **100%**;
4. valida que a versão exibida é `"1.1"`.

**Regra operacional derivada:** ao mudar a fórmula, edite `scoring.ts` **primeiro**
e só depois `methodology.ts`, até o `npm run verify:scoring` passar. Um número
redigitado na UI sem essa disciplina já causou a divergência v1.0/v1.1.

---

## §8 — Verificação

```bash
npm run verify:scoring     # roda no CI (.github/workflows/ci.yml)
```

Cobertura atual do script (`apps/pipeline/scripts/verify-scoring.ts`):

| Bloco | O que assere |
|---|---|
| Pesos | Soma = 1.0 nos dois perfis (tolerância `1e-9`) |
| Limpo (Legislativo) | Nota = **89.4**, GREEN, sem trava, confiança 95 |
| Condenado (Legislativo) | Nota = **39.9**, `breakdown.integrity.rawValue = 0`, RED, `hardCapApplied` |
| Contas rejeitadas | Também trava em 39.9 e RED |
| Dados insuficientes | `dataCompleteness 55` → GRAY, nota ainda calculada (não fictícia, mas marcada) |
| Zona YELLOW | `dataCompleteness 70` → YELLOW; `integrity 50` → YELLOW |
| Executivo | Nota ≈ **92.2**, GREEN, **7 dimensões** no breakdown; condenado = 39.9 |
| Validação de entrada | `integrity = 150` lança; `presence = NaN` lança |
| Carreira e votos secretos | Iniciante piso 35; veterano −2 com 5 mandatos sem aprovação; `-5×2 -10×1 = -20`; piso 0 |
| **WEB-001** | Sincronia UI ↔ motor, cobertura total de dimensões, soma 100%, versão 1.1 |

**Gaps de teste conhecidos** (candidatos a cobrir): `dataCompleteness`
exatamente 60 e 80 e `integrity` exatamente 60 (§4.6), e o teto 39.9 quando a
nota bruta já é menor que o teto (o `Math.min` preserva o valor menor —
comportamento não testado).

> Os casos "somente impeachment" e "somente inelegibilidade" **deixaram de ser
> gap** em 2026-10-13: as quatro travas passaram a ser testadas individualmente
> em `verify-scoring.ts`, cada uma com asserção de nota teto, Integridade zerada,
> termômetro RED e `hardCapApplied`, mais um caso de controle sem trava alguma
> (que garante que os testes não passam por acidente).

---

## §9 — Versionamento da metodologia

| Onde | Valor |
|---|---|
| `packages/idip/package.json` | `"version": "1.1.0"` |
| `apps/web/src/lib/methodology.ts` | `METODOLOGIA_VERSAO = "1.1"` (exibe major.minor) |
| `Score.version` (schema) | default `"1.0.0"`; o recálculo grava `"1.1.0"` |
| Teste | `verify:scoring` valida `"1.1"`; `tests/e2e/home.spec.ts` compara com `packages/idip/package.json` |

Mudança de fórmula exige, no mesmo PR: bump da versão do pacote, atualização de
`METODOLOGIA_VERSAO`, atualização de `scoring.ts` **e** `methodology.ts`,
atualização deste documento e do texto de `/metodologia`. `CONTRIBUTING.md`
também exige casos novos em `verify-*.ts` para mudança em motor.

**Lacuna conhecida:** não há filtro por versão nas consultas de ranking, então
scores `1.0.0` e `1.1.0` podem coexistir numa mesma lista
([ROADMAP A4](../01-product-discovery/ROADMAP.md)).

---

## §10 — Referências

- `packages/idip/src/scoring.ts` — motor (fonte de verdade).
- `apps/web/src/lib/methodology.ts` — pesos exibidos na UI.
- `apps/pipeline/scripts/verify-scoring.ts` — testes, incluindo WEB-001.
- `apps/pipeline/scripts/recalculate-scores.ts` — quem calcula as dimensões e a confiança.
- `apps/pipeline/scripts/apply-integrity-caps.ts` — quem aplica as travas (§4).
- `apps/pipeline/scripts/snapshot-scores.ts` — série histórica.
- [STF_SCORING.md](STF_SCORING.md) — índice do Judiciário.
- [DATA_MODEL.md](DATA_MODEL.md) — onde esses valores são persistidos.
- [ADR-005](ADR.md#adr-005), [ADR-008](ADR.md#adr-008), [ADR-011](ADR.md#adr-011), [ADR-013](ADR.md#adr-013).
- `apps/web/src/app/metodologia/page.tsx` — versão pública desta metodologia.
