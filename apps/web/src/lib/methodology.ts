/**
 * Metodologia IDIP exibida na interface.
 *
 * ── Fonte de verdade ────────────────────────────────────────────────────────
 * Os pesos e a versão vivem em `packages/idip/src/scoring.ts` (`WEIGHTS` e a
 * versão do pacote `@cp/idip`). Este arquivo é a projeção de LEITURA deles para
 * a UI, porque `@cp/idip` publica apenas TypeScript não compilado e importá-lo
 * no build do Next exigiria `transpilePackages` — configuração que preferimos
 * não introduzir às vésperas de um deploy só para renderizar quatro números.
 *
 * O risco dessa cópia é divergir. Ele é fechado por um teste: o script
 * `apps/pipeline/scripts/verify-scoring.ts` (WEB-001) compara cada peso abaixo
 * com `WEIGHTS` do motor e quebra o CI se algum número sair de sincronia.
 *
 * Ou seja: **não edite estes números à mão sem editar o motor.** Ao mudar a
 * fórmula, atualize `scoring.ts` primeiro e depois ajuste aqui até o
 * `npm run verify:scoring` voltar a passar.
 *
 * Isto já aconteceu: a home exibia "IDIP v1.0" com Produção 20% e
 * Custo/Benefício 5% enquanto o motor já rodava v1.1 (18% e 7%). Numa plataforma
 * que vende "algoritmos abertos", divergir da própria fórmula é o defeito mais
 * caro possível.
 */

/**
 * Perfil de avaliação. Espelha `Profile` de `packages/idip/src/scoring.ts`.
 * Redefinido aqui para que a UI não dependa do código-fonte do motor em tempo
 * de build (ver a nota de sincronia abaixo).
 */
export type PerfilAvaliacao = "LEGISLATIVE" | "EXECUTIVE";

/** Versão da metodologia — deve espelhar `version` de `packages/idip/package.json`. */
export const METODOLOGIA_VERSAO = "1.1";

/** Teto da nota quando a trava de integridade é acionada (espelha `HARD_CAP`). */
export const NOTA_MAXIMA_TRAVADA = 39.9;

/**
 * Chave de uma dimensão no mapa de pesos do motor. É um union fechado (e não
 * `string`) para que o teste de sincronia `WEB-001` consiga ler o valor
 * literalmente tipado e compará-lo com `WEIGHTS` sem cast.
 */
export type ChaveDimensao =
  | "integrity"
  | "productivity"
  | "approval"
  | "oversight"
  | "presence"
  | "transparency"
  | "costEfficiency"
  | "campaign"
  | "fiscalResponsibility"
  | "governmentDelivery"
  | "governance"
  // Exclusivas do IDIP-STF (ver DIMENSOES_STF abaixo).
  | "consistency";

export interface DimensaoMetodologia {
  /** Nome exibido, na ordem em que aparece na metodologia pública. */
  label: string;
  /** Chave em `WEIGHTS[profile]` do motor — é o que o teste de sincronia usa. */
  key: ChaveDimensao;
  /** Peso em pontos percentuais inteiros. */
  percent: number;
}

/**
 * Dimensões do Legislativo (Deputados e Senadores).
 * Espelha `WEIGHTS.LEGISLATIVE` — produzido pelo IDIP v1.1.
 */
export const DIMENSOES_LEGISLATIVO: readonly DimensaoMetodologia[] = [
  { label: "Integridade", key: "integrity", percent: 25 },
  { label: "Produção", key: "productivity", percent: 18 },
  { label: "Aprovação", key: "approval", percent: 15 },
  { label: "Fiscalização", key: "oversight", percent: 10 },
  { label: "Presença", key: "presence", percent: 10 },
  { label: "Transparência", key: "transparency", percent: 10 },
  { label: "Custo/Benefício", key: "costEfficiency", percent: 7 },
  { label: "Campanha", key: "campaign", percent: 5 },
] as const;

/**
 * Dimensões do Executivo (Presidente e Governadores).
 * Espelha `WEIGHTS.EXECUTIVE`.
 */
export const DIMENSOES_EXECUTIVO: readonly DimensaoMetodologia[] = [
  { label: "Integridade", key: "integrity", percent: 25 },
  { label: "Responsabilidade Fiscal", key: "fiscalResponsibility", percent: 20 },
  { label: "Entrega de Governo", key: "governmentDelivery", percent: 20 },
  { label: "Transparência", key: "transparency", percent: 15 },
  { label: "Custo/Eficiência", key: "costEfficiency", percent: 10 },
  { label: "Campanha", key: "campaign", percent: 5 },
  { label: "Governança", key: "governance", percent: 5 },
] as const;

export const DIMENSOES: Record<PerfilAvaliacao, readonly DimensaoMetodologia[]> = {
  LEGISLATIVE: DIMENSOES_LEGISLATIVO,
  EXECUTIVE: DIMENSOES_EXECUTIVO,
};

/* ============================================================================
   IDIP-STF — ministros do Supremo Tribunal Federal
   ----------------------------------------------------------------------------
   Por que o Judiciário precisa de um índice PRÓPRIO, e não de uma linha a mais
   na tabela do Legislativo:

   O IDIP mede desempenho de quem responde ao eleitor. Ministro do STF é
   nomeado, não eleito — não há responsabilização nas urnas, e as dimensões que
   fazem sentido para um mandato (Aprovação, Campanha, Presença em sessão
   deliberativa) não existem aqui. Aplicar os pesos do Legislativo a um ministro
   mediria a coisa errada com aparência de rigor.

   O que É mensurável num tribunal constitucional é outra coisa: se ele produz,
   se decide com coerência, se trabalha à luz do público, e se sua conduta
   resiste ao escrutínio.
   ============================================================================ */

/**
 * Dimensões do IDIP-STF. Espelha `StfScore` em `apps/web/prisma/schema.prisma`
 * (`integrityScore`, `productivityScore`, `consistencyScore`,
 * `transparencyScore`) — um peso aqui sem campo correspondente lá seria
 * metodologia que o banco não consegue honrar.
 *
 * **Não existe dimensão de celeridade**, de propósito. A tabela `StfCase` tem
 * `decisionDate`, mas não tem data de autuação/distribuição; sem o marco
 * inicial não há como medir tempo até a decisão. A página `/stf` listava
 * "Celeridade" antes desta definição, mas ela era imensurável com o schema real.
 */
export const DIMENSOES_STF: readonly DimensaoMetodologia[] = [
  { label: "Integridade", key: "integrity", percent: 25 },
  { label: "Produtividade", key: "productivity", percent: 25 },
  { label: "Consistência", key: "consistency", percent: 30 },
  { label: "Transparência", key: "transparency", percent: 20 },
] as const;

/** Chaves válidas do IDIP-STF. */
export type ChaveDimensaoStf =
  | "integrity"
  | "productivity"
  | "consistency"
  | "transparency";

/** Formata o peso como percentual para exibição ("25%"). */
export function percentual(percent: number): string {
  return `${percent}%`;
}

/** Soma dos pesos de um perfil, em pontos percentuais. Deve ser exatamente 100. */
export function somaDosPesos(profile: PerfilAvaliacao): number {
  return DIMENSOES[profile].reduce((total, d) => total + d.percent, 0);
}
