"use client";

import { useEffect, useState } from "react";

/**
 * Banner informativo de cookies — informa sobre cookies essenciais de sessão
 * (NextAuth) e armazenamento local. Não há cookies de rastreamento.
 * Aparece apenas na primeira visita.
 */
export function CookieBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("curriculo_politico_cookie_consent")) {
      setVisivel(true);
    }
  }, []);

  const aceitar = () => {
    localStorage.setItem(
      "curriculo_politico_cookie_consent",
      JSON.stringify({ essenciais: true, data: new Date().toISOString() }),
    );
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700 bg-slate-950/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-slate-400">
          Utilizamos apenas{" "}
          <strong className="text-slate-300">cookies essenciais</strong> de
          sessão e armazenamento local para preferências.{" "}
          <strong className="text-slate-300">
            Nenhum cookie de rastreamento ou publicidade.
          </strong>{" "}
          Veja detalhes em{" "}
          <a href="/cookies" className="text-sky-400 hover:underline">
            /cookies
          </a>
          .
        </p>
        <button
          onClick={aceitar}
          className="rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-medium text-slate-950 transition hover:bg-sky-400"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
