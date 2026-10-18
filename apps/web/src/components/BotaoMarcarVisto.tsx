"use client";

import { useState, useTransition } from "react";
import { marcarComoVisto } from "@/app/conta/acoes-novidades";
import { useT } from "@/lib/i18n/cliente";

/**
 * Botão "marcar como visto".
 *
 * ── Por que só o clique avança o marcador ──────────────────────────────────
 * Abrir a dashboard **não** marca como lido: quem entra, olha por cima e sai
 * perderia exatamente o que precisava ler. O avanço é explícito porque a ação é
 * irreversível do ponto de vista da pessoa — o histórico anterior deixa de
 * aparecer como novidade.
 *
 * O rótulo muda depois do clique para confirmar que algo aconteceu; sem isso, a
 * pessoa clica e a lista continua na tela até o refresh, o que parece falha.
 */
export function BotaoMarcarVisto({ desabilitado }: { desabilitado: boolean }) {
  const t = useT();
  const [marcado, setMarcado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (desabilitado && !marcado) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pendente || marcado}
        onClick={() => {
          setErro(null);
          iniciar(async () => {
            const r = await marcarComoVisto();
            // O tipo gerado pelo Next para a action deixa `erro` opcional nas duas
            // variantes (`{ erro?; ok? }`), então a checagem cobre `undefined`.
            if ("erro" in r && r.erro) {
              setErro(r.erro);
              return;
            }
            setMarcado(true);
          });
        }}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
      >
        {marcado ? t("novidades.marcado") : t("novidades.marcar")}
      </button>

      {erro && (
        <p role="alert" className="mt-2 text-xs text-amber-300">
          {erro === "AUTH_REQUIRED" ? t("seguir.entrarPara") : t("seguir.erro")}
        </p>
      )}
    </div>
  );
}
