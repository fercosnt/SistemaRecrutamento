---
id: 36-resend-chave-divergencia
created: 2026-07-22
source: Phase 36 (DELIV-02) — decisão de chave dedicada + 36-RESEARCH.md Pitfall 9
priority: medium
resolves_phase: null
tags: [comm-36, resend, vault, deliverability, debito-tecnico]
---

# Divergência de credencial Resend — `cost-alerter` fora do Vault + TLD `.app` não confirmado

A Phase 36 (DELIV-02) estabeleceu que a chave Resend **de notificações ao candidato**
vive apenas no Supabase Vault (segredo `resend_api_key`), lida em runtime por
`public.ler_resend_api_key()` (migration `20260722000001_p36_vault_resend_reader.sql`,
`SECURITY DEFINER`, execução só para `service_role`).

Isso **não** é a única credencial Resend do projeto. Existe um consumidor Resend
anterior — o `cost-alerter` — que continua fora do Vault, por **decisão travada do
usuário** (36-CONTEXT.md § "DECISÃO DO USUÁRIO — chave dedicada"): chave dedicada
nova para notificações, blast radius separado, `cost-alerter` intocado.

Este arquivo registra os dois débitos que essa decisão deixa em aberto. Nenhum dos
dois é bug introduzido pela Phase 36.

**Files:**
- `supabase/functions/cost-alerter/index.ts:208` (leitura de `RESEND_API_KEY` via `Deno.env.get`)
- `supabase/functions/cost-alerter/index.ts:214-216` (`COST_ALERTER_FROM` / `COST_ALERTER_TO` com defaults `alertas@beautysmile.app` / `dpo@beautysmile.app`)
- `supabase/migrations/20260722000001_p36_vault_resend_reader.sql` (o novo caminho, Vault-only)

---

## Item A — duas fontes de verdade para credencial Resend

`supabase/functions/cost-alerter/index.ts:208` lê `RESEND_API_KEY` como **env secret
da Edge Function**, enquanto a chave de notificações da P36 mora **apenas no Vault**.
São dois mecanismos de custódia distintos para credenciais do mesmo provedor.

**Levantamento do estado real dos EF secrets (2026-07-22).** Comando executado:

```bash
npx supabase secrets list --project-ref isljnozzlvckrgjjbjwp
```

> Nota: a flag `--linked` do plano não existe na CLI 2.53.6 instalada
> (`unknown flag: --linked`) e o projeto não está linkado localmente
> (`supabase/.temp/project-ref` ausente) — usado `--project-ref` com o ref extraído
> de `VITE_SUPABASE_URL`.

Resultado (**presença apenas — nenhum valor e nenhum digest transcrito aqui**):

| Secret | Presente em PROD? |
|--------|-------------------|
| `RESEND_API_KEY` | **sim** |
| `COST_ALERTER_FROM` | **sim** (override do default está definido) |
| `COST_ALERTER_TO` | **sim** (override do default está definido) |

Ou seja: a credencial Resend do `cost-alerter` está de fato provisionada e viva como
env secret hoje — a divergência não é hipotética.

**Por que não foi corrigido na P36:** escopo travado pelo usuário. O `cost-alerter` é
alerta **interno** (custo de IA para o DPO), não comunicação com candidato; misturar as
duas credenciais desfaria o isolamento de blast radius que a P36 comprou.

**Ação futura sugerida:** migrar o `cost-alerter` para o mesmo padrão Vault + RPC.
Isso exige uma decisão explícita entre (i) uma **segunda** RPC leitora sem argumento
(`ler_cost_alerter_resend_key()`), mantendo o blast radius de um segredo por função, ou
(ii) generalizar a existente para `ler_segredo(text)` — o que a P36 **rejeitou de
propósito** (um comprometimento de `service_role` passaria a ler todos os segredos do
Vault). Recomendação: opção (i). Decidir num milestone de hardening, não aqui.

---

## Item B — `beautysmile.app` provavelmente não é domínio verificado no Resend

O `cost-alerter` envia de `alertas@beautysmile.app` para `dpo@beautysmile.app`
(defaults em `index.ts:214-216`) — TLD **`.app`**, distinto do `.com.br` do produto e do
subdomínio de envio que a P36 verifica (`recruta.beautysmile.com.br`).

Se `beautysmile.app` não estiver verificado na conta Resend, o `POST /emails` responde
**403** e esses alertas internos **vêm falhando silenciosamente**: o código faz graceful
degradation (`.catch` com `console.warn`, `index.ts:209-212` e o `.catch` do `fetch`), a
linha de `recruiter_alerts` é gravada de qualquer forma, e ninguém é notificado da falha
de e-mail. É um **bug latente de entregabilidade, pré-existente** — não introduzido pela
Phase 36, que é apenas a fase natural para *detectá-lo*.

**Ressalva do levantamento acima:** `COST_ALERTER_FROM` e `COST_ALERTER_TO` **estão
definidos** como EF secrets, então os defaults `.app` podem estar sobrescritos em PROD
por endereços de outro domínio. O comando `secrets list` mostra apenas nome + digest,
nunca o valor, então **não é possível confirmar daqui qual domínio está realmente em
uso**. Item marcado como **não confirmado** em vez de assumido nas duas direções.

**Ação futura:**
1. Ler o valor efetivo de `COST_ALERTER_FROM` em PROD (dashboard de Edge Function
   secrets) para saber qual domínio o `cost-alerter` realmente usa hoje.
2. Verificar o status desse domínio no dashboard Resend — ou adaptar
   `scripts/check-resend-dominio.mjs` para aceitar um domínio como argumento
   (hoje ele é opt-in e escopado ao domínio da P36).
3. Decidir entre **verificar o domínio** no Resend ou **trocar o From dos alertas**
   para o domínio de envio já verificado pela P36.

---

## Não-escopo (Phase 36)

- **Nenhuma linha de `supabase/functions/cost-alerter/index.ts` é alterada nesta fase.**
  O arquivo permanece byte-a-byte intocado — verificado por
  `git status --porcelain supabase/functions/cost-alerter/` (vazio).
- Nenhum env secret do `cost-alerter` foi criado, alterado ou removido.
- Nenhum valor nem digest de credencial está registrado neste arquivo.
