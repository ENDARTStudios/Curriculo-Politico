import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Segurança de borda (SECURITY_BASELINE.md §1):
 *
 * Rate limiting por Token Bucket (permite picos legítimos, recarga contínua):
 * - Tier geral: 60 req/min em /api/* — chave = usuário autenticado (JWT
 *   NextAuth) e, na ausência de sessão, IP.
 * - Tier crítico: 10 req/min em POST /api/auth/register e callbacks de
 *   login (credentials/OAuth) — mitigação de brute-force e sybil.
 *
 * Resposta padronizada: 429 + Retry-After + X-RateLimit-Limit/Remaining.
 *
 * Nota serverless: os baldes são em memória, por instância — o limite vale
 * "por instância-visita". A proteção completa e distribuída por IP vem do
 * Cloudflare/WAF na frente do deploy.
 */

const JANELA_MS = 60_000;
const TIER_GERAL = 60;
const TIER_CRITICO = 10;

interface Balde {
  tokens: number;
  ultima: number;
}

const baldes = new Map<string, Balde>();

/** Tier crítico = tentativas de autenticação/criação de conta. */
function limitePara(path: string, method: string): number {
  const rotaCritica =
    (method === "POST" && /^\/api\/auth\/(register|callback)\b/.test(path)) ||
    (method === "GET" && /^\/api\/auth\/callback\b/.test(path));
  return rotaCritica ? TIER_CRITICO : TIER_GERAL;
}

/**
 * Consome 1 token do balde da chave. Capacidade = limite (burst total no
 * instante inicial), recarga linear de `limite` tokens por janela.
 */
function consumir(
  chave: string,
  limite: number,
): { ok: boolean; restante: number; retryAfterSeg: number } {
  const agora = Date.now();
  const taxaPorMs = limite / JANELA_MS;

  let balde = baldes.get(chave);
  if (!balde) {
    balde = { tokens: limite, ultima: agora };
    baldes.set(chave, balde);
  }
  balde.tokens = Math.min(limite, balde.tokens + (agora - balde.ultima) * taxaPorMs);
  balde.ultima = agora;

  if (balde.tokens >= 1) {
    balde.tokens -= 1;
    return { ok: true, restante: Math.floor(balde.tokens), retryAfterSeg: 0 };
  }
  const msAteProximo = (1 - balde.tokens) / taxaPorMs;
  return {
    ok: false,
    restante: 0,
    retryAfterSeg: Math.max(1, Math.ceil(msAteProximo / 1000)),
  };
}

/** Expurga baldes ociosos (2 janelas sem uso) para conter memória sob flood. */
function expurgar(agora: number): void {
  if (baldes.size < 5_000) return;
  for (const [chave, balde] of baldes) {
    if (agora - balde.ultima > JANELA_MS * 2) baldes.delete(chave);
  }
}

/** Identidade: id do usuário no JWT NextAuth (https usa cookie __Secure-). */
async function identidade(request: NextRequest): Promise<string> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "desconhecido";
  const cookieSessao = request.cookies.has("__Secure-next-auth.session-token")
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: cookieSessao,
    });
    const userId = (token as { id?: string } | null)?.id;
    return userId ? `u:${userId}` : `ip:${ip}`;
  } catch {
    return `ip:${ip}`;
  }
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

export async function middleware(request: NextRequest) {
  const agora = Date.now();
  let response: NextResponse;

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const limite = limitePara(request.nextUrl.pathname, request.method);
    const chave = await identidade(request);
    const resultado = consumir(`${limite}:${chave}`, limite);
    expurgar(agora);

    if (!resultado.ok) {
      response = NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: `Limite de ${limite} requisições/minuto excedido. Tente novamente em instantes.`,
        },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(resultado.retryAfterSeg));
    } else {
      response = NextResponse.next();
    }
    response.headers.set("X-RateLimit-Limit", String(limite));
    response.headers.set("X-RateLimit-Remaining", String(resultado.restante));
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
