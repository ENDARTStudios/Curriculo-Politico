import Link from "next/link";
import { RODAPE } from "@/lib/navegacao";
import { obterIdioma } from "@/lib/i18n/servidor";
import { tradutor } from "@/lib/i18n/t";

/**
 * Rodapé do site.
 *
 * ── O que mudou ─────────────────────────────────────────────────────────────
 * Antes: uma fileira centralizada de onze links, misturando produto (Ranking),
 * projeto (Sobre, Contato) e jurídico (LGPD, Cookies, Termos), todos com o mesmo
 * peso. Quem procurava a política de privacidade varria oito links de produto
 * antes de chegar nela.
 *
 * Agora: quatro colunas por **finalidade** — Explorar, Entender, Projeto,
 * Jurídico. A estrutura vem de `lib/navegacao.ts`, a mesma que alimenta o
 * header, então não há como divergirem.
 *
 * O acesso à conta **saiu daqui como única porta** e passou para o topo (ver
 * `SiteHeader`). Ele continua no rodapé porque é convenção útil, mas não é mais
 * o único caminho para entrar.
 */
export async function SiteFooter() {
  // Componente de servidor: lê o idioma direto, sem passar pelo contexto do
  // cliente. O rodapé é estático o bastante para não justificar um hook.
  const locale = await obterIdioma();
  const tr = tradutor(locale);

  return (
    <footer className="mt-20 border-t border-slate-800/80 bg-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Marca + o que é, em uma frase. */}
          <div className="lg:col-span-1">
            {/*
              Sem `aria-label` repetindo o do header: dois links com o nome
              acessível idêntico ("Currículo Político — página inicial") fazem o
              leitor de tela listar dois destinos iguais e quebram a busca por
              papel + nome (foi o que derrubou o teste de navegação). Aqui o nome
              vem do próprio texto, que é o natural para a marca no rodapé.
            */}
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-50 transition hover:opacity-80"
            >
              <span aria-hidden="true">📡</span>
              <span>Currículo Político</span>
            </Link>
            <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-slate-400">
              Nota de 0 a 100 para cada parlamentar e governante, calculada só com
              dado público auditável.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
              <span aria-hidden="true">🟢</span> {tr("rodape.codigoAberto")}
            </p>
          </div>

          {RODAPE.map((coluna) => (
            <div key={coluna.chaveTitulo}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {tr(coluna.chaveTitulo)}
              </h2>
              <ul className="mt-3 space-y-2">
                {coluna.itens.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-300 transition hover:text-slate-50"
                    >
                      {tr(item.chaveRotulo)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Linha final: licença, fontes e conta. */}
        <div className="mt-12 flex flex-col gap-4 border-t border-slate-800 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>
              Código sob AGPL-3.0 · Documentação sob CC BY 4.0
            </p>
            <p>
              Fontes: Câmara dos Deputados, Senado Federal e TSE. Sem voto popular:
              as notas derivam exclusivamente de dados públicos auditáveis.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <Link href="/status" className="transition hover:text-slate-200">
              Status
            </Link>
            <Link href="/conta" className="transition hover:text-slate-200">
              Minha conta
            </Link>
            <Link href="/apoie" className="font-medium text-sky-400 transition hover:text-sky-300">
              Apoie o projeto
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
