# SEO

## Implementado
- Metadata export em 18 páginas (title + description)
- Semantic HTML (header, main, section, table)
- URLs semânticas
- Links internos cruzados

## Pendente (prioritário p/ lançamento)
- [ ] app/sitemap.ts (598 perfis = 598 URLs indexáveis)
- [ ] app/robots.ts
- [ ] JSON-LD Person schema nos perfis
- [ ] Open Graph images
- [ ] Canonical URLs (www vs apex)

## Sitemap Dinâmico (proposta)
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const pessoas = await prisma.person.findMany({ select: { id: true } });
  return pessoas.map(p => ({ url: `/politicos/${p.id}` }));
}
```
