/**
 * Ranking Histórico — eras e figuras com dados públicos notórios.
 * Conteúdo educacional baseado em fontes historiográficas consolidadas
 * (FGV/CPDOC, Senado, Presidência). Critérios adaptados por era.
 *   npm run db:seed-historical
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ERAS = [
  {
    name: "República Velha (1889–1930)",
    startYear: 1889,
    endYear: 1930,
    description:
      "Primeira fase republicana, dominada pelas oligarquias de SP e MG (política do café com leite).",
  },
  {
    name: "Era Vargas (1930–1945)",
    startYear: 1930,
    endYear: 1945,
    description:
      "Período de centralização política, legislação trabalhista e industrialização. Inclui o Estado Novo (1937-1945).",
  },
  {
    name: "República Nova (1946–1964)",
    startYear: 1946,
    endYear: 1964,
    description: "Redemocratização pós-Vargas, com multipartidarismo e instabilidade política.",
  },
  {
    name: "Ditadura Militar (1964–1985)",
    startYear: 1964,
    endYear: 1985,
    description:
      "Regime autoritário com cassações, AI-5 e censura. Período de crescimento econômico e repressão.",
  },
  {
    name: "Redemocratização (1985–presente)",
    startYear: 1985,
    endYear: new Date().getFullYear(),
    description:
      "Nova República, Constituição de 1988, eleições diretas e estabilidade institucional.",
  },
];

const FIGURAS = [
  {
    name: "Getúlio Vargas",
    era: "Era Vargas (1930–1945)",
    office: "Presidente",
    startYear: 1930,
    endYear: 1945,
    party: "Sem partido (Estado Novo)",
    achievements: [
      "Criação da CLT (1943)",
      "Voto feminino (1932)",
      "Criação da Petrobras (1953, no segundo governo)",
      "Industrialização via Estado",
    ],
    controversies: [
      "Estado Novo (1937-1945): fechamento do Congresso",
      "Censura e repressão política",
      "Suicídio em 1954 durante crise política",
    ],
    historicalScore: 72,
    scoreBreakdown: { legacy: 90, institutional: 60, democratic: 40 },
    sources: [
      "https://cpdoc.fgv.br/producao/dossies/AEraVargas1",
      "https://www.senado.leg.br/institucional/datasenado",
    ],
  },
  {
    name: "Juscelino Kubitschek",
    era: "República Nova (1946–1964)",
    office: "Presidente",
    startYear: 1956,
    endYear: 1961,
    party: "PSD",
    achievements: [
      "Construção de Brasília (1960)",
      'Plano de Metas: "50 anos em 5"',
      "Industrialização acelerada",
      "Estabilidade democrática",
    ],
    controversies: [
      "Endividamento externo elevado",
      "Inflação crescente no fim do mandato",
    ],
    historicalScore: 85,
    scoreBreakdown: { legacy: 95, institutional: 80, democratic: 85 },
    sources: [
      "https://cpdoc.fgv.br/producao/dossies/JK",
      "https://www.presidencia.gov.br/presidentes-anteriores",
    ],
  },
  {
    name: "João Goulart",
    era: "República Nova (1946–1964)",
    office: "Presidente",
    startYear: 1961,
    endYear: 1964,
    party: "PTB",
    achievements: ["Reformas de base propostas", "Política externa independente"],
    controversies: [
      "Deposto pelo golpe de 1964",
      "Instabilidade política e econômica",
    ],
    historicalScore: 55,
    scoreBreakdown: { legacy: 60, institutional: 40, democratic: 70 },
    sources: ["https://cpdoc.fgv.br/producao/dossies/Jango"],
  },
  {
    name: "Ernesto Geisel",
    era: "Ditadura Militar (1964–1985)",
    office: "Presidente",
    startYear: 1974,
    endYear: 1979,
    party: "ARENA",
    achievements: [
      'Início da abertura política ("lenta, gradual e segura")',
      "Revogação do AI-5 (1978)",
      "Acordo nuclear Brasil-Alemanha",
    ],
    controversies: [
      "Repressão continuada durante abertura",
      "Cassações de parlamentares",
    ],
    historicalScore: 48,
    scoreBreakdown: { legacy: 50, institutional: 30, democratic: 45 },
    sources: ["https://cpdoc.fgv.br/producao/dossies/Abertura"],
  },
  {
    name: "Tancredo Neves",
    era: "Redemocratização (1985–presente)",
    office: "Presidente (eleito)",
    startYear: 1985,
    endYear: 1985,
    party: "PMDB",
    achievements: [
      "Primeiro presidente civil eleito indiretamente pós-ditadura",
      "Articulação da transição democrática",
    ],
    controversies: ["Não tomou posse (faleceu antes)"],
    historicalScore: 70,
    scoreBreakdown: { legacy: 75, institutional: 80, democratic: 90 },
    sources: ["https://cpdoc.fgv.br/producao/dossies/Tancredo"],
  },
  {
    name: "José Sarney",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 1985,
    endYear: 1990,
    party: "PMDB",
    achievements: [
      "Convocação da Constituinte (1988)",
      "Redemocratização consolidada",
      "Fim da censura",
    ],
    controversies: [
      "Hiperinflação (Planos Cruzado, Bresser, Verão)",
      "Crise econômica severa",
    ],
    historicalScore: 62,
    scoreBreakdown: { legacy: 70, institutional: 75, democratic: 80 },
    sources: ["https://www.senado.leg.br/institucional/datasenado"],
  },
  {
    name: "Fernando Collor",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 1990,
    endYear: 1992,
    party: "PRN",
    achievements: [
      "Primeiro presidente eleito por voto direto pós-ditadura",
      "Abertura econômica",
    ],
    controversies: [
      "Impeachment por corrupção (1992)",
      "Confisco da poupança (Plano Collor)",
      "Esquema PC Farias",
    ],
    historicalScore: 25,
    scoreBreakdown: { legacy: 20, institutional: 15, democratic: 40 },
    sources: [
      "https://www.senado.leg.br/institucional/datasenado",
      "https://cpdoc.fgv.br/producao/dossies/Collor",
    ],
  },
  {
    name: "Itamar Franco",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 1992,
    endYear: 1994,
    party: "PMDB",
    achievements: [
      "Implementação do Plano Real (1994)",
      "Estabilização da moeda",
      "Restauração da confiança institucional",
    ],
    controversies: ["Governo de transição, baixa base parlamentar"],
    historicalScore: 78,
    scoreBreakdown: { legacy: 85, institutional: 80, democratic: 85 },
    sources: ["https://www.presidencia.gov.br/presidentes-anteriores"],
  },
  {
    name: "Fernando Henrique Cardoso",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 1995,
    endYear: 2002,
    party: "PSDB",
    achievements: [
      "Consolidação do Plano Real",
      "Lei de Responsabilidade Fiscal (2000)",
      "Privatizações e modernização",
      "Reeleição (1998)",
    ],
    controversies: ["Crise cambial (1999)", "Apagão energético (2001)", "Desemprego elevado"],
    historicalScore: 80,
    scoreBreakdown: { legacy: 85, institutional: 85, democratic: 80 },
    sources: [
      "https://www.presidencia.gov.br/presidentes-anteriores",
      "https://cpdoc.fgv.br/producao/dossies/FHC",
    ],
  },
  {
    name: "Luiz Inácio Lula da Silva",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 2003,
    endYear: 2010,
    party: "PT",
    achievements: [
      "Bolsa Família (2003)",
      "Redução da pobreza e desigualdade",
      "Crescimento econômico com distribuição de renda",
      "Protagonismo internacional (BRICS)",
    ],
    controversies: [
      "Escândalo do Mensalão (2005)",
      "Investigações da Lava Jato (posterior)",
    ],
    historicalScore: 82,
    scoreBreakdown: { legacy: 90, institutional: 75, democratic: 80 },
    sources: ["https://www.presidencia.gov.br/presidentes-anteriores"],
  },
  {
    name: "Dilma Rousseff",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 2011,
    endYear: 2016,
    party: "PT",
    achievements: [
      "Primeira mulher presidente do Brasil",
      "Programas sociais continuados",
      "Pleno emprego no início do mandato",
    ],
    controversies: [
      "Impeachment (2016) por pedaladas fiscais",
      "Recessão econômica (2014-2016)",
      "Operação Lava Jato",
    ],
    historicalScore: 58,
    scoreBreakdown: { legacy: 65, institutional: 50, democratic: 70 },
    sources: ["https://www.presidencia.gov.br/presidentes-anteriores"],
  },
  {
    name: "Michel Temer",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 2016,
    endYear: 2018,
    party: "MDB",
    achievements: [
      "Aprovação da Reforma Trabalhista (2017)",
      "Teto de Gastos (EC 95/2016)",
      "Estabilização fiscal",
    ],
    controversies: [
      "Denúncias por corrupção (2017)",
      "Impopularidade recorde",
      "Reforma via decreto",
    ],
    historicalScore: 45,
    scoreBreakdown: { legacy: 40, institutional: 45, democratic: 50 },
    sources: ["https://www.presidencia.gov.br/presidentes-anteriores"],
  },
  {
    name: "Jair Bolsonaro",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 2019,
    endYear: 2022,
    party: "PL",
    achievements: [
      "Reforma da Previdência (2019)",
      "Independência do Banco Central (2021)",
      "Pix e digitalização",
    ],
    controversies: [
      "Gestão da pandemia de COVID-19",
      "Inquéritos por fake news e atos antidemocráticos",
      "Derrota eleitoral e questionamento das urnas",
    ],
    historicalScore: 52,
    scoreBreakdown: { legacy: 55, institutional: 40, democratic: 45 },
    sources: ["https://www.presidencia.gov.br/presidentes-anteriores"],
  },
  {
    name: "Luiz Inácio Lula da Silva (3º mandato)",
    era: "Redemocratização (1985–presente)",
    office: "Presidente",
    startYear: 2023,
    endYear: null,
    party: "PT",
    achievements: [
      "Retorno ao governo após condenações anuladas",
      "Reconstrução de programas sociais",
      "Protagonismo climático internacional",
    ],
    controversies: ["Julgamentos em andamento", "Polarização política"],
    historicalScore: null, // Mandato em curso: sem nota até a conclusão
    scoreBreakdown: null,
    sources: ["https://www.presidencia.gov.br"],
  },
];

async function seed() {
  console.log("📚 Populando ranking histórico...\n");

  const eraMap: Record<string, string> = {};
  for (const era of ERAS) {
    const created = await prisma.historicalEra.upsert({
      where: { name: era.name },
      update: {},
      create: era,
    });
    eraMap[era.name] = created.id;
    console.log(`✅ Era: ${era.name}`);
  }

  console.log("");
  for (const fig of FIGURAS) {
    const eraId = eraMap[fig.era];
    if (!eraId) {
      console.log(`⚠️  Era não encontrada: ${fig.era}`);
      continue;
    }
    await prisma.historicalPolitician.upsert({
      where: {
        name_office_startYear: {
          name: fig.name,
          office: fig.office,
          startYear: fig.startYear,
        },
      },
      update: {},
      create: {
        name: fig.name,
        eraId,
        office: fig.office,
        startYear: fig.startYear,
        endYear: fig.endYear,
        party: fig.party,
        achievements: fig.achievements,
        controversies: fig.controversies,
        historicalScore: fig.historicalScore,
        scoreBreakdown: fig.scoreBreakdown ?? undefined,
        sources: fig.sources,
      },
    });
    console.log(
      `✅ ${fig.name.padEnd(38)} | ${fig.office.padEnd(18)} | ${fig.historicalScore ?? "Em curso"}`,
    );
  }

  console.log("\n🎉 Ranking histórico populado.");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
