---
phase: 48-consertos-da-jornada-bloco-1
plan: 03
subsystem: database
tags: [jorn-d5, agendamento, local_ou_link, trigger, zod, isSafeHttpUrl, smoke, prod]

requires:
  - phase: 33-seg-agendamento
    provides: "agendamentos_entrevista + trg_agendamento_normaliza_vaga + policy rh_gerencia_agendamento"
  - phase: 35-agendamento-candidato
    provides: "isSafeHttpUrl (WR-01) no AgendamentoCandidatoCard"
provides:
  - "public.validar_local_ou_link_agendamento() + trg_agendamento_valida_local_ins / _upd em PROD"
  - "src/lib/url/isSafeHttpUrl.ts — a mesma função na renderização (card) e na escrita (Zod)"
  - "agendamentoSchema com superRefine: presencial exige local, online exige link http(s)"
  - "supabase/tests/p48_local_ou_link_smoke.sql — 9/9 em PROD, zero resíduo"
  - "seg33 com gate final que reprova o SKIP silencioso"
affects: [48-06, pp-8-redesenho-agendamento]

actuals:
  tokens: 12570
  tasks: 3
  commits: 3
plan_head_before: eda1eb770801ebae47e691f7f2d87df90ab4ac87

tech-stack:
  added: []
  patterns:
    - "Validação de escrita por trigger BEFORE com UPDATE OF … WHEN (tupla IS DISTINCT FROM tupla) em vez de CHECK NOT VALID, para não travar linha legada"
    - "Ensaio do apply em envelope que aborta (migration + smoke + RAISE) antes do apply real; e prova de que o smoke morde sem a migration e contra o desenho rejeitado (CHECK NOT VALID)"

key-files:
  created:
    - supabase/migrations/20260921000003_p48_local_ou_link_valida.sql
    - supabase/tests/p48_local_ou_link_smoke.sql
    - src/lib/url/isSafeHttpUrl.ts
    - src/lib/url/__tests__/isSafeHttpUrl.test.ts
    - src/features/agendamento/schemas/__tests__/agendamentoSchema.test.ts
  modified:
    - supabase/tests/seg33_agendamento_smokes.sql
    - supabase/tests/funil34_kpis_smokes.sql
    - supabase/tests/p39_rewire_triggers_smoke.sql
    - src/features/agendamento/schemas/agendamentoSchema.ts
    - src/features/agendamento/components/AgendamentoCandidatoCard.tsx
    - src/features/agendamento/components/AgendamentoBlock.tsx
    - src/features/agendamento/components/__tests__/AgendamentoBlock.test.tsx
    - src/features/agendamento/services/__tests__/agendamentoService.test.ts

key-decisions:
  - "JORN-D5: trigger (não CHECK NOT VALID) — provado por execução que um CHECK NOT VALID faz o cancelar/compareceu/data_hora da linha legada dddd falhar com 23514"
  - "JORN-D5: seg33 e funil34 rodados em envelope que aborta (commitam fixture ligada a candidato real + convite), não com p46apply run puro"
  - "JORN-D5: AgendamentoBlock passou a exibir o erro de local_ou_link (aria-invalid + role=alert) — sem isso o Zod recusava em silêncio"

requirements-completed: [JORN-D5]

coverage:
  - id: D1
    description: "Banco recusa local_ou_link vazio (as duas modalidades) e link não-http(s) no online, aceita endereço no presencial, e a linha legada dddd segue cancelável/editável"
    requirement: JORN-D5
    verification:
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p48_local_ou_link_smoke.sql (9/9 em PROD)"
        status: pass
      - kind: integration
        ref: "envelope: smoke sem a migration → P48L FAIL (a); smoke com CHECK NOT VALID → P48L FAIL (g)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Formulário do RH recusa online sem link válido e presencial sem local, e mostra a mensagem no campo; isSafeHttpUrl único"
    requirement: JORN-D5
    verification:
      - kind: unit
        ref: "src/lib/url/__tests__/isSafeHttpUrl.test.ts (8)"
        status: pass
      - kind: unit
        ref: "src/features/agendamento/schemas/__tests__/agendamentoSchema.test.ts (7)"
        status: pass
      - kind: automated_ui
        ref: "src/features/agendamento/components/__tests__/AgendamentoBlock.test.tsx#online com link inválido (\"dddd\") → mensagem no campo e nenhuma mutação"
        status: pass
    human_judgment: false
  - id: D3
    description: "Front publicado: marcador servido em PROD no chunk lazy PerfilCandidatoRHPage"
    requirement: JORN-D5
    verification:
      - kind: other
        ref: "crawler de rh.beautysmile.com.br → PRESENTE em /assets/PerfilCandidatoRHPage-BpqkUIpc.js; git log origin/main..HEAD vazio"
        status: pass
    human_judgment: false
  - id: D4
    description: "seg33 reprova quando a fixture não monta (antes: SKIP silencioso saía verde)"
    verification:
      - kind: integration
        ref: "envelope seg33 → ready=y; envelope com fixture forçada a 'n' → SEG-33 FAIL: a fixture não montou"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-21
status: complete
---

# Phase 48 Plan 03: `local_ou_link` obrigatório e validado na escrita — Summary

**Trigger BEFORE em `agendamentos_entrevista` (não vazio nas duas modalidades, `^https?://host` só no online, UPDATE só quando link/tipo mudam) aplicado em PROD com md5 conferido, e a mesma regra no Zod do RH por um `isSafeHttpUrl` único — a linha legada `dddd` continua cancelável, sem UPDATE retroativo.**

## Performance

- **Duração:** ~9 min (relógio da sessão)
- **Início:** 2026-09-21T12:54:54Z
- **Fim:** 2026-09-21T13:03:52Z
- **Tasks:** 3 (2 com commit de código; a 3 é publicação, sem código)
- **Arquivos:** 13

## Medição antes (PROD, só leitura)

| id | tipo | status | `length(local_ou_link)` | URL? | conta |
|---|---|---|---|---|---|
| `4a14e0cd…` | presencial | reagendada | 57 | não (endereço) | `+claude1` |
| `ba6ab416…` | online | reagendada | 4 (`dddd`) | não | `+claude4` |

Triggers vivos antes: `trg_agendamento_normaliza_vaga` (BEFORE INSERT OR UPDATE), `trg_agendamento_reagendado_reset` (BEFORE UPDATE OF data_hora), `trg_notif_convite` (AFTER INSERT), `trg_notif_convite_reagendamento` (AFTER UPDATE OF data_hora, tipo, local_ou_link). Nenhuma função do banco escreve em `agendamentos_entrevista` (só `get_meu_agendamento` e `funil_kpis` a leem). A escrita vem só do front, pelo PostgREST.

## O que ficou em PROD

| Objeto | Prova |
|---|---|
| `validar_local_ou_link_agendamento()` (não é DEFINER, `REVOKE` de PUBLIC e anon) | ACL vivo `{postgres, authenticated, service_role}` |
| `trg_agendamento_valida_local_ins` BEFORE INSERT | `pg_trigger`, portão do próprio arquivo |
| `trg_agendamento_valida_local_upd` BEFORE UPDATE OF local_ou_link, tipo WHEN (tupla IS DISTINCT FROM) | idem; ordem alfabética depois de `normaliza_vaga` e `reagendado_reset` |

Ledger: `20260921000003` · `p48_local_ou_link_valida` · md5 `fe9c3b6769501ab5032183d089181e29` (7791 octetos). **O md5 do ledger bate com o do arquivo.**

Depois: 2 linhas (igual), legado `dddd/reagendada/updated_at 2026-09-20 00:56:17` **intocado**, zero resíduo `33010033-*`/`34010034-*`.

## Smokes

| Smoke | Resultado | Como rodou |
|---|---|---|
| `p48_local_ou_link_smoke.sql` | **9/9**: (a)–(i), zero resíduo | `p46apply run` (subtransação revertida) |
| ensaio pré-apply (migration + smoke + RAISE) | 9/9, função ausente depois | envelope que aborta |
| **morde (1):** smoke sem a migration | `P48L FAIL (a): INSERT online/dddd deu aceitou` | envelope |
| **morde (2):** migration + `CHECK … NOT VALID` | `P48L FAIL (g)`: data_hora, compareceu e cancelar da linha `dddd` → 23514 | envelope — a prova empírica de que o CHECK NOT VALID era o desenho errado |
| `seg33_agendamento_smokes.sql` | `ready=y` | envelope (ele commita fixture de candidato real + convite) |
| **morde (3):** seg33 com a fixture forçada a `n` | `SEG-33 FAIL: a fixture não montou — as asserções foram PULADAS` | envelope |
| `funil34_kpis_smokes.sql` | a..h = PASS | envelope |

## Varredura de portões (D-17)

O padrão do CLAUDE.md sobre `supabase/tests/*.sql` achou **252** linhas antes do plano. As que citam agendamento ou `tgname` são estas:
- `seg33…:123/135/177/189/202/222/225`: **escopo deliberado** (contagens sobre a fixture sintética `33010033-*`).
- `p39…:323`: **escopo deliberado** (1 linha da fixture).

Nenhum smoke conta os triggers de `agendamentos_entrevista`. Os dois triggers novos não reprovam nenhum portão. O que quebraria eram as **fixtures**: três smokes inseriam agendamento sem `local_ou_link`.

## Frente (Task 2, TDD)

- RED `559cb3e2`: 6 falhas pelo motivo certo (módulo ausente, schema aceitando, mensagem ausente na tela).
- GREEN `93014930`: 64/64 na pasta; suíte inteira 202 arquivos / 2003 testes; `tsc` = 90.

## Task Commits

1. **Task 1 (tracer): trigger no banco** — `0bf3de8d` (feat). Tracer verificado de ponta a ponta antes de expandir.
2. **Task 2: Zod + util compartilhado** — `559cb3e2` (test, RED) → `93014930` (feat, GREEN)
3. **Task 3: publicar** — sem commit de código. Push `eda1eb77..93014930`. O marcador `http:// ou https://` está servido em PROD em `/assets/PerfilCandidatoRHPage-BpqkUIpc.js`, o mesmo hash do build local. `git log origin/main..HEAD` saiu vazio.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] O gate final do seg33 não podia ficar literalmente no fim**
- **Found during:** Task 1
- **Issue:** a última linha do seg33 zera `smoke.ready`. Um bloco depois dela reprovaria sempre.
- **Fix:** o bloco foi para antes do reset e guarda o valor em `smoke.seg33_ready`. O SELECT final devolve `{smoke:'seg33', ready}`.
- **Commit:** `0bf3de8d`

**2. [Rule 3 - Blocking] Mais fixtures do seg33 precisavam de valor**
- **Found during:** Task 1
- **Issue:** o plano dizia «todo INSERT online». Mas a (i) insere um presencial sem local, e a (c) e a (h) esperam 42501 da RLS. Como o BEFORE trigger roda antes do WITH CHECK, ele recusaria antes com 23514, e a (c)/(h) deixariam de provar o 42501.
- **Fix:** link de fixture em (b), (c) e (h), e endereço de fixture na (i).
- **Commit:** `0bf3de8d`

**3. [Rule 3 - Blocking] `funil34` e `p39` também inseriam agendamento sem `local_ou_link`**
- **Found during:** Task 1 (varredura dos smokes que tocam a tabela)
- **Issue:** sem conserto, o `funil34`, que estava verde e o 48-01 usa como regressão, cairia no SKIP silencioso. A (i) do `p39` também reprovaria.
- **Fix:** o valor entrou nas duas fixtures, com comentário citando a migration. A fotografia `p39:189` **não foi tocada**, por instrução do operador.
- **Verification:** funil34 8/8 PASS em envelope.
- **Commit:** `0bf3de8d`

**4. [Rule 2 - Missing critical] O formulário não mostrava erro de `local_ou_link`**
- **Found during:** Task 2
- **Issue:** o `AgendamentoBlock` só mostrava erro de `data_hora`. Com o `superRefine` novo, o submit seria recusado sem dizer por quê, e o done da task («a tela diz o que falta») não se cumpriria.
- **Fix:** entraram `aria-invalid`, `aria-describedby` e `<p role="alert">` no campo, mais um teste de UI.
- **Commit:** `559cb3e2` / `93014930`

**5. [Rule 3 - Blocking] `agendamentoService.test.ts` validava o schema com online sem link**
- **Fix:** as fixtures passaram a levar um link válido. O caso «data passada» agora reprova só pela data.
- **Commit:** `93014930`

**6. [Processo - D-18] seg33 e funil34 rodados em envelope que aborta, não com `p46apply run` puro**
- **Motivo:** os dois commitam fixture ligada a um candidato real. O seg33 dispara `trg_notif_convite`. É a mesma forma que a nota 4 do orquestrador manda envelopar.
- **Evidência:** o resultado foi lido do texto do erro (`ready=y` / a..h PASS).

**7. [Processo] Commits em `main`**
- O protocolo genérico do executor trava commit no branch default. Este projeto trabalha em `main` por instrução do orquestrador (executor sequencial na árvore principal, push de `main` para a Vercel) e pelo histórico da fase (48-01). Os commits seguiram o fluxo normal, com hooks.

**Total deviations:** 5 auto-fixed (4 Rule 3, 1 Rule 2) e 2 notas de processo.
**Impact on plan:** todos os consertos são consequência direta do trigger novo ou do critério de done. Nada foi acrescentado fora do escopo.

## Issues Encountered

- A primeira versão do bloco final do seg33 saiu com `DO $` em vez de `DO $$`. Na substituição do `String.replace` do JS, `$$` vira `$`. O erro de sintaxe apareceu no envelope, antes de qualquer apply, e foi corrigido.
- O commit RED subiu o `tsc` para 91 (import de módulo ainda inexistente). O GREEN o devolveu a 90 no commit seguinte.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Não há superfície nova: o trigger só restringe uma escrita que já existia. T-48-03-01..04 estão mitigados como planejado.

## Next Phase Readiness

- JORN-D5 está fechado. O redesenho do agendamento (PP-8) segue fora, por D-05.
- Ficou registrado em `deferred-items.md`: o seg33 commita fixture de candidato real (converter para subtransação), e há uma divergência JS × SQL deliberada em `http:host`, em que o banco falha fechado.

## Self-Check: PASSED

- Arquivos criados existem: migration, smoke, util e os dois testes ✓
- Commits `0bf3de8d`, `559cb3e2` e `93014930` estão em `origin/main` ✓
- Ledger com md5 = arquivo; os 2 triggers em `pg_trigger`; legado `dddd` intocado ✓
- p48 9/9, seg33 `ready=y`, funil34 8/8 PASS; os três portões mordem ✓
- vitest 2003/2003; `tsc` 90; marcador em PROD ✓

---
*Phase: 48-consertos-da-jornada-bloco-1*
*Completed: 2026-09-21*
