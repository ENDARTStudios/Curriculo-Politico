---
name: curriculo-marketing-funnel
description: Estratégia de marketing em 4 estágios do Currículo Político (Gancho → Desenvolvimento/Promessa → Prova/Exemplo → CTA), com banco de ganchos, copy aprovada e regras de compliance. Use ao escrever qualquer texto de conversão.
whenToUse: Ao escrever ou revisar hero, landing pages, seções de conversão, títulos, subtítulos, microcopy de CTA, posts, e-mails, metadados SEO ou qualquer texto cujo objetivo seja engajar ou converter.
metadata:
  version: "1.0"
  estagios: gancho, desenvolvimento, prova, cta
---

# Funil de Marketing — Currículo Político

Todo texto de conversão passa por quatro estágios. Se um deles estiver ausente, o
texto está incompleto — não "enxuto".

## Os 4 estágios

### 1. Gancho — os primeiros 3 segundos
Uma frase forte, pergunta ou imagem que aborda uma **dor, desejo ou curiosidade
específica** do público. Deve funcionar lida sozinha, sem contexto.

- Curto: cabe em uma linha no mobile.
- Concreto: nomeia uma situação real, não um conceito abstrato.
- A dor central do público: *"eu vou votar, mas não sei em quem confiar."*

Teste: se a frase pudesse abrir o site de qualquer instituição, não é gancho.

### 2. Desenvolvimento / Promessa
Explicação simples e direta do que a plataforma faz e por que isso resolve a dor
do gancho. Usa os gatilhos de **simplicidade** (fácil de entender) e **razão**
(faz sentido lógico).

- Diga o que é, em uma frase, sem jargão.
- Explique o mecanismo em no máximo 3 passos.
- Nunca prometa o que o produto não faz.

### 3. Prova ou Exemplo
Caso real, dado verificável, bastidor ou demonstração que **valida** a promessa.
Sem prova, o desenvolvimento é só afirmação.

Fontes de prova disponíveis no projeto:
- Números reais do banco (políticos avaliados, votações, proposições, partidos).
- Metodologia aberta e versionada em `/metodologia` — a auditabilidade É a prova.
- Fontes oficiais nomeadas: Câmara dos Deputados, Senado Federal, TSE.
- Regras duras e verificáveis: travas de integridade, teto 39.9, termômetro.
- Código aberto (AGPL-3.0) — qualquer pessoa pode auditar o cálculo.

**Regra de honestidade:** todo número exibido deve vir de consulta real ao banco.
Se não houver dado, o número não aparece. Número inventado ou "exemplo" não
rotulado destrói exatamente a credibilidade que é o produto.

### 4. Chamada para Ação (CTA)
O comando final, explícito, dizendo **exatamente** o que fazer. Um CTA primário
por seção.

- Verbo no imperativo: "Compare", "Veja", "Comece".
- O CTA primário da home é **ver o ranking** — é onde a promessa se entrega.
- CTAs secundários existem, mas com peso visual menor e agrupados.

## Banco de ganchos aprovados

| Gancho | Estágio alvo |
|---|---|
| "Uma campanha política não revela o seu candidato. O currículo dele sim." | Marca (atual, manter) |
| "Em quem você votou da última vez? Você sabe o que ele fez depois?" | Curiosidade + dor |
| "O voto é secreto. O mandato não deveria ser." | Provocação cívica |
| "Antes de confiar, confira." | Direto, curto |
| "Nota de 0 a 100 para quem te representa. Calculada só com dados públicos." | Prova antecipada |

O gancho de marca ("o currículo dele sim") fica no `h1`. Um gancho de dor pode
ocupar o *eyebrow* acima do título.

## Regras de compliance (inegociáveis)

Estas regras vêm do README e de `.claude/skills/curriculo-juridico`. Violá-las é
risco jurídico, não escolha de estilo.

1. **Linguagem jurídica estrita:** apenas "Réu em Ação Penal" e "Condenação
   Transitada em Julgado". Nunca "crime", "criminoso", "bandido" ou "corrupto"
   sem trânsito em julgado.
2. **Sem voto popular na nota.** Nunca insinue que votos de usuários ou
   popularidade afetam o IDIP. A camada de engajamento é separada.
3. **Não acusar.** A plataforma mostra dados e status; não emite juízo sobre
   pessoas. Descreva o estado ("Confiável", "Atenção", "Não Confiável") como
   resultado determinístico da metodologia, nunca como opinião editorial.
4. **Neutralidade política.** Nenhum texto pode favorecer espectro, partido ou
   candidato. Evite vinhetas que sugiram "políticos são todos iguais".
5. **Fontes nomeadas.** Todo dado público exibido deve ser rastreável à Câmara,
   Senado ou TSE.
6. **Dados sensíveis/LGPD:** nunca exponha CPF, endereço ou dado familiar.

## Erros que já cometemos (não repetir)

- **Sete CTAs com o mesmo peso na hero.** Sem hierarquia, o usuário não sabe
  para onde ir. Corrigido: 1 CTA primário + secundários agrupados.
- **Selo "MVP em construção · Fase 0 concluída"** no topo da hero. É bastidor
  interno vazando para o público; ocupa o espaço mais valioso da página e
  comunica fragilidade em vez de valor.
- **Metodologia desatualizada na home** (dizia v1.0 com pesos antigos enquanto o
  motor roda v1.1). Em um produto cujo diferencial é "algoritmos abertos", isso
  é o pior defeito possível. Ver `curriculo-design-system` e `/metodologia`.
- **Seção de API pública** na home. Interessa a desenvolvedor, não ao eleitor.
  Não pertence ao funil principal.

## Checklist de revisão de copy

- [ ] Existe um gancho que funciona sozinho nos primeiros 3 segundos?
- [ ] O desenvolvimento explica o produto sem jargão?
- [ ] Há pelo menos uma prova verificável e real?
- [ ] Existe exatamente um CTA primário, com verbo imperativo?
- [ ] Todo número exibido é real e rastreável?
- [ ] Nenhuma violação de compliance jurídico?
- [ ] Nenhum termo de bastidor interno ("MVP", "fase", "em construção")?
