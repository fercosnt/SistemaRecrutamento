---
status: partial
phase: 10-triagem-rh-com-ia-comparativo-etapa-2
source: [10-VERIFICATION.md]
started: 2026-06-09
updated: 2026-06-09
---

## Current Test

[awaiting human testing — all require live PROD + real AI calls + visual inspection]

## Tests

### 1. Trigger ≤30s end-to-end (TRIAGEM-01 SLA)
expected: Submit a real survivor candidatura (status != 'rejeitado', opcao_knockout_id IS NULL) via the candidate flow for an active vaga. Within 30s an `analise_candidato_vaga` row appears in PROD with status='sucesso', score_match 0-100, pontos_fortes, gaps, resumo_cv. If the row never appears, confirm Vault secrets `project_url` + `edge_invoke_key` exist (Phase 9 P07 — the trigger skips silently when absent).
result: [pending]

### 2. Ranked panel visual (TRIAGEM-02)
expected: `/rh/vagas/:id/candidatos` as RH shows the candidate in a ranked table with a score band chip (verde ≥70 / amarelo 40-69 / vermelho <40), top fortes/gaps, pagination 20/page, default sort score DESC (pending/falhou at bottom).
result: [pending]

### 3. Comparativo live call P95 ≤5s (TRIAGEM-03)
expected: Select 2-10 candidates → "Comparar (N)" → comparativo opens ≤5s, candidates-as-columns with ranking 1-N, Score IA band, fortes, gaps, justificativa, SugestaoIABadge at top, sticky-left first column. Selecting candidates from different vagas shows the pt-BR "vagas diferentes" copy (MIXED_VAGA fix).
result: [pending]

### 4. PDF export quality (TRIAGEM-04)
expected: "Exportar PDF" downloads a landscape `comparativo-candidatos.pdf` with attribute rows + candidate columns, **real candidate names** in the header (W1 fix), selectable text (not raster).
result: [pending]

### 5. CV PDF text extraction (post-research decision)
expected: For a candidatura with a real CV PDF: `resumo_cv` contains meaningful extracted text. For a corrupted/image-only PDF: `flags` includes 'cv_nao_extraido', row still status='sucesso' with respostas-only analysis.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

(verifier gap "mixed-vaga pt-BR copy" — FIXED post-verification, commit fc922cd; covered by UAT #3)
(code-review C1 IDOR/PII + W1-W4 — FIXED, commits ef5f66a/dec7fb5/43b5e08/ecb6e31/5eff82e; EFs redeployed)
