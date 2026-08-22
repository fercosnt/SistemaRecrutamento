---
phase: 46
slug: purga-autom-tica-dry-run-live
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-22
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `46-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (front)** | Vitest 4.1.9 (`package.json:94`) |
| **Config file** | `vite.config.ts` (bloco `test`, linhas 9-94) |
| **Framework (Edge Functions)** | `deno test` — **não** Vitest (`vite.config.ts:14-18` exclui) |
| **Framework (banco)** | Smoke SQL em `supabase/tests/p<NN>_*_smoke.sql`, executado por MCP `execute_sql` numa **única chamada** — o contador de asserções é GUC de sessão |
| **Quick run command** | `npm run lint && npm run test:run` |
| **Full suite command** | `npm run lint && npm run test:run && npm run test:e2e` + smokes por MCP |
| **Estimated runtime** | ~90s (lint + unit) · smokes ~5s cada |

⚠ **Restrição operacional herdada:** os smokes SQL e todo apply de migration correm **por MCP
`execute_sql` / `apply_migration`, pelo ORQUESTRADOR** — subagentes GSD não recebem os tools MCP do
Supabase (`anthropics/claude-code#13898`). `supabase db push` é proibido neste projeto.

---

## Sampling Rate

- **After every task commit:** `npm run lint && npm run test:run`
- **After every plan wave:** o smoke da fase por MCP numa única chamada, **mais os três smokes
  herdados afetados** — `p42_invent05_cron_smoke`, `p43_previa_smoke`, `p45_motor_exclusao_smoke`
- **Before `/gsd-verify-work`:** suíte completa verde
- **Phase gate (portão destrutivo INTEGRAL):** `46-VERIFICATION.md` com veredito (nunca
  ausente/`draft`) + code review bloqueante **antes** do apply em PROD + asserções negativas +
  zero `--no-verify` + dry-run exercitado pela mesma query do delete real
- **Max feedback latency:** ~90s

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. This table is the **requirement→test contract** the plans
> must satisfy; the executor fills `Task ID` / `Plan` / `Wave` / `Status` as plans are written.
> `⊖` marks a **negative assertion** (proves what did NOT happen) — the destructive gate requires them.

| Req | Behavior | Test Type | Automated Command / Assertion | File Exists | Status |
|-----|----------|-----------|-------------------------------|-------------|--------|
| PURGA-01 | Existe exatamente 1 job de purga, com schedule e corpo declarados; os 3 herdados intocados | smoke SQL | `p46_purga_smoke.sql` (a) | ❌ W0 | ⬜ pending |
| PURGA-01 | O smoke herdado não reprova por causa do 4º job | smoke SQL | `p42_invent05_cron_smoke.sql` (a) **emendado** | ⚠ emenda | ⬜ pending |
| PURGA-02 | O predicado vivo casa byte a byte com a migration (md5 re-pinado) e mantém a FORMA | smoke SQL | `p43_previa_smoke.sql` (e) **re-pinado** | ⚠ re-pin | ⬜ pending |
| PURGA-02 | Os wrappers CHAMAM o predicado único e não releem a matriz | smoke SQL | `p43_previa_smoke.sql` (f) | ⚠ existe | ⬜ pending |
| PURGA-02 | O loop de dry-run termina em `P45DR` e **zero coluna** mutou | smoke SQL | `p46_purga_smoke.sql` (b) | ❌ W0 | ⬜ pending |
| PURGA-03 | ⊖ `modo='dry_run'` sobre conjunto NÃO-VAZIO não apagou nada e não subiu `net._http_response` | smoke SQL | `p46_purga_smoke.sql` (c) | ❌ W0 | ⬜ pending |
| PURGA-04 | A RPC **RECUSA** `dry_run → live` quando os critérios de D-46-14 + D-46-22 não são satisfeitos | smoke SQL | `p46_purga_smoke.sql` (d) | ❌ W0 | ⬜ pending |
| PURGA-04 | A mudança de modo grava linha em `logs_auditoria` na **mesma transação** | smoke SQL | `p46_purga_smoke.sql` (e) | ❌ W0 | ⬜ pending |
| PURGA-05 | ⊖ `modo='off'` sobre conjunto NÃO-VAZIO: `elegiveis > 0`, `processados = 0`, zero mutação | smoke SQL | `p46_purga_smoke.sql` (f) | ❌ W0 | ⬜ pending |
| PURGA-05 | ⊖ Conjunto acima do cap **ABORTA** — zero linha tocada, zero post, ledger `cap_excedido` | smoke SQL | `p46_purga_smoke.sql` (g) | ❌ W0 | ⬜ pending |
| PURGA-06 | ⊖ Nenhuma coluna do ledger casa a banlist de PII (aferido sobre o **CATÁLOGO**, não sobre dados) | smoke SQL | `p46_purga_smoke.sql` (h) | ❌ W0 | ⬜ pending |
| PURGA-06 | Cada item registra `etapa`, `janela_meses_aplicada`, `ancora_origem`, `ancora_em` | smoke SQL | `p46_purga_smoke.sql` (i) | ❌ W0 | ⬜ pending |
| PURGA-07 | ⊖ `retencao_hold` protege · ⊖ vaga aberta protege · ⊖ revisão Art. 20 aberta protege | smoke SQL | `p46_purga_smoke.sql` (j.1-3) | ❌ W0 | ⬜ pending |
| PURGA-07 | Candidatura com `data_decisao_final IS NULL` classificada pelo degrau correto, nunca omitida | smoke SQL | `p46_purga_smoke.sql` (k) | ❌ W0 | ⬜ pending |
| PURGA-07 | ⊖ Um estado sem `elegivel_purga` NÃO entra no conjunto (D-46-19: só `aprovado`/`rejeitado`/`decisao_final`) | smoke SQL | `p46_purga_smoke.sql` (l) | ❌ W0 | ⬜ pending |
| RETEN-05 | Linha além da janela é apagada; linha dentro sobrevive; a regra roda **sem** DELETE de pai | smoke SQL | `p46_purga_smoke.sql` (m) | ❌ W0 | ⬜ pending |
| RETEN-05 | ⊖ O `COMMENT ON TABLE` vivo **não** contém "INDEFINITE" e **contém** a janela e a âncora | smoke SQL | `p46_purga_smoke.sql` (n) | ❌ W0 | ⬜ pending |
| B-01 | O md5 de `anonimizar_candidato` bate o pin **re-carimbado**, e o guard novo recusa fora de `modo='live'` | smoke SQL | `p45_motor_exclusao_smoke.sql` (C3) + `p46_purga_smoke.sql` (o) | ⚠ re-pin | ⬜ pending |
| B-01 | ⊖ O apply **ABORTA** se `authenticated` puder escrever em `purga_execucoes`/`_itens` | bloco inline | auto-verificação na própria migration | ❌ W0 | ⬜ pending |
| EF | Contrato de `purgar-retencao`: 403 sem Bearer; 403 quando o item não confere | unit (Deno) | `deno test supabase/functions/purgar-retencao/` | ❌ W0 | ⬜ pending |
| Tipos | `database.types.ts` regenerado e o repo compila | type-check | `npm run db:types && npm run lint` | ✓ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/p46_purga_smoke.sql` — cobre PURGA-01..07 + RETEN-05 + B-01
- [ ] Emenda em `supabase/tests/p42_invent05_cron_smoke.sql` (a): instantâneo `<> 3` → **invariante**
      (⚠ D-46-23 — no MESMO commit que cria o 4º job; hoje `cron.job` tem exatamente 3, medido em PROD)
- [ ] Re-pin de `supabase/tests/p43_previa_smoke.sql` (e): `ddfa6542921d241323c0124fc1bd1f99` → novo
- [ ] Re-pin de `supabase/tests/p45_motor_exclusao_smoke.sql` (C3): `8c86e0f040219e7eade47eb587dbf5de` → novo
      (⚠ D-46-18 obrigação 4 — os dois lados medidos, vivo × arquivo; **re-pin nunca afrouxa a asserção**)
- [ ] `supabase/functions/purgar-retencao/` + testes Deno
- [ ] **Linha de `exclude` em `vite.config.ts` ANTES de criar a pasta de testes da EF** (Pitfall 12 —
      senão `npm run test:run` fica vermelho por coletar testes Deno)
- [ ] Entrada `[functions.purgar-retencao]` em `supabase/config.toml`
- [ ] Script da fixture, com **teardown escrito antes da criação**

---

## A fixture — sem ela, 18 das 21 linhas passam por vacuidade

**Medido em PROD 2026-08-22:** `candidaturas_alem_da_janela()` devolve **0**. Candidatura mais
antiga: 2025-11-04 (~9,5 meses). Com a matriz em 24 meses (e `rejeitado` em 18), nada é elegível
antes de ~2027. `notificacoes_enviadas`: 11 linhas, a mais antiga de 2026-07-31.
**O conjunto elegível é vazio e continuará vazio.** Sem fixture, todo verde é vácuo.

**Forma RECUSADA:** retrodatar uma candidatura real — tornaria uma pessoa real purgável, e o erro é
irreversível (PITR desligado por D-45-10, Storage fora do backup).

**Forma adotada — titular sintético**, como a FASE 0 da Phase 45 montou o blob órfão de propósito:

1. `auth.users` — conta descartável, e-mail em namespace reservado (`fixture-p46+<uuid>@invalido.local`)
2. `public.candidatos` — CPF **derivado do UUID da fixture**, nunca `random()` sobre coluna `UNIQUE`
3. `public.vagas` — vaga **fechada/arquivada**; senão a exceção de vaga aberta (D-46-03) protege e a fixture rende zero
4. `public.candidaturas` — etapa **da allowlist** (D-46-19) e com `data_candidatura` **E `updated_at`** retrodatadas
   > ⚠⚠ **`updated_at` é o degrau (3) do `COALESCE` e nasce `now()`.** Sem retrodatá-lo explicitamente
   > a soma nunca fica menor que `now()` e a fixture **rende ZERO — autoderrotando-se.** É o modo de
   > falha mais provável da fase. **Medir** antes se há trigger de `updated_at` que sobrescreva o retrodate.
5. Variantes de âncora: uma com `historico_candidatura` (degrau 1), uma com `data_decisao_final` e sem
   histórico (degrau 2). Sem elas `ancora_origem` só é observada num valor e a coluna não prova nada
6. **Cenários negativos, cada um com fixture dedicada e cada um ALÉM DA JANELA** — em `retencao_hold`;
   de vaga `ativa`; com revisão Art. 20 aberta; em etapa fora da allowlist. Se a fixture negativa
   estiver *dentro* da janela, a asserção passa porque a data protegeu, não porque a exceção funcionou
7. **Cap:** reduzir o cap por RPC (ex.: para 1) com 2+ elegíveis prova a mesma propriedade e é ordens de
   magnitude mais barato que criar 51 titulares. O cap é config alterável sem deploy — usar isso

**Teardown — duas disciplinas para dois propósitos:**

- **No smoke:** subtransação encerrada por `RAISE EXCEPTION` própria (`P46B0`), revertida inteira pelo
  Postgres — inclusive DDL. Método já exercitado em PROD.
  > ⚠ **Nenhuma asserção pode ficar DEPOIS do rollback da própria fixture** — ela mediria um estado que
  > ela mesma destruiu e reprovaria em toda execução, com o motor certo.
- **Durante os 14 dias de dry-run:** a fixture tem de **sobreviver**, logo não é revertida. Teardown vira
  passo explícito e nomeado, e as linhas têm de ser greppáveis pelo namespace do e-mail.
  ⚠ Verificar contaminação de `v_triagem_panel`, da fila do RH e do snapshot de bias k=5 **antes** de deixá-la viva.
- ⚠⚠ **Em `modo='live'` a fixture é DESTRUÍDA — e isso é a prova.** Recriar antes de cada teste live;
  a conta do Auth é hard-deleted. Orçar esse custo no plano.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| O período de dry-run de 14 dias efetivamente decorreu, com ledger não-vazio | PURGA-03 | Passagem de tempo real; nenhum teste automatizado a comprime | Consultar `purga_execucoes` ao fim do período: `count(*) >= 14`, `min(iniciado_em) <= now() - 14 days`, e **≥ 1 execução com `elegiveis > 0`** |
| O flip `dry_run → live` foi um ato deliberado e evidenciado | PURGA-04 | É um checkpoint humano por definição | Linha em `logs_auditoria` com ator, instante e motivo, mais o registro do operador no SUMMARY |
| A matriz de retenção foi confirmada estado a estado | D-46-22 | Decisão de política, não de código | `listar_matriz_retencao()` sem linha `origem='seed'` nos 3 estados da allowlist |
| O kill switch foi provado desligando de verdade | PURGA-05 / SC#3 | O critério proíbe explicitamente prova por leitura de config | Execução real com `modo='off'` sobre conjunto não-vazio, com ⊖ registrada |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] Toda asserção respondeu "isto passaria se o conjunto fosse vazio?" **antes** de contar como prova
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
