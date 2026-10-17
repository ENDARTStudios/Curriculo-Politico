/**
 * BOT DETETIVE — varre o banco e data/raw/ em busca de gaps e pendências,
 * classifica cada um (severidade + se é automatizável) e emite relatório
 * JSON + Markdown em data/gaps/.
 *
 *   npm run bot:gaps          (da raiz — read-only, nunca escreve no banco)
 *
 * Saída: data/gaps/<data>-gaps.json e .md; o caminho do relatório é
 * impresso como "RELATORIO=<path>" (consumido pelo auto-fix).
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const prisma = new PrismaClient();
const RAIZ = resolve(__dirname, "..", "..", "..");
const DIR_GAPS = join(RAIZ, "data", "gaps");

type Severidade = "alta" | "media" | "baixa";

interface Gap {
  id: string;
  area: string;
  severidade: Severidade;
  descricao: string;
  qtd: number;
  /** Comando/cadeia que corrige automaticamente; null = decisão humana/externa */
  correcao: string | null;
}

/** Pares raw → carga da Câmara/Senado (fontes públicas, seguras p/ automação) */
const PARES_ETL: { raw: string; etl: string; carga: string }[] = [
  { raw: "camara_deputados_raw.json", etl: "etl:camara", carga: "db:load-camara-completa" },
  { raw: "senado_federal_raw.json", etl: "etl:senado", carga: "db:load-senado" },
  { raw: "camara_votacoes_historico_raw.json", etl: "etl:votacoes-historico", carga: "db:load-votacoes-historico" },
  { raw: "camara_proposicoes_raw.json", etl: "etl:proposicoes", carga: "db:load-proposicoes" },
  { raw: "camara_presenca_raw.json", etl: "etl:presenca", carga: "db:load-presenca" },
  { raw: "camara_despesas_bulk_raw.json", etl: "", carga: "db:load-ceap-bulk" },
  { raw: "tse_bens_raw.json", etl: "etl:bens", carga: "db:load-patrimony" },
  { raw: "camara_receitas_2022_agg.json", etl: "etl:receitas", carga: "db:load-receitas" },
  { raw: "fact_checking_raw.json", etl: "etl:fact-checking", carga: "db:load-fact-checking" },
];

function idadeDias(path: string): number | null {
  if (!existsSync(path)) return null;
  return Math.floor((Date.now() - statSync(path).mtimeMs) / 86_400_000);
}

/** Pendências estruturais não automatizáveis — reportadas sempre (visibilidade). */
function pendenciasExternas(): Gap[] {
  const gaps: Gap[] = [];
  const add = (id: string, area: string, sev: Severidade, desc: string) =>
    gaps.push({ id, area, severidade: sev, descricao: desc, qtd: 1, correcao: null });

  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    add("externa-sentry", "observabilidade", "media",
      "Sentry dormente: criar projeto em sentry.io e definir SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN na Vercel");
  }
  if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST) {
    add("externa-email", "conta do usuário", "alta",
      "Sem serviço de e-mail: bloqueia verificação de e-mail e recuperação de senha (RIPD §4)");
  }
  add("externa-dpo", "jurídico", "alta", "Nome do encarregado (DPO) pendente de publicação (Res. ANPD 18/2024)");
  add("externa-juridica", "jurídico", "alta", "Revisão jurídica humana dos termos/privacidade antes de divulgação");
  add("externa-sccs", "jurídico", "media", "Contratos Vercel/Sentry com SCCs (Res. ANPD 19/2024) não assinados");
  add("externa-tse-bulk", "dados", "media", "Bulk prestação de contas TSE (500MB) pendente — bloqueia doadores PF/PJ na dimensão Campanha");
  add("externa-consulta-2020", "dados", "baixa", "consulta_cand 2020 não carregada; sub-votações pré-2023 ausentes");
  add("externa-rootdir", "deploy", "media", "Vercel Root Directory = apps/web pendente no dashboard (deploy git-based)");
  return gaps;
}

async function escanear() {
  const gaps: Gap[] = [];
  const add = (g: Gap) => {
    if (g.qtd > 0) gaps.push(g);
  };
  const ano = new Date().getFullYear();
  const mandatoAtual = { OR: [{ endYear: null }, { endYear: { gte: ano } }] };

  // 1. Parlamentares
  const [pessoas, semTse, semFoto] = await Promise.all([
    prisma.person.count(),
    prisma.person.count({ where: { tseId: null } }),
    prisma.person.count({ where: { photoUrl: null } }),
  ]);
  add({ id: "pessoas-sem-tseid", area: "identidade", severidade: "media", descricao: "Parlamentares sem tseId (afiliação TSE não resolvida)", qtd: semTse, correcao: "bot:fix (resolve-identity)" });
  add({ id: "pessoas-sem-foto", area: "conteúdo", severidade: "baixa", descricao: "Parlamentares sem foto", qtd: semFoto, correcao: null });

  // 2. Termos ativos sem cobertura de dimensão
  const [semPresenca, semVotacao, semCeap, semFinance] = await Promise.all([
    prisma.term.count({ where: { ...mandatoAtual, sessionAttendances: { none: {} } } }),
    prisma.term.count({ where: { ...mandatoAtual, actions: { none: {} } } }),
    prisma.term.count({ where: { ...mandatoAtual, costs: { none: { category: { not: "PATRIMONY" } } } } }),
    prisma.term.count({ where: { ...mandatoAtual, finances: { none: {} } } }),
  ]);
  add({ id: "termos-sem-presenca", area: "presença", severidade: "media", descricao: "Mandatos ativos sem registros de presença", qtd: semPresenca, correcao: "bot:fix" });
  add({ id: "termos-sem-votacao", area: "presença", severidade: "media", descricao: "Mandatos ativos sem votos nominais", qtd: semVotacao, correcao: "bot:fix" });
  add({ id: "termos-sem-ceap", area: "custo", severidade: "media", descricao: "Mandatos ativos sem CEAP (custo parlamentar)", qtd: semCeap, correcao: "bot:fix:etl" });
  add({ id: "termos-sem-receitas", area: "campanha", severidade: "media", descricao: "Mandatos ativos sem prestação de contas (afeta Campanha 5% e confiança +5)", qtd: semFinance, correcao: null });

  // 3. Bills
  const [semResumo, resumoVazio, semTagRaw, bills] = await Promise.all([
    prisma.bill.count({ where: { simpleSummary: null } }),
    prisma.bill.count({ where: { simpleSummary: "" } }),
    prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM "Bill" WHERE "tags" IS NULL OR "tags" = '[]'::jsonb`,
    prisma.bill.count(),
  ]);
  const semTag = semTagRaw[0]?.n ?? 0;
  add({ id: "bills-sem-resumo", area: "conteúdo", severidade: "alta", descricao: "Projetos sem resumo em linguagem simples (null = nunca processados)", qtd: semResumo, correcao: "bot:fix (tag + resumos)" });
  add({ id: "bills-resumo-vazio", area: "conteúdo", severidade: "baixa", descricao: "Projetos processados sem categoria conhecida (marcados '')", qtd: resumoVazio, correcao: null });
  add({ id: "bills-sem-tag", area: "conteúdo", severidade: "media", descricao: `Projetos sem tags temáticas (de ${bills})`, qtd: semTag, correcao: "bot:fix (tag)" });

  // 4. Patrimônio
  const semPatrimonio = await prisma.person.count({ where: { patrimonyHistory: { none: {} } } });
  add({ id: "pessoas-sem-patrimonio", area: "patrimônio", severidade: "baixa", descricao: "Parlamentares sem histórico patrimonial", qtd: semPatrimonio, correcao: null });

  // 5. Scores e snapshots
  const limiteStale = new Date(Date.now() - 45 * 86_400_000);
  const [stale, porStatus, snapshotHoje] = await Promise.all([
    prisma.score.count({ where: { calculatedAt: { lt: limiteStale } } }),
    prisma.score.groupBy({ by: ["reliabilityStatus"], _count: true }),
    prisma.scoreSnapshot.count({ where: { snapshotDate: { gte: new Date(new Date().toISOString().slice(0, 10)) } } }),
  ]);
  add({ id: "scores-stale", area: "score", severidade: "media", descricao: "Scores calculados há mais de 45 dias", qtd: stale, correcao: "bot:fix (recalculate)" });
  add({ id: "snapshot-hoje", area: "score", severidade: "alta", descricao: "Snapshot de hoje ainda não gerado", qtd: snapshotHoje > 0 ? 0 : 1, correcao: "bot:fix (snapshot)" });
  const status = porStatus.map((s) => `${s.reliabilityStatus}:${s._count}`).join(" ");
  console.log(`📊 Scores: ${status} | snapshots hoje: ${snapshotHoje > 0 ? "OK" : "AUSENTE"}`);

  // 6. Raws (existência e frescor)
  for (const par of PARES_ETL) {
    const p = join(RAIZ, "data", "raw", par.raw);
    const idade = idadeDias(p);
    if (idade === null) {
      gaps.push({ id: `raw-ausente-${par.raw}`, area: "pipeline", severidade: "media", descricao: `Raw ausente: data/raw/${par.raw}`, qtd: 1, correcao: par.etl ? `bot:fix:etl (${par.etl})` : null });
    } else if (idade > 7) {
      gaps.push({ id: `raw-velho-${par.raw}`, area: "pipeline", severidade: "baixa", descricao: `Raw desatualizado (${idade} dias): data/raw/${par.raw}`, qtd: 1, correcao: par.etl ? `bot:fix:etl (${par.etl})` : null });
    }
  }

  // 7. Externas
  gaps.push(...pendenciasExternas());

  // Relatório
  const automatizaveis = gaps.filter((g) => g.correcao);
  const relatorio = {
    gerado_em: new Date().toISOString(),
    totais: { gaps: gaps.length, automatizaveis: automatizaveis.length, manuais: gaps.length - automatizaveis.length },
    scores: status,
    pessoas,
    bills,
    gaps: gaps.sort((a, b) => (a.correcao ? 1 : 0) - (b.correcao ? 1 : 0)),
  };

  mkdirSync(DIR_GAPS, { recursive: true });
  const hoje = new Date().toISOString().slice(0, 10);
  const jsonPath = join(DIR_GAPS, `${hoje}-gaps.json`);
  const mdPath = join(DIR_GAPS, `${hoje}-gaps.md`);
  writeFileSync(jsonPath, JSON.stringify(relatorio, null, 2));

  const linhas = gaps.map((g) => {
    const fix = g.correcao ? `🔧 ${g.correcao}` : "👤 manual/externo";
    return `| ${g.severidade === "alta" ? "🔴" : g.severidade === "media" ? "🟡" : "⚪"} | ${g.area} | ${g.descricao} | **${g.qtd}** | ${fix} |`;
  });
  const md = `# Relatório de Gaps — ${hoje}

**Totais:** ${relatorio.totais.gaps} gaps · ${relatorio.totais.automatizaveis} automatizáveis · ${relatorio.totais.manuais} manuais/externos
**Scores:** ${status} · Pessoas: ${pessoas} · Bills: ${bills}

| Sev | Área | Gap | Qtd | Correção |
|---|---|---|---|---|
${linhas.join("\n")}
`;
  writeFileSync(mdPath, md);

  console.log(`\n🔍 ${relatorio.totais.gaps} gaps (${relatorio.totais.automatizaveis} automatizáveis, ${relatorio.totais.manuais} manuais)`);
  for (const g of gaps.filter((x) => x.severidade === "alta").slice(0, 8)) {
    console.log(`  🔴 [${g.area}] ${g.descricao} (${g.qtd})${g.correcao ? ` → ${g.correcao}` : ""}`);
  }
  console.log(`RELATORIO=${jsonPath}`);
  return relatorio;
}

escanear()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
