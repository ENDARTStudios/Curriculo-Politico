import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma único do pipeline.
 *
 * ── Por que existe ────────────────────────────────────────────────────────
 * Antes, **39 lugares** faziam `new PrismaClient()` — um por script. Cada um
 * abria sua própria conexão, e qualquer mudança de configuração de banco (URL de
 * pooler, `connection_limit`, log de query) precisaria ser repetida em todos.
 *
 * Com o Prisma 7 o construtor passa a exigir um *driver adapter*
 * (`new PrismaClient({ adapter })`). Sem centralização, essa migração seria 39
 * edições com 39 chances de divergir. Com ela, é uma.
 *
 * ── Por que cachear em `globalThis` ───────────────────────────────────────
 * É o mesmo padrão de `apps/web/src/lib/prisma.ts`, e o motivo é o mesmo: recarga
 * a quente (tsx --watch, testes) recria o módulo, e sem o cache cada recarga
 * deixaria mais um pool de conexões aberto até o Postgres recusar.
 *
 * O nome da chave (`prismaPipeline`) é distinto do usado na web para que os dois
 * contextos — servidor Next e script de carga — não compartilhem instância por
 * acidente se algum dia rodarem juntos no mesmo processo.
 *
 * ── O que este arquivo NÃO faz ────────────────────────────────────────────
 * Não lê `DATABASE_URL` nem decide modo de conexão: isso continua sendo
 * responsabilidade do `schema.prisma` (via `env`) até a migração para Prisma 7,
 * que moverá as URLs para `prisma.config.ts`. Centralizar aqui não antecipa
 * aquela decisão — só reduz o número de lugares onde ela importa.
 */

const globalForPrisma = globalThis as unknown as {
  prismaPipeline?: PrismaClient;
};

export const prisma = globalForPrisma.prismaPipeline ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPipeline = prisma;
}
