import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade — Currículo Político",
  description:
    "Política de Privacidade completa do Currículo Político: dados coletados, base legal LGPD, direitos do titular, retenção e segurança.",
};

const SECOES = [
  {
    titulo: "1. Introdução",
    paragrafos: [
      'O Currículo Político ("nós", "nosso" ou "plataforma") está comprometido com a proteção da privacidade dos usuários ("você" ou "seu"). Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).',
    ],
  },
  {
    titulo: "2. Dados que Coletamos",
    grupos: [
      {
        sub: "2.1. Dados fornecidos por você",
        itens: [
          "Email e nome (ao criar conta)",
          "Preferências de afinidade política (salvas localmente no seu navegador)",
          "Votos em projetos de lei",
          "Comunicações enviadas via formulário de contato",
        ],
      },
      {
        sub: "2.2. Dados coletados automaticamente",
        itens: [
          "Endereço IP (para segurança e rate limiting)",
          "Tipo de navegador e dispositivo",
          "Páginas visitadas e tempo de permanência",
          "Dados de cookies essenciais (sessão, preferências)",
        ],
      },
      {
        sub: "2.3. Dados que NÃO coletamos",
        itens: [
          "CPF, endereço residencial, telefone",
          "Dados bancários ou de pagamento",
          "Localização precisa (GPS)",
          "Dados de menores de 18 anos",
        ],
      },
    ],
  },
  {
    titulo: "3. Base Legal para Tratamento",
    grupos: [
      {
        sub: "Hipóteses legais (Art. 7º da LGPD)",
        itens: [
          "Consentimento: para envio de comunicações opcionais",
          "Execução de contrato: para fornecer os serviços da plataforma",
          "Legítimo interesse: para segurança, prevenção a fraudes e melhorias do serviço",
          "Cumprimento de obrigação legal: para atender requisições judiciais",
        ],
      },
    ],
  },
  {
    titulo: "4. Como Usamos seus Dados",
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
    titulo: "5. Compartilhamento de Dados",
    paragrafos: [
      "Não vendemos seus dados. Compartilhamos apenas com: provedores de infraestrutura (Vercel para hospedagem, Supabase para banco de dados, Cloudflare para segurança — todos contratualizados com cláusulas de proteção); autoridades competentes quando requerido por ordem judicial; e parceiros institucionais, apenas com dados agregados e anonimizados para pesquisas.",
    ],
  },
  {
    titulo: "6. Seus Direitos (Art. 18 da LGPD)",
    grupos: [
      {
        sub: "Você tem direito a:",
        itens: [
          "Confirmar a existência de tratamento de dados",
          "Acessar seus dados pessoais",
          "Corrigir dados incompletos ou desatualizados",
          "Anonimizar, bloquear ou eliminar dados desnecessários",
          "Portabilidade dos dados a outro fornecedor",
          "Eliminar dados tratados com consentimento",
          "Revogar o consentimento",
        ],
      },
    ],
  },
  {
    titulo: "7. Retenção de Dados",
    grupos: [
      {
        sub: "Prazos",
        itens: [
          "Conta ativa: dados mantidos enquanto a conta existir",
          "Conta excluída: dados pessoais removidos em até 30 dias",
          "Logs de segurança: mantidos por 6 meses para prevenção a fraudes",
          "Dados anonimizados: mantidos indefinidamente para estatísticas",
        ],
      },
    ],
  },
  {
    titulo: "8. Segurança",
    paragrafos: [
      "Adotamos medidas técnicas e administrativas para proteger seus dados, incluindo criptografia em trânsito (HTTPS), senhas hasheadas com bcrypt, rate limiting nas APIs, headers de segurança (CSP, X-Frame-Options) e acesso restrito a dados pessoais.",
    ],
  },
  {
    titulo: "9. Contato",
    paragrafos: [
      "Para questões sobre privacidade ou exercício de direitos: privacidade@curriculopolitico.org — Responsável: Equipe Currículo Político.",
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
        Última atualização: setembro de 2026
      </p>

      <div className="mt-8 space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        {SECOES.map((secao) => (
          <section key={secao.titulo}>
            <h2 className="mb-4 text-2xl font-bold text-slate-100">
              {secao.titulo}
            </h2>
            {secao.paragrafos?.map((p) => (
              <p key={p.slice(0, 40)} className="leading-relaxed text-slate-400">
                {p}
              </p>
            ))}
            {secao.grupos?.map((grupo) => (
              <div key={grupo.sub} className="mb-4 last:mb-0">
                <h3 className="mb-2 font-semibold text-slate-200">{grupo.sub}</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
                  {grupo.itens.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
        <p className="border-t border-slate-800 pt-6 text-sm text-slate-400">
          Para exercer seus direitos, entre em contato via{" "}
          <Link href="/contato" className="text-sky-400 hover:underline">
            nossa página de contato
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
