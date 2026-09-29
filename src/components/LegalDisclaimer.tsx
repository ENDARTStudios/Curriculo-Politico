export function LegalDisclaimer() {
  return (
    <div className="my-8 rounded-r-lg border-l-4 border-sky-500 bg-slate-900/60 p-4">
      <h3 className="mb-2 font-bold text-slate-100">
        Transparência e Auditabilidade
      </h3>
      <p className="text-sm leading-relaxed text-slate-400">
        O Radar Cívico é uma ferramenta de verificação de fatos. Todos os dados
        são extraídos de fontes públicas oficiais (TSE, Câmara, Senado, TCU) e a
        pontuação é baseada estritamente em desempenho funcional e integridade,
        sem viés ideológico ou intenção de difamação. Cada nota possui
        detalhamento auditável. Políticos podem solicitar{" "}
        <a href="/retificacao" className="text-sky-400 hover:underline">
          retificação de dados
        </a>{" "}
        através dos canais oficiais.
      </p>
    </div>
  );
}
