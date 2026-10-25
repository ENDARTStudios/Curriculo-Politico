# Proposta — Integração `ctresb/leis` ao Currículo Político

> Status: proposta para discussão · Branch: `feat/leis-integracao` · 2026-10-24

## 1. O que é o `ctresb/leis`

Repositório público (1,7k stars) com a legislação brasileira convertida para
Markdown: **324 mil normas** (1 Constituição, 29,2 mil federais, 294,7 mil
estaduais/distritais), cobrindo leis ordinárias, decretos-lei, leis
complementares, emendas constitucionais e mais.

Cada norma é um arquivo `.md` com frontmatter YAML estruturado:

```yaml
titulo: "Lei nº 8.080 de 19/09/1990"
tipo: "Lei Ordinária"
numero: "8080"
data: 1990-09-19
ementa: "Dispõe sobre as condições para promoção, proteção e recuperação da saúde…"
revogada: false
versao_texto: "compilada (texto vigente)"
urn: "urn:lex:br:federal:lei:1990-09-19;8080"
fonte: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-09-19;8080"
```

Organização por caminho determinístico: `federal/<tipo>/<ano>/lei-<num>-<AAAA-MM-DD>.md`.
Fontes primárias: Planalto, normas.leg.br, Senado, SAPLs estaduais. Textos são
domínio público (art. 8º, I, Lei 9.610/98); scripts são MIT. O diferencial do
repositório é o **texto compilado do vigente** (emendas incorporadas), algo que
nem a Câmara nem o Planalto entregam de forma limpa — eles entregam o texto
original da promulgação, sem consolidação.

## 2. Por que isso importa para o Currículo Político

A dor central do usuário é *"eu vou votar, mas não sei em quem confiar"*. Duas
lacunas concretas hoje:

1. **Proposição sem contexto normativo.** 33 mil proposições no banco; uma
   parcela relevante altera leis existentes ("Altera a Lei nº 9.503 — Código de
   Trânsito"). O eleitor lê a ementa, mas não consegue ver **o que a lei hoje
   diz** para comparar com o que o projeto propõe mudar.

2. **Autoria não conta a história final.** O perfil mostra "Autor de PL
   1.234/2022", mas não se o projeto **virou lei**. "O que ele efetivamente
   fez" é a pergunta do produto — e lei sancionada de autoria do parlamentar é
   a resposta mais concreta que existe.

3. Observação de campo: hoje `Bill.status` está 100% nulo (verificado no banco)
   — o pipeline não captura a tramitação. Capturar isso já é pré-requisito
   independente desta proposta.

## 3. Escopo proposto: consumir, não espelhar

O repositório tem 3,9 GB e 324 mil commits — **nada de submódulo, clone em CI
ou importação em massa**. Propomos consumir sob demanda, por URN, o subconjunto
minúsculo que o produto realmente exibe:

- Leis **citadas** por proposições exibidas (ementas do tipo "Altera a Lei nº X").
- Leis resultantes de proposições **transformadas em lei**.
- Curadoria editorial mínima (ex.: Constituição, CF/88, para páginas de contexto).

Isso limita o volume a algumas centenas/milhares de documentos ao longo do
tempo, cada um ~50–500 KB de Markdown.

## 4. Desenho técnico

### 4.1 Modelo de dados (Prisma)

```prisma
model Norma {
  id            String   @id @default(cuid())
  urn           String   @unique // "urn:lex:br:federal:lei:1990-09-19;8080"
  tipo          String   // "Lei Ordinária", "Decreto-Lei"…
  numero        String
  ano           Int
  data          DateTime?
  ementa        String?
  revogada      Boolean  @default(false)
  versaoTexto   String?  // "compilada (texto vigente)"
  textoMarkdown String?  @db.Text
  fonteUrl      String?  // normas.leg.br / Planalto
  repoCommit    String?  // SHA do ctresb/leis de onde o texto veio (auditoria)
  atualizadoEm  DateTime @updatedAt
  @@index([tipo, ano])
}
```

Em `Bill`: `leiUrn String?` (a lei em que a proposição se converteu) e
`citacoesNorma Json?` (URNs citadas na ementa, com o trecho citado).

### 4.2 Pipeline (novo script em `apps/pipeline/scripts/`)

1. **Capturar desfecho da proposição** (Câmara API): a tramitação traz
   `statusProposicao.descricao = "Transformado em Lei Ordinária nº 14.517/2023"`.
   Popula `Bill.status` (hoje nulo) e, quando o desfecho é virar lei, faz o
   parse `número + ano` → URN Lex determinística:
   `urn:lex:br:federal:lei:<data-sancão?>;<numero>` (a data exata resolve-se
   consultando o índice do repo, ver abaixo).
2. **Extrair citações da ementa** (regex `Lei nº X, de Y` → URN).
3. **Sincronizar normas pendentes**: para cada URN ainda sem `Norma`, localizar
   o caminho no repo via GitHub API
   (`GET /repos/ctresb/leis/git/trees/main?recursive=0` por diretório de ano —
   poucas chamadas, cacheável) e baixar o `.md` via
   `raw.githubusercontent.com/ctresb/leis/<SHA-pino>/…`.
   Fixar por **SHA de commit** (auditoria + estabilidade; o repo é alvo móvel).
   Rate limit tratado (token GitHub, 1 req/s, retomável — mesmo padrão dos
   scripts do repo).
4. **Importar**: parse do frontmatter + corpo Markdown → upsert idempotente em
   `Norma`, sempre registrando `repoCommit`.

### 4.3 UI

- **`/projetos/[id]`**: card "Virou lei" (quando aplicável) com a ementa da lei
  e o texto compilado em `<details>` expansível + link "Fonte oficial"
  (normas.leg.br). Leis citadas na ementa viram links internos.
- **`/politicos/[id]`**: seção factual "Leis de sua autoria" — nº de
  proposições de sua autoria que viraram lei, com links. **Camada de contexto,
  fora do IDIP**: não entra no score, não altera termômetro, e a página declara
  isso explicitamente (mesma disciplina do Ranking Personalizado).
- **Regra de honestidade**: "virou lei" só aparece com o dado da Câmara API
  capturado; texto exibido só existe com `repoCommit` registrado. Disclaimer de
  rodapé como no repo original: "Texto informativo; não substitui o Diário
  Oficial".

### 4.4 O que não fazer

- Não importar as 324k normas (nem só as federais): volume sem uso, custo de
  sincronização e risco de dados exibidos sem curadoria.
- Não usar a história do git do repo como linha do tempo normativa (o commit é
  cronologia de **ingestão**, não de mudança da norma).
- Não computar "produtividade legislativa" como nota: contagem de leis é dado
  de carreira factual; transformar em métrica de avaliação exigiria metodologia
  própria e abriria viés (leis de autoria coletiva, emendas parlamentares etc.).

## 5. Compliance

| Regra | Como atende |
|---|---|
| Linguagem jurídica estrita | "Transformado em Lei Ordinária nº X" é o termo oficial da Câmara; nada de juízo |
| Neutralidade política | Contagem de leis de autoria é factual e fica fora do IDIP, declarado na UI |
| Dados honestos | Cada texto traz `repoCommit` + `fonteUrl` (fontes nomeadas: Planalto/normas.leg.br via leis) |
| Fontes nomeadas | Câmara (desfecho) + repo leis (texto) + fonte primária no card |
| LGPD | Nenhum dado pessoal envolvido |
| Copyright | Textos normativos são domínio público (art. 8º, I, Lei 9.610/98); scripts do repo são MIT |

## 6. Riscos e mitigações

- **Repo alvo móvel** → pin por SHA de commit no sync; re-sincronização é decisão explícita.
- **Erros de OCR/texto** → disclaimer informativo + link para a fonte oficial; texto nunca é a única referência.
- **Parse da URN a partir do desfecho pode falhar** (formatos variados) → fila de "pendências de resolução" para revisão, como o gap-bot já faz com gaps manuais.
- **GitHub raw sem token** (Vercel nunca baixa; só o pipeline baixa, com token) → sem risco em runtime.
- **Ementas citam normas revogadas** → flag `revogada` exibida honestamente.

## 7. Roadmap sugerido

1. **Fase 0 (pré-requisito, independente):** capturar `statusProposicao` da Câmara no pipeline e popular `Bill.status`.
2. **Fase 1:** modelo `Norma` + sync seletivo + "Virou lei" em `/projetos/[id]`.
3. **Fase 2:** citações de ementa → links internos; "Leis de autoria" em `/politicos/[id]`.
4. **Fase 3 (opcional):** estaduais via mesmo caminho (`estaduais/<UF>/…`) — priorizar UFs dos parlamentares mais visitados.
