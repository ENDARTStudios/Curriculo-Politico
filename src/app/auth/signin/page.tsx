"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SigninPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "registrar">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        router.push("/");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none";

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">
        {modo === "login" ? "Entrar" : "Criar conta"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Contas são gratuitas e servem para a votação popular em projetos
        (camada de engajamento —{" "}
        <strong className="text-slate-200">
          nunca altera a nota IDIP
        </strong>
        ). Contas novas ficam 24h sem votar (proteção anti-bot).
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
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
          className="w-full rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
        >
          {loading ? "..." : modo === "login" ? "Entrar" : "Criar conta e entrar"}
        </button>
      </form>

      <button
        onClick={() => {
          setModo(modo === "login" ? "registrar" : "login");
          setErro(null);
        }}
        className="mt-6 text-sm text-sky-400 hover:underline"
      >
        {modo === "login"
          ? "Não tem conta? Criar uma"
          : "Já tem conta? Entrar"}
      </button>
    </main>
  );
}
