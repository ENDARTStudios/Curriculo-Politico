import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidade e LGPD — Currículo Político",
  description:
    "Como o Currículo Político trata dados pessoais de agentes públicos conforme a LGPD: base legal, minimização e retenção.",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        Política de Privacidade e LGPD
      </h1>
      <p className="mt-2 text-slate-400">
        Como o Currículo Político trata dados pessoais de agentes públicos.
      </p>

      <div className="mt-8 space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-100">
            1. Base legal do tratamento
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            O tratamento de dados pessoais realizado pelo Currículo Político
            fundamenta-se no <strong className="text-slate-200">Art. 7º,
            inciso III</strong> (tutela de procedimentos) e no{" "}
            <strong className="text-slate-200">Art. 11, §4º</strong> da LGPD,
            que autorizam o tratamento de dados pessoais tornados
            manifestamente públicos pelo titular ou por força de lei, visando o
            interesse público e o controle social.
          </p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-100">
            2. Minimização de dados
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            O site <strong className="text-slate-200">não coleta nem exibe</strong>:
          </p>
          <ul className="space-y-1 text-sm text-slate-400">
            <li>• CPF completo</li>
            <li>• Endereços residenciais</li>
            <li>• Telefones pessoais</li>
            <li>• Dados de familiares sem cargo público</li>
            <li>• Dados de saúde ou orientação sexual</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Apenas dados funcionais e públicos relevantes para o exercício do
            mandato são processados. Registros judiciais arquivados ou com
            absolvição são ocultados automaticamente do perfil público.
          </p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-100">
            3. Retenção e atualização
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            Os dados são mantidos enquanto relevantes para o controle social do
            mandato em curso e atualizados por coletas periódicas nas fontes
            oficiais (Câmara, Senado, TSE). Cada registro jurídico exibe a data
            da coleta (<code className="text-slate-300">retrievedAt</code>) e o
            link da fonte original. Dados desatualizados comprovadamente
            corrigidos na fonte são atualizados pelo{" "}
            <a href="/retificacao" className="text-sky-400 hover:underline">
              canal de retificação
            </a>
            .
          </p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-bold text-slate-100">
            4. Dados de usuários do site
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            O Currículo Político <strong className="text-slate-200">não utiliza
            rastreadores nem analítica de terceiros</strong> nesta fase, e não
            requer cadastro para consulta. Contas de usuário (favoritos e
            dashboard) estão previstas para a Fase 4 e terão política própria.
          </p>
        </section>
      </div>
    </main>
  );
}
