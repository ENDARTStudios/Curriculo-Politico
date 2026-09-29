"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface ProjetoFiltersProps {
  tipos: string[];
  anos: number[];
}

export function ProjetoFilters({ tipos, anos }: ProjetoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.set("page", "1");
      startTransition(() => router.push(`/projetos?${params.toString()}`));
    },
    [router, searchParams],
  );

  const selectClass =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none";

  return (
    <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-100">Filtros</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-4">
          <label className="mb-1 block text-sm font-medium text-slate-300">
            Buscar por título ou palavra-chave
          </label>
          <input
            type="text"
            defaultValue={searchParams.get("q") ?? ""}
            onBlur={(e) => updateFilter("q", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateFilter("q", (e.target as HTMLInputElement).value);
              }
            }}
            placeholder="Ex: tributária, saúde, educação..."
            className={selectClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Tipo</label>
          <select
            value={searchParams.get("type") ?? ""}
            onChange={(e) => updateFilter("type", e.target.value)}
            className={selectClass}
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Ano</label>
          <select
            value={searchParams.get("year") ?? ""}
            onChange={(e) => updateFilter("year", e.target.value)}
            className={selectClass}
          >
            <option value="">Todos</option>
            {anos.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => startTransition(() => router.push("/projetos"))}
            className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {isPending && <div className="mt-4 text-sm text-slate-500">Atualizando...</div>}
    </div>
  );
}
