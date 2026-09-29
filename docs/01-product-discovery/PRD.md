# PRD: Currículo Político (MVP)

## 1. Visão Geral
Plataforma open-source de transparência política que agrega dados públicos federais e estaduais para avaliar, ranquear e auditar o desempenho de políticos e partidos no Brasil, utilizando o Índice de Desempenho e Integridade Pública (IDIP).

## 2. Escopo do MVP
- **Cargos:** Presidente, Governadores, Senadores, Deputados Federais e Estaduais.
- **Funcionalidades Core:** Perfis detalhados, Rankings (Top 10), Comparador, Metodologia Aberta, Termômetro de Confiabilidade.
- **Usuários:** Visitantes (leitura), Usuários (favoritos/dashboard), Admins (moderação/auditoria).

## 3. Requisitos Não-Funcionais
- **Segurança:** Proteção DDoS, WAF, auditoria de dados imutável.
- **Compliance:** LGPD (minimização de dados pessoais), linguagem jurídica estrita.
- **Licença:** Código AGPLv3, Documentação CC BY 4.0.

## 4. Fora do Escopo (v1)
- Políticos municipais (Prefeitos/Vereadores).
- Votação popular ou opinião de usuários **sobre políticos** (a nota IDIP nunca incorpora opinião).
- Aplicativos mobile nativos.

> **Atualização 2026-09-28 — Neutralidade Algorítmica:** votação popular de **projetos de lei** (não de políticos) entra no produto como camada de **engajamento pessoal**, arquiteturalmente separada do IDIP: as contagens (`UserBillVote`) e o futuro Filtro de Afinidade (`UserAffinity`) nunca alteram a nota global factual. Detalhes em `/metodologia` § Neutralidade Algorítmica.
