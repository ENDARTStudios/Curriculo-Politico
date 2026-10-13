# INCIDENT_RESPONSE — Resposta a incidentes de segurança e de privacidade

**Projeto:** Currículo Político · **Versão:** 1.0 · **Data:** 2026-10-12
**Base normativa:** LGPD Art. 48 e Art. 33; Res. CD/ANPD nº 15/2024 (comunicação de incidentes); Res. CD/ANPD nº 19/2024 (transferência internacional)
**Canal de segurança:** `endart.studios+security@gmail.com` (publicado no RIPD §5, na Política §1, em /lgpd §5, nos Termos §7.4 e em /contato)
**Encarregado (DPO):** Equipe END ART Studios — `endart.studios+privacidade@gmail.com`

> **Aviso de realismo.** Este é o plano de resposta a incidentes de um projeto
> operado por **uma pessoa**, sem plantão, sem SOC, sem SIEM e sem Sentry ativo.
> Ele foi escrito para ser **executável sozinho, sob estresse, sem consultar outra
> pessoa** — e por isso é curto e imperativo. Um plano de 40 páginas que ninguém
> lê às 3h da manhã é pior que um de 5 páginas que funciona.
>
> **Não há plantão 24/7.** O compromisso de tempo neste documento é de
> **primeira resposta em até 24 h após a detecção**, e não de detecção em tempo
> real — porque **a detecção hoje é manual e parcial** (§3).

---

## 1. O que conta como incidente

| Tipo | Exemplos concretos neste projeto |
|---|---|
| **Vazamento de dado pessoal** | Dump de `User`/`UserBillVote` exposto; `DATABASE_URL` publicada em log, print, issue ou repositório; resposta de API devolvendo voto de outro usuário |
| **Comprometimento de credencial** | `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET` ou `SUPABASE_SECRET_KEY` em mãos de terceiro |
| **Comprometimento de conta** | Conta de usuário acessada por outro (sem MFA, sem log — §3); conta de mantenedor do GitHub/Vercel/Supabase comprometida |
| **Integridade de dado** | Votos ou notas alterados; registros jurídicos indevidos; `DELETE` em massa por script rodado por engano (ameaça T3 de [`THREAT_MODELING.md`](./THREAT_MODELING.md)) |
| **Indisponibilidade** | Site fora; banco inacessível; cota de egress estourada (30 dias de bloqueio no Hobby) |
| **Dano jurídico/reputacional** | Falso positivo de homonímia publicando registro jurídico de outra pessoa; erro de linguagem jurídica |
| **Abuso** | Flood de `/api/retificacao`; sybil na votação; scraping massivo |

---

## 2. Severidades e prazos

| Sev | Definição | Exemplo | Primeira resposta | Contenção | Titulares/ANPD |
|---|---|---|---|---|---|
| **S1 — Crítico** | Dado pessoal sensível (opinião política) exposto, ou credencial de produção comprometida, ou perda de dados | Dump com `UserBillVote` + e-mails circulando; `DATABASE_URL` vazada | **Imediata** (mesma sessão) | **< 4 h** | Avaliar Art. 48 **em até 24 h**; comunicar em **até 3 dias úteis** se confirmado |
| **S2 — Alto** | Acesso não autorizado a dado pessoal sem confirmação de exfiltração; integridade de dado comprometida; site fora | Votos alterados; `UPDATE` indevido em `Score` | < 24 h | < 24 h | Avaliar; comunicar se houver risco relevante |
| **S3 — Médio** | Abuso relevante sem vazamento; degradação parcial | Flood em `/api/retificacao`; scraping agressivo | < 48 h | < 72 h | Não aplicável |
| **S4 — Baixo** | Falha de controle sem impacto a titular | Rate limit inefetivo explorado sem dano; erro de header | < 5 dias | Conforme | Não aplicável |

**Sobre o prazo legal.** A LGPD Art. 48 exige comunicação à ANPD e ao titular em
**prazo razoável**. A Res. CD/ANPD nº 15/2024 estabelece **3 dias úteis**,
contados da **ciência** de que o incidente afetou dados pessoais. O RIPD §4
registra "plano de resposta 3 dias úteis (ANPD + titulares)" e
`AUDITORIA_JURIDICA_2_RESPOSTA.md` (P1-08) registra o mesmo para titulares.
**Este documento adota 3 dias úteis como prazo interno máximo**, com meta
operacional de 24–48 h. O prazo começa quando **qualquer pessoa do projeto
souber** — não quando houver certeza jurídica.

---

## 3. Detecção — seja honesto sobre o que não é detectado

| Fonte de detecção | Existe? | O que cobre |
|---|---|---|
| UptimeRobot | ✅ (mencionado em `.env.example`, `npm run uptimerobot`) | Site fora do ar |
| `production-smoke.yml` (a cada 6 h) | ✅ | Home, `/ranking`, `/api/search`, `/api/rankings`, `/status` degradado |
| `a11y.yml` (a cada 6 h) | ✅ | Acessibilidade em produção; falha sugere deploy quebrado |
| `monthly-snapshot.yml` + `verify-snapshot.ts` | ✅ | Se o snapshot mensal não rodou/gravou |
| **Sentry** (erros de aplicação) | ❌ **DORMENTE** — sem `SENTRY_DSN` | Nada. Erros em produção são invisíveis |
| **Log de autenticação** | ❌ Não existe | Login suspeito, força bruta bem-sucedida, novo dispositivo: **invisível** |
| **Alerta de volume/egress** | ❌ Não existe | Scraping e estouro de cota: **descobertos quando a plataforma para** |
| **Alerta de integridade de dados** | ❌ Não existe | `UPDATE`/`DELETE` em massa: **invisível** |
| **Alerta de cron com falha** | ❌ Não existe (o workflow falha silenciosamente para quem não olha o Actions) | Snapshot mensal não rodar |
| Relato externo | ✅ | Ver [`VULNERABILITY_DISCLOSURE.md`](./VULNERABILITY_DISCLOSURE.md) — **canal não publicado** |

**Consequência prática:** os incidentes que este plano trata melhor são os que
**quebram o site** (detectados) e os que **alguém relata** (recebidos). Os
incidentes silenciosos — exfiltração lenta, alteração de votos, conta tomada —
seriam descobertos por acaso. Fechar isso é a ação nº 1 da §9.

---

## 4. Papéis (aproximação honesta de "quem faz o quê")

| Papel | Quem | Responsabilidades |
|---|---|---|
| **Incident Commander (IC)** | Operador do projeto | Único ponto de decisão; declara severidade; decide comunicar; conduz o post-mortem |
| **Encarregado (DPO)** | Equipe END ART Studios (`+privacidade`) | Avalia necessidade de comunicação à ANPD e aos titulares; redige o comunicado |
| **Segurança** | `+security` | Recebe relato de vulnerabilidade e primeiro contato externo |
| **Operação técnica** | O mesmo operador | Executa contenção, rotação de credenciais e restauração |
| **Comunicação** | O mesmo operador | Mensagem pública, se necessária |
| **Assessoria jurídica** | ❌ **Não contratada** | Lacuna registrada no RIPD §6.3 ("revisão jurídica humana" pendente) |

**Não há escalonamento para terceiro.** Não existe contrato de resposta a
incidente com fornecedor, nem advogado de plantão. Para S1 com impacto jurídico,
a recomendação é **não improvisar comunicação pública** e priorizar contenção.

**Suplente:** ❌ **não existe**. Se o operador estiver indisponível (doença,
viagem, falecimento), **não há continuidade de resposta**. Isso é um risco
aceito e registrado aqui — não mitigado.

---

## 5. Playbooks

### 5.1 Rotação de credenciais (o procedimento mais importante)

**Regra de ouro:** rotacione na **ordem inversa** da propagação — primeiro
invalida, depois redistribui, e só então valida. Rotacionar uma variável sem
redeployar **não** invalida a credencial antiga em uso.

#### Supabase — `DATABASE_URL` / `DIRECT_URL` comprometidas

1. **Painel Supabase → Project Settings → Database → Reset database password.**
   Isso invalida imediatamente toda conexão que use a senha antiga — **a
   aplicação cai**. É esperado; é a contenção.
2. **Vercel → Settings → Environment Variables** (Production e Preview):
   atualizar `DATABASE_URL` (pooler, porta **6543**, com
   `?pgbouncer=true&connection_limit=1`) e `DIRECT_URL` (direta, **5432**).
   *Não troque os modos*: `prisma migrate` não funciona em transaction mode
   (`schema.prisma` L11–12).
3. **GitHub → Settings → Secrets → Actions:** atualizar `DATABASE_URL`
   (usado por `monthly-snapshot.yml` L31 e L36).
4. **Redeploy** da Vercel (as envs só valem em novo deployment).
5. **Máquina local:** atualizar `apps/web/.env` — ou, melhor, **remover a
   credencial de produção do arquivo local** (a `AUDITORIA_PRODUCAO.md` §0.5
   registra que ele apontava para produção).
6. **Validar:** `curl -s -o /dev/null -w "%{http_code}" https://www.curriculopolitico.org/ranking`
   → `200`; rodar o `production-smoke.yml` manualmente (`workflow_dispatch`).
7. **Registrar:** data/hora da rotação, motivo, quem executou.

> ⚠️ **Se `SUPABASE_SECRET_KEY` também vazou**, rotacione-a em Project Settings →
> API e verifique a lista de *access tokens* da conta Supabase.

#### Vercel

1. Se o comprometimento for da **conta**: revogar sessões ativas, trocar a senha,
   revisar **Settings → Tokens** e revogar todos os tokens de acesso.
2. Se for de um **token**: revogar o token específico e emitir outro.
3. Se for do **projeto**: revisar `Settings → Git` (integração), `Settings →
   Environment Variables` (as 23 variáveis manuais) e o histórico de deployments
   para identificar deployment adulterado.
4. Confirmar que o **domínio** não foi reapontado e que não há domínio novo.

#### `NEXTAUTH_SECRET` comprometido

1. Gerar novo segredo (ex.: `openssl rand -base64 32`).
2. Atualizar na Vercel → redeploy.
3. **Efeito colateral esperado e desejado:** **todas as sessões são invalidadas
   imediatamente** (não há revogação seletiva — ver [`IAM_IGA.md`](./IAM_IGA.md) §2).
   Comunicar isso aos usuários ativos se houver.
4. Verificar se o segredo não está em nenhum commit: `git log -p -S "valor"`.

#### `GOOGLE_CLIENT_SECRET` comprometido

1. **Google Cloud Console → APIs & Services → Credentials** → rotacionar o
   client secret.
2. Atualizar na Vercel → redeploy.
3. Revisar o **OAuth consent screen** e os usuários/escopos autorizados.
4. Considerar desativar temporariamente o provider: remover `GOOGLE_CLIENT_ID`
   da Vercel faz o provider **não ser registrado** (`lib/auth.ts` L13–22) — o
   botão desaparece sem quebrar o login por credenciais.

#### Contas de painel (GitHub / Vercel / Supabase / Google)

Trocar senha, **revogar todas as sessões**, revisar **2FA** (habilitar se
ausente — [`MFA.md`](./MFA.md) §4), revisar chaves SSH (GitHub), tokens de
acesso e *personal access tokens*. No GitHub, verificar *Settings → Sessions*,
*SSH keys*, *Applications* e as **Actions secrets** do repositório.

### 5.2 Vazamento de `DATABASE_URL`

1. **Tratar como S1** — a credencial dá leitura e escrita em produção, **sem RLS
   e sem papel de privilégio mínimo** ([`RLS.md`](./RLS.md) §2).
2. Rotacionar imediatamente (§5.1).
3. **Preservar evidência antes de "limpar":** se a string apareceu em um
   artifact, log ou issue, tirar print/cópia com timestamp antes de remover.
4. **Avaliar integridade dos dados** (assuma comprometimento, não negação):
   - `SELECT count(*)` das tabelas de usuário; comparar com o último valor conhecido (hoje: **0 usuários, 0 votos** — `AVALIACAO_ALTERNATIVAS.md` §2.5);
   - revisar `Score`/`ScoreSnapshot` por valores anômalos;
   - revisar `LegalRecord` (deve estar em 0) e `RetificationRequest`.
5. **Sem backup, não há restore.** Se houve `DELETE`, a recuperação depende de
   reintroduzir os dados a partir das fontes oficiais via ETL — dias de trabalho.
   É exatamente o risco A-03 de [`SECURITY_REVIEW.md`](./SECURITY_REVIEW.md).

### 5.3 Conta de usuário comprometida

1. **Não há como invalidar sessão individual** — o único caminho é rotacionar
   `NEXTAUTH_SECRET` (desloga todos) ou **excluir a conta**
   (`DELETE /api/account` como o próprio usuário, ou `prisma.user.delete`).
2. **Não há log de login** para reconstruir o que aconteceu. Reconstruir por
   `UserBillVote.updatedAt` e `User.updatedAt` (o `updatedAt` é `@updatedAt`, então
   alterações de consentimento aparecem).
3. **Preservar** o estado da conta antes de excluir (exportar as linhas), porque
   a exclusão é **física e irreversível**.
4. Se o vetor foi reuso de senha de outro site, avaliar se afetou outras contas
   (mesma senha) — sem log, a inferência é limitada.
5. **Registrar como incidente** mesmo sem vazamento comprovado: o titular tem
   direito a saber que houve acesso não autorizado.

### 5.4 Alteração indevida de dados (integridade)

1. **Parar a fonte da escrita.** Se foi script local, interromper o processo. Se
   foi acesso via `DATABASE_URL`, rotacionar (§5.1) **primeiro**.
2. Identificar a extensão: quais tabelas, quantas linhas, qual janela de tempo
   (usar `updatedAt`/`createdAt`/`retrievedAt`).
3. **Cruzamento com as fontes oficiais.** Todo dado público é reconstruível:
   re-rodar `npm run etl:*` + `npm run db:load-*` (idempotentes) restaura
   Câmara/Senado/TSE. **`Score`/`ScoreSnapshot` são derivados** — reconstruíveis
   por `npm run recalculate-scores`, mas **snapshots históricos perdidos não
   voltam** com a data original.
4. Se envolveu `LegalRecord` (dado jurídico sobre pessoa real), tratar como
   **S2 com prioridade jurídica**: a publicação indevida de registro de outra
   pessoa é o maior risco de difamação do projeto
   ([`COMPLIANCE.md`](./COMPLIANCE.md) §7.3).

### 5.5 Flood / scraping / estouro de cota

1. **Confirmar o vetor** nos headers de rate limit (`X-RateLimit-Limit`,
   `X-RateLimit-Remaining`, `Retry-After` — `middleware.ts` L132–137) e no
   painel da Vercel (invocações) e do Supabase (egress, conexões).
2. **Contenção imediata:** colocar Cloudflare (proxy) **na frente** com regra de
   rate limit / *challenge*, ou bloquear na Vercel se houver WAF. Atenção: o
   Cloudflare na frente da Vercel **é permitido mas não recomendado pela Vercel**
   e SSL/TLS em modo *Flexible* cria loop — usar **Full (strict)**
   (`AVALIACAO_ALTERNATIVAS.md` §5.3).
3. Se a cota **já estourou**: no Hobby **não há pay-as-you-go** — a plataforma
   fica indisponível até o ciclo virar. A mitigação é avisar o público em
   `/status` e acelerar o cache (R2).
4. **Pós-incidente obrigatório:** implementar `unstable_cache` e alerta de
   egress (§9).

### 5.6 Indisponibilidade (site fora)

1. **Vercel → Deployments:** verificar status e, se o último deploy quebrou,
   **promover o deployment anterior** (rollback imediato — o deploy por Git está
   ativo em `main`, `AUDITORIA_PRODUCAO.md` §0.2).
2. **Se todas as páginas dinâmicas derem HTTP 500:** verificar o pool. O sintoma
   histórico é `FATAL: (EMAXCONNSESSION) max clients reached in session mode`
   (`AUDITORIA_PRODUCAO.md` §0.7.5) — significa que o `DATABASE_URL` aponta para
   o pooler em **session mode (5432)** em vez de transaction mode (6543).
3. **Supabase → Project Health:** confirmar `ACTIVE_HEALTHY` (o projeto já ficou
   `Suspended` por integração Vercel suspensa — `AUDITORIA_PRODUCAO.md` §0.2).
4. **Sem backup, um banco perdido não se restaura.** A reconstrução é o pipeline
   ETL completo (dias).

### 5.7 Falso positivo jurídico publicado (homonímia)

1. **Tratar como S2.** Suspender a exibição do registro do político afetado.
2. Acionar o canal de retificação: `RetificationRequest` + protocolo
   `RET-AAAA-XXXXXX` ([`/retificacao`](../../apps/web/src/app/retificacao/page.tsx)).
3. Verificar o `matchMethod`/`matchScore` do casamento — **se o casamento foi por
   nome isolado, é falha de processo** ([`COMPLIANCE.md`](./COMPLIANCE.md) §7.3).
4. Corrigir na fonte de dados (`LegalRecord`) e recalcular com
   `npm run apply-integrity-caps` + `npm run recalculate-scores`.
5. **Registrar a correção** e comunicar ao titular. Não há `changelog` público de
   retificações hoje — lacuna reconhecida em `COMPLIANCE.md` §8.

---

## 6. Comunicação

### 6.1 Comunicação à ANPD e ao titular (LGPD Art. 48)

**Quando:** se o incidente puder **acarretar risco ou dano relevante** aos
titulares. O critério da Res. 15/2024 inclui dados sensíveis — **opinião
política é dado sensível (Art. 5º, II)**, o que eleva a probabilidade de
comunicação obrigatória. **Na dúvida, comunique.**

**O que a comunicação precisa conter** (checklist, não texto jurídico pronto):

- [ ] Descrição do incidente e da **natureza** dos dados afetados
- [ ] **Categorias** de titulares afetados (ex.: "usuários com conta que haviam consentido votar")
- [ ] **Número** de titulares afetados e de registros
- [ ] **Dados** afetados, de forma específica (e-mail? voto? ambos?)
- [ ] **Riscos** decorrentes (não minimizar)
- [ ] **Medidas** técnicas e de segurança adotadas ou em adoção
- [ ] **Motivo** da demora, se houve
- [ ] **Canal** de contato para o titular: `endart.studios+direitos@gmail.com`
- [ ] **Medidas que o titular pode adotar** (ex.: trocar senha reutilizada em outro serviço)
- [ ] Data/hora da ciência e da comunicação

**Canal:** formulário eletrônico da ANPD (ou o canal vigente na data). **Não
invente o procedimento**: confirmar o canal oficial no momento do incidente.

**Registre o processo internamente mesmo que não comunique** — a decisão de não
comunicar precisa de justificativa documentada.

### 6.2 Comunicação pública

- **Não improvisar.** Sem assessoria jurídica contratada (§4), a comunicação
  pública em S1 deve ser **factual, curta e restrita ao que se sabe**.
- Usar `/status` (página existente, validada pelo `production-smoke.yml`) para
  indisponibilidade — o smoke falha se `/status` exibir "Indisponível"
  (`production-smoke.yml` L40–43).
- Em incidente de dado sensível, a prioridade é **comunicar os titulares
  diretamente** — bloqueada hoje pela ausência de serviço de e-mail
  (RIPD §6.5). **Sem e-mail, não há como cumprir o Art. 48 de forma adequada.**
  Isso é uma lacuna material, não um detalhe operacional.

### 6.3 Comunicação a terceiros

| Terceiro | Quando avisar | Como |
|---|---|---|
| Supabase | Acesso indevido ao banco, uso anômalo | Suporte do painel |
| Vercel | Deployment adulterado, token comprometido | Suporte do painel |
| GitHub | Repositório/secrets comprometidos | GitHub Security |
| Google | `GOOGLE_CLIENT_SECRET` comprometido | Cloud Console + suporte |

---

## 7. Preservação de evidências

Antes de "limpar" qualquer coisa:

1. **Não apague** logs do Vercel (retenção de **1 hora** no Hobby — copie
   imediatamente), nem arquivos de `.next/`, nem dumps de `data/raw/`.
2. **Salve para fora do repositório** (o repositório é **público**). Nunca
   publique evidência com dado pessoal em issue do GitHub.
3. Exportar as linhas relevantes **antes** de qualquer correção:
   `RetificationRequest` envolvida, `User`/`UserBillVote` afetados,
   `prisma.user.findMany` do período.
4. Registrar **data e hora de cada ação** (§8) — a linha do tempo é o produto
   mais valioso do post-mortem.
5. **Atenção ao próprio egress:** extrair grandes volumes consome a cota de 5 GB
   do Supabase Free. Extraia o mínimo necessário.

---

## 8. Linha do tempo e post-mortem

Registrar **durante** o incidente, em texto simples, com hora:

| Hora (BRT) | Evento | Quem |
|---|---|---|
| | Detecção (como? por quem?) | |
| | Severidade declarada | |
| | Primeira ação de contenção | |
| | Rotação de credenciais (quais) | |
| | Comunicação (a quem, quando) | |
| | Encerramento | |

**Post-mortem (obrigatório para S1 e S2), em até 7 dias:**

1. O que aconteceu (linha do tempo factual, sem culpa).
2. **Causa raiz** — técnica e de processo.
3. Por que **não foi detectado antes** (para cada fonte de detecção da §3).
4. O que funcionou e o que não funcionou.
5. **Ações com responsável e prazo** — cada ação precisa virar item verificável
   (idealmente um teste automatizado ou um workflow, não uma promessa).
6. Se o achado indica um controle ausente, **adicionar ao
   [`SECURITY_REVIEW.md`](./SECURITY_REVIEW.md) e ao
   [`THREAT_MODELING.md`](./THREAT_MODELING.md)**.

---

## 9. Ações imediatas para tornar este plano executável

Ordenadas por impacto sobre a capacidade de **detectar** e **responder**:

| # | Ação | Por quê | Esforço |
|---|---|---|---|
| 1 | **Ativar Sentry com scrubbing antes do DSN** | Hoje erros em produção são invisíveis; é a única fonte de detecção de falha de aplicação | Horas |
| 2 | **Serviço de e-mail transacional (Resend)** | Sem e-mail **não é possível cumprir o Art. 48** nem responder ao titular de uma retificação | 1–2 h |
| 3 | **Rate limit com estado compartilhado** nas rotas sensíveis | Sem ele, abuso e força bruta não são contidos nem percebidos | 2–4 h |
| 4 | **Alerta de egress/cota do Supabase** e de falha dos workflows | Evita descobrir o estouro quando a plataforma já parou | Horas |
| 5 | **Backup semanal + teste de restore** | Sem backup, `DELETE` = perda permanente; sem teste, backup não é backup | ~2 h + teste |
| 6 | **Guarda de banco remoto em todos os scripts de escrita** | Fecha a ameaça mais provável (T3) e a via de incidente de integridade | Horas |
| 7 | **Rotação documentada e agendada** de `DATABASE_URL`/`NEXTAUTH_SECRET` | Um procedimento escrito e testado é o que torna a §5.1 executável sob pressão | Horas |
| 8 | **Log de eventos de autenticação** | Sem ele, conta comprometida é indetectável e irrastreável | Dias |
| 9 | **Suplente e contato jurídico de emergência** | Hoje não há continuidade nem assessoria | Decisão do controlador |
| 10 | **`security.txt` e canal de divulgação publicado** | Ver [`VULNERABILITY_DISCLOSURE.md`](./VULNERABILITY_DISCLOSURE.md) | Horas |

---

## 10. Referências no repositório

- [`SECURITY_REVIEW.md`](./SECURITY_REVIEW.md) — achados que originam boa parte destas ações
- [`THREAT_MODELING.md`](./THREAT_MODELING.md) — ameaças T2, T3, D2, I2, I4
- [`IAM_IGA.md`](./IAM_IGA.md) §5–6 — quem tem poder sobre o quê e como rotacionar
- [`MFA.md`](./MFA.md) §2.2 — por que um incidente de conta é hoje invisível
- [`VULNERABILITY_DISCLOSURE.md`](./VULNERABILITY_DISCLOSURE.md) — canal de relato externo
- [`COMPLIANCE.md`](./COMPLIANCE.md) §6–8 — subprocessadores, retenção e direito de resposta
- [`RIPD.md`](./RIPD.md) §4–6 — riscos formais e pendências registradas
- [`../06-devops-deployment/BACKUP_DR.md`](../06-devops-deployment/BACKUP_DR.md) — o que existe (nada) e o que fazer
- [`../06-devops-deployment/AUDITORIA_PRODUCAO.md`](../06-devops-deployment/AUDITORIA_PRODUCAO.md) — sintomas históricos de indisponibilidade e como foram corrigidos
