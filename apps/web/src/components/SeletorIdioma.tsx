"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { definirIdioma } from "@/lib/i18n/acao";
import { LOCALES, ROTULO_IDIOMA, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/cliente";

/**
 * Seletor de idioma.
 *
 * ── Por que é um `<form>` com Server Action ────────────────────────────────
 * A escolha precisa valer para o **servidor**, que é quem renderiza o texto. Um
 * `onChange` que só trocasse estado no cliente daria a impressão de funcionar e
 * devolveria português no próximo carregamento.
 *
 * Cada idioma é um botão que envia o formulário — o que também funciona sem
 * JavaScript e mantém o seletor operável por teclado sem truque.
 *
 * ── Acessibilidade ─────────────────────────────────────────────────────────
 * `aria-pressed` marca o idioma ativo. Não usamos `role="radiogroup"` porque os
 * botões enviam o formulário: são comandos, não uma escolha que só vale ao
 * confirmar. E o rótulo de cada idioma é escrito no próprio idioma, como manda a
 * convenção: quem procura espanhol reconhece "Español", não "Espanhol".
 */
export function SeletorIdioma({ compacto = false }: { compacto?: boolean }) {
  const locale = useLocale();
  const t = useT();
  const pathname = usePathname();
  const [pendente, iniciar] = useTransition();

  return (
    <form
      action={(formData) => {
        iniciar(() => {
          void definirIdioma(formData);
        });
      }}
      className={compacto ? "" : "flex flex-col gap-2"}
    >
      {/* `pathname` não é enviado: a action invalida o layout inteiro. O campo
          existe só para dar ao formulário um identificador estável por rota. */}
      <input type="hidden" name="rota" value={pathname} />

      <span className="sr-only" id="rotulo-idioma">
        {t("idioma.trocar")}
      </span>

      <div
        role="group"
        aria-labelledby="rotulo-idioma"
        className="flex items-center gap-1 rounded-lg border border-slate-700 p-0.5"
      >
        {LOCALES.map((opcao: Locale) => {
          const ativo = opcao === locale;
          return (
            <button
              key={opcao}
              type="submit"
              name="locale"
              value={opcao}
              aria-pressed={ativo}
              disabled={pendente}
              title={ROTULO_IDIOMA[opcao]}
              className={`rounded-md px-2 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                ativo
                  ? "bg-slate-700 text-slate-50"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {/* Abreviação de duas letras, que é o que cabe na barra. O nome
                  completo fica no `title` e no leitor de tela via `sr-only`. */}
              {opcao === "pt-BR" ? "PT" : opcao === "es-US" ? "ES·US" : "ES·ES"}
              <span className="sr-only"> — {ROTULO_IDIOMA[opcao]}</span>
            </button>
          );
        })}
      </div>
    </form>
  );
}
