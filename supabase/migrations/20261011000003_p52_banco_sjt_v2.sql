-- 20261011000003_p52_banco_sjt_v2.sql
--
-- POR QUE ESTA MIGRATION EXISTE
--
-- (D-28) O cargo de pre-vendas (`sdr-social-seller`) tinha 1 item SJT, e a vaga ATIVA de
-- Consultor(a) de Relacionamento e Pre-vendas aponta `work_sample_sjt` para ele, obrigatorio,
-- com peso 15: uma unica escolha mudava a faixa do candidato. Ele passa a ter 6 mc + 1 caso
-- aberto, no tamanho do banco de marketing (`20260929000001`).
-- (D-34) Em cada item mc as 4 alternativas tem comprimento parecido: a certa nao pode ser
-- denunciada pelo tamanho. A regra e conferivel por tabela (`scripts/geradores/
-- tabela-comprimento-sjt.py`), e o POS desta migration devolve o md5 da MESMA tabela medida por
-- `char_length` no banco (`tabela_md5`), para provar que o texto que chegou e o conferido.
-- (D-35) O banco de marketing ganha versao nova dos 6 mc de cada cargo pela mesma regra. Os
-- itens antigos dos cargos do texto sao RETIRADOS neste mesmo arquivo (`status = 'retired'`),
-- nunca apagados: as respostas antigas continuam apontando para linhas existentes. Item antigo
-- e item novo do mesmo cargo nao ficam ativos juntos (a vaga sorteia do cargo). Um caso aberto
-- marcado no texto como «mantido do banco no ar» FICA: nenhum INSERT para ele, e o PRE e o POS
-- amarram o id vivo.
-- (D-37) A `ordem` das alternativas e uma permutacao deterministica semeada pelo content_hash do
-- item: no banco antigo a ordem 1 era sempre a certa, entao a propria `ordem` era o gabarito.
-- (WR-03 do 52-REVIEW-PORTAO-1) O banco semeado em `20260611000002` gravou `opcao_id` feitos a
-- mao cujo sufixo e a `ordem` (o final `1` e a certa), e `get_opcoes_sjt` entrega o `opcao_id` ao
-- candidato: o gabarito viajava no payload. Os cargos que este texto NAO reescreve ficam com esses
-- itens, entao este arquivo REMAPEIA, depois da retirada, todo `opcao_id` de alternativa de item SJT
-- ativo que nao tenha a forma de uuid v4 para `gen_random_uuid()`, e atualiza na MESMA transacao as
-- respostas gravadas que apontam para ele (`scores_candidato.metadata.respostas[].opcao_id`). So o
-- id muda: texto, etiqueta, peso, `ordem`, pergunta e o score gravado ficam. Escopo por forma,
-- nunca por lista: nenhum id, velho ou novo, aparece neste arquivo.
-- ⚠ ISTO ATUALIZA RESPOSTA GRAVADA DE CANDIDATO (escrita destrutiva sobre dado vivo): o apply so
-- roda com o OK do operador no checkpoint do apply, e o PRE recusa sem mudar nada se o id velho
-- aparecer em qualquer tabela fora do alcance desta transacao (o ledger, que guarda o texto da
-- migration semeadora, e historia e fica). Um candidato com a prova SJT aberta NO MOMENTO do apply,
-- num cargo remapeado, enviaria um id que deixou de existir: o PRE conta essas candidaturas e
-- publica os ids delas (`em_curso`, `em_curso_ids` na evidencia; id de candidatura, nenhum dado
-- pessoal) para o operador ver antes.
-- (WR-02 do 52-REVIEW-PORTAO-2) Esse envio NAO e mais pontuado em silencio: este arquivo troca o
-- corpo de `pontuar_sjt` pelo corpo VIVO mais uma recusa — toda resposta cujo `opcao_id` nao casa
-- uma alternativa da pergunta faz a submissao inteira falhar com 22023 ('opcao fora da pergunta'),
-- sem gravar nada. O corpo vivo e lido de `scripts/geradores/pontuar_sjt_vivo.plpgsql` (md5
-- conferido pelo gerador); o PRE recusa se o `prosrc` vivo tiver mudado; o POS confere o md5 novo,
-- as propriedades, a ACL (mantida como esta no ar, sem GRANT/REVOKE) e o comentario.
-- ⚠ ISTO SUBSTITUI UMA FUNCAO VIVA: o desfazer e recriar o corpo velho a partir daquele arquivo.
-- (WR-01 do 52-REVIEW-PORTAO-2) O mapa velho→novo do remapeamento e gravado na MESMA transacao em
-- `supabase_migrations.p52_remap_opcao_sjt` (esquema sem USAGE para anon, authenticated e service_role;
-- RLS ligada, nenhum GRANT): o id velho carrega a ordem, entao o mapa e o gabarito dos itens
-- remapeados. O desfazer do remapeamento le dali (id velho de volta nas alternativas + uma segunda
-- passada nas respostas gravadas).
--
-- pontuar_sjt_prosrc_md5_antes: 7a892f7b8c15e35b0976e408f9648864
-- pontuar_sjt_prosrc_md5_novo: 66fe507fbf5bf6a98bd7e5eecd84f310
--
-- Cargos deste texto: sdr-social-seller, social-media, videomaker-storymaker, editor-video.
-- Itens: 24 mc + 4 caso aberto; 25 inseridos por este arquivo, 3 mantido(s) do ar.
--
-- ⚠ ESTE SQL FOI GERADO, NAO TRANSCRITO.
-- Gerador: scripts/geradores/gen-sjt-v2.py
-- Texto:   docs/specs/BANCO-SJT-V2.md (md5 03b2a0d5d96774bbb73b06b7c693bbe5)
-- Nao editar este arquivo a mao: uma anotacao vai no texto ou no gerador, e o SQL e gerado de novo.
-- Rodar o gerador duas vezes sobre o mesmo texto da SQL byte a byte igual.
--
-- ⚠ `cenario` e `opcao_texto` sao TEXTO PURO na tela do candidato (sem TextoRico): o gerador
-- tira a enfase markdown e RECUSA o texto se sobrar marcacao. Linguagem: a regra de linguagem do
-- CLAUDE.md vale para todo texto mostrado ao candidato e para este cabecalho.
--
-- Idempotente por `content_hash` (sha256 do cenario + textos das opcoes): um item cujo texto
-- mudar entra como item novo, de proposito; reaplicar nao duplica (WHERE NOT EXISTS) e a
-- retirada so alcanca `status = 'active'`. O ledger recusa a versao repetida.
--
-- Sem BEGIN/COMMIT: o endpoint ja roda o corpo inteiro numa unica transacao, e `DO` adjacentes a
-- um BEGIN sao a forma exata do 42601 (CLAUDE.md §Migrations).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261011000003_p52_banco_sjt_v2.sql
-- SO depois do portao de texto do operador (52-17), com o OK do operador ao remapeamento (WR-03),
-- a troca do `pontuar_sjt` (WR-02) e o mapa (WR-01) no checkpoint do apply, e fora de sessao de UAT
-- em curso: um candidato com prova aberta no momento do apply recebe erro — `42704` em
-- `get_opcoes_sjt` para item retirado; 22023 em `pontuar_sjt` para id remapeado (a tela precisa ser
-- recarregada para buscar os ids novos).

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P52B PRE-PORTAO — recusa sem mudar nada; guarda em GUCs LOCAIS o escopo e a baseline.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_cargos     text[] := ARRAY['sdr-social-seller', 'social-media', 'videomaker-storymaker', 'editor-video']::text[];
  v_hashes     text[] := ARRAY['f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', '1085a6d60f1593967ca65ce3d707f06112c779f7eca5144ab12f183106c7e3e2', '2da6c7c4b89403c0bbcfe1ce0762d338bc72bdd9e7f9668f86755551316eae0b', '323dee0bdbb48fd3a30b4cd9f27da6395cb3b3bad7b56e3f044f94f7f74dafef', 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', '4d259109f320ec7c5b62321c97f2782024c6a93dcad044a57c86b502d8521b15', '54a2cb3f7114f9272ae8bd1b5435a7b48b9474db9d4957dc260879416f6b2bec', 'da3d73ac52483923393f1a6c3fb417a064e1a13a907868112d34609cbfcab17f', 'a5afc110964d2293ce1a74abd2fb97b7b50feec16ec43a4c7fd229ee22847f98', '0e2a5cb9cdfdef69f667d3c65f3b56e255e4f61e9a91a3261b08ef0328c772ec', '4322993ccd75434a48ce1069527b491e4e234d7a2564308d8fcc0d48aa86fce2', 'bae7a01d6917b925dd6e5a2da55ce31822fa2d9084699dc59c095754c2b68ba9', '31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79', '479bc6d918284700afebea9888b3e22dff0476215bbb7d283f91f9c0e13ec0d2', '6caee594b0484d83e074ea09fceb43938a134e1542d3c6b0c3fd6208416957a1', 'd185460236a3805e9e6bfdffd0b5cce65ad41a3a00f4f6a6f20c5080b62c23e6', 'ae2f1d339a80d168bcfca35e635e6269755f97a603078f1064d137fa6c1a65c4', '90d5ef9a32379be60b10714b26430e9fd26795b0a2e1f017c9064382cfb81170', '93e75df28db38a199267ad8b2ecdaa648a30bb3f2de2d14a24a77f8df408e1e9', '98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa', 'e4bd9ba06c1020db93b8b93772ce1983fb3a9df0ee720b6b0975421940a5bac3', '09b29ae2399a45274ac355bf078ed13ae8d559c128c02a90332a1df4de39c404', 'd52fbe3e027d4721cf792a139a86312aea5e2ecfd41d8bd2176f4854e7fae76a', 'a50ce621b769984dcef6237486186b70f7ddd5481eead0c5dcd18f865c120334', '8dff2b09bec6b930601b0960343d0b18a8c0676aa993ec653281100fe3825f13', '586311e4a47f584fc57909cbced5c1ddfebac69bdf8646ee8a24ef6835e1e05e', 'c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c']::text[];
  v_hash_cargo text[] := ARRAY['sdr-social-seller', 'sdr-social-seller', 'sdr-social-seller', 'sdr-social-seller', 'sdr-social-seller', 'sdr-social-seller', 'sdr-social-seller', 'social-media', 'social-media', 'social-media', 'social-media', 'social-media', 'social-media', 'social-media', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'editor-video', 'editor-video', 'editor-video', 'editor-video', 'editor-video', 'editor-video', 'editor-video']::text[];
  v_mant_cargo text[] := ARRAY['editor-video', 'social-media', 'videomaker-storymaker']::text[];
  v_mant_hash  text[] := ARRAY['c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c', '31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79', '98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa']::text[];
  v_vagas      text;
  v_forma      text;
  v_n          bigint;
  v_id         text;
  v_ids        text;
  v_mant       text := '';
  k            int;
  -- (remap, WR-03)
  v_scope      uuid[];
  v_scope_p    text[];
  v_rn         bigint;
  v_ri         bigint;
  v_rids       text;
  v_velhos     text[];
  v_refs       bigint;
  v_rlin       bigint;
  v_re         text;
  v_occ        bigint;
  v_fora       text[] := ARRAY[]::text[];
  v_curso      bigint;
  v_curso_ids  text;
  v_tab        record;
BEGIN
  -- (forma) toda vaga tem `testes_aplicaveis` em forma de lista (ou nulo): outra forma esconderia
  -- um ponteiro de bateria desta varredura
  SELECT string_agg(v.id::text, ', ' ORDER BY v.id::text) INTO v_forma
    FROM public.vagas v
   WHERE v.testes_aplicaveis IS NOT NULL AND jsonb_typeof(v.testes_aplicaveis) <> 'array';
  IF v_forma IS NOT NULL THEN
    RAISE EXCEPTION 'P52B PRE-PORTAO (forma): vaga(s) com testes_aplicaveis fora da forma de lista [%] — a varredura de bateria nao as le; nada mudou', v_forma;
  END IF;

  -- (itens_ids, D-29) vaga de QUALQUER status cuja bateria SJT liste itens por id, num cargo do
  -- texto ou apontando item de um cargo do texto: a retirada por cargo nao a alcancaria
  SELECT string_agg(DISTINCT v.id::text || ':' || v.status, ', ') INTO v_vagas
    FROM public.vagas v
   CROSS JOIN LATERAL jsonb_array_elements(coalesce(v.testes_aplicaveis, '[]'::jsonb)) e
   WHERE (e ->> 'tipo' = 'sjt' OR e ->> 'teste' IN ('sjt', 'work_sample_sjt'))
     AND jsonb_typeof(e -> 'itens_ids') = 'array' AND jsonb_array_length(e -> 'itens_ids') > 0
     AND (e ->> 'cargo' = ANY (v_cargos)
          OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(e -> 'itens_ids') x
                       JOIN public.perguntas p ON p.id::text = x
                      WHERE p.cargo = ANY (v_cargos)));
  IF v_vagas IS NOT NULL THEN
    RAISE EXCEPTION 'P52B PRE-PORTAO (itens_ids): vaga(s) [%] listam itens por id num cargo do texto — a retirada por cargo nao as alcancaria; nada mudou', v_vagas;
  END IF;

  -- (hash nulo) item ativo sem content_hash escaparia da retirada (`<> ALL` daria nulo)
  SELECT count(*) INTO v_n FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active' AND p.content_hash IS NULL;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'P52B PRE-PORTAO (hash nulo): % item(ns) ativo(s) dos cargos do texto sem content_hash; nada mudou', v_n;
  END IF;

  -- (hash ocupado) hash do texto ja usado por item de OUTRO cargo ou fora do estado ativo: o
  -- WHERE NOT EXISTS pularia o INSERT e o cargo ficaria curto
  FOR k IN 1 .. coalesce(array_length(v_hashes, 1), 0) LOOP
    SELECT string_agg(p.cargo || '/' || p.status, ', ') INTO v_ids FROM public.perguntas p
     WHERE p.content_hash = v_hashes[k] AND (p.cargo <> v_hash_cargo[k] OR p.status <> 'active');
    IF v_ids IS NOT NULL THEN
      RAISE EXCEPTION 'P52B PRE-PORTAO (hash ocupado): o content_hash % do cargo % ja existe como [%]; nada mudou', v_hashes[k], v_hash_cargo[k], v_ids;
    END IF;
  END LOOP;

  -- (mantidos, D-35) cada caso aberto que FICA tem EXATAMENTE 1 item ativo com aquele hash no ar
  FOR k IN 1 .. coalesce(array_length(v_mant_cargo, 1), 0) LOOP
    SELECT count(*), min(p.id::text) INTO v_n, v_id FROM public.perguntas p
     WHERE p.tipo = 'sjt' AND p.cargo = v_mant_cargo[k] AND p.formato = 'caso_aberto'
       AND p.status = 'active' AND p.content_hash = v_mant_hash[k];
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'P52B PRE-PORTAO: caso mantido ausente do ar — cargo %, content_hash %: % item(ns) ativo(s) com esse hash (esperado 1); nada mudou', v_mant_cargo[k], v_mant_hash[k], v_n;
    END IF;
    v_mant := v_mant || CASE WHEN v_mant = '' THEN '' ELSE ',' END || v_mant_cargo[k] || '=' || v_id;
  END LOOP;

  -- baseline: os itens ativos que a retirada vai alcancar, medidos NESTA execucao
  SELECT count(*), coalesce(string_agg(p.id::text, ',' ORDER BY p.id::text), '')
    INTO v_n, v_ids
    FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active'
     AND p.content_hash <> ALL (v_hashes);

  -- ── (remap, WR-03) ──────────────────────────────────────────────────────────
  -- escopo: alternativas de item SJT ativo que CONTINUA ativo depois da retirada abaixo (fora dos
  -- cargos do texto, ou com hash do texto), cujo opcao_id nao tem a forma de uuid v4
  SELECT coalesce(array_agg(o.id ORDER BY o.id::text COLLATE "C"), ARRAY[]::uuid[]),
         coalesce(array_agg(DISTINCT o.pergunta_id::text), ARRAY[]::text[]),
         count(*), count(DISTINCT o.pergunta_id),
         coalesce(string_agg(o.id::text, ',' ORDER BY o.id::text COLLATE "C"), ''),
         coalesce(array_agg(lower(o.opcao_id::text) ORDER BY o.id::text COLLATE "C"), ARRAY[]::text[])
    INTO v_scope, v_scope_p, v_rn, v_ri, v_rids, v_velhos
    FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE p.tipo = 'sjt' AND p.status = 'active'
     AND NOT (p.cargo = ANY (v_cargos) AND p.content_hash <> ALL (v_hashes))
     AND o.opcao_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  -- referencias gravadas: elementos de `scores_candidato.metadata.respostas[]` (tipo sjt) que
  -- apontam o par (pergunta_id, opcao_id) de uma alternativa do escopo
  SELECT count(*), count(DISTINCT s.id) INTO v_refs, v_rlin
    FROM public.scores_candidato s
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array'
                                                THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e
    JOIN public.perguntas_opcao_sjt o ON o.id = ANY (v_scope)
                                     AND o.pergunta_id::text = lower(e ->> 'pergunta_id')
                                     AND o.opcao_id::text = lower(e ->> 'opcao_id')
   WHERE s.tipo = 'sjt' AND jsonb_typeof(e) = 'object';

  -- (remap fora do alcance) o id velho em QUALQUER tabela do banco (varredura por forma, nunca
  -- lista de tabelas): fora das alternativas, so pode estar nessas referencias de resposta — uma
  -- ocorrencia por elemento. O ledger guarda o texto da migration semeadora: historia, fica.
  IF cardinality(v_velhos) > 0 THEN
    v_re := '(' || array_to_string(v_velhos, '|') || ')';
    FOR v_tab IN SELECT format('%I.%I', n.nspname, c.relname) AS t
               FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
              WHERE c.relkind IN ('r', 'p')
                AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                AND n.nspname NOT LIKE 'pg\_temp%' AND n.nspname NOT LIKE 'pg\_toast\_temp%'
                AND c.oid <> 'public.perguntas_opcao_sjt'::regclass
                AND c.oid <> 'supabase_migrations.schema_migrations'::regclass
              ORDER BY 1 LOOP
      EXECUTE format('SELECT coalesce(sum((SELECT count(*) FROM regexp_matches(to_jsonb(x)::text, %L, %L))), 0) FROM %s x WHERE to_jsonb(x)::text ~* %L',
                     v_re, 'gi', v_tab.t, v_re) INTO v_occ;
      IF v_occ > 0 THEN
        v_fora := v_fora || (v_tab.t || '=' || v_occ);
      END IF;
    END LOOP;
  END IF;
  IF v_fora IS DISTINCT FROM (CASE WHEN v_refs > 0 THEN ARRAY['public.scores_candidato=' || v_refs] ELSE ARRAY[]::text[] END) THEN
    RAISE EXCEPTION 'P52B PRE-PORTAO (remap fora do alcance): id(s) velho(s) de alternativa em [%], esperado so public.scores_candidato=% (as respostas gravadas que o remapeamento atualiza); nada mudou', array_to_string(v_fora, ', '), v_refs;
  END IF;

  -- em curso: candidatura na avaliacao, ainda sem o SJT mc pontuado, numa vaga cuja bateria SJT
  -- alcanca item remapeado — se a prova estiver aberta no momento do apply, o id que ela enviar
  -- deixou de existir (e o `pontuar_sjt` novo a recusa com 22023). Contagem e ids de candidatura
  -- (nenhum dado pessoal), publicados para o operador (o apply e fora de sessao de UAT).
  SELECT count(*), coalesce(string_agg(c.id::text, '+' ORDER BY c.id::text), '') INTO v_curso, v_curso_ids
    FROM public.candidaturas c
   WHERE c.etapa_atual = 'avaliacao_assincrona'
     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s
                      WHERE s.candidatura_id = c.id AND s.tipo = 'sjt' AND s.subtipo = 'mc'
                        AND s.pergunta_id IS NULL AND s.status <> 'falhou')
     AND EXISTS (SELECT 1 FROM public.vagas v
                  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(v.testes_aplicaveis) = 'array'
                                                               THEN v.testes_aplicaveis ELSE '[]'::jsonb END) e
                  WHERE v.id = c.vaga_id
                    AND (e ->> 'tipo' = 'sjt' OR e ->> 'teste' IN ('sjt', 'work_sample_sjt'))
                    AND (e ->> 'cargo' IN (SELECT p.cargo FROM public.perguntas p WHERE p.id::text = ANY (v_scope_p))
                         OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(e -> 'itens_ids') = 'array'
                                                                                  THEN e -> 'itens_ids' ELSE '[]'::jsonb END) x
                                     WHERE lower(x) = ANY (v_scope_p))));

  PERFORM set_config('p52.banco_remap_ids',     v_rids, true);
  PERFORM set_config('p52.banco_remap_velhos',  array_to_string(v_velhos, ','), true);
  PERFORM set_config('p52.banco_remap_n',       v_rn::text, true);
  PERFORM set_config('p52.banco_remap_itens',   v_ri::text, true);
  PERFORM set_config('p52.banco_remap_refs',    v_refs::text, true);
  PERFORM set_config('p52.banco_remap_linhas',  v_rlin::text, true);
  PERFORM set_config('p52.banco_remap_curso',   v_curso::text, true);
  PERFORM set_config('p52.banco_remap_curso_ids', v_curso_ids, true);
  PERFORM set_config('p52.banco_respostas_fp',  (SELECT md5(coalesce(string_agg(q.x, E'\n' ORDER BY q.x COLLATE "C"), '')) FROM (SELECT s.id::text || '#' || r.ord::text || '|' || coalesce(r.e ->> 'pergunta_id', '-') || '|' || coalesce(r.e ->> 'tag', '-') || '|' || coalesce(r.e ->> 'peso', '-') || '|' || coalesce((SELECT string_agg(o.ordem::text || ':' || o.tag::text || ':' || o.peso::text, ';' ORDER BY o.id) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id::text = lower(r.e ->> 'pergunta_id') AND o.opcao_id::text = lower(r.e ->> 'opcao_id')), '-') AS x FROM public.scores_candidato s CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array' THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) WITH ORDINALITY AS r(e, ord) WHERE s.tipo = 'sjt') q), true);
  PERFORM set_config('p52.banco_scores_fp',     (SELECT md5(coalesce(string_agg(q.x, E'\n' ORDER BY q.x COLLATE "C"), '')) FROM (SELECT s.id::text || '|' || coalesce(s.score::text, '-') || '|' || coalesce(s.score_max::text, '-') || '|' || s.status::text || '|' || coalesce((SELECT sum(o.peso)::text FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array' THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e JOIN public.perguntas_opcao_sjt o ON o.pergunta_id::text = lower(e ->> 'pergunta_id') AND o.opcao_id::text = lower(e ->> 'opcao_id')), '-') AS x FROM public.scores_candidato s WHERE s.tipo = 'sjt') q), true);
  PERFORM set_config('p52.banco_escopo_fp',     (SELECT md5(coalesce(string_agg(o.id::text || '|' || o.pergunta_id::text || '|' || o.tag::text || '|' || o.peso::text || '|' || o.ordem::text || '|' || md5(o.opcao_texto), E'\n' ORDER BY o.id::text COLLATE "C"), '')) FROM public.perguntas_opcao_sjt o WHERE o.id::text = ANY (string_to_array(nullif(current_setting('p52.banco_remap_ids', true), ''), ','))), true);

  PERFORM set_config('p52.banco_cargos',      array_to_string(v_cargos, ','), true);
  PERFORM set_config('p52.banco_hashes',      array_to_string(v_hashes, ','), true);
  PERFORM set_config('p52.banco_retirar_n',   v_n::text,  true);
  PERFORM set_config('p52.banco_retirar_ids', v_ids,      true);
  PERFORM set_config('p52.banco_retirar_md5', md5(v_ids), true);
  PERFORM set_config('p52.banco_mantidos',    v_mant,     true);
END
$pre$;

-- ─────────────────────────────────────────────────────────────────────────────
-- P52B PRE-PORTAO (pontuar_sjt) — WR-02 do 52-REVIEW-PORTAO-2: o corpo VIVO tem de ser o que o
-- gerador leu (`scripts/geradores/pontuar_sjt_vivo.plpgsql`); senao recusa e nada muda. Guarda as
-- propriedades, a ACL, o comentario e o corpo velho em GUCs LOCAIS (o POS e o smoke comparam).
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_pontuar$
DECLARE
  v_md5   text;
  v_src   text;
  v_props text;
  v_acl   text;
  v_cmt   text;
  v_anon  text;
BEGIN
  SELECT md5(p.prosrc), p.prosrc,
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         coalesce((SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), ''),
         coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'),
         has_function_privilege('anon', p.oid, 'EXECUTE')::text
    INTO v_md5, v_src, v_props, v_acl, v_cmt, v_anon
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.pontuar_sjt(uuid,jsonb)');
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'P52B PRE-PORTAO (pontuar_sjt): public.pontuar_sjt(uuid, jsonb) nao existe; nada mudou';
  END IF;
  IF v_md5 IS DISTINCT FROM '7a892f7b8c15e35b0976e408f9648864' THEN
    RAISE EXCEPTION 'P52B PRE-PORTAO (pontuar_sjt): md5(prosrc) vivo = % (o gerador leu 7a892f7b8c15e35b0976e408f9648864) — o corpo vivo mudou depois da captura: recapturar scripts/geradores/pontuar_sjt_vivo.plpgsql e gerar de novo; nada mudou', v_md5;
  END IF;
  PERFORM set_config('p52.banco_pontuar_props',    v_props, true);
  PERFORM set_config('p52.banco_pontuar_acl',      v_acl,   true);
  PERFORM set_config('p52.banco_pontuar_cmt',      v_cmt,   true);
  PERFORM set_config('p52.banco_pontuar_anon',     v_anon,  true);
  PERFORM set_config('p52.banco_pontuar_velho',    v_src,   true);
  PERFORM set_config('p52.banco_pontuar_md5_novo', '66fe507fbf5bf6a98bd7e5eecd84f310', true);
END
$pre_pontuar$;

-- `pontuar_sjt`: o corpo VIVO + a recusa 22023 da resposta sem alternativa (WR-02). Mesma
-- assinatura, mesmas propriedades; CREATE OR REPLACE preserva dono, ACL e comentario.
CREATE OR REPLACE FUNCTION public.pontuar_sjt(p_candidatura_id uuid, p_respostas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga        uuid; v_cargo text; v_itens_ids uuid[]; v_battery uuid[];
  v_expected int; v_answered int; v_score int := 0; v_max int := 0;
  v_has_atencao boolean := false; v_status public.status_score; v_breakdown jsonb;
  v_mc_min_pct numeric := 60;
BEGIN
  SELECT c.vaga_id INTO v_vaga
    FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id AND ca.user_id = auth.uid() AND c.etapa_atual = 'avaliacao_assincrona';
  IF v_vaga IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.scores_candidato
     WHERE candidatura_id = p_candidatura_id AND tipo='sjt' AND subtipo='mc' AND pergunta_id IS NULL AND status <> 'falhou') THEN
    RAISE EXCEPTION 'avaliacao ja registrada' USING errcode = '42501';
  END IF;

  SELECT elem->>'cargo', ARRAY(SELECT jsonb_array_elements_text(elem->'itens_ids'))::uuid[]
    INTO v_cargo, v_itens_ids
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) elem
   WHERE v.id = v_vaga
     AND (elem->>'tipo' = 'sjt'
          OR elem->>'teste' IN ('sjt', 'work_sample_sjt'))
   LIMIT 1;

  SELECT array_agg(p.id) INTO v_battery FROM public.perguntas p
   WHERE p.status='active' AND p.formato='mc'
     AND ((v_itens_ids IS NOT NULL AND array_length(v_itens_ids,1)>0 AND p.id = ANY(v_itens_ids))
          OR ((v_itens_ids IS NULL OR array_length(v_itens_ids,1) IS NULL) AND p.cargo = v_cargo));
  v_expected := COALESCE(array_length(v_battery,1),0);
  IF v_expected = 0 THEN RAISE EXCEPTION 'bateria SJT nao configurada' USING errcode = '22023'; END IF;

  IF (SELECT count(*) FROM jsonb_array_elements(p_respostas))
     <> (SELECT count(DISTINCT r->>'pergunta_id') FROM jsonb_array_elements(p_respostas) r) THEN
    RAISE EXCEPTION 'resposta duplicada' USING errcode = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_respostas) r WHERE (r->>'pergunta_id')::uuid <> ALL(v_battery)) THEN
    RAISE EXCEPTION 'pergunta fora da bateria' USING errcode = '42501';
  END IF;

  SELECT count(DISTINCT r->>'pergunta_id') INTO v_answered FROM jsonb_array_elements(p_respostas) r;
  IF v_answered <> v_expected THEN
    RAISE EXCEPTION 'bateria incompleta (% de %)', v_answered, v_expected USING errcode = '22023';
  END IF;

  SELECT COALESCE((SELECT (elem->'threshold'->>'mc_min_pct')::numeric
      FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) elem
     WHERE v.id = v_vaga AND elem->>'tipo'='sjt' AND (elem->'threshold'->>'mc_min_pct') IS NOT NULL LIMIT 1), 60)
    INTO v_mc_min_pct;

  WITH marked AS (
    SELECT (r->>'pergunta_id')::uuid AS pergunta_id, (r->>'opcao_id')::uuid AS opcao_id
      FROM jsonb_array_elements(p_respostas) r
  ), scored AS (
    SELECT m.pergunta_id, pos.opcao_id, pos.tag, pos.peso
      FROM marked m JOIN public.perguntas_opcao_sjt pos ON pos.pergunta_id=m.pergunta_id AND pos.opcao_id=m.opcao_id
  ), maxes AS (
    SELECT pergunta_id, MAX(peso) AS peso_max FROM public.perguntas_opcao_sjt WHERE pergunta_id = ANY(v_battery) GROUP BY pergunta_id
  )
  SELECT COALESCE(SUM(s.peso),0), COALESCE((SELECT SUM(peso_max) FROM maxes),0),
         COALESCE(bool_or(s.tag='atencao'),false),
         COALESCE(jsonb_agg(jsonb_build_object('pergunta_id',s.pergunta_id,'opcao_id',s.opcao_id,'tag',s.tag,'peso',s.peso)),'[]'::jsonb)
    INTO v_score, v_max, v_has_atencao, v_breakdown FROM scored s;

  -- WR-01: gabarito-less battery (v_max=0) must fail loudly, not score 0/0 'sucesso'.
  IF v_max = 0 THEN RAISE EXCEPTION 'bateria SJT nao configurada' USING errcode = '22023'; END IF;

  -- WR-02 (52-REVIEW-PORTAO-2, Phase 52 / 52-16): toda resposta tem de casar uma alternativa da
  -- propria pergunta. O JOIN de `scored` descartava em silencio o par sem correspondencia (um
  -- opcao_id remapeado, retirado ou forjado) e a bateria saia com nota parcial definitiva; agora a
  -- submissao inteira e recusada alto e nada e gravado. (pergunta_id, opcao_id) e UNIQUE em
  -- perguntas_opcao_sjt: cada resposta que casa da exatamente 1 linha em `scored`.
  IF jsonb_array_length(v_breakdown) <> v_answered THEN
    RAISE EXCEPTION 'opcao fora da pergunta' USING errcode = '22023';
  END IF;

  v_status := CASE
    WHEN v_has_atencao OR (v_max > 0 AND (v_score::numeric / v_max) * 100 < v_mc_min_pct)
    THEN 'pendente_humano'::public.status_score ELSE 'sucesso'::public.status_score END;

  INSERT INTO public.scores_candidato (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES (p_candidatura_id,'sjt','mc',v_score,v_max,v_status,
     jsonb_build_object('respostas',v_breakdown,'has_atencao',v_has_atencao,'mc_min_pct',v_mc_min_pct,'expected',v_expected,'answered',v_answered,'versao',2))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)
  DO UPDATE SET score=EXCLUDED.score, score_max=EXCLUDED.score_max, status=EXCLUDED.status, metadata=EXCLUDED.metadata, updated_at=now()
  WHERE public.scores_candidato.status = 'falhou';

  RETURN jsonb_build_object('ok', true, 'registrado', true);
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- P52B POS-PORTAO (pontuar_sjt) — o corpo e o esperado; propriedades, ACL, comentario e o EXECUTE
-- de anon iguais aos do PRE (a ACL e mantida como esta no ar; nenhum GRANT/REVOKE aqui).
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_pontuar$
DECLARE
  v_md5   text;
  v_src   text;
  v_props text;
  v_acl   text;
  v_cmt   text;
  v_anon  text;
BEGIN
  SELECT md5(p.prosrc), p.prosrc,
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         coalesce((SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), ''),
         coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'),
         has_function_privilege('anon', p.oid, 'EXECUTE')::text
    INTO v_md5, v_src, v_props, v_acl, v_cmt, v_anon
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.pontuar_sjt(uuid,jsonb)');
  IF v_md5 IS DISTINCT FROM '66fe507fbf5bf6a98bd7e5eecd84f310' THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (pontuar_sjt): md5(prosrc) = % (esperado 66fe507fbf5bf6a98bd7e5eecd84f310); nada persiste', v_md5;
  END IF;
  IF v_props IS DISTINCT FROM current_setting('p52.banco_pontuar_props', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (pontuar_sjt): propriedades mudaram (% -> %); nada persiste', current_setting('p52.banco_pontuar_props', true), v_props;
  END IF;
  IF v_acl IS DISTINCT FROM current_setting('p52.banco_pontuar_acl', true)
     OR v_anon IS DISTINCT FROM current_setting('p52.banco_pontuar_anon', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (pontuar_sjt): ACL mudou (% -> %; anon EXECUTE % -> %); nada persiste', current_setting('p52.banco_pontuar_acl', true), v_acl, current_setting('p52.banco_pontuar_anon', true), v_anon;
  END IF;
  IF v_cmt IS DISTINCT FROM current_setting('p52.banco_pontuar_cmt', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (pontuar_sjt): o comentario da funcao mudou; nada persiste';
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') || ' pontuar_sjt=' || v_md5), false);
END
$pos_pontuar$;

-- 01 · sdr-social-seller · mc · MC1 · O lead que visualizou e sumiu
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i1d$Atitude de Dono + Comunicação$i1d$, $i1c$Um lead pediu informação pelo Instagram há dois dias. Você respondeu na hora, com um áudio explicando o tratamento, e ele visualizou e não respondeu mais. A meta de agendamentos do mês está apertada.$i1c$, 'mc', 4, NULL, 'f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i1o1$Manda um conteúdo ligado à dúvida dele com uma pergunta aberta, espaça os próximos toques e anota no CRM.$i1o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i1o2$Manda todo dia um "oi, ainda tem interesse?" até ele responder, porque lead que some precisa ser lembrado.$i1o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i1o3$Espera ele voltar sozinho: quem tem interesse de verdade responde quando estiver pronto para decidir.$i1o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i1o4$Oferece um desconto na avaliação que você não pode autorizar, para destravar a resposta dele ainda hoje.$i1o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 02 · sdr-social-seller · mc · MC2 · O lead empolgado que talvez não tenha indicação
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i2d$Ética + Atitude de Dono$i2d$, $i2c$Chega um lead empolgado com lentes de contato dental. Pelas respostas, você percebe que o caso provavelmente não é para esse tratamento, ou que o orçamento dele está muito abaixo. Cada agendamento conta para a sua meta.$i2c$, 'mc', 4, NULL, '1085a6d60f1593967ca65ce3d707f06112c779f7eca5144ab12f183106c7e3e2', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '1085a6d60f1593967ca65ce3d707f06112c779f7eca5144ab12f183106c7e3e2')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i2o1$Faz as perguntas que faltam, diz com franqueza o que o caso parece pedir e só agenda se fizer sentido.$i2o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i2o2$Agenda a avaliação mesmo assim, mas registra a ressalva no CRM para o Dr. já chegar sabendo do caso.$i2o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i2o3$Agenda sem comentar nada, porque quem decide se o caso tem indicação é o dentista, na avaliação.$i2o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i2o4$Agenda e reforça o resultado que ele espera, para garantir que ele venha e o horário conte na meta.$i2o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 03 · sdr-social-seller · mc · MC3 · Reclamação pública num post da clínica
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i3d$Experiência UAU + Comunicação$i3d$, $i3c$Num post da clínica, um seguidor comenta: "Fui aí e me trataram mal, não recomendo." Outras pessoas começam a curtir o comentário. As DMs e os comentários do perfil passam por você.$i3c$, 'mc', 4, NULL, '2da6c7c4b89403c0bbcfe1ce0762d338bc72bdd9e7f9668f86755551316eae0b', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '2da6c7c4b89403c0bbcfe1ce0762d338bc72bdd9e7f9668f86755551316eae0b')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i3o1$Responde no post com acolhimento curto, sem discutir o caso, chama no privado e leva a queixa à gestão.$i3o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i3o2$Chama a pessoa no privado e resolve por lá, deixando o comentário público sem resposta visível no post.$i3o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i3o3$Responde no post "sentimos muito, entre em contato" e segue o dia, sem chamar no privado nem apurar.$i3o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i3o4$Oculta o comentário para não contaminar o post e depois chama a pessoa no privado para entender o caso.$i3o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 04 · sdr-social-seller · mc · MC4 · Pediu o preço antes de qualquer conversa
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i4d$Qualificação consultiva + Comunicação de valor$i4d$, $i4c$Pelo WhatsApp, um lead manda: "Quanto custa a lente? Só quero o valor." É a terceira mensagem dele, e ele já contou que está pesquisando em outras clínicas.$i4c$, 'mc', 4, NULL, '323dee0bdbb48fd3a30b4cd9f27da6395cb3b3bad7b56e3f044f94f7f74dafef', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '323dee0bdbb48fd3a30b4cd9f27da6395cb3b3bad7b56e3f044f94f7f74dafef')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i4o1$Dá a faixa de preço, diz que o valor exato sai na avaliação e pergunta o que ele quer mudar no sorriso.$i4o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i4o2$Passa a faixa de preço e já convida para a avaliação, sem perguntar nada sobre o caso nem o que ele busca.$i4o2$, 'pontua'::enum_tag_opcao, 2, 1),
    ($i4o3$Passa a faixa de preço e encerra dizendo que, quando ele quiser agendar a avaliação, é só chamar de novo.$i4o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i4o4$Passa o menor valor da tabela para não perder o lead para a concorrência e deixa o detalhe para a clínica.$i4o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 05 · sdr-social-seller · mc · MC5 · A confirmação que não volta
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i5d$Comparecimento + Organização$i5d$, $i5c$Amanhã às 9h há uma avaliação marcada. Você mandou a confirmação ontem e hoje de manhã; as duas mensagens foram entregues e não lidas. São 17h, e a agenda de amanhã tem lista de espera.$i5c$, 'mc', 4, NULL, 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i5o1$Liga ainda hoje; se ele não atender, manda recado, deixa a lista de espera de sobreaviso e anota no CRM.$i5o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i5o2$Manda mais uma mensagem agora e, se não houver resposta até amanhã cedo, oferece o horário à lista.$i5o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i5o3$Mantém o horário como está e confia na confirmação de ontem, que foi entregue, mesmo sem ter sido lida.$i5o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i5o4$Libera o horário para a lista de espera agora, porque mensagem sem leitura costuma virar falta amanhã.$i5o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 06 · sdr-social-seller · mc · MC6 · Vinte leads novos de uma vez
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i6d$Velocidade de resposta + Processo$i6d$, $i6c$Uma campanha nova entrou no ar às 10h. Ao meio-dia há 20 leads sem resposta no WhatsApp e no Instagram, e você está no meio dos follow-ups quentes do dia.$i6c$, 'mc', 4, NULL, 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i6o1$Pausa os follow-ups, manda a cada lead novo uma primeira mensagem curta e pessoal e depois os retoma.$i6o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i6o2$Termina os follow-ups quentes, que estão perto de agendar, e só depois responde os novos, um por um.$i6o2$, 'pontua'::enum_tag_opcao, 2, 1),
    ($i6o3$Pede à recepção que responda os novos com a mensagem padrão enquanto você termina os follow-ups quentes.$i6o3$, 'neutro'::enum_tag_opcao, 1, 4),
    ($i6o4$Manda a mesma resposta automática a todos os novos e volta a eles no fim do dia, com mais calma.$i6o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 07 · sdr-social-seller · caso aberto · Caso aberto · Responda este lead no WhatsApp
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'sdr-social-seller', NULL, $i7c$Chega esta mensagem no WhatsApp da Beauty Smile, vinda de um anúncio: "Oi, vi o vídeo de vocês sobre o laser. Tenho um dente da frente meio escuro que me incomoda há anos e tenho vergonha de sorrir. Vocês fazem? Quanto custa?"

Escreva: (a) a resposta que você mandaria a esse lead, do jeito que mandaria de verdade (pode quebrar em várias mensagens); (b) o que faria se ele não respondesse em 24 horas.$i7c$, 'caso_aberto', 12, $i7r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "acolhimento", "peso": 25}, {"dimension": "descoberta_e_qualificacao", "peso": 25}, {"dimension": "comunicacao_de_valor", "peso": 15}, {"dimension": "conducao_e_follow_up", "peso": 25}, {"dimension": "tom_clareza_e_lgpd", "peso": 10}]}$i7r$::jsonb, '4d259109f320ec7c5b62321c97f2782024c6a93dcad044a57c86b502d8521b15', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '4d259109f320ec7c5b62321c97f2782024c6a93dcad044a57c86b502d8521b15');

-- 08 · social-media · mc · MC1 · O dado contradiz o quadro preferido do chefe
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i8d$Leitura de dados + Atitude de Dono$i8d$, $i8c$O quadro "Estudo do dia" é o preferido do Dr. e o que ele mais cobra. Depois de 8 semanas, é o de menor retenção do perfil (média de 18%) e quase não recebe salvamento — enquanto os bastidores de consultório, que ele acha "bobos", retêm 46%. Na sexta você apresenta o relatório de quadros.$i8c$, 'mc', 4, NULL, '54a2cb3f7114f9272ae8bd1b5435a7b48b9474db9d4957dc260879416f6b2bec', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '54a2cb3f7114f9272ae8bd1b5435a7b48b9474db9d4957dc260879416f6b2bec')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i8o1$Propõe testar o Estudo do dia em formato novo por 3 semanas e subir os bastidores, com corte combinado antes.$i8o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i8o2$Apresenta os números e recomenda cortar o Estudo do dia agora, porque oito semanas de dado já bastam.$i8o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i8o3$Apresenta os números sem recomendação e deixa a decisão com o Dr., que conhece melhor o próprio público.$i8o3$, 'neutro'::enum_tag_opcao, 1, 4),
    ($i8o4$Mantém o Estudo do dia como está: é o quadro que o Dr. quer, e insistir nisso só desgasta a relação.$i8o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 09 · social-media · mc · MC2 · "Está bom, mas não é assim que eu falo"
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i9d$Escrita na voz do outro + Receptividade a feedback$i9d$, $i9c$Na leitura semanal em voz alta, o Dr. trava em três dos cinco roteiros e diz "está bom, mas não é assim que eu falo". Ele não sabe explicar o que mudaria. A gravação é depois de amanhã.$i9c$, 'mc', 4, NULL, 'da3d73ac52483923393f1a6c3fb417a064e1a13a907868112d34609cbfcab17f', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'da3d73ac52483923393f1a6c3fb417a064e1a13a907868112d34609cbfcab17f')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i9o1$Pede que ele conte a ideia do jeito dele, grava o áudio e reescreve com as palavras que ele usou.$i9o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i9o2$Reescreve os três roteiros mais curtos e mais coloquiais, e leva de volta para ele antes de gravar.$i9o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i9o3$Mantém os dois que funcionaram, descarta os outros três e escreve roteiros novos do zero até amanhã.$i9o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i9o4$Grava assim mesmo: no teleprompter ele adapta na hora, e o calendário da semana não pode parar.$i9o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 10 · social-media · mc · MC3 · Imagem de paciente, pedida por quem manda
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i10d$Ética + Discrição$i10d$, $i10c$O Dr. manda no grupo um vídeo gravado no consultório mostrando o resultado de uma paciente, e escreve "posta hoje, ficou incrível". Você não encontra o termo de autorização dela no arquivo.$i10c$, 'mc', 4, NULL, 'a5afc110964d2293ce1a74abd2fb97b7b50feec16ec43a4c7fd229ee22847f98', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'a5afc110964d2293ce1a74abd2fb97b7b50feec16ec43a4c7fd229ee22847f98')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i10o1$Segura a publicação, avisa o Dr. de que falta o termo e pede à recepção que colha a assinatura antes.$i10o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i10o2$Segura a publicação e propõe ao Dr. outro conteúdo para hoje, sem resolver a falta do termo da paciente.$i10o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i10o3$Segura a publicação sem explicar o motivo ao Dr. e espera que ele pergunte para só então falar do termo.$i10o3$, 'neutro'::enum_tag_opcao, 1, 2),
    ($i10o4$Publica: foi o próprio Dr. quem mandou, e a autorização da paciente é responsabilidade da clínica.$i10o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 11 · social-media · mc · MC4 · O estudo que sustenta o "Estudo do dia"
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i11d$Checagem de fonte + Comunicação com o líder$i11d$, $i11c$Para o "Estudo do dia" de amanhã, o Dr. te manda o print de um post de outro dentista afirmando que "laser reduz em 80% a recidiva de cárie". Não há referência. Você procura e acha um estudo parecido — com 34 participantes e sem grupo controle.$i11c$, 'mc', 4, NULL, '0e2a5cb9cdfdef69f667d3c65f3b56e255e4f61e9a91a3261b08ef0328c772ec', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '0e2a5cb9cdfdef69f667d3c65f3b56e255e4f61e9a91a3261b08ef0328c772ec')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i11o1$Mostra ao Dr. que o estudo é frágil e propõe trocar por um que dê para citar com referência.$i11o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i11o2$Publica sem o número, falando só do mecanismo, e não comenta a fragilidade do estudo com o Dr.$i11o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i11o3$Tira o tema da pauta de amanhã e escolhe outro assunto, para não publicar nada que seja frágil.$i11o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i11o4$Usa o número citando "estudos mostram": o Dr. mandou, e é ele quem entende do assunto clínico.$i11o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 12 · social-media · mc · MC5 · Um tema bom que é chato de explicar
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i12d$Roteiro para vídeo curto — competência central$i12d$, $i12c$Você precisa escrever um Reel sobre tratamento de ronco e apneia com laser. O tema é forte, mas o mecanismo exige uns 40 segundos de contexto antes de qualquer coisa fazer sentido.$i12c$, 'mc', 4, NULL, '4322993ccd75434a48ce1069527b491e4e234d7a2564308d8fcc0d48aa86fce2', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '4322993ccd75434a48ce1069527b491e4e234d7a2564308d8fcc0d48aa86fce2')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i12o1$Abre pelo efeito na vida da pessoa, põe o mecanismo depois numa frase e escreve 4 hooks desse efeito.$i12o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i12o2$Abre com uma pergunta provocativa sobre ronco e mantém a explicação inteira, cortando todo o resto.$i12o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i12o3$Divide o tema em dois Reels, um de contexto e outro de mecanismo, publicados em dias seguidos.$i12o3$, 'neutro'::enum_tag_opcao, 1, 2),
    ($i12o4$Mantém a ordem natural do assunto, contexto primeiro, porque sem ele ninguém entende o resto do vídeo.$i12o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 13 · social-media · mc · MC6 · O mesmo ajuste pedido pela terceira vez
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i13d$Colaboração + Devolutiva técnica$i13d$, $i13c$O editor entrega o terceiro vídeo da semana com o mesmo problema dos dois anteriores: a legenda entra meio segundo atrasada e o corte do hook está frouxo. Você já pediu ajuste duas vezes, por escrito.$i13c$, 'mc', 4, NULL, 'bae7a01d6917b925dd6e5a2da55ce31822fa2d9084699dc59c095754c2b68ba9', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'bae7a01d6917b925dd6e5a2da55ce31822fa2d9084699dc59c095754c2b68ba9')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i13o1$Chama para uma conversa curta, mostra os três casos na tela e combina o padrão por escrito.$i13o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i13o2$Devolve de novo por escrito, agora com a marcação de tempo exata de cada ponto a ajustar no vídeo.$i13o2$, 'pontua'::enum_tag_opcao, 2, 1),
    ($i13o3$Escala para a Coordenação cobrar o padrão: você já pediu duas vezes e não é sua função insistir.$i13o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i13o4$Corrige por conta própria o que dá e entrega no prazo, para não travar o calendário de posts da semana.$i13o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 14 · social-media · caso aberto · Caso aberto · O «Professor Sarcástico» encosta no limite — MANTIDO do banco no ar (content_hash 31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79): nenhum INSERT; o PRE e o POS amarram o id vivo.

-- 15 · videomaker-storymaker · mc · MC1 · O dia não rendeu material
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i15d$Narrativa em stories + Iniciativa$i15d$, $i15c$Quarta fraca: dois pacientes desmarcaram, o Dr. passou a manhã em reunião fechada e a tarde tem só um atendimento longo. São 11h e você tem 4 stories publicados. A meta do dia é 20.$i15c$, 'mc', 4, NULL, '479bc6d918284700afebea9888b3e22dff0476215bbb7d283f91f9c0e13ec0d2', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '479bc6d918284700afebea9888b3e22dff0476215bbb7d283f91f9c0e13ec0d2')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i15o1$Usa o tempo morto nos quadros que não dependem de paciente e combina um quadro do banco com a social media.$i15o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i15o2$Aproveita o atendimento longo da tarde e faz dele uma sequência completa de stories, com começo, meio e fim.$i15o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i15o3$Publica menos hoje e compensa amanhã, avisando a Coordenação logo cedo de que o dia rendeu pouco material.$i15o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i15o4$Republica cortes de stories antigos que foram bem, para não quebrar a constância do perfil no dia de hoje.$i15o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 16 · videomaker-storymaker · mc · MC2 · A sessão de gravação atrasou
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i16d$Planejamento + Comunicação$i16d$, $i16c$A sessão semanal estava marcada para as 14h; são 15h40 e o Dr. segue em atendimento. Há 6 roteiros na pauta, e o editor precisa do material amanhã cedo.$i16c$, 'mc', 4, NULL, '6caee594b0484d83e074ea09fceb43938a134e1542d3c6b0c3fd6208416957a1', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '6caee594b0484d83e074ea09fceb43938a134e1542d3c6b0c3fd6208416957a1')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i16o1$Deixa o set pronto, avisa a Coordenação do risco de prazo e decide com ela quais roteiros gravar.$i16o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i16o2$Espera e grava tudo no que sobrar do dia, mesmo com a luz e o áudio piores que o padrão do perfil.$i16o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i16o3$Remarca a sessão inteira para a semana seguinte, quando houver tempo para fazer tudo direito.$i16o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i16o4$Grava os roteiros com outra pessoa da equipe no lugar do Dr., para não perder o prazo do editor.$i16o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 17 · videomaker-storymaker · mc · MC3 · O melhor material do mês, sem autorização
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i17d$Discrição + Leitura de ambiente$i17d$, $i17c$Um paciente emocionado agradece o Dr. no corredor, chorando, dizendo que voltou a sorrir depois de 10 anos. É o melhor material que você viu no mês. Ele não sabe que você está por perto, e não há câmera à vista.$i17c$, 'mc', 4, NULL, 'd185460236a3805e9e6bfdffd0b5cce65ad41a3a00f4f6a6f20c5080b62c23e6', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'd185460236a3805e9e6bfdffd0b5cce65ad41a3a00f4f6a6f20c5080b62c23e6')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i17o1$Não grava. Depois, com calma, pergunta se ele toparia contar de novo em vídeo, com termo assinado.$i17o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i17o2$Aborda o paciente ali mesmo no corredor, ainda emocionado, e já o convida para gravar um depoimento.$i17o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i17o3$Deixa o momento passar sem gravar e não comenta com ninguém, nem volta a falar com ele depois.$i17o3$, 'neutro'::enum_tag_opcao, 1, 2),
    ($i17o4$Grava e publica em stories: é um depoimento espontâneo e verdadeiro, e ele ficaria feliz de aparecer.$i17o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 18 · videomaker-storymaker · mc · MC4 · O momento que não se repete
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i18d$Captação em tempo real — competência central$i18d$, $i18c$O Dr. está no meio de um procedimento com uma paciente que está na lista de termos assinados do dia, e acontece algo que renderia um story ótimo: ele explica a ela, ali, por que não vai extrair o dente que outra clínica tinha condenado. Você está com o celular na mão, a luz está ruim e há barulho de sugador.$i18c$, 'mc', 4, NULL, 'ae2f1d339a80d168bcfca35e635e6269755f97a603078f1064d137fa6c1a65c4', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'ae2f1d339a80d168bcfca35e635e6269755f97a603078f1064d137fa6c1a65c4')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i18o1$Grava assim mesmo, priorizando o áudio, e publica com legenda: a fala é o conteúdo e não volta.$i18o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i18o2$Grava em silêncio e publica só a imagem, com um texto na tela resumindo o que aconteceu na sala.$i18o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i18o3$Não grava e pede ao Dr. que reconte a história depois, num set preparado com luz e áudio bons.$i18o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i18o4$Ajusta a luz e posiciona o lapela antes de começar a gravar, para não publicar um material ruim.$i18o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 19 · videomaker-storymaker · mc · MC5 · O equipamento falha 20 minutos antes
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i19d$Set de gravação + Contingência$i19d$, $i19c$A sessão semanal começa em 20 minutos. Montando o set, você descobre que o microfone de lapela não está carregando e o teleprompter do tablet trava ao rolar o texto. O Dr. tem uma janela de 40 minutos e não haverá outra nesta semana.$i19c$, 'mc', 4, NULL, '90d5ef9a32379be60b10714b26430e9fd26795b0a2e1f017c9064382cfb81170', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '90d5ef9a32379be60b10714b26430e9fd26795b0a2e1f017c9064382cfb81170')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i19o1$Resolve com o que tem: microfone do celular por perto e o roteiro impresso em cartões fora do quadro.$i19o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i19o2$Grava com o áudio do celular e o Dr. lendo o roteiro do próprio celular na mão, sem teleprompter.$i19o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i19o3$Usa os 20 minutos tentando consertar o lapela e começa a sessão com atraso, com menos tempo de gravação.$i19o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i19o4$Remarca a sessão e comunica que, sem o equipamento funcionando, não dá para garantir a qualidade.$i19o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 20 · videomaker-storymaker · mc · MC6 · Três dias de material e o editor começa segunda às 8h
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i20d$Organização de arquivo$i20d$, $i20c$Sexta, 19h. Você tem material de três dias no celular e na câmera: 2 sessões de gravação, fotos de dois photodumps e bastidores da obra. O editor abre a fila segunda às 8h, e você vai emendar o fim de semana.$i20c$, 'mc', 4, NULL, '93e75df28db38a199267ad8b2ecdaa648a30bb3f2de2d14a24a77f8df408e1e9', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '93e75df28db38a199267ad8b2ecdaa648a30bb3f2de2d14a24a77f8df408e1e9')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i20o1$Sobe tudo nomeado no padrão, separado por dia, com um recado ao editor sobre o que é prioridade.$i20o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i20o2$Sobe tudo numa pasta única "semana 39" e manda uma mensagem ao editor dizendo o que é cada coisa.$i20o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i20o3$Sobe as sessões de gravação, que são prioridade, e deixa as fotos e os bastidores para segunda cedo.$i20o3$, 'neutro'::enum_tag_opcao, 1, 4),
    ($i20o4$Deixa tudo nos dispositivos e sobe na segunda antes das 8h, ainda a tempo da fila do editor.$i20o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 21 · videomaker-storymaker · caso aberto · Caso aberto · Um dia inteiro de cobertura — MANTIDO do banco no ar (content_hash 98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa): nenhum INSERT; o PRE e o POS amarram o id vivo.

-- 22 · editor-video · mc · MC1 · O corte que retém contra o corte que pediram
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i22d$Ritmo para retenção + Colaboração$i22d$, $i22c$O Dr. gravou uma explicação de 90 segundos e pediu que saísse "inteira, porque cada parte importa". Você sabe que os primeiros 25 segundos são preâmbulo, e a retenção do perfil cai forte antes dos 15s.$i22c$, 'mc', 4, NULL, 'e4bd9ba06c1020db93b8b93772ce1983fb3a9df0ee720b6b0975421940a5bac3', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'e4bd9ba06c1020db93b8b93772ce1983fb3a9df0ee720b6b0975421940a5bac3')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i22o1$Monta duas versões, a inteira e uma de 45s, e leva à social media com o número de retenção.$i22o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i22o2$Entrega a versão curta, explicando na entrega por que cortou os 25 segundos iniciais do vídeo.$i22o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i22o3$Entrega a versão inteira, como pedido, registrando na entrega a preocupação com a retenção.$i22o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i22o4$Entrega inteira e não comenta nada: o pedido veio de quem aparece no vídeo e conhece o conteúdo.$i22o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 23 · editor-video · mc · MC2 · O hook mais forte da semana promete resultado
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i23d$Conformidade + Alçada$i23d$, $i23c$A social media te manda um roteiro cujo hook é "Seu dentista nunca te contou isso: dá pra tratar canal sem dor nenhuma". O vídeo já foi gravado com esse texto no teleprompter, e é o hook mais forte da semana.$i23c$, 'mc', 4, NULL, '09b29ae2399a45274ac355bf078ed13ae8d559c128c02a90332a1df4de39c404', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '09b29ae2399a45274ac355bf078ed13ae8d559c128c02a90332a1df4de39c404')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i23o1$Edita e entrega avisando que "sem dor nenhuma" é promessa, e propõe duas variações sem ela.$i23o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i23o2$Edita como está e registra a dúvida sobre a frase na entrega, para a social media decidir o que fazer.$i23o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i23o3$Edita como está e não comenta: o texto é da social media, que responde pela mensagem publicada.$i23o3$, 'neutro'::enum_tag_opcao, 1, 2),
    ($i23o4$Reescreve o hook por conta própria e entrega o vídeo já alterado, sem avisar ninguém da mudança.$i23o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 24 · editor-video · mc · MC3 · Material quebrado com prazo em cima
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i24d$Cumprimento de prazo + Comunicação$i24d$, $i24c$São 4 vídeos para hoje. No terceiro, você descobre que o material bruto do quarto chegou sem áudio aproveitável. Faltam 2 horas para a entrega.$i24c$, 'mc', 4, NULL, 'd52fbe3e027d4721cf792a139a86312aea5e2ecfd41d8bd2176f4854e7fae76a', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'd52fbe3e027d4721cf792a139a86312aea5e2ecfd41d8bd2176f4854e7fae76a')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i24o1$Avisa a Coordenação na hora e propõe entregar 3 hoje e o quarto amanhã, com o áudio regravado.$i24o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i24o2$Entrega os 3 vídeos prontos e deixa o quarto para amanhã, avisando a Coordenação no fim do dia.$i24o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i24o3$Entrega os 4 no prazo, salvando o quarto vídeo com legenda e trilha por cima do áudio ruim.$i24o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i24o4$Entrega os 4 vídeos no prazo combinado e não menciona o problema de áudio do quarto vídeo.$i24o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 25 · editor-video · mc · MC4 · Quatro variações que precisam ser diferentes
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i25d$Variação de hook$i25d$, $i25c$O tráfego pediu 4 variações de hook para o Reel que melhor performou no orgânico. O vídeo fala sobre clareamento sem sensibilidade.$i25c$, 'mc', 4, NULL, 'a50ce621b769984dcef6237486186b70f7ddd5481eead0c5dcd18f865c120334', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'a50ce621b769984dcef6237486186b70f7ddd5481eead0c5dcd18f865c120334')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i25o1$Faz quatro aberturas com ângulos distintos e nomeia os arquivos para comparar o resultado.$i25o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i25o2$Faz quatro aberturas com o mesmo argumento, variando a frase e o ritmo do corte em cada uma.$i25o2$, 'pontua'::enum_tag_opcao, 2, 1),
    ($i25o3$Entrega duas variações fortes e explica ao tráfego que as outras duas seriam só repetição.$i25o3$, 'neutro'::enum_tag_opcao, 1, 2),
    ($i25o4$Troca a primeira frase do texto na tela nas quatro versões, mantendo a imagem idêntica.$i25o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 26 · editor-video · mc · MC5 · O que aparece no fundo do quadro
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i26d$Atenção a detalhe + Conformidade$i26d$, $i26c$Você finaliza o último vídeo do dia, com entrega marcada para as 18h. No segundo 14, ao fundo, a tela do computador da recepção aparece desfocada — mas dá para ler o nome de um paciente na agenda.$i26c$, 'mc', 4, NULL, '8dff2b09bec6b930601b0960343d0b18a8c0676aa993ec653281100fe3825f13', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '8dff2b09bec6b930601b0960343d0b18a8c0676aa993ec653281100fe3825f13')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i26o1$Cobre ou corta o trecho com a tela e entrega, sinalizando à social media o ajuste que fez.$i26o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i26o2$Entrega no prazo avisando que há uma tela legível ao fundo, para a social media decidir antes.$i26o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i26o3$Aumenta o desfoque do fundo até não dar mais para ler o nome, e entrega sem comentar nada.$i26o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i26o4$Entrega como está: o fundo está desfocado, e ninguém vai pausar o vídeo para ler a agenda.$i26o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 27 · editor-video · mc · MC6 · Material fora do padrão, e é o único que há
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i27d$Padrão visual + Prioridade$i27d$, $i27c$Chega material gravado por outra pessoa, enquanto o videomaker estava de folga: enquadramento diferente, temperatura de cor mais fria, áudio com outro timbre. É o único material do quadro desta semana.$i27c$, 'mc', 4, NULL, '586311e4a47f584fc57909cbced5c1ddfebac69bdf8646ee8a24ef6835e1e05e', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '586311e4a47f584fc57909cbced5c1ddfebac69bdf8646ee8a24ef6835e1e05e')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i27o1$Aproxima cor e áudio do padrão, avisa o que não deu para igualar e propõe um mínimo de captação.$i27o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i27o2$Ajusta só a cor, que é o que mais salta aos olhos no vídeo, e comenta o resto na própria entrega.$i27o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i27o3$Entrega como veio, sinalizando na entrega que o material fugiu do padrão visual do perfil.$i27o3$, 'neutro'::enum_tag_opcao, 1, 2),
    ($i27o4$Refaz o grading até bater exatamente com o padrão, mesmo atrasando as outras entregas do dia.$i27o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 28 · editor-video · caso aberto · Caso aberto · Seis minutos densos viram 60 segundos — MANTIDO do banco no ar (content_hash c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c): nenhum INSERT; o PRE e o POS amarram o id vivo.

-- ─────────────────────────────────────────────────────────────────────────────
-- RETIRADA (D-35 b) — depois dos INSERTs, no MESMO arquivo: os itens ativos dos cargos do texto
-- cujo hash NAO esta no texto deixam de ser sorteados. Nada e apagado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $retira$
DECLARE
  v_n bigint;
BEGIN
  UPDATE public.perguntas SET status = 'retired'
   WHERE tipo = 'sjt' AND cargo = ANY (ARRAY['sdr-social-seller', 'social-media', 'videomaker-storymaker', 'editor-video']::text[]) AND status = 'active'
     AND content_hash <> ALL (ARRAY['f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', '1085a6d60f1593967ca65ce3d707f06112c779f7eca5144ab12f183106c7e3e2', '2da6c7c4b89403c0bbcfe1ce0762d338bc72bdd9e7f9668f86755551316eae0b', '323dee0bdbb48fd3a30b4cd9f27da6395cb3b3bad7b56e3f044f94f7f74dafef', 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', '4d259109f320ec7c5b62321c97f2782024c6a93dcad044a57c86b502d8521b15', '54a2cb3f7114f9272ae8bd1b5435a7b48b9474db9d4957dc260879416f6b2bec', 'da3d73ac52483923393f1a6c3fb417a064e1a13a907868112d34609cbfcab17f', 'a5afc110964d2293ce1a74abd2fb97b7b50feec16ec43a4c7fd229ee22847f98', '0e2a5cb9cdfdef69f667d3c65f3b56e255e4f61e9a91a3261b08ef0328c772ec', '4322993ccd75434a48ce1069527b491e4e234d7a2564308d8fcc0d48aa86fce2', 'bae7a01d6917b925dd6e5a2da55ce31822fa2d9084699dc59c095754c2b68ba9', '31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79', '479bc6d918284700afebea9888b3e22dff0476215bbb7d283f91f9c0e13ec0d2', '6caee594b0484d83e074ea09fceb43938a134e1542d3c6b0c3fd6208416957a1', 'd185460236a3805e9e6bfdffd0b5cce65ad41a3a00f4f6a6f20c5080b62c23e6', 'ae2f1d339a80d168bcfca35e635e6269755f97a603078f1064d137fa6c1a65c4', '90d5ef9a32379be60b10714b26430e9fd26795b0a2e1f017c9064382cfb81170', '93e75df28db38a199267ad8b2ecdaa648a30bb3f2de2d14a24a77f8df408e1e9', '98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa', 'e4bd9ba06c1020db93b8b93772ce1983fb3a9df0ee720b6b0975421940a5bac3', '09b29ae2399a45274ac355bf078ed13ae8d559c128c02a90332a1df4de39c404', 'd52fbe3e027d4721cf792a139a86312aea5e2ecfd41d8bd2176f4854e7fae76a', 'a50ce621b769984dcef6237486186b70f7ddd5481eead0c5dcd18f865c120334', '8dff2b09bec6b930601b0960343d0b18a8c0676aa993ec653281100fe3825f13', '586311e4a47f584fc57909cbced5c1ddfebac69bdf8646ee8a24ef6835e1e05e', 'c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c']::text[]);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM set_config('p52.banco_retirados', v_n::text, true);
END
$retira$;

-- ─────────────────────────────────────────────────────────────────────────────
-- MAPA DO REMAPEAMENTO (WR-01 do 52-REVIEW-PORTAO-2) — o registro durável velho→novo, gravado pelo
-- bloco de remapeamento abaixo, na MESMA transacao. Nasce DEPOIS do PRE (cuja varredura procura o id velho em toda
-- tabela). O id velho carrega a ordem: o mapa e o gabarito dos itens remapeados — por isso o esquema
-- `supabase_migrations` (sem USAGE para anon, authenticated e service_role), RLS ligada sem policy e
-- nenhum GRANT. So postgres o le, e e quem roda o desfazer.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE supabase_migrations.p52_remap_opcao_sjt (
  versao         text        NOT NULL,
  opcao_linha_id uuid        NOT NULL,
  pergunta_id    uuid        NOT NULL,
  opcao_id_velho uuid        NOT NULL,
  opcao_id_novo  uuid        NOT NULL,
  remapeado_em   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (versao, opcao_linha_id)
);
ALTER TABLE supabase_migrations.p52_remap_opcao_sjt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supabase_migrations.p52_remap_opcao_sjt FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE supabase_migrations.p52_remap_opcao_sjt IS
  'Phase 52 / 52-16 (WR-01 do 52-REVIEW-PORTAO-2): mapa opcao_id velho -> novo do remapeamento dos ids artesanais (WR-03 do 52-REVIEW-PORTAO-1), gravado na mesma transacao da migration que o fez (coluna versao). Serve ao desfazer: devolver o id velho as alternativas (opcao_linha_id) e uma segunda passada nas respostas gravadas. O id velho carrega a ordem, entao este mapa e o gabarito dos itens remapeados: esquema sem USAGE para os papeis de API, RLS ligada sem policy, nenhum GRANT.';

-- ─────────────────────────────────────────────────────────────────────────────
-- REMAPEAMENTO (WR-03) — depois da retirada: o escopo medido AGORA tem de ser o que o PRE previu.
-- Troca SO o `opcao_id` (por `gen_random_uuid()`), grava o mapa velho→novo (WR-01 do -2) e, na
-- mesma transacao, as respostas gravadas que apontam para ele. ⚠ Atualiza resposta gravada de
-- candidato: o apply e checkpoint do operador.
-- ─────────────────────────────────────────────────────────────────────────────
DO $remap$
DECLARE
  v_map   jsonb;
  v_ids   text;
  v_n     bigint;
  v_mapa  bigint;
  v_lin   bigint;
  v_refs  bigint;
  v_rest  bigint;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', o.id::text, 'p', o.pergunta_id::text,
                                               'velho', lower(o.opcao_id::text), 'novo', gen_random_uuid()::text)
                            ORDER BY o.id::text COLLATE "C"), '[]'::jsonb)
    INTO v_map
    FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE p.tipo = 'sjt' AND p.status = 'active' AND o.opcao_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  SELECT coalesce(string_agg(m ->> 'id', ',' ORDER BY (m ->> 'id') COLLATE "C"), '') INTO v_ids
    FROM jsonb_array_elements(v_map) m;
  IF v_ids IS DISTINCT FROM current_setting('p52.banco_remap_ids', true) THEN
    RAISE EXCEPTION 'P52B REMAP: o escopo medido depois da retirada (% alternativa(s)) nao e o que o PRE previu (%); nada persiste',
      jsonb_array_length(v_map), current_setting('p52.banco_remap_n', true);
  END IF;

  -- as alternativas: so o id muda
  UPDATE public.perguntas_opcao_sjt o SET opcao_id = (m ->> 'novo')::uuid
    FROM jsonb_array_elements(v_map) m
   WHERE o.id = (m ->> 'id')::uuid AND lower(o.opcao_id::text) = m ->> 'velho';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> jsonb_array_length(v_map) THEN
    RAISE EXCEPTION 'P52B REMAP: % de % alternativa(s) remapeada(s); nada persiste', v_n, jsonb_array_length(v_map);
  END IF;

  -- o mapa velho→novo, durável (WR-01 do 52-REVIEW-PORTAO-2): o desfazer le daqui
  INSERT INTO supabase_migrations.p52_remap_opcao_sjt (versao, opcao_linha_id, pergunta_id, opcao_id_velho, opcao_id_novo)
  SELECT '20261011000003', (m ->> 'id')::uuid, (m ->> 'p')::uuid, (m ->> 'velho')::uuid, (m ->> 'novo')::uuid
    FROM jsonb_array_elements(v_map) m;
  GET DIAGNOSTICS v_mapa = ROW_COUNT;
  IF v_mapa <> jsonb_array_length(v_map) THEN
    RAISE EXCEPTION 'P52B REMAP: % de % par(es) velho/novo gravado(s) no mapa; nada persiste', v_mapa, jsonb_array_length(v_map);
  END IF;

  -- as respostas gravadas: o elemento que aponta (pergunta, id velho) passa a apontar o id novo;
  -- ordem do array, demais chaves e demais elementos ficam
  UPDATE public.scores_candidato s
     SET metadata = jsonb_set(s.metadata, '{respostas}', (
           SELECT jsonb_agg(coalesce((SELECT jsonb_set(r.e, '{opcao_id}', to_jsonb(m ->> 'novo'))
                                        FROM jsonb_array_elements(v_map) m
                                       WHERE jsonb_typeof(r.e) = 'object'
                                         AND m ->> 'p' = lower(r.e ->> 'pergunta_id')
                                         AND m ->> 'velho' = lower(r.e ->> 'opcao_id')), r.e)
                            ORDER BY r.ord)
             FROM jsonb_array_elements(s.metadata -> 'respostas') WITH ORDINALITY AS r(e, ord)))
   WHERE s.tipo = 'sjt' AND jsonb_typeof(s.metadata -> 'respostas') = 'array'
     AND EXISTS (SELECT 1 FROM jsonb_array_elements(s.metadata -> 'respostas') e, jsonb_array_elements(v_map) m
                  WHERE jsonb_typeof(e) = 'object'
                    AND m ->> 'p' = lower(e ->> 'pergunta_id') AND m ->> 'velho' = lower(e ->> 'opcao_id'));
  GET DIAGNOSTICS v_lin = ROW_COUNT;

  SELECT count(*) FILTER (WHERE m ->> 'novo' = lower(e ->> 'opcao_id')),
         count(*) FILTER (WHERE m ->> 'velho' = lower(e ->> 'opcao_id'))
    INTO v_refs, v_rest
    FROM public.scores_candidato s
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array'
                                                THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e
    JOIN jsonb_array_elements(v_map) m ON m ->> 'p' = lower(e ->> 'pergunta_id')
   WHERE s.tipo = 'sjt' AND jsonb_typeof(e) = 'object';
  IF v_lin::text IS DISTINCT FROM current_setting('p52.banco_remap_linhas', true)
     OR v_refs::text IS DISTINCT FROM current_setting('p52.banco_remap_refs', true) OR v_rest <> 0 THEN
    RAISE EXCEPTION 'P52B REMAP: respostas gravadas — % linha(s) e % referencia(s) atualizadas, % ainda no id velho (o PRE mediu % linha(s) e % referencia(s)); nada persiste',
      v_lin, v_refs, v_rest, current_setting('p52.banco_remap_linhas', true), current_setting('p52.banco_remap_refs', true);
  END IF;
  PERFORM set_config('p52.banco_remap_feito', v_n::text || '/' || v_refs::text || '/' || v_lin::text, true);
END
$remap$;

-- ─────────────────────────────────────────────────────────────────────────────
-- P52B POS-PORTAO — nesta ordem: (contagem), (escada), (retirados), (mantidos), (remap); evidencia.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_cargos   text[] := ARRAY['sdr-social-seller', 'social-media', 'videomaker-storymaker', 'editor-video']::text[];
  v_hashes   text[] := ARRAY['f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', '1085a6d60f1593967ca65ce3d707f06112c779f7eca5144ab12f183106c7e3e2', '2da6c7c4b89403c0bbcfe1ce0762d338bc72bdd9e7f9668f86755551316eae0b', '323dee0bdbb48fd3a30b4cd9f27da6395cb3b3bad7b56e3f044f94f7f74dafef', 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', '4d259109f320ec7c5b62321c97f2782024c6a93dcad044a57c86b502d8521b15', '54a2cb3f7114f9272ae8bd1b5435a7b48b9474db9d4957dc260879416f6b2bec', 'da3d73ac52483923393f1a6c3fb417a064e1a13a907868112d34609cbfcab17f', 'a5afc110964d2293ce1a74abd2fb97b7b50feec16ec43a4c7fd229ee22847f98', '0e2a5cb9cdfdef69f667d3c65f3b56e255e4f61e9a91a3261b08ef0328c772ec', '4322993ccd75434a48ce1069527b491e4e234d7a2564308d8fcc0d48aa86fce2', 'bae7a01d6917b925dd6e5a2da55ce31822fa2d9084699dc59c095754c2b68ba9', '31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79', '479bc6d918284700afebea9888b3e22dff0476215bbb7d283f91f9c0e13ec0d2', '6caee594b0484d83e074ea09fceb43938a134e1542d3c6b0c3fd6208416957a1', 'd185460236a3805e9e6bfdffd0b5cce65ad41a3a00f4f6a6f20c5080b62c23e6', 'ae2f1d339a80d168bcfca35e635e6269755f97a603078f1064d137fa6c1a65c4', '90d5ef9a32379be60b10714b26430e9fd26795b0a2e1f017c9064382cfb81170', '93e75df28db38a199267ad8b2ecdaa648a30bb3f2de2d14a24a77f8df408e1e9', '98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa', 'e4bd9ba06c1020db93b8b93772ce1983fb3a9df0ee720b6b0975421940a5bac3', '09b29ae2399a45274ac355bf078ed13ae8d559c128c02a90332a1df4de39c404', 'd52fbe3e027d4721cf792a139a86312aea5e2ecfd41d8bd2176f4854e7fae76a', 'a50ce621b769984dcef6237486186b70f7ddd5481eead0c5dcd18f865c120334', '8dff2b09bec6b930601b0960343d0b18a8c0676aa993ec653281100fe3825f13', '586311e4a47f584fc57909cbced5c1ddfebac69bdf8646ee8a24ef6835e1e05e', 'c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c']::text[];
  v_mant_esp int    := 3;
  c          text;
  m          text;
  v_mc       bigint;
  v_ca       bigint;
  v_fora     bigint;
  v_pos      bigint;
  v_ok       bigint;
  v_ret      bigint := nullif(current_setting('p52.banco_retirados', true), '')::bigint;
  v_base     bigint := nullif(current_setting('p52.banco_retirar_n', true), '')::bigint;
  v_ids      text[] := string_to_array(nullif(current_setting('p52.banco_retirar_ids', true), ''), ',');
  v_mant_n   int    := 0;
  v_mcargo   text;
  v_mid      uuid;
  v_md5      text;
  v_ev       text   := '';
  v_velhos   text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_remap_velhos', true), ''), ','), ARRAY[]::text[]);
  v_remap    text   := '';
  v_mapa_n   bigint;
  v_mapa_ok  bigint;
  v_mapa_ids text;
  v_mapa_vel text;
  v_papel    text;
BEGIN
  IF v_ret IS NULL OR v_base IS NULL OR current_setting('p52.banco_cargos', true) IS DISTINCT FROM array_to_string(v_cargos, ',') THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (retirados): as GUCs do PRE/da retirada nao estao definidas nesta transacao — o POS nao pode medir';
  END IF;

  FOREACH c IN ARRAY v_cargos LOOP
    -- (contagem) exatamente 6 mc + 1 caso aberto ativos, todos com hash do texto
    SELECT count(*) FILTER (WHERE p.formato = 'mc'), count(*) FILTER (WHERE p.formato = 'caso_aberto'),
           count(*) FILTER (WHERE p.content_hash IS NULL OR p.content_hash <> ALL (v_hashes))
      INTO v_mc, v_ca, v_fora
      FROM public.perguntas p WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active';
    IF v_mc <> 6 OR v_ca <> 1 OR v_fora <> 0 THEN
      RAISE EXCEPTION 'P52B POS-PORTAO (contagem): o cargo % ficou com % mc + % caso_aberto ativos, % fora do texto (esperado 6+1 e 0); nada persiste', c, v_mc, v_ca, v_fora;
    END IF;
    -- (escada, D-37) a fortemente_pontua nao ocupa a mesma ordem em mais de 3 itens do cargo
    SELECT coalesce(max(s.n), 0) INTO v_pos FROM (
      SELECT o.ordem, count(*) AS n
        FROM public.perguntas p JOIN public.perguntas_opcao_sjt o ON o.pergunta_id = p.id
       WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active' AND p.formato = 'mc'
         AND o.tag = 'fortemente_pontua'
       GROUP BY o.ordem) s;
    IF v_pos > 3 THEN
      RAISE EXCEPTION 'P52B POS-PORTAO (escada): no cargo % a fortemente_pontua ocupa a mesma ordem em % itens (maximo 3); nada persiste', c, v_pos;
    END IF;
    v_ev := v_ev || CASE WHEN v_ev = '' THEN '' ELSE ',' END || c || '=6+1';
  END LOOP;

  -- (retirados) o UPDATE contou a baseline do PRE, e cada id da baseline esta `retired`
  SELECT count(*) INTO v_ok FROM public.perguntas p
   WHERE p.id::text = ANY (coalesce(v_ids, ARRAY[]::text[])) AND p.status = 'retired';
  IF v_ret <> v_base OR v_ok <> v_base THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (retirados): a retirada contou % e a baseline do PRE era % (% dos ids da baseline estao retired); nada persiste', v_ret, v_base, v_ok;
  END IF;

  -- (mantidos, D-35) o MESMO id do PRE segue ativo e e o unico caso aberto ativo do cargo
  FOREACH m IN ARRAY coalesce(string_to_array(nullif(current_setting('p52.banco_mantidos', true), ''), ','), ARRAY[]::text[]) LOOP
    v_mcargo := split_part(m, '=', 1);
    v_mid    := split_part(m, '=', 2)::uuid;
    SELECT count(*) INTO v_ok FROM public.perguntas p
     WHERE p.tipo = 'sjt' AND p.cargo = v_mcargo AND p.formato = 'caso_aberto' AND p.status = 'active';
    IF v_ok <> 1 OR NOT EXISTS (SELECT 1 FROM public.perguntas p WHERE p.id = v_mid AND p.status = 'active'
                                   AND p.formato = 'caso_aberto' AND p.cargo = v_mcargo) THEN
      RAISE EXCEPTION 'P52B POS-PORTAO (mantidos): o caso aberto mantido do cargo % nao e mais o unico caso ativo do cargo (% caso(s) ativo(s)); nada persiste', v_mcargo, v_ok;
    END IF;
    v_mant_n := v_mant_n + 1;
  END LOOP;
  IF v_mant_n <> v_mant_esp THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (mantidos): % caso(s) mantido(s) amarrado(s) pelo PRE, o texto declara %; nada persiste', v_mant_n, v_mant_esp;
  END IF;

  -- ── (remap, WR-03) ──────────────────────────────────────────────────────────
  -- nenhuma alternativa de item SJT ativo (de qualquer cargo) com opcao_id fora da forma uuid v4
  SELECT count(*) INTO v_ok
    FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE p.tipo = 'sjt' AND p.status = 'active' AND o.opcao_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  IF v_ok <> 0 THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): % alternativa(s) de item SJT ativo com opcao_id fora da forma uuid v4; nada persiste', v_ok;
  END IF;
  -- nenhum id velho do escopo sobrou numa alternativa nem numa resposta gravada
  SELECT (SELECT count(*) FROM public.perguntas_opcao_sjt o WHERE lower(o.opcao_id::text) = ANY (v_velhos))
       + (SELECT count(*) FROM public.scores_candidato s
           CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array'
                                                        THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e
           WHERE jsonb_typeof(e) = 'object' AND lower(e ->> 'opcao_id') = ANY (v_velhos))
    INTO v_ok;
  IF v_ok <> 0 THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): % ocorrencia(s) de id velho ainda em alternativa ou resposta gravada; nada persiste', v_ok;
  END IF;
  -- o remapeamento fez o que o PRE mediu
  IF current_setting('p52.banco_remap_feito', true) IS DISTINCT FROM
     (current_setting('p52.banco_remap_n', true) || '/' || current_setting('p52.banco_remap_refs', true) || '/' ||
      current_setting('p52.banco_remap_linhas', true)) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): feito % (alternativas/referencias/linhas), o PRE mediu %/%/%; nada persiste',
      coalesce(current_setting('p52.banco_remap_feito', true), '<nao rodou>'), current_setting('p52.banco_remap_n', true),
      current_setting('p52.banco_remap_refs', true), current_setting('p52.banco_remap_linhas', true);
  END IF;
  -- so o id mudou: texto, etiqueta, peso, ordem e pergunta das alternativas do escopo ficam
  IF (SELECT md5(coalesce(string_agg(o.id::text || '|' || o.pergunta_id::text || '|' || o.tag::text || '|' || o.peso::text || '|' || o.ordem::text || '|' || md5(o.opcao_texto), E'\n' ORDER BY o.id::text COLLATE "C"), '')) FROM public.perguntas_opcao_sjt o WHERE o.id::text = ANY (string_to_array(nullif(current_setting('p52.banco_remap_ids', true), ''), ','))) IS DISTINCT FROM current_setting('p52.banco_escopo_fp', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): uma alternativa do escopo mudou alem do opcao_id; nada persiste';
  END IF;
  -- toda resposta SJT gravada resolve para a MESMA alternativa (ordem, etiqueta, peso) de antes
  IF (SELECT md5(coalesce(string_agg(q.x, E'\n' ORDER BY q.x COLLATE "C"), '')) FROM (SELECT s.id::text || '#' || r.ord::text || '|' || coalesce(r.e ->> 'pergunta_id', '-') || '|' || coalesce(r.e ->> 'tag', '-') || '|' || coalesce(r.e ->> 'peso', '-') || '|' || coalesce((SELECT string_agg(o.ordem::text || ':' || o.tag::text || ':' || o.peso::text, ';' ORDER BY o.id) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id::text = lower(r.e ->> 'pergunta_id') AND o.opcao_id::text = lower(r.e ->> 'opcao_id')), '-') AS x FROM public.scores_candidato s CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array' THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) WITH ORDINALITY AS r(e, ord) WHERE s.tipo = 'sjt') q) IS DISTINCT FROM current_setting('p52.banco_respostas_fp', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): uma resposta SJT gravada deixou de resolver para a mesma alternativa (ordem, etiqueta, peso); nada persiste';
  END IF;
  -- o score gravado e o recomputado pela juncao do pontuar_sjt nao mudaram em nenhuma linha
  IF (SELECT md5(coalesce(string_agg(q.x, E'\n' ORDER BY q.x COLLATE "C"), '')) FROM (SELECT s.id::text || '|' || coalesce(s.score::text, '-') || '|' || coalesce(s.score_max::text, '-') || '|' || s.status::text || '|' || coalesce((SELECT sum(o.peso)::text FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array' THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e JOIN public.perguntas_opcao_sjt o ON o.pergunta_id::text = lower(e ->> 'pergunta_id') AND o.opcao_id::text = lower(e ->> 'opcao_id')), '-') AS x FROM public.scores_candidato s WHERE s.tipo = 'sjt') q) IS DISTINCT FROM current_setting('p52.banco_scores_fp', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): o score de uma linha SJT (gravado ou recomputado pelo par pergunta+opcao) mudou; nada persiste';
  END IF;
  -- o mapa durável (WR-01 do -2): uma linha por alternativa remapeada DESTA versao; o id novo e o
  -- que a alternativa tem agora; os ids de linha e os velhos sao os do PRE, na mesma ordem
  SELECT count(*), count(*) FILTER (WHERE o.opcao_id = m.opcao_id_novo AND o.pergunta_id = m.pergunta_id),
         coalesce(string_agg(m.opcao_linha_id::text, ',' ORDER BY m.opcao_linha_id::text COLLATE "C"), ''),
         coalesce(string_agg(lower(m.opcao_id_velho::text), ',' ORDER BY m.opcao_linha_id::text COLLATE "C"), '')
    INTO v_mapa_n, v_mapa_ok, v_mapa_ids, v_mapa_vel
    FROM supabase_migrations.p52_remap_opcao_sjt m LEFT JOIN public.perguntas_opcao_sjt o ON o.id = m.opcao_linha_id
   WHERE m.versao = '20261011000003';
  IF v_mapa_n::text IS DISTINCT FROM current_setting('p52.banco_remap_n', true) OR v_mapa_ok <> v_mapa_n
     OR v_mapa_ids IS DISTINCT FROM coalesce(current_setting('p52.banco_remap_ids', true), '')
     OR v_mapa_vel IS DISTINCT FROM coalesce(current_setting('p52.banco_remap_velhos', true), '') THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (mapa): % linha(s) no mapa da versao 20261011000003, % com o id novo vigente; o PRE mediu % alternativa(s) (ids/velhos iguais: %/%); nada persiste',
      v_mapa_n, v_mapa_ok, current_setting('p52.banco_remap_n', true),
      v_mapa_ids IS NOT DISTINCT FROM coalesce(current_setting('p52.banco_remap_ids', true), ''),
      v_mapa_vel IS NOT DISTINCT FROM coalesce(current_setting('p52.banco_remap_velhos', true), '');
  END IF;
  -- nenhum papel de API le o mapa (escopo deliberado: os tres papeis do PostgREST/EF)
  FOREACH v_papel IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_schema_privilege(v_papel, 'supabase_migrations', 'USAGE')
       OR has_table_privilege(v_papel, 'supabase_migrations.p52_remap_opcao_sjt', 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'P52B POS-PORTAO (mapa): o papel % alcanca o mapa (gabarito dos itens remapeados); nada persiste', v_papel;
    END IF;
  END LOOP;
  v_remap := ';remap=' || current_setting('p52.banco_remap_n', true) || '/' || current_setting('p52.banco_remap_itens', true) ||
             ',refs=' || current_setting('p52.banco_remap_refs', true) || ',linhas=' || current_setting('p52.banco_remap_linhas', true) ||
             ',em_curso=' || current_setting('p52.banco_remap_curso', true) || ',mapa=' || v_mapa_n::text ||
             ',em_curso_ids=' || coalesce(nullif(current_setting('p52.banco_remap_curso_ids', true), ''), '-');
  -- ── fim (remap) ─────────────────────────────────────────────────────────────

  -- md5 da tabela de caracteres por char_length — a MESMA linha canonica do script:
  -- <cargo>|<content_hash>|<fortemente_pontua>,<pontua>,<neutro>,<atencao>, ordem de bytes
  SELECT md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_md5
    FROM (SELECT p.cargo || '|' || p.content_hash || '|' ||
                 (SELECT string_agg(char_length(o.opcao_texto)::text, ','
                                    ORDER BY array_position(ARRAY['fortemente_pontua', 'pontua', 'neutro', 'atencao']::text[], o.tag::text))
                    FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) AS x
            FROM public.perguntas p
           WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active' AND p.formato = 'mc') s;

  -- evidencia: so contagens e md5 — nenhum texto de item
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' banco:' || v_ev ||
          ';retirados=' || v_ret::text || ';tabela_md5=' || v_md5 || ';mantidos=' || v_mant_n::text || v_remap), false);
END
$pos$;
