import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre — Currículo Político",
  description:
    "Missão, compromisso ético, fontes de dados e conformidade com a LGPD do Currículo Político.",
};

const FONTES = [
  { name: "Tribunal Superior Eleitoral (TSE)", desc: "Candidaturas, votações, prestação de contas" },
  { name: "Câmara dos Deputados", desc: "Projetos, votos, despesas, presença" },
  { name: "Senado Federal", desc: "Matérias, votações, despesas" },
  { name: "Portais da Transparência", desc: "Remuneração, gastos públicos" },
  { name: "Tribunais de Contas (TCU/TCEs)", desc: "Contas, sanções, pareceres" },
  { name: "Diários Oficiais", desc: "Nomeações, exonerações, atos" },
];

const NAO_MEDIMOS = [
  "Ideologia ou partido",
  "Opiniões pessoais",
  "Vida privada",
  "Conteúdo dos projetos",
  "Intenção de voto",
];

const NAO_PROCESSAMOS = [
  "CPF completo",
  "Endereço residencial",
  "Telefone pessoal",
  "Dados de familiares sem cargo público",
  "Dados de saúde ou orientação sexual",
];

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-100">
          Sobre o Currículo Político
        </h1>
        <p className="text-xl leading-relaxed text-slate-400">
          Transparência radical para fortalecer a democracia. Dados públicos,
          algoritmos abertos, zero opinião.
        </p>
      </div>

      {/* Propósito */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-slate-100">
          Propósito e Compromisso Ético
        </h2>
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="mb-3 text-lg font-semibold text-slate-100">O que somos</h3>
          <p className="mb-4 leading-relaxed text-slate-400">
            O <strong className="text-slate-200">Currículo Político</strong> é uma
            plataforma de verificação de fatos e desempenho. Não somos um
            tribunal, um partido político ou um veículo de opinião. Nossa função
            é agregar, organizar e tornar legíveis os dados que já são públicos
            por lei, permitindo que qualquer cidadão avalie o histórico de seus
            representantes em poucos segundos.
          </p>
          <p className="leading-relaxed text-slate-400">
            Acreditamos que eleitores informados tomam decisões melhores. Por
            isso, centralizamos informações dispersas em dezenas de portais
            governamentais em uma única interface auditável.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="mb-3 text-lg font-semibold text-slate-100">
            O que NÃO somos
          </h3>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-start">
              <span className="mr-2 text-red-400">✗</span>
              <span>
                <strong className="text-slate-200">Não ridicularizamos:</strong>{" "}
                O projeto não tem caráter humorístico, satírico ou difamatório.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-red-400">✗</span>
              <span>
                <strong className="text-slate-200">Não inventamos dados:</strong>{" "}
                Nenhuma informação é criada pela equipe do site. Tudo é extraído
                de fontes oficiais.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-red-400">✗</span>
              <span>
                <strong className="text-slate-200">Não temos viés ideológico:</strong>{" "}
                A nota mede atividade, integridade e transparência, não o
                conteúdo ideológico dos votos.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="mb-3 text-lg font-semibold text-slate-100">
            A Nota é Auditável
          </h3>
          <p className="mb-4 leading-relaxed text-slate-400">
            A pontuação de 0 a 100 não é uma opinião. É o resultado matemático
            de critérios públicos. Se um político discorda de sua nota, ele pode
            acessar o perfil e verificar exatamente qual dado gerou aquele
            resultado.
          </p>
          <p className="leading-relaxed text-slate-400">
            Se o dado estiver incorreto, ele pode solicitar a correção através
            dos canais oficiais. Transparência é a nossa única agenda.
          </p>
        </div>
      </section>

      {/* Metodologia */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-slate-100">
          Metodologia de Pontuação (IDIP)
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="mb-4 leading-relaxed text-slate-400">
            O <strong className="text-slate-200">Índice de Desempenho e
            Integridade Pública (IDIP)</strong> é calculado com base em dados
            públicos verificáveis. A fórmula completa está disponível em{" "}
            <Link href="/metodologia" className="text-sky-400 hover:underline">
              /metodologia
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-slate-800/60 p-4">
              <h4 className="mb-2 font-semibold text-slate-200">O que medimos</h4>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>• Assiduidade em sessões e votações</li>
                <li>• Produção legislativa</li>
                <li>• Integridade jurídica</li>
                <li>• Transparência de gastos</li>
                <li>• Prestação de contas</li>
              </ul>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-4">
              <h4 className="mb-2 font-semibold text-slate-200">
                O que NÃO medimos
              </h4>
              <ul className="space-y-1 text-sm text-slate-400">
                {NAO_MEDIMOS.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Fontes */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-slate-100">Fontes de Dados</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="mb-4 leading-relaxed text-slate-400">
            Todas as informações são extraídas exclusivamente de bases de dados
            governamentais abertas. Cada dado exibido possui link para a fonte
            original e data de coleta.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {FONTES.map((fonte) => (
              <div key={fonte.name} className="border-l-4 border-sky-500/60 py-1 pl-3">
                <div className="text-sm font-medium text-slate-200">{fonte.name}</div>
                <div className="text-xs text-slate-500">{fonte.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Natureza jurídica */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-slate-100">
          Natureza Jurídica dos Dados
        </h2>
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div>
            <h4 className="mb-2 font-semibold text-slate-200">Interesse Público</h4>
            <p className="leading-relaxed text-slate-400">
              O Currículo Político é um agregador de informações de interesse público.
              A exposição de dados funcionais de agentes públicos é fundamentada
              no princípio da publicidade dos atos administrativos e no direito
              do eleitor à informação.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-slate-200">
              Presunção de Inocência
            </h4>
            <p className="leading-relaxed text-slate-400">
              O site diferencia rigorosamente os status jurídicos para evitar
              interpretações errôneas. Termos como &quot;criminoso&quot; ou
              &quot;corrupto&quot; nunca são utilizados sem condenação
              transitada em julgado.
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-4">
            <h4 className="mb-2 font-semibold text-slate-200">
              Status Jurídicos Exibidos
            </h4>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>• <strong>Investigado/Inquérito:</strong> Não implica culpa</li>
              <li>• <strong>Réu:</strong> Processo em andamento, presunção de inocência</li>
              <li>• <strong>Condenado:</strong> Decisão judicial (com indicação de instância)</li>
              <li>• <strong>Absolvido/Arquivado:</strong> Dado ocultado ou marcado como limpo</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            Termos completos em{" "}
            <Link href="/termos-de-uso" className="text-sky-400 hover:underline">
              /termos-de-uso
            </Link>
            .
          </p>
        </div>
      </section>

      {/* LGPD */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-slate-100">
          Conformidade com a LGPD
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="mb-4 leading-relaxed text-slate-400">
            O tratamento de dados pessoais fundamenta-se na Lei Geral de
            Proteção de Dados (LGPD), Art. 7º, inciso III, e Art. 11, §4º, que
            autorizam o tratamento de dados tornados manifestamente públicos
            pelo titular ou por força de lei, visando o interesse público e o
            controle social.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-semibold text-emerald-400">
                ✓ Dados que processamos
              </h4>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>• Nome civil e de urna</li>
                <li>• Cargo e mandato</li>
                <li>• Partido e histórico eleitoral</li>
                <li>• Votações e projetos</li>
                <li>• Despesas públicas</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-red-400">
                ✗ Dados que NÃO processamos
              </h4>
              <ul className="space-y-1 text-sm text-slate-400">
                {NAO_PROCESSAMOS.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Política completa em{" "}
            <Link href="/privacidade" className="text-sky-400 hover:underline">
              /privacidade
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Retificação */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-slate-100">
          Direito de Retificação
        </h2>
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-6">
          <p className="mb-4 leading-relaxed text-slate-400">
            Caso um político identifique dados desatualizados ou incorretos em
            seu perfil, ele possui canal prioritário para solicitação de
            correção.
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start">
              <span className="mr-2 text-sky-400">1.</span>
              <span>
                Acesse a página{" "}
                <Link href="/retificacao" className="text-sky-400 hover:underline">
                  &quot;Retificação&quot;
                </Link>{" "}
                no rodapé do site
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-sky-400">2.</span>
              <span>
                Identifique o dado incorreto e forneça o link da fonte oficial
                corrigida
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-sky-400">3.</span>
              <span>
                Nossa equipe verificará a fonte e atualizará os dados em até 72
                horas úteis
              </span>
            </li>
          </ul>
          <p className="mt-4 text-xs italic text-slate-500">
            O Currículo Político se compromete a atualizar o dado assim que a
            retificação for comprovada documentalmente na fonte oficial.
          </p>
        </div>
      </section>

      {/* Base Legal */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-slate-100">
          Base Legal e Direitos
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="mb-6 leading-relaxed text-slate-400">
            O <strong className="text-slate-200">Currículo Político</strong>{" "}
            opera com pleno amparo da legislação brasileira e de tratados
            internacionais de direitos humanos e liberdade de expressão.
          </p>
          <div className="space-y-4">
            {[
              {
                titulo: "Constituição Federal de 1988",
                artigos: [
                  { ref: "Art. 5º, IV", texto: "É livre a manifestação do pensamento, sendo vedado o anonimato." },
                  { ref: "Art. 5º, IX", texto: "É livre a expressão da atividade intelectual, artística, científica e de comunicação, independentemente de censura ou licença." },
                  { ref: "Art. 5º, XIV", texto: "É assegurado a todos o acesso à informação e resguardado o sigilo da fonte, quando necessário ao exercício profissional." },
                  { ref: "Art. 5º, XXXIII", texto: "Todos têm direito a receber dos órgãos públicos informações de seu interesse particular, ou de interesse coletivo ou geral." },
                  { ref: "Art. 37", texto: "A administração pública obedecerá aos princípios da legalidade, impessoalidade, moralidade, publicidade e eficiência." },
                ],
              },
              {
                titulo: "Lei de Acesso à Informação (Lei 12.527/2011)",
                artigos: [
                  { ref: "Art. 3º, I", texto: "A publicidade é preceito geral; o sigilo é exceção." },
                  { ref: "Art. 7º", texto: "O acesso à informação pública é direito fundamental de todo cidadão." },
                  { ref: "Art. 8º", texto: "É dever dos órgãos públicos promover a divulgação de informações de interesse coletivo independentemente de solicitação." },
                ],
              },
              {
                titulo: "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
                artigos: [
                  { ref: "Art. 7º, §7º", texto: "O tratamento de dados tornados manifestamente públicos pelo titular é lícito." },
                  { ref: "Art. 11, §4º", texto: "Dados pessoais sensíveis podem ser tratados para fins de controle social e interesse público." },
                ],
              },
              {
                titulo: "Marco Civil da Internet (Lei 12.965/2014)",
                artigos: [
                  { ref: "Art. 3º, I-III", texto: "Garante liberdade de expressão, privacidade e acesso aberto à internet." },
                  { ref: "Art. 19", texto: "Protege provedores e plataformas de responsabilidade por conteúdo de terceiros, salvo ordem judicial específica." },
                ],
              },
              {
                titulo: "Tratados Internacionais",
                artigos: [
                  { ref: "Declaração Universal dos Direitos Humanos", texto: "Art. 19 — Direito à liberdade de opinião e expressão, incluindo buscar, receber e difundir informações." },
                  { ref: "Pacto de San José da Costa Rica", texto: "Art. 13 — Liberdade de pensamento e expressão, vedada a censura prévia." },
                ],
              },
            ].map((lei) => (
              <div key={lei.titulo} className="border-l-4 border-sky-500/60 pl-4">
                <h4 className="mb-2 font-semibold text-slate-100">{lei.titulo}</h4>
                <ul className="space-y-2">
                  {lei.artigos.map((a) => (
                    <li key={a.ref} className="text-sm text-slate-400">
                      <span className="font-semibold text-slate-200">{a.ref}:</span>{" "}
                      {a.texto}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-slate-800/60 p-4">
            <h4 className="mb-2 font-semibold text-slate-100">
              Direitos Autorais e Código Aberto
            </h4>
            <p className="text-sm leading-relaxed text-slate-400">
              O código-fonte do Currículo Político é licenciado sob{" "}
              <strong className="text-slate-200">AGPL-3.0</strong> (software
              livre), permitindo uso, modificação e redistribuição, inclusive
              comercial, desde que as modificações também sejam liberadas. A
              documentação está sob{" "}
              <strong className="text-slate-200">CC BY 4.0</strong>. Os dados
              exibidos são de domínio público, extraídos de fontes
              governamentais abertas.
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <h4 className="mb-2 font-semibold text-slate-100">
              Direito de Crítica e Interesse Público
            </h4>
            <p className="text-sm leading-relaxed text-slate-400">
              Agentes públicos possuem esfera de privacidade reduzida em razão
              do cargo que ocupam, conforme jurisprudência consolidada do STF.
              A exposição de dados funcionais e jurídicos de políticos em
              exercício é protegida pelo direito à informação e ao controle
              social (ADPF 130/DF).
            </p>
          </div>
        </div>
      </section>

      {/* Licença */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-slate-100">
          Licença e Código Aberto
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="mb-4 leading-relaxed text-slate-400">
            O Currículo Político é um projeto 100% open source. O código-fonte, a
            metodologia de cálculo e os pipelines de dados estão disponíveis
            publicamente para auditoria, contribuição e replicação.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm text-slate-300">
              Código: AGPL-3.0
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm text-slate-300">
              Documentação: CC BY 4.0
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm text-slate-300">
              Dados: Fontes Públicas Governamentais
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
