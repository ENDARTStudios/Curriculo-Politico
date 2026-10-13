# Integrações e fontes de dados

Mapa das fontes externas que alimentam a plataforma: **o que existe, como é
coletado, onde o dado bruto é gravado e o que não funciona**. Cada limitação aqui
foi lida no código do ETL ou em documento de sondagem do próprio repositório —
onde não foi possível confirmar, está escrito **não verificado**.

Fontes primárias do que está escrito aqui:

- Os 17 ETLs em `apps/pipeline/etl/*.py`
- As 21 cargas em `apps/pipeline/scripts/load-*.ts` e `seed-*.ts`
- [`docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md`](../ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md)
  — sondagem **ao vivo** de endpoints (com datas e códigos HTTP medidos)
- [`docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md)
  — volumes, egress e decisões de plataforma

## 1. Arquitetura da integração

O projeto usa **coleta em lote com camada raw imutável**, não integração em tempo
real:

```
API/CSV da fonte
      │  ETL Python (apps/pipeline/etl/*.py)
      ▼
data/raw/*_raw.json          ← camada raw IMUTÁVEL (gitignored)
      │  Carga TS idempotente (apps/pipeline/scripts/load-*.ts)
      ▼
PostgreSQL (Supabase em produção, docker-compose em dev)
      │  Prisma
      ▼
apps/web (Next.js 15 App Router, force-dynamic)
```

Três propriedades que a arquitetura garante, registradas em
`apps/pipeline/README.md`:

1. **Camada raw imutável.** O ETL grava JSON em `data/raw/`; a **carga nunca
   re-baixa**. Reprocessar significa re-executar o `load-*`.
2. **Idempotência.** Todas as cargas podem ser re-executadas (upsert,
   `createMany` com skip-existing). Cargas grandes usam `createMany` em chunks —
   nunca upsert sequencial por registro, que é lento no pooler.
3. **`DATABASE_URL` decide o destino.** Todo script de dados grava no banco que ela
   apontar, produção incluída. Ver
   [`SETUP.md`](../03-development-process/SETUP.md) §5.

## 2. Câmara dos Deputados

**Base:** `https://dadosabertos.camara.leg.br/api/v2`
**Status:** ✅ operacional — é a fonte principal de dados legislativos
**Autenticação:** nenhuma

### Endpoints usados (lidos do código)

| Endpoint | Usado por | Para quê |
|---|---|---|
| `GET /deputados?ordem=ASC&ordenarPor=id&itens=100&pagina=N` | `camara_deputados.py`, `camara_completa.py`, `camara_ceap.py`, `camara_presenca.py`, `camara_proposicoes.py` | Lista paginada de deputados |
| `GET /deputados/{id}` | `camara_deputados.py`, `camara_completa.py` | Detalhe (nome civil, UF, **`cpf` em claro**) |
| `GET /proposicoes?idDeputadoAutor={id}&ordem=DESC&ordenarPor=id&itens=100` | `camara_proposicoes.py` | Autoria de proposições |
| `GET /deputados/{id}/eventos` | `camara_presenca.py` | Eventos para inferir presença |
| `GET /votacoes?ordem=DESC&ordenarPor=data&itens={n}` | `camara_votacoes.py`, `camara_votacoes_expandido.py` | Lista de votações |
| `GET /votacoes?dataInicio=2023-01-01&ordem=DESC` | `camara_votacoes_expandido.py` | Votações desde 2023 |
| `GET /votacoes` com `idOrgao=180` | `camara_votacoes_historico.py` | Votações do **Plenário** |
| `GET /votacoes/{id}/votos` | `camara_votacoes*.py` | Votos nominais |
| `GET /deputados/{id}/despesas?ano={ano}` | `camara_ceap.py` | CEAP — **está vazio** (ver §2.2) |

### 2.1 Cargas correspondentes

| Script | O que popula |
|---|---|
| `load-camara.ts` | Pessoas/termos básicos. Registra no cabeçalho que nascem com **confiança 30%** e todos **GRAY** até votações/proposições entrarem |
| `load-camara-completa.ts` | Detalhe completo por deputado |
| `load-proposicoes.ts` | `Bill` + `BillAuthorship` |
| `load-votacoes.ts`, `load-votacoes-expandido.ts`, `load-votacoes-historico.ts` | `LegislativeAction` (votos) + ponte votação↔proposição |
| `load-presenca.ts` | `SessionAttendance` |
| `load-ceap.ts`, `load-ceap-bulk.ts` | `PoliticianCost` categoria CEAP |

### 2.2 Limitações conhecidas e medidas

**A API v2 `/despesas` está vazia.** Está escrito no cabeçalho de
`camara_despesas_bulk.py`:

> *"Substitui a API v2 /despesas (que está vazia). Agrega por deputado/ano."*

O caminho real é **bulk CSV**: `https://www.camara.leg.br/cotas/Ano-{YYYY}.csv.zip`.
É um ZIP anual de todos os deputados — mais barato em número de requisições, mais
pesado em banda.

**A API v2 não expõe ausências.** Está no cabeçalho de `camara_presenca.py`:

> *"A API v2 não expõe registro de AUSÊNCIAS (frequência oficial sai em PDF)."*

Consequência metodológica: a presença é **inferida de eventos**, não lida de um
campo oficial de frequência. A ausência não é um dado da fonte — é ausência de
registro de presença no evento. Isso precisa estar claro em qualquer texto que
apresente o número.

**A API não aceita `dataInicio` + `dataFim` juntos.** Registrado em
`camara_votacoes_historico.py`: retorna `400`. Por isso o ETL usa apenas
`dataInicio` e filtra o resto localmente.

**`/votacoes/{id}/votos` é uma requisição por votação.** É o gargalo do ETL de
votações históricas — daí a existência de três ETLs diferentes (básico, expandido,
histórico) com escopos distintos.

**A API devolve CPF em claro** em `GET /deputados/{id}`. A sondagem registrou
`"cpf":"36607606504"`. **Isso não pode ser propagado** para o banco do produto nem
para a UI — regra em [`RULES.md`](../03-development-process/RULES.md) §1.5. A regra
existe por causa desse fato, não por precaução genérica.

### 2.3 Querido Diário (Open Knowledge Brasil) — via `etl:municipal`

**Base:** `https://queridodiario.ok.org.br/api` (o ETL usa
`https://queridodiario.ok.org.br/api`, chama `/gazettes` e `/gazettes/{id}`)
**Autenticação:** nenhuma. **Licença do conteúdo: CC-BY. Código: MIT.** Limite
recomendado: **60 req/min** (conforme a sondagem)
**Saída:** `data/raw/municipal_gazettes_raw.json` → `load-municipal.ts`
**Status:** ✅ responde 200 (a afirmação anterior de que estava bloqueado **não se
confirmou**)

## 3. Senado Federal

**Base:** `https://legis.senado.leg.br/dadosabertos/senador/lista/atual`
**Status:** ✅ operacional
**Autenticação:** nenhuma
**ETL:** `senado_federal.py` → `data/raw/`; carga: `load-senado.ts`

### Detalhes de implementação lidos do código

- A API **às vezes devolve um objeto único** em vez de lista — o ETL trata os dois
  casos (`isinstance(parlamentares, dict)`).
- As chaves reais da API são `SiglaPartidoParlamentar`, `UfParlamentar` e
  `NomeParlamentar` / `NomeCompletoParlamentar` — o ETL normaliza para o formato do
  banco.
- **A API do Senado NÃO retorna CPF** (só os campos acima). Assimetria relevante em
  relação à Câmara: o mesmo dado de pessoa tem qualidade diferente por casa.

## 4. TSE — Tribunal Superior Eleitoral

**Base:** `https://cdn.tse.jus.br/estatistica/sead/odsele`
**Status:** ✅ operacional — **a premissa de "CDN bloqueado" não se confirma**
**Autenticação:** nenhuma

### Arquivos usados (lidos do código)

| Arquivo | ETL | Tamanho medido na sondagem |
|---|---|---|
| `consulta_cand/consulta_cand_{ano}.zip` | `tse_candidatos.py` | 2026: 3.239.555 B · 2022: 4.387.073 B |
| `bem_candidato/bem_candidato_2022.zip` | `tse_bens.py` | — |
| `receitas_candidatos/receitas_candidatos_{ano}.zip` | `tse_receitas.py` | — |
| `prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2022.zip` | — | **548.602.006 B (~548 MB)** |
| `certidao_criminal/certidao_criminal_2026_BR.zip` | (não consumido por ETL) | **69.052.645 B** |

Todos os cinco responderam **HTTP 200** na sondagem de 12/10/2026.

### Papel do TSE no produto

É a fonte de **identidade** e de **patrimônio/financiamento**:

- `packages/idip/src/identity.ts` é o motor de **resolução de identidade** (cruzar
  candidato do TSE com parlamentar da Câmara/Senado).
- Scripts: `resolve-identity.ts` (resolve), `review-medium.ts` (revisão humana de
  confiança média).
- Medição de produção registrada: **594 pessoas**, das quais **556 com `tseId`**.

### API CKAN de dados abertos

`GET https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026`
→ **HTTP 200**, `metadata_modified` = 16/09/2026, **92 recursos**. Também responde
`package_search`. É o caminho para descobrir quais arquivos existem, em vez de
adivinhar a URL do ZIP.

### Limitações

- **Downloads são grandes** (a prestação de contas de 2022 é 548 MB). O egress é o
  recurso escasso do projeto no plano gratuito do Supabase — ver §8.
- `tse_bens.py` imprime instrução para baixar o ZIP manualmente quando o download
  automático não é viável.
- A carga de patrimônio histórico usa `tse_patrimony_history.py` +
  `load-patrimony-history.ts`.

## 5. TCU — Tribunal de Contas da União

**Status:** 🟡 **o caminho existe, mas nenhum ETL o consome ainda**

### A correção de premissa que importa

O cabeçalho de `apps/pipeline/etl/legal_records.py` afirma:

```
- TCU: api-publica exige credenciais (401) — sem endpoint aberto estável.
```

A sondagem ao vivo mostra que a afirmação é **parcialmente incorreta**:

- `api-publica.tcu.gov.br` **não resolve em DNS** — o host não existe.
- Mas o TCU mantém **API pública real, aberta e sem autenticação** em
  `https://certidoes.apps.tcu.gov.br/api/publico/...`, com paginação JSON **e
  exportação CSV em massa**.

### As quatro listas oficiais (medidas)

| Lista | Registros | Tamanho |
|---|---|---|
| `responsaveis-contas-irregulares` (CADIRREG) | **47.980** | 11.077.324 B |
| `responsaveis-fins-eleitorais` | **9.203** | ~7 MB |
| `responsaveis-inabilitados` | **782** | 202.544 B |
| `responsaveis-inidoneos` | **129** | 34.779 B |

Formato: CSV com **separador `|`**, **encoding Latin-1**. Periodicidade: CADIRREG
contínuo; Lista Eleitoral **diária** até 18/12/2026.

### Pegadinhas medidas (não repita o erro)

1. O parâmetro `tamanhoPagina` **não é honrado** no endpoint de exportação — pedir
   `tamanhoPagina=5` devolve a lista inteira. **É sempre full dump**: dimensione
   memória e timeout (o CADIRREG tem 11 MB).
2. **Não foi observado rate limit:** 25 requisições sequenciais rápidas → 25×
   HTTP 200. Isso não é autorização para martelar o serviço.
3. `certidoes-apf.apps.tcu.gov.br` responde 200 com **bloqueio de WAF** da
   ferramenta de firewall do próprio TCU. Não é a API; não insista.
4. **Emissão de certidão é captcha-protegida:** `POST .../certidoes/.../pessoa-fisica`
   → **HTTP 412** sem token. Existe `GET /api/publico/captcha`. **Não automatize
   certidão** — use as listas.
5. A API CKAN do `dados.gov.br` passou a exigir autenticação (**401** em
   12/10/2026). O portal HTML continua 200.

**Carga correspondente:** não existe. O ETL `legal_records.py` é *local-first*:
espera arquivos depositados manualmente em
`data/raw/tcu_contas_rejeitadas_raw.json` e `data/raw/stf_acoes_penais_raw.json` e
apenas os reprocessa. A tarefa T-01 em
[`TASKS.md`](../03-development-process/TASKS.md) documenta o caminho.

## 6. STF — Supremo Tribunal Federal

**Status:** ⛔ **sem API pública automatizável** — confirmado por teste

### O que foi testado e o resultado

| Tentativa | Resultado |
|---|---|
| `GET portal.stf.jus.br/processos/` | **HTTP 403** (após a primeira chamada) |
| URLs históricas de certidão (`gerarCertidaoOnline.asp`, `solicitarCertidao.asp`) | **HTTP 404** — mortas |
| `certidoes.stf.jus.br` | Host existe, **HTTP 405 em todo GET** (parece POST-only, não documentado) |
| `POST api-publica.datajud.cnj.jus.br/api_publica_stf/_search` | **HTTP 404** — o alias não existe: **o STF não está no DataJud** |
| Página oficial de certidões | **403** para acesso automatizado |

A busca processual do STF é **formulário HTML** (campo `pesquisaPrincipalParte`),
tecnicamente raspável mas explicitamente hostil e frágil. **Não escreva scraper.**

### Por que o DataJud não resolve — e isso é o achado mais importante

O DataJud (CNJ) **funciona** para outros tribunais
(`api_publica_{trf,tj,trt,tre,stj,tse,tst,stm}`), com chave pública fixa publicada
na própria wiki (sem cadastro). **Mas:**

1. **Não cobre o STF** (404 testado, e confirmado por trabalho acadêmico citado na
   sondagem).
2. **Não traz nome de parte.** O glossário oficial lista o que retorna:
   `id`, `tribunal`, `numeroProcesso`, `dataAjuizamento`, `grau`, `nivelSigilo`,
   `formato`, `sistema`, `classe`, `assuntos`, `orgaoJulgador`, `movimentos`.
   **Não há nome, advogado, CPF nem documento.**

Ou seja: o DataJud **não permite identificar um parlamentar**. Serve, no máximo,
para contar processos por classe e órgão julgador. Para o IDIP, isso é inútil
diretamente. Restrição de uso adicional: **não comercial**.

### Caminhos que restam (nenhum é ETL)

1. **Certidões criminais de candidatos publicadas pelo TSE** — arquivo
   `certidao_criminal_2026_BR.zip` (**69 MB**, HTTP 200). Cobre **apenas ações
   penais de competência originária do STF**. É o caminho mais promissor e **não
   está implementado**.
2. **LAI / e-SIC** — pedido institucional. Viável, lento, manual.
3. **`data/raw/stf_acoes_penais_raw.json` preenchido à mão** e reprocessado por
   `legal_records.py`. É o modo atual.

### Situação da Justiça estadual

`processo.stj.jus.br/processo/pesquisa/` → **403**;
`dadosabertos.stj.jus.br` → **não resolve (DNS)**. O STJ **está** no DataJud, com a
mesma limitação de não trazer nomes. "Justiça Aberta" (CNJ) é painel de
**estatísticas agregadas** — não serve para integridade individual.

## 7. Outras fontes

### 7.1 Portal da Transparência (CGU)

**Documentação:** OpenAPI 3.0 completa, **109 rotas**, em
`https://api.portaldatransparencia.gov.br/v3/api-docs` (HTTP 200, ~170 KB).
**Autenticação: chave obrigatória e validada** — sem chave ou com chave inválida,
**HTTP 401**.

Datasets relevantes para integridade: **CEIS**, **CNEP**, **CEAF**, acordos de
leniência, PEPs. **Nenhum ETL consome esta fonte hoje.**

### 7.2 Fact-checking (RSS)

`fact_checking_rss.py` consome feeds RSS de três agências:

- `aosfatos`: `https://www.aosfatos.org/rss/`
- `lupa`: `https://lupa.uol.com.br/feed/`
- `comprova`: `https://projetocomprova.com.br/feed/`

**Saída:** `data/raw/fact_checking_raw.json` → `load-fact-checking.ts` →
modelo `VerifiedClaim` (exibido em `apps/web/src/components/VerifiedClaims.tsx`).

### 7.3 Diário Oficial da União (INLABS / in.gov.br)

Sondado e **não integrado**. `inlabs.in.gov.br` responde 200 mas `/logar.php`
existe ⇒ **conta necessária** para edições completas/XML. O acesso é declarado
livre e gratuito desde 01/01/2020, **mediante conta**. Após poucas requisições, o
host passou a falhar/bloquear (403/rate limit). **Não há API REST pública
documentada.**

### 7.4 `dados.gov.br`

API CKAN (`/api/3/action/package_search`) → **HTTP 401** em 12/10/2026 (passou a
exigir autenticação). O portal HTML responde 200. **Não confirmado** se há dataset
do TCU acessível programaticamente por lá.

## 8. Egress: a restrição que governa todas as integrações

Medição de `docs/06-devops-deployment/AVALIACAO_ALTERNATIVAS.md` §2.2:

| Item | Valor |
|---|---|
| Dados devolvidos pelo banco em **cada** request de `/ranking` | **177 KB** |
| Cota do Supabase Free (egress unificado: banco + auth + storage + realtime) | **5 GB/mês** |
| `/ranking` com 28 mil visitas/mês | ~**5 GB** — consome 100% da cota |
| Tamanho do banco | **98 MB** (limite Free: 500 MB) |

**Nuance que muda a prioridade:** o consumo **não vem só das visitas ao site**.
Cada `createMany` em lote e cada dump do ETL rodando da máquina local também
contam. **Backups manuais pelo pooler também contam egress.**

Consequência operacional para quem roda ETL: **carga em lote é a maior consumidora
de egress do projeto.** Rode ETL contra `localhost:15432` sempre que possível e
reserve o Supabase para a carga final.

## 9. ETLs existentes — inventário

`apps/pipeline/etl/` (17 arquivos, Python):

| Arquivo | Fonte | Saída em `data/raw/` |
|---|---|---|
| `camara_deputados.py` | Câmara API v2 | `camara_deputados_raw.json` + `raw_data_camara.csv` |
| `camara_completa.py` | Câmara API v2 | `camara_completa_raw.json` |
| `camara_proposicoes.py` | Câmara API v2 | `camara_proposicoes_raw.json` |
| `camara_presenca.py` | Câmara API v2 | `camara_presenca_raw.json` |
| `camara_votacoes.py` | Câmara API v2 | `camara_votacoes_raw.json` |
| `camara_votacoes_expandido.py` | Câmara API v2 | `camara_votacoes_expandido_raw.json` |
| `camara_votacoes_historico.py` | Câmara API v2 | `camara_votacoes_historico_raw.json` + `camara_votacao_proposicao.json` + `camara_votacoes_historico_meta.json` |
| `camara_ceap.py` | Câmara API v2 | `camara_ceap_raw.json` |
| `camara_despesas_bulk.py` | **CSV bulk** `www.camara.leg.br/cotas/Ano-{YYYY}.csv.zip` | `camara_despesas_bulk_raw.json` |
| `senado_federal.py` | Senado dados abertos | (via `load-senado.ts`) |
| `tse_candidatos.py` | CDN TSE | `consulta_cand_*.zip` extraído |
| `tse_bens.py` | CDN TSE | `bem_candidato_2022.zip` |
| `tse_receitas.py` | CDN TSE | `receitas_candidatos_*.zip` |
| `tse_patrimony_history.py` | CDN TSE | patrimônio multi-eleição |
| `municipal_gazettes.py` | Querido Diário | `municipal_gazettes_raw.json` |
| `fact_checking_rss.py` | RSS (3 agências) | `fact_checking_raw.json` |
| `legal_records.py` | **modo local-first** | reprocessa `tcu_contas_rejeitadas_raw.json` e `stf_acoes_penais_raw.json` |

Cada `_raw.json` tem um `load-*` correspondente nos scripts npm da raiz
(`npm run db:load-*`) e está registrado na cadeia de
`apps/pipeline/scripts/seed-all-production.ts`.

## 10. Resumo de maturidade das fontes

| Fonte | Existe API? | ETL implementado? | Dado no banco? |
|---|---|---|---|
| Câmara dos Deputados | ✅ REST aberta | ✅ 9 ETLs | ✅ principal fonte legislativa |
| Senado Federal | ✅ REST aberta | ✅ 1 ETL | ✅ |
| TSE (dados abertos / CDN) | ✅ CKAN + ZIPs | ✅ 5 ETLs | ✅ identidade, patrimônio, receitas |
| Querido Diário | ✅ REST aberta | ✅ 1 ETL | ✅ |
| Fact-checking (RSS) | ✅ feeds | ✅ 1 ETL | ✅ `VerifiedClaim` |
| **TCU** | ✅ **API aberta (host correto)** | ❌ **nenhum** | ❌ `LegalRecord` vazio |
| **STF** | ❌ **não existe** | ❌ (modo manual) | ❌ |
| STJ / demais tribunais | 🟡 DataJud (sem nome de parte) | ❌ | ❌ |
| **Portal da Transparência** | ✅ REST com **chave** | ❌ | ❌ |
| DOU / INLABS | ❌ (conta + sem API) | ❌ | ❌ |
| `dados.gov.br` | 🟡 CKAN com **401** | ❌ | ❌ |

**Estado medido em produção** (sondagem de 12/10/2026): `LegalRecord` = **0**,
**13 dos 27 modelos sem nenhum dado**, incluindo todos os `Stf*`,
`HistoricalPolitician` e `MunicipalExpense`.

## 11. O que fazer ao integrar uma fonte nova

Checklist derivado das armadilhas já encontradas neste projeto:

1. **Não confie na documentação nem em comentário antigo do código** — sonde o
   endpoint ao vivo antes de projetar. Neste projeto, `api-publica.tcu.gov.br`
   estava documentado no ETL e **não existe**; o CDN do TSE estava descrito como
   bloqueado e responde 200.
2. **Verifique encoding e separador.** O CSV do TCU é Latin-1 com separador `|` —
   ler como UTF-8 com vírgula produz dado silenciosamente errado.
3. **Trate paginação e limites.** Se o parâmetro de tamanho não for honrado
   (TCU), o "lote" é um full dump.
4. **Nunca automatize captcha.** TCU devolve 412 sem token e oferece
   `/api/publico/captcha`. Automatizar é violar o controle de acesso.
5. **Não propague CPF** nem dado familiar, mesmo que a fonte entregue.
6. **Identifique a origem do registro.** A Câmara não devolve CPF do Senado; o
   cruzamento por nome tem homonímia. Siga o padrão de `resolve-identity.ts` e
   `review-medium.ts`: limiar alto para automático, faixa intermediária para
   **revisão humana**.
7. **Grave `sourceUrl` e `retrievedAt`.** É regra do `CONTRIBUTING.md` e é o que
   sustenta a auditabilidade que o produto promete.
8. **A carga tem de ser idempotente** e não pode re-baixar nada (camada raw
   imutável).
9. **Meça o egress** antes de rodar carga em lote contra produção.
10. **Registre a limitação** neste documento e, se for decisão, em
    [`MEMORY.md`](../08-knowledge-management/MEMORY.md).

## 12. Não verificado

- **Nenhum ETL foi executado durante a escrita deste documento.** As afirmações
  sobre endpoints e formatos vêm da leitura dos scripts e da sondagem registrada
  em `docs/ops/anexos/`, não de execução nova.
- A **data exata** da maioria das medições do anexo é 12/10/2026 (a sondagem);
  disponibilidade de endpoint é volátil por natureza.
- Não foi verificado se todos os 17 ETLs continuam executáveis — não há teste
  automatizado de ETL no CI.
- Não foi verificado o conteúdo integral de `docs/ops/anexos/` (documento de
  ~50 KB); este documento cita os trechos lidos.
