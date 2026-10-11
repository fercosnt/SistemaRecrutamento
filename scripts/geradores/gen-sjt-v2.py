#!/usr/bin/env python3
"""gen-sjt-v2.py — gera a migration do banco SJT v2 a partir do TEXTO (Phase 52 / 52-16).

    python3 -I scripts/geradores/gen-sjt-v2.py --texto docs/specs/BANCO-SJT-V2.md \\
        --versao 20261011000003 --saida "$TMPDIR/20261011000003_p52_banco_sjt_v2.sql"

Até o portão de texto do operador (52-17) a saída vai para um arquivo TEMPORÁRIO, nunca para
`supabase/migrations/`. O SQL emitido tem, nesta ordem: cabeçalho; os dois `SET LOCAL`; `DO $pre$`
(recusas e baseline); `DO $pre_pontuar$` + a troca de `public.pontuar_sjt` + `DO $pos_pontuar$`
(WR-02 do 52-REVIEW-PORTAO-2: o corpo VIVO, lido de `pontuar_sjt_vivo.plpgsql` com md5 conferido,
mais a recusa alta `22023` da resposta sem alternativa); os INSERTs dos itens novos (`ordem`
permutada, D-37); a retirada dos itens antigos dos cargos do texto (D-35 b); a tabela do mapa
(WR-01 do -2) e `DO $remap$` (WR-03 do -1: `opcao_id` artesanal dos itens que ficam ativos →
`gen_random_uuid()`, com as respostas gravadas e o mapa velho→novo); `DO $pos$` (6+1 por cargo,
retirados = baseline, anti-escada, casos mantidos, remapeamento e mapa, md5 da tabela por
`char_length`).
Determinístico: o mesmo texto dá o mesmo SQL (os ids novos nascem no apply, nunca no arquivo).
"""
import argparse
import hashlib
import json
import os
import sys

sys.dont_write_bytecode = True  # nenhum __pycache__ no repositorio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # roda sob python3 -I

import sjt_texto  # noqa: E402

GERADOR = 'scripts/geradores/gen-sjt-v2.py'

# ── WR-03 do 52-REVIEW-PORTAO-1: o remapeamento dos `opcao_id` artesanais ─────────────────────
# O banco semeado (`20260611000002_perguntas_sjt.sql`) gravou `opcao_id` feitos à mão cujo sufixo
# é a `ordem` (…a1 = a certa), e `get_opcoes_sjt` entrega o `opcao_id` ao candidato. O escopo do
# remapeamento é medido por FORMA, nunca por lista: alternativa de item SJT que fica ATIVO depois da
# retirada, cujo `opcao_id` não é um uuid v4 (o que `gen_random_uuid()` produz). Nenhum id — nem
# velho, nem novo — é escrito no SQL: os novos nascem de `gen_random_uuid()` na transação do apply.
#
# As três expressões abaixo são emitidas IGUAIS no PRE e no POS, e o `p52_banco_sjt_smoke.sql` as
# repete byte a byte (o `test_gen_sjt_v2.py` confere que o smoke as contém): a baseline é medida
# na própria execução e o POS/smoke recomputa a mesma coisa — nunca uma constante.
RE_V4 = '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

# Toda resposta SJT gravada (`scores_candidato.metadata.respostas[]`, tipo `sjt`) e a alternativa
# para a qual ela RESOLVE pelo par (pergunta_id, opcao_id) — ordem, etiqueta e peso, nunca o id. Se
# uma resposta deixar de resolver, ou resolver para outra alternativa, o md5 muda.
FP_RESPOSTAS = (
    "(SELECT md5(coalesce(string_agg(q.x, E'\\n' ORDER BY q.x COLLATE \"C\"), '')) FROM ("
    "SELECT s.id::text || '#' || r.ord::text || '|' || coalesce(r.e ->> 'pergunta_id', '-') || '|' || "
    "coalesce(r.e ->> 'tag', '-') || '|' || coalesce(r.e ->> 'peso', '-') || '|' || "
    "coalesce((SELECT string_agg(o.ordem::text || ':' || o.tag::text || ':' || o.peso::text, ';' ORDER BY o.id) "
    "FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id::text = lower(r.e ->> 'pergunta_id') "
    "AND o.opcao_id::text = lower(r.e ->> 'opcao_id')), '-') AS x "
    "FROM public.scores_candidato s CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN "
    "jsonb_typeof(s.metadata -> 'respostas') = 'array' THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) "
    "WITH ORDINALITY AS r(e, ord) WHERE s.tipo = 'sjt') q)"
)

# Toda linha de score SJT: o score gravado e o score RECOMPUTADO pela mesma junção do `pontuar_sjt`
# (`pergunta_id` + `opcao_id` → peso). O remapeamento não pode mudar nenhum dos dois.
FP_SCORES = (
    "(SELECT md5(coalesce(string_agg(q.x, E'\\n' ORDER BY q.x COLLATE \"C\"), '')) FROM ("
    "SELECT s.id::text || '|' || coalesce(s.score::text, '-') || '|' || coalesce(s.score_max::text, '-') || '|' || "
    "s.status::text || '|' || coalesce((SELECT sum(o.peso)::text FROM jsonb_array_elements(CASE WHEN "
    "jsonb_typeof(s.metadata -> 'respostas') = 'array' THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e "
    "JOIN public.perguntas_opcao_sjt o ON o.pergunta_id::text = lower(e ->> 'pergunta_id') "
    "AND o.opcao_id::text = lower(e ->> 'opcao_id')), '-') AS x "
    "FROM public.scores_candidato s WHERE s.tipo = 'sjt') q)"
)

# As alternativas do escopo SEM o `opcao_id`: o remapeamento troca só o id — texto, etiqueta, peso,
# ordem e pergunta ficam. Recebe a lista de ids de linha (`perguntas_opcao_sjt.id`) da GUC do PRE.
FP_ESCOPO = (
    "(SELECT md5(coalesce(string_agg(o.id::text || '|' || o.pergunta_id::text || '|' || o.tag::text || '|' || "
    "o.peso::text || '|' || o.ordem::text || '|' || md5(o.opcao_texto), E'\\n' ORDER BY o.id::text COLLATE \"C\"), '')) "
    "FROM public.perguntas_opcao_sjt o WHERE o.id::text = ANY (string_to_array(nullif("
    "current_setting('p52.banco_remap_ids', true), ''), ',')))"
)

# ── WR-02 do 52-REVIEW-PORTAO-2: `pontuar_sjt` recusa ALTO a resposta sem alternativa ────────────
# O `JOIN` de `scored` no corpo vivo descarta em silêncio o par (pergunta_id, opcao_id) que não casa
# — depois do remapeamento, um envio com o id velho (tela aberta durante o apply) sairia com nota
# parcial definitiva (a trava «avaliacao ja registrada» impede refazer). O corpo NOVO é o corpo VIVO
# mais um bloco inserido logo depois de UMA âncora; nada é transcrito. O corpo vivo mora em
# `pontuar_sjt_vivo.plpgsql` (o `prosrc` de PROD byte a byte, lido só leitura em 2026-10-11), o
# gerador recusa se o md5 do arquivo não for o medido, e o PRE da migration recusa se o `prosrc` vivo
# não for esse mesmo md5 — o corpo velho fica registrado (git) para o desfazer.
PONTUAR_VIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pontuar_sjt_vivo.plpgsql')
PONTUAR_VIVO_MD5 = '7a892f7b8c15e35b0976e408f9648864'
ANCORA_PONTUAR = ("  IF v_max = 0 THEN RAISE EXCEPTION 'bateria SJT nao configurada' "
                  "USING errcode = '22023'; END IF;\n")
MSG_RECUSA_PONTUAR = 'opcao fora da pergunta'
BLOCO_RECUSA_PONTUAR = (
    "\n"
    "  -- WR-02 (52-REVIEW-PORTAO-2, Phase 52 / 52-16): toda resposta tem de casar uma alternativa da\n"
    "  -- propria pergunta. O JOIN de `scored` descartava em silencio o par sem correspondencia (um\n"
    "  -- opcao_id remapeado, retirado ou forjado) e a bateria saia com nota parcial definitiva; agora a\n"
    "  -- submissao inteira e recusada alto e nada e gravado. (pergunta_id, opcao_id) e UNIQUE em\n"
    "  -- perguntas_opcao_sjt: cada resposta que casa da exatamente 1 linha em `scored`.\n"
    "  IF jsonb_array_length(v_breakdown) <> v_answered THEN\n"
    f"    RAISE EXCEPTION '{MSG_RECUSA_PONTUAR}' USING errcode = '22023';\n"
    "  END IF;\n"
)

# ── WR-01 do 52-REVIEW-PORTAO-2: o mapa velho→novo do remapeamento, durável ─────────────────────
# O id velho carrega a `ordem` (a ordem 1 era a certa): o mapa velho→novo É o gabarito dos itens
# remapeados. Por isso ele mora no esquema `supabase_migrations` — dono postgres, SEM USAGE para
# anon, authenticated e service_role (medido em 2026-10-11) —, ao lado do ledger que registra a
# migration que o produziu; a tabela ainda tem RLS ligada sem policy e nenhum GRANT. Nenhum papel de
# API (nem uma EF com service_role) o lê; só postgres (Management API / SQL Editor), que é quem roda
# o desfazer.
TABELA_MAPA = 'supabase_migrations.p52_remap_opcao_sjt'


class CorpoVivoInvalido(Exception):
    pass


def corpo_pontuar_novo():
    """O `prosrc` novo de `pontuar_sjt`: o vivo (md5 conferido) + a recusa, depois de UMA âncora."""
    with open(PONTUAR_VIVO, 'rb') as f:
        b = f.read()
    md5 = hashlib.md5(b).hexdigest()
    if md5 != PONTUAR_VIVO_MD5:
        raise CorpoVivoInvalido(
            f'CORPO VIVO DO pontuar_sjt DIVERGE: md5 {md5} em {os.path.basename(PONTUAR_VIVO)}, '
            f'esperado {PONTUAR_VIVO_MD5} — recapturar o prosrc de PROD (so leitura) e rever a ancora')
    vivo = b.decode('utf-8')
    n = vivo.count(ANCORA_PONTUAR)
    if n != 1:
        raise CorpoVivoInvalido(f'ANCORA DO pontuar_sjt achada {n} vez(es) no corpo vivo (esperado 1)')
    novo = vivo.replace(ANCORA_PONTUAR, ANCORA_PONTUAR + BLOCO_RECUSA_PONTUAR, 1)
    if '$function$' in novo:
        raise CorpoVivoInvalido('DELIMITADOR COLIDE: $function$ no corpo do pontuar_sjt')
    return novo


def dq(s, tag):
    """Dollar-quote com etiqueta própria; recusa se a etiqueta colidir com o texto."""
    if f'${tag}$' in s:
        raise sjt_texto.TextoInvalido(f'DELIMITADOR COLIDE: {tag}')
    return f'${tag}${s}${tag}$'


def lit(s):
    return "'" + s.replace("'", "''") + "'"


def arr(xs):
    return 'ARRAY[' + ', '.join(lit(x) for x in xs) + ']::text[]' if xs else 'ARRAY[]::text[]'


def cabecalho(versao, texto_rel, texto_md5, itens, mantidos, pontuar_md5_novo):
    cs = sjt_texto.cargos(itens)
    n_mc = sum(1 for i in itens if i['formato'] == 'mc')
    n_ca = sum(1 for i in itens if i['formato'] == 'caso_aberto')
    n_novos = sum(1 for i in itens if not i['mantido'])
    return f"""-- {versao}_p52_banco_sjt_v2.sql
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
-- uma alternativa da pergunta faz a submissao inteira falhar com 22023 ('{MSG_RECUSA_PONTUAR}'),
-- sem gravar nada. O corpo vivo e lido de `scripts/geradores/pontuar_sjt_vivo.plpgsql` (md5
-- conferido pelo gerador); o PRE recusa se o `prosrc` vivo tiver mudado; o POS confere o md5 novo,
-- as propriedades, a ACL (mantida como esta no ar, sem GRANT/REVOKE) e o comentario.
-- ⚠ ISTO SUBSTITUI UMA FUNCAO VIVA: o desfazer e recriar o corpo velho a partir daquele arquivo.
-- (WR-01 do 52-REVIEW-PORTAO-2) O mapa velho→novo do remapeamento e gravado na MESMA transacao em
-- `{TABELA_MAPA}` (esquema sem USAGE para anon, authenticated e service_role;
-- RLS ligada, nenhum GRANT): o id velho carrega a ordem, entao o mapa e o gabarito dos itens
-- remapeados. O desfazer do remapeamento le dali (id velho de volta nas alternativas + uma segunda
-- passada nas respostas gravadas).
--
-- pontuar_sjt_prosrc_md5_antes: {PONTUAR_VIVO_MD5}
-- pontuar_sjt_prosrc_md5_novo: {pontuar_md5_novo}
--
-- Cargos deste texto: {', '.join(cs)}.
-- Itens: {n_mc} mc + {n_ca} caso aberto; {n_novos} inseridos por este arquivo, {len(mantidos)} mantido(s) do ar.
--
-- ⚠ ESTE SQL FOI GERADO, NAO TRANSCRITO.
-- Gerador: {GERADOR}
-- Texto:   {texto_rel} (md5 {texto_md5})
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
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/{versao}_p52_banco_sjt_v2.sql
-- SO depois do portao de texto do operador (52-17), com o OK do operador ao remapeamento (WR-03),
-- a troca do `pontuar_sjt` (WR-02) e o mapa (WR-01) no checkpoint do apply, e fora de sessao de UAT
-- em curso: um candidato com prova aberta no momento do apply recebe erro — `42704` em
-- `get_opcoes_sjt` para item retirado; 22023 em `pontuar_sjt` para id remapeado (a tela precisa ser
-- recarregada para buscar os ids novos).
"""


def bloco_pre(itens, mantidos):
    cs = sjt_texto.cargos(itens)
    hs = [i['content_hash'] for i in itens]
    hc = [i['cargo'] for i in itens]
    mc_c = [m['cargo'] for m in mantidos]
    mc_h = [m['content_hash'] for m in mantidos]
    return f"""-- ─────────────────────────────────────────────────────────────────────────────
-- P52B PRE-PORTAO — recusa sem mudar nada; guarda em GUCs LOCAIS o escopo e a baseline.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_cargos     text[] := {arr(cs)};
  v_hashes     text[] := {arr(hs)};
  v_hash_cargo text[] := {arr(hc)};
  v_mant_cargo text[] := {arr(mc_c)};
  v_mant_hash  text[] := {arr(mc_h)};
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
     AND o.opcao_id::text !~ '{RE_V4}';

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
                AND n.nspname NOT LIKE 'pg\\_temp%' AND n.nspname NOT LIKE 'pg\\_toast\\_temp%'
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
  PERFORM set_config('p52.banco_respostas_fp',  {FP_RESPOSTAS}, true);
  PERFORM set_config('p52.banco_scores_fp',     {FP_SCORES}, true);
  PERFORM set_config('p52.banco_escopo_fp',     {FP_ESCOPO}, true);

  PERFORM set_config('p52.banco_cargos',      array_to_string(v_cargos, ','), true);
  PERFORM set_config('p52.banco_hashes',      array_to_string(v_hashes, ','), true);
  PERFORM set_config('p52.banco_retirar_n',   v_n::text,  true);
  PERFORM set_config('p52.banco_retirar_ids', v_ids,      true);
  PERFORM set_config('p52.banco_retirar_md5', md5(v_ids), true);
  PERFORM set_config('p52.banco_mantidos',    v_mant,     true);
END
$pre$;
"""


PONTUAR_SIG = "to_regprocedure('public.pontuar_sjt(uuid,jsonb)')"

# Propriedades, ACL (conjunto ordenado de aclexplode), comentario e EXECUTE de anon da funcao — a
# MESMA leitura no PRE e no POS (idioma do P51-01): a troca do corpo nao pode mexer em mais nada.
LE_PONTUAR = f"""  SELECT md5(p.prosrc), p.prosrc,
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
   WHERE p.oid = {PONTUAR_SIG};"""


def bloco_pontuar(novo):
    md5_novo = hashlib.md5(novo.encode()).hexdigest()
    return f"""-- ─────────────────────────────────────────────────────────────────────────────
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
{LE_PONTUAR}
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'P52B PRE-PORTAO (pontuar_sjt): public.pontuar_sjt(uuid, jsonb) nao existe; nada mudou';
  END IF;
  IF v_md5 IS DISTINCT FROM '{PONTUAR_VIVO_MD5}' THEN
    RAISE EXCEPTION 'P52B PRE-PORTAO (pontuar_sjt): md5(prosrc) vivo = % (o gerador leu {PONTUAR_VIVO_MD5}) — o corpo vivo mudou depois da captura: recapturar scripts/geradores/pontuar_sjt_vivo.plpgsql e gerar de novo; nada mudou', v_md5;
  END IF;
  PERFORM set_config('p52.banco_pontuar_props',    v_props, true);
  PERFORM set_config('p52.banco_pontuar_acl',      v_acl,   true);
  PERFORM set_config('p52.banco_pontuar_cmt',      v_cmt,   true);
  PERFORM set_config('p52.banco_pontuar_anon',     v_anon,  true);
  PERFORM set_config('p52.banco_pontuar_velho',    v_src,   true);
  PERFORM set_config('p52.banco_pontuar_md5_novo', '{md5_novo}', true);
END
$pre_pontuar$;

-- `pontuar_sjt`: o corpo VIVO + a recusa 22023 da resposta sem alternativa (WR-02). Mesma
-- assinatura, mesmas propriedades; CREATE OR REPLACE preserva dono, ACL e comentario.
CREATE OR REPLACE FUNCTION public.pontuar_sjt(p_candidatura_id uuid, p_respostas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function${novo}$function$;

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
{LE_PONTUAR}
  IF v_md5 IS DISTINCT FROM '{md5_novo}' THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (pontuar_sjt): md5(prosrc) = % (esperado {md5_novo}); nada persiste', v_md5;
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
$pos_pontuar$;"""


def bloco_mapa():
    return f"""-- ─────────────────────────────────────────────────────────────────────────────
-- MAPA DO REMAPEAMENTO (WR-01 do 52-REVIEW-PORTAO-2) — o registro durável velho→novo, gravado pelo
-- bloco de remapeamento abaixo, na MESMA transacao. Nasce DEPOIS do PRE (cuja varredura procura o id velho em toda
-- tabela). O id velho carrega a ordem: o mapa e o gabarito dos itens remapeados — por isso o esquema
-- `supabase_migrations` (sem USAGE para anon, authenticated e service_role), RLS ligada sem policy e
-- nenhum GRANT. So postgres o le, e e quem roda o desfazer.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE {TABELA_MAPA} (
  versao         text        NOT NULL,
  opcao_linha_id uuid        NOT NULL,
  pergunta_id    uuid        NOT NULL,
  opcao_id_velho uuid        NOT NULL,
  opcao_id_novo  uuid        NOT NULL,
  remapeado_em   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (versao, opcao_linha_id)
);
ALTER TABLE {TABELA_MAPA} ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE {TABELA_MAPA} FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE {TABELA_MAPA} IS
  'Phase 52 / 52-16 (WR-01 do 52-REVIEW-PORTAO-2): mapa opcao_id velho -> novo do remapeamento dos ids artesanais (WR-03 do 52-REVIEW-PORTAO-1), gravado na mesma transacao da migration que o fez (coluna versao). Serve ao desfazer: devolver o id velho as alternativas (opcao_linha_id) e uma segunda passada nas respostas gravadas. O id velho carrega a ordem, entao este mapa e o gabarito dos itens remapeados: esquema sem USAGE para os papeis de API, RLS ligada sem policy, nenhum GRANT.';"""


def bloco_insert(i, it, ordem):
    d = f'i{i}'
    h = it['content_hash']
    dim = dq(it['dim'], d + 'd') if it['dim'] else 'NULL'
    rub = f"{dq(json.dumps(it['rubric'], ensure_ascii=False), d + 'r')}::jsonb" if it['rubric'] else 'NULL'
    if it['formato'] == 'mc':
        vals = ',\n    '.join(
            f"({dq(o['texto'], d + 'o' + str(o['autoria']))}, '{o['tag']}'::enum_tag_opcao, {o['peso']}, {pos})"
            for o, pos in zip(it['opcoes'], ordem))
        return f"""-- {i:02d} · {it['cargo']} · mc · {it['titulo']}
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', {lit(it['cargo'])}, {dim}, {dq(it['cenario'], d + 'c')}, 'mc', {it['tempo']}, NULL, '{h}', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '{h}')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    {vals}
) AS v(texto, tag, peso, ordem);"""
    return f"""-- {i:02d} · {it['cargo']} · caso aberto · {it['titulo']}
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', {lit(it['cargo'])}, NULL, {dq(it['cenario'], d + 'c')}, 'caso_aberto', {it['tempo']}, {rub}, '{h}', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '{h}');"""


def bloco_retirada(itens):
    cs = sjt_texto.cargos(itens)
    hs = [i['content_hash'] for i in itens]
    return f"""-- ─────────────────────────────────────────────────────────────────────────────
-- RETIRADA (D-35 b) — depois dos INSERTs, no MESMO arquivo: os itens ativos dos cargos do texto
-- cujo hash NAO esta no texto deixam de ser sorteados. Nada e apagado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $retira$
DECLARE
  v_n bigint;
BEGIN
  UPDATE public.perguntas SET status = 'retired'
   WHERE tipo = 'sjt' AND cargo = ANY ({arr(cs)}) AND status = 'active'
     AND content_hash <> ALL ({arr(hs)});
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM set_config('p52.banco_retirados', v_n::text, true);
END
$retira$;
"""


def bloco_remap(versao):
    return f"""-- ─────────────────────────────────────────────────────────────────────────────
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
   WHERE p.tipo = 'sjt' AND p.status = 'active' AND o.opcao_id::text !~ '{RE_V4}';
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
  INSERT INTO {TABELA_MAPA} (versao, opcao_linha_id, pergunta_id, opcao_id_velho, opcao_id_novo)
  SELECT '{versao}', (m ->> 'id')::uuid, (m ->> 'p')::uuid, (m ->> 'velho')::uuid, (m ->> 'novo')::uuid
    FROM jsonb_array_elements(v_map) m;
  GET DIAGNOSTICS v_mapa = ROW_COUNT;
  IF v_mapa <> jsonb_array_length(v_map) THEN
    RAISE EXCEPTION 'P52B REMAP: % de % par(es) velho/novo gravado(s) no mapa; nada persiste', v_mapa, jsonb_array_length(v_map);
  END IF;

  -- as respostas gravadas: o elemento que aponta (pergunta, id velho) passa a apontar o id novo;
  -- ordem do array, demais chaves e demais elementos ficam
  UPDATE public.scores_candidato s
     SET metadata = jsonb_set(s.metadata, '{{respostas}}', (
           SELECT jsonb_agg(coalesce((SELECT jsonb_set(r.e, '{{opcao_id}}', to_jsonb(m ->> 'novo'))
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
"""


def bloco_pos(itens, mantidos, versao):
    cs = sjt_texto.cargos(itens)
    hs = [i['content_hash'] for i in itens]
    return f"""-- ─────────────────────────────────────────────────────────────────────────────
-- P52B POS-PORTAO — nesta ordem: (contagem), (escada), (retirados), (mantidos), (remap); evidencia.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_cargos   text[] := {arr(cs)};
  v_hashes   text[] := {arr(hs)};
  v_mant_esp int    := {len(mantidos)};
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
   WHERE p.tipo = 'sjt' AND p.status = 'active' AND o.opcao_id::text !~ '{RE_V4}';
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
  IF {FP_ESCOPO} IS DISTINCT FROM current_setting('p52.banco_escopo_fp', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): uma alternativa do escopo mudou alem do opcao_id; nada persiste';
  END IF;
  -- toda resposta SJT gravada resolve para a MESMA alternativa (ordem, etiqueta, peso) de antes
  IF {FP_RESPOSTAS} IS DISTINCT FROM current_setting('p52.banco_respostas_fp', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): uma resposta SJT gravada deixou de resolver para a mesma alternativa (ordem, etiqueta, peso); nada persiste';
  END IF;
  -- o score gravado e o recomputado pela juncao do pontuar_sjt nao mudaram em nenhuma linha
  IF {FP_SCORES} IS DISTINCT FROM current_setting('p52.banco_scores_fp', true) THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (remap): o score de uma linha SJT (gravado ou recomputado pelo par pergunta+opcao) mudou; nada persiste';
  END IF;
  -- o mapa durável (WR-01 do -2): uma linha por alternativa remapeada DESTA versao; o id novo e o
  -- que a alternativa tem agora; os ids de linha e os velhos sao os do PRE, na mesma ordem
  SELECT count(*), count(*) FILTER (WHERE o.opcao_id = m.opcao_id_novo AND o.pergunta_id = m.pergunta_id),
         coalesce(string_agg(m.opcao_linha_id::text, ',' ORDER BY m.opcao_linha_id::text COLLATE "C"), ''),
         coalesce(string_agg(lower(m.opcao_id_velho::text), ',' ORDER BY m.opcao_linha_id::text COLLATE "C"), '')
    INTO v_mapa_n, v_mapa_ok, v_mapa_ids, v_mapa_vel
    FROM {TABELA_MAPA} m LEFT JOIN public.perguntas_opcao_sjt o ON o.id = m.opcao_linha_id
   WHERE m.versao = '{versao}';
  IF v_mapa_n::text IS DISTINCT FROM current_setting('p52.banco_remap_n', true) OR v_mapa_ok <> v_mapa_n
     OR v_mapa_ids IS DISTINCT FROM coalesce(current_setting('p52.banco_remap_ids', true), '')
     OR v_mapa_vel IS DISTINCT FROM coalesce(current_setting('p52.banco_remap_velhos', true), '') THEN
    RAISE EXCEPTION 'P52B POS-PORTAO (mapa): % linha(s) no mapa da versao {versao}, % com o id novo vigente; o PRE mediu % alternativa(s) (ids/velhos iguais: %/%); nada persiste',
      v_mapa_n, v_mapa_ok, current_setting('p52.banco_remap_n', true),
      v_mapa_ids IS NOT DISTINCT FROM coalesce(current_setting('p52.banco_remap_ids', true), ''),
      v_mapa_vel IS NOT DISTINCT FROM coalesce(current_setting('p52.banco_remap_velhos', true), '');
  END IF;
  -- nenhum papel de API le o mapa (escopo deliberado: os tres papeis do PostgREST/EF)
  FOREACH v_papel IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_schema_privilege(v_papel, 'supabase_migrations', 'USAGE')
       OR has_table_privilege(v_papel, '{TABELA_MAPA}', 'SELECT,INSERT,UPDATE,DELETE') THEN
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
  SELECT md5(coalesce(string_agg(s.x, E'\\n' ORDER BY s.x COLLATE "C"), '')) INTO v_md5
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
"""


def gerar(texto, versao):
    itens = sjt_texto.parse(texto)
    with open(texto, 'rb') as f:
        texto_md5 = hashlib.md5(f.read()).hexdigest()
    rel = os.path.relpath(os.path.abspath(texto), os.getcwd())
    mantidos = sorted((i for i in itens if i['mantido']), key=lambda i: i['cargo'])
    ordens = {}
    for c in sjt_texto.cargos(itens):
        mcs = [i for i in itens if i['cargo'] == c and i['formato'] == 'mc']
        for it, ordem in zip(mcs, sjt_texto.ordem_permutada(mcs)):
            ordens[it['content_hash']] = ordem
    novo = corpo_pontuar_novo()
    partes = [cabecalho(versao, rel, texto_md5, itens, mantidos, hashlib.md5(novo.encode()).hexdigest()),
              "SET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '5s';\n",
              bloco_pre(itens, mantidos),
              bloco_pontuar(novo)]
    for i, it in enumerate(itens, 1):
        if it['mantido']:
            partes.append(f"-- {i:02d} · {it['cargo']} · caso aberto · {it['titulo']} — MANTIDO do banco no ar "
                          f"(content_hash {it['content_hash']}): nenhum INSERT; o PRE e o POS amarram o id vivo.")
        else:
            partes.append(bloco_insert(i, it, ordens.get(it['content_hash'])))
    partes += [bloco_retirada(itens), bloco_mapa(), bloco_remap(versao), bloco_pos(itens, mantidos, versao)]
    return '\n\n'.join(p.rstrip('\n') for p in partes) + '\n'


def principal():
    ap = argparse.ArgumentParser(description=__doc__.strip().split('\n\n')[0])
    ap.add_argument('--texto', required=True)
    ap.add_argument('--versao', required=True)
    ap.add_argument('--saida', required=True)
    a = ap.parse_args()
    if not (len(a.versao) == 14 and a.versao.isdigit()):
        print(f'VERSAO INVALIDA: {a.versao!r} (14 digitos)', file=sys.stderr)
        return 2
    try:
        sql = gerar(a.texto, a.versao)
    except sjt_texto.TextoInvalido as e:
        print(f'TEXTO RECUSADO: {e}', file=sys.stderr)
        return 1
    except CorpoVivoInvalido as e:
        print(f'CORPO VIVO RECUSADO: {e}', file=sys.stderr)
        return 1
    with open(a.saida, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f'gerado: {a.saida} ({len(sql.encode())} octetos, md5 {hashlib.md5(sql.encode()).hexdigest()})', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(principal())
