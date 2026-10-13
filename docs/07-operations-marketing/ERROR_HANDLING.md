# Tratamento de erro e estados de falha

Como o produto se comporta quando algo dá errado. A regra que organiza tudo:
**a prova é opcional; a página não é.**

Documentos relacionados: [MONITORING.md](MONITORING.md) (como se descobre que algo
falhou), [`RULES.md`](../03-development-process/RULES.md) §3.6 (a regra),
[API.md](../04-api-integrations/API.md) §2 (envelope de erro das rotas),
[TASKS.md](../03-development-process/TASKS.md) (as lacunas como tarefas).

## 1. Inventário real das fronteiras de erro

Verificado por busca no repositório (`error*.tsx`, `not-found*.tsx`, `loading*.tsx`
em `apps/web/src`):

| Fronteira | Existe? | Arquivo |
|---|---|---|
| `global-error.tsx` | ✅ | `apps/web/src/app/global-error.tsx` |
| `error.tsx` de segmento | ❌ **nenhum** | — |
| `not-found.tsx` | ❌ **nenhum** | — |
| `loading.tsx` / `loading.tsx` de segmento | ❌ **nenhum** | — |
| `try/catch` em rota de API | 🟡 **5 de 11** | ver [API.md](../04-api-integrations/API.md) §2 |
| Fallback de consulta em código de página | ✅ | `lib/hero-stats.ts`, `lib/sitemap.ts` |

**Consequência da ausência de `error.tsx` de segmento:** um erro de render em
qualquer rota sobe até a fronteira global e **derruba a página inteira** — o usuário
perde header, navegação e o caminho de volta. Um erro em um único card custa o site
todo. Registrado como T-06.

**Consequência da ausência de `not-found.tsx`:** as rotas de perfil e de proposição
chamam `notFound()` explicitamente (ver §4), mas o usuário cai na **página 404 padrão
do Next** — sem identidade visual, sem header, sem link para a home.

## 2. A fronteira global: `global-error.tsx`

É o componente mais bem construído do conjunto. Faz três coisas na ordem certa:

```tsx
"use client";
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;                                   // 1. dorme sem DSN
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error);                   // 2. reporta
    });
  }, [error]);

  return (/* 3. oferece recuperação */);
}
```

| Decisão | Por quê |
|---|---|
| `"use client"` | Fronteira de erro só existe no cliente |
| Import **dinâmico** do Sentry | Sem DSN, o SDK **não entra no bundle**. Custo zero quando desativado |
| Guarda `if (!dsn) return` | Não faz nada silenciosamente quando não há monitoramento — não quebra |
| `<html lang="pt-BR">` + `<body>` | `global-error` substitui o layout raiz inteiro, então precisa renderizar o documento completo. **É fácil esquecer isso e produzir uma página sem `lang`** (falha de acessibilidade) |
| Botão `reset` com `text-slate-950` sobre `bg-sky-500` | O CTA de recuperação usa o contraste **corrigido** (7,45:1). É o mesmo padrão do CTA da home |
| Texto "Ele já foi registrado (**quando o monitoramento está ativo**)" | Honestidade: não afirma que houve registro quando o Sentry está dormente |

**Limite:** por ser global, ele **não** tem acesso ao layout (header, navegação,
footer). Não há caminho de volta para a home — só "Tentar novamente", que
re-renderiza a mesma rota.

## 3. O padrão de fallback: "a prova é opcional, a página não é"

Este é o padrão arquitetural do projeto para dependência de banco em página pública.
Existem duas implementações de referência e a regra em
[`RULES.md`](../03-development-process/RULES.md) §3.6.

### 3.1 `lib/hero-stats.ts` — a faixa de prova

A home precisa **provar a promessa com fatos verificáveis** (estágio "Prova" do
funil). Mas provar não é encher de cifras: cada número responde a uma pergunta que o
eleitor faria.

O contrato de falha está no cabeçalho do próprio arquivo:

> *"A prova é opcional; a página não é. Qualquer erro de banco devolve `null` e a
> faixa simplesmente não é renderizada. O mesmo vale para banco vazio: nunca
> mostramos '0 políticos avaliados', porque isso destrói a credibilidade em vez de
> construí-la."*

Três casos, três comportamentos:

| Caso | Comportamento |
|---|---|
| **Sem nenhuma nota calculada** | `if (termIds.length === 0) return null` — a faixa não é renderizada |
| **Erro de banco** (fora do ar, migration pendente, credencial ausente) | `catch { return null }` — a faixa não é renderizada |
| **Sucesso** | Devolve o objeto `NumerosHero` |

E o componente reforça a decisão com uma segunda guarda:

```ts
// apps/web/src/components/HeroStats.tsx
if (!numeros || numeros.politicosAvaliados === 0) return null;
```

A justificativa está no comentário: *"Uma faixa de prova vazia ('0 políticos
avaliados') é pior do que faixa nenhuma: ela transforma o argumento de credibilidade
em confissão de incapacidade. Com banco vazio ou indisponível, a home simplesmente
passa do gancho direto para o CTA — e continua funcionando."*

**Detalhe de honestidade nos números:** `politicosAvaliados` conta **termos com nota
calculada**, não o total de pessoas cadastradas. O comentário explica: *"alguém
cadastrado sem nota não ajuda ninguém, e exibir esse total inflado seria propaganda
enganosa."*

E o componente filtra contagens zeradas individualmente
(`.filter((c) => c.valor > 0)`), então um número sem dado não aparece.

### 3.2 `lib/sitemap.ts` — o sitemap que degrada, não quebra

Mesmo contrato, aplicado a SEO. O sitemap **não pode** depender do banco:

| Falha | Comportamento | Log |
|---|---|---|
| `prisma.bill.count()` falha | Gera **apenas o arquivo base** (`paginas = 1`) | `console.warn("[sitemap] contagem de proposições falhou…")` |
| `person`/`party` falham no arquivo 0 | Devolve **apenas as rotas estáticas** | `console.warn("[sitemap] perfis/partidos indisponíveis…")` |
| `bill.findMany` de um bloco falha | Devolve array vazio | `console.warn("[sitemap] proposições (arquivo N) indisponíveis…")` |
| `DATABASE_URL` ausente no build | Índice e arquivo base **ainda saem** | — |

Razão, do próprio código: *"As rotas dinâmicas vêm do banco, mas o sitemap não pode
depender dele. Se a consulta falhar (build sem `DATABASE_URL`, banco fora do ar), o
índice e o arquivo base ainda saem, com as rotas estáticas."*

Um sitemap parcial é recuperável no próximo crawl. Um 500 é sinal de saúde ruim para
o buscador.

### 3.3 O padrão, resumido

```
1. Nunca lance a partir de código que serve página pública.
2. Degrade para o MENOR artefato válido (null, lista estática, XML base).
3. Registre a causa com console.warn/error — nunca engula em silêncio.
4. A página continua servindo promessa e CTA.
5. Nunca renderize zero como se fosse dado.
```

## 4. `notFound()` nas rotas de detalhe

As rotas dinâmicas chamam `notFound()` quando o recurso não existe, em vez de
renderizar página vazia:

| Rota | Chamada |
|---|---|
| `/politicos/[id]` | `notFound()` quando não encontra pessoa |
| `/projetos/[id]` | `notFound()` quando não encontra proposição |
| `/partidos/[acronym]` | (mesmo padrão) |

Também há o par equivalente nas APIs: `404` com `POLITICO_NAO_ENCONTRADO` /
`PROJETO_NAO_ENCONTRADO` ([API.md](../04-api-integrations/API.md) §4 e §6).

**O que falta:** a página 404 não é personalizada. Não existe `not-found.tsx`, então
o Next usa o 404 padrão. **Isso é uma lacuna de produto, não de código:** alguém que
chega por um link de perfil quebrado — cenário plausível em compartilhamento de link
antigo — vê uma página sem header, sem busca e sem volta para a home.

## 5. Estados vazios

| Estado | Comportamento | Avaliação |
|---|---|---|
| Banco vazio (nenhuma nota) | Faixa de prova não renderiza; home serve gancho → CTA | ✅ correto |
| Banco indisponível | Idem | ✅ correto |
| Contagem individual zerada | Aquele número não aparece (`.filter(valor > 0)`) | ✅ correto |
| Perfil sem nota calculada | `score: null` na API; a UI trata a ausência | ✅ |
| Proposição sem `simpleSummary` nem `citizenImpact` | `generateMetadata` cai em `Situação: <status>` | ✅ |
| Busca com menos de 2 caracteres | `{ "results": null, "total": 0 }` com status **200** | ⚠️ Assimetria de tipo (`null` vs objeto) — ver [API.md](../04-api-integrations/API.md) §7 |
| Partido sem membros / sem dados | **não verificado** | — |
| `/status` com banco indisponível | Exibe "Indisponível" em `text-red-300` e o cabeçalho muda para "Status: degradado"; cada métrica que falha vira "—" | ✅ bom |
| Histórico sem snapshot | "ainda sem snapshot" (texto explícito, não zero) | ✅ correto |

O padrão é consistente: **ausência de dado se manifesta como ausência de elemento ou
como texto explícito — nunca como zero ou travessão silencioso em contexto de prova.**

## 6. Erros de API

Ver [API.md](../04-api-integrations/API.md) para o detalhamento por rota. Resumo das
inconsistências **reais** encontradas:

| Problema | Onde | Efeito |
|---|---|---|
| `503 BANCO_INDISPONIVEL` devolvido para **qualquer** erro | `/api/rankings`, `/api/politicians/[id]` | Um bug de código é reportado como "banco fora". O status não distingue |
| `catch {}` **sem binding** | as routes com try/catch | A causa real **não é registrada em lugar nenhum**. Com Sentry dormente, um erro de query é invisível (T-07) |
| **Sem `try/catch`** | `/api/bills`, `/api/bills/[id]/vote`, `/api/compare`, `/api/consent`, `/api/search` | Falha de banco vira erro padrão do Next (500), **não** o envelope 503. O contrato de erro do projeto é aplicado pela metade |
| **Duas formas de envelope** | `{ error, message }` em algumas; `{ error }` em outras | Consumidor precisa tratar `error` como string opaca |
| Mensagem de dev exposta em produção | `/api/rankings` 503 traz `"Suba o Postgres com: docker compose up -d db"` | Resposta pública com instrução de ambiente local |
| Erro em corrida não tratado | `/api/auth/register` (e-mail duplicado concorrente) → 500 em vez de 409 | — |

**A boa prática que existe:** `/api/retificacao` valida antes de escrever e devolve
`400` com mensagem específica por campo (`NOME_INVALIDO`, `EMAIL_INVALIDO`,
`DESCRICAO_CURTA`) em vez de um `400` genérico. É o modelo a seguir.

## 7. Erros do cliente

**Não há tratamento dedicado.** Verificado: nenhum arquivo `error.tsx` ou
`loading.tsx` em `apps/web/src`.

Componentes que fazem `fetch` para as rotas de API (busca, votação, comparação)
fazem `try/catch` no próprio componente — o comportamento de falha nesses pontos
**não foi auditado nesta documentação** e é um espaço onde o padrão do projeto
(§3) pode não estar sendo seguido. **Não verificado.**

## 8. O que testar quando a falha for tratada

Testar o caminho de erro exige provocar a falha. Formas disponíveis:

| Cenário | Como reproduzir | Comportamento esperado |
|---|---|---|
| Banco fora do ar | `docker compose stop db` | Home renderiza **sem** faixa de prova; `/status` mostra "Indisponível"; APIs devolvem 503 (nas 5 com try/catch) ou 500 (nas demais) |
| Banco vazio | `docker compose down -v && npm run db:migrate` | Home sem faixa; nunca "0 políticos avaliados" |
| Build sem banco | `DATABASE_URL=postgresql://x:x@localhost:1/x npm run build` | Build **passa**; sitemap sai só com o arquivo base |
| Recurso inexistente | `/politicos/nao-existe` | `notFound()` → 404 padrão do Next (lacuna: sem `not-found.tsx`) |
| Erro de render no cliente | (requer instrumentação) | `global-error.tsx` + Sentry quando o DSN existir |

**O contrato de banco vazio não tem teste automatizado.** É verificado por leitura de
código e revisão manual. Adicionar cobertura está em T-04.

## 9. Lacunas, em ordem de risco

| # | Lacuna | Risco |
|---|---|---|
| 1 | **Sem `error.tsx` de segmento** | Um erro de render em um card derruba a página inteira e o usuário perde toda a navegação (T-06) |
| 2 | **`catch {}` sem log** (5 rotas) + **sem Sentry ativo** | Erro de produção é **invisível**. Durante a auditoria, uma medição lenta foi mal diagnosticada por não se poder ver a causa (T-07 + T-08) |
| 3 | **5 rotas sem `try/catch`** | O contrato de `503` do projeto não vale nelas; falha de banco vira 500 opaco |
| 4 | **Sem `not-found.tsx`** | Link quebrado (plausível em compartilhamento) cai em 404 sem header nem busca |
| 5 | **Mensagem de dev em resposta pública** | `/api/rankings` 503 cita `docker compose up -d db` |
| 6 | **Duas formas de envelope de erro** | Consumidor precisa adivinhar |
| 7 | **Sem teste automatizado do contrato de banco vazio** | A garantia existe por disciplina, não por gate |

Nenhuma dessas lacunas é hipotética: todas são comportamentos verificáveis no código
atual.

## 10. Regras ao escrever código que pode falhar

1. **Nunca lance a partir de página pública.** Degrade (§3.3).
2. **Nunca renderize zero como prova.** A faixa desaparece.
3. **Todo `catch` tem binding.** `catch (erro)` com `console.error` contendo
   mensagem e contexto. `catch {}` é proibido em código novo.
4. **Diferencie os status.** 503 é "banco fora"; 500 é "erro inesperado"; 400 é
   "entrada inválida" com mensagem específica por campo. Não use 503 para tudo.
5. **Erro é texto do produto.** A mensagem passa por
   [CONTENT.md](../04-api-integrations/CONTENT.md) — sem juízo, sem jargão interno,
   sem comando de desenvolvimento.
6. **`global-error.tsx` é o modelo** de fronteira de erro do projeto: reporta
   (quando há DSN), não mente sobre o registro, e oferece recuperação com contraste AA.
7. **Ao criar uma página nova, crie também `not-found.tsx`/`error.tsx` do segmento** —
   é a lacuna mais fácil de não perceber.

## 11. Não verificado

- Comportamento de falha dos componentes cliente que consomem as APIs (busca,
  votação, comparação). O tratamento existe no componente, mas **não foi auditado**.
- Se o Sentry está ativo em produção (o DSN não aparece nos `.env` do repositório; ver
  T-08). Toda a §2 e a §6 dependem disso para terem valor prático.
- Se há tratamento de erro no `Providers.tsx` ou em fronteiras de Suspense não
  mapeadas.
- Comportamento do 404 padrão do Next **na versão em uso** (15.5.27) — não foi
  renderizado para inspeção.
