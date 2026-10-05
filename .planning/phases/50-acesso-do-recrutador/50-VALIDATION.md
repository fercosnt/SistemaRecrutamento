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
| **Framework** | SQL smokes em PROD numa requisição atômica: o smoke p50 (que ESCREVE dentro do envelope P50C1) SÓ pelo ensaio que aborta, `scripts/p50_ensaio.cjs`; sondas só-leitura (`p50_vistas_externas.sql`) por `p46apply.cjs run` · Deno test 2.9.4 (EFs) · Vitest |
| **Config file** | `vite.config.ts` (vitest; exclui `supabase/functions/**/*.test.ts`) · nenhum para Deno |
| **Quick run command** | `node scripts/p50_ensaio.cjs supabase/tests/p50_acesso_recrutador_smoke.sql` (modo padrão: prefixa as migrations p50 que estão no disco e fora do ledger; depois do apply de todas, nenhuma — equivale a `--sem-migracoes`, contra os objetos vivos) · `deno test --allow-all supabase/functions/<slug>/`. **NUNCA** `node p46apply.cjs run` do smoke p50: essa via COMMITA, e o smoke escreve em linhas reais de PROD; desde o WR-03 do 50-REVIEW-TRACER-3 a primeira instrução do smoke recusa (`P50C RECUSADO (fora do ensaio)`) qualquer execução sem a marca `p50.tx` que só o ensaio grava |
| **Full suite command** | smoke p50 + smokes legados reescritos + `deno test --allow-all supabase/functions` + `node scripts/p50_vitest_delta.cjs` (Vitest julgado contra a base da fase `refs/gsd/50-01/base`, medida na MESMA execução — não por «zero falhas») + `npm run lint` (erros TS ≤ 90) |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** `deno test` da EF tocada, ou o check estático node da migration (idioma 49-44) + o ensaio
- **After every plan wave:** smoke p50 SEMPRE pelo ensaio que aborta — antes do apply, no modo padrão (prefixa as migrations p50 fora do ledger); depois do apply, `node scripts/p50_ensaio.cjs --sem-migracoes supabase/tests/p50_acesso_recrutador_smoke.sql` (contra os objetos vivos, aborta no sentinela, com `lock_timeout`/`statement_timeout` e leitura de persistência) — + os smokes legados tocados na onda. Não existe «real depois» por `p46apply.cjs run`: o smoke escreve dentro do envelope P50C1 e aquela via commita (WR-03 do 50-REVIEW-TRACER-3). `40001`, `LOCK TIMEOUT` e `STATEMENT TIMEOUT` saem com código 3 = inconclusivo (o ensaio e o runner já repetem um `40001` uma vez); nunca são verde nem vermelho de cláusula
- **Before `/gsd-verify-work`:** suíte completa **sem falha nova em relação à base da fase** — Deno `0 failed`; Vitest sem nenhuma falha fora do conjunto que já falhava em `refs/gsd/50-01/base`, medido na mesma execução por `scripts/p50_vitest_delta.cjs` (com mordida plantada); tsc ≤ 90 —, checkpoint de sessão real (SC1), `git log --oneline origin/main..HEAD` vazio
- **Base medida em 2026-10-05 (HEAD 20197818, antes de qualquer código da fase):** Vitest `2 failed | 2408 passed (2410)` — as 2 falhas são do portão 47-09 em `src/__tests__/promessasComExecutor.test.ts` (executor da purga do ledger de notificações, que a Phase 46 fechou sem; «Deferimento com prazo» espera a Phase 46 aberta). Elas **não são isentadas, puladas nem editadas** (a própria mensagem do teste proíbe isentar a entrada; as saídas honestas — construir o executor ou retirar a promessa — são da fila de fecho do M8, não desta fase): seguem vermelhas e entram como pré-existentes no SUMMARY do 50-09. Deno completo `1016 passed | 0 failed`. `npm run lint` sai com código 2 e 89 `error TS`. Por isso «suíte verde» literal seria um portão impossível antes de qualquer trabalho
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

> Preenchido pelo planner/executor; mapa por critério de sucesso abaixo.

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| SC1 (impersonação) | rh ativo sem vaga própria vê, em vaga ativa/inativa/arquivada, a mesma contagem de candidaturas que o admin (ambos > 0) | smoke PROD (só pelo ensaio que aborta) | `node scripts/p50_ensaio.cjs [--sem-migracoes] supabase/tests/p50_acesso_recrutador_smoke.sql` → `ENSAIO VERDE: … smoke50=<e>/<e> …` | ❌ W0 | ⬜ pending |
| SC1 (sessão real) | RH2 loga e lista candidaturas das 3 vagas | checkpoint:human-verify (+ script opcional) | `node scripts/p50_sessao_real.cjs` | ❌ W0 | ⬜ pending |
| SC2 | rh inativo → 0 linhas / 42501; candidato → 0 linhas alheias e, em toda RPC guardada e em toda fila, 42501 (vazio aceito só nas de leitura), com controle positivo na mesma rodada; anon = baseline; admin = totais | smoke | idem | ❌ W0 | ⬜ pending |
| SC3 | varredura por forma acha 0 (policies: catálogo inteiro, `storage` incluído, cobertura = `count(pg_policy)`; funções: schemas não-gerenciados); portão morde (mutação + `pg_temp`) | smoke + `scripts/p50_mutacoes.cjs` + probe de fonte das EFs | idem | ❌ W0 | ⬜ pending |
| SC4 | filas de pedidos/revisões md5-iguais admin vs rh ativo | smoke | idem | ❌ W0 | ⬜ pending |
| SC5 | REVISAO-05 / D-23 continuam valendo | smoke + `p42_revisao_art20_smoke.sql` | idem | parcial | ⬜ pending |
| EFs | 5 EFs: rh ativo não-dono → 200; não-RH/inativo → 403; 3c do comparativo mantido | deno | `deno test --allow-all supabase/functions/{comparativo-candidatos,get-curriculo-url,consolidar-decisao-final,gerar-guia-entrevista,avaliar-transcricao-entrevista}/` | ✅ (a inverter) | ⬜ pending |
| D-08 | `anonimizar_candidato` / `plano_exclusao_titular` intocados | POS-PORTAO das migrations `…0003`/`…0004` (impressão digital início = fim na própria transação) + checagem viva antes/depois do apply (50-10) — portões que precisam passar, não o veredito da varredura | `node scripts/p50_ensaio.cjs …` (token `0N:d08=igual`) · verify D-08 do 50-10 | ❌ W0 | ⬜ pending |
| Regressão local | nenhuma falha de Vitest nova em relação à base da fase; mordida plantada é detectada | script | `node scripts/p50_vitest_delta.cjs` | ❌ W0 (50-09) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/p50_acesso_recrutador_smoke.sql` — SC1 (impersonação), SC2, SC3, SC4, SC5
- [ ] `scripts/p50_mutacoes.cjs` — mordida do SC3
- [ ] probe de fonte das EFs com fixture de mordida
- [ ] `scripts/p50_sessao_real.cjs` (opcional, rodado pelo operador)
- [ ] `scripts/p50_vitest_delta.cjs` — delta do Vitest contra a base da fase, na mesma execução (50-09)
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
