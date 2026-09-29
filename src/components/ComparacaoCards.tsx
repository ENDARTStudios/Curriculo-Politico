"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { exportToCSV } from "@/lib/export";

export interface Comparavel {
  id: string;
  politicalName: string;
  photoUrl: string | null;
  party: string | null;
  office: string | null;
  uf: string | null;
  score: {
    final: number;
    confidence: number;
    status: string;
  };
}

const STATUS_STYLE: Record<string, { chip: string; label: string }> = {
  GREEN: { chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", label: "🟢 Confiável" },
  YELLOW: { chip: "border-amber-500/40 bg-amber-500/10 text-amber-300", label: "🟡 Atenção" },
  RED: { chip: "border-red-500/40 bg-red-500/10 text-red-300", label: "🔴 Não Confiável" },
  GRAY: { chip: "border-slate-500/40 bg-slate-500/10 text-slate-400", label: "⚪ Dados Insuficientes" },
};

const MAX_SELECAO = 3;

export function ComparacaoCards({
  politicians,
  initialIds = [],
}: {
  politicians: Comparavel[];
  initialIds?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(() => {
    // Deep-link: /comparar?ids=a,b,c pré-seleciona (máx. 3, só quem tem nota)
    return initialIds
      .slice(0, MAX_SELECAO)
      .filter((id) => politicians.some((p) => p.id === id));
  });
  const [filterParty, setFilterParty] = useState("");
  const [filterUF, setFilterUF] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Mantém a URL compartilhável em sincronia com a seleção
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected.length >= 2) url.searchParams.set("ids", selected.join(","));
    else url.searchParams.delete("ids");
    window.history.replaceState(null, "", url.toString());
  }, [selected]);

  const parties = useMemo(
    () => [...new Set(politicians.map((p) => p.party).filter(Boolean))].sort() as string[],
    [politicians],
  );
  const ufs = useMemo(
    () => [...new Set(politicians.map((p) => p.uf).filter(Boolean))].sort() as string[],
    [politicians],
  );

  const filtrados = useMemo(
    () =>
      politicians.filter((p) => {
        if (filterParty && p.party !== filterParty) return false;
        if (filterUF && p.uf !== filterUF) return false;
        if (filterStatus && p.score.status !== filterStatus) return false;
        return true;
      }),
    [politicians, filterParty, filterUF, filterStatus],
  );

  const selecionados = politicians.filter((p) => selected.includes(p.id));
  const melhor = Math.max(...politicians.map((p) => p.score.final), 0);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id].slice(-MAX_SELECAO),
    );
  };

  const selectClass =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none";

  return (
    <div>
      {/* Filtros */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">Filtros</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Partido</label>
            <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              {parties.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Estado</label>
            <select value={filterUF} onChange={(e) => setFilterUF(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              {ufs.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Termômetro</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              <option value="GREEN">🟢 Confiável</option>
              <option value="YELLOW">🟡 Atenção</option>
              <option value="RED">🔴 Não Confiável</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seleção */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-100">
          Selecionar políticos ({selected.length}/{MAX_SELECAO}) — {filtrados.length} encontrados
        </h2>
        <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto md:grid-cols-4 lg:grid-cols-6">
          {filtrados.map((p) => {
            const isSel = selected.includes(p.id);
            const bloqueado = !isSel && selected.length >= MAX_SELECAO;
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={bloqueado}
                className={`rounded-lg border p-3 text-left transition ${
                  isSel
                    ? "border-sky-500 bg-sky-500/10"
                    : bloqueado
                      ? "cursor-not-allowed border-slate-800 opacity-40"
                      : "border-slate-700 hover:border-sky-500/50"
                }`}
              >
                <div className="truncate text-xs font-semibold text-slate-200">
                  {p.politicalName}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {p.party} / {p.uf} · {p.score.final.toFixed(1)}
                </div>
              </button>
            );
          })}
          {filtrados.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">
              Nenhum político corresponde aos filtros.
            </p>
          )}
        </div>
      </div>

      {/* Comparação */}
      {selecionados.length >= 2 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {selecionados.map((p) => {
            const status = STATUS_STYLE[p.score.status] ?? STATUS_STYLE.GRAY;
            const ehMelhor = p.score.final === melhor && selecionados.length > 1;
            return (
              <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="mb-4 flex items-center gap-4">
                  <Image
                    src={p.photoUrl || "/avatar-placeholder.svg"}
                    alt=""
                    width={60}
                    height={60}
                    className="h-14 w-14 rounded-full object-cover"
                    unoptimized
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/politicos/${p.id}`}
                      className="block truncate font-bold text-slate-100 hover:underline"
                    >
                      {p.politicalName}
                    </Link>
                    <div className="truncate text-sm text-slate-500">
                      {p.party} • {p.office} · {p.uf}
                    </div>
                  </div>
                </div>

                <div className="mb-5 text-center">
                  <div className={`text-5xl font-bold ${ehMelhor ? "text-emerald-400" : "text-slate-100"}`}>
                    {p.score.final.toFixed(1)}
                  </div>
                  {ehMelhor && (
                    <div className="mt-1 text-xs font-medium text-emerald-400">
                      maior nota da seleção
                    </div>
                  )}
                  <div className={`mt-2 inline-block rounded-full border px-3 py-1 text-sm font-semibold ${status.chip}`}>
                    {status.label}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-400">Confiança dos dados</span>
                    <span className="font-semibold text-slate-200">
                      {p.score.confidence.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${Math.min(100, p.score.confidence)}%` }}
                    />
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Métricas detalhadas (votos, autorias, presenças) no{" "}
                  <Link href={`/politicos/${p.id}`} className="text-sky-400 hover:underline">
                    perfil completo
                  </Link>
                  .
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <p className="text-slate-400">
            Selecione pelo menos 2 políticos para comparar.
          </p>
        </div>
      )}
      {/* Compartilhar + exportar */}
      {selecionados.length >= 2 && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-100">
            Compartilhar comparação
          </h3>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              readOnly
              value={
                typeof window !== "undefined"
                  ? window.location.href
                  : `/comparar?ids=${selected.join(",")}`
              }
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
            >
              {copiado ? "Copiado!" : "Copiar link"}
            </button>
            <button
              type="button"
              onClick={() => exportToCSV(selecionados)}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              📊 Exportar CSV
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Quem abrir o link vê exatamente esta seleção. O CSV exporta nome,
            partido, UF, nota, confiança e status.
          </p>
        </div>
      )}
    </div>
  );
}
