# Phase 24 — Deferred Items

Out-of-scope discoveries logged during execution. NOT fixed in-phase.

| Category | Item | Found During | Status | Notes |
|----------|------|--------------|--------|-------|
| Security / PII | `src/features/cadastro/services/n8nService.ts` hardcodes **9** n8n webhook URLs (`n8n.srv881294.hstgr.cloud`, test + production) directly in client source, and `sendToN8N`/`notifyCandidatoCriado` POST candidate **PII** (nome, email, telefone, **cpf**) from the browser. This is a SECOND bundle-webhook leak, distinct from the SEC-03 `fernandocosta.app.n8n.cloud` host. | 24-05 (SEC-03) | DEFERRED | OUT OF SCOPE for 24-05: the plan scopes SEC-03 to the 3 fernandocosta sites (candidaturasService ×2 + explicacaoService). The hstgr host contains NO `n8n.cloud`/`fernandocosta` literal, so the 24-05 grep guard neither covers nor false-flags it. This is a real PII-in-bundle leak (same class as SEC-03) and should be swept in **Phase 25 (funil RH)** or a follow-up SEC item: move dispatch server-side (pg_net + Vault) and delete the client URLs + PII payloads. Threat-flag surfaced in 24-05-SUMMARY. |
