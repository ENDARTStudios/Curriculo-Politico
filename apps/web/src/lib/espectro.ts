/**
 * Modelo "Descubra seu espectro político" — autoavaliação educativa do
 * usuário em 3 eixos, totalmente client-side.
 *
 * ── Por que este módulo é separado do IDIP ──────────────────────────────────
 * O IDIP mede políticos com dados oficiais. Este teste mede preferências
 * declaradas do usuário — opinião política é dado pessoal sensível (LGPD,
 * art. 5º, II), então nada aqui é enviado ao servidor, salvo ou logado.
 * A camada de engajamento do usuário nunca altera notas (regra de
 * neutralidade algorítmica do projeto).
 *
 * ── Neutralidade do instrumento ─────────────────────────────────────────────
 * Cada eixo tem exatamente 8 proposições, 4 codificadas para cada polo. As
 * afirmações são proposições de política pública genuinamente disputadas —
 * nunca algo com resposta consolidada na Constituição ou no STF, e nunca um
 * juízo de valor. A fórmula é simétrica: trocar todas as respostas espelha a
 * pontuação com o sinal invertido.
 *
 * Versão do modelo exibida na UI. Importe daqui — nunca redigite na página
 * (a home já divergiu assim da versão do IDIP).
 */
export const VERSAO_MODELO = "1.0";

export type EixoId = "economico" | "sociocultural" | "diplomatico";

export interface Polo {
  /** Chave usada pelas questões para apontar para qual polo a concordância conta. */
  id: string;
  nome: string;
  descricao: string;
}

export interface Eixo {
  id: EixoId;
  nome: string;
  /** O que o eixo mede, em uma frase neutra. */
  descricao: string;
  /** Polo no lado negativo da escala (-100). */
  poloNegativo: Polo;
  /** Polo no lado positivo da escala (+100). */
  poloPositivo: Polo;
}

export const EIXOS: Eixo[] = [
  {
    id: "economico",
    nome: "Eixo econômico",
    descricao: "Quanto a economia deve ser conduzida pelo Estado ou pelo mercado.",
    poloNegativo: {
      id: "igualdade",
      nome: "Igualdade",
      descricao:
        "Defende que o Estado intervenha na economia para reduzir desigualdades — impostos progressivos, serviços públicos e proteção social.",
    },
    poloPositivo: {
      id: "mercado",
      nome: "Mercado",
      descricao:
        "Defende que a iniciativa privada e a livre concorrência aloquem recursos melhor do que o Estado — menos impostos e menos regulação.",
    },
  },
  {
    id: "sociocultural",
    nome: "Eixo sociocultural",
    descricao: "Quanto o Estado deve intervir nos costumes e nas escolhas pessoais.",
    poloNegativo: {
      id: "autoridade",
      nome: "Autoridade",
      descricao:
        "Valoriza ordem, tradição e hierarquia, com mais rigor na aplicação das leis e maior peso do Estado sobre a vida coletiva.",
    },
    poloPositivo: {
      id: "liberdade",
      nome: "Liberdade",
      descricao:
        "Valoriza autonomia individual e o pluralismo de modos de vida, com menos ingerência do Estado nas escolhas pessoais.",
    },
  },
  {
    id: "diplomatico",
    nome: "Eixo diplomático",
    descricao: "Quanto o país deve se abrir ao mundo ou preservar a soberania nacional.",
    poloNegativo: {
      id: "nacionalismo",
      nome: "Nacionalismo",
      descricao:
        "Prioriza a soberania e os interesses nacionais, com proteção ao que é produzido e decidido dentro do país.",
    },
    poloPositivo: {
      id: "globalizacao",
      nome: "Globalização",
      descricao:
        "Prioriza a integração internacional — acordos comerciais, organismos multilaterais e pautas globais como o clima.",
    },
  },
];

export const EIXOS_POR_ID: Record<EixoId, Eixo> = Object.fromEntries(
  EIXOS.map((e) => [e.id, e]),
) as Record<EixoId, Eixo>;

export interface Questao {
  id: number;
  eixo: EixoId;
  /** Polo para o qual a concordância com a afirmação conta. */
  polo: string;
  texto: string;
}

/**
 * 24 proposições intercaladas entre eixos (evita blocos consecutivos do
 * mesmo tema, que induzem padrão de resposta). Cada uma afirma uma direção
 * de política pública que permanece genuinamente disputada no debate
 * brasileiro — nenhuma tem resposta consolidada na Constituição ou em
 * decisão de corte.
 */
export const QUESTOES: Questao[] = [
  // Rodada 1
  {
    id: 1,
    eixo: "economico",
    polo: "igualdade",
    texto:
      "O Estado deveria gastar mais em saúde e educação, mesmo que isso exija aumentar impostos.",
  },
  {
    id: 2,
    eixo: "sociocultural",
    polo: "autoridade",
    texto:
      "Pessoas condenadas por crimes violentos deveriam cumprir penas mais longas do que as atuais.",
  },
  {
    id: 3,
    eixo: "diplomatico",
    polo: "globalizacao",
    texto:
      "O Brasil deveria firmar mais acordos comerciais e reduzir barreiras à importação.",
  },
  // Rodada 2
  {
    id: 4,
    eixo: "economico",
    polo: "mercado",
    texto:
      "Com menos impostos e menos regras, o setor privado tende a gerar mais empregos do que o Estado.",
  },
  {
    id: 5,
    eixo: "sociocultural",
    polo: "liberdade",
    texto:
      "A educação em casa, no lugar da escola, deveria ser permitida por lei, com regras mínimas de supervisão.",
  },
  {
    id: 6,
    eixo: "diplomatico",
    polo: "nacionalismo",
    texto:
      "Indústrias estratégicas, como defesa, energia e tecnologia, deveriam ser protegidas da concorrência estrangeira.",
  },
  // Rodada 3
  {
    id: 7,
    eixo: "economico",
    polo: "igualdade",
    texto: "O salário mínimo deveria aumentar sempre acima da inflação.",
  },
  {
    id: 8,
    eixo: "sociocultural",
    polo: "autoridade",
    texto:
      "Escolas deveriam aplicar regras de disciplina rígidas, com punições previsíveis para quem as descumpre.",
  },
  {
    id: 9,
    eixo: "diplomatico",
    polo: "globalizacao",
    texto:
      "Em temas como clima e pandemias, o Brasil deveria aceitar metas definidas em acordos internacionais, mesmo que limitem decisões internas.",
  },
  // Rodada 4
  {
    id: 10,
    eixo: "economico",
    polo: "mercado",
    texto:
      "Empresas estatais deveriam, em regra, ser privatizadas para melhorar a eficiência dos serviços.",
  },
  {
    id: 11,
    eixo: "sociocultural",
    polo: "liberdade",
    texto:
      "Cada pessoa deveria ser livre para viver seu estilo de vida, desde que não prejudique os demais.",
  },
  {
    id: 12,
    eixo: "diplomatico",
    polo: "nacionalismo",
    texto:
      "Tratados internacionais deveriam ser aceitos apenas quando não reduzirem a soberania do Brasil em nenhum ponto.",
  },
  // Rodada 5
  {
    id: 13,
    eixo: "economico",
    polo: "igualdade",
    texto:
      "Programas de transferência de renda às famílias de baixa renda são essenciais para reduzir a desigualdade.",
  },
  {
    id: 14,
    eixo: "sociocultural",
    polo: "autoridade",
    texto:
      "O governo deveria poder exigir que plataformas digitais removam conteúdos apontados como desinformação.",
  },
  {
    id: 15,
    eixo: "diplomatico",
    polo: "globalizacao",
    texto:
      "A cooperação e a fiscalização internacionais sobre questões ambientais na Amazônia deveriam ser ampliadas.",
  },
  // Rodada 6
  {
    id: 16,
    eixo: "economico",
    polo: "mercado",
    texto:
      "Impostos altos sobre empresas e investidores prejudicam a economia e acabam pesando sobre o trabalhador.",
  },
  {
    id: 17,
    eixo: "sociocultural",
    polo: "liberdade",
    texto:
      "O uso pessoal de drogas deveria deixar de ser assunto do Estado.",
  },
  {
    id: 18,
    eixo: "diplomatico",
    polo: "nacionalismo",
    texto:
      "A compra de terras rurais por estrangeiros deveria ter restrições mais rígidas do que as atuais.",
  },
  // Rodada 7
  {
    id: 19,
    eixo: "economico",
    polo: "igualdade",
    texto:
      "Em setores essenciais, como energia e saneamento, o Estado deveria controlar os preços cobrados da população.",
  },
  {
    id: 20,
    eixo: "sociocultural",
    polo: "autoridade",
    texto:
      "As Forças Armadas deveriam atuar mais na segurança pública do dia a dia.",
  },
  {
    id: 21,
    eixo: "diplomatico",
    polo: "globalizacao",
    texto:
      "A imigração, em geral, traz mais benefícios do que custos para o país.",
  },
  // Rodada 8
  {
    id: 22,
    eixo: "economico",
    polo: "mercado",
    texto:
      "As regras trabalhistas deveriam ser mais flexíveis, negociadas diretamente entre empresas e trabalhadores.",
  },
  {
    id: 23,
    eixo: "sociocultural",
    polo: "liberdade",
    texto:
      "Questões de moralidade pessoal, como religião e estilo de vida, não deveriam guiar as leis do Estado.",
  },
  {
    id: 24,
    eixo: "diplomatico",
    polo: "nacionalismo",
    texto:
      "Contratos com empresas estrangeiras deveriam exigir mais conteúdo nacional e transferência de tecnologia.",
  },
];

/** Escala de resposta Likert de 5 pontos. */
export interface OpcaoResposta {
  valor: -2 | -1 | 0 | 1 | 2;
  rotulo: string;
}

export const OPCOES_RESPOSTA: OpcaoResposta[] = [
  { valor: -2, rotulo: "Discordo plenamente" },
  { valor: -1, rotulo: "Discordo" },
  { valor: 0, rotulo: "Nem concordo nem discordo" },
  { valor: 1, rotulo: "Concordo" },
  { valor: 2, rotulo: "Concordo plenamente" },
];

export type Resposta = OpcaoResposta["valor"];

export type Pontuacoes = Record<EixoId, number>;

/**
 * Pontuação por eixo, de -100 (polo negativo) a +100 (polo positivo).
 *
 * Cada resposta vale de -2 a +2, com o sinal definido pelo polo da questão
 * (`+` se concordar com a afirmação empurra para o polo positivo do eixo,
 * `-` se empurra para o negativo). O total é normalizado pela soma máxima
 * possível (2 × nº de questões do eixo), então a escala é comparável entre
 * eixos e independe de quantas questões foram respondidas.
 */
export function pontuar(respostas: Record<number, Resposta>): Pontuacoes {
  const acumulado: Record<EixoId, { pontos: number; maximo: number }> = {
    economico: { pontos: 0, maximo: 0 },
    sociocultural: { pontos: 0, maximo: 0 },
    diplomatico: { pontos: 0, maximo: 0 },
  };

  for (const questao of QUESTOES) {
    const resposta = respostas[questao.id];
    if (resposta === undefined) continue;
    const eixo = EIXOS_POR_ID[questao.eixo];
    const sinal = questao.polo === eixo.poloPositivo.id ? 1 : -1;
    acumulado[questao.eixo].pontos += sinal * resposta;
    acumulado[questao.eixo].maximo += 2;
  }

  return {
    economico: percentual(acumulado.economico),
    sociocultural: percentual(acumulado.sociocultural),
    diplomatico: percentual(acumulado.diplomatico),
  };
}

function percentual({
  pontos,
  maximo,
}: {
  pontos: number;
  maximo: number;
}): number {
  if (maximo === 0) return 0;
  return Math.round((pontos / maximo) * 100);
}

/** Divide um valor -100..+100 em dois percentuais que somam 100. */
export function repartir(valor: number): { negativo: number; positivo: number } {
  const negativo = Math.round((100 - valor) / 2);
  return { negativo, positivo: 100 - negativo };
}

export interface Quadrante {
  nome: string;
  descricao: string;
}

const QUADRANTE_CENTRO: Quadrante = {
  nome: "Centro do compasso",
  descricao:
    "Suas respostas não pendem de forma acentuada para nenhum lado nos eixos econômico e sociocultural — uma posição equilibrada no centro do mapa.",
};

const QUADRANTES: Record<string, Quadrante> = {
  "igualdade|autoridade": {
    nome: "Igualdade · Autoridade",
    descricao:
      "No econômico, você pende à intervenção do Estado para reduzir desigualdades. No sociocultural, valoriza ordem, tradição e regras mais firmes.",
  },
  "igualdade|liberdade": {
    nome: "Igualdade · Liberdade",
    descricao:
      "No econômico, você pende à intervenção do Estado para reduzir desigualdades. No sociocultural, valoriza a autonomia individual e o pluralismo.",
  },
  "mercado|autoridade": {
    nome: "Mercado · Autoridade",
    descricao:
      "No econômico, você dá amplo espaço à iniciativa privada. No sociocultural, valoriza ordem, tradição e regras mais firmes.",
  },
  "mercado|liberdade": {
    nome: "Mercado · Liberdade",
    descricao:
      "No econômico, você dá amplo espaço à iniciativa privada. No sociocultural, valoriza a autonomia individual e o pluralismo.",
  },
};

/** Margem (em pontos da escala -100..100) que conta como "centro" por eixo. */
const ZONA_CENTRO = 10;

/**
 * Quadrante do usuário no compasso 2D (econômico × sociocultural). Perto do
 * centro nos dois eixos, devolve o quadrante neutro.
 */
export function quadrante(economico: number, sociocultural: number): Quadrante {
  if (
    Math.abs(economico) <= ZONA_CENTRO &&
    Math.abs(sociocultural) <= ZONA_CENTRO
  ) {
    return QUADRANTE_CENTRO;
  }
  const ladoEconomico = economico <= 0 ? "igualdade" : "mercado";
  const ladoSociocultural = sociocultural <= 0 ? "autoridade" : "liberdade";
  return (
    QUADRANTES[`${ladoEconomico}|${ladoSociocultural}`] ?? QUADRANTE_CENTRO
  );
}

/**
 * Leitura clássica de uma dimensão (esquerda–direita), derivada do eixo
 * econômico — no modelo unidimensional tradicional, essa é a dimensão que a
 * etiqueta resume. As faixas espelham os 5 níveis usados na classificação
 * notória de partidos (`IdeologyBadge`).
 */
export function rotuloClassico(economico: number): string {
  if (economico <= -60) return "Esquerda";
  if (economico < -20) return "Centro-esquerda";
  if (economico <= 20) return "Centro";
  if (economico < 60) return "Centro-direita";
  return "Direita";
}

export const FAIXAS_CLASSICAS = [
  "Esquerda",
  "Centro-esquerda",
  "Centro",
  "Centro-direita",
  "Direita",
] as const;
