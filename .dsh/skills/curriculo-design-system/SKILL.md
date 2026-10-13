---
name: curriculo-design-system
description: Sistema de design do Currículo Político — tokens, cores semânticas do Termômetro, tipografia, espaçamento, componentes e regras de acessibilidade. Use ao criar ou alterar qualquer interface do apps/web.
whenToUse: Antes de escrever ou revisar qualquer componente, página, layout ou estilo em apps/web. Também ao escolher cores, tipografia, espaçamento, sombras ou estados de foco.
metadata:
  version: "1.0"
  stack: Next.js 15 App Router + Tailwind CSS v4
---

# Sistema de Design — Currículo Político

Estética-alvo: **dados/editorial sério**. A plataforma audita poder público; a UI
deve parecer um instrumento de medição confiável, não uma campanha. Cada decisão
visual serve à credibilidade da informação.

## 1. Princípios

1. **O dado é o herói.** Números, notas e status dominam a hierarquia visual. Nada
   decorativo compete com um valor.
2. **Escala editorial.** Títulos grandes e apertados (`tracking-tight`), muito
   contraste entre título e corpo, corpo com `leading-relaxed`.
3. **Cor = significado.** Cor nunca é enfeite: ela carrega estado (confiável,
   atenção, risco, insuficiente). Não use verde/âmbar/vermelho sem que o estado
   semântico corresponda.
4. **Neutralidade algorítmica é visual.** A interface nunca sugere que a votação
   popular altera a nota. Camadas de engajamento são visualmente distintas do IDIP.
5. **Rigor jurídico na linguagem.** Só "Réu em Ação Penal" e "Condenação
   Transitada em Julgado". Nunca "crime" sem trânsito em julgado. Isso vale para
   labels, badges, tooltips e microcopy.

## 2. Cores semânticas do Termômetro

Fonte de verdade dos estados: `enum ReliabilityStatus` em
`apps/web/prisma/schema.prisma` → `GREEN | YELLOW | RED | GRAY`.

| Estado | Leitura | Texto | Borda/Fundo | Uso |
|---|---|---|---|---|
| `GREEN` | Confiável | `text-emerald-400` | `border-emerald-500/40 bg-emerald-500/10` | Dados completos, sem impedimentos |
| `YELLOW` | Atenção / Risco | `text-amber-400` | `border-amber-500/40 bg-amber-500/10` | Dados incompletos, réu em ação penal |
| `RED` | Não Confiável | `text-red-400` | `border-red-500/40 bg-red-500/10` | Trava de integridade ativa |
| `GRAY` | Dados Insuficientes | `text-slate-400` | `border-slate-500/40 bg-slate-500/10` | Confiança < 60, fora do ranking |

Nunca use azul/roxo para representar estado de confiabilidade.

## 3. Superfícies e texto

Base é dark (`bg-slate-950` no `<body>`, definido em `layout.tsx`).

| Papel | Classe |
|---|---|
| Fundo da página | `bg-slate-950` |
| Card / painel | `border border-slate-800 bg-slate-900/60` |
| Card elevado | `border border-slate-800 bg-slate-900` |
| Texto primário | `text-slate-100` |
| Texto secundário | `text-slate-300` |
| Texto de apoio / metadado | `text-slate-400` |
| Texto discreto / rodapé | `text-slate-500` |
| Acento de marca | `sky-400` / `sky-500` |
| Apoio ao projeto | `violet-400` (`/apoie` usa 💜) |

## 4. Tipografia

- Sem fonte customizada: use a stack padrão do Next.js. Não introduza webfont sem
  aprovação explícita (impacto em LCP).
- Escala usada no projeto:
  - Display (hero): `text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight`
  - H1 de página: `text-3xl sm:text-4xl font-bold tracking-tight`
  - H2 de seção: `text-2xl font-semibold`
  - H3 de card: `font-semibold`
  - Corpo: `text-base leading-relaxed`
  - Apoio: `text-sm text-slate-400`
  - Metadado/label: `text-xs uppercase tracking-wider text-slate-500`
- Números que precisam alinhar em colunas: `font-mono tabular-nums`.
- Números-âncora (prova social): `text-3xl sm:text-4xl font-bold` + rótulo
  `text-xs uppercase tracking-wider`.

## 5. Espaçamento, raio e grid

- Container de conteúdo: `mx-auto max-w-6xl px-6` (o header usa `max-w-6xl`).
- Container de leitura estreita (texto longo): `max-w-3xl`.
- Ritmo vertical de seção: `py-16` a `py-20`; entre seções internas `py-10`.
- Grid de cards: `grid gap-4 sm:grid-cols-2` ou `gap-6 lg:grid-cols-3`.
- Raios: `rounded-lg` (botão/input), `rounded-xl` (card), `rounded-full` (pill/badge).
- Nunca use `rounded-2xl`+ com sombras pesadas: quebra o tom institucional.

## 6. Botões e links

| Tipo | Classe |
|---|---|
| Primário (ação principal) | `bg-sky-500 text-slate-950 hover:bg-sky-400 font-semibold px-6 py-3 rounded-lg transition` |
| Secundário (sobre fundo colorido) | `border border-white/30 bg-white/10 text-white hover:bg-white/20 px-4 py-2 rounded-lg` |
| Terciário / ghost | `border border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white` |
| Link de texto | `text-sky-400 hover:text-sky-300` |

**O texto do botão primário é `text-slate-950`, nunca `text-white`.** Medido:
`text-slate-950` sobre `bg-sky-500` = **7.45:1** (AA folgado). Já `text-white`
sobre `bg-sky-500` = **2.71:1** e reprova feio — foi exatamente o defeito do CTA
da home. Se algum dia precisar de texto branco sobre azul, o fundo tem de ser
`sky-700` ou mais escuro (branco sobre `sky-700` = 5.86:1); `sky-600` dá 4.02:1 e
serve só para texto grande.

Regra: **um único CTA primário por seção.** Vários botões com o mesmo peso
visual destroem a hierarquia — foi o defeito central da hero original, que
apresentava 7 links idênticos.

## 7. Acessibilidade (obrigatório)

- Todo `<a>`/`<Link>` que envolva apenas ícone precisa de `aria-label`.
- Imagens decorativas: `alt=""`. Fotos de políticos: `alt=""` apenas quando o
  nome já aparece ao lado como texto; caso contrário, `alt={nome}`.
- Contraste mínimo AA: texto normal ≥ 4.5:1, texto grande ≥ 3:1.
- **`text-slate-500` é proibido para texto.** Medido: **4.23:1** sobre `slate-950`
  e **3.74:1** sobre `slate-900` — reprova em AA para texto normal. Era usado em
  167 lugares do app; todos foram corrigidos para `text-slate-400` (7.66:1 e
  6.78:1). Use `slate-500` apenas para ícones/bordas decorativas, nunca para
  conteúdo que a pessoa precisa ler.
  - Pisos medidos (script `.design-review/contraste.cjs`): sobre `slate-950`,
    `slate-400` = 7.66:1 é o **piso seguro**; `slate-300` = 13.56:1; `sky-400` =
    9.25:1. Sobre `slate-900`, `slate-400` = 6.78:1.
- O detector (`npx impeccable detect <alvo>`) aplica exatamente esse limite e
  reprova com exit 2. Rode-o antes de considerar uma UI pronta.
- Foco visível: não remova outlines. Se precisar customizar, use
  `focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`.
- Navegação por teclado: qualquer coisa clicável deve ser `<a>`, `<button>` ou `<Link>`. Nunca `onClick` em `<div>`.
- `prefers-reduced-motion`: animações devem ser envolvidas por
  `motion-safe:` ou `motion-reduce:animate-none`.
- Hierarquia de headings: um `h1` por página, sem pular níveis.

## 8. Performance e imagens

- `next/image` sempre, com `width`/`height` explícitos.
- Fotos de políticos vêm de domínios externos e usam `unoptimized` (padrão atual
  em `ranking/page.tsx`) — mantenha a consistência.
- A home usa `export const dynamic = "force-dynamic"` apenas quando depende de
  dados que mudam; caso contrário prefira o padrão com `revalidate`.
- Não adicione bibliotecas de animação (framer-motion etc.) sem necessidade
  comprovada: CSS + Tailwind resolvem.

## 9. Checklist antes de considerar uma UI pronta

- [ ] Um CTA primário claro; ações secundárias com peso menor
- [ ] Cores de estado coerentes com `ReliabilityStatus`
- [ ] Contraste AA verificado em texto de apoio
- [ ] `aria-label`/`alt` corretos; navegável por teclado
- [ ] Responsivo em 375px, 768px e 1280px sem overflow horizontal
- [ ] Linguagem jurídica estrita respeitada
- [ ] `npm run typecheck` e `npm run build` passam
