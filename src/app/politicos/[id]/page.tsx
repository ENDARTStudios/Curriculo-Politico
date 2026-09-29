import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Termometro } from "@/components/Termometro";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { VotosRecentes } from "@/components/VotosRecentes";
import { Proposicoes } from "@/components/Proposicoes";
import { Presenca } from "@/components/Presenca";
import { ProfileNav } from "@/components/ProfileNav";
import { TimelineChart } from "@/components/TimelineChart";
import { IdeologyBadge } from "@/components/IdeologyBadge";
import { VerifiedClaims } from "@/components/VerifiedClaims";
import { PoliticianCost } from "@/components/PoliticianCost";

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
          finances: { orderBy: { year: "desc" }, take: 1 },
          actions: {
            where: { actionType: "VOTED" },
            orderBy: { date: "desc" },
            take: 20,
          },
          sessionAttendances: {
            orderBy: { sessionDate: "desc" },
            take: 300,
          },
          scoreSnapshots: { orderBy: { snapshotDate: "asc" } },
        },
        orderBy: { startYear: "desc" },
      },
      billAuthorships: {
        include: { bill: true },
        orderBy: { bill: { date: "desc" } },
        take: 20,
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
  const finance = currentTerm?.finances[0];
  const topDonors = (finance?.topDonors as Array<{ nome: string; valor: number }> | undefined) ?? [];

  // Totais reais (independem dos `take` das listas exibidas)
  const [totalVotos, totalAutorias, totalPresencas] = currentTerm
    ? await Promise.all([
        prisma.legislativeAction.count({
          where: { termId: currentTerm.id, actionType: "VOTED" },
        }),        prisma.billAuthorship.count({ where: { personId: politician.id } }),
        prisma.sessionAttendance.count({ where: { termId: currentTerm.id } }),
      ])
    : [0, 0, 0];

  // Checagens de agências independentes (contexto — nunca altera o IDIP)
  const verifiedClaims = await prisma.verifiedClaim.findMany({
    where: { personId: politician.id },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  const [custos, beneficiosFixos] = currentTerm
    ? await Promise.all([
        prisma.politicianCost.findMany({
          where: { termId: currentTerm.id },
          orderBy: { year: "desc" },
        }),
        prisma.fixedBenefit.findMany({
          where: {
            officeType:
              currentTerm.office.name === "Senador"
                ? "SENADOR"
                : currentTerm.office.name === "Deputado Federal"
                  ? "DEPUTADO_FEDERAL"
                  : "PRESIDENTE",
          },
        }),
      ])
    : [[], []];

  const navItems = [
    { id: "nota", label: "Nota" },
    { id: "custo", label: "Custo" },
    { id: "votos", label: `Votos (${totalVotos})` },
    { id: "proposicoes", label: `Proposições (${totalAutorias})` },
    { id: "presenca", label: `Presença (${totalPresencas})` },
    ...(finance ? [{ id: "financiamento", label: "Financiamento" }] : []),
    { id: "juridico", label: "Jurídico" },
  ];

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
            {currentTerm?.party && (
              <IdeologyBadge
                position={currentTerm.party.position}
                ideology={currentTerm.party.ideology}
              />
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

      {/* Navegação interna das seções */}
      <ProfileNav items={navItems} />

      {/* Breakdown, financiamento e registros jurídicos */}
      <div id="nota" className="grid gap-6 md:grid-cols-2">
        {score ? (
          <ScoreBreakdown score={score} />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-500">
            Este político ainda não possui nota IDIP calculada.
          </div>
        )}

        <div id="juridico" className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 scroll-mt-16">
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

        {/* Financiamento de campanha — só aparece quando há dados (graceful) */}
        {finance && (
          <div id="financiamento" className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 md:col-span-2 scroll-mt-16">
            <h2 className="mb-4 text-xl font-bold text-slate-100">
              Financiamento de Campanha ({finance.year})
            </h2>
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500">Total arrecadado</div>
                <div className="text-2xl font-bold text-slate-100">
                  R${" "}
                  {finance.totalReceived.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Receitas registradas</div>
                <div className="text-2xl font-bold text-slate-100">
                  {finance.donorCount}
                </div>
              </div>
            </div>
            {topDonors.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-300">
                  Maiores receitas individuais
                </h3>
                <ul className="space-y-1">
                  {topDonors.map((donor, i) => (
                    <li key={i} className="flex justify-between gap-4 text-sm">
                      <span className="flex-1 truncate text-slate-400">{donor.nome}</span>
                      <span className="font-semibold text-slate-200">
                        R${" "}
                        {donor.valor.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-4 text-xs italic text-slate-600">
              Fonte: TSE — Prestação de Contas {finance.year}. Não inclui
              fundo eleitoral rateado a futuras prestações.
            </p>
          </div>
        )}
      </div>

      {/* Custo para o Estado (real ou referência por cargo) */}
      {currentTerm && (
        <div id="custo" className="mt-6 scroll-mt-16">
          <PoliticianCost
            costs={custos}
            fixedBenefits={beneficiosFixos.map((b) => ({
              category: b.category,
              monthlyValue: b.monthlyValue,
            }))}
            productivityScore={score?.productivityScore ?? 50}
          />
        </div>
      )}

      {/* Atividade parlamentar */}
      <div id="votos" className="mt-6 grid gap-6 md:grid-cols-2 scroll-mt-16">
        <VotosRecentes votos={currentTerm?.actions ?? []} total={totalVotos} />
        <Proposicoes autorias={politician.billAuthorships} total={totalAutorias} />
      </div>

      <div id="presenca" className="mt-6 scroll-mt-16">
        <Presenca presencas={currentTerm?.sessionAttendances ?? []} total={totalPresencas} />
      </div>

      {/* Rastreamento temporal (snapshots mensais) */}
      {currentTerm && currentTerm.scoreSnapshots.length > 0 && (
        <div className="mt-6">
          <TimelineChart snapshots={currentTerm.scoreSnapshots} />
        </div>
      )}

      {/* Polêmicas verificadas (contexto — não afeta a nota) */}
      {verifiedClaims.length > 0 && (
        <div className="mt-6">
          <VerifiedClaims claims={verifiedClaims} />
        </div>
      )}
    </main>
  );
}
