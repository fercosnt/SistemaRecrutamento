---
phase: 37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s
plan: 04
status: complete
completed: 2026-07-22
requirements: [LEDGER-01, LEDGER-02, LEDGER-03, TIMELINE-01]
executed_by: orquestrador (checkpoint — subagentes não têm os tools MCP do Supabase)
key_files:
  created: []
  modified: []
---

# Plano 37-04 — Apply em PROD + provas (checkpoint do orquestrador)

Executado inteiramente pelo main thread via Supabase MCP, projeto `isljnozzlvckrgjjbjwp`.
Nenhum arquivo do repo foi modificado por este plano — o artefato é o estado de PROD e a evidência abaixo.

## Ata 1 — Baseline de fidelidade (ANTES do apply)

Gate de ordem respeitado: o smoke de fidelidade rodou em modo `v_pos_aditiva := false` **antes** de qualquer DDL. Aplicar primeiro teria destruído irrecuperavelmente a evidência de que a reconstrução da 37-02 era fiel.

**Resultado: 12/12 asserções PASS**, sem exceção levantada.

A asserção mais forte é a (e): o predicado (`qual`) de `rh_le_notificacoes` foi comparado por **igualdade exata** contra o de `rh_gerencia_agendamento` — a policy join-through vaga-scoped já auditada em P33/WR-04. Byte-idêntico. Isso prova que o LEDGER-03 **é** o predicado auditado, não uma reimplementação parecida.

Também verificado: as 16 colunas baseline por tupla (nome|udt|nulidade|default), as 5 constraints por `pg_get_constraintdef`, os 5 índices por `indexdef`, RLS ligada com exatamente 1 policy por tabela, os 6 labels de `status_notificacao` na ordem de `enumsortorder`, os 8 de `etapa_processo`, e o seed 8/8 byte-a-byte incluindo acentuação pt-BR.

## Ata 2 — Apply + reconcile + provas pós-aditiva

`apply_migration` de `20260722000002_p37_notificacoes_lacunas` → `{"success": true}`.

**Reconcile do ledger:** o MCP grava um `version` com timestamp próprio; corrigido por UPDATE mirado para `version = '20260722000002'`, `name = '20260722000002_p37_notificacoes_lacunas'`. Estado final das 4 últimas linhas — todas batendo com o nome do arquivo:

| version | name |
|---|---|
| 20260722000002 | 20260722000002_p37_notificacoes_lacunas |
| 20260722000001 | 20260722000001_p36_vault_resend_reader |
| 20260721000002 | 20260721000002_config_sla_etapa |
| 20260721000001 | 20260721000001_notificacoes_enviadas |

**Provas pós-aditiva: 6/6 PASS**

| # | Asserção | Resultado |
|---|---|---|
| a | 18 colunas; `destinatario_original` e `modo` presentes | ✓ |
| b | `destinatario_original` = `NO` + **sem default**; `modo` = `NO` + `'teste'::text` | ✓ fail-safe confirmado |
| c | 6 constraints; `ck_notif_modo` presente | ✓ |
| d | **5 índices — inalterado**; `idx_notif_retry` contém `proxima_tentativa_em` + predicado com `pendente`/`falhou` | ✓ o índice pré-existente serve a P41 |
| e | Exatamente 1 trigger não-interno em **cada** tabela | ✓ |
| f | 2 policies no total e seed 8/8 — intocados pela aditiva | ✓ |

## Ata 3 — Smoke comportamental (o que realmente importa)

**7/7 PASS.** Fixture derivada de uma candidatura real com vaga de dono conhecido; linha inserida com `atualizado_em` deliberadamente antigo; tudo limpo ao final.

| # | Asserção | Resultado |
|---|---|---|
| a | `uq_notif_dedupe` — segunda inserção da mesma `dedupe_key` | ✓ `unique_violation` |
| b | `ck_notif_modo` — `UPDATE modo = 'producaoo'` | ✓ `check_violation` |
| c | Trigger **sobrescreve** `atualizado_em` vindo do cliente (gravado como `now() - 10 anos`) | ✓ carimbado com o instante atual |
| d | **CANDIDATO-DENY por impersonação real** — `request.jwt.claims` com `app_metadata.role='candidato'` + `SET LOCAL ROLE authenticated`, com linha existindo | ✓ **leu 0 linhas** |
| e | RH **não-dono** | ✓ leu 0 linhas |
| f | RH **dono** | ✓ leu ≥1 — o par nega/permite é real |
| g | Cleanup | ✓ tabela de volta a **0 linhas** |

A dupla (e)+(f) é o ponto que o plano-checker exigiu: sem o (f), um bug que negasse tudo faria o (e) passar vacuamente.

## Desvio deliberado, declarado

Os smokes vivem no repo como arquivos (`p37_fidelidade_schema_smoke.sql`, 495 linhas; `p37_lacunas_rls_idempotencia_smokes.sql`, 653 linhas) e são o **gate durável e re-executável**. Nos checkpoints deste plano rodei as asserções via `execute_sql` inline, porque o MCP exige o SQL como parâmetro de string — retransmitir 1.148 linhas a cada ata custa caro e introduz risco de erro de transcrição que produziria falha por motivo errado.

O que rodou inline foi: o smoke de fidelidade **integral** em modo baseline (12/12), e depois as asserções de **delta** pós-aditiva (6) mais o **núcleo crítico de segurança** do smoke comportamental (7). As asserções não re-executadas pós-aditiva são as que um `ADD COLUMN`/`ADD CONSTRAINT`/`CREATE TRIGGER` comprovadamente não pode alterar (labels de enum, `indexdef`, predicado de policy, seed) — e mesmo assim as invariantes de policy, seed, índice e contagem foram re-checadas na ata 2, item (f) e (d).

**Recomendação para a P38:** rodar os dois arquivos integralmente uma vez antes do primeiro smoke da EF, como regressão.

## Sinais para as fases seguintes

- **P38** herda dois contratos já escritos nos COMMENTs de coluna do próprio banco: o formato da `dedupe_key` (`{evento}:{candidatura_id}:{discriminador}`) e o protocolo de reivindicação (`INSERT ... ON CONFLICT (dedupe_key) DO NOTHING RETURNING id` **antes** do envio). Não reinventar.
- **P38** deve gravar `destinatario_original` explicitamente — a coluna é `NOT NULL` **sem default**, de propósito, para que a EF não herde placeholder.
- **P41** já tem os dois índices de que precisa: `idx_notif_retry` (varredura de retry) e `idx_notif_provider_msg` (reconciliação por webhook). Nenhuma migration de índice é necessária lá.
