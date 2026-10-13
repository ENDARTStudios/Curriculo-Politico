import { NextResponse } from "next/server";

/**
 * Contrato de erro de banco para as rotas de API.
 *
 * ── Por que isto existe ─────────────────────────────────────────────────────
 * `try/catch` em volta da consulta estava implementado em apenas 5 das 10 rotas
 * (`rankings`, `politicians/[id]`, `account`, `auth/register`, `retificacao`).
 * Nas outras — `search`, `bills`, `compare`, `consent`, `bills/[id]/vote` — uma
 * falha do Prisma subia como 500 genérico do Next, então o mesmo incidente tinha
 * duas respostas diferentes conforme a rota, e a interface não podia tratar
 * "banco fora do ar" de forma consistente.
 *
 * Centralizar evita a terceira variação da mesma mensagem e garante que a
 * mensagem não vaze instrução de desenvolvimento para produção.
 */

/**
 * Resposta 503 padronizada.
 *
 * A mensagem é neutra de ambiente de propósito. A versão anterior dizia
 * "Suba o Postgres com: docker compose up -d db" — instrução de
 * desenvolvimento servida em produção a um cliente de API, que não tem como
 * executar isso e não deveria ver detalhe de infraestrutura. O log do servidor
 * continua registrando a causa; o cliente recebe o suficiente para reagir
 * (tentar de novo) e nada que exponha topologia.
 */
export function bancoIndisponivel(contexto: string): NextResponse {
  console.error(`[api] banco indisponível em ${contexto}`);
  return NextResponse.json(
    {
      error: "BANCO_INDISPONIVEL",
      message:
        "Serviço temporariamente indisponível. Tente novamente em alguns instantes.",
    },
    { status: 503 },
  );
}
