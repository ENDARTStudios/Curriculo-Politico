import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Canal de retificação e direitos do titular (LGPD Art. 18) — público,
 * sem login (o titular pode não ter conta na plataforma).
 *
 * POST /api/retificacao → registra solicitação e devolve protocolo
 * GET  /api/retificacao?protocolo=&email= → consulta status
 *
 * Rate limiting geral /api (60/min por usuário ou IP) aplica-se via middleware.
 */

function gerarProtocolo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let sufixo = "";
  const rand = new Uint8Array(6);
  crypto.getRandomValues(rand);
  for (const b of rand) sufixo += chars[b % chars.length];
  return `RET-${new Date().getFullYear()}-${sufixo}`;
}

export async function POST(request: NextRequest) {
  let body: {
    requesterName?: string;
    requesterEmail?: string;
    targetType?: string;
    targetName?: string;
    description?: string;
    sourceUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const requesterName = body.requesterName?.trim() ?? "";
  const requesterEmail = body.requesterEmail?.trim().toLowerCase() ?? "";
  const description = body.description?.trim() ?? "";
  const targetType = ["POLITICO", "USUARIO", "OUTRO"].includes(
    body.targetType ?? "",
  )
    ? body.targetType!
    : "OUTRO";
  const targetName = body.targetName?.trim() || null;
  const sourceUrl = body.sourceUrl?.trim() || null;

  if (requesterName.length < 3) {
    return NextResponse.json(
      { error: "NOME_INVALIDO", message: "Informe seu nome completo." },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(requesterEmail)) {
    return NextResponse.json(
      { error: "EMAIL_INVALIDO", message: "Informe um e-mail válido para retorno." },
      { status: 400 },
    );
  }
  if (description.length < 20) {
    return NextResponse.json(
      {
        error: "DESCRICAO_CURTA",
        message: "Descreva a solicitação com pelo menos 20 caracteres.",
      },
      { status: 400 },
    );
  }

  const protocolo = gerarProtocolo();
  const solicitacao = await prisma.retificationRequest.create({
    data: {
      protocolo,
      requesterName,
      requesterEmail,
      targetType,
      targetName,
      description,
      sourceUrl,
    },
    select: { protocolo: true, status: true, createdAt: true },
  });

  return NextResponse.json(solicitacao, { status: 201 });
}

export async function GET(request: NextRequest) {
  const protocolo = request.nextUrl.searchParams.get("protocolo")?.trim();
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!protocolo || !email) {
    return NextResponse.json(
      { error: "PARAMETROS_AUSENTES", message: "Informe protocolo e e-mail." },
      { status: 400 },
    );
  }

  const solicitacao = await prisma.retificationRequest.findFirst({
    where: { protocolo: { equals: protocolo, mode: "insensitive" }, requesterEmail: email },
    select: { protocolo: true, status: true, createdAt: true, updatedAt: true },
  });

  if (!solicitacao) {
    return NextResponse.json(
      { error: "NAO_ENCONTRADA", message: "Protocolo e e-mail não correspondem." },
      { status: 404 },
    );
  }

  return NextResponse.json(solicitacao);
}
