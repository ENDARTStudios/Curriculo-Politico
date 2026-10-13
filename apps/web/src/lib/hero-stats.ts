import type { ReliabilityStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { STATUS_ORDEM } from "./status-visual";

/**
 * Números de prova social da home.
 *
 * ── Por que cada número existe ──────────────────────────────────────────────
 * A home precisa provar a promessa com fatos verificáveis (estágio "Prova" do
 * funil, ver `.dsh/skills/curriculo-marketing-funnel`). Mas provar não é
 * encher de cifras: cada número aqui responde a uma pergunta que o eleitor
 * faria, e nenhum número decorativo entra.
 *
 * - `politicosAvaliados` — "quantas pessoas eu consigo conferir?" É a medida
 *   honesta do alcance real. Conta **termos com nota calculada**, não o total
 *   de pessoas cadastradas: alguém cadastrado sem nota não ajuda ninguém, e
 *   exibir esse total inflado seria propaganda enganosa.
 * - `notasCalculadas` — "quanto trabalho de auditoria há por trás disto?"
 * - `proposicoes` — "dá para ver o que eles realmente fizeram?"
 * - `votacoes` — o mesmo, pelo lado das decisões registradas.
 * - `partidos` — "dá para comparar as legendas também?"
 * - `cobertura` — a fração acima mostra honestidade metodológica: quantos dos
 *   avaliados têm dados suficientes para entrar no ranking. Sem isso, o
 *   visitante não sabe que existe um critério de corte.
 * - `distribuicao` — quantos estão em cada estado do Termômetro.
 * - `primeiroLugar` — o "Exemplo" concreto do funil: uma pessoa nomeada com
 *   nota e estado, provando que a plataforma funciona de ponta a ponta.
 *
 * ── Contrato de falha ───────────────────────────────────────────────────────
 * A prova é opcional; a página não é. Qualquer erro de banco devolve `null` e a
 * faixa simplesmente não é renderizada. O mesmo vale para banco vazio: nunca
 * mostramos "0 políticos avaliados", porque isso destrói a credibilidade em vez
 * de construí-la. Ver `HeroStats.tsx`, que aplica esse corte.
 */
export interface NumerosHero {
  politicosAvaliados: number;
  notasCalculadas: number;
  proposicoes: number;
  votacoes: number;
  partidos: number;
  /** Percentual (0–100) dos avaliados que entraram no ranking. */
  cobertura: number;
  /** Quantidade por estado do Termômetro. */
  distribuicao: Record<ReliabilityStatus, number>;
  primeiroLugar: {
    id: string;
    nome: string;
    partido: string | null;
    cargo: string | null;
    nota: number;
    status: ReliabilityStatus;
  } | null;
}

const DISTRIBUICAO_VAZIA: Record<ReliabilityStatus, number> = {
  GREEN: 0,
  YELLOW: 0,
  RED: 0,
  GRAY: 0,
};

export async function carregarNumerosHero(): Promise<NumerosHero | null> {
  try {
    // 1) Quais termos têm nota calculada — a definição de "avaliado".
    //    `groupBy` faz a distinct no banco em vez de trazer todas as linhas de
    //    Score para memória.
    const termosComNota = await prisma.score.groupBy({ by: ["termId"] });
    const termIds = termosComNota.map((t) => t.termId);

    if (termIds.length === 0) {
      // Banco sem nenhuma nota: não há prova a exibir. Dizemos isso com `null`
      // em vez de renderizar zeros.
      return null;
    }

    // 2) Contagens independentes em paralelo. As notas são filtradas pelos
    //    termos avaliados para que cobertura e distribuição falem do mesmo
    //    universo de `politicosAvaliados`.
    const [notas, proposicoes, votacoes, partidos] = await Promise.all([
      prisma.score.findMany({
        where: { termId: { in: termIds } },
        select: {
          finalScore: true,
          reliabilityStatus: true,
          term: {
            select: {
              person: { select: { id: true, politicalName: true } },
              party: { select: { acronym: true } },
              office: { select: { name: true } },
            },
          },
        },
      }),
      prisma.bill.count(),
      prisma.legislativeAction.count(),
      prisma.party.count(),
    ]);

    // 3) Distribuição por estado do Termômetro (o enum é fechado; inicializar
    //    por STATUS_ORDEM garante que nenhum estado fique de fora).
    const distribuicao = { ...DISTRIBUICAO_VAZIA };
    for (const nota of notas) {
      distribuicao[nota.reliabilityStatus] += 1;
    }

    // 4) Cobertura = quanto do universo tem dados suficientes para o ranking.
    const noRanking = STATUS_ORDEM.filter((s) => s !== "GRAY").reduce(
      (total, s) => total + distribuicao[s],
      0,
    );
    const cobertura = Math.round((noRanking / notas.length) * 100);

    // 5) O melhor colocado entre os que entraram no ranking (GRAY fica de fora:
    //    sem dados suficientes, não é exemplo de nada).
    const elegiveis = notas.filter((n) => n.reliabilityStatus !== "GRAY");
    const melhor = elegiveis.reduce<(typeof elegiveis)[number] | null>(
      (atual, candidato) =>
        atual === null || candidato.finalScore > atual.finalScore
          ? candidato
          : atual,
      null,
    );

    return {
      politicosAvaliados: notas.length,
      notasCalculadas: notas.length,
      proposicoes,
      votacoes,
      partidos,
      cobertura,
      distribuicao,
      primeiroLugar: melhor
        ? {
            id: melhor.term.person.id,
            nome: melhor.term.person.politicalName,
            partido: melhor.term.party?.acronym ?? null,
            cargo: melhor.term.office.name,
            nota: melhor.finalScore,
            status: melhor.reliabilityStatus,
          }
        : null,
    };
  } catch {
    // Banco fora do ar, migration pendente ou credencial ausente: a faixa de
    // prova desaparece e a home continua servindo a promessa e o CTA.
    return null;
  }
}
