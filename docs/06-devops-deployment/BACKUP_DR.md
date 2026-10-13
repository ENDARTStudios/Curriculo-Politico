# BACKUP_DR — Backup e recuperação de desastre

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Status:** 🔴 **NÃO EXISTE BACKUP. NÃO EXISTE TESTE DE RESTAURAÇÃO.**
**Fonte dos números:** [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §2.2, §2.5, §2.8, §4, §5.1 (medições de 2026-10-12)

> Este documento tem duas partes: o que **não** existe (§§1–3, que é quase tudo)
> e o que **precisa ser feito** (§§4–7). A ordem importa: o diagnóstico primeiro,
> porque a ausência de backup é um achado de conformidade, não só de operação.

---

## 1. O que existe hoje: nada

| Item | Estado | Como foi verificado |
|---|---|---|
| Workflow de `pg_dump` | ❌ **Não existe** | Nenhum workflow em `.github/workflows/` faz dump |
| Script de dump/restore | ❌ Não existe | Nenhum script em `apps/pipeline/scripts/` |
| Backup automático do Supabase | ❌ **Não existe** | Plano **Free** — a tabela oficial de preços confirma *"Automatic backups: Not included"*; Pro inclui **7 dias** |
| Cópia off-site | ❌ Não existe | — |
| Snapshot manual recente | ❌ **Não verificado** — não há registro de dump manual. O painel do Supabase **não verificado** |
| Teste de restauração | ❌ **Nunca feito** | Nenhum registro |
| Alerta de falha de backup | ❌ Não existe (não há backup a monitorar) | — |
| `data/raw/*` (camada bruta do ETL, gitignored) | ⚠️ Existe **apenas na máquina local** e em `.tmp_research/` de sessões de pesquisa; **não é backup** e **não está versionado** | `.gitignore`, README |
| Repositório Git | ⚠️ Backup do **código**, não dos dados | — |

### 1.1 A divergência documental que precisa ser corrigida

| Onde | O que diz |
|---|---|
| [`../05-security-compliance/RIPD.md`](../05-security-compliance/RIPD.md) §4 | A mitigação do risco de vazamento inclui "**backups Supabase**" |
| **Realidade (verificada)** | **Não existe nenhum backup** — nenhum `pg_dump`, nenhum workflow, e o plano Free **não inclui backup automático** |

O achado está registrado em [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §2.8, com a
conclusão explícita: *"Documento de compliance não pode afirmar controle
inexistente."* A ação corretiva é binária: **ou o backup passa a existir, ou a
linha sai do RIPD**. A recomendação da avaliação foi criar o backup **e**
corrigir o texto — não apenas remover a linha.

---

## 2. O que está em jogo

| Ativo | Volume medido | Reconstruível? | Custo de reconstrução |
|---|---|---|---|
| Banco total | **98 MB** (limite Free: 500 MB) | — | — |
| `Person` | 594 | ✅ via ETL (Câmara/Senado/TSE) | horas |
| `Bill` | 31.815 (100%) | ✅ via ETL | horas |
| `BillAuthorship` | 50.479 (100%) | ✅ via ETL | horas |
| `SessionAttendance` | **166.825** — maior tabela, **53 MB** | ✅ via ETL de presenças | **lento** (a carga já foi interrompida uma vez por instabilidade do pooler) |
| `LegislativeAction` | 6.457 | ✅ via ETL | horas |
| `PoliticianCost` (CEAP) | 2.452 | ✅ via ETL | horas |
| `CampaignFinance` / `PatrimonyHistory` | 500 / 539 | ⚠️ parcialmente (fontes TSE mudam) | dias |
| `Score` | 594 | ✅ **derivado** — `npm run recalculate-scores` | minutos |
| **`ScoreSnapshot`** | **509** (série de set/2026 e out/2026) | ❌ **NÃO** — é a fotografia histórica da nota em cada mês. Recalcular hoje produz o valor de **hoje**, com a data de hoje | **irrecuperável** |
| `VerifiedClaim` | 13 | ⚠️ depende de feed de terceiros | — |
| `LegalRecord` | **0** | — | — |
| `User` / `UserBillVote` / `RetificationRequest` | **0** (base pré-lançamento) | ❌ **impossível** — dado do titular não se recria | **irrecuperável** |

**A perda mais grave não é a maior tabela — é a série de snapshots.** `Score` é
derivado e reconstruível, mas `ScoreSnapshot` é um registro datado que só existe
porque foi gravado naquele mês. Perder os snapshots significa perder a
capacidade de mostrar a evolução da nota — que é a promessa da seção
"Rastreamento Temporal" de `/metodologia`.

**E a partir do lançamento:** qualquer voto (`UserBillVote` = opinião política,
dado sensível) e qualquer solicitação de retificação (`RetificationRequest`) são
**instrinsicamente não reconstruíveis**. Sem backup, um `DELETE` os apaga para
sempre — e a LGPD exige capacidade de demonstrar o tratamento.

---

## 3. RPO e RTO

> ⚠️ **Nada disto foi medido.** Não há backup, logo não há RPO observado nem RTO
> observado. Os valores abaixo são **proposta de objetivo**, derivada do que a
> avaliação de alternativas recomenda (dump **semanal**) e da natureza dos dados.
> Tratá-los como promessa sem teste seria repetir o erro do RIPD §4.

| Objetivo | Valor proposto | Justificativa | Status |
|---|---|---|---|
| **RPO** (perda máxima aceitável) | **7 dias** | É o intervalo do dump semanal recomendado. Aceitável enquanto a base de usuários é ~0 e o dado público é reconstruível pela fonte | ❌ **não implementado** |
| **RPO para dado de usuário** (`UserBillVote`, `RetificationRequest`) | **24 h** *(alvo futuro)* | Uma vez que existam votos reais, perder 7 dias de opinião política manifestada é inaceitável — o titular registrou e o registro desapareceu | ❌ não implementado |
| **RTO** (tempo máximo para restaurar) | **não estimado** | Não foi feito nenhum `pg_restore`; o tempo de carga de 98 MB (53 MB só de `SessionAttendance`) em qualquer destino **não verificado** | ❌ **não verificado** |
| **Perda máxima de `ScoreSnapshot`** | **zero após a implementação** | Não é reconstruível (§2) — o backup precisa cobri-lo obrigatoriamente | ❌ |

**Regra:** RPO e RTO só podem ser declarados **depois** de um teste de
restauração cronometrado. Até lá, o campo correto é "não verificado".

---

## 4. Restrições que o desenho do backup precisa respeitar

Estas vêm das medições da avaliação de alternativas e do próprio projeto:

| # | Restrição | Por quê |
|---|---|---|
| 1 | **Nunca publicar o dump como artifact ou release do GitHub** | O repositório é **público** e o dump contém e-mails e votos (opinião política = dado sensível). Esta é a regra mais importante do documento |
| 2 | **Cifrar antes de subir** (`age`/`gpg`) e guardar a chave **fora do repositório** | Mesma razão; e a chave não pode estar no mesmo lugar que o dado |
| 3 | **Nunca usar `artifacts` do Actions como destino** | Artefatos de repositório público são acessíveis a quem tem leitura; e não há como garantir retenção |
| 4 | **O dump conta como egress do Supabase** | A cota Free é de **5 GB/mês unificada**. Com compressão, um dump de 98 MB cabe — **semanal é suficiente** e cabe no orçamento |
| 5 | **Não usar o pooler em transaction mode para o dump** | `pg_dump` precisa de sessão estável; usar a conexão direta (**5432**) |
| 6 | **O dump carrega o banco inteiro** | Inclui `User`/`UserBillVote`. O destino precisa ser privado **e cifrado** |
| 7 | **Storage privado, com política de retenção explícita** | Cloudflare R2 ou Backblaze B2: a faixa gratuita de **10 GB** é suficiente para os ~98 MB atuais |
| 8 | **Não fazer o dump competir com o ETL** | A carga de `data/raw/` também consome egress e conexões. Agendar em janela distinta (o snapshot mensal já roda dia 1 às 03:00 UTC) |

---

## 5. Desenho proposto

**Formato:** `pg_dump` em **formato custom comprimido** (`-Fc`) — permite
`pg_restore` seletivo por tabela, o que é útil para recuperar apenas
`ScoreSnapshot` ou apenas as tabelas de usuário.

**Destino:** bucket privado (Cloudflare R2 ou Backblaze B2), caminho
`curriculo-politico/<AAAA-MM-DD>/dump.dump.age`.

**Retenção:** **4 semanais + 1 mensal** (recomendação da avaliação, §4).

**Esqueleto do workflow** (`.github/workflows/backup.yml`) — a criar:

```yaml
name: Backup semanal (pg_dump cifrado)

on:
  schedule:
    - cron: '0 4 * * 0'      # domingo, 04:00 UTC — longe do snapshot mensal (dia 1, 03:00)
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # ⚠️ DIRECT_URL (5432), NÃO o pooler 6543: pg_dump exige sessão estável.
      - name: Dump cifrado
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          AGE_PUBLIC_KEY: ${{ secrets.AGE_PUBLIC_KEY }}
        run: |
          set -euo pipefail
          STAMP=$(date -u +%Y-%m-%d)
          pg_dump "$DIRECT_URL" -Fc -Z 9 -f "dump-$STAMP.dump"
          # cifra ANTES de sair do runner; a chave privada nunca entra aqui
          age -r "$AGE_PUBLIC_KEY" -o "dump-$STAMP.dump.age" "dump-$STAMP.dump"
          rm -f "dump-$STAMP.dump"           # nunca deixe o texto claro no runner
          ls -lh "dump-$STAMP.dump.age"

      # ⚠️ NUNCA usar actions/upload-artifact: repositório é PÚBLICO.
      - name: Enviar para storage privado
        env:
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET: ${{ secrets.R2_BUCKET }}
        run: |
          set -euo pipefail
          # aws s3 cp com endpoint R2 (ou rclone/wrangler)
          aws s3 cp "dump-$(date -u +%Y-%m-%d).dump.age" \
            "s3://$R2_BUCKET/curriculo-politico/$(date -u +%Y-%m-%d)/dump.dump.age" \
            --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"

      - name: Falhar se o arquivo não subiu
        run: echo "verificação de existência no bucket (list-objects)"
```

**Variáveis novas necessárias:** `DIRECT_URL` como **secret do Actions** (hoje
só `DATABASE_URL` está lá, usado pelo `monthly-snapshot.yml` L31), `AGE_PUBLIC_KEY`,
e as credenciais do storage. **Não** usar a `DATABASE_URL` do pooler.

---

## 6. Teste de restauração — obrigatório, e ainda não feito

> *"Testar restauração pelo menos uma vez (`pg_restore` em banco local) —
> backup não testado não é backup."* — [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §4

Procedimento a executar e **registrar aqui com data, resultado e tempo medido**:

```bash
# 1. Baixar o dump mais recente do bucket privado (para máquina local, nunca para o runner)
# 2. Decifrar
age -d -i ~/.age/key.txt -o dump.dump dump.dump.age

# 3. Subir um Postgres limpo e descartável
docker compose up -d db

# 4. Restaurar e CRONOMETRAR (é este número que define o RTO)
time pg_restore -d "postgresql://postgres:radar_civico@localhost:15432/curriculo_restore" \
  --no-owner --no-privileges --clean --if-exists dump.dump

# 5. Verificar integridade — compare com os números conhecidos
#    Person=594 · Bill=31815 · BillAuthorship=50479 · SessionAttendance=166825
#    LegislativeAction=6457 · PoliticianCost=2452 · CampaignFinance=500
#    PatrimonyHistory=539 · Score=594 · ScoreSnapshot=509 (set+out/2026)
#    LegalRecord=0 · User=0 · UserBillVote=0
# 6. Verificar a aplicação contra o banco restaurado:
#    DATABASE_URL=<restore local> npm run dev  → conferir /ranking e /politicos/[id]
# 7. Registrar: data, tamanho do dump, tempo de restore, divergências encontradas
```

**Enquanto este teste não for executado, o campo RTO deste documento permanece
"não verificado"** — e a afirmação "temos backup" continua sendo uma hipótese.

**Teste trimestral:** agendar na agenda do operador. Não basta fazer uma vez: o
formato do banco muda com as migrations, e um dump que não restaura é pior que
nenhum, porque cria confiança falsa.

---

## 7. Plano de recuperação de desastre

### 7.1 Cenários

| Cenário | Perda | Recuperação | Tempo |
|---|---|---|---|
| **D1 — Deploy quebrado** | Nenhuma | Rollback: promover o deployment anterior na Vercel | minutos |
| **D2 — `DELETE`/`UPDATE` indevido por script** | Parcial | Restaurar do dump em banco novo e reaplicar as mudanças legítimas; ou re-rodar o ETL (idempotente) para dados públicos | horas–dias |
| **D3 — Corrupção/perda do banco no Supabase** | Total desde o último dump | `pg_restore` no destino novo (RTO **não verificado**) | dias |
| **D4 — Projeto Supabase suspenso/excluído** | Total | Recriar projeto, aplicar migrations (`DIRECT_URL`) e restaurar do dump | dias |
| **D5 — Vazamento de credencial com escrita** | Indeterminada | Rotacionar credenciais **primeiro** ([`../05-security-compliance/INCIDENT_RESPONSE.md`](../05-security-compliance/INCIDENT_RESPONSE.md) §5.1), depois restaurar/auditar | dias |
| **D6 — Estouro de cota no Hobby** | Nenhuma (dados íntegros) | Não há pay-as-you-go: **aguardar o ciclo (até 30 dias)** ou migrar de plano | até 30 dias |

### 7.2 Ordem de recuperação (D3/D4)

1. **Conter** — se houver suspeita de acesso indevido, rotacionar credenciais **antes** de restaurar.
2. **Projetar o destino** — novo projeto Supabase, região **`sa-east-1`** (residência no Brasil; coerente com o RIPD).
3. **Aplicar o schema** — `npx prisma migrate deploy` com `DIRECT_URL` (porta **5432**). Migrations **não** rodam em transaction mode.
4. **Restaurar os dados** — `pg_restore` do dump mais recente. **Cuidado com a ordem:** se o dump for anterior a uma migration, restaurar dados antes de aplicar a migration correspondente pode falhar ou corromper. A regra prática é: restaurar no schema da época do dump e depois aplicar as migrations seguintes.
5. **Reparar a lacuna** — re-rodar o ETL (idempotente) para os dados públicos posteriores ao dump; recalcular scores (`npm run recalculate-scores`).
6. **Redeployar** — atualizar `DATABASE_URL`/`DIRECT_URL` na Vercel → redeploy.
7. **Validar** — `production-smoke.yml` manual + conferir os números da §6.
8. **Registrar** — post-mortem conforme `INCIDENT_RESPONSE.md` §8.

### 7.3 O que **não** é recuperável, em nenhum cenário

- `ScoreSnapshot` de meses anteriores ao dump mais antigo.
- `UserBillVote` e `RetificationRequest` criados depois do último dump.
- A **linha do tempo** de consentimento (`politicalConsentAt`/`WithdrawnAt`) se o
  dump for anterior — o que tem implicação de conformidade, não só de dados.

---

## 8. Conformidade e comunicação

| Obrigação | Estado |
|---|---|
| LGPD Art. 46 (medidas de segurança, incluindo capacidade de restaurar) | ⚠️ **Não atendida** hoje — não há backup |
| RIPD §4 afirma "backups Supabase" | ❌ **Afirmação incorreta** — corrigir ou implementar |
| Comunicação de incidente de destruição de dados (Art. 48) | Sem backup, um `DELETE` é incidente **irrecuperável** — a comunicação à ANPD não teria remédio a oferecer |
| Retenção do próprio dump | Definir: **4 semanais + 1 mensal**; documentar a data de expurgo |
| Registro das operações de tratamento (Art. 37) | O dump é uma **nova cópia** de dado pessoal com finalidade própria (recuperação) — deve constar no registro de operações e na Política de Privacidade |

---

## 9. Checklist de implementação

| # | Ação | Esforço | Estado |
|---|---|---|---|
| 1 | Criar bucket **privado** (R2 ou B2) com credenciais dedicadas | 30 min | ❌ |
| 2 | Gerar par de chaves `age`; **chave privada fora do GitHub** (guardada offline) | 15 min | ❌ |
| 3 | Adicionar secrets: `DIRECT_URL`, `AGE_PUBLIC_KEY`, credenciais do storage | 15 min | ❌ |
| 4 | Criar `.github/workflows/backup.yml` (§5), **sem `upload-artifact`** | 1 h | ❌ |
| 5 | Rodar manualmente (`workflow_dispatch`) e confirmar que o objeto existe no bucket | 15 min | ❌ |
| 6 | **Executar o teste de restauração (§6) e registrar o tempo** | 1–2 h | ❌ |
| 7 | Preencher RPO/RTO reais neste documento | 15 min | ❌ |
| 8 | **Corrigir a linha de backup no RIPD §4** | 15 min | ❌ |
| 9 | Registrar o dump como operação de tratamento (RIPD + Política) | 30 min | ❌ |
| 10 | Alerta se o backup não rodar (heartbeat) | 30 min | ❌ |
| 11 | Agendar teste trimestral de restauração | 5 min | ❌ |
| 12 | Definir e documentar a política de expurgo dos dumps antigos | 15 min | ❌ |

**Prioridade:** itens 1–4 e 8 podem ser feitos em **uma sessão**. Os itens 6 e 7
são o que transforma "temos um arquivo" em "temos backup".

---

## 10. Referências no repositório

- [`AVALIACAO_ALTERNATIVAS.md`](./AVALIACAO_ALTERNATIVAS.md) §2.2 (egress), §2.5 (volume e contagens), **§2.8 (o achado do backup)**, §4 (Frente B — recomendação), §5.1 (limites do Hobby)
- [`AUDITORIA_PRODUCAO.md`](./AUDITORIA_PRODUCAO.md) §0.1 (contagens de 2026-10-12) e §0.3 (datação canônica do snapshot)
- [`../05-security-compliance/RIPD.md`](../05-security-compliance/RIPD.md) §4 — a linha a corrigir
- [`../05-security-compliance/INCIDENT_RESPONSE.md`](../05-security-compliance/INCIDENT_RESPONSE.md) §5 — rotação antes de restaurar
- [`../05-security-compliance/THREAT_MODELING.md`](../05-security-compliance/THREAT_MODELING.md) D5 — backup ausente como ameaça
- [`CI_CD_PIPELINE.md`](./CI_CD_PIPELINE.md) — formato dos workflows existentes
