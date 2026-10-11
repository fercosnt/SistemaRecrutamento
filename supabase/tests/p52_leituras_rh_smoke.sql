-- =============================================================================
-- Phase 52 / Plano 52-08 — smoke das LEITURAS DO RH (smoke52l)
--   `public.ler_devolutiva_bigfive_rh(uuid)` (JORN-56 · D-01, D-04, D-10)            (a)–(h)
--   `public.ler_sjt_mc_rh(uuid)` (JORN-57 · D-21, D-37, D-10)                         (i)–(o), (t)
--   `public.ler_contexto_rejeicao_triagem_revisao(uuid)` (JORN-62 · D-38, D-10)       (p)–(t)
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261011000001, prefixada pelo ensaio até o apply do 52-15).
--   · Só o RH ATIVO lê: administrador e recrutador ativo leem; o MESMO recrutador, desativado
--     dentro da transação que aborta, recebe 42501 — o helper vivo vem ANTES da busca, então o
--     token velho não aprende se a candidatura existe (uuid inexistente também dá 42501 a ele).
--     Candidato, sem claims → 42501 (guarda); `anon` → `permission denied for function` (ACL —
--     ACL e guarda dividem o SQLSTATE 42501, só a mensagem os distingue).
--   · Projeção por ALLOWLIST: o retorno tem exatamente as chaves do contrato, nenhuma folha
--     numérica e nenhuma chave `percentil` em nível nenhum (`jsonb_path_exists(r, 'strict
--     $.**.percentil')` falso); a banda e o texto de cada dimensão são OS DA DEVOLUTIVA do
--     candidato (Invariante 2: a faixa que o RH vê é a que o candidato viu).
--   · Candidatura viva: ausente, excluída e rascunho dão o MESMO erro (`P0002`, mesma mensagem).
--   · SJT MC sem gabarito: por item, o cenário e TODAS as alternativas do banco com `{opcao_id,
--     texto, escolhida}` e nada mais; exatamente uma `escolhida` quando a escolhida existe no
--     banco; etiqueta/peso só da escolhida (os da resposta gravada); alternativas em ORDEM NEUTRA
--     `md5(pergunta_id::text || opcao_id::text)` — provada por fixture em escada (o), em que
--     `ordem 1 = fortemente_pontua` como em PROD (Achado F2) e a posição neutra de cada item é
--     conhecida de antemão.
--   · Triagem: o pedido `humana_triagem` devolve motivo (`candidaturas.motivo_rejeicao`) e
--     justificativa (`historico_candidatura.criterio_texto` do registro de rejeição); pedido de
--     knockout (`automatica`) e inexistente dão o MESMO `P0002`; o desativado recebe 42501 antes.
--
-- ATORES — lidos NA EXECUÇÃO, nunca por UUID escrito aqui; falha alta se faltar algum.
--   admin     `usuarios_rh` administrador ativo, não excluído (o mais antigo).
--   rec       `usuarios_rh` RECRUTADOR ativo, não excluído (o mais antigo). (c) e (h) o desativam
--             DENTRO do envelope — o par positivo/negativo difere só em `ativo`.
--   cand      `candidatos.user_id` do titular da candidatura de devolutiva escolhida, sem linha
--             em `usuarios_rh` (claim `candidato`).
--   Candidaturas: dev_cand = a candidatura VIVA com devolutiva de titular com `user_id` (a mais
--   antiga); sem_dev = viva com score `big_five` e sem devolutiva; sem_bf = viva sem nenhum dos
--   dois. sjt_cand = viva com linha `sjt/mc` de `metadata.respostas` não vazio (a mais antiga);
--   sem_sjt = viva SEM nenhuma linha `sjt` (recebe a linha da fixture de (o)). tri = pedido
--   `humana_triagem` de candidatura viva (o mais antigo) — se não houver nenhum, cada cláusula
--   de triagem FABRICA um dentro do seu envelope, a partir de um `historico_candidatura` de
--   rejeição pelo RH sem pedido (tri_hist); auto = pedido `automatica` de candidatura viva.
--   POPULAÇÃO publicada em `p52.evidencia` (`52l.pop=dev:<n>,sjt:<n>,tri:<n>`) e RECUSADA se a
--   de devolutiva ou a de SJT for 0, ou se não houver pedido de triagem nem como fabricá-lo
--   (memória «população vazia mente»).
--
-- ⚠ ESTE SMOKE ESCREVE — só dentro de subtransações PL/pgSQL encerradas por `RAISE EXCEPTION`
-- com SQLSTATE próprio (`P52L1`), capturado logo acima: ROLLBACK de tudo. Escritas, todas como
-- postgres e todas revertidas:
--   (c)/(h)/(k)/(r) `UPDATE usuarios_rh SET ativo = false` na linha do recrutador (triggers
--           medidos em 2026-10-11: `update_usuarios_rh_updated_at` e `trg_usuarios_rh_anti_lockout`,
--           que só age sobre administrador ativo; nenhum chama rede).
--   (h)/(t) `UPDATE candidaturas SET is_rascunho = true` / `SET deleted_at = now()` (triggers de
--           UPDATE medidos: só `update_candidaturas_updated_at` dispara para essas colunas).
--   (o)     4 `perguntas` `cargo = 'p52-smoke'` com `status` NÃO ativo (prova a leitura sem filtro
--           de status), 16 `perguntas_opcao_sjt` e 1 `scores_candidato` `sjt/mc` em sem_sjt — ids
--           de FIXTURE literais (`5208a000-…`, `5208b000-…`), nenhum de linha real (as três tabelas
--           não têm trigger, medido em 2026-10-11).
--   (p)–(t) SÓ quando PROD não tem pedido `humana_triagem` vivo: `INSERT revisao_rejeicao`
--           fabricado (dispara `trg_notif_revisao_rejeicao_solicitada`, que enfileira
--           `net.http_post` — transacional, desfeito com o envelope).
--   E as funções auxiliares `pg_temp.p52l_chamar`/`p52l_resumo`/`p52l_pedido_tri` (criadas uma
--   vez, somem no aborto do ensaio). Uma reprovação imprime só `p52l_resumo` do retorno (situação
--   ou erro) — nunca o conteúdo (texto da devolutiva, justificativa, cenário), que não pode ir ao
--   terminal nem à evidência.
--   O arquivo inteiro só roda dentro do ensaio que ABORTA (bloco `$p52_so_ensaio$` abaixo).
--
-- ⚠ CADA chamada vai por `pg_temp.p52l_chamar`, que troca o papel, define os claims, chama e
-- devolve `{ok: <retorno>}` ou `{err: 'SQLSTATE:SQLERRM'}` (o erro desfaz a subtransação dela,
-- inclusive o SET LOCAL ROLE). O julgamento roda FORA dos envelopes, UMA cláusula por bloco `DO`
-- (cada instrução sob o teto de 5 s do ensaio), na ordem das letras: a primeira que reprova
-- encerra a requisição. Julgamento por LISTA DE RÓTULOS (`P52L FAIL (<letra>): [<rótulo>,…]`).
--
-- CLÁUSULAS.
--   (a) admin lê `disponivel` em TODA candidatura viva com devolutiva, com `dimensoes` igual à
--       banda do `cabecalho.dashboard` e ao texto das `paginas` da própria devolutiva, por dim, na
--       ordem O C E A N, e os avisos como vieram; `sem_devolutiva` em sem_dev e `sem_big_five` em
--       sem_bf, com `dimensoes = []`.
--   (b) o recrutador ativo lê dev_cand e recebe EXATAMENTE o retorno do admin.
--   (c) o mesmo recrutador, desativado no envelope → 42501.
--   (d) candidato titular (claim `candidato`) → 42501.
--   (e) `authenticated` sem claims → 42501.
--   (f) `anon`: `has_function_privilege` falso e a chamada falha com `permission denied for
--       function ler_devolutiva_bigfive_rh` (o ACL, não a guarda).
--   (g) projeção, em todos os retornos de (a): chaves de topo = {situacao, dimensoes,
--       disclaimer_emocional, disclaimer_lgpd_crp}; chaves de cada dimensão = {dim, banda,
--       texto_interpretativo}; `strict $.**.percentil` ausente; nenhuma folha numérica; `banda`
--       no vocabulário e `dim` em O C E A N.
--   (h) uuid inexistente → `P0002` para o admin e 42501 para o recrutador desativado (o helper
--       vem antes da busca); dev_cand como rascunho e como excluída → o MESMO `SQLSTATE:SQLERRM`
--       do inexistente.
--   (i) admin lê o SJT MC de TODA candidatura viva com linha `sjt/mc`: `disponivel`, um item por
--       resposta-objeto na ordem do array, com `pergunta_id`, `cenario` (de `perguntas`),
--       `escolhida_tag`/`escolhida_peso` (os da resposta), `escolhida_no_banco`, o CONJUNTO de
--       `opcao_id` das alternativas = o do banco para a pergunta e a escolhida = a da resposta —
--       comparado com o esperado lido como postgres; sem_sjt → `{sem_sjt_mc, []}`.
--   (j) o recrutador ativo lê sjt_cand e recebe EXATAMENTE o retorno do admin.
--   (k) o mesmo recrutador, desativado no envelope → 42501.
--   (l) candidato titular e `authenticated` sem claims → 42501.
--   (m) `anon` sem EXECUTE pelo ACL em `ler_sjt_mc_rh`.
--   (n) projeção, em todos os retornos de (i): chaves de topo {itens, situacao}; de cada item
--       exatamente as 6 do contrato; de cada alternativa exatamente {escolhida, opcao_id, texto}
--       (nenhuma etiqueta, peso ou ordem); exatamente UMA `escolhida` quando
--       `escolhida_no_banco`, nenhuma quando não.
--   (o) ORDEM NEUTRA, determinística: fixture de 4 perguntas × 4 opções com `ordem 1 =
--       fortemente_pontua` (a escada de PROD) e ids literais escolhidos conferindo offline o
--       `md5(pergunta_id::text || opcao_id::text)` — a MESMA expressão do ORDER BY da RPC. Lidas
--       como admin, a `fortemente_pontua` de cada item tem de estar na posição EXATA esperada
--       (3, 2, 3, 4 — nenhuma em 1; três posições distintas). Com `ORDER BY o.ordem` ela seria a
--       primeira nos 4. Também: itens na ordem das respostas, cenário de pergunta NÃO ativa lido.
--   (p) triagem: admin e recrutador ativo leem tri → `{disponivel, motivo, justificativa}` com
--       justificativa NÃO nula = `criterio_texto` do registro e motivo = o da candidatura.
--   (q) pedido `automatica` → `P0002`, com o MESMO `SQLSTATE:SQLERRM` de um uuid inexistente.
--   (r) recrutador desativado → 42501 para tri, para o pedido `automatica` e para o inexistente
--       (o helper vem antes de distinguir).
--   (s) `anon` sem EXECUTE pelo ACL em `ler_contexto_rejeicao_triagem_revisao`; candidato e sem
--       claims → 42501.
--   (t) candidatura viva nas duas RPCs novas: sjt_cand como rascunho → o MESMO erro do uuid
--       inexistente em `ler_sjt_mc_rh` (`P0002`); a candidatura de tri excluída → o MESMO erro do
--       pedido inexistente em `ler_contexto_rejeicao_triagem_revisao`.
--
-- COMO RODAR: SÓ pelo envelope que aborta — `node scripts/p52_ensaio.cjs --vistas
-- --migracoes=supabase/migrations/20261011000001_p52_leituras_rh.sql
-- supabase/tests/p52_leituras_rh_smoke.sql` (depois do apply do 52-15: `--sem-migracoes`).
-- ⚠ PROIBIDO: `node p46apply.cjs run` deste arquivo — o `run` COMMITA; o bloco
-- `$p52_so_ensaio$` recusa antes de qualquer escrita.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), num ÚNICO literal (`smoke52l.esperado`, abaixo). Hoje: 20 — a … t.
--
-- O PORTÃO MORDE — `scripts/p52_mutacoes.cjs`: cada mutação, derivada do TEXTO da função na
-- migration por troca literal, numa requisição que aborta, tem de reprovar NA letra dela:
--   L1 guarda sem helper (devolutiva) → (c) · L2 devolutiva com `percentil` → (g) ·
--   L3 alternativas com `tag` → (n) · L4 alternativas por `ordem` → (o) ·
--   L5 triagem aceita `automatica` → (q) · L6 `GRANT EXECUTE … TO anon` (devolutiva) → (f) ·
--   L7 triagem sem helper → (r) · L8 SJT sem o filtro de candidatura viva → (t).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- GUARDA ESTRUTURAL — PRIMEIRA instrução do arquivo. O PREFIXO do `p52_ensaio.cjs` grava o
-- txid da requisição na GUC LOCAL `p52.tx` e aborta tudo no sentinela. Fora dele a marca não
-- existe e o arquivo para AQUI, antes de qualquer escrita.
-- ─────────────────────────────────────────────────────────────────────────────
DO $p52_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p52.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P52L RECUSADO (fora do ensaio): este smoke ESCREVE (envelopes P52L1 em linhas reais de usuarios_rh e candidaturas) e so roda dentro de scripts/p52_ensaio.cjs, que marca a requisicao (p52.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p52_ensaio.cjs [--sem-migracoes] supabase/tests/p52_leituras_rh_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P52L RECUSADO (fora do ensaio): a marca p52.tx (%) nao e desta transacao (%): a requisicao nao e a que o ensaio abriu. Nada rodou', v_tx, txid_current();
  END IF;
END
$p52_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke52l.pass', '0', false);
SELECT set_config('smoke52l.esperado', '20', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- Chamada impersonada: troca o papel, define os claims, chama `public.<p_fn>(p_arg)` e devolve
-- {ok: retorno} ou {err: 'SQLSTATE:SQLERRM'}. p_papel: 'anon' | 'sem_claims' | um papel de
-- app_metadata ('administrador', 'rh', 'candidato'). Some no aborto do ensaio (pg_temp).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION pg_temp.p52l_chamar(p_fn text, p_arg uuid, p_papel text, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52l_chamar$
DECLARE
  v_r jsonb;
BEGIN
  BEGIN
    IF p_papel = 'anon' THEN
      SET LOCAL ROLE anon;
      PERFORM set_config('request.jwt.claims', '', true);
    ELSE
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims',
        CASE WHEN p_papel = 'sem_claims' THEN ''
             ELSE json_build_object('sub', p_sub::text, 'role', 'authenticated',
                                    'app_metadata', json_build_object('role', p_papel))::text END, true);
    END IF;
    EXECUTE format('SELECT public.%I($1)', p_fn) INTO v_r USING p_arg;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    -- a subtransação deste bloco foi desfeita: papel e claims voltaram ao que eram.
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52l_chamar$;

-- O que uma reprovação imprime de um retorno: SÓ a situação ou o erro — nunca o conteúdo (texto
-- interpretativo, justificativa escrita pelo RH, cenário), que é dado do candidato e não pode ir
-- para o terminal nem para a evidência.
CREATE FUNCTION pg_temp.p52l_resumo(p jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $p52l_resumo$
  SELECT CASE WHEN p IS NULL THEN '<nao rodou>'
              WHEN p ? 'err' THEN 'err:' || left(p ->> 'err', 100)
              ELSE 'ok:situacao=' || coalesce(p #>> '{ok,situacao}', '<nulo>')
                   || CASE WHEN jsonb_typeof(p #> '{ok,itens}') = 'array' THEN ',itens=' || jsonb_array_length(p #> '{ok,itens}') ELSE '' END
                   || CASE WHEN jsonb_typeof(p #> '{ok,dimensoes}') = 'array' THEN ',dimensoes=' || jsonb_array_length(p #> '{ok,dimensoes}') ELSE '' END
         END
$p52l_resumo$;

-- O pedido `humana_triagem` da triagem: o real (smoke52l.tri), ou — sem nenhum vivo em PROD — um
-- FABRICADO a partir de smoke52l.tri_hist. Quem chama está SEMPRE dentro de um envelope P52L1.
CREATE FUNCTION pg_temp.p52l_pedido_tri()
 RETURNS uuid
 LANGUAGE plpgsql
AS $p52l_pedido_tri$
DECLARE
  v_id uuid;
  v_h  record;
BEGIN
  IF coalesce(current_setting('smoke52l.tri', true), '') <> '' THEN
    RETURN current_setting('smoke52l.tri')::uuid;
  END IF;
  SELECT hc.id, hc.candidatura_id, hc.etapa_de, hc.ator INTO v_h
    FROM public.historico_candidatura hc
   WHERE hc.id = current_setting('smoke52l.tri_hist')::uuid;
  INSERT INTO public.revisao_rejeicao (candidatura_id, historico_rejeicao_id, origem, etapa_rejeitada, etapa_reabertura, rejeitado_por)
  VALUES (v_h.candidatura_id, v_h.id, 'humana_triagem', coalesce(v_h.etapa_de, 'triagem'), 'triagem',
          coalesce(v_h.ator, current_setting('smoke52l.admin')::uuid))
  RETURNING id INTO v_id;
  RETURN v_id;
END
$p52l_pedido_tri$;


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores e candidaturas vivos (leitura, como postgres) e a população publicada.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $baseline$
DECLARE
  v_admin   uuid;
  v_rec     uuid;
  v_cand    uuid;
  v_dev     uuid;
  v_sem_dev uuid;
  v_sem_bf  uuid;
  v_ndev    bigint;
  v_sjt     uuid;
  v_sem_sjt uuid;
  v_nsjt    bigint;
  v_tri     uuid;
  v_ntri    bigint;
  v_tri_h   uuid;
  v_auto    uuid;
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  SELECT u.user_id INTO v_rec
    FROM public.usuarios_rh u
   WHERE u.role = 'recrutador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;

  SELECT count(*) INTO v_ndev
    FROM public.devolutivas_candidato d
    JOIN public.candidaturas c ON c.id = d.candidatura_id
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false;

  SELECT d.candidatura_id, ca.user_id INTO v_dev, v_cand
    FROM public.devolutivas_candidato d
    JOIN public.candidaturas c ON c.id = d.candidatura_id
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     AND ca.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
   ORDER BY d.created_at, d.id
   LIMIT 1;

  SELECT c.id INTO v_sem_dev
    FROM public.candidaturas c
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     AND EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = c.id AND s.tipo = 'big_five')
     AND NOT EXISTS (SELECT 1 FROM public.devolutivas_candidato d WHERE d.candidatura_id = c.id)
   ORDER BY c.created_at, c.id
   LIMIT 1;
  SELECT c.id INTO v_sem_bf
    FROM public.candidaturas c
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = c.id AND s.tipo = 'big_five')
     AND NOT EXISTS (SELECT 1 FROM public.devolutivas_candidato d WHERE d.candidatura_id = c.id)
   ORDER BY c.created_at, c.id
   LIMIT 1;

  -- SJT MC: população e a candidatura sondada; e uma viva SEM linha sjt (recebe a fixture de (o)).
  SELECT count(DISTINCT s.candidatura_id) INTO v_nsjt
    FROM public.scores_candidato s
    JOIN public.candidaturas c ON c.id = s.candidatura_id
   WHERE s.tipo = 'sjt' AND s.subtipo = 'mc' AND c.deleted_at IS NULL AND c.is_rascunho = false;
  SELECT s.candidatura_id INTO v_sjt
    FROM public.scores_candidato s
    JOIN public.candidaturas c ON c.id = s.candidatura_id
   WHERE s.tipo = 'sjt' AND s.subtipo = 'mc' AND c.deleted_at IS NULL AND c.is_rascunho = false
     AND jsonb_typeof(s.metadata -> 'respostas') = 'array' AND jsonb_array_length(s.metadata -> 'respostas') > 0
   ORDER BY s.created_at, s.id
   LIMIT 1;
  SELECT c.id INTO v_sem_sjt
    FROM public.candidaturas c
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = c.id AND s.tipo = 'sjt')
   ORDER BY c.created_at, c.id
   LIMIT 1;

  -- Triagem: pedido humana_triagem vivo (ou o registro de onde fabricá-lo) e um pedido automatica.
  SELECT count(*) INTO v_ntri
    FROM public.revisao_rejeicao r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
   WHERE r.origem = 'humana_triagem' AND c.deleted_at IS NULL AND c.is_rascunho = false;
  SELECT r.id INTO v_tri
    FROM public.revisao_rejeicao r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
   WHERE r.origem = 'humana_triagem' AND c.deleted_at IS NULL AND c.is_rascunho = false
   ORDER BY r.solicitada_em, r.id
   LIMIT 1;
  SELECT h.id INTO v_tri_h
    FROM public.historico_candidatura h
    JOIN public.candidaturas c ON c.id = h.candidatura_id
   WHERE h.etapa_para = 'rejeitado' AND NOT h.auto_rejeitado
     AND btrim(coalesce(h.criterio_texto, '')) <> ''
     AND c.deleted_at IS NULL AND c.is_rascunho = false
     AND NOT EXISTS (SELECT 1 FROM public.revisao_rejeicao r WHERE r.historico_rejeicao_id = h.id)
   ORDER BY h.criado_em, h.id
   LIMIT 1;
  SELECT r.id INTO v_auto
    FROM public.revisao_rejeicao r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
   WHERE r.origem = 'automatica' AND c.deleted_at IS NULL AND c.is_rascunho = false
   ORDER BY r.solicitada_em, r.id
   LIMIT 1;

  IF v_admin IS NULL OR v_rec IS NULL OR v_cand IS NULL OR v_dev IS NULL OR v_sem_dev IS NULL OR v_sem_bf IS NULL OR v_ndev = 0
     OR v_sjt IS NULL OR v_sem_sjt IS NULL OR v_nsjt = 0 OR (v_tri IS NULL AND v_tri_h IS NULL) OR v_auto IS NULL THEN
    RAISE EXCEPTION 'P52L FAIL (baseline): falta ator ou populacao (admin ativo=%, recrutador ativo=%, candidato titular=%, candidatura com devolutiva=%, sem devolutiva=%, sem big five=%, devolutivas vivas=%, sjt sondada=%, sem sjt=%, sjt vivas=%, pedido triagem=%, registro para fabricar=%, pedido automatica=%) — ausencia REPROVA, nunca pula',
      v_admin IS NOT NULL, v_rec IS NOT NULL, v_cand IS NOT NULL, v_dev IS NOT NULL, v_sem_dev IS NOT NULL, v_sem_bf IS NOT NULL, v_ndev,
      v_sjt IS NOT NULL, v_sem_sjt IS NOT NULL, v_nsjt, v_tri IS NOT NULL, v_tri_h IS NOT NULL, v_auto IS NOT NULL;
  END IF;
  PERFORM set_config('smoke52l.sjt_cand', v_sjt::text, false);
  PERFORM set_config('smoke52l.sem_sjt', v_sem_sjt::text, false);
  PERFORM set_config('smoke52l.tri', coalesce(v_tri::text, ''), false);
  PERFORM set_config('smoke52l.tri_hist', coalesce(v_tri_h::text, ''), false);
  PERFORM set_config('smoke52l.auto', v_auto::text, false);

  PERFORM set_config('smoke52l.admin', v_admin::text, false);
  PERFORM set_config('smoke52l.rec', v_rec::text, false);
  PERFORM set_config('smoke52l.cand', v_cand::text, false);
  PERFORM set_config('smoke52l.dev_cand', v_dev::text, false);
  PERFORM set_config('smoke52l.sem_dev', v_sem_dev::text, false);
  PERFORM set_config('smoke52l.sem_bf', v_sem_bf::text, false);
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52l.pop=dev:' || v_ndev || ',sjt:' || v_nsjt
          || ',tri:' || v_ntri || CASE WHEN v_tri IS NULL THEN '+fabricado' ELSE '' END), false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) admin lê `disponivel` em toda candidatura viva com devolutiva — banda e texto da própria
--     devolutiva; e os dois estados sem devolutiva.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  r       record;
  v_res   jsonb;
  v_esp   jsonb;
  v_proj  jsonb;
  v_rot   text[] := '{}';
  v_i     int := 0;
BEGIN
  FOR r IN
    SELECT d.candidatura_id, d.conteudo_jsonb
      FROM public.devolutivas_candidato d
      JOIN public.candidaturas c ON c.id = d.candidatura_id
     WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     ORDER BY d.created_at, d.id
  LOOP
    v_i := v_i + 1;
    v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', r.candidatura_id, 'administrador', v_admin);
    IF v_res ? 'err' THEN
      v_rot := v_rot || ('dev' || v_i || '_erro:' || left(v_res ->> 'err', 80));
      CONTINUE;
    END IF;
    v_res := v_res -> 'ok';
    -- o esperado, lido da devolutiva como postgres (outra formulação: subconsulta por dim).
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'dim', o.dim,
             'banda', (SELECT e ->> 'banda' FROM jsonb_array_elements(r.conteudo_jsonb #> '{cabecalho,dashboard}') e WHERE e ->> 'dim' = o.dim LIMIT 1),
             'texto_interpretativo', (SELECT e ->> 'texto_interpretativo' FROM jsonb_array_elements(r.conteudo_jsonb -> 'paginas') e WHERE e ->> 'dim' = o.dim LIMIT 1))
             ORDER BY o.ord), '[]'::jsonb)
      INTO v_esp
      FROM unnest(ARRAY['O', 'C', 'E', 'A', 'N']) WITH ORDINALITY AS o(dim, ord)
     WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(r.conteudo_jsonb #> '{cabecalho,dashboard}') e WHERE e ->> 'dim' = o.dim);
    IF v_res ->> 'situacao' IS DISTINCT FROM 'disponivel' THEN
      v_rot := v_rot || ('dev' || v_i || '_situacao:' || coalesce(v_res ->> 'situacao', '<nulo>'));
    END IF;
    -- PROJEÇÃO (dim, banda, texto) do retorno — uma chave a mais é assunto de (g), não daqui.
    SELECT coalesce(jsonb_agg(jsonb_build_object('dim', x.e -> 'dim', 'banda', x.e -> 'banda',
                                                 'texto_interpretativo', x.e -> 'texto_interpretativo')
                              ORDER BY x.n), '[]'::jsonb)
      INTO v_proj
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_res -> 'dimensoes') = 'array' THEN v_res -> 'dimensoes' ELSE '[]'::jsonb END)
           WITH ORDINALITY AS x(e, n);
    IF v_proj IS DISTINCT FROM v_esp OR jsonb_array_length(v_esp) = 0 THEN
      v_rot := v_rot || ('dev' || v_i || '_dimensoes_diferem_da_devolutiva');
    END IF;
    IF v_res -> 'disclaimer_emocional' IS DISTINCT FROM r.conteudo_jsonb -> 'disclaimer_emocional'
       OR v_res -> 'disclaimer_lgpd_crp' IS DISTINCT FROM r.conteudo_jsonb -> 'disclaimer_lgpd_crp' THEN
      v_rot := v_rot || ('dev' || v_i || '_avisos');
    END IF;
  END LOOP;
  IF v_i = 0 THEN
    v_rot := v_rot || 'populacao_vazia'::text;
  END IF;

  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.sem_dev')::uuid, 'administrador', v_admin);
  IF v_res -> 'ok' IS DISTINCT FROM jsonb_build_object('situacao', 'sem_devolutiva', 'dimensoes', '[]'::jsonb,
                                                     'disclaimer_emocional', NULL, 'disclaimer_lgpd_crp', NULL) THEN
    v_rot := v_rot || ('sem_dev:' || pg_temp.p52l_resumo(v_res));
  END IF;
  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.sem_bf')::uuid, 'administrador', v_admin);
  IF v_res -> 'ok' IS DISTINCT FROM jsonb_build_object('situacao', 'sem_big_five', 'dimensoes', '[]'::jsonb,
                                                     'disclaimer_emocional', NULL, 'disclaimer_lgpd_crp', NULL) THEN
    v_rot := v_rot || ('sem_bf:' || pg_temp.p52l_resumo(v_res));
  END IF;

  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (a): [%] — o admin nao le a faixa que o candidato viu (ou o estado sem devolutiva saiu errado)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) recrutador ATIVO lê dev_cand — o mesmo retorno do admin.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  v_cand uuid := current_setting('smoke52l.dev_cand')::uuid;
  v_adm  jsonb;
  v_rec  jsonb;
BEGIN
  v_adm := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'administrador', current_setting('smoke52l.admin')::uuid);
  v_rec := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'rh', current_setting('smoke52l.rec')::uuid);
  IF NOT (v_adm ? 'ok') OR NOT (v_rec ? 'ok') OR v_rec -> 'ok' IS DISTINCT FROM v_adm -> 'ok'
     OR v_rec #>> '{ok,situacao}' IS DISTINCT FROM 'disponivel' THEN
    RAISE EXCEPTION 'P52L FAIL (b): [rec_ativo] — o recrutador ativo nao le o que o admin le (rec=%, admin=%)',
      pg_temp.p52l_resumo(v_rec), pg_temp.p52l_resumo(v_adm);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) o MESMO recrutador, desativado dentro do envelope → 42501.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  v_rec  uuid := current_setting('smoke52l.rec')::uuid;
  v_cand uuid := current_setting('smoke52l.dev_cand')::uuid;
  v_res  jsonb;
  v_rc   int;
  v_err  text;
  v_ran  boolean := false;
BEGIN
  BEGIN
    UPDATE public.usuarios_rh SET ativo = false WHERE user_id = v_rec;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'desativar o recrutador atingiu % linha(s), esperado 1', v_rc; END IF;
    v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'rh', v_rec);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (c): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P52L FAIL (c): [rec_inativo] — o recrutador desativado (token ainda valido) leu: %', pg_temp.p52l_resumo(v_res);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) candidato titular → 42501.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  v_res jsonb;
BEGIN
  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.dev_cand')::uuid, 'candidato', current_setting('smoke52l.cand')::uuid);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P52L FAIL (d): [candidato] — o candidato leu a leitura do RH: %', pg_temp.p52l_resumo(v_res);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) authenticated sem claims → 42501.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
DECLARE
  v_res jsonb;
BEGIN
  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.dev_cand')::uuid, 'sem_claims', NULL);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P52L FAIL (e): [sem_claims] — authenticated sem claims leu: %', pg_temp.p52l_resumo(v_res);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) anon: sem EXECUTE pelo ACL (não pela guarda).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  v_oid  oid := pg_catalog.to_regprocedure('public.ler_devolutiva_bigfive_rh(uuid)');
  v_res  jsonb;
  v_rot  text[] := '{}';
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P52L FAIL (f): [ausente] — public.ler_devolutiva_bigfive_rh(uuid) nao existe';
  END IF;
  IF coalesce(has_function_privilege('anon', v_oid, 'EXECUTE'), true) THEN
    v_rot := v_rot || 'anon_privilegio'::text;
  END IF;
  IF NOT coalesce(has_function_privilege('authenticated', v_oid, 'EXECUTE'), false) THEN
    v_rot := v_rot || 'authenticated_sem_privilegio'::text;
  END IF;
  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.dev_cand')::uuid, 'anon', NULL);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:permission denied for function ler_devolutiva_bigfive_rh%' THEN
    v_rot := v_rot || ('anon_chamada:' || pg_temp.p52l_resumo(v_res));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (f): [%] — anon alcanca a funcao (esperado permission denied pelo ACL)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) projeção por allowlist — em todo retorno `disponivel` da população.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $g$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  r       record;
  v_res   jsonb;
  v_dim   jsonb;
  v_rot   text[] := '{}';
  v_i     int := 0;
BEGIN
  FOR r IN
    SELECT d.candidatura_id
      FROM public.devolutivas_candidato d
      JOIN public.candidaturas c ON c.id = d.candidatura_id
     WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     ORDER BY d.created_at, d.id
  LOOP
    v_i := v_i + 1;
    v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', r.candidatura_id, 'administrador', v_admin) -> 'ok';
    IF v_res IS NULL THEN
      v_rot := v_rot || ('dev' || v_i || '_sem_retorno');
      CONTINUE;
    END IF;
    IF jsonb_path_exists(v_res, 'strict $.**.percentil') THEN
      v_rot := v_rot || ('dev' || v_i || '_percentil');
    END IF;
    IF jsonb_path_exists(v_res, 'strict $.** ? (@.type() == "number")') THEN
      v_rot := v_rot || ('dev' || v_i || '_folha_numerica');
    END IF;
    IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_res) k)
       IS DISTINCT FROM ARRAY['dimensoes', 'disclaimer_emocional', 'disclaimer_lgpd_crp', 'situacao'] THEN
      v_rot := v_rot || ('dev' || v_i || '_chaves_topo');
    END IF;
    FOR v_dim IN SELECT e FROM jsonb_array_elements(v_res -> 'dimensoes') e LOOP
      IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_dim) k)
         IS DISTINCT FROM ARRAY['banda', 'dim', 'texto_interpretativo'] THEN
        v_rot := v_rot || ('dev' || v_i || '_chaves_dimensao');
      END IF;
      IF coalesce(v_dim ->> 'banda', '') NOT IN ('muito_baixo', 'mod_baixo', 'medio', 'mod_alto', 'muito_alto') THEN
        v_rot := v_rot || ('dev' || v_i || '_banda_fora');
      END IF;
      IF coalesce(v_dim ->> 'dim', '') NOT IN ('O', 'C', 'E', 'A', 'N') THEN
        v_rot := v_rot || ('dev' || v_i || '_dim_fora');
      END IF;
    END LOOP;
  END LOOP;
  IF v_i = 0 THEN
    v_rot := v_rot || 'populacao_vazia'::text;
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (g): [%] — a leitura do RH projeta fora da allowlist (numero cru, chave a mais ou banda fora do vocabulario)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$g$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) inexistente, rascunho e excluída — o MESMO erro; o desativado recebe 42501 antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $h$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  v_rec   uuid := current_setting('smoke52l.rec')::uuid;
  v_cand  uuid := current_setting('smoke52l.dev_cand')::uuid;
  v_fake  uuid := gen_random_uuid();
  v_inex  jsonb;
  v_rasc  jsonb;
  v_excl  jsonb;
  v_inat  jsonb;
  v_rc    int;
  v_err   text;
  v_ran   boolean := false;
  v_rot   text[] := '{}';
BEGIN
  IF EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.id = v_fake) THEN
    RAISE EXCEPTION 'P52L FAIL (h): o uuid sorteado existe — repetir';
  END IF;
  v_inex := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_fake, 'administrador', v_admin);
  BEGIN
    UPDATE public.candidaturas SET is_rascunho = true WHERE id = v_cand;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'rascunho atingiu % linha(s)', v_rc; END IF;
    v_rasc := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'administrador', v_admin);
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  BEGIN
    UPDATE public.candidaturas SET deleted_at = now() WHERE id = v_cand;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'exclusao atingiu % linha(s)', v_rc; END IF;
    v_excl := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'administrador', v_admin);
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := coalesce(v_err, format('%s: %s', SQLSTATE, SQLERRM));
  END;
  BEGIN
    UPDATE public.usuarios_rh SET ativo = false WHERE user_id = v_rec;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'desativar o recrutador atingiu % linha(s)', v_rc; END IF;
    v_inat := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_fake, 'rh', v_rec);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := coalesce(v_err, format('%s: %s', SQLSTATE, SQLERRM));
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (h): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF coalesce(v_inex ->> 'err', '') NOT LIKE 'P0002:%' THEN
    v_rot := v_rot || ('inexistente:' || pg_temp.p52l_resumo(v_inex));
  END IF;
  IF v_rasc IS DISTINCT FROM v_inex THEN
    v_rot := v_rot || ('rascunho:' || pg_temp.p52l_resumo(v_rasc));
  END IF;
  IF v_excl IS DISTINCT FROM v_inex THEN
    v_rot := v_rot || ('excluida:' || pg_temp.p52l_resumo(v_excl));
  END IF;
  IF coalesce(v_inat ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('inativo_inexistente:' || pg_temp.p52l_resumo(v_inat));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (h): [%] — inexistente/rascunho/excluida nao dao o mesmo no_data_found, ou o desativado aprende a existencia', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$h$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (i) admin lê o SJT MC de toda candidatura viva com linha sjt/mc — comparado com o esperado
--     lido como postgres; e o estado sem SJT.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $i$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  r       record;
  v_res   jsonb;
  v_esp   jsonb;
  v_got   jsonb;
  v_rot   text[] := '{}';
  v_i     int := 0;
  v_itens int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (s.candidatura_id) s.candidatura_id, s.metadata
      FROM public.scores_candidato s
      JOIN public.candidaturas c ON c.id = s.candidatura_id
     WHERE s.tipo = 'sjt' AND s.subtipo = 'mc' AND c.deleted_at IS NULL AND c.is_rascunho = false
     ORDER BY s.candidatura_id, s.created_at DESC, s.id
  LOOP
    v_i := v_i + 1;
    v_res := pg_temp.p52l_chamar('ler_sjt_mc_rh', r.candidatura_id, 'administrador', v_admin);
    IF v_res ? 'err' THEN
      v_rot := v_rot || ('sjt' || v_i || '_erro:' || left(v_res ->> 'err', 80));
      CONTINUE;
    END IF;
    v_res := v_res -> 'ok';
    IF v_res ->> 'situacao' IS DISTINCT FROM 'disponivel' THEN
      v_rot := v_rot || ('sjt' || v_i || '_situacao:' || coalesce(v_res ->> 'situacao', '<nulo>'));
    END IF;
    -- esperado: um item por resposta-objeto, na ordem do array (texto, sem cast).
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'pergunta_id', x.e ->> 'pergunta_id',
             'cenario', (SELECT p.cenario FROM public.perguntas p WHERE p.id::text = x.e ->> 'pergunta_id'),
             'escolhida_tag', x.e ->> 'tag',
             'escolhida_peso', CASE WHEN jsonb_typeof(x.e -> 'peso') = 'number' THEN x.e -> 'peso' END,
             'escolhida_no_banco', EXISTS (SELECT 1 FROM public.perguntas_opcao_sjt o
                                            WHERE o.pergunta_id::text = x.e ->> 'pergunta_id' AND o.opcao_id::text = x.e ->> 'opcao_id'),
             'alt_set', coalesce((SELECT jsonb_agg(o.opcao_id::text ORDER BY o.opcao_id::text) FROM public.perguntas_opcao_sjt o
                                   WHERE o.pergunta_id::text = x.e ->> 'pergunta_id'), '[]'::jsonb),
             'escolhidas', CASE WHEN EXISTS (SELECT 1 FROM public.perguntas_opcao_sjt o
                                              WHERE o.pergunta_id::text = x.e ->> 'pergunta_id' AND o.opcao_id::text = x.e ->> 'opcao_id')
                                THEN jsonb_build_array(x.e ->> 'opcao_id') ELSE '[]'::jsonb END)
             ORDER BY x.n), '[]'::jsonb)
      INTO v_esp
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.metadata -> 'respostas') = 'array' THEN r.metadata -> 'respostas' ELSE '[]'::jsonb END)
           WITH ORDINALITY AS x(e, n)
     WHERE jsonb_typeof(x.e) = 'object';
    -- o mesmo, projetado do retorno (o conjunto das alternativas, não a ordem — a ordem é de (o)).
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'pergunta_id', y.it ->> 'pergunta_id',
             'cenario', y.it ->> 'cenario',
             'escolhida_tag', y.it ->> 'escolhida_tag',
             'escolhida_peso', y.it -> 'escolhida_peso',
             'escolhida_no_banco', (y.it ->> 'escolhida_no_banco')::boolean,
             'alt_set', coalesce((SELECT jsonb_agg(a.e ->> 'opcao_id' ORDER BY a.e ->> 'opcao_id')
                                    FROM jsonb_array_elements(y.it -> 'alternativas') a(e)), '[]'::jsonb),
             'escolhidas', coalesce((SELECT jsonb_agg(a.e ->> 'opcao_id')
                                       FROM jsonb_array_elements(y.it -> 'alternativas') a(e)
                                      WHERE (a.e ->> 'escolhida')::boolean), '[]'::jsonb))
             ORDER BY y.n), '[]'::jsonb)
      INTO v_got
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_res -> 'itens') = 'array' THEN v_res -> 'itens' ELSE '[]'::jsonb END)
           WITH ORDINALITY AS y(it, n);
    IF v_got IS DISTINCT FROM v_esp THEN
      v_rot := v_rot || ('sjt' || v_i || '_itens_diferem_das_respostas');
    END IF;
    v_itens := v_itens + jsonb_array_length(v_esp);
  END LOOP;
  IF v_i = 0 OR v_itens = 0 THEN
    v_rot := v_rot || ('populacao_vazia:candidaturas=' || v_i || ',itens=' || v_itens);
  END IF;

  v_res := pg_temp.p52l_chamar('ler_sjt_mc_rh', current_setting('smoke52l.sem_sjt')::uuid, 'administrador', v_admin);
  IF v_res -> 'ok' IS DISTINCT FROM jsonb_build_object('situacao', 'sem_sjt_mc', 'itens', '[]'::jsonb) THEN
    v_rot := v_rot || ('sem_sjt:' || pg_temp.p52l_resumo(v_res));
  END IF;

  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (i): [%] — o admin nao le o SJT MC que o candidato respondeu (ou o estado sem SJT saiu errado)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$i$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (j) recrutador ATIVO lê sjt_cand — o mesmo retorno do admin.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $j$
DECLARE
  v_cand uuid := current_setting('smoke52l.sjt_cand')::uuid;
  v_adm  jsonb;
  v_rec  jsonb;
BEGIN
  v_adm := pg_temp.p52l_chamar('ler_sjt_mc_rh', v_cand, 'administrador', current_setting('smoke52l.admin')::uuid);
  v_rec := pg_temp.p52l_chamar('ler_sjt_mc_rh', v_cand, 'rh', current_setting('smoke52l.rec')::uuid);
  IF NOT (v_adm ? 'ok') OR NOT (v_rec ? 'ok') OR v_rec -> 'ok' IS DISTINCT FROM v_adm -> 'ok'
     OR v_rec #>> '{ok,situacao}' IS DISTINCT FROM 'disponivel' OR jsonb_array_length(v_rec #> '{ok,itens}') = 0 THEN
    RAISE EXCEPTION 'P52L FAIL (j): [rec_ativo] — o recrutador ativo nao le o SJT que o admin le (rec=%, admin=%)',
      pg_temp.p52l_resumo(v_rec), pg_temp.p52l_resumo(v_adm);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$j$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (k) o MESMO recrutador, desativado dentro do envelope → 42501 no SJT.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $k$
DECLARE
  v_rec  uuid := current_setting('smoke52l.rec')::uuid;
  v_res  jsonb;
  v_rc   int;
  v_err  text;
  v_ran  boolean := false;
BEGIN
  BEGIN
    UPDATE public.usuarios_rh SET ativo = false WHERE user_id = v_rec;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'desativar o recrutador atingiu % linha(s), esperado 1', v_rc; END IF;
    v_res := pg_temp.p52l_chamar('ler_sjt_mc_rh', current_setting('smoke52l.sjt_cand')::uuid, 'rh', v_rec);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (k): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P52L FAIL (k): [rec_inativo] — o recrutador desativado (token ainda valido) leu o SJT: %', pg_temp.p52l_resumo(v_res);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$k$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (l) candidato titular e sem claims → 42501 no SJT.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $l$
DECLARE
  v_cand uuid := current_setting('smoke52l.sjt_cand')::uuid;
  v_res  jsonb;
  v_rot  text[] := '{}';
BEGIN
  v_res := pg_temp.p52l_chamar('ler_sjt_mc_rh', v_cand, 'candidato', current_setting('smoke52l.cand')::uuid);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('candidato:' || pg_temp.p52l_resumo(v_res));
  END IF;
  v_res := pg_temp.p52l_chamar('ler_sjt_mc_rh', v_cand, 'sem_claims', NULL);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('sem_claims:' || pg_temp.p52l_resumo(v_res));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (l): [%] — quem nao e RH leu o SJT', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$l$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (m) anon: sem EXECUTE pelo ACL em ler_sjt_mc_rh.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $m$
DECLARE
  v_oid  oid := pg_catalog.to_regprocedure('public.ler_sjt_mc_rh(uuid)');
  v_res  jsonb;
  v_rot  text[] := '{}';
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P52L FAIL (m): [ausente] — public.ler_sjt_mc_rh(uuid) nao existe';
  END IF;
  IF coalesce(has_function_privilege('anon', v_oid, 'EXECUTE'), true) THEN
    v_rot := v_rot || 'anon_privilegio'::text;
  END IF;
  IF NOT coalesce(has_function_privilege('authenticated', v_oid, 'EXECUTE'), false) THEN
    v_rot := v_rot || 'authenticated_sem_privilegio'::text;
  END IF;
  v_res := pg_temp.p52l_chamar('ler_sjt_mc_rh', current_setting('smoke52l.sjt_cand')::uuid, 'anon', NULL);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:permission denied for function ler_sjt_mc_rh%' THEN
    v_rot := v_rot || ('anon_chamada:' || pg_temp.p52l_resumo(v_res));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (m): [%] — anon alcanca ler_sjt_mc_rh (esperado permission denied pelo ACL)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$m$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (n) projeção do SJT por allowlist — sem gabarito — em todo retorno da população.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $n$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  r       record;
  v_res   jsonb;
  v_it    jsonb;
  v_alt   jsonb;
  v_nesc  int;
  v_rot   text[] := '{}';
  v_i     int := 0;
  v_j     int;
BEGIN
  FOR r IN
    SELECT DISTINCT s.candidatura_id
      FROM public.scores_candidato s
      JOIN public.candidaturas c ON c.id = s.candidatura_id
     WHERE s.tipo = 'sjt' AND s.subtipo = 'mc' AND c.deleted_at IS NULL AND c.is_rascunho = false
     ORDER BY s.candidatura_id
  LOOP
    v_i := v_i + 1;
    v_res := pg_temp.p52l_chamar('ler_sjt_mc_rh', r.candidatura_id, 'administrador', v_admin) -> 'ok';
    IF v_res IS NULL THEN
      v_rot := v_rot || ('sjt' || v_i || '_sem_retorno');
      CONTINUE;
    END IF;
    IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_res) k) IS DISTINCT FROM ARRAY['itens', 'situacao'] THEN
      v_rot := v_rot || ('sjt' || v_i || '_chaves_topo');
    END IF;
    v_j := 0;
    FOR v_it IN SELECT e FROM jsonb_array_elements(v_res -> 'itens') e LOOP
      v_j := v_j + 1;
      IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_it) k)
         IS DISTINCT FROM ARRAY['alternativas', 'cenario', 'escolhida_no_banco', 'escolhida_peso', 'escolhida_tag', 'pergunta_id'] THEN
        v_rot := v_rot || ('sjt' || v_i || '_item' || v_j || '_chaves');
      END IF;
      v_nesc := 0;
      FOR v_alt IN SELECT e FROM jsonb_array_elements(v_it -> 'alternativas') e LOOP
        IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_alt) k) IS DISTINCT FROM ARRAY['escolhida', 'opcao_id', 'texto'] THEN
          v_rot := v_rot || ('sjt' || v_i || '_item' || v_j || '_alternativa_com_chave_a_mais');
        END IF;
        IF jsonb_typeof(v_alt -> 'escolhida') IS DISTINCT FROM 'boolean' THEN
          v_rot := v_rot || ('sjt' || v_i || '_item' || v_j || '_escolhida_nao_booleana');
        ELSIF (v_alt ->> 'escolhida')::boolean THEN
          v_nesc := v_nesc + 1;
        END IF;
      END LOOP;
      IF v_nesc IS DISTINCT FROM (CASE WHEN (v_it ->> 'escolhida_no_banco')::boolean THEN 1 ELSE 0 END) THEN
        v_rot := v_rot || ('sjt' || v_i || '_item' || v_j || '_escolhidas=' || v_nesc);
      END IF;
    END LOOP;
  END LOOP;
  IF v_i = 0 THEN
    v_rot := v_rot || 'populacao_vazia'::text;
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (n): [%] — o SJT do RH projeta fora da allowlist (gabarito nas alternativas, ou escolhida que nao e uma so)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$n$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (o) ORDEM NEUTRA determinística — fixture em escada (ordem 1 = fortemente_pontua, como em PROD).
--     Ids de FIXTURE, literais; posições conferidas OFFLINE pela MESMA expressão do ORDER BY da
--     RPC, `md5(pergunta_id::text || opcao_id::text)` (ordem crescente do hex; o 52-08 conferiu
--     também em PROD, só leitura, o item 4), opção k = 1 fortemente_pontua · 2 pontua · 3 neutro ·
--     4 atencao:
--       item 1  p …0001, opções …0011..0014: atencao 279e551c < neutro c9aff9f0 <
--               FORTEMENTE ebf06660 < pontua f47491b7                                   → posição 3
--       item 2  p …0002, opções …0121..0124: pontua 8fb679c9 < FORTEMENTE a7efb7ed <
--               neutro c284fce0 < atencao d1d54e02                                      → posição 2
--       item 3  p …0003, opções …0031..0034: atencao 3657d852 < pontua 97b9ee16 <
--               FORTEMENTE dae22de8 < neutro eb481b2e                                   → posição 3
--       item 4  p …0004, opções …0c41..0c44: neutro 422e776e < pontua 6603adc5 <
--               atencao 7bc57307 < FORTEMENTE e2a03dcc                                  → posição 4
--     (8 primeiros hex do md5 de cada par). Nenhum item tem a fortemente_pontua em 1; três
--     posições distintas. Com `ORDER BY o.ordem` ela seria a PRIMEIRA nos 4 — a mutação L4 morde
--     aqui sempre, sem sorteio. As perguntas nascem com `status` NÃO ativo: o cenário só sai se a
--     RPC lê `perguntas` sem filtro de status. A escolhida de cada item é a opção 3 (neutro).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $o$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  v_cand  uuid := current_setting('smoke52l.sem_sjt')::uuid;
  v_perg  uuid[] := ARRAY['5208a000-0000-4000-8000-000000000001', '5208a000-0000-4000-8000-000000000002',
                          '5208a000-0000-4000-8000-000000000003', '5208a000-0000-4000-8000-000000000004']::uuid[];
  v_ops   uuid[] := ARRAY[
    ARRAY['5208b000-0000-4000-8000-000000000011', '5208b000-0000-4000-8000-000000000012',
          '5208b000-0000-4000-8000-000000000013', '5208b000-0000-4000-8000-000000000014'],
    ARRAY['5208b000-0000-4000-8000-000000000121', '5208b000-0000-4000-8000-000000000122',
          '5208b000-0000-4000-8000-000000000123', '5208b000-0000-4000-8000-000000000124'],
    ARRAY['5208b000-0000-4000-8000-000000000031', '5208b000-0000-4000-8000-000000000032',
          '5208b000-0000-4000-8000-000000000033', '5208b000-0000-4000-8000-000000000034'],
    ARRAY['5208b000-0000-4000-8000-000000000c41', '5208b000-0000-4000-8000-000000000c42',
          '5208b000-0000-4000-8000-000000000c43', '5208b000-0000-4000-8000-000000000c44']]::uuid[];
  v_esp   int[]  := ARRAY[3, 2, 3, 4];
  v_tags  text[] := ARRAY['fortemente_pontua', 'pontua', 'neutro', 'atencao'];
  v_pesos int[]  := ARRAY[3, 2, 1, -1];
  v_resp  jsonb := '[]'::jsonb;
  v_res   jsonb;
  v_it    jsonb;
  v_pos   int;
  v_err   text;
  v_ran   boolean := false;
  v_rot   text[] := '{}';
  i       int;
  k       int;
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM public.perguntas p WHERE p.id = ANY (v_perg))
       OR EXISTS (SELECT 1 FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = ANY (v_perg)) THEN
      RAISE EXCEPTION 'ids de fixture ja existem em PROD';
    END IF;
    FOR i IN 1..4 LOOP
      INSERT INTO public.perguntas (id, tipo, cargo, cenario, formato, status)
      VALUES (v_perg[i], 'sjt', 'p52-smoke', 'p52-smoke cenario ' || i, 'mc', 'p52-smoke-retirada');
      FOR k IN 1..4 LOOP
        INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
        VALUES (v_perg[i], v_ops[i][k], 'p52-smoke opcao ' || i || '.' || k, v_tags[k]::public.enum_tag_opcao, v_pesos[k], k);
      END LOOP;
      v_resp := v_resp || jsonb_build_array(jsonb_build_object('pergunta_id', v_perg[i], 'opcao_id', v_ops[i][3],
                                                               'tag', v_tags[3], 'peso', v_pesos[3]));
    END LOOP;
    INSERT INTO public.scores_candidato (candidatura_id, tipo, subtipo, status, metadata)
    VALUES (v_cand, 'sjt', 'mc', 'sucesso', jsonb_build_object('respostas', v_resp));
    v_res := pg_temp.p52l_chamar('ler_sjt_mc_rh', v_cand, 'administrador', v_admin);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (o): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF NOT (v_res ? 'ok') OR jsonb_array_length(coalesce(v_res #> '{ok,itens}', '[]'::jsonb)) <> 4 THEN
    RAISE EXCEPTION 'P52L FAIL (o): [itens] — a fixture de 4 itens nao voltou com 4 itens: %', pg_temp.p52l_resumo(v_res);
  END IF;
  FOR i IN 1..4 LOOP
    v_it := v_res #> ARRAY['ok', 'itens', (i - 1)::text];
    IF v_it ->> 'pergunta_id' IS DISTINCT FROM v_perg[i]::text THEN
      v_rot := v_rot || ('item' || i || '_fora_da_ordem_das_respostas');
    END IF;
    IF v_it ->> 'cenario' IS DISTINCT FROM ('p52-smoke cenario ' || i) THEN
      v_rot := v_rot || ('item' || i || '_cenario_de_pergunta_nao_ativa_nao_lido');
    END IF;
    v_pos := NULL;
    SELECT a.n INTO v_pos
      FROM jsonb_array_elements(v_it -> 'alternativas') WITH ORDINALITY AS a(e, n)
     WHERE a.e ->> 'opcao_id' = v_ops[i][1]::text;
    IF v_pos IS DISTINCT FROM v_esp[i] THEN
      v_rot := v_rot || ('item' || i || '_fortemente_pontua_pos=' || coalesce(v_pos::text, 'ausente') || '(esperado ' || v_esp[i] || ')');
    END IF;
  END LOOP;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (o): [%] — em algum item a fortemente_pontua nao esta na posicao neutra esperada (nenhum item pode te-la em 1)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$o$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (p) triagem: admin e recrutador ativo leem o pedido humana_triagem — motivo e justificativa.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p$
DECLARE
  v_ped  uuid;
  v_adm  jsonb;
  v_rec  jsonb;
  v_esp  jsonb;
  v_err  text;
  v_ran  boolean := false;
  v_rot  text[] := '{}';
BEGIN
  BEGIN
    v_ped := pg_temp.p52l_pedido_tri();
    SELECT jsonb_build_object('situacao', 'disponivel',
                              'motivo', nullif(btrim(coalesce(c.motivo_rejeicao, '')), ''),
                              'justificativa', nullif(btrim(coalesce(h.criterio_texto, '')), ''))
      INTO v_esp
      FROM public.revisao_rejeicao r
      JOIN public.candidaturas c ON c.id = r.candidatura_id
      JOIN public.historico_candidatura h ON h.id = r.historico_rejeicao_id
     WHERE r.id = v_ped;
    v_adm := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', v_ped, 'administrador', current_setting('smoke52l.admin')::uuid);
    v_rec := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', v_ped, 'rh', current_setting('smoke52l.rec')::uuid);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (p): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF v_esp IS NULL OR v_esp ->> 'justificativa' IS NULL THEN
    v_rot := v_rot || 'populacao:pedido_sem_justificativa'::text;
  END IF;
  IF v_adm -> 'ok' IS DISTINCT FROM v_esp THEN
    v_rot := v_rot || ('admin:' || pg_temp.p52l_resumo(v_adm));
  END IF;
  IF v_rec -> 'ok' IS DISTINCT FROM v_esp THEN
    v_rot := v_rot || ('rec_ativo:' || pg_temp.p52l_resumo(v_rec));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (p): [%] — o RH ativo nao le motivo e justificativa da rejeicao pela triagem', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$p$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (q) pedido automatica (knockout) e inexistente → o MESMO P0002.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $q$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  v_fake  uuid := gen_random_uuid();
  v_auto  jsonb;
  v_inex  jsonb;
  v_rot   text[] := '{}';
BEGIN
  IF EXISTS (SELECT 1 FROM public.revisao_rejeicao r WHERE r.id = v_fake) THEN
    RAISE EXCEPTION 'P52L FAIL (q): o uuid sorteado existe — repetir';
  END IF;
  v_auto := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', current_setting('smoke52l.auto')::uuid, 'administrador', v_admin);
  v_inex := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', v_fake, 'administrador', v_admin);
  IF coalesce(v_inex ->> 'err', '') NOT LIKE 'P0002:%' THEN
    v_rot := v_rot || ('inexistente:' || pg_temp.p52l_resumo(v_inex));
  END IF;
  IF v_auto IS DISTINCT FROM v_inex THEN
    v_rot := v_rot || ('automatica:' || pg_temp.p52l_resumo(v_auto));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (q): [%] — pedido de knockout ou inexistente nao da o mesmo no_data_found da triagem', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$q$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (r) recrutador desativado → 42501 antes de distinguir (triagem, automatica, inexistente).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $r$
DECLARE
  v_rec  uuid := current_setting('smoke52l.rec')::uuid;
  v_ped  uuid;
  v_tri  jsonb;
  v_auto jsonb;
  v_inex jsonb;
  v_rc   int;
  v_err  text;
  v_ran  boolean := false;
  v_rot  text[] := '{}';
BEGIN
  BEGIN
    v_ped := pg_temp.p52l_pedido_tri();
    UPDATE public.usuarios_rh SET ativo = false WHERE user_id = v_rec;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'desativar o recrutador atingiu % linha(s), esperado 1', v_rc; END IF;
    v_tri  := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', v_ped, 'rh', v_rec);
    v_auto := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', current_setting('smoke52l.auto')::uuid, 'rh', v_rec);
    v_inex := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', gen_random_uuid(), 'rh', v_rec);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (r): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF coalesce(v_tri ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('rec_inativo_triagem:' || pg_temp.p52l_resumo(v_tri));
  END IF;
  IF coalesce(v_auto ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('rec_inativo_automatica:' || pg_temp.p52l_resumo(v_auto));
  END IF;
  IF coalesce(v_inex ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('rec_inativo_inexistente:' || pg_temp.p52l_resumo(v_inex));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (r): [%] — o recrutador desativado leu o contexto ou aprendeu a existencia do pedido', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$r$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (s) triagem: anon pelo ACL; candidato e sem claims → 42501.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $s$
DECLARE
  v_oid  oid := pg_catalog.to_regprocedure('public.ler_contexto_rejeicao_triagem_revisao(uuid)');
  v_ped  uuid;
  v_anon jsonb;
  v_cand jsonb;
  v_sem  jsonb;
  v_err  text;
  v_ran  boolean := false;
  v_rot  text[] := '{}';
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P52L FAIL (s): [ausente] — public.ler_contexto_rejeicao_triagem_revisao(uuid) nao existe';
  END IF;
  BEGIN
    v_ped := pg_temp.p52l_pedido_tri();
    v_anon := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', v_ped, 'anon', NULL);
    v_cand := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', v_ped, 'candidato', current_setting('smoke52l.cand')::uuid);
    v_sem  := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', v_ped, 'sem_claims', NULL);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (s): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF coalesce(has_function_privilege('anon', v_oid, 'EXECUTE'), true) THEN
    v_rot := v_rot || 'anon_privilegio'::text;
  END IF;
  IF NOT coalesce(has_function_privilege('authenticated', v_oid, 'EXECUTE'), false) THEN
    v_rot := v_rot || 'authenticated_sem_privilegio'::text;
  END IF;
  IF coalesce(v_anon ->> 'err', '') NOT LIKE '42501:permission denied for function ler_contexto_rejeicao_triagem_revisao%' THEN
    v_rot := v_rot || ('anon_chamada:' || pg_temp.p52l_resumo(v_anon));
  END IF;
  IF coalesce(v_cand ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('candidato:' || pg_temp.p52l_resumo(v_cand));
  END IF;
  IF coalesce(v_sem ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('sem_claims:' || pg_temp.p52l_resumo(v_sem));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (s): [%] — quem nao e RH alcanca o contexto da triagem', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$s$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (t) candidatura viva nas duas RPCs novas — o MESMO erro do inexistente.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $t$
DECLARE
  v_admin    uuid := current_setting('smoke52l.admin')::uuid;
  v_sjt      uuid := current_setting('smoke52l.sjt_cand')::uuid;
  v_ped      uuid;
  v_sjt_inex jsonb;
  v_sjt_rasc jsonb;
  v_tri_inex jsonb;
  v_tri_excl jsonb;
  v_rc       int;
  v_err      text;
  v_ran      boolean := false;
  v_rot      text[] := '{}';
BEGIN
  v_sjt_inex := pg_temp.p52l_chamar('ler_sjt_mc_rh', gen_random_uuid(), 'administrador', v_admin);
  v_tri_inex := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', gen_random_uuid(), 'administrador', v_admin);
  BEGIN
    UPDATE public.candidaturas SET is_rascunho = true WHERE id = v_sjt;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'rascunho atingiu % linha(s)', v_rc; END IF;
    v_sjt_rasc := pg_temp.p52l_chamar('ler_sjt_mc_rh', v_sjt, 'administrador', v_admin);
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  BEGIN
    v_ped := pg_temp.p52l_pedido_tri();
    UPDATE public.candidaturas SET deleted_at = now()
     WHERE id = (SELECT r.candidatura_id FROM public.revisao_rejeicao r WHERE r.id = v_ped);
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'exclusao atingiu % linha(s)', v_rc; END IF;
    v_tri_excl := pg_temp.p52l_chamar('ler_contexto_rejeicao_triagem_revisao', v_ped, 'administrador', v_admin);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := coalesce(v_err, format('%s: %s', SQLSTATE, SQLERRM));
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (t): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF coalesce(v_sjt_inex ->> 'err', '') NOT LIKE 'P0002:%' THEN
    v_rot := v_rot || ('sjt_inexistente:' || pg_temp.p52l_resumo(v_sjt_inex));
  END IF;
  IF v_sjt_rasc IS DISTINCT FROM v_sjt_inex THEN
    v_rot := v_rot || ('sjt_rascunho:' || pg_temp.p52l_resumo(v_sjt_rasc));
  END IF;
  IF coalesce(v_tri_inex ->> 'err', '') NOT LIKE 'P0002:%' THEN
    v_rot := v_rot || ('triagem_inexistente:' || pg_temp.p52l_resumo(v_tri_inex));
  END IF;
  IF v_tri_excl IS DISTINCT FROM v_tri_inex THEN
    v_rot := v_rot || ('triagem_candidatura_excluida:' || pg_temp.p52l_resumo(v_tri_excl));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (t): [%] — candidatura excluida/rascunho nao da o mesmo no_data_found do inexistente', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$t$;
