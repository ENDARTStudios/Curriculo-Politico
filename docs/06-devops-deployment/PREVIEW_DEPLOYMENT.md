# PREVIEW_DEPLOYMENT — Ambientes de preview

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Documento irmão:** [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md)

> ⚠️ **Aviso de escopo e de honestidade.** O projeto **não tem uma estratégia de
> preview documentada** e **não há nenhuma configuração de preview no
> repositório**. O deploy de preview é um comportamento **nativo da integração
> Git da Vercel**, ativado enquanto a integração esteve conectada — e ela foi
> **desconectada** em 12/10/2026 por causa do incidente do recurso Supabase
> suspenso ([`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md) §2.2).
>
> Este documento registra **o que se sabe**, **o que não se sabe** e **o que
> precisa ser decidido**. Preencher as lacunas com suposições seria pior que
> deixá-las explícitas.

---

## 1. O que se sabe

| Item | Estado | Evidência |
|---|---|---|
| Deploy de preview por PR | ⚠️ **Presumido existente** enquanto a integração Git da Vercel estava ativa — não documentado em lugar nenhum do repositório | `README.md` §Deploy menciona apenas produção |
| **Root Directory do preview** | ✅ `apps/web` | É configuração **do projeto**, aplicada a todos os ambientes. Corrigido em 12/10/2026 (`AUDITORIA_PRODUCAO.md` §0.2) |
| Região | ✅ `gru1` — vale para preview e produção (é `regions` do projeto, em [`apps/web/vercel.json`](../../apps/web/vercel.json)) | idem |
| Variáveis de ambiente | ⚠️ **23 variáveis manuais, 0 geridas pela integração**. A Vercel separa por **Production / Preview / Development** — **o conteúdo de cada escopo é não verificado** | `AUDITORIA_PRODUCAO.md` §0.2 |
| URL do preview | ⚠️ Formato `curriculo-politico-<hash>-<time>.vercel.app` — **não verificado** qual é hoje | — |
| Proteção por senha (*Deployment Protection*) | ❌ **Não verificado** | configuração de painel |
| Acesso ao banco no preview | ❌ **Não verificado** — e é a pergunta mais importante (§2) | — |
| Workflows que usam preview | ❌ Nenhum. `a11y.yml` e `production-smoke.yml` miram **produção** por padrão (`vars.PROD_URL \|\| 'https://www.curriculopolitico.org'`) | `.github/workflows/*.yml` |
| Playwright contra preview | ⚠️ Possível via `E2E_BASE_URL` + `E2E_NO_SERVER=1`, mas **não configurado** | [`playwright.config.ts`](../../playwright.config.ts) L16–27 |

---

## 2. O risco central: qual banco o preview usa?

Não há resposta no repositório, e as duas possibilidades têm consequências graves
e opostas:

### Cenário A — Preview aponta para o **Supabase de produção**

```yaml
# Hipotético: DATABASE_URL de Preview = mesma string de Production
```

| Consequência | Gravidade |
|---|---|
| **Um preview testa escrevendo na base real.** Cadastro de teste, voto de teste e retificação de teste ficam em produção | 🔴 **Alta** |
| Migrations aplicadas em código de preview afetam produção | 🔴 Alta |
| O projeto **não tem backup** ([`BACKUP_DR.md`](./BACKUP_DR.md)) — um `DELETE` por engano em preview é irreversível | 🔴 Alta |
| Qualquer pessoa com o link do preview acessa uma aplicação que escreve em produção | 🔴 Alta |
| Já existe **precedente documentado** desse tipo de acidente: o `.env` local aponta para produção e `AGENTS.md` registra a armadilha | — |

> Isso já é conhecido como o risco **T3** de
> [`../05-security-compliance/THREAT_MODELING.md`](../05-security-compliance/THREAT_MODELING.md):
> *"script de dados rodado por engano contra produção"*. **Um preview com
> credencial de produção é a mesma ameaça com outro nome.**

### Cenário B — Preview **não tem** credencial de banco

| Consequência | Gravidade |
|---|---|
| O preview **não funciona**: toda página dinâmica devolve erro, porque o Prisma não inicializa | 🟡 Média (inutiliza o preview) |
| Não há risco de escrever em produção | ✅ |
| O erro aparece na primeira rota que toca o banco | — |

### Cenário C — Preview usa um Supabase/branch separado (o correto)

| Requisito | Estado |
|---|---|
| Projeto Supabase separado (ou *branch* do Supabase) | ❌ **Não existe** |
| Schema aplicado por migration no ambiente de preview | ❌ Nenhum workflow faz isso |
| Seed de dados fictícios | ✅ Existe (`npm run db:seed`, 3 perfis: GREEN, YELLOW, RED) e **recusa** rodar contra banco remoto sem `CP_ALLOW_REMOTE_SEED=1` |
| Custo | Um segundo projeto Supabase no Free (98 MB de 500 MB) — **não verificado** se a cota de egress seria compartilhada |

**Ação nº 1 deste documento:** confirmar no painel Vercel qual é o cenário atual.
Enquanto isso não for feito, **a informação está ausente**, e a ausência de
informação sobre uma credencial de produção é, por si, um achado.

---

## 3. Outras considerações de preview neste projeto

### 3.1 Autenticação em preview

`NEXTAUTH_URL` e as **Redirect URIs** do OAuth do Google precisam incluir a URL
do preview para o login funcionar. **Não verificado** se estão configuradas.

Consequência prática: **o fluxo de login provavelmente não funciona em preview**,
o que significa que **nada do caminho autenticado é testável em preview** — e esse
caminho é justamente o de maior risco (voto, consentimento, exclusão de conta).

### 3.2 Indexação de URLs de preview

Um preview acessível publicamente e sem `X-Robots-Tag`/`robots.txt` pode ser
indexado, criando **conteúdo duplicado** e, pior, expondo versões não publicadas
de páginas de políticos — o que tem **implicação jurídica** (linguagem, dados
desatualizados) em uma plataforma que publica informação sobre pessoas reais.

**Não verificado.** Verificação sugerida:

```bash
curl -sI https://<preview>.vercel.app/ | Select-String -Pattern "x-robots-tag|location"
curl -s  https://<preview>.vercel.app/robots.txt
```

> O `robots.txt` da aplicação é gerado pela aplicação e exige
> `Allow: /`, `Disallow: /conta` e `Disallow: /api/`
> ([`tests/e2e/seo.spec.ts`](../../tests/e2e/seo.spec.ts) L24–29) — ele **não**
> bloqueia previews, porque é o mesmo arquivo em todos os ambientes.

### 3.3 Preview e a suíte E2E

O `playwright.config.ts` suporta explicitamente um alvo remoto:

```ts
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const semServidor = process.env.E2E_NO_SERVER === "1";
```

Isso torna tecnicamente trivial rodar `@readonly` contra um preview:

```bash
E2E_BASE_URL=https://<preview>.vercel.app E2E_NO_SERVER=1 npm run e2e:prod
```

**Isso não está configurado em nenhum workflow.** Seria o uso mais valioso de um
preview: validar a mudança **antes** de produção, em vez de rodar a suíte apenas
contra produção 6 h depois ([`QA_TESTING.md`](./QA_TESTING.md) §4, lacuna 7).

### 3.4 Incongruência de schema entre preview e produção

Nenhum workflow roda `prisma migrate deploy` — nem para preview, nem para
produção ([`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) §6). Um preview com banco
próprio ficaria **atrás** do schema assim que uma migration fosse criada: o
código novo esperaria colunas que o banco do preview não tem.

---

## 4. Recomendação

### 4.1 Decisão que precisa ser tomada

| Opção | Quando faz sentido | Custo |
|---|---|---|
| **Sem preview de dados** — preview existe apenas para checagem visual/estática, sem credencial de banco | Agora, se o volume de mudança é baixo | Segundos de configuração; preview quebrado em rotas dinâmicas |
| **Preview com banco separado** (projeto Supabase dedicado no Free, com `db:seed`) | Ao crescer o número de mudanças ou de contribuidores | 1–2 h de configuração; consome cota de egress |
| **Preview com credencial de produção** | ❌ **Nunca** | Risco inaceitável sem backup |

### 4.2 Desenho correto, se a opção do meio for escolhida

1. Criar um projeto Supabase dedicado (ou usar *branching*, se disponível no plano).
2. Definir `DATABASE_URL` e `DIRECT_URL` **apenas no escopo Preview** da Vercel.
3. Workflow (ou preview command) que, antes do build de preview:
   ```bash
   npx prisma migrate deploy          # com DIRECT_URL (5432)
   CP_ALLOW_REMOTE_SEED=1 npm run db:seed   # 3 perfis fictícios
   ```
4. **Nunca** rodar o ETL de produção contra esse banco.
5. Rodar `npm run e2e:prod` contra a URL do preview como gate de PR.

### 4.3 Ações imediatas, independentes da decisão

| # | Ação | Esforço |
|---|---|---|
| 1 | **Consultar no painel Vercel o valor de `DATABASE_URL` no escopo Preview** e registrar aqui | 5 min |
| 2 | Se for produção: **remover/alterar imediatamente**. Este é o item mais urgente | 5 min |
| 3 | Verificar se *Deployment Protection* (proteção por senha) está ativa para preview | 5 min |
| 4 | Verificar se previews respondem `X-Robots-Tag: noindex` | 5 min |
| 5 | Conferir as Redirect URIs do Google OAuth e o `NEXTAUTH_URL` | 5 min |
| 6 | Adicionar `E2E_BASE_URL` do preview ao workflow `a11y.yml` (ou criar um `preview-e2e.yml`) | 1 h |
| 7 | Documentar a decisão de banco de preview **neste arquivo** | 15 min |

---

## 5. Limitações deste documento

- O conteúdo dos escopos de variáveis da Vercel (Production/Preview/Development)
  é **não verificado** — exige acesso ao painel.
- Não foi possível confirmar se o deploy de preview está **ativo** hoje, dado que
  a integração com o recurso Supabase foi desconectada em 12/10/2026. A
  desconexão removeu o **recurso da integração**, não necessariamente a
  integração Git do repositório — mas isso **não foi verificado**.
- Nenhum preview foi inspecionado nesta revisão por requisição HTTP.

---

## 6. Referências no repositório

- [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md) §2 — Root Directory e integração Supabase
- [`AUDITORIA_PRODUCAO.md`](./AUDITORIA_PRODUCAO.md) §0.2 — evidências das variáveis e da integração
- [`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) §6 — migrations não são aplicadas em nenhum ambiente
- [`QA_TESTING.md`](./QA_TESTING.md) §3.1 — `E2E_BASE_URL` e `E2E_NO_SERVER`
- [`../05-security-compliance/THREAT_MODELING.md`](../05-security-compliance/THREAT_MODELING.md) T3 — script/preview escrevendo em produção
- [`BACKUP_DR.md`](./BACKUP_DR.md) — por que um engano em preview é irreversível
