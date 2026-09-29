interface ProfileNavProps {
  items: Array<{ id: string; label: string }>;
}

export function ProfileNav({ items }: ProfileNavProps) {
  if (items.length === 0) return null;
  return (
    <nav className="sticky top-0 z-10 -mx-6 mb-6 border-b border-slate-800/80 bg-slate-950/95 px-6 py-3 backdrop-blur">
      <div className="flex gap-5 overflow-x-auto">
        {items.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="whitespace-nowrap text-sm text-slate-400 transition hover:text-slate-100"
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
