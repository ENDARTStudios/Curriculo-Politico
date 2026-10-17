/**
 * Cartão de pesos de um perfil do IDIP.
 *
 * ── Por que é componente e não markup solto ─────────────────────────────────
 * Estes três cartões nasceram na home. Lá eles faziam a página parecer
 * documentação: o visitante via a fórmula antes de ver o produto, e a mesma
 * informação aparecia duas vezes no site. Foram **movidos** para `/metodologia`,
 * que existe exatamente para isso — não apagados, porque a soma visível é uma
 * garantia metodológica, não enfeite.
 *
 * ── A soma é o ponto ────────────────────────────────────────────────────────
 * Pesos que não fecham em 100% são defeito de metodologia, e defeito de
 * metodologia deve ficar visível na tela em vez de escondido no código. Por isso
 * a soma aparece em cada cartão.
 *
 * Os pesos vêm de `@/lib/methodology`, validados contra o motor por
 * `verify:scoring` (teste WEB-001). Nunca redigite os números aqui: a home já
 * divergiu do motor exibindo v1.0 quando a fórmula era v1.1.
 *
 * ── `nota` ──────────────────────────────────────────────────────────────────
 * Aceita um texto para representar um perfil que AINDA NÃO é pontuado. Sem isso,
 * a única forma de falar do Judiciário seria inventar pesos — o que quebraria a
 * regra de que nenhuma regra entra na nota sem estar implementada em
 * `scoring.ts`. Uma plataforma de auditoria não inventa metodologia para
 * preencher um cartão.
 */
export function PesosCartao({
  titulo,
  descricao,
  dimensoes,
  nota,
}: {
  titulo: string;
  descricao: string;
  dimensoes?: readonly { label: string; percent: number }[];
  nota?: string;
}) {
  const soma = dimensoes?.reduce((total, d) => total + d.percent, 0) ?? 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="font-semibold text-slate-100">{titulo}</h3>
      <p className="mt-0.5 text-sm text-slate-400">{descricao}</p>

      {dimensoes && (
        <>
          <ul className="mt-5 space-y-2.5">
            {dimensoes.map((d) => (
              <li key={d.label} className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-slate-300">{d.label}</span>
                <span className="flex flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800"
                  >
                    <span
                      className="block h-full rounded-full bg-sky-500/70"
                      style={{ width: `${d.percent * 3}%` }}
                    />
                  </span>
                  <span className="w-10 text-right font-mono text-sm tabular-nums text-slate-400">
                    {d.percent}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-400">
            Soma dos pesos: <span className="font-mono tabular-nums">{soma}%</span>
          </p>
        </>
      )}

      {nota && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Sem nota publicada
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{nota}</p>
        </div>
      )}
    </div>
  );
}
