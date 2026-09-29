# Termos de Uso — Currículo Político (minuta)

> **Status:** minuta técnica para revisão jurídica humana obrigatória antes do lançamento público (ver "Notas para mantenedores" ao final).

## 3. Natureza dos Dados e Isenção de Responsabilidade

### 3.1. Interesse Público e Fontes Oficiais
O Usuário reconhece que o Currículo Político é um agregador de informações de **interesse público**, coletadas exclusivamente de bases de dados governamentais abertas, incluindo, mas não se limitando a:
- Tribunal Superior Eleitoral (TSE)
- Câmara dos Deputados e Senado Federal
- Portais da Transparência (Federal, Estadual e Municipal)
- Tribunais de Contas (TCU/TCEs)
- Diários Oficiais e Tribunais de Justiça

### 3.2. Veracidade e Notoriedade
As informações exibidas são consideradas **verdadeiras e notórias** no momento de sua coleta nas fontes oficiais. O Currículo Político não realiza juízo de valor sobre a vida privada dos políticos, limitando-se a registrar fatos funcionais, legislativos e jurídicos públicos.

### 3.3. Metodologia de Pontuação (IDIP)
A pontuação exibida é um **indicador técnico de desempenho e conformidade**, calculada algoritmicamente com base em critérios públicos (assiduidade, produção legislativa, integridade jurídica e transparência).
- A nota **não constitui julgamento moral** ou condenação.
- A nota **não reflete opinião** dos mantenedores do site.
- A metodologia completa está disponível publicamente para auditoria.

### 3.4. Ausência de Dolo ou Difamação
O Currículo Político não tem como objetivo ridicularizar, expor ao vexame ou difamar qualquer figura pública. A exposição de dados negativos (como processos ou contas rejeitadas) decorre estritamente do princípio da publicidade dos atos administrativos e do direito do eleitor à informação.

### 3.5. Direito de Retificação
Caso um político identifique dados desatualizados ou incorretos (ex: um processo arquivado que ainda consta como ativo), ele possui canal prioritário para solicitação de correção. O Currículo Político se compromete a atualizar o dado na fonte assim que a retificação for comprovada documentalmente.

## 4. Conformidade com a LGPD (Lei Geral de Proteção de Dados)

### 4.1. Dados Públicos e Interesse Público
O tratamento de dados pessoais realizado pelo Currículo Político fundamenta-se no **Art. 7º, inciso III** e no **Art. 11, §4º** da LGPD, que autorizam o tratamento de dados pessoais tornados manifestamente públicos pelo titular ou por força de lei, visando o interesse público e o controle social.

### 4.2. Minimização de Dados
O site **não coleta nem exibe**:
- CPF completo
- Endereços residenciais
- Telefones pessoais
- Dados de familiares sem cargo público
- Dados de saúde ou orientação sexual

Apenas dados funcionais e públicos relevantes para o exercício do mandato são processados.

## 5. Limitações Técnicas e Fontes

### 5.1. Atraso de Atualização
Os dados governamentais podem sofrer atrasos de publicação ou inconsistências nas APIs oficiais. O Currículo Político exibe a **data da última coleta** em cada perfil. A plataforma não se responsabiliza por decisões tomadas com base em dados que já foram alterados na fonte oficial mas ainda não foram sincronizados.

### 5.2. Status Jurídico
O site diferencia rigorosamente os status jurídicos para evitar interpretações errôneas:
- **Investigado/Inquérito:** Não implica culpa.
- **Réu:** Processo em andamento, presunção de inocência.
- **Condenado:** Decisão judicial (com indicação de instância).
- **Absolvido/Arquivado:** O dado é ocultado ou marcado como limpo.

O Currículo Político respeita o princípio da presunção de inocência e não utiliza termos como "criminoso" ou "corrupto" sem que haja condenação transitada em julgado.

---

## Notas para mantenedores (não faz parte dos Termos)

1. **Revisão jurídica humana obrigatória** antes do lançamento público — especialmente sobre direito de imagem de políticos na jurisprudência brasileira (STJ/STF).
2. **Processos SLAPP:** políticos podem usar a justiça para tentar remover o site. Defesas técnicas: textos claros, metodologia aberta e canal de retificação visível.
3. **Dados de terceiros:** se a fonte oficial publicar dado errado, replicamos o erro. Mitigações já implementadas: link para a fonte original em cada registro jurídico, e prazo/documentação exigidos no canal de retificação.
4. **Linguagem jurídica estrita** é regra de implementação (não só de texto): ver `05-security-compliance/SECURITY_BASELINE.md` §3 — a API já oculta registros arquivados/absolvidos e a UI usa apenas termos processuais.
