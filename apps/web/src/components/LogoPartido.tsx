import Image from "next/image";

/**
 * Logo do partido, com monograma desenhado quando não há arquivo.
 *
 * ── Por que o fallback não é "imagem quebrada" nem logo genérica ───────────
 * O campo `Party.logoUrl` é nulo para a maioria das legendas — a marca pertence
 * ao partido e o uso aqui é nominativo, então carregar 22 arquivos sem conferir
 * origem e permissão seria pior que não ter nenhum.
 *
 * O monograma resolve isso sem parecer provisório: usa a **sigla** do partido e a
 * **cor** que o próprio partido já tem no banco (usada nos gráficos), num quadrado
 * de canto arredondado. Quando o arquivo existir, ele entra no mesmo lugar e o
 * layout não muda.
 *
 * ── Contraste ──────────────────────────────────────────────────────────────
 * A cor nunca preenche o fundo com texto por cima. Ela aparece como anel e como
 * fundo translúcido (12%), e o texto fica em `slate-50` sobre `slate-900`. Isso
 * garante AA com qualquer cor de partido — inclusive amarelo e branco, que
 * reprovariam se fossem fundo de texto claro.
 */
export function LogoPartido({
  acronym,
  name,
  logoUrl,
  color,
  tamanho = 40,
}: {
  acronym: string;
  name?: string | null;
  logoUrl?: string | null;
  color?: string | null;
  /** Lado do quadrado, em pixels. */
  tamanho?: number;
}) {
  const rotulo = name ? `${acronym} — ${name}` : acronym;

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={rotulo}
        width={tamanho}
        height={tamanho}
        className="shrink-0 rounded-lg bg-slate-800 object-contain p-1"
        style={{ width: tamanho, height: tamanho }}
        unoptimized
      />
    );
  }

  // Cor do partido como anel; fundo translúcido. `color` pode vir "#RRGGBB".
  const anel = color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : "#475569";

  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-lg border bg-slate-900 font-bold tracking-tight text-slate-50"
      style={{
        width: tamanho,
        height: tamanho,
        borderColor: anel,
        backgroundColor: `${anel}1f`,
        fontSize: Math.max(10, Math.round(tamanho * 0.32)),
      }}
      title={rotulo}
    >
      {acronym.slice(0, 4)}
    </span>
  );
}
