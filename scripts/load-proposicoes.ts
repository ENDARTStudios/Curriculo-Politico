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

function emChunks<T>(arr: T[], tamanho: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += tamanho) {
    chunks.push(arr.slice(i, i + tamanho));
  }
  return chunks;
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

  // Dedup no raw: 1 registro por proposição (dados da 1ª ocorrência) +
  // conjunto de pares (proposição, autor)
  const billPorId = new Map<
    string,
    { externalId: string; title: string; type: string | null; date: Date | null }
  >();
  const paresAutoria = new Set<string>();

  let semAutor = 0;
  for (const b of bills) {
    const personId = personPorExternal.get(b.deputado_id);
    if (!personId || !b.proposicao_id) {
      semAutor++;
      continue;
    }
    if (!billPorId.has(b.proposicao_id)) {
      billPorId.set(b.proposicao_id, {
        externalId: b.proposicao_id,
        title: b.titulo || "(sem ementa)",
        type: b.tipo,
        date: b.data_apresentacao ? new Date(b.data_apresentacao) : null,
      });
    }
    paresAutoria.add(`${b.proposicao_id}:${personId}`);
  }

  // 1) Cria apenas as Bills que ainda não existem (createMany + skipDuplicates)
  const existentes = new Set(
    (
      await prisma.bill.findMany({
        where: { externalId: { in: [...billPorId.keys()] } },
        select: { externalId: true },
      })
    ).map((b) => b.externalId),
  );
  const novasBills = [...billPorId.values()].filter(
    (b) => !existentes.has(b.externalId),
  );
  console.log(
    `   Bills: ${existentes.size} já existem, ${novasBills.length} novas`,
  );
  for (const chunk of emChunks(novasBills, 500)) {
    await prisma.bill.createMany({ data: chunk, skipDuplicates: true });
  }

  // 2) Resolve ids das proposições referenciadas pelas autorias
  const idsNecessarios = [
    ...new Set([...paresAutoria].map((p) => p.split(":")[0])),
  ];
  const billRows = await prisma.bill.findMany({
    where: { externalId: { in: idsNecessarios } },
    select: { id: true, externalId: true },
  });
  const billIdPorExternal = new Map(billRows.map((b) => [b.externalId, b.id]));

  // 3) Autorias novas em lote
  const autoriasExistentes = new Set(
    (
      await prisma.billAuthorship.findMany({
        select: { billId: true, personId: true },
      })
    ).map((a) => `${a.billId}:${a.personId}`),
  );
  const novasAutorias: { billId: string; personId: string; type: string }[] = [];
  for (const par of paresAutoria) {
    const [externalId, personId] = par.split(":");
    const billId = billIdPorExternal.get(externalId);
    if (!billId) continue;
    const chave = `${billId}:${personId}`;
    if (autoriasExistentes.has(chave)) continue;
    novasAutorias.push({ billId, personId, type: "Autor" });
  }
  console.log(`   Autorias: ${autoriasExistentes.size} já existem, ${novasAutorias.length} novas`);
  for (const chunk of emChunks(novasAutorias, 1000)) {
    await prisma.billAuthorship.createMany({ data: chunk, skipDuplicates: true });
  }

  console.log(
    `\n🎉 ${novasBills.length} bills + ${novasAutorias.length} autorias criadas` +
      ` (${semAutor} registros sem autor ignorados).`,
  );
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
