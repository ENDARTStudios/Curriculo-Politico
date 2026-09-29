# Processo de Desenvolvimento

## Fluxo de Trabalho

1. **Issue** → descreve o problema/feature com contexto
2. **Branch** → `feat/descricao` ou `fix/descricao` a partir de `main`
3. **Implementação** → código + testes + docs
4. **Validação local** → `npx tsc --noEmit && npm run build`
5. **PR** → para `main`, com descrição clara
6. **CI** → GitHub Actions roda typecheck + testes + build
7. **Merge** → squash para manter histórico limpo
8. **Deploy** → Vercel detecta push para `main` e deploya automaticamente

## Convenções de Commit
```
feat: adiciona funcionalidade
fix: corrige bug
docs: documentação
refactor: refatoração sem mudança comportamental
perf: melhoria de performance
test: testes
chore: manutenção (deps, config)
```

## Regras de Ouro
1. **TypeScript estrito** — `tsc --noEmit` zerado é obrigatório
2. **Testes primeiro** — mudanças em scoring/identity exigem casos em verify-*.ts
3. **Fontes oficiais** — todo dado novo precisa de ETL com sourceUrl
4. **LGPD** — nunca adicione CPF, endereço, telefone ou dados sensíveis
5. **Neutralidade** — nenhum código pode introduzir viés ideológico no IDIP
6. **Versionamento** — mudanças de fórmula do IDIP exigem bump de versão
7. **Dark theme** — todos os componentes seguem o STYLE_GUIDE.md
