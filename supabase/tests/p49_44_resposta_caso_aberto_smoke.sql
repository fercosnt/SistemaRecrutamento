-- =============================================================================
-- Phase 49 / Plano 49-44 — smoke da LEITURA DO CASO ABERTO PELO RH e do CONGELAMENTO
--                          (WR-07 do 49-REVIEW-GAPS-4 / JORN-41)
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261003000001).
--   · `public.ler_resposta_caso_aberto_sjt(uuid)`: o RH dono da vaga e o administrador leem o
--     texto que o candidato gravou na resposta do caso aberto da SJT; RH de outra vaga, chamada
--     sem claims e o próprio candidato recebem 42501; `anon` não tem EXECUTE. Estados de borda
--     distintos, sem causa inventada; o rascunho de um caso aberto não enviado nunca sai.
--   · `public.caso_aberto_sjt_enviado(uuid)` + `cand_congela_caso_aberto_{ins,upd,del}`
--     (RESTRICTIVE, TO authenticated): depois que a linha `scores_candidato` `sjt`/`caso_aberto`
--     nasce, o titular não reescreve nem apaga o caso aberto; antes dela, a trava por etapa deixa
--     as três operações; a linha de outro `teste` segue gravável; o motor de exclusão (dono da
--     tabela) continua redigindo.
--   · Nenhum caminho NOVO de leitura da tabela: o RH e o administrador contam 0 linhas direto.
--
--   ⚠ Este smoke NÃO prova (e nenhuma cláusula afirma) que o texto lido é o que a IA analisou: o
--   congelamento só fecha a janela POSTERIOR ao nascimento da linha de score. R1, R2 e R3 estão
--   nomeadas no cabeçalho da migration («O QUE O CONGELAMENTO NÃO FECHA»).
--
-- FIXTURES — NÃO SÃO CANDIDATURAS REAIS (idioma do `p49_revisao_por_analise_smoke`): um titular
-- sintético `@invalido.local` por candidatura (auth.users + candidatos), candidaturas que nascem
-- `status = 'rejeitado'` (desarma `trg_notif_confirmacao`) e vão a `em_analise` por UPDATE só de
-- status (exceto E), numa vaga VIVA com `created_by` não nulo LIDA NA EXECUÇÃO; o administrador é
-- REAL e ATIVO, lido de `usuarios_rh` na execução. Todas na MESMA subtransação.
--   A  decisao_final, enviada (score sjt/caso_aberto `sucesso` com motivos_revisao =
--      ["instrucao_ao_modelo"]), autosave com texto conhecido (quebra de linha e acento).
--   B  avaliacao_assincrona, NÃO enviada (sem score), rascunho salvo.
--   C  decisao_final, enviada, SEM autosave.
--   D  decisao_final, enviada, autosave já com {"redigido":"anonimizacao_p49"}.
--   E  ENCERRADA (nasce `rejeitado` e fica; `public.candidatura_encerrada(etapa_atual, status)`
--      verdadeiro — o predicado canônico do D-21, chamado e não recriado), enviada, com texto.
--   F  avaliacao_assincrona, autosave com texto e SEM score no início (a linha nasce no meio de (g)).
--   G  avaliacao_assincrona, enviada, SEM autosave.
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL encerrada
-- por `RAISE EXCEPTION` com SQLSTATE próprio (`P49C1`), capturado logo acima: ROLLBACK de tudo,
-- inclusive do que os triggers enfileiram em `net.http_request_queue`. Nenhum e-mail sai (D-54).
--
-- ⚠ CADA chamada e CADA sonda vão no SEU PRÓPRIO bloco `BEGIN … EXCEPTION WHEN OTHERS` que guarda
-- `SQLSTATE:SQLERRM` (ou a contagem de linhas). O julgamento roda FORA da subtransação e reprova a
-- PRIMEIRA cláusula quebrada, na ordem a, b, c, d, e, f, g, h, z.
--
-- CLÁUSULAS.
--   (a) ACL da RPC e do helper: `anon` sem EXECUTE, `authenticated` com. Sob `SET LOCAL ROLE anon`
--       as duas chamadas falham com `permission denied for function`, e NÃO com `forbidden`: o ACL e
--       a guarda dão o mesmo SQLSTATE (42501), e só a mensagem os distingue.
--   (b) claims `rh` com `sub` = `created_by` da vaga ⇒ A `disponivel`, md5(texto) = md5 da fixture.
--   (c) administrador ATIVO real ⇒ A `disponivel`, mesmo md5.
--   (d) sobre a fixture POVOADA: `rh` com `sub` aleatório ⇒ 42501; sem claims ⇒ 42501; claims
--       `candidato` com `sub` = o titular de A ⇒ 42501; `sub` VÁLIDO (o dono da vaga) SEM
--       `app_metadata.role` ⇒ 42501 (a metade «papel nulo» da guarda fail-closed: com `sub`
--       presente, só o `coalesce` recusa — WR-02 do 49-REVIEW-GAPS-8); candidatura inexistente com
--       claims `rh` do dono ⇒ 42501 (inexistente e alheia indistinguíveis); inexistente com
--       administrador ⇒ P0002. A sonda nova foi posta DENTRO de (d), e não numa cláusula própria:
--       ela é mais uma negativa da guarda sobre a mesma fixture, e assim o esperado segue 9 e o
--       contrato `esperado === 9` que o 49-45 consome não muda.
--   (e) B ⇒ `sem_resposta_enviada`, `texto` nulo, e nem o rascunho nem o md5 dele aparecem no
--       retorno; C ⇒ `indisponivel`; D ⇒ `removida`; E (encerrada) ⇒ `disponivel` para
--       o dono, com o texto de E. `removida` é neutro: o marcador `redigido` sai do motor de
--       exclusão tanto no direito do titular quanto na purga de retenção, e não prova quem pediu.
--   (f) Sob `SET LOCAL ROLE authenticated`, `count(*)` direto de `respostas_avaliacao` da
--       candidatura A = 0 para o RH dono, o administrador e o titular de F; como `postgres` = 1
--       (população). Sob `SET LOCAL ROLE anon`, nem contagem ≥ 1 nem leitura: o retorno registra
--       qual dos dois aconteceu.
--   (g) Titular de F (`SET LOCAL ROLE authenticated` + claims `candidato`). Cada sonda negativa usa a
--       MESMA instrução do seu controle (as três instruções são constantes de texto, executadas por
--       `EXECUTE … USING`). Controles ANTES da linha de score, escrevendo T: [c_upsert] upsert
--       passa; [c_upd] UPDATE afeta 1; [c_del] DELETE afeta 1; [c_ins] o mesmo upsert, sem linha
--       (INSERT puro), passa e repõe T. Como `postgres`, nasce a linha de score de F. DEPOIS,
--       escrevendo T2 ≠ T: [upsert] 42501; [upd] afeta 0; [del] afeta 0; [md5] o texto de F tem o
--       md5 de T (prova sozinha que nenhuma das três escritas o alterou); na linha `teste = 'sjt_mc'`
--       da mesma candidatura [mc] o upsert passa, [mc_upd] e [mc_del] afetam 1 cada. Titular de G:
--       [g_ins] o mesmo upsert de `sjt_caso_aberto` dá 42501. O julgamento lista TODOS os rótulos
--       que falharam numa linha só: `P49C FAIL (g): [<rótulo>,…]: …`. Rótulo `c_*` na lista = sonda
--       VÁCUA (o controle não passou), não «portão aberto».
--   (h) Como `postgres` (o papel do motor `anonimizar_candidato`, SECURITY DEFINER, dono da tabela,
--       sem FORCE RLS), o UPDATE de F para o marcador `redigido` afeta 1 linha, e a RPC com claims
--       do dono devolve `removida`. No catálogo: `relforcerowsecurity` falso; toda
--       sobrecarga de `anonimizar_candidato` é `prosecdef` com dono = dono de `respostas_avaliacao`
--       (população: ≥ 1 sobrecarga).
--   (z) nada das fixtures sobrevive; contagens globais = baseline capturada NA execução.
--
-- O PORTÃO MORDE — mutações M1..M8 provadas no 49-44 (Task 2, 2026-10-03), M9 na rodada de conserto
-- do 49-REVIEW-GAPS-8 (WR-02, 2026-10-03), todas por `scripts/p49_44_mutacoes.cjs`,
-- cada uma numa requisição que aborta: `SET LOCAL lock_timeout/statement_timeout` + migration
-- intacta + MUTAÇÃO + este smoke + `RAISE 'ENSAIO_P49_44_TERMINOU'`. Cada uma tem de reprovar na
-- letra abaixo (e, em (g), com o rótulo abaixo na lista) e NÃO chegar ao sentinela. A próxima
-- redefinição destes objetos tem de re-provar esta tabela (re-pin consciente, PATTERNS §C) — uma
-- cláusula nova sem mutação que a reprove é cláusula não vigiada:
--   | Mutação | Inversão                                                        | Reprova | Rótulo (g) |
--   |---------|-----------------------------------------------------------------|---------|------------|
--   | M1      | RPC sem a condição de posse do `rh`                              | (d)     | —          |
--   | M2      | RPC sem a guarda de papel inteira                                | (d)     | —          |
--   | M3      | RPC sem a condição de envio (devolve o rascunho)                 | (e)     | —          |
--   | M4      | helper `caso_aberto_sjt_enviado` sempre falso                    | (g)     | upsert     |
--   | M5      | `GRANT EXECUTE` da RPC a `anon`                                  | (a)     | —          |
--   | M6      | `cand_congela_caso_aberto_ins` sem `AS RESTRICTIVE`              | (g)     | g_ins      |
--   | M7      | `cand_congela_caso_aberto_upd` sem `AS RESTRICTIVE`              | (g)     | upd        |
--   | M8      | `cand_congela_caso_aberto_del` sem `AS RESTRICTIVE`              | (g)     | del        |
--   | M9      | guarda sem o `coalesce` (`v_role NOT IN`: papel nulo com `sub`)  | (d)     | —          |
--   Listas completas medidas em 2026-10-03 (o runner exige só o rótulo esperado): M4
--   [upsert,upd,del,md5,g_ins]; M6 [g_ins]; M7 [upd,md5]; M8 [del,md5]. Sob M7 o upsert SEGUE
--   dando 42501: a WITH CHECK da `_ins` intacta vale para a linha proposta também no caminho
--   `ON CONFLICT DO UPDATE` — por isso a sonda que pega a `_upd` é o UPDATE puro, não o upsert.
--
-- Varredura D-56 (forma) — 2026-10-03, padrão do CLAUDE.md §«Portões» sobre `supabase/tests/*.sql`
-- menos este arquivo, tomando as linhas que também citam `respostas_avaliacao`, `pg_policies`,
-- `policyname`, `polname`, `prosecdef`, `proacl`, `has_function_privilege` ou `caso_aberto`.
--   População da forma: 326 linhas. Achados que tocam esses objetos: 0 — nenhuma contagem contra
--   constante e nenhuma lista literal sobre policies, ACL ou `respostas_avaliacao` fica cega ou
--   reprova com os objetos novos. Resultado válido, escrito com a população.
--   O padrão de linha não vê consulta que atravessa várias linhas; por isso, lidos à mão, os smokes
--   que citam `respostas_avaliacao`:
--   · p45_motor_exclusao_smoke.sql — baseline `count(*)` global (linha 878), INSERT da sentinela
--     (linha 1490) e leitura depois do motor (linhas 1744, 1815, 1982): tudo como `postgres`, sem
--     `SET ROLE` no arquivo; o motor é SECURITY DEFINER e escreve como dono. As políticas novas são
--     `TO authenticated`: o congelamento não muda o que ele assere.
--   · p49_motor_antes_depois.sql — `count(*)` por candidatura (linhas 68, 71), como `postgres`, sem
--     `SET ROLE` no arquivo: só leitura, fora do alcance das políticas. Não muda.
--   Este arquivo tem constantes deliberadas (o esperado 9 e as contagens 0/1 das sondas): são
--   ESCOPO das fixtures que ele mesmo cria, não fotografia do banco; as contagens globais de (z)
--   são baseline capturada na execução.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p49_44_resposta_caso_aberto_smoke.sql` —
-- UMA requisição, UMA sessão (depois do apply da migration, no 49-45; antes dele, só dentro do
-- ensaio que aborta). O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer FAIL é
-- `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), não uma fotografia do banco. Hoje: 9 — a, b, c, d, e, f, g, h, z.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke4944.pass', '0', false);
SELECT set_config('smoke4944.fixtures', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura) e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_vaga  uuid;
  v_dono  uuid;
  v_admin uuid;
BEGIN
  SELECT v.id, v.created_by INTO v_vaga, v_dono
    FROM public.vagas v
   WHERE v.created_by IS NOT NULL AND v.deleted_at IS NULL
   ORDER BY v.created_at, v.id
   LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P49C FAIL (baseline): nenhuma vaga viva com created_by — sem dono nao ha RH que leia pela posse';
  END IF;

  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P49C FAIL (baseline): nenhum administrador ATIVO — a clausula (c) nao teria ator';
  END IF;

  PERFORM set_config('smoke4944.vaga',  v_vaga::text,  false);
  PERFORM set_config('smoke4944.dono',  v_dono::text,  false);
  PERFORM set_config('smoke4944.admin', v_admin::text, false);

  PERFORM set_config('smoke4944.n_users', (SELECT count(*) FROM auth.users)::text, false);
  PERFORM set_config('smoke4944.n_candidatos', (SELECT count(*) FROM public.candidatos)::text, false);
  PERFORM set_config('smoke4944.n_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke4944.n_sc',    (SELECT count(*) FROM public.scores_candidato)::text, false);
  PERFORM set_config('smoke4944.n_ra',    (SELECT count(*) FROM public.respostas_avaliacao)::text, false);
  PERFORM set_config('smoke4944.n_hist',  (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke4944.n_notif', (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke4944.n_netq',  (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — fixtures + medições numa subtransação que reverte (`P49C1`); julgamento fora dela.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_vaga   uuid := current_setting('smoke4944.vaga')::uuid;
  v_dono   uuid := current_setting('smoke4944.dono')::uuid;
  v_admin  uuid := current_setting('smoke4944.admin')::uuid;
  v_ids    text := '';
  v_ran    boolean := false;
  v_err    text;
  v_user   uuid;
  v_email  text;
  v_cand   uuid;
  v_cid    uuid;
  v_cids   uuid[] := '{}';
  v_tits   uuid[] := '{}';
  v_ret    jsonb;
  v_n      bigint;
  i        int;
  -- índices das fixtures em v_cids / v_tits
  c_a constant int := 1;  c_b constant int := 2;  c_c constant int := 3;  c_d constant int := 4;
  c_e constant int := 5;  c_f constant int := 6;  c_g constant int := 7;
  c_etapas constant text[] := ARRAY['decisao_final', 'avaliacao_assincrona', 'decisao_final',
                                    'decisao_final', 'decisao_final', 'avaliacao_assincrona',
                                    'avaliacao_assincrona'];
  c_texto    constant text := E'Primeiro eu ouviria a paciente com atenção.\nDepois explicaria o protocolo de biossegurança, com calma e sem pressa.';
  c_texto_e  constant text := E'Candidatura encerrada: a resposta segue legível para o dono da vaga.\nÚltima linha.';
  c_rascunho constant text := 'Rascunho ainda não enviado — p4944 marcador de rascunho.';
  c_t        constant text := E'Texto T do controle.\nCom acentuação e quebra.';
  c_t2       constant text := 'Texto T2 da sonda, diferente de T.';
  c_teste    constant text := 'sjt_caso_aberto';
  -- As MESMAS três instruções para controle e sonda (texto SQL idêntico; só o estado e o valor mudam).
  c_sql_upsert constant text :=
    'INSERT INTO public.respostas_avaliacao (candidatura_id, teste, respostas) '
    || 'VALUES ($1, $2, jsonb_build_object(''texto'', $3::text)) '
    || 'ON CONFLICT (candidatura_id, teste) DO UPDATE SET respostas = EXCLUDED.respostas';
  c_sql_upd constant text :=
    'UPDATE public.respostas_avaliacao SET respostas = jsonb_build_object(''texto'', $3::text) '
    || 'WHERE candidatura_id = $1 AND teste = $2';
  c_sql_del constant text :=
    'DELETE FROM public.respostas_avaliacao WHERE candidatura_id = $1 AND teste = $2';
  -- (a)
  a_anon_rpc text := '<nao rodou>';  a_anon_helper text := '<nao rodou>';
  a_anon_r boolean;  a_auth_r boolean;  a_anon_h boolean;  a_auth_h boolean;
  -- (b) (c)
  b_state text := '<nao rodou>';  b_sit text;  b_md5 text;
  c_state text := '<nao rodou>';  c_sit text;  c_md5 text;
  -- (d)
  d_alheio text := '<nao rodou>';  d_sem text := '<nao rodou>';  d_cand text := '<nao rodou>';
  d_inex_rh text := '<nao rodou>';  d_inex_adm text := '<nao rodou>';  d_sem_papel text := '<nao rodou>';
  -- (e)
  e_b_state text := '<nao rodou>';  e_b_ret jsonb;
  e_c_state text := '<nao rodou>';  e_c_ret jsonb;
  e_d_state text := '<nao rodou>';  e_d_ret jsonb;
  e_e_state text := '<nao rodou>';  e_e_ret jsonb;  e_e_encerrada boolean;
  -- (f)
  f_rh text := '<nao rodou>';  f_adm text := '<nao rodou>';  f_titf text := '<nao rodou>';
  f_pg bigint;  f_anon text := '<nao rodou>';
  -- (g)
  g_c_upsert text := '<nao rodou>';  g_c_upd bigint;  g_c_del bigint;  g_c_ins text := '<nao rodou>';
  g_upsert text := '<nao rodou>';  g_upd bigint;  g_del bigint;  g_md5 text;
  g_mc text := '<nao rodou>';  g_mc_upd bigint;  g_mc_del bigint;  g_g_ins text := '<nao rodou>';
  g_rot text[] := '{}';
  -- (h)
  h_upd bigint;  h_state text := '<nao rodou>';  h_sit text;
  h_force boolean;  h_n_anon int;  h_n_ok int;  h_dono_tab text;
BEGIN
  BEGIN
    -- ── fixtures A..G · um titular sintético por candidatura ───────────────────
    FOR i IN 1 .. 7 LOOP
      v_user  := gen_random_uuid();
      v_email := 'p4944smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
      VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              v_email, '', now(), now(),
              '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
      INSERT INTO public.candidatos
        (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
      VALUES
        (v_user, 'SMOKE P49C Titular ' || i, v_email, '(11) 94444-49' || lpad(i::text, 2, '0'),
         DATE '1992-03-10', 'Santos', 'SP', 'site')
      RETURNING id INTO v_cand;
      INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
      VALUES (v_cand, v_vaga, c_etapas[i]::public.etapa_processo, 'rejeitado', false, now() - interval '10 days')
      RETURNING id INTO v_cid;
      IF i <> c_e THEN
        UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cid;
      END IF;
      v_cids := v_cids || v_cid;
      v_tits := v_tits || v_user;
      v_ids  := v_ids || v_cid::text || ',';
    END LOOP;

    -- linhas de score do caso aberto: A, C, D, E, G (B não enviada; F nasce no meio de (g))
    INSERT INTO public.scores_candidato (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
    SELECT x, 'sjt', 'caso_aberto', NULL, 18, 25, 'sucesso',
           jsonb_build_object('motivos_revisao', jsonb_build_array('instrucao_ao_modelo'))
      FROM unnest(ARRAY[v_cids[c_a], v_cids[c_c], v_cids[c_d], v_cids[c_e], v_cids[c_g]]) AS x;

    -- autosaves: A texto; B rascunho; D redigido; E texto; F texto T (C e G sem autosave)
    INSERT INTO public.respostas_avaliacao (candidatura_id, teste, respostas) VALUES
      (v_cids[c_a], c_teste, jsonb_build_object('texto', c_texto)),
      (v_cids[c_b], c_teste, jsonb_build_object('texto', c_rascunho)),
      (v_cids[c_d], c_teste, '{"redigido":"anonimizacao_p49"}'::jsonb),
      (v_cids[c_e], c_teste, jsonb_build_object('texto', c_texto_e)),
      (v_cids[c_f], c_teste, jsonb_build_object('texto', c_t));

    -- ── (a) · sob anon as duas chamadas morrem no ACL, não na guarda ───────────
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      a_anon_rpc := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN a_anon_rpc := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      PERFORM public.caso_aberto_sjt_enviado(v_cids[c_a]);
      a_anon_helper := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN a_anon_helper := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;

    -- ── (b) · RH dono da vaga lê A ─────────────────────────────────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      b_sit := v_ret ->> 'situacao';  b_md5 := md5(v_ret ->> 'texto');  b_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN b_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (c) · administrador ATIVO real lê A ────────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      c_sit := v_ret ->> 'situacao';  c_md5 := md5(v_ret ->> 'texto');  c_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN c_state := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (d) · negativas sobre a fixture POVOADA ────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      d_alheio := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_alheio := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      d_sem := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_sem := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tits[c_a]::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      d_cand := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_cand := SQLSTATE || ':' || SQLERRM;
    END;
    -- papel AUSENTE com `sub` VÁLIDO (o próprio dono da vaga): só o `coalesce(v_role, '')` recusa.
    -- Sem ele, `v_uid IS NULL OR v_role NOT IN (…)` dá `false OR NULL` = NULL e o IF não dispara;
    -- `v_role = 'rh'` também é NULL, e a função devolveria o texto (M9). A sonda «sem claims» não
    -- vê isso, porque nela `auth.uid()` também é nulo e a guarda recusa pelo `v_uid IS NULL`.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
              'app_metadata', json_build_object())::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_a]);
      d_sem_papel := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_sem_papel := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(gen_random_uuid());
      d_inex_rh := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_inex_rh := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(gen_random_uuid());
      d_inex_adm := 'ACEITO:' || coalesce(v_ret ->> 'situacao', '?');
    EXCEPTION WHEN OTHERS THEN d_inex_adm := SQLSTATE || ':' || SQLERRM;
    END;

    -- ── (e) · estados de borda, lidos pelo dono ────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      e_b_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_b]);  e_b_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN e_b_state := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      e_c_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_c]);  e_c_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN e_c_state := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      e_d_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_d]);  e_d_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN e_d_state := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      e_e_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_e]);  e_e_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN e_e_state := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    SELECT public.candidatura_encerrada(c.etapa_atual, c.status) INTO e_e_encerrada
      FROM public.candidaturas c WHERE c.id = v_cids[c_e];

    -- ── (f) · nenhum caminho novo de leitura direta da tabela ──────────────────
    SELECT count(*) INTO f_pg FROM public.respostas_avaliacao ra WHERE ra.candidatura_id = v_cids[c_a];
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      SELECT count(*) INTO v_n FROM public.respostas_avaliacao ra WHERE ra.candidatura_id = v_cids[c_a];
      f_rh := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_rh := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN
      SELECT count(*) INTO v_n FROM public.respostas_avaliacao ra WHERE ra.candidatura_id = v_cids[c_a];
      f_adm := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_adm := SQLSTATE || ':' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tits[c_f]::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN
      SELECT count(*) INTO v_n FROM public.respostas_avaliacao ra WHERE ra.candidatura_id = v_cids[c_a];
      f_titf := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_titf := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      SELECT count(*) INTO v_n FROM public.respostas_avaliacao ra WHERE ra.candidatura_id = v_cids[c_a];
      f_anon := 'contagem=' || v_n::text;
    EXCEPTION WHEN OTHERS THEN f_anon := 'leitura recusada=' || SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;

    -- ── (g) · o congelamento, com controle da MESMA instrução ─────────────────
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tits[c_f]::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    -- controles, ANTES da linha de score de F (escrevem T)
    BEGIN
      EXECUTE c_sql_upsert USING v_cids[c_f], c_teste, c_t;  g_c_upsert := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN g_c_upsert := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      EXECUTE c_sql_upd USING v_cids[c_f], c_teste, c_t;  GET DIAGNOSTICS g_c_upd = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN g_c_upd := -1;
    END;
    BEGIN
      EXECUTE c_sql_del USING v_cids[c_f], c_teste;  GET DIAGNOSTICS g_c_del = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN g_c_del := -1;
    END;
    BEGIN
      EXECUTE c_sql_upsert USING v_cids[c_f], c_teste, c_t;  g_c_ins := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN g_c_ins := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;

    -- a linha de score de F nasce (como no FIM da chamada de IA da avaliar-redacao)
    INSERT INTO public.scores_candidato (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
    VALUES (v_cids[c_f], 'sjt', 'caso_aberto', NULL, 15, 25, 'sucesso', '{}'::jsonb);

    -- sondas, DEPOIS (escrevem T2 ≠ T)
    SET LOCAL ROLE authenticated;
    BEGIN
      EXECUTE c_sql_upsert USING v_cids[c_f], c_teste, c_t2;  g_upsert := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN g_upsert := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      EXECUTE c_sql_upd USING v_cids[c_f], c_teste, c_t2;  GET DIAGNOSTICS g_upd = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN g_upd := -1;
    END;
    BEGIN
      EXECUTE c_sql_del USING v_cids[c_f], c_teste;  GET DIAGNOSTICS g_del = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN g_del := -1;
    END;
    -- outro `teste` da MESMA candidatura segue gravável, atualizável e apagável
    BEGIN
      EXECUTE c_sql_upsert USING v_cids[c_f], 'sjt_mc', c_t;  g_mc := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN g_mc := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      EXECUTE c_sql_upd USING v_cids[c_f], 'sjt_mc', c_t2;  GET DIAGNOSTICS g_mc_upd = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN g_mc_upd := -1;
    END;
    BEGIN
      EXECUTE c_sql_del USING v_cids[c_f], 'sjt_mc';  GET DIAGNOSTICS g_mc_del = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN g_mc_del := -1;
    END;
    -- titular de G (enviada, sem autosave): o INSERT puro do caso aberto
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tits[c_g]::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN
      EXECUTE c_sql_upsert USING v_cids[c_g], c_teste, c_t;  g_g_ins := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN g_g_ins := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    SELECT md5(ra.respostas ->> 'texto') INTO g_md5
      FROM public.respostas_avaliacao ra WHERE ra.candidatura_id = v_cids[c_f] AND ra.teste = c_teste;

    -- ── (h) · o motor (dono da tabela) redige a linha congelada ────────────────
    UPDATE public.respostas_avaliacao
       SET respostas = '{"redigido":"anonimizacao_p49"}'::jsonb
     WHERE candidatura_id = v_cids[c_f] AND teste = c_teste;
    GET DIAGNOSTICS h_upd = ROW_COUNT;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_dono::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN
      v_ret := public.ler_resposta_caso_aberto_sjt(v_cids[c_f]);  h_sit := v_ret ->> 'situacao';  h_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN h_state := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49C1';
  EXCEPTION
    WHEN SQLSTATE 'P49C1' THEN
      NULL;  -- ROLLBACK da subtransação. Os valores medidos estão nas variáveis acima.
    WHEN OTHERS THEN
      v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;

  RESET ROLE;
  PERFORM set_config('smoke4944.fixtures', v_ids, false);
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P49C FAIL (parte 1): a subtransacao abortou por erro INESPERADO (%) — nenhuma clausula foi julgada; o defeito e da FIXTURE, nao dos objetos vigiados (cada chamada tem bloco de excecao proprio)', v_err;
  END IF;
  IF NOT v_ran THEN
    RAISE EXCEPTION 'P49C FAIL (parte 1): a subtransacao nao chegou ao fim e nao houve erro capturado — estado impossivel';
  END IF;

  -- Catálogo, FORA da subtransação (nada aqui depende das fixtures).
  a_anon_r := coalesce(has_function_privilege('anon',          to_regprocedure('public.ler_resposta_caso_aberto_sjt(uuid)'), 'EXECUTE'), true);
  a_auth_r := coalesce(has_function_privilege('authenticated', to_regprocedure('public.ler_resposta_caso_aberto_sjt(uuid)'), 'EXECUTE'), false);
  a_anon_h := coalesce(has_function_privilege('anon',          to_regprocedure('public.caso_aberto_sjt_enviado(uuid)'), 'EXECUTE'), true);
  a_auth_h := coalesce(has_function_privilege('authenticated', to_regprocedure('public.caso_aberto_sjt_enviado(uuid)'), 'EXECUTE'), false);
  SELECT c.relforcerowsecurity, pg_get_userbyid(c.relowner) INTO h_force, h_dono_tab
    FROM pg_catalog.pg_class c WHERE c.oid = 'public.respostas_avaliacao'::regclass;
  SELECT count(*), count(*) FILTER (WHERE p.prosecdef AND pg_get_userbyid(p.proowner) = h_dono_tab)
    INTO h_n_anon, h_n_ok
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'anonimizar_candidato';

  -- ═══ JULGAMENTO, FORA da subtransação, na ordem a..h ═══

  -- (a)
  IF a_anon_rpc NOT LIKE '42501:%permission denied for function%'
     OR a_anon_helper NOT LIKE '42501:%permission denied for function%' THEN
    RAISE EXCEPTION 'P49C FAIL (a): sob SET LOCAL ROLE anon, RPC=«%» e helper=«%» (esperado 42501 permission denied for function nos dois — o ACL, nao a guarda: um «forbidden» quer dizer que anon TEM EXECUTE e so a guarda segurou)',
      a_anon_rpc, a_anon_helper;
  END IF;
  IF a_anon_r OR NOT a_auth_r OR a_anon_h OR NOT a_auth_h THEN
    RAISE EXCEPTION 'P49C FAIL (a): ACL — RPC anon=% authenticated=% ; helper anon=% authenticated=% (esperado false/true nos dois: o grant do pg_default_acl a anon e DIRETO; a policy roda com o papel de quem consulta)',
      a_anon_r, a_auth_r, a_anon_h, a_auth_h;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);

  -- (b)
  IF b_state IS DISTINCT FROM 'ACEITO' OR b_sit IS DISTINCT FROM 'disponivel' OR b_md5 IS DISTINCT FROM md5(c_texto) THEN
    RAISE EXCEPTION 'P49C FAIL (b): o RH dono da vaga (%) leu A com estado «%», situacao=% e md5(texto)=% (esperado ACEITO, disponivel, %) — o dono tem de ler o texto byte a byte',
      v_dono, b_state, b_sit, b_md5, md5(c_texto);
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);

  -- (c)
  IF c_state IS DISTINCT FROM 'ACEITO' OR c_sit IS DISTINCT FROM 'disponivel' OR c_md5 IS DISTINCT FROM md5(c_texto) THEN
    RAISE EXCEPTION 'P49C FAIL (c): o administrador ativo (%) leu A com estado «%», situacao=% e md5(texto)=% (esperado ACEITO, disponivel, %)',
      v_admin, c_state, c_sit, c_md5, md5(c_texto);
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);

  -- (d)
  IF d_alheio NOT LIKE '42501:%' OR d_sem NOT LIKE '42501:%' OR d_cand NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P49C FAIL (d): sobre a fixture POVOADA, rh de outra vaga=«%», sem claims=«%», candidato titular=«%» (esperado 42501 nos tres) — alguem fora do predicado WR-04 leu o texto',
      d_alheio, d_sem, d_cand;
  END IF;
  IF d_inex_rh NOT LIKE '42501:%' OR d_inex_adm NOT LIKE 'P0002:%' THEN
    RAISE EXCEPTION 'P49C FAIL (d): candidatura inexistente — rh=«%» (esperado 42501: inexistente e alheia indistinguiveis para o rh), administrador=«%» (esperado P0002)',
      d_inex_rh, d_inex_adm;
  END IF;
  IF d_sem_papel NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P49C FAIL (d): sub VALIDO (o dono da vaga) SEM app_metadata.role devolveu «%» (esperado 42501) — a guarda deixou de ser fail-closed para papel nulo (o coalesce(v_role, '''') saiu?)',
      d_sem_papel;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);

  -- (e)
  IF e_b_state IS DISTINCT FROM 'ACEITO' OR e_b_ret ->> 'situacao' IS DISTINCT FROM 'sem_resposta_enviada'
     OR NOT (e_b_ret ? 'texto') OR e_b_ret -> 'texto' IS DISTINCT FROM 'null'::jsonb
     OR position(c_rascunho IN e_b_ret::text) > 0 OR position(md5(c_rascunho) IN e_b_ret::text) > 0 THEN
    RAISE EXCEPTION 'P49C FAIL (e): B (nao enviada, com rascunho) devolveu estado «%» e situacao=% (esperado sem_resposta_enviada com texto nulo, sem o rascunho nem o md5 dele no retorno; rascunho no retorno=%) — o rascunho nunca sai',
      e_b_state, e_b_ret ->> 'situacao', position(c_rascunho IN coalesce(e_b_ret::text, '')) > 0;
  END IF;
  IF e_c_state IS DISTINCT FROM 'ACEITO' OR e_c_ret ->> 'situacao' IS DISTINCT FROM 'indisponivel' OR e_c_ret -> 'texto' IS DISTINCT FROM 'null'::jsonb THEN
    RAISE EXCEPTION 'P49C FAIL (e): C (enviada, sem autosave) devolveu estado «%» e %', e_c_state, e_c_ret;
  END IF;
  IF e_d_state IS DISTINCT FROM 'ACEITO' OR e_d_ret ->> 'situacao' IS DISTINCT FROM 'removida' OR e_d_ret -> 'texto' IS DISTINCT FROM 'null'::jsonb THEN
    RAISE EXCEPTION 'P49C FAIL (e): D (enviada, redigida pelo motor) devolveu estado «%» e %', e_d_state, e_d_ret;
  END IF;
  IF e_e_encerrada IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P49C FAIL (e): a fixture E nao esta encerrada pelo predicado canonico candidatura_encerrada (=%) — a prova de populacao do caso encerrada falhou', e_e_encerrada;
  END IF;
  IF e_e_state IS DISTINCT FROM 'ACEITO' OR e_e_ret ->> 'situacao' IS DISTINCT FROM 'disponivel'
     OR md5(e_e_ret ->> 'texto') IS DISTINCT FROM md5(c_texto_e) THEN
    RAISE EXCEPTION 'P49C FAIL (e): E (encerrada, enviada) devolveu estado «%» e situacao=% (esperado disponivel com o texto de E) — o dono da vaga le a nota e a redacao da candidatura encerrada, e le o texto tambem',
      e_e_state, e_e_ret ->> 'situacao';
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);

  -- (f)
  IF f_pg IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49C FAIL (f): como postgres, A tem % linha(s) em respostas_avaliacao (esperado 1) — sem populacao, os zeros abaixo seriam vacuos', f_pg;
  END IF;
  IF f_rh IS DISTINCT FROM '0' OR f_adm IS DISTINCT FROM '0' OR f_titf IS DISTINCT FROM '0' THEN
    RAISE EXCEPTION 'P49C FAIL (f): sob SET LOCAL ROLE authenticated, count(*) direto de A: rh dono=%, administrador=%, titular de F=% (esperado 0 nos tres) — um caminho NOVO de leitura da tabela apareceu',
      f_rh, f_adm, f_titf;
  END IF;
  IF f_anon IS DISTINCT FROM 'contagem=0' AND f_anon NOT LIKE 'leitura recusada=%' THEN
    RAISE EXCEPTION 'P49C FAIL (f): sob SET LOCAL ROLE anon a leitura direta de A deu «%» (esperado contagem=0 ou leitura recusada)', f_anon;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);

  -- (g) — avalia TODAS as sondas e reprova uma vez só, listando os rótulos que falharam.
  IF g_c_upsert IS DISTINCT FROM 'ACEITO' THEN g_rot := g_rot || 'c_upsert'::text; END IF;
  IF g_c_upd    IS DISTINCT FROM 1        THEN g_rot := g_rot || 'c_upd'::text;    END IF;
  IF g_c_del    IS DISTINCT FROM 1        THEN g_rot := g_rot || 'c_del'::text;    END IF;
  IF g_c_ins    IS DISTINCT FROM 'ACEITO' THEN g_rot := g_rot || 'c_ins'::text;    END IF;
  IF g_upsert NOT LIKE '42501:%'          THEN g_rot := g_rot || 'upsert'::text;   END IF;
  IF g_upd      IS DISTINCT FROM 0        THEN g_rot := g_rot || 'upd'::text;      END IF;
  IF g_del      IS DISTINCT FROM 0        THEN g_rot := g_rot || 'del'::text;      END IF;
  IF g_md5      IS DISTINCT FROM md5(c_t) THEN g_rot := g_rot || 'md5'::text;      END IF;
  IF g_mc       IS DISTINCT FROM 'ACEITO' THEN g_rot := g_rot || 'mc'::text;       END IF;
  IF g_mc_upd   IS DISTINCT FROM 1        THEN g_rot := g_rot || 'mc_upd'::text;   END IF;
  IF g_mc_del   IS DISTINCT FROM 1        THEN g_rot := g_rot || 'mc_del'::text;   END IF;
  IF g_g_ins NOT LIKE '42501:%'           THEN g_rot := g_rot || 'g_ins'::text;    END IF;
  IF cardinality(g_rot) > 0 THEN
    RAISE EXCEPTION 'P49C FAIL (g): [%]: controles c_upsert=«%» c_upd=% c_del=% c_ins=«%» ; depois upsert=«%» upd=% del=% md5_bate_T=% ; sjt_mc mc=«%» mc_upd=% mc_del=% ; G g_ins=«%» (rotulo c_* = sonda VACUA, nao portao aberto)',
      array_to_string(g_rot, ','), g_c_upsert, g_c_upd, g_c_del, g_c_ins, g_upsert, g_upd, g_del,
      g_md5 IS NOT DISTINCT FROM md5(c_t), g_mc, g_mc_upd, g_mc_del, g_g_ins;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);

  -- (h)
  IF h_upd IS DISTINCT FROM 1 OR h_state IS DISTINCT FROM 'ACEITO' OR h_sit IS DISTINCT FROM 'removida' THEN
    RAISE EXCEPTION 'P49C FAIL (h): como postgres, o UPDATE de F para o marcador redigido afetou % linha(s) (esperado 1) e a RPC do dono devolveu estado «%» situacao=% (esperado removida) — o congelamento nao pode impedir o motor de exclusao',
      h_upd, h_state, h_sit;
  END IF;
  IF h_force IS DISTINCT FROM false OR h_n_anon < 1 OR h_n_ok IS DISTINCT FROM h_n_anon THEN
    RAISE EXCEPTION 'P49C FAIL (h): catalogo — relforcerowsecurity=% (esperado false), sobrecargas de anonimizar_candidato=% das quais SECURITY DEFINER com dono=% (dono da tabela) = % (esperado >= 1 e todas)',
      h_force, h_n_anon, h_dono_tab, h_n_ok;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) NEGATIVA — nada das fixtures sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  v_ids  uuid[] := coalesce(string_to_array(rtrim(current_setting('smoke4944.fixtures'), ','), ',')::uuid[], '{}');
  l_cand int;  l_sc int;  l_ra int;  l_tit int;  l_usr int;  l_fila int;
  g_users bigint;  g_candidatos bigint;  g_cand bigint;  g_sc bigint;  g_ra bigint;
  g_hist bigint;  g_notif bigint;  g_netq bigint;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P49C FAIL (z): nenhuma fixture registrada — a negativa nao teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = ANY (v_ids);
  SELECT count(*) INTO l_sc   FROM public.scores_candidato sc WHERE sc.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_ra   FROM public.respostas_avaliacao ra WHERE ra.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p4944smoke-%@invalido.local';
  SELECT count(*) INTO l_usr  FROM auth.users u WHERE u.email LIKE 'p4944smoke-%@invalido.local';
  SELECT count(*) INTO l_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_ids::text[]);
  IF l_cand <> 0 OR l_sc <> 0 OR l_ra <> 0 OR l_tit <> 0 OR l_usr <> 0 OR l_fila <> 0 THEN
    RAISE EXCEPTION 'P49C FAIL (z): RESIDUO das fixtures — candidaturas=% notas=% respostas=% titulares=% usuarios=% fila=% (a subtransacao nao reverteu)',
      l_cand, l_sc, l_ra, l_tit, l_usr, l_fila;
  END IF;

  SELECT count(*) INTO g_users      FROM auth.users;
  SELECT count(*) INTO g_candidatos FROM public.candidatos;
  SELECT count(*) INTO g_cand       FROM public.candidaturas;
  SELECT count(*) INTO g_sc         FROM public.scores_candidato;
  SELECT count(*) INTO g_ra         FROM public.respostas_avaliacao;
  SELECT count(*) INTO g_hist       FROM public.historico_candidatura;
  SELECT count(*) INTO g_notif      FROM public.notificacoes_enviadas;
  SELECT count(*) INTO g_netq       FROM net.http_request_queue;
  IF g_users         IS DISTINCT FROM current_setting('smoke4944.n_users')::bigint
     OR g_candidatos IS DISTINCT FROM current_setting('smoke4944.n_candidatos')::bigint
     OR g_cand       IS DISTINCT FROM current_setting('smoke4944.n_cand')::bigint
     OR g_sc         IS DISTINCT FROM current_setting('smoke4944.n_sc')::bigint
     OR g_ra         IS DISTINCT FROM current_setting('smoke4944.n_ra')::bigint
     OR g_hist       IS DISTINCT FROM current_setting('smoke4944.n_hist')::bigint
     OR g_notif      IS DISTINCT FROM current_setting('smoke4944.n_notif')::bigint
     OR g_netq       IS DISTINCT FROM current_setting('smoke4944.n_netq')::bigint THEN
    RAISE EXCEPTION 'P49C FAIL (z): contagem global mudou (users % -> %, candidatos % -> %, candidaturas % -> %, notas % -> %, respostas % -> %, historico % -> %, notificacoes % -> %, fila % -> %) com residuo ZERO das fixtures — o delta e de trafego concorrente commitado durante a requisicao; rodar de novo',
      current_setting('smoke4944.n_users'), g_users, current_setting('smoke4944.n_candidatos'), g_candidatos,
      current_setting('smoke4944.n_cand'), g_cand, current_setting('smoke4944.n_sc'), g_sc,
      current_setting('smoke4944.n_ra'), g_ra, current_setting('smoke4944.n_hist'), g_hist,
      current_setting('smoke4944.n_notif'), g_notif, current_setting('smoke4944.n_netq'), g_netq;
  END IF;
  PERFORM set_config('smoke4944.pass', (current_setting('smoke4944.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado (contrato consumido pelo 49-45: `JSON.parse(...)[0].resultado`, esperado 9).
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke4944.pass')::int <> 9 THEN
    RAISE EXCEPTION 'P49C FAIL (gate): pass = % de 9 — alguma clausula nao incrementou o contador', current_setting('smoke4944.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',     'p49_44_resposta_caso_aberto',
  'pass',      current_setting('smoke4944.pass')::int,
  'esperado',  9,
  'n_cand',    current_setting('smoke4944.n_cand')::int,
  'n_sc',      current_setting('smoke4944.n_sc')::int,
  'n_ra',      current_setting('smoke4944.n_ra')::int,
  'n_netq',    current_setting('smoke4944.n_netq')::int
) AS resultado;
