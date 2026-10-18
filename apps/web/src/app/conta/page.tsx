import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContaAcoes } from "./ContaAcoes";
import { CONTATO, mailto } from "@/lib/contato";
import { listarAcompanhamentos } from "@/lib/acompanhamento";
import { obterIdioma } from "@/lib/i18n/servidor";
import { tradutor } from "@/lib/i18n/t";
import { EIXOS, type Pontuacoes } from "@/lib/espectro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha Conta",
  robots: { index: false },
};

/**
 * Painel da conta (LGPD Art. 18): transparência total sobre o que a
 * plataforma guarda sobre o usuário — e controle direto (revogar
 * consentimento, ver votos, eliminar conta) sem depender de e-mail.
 */
export default async function ContaPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect("/auth/signin?callbackUrl=/conta");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      createdAt: true,
      termsVersion: true,
      termsAcceptedAt: true,
      politicalConsentVersion: true,
      politicalConsentAt: true,
      politicalConsentWithdrawnAt: true,
      billVotes: {
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          vote: true,
          updatedAt: true,
          bill: { select: { id: true, title: true, type: true } },
        },
      },
      _count: { select: { billVotes: true } },
    },
  });

  if (!user) {
    redirect("/auth/signin?callbackUrl=/conta");
  }

  const consentido = !!user.politicalConsentAt && !user.politicalConsentWithdrawnAt;
  const fmt = (d: Date | null) =>
    d ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

  // Dashboard: acompanhamentos e último resultado do espectro.
  // As duas consultas são independentes e vão em paralelo.
  const [acompanhamentos, ultimoEspectro] = await Promise.all([
    listarAcompanhamentos(userId),
    prisma.spectrumResult.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { scores: true, versao: true, createdAt: true },
    }),
  ]);

  /*
    Traduzir só as seções novas.

    O texto jurídico desta página (consentimento, termos, exclusão de conta)
    permanece em português: é linguagem legal, e traduzi-la exige revisão humana,
    não substituição de rótulo. Misturar os dois no mesmo bloco seria pior que
    manter o bloco jurídico inteiro no idioma de origem.
  */
  const tr = tradutor(await obterIdioma());

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <CabecalhoPagina
        titulo="Minha Conta"
        lead={
          <>
            Transparência total sobre o que guardamos — e controle direto, sem
            depender de e-mail (Art. 18 da LGPD).
          </>
        }
      />

      {/* Dados da conta */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Conta</h2>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-400">E-mail</dt>
            <dd className="text-slate-200">{user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Nome</dt>
            <dd className="text-slate-200">{user.name ?? "(não informado)"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Conta criada em</dt>
            <dd className="text-slate-200">{fmt(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Termos de Uso / Privacidade</dt>
            <dd className="text-slate-200">
              aceitos em {fmt(user.termsAcceptedAt)}{" "}
              <span className="text-slate-400">(versão {user.termsVersion ?? "—"})</span>
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Dashboard: o que a pessoa acompanha ─────────────────────────────
          No topo da área porque é o que traz a pessoa de volta. Mostra os três
          tipos juntos: separar em três páginas esconderia que a plataforma
          acompanha político, partido E projeto. */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold text-slate-100">
            {tr("acompanhamentos.titulo")}
          </h2>
          <span className="text-xs text-slate-400">
            {tr("acompanhamentos.contagem", { n: acompanhamentos.total })}
          </span>
        </div>

        {acompanhamentos.total === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-300">
            <p>{tr("acompanhamentos.vazio")}</p>
            <Link
              href="/ranking"
              className="mt-3 inline-block font-medium text-sky-400 hover:text-sky-300"
            >
              {tr("acompanhamentos.irParaRanking")} →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <BlocoAcompanhamento
              titulo={tr("acompanhamentos.politicos")}
              itens={acompanhamentos.politicos.map((p) => ({
                href: `/politicos/${p.id}`,
                rotulo: p.politicalName,
              }))}
            />
            <BlocoAcompanhamento
              titulo={tr("acompanhamentos.partidos")}
              itens={acompanhamentos.partidos.map((p) => ({
                href: `/partidos/${encodeURIComponent(p.acronym)}`,
                rotulo: `${p.acronym} · ${p.name}`,
              }))}
            />
            <BlocoAcompanhamento
              titulo={tr("acompanhamentos.projetos")}
              itens={acompanhamentos.projetos.map((p) => ({
                href: `/projetos/${p.id}`,
                rotulo: p.title,
              }))}
            />
          </div>
        )}
      </section>

      {/* ── Último resultado do espectro ─────────────────────────────────── */}
      {ultimoEspectro && (
        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold text-slate-100">
              {tr("espectro.ultimoResultado")}
            </h2>
            <span className="text-xs text-slate-400">
              {fmt(ultimoEspectro.createdAt)}
            </span>
          </div>
          <EixosEspectro scores={ultimoEspectro.scores} />
          <p className="mt-3 text-xs text-slate-400">
            {tr("espectro.versao", { versao: ultimoEspectro.versao })}
          </p>
          <Link
            href="/espectro"
            className="mt-4 inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            {tr("espectro.refazer")}
          </Link>
        </section>
      )}

      {/* Consentimento político (dado sensível) */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          Consentimento para votação (dado sensível)
        </h2>
        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
          {consentido ? (
            <p>
              <strong className="text-emerald-400">Ativo</strong> desde{" "}
              {fmt(user.politicalConsentAt)}{" "}
              <span className="text-slate-400">
                (versão {user.politicalConsentVersion})
              </span>
            </p>
          ) : user.politicalConsentWithdrawnAt ? (
            <p>
              <strong className="text-amber-400">Revogado</strong> em{" "}
              {fmt(user.politicalConsentWithdrawnAt)} — seus votos foram
              eliminados e novos votos exigem nova autorização.
            </p>
          ) : (
            <p>
              <strong className="text-slate-400">Nunca concedido</strong> — você
              pode usar a plataforma, mas não votar em projetos. A autorização
              aparece no painel de votação de qualquer projeto.
            </p>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          O voto FAVOR/CONTRA é tratado como opinião política (dado sensível,
          Art. 5º, II da LGPD): nunca compartilhado individualmente, nunca usado
          no IDIP, eliminado imediatamente na revogação.
        </p>
      </section>

      {/* Meus votos */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          Meus votos{" "}
          <span className="text-sm font-normal text-slate-400">
            ({user._count.billVotes})
          </span>
        </h2>
        {user.billVotes.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhum voto registrado.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-2 text-sm">
            {user.billVotes.map((v) => (
              <li key={v.bill.id} className="flex items-start justify-between gap-3">
                <Link
                  href={`/projetos/${v.bill.id}`}
                  className="flex-1 text-slate-300 transition hover:text-sky-400"
                >
                  <span className="text-slate-400">{v.bill.type}</span>{" "}
                  {v.bill.title.slice(0, 90)}
                  {v.bill.title.length > 90 ? "…" : ""}
                </Link>
                <span
                  className={`shrink-0 font-semibold ${
                    v.vote === "FAVOR" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {v.vote === "FAVOR" ? "👍" : "👎"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ações */}
      <ContaAcoes consentido={consentido} />

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        Para acessar, corrigir ou portar dados, ou para qualquer direito do
        Art. 18 sem login, use o canal{" "}
        <Link href="/retificacao" className="text-sky-400 hover:underline">
          /retificacao
        </Link>{" "}
        (com protocolo rastreável) ou escreva para{" "}
        <a href={mailto(CONTATO.direitos)} className="text-sky-400 hover:underline">
          {CONTATO.direitos}
        </a>
        .
      </p>
    </main>
  );
}


/**
 * Lista de acompanhamentos de um tipo.
 *
 * Devolve `null` quando a lista está vazia: mostrar três títulos com "nada aqui"
 * embaixo transforma a ausência em ruído. Com o bloco ausente, a grid mostra só
 * o que existe.
 */
function BlocoAcompanhamento({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { href: string; rotulo: string }[];
}) {
  if (itens.length === 0) return null;

  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {titulo}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {itens.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block truncate text-sm text-slate-300 transition hover:text-slate-50"
            >
              {item.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Eixos do espectro salvos, de -100 a +100.
 *
 * A barra é centrada no zero: a posição **é** o dado, e uma barra que cresce da
 * esquerda faria um resultado de −40 e um de +40 parecerem o mesmo tamanho.
 */
function EixosEspectro({ scores }: { scores: unknown }) {
  const p = (scores ?? {}) as Partial<Pontuacoes>;

  return (
    <ul className="mt-4 space-y-3">
      {EIXOS.map((eixo) => {
        const valor = p[eixo.id];
        if (typeof valor !== "number") return null;
        // -100..100 → 0..100% de deslocamento a partir do centro.
        const deslocamento = Math.min(50, Math.abs(valor) / 2);

        return (
          <li key={eixo.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-sm text-slate-300">{eixo.nome}</span>
              <span className="whitespace-nowrap font-mono text-sm tabular-nums text-slate-400">
                {valor > 0 ? "+" : ""}
                {Math.round(valor)}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="relative h-2 w-full rounded-full bg-slate-800"
            >
              <span className="absolute left-1/2 top-0 h-2 w-px bg-slate-600" />
              <span
                className="absolute top-0 h-2 rounded-full bg-sky-500"
                style={{
                  left: valor >= 0 ? "50%" : `${50 - deslocamento}%`,
                  width: `${deslocamento}%`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
