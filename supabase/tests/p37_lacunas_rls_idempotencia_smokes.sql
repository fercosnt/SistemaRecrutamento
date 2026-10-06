-- =============================================================================
-- Phase 37 / Plano 37-03 — smoke COMPORTAMENTAL do ledger de notificação
-- (LEDGER-01 · LEDGER-02 · LEDGER-03 · TIMELINE-01)
-- Reescrito na Phase 50 / Plano 50-08 (D-01, D-02) — (h), (h2) novo, (k)/(l)/(n) por baseline.
-- =============================================================================
-- ⚠ RODAR SÓ PELO ENVELOPE QUE ABORTA:
--     node scripts/p50_ensaio.cjs supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql
--   A fixture é do idioma antigo (escreve vagas/candidatura/notificações, faz UPDATE no seed de
--   config_sla_etapa e apaga no fim); o INSERT em candidaturas dispara os triggers de
--   notificação/análise. Fora da requisição que aborta, nada disto pode rodar.
--
-- PHASE 50 — O QUE MUDOU NESTE ARQUIVO
--   · (h) dizia «recrutador NÃO-dono lê 0». Desde a Phase 50 o recrutador ATIVO vê tudo o que o
--     administrador vê (D-01), e quem separa quem vê é a linha VIVA em `usuarios_rh`
--     (`public.is_active_rh_user()`), não a autoria (D-02: o JWT vive 3600 s e desativar não
--     desloga). (h) agora exige que o recrutador A (ATIVO, dono só da vagaA vazia) LEIA as
--     notificações da vagaB — contagem EXATA contra a lida como postgres na mesma execução.
--   · (h2) é a negativa nova: o TOKEN VELHO (claim rh + recrutador INATIVO, lido em execução) lê 0.
--   · (n) dizia «a tabela termina com 0 linhas, como começou» — verdade em 2026-07-22, FOTOGRAFIA
--     hoje (PROD tem o ledger em uso; medido no 50-08: o texto antigo reprovava em (n) com 73
--     linhas, antes de qualquer migration da fase). Agora: termina com a contagem CAPTURADA no
--     começo desta execução (CLAUDE.md §«Portões: varra pela FORMA»).
--   · (k)/(l) diziam «8 linhas» — a mesma forma: o seed é UMA linha por label de
--     `etapa_processo`. Agora comparam com o número de labels lido na execução.
--   · (o) passa de 14 para 15 (o PASS de (h2)).
--   Matriz do 50-08: sem as migrations 20261005000002..4 este arquivo REPROVA em (h); com elas,
--   passa.
--
-- O gate de aceitação LOAD-BEARING da Phase 37. Rodar via Supabase MCP
-- `execute_sql` DEPOIS que o Plano 37-04 aplicar a migration aditiva
-- `20260722000002_p37_notificacoes_lacunas.sql`.
--
-- O irmão `p37_fidelidade_schema_smoke.sql` (Plano 37-02) prova que o catálogo
-- BATE com os arquivos. Este aqui prova COMPORTAMENTO: que a RLS de fato nega,
-- que o UNIQUE de fato levanta, que os CHECKs de fato abortam e que o trigger
-- de fato carimba. Estrutura correta e comportamento correto são coisas
-- diferentes; um schema pode passar no primeiro e vazar no segundo.
--
-- GATE VERDE = 15 asserções `PASS (a..n, h2)` + o RESUMO (o). O gate NÃO é
-- "não levantou exceção" (Pitfall 2 do seg33: um run todo-SKIP mascara falha
-- de fixture). Aqui a contagem é AUTO-EXIGIDA: cada asserção incrementa o GUC
-- `smoke37.pass` e a asserção (o) levanta exceção se o total não for 15.
--
-- AS ASSERÇÕES
--   (a) LEDGER-02 idempotência EMPÍRICA — a MESMA `dedupe_key` inserida duas
--       vezes DEVE levantar 23505 nomeando `uq_notif_dedupe`. O caminho sem
--       exceção é FALHA: a guarda de double-send estaria morta.
--   (b) LEDGER-02 claim pattern — `INSERT … ON CONFLICT (dedupe_key) DO NOTHING
--       RETURNING id` devolve 0 linhas na chave já reivindicada e 1 numa chave
--       inédita. É EXATAMENTE o protocolo que a EF da P38 vai usar antes de
--       enviar (contrato já escrito no COMMENT da coluna).
--   (c) LEDGER-01 colunas novas — `destinatario_original` é NOT NULL (23502) e
--       `modo` omitido grava o default fail-safe `teste`.
--   (d) LEDGER-01 `ck_notif_modo` — `modo` fora do domínio levanta 23514
--       nomeando a constraint.
--   (e) trigger em `notificacoes_enviadas` — `atualizado_em` avança num UPDATE
--       e `criado_em` NÃO se move.
--   (f) trigger em `config_sla_etapa` — idem, num UPDATE no-op, com as 3
--       colunas de negócio asseridas IDÊNTICAS antes/depois.
--   (g) LEDGER-03 candidato-DENY — candidato REAL impersonado lê 0 linhas com a
--       linha da fixture EXISTINDO, e seu INSERT é negado (42501).
--   (h) LEDGER-03 [Phase 50] RH ATIVO não-dono — recrutador A (dono só da vagaA vazia) LÊ as
--       notificações da vagaB (= população lida como postgres).
--   (h2) LEDGER-03 [Phase 50] token velho — claim rh + recrutador INATIVO lê 0.
--   (i) LEDGER-03 RH dono — recrutador B (dono da vagaB) lê >= 1.
--   (j) LEDGER-03 admin — role `administrador` lê >= 1.
--   (k) TIMELINE-01 seed + CHECKs — uma linha por label do enum (o número de labels é lido na
--       execução), e os 3 CHECKs provados por violação exigida, sem deixar a linha alterada.
--   (l) TIMELINE-01 public-read — `anon` lê todas as linhas (`sla_public_read`).
--   (m) idx_notif_retry — asserção ESTRUTURAL sobre índice PRÉ-EXISTENTE.
--   (n) CLEANUP — `notificacoes_enviadas` termina com a contagem capturada no começo da execução.
--   (o) RESUMO — exige o total de 15 PASS.
--
-- ⚠ POR QUE (h2) SEM (h) SERIA UM GATE VAZIO (Phase 50 — era «(h) sem (i)»)
--   "Token velho lê 0" passa TRIVIALMENTE num bug que nega tudo — inclusive ao
--   recrutador ativo legítimo. E "ativo lê" sozinho passa num bug que abre para
--   todos. O par permite/nega (h)+(h2) é obrigatório: só ele distingue "a policy
--   separa pelo helper vivo" de "a policy está quebrada" (nos dois sentidos). (i)
--   (o dono, que continua lendo) e (j) (o administrador) ficam como controles.
--
-- ⚠ POR QUE (g) NÃO CONSULTA `pg_policies`
--   A ausência de policy de candidato é a ÚNICA barreira do candidato-DENY.
--   Afirmar "não há policy" olhando o catálogo prova o catálogo, não o acesso.
--   (g) assume a identidade de um candidato REAL — `set_config('request.jwt.
--   claims', …)` com `app_metadata.role = 'candidato'` + `SET ROLE
--   authenticated` — e conta linhas. É a diferença entre revisar e testar.
--
-- FIXTURE (descartável, namespace de UUID fixo 37010037-*, ROLLBACK-free —
-- linhas REAIS nunca são apagadas):
--   · o candidato de teste `candidato.funil@teste.com` (resolvido por e-mail);
--     se não existir, cai para o primeiro candidato com `user_id` e REGISTRA o
--     fallback no NOTICE — degradar em silêncio é o que este arquivo combate.
--   · DOIS `usuarios_rh` REAIS distintos com ZERO vagas → recrutador A / B.
--   · [Phase 50] um recrutador INATIVO (role = 'recrutador' AND NOT ativo) → token velho de (h2).
--     ⚠ `vagas.created_by` TEM FK — UUID sintético a viola (P32 Pitfall 4).
--   · um 3º `usuarios_rh` real → impersonado como `administrador`.
--   · vagaA (created_by = A, vazia) · vagaB (created_by = B) · candidatura d01
--     na vagaB, pertencente ao candidato de teste.
--   · todas as notificações da fixture usam `dedupe_key` com prefixo `smoke37:`
--     — um único DELETE por prefixo limpa tudo, mesmo se um id escapar.
--
-- ⚠ EFEITO COLATERAL DECLARADO
--   A asserção (f) faz um UPDATE no-op na etapa `triagem` de
--   `config_sla_etapa`, ALTERANDO o `atualizado_em` DESSA linha. Isso é o
--   efeito CORRETO e esperado do trigger — é justamente o que está sendo
--   provado. As colunas de negócio (`prazo_valor`, `prazo_unidade`,
--   `rotulo_candidato`) são asseridas idênticas antes e depois: o texto voltado
--   ao candidato NÃO é tocado. Nenhuma linha é inserida ou removida da tabela.
--
-- ⚠ SOBRE `now()` E TEMPO DE TRANSAÇÃO
--   `now()` é o timestamp de INÍCIO DA TRANSAÇÃO e é CONSTANTE dentro dela. Se
--   este arquivo rodar como uma única transação implícita, um `atualizado_em`
--   carimbado agora seria IGUAL — não maior — que um `atualizado_em` gravado
--   por um INSERT da mesma transação. Por isso (e) insere a linha da fixture
--   com `atualizado_em` DELIBERADAMENTE ANTIGO (`now() - 1 day`): a comparação
--   "estritamente maior" passa a ser verdadeira em qualquer arranjo
--   transacional, e a asserção fica mais forte de quebra — ela prova que o
--   trigger SOBRESCREVE o valor vindo do cliente, não apenas que ele existe.
--   Em (f) o ponto de partida é o `atualizado_em` do seed (2026-07-21), que já
--   está no passado por construção.
--
-- HIGIENE
--   `RESET ROLE` antes de cada troca de identidade e na última linha executável
--   (um `SET ROLE` vazado envenena as asserções seguintes). Nenhum e-mail real
--   de candidato é impresso — os NOTICEs carregam contagens e booleanos. As
--   linhas da fixture usam destinatário sintético, nunca PII de pessoa real.
-- =============================================================================

-- UUIDs descartáveis (37010037-* → setup e cleanup idempotentes):
--   vagaA = …0a01 · vagaB = …0b01 · candidatura = …0d01
--   notif fixture = …0e01 · claim inédito = …0e02 · not-null = …0e03
--   default de modo = …0e04 · ck_notif_modo = …0e05 · dupe = …0e06

RESET ROLE;
DO $$
DECLARE
  v_cand      uuid;
  v_cand_user uuid;
  v_recA      uuid;
  v_recB      uuid;
  v_admin     uuid;
  v_velho     uuid;
  v_fallback  boolean := false;
BEGIN
  PERFORM set_config('smoke37.pass', '0', false);

  DELETE FROM public.notificacoes_enviadas WHERE dedupe_key LIKE 'smoke37:%';
  -- Phase 50: baseline de (n), capturada NA execução (antes de qualquer linha da fixture).
  PERFORM set_config('smoke37.notif_base', (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  DELETE FROM public.candidaturas WHERE id = '37010037-0000-4000-8000-000000000d01';
  DELETE FROM public.vagas WHERE id IN (
    '37010037-0000-4000-8000-000000000a01', '37010037-0000-4000-8000-000000000b01');

  SELECT id, user_id INTO v_cand, v_cand_user
    FROM public.candidatos
   WHERE email = 'candidato.funil@teste.com' AND user_id IS NOT NULL
   LIMIT 1;
  IF v_cand IS NULL THEN
    SELECT id, user_id INTO v_cand, v_cand_user
      FROM public.candidatos WHERE user_id IS NOT NULL ORDER BY id LIMIT 1;
    v_fallback := true;
  END IF;

  SELECT user_id INTO v_recA FROM public.usuarios_rh u
   WHERE user_id IS NOT NULL AND deleted_at IS NULL AND ativo
     AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id)
   ORDER BY user_id LIMIT 1;
  SELECT user_id INTO v_recB FROM public.usuarios_rh u
   WHERE user_id IS NOT NULL AND deleted_at IS NULL AND ativo AND user_id <> v_recA
     AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id)
   ORDER BY user_id LIMIT 1;
  SELECT user_id INTO v_admin FROM public.usuarios_rh u
   WHERE user_id IS NOT NULL AND deleted_at IS NULL AND user_id NOT IN (v_recA, v_recB)
   ORDER BY user_id LIMIT 1;
  SELECT user_id INTO v_velho FROM public.usuarios_rh u
   WHERE user_id IS NOT NULL AND u.role = 'recrutador' AND NOT u.ativo
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY user_id LIMIT 1;

  IF v_cand IS NULL OR v_cand_user IS NULL OR v_recA IS NULL OR v_recB IS NULL OR v_admin IS NULL OR v_velho IS NULL THEN
    PERFORM set_config('smoke37.ready', 'n', false);
    RAISE NOTICE 'P37-LAC SKIP: fixture incompleta (cand=% recA=% recB=% admin=% velho=%)',
      v_cand IS NOT NULL, v_recA IS NOT NULL, v_recB IS NOT NULL, v_admin IS NOT NULL, v_velho IS NOT NULL;
    RETURN;
  END IF;

  INSERT INTO public.vagas (id, titulo, slug, status, created_by) VALUES
    ('37010037-0000-4000-8000-000000000a01', '[SMOKE 37] Vaga A', 'smoke-37-vaga-a', 'ativa'::public.status_vaga, v_recA),
    ('37010037-0000-4000-8000-000000000b01', '[SMOKE 37] Vaga B', 'smoke-37-vaga-b', 'ativa'::public.status_vaga, v_recB);
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual, data_candidatura, data_formulario_enviado)
  VALUES ('37010037-0000-4000-8000-000000000d01', v_cand, '37010037-0000-4000-8000-000000000b01',
    'aguardando_resposta'::public.status_candidatura, 'triagem'::public.etapa_processo, now(), now());

  PERFORM set_config('smoke37.cand',     '37010037-0000-4000-8000-000000000d01', false);
  PERFORM set_config('smoke37.candId',   v_cand::text,      false);
  PERFORM set_config('smoke37.candUser', v_cand_user::text, false);
  PERFORM set_config('smoke37.recA',     v_recA::text,      false);
  PERFORM set_config('smoke37.recB',     v_recB::text,      false);
  PERFORM set_config('smoke37.admin',    v_admin::text,     false);
  PERFORM set_config('smoke37.velho',    v_velho::text,     false);
  PERFORM set_config('smoke37.ready',    'y',               false);
  RAISE NOTICE 'P37-LAC fixture construída (candidato de teste resolvido por e-mail: % · fallback usado: %)',
    NOT v_fallback, v_fallback;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke37.ready', 'n', false);
  RAISE NOTICE 'P37-LAC SKIP: fixture não pôde ser construída (%: %)', SQLSTATE, SQLERRM;
END $$;

-- (a) LEDGER-02 idempotência EMPÍRICA — a MESMA dedupe_key duas vezes DEVE levantar 23505.
--     A linha da fixture nasce com atualizado_em/criado_em DELIBERADAMENTE ANTIGOS: é o
--     ponto de partida da comparação estrita da asserção (e). Ver "SOBRE now()" no cabeçalho.
RESET ROLE;
DO $$
DECLARE v_sqlstate text; v_constraint text;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (a)'; RETURN; END IF;

  INSERT INTO public.notificacoes_enviadas
    (id, evento, candidatura_id, candidato_id, template, destinatario_email,
     destinatario_original, modo, dedupe_key, status, criado_em, atualizado_em)
  VALUES ('37010037-0000-4000-8000-000000000e01', 'avanco',
     current_setting('smoke37.cand')::uuid, current_setting('smoke37.candId')::uuid,
     'smoke37-template', 'delivered+avanco@resend.dev',
     'smoke37.original@exemplo.invalid', 'teste',
     'smoke37:avanco:d01:triagem', 'pendente'::public.status_notificacao,
     now() - interval '1 day', now() - interval '1 day');

  BEGIN
    INSERT INTO public.notificacoes_enviadas
      (id, evento, candidatura_id, candidato_id, template, destinatario_email,
       destinatario_original, modo, dedupe_key)
    VALUES ('37010037-0000-4000-8000-000000000e06', 'avanco',
       current_setting('smoke37.cand')::uuid, current_setting('smoke37.candId')::uuid,
       'smoke37-template', 'delivered+avanco@resend.dev',
       'smoke37.original@exemplo.invalid', 'teste',
       'smoke37:avanco:d01:triagem');
    RAISE EXCEPTION 'P37-LAC FAIL (a): a MESMA dedupe_key foi inserida DUAS vezes sem erro — a guarda de idempotência do LEDGER-02 está morta (double-send possível)';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_constraint = CONSTRAINT_NAME;
  END;

  IF v_sqlstate IS DISTINCT FROM '23505' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (a): SQLSTATE inesperado % (esperado 23505)', v_sqlstate;
  END IF;
  IF v_constraint IS DISTINCT FROM 'uq_notif_dedupe' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (a): violação veio de "%" e não de uq_notif_dedupe', v_constraint;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): dedupe_key duplicada rejeitada com 23505 por uq_notif_dedupe (idempotência durável viva)';
END $$;

-- (b) LEDGER-02 claim pattern — o protocolo exato que a EF da P38 usa ANTES de enviar.
RESET ROLE;
DO $$
DECLARE v_id uuid; v_n integer;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (b)'; RETURN; END IF;

  INSERT INTO public.notificacoes_enviadas
    (id, evento, candidatura_id, candidato_id, template, destinatario_email,
     destinatario_original, modo, dedupe_key)
  VALUES ('37010037-0000-4000-8000-000000000e06', 'avanco',
     current_setting('smoke37.cand')::uuid, current_setting('smoke37.candId')::uuid,
     'smoke37-template', 'delivered+avanco@resend.dev',
     'smoke37.original@exemplo.invalid', 'teste',
     'smoke37:avanco:d01:triagem')
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO v_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 OR v_id IS NOT NULL THEN
    RAISE EXCEPTION 'P37-LAC FAIL (b): a reivindicação de uma dedupe_key JÁ RECLAMADA devolveu % linha(s) — a EF da P38 enviaria o e-mail duas vezes', v_n;
  END IF;

  INSERT INTO public.notificacoes_enviadas
    (id, evento, candidatura_id, candidato_id, template, destinatario_email,
     destinatario_original, modo, dedupe_key)
  VALUES ('37010037-0000-4000-8000-000000000e02', 'convite',
     current_setting('smoke37.cand')::uuid, current_setting('smoke37.candId')::uuid,
     'smoke37-template', 'delivered+convite@resend.dev',
     'smoke37.original@exemplo.invalid', 'teste',
     'smoke37:convite:d01:inedita')
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'P37-LAC FAIL (b): a reivindicação de uma dedupe_key INÉDITA devolveu 0 linhas — a EF da P38 nunca enviaria nada';
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): claim ON CONFLICT DO NOTHING RETURNING devolve 0 na chave reclamada e 1 na inédita';
END $$;

-- (c) LEDGER-01 colunas novas — NOT NULL de destinatario_original + default fail-safe de modo.
RESET ROLE;
DO $$
DECLARE v_sqlstate text; v_modo text;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (c)'; RETURN; END IF;

  BEGIN
    INSERT INTO public.notificacoes_enviadas
      (id, evento, candidatura_id, candidato_id, template, destinatario_email, dedupe_key)
    VALUES ('37010037-0000-4000-8000-000000000e03', 'decisao',
       current_setting('smoke37.cand')::uuid, current_setting('smoke37.candId')::uuid,
       'smoke37-template', 'delivered+decisao@resend.dev', 'smoke37:decisao:d01:sem-original');
    RAISE EXCEPTION 'P37-LAC FAIL (c): INSERT sem destinatario_original foi aceito — a auditoria poderia perder o e-mail REAL do candidato';
  EXCEPTION WHEN not_null_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;
  IF v_sqlstate IS DISTINCT FROM '23502' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (c): SQLSTATE inesperado % (esperado 23502)', v_sqlstate;
  END IF;

  INSERT INTO public.notificacoes_enviadas
    (id, evento, candidatura_id, candidato_id, template, destinatario_email,
     destinatario_original, dedupe_key)
  VALUES ('37010037-0000-4000-8000-000000000e04', 'decisao',
     current_setting('smoke37.cand')::uuid, current_setting('smoke37.candId')::uuid,
     'smoke37-template', 'delivered+decisao@resend.dev',
     'smoke37.original@exemplo.invalid', 'smoke37:decisao:d01:default-modo');
  SELECT modo INTO v_modo FROM public.notificacoes_enviadas
   WHERE id = '37010037-0000-4000-8000-000000000e04';
  IF v_modo IS DISTINCT FROM 'teste' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (c): modo omitido gravou "%" — o default DEVE ser o fail-safe teste, nunca producao', v_modo;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): destinatario_original é NOT NULL (23502) e modo omitido cai no default fail-safe teste';
END $$;

-- (d) LEDGER-01 ck_notif_modo — domínio de `modo` travado em ('producao','teste').
RESET ROLE;
DO $$
DECLARE v_sqlstate text; v_constraint text;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (d)'; RETURN; END IF;

  BEGIN
    INSERT INTO public.notificacoes_enviadas
      (id, evento, candidatura_id, candidato_id, template, destinatario_email,
       destinatario_original, modo, dedupe_key)
    VALUES ('37010037-0000-4000-8000-000000000e05', 'confirmacao',
       current_setting('smoke37.cand')::uuid, current_setting('smoke37.candId')::uuid,
       'smoke37-template', 'delivered+confirmacao@resend.dev',
       'smoke37.original@exemplo.invalid', 'producaozinha',
       'smoke37:confirmacao:d01:modo-invalido');
    RAISE EXCEPTION 'P37-LAC FAIL (d): modo "producaozinha" foi aceito — ck_notif_modo não está travando o domínio';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_constraint = CONSTRAINT_NAME;
  END;
  IF v_sqlstate IS DISTINCT FROM '23514' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (d): SQLSTATE inesperado % (esperado 23514)', v_sqlstate;
  END IF;
  IF v_constraint IS DISTINCT FROM 'ck_notif_modo' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (d): violação veio de "%" e não de ck_notif_modo', v_constraint;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): modo fora do domínio rejeitado com 23514 por ck_notif_modo';
END $$;

-- (e) trigger trg_notificacoes_atualizado_em — atualizado_em avança, criado_em não se move.
RESET ROLE;
DO $$
DECLARE
  v_atu_antes timestamptz; v_atu_depois timestamptz;
  v_cri_antes timestamptz; v_cri_depois timestamptz;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (e)'; RETURN; END IF;

  SELECT atualizado_em, criado_em INTO v_atu_antes, v_cri_antes
    FROM public.notificacoes_enviadas WHERE id = '37010037-0000-4000-8000-000000000e01';
  PERFORM pg_sleep(0.05);

  UPDATE public.notificacoes_enviadas SET tentativas = tentativas + 1
   WHERE id = '37010037-0000-4000-8000-000000000e01';

  SELECT atualizado_em, criado_em INTO v_atu_depois, v_cri_depois
    FROM public.notificacoes_enviadas WHERE id = '37010037-0000-4000-8000-000000000e01';

  IF v_atu_depois <= v_atu_antes THEN
    RAISE EXCEPTION 'P37-LAC FAIL (e): atualizado_em não avançou no UPDATE (antes % · depois %) — a coluna continua congelada e a trilha de retry/reconciliação da P41 mentiria', v_atu_antes, v_atu_depois;
  END IF;
  IF v_cri_depois IS DISTINCT FROM v_cri_antes THEN
    RAISE EXCEPTION 'P37-LAC FAIL (e): criado_em MUDOU no UPDATE (% → %) — o trigger está tocando a coluna errada', v_cri_antes, v_cri_depois;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): trg_notificacoes_atualizado_em carimbou atualizado_em (estritamente maior) e preservou criado_em';
END $$;

-- (f) trigger trg_config_sla_atualizado_em — UPDATE no-op na etapa `triagem`.
--     ⚠ Esta asserção ALTERA de propósito o atualizado_em dessa linha do seed. As 3
--     colunas de negócio são asseridas idênticas: o texto voltado ao candidato não é tocado.
RESET ROLE;
DO $$
DECLARE
  v_atu_antes timestamptz; v_atu_depois timestamptz;
  v_val_antes integer;     v_val_depois integer;
  v_uni_antes text;        v_uni_depois text;
  v_rot_antes text;        v_rot_depois text;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (f)'; RETURN; END IF;

  SELECT atualizado_em, prazo_valor, prazo_unidade, rotulo_candidato
    INTO v_atu_antes, v_val_antes, v_uni_antes, v_rot_antes
    FROM public.config_sla_etapa WHERE etapa = 'triagem'::public.etapa_processo;

  UPDATE public.config_sla_etapa SET rotulo_candidato = rotulo_candidato
   WHERE etapa = 'triagem'::public.etapa_processo;

  SELECT atualizado_em, prazo_valor, prazo_unidade, rotulo_candidato
    INTO v_atu_depois, v_val_depois, v_uni_depois, v_rot_depois
    FROM public.config_sla_etapa WHERE etapa = 'triagem'::public.etapa_processo;

  IF v_atu_depois <= v_atu_antes THEN
    RAISE EXCEPTION 'P37-LAC FAIL (f): atualizado_em de config_sla_etapa não avançou no UPDATE (antes % · depois %)', v_atu_antes, v_atu_depois;
  END IF;
  IF v_val_depois IS DISTINCT FROM v_val_antes
     OR v_uni_depois IS DISTINCT FROM v_uni_antes
     OR v_rot_depois IS DISTINCT FROM v_rot_antes THEN
    RAISE EXCEPTION 'P37-LAC FAIL (f): o UPDATE no-op ALTEROU colunas de negócio da etapa triagem — o texto voltado ao candidato foi corrompido';
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): trg_config_sla_atualizado_em carimbou atualizado_em da etapa triagem (efeito esperado) e as 3 colunas de negócio seguem idênticas';
END $$;

-- (g) LEDGER-03 candidato-DENY — a asserção mais importante do arquivo.
--     Identidade REAL de candidato, linha da fixture EXISTINDO, contagem = 0.
RESET ROLE;
SET ROLE authenticated;
DO $$
DECLARE v_n integer; v_negado boolean := false;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (g)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke37.candUser'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);

  SELECT count(*) INTO v_n FROM public.notificacoes_enviadas;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (g): candidato impersonado leu % linha(s) do ledger (esperado 0) — VAZAMENTO de PII de funil de TODOS os candidatos', v_n;
  END IF;

  BEGIN
    INSERT INTO public.notificacoes_enviadas
      (evento, candidatura_id, candidato_id, template, destinatario_email,
       destinatario_original, dedupe_key)
    VALUES ('avanco', current_setting('smoke37.cand')::uuid, current_setting('smoke37.candId')::uuid,
       'smoke37-template', 'delivered+avanco@resend.dev',
       'smoke37.original@exemplo.invalid', 'smoke37:avanco:d01:escrita-candidato');
  EXCEPTION WHEN insufficient_privilege THEN
    v_negado := true;
  END;
  IF NOT v_negado THEN
    RAISE EXCEPTION 'P37-LAC FAIL (g): candidato INSERIU no ledger — existe policy de escrita onde só service_role deveria escrever';
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (g): candidato REAL impersonado lê 0 linhas com a fixture existindo, e sua escrita é negada (42501) — candidato-DENY por default-deny confirmado por comportamento';
END $$;

-- (h) LEDGER-03 [Phase 50] RH ATIVO não-dono — recrutador A (dono só da vagaA vazia) LÊ as
--     notificações da vagaB: contagem EXATA contra a população lida como postgres agora.
RESET ROLE;
SELECT set_config('smoke37.notif_d01', (SELECT count(*) FROM public.notificacoes_enviadas
                                         WHERE candidatura_id = '37010037-0000-4000-8000-000000000d01')::text, false);
SET ROLE authenticated;
DO $$
DECLARE v_n integer; v_pop integer := nullif(current_setting('smoke37.notif_d01', true), '')::int;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (h)'; RETURN; END IF;
  IF coalesce(v_pop, 0) < 1 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (h): a populacao de notificacoes da vagaB esta vazia (%) — (h)/(h2) nao provariam nada', v_pop;
  END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke37.recA'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);

  SELECT count(*) INTO v_n FROM public.notificacoes_enviadas
   WHERE candidatura_id = current_setting('smoke37.cand')::uuid;
  IF v_n IS DISTINCT FROM v_pop THEN
    RAISE EXCEPTION 'P37-LAC FAIL (h): recrutador ATIVO não-dono leu %/% notificação(ões) da vagaB — D-01 (rh ativo vê tudo) não vale em rh_le_notificacoes', v_n, v_pop;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (h): recrutador ativo não-dono lê %/% notificações da vaga alheia', v_n, v_pop;
END $$;

-- (h2) LEDGER-03 [Phase 50] token velho — claim rh + recrutador INATIVO lê 0 das MESMAS linhas.
RESET ROLE;
SET ROLE authenticated;
DO $$
DECLARE v_n integer;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (h2)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke37.velho'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);

  SELECT count(*) INTO v_n FROM public.notificacoes_enviadas
   WHERE candidatura_id = current_setting('smoke37.cand')::uuid;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (h2): token velho (recrutador INATIVO) leu % notificação(ões) — D-02 (helper vivo) não vale em rh_le_notificacoes', v_n;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (h2): token velho lê 0 notificações (o par com (h) fecha)';
END $$;

-- (i) LEDGER-03 RH dono — sem esta, (h) passaria trivialmente num bug que nega tudo.
RESET ROLE;
SET ROLE authenticated;
DO $$
DECLARE v_n integer;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (i)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke37.recB'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);

  SELECT count(*) INTO v_n FROM public.notificacoes_enviadas
   WHERE candidatura_id = current_setting('smoke37.cand')::uuid;
  IF v_n < 1 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (i): recrutador DONO da vaga leu % linha(s) (esperado >= 1) — a policy nega até o acesso legítimo', v_n;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (i): recrutador dono da vaga lê as notificações da própria candidatura';
END $$;

-- (j) LEDGER-03 admin — literal de role `administrador` (seção D do dump).
RESET ROLE;
SET ROLE authenticated;
DO $$
DECLARE v_n integer;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (j)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke37.admin'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);

  SELECT count(*) INTO v_n FROM public.notificacoes_enviadas
   WHERE candidatura_id = current_setting('smoke37.cand')::uuid;
  IF v_n < 1 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (j): role administrador leu % linha(s) (esperado >= 1) — confira o literal do role na policy (é administrador, não a forma abreviada)', v_n;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (j): role administrador lê o ledger (literal de role da policy confirmado)';
END $$;

-- (k) TIMELINE-01 seed + os 3 CHECKs de config_sla_etapa, provados por violação exigida.
RESET ROLE;
DO $$
DECLARE
  v_n integer; v_faltando text; v_sqlstate text; v_constraint text;
  v_val integer; v_uni text; v_rot text;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (k)'; RETURN; END IF;

  -- Phase 50 / 50-08: era `v_n <> 8` (fotografia do enum de 2026-07); o seed é uma linha por label.
  SELECT count(*) INTO v_n FROM public.config_sla_etapa;
  IF v_n IS DISTINCT FROM (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                            WHERE t.typname = 'etapa_processo')::int THEN
    RAISE EXCEPTION 'P37-LAC FAIL (k): config_sla_etapa tem % linhas, diferente do número de labels de etapa_processo — o seed da TIMELINE-01 está incompleto ou foi adulterado', v_n;
  END IF;

  SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) INTO v_faltando
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
   WHERE t.typname = 'etapa_processo'
     AND NOT EXISTS (SELECT 1 FROM public.config_sla_etapa c WHERE c.etapa::text = e.enumlabel);
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'P37-LAC FAIL (k): etapas do enum sem linha em config_sla_etapa: % — a timeline da P40 teria buraco', v_faltando;
  END IF;

  SELECT prazo_valor, prazo_unidade, rotulo_candidato INTO v_val, v_uni, v_rot
    FROM public.config_sla_etapa WHERE etapa = 'triagem'::public.etapa_processo;

  BEGIN
    UPDATE public.config_sla_etapa SET prazo_unidade = NULL
     WHERE etapa = 'triagem'::public.etapa_processo;
    RAISE EXCEPTION 'P37-LAC FAIL (k): prazo_valor não-nulo com prazo_unidade nula foi aceito — ck_sla_prazo_consistente não está amarrando o par';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_constraint = CONSTRAINT_NAME;
  END;
  IF v_sqlstate IS DISTINCT FROM '23514' OR v_constraint IS DISTINCT FROM 'ck_sla_prazo_consistente' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (k): esperado 23514/ck_sla_prazo_consistente, veio %/%', v_sqlstate, v_constraint;
  END IF;

  BEGIN
    UPDATE public.config_sla_etapa SET prazo_unidade = 'semanas'
     WHERE etapa = 'triagem'::public.etapa_processo;
    RAISE EXCEPTION 'P37-LAC FAIL (k): prazo_unidade "semanas" foi aceita — o CHECK de domínio da unidade não existe';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;
  IF v_sqlstate IS DISTINCT FROM '23514' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (k): unidade inválida deu SQLSTATE % (esperado 23514)', v_sqlstate;
  END IF;

  BEGIN
    UPDATE public.config_sla_etapa SET prazo_valor = 0
     WHERE etapa = 'triagem'::public.etapa_processo;
    RAISE EXCEPTION 'P37-LAC FAIL (k): prazo_valor = 0 foi aceito — o CHECK de positividade não existe';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;
  IF v_sqlstate IS DISTINCT FROM '23514' THEN
    RAISE EXCEPTION 'P37-LAC FAIL (k): prazo_valor 0 deu SQLSTATE % (esperado 23514)', v_sqlstate;
  END IF;

  SELECT count(*) INTO v_n FROM public.config_sla_etapa
   WHERE etapa = 'triagem'::public.etapa_processo
     AND prazo_valor IS NOT DISTINCT FROM v_val
     AND prazo_unidade IS NOT DISTINCT FROM v_uni
     AND rotulo_candidato IS NOT DISTINCT FROM v_rot;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (k): a linha triagem NÃO voltou ao estado original após as 3 violações — o smoke corrompeu o seed';
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (k): seed com uma linha por label do enum e os 3 CHECKs provados por violação, sem alterar a linha';
END $$;

-- (l) TIMELINE-01 public-read — a policy sla_public_read é o que a P40 vai usar.
RESET ROLE;
SET ROLE anon;
DO $$
DECLARE v_n integer;
BEGIN
  IF current_setting('smoke37.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'P37-LAC SKIP (l)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '', false);

  -- Phase 50 / 50-08: era `v_n <> 8`; agora o número de labels de etapa_processo, lido na execução.
  SELECT count(*) INTO v_n FROM public.config_sla_etapa;
  IF v_n IS DISTINCT FROM (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                            WHERE t.typname = 'etapa_processo')::int THEN
    RAISE EXCEPTION 'P37-LAC FAIL (l): anon leu % linhas de config_sla_etapa, diferente do número de labels de etapa_processo — o painel público da P40 ficaria sem os prazos', v_n;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (l): anon lê as % linhas de config_sla_etapa via sla_public_read', v_n;
END $$;

-- (m) idx_notif_retry — ÚNICA asserção ESTRUTURAL do arquivo, e sobre um índice
--     PRÉ-EXISTENTE: a Phase 37 o VERIFICA, não o cria (ver a "NOTA DE ESCOPO" da
--     migration 20260722000002). Por que estrutural e não comportamental: a tabela é
--     pequena demais para o planner preferir o índice num EXPLAIN, então "usou o índice"
--     não é observável com honestidade aqui — asserir plano de execução numa tabela de
--     poucas linhas produziria um gate que mente nos dois sentidos.
--     ⚠ NÃO exigir `status` como primeira coluna da chave: a forma viva é
--     btree (proxima_tentativa_em) WHERE status IN (…), e ela é a CORRETA — o predicado
--     parcial já fixa status, então repeti-lo na chave só engordaria o índice. Uma
--     asserção que exigisse (status, proxima_tentativa_em) REPROVARIA a forma boa.
RESET ROLE;
DO $$
DECLARE v_def text; v_bonus text;
BEGIN
  SELECT indexdef INTO v_def FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'notificacoes_enviadas'
     AND indexname = 'idx_notif_retry';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P37-LAC FAIL (m): idx_notif_retry NÃO existe — a varredura de retry da P41 (RECON-02) faria seq scan num ledger crescente';
  END IF;
  IF strpos(v_def, 'proxima_tentativa_em') = 0 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (m): idx_notif_retry não indexa proxima_tentativa_em: %', v_def;
  END IF;
  IF strpos(v_def, 'WHERE') = 0 OR strpos(v_def, 'pendente') = 0 OR strpos(v_def, 'falhou') = 0 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (m): idx_notif_retry perdeu o predicado parcial com pendente/falhou: %', v_def;
  END IF;

  SELECT indexdef INTO v_bonus FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'notificacoes_enviadas'
     AND indexname = 'idx_notif_provider_msg';
  RAISE NOTICE 'INFO (m): idx_notif_provider_msg presente (reconciliação por webhook da P41): %', v_bonus IS NOT NULL;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (m): idx_notif_retry PRÉ-EXISTENTE cobre proxima_tentativa_em sob o predicado pendente/falhou — verificado, não criado';
END $$;

-- (n) CLEANUP — Apaga APENAS o namespace descartável 37010037-* e as notificações com
--     dedupe_key de prefixo smoke37:. A tabela DEVE terminar com a contagem que tinha no
--     COMEÇO desta execução (baseline capturada na fixture): resíduo de teste polui a
--     auditoria de PROD e envenenaria a reivindicação de idempotência da EF da P38.
--     Phase 50 / 50-08: era «0 linhas, como começou (seção J do dump)» — fotografia de
--     2026-07-22; o ledger de PROD tem linhas reais desde então.
RESET ROLE;
DO $$
DECLARE v_n integer; v_base integer := nullif(current_setting('smoke37.notif_base', true), '')::int;
BEGIN
  PERFORM set_config('request.jwt.claims', '', false);

  DELETE FROM public.notificacoes_enviadas WHERE dedupe_key LIKE 'smoke37:%';
  DELETE FROM public.candidaturas WHERE id = '37010037-0000-4000-8000-000000000d01';
  DELETE FROM public.vagas WHERE id IN (
    '37010037-0000-4000-8000-000000000a01', '37010037-0000-4000-8000-000000000b01');

  IF v_base IS NULL THEN
    RAISE EXCEPTION 'P37-LAC FAIL (n): baseline de notificacoes_enviadas ausente — a fixture nao a capturou; impossivel provar o cleanup';
  END IF;
  SELECT count(*) INTO v_n FROM public.notificacoes_enviadas;
  IF v_n IS DISTINCT FROM v_base THEN
    RAISE EXCEPTION 'P37-LAC FAIL (n): notificacoes_enviadas terminou com % linha(s) (no começo da execução: %) — o smoke deixou resíduo em PROD', v_n, v_base;
  END IF;

  PERFORM set_config('smoke37.pass', (coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (n): cleanup completo — notificacoes_enviadas voltou às % linhas do começo da execução', v_base;
END $$;

-- (o) RESUMO — o gate de contagem. Um run parcial ou todo-SKIP falha AQUI.
DO $$
DECLARE v_n integer;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke37.pass', true), ''), '0')::int;
  -- 15 = as cláusulas DESTE arquivo (a..n + h2): escopo deliberado, não fotografia de dado.
  IF v_n <> 15 THEN
    RAISE EXCEPTION 'P37-LAC FAIL (o): RESUMO % asserções PASS de 15 esperadas — run parcial ou fixture não construída; NÃO tratar como verde', v_n;
  END IF;
  RAISE NOTICE 'RESUMO: % asserções PASS de 15 esperadas — gate VERDE', v_n;
END $$;

SELECT set_config('smoke37.ready', '', false);
RESET ROLE;
