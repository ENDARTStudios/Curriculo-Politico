/**
 * Estado de carregamento de rota.
 *
 * ── Por que skeleton, e não spinner ─────────────────────────────────────────
 * A auditoria de produção mediu 3,1 s de resposta na rota de ranking. Nesse
 * tempo, um spinner centralizado informa apenas "espere"; um esqueleto com a
 * forma do conteúdo informa **o que está vindo** e faz a espera parecer menor,
 * porque a atenção já está no lugar certo quando o dado chega.
 *
 * O esqueleto é genérico de propósito: `app/loading.tsx` cobre todas as rotas, e
 * desenhar a forma específica de uma página mentiria nas outras vinte e sete.
 *
 * ── Acessibilidade ──────────────────────────────────────────────────────────
 * Blocos cinzas não dizem nada a leitor de tela. Um `role="status"` com texto
 * oculto anuncia "Carregando" sem que a animação seja lida. E o bloco não usa
 * `animate-pulse` como único sinal: a animação é desligada por
 * `prefers-reduced-motion`, e quem a desliga precisa continuar sabendo que algo
 * está em andamento — por isso o texto existe no DOM, não só na animação.
 */
export default function Carregando() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div role="status" aria-live="polite" className="sr-only">
        Carregando o conteúdo…
      </div>

      <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        {/* Cabeçalho: olho, título e linha de apoio */}
        <div className="h-3 w-32 rounded bg-slate-800" />
        <div className="mt-4 h-9 w-2/3 rounded bg-slate-800" />
        <div className="mt-4 h-4 w-full max-w-2xl rounded bg-slate-800/70" />
        <div className="mt-2 h-4 w-1/2 rounded bg-slate-800/70" />

        {/* Lista: o formato mais comum do site */}
        <div className="mt-10 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-slate-800" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-1/3 rounded bg-slate-800" />
                <div className="mt-2 h-3 w-1/4 rounded bg-slate-800/70" />
              </div>
              <div className="hidden h-2 w-24 rounded bg-slate-800 sm:block" />
              <div className="h-6 w-14 rounded bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
