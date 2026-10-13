---
name: curriculo-design-review
description: Protocolo de revisão de UI-UX do Currículo Político — como auditar hierarquia visual, conversão, responsividade, acessibilidade e honestidade de dados antes de considerar uma interface pronta.
whenToUse: Ao revisar uma interface já implementada em apps/web, ao julgar um redesign, ou ao verificar se a home/hero cumpre o funil de marketing.
metadata:
  version: "1.0"
  ordem: hierarquia, conversao, responsivo, acessibilidade, dados, tecnica
---

# Protocolo de Revisão de UI-UX

Revisão é auditoria, não opinião. Cada achado precisa apontar o **sintoma
observável**, o **critério violado** e a **correção sugerida**. Nunca aprove uma
tela sem ter aberto o código ou a renderização real.

## Ordem de severidade

Avalie nesta ordem. Um defeito de hierarquia não é compensado por um gradiente
bonito.

### 1. Hierarquia visual (bloqueante)
- Em 3 segundos, o olho encontra: (a) o que é isto, (b) o número/prova, (c) o que fazer?
- Existe **um** CTA primário evidente? Ações secundárias têm peso visual menor?
- O título domina a página (`h1` é o maior elemento tipográfico)?
- Nenhum elemento decorativo compete com informação essencial?
- A leitura natural (ocidental: Z ou F) leva ao CTA?

**Sintoma clássico no projeto:** 7 botões idênticos lado a lado → sem hierarquia.

### 2. Conversão (bloqueante)
Aplique `curriculo-marketing-funnel`:
- Gancho nos primeiros 3 segundos?
- Promessa clara e simples?
- Prova real e verificável visível **acima ou perto da dobra**?
- CTA único e imperativo?

### 3. Responsividade
- Larguras: 375px, 768px, 1280px, 1536px.
- Sem scroll horizontal em nenhuma delas.
- Título display não quebra de forma feia (nem órfã de 1 palavra).
- Grids colapsam; botões continuam tocáveis (≥ 44px de altura no mobile).
- `max-w-*` + `px-6` presentes para não colar nas bordas.

### 4. Acessibilidade
- Contraste AA: ≥ 4.5:1 para corpo, ≥ 3:1 para texto grande.
  **`text-slate-500` reprova (4.23:1 sobre `slate-950`)** — use `slate-400` no
  mínimo. Verifique com `node .design-review/contraste.cjs` em vez de estimar.
- Todo controle é `<a>`, `<Link>` ou `<button>` — nunca `<div onClick>`.
- `aria-label` em links só-ícone; `alt` correto em imagens.
- Um `h1` por página, sem pular níveis.
- Foco visível preservado; navegação completa por Tab.
- `motion-safe:` em animações.
- **Animação por JavaScript é um caso à parte.** A regra global de
  `prefers-reduced-motion` em `globals.css` zera `animation-duration` e
  `transition-duration`, o que **não** alcança `requestAnimationFrame` nem a Web
  Animations API (`element.animate()`). Qualquer animação movida por JS escapa da
  proteção e precisa tratar reduced-motion **explicitamente**: consulte
  `matchMedia("(prefers-reduced-motion: reduce)")` e pule para o estado final.
  Se usar `motion`, o `MotionConfig reducedMotion="user"` resolve isso de forma
  automática. Ver `docs/design/avaliacao-bibliotecas-animacao.md`.
- Rode `npx impeccable detect <alvo>` — ele aplica o limite de contraste e um
  conjunto de anti-padrões determinísticos (exit 0 = limpo, exit 2 = achados).

### 5. Honestidade de dados (bloqueante no Currículo Político)
- Todo número exibido corresponde a consulta real? Ou é hardcoded/desatualizado?
- **Versão da metodologia** exibida bate com `packages/idip/src/scoring.ts`
  (`WEIGHTS`) e com `/metodologia`? Divergência é defeito grave.
- Cores de estado coerentes com `ReliabilityStatus`?
- Compliance jurídico respeitado em labels e microcopy?
- A interface deixa claro que engajamento popular não altera a nota?

### 6. Técnica
- `npm run typecheck` limpo.
- `npm run build` limpo (build de produção, não só dev).
- Sem `console.log`, sem código morto, sem prop não usada.
- Server Components por padrão; `"use client"` só quando há interatividade.
- Dados sensíveis nunca serializados para o cliente sem necessidade.
- Fallback quando a consulta retorna vazio (banco sem dados não deve renderizar
  "0 políticos" nem quebrar o layout).

## Formato do relatório

```
## Veredito
[APROVADO | APROVADO COM RESSALVAS | REPROVADO]

## Bloqueantes
1. <sintoma observável> — critério <n> — correção: <ação>

## Melhorias
1. ...

## Verificado
- typecheck: <ok/falhou>
- build: <ok/falhou>
- responsivo: <larguras conferidas>
```

Sempre que possível, anexe uma captura renderizada. Revisão de UI sem ver a UI é
adivinhação.
