"""sjt_texto.py — parser COMPARTILHADO do texto do banco SJT v2 (Phase 52 / 52-16).

Um único parser para os dois consumidores: `gen-sjt-v2.py` (gera a migration) e
`tabela-comprimento-sjt.py` (a tabela de caracteres da D-34). Se cada um tivesse o seu, a tabela
mostrada no portão de texto poderia medir um texto diferente do que vai para PROD — é por isso que
a `limpa()` e a gramática moram aqui, e só aqui.

Gramática (a do rascunho de 30/09, `docs/specs/DRAFT-banco-sjt-marketing.md`):

    ## Cargo `<slug>`
    <prosa livre: razão do tamanho etc. — o parser ignora>
    ### MCn · <título>
    *(dimensão: <dim> · <n> min)*
    **Cenário.** <texto até a linha em branco>
    | # | tag | peso | Opção |
    |---|---|---|---|
    | 1 | fortemente_pontua | 4 | <texto> |      (4 linhas; `#` = ordem de AUTORIA, não a gravada)
    ### Caso aberto · <título>
    *(mantido do banco no ar — content_hash <64 hex>)*   (opcional: o caso FICA como está no ar)
    *(<n> min)*
    **Cenário.** <texto>
    **Escreva:** <texto>
    | dimensão | peso |   (soma 100)

Uma seção `## <outra coisa>` encerra o cargo (ex.: «## Notas de desenho»).

`content_hash` = sha256(cenário + textos das opções na ordem de autoria) — o MESMO do gerador
antigo (`gen-sjt-marketing.py`), para que um item que não mudou tenha o mesmo hash do que está no
ar. No caso aberto, «cenário» é `cenário + "\\n\\nEscreva: " + escreva`, também como no antigo.
"""
import hashlib
import re

TAGS_MC = ('fortemente_pontua', 'pontua', 'neutro', 'atencao')
PESOS = {'fortemente_pontua': 4, 'pontua': 2, 'neutro': 1, 'atencao': 0}
MC_POR_CARGO = 6
CASOS_POR_CARGO = 1
MAX_MESMA_POSICAO = 3  # D-37: a fortemente_pontua não ocupa a mesma `ordem` em mais de 3 de 6 itens

RE_MANTIDO = re.compile(r'^\*\(mantido do banco no ar — content_hash ([0-9a-f]{64})\)\*[ \t]*$', re.M)


class TextoInvalido(Exception):
    """O texto não pode virar migration. A mensagem começa pela CLASSE da recusa (em maiúsculas)."""


def limpa(s):
    """Tira ênfase markdown: `cenario` e `opcao_texto` são renderizados como TEXTO PURO na tela do
    candidato (`<p>` com whitespace-pre-line, sem TextoRico). Asterisco ou crase que sobrevivesse
    apareceria LITERAL para o candidato — então a sobra é RECUSADA, nunca emitida."""
    s = re.sub(r'\*\*(.+?)\*\*', r'\1', s)
    s = re.sub(r'(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)', r'\1', s)
    s = re.sub(r'`(.+?)`', r'\1', s)
    if '*' in s or '`' in s:
        raise TextoInvalido(f'MARCACAO SOBREVIVE A limpa(): {s[:120]!r}')
    return s


def content_hash(item):
    texto = item['cenario'] + ''.join(o['texto'] for o in item['opcoes'])
    return hashlib.sha256(texto.encode('utf-8')).hexdigest()


def _bloco(item, rotulo):
    m = re.search(r'\*\*' + rotulo + r'\*\*\s*(.+?)(?=\n\n)', item + '\n\n', re.S)
    return ' '.join(m.group(1).split()) if m else None


def _item(cargo, texto):
    titulo = texto.split('\n')[0].strip()
    onde = f'{cargo}/{titulo}'
    mantido = RE_MANTIDO.search(texto)
    if 'mantido do banco no ar' in texto and not mantido:
        raise TextoInvalido(f'LINHA DE MANTIDO MALFORMADA: {onde}')
    cen = _bloco(texto, r'Cenário\.')
    if not cen:
        raise TextoInvalido(f'CENARIO AUSENTE: {onde}')
    cenario = limpa(cen)

    if titulo.startswith('Caso aberto'):
        escreva = _bloco(texto, r'Escreva:')
        tempo = re.search(r'^\*\((\d+) min\)\*[ \t]*$', texto, re.M)
        if not escreva or not tempo:
            raise TextoInvalido(f'CASO ABERTO INCOMPLETO (Escreva/tempo): {onde}')
        if '| dimensão | peso |' not in texto:
            raise TextoInvalido(f'RUBRICA AUSENTE: {onde}')
        dims = re.findall(r'^\|\s*(\w+)\s*\|\s*(\d+)\s*\|[ \t]*$', texto.split('| dimensão | peso |')[1], re.M)
        rubric = {'banda': {'avanca': 18, 'entrevista': 13, 'score_max': 25},
                  'dimensoes': [{'dimension': d, 'peso': int(p)} for d, p in dims]}
        soma = sum(x['peso'] for x in rubric['dimensoes'])
        if soma != 100:
            raise TextoInvalido(f'RUBRICA NAO SOMA 100: {onde} ({soma})')
        it = dict(cargo=cargo, titulo=titulo, formato='caso_aberto', dim=None, tempo=int(tempo.group(1)),
                  cenario=limpa(cenario + '\n\nEscreva: ' + escreva), rubric=rubric, opcoes=[])
        it['content_hash'] = content_hash(it)
        it['mantido'] = mantido.group(1) if mantido else None
        if it['mantido'] and it['mantido'] != it['content_hash']:
            raise TextoInvalido(f'CASO MANTIDO DIVERGE DO AR: {cargo} (o texto da {it["content_hash"]}, '
                                f'a linha de mantido diz {it["mantido"]}) — PARAR e reportar; nunca ajustar o texto de PROD')
        return it

    if mantido:
        raise TextoInvalido(f'MANTIDO SO VALE PARA CASO ABERTO: {onde}')
    mdim = re.search(r'^\*\(dimensão: (.+?) · (\d+) min\)\*[ \t]*$', texto, re.M)
    if not mdim:
        raise TextoInvalido(f'DIMENSAO/TEMPO AUSENTE: {onde}')
    if '| # | tag | peso | Opção |' not in texto:
        raise TextoInvalido(f'TABELA DE ALTERNATIVAS AUSENTE: {onde}')
    tabela = texto.split('| # | tag | peso | Opção |')[1]
    ops = []
    for m in re.finditer(r'^\|\s*(\d+)\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*(.+?)\s*\|[ \t]*$', tabela, re.M):
        num, tag, peso, txt = m.groups()
        ops.append(dict(autoria=int(num), tag=tag, peso=int(peso), texto=limpa(txt)))
    if len(ops) != 4:
        raise TextoInvalido(f'ALTERNATIVAS: {onde}: {len(ops)} (esperado 4)')
    for o in ops:
        if o['tag'] not in TAGS_MC:
            raise TextoInvalido(f'ETIQUETA FORA DO CONJUNTO: {o["tag"]} ({onde})')
        if o['peso'] != PESOS[o['tag']]:
            raise TextoInvalido(f'PESO DIVERGE DA ETIQUETA: {onde}: {o["tag"]}={o["peso"]} (esperado {PESOS[o["tag"]]})')
    if sorted(o['tag'] for o in ops) != sorted(TAGS_MC):
        raise TextoInvalido(f'ETIQUETAS REPETIDAS: {onde}: {[o["tag"] for o in ops]}')
    if [o['autoria'] for o in ops] != [1, 2, 3, 4]:
        raise TextoInvalido(f'COLUNA # FORA DE 1..4: {onde}')
    it = dict(cargo=cargo, titulo=titulo, formato='mc', dim=limpa(mdim.group(1)), tempo=int(mdim.group(2)),
              cenario=cenario, rubric=None, opcoes=ops, mantido=None)
    it['content_hash'] = content_hash(it)
    return it


def parse(caminho, contagem=True):
    """Itens do texto, na ordem do arquivo. `contagem=True` exige 6 mc + 1 caso_aberto por cargo."""
    with open(caminho, encoding='utf-8') as f:
        src = f.read()
    itens, vistos = [], []
    for bloco in re.split(r'^## Cargo ', src, flags=re.M)[1:]:
        bloco = re.split(r'^## ', bloco, flags=re.M)[0]  # «## Notas…» encerra o cargo (### não casa)
        cargo = bloco.split('\n')[0].strip('` \t')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', cargo):
            raise TextoInvalido(f'CARGO COM SLUG INVALIDO: {cargo!r}')
        if cargo in vistos:
            raise TextoInvalido(f'CARGO REPETIDO: {cargo}')
        vistos.append(cargo)
        do_cargo = [_item(cargo, t) for t in re.split(r'^### ', bloco, flags=re.M)[1:]]
        if contagem:
            n_mc = sum(1 for i in do_cargo if i['formato'] == 'mc')
            n_ca = sum(1 for i in do_cargo if i['formato'] == 'caso_aberto')
            if (n_mc, n_ca) != (MC_POR_CARGO, CASOS_POR_CARGO):
                raise TextoInvalido(f'CONTAGEM: {cargo} tem {n_mc} mc + {n_ca} caso_aberto '
                                    f'(esperado {MC_POR_CARGO}+{CASOS_POR_CARGO})')
        itens += do_cargo
    if not itens:
        raise TextoInvalido('TEXTO SEM NENHUM CARGO (## Cargo `<slug>`)')
    hashes = [i['content_hash'] for i in itens]
    if len(set(hashes)) != len(hashes):
        raise TextoInvalido('CONTENT_HASH REPETIDO NO TEXTO: dois itens com o mesmo cenário e alternativas')
    return itens


def cargos(itens):
    """Cargos na ordem em que aparecem no texto."""
    out = []
    for i in itens:
        if i['cargo'] not in out:
            out.append(i['cargo'])
    return out


def _permutacao(semente):
    """`ordem` 1..4 para as opções na ordem de autoria, determinística: posto do sha256(semente|k)."""
    chaves = [hashlib.sha256(f'{semente}|{k}'.encode('utf-8')).hexdigest() for k in range(4)]
    ordem = [0] * 4
    for pos, k in enumerate(sorted(range(4), key=lambda k: chaves[k]), 1):
        ordem[k] = pos
    return ordem


def ordem_permutada(itens_do_cargo):
    """Uma lista `ordem` por item `mc` (D-37). Semente = content_hash; se a fortemente_pontua cairia
    numa posição que já tem MAX_MESMA_POSICAO itens do cargo, re-semeia com `hash + ':' + n`
    (n = 1, 2, …) até cumprir. Determinística: o mesmo texto dá sempre a mesma ordem."""
    contagem, res = {}, []
    for it in itens_do_cargo:
        i_fp = [o['tag'] for o in it['opcoes']].index('fortemente_pontua')
        n = 0
        while True:
            ordem = _permutacao(it['content_hash'] if n == 0 else f"{it['content_hash']}:{n}")
            if contagem.get(ordem[i_fp], 0) < MAX_MESMA_POSICAO:
                break
            n += 1
        contagem[ordem[i_fp]] = contagem.get(ordem[i_fp], 0) + 1
        res.append(ordem)
    return res


def contagens(item):
    """Comprimentos (pontos de código = char_length do Postgres, nunca octetos) por etiqueta."""
    return {o['tag']: len(o['texto']) for o in item['opcoes']}


def linha_md5(item):
    c = contagens(item)
    return f"{item['cargo']}|{item['content_hash']}|" + ','.join(str(c[t]) for t in TAGS_MC)


def tabela_md5(itens):
    """md5 canônico da tabela: uma linha por mc `<cargo>|<hash>|<fp>,<p>,<n>,<a>`, ordenadas por
    código (= `ORDER BY x COLLATE "C"` no SQL), unidas por \\n sem quebra final."""
    linhas = sorted(linha_md5(i) for i in itens if i['formato'] == 'mc')
    return hashlib.md5('\n'.join(linhas).encode('utf-8')).hexdigest()
