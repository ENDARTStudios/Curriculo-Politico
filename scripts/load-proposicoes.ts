/**
 * Load das proposições de autoria (raw → Bill + BillAuthorship).
 *   npm run db:load-proposicoes
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface BillRecord {
  deputado_id: string;
  proposicao_id: string;
  titulo: string;
  tipo: string | null;
  ano: number | null;
  data_apresentacao: string | null;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_proposicoes_raw.json");
  const bills: BillRecord[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`📥 Processando ${bills.length} proposições...\n`);

  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: null } },
    select: { id: true, externalId: true },
  });
  const personPorExternal = new Map(pessoas.map((p) => [p.externalId!, p.id]));

  let loaded = 0;
  let dedup = 0;
  const vistos = new Set<string>();

  for (const b of bills) {
    const personId = personPorExternal.get(b.deputado_id);
    if (!personId || !b.proposicao_id) continue;

    // O mesmo autor pode repetir proposição no raw (re-eleitos, crawling duplo)
    const dedupKey = `${b.proposicao_id}:${personId}`;
    if (vistos.has(dedupKey)) {
      dedup++;
      continue;
    }
    vistos.add(dedupKey);

    const bill = await prisma.bill.upsert({
      where: { externalId: b.proposicao_id },
      update: {},
      create: {
        externalId: b.proposicao_id,
        title: b.titulo || "(sem ementa)",
        type: b.tipo,
        date: b.data_apresentacao ? new Date(b.data_apresentacao) : null,
      },
    });

    await prisma.billAuthorship.upsert({
      where: { billId_personId: { billId: bill.id, personId } },
      update: {},
      create: { billId: bill.id, personId, type: "Autor" },
    });

    loaded++;
    if (loaded % 500 === 0) {
      console.log(`   Progresso: ${loaded}/${bills.length}`);
    }
  }

  console.log(`\n🎉 ${loaded} autorias carregadas (${dedup} duplicatas ignoradas).`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
