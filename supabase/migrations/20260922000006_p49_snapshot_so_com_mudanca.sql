-- =============================================================================
-- 20260922000006 — trg_decisao_final_snapshot + stamp_explicacao_acessada :
--                  o arquivo da decisão passa a ter UMA versão por MUDANÇA REAL
-- =============================================================================
-- Phase 49 / Plano 49-07 · JORN-3b / D-44 / D-45
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-22, só leitura).
--   `decisao_final_historico` tinha 11 linhas em 3 candidaturas. Medido por comparação
--   de `to_jsonb` da linha arquivada com a anterior da MESMA candidatura:
--     · 5 de 11 são IDÊNTICAS à anterior em TODAS as colunas — versão de nada;
--     · 6 de 11 são idênticas fora de `explicacao_solicitada_em` e
--       `alerta_prazo_enviado_em` — a 6ª é o carimbo de LEITURA da explicação
--       (candidatura 2ce20fbf…, arquivada às 00:22:13 de 2026-09-22, cujo único
--       delta é `explicacao_solicitada_em`).
--   São DOIS defeitos somados, e consertar um só não resolve:
--     (1) `trg_decisao_final_snapshot` era `AFTER UPDATE … FOR EACH ROW` SEM `WHEN`
--         (medido: `pg_get_triggerdef` sem cláusula alguma) — arquivava a cada UPDATE,
--         inclusive um que não muda nada;
--     (2) `stamp_explicacao_acessada` fazia
--         `UPDATE … SET explicacao_solicitada_em = COALESCE(explicacao_solicitada_em, now())`
--         SEM filtro: o COALESCE preserva o VALOR, mas o UPDATE ACONTECE — e cada
--         abertura da página da explicação virava uma versão da decisão. O front
--         (`useExplicacao.ts`, guarda por `useRef`) zera a guarda a cada recarga, então
--         N recargas = N UPDATEs.
--   Consequência para o titular: o histórico que ele recebe (o arquivo entra na cópia
--   dele) afirmava que a decisão foi alterada 11 vezes quando 5 dessas alterações não
--   existiram, e uma era ele próprio LENDO a explicação.
--
-- POR QUE `WHEN` POR `to_jsonb`, E NÃO UMA LISTA DE COLUNAS.
--   `WHEN ((OLD.a, OLD.b, …) IS DISTINCT FROM (NEW.a, NEW.b, …))` é uma FOTOGRAFIA do
--   schema: a coluna que alguém acrescentar a `decisao_final` depois fica fora da
--   comparação e passa a mudar SEM arquivar — em silêncio, que é o modo de falha que o
--   CLAUDE.md §«Portões» nomeia. A comparação por `to_jsonb` da linha INTEIRA menos as
--   exclusões cobre coluna nova por construção: ela nasce DENTRO da comparação.
--
-- ⚠ PITFALL 5 — A EXCLUSÃO É DE DUAS COLUNAS, E SÓ DELAS.
--   `explicacao_solicitada_em` (carimbo de leitura do titular) e
--   `alerta_prazo_enviado_em` (telemetria do alerta de prazo, escrita pelo cron) são
--   as duas únicas colunas cuja mudança não é mudança da DECISÃO. Tudo o mais continua
--   arquivando — em especial `justificativa`, que é o que o tombstone do motor de
--   exclusão muda (`anonimizar_candidato`, passo `tombstone_decisao_final`): lá a ORDEM
--   é o mecanismo (arquiva a linha viva ANTES de raspar o arquivo), e um `WHEN` que
--   excluísse `justificativa` desligaria o arquivamento do tombstone sem nenhum erro.
--
-- A LISTA DE EXCLUSÃO É COMPLETA PORQUE `decisao_final` NÃO TEM TRIGGER BEFORE UPDATE.
--   Medido em PROD: os 3 triggers da tabela são os AFTER (`trg_decisao_final_snapshot`,
--   `trg_notif_revisao_solicitada`, `trg_notif_revisao_respondida`). Não há carimbador
--   de `updated_at` — se houvesse, ele mudaria uma coluna em TODO UPDATE e um UPDATE
--   sem mudança voltaria a arquivar. O pós-portão desta migration assere essa ausência,
--   e o `p49_snapshot_smoke.sql` a mantém sob vigilância depois do apply.
--
-- O ARQUIVO SÓ ACEITA ACRÉSCIMO (D-45 / ERASE-08).
--   As 5 linhas sem mudança que já existem FICAM. Nenhuma escrita retroativa aqui:
--   todas são de teste, e apagá-las seria mexer em trilha de auditoria para melhorar
--   uma estatística. O pós-portão confere a contagem (11) intacta.
--
-- `snapshot_decisao_final()` NÃO MUDA NESTA MIGRATION.
--   Ela é PINADA por md5 no pré-portão e RE-CONFERIDA no pós-portão: se o apply a
--   alterasse por acidente, a paridade de colunas do smoke (g) mudaria de significado.
--   A migration só troca QUANDO ela dispara, nunca O QUE ela grava.
--
-- ERRO: `42501` (insufficient_privilege) no guard own-row de
-- `stamp_explicacao_acessada` — inalterado.
--
-- AUTHZ: `stamp_explicacao_acessada` segue SECURITY DEFINER com guard own-row
-- (`ca.user_id = auth.uid()`). `anon` ENTRA no REVOKE das duas funções: medido que
-- `anon` tinha EXECUTE nas duas por grant DIRETO do `pg_default_acl`, que
-- `REVOKE … FROM PUBLIC` sozinho não alcança.
--
-- IDEMPOTÊNCIA: `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`; `CREATE OR REPLACE
-- FUNCTION`. E a própria RPC passa a ser idempotente: `WHERE … AND
-- explicacao_solicitada_em IS NULL` + re-SELECT da linha para o retorno (o idioma de
-- `solicitar_revisao_decisao`, mesmo arquivo de origem). ⚠ Sem o re-SELECT,
-- `RETURNING * INTO` sai VAZIO na 2ª chamada e a RPC devolveria NULL ao front.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL
-- `$$` com REVOKE/COMMENT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000006_p49_snapshot_so_com_mudanca.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- ⚠ Nenhum reparo de `version` a fazer: por esta via ela nasce do NOME DO ARQUIVO.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — o corpo VIVO das duas funções é o que esta migration presume.
--   `stamp_explicacao_acessada` vai ser REDEFINIDA: o pin protege contra reescrever
--   por cima de uma divergência viva que ninguém viu.
--   `snapshot_decisao_final` NÃO vai ser redefinida: o pin é a premissa de que o que
--   ela grava (a lista de 14 colunas) é o que o smoke de paridade vai conferir.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  v_md5_stamp    text;
  v_len_stamp    int;
  v_md5_snap     text;
  v_len_snap     int;
  v_hist         bigint;
  v_esp_stamp constant text := '8d4aa9e3e9f163b055374c3d419b35fa';
  v_esp_snap  constant text := '5d5c25f714bc07e7c242628afe19ac37';
BEGIN
  IF to_regprocedure('public.stamp_explicacao_acessada(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P49-07 PRE-PORTAO: public.stamp_explicacao_acessada(uuid) nao existe em PROD';
  END IF;
  IF to_regprocedure('public.snapshot_decisao_final()') IS NULL THEN
    RAISE EXCEPTION 'P49-07 PRE-PORTAO: public.snapshot_decisao_final() nao existe em PROD';
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_stamp, v_len_stamp
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.stamp_explicacao_acessada(uuid)'::regprocedure;
  IF v_md5_stamp IS DISTINCT FROM v_esp_stamp THEN
    RAISE EXCEPTION 'P49-07 PRE-PORTAO: o corpo VIVO de stamp_explicacao_acessada tem md5 % (length %), e o medido em 2026-09-22 e %. Alguem a mudou entre a medicao e o apply — ler o corpo vivo antes de seguir, NAO reescrever por cima',
      v_md5_stamp, v_len_stamp, v_esp_stamp;
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_snap, v_len_snap
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.snapshot_decisao_final()'::regprocedure;
  IF v_md5_snap IS DISTINCT FROM v_esp_snap THEN
    RAISE EXCEPTION 'P49-07 PRE-PORTAO: o corpo VIVO de snapshot_decisao_final tem md5 % (length %), e o medido em 2026-09-22 e %. Esta migration NAO a redefine, mas o smoke de paridade (g) le a lista de colunas do corpo VIVO — uma divergencia muda o que a paridade afirma',
      v_md5_snap, v_len_snap, v_esp_snap;
  END IF;

  SELECT count(*) INTO v_hist FROM public.decisao_final_historico;
  IF v_hist IS DISTINCT FROM 11 THEN
    RAISE NOTICE 'P49-07 PRE-PORTAO: decisao_final_historico tem % linha(s) (medido 11 em 2026-09-22). Nao e motivo para abortar — o arquivo so aceita acrescimo (D-45) e pode ter crescido legitimamente; registrado para o SUMMARY', v_hist;
  END IF;

  PERFORM set_config('p49_07.hist_antes', v_hist::text, false);
  RAISE NOTICE 'P49-07 PRE-PORTAO OK — stamp=% (%) snapshot=% (%) decisao_final_historico=%',
    v_md5_stamp, v_len_stamp, v_md5_snap, v_len_snap, v_hist;
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (1) O TRIGGER — arquiva quando a linha MUDA, exceto nas duas colunas do D-44.
--   A comparação é da linha INTEIRA (`to_jsonb`) menos as exclusões: coluna nova
--   entra na vigilância por construção, sem ninguém se lembrar de editar aqui.
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_decisao_final_snapshot ON public.decisao_final;
CREATE TRIGGER trg_decisao_final_snapshot
  AFTER UPDATE ON public.decisao_final
  FOR EACH ROW
  WHEN ((to_jsonb(OLD) - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em')
        IS DISTINCT FROM
        (to_jsonb(NEW) - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em'))
  EXECUTE FUNCTION public.snapshot_decisao_final();


-- ─────────────────────────────────────────────────────────────────────────────
-- (2) A RPC DE LEITURA — idempotente. Carimba UMA vez; nas seguintes não escreve.
--   Sem o `IS NULL` o UPDATE acontecia sempre (o COALESCE preserva o valor, não o
--   evento), e era o gatilho dos snapshots de leitura. Com o filtro, o
--   `RETURNING * INTO` sai vazio na 2ª chamada — por isso o re-SELECT (Correção 30,
--   idioma de `solicitar_revisao_decisao`).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.stamp_explicacao_acessada(p_candidatura_id uuid)
RETURNS public.decisao_final
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $stamp_explicacao_acessada$
DECLARE
  v_owns boolean;
  v_row  public.decisao_final;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  UPDATE public.decisao_final
     SET explicacao_solicitada_em = now()
   WHERE candidatura_id = p_candidatura_id
     AND explicacao_solicitada_em IS NULL;

  SELECT * INTO v_row
    FROM public.decisao_final
   WHERE candidatura_id = p_candidatura_id;

  RETURN v_row;
END;
$stamp_explicacao_acessada$;

REVOKE ALL ON FUNCTION public.stamp_explicacao_acessada(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stamp_explicacao_acessada(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.stamp_explicacao_acessada(uuid) TO authenticated;

COMMENT ON FUNCTION public.stamp_explicacao_acessada(uuid) IS
  'JORN-3b / D-44 (Phase 49, 49-07): carimba explicacao_solicitada_em UMA vez, com guard own-row. '
  'IDEMPOTENTE: UPDATE com AND explicacao_solicitada_em IS NULL + re-SELECT da linha para o '
  'retorno (sem o re-SELECT, RETURNING * INTO sai vazio na 2a chamada e a RPC devolveria NULL). '
  'Antes disto o UPDATE acontecia em TODA chamada — o COALESCE preservava o valor, nao o evento — '
  'e cada abertura da pagina da explicacao criava uma versao da decisao em decisao_final_historico. '
  'A coluna tambem esta FORA do WHEN de trg_decisao_final_snapshot (D-44): as duas metades '
  'existem porque cada uma sozinha deixa um caminho aberto.';

-- Função de trigger: `anon` não tem o que fazer com ela. Medido que tinha EXECUTE por
-- grant direto do `pg_default_acl`. O CORPO não é tocado (o pós-portão confere o md5).
REVOKE ALL ON FUNCTION public.snapshot_decisao_final() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.snapshot_decisao_final() FROM anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que ficou instalado é o que esta migration diz.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  v_def       text;
  v_enabled   "char";
  v_n         int;
  v_excl      int;
  v_before    int;
  v_src       text;
  v_md5_snap  text;
  v_md5_stamp text;
  v_hist      bigint;
  v_anon_stamp boolean;
  v_auth_stamp boolean;
  v_anon_snap  boolean;
  v_esp_snap  constant text := '5d5c25f714bc07e7c242628afe19ac37';
BEGIN
  -- (i) o trigger existe, está habilitado, e é o único que aponta para a função.
  SELECT count(*) INTO v_n
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.decisao_final'::regclass
     AND NOT t.tgisinternal
     AND t.tgfoid = 'public.snapshot_decisao_final()'::regprocedure;
  IF v_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: % trigger(s) de decisao_final apontam para snapshot_decisao_final (esperado exatamente 1 — dois arquivariam duas vezes por mudanca)', v_n;
  END IF;

  SELECT t.tgenabled, pg_catalog.pg_get_triggerdef(t.oid) INTO v_enabled, v_def
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.decisao_final'::regclass
     AND t.tgname = 'trg_decisao_final_snapshot';
  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: trg_decisao_final_snapshot nao esta instalado em public.decisao_final';
  END IF;
  IF v_enabled IS DISTINCT FROM 'O' THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: trg_decisao_final_snapshot com tgenabled = % (esperado O). Desabilitado, nenhuma mudanca da decisao seria arquivada', v_enabled;
  END IF;

  -- (ii) o WHEN é a comparação por linha inteira (o catálogo normaliza para `to_jsonb(old.*)`).
  IF position('to_jsonb(old' IN v_def) = 0 OR position('to_jsonb(new' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: o WHEN instalado nao compara a linha inteira por to_jsonb — %. Uma lista de colunas e uma FOTOGRAFIA do schema: a coluna nova ficaria fora e mudaria sem arquivar', v_def;
  END IF;
  IF position('IS DISTINCT FROM' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: o WHEN instalado nao tem IS DISTINCT FROM — %', v_def;
  END IF;

  -- (iii) as exclusões são EXATAMENTE as duas do D-44 — duas por lado, quatro no total.
  --       A contagem é o que impede uma terceira exclusão de entrar sem ser vista: uma
  --       asserção apenas de PRESENCA das duas passaria com uma terceira ao lado delas.
  IF position('''explicacao_solicitada_em''' IN v_def) = 0
     OR position('''alerta_prazo_enviado_em''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: o WHEN instalado nao exclui as DUAS colunas do D-44 — %', v_def;
  END IF;
  v_excl := (length(v_def) - length(replace(v_def, ' - ''', ''))) / 4;
  IF v_excl IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: o WHEN instalado tem % exclusao(oes) de chave (esperado 4 = as 2 colunas do D-44 em cada lado da comparacao). Uma exclusao a mais e uma mudanca REAL da decisao que deixa de ser arquivada — Pitfall 5, e o tombstone do motor de exclusao e o caso que doi: def = %', v_excl, v_def;
  END IF;

  -- (iv) nenhum trigger BEFORE UPDATE em decisao_final — a premissa que torna a lista
  --      de exclusão COMPLETA. Um carimbador de `updated_at` mudaria uma coluna em todo
  --      UPDATE e um UPDATE sem mudanca voltaria a arquivar.
  SELECT count(*) INTO v_before
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.decisao_final'::regclass
     AND NOT t.tgisinternal
     AND (t.tgtype & 2) = 2
     AND (t.tgtype & 16) = 16;
  IF v_before IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: % trigger(s) BEFORE UPDATE em decisao_final (medido 0 em 2026-09-22). Se um deles carimba uma coluna de tempo em todo UPDATE, a exclusao de duas colunas nao basta e o D-44 precisa de decisao do operador (D-14) — nao acrescentar a coluna a exclusao por conta propria', v_before;
  END IF;

  -- (v) a RPC ficou idempotente, e o re-SELECT está lá.
  SELECT p.prosrc, md5(p.prosrc) INTO v_src, v_md5_stamp
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.stamp_explicacao_acessada(uuid)'::regprocedure;
  IF position('explicacao_solicitada_em IS NULL' IN v_src) = 0 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: o corpo de stamp_explicacao_acessada nao filtra por explicacao_solicitada_em IS NULL — o UPDATE volta a acontecer em toda chamada';
  END IF;
  IF position('SELECT * INTO v_row' IN v_src) = 0 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: o corpo de stamp_explicacao_acessada nao re-SELECIONA a linha — com o filtro IS NULL, RETURNING * INTO sai VAZIO na 2a chamada e a RPC devolve NULL ao front (Correcao 30)';
  END IF;
  IF position('ca.user_id = auth.uid()' IN v_src) = 0 THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: o guard own-row de stamp_explicacao_acessada desapareceu na reescrita — qualquer titular autenticado carimbaria a decisao de outro';
  END IF;

  -- (vi) `snapshot_decisao_final` NAO foi tocada.
  SELECT md5(p.prosrc) INTO v_md5_snap
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.snapshot_decisao_final()'::regprocedure;
  IF v_md5_snap IS DISTINCT FROM v_esp_snap THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: snapshot_decisao_final mudou de corpo (md5 % , esperado %) — esta migration troca QUANDO ela dispara, nunca O QUE ela grava', v_md5_snap, v_esp_snap;
  END IF;

  -- (vii) ACL: `anon` fora das duas; `authenticated` preservado na RPC do titular.
  v_anon_stamp := has_function_privilege('anon', 'public.stamp_explicacao_acessada(uuid)'::regprocedure, 'EXECUTE');
  v_auth_stamp := has_function_privilege('authenticated', 'public.stamp_explicacao_acessada(uuid)'::regprocedure, 'EXECUTE');
  v_anon_snap  := has_function_privilege('anon', 'public.snapshot_decisao_final()'::regprocedure, 'EXECUTE');
  IF v_anon_stamp OR v_anon_snap THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: anon ainda tem EXECUTE (stamp=%, snapshot=%) — o grant do pg_default_acl e DIRETO e REVOKE FROM PUBLIC sozinho nao o alcanca', v_anon_stamp, v_anon_snap;
  END IF;
  IF NOT v_auth_stamp THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: authenticated PERDEU EXECUTE em stamp_explicacao_acessada — o titular deixaria de conseguir abrir a propria explicacao';
  END IF;

  -- (viii) D-45: nenhuma linha do arquivo foi apagada por esta migration.
  SELECT count(*) INTO v_hist FROM public.decisao_final_historico;
  IF v_hist < current_setting('p49_07.hist_antes')::bigint THEN
    RAISE EXCEPTION 'P49-07 POS-PORTAO: decisao_final_historico foi de % para % — o arquivo SO ACEITA ACRESCIMO (D-45 / ERASE-08)',
      current_setting('p49_07.hist_antes'), v_hist;
  END IF;

  RAISE NOTICE 'P49-07 POS-PORTAO OK — md5(prosrc) novo de stamp_explicacao_acessada = % ; snapshot_decisao_final intacta = % ; exclusoes no WHEN = % ; triggers BEFORE UPDATE em decisao_final = % ; decisao_final_historico = %',
    v_md5_stamp, v_md5_snap, v_excl, v_before, v_hist;
END
$pos_portao$;
