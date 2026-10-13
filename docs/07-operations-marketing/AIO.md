# AIO — AI Optimization

> ## Aviso de escopo e honestidade
>
> **"AIO" não é uma disciplina estabelecida.** Não existe especificação, órgão
> normativo, métrica ou conjunto de boas práticas consensual por trás da sigla. O
> que existe é um conjunto de práticas propostas por fornecedores e agências, com
> graus de evidência muito diferentes entre si.
>
> Este documento separa explicitamente três coisas: **(1)** o que é verificável no
> comportamento de rastreadores de IA, **(2)** o que este repositório faz hoje, e
> **(3)** o que é **especulação de mercado** — marcada como tal. Onde não foi
> possível verificar, está escrito **não verificado**. **Nenhuma métrica de
> resultado é apresentada**, porque não existe nenhuma medida de AIO neste projeto.

Documentos relacionados: [SEO.md](SEO.md) (implementado e medido),
[AEO.md](AEO.md) (extração de trecho), [GEO.md](GEO.md) (citação por modelo
generativo, com o mesmo aviso).

## 1. O que AIO cobre, se cobre algo

Na prática, a sigla é usada para duas coisas diferentes que este documento mantém
separadas porque exigem trabalho diferente:

| Uso da sigla | O que significa de fato | Onde está tratado |
|---|---|---|
| **Permitir/bloquear crawlers de IA** | Decisão de política: `robots.txt`, `llms.txt`, `ai.txt` | §2 e §3 deste documento |
| **Ser citado em resposta gerada** | Resultado de conteúdo factual, autoridade e dados estruturados | [GEO.md](GEO.md) |

Confundir as duas leva a decisões ruins: bloquear um crawler **não** é "otimizar
para IA", é política de uso; e escrever `llms.txt` **não** faz ninguém ser citado.

## 2. Crawlers de IA e a política atual — verificável

O `robots.txt` do projeto (`apps/web/src/app/robots.ts`) tem **um único grupo**:

```
User-agent: *
Allow: /
Disallow: /conta
Disallow: /auth/
Disallow: /api/
Disallow: /retificacao
Sitemap: https://www.curriculopolitico.org/sitemap.xml
Host: https://www.curriculopolitico.org
```

**Não há nenhuma regra específica para `GPTBot`, `ClaudeBot`, `Google-Extended`,
`CCBot`, `PerplexityBot`, `Bytespider` ou qualquer outro agente de IA.** Portanto:

| Consequência | Situação |
|---|---|
| Crawlers de IA que respeitam `robots.txt` | **Permitidos por padrão** pelo `*`. Podem rastrear `/`, `/politicos/*`, `/projetos/*`, `/metodologia` |
| Áreas bloqueadas | `/conta`, `/auth/`, `/api/`, `/retificacao` — o mesmo bloqueio aplicado a buscadores comuns |
| Conteúdo do produto nas mãos de terceiros | **Permitido hoje**, sem nenhuma restrição específica |

**Isto é uma decisão, não um acidente — e é uma decisão que não está registrada em
nenhum lugar.** O `robots.ts` documenta a postura permissiva ("a plataforma existe
para ser encontrada"), mas o texto foi escrito pensando em buscadores, não em
treinamento de modelo. A distinção importa:

- **Indexar para responder a uma consulta** é o objetivo declarado do projeto.
- **Usar o conteúdo para treinar um modelo** é outra coisa, e o projeto **não
  decidiu** sobre isso.

### O que precisa acontecer

Uma decisão explícita, registrada em
[`MEMORY.md`](../08-knowledge-management/MEMORY.md), com uma destas posições:

| Posição | Como implementar | O que muda |
|---|---|---|
| **Permitir tudo** (status quo, agora explícito) | Adicionar um comentário no `robots.ts` justificando, e registrar a decisão | Nada muda tecnicamente; a decisão passa a existir |
| **Permitir resposta, bloquear treinamento** | Grupos `User-agent` específicos para agentes de treinamento, com `Disallow: /` | Reduz uso não compensado; **não verificado** quantos agentes respeitam |
| **Bloquear todos** | `Disallow: /` para os agentes de IA | **Contradiz** a proposta de auditoria pública. Não recomendado |

**Atenção a um detalhe técnico:** as regras do `robots.txt` são **honradas
voluntariamente**. Nenhum agente é obrigado a respeitá-las. E o `robots.txt` **não
controla** o que já foi coletado, nem conteúdo servido via API pública sem
autenticação.

## 3. `llms.txt` — o debate honesto

**`llms.txt` não existe neste repositório.** Verificado: `apps/web/public/` contém
apenas `avatar-placeholder.svg`; busca por `llms.txt` em todo o repositório (fora de
`node_modules`) não retorna resultado.

### O que é

Uma proposta (não um padrão de organismo normativo) de arquivo markdown na raiz do
site, descrevendo o que o site é e apontando para versões em markdown do conteúdo —
com a intenção de que modelos generativos leiam isso em vez de raspar HTML.

### O que é verificável

| Afirmação | Situação |
|---|---|
| É um padrão formal | ❌ **Não.** Nenhum órgão de padronização o adotou |
| É suportado pelos principais fornecedores de modelos | ❌ **Não verificado.** Não há declaração pública de adoção pelos laboratórios relevantes |
| Fornecedores documentam *outros* mecanismos de controle | ✅ Sim — por exemplo `Google-Extended` para controle de uso em treinamento. E o `robots.txt` continua sendo o canal documentado |
| Ajuda a ser citado | ❌ **Especulação.** É a mesma classe de promessa que `keywords` meta era nos anos 2000 |

### Recomendação

**Não implementar `llms.txt` agora**, por três razões:

1. **Custo de manutenção com retorno não medido.** O projeto tem ~32 mil URLs de
   proposição e ~594 perfis. Um `llms.txt` útil exigiria geração automática e
   passaria a ser mais um artefato que pode divergir do banco — exatamente o tipo de
   divergência que este projeto trata como defeito (a home já anunciou "IDIP v1.0"
   com o motor rodando v1.1).
2. **Não há como verificar efeito.** Sem analytics nem Search Console
   ([ANALYTICS.md](ANALYTICS.md)), implementar seria fé pura.
3. **A regra do projeto é explícita:** *"sem dependência nova sem necessidade
   comprovada"* ([RULES.md](../03-development-process/RULES.md) §3.4). Um artefato
   novo sem efeito verificável viola o espírito da regra.

**Se for implementado algum dia, o mínimo defensável:** um arquivo curto e gerado —
descrição da plataforma, fontes de dados, licenças (AGPL-3.0-only para o código,
CC BY 4.0 para a documentação, ambas já no `README.md`) e links canônicos para
`/metodologia`, `/faq` e `/sobre`. Nada de listar 32 mil proposições.

## 4. O que este projeto já faz que favorece IA — e por que

Novamente: **nada foi implementado com esse rótulo.** São propriedades que existem
por outras razões.

| Propriedade | Onde | Por que favorece consumo por IA |
|---|---|---|
| **Conteúdo factual, sem adjetivo** | Política editorial obrigatória ([CONTENT.md](../04-api-integrations/CONTENT.md) §2) | Modelo precisa de afirmação verificável. "O melhor deputado" não é extraível; "nota 72,4, estado Confiável" é |
| **Toda afirmação tem `sourceUrl` e `retrievedAt`** | Regra do `CONTRIBUTING.md`, aplicada em `LegalRecord` | Rastreabilidade — o que permite citar a fonte de uma afirmação |
| **Metodologia aberta e versionada** | `/metodologia` + `packages/idip/src/scoring.ts` + `lib/methodology.ts` | Um algoritmo publicado é auditável. Isso distingue "nota calculada assim" de "nota que alguém disse" |
| **Licença permissiva para a documentação** | CC BY 4.0 no `README.md` | Uso e redistribuição da documentação são permitidos com atribuição |
| **HTML renderizado no servidor** | Server Components | Conteúdo no HTML entregue, não montado por JS |
| **Sitemap completo** | ~32.450 URLs em 9 arquivos | Descoberta |
| **`h1` único + hierarquia correta** | Testado | Estrutura semântica legível por parser |
| **Robots permissivo** | `robots.ts` | Nenhuma barreira à coleta |
| **Baseline neutro rotulado na interface** | `ScoreBreakdown` mostra "sem dados · neutro" | **Honestidade de dado é o maior ativo de IA do projeto.** Um modelo que descobre que 50 significa "sem dado" pode citar corretamente; se a interface escondesse isso, toda citação sobre Integridade seria enganosa |

O último item merece ênfase. Em uma plataforma que alimenta respostas geradas,
**dado honesto é vantagem competitiva**: citação errada sobre uma pessoa real expõe a
fonte. A dimensão **Integridade (25%, maior peso)** está em baseline neutro 50 por
falta de `LegalRecord` (T-01) — e isso está **declarado na interface**. É a atitude
certa, e é também o que torna a plataforma citável com segurança.

## 5. O que **não** se deve fazer

1. **Não escrever conteúdo "para IA".** Texto empilhado, parágrafos redundantes e
   perguntas artificiais violam a política editorial e degradam a leitura humana —
   sem evidência de ganho.
2. **Não inventar métrica.** "Citação em IA" não é medível neste projeto. Não existe
   dado.
3. **Não tratar bloqueio de crawler como otimização.** É política de uso, e a decisão
   está pendente (§2).
4. **Não implementar `llms.txt` por moda** (§3).
5. **Não criar versão "markdown do site"** para consumo de modelo enquanto o HTML
   já é renderizado no servidor. Seria uma segunda fonte de verdade que pode
   divergir do banco — o defeito que este projeto mais teme.

## 6. Estado: o que existe e o que falta

| Item | Situação |
|---|---|
| `robots.txt` permissivo, sem regra específica de IA | ✅ existe |
| Decisão explícita sobre treinamento de modelo | ❌ **não existe.** Nem permite nem proíbe — simplesmente não foi decidido |
| `llms.txt` | ❌ não existe (recomendação: não implementar agora) |
| `ai.txt` | ❌ não existe (**não verificado** se algum agente relevante o consome) |
| Dados estruturados | ❌ nenhum (ver [AEO.md](AEO.md) §4) |
| Versão markdown do conteúdo | ❌ não existe |
| **Métrica de citação por IA** | ❌ não existe, e não há como criar sem analytics |
| Política de atribuição para uso por terceiros | 🟡 licenças estão declaradas no `README.md`; **não verificado** se há orientação sobre como citar |

## 7. Próximo passo único, se houver apetite

Uma decisão, não código: **registrar em `MEMORY.md` a posição do projeto sobre
crawlers de IA**, mesmo que a posição seja "permitir tudo, como hoje". O `robots.ts`
passaria a ter um comentário explicando que a permissividade é intencional também
para agentes de IA, e não apenas um efeito do `*`.

Isso custa minutos, elimina uma ambiguidade real e — o mais importante — **não cria
promessa que o projeto não possa verificar.**

## 8. Não verificado

- Adoção de `llms.txt` por qualquer fornecedor de modelo relevante.
- Se os crawlers de IA efetivamente rastreiam o site hoje, com que frequência e com
  que profundidade.
- Se `ai.txt` é consumido por qualquer agente.
- Se o conteúdo do site já foi usado em treinamento de algum modelo.
- Se o site é citado como fonte em respostas de IA — não há monitoramento de menções.
- Qualquer afirmação sobre como modelos escolhem fontes: comportamento não é
  documentado de forma estável, e mudanças de versão invalidam observações antigas.
