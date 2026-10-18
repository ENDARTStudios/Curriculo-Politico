import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DIMENSOES_STF } from "@/lib/methodology";
import { formatarNota } from "@/lib/formato";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Supremo Tribunal Federal",
  description:
    "Composição do STF e a metodologia do IDIP para o Judiciário: integridade, produtividade, consistência decisória e transparência. Coleta de decisões em construção.",
  alternates: { canonical: "/stf" },
};

/**
 * Página do Judiciário.
 *
 * ── Por que ela continua existindo ──────────────────────────────────────────
 * O STF decide sobre os próprios políticos que a plataforma avalia, gasta
 * orçamento público e seus ministros têm mandato até a aposentadoria — não há
 * eleição como válvula de escape. É poder público, e a plataforma existe para
 * tornar poder público auditável. Remover a página esconderia uma lacuna em vez
 * de documentá-la.
 *
 * ── O que mudou nesta revisão ───────────────────────────────────────────────
 * A versão anterior listava cinco dimensões (com "Celeridade" a 15%) que não
 * batiam com o que o schema consegue armazenar: `StfCase` tem `decisionDate` mas
 * não a data de autuação, então tempo até a decisão é imensurável. Os pesos
 * passam a vir de `@/lib/methodology` (mesma fonte da home) e refletem
 * exatamente os campos de `StfScore`. Metodologia que o banco não pode honrar é
 * metodologia decorativa.
 *
 * A página se declara índice PRÓPRIO, e não uma linha do ranking de eleitos:
 * ministro é nomeado, e as dimensões de mandato (Aprovação, Campanha, Presença)
 * não se aplicam.
 */
export default async function STFPage() {
  const justices = await prisma.stfJustice.findMany({
    where: { active: true },
    include: { scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  const comNota = justices.filter((j) => j.scores[0]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <CabecalhoPagina
        titulo="Supremo Tribunal Federal"
        lead={
          <>
            O IDIP avalia também o Judiciário, com um conjunto de pesos próprio:
            ministro do STF é nomeado, não eleito, então as dimensões de mandato
            (aprovação, campanha, presença em sessão) não se aplicam.
          </>
        }
      />

      {/*
        Estado da coleta, declarado antes da metodologia de propósito: o visitante
        precisa saber que ainda não há nota antes de ler pesos que pareceriam
        estar em uso.
      */}
      <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="mb-2 font-semibold text-slate-100">
          Coleta de decisões em construção
        </h2>
        <p className="text-sm leading-relaxed text-slate-300">
          A estrutura está pronta — schema, metodologia e esta página — mas a
          coleta automatizada das decisões ainda não foi integrada. As decisões
          do STF são publicadas no Diário de Justiça Eletrônico e no portal do
          tribunal, <strong className="font-semibold">sem API consolidada</strong>,
          o que torna esta a integração mais custosa do projeto. Enquanto não há
          dado coletado, não há nota: a plataforma não pontua por estimativa.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
          Como o IDIP avalia um ministro
        </h2>
        <p className="mt-3 max-w-[65ch] leading-relaxed text-slate-400">
          O índice nunca avalia se um voto foi &quot;progressista&quot; ou
          &quot;conservador&quot; — isso não é mensurável e não é o papel da
          plataforma. Mede-se o que é verificável no processo: se o ministro
          produz, se decide com coerência em casos semelhantes, se trabalha à luz
          do público e se sua conduta resiste ao escrutínio.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Dimensões e pesos do IDIP para o Judiciário
            </caption>
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="p-4">
                  Dimensão
                </th>
                <th scope="col" className="p-4 text-right">
                  Peso
                </th>
                <th scope="col" className="p-4">
                  O que mede
                </th>
              </tr>
            </thead>
            <tbody>
              {DIMENSOES_STF.map((d) => (
                <tr key={d.label} className="border-b border-slate-800/60 last:border-0">
                  <th
                    scope="row"
                    className="p-4 text-left font-semibold text-slate-200"
                  >
                    {d.label}
                  </th>
                  <td className="p-4 text-right font-mono tabular-nums text-slate-300">
                    {d.percent}%
                  </td>
                  <td className="p-4 text-slate-400">{DESCRICAO[d.key]}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-800">
                <td className="p-4 text-xs text-slate-400" colSpan={3}>
                  Soma dos pesos:{" "}
                  <span className="font-mono tabular-nums">
                    {DIMENSOES_STF.reduce((t, d) => t + d.percent, 0)}%
                  </span>
                  {" · "}
                  Integridade mantém os mesmos 25% do Legislativo e do Executivo:
                  é a âncora do índice, e as travas de integridade valem aqui
                  também. Metodologia completa em{" "}
                  <Link
                    href="/metodologia"
                    className="font-medium text-sky-400 underline decoration-sky-800 underline-offset-2 transition hover:text-sky-300"
                  >
                    /metodologia
                  </Link>
                  .
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
          Composição do tribunal
        </h2>

        {justices.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
            <p className="text-slate-400">
              A composição do tribunal (ministros, indicação e posse) será
              cadastrada junto com o ETL das decisões. É o primeiro passo da
              integração, porque é o dado mais simples de obter e o mais estável:
              muda apenas quando há nomeação.
            </p>
            <p className="mx-auto mt-3 max-w-[60ch] text-sm text-slate-400">
              Os 11 assentos e as nomeações são públicos e verificáveis no{" "}
              <a
                href="https://portal.stf.jus.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-400 underline decoration-sky-800 underline-offset-2 transition hover:text-sky-300"
              >
                portal do STF
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
              .
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-400">
              {comNota.length} de {justices.length} ministros com nota publicada.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {justices.map((j) => (
                <div
                  key={j.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
                >
                  <h3 className="mb-2 font-bold text-slate-100">{j.name}</h3>
                  {j.appointedBy && (
                    <div className="mb-3 text-xs text-slate-400">
                      Indicado por: {j.appointedBy}
                    </div>
                  )}
                  {j.scores[0] ? (
                    <div className="font-mono text-2xl font-bold tabular-nums text-slate-100">
                      {formatarNota(j.scores[0].finalScore)}
                    </div>
                  ) : (
                    <div className="text-sm italic text-slate-400">
                      Sem pontuação ainda
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/** Texto de cada dimensão. As chaves batem com `ChaveDimensao` do IDIP-STF. */
const DESCRICAO: Record<string, string> = {
  integrity:
    "Condenações transitadas em julgado, impedimentos e suspeições. Mesma trava do IDIP: zera a dimensão e limita a nota.",
  productivity:
    "Relatorias concluídas, votos proferidos e participação em julgamentos.",
  consistency:
    "Coerência decisória em casos semelhantes. É a dimensão de maior peso justamente porque previsibilidade é o que se espera de um tribunal constitucional.",
  transparency:
    "Publicidade dos votos, fundamentação das decisões e resposta a pedidos de vista.",
};
