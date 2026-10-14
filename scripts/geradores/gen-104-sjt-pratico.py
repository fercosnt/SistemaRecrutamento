#!/usr/bin/env python3
"""gen-104-sjt-pratico.py — gera 20261013000104_sjt_pratico_e_mc3.sql a partir da seção
«3 · O teste de situações do cargo (SJT)» dos três documentos de vaga revisados em 12/10.

    python3 -I scripts/geradores/gen-104-sjt-pratico.py            # escreve o SQL
    python3 -I scripts/geradores/gen-104-sjt-pratico.py --check    # só confere (sai 1 se o SQL no disco divergir)
    python3 -I scripts/geradores/gen-104-sjt-pratico.py --relatorio  # imprime o que sai/entra e as divergências

O SQL é GERADO, não transcrito: todo texto que vai ao banco sai destes documentos por este script.
Reusa o parser do banco v2 (`scripts/geradores/sjt_texto.py`: `_item`, `limpa`, `content_hash`,
`_permutacao`, `tabela_md5`) — nunca uma cópia — e o texto que gerou o banco no ar
(`docs/specs/BANCO-SJT-V2.md`, a fonte da `20261011000003`) para saber o que JÁ está em PROD:
item do documento cujo content_hash está no banco v2 FICA (nenhum INSERT); item que mudou ENTRA, e
o item do banco v2 na mesma posição SAI (`status = 'retired'`, nada apagado).

Rodar duas vezes sobre os mesmos textos dá SQL byte a byte igual.
"""
import hashlib
import json
import os
import re
import sys

sys.dont_write_bytecode = True
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..'))  # scripts/geradores → raiz (movido de docs/vagas/migrations em 2026-10-14)
sys.path.insert(0, os.path.join(RAIZ, 'scripts', 'geradores'))

import sjt_texto  # noqa: E402

VERSAO = '20261013000104'
SAIDA = os.path.join(RAIZ, 'supabase', 'migrations', f'{VERSAO}_sjt_pratico_e_mc3.sql')

# ⚠ TRAVA (2026-10-14). A `20261013000104` JA FOI APLICADA e o md5 dela esta no ledger de PROD.
# Rodar este script SEM argumento sobrescrevia o arquivo aplicado — foi o que aconteceu hoje, e o
# arquivo so voltou porque o ledger guarda `statements[1]` literal. Agora a escrita RECUSA quando o
# destino existe, salvo `--forcar`. E `--check` DIVERGE de proposito desde que o documento do
# videomaker avancou (MC3 encurtado na `20261014000001`): o delta vive naquela migration, nao aqui.
def _guarda_escrita(forcar):
    if os.path.exists(SAIDA) and not forcar:
        print(f'RECUSADO: {os.path.relpath(SAIDA, RAIZ)} ja existe e esta aplicada em PROD.\n'
              f'  --check     confere (diverge de proposito: ver a trava no topo do arquivo)\n'
              f'  --relatorio imprime o que entra/sai\n'
              f'  --forcar    sobrescreve (so se voce souber o que esta fazendo)', file=sys.stderr)
        raise SystemExit(2)
BANCO_V2 = 'docs/specs/BANCO-SJT-V2.md'
DOCS = [  # (cargo, documento) — ordem fixa = ordem do SQL
    ('editor-video', 'docs/vagas/editor-video.md'),
    ('videomaker-storymaker', 'docs/vagas/videomaker-storymaker.md'),
    ('social-media', 'docs/vagas/social-media-senior-marca-pessoal.md'),
]
MARCA_ENUNCIADO = '**Enunciado — é este texto que vai no campo `cenario` do item, por extenso:**'
RE_BANDA = re.compile(r'^\*\*Dimensões\*\* · banda: avança (\d+) · entrevista (\d+) · máximo (\d+)[ \t]*$', re.M)
RE_DIM = re.compile(r'^\|\s*`([a-z0-9_]+)`\s*\|\s*(\d+)\s*\|', re.M)
RE_TEMPO_CASO = re.compile(r'(?:1|um) caso aberto\*{0,2} \((\d+) min\)')
RE_DIM15 = re.compile(r'^### `([a-z0-9_]+)` — (?:peso (\d+)|\*\*compartilhada)', re.M)


class Recusa(Exception):
    pass


def ler(rel):
    with open(os.path.join(RAIZ, rel), encoding='utf-8') as f:
        return f.read()


def md5_arquivo(rel):
    with open(os.path.join(RAIZ, rel), 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


def secao(src, n, rel):
    m = re.search(r'^## ' + str(n) + r' · .*?(?=^## )', src, re.S | re.M)
    if not m:
        raise Recusa(f'SECAO {n} AUSENTE: {rel}')
    return m.group(0)


def enunciado(chunk, onde):
    """O blockquote logo abaixo da marca «Enunciado …», sem os `>` (inclusive aninhados), com as
    quebras de linha preservadas (a tela é whitespace-pre-line) e a ênfase markdown tirada pela
    `limpa()` do gerador v2 — que RECUSA se sobrar marcação."""
    if chunk.count(MARCA_ENUNCIADO) != 1:
        raise Recusa(f'MARCA DO ENUNCIADO AUSENTE OU REPETIDA: {onde}')
    resto = chunk.split(MARCA_ENUNCIADO, 1)[1].split('\n')
    linhas, dentro = [], False
    for ln in resto:
        if ln.startswith('>'):
            dentro = True
            linhas.append(re.sub(r'^(?:>[ \t]?)+', '', ln).rstrip())
        elif dentro:
            break
        elif ln.strip():
            raise Recusa(f'TEXTO ENTRE A MARCA E O ENUNCIADO: {onde}: {ln[:60]!r}')
    txt = re.sub(r'\n{3,}', '\n\n', '\n'.join(linhas)).strip()
    if not txt:
        raise Recusa(f'ENUNCIADO VAZIO: {onde}')
    return sjt_texto.limpa(txt)


def caso_aberto(cargo, chunk, tempo, onde):
    cen = enunciado(chunk, onde)
    mb = RE_BANDA.findall(chunk)
    if len(mb) != 1:
        raise Recusa(f'LINHA DE BANDA AUSENTE OU REPETIDA: {onde}')
    av, en, mx = (int(x) for x in mb[0])
    tabela = chunk.split('**Dimensões**', 1)[1]
    dims = [(k, int(p)) for k, p in RE_DIM.findall(tabela)]
    if not dims or len({k for k, _ in dims}) != len(dims):
        raise Recusa(f'DIMENSOES AUSENTES OU REPETIDAS: {onde}')
    soma = sum(p for _, p in dims)
    if soma != 100:
        raise Recusa(f'DIMENSOES NAO SOMAM 100: {onde} ({soma})')
    rubric = {'banda': {'avanca': av, 'entrevista': en, 'score_max': mx},
              'dimensoes': [{'dimension': k, 'peso': p} for k, p in dims]}
    it = dict(cargo=cargo, titulo=chunk.split('\n')[0].strip(), formato='caso_aberto', dim=None,
              tempo=tempo, cenario=cen, rubric=rubric, opcoes=[], mantido=None)
    it['content_hash'] = sjt_texto.content_hash(it)
    return it


def itens_do_doc(cargo, rel):
    src = ler(rel)
    s3 = secao(src, 3, rel)
    if f'**Cargo apontado: `{cargo}`' not in s3:
        raise Recusa(f'CARGO APONTADO DIVERGE: {rel} nao aponta `{cargo}`')
    mt = RE_TEMPO_CASO.findall(s3)
    if len(mt) != 1:
        raise Recusa(f'TEMPO DO CASO ABERTO AUSENTE: {rel}')
    tempo = int(mt[0])
    itens = []
    for chunk in re.split(r'^#### ', s3, flags=re.M)[1:]:
        titulo = chunk.split('\n')[0].strip()
        onde = f'{rel}/{titulo}'
        if titulo.startswith('Caso aberto'):
            itens.append(caso_aberto(cargo, chunk, tempo, onde))
        elif re.match(r'MC\d · ', titulo):
            try:
                it = sjt_texto._item(cargo, chunk)
            except sjt_texto.TextoInvalido as e:
                raise Recusa(f'{onde}: {e}')
            # o content_hash no banco foi calculado na ordem de AUTORIA; o POS recalcula no banco
            # pela ordem das etiquetas — as duas só coincidem se a autoria for fp, p, n, a
            if [o['tag'] for o in it['opcoes']] != list(sjt_texto.TAGS_MC):
                raise Recusa(f'AUTORIA FORA DA ORDEM DAS ETIQUETAS: {onde}')
            itens.append(it)
        else:
            raise Recusa(f'SUBSECAO INESPERADA NA SECAO 3: {onde}')
    n_mc = sum(1 for i in itens if i['formato'] == 'mc')
    n_ca = sum(1 for i in itens if i['formato'] == 'caso_aberto')
    if (n_mc, n_ca) != (6, 1):
        raise Recusa(f'CONTAGEM: {rel} tem {n_mc} mc + {n_ca} caso aberto (esperado 6+1)')
    return src, itens


def divergencias_15(src, caso, rel):
    """§15 (critérios) contra §3 (pesos). O §3 manda; a divergência é REPORTADA, não corrigida."""
    s15 = secao(src, 15, rel)
    d15 = {k: (int(p) if p else None) for k, p in RE_DIM15.findall(s15)}
    d3 = {d['dimension']: d['peso'] for d in caso['rubric']['dimensoes']}
    out = []
    for k, p in d3.items():
        if k not in d15:
            out.append(f'{k}: no §3 (peso {p}), ausente do §15')
        elif d15[k] is not None and d15[k] != p:
            out.append(f'{k}: §3 peso {p}, §15 peso {d15[k]}')
    for k in d15:
        if k not in d3:
            out.append(f'{k}: no §15, ausente do §3')
    return out


def montar():
    banco = sjt_texto.parse(os.path.join(RAIZ, BANCO_V2))
    plano = []
    for cargo, rel in DOCS:
        src, novos = itens_do_doc(cargo, rel)
        antigos = [i for i in banco if i['cargo'] == cargo]
        ant_mc = [i for i in antigos if i['formato'] == 'mc']
        ant_ca = [i for i in antigos if i['formato'] == 'caso_aberto']
        if len(ant_mc) != 6 or len(ant_ca) != 1:
            raise Recusa(f'BANCO V2 sem 6+1 para {cargo}')
        nov_mc = [i for i in novos if i['formato'] == 'mc']
        nov_ca = [i for i in novos if i['formato'] == 'caso_aberto'][0]
        ficam, entram, saem = [], [], []
        for k, (n, a) in enumerate(zip(nov_mc, ant_mc), 1):
            if n['titulo'].split(' · ')[0] != f'MC{k}' or a['titulo'].split(' · ')[0] != f'MC{k}':
                raise Recusa(f'NUMERACAO MC FORA DE ORDEM: {cargo} MC{k}')
            if n['content_hash'] == a['content_hash']:
                ficam.append(n)
            else:
                entram.append(n)
                saem.append(a)
        if nov_ca['content_hash'] == ant_ca[0]['content_hash']:
            raise Recusa(f'CASO ABERTO DE {cargo} NAO MUDOU — o documento manda trocar')
        entram.append(nov_ca)
        saem.append(ant_ca[0])
        # D-37: a `ordem` do mc novo — permutação semeada pelo hash; re-semeia se a fortemente_pontua
        # cairia numa posição que já tem 3 itens do cargo (contando os que FICAM, com a ordem que o
        # gerador v2 deu a eles — a mesma que está no ar)
        ordens_v2 = dict(zip((i['content_hash'] for i in ant_mc), sjt_texto.ordem_permutada(ant_mc)))
        cont = {}
        por_hash = {i['content_hash']: i for i in ant_mc}
        for f in ficam:
            i_fp = [o['tag'] for o in por_hash[f['content_hash']]['opcoes']].index('fortemente_pontua')
            pos = ordens_v2[f['content_hash']][i_fp]
            cont[pos] = cont.get(pos, 0) + 1
        for it in entram:
            if it['formato'] != 'mc':
                continue
            n = 0
            while True:
                ordem = sjt_texto._permutacao(it['content_hash'] if n == 0 else f"{it['content_hash']}:{n}")
                if cont.get(ordem[0], 0) < sjt_texto.MAX_MESMA_POSICAO:
                    break
                n += 1
            cont[ordem[0]] = cont.get(ordem[0], 0) + 1
            it['ordem'] = ordem
        plano.append(dict(cargo=cargo, rel=rel, src=src, todos_mc=nov_mc, ficam=ficam, entram=entram,
                          saem=saem, caso=nov_ca, div15=divergencias_15(src, nov_ca, rel)))
    return plano


# ── SQL ──────────────────────────────────────────────────────────────────────

def dq(tag, s):
    t = f'${tag}$'
    if t in s:
        raise Recusa(f'DOLLAR-TAG {t} APARECE NO TEXTO')
    return f'{t}{s}{t}'


def arr(xs):
    return 'ARRAY[' + ', '.join(f"'{x}'" for x in xs) + ']::text[]'


def sql(plano):
    todos_mc = [i for p in plano for i in p['todos_mc']]
    tab_md5 = sjt_texto.tabela_md5(todos_mc)
    cargos = [p['cargo'] for p in plano]
    sai = [(p['cargo'], i['formato'], i['content_hash'], i['titulo']) for p in plano for i in p['saem']]
    entra = [(p['cargo'], i) for p in plano for i in p['entram']]
    fica = [(p['cargo'], i['content_hash']) for p in plano for i in p['ficam']]
    esperado_ativo = [(c, h) for c, h in fica] + [(c, i['content_hash']) for c, i in entra]
    caso_novo = {p['cargo']: p['caso'] for p in plano}

    L = []
    w = L.append
    w(f'-- {VERSAO}_sjt_pratico_e_mc3.sql')
    w('--')
    w('-- POR QUE ESTA MIGRATION EXISTE')
    w('--')
    w('-- Decisao do operador (13/10, verbatim): «aplica como esta no documento, com o fluxo que definimos,')
    w('-- o documento ja esta revisado e deve seguir assim». Leva ao banco SJT o que a secao «3 · O teste de')
    w('-- situacoes do cargo (SJT)» dos tres documentos de vaga revisados em 12/10 manda e que o banco no ar')
    w('-- (o da 20261011000003, texto docs/specs/BANCO-SJT-V2.md) ainda nao tem:')
    w('--   · o caso aberto de cada cargo passa a ser o TESTE PRATICO (D2/D3 dos documentos): o enunciado')
    w('--     por extenso vai no `cenario`, e a rubrica com as dimensoes, pesos e banda do §3;')
    w('--   · videomaker-storymaker MC3 («O melhor material do mes, sem autorizacao»), reescrito em 12/10.')
    w('-- Os outros 17 itens de multipla escolha dos tres cargos batem com o documento (mesmo content_hash do')
    w('-- ar) e NAO mudam: nenhum INSERT para eles; o PRE e o POS os amarram.')
    w('--')
    w('-- Sai (status = \'retired\', nada e apagado — respostas e scores antigos continuam apontando linhas')
    w('-- existentes):')
    for c, f, h, t in sai:
        w(f'--   {c} · {f} · {t} · content_hash {h}')
    w('-- Entra:')
    for c, i in entra:
        w(f'--   {c} · {i["formato"]} · {i["titulo"]} · content_hash {i["content_hash"]}')
    w('--')
    w('-- ⚠ ESTE SQL FOI GERADO, NAO TRANSCRITO.')
    w('-- Gerador: docs/vagas/migrations/gen-104-sjt-pratico.py (reusa scripts/geradores/sjt_texto.py)')
    for _, rel in DOCS:
        w(f'-- Texto:   {rel} (md5 {md5_arquivo(rel)}) — secao 3')
    w(f'-- Ar:      {BANCO_V2} (md5 {md5_arquivo(BANCO_V2)}) — o que ja esta em PROD')
    w('-- Nao editar a mao: a mudanca vai no documento ou no gerador, e o SQL e gerado de novo.')
    w('--')
    w('-- `cenario` e `opcao_texto` sao TEXTO PURO na tela do candidato (whitespace-pre-line, sem TextoRico):')
    w('-- o gerador tira o `>` do blockquote e a enfase markdown, e RECUSA o texto se sobrar marcacao. Os links')
    w('-- do Drive chegam como texto (a tela nao os torna clicaveis).')
    w('--')
    w('-- FORA DESTA MIGRATION (codigo/EF, nao dado): o catalogo de criterios do §15 (rotulo, inclusion,')
    w('-- exclusion por chave) mora em supabase/functions/_shared/sjt-rubrica.ts; ate ele ser escrito, as')
    w('-- chaves novas chegam ao modelo como «sem criterios catalogados» (degradacao honesta, nao quebra).')
    w('-- Idem o aviso «a IA nao ve o material» de cada §3: e instrucao de rubrica/prompt, nao coluna.')
    w('--')
    w('-- Sem BEGIN/COMMIT: o endpoint ja roda o corpo inteiro numa unica transacao (CLAUDE.md §Migrations).')
    w(f'-- APLICAR COM (so com o OK do operador): node p46apply.cjs migrate docs/vagas/migrations/{VERSAO}_sjt_pratico_e_mc3.sql')
    w('-- Um candidato com o caso aberto ANTIGO aberto na tela no momento do apply recebe o novo ao')
    w('-- recarregar; o PRE publica quantos estao na avaliacao (evidencia `em_curso`).')
    w('')
    w("SET LOCAL lock_timeout = '3s';")
    w("SET LOCAL statement_timeout = '5s';")
    w('')
    w('-- ─────────────────────────────────────────────────────────────────────────────')
    w('-- PRE-PORTAO — recusa sem mudar nada. Guarda em GUCs LOCAIS os ids que saem.')
    w('-- ─────────────────────────────────────────────────────────────────────────────')
    w('DO $pre$')
    w('DECLARE')
    w(f'  v_cargos     text[] := {arr(cargos)};')
    w(f'  v_sai_cargo  text[] := {arr([c for c, _, _, _ in sai])};')
    w(f'  v_sai_fmt    text[] := {arr([f for _, f, _, _ in sai])};')
    w(f'  v_sai_hash   text[] := {arr([h for _, _, h, _ in sai])};')
    w(f'  v_fica_cargo text[] := {arr([c for c, _ in fica])};')
    w(f'  v_fica_hash  text[] := {arr([h for _, h in fica])};')
    w(f'  v_novo_hash  text[] := {arr([i["content_hash"] for _, i in entra])};')
    w('  v_n    bigint;')
    w('  v_id   text;')
    w("  v_ids  text := '';")
    w('  v_txt  text;')
    w('  v_curso bigint;')
    w('  v_rasc  bigint;')
    w('  k int;')
    w('BEGIN')
    w('  -- (sai) cada item que sai existe, ativo, EXATAMENTE 1, no cargo e formato esperados')
    w('  FOR k IN 1 .. array_length(v_sai_hash, 1) LOOP')
    w('    SELECT count(*), min(p.id::text) INTO v_n, v_id FROM public.perguntas p')
    w("     WHERE p.tipo = 'sjt' AND p.cargo = v_sai_cargo[k] AND p.formato = v_sai_fmt[k]")
    w("       AND p.status = 'active' AND p.content_hash = v_sai_hash[k];")
    w('    IF v_n <> 1 THEN')
    w("      RAISE EXCEPTION 'P104 PRE-PORTAO (sai): cargo % %, content_hash %: % item(ns) ativo(s) (esperado 1); nada mudou', v_sai_cargo[k], v_sai_fmt[k], v_sai_hash[k], v_n;")
    w('    END IF;')
    w("    v_ids := v_ids || CASE WHEN v_ids = '' THEN '' ELSE ',' END || v_id;")
    w('  END LOOP;')
    w('')
    w('  -- (fica) cada mc que bate com o documento esta ativo, EXATAMENTE 1, no cargo')
    w('  FOR k IN 1 .. array_length(v_fica_hash, 1) LOOP')
    w('    SELECT count(*) INTO v_n FROM public.perguntas p')
    w("     WHERE p.tipo = 'sjt' AND p.cargo = v_fica_cargo[k] AND p.formato = 'mc'")
    w("       AND p.status = 'active' AND p.content_hash = v_fica_hash[k];")
    w('    IF v_n <> 1 THEN')
    w("      RAISE EXCEPTION 'P104 PRE-PORTAO (fica): cargo %, content_hash %: % item(ns) ativo(s) (esperado 1) — o banco no ar nao e o que o documento supoe; nada mudou', v_fica_cargo[k], v_fica_hash[k], v_n;")
    w('    END IF;')
    w('  END LOOP;')
    w('')
    w('  -- (escopo) nos cargos do texto, nada ativo alem do que fica e do que sai: um item ativo fora')
    w('  -- dessa lista sobreviveria ao lado do novo e o cargo sortearia 7+ itens')
    w("  SELECT string_agg(p.cargo || '/' || p.formato || '/' || coalesce(p.content_hash, '<nulo>'), ', ') INTO v_txt")
    w('    FROM public.perguntas p')
    w("   WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active'")
    w('     AND (p.content_hash IS NULL OR NOT (p.content_hash = ANY (v_fica_hash) OR p.content_hash = ANY (v_sai_hash)));')
    w('  IF v_txt IS NOT NULL THEN')
    w("    RAISE EXCEPTION 'P104 PRE-PORTAO (escopo): item(ns) ativo(s) fora do texto e do que sai [%]; nada mudou', v_txt;")
    w('  END IF;')
    w('')
    w('  -- (novo) nenhum hash novo existe em QUALQUER cargo ou estado: o WHERE NOT EXISTS pularia o INSERT')
    w("  SELECT string_agg(p.cargo || '/' || p.status || '/' || p.content_hash, ', ') INTO v_txt")
    w('    FROM public.perguntas p WHERE p.content_hash = ANY (v_novo_hash);')
    w('  IF v_txt IS NOT NULL THEN')
    w("    RAISE EXCEPTION 'P104 PRE-PORTAO (novo): content_hash novo ja existe [%]; nada mudou', v_txt;")
    w('  END IF;')
    w('')
    w('  -- (itens_ids) vaga de QUALQUER status cuja bateria SJT liste itens por id num cargo do texto, ou')
    w('  -- apontando item de um cargo do texto: a troca por cargo nao a alcancaria')
    w("  SELECT string_agg(DISTINCT v.id::text || ':' || v.status, ', ') INTO v_txt")
    w('    FROM public.vagas v')
    w("   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(v.testes_aplicaveis) = 'array'")
    w("                                                THEN v.testes_aplicaveis ELSE '[]'::jsonb END) e")
    w("   WHERE (e ->> 'tipo' = 'sjt' OR e ->> 'teste' IN ('sjt', 'work_sample_sjt'))")
    w("     AND jsonb_typeof(e -> 'itens_ids') = 'array' AND jsonb_array_length(e -> 'itens_ids') > 0")
    w("     AND (e ->> 'cargo' = ANY (v_cargos)")
    w("          OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(e -> 'itens_ids') x")
    w('                       JOIN public.perguntas p ON p.id::text = x WHERE p.cargo = ANY (v_cargos)));')
    w('  IF v_txt IS NOT NULL THEN')
    w("    RAISE EXCEPTION 'P104 PRE-PORTAO (itens_ids): vaga(s) [%] listam itens por id num cargo do texto; nada mudou', v_txt;")
    w('  END IF;')
    w('')
    w('  -- (em curso) candidatura na avaliacao numa vaga cuja bateria SJT e de um cargo do texto, ainda sem')
    w('  -- o caso aberto pontuado: ao abrir (ou recarregar) o caso, recebe o NOVO. Contagem e rascunhos de')
    w('  -- caso aberto ja salvos — nenhum dado pessoal —, publicados para o operador. Nao recusa.')
    w('  SELECT count(*), count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.respostas_avaliacao r')
    w("                                                  WHERE r.candidatura_id = c.id AND r.teste = 'sjt_caso_aberto'))")
    w('    INTO v_curso, v_rasc')
    w('    FROM public.candidaturas c')
    w("   WHERE c.etapa_atual = 'avaliacao_assincrona' AND c.deleted_at IS NULL")
    w('     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s')
    w("                      WHERE s.candidatura_id = c.id AND s.tipo = 'sjt' AND s.subtipo = 'caso_aberto')")
    w('     AND EXISTS (SELECT 1 FROM public.vagas v')
    w("                  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(v.testes_aplicaveis) = 'array'")
    w("                                                               THEN v.testes_aplicaveis ELSE '[]'::jsonb END) e")
    w("                  WHERE v.id = c.vaga_id AND (e ->> 'tipo' = 'sjt' OR e ->> 'teste' IN ('sjt', 'work_sample_sjt'))")
    w("                    AND e ->> 'cargo' = ANY (v_cargos));")
    w('')
    w("  PERFORM set_config('p104.sai_ids', v_ids, true);")
    w("  PERFORM set_config('p104.em_curso', v_curso::text || '/rascunho_caso=' || v_rasc::text, true);")
    w('END')
    w('$pre$;')
    w('')

    n = 0
    for c, it in entra:
        n += 1
        if it['formato'] == 'mc':
            w(f'-- {n:02d} · {c} · mc · {it["titulo"]}')
            w('WITH novo AS (')
            w('  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)')
            w(f"  SELECT 'sjt', '{c}', {dq(f'n{n}d', it['dim'])}, {dq(f'n{n}c', it['cenario'])}, 'mc', {it['tempo']}, NULL, '{it['content_hash']}', 'active'")
            w(f"  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '{it['content_hash']}')")
            w('  RETURNING id')
            w(')')
            w('INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)')
            w('SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem')
            w('FROM novo, (VALUES')
            linhas = []
            for k, o in enumerate(it['opcoes']):
                linhas.append(f"    ({dq(f'n{n}o{k + 1}', o['texto'])}, '{o['tag']}'::enum_tag_opcao, {o['peso']}, {it['ordem'][k]})")
            w(',\n'.join(linhas))
            w(') AS v(texto, tag, peso, ordem);')
        else:
            rub = json.dumps(it['rubric'], ensure_ascii=False, sort_keys=True)
            w(f'-- {n:02d} · {c} · caso aberto · {it["titulo"]}')
            w('INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)')
            w(f"SELECT 'sjt', '{c}', NULL, {dq(f'n{n}c', it['cenario'])}, 'caso_aberto', {it['tempo']}, {dq(f'n{n}r', rub)}::jsonb, '{it['content_hash']}', 'active'")
            w(f"WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '{it['content_hash']}');")
        w('')

    w('-- ─────────────────────────────────────────────────────────────────────────────')
    w('-- RETIRADA — depois dos INSERTs: so os ids que o PRE amarrou. Nada e apagado.')
    w('-- ─────────────────────────────────────────────────────────────────────────────')
    w('DO $retira$')
    w('DECLARE')
    w("  v_ids text[] := string_to_array(nullif(current_setting('p104.sai_ids', true), ''), ',');")
    w('  v_n   bigint;')
    w('BEGIN')
    w(f'  IF coalesce(array_length(v_ids, 1), 0) <> {len(sai)} THEN')
    w(f"    RAISE EXCEPTION 'P104 RETIRADA: o PRE amarrou % id(s), o texto manda retirar {len(sai)}; nada persiste', coalesce(array_length(v_ids, 1), 0);")
    w('  END IF;')
    w("  UPDATE public.perguntas SET status = 'retired' WHERE id::text = ANY (v_ids) AND status = 'active';")
    w('  GET DIAGNOSTICS v_n = ROW_COUNT;')
    w(f'  IF v_n <> {len(sai)} THEN')
    w(f"    RAISE EXCEPTION 'P104 RETIRADA: % de {len(sai)} item(ns) retirado(s); nada persiste', v_n;")
    w('  END IF;')
    w('END')
    w('$retira$;')
    w('')
    w('-- ─────────────────────────────────────────────────────────────────────────────')
    w('-- POS-PORTAO — por cargo: 6 mc ativos com 4 alternativas de pesos {4,2,1,0} e etiqueta coerente;')
    w('-- exatamente 1 caso aberto ativo, e e o NOVO, com a rubrica do documento (soma dos pesos inclusa);')
    w('-- todo item ativo e do texto e o content_hash RECALCULADO NO BANCO bate (o texto que chegou e o do')
    w('-- documento); escada D-37; os que sairam estao retired com as alternativas intactas; md5 da tabela')
    w('-- de comprimentos igual ao do gerador.')
    w('-- ─────────────────────────────────────────────────────────────────────────────')
    w('DO $pos$')
    w('DECLARE')
    w(f'  v_cargos    text[] := {arr(cargos)};')
    w(f'  v_ativo_c   text[] := {arr([c for c, _ in esperado_ativo])};')
    w(f'  v_ativo_h   text[] := {arr([h for _, h in esperado_ativo])};')
    w(f'  v_caso_c    text[] := {arr(list(caso_novo))};')
    w(f'  v_caso_h    text[] := {arr([caso_novo[c]["content_hash"] for c in caso_novo])};')
    w(f'  v_caso_soma int[]  := ARRAY[{", ".join(str(sum(d["peso"] for d in caso_novo[c]["rubric"]["dimensoes"])) for c in caso_novo)}]::int[];')
    w('  v_caso_rub  jsonb[] := ARRAY[' + ', '.join(
        dq(f'r{k}', json.dumps(caso_novo[c]['rubric'], ensure_ascii=False, sort_keys=True)) + '::jsonb'
        for k, c in enumerate(caso_novo, 1)) + ']::jsonb[];')
    w("  v_sai_ids   text[] := string_to_array(nullif(current_setting('p104.sai_ids', true), ''), ',');")
    w(f"  v_tab_md5   text   := '{tab_md5}';")
    w('  c      text;')
    w('  k      int;')
    w('  v_mc   bigint;')
    w('  v_ca   bigint;')
    w('  v_n    bigint;')
    w('  v_id   uuid;')
    w('  v_h    text;')
    w('  v_rub  jsonb;')
    w('  v_md5  text;')
    w('BEGIN')
    w('  IF v_sai_ids IS NULL THEN')
    w("    RAISE EXCEPTION 'P104 POS-PORTAO: a GUC do PRE nao esta definida nesta transacao — o POS nao pode medir';")
    w('  END IF;')
    w('')
    w('  FOREACH c IN ARRAY v_cargos LOOP')
    w("    SELECT count(*) FILTER (WHERE p.formato = 'mc'), count(*) FILTER (WHERE p.formato = 'caso_aberto')")
    w("      INTO v_mc, v_ca FROM public.perguntas p WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active';")
    w('    IF v_mc <> 6 OR v_ca <> 1 THEN')
    w("      RAISE EXCEPTION 'P104 POS-PORTAO (contagem): cargo % com % mc + % caso aberto ativos (esperado 6+1); nada persiste', c, v_mc, v_ca;")
    w('    END IF;')
    w('    -- cada mc ativo: 4 alternativas, pesos {4,2,1,0} e etiqueta coerente com o peso')
    w('    SELECT count(*) INTO v_n FROM public.perguntas p')
    w("     WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active' AND p.formato = 'mc'")
    w('       AND (SELECT coalesce(array_agg(o.peso ORDER BY o.peso DESC), ARRAY[]::int[]) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id)')
    w('           IS DISTINCT FROM ARRAY[4, 2, 1, 0]')
    w('        OR EXISTS (SELECT 1 FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id')
    w("                    AND o.peso <> CASE o.tag::text WHEN 'fortemente_pontua' THEN 4 WHEN 'pontua' THEN 2 WHEN 'neutro' THEN 1 WHEN 'atencao' THEN 0 END);")
    w('    IF v_n <> 0 THEN')
    w("      RAISE EXCEPTION 'P104 POS-PORTAO (alternativas): cargo % tem % mc ativo(s) sem 4 alternativas de pesos {4,2,1,0} coerentes com a etiqueta; nada persiste', c, v_n;")
    w('    END IF;')
    w('    -- escada D-37: a fortemente_pontua nao ocupa a mesma ordem em mais de 3 mc do cargo')
    w('    SELECT coalesce(max(s.n), 0) INTO v_n FROM (')
    w('      SELECT o.ordem, count(*) AS n FROM public.perguntas p JOIN public.perguntas_opcao_sjt o ON o.pergunta_id = p.id')
    w("       WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active' AND p.formato = 'mc' AND o.tag = 'fortemente_pontua'")
    w('       GROUP BY o.ordem) s;')
    w('    IF v_n > 3 THEN')
    w("      RAISE EXCEPTION 'P104 POS-PORTAO (escada): cargo %, fortemente_pontua na mesma ordem em % itens (maximo 3); nada persiste', c, v_n;")
    w('    END IF;')
    w('  END LOOP;')
    w('')
    w('  -- todo item ativo dos cargos e um item do texto, e o content_hash recalculado no banco bate com o')
    w('  -- gravado: sha256(cenario || alternativas na ordem fortemente_pontua, pontua, neutro, atencao)')
    w('  SELECT count(*) INTO v_n FROM public.perguntas p')
    w("   WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active'")
    w('     AND (NOT EXISTS (SELECT 1 FROM unnest(v_ativo_c, v_ativo_h) AS e(c, h) WHERE e.c = p.cargo AND e.h = p.content_hash)')
    w("          OR encode(sha256(convert_to(p.cenario || coalesce((SELECT string_agg(o.opcao_texto, '' ORDER BY array_position(ARRAY['fortemente_pontua', 'pontua', 'neutro', 'atencao']::text[], o.tag::text))")
    w("                                                            FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id), ''), 'UTF8')), 'hex')")
    w('             IS DISTINCT FROM p.content_hash);')
    w(f'  IF v_n <> 0 OR (SELECT count(*) FROM public.perguntas p WHERE p.tipo = \'sjt\' AND p.cargo = ANY (v_cargos) AND p.status = \'active\') <> {len(esperado_ativo)} THEN')
    w(f"    RAISE EXCEPTION 'P104 POS-PORTAO (texto): % item(ns) ativo(s) fora do texto ou com content_hash que nao bate com o texto gravado (esperado {len(esperado_ativo)} itens do texto); nada persiste', v_n;")
    w('  END IF;')
    w('')
    w('  -- o caso aberto ativo de cada cargo e o NOVO, com a rubrica do documento e a soma dos pesos dele')
    w('  FOR k IN 1 .. array_length(v_caso_c, 1) LOOP')
    w('    SELECT p.content_hash, p.rubric INTO v_h, v_rub FROM public.perguntas p')
    w("     WHERE p.tipo = 'sjt' AND p.cargo = v_caso_c[k] AND p.formato = 'caso_aberto' AND p.status = 'active';")
    w('    IF v_h IS DISTINCT FROM v_caso_h[k] THEN')
    w("      RAISE EXCEPTION 'P104 POS-PORTAO (caso): o caso aberto ativo de % tem content_hash % (esperado o novo, %); nada persiste', v_caso_c[k], v_h, v_caso_h[k];")
    w('    END IF;')
    w('    IF v_rub IS DISTINCT FROM v_caso_rub[k]')
    w("       OR (SELECT sum((d ->> 'peso')::int) FROM jsonb_array_elements(v_rub -> 'dimensoes') d) IS DISTINCT FROM v_caso_soma[k] THEN")
    w("      RAISE EXCEPTION 'P104 POS-PORTAO (rubrica): a rubrica do caso aberto de % nao e a do documento (soma esperada %); nada persiste', v_caso_c[k], v_caso_soma[k];")
    w('    END IF;')
    w('  END LOOP;')
    w('')
    w('  -- os que sairam: retired, e as alternativas deles intactas (nada apagado)')
    w('  SELECT count(*) INTO v_n FROM public.perguntas p')
    w("   WHERE p.id::text = ANY (v_sai_ids) AND p.status = 'retired'")
    w("     AND (p.formato = 'caso_aberto' OR (SELECT count(*) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) = 4);")
    w(f'  IF v_n <> {len(sai)} THEN')
    w(f"    RAISE EXCEPTION 'P104 POS-PORTAO (retirados): % de {len(sai)} item(ns) retired com as alternativas intactas; nada persiste', v_n;")
    w('  END IF;')
    w('')
    w('  -- md5 da tabela de comprimentos (a MESMA linha canonica de scripts/geradores/tabela-comprimento-sjt.py):')
    w('  -- <cargo>|<content_hash>|<fortemente_pontua>,<pontua>,<neutro>,<atencao>, ordem de bytes')
    w("  SELECT md5(coalesce(string_agg(s.x, E'\\n' ORDER BY s.x COLLATE \"C\"), '')) INTO v_md5")
    w("    FROM (SELECT p.cargo || '|' || p.content_hash || '|' ||")
    w("                 (SELECT string_agg(char_length(o.opcao_texto)::text, ','")
    w("                                    ORDER BY array_position(ARRAY['fortemente_pontua', 'pontua', 'neutro', 'atencao']::text[], o.tag::text))")
    w('                    FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) AS x')
    w('            FROM public.perguntas p')
    w("           WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active' AND p.formato = 'mc') s;")
    w('  IF v_md5 IS DISTINCT FROM v_tab_md5 THEN')
    w("    RAISE EXCEPTION 'P104 POS-PORTAO (tabela): md5 da tabela de comprimentos % (o gerador mediu %); nada persiste', v_md5, v_tab_md5;")
    w('  END IF;')
    w('')
    w("  PERFORM set_config('p104.evidencia', 'sjt104:' || array_to_string(v_cargos, '+') || '=6+1;retirados=' ||")
    w("    array_length(v_sai_ids, 1)::text || ';tabela_md5=' || v_md5 || ';em_curso=' || current_setting('p104.em_curso', true), false);")
    w('END')
    w('$pos$;')
    return '\n'.join(L) + '\n'


def relatorio(plano):
    for p in plano:
        print(f"== {p['cargo']} ({p['rel']})")
        print(f"   ficam {len(p['ficam'])} mc: " + ', '.join(i['titulo'].split(' · ')[0] for i in p['ficam']))
        for i in p['saem']:
            print(f"   SAI   {i['formato']:11} {i['titulo']} · {i['content_hash'][:12]} · «{i['cenario'][:60]}»")
        for i in p['entram']:
            print(f"   ENTRA {i['formato']:11} {i['titulo']} · {i['content_hash'][:12]} · «{i['cenario'][:60]}»"
                  + (f" · ordem {i['ordem']}" if i['formato'] == 'mc' else ''))
        r = p['caso']['rubric']
        print(f"   rubrica: banda {r['banda']} · " + ', '.join(f"{d['dimension']}={d['peso']}" for d in r['dimensoes'])
              + f" · soma {sum(d['peso'] for d in r['dimensoes'])} · tempo {p['caso']['tempo']} min · cenario {len(p['caso']['cenario'])} chars")
        print('   §15 x §3: ' + ('; '.join(p['div15']) if p['div15'] else 'sem divergencia de chave/peso'))


def principal(argv):
    try:
        plano = montar()
        texto = sql(plano)
    except (Recusa, sjt_texto.TextoInvalido) as e:
        print(f'RECUSADO: {e}', file=sys.stderr)
        return 1
    if '--relatorio' in argv:
        relatorio(plano)
        return 0
    if '--check' in argv:
        with open(SAIDA, encoding='utf-8') as f:
            ok = f.read() == texto
        print('SQL no disco = gerado' if ok else 'SQL no disco DIVERGE do gerado')
        return 0 if ok else 1
    _guarda_escrita('--forcar' in argv)
    with open(SAIDA, 'w', encoding='utf-8') as f:
        f.write(texto)
    print(f'escrito {os.path.relpath(SAIDA, RAIZ)} ({len(texto.encode())} octetos)')
    return 0


if __name__ == '__main__':
    sys.exit(principal(sys.argv[1:]))
