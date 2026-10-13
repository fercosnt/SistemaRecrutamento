#!/usr/bin/env node
'use strict';
/*
 * p52_mutacoes.cjs — prova, por execução, que cada cláusula dos smokes da Phase 52 MORDE.
 *
 * Cópia de FORMA de `scripts/p51_mutacoes.cjs` (revisado na 51), sobre a composição de
 * `scripts/p52_ensaio.cjs` (mesmo prefixo, mesmo sentinela `ENSAIO_P52_TERMINOU`, mesma via
 * `p46apply.cjs run`). TODA requisição termina no sentinela (ou numa reprovação antes dele): o
 * endpoint executa o corpo inteiro numa transação, então nada persiste — e `capturar()` confere
 * isso antes do primeiro CONTROLE e depois do laço.
 *
 * CONTRATO (o bloco B — 52-08 — cria; os blocos C e D acrescentam ENTRADAS e linhas em SMOKES,
 * não critérios):
 *
 * (1) ENTRADA `{ id, desc, smoke, letra, rotulos?, requer, sql }`.
 *       smoke    caminho do smoke relativo à raiz, exatamente como na tabela SMOKES;
 *       letra    o RÓTULO entre parênteses que a reprovação tem de trazer, por igualdade EXATA;
 *       rotulos  (opcional) lista que tem de aparecer INTEIRA em `<PREFIXO> FAIL (<letra>):
 *                [<rótulos>]`; rótulo `c_*` = controle vácuo, nunca mordida;
 *       requer   versões p52 de que a mutação depende — no modo padrão são as que o runner
 *                PREFIXA (se fora do ledger); no `--pos-apply`, têm de estar no ledger;
 *       sql      texto, ou função que o devolve (avaliada só quando a mutação roda), DERIVADO
 *                do TEXTO da função na migration por troca LITERAL (`trocar`): o alvo da troca
 *                tem de ocorrer EXATAMENTE uma vez no trecho, senão o runner SAI com erro —
 *                mutação que não se aplica não é teste. Vai DEPOIS das migrations e ANTES do
 *                smoke. A função é reescrita como `CREATE OR REPLACE` com assinatura e RETURNS
 *                idênticos (vale com a migration prefixada e contra o objeto vivo).
 *
 *     ENTRADA de RECUSA (52-17, B4 — o único caso em que a mordida está no PRE da migration, não
 *     num smoke): `{ id, desc, smoke, recusa, requer, migracao: { versao, transformar } }`, sem
 *     `letra` nem `sql`.
 *       migracao.transformar(texto) devolve o texto da migration `versao` com a troca LITERAL
 *                (`trocar`, alvo único); o texto mutado vai a um arquivo temporário que SUBSTITUI
 *                a migration na lista prefixada SÓ nesta rodada. A versão tem de estar prefixada
 *                (fora do ledger), senão erro do harness — mutar o texto de uma migration que não
 *                roda não é teste.
 *       recusa   texto LITERAL que a saída tem de conter. Morde sse não chegou ao sentinela, NENHUM
 *                `<X> FAIL (…)` saiu (a recusa é do PRE, antes de qualquer smoke) e o texto está lá.
 *
 * (2) TABELA `SMOKES`: `{ prefixo, par }` — o par `<k>=pass/esperado` que o sentinela reporta.
 *
 * (3) VEREDITO: a reprovação é a PRIMEIRA ocorrência de `<X> FAIL (<rótulo>)[: [<rótulos>]]`
 *     na saída, com QUALQUER prefixo. Morde sse: não chegou ao sentinela, o prefixo é o do smoke,
 *     a letra é a da entrada, não é `erro INESPERADO` do envelope («nada foi julgado») e os
 *     rótulos exigidos estão lá. `40001` repete UMA vez; timeout/40001 de novo saem 3.
 *     `julgarMutacao`/`julgarControle` são PUROS e exportados.
 *
 * (4) CONTROLE de cada smoke usado, antes da primeira mutação dele: sentinela alcançada, nenhum
 *     `FAIL (`, e o par com pass = esperado. Vermelho = `CONTROLE VERMELHO (<smoke>)` e parar.
 *
 * (5) SAÍDA: `CONTROLE verde (<smoke>): par <k>=<p>/<e> (<ms> ms)`; `<id> morde: <desc> ->
 *     <PREFIXO> FAIL (<letra>) (<ms> ms)`; `NAO MORDE: <id> (<desc>) — <motivo>`. Linha final:
 *     `MUTACOES: <n>/<n> mordem; controle verde; nada persistiu` (exit 0) ou
 *     `MUTACOES: NAO MORDEM: <ids>` (exit 1). Duas não-mordidas seguidas = `SUSPEITA DE
 *     INSTRUMENTO` (exit 1).
 *
 * (6) MODOS.
 *       (padrão)     prefixa as migrations p52 de MIGS cuja versão alguma entrada selecionada
 *                    `requer` e que estão FORA do ledger (antes do apply do 52-15);
 *       --pos-apply  `--sem-migracoes`: o smoke contra os objetos VIVOS; toda versão `requer`
 *                    tem de estar no ledger, senão erro do harness antes da baseline.
 *       --so=<id>[,<id>…]  só as entradas pedidas, na ordem DECLARADA.
 *
 * (7) APOSENTADORIA (52-26). Uma linha de SMOKES pode declarar `exigePrefixadas: [<versão>…]` — o
 *     smoke só tem sentido com essas migrations PREFIXADAS (lê GUCs que o PRE delas grava NESTA
 *     transação). Depois de ler o ledger, toda entrada cujo smoke exige versão que JÁ está no
 *     ledger — e toda entrada de RECUSA cuja `migracao.versao` já está no ledger — é APOSENTADA:
 *     impressa `APOSENTADA: <id> — <smoke> so roda com <versão> prefixada, e <versão> esta no
 *     ledger desde o apply` e retirada da rodada completa. Nunca em silêncio: pedi-la em `--so=` é
 *     `ERRO DO HARNESS: <id> aposentada …`; rodada sem nenhuma entrada viva é erro (vacuidade); a
 *     linha final ganha ` (aposentadas: <ids>)`. `aposentar` é PURA e exportada. Motivo (medido no
 *     planejamento do 52-26): depois do apply do 52-18 o smoke52b (0003) não roda mais sem o PRE da
 *     0003, e a rodada completa era vermelha por construção. `julgarMutacao`/`julgarControle` não
 *     mudam.
 *
 * LOCK: o do prefixo do ensaio (`lock_timeout 3s` / `statement_timeout 5s`); duração impressa.
 *
 * Uso: node scripts/p52_mutacoes.cjs [--pos-apply] [--so=L1,L4]   (sem dependências)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const E = require('./p52_ensaio.cjs');

const SMOKES = {
  'supabase/tests/p52_leituras_rh_smoke.sql': { prefixo: 'P52L', par: '52l' },
  // (7) o smoke52b lê as GUCs do PRE da 0003 (p52.banco_*): só roda com ela PREFIXADA.
  'supabase/tests/p52_banco_sjt_smoke.sql': { prefixo: 'P52B', par: '52b', exigePrefixadas: ['20261011000003'] },
  'supabase/tests/p52_gap_servidor_smoke.sql': { prefixo: 'P52G', par: '52g' },
  'supabase/tests/p52_painel_vaga_smoke.sql': { prefixo: 'P52P', par: '52p' },
  'supabase/tests/p52_testes_candidato_smoke.sql': { prefixo: 'P52A', par: '52a' },
};

/* Baseline de persistência; null até ser lida. */
let antes = null;

/* Arquivo temporário da migration mutada de uma entrada de RECUSA (só durante a rodada dela). */
let tmpMutacao = null;
function apagarTmpMutacao() {
  if (!tmpMutacao) return;
  try {
    fs.unlinkSync(tmpMutacao);
  } catch {
    /* já apagado */
  }
  tmpMutacao = null;
}

function conferirPersistencia() {
  const depois = E.capturar();
  const dif = E.diferencas(antes, depois);
  if (dif.length) {
    console.error(`PERSISTIU: ${dif.join(' ; ')}`);
    return false;
  }
  console.log(
    `leitura so-leitura igual a baseline: ledger=${JSON.stringify(depois.ledger.map((x) => x.v))} funcoes=${Object.keys(depois.funcoes).length} mutacoes_p52=${depois.mutacoes_p52.length} fixtures_p52=${JSON.stringify(depois.fixtures_p52)}`
  );
  return true;
}

/* TODA saída passa por aqui. Depois da baseline, mede a persistência antes de sair. */
function sair(msg, codigo = 1) {
  apagarTmpMutacao();
  let c = codigo;
  if (antes) {
    try {
      if (!conferirPersistencia()) c = 1;
    } catch (e) {
      console.error(`PERSISTENCIA NAO MEDIDA: ${e.message}`);
      c = 1;
    }
  }
  console.error(msg);
  process.exit(c);
}

/* Texto de uma migration p52 pela versão (lido do disco; ausente = erro do harness). */
function mig(versao) {
  const m = E.MIGS.find((x) => E.versao(x) === versao);
  if (!m || !fs.existsSync(path.join(E.ROOT, m))) throw new Error(`ANCORA AUSENTE/AMBIGUA: migration ${versao} nao existe no disco`);
  return fs.readFileSync(path.join(E.ROOT, m), 'utf8');
}

/* Um trecho da migration, delimitado por um início LITERAL único e o primeiro fim literal depois dele. */
function extrair(texto, inicio, fim, rotulo) {
  const n = texto.split(inicio).length - 1;
  if (n !== 1) throw new Error(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (inicio «${inicio}» ocorre ${n} vez(es))`);
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  if (b < 0) throw new Error(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (fim «${fim}» nao encontrado)`);
  return texto.slice(a, b + fim.length);
}

/* Troca textual sobre um alvo LITERAL que tem de ocorrer exatamente uma vez no trecho. */
function trocar(trecho, alvo, novo, rotulo) {
  const n = trecho.split(alvo).length - 1;
  if (n !== 1) throw new Error(`ANCORA AUSENTE/AMBIGUA: ${rotulo} («${alvo}» ocorre ${n} vez(es) no trecho)`);
  return trecho.replace(alvo, () => novo);
}

/* `CREATE FUNCTION public.<nome>(` … `$function$;` de uma migration p52, reescrito como `CREATE OR
 * REPLACE FUNCTION` (vale com a migration prefixada e no `--pos-apply`, contra o objeto vivo). */
function fnNova(versao, nome) {
  const t = extrair(mig(versao), `CREATE FUNCTION public.${nome}(`, '$function$;', nome);
  return 'CREATE OR REPLACE FUNCTION' + t.slice('CREATE FUNCTION'.length);
}

// ── 52-08: leituras do RH (migration 20261011000001) ─────────────────────────
const V01 = '20261011000001';
const S52L = 'supabase/tests/p52_leituras_rh_smoke.sql';
const fnDev = () => fnNova(V01, 'ler_devolutiva_bigfive_rh');
const fnSjt = () => fnNova(V01, 'ler_sjt_mc_rh');
const fnTri = () => fnNova(V01, 'ler_contexto_rejeicao_triagem_revisao');
const HELPER =
  "  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN\n" +
  "    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';\n" +
  '  END IF;\n';

// ── 52-17: banco SJT v2 (migration 20261011000003, GERADA — o texto vem do disco) ───
// Toda mutação abaixo lê o alvo NESTA transação (GUCs locais que o `DO $pre$` da migration grava,
// ou o próprio texto da migration): nenhum uuid literal, nenhuma contagem fixa. Sem alvo, o bloco
// levanta `MUTACAO Bn SEM ALVO` — sai como «nao morde», nunca como mordida.
const V03 = '20261011000003';
const S52B = 'supabase/tests/p52_banco_sjt_smoke.sql';
const VIVO_PONTUAR = 'scripts/geradores/pontuar_sjt_vivo.plpgsql';

/* B4: o `v_mant_hash` do `DO $pre$`, com o PRIMEIRO hash de caso mantido trocado por um sha256 que
 * não é de nenhum item. A troca é feita na LINHA da declaração (o mesmo hash também está em
 * `v_hashes`, no mesmo bloco) e a linha tem de ocorrer uma vez só no arquivo. */
const B4_HASH_FALSO = crypto.createHash('sha256').update('p52-17 B4: caso mantido trocado no PRE').digest('hex');
function b4Alvo(texto) {
  const pre = extrair(texto, 'DO $pre$\n', '\n$pre$;', 'B4 ($pre$)');
  const linha = (rotulo) => {
    const ls = pre.split('\n').filter((l) => l.startsWith(`  ${rotulo} text[] := ARRAY[`));
    if (ls.length !== 1) throw new Error(`ANCORA AUSENTE/AMBIGUA: B4 (declaracao ${rotulo.trim()} ocorre ${ls.length} vez(es) no $pre$)`);
    return ls[0];
  };
  const lHash = linha('v_mant_hash ');
  const lCargo = linha('v_mant_cargo');
  const hash = (lHash.match(/'([0-9a-f]{64})'/) || [])[1];
  const cargo = (lCargo.match(/'([a-z0-9-]+)'/) || [])[1];
  if (!hash || !cargo) throw new Error('ANCORA AUSENTE/AMBIGUA: B4 (sem caso mantido no $pre$ — com caso_aberto_marketing: versao_nova, B4 nao tem alvo e sai da lista)');
  return { lHash, hash, cargo };
}
function b4Transformar(texto) {
  const { lHash, hash } = b4Alvo(texto);
  const nova = trocar(lHash, `'${hash}'`, `'${B4_HASH_FALSO}'`, 'B4 (hash na linha)');
  return trocar(texto, lHash, nova, 'B4 (linha no arquivo)');
}

/* B5: `pontuar_sjt` recriado com o corpo VELHO — o cabeçalho da própria migration (assinatura,
 * RETURNS, propriedades) + o `prosrc` guardado em `scripts/geradores/pontuar_sjt_vivo.plpgsql`, cujo
 * md5 tem de ser o `pontuar_sjt_prosrc_md5_antes` do cabeçalho da migration (o que o PRE confere). */
function b5Sql() {
  const t = mig(V03);
  const antes = (t.match(/^-- pontuar_sjt_prosrc_md5_antes: ([0-9a-f]{32})$/m) || [])[1];
  if (!antes) throw new Error('ANCORA AUSENTE/AMBIGUA: B5 (cabecalho sem pontuar_sjt_prosrc_md5_antes)');
  const vivo = fs.readFileSync(path.join(E.ROOT, VIVO_PONTUAR), 'utf8');
  const md5 = crypto.createHash('md5').update(vivo, 'utf8').digest('hex');
  if (md5 !== antes) throw new Error(`ANCORA AUSENTE/AMBIGUA: B5 (${VIVO_PONTUAR} md5 ${md5} != pontuar_sjt_prosrc_md5_antes ${antes})`);
  if (vivo.includes('$function$')) throw new Error('ANCORA AUSENTE/AMBIGUA: B5 (o corpo velho contem $function$)');
  return extrair(t, 'CREATE OR REPLACE FUNCTION public.pontuar_sjt(', 'AS $function$', 'B5') + vivo + '$function$;';
}

// ── 52-26: gap de servidor (migration 20261011000005, GERADA — o texto vem do disco) ───────────
// Cada mutação extrai da migration o `CREATE OR REPLACE FUNCTION public.<funcao>(` … `$function$;`
// GERADO e troca um alvo LITERAL único no trecho (contrato (1)); vale com a 0005 prefixada e, no
// `--pos-apply`, contra o objeto vivo.
const V05 = '20261011000005';
const S52G = 'supabase/tests/p52_gap_servidor_smoke.sql';
const fnGap = (nome) => extrair(mig(V05), `CREATE OR REPLACE FUNCTION public.${nome}(`, '$function$;', `${nome} (0005)`);
const fnPontuar = () => fnGap('pontuar_sjt');
const fnSalvar4 = () => fnGap('salvar_avaliacao_entrevista');
/* A linha inteira da duplicata: `count(DISTINCT (r->>'pergunta_id')::uuid)` ocorre DUAS vezes (P2 e P3). */
const G_DUP_UUID = "     <> (SELECT count(DISTINCT (r->>'pergunta_id')::uuid) FROM jsonb_array_elements(p_respostas) r) THEN\n";
const G_DUP_TEXTO = "     <> (SELECT count(DISTINCT r->>'pergunta_id') FROM jsonb_array_elements(p_respostas) r) THEN\n";
const G_ANS_UUID = "  SELECT count(DISTINCT (r->>'pergunta_id')::uuid) INTO v_answered FROM jsonb_array_elements(p_respostas) r;\n";
const G_ANS_TEXTO = "  SELECT count(DISTINCT r->>'pergunta_id') INTO v_answered FROM jsonb_array_elements(p_respostas) r;\n";
const G_MALFORMADA =
  "  IF p_respostas IS NULL OR jsonb_typeof(p_respostas) <> 'array' THEN\n" +
  "    RAISE EXCEPTION 'resposta malformada' USING errcode = '22023';\n" +
  '  END IF;\n' +
  '  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_respostas) r\n' +
  "              WHERE jsonb_typeof(r) <> 'object'\n" +
  "                 OR NOT coalesce(pg_input_is_valid(r->>'pergunta_id', 'uuid'), false)\n" +
  "                 OR NOT coalesce(pg_input_is_valid(r->>'opcao_id', 'uuid'), false)) THEN\n" +
  "    RAISE EXCEPTION 'resposta malformada' USING errcode = '22023';\n" +
  '  END IF;\n';
/* G4: o bloco F13 inteiro (do IF do objeto ao fim do SELECT da média) volta ao bloco do corpo vivo. */
const G4_INICIO = "  IF p_scores_humanos IS NULL OR jsonb_typeof(p_scores_humanos) <> 'object' THEN\n";
const G4_FIM = String.raw`   WHERE kv.k = ANY (v_conj) AND CASE WHEN kv.v ~ '^[0-9]+(\.[0-9]+)?$' THEN kv.v::numeric BETWEEN 1 AND 5 ELSE false END;` + '\n';
const G4_VIVO =
  '  SELECT avg(kv.v::numeric), count(*)\n' +
  '    INTO v_media, v_n\n' +
  "    FROM jsonb_each_text(coalesce(p_scores_humanos, '{}'::jsonb)) AS kv(k, v)\n" +
  String.raw`   WHERE kv.v ~ '^[0-9]+(\.[0-9]+)?$'` + '\n' +
  '     AND kv.v::numeric BETWEEN 1 AND 5;\n' +
  '\n' +
  '  IF coalesce(v_n, 0) = 0 THEN\n' +
  "    RAISE EXCEPTION 'scores_humanos sem notas numericas entre 1 e 5' USING ERRCODE = 'check_violation';\n" +
  '  END IF;\n';
const G5_FORA =
  '  SELECT count(*) INTO v_fora\n' +
  '    FROM jsonb_object_keys(p_scores_humanos) AS k(nome)\n' +
  '   WHERE k.nome <> ALL (v_conj);\n' +
  '  IF v_fora > 0 THEN\n' +
  "    RAISE EXCEPTION 'scores_humanos com % chave(s) fora das competencias da analise', v_fora\n" +
  "      USING ERRCODE = 'check_violation';\n" +
  '  END IF;\n';
/* G6: o IF do fallback inteiro (as três linhas, a do meio terminada pelo marcador do espelho). */
function g6Alvo(fn) {
  const ini = '  IF cardinality(v_conj) = 0 THEN\n';
  const t = extrair(fn, ini, '  END IF;\n', 'G6 (fallback)');
  if (!t.includes('-- F13: espelho de DEFAULT_COMPETENCIAS')) throw new Error('ANCORA AUSENTE/AMBIGUA: G6 (o IF do fallback nao traz o marcador do espelho)');
  return t;
}
const G7_COMPETENCIA = "                   WHEN jsonb_typeof(e->'competencia') = 'string' AND length(e->>'competencia') > 0 THEN e->>'competencia'\n";
/* G8/G9 (WR-01 do 52-REVIEW-GAP-1): os dois ramos do CASE da normalização que só a cláusula (n) exercita. */
const G8_COMPRIMENTO = " AND length(e->>'competencia') > 0 THEN e->>'competencia'\n";
const G9_COMPETENCY = "                   WHEN jsonb_typeof(e->'competency') = 'string' THEN e->>'competency'\n";
const G9_QUALQUER = "                   WHEN e ? 'competency' THEN e->>'competency'\n";

// ── 52-31: a vaga das próprias candidaturas no painel do candidato (migration 20261011000006) ───
// Cada alvo abaixo é LITERAL e único no texto da função escrita na 0006 (`trocar` recusa o
// contrário); a mutação vai DEPOIS da migration (e do POS dela) como `CREATE OR REPLACE`.
const V06 = '20261011000006';
const S52P = 'supabase/tests/p52_painel_vaga_smoke.sql';
const fnVagas = () => fnNova(V06, 'ler_vagas_das_minhas_candidaturas');
const P_POSSE = 'c.candidato_id IN (SELECT ca.id FROM public.candidatos ca WHERE ca.user_id = v_uid)';
const P_VIVA = '     AND c.deleted_at IS NULL AND c.is_rascunho = false;\n';
const P_GUARDA = "  IF v_uid IS NULL OR coalesce(v_role, '') <> 'candidato' THEN\n";
const P_GUARDA_BLOCO = P_GUARDA + "    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';\n" + '  END IF;\n';
const P_JUNCAO = '    JOIN public.vagas v ON v.id = c.vaga_id\n';

// ── 52-32: os testes da vaga das próprias candidaturas (migration 20261011000007) ──────────────
// A 0007 copia BYTE A BYTE as linhas de guarda, posse, junção e viva da 0006 (D-52-G7B-3): as
// âncoras `P_*` acima valem nas duas. Só a projeção é nova — `A_PROJ_TESTES` e `A_PROJ_FIM`, como
// escritas na migration (únicas no arquivo inteiro: A13/A14 trocam sobre o texto COMPLETO).
const V07 = '20261011000007';
const S52A = 'supabase/tests/p52_testes_candidato_smoke.sql';
const fnTestes = () => fnNova(V07, 'ler_testes_das_minhas_candidaturas');
const A_PROJ_TESTES = "'testes_aplicaveis', v.testes_aplicaveis,";
const A_PROJ_FIM = "'aplica_cognitivo', v.aplica_cognitivo)";
const A_RECUSA_POS = 'P52-07 POS-PORTAO: public.ler_testes_das_minhas_candidaturas() le coluna de vagas fora da allowlist';

const MUTACOES = [
  {
    // T-52-14: sem o helper vivo, o recrutador desativado (JWT ainda válido) lê a devolutiva.
    id: 'L1',
    desc: 'guarda sem helper: ler_devolutiva_bigfive_rh perde o is_active_rh_user do ramo rh',
    smoke: S52L,
    letra: 'c',
    requer: [V01],
    sql: () => trocar(fnDev(), HELPER, '', 'L1'),
  },
  {
    // T-52-16: o número cru da escala entra pela projeção (lido do dashboard da devolutiva).
    id: 'L2',
    desc: "devolutiva projeta 'percentil' no jsonb_build_object de cada dimensao",
    smoke: S52L,
    letra: 'g',
    requer: [V01],
    sql: () =>
      trocar(
        fnDev(),
        "jsonb_build_object('dim', o.dim,",
        "jsonb_build_object('dim', o.dim,\n                                               'percentil', (SELECT (e ->> 'percentil')::numeric FROM jsonb_array_elements(v_dash) AS e WHERE e ->> 'dim' = o.dim LIMIT 1),",
        'L2'
      ),
  },
  {
    // T-52-17: a etiqueta de TODAS as alternativas sai (o gabarito inteiro).
    id: 'L3',
    desc: "SJT projeta 'tag', o.tag dentro de cada alternativa",
    smoke: S52L,
    letra: 'n',
    requer: [V01],
    sql: () => trocar(fnSjt(), "'texto', o.opcao_texto,", "'texto', o.opcao_texto,\n                                                   'tag', o.tag,", 'L3'),
  },
  {
    // T-52-17: ordem = gabarito (Achado F2: ordem 1 = fortemente_pontua).
    id: 'L4',
    desc: 'SJT ordena as alternativas por ordem (o gabarito) em vez do md5 neutro',
    smoke: S52L,
    letra: 'o',
    requer: [V01],
    sql: () => trocar(fnSjt(), 'ORDER BY md5(o.pergunta_id::text || o.opcao_id::text))', 'ORDER BY o.ordem)', 'L4'),
  },
  {
    // D-38: o contexto da triagem passa a responder também ao pedido de knockout.
    id: 'L5',
    desc: 'triagem aceita pedido de origem automatica',
    smoke: S52L,
    letra: 'q',
    requer: [V01],
    sql: () =>
      trocar(
        fnTri(),
        "IF NOT FOUND OR v_origem IS DISTINCT FROM 'humana_triagem' THEN",
        "IF NOT FOUND OR v_origem NOT IN ('humana_triagem', 'automatica') THEN",
        'L5'
      ),
  },
  {
    // T-52-15: EXECUTE de volta a anon depois da migration.
    id: 'L6',
    desc: 'GRANT EXECUTE de ler_devolutiva_bigfive_rh a anon depois da migration',
    smoke: S52L,
    letra: 'f',
    requer: [V01],
    sql: 'GRANT EXECUTE ON FUNCTION public.ler_devolutiva_bigfive_rh(uuid) TO anon;',
  },
  {
    // T-52-14/T-52-18: sem o helper na triagem, o desativado lê e aprende a existência do pedido.
    id: 'L7',
    desc: 'guarda sem helper: ler_contexto_rejeicao_triagem_revisao perde o is_active_rh_user',
    smoke: S52L,
    letra: 'r',
    requer: [V01],
    sql: () => trocar(fnTri(), HELPER, '', 'L7'),
  },
  {
    // T-52-18: o SJT de candidatura em rascunho/excluída responde (o filtro de candidatura viva some).
    id: 'L8',
    desc: 'SJT sem o filtro de candidatura viva (deleted_at/is_rascunho)',
    smoke: S52L,
    letra: 't',
    requer: [V01],
    sql: () => trocar(fnSjt(), ' AND c.deleted_at IS NULL AND c.is_rascunho = false', '', 'L8'),
  },
  {
    // T-52-52: item antigo e item novo do mesmo cargo ativos juntos (a vaga sorteia do cargo).
    id: 'B1',
    desc: 'depois da migration, um item da baseline da retirada volta a active',
    smoke: S52B,
    letra: 'a',
    requer: [V03],
    sql:
      'DO $b1$\n' +
      'DECLARE v_id uuid;\n' +
      'BEGIN\n' +
      '  SELECT p.id INTO v_id FROM public.perguntas p\n' +
      "   WHERE p.id::text = ANY (string_to_array(nullif(current_setting('p52.banco_retirar_ids', true), ''), ','))\n" +
      "     AND p.status = 'retired' ORDER BY p.id LIMIT 1;\n" +
      "  IF v_id IS NULL THEN RAISE EXCEPTION 'MUTACAO B1 SEM ALVO: nenhum item da baseline da retirada esta retired nesta transacao'; END IF;\n" +
      "  UPDATE public.perguntas SET status = 'active' WHERE id = v_id;\n" +
      'END\n' +
      '$b1$;',
  },
  {
    // D-37: a `ordem` volta a ser o gabarito (escada pela etiqueta) num cargo do texto.
    id: 'B2',
    desc: 'ordem das alternativas reescrita em escada pela etiqueta no primeiro cargo do texto',
    smoke: S52B,
    letra: 'g',
    requer: [V03],
    sql:
      'DO $b2$\n' +
      "DECLARE v_cargo text := split_part(coalesce(current_setting('p52.banco_cargos', true), ''), ',', 1); v_n bigint;\n" +
      'BEGIN\n' +
      "  IF v_cargo = '' THEN RAISE EXCEPTION 'MUTACAO B2 SEM ALVO: p52.banco_cargos vazio'; END IF;\n" +
      "  UPDATE public.perguntas_opcao_sjt o SET ordem = CASE o.tag WHEN 'fortemente_pontua' THEN 1 WHEN 'pontua' THEN 2 WHEN 'neutro' THEN 3 WHEN 'atencao' THEN 4 END\n" +
      '    FROM public.perguntas p\n' +
      "   WHERE p.id = o.pergunta_id AND p.tipo = 'sjt' AND p.cargo = v_cargo AND p.status = 'active' AND p.formato = 'mc';\n" +
      '  GET DIAGNOSTICS v_n = ROW_COUNT;\n' +
      "  IF v_n = 0 THEN RAISE EXCEPTION 'MUTACAO B2 SEM ALVO: nenhuma alternativa mc ativa no cargo %', v_cargo; END IF;\n" +
      'END\n' +
      '$b2$;',
  },
  {
    // D-34/(f): etiqueta e peso descasados — o peso de pontua e o de neutro trocados num item do texto.
    id: 'B3',
    desc: 'pesos de pontua e neutro trocados entre si num mc ativo do texto',
    smoke: S52B,
    letra: 'f',
    requer: [V03],
    sql:
      'DO $b3$\n' +
      'DECLARE v_pid uuid; v_n bigint;\n' +
      'BEGIN\n' +
      '  SELECT p.id INTO v_pid FROM public.perguntas p\n' +
      "   WHERE p.tipo = 'sjt' AND p.status = 'active' AND p.formato = 'mc'\n" +
      "     AND p.content_hash = ANY (string_to_array(nullif(current_setting('p52.banco_hashes', true), ''), ','))\n" +
      '   ORDER BY p.id LIMIT 1;\n' +
      "  IF v_pid IS NULL THEN RAISE EXCEPTION 'MUTACAO B3 SEM ALVO: nenhum mc ativo com hash do texto'; END IF;\n" +
      '  UPDATE public.perguntas_opcao_sjt o SET peso = x.peso\n' +
      '    FROM public.perguntas_opcao_sjt x\n' +
      "   WHERE o.pergunta_id = v_pid AND x.pergunta_id = v_pid AND o.tag IN ('pontua', 'neutro') AND x.tag IN ('pontua', 'neutro') AND x.tag <> o.tag AND x.peso <> o.peso;\n" +
      '  GET DIAGNOSTICS v_n = ROW_COUNT;\n' +
      "  IF v_n <> 2 THEN RAISE EXCEPTION 'MUTACAO B3 SEM ALVO: a troca alcancou % alternativa(s), esperado o par pontua/neutro', v_n; END IF;\n" +
      'END\n' +
      '$b3$;',
  },
  {
    // D-35: o caso aberto que FICA tem de existir no ar com o hash do texto — o PRE recusa antes de mudar nada.
    // Só existe com `caso_aberto_marketing: ficam` (52-17-TEXTO-APROVADO.md); sem caso mantido, `b4Alvo` lança.
    id: 'B4',
    desc: 'hash do primeiro caso mantido trocado, no v_mant_hash do $pre$, por um sha256 que nao e de item nenhum',
    smoke: S52B,
    // O texto inteiro da recusa: o cargo do alvo, o hash FALSO e «0 item(ns)» — a recusa é a da troca, não outra.
    recusa: () =>
      `P52B PRE-PORTAO: caso mantido ausente do ar — cargo ${b4Alvo(mig(V03)).cargo}, content_hash ${B4_HASH_FALSO}: 0 item(ns) ativo(s) com esse hash (esperado 1)`,
    requer: [V03],
    migracao: { versao: V03, transformar: b4Transformar },
  },
  {
    // WR-02 do 52-REVIEW-PORTAO-2: o corpo VELHO volta — a resposta sem alternativa é pontuada em silêncio.
    id: 'B5',
    desc: `pontuar_sjt recriado com o corpo velho (${VIVO_PONTUAR}) depois da migration`,
    smoke: S52B,
    letra: 'n',
    requer: [V03],
    sql: b5Sql,
  },
  {
    // WR-01 do 52-REVIEW-PORTAO-2: o mapa velho→novo perde uma linha — o desfazer não devolveria aquela alternativa.
    id: 'B6',
    desc: 'uma linha do mapa supabase_migrations.p52_remap_opcao_sjt apagada depois da migration',
    smoke: S52B,
    letra: 'm',
    requer: [V03],
    sql:
      'DO $b6$\n' +
      'DECLARE v_n bigint;\n' +
      'BEGIN\n' +
      '  DELETE FROM supabase_migrations.p52_remap_opcao_sjt m\n' +
      "   WHERE m.versao = '" + V03 + "'\n" +
      '     AND m.opcao_linha_id = (SELECT x.opcao_linha_id FROM supabase_migrations.p52_remap_opcao_sjt x\n' +
      "                              WHERE x.versao = '" + V03 + "' ORDER BY x.opcao_linha_id LIMIT 1);\n" +
      '  GET DIAGNOSTICS v_n = ROW_COUNT;\n' +
      "  IF v_n <> 1 THEN RAISE EXCEPTION 'MUTACAO B6 SEM ALVO: o mapa da versao " + V03 + " esta vazio nesta transacao'; END IF;\n" +
      'END\n' +
      '$b6$;',
  },
  {
    // T-52-82 (WR-04): só a duplicata volta a comparar TEXTO — a completude por uuid ainda recusa, mas com OUTRO rótulo.
    id: 'G1',
    desc: 'pontuar_sjt: a checagem de duplicata volta a comparar pergunta_id como texto',
    smoke: S52G,
    letra: 'a',
    requer: [V05],
    sql: () => trocar(fnPontuar(), G_DUP_UUID, G_DUP_TEXTO, 'G1'),
  },
  {
    // T-52-82 (WR-04): as duas checagens voltam a texto — o defeito original: a pergunta repetida conta duas vezes.
    id: 'G2',
    desc: 'pontuar_sjt: duplicata e completude voltam a comparar pergunta_id como texto',
    smoke: S52G,
    letra: 'a',
    requer: [V05],
    sql: () => trocar(trocar(fnPontuar(), G_DUP_UUID, G_DUP_TEXTO, 'G2 (duplicata)'), G_ANS_UUID, G_ANS_TEXTO, 'G2 (completude)'),
  },
  {
    // T-52-83: sem as recusas 'resposta malformada', o `::uuid` levanta 22P02 sem rótulo.
    id: 'G3',
    desc: "pontuar_sjt: sem as duas recusas 'resposta malformada' (P1)",
    smoke: S52G,
    letra: 'e',
    requer: [V05],
    sql: () => trocar(fnPontuar(), G_MALFORMADA, '', 'G3'),
  },
  {
    // T-52-84 (F13): o bloco volta à regra «pelo menos uma nota 1–5» do corpo vivo.
    id: 'G4',
    desc: 'salvar_avaliacao_entrevista: o bloco F13 volta a regra de pelo menos uma nota (corpo vivo)',
    smoke: S52G,
    letra: 'c',
    requer: [V05],
    sql: () => {
      const fn = fnSalvar4();
      return trocar(fn, extrair(fn, G4_INICIO, G4_FIM, 'G4 (bloco F13)'), G4_VIVO, 'G4');
    },
  },
  {
    // T-52-84 (F13): sem a recusa de chave fora do conjunto.
    id: 'G5',
    desc: 'salvar_avaliacao_entrevista: sem a recusa de chave fora das competencias da analise',
    smoke: S52G,
    letra: 'i',
    requer: [V05],
    sql: () => trocar(fnSalvar4(), G5_FORA, '', 'G5'),
  },
  {
    // T-52-84 (F13): sem o fallback dos 4 nomes de DEFAULT_COMPETENCIAS.
    id: 'G6',
    desc: 'salvar_avaliacao_entrevista: sem o fallback dos 4 nomes de DEFAULT_COMPETENCIAS',
    smoke: S52G,
    letra: 'm',
    requer: [V05],
    sql: () => {
      const fn = fnSalvar4();
      return trocar(fn, g6Alvo(fn), '', 'G6');
    },
  },
  {
    // T-52-84 (F13): a normalização ignora `competencia` — o conjunto do servidor deixa de ser o da tela.
    id: 'G7',
    desc: 'salvar_avaliacao_entrevista: a normalizacao ignora a chave competencia (so competency)',
    smoke: S52G,
    letra: 'd',
    requer: [V05],
    sql: () => trocar(fnSalvar4(), G7_COMPETENCIA, '', 'G7'),
  },
  {
    // T-52-84 (F13) / WR-01 do 52-REVIEW-GAP-1: `competencia` string VAZIA passa a valer — o conjunto
    // do servidor deixa de ser o de `normalizeCompetencia` (o cliente cai para `competency`).
    id: 'G8',
    desc: "salvar_avaliacao_entrevista: a normalizacao aceita competencia string vazia (sem o length > 0)",
    smoke: S52G,
    letra: 'n',
    requer: [V05],
    sql: () => trocar(fnSalvar4(), G8_COMPRIMENTO, " THEN e->>'competencia'\n", 'G8'),
  },
  {
    // T-52-84 (F13) / WR-01 do 52-REVIEW-GAP-1: `competency` deixa de exigir string — um número vira
    // nome no servidor e '' no cliente.
    id: 'G9',
    desc: "salvar_avaliacao_entrevista: a normalizacao aceita competency de qualquer tipo (e ? 'competency')",
    smoke: S52G,
    letra: 'n',
    requer: [V05],
    sql: () => trocar(fnSalvar4(), G9_COMPETENCY, G9_QUALQUER, 'G9'),
  },
  {
    // T-52-102: posse aberta — o predicado de candidato_le_propria_candidatura vira `true`.
    id: 'P1',
    desc: 'ler_vagas_das_minhas_candidaturas: o predicado de posse vira true (toda candidatura viva de todos)',
    smoke: S52P,
    letra: 'b',
    requer: [V06],
    sql: () => trocar(fnVagas(), P_POSSE, 'true', 'P1'),
  },
  {
    // G-52-7 / D-52-G7-1 (a truth): o filtro da vaga PÚBLICA volta ao WHERE — a vaga inativada some.
    id: 'P2',
    desc: "ler_vagas_das_minhas_candidaturas: filtro de vaga publica (status = 'ativa' AND deleted_at IS NULL) no WHERE",
    smoke: S52P,
    letra: 'a',
    requer: [V06],
    sql: () =>
      trocar(
        fnVagas(),
        P_VIVA,
        "     AND c.deleted_at IS NULL AND c.is_rascunho = false\n     AND v.status = 'ativa' AND v.deleted_at IS NULL;\n",
        'P2'
      ),
  },
  {
    // T-52-104: sobre-projeção — 'status', v.status entra no objeto de cada elemento.
    id: 'P3',
    desc: "ler_vagas_das_minhas_candidaturas: 'status', v.status na projecao",
    smoke: S52P,
    letra: 'c',
    requer: [V06],
    sql: () => trocar(fnVagas(), "'departamento', v.departamento)", "'departamento', v.departamento,\n                                               'status', v.status)", 'P3'),
  },
  {
    // T-52-107: a guarda passa a aceitar rh e administrador.
    id: 'P4',
    desc: 'ler_vagas_das_minhas_candidaturas: a guarda aceita rh e administrador',
    smoke: S52P,
    letra: 'g',
    requer: [V06],
    sql: () =>
      trocar(
        fnVagas(),
        P_GUARDA,
        "  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('candidato', 'rh', 'administrador') THEN\n",
        'P4'
      ),
  },
  {
    // T-52-105: EXECUTE de volta a anon depois da migration (o pg_default_acl de public).
    id: 'P5',
    desc: 'GRANT EXECUTE de ler_vagas_das_minhas_candidaturas a anon depois da migration',
    smoke: S52P,
    letra: 'f',
    requer: [V06],
    sql: 'GRANT EXECUTE ON FUNCTION public.ler_vagas_das_minhas_candidaturas() TO anon;',
  },
  {
    // T-52-103: sem o filtro de rascunho — a candidatura rascunho volta a responder (oráculo).
    id: 'P6',
    desc: 'ler_vagas_das_minhas_candidaturas: sem AND c.is_rascunho = false',
    smoke: S52P,
    letra: 'h',
    requer: [V06],
    sql: () => trocar(fnVagas(), ' AND c.is_rascunho = false', '', 'P6'),
  },
  {
    // G-52-7 / D-52-G7-1: a vaga apagada por deleted_at some do retorno (contra a decisão do operador).
    id: 'P7',
    desc: 'ler_vagas_das_minhas_candidaturas: AND v.deleted_at IS NULL no WHERE',
    smoke: S52P,
    letra: 'i',
    requer: [V06],
    sql: () =>
      trocar(fnVagas(), P_VIVA, '     AND c.deleted_at IS NULL AND c.is_rascunho = false\n     AND v.deleted_at IS NULL;\n', 'P7'),
  },
  {
    // T-52-107: a guarda deixa de exigir o sub — papel candidato sem sub passa.
    id: 'P8',
    desc: 'ler_vagas_das_minhas_candidaturas: a guarda sem v_uid IS NULL OR',
    smoke: S52P,
    letra: 'e',
    requer: [V06],
    sql: () => trocar(fnVagas(), 'IF v_uid IS NULL OR ', 'IF ', 'P8'),
  },
  {
    // T-52-107: sem a guarda inteira — token sem claims chega à busca.
    id: 'P9',
    desc: 'ler_vagas_das_minhas_candidaturas: sem a guarda de papel',
    smoke: S52P,
    letra: 'e',
    requer: [V06],
    sql: () => trocar(fnVagas(), P_GUARDA_BLOCO, '', 'P9'),
  },
  {
    // T-52-102: o conjunto vira multiconjunto — uma junção 1:N acrescentada por engano depois da de vagas.
    id: 'P10',
    desc: 'ler_vagas_das_minhas_candidaturas: CROSS JOIN (VALUES (1), (2)) logo depois da juncao de vagas (cada candidatura duas vezes)',
    smoke: S52P,
    letra: 'd',
    requer: [V06],
    sql: () => trocar(fnVagas(), P_JUNCAO, P_JUNCAO + '    CROSS JOIN (VALUES (1), (2)) AS p10_dup(n)\n', 'P10'),
  },
  {
    // T-52-113: posse aberta — o predicado de candidato_le_propria_candidatura vira `true`.
    id: 'A1',
    desc: 'ler_testes_das_minhas_candidaturas: o predicado de posse vira true (toda candidatura viva de todos)',
    smoke: S52A,
    letra: 'b',
    requer: [V07],
    sql: () => trocar(fnTestes(), P_POSSE, 'true', 'A1'),
  },
  {
    // R1 do G-52-7 / D-52-G7B-2 (a truth): o filtro da vaga PÚBLICA volta ao WHERE — a bateria da vaga inativada some.
    id: 'A2',
    desc: "ler_testes_das_minhas_candidaturas: filtro de vaga publica (status = 'ativa' AND deleted_at IS NULL) no WHERE",
    smoke: S52A,
    letra: 'a',
    requer: [V07],
    sql: () =>
      trocar(
        fnTestes(),
        P_VIVA,
        "     AND c.deleted_at IS NULL AND c.is_rascunho = false\n     AND v.status = 'ativa' AND v.deleted_at IS NULL;\n",
        'A2'
      ),
  },
  {
    // T-52-114 (D-52-G7B-1): sobre-projeção — 'titulo', v.titulo entra como quarta chave.
    id: 'A3',
    desc: "ler_testes_das_minhas_candidaturas: 'titulo', v.titulo como quarta chave da projecao",
    smoke: S52A,
    letra: 'c',
    requer: [V07],
    sql: () => trocar(fnTestes(), A_PROJ_FIM, "'aplica_cognitivo', v.aplica_cognitivo,\n                                               'titulo', v.titulo)", 'A3'),
  },
  {
    // T-52-116 (D-52-G7B-3): a guarda passa a aceitar rh e administrador.
    id: 'A4',
    desc: 'ler_testes_das_minhas_candidaturas: a guarda aceita rh e administrador',
    smoke: S52A,
    letra: 'g',
    requer: [V07],
    sql: () =>
      trocar(
        fnTestes(),
        P_GUARDA,
        "  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('candidato', 'rh', 'administrador') THEN\n",
        'A4'
      ),
  },
  {
    // T-52-115: EXECUTE de volta a anon depois da migration (o pg_default_acl de public).
    id: 'A5',
    desc: 'GRANT EXECUTE de ler_testes_das_minhas_candidaturas a anon depois da migration',
    smoke: S52A,
    letra: 'f',
    requer: [V07],
    sql: 'GRANT EXECUTE ON FUNCTION public.ler_testes_das_minhas_candidaturas() TO anon;',
  },
  {
    // T-52-113: sem o filtro de rascunho — a candidatura rascunho volta a responder (oráculo).
    id: 'A6',
    desc: 'ler_testes_das_minhas_candidaturas: sem AND c.is_rascunho = false',
    smoke: S52A,
    letra: 'h',
    requer: [V07],
    sql: () => trocar(fnTestes(), ' AND c.is_rascunho = false', '', 'A6'),
  },
  {
    // D-52-G7B-2: a vaga apagada por deleted_at some do retorno (contra a decisão confirmada pelo operador).
    id: 'A7',
    desc: 'ler_testes_das_minhas_candidaturas: AND v.deleted_at IS NULL no WHERE',
    smoke: S52A,
    letra: 'i',
    requer: [V07],
    sql: () =>
      trocar(fnTestes(), P_VIVA, '     AND c.deleted_at IS NULL AND c.is_rascunho = false\n     AND v.deleted_at IS NULL;\n', 'A7'),
  },
  {
    // T-52-116: a guarda deixa de exigir o sub — papel candidato sem sub passa.
    id: 'A8',
    desc: 'ler_testes_das_minhas_candidaturas: a guarda sem v_uid IS NULL OR',
    smoke: S52A,
    letra: 'e',
    requer: [V07],
    sql: () => trocar(fnTestes(), 'IF v_uid IS NULL OR ', 'IF ', 'A8'),
  },
  {
    // T-52-116: sem a guarda inteira — token sem claims chega à busca.
    id: 'A9',
    desc: 'ler_testes_das_minhas_candidaturas: sem a guarda de papel',
    smoke: S52A,
    letra: 'e',
    requer: [V07],
    sql: () => trocar(fnTestes(), P_GUARDA_BLOCO, '', 'A9'),
  },
  {
    // T-52-113: o conjunto vira multiconjunto — uma junção 1:N acrescentada por engano depois da de vagas.
    id: 'A10',
    desc: 'ler_testes_das_minhas_candidaturas: CROSS JOIN (VALUES (1), (2)) logo depois da juncao de vagas (cada candidatura duas vezes)',
    smoke: S52A,
    letra: 'd',
    requer: [V07],
    sql: () => trocar(fnTestes(), P_JUNCAO, P_JUNCAO + '    CROSS JOIN (VALUES (1), (2)) AS a10_dup(n)\n', 'A10'),
  },
  {
    // T-52-117: o opt-in cognitivo vira constante — o sentinela alternado de (a) erra um dos status.
    id: 'A11',
    desc: "ler_testes_das_minhas_candidaturas: 'aplica_cognitivo', false no lugar do valor da vaga",
    smoke: S52A,
    letra: 'a',
    requer: [V07],
    sql: () => trocar(fnTestes(), A_PROJ_FIM, "'aplica_cognitivo', false)", 'A11'),
  },
  {
    // T-52-117: a bateria vira constante — o sentinela de (a) não volta.
    id: 'A12',
    desc: "ler_testes_das_minhas_candidaturas: 'testes_aplicaveis', '[]'::jsonb no lugar do valor da vaga",
    smoke: S52A,
    letra: 'a',
    requer: [V07],
    sql: () => trocar(fnTestes(), A_PROJ_TESTES, "'testes_aplicaveis', '[]'::jsonb,", 'A12'),
  },
  {
    // T-52-118 (WR-01 do 52-REVIEW-G7-1, não copiado): coluna de vagas com CAIXA mista — o POS da 0007 recusa.
    id: 'A13',
    desc: "migration 0007 com , 'titulo', v.Titulo acrescentado a ultima chave da projecao (RECUSA do POS)",
    smoke: S52A,
    recusa: A_RECUSA_POS,
    requer: [V07],
    migracao: { versao: V07, transformar: (t) => trocar(t, A_PROJ_FIM, "'aplica_cognitivo', v.aplica_cognitivo, 'titulo', v.Titulo)", 'A13') },
  },
  {
    // T-52-118 (WR-01 do 52-REVIEW-G7-1, não copiado): coluna de vagas ENTRE ASPAS — o POS da 0007 recusa.
    id: 'A14',
    desc: "migration 0007 com , 'titulo', v.\"titulo\" acrescentado a ultima chave da projecao (RECUSA do POS)",
    smoke: S52A,
    recusa: A_RECUSA_POS,
    requer: [V07],
    migracao: { versao: V07, transformar: (t) => trocar(t, A_PROJ_FIM, "'aplica_cognitivo', v.aplica_cognitivo, 'titulo', v.\"titulo\")", 'A14') },
  },
];

/* Primeira reprovação da saída, com QUALQUER prefixo. */
const RE_FALHA = /([A-Z][A-Z0-9-]*) FAIL \(([^)]+)\)(?::\s*\[([^\]]*)\])?/;
function falha(out) {
  const m = RE_FALHA.exec(String(out || ''));
  if (!m) return null;
  const resto = String(out).slice(m.index);
  const fimTexto = resto.search(/"|\\n|\n/);
  const texto = fimTexto < 0 ? resto : resto.slice(0, fimTexto);
  return {
    prefixo: m[1],
    letra: m[2],
    rotulos: m[3] ? m[3].split(',').map((x) => x.trim()).filter(Boolean) : [],
    inesperado: /erro INESPERADO/i.test(texto),
    texto: texto.slice(0, 400),
  };
}

function linhaSmoke(smoke) {
  const s = SMOKES[smoke];
  if (!s) throw new Error(`ERRO DO HARNESS: smoke sem linha em SMOKES: ${smoke}`);
  return s;
}

/* Veredito de UMA rodada de mutação, puro. { tipo: 'morde' | 'nao_morde' | 'inconclusivo', motivo, f } */
function julgarMutacao(m, r) {
  if (r.timeout) return { tipo: 'inconclusivo', motivo: r.timeout, f: null };
  if (r.serializacao) return { tipo: 'inconclusivo', motivo: 'SERIALIZACAO (40001)', f: null };
  const S = linhaSmoke(m.smoke);
  const f = falha(r.out);
  if (m.recusa !== undefined) {
    // Entrada de RECUSA (contrato (1)): `m.recusa` já resolvido para texto pelo chamador.
    let motivoR = null;
    if (typeof m.recusa !== 'string' || !m.recusa) motivoR = 'recusa esperada vazia ou nao resolvida — erro do harness';
    else if (r.sentinela) motivoR = `chegou ao sentinela (smokes=[${r.smokes}]) — a migration mutada nao foi recusada`;
    else if (f) motivoR = `reprovou em ${f.prefixo} FAIL (${f.letra}), nao no PRE — ${f.texto.slice(0, 200)}`;
    else if (!String(r.out).includes(m.recusa)) motivoR = `sem a recusa esperada na saida — ${E.primeiraFalha(r.out).slice(0, 300)}`;
    return { tipo: motivoR ? 'nao_morde' : 'morde', motivo: motivoR, f: null };
  }
  const exigidos = m.rotulos || [];
  let motivo = null;
  if (r.sentinela) motivo = `chegou ao sentinela (smokes=[${r.smokes}])`;
  else if (!f) motivo = `sem «<X> FAIL (…)» na saida — erro sem rotulo (${E.primeiraFalha(r.out).slice(0, 300)})`;
  else if (f.prefixo !== S.prefixo) motivo = `a primeira reprovacao e de outro prefixo (${f.prefixo} FAIL (${f.letra}); esperado ${S.prefixo}) — ${f.texto.slice(0, 200)}`;
  else if (f.inesperado) motivo = `reprovou em (${f.letra}) por erro INESPERADO do envelope — nada foi julgado, nao e mordida (${f.texto.slice(0, 200)})`;
  else if (f.letra !== m.letra) motivo = `reprovou em (${f.letra}), esperado (${m.letra}) — ${f.texto.slice(0, 200)}`;
  else if (f.rotulos.some((x) => x.startsWith('c_'))) motivo = `controle vacuo [${f.rotulos.join(',')}]`;
  else if (exigidos.some((x) => !f.rotulos.includes(x))) motivo = `reprovou em (${f.letra}) [${f.rotulos.join(',')}] sem o(s) rotulo(s) exigido(s) [${exigidos.join(',')}]`;
  return { tipo: motivo ? 'nao_morde' : 'morde', motivo, f };
}

/* Veredito do CONTROLE, puro: null = verde; senão { tipo: 'vermelho' | 'inconclusivo', motivo }. */
function julgarControle(smoke, r) {
  const S = linhaSmoke(smoke);
  if (r.timeout || r.serializacao) return { tipo: 'inconclusivo', motivo: r.timeout || 'SERIALIZACAO (40001)' };
  if (!r.sentinela) return { tipo: 'vermelho', motivo: `sentinela ausente (${E.primeiraFalha(r.out).slice(0, 300)})` };
  if (/FAIL \(/.test(r.out)) return { tipo: 'vermelho', motivo: `FAIL na saida (${E.primeiraFalha(r.out).slice(0, 300)})` };
  const par = E.lerPares(r.smokes).find((x) => x.k === S.par);
  if (!par) return { tipo: 'vermelho', motivo: `par ${S.par} ausente da sentinela (smokes=[${r.smokes || ''}])` };
  if (!/^[0-9]+$/.test(par.p || '') || par.p !== par.e) return { tipo: 'vermelho', motivo: `par ${par.k}=${par.p}/${par.e} (pass != esperado)` };
  return null;
}

/* Roda; um 40001 é repetido UMA vez; timeout ou 40001 de novo saem 3 (com a leitura de persistência). */
function rodarOuSair(corpo, rodada) {
  let r = E.rodar(corpo, `mut_${rodada}`);
  if (r.serializacao) {
    console.log(`SERIALIZACAO (40001): ${rodada} (${r.ms} ms) — INCONCLUSIVO (nao e mordida nem controle vermelho); repetindo UMA vez`);
    r = E.rodar(corpo, `mut_${rodada}_repeticao`);
  }
  if (r.timeout) sair(`${r.timeout}: ${rodada} (${r.ms} ms) — nada concluido sobre o portao; repetir mais tarde (subir o teto NAO e decisao do executor)`, 3);
  if (r.serializacao) sair(`INCONCLUSIVO — SERIALIZACAO (40001) duas vezes seguidas: ${rodada} (${r.ms} ms) — nada concluido sobre o portao; repetir mais tarde, sem laco`, 3);
  return r;
}

/* Conferência da CARGA (antes da baseline): ids únicos, smoke com linha, campos obrigatórios. */
function validarCarga() {
  const ids = new Set();
  for (const m of MUTACOES) {
    if (ids.has(m.id)) throw new Error(`ERRO DO HARNESS: id repetido ${m.id}`);
    ids.add(m.id);
    if (!SMOKES[m.smoke]) throw new Error(`ERRO DO HARNESS: ${m.id} aponta smoke sem linha em SMOKES: ${m.smoke}`);
    if (!Array.isArray(m.requer) || !m.requer.length) throw new Error(`ERRO DO HARNESS: ${m.id} sem requer`);
    if (m.recusa !== undefined) {
      // Entrada de RECUSA: migracao + recusa, sem letra nem sql (contrato (1)).
      if (m.letra || m.sql) throw new Error(`ERRO DO HARNESS: ${m.id} de recusa nao leva letra nem sql`);
      if (!m.migracao || typeof m.migracao.transformar !== 'function' || !m.requer.includes(m.migracao.versao)) {
        throw new Error(`ERRO DO HARNESS: ${m.id} de recusa sem migracao.transformar, ou migracao.versao fora de requer`);
      }
    } else if (!m.letra || !m.sql || m.migracao) {
      throw new Error(`ERRO DO HARNESS: ${m.id} sem letra/sql (ou com migracao sem recusa)`);
    }
    for (const v of m.requer) {
      if (!E.MIGS.some((x) => E.versao(x) === v)) throw new Error(`ERRO DO HARNESS: ${m.id} requer ${v}, que nao esta em MIGS do p52_ensaio`);
    }
  }
  for (const [k, s] of Object.entries(SMOKES)) {
    if (!s.prefixo || !s.par) throw new Error(`ERRO DO HARNESS: linha SMOKES incompleta: ${k}`);
    if (s.exigePrefixadas !== undefined) {
      if (!Array.isArray(s.exigePrefixadas) || !s.exigePrefixadas.length) throw new Error(`ERRO DO HARNESS: exigePrefixadas vazio ou nao lista: ${k}`);
      for (const v of s.exigePrefixadas) {
        if (!E.MIGS.some((x) => E.versao(x) === v)) throw new Error(`ERRO DO HARNESS: ${k} exige ${v} prefixada, que nao esta em MIGS do p52_ensaio`);
      }
    }
  }
}

/*
 * (7) APOSENTADORIA, PURA: as entradas cujo smoke exige versão prefixada que já está no ledger, e as
 * de RECUSA cuja migration já está no ledger. Devolve [{ id, smoke, versao }] na ordem DECLARADA.
 */
function aposentar(mutacoes, smokes, ledger) {
  const noLedger = new Set(ledger);
  const out = [];
  for (const m of mutacoes) {
    const exige = (smokes[m.smoke] && smokes[m.smoke].exigePrefixadas) || [];
    let v = exige.find((x) => noLedger.has(x));
    if (!v && m.migracao && noLedger.has(m.migracao.versao)) v = m.migracao.versao;
    if (v) out.push({ id: m.id, smoke: m.smoke, versao: v });
  }
  return out;
}

const linhaAposentada = (a) => `APOSENTADA: ${a.id} — ${a.smoke} so roda com ${a.versao} prefixada, e ${a.versao} esta no ledger desde o apply`;

/* `--so=` — as entradas pedidas, na ORDEM DECLARADA. PURA; id desconhecido ou lista vazia LANÇA. */
function selecionar(mutacoes, ids) {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('ERRO DO HARNESS: --so sem ids (lista vazia)');
  const conhecidos = new Set(mutacoes.map((m) => m.id));
  const desconhecidos = ids.filter((x) => !conhecidos.has(x));
  if (desconhecidos.length) throw new Error(`ERRO DO HARNESS: --so com id(s) desconhecido(s): ${desconhecidos.join(',')}`);
  const pedidos = new Set(ids);
  return mutacoes.filter((m) => pedidos.has(m.id));
}

/*
 * O que prefixar, PURO: no modo padrão, as migrations de MIGS (na ordem de MIGS) cuja versão alguma
 * entrada requer e que estão fora do ledger; no pós-apply, nenhuma — e toda versão requerida tem de
 * estar no ledger. Devolve { prefixadas: [caminho…] } ou lança.
 */
function planejarPrefixo(alvo, ledger, posApply) {
  const req = new Set(alvo.flatMap((m) => m.requer));
  const noLedger = new Set(ledger);
  if (posApply) {
    const faltam = [...req].filter((v) => !noLedger.has(v)).sort();
    if (faltam.length) throw new Error(`ERRO DO HARNESS: --pos-apply mas ${faltam.join(',')} fora do ledger — rode sem --pos-apply (migration prefixada)`);
    return { prefixadas: [] };
  }
  const prefixadas = E.MIGS.filter((m) => req.has(E.versao(m)) && !noLedger.has(E.versao(m)));
  for (const m of prefixadas) {
    if (!fs.existsSync(path.join(E.ROOT, m))) throw new Error(`ERRO DO HARNESS: migration requerida nao existe no disco: ${m}`);
  }
  return { prefixadas };
}

function principal() {
  let so = null;
  let posApply = false;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--so=')) so = a.slice('--so='.length).split(',').map((x) => x.trim()).filter(Boolean);
    else if (a === '--pos-apply') posApply = true;
    else sair(`opcao desconhecida: ${a}`);
  }
  let alvo = MUTACOES;
  let plano;
  let aposentadas = [];
  try {
    validarCarga();
    const ledger = E.lerEstado().ledger;
    // (7) aposentadoria: impressa, por versão no ledger; pedida em --so é erro; vácua é erro.
    aposentadas = aposentar(MUTACOES, SMOKES, ledger);
    for (const a of aposentadas) console.log(linhaAposentada(a));
    const idsAp = new Set(aposentadas.map((a) => a.id));
    if (so) {
      alvo = selecionar(MUTACOES, so);
      const pedidasAp = aposentadas.filter((a) => alvo.some((m) => m.id === a.id));
      if (pedidasAp.length) {
        throw new Error(`ERRO DO HARNESS: ${pedidasAp.map((a) => `${a.id} aposentada (${a.smoke} so roda com ${a.versao} prefixada, e ${a.versao} esta no ledger desde o apply)`).join('; ')} — nao roda mais; retire-a do --so`);
      }
    } else {
      alvo = MUTACOES.filter((m) => !idsAp.has(m.id));
    }
    if (!alvo.length) throw new Error('ERRO DO HARNESS: nenhuma entrada viva nesta rodada (todas aposentadas) — rodada vacua nao prova nada');
    // Cada `sql` é montado AGORA, antes da baseline: alvo de troca ausente/ambíguo para tudo
    // sem enviar nada (mutação que não se aplica não é teste).
    for (const m of alvo) if (typeof m.sql === 'function') m.sql();
    // Idem para as entradas de RECUSA: a troca no texto da migration e o texto da recusa.
    for (const m of alvo) {
      if (m.recusa === undefined) continue;
      m.migracao.transformar(mig(m.migracao.versao));
      if (typeof m.recusa === 'function') m.recusa();
    }
    plano = planejarPrefixo(alvo, ledger, posApply);
    for (const m of alvo) {
      if (m.migracao && !plano.prefixadas.some((x) => E.versao(x) === m.migracao.versao)) {
        throw new Error(`ERRO DO HARNESS: ${m.id} muta o texto da migration ${m.migracao.versao}, que nao e prefixada nesta execucao (ja no ledger, ou --pos-apply) — mutar migration que nao roda nao e teste`);
      }
    }
  } catch (e) {
    sair(e.message);
  }
  if (so) console.log(`selecao (--so): ${alvo.map((m) => m.id).join(',')}`);

  // ── baseline de persistência ─────────────────────────────────────────────
  antes = E.capturar();
  console.log(`modo: ${posApply ? 'pos-apply (sem migracoes)' : 'padrao'} prefixadas=[${plano.prefixadas.map(E.versao).join(',')}]`);
  console.log(
    `baseline: ledger=${JSON.stringify(antes.ledger.map((x) => x.v))} funcoes=${Object.keys(antes.funcoes).length} mutacoes_p52=${antes.mutacoes_p52.length} fixtures_p52=${JSON.stringify(antes.fixtures_p52)}`
  );

  const ordem = [];
  for (const m of alvo) if (!ordem.includes(m.smoke)) ordem.push(m.smoke);

  let mordem = 0;
  let contadas = 0;
  let seguidasSemMorder = 0;
  const naoMordem = [];
  for (const smoke of ordem) {
    const S = SMOKES[smoke];
    // ── CONTROLE deste smoke ──────────────────────────────────────────────
    let ctl;
    try {
      ctl = rodarOuSair(E.compor({ prefixadas: plano.prefixadas, arquivos: [smoke] }), `CONTROLE_${path.basename(smoke, '.sql')}`);
    } catch (e) {
      sair(`ERRO DO HARNESS: ${e.message}`);
    }
    const vc = julgarControle(smoke, ctl);
    if (vc && vc.tipo === 'inconclusivo') sair(`INCONCLUSIVO: CONTROLE (${smoke}) (${ctl.ms} ms) — ${vc.motivo}; nada concluido sobre o portao`, 3);
    if (vc) sair(`CONTROLE VERMELHO (${smoke}): ${vc.motivo} (${ctl.ms} ms)`);
    const par = E.lerPares(ctl.smokes).find((x) => x.k === S.par);
    console.log(`CONTROLE verde (${smoke}): par ${par.k}=${par.p}/${par.e} (${ctl.ms} ms)`);

    // ── MUTAÇÕES deste smoke ──────────────────────────────────────────────
    for (const m of alvo.filter((x) => x.smoke === smoke)) {
      contadas += 1;
      const sql = typeof m.sql === 'function' ? m.sql() : m.sql || null;
      const recusa = typeof m.recusa === 'function' ? m.recusa() : m.recusa;
      let prefixadas = plano.prefixadas;
      let r;
      try {
        if (m.migracao) {
          // A migration mutada vai a um arquivo temporário (nome começa pela versão) que a substitui SÓ nesta rodada.
          const original = plano.prefixadas.find((x) => E.versao(x) === m.migracao.versao);
          tmpMutacao = path.join(os.tmpdir(), `${m.migracao.versao}_p52_mutacao_${m.id}_${process.pid}.sql`);
          fs.writeFileSync(tmpMutacao, m.migracao.transformar(fs.readFileSync(path.join(E.ROOT, original), 'utf8')), 'utf8');
          prefixadas = plano.prefixadas.map((x) => (x === original ? tmpMutacao : x));
        }
        r = rodarOuSair(E.compor({ prefixadas, arquivos: [smoke], mutacao: sql, rotuloMutacao: `MUTACAO ${m.id}` }), m.id);
      } catch (e) {
        sair(`ERRO DO HARNESS: ${m.id}: ${e.message}`);
      } finally {
        apagarTmpMutacao();
      }
      const v = julgarMutacao(recusa === undefined ? m : { ...m, recusa }, r);
      if (v.tipo === 'inconclusivo') sair(`INCONCLUSIVO: ${m.id} (${r.ms} ms) — ${v.motivo}; nada concluido sobre o portao`, 3);
      if (v.motivo) {
        console.log(`NAO MORDE: ${m.id} (${m.desc}) — ${v.motivo} (${r.ms} ms)`);
        naoMordem.push(m.id);
        seguidasSemMorder += 1;
        if (seguidasSemMorder >= 2) sair('SUSPEITA DE INSTRUMENTO: duas mutacoes seguidas nao mordem — medir o harness antes de concluir qualquer coisa sobre o portao');
      } else {
        mordem += 1;
        seguidasSemMorder = 0;
        if (recusa !== undefined) {
          console.log(`${m.id} morde: ${m.desc} -> ${recusa} (${r.ms} ms)`);
        } else {
          const lst = v.f.rotulos.length ? ` [${v.f.rotulos.join(',')}]` : '';
          console.log(`${m.id} morde: ${m.desc} -> ${S.prefixo} FAIL (${v.f.letra})${lst} (${r.ms} ms)`);
        }
      }
    }
  }

  // ── NADA PERSISTIU ──────────────────────────────────────────────────────
  if (naoMordem.length) sair(`MUTACOES: NAO MORDEM: ${naoMordem.join(', ')}`);
  if (contadas === 0) sair('MUTACOES: nenhuma rodou — nada provado');
  if (!conferirPersistencia()) {
    antes = null; // já medido e reportado
    sair('PERSISTIU — ver a linha acima');
  }
  console.log(
    `MUTACOES: ${mordem}/${contadas} mordem; controle verde; nada persistiu${so ? ` (so=${alvo.map((m) => m.id).join(',')})` : ''}${posApply ? ' (pos-apply)' : ''}${aposentadas.length ? ` (aposentadas: ${aposentadas.map((a) => a.id).join(',')})` : ''}`
  );
}

module.exports = { MUTACOES, SMOKES, julgarMutacao, julgarControle, falha, validarCarga, selecionar, planejarPrefixo, aposentar, trocar, extrair };

if (require.main === module) {
  try {
    principal();
  } catch (e) {
    sair(`ERRO DO HARNESS: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  }
}
