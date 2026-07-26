# Phase 39: Rewire dos Triggers & Aposentadoria do n8n (SEC-03) - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning

> ⚠ **GATED — não executar o apply em PROD antes do smoke da P38 (UAT-38-1).** Este CONTEXT foi
> escrito com a P38 ainda não deployada e o `resend_api_key` ausente do Vault (verificado ao vivo
> 2026-07-26). Planejar (escrever migration/SQL, diffar corpos) é seguro e read-only; o **execute**
> da P39 (apply da migration) só pode aterrissar depois que a EF `notificar-candidato` estiver viva
> e provada — os triggers precisam de um alvo EF real (senão disparam num 404 silencioso;
> `net.http_post` é at-most-once). Cadeia estrita 38 → 39.

<domain>
## Phase Boundary

Os eventos reais do funil passam a **auto-disparar** a EF `notificar-candidato` (P38) a partir de
uma **fonte canônica única por evento**, e o **n8n pessoal é aposentado no MESMO phase** (SEC-03
resolvido por substituição, não patch). Escopo fechado:

1. **CREATE de 3 triggers novos** (todos `AFTER INSERT`, self-auth Bearer, corpo ids-only):
   - 1 trigger `CASE` em `historico_candidatura` (cobre `avanco` + `decisao`)
   - 1 satélite em `candidaturas` (confirmação, com survivor-guard)
   - 1 satélite em `agendamentos_entrevista` (convite, carrega `agendamento_id`)
2. **DROP de 4 triggers n8n + 4 funções** (SEC-03 x3 + o 4º de `candidatos`)
3. **Remoção do disparo n8n do `submit-candidatura`** (webhook fire-and-forget LIVE, hardcoded)

Tudo numa **única migration atômica** (sem janela de double-send), respaldada pelo
`UNIQUE(dedupe_key)` durável da P37. **Fase de maior risco do milestone.**

**Fora de escopo:** qualquer mudança na EF `notificar-candidato` (P38 fechada); reconciliação de
entrega / retry / webhook Resend / pg_cron (P41); a timeline do painel (P40, já feita).

</domain>

<decisions>
## Implementation Decisions

### Mapeamento evento → trigger (empírico, PROD-verified 2026-07-26)

- **D-01 (`avanco`):** dispara **SÓ** quando `historico_candidatura.etapa_para = 'avaliacao_assincrona'`.
  Decisão de produto (Fernando): só o CTA da avaliação assíncrona. `triagem` e `decisao_final` (etapa 6,
  "em análise") são estados internos do RH sem ação do candidato → sem e-mail; `entrevista_online`/
  `entrevista_presencial` têm o e-mail próprio (convite, via agendamento). Casa com COMM-03 literal.
- **D-02 (`decisao`):** dispara no `historico_candidatura` com
  `etapa_para IN ('aprovado','rejeitado') AND auto_rejeitado = false`. **1 trigger CASE cobre aprovado
  E rejeitado; NENHUM satélite em `decisao_final` é necessário** — verificado: `registrar_decisao()`
  na aprovação faz `UPDATE candidaturas SET etapa_atual='aprovado'` → dispara `avancar_etapa()` →
  grava a linha de `historico_candidatura` com `etapa_para='aprovado'` (idem rejeição). O
  `em_espera` NÃO muda etapa → NÃO gera linha de histórico → corretamente sem e-mail.
- **D-03 (`confirmacao`):** dispara em `candidaturas AFTER INSERT`, com **survivor-guard**: suprime
  quando a candidatura nasce auto-rejeitada por knockout. (Coexiste com o já-vivo
  `trg_candidaturas_analise` AFTER INSERT — o novo trigger é ortogonal.)
- **D-04 (`convite`):** dispara em `agendamentos_entrevista AFTER INSERT`. O corpo carrega
  `agendamento_id` — a EF **exige** `agendamento_id` quando `evento='convite'` (index.ts:111).

### Knockout / auto-rejeição no cadastro (produto — Fernando)

- **D-05:** candidato auto-reprovado por knockout no cadastro **NÃO recebe NENHUM e-mail**.
  Confirmação suprimida (survivor-guard, D-03) **E** decisão suprimida (guard `auto_rejeitado=false`,
  D-02). Knockout é filtro automático de elegibilidade (`auto_rejeitado=true` na linha de histórico);
  o e-mail de decisão fica reservado a **decisões registradas por humano**. Preserva **RNF-07a**
  (sistema nunca emite veredicto automático) e **D-15** (nada de motivo/score no e-mail).

### E-mail de decisão (produto — Fernando)

- **D-06:** o e-mail de decisão é **ÚNICO e neutro** para aprovado E rejeitado — o veredito real
  vive **só no painel**. **Zero mudança na P38**: a EF já renderiza um único template `decisao_final`
  neutro ("Atualização sobre sua candidatura — {vaga}"), **sem** interpolar resultado/motivo/score
  (index.ts:218 passa só nome+vaga; `etapa_atual` é resolvido mas NÃO chega ao template). D-15 por
  construção. Um e-mail de aprovação distinto foi **deferido** (reabriria a P38 — ver `<deferred>`).

### Contrato do evento (P38 EF — imutável)

- **D-07:** o corpo do `net.http_post` carrega EXATAMENTE o vocabulário que a EF aceita:
  `EventoLedger = "confirmacao" | "avanco" | "convite" | "decisao"` (helpers.ts:11; `EVENTOS_VALIDOS`
  em index.ts:58). O trigger envia **só ids** — a EF resolve dados por allowlist e monta o `dedupe_key`
  (`montarDedupeKey(evento, candidatura_id, agendamento_id)`); o convite usa o `agendamento_id` no
  dedupe (1 e-mail por agendamento), os demais 1 por `candidatura_id:evento`.

### Aposentadoria do n8n (escopo do DROP — PROD-verified 2026-07-26)

- **D-08:** DROP dos **4 triggers n8n vivos + suas 4 funções** (todos `enabled='O'`, todos dormentes
  porque o secret `n8n_webhook_base` está ausente do Vault → graceful-skip `RETURN NEW`):
  | Trigger | Tabela | Evento | Função | Origem |
  |---|---|---|---|---|
  | `trg_n8n_nova_candidatura` | `candidaturas` | AFTER INSERT | `trg_n8n_nova_candidatura()` | SEC-03 (`20260706110005`) |
  | `trg_n8n_status_candidatura` | `candidaturas` | AFTER UPDATE OF status | `trg_n8n_status_candidatura()` | SEC-03 |
  | `trg_n8n_revisao_decisao` | `decisao_final` | AFTER UPDATE OF revisao_solicitada_em | `trg_n8n_revisao_decisao()` | SEC-03 |
  | `trg_n8n_novo_candidato` | `candidatos` | AFTER INSERT | `trg_n8n_novo_candidato()` | `20260712100004` (o 4º) |
  **DBMIG-02 (diff-before-drop):** confirmar o corpo vivo de cada uma das 4 funções é graceful-skip
  (via `pg_get_functiondef` no orquestrador) ANTES do DROP — nunca dropar às cegas.
- **D-09:** aposentar o **disparo n8n do `submit-candidatura`** — ⚠ este é **LIVE, não dormente**:
  `supabase/functions/submit-candidatura/index.ts:300-327` faz um `fetch(...)` fire-and-forget AFTER
  COMMIT com **URL de fallback HARDCODED** (`https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura`),
  então desarmar a env var `N8N_NOVA_CANDIDATURA_URL` **não** desliga. **O bloco de código tem de ser
  removido e a EF re-deployada.** É o equivalente-`confirmacao` (dispara em toda inscrição, inclusive
  auto-rejeitadas — hoje NÃO suprime knockout). Substituí-lo pelo trigger `confirmacao` survivor-guarded
  (D-03) é também um refino de comportamento. **Superfície de double-send real** se não cair junto.

### Segurança / atomicidade / disciplina

- **D-10:** DROP dos 4 + CREATE dos 3 numa **ÚNICA migration atômica** (sem janela de double-send).
  Guard durável de idempotência: `UNIQUE(dedupe_key)` da P37 (já vivo).
- **D-11:** hop trigger→EF por **Vault Bearer self-auth** (mirror `analise-candidato-individual`):
  `url := (select decrypted_secret from vault.decrypted_secrets where name='project_url') ||
  '/functions/v1/notificar-candidato'`, header `Authorization: Bearer <edge_invoke_key do Vault>`.
  Ambos os secrets **já vivos** no Vault (`edge_invoke_key`, `project_url` — verificado). Corpo só ids
  → a EF não é endpoint público/spoofable e nenhuma PII trafega no payload (DISPATCH-04). Ver o
  shape exato pronto em `38-HUMAN-UAT.md` (UAT-38-1, passo 3).
- **D-12:** **NÃO editar `avancar_etapa()`** — carrega o guard ENTREV-03 (bloqueio de avanço) e a
  lógica `auto_rejeitado`. Os novos triggers são `AFTER INSERT` em `historico_candidatura`, ortogonais
  ao `BEFORE UPDATE OF etapa_atual` do `avancar_etapa()`. Idem não tocar `guard_rejeicao_auditada`,
  `trg_candidaturas_analise`, `notify_cost_anomaly` (este último em `ai_cost_daily` usa `net.http_post`
  mas é o **cost-alerter, NÃO n8n** — fora de escopo, não dropar).
- **D-13:** migration aplicada via **Supabase MCP `apply_migration` + reconcile do ledger** (mesmo
  caminho P37); **sem** wrapper `BEGIN;...COMMIT;` (o driver envolve cada migration); a tarefa de banco
  **fecha como checkpoint do orquestrador** — subagentes GSD não recebem os tools MCP do Supabase
  (bug upstream anthropics/claude-code#13898). Planejar assumindo apply = trabalho do main thread.

### Claude's Discretion

- Nomes dos 3 triggers/funções novos (seguir convenção `trg_notif_*` / verbo pt-BR), estrutura do
  `CASE`, e como o survivor-guard lê o `auto_rejeitado` (via a linha de `candidaturas` recém-inserida
  ou um EXISTS) — decisões de implementação para o planner/executor.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos & roadmap
- `.planning/ROADMAP.md` § Phase 39 — success criteria (DISPATCH-01..04) + notas do discuss-phase
- `.planning/REQUIREMENTS.md` (linhas 38-41) — DISPATCH-01, DISPATCH-02, DISPATCH-03, DISPATCH-04
- `.planning/STATE.md` § Decisions / Blockers — cadeia estrita 38→39, maior risco, gate do Vault

### Contrato da EF (P38 — imutável, o que o trigger envia)
- `supabase/functions/notificar-candidato/index.ts` — `EVENTOS_VALIDOS` (58), exigência de
  `agendamento_id` p/ convite (111), resolução por allowlist (128-149), claim-before-send (176-207)
- `supabase/functions/notificar-candidato/helpers.ts` — `EventoLedger` (11), `montarDedupeKey` (26-)
- `supabase/functions/_shared/email-templates.ts` — `corpoDecisao` (128) neutro (prova de D-06)
- `supabase/functions/_shared/email-config.ts` — modo/destinatário (fail-safe teste)
- `.planning/phases/38-ef-notificar-candidato-comm/38-HUMAN-UAT.md` — shape pronto do `net.http_post`

### Fonte do funil (o que já existe — não tocar)
- `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` — o único escritor de `historico_candidatura`
- `supabase/migrations/20260709000011_decisao_final_historico.sql` + `20260714100001_rejeitar_candidatura_rpc.sql`
  — caminhos de decisão que movem `etapa_atual` (prova de D-02)
- `supabase/migrations/20260721000001_notificacoes_enviadas.sql` + `20260722000002_p37_notificacoes_lacunas.sql`
  — `UNIQUE(dedupe_key)`, o guard de idempotência (D-10)

### n8n a aposentar (alvos do DROP)
- `supabase/migrations/20260706110005_sec03_n8n_serverside.sql` — os 3 triggers/funções SEC-03
- `supabase/migrations/20260712100004_n8n_novo_candidato.sql` — o 4º trigger (`candidatos`)
- `supabase/functions/submit-candidatura/index.ts` (300-327) — o webhook n8n LIVE hardcoded (D-09)

### Padrão de referência (reuse)
- `supabase/functions/analise-candidato-individual/index.ts` — self-auth Bearer via Vault (mirror do hop, D-11)
- `CLAUDE.md` § "Migrations + db push — workaround" — disciplina de apply PL/pgSQL (D-13)

</canonical_refs>

<code_context>
## Existing Code Insights

### Topologia de triggers viva (PROD `isljnozzlvckrgjjbjwp`, 2026-07-26)

**Já existe (NÃO tocar):**
- `candidaturas_avancar_etapa_trg` — `BEFORE UPDATE OF etapa_atual` → `avancar_etapa()` (único escritor
  do histórico; insere linha p/ QUALQUER mudança de etapa, incluindo `aprovado`/`rejeitado`)
- `trg_candidaturas_analise` — `candidaturas AFTER INSERT` (dispara análise IA; coexiste com o novo confirmação)
- `trg_candidaturas_guard_rejeicao` — `BEFORE UPDATE OF status` (guard de rejeição auditada)
- `trg_agendamento_normaliza_vaga` — `agendamentos_entrevista BEFORE INSERT/UPDATE` (normaliza vaga_id)
- `notify_cost_anomaly` em `ai_cost_daily` — cost-alerter (usa net.http_post; **NÃO é n8n**, fora de escopo)

**NÃO existe hoje** → os 3 novos triggers são net-new: nenhum `AFTER INSERT` em `historico_candidatura`,
nenhum `AFTER INSERT` em `agendamentos_entrevista`.

### Schema-chave
- `historico_candidatura`: `id, candidatura_id, etapa_de(null-able), etapa_para(NOT NULL), criterio_texto,
  ator, auto_rejeitado(NOT NULL bool), criado_em`. → o CASE é sobre `NEW.etapa_para`; o guard de
  knockout é `NEW.auto_rejeitado = false` (D-02).
- enum `etapa_processo`: `inscricao(1), triagem(2), avaliacao_assincrona(3), entrevista_online(4),
  entrevista_presencial(5), decisao_final(6), aprovado(7), rejeitado(8)`.

### Vault (secrets vivos, verificado)
- `edge_invoke_key`, `project_url` → suficientes para o hop self-auth (D-11).
- `n8n_webhook_base` → **ausente** (por isso os 4 triggers n8n são dormentes).
- `resend_api_key` → **ausente** (UAT-36-2 pendente — o gate que trava o execute desta fase).

### Padrões estabelecidos
- Idempotência claim-before-send via `UNIQUE(dedupe_key)` + `ON CONFLICT DO NOTHING` (P37/P38).
- Migrations PROD via MCP `apply_migration` + reconcile do ledger; checkpoint do orquestrador (D-13).

</code_context>

<specifics>
## Specific Ideas

**Mapa final evento → fonte (o contrato dos 3 triggers):**

| Evento | Fonte (trigger) | Predicado |
|---|---|---|
| `confirmacao` | `candidaturas AFTER INSERT` | survivor-guard: só se NÃO nasceu auto-rejeitada (knockout) |
| `avanco` | `historico_candidatura AFTER INSERT` (CASE) | `etapa_para = 'avaliacao_assincrona'` |
| `decisao` | `historico_candidatura AFTER INSERT` (CASE) | `etapa_para IN ('aprovado','rejeitado') AND auto_rejeitado = false` |
| `convite` | `agendamentos_entrevista AFTER INSERT` | sempre; corpo carrega `agendamento_id` |

O trigger CASE de `historico_candidatura` unifica `avanco`+`decisao` numa função só; os outros dois
são satélites de 1 evento. Todos graceful-skip (se a EF/secret faltar, `RETURN NEW` sem erro — o funil
avança mesmo se o e-mail cair; `net.http_post` é at-most-once, reconciliado na P41).

</specifics>

<deferred>
## Deferred Ideas

- **E-mail de aprovação distinto (comemorativo):** Fernando optou pelo e-mail de decisão único e neutro
  (D-06). Um 5º template "aprovado" reabriria a P38 → **deferido a P38-v2/backlog**, não no escopo da P39.

### Reviewed Todos (not folded)

Os 4 todos que casaram por keyword genérica com a P39 foram revisados e **NÃO** dobrados — nenhum é
escopo de rewire de triggers:

- `25-review-deferred.md` — achados de code review adiados da P25 (M4); backlog geral.
- `36-resend-chave-divergencia.md` — o `cost-alerter` usa `RESEND_API_KEY` como env secret vs Vault;
  débito de segurança separado, sem relação com o hop n8n→EF desta fase.
- `cc0-cognitive-item-bank-sourcing.md` — seed do banco cognitivo (CC0-01); domínio de avaliação, não notificação.
- `processo-origem-do-drift-desconhecida.md` — o caminho de apply em PROD fora do repo (P37); risco de
  processo relevante a QUALQUER migration futura (inclusive a desta fase), mas não é trabalho da P39.
  ⚠ Manter à vista: a P39 aplica migration em PROD — se o drift reaparecer, é sinal de processo.

</deferred>

---

*Phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03*
*Context gathered: 2026-07-26*
