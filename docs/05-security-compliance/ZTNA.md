# ZTNA — Zero Trust Network Access

**Projeto:** Currículo Político · **Data:** 2026-10-12
**Status:** ❌ **não se aplica** — não existe acesso de rede interna a proteger.

> Documento curto por decisão. ZTNA (substituir a VPN por acesso por aplicação,
> com verificação de identidade e de postura a cada conexão, via *connector* na
> rede interna) protege **serviços privados** de uma **rede privada**. Este
> projeto não tem nenhum dos dois.

---

## 1. Por que ZTNA não se aplica

| Pré-requisito de ZTNA | Existe neste projeto? |
|---|---|
| Serviço **privado** acessível só por rede interna (intranet, banco interno, ERP, painel de admin on-prem) | ❌ Não |
| Rede corporativa com *connector*/agente a instalar | ❌ Não |
| VPN de acesso remoto a ser substituída | ❌ Não |
| Diretório corporativo (IdP) para decidir identidade | ❌ Não |
| População de usuários internos (funcionários) | ❌ Não |
| Política de postura de dispositivo | ❌ Não |

Não há **nenhum serviço que não seja público na Internet**. A aplicação é
servida pela Vercel em HTTPS público; o banco é gerenciado pelo Supabase com
endpoint público protegido por credencial; o código está em repositório público.
Não existe "intranet" a esconder atrás de um *connector*.

**Detalhe importante:** o oposto também é verdade — a *superfície de
administração* do projeto hoje é composta por **painéis de terceiros**
(Vercel, Supabase, GitHub, Google), todos acessíveis de qualquer lugar do mundo
por HTTPS. Isso **não é** um caso de ZTNA; é um caso de **MFA obrigatório e
revisão de acesso**, tratado em [`IAM_IGA.md`](./IAM_IGA.md) §6.2 e §7.

---

## 2. O que existe no lugar: o "zero trust" que já está no código

Curiosamente, a arquitetura deste projeto já é **mais zero-trust do que a média**
— não por adoção de produto ZTNA, mas por não ter perímetro:

| Princípio de Zero Trust | Como aparece aqui |
|---|---|
| "Nunca confie na rede, verifique sempre" | Todo request passa por **middleware** que aplica rate limit e headers, **independentemente** de origem (`middleware.ts` L114–151) |
| "Autentique e autorize por requisição" | `getServerSession` é chamado **em cada handler** de escrita — não há sessão implícita por estar "dentro da rede" |
| "Privilégio mínimo" | ⚠️ **Aqui falha.** Não há papéis e a credencial de banco é única e total ([`RBAC.md`](./RBAC.md), [`RLS.md`](./RLS.md) §2) |
| "Assuma a violação" | ❌ Não há detecção de intrusão, SIEM nem alerta; Sentry está dormente |
| "Microssegmentação" | Não se aplica — não há segmento a dividir |
| "Verificação de postura do dispositivo" | Não existe e **não é aplicável**: o dispositivo é de terceiro (navegador do público) |

A leitura correta: **a ausência de perímetro já entrega o efeito que ZTNA
promete** para o tráfego de usuário final. O que falta não é ZTNA — é
**identidade forte no operador** e **privilégio mínimo no banco**.

---

## 3. O equivalente aplicável deste projeto (o que ZTNA seria, aqui)

O único lugar onde um "acesso privilegiado a serviço privado" existe é o
**banco de produção**, e o controle correto para ele **não** é um *connector*
ZTNA — é:

| Controle | Onde | Estado |
|---|---|---|
| TLS obrigatório em toda conexão | Supabase (HTTPS/`sslmode`) | ✅ Por padrão |
| **Papel de banco de privilégio mínimo** (`cp_runtime` vs. `cp_etl`) | PostgreSQL | ❌ **Não existe** — desenho em [`RLS.md`](./RLS.md) §6, Passo 1 |
| **IP allowlist / network restrictions no banco** | Supabase | ❌ **Não configurado / não verificado**; disponível apenas em plano pago |
| Rotação de credenciais documentada | Vercel + Supabase | ❌ **Não existe** — procedimento em [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) §5 |
| **2FA nas contas de painel** (Vercel, Supabase, GitHub, Google) | Provedores | ⚠️ **não verificado** (estado de conta, não de repositório) — é a ação de maior retorno e menor custo |
| Trilha de auditoria de operação de dados | — | ❌ Não existe |
| Acesso de emergência (*break-glass*) documentado | — | ❌ Não existe |

**Alternativa pragmática e alinhada a Zero Trust, se um dia houver servidor
próprio:** Tailscale/WireGuard para acesso administrativo, com SSH por chave e
`default deny` — isso é ZTNA de fato, com custo quase zero, e só passa a fazer
sentido quando existir host sob controle do projeto ([`NAC.md`](./NAC.md) §4).

---

## 4. O que tornaria ZTNA necessário

Gatilhos concretos:

1. **Servidor/VPS próprio** com SSH exposto ou painel de administração — o
   cenário avaliado e **descartado** em
   [`AVALIACAO_ALTERNATIVAS.md`](../06-devops-deployment/AVALIACAO_ALTERNATIVAS.md) §3.2 (VPS + Coolify).
2. **Painel administrativo interno** hospedado em ambiente privado, com acesso
   restrito à equipe — se o RBAC de [`RBAC.md`](./RBAC.md) for implementado **e**
   o painel for separado da aplicação pública.
3. **Banco self-hosted** em rede privada, com necessidade de acesso de
   desenvolvedores sem expor a porta.
4. **Equipe distribuída** que precise acessar recursos internos de dispositivos
   não gerenciados.
5. **Contrato/auditoria** que exija controle de acesso a serviço interno.

Enquanto nenhum desses existir, adotar ZTNA seria comprar um *connector* para
uma rede que não existe.

---

## 5. Conclusão

ZTNA **não se aplica** e não deve aparecer como controle pendente em relatório
de conformidade. O controle equivalente e necessário **hoje** é mais barato e
mais chato: **2FA nos painéis de fornecedor, papéis de banco com privilégio
mínimo, rotação de credenciais e trilha de auditoria de operação de dados** —
todos listados em [`IAM_IGA.md`](./IAM_IGA.md) §7.
