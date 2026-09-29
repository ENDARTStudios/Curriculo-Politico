# Preview Deployments

## Como Funciona
Cada PR aberto automaticamente recebe uma URL única de preview da Vercel.
O Vercel detecta o push para qualquer branch não-main e cria um deployment
isolado com as mesmas env vars de Preview.

## Acessar
1. Abra o PR no GitHub
2. Vercel bot comenta com a URL de preview
3. Valide as mudanças antes do merge

## Limitações
- Preview usa envs de Preview (não Production)
- DATABASE_URL de preview deve apontar para um banco de staging (ou o mesmo, com cuidado)
