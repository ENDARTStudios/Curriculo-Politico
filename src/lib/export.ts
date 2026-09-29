/**
 * Exportação CSV de comparações — client-side (download direto no browser).
 */
export interface LinhaComparacao {
  politicalName: string;
  party: string | null;
  uf: string | null;
  score: {
    final: number;
    confidence: number;
    status: string;
  };
}

export function exportToCSV(politicians: LinhaComparacao[]): void {
  const headers = [
    "Nome",
    "Partido",
    "UF",
    "Nota Final",
    "Confiança",
    "Status",
  ];

  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  const rows = politicians.map((p) =>
    [
      p.politicalName,
      p.party ?? "",
      p.uf ?? "",
      p.score.final.toFixed(1),
      p.score.confidence.toFixed(0),
      p.score.status,
    ]
      .map(esc)
      .join(","),
  );

  // BOM para Excel reconhecer UTF-8 (acentos)
  const csv = "\uFEFF" + [headers.map(esc).join(","), ...rows].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `comparacao_${new Date().toISOString().slice(0, 10)}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
