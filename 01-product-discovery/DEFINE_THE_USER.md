# Definição do Usuário

## Personas

### 1. O Eleitor Informado (usuário primário)
- **Quem:** Cidadão brasileiro, 18–65 anos, com interesse em política mas sem tempo/formação para analisar dados brutos
- **Necessidade:** Ver o "currículo" de um político em 30 segundos — nota, termômetro, gastos, presença
- **Dor:** Dados dispersos em dezenas de portais; imprensa editorializa; redes sociais polarizam
- **Como usa:** Busca o nome → vê a nota IDIP + termômetro → compara com outros → decide o voto

### 2. O Jornalista/Verificador (usuário secundário)
- **Quem:** Repórter de política, agência de checagem (Aos Fatos, Lupa)
- **Necessidade:** Dados auditáveis com link para a fonte oficial e data de coleta
- **Como usa:** API pública (`/api/rankings`, `/api/search`) → cita no artigo com link

### 3. O Político/Assessor (usuário terciário)
- **Quem:** Parlamentar ou assessoria que monitora a própria imagem
- **Necessidade:** Ver a nota, entender o breakdown, solicitar retificação se houver erro
- **Como usa:** Busca o próprio nome → verifica breakdown → canal de retificação se necessário

### 4. O Contribuidor Open Source
- **Quem:** Desenvolvedor, cientista de dados, jurista
- **Necessidade:** Código limpo, documentação, pipeline reproduzível
- **Como usa:** Clona, roda localmente, contribui com ETLs ou correções

## Anti-Personas (quem NÃO é o público-alvo)
- Partidos/campanhas buscando ferramenta de propaganda
- Pessoas buscando opinião política ou recomendação de voto
- Pesquisadores que precisam de dados em tempo real (nossa latência é diária)
