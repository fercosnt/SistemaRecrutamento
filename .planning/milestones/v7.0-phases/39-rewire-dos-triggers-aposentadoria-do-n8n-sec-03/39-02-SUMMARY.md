---
phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
plan: 02
wave: 1
status: complete
autonomous: true
completed: 2026-07-26
files_modified:
  - supabase/functions/submit-candidatura/index.ts
  - supabase/functions/submit-candidatura/index.test.ts
requirements: [DISPATCH-03]
prod_touched: false
---

# 39-02 — Remoção do disparo n8n LIVE de submit-candidatura

## O que foi feito

**index.ts:** removida integralmente a seção "5) Fire-and-forget N8N webhook AFTER COMMIT" — a
const `N8N_NOVA_CANDIDATURA_URL` (com o fallback HARDCODED `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura`)
e o `fetch(...).catch(...)`. Removida a linha 13 do docstring ("7. Fire-and-forget N8N webhook"),
renumerado o passo Return (8→7) e o passo Success (6→5). Adicionada nota no docstring: a confirmação
passa a ser responsabilidade EXCLUSIVA do trigger `trg_notif_confirmacao` (39-01). O passo de sucesso
(`jsonResponse` com `candidaturaId`, `candidaturaUrl: '/candidato/perfil'`, `status`, `etapa_atual`)
ficou **intacto**; nenhum outro passo (validação, RPC atômica, tratamento de erro) foi tocado.

Este era o **único caminho de disparo n8n LIVE** do funil (não dormente — o fallback hardcoded não
desarma por env var). Removê-lo elimina a superfície de double-send real: sem isso, pós-rewire toda
inscrição dispararia DOIS caminhos (novo trigger Beauty Smile + fetch n8n cloud). Bônus: o fetch antigo
NÃO suprimia knockout (disparava para toda inscrição, inclusive auto-rejeitada); o novo trigger suprime
(survivor-guard, D-03).

**index.test.ts:** removido o helper `withStubbedFetch` + comentário (existiam SÓ para stubar o fetch
n8n). O happy-path chama `handler(...)` direto; os overrides `sanitizeOps:false`/`sanitizeResources:false`
+ a nota "fire-and-forget webhook promise is intentionally not awaited" foram removidos (não há mais
promise não-aguardada). Nenhuma asserção afrouxada.

## Verificação

- `grep -ci n8n` index.ts = **0**, index.test.ts = **0**; sem `N8N_NOVA_CANDIDATURA_URL` / `fernandocosta.app.n8n.cloud`.
- Success preservado: `candidaturaUrl: '/candidato/perfil'` + `status` + `etapa_atual`.
- **deno test: 5 passed / 0 failed** (default sanitizeOps — verde sem o override, provando que não há
  recurso async pendente após a remoção do fetch).

## ⚠ Nota crítica p/ 39-04 (GATED)

O **redeploy** desta EF (`supabase functions deploy submit-candidatura`) deve ocorrer **ANTES** do apply
da migration 39-01 em PROD (Pitfall 3 — ordem redeploy-antes-do-apply). O artefato deployado em PROD
(v10) AINDA carrega o fetch n8n LIVE até o redeploy; aplicar a migration antes abriria a janela de
double-send. `submit-candidatura` deploya COM verify_jwt=true (NÃO passar `--no-verify-jwt`).
