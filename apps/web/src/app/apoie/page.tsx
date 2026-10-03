import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Apoie o Currículo Político",
  description:
    "O Currículo Político é 100% gratuito e open source. Apoie com Pix, GitHub Sponsors, código ou divulgação.",
};

export default function ApoiePage() {
  const pixKey = process.env.NEXT_PUBLIC_PIX_KEY;
  const sponsorsUrl = process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Apoie o Currículo Político
      </h1>
      <p className="mt-3 max-w-2xl text-xl leading-relaxed text-slate-400">
        Somos um projeto 100% gratuito e open source. Sua ajuda mantém a
        transparência política acessível a todos.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-3 text-3xl">💰</div>
          <h3 className="mb-2 text-xl font-bold text-slate-100">Doação via Pix</h3>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Qualquer valor ajuda a manter os servidores e APIs funcionando.
          </p>
          <div className="rounded-lg bg-slate-800/60 p-4 text-center">
            <p className="mb-2 text-xs text-slate-500">Chave Pix (CNPJ):</p>
            {pixKey ? (
              <p className="font-mono text-lg font-bold text-slate-100">{pixKey}</p>
            ) : (
              <p className="text-sm italic text-slate-500">
                Chave em configuração
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-3 text-3xl">⭐</div>
          <h3 className="mb-2 text-xl font-bold text-slate-100">
            GitHub Sponsors
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Apoie mensalmente e receba reconhecimento como patrocinador.
          </p>
          {sponsorsUrl ? (
            <a
              href={sponsorsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full rounded-lg bg-slate-800 px-4 py-2 text-center text-white transition hover:bg-slate-700"
            >
              Patrocinar no GitHub
            </a>
          ) : (
            <a
              href="https://github.com/ENDARTStudios/Curriculo-Politico"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full rounded-lg border border-slate-700 px-4 py-2 text-center text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Ver repositório no GitHub
            </a>
          )}
        </div>
      </div>

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
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
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
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Compartilhe o site nas redes sociais e com amigos.
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-4">
            <div className="mb-2 text-2xl">🐛</div>
            <h4 className="font-semibold text-slate-100">Reportar Erros</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
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
        <p className="mt-3 text-xs italic text-slate-500">
          A prestação de contas pública será publicada nesta página conforme o
          projeto receber doações.
        </p>
      </div>
    </main>
  );
}
