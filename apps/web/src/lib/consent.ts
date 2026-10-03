/**
 * Versões dos documentos jurídicos e dos consentimentos (LGPD Art. 8º).
 * Incrementar a versão a cada alteração substancial — o aceite gravado
 * referencia a versão vigente no ato da aceitação.
 */
export const TERMS_VERSION = "2026-09-30";
export const PRIVACY_VERSION = "2026-09-30";
/** Consentimento ESPECÍFICO p/ dado sensível (opinião política, Art. 11 LGPD). */
export const POLITICAL_CONSENT_VERSION = "2026-09-30";

export const POLITICAL_CONSENT_TEXTO =
  "Autorizo o registro da minha posição (FAVOR/CONTRA) em projetos de lei, " +
  "vinculada à minha conta, como dado pessoal sensível — opinião política " +
  "(Art. 5º, II da LGPD). Uso exclusivamente para exibir a contagem agregada " +
  "e meu próprio voto; nunca é compartilhado, nunca altera a nota IDIP. " +
  "Posso revogar a qualquer momento na própria votação, o que elimina meus votos.";

export function consentimentoPoliticoAtivo(user: {
  politicalConsentAt?: Date | null;
  politicalConsentWithdrawnAt?: Date | null;
}): boolean {
  return !!user.politicalConsentAt && !user.politicalConsentWithdrawnAt;
}
