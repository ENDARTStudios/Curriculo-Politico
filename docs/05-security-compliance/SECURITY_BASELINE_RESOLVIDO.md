# Referências a `SECURITY_BASELINE.md` — resolvido

## O que aconteceu

`SECURITY_BASELINE.md` era citado em **11 arquivos do repositório** e **nunca
existiu** em nenhum commit. Era referência fantasma: um documento prometido que
ninguém criou, apontado tanto por código quanto por documentação.

Em código isso é pior que em prosa: um comentário que aponta para uma seção de
um documento inexistente dá a impressão de que existe uma política formal por
trás da implementação, quando o que existe é o código e nada mais.

## Onde foram corrigidas

### Código (3 arquivos, corrigidos em 2026-10-13)

| Arquivo | Antes | Agora aponta para |
|---|---|---|
| `apps/web/src/middleware.ts` | `SECURITY_BASELINE.md §1` | `docs/05-security-compliance/COMPLIANCE.md` §9 e `docs/06-devops-deployment/AUDITORIA_PRODUCAO.md` |
| `apps/web/src/app/api/politicians/[id]/route.ts` | `SECURITY_BASELINE.md §3` | `docs/05-security-compliance/COMPLIANCE.md` §7 |
| `apps/web/src/app/politicos/[id]/page.tsx` | `SECURITY_BASELINE.md §3` | `docs/05-security-compliance/COMPLIANCE.md` §7 |

A §7 do COMPLIANCE.md é **"Linguagem jurídica estrita e publicidade de atos
processuais"**, que é exatamente o conteúdo que os dois últimos comentários
descrevem (ocultação de registro arquivado ou com absolvição). A §9 é
**"Controles de segurança com efeito de compliance"**, que cobre o rate limiting
e os headers do middleware.

Cada um dos três comentários preserva uma nota dizendo que a referência anterior
apontava para arquivo inexistente — para que a correção seja rastreável e
ninguém reintroduza o nome.

### Documentação (permanece citando, como registro histórico)

Os arquivos de documentação abaixo citam `SECURITY_BASELINE.md` de propósito, e
**não devem ser "corrigidos"**: em todos eles a citação é a constatação de que o
arquivo não existe, seja como pendência rastreável, seja como achado de revisão.

- `docs/01-product-discovery/LEGAL_TERMS.md` — tabela de pendências jurídicas
- `docs/01-product-discovery/ROADMAP.md` — trilha de lacunas
- `docs/03-development-process/TASKS.md` — 3 ocorrências, tarefas abertas
- `docs/08-knowledge-management/CONTRIBUTING.md` — ponteiro para a raiz
- `docs/08-knowledge-management/ONBOARDING.md` — armadilhas para quem chega
- `docs/README.md` — índice, seção de referências quebradas

## O que ainda falta

**Nenhum dos dois documentos de destino cobre integralmente o que o nome
`SECURITY_BASELINE.md` sugeria.** O COMPLIANCE.md §9 trata do que tem efeito de
compliance, e a AUDITORIA_PRODUCAO.md mede o comportamento em produção; não há
um documento único que funcione como *baseline* de segurança declarado
(ameaças aceitas, controles obrigatórios, o que é proibido no código).

Se isso for desejado, o lugar natural é `docs/05-security-compliance/`, e o
insumo já existe: `THREAT_MODELING.md` (STRIDE sobre os ativos reais) e
`SECURITY_REVIEW.md` (achados com severidade). Um baseline seria a consolidação
normativa dos dois — mas isso é decisão de escopo, não uma correção pendente.
