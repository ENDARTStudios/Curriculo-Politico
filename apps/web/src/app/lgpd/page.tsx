import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LGPD — Currículo Político",
  description:
    "Como o Currículo Político trata dados pessoais em conformidade com a LGPD: dados públicos vs. pessoais, base legal, direitos dos titulares e Encarregado (DPO).",
};

export default function LGPDPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Lei Geral de Proteção de Dados (LGPD)
      </h1>
      <p className="mt-3 max-w-3xl text-xl leading-relaxed text-slate-400">
        Como o Currículo Político trata dados pessoais em conformidade com a Lei
        nº 13.709/2018.
      </p>

      <div className="mt-10 space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            1. O que é a LGPD
          </h2>
          <p className="leading-relaxed text-slate-400">
            A Lei Geral de Proteção de Dados Pessoais (LGPD) é a legislação
            brasileira que regula o tratamento de dados pessoais por empresas,
            órgãos públicos e organizações. Entrou em vigor em 18 de setembro de
            2020 e estabelece direitos aos titulares de dados e obrigações aos
            controladores.
          </p>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold text-slate-100">
            2. Dados Públicos vs. Dados Pessoais Sensíveis
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h3 className="mb-2 font-semibold text-emerald-300">
                ✅ Dados Públicos (Tratamos)
              </h3>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>• Nome civil e nome de urna</li>
                <li>• Cargo político e mandato</li>
                <li>• Partido e histórico eleitoral</li>
                <li>• Votações e projetos de lei</li>
                <li>• Despesas públicas (CEAP)</li>
                <li>• Patrimônio declarado ao TSE</li>
              </ul>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <h3 className="mb-2 font-semibold text-red-300">
                ❌ Dados Pessoais Sensíveis (NÃO Tratamos)
              </h3>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>• CPF completo</li>
                <li>• Endereço residencial</li>
                <li>• Telefone pessoal</li>
                <li>• Dados de familiares</li>
                <li>• Origem racial ou étnica</li>
                <li>• Convicções religiosas</li>
                <li>• Opiniões políticas (inferidas)</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            3. Base Legal para Tratamento de Dados Públicos
          </h2>
          <ul className="space-y-3 text-slate-400">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-sky-400">•</span>
              <span>
                <strong className="text-slate-200">Art. 7º, §7º da LGPD:</strong>{" "}
                &quot;O tratamento de dados pessoais tornados manifestamente
                públicos pelo titular é lícito.&quot;
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-sky-400">•</span>
              <span>
                <strong className="text-slate-200">Art. 11, §4º da LGPD:</strong>{" "}
                Permite tratamento de dados sensíveis para fins de controle
                social e interesse público.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-sky-400">•</span>
              <span>
                <strong className="text-slate-200">
                  Lei de Acesso à Informação (12.527/2011):
                </strong>{" "}
                determina que informações de agentes públicos são de interesse
                coletivo.
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            4. Direitos dos Políticos (Titulares de Dados)
          </h2>
          <p className="mb-3 leading-relaxed text-slate-400">
            Políticos cujos dados são exibidos na plataforma têm direito a:
          </p>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-slate-400">
            <li>
              <strong className="text-slate-200">Retificação:</strong> corrigir
              dados desatualizados ou incorretos
            </li>
            <li>
              <strong className="text-slate-200">Esclarecimento:</strong>{" "}
              solicitar informações sobre a origem dos dados
            </li>
            <li>
              <strong className="text-slate-200">Anonimização:</strong> quando
              aplicável à situação
            </li>
          </ul>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm leading-relaxed text-slate-400">
              <strong className="text-amber-300">Limitação importante:</strong>{" "}
              agentes públicos possuem esfera de privacidade reduzida
              (jurisprudência do STF). Dados funcionais e de gestão pública não
              podem ser removidos por motivos de imagem.
            </p>
          </div>
          <Link
            href="/retificacao"
            className="mt-4 inline-block rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
          >
            Solicitar Retificação
          </Link>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            5. Encarregado de Dados (DPO)
          </h2>
          <p className="mb-3 leading-relaxed text-slate-400">
            O Currículo Político designa um Encarregado de Proteção de Dados
            responsável por:
          </p>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-slate-400">
            <li>Receber comunicações da ANPD</li>
            <li>Orientar colaboradores sobre práticas de proteção de dados</li>
            <li>Atender solicitações de titulares de dados</li>
            <li>Cooperar com a ANPD</li>
          </ul>
          <div className="rounded-lg bg-slate-800/60 p-4">
            <p className="text-sm text-slate-400">
              <strong className="text-slate-300">Contato do DPO:</strong>{" "}
              dpo@curriculopolitico.org
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            6. Relatório de Impacto (RIPD)
          </h2>
          <p className="leading-relaxed text-slate-400">
            Elaboramos um Relatório de Impacto à Proteção de Dados Pessoais que
            documenta a descrição das operações de tratamento, as medidas de
            segurança adotadas, os riscos identificados e mitigados, e os
            direitos dos titulares. O RIPD completo está disponível mediante
            solicitação ao DPO.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            7. Incidentes de Segurança
          </h2>
          <p className="leading-relaxed text-slate-400">
            Em caso de incidente de segurança que possa acarretar risco ou dano
            relevante aos titulares, comunicaremos a ANPD em prazo razoável, os
            titulares afetados via email ou aviso no site, e as medidas adotadas
            para reverter ou mitigar os efeitos.
          </p>
        </section>
      </div>

      <p className="mt-8 text-sm text-slate-400">
        Veja também:{" "}
        <Link href="/privacidade" className="text-sky-400 hover:underline">
          Política de Privacidade
        </Link>{" "}
        e{" "}
        <Link href="/termos-de-uso" className="text-sky-400 hover:underline">
          Termos de Uso
        </Link>
        .
      </p>
    </main>
  );
}
