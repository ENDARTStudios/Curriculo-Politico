"use client";

import { useEffect, useState } from "react";

const TOPICS = [
  { id: "saude", label: "🏥 Saúde", desc: "SUS, hospitais, medicamentos" },
  { id: "educacao", label: "📚 Educação", desc: "Escolas, universidades, professores" },
  { id: "seguranca", label: "🚔 Segurança", desc: "Polícia, combate ao crime" },
  { id: "economia", label: "💰 Economia", desc: "Impostos, fiscal, orçamento" },
  { id: "privatizacao", label: "🏭 Privatizações", desc: "Concessões, desestatização" },
  { id: "meio_ambiente", label: "🌱 Meio Ambiente", desc: "Clima, energia, Amazônia" },
  { id: "direitos_sociais", label: "👥 Direitos Sociais", desc: "Trabalho, previdência" },
  { id: "costumes", label: "🏛️ Costumes", desc: "Família, cultura, identidade" },
];

const STORAGE_KEY = "curriculo_politico_affinity";

interface AffinityState {
  topics: string[];
  position: Record<string, "FAVOR" | "CONTRA">;
}

export function AffinityFilter() {
  const [affinity, setAffinity] = useState<AffinityState>({ topics: [], position: {} });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setAffinity(JSON.parse(saved));
      } catch {
        // storage corrompido: ignora
      }
    }
  }, []);

  const toggleTopic = (topicId: string) => {
    setAffinity((prev) => {
      const topics = prev.topics.includes(topicId)
        ? prev.topics.filter((t) => t !== topicId)
        : [...prev.topics, topicId];
      const position = { ...prev.position };
      if (!prev.topics.includes(topicId)) delete position[topicId];
      return { topics, position };
    });
  };

  const setPosition = (topicId: string, pos: "FAVOR" | "CONTRA") => {
    setAffinity((prev) => ({
      ...prev,
      position: { ...prev.position, [topicId]: pos },
    }));
  };

  const gerar = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(affinity));
    const params = new URLSearchParams();
    params.set("topics", affinity.topics.join(","));
    for (const [topic, pos] of Object.entries(affinity.position)) {
      params.append("pos", `${topic}:${pos}`);
    }
    window.location.href = `/ranking/personalizado?${params.toString()}`;
  };

  const limpar = () => {
    setAffinity({ topics: [], position: {} });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-2 text-xl font-bold text-slate-100">
        Meu Ranking Personalizado
      </h2>
      <p className="mb-4 text-sm text-slate-400">
        Selecione os temas que mais importam para você e sua posição. O ranking
        mostra os parlamentares por <strong>autorias reais</strong> nesses
        temas. Suas preferências ficam apenas no seu navegador.
      </p>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {TOPICS.map((topic) => {
          const isSelected = affinity.topics.includes(topic.id);
          const position = affinity.position[topic.id];
          return (
            <div
              key={topic.id}
              className={`rounded-lg border p-3 transition ${
                isSelected
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            >
              <button
                onClick={() => toggleTopic(topic.id)}
                className="mb-1 flex w-full items-center gap-2 text-left"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                    isSelected
                      ? "border-sky-500 bg-sky-500 text-slate-950"
                      : "border-slate-600"
                  }`}
                >
                  {isSelected && "✓"}
                </span>
                <span className="font-medium text-slate-100">{topic.label}</span>
              </button>
              <div className="mb-2 text-xs text-slate-500">{topic.desc}</div>
              {isSelected && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPosition(topic.id, "FAVOR")}
                    className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
                      position === "FAVOR"
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    👍 Apoio
                  </button>
                  <button
                    onClick={() => setPosition(topic.id, "CONTRA")}
                    className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
                      position === "CONTRA"
                        ? "bg-red-500 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    👎 Me oponho
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={gerar}
          disabled={affinity.topics.length === 0}
          className="flex-1 rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Gerar Meu Ranking
        </button>
        <button
          onClick={limpar}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          Limpar
        </button>
      </div>

      <p className="mt-3 text-xs italic text-slate-500">
        Suas preferências são salvas apenas no seu navegador.{" "}
        <strong className="text-slate-400">
          Nunca alteram a nota factual (IDIP) dos políticos.
        </strong>
      </p>
    </div>
  );
}
