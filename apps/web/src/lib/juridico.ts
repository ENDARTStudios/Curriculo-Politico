import type { ChaveDicionario } from "@/lib/i18n/dicionarios";

/**
 * Rótulos humanos para registros jurídicos.
 *
 * ── Por que existe ────────────────────────────────────────────────────────
 * A página do político renderizava o valor cru do enum:
 * `rec.type.replace("_", " ")` produzia **"ACCOUNTS REJECTED"** — em inglês,
 * maiúsculas de banco de dados, dentro de um site em português. E só o primeiro
 * sublinhado era trocado, então um valor com dois ficaria `REU EM_ACAO PENAL`.
 *
 * ── Precisão jurídica (regra de produto nº 1) ─────────────────────────────
 * A plataforma só pode usar duas expressões para imputação penal: **"Réu em Ação
 * Penal"** e **"Condenação Transitada em Julgado"**. Todo o resto é descritivo e
 * não pode sugerir crime nem juízo moral:
 *
 * - `ACCOUNTS_REJECTED` é **sanção administrativa do TCU**, não condenação
 *   judicial. Chamar isso de condenação seria falso e difamatório.
 * - `INVESTIGATION` não é acusação formada.
 * - `CRIMINAL_ACTION` é réu — pessoa que responde a processo, com presunção de
 *   inocência.
 *
 * Por isso o rótulo nomeia o **órgão e o ato**, não a conclusão.
 */
export const ROTULO_TIPO_JURIDICO: Record<string, ChaveDicionario> = {
  INVESTIGATION: "juridico.investigacao",
  LAWSUIT: "juridico.acaoJudicial",
  CONDEMNATION: "juridico.condenacao",
  IMPEACHMENT: "juridico.impeachment",
  CLEARED: "juridico.arquivado",
  ACCOUNTS_REJECTED: "juridico.contasRejeitadas",
  CRIMINAL_ACTION: "juridico.reuAcaoPenal",
};

/**
 * Estado processual.
 *
 * `TRANSITADO_EM_JULGADO` vira "sem recurso pendente" em vez de "transitado em
 * julgado": o TCU usa a mesma expressão para a definitividade **administrativa**
 * da própria decisão, e repetir o termo ao lado de "TCU" faz o leitor entender
 * condenação judicial. O que a pessoa precisa saber é se ainda cabe recurso.
 */
export const ROTULO_STATUS_JURIDICO: Record<string, ChaveDicionario> = {
  ATIVO: "juridico.statusAtivo",
  ARQUIVADO: "juridico.statusArquivado",
  TRANSITADO_EM_JULGADO: "juridico.statusDefinitivo",
  DECISAO_ADMINISTRATIVA_DEFINITIVA: "juridico.statusDefinitivo",
};

/** Fallback: o próprio valor, legível — nunca `undefined` na tela. */
export function chaveTipoJuridico(tipo: string): ChaveDicionario | null {
  return ROTULO_TIPO_JURIDICO[tipo] ?? null;
}

export function chaveStatusJuridico(status: string): ChaveDicionario | null {
  return ROTULO_STATUS_JURIDICO[status] ?? null;
}
