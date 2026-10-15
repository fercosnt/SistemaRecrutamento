#!/usr/bin/env python3
"""gen-sjt-sdr-v3.py — gera a migration da revisão do banco SJT `sdr-social-seller` a partir do TEXTO.

    python3 -I scripts/geradores/gen-sjt-sdr-v3.py --texto docs/specs/BANCO-SJT-V3-SDR.md \\
        --versao 20261014000102 --saida "$TMPDIR/20261014000102_sjt_sdr_v3.sql"

Reaproveita o parser (`sjt_texto.py`) e os blocos de INSERT e de RETIRADA do `gen-sjt-v2.py` — um
único lugar para a gramática, o hash e a permutação de `ordem` (D-37). O que NÃO reaproveita, de
propósito: a troca de `pontuar_sjt` e o remapeamento de `opcao_id` do v2. Os dois foram feitos uma
vez, em 20261011000003; refazê-los aqui seria mexer em PROD sem motivo.

Item cujo texto não mudou tem o mesmo `content_hash` do que está no ar, e o `WHERE NOT EXISTS` do
INSERT o pula: ele fica com o mesmo id e as mesmas respostas. Item que saiu do texto é RETIRADO,
nunca apagado. O PRE exige que os itens mantidos estejam vivos ANTES (senão o texto não descreve o
banco que se pensa); o POS exige 6 mc + 1 caso ativos com EXATAMENTE os hashes do texto, a mesma
quantidade de retirados que o PRE mediu, e a anti-escada (D-37) sobre o banco VIVO — que inclui as
`ordem` dos itens mantidos, que este arquivo não escolheu.
"""
import argparse
import hashlib
import importlib.util
import os
import sys

sys.dont_write_bytecode = True
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import sjt_texto  # noqa: E402

_spec = importlib.util.spec_from_file_location('gen_sjt_v2', os.path.join(AQUI, 'gen-sjt-v2.py'))
v2 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(v2)

CARGO = 'sdr-social-seller'


def gerar(texto, versao):
    itens = sjt_texto.parse(texto)
    if sjt_texto.cargos(itens) != [CARGO]:
        raise sjt_texto.TextoInvalido(f'ESTE GERADOR SO CONHECE O CARGO {CARGO}: {sjt_texto.cargos(itens)}')
    with open(texto, 'rb') as f:
        texto_md5 = hashlib.md5(f.read()).hexdigest()
    mcs = [i for i in itens if i['formato'] == 'mc']
    ordens = dict(zip((i['content_hash'] for i in mcs), sjt_texto.ordem_permutada(mcs)))
    hs = [i['content_hash'] for i in itens]
    rel = os.path.relpath(os.path.abspath(texto), os.getcwd())

    cab = f"""-- {versao}_sjt_sdr_v3.sql
--
-- POR QUE ESTA MIGRATION EXISTE
-- Revisao do banco SJT do cargo `{CARGO}`, pedida pelo operador em 2026-10-14 ao montar a vaga
-- `sdr-relacionamento-pre-vendas`: sai o item de indicacao de tratamento (o SDR nao julga
-- indicacao — e do dentista) e o de reclamacao publica; entram contorno de objecao e reativacao
-- da base; "lente" vira "clareamento" no item de preco; o caso aberto ganha follow-up de 7 dias e
-- contorno de objecao de preco.
--
-- FONTE: {rel} (md5 {texto_md5}), GERADO por scripts/geradores/gen-sjt-sdr-v3.py — nunca
-- transcrito. Itens de texto identico ao v2 tem o mesmo content_hash e NAO sao reinseridos.
-- Itens que saem sao RETIRADOS (status 'retired'), nunca apagados: as respostas gravadas continuam
-- resolvendo para eles.
--
-- Aditivo e reversivel (desfazer: status 'active' nos retirados, 'retired' nos novos).
-- Sem BEGIN/COMMIT (D-22): o endpoint ja roda o corpo numa transacao.
-- """
    pre = f"""DO $pre$
DECLARE
  v_n bigint;
BEGIN
  -- Os itens que o texto MANTEM tem de estar vivos agora; senao o texto descreve outro banco.
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = {v2.lit(CARGO)} AND status = 'active'
     AND content_hash = ANY ({v2.arr(hs)});
  PERFORM set_config('sdr3.mantidos', v_n::text, true);
  -- Quantos ativos do cargo NAO estao no texto: e o que a retirada tem de tirar, nem mais nem menos.
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = {v2.lit(CARGO)} AND status = 'active'
     AND content_hash <> ALL ({v2.arr(hs)});
  PERFORM set_config('sdr3.a_retirar', v_n::text, true);
  IF v_n = 0 THEN
    RAISE EXCEPTION 'nada a retirar no cargo % — o texto ja esta no ar?', {v2.lit(CARGO)};
  END IF;
END
$pre$;"""
    ins = [v2.bloco_insert(n, it, ordens.get(it['content_hash'])) for n, it in enumerate(itens, 1)]
    pos = f"""DO $pos$
DECLARE
  v_n bigint;
  v_mc bigint;
  v_ca bigint;
  v_max bigint;
BEGIN
  SELECT count(*) FILTER (WHERE formato = 'mc'), count(*) FILTER (WHERE formato = 'caso_aberto')
    INTO v_mc, v_ca
    FROM public.perguntas WHERE tipo = 'sjt' AND cargo = {v2.lit(CARGO)} AND status = 'active';
  IF (v_mc, v_ca) IS DISTINCT FROM ({sjt_texto.MC_POR_CARGO}::bigint, {sjt_texto.CASOS_POR_CARGO}::bigint) THEN
    RAISE EXCEPTION 'cargo % ficou com % mc + % caso ativos', {v2.lit(CARGO)}, v_mc, v_ca;
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = {v2.lit(CARGO)} AND status = 'active'
     AND content_hash = ANY ({v2.arr(hs)});
  IF v_n IS DISTINCT FROM {len(hs)} THEN
    RAISE EXCEPTION 'so % dos % itens do texto estao ativos', v_n, {len(hs)};
  END IF;
  IF current_setting('p52.banco_retirados')::bigint IS DISTINCT FROM current_setting('sdr3.a_retirar')::bigint THEN
    RAISE EXCEPTION 'retirou % itens, o PRE mediu % a retirar',
      current_setting('p52.banco_retirados'), current_setting('sdr3.a_retirar');
  END IF;
  -- Toda alternativa dos mc ativos tem opcao_id uuid v4 (o gabarito nao viaja no id).
  SELECT count(*) INTO v_n FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE p.tipo = 'sjt' AND p.cargo = {v2.lit(CARGO)} AND p.status = 'active'
     AND o.opcao_id::text !~ {v2.lit(v2.RE_V4)};
  IF v_n > 0 THEN
    RAISE EXCEPTION '% alternativa(s) ativa(s) com opcao_id fora de uuid v4', v_n;
  END IF;
  -- Cada mc ativo tem as 4 etiquetas, uma de cada.
  SELECT count(*) INTO v_n FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = {v2.lit(CARGO)} AND p.status = 'active' AND p.formato = 'mc'
     AND (SELECT count(DISTINCT o.tag) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) <> 4;
  IF v_n > 0 THEN
    RAISE EXCEPTION '% item(ns) mc sem as 4 etiquetas', v_n;
  END IF;
  -- Anti-escada (D-37) sobre o banco VIVO: a certa nao ocupa a mesma posicao em mais de {sjt_texto.MAX_MESMA_POSICAO}.
  SELECT max(c) INTO v_max FROM (
    SELECT o.ordem, count(*) AS c FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
     WHERE p.tipo = 'sjt' AND p.cargo = {v2.lit(CARGO)} AND p.status = 'active' AND o.tag = 'fortemente_pontua'
     GROUP BY o.ordem) x;
  IF v_max > {sjt_texto.MAX_MESMA_POSICAO} THEN
    RAISE EXCEPTION 'a alternativa certa cai na mesma posicao em % itens (maximo {sjt_texto.MAX_MESMA_POSICAO})', v_max;
  END IF;
  RAISE NOTICE 'banco %: % mc + % caso ativos; % retirados', {v2.lit(CARGO)}, v_mc, v_ca,
    current_setting('p52.banco_retirados');
END
$pos$;"""
    partes = [cab, "SET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '5s';", pre, *ins,
              v2.bloco_retirada(itens), pos]
    return '\n\n'.join(p.rstrip('\n') for p in partes) + '\n'


def principal():
    ap = argparse.ArgumentParser(description=__doc__.strip().split('\n\n')[0])
    ap.add_argument('--texto', required=True)
    ap.add_argument('--versao', required=True)
    ap.add_argument('--saida', required=True)
    a = ap.parse_args()
    if not (len(a.versao) == 14 and a.versao.isdigit()):
        print(f'VERSAO INVALIDA: {a.versao!r}', file=sys.stderr)
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
