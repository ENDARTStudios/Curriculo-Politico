import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeAuthorshipAffinity, type Stance } from "@/lib/affinity";
import { AffinityFilter } from "@/components/AffinityFilter";
import Image from "next/image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking Personalizado por Afinidade — Currículo Político",
};

interface Props {
  searchParams: Promise<{ topics?: string; pos?: string | string[] }>;
}

export default async function RankingPersonalizadoPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const topics = (params.topics ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const posList = Array.isArray(params.pos) ? params.pos : params.pos ? [params.pos] : [];
  const positions: Record<string, Stance> = {};
  for (const p of posList) {
    const [topic, stance] = p.split(":");
    if (topic && (stance === "FAVOR" || stance === "CONTRA")) {
      positions[topic] = stance;
    }
  }

  const resultado =
    topics.length > 0
      ? await computeAuthorshipAffinity(topics, positions)
      : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Ranking Personalizado por Afinidade
      </h1>
      <p className="mt-2 max-w-3xl text-slate-400">
        Camada pessoal do Currículo Político: escolha temas e veja quem mais
        <strong className="text-slate-200"> apresentou proposições</strong>{" "}
        neles. O ranking de autorias usa as 50 mil autorias coletadas.
      </p>

      <div className="mt-8">
        <AffinityFilter />
      </div>

      {resultado && (
        <div className="mt-8">
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-slate-400">
            <strong className="text-amber-300">Importante:</strong> este
            ranking é <strong className="text-slate-200">pessoal</strong> e
            reflete suas preferências declaradas. Ele{" "}
            <strong className="text-slate-200">não altera</strong> a nota
            factual (IDIP) dos políticos, que permanece baseada apenas em
            dados oficiais auditáveis. Modo atual:{" "}
            <strong className="text-slate-200">autorias</strong> — quando a
            ponte votação↔proposição tiver dados suficientes, o ranking passa a
            usar o histórico de votos nominais.
          </div>

          {resultado.ranking.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
              <p className="text-slate-400">
                Nenhuma autoria encontrada para os temas selecionados. Tente
                ampliar a seleção.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Top {resultado.ranking.length} por autorias nos seus temas
                </h2>
                <span className="text-xs text-slate-500">
                  {resultado.totalBillsAnalyzed.toLocaleString("pt-BR")}{" "}
                  projetos analisados
                </span>
              </div>
              <div className="space-y-2">
                {resultado.ranking.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/politicos/${p.id}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-800 p-3 transition hover:border-slate-600"
                  >
                    <div className="w-8 text-right font-mono text-sm text-slate-500">
                      {i + 1}º
                    </div>
                    <Image
                      src={p.photo || "/avatar-placeholder.svg"}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-100">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {p.party ?? "—"} / {p.uf ?? "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-100">
                        {p.matches}
                      </div>
                      <div className="text-xs text-slate-500">autorias</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
