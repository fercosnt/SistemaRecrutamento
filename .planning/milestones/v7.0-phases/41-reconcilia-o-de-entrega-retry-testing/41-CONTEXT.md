# Phase 41: Reconciliação de Entrega, Retry & Testing - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, todas aceitas nas recomendações

<domain>
## Phase Boundary

Fecha o loop fire-and-forget do pipeline de notificação e o torna seguro para tráfego real —
**última fase do M7**. Entrega três mecanismos ortogonais sobre a `notificacoes_enviadas` já
existente (P37) e a EF `notificar-candidato` já viva (P38) + os triggers canônicos já vivos (P39):

1. **EF webhook do Resend** (assinatura Svix verificada) que reconcilia o `status` por
   `provider_message_id` nos eventos `email.delivered`/`email.bounced`/`email.complained`
   (RECON-01, RECON-02).
2. **Varredura `pg_cron`** que re-dispara linhas `pendente`/`falhou` sob cap de `tentativas`,
   como rede de segurança para a janela ~6h do `net._http_response` (RECON-03).
3. **Testes CI** com sender do Resend mockado (sem chave viva) + guard de destinatário non-prod,
   e um UAT ao vivo via `*@resend.dev` (RECON-02, RECON-03).

**Fora de escopo:** supressão automática de bounces/complaints (lista de exclusão) — deferido a
LGPD-OPS/M8+. Retenção/purga do ledger — deferido a LGPD-OPS/M8+.
</domain>

<decisions>
## Implementation Decisions

### Área 1 — Retry sweep (`pg_cron`, RECON-03)
- **Cadência:** varredura a cada **15 min** (dentro da janela ~6h do `net._http_response`).
- **Cap de tentativas:** **5** — após isso a linha permanece `falhou` (sem retry infinito).
- **Backoff:** **exponencial** via `proxima_tentativa_em` (≈15m → 1h → 6h → 24h), com teto.
- **Mecanismo:** a varredura **re-invoca a EF `notificar-candidato` em modo retry** (reusa o
  caminho de envio já provado), NÃO re-POSTa ao Resend em paralelo. A EF precisa de um entrypoint
  de retry que RE-tente uma linha `pendente`/`falhou` existente (em vez de colapsar em
  `skipped:duplicate` pelo `dedupe_key`). Seleção: `status IN ('pendente','falhou')
  AND tentativas < 5 AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= now())`
  — cobre o índice parcial vivo `idx_notif_retry`.

### Área 2 — Webhook EF + delivery/bounce/complaint (RECON-01, RECON-02)
- **Verificação de assinatura:** **Svix** (import `npm:` **estático** no topo — Pitfall do
  `.join("npm:")`), EF com `verify_jwt=false` (webhook público, self-auth pela assinatura Svix).
- **Mapeamento evento → status:** `email.delivered` → `entregue` (+ `entregue_em`);
  `email.bounced` → `bounce` (+ `bounce_em`); `email.complained` → `reclamado` (+ `reclamado_em`).
- **Colunas novas:** migration aditiva adiciona **`reclamado_em`** (deferido da P37) **+ `bounce_em`**
  `timestamptz` NULL. (`enviado_em`/`entregue_em` já existem; `status_notificacao` já tem
  `bounce`/`reclamado`.)
- **Matching:** por `provider_message_id`; evento com id desconhecido é ignorado graciosamente
  (log, sem erro). Idempotência: um webhook repetido para o mesmo id/status é no-op.
- **Segredo de assinatura:** no **Vault** (novo secret, ex.: `resend_webhook_secret`), espelhando
  o padrão de `resend_api_key`; a EF lê via service-role.

### Área 3 — Testing & safety (RECON-02, RECON-03)
- **CI:** **mockar o `fetch` do Resend** (sem chave viva) + unit-tests da verificação de assinatura
  e do mapeamento evento→status. Deno test para a EF; Vitest para qualquer utilitário `src/` (não
  previsto — é tudo backend EF).
- **Guard de destinatário non-prod:** **hard-fail** em modo `teste` se o destinatário não for um
  sink `*@resend.dev` (estende `_shared/email-config.ts`, que já redireciona em modo teste).
- **UAT ao vivo:** `delivered@`/`bounced@`/`complained@resend.dev` exercitando a reconciliação
  ponta-a-ponta — **DEFERIDO atrás de DELIV-01** (domínio `rh.beautysmile.com.br` não verificado).
- **Rate limits:** o planner/research **verifica os números de free-tier/rate-limit do Resend na
  doc** antes de fixar a cadência/batch-size da varredura (questão aberta do ROADMAP).

### Claude's Discretion
- Forma exata do entrypoint de retry da EF (flag no body vs. rota dedicada), tamanho de batch da
  varredura, nomes internos de funções/arquivos, e a curva exata do backoff dentro do teto — à
  discrição do executor, respeitando as decisões acima.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`notificacoes_enviadas`** (P37) já é retry-ready: `tentativas` (default 0),
  `proxima_tentativa_em`, `enviado_em`, `entregue_em`, `ultimo_erro`, `provider_message_id`,
  `status` (enum `status_notificacao`: pendente/enviado/entregue/falhou/bounce/reclamado).
  Índice parcial vivo `idx_notif_retry btree (proxima_tentativa_em) WHERE status IN
  ('pendente','falhou')`.
- **EF `notificar-candidato`** (P38, ACTIVE v2, verify_jwt=false) — caminho de envio provado
  (claim-before-send + ledger 2-fase). A varredura de retry a reusa.
- **`_shared/email-config.ts`** — contrato de remetente/modo/destinatário; já redireciona a
  `*@resend.dev` em modo teste. O guard non-prod estende este módulo.
- **pg_cron já usado no repo** (`20260609000003_prompt_library_cron.sql`) — precedente de
  `cron.schedule` a copiar.
- **Padrão EF self-auth via Vault** (`analise-candidato-individual`, `notificar-candidato`) — base
  para a leitura do `resend_webhook_secret` do Vault na EF de webhook.
- **Migrations PROD** via MCP `apply_migration` + reconcile do ledger (precedente P37-04/P39-04).

### Established Patterns
- Import `npm:` **estático** no topo da EF (Svix) — nunca `.join("npm:")` (Pitfall registrado).
- Segredos só do Vault, nunca hardcoded/logado; EFs privilegiadas com `verify_jwt=false` + auth
  própria (aqui: assinatura Svix).
- Smoke comportamental + gate de contagem (GUC) como prova de migrations (P37/P39).

### Integration Points
- Nova EF `resend-webhook` (nome à discrição) — deploy = **checkpoint do orquestrador** (subagentes
  não recebem MCP Supabase — bug #13898).
- Migration aditiva (`reclamado_em` + `bounce_em`) + `cron.schedule` da varredura = **checkpoint do
  orquestrador** (apply via MCP + reconcile do ledger).
- Registro do endpoint do webhook no dashboard do Resend + provisionamento do `resend_webhook_secret`
  no Vault = **ação humana** (como DELIV-01/UAT-36-2).
</code_context>

<specifics>
## Specific Ideas

- A varredura re-usa a EF (não duplica a lógica de envio) — a EF ganha um modo retry que re-tenta
  linha existente em vez de `skipped:duplicate`.
- O UAT ao vivo completo (delivered/bounced/complained) só fecha **depois** de DELIV-01 (domínio
  verificado). Enquanto aberto, os sends do funil gravam `falhou` e a varredura os acumula até o cap
  — exatamente o cenário que esta fase resolve quando o domínio for verificado.
- Verificar rate-limit do Resend na doc oficial ANTES de fixar cadência (nota do ROADMAP).
</specifics>

<deferred>
## Deferred Ideas

- **Supressão automática** de destinatários com bounce/complaint (lista de exclusão) → LGPD-OPS/M8+.
- **Retenção/purga** de `notificacoes_enviadas` → LGPD-OPS/M8+.
- Tratamento de `email.delivery_delayed` (só delivered/bounced/complained no v1).
- Nudge de bounce no painel do candidato → M7-v2/backlog (já deferido no kickoff).
</deferred>
