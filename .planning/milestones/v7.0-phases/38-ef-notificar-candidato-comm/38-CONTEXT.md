# Phase 38: EF `notificar-candidato` (COMM) - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas, all recommended answers accepted

<domain>
## Phase Boundary

Uma **única** Edge Function `notificar-candidato`, self-authenticating (Bearer via Vault, `--no-verify-jwt`), que dado um payload **ids-only** resolve os dados do candidato por **allowlist explícita de colunas** (nunca `select('*')`), reivindica idempotência contra o ledger `notificacoes_enviadas` (P37), renderiza o template Beauty Smile correto para cada um dos **4 eventos** (confirmação, avanço, convite, decisão), envia via `fetch` plano à API do Resend e grava o resultado de volta no ledger.

Entregue **dormente e deployável** — smoke-testável ponta-a-ponta via `net.http_post` manual a um endereço `resend.dev`, **antes** de qualquer trigger existir (os triggers reais são a Phase 39). O `.ics` do convite é portado **verbatim** do M6 para `_shared/ics.ts`.

**Requirements:** COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06.

**Fora de escopo (Phase 39+):** os triggers reais que auto-disparam a EF (DISPATCH-01..04, P39); a reconciliação de entrega via webhook Resend + varredura `pg_cron` de retry (RECON, P41). Esta fase só entrega a EF + prova por smoke manual.

</domain>

<decisions>
## Implementation Decisions

### Idempotência & contrato de invocação
- `dedupe_key` = `${candidatura_id}:${evento}` — garante 1 e-mail por evento por candidatura. **Exceção:** o **convite** usa `${agendamento_id}:convite` para permitir re-convite legítimo (novo agendamento ⇒ nova `dedupe_key`).
- Reivindicação **claim-before-send**: `INSERT INTO notificacoes_enviadas (..., status='pendente') ON CONFLICT (dedupe_key) DO NOTHING`. Se 0 rows afetadas ⇒ evento já reivindicado ⇒ no-op idempotente (nunca envia duas vezes). Apoia-se no `uq_notif_dedupe UNIQUE (dedupe_key)` que **já existe** em PROD (P37).
- Duplicata que perde o claim ⇒ EF retorna `200 { ok:true, skipped:'duplicate' }` — resposta **idempotente**, nunca 4xx (o trigger não deve enxergar erro numa condição normal).
- Body **ids-only**: `{ evento, candidatura_id, agendamento_id? }`. A EF resolve TODO o resto (nome, e-mail, vaga, data) por allowlist explícita. **Nenhuma PII** viaja no payload do trigger (espelha DISPATCH-04).

### Convite de entrevista `.ics` (COMM-04)
- `.ics` `METHOD` = **PUBLISH** — resolve a questão aberta do roadmap. O gerador M6 (`gerarIcsAgendamento`) já emite `METHOD:PUBLISH`; o port **verbatim** preserva isso e evita a semântica RSVP (ATTENDEE/ORGANIZER/PARTSTAT) que `REQUEST` exigiria.
- Entrega do `.ics` como **anexo** `text/calendar` (base64) no array `attachments[]` do Resend, `filename: entrevista-beautysmile.ics`.
- Gerador portado **verbatim** de `src/features/agendamento/services/agendamentoCandidatoService.ts` (`gerarIcsAgendamento`, função pura, zero npm, TZ `America/Sao_Paulo` já embutida) para `supabase/functions/_shared/ics.ts` — não há import compartilhável cross `src/`↔`supabase/functions/`.
- **Sem** ATTENDEE/ORGANIZER RSVP (coerente com `PUBLISH`).

### Envio ao Resend, ledger write & tratamento de erro
- Ledger em **2 fases**: (1) claim `status='pendente'` (ON CONFLICT DO NOTHING); (2) após `fetch` ao Resend, `UPDATE` para `enviado` + `provider_message_id` **ou** `falhou` + `erro` + `proxima_tentativa_em` (agenda o retry que a P41 vai varrer).
- Resend responde **non-2xx** ⇒ grava `falhou`, agenda retry, e a EF **retorna 200** (fire-and-forget: nunca lança 500 de volta ao trigger — `net.http_post` é at-most-once e um 500 só sumiria silenciosamente). Falha é registrada no ledger, não propagada.
- Captura `provider_message_id` do JSON de resposta do Resend (chave `id`) e grava no ledger — chave de reconciliação do webhook da P41.
- **Sem retry dentro da EF** — at-most-once por invocação. O retry é responsabilidade da varredura `pg_cron` da P41 (usa o índice parcial `(status, proxima_tentativa_em) WHERE status IN ('pendente','falhou')` que já existe).

### Templates Beauty Smile & cópia de rejeição (COMM-05/06)
- Estrutura: **layout compartilhado** em `_shared/email-templates.ts` — 1 wrapper (header com logo + footer LGPD **transacional sem opt-out**, decisão de kickoff) + 4 corpos por evento. **Inline CSS**, table-based (compatibilidade de cliente de e-mail); **não** `@react-email/*` (quebra no Deno edge).
- Logo Beauty Smile via **URL hospedada** (asset público) em `<img>` com `alt` de fallback — imagens de e-mail não podem depender de base64 inline em todos os clientes.
- Cópia de rejeição (COMM-05, **D-15/RNF-07a**): string **neutra, fixa e congelada** — nunca interpola `motivo_rejeicao`, score, percentil, trait ou critério. Base a revisar e congelar no plano: *"Sua candidatura não seguirá para as próximas etapas deste processo seletivo. Agradecemos sinceramente o seu interesse na Beauty Smile e desejamos sucesso na sua trajetória."* O disparo é sempre por **decisão registrada por humano**, nunca por limiar de score.
- **grep-guard** (COMM-06): teste Deno que **falha** se o template de rejeição renderizado contiver qualquer token de scoring/critério — regex ancorado em `score|percentil|trait|motivo|nota|ranking|pontuaç|critério`. Prova por execução que a cópia é neutra.

### Claude's Discretion
- Mapeamento entre os valores do enum `evento` do ledger (`'confirmacao'|'avanco'|'convite'|'decisao'`) e os labels de `EventoNotificacao` de `email-config.ts` (`'candidatura_recebida'|'avaliacao_liberada'|'convite_entrevista'|'decisao_final'`) — a EF faz a tradução; a forma exata (mapa literal vs switch) fica a critério do plano.
- Estrutura interna dos helpers de resposta/CORS/self-auth (copiar de `analise-candidato-individual`/`cost-alerter`).
- Nomes exatos das colunas na allowlist de SELECT (resolvidos contra `database.types.ts` no plano).
- Subject lines de cada um dos 4 e-mails (pt-BR, tom Beauty Smile).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/_shared/email-config.ts` (P36) — contrato **canônico** de remetente (`FROM`, `REPLY_TO`), `resolverModo()` (fail-safe `teste`), `resolverDestinatario()` (desvia p/ `delivered+<evento>@resend.dev` em teste, preserva `destinatario_original`), e o tipo `EventoNotificacao`. **A EF importa daqui** — não reimplementa resolução de remetente/destinatário.
- `supabase/functions/analise-candidato-individual/index.ts` (P10) — **referência direta** de EF self-auth: Bearer do Vault vs service_role, `--no-verify-jwt`, helpers `jsonResponse`/`errorResponse`/CORS, allowlist explícita (nunca `select('*')`), try/catch envolvendo tudo com gravação de `falhou` (invariante never-absent). Mirror deste padrão.
- `supabase/functions/cost-alerter/index.ts` — precedente de self-auth Bearer + `fetch` a API externa (Resend) sem SDK.
- `src/features/agendamento/services/agendamentoCandidatoService.ts::gerarIcsAgendamento` (M6) — função pura RFC-5545, `PRODID:-//Beauty Smile//Recrutamento//PT-BR`, `METHOD:PUBLISH`. **Portada verbatim** para `_shared/ics.ts`.
- Ledger `notificacoes_enviadas` (P37, vivo em PROD): 18 colunas, `uq_notif_dedupe UNIQUE (dedupe_key)`, `CHECK (evento IN ('confirmacao','avanco','convite','decisao'))`, enum `status_notificacao` = `pendente|enviado|entregue|falhou|bounce|reclamado`, índice parcial de retry `(status, proxima_tentativa_em)`, `destinatario_original` **NOT NULL** (obrigatório no tipo Insert), FKs `ON DELETE CASCADE` p/ candidatos/candidaturas.
- RPC `ler_resend_api_key()` (P36) — leitora do Vault, sem argumento; a EF chama via service-role.

### Established Patterns
- EFs privilegiadas: self-auth Bearer via Vault + `--no-verify-jwt` (mirror `analise-candidato-individual`).
- Dependências externas como import **estático** `npm:`/`esm.sh` no topo (o `["npm:",pkg].join("")` runtime-constructed escondia o pacote do deploy → `ERR_MODULE_NOT_FOUND`). **Meta desta fase: zero npm novo** — `fetch` plano ao Resend, não o SDK.
- Segurança de logs: só ids/counts/error.code — nunca e-mail, nome, corpo do template ou valor de segredo.
- Migrations/DB e deploy de EF via MCP são **checkpoint do orquestrador** (subagentes GSD não recebem tools MCP do Supabase — bug upstream). O deploy `--no-verify-jwt` e o smoke `net.http_post` fecham como checkpoint do main thread.

### Integration Points
- A EF é o **alvo** dos triggers da P39 (que ainda não existem) — nesta fase ela é invocada só por `net.http_post` manual.
- Lê Vault (`RESEND_API_KEY` via RPC, `project_url`, `edge_invoke_key`) — **nunca** o aposentado `n8n_webhook_base`.
- Grava em `notificacoes_enviadas`; lê `candidatos`/`candidaturas`/`vagas`/`agendamentos_entrevista` por allowlist.

</code_context>

<specifics>
## Specific Ideas

- `.ics` `METHOD:PUBLISH` é o valor do M6 e é o que sai do port verbatim — a "questão aberta" do roadmap fica resolvida por consistência, não por reabertura.
- Cópia de rejeição congelada com grep-guard executável é o coração do D-15 — a neutralidade é **provada por teste**, não por revisão de leitura.
- Smoke E2E (COMM-01 critério 4): `net.http_post` manual → e-mail correto a `delivered+<evento>@resend.dev` → linha `enviado` no ledger, com a EF ainda dormente (sem trigger).

</specifics>

<deferred>
## Deferred Ideas

- Reconciliação de entrega (webhook Resend Svix) + varredura `pg_cron` de retry + state machine `pendente→enviado→entregue/falhou/bounce` → **Phase 41 (RECON)**.
- Os triggers reais que auto-disparam a EF nas transições do funil → **Phase 39 (DISPATCH)**.
- Nota estruturada do RH na rejeição (RNF-SLA-06), deep-link CTAs, re-envio manual pelo RH → **M7-v2/backlog** (droppados do v1 no kickoff).
- Verificação do caminho de aprovação (`etapa_atual='aprovado'` vs só `decisao_final`) → resolver no discuss da **Phase 39** (afeta o predicado do CASE, não a EF).

</deferred>
