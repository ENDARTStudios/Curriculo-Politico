import type { ReactNode } from "react";

/**
 * Cabeçalho de página.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * Cada uma das 25 rotas internas montava o próprio cabeçalho à mão. O resultado
 * era divergência silenciosa: o `<h1>` aparecia em `text-3xl` em metade das telas
 * e `text-4xl` na outra metade; e o parágrafo de abertura — o mesmo papel em
 * todas — aparecia em **três** tamanhos (`text-xl`, padrão, `text-sm`) e dois
 * espaçamentos (`mt-2`, `mt-3`, `mt-4`).
 *
 * Nada disso é decisão de design: é o que acontece quando o mesmo elemento é
 * reescrito vinte e cinco vezes. Um componente único elimina a possibilidade, em
 * vez de corrigir o sintoma caso a caso — e o guard `verify:cabecalhos` impede
 * que alguém volte a declarar um `<h1>` solto numa página.
 *
 * ── As decisões que ele fixa ───────────────────────────────────────────────
 * - **Título**: `text-3xl` → `sm:text-4xl`. Escala editorial, não hero (o hero é
 *   exclusivo da home).
 * - **Saber onde está**: o `olho` é caixa alta, tracking largo, azul de ação. É o
 *   mesmo padrão da home, e diz em que seção a pessoa entrou.
 * - **Lead**: `text-lg`, `max-w-[65ch]`. O limite de caracteres é a regra de
 *   leitura, não um detalhe — linha longa cansa e o visitante pula o texto.
 * - **`nota`**: metadado curto sob o lead (ex.: "Última atualização: setembro de
 *   2026"). Fica menor e não compete com a abertura.
 * - **`acoes`**: alinhadas à direita do título no desktop, abaixo dele no mobile.
 */
export function CabecalhoPagina({
  olho,
  tomOlho = "acao",
  titulo,
  lead,
  nota,
  acoes,
}: {
  /** Rótulo de seção acima do título. Opcional. */
  olho?: string;
  /**
   * Cor do olho.
   *
   * Azul é o padrão porque o olho normalmente nomeia uma seção. Âmbar existe para
   * o caso em que o olho **informa um problema** — a página de erro usa "Falha ao
   * carregar" e ali a cor carrega significado, não decoração. Sem esta opção, a
   * migração teria apagado o sinal.
   */
  tomOlho?: "acao" | "alerta";
  /** Título principal. Aceita ReactNode para casos com expressão. */
  titulo: ReactNode;
  /** Parágrafo de abertura. */
  lead?: ReactNode;
  /** Metadado curto sob o lead. */
  nota?: ReactNode;
  /** Ações primárias da página (botões, links). */
  acoes?: ReactNode;
}) {
  const corOlho = tomOlho === "alerta" ? "text-amber-300" : "text-sky-400";

  return (
    <header className="mb-8">
      {olho && (
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${corOlho}`}>
          {olho}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1
          className={`text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl ${
            olho ? "mt-3" : ""
          }`}
        >
          {titulo}
        </h1>
        {acoes && <div className="flex flex-wrap items-center gap-3">{acoes}</div>}
      </div>

      {lead && (
        <p className="mt-3 max-w-[65ch] text-lg leading-relaxed text-slate-400">
          {lead}
        </p>
      )}

      {nota && <p className="mt-2 text-xs text-slate-400">{nota}</p>}
    </header>
  );
}
