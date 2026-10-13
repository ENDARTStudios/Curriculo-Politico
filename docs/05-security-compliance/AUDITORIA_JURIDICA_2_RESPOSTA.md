# Resposta à 2ª Auditoria Jurídica — implementação

**Commit-base auditado:** `aee0d55` · **Esta resposta:** 2026-09-30
**Status global da auditoria recebida:** 🟡 1 P0 + 9 P1 + 4 P2

Abaixo, cada achado e a ação implementada nesta branch. Itens marcados
**EXTERNO** dependem de decisão/dado do controlador, não de código.

## P0

| Achado | Ação implementada |
|---|---|
| **P0-01** Consentimento específico p/ votação não implementado | ✅ Infraestrutura completa: `User.politicalConsentVersion/At/WithdrawnAt` (migration aplicada); checkbox específico e destacado no cadastro e no painel de voto; `POST /api/consent` registra versão+timestamp; gate `403 CONSENT_REQUIRED` na `POST /api/bills/[id]/vote`; `DELETE /api/consent` revoga e **elimina todos os votos** (Art. 18, VI); UI ativa com fluxo completo (conceder → votar → revogar) |

## P1

| Achado | Ação implementada |
|---|---|
| **P1-01** Retificação só `mailto:` | ✅ Backend: `RetificationRequest` (protocolo `RET-AAAA-XXXXXX`), `POST /api/retificacao` + consulta de status (`GET` por protocolo+email); página aberta a **qualquer titular** (agentes, usuários, terceiros) |
| **P1-02** DPO sem identidade nominal | ✅ **RESOLVIDO em 2026-10-12** — encarregado publicado como **Equipe END ART Studios**, com caixas postais operacionais (`endart.studios+privacidade@gmail.com` para DPO, `+direitos` para o Art. 18, `+security` para incidentes) na Política §1, /lgpd §5, Termos §7.4, /contato e RIPD §5. Os endereços `@curriculopolitico.org` (sem caixa postal ativa) foram substituídos. Risco residual de identificação institucional (não nominal) registrado no RIPD §6.1 |
| **P1-03** Transferência internacional não comprovada | 🟡 Texto corrigido (SCCs Res. 19/2024; nota de que ADF/DPF **não** equivale a adequação ANPD) + pendência de formalização contratual registrada no RIPD §6. **EXTERNO:** assinatura dos contratos |
| **P1-04** Clickwrap não implementado | ✅ Checkbox obrigatório de Termos+Privacidade e de maioridade no cadastro; aceite gravado com **versão e data** (`User.termsVersion/At`); fluxo OAuth também grava o aceite no 1º login (`signIn` callback); Termos §1.2 reescrito (browsewrap eliminado) |
| **P1-05** Cap R$ 1.000 | ✅ Cláusula removida; §6.4 agora remete ao CDC (cláusulas abusivas/adesão) com limitação apenas nos limites legais |
| **P1-06** `UserAffinity` no schema contradiz política | ✅ Model removido do schema e do banco (migration — tabela tinha 0 registros); `AffinityFilter` confirmado 100% localStorage (sem nenhum fetch) |
| **P1-07** Ausência de RIPD | ✅ `05-security-compliance/RIPD.md` criado: mapeamento de operações, análise por Res. 2/2022, riscos/mitigações, pendências |
| **P1-08** Incidentes: titulares "prazo razoável" | ✅ Política §10: titulares em **3 dias úteis**, mesmo prazo ANPD (Res. 15/2024) |
| **P1-09** Baselines 50 não identificados | ✅ Selo "sem dados · neutro" por dimensão no perfil (`ScoreBreakdown` com cobertura real vs. baseline alinhada ao `recalculate-scores.ts`) + seção dedicada "Baseline Neutro (50)" em /metodologia com tabela de status por dimensão |

## P2

| Achado | Ação implementada |
|---|---|
| "Dados públicos = domínio público" | ✅ Termos §5.3: redação segura (fontes oficiais, sem reivindicar titularidade, direitos de terceiros preservados) |
| Foro SP | ✅ Termos §8.1: "sem prejuízo das normas imperativas… inclusive as que asseguram foro ao consumidor" |
| Menores: controle só documental | ✅ Declaração expressa de 18+ obrigatória no cadastro (clickwrap) — controle declaratório registrado; RIPD registra risco residual |
| "Sem viés ideológico" absoluto | ✅ FAQ reformulado para descrição objetiva e verificável ("característica verificável da metodologia aberta — não promessa de neutralidade absoluta") |

## Correções complementares da auditoria (§3 e §7 do relatório)

- Exclusão de conta confirmada e Política atualizada: "exclusão técnica
  imediata ou, no máximo, 30 dias" (§12).
- Retenção de `UserBillVote`: eliminação **imediata na revogação** (§8).

## Pendências externas restantes (bloqueiam "concluído" pleno)

1. ~~Nome do encarregado (DPO) a publicar + caixa postal `dpo@` operacional.~~
   **Resolvido em 2026-10-12** (ver P1-02 acima).
2. Contratos Vercel/Sentry com SCCs assinados (anexar evidência ao RIPD §6).
3. Revisão jurídica humana integral (Termos, Política, RIPD) antes de campanha.
4. Serviço de e-mail transacional (Resend/SMTP) inexistente — bloqueia
   verificação de e-mail no cadastro e recuperação de senha (RIPD §6.5).
