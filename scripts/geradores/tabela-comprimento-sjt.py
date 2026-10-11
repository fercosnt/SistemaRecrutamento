#!/usr/bin/env python3
"""tabela-comprimento-sjt.py — a tabela de caracteres da D-34, conferível (Phase 52 / 52-16).

    python3 -I scripts/geradores/tabela-comprimento-sjt.py <texto.md> [--criterio proposto] [--md5]
    python3 -I scripts/geradores/tabela-comprimento-sjt.py --auto-teste

Por item `mc`: as 4 contagens (pontos de código — `len(str)` = `char_length` do Postgres, nunca
octetos), a razão `fortemente_pontua ÷ média das outras três`, a amplitude (máx − mín, em % do
mín) e o POSTO da `fortemente_pontua` (1 = nenhuma alternativa é mais longa que ela). Por cargo: em
quantos itens ela é ESTRITAMENTE a mais longa (empate no topo não denuncia a certa pelo tamanho).

Critério PROPOSTO ao operador (D-34 deixou o número aberto; Pitfall 8 — razão sozinha não basta):
  por item   0,90 ≤ razão ≤ 1,10  E  amplitude ≤ 25% do mín;
  por cargo  a fortemente_pontua é a mais longa em no máximo 2 de 6 itens.
`--criterio proposto` sai 1 se algum item ou cargo violar. `--md5` imprime só o md5 canônico (o
mesmo que o POS da migration emite como `tabela_md5`). `--auto-teste` prova que o portão morde.

Reusa o parser e a `limpa()` do gerador (`sjt_texto.py`, no mesmo diretório) — nunca uma cópia.
"""
import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # roda sob python3 -I

import sjt_texto  # noqa: E402

RAZAO_MIN, RAZAO_MAX = 0.90, 1.10
AMPLITUDE_MAX = 0.25
MAIS_LONGA_MAX_POR_CARGO = 2


def medir(item):
    c = sjt_texto.contagens(item)
    fp = c['fortemente_pontua']
    outras = [c[t] for t in sjt_texto.TAGS_MC if t != 'fortemente_pontua']
    todas = [fp] + outras
    razao = fp / (sum(outras) / 3)
    amplitude = (max(todas) - min(todas)) / min(todas)
    posto = 1 + sum(1 for x in outras if x > fp)
    mais_longa = fp > max(outras)
    ok = RAZAO_MIN <= razao <= RAZAO_MAX and amplitude <= AMPLITUDE_MAX
    return dict(c=c, razao=razao, amplitude=amplitude, posto=posto, mais_longa=mais_longa, ok=ok)


def avaliar(itens):
    """(linhas por item, resumo por cargo, algum_fora)."""
    linhas, resumo, fora = [], [], False
    for cargo in sjt_texto.cargos(itens):
        mcs = [i for i in itens if i['cargo'] == cargo and i['formato'] == 'mc']
        n_longa = 0
        for it in mcs:
            m = medir(it)
            n_longa += m['mais_longa']
            fora |= not m['ok']
            linhas.append((cargo, it, m))
        cargo_ok = n_longa <= MAIS_LONGA_MAX_POR_CARGO
        fora |= not cargo_ok
        maxr = max((medir(i)['razao'] for i in mcs), default=0.0)
        resumo.append((cargo, len(mcs), n_longa, maxr, cargo_ok))
    return linhas, resumo, fora


def imprimir(itens):
    linhas, resumo, fora = avaliar(itens)
    print('| cargo | item | fortemente_pontua | pontua | neutro | atencao | razão | amplitude | posto | critério |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for cargo, it, m in linhas:
        c = m['c']
        rotulo = it['titulo'].split(' · ')[0]
        print(f"| {cargo} | {rotulo} | {c['fortemente_pontua']} | {c['pontua']} | {c['neutro']} | {c['atencao']} "
              f"| {m['razao']:.2f} | {m['amplitude'] * 100:.0f}% | {m['posto']} | {'ok' if m['ok'] else 'FORA'} |")
    print()
    for cargo, n, n_longa, maxr, ok in resumo:
        print(f"- {cargo}: fortemente_pontua estritamente a mais longa em {n_longa} de {n} itens; "
              f"razão máxima {maxr:.2f} — {'ok' if ok else 'FORA'}")
    print()
    print(f"tabela_md5={sjt_texto.tabela_md5(itens)}")
    return fora


def _fabricado(cargo, n, textos):
    ops = [dict(autoria=k + 1, tag=t, peso=sjt_texto.PESOS[t], texto=x)
           for k, (t, x) in enumerate(zip(sjt_texto.TAGS_MC, textos))]
    it = dict(cargo=cargo, titulo=f'MC{n} · fabricado', formato='mc', dim='d', tempo=4,
              cenario=f'cenario fabricado {n}', rubric=None, opcoes=ops, mantido=None)
    it['content_hash'] = sjt_texto.content_hash(it)
    return it


def auto_teste():
    falhas = []
    base = 'a' * 100
    # 1. a certa 2x maior: razão fora E posto 1 → marcado
    longo = _fabricado('auto', 1, ['b' * 200, base, base, base])
    m = medir(longo)
    if m['ok'] or m['posto'] != 1 or not m['mais_longa'] or m['razao'] < 1.99:
        falhas.append(f'item com a certa 2x maior NAO saiu marcado: {m}')
    # 2. item equilibrado: não marcado
    eq = _fabricado('auto', 2, ['c' * 104, 'd' * 100, 'e' * 98, 'f' * 110])
    if not medir(eq)['ok']:
        falhas.append(f'item equilibrado saiu marcado: {medir(eq)}')
    # 3. amplitude: razão perto de 1, mas uma alternativa curta demais → marcado
    amp = _fabricado('auto', 3, ['g' * 100, 'h' * 130, 'i' * 70, 'j' * 100])
    if medir(amp)['ok']:
        falhas.append(f'amplitude de 86% NAO saiu marcada: {medir(amp)}')
    # 4. cargo: razão 1,05 em todos, mas a certa é a mais longa em 3 de 6 → cargo FORA (Pitfall 8)
    cargo = [_fabricado('posto', k, ['k' * 105, 'l' * 100, 'm' * 100, 'n' * 100]) for k in range(1, 4)]
    cargo += [_fabricado('posto', k, ['o' * 100, 'p' * 104, 'q' * 100, 'r' * 100]) for k in range(4, 7)]
    _, resumo, fora = avaliar(cargo)
    if not fora or resumo[0][2] != 3:
        falhas.append(f'cargo com a certa mais longa em 3 de 6 NAO saiu marcado: {resumo}')
    # 5. empate no topo não conta como «a mais longa»
    empate = _fabricado('auto', 5, ['s' * 100, 't' * 100, 'u' * 95, 'v' * 97])
    if medir(empate)['mais_longa'] or medir(empate)['posto'] != 1:
        falhas.append(f'empate no topo contou como mais longa: {medir(empate)}')
    # 6. contagem em pontos de código, não octetos
    acento = _fabricado('auto', 6, ['ção' * 30, 'abc' * 30, 'def' * 30, 'ghi' * 30])
    if sjt_texto.contagens(acento)['fortemente_pontua'] != 90:
        falhas.append('contagem com acento nao e em pontos de codigo')
    # 7. md5 canônico confere com a construção manual
    manual = hashlib.md5('\n'.join(sorted(sjt_texto.linha_md5(i) for i in (eq, longo))).encode()).hexdigest()
    if sjt_texto.tabela_md5([longo, eq]) != manual or not sjt_texto.linha_md5(eq).endswith('|104,100,98,110'):
        falhas.append('md5 canonico diverge da construcao manual')
    if falhas:
        for f in falhas:
            print('AUTO-TESTE FALHOU:', f)
        return 1
    print('AUTO-TESTE OK: certa 2x maior marcada (razão e posto 1); equilibrado passa; amplitude morde; '
          'posto por cargo morde (3 de 6); empate não conta; pontos de código; md5 canônico')
    return 0


def principal(argv):
    if argv == ['--auto-teste']:
        return auto_teste()
    criterio, so_md5, arquivos = False, False, []
    k = 0
    while k < len(argv):
        a = argv[k]
        if a == '--criterio':
            if k + 1 >= len(argv) or argv[k + 1] != 'proposto':
                print('uso: --criterio proposto', file=sys.stderr)
                return 2
            criterio, k = True, k + 2
            continue
        if a == '--md5':
            so_md5 = True
        elif a.startswith('--'):
            print(f'opcao desconhecida: {a}', file=sys.stderr)
            return 2
        else:
            arquivos.append(a)
        k += 1
    if len(arquivos) != 1:
        print(__doc__.strip().split('\n\n')[1], file=sys.stderr)
        return 2
    try:
        itens = sjt_texto.parse(arquivos[0])
    except sjt_texto.TextoInvalido as e:
        print(f'TEXTO RECUSADO: {e}', file=sys.stderr)
        return 1
    if so_md5:
        print(sjt_texto.tabela_md5(itens))
        return 0
    fora = imprimir(itens)
    if criterio and fora:
        print('CRITERIO PROPOSTO: FORA — algum item ou cargo viola (ver linhas FORA acima)')
        return 1
    if criterio:
        print('CRITERIO PROPOSTO: ok — todos os itens e cargos cumprem')
    return 0


if __name__ == '__main__':
    sys.exit(principal(sys.argv[1:]))
