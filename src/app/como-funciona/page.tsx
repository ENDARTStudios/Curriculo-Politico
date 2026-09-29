import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Como Funciona a Política Brasileira — Currículo Político",
  description:
    "Entenda os três poderes, as esferas de governo, os sistemas eleitorais e a hierarquia de cargos para avaliar seus representantes com conhecimento de causa.",
};

const PODERES = [
  {
    emoji: "⚖️",
    nome: "Executivo",
    borda: "border-t-sky-500",
    funcao: "Administra o Estado e executa políticas públicas",
    agentes: [
      "Presidente da República",
      "Governadores (27)",
      "Prefeitos (5.570)",
      "Vice-presidentes, vices, ministros e secretários",
    ],
    eleicao: "Eleição direta a cada 4 anos (majoritário)",
  },
  {
    emoji: "🏛️",
    nome: "Legislativo",
    borda: "border-t-purple-500",
    funcao: "Cria leis, fiscaliza o Executivo e representa o povo",
    agentes: [
      "Senadores (81)",
      "Deputados Federais (513)",
      "Deputados Estaduais/Distritais (1.060)",
      "Vereadores (57.931)",
    ],
    eleicao: "Eleição direta: 8 anos (senadores) ou 4 anos (demais)",
  },
  {
    emoji: "⚔️",
    nome: "Judiciário",
    borda: "border-t-emerald-500",
    funcao: "Interpreta e aplica as leis, resolve conflitos",
    agentes: [
      "STF (11 ministros)",
      "STJ (33 ministros)",
      "TRFs e TJs",
      "Juízes de primeira instância",
    ],
    eleicao: "Concurso público (juízes) ou indicação política (STF/STJ)",
  },
];

const ESFERAS = [
  {
    esfera: "Federal (União)",
    barra: "bg-sky-500",
    escopo: "Todo o território nacional",
    agentes: "Presidente, 81 Senadores, 513 Deputados Federais",
    exemplos: [
      "Política monetária e Banco Central",
      "Defesa nacional e Forças Armadas",
      "Relações internacionais",
      "Legislação civil, penal e trabalhista",
    ],
  },
  {
    esfera: "Estadual",
    barra: "bg-purple-500",
    escopo: "Cada um dos 26 estados + Distrito Federal",
    agentes: "Governadores, Deputados Estaduais/Distritais",
    exemplos: [
      "Segurança pública (Polícia Civil e Militar)",
      "Gestão do ICMS (principal imposto estadual)",
      "Educação e saúde estaduais",
      "Rodovias estaduais",
    ],
  },
  {
    esfera: "Municipal",
    barra: "bg-emerald-500",
    escopo: "Cada um dos 5.570 municípios",
    agentes: "Prefeitos e Vereadores",
    exemplos: [
      "Transporte público urbano",
      "Coleta de lixo e saneamento básico",
      "Educação infantil e fundamental",
      "Zoneamento urbano e IPTU",
    ],
  },
];

const PIRAMIDE = [
  { cargo: "Presidente da República", n: "1 mandato de 4 anos", largura: "30%" },
  { cargo: "Governadores (27)", n: "1 mandato de 4 anos", largura: "45%" },
  { cargo: "Prefeitos (5.570)", n: "1 mandato de 4 anos", largura: "60%" },
  { cargo: "Senadores (81)", n: "1 mandato de 8 anos", largura: "40%" },
  { cargo: "Deputados Federais (513)", n: "1 mandato de 4 anos", largura: "55%" },
  { cargo: "Deputados Estaduais (1.060)", n: "1 mandato de 4 anos", largura: "70%" },
  { cargo: "Vereadores (57.931)", n: "1 mandato de 4 anos", largura: "85%" },
];

export default function ComoFuncionaPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Como Funciona a Política Brasileira
      </h1>
      <p className="mt-3 max-w-3xl text-xl leading-relaxed text-slate-400">
        Entenda a estrutura do Estado brasileiro, os três poderes e as esferas
        de governo para avaliar seus representantes com conhecimento de causa.
      </p>

      {/* Três Poderes */}
      <section className="mt-12">
        <h2 className="mb-3 text-3xl font-bold text-slate-100">Os Três Poderes</h2>
        <p className="mb-6 leading-relaxed text-slate-400">
          O Brasil adota o sistema de{" "}
          <strong className="text-slate-200">separação de poderes</strong>{" "}
          (Art. 2º da Constituição Federal de 1988), onde Executivo, Legislativo
          e Judiciário são independentes e harmônicos entre si.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {PODERES.map((poder) => (
            <div
              key={poder.nome}
              className={`rounded-xl border border-slate-800 border-t-4 bg-slate-900/60 p-6 ${poder.borda}`}
            >
              <div className="mb-3 text-4xl">{poder.emoji}</div>
              <h3 className="mb-2 text-xl font-bold text-slate-100">
                Poder {poder.nome}
              </h3>
              <p className="mb-4 text-sm italic text-slate-400">{poder.funcao}</p>
              <h4 className="mb-2 text-sm font-semibold text-slate-300">
                Principais agentes:
              </h4>
              <ul className="mb-4 space-y-1 text-sm text-slate-400">
                {poder.agentes.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
              <div className="border-t border-slate-800 pt-3 text-xs text-slate-500">
                <strong className="text-slate-400">Forma de acesso:</strong>{" "}
                {poder.eleicao}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Esferas */}
      <section className="mt-12">
        <h2 className="mb-3 text-3xl font-bold text-slate-100">
          Esferas de Governo (Federalismo)
        </h2>
        <p className="mb-6 leading-relaxed text-slate-400">
          O Brasil é uma <strong className="text-slate-200">Federação</strong>{" "}
          composta por três esferas autônomas, cada uma com competências
          próprias definidas na Constituição.
        </p>
        <div className="space-y-4">
          {ESFERAS.map((e) => (
            <div key={e.esfera} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className={`h-12 w-1 rounded ${e.barra}`} />
                <div>
                  <h3 className="text-xl font-bold text-slate-100">{e.esfera}</h3>
                  <p className="text-sm text-slate-500">{e.escopo}</p>
                </div>
              </div>
              <div className="ml-4">
                <div className="mb-2 text-sm text-slate-400">
                  <strong className="text-slate-300">Representantes:</strong>{" "}
                  {e.agentes}
                </div>
                <div className="grid gap-1 md:grid-cols-2">
                  {e.exemplos.map((ex) => (
                    <div key={ex} className="text-sm text-slate-400">• {ex}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pirâmide */}
      <section className="mt-12">
        <h2 className="mb-3 text-3xl font-bold text-slate-100">
          Hierarquia Eleitoral
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8">
          <div className="flex flex-col items-center space-y-3">
            {PIRAMIDE.map((item) => (
              <div
                key={item.cargo}
                className="rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 p-3 text-center text-white shadow-md"
                style={{ width: item.largura }}
              >
                <div className="text-sm font-bold">{item.cargo}</div>
                <div className="text-xs opacity-80">{item.n}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs italic text-slate-500">
            Pirâmide por abrangência territorial. Não há hierarquia funcional —
            todos são autônomos em suas competências constitucionais.
          </p>
        </div>
      </section>

      {/* Sistemas eleitorais */}
      <section className="mt-12">
        <h2 className="mb-3 text-3xl font-bold text-slate-100">Sistemas Eleitorais</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="mb-3 text-lg font-bold text-slate-100">Sistema Majoritário</h3>
            <p className="mb-3 text-sm leading-relaxed text-slate-400">
              Vence quem obtém mais votos (maioria absoluta ou relativa).
            </p>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>• Presidente e Vice</li>
              <li>• Governadores</li>
              <li>• Prefeitos (com 2º turno em cidades &gt; 200 mil eleitores)</li>
              <li>• Senadores (maioria simples)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="mb-3 text-lg font-bold text-slate-100">Sistema Proporcional</h3>
            <p className="mb-3 text-sm leading-relaxed text-slate-400">
              Vagas distribuídas por quociente eleitoral entre partidos/coligações.
            </p>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>• Deputados Federais</li>
              <li>• Deputados Estaduais</li>
              <li>• Vereadores</li>
              <li>• Voto na legenda ou no candidato</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Dica */}
      <div className="mt-12 rounded-xl border border-sky-500/30 bg-sky-500/5 p-6">
        <h3 className="mb-2 font-semibold text-slate-100">💡 Dica para o eleitor</h3>
        <p className="text-sm leading-relaxed text-slate-400">
          Ao avaliar um político no{" "}
          <strong className="text-slate-200">Currículo Político</strong>,
          verifique sempre se o cargo que ele ocupa tem competência sobre a
          promessa feita em campanha. Um vereador não pode resolver problemas de
          política monetária, assim como um deputado federal não decide sobre
          coleta de lixo da sua rua.
        </p>
      </div>
    </main>
  );
}
