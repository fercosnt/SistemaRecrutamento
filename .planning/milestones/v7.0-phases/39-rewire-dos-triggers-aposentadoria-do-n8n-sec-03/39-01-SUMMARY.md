---
phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
plan: 01
wave: 1
status: complete
autonomous: true
completed: 2026-07-26
files_modified:
  - supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql
requirements: [DISPATCH-01, DISPATCH-02, DISPATCH-03, DISPATCH-04]
prod_touched: false
---

# 39-01 — Migration atômica DROP4+CREATE3 (aposenta n8n + rewire triggers)

## O que foi feito

Escrito o arquivo `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql`
(**FILE-ONLY, zero contato com PROD** — o apply é o plano GATED 39-04).

**BLOCO A — aposentadoria n8n (D-08):** DROP dos 4 triggers + 4 funções `trg_n8n_*` na ordem
trigger-antes-de-função, `IF EXISTS`, sem CASCADE:
- `trg_n8n_nova_candidatura` / `trg_n8n_status_candidatura` (candidaturas), `trg_n8n_revisao_decisao`
  (decisao_final) — os 3 do SEC-03 (`20260706110005`).
- `trg_n8n_novo_candidato` (candidatos) — a 2ª leak (`20260712100004`).

**BLOCO B — nova topologia (3 funções/triggers AFTER INSERT):**
- `trg_notif_transicao` (historico_candidatura): CASE em `etapa_para` — `avaliacao_assincrona`
  → `avanco`; `IN ('aprovado','rejeitado') AND auto_rejeitado = false` → `decisao`; ELSE RETURN NEW.
- `trg_notif_confirmacao` (candidaturas): survivor-guard verbatim (`status='rejeitado' OR
  opcao_knockout_id IS NOT NULL` → RETURN NEW); dispatch `confirmacao` com `candidatura_id=NEW.id`.
- `trg_notif_convite` (agendamentos_entrevista): sempre dispara; body carrega `agendamento_id=NEW.id`
  (a EF exige agendamento_id no convite, index.ts:107-113).

Cada função: `SECURITY DEFINER SET search_path=''`, lê `project_url`+`edge_invoke_key` do Vault
(graceful-skip se NULL), envolve o `net.http_post` num wrapper `EXCEPTION WHEN OTHERS → RAISE
WARNING → RETURN NEW` (fail-open — o funil nunca bloqueia), header `Bearer <edge_invoke_key>`,
body **IDS-ONLY**, e termina com `REVOKE ALL … FROM PUBLIC` + `COMMENT` pt-BR.

## Verificação (automated, contra o arquivo)

- T1 OK / T2 OK (greps do plano): 4 DROP TRIGGER `trg_n8n_` + 4 DROP FUNCTION; 3 `CREATE OR REPLACE
  FUNCTION public.trg_notif_` + 3 `CREATE TRIGGER trg_notif_`; 3 `REVOKE ALL`.
- Predicados presentes: `avaliacao_assincrona`, `auto_rejeitado = false`, `opcao_knockout_id IS NOT
  NULL`, `'agendamento_id', NEW.id`.
- PII guard = 0 (nenhum nome/email/cpf/telefone nos corpos).
- Sem `BEGIN;`/`COMMIT;` de topo (D-13). Objetos protegidos (`avancar_etapa`, `notify_cost_anomaly`,
  `trg_candidatura(s)_analise`) só aparecem em comentários — **nenhum DROP/CREATE/ALTER** os toca.
- Colunas confirmadas ao vivo (read-only, projeto `isljnozzlvckrgjjbjwp`): `historico_candidatura`
  tem `etapa_para`/`auto_rejeitado`/`candidatura_id`; `candidaturas` tem `status`/`opcao_knockout_id`/`id`;
  `agendamentos_entrevista` tem `id`/`candidatura_id`.
- Version ordering OK: `20260726000001` > `20260722000002` (última existente).

## Notas p/ 39-03 (smoke) e 39-04 (apply GATED)

- O apply em PROD (39-04) segue **gated**: exige a EF viva + smoke (UAT-38-1 — ✅ funcional, com a
  correção `NOTIFICAR_SECRET`), `resend_api_key` no Vault (UAT-36-2 — ✅), diff-before-drop dos 4
  corpos `trg_n8n_*`, e o redeploy de `submit-candidatura` sem o bloco n8n (39-02).
- ⚠ **DELIV-01 aberto** (`rh.beautysmile.com.br` não verificado no Resend): mesmo pós-apply, os
  triggers gravarão `falhou` até o domínio ser verificado — o rewire funciona, a entrega não.
