-- =============================================================================
-- 20260930000001 — cron `ai-cost-aggregation`: a linha-evento do SINAL de revisão
--                  sai da contagem de chamadas e de erros de `ai_cost_daily`
-- =============================================================================
-- Phase 49 / Plano 49-38 · JORN-41 · D-22 (sem BEGIN/COMMIT) · D-50 (varredura
-- pela forma) · D-55 (migration ANTES das EFs).
--
-- APLICAR COM (pelo 49-43, depois da re-revisão — NÃO por este plano):
--   node p46apply.cjs migrate supabase/migrations/20260930000001_p49_38_agregacao_sem_evento_de_sinal.sql
-- D-55: esta migration vai ao ar ANTES do deploy das EFs que passam a gravar a
-- linha-evento do sinal. Na ordem inversa, as linhas do sinal gravadas entre o
-- deploy e o apply seriam contadas como erro no agregado da madrugada seguinte.
-- Depois do apply, o 49-43 registra esta migration como a NOVA DONA do comando do
-- job em `docs/compliance/cron-inventory.md`, com o `md5(command)` LIDO de
-- `cron.job` depois do apply (medido, nunca calculado à mão).
--
-- O QUE ESTAVA ERRADO. A partir do 49-38, uma entrada de nível `flag` do detector
-- de injeção (o imperativo nu, sem nomear prompt/modelo/IA) faz o `callAi` gravar
-- DUAS linhas em `public.ai_call_logs`: a linha-evento do sinal (`provider='none'`,
-- `success=false`, custo 0, `error_code='prompt_injection_flagged'`) e o resultado
-- do modelo. O comando deste job agrega o dia anterior com
--     call_count  = COUNT(*)
--     error_count = SUM(CASE WHEN success = false THEN 1 ELSE 0 END)
-- agrupado por (data, vaga, call_type, provider). Sem esta migration, cada sinal
-- vira UMA CHAMADA e UM ERRO no grupo `provider='none'` daquele dia, e a cadeia
-- de efeito é:
--   cron `ai-cost-aggregation` (01:30)
--     → `ai_cost_daily.call_count` / `error_count` do grupo `none`
--     → gatilho `trg_ai_cost_daily_anomaly` → `notify_cost_anomaly()`, que dispara
--       o alerta `error_rate` quando `error_count / call_count > 0.05` — um grupo
--       só de sinais tem taxa de 100% — e chama a EF `cost-alerter`, que avisa o RH
--       de um problema de IA que não existe;
--     → as colunas «Chamadas» e «Erros» do `AiCostsPage` (/admin/ai-costs), que
--       leem `ai_cost_daily` e mostrariam uma falha de IA que não houve.
-- O sinal não é chamada de modelo nem erro: é um evento de auditoria.
--
-- POR QUE NÃO `success=true` NA LINHA-EVENTO. `success` significa «o resultado é
-- utilizável» (RESEARCH §E.2 item 4), e `success=true` com `error_code` já quer
-- dizer FALLBACK para a tela do admin e para o serviço (D-27c, `aiLogsService.ts`,
-- `estadoDaChamada`). Um evento que não é chamada nem resultado ficaria com cara
-- de resultado de contingência. O conserto fica no ÚNICO consumidor que conta a
-- linha como falha — este job (varredura D-50 no 49-38-SUMMARY).
--
-- O CONSERTO. O comando passa a ser o de `20260609000003` com UMA linha a mais
-- no WHERE:
--     AND error_code IS DISTINCT FROM 'prompt_injection_flagged'
-- `IS DISTINCT FROM`, e não `<>`: o sucesso de modelo tem `error_code` NULO, e
-- `NULL <> 'x'` é NULL — o `<>` tiraria da agregação todas as chamadas bem-
-- sucedidas. A comparação com o código literal é ESCOPO deliberado (a classe de
-- evento que não é chamada de modelo), não fotografia (CLAUDE.md §«Portões»).
--
-- ⚠ ESCOPO NEGATIVO — registrado, NÃO consertado aqui. Os eventos de BLOQUEIO do
--   JORN-39 (`provider='none'`, `success=false`: `cost_cap_exceeded` e
--   `prompt_injection_detected`) já são contados como chamada E erro por este
--   mesmo job desde o 49-02. Medido em PROD (2026-09-30, só leitura): o bloqueio
--   de 2026-09-28 está em `ai_cost_daily` como `provider='none'`, `call_count=1`,
--   `error_count=1`. É outra classe, e a decisão é do operador — o achado chega a
--   ele pelo checkpoint da Task 1 do 49-43. Esta migration NÃO muda o que os
--   bloqueios contam: o portão abaixo exige que o bloqueio continue contado.
--
-- ⚠ O CORPO VIVO NÃO É O TEXTO DE 20260609000003. Medido em 2026-09-30 (só
--   leitura): o comando vivo (jobid 1, md5 `fdd283dc3e266884761a3649c31acd6c`) é
--   uma versão COMPACTADA (`success=false`, `COALESCE(SUM(...),0)`), de origem
--   fora do repositório — o `cron-inventory.md` do 42-05 já registrava que o corpo
--   deste job não fora transcrito verbatim. Os TOKENS são os mesmos: comparados
--   sem espaço em branco, os dois textos são idênticos. Por isso o portão abaixo
--   compara o comando vivo com o de `20260609000003` REMOVENDO todo espaço em
--   branco (colapsar espaços não bastaria: `success = false` ≠ `success=false`).
--   Qualquer outra diferença é uma edição desconhecida, e a migration RECUSA
--   sobrescrevê-la.
--
-- COMO O JOB É ALTERADO. `cron.alter_job(job_id := <jobid>, command := …)`, pelo
-- `jobid` lido pelo `jobname`. NÃO o agendamento por nome: ele é chaveado por
-- (nome, usuário) e criaria um SEGUNDO job se o papel do apply diferir do dono.
-- Horário e `active` ficam intocados (smoke `p42_invent05_cron_smoke.sql` (d):
-- horário `30 1 * * *`, `active`, corpo com `ai_cost_daily` e `ON CONFLICT`), e o
-- portão os confere depois do `alter_job`.
--
-- PORTÃO COMPORTAMENTAL, COM BASELINE NA MESMA EXECUÇÃO. Tabelas temporárias
-- (`ON COMMIT DROP`) no formato de `ai_call_logs` e de `ai_cost_daily` (esta com
-- os índices, para o `ON CONFLICT`; `LIKE` não copia gatilho, então nenhum
-- alerta sai), com linhas sintéticas datadas de ontem:
--   grupo `none`      : 1 bloqueio (`prompt_injection_detected`) + 1 sinal
--                       (`prompt_injection_flagged`), ambos `success=false`;
--   grupo `anthropic` : 1 falha (`anthropic_timeout`) + 1 sucesso (código NULO).
-- Roda o comando ANTIGO (o vivo, lido antes do `alter_job`) e depois o NOVO
-- (RELIDO de `cron.job` depois do `alter_job`), cada um com os dois nomes
-- qualificados trocados pelos temporários, e confere:
--   antigo: `none` = 2 chamadas / 2 erros (se não, o instrumento não morde);
--   novo  : `none` = 1 / 1 (só o bloqueio) e `anthropic` = 2 / 1 (a falha real
--           continua contada, e o sucesso de código nulo continua chamada).
-- Falha levanta exceção com o prefixo `P49-38 PORTAO`. As medições ficam em
-- `pg_temp.p49_38_medicao (chave, valor)`, também `ON COMMIT DROP`.
--
-- ENSAIO. Esta migration NÃO tem GUC nem exceção de ensaio. Quem desfaz o ensaio
-- em PROD é o ARNÊS do 49-38: ele roda este arquivo, sem edição, seguido de um
-- bloco FINAL dele, que levanta `P49-38 ENSAIO OK: <medições>` — e o endpoint da
-- Management API roda a requisição inteira numa transação só. Assim um defeito da
-- própria migration não consegue fazer o ensaio persistir.
--
-- REVERSÍVEL. O job só muda de comando. Desfazer:
--   SELECT cron.alter_job(
--     job_id  := (SELECT jobid FROM cron.job WHERE jobname = 'ai-cost-aggregation'),
--     command := <o comando de 20260609000003, sem a linha da exclusão>);
-- (o md5 volta a ser o do texto de 20260609000003, não o `fdd283dc…` da versão
-- compactada — os tokens são os mesmos).
--
-- NOTE: sem `BEGIN; ... COMMIT;` (D-22). O `p46apply.cjs` já roda a requisição
-- inteira (migration + linha do ledger) numa única transação.
-- =============================================================================

DO $p4938$
DECLARE
  c_job   constant text := 'ai-cost-aggregation';
  -- O comando de 20260609000003, verbatim (referência do portão de edição desconhecida).
  c_cmd_20260609000003 constant text := $cmd$
    INSERT INTO public.ai_cost_daily (
      date, vaga_id, call_type, provider,
      call_count, total_input_tokens, total_output_tokens, total_cost_usd, error_count
    )
    SELECT
      DATE(created_at),
      vaga_id,
      call_type,
      provider,
      COUNT(*),
      COALESCE(SUM(input_token_count), 0),
      COALESCE(SUM(output_token_count), 0),
      COALESCE(SUM(cost_usd), 0),
      SUM(CASE WHEN success = false THEN 1 ELSE 0 END)
    FROM public.ai_call_logs
    WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY DATE(created_at), vaga_id, call_type, provider
    ON CONFLICT (date, vaga_id, call_type, provider) DO UPDATE SET
      call_count          = EXCLUDED.call_count,
      total_input_tokens  = EXCLUDED.total_input_tokens,
      total_output_tokens = EXCLUDED.total_output_tokens,
      total_cost_usd      = EXCLUDED.total_cost_usd,
      error_count         = EXCLUDED.error_count;
$cmd$;
  -- O comando NOVO: o de 20260609000003 com UMA linha a mais no WHERE.
  c_cmd_novo constant text := $cmd$
    INSERT INTO public.ai_cost_daily (
      date, vaga_id, call_type, provider,
      call_count, total_input_tokens, total_output_tokens, total_cost_usd, error_count
    )
    SELECT
      DATE(created_at),
      vaga_id,
      call_type,
      provider,
      COUNT(*),
      COALESCE(SUM(input_token_count), 0),
      COALESCE(SUM(output_token_count), 0),
      COALESCE(SUM(cost_usd), 0),
      SUM(CASE WHEN success = false THEN 1 ELSE 0 END)
    FROM public.ai_call_logs
    WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
      AND error_code IS DISTINCT FROM 'prompt_injection_flagged'
    GROUP BY DATE(created_at), vaga_id, call_type, provider
    ON CONFLICT (date, vaga_id, call_type, provider) DO UPDATE SET
      call_count          = EXCLUDED.call_count,
      total_input_tokens  = EXCLUDED.total_input_tokens,
      total_output_tokens = EXCLUDED.total_output_tokens,
      total_cost_usd      = EXCLUDED.total_cost_usd,
      error_count         = EXCLUDED.error_count;
$cmd$;
  c_vaga  constant uuid := '49380000-0000-4000-8000-000000000001'::uuid;
  c_pv    constant uuid := '49380000-0000-4000-8000-0000000000a1'::uuid;

  v_n          int;
  v_jobid      bigint;
  v_cmd_antigo text;
  v_sched      text;
  v_active     boolean;
  v_cmd_relido text;
  v_sched2     text;
  v_active2    boolean;
  v_ontem      timestamptz;
  v_sonda      text;
  v_troca      text;
  v_none_call  int;  v_none_err  int;
  v_anth_call  int;  v_anth_err  int;
BEGIN
  -- ── 1. O job: exatamente um, e com o comando que este repositório conhece ────
  SELECT count(*) INTO v_n FROM cron.job WHERE jobname = c_job;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P49-38 PORTAO: ha % job(s) chamados % em cron.job (esperado exatamente 1) — nada foi alterado', v_n, c_job;
  END IF;

  SELECT jobid, command, schedule, active
    INTO v_jobid, v_cmd_antigo, v_sched, v_active
    FROM cron.job WHERE jobname = c_job;

  IF regexp_replace(v_cmd_antigo, '\s', '', 'g')
     IS DISTINCT FROM regexp_replace(c_cmd_20260609000003, '\s', '', 'g') THEN
    RAISE EXCEPTION 'P49-38 PORTAO: o comando vivo de % (md5 %) NAO e o de 20260609000003, nem sem espacos em branco — edicao desconhecida; esta migration recusa sobrescreve-la',
      c_job, md5(v_cmd_antigo);
  END IF;

  -- ── 2. Troca SÓ o comando, pelo jobid (nunca o agendamento por nome) ─────────
  PERFORM cron.alter_job(job_id := v_jobid, command := c_cmd_novo);

  SELECT count(*) INTO v_n FROM cron.job WHERE jobname = c_job;
  SELECT command, schedule, active
    INTO v_cmd_relido, v_sched2, v_active2
    FROM cron.job WHERE jobid = v_jobid;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P49-38 PORTAO: depois do alter_job ha % job(s) chamados % (esperado 1)', v_n, c_job;
  END IF;
  IF v_cmd_relido IS DISTINCT FROM c_cmd_novo THEN
    RAISE EXCEPTION 'P49-38 PORTAO: o comando relido de cron.job (md5 %) nao e o comando novo (md5 %)',
      md5(v_cmd_relido), md5(c_cmd_novo);
  END IF;
  IF v_sched2 IS DISTINCT FROM v_sched OR v_active2 IS DISTINCT FROM v_active THEN
    RAISE EXCEPTION 'P49-38 PORTAO: o alter_job mexeu no horario/estado (antes % / %, depois % / %)',
      v_sched, v_active, v_sched2, v_active2;
  END IF;
  IF strpos(v_cmd_relido, 'ai_cost_daily') = 0 OR strpos(v_cmd_relido, 'ON CONFLICT') = 0 THEN
    RAISE EXCEPTION 'P49-38 PORTAO: o comando novo perdeu a assinatura do smoke p42 (d): ai_cost_daily + ON CONFLICT';
  END IF;

  -- ── 3. Sonda comportamental: baseline (comando ANTIGO) e mordida (NOVO) ──────
  CREATE TEMP TABLE p49_38_medicao (chave text PRIMARY KEY, valor text) ON COMMIT DROP;
  CREATE TEMP TABLE p49_38_logs (LIKE public.ai_call_logs INCLUDING DEFAULTS) ON COMMIT DROP;
  CREATE TEMP TABLE p49_38_daily (LIKE public.ai_cost_daily INCLUDING DEFAULTS INCLUDING INDEXES) ON COMMIT DROP;

  v_ontem := ((CURRENT_DATE - 1)::timestamp + interval '12 hours')::timestamptz;

  INSERT INTO pg_temp.p49_38_logs (
    created_at, vaga_id, call_type, prompt_version_id, prompt_hash, provider, model_id,
    system_prompt, user_prompt_template, input_token_count, raw_response,
    output_token_count, latency_ms, cost_usd, success, error_code, retain_until
  ) VALUES
    -- grupo `none`: o BLOQUEIO (continua contado — escopo negativo) e o SINAL (sai)
    (v_ontem, c_vaga, 'cv_job_match', c_pv, '', 'none', 'sintetico', '', '', 0,
     '{}'::jsonb, 0, 0, 0, false, 'prompt_injection_detected', v_ontem + interval '1 year'),
    (v_ontem, c_vaga, 'cv_job_match', c_pv, '', 'none', 'sintetico', '', '', 0,
     '{}'::jsonb, 0, 0, 0, false, 'prompt_injection_flagged', v_ontem + interval '1 year'),
    -- grupo `anthropic`: uma falha REAL (continua erro) e um sucesso de código NULO
    (v_ontem, c_vaga, 'cv_job_match', c_pv, '', 'anthropic', 'sintetico', '', '', 0,
     '{}'::jsonb, 0, 0, 0, false, 'anthropic_timeout', v_ontem + interval '1 year'),
    (v_ontem, c_vaga, 'cv_job_match', c_pv, '', 'anthropic', 'sintetico', '', '', 100,
     '{}'::jsonb, 50, 0, 0.01, true, NULL, v_ontem + interval '1 year');

  -- (a) comando ANTIGO — o vivo, lido ANTES do alter_job
  v_troca := replace(v_cmd_antigo, 'public.ai_cost_daily', 'pg_temp.p49_38_daily');
  IF v_troca = v_cmd_antigo THEN
    RAISE EXCEPTION 'P49-38 PORTAO: a troca de public.ai_cost_daily nao mudou o comando antigo (sonda sem alvo)';
  END IF;
  v_sonda := replace(v_troca, 'public.ai_call_logs', 'pg_temp.p49_38_logs');
  IF v_sonda = v_troca THEN
    RAISE EXCEPTION 'P49-38 PORTAO: a troca de public.ai_call_logs nao mudou o comando antigo (sonda sem alvo)';
  END IF;
  EXECUTE v_sonda;

  SELECT call_count, error_count INTO v_none_call, v_none_err
    FROM pg_temp.p49_38_daily WHERE provider = 'none';
  SELECT call_count, error_count INTO v_anth_call, v_anth_err
    FROM pg_temp.p49_38_daily WHERE provider = 'anthropic';
  INSERT INTO pg_temp.p49_38_medicao VALUES
    ('antigo.none',      format('%s/%s', v_none_call, v_none_err)),
    ('antigo.anthropic', format('%s/%s', v_anth_call, v_anth_err));
  IF v_none_call IS DISTINCT FROM 2 OR v_none_err IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'P49-38 PORTAO: instrumento nao morde — o comando ANTIGO deu none=%/% (chamadas/erros), esperado 2/2; sem essa baseline a medicao do novo nao prova nada',
      v_none_call, v_none_err;
  END IF;

  DELETE FROM pg_temp.p49_38_daily;

  -- (b) comando NOVO — RELIDO de cron.job depois do alter_job
  v_troca := replace(v_cmd_relido, 'public.ai_cost_daily', 'pg_temp.p49_38_daily');
  IF v_troca = v_cmd_relido THEN
    RAISE EXCEPTION 'P49-38 PORTAO: a troca de public.ai_cost_daily nao mudou o comando novo (sonda sem alvo)';
  END IF;
  v_sonda := replace(v_troca, 'public.ai_call_logs', 'pg_temp.p49_38_logs');
  IF v_sonda = v_troca THEN
    RAISE EXCEPTION 'P49-38 PORTAO: a troca de public.ai_call_logs nao mudou o comando novo (sonda sem alvo)';
  END IF;
  EXECUTE v_sonda;

  SELECT call_count, error_count INTO v_none_call, v_none_err
    FROM pg_temp.p49_38_daily WHERE provider = 'none';
  SELECT call_count, error_count INTO v_anth_call, v_anth_err
    FROM pg_temp.p49_38_daily WHERE provider = 'anthropic';
  INSERT INTO pg_temp.p49_38_medicao VALUES
    ('novo.none',      format('%s/%s', v_none_call, v_none_err)),
    ('novo.anthropic', format('%s/%s', v_anth_call, v_anth_err)),
    ('job.jobid',      v_jobid::text),
    ('job.horario',    v_sched2),
    ('job.active',     v_active2::text),
    ('job.md5_antes',  md5(v_cmd_antigo)),
    ('job.md5_depois', md5(v_cmd_relido));
  IF v_none_call IS DISTINCT FROM 1 OR v_none_err IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49-38 PORTAO: o comando NOVO deu none=%/% (chamadas/erros), esperado 1/1 — so o bloqueio conta; o evento do sinal ainda entra na agregacao',
      v_none_call, v_none_err;
  END IF;
  IF v_anth_call IS DISTINCT FROM 2 OR v_anth_err IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49-38 PORTAO: o comando NOVO deu anthropic=%/% (chamadas/erros), esperado 2/1 — a falha real tem de continuar erro e o sucesso de codigo nulo tem de continuar chamada',
      v_anth_call, v_anth_err;
  END IF;

  RAISE NOTICE 'P49-38: ai-cost-aggregation (jobid %) sem o evento do sinal — antigo none 2/2, novo none 1/1, anthropic 2/1; horario % e active % intactos',
    v_jobid, v_sched2, v_active2;
END
$p4938$;
