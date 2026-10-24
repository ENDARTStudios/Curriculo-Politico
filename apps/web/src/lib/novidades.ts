import { prisma } from "@/lib/prisma";

/**
 * "O que mudou desde sua última visita".
 *
 * ── A pergunta, e por que ela é difícil ────────────────────────────────────
 * A plataforma já sabe quando uma nota mudou (`ChangeLog`, populado pelo
 * `bot:historico`). O que faltava era o recorte **por pessoa**: mostrar apenas o
 * que mudou nas entidades que ela acompanha, e apenas depois da última vez que
 * ela disse ter visto.
 *
 * ── Marcador de leitura, não de acesso ─────────────────────────────────────
 * `User.novidadesVistasEm` só avança quando a pessoa clica em "marcar como
 * visto". Abrir a dashboard não apaga nada: quem entra, olha por cima e sai
 * perderia justamente o que precisava ler. Esse é o erro clássico de feed —
 * tratar abertura como leitura.
 *
 * `NULL` significa "nunca marcou", e a interface mostra desde o início em vez de
 * esconder tudo.
 *
 * ── Limite honesto ─────────────────────────────────────────────────────────
 * O histórico hoje só registra **nota** e **Termômetro** de político, porque é o
 * que `ScoreSnapshot` guarda em série. Partido e projeto não produzem eventos
 * ainda; quando produzirem, entram aqui sem mudar esta consulta — ela junta pelo
 * par (entidade, entidadeId) dos acompanhamentos.
 */

export interface Novidade {
  id: string;
  ocorridoEm: Date;
  tipo: "SCORE" | "STATUS" | "FINANCE" | "LEGAL" | "PROFILE";
  campo: string;
  valorAntes: string | null;
  valorDepois: string | null;
  /** Para onde leva o clique. */
  href: string;
  /** Nome da entidade no momento da consulta. */
  rotulo: string;
}

export interface ResumoNovidades {
  total: number;
  desde: Date | null;
  novidades: Novidade[];
  /** Entidades seguidas que têm histórico disponível. */
  cobertas: number;
}

const LIMITE = 30;

export async function novidadesParaUsuario(userId: string): Promise<ResumoNovidades> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { novidadesVistasEm: true },
  });

  const desde = user?.novidadesVistasEm ?? null;

  const follows = await prisma.follow.findMany({
    where: { userId },
    select: {
      person: { select: { id: true, politicalName: true } },
      party: { select: { id: true, acronym: true } },
      bill: { select: { id: true, title: true } },
    },
  });

  // Mapa id → rótulo e href, para não consultar entidade por entidade depois.
  const alvos = new Map<string, { rotulo: string; href: string }>();
  for (const f of follows) {
    if (f.person) {
      alvos.set(f.person.id, {
        rotulo: f.person.politicalName,
        href: `/politicos/${f.person.id}`,
      });
    }
    if (f.party) {
      alvos.set(f.party.id, {
        rotulo: f.party.acronym,
        href: `/partidos/${encodeURIComponent(f.party.acronym)}`,
      });
    }
    if (f.bill) {
      alvos.set(f.bill.id, { rotulo: f.bill.title, href: `/projetos/${f.bill.id}` });
    }
  }

  if (alvos.size === 0) {
    return { total: 0, desde, novidades: [], cobertas: 0 };
  }

  const registros = await prisma.changeLog.findMany({
    where: {
      entidadeId: { in: [...alvos.keys()] },
      ...(desde ? { ocorridoEm: { gt: desde } } : {}),
    },
    orderBy: { ocorridoEm: "desc" },
    take: LIMITE,
    select: {
      id: true,
      entidadeId: true,
      ocorridoEm: true,
      tipo: true,
      campo: true,
      valorAntes: true,
      valorDepois: true,
    },
  });

  const cobertas = new Set(registros.map((r) => r.entidadeId)).size;

  const novidades: Novidade[] = [];
  for (const r of registros) {
    const alvo = alvos.get(r.entidadeId);
    // Sem rótulo = a entidade deixou de existir e o histórico sobreviveu (é o
    // comportamento desejado do log, mas não há para onde linkar).
    if (!alvo) continue;
    novidades.push({
      id: r.id,
      ocorridoEm: r.ocorridoEm,
      tipo: r.tipo,
      campo: r.campo,
      valorAntes: r.valorAntes,
      valorDepois: r.valorDepois,
      href: alvo.href,
      rotulo: alvo.rotulo,
    });
  }

  return { total: novidades.length, desde, novidades, cobertas };
}

/** Avança o marcador de leitura até agora. */
export async function marcarNovidadesVistas(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { novidadesVistasEm: new Date() },
  });
}
