import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Termometro } from "@/components/Termometro";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PoliticoPage({ params }: Props) {
  const { id } = await params;

  const politician = await prisma.person.findFirst({
    where: { OR: [{ id }, { externalId: id }] },
    include: {
      terms: {
        include: {
          office: true,
          party: true,
          scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
        },
        orderBy: { startYear: "desc" },
      },
      legalRecords: {
        // LGPD / SECURITY_BASELINE.md §3: apenas registros ativos ou
        // transitados em julgado; arquivados e absolvidos são ocultados.
        where: {
          status: { in: ["ATIVO", "TRANSITADO_EM_JULGADO"] },
          type: { not: "CLEARED" },
        },
        orderBy: { retrievedAt: "desc" },
      },
    },
  });

  if (!politician) notFound();

  const currentTerm = politician.terms[0];
  const score = currentTerm?.scores[0];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/ranking" className="mb-6 inline-block text-sm text-slate-400 transition hover:text-slate-100">
        ← Voltar ao ranking
      </Link>

      {/* Header do político */}
      <div className="mb-6 flex flex-col items-start gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:flex-row">
        <Image
          src={politician.photoUrl || "/avatar-placeholder.svg"}
          alt={`Foto de ${politician.politicalName}`}
          width={160}
          height={200}
          className="h-52 w-40 flex-shrink-0 rounded-xl object-cover"
          unoptimized
        />

        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            {politician.politicalName}
          </h1>
          {politician.civilName !== politician.politicalName && (
            <p className="mt-1 text-sm italic text-slate-500">
              ({politician.civilName})
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {currentTerm?.party && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-300">
                {currentTerm.party.acronym}
              </span>
            )}
            {currentTerm?.office && (
              <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm text-slate-300">
                {currentTerm.office.name} · {currentTerm.office.jurisdiction}
              </span>
            )}
            {currentTerm && (
              <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm text-slate-300">
                Mandato {currentTerm.startYear}–{currentTerm.endYear ?? "atual"}
              </span>
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            <p>Fonte: {politician.externalId ? `ID ${politician.externalId}` : "sem fonte integrada"}</p>
            <p>Nascimento: {politician.birthYear ?? "não informado"}</p>
          </div>
        </div>

        {/* Termômetro e nota */}
        {score && (
          <div className="flex flex-col items-center gap-3 md:border-l md:border-slate-800 md:pl-6">
            <Termometro status={score.reliabilityStatus} />
            <div className="text-center">
              <div className="text-5xl font-bold text-slate-100">
                {score.finalScore.toFixed(1)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                IDIP v{score.version}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Confiança: {score.confidenceScore.toFixed(0)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown e registros jurídicos */}
      <div className="grid gap-6 md:grid-cols-2">
        {score ? (
          <ScoreBreakdown score={score} />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-500">
            Este político ainda não possui nota IDIP calculada.
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-100">
            Registros Jurídicos Públicos
          </h2>
          {politician.legalRecords.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum registro público ativo ou transitado em julgado encontrado
              nas fontes oficiais integradas.
            </p>
          ) : (
            <ul className="space-y-3">
              {politician.legalRecords.map((rec) => (
                <li key={rec.id} className="border-l-4 border-red-500/60 py-1 pl-3">
                  <div className="text-sm font-medium text-slate-200">
                    {rec.type.replace("_", " ")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {rec.court ?? "órgão não informado"} · {rec.status.replace(/_/g, " ").toLowerCase()}
                  </div>
                  {rec.sourceUrl && (
                    <a
                      href={rec.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Ver fonte →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs italic text-slate-600">
            Processos arquivados ou com absolvição são ocultados por
            conformidade LGPD.
          </p>
        </div>
      </div>
    </main>
  );
}
