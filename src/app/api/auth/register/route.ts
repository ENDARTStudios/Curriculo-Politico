import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
  POLITICAL_CONSENT_VERSION,
} from "@/lib/consent";

/**
 * POST /api/auth/register — cria conta credentials (email + senha bcrypt).
 *
 * LGPD:
 * - Clickwrap: aceite expresso de Termos + Privacidade via checkbox, gravado
 *   com versão e timestamp (Art. 8º — prova do consentimento).
 * - Declaração de maioridade (18+) obrigatória.
 * - Consentimento ESPECÍFICO p/ dado sensível (opinião política) é OPCIONAL
 *   e granular: sem ele a conta é criada normalmente, mas não pode votar
 *   (gate na API de voto).
 */
export async function POST(request: NextRequest) {
  let body: {
    email?: string;
    password?: string;
    name?: string;
    termsAccepted?: boolean;
    adult?: boolean;
    politicalConsent?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim() || null;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "EMAIL_INVALIDO" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "SENHA_CURTA", message: "A senha precisa de pelo menos 8 caracteres." },
      { status: 400 },
    );
  }
  if (!body.termsAccepted) {
    return NextResponse.json(
      {
        error: "TERMS_REQUIRED",
        message: "É preciso aceitar os Termos de Uso e a Política de Privacidade.",
      },
      { status: 400 },
    );
  }
  if (!body.adult) {
    return NextResponse.json(
      {
        error: "ADULT_REQUIRED",
        message: "A Plataforma é restrita a maiores de 18 anos.",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "EMAIL_EM_USO", message: "Este e-mail já possui conta. Faça login." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const agora = new Date();
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: passwordHash,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: agora,
      // Consentimento específico (dado sensível) — opcional e granular
      ...(body.politicalConsent
        ? {
            politicalConsentVersion: POLITICAL_CONSENT_VERSION,
            politicalConsentAt: agora,
          }
        : {}),
    },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
