/**
 * Verificação do motor de Resolução de Identidade com casos sintéticos:
 *   npm run verify:identity
 * Cobre: match exato, troca de partido, fuzzy (contenção de tokens),
 * homônimos desempatados por partido, homônimos ambíguos e sem match.
 */
import { nameSimilarity, resolveMatch, type TSECandidate } from "@cp/idip";

let failures = 0;
function check(name: string, cond: boolean, detail: string): void {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    failures++;
    console.error(`  ❌ ${name} — ${detail}`);
  }
}

const CANDIDATOS: TSECandidate[] = [
  {
    tse_id: "1000", ano: 2022, nome_urna: "Rui Falcão", nome_civil: "Rui Goethe da Costa Falcão",
    partido_sigla: "PT", uf: "SP", cargo: "DEPUTADO FEDERAL", ano_nascimento: 1948, situacao: "ELEITO POR QP",
  },
  // Re-eleito: mesmo político em duas eleições (desempate = mais recente)
  {
    tse_id: "1050", ano: 2018, nome_urna: "Rui Falcão", nome_civil: "Rui Goethe da Costa Falcão",
    partido_sigla: "PT", uf: "SP", cargo: "DEPUTADO FEDERAL", ano_nascimento: 1948, situacao: "ELEITO POR QP",
  },
  {
    tse_id: "2000", ano: 2022, nome_urna: "Fausto Pinato da Silva", nome_civil: "Fausto Pinato da Silva",
    partido_sigla: "UNIÃO", uf: "SP", cargo: "DEPUTADO FEDERAL", ano_nascimento: 1984, situacao: "ELEITO POR MÉDIA",
  },
  // Nome de urna curto ("FRAGA" para Alberto Fraga) — precisa de partido
  {
    tse_id: "2500", ano: 2022, nome_urna: "FRAGA", nome_civil: "Alberto Fraga",
    partido_sigla: "PL", uf: "DF", cargo: "DEPUTADO FEDERAL", ano_nascimento: 1956, situacao: "ELEITO POR MÉDIA",
  },
  // Grafia quase igual (typos do TSE): fuzzy deve pegar com MEDIUM
  {
    tse_id: "2600", ano: 2018, nome_urna: "CELSO RUSSOMANO", nome_civil: "Celso Russomanno",
    partido_sigla: "PRTB", uf: "SP", cargo: "DEPUTADO FEDERAL", ano_nascimento: 1955, situacao: "NÃO ELEITO",
  },
  // Homônimos com partidos diferentes (desempatável)
  {
    tse_id: "3000", ano: 2022, nome_urna: "João Silva", nome_civil: "João Silva",
    partido_sigla: "PP", uf: "MG", cargo: "DEPUTADO FEDERAL", ano_nascimento: 1970, situacao: "ELEITO",
  },
  {
    tse_id: "3001", ano: 2022, nome_urna: "João Silva", nome_civil: "João Silva",
    partido_sigla: "PT", uf: "MG", cargo: "DEPUTADO FEDERAL", ano_nascimento: 1975, situacao: "ELEITO",
  },
  // Homônimos no MESMO partido (ambíguo de verdade)
  {
    tse_id: "4000", ano: 2022, nome_urna: "José Souza", nome_civil: "José Souza",
    partido_sigla: "PL", uf: "RJ", cargo: "SENADOR", ano_nascimento: 1960, situacao: "ELEITO",
  },
  {
    tse_id: "4001", ano: 2022, nome_urna: "José Souza", nome_civil: "José Souza Lima",
    partido_sigla: "PL", uf: "RJ", cargo: "SENADOR", ano_nascimento: 1965, situacao: "ELEITO",
  },
];

console.log("Normalização");
check(
  "acentos/pontuação/sufixos",
  nameSimilarity("Rui Falcão Jr.", "RUI FALCAO") === 1,
  `obtido ${nameSimilarity("Rui Falcão Jr.", "RUI FALCAO")}`,
);
check(
  "sobrenome solto não vira match",
  nameSimilarity("Silva", "João Pedro Silva") < 0.85,
  `obtido ${nameSimilarity("Silva", "João Pedro Silva")}`,
);

console.log("\nRe-eleição — desempate pelo registro mais recente");
{
  const r = resolveMatch(
    { politicalName: "Rui Falcão", uf: "SP", partyAcronym: "PT", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("pega TSE/2022, não 2018", r.candidate?.tse_id === "1000" && r.candidate?.ano === 2022, r.reason);
  check("motivo registra a reeleição", r.reason.includes("reeleito"), r.reason);
}

console.log("\nNome de urna curto — contenção + partido");
{
  const r = resolveMatch(
    { politicalName: "Alberto Fraga", uf: "DF", partyAcronym: "PL", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("FRAGA ⊂ Alberto Fraga + PL → HIGH", r.confidence === "HIGH" && r.candidate?.tse_id === "2500", r.reason);
}
{
  // Mesmo nome contido, mas partido divergente: não pode ser HIGH
  const r = resolveMatch(
    { politicalName: "Alberto Fraga", uf: "DF", partyAcronym: "PSD", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("contenção sem partido → MEDIUM (revisar)", r.confidence === "MEDIUM", r.reason);
}

console.log("\nEstágio 1 — exato");
{
  const r = resolveMatch(
    { politicalName: "Rui Falcão", uf: "SP", partyAcronym: "PT", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("HIGH", r.confidence === "HIGH" && r.candidate?.tse_id === "1000", JSON.stringify(r.reason));
  check("ano de nascimento extraído", r.candidate?.ano_nascimento === 1948, `obtido ${r.candidate?.ano_nascimento}`);
}
{
  // Troca de partido depois da eleição: continua HIGH, pelo registro mais recente
  const r = resolveMatch(
    { politicalName: "Rui Falcão", uf: "SP", partyAcronym: "PSB", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("partido divergente não quebra o match", r.confidence === "HIGH" && r.candidate?.tse_id === "1000", r.reason);
}

console.log("\nEstágio 2 — contenção e fuzzy");
{
  const r = resolveMatch(
    { politicalName: "Fausto Pinato", uf: "SP", partyAcronym: "UNIÃO", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("contenção de tokens + partido → HIGH", r.confidence === "HIGH" && r.candidate?.tse_id === "2000", r.reason);
}
{
  const r = resolveMatch(
    { politicalName: "Celso Russomanno", uf: "SP", partyAcronym: "REPUBLICANOS", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("grafia aproximada (Levenshtein) → MEDIUM", r.confidence === "MEDIUM" && r.candidate?.tse_id === "2600", r.reason);
}

console.log("\nHomônimos");
{
  const r = resolveMatch(
    { politicalName: "João Silva", uf: "MG", partyAcronym: "PT", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("desempatado por partido → tse 3001", r.confidence === "HIGH" && r.candidate?.tse_id === "3001", r.reason);
}
{
  const r = resolveMatch(
    { politicalName: "José Souza", uf: "RJ", partyAcronym: "PL", cargo: "SENADOR" },
    CANDIDATOS,
  );
  check("homônimos no mesmo partido → NONE ambíguo", r.confidence === "NONE" && r.reason.includes("Ambíguo"), r.reason);
}

console.log("\nSem match");
{
  const r = resolveMatch(
    { politicalName: "Rui Falcão", uf: "SP", partyAcronym: "PT", cargo: "SENADOR" },
    CANDIDATOS,
  );
  check("cargo diferente → NONE", r.confidence === "NONE", r.reason);
}
{
  const r = resolveMatch(
    { politicalName: "Cidadão Inexistente", uf: "AC", partyAcronym: "PT", cargo: "DEPUTADO FEDERAL" },
    CANDIDATOS,
  );
  check("nome/UF sem candidato → NONE", r.confidence === "NONE", r.reason);
}

if (failures > 0) {
  console.error(`\n❌ ${failures} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("\n✅ Motor de identidade: todas as verificações passaram.");
