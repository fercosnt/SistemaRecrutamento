#!/usr/bin/env python3
"""gen-sjt-v2.py — gera a migration do banco SJT v2 a partir do TEXTO (Phase 52 / 52-16).

    python3 -I scripts/geradores/gen-sjt-v2.py --texto docs/specs/BANCO-SJT-V2.md \\
        --versao 20261011000003 --saida "$TMPDIR/20261011000003_p52_banco_sjt_v2.sql"

Até o portão de texto do operador (52-17) a saída vai para um arquivo TEMPORÁRIO, nunca para
`supabase/migrations/`. O SQL emitido tem, nesta ordem: cabeçalho; os dois `SET LOCAL`; `DO $pre$`
(recusas e baseline); os INSERTs dos itens novos (`ordem` permutada, D-37); a retirada dos itens
antigos dos cargos do texto (D-35 b); `DO $pos$` (6+1 por cargo, retirados = baseline, anti-escada,
casos mantidos, md5 da tabela por `char_length`). Determinístico: o mesmo texto dá o mesmo SQL.
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


def dq(s, tag):
    """Dollar-quote com etiqueta própria; recusa se a etiqueta colidir com o texto."""
    if f'${tag}$' in s:
        raise sjt_texto.TextoInvalido(f'DELIMITADOR COLIDE: {tag}')
    return f'${tag}${s}${tag}$'


def lit(s):
    return "'" + s.replace("'", "''") + "'"


def arr(xs):
    return 'ARRAY[' + ', '.join(lit(x) for x in xs) + ']::text[]' if xs else 'ARRAY[]::text[]'


def cabecalho(versao, texto_rel, texto_md5, itens, mantidos):
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
-- SO depois do portao de texto do operador (52-17), e fora de sessao de UAT em curso: um
-- candidato com prova aberta no momento do apply recebe erro em `get_opcoes_sjt`/`pontuar_sjt`
-- para os itens retirados.
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

  PERFORM set_config('p52.banco_cargos',      array_to_string(v_cargos, ','), true);
  PERFORM set_config('p52.banco_hashes',      array_to_string(v_hashes, ','), true);
  PERFORM set_config('p52.banco_retirar_n',   v_n::text,  true);
  PERFORM set_config('p52.banco_retirar_ids', v_ids,      true);
  PERFORM set_config('p52.banco_retirar_md5', md5(v_ids), true);
  PERFORM set_config('p52.banco_mantidos',    v_mant,     true);
END
$pre$;
"""


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


def bloco_pos(itens, mantidos):
    cs = sjt_texto.cargos(itens)
    hs = [i['content_hash'] for i in itens]
    return f"""-- ─────────────────────────────────────────────────────────────────────────────
-- P52B POS-PORTAO — nesta ordem: (contagem), (escada), (retirados), (mantidos); evidencia.
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
          ';retirados=' || v_ret::text || ';tabela_md5=' || v_md5 || ';mantidos=' || v_mant_n::text), false);
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
    partes = [cabecalho(versao, rel, texto_md5, itens, mantidos),
              "SET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '5s';\n",
              bloco_pre(itens, mantidos)]
    for i, it in enumerate(itens, 1):
        if it['mantido']:
            partes.append(f"-- {i:02d} · {it['cargo']} · caso aberto · {it['titulo']} — MANTIDO do banco no ar "
                          f"(content_hash {it['content_hash']}): nenhum INSERT; o PRE e o POS amarram o id vivo.")
        else:
            partes.append(bloco_insert(i, it, ordens.get(it['content_hash'])))
    partes += [bloco_retirada(itens), bloco_pos(itens, mantidos)]
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
    with open(a.saida, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f'gerado: {a.saida} ({len(sql.encode())} octetos, md5 {hashlib.md5(sql.encode()).hexdigest()})', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(principal())
