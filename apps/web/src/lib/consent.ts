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
  politicalConsentVersion?: string | null;
}): boolean {
  if (!user.politicalConsentAt || user.politicalConsentWithdrawnAt) return false;
  // LGPD Art. 8º §6º: se o texto muda, o aceite anterior não cobre o novo
  // tratamento — a pessoa precisa consentir de novo sobre os termos vigentes.
  // Sem esta comparação, `POLITICAL_CONSENT_VERSION` era só um rótulo gravado:
  // incrementar a constante não invalidava nada, e um aceite de 2026 continuaria
  // valendo para um texto juridicamente diferente.
  return user.politicalConsentVersion === POLITICAL_CONSENT_VERSION;
}

/**
 * O consentimento existe, mas foi dado sobre uma versão anterior do texto.
 *
 * Distinto de "não consentiu" de propósito: aqui existe uma base legal
 * superada, e a obrigação é obter novo aceite — **não** apagar silenciosamente
 * os votos já registrados, que foram coletados licitamente sob a versão então
 * vigente. Apagar seria destruir manifestação do titular sem pedido dele.
 */
export function consentimentoPoliticoDesatualizado(user: {
  politicalConsentAt?: Date | null;
  politicalConsentWithdrawnAt?: Date | null;
  politicalConsentVersion?: string | null;
}): boolean {
  return (
    !!user.politicalConsentAt &&
    !user.politicalConsentWithdrawnAt &&
    user.politicalConsentVersion !== POLITICAL_CONSENT_VERSION
  );
}
