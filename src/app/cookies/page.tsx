import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Cookies — Currículo Político",
  description:
    "Cookies que o Currículo Político utiliza: essenciais de sessão e armazenamento local de preferências. Sem rastreadores de terceiros.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Política de Cookies
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Última atualização: setembro de 2026
      </p>

      <div className="mt-8 space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            1. O que são Cookies
          </h2>
          <p className="leading-relaxed text-slate-400">
            Cookies são pequenos arquivos de texto armazenados no seu dispositivo
            quando você visita um site. Eles permitem que o site reconheça seu
            dispositivo e lembre informações sobre sua visita.
          </p>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold text-slate-100">
            2. Cookies que Utilizamos
          </h2>

          <div className="space-y-8">
            <div className="border-l-4 border-emerald-500/60 pl-4">
              <h3 className="mb-2 text-lg font-semibold text-slate-100">
                2.1. Cookies Essenciais (Obrigatórios)
              </h3>
              <p className="mb-3 text-sm text-slate-400">
                Necessários para o funcionamento do site. Não podem ser
                desativados.
              </p>
              <table className="w-full text-left text-sm">
                <thead className="text-slate-300">
                  <tr className="border-b border-slate-700">
                    <th className="pb-2 pr-4">Nome</th>
                    <th className="pb-2 pr-4">Finalidade</th>
                    <th className="pb-2">Duração</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  <tr className="border-b border-slate-800/60">
                    <td className="py-2 pr-4 font-mono text-xs">
                      next-auth.session-token
                    </td>
                    <td className="py-2 pr-4">Manter sua sessão de login</td>
                    <td className="py-2">30 dias</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">
                      next-auth.csrf-token
                    </td>
                    <td className="py-2 pr-4">Proteção contra ataques CSRF</td>
                    <td className="py-2">Sessão</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border-l-4 border-sky-500/60 pl-4">
              <h3 className="mb-2 text-lg font-semibold text-slate-100">
                2.2. Armazenamento Local (localStorage)
              </h3>
              <p className="mb-3 text-sm text-slate-400">
                Similar a cookies, mas armazenado no navegador e usado para:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
                <li>
                  Preferências do Filtro de Afinidade (
                  <code className="text-slate-300">curriculo_politico_affinity</code>
                  )
                </li>
              </ul>
              <p className="mt-2 text-xs italic text-slate-500">
                Pode ser limpo a qualquer momento pelas configurações do
                navegador, sem afetar o login.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            3. Cookies que NÃO Utilizamos
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-400">
            <li>
              Cookies de rastreamento de terceiros (Google Analytics, Facebook
              Pixel)
            </li>
            <li>Cookies de publicidade comportamental</li>
            <li>Cookies de redes sociais para rastreamento</li>
            <li>Pixel de conversão ou fingerprinting</li>
          </ul>
          <p className="mt-3 text-sm text-slate-400">
            A plataforma não incorpora scripts de terceiros de rastreamento.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            4. Como Gerenciar Cookies
          </h2>
          <p className="mb-3 leading-relaxed text-slate-400">
            Você pode controlar cookies pelas configurações do seu navegador:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-400">
            <li>
              <strong>Chrome:</strong> Configurações → Privacidade e segurança →
              Cookies
            </li>
            <li>
              <strong>Firefox:</strong> Opções → Privacidade e Segurança
            </li>
            <li>
              <strong>Safari:</strong> Preferências → Privacidade
            </li>
            <li>
              <strong>Edge:</strong> Configurações → Cookies e permissões do site
            </li>
          </ul>
          <p className="mt-3 text-sm text-slate-400">
            <strong className="text-amber-300">Atenção:</strong> desativar
            cookies essenciais impedirá o login e o uso de funcionalidades
            personalizadas (votação em projetos).
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold text-slate-100">
            5. Atualizações desta Política
          </h2>
          <p className="leading-relaxed text-slate-400">
            Podemos atualizar esta política periodicamente. A data da última
            atualização está indicada no topo da página. Mudanças significativas
            serão comunicadas via aviso no site ou email (para usuários
            cadastrados).
          </p>
        </section>

        <p className="border-t border-slate-800 pt-6 text-sm text-slate-400">
          Dúvidas sobre cookies ou privacidade:{" "}
          <Link href="/contato" className="text-sky-400 hover:underline">
            nossa página de contato
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
