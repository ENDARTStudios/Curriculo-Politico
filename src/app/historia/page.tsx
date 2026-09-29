import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking Histórico — Currículo Político",
  description:
    "Avaliação educacional de figuras históricas da política brasileira por legado institucional, estabilidade democrática e fatos documentados, com critérios adaptados por era.",
};

export default async function HistoriaPage() {
  const eras = await prisma.historicalEra.findMany({
    include: {
      politicians: { orderBy: { historicalScore: "desc" } },
    },
    orderBy: { startYear: "asc" },
  });

  const allPoliticians = eras
    .flatMap((e) => e.politicians)
    .filter((p) => p.historicalScore !== null)
    .sort((a, b) => (b.historicalScore ?? 0) - (a.historicalScore ?? 0));

  const melhores = allPoliticians.slice(0, 5);
  const piores = allPoliticians.slice(-5).reverse();

  const corNota = (n: number) =>
    n >= 70 ? "text-emerald-400" : n >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Ranking Histórico da Política Brasileira
      </h1>
      <p className="mt-3 max-w-3xl text-xl leading-relaxed text-slate-400">
        Avaliação de figuras históricas com base em legado institucional,
        estabilidade democrática e fatos documentados. Metodologia adaptada por
        era.
      </p>

      <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h3 className="mb-2 font-semibold text-slate-100">⚠️ Sobre este ranking</h3>
        <p className="mb-2 text-sm leading-relaxed text-slate-400">
          Este ranking avalia figuras históricas com base em{" "}
          <strong className="text-slate-200">fatos documentados</strong>, não em
          opinião política. Os critérios variam por período:
        </p>
        <ul className="space-y-1 text-sm text-slate-400">
          <li>
            • <strong className="text-slate-200">Legado institucional:</strong>{" "}
            obras, leis e reformas duradouras
          </li>
          <li>
            •{" "}
            <strong className="text-slate-200">Estabilidade institucional:</strong>{" "}
            respeito às instituições e à Constituição
          </li>
          <li>
            •{" "}
            <strong className="text-slate-200">Contribuição democrática:</strong>{" "}
            ampliação de direitos e participação
          </li>
        </ul>
        <p className="mt-2 text-sm text-slate-400">
          Para períodos sem dados quantitativos (antes de 1985), a avaliação é
          qualitativa e baseada em fontes historiográficas consolidadas
          (FGV/CPDOC, Senado, Presidência).
        </p>
      </div>

      {/* Ranking geral */}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-100">
            🏆 Maior Pontuação
          </h2>
          <div className="space-y-3">
            {melhores.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
              >
                <span className="text-lg font-bold text-emerald-400">{i + 1}º</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-100">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.office} ({p.startYear}–{p.endYear ?? "atual"})
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {p.historicalScore?.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-100">
            ⚠️ Menor Pontuação
          </h2>
          <div className="space-y-3">
            {piores.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3"
              >
                <span className="text-lg font-bold text-red-400">{i + 1}º</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-100">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.office} ({p.startYear}–{p.endYear ?? "atual"})
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {p.historicalScore?.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Por era */}
      {eras.map((era) => (
        <div key={era.id} className="mt-12">
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-2 text-2xl font-bold text-slate-100">{era.name}</h2>
            <p className="text-slate-400">{era.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {era.politicians.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100">{p.name}</h3>
                    <div className="text-xs text-slate-500">
                      {p.office} • {p.party}
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.startYear}–{p.endYear ?? "atual"}
                    </div>
                  </div>
                  {p.historicalScore !== null && (
                    <div className={`text-2xl font-bold ${corNota(p.historicalScore)}`}>
                      {p.historicalScore.toFixed(0)}
                    </div>
                  )}
                </div>

                {p.historicalScore === null && (
                  <div className="mb-2 rounded border border-slate-700 px-2 py-1 text-xs italic text-slate-500">
                    Mandato em curso — sem nota até a conclusão
                  </div>
                )}

                {Array.isArray(p.achievements) && p.achievements.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 text-xs font-semibold text-emerald-400">
                      Realizações:
                    </div>
                    <ul className="space-y-0.5 text-xs text-slate-400">
                      {(p.achievements as string[]).slice(0, 3).map((a) => (
                        <li key={a}>• {a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(p.controversies) && p.controversies.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-red-400">
                      Eventos notórios:
                    </div>
                    <ul className="space-y-0.5 text-xs text-slate-400">
                      {(p.controversies as string[]).slice(0, 2).map((c) => (
                        <li key={c}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(p.sources) && p.sources.length > 0 && (
                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <a
                      href={(p.sources as string[])[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Ver fontes →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-12 rounded-xl border border-sky-500/30 bg-sky-500/5 p-6">
        <h3 className="mb-2 font-semibold text-slate-100">💡 Nota metodológica</h3>
        <p className="text-sm leading-relaxed text-slate-400">
          Este ranking é educacional e baseado em fontes historiográficas
          consolidadas. Não substitui o julgamento histórico acadêmico. Figuras
          com mandatos em curso não recebem nota até a conclusão do período.
          Para políticos contemporâneos (pós-1985), consulte o{" "}
          <Link href="/ranking" className="text-sky-400 hover:underline">
            ranking IDIP completo
          </Link>{" "}
          com dados auditáveis em tempo real.
        </p>
      </div>
    </main>
  );
}
