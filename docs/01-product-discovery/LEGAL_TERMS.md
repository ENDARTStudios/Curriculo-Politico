# LEGAL_TERMS — vocabulário jurídico e limites de linguagem

Documento normativo. Ele define **o que pode e o que não pode ser escrito** em
qualquer superfície do produto: interface, API, ETL, resumo de proposição,
e-mail, issue, commit e documentação.

A regra-base está em `AGENTS.md` (regras de produto que não se negociam, item 1)
e em `.dsh/skills/curriculo-design-system` §1.5. Este documento é a versão
expandida, com o mapeamento para o código.

## 1. As duas expressões permitidas

O projeto usa **exatamente duas** expressões para se referir a situação
jurídica de uma pessoa:

| Expressão permitida | O que significa | Quando usar |
|---|---|---|
| **Réu em Ação Penal** | A pessoa figura como parte ré em ação penal em curso, sem decisão definitiva. Não é condenação. | Registro com `LegalRecord.type = CRIMINAL_ACTION` e `status = ATIVO` |
| **Condenação Transitada em Julgado** | Houve decisão condenatória definitiva, sem recurso pendente. | Registro com `type = CONDEMNATION` e `status = TRANSITADO_EM_JULGADO` |

Nada além dessas duas expressões descreve a pessoa. O que existe entre elas
(inquérito, investigação, denúncia, ação em tramitação) é **processo em
andamento**, e processo em andamento **não é pontuado**.

## 2. Vocabulário proibido

| Nunca escreva | Por quê |
|---|---|
| "crime", "criminoso", "bandido", "corrupto", "ladrão" | Juízo moral e imputação de fato que só decisão definitiva estabelece. Viola presunção de inocência (CF, art. 5º, LVII). |
| "condenado" sem qualificar | "Condenado" isolado sugere definitividade. Sempre "condenado **em primeira instância**" (não pontua) ou "**com condenação transitada em julgado**" (pontua). |
| "ficha suja" | Termo coloquial com carga moral, sem correspondência técnica. A UI pode dizer "Ficha Limpa" apenas se derivado de certidão oficial verificável. |
| "inelegível" como afirmação do projeto | Só a Justiça Eleitoral declara inelegibilidade. O projeto reproduz a lista oficial (ex.: TCU) com a data, nunca conclui por conta própria. |
| "improbidade" sem qualificar | Só com decisão e status explícitos. O dado precisa vir de fonte oficial reproduzida com link e data. |
| "processo" para descrever alguém avaliado, sem tipo | Ambíguo. Use o tipo: "Réu em Ação Penal", "inquérito arquivado" (e, arquivado, **não publique** — ver §4). |
| "suspeito", "investigado" na ficha do político | Juízo sobre pessoa. O perfil mostra registro e link da fonte, não adjetivo. |

Aplicação concreta no código: `apps/web/src/lib/status-visual.ts` descreve o
estado `YELLOW` como *"réu em ação penal pública, contas com ressalvas"* e o
estado `RED` como *"condenação transitada em julgado, improbidade, contas
rejeitadas, cassação ou inelegibilidade"* — sempre reproduzindo **tipo de
registro**, nunca concluindo sobre a pessoa.

## 3. Mapa entre o vocabulário e o schema

Os enums vivem em `apps/web/prisma/schema.prisma` e são a fonte de verdade.

`enum LegalStatus`:

| Valor | Leitura permitida na UI | Pontua? |
|---|---|---|
| `INVESTIGATION` | "Investigação / inquérito" — só se **não** arquivado | Não |
| `LAWSUIT` | "Ação judicial em andamento" | Não |
| `CRIMINAL_ACTION` | **"Réu em Ação Penal"** | Não (não é condenação) |
| `CONDEMNATION` | **"Condenação Transitada em Julgado"** — somente com `status = TRANSITADO_EM_JULGADO` | **Sim** (trava de integridade) |
| `IMPEACHMENT` | "Impeachment" | **Sim** (trava, quando implementada no motor — ver §5) |
| `ACCOUNTS_REJECTED` | "Contas rejeitadas" | **Sim** (trava) |
| `CLEARED` | — | Nunca exibido |

O campo `LegalRecord.status` (`"ATIVO"`, `"ARQUIVADO"`,
`"TRANSITADO_EM_JULGADO"`) é o que qualifica o tipo. A regra de status é
`texto-livre` no schema (não é enum) — quem escreve ETL assume a
responsabilidade de gravar exatamente esses valores.

Exemplo de uso correto no código
(`apps/pipeline/scripts/load-legal-records.ts`):

```
// Linguagem jurídica estrita: AP é ação penal (réu = ATIVO); não é condenação
const type: LegalStatus = r.classe === "AP" ? "CRIMINAL_ACTION" : "INVESTIGATION";
```

## 4. Regras de exibição

1. **Arquivado e absolvido não aparecem.** O perfil público filtra
   `type !== "CLEARED"` e `status !== "ARQUIVADO"`
   (`apps/web/src/app/api/politicians/[id]/route.ts`). Um inquérito arquivado não
   é fato sobre ninguém.
2. **Toda exibição carrega fonte e data.** `LegalRecord` tem `sourceUrl` (campo
   obrigatório) e `retrievedAt`. Regra derivada: uma acusação sem URL oficial e
   sem data de consulta não vai para a tela.
3. **Presunção de inocência por construção** (recomendação de
   `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5.2): só se pontua o que
   tem trânsito em julgado. Processo em andamento, se algum dia coletado, fica em
   campo separado, **não pontuado**, rotulado "processo em tramitação — sem
   decisão definitiva".
4. **CPF nunca é publicado.** É dado de identificação; a política é de
   minimização (LGPD Art. 6º, III). O `Person` do schema **não tem** coluna de
   CPF. Se um dia for necessário para casar TCU↔político (a fonte TCU identifica
   por CPF), o armazenamento previsto é **hash com salt**, jamais o número em
   claro — ver `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5.2.
5. **Homonímia é o maior risco jurídico do projeto.** O casamento atual
   (`load-legal-records.ts`) exige **igualdade de nome normalizado** (não
   similaridade) justamente para não atribuir registro à pessoa errada. Enquanto
   não houver CPF, o volume de matches é baixo — e isso é o resultado correto,
   não um defeito a "resolver" afrouxando o casamento.

## 5. Estado real das travas (não confunda o que está escrito com o que roda)

| Trava | Declarada na UI | Efetivamente no motor | Observação |
|---|---|---|---|
| Condenação transitada em julgado | Sim (`/metodologia`, `/`) | **Sim** — via `hasFinalCondemnation` | `packages/idip/src/scoring.ts` → `hardCapApplied` |
| Contas rejeitadas | Sim | **Sim** — via `hasRejectedAccounts` | idem |
| Impeachment | Sim | **Não**: a função do motor não recebe esse sinal | `apply-integrity-caps.ts` **detecta** `type = IMPEACHMENT`, mas a trava só dispara se `hasFinalCondemnation` ou `hasRejectedAccounts` também for verdadeiro |
| Inelegibilidade | Sim | **Não**: é reproduzida pela lista do TCU como `ACCOUNTS_REJECTED` | Não existe `LegalStatus.INELEGIBILITY` no schema |

Isso é uma divergência conhecida entre texto e motor. Ela **não** deve ser
resolvida reescrevendo a UI para menos do que a regra pretende; deve ser
resolvida no motor (ver [ROADMAP.md](ROADMAP.md)). Enquanto isso, todo dado de
integridade está no baseline neutro 50, porque `LegalRecord` tem 0 registros
(`docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` §0.7 e §7).

## 6. Regra de aplicação para quem escreve

Antes de considerar um texto pronto, responda:

1. Alguma palavra desta lista apareceu? ("crime", "criminoso", "corrupto",
   "condenado" sem qualificação, "ficha suja", "inelegível" como afirmação
   própria.)
2. O texto descreve **tipo de registro** ou **juízo sobre a pessoa**?
3. Todo número ou fato jurídico tem `sourceUrl` e data de consulta?
4. O texto sugere que a votação popular ou a opinião do usuário altera a nota?
   (Isso é proibido pela regra 4 de `docs/design/estrategia-marketing.md`.)
5. O texto promete resultado que o motor não executa? (Ver §5.)

Uma resposta "sim" em 1 ou 4, ou "não" em 2 ou 3, bloqueia a publicação.

## 7. Referências

- `AGENTS.md` — regras de produto que não se negociam.
- `docs/05-security-compliance/RIPD.md` — tratamento de dados pessoais.
- `docs/05-security-compliance/COMPLIANCE.md` §7 — a mesma regra de linguagem
  jurídica estrita, do ponto de vista de compliance, e a ocultação automática de
  registros não definitivos.
- `docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md` — achados de
  auditoria e correções aplicadas (consentimento, clickwrap, retificação, DPO).
- `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §5 — viabilidade jurídica
  das fontes de integridade, incluindo o que **não** fazer.
- `/privacidade`, `/termos-de-uso`, `/lgpd`, `/cookies` — textos jurídicos
  publicados, versionados em `apps/web/src/lib/consent.ts`.
- Ferramenta de verificação de nomes: `apps/pipeline/scripts/verify-identity.ts`
  usa apenas grafia de nome de urna/civil, sem juízo sobre conduta.

> **Divergência de referência no código:** três arquivos citam
> `05-security-compliance/SECURITY_BASELINE.md`, que **não existe** —
> `apps/web/src/middleware.ts` (linha 5),
> `apps/web/src/app/api/politicians/[id]/route.ts` (linha 52) e
> `apps/web/src/app/politicos/[id]/page.tsx` (linha 105). A regra que eles
> invocam é a desta seção §4. Rastreado em
> [ROADMAP trilha G](ROADMAP.md).
>
> **Não verificado neste repositório:** ausência de revisão jurídica humana
> integral dos textos publicados. A pendência está registrada como externa em
> `docs/05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md` §"Pendências
> externas restantes" (item 3).
