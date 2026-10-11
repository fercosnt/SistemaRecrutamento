#!/usr/bin/env python3
"""Testes do banco SJT v2 (Phase 52 / 52-16): parser compartilhado, tabela de caracteres e gerador.

Rodar:  python3 -I scripts/geradores/test_gen_sjt_v2.py -v

Os scripts com hifen no nome (`tabela-comprimento-sjt.py`, `gen-sjt-v2.py`) sao chamados como
processo — e assim que o portao os roda (`python3 -I ...`). O texto de teste e FABRICADO aqui,
num cargo `p52-teste` que nao existe em PROD; nenhum teste le o texto real do banco.
"""
import hashlib
import os
import subprocess
import sys
import tempfile
import unittest

AQUI = os.path.dirname(os.path.abspath(__file__))
TABELA = os.path.join(AQUI, 'tabela-comprimento-sjt.py')
GERADOR = os.path.join(AQUI, 'gen-sjt-v2.py')

CENARIO_CASO = ('Chega uma mensagem de um lead pedindo o valor de um tratamento antes de qualquer conversa.')
ESCREVA_CASO = '(a) a resposta que voce mandaria; (b) o que faria se ele nao respondesse.'


def _opcoes(n_item, fp_len=None, n_opcoes=4, etiqueta_fp='fortemente_pontua'):
    """Quatro alternativas de comprimento parecido; `fp_len` forca o tamanho da certa."""
    base = [
        (etiqueta_fp, 4, f'Alternativa equilibrada A do item {n_item}, escrita para ter um tamanho parecido.'),
        ('pontua', 2, f'Alternativa equilibrada B do item {n_item}, escrita para ter um tamanho parecido.'),
        ('neutro', 1, f'Alternativa equilibrada C do item {n_item}, escrita para ter um tamanho parecido.'),
        ('atencao', 0, f'Alternativa equilibrada D do item {n_item}, escrita para ter um tamanho parecido.'),
    ][:n_opcoes]
    if fp_len is not None:
        t = base[0][2]
        base[0] = (base[0][0], base[0][1], (t + ' ' + 'x' * fp_len)[:fp_len])
    return base


def texto_cargo(cargo='p52-teste', n_mc=6, n_opcoes=4, etiqueta_fp='fortemente_pontua', fp_len=None,
                marcacao=None, caso_mantido_hash=None):
    linhas = [f'## Cargo `{cargo}`', '', 'Razao do tamanho: texto de teste.', '']
    for i in range(1, n_mc + 1):
        cen = f'Cenario de teste numero {i}, com contexto suficiente para o item fazer sentido.'
        if marcacao and i == 1:
            cen = cen + ' ' + marcacao
        linhas += [f'### MC{i} · Item de teste {i}', '*(dimensão: Dimensao de teste · 4 min)*', '',
                   f'**Cenário.** {cen}', '', '| # | tag | peso | Opção |', '|---|---|---|---|']
        for k, (tag, peso, txt) in enumerate(_opcoes(i, fp_len if i == 1 else None, n_opcoes, etiqueta_fp), 1):
            linhas.append(f'| {k} | {tag} | {peso} | {txt} |')
        linhas.append('')
    linhas += ['### Caso aberto · Caso de teste']
    if caso_mantido_hash:
        linhas += [f'*(mantido do banco no ar — content_hash {caso_mantido_hash})*']
    linhas += ['*(12 min)*', '', f'**Cenário.** {CENARIO_CASO}', '', f'**Escreva:** {ESCREVA_CASO}', '',
               '**Rubric** — `score_max` 25 · `entrevista` 13 · `avanca` 18', '',
               '| dimensão | peso |', '|---|---|', '| acolhimento | 60 |', '| conducao | 40 |', '']
    return '\n'.join(linhas)


def hash_caso():
    cen = CENARIO_CASO + '\n\nEscreva: ' + ESCREVA_CASO
    return hashlib.sha256(cen.encode()).hexdigest()


def rodar(*args):
    p = subprocess.run([sys.executable, '-I', *args], capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)

    def escrever(self, conteudo, nome='banco.md'):
        caminho = os.path.join(self.dir.name, nome)
        with open(caminho, 'w', encoding='utf-8') as f:
            f.write('# Banco de teste\n\n' + conteudo)
        return caminho

    def gerar(self, texto):
        saida = os.path.join(self.dir.name, '20261011000003_teste.sql')
        rc, out, err = rodar(GERADOR, '--texto', texto, '--versao', '20261011000003', '--saida', saida)
        sql = ''
        if rc == 0 and os.path.exists(saida):
            with open(saida, encoding='utf-8') as f:
                sql = f.read()
        return rc, out, err, sql


class TabelaComprimento(Base):
    def test_auto_teste_morde(self):
        rc, out, err = rodar(TABELA, '--auto-teste')
        self.assertEqual(rc, 0, out + err)
        self.assertIn('AUTO-TESTE OK', out)

    def test_texto_equilibrado_cumpre_criterio(self):
        rc, out, err = rodar(TABELA, '--criterio', 'proposto', self.escrever(texto_cargo()))
        self.assertEqual(rc, 0, out + err)

    def test_certa_duas_vezes_maior_reprova_criterio(self):
        rc, out, err = rodar(TABELA, '--criterio', 'proposto', self.escrever(texto_cargo(fp_len=170)))
        self.assertEqual(rc, 1, out + err)
        self.assertIn('FORA', out)

    def test_md5_canonico(self):
        rc, out, err = rodar(TABELA, '--md5', self.escrever(texto_cargo()))
        self.assertEqual(rc, 0, out + err)
        self.assertRegex(out.strip(), r'^[0-9a-f]{32}$')


class Gerador(Base):
    def test_recusa_cargo_com_5_mc(self):
        rc, out, err, _ = self.gerar(self.escrever(texto_cargo(n_mc=5)))
        self.assertNotEqual(rc, 0)
        self.assertIn('CONTAGEM', err)

    def test_recusa_item_com_3_alternativas(self):
        rc, out, err, _ = self.gerar(self.escrever(texto_cargo(n_opcoes=3)))
        self.assertNotEqual(rc, 0)
        self.assertIn('ALTERNATIVAS', err)

    def test_recusa_etiqueta_fora_do_conjunto(self):
        rc, out, err, _ = self.gerar(self.escrever(texto_cargo(etiqueta_fp='otima')))
        self.assertNotEqual(rc, 0)
        self.assertIn('ETIQUETA FORA DO CONJUNTO: otima', err)

    def test_recusa_marcacao_que_sobrevive(self):
        rc, out, err, _ = self.gerar(self.escrever(texto_cargo(marcacao='**sem fechamento')))
        self.assertNotEqual(rc, 0)
        self.assertIn('MARCACAO SOBREVIVE', err)

    def test_recusa_caso_mantido_divergente(self):
        rc, out, err, _ = self.gerar(self.escrever(texto_cargo(caso_mantido_hash='0' * 64)))
        self.assertNotEqual(rc, 0)
        self.assertIn('CASO MANTIDO DIVERGE DO AR: p52-teste', err)

    def test_caso_mantido_sem_insert_e_amarrado_no_pre_e_pos(self):
        h = hash_caso()
        rc, out, err, sql = self.gerar(self.escrever(texto_cargo(caso_mantido_hash=h)))
        self.assertEqual(rc, 0, err)
        pre = sql[sql.index('DO $pre$'):sql.index('$pre$;')]
        pos = sql[sql.index('DO $pos$'):]
        self.assertIn(h, pre)
        self.assertIn('p52.banco_mantidos', pre)
        self.assertIn('p52.banco_mantidos', pos)
        inserts = [b for b in sql.split('\n\n') if 'INSERT INTO public.perguntas ' in b]
        self.assertEqual(len(inserts), 6)
        self.assertFalse(any(h in b for b in inserts))

    def test_caso_novo_tem_insert(self):
        rc, out, err, sql = self.gerar(self.escrever(texto_cargo()))
        self.assertEqual(rc, 0, err)
        inserts = [b for b in sql.split('\n\n') if 'INSERT INTO public.perguntas ' in b]
        self.assertEqual(len(inserts), 7)
        self.assertIn(hash_caso(), sql)

    def test_gerador_deterministico(self):
        texto = self.escrever(texto_cargo())
        _, _, err1, sql1 = self.gerar(texto)
        _, _, err2, sql2 = self.gerar(texto)
        self.assertTrue(sql1, err1)
        self.assertEqual(hashlib.md5(sql1.encode()).hexdigest(), hashlib.md5(sql2.encode()).hexdigest())

    def test_sem_begin_commit_e_com_retirada_depois_dos_inserts(self):
        rc, out, err, sql = self.gerar(self.escrever(texto_cargo()))
        self.assertEqual(rc, 0, err)
        codigo = '\n'.join(l for l in sql.split('\n') if not l.lstrip().startswith('--'))
        self.assertNotRegex(codigo, r'(?im)^\s*(BEGIN|COMMIT)\s*;')
        self.assertLess(codigo.rindex('INSERT INTO public.perguntas '), codigo.index("SET status = 'retired'"))
        self.assertLess(codigo.index("SET status = 'retired'"), codigo.index('DO $pos$'))


def modulo_gerador():
    """O gerador tem hífen no nome: carregado por caminho, para ler as expressões que ele emite."""
    import importlib.util
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('gen_sjt_v2', GERADOR)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


SMOKE = os.path.join(AQUI, '..', '..', 'supabase', 'tests', 'p52_banco_sjt_smoke.sql')


class Remapeamento(Base):
    """WR-03 do 52-REVIEW-PORTAO-1: `opcao_id` artesanal (sufixo = ordem) remapeado no mesmo apply."""

    def sql(self):
        rc, out, err, sql = self.gerar(self.escrever(texto_cargo()))
        self.assertEqual(rc, 0, err)
        return sql

    def test_bloco_remap_depois_da_retirada_e_antes_do_pos(self):
        sql = self.sql()
        self.assertLess(sql.index('DO $retira$'), sql.index('DO $remap$'))
        self.assertLess(sql.index('DO $remap$'), sql.index('DO $pos$'))

    def test_nenhum_uuid_literal_no_sql(self):
        # escopo por forma: nenhum id, velho ou novo, vai para o arquivo (nem para o ledger)
        self.assertNotRegex(self.sql(), r'(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')

    def test_remap_troca_so_o_opcao_id_e_as_respostas(self):
        sql = self.sql()
        bloco = sql[sql.index('DO $remap$'):sql.index('$remap$;')]
        sets = [l.strip() for l in bloco.split('\n') if ' SET ' in l]
        self.assertEqual(len(sets), 2, sets)
        self.assertIn("UPDATE public.perguntas_opcao_sjt o SET opcao_id = (m ->> 'novo')::uuid", sets[0])
        self.assertIn("SET metadata = jsonb_set(s.metadata, '{respostas}'", sets[1])
        self.assertIn('gen_random_uuid()', bloco)

    def test_impressoes_iguais_no_pre_no_pos_e_no_smoke(self):
        g = modulo_gerador()
        sql = self.sql()
        pre = sql[sql.index('DO $pre$'):sql.index('$pre$;')]
        pos = sql[sql.index('DO $pos$'):sql.index('$pos$;')]
        with open(SMOKE, encoding='utf-8') as f:
            smoke = f.read()
        for nome in ('FP_RESPOSTAS', 'FP_SCORES', 'FP_ESCOPO', 'RE_V4'):
            expr = getattr(g, nome)
            self.assertIn(expr, pre, nome + ' fora do PRE')
            self.assertIn(expr, pos, nome + ' fora do POS')
            self.assertIn(expr, smoke, nome + ' fora do smoke (ou divergente do gerador)')

    def test_pre_recusa_id_velho_fora_do_alcance(self):
        sql = self.sql()
        pre = sql[sql.index('DO $pre$'):sql.index('$pre$;')]
        self.assertIn('P52B PRE-PORTAO (remap fora do alcance)', pre)
        self.assertIn("'supabase_migrations.schema_migrations'::regclass", pre)

    def test_cabecalho_avisa_escrita_destrutiva_e_evidencia_publica_contagens(self):
        sql = self.sql()
        self.assertIn('ATUALIZA RESPOSTA GRAVADA DE CANDIDATO', sql[:sql.index('SET LOCAL')])
        self.assertIn("';remap=' ||", sql)
        self.assertIn("',em_curso=' ||", sql)


def sem_comentarios(sql):
    """O SQL sem as linhas de comentario `--` (o cabecalho explica GRANT/REVOKE em prosa)."""
    return '\n'.join(l for l in sql.split('\n') if not l.lstrip().startswith('--'))


def blocos_smoke():
    """As cláusulas do smoke52b: `DO $<letra>$ … $<letra>$;`, na ordem do arquivo."""
    import re
    with open(SMOKE, encoding='utf-8') as f:
        smoke = f.read()
    return smoke, re.findall(r'(?m)^DO \$([a-z])\$$', smoke)


class PontuarSjt(Base):
    """WR-02 do 52-REVIEW-PORTAO-2: `pontuar_sjt` recusa alto (22023) a resposta cujo `opcao_id`
    não casa uma alternativa da pergunta — em vez de pontuar 0 em silêncio. O corpo novo é o corpo
    VIVO (arquivo com md5 conferido) mais um bloco inserido depois de UMA âncora."""

    def test_corpo_novo_e_o_vivo_mais_so_a_recusa(self):
        import difflib
        g = modulo_gerador()
        with open(g.PONTUAR_VIVO, encoding='utf-8', newline='') as f:
            vivo = f.read()
        self.assertEqual(hashlib.md5(vivo.encode()).hexdigest(), g.PONTUAR_VIVO_MD5)
        novo = g.corpo_pontuar_novo()
        self.assertEqual(vivo.count(g.ANCORA_PONTUAR), 1)
        dif = list(difflib.ndiff(vivo.splitlines(keepends=True), novo.splitlines(keepends=True)))
        self.assertEqual([l for l in dif if l.startswith('- ')], [], 'o corpo vivo perdeu linha')
        # emenda exata: o bloco entra uma vez, colado depois da ancora, e tirar o bloco devolve o vivo
        self.assertEqual(novo.count(g.BLOCO_RECUSA_PONTUAR), 1)
        self.assertIn(g.ANCORA_PONTUAR + g.BLOCO_RECUSA_PONTUAR, novo)
        self.assertEqual(novo.replace(g.BLOCO_RECUSA_PONTUAR, '', 1), vivo)
        self.assertIn(f"RAISE EXCEPTION '{g.MSG_RECUSA_PONTUAR}' USING errcode = '22023'", novo)
        self.assertLess(novo.index(g.ANCORA_PONTUAR), novo.index(g.MSG_RECUSA_PONTUAR))
        self.assertLess(novo.index(g.MSG_RECUSA_PONTUAR), novo.index('v_status := CASE'))

    def test_recusa_corpo_vivo_adulterado(self):
        g = modulo_gerador()
        falso = os.path.join(self.dir.name, 'vivo.plpgsql')
        with open(g.PONTUAR_VIVO, encoding='utf-8', newline='') as f:
            vivo = f.read()
        with open(falso, 'w', encoding='utf-8', newline='') as f:
            f.write(vivo.replace('v_mc_min_pct numeric := 60', 'v_mc_min_pct numeric := 50'))
        g.PONTUAR_VIVO = falso
        with self.assertRaisesRegex(g.CorpoVivoInvalido, 'CORPO VIVO DO pontuar_sjt'):
            g.corpo_pontuar_novo()

    def test_recusa_ancora_ausente_ou_repetida(self):
        g = modulo_gerador()
        with open(g.PONTUAR_VIVO, encoding='utf-8', newline='') as f:
            vivo = f.read()
        for nome, corpo in (('sem', vivo.replace(g.ANCORA_PONTUAR, '')),
                            ('dupla', vivo + g.ANCORA_PONTUAR)):
            falso = os.path.join(self.dir.name, nome + '.plpgsql')
            with open(falso, 'w', encoding='utf-8', newline='') as f:
                f.write(corpo)
            g.PONTUAR_VIVO = falso
            g.PONTUAR_VIVO_MD5 = hashlib.md5(corpo.encode()).hexdigest()
            with self.assertRaisesRegex(g.CorpoVivoInvalido, 'ANCORA'):
                g.corpo_pontuar_novo()

    def test_sql_troca_pontuar_sjt_entre_pre_e_pos_proprios(self):
        g = modulo_gerador()
        rc, out, err, sql = self.gerar(self.escrever(texto_cargo()))
        self.assertEqual(rc, 0, err)
        novo = g.corpo_pontuar_novo()
        md5_novo = hashlib.md5(novo.encode()).hexdigest()
        cab = sql[:sql.index('SET LOCAL')]
        self.assertIn(f'-- pontuar_sjt_prosrc_md5_antes: {g.PONTUAR_VIVO_MD5}\n', cab)
        self.assertIn(f'-- pontuar_sjt_prosrc_md5_novo: {md5_novo}\n', cab)
        pre = sql[sql.index('DO $pre_pontuar$'):sql.index('$pre_pontuar$;')]
        pos = sql[sql.index('DO $pos_pontuar$'):sql.index('$pos_pontuar$;')]
        self.assertIn(f"'{g.PONTUAR_VIVO_MD5}'", pre)
        self.assertIn('p52.banco_pontuar_velho', pre)
        self.assertIn(f"'{md5_novo}'", pos)
        for k in ('aclexplode', 'obj_description', "has_function_privilege('anon'"):
            self.assertIn(k, pre, k + ' fora do PRE do pontuar_sjt')
            self.assertIn(k, pos, k + ' fora do POS do pontuar_sjt')
        cria = 'CREATE OR REPLACE FUNCTION public.pontuar_sjt(p_candidatura_id uuid, p_respostas jsonb)'
        self.assertEqual(sql.count(cria), 1)
        self.assertIn('AS $function$' + novo + '$function$;', sql)
        self.assertLess(sql.index('$pre$;'), sql.index('DO $pre_pontuar$'))
        self.assertLess(sql.index('$pre_pontuar$;'), sql.index(cria))
        self.assertLess(sql.index(cria), sql.index('DO $pos_pontuar$'))
        # ACL mantida tal como está no ar — conferida no POS, nunca reescrita por GRANT/REVOKE
        self.assertNotRegex(sem_comentarios(sql), r'(?i)\b(GRANT|REVOKE)\b[^;]*pontuar_sjt')


class MapaDuravel(Base):
    """WR-01 do 52-REVIEW-PORTAO-2: o mapa velho→novo do remapeamento fica gravado na MESMA
    transação, num esquema sem USAGE para anon/authenticated/service_role."""

    def sql(self):
        rc, out, err, sql = self.gerar(self.escrever(texto_cargo()))
        self.assertEqual(rc, 0, err)
        return sql

    def test_tabela_do_mapa_sem_acesso_de_papel_de_api(self):
        g = modulo_gerador()
        sql = self.sql()
        t = g.TABELA_MAPA
        self.assertEqual(t, 'supabase_migrations.p52_remap_opcao_sjt')
        self.assertIn(f'CREATE TABLE {t} (', sql)
        self.assertIn(f'ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;', sql)
        self.assertIn(f'REVOKE ALL ON TABLE {t} FROM PUBLIC, anon, authenticated, service_role;', sql)
        self.assertNotRegex(sem_comentarios(sql), r'(?i)\bGRANT\b[^;]*p52_remap_opcao_sjt')
        # nasce DEPOIS da varredura do PRE (que procura o id velho em toda tabela) e antes do remap
        self.assertLess(sql.index('$pre$;'), sql.index(f'CREATE TABLE {t} ('))
        self.assertLess(sql.index(f'CREATE TABLE {t} ('), sql.index('DO $remap$'))

    def test_remap_grava_o_mapa_e_o_pos_o_confere(self):
        g = modulo_gerador()
        sql = self.sql()
        remap = sql[sql.index('DO $remap$'):sql.index('$remap$;')]
        pos = sql[sql.index('DO $pos$'):sql.index('$pos$;')]
        self.assertIn(f'INSERT INTO {g.TABELA_MAPA} ', remap)
        self.assertIn("'20261011000003'", remap)
        self.assertIn(g.TABELA_MAPA, pos)
        self.assertIn("',mapa=' ||", pos)
        self.assertIn("',em_curso_ids=' ||", pos)


class SmokeContrato(Base):
    def test_esperado_e_o_numero_de_clausulas(self):
        import re
        smoke, letras = blocos_smoke()
        esperado = int(re.search(r"set_config\('smoke52b\.esperado', '(\d+)', false\)", smoke).group(1))
        self.assertEqual(letras, [chr(ord('a') + i) for i in range(len(letras))])
        self.assertEqual(esperado, len(letras))
        self.assertEqual(esperado, 14)

    def test_smoke_prova_mapa_e_recusa_do_pontuar(self):
        g = modulo_gerador()
        smoke, _ = blocos_smoke()
        m = smoke[smoke.index('DO $m$'):smoke.index('$m$;')]
        n = smoke[smoke.index('DO $n$'):smoke.index('$n$;')]
        k = smoke[smoke.index('DO $k$'):smoke.index('$k$;')]
        self.assertIn(g.TABELA_MAPA, m)
        self.assertIn(g.TABELA_MAPA, k)  # a (k) isenta o mapa da varredura do id velho
        self.assertIn(f"'{g.MSG_RECUSA_PONTUAR}'", n)
        self.assertIn("'22023'", n)
        self.assertIn('p52.banco_pontuar_velho', n)
        self.assertIn('p52.banco_pontuar_md5_novo', n)


class OrdemPermutada(Base):
    def test_anti_escada_e_deterministica(self):
        sys.dont_write_bytecode = True
        sys.path.insert(0, AQUI)
        import sjt_texto
        itens = sjt_texto.parse(self.escrever(texto_cargo()))
        mc = [i for i in itens if i['formato'] == 'mc']
        o1 = sjt_texto.ordem_permutada(mc)
        o2 = sjt_texto.ordem_permutada(mc)
        self.assertEqual(o1, o2)
        posicoes = {}
        for it, ordem in zip(mc, o1):
            pos_fp = ordem[[o['tag'] for o in it['opcoes']].index('fortemente_pontua')]
            posicoes[pos_fp] = posicoes.get(pos_fp, 0) + 1
        self.assertLessEqual(max(posicoes.values()), 3)
        for ordem in o1:
            self.assertEqual(sorted(ordem), [1, 2, 3, 4])


if __name__ == '__main__':
    unittest.main()
