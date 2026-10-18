import { LOCALE_PADRAO, type Locale } from "./config";
import { enUS } from "./dicionario-en";

/**
 * Dicionários da interface.
 *
 * ── Por que chaves planas com ponto ────────────────────────────────────────
 * Uma chave plana (`home.hero.titulo1`) é fácil de conferir por script contra
 * todos os idiomas, e o guard `verify:i18n` faz exatamente isso: acusa chave
 * faltando ou sobrando. Estrutura aninhada esconde a diferença até o momento em
 * que a tela mostra a chave crua para o usuário.
 *
 * ── O que está traduzido, e o que não está ─────────────────────────────────
 * Traduzido: moldura (header, rodapé, navegação), home, área da conta e dashboard,
 * acompanhamentos, espectro e os estados de sistema.
 *
 * **Não traduzido**: as páginas de conteúdo jurídico e editorial (termos,
 * privacidade, LGPD, cookies, FAQ, metodologia, história, como funciona). Elas
 * são texto longo em português e traduzi-las exige revisão humana, não
 * substituição de rótulo. Um aviso na própria página informa isso — melhor que
 * fingir que o site está inteiro em espanhol.
 */

export type ChaveDicionario = keyof typeof ptBR;

const ptBR = {
  // ── Navegação ────────────────────────────────────────────────────────────
  "nav.ranking": "Ranking",
  "nav.ranking.idip": "Ranking IDIP",
  "nav.ranking.idip.desc": "Quem tem confiança acima de 60, do maior para o menor",
  "nav.ranking.personalizado": "Ranking personalizado",
  "nav.ranking.personalizado.desc": "Pondera os temas que importam para você",
  "nav.ranking.espectro": "Meu Espectro",
  "nav.ranking.espectro.desc": "Responda e veja seu posicionamento",
  "nav.ranking.stf": "Supremo Tribunal Federal",
  "nav.ranking.stf.desc": "Índice próprio para os ministros",
  "nav.partidos": "Partidos",
  "nav.partidos.todos": "Todos os partidos",
  "nav.partidos.todos.desc": "Média, distribuição do Termômetro e bancada",
  "nav.partidos.comparar": "Comparar partidos",
  "nav.partidos.comparar.desc": "Duas agremiações lado a lado",
  "nav.projetos": "Projetos",
  "nav.comparar": "Comparar",
  "nav.metodologia": "Metodologia",
  "nav.metodologia.idip": "O índice IDIP",
  "nav.metodologia.idip.desc": "Fórmula, pesos e o que cada dimensão mede",
  "nav.metodologia.como": "Como funciona a política",
  "nav.metodologia.como.desc": "Os três poderes e a hierarquia eleitoral",
  "nav.metodologia.historia": "História",
  "nav.metodologia.historia.desc": "Como o índice evoluiu, versão por versão",
  "nav.metodologia.calendario": "Calendário eleitoral",
  "nav.metodologia.calendario.desc": "Próximas eleições e cargos em disputa",
  "nav.metodologia.faq": "Perguntas frequentes",
  "nav.metodologia.faq.desc": "Dúvidas sobre nota, dados e neutralidade",
  "nav.metodologia.sobre": "Sobre o projeto",
  "nav.metodologia.sobre.desc": "Quem mantém, com que dinheiro e por quê",
  "nav.principal": "Navegação principal",
  "nav.abrirMenu": "Abrir menu",
  "nav.fecharMenu": "Fechar menu",
  "nav.marca": "Currículo Político — página inicial",

  // ── Conta ────────────────────────────────────────────────────────────────
  "conta.entrar": "Entrar",
  "conta.minhaConta": "Minha conta",
  "conta.dashboard": "Minha área",
  "conta.sair": "Sair",

  // ── Rodapé ───────────────────────────────────────────────────────────────
  "rodape.explorar": "Explorar",
  "rodape.entender": "Entender",
  "rodape.projeto": "Projeto",
  "rodape.juridico": "Jurídico",
  "rodape.descricao":
    "Nota de 0 a 100 para cada parlamentar e governante, calculada só com dado público auditável.",
  "rodape.codigoAberto": "Código aberto · AGPL-3.0",
  "rodape.licenca": "Código sob AGPL-3.0 · Documentação sob CC BY 4.0",
  "rodape.fontes":
    "Fontes: Câmara dos Deputados, Senado Federal e TSE. Sem voto popular: as notas derivam exclusivamente de dados públicos auditáveis.",
  "rodape.status": "Status",
  "rodape.apoie": "Apoie o projeto",
  "rodape.contato": "Contato",
  "rodape.retificacao": "Retificação",
  "rodape.termos": "Termos de uso",
  "rodape.privacidade": "Privacidade",
  "rodape.lgpd": "LGPD",
  "rodape.cookies": "Cookies",

  // ── Idioma ───────────────────────────────────────────────────────────────
  "idioma.rotulo": "Idioma",
  "idioma.trocar": "Mudar idioma",
  "idioma.parcial":
    "A interface está em espanhol. As páginas de conteúdo jurídico e editorial seguem em português até serem revisadas por um tradutor.",

  // ── Home ─────────────────────────────────────────────────────────────────
  "home.olho": "Antes de votar, confira o que ele fez",
  "home.titulo1": "Uma campanha não revela o candidato.",
  "home.titulo2": "O currículo dele sim.",
  "home.lead":
    "Uma nota de 0 a 100 por parlamentar e governante, calculada só com dado público auditável: como votou, o que propôs, se apareceu e quanto custou. Sem enquete, sem opinião, sem voto popular.",
  "home.busca.dica":
    "Busque por nome, partido ou tema. Ou veja o ranking completo.",
  "home.cta": "Ver o ranking",
  "home.ctaCompleto": "Ver o ranking completo",
  "home.comoCalculada": "Como a nota é calculada",
  "home.selo": "Código aberto · AGPL-3.0",
  "home.metodologia": "Metodologia IDIP {versao}, pública e versionada.",
  "home.avaliados": "{n} avaliados",
  "home.termometro.titulo": "Nota alta não basta: existe o risco",
  "home.termometro.lead":
    "A nota mede desempenho. O Termômetro de Confiabilidade mede risco e transparência, e aparece sempre ao lado dela. A trava de integridade é automática, não editorial.",
  "home.termometro.link": "Metodologia completa",
  "home.caminhos.titulo": "Por onde começar",
  "home.caminho1.titulo": "Ver quem está no topo",
  "home.caminho1.texto":
    "Os políticos com confiança suficiente para entrar no ranking, do maior para o menor.",
  "home.caminho1.rotulo": "Ranking IDIP",
  "home.caminho2.titulo": "Colocar dois lado a lado",
  "home.caminho2.texto":
    "Nota, dimensões, votos e financiamento de dois candidatos na mesma tela.",
  "home.caminho2.rotulo": "Comparar",
  "home.caminho3.titulo": "Descobrir seu espectro",
  "home.caminho3.texto":
    "Responda sobre os temas que importam e veja quais políticos se aproximam.",
  "home.caminho3.rotulo": "Meu Espectro",
  "home.caminho.abrir": "Abrir",
  "home.fecho.titulo": "Confira quem representa você",
  "home.fecho.texto":
    "Leva menos de um minuto. Se a nota parecer errada, o cálculo é aberto e há canal de retificação com protocolo rastreável.",
  "home.fecho.cta": "Começar pelo ranking",
  "home.fecho.retificacao": "Solicitar retificação",

  // ── Acompanhar ───────────────────────────────────────────────────────────
  "seguir.seguir": "Acompanhar",
  "seguir.seguindo": "Acompanhando",
  "seguir.deixar": "Deixar de acompanhar",
  "seguir.entrarPara": "Entre para acompanhar",
  "seguir.erro": "Não foi possível atualizar agora.",
  "seguir.politico": "político",
  "seguir.partido": "partido",
  "seguir.projeto": "projeto",
  "acompanhamentos.titulo": "O que você acompanha",
  "acompanhamentos.politicos": "Políticos",
  "acompanhamentos.partidos": "Partidos",
  "acompanhamentos.projetos": "Projetos",
  "acompanhamentos.vazio":
    "Você ainda não acompanha nada. Abra o perfil de um político, a página de um partido ou um projeto e use o botão Acompanhar.",
  "acompanhamentos.irParaRanking": "Ver o ranking",
  "acompanhamentos.contagem": "{n} acompanhando",

  // ── Espectro ─────────────────────────────────────────────────────────────
  "espectro.salvar": "Salvar resultado",
  "espectro.salvo": "Resultado salvo na sua área",
  "espectro.baixar": "Baixar",
  "espectro.compartilhar": "Compartilhar",
  "espectro.copiado": "Link copiado",
  "espectro.entrarParaSalvar": "Entre para salvar seu resultado",
  "espectro.erroSalvar": "Não foi possível salvar o resultado agora.",
  "espectro.ultimoResultado": "Seu último resultado",
  "espectro.refazer": "Refazer o teste",
  "espectro.versao": "Versão do questionário: {versao}",

  // ── Novidades ────────────────────────────────────────────────────────────
  "novidades.titulo": "O que mudou desde sua última visita",
  "novidades.desde": "Desde {data}",
  "novidades.primeiraVisita": "Você ainda não marcou nada como visto — mostrando o histórico disponível.",
  "novidades.vazio": "Nenhuma mudança registrada desde então nas entidades que você acompanha.",
  "novidades.semAcompanhamento": "Acompanhe um político para ver aqui quando a nota dele mudar.",
  "novidades.marcar": "Marcar como visto",
  "novidades.marcado": "Marcado como visto",
  "novidades.score": "Nota",
  "novidades.status": "Confiabilidade",
  "novidades.cobertura": "Hoje só nota e confiabilidade geram histórico. Financiamento e registros jurídicos ainda não têm série histórica.",

  // ── Comum ────────────────────────────────────────────────────────────────
  "comum.carregando": "Carregando o conteúdo…",
  "comum.erro.titulo": "Não foi possível carregar esta página",
  "comum.erro.lead":
    "A consulta ao banco de dados não respondeu. Isso costuma ser temporário — a nota não mudou, o acesso é que falhou.",
  "comum.erro.olho": "Falha ao carregar",
  "comum.erro.tentar": "Tentar de novo",
  "comum.erro.status": "Ver estado da plataforma",
  "comum.naoEncontrado.titulo": "Esta página não existe",
  "comum.naoEncontrado.lead":
    "O endereço não corresponde a nenhuma página da plataforma. Pode ser um link antigo, um cadastro removido ou um endereço digitado pela metade. Nenhum dado foi perdido — as notas continuam no ar, e a metodologia segue aberta para consulta.",
  "comum.naoEncontrado.cta": "Ver o ranking completo",
  "comum.naoEncontrado.home": "Ir para a página inicial",
} as const;

const esUS: Record<ChaveDicionario, string> = {
  "nav.ranking": "Ranking",
  "nav.ranking.idip": "Ranking IDIP",
  "nav.ranking.idip.desc": "Quiénes tienen confianza superior a 60, de mayor a menor",
  "nav.ranking.personalizado": "Ranking personalizado",
  "nav.ranking.personalizado.desc": "Pondera los temas que te importan",
  "nav.ranking.espectro": "Mi Espectro",
  "nav.ranking.espectro.desc": "Responde y mira tu posicionamiento",
  "nav.ranking.stf": "Corte Supremo Federal",
  "nav.ranking.stf.desc": "Índice propio para los ministros",
  "nav.partidos": "Partidos",
  "nav.partidos.todos": "Todos los partidos",
  "nav.partidos.todos.desc": "Promedio, distribución del Termómetro y bancada",
  "nav.partidos.comparar": "Comparar partidos",
  "nav.partidos.comparar.desc": "Dos agrupaciones lado a lado",
  "nav.projetos": "Proyectos",
  "nav.comparar": "Comparar",
  "nav.metodologia": "Metodología",
  "nav.metodologia.idip": "El índice IDIP",
  "nav.metodologia.idip.desc": "Fórmula, pesos y qué mide cada dimensión",
  "nav.metodologia.como": "Cómo funciona la política",
  "nav.metodologia.como.desc": "Los tres poderes y la jerarquía electoral",
  "nav.metodologia.historia": "Historia",
  "nav.metodologia.historia.desc": "Cómo evolucionó el índice, versión por versión",
  "nav.metodologia.calendario": "Calendario electoral",
  "nav.metodologia.calendario.desc": "Próximas elecciones y cargos en disputa",
  "nav.metodologia.faq": "Preguntas frecuentes",
  "nav.metodologia.faq.desc": "Dudas sobre la nota, los datos y la neutralidad",
  "nav.metodologia.sobre": "Acerca del proyecto",
  "nav.metodologia.sobre.desc": "Quién lo mantiene, con qué dinero y por qué",
  "nav.principal": "Navegación principal",
  "nav.abrirMenu": "Abrir menú",
  "nav.fecharMenu": "Cerrar menú",
  "nav.marca": "Currículo Político — página de inicio",

  "conta.entrar": "Ingresar",
  "conta.minhaConta": "Mi cuenta",
  "conta.dashboard": "Mi área",
  "conta.sair": "Salir",

  "rodape.explorar": "Explorar",
  "rodape.entender": "Entender",
  "rodape.projeto": "Proyecto",
  "rodape.juridico": "Legal",
  "rodape.descricao":
    "Nota de 0 a 100 para cada legislador y gobernante, calculada solo con datos públicos auditables.",
  "rodape.codigoAberto": "Código abierto · AGPL-3.0",
  "rodape.licenca": "Código bajo AGPL-3.0 · Documentación bajo CC BY 4.0",
  "rodape.fontes":
    "Fuentes: Cámara de Diputados, Senado Federal y TSE. Sin voto popular: las notas derivan exclusivamente de datos públicos auditables.",
  "rodape.status": "Estado",
  "rodape.apoie": "Apoya el proyecto",
  "rodape.contato": "Contacto",
  "rodape.retificacao": "Rectificación",
  "rodape.termos": "Términos de uso",
  "rodape.privacidade": "Privacidad",
  "rodape.lgpd": "LGPD",
  "rodape.cookies": "Cookies",

  "idioma.rotulo": "Idioma",
  "idioma.trocar": "Cambiar idioma",
  "idioma.parcial":
    "La interfaz está en español. Las páginas de contenido legal y editorial siguen en portugués hasta ser revisadas por un traductor.",

  "home.olho": "Antes de votar, mira lo que hizo",
  "home.titulo1": "Una campaña no revela al candidato.",
  "home.titulo2": "Su historial sí.",
  "home.lead":
    "Una nota de 0 a 100 por legislador y gobernante, calculada solo con datos públicos auditables: cómo votó, qué propuso, si asistió y cuánto costó. Sin encuestas, sin opinión, sin voto popular.",
  "home.busca.dica":
    "Busca por nombre, partido o tema. O mira el ranking completo.",
  "home.cta": "Ver el ranking",
  "home.ctaCompleto": "Ver el ranking completo",
  "home.comoCalculada": "Cómo se calcula la nota",
  "home.selo": "Código abierto · AGPL-3.0",
  "home.metodologia": "Metodología IDIP {versao}, pública y versionada.",
  "home.avaliados": "{n} evaluados",
  "home.termometro.titulo": "Una nota alta no basta: existe el riesgo",
  "home.termometro.lead":
    "La nota mide desempeño. El Termómetro de Confiabilidad mide riesgo y transparencia, y aparece siempre junto a ella. El bloqueo de integridad es automático, no editorial.",
  "home.termometro.link": "Metodología completa",
  "home.caminhos.titulo": "Por dónde empezar",
  "home.caminho1.titulo": "Ver quién está arriba",
  "home.caminho1.texto":
    "Los políticos con confianza suficiente para entrar en el ranking, de mayor a menor.",
  "home.caminho1.rotulo": "Ranking IDIP",
  "home.caminho2.titulo": "Poner a dos lado a lado",
  "home.caminho2.texto":
    "Nota, dimensiones, votos y financiamiento de dos candidatos en la misma pantalla.",
  "home.caminho2.rotulo": "Comparar",
  "home.caminho3.titulo": "Descubrir tu espectro",
  "home.caminho3.texto":
    "Responde sobre los temas que importan y mira qué políticos se acercan.",
  "home.caminho3.rotulo": "Mi Espectro",
  "home.caminho.abrir": "Abrir",
  "home.fecho.titulo": "Mira quién te representa",
  "home.fecho.texto":
    "Toma menos de un minuto. Si la nota parece incorrecta, el cálculo es abierto y hay un canal de rectificación con protocolo rastreable.",
  "home.fecho.cta": "Empezar por el ranking",
  "home.fecho.retificacao": "Solicitar rectificación",

  "seguir.seguir": "Seguir",
  "seguir.seguindo": "Siguiendo",
  "seguir.deixar": "Dejar de seguir",
  "seguir.entrarPara": "Ingresa para seguir",
  "seguir.erro": "No fue posible actualizar ahora.",
  "seguir.politico": "político",
  "seguir.partido": "partido",
  "seguir.projeto": "proyecto",
  "acompanhamentos.titulo": "Lo que sigues",
  "acompanhamentos.politicos": "Políticos",
  "acompanhamentos.partidos": "Partidos",
  "acompanhamentos.projetos": "Proyectos",
  "acompanhamentos.vazio":
    "Todavía no sigues nada. Abre el perfil de un político, la página de un partido o un proyecto y usa el botón Seguir.",
  "acompanhamentos.irParaRanking": "Ver el ranking",
  "acompanhamentos.contagem": "{n} siguiendo",

  "espectro.salvar": "Guardar resultado",
  "espectro.salvo": "Resultado guardado en tu área",
  "espectro.baixar": "Descargar",
  "espectro.compartilhar": "Compartir",
  "espectro.copiado": "Enlace copiado",
  "espectro.entrarParaSalvar": "Ingresa para guardar tu resultado",
  "espectro.erroSalvar": "No fue posible guardar el resultado ahora.",
  "espectro.ultimoResultado": "Tu último resultado",
  "espectro.refazer": "Rehacer el test",
  "espectro.versao": "Versión del cuestionario: {versao}",

  "novidades.titulo": "Qué cambió desde tu última visita",
  "novidades.desde": "Desde {data}",
  "novidades.primeiraVisita": "Todavía no marcaste nada como visto — mostrando el historial disponible.",
  "novidades.vazio": "No hay cambios registrados desde entonces en las entidades que sigues.",
  "novidades.semAcompanhamento": "Sigue a un político para ver aquí cuando cambie su nota.",
  "novidades.marcar": "Marcar como visto",
  "novidades.marcado": "Marcado como visto",
  "novidades.score": "Nota",
  "novidades.status": "Confiabilidad",
  "novidades.cobertura": "Hoy solo la nota y la confiabilidad generan historial. Financiamiento y registros legales aún no tienen serie histórica.",

  "comum.carregando": "Cargando el contenido…",
  "comum.erro.titulo": "No fue posible cargar esta página",
  "comum.erro.lead":
    "La consulta a la base de datos no respondió. Suele ser temporal — la nota no cambió, lo que falló fue el acceso.",
  "comum.erro.olho": "Error al cargar",
  "comum.erro.tentar": "Intentar de nuevo",
  "comum.erro.status": "Ver estado de la plataforma",
  "comum.naoEncontrado.titulo": "Esta página no existe",
  "comum.naoEncontrado.lead":
    "La dirección no corresponde a ninguna página de la plataforma. Puede ser un enlace antiguo, un registro eliminado o una dirección incompleta. No se perdió ningún dato — las notas siguen disponibles y la metodología sigue abierta para consulta.",
  "comum.naoEncontrado.cta": "Ver el ranking completo",
  "comum.naoEncontrado.home": "Ir a la página de inicio",
};

/**
 * Espanhol da Espanha.
 *
 * Diferenças reais em relação a `es-US`, não sotaque: `ordenador`/`computadora`,
 * `móvil`/`celular`, `coche`/`carro`, e o uso de `vosotros` (evitado aqui por
 * neutralidade de tratamento). Onde a diferença não existe, o texto é igual — o
 * que importa é que sejam **dois dicionários**, para que a divergência seja
 * decidida e não herdada por acidente.
 */
const esES: Record<ChaveDicionario, string> = {
  ...esUS,
  "nav.ranking.idip.desc": "Quiénes tienen confianza por encima de 60, de mayor a menor",
  "conta.entrar": "Iniciar sesión",
  "conta.sair": "Cerrar sesión",
  "rodape.status": "Estado del servicio",
  "rodape.contato": "Contacto",
  "rodape.retificacao": "Rectificación",
  "rodape.termos": "Términos de uso",
  "rodape.privacidade": "Privacidad",
  "home.lead":
    "Una nota de 0 a 100 por parlamentario y gobernante, calculada solo con datos públicos auditables: cómo votó, qué propuso, si asistió y cuánto costó. Sin encuestas, sin opinión, sin voto popular.",
  "home.avaliados": "{n} evaluados",
  "home.busca.dica": "Busca por nombre, partido o tema. O consulta el ranking completo.",
  "home.caminho2.texto":
    "Nota, dimensiones, votos y financiación de dos candidatos en la misma pantalla.",
  "seguir.entrarPara": "Inicia sesión para seguir",
  "seguir.erro": "No se pudo actualizar ahora.",
  "espectro.entrarParaSalvar": "Inicia sesión para guardar tu resultado",
  "espectro.erroSalvar": "No se pudo guardar el resultado ahora.",
  "comum.erro.lead":
    "La consulta a la base de datos no respondió. Suele ser temporal: la nota no ha cambiado, lo que ha fallado es el acceso.",
};

export const DICIONARIOS: Record<Locale, Record<ChaveDicionario, string>> = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-US": esUS,
  "es-ES": esES,
};

/** Idioma de origem — usado como fallback quando falta uma chave traduzida. */
export const DICIONARIO_ORIGEM: Record<ChaveDicionario, string> = ptBR;

export { LOCALE_PADRAO };
