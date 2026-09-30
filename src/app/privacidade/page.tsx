import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade — Currículo Político",
  description:
    "Política de Privacidade completa do Currículo Político: dados coletados, base legal LGPD, transferência internacional, DPO, direitos do titular, retenção, segurança e protocolo de incidentes.",
};

const SECOES = [
  {
    titulo: "1. Introdução",
    paragrafos: [
      'O Currículo Político ("nós", "nosso" ou "plataforma") está comprometido com a proteção da privacidade dos usuários ("você" ou "seu"). Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e as resoluções da Autoridade Nacional de Proteção de Dados (ANPD).',
    ],
  },
  {
    titulo: "2. Encarregado de Dados (DPO)",
    paragrafos: [
      "Conforme o Art. 41 da LGPD, designamos formalmente um Encarregado de Proteção de Dados responsável por: receber comunicações da ANPD, orientar colaboradores sobre práticas de proteção de dados, atender solicitações de titulares e cooperar com a autoridade nacional.",
    ],
    destaque: "Encarregado (DPO): dpo@curriculopolitico.org",
  },
  {
    titulo: "3. Dados que Coletamos",
    grupos: [
      {
        sub: "3.1. Dados fornecidos por você",
        itens: [
          "Email e nome (ao criar conta via credentials ou Google OAuth)",
          "Senha (armazenada exclusivamente como hash bcrypt)",
          "Preferências de afinidade política (salvas localmente no seu navegador — nunca enviadas ao servidor)",
          "Votos em projetos de lei (FAVOR/CONTRA)",
          "Comunicações enviadas via formulário de retificação",
        ],
      },
      {
        sub: "3.2. Dados coletados automaticamente",
        itens: [
          "Endereço IP (para segurança e rate limiting — não armazenado permanentemente)",
          "Tipo de navegador e dispositivo (derivado do User-Agent, não armazenado)",
          "Cookies essenciais de sessão (next-auth.session-token e next-auth.csrf-token)",
        ],
      },
      {
        sub: "3.3. Dados que NÃO coletamos",
        itens: [
          "CPF, endereço residencial, telefone pessoal",
          "Dados bancários ou de pagamento",
          "Localização precisa (GPS)",
          "Dados de menores de 18 anos",
          "Dados de saúde, orientação sexual, origem racial ou convicções religiosas",
          "Dados de familiares sem cargo público",
        ],
      },
    ],
  },
  {
    titulo: "4. Base Legal para Tratamento",
    grupos: [
      {
        sub: "Dados de usuários da plataforma",
        itens: [
          "Consentimento (Art. 7º, I): para criação de conta e votação popular",
          "Execução de contrato (Art. 7º, V): para fornecer os serviços da plataforma",
          "Legítimo interesse (Art. 7º, IX): para segurança, prevenção a fraudes e melhorias",
          "Cumprimento de obrigação legal (Art. 7º, II): para atender requisições judiciais",
        ],
      },
      {
        sub: "Dados de Agentes Políticos",
        itens: [
          "Dados manifestamente públicos (Art. 7º, §4º e Art. 11, §4º): dados de agentes públicos tornados públicos por força de lei",
          "LAI — Lei de Acesso à Informação (Lei 12.527/2011): publicidade como preceito geral",
          "CF/88 Art. 37: princípio da publicidade administrativa",
        ],
      },
    ],
  },
  {
    titulo: "5. Como Usamos seus Dados",
    grupos: [
      {
        sub: "Finalidades",
        itens: [
          "Permitir votação em projetos de lei (camada de engajamento pessoal)",
          "Personalizar sua experiência com o Filtro de Afinidade",
          "Prevenir fraudes e abusos (contas com menos de 24h não votam)",
          "Melhorar nossos serviços e corrigir erros",
          "Cumprir obrigações legais",
        ],
      },
    ],
  },
  {
    titulo: "6. Transferência Internacional de Dados",
    paragrafos: [
      "A Plataforma utiliza provedores de infraestrutura com servidores localizados fora do Brasil, configurando transferência internacional de dados (Art. 33 da LGPD). Esta transferência é amparada por Cláusulas Contratuais Padrão (SCCs) ou adequação garantida pelos provedores:",
      "• Vercel Inc. — hospedagem da aplicação (servidores em múltiplas regiões, com certificação SOC 2 e adesão ao EU-US Data Privacy Framework)",
      "• Supabase Inc. — banco de dados PostgreSQL (servidor em São Paulo, Brasil — aws-0-sa-east-1)",
      "• Cloudflare Inc. — segurança de borda e WAF (quando ativado)",
      "Todos os provedores contratam Cláusulas Contratuais Padrão (Standard Contractual Clauses) aprovadas por autoridades de proteção de dados competentes.",
    ],
  },
  {
    titulo: "7. Compartilhamento de Dados",
    paragrafos: [
      "Não vendemos seus dados. Compartilhamos apenas com: provedores de infraestrutura listados acima (sob contrato com cláusulas de proteção); autoridades competentes quando requerido por ordem judicial; e parceiros institucionais, apenas com dados agregados e anonimizados para pesquisas de interesse público.",
    ],
  },
  {
    titulo: "8. Seus Direitos (Art. 18 da LGPD)",
    grupos: [
      {
        sub: "Você tem direito a:",
        itens: [
          "Confirmar a existência de tratamento de seus dados",
          "Acessar seus dados pessoais",
          "Corrigir dados incompletos, inexatos ou desatualizados",
          "Anonimizar, bloquear ou eliminar dados desnecessários ou excessivos",
          "Portabilidade dos dados a outro fornecedor de serviço",
          "Eliminar dados tratados com base em consentimento",
          "Informar-se sobre com quem compartilhamos seus dados",
          "Informar-se sobre as consequências de não fornecer consentimento",
          "Revogar o consentimento a qualquer momento",
        ],
      },
      {
        sub: "Como exercer",
        itens: [
          "Acesse a página /contato ou envie email para dpo@curriculopolitico.org",
          "Prazo de resposta: 15 dias (Art. 19 da LGPD)",
          "Em caso de insatisfação, você pode reclamar diretamente à ANPD (gov.br/anpd)",
        ],
      },
    ],
  },
  {
    titulo: "9. Retenção de Dados",
    grupos: [
      {
        sub: "Prazos de retenção",
        itens: [
          "Conta ativa: dados mantidos enquanto a conta existir",
          "Conta excluída: dados pessoais removidos em até 30 dias",
          "Logs de segurança (IP, User-Agent): mantidos por 6 meses (Art. 15 do Marco Civil da Internet)",
          "Dados de votação popular: mantidos de forma anonimizada para estatísticas agregadas",
          "Dados públicos de agentes públicos: mantidos enquanto relevante para o controle social do mandato",
        ],
      },
    ],
  },
  {
    titulo: "10. Segurança",
    paragrafos: [
      "Adotamos medidas técnicas e administrativas para proteger seus dados, incluindo: criptografia em trânsito (HTTPS/TLS 1.3); senhas hasheadas com bcrypt (custo 10); rate limiting nas APIs (60 requisições/minuto por IP); headers de segurança (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy); acesso a dados pessoais restrito por role no banco de dados (curriculo_app, não superuser); e middleware de segurança em todas as rotas.",
    ],
  },
  {
    titulo: "11. Protocolo de Incidentes de Segurança",
    paragrafos: [
      "Conforme o Art. 48 da LGPD, em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, comunicaremos:",
      "• A ANPD (Autoridade Nacional de Proteção de Dados) em prazo razoável;",
      "• Os titulares afetados, via email e aviso no site;",
      "• As medidas técnicas adotadas para reverter ou mitigar os efeitos;",
      "• Os canais de atendimento para dúvidas sobre o incidente.",
      "O plano de resposta a incidentes está documentado internamente e inclui: detecção (Sentry + logs de segurança), contenção (reversão de deploy, bloqueio de acesso), notificação (ANPD e titulares), correção (fix + testes de regressão) e documentação (post-mortem em 72h).",
    ],
  },
  {
    titulo: "12. Dados de Menores de 18 Anos",
    paragrafos: [
      "Conforme o Art. 14 da LGPD, o tratamento de dados de crianças e adolescentes é regido pelo interesse superior destes. A Plataforma NÃO é direcionada a menores de 18 anos e não coleta intencionalmente dados deste grupo.",
      "Se tomarmos conhecimento de que dados de menores foram inadvertidamente coletados, tais dados serão imediatamente eliminados. Menores de 18 anos não devem criar conta na plataforma.",
    ],
  },
  {
    titulo: "13. Cookies",
    paragrafos: [
      "Utilizamos apenas cookies essenciais de sessão (NextAuth) e armazenamento local para preferências do Filtro de Afinidade. Não usamos cookies de rastreamento, publicidade ou analytics de terceiros. Ver detalhes completos em /cookies.",
    ],
  },
  {
    titulo: "14. Alterações desta Política",
    paragrafos: [
      "Esta Política pode ser atualizada periodicamente. A data da última atualização está indicada no topo. Mudanças significativas serão comunicadas via aviso no site com 30 dias de antecedência. Versões anteriores estão disponíveis no histórico do repositório open source.",
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última atualização: setembro de 2026 · Em conformidade com a LGPD (Lei
        13.709/2018) e resoluções da ANPD
      </p>

      <div className="mt-8 space-y-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        {SECOES.map((secao) => (
          <section key={secao.titulo}>
            <h2 className="mb-4 text-2xl font-bold text-slate-100">
              {secao.titulo}
            </h2>
            {secao.paragrafos?.map((p) => (
              <p key={p.slice(0, 40)} className="mb-3 leading-relaxed text-slate-400">
                {p}
              </p>
            ))}
            {secao.destaque && (
              <div className="mb-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm font-medium text-sky-300">
                {secao.destaque}
              </div>
            )}
            {secao.grupos?.map((grupo) => (
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

        <p className="border-t border-slate-800 pt-6 text-sm text-slate-400">
          Em caso de divergência entre esta política e a legislação aplicável,
          prevalecerá a legislação. Para exercer seus direitos, acesse{" "}
          <Link href="/contato" className="text-sky-400 hover:underline">
            nossa página de contato
          </Link>{" "}
          ou consulte a{" "}
          <Link href="/lgpd" className="text-sky-400 hover:underline">
            página LGPD
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
