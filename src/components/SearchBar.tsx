"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface SearchResult {
  politicians: Array<{
    id: string;
    name: string;
    party: string;
    office: string;
    photo: string | null;
  }>;
  parties: Array<{
    id: string;
    acronym: string;
    name: string;
    position: string | null;
    memberCount: number;
  }>;
  bills: Array<{
    id: string;
    externalId: string | null;
    title: string;
    type: string | null;
    authors: string[];
    date: string | null;
  }>;
  historical: Array<{
    id: string;
    name: string;
    office: string;
    era: string | null;
    score: number | null;
  }>;
}

interface Item {
  href: string;
  label: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atalhos: Ctrl+K ou "/"
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? null);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(value), 300);
  };

  const flatItems: Item[] = results
    ? [
        ...results.politicians.map((p) => ({
          href: `/politicos/${p.id}`,
          label: p.name,
        })),
        ...results.parties.map((p) => ({
          href: `/partidos/${encodeURIComponent(p.acronym)}`,
          label: p.acronym,
        })),
        ...results.bills.map((b) => ({
          href: `/projetos/${b.externalId ?? b.id}`,
          label: b.title,
        })),
        ...results.historical.map(() => ({
          href: "/historia",
          label: "história",
        })),
      ]
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0 && flatItems[activeIndex]) {
      window.location.href = flatItems[activeIndex].href;
    }
  };

  const hasResults =
    results &&
    (results.politicians.length > 0 ||
      results.parties.length > 0 ||
      results.bills.length > 0 ||
      results.historical.length > 0);

  const sectionClass = "border-t border-slate-800 p-2 first:border-t-0";
  const headerClass =
    "px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500";
  const itemClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg p-2 transition ${
      active ? "bg-slate-800" : "hover:bg-slate-800/60"
    }`;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar políticos, partidos, projetos... (Ctrl+K)"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-8 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          </div>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full z-50 mt-2 max-h-[70vh] w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 shadow-xl">
          {!hasResults && !loading ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          ) : (
            <>
              {/* Políticos */}
              {results && results.politicians.length > 0 && (
                <div className={sectionClass}>
                  <div className={headerClass}>Políticos</div>
                  {results.politicians.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/politicos/${p.id}`}
                      className={itemClass(activeIndex === i)}
                    >
                      <Image
                        src={p.photo || "/avatar-placeholder.svg"}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                        unoptimized
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-100">
                          {p.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {p.party} • {p.office}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Partidos */}
              {results && results.parties.length > 0 && (
                <div className={sectionClass}>
                  <div className={headerClass}>Partidos</div>
                  {results.parties.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/partidos/${encodeURIComponent(p.acronym)}`}
                      className={itemClass(
                        activeIndex === results.politicians.length + i,
                      )}
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800">
                        <span className="text-sm font-bold text-sky-400">
                          {p.acronym.slice(0, 3)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-100">
                          {p.acronym}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {p.memberCount} parlamentares
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Projetos */}
              {results && results.bills.length > 0 && (
                <div className={sectionClass}>
                  <div className={headerClass}>Projetos de Lei</div>
                  {results.bills.map((b, i) => (
                    <Link
                      key={b.id}
                      href={`/projetos/${b.externalId ?? b.id}`}
                      className={itemClass(
                        activeIndex ===
                          results.politicians.length + results.parties.length + i,
                      )}
                    >
                      <span className="flex-shrink-0 rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-xs font-semibold text-purple-300">
                        {b.type ?? "PL"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium text-slate-200">
                          {b.title}
                        </div>
                        {b.authors.length > 0 && (
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {b.authors.join(", ")}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Histórico */}
              {results && results.historical.length > 0 && (
                <div className={sectionClass}>
                  <div className={headerClass}>Histórico</div>
                  {results.historical.map((h, i) => (
                    <Link
                      key={h.id}
                      href="/historia"
                      className={itemClass(
                        activeIndex ===
                          results.politicians.length +
                            results.parties.length +
                            results.bills.length +
                            i,
                      )}
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-lg">
                        📜
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-100">
                          {h.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {h.office} • {h.era}
                        </div>
                      </div>
                      {h.score !== null && (
                        <span className="text-sm font-bold text-slate-200">
                          {h.score.toFixed(0)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {/* Rodapé */}
              <div className="border-t border-slate-800 p-2">
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-500">
                  <span>↑↓ navegar · Enter abrir · Esc fechar</span>
                  <Link
                    href={`/projetos?q=${encodeURIComponent(query)}`}
                    className="text-sky-400 hover:underline"
                  >
                    Ver todos os projetos →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
