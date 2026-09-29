# Contribuindo com o Currículo Político

Obrigado pelo interesse! O projeto é 100% open source (AGPL-3.0) e existe
graças a contribuições voluntárias.

## Como contribuir

### 1. Reportando dados incorretos
- Abra uma **issue** descrevendo o dado, a fonte oficial correta e o link.
- Se você é o político afetado, use também o canal `/retificacao` do site.
- Toda correção passa pela fonte oficial — nunca editamos dados manualmente.

### 2. Contribuindo com código
```bash
git clone https://github.com/ENDARTStudios/Curriculo-Politico.git
cd Curriculo-Politico
npm install
cp .env.example .env          # ajuste DATABASE_URL
docker compose up -d          # Postgres 15432 + Redis 16379
npx prisma migrate deploy
npm run dev
```

Antes de abrir o PR:
```bash
npx tsc --noEmit              # zero erros
npm run verify:scoring        # motor IDIP
npm run verify:identity       # motor de identidade
npm run build                 # build limpo
```

### 3. Regras do projeto

- **Neutralidade algorítmica:** nenhuma contribuição pode introduzir
  julgamento ideológico no IDIP. A nota mede atividade, integridade e
  transparência — nunca o conteúdo das votações.
- **Linguagem jurídica estrita:** "Réu em Ação Penal", nunca "criminoso" sem
  trânsito em julgado (ver `05-security-compliance/SECURITY_BASELINE.md`).
- **Fontes oficiais apenas:** todo dado novo precisa de ETL com URL da fonte
  e `retrievedAt`.
- **LGPD:** nunca adicione CPF, endereço, telefone ou dados de familiares.
- **Versionamento do IDIP:** qualquer mudança de fórmula exige bump de versão
  (`Score.version`) e atualização de `/metodologia` + `verify-scoring.ts`.
- **Testes primeiro:** mudanças em `src/lib/scoring.ts` ou
  `src/lib/identity.ts` exigem casos novos em `scripts/verify-*.ts`.

### 4. Estrutura do repositório

```
├── 01-product-discovery/     PRD, roadmap, termos
├── 02-architecture-design/   arquitetura, IDIP, data model, STF, partidos
├── 05-security-compliance/   baseline de segurança/LGPD
├── 06-devops-deployment/     cron de snapshots
├── etl/                      coletores Python (Câmara, Senado, TSE)
├── prisma/                   schema + migrations
├── scripts/                  loads, recálculos, seeds
└── src/                      Next.js (App Router) + libs de scoring/identidade
```

### 5. Estilo
- TypeScript estrito (`tsc --noEmit` zerado é obrigatório).
- Commit em português, imperativo: `feat: adiciona X`, `fix: corrige Y`.
- UI dark, acessível, sem frases opinativas.

## Código de Conduta
Tratamento respeitoso com todos — inclusive com os políticos avaliados: o
projeto critica fatos, nunca pessoas.
