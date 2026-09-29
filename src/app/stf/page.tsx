import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Supremo Tribunal Federal — Currículo Político",
  description:
    "Estrutura do IDIP-STF: pontuação objetiva dos ministros por produtividade jurídica, consistência, transparência e celeridade.",
};

const DIMENSOES = [
  { dimensao: "Produtividade Jurídica", peso: 25, desc: "Relatorias, votos, acórdãos" },
  { dimensao: "Consistência Jurisprudencial", peso: 25, desc: "Coerência com precedentes" },
  { dimensao: "Transparência", peso: 20, desc: "Votos públicos, pedidos de vista" },
  { dimensao: "Celeridade", peso: 15, desc: "Tempo entre distribuição e voto" },
  { dimensao: "Integridade", peso: 15, desc: "Impedimentos, ausências" },
];

export default async function STFPage() {
  const justices = await prisma.stfJustice.findMany({
    where: { active: true },
    include: { scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Supremo Tribunal Federal
      </h1>
      <p className="mt-3 text-xl leading-relaxed text-slate-400">
        Pontuação objetiva dos 11 ministros com base em produtividade,
        consistência jurisprudencial, transparência e celeridade.
      </p>

      <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h3 className="mb-2 font-semibold text-slate-100">
          ⚠️ Dados em construção
        </h3>
        <p className="text-sm leading-relaxed text-slate-400">
          A estrutura do IDIP-STF está pronta (schema, metodologia e página),
          mas a coleta automatizada das decisões ainda não foi integrada. Os
          dados judiciais do STF são publicados no DJe e no portal.stf.jus.br,
          sem API consolidada. A integração será implementada em fases,
          começando pelos 11 ministros atuais e seus votos em ADIs e ADPFs.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="mb-4 text-xl font-bold text-slate-100">
          Metodologia (IDIP-STF)
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          No Judiciário, &quot;produtividade&quot; não se mede por quantidade,
          mas por rigor técnico e consistência. O algoritmo nunca avalia se um
          voto foi &quot;progressista&quot; ou &quot;conservador&quot;. Documento
          completo em{" "}
          <code className="text-slate-300">
            02-architecture-design/STF_SCORING.md
          </code>
          .
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {DIMENSOES.map((d) => (
            <div key={d.dimensao} className="border-l-4 border-sky-500/60 py-1 pl-3">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold text-slate-200">
                  {d.dimensao}
                </div>
                <div className="text-xs font-bold text-sky-400">{d.peso}%</div>
              </div>
              <div className="mt-1 text-xs text-slate-500">{d.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-10 mb-4 text-2xl font-bold text-slate-100">
        Ministros Atuais
      </h2>

      {justices.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-slate-400">
            Cadastros de ministros serão populados assim que o ETL do STF
            estiver integrado. Por enquanto, a metodologia e a estrutura de
            dados estão prontas para receber os dados.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {justices.map((j) => (
            <div
              key={j.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
            >
              <h3 className="mb-2 font-bold text-slate-100">{j.name}</h3>
              {j.appointedBy && (
                <div className="mb-3 text-xs text-slate-500">
                  Indicado por: {j.appointedBy}
                </div>
              )}
              {j.scores[0] ? (
                <div className="text-2xl font-bold text-slate-100">
                  {j.scores[0].finalScore.toFixed(1)}
                </div>
              ) : (
                <div className="text-sm italic text-slate-500">
                  Sem pontuação ainda
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
