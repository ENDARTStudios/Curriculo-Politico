# Código de Conduta

## Aviso: por que este documento é curto

**O projeto não tem um código de conduta formal adotado.** Não há arquivo
`CODE_OF_CONDUCT.md` na raiz, não há adoção do Contributor Covenant, não há texto
normativo com escopo, valores, exemplos, nem procedimento de apuração.

Escrever aqui um código de conduta completo e genérico — copiado de um modelo,
assinado por ninguém — criaria uma **promessa sem mecanismo**: regras de aplicação
que o projeto não tem como cumprir (comitê, prazos, sanções graduadas, canal de
denúncia dedicado). Este projeto trata promessa sem mecanismo como defeito, não como
boa intenção.

O que existe hoje é um **compromisso curto, real e verificável**, registrado por
escrito na seção "Código de Conduta" de `CONTRIBUTING.md` (raiz):

> *"Tratamento respeitoso com todos — inclusive com os políticos avaliados: o
> projeto critica fatos, nunca pessoas."*

Este documento faz três coisas: explica o que esse compromisso significa na prática
deste projeto, registra os canais que existem, e diz **o que seria necessário** para
adotar um código de conduta de verdade.

## 1. O compromisso que existe

Uma frase, da qual decorrem consequências concretas e verificáveis no código:

> **O projeto critica fatos, nunca pessoas.**

Isso não é retórica de comunidade — é a regra que dá coerência a uma plataforma que
publica avaliação nominal de pessoas reais, com foto e nota. Ela aparece no produto
como regras que **têm teste automatizado**:

| Consequência | Onde está implementada | Como é verificada |
|---|---|---|
| Nenhum juízo moral sobre pessoa avaliada | [`RULES.md`](../03-development-process/RULES.md) §1.1, [`CONTENT.md`](../04-api-integrations/CONTENT.md) §2 | Revisão humana + política editorial |
| Apenas "Réu em Ação Penal" e "Condenação Transitada em Julgado" | idem | — |
| Descrição de perfil factual, sem adjetivo | `apps/web/src/app/politicos/[id]/page.tsx` (`generateMetadata`) | — |
| Nenhum viés partidário; mesma métrica para todos | `apps/web/src/components/PartyScoreBreakdown.tsx` | — |
| Nota nunca alterada por votação popular | `apps/web/src/app/api/bills/[id]/vote/route.ts` (cabeçalho) | — |
| Dado ausente é declarado, não escondido | `ScoreBreakdown` (baseline neutro rotulado) | — |
| Nenhum dado sensível de terceiro (CPF, endereço, família) | [`RULES.md`](../03-development-process/RULES.md) §1.5 | — |
| Absolvição e arquivamento ocultados do perfil público | `apps/web/src/app/api/politicians/[id]/route.ts` | — |

**Consequência para quem contribui:** uma contribuição que introduza juízo moral,
viés partidário ou dado sensível é rejeitada — não por opinião do mantenedor, mas por
violar uma regra escrita e auditável. É um código de conduta com dentes, ainda que
curto.

## 2. O que se espera de quem participa

Derivado do compromisso acima, não de um modelo genérico:

1. **Discorde de dados, não de pessoas.** Se um número está errado, a correção passa
   pela fonte oficial (`CONTRIBUTING.md`). Não se edita dado manualmente e não se
   ataca quem o publicou.
2. **Trate os avaliados como sujeitos de direito.** Este é o ponto
   não-negociável: a plataforma avalia pessoas reais. O canal `/retificacao` existe
   porque o titular tem direito de resposta; desrespeitá-lo é violar o produto.
3. **Presunção de inocência é regra, não gentileza.** Não aplicar trava de
   integridade sem **trânsito em julgado** é registrado no projeto como proibição
   explícita, não como recomendação.
4. **Sem assédio, sem discurso de ódio, sem ataque pessoal** em issues, PRs,
   comentários de código, mensagens de commit ou nos canais de contato.
5. **Sem uso partidário do projeto.** O repositório não é plataforma de campanha —
   nem para atacar, nem para promover.
6. **Nada de exposição de dado pessoal de terceiro** — de políticos, de usuários ou
   de outros contribuidores. Inclui capturas de tela com e-mail, IP ou token.

## 3. Canais que existem hoje

Todos os endereços abaixo são a **fonte única de verdade** em
`apps/web/src/lib/contato.ts`, verificados pelo controlador (ENDART Studios) em
12/10/2026:

| Canal | Endereço | Para quê |
|---|---|---|
| Institucional / imprensa | `endart.studios+contato@gmail.com` | Contato geral |
| Suporte | `endart.studios+suporte@gmail.com` | Dúvidas de uso, doações, reembolsos |
| Privacidade / DPO | `endart.studios+privacidade@gmail.com` | Proteção de dados. Encarregado: **Equipe END ART Studios** |
| Segurança | `endart.studios+security@gmail.com` | **Reporte responsável de vulnerabilidades** |
| Direitos do titular | `endart.studios+direitos@gmail.com` | LGPD Art. 18 e 19 |
| Reembolso de doações | `endart.studios+reembolso@gmail.com` | — |

> **Nota de infraestrutura:** os endereços `@curriculopolitico.org` foram
> substituídos porque **não tinham caixa postal operacional**. Usar os aliases do
> Gmail acima é o caminho correto.

**Para conduta:** não existe canal dedicado. O caminho realista é o contato
institucional (`+contato`) ou, se o assunto envolver dados pessoais, o canal de
privacidade. **Isso é uma lacuna**, declarada em §4.

## 4. O que seria necessário para adotar um código de conduta de verdade

Se o projeto decidir formalizar, o mínimo que faz o documento deixar de ser
decorativo:

| Item | Por quê | Situação |
|---|---|---|
| Texto normativo adotado (por exemplo, o Contributor Covenant, CC BY-SA 4.0) | Um modelo reconhecido evita interpretação idiossincrática | ❌ não adotado |
| **Canal de denúncia dedicado e confidencial** | Sem canal, a regra não é acionável. O canal de privacidade existe e poderia servir | 🟡 canal existe; **não designado** para conduta |
| **Pessoa ou grupo responsável pela apuração** | Sem responsável nomeado, ninguém apura | ❌ não existe |
| **Prazo de resposta declarado** | Compromisso verificável ("acusamos recebimento em N dias úteis") | ❌ não existe |
| **Escala de consequências** | Sem consequência, é sugestão | ❌ não existe |
| **Como conflito de interesse é tratado** | Quem apura pode ser parte no caso | ❌ não existe |
| **Registro de que o texto foi lido** | — | Não aplicável a projeto aberto |

**Recomendação:** adotar o Contributor Covenant (ou equivalente) **junto com** a
designação do canal e do responsável — nunca o texto sozinho. Um código de conduta
sem canal de denúncia é pior que nenhum, porque cria a expectativa de que existe
algo do outro lado.

Enquanto isso não acontece, este arquivo permanece curto e honesto: registra o
compromisso real e a lacuna real.

## 5. Onde a regra de conduta é mais fácil de violar neste projeto

Registro específico deste domínio, porque são os casos que realmente aconteceram ou
quase aconteceram:

1. **No texto da UI e na copy.** Microcopy, `alt` de imagem, rótulo de gráfico e
   `description` de metadata são os lugares onde "crime" escorrega no lugar de "Réu
   em Ação Penal". Ver [`CONTENT.md`](../04-api-integrations/CONTENT.md) §1.
2. **No commit e no comentário de código.** "corrige o político corrupto" é violação
   — o commit é público. Use `fix: corrige dado de <campo> conforme fonte oficial`.
3. **Na interpretação do dado.** Transformar "processo arquivado" em contexto
   negativo é violar a presunção de inocência, mesmo sem escrever a palavra errada.
   O filtro em `api/politicians/[id]/route.ts` existe por isso.
4. **Ao discutir um caso concreto.** Quem trabalha com o dado de uma pessoa real
   tende a formar opinião sobre ela. O projeto não pede neutralidade de pensamento —
   pede neutralidade **de saída**: no código, no texto e no dado.
5. **Ao responder a uma retificação.** O titular pode estar errado sobre o fato, mas
   tem direito ao canal e à resposta. Tratar o pedido com desprezo é violar o
   produto, não só a etiqueta.

## 6. Não verificado

- Se há **histórico de incidentes de conduta** neste repositório. Não foi consultado
  o histórico de issues, discussões ou comentários de PR — apenas os commits.
- Se existe **canal informal** de moderação fora do repositório (grupo, chat da
  equipe).
- Se o **GitHub tem alguma configuração** de moderação ativa no repositório
  (bloqueio de usuários, limites de interação). Isso não é visível no código.
