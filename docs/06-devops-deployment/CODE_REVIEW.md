# Code Review

## Checklist do Revisor
- [ ] `tsc --noEmit` zerado?
- [ ] Testes de scoring/identity passando?
- [ ] LGPD: nenhum dado sensível adicionado?
- [ ] Neutralidade: nenhuma mudança introduz viés no IDIP?
- [ ] Idempotência: loads podem reexecutar?
- [ ] Dark theme: componente segue STYLE_GUIDE?
- [ ] Fonte oficial linkada em dados novos?
- [ ] Versionamento: mudança de fórmula do IDIP tem bump?

## Processo
1. PR aberto com descrição clara
2. CI roda automaticamente (typecheck + testes + build)
3. Revisão humana (se houver múltiplos contribuidores)
4. Squash merge para main
5. Deploy automático Vercel
