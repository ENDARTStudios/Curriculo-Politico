import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — Currículo Político",
  description:
    "Termos de Uso do Currículo Político: aceitação, definições, natureza dos dados, conduta do usuário, responsabilidade, LGPD e foro.",
};

const SECOES = [
  {
    titulo: "1. Aceitação dos Termos",
    paragrafos: [
      "1.1. Ao acessar, navegar ou utilizar o Currículo Político (\"Plataforma\"), o usuário declara ter lido, compreendido e aceito integralmente os presentes Termos de Uso, constituindo-se em contrato de adesão nos termos do Art. 423 do Código Civil brasileiro.",
      "1.2. A aceitação é caracterizada pelo ato de acessar e navegar no site (browsewrap), complementado pelo consentimento explícito no caso de criação de conta ou envio de comunicações.",
      "1.3. O usuário declara ser maior de 18 (dezoito) anos e plenamente capaz de exercer direitos e obrigações nos termos da legislação vigente. Menores de 18 anos não devem utilizar a Plataforma.",
      "1.4. Caso não concorde com qualquer disposição destes Termos, o usuário deve imediatamente cessar o uso da Plataforma.",
    ],
  },
  {
    titulo: "2. Objeto e Definições",
    subgrupos: [
      {
        sub: "2.1. Definições",
        itens: [
          "Agente Político: pessoa física que ocupa ou ocupou cargo eletivo ou função pública delegada, incluindo, sem limitação, Presidentes, Governadores, Prefeitos, Senadores, Deputados Federais, Deputados Estaduais e Vereadores.",
          "IDIP: Índice de Desempenho e Integridade Pública — indicador técnico de 0 a 100 calculado algoritmicamente com base exclusivamente em dados públicos oficiais auditáveis.",
          "Termômetro de Confiabilidade (TIC): indicador visual que mede risco e transparência, exibido ao lado da nota IDIP.",
          "Fonte Oficial: órgão ou entidade da administração pública que disponibiliza dados abertos (Câmara dos Deputados, Senado Federal, TSE, TCU, Portais da Transparência, Diários Oficiais).",
          "Votação Popular: mecanismo de engajamento pessoal no qual usuários registram posição sobre projetos de lei, que NUNCA altera a nota IDIP.",
        ],
      },
      {
        sub: "2.2. Objeto",
        itens: [
          "A Plataforma agrega, organiza e torna legíveis dados públicos de Agentes Políticos brasileiros, aplicando metodologia algorítmica aberta e auditável (IDIP) para avaliar desempenho funcional, integridade e transparência.",
        ],
      },
      {
        sub: "2.3. Natureza da Plataforma",
        itens: [
          "O Currículo Político é uma ferramenta de verificação de fatos e desempenho. Não é um tribunal, partido político, veículo de opinião ou órgão oficial do Estado. Sua função é agregar, organizar e tornar legíveis dados que já são públicos por lei.",
        ],
      },
    ],
  },
  {
    titulo: "3. Dados de Agentes Políticos — Fundamentação Legal",
    subgrupos: [
      {
        sub: "3.1. Interesse Público e Publicidade Administrativa",
        itens: [
          "A exposição de dados funcionais de Agentes Políticos é fundamentada no princípio da publicidade dos atos administrativos (Art. 37, CF/88) e no direito do eleitor à informação (Art. 5º, XIV e XXXIII, CF/88).",
        ],
      },
      {
        sub: "3.2. Lei de Acesso à Informação (LAI — Lei 12.527/2011)",
        itens: [
          "A publicidade é preceito geral e o sigilo é exceção (Art. 3º, I).",
          "O acesso à informação pública é direito fundamental (Art. 7º).",
          "É dever dos órgãos públicos promover a divulgação de informações de interesse coletivo independentemente de solicitação (Art. 8º).",
        ],
      },
      {
        sub: "3.3. Esfera de Privacidade Reduzida",
        itens: [
          "Conforme jurisprudência consolidada do Supremo Tribunal Federal (ADPF 130/DF e precedentes sobre liberdade de expressão), Agentes Políticos possuem esfera de privacidade reduzida em razão do cargo que ocupam e do interesse público envolvido.",
        ],
      },
      {
        sub: "3.4. Presunção de Inocência",
        itens: [
          "A Plataforma diferencia rigorosamente os status jurídicos: Investigado/Inquérito (não implica culpa); Réu (processo em andamento, presunção de inocência); Condenado (decisão judicial com indicação de instância); Absolvido/Arquivado (dado ocultado automaticamente).",
          "Termos como \"criminoso\" ou \"corrupto\" nunca são utilizados sem condenação transitada em julgado.",
        ],
      },
      {
        sub: "3.5. Direito de Retificação",
        itens: [
          "Caso um Agente Político identifique dados desatualizados ou incorretos, possui canal prioritário de correção (/retificacao) com SLA de 72 horas úteis, mediante comprovação documental na fonte oficial.",
        ],
      },
    ],
  },
  {
    titulo: "4. Conduta do Usuário",
    paragrafos: [
      "4.1. Proibições. O usuário se compromete a NÃO:",
      "• Utilizar bots, scrapers ou sistemas automatizados para coletar dados da Plataforma sem autorização expressa;",
      "• Criar múltiplas contas (sybil attacks) para manipular votações populares;",
      "• Utilizar a votação popular para fins comerciais, eleitorais ou de desinformação;",
      "• Tentar burlar o rate limiting (60 requisições/minuto) ou os mecanismos de segurança;",
      "• Utilizar a Plataforma para prática de atos ilícitos ou contrários à moral e aos bons costumes;",
      "• Importunar, ofender ou praticar assédio contra outros usuários ou Agentes Políticos.",
    ],
    subgrupos: [
      {
        sub: "4.2. Votação Popular",
        itens: [
          "A votação em projetos de lei é uma camada de engajamento pessoal que NUNCA altera a nota IDIP dos parlamentares.",
          "Cada usuário pode votar uma vez por projeto, podendo alterar seu voto.",
          "Contas com menos de 24 horas não podem votar (proteção anti-bot).",
        ],
      },
      {
        sub: "4.3. Consequências",
        itens: [
          "O descumprimento destas regras pode resultar em suspensão ou banimento da conta, sem prejuízo de responsabilização civil ou penal.",
        ],
      },
    ],
  },
  {
    titulo: "5. Propriedade Intelectual",
    paragrafos: [
      "5.1. O código-fonte da Plataforma é licenciado sob AGPL-3.0 (GNU Affero General Public License v3.0), permitindo uso, modificação e redistribuição, inclusive comercial, desde que as modificações também sejam licenciadas sob AGPL-3.0.",
      "5.2. A documentação é licenciada sob Creative Commons Attribution 4.0 International (CC BY 4.0).",
      "5.3. Os dados exibidos são de domínio público, extraídos de fontes governamentais abertas. A Plataforma não reivindica propriedade sobre os dados originais.",
      "5.4. A marca \"Currículo Político\", o logotipo e o design da interface são propriedade de seus criadores e não podem ser utilizados sem autorização expressa.",
    ],
  },
  {
    titulo: "6. Limitação de Responsabilidade",
    paragrafos: [
      "6.1. Os dados exibidos são extraídos de fontes oficiais e têm caráter meramente informativo. A Plataforma não se responsabiliza por decisões tomadas com base nas informações exibidas, especialmente se a fonte oficial tiver atualizado o dado posteriormente à coleta.",
      "6.2. A nota IDIP é um indicador técnico algorítmico e não constitui julgamento moral, avaliação de caráter ou recomendação de voto.",
      "6.3. A Plataforma replica dados de fontes oficiais. Se a fonte oficial publicar dado incorreto, o erro é replicado. A responsabilidade primária pela veracidade é do órgão público fonte.",
      "6.4. Em nenhuma hipótese a responsabilidade da Plataforma excederá R$ 1.000,00 (mil reais) por usuário, em danos diretos, excluídos quaisquer danos indiretos, lucros cessantes ou perda de dados.",
      "6.5. A Plataforma é fornecida \"no estado em que se encontra\" (AS IS), sem garantias de continuidade, disponibilidade ou ausência de erros.",
    ],
  },
  {
    titulo: "7. Privacidade e Proteção de Dados",
    paragrafos: [
      "7.1. O tratamento de dados pessoais de usuários e Agentes Políticos é realizado em conformidade com a LGPD (Lei 13.709/2018), conforme Política de Privacidade disponível em /privacidade.",
      "7.2. Dados de usuários: email, nome opcional, votos em projetos e preferências de afinidade. Senhas hasheadas com bcrypt. Nenhum dado bancário, endereço ou telefone.",
      "7.3. Dados de Agentes Políticos: exclusivamente dados funcionais e públicos relevantes para o exercício do mandato.",
      "7.4. Encarregado de Dados (DPO): dpo@curriculopolitico.org.",
    ],
  },
  {
    titulo: "8. Disposições Gerais",
    paragrafos: [
      "8.1. Foro de Eleição: Fica eleito o foro da Comarca de São Paulo, Estado de São Paulo, para dirimir quaisquer controvérsias decorrentes dos presentes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.",
      "8.2. Independência das Cláusulas: A nulidade de qualquer cláusula não afeta a validade das demais.",
      "8.3. Alterações: Estes Termos podem ser atualizados periodicamente. Mudanças significativas serão comunicadas via aviso no site com 30 dias de antecedência.",
      "8.4. Tolerância: A tolerância quanto ao descumprimento de qualquer cláusula não constitui renúncia ou novação.",
    ],
  },
  {
    titulo: "9. Disposições Finais",
    paragrafos: [
      "9.1. Estes Termos entram em vigor na data de sua publicação e permanecem vigentes até sua substituição por versão atualizada.",
      "9.2. Para questões sobre estes Termos, entre em contato via /contato ou pelo canal de retificação.",
    ],
  },
];

export default function TermosDeUsoPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Termos de Uso
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última atualização: setembro de 2026
      </p>

      <div className="mt-8 space-y-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        {SECOES.map((secao) => (
          <section key={secao.titulo}>
            <h2 className="mb-4 text-2xl font-bold text-slate-100">
              {secao.titulo}
            </h2>
            {secao.paragrafos?.map((p) => (
              <p
                key={p.slice(0, 30)}
                className={`mb-3 text-sm leading-relaxed ${p.startsWith("•") ? "ml-4" : "text-slate-400"}`}
              >
                {p}
              </p>
            ))}
            {secao.subgrupos?.map((grupo) => (
              <div key={grupo.sub} className="mb-4 last:mb-0">
                <h3 className="mb-2 font-semibold text-slate-200">{grupo.sub}</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
                  {grupo.itens.map((item) => (
                    <li key={item.slice(0, 30)}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
