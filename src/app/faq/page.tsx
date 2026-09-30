"use client";

import { useState } from "react";
import Link from "next/link";

interface FAQ {
  pergunta: string;
  resposta: React.ReactNode;
}

const FAQS: FAQ[] = [
  {
    pergunta: "O que é o Currículo Político?",
    resposta: (
      <p>
        É uma plataforma open source que agrega dados públicos de políticos
        brasileiros (deputados, senadores, governadores etc.) e calcula uma
        pontuação objetiva baseada em desempenho, integridade, transparência e
        produtividade. O objetivo é fornecer ao eleitor um currículo auditável
        de cada representante.
      </p>
    ),
  },
  {
    pergunta: "De onde vêm os dados?",
    resposta: (
      <p>
        Exclusivamente de fontes oficiais: TSE (Tribunal Superior Eleitoral),
        Câmara dos Deputados, Senado Federal, Portais da Transparência,
        Tribunais de Contas e Diários Oficiais. Nenhum dado é inventado ou
        opinativo — tudo possui link para a fonte original.
      </p>
    ),
  },
  {
    pergunta: "Como a nota de 0 a 100 é calculada?",
    resposta: (
      <>
        <p className="mb-2">
          A nota é calculada pelo <strong>IDIP</strong> (Índice de Desempenho e
          Integridade Pública), um algoritmo aberto que pondera dimensões como:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Integridade jurídica (condenações, inelegibilidades)</li>
          <li>Produtividade legislativa ou entrega de governo</li>
          <li>Transparência de gastos e prestações de contas</li>
          <li>Assiduidade e presença</li>
          <li>Eficiência no uso de recursos públicos</li>
        </ul>
        <p className="mt-2">
          Veja a fórmula completa em{" "}
          <Link href="/metodologia" className="text-sky-400 hover:underline">
            /metodologia
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    pergunta: "O site tem viés ideológico (esquerda ou direita)?",
    resposta: (
      <p>
        Por desenho metodológico, o algoritmo <strong>não avalia o conteúdo
        ideológico</strong> de um voto ou projeto: um político que vota a favor
        ou contra uma pauta recebe o mesmo tratamento técnico. A pontuação
        reflete atividade, integridade e transparência — não opinião política.
        Pesos e fórmulas são públicos e auditáveis em{" "}
        <strong>/metodologia</strong>, e as dimensões ainda sem dados usam
        baseline neutro, claramente identificado. Isso é uma característica
        verificável da metodologia aberta — não uma promessa de neutralidade
        absoluta.
      </p>
    ),
  },
  {
    pergunta: "Posso confiar na nota?",
    resposta: (
      <p>
        Cada nota possui um <strong>detalhamento completo</strong> mostrando
        qual dado gerou cada ponto, com link para a fonte oficial e data de
        coleta. Você pode auditar qualquer político item por item. Se um dado
        oficial for atualizado, o score é recalculado automaticamente.
      </p>
    ),
  },
  {
    pergunta: "Um político pode pedir a remoção do perfil?",
    resposta: (
      <p>
        <strong>Não.</strong> Agentes públicos possuem esfera de privacidade
        reduzida (jurisprudência do STF). Os dados exibidos são públicos por
        força de lei (Lei 12.527/2011) e de interesse coletivo. Porém, se
        houver erro factual (ex: um processo arquivado ainda constando como
        ativo), o político pode solicitar correção em{" "}
        <Link href="/retificacao" className="text-sky-400 hover:underline">
          /retificacao
        </Link>
        .
      </p>
    ),
  },
  {
    pergunta: 'Por que alguns políticos aparecem como "Dados Insuficientes"?',
    resposta: (
      <p>
        São políticos cujas fontes oficiais não disponibilizam dados
        suficientes para cálculo confiável (completude abaixo de 60%). Eles
        ficam em status <strong>⚪ GRAY</strong> e{" "}
        <strong>não entram no ranking</strong> para não distorcer a
        classificação. É um sinal honesto de falta de dados, não uma avaliação
        negativa.
      </p>
    ),
  },
  {
    pergunta: "Posso votar nos políticos pelo site?",
    resposta: (
      <p>
        <strong>Não na nota principal.</strong> O IDIP é calculado apenas por
        dados oficiais, sem interferência de votos populares, robôs ou
        campanhas. Porém, oferecemos votação em projetos de lei como camada
        separada de engajamento — esses votos{" "}
        <strong>nunca alteram a nota factual</strong> do político.
      </p>
    ),
  },
  {
    pergunta: "O site é gratuito mesmo? Qual o modelo de negócio?",
    resposta: (
      <p>
        100% gratuito e open source. Não há anúncios, paywall ou venda de
        dados. O projeto é mantido por doações voluntárias e pelo trabalho de
        colaboradores voluntários. Todo o código está disponível publicamente.
      </p>
    ),
  },
  {
    pergunta: "Como posso contribuir com o projeto?",
    resposta: (
      <>
        <p className="mb-2">Existem várias formas:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Acessando e compartilhando o site</li>
          <li>Reportando dados incorretos</li>
          <li>Contribuindo com código (somos open source)</li>
          <li>Revisando a qualidade dos dados agregados</li>
          <li>Sugerindo novas fontes oficiais</li>
        </ul>
      </>
    ),
  },
  {
    pergunta: "E sobre a segurança? Políticos podem tentar derrubar o site?",
    resposta: (
      <p>
        O site é protegido por WAF (Web Application Firewall), mitigação de
        DDoS, e está hospedado em jurisdições com forte proteção à liberdade de
        expressão. Os dados são imutáveis e versionados — mesmo se o site cair,
        o histórico está preservado. Além disso, tudo é open source: qualquer
        pessoa pode hospedar uma cópia.
      </p>
    ),
  },
  {
    pergunta: "O site respeita a LGPD?",
    resposta: (
      <p>
        <strong>Sim.</strong> Tratamos apenas dados tornados manifestamente
        públicos (Art. 7º, §7º da LGPD), com finalidade de controle social e
        interesse público. Nunca exibimos CPF, endereço, telefone ou dados de
        familiares. Veja detalhes em{" "}
        <Link href="/privacidade" className="text-sky-400 hover:underline">
          /privacidade
        </Link>
        .
      </p>
    ),
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-slate-100">
        Perguntas Frequentes
      </h1>
      <p className="mt-3 text-xl text-slate-400">
        Tudo o que você precisa saber sobre o Currículo Político.
      </p>

      <div className="mt-10 space-y-3">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-800/40"
            >
              <span className="font-semibold text-slate-100">{faq.pergunta}</span>
              <span className="flex-shrink-0 text-xl text-sky-400">
                {openIndex === i ? "−" : "+"}
              </span>
            </button>
            {openIndex === i && (
              <div className="border-t border-slate-800 px-5 pb-5 pt-4 text-sm leading-relaxed text-slate-400">
                {faq.resposta}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-sky-500/30 bg-sky-500/5 p-6">
        <h3 className="mb-2 font-semibold text-slate-100">
          💬 Não encontrou sua resposta?
        </h3>
        <p className="mb-3 text-sm text-slate-400">
          Abra uma issue no repositório do GitHub ou use o canal de retificação
          para questões de dados.
        </p>
        <Link
          href="/retificacao"
          className="inline-block rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
        >
          Fale Conosco
        </Link>
      </div>
    </main>
  );
}
