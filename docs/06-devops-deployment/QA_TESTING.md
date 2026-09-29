# QA Testing

## Checklist de QA antes de cada release

### Funcional
- [ ] Home carrega (200)
- [ ] /ranking exibe políticos ranqueados
- [ ] /politicos/[id] exibe nota + custo + votos + autorias + presença
- [ ] /projetos lista com paginação + busca
- [ ] /comparar seleciona 2-3 e exibe cards
- [ ] Busca global encontra em 4 categorias
- [ ] Login + logout funcionam
- [ ] Votação popular registra (conta > 24h)

### Dados
- [ ] 594 parlamentares no banco
- [ ] 556 com tseId
- [ ] 507 ranqueados (YELLOW)
- [ ] CEAP real em 520 deputados
- [ ] PatrimonyHistory em 539 políticos
- [ ] Snapshots: 370+

### Segurança
- [ ] Rate limit: 429 após 60 req/min
- [ ] CSP headers presentes
- [ ] Dados judiciais arquivados ocultos (LGPD)
- [ ] Sem dados sensíveis expostos

### Performance
- [ ] Build sem erros TypeScript
- [ ] First Load JS < 200KB
- [ ] Páginas estáticas pré-renderizadas
