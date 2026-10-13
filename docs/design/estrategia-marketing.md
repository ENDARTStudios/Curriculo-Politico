# Design & Conversão — Currículo Político

Documentação viva da camada de UI-UX do projeto. Toda alteração de interface deve
respeitar o que está aqui.

## Estrutura

```
.dsh/skills/                       Skills carregáveis pelo agente
├── curriculo-design-system/       Tokens, cores semânticas, tipografia, a11y
├── curriculo-marketing-funnel/     Funil de 4 estágios + compliance
├── curriculo-design-review/        Protocolo de auditoria de UI
└── curriculo-hero/                 Padrão da home/hero

docs/design/agents/                Briefs de subagentes especializados
├── ui-ux-designer.md               Projetar e implementar telas
├── critico-visual.md               Auditar hierarquia e qualidade visual
├── copywriter-conversao.md         Escrever copy de conversão
└── auditor-acessibilidade.md       Auditar WCAG 2.2 AA e responsividade

docs/design/estrategia-marketing.md  Este documento
```

## A estratégia de marketing: funil de 4 estágios

Toda página de conversão do produto segue esta sequência. A ordem é argumentativa,
não estética.

| Estágio | Função | Na home |
|---|---|---|
| **1. Gancho** | Os primeiros 3 segundos. Uma dor, desejo ou curiosidade específica do público. | Eyebrow com a dor ("Antes de votar, confira o que ele fez") + `h1` com o gancho de marca ("Uma campanha não revela o candidato. O currículo sim.") |
| **2. Desenvolvimento / Promessa** | Explicação simples e direta do valor, com gatilhos de simplicidade e razão. | Subtítulo: o que é a plataforma e como o IDIP funciona, sem jargão. |
| **3. Prova / Exemplo** | Caso real, dado verificável ou demonstração que valida a promessa. | Faixa de números reais do banco + Termômetro + metodologia aberta com pesos reais. |
| **4. CTA** | O comando final, explícito, dizendo exatamente o que fazer. | **Um** CTA primário ("Ver o ranking") + secundários com peso menor. |

### A dor central do público

> "Eu vou votar, mas não sei em quem confiar."

Tudo na home responde a essa dor. Qualquer elemento que não ajude a responder não
pertence à home.

### O que foi removido da home e por quê

| Elemento | Problema | Decisão |
|---|---|---|
| Selo "MVP em construção · Fase 0 concluída" | Bastidor interno no espaço mais valioso da página; comunica fragilidade, não valor | Removido do topo. Status real vive em `/status`. |
| 7 botões de navegação idênticos na hero | Zero hierarquia: o usuário não sabe para onde ir | Substituído por 1 CTA primário + grupo de secundários menores. A navegação completa já existe no header. |
| "Metodologia IDIP v1.0" hardcoded | Contradizia o motor real (**v1.1**, com Produção 18% e Custo 7%, não 20%/5%) | Pesos agora derivados de `packages/idip/src/scoring.ts`. |
| Seção "API pública (em construção)" | Interessa a desenvolvedor, não ao eleitor | Fora do funil principal. |

### Por que a correção da metodologia importa mais que a estética

O diferencial declarado do produto é "algoritmos abertos" e "neutralidade
algorítmica". Se a home anuncia uma versão da fórmula e pesos que o motor não
executa, a plataforma perde exatamente o que ela vende. **É um defeito de
credibilidade, não de design.** Por isso a UI passa a importar `WEIGHTS` do motor
em vez de redigitar números.

## Regras inegociáveis

1. As cores de estado derivam de `enum ReliabilityStatus` (`GREEN`, `YELLOW`,
   `RED`, `GRAY`). Nunca use verde/âmbar/vermelho fora desse significado.
2. Linguagem jurídica estrita: só "Réu em Ação Penal" e "Condição Transitada em
   Julgado". Isso vale para qualquer texto, inclusive microcopy.
3. Nenhum número exibido sem consulta real ao banco, com fallback que **não**
   renderiza a faixa de prova quando não há dados.
4. A votação popular é camada de engajamento separada e nunca altera a nota — a UI
   não pode sugerir o contrário.
5. Acessibilidade AA é requisito, não melhoria.

## Como usar os subagentes

Os briefs em `docs/design/agents/` são autossuficientes e feitos para delegação
com contexto isolado. Fluxo recomendado:

1. **ui-ux-designer** projeta e implementa a mudança.
2. **critico-visual** audita o resultado e devolve bloqueantes.
3. **auditor-acessibilidade** roda em paralelo com o crítico.
4. **copywriter-conversao** valida os textos contra o funil e o compliance.

Sempre passe ao subagente o brief inteiro mais os arquivos-alvo. Ele não
compartilha o contexto da sua sessão.

## Verificação

A home depende de dados reais, então não basta `typecheck`: o fluxo completo é

```bash
npm run typecheck
npm run build
npm run dev          # e então conferir a hero renderizada
```

Se o banco local estiver vazio, a faixa de prova **deve desaparecer** sem quebrar
o layout — esse é um caso de teste obrigatório.
