import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import Link from "next/link";
import { CONTATO, mailto } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Apoie o Currículo Político",
  description:
    "O Currículo Político é 100% gratuito e open source. Apoie com Pix, GitHub Sponsors, código ou divulgação.",
};

export default function ApoiePage() {
  const pixKey = process.env.NEXT_PUBLIC_PIX_KEY;
  const sponsorsUrl = process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <CabecalhoPagina
        titulo="Apoie o Currículo Político"
        lead={
          <>
            Somos um projeto 100% gratuito e open source. Sua ajuda mantém a
            transparência política acessível a todos.
          </>
        }
      />

      {/*
        Só aparece o canal que existe.

        Antes, sem `NEXT_PUBLIC_PIX_KEY` configurada, o card do Pix continuava na
        tela anunciando "Doação via Pix" e, no lugar da chave, exibia
        **"Chave em configuração"** em itálico. Uma página de doação que oferece um
        meio de pagamento que não recebe nada é pior que uma que não o oferece: a
        pessoa tenta doar e não consegue, e a confiança cai no ponto em que ela
        estava mais disposta a ajudar.

        É a mesma regra da faixa de prova da home, que some quando o banco está
        vazio em vez de mostrar zero.
      */}
      {(pixKey || sponsorsUrl) && (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {pixKey && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-3 text-3xl">💰</div>
              <h2 className="mb-2 text-xl font-bold text-slate-100">
                Doação via Pix
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-slate-400">
                Qualquer valor ajuda a manter os servidores e APIs funcionando.
              </p>
              <div className="rounded-lg bg-slate-800/60 p-4 text-center">
                <p className="mb-2 text-xs text-slate-400">Chave Pix (CNPJ)</p>
                <p className="font-mono text-lg font-bold text-slate-50">{pixKey}</p>
              </div>
            </div>
          )}

          {sponsorsUrl && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-3 text-3xl">⭐</div>
              <h2 className="mb-2 text-xl font-bold text-slate-100">
                GitHub Sponsors
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-slate-400">
                Apoie mensalmente e receba reconhecimento como patrocinador.
              </p>
              <a
                href={sponsorsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full rounded-lg bg-sky-500 px-4 py-2 text-center font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Patrocinar no GitHub
              </a>
            </div>
          )}
        </div>
      )}

      {/*
        Sem canal de pagamento ativo, a página não fica vazia nem finge: diz o que
        está acontecendo e oferece as formas que existem hoje — código, divulgação
        e relato de erro não dependem de configuração nenhuma.
      */}
      {!pixKey && !sponsorsUrl && (
        <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold text-slate-100">
            Doações ainda não estão abertas
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-slate-400">
            Os canais de contribuição financeira estão em configuração. Enquanto
            isso, as formas abaixo ajudam do mesmo jeito — e algumas ajudam mais.
          </p>
          <a
            href="https://github.com/ENDARTStudios/Curriculo-Politico"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Ver o repositório no GitHub
          </a>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="mb-4 text-xl font-bold text-slate-100">
          Outras Formas de Apoiar
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-800/60 p-4">
            <div className="mb-2 text-2xl">🔧</div>
            <h4 className="font-semibold text-slate-100">
              Contribuir com Código
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Somos open source. Veja o{" "}
              <a
                href="https://github.com/ENDARTStudios/Curriculo-Politico/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline"
              >
                guia de contribuição
              </a>
              .
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-4">
            <div className="mb-2 text-2xl">📢</div>
            <h4 className="font-semibold text-slate-100">Divulgar</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Compartilhe o site nas redes sociais e com amigos.
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-4">
            <div className="mb-2 text-2xl">🐛</div>
            <h4 className="font-semibold text-slate-100">Reportar Erros</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Encontrou dados incorretos?{" "}
              <Link href="/retificacao" className="text-sky-400 hover:underline">
                Avise-nos
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-sky-500/30 bg-sky-500/5 p-6">
        <h3 className="mb-2 font-semibold text-slate-100">💎 Transparência Total</h3>
        <p className="mb-3 text-sm leading-relaxed text-slate-400">
          Todo o dinheiro arrecadado é usado exclusivamente para:
        </p>
        <ul className="space-y-1 text-sm text-slate-400">
          <li>• Servidores e infraestrutura (Vercel, Supabase, Cloudflare)</li>
          <li>• APIs de dados e serviços de coleta</li>
          <li>• Revisão jurídica e contábil</li>
          <li>• Ferramentas de desenvolvimento</li>
        </ul>
        <p className="mt-3 text-xs italic text-slate-400">
          A prestação de contas pública será publicada nesta página conforme o
          projeto receber doações.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Doação não é compra de serviço: não há contrapartida, vantagem ou
          influência sobre notas, rankings ou conteúdo editorial. Desistiu ou
          doou por engano? Escreva para{" "}
          <a href={mailto(CONTATO.reembolso)} className="text-sky-400 hover:underline">
            {CONTATO.reembolso}
          </a>{" "}
          dentro de 7 dias — o reembolso integral é feito sem exigência de
          justificativa.
        </p>
      </div>
    </main>
  );
}
