---
phase: "50"
slug: "acesso-do-recrutador"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-05"
---

# Phase 50 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Fonte: `50-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | SQL smokes em PROD via `p46apply.cjs run` (uma requisição atômica) · Deno test 2.9.4 (EFs) · Vitest |
| **Config file** | `vite.config.ts` (vitest; exclui `supabase/functions/**/*.test.ts`) · nenhum para Deno |
| **Quick run command** | `node p46apply.cjs run supabase/tests/p50_acesso_recrutador_smoke.sql` · `deno test --allow-all supabase/functions/<slug>/` |
| **Full suite command** | smoke p50 + smokes legados reescritos + `deno test --allow-all supabase/functions` + `CI=true npx vitest run` + `npm run lint` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** `deno test` da EF tocada, ou o check estático node da migration (idioma 49-44) + o ensaio
- **After every plan wave:** smoke p50 (ensaio antes do apply, real depois) + os smokes legados tocados na onda
- **Before `/gsd-verify-work`:** suíte completa verde, checkpoint de sessão real (SC1), `git log --oneline origin/main..HEAD` vazio
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

> Preenchido pelo planner/executor; mapa por critério de sucesso abaixo.

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| SC1 (impersonação) | rh ativo sem vaga própria vê, em vaga ativa/inativa/arquivada, a mesma contagem de candidaturas que o admin (ambos > 0) | smoke PROD | `node p46apply.cjs run supabase/tests/p50_acesso_recrutador_smoke.sql` | ❌ W0 | ⬜ pending |
| SC1 (sessão real) | RH2 loga e lista candidaturas das 3 vagas | checkpoint:human-verify (+ script opcional) | `node scripts/p50_sessao_real.cjs` | ❌ W0 | ⬜ pending |
| SC2 | rh inativo → 0 linhas / 42501; candidato e anon = baseline; admin = totais | smoke | idem | ❌ W0 | ⬜ pending |
| SC3 | varredura por forma acha 0; portão morde (mutação) | smoke + `scripts/p50_mutacoes.cjs` + probe de fonte das EFs | idem | ❌ W0 | ⬜ pending |
| SC4 | filas de pedidos/revisões md5-iguais admin vs rh ativo | smoke | idem | ❌ W0 | ⬜ pending |
| SC5 | REVISAO-05 / D-23 continuam valendo | smoke + `p42_revisao_art20_smoke.sql` | idem | parcial | ⬜ pending |
| EFs | 5 EFs: rh ativo não-dono → 200; não-RH/inativo → 403; 3c do comparativo mantido | deno | `deno test --allow-all supabase/functions/{comparativo-candidatos,get-curriculo-url,consolidar-decisao-final,gerar-guia-entrevista,avaliar-transcricao-entrevista}/` | ✅ (a inverter) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/p50_acesso_recrutador_smoke.sql` — SC1 (impersonação), SC2, SC3, SC4, SC5
- [ ] `scripts/p50_mutacoes.cjs` — mordida do SC3
- [ ] probe de fonte das EFs com fixture de mordida
- [ ] `scripts/p50_sessao_real.cjs` (opcional, rodado pelo operador)
- [ ] reescrita dos smokes legados e testes Deno (tabela «Legacy test disposition» do RESEARCH)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sessão real de recrutador ativo vê candidaturas de vaga ativa/inativa/arquivada | EXPORT-05 / SC1 | Exige conta real criada pelo operador e login com senha | Operador cria RH2 em `/rh/configuracoes`, define senha, loga e abre os candidatos das 3 vagas |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
