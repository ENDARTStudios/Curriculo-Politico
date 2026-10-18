import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  consentimentoPoliticoAtivo,
  consentimentoPoliticoDesatualizado,
} from "@/lib/consent";

export const dynamic = "force-dynamic";

/**
 * Acompanhar político, partido ou projeto.
 *
 * ── Por que uma rota só, e não três ────────────────────────────────────────
 * As três operações são idênticas em contrato — criar, remover e listar um alvo
 * — e diferem só na coluna que recebe o id. Três rotas triplicariam validação,
 * mensagens de erro e superfície de bug sem ganho de clareza.
 *
 * ── LGPD: por que exige o mesmo consentimento do voto ─────────────────────
 * A lista de políticos que uma pessoa acompanha **é** dado de opinião política
 * (Art. 11). O projeto já trata o voto em projeto como sensível e exige
 * consentimento específico; deixar o acompanhamento passar sem ele seria
 * inconsistente e, pior, criaria uma via de coleta de dado sensível sem base
 * legal declarada.
 *
 * Por isso `POST` responde `403 CONSENT_REQUIRED` (ou `CONSENT_OUTDATED`) e a
 * interface explica o motivo com link para o painel de consentimento. É mais
 * atrito que o habitual em "seguir", e é intencional.
 *
 * ── Endpoints ──────────────────────────────────────────────────────────────
 *   POST   /api/follow   { tipo, alvoId }  → segue (idempotente)
 *   DELETE /api/follow?tipo=&alvoId=      → deixa de seguir
 *   GET    /api/follow                     → lista do próprio usuário
 */

type Tipo = "POLITICIAN" | "PARTY" | "BILL";

const TIPOS: Tipo[] = ["POLITICIAN", "PARTY", "BILL"];

/** Traduz o tipo para a coluna que recebe o id. */
const COLUNA: Record<Tipo, "personId" | "partyId" | "billId"> = {
  POLITICIAN: "personId",
  PARTY: "partyId",
  BILL: "billId",
};

/**
 * Verifica existência do alvo antes de gravar.
 *
 * A FK já impediria o registro, mas o erro do Prisma vira 500. Aqui devolvemos
 * 404 com mensagem clara — e, no caso de projeto, aceitamos `id` ou
 * `externalId`, como o resto da aplicação.
 */
async function resolverAlvo(tipo: Tipo, alvoId: string): Promise<string | null> {
  if (tipo === "POLITICIAN") {
    const p = await prisma.person.findUnique({ where: { id: alvoId }, select: { id: true } });
    return p?.id ?? null;
  }
  if (tipo === "PARTY") {
    const p = await prisma.party.findUnique({ where: { id: alvoId }, select: { id: true } });
    return p?.id ?? null;
  }
  const b = await prisma.bill.findFirst({
    where: { OR: [{ id: alvoId }, { externalId: alvoId }] },
    select: { id: true },
  });
  return b?.id ?? null;
}

async function exigirSessao() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return {
      erro: NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Entre para acompanhar (a conta é gratuita)." },
        { status: 401 },
      ),
    };
  }
  return { userId };
}

/** Gate de consentimento — devolve uma resposta de erro, ou `null` se liberado. */
async function exigirConsentimento(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      politicalConsentAt: true,
      politicalConsentWithdrawnAt: true,
      politicalConsentVersion: true,
    },
  });

  if (user && consentimentoPoliticoAtivo(user)) return null;

  if (user && consentimentoPoliticoDesatualizado(user)) {
    return NextResponse.json(
      {
        error: "CONSENT_OUTDATED",
        message:
          "O texto do consentimento para opinião política mudou. Autorize novamente para continuar acompanhando.",
        painel: "/conta",
      },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      error: "CONSENT_REQUIRED",
      message:
        "Acompanhar revela preferência política, que é dado sensível (Art. 11 da LGPD). Autorize no painel da sua conta — é revogável a qualquer momento.",
      painel: "/conta",
    },
    { status: 403 },
  );
}

export async function GET() {
  const sessao = await exigirSessao();
  if ("erro" in sessao) return sessao.erro;

  const follows = await prisma.follow.findMany({
    where: { userId: sessao.userId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      person: { select: { id: true, politicalName: true } },
      party: { select: { id: true, acronym: true } },
      bill: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({
    total: follows.length,
    follows: follows.map((f) => ({
      criadoEm: f.createdAt,
      tipo: f.person ? "POLITICIAN" : f.party ? "PARTY" : "BILL",
      id: f.person?.id ?? f.party?.id ?? f.bill?.id,
      nome: f.person?.politicalName ?? f.party?.acronym ?? f.bill?.title,
    })),
  });
}

export async function POST(request: NextRequest) {
  const sessao = await exigirSessao();
  if ("erro" in sessao) return sessao.erro;

  let corpo: { tipo?: string; alvoId?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON_INVALIDO" }, { status: 400 });
  }

  const tipo = corpo.tipo as Tipo | undefined;
  const alvoId = corpo.alvoId?.trim();

  if (!tipo || !TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: "TIPO_INVALIDO", message: "tipo deve ser POLITICIAN, PARTY ou BILL." },
      { status: 400 },
    );
  }
  if (!alvoId) {
    return NextResponse.json({ error: "ALVO_OBRIGATORIO" }, { status: 400 });
  }

  const bloqueio = await exigirConsentimento(sessao.userId);
  if (bloqueio) return bloqueio;

  const idResolvido = await resolverAlvo(tipo, alvoId);
  if (!idResolvido) {
    return NextResponse.json({ error: "ALVO_NAO_ENCONTRADO" }, { status: 404 });
  }

  /*
    Três `upsert` explícitos em vez de um com seletor montado.

    O Prisma exige **exatamente uma** chave única no `where`; um objeto com três
    chaves opcionais (as outras `undefined`) precisa de `as never` para compilar e
    pode ser rejeitado em runtime. Ramificar custa três linhas e é verificável
    pelo tipo. `upsert` sobre a chave única mantém a operação idempotente: clicar
    duas vezes não cria duplicata nem devolve erro.
  */
  if (tipo === "POLITICIAN") {
    await prisma.follow.upsert({
      where: { userId_personId: { userId: sessao.userId, personId: idResolvido } },
      update: {},
      create: { userId: sessao.userId, personId: idResolvido },
    });
  } else if (tipo === "PARTY") {
    await prisma.follow.upsert({
      where: { userId_partyId: { userId: sessao.userId, partyId: idResolvido } },
      update: {},
      create: { userId: sessao.userId, partyId: idResolvido },
    });
  } else {
    await prisma.follow.upsert({
      where: { userId_billId: { userId: sessao.userId, billId: idResolvido } },
      update: {},
      create: { userId: sessao.userId, billId: idResolvido },
    });
  }

  return NextResponse.json({ seguindo: true, tipo, alvoId: idResolvido });
}

export async function DELETE(request: NextRequest) {
  const sessao = await exigirSessao();
  if ("erro" in sessao) return sessao.erro;

  const tipo = request.nextUrl.searchParams.get("tipo") as Tipo | null;
  const alvoId = request.nextUrl.searchParams.get("alvoId")?.trim();

  if (!tipo || !TIPOS.includes(tipo) || !alvoId) {
    return NextResponse.json({ error: "PARAMETROS_INVALIDOS" }, { status: 400 });
  }

  const idResolvido = await resolverAlvo(tipo, alvoId);
  if (!idResolvido) {
    return NextResponse.json({ error: "ALVO_NAO_ENCONTRADO" }, { status: 404 });
  }

  await prisma.follow.deleteMany({
    where: { userId: sessao.userId, [COLUNA[tipo]]: idResolvido },
  });

  return NextResponse.json({ seguindo: false, tipo, alvoId: idResolvido });
}
