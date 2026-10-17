/**
 * Arquitetura de informação do site.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * A barra superior tinha **12 links planos** num `flex-wrap`: Ranking, Partidos,
 * Projetos, Comparar, Meu Espectro, História, Como Funciona, Calendário, STF,
 * FAQ, Metodologia, Sobre. Sem agrupamento, sem hierarquia e — no desktop —
 * quebrando em duas linhas. E o acesso à conta existia apenas no rodapé.
 *
 * O problema não era o número de destinos: eram os 28 do site. Era a **falta de
 * modelo**. Toda rota tinha o mesmo peso visual, então nenhuma se destacava, e a
 * pessoa precisava ler doze rótulos para descobrir onde clicar.
 *
 * Este arquivo é a fonte única. Header, drawer mobile e rodapé leem daqui, então
 * não há como divergirem — que é como a barra chegou a doze itens: cada rota nova
 * era acrescentada em um lugar e esquecida nos outros.
 *
 * ── O critério do agrupamento ──────────────────────────────────────────────
 * Agrupamos por **intenção de quem chega**, não por tipo de dado:
 *
 * - *Ranking* — "quero ver quem presta" (a tarefa nº 1 do produto)
 * - *Partidos* — "quero ver por agremiação"
 * - *Projetos* — "quero ver o que foi proposto"
 * - *Comparar* — "quero decidir entre dois"
 * - *Metodologia* — "quero saber se posso confiar no número"
 *
 * Cinco grupos, três deles com submenu. As rotas institucionais não entram aqui:
 * elas vivem no rodapé, onde são procuradas.
 */

export type ItemNav = {
  href: string;
  label: string;
  /** Uma linha explicando o destino. Só aparece no submenu e no drawer. */
  descricao?: string;
};

export type GrupoNav = {
  id: string;
  label: string;
  /** Link direto: o grupo não abre submenu. */
  href?: string;
  /** Submenu. Quando presente, `href` é ignorado no topo. */
  itens?: ItemNav[];
};

/** Os cinco grupos primários. */
export const NAV_PRIMARIA: readonly GrupoNav[] = [
  {
    id: "ranking",
    label: "Ranking",
    itens: [
      {
        href: "/ranking",
        label: "Ranking IDIP",
        descricao: "Quem tem confiança acima de 60, do maior para o menor",
      },
      {
        href: "/ranking/personalizado",
        label: "Ranking personalizado",
        descricao: "Pondera os temas que importam para você",
      },
      {
        href: "/espectro",
        label: "Meu Espectro",
        descricao: "Responda e veja seu posicionamento",
      },
      {
        href: "/stf",
        label: "Supremo Tribunal Federal",
        descricao: "Índice próprio para os ministros",
      },
    ],
  },
  {
    id: "partidos",
    label: "Partidos",
    itens: [
      {
        href: "/partidos",
        label: "Todos os partidos",
        descricao: "Média, distribuição do Termômetro e bancada",
      },
      {
        href: "/partidos/comparar",
        label: "Comparar partidos",
        descricao: "Duas agremiações lado a lado",
      },
    ],
  },
  { id: "projetos", label: "Projetos", href: "/projetos" },
  { id: "comparar", label: "Comparar", href: "/comparar" },
  {
    id: "metodologia",
    label: "Metodologia",
    itens: [
      {
        href: "/metodologia",
        label: "O índice IDIP",
        descricao: "Fórmula, pesos e o que cada dimensão mede",
      },
      {
        href: "/como-funciona",
        label: "Como funciona a política",
        descricao: "Os três poderes e a hierarquia eleitoral",
      },
      {
        href: "/historia",
        label: "História",
        descricao: "Como o índice evoluiu, versão por versão",
      },
      {
        href: "/calendario-eleitoral",
        label: "Calendário eleitoral",
        descricao: "Próximas eleições e cargos em disputa",
      },
      {
        href: "/faq",
        label: "Perguntas frequentes",
        descricao: "Dúvidas sobre nota, dados e neutralidade",
      },
      {
        href: "/sobre",
        label: "Sobre o projeto",
        descricao: "Quem mantém, com que dinheiro e por quê",
      },
    ],
  },
] as const;

/**
 * Rodapé, organizado por **finalidade** em vez de uma linha de onze links.
 *
 * O rodapé antigo misturava produto (Ranking), institucional (Sobre) e jurídico
 * (LGPD) na mesma fileira, todos com o mesmo peso. Quem procurava a política de
 * privacidade tinha de varrer oito links de produto antes de chegar nela.
 */
export const RODAPE: readonly { titulo: string; itens: readonly ItemNav[] }[] = [
  {
    titulo: "Explorar",
    itens: [
      { href: "/ranking", label: "Ranking IDIP" },
      { href: "/partidos", label: "Partidos" },
      { href: "/projetos", label: "Projetos de lei" },
      { href: "/comparar", label: "Comparar políticos" },
      { href: "/stf", label: "Supremo Tribunal Federal" },
      { href: "/espectro", label: "Meu Espectro" },
    ],
  },
  {
    titulo: "Entender",
    itens: [
      { href: "/metodologia", label: "Metodologia do IDIP" },
      { href: "/como-funciona", label: "Como funciona a política" },
      { href: "/historia", label: "História do índice" },
      { href: "/calendario-eleitoral", label: "Calendário eleitoral" },
      { href: "/faq", label: "Perguntas frequentes" },
      { href: "/status", label: "Estado da plataforma" },
    ],
  },
  {
    titulo: "Projeto",
    itens: [
      { href: "/sobre", label: "Sobre" },
      { href: "/apoie", label: "Apoie o projeto" },
      { href: "/contato", label: "Contato" },
      { href: "/retificacao", label: "Retificação de dados" },
    ],
  },
  {
    titulo: "Jurídico",
    itens: [
      { href: "/termos-de-uso", label: "Termos de uso" },
      { href: "/privacidade", label: "Privacidade" },
      { href: "/lgpd", label: "LGPD" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
] as const;

/**
 * O grupo que contém a rota atual, para marcar o item como ativo.
 *
 * Casa por prefixo porque rotas dinâmicas não estão na lista: `/politicos/abc` é
 * o destino natural de quem veio do ranking, então pertence visualmente a ele.
 * Sem esse mapa, o perfil de um político ficaria como a única tela do site sem
 * nenhum item de menu aceso — e a pessoa perderia a noção de onde está.
 */
export function grupoAtivo(pathname: string): GrupoNav | undefined {
  // Rotas dinâmicas: o perfil herda o grupo de quem leva até ele.
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
