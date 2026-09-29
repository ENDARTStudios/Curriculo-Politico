# Constituição — Currículo Político

## Princípios Inegociáveis

1. **Neutralidade Algorítmica** — O IDIP nunca incorpora opinião popular,
   ideologia ou julgamento de conteúdo. Apenas dados públicos oficiais.

2. **Auditoria Total** — Cada nota tem breakdown, cada registro tem link
   para a fonte oficial, cada score tem `retrievedAt`.

3. **Linguagem Jurídica Estrita** — "Réu em Ação Penal", nunca "criminoso"
   sem trânsito em julgado. Presunção de inocência é inegociável.

4. **LGPD** — Minimização agressiva. Nenhum CPF, endereço, telefone,
   dados de familiares ou dados sensíveis.

5. **Versionamento** — Mudança de fórmula = bump de versão + atualização
   de /metodologia + testes atualizados. Nunca reescrita silenciosa.

6. **Open Source** — Todo o código, dados e metodologia são públicos
   (AGPL-3.0 código, CC BY 4.0 docs).

##_stack
- Next.js 15 (App Router) + TypeScript strict + TailwindCSS
- PostgreSQL (Supabase) via Prisma
- Python ETLs (Câmara, Senado, TSE via curl_cffi)
- Vercel (deploy) + Supabase (banco) + GitHub Actions (CI/cron)
