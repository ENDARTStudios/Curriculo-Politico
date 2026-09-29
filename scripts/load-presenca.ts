/**
 * Load de presença em sessões deliberativas (raw → SessionAttendance).
 * Dado apenas-positivo (a API não registra ausências): usado como
 * contagem de participação, nunca como taxa de assiduidade.
 *   npm run db:load-presenca
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface AttendanceRecord {
  deputado_id: string;
  evento_id: string;
  data_sessao: string;
  tipo_sessao: string | null;
  presente: boolean;
}

async function load() {
  const rawPath = join(process.cwd(), "data", "raw", "camara_presenca_raw.json");
  const records: AttendanceRecord[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  console.log(`📥 Processando ${records.length} registros de presença...\n`);

  const pessoas = await prisma.person.findMany({
    where: { externalId: { not: null } },
    include: { terms: { orderBy: { startYear: "desc" }, take: 1 } },
  });
  const termPorExternal = new Map(
    pessoas.filter((p) => p.terms[0]).map((p) => [p.externalId!, p.terms[0]]),
  );

  let loaded = 0;
  let semData = 0;
  const vistos = new Set<string>();

  for (const r of records) {
    const term = termPorExternal.get(r.deputado_id);
    if (!term || !r.data_sessao) {
      if (!r.data_sessao) semData++;
      continue;
    }
    const dedupKey = `${term.id}:${r.evento_id}`;
    if (!r.evento_id || vistos.has(dedupKey)) continue;
    vistos.add(dedupKey);

    await prisma.sessionAttendance.upsert({
      where: {
        termId_sessionDate_externalId: {
          termId: term.id,
          sessionDate: new Date(r.data_sessao),
          externalId: r.evento_id,
        },
      },
      update: {},
      create: {
        termId: term.id,
        sessionDate: new Date(r.data_sessao),
        sessionType: r.tipo_sessao,
        present: r.presente,
        externalId: r.evento_id,
      },
    });

    loaded++;
    if (loaded % 1000 === 0) {
      console.log(`   Progresso: ${loaded}/${records.length}`);
    }
  }

  console.log(`\n🎉 ${loaded} presenças carregadas (${semData} sem data ignorados).`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
