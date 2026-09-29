import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/bills?page=1&limit=20&q=&type=&year=
 * Listagem paginada de proposições com autorias e contagem de voto popular.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const page = Math.max(parseInt(sp.get("page") ?? "1") || 1, 1);
  const limit = Math.min(parseInt(sp.get("limit") ?? "20") || 20, 50);
  const search = sp.get("q") ?? "";
  const type = sp.get("type") ?? "";
  const year = sp.get("year") ?? "";

  const where: Prisma.BillWhereInput = {};
  if (search) where.title = { contains: search, mode: "insensitive" };
  if (type) where.type = type;
  if (year) {
    const y = parseInt(year);
    where.date = { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31`) };
  }

  const [bills, total] = await Promise.all([
    prisma.bill.findMany({
      where,
      include: {
        authorships: { include: { person: true }, take: 3 },
        _count: { select: { userVotes: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bill.count({ where }),
  ]);

  // Contagens de voto popular numa única query (não N queries por página)
  const votacoes = await prisma.userBillVote.groupBy({
    by: ["billId", "vote"],
    where: { billId: { in: bills.map((b) => b.id) } },
    _count: true,
  });
  const votosPorBill = new Map<string, { favor: number; contra: number }>();
  for (const v of votacoes) {
    const acc = votosPorBill.get(v.billId) ?? { favor: 0, contra: 0 };
    if (v.vote === "FAVOR") acc.favor += v._count;
    if (v.vote === "CONTRA") acc.contra += v._count;
    votosPorBill.set(v.billId, acc);
  }

  return NextResponse.json({
    bills: bills.map((b) => ({
      id: b.id,
      externalId: b.externalId,
      title: b.title,
      type: b.type,
      date: b.date,
      authors: b.authorships.map((a) => a.person.politicalName),
      popularVotes: votosPorBill.get(b.id) ?? { favor: 0, contra: 0 },
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
