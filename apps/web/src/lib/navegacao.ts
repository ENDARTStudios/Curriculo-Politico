import type { ChaveDicionario } from "@/lib/i18n/dicionarios";

/**
 * Arquitetura de informação do site.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * A barra superior tinha **12 links planos** num `flex-wrap`, sem agrupamento e
 * sem hierarquia. O problema não era o número de destinos — eram 28 no site. Era
 * a **falta de modelo**: toda rota tinha o mesmo peso visual.
 *
 * Este arquivo é a fonte única. Header, drawer mobile e rodapé leem daqui, então
 * não há como divergirem.
 *
 * ── Por que guarda CHAVES, e não rótulos ───────────────────────────────────
 * Com três idiomas, um rótulo fixo aqui obrigaria a duplicar a estrutura inteira
 * no dicionário. Guardando a chave (`nav.ranking`), a navegação é a mesma nos
 * três idiomas e o texto vem de `t()`. O guard `verify:i18n` confere que toda
 * chave usada existe nos três dicionários.
 */

export type ItemNav = {
  href: string;
  chaveRotulo: ChaveDicionario;
  /** Chave da linha explicativa. Só aparece no submenu e no drawer. */
  chaveDescricao?: ChaveDicionario;
};

export type GrupoNav = {
  id: string;
  chaveRotulo: ChaveDicionario;
  /** Link direto: o grupo não abre submenu. */
  href?: string;
  /** Submenu. Quando presente, `href` é ignorado no topo. */
  itens?: ItemNav[];
};

/** Os cinco grupos primários. */
export const NAV_PRIMARIA: readonly GrupoNav[] = [
  {
    id: "ranking",
    chaveRotulo: "nav.ranking",
    itens: [
      {
        href: "/ranking",
        chaveRotulo: "nav.ranking.idip",
        chaveDescricao: "nav.ranking.idip.desc",
      },
      {
        href: "/ranking/personalizado",
        chaveRotulo: "nav.ranking.personalizado",
        chaveDescricao: "nav.ranking.personalizado.desc",
      },
      {
        href: "/espectro",
        chaveRotulo: "nav.ranking.espectro",
        chaveDescricao: "nav.ranking.espectro.desc",
      },
      {
        href: "/stf",
        chaveRotulo: "nav.ranking.stf",
        chaveDescricao: "nav.ranking.stf.desc",
      },
    ],
  },
  {
    id: "partidos",
    chaveRotulo: "nav.partidos",
    itens: [
      {
        href: "/partidos",
        chaveRotulo: "nav.partidos.todos",
        chaveDescricao: "nav.partidos.todos.desc",
      },
      {
        href: "/partidos/comparar",
        chaveRotulo: "nav.partidos.comparar",
        chaveDescricao: "nav.partidos.comparar.desc",
      },
    ],
  },
  { id: "projetos", chaveRotulo: "nav.projetos", href: "/projetos" },
  { id: "comparar", chaveRotulo: "nav.comparar", href: "/comparar" },
  {
    id: "metodologia",
    chaveRotulo: "nav.metodologia",
    itens: [
      {
        href: "/metodologia",
        chaveRotulo: "nav.metodologia.idip",
        chaveDescricao: "nav.metodologia.idip.desc",
      },
      {
        href: "/como-funciona",
        chaveRotulo: "nav.metodologia.como",
        chaveDescricao: "nav.metodologia.como.desc",
      },
      {
        href: "/historia",
        chaveRotulo: "nav.metodologia.historia",
        chaveDescricao: "nav.metodologia.historia.desc",
      },
      {
        href: "/calendario-eleitoral",
        chaveRotulo: "nav.metodologia.calendario",
        chaveDescricao: "nav.metodologia.calendario.desc",
      },
      {
        href: "/faq",
        chaveRotulo: "nav.metodologia.faq",
        chaveDescricao: "nav.metodologia.faq.desc",
      },
      {
        href: "/sobre",
        chaveRotulo: "nav.metodologia.sobre",
        chaveDescricao: "nav.metodologia.sobre.desc",
      },
    ],
  },
] as const;

/** Rodapé, organizado por **finalidade** em vez de uma linha de onze links. */
export const RODAPE: readonly {
  chaveTitulo: ChaveDicionario;
  itens: readonly ItemNav[];
}[] = [
  {
    chaveTitulo: "rodape.explorar",
    itens: [
      { href: "/ranking", chaveRotulo: "nav.ranking.idip" },
      { href: "/partidos", chaveRotulo: "nav.partidos" },
      { href: "/projetos", chaveRotulo: "nav.projetos" },
      { href: "/comparar", chaveRotulo: "nav.comparar" },
      { href: "/stf", chaveRotulo: "nav.ranking.stf" },
      { href: "/espectro", chaveRotulo: "nav.ranking.espectro" },
    ],
  },
  {
    chaveTitulo: "rodape.entender",
    itens: [
      { href: "/metodologia", chaveRotulo: "nav.metodologia" },
      { href: "/como-funciona", chaveRotulo: "nav.metodologia.como" },
      { href: "/historia", chaveRotulo: "nav.metodologia.historia" },
      { href: "/calendario-eleitoral", chaveRotulo: "nav.metodologia.calendario" },
      { href: "/faq", chaveRotulo: "nav.metodologia.faq" },
      { href: "/status", chaveRotulo: "rodape.status" },
    ],
  },
  {
    chaveTitulo: "rodape.projeto",
    itens: [
      { href: "/sobre", chaveRotulo: "nav.metodologia.sobre" },
      { href: "/apoie", chaveRotulo: "rodape.apoie" },
      { href: "/contato", chaveRotulo: "rodape.contato" },
      { href: "/retificacao", chaveRotulo: "rodape.retificacao" },
    ],
  },
  {
    chaveTitulo: "rodape.juridico",
    itens: [
      { href: "/termos-de-uso", chaveRotulo: "rodape.termos" },
      { href: "/privacidade", chaveRotulo: "rodape.privacidade" },
      { href: "/lgpd", chaveRotulo: "rodape.lgpd" },
      { href: "/cookies", chaveRotulo: "rodape.cookies" },
    ],
  },
] as const;

/**
 * O grupo que contém a rota atual, para marcar o item como ativo.
 *
 * Casa por prefixo porque rotas dinâmicas não estão na lista: `/politicos/abc` é
 * o destino natural de quem veio do ranking, então pertence visualmente a ele.
 */
export function grupoAtivo(pathname: string): GrupoNav | undefined {
  const heranca: Record<string, string> = {
    "/politicos": "ranking",
    "/partidos": "partidos",
    "/projetos": "projetos",
  };
  for (const [prefixo, id] of Object.entries(heranca)) {
    if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) {
      const grupo = NAV_PRIMARIA.find((g) => g.id === id);
      if (grupo) return grupo;
    }
  }

  return NAV_PRIMARIA.find((grupo) => {
    const rotas = grupo.itens ? grupo.itens.map((i) => i.href) : grupo.href ? [grupo.href] : [];
    return rotas.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
  });
}
