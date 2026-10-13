# NAC — Network Access Control

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Status:** ❌ **não se aplica** — não existe rede corporativa a controlar.

> Documento curto por decisão, não por preguiça: NAC resolve um problema que
> este projeto **não tem**. Abaixo está a justificativa, o que ocupa o lugar do
> NAC hoje e qual mudança de arquitetura tornaria NAC necessário.

---

## 1. Por que NAC não se aplica

NAC (802.1X, perfis de dispositivo, quarentena de endpoint, *posture
assessment*, controle de acesso à LAN/Wi-Fi) pressupõe um perímetro de rede com
ativos conectados que precisam ser admitidos. Este projeto **não tem perímetro**:

| Pré-requisito de NAC | Existe neste projeto? |
|---|---|
| Rede corporativa / LAN / Wi-Fi própria | ❌ Não |
| Sede, escritório ou data center próprio | ❌ Não |
| Estações de trabalho gerenciadas | ❌ Não (equipamento pessoal do operador — **não verificado**) |
| Servidores próprios na rede | ❌ Não |
| Domínio / Active Directory / Entra ID | ❌ Não |
| VPN de acesso remoto | ❌ Não |
| Switch/AP gerenciável sob controle do projeto | ❌ Não |

**A arquitetura é serverless e gerenciada de ponta a ponta:**

```
   [Máquina do operador]                [Serviços gerenciados]
        │  navegador / git / npm run           │
        ▼                                      ▼
   ── Internet ─────────────────────►  Vercel (funções, região gru1)
                                        Supabase (Postgres sa-east-1)
                                        GitHub (código, Actions, secrets)
                                        Google (OAuth)
```

Não há nenhum ativo de rede sob controle do projeto. Todo acesso é
**saída para a Internet** ou **API HTTPS de terceiro**. Não existe "porta de
rede" a fechar, nem dispositivo a admitir em VLAN, nem endpoint a colocar em
quarentena.

**E o Postgres?** O Supabase tem, no plano pago, *network restrictions*/IP
allowlist. Isso é **controle de acesso à rede do provedor**, não NAC — e está
**não verificado** se está habilitado (e no plano Free do Supabase a
funcionalidade não está disponível). Ver [`ZTNA.md`](./ZTNA.md) §3 para o
equivalente aplicável.

---

## 2. O que ocupa o lugar do NAC hoje

O que existe é controle de acesso **de aplicação e de cota**, na borda:

| Controle | Onde | O que faz (e o que **não** faz) |
|---|---|---|
| **Rate limiting por Token Bucket** | [`apps/web/src/middleware.ts`](../../apps/web/src/middleware.ts) L20–76 | 60 req/min geral e 10 req/min em auth, **em memória e por instância** — não é teto global. É suavização de tráfego, não controle de admissão de rede |
| **CSP + headers de segurança** | `middleware.ts` L100–149 | `default-src 'self'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy` (câmera/microfone/geolocalização negados). Reduz superfície no navegador |
| **Autenticação nas rotas de escrita** | `getServerSession` nas rotas de consentimento/voto/conta | Admite apenas usuário autenticado — **autorização de aplicação**, não de rede |
| **Guardas de script de dados** | `db:seed` recusa banco remoto sem `CP_ALLOW_REMOTE_SEED=1` (`seed-dev.ts`) | A única "admissão" real do projeto: evita que a máquina de desenvolvimento escreva em produção. **Os demais scripts não têm essa guarda** |
| **Egress restrito por natureza** | — | O Postgres do Supabase é acessível por qualquer IP com a credencial correta: **não há allowlist** |
| **Sem WAF** | — | O comentário do `middleware.ts` (L15–17) declara que a proteção distribuída por IP viria de **Cloudflare/WAF na frente do deploy** — e **não está configurada** |

**Frase honesta:** o controle de acesso à rede deste projeto é a **posse de uma
connection string**. Não há camada de rede intermediando.

---

## 3. Risco real na ausência de NAC

Nenhum. NAC ausente não cria risco por si — não há rede a proteger. O risco
correspondente está em **outro lugar** e está tratado nos documentos irmãos:

| Risco real | Onde está tratado |
|---|---|
| `DATABASE_URL` vaza → escrita em produção | [`THREAT_MODELING.md`](./THREAT_MODELING.md) T2/I3 · [`IAM_IGA.md`](./IAM_IGA.md) §6 |
| Script de ETL rodado por engano contra produção | `THREAT_MODELING.md` T3 · [`RBAC.md`](./RBAC.md) §4 |
| Flood que esgota pool/egress | `THREAT_MODELING.md` D1/D3 |
| Movimento lateral | **Não aplicável** — não há rede interna nem host sob controle do projeto |
| Exposição administrativa (SSH, painel interno) | **Não aplicável** — nenhum serviço de administração é exposto; o painel do Supabase/Vercel é HTTPS do provedor, protegido pela conta |

---

## 4. O que tornaria NAC (ou equivalente) necessário

Gatilhos concretos — qualquer um cria um perímetro que hoje não existe:

1. **Servidor/VPS próprio** (por exemplo, Hetzner + Coolify, avaliado e descartado em
   [`AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md) §3.2). Passa a existir um host com SSH, firewall e superfície de rede.
2. **Banco self-hosted** em vez do Supabase gerenciado.
3. **Mais de um operador** com acesso a máquinas distintas — surge a necessidade
   de admitir dispositivos e revogar acesso por dispositivo.
4. **Rede de escritório ou VPN** corporativa.
5. **Conformidade contratual** que exija controle de admissão de dispositivo
   (cliente enterprise, auditoria de segurança formal).

**Nesses cenários, o equivalente mínimo** (não é NAC completo, mas é o que
importa):

- **SSH por chave, sem senha**, porta não padrão, `fail2ban`, root sem login direto.
- **Firewall de host** (ufw/nftables) com *default deny inbound*, exceto 443.
- **IP allowlist no banco** (`pg_hba.conf` ou *network restrictions* do provedor):
  só os IPs de egress da aplicação e do operador.
- **Tailscale/WireGuard** para acesso administrativo — o mesmo movimento que
  [`ZTNA.md`](./ZTNA.md) descreve para o cenário de acesso interno.
- **2FA obrigatório** em todo painel de fornecedor (ação válida **hoje**, ver
  [`IAM_IGA.md`](./IAM_IGA.md) §7, item 1).

---

## 5. Conclusão

NAC **não se aplica** e não deve constar como controle pendente em relatório de
conformidade — listá-lo como "não implementado" sugeriria uma lacuna onde há
apenas ausência de escopo. O que **deve** constar é o que realmente falta na
camada de borda: **WAF/Cloudflare não configurado** e **rate limit sem estado
compartilhado**, ambos registrados em `THREAT_MODELING.md` (I1, D2, E4).
