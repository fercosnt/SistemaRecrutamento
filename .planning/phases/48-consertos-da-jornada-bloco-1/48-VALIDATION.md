---
phase: "48"
slug: "consertos-da-jornada-bloco-1"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-21"
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Fonte: `48-RESEARCH.md` §«Validation Architecture» (medições de 2026-09-21).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (front, happy-dom) · `deno test` (Edge Functions) · smokes SQL em `supabase/tests/*.sql` |
| **Config file** | `vite.config.ts` (`test`, `tests/setup.ts`) · `supabase/functions/deno.json` |
| **Quick run command** | `npx vitest run <pasta tocada>` · `deno test --allow-all supabase/functions/<ef>/` |
| **Full suite command** | `npm run test:run && deno test --allow-all supabase/functions/ && npm run lint` |
| **Estimated runtime** | ~180 seconds (suíte completa) |

⚠ Os testes deno chamam `handler(req, deps)` direto e **não** exercitam o wiring de `Deno.serve` — foi onde o Defeito 5 morou e é onde mora o `functions.invoke` do JORN-06. Comportamento que depende do wiring só se prova em PROD.
⚠ Rodar um smoke SQL (`node p46apply.cjs run supabase/tests/<arquivo>.sql`) **é escrita em PROD** (fixture + teardown/rollback).
⚠ `npm run lint` = contagem do `tsc`; reprova se passar de **90** (baseline congelada 96).

**Baseline medida em 2026-09-21:** vitest nas pastas tocadas 22 arquivos / 223 testes verdes; deno (5 EFs tocadas) 156 verdes; tsc 90.

---

## Sampling Rate

- **After every task commit:** vitest da pasta tocada + deno da EF tocada + `npm run lint` (≤ 90)
- **After every plan wave:** `npm run test:run` + `deno test --allow-all supabase/functions/`
- **Before `/gsd-verify-work`:** suítes verdes **e** as consultas de PROD da tabela abaixo com o resultado esperado (D-19: no banco, nunca só na tela)
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

Preenchido por requisito; os IDs de task são atribuídos pelos planos.

| Requirement | Test Type | Automated Command | Verificação em PROD — resultado esperado | Status |
|-------------|-----------|-------------------|------------------------------------------|--------|
| JORN-26 | vitest (helper TS) + smoke SQL (predicado canônico, enum lido de `pg_enum` na execução) | `npx vitest run <helper>` · smoke novo + `p45_motor_exclusao_smoke.sql` C6 refeito | exclusões pós-deploy não marcam candidatura encerrada → **0**; `v_fila_trabalho` sem `status in ('rejeitado','finalizado')` → **0** | ⬜ pending |
| JORN-22 | smoke SQL (RPC) + vitest (`explicacaoService`, página) | `npx vitest run src/features/explicacao` | conta de teste rejeitada na triagem: `feedback_rejeicao` não nulo, `data_decisao_final` nulo; RPC de explicação com JWT dela → caso «humana na triagem»; página renderiza explicação, não «indisponível» | ⬜ pending |
| JORN-18 | deno (`montarDedupeKey` com discriminador; handler) | `deno test --allow-all supabase/functions/notificar-candidato/` | 2 decisões na mesma candidatura → **2** linhas `decisao`, chaves distintas, ambas `entregue` | ⬜ pending |
| JORN-20 | coberto por JORN-18 + integração | idem | conta de teste **sem** `decisao` anterior, rejeitada na triagem: 1 linha `decisao` `entregue`; log da EF sem `skipped` | ⬜ pending |
| JORN-15 | deno (`email-templates.test.ts`: ausência de «a cada etapa», presença da frase nova) + teste do aviso de `liberar_cognitivo` | `deno test --allow-all supabase/functions/_shared/` | inscrição de teste: linha `confirmacao` `entregue`; liberação cognitiva de teste: linha de aviso `entregue` | ⬜ pending |
| JORN-U2 | deno: todo e-mail de candidato contém `https://rh.beautysmile.com.br/auth/login`; RH e recibo de exclusão **não** | idem | HTML de um envio real de teste contém o link | ⬜ pending |
| JORN-27 | deno (`executar-direito-titular` com `fetchImpl` mock: 1 POST por ação; falha não desfaz o pedido) | `deno test --allow-all supabase/functions/executar-direito-titular/` | pedido + cancelamento de teste: colunas de aviso preenchidas e `recibo_enviado_em` **nulo** | ⬜ pending |
| JORN-24 | deno (handler: `callAi` não chamado, nenhum upsert) | `deno test --allow-all supabase/functions/analise-candidato-individual/` | inscrição de teste com knockout: 0 linhas em `analise_candidato_vaga`, 0 em `ai_call_logs`; D-02: **3** análises marcadas | ⬜ pending |
| JORN-06 | deno (invoke recebe `Authorization`) — não cobre `Deno.serve` | `deno test --allow-all supabase/functions/submit-bigfive-final/ supabase/functions/gerar-devolutiva-bigfive/` | (1) log de diagnóstico do submit de prova com os campos que H1 prevê, lido no mesmo dia; (2) depois do conserto: 1 linha em `devolutivas_candidato` e edge log 200 | ⬜ pending |
| JORN-19 | smoke SQL (revertida → etapa/status/histórico/prazo; guarda do decisor revertido; redecisão arquiva e zera o ciclo) + deno (cópia com data) + vitest (página, diálogo) | `node p46apply.cjs run supabase/tests/<smoke de reabertura>.sql` | após `revertida` (RH2/RH3): `etapa_atual='decisao_final'`, prazo ≈ +10 dias, histórico `rejeitado→decisao_final` com justificativa própria, `revisao_respondida` nova `entregue`; decisor revertido recusado ao redecidir | ⬜ pending |
| JORN-D5 | vitest (Zod: online exige http(s), presencial aceita endereço, vazio recusado) + smoke SQL (trigger) | `npx vitest run src/features/agendamento` | INSERT `online` com `dddd` → erro; cancelar a linha legada `dddd` → aceito | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] smoke SQL do predicado canônico de «encerrada» (enum por `pg_enum` na execução — baseline, não constante)
- [ ] smoke SQL de reabertura (JORN-19) com fixture própria e teardown da candidatura/histórico
- [ ] refazer a fixture de `p45_motor_exclusao_smoke.sql` (C6 — hoje codifica o Defeito 26) e ajustar `p42_revisao_art20_smoke.sql` (h.2 — o veredito passa a mutar `candidaturas`)
- [ ] atualizar `p42_invent05_cron_smoke.sql` (a.iii, allowlist fechada de jobs) na mesma entrega do cron novo
- [ ] converter para baseline as fotografias que esta fase toca (`p43_guard_marketing_smoke.sql:738` contagem de classes; `p37_fidelidade_schema_smoke.sql` CHECK de evento) e provar que ainda mordem (D-17)
- [ ] testes deno: chave com discriminador; skip de knockout; aviso ao titular; invoke com `Authorization`; aviso da liberação cognitiva

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Submissão de prova do Big Five com instrumentação | JORN-06 | depende do wiring `Deno.serve` + `functions.invoke` real, e a retenção de log é ≈ 1 dia | operador conclui um Big Five com conta de teste em `avaliacao_assincrona`; ler o log de diagnóstico no mesmo dia |
| Texto dos e-mails na caixa real | JORN-15, JORN-U2, JORN-27, JORN-19 | legibilidade e se o link leva ao login | operador confere os e-mails do alias `+claude4`; o banco confirma `entregue` |
| Página de explicação da rejeição na triagem | JORN-22 | copy e alcançabilidade na tela | operador abre o cartão com a conta de teste rejeitada; banco confirma o estado |
| Reabertura respondida por RH2/RH3 | JORN-19 | exige duas contas RH distintas (revisor ≠ decisor) | seguir a Etapa 8 da JORNADA com o veredito `revertida` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
