import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — Radar Cívico",
  description:
    "Natureza dos dados, isenção de responsabilidade, LGPD e limitações técnicas do Radar Cívico.",
};

const CLAUSULAS: Array<{ titulo: string; paragrafos: string[] }> = [
  {
    titulo: "3. Natureza dos Dados e Isenção de Responsabilidade",
    paragrafos: [
      "3.1. Interesse Público e Fontes Oficiais — O Usuário reconhece que o Radar Cívico é um agregador de informações de interesse público, coletadas exclusivamente de bases de dados governamentais abertas, incluindo, mas não se limitando a: Tribunal Superior Eleitoral (TSE); Câmara dos Deputados e Senado Federal; Portais da Transparência (Federal, Estadual e Municipal); Tribunais de Contas (TCU/TCEs); Diários Oficiais e Tribunais de Justiça.",
      "3.2. Veracidade e Notoriedade — As informações exibidas são consideradas verdadeiras e notórias no momento de sua coleta nas fontes oficiais. O Radar Cívico não realiza juízo de valor sobre a vida privada dos políticos, limitando-se a registrar fatos funcionais, legislativos e jurídicos públicos.",
      "3.3. Metodologia de Pontuação (IDIP) — A pontuação exibida é um indicador técnico de desempenho e conformidade, calculada algoritmicamente com base em critérios públicos (assiduidade, produção legislativa, integridade jurídica e transparência). A nota não constitui julgamento moral ou condenação; não reflete opinião dos mantenedores do site; e a metodologia completa está disponível publicamente para auditoria.",
      "3.4. Ausência de Dolo ou Difamação — O Radar Cívico não tem como objetivo ridicularizar, expor ao vexame ou difamar qualquer figura pública. A exposição de dados negativos (como processos ou contas rejeitadas) decorre estritamente do princípio da publicidade dos atos administrativos e do direito do eleitor à informação.",
      "3.5. Direito de Retificação — Caso um político identifique dados desatualizados ou incorretos (ex: um processo arquivado que ainda consta como ativo), ele possui canal prioritário para solicitação de correção. O Radar Cívico se compromete a atualizar o dado na fonte assim que a retificação for comprovada documentalmente.",
    ],
  },
  {
    titulo: "4. Conformidade com a LGPD",
    paragrafos: [
      "4.1. Dados Públicos e Interesse Público — O tratamento de dados pessoais realizado pelo Radar Cívico fundamenta-se no Art. 7º, inciso III, e no Art. 11, §4º da LGPD, que autorizam o tratamento de dados pessoais tornados manifestamente públicos pelo titular ou por força de lei, visando o interesse público e o controle social.",
      "4.2. Minimização de Dados — O site não coleta nem exibe: CPF completo; endereços residenciais; telefones pessoais; dados de familiares sem cargo público; dados de saúde ou orientação sexual. Apenas dados funcionais e públicos relevantes para o exercício do mandato são processados.",
    ],
  },
  {
    titulo: "5. Limitações Técnicas e Fontes",
    paragrafos: [
      "5.1. Atraso de Atualização — Os dados governamentais podem sofrer atrasos de publicação ou inconsistências nas APIs oficiais. O Radar Cívico exibe a data da última coleta em cada perfil. A plataforma não se responsabiliza por decisões tomadas com base em dados que já foram alterados na fonte oficial mas ainda não foram sincronizados.",
      "5.2. Status Jurídico — O site diferencia rigorosamente os status jurídicos para evitar interpretações errôneas: Investigado/Inquérito (não implica culpa); Réu (processo em andamento, presunção de inocência); Condenado (decisão judicial, com indicação de instância); Absolvido/Arquivado (o dado é ocultado ou marcado como limpo). O Radar Cívico respeita o princípio da presunção de inocência e não utiliza termos como \"criminoso\" ou \"corrupto\" sem que haja condenação transitada em julgado.",
    ],
  },
];

export default function TermosDeUsoPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Termos de Uso
      </h1>
      <p className="mt-2 text-slate-400">
        Natureza dos dados, isenção de responsabilidade e conformidade legal do
        Radar Cívico. Minuta sujeita a revisão jurídica antes do lançamento
        público.
      </p>

      <div className="mt-8 space-y-8">
        {CLAUSULAS.map((secao) => (
          <section
            key={secao.titulo}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <h2 className="mb-4 text-xl font-bold text-slate-100">
              {secao.titulo}
            </h2>
            <div className="space-y-4">
              {secao.paragrafos.map((p) => (
                <p key={p.slice(0, 40)} className="text-sm leading-relaxed text-slate-400">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Dúvidas ou solicitações:{" "}
        <a href="/retificacao" className="text-sky-400 hover:underline">
          canal de retificação
        </a>
        .
      </p>
    </main>
  );
}
