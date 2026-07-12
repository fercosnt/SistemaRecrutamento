# Phase 26: Correção do Funil (lado candidato — alcançabilidade & scoring) - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — grey areas proposed in batch, user accepted all 4 recommendations

<domain>
## Phase Boundary

O candidato **alcança** e **conclui** cada etapa da avaliação com scoring íntegro e não-manipulável, vê apenas perguntas do próprio cargo/vaga, e consegue se reinscrever após soft-delete — com cards e copy que refletem o estado real. O sistema **nunca** auto-rejeita por score (RNF-07a).

**In scope (6 requirements):**
- **FUNIL-01** (A8, HIGH) — `pontuar_sjt` não-manipulável: dedup de respostas + denominador sobre a bateria completa da vaga.
- **FUNIL-07** (A17, HIGH) — banco SJT filtrado por cargo **e** `itens_ids` da vaga (candidato não vê pergunta de outro cargo).
- **FUNIL-08** (A18, HIGH) — prova cognitiva alcançável pela navegação (`funilNavMap` ↔ `AvaliacaoContainer` consistentes + roteamento/gate por `aplica_cognitivo`).
- **FUNIL-10** (A27, MEDI) — reinscrição pós soft-delete: dropar o índice unique legado sem filtro `deleted_at` em PROD.
- **FUNIL-12** (A41, MEDI) — cards da avaliação derivam conclusão de campo que existe no payload (não do campo fantasma `t.status`).
- **UX-01** (QW1) — copy honesta ("acompanhe no painel", não "avisaremos por e-mail") em 5+ telas de espera.
- **[roteado pós-P24]** — `n8nService.ts` (cadastro) NÃO envia PII do candidato do browser nem embute URLs n8n no bundle; dispatch movido server-side (pg_net + Vault, padrão SEC-03) + grep guard.

**Out of scope (defer / other phases):**
- FUNIL-10 reconstrução do baseline/ledger de migrations (DBMIG-01) → **Phase 27**.
- A9/A12/A16/A42 (write-paths RH, RLS parent-table scoping) → já tratados na Phase 25 ou fora deste file-touch.
- `database.types.ts` regen + drop dos casts confinados → **Phase 27**.
- Definir/criar o Vault secret `n8n_webhook_base` em PROD → **human-action de Fernando** (server-side graceful-skip até lá).

</domain>

<decisions>
## Implementation Decisions

### SJT Scoring Integrity (FUNIL-01 + FUNIL-12 overwrite)
- **Duplicatas** de `{pergunta_id, opcao_id}` no submit → **rejeitar com RAISE** (server-authoritative; mata a inflação >100% do `marked` CTE sem DISTINCT em `20260611000004:84-88`).
- **Denominador** = **todas as perguntas ativas da bateria SJT da vaga** (não só as respondidas) — corrige `maxes` restrito a `pergunta_id IN (SELECT ... FROM marked)` em `20260611000004:95-100`.
- **Re-submit lock** (decisão load-bearing): `pontuar_sjt` **rejeita** quando já existe row `scores_candidato` MC com status != 'falhou' para a candidatura. Fecha o buraco A41 (overwrite sem trilha via ON CONFLICT DO UPDATE `20260611000004:121-131`).
- **Submit incompleto** → **rejeitar**: exigir que todas as perguntas da bateria estejam respondidas (server valida `count(respostas) == count(bateria)`; grava expected vs answered em metadata). Não dá para gamear respondendo subconjunto.
- **Invariante preservada:** RNF-07a — nunca escrever `candidaturas.status`; `pontuar_sjt` só grava `scores_candidato`, nunca rejeita.

### Question Filtering + Cognitive Reachability (FUNIL-07 + FUNIL-08)
- **Filtro SJT (client):** `getAvaliacaoContext` filtra `perguntas` por **`itens_ids` do elemento work_sample_sjt de `testes_aplicaveis` quando presente, senão por `cargo`** (hoje só `.eq('status','active')` em `avaliacaoService.ts:140-146`).
- **Validação server-side:** `pontuar_sjt` valida que **todo `pergunta_id` pertence à bateria da vaga** — rejeita (42501/400) caso contrário (o client é bypassável).
- **Prova cognitiva — Opção A (async hub):** renderizar um card cognitivo dentro de `AvaliacaoContainer` durante `avaliacao_assincrona`, gateado por **`vaga.aplica_cognitivo === true`** (NÃO pela entry de template, que `cargoTemplates.ts:71` sempre emite); o card navega para a **rota real** `/candidato/prova-cognitiva/:candidaturaId` (corrigir o stub `/candidato/avaliacao/:id/cognitivo` em `CONTAINER_TESTE_CONFIG.cognitivo` `AvaliacaoContainer.tsx:88-93`); **relaxar o gate de `pontuar_cognitivo`** para aceitar `avaliacao_assincrona` (hoje exige `entrevista_*`, `20260624000003:69`).
- **Teste de contrato rota↔gate:** adicionar teste que prova que a etapa onde o card aparece é a etapa que o RPC de submit aceita.
- **Label do card:** "Avaliação cognitiva" (já existe em `CONTAINER_TESTE_CONFIG.cognitivo`).

### Card Status Source + Honest Copy (FUNIL-12 + UX-01)
- **Status de conclusão do card:** derivado das **rows próprias do candidato** (`scores_candidato` / `respostas_avaliacao`) via **RPC neutra "já registrado"** (booleans por teste), NÃO do campo fantasma `entry.status` (`AvaliacaoContainer.tsx:312` — schema `testeAplicavelSchema` não tem `status`, é config nível-vaga).
- **Copy padrão de espera:** **"Acompanhe o andamento pelo seu painel."** — remover **todas** as promessas de e-mail ("avisaremos por e-mail"); o painel é a fonte da verdade. Mirar os padrões já corretos em `VagaDetalhePage.tsx:319` e `DashboardCandidatoPage.tsx:186`.
- **Escopo da copy (6 telas, ≥5 candidate-facing):** `AvaliacaoContainer.tsx:209`, `RedacaoEditorScreen.tsx:278`, `DevolutivaBigFiveView.tsx:157`, `ProvaCognitivaScreen.tsx:82` (+ prose `:18`), `SolicitarRevisaoCTA.tsx:45`; `SuporteRHPage.tsx:162-163` (RH-facing, mesmo padrão — incluir). **NÃO** tocar consent copy de `AutorizacoesStep.tsx:58/93/185` (consentimento legítimo, não wait-state).
- **CI grep guard** bane a reintrodução de "avisaremos ... por e-mail" nas telas de espera do candidato.

### n8n PII Server-Side Dispatch (SEC-03 2nd leak)
- **Fix shape:** mover o dispatch `notifyCandidatoCriado` para **server-side (pg_net + Vault)** espelhando o precedente SEC-03 (`20260706110005_sec03_n8n_serverside.sql`); **deletar** as URLs hardcoded + payloads PII do client. `n8nService.ts` não é chamado em runtime (só barrel re-export + testes), então o subtree client sai limpo.
- **Evento/trigger:** **`AFTER INSERT ON candidatos`** (SECURITY DEFINER) → `net.http_post` com body **só ids/evento — sem PII** (nome/email/telefone/cpf ficam server-side). Template canônico: `20260610000002_analise_trigger.sql:43-51`.
- **Secret ausente:** **graceful-skip** quando `vault.decrypted_secrets` `n8n_webhook_base` é NULL (idêntico a SEC-03; o valor é human-action de Fernando).
- **Bundle guard:** estender o grep guard (`src/__tests__/guards/n8n-bundle.grep.test.ts`) para banir o host `n8n.srv881294.hstgr.cloud` + literais de PII no bundle.

### Claude's Discretion
- Formato exato da RPC neutra de status dos cards (nome, shape do retorno) — desde que não vaze score bruto ao candidato.
- Estrutura interna do `metadata` de `pontuar_sjt` (expected/answered/versão) desde que auditável.
- Ordenação/wording fino dos cards e microcopy, respeitando o design system Beauty Smile e a copy-padrão de painel acima.
- Onde exatamente adicionar o filtro cargo/itens_ids (dentro de `getAvaliacaoContext` vs nova RPC) — desde que server-side também valide.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **SJT scoring RPC:** `supabase/migrations/20260611000004_pontuar_sjt_rpc.sql` — `pontuar_sjt(p_candidatura_id, p_respostas)` SECURITY DEFINER; `marked`/`scored`/`maxes` CTEs; grava `scores_candidato` MC row (ON CONFLICT DO UPDATE `:121-131`); threshold per-vaga `mc_min_pct` default 60.
- **SJT bank + weights + option reader:** `supabase/migrations/20260611000002_perguntas_sjt.sql` — tabela `perguntas`, `perguntas_opcao_sjt` (gabarito peso/tag, candidato-DENY), `get_opcoes_sjt(p_pergunta_id)` SECURITY DEFINER retorna só `(opcao_id, opcao_texto)` randomizado.
- **Autosave buffer:** `supabase/migrations/20260611000003_respostas_avaliacao.sql` — unique `(candidatura_id, teste)`, back-lock RLS por etapa; client `avaliacaoService.loadResposta()/upsertResposta()` + hook `useAutosaveAvaliacao`. **NÃO** é fonte de score.
- **Candidate SJT service:** `src/features/avaliacao/services/avaliacaoService.ts` — `getAvaliacaoContext()` (`:98-166`), `pontuarSjt()` (`:261-300`), `getOpcoesSjt()` (`:180-201`).
- **testes_aplicaveis schema (itens_ids):** `src/features/config-vaga/schemas/testesAplicaveisSchema.ts:51` — `itens_ids: string[]` opcional dentro de `testeAplicavelSchema` (`tipo:'sjt'`, `cargo`, `bateria_size`, `threshold`). Sem campo `status`.
- **Assessment container:** `src/features/avaliacao/components/AvaliacaoContainer.tsx` — `deriveCards()` (`:303-326`), `CONTAINER_TESTE_CONFIG` (`:88-93` cognitivo stub route), `statusInfo()` (`:117-127`), `AvaliacaoShell` `allDone` (`:147-148`).
- **Test-id contract:** `src/lib/testes/testeContract.ts` — `CANDIDATE_FACING` (`:62-67` inclui 'cognitivo'), `TEMPLATE_TO_CONTAINER` (`:79`).
- **Nav map:** `src/lib/navegacao/funilNavMap.ts` — `funilNavMap` (`:69-129`) keyed por `EtapaFunilM2` (8 valores); cognitivo tratado como sub-screen de `avaliacao_assincrona` (comentário `:60-64`).
- **Prova cognitiva real:** rota `/candidato/prova-cognitiva/:candidaturaId` (`routes.tsx:269-275`, `ProvaCognitivaScreen`); gate `optedIn = ctx?.aplica_cognitivo === true` (`ProvaCognitivaScreen.tsx:121,210`) via `cognitivoService.getContexto()`.
- **Coluna aplica_cognitivo:** `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql:52` (default false).
- **Índice unique correto (partial):** `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql:41-43` — `candidaturas_candidato_vaga_unique_idx ... WHERE deleted_at IS NULL`. O bug é um SEGUNDO índice não-versionado em PROD sem o filtro (A27) — descobrir nome via `pg_indexes`, dropar.
- **submit_candidatura_atomic:** `supabase/migrations/20260425000003_submit_candidatura_rpc.sql:91` mapeia 23505 → EF `submit-candidatura` → `DUPLICATE_CANDIDATURA`.
- **n8n client leak:** `src/features/cadastro/services/n8nService.ts` — `N8N_WORKFLOWS` (`:122-168`) hardcoda `n8n.srv881294.hstgr.cloud` (18 URLs); `notifyCandidatoCriado()` (`:388-417`) envia `id, nome_completo, email, telefone, cpf`. Chamado só via barrel `index.ts:11` + testes — **zero runtime callers**.
- **SEC-03 server-side precedent:** `supabase/migrations/20260706110005_sec03_n8n_serverside.sql` — 3 AFTER triggers SECURITY DEFINER, `net.http_post`, Vault `n8n_webhook_base`, graceful-skip, body só ids/status/event. `pg_net` já habilitado (`20260609000001:47`).
- **Dashboard cards (padrão correto, NÃO fantasma):** `src/components/pages/DashboardCandidatoPage.tsx` — status de `candidatura.status` + `data_decisao_final || feedback_rejeicao` (ambos no allowlist `candidaturasService.ts:280/296`).

### Established Patterns
- **Query-key factory** por feature: `candidaturasKeys` (`src/features/vagas/hooks/useCandidaturas.ts:55-74`), `vagasKeys`. Sem arquivo central.
- **TanStack Query hooks** em `src/features/<feature>/hooks/`; services em `src/features/<feature>/services/`.
- **Migrations PROD via Supabase MCP** `apply_migration`/`execute_sql` (bypassa 42601; grava version row) — padrão M2-M4 (drift de filename reconciliado na Phase 27).
- **RLS é row-level, nunca column-level** — gabarito/veredito candidato-DENY, leitura via RPC SECURITY DEFINER (base de FUNIL-01/07/12: nada de score/gabarito bruto ao candidato).
- **Answer-key protection:** candidato lê opções só via `get_opcoes_sjt` (id+texto), nunca peso/tag.

### Integration Points
- `pontuar_sjt` (migration) ↔ `avaliacaoService.pontuarSjt()` (client) ↔ `scores_candidato` (RH lê).
- `getAvaliacaoContext` ↔ `testes_aplicaveis.itens_ids/cargo` ↔ `perguntas` query.
- `AvaliacaoContainer.deriveCards` ↔ nova RPC de status ↔ `scores_candidato`/`respostas_avaliacao`.
- Card cognitivo ↔ rota `/candidato/prova-cognitiva/:id` ↔ `pontuar_cognitivo` gate.
- `AFTER INSERT ON candidatos` trigger ↔ Vault `n8n_webhook_base` ↔ n8n (server-side).
- CI grep guards: `n8n-bundle.grep.test.ts` (host + PII) + novo guard de copy honesta.

</code_context>

<specifics>
## Specific Ideas

- **Re-submit lock é a decisão load-bearing** de FUNIL-01 — fecha simultaneamente A8(4) e A41 (overwrite sem trilha). Preferir hard-lock (rejeitar quando já há score válido) a versionar.
- **Cognitivo = Opção A** (async hub), não Opção B (entrevista). Cognitivo é assessment assíncrono; mesmo modelo mental dos outros testes. Card gateado por `vaga.aplica_cognitivo`, roteando para a rota REAL, com o RPC gate relaxado para `avaliacao_assincrona`.
- **Copy:** remover e-mail por completo, "acompanhe pelo painel" em todas as telas (incluindo a RH-facing `SuporteRHPage`). Espelhar `VagaDetalhePage.tsx:319`.
- **n8n:** manter a notificação candidato-criado, mas server-side (pg_net + Vault); deletar o subtree client (sem runtime callers, remoção limpa).
- **FUNIL-10 é PROD-only:** o índice-bug não está em migration nenhuma (baseline vazio, tabela candidaturas não-versionada). Descobrir via `pg_indexes`, dropar, e adicionar smoke insert→soft-delete→re-insert. Reconstrução do baseline fica na Phase 27.

</specifics>

<deferred>
## Deferred Ideas

- Criar o Vault secret `n8n_webhook_base` em PROD — **human-action de Fernando** (dispatch server-side graceful-skip até lá).
- `database.types.ts` regen + drop dos casts confinados de RPC → **Phase 27**.
- Reconstrução do baseline (49 migrations) + convergência do ledger de versões (DBMIG-01) → **Phase 27**.
- A28 (`historico_candidatura.auto_rejeitado` semântica) — fora do escopo candidato deste file-touch; avaliar em Phase 27 ou backlog.
- Banco de talentos + re-candidatura ampla (M5/TALENT) — depende de FUNIL-10 mas é escopo M5.

</deferred>
