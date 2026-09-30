import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade — Currículo Político",
  description:
    "Política de Privacidade do Currículo Político: tratamento de dados de usuários e agentes públicos, base legal LGPD, direitos do titular, segurança e protocolo de incidentes.",
};

const CONTROLLER = {
  nome: "ENDART Studios",
  email: "contato@curriculopolitico.org",
  dpo: "dpo@curriculopolitico.org",
};

const PROVEDORES = [
  { nome: "Vercel Inc.", funcao: "Hospedagem da aplicação", localizacao: "Global (CDN edge + serverless)", dados: "Dados de sessão, IP, logs" },
  { nome: "Supabase Inc.", funcao: "Banco de dados PostgreSQL", localizacao: "sa-east-1 (São Paulo)", dados: "Todos os dados da aplicação" },
  { nome: "Sentry (condicional)", funcao: "Monitoramento de erros", localizacao: "EUA (quando ativo)", dados: "Stack traces, mensagens de erro" },
  { nome: "Cloudflare (planejado)", funcao: "WAF e proteção DDoS", localizacao: "Global", dados: "IP, headers" },
];

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última atualização: setembro de 2026 · Em revisão jurídica
      </p>

      <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-amber-200/80">
        <strong>⚠️ Divisão fundamental deste documento:</strong>
        <br />
        O Currículo Político trata <strong className="text-slate-200">dois universos de dados distintos</strong> que
        possuem regimes legais diferentes: (A) dados <strong>públicos</strong> de agentes
        políticos (LAI + CF/88 Art. 37) e (B) dados <strong>pessoais de usuários
        cadastrados</strong> (LGPD, incluindo dado sensível — opinião política via
        votação em projetos). Esta política separa claramente os dois.
      </div>

      <div className="mt-10 space-y-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        {/* Controlador */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">1. Identificação do Controlador</h2>
          <div className="rounded-lg bg-slate-800/60 p-4 text-sm text-slate-300">
            <p><strong>Controlador:</strong> {CONTROLLER.nome}</p>
            <p><strong>Contato institucional:</strong> {CONTROLLER.email}</p>
            <p><strong>Encarregado de Dados (DPO):</strong> {CONTROLLER.dpo}</p>
            <p className="mt-2 text-xs text-slate-500">
              A identificação empresarial completa (CNPJ, endereço) será adicionada
              quando a entidade jurídica for formalmente constituída.
            </p>
          </div>
        </section>

        {/* Universo A: Agentes Políticos */}
        <section>
          <h2 className="mb-1 text-2xl font-bold text-slate-100">
            2. Universo A — Dados Públicos de Agentes Políticos
          </h2>
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">
            Base legal: LAI (Lei 12.527/2011) + CF/88 Art. 37 (publicidade administrativa) + LGPD Art. 7º, §4º (dados manifestamente públicos)
          </p>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Dados funcionais de agentes públicos extraídos de fontes oficiais
            (Câmara, Senado, TSE). Inclui: nome, cargo, mandato, partido,
            votações nominais, presenças, proposições autorais, CEAP, patrimônio
            declarado e registros jurídicos de fontes oficiais.
          </p>
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-slate-400">
            <strong className="text-sky-300">Nota:</strong> O IDIP transforma esses
            dados públicos em uma avaliação algorítmica derivada (nota 0–100 + ranking).
            A plataforma não é um mero agregador — realiza tratamento analítico próprio.
            O IDIP nunca incorpora opinião popular ou ideologia.
          </div>
        </section>

        {/* Universo B: Usuários */}
        <section>
          <h2 className="mb-1 text-2xl font-bold text-slate-100">
            3. Universo B — Dados de Usuários Cadastrados
          </h2>
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Base legal: LGPD Art. 7º, I (consentimento) + Art. 7º, IX (legítimo interesse p/ segurança)
          </p>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Dados pessoais fornecidos pelo usuário ao criar conta. Incluem{" "}
            <strong className="text-amber-300">dado pessoal sensível</strong> (opinião
            política manifestada via votação em projetos), conforme Art. 5º, II da LGPD.
          </p>

          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-slate-400">
            <strong className="text-red-300">⚠️ Dado sensível:</strong> O voto
            FAVOR/CONTRA em projetos de lei revela opinião política do usuário. Este
            dado é tratado com o regime agravado do Art. 11 da LGPD: coleta apenas
            com consentimento específico e destacado, finalidade exclusivamente
            pessoal (nunca compartilhada, nunca usada para o IDIP), e eliminação
            imediata mediante solicitação ou exclusão de conta.
          </div>

          <div className="space-y-3 text-sm text-slate-400">
            <p><strong className="text-slate-300">Coletamos:</strong></p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Email (login)</li>
              <li>Senha (hash bcrypt — nunca texto plano)</li>
              <li>Nome (opcional)</li>
              <li>Votos FAVOR/CONTRA em projetos (dado sensível — Art. 5º, II)</li>
              <li>Preferências de afinidade (apenas localStorage — nunca servidor)</li>
            </ul>
            <p><strong className="text-slate-300">NÃO coletamos:</strong></p>
            <ul className="list-disc space-y-1 pl-5">
              <li>CPF, endereço, telefone, dados bancários</li>
              <li>Localização precisa (GPS)</li>
              <li>Dados de menores de 18 anos</li>
              <li>Dados de saúde, biometria, religião ou origem racial</li>
            </ul>
          </div>
        </section>

        {/* Dados que NUNCA tratamos */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            4. Dados que NUNCA Tratamos
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
            <li>Dados de saúde, biometria, genética</li>
            <li>Origem racial, convicções religiosas</li>
            <li>Endereço residencial, telefone pessoal</li>
            <li>Dados de familiares sem cargo público</li>
            <li>Dados de menores de 18 anos</li>
            <li>Conteúdo de mensagens privadas</li>
          </ul>
        </section>

        {/* Cookies e Terceiros */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            5. Cookies e Serviços de Terceiros
          </h2>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="border-l-4 border-emerald-500/50 pl-3">
              <strong className="text-slate-300">Cookies essenciais:</strong> apenas
              next-auth.session-token (30 dias) e next-auth.csrf-token (sessão).
              Nenhum cookie de rastreamento ou publicidade.
            </div>
            <div className="border-l-4 border-slate-600 pl-3">
              <strong className="text-slate-300">Armazenamento local:</strong>{" "}
              preferências do Filtro de Afinidade (localStorage — nunca enviado ao
              servidor).
            </div>
            <div className="border-l-4 border-slate-600 pl-3">
              <strong className="text-slate-300">Sentry (condicional):</strong> se{" "}
              <code className="text-slate-300">SENTRY_DSN</code> estiver configurado,
              o Sentry captura stack traces de erros não tratados. O Sentry é um
              serviço de terceiros (Functional Software Inc., EUA) e deve ser
              disclosure na Política de Privacidade quando ativo.
            </div>
          </div>
        </section>

        {/* Transferência Internacional */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            6. Transferência Internacional de Dados
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Conforme a Resolução CD/ANPD nº 19/2024, a transferência internacional
            de dados exige identificação do mecanismo jurídico aplicável. Os
            provedores utilizados e os mecanismos são:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-300">
                <tr>
                  <th className="pb-2 pr-4">Fornecedor</th>
                  <th className="pb-2 pr-4">Dados transferidos</th>
                  <th className="pb-2">Mecanismo</th>
                </tr>
              </thead>
              <tbody className="text-slate-400">
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-4">Vercel Inc. (EUA)</td>
                  <td className="py-2 pr-4">Logs, dados de sessão</td>
                  <td>SCCs + adequação (ADF)</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-4">Supabase Inc. (sa-east-1)</td>
                  <td className="py-2 pr-4">Todos os dados (banco)</td>
                  <td>Servidor no Brasil — sem transferência internacional</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Sentry (EUA, se ativo)</td>
                  <td className="py-2 pr-4">Stack traces de erros</td>
                  <td>SCCs + adequação (ADF)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs italic text-slate-500">
            Os contratos com os provedores devem conter as Cláusulas Padrão
            Contratuais aplicáveis. Esta política será atualizada quando os
            contratos forem formalmente firmados.
          </p>
        </section>

        {/* Direitos LGPD */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            7. Direitos do Titular (Art. 18 da LGPD)
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Todos os titulares (usuários e agentes públicos) têm direito a:
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              "Confirmar a existência de tratamento",
              "Acessar seus dados pessoais",
              "Corrigir dados incompletos ou desatualizados",
              "Anonimizar, bloquear ou eliminar dados desnecessários",
              "Portabilidade dos dados a outro fornecedor",
              "Eliminar dados tratados com consentimento",
              "Informar-se sobre com quem compartilhamos",
              "Informar-se sobre consequências de não fornecer",
              "Revogar o consentimento",
            ].map((d) => (
              <div key={d} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
                ✓ {d}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Para exercer:{" "}
            <Link href="/retificacao" className="text-sky-400 hover:underline">
              /retificacao
            </Link>{" "}
            ou dpo@curriculopolitico.org. Prazo de resposta: 15 dias (Art. 19).
          </p>
        </section>

        {/* Retenção */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            8. Retenção de Dados
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-300">
              <tr>
                <th className="pb-2 pr-4">Dados</th>
                <th className="pb-2 pr-4">Retenção</th>
                <th className="pb-2">Eliminação</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <tr className="border-b border-slate-800/60">
                <td className="py-2 pr-4">Conta e dados pessoais</td>
                <td className="py-2 pr-4">Enquanto a conta existir</td>
                <td className="py-2">30 dias após exclusão solicitada</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2 pr-4">Votos em projetos (UserBillVote)</td>
                <td className="py-2 pr-4">Vinculados à conta</td>
                <td className="py-2">Eliminados com a conta (cascade)</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2 pr-4">Logs de segurança (IP)</td>
                <td className="py-2 pr-4">6 meses</td>
                <td className="py-2">Automática (Marco Civil Art. 15)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Dados públicos de agentes políticos</td>
                <td className="py-2 pr-4">Enquanto relevante ao mandato</td>
                <td className="py-2">Retificação via /retificacao</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Segurança */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">9. Segurança</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
            <li>HTTPS/TLS em todas as comunicações</li>
            <li>Senhas hasheadas com bcrypt (custo 10)</li>
            <li>Rate limiting: 60 requisições/minuto por IP</li>
            <li>Role dedicado no banco (curriculo_app — não superuser)</li>
            <li>Headers de segurança: CSP, X-Frame-Options, nosniff, Referrer-Policy</li>
            <li>Anti-bot: conta com menos de 24h não vota</li>
          </ul>
        </section>

        {/* Incidentes */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            10. Protocolo de Incidentes de Segurança
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-400">
            Conforme a Resolução CD/ANPD nº 15/2024, em caso de incidente de
            segurança que possa acarretar risco relevante aos titulares:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
            <li>
              <strong className="text-slate-200">Comunicação à ANPD:</strong> em até
              3 dias úteis da constatação
            </li>
            <li>
              <strong className="text-slate-200">Comunicação aos titulares:</strong>{" "}
              em prazo razoável, via email e aviso no site
            </li>
            <li>
              <strong className="text-slate-200">Documentação:</strong> post-mortem
              com causas, impacto e medidas corretivas
            </li>
          </ul>
        </section>

        {/* Menores */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            11. Dados de Menores de 18 Anos
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            Conforme o Art. 14 da LGPD, o tratamento de dados de crianças e
            adolescentes tem regime específico. A Plataforma NÃO é direcionada a
            menores e não coleta intencionalmente seus dados. Se tomarmos
            conhecimento de dados de menores, serão imediatamente eliminados.
          </p>
        </section>

        {/* Exclusão de conta */}
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            12. Exclusão de Conta
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            O usuário pode solicitar a exclusão de sua conta e de todos os dados
            pessoais vinculados (votos, preferências, dados de perfil) a qualquer
            momento, via dpo@curriculopolitico.org. A eliminação será realizada em
            até 30 dias, com exceção de dados que a lei exija manter.
          </p>
        </section>
      </div>
    </main>
  );
}
