#!/usr/bin/env node
'use strict';
/*
 * gen-p52-gap.cjs — GERADOR da migration do gap de servidor da Phase 52 (plano 52-26):
 *   supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql
 *
 * O QUE ELE FAZ. Substitui DUAS funções VIVAS sem transcrever nenhuma delas: o corpo novo é o
 * `prosrc` de PROD, capturado só leitura e guardado byte a byte em dois arquivos deste diretório,
 * mais TROCAS ANCORADAS — cada âncora é um trecho LITERAL que tem de ocorrer EXATAMENTE uma vez no
 * corpo (senão `ANCORA AUSENTE/AMBIGUA: <rotulo>` e nada é gravado).
 *
 *   public.pontuar_sjt(uuid,jsonb)  — WR-04 (52-REVIEW-BANCO-1; 52-18-DECISAO-OPERADOR item 1):
 *     P1  antes da checagem de duplicata, duas recusas 22023 'resposta malformada' em IFs separados
 *         (payload que não é array; elemento que não é objeto, ou `pergunta_id`/`opcao_id` que não
 *         passa em `pg_input_is_valid(…, 'uuid')`) — nenhum 22P02 sem rótulo do `::uuid`;
 *     P2  a duplicata compara `pergunta_id` como uuid;
 *     P3  a completude (`v_answered`) idem — equivalente ao texto depois de P2, fica por pedido
 *         explícito do operador (defesa em profundidade).
 *   public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text) — F13 (52-REVIEW-PORTAO-1 IN-03;
 *     D-25 com a emenda D-52-U12):
 *     S1  três variáveis no DECLARE;
 *     S2  o bloco da média é trocado por: objeto obrigatório; o conjunto de competências da análise
 *         nomeada pela regra de `normalizeCompetencia` (e os 4 nomes de DEFAULT_COMPETENCIAS sem
 *         nenhum); toda competência do conjunto com nota 1–5; nenhuma chave fora; média só sobre o
 *         conjunto.
 *   public.salvar_avaliacao_entrevista(uuid,jsonb,text) — NÃO é tocada (delega à primária); o PRE
 *     confere o md5 dela e o POS a impressão digital inteira.
 *
 * MODOS
 *   --capturar   lê de PROD (só leitura, `node p46apply.cjs sql "set transaction read only; …"`) os
 *                dois `prosrc` e o md5 da sobrecarga de 3 argumentos; RECUSA sem gravar nada
 *                (`CORPO VIVO DIFERENTE DO ESPERADO: <funcao> <md5>`) se algum md5 não for a
 *                constante `ANTES_*`; senão grava os dois arquivos byte a byte = `prosrc`.
 *   (sem modo)   gera a migration a partir dos dois arquivos (md5 de cada um conferido contra a
 *                constante) e a grava.
 *   --conferir   gera em memória e compara byte a byte com o arquivo da migration:
 *                `GERADO = ARQUIVO: <md5>` (saída 0) ou `GERADO DIFERE DO ARQUIVO` (saída 1).
 *   --auto-teste sem rede e sem escrever no repositório: corpos-fixture em memória provam âncora
 *                ausente → recusa, âncora duplicada → recusa, md5 de captura diferente → recusa, duas
 *                gerações byte a byte iguais, e `--conferir` sobre uma cópia (em tmpdir) com um
 *                octeto trocado → `GERADO DIFERE DO ARQUIVO`. Imprime
 *                `GEN-P52-GAP AUTO-TESTE OK: <n>/<n>`.
 *
 * NUNCA editar a migration à mão: muda-se este gerador e gera-se de novo (`--conferir` reprova a
 * edição manual). Sem dependências.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = path.join(ROOT, 'p46apply.cjs');
const ARQ_PONTUAR = path.join(__dirname, 'pontuar_sjt_vivo_v2.plpgsql');
const ARQ_SALVAR4 = path.join(__dirname, 'salvar_avaliacao_entrevista4_vivo.plpgsql');
const MIGRATION_REL = 'supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql';
const MIGRATION = path.join(ROOT, MIGRATION_REL);

/* md5(prosrc) medidos no planejamento (2026-10-11, só leitura). O de `pontuar_sjt` é o corpo novo
 * da 0003 (decisão de 2026-10-11): a 0005 parte exatamente do que a 0003 deixou no ar. */
const ANTES_PONTUAR = '66fe507fbf5bf6a98bd7e5eecd84f310';
const ANTES_SALVAR4 = '070e0f1b523bc4879204d5c23da1a2dd';
const ANTES_SALVAR3 = '924dfb99c5c4f8be77bcb990c1b8e742';

const SIG_PONTUAR = 'public.pontuar_sjt(uuid,jsonb)';
const SIG_SALVAR4 = 'public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)';
const SIG_SALVAR3 = 'public.salvar_avaliacao_entrevista(uuid,jsonb,text)';

/* Espelho de `DEFAULT_COMPETENCIAS` (src/features/entrevista/components/EntrevistaScorecardInline.tsx),
 * vigiado por `src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts` sobre o texto
 * GERADO (a linha que termina pelo marcador abaixo). */
const DEFAULT_COMPETENCIAS = ['Experiência UAU', 'Inovação', 'Atitude de Dono', 'Sede de Crescimento'];
const MARCADOR_F13 = '-- F13: espelho de DEFAULT_COMPETENCIAS (EntrevistaScorecardInline.tsx)';

class GeracaoRecusada extends Error {}

const md5 = (x) => crypto.createHash('md5').update(x).digest('hex');
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ── WR-04: as trocas em `pontuar_sjt` ────────────────────────────────────────────────────────────
const ANCORA_P1 = '  IF (SELECT count(*) FROM jsonb_array_elements(p_respostas))\n';
const BLOCO_P1 =
  '  -- WR-04 (52-REVIEW-BANCO-1; 52-18-DECISAO-OPERADOR item 1; Phase 52 / 52-26): o payload tem de\n' +
  '  -- ter a forma que o resto do corpo supoe ANTES de qualquer `::uuid` - um array de objetos com\n' +
  '  -- `pergunta_id` e `opcao_id` uuid validos. Sem isto o cast levantava 22P02 sem rotulo; agora a\n' +
  "  -- recusa e 22023 'resposta malformada', como as outras recusas de payload. Dois IFs separados:\n" +
  '  -- `jsonb_array_elements` nunca roda sobre o que nao e array.\n' +
  "  IF p_respostas IS NULL OR jsonb_typeof(p_respostas) <> 'array' THEN\n" +
  "    RAISE EXCEPTION 'resposta malformada' USING errcode = '22023';\n" +
  '  END IF;\n' +
  '  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_respostas) r\n' +
  "              WHERE jsonb_typeof(r) <> 'object'\n" +
  "                 OR NOT coalesce(pg_input_is_valid(r->>'pergunta_id', 'uuid'), false)\n" +
  "                 OR NOT coalesce(pg_input_is_valid(r->>'opcao_id', 'uuid'), false)) THEN\n" +
  "    RAISE EXCEPTION 'resposta malformada' USING errcode = '22023';\n" +
  '  END IF;\n' +
  '\n' +
  '  -- WR-04: duplicata e completude comparam `pergunta_id` como UUID, nao como texto - o mesmo id\n' +
  '  -- em outra caixa e a MESMA pergunta, e contava duas vezes no lugar da omitida.\n';
const ANCORA_P2 = "     <> (SELECT count(DISTINCT r->>'pergunta_id') FROM jsonb_array_elements(p_respostas) r) THEN\n";
const NOVO_P2 = "     <> (SELECT count(DISTINCT (r->>'pergunta_id')::uuid) FROM jsonb_array_elements(p_respostas) r) THEN\n";
const ANCORA_P3 = "  SELECT count(DISTINCT r->>'pergunta_id') INTO v_answered FROM jsonb_array_elements(p_respostas) r;\n";
const NOVO_P3 = "  SELECT count(DISTINCT (r->>'pergunta_id')::uuid) INTO v_answered FROM jsonb_array_elements(p_respostas) r;\n";

const TROCAS_PONTUAR = [
  { rotulo: 'P1', ancora: ANCORA_P1, novo: BLOCO_P1 + ANCORA_P1 },
  { rotulo: 'P2', ancora: ANCORA_P2, novo: NOVO_P2 },
  { rotulo: 'P3', ancora: ANCORA_P3, novo: NOVO_P3 },
];

// ── F13: as trocas em `salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` ─────────────────────────
const ANCORA_S1 = '  v_n          integer;\n';
const NOVO_S1 = ANCORA_S1 + '  v_conj       text[];\n' + '  v_falta      integer;\n' + '  v_fora       integer;\n';

/* O bloco da média do corpo vivo, inteiro, do comentário ao END IF da recusa «nenhuma nota». */
const ANCORA_S2 =
  '  -- Média das notas humanas (BARS 1–5). Só valores numéricos contam; um objeto sem\n' +
  '  -- nenhuma nota numérica é erro de contrato do cliente, não um score zero.\n' +
  '  SELECT avg(kv.v::numeric), count(*)\n' +
  '    INTO v_media, v_n\n' +
  "    FROM jsonb_each_text(coalesce(p_scores_humanos, '{}'::jsonb)) AS kv(k, v)\n" +
  String.raw`   WHERE kv.v ~ '^[0-9]+(\.[0-9]+)?$'` + '\n' +
  '     AND kv.v::numeric BETWEEN 1 AND 5;\n' +
  '\n' +
  '  IF coalesce(v_n, 0) = 0 THEN\n' +
  "    RAISE EXCEPTION 'scores_humanos sem notas numericas entre 1 e 5' USING ERRCODE = 'check_violation';\n" +
  '  END IF;\n';

/* O predicado numérico do corpo vivo (`kv.v ~ '^[0-9]+(\.[0-9]+)?$' AND kv.v::numeric BETWEEN 1 AND
 * 5`), escrito em CASE: o Postgres não garante a ordem de avaliação de um AND, e o cast de um valor
 * não numérico ('x') levantaria 22P02 em vez da recusa rotulada. Mesma aceitação. */
const NOTA_VALIDA = String.raw`CASE WHEN kv.v ~ '^[0-9]+(\.[0-9]+)?$' THEN kv.v::numeric BETWEEN 1 AND 5 ELSE false END`;

const NOVO_S2 =
  '  -- F13 (52-REVIEW-PORTAO-1 IN-03; D-25 com a emenda D-52-U12; Phase 52 / 52-26): «Salvar\n' +
  '  -- avaliacao» so com TODAS as competencias notadas - agora tambem no servidor. O conjunto e o que\n' +
  '  -- a tela renderiza: os nomes de `competencias` da analise nomeada pela regra de\n' +
  "  -- `normalizeCompetencia` (`competencia` string nao vazia, senao `competency` string, senao '') e,\n" +
  '  -- sem nenhum nome, os 4 nomes padrao da tela. Nota de 1 a 5 para cada um, nenhuma chave fora do\n' +
  '  -- conjunto; a media e so sobre o conjunto.\n' +
  "  IF p_scores_humanos IS NULL OR jsonb_typeof(p_scores_humanos) <> 'object' THEN\n" +
  "    RAISE EXCEPTION 'scores_humanos tem de ser um objeto {competencia: nota}' USING ERRCODE = 'check_violation';\n" +
  '  END IF;\n' +
  '\n' +
  '  SELECT coalesce(array_agg(DISTINCT n.nome), ARRAY[]::text[])\n' +
  '    INTO v_conj\n' +
  '    FROM (SELECT CASE\n' +
  "                   WHEN jsonb_typeof(e->'competencia') = 'string' AND length(e->>'competencia') > 0 THEN e->>'competencia'\n" +
  "                   WHEN jsonb_typeof(e->'competency') = 'string' THEN e->>'competency'\n" +
  "                   ELSE ''\n" +
  '                 END AS nome\n' +
  "            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_comp) = 'array' THEN v_comp ELSE '[]'::jsonb END) AS e) AS n;\n" +
  '  IF cardinality(v_conj) = 0 THEN\n' +
  `    v_conj := ARRAY[${DEFAULT_COMPETENCIAS.map(lit).join(', ')}]; ${MARCADOR_F13}\n` +
  '  END IF;\n' +
  '\n' +
  '  SELECT count(*) INTO v_falta\n' +
  '    FROM unnest(v_conj) AS c(nome)\n' +
  '   WHERE NOT EXISTS (SELECT 1 FROM jsonb_each_text(p_scores_humanos) AS kv(k, v)\n' +
  `                      WHERE kv.k = c.nome AND ${NOTA_VALIDA});\n` +
  '  IF v_falta > 0 THEN\n' +
  "    RAISE EXCEPTION 'scores_humanos incompleto: % de % competencia(s) da analise sem nota de 1 a 5', v_falta, cardinality(v_conj)\n" +
  "      USING ERRCODE = 'check_violation';\n" +
  '  END IF;\n' +
  '\n' +
  '  SELECT count(*) INTO v_fora\n' +
  '    FROM jsonb_object_keys(p_scores_humanos) AS k(nome)\n' +
  '   WHERE k.nome <> ALL (v_conj);\n' +
  '  IF v_fora > 0 THEN\n' +
  "    RAISE EXCEPTION 'scores_humanos com % chave(s) fora das competencias da analise', v_fora\n" +
  "      USING ERRCODE = 'check_violation';\n" +
  '  END IF;\n' +
  '\n' +
  '  -- Media das notas humanas (BARS 1-5), so sobre o conjunto da analise.\n' +
  '  SELECT avg(kv.v::numeric), count(*)\n' +
  '    INTO v_media, v_n\n' +
  '    FROM jsonb_each_text(p_scores_humanos) AS kv(k, v)\n' +
  `   WHERE kv.k = ANY (v_conj) AND ${NOTA_VALIDA};\n`;

const TROCAS_SALVAR4 = [
  { rotulo: 'S1', ancora: ANCORA_S1, novo: NOVO_S1 },
  { rotulo: 'S2', ancora: ANCORA_S2, novo: NOVO_S2 },
];

// ── juízes puros ──────────────────────────────────────────────────────────────────────────────────
function contar(texto, trecho) {
  let n = 0;
  let i = 0;
  while ((i = texto.indexOf(trecho, i)) !== -1) {
    n += 1;
    i += trecho.length;
  }
  return n;
}

/* Aplica as trocas em ordem; cada âncora tem de ocorrer exatamente uma vez no corpo ORIGINAL e no
 * texto corrente no instante da troca. */
function trocar(corpo, trocas, nomeFuncao) {
  let t = corpo;
  for (const x of trocas) {
    const nOrig = contar(corpo, x.ancora);
    const nAgora = contar(t, x.ancora);
    if (nOrig !== 1 || nAgora !== 1) {
      throw new GeracaoRecusada(`ANCORA AUSENTE/AMBIGUA: ${x.rotulo} (${nomeFuncao}: ${nOrig} no corpo vivo, ${nAgora} no texto corrente; esperado 1) — nada gravado`);
    }
    t = t.replace(x.ancora, () => x.novo);
  }
  if (t.includes('$function$')) throw new GeracaoRecusada(`DELIMITADOR COLIDE: $function$ no corpo de ${nomeFuncao} — nada gravado`);
  return t;
}

/* O conteúdo de um arquivo capturado tem de ter o md5 da constante. */
function conferirCorpo(buf, esperado, rotulo) {
  const m = md5(buf);
  if (m !== esperado) {
    throw new GeracaoRecusada(`CORPO VIVO DIFERENTE DO ESPERADO: ${rotulo} ${m} (esperado ${esperado}) — recapturar (--capturar) e rever as ancoras; nada gravado`);
  }
  return buf.toString('utf8');
}

/* Julga a captura de PROD: todos os md5 têm de ser os `ANTES_*`. Devolve a lista de recusas. */
function julgarCaptura(linha, antes = { pontuar: ANTES_PONTUAR, salvar4: ANTES_SALVAR4, salvar3: ANTES_SALVAR3 }) {
  const e = [];
  if (!linha || typeof linha.pontuar !== 'string') e.push(`CORPO VIVO DIFERENTE DO ESPERADO: ${SIG_PONTUAR} <ausente>`);
  else if (md5(Buffer.from(linha.pontuar, 'utf8')) !== antes.pontuar) e.push(`CORPO VIVO DIFERENTE DO ESPERADO: ${SIG_PONTUAR} ${md5(Buffer.from(linha.pontuar, 'utf8'))}`);
  if (!linha || typeof linha.salvar4 !== 'string') e.push(`CORPO VIVO DIFERENTE DO ESPERADO: ${SIG_SALVAR4} <ausente>`);
  else if (md5(Buffer.from(linha.salvar4, 'utf8')) !== antes.salvar4) e.push(`CORPO VIVO DIFERENTE DO ESPERADO: ${SIG_SALVAR4} ${md5(Buffer.from(linha.salvar4, 'utf8'))}`);
  if (!linha || linha.salvar3_md5 !== antes.salvar3) e.push(`CORPO VIVO DIFERENTE DO ESPERADO: ${SIG_SALVAR3} ${linha ? linha.salvar3_md5 : '<ausente>'}`);
  return e;
}

/* Compara o gerado com o conteúdo de um arquivo, byte a byte. */
function conferir(gerado, bufArquivo) {
  const g = Buffer.from(gerado, 'utf8');
  if (!bufArquivo || !g.equals(bufArquivo)) return { ok: false, linha: 'GERADO DIFERE DO ARQUIVO' };
  return { ok: true, linha: `GERADO = ARQUIVO: ${md5(g)}` };
}

// ── leituras de catálogo da migration (PRE e POS usam a MESMA) ────────────────────────────────────
/* Propriedades, ACL (conjunto ordenado de aclexplode), comentário e EXECUTE de anon/authenticated —
 * a leitura do PRE/POS da 0003 (`LE_PONTUAR` do gen-sjt-v2.py), mais `authenticated`. */
const LE_FUNCAO = (sig) => `  SELECT md5(p.prosrc),
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         coalesce((SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), ''),
         coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'),
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text || ',authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
    INTO v_md5, v_props, v_acl, v_cmt, v_exec
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('${sig}');`;

/* IMPRESSÃO DIGITAL de função — cópia LITERAL de `ACL_SQL`/`FP_FN` do `scripts/p52_ensaio.cjs` (o
 * `--auto-teste` reprova se as duas definições divergirem): `to_jsonb` da linha de pg_proc INTEIRA,
 * menos `proacl` e `proargdefaults`; mais argumentos, ACL e comentário. */
const ACL_SQL = (p) =>
  `coalesce((SELECT string_agg(x, ',' ORDER BY x) FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text || ':' || a.grantor::regrole::text AS x FROM pg_catalog.aclexplode(coalesce(${p}.proacl, pg_catalog.acldefault('f', ${p}.proowner))) a) s), '')`;
const FP_FN = (p) =>
  `md5(((to_jsonb(${p}) - 'proacl' - 'proargdefaults')::text) || '|' || pg_catalog.pg_get_function_arguments(${p}.oid) || '|' || ${ACL_SQL(p)} || '|' || coalesce(pg_catalog.obj_description(${p}.oid, 'pg_proc'), '<null>'))`;

const LE_SALVAR3 = `  SELECT md5(p.prosrc), ${FP_FN('p')}
    INTO v_md5, v_fp
    FROM pg_catalog.pg_proc p
   WHERE p.oid = to_regprocedure('${SIG_SALVAR3}');`;

// ── a migration ───────────────────────────────────────────────────────────────────────────────────
function cabecalho(m) {
  return `-- 20261011000005_p52_sjt_uuid_e_nota_completa.sql
--
-- POR QUE ESTA MIGRATION EXISTE (decisao do operador de 2026-10-11, verbatim em
-- .planning/phases/52-hub-do-rh-dados-e-contato/52-DECISAO-2026-10-11-gaps-e-pitr.md, item 1:
-- «Antes do UAT: ... o WR-04 ... e, no mesmo plano, o F13»; plano 52-26).
--
-- (WR-04 do 52-REVIEW-BANCO-1; 52-18-DECISAO-OPERADOR.md item 1 - «consertar ANTES de abrir para
-- candidatos reais», numa migration propria depois do bloco C, sem tocar a 0003) \`pontuar_sjt\`
-- comparava \`pergunta_id\` como TEXTO na checagem de duplicata e na de completude: um payload montado
-- a mao com o mesmo id em caixa diferente ('abc...' e 'ABC...') passava como duas perguntas, contava a
-- repetida duas vezes no lugar da omitida e saia com answered = expected. Agora as duas checagens
-- comparam como uuid (P2, P3). Depois de P2, P3 e equivalente ao texto (duplicata por uuid aprovada =>
-- uuids distintos => textos distintos): fica por pedido explicito do operador, como defesa em
-- profundidade, e nenhuma mutacao a isola. Antes delas (P1), payload que nao e array, elemento que nao
-- e objeto, ou \`pergunta_id\`/\`opcao_id\` que nao e uuid valido (pg_input_is_valid) e recusado ALTO com
-- 22023 'resposta malformada' - nunca o 22P02 sem rotulo do \`::uuid\` (o cliente mapeia 22023 para a
-- mensagem neutra, sem eco; um 22P02 cairia no ramo que interpola a mensagem do servidor). A ordem das
-- outras recusas e a pontuacao do conjunto valido nao mudam; a 0003 nao e tocada.
--
-- (F13 do 52-REVIEW-PORTAO-1 IN-03; D-25 com a emenda D-52-U12) \`salvar_avaliacao_entrevista\` de 4
-- argumentos aceitava notas parciais e ignorava em silencio as fora de 1-5: so recusava zero notas. A
-- regra «Salvar avaliacao so com TODAS as competencias notadas» vivia so no cliente. Agora o servidor
-- recusa (23514) o p_scores_humanos que nao e objeto, que deixa sem nota 1-5 alguma competencia do
-- conjunto da analise nomeada, ou que traz chave fora dele. O conjunto e o que a tela renderiza: os
-- nomes de entrevista_analises.competencias pela regra de normalizeCompetencia (\`competencia\` string
-- nao vazia, senao \`competency\` string, senao '') e, sem nenhum, os 4 nomes padrao da tela (espelho
-- vigiado por src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts). A media passa a
-- ser so sobre o conjunto. As recusas anteriores (42501, no_data_found, analise nao vigente, notas
-- vazias) continuam antes, na mesma ordem. A sobrecarga de 3 argumentos NAO e tocada: ela delega a
-- primaria com o mesmo payload e herda a regra.
--
-- pontuar_sjt_prosrc_md5_antes: ${ANTES_PONTUAR}
-- pontuar_sjt_prosrc_md5_novo: ${m.pontuar}
-- salvar4_prosrc_md5_antes: ${ANTES_SALVAR4}
-- salvar4_prosrc_md5_novo: ${m.salvar4}
-- salvar3_prosrc_md5_intocada: ${ANTES_SALVAR3}
--
-- ⚠ ESTE SQL FOI GERADO, NAO TRANSCRITO.
-- Gerador: scripts/geradores/gen-p52-gap.cjs (--conferir regenera e compara byte a byte)
-- Corpos vivos (prosrc de PROD byte a byte, capturados so leitura por --capturar):
--   scripts/geradores/pontuar_sjt_vivo_v2.plpgsql             (md5 ${ANTES_PONTUAR})
--   scripts/geradores/salvar_avaliacao_entrevista4_vivo.plpgsql (md5 ${ANTES_SALVAR4})
-- O corpo novo = corpo vivo + SO as trocas ancoradas P1-P3 / S1-S2 (cada ancora ocorre exatamente uma
-- vez no corpo vivo). Nao editar este arquivo a mao: muda-se o gerador e gera-se de novo.
--
-- ⚠ SUBSTITUI DUAS FUNCOES VIVAS - o desfazer e recriar os corpos dos dois arquivos capturados (mesma
-- assinatura, mesmo PRE/POS invertido), numa migration corretiva. Esta migration nao escreve dado:
-- desfazer so reabre as duas portas que ela fecha. Nenhum GRANT/REVOKE/COMMENT: CREATE OR REPLACE
-- preserva dono, ACL e comentario, e o POS confere (o EXECUTE de anon em pontuar_sjt FICA como esta -
-- fecha-lo e decisao a parte, UF-2).
--
-- POR QUE 0005 ANTES DA 0004: a 20261011000004 (bloco D, 52-20, destrutiva) ainda nao existe e esta
-- fixada por nome no MIGS do ensaio e em planos ja verificados; nenhum portao da fase depende da ORDEM
-- das versoes (o p46apply.cjs migrate nao confere ordem; a regra (8) do p52_portao.cjs e por FORMA e
-- exige toda _p52_ do pin no ledger, seja qual for a ordem). A ordem fora de sequencia no ledger e
-- PROTECAO: com a 0005 no ar e a 0004 so no disco, \`supabase db push\` recusa sem --include-all. No
-- MIGS do ensaio a 0005 entra ANTES da 0004 (a lista e a ordem de APLICACAO).
--
-- Sem BEGIN/COMMIT: o endpoint ja roda o corpo inteiro numa unica transacao, e \`DO\` adjacentes a um
-- BEGIN sao a forma exata do 42601 (CLAUDE.md §Migrations).
--
-- APLICAR COM: node p46apply.cjs migrate ${MIGRATION_REL}
-- SO pelo 52-26 Task 4, atras do \`node scripts/p52_portao.cjs --modo apply\` (review sem critico,
-- janela unica confirmada pelo operador). NUNCA \`supabase db push\`.

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';
`;
}

function blocoPre() {
  return `
-- ─────────────────────────────────────────────────────────────────────────────
-- P52G PRE-PORTAO — os tres corpos vivos tem de ser os que o gerador leu (md5 antes/intocada do
-- cabecalho); senao recusa e nada muda. Guarda em GUCs LOCAIS as propriedades, a ACL, o comentario e
-- o EXECUTE de anon/authenticated das duas funcoes trocadas, e a impressao digital inteira da
-- sobrecarga de 3 argumentos (o POS compara).
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_md5   text;
  v_props text;
  v_acl   text;
  v_cmt   text;
  v_exec  text;
  v_fp    text;
BEGIN
${LE_FUNCAO(SIG_PONTUAR)}
  IF v_md5 IS NULL THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (pontuar_sjt): ${SIG_PONTUAR} nao existe; nada mudou';
  END IF;
  IF v_md5 IS DISTINCT FROM '${ANTES_PONTUAR}' THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (pontuar_sjt): md5(prosrc) vivo = % (o gerador leu ${ANTES_PONTUAR}) - o corpo vivo mudou depois da captura: recapturar (gen-p52-gap.cjs --capturar) e gerar de novo; nada mudou', v_md5;
  END IF;
  PERFORM set_config('p52.gap_pontuar_props', v_props, true);
  PERFORM set_config('p52.gap_pontuar_acl',   v_acl,   true);
  PERFORM set_config('p52.gap_pontuar_cmt',   v_cmt,   true);
  PERFORM set_config('p52.gap_pontuar_exec',  v_exec,  true);

  v_md5 := NULL;
${LE_FUNCAO(SIG_SALVAR4)}
  IF v_md5 IS NULL THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (salvar4): ${SIG_SALVAR4} nao existe; nada mudou';
  END IF;
  IF v_md5 IS DISTINCT FROM '${ANTES_SALVAR4}' THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (salvar4): md5(prosrc) vivo = % (o gerador leu ${ANTES_SALVAR4}) - o corpo vivo mudou depois da captura: recapturar (gen-p52-gap.cjs --capturar) e gerar de novo; nada mudou', v_md5;
  END IF;
  PERFORM set_config('p52.gap_salvar4_props', v_props, true);
  PERFORM set_config('p52.gap_salvar4_acl',   v_acl,   true);
  PERFORM set_config('p52.gap_salvar4_cmt',   v_cmt,   true);
  PERFORM set_config('p52.gap_salvar4_exec',  v_exec,  true);

  v_md5 := NULL;
${LE_SALVAR3}
  IF v_md5 IS NULL THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (salvar3): ${SIG_SALVAR3} nao existe; nada mudou';
  END IF;
  IF v_md5 IS DISTINCT FROM '${ANTES_SALVAR3}' THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (salvar3): md5(prosrc) vivo = % (esperado ${ANTES_SALVAR3}, intocada) - a sobrecarga de 3 argumentos mudou depois da captura: rever o plano; nada mudou', v_md5;
  END IF;
  PERFORM set_config('p52.gap_salvar3_fp', v_fp, true);
END
$pre$;
`;
}

function blocoCreate(novoPontuar, novoSalvar4) {
  return `
-- \`pontuar_sjt\`: o corpo VIVO + P1-P3 (WR-04). Mesma assinatura, mesmas propriedades.
CREATE OR REPLACE FUNCTION public.pontuar_sjt(p_candidatura_id uuid, p_respostas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$${novoPontuar}$function$;

-- \`salvar_avaliacao_entrevista\` de 4 argumentos: o corpo VIVO + S1-S2 (F13). Mesma assinatura,
-- mesmas propriedades. A de 3 argumentos nao e tocada.
CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(p_candidatura_id uuid, p_analise_id uuid, p_scores_humanos jsonb, p_notas text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$${novoSalvar4}$function$;
`;
}

function blocoPos(m) {
  const conferirFn = (rot, guc, sig, novo) => `${LE_FUNCAO(sig)}
  IF v_md5 IS DISTINCT FROM '${novo}' THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (${rot}): md5(prosrc) = % (esperado ${novo}); nada persiste', v_md5;
  END IF;
  IF v_props IS DISTINCT FROM current_setting('p52.gap_${guc}_props', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (${rot}): propriedades mudaram (% -> %); nada persiste', current_setting('p52.gap_${guc}_props', true), v_props;
  END IF;
  IF v_acl IS DISTINCT FROM current_setting('p52.gap_${guc}_acl', true)
     OR v_exec IS DISTINCT FROM current_setting('p52.gap_${guc}_exec', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (${rot}): ACL mudou (% -> %; EXECUTE % -> %); nada persiste', current_setting('p52.gap_${guc}_acl', true), v_acl, current_setting('p52.gap_${guc}_exec', true), v_exec;
  END IF;
  IF v_cmt IS DISTINCT FROM current_setting('p52.gap_${guc}_cmt', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (${rot}): o comentario da funcao mudou; nada persiste';
  END IF;`;
  return `
-- ─────────────────────────────────────────────────────────────────────────────
-- P52G POS-PORTAO — os dois corpos novos sao os do cabecalho; propriedades, ACL, comentario e EXECUTE
-- de anon/authenticated iguais aos do PRE; a sobrecarga de 3 argumentos com a MESMA impressao digital.
-- Qualquer diferenca levanta e nada persiste.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_md5   text;
  v_props text;
  v_acl   text;
  v_cmt   text;
  v_exec  text;
  v_fp    text;
BEGIN
  IF coalesce(current_setting('p52.gap_salvar3_fp', true), '') = '' THEN
    RAISE EXCEPTION 'P52G POS-PORTAO: as GUCs do PRE estao vazias - o PRE nao rodou nesta transacao; nada persiste';
  END IF;
${conferirFn('pontuar_sjt', 'pontuar', SIG_PONTUAR, m.pontuar)}

${conferirFn('salvar4', 'salvar4', SIG_SALVAR4, m.salvar4)}

${LE_SALVAR3}
  IF v_md5 IS DISTINCT FROM '${ANTES_SALVAR3}' OR v_fp IS DISTINCT FROM current_setting('p52.gap_salvar3_fp', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (salvar3): a sobrecarga de 3 argumentos mudou (md5 %, impressao digital % -> %); nada persiste', v_md5, current_setting('p52.gap_salvar3_fp', true), v_fp;
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') ||
    ' gap:pontuar_sjt=${m.pontuar},salvar4=${m.salvar4},salvar3=igual'), false);
END
$pos$;
`;
}

/* Gera o texto da migration a partir dos dois corpos (Buffers). `antes` existe para o auto-teste. */
function gerar(bufPontuar, bufSalvar4, antes = { pontuar: ANTES_PONTUAR, salvar4: ANTES_SALVAR4 }) {
  const vivoP = conferirCorpo(bufPontuar, antes.pontuar, path.basename(ARQ_PONTUAR));
  const vivoS = conferirCorpo(bufSalvar4, antes.salvar4, path.basename(ARQ_SALVAR4));
  const novoP = trocar(vivoP, TROCAS_PONTUAR, 'pontuar_sjt');
  const novoS = trocar(vivoS, TROCAS_SALVAR4, 'salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)');
  const m = { pontuar: md5(Buffer.from(novoP, 'utf8')), salvar4: md5(Buffer.from(novoS, 'utf8')) };
  const texto = cabecalho(m) + blocoPre() + blocoCreate(novoP, novoS) + blocoPos(m);
  if (contar(texto, MARCADOR_F13) !== 1) throw new GeracaoRecusada(`MARCADOR F13 aparece ${contar(texto, MARCADOR_F13)} vez(es) no texto gerado (esperado 1) — nada gravado`);
  return { texto, md5Novo: m, novoPontuar: novoP, novoSalvar4: novoS };
}

function gerarDosArquivos() {
  return gerar(fs.readFileSync(ARQ_PONTUAR), fs.readFileSync(ARQ_SALVAR4));
}

// ── captura (só leitura) ──────────────────────────────────────────────────────────────────────────
function capturar() {
  const q =
    'set transaction read only; select ' +
    `(select p.prosrc from pg_catalog.pg_proc p where p.oid = to_regprocedure('${SIG_PONTUAR}')) as pontuar, ` +
    `(select p.prosrc from pg_catalog.pg_proc p where p.oid = to_regprocedure('${SIG_SALVAR4}')) as salvar4, ` +
    `(select md5(p.prosrc) from pg_catalog.pg_proc p where p.oid = to_regprocedure('${SIG_SALVAR3}')) as salvar3_md5`;
  const s = execFileSync('node', [APPLY, 'sql', q], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  const linha = JSON.parse(s.slice(s.indexOf('[')))[0];
  const e = julgarCaptura(linha);
  if (e.length) throw new GeracaoRecusada(`${e.join('; ')} — nada gravado`);
  fs.writeFileSync(ARQ_PONTUAR, Buffer.from(linha.pontuar, 'utf8'));
  fs.writeFileSync(ARQ_SALVAR4, Buffer.from(linha.salvar4, 'utf8'));
  return linha;
}

// ── auto-teste (sem rede, sem escrever no repositório) ────────────────────────────────────────────
function autoTeste() {
  const casos = [];
  const caso = (nome, fn) => casos.push({ nome, fn });
  const recusa = (fn, padrao) => {
    try {
      fn();
    } catch (e) {
      if (e instanceof GeracaoRecusada && padrao.test(e.message)) return;
      throw new Error(`recusou com a mensagem errada: ${e.message}`);
    }
    throw new Error('nao recusou');
  };
  const fixP = '\nDECLARE\n  v_answered int;\nBEGIN\n' + ANCORA_P1 + ANCORA_P2 + "    RAISE EXCEPTION 'resposta duplicada' USING errcode = '22023';\n  END IF;\n" + ANCORA_P3 + 'END;\n';
  const fixS = '\nDECLARE\n' + ANCORA_S1 + 'BEGIN\n' + ANCORA_S2 + 'END;\n';
  const antesFix = (p, s) => ({ pontuar: md5(Buffer.from(p, 'utf8')), salvar4: md5(Buffer.from(s, 'utf8')) });
  const g = (p, s, antes = antesFix(p, s)) => gerar(Buffer.from(p, 'utf8'), Buffer.from(s, 'utf8'), antes);

  caso('fixture gera, com as cinco linhas de md5 e o marcador uma vez', () => {
    const r = g(fixP, fixS);
    for (const k of ['pontuar_sjt_prosrc_md5_antes', 'pontuar_sjt_prosrc_md5_novo', 'salvar4_prosrc_md5_antes', 'salvar4_prosrc_md5_novo', 'salvar3_prosrc_md5_intocada']) {
      if (!new RegExp(`^-- ${k}: [0-9a-f]{32}$`, 'm').test(r.texto)) throw new Error(`sem a linha ${k}`);
    }
    if (contar(r.texto, MARCADOR_F13) !== 1) throw new Error('marcador F13 != 1');
    if (contar(r.novoPontuar, "count(DISTINCT (r->>'pergunta_id')::uuid)") !== 2) throw new Error('P2/P3 nao aplicadas');
  });
  caso('ancora ausente -> recusa (P3)', () => recusa(() => g(fixP.replace(ANCORA_P3, ''), fixS), /^ANCORA AUSENTE\/AMBIGUA: P3 /));
  caso('ancora duplicada -> recusa (S1)', () => recusa(() => g(fixP, fixS.replace(ANCORA_S1, ANCORA_S1 + ANCORA_S1)), /^ANCORA AUSENTE\/AMBIGUA: S1 /));
  caso('ancora duplicada -> recusa (S2)', () => recusa(() => g(fixP, fixS + ANCORA_S2), /^ANCORA AUSENTE\/AMBIGUA: S2 /));
  caso('md5 do corpo capturado diferente -> recusa', () => recusa(() => g(fixP, fixS, { pontuar: ANTES_PONTUAR, salvar4: ANTES_SALVAR4 }), /^CORPO VIVO DIFERENTE DO ESPERADO: /));
  caso('captura de PROD com md5 diferente -> recusa (as tres funcoes)', () => {
    const e = julgarCaptura({ pontuar: fixP, salvar4: fixS, salvar3_md5: '0'.repeat(32) });
    if (e.length !== 3 || !e.every((x) => x.startsWith('CORPO VIVO DIFERENTE DO ESPERADO: '))) throw new Error(`julgarCaptura devolveu ${JSON.stringify(e)}`);
    const ok = julgarCaptura({ pontuar: fixP, salvar4: fixS, salvar3_md5: 'a'.repeat(32) }, { ...antesFix(fixP, fixS), salvar3: 'a'.repeat(32) });
    if (ok.length) throw new Error(`captura correta recusada: ${ok.join('; ')}`);
  });
  caso('$function$ no corpo -> recusa', () => recusa(() => g(fixP + '-- $function$\n', fixS), /^DELIMITADOR COLIDE/));
  caso('duas geracoes byte a byte iguais', () => {
    if (g(fixP, fixS).texto !== g(fixP, fixS).texto) throw new Error('geracao nao deterministica');
  });
  caso('--conferir: copia com um octeto trocado -> GERADO DIFERE DO ARQUIVO; copia exata -> igual', () => {
    const t = g(fixP, fixS).texto;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-p52-gap-'));
    try {
      const b = Buffer.from(t, 'utf8');
      const ruim = Buffer.from(b);
      ruim[Math.floor(ruim.length / 2)] ^= 0x01;
      fs.writeFileSync(path.join(dir, 'ruim.sql'), ruim);
      fs.writeFileSync(path.join(dir, 'bom.sql'), b);
      const r1 = conferir(t, fs.readFileSync(path.join(dir, 'ruim.sql')));
      const r2 = conferir(t, fs.readFileSync(path.join(dir, 'bom.sql')));
      if (r1.ok || r1.linha !== 'GERADO DIFERE DO ARQUIVO') throw new Error(`octeto trocado: ${r1.linha}`);
      if (!r2.ok || !/^GERADO = ARQUIVO: [0-9a-f]{32}$/.test(r2.linha)) throw new Error(`copia exata: ${r2.linha}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  caso('FP_FN/ACL_SQL = as do scripts/p52_ensaio.cjs (copia literal)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'p52_ensaio.cjs'), 'utf8');
    for (const [nome, fn] of [['ACL_SQL', ACL_SQL], ['FP_FN', FP_FN]]) {
      if (fn('p') !== evalDef(src, nome)('p')) throw new Error(`${nome} divergiu do p52_ensaio.cjs`);
    }
  });
  if (fs.existsSync(ARQ_PONTUAR) && fs.existsSync(ARQ_SALVAR4)) {
    caso('corpos capturados: md5 = ANTES_*, cada ancora uma vez, geracao deterministica', () => {
      const bp = fs.readFileSync(ARQ_PONTUAR);
      const bs = fs.readFileSync(ARQ_SALVAR4);
      if (md5(bp) !== ANTES_PONTUAR || md5(bs) !== ANTES_SALVAR4) throw new Error('md5 dos arquivos capturados != ANTES_*');
      for (const x of TROCAS_PONTUAR) if (contar(bp.toString('utf8'), x.ancora) !== 1) throw new Error(`${x.rotulo} != 1`);
      for (const x of TROCAS_SALVAR4) if (contar(bs.toString('utf8'), x.ancora) !== 1) throw new Error(`${x.rotulo} != 1`);
      if (gerar(bp, bs).texto !== gerar(bp, bs).texto) throw new Error('geracao real nao deterministica');
    });
  }
  let ok = 0;
  for (const c of casos) {
    try {
      c.fn();
      ok += 1;
    } catch (e) {
      console.error(`GEN-P52-GAP AUTO-TESTE FALHOU: ${c.nome}: ${e.message}`);
    }
  }
  return { ok, n: casos.length };
}

/* Avalia a definição `const <nome> = (p) =>\n  \`…\`;` do fonte do p52_ensaio.cjs (só ACL_SQL/FP_FN). */
function evalDef(src, nome) {
  const re = new RegExp(`const ${nome} = \\(p\\) =>\\n  (\`[^\`]*\`);`);
  const m = src.match(re);
  if (!m) throw new Error(`definicao de ${nome} nao encontrada no p52_ensaio.cjs`);
  // eslint-disable-next-line no-new-func
  return new Function('ACL_SQL', `return (p) => ${m[1]};`)(ACL_SQL);
}

module.exports = {
  gerar,
  gerarDosArquivos,
  trocar,
  conferir,
  conferirCorpo,
  julgarCaptura,
  autoTeste,
  contar,
  GeracaoRecusada,
  TROCAS_PONTUAR,
  TROCAS_SALVAR4,
  DEFAULT_COMPETENCIAS,
  MARCADOR_F13,
  ANTES_PONTUAR,
  ANTES_SALVAR4,
  ANTES_SALVAR3,
  MIGRATION_REL,
};

function principal() {
  const argv = process.argv.slice(2);
  const modo = argv[0] || 'gerar';
  try {
    if (modo === '--auto-teste') {
      const r = autoTeste();
      if (r.ok !== r.n) {
        console.error(`GEN-P52-GAP AUTO-TESTE FALHOU: ${r.ok}/${r.n}`);
        process.exit(1);
      }
      console.log(`GEN-P52-GAP AUTO-TESTE OK: ${r.ok}/${r.n}`);
    } else if (modo === '--capturar') {
      const l = capturar();
      console.log(`CAPTURADO: ${path.relative(ROOT, ARQ_PONTUAR)} md5 ${ANTES_PONTUAR} · ${path.relative(ROOT, ARQ_SALVAR4)} md5 ${ANTES_SALVAR4} · salvar3 ${l.salvar3_md5} (intocada)`);
    } else if (modo === '--conferir') {
      const r = conferir(gerarDosArquivos().texto, fs.existsSync(MIGRATION) ? fs.readFileSync(MIGRATION) : null);
      console[r.ok ? 'log' : 'error'](r.linha);
      process.exit(r.ok ? 0 : 1);
    } else if (modo === 'gerar') {
      const r = gerarDosArquivos();
      fs.writeFileSync(MIGRATION, r.texto, 'utf8');
      console.log(`GERADO: ${MIGRATION_REL} md5 ${md5(Buffer.from(r.texto, 'utf8'))} · pontuar_sjt_novo=${r.md5Novo.pontuar} · salvar4_novo=${r.md5Novo.salvar4}`);
    } else {
      console.error(`modo desconhecido: ${modo} (use --capturar | --conferir | --auto-teste | sem argumento)`);
      process.exit(1);
    }
  } catch (e) {
    console.error(e instanceof GeracaoRecusada ? e.message : `ERRO: ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) principal();
