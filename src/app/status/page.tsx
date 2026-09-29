import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status — Currículo Político",
  description: "Saúde do sistema: volumes de dados, último snapshot e status das fontes.",
};

type EstadoItem = {
  rotulo: string;
  valor: string | null;
  erro?: boolean;
};

async function medir<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export default async function StatusPage() {
  const [parlamentares, scores, custoReal, ceap, proposicoes, votos, autorias, presencas, ultimoSnapshot, checagens] =
    await Promise.all([
      medir(() => prisma.person.count({ where: { externalId: { not: { startsWith: "seed-" } } } })),
      medir(() => prisma.score.count()),
      medir(() => prisma.score.count({ where: { costEfficiencyScore: { not: null } } })),
      medir(() => prisma.politicianCost.count({ where: { category: "CEAP", amount: { gt: 0 } } })),
      medir(() => prisma.bill.count()),
      medir(() => prisma.legislativeAction.count()),
      medir(() => prisma.billAuthorship.count()),
      medir(() => prisma.sessionAttendance.count()),
      medir(() => prisma.scoreSnapshot.findFirst({ orderBy: { snapshotDate: "desc" } })),
      medir(() => prisma.verifiedClaim.count()),
    ]);

  const bancoOk = parlamentares !== null;

  const itens: EstadoItem[] = [
    { rotulo: "Banco de dados", valor: bancoOk ? "Operacional" : "Indisponível", erro: !bancoOk },
    { rotulo: "Parlamentares na base", valor: parlamentares !== null ? parlamentares.toLocaleString("pt-BR") : null, erro: parlamentares === null },
    { rotulo: "Notas IDIP calculadas", valor: scores !== null ? scores.toLocaleString("pt-BR") : null, erro: scores === null },
    { rotulo: "Scores com custo real", valor: custoReal !== null ? custoReal.toLocaleString("pt-BR") : null },
    { rotulo: "Registros de CEAP", valor: ceap !== null ? ceap.toLocaleString("pt-BR") : null },
    { rotulo: "Proposições catalogadas", valor: proposicoes !== null ? proposicoes.toLocaleString("pt-BR") : null },
    { rotulo: "Votos nominais", valor: votos !== null ? votos.toLocaleString("pt-BR") : null },
    { rotulo: "Autorias legislativas", valor: autorias !== null ? autorias.toLocaleString("pt-BR") : null },
    { rotulo: "Presenças em sessões", valor: presencas !== null ? presencas.toLocaleString("pt-BR") : null },
    {
      rotulo: "Último snapshot mensal",
      valor: ultimoSnapshot
        ? ultimoSnapshot.snapshotDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        : "ainda sem snapshot",
    },
    { rotulo: "Checagens de agências", valor: checagens !== null ? checagens.toLocaleString("pt-BR") : null },
  ];

  const degradado = itens.some((i) => i.erro);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-3 w-3 rounded-full ${
            degradado ? "animate-pulse bg-amber-400" : "bg-emerald-400"
          }`}
        />
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          {degradado ? "Status: degradado" : "Status: operacional"}
        </h1>
      </div>
      <p className="mt-2 text-slate-400">
        Volumes vivos da base e saúde do pipeline. Atualizado a cada acesso
        (página dinâmica).
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-800/70">
            {itens.map((item) => (
              <tr key={item.rotulo}>
                <td className="p-4 text-slate-400">{item.rotulo}</td>
                <td
                  className={`p-4 text-right font-semibold ${
                    item.erro ? "text-red-300" : "text-slate-100"
                  }`}
                >
                  {item.valor ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Monitoramento externo de uptime é executado por serviço independente
        (UptimeRobot). Fontes bloqueadas no momento: TCU, STF, CDN do TSE e
        Querido Diário — pipelines prontos para reexecução.
      </p>
    </main>
  );
}
