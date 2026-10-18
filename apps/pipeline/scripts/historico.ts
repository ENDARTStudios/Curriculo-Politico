/**
 * BOT HISTORIADOR — popula `ChangeLog` a partir dos snapshots de nota.
 *
 *   npm run bot:historico            (grava)
 *   npm run bot:historico -- --dry   (só relata)
 *
 * ── Por que partir dos snapshots ───────────────────────────────────────────
 * `ScoreSnapshot` já guarda a nota e o Termômetro de cada mês. O histórico de
 * mudanças não precisou ser inventado: ele é a **diferença entre snapshots
 * consecutivos**, materializada numa tabela consultável.
 *
 * Sem esta materialização, responder "o que mudou desde a última visita" exigiria
 * comparar snapshots em tempo de requisição — caro, e impossível de indexar por
 * data de ocorrência.
 *
 * ── O que ele NÃO faz ──────────────────────────────────────────────────────
 * Não inventa eventos que o banco não registra. Financiamento, registros
 * jurídicos e alteração de perfil **não** aparecem aqui porque não há série
 * histórica deles: `CampaignFinance` guarda o ano, `LegalRecord` guarda a data do
 * fato, mas nada guarda o "antes". Quando essas séries existirem, o mesmo formato
 * de linha serve — é por isso que `tipo` já é um enum com esses valores.
 *
 * ── Idempotência ───────────────────────────────────────────────────────────
 * A chave única `(entidade, entidadeId, campo, ocorridoEm)` faz `skipDuplicates`
 * resolver reprocessamento. Rodar dez vezes produz o mesmo resultado de rodar uma.
 */
import { PrismaClient, type ChangeEntity, type ChangeType } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

interface Mudanca {
  entidade: ChangeEntity;
  entidadeId: string;
  tipo: ChangeType;
  campo: string;
  valorAntes: string;
  valorDepois: string;
  ocorridoEm: Date;
}

function fmt(n: number): string {
  // Duas casas e ponto: é valor de máquina no log, não texto de interface. A
  // formatação pt-BR acontece na renderização, não no armazenamento.
  return n.toFixed(2);
}

async function main() {
  console.log(`\n🧾 BOT HISTORIADOR ${DRY ? "(dry-run)" : ""}\n`);

  // Um único query: snapshots de todos os termos, já com a pessoa.
  const snapshots = await prisma.scoreSnapshot.findMany({
    orderBy: [{ termId: "asc" }, { snapshotDate: "asc" }],
    select: {
      termId: true,
      snapshotDate: true,
      finalScore: true,
      confidenceScore: true,
      reliabilityStatus: true,
      term: { select: { person: { select: { id: true } } } },
    },
  });

  console.log(`   snapshots lidos: ${snapshots.length}`);

  const mudancas: Mudanca[] = [];
  let anterior: (typeof snapshots)[number] | null = null;

  for (const atual of snapshots) {
    if (anterior && anterior.termId === atual.termId) {
      const personId = atual.term.person.id;

      if (anterior.finalScore !== atual.finalScore) {
        mudancas.push({
          entidade: "PERSON",
          entidadeId: personId,
          tipo: "SCORE",
          campo: "finalScore",
          valorAntes: fmt(anterior.finalScore),
          valorDepois: fmt(atual.finalScore),
          ocorridoEm: atual.snapshotDate,
        });
      }

      if (anterior.reliabilityStatus !== atual.reliabilityStatus) {
        mudancas.push({
          entidade: "PERSON",
          entidadeId: personId,
          tipo: "STATUS",
          campo: "reliabilityStatus",
          valorAntes: anterior.reliabilityStatus,
          valorDepois: atual.reliabilityStatus,
          ocorridoEm: atual.snapshotDate,
        });
      }
    }
    anterior = atual;
  }

  console.log(`   mudanças detectadas: ${mudancas.length}`);

  const porTipo = mudancas.reduce<Record<string, number>>((acc, m) => {
    acc[m.tipo] = (acc[m.tipo] ?? 0) + 1;
    return acc;
  }, {});
  for (const [tipo, qtd] of Object.entries(porTipo)) {
    console.log(`      ${tipo}: ${qtd}`);
  }

  if (DRY) {
    const amostra = mudancas.slice(0, 5);
    for (const m of amostra) {
      console.log(
        `      ex.: ${m.entidadeId.slice(0, 8)} ${m.campo} ${m.valorAntes} → ${m.valorDepois} em ${m.ocorridoEm.toISOString().slice(0, 10)}`,
      );
    }
    console.log("\n   (dry-run: nada gravado)\n");
    return;
  }

  if (mudancas.length === 0) {
    console.log("\n   nada a gravar — o histórico já está em dia.\n");
    return;
  }

  // `createMany` com `skipDuplicates` usa a chave única como guarda: o banco
  // recusa o que já existe e o restante entra numa transação só.
  let gravadas = 0;
  const LOTE = 500;
  for (let i = 0; i < mudancas.length; i += LOTE) {
    const lote = mudancas.slice(i, i + LOTE);
    const resultado = await prisma.changeLog.createMany({
      data: lote,
      skipDuplicates: true,
    });
    gravadas += resultado.count;
    console.log(`   lote ${Math.floor(i / LOTE) + 1}: +${resultado.count}`);
  }

  const total = await prisma.changeLog.count();
  console.log(`\n   ✅ ${gravadas} nova(s) mudança(s); total na tabela: ${total}\n`);
}

main()
  .catch((e) => {
    console.error("\n❌ Falhou:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
