import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  consentimentoPoliticoAtivo,
  consentimentoPoliticoDesatualizado,
} from "@/lib/consent";
import { EIXOS_POR_ID, type EixoId } from "@/lib/espectro";

export const dynamic = "force-dynamic";

/**
 * Salva o resultado do teste de espectro na área do usuário.
 *
 * ── LGPD ───────────────────────────────────────────────────────────────────
 * O resultado é posicionamento político — dado sensível (Art. 11). Mesmo gate do
 * voto e do acompanhamento: sem consentimento específico ativo, não gravamos.
 * A pessoa continua podendo fazer o teste e ver o resultado; o que exige
 * consentimento é **guardar**.
 *
 * ── Validação dos eixos ────────────────────────────────────────────────────
 * Aceitamos apenas as chaves conhecidas e valores numéricos em −100..100.
 * Um JSON arbitrário do cliente nunca deve virar registro: além do risco de
 * lixo no banco, um valor fora da escala quebraria a barra na dashboard.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Entre para salvar o resultado." },
      { status: 401 },
    );
  }

  let corpo: { scores?: unknown; versao?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON_INVALIDO" }, { status: 400 });
  }

  const brutos = corpo.scores;
  if (!brutos || typeof brutos !== "object") {
    return NextResponse.json({ error: "SCORES_OBRIGATORIOS" }, { status: 400 });
  }

  const limpos: Partial<Record<EixoId, number>> = {};
  for (const id of Object.keys(EIXOS_POR_ID) as EixoId[]) {
    const valor = (brutos as Record<string, unknown>)[id];
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      return NextResponse.json(
        { error: "EIXO_INVALIDO", message: `O eixo "${id}" precisa ser numérico.` },
        { status: 400 },
      );
    }
    if (valor < -100 || valor > 100) {
      return NextResponse.json(
        { error: "EIXO_FORA_DA_ESCALA", message: `O eixo "${id}" deve estar entre -100 e 100.` },
        { status: 400 },
      );
    }
    limpos[id] = Math.round(valor * 100) / 100;
  }

  const versao = typeof corpo.versao === "string" ? corpo.versao.trim() : "";
  if (!versao) {
    return NextResponse.json(
      {
        error: "VERSAO_OBRIGATORIA",
        message:
          "A versão do questionário é obrigatória: sem ela, comparar este resultado com um futuro seria enganoso.",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      politicalConsentAt: true,
      politicalConsentWithdrawnAt: true,
      politicalConsentVersion: true,
    },
  });

  if (!user || !consentimentoPoliticoAtivo(user)) {
    if (user && consentimentoPoliticoDesatualizado(user)) {
      return NextResponse.json(
        {
          error: "CONSENT_OUTDATED",
          message:
            "O texto do consentimento para opinião política mudou. Autorize novamente para salvar novos resultados.",
          painel: "/conta",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      {
        error: "CONSENT_REQUIRED",
        message:
          "Salvar o resultado revela posicionamento político, que é dado sensível (Art. 11 da LGPD). Autorize no painel da sua conta.",
        painel: "/conta",
      },
      { status: 403 },
    );
  }

  const salvo = await prisma.spectrumResult.create({
    data: { userId, scores: limpos, versao },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ id: salvo.id, criadoEm: salvo.createdAt }, { status: 201 });
}

/** Último resultado — usado pela área do usuário e por integrações. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const ultimo = await prisma.spectrumResult.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, scores: true, versao: true, createdAt: true },
  });

  return NextResponse.json({ resultado: ultimo });
}
