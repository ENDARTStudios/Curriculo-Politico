# Regras do Projeto

## Regras de Código
1. TypeScript strict — `tsc --noEmit` zerado é obrigatório
2. Server Components por padrão — `'use client'` só quando necessário
3. Sem `any` — usar tipos explícitos do Prisma ou interfaces
4. Erros tratados — toda rota API tem try/catch com mensagem JSON clara
5. Force-dynamic em páginas de dados — nunca prerender dados que mudam

## Regras de Dados
1. **Fonte oficial sempre** — cada dado tem `sourceUrl` e `retrievedAt`
2. **LGPD** — nunca adicionar CPF, endereço, telefone, dados sensíveis
3. **Linguagem jurídica estrita** — "Réu em Ação Penal", nunca "criminoso"
4. **Idempotência** — todos os loads podem rodar múltiplas vezes
5. **Neutralidade** — nenhum código introduz viés ideológico no IDIP

## Regras de Negócio
1. **IDIP versionado** — mudança de fórmula = bump de versão + atualizar /metodologia
2. **GRAY fora do ranking** — confiança < 60% = sem posição
3. **Travas de integridade** — condenação TJ/contas rejeitadas = nota 39.9
4. **Voto popular ≠ IDIP** — engajamento pessoal nunca altera a nota factual
5. **Seeds excluídos do recálculo** — fixtures didáticas preservadas

## Regras de Segurança
1. **Nunca versionar `.env`** — apenas `.env.example`
2. **Rate limit** — 60 req/min em /api/* (middleware)
3. **CSP** — Content-Security-Policy em todas as respostas
4. **bcrypt** — senhas hasheadas, nunca em texto plano
5. **Anti-bot** — conta com menos de 24h não vota
