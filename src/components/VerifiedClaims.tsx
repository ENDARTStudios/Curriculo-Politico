import type { VerifiedClaim } from "@prisma/client";

const VERDICT_STYLE: Record<string, string> = {
  VERDADEIRO: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  FALSO: "border-red-500/40 bg-red-500/10 text-red-300",
  ENGANOSO: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  IMPRECISO: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  INSUSTENTÁVEL: "border-red-500/40 bg-red-500/10 text-red-300",
  DEFORMADO: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  CONTEXTO: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  CHECAGEM: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

interface VerifiedClaimsProps {
  claims: VerifiedClaim[];
}

/**
 * Polêmicas verificadas por agências independentes. Contexto puro —
 * NUNCA altera a nota IDIP (Neutralidade Algorítmica).
 */
export function VerifiedClaims({ claims }: VerifiedClaimsProps) {
  if (claims.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-2 text-xl font-bold text-slate-100">
        Polêmicas Verificadas ({claims.length})
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-slate-400">
        Declarações checadas por agências independentes. Esta seção{" "}
        <strong className="text-slate-200">não afeta a nota IDIP</strong> — é
        contexto para verificação de fatos.
      </p>

      <div className="space-y-3">
        {claims.slice(0, 10).map((claim) => (
          <div
            key={claim.id}
            className="border-l-4 border-slate-600/60 py-2 pl-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-sm font-medium leading-snug text-slate-200">
                  {claim.claimText}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="capitalize">{claim.source.replace("_", " ")}</span>
                  {claim.publishedAt && (
                    <>
                      <span>•</span>
                      <span>
                        {new Date(claim.publishedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span
                className={`shrink-0 rounded border px-2 py-1 text-xs font-semibold ${
                  VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.CHECAGEM
                }`}
              >
                {claim.verdict}
              </span>
            </div>
            <a
              href={claim.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-sky-400 hover:underline"
            >
              Ver checagem completa →
            </a>
          </div>
        ))}
      </div>

      {claims.length > 10 && (
        <div className="mt-4 text-center text-xs text-slate-500">
          Exibindo 10 de {claims.length} checagens.
        </div>
      )}

      <div className="mt-4 rounded-lg bg-slate-800/60 p-3">
        <p className="text-xs leading-relaxed text-slate-500">
          <strong className="text-slate-400">Nota:</strong> As checagens são
          produzidas por agências independentes (Aos Fatos, Lupa, Comprova) e
          não representam opinião do Currículo Político. Consulte sempre a
          fonte original para contexto completo.
        </p>
      </div>
    </div>
  );
}
