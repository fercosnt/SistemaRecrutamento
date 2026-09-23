# Phase 49: Consertos da Jornada — Bloco 2 - Pattern Map

**Mapped:** 2026-09-22
**Files analyzed:** 62 (novos + modificados: migrations, smokes, EFs, `_shared`, front, compliance, tipos)
**Analogs found:** 58 / 62
**Escopo da busca:** `supabase/migrations/` (as 17 da Phase 48 + a origem viva de cada objeto redefinido), `supabase/functions/{_shared,comparativo-candidatos,avaliar-redacao,avaliar-redacao-cultural,avaliar-transcricao-entrevista,gerar-guia-entrevista,analise-candidato-individual,notificar-candidato}`, `supabase/tests/`, `src/components/`, `src/features/{triagem,decisao,entrevista,vagas,avaliacao,avaliacao-cognitiva,hub-candidato,admin,privacidade}`, `src/lib/`, `docs/compliance/`, raiz (`p46apply.cjs`, `efdeploy.cjs`)
**Regra de trilha:** todo analog abaixo foi conferido com `git ls-files` (rastreado). Nenhum espelho gitignored.

> **Leitura obrigatória para o planejador.**
> 1. Todo número de linha foi conferido no disco em 2026-09-22. Onde o RESEARCH cita «L11-13»
>    etc., isso é linha **do corpo da função** (`pg_get_functiondef`), não do arquivo. Este mapa
>    dá as duas quando divergem.
> 2. **A migration mais recente que define um objeto nem sempre é a que o CONTEXT/prompt cita.**
>    Três casos nesta fase: `registrar_decisao` vivo = `20260921000012` (não `…09000012`);
>    `responder_revisao_decisao` e `snapshot_decisao_final` vivos = `20260921000011`;
>    `anonimizar_candidato` vivo = `20260823000006` (o `20260805000009` só mexe em GRANT).
>    Mesmo assim: todo plano que redefine função lê `pg_get_functiondef` antes (§Shared A).
> 3. **Três portões pinam md5 de corpo** que esta fase reescreve — ver §Shared C. Reescrever sem
>    re-pinar reprova o smoke; re-pinar sem crescer a rede estrutural é o Pitfall 2 do 46-04.

---

## File Classification

### Migrations (todas novas; nome indicativo `2026092200000N_p49_*.sql`; aplicar com `node p46apply.cjs migrate <arquivo>`)

| Arquivo novo (plano RESEARCH) | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `…_p49_llm_provider_none.sql` (49-01, JORN-39) — `ALTER TYPE public.llm_provider ADD VALUE IF NOT EXISTS 'none'` | migration (enum) | — | `20260706010519_bigfive_devolutiva_enum.sql` (arquivo inteiro, 9 linhas) | exact |
| `…_p49_colunas_proveniencia_e_analise.sql` (49-01, D-28/D-38..D-41/D-26) — `provedor_ia`/`modelo_ia` em 5 tabelas, `redacoes_candidato.rubrica_versao`, `entrevista_analises.{tipo, solicitada_por, texto_hash, ai_call_log_id, superada_em}` — todas NULL | migration (ADD COLUMN + CHECK + COMMENT) | CRUD | `20260921000004_p48_analise_descartada_knockout.sql` (bloco DDL) | exact |
| `…_p49_trilha.sql` (49-03, JORN-25/D-35 + JORN-17 + JORN-37 + JORN-34 + vigente do JORN-12) — `avancar_etapa`, `registrar_decisao`, `responder_revisao_decisao`, `guard_rejeicao_auditada` | migration (CREATE OR REPLACE de trigger fn + RPCs DEFINER, com pré/pós-portão md5) | event-driven (trigger) + request-response | `20260921000012_p48_registrar_decisao_reabertura.sql` (pré-portão :73-90, pós-portão :265-294) · corpo base `20260712110001_avancar_etapa_auto_rejeitado_fix.sql:60-139` | exact |
| `…_p49_snapshot_so_com_mudanca.sql` (49-04, JORN-3b/D-44) — `DROP/CREATE TRIGGER trg_decisao_final_snapshot … WHEN (to_jsonb…)` + `stamp_explicacao_acessada` idempotente | migration (trigger WHEN + RPC) | event-driven | `20260921000003_p48_local_ou_link_valida.sql:101-142` (DROP/CREATE TRIGGER com WHEN + portão de catálogo) · `solicitar_revisao_decisao` (`20260625100001`, UPDATE `… IS NULL` + re-SELECT) | exact |
| `…_p49_comparativo_max_tokens.sql` (49-06, D-59) — `prompt_versions.max_tokens` 3000 → 3600 | migration (UPDATE com guarda de valor esperado) | batch | `20260906000003_interview_prompts_max_tokens.sql` (arquivo inteiro) | exact |
| `…_p49_analise_entrevista_vigente.sql` (49-08, D-39..D-42) — RPC nova de inserção/superação + redefinição de `salvar_avaliacao_entrevista` e `confirmar_revisao_entrevista` | migration (RPC DEFINER, transação única) | CRUD | `20260906000002_avaliacao_entrevista_grava_score.sql:21-125` · `20260625000001_phase14_gap_closure.sql:208-270` | role-match (a RPC de superação não tem precedente) |
| `…_p49_retro_justificativa_e_trilha.sql` (49-10, D-46 = 9 · D-47 = 5) e `…_p49_retro_marca_analises.sql` (49-10, D-43 = 6) | migration (UPDATE retroativo com escopo autorizado) | batch | `20260921000014_p48_retro_feedback_rejeicao_triagem.sql` (DO block inteiro) · `20260921000004:…` (DO com `v_autorizados uuid[]`) · ensaio `supabase/tests/p48_retroativos_ensaio.sql` | exact |
| `…_p49_motor_apaga_o_que_o_recibo_promete.sql` (49-14, JORN-36/D-48/D-60..D-63) — `anonimizar_candidato` + `plano_exclusao_titular` | migration (função DESTRUTIVA viva) | batch (transação única) | `20260823000006_p46_guard_purga.sql` (proveniência do corpo, :56-110; passos :724-763; retorno `'passos'` :912-930) · `20260823000008_p46_guard_plano.sql:540-630` | exact |

### Smokes e prova (SQL)

| Arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/tests/p49_trilha_smoke.sql` (novo) | test (SQL) | batch | `p48_reabertura_smoke.sql` (envelope P48R1, baseline de atores vivos :74-127, gate :731-755) | exact |
| `supabase/tests/p49_snapshot_smoke.sql` (novo) | test (SQL) | batch | `p48_reabertura_smoke.sql` + portão de catálogo de `20260921000003:119-142` | exact |
| `supabase/tests/p49_analise_vigente_smoke.sql` (novo) | test (SQL) | batch | `p48_reabertura_smoke.sql` (fixture sintética `@invalido.local`) | exact |
| `supabase/tests/p49_prova_prod.sql` (novo) | test (consulta só leitura) | request-response | `p48_prova_prod.sql` (arquivo inteiro, 241 linhas) | exact |
| `supabase/tests/p48_reabertura_smoke.sql` (mod — fixture F4 :224-227) | test | — | ele mesmo | exact |
| `supabase/tests/p48_rejeicao_triagem_smoke.sql` (mod — :239/:245 passam a ler `historico_candidatura.criterio_texto`) | test | — | ele mesmo | exact |
| `supabase/tests/p45_motor_exclusao_smoke.sql` (mod — pins :234-235/:1714-1715, contador 25, fixtura `ai_call_logs` :952-958, asserções novas) | test | — | ele mesmo, bloco (C3) :1660-1760 | exact |
| `supabase/tests/oper31_rejeitar_candidatura_smokes.sql` (re-rodar (c) :160-185; sem edição esperada) | test | — | — | n/a |

### Edge Functions e `_shared`

| Arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/functions/_shared/ai-client.ts` (mod — dono único, 49-02) | service (cliente de IA) | request-response | ele mesmo — loop `:626-706`, fallback `:731-806`, replay `:376-415` | exact |
| `supabase/functions/_shared/audit-logger.ts` (mod — devolve `{id, error}`) | utility (audit) | CRUD | ele mesmo `logAiCall :128-186` + `emitPromptStubAlert :209-235` (o molde de «nunca lança, registra em `recruiter_alerts`») | exact |
| `supabase/functions/_shared/__tests__/ai-client.test.ts` (mod — asserções :289-298, 306-338, 437-453, 460-479, 482-510, 646 mudam de propósito) | test (Deno) | — | ele mesmo | exact |
| `supabase/functions/_shared/bars-redacao.ts` (novo, sem imports — JORN-07) | config (constante versionada) | transform | `avaliar-transcricao-entrevista/_local/bars-rubric.ts` (builder de bloco) + contrato ZERO IMPORTS de `_shared/email-config.ts:12-17` | exact |
| `supabase/functions/_shared/sjt-rubrica.ts` (novo, sem imports — JORN-35) | config | transform | idem | exact |
| `supabase/functions/_shared/comparativo-config.ts` (novo, sem imports — `COMPARATIVO_MAX_CANDIDATOS = 4`) | config | — | `_shared/email-config.ts` (constantes `as const`, zero imports) | exact |
| `supabase/functions/_shared/essay-schemas.ts` (mod — só o comentário falso :19-21) | schema | — | — | n/a |
| `supabase/functions/_shared/analise-schemas.ts` (mod — `ranked_candidates.max(10)` :156 → constante) | schema | — | — | n/a |
| `supabase/functions/_shared/entrevista-schemas.ts` (mod — `tipo` opcional no `.strict()` :60-65) | schema | validation | ele mesmo | exact |
| `supabase/functions/comparativo-candidatos/index.ts` + `__tests__/index.test.ts` (mod — IDOR, encerrada, teto, proveniência, `posicoes`) | controller (EF) | request-response | ele mesmo `:160-310`; posse `:180-194` | exact |
| `supabase/functions/avaliar-redacao-cultural/index.ts` + `index.test.ts` (mod) | controller (EF) | request-response | ele mesmo `:244-376` | exact |
| `supabase/functions/avaliar-redacao/index.ts` + `__tests__/index.test.ts` (mod — SJT por chave, D-68) | controller (EF) | request-response | ele mesmo `:112-140`, `:219-262` | exact |
| `supabase/functions/avaliar-transcricao-entrevista/index.ts` (+ testes) (mod — tipo, hash, vínculo, vigente, erro checado) | controller (EF) | request-response | ele mesmo `:190-330`; erro checado = `analise-candidato-individual/index.ts:565-585` | exact |
| `supabase/functions/gerar-guia-entrevista/index.ts` (mod — proveniência no upsert `:362-370`) | controller (EF) | request-response | ele mesmo (já destrutura `upsertErr`) | exact |
| `supabase/functions/analise-candidato-individual/index.ts` (mod — proveniência no upsert `:565-585`) | controller (EF) | request-response | ele mesmo | exact |
| `supabase/functions/notificar-candidato/index.ts` + `__tests__/notificar-candidato.test.ts` (mod — `avanco` para encerrada) | controller (EF) | event-driven | survivor-guard `index.ts:283-298` + teste CR-02 `:539-556` | exact |

### Front-end

| Arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/features/vagas/services/candidaturasService.ts` (mod — JORN-13/38; 3 selects) | service | CRUD | `src/features/avaliacao/services/scoresRhService.ts:120-150` (`SCORES_ALLOWLIST`) | exact |
| `src/features/vagas/types/vagasTypes.ts` (mod — `calculateBigFiveAverage` :696, `getCultureScore` :722 deixam de devolver 0) | utility | transform | — (remover/trocar por helpers que devolvem estado tipado) | role-match |
| `src/components/pages/CandidatosRHPage.tsx` (mod — `:351-355`) | component | — | ele mesmo | exact |
| `src/components/ScoreCard.tsx` + `__tests__/ScoreCard.test.tsx` (mod) | component | — | ele mesmo; faixa neutra de `ScorecardAvaliacao.tsx:231-275` | exact |
| `src/lib/cognitivo/cognitivoBanda.ts` (novo — extrair de `ScoreCard.tsx:23-27`, D-64) + teste | utility | transform | `src/lib/candidatura/candidaturaEncerrada.ts` + seu teste de tabela-verdade | exact |
| `src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx` (mod — `:94-110`, JORN-40) + teste novo | component | — | `ScorecardAvaliacao.tsx:246-275` (banda sem dígito) | exact |
| `src/components/KanbanBoard.tsx` + teste (mod — `getTerminalBadge :97-116`) | component | — | `HubCandidatoRH.tsx:146-155` (`encerrada = candidaturaEncerrada(...)`) | exact |
| `src/components/modals/UpdateStatusModal.tsx` + teste (mod — `VALID_TRANSITIONS :59-65`, D-67) | component | — | ele mesmo | exact |
| `src/lib/candidatura/proximaEtapa.ts` (novo, D-36) + teste | utility | transform | `candidaturaEncerrada.ts`; regra hoje inline em `HubCandidatoRH.tsx:76,138-139` e `KanbanBoard.tsx:58,179-180` | exact |
| `src/features/triagem/components/TriagemTable.tsx` + teste (mod — seleção `:213-275`, `COMPARE_MAX :50`) | component | — | gating de checkbox que já existe (`checkboxDisabled` + Tooltip `:248-272`) | exact |
| `src/components/pages/ComparativoCandidatosPage.tsx` (mod — `resolveCandidates :63-80`, `handleAvancar :118-126`, `:102`) | component (page) | request-response | ele mesmo | exact |
| `src/features/triagem/components/ComparativoScreen.tsx` + teste (mod — selo de fallback) | component | — | `SugestaoIABadge.tsx` | role-match |
| `src/features/triagem/pdf/exportComparativo.ts` (mod — `:62-78`, selo no PDF, D-27b) | utility (PDF) | transform | ele mesmo, título `:68` | exact |
| `src/features/decisao/components/DecisaoFinalPage.tsx` (mod — `resolveFinalistCandidates :66-80`, `:123,201`) | component (page) | — | `ComparativoCandidatosPage.tsx` | exact |
| `src/features/decisao/services/decisaoService.ts` (mod — `listFinalistas :206-240`, D-36b) | service | CRUD | ele mesmo | exact |
| `src/features/triagem/components/RedacaoReviewPanel.tsx` (mod — `DIM_LABEL :47-52`, `AnaliseIA :60-110`) + teste novo | component | — | ele mesmo | exact |
| `src/features/triagem/components/RedacaoOverrideForm.tsx` + `__tests__/RedacaoOverrideForm.test.tsx` (mod — `DIMENSOES :45-50`; teste `:33-37` muda de propósito) | component | — | ele mesmo | exact |
| `src/features/entrevista/components/EntrevistaWorkspace.tsx` + `TranscricaoReviewPanel.tsx` (mod — seletor de tipo, vigente/superadas, selo) | component | — | `GuiaEntrevistaPanel.tsx:544-575` (os dois CTAs online/presencial) | exact |
| `src/features/entrevista/services/entrevistaService.ts` (mod — `getAnalise :457-488` pela vigente; `analisarTranscricao :663-690` manda `tipo`) | service | CRUD | ele mesmo | exact |
| `src/features/admin/ai-logs/components/AiLogsPage.tsx` (mod — badge `:236-240`, D-27c) + teste novo | component | — | ele mesmo | exact |
| componente de selo de proveniência (novo, p. ex. `src/features/triagem/components/ProvenienciaIABadge.tsx`) | component | — | `src/features/triagem/components/SugestaoIABadge.tsx` (arquivo inteiro) | exact |

### Compliance, tipos, varredura

| Arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `docs/compliance/catalogo-vivo-44.json` (`meta.acrescimos[]` novo item fase 49) | config | — | item `fase: 48, plano: "48-17"` do próprio `meta.acrescimos` | exact |
| `docs/compliance/export-scope-rules.yaml` (vereditos; `meta.versao` 1.2.0 → 1.3.0; `ponteiros.de_terceiro`) | config | — | `analise_candidato_vaga.descartada_em :515-520`; `redacoes_candidato.model_version :571-573` | exact |
| `docs/compliance/pii-inventory.yaml` (+ regen `.md`) | config | — | blocos `entrevista_analises :285-292`, `redacoes_candidato :294-303`, `ai_call_logs :325-335`, R2 `:58-66`, `tabelas_sem_pii_titular :492-512` | exact |
| `docs/compliance/sql/gen-recibo-exclusao.cjs` (origens + mapa de razões) → `recibo-exclusao.json` + `_shared/reciboExclusao.ts` | config (gerador) | transform | itens `:293-317`, `:344-356`, `:528-550`; mapa `:620-661` | exact |
| `docs/compliance/export-allowlist.json`, `supabase/functions/_shared/exportAllowlist.ts`, `docs/compliance/sql/05-export-allowlist-drift.sql` (2 VALUES), `docs/compliance/__tests__/exportAllowlist.test.ts` (snapshots :133, :170, :644) | gerados + teste | — | procedimento de `48-17-PLAN.md` Tasks 1-3 | exact |
| `database.types.ts` (regen) | config gerado | — | comando de `48-17-PLAN.md` Task 3 (com `< /dev/null`) | n/a |
| artefato de varredura por plano (D-50), p. ex. `49-VARREDURA-<classe>.md` | doc | — | `49-VARREDURA-KICKOFF.md` (C1..C9) e `48-VARREDURA-*.md` | exact |

---

## Pattern Assignments

### 1. Cabeçalho, transporte e ACL de TODA migration desta fase

**Analog:** `supabase/migrations/20260921000003_p48_local_ou_link_valida.sql:1-62` (cabeçalho) e `:88-89` (ACL de função de trigger)

Estrutura do cabeçalho (copiar a forma, não o texto): `====` + `<versão> — <objeto> : <o que muda>` + plano/decisões → «O QUE ESTAVA ERRADO (medido em PROD, data, só leitura)» → «POR QUE X, E NÃO Y» → ordem de triggers se houver → «ERRO:» (SQLSTATE) → «AUTHZ:» → «IDEMPOTÊNCIA:» → nota de transporte. A nota de transporte atual (`:57-61`):

```sql
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL
-- `$$` com REVOKE/COMMENT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000003_p48_local_ou_link_valida.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
```

⚠ **NÃO copiar** a nota de `20260712110001:55-57` («APPLIED via Supabase MCP apply_migration… version-row reconcile») — é da via MCP, obsoleta (CLAUDE.md §«Via de apply ATUAL», item 2). O arquivo `20260712110001` é a base do **corpo** de `avancar_etapa`, não do cabeçalho.

**ACL:**
- função de trigger (`avancar_etapa`, `guard_rejeicao_auditada`, `snapshot_decisao_final`): `REVOKE ALL … FROM PUBLIC; REVOKE ALL … FROM anon;` (`20260921000003:88-89`). `avancar_etapa` hoje só tem `FROM PUBLIC` (`20260712110001:139`) — acrescentar `anon`.
- RPC chamada pelo RH: `REVOKE ALL … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated, service_role;` (`20260921000011` logo após `responder_revisao_decisao`).
- RPC chamada só pela EF (a de superação do §7): `REVOKE … FROM PUBLIC, anon, authenticated; GRANT … TO service_role` (precedente `retirar_candidatura`, 48-PATTERNS §1).
- `pg_default_acl` concede EXECUTE a `anon` como grant direto: `REVOKE … FROM PUBLIC` sozinho não basta (`20260805000009:150-153`).

**Guard de papel fail-closed** — o `IF v_role NOT IN (...)` é fail-OPEN com `v_role` nulo. Hoje ainda aparece em `salvar_avaliacao_entrevista` (`20260906000002:53-55`) e `confirmar_revisao_entrevista` (`20260625000001:239-241`). Toda redefinição desta fase troca por:

```sql
IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;
```
(idioma instalado em `registrar_decisao`, cobrado pelo pós-portão `20260921000012:273-275`; o SQLSTATE que o cliente mapeia nessas duas RPCs é `insufficient_privilege` — manter o mesmo para não quebrar o `entrevistaService`.)

---

### 2. `…_p49_llm_provider_none.sql` (JORN-39)

**Analog:** `20260706010519_bigfive_devolutiva_enum.sql` (inteiro):

```sql
-- ... ADD VALUE is non-transactional and must not run in the same txn
-- that inserts a row using the value (hence the separate seed migration). Idempotent
-- via IF NOT EXISTS.
ALTER TYPE public.llm_call_type ADD VALUE IF NOT EXISTS 'bigfive_devolutiva';
```

Trocar por `ALTER TYPE public.llm_provider ADD VALUE IF NOT EXISTS 'none';`. Arquivo **próprio**, sem nenhum statement que use o valor na mesma transação (o `p46apply` roda o arquivo inteiro numa transação — RESEARCH Standard Stack, PG 17). Portão de pós-condição, se quiser, só pode ler `pg_enum` (não inserir). Consumidores do enum no front (`aiLogsService.ts:17`, `aiCostsService.ts:15`) resolvem-se pelo `db:types`.

---

### 3. `…_p49_colunas_proveniencia_e_analise.sql` (D-28, D-26, D-38..D-41)

**Analog:** `20260921000004_p48_analise_descartada_knockout.sql` (bloco DDL, depois do cabeçalho):

```sql
ALTER TABLE public.analise_candidato_vaga
  ADD COLUMN descartada_em timestamptz,
  ADD COLUMN descartada_motivo text;

ALTER TABLE public.analise_candidato_vaga
  ADD CONSTRAINT analise_candidato_vaga_descartada_motivo_check
    CHECK (descartada_motivo IS NULL OR descartada_motivo IN ('knockout_automatico'));

COMMENT ON COLUMN public.analise_candidato_vaga.descartada_em IS
  'Phase 48 / JORN-24 / D-02: quando esta analise foi MARCADA ... A LINHA NAO E APAGADA ...';
```

Aplicar:
- `provedor_ia text` + `modelo_ia text` em `analise_candidato_vaga`, `comparativo_solicitado`, `entrevista_guias`, `entrevista_analises`, `redacoes_candidato`. Todas **NULL** (NULL = «desconhecida», D-30 — as linhas antigas ficam assim). CHECK opcional de vocabulário em `provedor_ia` (`IS NULL OR IN ('anthropic','openai')`); **não** usar o enum `llm_provider` (ganha `'none'`, que não é provedor de resultado).
- `redacoes_candidato.rubrica_versao text` (NULL nas 2 antigas = «sem âncoras enviadas», D-26).
- `entrevista_analises`: `tipo text CHECK (tipo IS NULL OR tipo IN ('online','presencial'))`, `solicitada_por uuid`, `texto_hash text`, `ai_call_log_id uuid` (**sem FK** — o log é purgado em 180 d; precedente `candidate_ai_decisions.ai_call_log_ids uuid[]`), `superada_em timestamptz`.
- Um `COMMENT ON COLUMN` por coluna, no estilo do analog (fase/ID/decisão, o que NULL significa, por que não é outra coisa).
- ⚠ Nada de `NOT NULL` nesta onda (Pitfall 3 do RESEARCH: quebra a EF velha entre migration e deploy — D-55).
- ⚠ Nome `solicitada_por`: a regra R2 do inventário casa por **nome literal** (`pii-inventory.yaml:60` lista `solicitado_por`, masculino) e o gerador exige que todo nome da R2 esteja em `ponteiros.de_terceiro` do `export-scope-rules.yaml` (`:380-395`). Ou se usa um nome já coberto, ou o §17 acrescenta `solicitada_por` aos **dois** lugares — senão o UUID de funcionário pode sair na cópia do titular.

---

### 4. `…_p49_trilha.sql` — `avancar_etapa` (D-35 + JORN-17 + vigente) · `registrar_decisao` (GUC + D-47) · `responder_revisao_decisao` (GUC) · `guard_rejeicao_auditada` (JORN-34)

**4a. Pré-portão md5 das funções vivas** — molde `20260921000012_p48_registrar_decisao_reabertura.sql:73-90`:

```sql
DO $verifica_registrar_decisao_pre$
DECLARE
  v_md5      text;
  v_len      int;
  v_esperado constant text := '3007d45f02f28ac0aeefbfc1eeeb847b';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure;

  IF v_md5 IS DISTINCT FROM v_esperado THEN
    RAISE EXCEPTION 'P48-11 PRE-PORTAO: o corpo VIVO de registrar_decisao tem md5 % (length %), e o medido e % ...', v_md5, v_len, v_esperado;
  END IF;
END
$verifica_registrar_decisao_pre$;
```
Um bloco (ou um bloco com N `IF`, como `20260921000011:72-92` para duas funções) pinando o md5 **medido na véspera do apply** das quatro funções. O `3007d45f…` acima é o de ANTES da 48-11 — o vivo hoje é o que o NOTICE de `20260921000012:292` imprimiu (registrado no `48-11-SUMMARY`); medir de novo.

**4b. `avancar_etapa()` — corpo base = `20260712110001:60-121`** (linhas do arquivo; RESEARCH usa linhas do corpo):

| Trecho | Arquivo | Corpo | Mudança |
|---|---|---|---|
| early-return etapa igual | `:71-73` | L11-13 | trava D-35 entra **logo depois** |
| portão de regressão | `:76-84` | L15-21 | intacto |
| bandeira de entrevista | `:91-104` | L24-37 | o `EXISTS` passa a olhar só a vigente (§7) |
| INSERT no histórico | `:110-117` | L40-47 | intacto |
| `RETURN NEW` | `:119` | L49 | antes dele: `NEW.etapa_justificativa := NULL;` (JORN-17) |

Trava (RESEARCH §H.1, idioma do GUC de `:115`):

```sql
IF public.candidatura_encerrada(OLD.etapa_atual, OLD.status)
   AND coalesce(current_setting('app.transicao_sancionada', true), '') NOT IN ('reabertura', 'decisao') THEN
  RAISE EXCEPTION 'candidatura encerrada (etapa %, status %) — não pode mudar de etapa', OLD.etapa_atual, OLD.status
    USING ERRCODE = 'check_violation';
END IF;
```
Bandeira só da vigente (troca do `EXISTS` de `:94-99`):

```sql
    SELECT EXISTS (
      SELECT 1 FROM public.entrevista_analises ea
       WHERE ea.candidatura_id = NEW.id
         AND ea.superada_em IS NULL
         AND ea.status_analise IS DISTINCT FROM 'falhou'
         AND ea.competencias IS NOT NULL
         AND ea.bloqueio_avanco = true
         AND ea.revisao_confirmada_em IS NULL
    ) INTO v_blocked;
```
(o predicado «vigente» tem de ser **o mesmo texto** no §7 — escrever uma vez e copiar, ou uma função SQL `IMMUTABLE`/`STABLE` pequena, como `candidatura_encerrada`.)

O `COMMENT ON FUNCTION` (`:123-134`) é reescrito inteiro com os três acréscimos.

**4c. `registrar_decisao` — corpo vivo = `20260921000012:96-236`.** As duas escritas da trilha (arquivo `:216-221` e `:226-231`; corpo L122/L132):

```sql
  IF p_decisao = 'aprovado' THEN
    UPDATE public.candidaturas
       SET etapa_atual = 'aprovado',
           status = 'finalizado',
           data_decisao_final = now(),
           etapa_justificativa = p_justificativa          -- ← D-47: constante sem PII
     WHERE id = p_candidatura_id;
  ELSIF p_decisao = 'rejeitado' THEN
    PERFORM set_config('app.rejeicao_sancionada', 'on', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'rejeitado',
           ...
           etapa_justificativa = p_justificativa          -- ← D-47: idem
     WHERE id = p_candidatura_id;
  END IF;
```
- `etapa_justificativa` → constante (RESEARCH §J.3: `'Decisão final registrada (a justificativa fica em decisao_final)'`); precedente de texto próprio na trilha = `responder_revisao_decisao` (`20260921000011:308-310`, `format('Candidatura reaberta após revisão (Art. 20) — …')`).
- `PERFORM set_config('app.transicao_sancionada', 'decisao', true);` antes de **cada** UPDATE e `set_config(…, '', true)` logo depois (Correção 31 — `is_local` vale até o fim da **transação**; num smoke rodado por `p46apply run` vaza).
- O pós-portão `20260921000012:265-294` é o molde do pós-portão novo: **manter todas** as asserções que ele tem (`coalesce(v_role`, `(D-23)`, `df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN`, `app.rejeicao_sancionada`, `data_decisao_final = now()`, `status = 'finalizado'`, `v_vaga_owner IS DISTINCT FROM`, `ON CONFLICT (candidatura_id)`, ausência de `IF v_role NOT IN`) e **acrescentar** `app.transicao_sancionada` presente e `etapa_justificativa = p_justificativa` **ausente**. Terminar com o `RAISE NOTICE … md5(prosrc) novo = %` (`:290-292`).

**4d. `responder_revisao_decisao` — corpo vivo = `20260921000011:200-330`.** Envolver só o UPDATE de reabertura (`:305-312`):

```sql
    PERFORM set_config('app.transicao_sancionada', 'reabertura', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'decisao_final',
           status = 'em_analise',
           etapa_justificativa = format(
             'Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até %s.',
             to_char(v_data_limite, 'DD/MM/YYYY')),
           data_decisao_final = NULL
     WHERE id = p_candidatura_id;
    PERFORM set_config('app.transicao_sancionada', '', true);

    GET DIAGNOSTICS v_n = ROW_COUNT;   -- ⚠ o GET DIAGNOSTICS tem de vir ANTES do reset, ou lê o PERFORM
```
⚠ Ordem: hoje `GET DIAGNOSTICS v_n = ROW_COUNT` vem imediatamente depois do UPDATE (`:314`). Um `PERFORM` entre eles zera o ROW_COUNT — pôr o reset **depois** do `GET DIAGNOSTICS`.

**4e. `guard_rejeicao_auditada` — corpo vivo = `20260709000010:53-73`** (única definição no repo; conferir com `pg_get_functiondef`):

```sql
  IF NEW.status = 'rejeitado' AND OLD.status IS DISTINCT FROM 'rejeitado' THEN
    IF current_setting('app.rejeicao_sancionada', true) IS DISTINCT FROM 'on'
       AND NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN
      RAISE EXCEPTION 'Rejeição sem trilha de auditoria não é permitida (RNF-07a / LGPD-02)'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
```
Ramo novo, **irmão** do existente e no mesmo estilo (RESEARCH §H.5): sair de encerrada por status ⇒ recusa, escopado a `auth.uid() IS NOT NULL` e sem GUC sancionada. O escopo por `auth.uid()` é o que preserva o idioma de fixture de 8 smokes (INSERT `status='rejeitado'` + UPDATE `status='em_analise'` como `postgres` — ex.: `p48_rejeicao_triagem_smoke.sql:157-160`, `p48_reabertura_smoke.sql:188-189`). **Conferir smoke a smoke** que nenhum deles tem `request.jwt.claims` preenchido na linha do UPDATE (A4 do RESEARCH) — `p48_reabertura` seta e zera claims em volta das RPCs (`:199-213`).

Ordem BEFORE em `candidaturas` (alfabética): `candidaturas_avancar_etapa_trg` → `trg_candidaturas_guard_rejeicao` → `update_candidaturas_updated_at` (`20260709000010` comentário de bind). A trava D-35 em `avancar_etapa` roda primeiro.

---

### 5. `…_p49_snapshot_so_com_mudanca.sql` (JORN-3b / D-44)

**Trigger com WHEN + portão de catálogo** — molde `20260921000003_p48_local_ou_link_valida.sql:110-142`:

```sql
DROP TRIGGER IF EXISTS trg_agendamento_valida_local_upd ON public.agendamentos_entrevista;
CREATE TRIGGER trg_agendamento_valida_local_upd
  BEFORE UPDATE OF local_ou_link, tipo ON public.agendamentos_entrevista
  FOR EACH ROW
  WHEN ((OLD.local_ou_link, OLD.tipo) IS DISTINCT FROM (NEW.local_ou_link, NEW.tipo))
  EXECUTE FUNCTION public.validar_local_ou_link_agendamento();
...
  SELECT pg_get_triggerdef(oid) INTO v_def FROM pg_trigger
   WHERE tgrelid = 'public.agendamentos_entrevista'::regclass AND tgname = 'trg_agendamento_valida_local_upd';
  IF position('IS DISTINCT FROM' IN v_def) = 0 ... THEN
    RAISE EXCEPTION 'JORN-D5: ... instalado SEM o WHEN por tupla ...';
  END IF;
```
Aplicar (RESEARCH §J.2): `AFTER UPDATE ON public.decisao_final FOR EACH ROW WHEN ((to_jsonb(OLD) - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em') IS DISTINCT FROM (to_jsonb(NEW) - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em'))`. O bind original é por `EXECUTE` dentro de `DO … IF NOT EXISTS` (`20260709000011:106-118`) — aqui é `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` direto. A função `snapshot_decisao_final()` (`20260921000011:167-185`) **não muda** nesta migration (lista explícita de colunas, 14 no INSERT). Pós-portão: `position('to_jsonb(OLD)' IN pg_get_triggerdef(...)) > 0` e `tgenabled = 'O'`.

⚠ Pitfall 5 do RESEARCH: excluir **só** as duas colunas do D-44. O tombstone do motor muda `justificativa` e tem de continuar arquivando (a ordem snapshot → raspagem de `20260823000006:724-746` depende disso).

**`stamp_explicacao_acessada` idempotente** — vivo = `20260625100001:238-270` (única definição no repo):

```sql
  UPDATE public.decisao_final
     SET explicacao_solicitada_em = COALESCE(explicacao_solicitada_em, now())
   WHERE candidatura_id = p_candidatura_id
  RETURNING * INTO v_row;
  RETURN v_row;
```
→ molde `solicitar_revisao_decisao` do mesmo arquivo (UPDATE com `AND … IS NULL`, depois re-SELECT):

```sql
  UPDATE public.decisao_final
     SET revisao_solicitada_em = now()
   WHERE candidatura_id = p_candidatura_id
     AND revisao_solicitada_em IS NULL;

  SELECT * INTO v_row
    FROM public.decisao_final
   WHERE candidatura_id = p_candidatura_id;

  RETURN v_row;
```
(Correção 30: com o filtro, `RETURNING * INTO` sai vazio na 2ª chamada.) Guard own-row e ACL (`REVOKE … FROM PUBLIC; GRANT … TO authenticated`) ficam — acrescentar `anon` ao REVOKE.

---

### 6. `…_p49_comparativo_max_tokens.sql` (D-59)

**Analog:** `20260906000003_interview_prompts_max_tokens.sql` inteiro — guarda de valor esperado + pós-condição:

```sql
DO $mig$
DECLARE
  v_guia int;
BEGIN
  SELECT max_tokens INTO v_guia FROM public.prompt_versions
   WHERE call_type = 'interview_guide' AND is_active;
  IF v_guia IS DISTINCT FROM 3000 THEN
    RAISE EXCEPTION 'interview_guide ativo com max_tokens=% (esperava 3000) — esta migration nao e a que voce pensa', v_guia;
  END IF;
  UPDATE public.prompt_versions SET max_tokens = 8000
   WHERE call_type = 'interview_guide' AND is_active;
  IF NOT EXISTS (SELECT 1 FROM public.prompt_versions WHERE call_type='interview_guide' AND is_active AND max_tokens = 8000) THEN
    RAISE EXCEPTION 'pos-condicao: ...';
  END IF;
END
$mig$;
```
Trocar para `comparative_ranking`, 3000 → 3600. `prevent_published_prompt_edit` não protege `max_tokens` (Correção 6) — nenhuma versão nova de prompt. O cabeçalho cita a conta do D-59 (45 tok/s × 80 s).

---

### 7. `…_p49_analise_entrevista_vigente.sql` (JORN-12 / D-39..D-42)

**`salvar_avaliacao_entrevista` — vivo = `20260906000002:21-111`.** O ponto que muda é a escolha da análise (`:38-45`):

```sql
  SELECT ea.id, v.created_by
    INTO v_analise_id, v_vaga_owner
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.candidatura_id = p_candidatura_id
   ORDER BY ea.created_at DESC      -- ← vira: só a VIGENTE (mesmo predicado do §4b)
   LIMIT 1;
```
O resto (média BARS `:65-76`, UPDATE `:78-84`, upsert em `scores_candidato` `:88-102` com `ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)`, D-65: uma linha só) fica. Preservar o portão de auto-verificação `:120-125` (`position('ON CONFLICT (…)' IN …)`).

**`confirmar_revisao_entrevista(p_analise_id)` — vivo = `20260625000001:208-262`.** Acrescentar ao SELECT `:221-229` a exigência de vigente (recusa `no_data_found`/`check_violation` com mensagem própria para «análise superada»).

**RPC nova de gravação** (chamada pela EF por `service_role`, RESEARCH §I.3 passo 6): uma transação que (1) marca `superada_em = now()` nas vigentes do mesmo `(candidatura_id, tipo)`, (2) insere a nova, (3) faz o upsert de `scores_candidato` `status='pendente_humano'` (D-42). Forma do corpo: a de `salvar_avaliacao_entrevista` (SECURITY DEFINER, `SET search_path TO ''`, `RETURNS jsonb` com readback `{ok, analise_id, …}` `:104-109`). Sem precedente de «superar a anterior» no repo — o UPDATE de marca segue o D-02 da 48 (`20260921000004`: marcar, não apagar). O `tipo` NULL das 6 antigas é um grupo próprio (Correção 10 / Open Q).

---

### 8. Retroativos com checkpoint (49-10: D-46 = 9, D-47 = 5, D-43 = 6)

**Analog:** `20260921000014_p48_retro_feedback_rejeicao_triagem.sql` (cabeçalho + DO inteiro). O esqueleto a copiar:

```sql
DO $$
DECLARE
  v_autorizados uuid[] := ARRAY['bf26ee3c-0ae3-4e92-a99b-6e05efc2a662']::uuid[];
  v_conjunto uuid[];
  v_fila0 bigint; v_fila1 bigint;
  v_hist0 bigint; v_hist1 bigint;
  v_notif0 bigint; v_notif1 bigint;
  v_tocadas int;
BEGIN
  SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[]) INTO v_conjunto
    FROM public.candidaturas WHERE <predicado do ensaio>;
  IF v_conjunto IS DISTINCT FROM v_autorizados THEN
    RAISE EXCEPTION '... escopo divergente, nada foi escrito', v_conjunto, v_autorizados;
  END IF;
  SELECT count(*) INTO v_fila0 FROM net.http_request_queue;  -- + historico, notificacoes
  UPDATE ... WHERE id = ANY (v_autorizados) AND <mesmo predicado>;
  GET DIAGNOSTICS v_tocadas = ROW_COUNT;
  IF v_tocadas <> cardinality(v_autorizados) THEN RAISE EXCEPTION '...'; END IF;
  SELECT count(*) INTO v_fila1 FROM net.http_request_queue;
  IF v_fila1 IS DISTINCT FROM v_fila0 OR ... THEN RAISE EXCEPTION '... efeito colateral ...'; END IF;
  RAISE NOTICE '...: % linha(s): %', v_tocadas, v_autorizados;
END
$$;
```
- O id literal é **escopo deliberado** (a autorização do operador), não fotografia (comentário `:28-31`) — mantém-se fora da varredura de portões como está.
- Antes: ensaio só leitura com a MESMA consulta (`supabase/tests/p48_retroativos_ensaio.sql`, com o «controle que prova que a medida da fila morde», `:32`).
- D-46 limpa `candidaturas.etapa_justificativa` — o UPDATE **não** muda `etapa_atual`, então `avancar_etapa` sai no early-return e não grava histórico (a guarda `v_hist1 = v_hist0` prova). 2 das 9 são do titular já anonimizado (Correção 35): registrar no checkpoint.
- D-47 edita `historico_candidatura.criterio_texto` (5 linhas, casar corrente **e** arquivo — Correção 11). É o único UPDATE retroativo desta fase sobre trilha de auditoria: checkpoint com aprovação no momento (D-54).
- D-43 marca `superada_em` (+ hash/vínculo onde reconstruível, RESEARCH §I.4). Precedente de UPDATE retroativo de marca: `20260921000004` (DO com `v_autorizados` e `v_total_antes/depois`).

---

### 9. `…_p49_motor_apaga_o_que_o_recibo_promete.sql` (JORN-36 / D-48, D-60..D-63)

**Analog:** `20260823000006_p46_guard_purga.sql` — a migration anterior sobre a MESMA função destrutiva viva. Copiar:
- o escopo negativo no topo (`:6-18`) e a seção «(2) PROVENIÊNCIA» (`:56-110`): o corpo é copiado **do arquivo** entre os delimitadores nomeados (`$anonimizar_candidato$`), conferido por md5 contra o vivo **antes** de editar; nunca do catálogo;
- a função inteira `CREATE OR REPLACE FUNCTION public.anonimizar_candidato(` (`:201-930`) com o passo novo.

Onde o passo novo encosta (linhas do arquivo `20260823000006`):

```sql
  -- ══ passo_motor: tombstone_decisao_final ══   (:724-746)
  UPDATE public.decisao_final d
     SET justificativa = '[justificativa preservada de forma desidentificada ...]'
         -- + revisao_resultado = '<sentinela>'     (D-60, MESMO UPDATE)
   WHERE d.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);
  GET DIAGNOSTICS v_n_df = ROW_COUNT;
  -- ⚠⚠ ESTE É O ÚLTIMO STATEMENT A TOCAR O PAR, E A ORDEM É O MECANISMO. (...)
  UPDATE public.decisao_final_historico h
     SET justificativa = '[justificativa arquivada, ...]'
         -- + revisao_resultado = '<sentinela>'     (D-60, MESMO UPDATE, DEPOIS do de cima)
   WHERE h.candidatura_id IN (...);

  -- ══ passo_motor: severar_fks_set_null (ERASE-09) ══   (:748-763)
  UPDATE public.ai_call_logs l
     SET candidato_id     = NULL,
         parsed_reasoning = NULL,
         raw_response     = '{"redigido":"anonimizacao_p45"}'::jsonb
         -- + user_prompt_template = '<sentinela>'  (D-61; ANTES de candidato_id := NULL é o que acha a linha)
   WHERE l.candidato_id = p_candidato_id;
```
- Passo novo (sentinela em `text`/`jsonb` NOT NULL; NULL onde a coluna aceita; **DELETE** só em `respostas_raven`/`respostas_bigfive`/`respostas_disc`/`respostas_formulario` — D-62; `cited_evidence` removido de `redacoes_candidato.analise_ia` e da `metadata` SJT; linhas `comparative_ranking` inteiras — D-63) entra **antes** de `severar_fks_set_null` (`:748`), escopado por `candidatura_id IN (SELECT id FROM candidaturas WHERE candidato_id = p_candidato_id)`, com um `GET DIAGNOSTICS v_n_<x>` por statement, no idioma do bloco.
- Sentinela/NULL por coluna decidido lendo `attnotnull` **ao vivo**, como faz o passo `candidate_ai_decisions` (`:765-778`), ou conferido no bloco de auto-verificação (Pitfall 6 do RESEARCH — abortar depois do Storage é o modo de falha caro).
- `trg_redacao_rh_only_review_fields` recusa mudar `texto`/`analise_ia` com JWT `rh`/`administrador` (Correção 18) — o passo não pode depender do papel do chamador.
- Retorno: `'passos'` (`:912-930`) ganha a chave do passo novo e as contagens novas em `tombstone_decisao_final`.
- `plano_exclusao_titular` (vivo `20260823000008:224-760`) conta o mesmo, no mesmo `jsonb_build_object` por passo (`:556-569` tombstone; `:615-630` severar). Dry-run e delete real saem da mesma expressão (regra (ii) do C3 do smoke).
- Nada de bloco que execute o caminho feliz dentro da migration (proibição explícita do 46-04, `:86-94`): a prova é do smoke (§11).

---

### 10. `p49_trilha_smoke.sql`, `p49_snapshot_smoke.sql`, `p49_analise_vigente_smoke.sql` (novos)

**Analog:** `supabase/tests/p48_reabertura_smoke.sql`

- **Cabeçalho** `:1-66`: O QUE ELE VIGIA (migration por migration), PARTE 1/PARTE 2 com letras, NEGATIVA (resíduo zero), «A FIXTURE NÃO É UMA CANDIDATURA REAL», «ESTE SMOKE ESCREVE», contagens globais como cinto, COMO RODAR, GATE VERDE = `pass = esperado` fixo (escopo deliberado).
- **Preâmbulo** `:68-71`:
  ```sql
  RESET ROLE;
  SELECT set_config('request.jwt.claims', '', false);
  SELECT set_config('smoke48r.pass', '0', false);
  SELECT set_config('smoke48r.fixtures', '', false);
  ```
- **Baseline** `:77-127`: atores RH/admin ATIVOS lidos na execução (`usuarios_rh … ORDER BY created_at, user_id LIMIT 1`), vaga viva, contagens globais em `set_config(..., false)`.
- **Fixture** `:180-190`: titular `@invalido.local`; `INSERT … status='rejeitado'` (desarma `trg_notif_confirmacao`) + `UPDATE … status='em_analise'`.
- **Subtransação que reverte** `:320-330`: `RAISE EXCEPTION 'reverter' USING ERRCODE = 'P48R1'; EXCEPTION WHEN SQLSTATE 'P48R1' THEN NULL;` — valores medidos em variáveis PL/pgSQL, julgamento FORA da subtransação, contador incrementado fora.
- **Impersonação** `:199-213`: `set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'app_metadata', json_build_object('role','administrador'))::text, false)` e zerar depois.
- **Gate** `:731-755`: `IF current_setting('smoke48r.pass')::int <> N THEN RAISE …` + `SELECT json_build_object('smoke', …, 'pass', …, 'esperado', N, …) AS resultado`.

Casos mínimos (RESEARCH Wave 0 + CONTEXT §specifics): trilha — knockout `inscricao/rejeitado` → UPDATE de etapa **recusado** (`check_violation`); reabertura passa (GUC); `registrar_decisao` sobre `triagem/finalizado` passa; histórico sem o texto da decisão; `etapa_justificativa` nula depois de consumida; regressão sem texto novo recusada (a mesma forma de `oper31 (c)` `:160-185`, agora provando que a limpeza não desarmou o portão); a GUC **não vaza** para o UPDATE seguinte. Snapshot — N chamadas de `stamp_explicacao_acessada` → 0 linhas novas no arquivo; UPDATE no-op → 0; decisão/ciclo/tombstone → 1; teste de colunas lidas do catálogo `colunas(decisao_final) − {id, em} + {decidido_em} = colunas(decisao_final_historico) − {id, arquivado_em}`. Vigente — A, B, A → 2 linhas, vigente = B, falha nunca vigente, revisão anterior preservada na superada.

⚠ Smokes que despacham (`net.http_post`) rodam em **envelope que aborta** (48-01/48-03 SUMMARY: migration + smoke + `RAISE` no fim, na mesma requisição do `p46apply run`), não com `run` puro.

---

### 11. `p45_motor_exclusao_smoke.sql` (mod — plano do motor)

**O que obrigatoriamente muda** (não é opcional: sem isso o smoke reprova o conserto certo):
- **Pins md5** — cabeçalho `:234-235` e bloco (C3) `:1714-1715`:
  ```sql
  v_pin_plano text := '42f916d81cd274b28044a410ae57a237';
  v_pin_anon  text := '5209239f191aa15b1725b726b00eb4cd';
  ```
  Re-pinar as DUAS (o motor e o plano mudam), com a PROVENIÊNCIA do re-pin escrita no cabeçalho (`:222-360` explica o protocolo: conferência cruzada vivo × arquivo, e «a rede embaixo do md5 só cresce» — `:1680-1688`).
- **Rede estrutural (C3/iii-iv)** — acrescentar asserções de forma sobre o passo novo (`pg_get_functiondef` contém o passo, as tabelas, a ordem snapshot → raspagem com `revisao_resultado`), para que o re-pin não vire carimbo.
- **Contador** — o esperado 25 do RESUMO (cabeçalho `:25-33`; soma em `:2503`) sobe pelo número exato de asserções novas; o cabeçalho registra o bump como o 48-01 fez («Subiu de 24 para 25 no plano 48-01…»).
- **Fixture de `ai_call_logs`** (`:952-958`, citado no RESEARCH) ganha `user_prompt_template` e uma linha `comparative_ranking` com `candidato_id` NULL citando `id=<candidatura_id>`.
- **Uma asserção de pós-estado por coluna nova do passo** + prova de que morde (mutação: passo desligado na mesma requisição ⇒ FAIL), no formato do 48-01 SUMMARY «O portão morde (medido nesta sessão)».

---

### 12. `p48_reabertura_smoke.sql` e `p48_rejeicao_triagem_smoke.sql` (mod)

- **`p48_reabertura_smoke.sql:224-227`** — fixture F4 hoje é UPDATE cru de encerrada:
  ```sql
    UPDATE public.candidaturas
       SET etapa_atual = 'decisao_final', status = 'em_analise',
           etapa_justificativa = 'Fixture do smoke P48R (c): candidatura fora de rejeitado/rejeitado.'
     WHERE id = v_f4;
  ```
  A trava D-35 recusa. Envolver com `PERFORM set_config('app.transicao_sancionada', 'reabertura', true)` / reset, e acrescentar uma asserção de que **sem** a GUC o mesmo UPDATE é recusado (o smoke continua mordendo). Bump do esperado 12 (`:737`, `:750`).
- **`p48_rejeicao_triagem_smoke.sql:239` e `:245`** — hoje leem `candidaturas.etapa_justificativa` depois de `rejeitar_candidatura`:
  ```sql
  IF a_fb IS NOT DISTINCT FROM a_just THEN ...            -- :239 vira comparação vazia
  IF position(c_token IN coalesce(a_just, '')) = 0 THEN   -- :245 reprova com JORN-17
  ```
  `a_just` passa a vir de `historico_candidatura.criterio_texto` da transição `→ rejeitado` da fixture (o texto sobrevive lá, byte a byte). Mudar de propósito no mesmo plano do conserto (Pitfall 7).

---

### 13. `p49_prova_prod.sql`

**Analog:** `supabase/tests/p48_prova_prod.sql` inteiro. Cabeçalho `:1-24` (SÓ LEITURA por construção; quem roda prefixa `SET TRANSACTION READ ONLY; SELECT set_config('p49.t0', '$T0', false);`; um booleano por prova; conjunto vazio sai `false`; provas negativas podem já sair `true` no baseline). CTEs base `:25-40`:

```sql
WITH
t AS (SELECT current_setting('p48.t0')::timestamptz AS t0),
teste AS (SELECT c.id FROM public.candidatos c WHERE c.email ILIKE '%+claude%'),
cand AS (SELECT cd.* FROM public.candidaturas cd WHERE cd.candidato_id IN (SELECT id FROM teste)),
notif AS (SELECT n.* FROM public.notificacoes_enviadas n, t
           WHERE n.candidatura_id IN (SELECT id FROM cand) AND n.criado_em > t.t0),
```
Colunas-alvo: lista do RESEARCH §«`p49_prova_prod.sql` (forma)» (`p28_*`, `p39_*`, `p07_*`, `p25_*`, `p12_*`, `p17_*`, `p3b_*`, `p37_*`, `p36_*`). T0 gravado num `49-PROVA-PROD.md` (`grep -m1 "^T0: "`, idioma `:8`).

---

### 14. `supabase/functions/_shared/ai-client.ts` + `audit-logger.ts` (JORN-28 / JORN-39 — dono único, 49-02)

**Pontos de edição, no arquivo atual:**

| O quê | Onde | Hoje |
|---|---|---|
| `OPENAI_FALLBACK_MODEL` | `:61` | hardcoded; P1 fora — não mexer |
| `RETRYABLE_STATUS`, `isRetryable` | `:63`, `:288-302` | parse/schema não é retryable (correto) |
| `ResolvedPrompt` / `resolvedPromptFromLoaded` | `:119-153` | sem `user_template` |
| `CallAiResult` | `:266-275` | `{provider, parsed, cost_usd, latency_ms, cache_hit, prompt_version, error_code?, flagged_for_human_review?}` — ganha `model`, `log_id`, `replayed`, `fallback_cause` |
| `tryIdempotencyReplay` | `:376-415` | seleciona `provider, cost_usd, latency_ms, success, raw_response, error_code`; replaya fallback |
| linhas `provider: "none"` | `:545`, `:583` | 22P02 engolido |
| `messages.parse` | `:629-649` | `output_config: { format: zodOutputFormat(schema, prompt.call_type) }` |
| sucesso | `:651-686` | `cache_hit: cachedTokens > 0` (Correção 8) |
| catch | `:687-696` | `breaker.recordFailure()` para qualquer erro |
| `runOpenAIFallback` | `:731-806` | sem `max_completion_tokens`/`temperature` (`:742-749`); 1 linha; `error_code` genérico `:734-736` |

Núcleo a copiar/editar — formato embrulhado (RESEARCH §Code Examples, verificado contra SDK 0.102.0):

```typescript
const FALHA_PARSE = Symbol.for("callAi.falhaParse");
const fmt = zodOutputFormat(schema, prompt.call_type) as { parse?: (c: string) => unknown };
const fmtSeguro = fmt && typeof fmt.parse === "function"
  ? { ...fmt, parse: (c: string) => { try { return fmt.parse!(c); } catch (e) { return { [FALHA_PARSE]: e }; } } }
  : fmt;
// … output_config: { format: fmtSeguro } …
const falha = (response.parsed_output as Record<symbol, unknown> | null)?.[FALHA_PARSE];
const causa = response.stop_reason === "max_tokens" ? "anthropic_max_tokens"
  : response.stop_reason === "refusal" ? "anthropic_refusal"
  : falha ? "anthropic_schema_invalid" : null;
```
⚠ Nos testes, o `zodOutputFormat` é o no-op `(s)=>s` quando omitido (comentário das EFs, p. ex. `comparativo-candidatos/index.ts:275-281`) — o embrulho tem de tolerar `fmt` sem `.parse` (a guarda `typeof fmt.parse === "function"` acima).

**Linha de log:** o objeto passado a `logAiCall` no sucesso (`:658-678`) é o molde das duas linhas do fallback. A tentativa Anthropic falha vai com `idempotency_key: null` (Pitfall 1: o upsert por chave de `audit-logger.ts:171-178` a sobrescreveria). `model_snapshot: response.model` já é gravado (`:668`, `:783`) — é a fonte do «modelo real» (D-28).

**`audit-logger.ts:171-185`** — hoje:
```ts
  const { error } = insertRow.idempotency_key != null
    ? await logsTable.upsert(insertRow, { onConflict: "idempotency_key" })
    : await logsTable.insert(insertRow);
  if (error) {
    const summary = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "insert_failed";
    console.error(`[audit-logger] ai_call_logs INSERT falhou (call_type=${row.call_type}): ${summary}`);
  }
```
→ `.select("id").single()` para devolver o `id` (D-38 precisa dele), assinatura `Promise<{ id: string | null; error: string | null }>`; o chamador de linha `none` registra falha em `recruiter_alerts` no molde de `emitPromptStubAlert` (`:209-235`: `try { insert } catch`, **nunca lança**, loga só código). `computeInputHash` (`:112-118`) é o hash do D-38 (§17 «Don't hand-roll» do RESEARCH).

**Testes** — `supabase/functions/_shared/__tests__/ai-client.test.ts`. Idioma (`:289-299`):
```ts
Deno.test("IA-04 — when the breaker is OPEN, callAi routes to OpenAI gpt-4o-mini", async () => {
  const { callAi } = await loadClient();
  const openai = makeMockOpenAI();
  const openBreaker = { canRequest: () => false, recordSuccess() {}, recordFailure() {} };
  const result = await callAi({ prompt: SONNET_PROMPT, ...baseArgs }, {
    anthropic: makeMockAnthropic(), openai, supabase: makeMockSupabase(), breaker: openBreaker,
  });
  assertEquals(result.provider, "openai");
  assertEquals(result.error_code, "anthropic_circuit_open");
  assertEquals((openai.calls[0] as { model: string }).model, "gpt-4o-mini");
});
```
Asserções que mudam de propósito: `:289-298, 306-338, 437-453, 460-479, 482-510, 646` (D-56). `structured-output-compat.test.ts` segue verde (nenhum schema novo).

---

### 15. `_shared/bars-redacao.ts`, `_shared/sjt-rubrica.ts`, `_shared/comparativo-config.ts` (novos, sem imports)

**Analog de builder:** `supabase/functions/avaliar-transcricao-entrevista/_local/bars-rubric.ts` (79 linhas). Copiar: docblock com o defeito que motivou e a data; função **pura e defensiva** que devolve `string`; aviso explícito ao modelo quando falta insumo (`SEM_GUIA_AVISO` `:31-35`); âncoras em ordem 5 → 1 (`:69-76`):

```ts
  for (const [competency, anchors] of byCompetency) {
    lines.push(`- Competência: "${competency}"`);
    const sorted = anchors
      .filter((a): a is AnchorLike => !!a && typeof a === "object")
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
    for (const a of sorted) {
      ...
      lines.push(`  - Score ${score}${level}: "${desc}"`);
    }
  }
  return lines.join("\n");
```

**Analog de contrato «zero imports»:** `_shared/email-config.ts:12-17` (docblock que explica por quê) e as constantes `as const` de `:19-30`. É o que permite o front importar pelo caminho relativo — precedentes em produção: `src/features/privacidade/services/exportacaoService.ts:61` (`import { EXPORT_ALLOWLIST } from '../../../../supabase/functions/_shared/exportAllowlist'`) e `src/features/cadastro/components/steps/AutorizacoesStep.tsx:50` (`consent-text.json`).

Formas recomendadas (RESEARCH §F.1/F.2/D-29):
- `bars-redacao.ts`: `RUBRICA_REDACAO_VERSAO = 'bars-prd-1.1'`, `DIMENSOES_REDACAO = [{ chave: 'D1', rotulo: 'Especificidade da situação', ancoras: {…} }, …]` (transcrita de `docs/conhecimento/fit-cultural/bars-redacao-4-dimensoes.md` v1.1) + `montarBlocoRubricaRedacao(pergunta)` que escreve `Pergunta: <texto>` **sem** o código (colisão D1–D3, varredura C7 #8).
- `sjt-rubrica.ts`: rótulos/âncoras por **chave** (`raciocinio_clinico_estetico`, `planejamento_decisao`, `comunicacao_expectativa`, `etica_minimamente_invasivo`, `consentimento_continuidade`), do `PRD-sjt-work-sample-odontologia.md`.
- `comparativo-config.ts`: `export const COMPARATIVO_MAX_CANDIDATOS = 4 as const; export const COMPARATIVO_MIN_CANDIDATOS = 2 as const;` — importado pela EF, por `analise-schemas.ts:156` e pelo front (substitui `COMPARE_MAX`/`COMPARE_MIN` de `TriagemTable.tsx:50-52` e os 8 lugares da varredura C1 #17).
- ⚠ `analise-schemas.ts` importa `npm:zod` — ele pode importar `comparativo-config.ts`; o contrário não.

**Teste Deno** — molde `bars-rubric.test.ts` (56 linhas): `import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";`, um `Deno.test` por propriedade, `assertStringIncludes` sobre o bloco. Obrigatórios (CONTEXT Discretion JORN-07): bloco enviado contém os 4 rótulos e âncoras da constante; `dimension` fora de `{D1..D4}` ou repetido ⇒ não grava como concluída. E, no vitest, os rótulos renderizados = a constante importada.

---

### 16. EFs consumidoras (comparativo, redação, SJT, transcrição, guia, análise)

**16a. `comparativo-candidatos/index.ts`** — trechos atuais a reordenar (RESEARCH §H.2):

```ts
  // ── 3. Valida 2-10 ids ──                                              (:168-174)
  if (ids.length < 2 || ids.length > 10) {
    return errorResponse("VALIDATION", "Selecione de 2 a 10 candidatos para comparar.");
  }
  ...
    if (role === "rh") {                                                  // posse (:180-194)
      const { data: vagaRow, error: vagaErr } = await supabaseAdmin
        .from("vagas").select("created_by").eq("id", body.vaga_id).maybeSingle();
      if (vagaErr) return errorResponse("SERVER_ERROR", "Falha ao verificar a vaga.", 500);
      if (!vagaRow || vagaRow.created_by !== user.id) return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }
  ...
    const vagas = new Set(rows.map((r) => r.vaga_id));                   // IDOR (:210-220)
    if (vagas.size !== 1 || rows.length !== ids.length) {
      return errorResponse("MIXED_VAGA", "Os candidatos pertencem a vagas diferentes (ou alguma análise ainda não existe).");
    }
  ...
    const ordered = [...rows].sort((a, b) => (b.score_match ?? -1) - (a.score_match ?? -1));   // :224-226 — sem desempate
  ...
    await supabaseAdmin.from("comparativo_solicitado").insert({ ... });  // :288-294 — erro não checado
  ...
    return jsonResponse({ ok: true, ranking, latencia_ms }, 200);          // :304
```
Nova leitura `candidaturas(id, vaga_id, etapa_atual, status)` antes das análises, no **mesmo idioma de allowlist + erro destruturado** de `:198-205`; o predicado de encerrada precisa de um espelho TS no lado Deno (não existe nenhum em `supabase/functions/` — grep feito): ou um `_shared` sem imports com a mesma tabela-verdade (e o teste do §20 compartilhado), ou, preferível por D-21, o `src/lib/candidatura/candidaturaEncerrada.ts` passa a reexportar de `_shared` (a direção de import que o repo já usa). INSERT com erro checado — molde `analise-candidato-individual/index.ts:565-585`:

```ts
    const { error: upsertErr } = await supabaseAdmin.from("analise_candidato_vaga").upsert({ ... });
    if (upsertErr) {
      throw new Error(
        `upsert final de analise_candidato_vaga falhou: ${upsertErr.code ?? ""} ${upsertErr.message ?? ""}`.trim(),
      );
    }
```
Teste — `comparativo-candidatos/__tests__/index.test.ts`: fixtures `COMPARATIVE_RANKING_FIXTURE :26-37`, `makeMockAnthropic :39-48`, `makeMockSupabaseAdmin(analiseRows, vagaOwner, role)` `:69+`, casos-molde `C1 :199-212` (403), `TRIAGEM-03 :215-243` (teto), `:245-259` (MIXED_VAGA). Mudam de propósito: `:191-259` (D-56). Casos novos: IDOR (`vaga_id` da candidatura ≠ `body.vaga_id` ⇒ 403 com a posse OK), encerrada ⇒ 400 `ENCERRADA`, sem análise ⇒ 400 `SEM_ANALISE`, > 4 ⇒ 400, resposta com `posicoes` e `provedor_ia/modelo_ia`.

**16b. `avaliar-redacao-cultural/index.ts`** — bloco injetado `:244-247`:
```ts
    const perguntaBlock =
      `Pergunta (${pergRow.codigo}): ${pergRow.texto}\n` +
      `Valor primário: ${pergRow.valor_primario ?? ""}` + ...
```
→ `vagaRubricBlock: montarBlocoRubricaRedacao(...)` da constante. Os dois upserts (`:291-313` falha, `:346-368` sucesso) trocam `model_version: resolved.model_id` (configurado — Correção 28) pelo modelo real do `CallAiResult`, gravam `provedor_ia`/`modelo_ia`/`rubrica_versao`, e passam a destruturar `{ error }` (hoje `.select("id").single()` sem ler erro). Checagem pós-parse do conjunto `{dimension}` = `{D1..D4}` antes de `computeScoreAndCors` (`:318-323`) — falha ⇒ caminho de `pendente_humano` com flag própria, como o never-absent `:286-316`.

**16c. `avaliar-redacao/index.ts` (SJT)** — `:256` `vagaRubricBlock: \`Vaga: ${candRow.vaga_id}\`` → bloco de `sjt-rubrica.ts` + nomes/pesos de `perguntas.rubric` (já lidos em `:224-235`); `:131` `const w = rubricWeights?.[d.dimension] ?? 1;` → dimensão desconhecida ⇒ `hasInsufficient` / pendente humano, **nunca** peso 1 (JORN-35). D-68: proveniência na `metadata` dos três `insert` em `scores_candidato` (`:281`, `:297`, `:322`), com erro checado.

**16d. `avaliar-transcricao-entrevista/index.ts`** — guias lidos sem filtro de tipo (`:193-203`, `.eq("candidatura_id", …)` só); INSERT de falha `:266-274` e de sucesso `:299-307` e upsert `:309-325` **sem** erro checado (devolvem `{ok:true}`). Fluxo novo = RESEARCH §I.3 (7 passos). Body: `AvaliarTranscricaoBodySchema` (`_shared/entrevista-schemas.ts:60-65`, `.strict()`) ganha `tipo: z.enum(['online','presencial']).optional()` — **EF antes do front** (Pitfall 4). O mesmo schema é importado pelo contrato do front `src/features/entrevista/__tests__/entrevista-contract.test.ts:26`.

**16e. `gerar-guia-entrevista/index.ts:362-370`** e **`analise-candidato-individual/index.ts:565-585`** — só acrescentar `provedor_ia`/`modelo_ia` ao objeto do upsert (os dois já destruturam o erro).

**Deploy de toda EF:** `node efdeploy.cjs <slug> --dry-run` (conferir o fechamento de imports à mão — o cabeçalho afirma uma checagem que não existe, deferred 48) e depois sem `--dry-run`. `verify_jwt` vem da tabela `VERIFY_JWT` (`efdeploy.cjs:45+`): as 5 invocadas pelo navegador em `true`; `notificar-candidato`, `analise-candidato-individual`, `gerar-devolutiva-bigfive` em `false`.

---

### 17. `notificar-candidato/index.ts` (D-35, e-mail)

**Analog:** o próprio survivor-guard `:283-298`:

```ts
  if (
    evento === "confirmacao" &&
    (candidatura.status === "rejeitado" ||
      candidatura.opcao_knockout_id !== null)
  ) {
    console.log(
      "[notificar-candidato]",
      logSeguro({ evento, candidatura_id, skipped: "knockout" }),
    );
    return jsonResponse({ ok: true, skipped: "knockout" }, 200);
  }
```
Bloco irmão logo abaixo: `evento === "avanco" && <predicado encerrada>(candidatura.etapa_atual, candidatura.status)` ⇒ `skipped: "encerrada"`, **antes** do claim. A allowlist de colunas `:274-277` já traz `etapa_atual, status`. Se `logSeguro` tiver allowlist de valores de `skipped`, acrescentar `"encerrada"` (`helpers.ts:142-160`).

Teste — molde `__tests__/notificar-candidato.test.ts:539-556`:
```ts
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, status: "rejeitado", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX, vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200);
  const res = await handler(makeRequest({ evento: "confirmacao", candidatura_id: "cand-ko" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER });
  assertEquals(res.status, 200);
  assertEquals((await res.json()).skipped, "knockout");
  assertEquals(fetchMock.calls.length, 0);
  assertEquals(supa.upserts.length, 0);   // guarda ANTES do claim
```
Casos: `avanco` + `inscricao/rejeitado` ⇒ skipped; `avanco` + `triagem/finalizado` ⇒ skipped; `avanco` + em andamento ⇒ envia (a guarda não morde demais).

---

### 18. Lista do RH — `candidaturasService.ts`, `vagasTypes.ts`, `CandidatosRHPage.tsx`, `ScoreCard.tsx`, `LiberacaoCognitivoBlock.tsx` (JORN-13/38/40)

**Allowlist de colunas** — molde `src/features/avaliacao/services/scoresRhService.ts:120-142`:
```ts
/**
 * The EXPLICIT column allowlist for the RH scorecard read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). Listed as a constant so the projection
 * is auditable in one place.
 */
const SCORES_ALLOWLIST =
  'id, tipo, subtipo, pergunta_id, score, score_max, status, metadata, citacoes, red_flags'
...
    .select(SCORES_ALLOWLIST)
```
As três ocorrências da forma (Correção 21):
- `updateCandidaturaStatus` `:432-436` — `.select('*, candidato:candidatos(*), vaga:vagas(*)')`; o corpo só lê `etapa_atual` (`:446`) ⇒ `select('id, etapa_atual, status')`.
- `listAllCandidaturas` `:557-578` — `candidato:candidatos(*)`, `vaga:vagas(*)`, embeds mortos `scores_bigfive`/`scores_disc`; vira `candidato:candidatos(id, nome_completo, email, celular)`, `vaga:vagas(id, titulo)`, `scores_candidato!left(tipo, status, score, score_max)` e `redacoes_candidato!left(id)` (sinal de «fez a redação», D-32), `scores_raven!left(percentil)` (faixa, D-33).
- `listCandidaturasByVaga` `:689-702` — pede `data_nascimento`, `cpf`; conferir antes quem consome e cortar.
- Teste: `src/features/vagas/services/__tests__/candidaturasService.test.ts` — asserção de que a string do select não contém `candidatos(*)` nem `cpf` (idioma do Wave-0 de `scoresRhService`, docblock `:4-9`).

**Helpers que viram 0** — `vagasTypes.ts:692-701` (`calculateBigFiveAverage` → `if (!scores) return 0`) e `:718-722` (`getCultureScore` → `return 0`). Substituir por funções que devolvem estado tipado (`'concluido' | 'nao_fez'`; `{ estado: 'nota', valor } | { estado: 'aguardando_revisao' } | { estado: 'nao_fez' }`) — a Invariante do 13 («ausência nunca vira 0») é o que o teste assere. Chamador: `CandidatosRHPage.tsx:351-355`.

**`ScoreCard.tsx`** — `getScoreColor` (`:47-53`) só para Cultura; Big Five sem cor nem número (`:84-91`); DISC sai (`:95-104`); Intel = faixa sem cor de percentil (`:111-119` hoje colore por `getScoreColor(inteligencia)`). Faixa **neutra** (sem verde/vermelho) no idioma de `ScorecardAvaliacao.tsx:231-275` (`BIGFIVE_BANDA_LABEL` + `Badge className="border-white/15 bg-white/5 text-white/70 text-xs"`).

**`cognitivoBanda` (D-64)** — hoje privada em `ScoreCard.tsx:23-27`:
```ts
function cognitivoBanda(percentil: number): string {
  if (percentil >= 70) return 'Acima do esperado'
  if (percentil >= 40) return 'Dentro do esperado'
  return 'Abaixo do esperado'
}
```
Extrair para `src/lib/cognitivo/cognitivoBanda.ts` (forma de `src/lib/candidatura/candidaturaEncerrada.ts`: docblock com a regra UX-07 e «quem mais usa», export nomeado, teste de tabela-verdade `it.each` no molde de `src/lib/candidatura/__tests__/candidaturaEncerrada.test.ts:13-30`). `ScoreCard` e `LiberacaoCognitivoBlock` importam a mesma.

**`LiberacaoCognitivoBlock.tsx:94-110`** — o `<dl>` com «Percentil» (`data.resultado.percentil` + `classificacao`) e «Acertos X de 60»: os dois saem (D-64), entra a faixa de `cognitivoBanda`. O comentário `:87-91` («O percentil é o número que se lê…») fica falso e é reescrito. Teste novo: nenhum dígito de percentil nem «de 60» no DOM.

---

### 19. Encerrada no front — `KanbanBoard.tsx`, `UpdateStatusModal.tsx`, `TriagemTable.tsx`, comparativos, `listFinalistas` (JORN-25/33/34, D-34/36/36b/67)

**Predicado:** `import { candidaturaEncerrada } from '@/lib/candidatura/candidaturaEncerrada'` — uso canônico em `HubCandidatoRH.tsx:146-155`:
```ts
  // JORN-26 (C1/C1b da varredura 48): ... O critério de «acabou» é o predicado canônico (etapa OU status).
  // O servidor também recusa desde o plano 48-01 ... aqui a tela só deixa de OFERECER a ação, e diz por quê.
  const encerrada = candidaturaEncerrada(etapaAtual, contexto?.status)
```

- **Kanban** `getTerminalBadge` `:97-116` — hoje só `etapa === 'aprovado'` e `etapa === 'rejeitado' || status === 'rejeitado'`; acrescentar o ramo «Encerrada» para `finalizado` em etapa de trabalho via predicado. `canDrag: () => !terminalBadge` (`:191`) e `{!terminalBadge && (<DropdownMenu>…` (`:298`) já dependem do selo — nada mais muda. Teste: `src/components/__tests__/KanbanBoard.test.tsx`.
- **UpdateStatusModal** `VALID_TRANSITIONS` `:59-65`:
  ```ts
  aprovado_proxima: ['em_analise', 'finalizado', 'rejeitado'],
  rejeitado: ['em_analise'], // Permite reconsiderar candidato rejeitado
  ```
  → `rejeitado: []` (JORN-34) e `finalizado` sai de `aprovado_proxima` (D-67). Rejeitar já vai pela RPC (`:150-157`). Teste: `src/components/modals/__tests__/UpdateStatusModal.test.tsx`.
- **TriagemTable** seleção `:240-272` — o idioma de desabilitar com Tooltip já existe (`checkboxDisabled` + `<TooltipContent>Máximo de 10 candidatos por comparativo.</TooltipContent>` `:258`); encerrada entra como segundo motivo (selo + checkbox desabilitado + tooltip próprio). Retirada a pedido **segue selecionável** (invariante da Phase 45, `TriagemTable.test.tsx` ~188). `COMPARE_MAX`/`COMPARE_MIN` (`:50-52`) passam a vir de `comparativo-config.ts`.
- **Rótulo por posição** — `ComparativoCandidatosPage.tsx:63-80` e `DecisaoFinalPage.tsx:66-80` fazem `Number.parseInt(r.candidate_id.replace(/\D/g, ''), 10) - 1` → `selection[idx]`. Trocar por lookup em `data.posicoes[r.candidate_id]` (a EF devolve, §16a); sem entrada ⇒ mostrar o rótulo cru, nunca o vizinho.
- **«Avançar» real** `ComparativoCandidatosPage.tsx:118-126` grava `PROXIMA_ETAPA_APOS_TRIAGEM` (`triagemService.ts:374`) para todos → `proximaEtapa(etapaAtual)` de `src/lib/candidatura/proximaEtapa.ts` (novo), extraído da regra hoje duplicada em `HubCandidatoRH.tsx:76,138-139` e `KanbanBoard.tsx:58,179-180` (duas cópias locais de `WORKING_STAGES`: defeito de forma — os dois passam a importar o util).
- **`listFinalistas`** `decisaoService.ts:215-240` — hoje `from('decisao_final').select('candidatura_id, decisao, candidaturas!inner(vaga_id)')`; D-36b ⇒ `from('candidaturas').select('id, etapa_atual, status').eq('vaga_id', vagaId).eq('etapa_atual', 'decisao_final')` + filtro `!candidaturaEncerrada`. Estado vazio verdadeiro na `DecisaoFinalPage` (Correção 23: 1 candidatura em PROD). Manter a classe `DecisaoServiceError` e o `'DATABASE_ERROR'`.

---

### 20. Selo de proveniência (D-27b) e log do admin (D-27c)

**Componente novo** — molde `src/features/triagem/components/SugestaoIABadge.tsx` (inteiro): docblock com a regra, cópia canônica exportada como constante (`SUGESTAO_IA_COPY` `:18`), `Badge` com classes fixas, variante `compact`/`full`, export nomeado. Renderiza só quando o resultado tem `modelo_ia` ≠ o configurado (ou `provedor_ia='openai'`); `modelo_ia` NULL ⇒ «proveniência desconhecida» (D-30), nunca silêncio. Uso: `ComparativoScreen`, análise da triagem, guia, análise de entrevista, painel da redação. Texto passa pelo `src/__tests__/guards/forbidden-strings.grep.test.ts` (D-58).

**PDF** — `src/features/triagem/pdf/exportComparativo.ts:62-68`: `exportComparativo(candidates)` ganha o parâmetro de proveniência e uma linha abaixo do título (`doc.text(…, 14, 14)`).

**`AiLogsPage.tsx:236-240`** — hoje:
```tsx
<Badge variant={row.success ? 'default' : 'destructive'}>
  {row.success ? 'Sucesso' : 'Falha'}
</Badge>
```
→ terceiro estado «Fallback» (âmbar) quando `error_code` começa com `fallback_`, com a causa (não coube / demorou / fora do schema) do sufixo. A coluna Provider/Modelo (`:231-232`) já existe. Teste novo em `src/features/admin/ai-logs/`.

---

### 21. Redação e entrevista no front (D-25, D-41, D-42)

- **Rótulos** — `RedacaoReviewPanel.tsx:46-52` (`DIM_LABEL` com os 4 valores) e `RedacaoOverrideForm.tsx:44-50` (`DIMENSOES`) passam a importar `DIMENSOES_REDACAO` de `supabase/functions/_shared/bars-redacao` (caminho relativo, precedente §15). `EntrevistaScorecardInline.tsx:29-34` usa os 4 valores como competências **de entrevista** — outro assunto, não mexer.
- **Raciocínio e citações** — `AnaliseIA` `:60-62` lê `analise_ia.reasoning` e `analise_ia.citacoes` (inexistentes): trocar por `analise_ia.dimension_scores[k].reasoning` / `.cited_evidence[]` e `qualitative_summary`. Linha com `rubrica_versao` NULL mostra o aviso de versão antiga (D-26).
- **Teste** — `src/features/triagem/components/__tests__/RedacaoOverrideForm.test.tsx:33-37` assere `/Experiência UAU/`…`/Sede de Crescimento/`: muda de propósito para iterar sobre a constante importada (o teste deixa de ter lista literal — é a forma que não envelhece).
- **Seletor de tipo na transcrição** — `GuiaEntrevistaPanel.tsx:544-575` (dois CTAs `onGerar?.('online')` / `onGerar?.('presencial')`) é o molde; na aba `transcricao` do `EntrevistaWorkspace.tsx:203-213` o `TranscricaoReviewPanel` ganha o mesmo par, padrão = etapa atual. `analisarTranscricao` (`entrevistaService.ts:663-690`) manda `tipo`; `getAnalise` (`:457-488`, hoje `.order('created_at', desc).limit(1)`) passa a filtrar a vigente e expor as superadas (D4) com quem revisou e quando (D-42).

---

### 22. Checklist D-57 (uma vez por onda, depois do 49-14 — mesmo gerador do recibo)

**Analog:** `.planning/phases/48-consertos-da-jornada-bloco-1/48-17-PLAN.md` Tasks 1-3 (`:89-177`) — copiar a sequência e os `<verify>` quase literalmente:

1. `catalogo-vivo-44.json` → novo item em `meta.acrescimos[]` no formato do da fase 48 (`medido_em`, `fase: 49`, `plano`, `fonte`, `query` com `information_schema.columns … table_name IN (…)`, `colunas: ["tabela.coluna", …]`). Não reescrever `medido_em`/`totais`.
2. `export-scope-rules.yaml` → um veredito por coluna em `decisoes_por_coluna`, formato `:515-520`:
   ```yaml
     analise_candidato_vaga.descartada_em:
       export: true
       razao: "(ii)+(iii) Quando a análise foi marcada ... É estado de processo da análise, como `status`. ..."
   ```
   Proveniência (`provedor_ia`/`modelo_ia`/`rubrica_versao`): a família de `redacoes_candidato.model_version` (`:571-573`, `export: false`, «(i) telemetria_interna — qual modelo rodou») — **ou** decidir o contrário com razão, já que o D-27 torna a troca visível ao RH; nunca por omissão. UUID de funcionário (`solicitada_por`) em `ponteiros.de_terceiro` (`:385-395`). `meta.versao` `:35` `1.2.0` → `1.3.0`.
3. `pii-inventory.yaml` → classificação no padrão das vizinhas (`entrevista_analises :285-292`, `redacoes_candidato :294-303`); reclassificação D-61 de `ai_call_logs.user_prompt_template` e da nota de `raw_response` (`:330-331`, texto proposto no RESEARCH §Item 4); `revisao_resultado` `:163`/`:183` perde o «⚠ não a toca» (D-60); `tabelas_sem_pii_titular` `:492-512` tira `analise_candidato_vaga` e `entrevista_guias` (D-66). Regenerar `.md` com `gen-pii-md.cjs`.
4. `gen-recibo-exclusao.cjs` → item `respostas_e_producoes` `:293-317` (origens que o passo novo agora apaga), `dados_enviados_a_analise_automatica` `:344-356` ganha `q('ai_call_logs', ['user_prompt_template'])`, e a linha `mapa(q('ai_call_logs', ['system_prompt', 'user_prompt_template']), 'conteudo_do_produto')` `:650` perde `user_prompt_template`; `anotacoes_da_equipe` `:528-550` perde `revisao_resultado` (vai para o tratamento da justificativa); `mapa(q('entrevista_analises', ['solicitada_por']), 'dado_de_funcionario')` junto de `:645`; `texto_hash`/`ai_call_log_id` como `chave_tecnica` (molde `:647` `redacoes_candidato.texto_hash`).
5. Regenerar: `node docs/compliance/sql/gen-export-allowlist.cjs`, `gen-pii-md.cjs`, `gen-recibo-exclusao.cjs`; os dois `VALUES` do `05-export-allowlist-drift.sql` por `--sql-values` / `--sql-values-excluidas` (GERADOS, cabeçalho `:75-78` com a contagem de pares); snapshots inline de `exportAllowlist.test.ts` (`:133`, `:170`, `:644`) atualizados de propósito; asserção `(k)` `:712` cruza os VALUES.
6. `npm run -s check:matriz-retencao && npm run -s check:pii-inventory-md && npm run -s check:recibo-exclusao && npm run -s check:export-allowlist && npx vitest run docs/compliance` (scripts em `package.json:103-106`).
7. Drift contra PROD: `node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql` não lista coluna desta fase.
8. Redeploy `exportar-meus-dados` e `executar-direito-titular`; conferir a string nova no bundle (`curl …/functions/<slug>/body | grep -a -c`, idioma do 48-17 Task 3).
9. `database.types.ts` — comando com `< /dev/null` (48-17 Task 3; 0 octeto ⇒ `git checkout -- database.types.ts` e repetir); `tsc` ≤ 90; `origin/main..HEAD` vazio.

---

## Shared Patterns

### A. Redefinir função viva: ler o vivo, pinar, transcrever inteiro
**Source:** `20260921000012:73-90` (pré-portão) + `:265-294` (pós-portão) · `20260921000011:72-92` (duas funções num bloco) · `20260823000006:56-110` (proveniência do corpo destrutivo)
**Apply to:** §4 (4 funções), §5 (`stamp_explicacao_acessada`), §7 (2 RPCs), §9 (motor + plano)
Antes de escrever: `node p46apply.cjs sql "SET TRANSACTION READ ONLY; select md5(p.prosrc), length(p.prosrc), pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='<nome>'"`; diffar contra o arquivo-base deste mapa; pinar o md5 no pré-portão; `CREATE OR REPLACE` **completo** (nunca `replace()` dinâmico); pós-portão que assere o que entrou **e** o que não podia sumir; `RAISE NOTICE` com o md5 novo para o SUMMARY. Um plano só reescreve cada função (D-55 / RESEARCH «dono único»): `avancar_etapa`+`registrar_decisao`+`responder_revisao_decisao`+`guard_rejeicao_auditada` no 49-03.

### B. GUC de transição sancionada (idioma `app.rejeicao_sancionada`)
**Source:** `20260921000012:223-231` (`PERFORM set_config('app.rejeicao_sancionada', 'on', true)` antes do UPDATE), leitura em `20260712110001:115` (`current_setting('app.rejeicao_sancionada', true) IS NOT DISTINCT FROM 'on'`) e em `20260709000010:64` (`IS DISTINCT FROM 'on'`)
**Apply to:** `app.transicao_sancionada` nova (D-35) em `registrar_decisao`, `responder_revisao_decisao`, fixture do `p48_reabertura_smoke`
- `set_config(..., true)` = SET LOCAL = até o fim da **transação** (Correção 31). A GUC nova é **resetada** (`set_config(…, '', true)`) logo depois do UPDATE que sanciona. A antiga (`rejeicao_sancionada`) não é tocada.
- Leitura sempre com `missing_ok = true` e `coalesce(…, '')`.
- Sancionar por GUC, **nunca** por destino (RESEARCH §H.1: um PATCH `etapa_atual='aprovado'` pela policy `rh_avanca_etapa` passaria).

### C. Portões que pinam corpo e contadores fixos (D-56)
**Source:** `p45_motor_exclusao_smoke.sql:222-360` + `:1714-1715` (pins md5 de `plano_exclusao_titular`/`anonimizar_candidato`), contador 25 (`:25-33`); `p48_reabertura_smoke.sql:737` (esperado 12); pós-portões de `20260921000012:265-294` e `20260906000002:120-125` (asserções por `position(…)` sobre o corpo instalado)
**Apply to:** todo plano que muda motor, trilha ou RPC de entrevista
Re-pin = ato consciente e documentado no cabeçalho do smoke, na mesma entrega da migration, **e** a rede estrutural cresce junto. Varredura pela forma antes (282 linhas hoje) com o padrão de `49-VARREDURA-KICKOFF.md:248-252`; classificar cada achado tocado; depois, provar que morde (mutação na mesma requisição atômica — 48-01-SUMMARY «O portão morde (medido nesta sessão)»; 48-03-SUMMARY tabela «morde (1)(2)(3)»).

### D. Smoke SQL que escreve e reverte
**Source:** `p48_reabertura_smoke.sql` (envelope `P48R1` `:320-330`, baseline `:77-127`, fixture `:180-190`, resíduo + cinto `:700-730`, gate `:731-755`)
**Apply to:** §10, §11, §12
Fixture sintética `@invalido.local`, nunca conta `+claude`; atores reais lidos na execução; julgamento fora da subtransação; contadores com `set_config(..., false)`; smokes que despacham em envelope que aborta; `node p46apply.cjs run supabase/tests/<arquivo>.sql`.

### E. Handler Deno testável com deps injetadas
**Source:** `comparativo-candidatos/index.ts:83-95` (`ComparativoDeps`) + `if (import.meta.main) { Deno.serve(...) }` `:315+`; testes `__tests__/index.test.ts` (`loadHandler()`, mocks sem rede)
**Apply to:** toda EF tocada
Os testes chamam `handler(req, deps)` e **não** exercitam o wiring do `Deno.serve` (CONTEXT §Established Patterns): mudança de wiring (novo import de `_shared`) se confere com `efdeploy.cjs --dry-run`. Rodar: `find supabase/functions -name "*.test.ts" | grep -v strict-schema | xargs deno test --allow-all`.

### F. Escrita de EF com erro checado
**Source:** `analise-candidato-individual/index.ts:565-585` (`const { error: upsertErr } = …; if (upsertErr) throw new Error(\`… ${upsertErr.code ?? ""} …\`)`); leitura com erro `comparativo-candidatos/index.ts:198-205`
**Apply to:** `comparativo-candidatos:288`, `avaliar-transcricao-entrevista:266,299,309`, `avaliar-redacao-cultural:291,346`, `avaliar-redacao:281,297,322` (varredura C6 #4-#6)
Nunca devolver `{ok:true}` depois de escrita falha. Log só código/ids (idioma `console.log("[<ef>] ok", { candidatura_id, … })` — nunca texto, nome, score).

### G. Constante única `_shared` sem imports, importada pelo front
**Source:** `_shared/email-config.ts:12-17` (contrato), `src/features/privacidade/services/exportacaoService.ts:57-61` (import relativo com comentário do porquê), `src/features/cadastro/components/steps/AutorizacoesStep.tsx:50`
**Apply to:** `bars-redacao.ts`, `sjt-rubrica.ts`, `comparativo-config.ts`, e o espelho Deno de `candidaturaEncerrada` se nascer
Rótulo vem da **chave** que a EF devolve e da mesma constante que alimentou o modelo — nunca de posição nem de mapa próprio da tela (RESEARCH Anti-Patterns).

### H. Front: service com allowlist + classe de erro + predicado canônico
**Source:** `scoresRhService.ts:120-150` (allowlist + `ScoresRhServiceError`), `candidaturasService.ts:39` (`CandidaturasServiceError`), `decisaoService.ts:215-240`, `candidaturaEncerrada.ts` + teste `it.each`
**Apply to:** §18, §19, §21
Nunca `select('*')` nem `candidatos(*)`; o predicado é do `@/lib/candidatura`; o servidor decide (a tela só deixa de oferecer).

### I. Escrita retroativa em PROD com escopo autorizado
**Source:** `20260921000014_p48_retro_feedback_rejeicao_triagem.sql` (DO inteiro) + `supabase/tests/p48_retroativos_ensaio.sql`
**Apply to:** §8 (D-43, D-46, D-47) — checkpoint com contagem antes/depois (D-54)
Ensaio só leitura com a mesma consulta → operador aprova o conjunto → migration com `v_autorizados` literal, `IS DISTINCT FROM` do conjunto, `ROW_COUNT`, e aborto se fila/histórico/notificações mudarem.

### J. Deploy e prova de publicação
**Source:** CLAUDE.md §«Via de apply ATUAL» · D-52 · 48-17-PLAN Task 3
**Apply to:** todo plano com efeito visível
Migration `node p46apply.cjs migrate <arquivo>` (ordem: enum/colunas da onda 1 conferidas no catálogo **antes** de qualquer deploy da onda 3 — Pitfall 8); EF `node efdeploy.cjs <slug>` (`--dry-run` antes); front = push `main`; `git log --oneline origin/main..HEAD` vazio (hoje **não** está — Correção 1); marcador no chunk certo (`grep -rl "<marcador>" build/assets/`; `/rh/*` e `/admin/*` são lazy); `npm run lint` ≤ 90.

### K. Registrar uma afirmação retirada sem reproduzi-la
**Source:** medido duas vezes nesta fase — 49-09 Deviation 1, 49-23 Deviation 1 (o 49-23 leu o SUMMARY do 49-09 antes de começar e errou igual, em três lugares)
**Apply to:** todo plano que remove ou corrige um texto que um portão estático vigia
Ao consertar uma frase falsa, **não a cite verbatim** no comentário, no docblock nem na mensagem de commit «para registro histórico»: os portões estáticos desta fase procuram a expressão **no disco**, não no código executável, e uma citação a deixa encontrável no mesmo arquivo que acabou de ser consertado. O portão reprova — corretamente. Descreva a afirmação retirada (o que ela alegava, por que era falsa) sem reproduzir a forma proibida. Afrouxar o padrão do portão para aceitar a citação é a troca errada: ele perde a capacidade de pegar a cópia real.

> Esta entrada existe porque a lição vivia só num SUMMARY de plano irmão e **não sobreviveu ao plano seguinte**. Um aprendizado de fase pertence ao PATTERNS, que todo plano lê, não ao SUMMARY de um vizinho.

### L. Um harness de mutação uniformemente zero é suspeita de INSTRUMENTO, não prova de portão
**Source:** medido duas vezes nesta fase — 49-26 (códigos ANSI não descontados na extração da contagem, 3 medições falsas) e 49-15 (`--reporter=basic` não existe no vitest 4; o comando aborta antes de executar teste nenhum e a ausência da linha `Tests N passed` é lida como zero, 8 medições falsas)
**Apply to:** todo plano que prova mordida por mutação
Se **várias mutações consecutivas** saem «0 reprovados», pare e meça o instrumento antes de concluir qualquer coisa
sobre o portão. Um harness que falha em silêncio produz **a conclusão exatamente oposta à verdade**: ele diz «o portão
não morde» quando o que aconteceu é que nenhum teste rodou. As duas causas já medidas aqui:

- a extração da contagem lê a saída colorida e o número vem embrulhado em escape ANSI — descontar antes de comparar;
- a flag passada ao runner não existe nessa versão, o comando aborta com erro de uso, e o parser interpreta a ausência
  da linha de resumo como zero reprovados — **conferir o exit code do runner**, não só a sua saída.

Regra prática: uma mutação que não morde é informação (pode ser ramo inalcançável — ver o que 49-09, 49-23, 49-24 e
49-25 fizeram com ela). **Oito** que não mordem é o instrumento. Confira à mão antes de escrever qualquer veredito.

### M. Registrar uma janela como `fixed` — o mecanismo real
**Source:** medido no 49-26 (o motivo é aceito e descartado) e corrigido no 49-15 (não existe `--reason`, e a tabela é gerada)
**Apply to:** todo plano que fecha uma entrada do `WINDOWS.md`
`gsd-tools windows fixed <id>` **não aceita `--reason`** (`Error: Unknown flag`), e passar o motivo como argumento
posicional faz a ferramenta aceitá-lo e **descartá-lo** — a entrada fica `fixed` com razão vazia (aconteceu na 60).
A tabela Markdown do topo do arquivo é **gerada a partir do bloco JSON**, então editar a célula à mão quebra o ledger
(`table disagrees with the fenced JSON entries … row id(s): N`).

> ⚠ **CORREÇÃO (49-28, medido): `windows status --raw` é o comparador FRACO — não confie nele.**
> Ele respondeu `ok: true` sobre um `WINDOWS.md` cuja tabela estava inconsistente com o bloco JSON
> (faltava o `|` de fecho de uma linha). Quem recusou, nomeando as linhas divergentes, foi o
> **`windows append`**. São dois comparadores diferentes e o mais permissivo é justamente o que se
> chama «status». Depois de fechar uma janela pelo §M, rode `windows append` — mesmo que não haja
> nada a acrescentar — para saber se os dois concordam de verdade. Um portão que não consegue
> verificar e responde «ok» é a mesma classe de defeito um nível acima (CLAUDE.md §Portões).

Via correta: escrever a razão no **bloco JSON** (a fonte de verdade) e sincronizar a célula da tabela **lendo o texto
de volta do JSON**, nunca redigitando. Conferir com `gsd-tools windows status --raw`, que responde `ok: true` quando os
dois concordam.

### N. Provar que o front SAIU no ar — o sinal confiável é o hash do bundle, não o marcador
**Source:** medido no 49-22 (o crawler dele engoliu o primeiro resultado e saiu com `exit=0` sobre um marcador GENUINAMENTE ausente) e no 49-16 (primeiro crawl `AUSENTE` por a Vercel ainda não ter terminado, ~40 s)
**Apply to:** todo plano que muda `src/` e afirma que o conserto está no ar
Três formas de errar, todas com o MESMO sintoma («marcador ausente») e ações opostas:

1. **A Vercel ainda não terminou** (~20–40 s depois do push). O conserto está certo; esperar resolve.
2. **O instrumento engoliu o resultado.** Um crawler que verifica vários marcadores numa chamada pode
   perder o primeiro e ainda sair `0`. **Um marcador por chamada.**
3. **O marcador atravessa interpolação JSX e não é greppável.** `até {CONST} candidaturas` no fonte
   não produz a string `até 4 candidaturas` em lugar nenhum — o JSX corta. O diagnóstico natural
   («o conserto não subiu») está errado, e o marcador nunca vai aparecer, por mais que se espere.
   **Marcador de publicação tem de ser trecho LITERAL do fonte, sem interpolação no meio.**

O que separa (1) de (2)/(3): ler o **hash do índice servido** e compará-lo com o do build local. O
hash responde «o deploy saiu»; o marcador responde «este texto está neste chunk» — perguntas
diferentes, e só a primeira distingue «esperar» de «investigar».

⚠ Corolário sobre teste de cópia: um teste que assere a frase pelo `body.textContent` **passa com a
frase errada** quando o elemento não está no DOM (o `TooltipContent` do Radix fechado não existe).
Asserir a constante exportada **e** um render que de fato monta — uma perna só dá a impressão de
vigiar o que ela não vê.

### O. Descobrir a assinatura de um comando de ESCRITA tentando executá-lo é uma escrita
**Source:** confessado pelo 49-22 — a sonda `windows fixed 78 xyz`, feita para descobrir a assinatura, EXECUTOU e gravou `status=fixed` com razão vazia; o comando recusa re-fixar, então a razão teve de ser escrita à mão
**Apply to:** toda interação com ferramenta cuja assinatura você não conhece
Antes de invocar um verbo que possa escrever, descubra a assinatura por `--help`, pelo fonte da
ferramenta, ou por um verbo de leitura equivalente — **nunca** por tentativa com argumentos
inventados. Uma sonda que «só queria ver a mensagem de erro» pode ter efeito, e ferramentas que
recusam repetir a operação transformam a sonda num estado que você não pode desfazer.

⚠ E ao consertar à mão depois: a razão vai no **bloco JSON**, que é a fonte de verdade, **e** na
célula da tabela. O 49-22 escreveu só na célula, e o defeito reapareceu como «fixed sem razão» na
conferência do orquestrador — a mesma entrada, o mesmo vazio, um comparador adiante.

---

## No Analog Found

| Arquivo / peça | Role | Data Flow | Motivo |
|---|---|---|---|
| RPC de gravação da análise de entrevista com superação da vigente (§7) | migration (RPC DEFINER) | CRUD | Nenhuma RPC do repo marca a linha anterior como superada e insere a nova na mesma transação. Pedaços têm molde (forma de `salvar_avaliacao_entrevista`, marca do D-02 de `20260921000004`); o desenho segue RESEARCH §I.3 passo 6. |
| Formato embrulhado de structured output (`fmtSeguro`) e as duas linhas de log por fallback (§14) | service | request-response | Nada no repo intercepta o `parse` do SDK. Usar o exemplo do RESEARCH §Code Examples (verificado contra o fonte do SDK 0.102.0) e os mocks existentes de `ai-client.test.ts`. |
| Passo do motor que apaga linhas (`DELETE` em 4 tabelas de resposta, D-62) | migration (função destrutiva) | batch | O motor nunca apagou linha própria (a devolutiva morre por FK CASCADE). É a exceção explícita do operador; o idioma de contagem por `GET DIAGNOSTICS` e o registro em `'passos'` vêm do próprio `anonimizar_candidato`. |
| Espelho TS de `candidatura_encerrada` no lado Deno (§16a, §17) | utility | transform | Não há nenhum em `supabase/functions/` (grep). Criar em `_shared` sem imports com a mesma tabela-verdade de `src/lib/candidatura/__tests__/candidaturaEncerrada.test.ts`, ou inverter a direção (o front reexporta do `_shared`) — decisão do planejador sob D-21 («reusar, não recriar»). |

## Metadata

**Analog search scope:** `supabase/migrations/` (17 da Phase 48 + origem viva de `avancar_etapa`, `registrar_decisao`, `responder_revisao_decisao`, `snapshot_decisao_final`, `stamp_explicacao_acessada`, `solicitar_revisao_decisao`, `guard_rejeicao_auditada`, `salvar_avaliacao_entrevista`, `confirmar_revisao_entrevista`, `anonimizar_candidato`, `plano_exclusao_titular`, enum `llm_*`, `prompt_versions.max_tokens`), `supabase/tests/{p45_motor_exclusao,p48_*,oper31_*}.sql`, `supabase/functions/{_shared,comparativo-candidatos,avaliar-redacao,avaliar-redacao-cultural,avaliar-transcricao-entrevista,gerar-guia-entrevista,analise-candidato-individual,notificar-candidato}`, `src/components/{ScoreCard,KanbanBoard,modals/UpdateStatusModal,pages/CandidatosRHPage,pages/ComparativoCandidatosPage}.tsx`, `src/features/{triagem,decisao,entrevista,vagas,avaliacao,avaliacao-cognitiva,hub-candidato,admin/ai-logs,privacidade}`, `src/lib/`, `docs/compliance/`, `.planning/phases/48-*/48-17-PLAN.md`, `efdeploy.cjs`, `p46apply.cjs`
**Files scanned:** ≈75
**Pattern extraction date:** 2026-09-22
