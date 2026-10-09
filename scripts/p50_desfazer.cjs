#!/usr/bin/env node
'use strict';
/*
 * p50_desfazer.cjs — o DESFAZER da expansão da Phase 50 (migrations 20261005000002..4), gerado
 * POR PROGRAMA a partir do estado VIVO de PROD lido ANTES do apply (WR-04 do 50-REVIEW-ACESSO-1).
 *
 * POR QUE EXISTE. O «Undo» do 50-10 mandava restaurar os corpos a partir do `statements[1]` das
 * migrations que CRIARAM as funções — o texto errado (registrar_decisao, rejeitar_candidatura e as
 * filas foram redefinidas várias vezes depois: P48-11, 49-10, 49-30…) — ou de dumps em `$TMPDIR`,
 * fora do repositório. O texto antigo dos 13 quals nem estava no repositório (o 0002 guarda só o
 * md5). Este programa captura o que o apply vai sobrescrever, do catálogo VIVO, e escreve o arquivo
 * `supabase/tests/p50_desfazer_expansao.sql`, que é commitado e ensaiado ANTES do apply.
 *
 * O QUE ELE CAPTURA — os objetos que 0002..0004 tocam, lidos POR FORMA das próprias migrations
 * (nenhuma lista literal; um objeto novo numa delas entra sozinho, e uma forma nova de instrução
 * de nível de topo faz o programa RECUSAR em vez de gerar um desfazer incompleto):
 *   funções   `COMMENT ON FUNCTION public.<f>(<tipos>) IS` (uma por `CREATE OR REPLACE FUNCTION`,
 *             conferido): `pg_get_functiondef`, ACL (`aclexplode`, NULL = `acldefault`) e comentário;
 *   policies  `ALTER POLICY <p> ON public.<t>`: papéis, USING, WITH CHECK (desparseados com
 *             `search_path = ''` — nomes totalmente qualificados, o texto não depende do
 *             search_path de quem o rodar) e comentário;
 *   vistas    `ALTER VIEW public.<v>`: `reloptions` e comentário.
 * E a IMPRESSÃO DIGITAL de cada um (`fp`, abaixo), a MESMA expressão SQL na captura e nos portões
 * do arquivo gerado — não envelhece com coluna nova de pg_proc (é `to_jsonb` da linha inteira).
 *
 * O ARQUIVO GERADO (não é migration; nunca roda avulso):
 *   GUARDA     roda só DENTRO do ensaio que aborta (marca `p50.tx` = txid da requisição, a mesma
 *              guarda do smoke p50) OU quando a migration corretiva liga, LOCAL, a GUC
 *              `p50.desfazer_corretivo = 'sim'` na primeira linha (só com checkpoint do operador).
 *   PRÉ-PORTÃO todo objeto existe; ≥ 1 impressão digital DIFERE da capturada (senão não há
 *              expansão a desfazer — um desfazer «verde» sobre o estado de antes seria vácuo).
 *   CORPO      18× CREATE OR REPLACE FUNCTION (o texto VIVO), COMMENT ON FUNCTION, a ACL
 *              recalculada por diferença (REVOKE o que sobra, GRANT o que falta — nunca CASCADE),
 *              13× ALTER POLICY … TO … USING … [WITH CHECK …] + COMMENT ON POLICY, e as
 *              `reloptions` + comentário da vista. Nenhum DROP: o helper de 0001 fica (é do tracer).
 *   PÓS-PORTÃO TODA impressão digital = a capturada; senão `P50D FAIL (pos)` com a lista.
 *   Evidência  anexada a `p50.evidencia` (LOCAL): `desfazer:pre_diferentes=<d>/<n>,pos=iguais:<n>`.
 *
 * Uso:
 *   node scripts/p50_desfazer.cjs --gerar     só leitura de PROD; recusa se o ledger já tem alguma
 *                                             de 20261005000002..4; (re)escreve o arquivo
 *   node scripts/p50_desfazer.cjs --conferir  só leitura; a impressão digital VIVA de cada objeto
 *                                             = a embutida no arquivo commitado (o desfazer ainda
 *                                             descreve o estado de antes do apply). Recusa depois
 *                                             do apply — ali a prova é o ensaio reverso.
 * Ensaio (ida + volta numa requisição que aborta, antes do apply):
 *   node scripts/p50_ensaio.cjs --vistas --migracoes=<0002>,<0003>,<0004> --mutacao=supabase/tests/p50_desfazer_expansao.sql
 *
 * ⚠ OBSOLETO PARA TRÊS FUNÇÕES DESDE A PHASE 51 (migration 20261008000003, plano 51-10). O arquivo
 *   gerado restaura os corpos PRÉ-P50 de `listar_revisoes_decisao`, `contar_revisoes_pendentes` e
 *   `funil_kpis`. Aplicado depois de 20261008000003 ele ABORTA em `listar_revisoes_decisao` (o
 *   `CREATE OR REPLACE FUNCTION` dele não troca o tipo de retorno de 13 colunas — `origem`,
 *   `pedido_id` — de volta para 11: 42P13) e, se alguém o «consertasse» para passar, APAGARIA o
 *   JORN-42 (as rejeições pelo RH e os knockouts sumiriam da fila e do contador do RH) e o D-35 (o
 *   funil voltaria a contar knockout revertido). Ele NÃO serve mais de base de migration corretiva
 *   para essas três funções, e NÃO pode ser regerado: a captura pré-P50 não existe mais no catálogo.
 *   Por isso `--gerar` e `--conferir` leem o ledger (só leitura) ANTES de tudo e, se
 *   20261008000003 estiver lá, imprimem `OBSOLETO: …` e saem 1. O arquivo gerado NÃO é tocado à mão
 *   (é «GERADO, NÃO EDITAR À MÃO»); a obsolescência também está no cabeçalho da 20261008000003.
 *
 * Sem dependências: Node built-ins + p50_ensaio.cjs (sqlLeitura, MIGS, versao).
 */

const fs = require('fs');
const path = require('path');
const E = require('./p50_ensaio.cjs');

const ROOT = E.ROOT;
const SAIDA = 'supabase/tests/p50_desfazer_expansao.sql';
/* As migrations da EXPANSÃO: as de MIGS depois do tracer (0001, aplicado no 50-02). */
const MIGS_EXP = E.MIGS.slice(1);
const VERSOES = MIGS_EXP.map(E.versao);
/* A migration da Phase 51 que torna o desfazer obsoleto para listar/contar/funil_kpis (51-10). */
const VERSAO_OBSOLETA = '20261008000003';

function sair(msg, c = 1) {
  console.error(msg);
  process.exit(c);
}

/* Instruções de nível de topo que as migrations da expansão podem ter, e o desfazer cobre. */
const FORMAS_COBERTAS = [
  /^ALTER POLICY [a-z_][a-z0-9_]* ON public\.[a-z_][a-z0-9_]*$/,
  /^ALTER VIEW public\.[a-z_][a-z0-9_]* SET \(security_invoker = true\);$/,
  /^COMMENT ON (POLICY|FUNCTION|VIEW) /,
  /^CREATE OR REPLACE FUNCTION public\./,
  /^(REVOKE|GRANT) [A-Z ]+ ON FUNCTION public\./,
  /^DO \$[a-z_]+\$$/,
  /^SET LOCAL (lock_timeout|statement_timeout) = /,
];

/* Os alvos, POR FORMA, das migrations da expansão. */
function alvosPorForma() {
  const funcoes = new Set();
  const politicas = new Map();
  const vistas = new Set();
  let creates = 0;
  const forasDaForma = [];
  for (const m of MIGS_EXP) {
    const src = fs.readFileSync(path.join(ROOT, m), 'utf8');
    // Linhas de coluna 0 que começam com palavra-chave de instrução (corpos $…$ ficam fora porque
    // as que existem lá começam com DECLARE/BEGIN/END/IF ou indentadas — conferido no gerar).
    let dentro = null;
    for (const linha of src.split('\n')) {
      if (dentro) {
        if (linha.includes(dentro)) dentro = null;
        continue;
      }
      const tag = /^(?:CREATE OR REPLACE FUNCTION .*|DO )(\$[a-z_]*\$)\s*$/.exec(linha) || /^AS (\$[a-z_]*\$)\s*$/.exec(linha);
      if (/^(ALTER|COMMENT|CREATE|REVOKE|GRANT|DROP|SET|RESET|DO|INSERT|UPDATE|DELETE|TRUNCATE|SELECT|SECURITY|REASSIGN)\b/.test(linha)) {
        if (!FORMAS_COBERTAS.some((re) => re.test(linha.trimEnd()))) forasDaForma.push(`${path.basename(m)}: ${linha.slice(0, 100)}`);
      }
      if (tag) dentro = tag[1];
    }
    for (const x of src.matchAll(/^COMMENT ON FUNCTION (public\.[a-z_][a-z0-9_]*\([^)]*\)) IS/gm)) funcoes.add(x[1]);
    creates += [...src.matchAll(/^CREATE OR REPLACE FUNCTION public\./gm)].length;
    for (const x of src.matchAll(/^ALTER POLICY ([a-z_][a-z0-9_]*) ON (public\.[a-z_][a-z0-9_]*)$/gm)) politicas.set(`${x[2]}.${x[1]}`, { nome: x[1], tabela: x[2] });
    for (const x of src.matchAll(/^ALTER VIEW (public\.[a-z_][a-z0-9_]*)/gm)) vistas.add(x[1]);
  }
  if (forasDaForma.length) sair(`FORMA NAO COBERTA pelo desfazer (a migration ganhou uma instrucao que este programa nao sabe desfazer):\n  ${forasDaForma.join('\n  ')}`);
  if (funcoes.size !== creates) sair(`FUNCOES: ${creates} CREATE OR REPLACE FUNCTION e ${funcoes.size} COMMENT ON FUNCTION — a forma mudou; o desfazer ficaria incompleto`);
  if (!funcoes.size || !politicas.size || !vistas.size) sair(`SELECAO VAZIA por forma (funcoes=${funcoes.size} politicas=${politicas.size} vistas=${vistas.size})`);
  return { funcoes: [...funcoes].sort(), politicas: [...politicas.values()].sort((a, b) => `${a.tabela}.${a.nome}`.localeCompare(`${b.tabela}.${b.nome}`)), vistas: [...vistas].sort() };
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (xs) => `ARRAY[${xs.map(lit).join(', ')}]::text[]`;

/*
 * IMPRESSÃO DIGITAL — UMA expressão por tipo, usada na captura e nos dois portões do arquivo.
 * Sempre avaliada com `search_path = ''` (nomes qualificados no desparse).
 *   função  `to_jsonb` da linha de pg_proc INTEIRA, menos `proacl` (comparada como CONJUNTO
 *           ordenado de aclexplode — a ordem do array muda com REVOKE/GRANT sem mudar o acesso) e
 *           menos `proargdefaults` (a árvore guarda a posição do texto de origem; os defaults
 *           entram desparseados por `pg_get_function_arguments`); mais o comentário.
 *   policy  comando, permissiva, papéis (ordenados), USING e WITH CHECK desparseados, comentário.
 *   vista   reloptions (ordenadas; NULL = vazio), md5 da definição, comentário.
 */
const ACL_SQL = (p) =>
  `coalesce((SELECT string_agg(x, ',' ORDER BY x) FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text || ':' || a.grantor::regrole::text AS x FROM pg_catalog.aclexplode(coalesce(${p}.proacl, pg_catalog.acldefault('f', ${p}.proowner))) a) s), '')`;
const FP_FN = (p) =>
  `md5(((to_jsonb(${p}) - 'proacl' - 'proargdefaults')::text) || '|' || pg_catalog.pg_get_function_arguments(${p}.oid) || '|' || ${ACL_SQL(p)} || '|' || coalesce(pg_catalog.obj_description(${p}.oid, 'pg_proc'), '<null>'))`;
const ROLES_SQL = (pol) =>
  `coalesce((SELECT string_agg(CASE WHEN r = 0 THEN 'public' ELSE r::regrole::text END, ',' ORDER BY CASE WHEN r = 0 THEN 'public' ELSE r::regrole::text END) FROM unnest(${pol}.polroles) r), '')`;
const FP_POL = (pol) =>
  `md5(${pol}.polcmd::text || '|' || ${pol}.polpermissive::text || '|' || ${ROLES_SQL(pol)} || '|' || coalesce(pg_catalog.pg_get_expr(${pol}.polqual, ${pol}.polrelid), '<null>') || '|' || coalesce(pg_catalog.pg_get_expr(${pol}.polwithcheck, ${pol}.polrelid), '<null>') || '|' || coalesce(pg_catalog.obj_description(${pol}.oid, 'pg_policy'), '<null>'))`;
const FP_VIEW = (c) =>
  `md5(coalesce((SELECT string_agg(o, ',' ORDER BY o) FROM unnest(${c}.reloptions) o), '') || '|' || md5(pg_catalog.pg_get_viewdef(${c}.oid)) || '|' || coalesce(pg_catalog.obj_description(${c}.oid, 'pg_class'), '<null>'))`;

/* SQL que devolve { "<chave>": "<fp>" } de todos os alvos — a mesma na captura e nos portões. */
function sqlImpressoes(alvos) {
  const pols = alvos.politicas.map((p) => `${p.tabela}.${p.nome}`);
  return (
    'SELECT coalesce(jsonb_object_agg(s.k, s.f), \'{}\'::jsonb) FROM (' +
    ` SELECT 'fn:' || p.oid::regprocedure::text AS k, ${FP_FN('p')} AS f FROM pg_catalog.pg_proc p WHERE p.oid = ANY (SELECT to_regprocedure(x)::oid FROM unnest(${arr(alvos.funcoes)}) x)` +
    ' UNION ALL' +
    ` SELECT 'pol:' || n.nspname || '.' || c.relname || '.' || pol.polname, ${FP_POL('pol')} FROM pg_catalog.pg_policy pol JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE (n.nspname || '.' || c.relname || '.' || pol.polname) = ANY (${arr(pols)})` +
    ' UNION ALL' +
    ` SELECT 'vista:' || n.nspname || '.' || c.relname, ${FP_VIEW('c')} FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.oid = ANY (SELECT to_regclass(x)::oid FROM unnest(${arr(alvos.vistas)}) x)` +
    ') s'
  );
}

/* Leitura SÓ-LEITURA do que o desfazer precisa, com search_path vazio. */
function capturar(alvos) {
  const pols = alvos.politicas.map((p) => `${p.tabela}.${p.nome}`);
  const q =
    "set transaction read only; set local search_path = ''; select " +
    `(select coalesce(json_agg(version order by version), '[]'::json) from supabase_migrations.schema_migrations where version = ANY (${arr(VERSOES)})) as ledger, ` +
    `(${sqlImpressoes(alvos)}) as fp, ` +
    `(select coalesce(json_agg(json_build_object('sig', p.oid::regprocedure::text, 'def', pg_catalog.pg_get_functiondef(p.oid), 'comentario', pg_catalog.obj_description(p.oid, 'pg_proc'), ` +
    `'acl', (select coalesce(json_agg(coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || '|' || a.privilege_type || '|' || a.is_grantable::text order by 1), '[]'::json) from pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a)) order by p.oid::regprocedure::text), '[]'::json) ` +
    `from pg_catalog.pg_proc p where p.oid = ANY (select to_regprocedure(x)::oid from unnest(${arr(alvos.funcoes)}) x)) as funcoes, ` +
    `(select coalesce(json_agg(json_build_object('chave', n.nspname || '.' || c.relname || '.' || pol.polname, 'nome', pol.polname, 'tabela', n.nspname || '.' || c.relname, ` +
    `'papeis', (select coalesce(json_agg(case when r = 0 then 'public' else r::regrole::text end order by 1), '[]'::json) from unnest(pol.polroles) r), ` +
    `'cmd', pol.polcmd, 'using', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), 'check', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), 'comentario', pg_catalog.obj_description(pol.oid, 'pg_policy')) ` +
    `order by n.nspname, c.relname, pol.polname), '[]'::json) from pg_catalog.pg_policy pol join pg_catalog.pg_class c on c.oid = pol.polrelid join pg_catalog.pg_namespace n on n.oid = c.relnamespace ` +
    `where (n.nspname || '.' || c.relname || '.' || pol.polname) = ANY (${arr(pols)})) as politicas, ` +
    `(select coalesce(json_agg(json_build_object('vista', n.nspname || '.' || c.relname, 'opcoes', coalesce(c.reloptions, '{}'::text[]), 'comentario', pg_catalog.obj_description(c.oid, 'pg_class')) order by 1), '[]'::json) ` +
    `from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace where c.oid = ANY (select to_regclass(x)::oid from unnest(${arr(alvos.vistas)}) x)) as vistas, ` +
    'now() as quando';
  return E.sqlLeitura(q)[0];
}

function conferirCaptura(alvos, cap) {
  const erros = [];
  if (cap.funcoes.length !== alvos.funcoes.length) erros.push(`funcoes lidas ${cap.funcoes.length} de ${alvos.funcoes.length} (alguma assinatura nao resolve em PROD)`);
  if (cap.politicas.length !== alvos.politicas.length) erros.push(`policies lidas ${cap.politicas.length} de ${alvos.politicas.length}`);
  if (cap.vistas.length !== alvos.vistas.length) erros.push(`vistas lidas ${cap.vistas.length} de ${alvos.vistas.length}`);
  const n = alvos.funcoes.length + alvos.politicas.length + alvos.vistas.length;
  if (Object.keys(cap.fp).length !== n) erros.push(`impressoes ${Object.keys(cap.fp).length} de ${n}`);
  for (const f of cap.funcoes) if (!/^CREATE OR REPLACE FUNCTION /.test(f.def)) erros.push(`functiondef inesperado para ${f.sig}`);
  return erros;
}

/* O SQL do desfazer, a partir da captura. */
function gerarSql(alvos, cap) {
  const fp = cap.fp;
  const n = Object.keys(fp).length;
  const qFp = sqlImpressoes(alvos);
  const acl = Object.fromEntries(cap.funcoes.map((f) => [f.sig, f.acl]));
  const opcoes = Object.fromEntries(cap.vistas.map((v) => [v.vista, v.opcoes]));
  const L = [];
  L.push('-- =============================================================================');
  L.push('-- Phase 50 — DESFAZER DA EXPANSÃO (migrations 20261005000002..4) — GERADO, NÃO EDITAR À MÃO');
  L.push('-- =============================================================================');
  L.push(`-- Gerado por \`node scripts/p50_desfazer.cjs --gerar\` (WR-04 do 50-REVIEW-ACESSO-1) a partir do`);
  L.push(`-- catálogo VIVO de PROD lido SÓ-LEITURA em ${cap.quando}, com o ledger p50 SEM ${VERSOES.join(', ')}.`);
  L.push(`-- Objetos (por forma, das próprias migrations): ${alvos.funcoes.length} funções, ${alvos.politicas.length} policies, ${alvos.vistas.length} vista(s).`);
  L.push('--');
  L.push('-- ⚠ NÃO É MIGRATION E NÃO RODA AVULSO. Dois usos, e só esses:');
  L.push('--   1. ENSAIO (ida + volta), numa requisição que ABORTA, ANTES do apply do 50-10:');
  L.push('--        node scripts/p50_ensaio.cjs --vistas --migracoes=supabase/migrations/20261005000002_p50_policies_rh_ativo.sql,supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql,supabase/migrations/20261005000004_p50_rpcs_escrita.sql --mutacao=supabase/tests/p50_desfazer_expansao.sql');
  L.push('--      e, DEPOIS do apply (estado vivo = expandido), o ensaio reverso SEM sonda de vistas (o fechamento');
  L.push('--      «A» reprova na volta por construção):');
  L.push('--        node scripts/p50_ensaio.cjs --sem-migracoes --mutacao=supabase/tests/p50_desfazer_expansao.sql');
  L.push('--   2. Base de uma migration CORRETIVA, só com checkpoint do operador (memória «aditivo autônomo,');
  L.push('--      destrutivo com portão»), pela via do projeto (`node p46apply.cjs migrate`), versão própria: a');
  L.push("--      PRIMEIRA linha da migration é `SELECT set_config('p50.desfazer_corretivo', 'sim', true);` e o");
  L.push('--      resto é este arquivo, byte a byte. Sem essa linha a GUARDA abaixo recusa fora do ensaio.');
  L.push('--   Antes de qualquer uso: `node scripts/p50_desfazer.cjs --conferir` (antes do apply) — a impressão');
  L.push('--   digital viva de cada objeto tem de bater com a embutida aqui.');
  L.push('--');
  L.push('-- O texto restaurado é o VIVO (a ÚLTIMA redefinição de cada função, não a migration que a criou).');
  L.push('-- Nenhum DROP, nenhum CASCADE: o helper `is_active_rh_user()` (0001) fica — é do tracer. A ACL é');
  L.push('-- recalculada por DIFERENÇA contra a capturada. PÓS-PORTÃO: toda impressão digital = a capturada.');
  L.push('-- Varredura de forma (CLAUDE.md §Portões): as 2 linhas `= ANY (ARRAY[…])` deste arquivo (a consulta dos');
  L.push('-- PRÉ/PÓS-portões) listam os objetos que 0002..0004 tocam, lidos POR FORMA delas na geração — ESCOPO, não');
  L.push('-- fotografia; e a comparação é com a impressão digital CAPTURADA antes do apply, que é o alvo do desfazer.');
  L.push('-- =============================================================================');
  L.push('');
  L.push("SET LOCAL lock_timeout = '3s';");
  L.push("SET LOCAL statement_timeout = '5s';");
  L.push('');
  L.push('-- GUARDA — a primeira coisa que roda. Mesma marca do smoke p50 (`p50.tx` LOCAL = txid desta transação).');
  L.push('DO $desfazer_guarda$');
  L.push('DECLARE');
  L.push("  v_tx   text := coalesce(current_setting('p50.tx', true), '');");
  L.push("  v_corr text := coalesce(current_setting('p50.desfazer_corretivo', true), '');");
  L.push('BEGIN');
  L.push("  IF v_corr = 'sim' THEN");
  L.push('    RETURN; -- migration corretiva explícita (checkpoint do operador)');
  L.push('  END IF;');
  L.push("  IF v_tx = '' OR v_tx <> txid_current()::text THEN");
  L.push("    RAISE EXCEPTION 'P50D RECUSADO (fora do ensaio): este desfazer reescreve 13 policies e 18 funcoes lidas por toda tela do RH; so roda dentro de scripts/p50_ensaio.cjs (que marca p50.tx e aborta) ou numa migration corretiva com set_config(''p50.desfazer_corretivo'', ''sim'', true) na primeira linha. Nada rodou.';");
  L.push('  END IF;');
  L.push('END');
  L.push('$desfazer_guarda$;');
  L.push('');
  const blocoFp = (rot, corpo) => [
    `DO $desfazer_${rot}$`,
    'DECLARE',
    `  c_fp   constant jsonb := ${lit(JSON.stringify(fp))}::jsonb;`,
    `  c_q    constant text  := ${lit(qFp)};`,
    "  v_sp   text := current_setting('search_path');",
    '  v_fp   jsonb;',
    '  v_dif  text;',
    '  v_falt text;',
    '  v_n    int;',
    'BEGIN',
    "  PERFORM set_config('search_path', '', true);",
    '  EXECUTE c_q INTO v_fp;',
    "  PERFORM set_config('search_path', v_sp, true);",
    "  SELECT string_agg(k, ',' ORDER BY k) INTO v_falt FROM jsonb_object_keys(c_fp) k WHERE NOT v_fp ? k;",
    "  SELECT string_agg(k, ',' ORDER BY k), count(*) INTO v_dif, v_n FROM jsonb_object_keys(c_fp) k WHERE v_fp ? k AND (v_fp ->> k) IS DISTINCT FROM (c_fp ->> k);",
    ...corpo,
    'END',
    `$desfazer_${rot}$;`,
  ];
  L.push('-- PRÉ-PORTÃO — todo objeto existe, e o estado NÃO é o capturado (há expansão a desfazer).');
  L.push(
    ...blocoFp('pre', [
      '  IF v_falt IS NOT NULL THEN',
      "    RAISE EXCEPTION 'P50D FAIL (pre): objeto(s) ausente(s) — %; medir de novo e decidir A MAO', v_falt;",
      '  END IF;',
      '  IF v_n = 0 THEN',
      "    RAISE EXCEPTION 'P50D FAIL (pre): nada a desfazer — as % impressoes digitais ja sao as capturadas antes do apply (a expansao nao esta presente)', (SELECT count(*) FROM jsonb_object_keys(c_fp));",
      '  END IF;',
      "  PERFORM set_config('p50.desfazer_pre', v_n || '/' || (SELECT count(*) FROM jsonb_object_keys(c_fp)), true);",
    ])
  );
  L.push('');
  L.push(`-- ═══ ${cap.funcoes.length} FUNÇÕES — o texto VIVO de antes do apply (pg_get_functiondef) ═══`);
  for (const f of cap.funcoes) {
    L.push('');
    L.push(`-- ${f.sig}`);
    L.push(f.def.replace(/\s*$/, '') + ';');
    L.push(`COMMENT ON FUNCTION ${f.sig} IS ${f.comentario == null ? 'NULL' : lit(f.comentario)};`);
  }
  L.push('');
  L.push('-- ACL por DIFERENÇA contra a capturada (`grantee|privilégio|grant_option`; NULL capturado = acldefault).');
  L.push('DO $desfazer_acl$');
  L.push('DECLARE');
  L.push(`  c_acl constant jsonb := ${lit(JSON.stringify(acl))}::jsonb;`);
  L.push('  r      record;');
  L.push('  v_oid  oid;');
  L.push('  v_atu  text[];');
  L.push('  v_quer text[];');
  L.push('  e      text;');
  L.push('  g      text;');
  L.push('BEGIN');
  L.push('  FOR r IN SELECT key AS sig, value AS quer FROM jsonb_each(c_acl) LOOP');
  L.push('    v_oid := to_regprocedure(r.sig)::oid;');
  L.push("    SELECT coalesce(array_agg(coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || '|' || a.privilege_type || '|' || a.is_grantable::text), '{}')");
  L.push('      INTO v_atu');
  L.push("      FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a");
  L.push('     WHERE p.oid = v_oid;');
  L.push("    SELECT coalesce(array_agg(x), '{}') INTO v_quer FROM jsonb_array_elements_text(r.quer) x;");
  L.push('    FOREACH e IN ARRAY v_atu LOOP');
  L.push('      CONTINUE WHEN e = ANY (v_quer);');
  L.push("      g := split_part(e, '|', 1);");
  L.push("      EXECUTE format('REVOKE %s ON FUNCTION %s FROM %s', split_part(e, '|', 2), v_oid::regprocedure, g);");
  L.push('    END LOOP;');
  L.push('    FOREACH e IN ARRAY v_quer LOOP');
  L.push('      CONTINUE WHEN e = ANY (v_atu);');
  L.push("      g := split_part(e, '|', 1);");
  L.push("      EXECUTE format('GRANT %s ON FUNCTION %s TO %s%s', split_part(e, '|', 2), v_oid::regprocedure, g,");
  L.push("                     CASE WHEN split_part(e, '|', 3) = 'true' THEN ' WITH GRANT OPTION' ELSE '' END);");
  L.push('    END LOOP;');
  L.push('  END LOOP;');
  L.push('END');
  L.push('$desfazer_acl$;');
  L.push('');
  L.push(`-- ═══ ${cap.politicas.length} POLICIES — papéis, USING, WITH CHECK e comentário de antes do apply ═══`);
  for (const p of cap.politicas) {
    const papeis = p.papeis.map((r) => (r === 'public' ? 'public' : r)).join(', ');
    L.push('');
    L.push(`ALTER POLICY ${p.nome} ON ${p.tabela}`);
    L.push(`  TO ${papeis}${p.using != null ? `\n  USING (${p.using})` : ''}${p.check != null ? `\n  WITH CHECK (${p.check})` : ''};`);
    L.push(`COMMENT ON POLICY ${p.nome} ON ${p.tabela} IS ${p.comentario == null ? 'NULL' : lit(p.comentario)};`);
  }
  L.push('');
  L.push(`-- ═══ ${cap.vistas.length} VISTA(S) — reloptions por diferença + comentário ═══`);
  L.push('DO $desfazer_vista$');
  L.push('DECLARE');
  L.push(`  c_opc constant jsonb := ${lit(JSON.stringify(opcoes))}::jsonb;`);
  L.push('  r      record;');
  L.push('  v_atu  text[];');
  L.push('  v_quer text[];');
  L.push('  o      text;');
  L.push('BEGIN');
  L.push('  FOR r IN SELECT key AS vista, value AS quer FROM jsonb_each(c_opc) LOOP');
  L.push("    SELECT coalesce(c.reloptions, '{}') INTO v_atu FROM pg_catalog.pg_class c WHERE c.oid = to_regclass(r.vista);");
  L.push("    SELECT coalesce(array_agg(x), '{}') INTO v_quer FROM jsonb_array_elements_text(r.quer) x;");
  L.push('    FOREACH o IN ARRAY v_atu LOOP');
  L.push('      CONTINUE WHEN o = ANY (v_quer);');
  L.push("      EXECUTE format('ALTER VIEW %s RESET (%s)', to_regclass(r.vista), split_part(o, '=', 1));");
  L.push('    END LOOP;');
  L.push('    FOREACH o IN ARRAY v_quer LOOP');
  L.push('      CONTINUE WHEN o = ANY (v_atu);');
  L.push("      EXECUTE format('ALTER VIEW %s SET (%s = %L)', to_regclass(r.vista), split_part(o, '=', 1), substr(o, length(split_part(o, '=', 1)) + 2));");
  L.push('    END LOOP;');
  L.push('  END LOOP;');
  L.push('END');
  L.push('$desfazer_vista$;');
  for (const v of cap.vistas) L.push(`COMMENT ON VIEW ${v.vista} IS ${v.comentario == null ? 'NULL' : lit(v.comentario)};`);
  L.push('');
  L.push(`-- PÓS-PORTÃO — as ${n} impressões digitais = as capturadas antes do apply.`);
  L.push(
    ...blocoFp('pos', [
      '  IF v_falt IS NOT NULL OR v_n > 0 THEN',
      "    RAISE EXCEPTION 'P50D FAIL (pos): o desfazer NAO devolveu o catalogo ao estado capturado — ausentes=% diferentes=%', coalesce(v_falt, '-'), coalesce(v_dif, '-');",
      '  END IF;',
      "  PERFORM set_config('p50.evidencia', concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),",
      "            'desfazer:pre_diferentes=' || current_setting('p50.desfazer_pre', true) || ',pos=iguais:' || (SELECT count(*) FROM jsonb_object_keys(c_fp))), true);",
    ])
  );
  L.push('');
  return L.join('\n');
}

/* As impressões embutidas num arquivo gerado (a constante `c_fp` do PÓS-PORTÃO). */
function impressoesDoArquivo(txt) {
  const m = txt.match(/DO \$desfazer_pos\$\nDECLARE\n {2}c_fp {3}constant jsonb := '((?:[^']|'')*)'::jsonb;/);
  if (!m) sair(`ARQUIVO SEM IMPRESSOES: ${SAIDA} nao tem o bloco $desfazer_pos$ gerado`);
  return JSON.parse(m[1].replace(/''/g, "'"));
}

function principal() {
  const modo = process.argv[2];
  if (modo !== '--gerar' && modo !== '--conferir') sair('uso: node scripts/p50_desfazer.cjs --gerar | --conferir', 2);
  // Phase 51 (51-10): só leitura do ledger ANTES de qualquer captura — ver «OBSOLETO» no docblock.
  const obs = E.sqlLeitura(`set transaction read only; select count(*)::int as n from supabase_migrations.schema_migrations where version = '${VERSAO_OBSOLETA}'`)[0].n;
  if (obs > 0) {
    sair(`OBSOLETO: o desfazer da P50 não descreve mais listar/contar/funil_kpis (Phase 51, ${VERSAO_OBSOLETA}) — aplicado agora, ele abortaria em listar_revisoes_decisao e, «consertado», apagaria o JORN-42; ${SAIDA} não serve de base de migration corretiva e não pode ser regerado`);
  }
  const alvos = alvosPorForma();
  console.log(`alvos por forma: funcoes=${alvos.funcoes.length} politicas=${alvos.politicas.length} vistas=${alvos.vistas.length} (de ${MIGS_EXP.map((m) => path.basename(m)).join(', ')})`);
  const cap = capturar(alvos);
  const noLedger = VERSOES.filter((v) => cap.ledger.includes(v));
  if (noLedger.length) {
    sair(`${modo === '--gerar' ? 'GERAR' : 'CONFERIR'} RECUSADO: o ledger ja tem ${noLedger.join(',')} — o catalogo vivo nao e mais o de antes do apply (depois do apply, a prova do desfazer e o ensaio reverso: node scripts/p50_ensaio.cjs --sem-migracoes --mutacao=${SAIDA})`);
  }
  const erros = conferirCaptura(alvos, cap);
  if (erros.length) sair(`CAPTURA INCOMPLETA: ${erros.join('; ')}`);

  if (modo === '--gerar') {
    fs.writeFileSync(path.join(ROOT, SAIDA), gerarSql(alvos, cap), 'utf8');
    console.log(`desfazer gerado: ${SAIDA} · ${Object.keys(cap.fp).length} impressoes · ledger=${JSON.stringify(cap.ledger)} · capturado em ${cap.quando}`);
    return;
  }
  const emb = impressoesDoArquivo(fs.readFileSync(path.join(ROOT, SAIDA), 'utf8'));
  const ks = [...new Set([...Object.keys(emb), ...Object.keys(cap.fp)])].sort();
  const dif = ks.filter((k) => emb[k] !== cap.fp[k]);
  if (dif.length) sair(`DESFAZER DIVERGE DE PROD (o arquivo commitado nao descreve mais o estado vivo de antes do apply): ${dif.join(', ')} — regerar (--gerar), revisar o diff e commitar ANTES do apply`);
  console.log(`desfazer confere com PROD: ${ks.length}/${ks.length} impressoes iguais (funcoes=${alvos.funcoes.length} politicas=${alvos.politicas.length} vistas=${alvos.vistas.length}) · ledger=${JSON.stringify(cap.ledger)}`);
}

module.exports = { alvosPorForma, sqlImpressoes, gerarSql, impressoesDoArquivo, SAIDA, VERSOES, VERSAO_OBSOLETA };

if (require.main === module) principal();
