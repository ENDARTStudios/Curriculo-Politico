import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarInteiro } from "@/lib/formato";
import { ProjetoFilters } from "@/components/ProjetoFilters";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Projetos de Lei",
  description:
    "Proposições legislativas federais com resumo em linguagem simples e o impacto para o cidadão. Filtre por tema, tipo e ano.",
  alternates: { canonical: "/projetos" },
};


export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    page?: string;
    q?: string;
    type?: string;
    year?: string;
    limit?: string;
  }>;
}

async function getBills(params: Awaited<Props["searchParams"]>) {
  const page = Math.max(parseInt(params.page ?? "1") || 1, 1);
  const limit = Math.min(parseInt(params.limit ?? "20") || 20, 50);
  const search = params.q ?? "";
  const type = params.type ?? "";
  const year = params.year ?? "";

  const where: Prisma.BillWhereInput = {};
  if (search) where.title = { contains: search, mode: "insensitive" };
  if (type) where.type = type;
  if (year) {
    const y = parseInt(year);
    where.date = { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31`) };
  }

  const [bills, total, totalBase] = await Promise.all([
    prisma.bill.findMany({
      where,
      include: {
        authorships: { include: { person: true }, take: 3 },
      },
      orderBy: [{ date: "desc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bill.count({ where }),
    /*
      Total da base, SEM filtro, em consulta própria.

      O texto de abertura dizia "{total} proposições catalogadas" usando o total
      **filtrado** — então uma busca sem resultado exibia "0 proposições
      catalogadas de autoria dos parlamentares na base", como se o banco estivesse
      vazio. Numa plataforma de transparência isso não é erro de layout: é afirmar
      um fato falso sobre a base. O número do acervo não pode depender do filtro que
      o visitante aplicou.
    */
    prisma.bill.count(),
  ]);

  return { bills, total, totalBase, page, limit };
}

function montarQuery(params: Awaited<Props["searchParams"]>, page: number): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") sp.set(k, v);
  }
  sp.set("page", String(page));
  return sp.toString();
}

export default async function ProjetosPage({ searchParams }: Props) {
  const params = await searchParams;
  const { bills, total, totalBase, page, limit } = await getBills(params);
  const totalPages = Math.ceil(total / limit);

  // Tipos e anos derivados dos dados (o filtro 'status' não existe no
  // payload de listagem da API — Bill.status fica sempre null)
  const tipos = (
    await prisma.bill.findMany({
      distinct: ["type"],
      select: { type: true },
      where: { type: { not: null } },
      orderBy: { type: "asc" },
    })
  ).map((t) => t.type!) as string[];

  const range = await prisma.bill.aggregate({
    _min: { date: true },
    _max: { date: true },
  });
  const anos: number[] = [];
  if (range._min.date && range._max.date) {
    for (let y = range._max.date.getFullYear(); y >= range._min.date.getFullYear(); y--) {
      anos.push(y);
    }
  }

  const filtrosAtivos = [params.q, params.type, params.year].filter(Boolean).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <CabecalhoPagina
        titulo="Projetos de Lei e Proposições"
        lead={
          <>
            {/* `totalBase`, não `total`: o acervo não muda com o filtro aplicado. */}
            {formatarInteiro(totalBase)} proposições catalogadas de autoria dos
            parlamentares na base. A votação popular em cada projeto é uma camada
            de engajamento pessoal e nunca altera a nota IDIP dos autores.
          </>
        }
      />

      <div className="mt-8">
        <Suspense fallback={<div className="text-slate-400">Carregando filtros...</div>}>
          <ProjetoFilters tipos={tipos} anos={anos} />
        </Suspense>
      </div>

      {filtrosAtivos > 0 && (
        <div className="mb-4 text-sm text-slate-400">
          {total.toLocaleString("pt-BR")} resultado(s) com {filtrosAtivos}{" "}
          filtro(s) aplicado(s)
        </div>
      )}

      <div className="space-y-3">
        {bills.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
            <p className="text-slate-400">
              Nenhum projeto encontrado com os filtros atuais.
            </p>
          </div>
        ) : (
          bills.map((bill) => (
            <Link
              key={bill.id}
              href={`/projetos/${bill.externalId ?? bill.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {bill.type && (
                      <span className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-300">
                        {bill.type}
                      </span>
                    )}
                    {bill.date && (
                      <span className="text-xs text-slate-400">
                        {new Date(bill.date).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  <h3 className="line-clamp-2 font-semibold leading-snug text-slate-100">
                    {bill.title}
                  </h3>
                  {bill.authorships.length > 0 && (
                    <div className="mt-1 truncate text-sm text-slate-400">
                      {bill.authorships.map((a) => a.person.politicalName).join(", ")}
                      {bill.authorships.length === 3 ? "…" : ""}
                    </div>
                  )}
                </div>
                <div className="whitespace-nowrap text-right text-xs text-slate-400">
                  Ver detalhes →
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/projetos?${montarQuery(params, page - 1)}`}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              ← Anterior
            </Link>
          )}
          <div className="px-4 py-2 text-sm text-slate-400">
            Página {page} de {totalPages.toLocaleString("pt-BR")}
          </div>
          {page < totalPages && (
            <Link
              href={`/projetos?${montarQuery(params, page + 1)}`}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
