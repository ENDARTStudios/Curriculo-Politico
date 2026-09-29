# Design System — Currículo Político

## Tema
Dark mode único (não há light mode). Fundo `slate-950`, texto `slate-100`,
accent `sky-500`.

## Cores
| Uso | Tailwind | Hex aproximado |
|---|---|---|
| Fundo | `slate-950` | #020617 |
| Cards | `slate-900/60` | rgba(15,23,42,0.6) |
| Bordas | `slate-800` | #1e293b |
| Texto principal | `slate-100` | #f1f5f9 |
| Texto secundário | `slate-400` | #94a3b8 |
| Texto muted | `slate-500` | #64748b |
| Accent (ação) | `sky-500` | #0ea5e9 |
| Sucesso | `emerald-400/500` | #34d399 |
| Atenção | `amber-400/500` | #fbbf24 |
| Erro | `red-400/500` | #f87171 |
| Custo | `purple-400/500` | #c084fc |

## Termômetro (cores semânticas)
| Status | Emoji | Cor |
|---|---|---|
| 🟢 Confiável | ✅ | `emerald` |
| 🟡 Atenção | ⚠️ | `amber` |
| 🔴 Não Confiável | 🚨 | `red` |
| ⚪ Dados Insuficientes | — | `slate` |

## Componentes
### Cards
```
rounded-xl border border-slate-800 bg-slate-900/60 p-6
```

### Botões
```
Primário: bg-sky-500 text-slate-950 hover:bg-sky-400
Secundário: border border-slate-700 text-slate-300 hover:bg-slate-800
```

### Chips (termômetro, partido)
```
rounded-full border px-2 py-0.5 text-xs font-medium
```

### Tabelas
```
Container: rounded-2xl border border-slate-800 bg-slate-900/60
Header: border-b border-slate-800 text-xs uppercase text-slate-500
Linhas: divide-y divide-slate-800/70 hover:bg-slate-800/40
GRAY rows: opacity-60, sem posição numerada
```

## Tipografia
- Título: `text-4xl font-bold tracking-tight`
- Subtítulo: `text-2xl font-bold`
- Corpo: `text-sm text-slate-400`
- Mono (IDs, valores): `font-mono text-xs`
- Ícones: emoji nativo (sem biblioteca de ícones — zero dependência)

## Princípios
1. **Dark-only** — a identidade visual é dark. Sem toggle.
2. **Dados primeiro** — cada card tem número + rótulo + fonte
3. **Opacidade para GRAY** — dados insuficientes visualmente atenuados
4. **Emoji como ícones** — universal, sem dependência
5. **Scroll horizontal em tabelas** — mobile-first com `overflow-x-auto`
