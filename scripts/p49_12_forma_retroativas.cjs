#!/usr/bin/env node
'use strict';
/*
 * p49_12_forma_retroativas.cjs — conferência de FORMA das migrations retroativas
 * do 49-12 (D-46 aplicada · D-47 recusada · D-43 aplicada).
 *
 * ══ POR QUE ESTE ARQUIVO EXISTE.
 *
 * O `<verify>` do 49-12 Task 3 trazia a conferência como um `node -e` de uma linha
 * que exigia quatro tokens literais: `v_autorizados`, `IS DISTINCT FROM`,
 * `ROW_COUNT` e `RAISE EXCEPTION`, mais a proibição de `DELETE FROM`.
 *
 * Ele REPROVOU a `20260922000011` por falta de `ROW_COUNT` — e o invariante que o
 * token existe para garantir estava lá, inteiro. A `000011` mede as linhas tocadas
 * com `count(*)` sobre o `RETURNING` de um `UPDATE` dentro de CTE, e aborta em
 * `IF v_tocadas <> cardinality(v_autorizados)`. `GET DIAGNOSTICS … ROW_COUNT` não
 * serviria ali: depois de um `UPDATE` embrulhado em CTE, `ROW_COUNT` devolve a
 * contagem do SELECT externo, não a do UPDATE. Os dois idiomas expressam a MESMA
 * garantia, e o portão conhecia só um.
 *
 * É a classe de defeito do CLAUDE.md §«Portões: varra pela FORMA, não pelo
 * sintoma», na variante que REPROVA trabalho correto — a mesma do
 * `p43_matriz_retencao_smoke` (j). E o conserto não é afrouxar: é o portão passar a
 * conhecer o idioma do arquivo que ele vigia, sem perder a capacidade de pegar a
 * ausência real da garantia. Por isso este arquivo tem o modo `--prove`.
 *
 * ⚠ O CONSERTO NÃO PODE SER NO ARQUIVO REPROVADO. A `000011` já está aplicada e
 * escriturada; `statements[1]` guarda o corpo literal e o md5 é conferido por
 * leitura de volta do ledger. Editar o arquivo em disco faria o md5 divergir e
 * quebraria a própria prova (CLAUDE.md §«Via de apply ATUAL», propriedade 3 — e a
 * nota que explica por que as migrations `20260823000001..4` carregam uma instrução
 * obsoleta que NÃO se corrige lá).
 *
 * Uso:
 *   node scripts/p49_12_forma_retroativas.cjs           confere os arquivos
 *   node scripts/p49_12_forma_retroativas.cjs --prove   prova que a conferência MORDE
 */

const fs = require('fs');

/* A D-47 foi RECUSADA pelo operador em 2026-09-23: o arquivo não existe, e a
 * versão `20260922000010` fica deliberadamente vazia no ledger. Ausência aqui é
 * resultado esperado, nunca falha. */
const ARQUIVOS = [
  { path: 'supabase/migrations/20260922000009_p49_retro_justificativa_grudada.sql', estado: 'aprovada' },
  { path: 'supabase/migrations/20260922000010_p49_retro_trilha_bd9.sql', estado: 'recusada' },
  { path: 'supabase/migrations/20260922000011_p49_retro_marca_analises.sql', estado: 'aprovada' },
];

/* Comentários fora — um token citado num comentário não é uma garantia. */
function codigo(sql) {
  return sql
    .split('\n')
    .filter((l) => !/^\s*--/.test(l))
    .join('\n');
}

const CHECAGENS = [
  {
    id: 'escopo-literal',
    descricao: 'o conjunto autorizado é literal (`v_autorizados`)',
    ok: (c) => c.includes('v_autorizados'),
  },
  {
    id: 'portao-de-escopo',
    descricao: 'aborta se o conjunto medido divergir (`IS DISTINCT FROM`)',
    ok: (c) => c.includes('IS DISTINCT FROM'),
  },
  {
    id: 'contagem-medida',
    /* ══ AQUI está o alargamento. Os DOIS idiomas da mesma garantia:
     *  (a) `GET DIAGNOSTICS <v> = ROW_COUNT` — UPDATE como statement solto;
     *  (b) `RETURNING` + `count(*) … INTO <v>` — UPDATE dentro de CTE, onde o
     *      `ROW_COUNT` mediria o SELECT externo e seria a medida ERRADA.
     * Em qualquer um dos dois, a comparação contra `cardinality(v_autorizados)` é
     * EXIGIDA: é ela, não o token, que faz a transação abortar. */
    descricao: 'as linhas tocadas são MEDIDAS e comparadas com o tamanho da autorização',
    ok: (c) => {
      /* O portão de verdade é a COMPARAÇÃO. Sem ela não há aborto, e o token de
       * medição isolado não garante nada. Começa por achar a variável guardada. */
      const guarda = c.match(/(\w+)\s*<>\s*cardinality\s*\(\s*v_autorizados\s*\)/i);
      if (!guarda) return false;
      const v = guarda[1];

      /* (a) UPDATE como statement solto. */
      if (new RegExp(`GET\\s+DIAGNOSTICS\\s+${v}\\s*=\\s*ROW_COUNT`, 'i').test(c)) return true;

      /* (b) UPDATE dentro de CTE: `count(*)` … `INTO <v>`, com o `count(*)` DEPOIS
       * do `RETURNING`. A ordem importa e não é decoração: as quatro contagens de
       * efeito colateral também são `SELECT count(*) … INTO <var>`, e uma janela
       * que as aceitasse daria verde para um arquivo que nunca mede o UPDATE. */
      const into = c.search(new RegExp(`\\bINTO\\b[^;]{0,120}\\b${v}\\b`, 'i'));
      if (into < 0) return false;
      const janela = c.slice(Math.max(0, into - 900), into);
      const ret = janela.toUpperCase().lastIndexOf('RETURNING');
      return ret >= 0 && /count\(\*\)/i.test(janela.slice(ret));
    },
  },
  {
    id: 'aborta',
    descricao: 'o portão aborta de verdade (`RAISE EXCEPTION`)',
    ok: (c) => c.includes('RAISE EXCEPTION'),
  },
  {
    id: 'nao-apaga',
    descricao: 'nenhuma linha é apagada (JORN-37: a trilha nunca perde linha)',
    ok: (c) => !/DELETE\s+FROM/i.test(c),
  },
  {
    id: 'efeito-colateral',
    /* As quatro contagens de controle, medidas na MESMA transação: fila do pg_net
     * (nenhum e-mail), histórico e notificações (nada nasce), e o arquivo de
     * snapshots (D-45: nem cresce nem encolhe). */
    descricao: 'as quatro contagens de controle são medidas',
    ok: (c) =>
      ['net.http_request_queue', 'public.historico_candidatura', 'public.notificacoes_enviadas', 'public.decisao_final_historico'].every(
        (t) => c.includes(t)
      ),
  },
  {
    id: 'transporte',
    /* CLAUDE.md §«Via de apply ATUAL»: a Management API já envolve o corpo numa
     * transação; um BEGIN/COMMIT externo é o gatilho do 42601. */
    descricao: 'sem `BEGIN;`/`COMMIT;` externos (o transporte já é transacional)',
    ok: (c) => !/^\s*(BEGIN|COMMIT)\s*;/im.test(c),
  },
];

function conferir(file) {
  const c = codigo(fs.readFileSync(file, 'utf8'));
  return CHECAGENS.filter((k) => !k.ok(c)).map((k) => `${k.id} (${k.descricao})`);
}

function rodar() {
  let falhou = false;
  for (const { path: p, estado } of ARQUIVOS) {
    if (!fs.existsSync(p)) {
      if (estado === 'recusada') {
        console.log(`   ⊘ RECUSADA pelo operador, sem arquivo — esperado: ${p}`);
      } else {
        console.error(`   ✗ AUSENTE e deveria existir: ${p}`);
        falhou = true;
      }
      continue;
    }
    const faltas = conferir(p);
    if (faltas.length) {
      console.error(`   ✗ ${p}\n       falta: ${faltas.join('\n       falta: ')}`);
      falhou = true;
    } else {
      console.log(`   ✓ ${p} — ${CHECAGENS.length}/${CHECAGENS.length}`);
    }
  }
  return falhou ? 1 : 0;
}

/* ══ §L do 49-PATTERNS: uma conferência que nunca reprova não é prova de nada.
 * Cada mutação abaixo remove UMA garantia de um arquivo que passa, e a checagem
 * correspondente TEM de acender. Se alguma não acender, o portão está cego. */
function provar() {
  const base = fs.readFileSync(ARQUIVOS[0].path, 'utf8');
  const alvo = fs.readFileSync(ARQUIVOS[2].path, 'utf8');
  const mutacoes = [
    ['escopo-literal', base.replace(/v_autorizados/g, 'v_lista')],
    ['portao-de-escopo', base.replace(/IS DISTINCT FROM/g, '<>')],
    /* (a) tira a medição do idioma de statement solto */
    ['contagem-medida', base.replace(/GET DIAGNOSTICS v_tocadas = ROW_COUNT;/, '')],
    /* (b) tira a medição do idioma de CTE — e é ESTA que distingue a checagem
     * apertada da folga anterior: sem o `count(*)` de dentro do SELECT sobre a
     * CTE, sobram os quatro `SELECT count(*) … INTO` das contagens de controle,
     * que a primeira versão desta checagem aceitava como se fossem a medição do
     * UPDATE. Ela precisa acender. */
    ['contagem-medida', alvo.replace(/SELECT count\(\*\)::int,/, 'SELECT')],
    /* (c) tira a COMPARAÇÃO, que é o portão em si */
    ['contagem-medida', base.replace(/<> cardinality\(v_autorizados\)/g, '< 0')],
    ['aborta', base.replace(/RAISE EXCEPTION/g, 'RAISE NOTICE')],
    ['nao-apaga', base.replace(/UPDATE public\.candidaturas/, 'DELETE FROM public.candidaturas')],
    ['efeito-colateral', base.replace(/public\.decisao_final_historico/g, 'public.dfh_falso')],
    ['transporte', 'BEGIN;\n' + base],
  ];

  let cego = false;
  for (const [esperada, mutado] of mutacoes) {
    const c = codigo(mutado);
    const acesas = CHECAGENS.filter((k) => !k.ok(c)).map((k) => k.id);
    if (acesas.includes(esperada)) {
      console.log(`   ✓ morde: ${esperada} (acenderam: ${acesas.join(', ')})`);
    } else {
      console.error(`   ✗ CEGO: a mutação de ${esperada} passou. Acenderam: ${acesas.join(', ') || 'nenhuma'}`);
      cego = true;
    }
  }

  /* E o controle POSITIVO, que é o que falta em quase todo harness: os arquivos
   * reais, NÃO mutados, têm de passar limpos. Sem ele, uma checagem que reprova
   * tudo pareceria «mordendo» acima. */
  for (const f of [ARQUIVOS[0].path, ARQUIVOS[2].path]) {
    const faltas = conferir(f);
    if (faltas.length) {
      console.error(`   ✗ CONTROLE POSITIVO falhou em ${f}: ${faltas.join(', ')}`);
      cego = true;
    } else {
      console.log(`   ✓ controle positivo: ${f} passa limpo`);
    }
  }
  return cego ? 1 : 0;
}

const prove = process.argv.includes('--prove');
console.log(prove ? '── 49-12: a conferência de forma MORDE?' : '── 49-12: forma das migrations retroativas');
process.exit(prove ? provar() : rodar());
