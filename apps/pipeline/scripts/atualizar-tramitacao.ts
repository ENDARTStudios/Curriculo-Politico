/**
 * ATUALIZAÇÃO DE TRAMITAÇÃO — popula `Bill.status` com a situação atual de
 * cada proposição da Câmara (Fase 0 da proposta de integração `ctresb/leis`,
 * ver docs/02-architecture-design/proposta-integracao-leis.md).
 *
 *   npx tsx --env-file-if-exists=apps/web/.env apps/pipeline/scripts/atualizar-tramitacao.ts
 *   npx tsx ... --limite 20        # piloto: só os 20 primeiros
 *   npx tsx ... --reprocessar      # ignora os registros recentes do checkpoint
 *
 * Fonte: GET /proposicoes/{id} → `statusProposicao` (situação corrente, não o
 * desfecho histórico — o desfecho "virou lei" é Fase 1, via /tramitacao).
 *
 * Idempotente e resumível: cada id processado ganha carimbo em
 * data/tramitacao/status-ids.json; na próxima execução, ids com carimbo mais
 * recente que --idade-dias (padrão 7) são pulados. Sem `--limite`, uma
 * passada completa nas ~33 mil proposições leva ~4,5 h a 2 req/s — rodar em
 * background, nunca em CI com timeout curto.
 */
import { PrismaClient } from "@prisma/client";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";

const prisma = new PrismaClient();

const RAIZ = resolve(__dirname, "..", "..", "..");
const DIR_ESTADO = join(RAIZ, "data", "tramitacao");
const ARQ_ESTADO = join(DIR_ESTADO, "status-ids.json");
const ARQ_FALHAS = join(DIR_ESTADO, "falhas.jsonl");

const LIMITE_ARGS = process.argv.indexOf("--limite");
const LIMITE =
  LIMITE_ARGS > -1 ? Number(process.argv[LIMITE_ARGS + 1]) || 20 : Infinity;
const REPROCESSAR = process.argv.includes("--reprocessar");
const IDADE_DIAS = 7;
const INTERVALO_MS = 500; // ~2 req/s — limite educado para a API da Câmara

interface Estado {
  [externalId: string]: string; // carimbo ISO da última atualização bem-sucedida
}

function carregarEstado(): Estado {
  if (REPROCESSAR) return {};
  if (!existsSync(ARQ_ESTADO)) return {};
  try {
    return JSON.parse(readFileSync(ARQ_ESTADO, "utf-8")) as Estado;
  } catch {
    console.warn("[tramitação] estado ilegível; recomeçando do zero");
    return {};
  }
}

function salvarEstado(estado: Estado): void {
  mkdirSync(DIR_ESTADO, { recursive: true });
  writeFileSync(ARQ_ESTADO, JSON.stringify(estado, null, 1));
}

function registrarFalha(externalId: string, erro: string): void {
  mkdirSync(DIR_ESTADO, { recursive: true });
  const linha = JSON.stringify({
    quando: new Date().toISOString(),
    externalId,
    erro,
  });
  appendFileSync(ARQ_FALHAS, linha + "\n");
}

/** Status legível para o cidadão a partir de `statusProposicao`. */
function statusLegivel(s: {
  descricaoSituacao: string | null;
  descricaoTramitacao: string | null;
}): string | null {
  return s.descricaoSituacao ?? s.descricaoTramitacao;
}

async function buscarStatus(externalId: string): Promise<{
  situacao: string | null;
  erro?: string;
}> {
  const res = await fetch(
    `https://dadosabertos.camara.leg.br/api/v2/proposicoes/${externalId}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "CurriculoPolitico/1.0 (contato@curriculopolitico.org)",
      },
    },
  );
  if (!res.ok) return { situacao: null, erro: `HTTP ${res.status}` };
  const json = (await res.json()) as {
    dados: { statusProposicao?: { descricaoSituacao: string | null; descricaoTramitacao: string | null } | null };
  };
  const s = json.dados?.statusProposicao;
  if (!s) return { situacao: null };
  return { situacao: statusLegivel(s) };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const estado = carregarEstado();
  const cutoff = Date.now() - IDADE_DIAS * 24 * 60 * 60 * 1000;

  const bills = await prisma.bill.findMany({
    where: { externalId: { not: null } },
    select: { id: true, externalId: true },
    orderBy: { id: "asc" },
  });

  const pendentes = bills.filter((b) => {
    const carimbo = estado[b.externalId!];
    return !carimbo || new Date(carimbo).getTime() < cutoff;
  });

  const alvo = pendentes.slice(0, LIMITE);
  console.log(
    `[tramitação] ${bills.length} proposições com externalId · ${pendentes.length} pendentes · processando ${alvo.length}` +
      (LIMITE < Infinity ? ` (--limite ${LIMITE})` : ""),
  );

  let ok = 0;
  let falhas = 0;
  let semStatus = 0;
  const t0 = Date.now();

  for (const [i, bill] of alvo.entries()) {
    const externalId = bill.externalId!;
    try {
      const { situacao, erro } = await buscarStatus(externalId);
      if (erro) {
        falhas++;
        registrarFalha(externalId, erro);
      } else if (situacao) {
        await prisma.bill.update({
          where: { id: bill.id },
          data: { status: situacao },
        });
        estado[externalId] = new Date().toISOString();
        ok++;
      } else {
        // proposição sem statusProposicao (p. ex. medida provisória arquivada
        // sem tramitação registrada): registra como nulo para não rebuscar
        estado[externalId] = new Date().toISOString();
        semStatus++;
      }
    } catch (e) {
      falhas++;
      registrarFalha(externalId, e instanceof Error ? e.message : String(e));
    }

    if ((i + 1) % 100 === 0) {
      const ritmo = (i + 1) / ((Date.now() - t0) / 60_000);
      console.log(
        `[tramitação] ${i + 1}/${alvo.length} · ok ${ok} · sem status ${semStatus} · falhas ${falhas} · ${ritmo.toFixed(0)} req/min`,
      );
      salvarEstado(estado);
    }
    await dormir(INTERVALO_MS);
  }

  salvarEstado(estado);
  console.log(
    `[tramitação] fim: ${ok} atualizadas, ${semStatus} sem status, ${falhas} falhas (detalhes em data/tramitacao/falhas.jsonl)`,
  );
}

main()
  .catch((e) => {
    console.error("[tramitação] erro fatal:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
