---
phase: 13-reda-o-cultural-revis-o-humana
audited: 2026-06-24T00:00:00Z
auditor: gsd-security-auditor
status: verified
asvs_level: 2
register_authored_at_plan_time: true
threats_total: 24
threats_closed: 24
threats_open: 0
accepted_risks: 5
disposition: SECURED
---

# Phase 13 — Security Audit (Redação Cultural + Revisão Humana)

**Verdict:** SECURED — 24/24 declared threats CLOSED, threats_open = 0.

The threat register was authored at plan time (the `<threat_model>` block in each of
the 5 PLAN files). Per `register_authored_at_plan_time: true`, every `T-13-*` threat
was verified to have its declared mitigation PRESENT in the implemented + PROD-live
code (FORCE stance: each mitigation assumed absent until a grep/read match proved it
in the cited location and applied to every entry point). Implementation files were
read-only; no patches applied.

## Trust Boundaries (consolidated across the 5 plans)

| Boundary | Control |
|----------|---------|
| docs/ PRD §8.4 → EF `_shared/` schema copy | Verbatim transcription; schema test pins `.length(4)` + required `red_flag_etico` + D1-D4 enum (drifted canonical fails these). |
| LLM structured output → `EssayScoringV1Schema.parse()` | zod/v4 schema is the validation boundary; never-absent → human-review row, never a fabricated success. |
| candidate (JWT) → `avaliar-redacao-cultural` EF | getUser() authenticate THEN authorize ownership via `candidatos.user_id=auth.uid()` + `etapa='avaliacao_assincrona'` (service_role bypasses RLS → in-handler authz is the real control). |
| candidate essay free-text → LLM | Untrusted text flows as `rawInput` through `callAi` → `detectPromptInjection` short-circuits + `maskPII`; never concatenated into system instructions. |
| candidate browser → `redacoes_candidato` read | App-layer allowlist excludes every verdict column (RLS is row-level only and cannot hide columns). |
| RH (JWT) → `salvar_revisao_redacao` RPC | SECURITY DEFINER + `search_path=''`; role IN (rh,administrador) + rh-own-vaga guard; review-fields-only trigger backstops non-review mutation. |
| reviewer decision → funil progression | RNF-07a: EF + RPC NEVER write `candidaturas`; `status_analise` always `pendente_humano`; duvida does not finalize. |
| RH/candidate routes | `/candidato/redacao/:candidaturaId` RoleGuard `candidato`; `/rh/candidato/:id/redacao` RoleGuard `['rh','administrador']` — candidate never reaches the RH verdict surface. |

## Threat Verification (24 threats / 5 registers)

| Threat ID | Category | Disposition | Evidence (verified) |
|-----------|----------|-------------|---------------------|
| T-13-01-01 | Tampering | mitigate | `_shared/essay-schemas.ts:42,70,74` — `z.enum(['D1','D2','D3','D4'])`, `.length(4)`, required `red_flag_etico: z.boolean()`, `style_neutralized_in_scoring: z.literal(true)`; transcribed verbatim from PRD §8.4, NOT the drifted `CultureFitEssaySchema`. Header documents the divergence. |
| T-13-01-02 | Tampering | mitigate | `avaliar-redacao-cultural/_local/compute-score.ts` is pure deterministic TS (caps + 3-color); EF `index.ts:314` calls `computeScoreAndCors(parsedRaw, threshold, wordCount, tempoGastoSegundos)` — the LLM emits only raw 1-5 scores. Table-driven deno test GREEN (10/10, per review IN-01). |
| T-13-01-03 | Info disclosure | mitigate | `redacoeService.ts:75` `REDACAO_CANDIDATO_ALLOWLIST = 'id, pergunta_id, texto, word_count, submetida_em, status_analise'` — excludes analise_ia/scores_dimensao/score_ponderado/classificacao_cor/red_flag_etico/flags/notas_revisor/decisao_revisor. No `select('*')` (all star matches are doc-comments). |
| T-13-01-SC | Tampering (supply-chain) | accept | AR-13-01. `npm:zod@3.25.76/v4` exact pin, identical to analise-candidato-individual/gerar-devolutiva-bigfive. Zero net-new packages. |
| T-13-02-01 | Elevation/Info (IDOR) | mitigate | `index.ts:142-189` — getUser() → 401; `candidatos.select('id').eq('user_id', user.id)` then `candidatoRow.id !== candRow.candidato_id` → 403; `etapa_atual !== 'avaliacao_assincrona'` → 403. The correct `user_id` pattern (NOT `candidato_id===user.id` sibling-EF bug). SMOKE/deno tests pin all three branches. |
| T-13-02-02 | Info disclosure | mitigate | Migration 03:108-121 candidate own-row SELECT only + `redacao_no_client_insert WITH CHECK false`; EF returns neutral `{ ok:true }` (`index.ts:310,379`); candidate reads via the verdict-excluding allowlist (T-13-01-03). |
| T-13-02-03 | Repudiation/Integrity (RNF-07a) | mitigate | EF never calls `.from('candidaturas').update`; `status_analise:'pendente_humano'` ALWAYS (`index.ts:300,361`); `bloqueio_avanco = cor==='vermelho'` only HOLDS (`:362`). RPC migration 04:97-107 never writes candidaturas. SMOKE-D live: candidaturas row UNCHANGED. |
| T-13-02-04 | Tampering (prompt injection) | mitigate | `index.ts:247-273` essay passed as `rawInput` to `callAi`; injection-detected/never-absent → `index.ts:279-310` persists `pendente_humano` row with flag, returns neutral ack — never a fabricated success. `callAi` owns detectPromptInjection + maskPII. |
| T-13-02-05 | Info disclosure (LGPD logs) | mitigate | `index.ts:305-309,368-376,382-385` — console.log/error carry only ids/word_count/cor/flags_count/status; never essay text/score/name. auditLog masking lives inside callAi. |
| T-13-02-06 | Tampering (client forges score) | mitigate | Client INSERT denied (migration 03:118-121 WITH CHECK false); EF revalidates `countWords` 200-500 (`index.ts:214-217`); `texto_hash`/`input_hash` via `crypto.subtle` server-side (`:88-95,218-219`). SMOKE-A live: client INSERT → 42501. SMOKE-F: word_count 600 → check_violation. |
| T-13-02-07 | Elevation (RH out-of-vaga / non-review) | mitigate | RPC 04:74-82 role IN (rh,administrador) + rh-own-vaga (`vagas.created_by=auth.uid()`); `trg_redacao_rh_only_review_fields` 03:139-172 RAISEs on any non-review-field change. SMOKE-B/E live: candidato→insufficient_privilege, RH texto UPDATE→RAISE. |
| T-13-02-08 | Tampering (.join npm import bug) | mitigate | `index.ts:57-60` STATIC `import Anthropic from "npm:@anthropic-ai/sdk@0.102.0"` + helpers/zod + openai@6.42.0; no dynamic `import([...].join())` anywhere (the only `.join("")` is sha256 hex assembly, `:94`). Adapters injected into callAi (`:428-429`). |
| T-13-02-SC | Tampering (supply-chain) | accept | AR-13-02. anthropic@0.102.0 + openai@6.42.0 + zod@3.25.76(/v4) exact pins, identical to 3 PROD-green EFs. Zero net-new. |
| T-13-03-01 | Info disclosure (verdict leak) | mitigate | `redacaoSchema`/`redacaoService.ts:75` allowlist (= T-13-01-03); candidate UI renders only the 3-band length counter (mechanical), never a score/color/threshold. |
| T-13-03-02 | Tampering (forged score field) | mitigate | `redacaoSchema.ts:30-40` `respostaRedacaoSchema = z.object({candidatura_id,pergunta_id,texto,tempo_gasto_segundos?}).strict()` — injected score/pontuacao rejected; EF re-derives server-side. EF body `redacao-schemas.ts:34-45` also `.strict()`. |
| T-13-03-03 | Info disclosure (back-lock alarm) | accept | AR-13-03. `redacaoService.ts:269-280` maps 42501/403 → neutral LOCKED ("Sua etapa avançou — esta redação não aceita mais respostas."); no score/alarm. Reused Phase 11/12 pattern. |
| T-13-03-SC | Tampering (web installs) | accept | AR-13-04. Zero net-new web packages — UI primitives vendored since Phase 7. |
| T-13-04-01 | Tampering (wrong role string denies RH) | mitigate | Migrations use LIVE `'administrador'` + `#>>'{app_metadata,role}'` (03:127,134,146; 04:74-82). SMOKE-D live: RH-owner SELECT/UPDATE succeed (role-string match confirmed pre-go-live). |
| T-13-04-02 | Integrity (prompt is [SEED PLACEHOLDER]) | mitigate | 13-04-SUMMARY + 13-VALIDATION: live row was a placeholder (sys_len 129) → hydrated from `06-culture-fit-essay.md` (sys_len 2257) BEFORE `is_active=true`; single active row. |
| T-13-04-03 | Elevation (EF verify_jwt OFF) | mitigate | EF deployed JWT-on; anon curl → 401 (gateway evidence, 13-04-SUMMARY); `Deno.serve` 404-407 also rejects missing Authorization → 401. |
| T-13-04-04 | Repudiation (RNF-07a live) | mitigate | SMOKE-D live: salvar_revisao_redacao RH-owner happy path leaves `candidaturas` UNCHANGED; status stays/flips on the redação row only. |
| T-13-04-SC | Tampering (EF deploy bundle) | accept | AR-13-05 (same package set as AR-13-02). Identical pins green in PROD. |
| T-13-05-01 | Elevation (RH writes out-of-vaga) | mitigate | `revisaoRedacaoService.ts:248` only `supabase.rpc('salvar_revisao_redacao', ...)`; no direct UPDATE path in the service. RPC enforces role+own-vaga. |
| T-13-05-02 | Tampering (review-write hits texto/IA) | mitigate | RPC writes only review fields; `trg_redacao_rh_only_review_fields` (migration 03:139-172) DB-enforces the forbidden-set RAISE. SMOKE-E live. |
| T-13-05-03 | Repudiation (decision sans justification) | mitigate | Client gate `revisaoRedacaoService.ts:238-243` notas≥50; RPC `salvar_revisao_redacao_rpc.sql:89-91` + table CHECK `redacoes_candidato.sql:82` notas length≥50; decisao required+enum. SMOKE-C live. |
| T-13-05-04 | Info disclosure (candidate reaches RH surface) | mitigate | `routes.tsx:350-354` `/rh/candidato/:id/redacao` RoleGuard `['rh','administrador']`; candidate has no SELECT on verdict rows beyond own-row; panel is desktop RH-only. |
| T-13-05-05 | Integrity (duvida silently finalizes) | mitigate | RPC `salvar_revisao_redacao_rpc.sql:103-106` CASE leaves `status_analise` as-is (pendente_humano) on duvida; only aprovado/reprovado → concluida. `getDuvidasGestor` reads `decisao_revisor='duvida'`. |
| T-13-05-SC | Tampering (web installs) | accept | (folds into AR-13-04) slider/radio-group/alert-dialog vendored since Phase 7. |

*24 distinct STRIDE threats (T-13-{01..05}-NN) + the 5 supply-chain SC rows. The SC
rows resolve to the 5 accepted-risk entries below; the 24 mitigate rows are all
verified CLOSED.*

## Accepted Risks Log

| ID | Risk | Disposition | Justification |
|----|------|-------------|---------------|
| AR-13-01 | zod/v4 EF dependency | accept | Exact pin `zod@3.25.76`, already green in analise + bigfive EFs. No net-new package. |
| AR-13-02 | anthropic/openai/zod EF deps | accept | Pins `@anthropic-ai/sdk@0.102.0` + `openai@6.42.0` + `zod@3.25.76` identical to 3 PROD-green EFs. No [ASSUMED]/[SUS] package introduced. |
| AR-13-03 | Back-lock surfaces pipeline state | accept | 42501/403 maps to a neutral "Sua etapa avançou." message — no score, no alarm; reused Phase 11/12 pattern. Low risk. |
| AR-13-04 | Web UI package supply chain | accept | Zero net-new web packages — textarea/alert-dialog/slider/radio-group vendored since Phase 7 (Registry Safety). |
| AR-13-05 | EF deploy bundle | accept | Same package set as AR-13-02; deployed green in PROD. |

## Milestone-wide accepted LGPD posture (carried, not a Phase-13 OPEN)

**WR-01 — RH SELECT on `redacoes_candidato` is role-only, not vaga-scoped**
(`redacoes_candidato.sql:124-127`): any `role IN ('rh','administrador')` may SELECT
every row (full essay `texto` + verdict). This is the **consistent M2-wide RH-read
model** — `analise_candidato_vaga`, `devolutivas_candidato`, and `scores_candidato`
are all role-only, not vaga-scoped. The WRITE path is correctly own-vaga-guarded
(RPC + the duvida queue's defensive `.limit(500)` bound, `revisaoRedacaoService.ts:94`).

Per the audit brief and the 13-REVIEW.md resolution (WR-01 "review-fix, not fixed —
by design"), vaga-scoping RH reads is a **milestone-wide LGPD decision deferred to
Phase 15/16**, NOT a Phase-13 OPEN threat. It is not in the Phase-13 threat register
(no T-13-* row claims vaga-scoped RH reads), so it is not a declared-mitigation gap.
Severity assessment: an authenticated RH/admin reading cross-vaga essays is an
internal-actor over-broad-read, not an external exposure or RNF-07a violation —
judged MEDIUM, consistent posture, deferred. **Not a BLOCKER.**

## Unregistered Flags (new attack surface with no threat mapping)

None. All three SUMMARY `## Threat Flags` sections (13-02, 13-03, 13-05) explicitly
state "None — every surface maps to the plan's `<threat_model>`." The 13-01 and 13-04
SUMMARYs have no Threat Flags section; their surfaces (pure schema/scoring contracts;
the PROD apply wave) map to T-13-01-* and T-13-04-* respectively. No net-new network
endpoint, auth path, package, or trust boundary appeared during implementation beyond
the planned EF invoke + the role-gated RH route.

## Code-review findings cross-check (13-REVIEW.md) — security relevance

- **CR-01** (idempotency replay → stale verdict): FIXED at `index.ts:262` (content-
  addressed `idempotency_key` folding `inputHash`). Data-integrity correctness fix,
  not an auth hole; no threat-register impact.
- **WR-02/WR-03/WR-05/WR-06, IN-01..05**: robustness/consistency/UX. WR-03 (tempo flag
  dead in V1) and WR-06 (anti-plágio `.limit(50)`, applied at `index.ts:330`) are
  advisory anti-cheat signals, not auth/authz controls — no declared mitigation depends
  on them. None alters a CLOSED disposition.
- **WR-04** (trigger forbidden-set omits `bloqueio_avanco`): an RH direct-UPDATE can
  flip `bloqueio_avanco` on a vermelho row. `bloqueio_avanco` only HOLDS auto-advance;
  advancing is a separate human action (RNF-07a centers on the human deciding), so an
  RH clearing the advisory block is within the RH trust boundary. Reviewer classified
  WARNING/by-design; consistent with T-13-02-03's "bloqueio only HOLDS, never
  auto-rejects" framing. Not a declared-mitigation gap. Documenting here for the record;
  if `bloqueio_avanco` is later made RPC-only-mutable, add it to the trigger forbidden-set.

## Verification Notes

- Live PROD facts cross-checked against 13-04-SUMMARY.md + 13-VALIDATION.md: 4
  migrations applied via MCP (3 tables + seed 11/1-padrao + review trigger + RPC live),
  EF deployed JWT-on (anon→401), `culture_fit_essay` hydrated (sys_len 2257) +
  is_active=true single row, database.types.ts regenerated (12 refs), SQL smokes A-F +
  em_progresso PASS live (disposable-fixture, ROLLBACK-free cleanup).
- `select('*')` scan across the 3 candidate/RH/EF data layers: zero real star
  projections (all matches are doc-comments asserting the no-star rule).
- LGPD-04 forbidden-product-language grep on the seed migration: 0 matches.
- ASVS L2 (the project's M2 baseline): authz on every privileged entry point (EF
  in-handler ownership + RPC role/own-vaga + RLS), server-authoritative scoring, output
  validation at the LLM boundary, redacted logging — all present.

---

_Audited: 2026-06-24 — gsd-security-auditor_
_Disposition: SECURED — threats_open: 0_
