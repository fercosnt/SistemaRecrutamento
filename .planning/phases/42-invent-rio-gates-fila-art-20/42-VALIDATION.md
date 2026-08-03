---
phase: 42
slug: invent-rio-gates-fila-art-20
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-29
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `42-RESEARCH.md` § Validation Architecture (T-42-V1 .. T-42-V18).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (front)** | Vitest (config embutida em `vite.config.ts`), `happy-dom`, setup `./tests/setup.ts` |
| **Framework (EF)** | `deno test` v2.x, config `supabase/functions/deno.json` |
| **Framework (BD)** | SQL smoke com gate-GUC (molde: `p37_fidelidade_schema_smoke.sql`, `p41_recon_retry_smoke.sql`), executado via `execute_sql` do MCP Supabase |
| **Config file** | `vite.config.ts` · `supabase/functions/deno.json` — nenhuma instalação nova |
| **Quick run command** | `npm run test:run` + `deno test --allow-env --allow-read --config supabase/functions/deno.json <subdir tocado>` |
| **Full suite command** | `npm run test:run` && `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` && `npm run -s lint 2>&1 \| grep -c "error TS"` (≤ 97) |
| **Estimated runtime** | ~90–150 s (Vitest ~60 s · Deno ~20 s · lint ~30 s); smoke SQL fora do CI, via MCP |
| **Padrão de arquivo (front)** | `**/__tests__/**/*.{test,spec}.{ts,tsx}` — **obrigatório**, senão o Vitest não coleta |

---

## Sampling Rate

- **After every task commit:** `npm run -s lint` (contagem) + `npm run test:run` + `deno test` do subdiretório tocado
- **After every plan wave:** suite completa (Vitest + corpus Deno inteiro + `p42_revisao_art20_smoke.sql` via MCP)
- **Before `/gsd-verify-work`:** suite completa verde + 100% dos gates do smoke SQL + INVENT-05 com antes/depois colado
- **Max feedback latency:** ~150 s

---

## Per-Task Verification Map

> Task IDs são preenchidos pelo planner; a coluna Requirement/Test Type/Command já está travada
> pela pesquisa. `❌ W0` = arquivo não existe hoje e é dependência de Wave 0.

| Test ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T-42-V1 | TBD | 0 | REVISAO-04 | — | Não-regressão W-01: os 4 eventos vivos mantêm `subject` **e** `preheader` exatos, incl. os 3 desfechos de `decisao_final` | unit (Deno) | `deno test … _shared/__tests__/email-templates.test.ts` | ❌ W0 (estende arquivo vivo `:109-137`) | ⬜ pending |
| T-42-V2 | TBD | 0 | REVISAO-04 | — | 5º evento renderiza subject+preheader+corpo não-vazios e **sem** token de scoring (grep-guard D-15) | unit (Deno) | idem | ❌ W0 | ⬜ pending |
| T-42-V3 | TBD | 0 | REVISAO-04 | T-42-01 | **Paridade de vocabulário** nos dois sentidos: `EVENTOS_VALIDOS` ≡ `EVENTO_MAP` ≡ `SUBJECTS`/`CORPOS`/`PREHEADERS`. Fecha os 4 sítios sem cobertura de compilador | unit (Deno) | `deno test … notificar-candidato/__tests__/` | ❌ W0 — **não existe hoje** | ⬜ pending |
| T-42-V4 | TBD | 0 | REVISAO-04 | — | `montarDedupeKey('revisao_respondida', id)` = `${id}:revisao_respondida`, sem colisão com os 4 existentes | unit (Deno) | idem | ❌ W0 | ⬜ pending |
| T-42-V5 | TBD | 0 | REVISAO-04 | — | CHECK vivo aceita os **5** eventos e rejeita um 6º inventado | smoke SQL | `p42_revisao_art20_smoke.sql` (a) | ❌ W0 | ⬜ pending |
| **T-42-V6** | TBD | 0 | **REVISAO-05** | T-42-02 | **A prova nominada (critério de sucesso #3):** decisor impersonado ⇒ erro `42501 (decisor)`; outro RH impersonado ⇒ sucesso + `revisao_por_usuario` gravado | smoke SQL (impersonação real) | `p42_revisao_art20_smoke.sql` (E4) | ❌ W0 — harness existe (`funil01_pontuar_sjt_smokes.sql:134-141`) | ⬜ pending |
| T-42-V7 | TBD | 0 | REVISAO-05 | T-42-02 | **Asserção negativa:** após a tentativa barrada, `decisao_final` inalterada (`revisao_respondida_em IS NULL`, `revisao_por_usuario IS NULL`) e **zero** linha nova em `notificacoes_enviadas` | smoke SQL | idem | ❌ W0 | ⬜ pending |
| T-42-V8 | TBD | 0 | REVISAO-03 | — | Fronteira exata: justificativa de 49 chars ⇒ `22023`; 50 ⇒ aceita | smoke SQL | idem | ❌ W0 | ⬜ pending |
| T-42-V9 | TBD | 0 | REVISAO-03 | — | Idempotência: segunda resposta à mesma revisão ⇒ `22023 'ja respondida'` | smoke SQL | idem | ❌ W0 | ⬜ pending |
| T-42-V10 | TBD | 0 | REVISAO-02 | — | `classifyRevisaoSla` puro e **total**: config ausente / limiar nulo / ordem invertida / data futura ⇒ apresentação degenerada, nunca lança, clamp em 0 | unit (Vitest) | `npm run test:run` | ❌ W0 — molde em `slaThresholds.test.ts` | ⬜ pending |
| T-42-V11 | TBD | 0 | REVISAO-02 | T-42-03 | RPC de leitura projeta **exatamente** a allowlist e **nunca** `justificativa` (snapshot de chaves) | unit (Vitest) + smoke SQL | ambos | ❌ W0 | ⬜ pending |
| T-42-V12 | TBD | 0 | REVISAO-02 | — | Contador da sidebar: `0` ⇒ `undefined` (nunca "0"), erro ⇒ `undefined`, `>99` ⇒ `99+` | unit (Vitest) | `npm run test:run` | ❌ W0 (Pitfall 5) | ⬜ pending |
| T-42-V13 | TBD | 0 | REVISAO-01 | — | Trigger existe, é `AFTER UPDATE OF revisao_solicitada_em`, função com `SECURITY DEFINER` + `search_path=''` (via catálogo) | smoke SQL | idem | ❌ W0 | ⬜ pending |
| T-42-V14 | TBD | 0 | REVISAO-01 | T-42-04 | `notificar-rh` resolve destinatários com `role IN ('administrador','recrutador')` **e não** `'rh'`; respeita `NOTIFICACOES_MODO`; grava no ledger | unit (Deno, deps injetadas) | `deno test … notificar-rh/__tests__/` | ❌ W0 | ⬜ pending |
| T-42-V15 | TBD | — | INVENT-05 | T-42-05 | Antes/depois pela **mesma query** + alcance do predicado novo | **manual-only** | `execute_sql` do MCP, output colado no VERIFICATION.md | ❌ W0 | ⬜ pending |
| T-42-V16 | TBD | 0 | INVENT-05 | T-42-05 | **Asserção negativa:** após o apply, `cron.job` continua com exatamente 3 jobs e o `command` do job corrigido casa byte a byte com a migration | smoke SQL | idem | ❌ W0 | ⬜ pending |
| T-42-V17 | TBD | — | INVENT-01..04 | — | Cada artefato de `docs/compliance/` carrega data de coleta, a query que o reproduz, e a nota "Storage sem backup" verbatim | **manual-only** | — | ❌ W0 | ⬜ pending |
| T-42-V18 | TBD | 0 | Gate | — | A contagem `tsc` não sobe: `npm run -s lint 2>&1 \| grep -c "error TS"` ≤ **97** | gate | pre-commit convertido + CI | ✅ CI (baseline 104) · ❌ hook | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/functions/notificar-candidato/__tests__/vocabulario-eventos.test.ts` — T-42-V3, V4. **O item mais valioso da fase:** fecha os 4 sítios de registro que o compilador não força (`EVENTOS_VALIDOS` é `ReadonlySet<string>`, `montarDedupeKey`, `DadosEmail`, corpo do template) — exatamente onde CR-01, CR-02 e W-01 nasceram
- [ ] `supabase/functions/_shared/__tests__/email-templates.test.ts` — **estender** com T-42-V1, V2 (o arquivo já existe com 3 testes do W-01; não criar arquivo novo)
- [ ] `supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts` — T-42-V14 (deps injetáveis, espelhando `notificar-candidato` P41-01)
- [ ] `supabase/tests/p42_revisao_art20_smoke.sql` — T-42-V5..V9, V13, V16 (gate-GUC, **uma única chamada `execute_sql`**)
- [ ] `src/features/revisao/constants/__tests__/slaRevisao.test.ts` — T-42-V10
- [ ] `src/features/revisao/services/__tests__/revisaoService.test.ts` — T-42-V11, V12
- [ ] `.husky/pre-commit` convertido em gate de **não-regressão** (baseline **97**) — T-42-V18

**Instalação de framework: nenhuma.** Vitest, Deno e o idioma de smoke SQL já existem no projeto.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contagem de linhas de `ai_call_logs` antes/depois do fix, pela **mesma query** | INVENT-05 | Exige estado de PROD; não automatizável em CI | Rodar a query de contagem via `execute_sql` do MCP **antes** do apply (fato datado de blast radius), aplicar, rodar de novo. Colar os dois outputs no VERIFICATION.md. Portão destrutivo do milestone aplica-se aqui |
| Artefatos de `docs/compliance/` carregam data, query reprodutora e a nota "Storage sem backup" | INVENT-01..04 | Artefato de prosa/dado, não comportamento executável | Revisão humana de cada arquivo: existe `data de coleta`? existe a query que o reproduz? a frase sobre Storage está verbatim? |
| Status do PITR e janela | INVENT-02 | Estado de plataforma, fora do banco | Consultar via API/MCP do Supabase e registrar como fato datado, com a nota de que Storage não é coberto por backup **independente** do PITR |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 150 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
