# RIPD — Relatório de Impacto à Proteção de Dados Pessoais

**Projeto:** Currículo Político (curriculopolitico.org)
**Controlador:** ENDART Studios (identificação empresarial completa pendente de constituição formal)
**Versão:** 1.0 · 2026-09-30
**Referências:** LGPD (Lei 13.709/2018), Res. CD/ANPD nº 2/2022 (alto risco), Guia RIPD/ANPD, Res. CD/ANPD nº 15/2024 (incidentes), Res. CD/ANPD nº 19/2024 (transferência internacional)

---

## 1. Escopo e gatilho da análise

O tratamento inclui **dado pessoal sensível — opinião política** (Art. 5º, II LGPD): o voto FAVOR/CONTRA do usuário em projetos de lei, vinculado à conta (`UserBillVote`).

Pela Res. CD/ANPD nº 2/2022, **dados pessoais sensíveis são critério específico de alto risco**; combinado a critérios gerais (larga escala potencial; possibilidade de afetar direitos fundamentais — liberdade de convicção política), o tratamento requer análise formal documentada. Este documento a registra e será revisado antes de qualquer expansão significativa de escala ou finalidade.

## 2. Operações de tratamento mapeadas

| # | Operação | Dados | Base legal | Modelo |
|---|---|---|---|---|
| 1 | Publicação de dados públicos de agentes políticos | Nome, mandato, partido, votações nominais, presenças, autorias, CEAP, patrimônio, registros jurídicos oficiais | LAI (Lei 12.527/2011) + CF/88 Art. 37 + LGPD Art. 7º §4º (origem/publicidade) | `Person`, `Term`, `Bill`, `LegalRecord`, etc. |
| 2 | Tratamento analítico próprio (IDIP) | Derivados da operação 1 | LGPD Art. 7º §4º / Art. 10 (estudos por órgão de pesquisa é aplicado por analogia como referência; dados manifestamente públicos) | `Score` |
| 3 | Conta de usuário | Email, senha (bcrypt), nome opcional, registro de aceites | LGPD Art. 7º, I (consentimento — clickwrap versionado) | `User` |
| 4 | **Votação popular (dado sensível)** | FAVOR/CONTRA por projeto, vinculado à conta | LGPD **Art. 11, I (consentimento específico e destacado)** | `UserBillVote` |
| 5 | Segurança/antifraude | IP (rate limiting 60/min), idades de conta | LGPD Art. 7º, IX (legítimo interesse) | Middleware, logs |
| 6 | Monitoramento de erros (condicional) | Stack traces | Consentimento/documentação (Sentry disclosure na Política) | Sentry, se `SENTRY_DSN` ativo |
| 7 | Canal de direitos do titular | Nome, email, conteúdo da solicitação | LGPD Art. 18 (cumprimento de obrigação legal) | `RetificationRequest` |

**Não tratamos:** dado de menor de 18 anos (declaração de maioridade no cadastro), dados de saúde, biometria, religião, origem racial, CPF, endereço, telefone, geolocalização precisa. Preferências de afinidade permanecem **exclusivamente no navegador** (localStorage) — não há model correspondente no banco.

## 3. Neutralidade algorítmica (medida de mitigação estrutural)

- A votação popular é camada de engajamento **arquiteturalmente separada** do IDIP: `UserBillVote` não participa de `calculateIDIP` nem de qualquer agregação de `Score`.
- O IDIP usa exclusivamente dados públicos oficiais auditáveis, com pesos e fórmulas publicados em /metodologia.
- Dimensões sem fonte de dados recebem **baseline neutro 50, identificado na interface** (selo "sem dados · neutro") — o usuário distingue nota medida de nota baseline.

## 4. Avaliação de risco por operação

| Risco | Probabilidade | Impacto | Mitigações existentes | Residual |
|---|---|---|---|---|
| Reidentificação/inferência de perfil ideológico do usuário a partir dos votos | Baixa (votos só agregados publicamente; sem exportação por usuário) | Alto (dado sensível) | Contagem pública apenas agregada; API não expõe `userId`; consentimento específico versionado; revogação elimina votos; exclusão de conta em cascade | Baixo |
| Vazamento do banco (votos + emails) | Baixa (supabase sa-east-1, role não-superuser, HTTPS, rate limit) | Alto | Criptografia em trânsito; senhas bcrypt; plano de resposta 3 dias úteis (ANPD + titulares); backups Supabase | Médio-baixo |
| Uso indevido interno (profiling de usuários) | Baixa | Alto | Finalidade restrita documentada; nenhum endpoint de perfil de usuário; Neutralidade Algorítmica | Baixo |
| Manipulação de votação (sybil/bots) | Média | Médio (integridade do engajamento; não afeta IDIP) | Conta 24h; 1 voto/projeto; rate limiting; (futuro: verificação de email) | Médio |
| Dado público impreciso afetando reputação de agente político | Média (replica fonte oficial) | Alto | Fonte citada; retificação com protocolo (72h úteis p/ políticos); presunção de inocência (arquivados/absolvidos ocultos); TIC com confiança por dimensão | Médio |
| Transferência internacional sem salvaguarda válida | Baixa | Médio | Supabase sa-east-1 (Brasil); Vercel/Sentry: SCPs Res. 19/2024 **a formalizar nos contratos** — pendência registrada | Médio (até formalização) |
| Tratamento de dado de menor | Baixa (declaração de maioridade; sem verificação documental) | Alto | Declaração expressa no cadastro; eliminação imediata se detectado | Médio (controle declaratório) |

## 5. Direitos do titular na prática

- **Consentimento:** checkbox específico e destacado (cadastro + interface de voto), gravado com versão e timestamp (`User.politicalConsentVersion/At`).
- **Revogação:** um clique no painel de votação (`DELETE /api/consent`) → registra revogação e **elimina todos os votos**; ou via canal `/retificacao`.
- **Exclusão de conta:** `DELETE /api/account` (imediata; máximo 30 dias).
- **Acesso/retificação/correção:** `/retificacao` com protocolo rastreável e consulta de status; prazo Art. 19 (15 dias).
- **Informação:** Política de Privacidade com Universos A/B separados, tabela de retenção e de transferência internacional.

## 6. Pendências registradas (com prazo/responsável)

1. **Identidade nominal do DPO** a publicar na Política (Res. CD/ANPD nº 18/2024, Art. 4º) — decisão do controlador; bloqueia lançamento público.
2. **Formalização contratual das SCCs** (Res. 19/2024) com Vercel e Sentry — evidência contratual a anexar a este RIPD.
3. **Revisão jurídica humana** integral deste RIPD, Termos e Política antes de campanha de divulgação.
4. Revisão deste documento a cada expansão de escala, nova finalidade ou novo processador.

## 7. Conclusão

O tratamento de opinião política é **admissível** com o regime atualmente implementado (consentimento específico versionado, revogação com eliminação, separação arquitetural do IDIP, minimização de coleta). Os riscos residuais principais são **operacionais e contratuais** (pendências §6), não de arquitetura. Nenhuma operação identificada exige suspensão; as pendências devem ser encerradas antes de crescimento significativo da base de usuários.
