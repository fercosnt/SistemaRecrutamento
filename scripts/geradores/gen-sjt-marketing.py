import re, hashlib, pathlib, json, sys

def limpa(s):
    """Tira enfase markdown: `cenario` e `opcao_texto` sao renderizados como TEXTO PURO
    (SjtMultiplaEscolhaScreen:215 / SjtCasoAbertoScreen:225 — <p> com whitespace-pre-line,
    sem TextoRico). Asterisco emitido aqui apareceria LITERAL na tela do candidato."""
    s = re.sub(r'\*\*(.+?)\*\*', r'\1', s)
    s = re.sub(r'(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)', r'\1', s)
    s = re.sub(r'`(.+?)`', r'\1', s)
    assert '**' not in s and '`' not in s, s
    return s

src = pathlib.Path('docs/specs/DRAFT-banco-sjt-marketing.md').read_text()
cargos = re.split(r'^## Cargo ', src, flags=re.M)[1:]
TAGS = {'fortemente_pontua','pontua','neutro','atencao','knockout'}

def dq(s, tag):
    assert f'${tag}$' not in s, f'delimitador colide: {tag}'
    return f'${tag}$among{s}$among{tag}$'.replace('among','')

itens = []
for bloco in cargos:
    cargo = bloco.split('\n')[0].strip('` ')
    # cada item comeca em "### "
    for item in re.split(r'^### ', bloco, flags=re.M)[1:]:
        titulo = item.split('\n')[0].strip()
        mdim = re.search(r'\*\(dimensão: (.+?) · (\d+) min\)\*', item)
        cen = re.search(r'\*\*Cenário\.\*\*\s*(.+?)(?=\n\n)', item, re.S)
        if not cen: cen = re.search(r'\*\*Cenário\.\*\*\s*(.+?)(?=\n\n)', item+'\n\n', re.S)
        cenario = limpa(' '.join(cen.group(1).split())) if cen else None
        if titulo.startswith('Caso aberto'):
            escreva = re.search(r'\*\*Escreva:\*\*\s*(.+?)(?=\n\n)', item, re.S)
            tempo = int(re.search(r'\*\((\d+) min\)\*', item).group(1))
            dims = re.findall(r'\|\s*(\w+)\s*\|\s*(\d+)\s*\|', item.split('| dimensão | peso |')[1])
            rub = {"banda":{"avanca":18,"entrevista":13,"score_max":25},
                   "dimensoes":[{"dimension":d,"peso":int(p)} for d,p in dims]}
            assert sum(x["peso"] for x in rub["dimensoes"])==100, cargo
            cenario_full = cenario + '\n\nEscreva: ' + ' '.join(escreva.group(1).split())
            itens.append(dict(cargo=cargo, formato='caso_aberto', dim=None, tempo=tempo,
                              cenario=limpa(cenario_full), rubric=rub, opcoes=[]))
        else:
            tabela = item.split('| # | tag | peso | Opção |')[1]
            ops=[]
            for m in re.finditer(r'^\|\s*(\d+)\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*$', tabela, re.M):
                ordem, tag, peso, texto = m.groups()
                assert tag in TAGS, tag
                ops.append(dict(ordem=int(ordem), tag=tag, peso=int(peso), texto=limpa(texto)))
            assert len(ops)==4, f'{cargo}/{titulo}: {len(ops)} opções'
            itens.append(dict(cargo=cargo, formato='mc', dim=mdim.group(1), tempo=int(mdim.group(2)),
                              cenario=cenario, rubric=None, opcoes=ops))

assert len(itens)==21, len(itens)
print(f'parseados {len(itens)} itens', file=sys.stderr)

out=[]
for i,it in enumerate(itens,1):
    h = hashlib.sha256((it['cenario']+''.join(o['texto'] for o in it['opcoes'])).encode()).hexdigest()
    d=f'i{i}'
    dim = f"{dq(it['dim'],d+'d')}" if it['dim'] else 'NULL'
    rub = f"{dq(json.dumps(it['rubric'],ensure_ascii=False),d+'r')}::jsonb" if it['rubric'] else 'NULL'
    if it['opcoes']:
        vals = ',\n    '.join(
            f"({dq(o['texto'],d+'o'+str(o['ordem']))}, '{o['tag']}'::enum_tag_opcao, {o['peso']}, {o['ordem']})"
            for o in it['opcoes'])
        out.append(f"""-- {i:02d} · {it['cargo']} · {it['formato']}
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', '{it['cargo']}', {dim}, {dq(it['cenario'],d+'c')}, '{it['formato']}', {it['tempo']}, {rub}, '{h}', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '{h}')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    {vals}
) AS v(texto, tag, peso, ordem);""")
    else:
        out.append(f"""-- {i:02d} · {it['cargo']} · caso aberto
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', '{it['cargo']}', NULL, {dq(it['cenario'],d+'c')}, 'caso_aberto', {it['tempo']}, {rub}, '{h}', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '{h}');""")

print('\n\n'.join(out))
