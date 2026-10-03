/**
 * Load de registros jurídicos (TCU/STF) → LegalRecord.
 * Matching por nome normalizado (mesma lib da resolução de identidade),
 * com dedupe por id determinístico. LGPD: nunca grava CPF.
 *   npm run db:load-legal
 */
import { PrismaClient, LegalStatus } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { normalizeName } from "@cp/idip";

const prisma = new PrismaClient();

interface TcuRecord {
  nome: string;
  processo: string;
  data_decisao?: string;
  orgao?: string;
}

interface StfRecord {
  numero_processo: string;
  classe?: string;
  situacao?: string;
  partes?: Array<{ nome: string; tipo?: string }>;
}

async function findPersonByNome(nome: string) {
  const norm = normalizeName(nome);
  if (!norm) return null;
  const candidates = await prisma.person.findMany({
    where: {
      OR: [
        { politicalName: { contains: nome.split(" ")[0], mode: "insensitive" } },
        { civilName: { contains: nome.split(" ")[0], mode: "insensitive" } },
      ],
    },
    select: { id: true, politicalName: true, civilName: true },
  });
  // Matching exato de nome normalizado (evita falsos positivos de homônimos parciais)
  return (
    candidates.find(
      (p) =>
        normalizeName(p.politicalName) === norm ||
        normalizeName(p.civilName) === norm,
    ) ?? null
  );
}

async function load() {
  console.log("⚖️ Carregando registros jurídicos...\n");
  let total = 0;

  // 1. TCU — contas rejeitadas (trava de integridade)
  const tcuPath = join(process.cwd(), "data", "raw", "tcu_contas_rejeitadas_raw.json");
  if (existsSync(tcuPath)) {
    const records: TcuRecord[] = JSON.parse(readFileSync(tcuPath, "utf-8"));
    console.log(`📥 TCU: ${records.length} contas rejeitadas`);
    for (const r of records) {
      if (!r.nome || !r.processo) continue;
      const person = await findPersonByNome(r.nome);
      if (!person) continue;
      await prisma.legalRecord.upsert({
        where: { id: `tcu_${person.id}_${r.processo}` },
        update: {},
        create: {
          id: `tcu_${person.id}_${r.processo}`,
          personId: person.id,
          type: "ACCOUNTS_REJECTED",
          status: "TRANSITADO_EM_JULGADO",
          court: r.orgao ? `TCU — ${r.orgao}` : "TCU",
          sourceUrl: `https://portal.tcu.gov.br/processos/${r.processo}`,
        },
      });
      total++;
    }
  } else {
    console.log("⚠️ TCU: data/raw/tcu_contas_rejeitadas_raw.json ausente (fonte bloqueada — ver apps/pipeline/etl/legal_records.py)");
  }

  // 2. STF — ações penais com foro
  const stfPath = join(process.cwd(), "data", "raw", "stf_acoes_penais_raw.json");
  if (existsSync(stfPath)) {
    const records: StfRecord[] = JSON.parse(readFileSync(stfPath, "utf-8"));
    console.log(`📥 STF: ${records.length} processos`);
    for (const r of records) {
      if (!r.numero_processo) continue;
      for (const parte of r.partes ?? []) {
        if (!parte.nome) continue;
        const person = await findPersonByNome(parte.nome);
        if (!person) continue;
        // Linguagem jurídica estrita: AP é ação penal (réu = ATIVO); não é condenação
        const type: LegalStatus =
          r.classe === "AP" ? "CRIMINAL_ACTION" : "INVESTIGATION";
        const status = (r.situacao ?? "").toLowerCase().includes("julgad")
          ? "TRANSITADO_EM_JULGADO"
          : "ATIVO";
        await prisma.legalRecord.upsert({
          where: { id: `stf_${person.id}_${r.numero_processo}` },
          update: {},
          create: {
            id: `stf_${person.id}_${r.numero_processo}`,
            personId: person.id,
            type,
            status,
            court: "STF",
            sourceUrl: `https://portal.stf.jus.br/processos/detalhe.asp?processo=${r.numero_processo}`,
          },
        });
        total++;
      }
    }
  } else {
    console.log("⚠️ STF: data/raw/stf_acoes_penais_raw.json ausente (fonte bloqueada — ver apps/pipeline/etl/legal_records.py)");
  }

  console.log(`\n✅ ${total} registros jurídicos carregados.`);
  if (total === 0) {
    console.log("   Nenhuma fonte disponível ainda — ver apps/pipeline/etl/legal_records.py para o modo manual.");
  }
}

load()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
