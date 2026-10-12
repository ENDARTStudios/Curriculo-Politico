/**
 * Canais oficiais de contato — fonte única da verdade.
 *
 * Caixas operacionais informadas pelo controlador (ENDART Studios) em
 * 2026-10-12: aliases verificados do Gmail (`usuario+rótulo@`), todos com
 * entrega garantida. Substituem os endereços `@curriculopolitico.org`, que não
 * possuíam caixa postal operacional — pendência P1-02 ("DPO sem identidade
 * nominal") da 2ª auditoria jurídica.
 *
 * Encarregado (DPO): Equipe END ART Studios — identificação publicada na
 * Política de Privacidade (§1), na página /lgpd (§5) e nos Termos (§7.4).
 */
export const CONTATO = {
  controlador: "ENDART Studios",
  encarregado: "Equipe END ART Studios",
  /** Contato institucional / imprensa. */
  geral: "endart.studios+contato@gmail.com",
  /** Dúvidas de uso, doações e reembolsos. */
  suporte: "endart.studios+suporte@gmail.com",
  /** Encarregado de Dados (DPO) — privacidade e proteção de dados. */
  privacidade: "endart.studios+privacidade@gmail.com",
  /** Reporte responsável de vulnerabilidades. */
  seguranca: "endart.studios+security@gmail.com",
  /** Reembolso de doações. */
  reembolso: "endart.studios+reembolso@gmail.com",
  /** Direitos do titular (LGPD Art. 18 e 19). */
  direitos: "endart.studios+direitos@gmail.com",
} as const;

/** Endereço pronto para `href` de e-mail. */
export function mailto(endereco: string): string {
  return `mailto:${endereco}`;
}
