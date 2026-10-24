/**
 * BOT TRADUTOR — audita a cobertura dos dicionários e prepara o que falta.
 *
 *   npm run bot:traduzir              (relatório)
 *   npm run bot:traduzir -- --traduzir (chama o provedor, se configurado)
 *   npm run bot:traduzir -- --estrito  (sai 1 se houver pendência)
 *
 * ── O que ele NÃO faz: aplicar tradução sozinho ────────────────────────────
 * Mesmo com provedor configurado, a saída é um **patch em
 * `data/traducao/<data>-patch.json`** para revisão. Tradução de interface carrega
 * decisão de produto — "nota" não é "grade", "proposição" não é "proposition" — e
 * uma tradução ruim publicada em silêncio é pior que uma pendente visível.
 *
 * O bot resolve o trabalho mecânico (detectar, enfileirar, traduzir em lote,
 * formatar o patch); a decisão de publicar continua humana.
 *
 * ── Como ele detecta pendência ─────────────────────────────────────────────
 * 1. **Chave faltando** — o TypeScript já impede (`Record<ChaveDicionario, string>`),
 *    mas o bot confere em runtime porque um `as` perdido pode furar isso.
 * 2. **Valor igual ao português** — suspeita de string não traduzida. Há
 *    exceções legítimas (nome do produto, siglas), listadas em `INVARIANTES`.
 *
 * ── Provedor ───────────────────────────────────────────────────────────────
 * Compatível com endpoints OpenAI (`/chat/completions`):
 *   TRADUZIR_BASE_URL, TRADUZIR_MODELO, TRADUZIR_API_KEY
 * Sem as três, o bot só audita e enfileira — e diz isso claramente.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DICIONARIOS } from "../../web/src/lib/i18n/dicionarios";
import { LOCALES, ROTULO_IDIOMA, type Locale } from "../../web/src/lib/i18n/config";

const RAIZ = resolve(__dirname, "..", "..", "..");
const DIR_SAIDA = join(RAIZ, "data", "traducao");

const TRADUZIR = process.argv.includes("--traduzir");
const ESTRITO = process.argv.includes("--estrito");

const BASE = process.env.TRADUZIR_BASE_URL;
const MODELO = process.env.TRADUZIR_MODELO;
const CHAVE = process.env.TRADUZIR_API_KEY;
const PROVEDOR_CONFIGURADO = Boolean(BASE && MODELO && CHAVE);

/**
 * Valores que podem ser idênticos ao português sem serem erro.
 *
 * Sigla, nome próprio e termo já usado no idioma de destino. Se entrar aqui algo
 * que deveria ser traduzido, o custo é uma pendência não reportada — por isso a
 * lista é curta e comentada.
 */
const INVARIANTES = new Set([
  "LGPD", // nome da lei brasileira; traduzir descaracterizaria
  "Cookies",
  "Ranking", // usado assim em pt, en e es
  "Partidos", // igual em es
  "Comparar", // igual em es
  "Metodología",
  "Historia",
  "EE. UU.",
  "Currículo Político — página inicial", // nome do produto não se traduz
  "Currículo Político — página de inicio",
  "Currículo Político — home page",
]);

interface Pendencia {
  locale: Locale;
  chave: string;
  valorPt: string;
  valorAtual: string | null;
  motivo: "chave-ausente" | "nao-traduzido";
  /**
   * `erro` = defeito objetivo (chave não existe → a interface mostra a chave
   * crua). `aviso` = valor igual ao português, que **pode** ser legítimo.
   *
   * A distinção existe porque a primeira versão tratava tudo como pendência e
   * reportou 23 itens — todos falsos positivos: "Explorar", "Entender", "Idioma",
   * "Políticos", "Status" e "Ranking personalizado" são idênticos de fato nos três
   * idiomas. Um bot que grita sobre o que está certo ensina a ser ignorado.
   */
  severidade: "erro" | "aviso";
}

function auditar(): Pendencia[] {
  const pt = DICIONARIOS["pt-BR"];
  const pendencias: Pendencia[] = [];

  for (const locale of LOCALES) {
    if (locale === "pt-BR") continue;
    const dic = DICIONARIOS[locale] ?? ({} as Record<string, string>);

    for (const chave of Object.keys(pt)) {
      const valorPt = pt[chave as keyof typeof pt];
      const valor = dic[chave as keyof typeof dic] as string | undefined;

      if (valor === undefined) {
        pendencias.push({
          locale,
          chave,
          valorPt,
          valorAtual: null,
          motivo: "chave-ausente",
          severidade: "erro",
        });
        continue;
      }

      // Tradução idêntica ao original: suspeita, salvo invariante.
      if (valor === valorPt && !INVARIANTES.has(valorPt) && valorPt.length > 3) {
        pendencias.push({
          locale,
          chave,
          valorPt,
          valorAtual: valor,
          motivo: "nao-traduzido",
          severidade: "aviso",
        });
      }
    }
  }
  return pendencias;
}

/** Traduz um lote de strings pelo provedor compatível com OpenAI. */
async function traduzirLote(
  textos: string[],
  locale: Locale,
): Promise<string[] | { erro: string }> {
  const alvo = ROTULO_IDIOMA[locale];

  try {
    const resposta = await fetch(`${BASE!.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHAVE}`,
      },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You are a professional UI translator for a Brazilian political transparency platform. ` +
              `Translate the user-facing strings into ${alvo}. ` +
              `Rules: keep product name "Currículo Político" untranslated; preserve placeholders like {n} and {versao}; ` +
              `keep legal references (LGPD, TSE, STF) as-is; use concise product language, not literal translation. ` +
              `Reply ONLY with a JSON object where each key is the original string and each value is the translation.`,
          },
          {
            role: "user",
            content: JSON.stringify(textos),
          },
        ],
      }),
    });

    if (!resposta.ok) {
      return { erro: `HTTP ${resposta.status}` };
    }

    const dados = (await resposta.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const conteudo = dados.choices?.[0]?.message?.content;
    if (!conteudo) return { erro: "resposta sem conteúdo" };

    const mapa = JSON.parse(conteudo) as Record<string, string>;
    return textos.map((t) => mapa[t] ?? t);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  console.log("\n🌐 BOT TRADUTOR\n");
  console.log(`   locales: ${LOCALES.join(", ")}`);

  const pendencias = auditar();
  const erros = pendencias.filter((p) => p.severidade === "erro");
  const avisos = pendencias.filter((p) => p.severidade === "aviso");

  if (pendencias.length === 0) {
    console.log("\n   ✅ todos os dicionários estão completos e traduzidos.\n");
    return;
  }

  const porLocale = pendencias.reduce<Record<string, { erros: number; avisos: number }>>(
    (acc, p) => {
      acc[p.locale] ??= { erros: 0, avisos: 0 };
      acc[p.locale][p.severidade === "erro" ? "erros" : "avisos"] += 1;
      return acc;
    },
    {},
  );

  console.log(`\n   erros: ${erros.length} · avisos: ${avisos.length}`);
  for (const [locale, c] of Object.entries(porLocale)) {
    console.log(`      ${locale}: ${c.erros} erro(s), ${c.avisos} aviso(s)`);
  }

  if (erros.length === 0) {
    console.log(
      "\n   Nenhum defeito. Os avisos são valores idênticos ao português que\n" +
        "   podem ser legítimos (\"Explorar\", \"Idioma\", \"Status\" são iguais nos\n" +
        "   três idiomas) — revise a lista, não saia traduzindo à força.",
    );
  }

  mkdirSync(DIR_SAIDA, { recursive: true });
  const data = new Date().toISOString().slice(0, 10);

  // Relatório sempre — é o artefato que humano e bot compartilham.
  const relatorio = join(DIR_SAIDA, `${data}-pendencias.json`);
  writeFileSync(relatorio, JSON.stringify(pendencias, null, 2), "utf8");
  console.log(`\n   relatório: ${relatorio.replace(RAIZ + "\\", "").replace(RAIZ + "/", "")}`);

  const lista = pendencias
    .slice(0, 60)
    .map((p) => `| ${p.locale} | \`${p.chave}\` | ${p.motivo} | ${p.severidade} |`)
    .join("\n");
  const md = join(DIR_SAIDA, `${data}-pendencias.md`);
  writeFileSync(
    md,
    `# Pendências de tradução — ${data}\n\n` +
      `Erros: **${erros.length}** · Avisos: **${avisos.length}**\n\n` +
      `> **Erro** = chave ausente; a interface mostraria a chave crua.\n` +
      `> **Aviso** = valor idêntico ao português; pode ser legítimo.\n\n` +
      `| Idioma | Chave | Motivo | Severidade |\n|---|---|---|---|\n${lista}\n\n` +
      (pendencias.length > 60 ? `_… e mais ${pendencias.length - 60}._\n` : ""),
    "utf8",
  );

  if (!TRADUZIR) {
    console.log("\n   (use --traduzir para chamar o provedor)\n");
  } else if (!PROVEDOR_CONFIGURADO) {
    console.log(
      "\n   ⚠️  --traduzir pedido, mas o provedor não está configurado.\n" +
        "      Defina TRADUZIR_BASE_URL, TRADUZIR_MODELO e TRADUZIR_API_KEY.\n" +
        "      O bot não inventa tradução: sem provedor, ele apenas enfileira.\n",
    );
  } else {
    console.log(`\n   traduzindo com ${MODELO}…`);
    const patch: Record<string, Record<string, string>> = {};

    for (const locale of Object.keys(porLocale) as Locale[]) {
      const textos = [...new Set(pendencias.filter((p) => p.locale === locale).map((p) => p.valorPt))];
      const resultado = await traduzirLote(textos, locale);

      if (!Array.isArray(resultado)) {
        console.log(`      ${locale}: falhou (${resultado.erro})`);
        continue;
      }

      const mapa: Record<string, string> = {};
      textos.forEach((original, i) => {
        mapa[original] = resultado[i];
      });
      patch[locale] = mapa;
      console.log(`      ${locale}: ${textos.length} string(s)`);
    }

    const arquivoPatch = join(DIR_SAIDA, `${data}-patch.json`);
    writeFileSync(arquivoPatch, JSON.stringify(patch, null, 2), "utf8");
    console.log(
      `\n   patch para revisão: ${arquivoPatch.replace(RAIZ + "\\", "").replace(RAIZ + "/", "")}\n` +
        "   Nada foi aplicado: publicação de tradução é decisão humana.\n",
    );
  }

  /*
    Código de saída por severidade.

    Erro (chave ausente) é defeito objetivo e falha sempre. Aviso só falha com
    `--estrito`, porque igualdade de texto entre idiomas é hipótese, não defeito —
    e um gate que falha por hipótese é desligado na primeira semana.
  */
  if (erros.length > 0 || (ESTRITO && avisos.length > 0)) process.exitCode = 1;
}

main().catch((e) => {
  console.error("\n❌ Falhou:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
