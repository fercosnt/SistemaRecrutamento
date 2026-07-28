---
phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
plan: 04
wave: 2
status: complete
autonomous: false
completed: 2026-07-26
executor: orquestrador (main thread via Supabase MCP + CLI)
files_modified:
  - supabase/tests/p39_rewire_triggers_smoke.sql (fix do falso-negativo (f) — LIKE escapado)
  - supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql (APLICADA em PROD; arquivo já commitado na Wave 1)
  - supabase/functions/submit-candidatura/index.ts (REDEPLOYADA; arquivo já commitado na Wave 1)
  - supabase_migrations.schema_migrations (reconcile da version)
requirements: [DISPATCH-01, DISPATCH-02, DISPATCH-03, DISPATCH-04]
prod_touched: true
requirements_delivery_gated: [DELIV-01]
---

# 39-04 — Apply do rewire em PROD (aposentadoria do n8n + triggers canônicos)

## ⚠ Contexto da decisão (gate DELIV-01 ABERTO, aceito pelo operador)

O gate `resend_api_key` (UAT-36-2) **fechou** (Vault contém a chave ao vivo) e a EF
`notificar-candidato` está viva (ACTIVE v2, `verify_jwt=false`). **Porém, o smoke ao vivo
re-verificou que `rh.beautysmile.com.br` continua NÃO verificado no Resend** (403 domain not
verified — DELIV-01/UAT-36-1 ainda aberto), contradizendo o registro de "verificado". O
orquestrador **PAROU antes de qualquer mutação em PROD** e reportou. **Decisão explícita do
operador: aplicar mesmo assim, aceitando `status='falhou'`** até o domínio ser verificado (as
linhas `falhou` serão recuperadas pela varredura `pg_cron` da P41). A *correção* do rewire é
ortogonal à entrega — só a entrega real fica pendente do domínio.

## O que foi feito (na ordem obrigatória, D-09 → apply)

**Task 1 — Gate ao vivo + diff-before-drop + redeploy:**
- **GATE (re-verificado ao vivo, não pelo registro):** `resend_api_key` presente no Vault ✅;
  EF `notificar-candidato` ACTIVE (v2) ✅; **smoke fresco → `403 domain not verified` (falhou)**
  → DELIV-01 aberto (documentado; operador optou por prosseguir).
- **DBMIG-02 diff-before-drop:** os 4 corpos vivos (`trg_n8n_nova_candidatura`,
  `trg_n8n_status_candidatura`, `trg_n8n_revisao_decisao`, `trg_n8n_novo_candidato`)
  auditados via `pg_get_functiondef` — TODOS graceful-skip (lê `n8n_webhook_base`, `RETURN NEW`
  se NULL; só POST ao n8n; nunca escrevem tabela do funil). `n8n_webhook_base` **ausente** do
  Vault → os 4 já eram no-ops dormentes. Seguro dropar.
- **REDEPLOY (ANTES do apply, Pitfall 3):** `grep -ci n8n submit-candidatura/index.ts` = 0;
  `supabase functions deploy submit-candidatura` OK (2026-07-26T22:22:34Z). Posture ao vivo
  re-verificado: no-auth POST → **HTTP 401** (`verify_jwt=true` preservado — CLI caveat
  #4059/#41693 checado, não regrediu). A janela redeploy→apply foi confirmação-ausente por
  segundos, nunca double-send.

**Task 2 — Apply + reconcile + catálogo + smoke:**
- **APPLY:** `20260726000001_p39_rewire_triggers_aposenta_n8n.sql` via MCP `apply_migration`
  → `{"success":true}`. (DROP 4 triggers + 4 funções n8n; CREATE 3 funções + 3 triggers.)
- **RECONCILE:** `apply_migration` gravou a version de timestamp `20260726192335`; reconciliada
  via `execute_sql` para `20260726000001` (name = `20260726000001_p39_rewire_triggers_aposenta_n8n`).
- **CATÁLOGO (prova do rewire):** `n8n_triggers=0`, `n8n_funcs=0` ✅; exatamente **3**
  `trg_notif_*` de dispatch — `trg_notif_confirmacao`(candidaturas), `trg_notif_convite`
  (agendamentos_entrevista), `trg_notif_transicao`(historico_candidatura) ✅ (+ o pré-existente
  `trg_notificacoes_atualizado_em` da P37, que é o touch de `atualizado_em`, não dispatch).
  Ortogonais **intactos** (D-12): `candidaturas_avancar_etapa_trg` + `trg_candidaturas_analise`.
- **SMOKE:** `supabase db query --linked --file supabase/tests/p39_rewire_triggers_smoke.sql`
  → exit 0, **sem exceção** → gate VERDE. Em PROD (Vault setado) a metade comportamental faz
  SKIP; RESUMO (z) exigiu e confirmou **6/6 estruturais** (a–f).

**Task 3 — end-to-end (hop) + cleanup:**
- **E2E DISPATCH-01 (prova do hop trigger→EF):** insert descartável em `historico_candidatura`
  (`etapa_para=avaliacao_assincrona`, candidatura de teste `a1dd4c42…`) → `trg_notif_transicao`
  disparou → **`net._http_response` id=61 status_code=200** (EF alcançada; não 404/401) → linha
  no ledger `evento=avanco`, `destinatario_email=delivered+avaliacao_liberada@resend.dev` (sink
  correto por-evento), `modo=teste`, `status=falhou` (403 domínio — esperado dado o gate). O hop
  Bearer self-auth está provado ponta-a-ponta. Linhas de teste (ledger + historico) removidas;
  resíduo 0/0/0.
- Os outros 3 eventos (confirmacao/convite/decisao) compartilham o MESMO esqueleto de hop
  (net.http_post idêntico) — provados estruturalmente (smoke a–f + corpos da migration) e via o
  caminho de dispatch da EF já provado (UAT-38-1). E2E ao vivo dos 3 **deferido** por serem
  redundantes com o domínio aberto (todos só produziriam `falhou`) e por evitarem efeitos
  colaterais em PROD (o insert de candidatura dispararia também `trg_candidaturas_analise`).

## Fix aplicado durante a execução (deviation registrada)

O smoke (f) contava `tgname LIKE 'trg_notif_%'`. Em SQL, `_` é **curinga de 1 char** → o padrão
também casava o touch trigger `trg_notificacoes_atualizado_em` (P37), inflando a contagem para
**4** e reprovando (f) por **falso-negativo**. Provado ao vivo: LIKE frouxo=4, LIKE escapado=3,
IN-exato=3. Fix: escapar os underscores (`trg\_notif\_%`, `trg\_n8n\_%`) — preserva a propriedade
"exatamente 3 dispatch + nenhum inesperado". Test-only artifact; corrige o gate p/ P41/regressão.

## Estado e pendências carregadas

- **⛔ DELIV-01 ABERTO (aceito):** `rh.beautysmile.com.br` não verificado no Resend → TODO envio
  grava `status='falhou'` até a verificação DNS/dashboard (ação humana do Fernando). Enquanto
  aberto, o funil processa e registra, mas NÃO entrega. Recuperação = varredura `pg_cron` da P41.
- **⏳ Cleanup do n8n cloud (DISPATCH-03, superfície externa):** ação HUMANA — desativar/apagar
  a(s) workflow(s) em `fernandocosta.app.n8n.cloud`. O secret `n8n_webhook_base` **já não existe**
  no Vault (nada a remover). O n8n está aposentado do BANCO (catálogo) e do CÓDIGO deployado;
  falta só a superfície de nuvem pessoal.
- **⚠ Drift pré-existente (NÃO-P39):** `db push --linked` reportou 7 versions órfãs
  (`20260713024106`…`20260714023002`) — migrations de 07-13/07-14 aplicadas via `apply_migration`
  (timestamp) e nunca reconciliadas ao prefixo do arquivo (2 sem arquivo local). É o débito de
  drift já documentado (causa desconhecida), duas semanas ANTES da P39. A version da P39 está
  corretamente reconciliada (`20260726000001`, fora da lista de órfãs) → **zero drift novo**. NÃO
  reparado aqui (fora de escopo; a sugestão `--status reverted` do CLI marcaria migrations
  aplicadas como revertidas — errado).

## Verificação (resumo do gate)

- Redeploy antes do apply ✅ (401 pós-redeploy confirma verify_jwt) · Apply via MCP ✅ · Reconcile
  `20260726000001` ✅ · Catálogo 0 n8n / 3 dispatch, ortogonais intactos ✅ · Smoke 6/6 ✅ ·
  E2E hop `net._http_response` 200 + ledger correto ✅ · resíduo 0/0/0 ✅.
- **SEC-03 resolvido por substituição** no banco e no código; a superfície n8n cloud (externa)
  e a entrega real (DELIV-01) seguem como pendências humanas explícitas.
