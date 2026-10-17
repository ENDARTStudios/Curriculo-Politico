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
  /**
   * Os primeiros colocados, para a home mostrar o produto em vez de descrevê-lo.
   *
   * ── Por que existe ─────────────────────────────────────────────────────────
   * A home anterior era só texto: título, parágrafo, CTA, e depois cartões de
   * metodologia. Nada mostrava o que a plataforma entrega. A regra do conceito é
   * "o dado é o herói" — e a home não exibia dado nenhum acima da dobra.
   *
   * Estes quatro bastam para o visitante entender o produto sem clicar: nome,
   * partido, nota e Termômetro lado a lado.
   */
  destaques: Array<{
    id: string;
    nome: string;
    partido: string | null;
    cargo: string | null;
    nota: number;
    status: ReliabilityStatus;
  }>;
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
    const ordenados = [...elegiveis].sort((a, b) => b.finalScore - a.finalScore);
    const melhor = ordenados[0] ?? null;

    const paraDestaque = (n: (typeof ordenados)[number]) => ({
      id: n.term.person.id,
      nome: n.term.person.politicalName,
      partido: n.term.party?.acronym ?? null,
      cargo: n.term.office.name,
      nota: n.finalScore,
      status: n.reliabilityStatus,
    });

    return {
      politicosAvaliados: notas.length,
      notasCalculadas: notas.length,
      proposicoes,
      votacoes,
      partidos,
      cobertura,
      distribuicao,
      primeiroLugar: melhor ? paraDestaque(melhor) : null,
      // Cinco, não quatro: os quatro primeiros do ranking real estão empatados em
      // 70,0, e quatro linhas idênticas parecem defeito para quem olha. A quinta
      // posição (69,6) mostra que existe variação — sem inventar dado nenhum.
      destaques: ordenados.slice(0, 5).map(paraDestaque),
    };
  } catch {
    // Banco fora do ar, migration pendente ou credencial ausente: a faixa de
    // prova desaparece e a home continua servindo a promessa e o CTA.
    return null;
  }
}
