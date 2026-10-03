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

function emChunks<T>(arr: T[], tamanho: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += tamanho) {
    chunks.push(arr.slice(i, i + tamanho));
  }
  return chunks;
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

  // Dedup no raw (mesmo parlamentar + evento repetido no crawling)
  let semData = 0;
  const vistos = new Map<string, { termId: string; sessionDate: Date; sessionType: string | null; present: boolean; externalId: string }>();

  for (const r of records) {
    const term = termPorExternal.get(r.deputado_id);
    if (!term || !r.data_sessao || !r.evento_id) {
      if (!r.data_sessao) semData++;
      continue;
    }
    const dedupKey = `${term.id}:${r.evento_id}`;
    if (vistos.has(dedupKey)) continue;

    vistos.set(dedupKey, {
      termId: term.id,
      sessionDate: new Date(r.data_sessao),
      sessionType: r.tipo_sessao,
      present: r.presente,
      externalId: r.evento_id,
    });
  }

  // Pula o que já está no banco (chave composta termId+sessionDate+externalId)
  const chavesExistentes = new Set(
    (
      await prisma.sessionAttendance.findMany({
        select: { termId: true, sessionDate: true, externalId: true },
      })
    ).map((a) => `${a.termId}:${a.sessionDate.toISOString()}:${a.externalId}`),
  );

  const novos = [...vistos.values()].filter((reg) => {
    const chave = `${reg.termId}:${reg.sessionDate.toISOString()}:${reg.externalId}`;
    return !chavesExistentes.has(chave);
  });

  console.log(
    `   ${chavesExistentes.size} já existem, ${novos.length} novos` +
      ` (${semData} sem data ignorados)`,
  );

  for (const chunk of emChunks(novos, 1000)) {
    await prisma.sessionAttendance.createMany({ data: chunk, skipDuplicates: true });
  }

  console.log(`\n🎉 ${novos.length} presenças carregadas.`);
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
