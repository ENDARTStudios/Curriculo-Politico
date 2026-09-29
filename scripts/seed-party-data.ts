/**
 * Enriquecimento dos partidos: ideologia, posição no espectro, fundação,
 * número TSE, cor oficial e história. Dados públicos notórios
 * (registro TSE + ciência política brasileira consolidada).
 *   npm run db:seed-parties
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PARTY_DATA: Array<{
  acronym: string;
  ideology: string;
  position: string;
  foundedYear: number;
  tseNumber: number;
  color: string;
  history: string;
}> = [
  {
    acronym: "PT",
    ideology: "Social-democracia, Trabalhismo",
    position: "ESQUERDA",
    foundedYear: 1980,
    tseNumber: 13,
    color: "#E30000",
    history:
      "Fundado em 1980 por sindicalistas do ABC paulista, intelectuais e movimentos sociais, com Lula como principal articulador. Governou o Brasil de 2003 a 2016 e a partir de 2023. Base histórica em sindicatos, movimentos sociais e periferia urbana.",
  },
  {
    acronym: "PL",
    ideology: "Liberalismo econômico, Conservadorismo",
    position: "DIREITA",
    foundedYear: 2006,
    tseNumber: 22,
    color: "#0033A0",
    history:
      "Fundado em 2006 como Partido da República (PR), renomeado PL em 2019. Tornou-se o principal partido do bolsonarismo a partir de 2021, com a filiação de Jair Bolsonaro. Maior bancada da Câmara desde 2022.",
  },
  {
    acronym: "MDB",
    ideology: "Catch-all, Social-democracia",
    position: "CENTRO",
    foundedYear: 1980,
    tseNumber: 15,
    color: "#FF8C00",
    history:
      "Sucessor do MDB original (1966), que fez oposição à ditadura militar. Partido de centro pragmático, com forte presença municipal. Governou o Brasil com José Sarney (1985-1990) e Michel Temer (2016-2018).",
  },
  {
    acronym: "PSD",
    ideology: "Liberalismo econômico, Pragmatismo",
    position: "CENTRO",
    foundedYear: 2011,
    tseNumber: 55,
    color: "#0066B3",
    history:
      "Fundado em 2011 por Gilberto Kassab após dissidência do DEM. Partido de centro com forte articulação municipalista, presente em governos de diferentes orientações.",
  },
  {
    acronym: "PP",
    ideology: "Conservadorismo, Liberalismo econômico",
    position: "CENTRO_DIREITA",
    foundedYear: 1995,
    tseNumber: 11,
    color: "#004B93",
    history:
      "Sucessor de partidos da ARENA/PDS, fundado em 1995 como PPB. Forte base no agronegócio e em estados do Sul. Participou de governos de diferentes orientações desde 2003.",
  },
  {
    acronym: "UNIÃO",
    ideology: "Liberalismo econômico, Centro-direita",
    position: "CENTRO_DIREITA",
    foundedYear: 2021,
    tseNumber: 44,
    color: "#003366",
    history:
      "Fundado em 2021 pela fusão do DEM com o PSL. Um dos maiores partidos do Congresso, com base em setores empresariais e no agronegócio.",
  },
  {
    acronym: "PSDB",
    ideology: "Social-democracia (origem), Liberalismo",
    position: "CENTRO_ESQUERDA",
    foundedYear: 1988,
    tseNumber: 45,
    color: "#0066CC",
    history:
      "Fundado em 1988 por dissidentes do MDB, com Fernando Henrique Cardoso, Mário Covas e José Serra. Governou o Brasil de 1995 a 2002, implementando o Plano Real. Atualmente em processo de reorganização.",
  },
  {
    acronym: "PSOL",
    ideology: "Socialismo democrático, Esquerda",
    position: "ESQUERDA",
    foundedYear: 2004,
    tseNumber: 50,
    color: "#FFCC00",
    history:
      "Fundado em 2004 por dissidentes do PT contrários à reforma da previdência. Forte presença em movimentos urbanos e acadêmicos. Eleição mais expressiva: 2022, integrado à federação com a Rede.",
  },
  {
    acronym: "PDT",
    ideology: "Trabalhismo, Nacionalismo",
    position: "CENTRO_ESQUERDA",
    foundedYear: 1980,
    tseNumber: 12,
    color: "#FF6600",
    history:
      "Fundado em 1980 por Leonel Brizola no retorno do exílio. Herdeiro histórico do trabalhismo getulista. Forte base no Rio de Janeiro e no movimento sindical.",
  },
  {
    acronym: "REPUBLICANOS",
    ideology: "Conservadorismo, Republicanismo",
    position: "CENTRO_DIREITA",
    foundedYear: 2005,
    tseNumber: 10,
    color: "#006600",
    history:
      "Fundado em 2005 como PRB, renomeado Republicanos em 2019. Forte vinculação à Igreja Universal e a setores conservadores. Cresceu significativamente a partir de 2018.",
  },
  {
    acronym: "PSB",
    ideology: "Socialismo democrático",
    position: "CENTRO_ESQUERDA",
    foundedYear: 1985,
    tseNumber: 40,
    color: "#FF0000",
    history:
      "Refundado em 1985 após a redemocratização (original: 1947). Governou estados como Pernambuco (Miguel Arraes, Eduardo Campos). Vice-presidência com Geraldo Alckmin em 2022.",
  },
  {
    acronym: "PODE",
    ideology: "Centro-direita, Reformismo",
    position: "CENTRO_DIREITA",
    foundedYear: 2016,
    tseNumber: 20,
    color: "#003399",
    history:
      "Fundado em 2016 como renomeação do PTN. Posiciona-se como partido de centro-direita reformista, com ênfase em gestão pública e combate à corrupção.",
  },
  {
    acronym: "NOVO",
    ideology: "Liberalismo clássico, Minarquismo",
    position: "DIREITA",
    foundedYear: 2011,
    tseNumber: 30,
    color: "#FF6600",
    history:
      "Fundado em 2011 por empresários e profissionais liberais. Defende Estado mínimo, privatizações e redução de impostos. Eleição mais expressiva: governo de Minas Gerais (2019-2022).",
  },
  {
    acronym: "PCdoB",
    ideology: "Comunismo, Marxismo-leninismo",
    position: "ESQUERDA",
    foundedYear: 1962,
    tseNumber: 65,
    color: "#CC0000",
    history:
      "Fundado em 1962 por reorganização do PCB. O mais antigo partido comunista em atividade no Brasil. Participou de todos os governos de esquerda desde 2003.",
  },
  {
    acronym: "REDE",
    ideology: "Ambientalismo, Sustentabilidade",
    position: "CENTRO_ESQUERDA",
    foundedYear: 2013,
    tseNumber: 18,
    color: "#009933",
    history:
      "Fundado em 2013 por Marina Silva após saída do PV. Foco em sustentabilidade, ética na política e economia verde. Federado com o PSOL desde 2022.",
  },
  {
    acronym: "CIDADANIA",
    ideology: "Social-democracia, Progressismo",
    position: "CENTRO_ESQUERDA",
    foundedYear: 1992,
    tseNumber: 23,
    color: "#0099CC",
    history:
      "Sucessor do PCB histórico, renomeado PPS em 1992 e Cidadania em 2019. Federado com o PSDB desde 2022. Base em setores intelectuais e sindicalistas.",
  },
  {
    acronym: "AVANTE",
    ideology: "Centro, Trabalhismo",
    position: "CENTRO",
    foundedYear: 1989,
    tseNumber: 70,
    color: "#FF9900",
    history:
      "Fundado em 1989 como PTdoB, renomeado Avante em 2017. Partido de centro com foco em políticas trabalhistas e municipalismo.",
  },
  {
    acronym: "SOLIDARIEDADE",
    ideology: "Trabalhismo, Centro",
    position: "CENTRO",
    foundedYear: 2013,
    tseNumber: 77,
    color: "#FFCC00",
    history:
      "Fundado em 2013 pelo sindicalista Paulinho da Força, dissidência do PDT. Forte vínculo com a Força Sindical e o movimento trabalhista.",
  },
  {
    acronym: "PRD",
    ideology: "Conservadorismo, Direita",
    position: "DIREITA",
    foundedYear: 2023,
    tseNumber: 25,
    color: "#003366",
    history:
      "Fundado em 2023 pela fusão do PTB com o Patriota. Posiciona-se na direita conservadora, com base em setores religiosos e militares.",
  },
  {
    acronym: "DC",
    ideology: "Democracia cristã",
    position: "CENTRO_DIREITA",
    foundedYear: 1995,
    tseNumber: 27,
    color: "#006633",
    history:
      "Fundado em 1995 como PSDC, renomeado Democracia Cristã em 2017. Base em setores católicos e valores cristãos.",
  },
];

async function seed() {
  console.log(`📥 Enriquecendo ${PARTY_DATA.length} partidos...\n`);

  let updated = 0;
  for (const data of PARTY_DATA) {
    // Siglas variam em caixa entre fontes (PCdoB/PCDOB) — casa sem sensibilidade
    const party = await prisma.party.updateMany({
      where: { acronym: { equals: data.acronym, mode: "insensitive" } },
      data: {
        ideology: data.ideology,
        position: data.position,
        foundedYear: data.foundedYear,
        tseNumber: data.tseNumber,
        color: data.color,
        history: data.history,
      },
    });

    if (party.count > 0) {
      updated++;
      console.log(`✅ ${data.acronym.padEnd(14)} | ${data.position} | ${data.ideology}`);
    } else {
      console.log(`⚠️  ${data.acronym}: não existe no banco (só entra quando houver membros)`);
    }
  }

  console.log(`\n🎉 ${updated} partidos enriquecidos.`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
