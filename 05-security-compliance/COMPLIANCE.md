# Compliance — LGPD, LAI e Lei de Acesso

## LGPD (Lei 13.709/2018)
Ver documentação completa:
- Página pública: `/privacidade` e `/lgpd`
- Termos: `01-product-discovery/LEGAL_TERMS.md`
- Baseline: `05-security-compliance/SECURITY_BASELINE.md`

## Princípios de Compliance do Currículo Político

### 1. Dados de agentes públicos = interesse público
Fundamentação: Art. 7º, III (procedimentos) + Art. 11, §4º (dados manifestamente
públicos) + LAI (Art. 3º: publicidade é preceito geral).

### 2. Minimização agressiva
Nenhum CPF completo, endereço, telefone, dados de familiares ou de saúde é
armazenado ou exibido. O ETL descarta esses campos no parse.

### 3. Ocultação automática
Registros judiciais arquivados ou com absolvição são **ocultados por código**
na API — não é uma política manual, é implementação obrigatória.

### 4. Direito de resposta
Canal de retificação em `/retificacao` com SLA de 72h úteis e comprovação
documental na fonte oficial.

### 5. Sem rastreadores
Zero Google Analytics, Facebook Pixel ou qualquer tracking de terceiros.
Apenas cookies essenciais do NextAuth.

### 6. Auditoria de dados
Cada registro tem `sourceUrl` (link da fonte) e `retrievedAt` (data de coleta).

## Checklist de Compliance
- [x] Política de Privacidade pública (/privacidade)
- [x] Política de Cookies pública (/cookies)
- [x] Página LGPD detalhada (/lgpd)
- [x] Canal de retificação (/retificacao)
- [x] Termos de Uso com natureza dos dados (/termos-de-uso)
- [x] Baseline de segurança documentado
- [ ] Revisão jurídica humana (pendente — advogado especialista)
- [ ] DPO formalmente designado (email placeholder)
- [ ] RIPD formal documentado (estrutura pronta em /lgpd)
