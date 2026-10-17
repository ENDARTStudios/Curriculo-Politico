import Link from "next/link";

/**
 * 404 — página inexistente.
 *
 * ── Decisões de copy ────────────────────────────────────────────────────────
 * O texto não culpa quem chegou: um 404 neste projeto costuma vir de link
 * antigo, de político removido do cadastro ou de URL digitada à mão — nenhuma
 * dessas é erro do usuário. Dizer "você errou o endereço" seria impreciso e,
 * numa plataforma que pede confiança, começa a relação errado.
 *
 * A saída principal é o **ranking**, não a home: quem buscava um político e caiu
 * aqui ainda quer o político. Mandar para a home faria a pessoa refazer o
 * caminho inteiro.
 */
export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-sky-400">
        404
      </p>

      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
        Esta página não existe
      </h1>

      <p className="mt-5 max-w-[65ch] text-lg leading-relaxed text-slate-300">
        O endereço não corresponde a nenhuma página da plataforma. Pode ser um link
        antigo, um cadastro removido ou um endereço digitado pela metade.
      </p>

      <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-slate-400">
        Nenhum dado foi perdido — as notas continuam no ar, e a metodologia segue
        aberta para consulta.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href="/ranking"
          className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-50"
        >
          Ver o ranking completo
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Ir para a página inicial
        </Link>
      </div>

      <div className="mt-12 border-t border-slate-800 pt-6">
        <p className="text-sm text-slate-400">
          Procurava uma pessoa específica? A busca cobre políticos, partidos e
          projetos.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/partidos" className="font-medium text-sky-400 hover:text-sky-300">
            Partidos
          </Link>
          <Link href="/projetos" className="font-medium text-sky-400 hover:text-sky-300">
            Projetos de lei
          </Link>
          <Link href="/metodologia" className="font-medium text-sky-400 hover:text-sky-300">
            Metodologia do IDIP
          </Link>
          <Link href="/status" className="font-medium text-sky-400 hover:text-sky-300">
            Estado da plataforma
          </Link>
        </div>
      </div>
    </main>
  );
}
