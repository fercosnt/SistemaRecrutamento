---
phase: 45
slug: motor-de-exclus-o-anonimiza-o
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-04
source: 45-RESEARCH.md § Validation Architecture
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> ⚠ **Esta fase não tem segunda rede.** PITR está desligado por decisão datada (D-45-10) e o backup
> do Supabase cobre 7 dias **excluindo Storage inteiramente** — um CV apagado é irrecuperável por
> qualquer meio. O dry-run pela **MESMA query** do delete real deixa de ser processo e passa a ser
> o mecanismo de segurança. As asserções **negativas** desta estratégia (o que NÃO aconteceu) são
> a metade que prova isso.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **Vitest** (config inline em `vite.config.ts`, bloco `test`) · **Deno test** para Edge Functions · **smokes SQL** em `supabase/tests/` |
| **Config file** | `vite.config.ts` — `environment: 'happy-dom'`, `setupFiles: ['./tests/setup.ts']`, `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']` |
| **Quick run command** | `npx vitest run <caminho tocado>` (ex.: `npx vitest run src/features/privacidade`) |
| **Full suite command** | `npm run test:run` · `npm run lint` · `npm run build` (postbuild: `assert-no-secrets` + `assert-chunks`) · `npm run check:export-allowlist` |
| **EF tests** | `deno test` sobre `supabase/functions/**` — excluídos do Vitest por specifiers `https:`/`npm:` |
| **Smokes SQL** | Executados por MCP `execute_sql` numa **única chamada** — `set_config(..., false)` é escopado à sessão, e statements em chamadas separadas zeram o contador |
| **Estimated runtime** | Vitest full ~60–90 s (suíte 1596) · Deno ~10 s · smoke SQL ~1 s |

⚠ **`npm run lint` não é gate binário.** A Phase 42 o converteu em não-regressão contra a baseline
congelada de **97** erros `tsc`. Por isso **"zero `--no-verify`" é satisfazível honestamente** nesta
fase — e é exigência do portão destrutivo, não preferência.

---

## Sampling Rate

- **Por commit de tarefa:** `npx vitest run <caminho tocado>` + `npm run lint` (o hook conta e compara contra 97)
- **Por merge de wave:** `npm run test:run` + `npm run lint` + `npm run build` + `npm run check:export-allowlist` + `--check` do gerador do recibo
- **Antes de `/gsd-verify-work`:** suíte inteira verde
- **Portão de fase (os 5 itens, condição de fechamento):** `VERIFICATION.md` com veredito · code review **bloqueante ANTES** do apply em PROD · **asserções negativas** · **zero `--no-verify`** · dry-run pela **MESMA query** do delete real, exercitado
- **Max feedback latency:** ~90 s

---

## Per-Task Verification Map

> Preenchido por requirement enquanto os PLANs não existem; o planner substitui a coluna Task ID.
> **Sete das treze linhas são asserções NEGATIVAS** — nesta fase, o que não aconteceu é a prova.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| ERASE-01 | Snapshot roda antes da 1ª anonimização; faixa etária materializada sobrevive ao tombstone | smoke SQL | `execute_sql` de `supabase/tests/p45_motor_exclusao_smoke.sql` (gate-GUC) | ❌ W0 | ⬜ pending |
| ERASE-01 / D-45-04 | k=5 suprime **e** a supressão complementar impede a subtração pelos totais | smoke SQL + unit | idem + `npx vitest run src/features/privacidade` | ❌ W0 | ⬜ pending |
| ERASE-02 | Tombstone completa contra **todas** as 6 CHECKs e os NOT NULLs; re-run é no-op | smoke SQL (caminho **FELIZ**, não só recusa) | idem | ❌ W0 | ⬜ pending |
| ERASE-03 | Ordem `Storage → Postgres → Auth`; cada passo idempotente | unit (Deno, `deps` mockados) | `deno test supabase/functions/executar-direito-titular/` | ❌ W0 | ⬜ pending |
| ERASE-04 | Caminhos capturados **antes** da 1ª mutação; retomada não redescobre | unit (Deno) | idem | ❌ W0 | ⬜ pending |
| ERASE-05 | Distinção legível; `stopPropagation` no card clicável | unit (Vitest, evento **no elemento**, com bubbling real) | `npx vitest run src/features/vagas` | ❌ W0 | ⬜ pending |
| ERASE-05 / D-45-06 | **NEGATIVA:** encerrar NÃO gera evento `'decisao'` nem `auto_rejeitado = true` | smoke SQL | `p45_motor_exclusao_smoke.sql` | ❌ W0 | ⬜ pending |
| ERASE-06 | Janela de 15 dias lida da config; cancelamento **não** reabre candidatura | unit + smoke | `npx vitest run src/features/privacidade` | ❌ W0 | ⬜ pending |
| ERASE-07 | Cada linha "sai" mapeia a um passo real do motor; gerador `--check` verde | unit (Node) | `node docs/compliance/sql/gen-recibo-exclusao.cjs --check` | ❌ W0 | ⬜ pending |
| ERASE-08 | **NEGATIVA:** contagem INALTERADA em `historico_candidatura`, `decisao_final`, `decisao_final_historico`; **nenhuma** FK relaxada para CASCADE | smoke SQL sobre `pg_constraint` + contagens antes/depois | `p45_motor_exclusao_smoke.sql` | ❌ W0 | ⬜ pending |
| ERASE-09 | As 5 tabelas `SET NULL` tratadas; fixture sintética para as 2 com 0 linhas | smoke SQL | idem | ❌ W0 | ⬜ pending |
| ERASE-10 | **NEGATIVA:** zero `candidatos` com `user_id` existente em `auth.users` após execução; zero `historico_candidatura.ator` apontando ao titular | smoke SQL | idem | ❌ W0 | ⬜ pending |
| D-45-08 (e-mail RH) | Assunto neutraliza CR/LF; corpo **sem** nome/CPF/`candidato_id`/`solicitacao_id` | unit (Deno, fixture com todos os valores presentes) | `deno test supabase/functions/notificar-rh/` | parcial (molde P42) | ⬜ pending |
| UI-SPEC (copy) | Bans **no escopo declarado**; coocorrência do qualificador de cancelamento | unit (Vitest) | `npx vitest run src/features/privacidade` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/p45_motor_exclusao_smoke.sql` — gate-GUC no idioma do `p43_previa_smoke.sql`, cobrindo ERASE-01/02/08/09/10 com asserções **negativas** e **exercitando o caminho feliz do tombstone**, não só a recusa
- [ ] `supabase/functions/executar-direito-titular/index.test.ts` — `handler(req, deps)` com `deps` mockados, sem `--allow-net` (molde do 41-01)
- [ ] `docs/compliance/sql/gen-recibo-exclusao.cjs` + entrada `--check` no `package.json`
- [ ] Fixture sintética para `ai_call_logs` e `candidate_ai_decisions` — **0 linhas em PROD, então sem fixture o teste passa por vacuidade**
- [ ] Teste de mis-tap do controle de retirada disparando evento **no elemento** com bubbling real — um teste que invoca o handler direto **passa com o defeito presente** (`DashboardCandidatoPage.tsx:288`)
- [ ] **Teste de re-identificação como gate:** após anonimizar um candidato sintético, tentar reencontrá-lo por (faixa etária + UF + vaga + timestamp). **Achou 1 linha → a anonimização falhou.**

⚠ **A lição do contador de asserções (P43/W-1) vale aqui.** Um smoke em batch de chamada única
aborta na primeira asserção que dispara, e todas as seguintes tornam-se **inalcançáveis** contando
como verdes. O `p45_motor_exclusao_smoke.sql` deve ser escrito para que **nenhuma asserção precoce
possa matar as asserções negativas do ERASE-08/10** — elas são a prova de que a trilha sobreviveu.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sonda de hard delete com histórico de funil | ERASE-03 / ERASE-10 | **Escreve** — mede se o `23503` do Pitfall 2 acontece de fato e como a Admin API o reporta. Checkpoint do orquestrador em ambiente controlado, **nunca sobre conta real** | (i) criar conta descartável; (ii) criar candidatura e forçar uma transição (gera `historico_candidatura.ator`); (iii) subir arquivo no bucket; (iv) `deleteUser(id)` **sem** severar nada, registrar o corpo do erro; (v) severar `ator` e `user_id`, repetir; (vi) apagar tudo |
| 5 sondas read-only de PROD | ERASE-02 / ERASE-03 / ERASE-08 | Subagentes GSD **não recebem os tools MCP do Supabase** (bug upstream). Três delas fecham assunções que, se erradas, quebram a transação de anonimização **no primeiro pedido real** | `45-RESEARCH.md` § Environment Availability — constraints/nullability vivas de `candidatos`; FKs de `storage.objects`; objetos por bucket e prefixo; re-confirmação do grafo de FK; `cron.job` vivo × repositório |
| Dry-run pela MESMA query, exercitado em PROD | Portão destrutivo (integral) | É o **único** mecanismo de segurança que a fase tem — PITR desligado, Storage sem backup | Rodar o dry-run em rollback pela mesma expressão do delete real; delta esperado ≡ 0 antes de qualquer apply |
| Code review bloqueante ANTES do apply | Portão destrutivo (integral) | Origem: a P39 fechou sem VERIFICATION.md nem code review e **2 CRITICAL chegaram a PROD** | `/gsd-code-review 45` verde antes do primeiro `apply_migration` destrutivo |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90 s
- [ ] Nenhuma asserção precoce do smoke pode tornar inalcançáveis as negativas do ERASE-08/10 (lição W-1 da P43)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
