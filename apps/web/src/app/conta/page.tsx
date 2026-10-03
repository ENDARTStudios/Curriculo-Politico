import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContaAcoes } from "./ContaAcoes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha Conta — Currículo Político",
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

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Minha Conta
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Transparência total sobre o que guardamos — e controle direto, sem
        depender de e-mail (Art. 18 da LGPD).
      </p>

      {/* Dados da conta */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Conta</h2>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-500">E-mail</dt>
            <dd className="text-slate-200">{user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Nome</dt>
            <dd className="text-slate-200">{user.name ?? "(não informado)"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Conta criada em</dt>
            <dd className="text-slate-200">{fmt(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Termos de Uso / Privacidade</dt>
            <dd className="text-slate-200">
              aceitos em {fmt(user.termsAcceptedAt)}{" "}
              <span className="text-slate-500">(versão {user.termsVersion ?? "—"})</span>
            </dd>
          </div>
        </dl>
      </section>

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
              <span className="text-slate-500">
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
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          O voto FAVOR/CONTRA é tratado como opinião política (dado sensível,
          Art. 5º, II da LGPD): nunca compartilhado individualmente, nunca usado
          no IDIP, eliminado imediatamente na revogação.
        </p>
      </section>

      {/* Meus votos */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          Meus votos{" "}
          <span className="text-sm font-normal text-slate-500">
            ({user._count.billVotes})
          </span>
        </h2>
        {user.billVotes.length === 0 ? (
          <p className="text-sm text-slate-500">
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
                  <span className="text-slate-500">{v.bill.type}</span>{" "}
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

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Para acessar, corrigir ou portar dados, ou para qualquer direito do
        Art. 18 sem login, use o canal{" "}
        <Link href="/retificacao" className="text-sky-400 hover:underline">
          /retificacao
        </Link>{" "}
        (com protocolo rastreável) ou escreva para dpo@curriculopolitico.org.
      </p>
    </main>
  );
}
