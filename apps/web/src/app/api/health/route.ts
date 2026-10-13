import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Health check verificável por máquina.
 *
 * ── Por que existe ──────────────────────────────────────────────────────────
 * Não havia `/api/health`. O smoke de produção contornava isso lendo a página
 * `/status` e procurando a **string literal "Indisponível"** com `grep` — um
 * acoplamento que quebra silenciosamente: basta renomear o rótulo na interface
 * para o monitor passar a dar falso negativo, e ninguém percebe até o site cair.
 * Aqui a checagem é o próprio dado, não a apresentação dele.
 *
 * ── O que mede ──────────────────────────────────────────────────────────────
 * Não basta o processo estar de pé: um banco inacessível derruba todas as
 * páginas com dados enquanto o servidor responde 200. Então a checagem central é
 * uma **consulta real** ao banco, além de verificar que o ranking tem conteúdo —
 * uma plataforma de transparência sem nota publicada está degradada mesmo com
 * infraestrutura saudável.
 *
 * ── Por que 503 e não 200 com "status": "degraded" ──────────────────────────
 * Monitor externo (UptimeRobot, Vercel Cron, uptime de terceiros) decide por
 * código HTTP. Devolver 200 com corpo degradado faz o monitor considerar tudo
 * bem e não alertar, que é o modo de falha mais perigoso.
 */
export async function GET(request: NextRequest) {
  // Proteção opcional por segredo, para quando o endpoint for exposto a um
  // agendador. Sem `CRON_SECRET` configurado, permanece público — um health
  // check público é aceitável e útil; o que não pode é vazar detalhe interno.
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const autorizacao = request.headers.get("authorization");
    if (autorizacao !== `Bearer ${segredo}`) {
      return NextResponse.json({ error: "NAO_AUTORIZADO" }, { status: 401 });
    }
  }

  const inicio = Date.now();
  const checagens: Array<{ nome: string; ok: boolean; detalhe?: string }> = [];

  // 1. Banco acessível — consulta real, não ping de processo.
  let totalPoliticos = 0;
  try {
    totalPoliticos = await prisma.person.count();
    checagens.push({ nome: "banco", ok: true, detalhe: `${totalPoliticos} pessoas` });
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message.split("\n")[0] : "erro";
    console.error("[health] banco inacessível:", detalhe);
    checagens.push({ nome: "banco", ok: false, detalhe: "inacessível" });
    return resposta(503, false, checagens, inicio);
  }

  // 2. Base vazia é degradação para uma plataforma de dados públicos.
  checagens.push({
    nome: "base-com-dados",
    ok: totalPoliticos > 0,
    detalhe: `${totalPoliticos} registros`,
  });

  // 3. O ranking precisa ter ao menos uma nota publicada: infraestrutura
  //    saudável com ranking vazio ainda é produto quebrado.
  let noRanking = 0;
  try {
    noRanking = await prisma.score.count({ where: { confidenceScore: { gte: 60 } } });
    checagens.push({
      nome: "ranking-com-notas",
      ok: noRanking > 0,
      detalhe: `${noRanking} elegíveis`,
    });
  } catch {
    checagens.push({ nome: "ranking-com-notas", ok: false, detalhe: "consulta falhou" });
  }

  const ok = checagens.every((c) => c.ok);
  return resposta(ok ? 200 : 503, ok, checagens, inicio);
}

function resposta(
  status: number,
  ok: boolean,
  checagens: Array<{ nome: string; ok: boolean; detalhe?: string }>,
  inicio: number,
): NextResponse {
  return NextResponse.json(
    {
      ok,
      duracaoMs: Date.now() - inicio,
      checagens,
      // `cache-control: no-store` é obrigatório: um health check cacheado é pior
      // que nenhum, porque reporta um estado que já passou.
    },
    { status, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
