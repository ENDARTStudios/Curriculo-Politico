"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SigninPage() {
  const [modo, setModo] = useState<"login" | "registrar">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const googleDisponivel = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      if (modo === "registrar") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: senha, name: nome }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErro(data.message ?? data.error ?? "Erro ao criar conta");
          setLoading(false);
          return;
        }
      }
      const res = await signIn("credentials", {
        email,
        password: senha,
        redirect: false,
      });
      if (res?.error) {
        setErro("Email ou senha inválidos.");
      } else {
        window.location.href = "/";
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none";

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-100">
          {modo === "login" ? "Entrar no Currículo Político" : "Criar sua conta"}
        </h1>

        {googleDisponivel && (
          <>
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 transition hover:bg-slate-700"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium text-slate-200">Continuar com Google</span>
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-slate-900 px-2 text-slate-500">ou</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-4">
          {modo === "registrar" && (
            <div>
              <label htmlFor="nome" className="mb-1 block text-sm font-medium text-slate-300">
                Nome (opcional)
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-slate-300">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={inputClass}
            />
            {modo === "registrar" && (
              <p className="mt-1 text-xs text-slate-500">Mínimo de 8 caracteres.</p>
            )}
          </div>

          {erro && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
          >
            {loading ? "..." : modo === "login" ? "Entrar" : "Criar conta e entrar"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {modo === "login" ? (
            <>
              Não tem conta?{" "}
              <button
                onClick={() => {
                  setModo("registrar");
                  setErro(null);
                }}
                className="text-sky-400 hover:underline"
              >
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button
                onClick={() => {
                  setModo("login");
                  setErro(null);
                }}
                className="text-sky-400 hover:underline"
              >
                Entrar
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
        Ao entrar, você concorda com nossos{" "}
        <Link href="/termos-de-uso" className="underline hover:text-slate-300">
          Termos de Uso
        </Link>{" "}
        e{" "}
        <Link href="/privacidade" className="underline hover:text-slate-300">
          Política de Privacidade
        </Link>
        . Contas novas ficam 24h sem votar (proteção anti-bot). A votação popular
        nunca altera a nota IDIP.
      </p>
    </main>
  );
}
