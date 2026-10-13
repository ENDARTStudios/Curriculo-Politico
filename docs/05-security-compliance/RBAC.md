# RBAC — Controle de acesso baseado em papéis

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Status:** ❌ **não existe RBAC** — não há papéis, nem campo de papel, nem rota administrativa.

> Documento curto e deliberadamente direto: registra **por que não existe**,
> **o que ocupa o lugar do RBAC hoje**, **qual é o risco real dessa ausência** e
> **o que será necessário no dia em que houver área administrativa**.

---

## 1. Verificação: não há RBAC neste projeto

Confirmado por leitura do repositório:

| Verificação | Resultado |
|---|---|
| Campo de papel/role no modelo `User` | ❌ Não existe ([`schema.prisma`](../../apps/web/prisma/schema.prisma) L143–160: apenas `id`, `email`, `name`, `password`, `emailVerified`, `image`, campos de consentimento, `createdAt`, `updatedAt`) |
| Tabela `Role` / `Permission` / `UserRole` | ❌ Não existem no schema |
| Enum de papéis | ❌ Não existe |
| Rota administrativa (`/admin`, `/api/admin/*`) | ❌ Não existe (as 11 rotas de API estão listadas em [`IAM_IGA.md`](./IAM_IGA.md) §5) |
| Checagem de papel em middleware | ❌ `middleware.ts` só faz rate limiting e headers de segurança — **nenhuma** decisão de autorização |
| Booleano de privilégio (ex.: `isAdmin`) | ❌ Não existe |

---

## 2. O que existe no lugar do RBAC

O modelo de autorização real é **binário + posse**:

```
  [Anônimo]  ─────────────────►  leitura pública de tudo
      │
      │  POST /api/auth/register   (clickwrap + 18+)
      ▼
  [Usuário autenticado]  ───────►  leitura pública + escrita SOBRE OS PRÓPRIOS DADOS
      │                            (consentimento, voto, exclusão de conta)
      │  possui a DATABASE_URL
      ▼
  [Portador do segredo]  ───────►  leitura E escrita em TODAS as tabelas, sem auditoria
```

Não há degrau intermediário. As consequências práticas:

1. **Todo usuário autenticado tem exatamente o mesmo poder.** Não existe
   "usuário avançado", "curador", "moderador" nem "revisor de retificação".
2. **Escrever sobre dado de terceiro exige a `DATABASE_URL`.** Não há caminho
   pela aplicação para corrigir um dado, mudar o status de uma
   `RetificationRequest` ou remover um `LegalRecord`. Toda curadoria é feita
   **por script, direto no banco** (`db:load-*`, `recalculate-scores`,
   `apply-integrity-caps`, `review-medium`).
3. **A fronteira de privilégio é a posse do segredo** — e nada mais. Sem MFA,
   sem rotação, sem revisão de acesso, sem log de uso (ver
   [`IAM_IGA.md`](./IAM_IGA.md) §6 e [`THREAT_MODELING.md`](./THREAT_MODELING.md) E1/E2).

### 2.1 A prática correta que já existe: autorização por dono, não por id de entrada

Onde há autorização, ela está **certa**: todas as rotas que escrevem sobre dado
pessoal derivam o alvo da **sessão**, nunca do corpo da requisição.

```ts
// api/consent/route.ts L19–22 — o id vem da sessão; não há parâmetro de usuário
async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
```

Isso elimina IDOR (Insecure Direct Object Reference) nessas rotas — que é,
na prática, a falha de autorização mais comum em aplicações deste porte. O
padrão deve ser **preservado** quando o RBAC for introduzido: papel é uma
checagem **a mais**, nunca um substituto para "o recurso pertence a quem pede".

---

## 3. Por que a ausência é aceitável **hoje**

Não é negligência; é escopo. O projeto tem **uma área funcional**: leitura
pública de dados oficiais + engajamento do próprio titular.

| Argumento | Avaliação |
|---|---|
| Não há superfície administrativa a proteger | ✅ Correto — nenhuma rota lê ou escreve dado alheio |
| Não há dado de terceiro sob custódia de um papel | ✅ Correto — o voto de A é inacessível a B por construção |
| A curadoria de dados é **batch**, offline, operada por uma pessoa | ✅ Correto — e é onde o risco real está (ver adiante) |
| Criar RBAC sem área administrativa seria abstração sem caso de uso | ✅ Correto — e abstração de segurança sem uso tende a ser mal testada |

---

## 4. Risco real da ausência (não é zero)

O RBAC ausente **não** cria hoje uma falha de autorização na aplicação. O que
ele cria é **ausência de governança sobre a operação de dados**:

| # | Risco | Por que é consequência da falta de RBAC | Gravidade |
|---|---|---|---|
| 1 | **Script de dados rodado por engano contra produção** | Não há separação entre "papel de runtime" e "papel de curadoria". A mesma `DATABASE_URL` que serve o site escreve a base. Só `db:seed` tem guarda de banco remoto — `db:load-*` e `recalculate-scores` **não têm** | **Alto** |
| 2 | **Nenhum registro de quem alterou o quê** | Sem identidade de operador no banco, um `UPDATE` de score é anônimo | Médio |
| 3 | **Retificação sem fluxo de aprovação** | `RetificationRequest.status` só muda por script. Não há "quem pode deferir" nem dupla checagem — e uma retificação deferida errada é dano jurídico | Médio |
| 4 | **Um mantenedor a mais no GitHub = poder total** | Sem RBAC na aplicação, o único privilégio a revisar é o de repositório/painel | Médio |

---

## 5. Quando o RBAC passa a ser obrigatório

Gatilhos concretos (qualquer um basta):

1. **Área administrativa** de qualquer tipo: moderar retificações, editar
   registro jurídico, corrigir nome/foto, publicar notas editoriais.
2. **Usuário que enxerga dado de outro usuário** — por exemplo, atendimento a
   titulares no painel, ou relatório de votos por conta.
3. **Integração do ETL de integridade com revisão humana** — o plano descrito em
   `docs/ops/anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md` §7.5 exige **revisão
   humana de matches entre 0,88 e 0,95**. Isso **é** um papel: "revisor de
   identidade", que decide aplicar ou não uma trava de integridade sobre uma
   pessoa real. Hoje esse papel não existe no código e o workflow é inexistente.
4. Scripts de curadoria utilizados por mais de uma pessoa.

---

## 6. Desenho proposto (quando o gatilho ocorrer)

### 6.1 Papéis mínimos

| Papel | Pode | Não pode |
|---|---|---|
| `USER` | votar (com consentimento), revogar, excluir a própria conta | tudo o mais |
| `REVIEWER` | ler `RetificationRequest`, mudar status, propor correção de dado | alterar score, deletar dados, mexer em usuário |
| `DATA_OPS` | rodar/registrar carga e recálculo; ver diff antes de aplicar | deferir retificação, ler e-mail de usuário |
| `OWNER` | tudo, com registro | — (papel de último recurso; usar o mínimo possível) |

### 6.2 Implementação mínima viável

```prisma
enum Role { USER REVIEWER DATA_OPS OWNER }

model User {
  // …
  role Role @default(USER)
}

/// Trilha de auditoria — sem ela, papel não é governança, é etiqueta.
model AccessAuditLog {
  id        String   @id @default(cuid())
  actorId   String
  action    String   // "RETIFICACAO_DEFERIDA" | "SCORE_RECALCULADO" | …
  targetRef String?
  metadata  Json?
  createdAt DateTime @default(now())
  @@index([actorId, createdAt])
}
```

Regras que a implementação deve respeitar:

1. **Checagem no servidor, em cada handler.** Nunca só na UI nem só no
   middleware — o middleware já provou não ser o lugar da autorização aqui.
2. **Default fechado.** Papel ausente = `USER`. Rota nova nasce sem privilégio.
3. **Toda escrita privilegiada grava `AccessAuditLog`** na mesma transação.
4. **`OWNER` não é operação normal.** Atribuição manual no banco, com registro.
5. **Concessão de papel é evento auditável**, igual à ação privilegiada.
6. **Nunca substituir "o dono do recurso" por "tem o papel"** — manter o padrão
   de `requireUserId()` (§2.1).
7. **Separar papéis no Postgres** (ver [`RLS.md`](./RLS.md) §6 e
   [`IAM_IGA.md`](./IAM_IGA.md) §7.4): RBAC na aplicação **sem** privilégio
   mínimo no banco ainda deixa a `DATABASE_URL` como chave-mestra.

---

## 7. Conclusão

O projeto **não tem RBAC porque não tem nada a proteger com RBAC** — não há
painel, não há dado cruzado entre usuários e a curadoria é batch. A ausência é
**escopo**, não falha. O que a ausência **de fato** produz é risco operacional:
scripts com poder total, sem identidade e sem log, e o item 1 da tabela §4 é a
ameaça mais provável de todo o modelo (`THREAT_MODELING.md`, T3).

A ação de melhor retorno **não é** implementar RBAC agora — é
**exigir 2FA nas contas de mantenedor e separar o papel Postgres de runtime do
de curadoria**, que atacam o risco real com custo de horas.
