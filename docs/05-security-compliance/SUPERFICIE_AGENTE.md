# SUPERFÍCIE_AGENTE — Ferramentas de desenvolvimento como superfície de ataque

**Projeto:** Currículo Político · **Data:** 2026-10-17
**Escopo:** MCP, skills, hooks e cadeia de suprimentos das ferramentas de agentes.
**Decisão que motivou:** avaliação do `affaan-m/ECC` (ver §4).

> Este documento existe porque o código de desenvolvimento também é superfície de
> ataque. Um modelo de dados revisado e um IDIP correto não protegem o projeto se
> uma ferramenta do agente executa código arbitrário a cada ação, ou se uma
> credencial de produção entra no histórico do Git. O ativo aqui é o **acesso**,
> não o dado de político.

---

## 1. Achado real: MCP declarado apontava para pacote inexistente

| Campo | Valor |
|---|---|
| Arquivo | `.claude/settings.json` |
| Declaração | `npx -y @deusdata/codebase-memory-mcp` |
| Realidade verificada | **404 no registry npm** — o escopo `@deusdata` nunca foi registrado |
| Efeito prático | O servidor MCP **nunca funcionou** |

O problema não é o MCP quebrado; é a **forma** da declaração. `npx -y` sem versão,
apontando para um nome que existe no registry mas não é reivindicado, significa
que **qualquer pessoa que registre `@deusdata` passa a executar código em toda
sessão do projeto**. Não haveria revisão, nem diff, nem aviso.

**Correção aplicada:** a entrada foi **removida**, não substituída. O pacote real
(`codebase-memory`, não relacionado, single-publish, sem mantenedores
declarados) não foi avaliado e adotá-lo por conta própria seria trocar um risco
conhecido por um desconhecido.

**Regra derivada:** declarar MCP exige **versão exata**. Sem versão, não se
declara.

---

## 2. Controle: varredura de segredos no pré-commit

### 2.1 Por que existe

O projeto já perdeu credenciais de produção de forma destrutiva: o
`apps/web/.env` foi sobrescrito por engano e, por ser gitignored, **o Git não
tinha como recuperar**. Esse é o risco da *perda*.

O risco simétrico é a *exposição*: um segredo que **entra** no histórico. Nesse
caso a remediação não é editar o arquivo — é reescrever commits e rotacionar
todas as credenciais. É o único problema em que "corrigir depois" custa
desproporcionalmente.

O `.gitignore` cobre `.env*`, mas não cobre o caso comum de alguém colar uma
chave dentro de um script versionado, um exemplo ou uma nota de pesquisa.

### 2.2 Como funciona

- **Arquivo:** `scripts/verificar-segredos.mjs`
- **Hook:** `.githooks/pre-commit` (ativado por `npm run hooks:install`)
- **Verificação:** `npm run verify:secrets` (repositório inteiro) e
  `npm run verify:secrets:test` (autoteste)

Detecta por **prefixo conhecido**, não por entropia: Supabase (`sbp_`,
`sb_secret_`), GitHub (`ghp_`, `github_pat_`), AWS (`AKIA`), Google (`GOCSPX-`,
`AIza`), Vercel (`vck_`), Typesafe (`apikey_`), cabeçalho PEM, e URL de conexão
com senha embutida fora de host local.

Também verifica duas coisas além do conteúdo:

1. **Nome de arquivo** — `.env`, variantes, `.pem`/`.p12`/`.pfx`/`.jks` e chaves
   SSH privadas nunca podem ser versionados.
2. **`.gitignore`** — se a regra `.env*` desaparecer, o próximo `git add .`
   versionaria credenciais. Esta é a verificação que faltou no incidente original.

### 2.3 Decisões de projeto que importam

| Decisão | Motivo |
|---|---|
| **Escaneia só linhas adicionadas** no modo staged | Sinalizar linha antiga bloquearia qualquer commit que tocasse o arquivo, sem que aquele commit tenha introduzido o problema |
| **Nunca imprime o valor** — só prefixo curto e tamanho | O relatório vai para log de CI, terminal compartilhado e transcript de agente |
| **Prefixo conhecido, não entropia** | Entropia gera falso positivo em hash, fixture e código minificado; scanner que grita errado é desligado, e aí a proteção toda se perde |
| **Localhost e domínio interno excluídos da regra de URL** | `localhost:15432` e `postgres.railway.internal` são legítimos em dev e compose; sinalizá-los treinaria o time a ignorar o alerta |
| **Só segredos no hook, não typecheck/e2e** | Commit lento é contornado com `--no-verify`, e a proteção se perde por inteiro |
| **Hook em `.githooks/`, via `core.hooksPath`** | `.git/hooks/` não é versionado: cada clone ficaria desprotegido até alguém recriar o hook |

### 2.4 Evidência de funcionamento

| Cenário | Resultado medido |
|---|---|
| Autoteste das regras | 11 detecções e 5 não-detecções OK |
| Varredura do repositório (350 arquivos) | nenhum achado |
| `git commit` com chave AWS falsa | exit 1, `HEAD` não avançou, arquivo:linha reportados |
| `git commit` com token GitHub falso (40 chars) | exit 1, `HEAD` não avançou |

Os fixtures do autoteste são **compostos em tempo de execução**, não literais.
Um cabeçalho PEM escrito literalmente no arquivo do scanner era acusado pelo
próprio scanner e travava todo commit que tocasse o arquivo — o teste falhou
assim na primeira versão e a correção está comentada no código.

---

## 3. Risco conhecido e aceito: credenciais só existem fora do repositório

Nenhum segredo de produção está versionado — verificado. O efeito colateral é que
**perder o `.env` local significa perder acesso até restaurar de um serviço
externo**, e foi exatamente o que aconteceu.

Mitigação existente: os valores vivem em Vercel (envs encrypted) e no Supabase.
Mitigação ausente: não há cópia local segura nem cofre com trilha de auditoria.
Recomendação em aberto: gerenciador de segredos com histórico de versões.

---

## 4. Ferramentas avaliadas e rejeitadas

### `affaan-m/ECC` (Everything Claude Code) — **rejeitado em 2026-10-17**

Repositório de configuração de agentes: 71 agentes, 311 skills, 97 comandos e
28 hooks. MIT (compatível com AGPL-3.0-only — licença não foi o impedimento).

| Critério | Avaliação |
|---|---|
| Benefício ao produto | **Nenhum.** Otimiza o harness do agente, não o IDIP, o ETL ou a UI |
| Harness | **Incompatível.** Hooks são do modelo de eventos do Claude Code; o projeto roda DSH, com `.claude/settings.json` sem hooks |
| Sobreposição | `stop:format-typecheck` duplica `npm run typecheck`; projeto já tem Playwright + axe + Impeccable |
| Contexto | 513 arquivos de instrução auto-carregáveis contra 9 skills de domínio curadas |
| Segurança | **Reprovado** — ver abaixo |

Sobre segurança, verificado na fonte primária (`hooks/hooks.json`): múltiplos
matchers `.*` disparando antes/depois de **toda** chamada de ferramenta; cada
entrada resolve o diretório raiz do plugin a partir de `CLAUDE_PLUGIN_ROOT` e
varre caminhos em `~/.claude/`, pegando o **primeiro que casar, sem verificação de
integridade ou assinatura**. Auditoria independente relata ainda instalação global
em `~/.claude/`, auto-update por `git pull` sem verificação de assinatura, e
`.mcp.json` com `npx -y ...@latest`.

Precedente respeitado: o Impeccable foi adotado de forma estreita, com sua
autoridade sobre `PRODUCT.md`/`DESIGN.md` deliberadamente rejeitada. O ECC pedia o
oposto.

**Ideia aproveitada sem adotar a dependência:** o guard de `next dev` órfão
(`scripts/verificar-dev-ativo.mjs`), que resolve um problema já documentado do
projeto — a armadilha do `.next` compartilhado — em ~150 linhas versionadas, sem
28 hooks globais.

### Nota sobre popularidade

O ECC tem 282.094 estrelas e 1.406 watchers (0,5%) num repositório de
configuração criado há 9 meses. A proporção é atípica e existem análises públicas
questionando contagem inflada em repositórios desse tipo. Isso não prova fraude —
mas é motivo para não usar popularidade como substituto de avaliação.
