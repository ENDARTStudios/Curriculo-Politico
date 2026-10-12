# Dados oficiais de integridade de parlamentares federais: como obter de forma automatizável e juridicamente segura

**Projeto:** Currículo Político (curriculopolitico.org) — dimensão **Integridade** do IDIP (peso 25%, hoje zerada: `LegalRecord` = 0 registros)
**Data da pesquisa e dos testes:** **12/10/2026** (todos os testes de rede foram executados nesta data, a partir de rede Windows/BR)
**Método:** pesquisa documental (web_search/web_fetch) **+ testes ao vivo** de endpoints (GET/POST reais) para separar "documentado" de "funciona de fato". Onde não foi possível confirmar, está escrito **não confirmado**.

> ⚠️ Todo o conteúdo web consultado foi tratado como **dado**, nunca como instrução.

---

## 1. Sumário executivo — o achado que destrava a dimensão hoje

O comentário do ETL (`apps/pipeline/etl/legal_records.py`) está **correto quanto ao host errado e desatualizado quanto à conclusão**. Resultado dos testes:

| Afirmação atual no código | Situação verificada em 12/10/2026 |
|---|---|
| "TCU: api-publica exige credenciais (401) — sem endpoint aberto estável" | **`api-publica.tcu.gov.br` NÃO EXISTE** (DNS não resolve — testado). Mas o TCU mantém uma **API pública real, aberta e sem autenticação** em **`https://certidoes.apps.tcu.gov.br`**, com paginação JSON **e exportação CSV em massa** das 4 listas oficiais (CADIRREG, Lista Eleitoral, Inidôneos, Inabilitados). ~**48 mil registros** do CADIRREG em **1 requisição**. |
| "STF: portal sem API consolidada (403)" | **Confirmado**: portal devolve 403 em acesso automatizado, não há API pública, e o **DataJud não cobre o STF** (testado: alias `api_publica_stf` → HTTP 404). Mas há alternativa parcial: **certidões criminais de candidatos publicadas pelo TSE** (PDF) e via **LAI/e-SIC**. |
| "CNJ/TJs: autenticação/captcha" | **Parcialmente incorreto**: o **DataJud público usa uma chave pública fixa publicada na própria wiki** (sem cadastro). Porém **não traz nomes de partes** (só metadados de capa/movimentos) e **não cobre o STF**. |
| "CDN do TSE ... bloqueada" | **Não se confirma hoje**: a CDN respondeu **HTTP 200** em todos os testes (`consulta_cand_2026.zip`, `prestacao_de_contas_eleitorais_candidatos_2022.zip` = 548 MB, `certidao_criminal_2026_BR.zip` = 69 MB). O bloqueio provavelmente era de rede/ambiente, não do TSE. |
| "Querido Diário bloqueado" | **Não confirmado**: o host resolve e responde HTTP 301 para HTTPS, mas o **handshake TLS falha neste ambiente** (`SEC_E_ILLEGAL_MESSAGE`). A API é pública, sem chave e documentada. Para o escopo **federal**, o Querido Diário é de baixo valor (só diários **municipais do executivo**). |

**Conclusão executiva:** a dimensão Integridade pode sair do zero **em 2–5 dias de trabalho**, usando **TCU (API pública) + TSE (CPF/identidade) + Portal da Transparência (sanções)** — todas com base legal explícita e sem scraping hostil. O gargalo real não é técnico, é de **identidade (CPF)**, porque casar nome por semelhança gera **falsos positivos** (risco jurídico direto do projeto).

---

## 2. FONTE 1 — TCU (contas julgadas irregulares / CADIRREG / inidôneos / inabilitados)

### 2.1 O que existe hoje (o que mudou desde 2020)

As listas em PDF de 2020 que você encontrou **foram substituídas por uma plataforma web dinâmica**:

- **Plataforma de Certidões do TCU:** `https://certidoes.apps.tcu.gov.br` [1]
- **Página institucional da lista eleitoral:** `https://sites.tcu.gov.br/contas-julgadas-irregulares` [2] (redireciona para o mesmo conteúdo de `https://contasirregulares.tcu.gov.br/` — testado: HTTP 200, mesmo HTML)
- **Atualização:** a lista eleitoral foi publicada em **04/08/2026** e é **atualizada DIARIAMENTE até 18/12/2026** (diplomação), com entradas e retiradas de nomes [2][3]. O CADIRREG é **histórico** (sem corte de 8 anos) [2].
- **Lista Eleitoral 2026:** 9.201 registros / **6.318 responsáveis distintos** (o TCU divulgou "mais de 6,1 mil nomes" — confere) [3].
- **CADIRREG (Contas Julgadas Irregulares):** **47.978 registros / 28.559 distintos** — pessoa física e jurídica.
- **Inabilitados:** 780 registros / 595 distintos. **Licitantes Inidôneos:** 127 registros / 120 distintos.

### 2.2 API pública (SEM autenticação) — endpoints testados e funcionando

Base: **`https://certidoes.apps.tcu.gov.br`**
Autenticação: **nenhuma**. Nenhum cookie, chave, token ou captcha foi exigido nas rotas de **lista/exportação**. (O captcha existe apenas para **emissão de certidão** — ver 2.4.)

**a) Metadados de eleições**
```http
GET /api/publico/eleicoes/anos        -> [2026,2024,2022,2020,2018,2016,2014]
GET /api/publico/eleicoes/ultimoAno   -> {"ano":2026}
```

**b) Listas paginadas (POST, JSON)** — padrão `?paginaAtual=N&tamanhoPagina=M`
```http
POST /api/publico/responsaveis-fins-eleitorais-com-paginacao?paginaAtual=1&tamanhoPagina=100&anoEleicao=2026
POST /api/publico/responsaveis-contas-irregulares-com-paginacao?paginaAtual=1&tamanhoPagina=100
POST /api/publico/responsaveis-inidoneos-com-paginacao?paginaAtual=1&tamanhoPagina=100
POST /api/publico/responsaveis-inabilitados-com-paginacao?paginaAtual=1&tamanhoPagina=100
Content-Type: application/json
Body: {}                      (ou filtro: {"cpf":"00000000000"} / {"cnpj":"00000000000000"})
```
Resposta de `responsaveis-fins-eleitorais-com-paginacao` (teste real, 12/10/2026):
```json
{
  "totalPaginas": 3067, "totalElementos": 9201, "paginaAtual": 1, "tamanhoPagina": 3,
  "elementos": [{
    "numeroProcessoFormatado": "007.415/2021-4",
    "nome": "A TTALI RESENDE LELIS CAMARGO",
    "numeroRegistro": "599.981.481-20",
    "municipio": "INHUMAS", "uf": "GO",
    "dataTransitoEmJulgado": "09/05/2024",
    "dataFinalFinsEleitorais": "09/05/2032",
    "linkDeliberacoesProcesso": "https://contas.tcu.gov.br/pesquisaJurisprudencia/#/resultado/acordao-completo/00741520214.PROC",
    "linkAcompanhamentoProcesso": "https://conecta-tcu.apps.tcu.gov.br/tvp/67339516",
    "codigoProcesso": 67339516, "seProcessoGestao": "S",
    "numeroAcordaoFormatado": "10367/2023-1C"
  }],
  "totalResponsaveisDistintos": 6318
}
```
> Observação: `nome` **não** funciona como filtro (testado: ignorado, retorna tudo). Filtros efetivos observados no bundle do app: `cpf`, `cnpj` (e `anoEleicao` para a lista eleitoral).

**c) EXPORTAÇÃO CSV EM MASSA — a rota mais valiosa (1 request = lista inteira)**
```http
POST /api/publico/responsaveis-fins-eleitorais/exportar-para-csv?paginaAtual=1&tamanhoPagina=50000&anoEleicao=2026
POST /api/publico/responsaveis-contas-irregulares/exportar-para-csv?paginaAtual=1&tamanhoPagina=50000
POST /api/publico/responsaveis-inidoneos/exportar-para-csv?paginaAtual=1&tamanhoPagina=50000
POST /api/publico/responsaveis-inabilitados/exportar-para-csv?paginaAtual=1&tamanhoPagina=50000
Content-Type: application/json   Body: {}
```
Resultados medidos (12/10/2026):

| Dataset | HTTP | Content-Type | Bytes | Linhas | Nome do arquivo no app |
|---|---|---|---|---|---|
| `responsaveis-contas-irregulares` (CADIRREG) | 200 | `application/octet-stream` | **11.077.324** | 47.980 | `lista-responsaveis-contas-irregulares.csv` |
| `responsaveis-fins-eleitorais` | 200 | `application/octet-stream` | ~7 MB (9.201 linhas) | 9.203 | `lista-responsaveis-fins-eleitorais.csv` |
| `responsaveis-inabilitados` | 200 | `application/octet-stream` | 202.544 | 782 | `lista-responsaveis-inabilitados.csv` |
| `responsaveis-inidoneos` | 200 | `application/octet-stream` | 34.779 | 129 | `lista-responsaveis-inidoneos.csv` |

**⚠️ Pegadinhas de implementação (todas verificadas):**
1. **Encoding Latin-1 / ISO-8859-1** (não UTF-8). Nomes aparecem como `VER�NICA` se você decodificar como UTF-8. Decodifique com `ISO-8859-1`/`Windows-1252`.
2. O CSV tem **BOM**, e a **primeira linha é `sep=|`** (diretiva de Excel), a **segunda** é o cabeçalho real, os dados começam na **terceira**.
3. Separador é **pipe `|`**, não vírgula.
4. Cabeçalhos por dataset (linha 2):
   - contas-irregulares: `Nome|CPF/CNPJ|UF|Município|Processo|Link do processo|Acórdãos|Trânsito em julgado|`
   - inabilitados: `Nome|CPF|UF|Município|Processo|Link do processo|Acórdão|Data do acórdão|Link dos acórdãos|Trânsito em julgado|Data final da sanção|`
   - inidôneos: `Nome|CPF/CNPJ|UF|Município|Processo|Link do processo|Acórdão|Data do acórdão|Link dos acórdãos|Trânsito em julgado|Data final da sanção|`
5. O parâmetro `tamanhoPagina` **não é honrado** no endpoint de exportação: pedi `=5` e veio a lista completa. Ou seja: **é sempre full dump** — planeje memória/timeout (o CADIRREG tem 11 MB).
6. **Não observamos rate limit**: 25 requisições sequenciais rápidas → 25× HTTP 200.

### 2.3 O que NÃO funciona / bloqueios conhecidos
- **`api-publica.tcu.gov.br` não resolve em DNS** (testado). O comentário do ETL está certo sobre a inexistência desse host aberto — mas ele não é a única porta de entrada.
- **`certidoes-apf.apps.tcu.gov.br`** → HTTP 200 com **bloqueio de WAF**: "O acesso a este recurso foi bloqueado pela solução de firewall de aplicações do Tribunal de Contas da União". **Não é a API**; não insista.
- **Emissão de certidão é captcha-protegida**: `POST /api/publico/certidoes/contas-julgadas-irregulares/pessoa-fisica` → **HTTP 412 Precondition Failed** sem token; existe `GET /api/publico/captcha` (HTTP 200, JSON). **Não automatize certidão** — use as listas.
- **A API é de aplicação front-end não documentada oficialmente.** O bundle JS (`/assets/index-DgUhezAG.js`) expõe as rotas `/api/publico/...`. Trate como **fonte oficial porém sem SLA/contrato de estabilidade**: implemente *fallback* para o CSV salvo localmente e *hash* de verificação.

### 2.4 Dados abertos "clássicos" (dados.gov.br / portal.tcu.gov.br)
- **`dados.gov.br` API CKAN** (`/api/3/action/package_search`) → **HTTP 401 Unauthorized** em 12/10/2026 (passou a exigir autenticação). O portal HTML responde 200. **Não confirmado** se há dataset do TCU lá acessível programaticamente.
- As listas antigas em PDF (`.../Responsaveis com contas julgadas irregulares 2020.pdf`) estão **obsoletas** — não use.
- Existe material de referência do TCU sobre análise de dados (LabContas/`apoioauditoria.tcu.gov.br`), mas **não é API**.

**Vale a pena usar o "Certificado/Certidão de Inidôneos"?** **Não para ETL.** A certidão é documento por CPF/CNPJ, com captcha, validade de 30 dias, e só reproduz o que a **lista pública já entrega em massa**. Use a certidão apenas como **link de verificação para o usuário final** (`https://certidoes.apps.tcu.gov.br/`).

### 2.5 Ficha-resumo — TCU

| Item | Valor |
|---|---|
| Endpoint/dataset | `https://certidoes.apps.tcu.gov.br/api/publico/...` [1]; página `https://sites.tcu.gov.br/contas-julgadas-irregulares` [2] |
| Autenticação | **Nenhuma** (listas). Captcha só para certidão. |
| Formato | JSON paginado; **CSV `sep=\|`, Latin-1, pipe** |
| Periodicidade | Listing eleitoral: **diária** até 18/12/2026 [2]; CADIRREG: contínuo (histórico) |
| Cobertura | União (TCU). **Não** inclui TCEs estaduais/municipais [2, Q11] |
| Esforço de implementação | **BAIXO** (1 fetch + parse, ~1 dia) |
| Bloqueios | Host antigo inexistente; WAF em `certidoes-apf`; captcha em certidões; API não documentada oficialmente |

---

## 3. FONTE 2 — STF (ações penais / AP / Inq) e o caminho CNJ

### 3.1 STF: resultado direto
- **Não há API pública de processos do STF.** Buscas por "API" retornam apenas **painéis agregados** e jurisprudência.
- **`portal.stf.jus.br` bloqueia acesso automatizado**: `GET /processos/` → **HTTP 403** (após a primeira chamada); a busca processual é um **formulário HTML** (campo `pesquisaPrincipalParte`, "Digite o nome da parte") — raspável em tese, mas **hostil e frágil**.
- **`jurisprudencia.stf.jus.br/api/search/search`** (POST JSON interno) respondeu **HTTP 202 com corpo vazio** em 12/10/2026 → **não confirmado** como API utilizável (provável processamento assíncrono/necessidade de headers de sessão).
- **Certidões judiciais do STF**: as URLs históricas (`www.stf.jus.br/portal/certidao/gerarCertidaoOnline.asp`, `solicitarCertidao.asp`) estão **404 (mortas)** em 12/10/2026. O host **`certidoes.stf.jus.br` existe mas devolve HTTP 405 em todo GET** (parece API POST-only, **não documentada** — **não confirmado**). Página oficial de serviço (`portal.stf.jus.br/textos/verTexto.asp?...certidoesAntecedentesCriminais`) → **403** para acesso automatizado. A certidão de **antecedentes para fins eleitorais** existe e cobre **apenas ações penais de competência originária do STF** [9].
- **`corteaberta.stf.jus.br` não resolve em DNS** (descontinuado). O programa **Corte Aberta** hoje vive em `https://portal.stf.jus.br/hotsites/corteaberta/` e o app em **`https://transparencia.stf.jus.br/extensions/corte_aberta/corte_aberta.html`** (Qlik Sense), com "área de dados abertos" para download em **XLSX/CSV** [7][8]. **Porém:** são **bases estatísticas agregadas** (acervo, decisões, tempo de tramitação), **não** a lista de AP/Inq por parlamentar. **Não serve** para o IDIP individual.

### 3.2 DataJud (CNJ) — o que realmente entrega
- **Base:** `https://api-publica.datajud.cnj.jus.br/api_publica_{tribunal}/_search` (Elasticsearch) [4][5].
- **Autenticação:** chave **pública fixa**, publicada na própria wiki (pode ser rotacionada pelo CNJ a qualquer momento) [4]:
  ```
  Authorization: APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==
  ```
- **Aliases disponíveis (wiki)** [5]: `stj`, `tse`, `tst`, `stm`, TRF1–TRF6, todos os TJs, TRT1–24, todos os TREs, TJMs.
  ➡️ **O STF NÃO está na lista.**
- **Teste ao vivo (12/10/2026):**
  - `POST /api_publica_stf/_search` → **HTTP 404 (Not Found)** ⇒ **alias não existe: STF não está no DataJud**.
  - `POST /api_publica_stj/_search` → **HTTP 429 Too Many Requests** ⇒ alias existe, mas há throttling.
  - `POST /api_publica_tse/_search` → **timeout de 30 s** ⇒ alias existe mas é lento/pesado.
- **Confirmação independente:** trabalho acadêmico do TJPI afirma que "os dados e metadados processuais do **STF não estão centralizados no DataJud**" [6].
- **LIMITAÇÃO CRÍTICA:** o **glossário** [10] mostra que a API retorna **apenas metadados de capa e movimentos**: `id`, `tribunal`, `numeroProcesso`, `dataAjuizamento`, `grau`, `nivelSigilo`, `formato`, `sistema`, `classe`, `assuntos`, `orgaoJulgador`, `movimentos`. **Não há nome de parte, advogado, CPF ou documento.** Ou seja: **o DataJud não permite identificar um parlamentar** — só permite, no máximo, contar/analisar processos por classe e órgão julgador.
- **Termo de Uso (relevante juridicamente)** [11]: uso **"exclusivamente para fins legais, não comerciais e autorizados"**; o usuário **não pode modificar, distribuir, vender ou explorar comercialmente** os dados; o CNJ **não garante precisão/integridade/atualidade**; e o usuário deve **dar ciência ao CNJ** de qualquer informação/estudo/relatório que disponibilize ao público (cláusula 3.9).

### 3.3 STJ, "Justiça Aberta"
- **STJ:** `processo.stj.jus.br/processo/pesquisa/` → **HTTP 403**; `dadosabertos.stj.jus.br` → **não resolve (DNS)**; a página `www.stj.jus.br/.../Dados-abertos.aspx` responde 200 mas com **conteúdo vazio para leitura automatizada** (não é API). **Não confirmado** que exista API pública do STJ. *(O STJ, porém, está no DataJud — com a mesma limitação de não trazer nomes de partes.)*
- **"Justiça Aberta" (CNJ):** painel de **estatísticas agregadas** por tribunal. **Não serve** para integridade individual. (Base conceitual: **Res. CNJ 331/2020** estrutura o DataJud; a fonte operacional é o DataJud acima.)

### 3.4 Ficha-resumo — STF / Judiciário

| Item | Valor |
|---|---|
| API pública do STF | **Não existe** (portal 403, certidões 405/404, jurisprudência 202 vazio) |
| Corte Aberta | `https://portal.stf.jus.br/hotsites/corteaberta/` + app Qlik `transparencia.stf.jus.br/extensions/corte_aberta/corte_aberta.html`; XLSX/CSV **agregados** [7][8] |
| DataJud | `https://api-publica.datajud.cnj.jus.br/api_publica_{trf,tj,trt,tre,stj,tse,tst,stm}/_search`; chave pública [4]; **sem STF (404 testado)**; **sem nomes de partes** [10]; uso **não comercial** [11] |
| Formato | JSON (Elasticsearch) |
| Periodicidade | contínua (atualização dos índices por tribunal) |
| Cobertura | ~90 tribunais brasileiros, **exceto STF** |
| Esforço de implementação | Médio (Elasticsearch DSL) — **mas valor para o IDIP ≈ zero** por falta de identificação de partes |
| Bloqueios | STF fora do DataJud; sem nomes de partes; 429/rate limiting; WAF/bloqueio no portal do STF |

**Conclusão:** para "ações penais no STF contra parlamentares", **não há rota automatizável em 30 dias**. A rota correta é **LAI/e-SIC** (seção 6) ou contratação de base de terceiros. Alternativa-ponte: as **certidões criminais de candidatos publicadas pelo TSE** (seção 4.2).

---

## 4. FONTE 3 — Alternativas e complementos

### 4.1 Portal da Transparência (CGU) — CEIS, CNEP, CEAF, Acordos de Leniência, PEPs

- **Documentação (OpenAPI 3.0 completa, 109 rotas, 170 KB — testado HTTP 200):** `https://api.portaldatransparencia.gov.br/v3/api-docs` [12]
- **Autenticação:** `apiKey` no **header HTTP `chave-api-dados`**. A própria spec diz: *"Para obter a chave acesse http://www.portaldatransparencia.gov.br/api-de-dados/cadastrar-email"* [12].
  - Teste sem chave / com chave inválida → **HTTP 401** (confirmado). Ou seja: **a chave é obrigatória e validada**.
  - **Como obter:** formulário em `https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email`. O acesso automatizado a essa página foi barrado por **"Human Verification"** ⇒ **obtenha a chave manualmente, no navegador** (leva minutos; é gratuita). ⚠️ Não é captcha do ETL: é só o cadastro.
- **Endpoints relevantes (extraídos da spec oficial)** [12]:

| Rota | Parâmetros | Observação |
|---|---|---|
| `GET /api-de-dados/ceis` | `codigoSancionado` (CPF/CNPJ), `nomeSancionado`, `orgaoSancionador`, `dataInicialSancao`, `dataFinalSancao`, `pagina` (**obrigatório**) | Empresas inidôneas e suspensas |
| `GET /api-de-dados/cnep` | idem CEIS | Empresas punidas (Lei Anticorrupção) |
| `GET /api-de-dados/ceaf` | `cpfSancionado`, `nomeSancionado`, `orgaoLotacao`, `dataPublicacaoInicio/Fim`, `pagina` | Expulsões da administração federal |
| `GET /api-de-dados/acordos-leniencia` | (idem) | Acordos de leniência |
| `GET /api-de-dados/peps` | `cpf`, `nome`, `descricaoFuncao`, `orgaoServidorLotacao`, `dataInicioExercicioDe/Ate`... , `pagina` | **Pessoas Expostas Politicamente** — útil como sinal, não como sanção |
| `GET /api-de-dados/servidores...` | — | Servidores federais |

- **Cobertura:** sanções **federais** (CGU). CEIS/CNEP atingem majoritariamente **pessoas jurídicas** — para parlamentares pessoa física o rendimento é **baixo**, mas é dado oficial, barato e juridicamente limpo (sanção publicada por autoridade).
- **Periodicidade:** atualização contínua, conforme publicação das sanções (não há SLA público divulgado — **não confirmado**).
- **Esforço:** **BAIXO** (REST simples + chave).

### 4.2 TSE — Dados Abertos (o "CDN bloqueado" NÃO se confirma; e é a chave da identidade/CPF)

- **Portal CKAN:** `https://dadosabertos.tse.jus.br` [13]. API CKAN **funcionando** (testado):
  - `GET https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026` → **HTTP 200**, `metadata_modified = 16/09/2026`, **92 recursos**.
  - `GET .../api/3/action/package_search?q=candidatos&rows=30` → **HTTP 200** (candidatos 1978→2026; prestação de contas por ano).
- **CDN (download em massa) FUNCIONA — testado em 12/10/2026:**

| Arquivo | HTTP | Tamanho |
|---|---|---|
| `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip` | **200** | 3.239.555 B |
| `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip` | **200** | 4.387.073 B |
| `https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2022.zip` | **200** | **548.602.006 B** |
| `https://cdn.tse.jus.br/estatistica/sead/odsele/certidao_criminal/certidao_criminal_2026_BR.zip` | **200** | 69.052.645 B |

- **🔑 ACHADO DECISIVO PARA O IDIP:** dentro de `consulta_cand_2026.zip` existe **`consulta_cand_2026_BRASIL.csv`** (11,6 MB, **21.013 linhas**, todas as candidaturas do país) com **`NR_CPF_CANDIDATO`** em texto claro (ex.: `"03010261730"`), além de nome civil, nome de urna, cargo, UF, município, data de nascimento, partido. Encoding **Latin-1**, delimitador `;`, campos entre aspas.
  ➡️ **É a ponte determinística de identidade** que faltava: `Parlamentar → candidatura TSE → CPF → listas TCU / CEIS`.
- **Bônus de integridade:** o TSE publica **`certidao_criminal_2026_{UF}.zip`** (PDFs das certidões criminais apresentadas no registro de candidatura) — **fonte oficial de antecedentes criminais** mesmo sem API do STF. Formato **PDF** (extração por OCR/parse = esforço **ALTO**), e há que se verificar caso a caso se a certidão cobre Justiça Federal/Estadual/Eleitoral.
- **Periodicidade:** anual por eleição; `candidatos-2026` atualizado em 16/09/2026; prestação de contas 2026 em 22/09/2026 [13].
- **Esforço:** **BAIXO–MÉDIO** (download de ZIPs, encoding Latin-1, join por CPF).

### 4.3 Câmara dos Deputados e Senado (o que **não** estava no radar: CPF)

- **Câmara (funcionando, testado):** `https://dadosabertos.camara.leg.br/api/v2/deputados/{id}` → **HTTP 200** e traz **`"cpf":"36607606504"`** em claro, além de `nomeCivil`, `dataNascimento`, `siglaUf`.
  ➡️ **join determinístico direto** para deputados.
- **Senado (funcionando, testado):** `https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json` → 200; `.../senador/{codigo}.json` → 200, mas **NÃO retorna CPF** (só `NomeParlamentar`, `NomeCompletoParlamentar`, `SiglaPartidoParlamentar`, `UfParlamentar`).
  ➡️ Para senadores, obtenha o CPF **via TSE** (candidaturas a Senador) e faça o casamento por `NomeCompletoParlamentar` + UF + ano.

### 4.4 Querido Diário (Open Knowledge Brasil)

- **API pública:** `https://api.queridodiario.ok.org.br/docs`; endpoints `/gazettes`, `/cities`; **sem autenticação**; licença **CC-BY**; código **MIT**; limite recomendado **60 req/min** [14].
- **Teste neste ambiente (12/10/2026):** host resolve (Cloudflare) e `http://` → **HTTP 301** para HTTPS, mas o **handshake TLS falha** (`schannel: SEC_E_ILLEGAL_MESSAGE`) em `curl`/`Invoke-WebRequest`, inclusive forçando TLS 1.3. ⇒ **NÃO CONFIRMADO** se a API está no ar hoje a partir de outra rede; **teste de um container Linux** antes de descartar.
- **Alternativas:** (a) **auto-hospedar** o stack (`okfn-brasil/querido-diario-*`, docker-compose) [15]; (b) usar o **wrapper Python** oficial [15]; (c) raspar o diário municipal diretamente.
- **Relevância para o IDIP federal:** **BAIXA** — o QD cobre **diários oficiais do executivo municipal**, não o Congresso nem o STF/TCU. Serve para *sinais* (nomeações, contratos, sanções locais), não para a dimensão Integridade de parlamentares federais.

### 4.5 Diário Oficial da União (INLABS / in.gov.br)

- **`https://inlabs.in.gov.br/`** → HTTP 200; **`/logar.php`** existe ⇒ **login necessário** para edições completas/XML. O repositório oficial da Imprensa Nacional afirma que o acesso aos arquivos das edições completas (PDF e XML) é **livre e gratuito desde 01/01/2020** [16] — mas **mediante conta**.
- **`https://www.in.gov.br/leiturajornal?secao=do1&data=DD-MM-YYYY`** → HTTP 200 (HTML de app Liferay; o conteúdo é injetado por portlet `br_com_seatecnologia_in_buscadou_BuscaDouPortlet`). Após poucas requisições, o host **passou a falhar/bloquear** (403/rate limit). **Não há API REST pública documentada.**
- **`https://www.in.gov.br/consulta/-/buscar/dou?...`** — endpoint de busca usado pelo front-end; acesso automatizado instável (DNS/bloqueio).
- **Esforço:** **MÉDIO–ALTO**. **Relevância para o IDIP:** baixa/média (útil para monitorar atos e sanções publicadas, não para "quem é o parlamentar X").
- **Alternativa open-source:** projeto **Ro-DOU** (nas "projetos relacionados" do Querido Diário) [14].

### 4.6 `dados.gov.br`
- API CKAN (`/api/3/action/package_search`) → **HTTP 401** em 12/10/2026 (passou a exigir autenticação). Portal HTML 200. **Não confirmado** que continue utilizável sem chave.

### 4.7 Tabela consolidada

| Fonte | URL do endpoint/dataset | Auth | Formato | Periodicidade | Cobertura | Esforço | Bloqueios conhecidos |
|---|---|---|---|---|---|---|---|
| **TCU – Lista Eleitoral** | `POST certidoes.apps.tcu.gov.br/api/publico/responsaveis-fins-eleitorais/exportar-para-csv?paginaAtual=1&tamanhoPagina=50000&anoEleicao=2026` [1] | **Nenhuma** | CSV `\|`, Latin-1 | **diária** (até 18/12/2026) | União, 8 anos, só trânsito em julgado | **Baixo** | API não documentada; sem SLA |
| **TCU – CADIRREG** | `POST .../responsaveis-contas-irregulares/exportar-para-csv` [1] | Nenhuma | CSV `\|`, Latin-1 | contínuo (histórico, 47.978 reg.) | União | **Baixo** | idem |
| **TCU – Inidôneos / Inabilitados** | `POST .../responsaveis-inidoneos\|inabilitados/exportar-para-csv` [1] | Nenhuma | CSV | contínuo | União (sanções a fornecedores) | Baixo | idem |
| **TCU – Certidão** | `certidoes.apps.tcu.gov.br/emitir-certidao-...` [1] | **captcha** | PDF (30 dias) | sob demanda | individual | — | **412 sem captcha**; `certidoes-apf` com WAF |
| **STF – processos/AP** | — | — | — | — | — | **Inviável** | portal **403**; sem API; `certidoes.stf.jus.br` **405** |
| **STF – Corte Aberta** | `portal.stf.jus.br/hotsites/corteaberta/`; `transparencia.stf.jus.br/extensions/corte_aberta/corte_aberta.html` [7][8] | Nenhuma (web) | XLSX/CSV **agregado** | contínuo | estatísticas do STF | Médio | **não** é dado por parlamentar |
| **DataJud (CNJ)** | `api-publica.datajud.cnj.jus.br/api_publica_{alias}/_search` [4][5] | **Chave pública fixa** | JSON (ES) | contínua | ~90 tribunais, **sem STF** | Médio | **sem nomes de partes** [10]; 429; uso **não comercial** [11] |
| **Portal da Transparência** | `api.portaldatransparencia.gov.br/api-de-dados/{ceis,cnep,ceaf,peps}` [12] | **`chave-api-dados`** (grátis, cadastro) | JSON | contínua | sanções federais | **Baixo** | cadastro exige navegador ("Human Verification") |
| **TSE – Candidaturas** | `cdn.tse.jus.br/.../consulta_cand_YYYY.zip` [13] | Nenhuma | CSV `;`, Latin-1, **com CPF** | anual | nacional | **Baixo** | — |
| **TSE – Prestação de contas** | `cdn.tse.jus.br/.../prestacao_de_contas_eleitorais_candidatos_YYYY.zip` [13] | Nenhuma | CSV | anual | nacional | Médio (548 MB) | — |
| **TSE – Certidões criminais** | `cdn.tse.jus.br/.../certidao_criminal_2026_{UF}.zip` [13] | Nenhuma | **PDF** | anual | candidatos | **Alto** (PDF/OCR) | validar escopo da certidão |
| **Câmara** | `dadosabertos.camara.leg.br/api/v2/deputados/{id}` | Nenhuma | JSON **com CPF** | contínua | deputados | Baixo | — |
| **Senado** | `legis.senado.leg.br/dadosabertos/...` | Nenhuma | JSON **sem CPF** | contínua | senadores | Baixo | sem CPF |
| **Querido Diário** | `api.queridodiario.ok.org.br/gazettes` [14] | Nenhuma | JSON | conforme raspagem | executivo **municipal** | Médio | TLS falhou aqui (**não confirmado**); 60 req/min |
| **DOU / INLABS** | `inlabs.in.gov.br`, `www.in.gov.br/leiturajornal` [16] | conta INLABS | PDF/XML/HTML | diária | atos federais | Médio–Alto | sem API REST; rate limit/403 |
| **dados.gov.br** | `/api/3/action/*` | ? | JSON | — | — | — | **HTTP 401** em 12/10/2026 |

---

## 5. Viabilidade jurídica e operacional

### 5.1 Bases legais que **autorizam** o uso (cite-as no site)
1. **Lei Complementar 64/1990, art. 1º, I, "g"** (redação da **LC 135/2010 — Ficha Limpa**): é a base legal que obriga o TCU a publicar a lista eleitoral de contas julgadas irregulares [2]. Usar essa lista é usar **exatamente o dado que a lei manda publicar**.
2. **Lei 8.443/1992 (Lei Orgânica do TCU), arts. 16 e 91** e **Lei 9.504/1997, art. 11, §5º** — citados pelo próprio TCU como fundamento da certidão/lista [1].
3. **Lei 12.527/2011 (LAI)**: qualquer pessoa pode pedir informação pública, **sem justificar** o pedido; prazo de **20 dias, prorrogável por mais 10** [17].
4. **LGPD (Lei 13.709/2018), art. 7º, §§3º e 4º**: o tratamento de **dados de acesso público** deve considerar **finalidade, boa-fé e interesse público**; dados **tornados manifestamente públicos** dispensam consentimento, **resguardados os direitos do titular**. Somam-se os princípios do **art. 6º** (finalidade, adequação, **necessidade**, transparência, qualidade) [18][19].
5. **Decreto 8.777/2016** (Política de Dados Abertos do Executivo federal) — citado como licença na própria API do Portal da Transparência [12].

### 5.2 Obrigações e cautelas (o que **protege** o projeto)
- **Minimização (LGPD art. 6º, III):** **não publique CPF**. Use o CPF **internamente** para o casamento (garantia de acerto) e **armazene-o com hash (SHA-256 + salt)** ou em coluna restrita. O site exibe **nome + link para a fonte oficial + data de consulta**.
- **Fonte e data sempre visíveis:** cada registro deve carregar `sourceUrl`, `sourceName`, `fetchedAt`, `dataTransitoEmJulgado`, `numeroAcordao`, `linkDeliberacoesProcesso`. **Cite a URL e a data** — é o que converte "acusação" em "reprodução de dado oficial".
- **Presunção de inocência (CF, art. 5º, LVII):** pontue **apenas decisões com trânsito em julgado**. As listas do TCU já são construídas assim (excluem decisões não transitadas, arquivamentos, condenados só em multa, decisões anuladas/suspensas) [1][2]. Processos **em andamento** (se algum dia entrarem via DataJud/LAI) devem ficar em **campo separado, não pontuado**, com rótulo explícito "processo em tramitação — sem decisão definitiva".
- **Risco de homonímia ⇒ risco de difamação (CP arts. 138–140; CC arts. 186, 187 e 927):** este é o **maior risco do projeto**. Um "José Silva" a mais no IDIP é um erro grave. **Mitigação obrigatória:** casar por **CPF** (TSE/Câmara) e, na impossibilidade, exigir **match composto** (nome completo normalizado + UF + município + data de nascimento) e **nunca** pontuar com similaridade de nome isolada. Registre o *match score* e o método (auditoria).
- **Direito de resposta e correção:** canal visível de contestação (LGPD art. 18) e *changelog* de retificações. O TCU **retira e inclui nomes diariamente** [2] — o ETL precisa **remover** registros que saíram da lista (soft delete + histórico), não só inserir.
- **Linguagem neutra:** "consta na lista oficial X do TCU em DD/MM/AAAA com trânsito em julgado em DD/MM/AAAA". **Nunca** "corrupto", "condenado por corrupção" (se a decisão não diz isso) ou "inelegível" (só a Justiça Eleitoral declara — o próprio TCU enfatiza isso [2]).
- **DataJud / CNJ:** respeitar o **Termo de Uso** [11]: uso **não comercial**, não redistribuir a API, e **dar ciência ao CNJ** de publicações derivadas (cláusula 3.9). Se o Currículo Político tiver qualquer monetização, **não use o DataJud** (e ele nem serve ao objetivo).
- **Limites de scraping:** (a) **não** contorne captcha (TCU certidões: 412) nem WAF (TCU `certidoes-apf`; STF 403) — contornar é o que cria risco jurídico e bloqueio de IP; (b) prefira **API/CSV oficial** (o TCU e o TSE entregam tudo em massa); (c) limite a taxa mesmo onde não há bloqueio (boa prática: ≤1 req/s para o TCU; ≤60 req/min no Querido Diário [14]); (d) registre `User-Agent` identificável com contato do projeto.
- **LAI/e-SIC para o que falta (STF):** peça, via **Fala.BR** (`https://falabr.cgu.gov.br`) ou e-SIC do STF, o **rol de Ações Penais (AP) e Inquéritos (Inq) de competência originária em tramitação e já julgados, com indicação de parlamentar federal, número do processo, classe, relator, data de recebimento e situação/trânsito em julgado**. Prazo legal: **20 dias + 10**. Isso é o caminho legítimo para o STF, e o pedido é juridicamente forte porque a informação é pública (a certidão de antecedentes já é emitida individualmente [9]).

### 5.3 O que **não** fazer
- Não raspar o portal do STF (403) nem o `certidoes-apf` (WAF).
- Não publicar CPF nem expor o método de *match* sem controle.
- Não usar o DataJud para "provar" existência de ação penal contra alguém: **não há nomes de partes** [10].
- Não pontuar decisões **não** transitadas em julgado.
- Não usar as listas **estaduais** como se fossem do TCU: **cada TCE faz a sua própria lista** [2, Q11] — se o projeto cobrir deputados estaduais, precisará de cada TCE.

---

## 6. Ranking — as 3 melhores alternativas para destravar a Integridade em 30 dias

### 🥇 1º lugar — TCU, API pública da Plataforma de Certidões (CADIRREG + Lista Eleitoral + Inidôneos + Inabilitados)
**Por que é o primeiro:** é a **única fonte que já é exatamente "integridade"**, entregue em **massa**, com **zero autenticação**, com **trânsito em julgado** no registro (resolve a presunção de inocência por construção) e com **base legal explícita** (LC 64/1990 art. 1º I "g"). Sai do zero em **1 dia**.
**Números:** 47.978 (CADIRREG) + 9.201 (eleitoral 2026) + 780 + 127 registros; atualização **diária** até 18/12/2026.
**Limite honesto:** o público do TCU é majoritariamente **prefeito/vereador/gestor municipal**; o cruzamento com **parlamentares federais** vai gerar **poucos** matches — mas os que existirem são **ouro** e juridicamente inatacáveis.

### 🥈 2º lugar — TSE Dados Abertos: ponte de identidade (CPF) + certidões criminais
**Por que é indispensável (e é a verdadeira trava técnica):** o TCU identifica pessoas por **CPF**. O Currículo Político provavelmente identifica por **nome**. Sem CPF, você casa "nome parecido" e **cria falsos positivos** — o pior cenário jurídico possível. `consulta_cand_2026_BRASIL.csv` (21.013 linhas, CPF em claro) + `dadosabertos.camara.leg.br/api/v2/deputados/{id}` (CPF em claro) resolvem isso de forma **determinística**.
**Bônus:** `certidao_criminal_2026_{UF}.zip` é uma **fonte oficial de antecedentes criminais** dos candidatos, mesmo sem API do STF.
**Custo:** downloads de 3–5 MB (candidatos) e 69 MB (certidões); encoding **Latin-1**.

### 🥉 3º lugar — Portal da Transparência (CGU): CEIS / CNEP / CEAF / PEPs
**Por que:** chave **gratuita**, API REST **estável e documentada (OpenAPI)**, sanções **oficiais publicadas por autoridade** (base legal forte), e cobre tanto **CPF quanto CNPJ** — o que permite detectar **conflito de interesses** (ex.: parlamentar sócio de empresa sancionada), um sinal de integridade que o TCU não dá.
**Custo:** baixo. **Único atrito:** o cadastro da chave exige navegador ("Human Verification").

**Por que o STF/DataJud ficou fora do pódio:** o DataJud **não cobre o STF** (404 testado), **não expõe nomes de partes** (glossário) e seu Termo de Uso restringe uso comercial. O portal do STF bloqueia automação (403). Em 30 dias, é **LAI**, não ETL.

### Plano concreto de implementação (30 dias)

**Semana 1 — destravar `LegalRecord` com o TCU (o "quick win" que tira o zero)**
1. Novo módulo `apps/pipeline/etl/sources/tcu_certidoes.py`:
   - `POST https://certidoes.apps.tcu.gov.br/api/publico/{dataset}/exportar-para-csv?paginaAtual=1&tamanhoPagina=50000[&anoEleicao=2026]`, body `{}`, header `Content-Type: application/json`.
   - `dataset ∈ {responsaveis-contas-irregulares, responsaveis-fins-eleitorais, responsaveis-inidoneos, responsaveis-inabilitados}`.
   - **Decodificar `ISO-8859-1`**, ignorar a linha `sep=|`, ler cabeçalho da linha 2, separador `|`.
   - Timeout ≥ 120 s (CADIRREG = 11 MB); *retry* exponencial (3×) + *fallback* para o CSV local em `data/raw/tcu_*`.
   - Salvar sempre o **bruto** em `data/raw/` com timestamp + `sha256`, para auditoria e reprocessamento.
2. Reescrever `apps/pipeline/etl/legal_records.py` para **API-first** (o modo "local-first" atual fica como *fallback* offline).
3. Persistir em `LegalRecord`: `parlamentarId` (nullable no primeiro passo), `sourceName` (`TCU/CADIRREG`, `TCU/Lista-Eleitoral-2026`, `TCU/Inidoneos`, `TCU/Inabilitados`), `sourceUrl`, `processo` (`numeroProcessoFormatado`), `acordao` (`numeroAcordaoFormatado`), `dataTransitoEmJulgado`, `dataFinalFinsEleitorais|dataFinalSancao`, `uf`, `municipio`, `fetchedAt`, `status` (`transitado`).
4. **Teste de aceite:** `SELECT COUNT(*) FROM LegalRecord > 0` e ≥ 47.900 registros só do CADIRREG.
5. Agendar refresh **diário** (a lista eleitoral muda todo dia até 18/12/2026).
6. `GET /api/publico/eleicoes/ultimoAno` para descobrir o ano vigente em vez de *hardcode*.

**Semana 2 — a ponte de CPF (TSE + Câmara) e o fim dos falsos positivos**
7. `apps/pipeline/etl/sources/tse_candidatos.py`: baixar `consulta_cand_{2022,2024,2026}.zip` da CDN do TSE, extrair `consulta_cand_YYYY_BRASIL.csv` (Latin-1, `;`), indexar `NR_CPF_CANDIDATO → {nomeCivil, nomeUrna, cargo, uf, municipio, dataNascimento, partido, ano}`.
8. Enriquecer a tabela de parlamentares: **Câmara** (`/api/v2/deputados/{id}` → campo `cpf`) e **Senado** (via TSE, casando `NomeCompletoParlamentar` + UF).
9. **Guardar o CPF com hash** (`sha256(cpf + salt)`) e manter o vínculo `parlamentarId ↔ cpfHash`. Registrar `matchMethod` (`cpf_exato` | `nome+uf+dn`) e `matchScore`.
10. Ligar `LegalRecord.parlamentarId` por **CPF exato**. Esperado: poucos matches federais — **isso é normal e correto** (o CADIRREG é municipal em sua maioria). Métrica de sucesso: **0 falsos positivos**.
11. Testes unitários de homonímia: incluir casos adversariais (mesmo nome, UFs diferentes; nome com/sem acento; `' SISTAL - ALIMENTACAO...'` como CNPJ, etc.).

**Semana 3 — complemento de sanções + regra de pontuação**
12. Chave do Portal da Transparência (cadastro manual no navegador) → `apps/pipeline/etl/sources/portal_transparencia.py`: `GET /api-de-dados/{ceis,cnep,ceaf}?codigoSancionado={cpf}&pagina=N` com header `chave-api-dados`; **paginar até esgotar**; cache local de 24 h.
13. Regra de pontuação da Integridade (documentar no repositório):
    - CADIRREG / Lista Eleitoral com **trânsito em julgado** → penalidade **cheia** (e grau maior se `seProcessoGestao = "S"`).
    - Inidôneos / Inabilitados → penalidade **média**.
    - CEIS/CNEP/CEAF com CPF do parlamentar → penalidade **média** (e caso separado se for **empresa da qual é sócio**).
    - **Processo sem trânsito em julgado → 0 ponto** e rótulo "em tramitação".
14. UI/API: exibir **somente** nome, tipo de registro, número do processo, acórdão, data do trânsito em julgado e **link para a deliberação oficial** (`linkDeliberacoesProcesso`), com "Fonte: TCU — consultado em DD/MM/AAAA".

**Semana 4 — STF por LAI, monitoramento e blindagem jurídica**
15. Abrir **LAI via Fala.BR** (`https://falabr.cgu.gov.br`) ao **STF**: rol de **AP/Inq de competência originária** com parlamentares federais (número, classe, relator, data, situação/trânsito em julgado) — formato **CSV/planilha** se possível. Prazo legal 20+10 dias [17]. Abrir também LAI ao **TCU** pedindo confirmação de periodicidade/termos de uso da API de certidões (formaliza a fonte).
16. *Job* de monitoramento: alertar quando um nome **entra** ou **sai** da lista (o TCU atualiza diariamente [2]) e quando o `sha256` do CSV muda.
17. Blindagem: página "Metodologia e Fontes" com (a) base legal de cada fonte, (b) data de atualização, (c) política de presunção de inocência, (d) canal de correção/direito de resposta, (e) nota LGPD (dados públicos, finalidade de interesse público, CPF não publicado).
18. *Backup*: versionar os CSV brutos por data em `data/raw/tcu/YYYY-MM-DD/` (prova de auditoria e reprodução do IDIP calculado em qualquer data).

**Riscos do plano e mitigação**
| Risco | Mitigação |
|---|---|
| API do TCU é front-end não documentado e pode mudar | salvar CSV bruto + `sha256`; *fallback* local (o modo "local-first" atual vira o *fallback*); *feature flag* |
| Poucos *matches* com parlamentares federais | comunicar isso como resultado legítimo; somar CEIS/CNEP (conflito de interesses) e TSE certidões criminais para densidade |
| Falso positivo por homonímia | **CPF obrigatório**; sem CPF, não pontuar |
| Nome retirado da lista hoje | *soft delete* + histórico (`validFrom`/`validTo`), nunca `DELETE` físico |
| Mudança de chave do DataJud | irrelevante: **não usar DataJud** para o IDIP |

**Esforço estimado:** ~8–12 dias de engenharia para o núcleo (semanas 1–2), ~5 dias para complementos e UI (semana 3), ~3 dias para LAI + blindagem (semana 4).

---

## 7. Referências (URL + data de acesso)

> **Data de acesso de todas as referências: 12/10/2026.** Onde o teste de rede falhou, isso está indicado.

1. **TCU — Plataforma de Certidões (API pública e listas).** https://certidoes.apps.tcu.gov.br/ — lista eleitoral: https://certidoes.apps.tcu.gov.br/lista-implicacao-eleitoral — certidão de contas julgadas irregulares para fins eleitorais (Carta de Serviços): https://portal.tcu.gov.br/carta-de-servicos/certidoes/certidao-de-contas-julgadas-irregulares-para-fins-eleitorais *(acesso 12/10/2026; HTML e endpoints testados com sucesso)*
2. **TCU — "Contas julgadas irregulares 2026" (perguntas frequentes: CADIRREG, Cadirreg vs. Lista Eleitoral, atualização diária até 18/12, exclusões, TCEs).** https://sites.tcu.gov.br/contas-julgadas-irregulares *(acesso 12/10/2026; HTTP 200, mesmo conteúdo de https://contasirregulares.tcu.gov.br/)*
3. **TCU — Notícia "TCU entrega ao TSE lista de responsáveis com contas julgadas irregulares" (04/08/2026; 6,1 mil nomes; atualização diária até 18 de dezembro).** https://portal.tcu.gov.br/imprensa/noticias/tcu-entrega-ao-tse-lista-de-responsaveis-com-contas-julgadas-irregulares *(acesso 12/10/2026)*
4. **CNJ — DataJud Wiki, "Acesso" (chave pública `APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==`, cabeçalho `Authorization: APIKey ...`).** https://datajud-wiki.cnj.jus.br/api-publica/acesso/ *(acesso 12/10/2026)*
5. **CNJ — DataJud Wiki, "Endpoints" (lista de aliases por tribunal: TST, TSE, STJ, STM, TRFs, TJs, TRTs, TREs, TJMs — sem STF).** https://datajud-wiki.cnj.jus.br/api-publica/endpoints/ *(acesso 12/10/2026)*
6. **Dissertação (TJPI) — "os dados e metadados processuais do Supremo Tribunal Federal (STF) não estão centralizados no DataJud".** https://sysejud.tjpi.jus.br/rails/active_storage/blobs/redirect/.../01._Dissertacao_versao_final_breno.pdf *(acesso 12/10/2026 — confirmação independente do teste HTTP 404 no alias `api_publica_stf`)*
7. **STF — Notícia "Corte Aberta reúne dados do STF em painéis interativos e bases para download" (14/09/2026).** https://noticias.stf.jus.br/postsnoticias/corte-aberta-reune-dados-do-stf-em-paineis-interativos-e-bases-para-download/ *(acesso 12/10/2026)*
8. **STF — Programa Corte Aberta (hotsite) e aplicação Qlik.** https://portal.stf.jus.br/hotsites/corteaberta/ e https://transparencia.stf.jus.br/extensions/corte_aberta/corte_aberta.html *(acesso 12/10/2026; HTTP 200 — dados **agregados**; `corteaberta.stf.jus.br` não resolve em DNS)*
9. **STF — "STF emite certidões judiciais em sua página na internet" (certidão de antecedentes para fins eleitorais cobre apenas ações penais de competência originária do STF).** https://noticias.stf.jus.br/postsnoticias/stf-emite-certidoes-judiciais-em-sua-pagina-na-internet/ *(acesso 12/10/2026; as URLs legadas de certidão citadas na matéria retornam 404 em 12/10/2026)*
10. **CNJ — DataJud Wiki, "Glossário de Dados" (campos retornados: classe, assuntos, órgão julgador, movimentos — **sem nome de parte/CPF**).** https://datajud-wiki.cnj.jus.br/api-publica/glossario/ *(acesso 12/10/2026)*
11. **CNJ — Termo de Uso da API Pública do DataJud (v1.2) e resumo das cláusulas 3.3, 3.6, 3.8, 3.9 (uso não comercial; sem garantia de exatidão; ciência obrigatória ao CNJ).** https://datajud-wiki.cnj.jus.br/api-publica/termo-uso/ e https://formularios.cnj.jus.br/wp-content/uploads/2023/11/Termos-de-uso-api-publica-V1.2.pdf *(acesso 12/10/2026)*
12. **CGU — API do Portal da Transparência: especificação OpenAPI completa (109 rotas; header `chave-api-dados`; cadastro em `/api-de-dados/cadastrar-email`; CEIS, CNEP, CEAF, Acordos de Leniência, PEPs, Servidores).** https://api.portaldatransparencia.gov.br/v3/api-docs e https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email *(spec acessada 12/10/2026 — HTTP 200; teste sem chave → 401; página de cadastro exige navegador)*
13. **TSE — Portal de Dados Abertos (CKAN) e CDN.** https://dadosabertos.tse.jus.br/dataset/candidatos-2026 e API `https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026`; arquivos: `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip`, `.../certidao_criminal/certidao_criminal_2026_BR.zip`, `.../prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2022.zip` *(acesso 12/10/2026; todos HTTP 200; `consulta_cand_2026_BRASIL.csv` = 21.013 linhas com CPF)*
14. **Querido Diário — Documentação da API Pública (sem autenticação; referência de 60 req/min; `/gazettes`, `/cities`; CC-BY; código MIT).** https://docs.queridodiario.ok.org.br/pt-br/latest/utilizando/api-publica.html e https://api.queridodiario.ok.org.br/docs *(documentação acessada 12/10/2026; **API não confirmada operacional**: handshake TLS falhou neste ambiente — `SEC_E_ILLEGAL_MESSAGE`; HTTP → 301 indica host ativo)*
15. **Open Knowledge Brasil — código e wrapper.** https://github.com/okfn-brasil/querido-diario-api-wrapper e https://github.com/okfn-brasil *(acesso 12/10/2026)*
16. **Imprensa Nacional — INLABS e repositório oficial (edições completas do DOU em PDF/XML, acesso livre e gratuito desde 01/01/2020, mediante login).** https://inlabs.in.gov.br/ e https://github.com/Imprensa-Nacional/inlabs *(acesso 12/10/2026; `www.in.gov.br/leiturajornal` respondeu 200 mas passou a bloquear/limitar após poucas requisições)*
17. **LAI — Lei 12.527/2011 (prazo de 20 dias, prorrogável por 10).** https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm e Fala.BR https://falabr.cgu.gov.br *(⚠️ **não confirmado por fetch**: o planalto.gov.br falhou na rede deste ambiente em 12/10/2026 e o Fala.BR rejeitou acesso automatizado — texto legal de conhecimento consolidado; valide no navegador)*
18. **LGPD — Lei 13.709/2018, art. 7º, §§3º e 4º (dados de acesso público / tornados manifestamente públicos).** https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm *(⚠️ **não confirmado por fetch** — mesmo motivo acima)*
19. **Referência doutrinária sobre os limites da LGPD para dados públicos.** TAVARES, Giovanna Milanez. *O tratamento de dados pessoais disponíveis publicamente e os limites impostos pela LGPD*. Rio de Janeiro: Processo, 2022 — verbete no repositório da Anatel: https://www.gov.br/anatel/pt-br/composicao/ceadi/repositorio/o-tratamento-de-dados-pessoais-disponiveis-publicamente-e-os-limites-impostos-pela-lgpd *(acesso 12/10/2026)*
20. **Câmara dos Deputados — API de Dados Abertos (retorna `cpf` e `dataNascimento` do deputado).** https://dadosabertos.camara.leg.br/api/v2/deputados/204554 *(testado 12/10/2026, HTTP 200, campo `cpf` presente)*
21. **Senado Federal — Dados Abertos (lista e detalhe de senadores; **sem** campo CPF).** https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json e https://legis.senado.leg.br/dadosabertos/senador/5672.json *(testado 12/10/2026, HTTP 200)*

### Anexos (artefatos brutos salvos nesta sessão)
- `D:\PROJETOS\Currículo Político\.tmp_research\responsaveis-contas-irregulares.csv` (11.077.324 B, 47.978 registros)
- `D:\PROJETOS\Currículo Político\.tmp_research\responsaveis-inabilitados.csv` (202.544 B, 780 registros)
- `D:\PROJETOS\Currículo Político\.tmp_research\responsaveis-inidoneos.csv` (34.779 B, 127 registros)
- `D:\PROJETOS\Currículo Político\.tmp_research\pt-openapi.json` (OpenAPI do Portal da Transparência, 170 KB)
- `D:\PROJETOS\Currículo Político\.tmp_research\cand2026\consulta_cand_2026_BRASIL.csv` (TSE, 21.013 candidaturas com CPF)

### Itens explicitamente **NÃO CONFIRMADOS**
- Se o DataJud publica algum índice do STF sob alias não listado na wiki (o teste `api_publica_stf` retornou 404; nenhuma outra rota foi encontrada).
- Se `certidoes.stf.jus.br` (HTTP 405 em todo GET) é uma API POST-only documentada em algum lugar — **não localizei documentação**.
- Se `jurisprudencia.stf.jus.br/api/search/search` (HTTP 202, corpo vazio) é utilizável com sessão/headers específicos.
- Se existe **API pública do STJ** e se `www.stj.jus.br/.../Dados-abertos.aspx` oferece arquivos (a página retornou conteúdo vazio para automação).
- Se a API do **Querido Diário** está operacional hoje (falha de TLS neste ambiente, não no servidor).
- Se `dados.gov.br` voltou a permitir a API CKAN sem autenticação (HTTP 401 em 12/10/2026).
- Se os datasets do TCU estão espelhados em `dados.gov.br` com acesso programático.
- Periodicidade/SLA formal de atualização do CEIS/CNEP/CEAF além do "contínuo" declarado.
