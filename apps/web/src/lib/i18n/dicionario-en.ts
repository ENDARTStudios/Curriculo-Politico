import type { ChaveDicionario } from "./dicionarios";

/**
 * Inglês (en-US).
 *
 * ── Decisões de tradução ───────────────────────────────────────────────────
 * "Currículo Político" é o nome do produto e **não é traduzido**: nome próprio
 * não se traduz, e "Political Résumé" sugeriria um produto diferente.
 *
 * Termos de domínio que ganham tradução funcional, não literal:
 * - "Termômetro de Confiabilidade" → "Reliability Thermometer" (o conceito é uma
 *   escala de risco; "thermometer" preserva a metáfora visual do componente)
 * - "nota" (do IDIP) → "score"
 * - "proposição" → "bill" (é o termo usado no Congresso dos EUA e o mais próximo;
 *   "proposition" em inglês não carrega o sentido legislativo)
 * - "retificação" → "correction request"
 * - "acompanhar" → "follow" (o verbo de produto, não "accompany")
 *
 * Onde o português usa "você" e o espanhol varia entre "tú"/"usted", o inglês
 * usa a segunda pessoa direta ("you"), que é o padrão de produto.
 */
export const enUS: Record<ChaveDicionario, string> = {
  "nav.ranking": "Ranking",
  "nav.ranking.idip": "IDIP Ranking",
  "nav.ranking.idip.desc": "Those with confidence above 60, highest to lowest",
  "nav.ranking.personalizado": "Personalized ranking",
  "nav.ranking.personalizado.desc": "Weighs the issues that matter to you",
  "nav.ranking.espectro": "My Spectrum",
  "nav.ranking.espectro.desc": "Answer and see where you stand",
  "nav.ranking.stf": "Supreme Federal Court",
  "nav.ranking.stf.desc": "A separate index for the justices",
  "nav.partidos": "Parties",
  "nav.partidos.todos": "All parties",
  "nav.partidos.todos.desc": "Average, Thermometer distribution and caucus size",
  "nav.partidos.comparar": "Compare parties",
  "nav.partidos.comparar.desc": "Two parties side by side",
  "nav.projetos": "Bills",
  "nav.comparar": "Compare",
  "nav.metodologia": "Methodology",
  "nav.metodologia.idip": "The IDIP index",
  "nav.metodologia.idip.desc": "Formula, weights and what each dimension measures",
  "nav.metodologia.como": "How Brazilian politics works",
  "nav.metodologia.como.desc": "The three branches and the electoral ladder",
  "nav.metodologia.historia": "History",
  "nav.metodologia.historia.desc": "How the index evolved, version by version",
  "nav.metodologia.calendario": "Election calendar",
  "nav.metodologia.calendario.desc": "Upcoming elections and the offices at stake",
  "nav.metodologia.faq": "Frequently asked questions",
  "nav.metodologia.faq.desc": "Questions about scores, data and neutrality",
  "nav.metodologia.sobre": "About the project",
  "nav.metodologia.sobre.desc": "Who maintains it, with what money and why",
  "nav.principal": "Main navigation",
  "nav.abrirMenu": "Open menu",
  "nav.fecharMenu": "Close menu",
  "nav.marca": "Currículo Político — home page",

  "conta.entrar": "Sign in",
  "conta.minhaConta": "My account",
  "conta.dashboard": "My area",
  "conta.sair": "Sign out",

  "rodape.explorar": "Explore",
  "rodape.entender": "Understand",
  "rodape.projeto": "Project",
  "rodape.juridico": "Legal",
  "rodape.descricao":
    "A score from 0 to 100 for every legislator and officeholder, computed only from auditable public data.",
  "rodape.codigoAberto": "Open source · AGPL-3.0",
  "rodape.licenca": "Code under AGPL-3.0 · Documentation under CC BY 4.0",
  "rodape.fontes":
    "Sources: Chamber of Deputies, Federal Senate and TSE. No popular vote: scores derive exclusively from auditable public data.",
  "rodape.status": "Status",
  "rodape.apoie": "Support the project",
  "rodape.contato": "Contact",
  "rodape.retificacao": "Correction request",
  "rodape.termos": "Terms of use",
  "rodape.privacidade": "Privacy",
  "rodape.lgpd": "LGPD",
  "rodape.cookies": "Cookies",

  "idioma.rotulo": "Language",
  "idioma.trocar": "Change language",
  "idioma.parcial":
    "The interface is in English. Legal and editorial pages remain in Portuguese until reviewed by a translator.",

  "home.olho": "Before you vote, check what they did",
  "home.titulo1": "A campaign does not reveal the candidate.",
  "home.titulo2": "Their record does.",
  "home.lead":
    "A score from 0 to 100 for every legislator and officeholder, computed only from auditable public data: how they voted, what they proposed, whether they showed up and how much they cost. No polls, no opinion, no popular vote.",
  "home.busca.dica": "Search by name, party or topic. Or see the full ranking.",
  "home.cta": "See the ranking",
  "home.ctaCompleto": "See the full ranking",
  "home.comoCalculada": "How the score is computed",
  "home.selo": "Open source · AGPL-3.0",
  "home.metodologia": "IDIP methodology {versao}, public and versioned.",
  "home.avaliados": "{n} assessed",
  "home.termometro.titulo": "A high score is not enough: there is risk",
  "home.termometro.lead":
    "The score measures performance. The Reliability Thermometer measures risk and transparency, and always appears next to it. The integrity cap is automatic, not editorial.",
  "home.termometro.link": "Full methodology",
  "home.caminhos.titulo": "Where to start",
  "home.caminho1.titulo": "See who is at the top",
  "home.caminho1.texto":
    "The politicians with enough confidence to enter the ranking, highest to lowest.",
  "home.caminho1.rotulo": "IDIP Ranking",
  "home.caminho2.titulo": "Put two side by side",
  "home.caminho2.texto":
    "Score, dimensions, votes and campaign finance for two candidates on one screen.",
  "home.caminho2.rotulo": "Compare",
  "home.caminho3.titulo": "Find your spectrum",
  "home.caminho3.texto":
    "Answer on the issues that matter and see which politicians are closest.",
  "home.caminho3.rotulo": "My Spectrum",
  "home.caminho.abrir": "Open",
  "home.fecho.titulo": "Check who represents you",
  "home.fecho.texto":
    "It takes less than a minute. If a score looks wrong, the calculation is open and there is a correction channel with a trackable protocol.",
  "home.fecho.cta": "Start with the ranking",
  "home.fecho.retificacao": "Request a correction",

  "seguir.seguir": "Follow",
  "seguir.seguindo": "Following",
  "seguir.deixar": "Unfollow",
  "seguir.entrarPara": "Sign in to follow",
  "seguir.erro": "Could not update right now.",
  "seguir.politico": "politician",
  "seguir.partido": "party",
  "seguir.projeto": "bill",
  "acompanhamentos.titulo": "What you follow",
  "acompanhamentos.politicos": "Politicians",
  "acompanhamentos.partidos": "Parties",
  "acompanhamentos.projetos": "Bills",
  "acompanhamentos.vazio":
    "You are not following anything yet. Open a politician's profile, a party page or a bill and use the Follow button.",
  "acompanhamentos.irParaRanking": "See the ranking",
  "acompanhamentos.contagem": "{n} following",

  "espectro.salvar": "Save result",
  "espectro.salvo": "Result saved to your area",
  "espectro.baixar": "Download",
  "espectro.compartilhar": "Share",
  "espectro.copiado": "Link copied",
  "espectro.entrarParaSalvar": "Sign in to save your result",
  "espectro.erroSalvar": "Could not save the result right now.",
  "espectro.ultimoResultado": "Your latest result",
  "espectro.refazer": "Retake the test",
  "espectro.versao": "Questionnaire version: {versao}",

  "juridico.investigacao": "Ongoing investigation",
  "juridico.acaoJudicial": "Ongoing lawsuit",
  "juridico.condenacao": "Final conviction (no further appeal)",
  "juridico.impeachment": "Impeachment",
  "juridico.arquivado": "Dismissed or acquitted",
  "juridico.contasRejeitadas": "Accounts rejected by the TCU",
  "juridico.reuAcaoPenal": "Defendant in a criminal case",
  "juridico.statusAtivo": "in progress",
  "juridico.statusArquivado": "closed without conviction",
  "juridico.statusDefinitivo": "no pending appeal",

  "novidades.titulo": "What changed since your last visit",
  "novidades.desde": "Since {data}",
  "novidades.primeiraVisita": "You have not marked anything as seen yet — showing the available history.",
  "novidades.vazio": "No changes recorded since then in the entities you follow.",
  "novidades.semAcompanhamento": "Follow a politician to see here when their score changes.",
  "novidades.marcar": "Mark as seen",
  "novidades.marcado": "Marked as seen",
  "novidades.score": "Score",
  "novidades.status": "Reliability",
  "novidades.cobertura": "Only scores and reliability generate history today. Campaign finance and legal records do not have a historical series yet.",

  "comum.carregando": "Loading content…",
  "comum.erro.titulo": "We could not load this page",
  "comum.erro.lead":
    "The database query did not respond. This is usually temporary — the score has not changed, the access failed.",
  "comum.erro.olho": "Failed to load",
  "comum.erro.tentar": "Try again",
  "comum.erro.status": "See platform status",
  "comum.naoEncontrado.titulo": "This page does not exist",
  "comum.naoEncontrado.lead":
    "The address does not match any page on the platform. It may be an old link, a removed record or a half-typed address. No data was lost — the scores are still online and the methodology remains open for consultation.",
  "comum.naoEncontrado.cta": "See the full ranking",
  "comum.naoEncontrado.home": "Go to the home page",
};
