---
name: curriculo-hero
description: Padrão de construção da home/hero e de seções de topo do Currículo Político — estrutura de funil, busca de números reais, componente de prova social e layout editorial responsivo.
whenToUse: Ao criar ou refatorar a home, a hero, ou qualquer seção de topo de página (landing) em apps/web.
metadata:
  version: "1.0"
  arquivos: >-
    apps/web/src/app/page.tsx, apps/web/src/components/HeroStats.tsx,
    apps/web/src/lib/hero-stats.ts, apps/web/src/lib/methodology.ts,
    apps/web/src/lib/status-visual.ts
---

# Padrão da Home / Hero

## Estrutura obrigatória (mapeada ao funil)

A home é uma sequência de funil. A ordem não é estética, é argumentativa:

| # | Seção | Estágio | Conteúdo |
|---|---|---|---|
| 1 | Eyebrow | Dor | Linha curta com a dor do eleitor (`text-xs uppercase tracking-wider`) |
| 2 | H1 | Gancho | Gancho de marca, o maior elemento da página |
| 3 | Sub | Promessa | O que é + como funciona, em 1–2 frases |
| 4 | CTA | Ação | **1 primário** (Ver Ranking) + secundários agrupados com peso menor |
| 5 | Selo de método | Prova | Versão da metodologia + código aberto, em `text-xs` |
| 6 | Prova | Prova | Faixa de números reais do banco (`HeroStats`) |
| 7 | Termômetro | Promessa + Prova | Os 4 estados, com link para metodologia |
| 8 | Metodologia | Prova | Pesos reais, derivados de `@/lib/methodology` |
| 9 | Fecho | CTA | Repetir o CTA depois da prova |

A busca **não** fica na hero: o `layout.tsx` já a renderiza no header (desktop e
mobile). Duplicá-la coloca dois controles idênticos competindo na mesma tela e
viola a regra de uma ação primária por região.

Fora do funil principal (empurrar para o rodapé ou remover): bastidor interno
("MVP", "fase"), documentação de API, listas de features sem prova.

## Regras de layout

- Hero: `relative overflow-hidden border-b border-slate-800 bg-slate-950`.
- Fundo decorativo, quando houver: `pointer-events-none absolute inset-0` com
  `aria-hidden`, sempre **atrás** do conteúdo (`z-0` no fundo, `relative z-10` no
  conteúdo) e com `motion-safe:` se animar.
- Container: `mx-auto max-w-6xl px-6 py-16 sm:py-24`.
- Título: `text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight`.
- Nunca centralize tudo: títulos centralizados + CTA + prova em grid funciona,
  mas o corpo de texto longo deve ser `max-w-3xl` alinhado à esquerda.
- Não use `<br />` para forçar quebra de linha em texto responsivo: use blocos ou
  `<span className="block">`, senão quebra feio no mobile.

## Números reais (prova)

A separação é deliberada: **acesso a banco** em `src/lib/hero-stats.ts`
(`carregarNumerosHero()`), **apresentação** em `src/components/HeroStats.tsx`,
que recebe `numeros` como prop e não conhece o Prisma. Isso mantém a árvore de
renderização livre de I/O e torna o componente trivial de revisar visualmente.

Regras do carregador:

- Use `Promise.all` para paralelizar as contagens.
- Envolva em `try/catch` e retorne `null` em falha: a home **nunca** pode
  quebrar por causa da faixa de prova.
- Conte com `count()`/`groupBy()`, nunca carregando linhas só para contar no
  JavaScript.
- **"Avaliado" significa ter nota calculada**, não estar cadastrado. Exibir o
  total de pessoas cadastradas infla o número e é propaganda enganosa — foi por
  isso que a definição virou `prisma.score.groupBy({ by: ["termId"] })`.

Regras do componente:

- `if (!numeros || numeros.politicosAvaliados === 0) return null;`
  Uma faixa de prova vazia ("0 políticos avaliados") é pior do que faixa
  nenhuma: troca credibilidade por confissão de incapacidade.
- `export const dynamic = "force-dynamic"` na página (convenção de todas as
  rotas com dados, ver `ranking/page.tsx`). Sem isso o `next build` tentaria
  prerenderizar e exigiria banco acessível durante o build.

Formatação: `new Intl.NumberFormat("pt-BR").format(n)`.
Números: `font-mono tabular-nums`; rótulo: `text-xs uppercase tracking-wider`.

## Metodologia exibida

Nunca redigite os pesos na UI. Leia de `@/lib/methodology`, que é a projeção de
leitura de `WEIGHTS` do motor:

```tsx
import {
  DIMENSOES_LEGISLATIVO,
  DIMENSOES_EXECUTIVO,
  METODOLOGIA_VERSAO,
} from "@/lib/methodology";
```

`@cp/idip` publica apenas TypeScript não compilado, então importá-lo direto no
build do Next exigiria `transpilePackages` — configuração que evitamos às
vésperas de deploy só para renderizar quatro números. O risco dessa indireção é
fechado pelo teste **WEB-001** em `apps/pipeline/scripts/verify-scoring.ts`, que
compara cada peso exibido com o motor e quebra o CI se algo divergir. Ao mudar a
fórmula: edite `scoring.ts` primeiro, depois `@/lib/methodology`, e rode
`npm run verify:scoring` até passar.

## Checklist antes de finalizar

- [ ] Eyebrow (dor) → H1 (gancho) → sub (promessa) → CTA → prova, nesta ordem
- [ ] Exatamente 1 CTA primário
- [ ] Números vêm do banco, com fallback que **não** renderiza a faixa
- [ ] Pesos lidos de `@/lib/methodology`; `npm run verify:scoring` passa
- [ ] Sem `br` frágil; sem bastidor interno na hero
- [ ] Contraste AA; navegável por teclado; foco visível
- [ ] Sem overflow horizontal em 320 / 390 / 768 / 1280 / 1440px
- [ ] `npm run typecheck` e `npm run build` limpos
