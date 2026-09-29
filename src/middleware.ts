import { NextRequest, NextResponse } from "next/server";

/**
 * Segurança de borda (SECURITY_BASELINE.md §1):
 * - Rate limiting 60 req/min por IP nas rotas /api/*
 * - Headers de segurança (CSP, X-Frame-Options, etc.)
 *
 * Nota serverless: o limite em memória vale por instância. A proteção
 * completa por IP vem do Cloudflare/WAF na frente do deploy.
 */

const JANELA_MS = 60_000;
const LIMITE_API = 60;

const acesso = new Map<string, { count: number; reset: number }>();

function limitar(ip: string): boolean {
  const agora = Date.now();
  const registro = acesso.get(ip);
  if (!registro || agora > registro.reset) {
    acesso.set(ip, { count: 1, reset: agora + JANELA_MS });
    return true;
  }
  registro.count++;
  return registro.count <= LIMITE_API;
}

const CSP = [
  "default-src 'self'",
  // next/image carrega fotos de fontes oficiais (Câmara, Senado) e data: p/ placeholders
  "img-src 'self' data: https:",
  // Next.js injeta scripts inline e o dev usa eval
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "desconhecido";

  let response: NextResponse;

  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (!limitar(ip)) {
      response = NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Limite de 60 requisições/minuto excedido. Tente novamente em instantes.",
        },
        { status: 429 },
      );
      response.headers.set("Retry-After", "60");
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|avatar-placeholder.svg).*)"],
};
