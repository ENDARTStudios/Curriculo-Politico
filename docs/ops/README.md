# docs/ops — conteúdo migrado

> **Aviso (2026-10-12).** O conteúdo operacional que vivia neste diretório foi
> redistribuído para as áreas temáticas de `docs/`. **Este diretório não é mais
> o destino de documentos novos** — ele existe apenas para abrigar os **anexos
> de pesquisa** (mantidos no lugar de propósito: são documentos grandes e se
> referenciam entre si).

## Para onde cada documento foi

| Documento | Novo caminho | Por quê |
|---|---|---|
| `AUDITORIA_PRODUCAO.md` | [`../06-devops-deployment/AUDITORIA_PRODUCAO.md`](../06-devops-deployment/AUDITORIA_PRODUCAO.md) | Auditoria técnica de produção (rotas, APIs, headers, rate limit, pool de conexões) — pertence a DevOps/Deploy |
| `AVALIACAO_ALTERNATIVAS.md` | [`../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md) | Avaliação de fornecedores, região, egress, cache, backup/RPO-RTO e custo |
| `AUDITORIA_JURIDICA_2_RESPOSTA.md` | [`../05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md`](../05-security-compliance/AUDITORIA_JURIDICA_2_RESPOSTA.md) | Resposta a achados jurídicos/LGPD (consentimento, retificação, RIPD) |
| `../security/RIPD.md` | [`../05-security-compliance/RIPD.md`](../05-security-compliance/RIPD.md) | Documento de compliance (diretório `security/` foi extinto) |

## O que ficou aqui

[`anexos/`](./anexos/) — relatórios de pesquisa **brutos**, preservados no lugar
porque são volumosos, se citam mutuamente e servem de evidência primária:

- [`anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md`](./anexos/FONTES_INTEGRIDADE_TCU_STF_TSE.md)
  — sondagem ao vivo das fontes oficiais de integridade (TCU, STF, DataJud,
  TSE, Portal da Transparência) com endpoints, formatos, encoding e bloqueios
  medidos. Alimenta `RLS.md`/`THREAT_MODELING.md` no que diz respeito a
  integridade de fonte e homonímia.
- [`anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md`](./anexos/EMAIL_AUTH_RATELIMIT_OBSERVABILIDADE.md)
  — pesquisa de e-mail transacional, autenticação, rate limiting com estado
  compartilhado e observabilidade (LGPD aplicada). Contém nota de correção no
  topo: o "alerta que exige ação hoje" sobre CVEs do NextAuth estava
  **incorreto** — o projeto já roda `next-auth@4.24.15`.

Os números desses anexos foram incorporados (e em alguns pontos corrigidos) em
[`../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md).
Onde houver divergência, **a avaliação prevalece** sobre o anexo.

## Documentação de segurança e compliance

Está em [`../05-security-compliance/`](../05-security-compliance/) — RIPD,
modelagem de ameaças, resposta a incidentes, IAM/IGA, RBAC, RLS, MFA, ZTNA,
NAC, revisão de segurança, divulgação de vulnerabilidades e compliance LGPD.
