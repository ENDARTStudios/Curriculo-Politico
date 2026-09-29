# Design e Experiência do Usuário

## Princípios de Design

1. **Dados primeiro, opinião nunca** — cada elemento visual deriva de um dado
   público com link para a fonte. O design não editorializa.
2. **Honestidade visual** — dados insuficientes são atenuados, não escondidos.
   GRAY aparece com opacity-60 e sem posição numerada.
3. **Auditabilidade visível** — cada nota tem breakdown, cada registro tem
   link da fonte, cada página de dados mostra `retrievedAt`.
4. **Mobile-first** — todas as tabelas têm overflow-x-auto, grid responsivo
   com breakpoints sm/md/lg.

## Fluxo do Usuário

```
Home (slogan + atalhos)
  ├─→ /ranking (lista ordenada com termômetro)
  │     └─→ /politicos/[id] (dashboard completo)
  │           ├─→ Nota + breakdown
  │           ├─→ Custo para o Estado
  │           ├─→ Votos em plenário
  │           ├─→ Proposições autorais
  │           ├─→ Presença em sessões
  │           ├─→ Evolução patrimonial
  │           ├─→ Timeline de snapshots
  │           └─→ Registros jurídicos
  ├─→ /partidos (agregação por sigla)
  │     └─→ /partidos/[sigla] (membros + gráficos)
  ├─→ /comparar (2–3 políticos lado a lado)
  ├─→ /projetos (busca + filtro por tipo/ano)
  │     └─→ /projetos/[id] (detalhe + votação popular)
  ├─→ /historia (ranking educacional por era)
  └─→ Páginas institucionais (/sobre, /metodologia, /termos, /privacidade, /lgpd, /cookies, /retificacao, /contato, /status)
```

## Acessibilidade
- Contraste mínimo WCAG AA (slate-100 sobre slate-950 = 15:1)
- Sem cor como único indicador (termômetro tem emoji + texto)
- Focus states visíveis (focus:border-sky-500 em todos os inputs)
- Labels associados a inputs (`htmlFor`)

## Performance
- Server Components (zero JS no client para dados)
- `unoptimized` em imagens remotas (sem pipeline de otimização)
- Static generation para páginas institucionais
- Force-dynamic para páginas de dados
