# Requirements: Sistema de Recrutamento Beauty Smile — M7 (v7.0) Comunicação com o Candidato (COMM)

**Defined:** 2026-07-17
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir sobre candidatos num único sistema rastreável com scores comparáveis.
**Milestone goal:** O funil já *anda* pela mão do RH (M6); o M7 faz o candidato **saber** que ele anda — pipeline de notificação transacional por e-mail (Resend) disparado nas transições do funil + timeline de prazo no painel — aposentando o n8n pessoal (resolve SEC-03 por substituição).

> **Invariantes preservadas em toda fase:** RNF-07a (humano decide, sistema nunca auto-decide por score) · RNF-12a ("avaliação comportamental/cognitiva", nunca "teste psicológico") · D-15 (mensagem de rejeição neutra — critério/score NUNCA exposto) · disciplina PII allowlist (nunca `select('*')` candidate-facing; RLS é row-level, não segredo de coluna).
>
> **Decisões travadas no kickoff (2026-07-17):** Provedor = **Resend** · 4 eventos (confirmação, avanço, convite, decisão/rejeição) · LGPD = **transacional sem opt-out** · timeline no painel = **incluída** · nota livre do RH na rejeição (RNF-SLA-06) = **droppada do v1** (template neutro fixo) · reconciliação de entrega = **completa (webhook + pg_cron)** · knockout = **suprime a confirmação** (survivor-guard) · retenção do log = **decidir no discuss-phase**.

## v1 Requirements

Requirements for the M7 release. Each maps to exactly one roadmap phase (Phases 36+).

### DELIV — Identidade de remetente & entregabilidade

- [x] **DELIV-01**: O domínio de envio Beauty Smile (subdomínio dedicado) está verificado no Resend com SPF/DKIM (auto) + DMARC (publicado manualmente), e o From/Reply-To reais estão definidos — sem isso todo e-mail cai em spam. *(Human/DNS gate — ação do Fernando; codificação/teste procede em paralelo via `resend.dev`.)*
- [x] **DELIV-02**: A `RESEND_API_KEY` vive no Supabase Vault (nunca no bundle client, nunca em `VITE_` env); nenhuma chave/URL de provedor aparece no bundle público.
- [x] **DELIV-03**: Dev/CI enviam via os endereços de teste do Resend (`delivered@`/`bounced@`/`complained@resend.dev`) com o sender mockado nos unit tests (CI não requer chave viva e nunca spama candidato real).

### COMM — Notificações transacionais (o núcleo)

- [ ] **COMM-01**: Existe a Edge Function `notificar-candidato` (server-triggered, self-auth Bearer via Vault, `--no-verify-jwt`), que resolve os dados do candidato por **allowlist explícita** (nunca `select('*')`), renderiza o template e envia via `fetch` à API do Resend, gravando o resultado no ledger.
- [ ] **COMM-02**: O candidato recebe e-mail de **confirmação de candidatura recebida** ao submeter — **exceto** quando a candidatura já nasce auto-rejeitada por knockout síncrono (survivor-guard suprime a confirmação; só a rejeição neutra é enviada).
- [ ] **COMM-03**: O candidato recebe e-mail de **avanço p/ avaliação assíncrona** ("sua próxima etapa está liberada") quando a candidatura transiciona para a etapa de avaliação.
- [ ] **COMM-04**: O candidato recebe e-mail de **convite de entrevista** com data/hora em `America/Sao_Paulo`, local/link e um anexo `.ics` (RFC-5545) — o gerador do M6 é portado verbatim para `_shared/ics.ts` (função pura, sem novo npm).
- [ ] **COMM-05**: O candidato recebe e-mail de **decisão ≤24h** (aprovado ou rejeitado) com **template neutro fixo** — D-15: nunca interpola `motivo_rejeicao`/score/percentil/trait; o disparo é gatilhado por uma decisão registrada por humano (RNF-07a), nunca por limiar de score.
- [ ] **COMM-06**: Os 4 templates HTML são hand-rolled com identidade Beauty Smile em `_shared/email-templates.ts` (inline CSS; **não** react-email, que quebra no Deno edge); a cópia do template de rejeição (COMM-05) passa por revisão e é congelada antes do fecho.

### LEDGER — Auditoria, idempotência & fila (`notificacoes_enviadas`)

- [x] **LEDGER-01**: Existe a tabela `notificacoes_enviadas` registrando cada disparo (evento, candidatura, candidato, template, `status`, `provider_message_id`, erro, timestamps) — audit trail + base do rastreamento de entrega.
- [x] **LEDGER-02**: O envio é idempotente por um `UNIQUE(dedupe_key)` durável — a chave inclui `etapa_destino`/`agendamento_id` de modo que um retrocede-then-readvance ou reagendamento **legítimo** re-notifica (não é suprimido), enquanto retries do mesmo evento não duplicam; a EF faz claim `ON CONFLICT DO NOTHING RETURNING` antes de enviar, com o header `Idempotency-Key` do Resend como cinto secundário de 24h.
- [x] **LEDGER-03**: A RLS de `notificacoes_enviadas` é RH **vaga-scoped join-through** (espelha `rh_gerencia_agendamento`) e **candidato-DENY** (nenhuma policy de candidato) — o log de PII do candidato nunca é legível candidate-side.

### DISPATCH — Gatilhos & aposentadoria do n8n (SEC-03)

- [ ] **DISPATCH-01**: Um trigger `AFTER INSERT ON historico_candidatura` com `CASE` sobre `etapa_para` é a **fonte canônica única** dos eventos de transição (avanço = COMM-03; decisão = COMM-05, unificando aprovado/rejeitado/knockout via `etapa_atual`) — corpo ids-only, zero PII, graceful-skip.
- [ ] **DISPATCH-02**: Triggers satélites em `AFTER INSERT ON candidaturas` (confirmação = COMM-02) e `AFTER INSERT ON agendamentos_entrevista` (convite = COMM-04) cobrem os eventos que **não** são transições de etapa (o `avancar_etapa()` só dispara em UPDATE de `etapa_atual`).
- [ ] **DISPATCH-03**: Os 3 triggers n8n do SEC-03 são **removidos (DROP)** e o disparo por env-var do `submit-candidatura` é aposentado — no **mesmo phase** que cria os novos triggers (aposenta o n8n pessoal, resolve **SEC-03 por substituição**, sem deixar superfície de disparo dupla ativa).
- [ ] **DISPATCH-04**: O hop trigger→EF autentica por Vault Bearer self-auth (mirror do `analise-candidato-individual`) — a EF não é um endpoint de envio público/spoofable, e o corpo do `net.http_post` carrega só ids (nenhuma PII no payload do trigger).

### RECON — Reconciliação de entrega, retry & bounce

- [ ] **RECON-01**: `notificacoes_enviadas` implementa a state machine `pendente → enviado → entregue/falhou/bounce` — o status reflete o resultado real do envio (o funil avança independentemente; o e-mail nunca carrega estado sozinho).
- [ ] **RECON-02**: Uma EF de webhook do Resend (assinatura Svix verificada) atualiza o status por `provider_message_id` nos eventos `email.delivered`/`email.bounced`/`email.complained` — rastreamento durável de entrega/bounce.
- [ ] **RECON-03**: Uma varredura `pg_cron` re-tenta as linhas `pendente`/`falhou` (tentativas-capped) como rede de segurança para a janela de ~6h do `net._http_response` (o `net.http_post` é fire-and-forget/at-most-once).

### TIMELINE — Estimativa de prazo no painel do candidato

- [x] **TIMELINE-01**: Existe a tabela estática `config_sla_etapa` (non-PII, public-read) com o SLA/prazo esperado por etapa, seedada a partir dos prazos do PRD (§5.1.1).
- [ ] **TIMELINE-02**: O `DashboardCandidatoPage` mostra, em cada estado de espera, a estimativa de prazo da etapa atual ("triagem — resposta em até X dias úteis"), enquadrada explicitamente como **estimativa**, nunca como countdown rígido.

## v2 Requirements (deferidos — rastreados, fora do roadmap M7)

### COMM+

- **COMM-V2-01**: Nota estruturada do RH na rejeição (RNF-SLA-06) atrás de guardrail de frases pré-aprovadas — reintrodução controlada do que foi droppado do v1.
- **COMM-V2-02**: Lembretes recorrentes "nudge a cada N dias" em estados de espera longos (RNF-SLA-03).
- **COMM-V2-03**: CTAs deep-link no e-mail apontando direto p/ a tela certa do painel (não login pelado).
- **COMM-V2-04**: Re-envio manual de notificação pelo RH a partir do ledger.

### TIMELINE+

- **TIMELINE-V2-01**: Estimativa de prazo **computada** a partir do histórico real (`historico_candidatura`), com piso no SLA estático — só quando o volume justificar.

### UX+

- **UX-V2-01**: Nudge no painel quando um bounce duro é registrado ("seu e-mail não chegou — confira o cadastro").

## Out of Scope (exclusões explícitas)

| Feature | Reason |
|---------|--------|
| WhatsApp / SMS | PRD deixa WhatsApp manual; o canal do M7 é e-mail + painel (canônico). → M8+ |
| Opt-out / descadastro / central de preferências | E-mail é **transacional** (parte do serviço que o candidato pediu), não marketing — decisão travada no kickoff |
| E-mails de marketing / nurture / digest | Fora do escopo transacional; risco LGPD de reclassificação |
| Parsing de resposta (two-way) / read-receipts ao candidato | Complexidade alta, sem valor core; o painel é a verdade canônica |
| Estimativa de prazo computada do histórico | Volume insuficiente hoje; SLA estático é o v1 honesto (→ TIMELINE-V2-01) |
| `@react-email/*` para templates | Incompatível com o Deno edge runtime (MessageChannel/JSX/eval) — HTML hand-rolled no lugar |
| Fila/broker externo (BullMQ/Redis/QStash/pgmq) | Overkill p/ 4 eventos neste volume — `notificacoes_enviadas` + pg_net + pg_cron são a fila leve |

## Open Questions (resolver no discuss-phase da fase relevante)

- **Retenção de `notificacoes_enviadas`** (minimização LGPD) — janela de purga vs purge-exempt; decidir ao planejar a fase de dados (**Phase 37 / LEDGER**).
- **Verificação do caminho de aprovação** — COMM-05/DISPATCH-01 keyam na transição terminal em `historico_candidatura`; a rejeição comprovadamente seta `etapa_atual='rejeitado'`, mas o caminho de **aprovação** precisa de um check de 1 query (se só escreve `decisao_final` sem mover `etapa_atual='aprovado'`, um trigger satélite em `decisao_final` é necessário p/ aprovações). Resolver antes de finalizar o predicado do CASE (**Phase 39 / DISPATCH**).
- **Números exatos de rate-limit / free-tier do Resend** — verificar no dashboard vivo antes de qualquer premissa de volume de campanha (**Phase 41 / RECON**).
- **`.ics` METHOD** — PUBLISH vs REQUEST na semântica do convite (**Phase 38 / COMM/convite**).

## Traceability

Mapeamento requisito → fase. Preenchido pelo roadmapper (Phases 36–41).

| Requirement | Phase | Status |
|-------------|-------|--------|
| DELIV-01 | Phase 36 | Complete |
| DELIV-02 | Phase 36 | Complete |
| DELIV-03 | Phase 36 | Complete |
| LEDGER-01 | Phase 37 | Complete |
| LEDGER-02 | Phase 37 | Complete |
| LEDGER-03 | Phase 37 | Complete |
| TIMELINE-01 | Phase 37 | Complete |
| COMM-01 | Phase 38 | Pending |
| COMM-02 | Phase 38 | Pending |
| COMM-03 | Phase 38 | Pending |
| COMM-04 | Phase 38 | Pending |
| COMM-05 | Phase 38 | Pending |
| COMM-06 | Phase 38 | Pending |
| DISPATCH-01 | Phase 39 | Pending |
| DISPATCH-02 | Phase 39 | Pending |
| DISPATCH-03 | Phase 39 | Pending |
| DISPATCH-04 | Phase 39 | Pending |
| TIMELINE-02 | Phase 40 | Pending |
| RECON-01 | Phase 41 | Pending |
| RECON-02 | Phase 41 | Pending |
| RECON-03 | Phase 41 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21 ✓ (Phase 36: 3 · Phase 37: 4 · Phase 38: 6 · Phase 39: 4 · Phase 40: 1 · Phase 41: 3)
- Unmapped: 0 ✓

**Nota de mapeamento:** `TIMELINE-01` (a tabela `config_sla_etapa` + seed) aterrissa na **Phase 37** (camada de dados — todas as migrations juntas, e a P40 lê essa tabela seedada); `TIMELINE-02` (a superfície no `DashboardCandidatoPage`) é a **Phase 40**. `COMM-02..05` (a EF produz o e-mail correto por evento, provável via `net.http_post` manual) ficam na **Phase 38**; `DISPATCH-01..04` (os triggers reais auto-disparam esses eventos nas transições do funil) ficam na **Phase 39** — a composição ponta-a-ponta "candidato recebe automaticamente" é verificada nas Phases 39/41.

---
*Requirements defined: 2026-07-17*
*Last updated: 2026-07-17 after M7 (COMM) roadmap — traceability preenchida (21/21 mapeados, 0 unmapped)*
