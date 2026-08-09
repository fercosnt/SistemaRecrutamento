---
phase: 39
slug: rewire-dos-triggers-aposentadoria-do-n8n-sec-03
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-07-26
validated: 2026-08-09
source: auditoria documental retroativa (Phase 47 / Plan 47-05, CONSOL-01)
method: auditoria documental dos artefatos existentes — sem re-execução da fase
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `39-RESEARCH.md` § Validation Architecture. This phase's core behavior is DB-trigger
> dispatch (not app code) — proven by SQL smoke against a disposable Postgres (mirror of P37's
> `p37_fidelidade_schema_smoke.sql`), plus an execute-time PROD checkpoint (human/orchestrator, not
> subagent-automatable).
>
> ⚠ **Veredito acrescentado retroativamente em 2026-08-09** pela Phase 47 (CONSOL-01). O conteúdo
> original foi **preservado**; o veredito, o mapa medido, os gaps e os achados são o acréscimo.
>
> **A fase não foi re-executada** — nenhuma migration, nenhum apply, nenhum smoke contra banco.

---

## Veredito

**PARTIAL — `status: validated` + `nyquist_compliant: false`. É o veredito mais duro das seis.**

Esta é a fase de maior risco do M7 por desenho: ela dropa quatro triggers do orquestrador externo e
cria três triggers canônicos **na mesma janela**, para que não exista instante de envio duplicado.
O `39-VERIFICATION.md` diz, com todas as letras, o que aconteceu (`:33-36`):

> *"A fase foi aplicada em PROD (`39-04`, 2026-07-26) e marcada `executed` **sem que este relatório
> existisse**. Os 2 defeitos críticos abaixo são consequência direta desse gate pulado."*

Os dois defeitos: **um candidato aprovado recebeu a cópia de rejeição** (CR-01) e **a guarda que
impedia o candidato eliminado por knockout de receber a confirmação era código morto** (CR-02). Os
dois chegaram a produção. Os dois foram fechados em `f3b7304` e o fix foi deployado em 2026-07-28.

O que sustenta o veredito PARCIAL hoje não é a existência dos defeitos — eles estão fechados e com
guard de regressão em portão bloqueante. É que **o comportamento próprio desta fase continua sem
portão**: os quatro requirements DISPATCH descrevem o que os *triggers de banco* fazem, e nenhum
teste automatizado do repositório exercita um trigger. O `supabase/tests/p39_rewire_triggers_smoke.sql`
existe, tem 358 linhas, foi escrito em `39-03` — e **nada o executa**. Os testes que hoje protegem
CR-01 e CR-02 vivem na Edge Function, que é superfície da Phase 38.

Dito de forma acionável: se alguém alterar o `CASE` do trigger amanhã, a suíte inteira do repositório
continua verde.

---

## Per-Requirement Verification Map — estado em 2026-08-09

| Req ID | Comportamento | Comando / evidência citada por caminho | Roda em portão? | Cobertura |
|--------|---------------|-----------------------------------------|-----------------|-----------|
| DISPATCH-01 | O `CASE` dispara `avanco` só na etapa de avaliação assíncrona e `decisao` só em aprovado/rejeitado com decisão humana | `supabase/tests/p39_rewire_triggers_smoke.sql` (358 linhas, escrito em `39-03`) · evidência ao vivo tabulada em `39-VERIFICATION.md:39-52` | ❌ **não** — nenhum job de `.github/workflows/ci.yml` lê `supabase/tests/` | smoke versionado **sem runner** |
| DISPATCH-02 | Confirmação suprimida para knockout, enviada para o sobrevivente; convite carrega o agendamento | idem, mais os casos `CR-02` em `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts:470-527` | ⚠ **parcial** — o guard **na EF** roda no CI; o do trigger, não | automatizada só do lado da EF |
| DISPATCH-03 | Zero triggers e zero funções do orquestrador externo no catálogo; bloco removido da EF de submissão | consulta de catálogo registrada em `39-VERIFICATION.md:41` (0 restantes) · `grep` sobre `supabase/functions/submit-candidatura/index.ts` | ❌ não recorrente | verificação pontual |
| DISPATCH-04 | Corpo do disparo é só de identificadores, com Bearer no header e zero PII | `p39_rewire_triggers_smoke.sql` · `39-VERIFICATION.md:47` (corpo ids-only conferido ao vivo) | ❌ **não** | smoke versionado **sem runner** |
| DISPATCH-01 (gap closure) | Desfecho `aprovado` nunca renderiza a rejeição | `supabase/functions/_shared/__tests__/email-templates.test.ts:91-116` · `notificar-candidato.test.ts:530` — commit `f3b7304`, 2026-07-27 | ✅ sim — job `deno-test`, bloqueante | **automatizada** |
| DISPATCH-02 (gap closure) | Knockout devolve `skipped:knockout`, zero envio e zero claim, **antes** do claim no ledger | `notificar-candidato.test.ts:470-527` (linha 192 da EF, antes do claim na 250) | ✅ sim | **automatizada** |

Medido em 2026-08-09: o corpus Deno que carrega os dois guards de regressão fecha **424/424 verde
em 6 s**. Nenhuma asserção sobre trigger participa disso.

**Classificação:** 0 de 4 requirements com comando automatizado que exercite o comportamento próprio
da fase · 2 comportamentos derivados protegidos por regressão na EF · 2 requirements cobertos apenas
por smoke versionado sem runner.

---

## Gaps Nomeados

### G-39-01 — O smoke que é o portão desta fase nunca foi ligado a portão nenhum

- **Comportamento sem cobertura:** as sete invariantes que a própria seção Wave 0 deste arquivo
  enumera — exatamente um e-mail por evento, zero superfície de envio duplo, funil avança com a EF
  indisponível, zero PII no payload, guarda do knockout, mapeamento evento-para-fonte, e decisão
  apenas humana. São os quatro requirements DISPATCH.
- **Plano de origem:** `39-03-PLAN.md`, que criou `supabase/tests/p39_rewire_triggers_smoke.sql` no
  commit `ba3ac58` (2026-07-26) — **no mesmo dia** do apply em PROD do `39-04` (`2a4a3da`).
- **Razão registrada:** `39-VERIFICATION.md:36-37` — subagentes GSD não recebem os tools MCP do
  Supabase (bug upstream), então toda inspeção de PROD é feita na thread principal; o CI não
  provisiona Postgres.
- **Comando que fecharia o gap:** um job de CI que suba um Postgres de serviço, aplique
  `supabase/migrations/` e rode
  `psql -v ON_ERROR_STOP=1 -f supabase/tests/p39_rewire_triggers_smoke.sql`. É a mesma infraestrutura
  que fecharia o G-37-01 e o G-41-02 — **um único investimento fecha o gap estrutural de três das
  seis fases do M7**.

### G-39-02 — A fase foi aplicada em PROD sem verificação e sem revisão bloqueante, e essa é a causa registrada dos dois CRITICAL

- **Comportamento sem cobertura:** o próprio portão de fase. Não havia `39-VERIFICATION.md` nem
  revisão de código bloqueante quando a migration foi aplicada em produção.
- **Plano de origem:** `39-04-PLAN.md` (Wave 2, o apply).
- **Razão registrada:** `39-VERIFICATION.md:33-36`, verbatim: a fase foi marcada como executada sem
  que o relatório existisse, e *"os 2 defeitos críticos são consequência direta desse gate pulado"*.
  O relatório foi escrito retroativamente em 2026-07-28, dois dias após o apply.
- **Comando que fecharia o gap:** não é comando, é sequência — e o projeto já a codificou desde
  então. A Phase 45 tornou explícito o portão de "revisão de código bloqueante **antes** do apply
  destrutivo" citando **esta fase** como origem da regra
  (`.planning/phases/45-motor-de-exclus-o-anonimiza-o/45-VALIDATION.md:102`). O gap está fechado como
  processo e permanece aberto como registro histórico desta fase.

### G-39-03 — O encerramento da superfície externa depende de ação humana num painel de terceiros

- **Comportamento sem cobertura:** que os workflows do orquestrador externo estejam de fato
  desabilitados. O lado do banco está provado (zero triggers restantes); o lado de fora, não.
- **Plano de origem:** `39-04-PLAN.md` — o cleanup ficou como checkpoint humano pós-apply, declarado
  não-bloqueante do rewire.
- **Razão registrada:** consta na tabela `## Manual-Only Verifications` deste arquivo: ação humana em
  painel externo ao repositório.
- **Comando que fecharia o gap:** nenhum comando local o cobre. O equivalente automatizável é a
  ausência do endereço-base do webhook externo em qualquer configuração viva — uma sonda de
  texto-fonte no molde de `docs/compliance/__tests__/`, que reprovaria se o endereço reaparecesse.

---

## Achados da auditoria

1. **Nenhuma divergência entre os artefatos e o repositório vivo.** O
   `supabase/tests/p39_rewire_triggers_smoke.sql` existe com 358 linhas; o commit `f3b7304`
   (2026-07-27) alterou os quatro arquivos que declara — `_shared/email-templates.ts`,
   `_shared/__tests__/email-templates.test.ts`, `notificar-candidato/index.ts` e o teste da EF,
   com 231 inserções.
2. **Os dois CRITICAL têm guard de regressão versionado e em portão.** Conferido por leitura:
   `notificar-candidato.test.ts:449-540` documenta, em comentário, **por que** cada defeito escapou —
   o trigger de confirmação é AFTER INSERT e o knockout é aplicado por um UPDATE posterior, então a
   guarda no trigger lia o estado pré-knockout. Esse é o tipo de registro que transforma incidente em
   conhecimento.
3. **A cronologia é o achado central e está preservada:** smoke escrito e PROD aplicado no mesmo dia
   (2026-07-26); verificação escrita dois dias depois (2026-07-28); fix dos dois CRITICAL no dia
   anterior à verificação revisada (2026-07-27). A ordem correta seria a inversa, e a fase que veio
   depois (a 45) reescreveu a regra citando esta.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | SQL smoke (`supabase/tests/*.sql`, asserções via `RAISE`/GUC) · `deno test` p/ EFs · Vitest/Playwright (N/A esta fase) |
| **Config file** | none — smokes `.sql` rodados via `psql`/SQL Editor contra Postgres descartável |
| **Quick run command** | `psql <disposable> -f supabase/tests/p39_rewire_triggers_smoke.sql` (Wave 0 — criar) |
| **Full suite command** | `npm run test:run` (Vitest — não cobre triggers) + os `.sql` smokes manuais |
| **Estimated runtime** | ~30s (smoke SQL num DB descartável) |

---

## Sampling Rate

- **After every task commit:** `psql -f supabase/tests/p39_rewire_triggers_smoke.sql` (< 30s)
- **After every plan wave:** smoke completo + `npm run test:run` (não-regressão)
- **Before execute/PROD apply:** smoke verde num Postgres descartável (o apply é GATED — checkpoint do orquestrador, pós-P38-smoke)
- **Max feedback latency:** ~30s (smoke) · execute-time PROD checkpoint é UAT humano

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| DISPATCH-01 | CASE dispara `avanco` SÓ em `etapa_para='avaliacao_assincrona'`; `decisao` SÓ em `aprovado`/`rejeitado` AND `auto_rejeitado=false`; else skip | smoke (SQL) | asserção contra `net._http_response` após INSERT em `historico_candidatura` | ❌ W0 | ⬜ pending |
| DISPATCH-02 | Confirmação suprimida p/ knockout (`status='rejeitado'`/`opcao_knockout_id`); enviada p/ survivor; convite carrega `agendamento_id` | smoke (SQL) | INSERT candidaturas (knockout vs survivor) + INSERT agendamento; checar body/skip | ❌ W0 | ⬜ pending |
| DISPATCH-03 | 0 triggers `trg_n8n_*` + 0 funções `trg_n8n_*` no catálogo; bloco n8n ausente do `submit-candidatura` | catalog + grep | `SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_n8n_%'`=0; `pg_proc`=0; `grep -c n8n submit-candidatura/index.ts`=0 | ❌ W0 | ⬜ pending |
| DISPATCH-04 | Body do `net.http_post` = só ids; header Bearer presente; nenhum nome/email/cpf/telefone | grep migration + smoke | asserção sobre o `jsonb_build_object` do body; inspeção `net._http_response` request | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/p39_rewire_triggers_smoke.sql` — cobre DISPATCH-01..04 (predicados, survivor-guard, graceful-skip/fail-open, PII-free, catálogo pós-DROP) contra Postgres descartável; mirror de `p37_fidelidade_schema_smoke.sql`.
- [ ] Fixtures: candidatura knockout (`status='rejeitado'` + `opcao_knockout_id`) vs survivor; linha de histórico p/ cada `etapa_para`; agendamento. Impersonação de RH real (GUC `request.jwt.claims`) p/ provar `auto_rejeitado=false` (decisão só humana).

*As 7 invariantes a provar (RESEARCH § "O que provar"): (1) exatamente 1 e-mail/evento sem duplicata; (2) zero superfície de double-send remanescente; (3) funil avança com EF/secret indisponível (graceful-skip + fail-open); (4) zero PII no payload; (5) survivor-guard do knockout; (6) mapeamento evento→fonte correto; (7) decisão só humana (`auto_rejeitado=false`).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Apply da migration em PROD + reconcile do ledger | DISPATCH-01..04 | Subagentes não têm Supabase MCP; apply toca PROD | Checkpoint do orquestrador: `apply_migration` → reconcile → inspeção `pg_trigger`/`pg_proc` |
| 1 ciclo end-to-end (trigger→EF→Resend) via `*@resend.dev` | DISPATCH-01/04 | Requer EF viva (P38) + secret (UAT-36-2); modo teste | Após P38 smoke: disparar cada evento real, checar `notificacoes_enviadas` + `net._http_response` |
| Cleanup do n8n cloud (desabilitar workflows / deletar `n8n_webhook_base`) | DISPATCH-03 | Ação humana no painel n8n externo | HUMAN checkpoint pós-apply (não bloqueia o rewire; encerra a superfície externa) |

---

## Validation Sign-Off

- [ ] All tasks have automated smoke verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`p39_rewire_triggers_smoke.sql`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (smoke) — **indeterminada**: o smoke existe e nada o executa (G-39-01)
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 smoke authored) — **NÃO**. O smoke
      foi escrito; o portão nunca existiu. As três razões estão nomeadas em `## Gaps Nomeados`

**Approval:** veredito **PARCIAL** emitido em 2026-08-09 por **auditoria documental** dos artefatos
existentes, **sem re-execução** da fase. Fecha o CONSOL-01 para a Phase 39 registrando, por escrito,
que a fase de maior risco do M7 foi aplicada em produção sem portão — e que o comportamento próprio
dos seus triggers continua sem cobertura automatizada.
