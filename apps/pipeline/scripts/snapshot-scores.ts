/**
 * Snapshot mensal do IDIP para o Rastreamento Temporal (/metodologia).
 * Rodar todo fim de mês (cron); re-execuções são idempotentes.
 *   npm run db:snapshot
 *
 * A data do snapshot vem de `monthSnapshotDate()` — ver snapshot-date.ts para
 * o motivo de não usar mais o último dia do mês no fuso do executor.
 */
import { PrismaClient } from "@prisma/client";
import { isoUtcDay, monthSnapshotDate } from "./snapshot-date";

const prisma = new PrismaClient();

async function snapshot() {
  const snapshotDate = monthSnapshotDate();

  console.log(`📸 Gerando snapshot de ${isoUtcDay(snapshotDate)}...\n`);

  // GRAY usa baseline provisório — não vale como histórico
  const scores = await prisma.score.findMany({
    where: { reliabilityStatus: { not: "GRAY" } },
    select: {
      termId: true,
      finalScore: true,
      confidenceScore: true,
      reliabilityStatus: true,
      integrityScore: true,
      productivityScore: true,
      transparencyScore: true,
    },
  });

  const breakdown = (s: (typeof scores)[number]) => ({
    integrity: s.integrityScore,
    productivity: s.productivityScore,
    transparency: s.transparencyScore,
  });

  const data = scores.map((s) => ({
    termId: s.termId,
    snapshotDate,
    finalScore: s.finalScore,
    confidenceScore: s.confidenceScore,
    reliabilityStatus: s.reliabilityStatus,
    breakdown: breakdown(s),
  }));

  /*
    ── Mês corrente: atualiza. Meses passados: nunca.

    A versão anterior usava `skipDuplicates` para tudo, o que era idempotente mas
    **errado dentro do mês**: se a nota mudasse no dia 18 (trava de integridade,
    recálculo, correção de dado), o snapshot do dia 1 continuava com o valor
    antigo. O site mostrava 39,9 e o histórico dizia 66,8 para a mesma data —
    exatamente o tipo de divergência que a plataforma não pode ter.

    Pior: `bot:historico` deriva de snapshots, então a mudança **não aparecia em
    "novidades"** nenhuma. Foi assim que o problema apareceu — carreguei três
    registros do TCU, apliquei as travas, e o bot reportou "+0 mudanças".

    A regra agora:
    - snapshot do mês corrente → `upsert`, porque o mês ainda está em curso;
    - snapshots de meses anteriores → intocados, porque reescrever passado é
      reescrever história.
  */
  const inicioDoMes = Date.UTC(
    snapshotDate.getUTCFullYear(),
    snapshotDate.getUTCMonth(),
    1,
  );
  const doMesCorrente = (d: Date) => d.getTime() >= inicioDoMes;

  let criados = 0;
  let atualizados = 0;

  for (const linha of data) {
    if (!doMesCorrente(snapshotDate)) {
      // Salvaguarda: nunca sobrescrever mês fechado, mesmo se a data mudar.
      continue;
    }

    const anterior = await prisma.scoreSnapshot.findUnique({
      where: { termId_snapshotDate: { termId: linha.termId, snapshotDate } },
      select: { finalScore: true, reliabilityStatus: true },
    });

    if (!anterior) {
      await prisma.scoreSnapshot.create({ data: linha });
      criados++;
      continue;
    }

    // Só escreve se algo mudou — evita `updatedAt`/ruído em execução repetida.
    if (
      anterior.finalScore !== linha.finalScore ||
      anterior.reliabilityStatus !== linha.reliabilityStatus
    ) {
      await prisma.scoreSnapshot.update({
        where: { termId_snapshotDate: { termId: linha.termId, snapshotDate } },
        data: {
          finalScore: linha.finalScore,
          confidenceScore: linha.confidenceScore,
          reliabilityStatus: linha.reliabilityStatus,
          breakdown: linha.breakdown,
        },
      });
      atualizados++;
    }
  }

  console.log(
    `✅ ${criados} snapshot(s) criado(s), ${atualizados} atualizado(s) no mês corrente (de ${scores.length} scores não-GRAY).`,
  );
}

snapshot()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
