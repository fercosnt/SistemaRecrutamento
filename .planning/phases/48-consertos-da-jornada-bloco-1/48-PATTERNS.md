# Phase 48: Consertos da Jornada — Bloco 1 - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 47 (novos + modificados, incluindo smokes, testes e artefatos de compliance)
**Analogs found:** 45 / 47
**Escopo da busca:** `supabase/migrations/`, `supabase/functions/**`, `supabase/tests/`, `src/features/**`, `src/components/pages/`, `src/lib/`, `docs/compliance/`, raiz (`p46apply.cjs`, `efdeploy.cjs`)
**Regra de trilha:** todo analog abaixo foi conferido com `git ls-files` (rastreado). Nenhum espelho gitignored.

> **Leitura obrigatória para o planejador.** Todo número de linha foi conferido no disco em
> 2026-09-21. Onde o objeto **vivo** do banco difere do último arquivo de migration
> (`registrar_decisao`), isso está dito no bloco correspondente — a migration mais recente
> **não** é código vivo nesse caso.

---

## File Classification

### Migrations (todas novas; nome indicativo `2026092xxxxxxx_p48_*.sql`; aplicar com `node p46apply.cjs migrate <arquivo>`)

| Arquivo novo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `…_p48_candidatura_encerrada.sql` — função `candidatura_encerrada(etapa,status)` + D1 `registrar_pedido_exclusao` + D2 `retirar_candidatura` + D3 guard de `rejeitar_candidatura` + D4 `v_fila_trabalho` (+ D6 `funil_kpis` opcional) | migration (função IMMUTABLE + CREATE OR REPLACE de RPCs/view) | CRUD / transform | `20260805000007_p45_retirada_e_evento.sql` (BLOCO A + BLOCO E) · `20260716000003_funil_kpis_v2_and_v_fila_trabalho.sql:24-41` | exact |
| `…_p48_rejeicao_triagem_feedback_e_explicacao.sql` — `rejeitar_candidatura` grava `feedback_rejeicao` neutro + RPC tri-estado de explicação | migration (RPC SECURITY DEFINER) | request-response | `20260906000007_explicacao_knockout.sql` · `20260714100001_rejeitar_candidatura_rpc.sql:78-170` | exact |
| `…_p48_dedupe_por_historico.sql` — `trg_notif_transicao` passa `historico_id`; `trg_notif_revisao_solicitada`/`_respondida` passam discriminador do ciclo | migration (trigger → net.http_post) | event-driven | `20260906000006_notifica_rejeicao_automatica.sql` · `20260906000004_reagendamento_notifica_e_reseta_comparecimento.sql:30-69` | exact |
| `…_p48_reabertura_revisao.sql` — colunas em `decisao_final`/`decisao_final_historico`, `snapshot_decisao_final`, `responder_revisao_decisao` (ramo `revertida` reabre), `registrar_decisao` (arquiva/zera ciclo + D-23 + fail-closed), evento `prazo_reabertura_vencido` (CHECK + classe + exclusão do retry), `varrer_prazos_reabertura()` + cron | migration (várias RPCs + cron) | event-driven + batch | `20260730000002` (responder) · `20260826000004` (patch sobre corpo vivo) · `20260805000007` BLOCOS B/C/G · `20260823000012_p46_cron.sql:108-115` | role-match (composto) |
| `…_p48_aviso_titular.sql` — `solicitacoes_dados.aviso_pedido_enviado_em`, `aviso_cancelamento_enviado_em` | migration (ADD COLUMN) | CRUD | `20260805000001_p45_pedido_exclusao.sql:204-240` | exact |
| `…_p48_analise_descartada_knockout.sql` — `analise_candidato_vaga.descartada_em` + `descartada_motivo` (CHECK) | migration (ADD COLUMN + CHECK) | CRUD | `20260805000001_p45_pedido_exclusao.sql:211-222` | exact |
| `…_p48_local_ou_link_valida.sql` — trigger BEFORE INSERT/UPDATE OF `local_ou_link, tipo` em `agendamentos_entrevista` | migration (trigger de validação) | request-response | `20260906000004…:95-108` (`trg_agendamento_reagendado_reset`, BEFORE UPDATE OF + WHEN) · `20260709000010_guard_rejeicao_auditada.sql:53-99` | exact |
| `…_p48_cognitivo_liberado_notifica.sql` (D-22) — evento novo de candidato (CHECK + classe `transacional`) + trigger AFTER INSERT/UPDATE OF `liberado_em` em `cognitivo_liberacao` | migration (vocabulário + trigger) | event-driven | `20260730000004_p42_evento_revisao_respondida.sql` (evento de candidato ponta a ponta) · `20260805000007` BLOCOS B/C | exact |
| Script de checkpoint (não-migration) para UPDATE retroativo: 3 análises (D-02), 2 `encerrada_a_pedido_em`, 1 `feedback_rejeicao` | script SQL one-shot | batch | `20260826000004` (portão antes do write) + contagem antes/depois do `p43_matriz_retencao_smoke.sql:127-160` | role-match |

### Edge Functions

| Arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/functions/notificar-candidato/helpers.ts` (mod) | utility (pura) | transform | ele mesmo — `montarDedupeKey` ramo `convite`+`versao` (`:77-94`) | exact |
| `supabase/functions/notificar-candidato/index.ts` (mod) | controller (EF) | request-response | ele mesmo — parse `reagendamento` (`:139-146`), leitura de veredito (`:256-265`) | exact |
| `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` (mod) | test | — | ele mesmo `:29-40`, `:476-584` | exact |
| `supabase/functions/notificar-candidato/__tests__/vocabulario-eventos.test.ts` (mod, se D-22 criar evento) | test | — | ele mesmo | exact |
| `supabase/functions/notificar-rh/helpers.ts` + `index.ts` + `__tests__/notificar-rh.test.ts` (mod) — evento `prazo_reabertura_vencido`; chave `revisao_solicitada` com ciclo | controller + utility | event-driven | bloco P45-09 do próprio `helpers.ts:84-142` e ramificação `index.ts:246-285` | exact |
| `supabase/functions/_shared/email-config.ts` (mod) — `APP_BASE_URL_PADRAO` + `montarUrlLogin`; união `EventoNotificacao` (D-22) | config | transform | `notificar-rh/helpers.ts:37,180-217` (mover) | exact |
| `supabase/functions/_shared/email-templates.ts` (mod) — cópia de confirmação (D-09), link U2 por parâmetro, cópia revertida com data, template cognitivo | utility (template) | transform | ele mesmo — `DadosEmail.reagendada` (`:90-91`), `corpoRevisaoRespondida` (`:219-237`) | exact |
| `supabase/functions/_shared/__tests__/email-templates.test.ts` + `email-config.test.ts` (mod) | test | — | ele mesmo `:72-79` (grep-guard) | exact |
| `supabase/functions/analise-candidato-individual/index.ts` (mod) + `__tests__/index.test.ts` | controller (EF) | request-response | survivor-guard `notificar-candidato/index.ts:195-211` | exact |
| `supabase/functions/executar-direito-titular/index.ts` + `helpers.ts` + `index.test.ts` (mod) — aviso ao titular em `pedir`/`cancelar` | controller (EF) | request-response (e-mail fora do ledger) | `enviarRecibo` `index.ts:1343-1420` + `helpers.ts:301-418` | exact |
| `supabase/functions/gerar-devolutiva-bigfive/index.ts` (mod — instrumentação diag-auth) | controller (EF) | request-response | `guardDevolutivaBearer` `:612-628` | exact |
| `supabase/functions/submit-bigfive-final/index.ts` + `index.test.ts` (mod — log por código; conserto derivado) | controller (EF) | request-response | ele mesmo `:238-258`, `:286-326` | exact |

### Front-end

| Arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/lib/candidatura/candidaturaEncerrada.ts` (novo) + `__tests__/` | utility | transform | `src/lib/datetime/formatDataHoraSP.ts` (forma de util compartilhado) + `DashboardCandidatoPage.tsx:65-67` (regra) | exact |
| `src/lib/url/isSafeHttpUrl.ts` (novo) + `__tests__/` | utility | transform | `AgendamentoCandidatoCard.tsx:62-76` (mover) | exact |
| `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` (mod — importa o util) | component | — | ele mesmo | exact |
| `src/features/agendamento/schemas/agendamentoSchema.ts` (mod) + teste | schema Zod | validation | ele mesmo `:30-44` (`.refine`) | exact |
| `src/features/explicacao/services/explicacaoService.ts` (mod) + teste | service | request-response | ele mesmo — `getExplicacaoAutomatica` `:319-344` | exact |
| `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx` (mod) + teste | component | — | ramo `automatica` `:181`, `:236-262` | exact |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` (mod) + teste | component | — | `podeRetroceder` `:144` (gating por predicado) | exact |
| `src/features/entrevista/services/entrevistaService.ts` (mod — `status` na allowlist do contexto) | service | CRUD | ele mesmo `:234` | exact |
| `src/components/pages/CandidatosRHPage.tsx` (mod, C2 opcional) | component | transform | `:252-262` | exact |
| `src/features/revisao/components/ResponderRevisaoDialog.tsx` + `schemas/responderRevisaoSchema.ts` (+ testes) | component + schema | — | `:130-147` / `:63-72` | exact |
| `src/features/decisao/services/decisaoService.ts` + `components/RegistrarDecisaoForm.tsx` (mod — mapear recusa D-23) | service + component | request-response | `explicacaoService.ts:403-434` (mapa de SQLSTATE → outcome) | role-match |
| `src/components/pages/DashboardCandidatoPage.tsx` (mod — ramo de reabertura na `PrazoEstimadoLinha`) | component | — | ele mesmo `:363-375` | exact |
| `src/features/vagas/services/candidaturasService.ts:458` (mod — remover ramo morto) | service | CRUD | — | n/a |

### Smokes, compliance, tipos

| Arquivo | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/tests/p48_candidatura_encerrada_smoke.sql` (novo) | test (SQL) | batch | `p43_matriz_retencao_smoke.sql` (baseline `to_jsonb`) + `20260805000007:443-530` (subtransação que reverte) | exact |
| `supabase/tests/p48_reabertura_smoke.sql` (novo) | test (SQL) | batch | idem + `p42_revisao_art20_smoke.sql` | exact |
| `supabase/tests/p48_local_ou_link_smoke.sql` (novo) | test (SQL) | batch | idem | exact |
| `supabase/tests/p45_motor_exclusao_smoke.sql` (mod — fixtures `:853-864`, `:2238-2245`) | test | — | própria recomendação da varredura §6 | exact |
| `supabase/tests/p42_revisao_art20_smoke.sql` (mod — h.2 `:598`, teardown `:138-153`) | test | — | — | exact |
| `supabase/tests/p42_invent05_cron_smoke.sql` (mod — `c_herdados` `:145-148`) + `docs/compliance/cron-inventory.md` | test + doc | — | ele mesmo `:182-206` | exact |
| `supabase/tests/p42_notif_revisao_smoke.sql:181`, `p43_guard_marketing_smoke.sql:344,738` (converter lista/contagem → catálogo) | test | — | `p43_guard_marketing_smoke.sql:394-441` (asserção (e)) | exact |
| `docs/compliance/export-scope-rules.yaml`, `pii-inventory.yaml` (mod) → `node docs/compliance/sql/gen-export-allowlist.cjs` regenera `export-allowlist.json` + `supabase/functions/_shared/exportAllowlist.ts` | config | transform | entradas de `analise_candidato_vaga.*` `export-scope-rules.yaml:487-505`; `pii-inventory.yaml:120-165` | exact |
| `database.types.ts` (raiz, regen) | config gerado | — | comando com `< /dev/null` (CONTEXT §code_context) | n/a |

---

## Pattern Assignments

### 1. Cabeçalho, transporte e ACL de TODA migration desta fase

**Analog:** `supabase/migrations/20260906000007_explicacao_knockout.sql:1-52` e `20260906000006_notifica_rejeicao_automatica.sql:1-38`

Forma do cabeçalho (copiar a estrutura, não o texto): `====` + título + «O QUE ESTAVA ERRADO» (medido) + «POR QUE…» + «AUTHZ» + «IDEMPOTÊNCIA» + nota de transporte. A nota de transporte **atual** é a de `20260906000007:47-51`:

```sql
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL
-- `$$` com REVOKE/GRANT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260906000007_explicacao_knockout.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
```

⚠ **NÃO copiar** os blocos «REPARO OBRIGATÓRIO DO LEDGER» / `UPDATE ... SET version` de `20260730000004:45-56` e `20260805000007:68-78` — são da via MCP e estão **obsoletos** (CLAUDE.md §«Via de apply ATUAL», item 2).

**Função SECURITY DEFINER** (`20260906000007:54-82`):

```sql
CREATE OR REPLACE FUNCTION public.explicacao_rejeicao_automatica(
  p_candidatura_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
...
$$;

REVOKE ALL ON FUNCTION public.explicacao_rejeicao_automatica(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.explicacao_rejeicao_automatica(uuid) TO authenticated;
```

**ACL — `anon` tem de ser NOMEADO** (`20260805000007:400-412`): `pg_default_acl` concede EXECUTE a `anon`/`authenticated` como grant direto; `REVOKE … FROM PUBLIC` sozinho não remove nada.

```sql
REVOKE ALL ON FUNCTION public.retirar_candidatura(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retirar_candidatura(uuid) TO service_role;
```

Mapa de papel por função nova (RESEARCH §J):
- `candidatura_encerrada(etapa,status)` — IMMUTABLE pura; `REVOKE … FROM PUBLIC, anon` e `GRANT … TO authenticated` (é chamada de dentro de RPCs DEFINER e da view `security_invoker`).
- RPC tri-estado de explicação — idêntica a `explicacao_rejeicao_automatica` (`FROM PUBLIC` + `TO authenticated`; guard own-row no corpo).
- `varrer_prazos_reabertura()` — idêntica a `varrer_retry_notificacoes` (`20260805000007:788-790`: REVOKE de PUBLIC, anon **e** authenticated; sem GRANT).
- Funções de trigger — `REVOKE ALL … FROM PUBLIC; REVOKE ALL … FROM anon;` (`20260730000004:256-257`).

**Portão de auto-verificação no fim do arquivo** (`20260906000006:103-123`) — assere na definição instalada que o ramo novo **e** os antigos estão lá:

```sql
DO $$
DECLARE
  v_def text := pg_get_functiondef('public.trg_notif_transicao()'::regprocedure);
BEGIN
  IF position('ELSIF NEW.auto_rejeitado THEN' IN v_def) = 0 THEN
    RAISE EXCEPTION 'trg_notif_transicao instalada SEM o ramo de rejeicao automatica';
  END IF;
  ...
END $$;
```

**Guard de papel fail-closed** (`20260730000002:103-108`) — usar em toda RPC redefinida (corrige o fail-open de `registrar_decisao`, RESEARCH §J):

```sql
IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
  RAISE EXCEPTION 'forbidden' USING errcode = '42501';
END IF;
```

---

### 2. `…_p48_candidatura_encerrada.sql` (JORN-26 / D-11 / D-21)

**Analog principal:** `20260805000007_p45_retirada_e_evento.sql` BLOCO A (`:156-235`) e BLOCO E (`:443-530`)

**Função canônica** — forma recomendada pela varredura (`48-VARREDURA-ETAPA-ATUAL.md` §3), allowlist de terminais, NULL-safe:

```sql
CREATE OR REPLACE FUNCTION public.candidatura_encerrada(p_etapa public.etapa_processo, p_status public.status_candidatura)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT COALESCE(p_etapa IN ('aprovado','rejeitado'), false)
      OR COALESCE(p_status IN ('rejeitado','finalizado'), false)
$$;
```

(`encerrada_a_pedido_em` fica **fora** — varredura §3, Invariante 9 da 45-UI-SPEC.)

**D2 — os dois pontos a trocar em `retirar_candidatura`** (definição viva = `20260805000007:156-235`; `20260805000009` só mexe em grants — conferir com `pg_get_functiondef` antes, ver §6):

```sql
-- guard (hoje :212-215)
IF v_deleted IS NOT NULL OR v_etapa IN ('aprovado', 'rejeitado') THEN
  RAISE EXCEPTION 'CANDIDATURA_NAO_RETIRAVEL: ...' USING ERRCODE = '22023';
END IF;
-- UPDATE (hoje :225-231)
UPDATE public.candidaturas c
   SET encerrada_a_pedido_em = now()
 WHERE c.id = p_candidatura_id
   AND c.encerrada_a_pedido_em IS NULL
   AND c.deleted_at IS NULL
   AND c.etapa_atual NOT IN ('aprovado', 'rejeitado')     -- ← vira: AND NOT public.candidatura_encerrada(c.etapa_atual, c.status)
RETURNING c.encerrada_a_pedido_em INTO v_out;
```

O guard precisa ler `c.status` também (hoje o SELECT de `:182-186` só lê `etapa_atual::text`).

**D1 — `registrar_pedido_exclusao`**: mesmo UPDATE, escopo `candidato_id` (definição em `20260805000002_p45_rpc_pedido_exclusao.sql:216-220`; conferir o corpo vivo — `20260805000009` também a toca).

**D3 — guard terminal de `rejeitar_candidatura`** (`20260714100001:131-138`, definição viva idêntica — RESEARCH §B):

```sql
IF v_etapa IN ('aprovado', 'rejeitado') THEN        -- ← vira: IF public.candidatura_encerrada(v_etapa, v_status) THEN
  RAISE EXCEPTION 'candidatura ja esta em etapa terminal (%) — nao pode ser rejeitada novamente', v_etapa
    USING ERRCODE = 'check_violation';
END IF;
```
(o SELECT de `:114-118` passa a ler `c.status` também.) Este arquivo e o do §3 redefinem a **mesma** função — ou juntam-se num só, ou o segundo parte do corpo instalado pelo primeiro.

**D4 — `v_fila_trabalho`** (`20260716000003:24-41`): `CREATE OR REPLACE VIEW … WITH (security_invoker = true)` mantendo **as mesmas colunas na mesma ordem**; trocar só o WHERE:

```sql
   WHERE c.deleted_at IS NULL
     AND c.etapa_atual NOT IN ('aprovado', 'rejeitado')   -- ← vira: AND NOT public.candidatura_encerrada(c.etapa_atual, c.status)
```
Reafirmar `GRANT SELECT ON public.v_fila_trabalho TO authenticated;` (`:43`).

**D6 (opcional) — CTE `volume` de `funil_kpis`** (`20260716000003:92-99`): acrescentar o filtro ou uma coluna separada; é relatório (baixo).

**Auto-verificação por EXECUÇÃO do caminho feliz, revertida** — molde `20260805000007:443-530`. O idioma a copiar:

```sql
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_titular::text,
                      'app_metadata', json_build_object('role', 'candidato'))::text, true);
  v_out := public.retirar_candidatura(v_cand);
  ...
  RAISE EXCEPTION 'P45-VERIFICA-OK';
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('request.jwt.claims', '', true);
    IF SQLERRM <> 'P45-VERIFICA-OK' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'P45 OK: ...';
END;
```
⚠ Só `UPDATE` sobre linha real, nunca `INSERT INTO candidaturas` (dispara `trg_notif_confirmacao` e `trg_candidaturas_analise` — `20260805000007:432-437`). Para provar a recusa do knockout, escolher uma linha real com `status='rejeitado' AND etapa_atual='inscricao'` e esperar `22023`.

---

### 3. `…_p48_rejeicao_triagem_feedback_e_explicacao.sql` (JORN-22 / D-12 / D-20)

**Analog:** `20260906000007_explicacao_knockout.sql` (RPC) + `20260714100001:140-151` (UPDATE)

**`feedback_rejeicao` no UPDATE único** (`20260714100001:146-151`) — acrescentar uma coluna ao MESMO UPDATE (nunca um segundo UPDATE: o comentário `:140-145` explica que ele é o que dispara `avancar_etapa` e satisfaz `guard_rejeicao_auditada`):

```sql
UPDATE public.candidaturas
   SET etapa_atual         = 'rejeitado',
       status              = 'rejeitado',
       motivo_rejeicao     = p_motivo::text,
       etapa_justificativa = v_just
       -- + feedback_rejeicao = '<texto neutro>'
 WHERE id = p_candidatura_id;
```

Texto neutro: espelhar o do knockout vivo (`20260709000014:143`: `'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.'`); sugestão da pesquisa: «Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.» Régua: o grep-guard `/score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i` (`email-templates.test.ts:74`).

**RPC tri-estado** — copiar `20260906000007:54-79` inteiro, trocando `RETURNS boolean` por `RETURNS text` e o `EXISTS` por um `CASE`:

```sql
  SELECT EXISTS (
    SELECT 1
      FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
       AND c.status = 'rejeitado'
       AND c.motivo_rejeicao = 'knockout_automatico'
       AND c.opcao_knockout_id IS NOT NULL
  ) INTO v_automatica;

  RETURN COALESCE(v_automatica, false);
```
Invariantes a preservar (COMMENT `:84-94`): devolve só o discriminador (`'automatica' | 'humana_triagem' | NULL`), nunca `motivo_rejeicao`; `NULL` cobre «não é sua» **e** «não se aplica» (anti-oráculo). `'humana_triagem'` = own-row + `status='rejeitado'` + sem linha em `decisao_final` + não-knockout. Decidir se é função **nova** (e a boolean fica) ou redefinição — trocar o tipo de retorno exige `DROP FUNCTION` (e o front tipado quebra até o regen); função nova com nome próprio é o caminho sem janela.

---

### 4. `…_p48_dedupe_por_historico.sql` (JORN-18 / JORN-20 / ciclo de revisão)

**Analog:** `20260906000006_notifica_rejeicao_automatica.sql:40-101` (corpo vivo de `trg_notif_transicao`) + `20260906000004:55-61` (discriminador no corpo)

Discriminador no body — o precedente vivo (`20260906000004:55-61`):

```sql
      body := jsonb_build_object(
        'evento', 'convite',
        'candidatura_id', NEW.candidatura_id,
        'agendamento_id', NEW.id,
        -- 2026-09-06: UPDATE = reagendamento → a EF dedupa por data_hora e muda a copy.
        'reagendamento', (TG_OP = 'UPDATE')
      )
```

Aplicar ao `trg_notif_transicao` (`20260906000006:82-85`):

```sql
      body := jsonb_build_object(
        'evento', v_evento,
        'candidatura_id', NEW.candidatura_id
        -- + , 'historico_id', NEW.id      (AFTER INSERT em historico_candidatura ⇒ NEW.id é a transição)
      )
```

Manter intactos: CASE de eventos (`:53-65`), leitura do Vault + graceful-skip (`:67-73`), `EXCEPTION WHEN OTHERS` fail-open (`:75-89`), `REVOKE` (`:95`). Portão final: estender o `DO` de `:103-123` com `position('''historico_id'', NEW.id' IN v_def) = 0 → RAISE` (idioma de `20260906000004:113-117`).

Ciclo de revisão — mesma edição nos dois triggers de `decisao_final`:
- `trg_notif_revisao_respondida` (`20260730000004:202-247`, body `:236-239`)
- `trg_notif_revisao_solicitada` (`20260730000003:142-215`)
Discriminador recomendado (RESEARCH §D.2): `extract(epoch from NEW.revisao_solicitada_em)::bigint::text` (ou o `id` do ciclo, se o §5 criar um). O comentário de `20260730000004:196-200` («por isso `montarDedupeKey` NÃO ganhou ramo») fica **falso** com D-01 — registrar isso no cabeçalho.

⚠ **Ordem de entrega** (`20260730000004:12-33`, e RESEARCH §L): EF tolerante primeiro (aceita e ignora a ausência do campo), migration depois. Nunca o inverso.

---

### 5. `…_p48_reabertura_revisao.sql` (JORN-19 / D-01 / D-10 / D-23)

**5a. `responder_revisao_decisao` — ramo `revertida`**

**Analog:** definição viva `20260730000002_p42_revisao_art20_authz_fail_closed.sql:88-171` (nenhuma redefinição posterior no repo — conferir por `pg_get_functiondef` mesmo assim). Guards `:103-155` ficam **todos**; o decisor≠revisor (`:140-143`) é o molde do D-23:

```sql
  IF v_uid = v_row.por_usuario THEN
    RAISE EXCEPTION 'quem registrou a decisao nao pode responder a revisao dela (decisor)'
      USING errcode = '42501';
  END IF;
```

O UPDATE do veredito (`:157-163`) ganha as colunas de reabertura **no mesmo UPDATE** (um snapshot só):

```sql
  UPDATE public.decisao_final
     SET revisao_veredito      = p_veredito,
         revisao_resultado     = p_justificativa,
         revisao_por_usuario   = v_uid,
         revisao_respondida_em = pg_catalog.now()
         -- + reaberta_em / prazo_nova_decisao_em (só quando p_veredito = 'revertida')
   WHERE candidatura_id = p_candidatura_id
   RETURNING * INTO v_row;
```

Depois, no ramo `revertida`, o UPDATE de `candidaturas` com `etapa_justificativa` **própria** (regressão `rejeitado → decisao_final` exige — Pitfall 4; texto que se assinaria, nunca a justificativa do revisor) e `data_decisao_final = NULL` (A4). Guard adicional: só reabre se `status='rejeitado' AND etapa_atual='rejeitado'`.

**5b. `registrar_decisao` — PARTIR DO CORPO VIVO**

⚠ A definição viva **não está em arquivo nenhum**: `20260826000004_registrar_decisao_grava_a_data_e_o_status.sql:46-84` reescreveu o corpo por `replace()` + `EXECUTE` sobre `pg_get_functiondef`. A base estática é `20260709000012_registrar_decisao_amend.sql` (upsert `ON CONFLICT (candidatura_id) DO UPDATE`, guard `IF v_role NOT IN (...)` fail-open), mais as duas trocas do patch (`status='finalizado'` + `data_decisao_final = now()` no ramo aprovado; `data_decisao_final = now()` no rejeitado).

**Como capturar (recomendação da pesquisa + idioma do BLOCO G de `20260805000007:648-698`):**

1. Ler o vivo, só leitura:
   ```bash
   node p46apply.cjs sql "SET TRANSACTION READ ONLY; select md5(p.prosrc), length(p.prosrc), pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='registrar_decisao'"
   ```
2. Transcrever o corpo para a migration como `CREATE OR REPLACE` **completo** (não outro `replace()` cego — o patch dinâmico é a razão de não haver texto vivo em arquivo; um segundo patch perpetua isso).
3. Anotar no cabeçalho o `md5(prosrc)`/`length` medidos (formato `20260805000007:654-670`) e **abortar** se o vivo divergir:
   ```sql
   DO $verifica_registrar_decisao_pre$
   DECLARE
     v_md5      text;
     v_esperado constant text := '<md5 medido no passo 1>';
   BEGIN
     SELECT md5(p.prosrc) INTO v_md5
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'registrar_decisao';
     IF v_md5 IS DISTINCT FROM v_esperado THEN
       RAISE EXCEPTION '... o CREATE OR REPLACE abaixo APAGARIA a divergencia em silencio ...';
     END IF;
   END
   $verifica_registrar_decisao_pre$;
   ```
4. Mudanças no corpo: `coalesce(v_role,'') NOT IN (...)` (§1); recusa `42501` se `auth.uid()` for o decisor da decisão revertida (D-23 — ler de uma coluna nova em `decisao_final`, p.ex. `decisor_revertido uuid`, gravada em 5a, ou de `decisao_final_historico`); depois do upsert, zerar `explicacao_solicitada_em`, `revisao_*`, `reaberta_em`, `prazo_nova_decisao_em`, `alerta_prazo_enviado_em` (o snapshot AFTER UPDATE lê `OLD`, então arquiva antes). Opcional (RESEARCH §J): recusar decisão sobre knockout via `candidatura_encerrada`.

**5c. `snapshot_decisao_final` + `decisao_final_historico`**

**Analog:** `20260709000011_decisao_final_historico.sql:90-103`:

```sql
CREATE OR REPLACE FUNCTION public.snapshot_decisao_final()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.decisao_final_historico
    (candidatura_id, decisao, justificativa, por_usuario, decidido_em)
  VALUES
    (OLD.candidatura_id, OLD.decisao, OLD.justificativa, OLD.por_usuario, OLD.em);
  RETURN NEW;
END;
$$;
```
Só **acrescentar** colunas (nullable) ao INSERT — não consertar o Defeito 3b.

**5d. Colunas novas** — idioma `20260805000001:211-222` (**sem** `IF NOT EXISTS`, de propósito — `:211-215`) + `COMMENT ON COLUMN` explicativo por coluna (`:224-259`).

**5e. Evento `prazo_reabertura_vencido` (RH) — as CINCO obrigações de RESEARCH §D.1**

(1) CHECK — molde `20260805000007:269-319`: DROP/ADD preservando os **8 vivos** + o novo, e o `DO` que aborta se um vivo sumiu:

```sql
ALTER TABLE public.notificacoes_enviadas
  DROP CONSTRAINT IF EXISTS notificacoes_enviadas_evento_check;

ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT notificacoes_enviadas_evento_check
  CHECK (evento IN ('confirmacao', 'avanco', 'convite', 'decisao',
                    'revisao_solicitada', 'revisao_respondida', 'divulgacao_vagas',
                    'candidatura_encerrada_a_pedido'));
```
Antes do apply, transcrever o `pg_get_constraintdef` vivo no cabeçalho (idioma `20260730000004:58-78`). Se D-22 também criar evento, **um só** DROP/ADD com os dois (ou o segundo arquivo parte do CHECK que o primeiro instalou).

(2) Classe — molde `20260805000007:368-394` (`ON CONFLICT (evento) DO NOTHING`, jamais upsert; classe `interno` para evento de RH):

```sql
INSERT INTO public.classe_evento_notificacao (evento, classe, descricao) VALUES
  ('candidatura_encerrada_a_pedido', 'interno',
   '...')
ON CONFLICT (evento) DO NOTHING;
```

(3) Vocabulário da EF — §8 (`notificar-rh/helpers.ts`).

(4) Exclusão da varredura de retry — molde `20260805000007:648-790`: pré-gate por `md5(prosrc)` do corpo vivo (`:675-698`) e `CREATE OR REPLACE` com **mais uma** cláusula de igualdade:

```sql
     WHERE status IN ('pendente','falhou')
       AND tentativas < 5
       AND evento NOT LIKE 'revisao\_solicitada%'
       AND evento <> 'candidatura_encerrada_a_pedido'
       -- + AND evento <> 'prazo_reabertura_vencido'
```
⚠ Não nomear o papel privilegiado em comentário **dentro** do corpo (`p41_recon_retry_smoke` exige a ausência — `20260805000007:700-705`).

(5) Smokes — §12.

**5f. `varrer_prazos_reabertura()` + cron diário**

**Analog de corpo:** `varrer_retry_notificacoes` (`20260805000007:711-784`) — SECURITY DEFINER, `SET search_path = ''`, Vault + graceful-skip, `FOR r IN SELECT … LIMIT n LOOP … net.http_post … EXCEPTION WHEN OTHERS … END LOOP`. Diferença: grava `alerta_prazo_enviado_em` (idempotência por estado) e posta em `/functions/v1/notificar-rh` com `{evento:'prazo_reabertura_vencido', candidatura_id}` (ids-only, como `20260805000007:593-596`).

**Analog de cron:** `20260823000012_p46_cron.sql:108-115`:

```sql
SELECT cron.unschedule('purga-retencao-sweep')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purga-retencao-sweep');

SELECT cron.schedule(
  'purga-retencao-sweep',
  '0 3 * * *',
  $sweep$ SELECT public.varrer_purga_retencao(); $sweep$
);
```
Mesma entrega: `p42_invent05_cron_smoke.sql` `c_herdados` (`:145-148`) + `docs/compliance/cron-inventory.md` (a própria mensagem de falha de `:192-193` exige os dois no mesmo commit).

---

### 6. Qualquer outra redefinição de função viva (D1, D2, D3, `trg_notif_*`)

Mesma disciplina de §5b, versão leve: antes de escrever o `CREATE OR REPLACE`, ler `pg_get_functiondef` pelo `p46apply.cjs sql "SET TRANSACTION READ ONLY; …"` (padrão P4 de `48-VARREDURA-ETAPA-ATUAL.md:27-37`) e diffar contra o arquivo usado como base. Quando a função roda em cron ou toca muitas linhas, pinar o `md5(prosrc)` como no BLOCO G.

---

### 7. `…_p48_local_ou_link_valida.sql` (JORN-D5)

**Analog:** `20260906000004_reagendamento_notifica_e_reseta_comparecimento.sql:90-108`

```sql
CREATE OR REPLACE FUNCTION public.agendamento_reagendado_reset_comparecimento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.compareceu IS NOT DISTINCT FROM OLD.compareceu THEN
    NEW.compareceu := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_agendamento_reagendado_reset ON public.agendamentos_entrevista;
CREATE TRIGGER trg_agendamento_reagendado_reset
  BEFORE UPDATE OF data_hora ON public.agendamentos_entrevista
  FOR EACH ROW
  WHEN (OLD.data_hora IS DISTINCT FROM NEW.data_hora)
  EXECUTE FUNCTION public.agendamento_reagendado_reset_comparecimento();
```

Adaptação: dois triggers (ou um com `TG_OP`) — `BEFORE INSERT` sempre valida; `BEFORE UPDATE OF local_ou_link, tipo … WHEN ((OLD.local_ou_link, OLD.tipo) IS DISTINCT FROM (NEW.local_ou_link, NEW.tipo))` (tupla, idioma de `:77-84`). Regra: não vazio nos dois tipos; `~* '^https?://'` + host só em `tipo='online'`. Erro: `RAISE EXCEPTION … USING ERRCODE = 'check_violation'` (idioma `20260709000010:67-70`). ⚠ **Nunca** `CHECK … NOT VALID` (reavalia em qualquer UPDATE → cancelar a linha legada `dddd` quebraria — RESEARCH §H). Ordem alfabética de BEFORE triggers importa (`20260709000010:40-43`): conferir com `agendamento_normaliza_vaga_id` (`trg_agendamento_normaliza_vaga`) e `trg_agendamento_reagendado_reset`.

---

### 8. `…_p48_cognitivo_liberado_notifica.sql` (D-22)

**Analog ponta a ponta:** `20260730000004_p42_evento_revisao_respondida.sql` (evento **de candidato**, que continua elegível ao retry — COMMENT `:288-290`)

- Ordem obrigatória (`:12-33`): EF com o evento no vocabulário → CHECK → trigger.
- CHECK + `DO` de verificação: `:113-153` (atualizar para a lista viva de 8/9).
- Classe: `transacional` (`20260805000007:357-363` explica por que não `marketing`).
- Trigger: molde `trg_notif_revisao_respondida` (`:202-247`) com guard de transição no corpo (`:217-219`); em `cognitivo_liberacao` o gatilho é `AFTER INSERT OR UPDATE OF liberado_em` (re-liberação recarimba `liberado_em` — `20260826000008:72-79`), e o body leva um discriminador `'versao', extract(epoch from NEW.liberado_em)` para a re-liberação não ser engolida (mesma lógica do reagendamento).
- Nota útil: `liberar_cognitivo` **já** usa o predicado certo por `status` (`20260826000008:64-68`) — não precisa de guard de knockout no trigger.

---

### 9. `supabase/functions/notificar-candidato/helpers.ts` + `index.ts` (JORN-18, L1, e-mail do JORN-19, D-22)

**`montarDedupeKey`** (`helpers.ts:77-94`) — o ramo `convite`+`versao` é o molde; `decisao` ganha o mesmo tratamento:

```ts
export function montarDedupeKey(
  e: EventoLedger,
  candidaturaId: string,
  agendamentoId?: string,
  versao?: string,
): string {
  if (e === "convite") {
    ...
    return versao ? `${agendamentoId}:convite:${versao}` : `${agendamentoId}:convite`;
  }
  return `${candidaturaId}:${e}`;
}
```
Recomendado: `decisao` + `historico_id` ⇒ `${candidaturaId}:decisao:${historicoId}`; `revisao_respondida` + ciclo ⇒ `${candidaturaId}:revisao_respondida:${ciclo}`; sem discriminador ⇒ chave legada (tolerância, Pitfall 7). Reescrever o docblock de `:64-76` (a premissa «no máximo UMA revisão» cai com D-01).

**Parse do campo novo** — molde de `reagendamento` (`index.ts:139-148`), com validação de **forma** uuid (RESEARCH §J V5; regex idêntica a `executar-direito-titular/index.ts:269`):

```ts
    if (raw.reagendamento !== undefined && typeof raw.reagendamento !== "boolean") {
      return errorResponse("VALIDATION", "reagendamento inválido.");
    }
    body = {
      evento: raw.evento as EventoLedger,
      candidatura_id: raw.candidatura_id,
      agendamento_id: raw.agendamento_id ?? undefined,
      reagendamento: raw.reagendamento === true,
      retry_id: typeof raw.retry_id === "string" && raw.retry_id ? raw.retry_id : undefined,
    };
```
+ campo em `CorpoRequisicao` (`:66-81`) com docblock.

⚠ **Retry**: `varrer_retry_notificacoes` reenvia só `{retry_id, evento, candidatura_id, agendamento_id}` (`20260805000007:768-777`). No branch retry (`index.ts:165-183`) o `historico_id` não vem — derivar da `dedupe_key` da linha (já selecionada em `:168`) ou acrescentar o campo ao body da varredura. Decidir junto com L1.

**L1 — desfecho pelo histórico** (hoje `index.ts:366-369`):

```ts
    desfecho: candidatura.etapa_atual === "aprovado" ? "aprovado" : "rejeitado",
```
Com `historico_id`, ler `historico_candidatura.etapa_para` (allowlist de 1 coluna, `maybeSingle`) — molde da leitura guardada por evento em `:256-265`:

```ts
  let vereditoRevisao: "mantida" | "revertida" | undefined;
  if (evento === "revisao_respondida") {
    const { data: decisao } = await supabaseAdmin
      .from("decisao_final")
      .select("revisao_veredito")
      .eq("candidatura_id", candidatura_id)
      .maybeSingle();
    const v = decisao?.revisao_veredito;
    vereditoRevisao = v === "mantida" || v === "revertida" ? v : undefined;
  }
```
A mesma leitura passa a trazer `prazo_nova_decisao_em` (para a data exata do e-mail de reabertura, formatada em `America/Sao_Paulo` como `dataHoraFmt` em `:351-357`).

**Log** — só pela allowlist `logSeguro` (`helpers.ts:142-160`); se quiser logar `historico_id`, acrescentar a chave ali.

---

### 10. `supabase/functions/_shared/email-config.ts` + `email-templates.ts` (JORN-15, JORN-U2, e-mail de JORN-19, D-22)

**Base URL a mover** — de `notificar-rh/helpers.ts:37` e `:180-189`:

```ts
export const APP_BASE_URL_PADRAO = "https://rh.beautysmile.com.br" as const;

export function montarUrlFila(baseBruta: string = APP_BASE_URL_PADRAO): string {
  let base = APP_BASE_URL_PADRAO as string;
  try {
    const u = new URL(baseBruta.trim());
    if (u.protocol === "https:") base = u.origin;
  } catch {
    // base malformada — mantém o default (nunca lança: o e-mail vale mais que o link)
  }
  return `${base.replace(/\/+$/, "")}/rh/revisoes`;
}
```
Criar `montarUrlLogin(baseBruta?, redirect?)` com o mesmo fail-safe; destino `/auth/login` (+ `?redirect=/candidato/privacidade` para JORN-27 — o login já sanitiza com `src/features/auth/utils/resolveRedirect.ts`). `notificar-rh/helpers.ts` passa a **re-exportar/importar** de `_shared` (não duplicar). ⚠ `email-config.ts` tem contrato «ZERO IMPORTS» (`:12-17`) — a função nova não pode importar nada.

**`EventoNotificacao`** (`email-config.ts:53-58`) — se D-22 criar evento, acrescentar aqui; o docblock `:42-52` lembra que cada valor obriga entrada em `SUBJECTS`, `CORPOS` e `PREHEADERS` (compilador força, `Record<EventoNotificacao,…>`).

**Link U2 — por parâmetro opcional, NÃO no rodapé comum** (`layoutBase` `email-templates.ts:113-140` também monta e-mails do RH — `notificar-rh/helpers.ts:239,277` — e o recibo pós-exclusão — `executar-direito-titular/helpers.ts:391`). Molde de campo opcional com caminho honesto para ausência: `DadosEmail.reagendada` / `vereditoRevisao` (`:90-109`). Botão: copiar o HTML de `notificar-rh/helpers.ts:244-245`:

```ts
<p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;padding:12px 24px;background:#00A9A5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Abrir a fila de revisões</a></p>
<p style="margin:0;font-size:14px;color:#6b7280;">Se o botão não funcionar, acesse: ${url}</p>
```
(sempre `escapeHtml(url)`, `:74-81`.)

**Cópia de confirmação** — linha única viva `email-templates.ts:150`:
```ts
<p style="margin:0 0 16px;">A partir de agora, você poderá acompanhar o andamento pelo painel do candidato. Avisaremos por e-mail a cada etapa.</p>
```
Frase canônica do front: `'Acompanhe o andamento pelo seu painel'` (guard `src/__tests__/guards/wait-state-copy.grep.test.ts:11`) + a promessa condicional de D-09. Publicar **por último** (Wave 4).

**Cópia revertida** — `email-templates.ts:219-237`:
```ts
const COPY_REVISAO_MANTIDA = "Após a revisão, a decisão foi mantida.";
const COPY_REVISAO_REVERTIDA = "Após a revisão, a decisão anterior foi revista.";
```
Novo texto de D-01 com a data (campo novo `prazoNovaDecisaoFmt?` em `DadosEmail`, ausente ⇒ frase sem data, nunca data inventada). O docblock `:205-217` («NÃO promete próximos passos… a RPC NÃO reabre o funil») fica falso e tem de ser reescrito. `SUBJECTS`/`PREHEADERS` de `revisao_respondida` **não ramificam** por veredito — decisão pinada por T-42-V2c (`:286-302`); manter.

**D-07:** nenhum e-mail novo cita o canal de privacidade por literal (zero ocorrências hoje em `supabase/functions/`). O rodapé já diz «responda a este e-mail» e `REPLY_TO` é `rh@` (`email-config.ts:36`).

---

### 11. `supabase/functions/notificar-rh/*` (evento `prazo_reabertura_vencido`; chave do ciclo)

**Analog:** o bloco P45-09 do próprio `helpers.ts:84-142` — é exatamente «acrescentar o 2º evento» e agora é o 3º:

```ts
export const LABEL_SINK_RH_ENCERRAMENTO = "candidatura_encerrada_rh" as const;   // só [a-z_]
export const EVENTO_LEDGER_RH_ENCERRAMENTO = "candidatura_encerrada_a_pedido" as const;
export const TEMPLATE_LEDGER_RH_ENCERRAMENTO = "candidatura_encerrada_a_pedido_rh" as const;

export const EVENTOS_RH_VALIDOS = [
  EVENTO_LEDGER_RH,
  EVENTO_LEDGER_RH_ENCERRAMENTO,
] as const;

export function montarDedupeKeyRhEncerramento(candidaturaId: string, userId: string): string {
  return `${candidaturaId}:${EVENTO_LEDGER_RH_ENCERRAMENTO}:${userId}`;
}
```
Chave **por destinatário** (`:124-136` explica: sem o `user_id`, 4 de 5 RH não recebem). Assunto com neutralização CR/LF (`:168-171`); corpo sem identificador do candidato (`:249-285`); destino = fila/hub (URL por `montarUrl*` com fail-safe).

**`index.ts`** — ramificar **só** no bloco de montagem (`:240-269`); o laço claim-before-send (`:282-336`) fica inalterado, lendo variáveis (comentário `:241-245`). Com 3 eventos, trocar o ternário `ehEncerramento ? … : …` por um mapa `Record<EventoRh, {label, template, assunto, corpo, dedupe}>` para não aninhar ternários. `revisao_solicitada` com ciclo: `montarDedupeKeyRh(candidaturaId, userId)` (`:60-62`) ganha o discriminador vindo do body (parse `:164-178`).

---

### 12. `supabase/functions/analise-candidato-individual/index.ts` (JORN-24 parte a)

**Analog:** survivor-guard `notificar-candidato/index.ts:195-211`:

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

**Onde:** **antes** da marca `pendente` (`analise-candidato-individual/index.ts:257-267`) e antes de qualquer `callAi`. Hoje a candidatura só é lida em `:271-275`, depois da marca — a leitura (allowlist, nunca `*`, `:269-270`) tem de subir. Predicado da pesquisa: `status === 'rejeitado' && opcao_knockout_id !== null` (acrescentar `opcao_knockout_id` à allowlist de colunas). Resposta `200 {ok:true, skipped:"knockout"}`, sem linha criada.

**Teste** — `__tests__/index.test.ts`: `makeMockSupabase({ candidaturaRow: {..., status:'rejeitado', opcao_knockout_id:'opt-1'} })` (`:74-126`) e `makeMockAnthropic` (`:35-49`, expõe `calls`). Asserções: `supabaseAdmin.upserts.length === 0` e `anthropic.calls.length === 0`, status 200, `skipped === 'knockout'`. Molde de asserção: `notificar-candidato.test.ts:476-493` (CR-02).

---

### 13. `supabase/functions/executar-direito-titular/*` (JORN-27)

**Analog:** `enviarRecibo` (`index.ts:1343-1420`) + helpers do recibo (`helpers.ts:301-418`) + idempotência por coluna de estado (`index.ts:1075-1103`)

```ts
    if (!estado.recibo_enviado_em) {
      passoCorrente = "recibo";
      await enviarRecibo(deps, { pedidoId, plano, dataConclusao: ... });
      await carimbar("recibo", { recibo_enviado_em: agora(), plano: {...} });
    }
```
Núcleo de envio a copiar (`index.ts:1368-1419`): `deps.modo ?? resolverModo()` → `resolverDestinatarioComLabel(para, LABEL_SINK_…, modo)` → `exigirSinkTeste` → corpo → `supabaseAdmin.rpc("ler_resend_api_key")` → `(deps.fetchImpl ?? fetch)("https://api.resend.com/emails", { … "Idempotency-Key": chave… })`. **Não** passa por `notificacoes_enviadas` (`:1352-1356`).

**Diferenças obrigatórias para o aviso:**
- ponto de chamada: logo após `primeiraLinha(data)` com sucesso em `pedir` (`index.ts:559-566`) e em `cancelar` (`:662-666`) — **depois** do fail-closed de «sem linha»;
- falha de envio **não** desfaz nem muda a resposta ao titular (o pedido já está registrado) — diferente do recibo, que lança `ErroDePasso`; aqui: log por código (`logErro(acao, "aviso_<causa>", candidatoId)`, idioma de `:564`) e coluna fica NULL;
- carimbo: `aviso_pedido_enviado_em` / `aviso_cancelamento_enviado_em` (**nunca** `recibo_enviado_em` — suprimiria o recibo final, `:1076`); `if (!linha.aviso_…)` antes de enviar;
- destinatário: `emailTitular` já resolvido no handler (usado em `:583`);
- conteúdo (helpers novos no molde de `assuntoReciboExclusao` `:306-308` e `corpoReciboExclusao` `:343-392`): data de execução em `dataBR` (`:285-299`), link `montarUrlLogin(…, '/candidato/privacidade')`; **assinatura sem `solicitacao_id`** (Invariante 12, `:568-570`); `chaveIdempotencia…` no molde `:416-418` (nunca logada);
- `Deps` (`:230-249`) já tem `fetchImpl?` e `modo?` — nada novo.

**Teste** — `index.test.ts`: helpers `makeMockSupabaseAdmin` (`:102`), `makeMockTitular` (`:185`), `makeFetchMock` (`:883`); casos-molde `(e)` pedir (`:318`), `(g)` cancelar (`:368`), `(jj)` carimbo impede reenvio (`:1570`), `(kk)` nada em `notificacoes_enviadas` (`:1585`), `(pp)` falha não carimba (`:1829`).

---

### 14. `gerar-devolutiva-bigfive` + `submit-bigfive-final` (JORN-06 / D-13)

**Etapa 1 — instrumentação (deploy aditivo com `node efdeploy.cjs gerar-devolutiva-bigfive`):** inserir o bloco `diag-auth` de RESEARCH §G (só formato/comprimento/presença, **nunca** o valor) no `Deno.serve`, **antes** de `guardDevolutivaBearer(req, SERVICE_KEY)` (`gerar-devolutiva-bigfive/index.ts:661-662`). A guarda em si (`:612-628`) não muda.

**`submit-bigfive-final` — trocar o `catch` mudo** (`index.ts:241-258`):

```ts
    let devolutivaId: string | null = null;
    try {
      if (typeof supabaseAdmin.functions?.invoke === "function") {
        const invokePromise = supabaseAdmin.functions.invoke("gerar-devolutiva-bigfive", {
          body: { candidatura_id: candidaturaId, score_id: scoreId },
        });
        ...
        const { data: devRes } = (await Promise.race([invokePromise, timeout])) as {
          data: { devolutiva_id?: string } | null;
        };
        devolutivaId = devRes?.devolutiva_id ?? null;
      }
    } catch {
      // best-effort — a devolutiva pode ser (re)gerada pelo pipeline assíncrono.
      devolutivaId = null;
    }
```
Passa a desestruturar `error` e logar `error?.name`, `error?.context?.status` no log redigido já existente (`:261-268`, só ids/counts/status). Contrato com o candidato (`{ ok: true }`, `:271`) **inalterado**.

**Etapa 2 — conserto derivado (só depois da prova):** se H1 confirmar, `functions.invoke(nome, { body, headers: { Authorization: \`Bearer ${serviceKey}\` } })`; `serviceKey` entra em `SubmitBigfiveFinalDeps` (`:74-79`) e é passado no wiring (`:320-324`) — molde de `NotificarDeps.serviceKey` (`notificar-candidato/index.ts:87-94`). ⚠ Teste deno cobre `handler`, **não** o `Deno.serve` (onde mora o `invoke` real e onde morou o Defeito 5 — comentário `:296-312`).

---

### 15. `src/lib/candidatura/candidaturaEncerrada.ts` (novo) e `src/lib/url/isSafeHttpUrl.ts` (novo)

**Analog de forma:** `src/lib/datetime/formatDataHoraSP.ts` (util compartilhado, docblock com `@module` e `@see` da origem da extração, teste em `src/lib/datetime/__tests__/`).

**Regra a espelhar** — `DashboardCandidatoPage.tsx:65-67` e `:459-464`:

```ts
  const STATUS_TERMINAIS: ReadonlySet<string> = new Set(['rejeitado', 'finalizado']);
  const candidaturaEncerrada = (status: string | null | undefined): boolean =>
    !!status && STATUS_TERMINAIS.has(status);
  ...
  emAndamento={
    etapa !== 'aprovado' &&
    etapa !== 'rejeitado' &&
    candidatura.status !== 'rejeitado' &&
    candidatura.status !== 'finalizado'
  }
```
O helper TS recebe `(etapa, status)` e espelha o SQL de §2 (etapa terminal **ou** status terminal, null-safe). O dashboard passa a importá-lo (opcional — não mudar a condição do cartão, D-12).

**`isSafeHttpUrl`** — mover verbatim de `AgendamentoCandidatoCard.tsx:62-76` e exportar nomeado:

```ts
function isSafeHttpUrl(u: string): boolean {
  try {
    const { protocol } = new URL(u.trim())
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
```
O card importa de `@/lib/url/isSafeHttpUrl` (uso em `:210` permanece).

---

### 16. `src/features/agendamento/schemas/agendamentoSchema.ts` (JORN-D5)

**Analog:** ele mesmo, `:18-44` — `MSG` como fonte única de mensagens pt-BR e `.refine` com mensagem:

```ts
const MSG = {
  tipo: 'Selecione a modalidade da entrevista.',
  dataRequired: 'Informe a data e o horário da entrevista.',
  dataFuture: 'A data e o horário da entrevista devem ser no futuro.',
} as const
...
  local_ou_link: z.string().optional(),
```
Regra cruzada (online ⇒ URL http(s); presencial ⇒ texto não vazio) exige `.superRefine` no `z.object` com `ctx.addIssue({ path: ['local_ou_link'], … })` — precedentes de `superRefine`/`refine` no repo: `src/features/cadastro/schemas/candidatoSchema.ts`, `src/features/auth/schemas/redefinirSenhaSchema.ts`. O form já normaliza vazio → `null` (`AgendamentoBlock.tsx:232`); o schema tem de recusar antes. Escrita é PostgREST direto (`agendamentoService.ts:174`, `:195`) — sem RPC no meio, por isso o trigger de §7 é a camada servidor.

---

### 17. `explicacaoService.ts` + `ExplicacaoCandidatoPage.tsx` (JORN-22 / D-20)

**Analog:** o ramo automático inteiro.

Serviço — `origem` (`explicacaoService.ts:146`) ganha `'humana_triagem'`; o fallback (`:267`) passa a chamar a RPC tri-estado; molde `getExplicacaoAutomatica` (`:319-344`):

```ts
  const { data, error } = await supabase.rpc('explicacao_rejeicao_automatica', {
    p_candidatura_id: candidaturaId,
  })
  if (error || data !== true) return null

  return {
    origem: 'automatica',
    decisao: 'rejeitado',
    reason: REASON_KNOCKOUT,
    revisao_solicitada_em: null,
    ...
  }
```
Razão neutra própria no molde de `REASON_KNOCKOUT` (`:227-232`) — «analisada por uma pessoa da nossa equipe», sem motivo nem critério; comparação estrita (`=== 'humana_triagem'`, não truthy — idioma `:328-330`). Enquanto `database.types.ts` não for regenerado, a chamada nova precisa de cast; regenerar no mesmo plano.

Página — `ExplicacaoCandidatoPage.tsx:181`, `:192-194`, `:236-262`: hoje binário `automatica ? … : …`. Com três origens, a linha de resultado e o bloco sem-revisão ramificam por `origem`; `'humana_triagem'` usa o bloco **sem revisão + canal** (`:237-250`), com `resultLine` próprio (não o `resultLineAutomatica`, que afirma «sem avaliação de uma pessoa» — `:50-51`) e `semRevisaoBody` próprio (o atual `:61-62` também diz «não envolveu avaliação de uma pessoa»). Canal por `CANAL_PRIVACIDADE_EMAIL` importado (`:35`) — a mesma fonte, D-07 intacto.

JORN-19 na página: `COPY_REVISAO.veredito.revertida` (`:94`) passa a dizer a mesma coisa que o e-mail (regra 42-UI-SPEC). Testes que pinam o texto antigo: `ExplicacaoCandidatoPage.test.tsx:60,165`.

---

### 18. `HubCandidatoRH.tsx` (JORN-26 C1/C1b)

**Analog:** o gating que já existe para Retroceder (`HubCandidatoRH.tsx:140-144` e `:246-265`):

```ts
  const podeRetroceder = etapaAtual ? FUNNEL_ORDER.indexOf(etapaAtual) > 0 : false
  ...
                    {podeRetroceder ? (
                    <RetrocederCandidaturaDialog ... />
                    ) : null}
```
Aplicar a Avançar (`:137-138`, `:236-246`) e Rejeitar (`:268-281`): `const encerrada = candidaturaEncerrada(etapaAtual, status)` e `proximaEtapa`/Rejeitar só se `!encerrada`. ⚠ O contexto (`useEntrevistaContexto`, allowlist em `entrevistaService.ts:234`: `'id, vaga_id, etapa_atual, candidatos ( nome_completo ), vagas (...)'`) **não traz `status`** — acrescentar `status` à allowlist e ao tipo (`:181`, `:251`, `:276`). Posicionais (timeline, CTA de workspace) ficam como estão (varredura §4 (ii)).

---

### 19. `ResponderRevisaoDialog.tsx`, `responderRevisaoSchema.ts`, `RegistrarDecisaoForm.tsx`, `decisaoService.ts` (JORN-19 / D-23)

Cópias a trocar (constantes, sem lógica):
- `responderRevisaoSchema.ts:68-72` — `{ value: 'revertida', label: 'Reverter a decisão', ajuda: 'A decisão original deixa de valer.' }`
- `ResponderRevisaoDialog.tsx:141-147` — `revertida: { titulo: 'Reverter a decisão?', forte: 'A decisão original deixará de valer.', … }`
→ dizer que a candidatura volta a «Decisão final» com prazo de 10 dias e que quem decidiu antes não decide de novo.

D-23 no cliente — `decisaoService.registrarDecisao` (`:150-164`) hoje embrulha todo erro como `DATABASE_ERROR`. Molde de mapeamento por SQLSTATE: `explicacaoService.solicitarRevisao` (`:415-427`) e `revisaoRedacaoService.ts:257-271` (`42501 → FORBIDDEN`). `RegistrarDecisaoForm.tsx:94-99` («Registrar novamente cria uma nova linha auditável…») precisa de mensagem para a recusa D-23.

---

### 20. `DashboardCandidatoPage.tsx` — prazo da reabertura (JORN-19 passo 8)

**Analog:** o próprio ramo de `PrazoEstimadoLinha` (`:360-375`):

```tsx
<PrazoEstimadoLinha
  rotulo={
    candidaturaEncerrada(candidatura.status)
      ? null
      : rotuloDeEspera(
          candidatura.etapa_atual
            ? slaLookup.get(candidatura.etapa_atual)
            : undefined,
        )
  }
```
Acrescentar ramo de reabertura (esconder o SLA «3 dias úteis» ou mostrar a data do prazo). O componente (`features/timeline/components/PrazoEstimadoLinha.tsx:16-22`) só recebe `rotulo` — a decisão fica no chamador. A fonte do prazo precisa estar legível ao candidato (coluna em `decisao_final` já lida por allowlist no `explicacaoService`, ou em `candidaturas` — decisão do planejador, RESEARCH §E.3 passo 5).

---

## Shared Patterns

### A. Dispatch trigger → Edge Function (at-most-once)
**Source:** `20260730000004:175-247` / `20260805000007:536-604`
**Apply to:** toda função de trigger nova ou redefinida (§4, §5f, §8)
```sql
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object('evento', '...', 'candidatura_id', NEW.candidatura_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '...: dispatch falhou (%: %) — ... intacto', SQLSTATE, SQLERRM;
  END;
```
Invariantes: Bearer = `edge_invoke_key` (nunca a chave de serviço); body ids-only; WARNING sem PII; guard de transição NULL→NOT NULL no corpo **e** na cláusula `WHEN` (`20260805000007:620-632`).

### B. Evento novo = cinco registros na MESMA entrega
**Source:** RESEARCH §D.1 · `20260805000007` cabeçalho `:115-139`
**Apply to:** `prazo_reabertura_vencido` (RH) e o evento de D-22 (candidato)
1. CHECK `notificacoes_enviadas_evento_check` (nome load-bearing; preservar todos os vivos; `DO` que aborta).
2. `classe_evento_notificacao` (`ON CONFLICT DO NOTHING`; trigger fail-closed P0003).
3. Vocabulário da EF: `EVENTO_MAP` (`notificar-candidato/helpers.ts:32-41`; `EVENTOS_VALIDOS` é derivado) **ou** `EVENTOS_RH_VALIDOS` (`notificar-rh/helpers.ts:111-114`); paridade pinada por `vocabulario-eventos.test.ts`.
4. Evento de RH ⇒ exclusão em `varrer_retry_notificacoes` (pré-gate md5).
5. Smokes com lista literal (§E abaixo).
Ordem: EF deployada → CHECK+classe → trigger.

### C. Handler Deno testável com deps injetadas
**Source:** `notificar-candidato/index.ts:87-100` + `:459-481`
**Apply to:** toda EF tocada
```ts
export interface NotificarDeps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  fetchImpl: typeof fetch;
  serviceKey: string;
}
export async function handler(req: Request, deps: NotificarDeps): Promise<Response> { ... }

if (import.meta.main) {
  Deno.serve(async (req: Request) => { ... return await handler(req, { ... }); });
}
```
Teste: `loadHandler()` por `import("../index.ts")` + `makeRequest(body, bearer)` (`notificar-candidato.test.ts:168-191`); stub que **explode se tocado** para provar que um caminho não encosta em rede/banco (`:148-166`). Rodar: `deno test --allow-all supabase/functions/<ef>/`. Deploy: `node efdeploy.cjs <slug>` (`--verify-jwt` só onde já é assim).

### D. Log redigido por allowlist de chaves
**Source:** `notificar-candidato/helpers.ts:142-160` (candidato) · `notificar-rh/helpers.ts:307-341` (`refCurta`, sem `dedupe_key`) · `executar-direito-titular/helpers.ts:35-84` (`logSeguroExclusao`, `causaDaFalha`)
**Apply to:** todo log novo (skip de knockout, falha de aviso ao titular, diag-auth, falha da devolutiva). Nunca e-mail, nome, HTML, segredo, `solicitacao_id` completo.

### E. Smoke SQL: baseline capturada na execução, nunca constante
**Source:** `supabase/tests/p43_matriz_retencao_smoke.sql:95-163` (fixture + impressão digital) e `:668-683` (comparação), resumo `(z)` no fim do arquivo
```sql
  SELECT md5(coalesce(string_agg(t.linha, E'\n' ORDER BY t.linha), ''))
    INTO v_matriz_fp
    FROM (SELECT to_jsonb(c)::text AS linha FROM public.config_retencao_etapa c) t;
  PERFORM set_config('smoke43m.matriz_fp',  v_matriz_fp, false);
  ...
  IF v_matriz_agora IS DISTINCT FROM v_matriz_antes THEN
    RAISE EXCEPTION 'P43M FAIL (j): a matriz MUDOU durante o smoke ...';
  END IF;
  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
```
**Vocabulário derivado do catálogo, não de lista literal** — `p43_guard_marketing_smoke.sql:404-441` (asserção (e)) extrai os eventos do `pg_get_constraintdef` vivo com `regexp_matches(v_def, '''([a-z_]+)''::text', 'g')`. É o molde para converter `p42_notif_revisao_smoke.sql:181` (`v_aceitos <> 6` sobre lista literal) e `p43_guard_marketing_smoke.sql:344` / `:738` (`count(classe) <> 7`, já vermelho): iterar sobre os valores extraídos do CHECK vivo; comparar contagem de classes com a baseline capturada na fixture do próprio smoke.
**Apply to:** os três smokes novos e os convertidos. Cada função com guard precisa de **duas** asserções — a recusa e o caminho feliz (`p43_matriz_retencao_smoke.sql:70-76`). E provar que o portão convertido **ainda morde** (CLAUDE.md §Portões). Rodar: `node p46apply.cjs run supabase/tests/<arquivo>.sql` (é escrita em PROD — fixture/rollback).

Fixture do `p45_motor_exclusao_smoke.sql` (`:853-864`): hoje `VALUES (v_cand, v_vaga, 'triagem', 'rejeitado', …)` — refazer como INSERT `status='rejeitado'` (desarma os AFTER INSERT) + `UPDATE … SET status='em_analise'` (varredura §6).

### F. Front: service com classe de erro + RPC tipada + outcome neutro
**Source:** `explicacaoService.ts:53-67` (`ExplicacaoServiceError`), `:355-379` e `:403-434` (mapa SQLSTATE → `'ok'|'denied'|'unavailable'`)
**Apply to:** `explicacaoService` (tri-estado), `decisaoService` (D-23), `triagemService.rejeitarCandidatura` (`:499-511`) se quiser mensagem própria para «já encerrada».

### G. Compliance quando nasce coluna em tabela inventariada
**Source:** `docs/compliance/export-scope-rules.yaml:487-505` (formato de veredito com razão numerada) e `:30-35` (`meta.versao: "1.1.0"`); `pii-inventory.yaml:120-165` (`{ classificacao, tipo, nota }`)
**Apply to:** `analise_candidato_vaga.descartada_*`, `solicitacoes_dados.aviso_*`, colunas novas de `decisao_final`/`decisao_final_historico`.
```yaml
  analise_candidato_vaga.status:
    export: true
    razao: "(ii) Estado de processo da análise. ..."
```
Depois: `node docs/compliance/sql/gen-export-allowlist.cjs` (regenera `export-allowlist.json` e `supabase/functions/_shared/exportAllowlist.ts`), subir `versao`, `npm run check:export-allowlist`, `check:recibo-exclusao`, `check:pii-inventory-md`; drift real só aparece em `docs/compliance/sql/05-export-allowlist-drift.sql` rodado contra PROD (hoje já acusa 9 colunas — RESEARCH §F).

### H. Deploy e prova de publicação
**Source:** CLAUDE.md §«Via de apply ATUAL» · D-16
**Apply to:** todo plano com efeito visível
- migration: `node p46apply.cjs migrate <arquivo>`; EF: `node efdeploy.cjs <slug>`; front: push `main`.
- `git log --oneline origin/main..HEAD` vazio depois de cada apply visível.
- marcador no chunk certo: `grep -rl "<marcador>" build/assets/` (rotas `/rh/*`, `/admin/*` são lazy).
- `npm run lint` ≤ 90 erros em todo plano que toca TS.
- regen de tipos: `SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w) npx supabase gen types typescript --project-id isljnozzlvckrgjjbjwp < /dev/null > database.types.ts` (o `< /dev/null` é load-bearing).

---

## No Analog Found

| Arquivo | Role | Data Flow | Motivo |
|---|---|---|---|
| RPC tri-estado de explicação (retorno `text` com 3 valores) | migration | request-response | Nenhuma RPC do repo devolve um discriminador enumerado ao candidato; o analog (`20260906000007`) é boolean. A forma (own-row, `NULL` anti-oráculo) copia-se inteira; o tipo de retorno é novo. |
| Ciclo de revisão reaberto (colunas `reaberta_em`/`prazo_nova_decisao_em`/`decisor_revertido` + zerar ciclo na redecisão) | migration | CRUD | Nenhum fluxo existente reabre uma decisão; os pedaços (UPDATE no mesmo statement, snapshot por `OLD`, guard `v_uid = por_usuario`) têm molde, o desenho não. Seguir RESEARCH §E.3 Desenho A. |

## Metadata

**Analog search scope:** `supabase/migrations/` (≈40 mais recentes + os de origem de cada objeto vivo), `supabase/functions/{notificar-candidato,notificar-rh,_shared,analise-candidato-individual,executar-direito-titular,submit-bigfive-final,gerar-devolutiva-bigfive}`, `supabase/tests/`, `src/features/{explicacao,agendamento,hub-candidato,revisao,decisao,entrevista,triagem,vagas}`, `src/components/pages/`, `src/lib/`, `docs/compliance/`
**Files scanned:** ≈60
**Pattern extraction date:** 2026-09-21
