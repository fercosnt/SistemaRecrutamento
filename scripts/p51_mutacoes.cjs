#!/usr/bin/env node
'use strict';
/*
 * p51_mutacoes.cjs — prova, por execução, que cada cláusula dos smokes da Onda B da Phase 51 MORDE.
 *
 * Cópia adaptada de `scripts/p50_mutacoes.cjs`, sobre a composição de `scripts/p51_ensaio.cjs`
 * (mesmo prefixo, mesmo sentinela `ENSAIO_P51_TERMINOU`, mesma via `p46apply.cjs run`). TODA
 * requisição termina no sentinela (ou numa reprovação antes dele): o endpoint executa o corpo
 * inteiro numa transação, então nada persiste. O modo é o PADRÃO do ensaio — prefixa as migrations
 * p51 que estão no disco e fora do ledger —, então o MESMO runner serve antes do apply (migration
 * prefixada) e depois dele (contra os objetos vivos, sem prefixo).
 *
 * CONTRATO DA ONDA B (os planos 51-08, 51-10 e 51-13 acrescentam ENTRADAS e linhas já previstas
 * em SMOKES; não acrescentam critérios):
 *
 * (1) ENTRADA `{ id, desc, smoke, letra, rotulos?, requer, sql }`.
 *       smoke    caminho do smoke relativo à raiz, exatamente como na tabela SMOKES;
 *       letra    o RÓTULO entre parênteses que a reprovação tem de trazer, por igualdade EXATA
 *                (`b` no P51A; `k` no P50C; `B25/nao_respondido` no P45M);
 *       rotulos  (opcional) lista que tem de aparecer INTEIRA em `<PREFIXO> FAIL (<letra>):
 *                [<rótulos>]`; rótulo `c_*` na lista = controle vácuo, não é mordida — «morde»
 *                quer dizer «morde PELA sonda que existe para ela», não por uma vizinha;
 *       requer   versões p51 de que a mutação depende (nem aplicada nem prefixável → `PULADA
 *                (migration ausente)`, não conta);
 *       sql      texto (ou função que o devolve, avaliada só quando a mutação roda) extraído da
 *                migration por âncora ÚNICA (`extrair`/`trocar`; âncora ausente/ambígua = sair com
 *                erro). Vai DEPOIS do prefixo de migrations e ANTES do smoke.
 *
 * (2) TABELA `SMOKES`, uma linha por smoke que alguma entrada pode morder: `{ prefixo, controle }`.
 *     Entrada cujo `smoke` não tem linha = erro do harness na CARGA, antes da baseline.
 *       controle.par  = '<k>'  → o par `<k>=pass/esperado` que a sentinela do ensaio reporta;
 *       controle.gate = { contador, chave, ancora, esperado } → para smoke cujo gate mora DENTRO do
 *                       arquivo (o RESUMO compara o próprio contador com o próprio `v_esperado` e
 *                       levanta se divergem, sem publicar par): o runner insere, entre o smoke e o
 *                       `E.FIM`, uma instrução que anexa ` <chave>=<current_setting(contador)>` a
 *                       `p51.evidencia`; verde exige `<chave>=<n>` com `n` LIDO DO PRÓPRIO SMOKE
 *                       (primeira casa de `esperado` depois da linha que começa por `ancora`) —
 *                       nunca uma constante aqui, nunca «chegou à sentinela» sozinho.
 *
 * (3) PARSER POR SMOKE, nunca um regex global de prefixo: a reprovação é a PRIMEIRA ocorrência de
 *     `<X> FAIL (<rótulo>)[: [<rótulos>]]` na saída, com QUALQUER prefixo `X`. Se não houver
 *     nenhuma, ou se o prefixo dela não for o da linha do smoke da entrada (p.ex. um `P51E FAIL
 *     (transacao)` do ensaio), é `NAO MORDE` com a primeira falha impressa — o erro NÃO capturado
 *     que atravessa o envelope do smoke (um 23514 dentro de um bloco cujo handler só captura o
 *     SQLSTATE do próprio envelope sai sem rótulo nenhum) cai aqui e nunca conta como mordida.
 *     Reprovação cujo texto traz `erro INESPERADO` (o idioma dos envelopes p49_44/p50/p51: «nada
 *     foi julgado») é `NAO MORDE` (WR-01 do p50). `40001` repete a rodada UMA vez e, de novo, sai 3
 *     INCONCLUSIVO; timeouts saem 3 sem concluir. `julgarMutacao` e `julgarControle` são PUROS (sem
 *     rede; `julgarControle` só lê o arquivo do smoke para o esperado do gate) e exportados.
 *
 * (4) CONTROLE de cada smoke usado por entrada contada, antes da primeira mutação dele. Verde =
 *     sentinela alcançada, nenhum `FAIL (` de NENHUM prefixo, e o par/gate da linha SMOKES. A
 *     mesma composição (com a instrução do gate) serve ao CONTROLE e às mutações daquele smoke.
 *     Vermelho = `CONTROLE VERMELHO (<smoke>): <motivo>` e parar.
 *
 * (5) SAÍDA: `CONTROLE verde (<smoke>): par <k>=<p>/<e> (<ms> ms)` ou `CONTROLE verde (<smoke>):
 *     gate <chave>=<n> de <n> (<ms> ms)`; `<id> morde: <desc> -> <PREFIXO> FAIL (<letra>)[
 *     [<rótulos>]] (<ms> ms)`; `NAO MORDE: <id> (<desc>) — <motivo>`; duas não-mordidas seguidas =
 *     `SUSPEITA DE INSTRUMENTO`. Persistência por `E.capturar()` antes do primeiro CONTROLE e
 *     depois do laço — e em TODA saída anormal depois da baseline —, diferença = `PERSISTIU`.
 *     Linha final exata: `controle verde; <n>/<n> mutacoes mordem; nada persistiu`.
 *
 * LOCK: o do prefixo do ensaio (`lock_timeout 3s` / `statement_timeout 5s`); duração impressa.
 *
 * Uso: node scripts/p51_mutacoes.cjs        (sem dependências; `require` não roda nada)
 */

const fs = require('fs');
const path = require('path');
const E = require('./p51_ensaio.cjs');

const SMOKES = {
  'supabase/tests/p51_raven_status_smoke.sql': { prefixo: 'P51A', controle: { par: '51a' } },
  'supabase/tests/p51_revisao_rejeicao_smoke.sql': { prefixo: 'P51B', controle: { par: '51b' } },
  'supabase/tests/p50_acesso_recrutador_smoke.sql': { prefixo: 'P50C', controle: { par: '50' } },
  'supabase/tests/p45_motor_exclusao_smoke.sql': {
    prefixo: 'P45M',
    controle: { gate: { contador: 'smoke45m.pass', chave: '45m', ancora: '-- (z) RESUMO', esperado: /\bv_esperado int := (\d+);/ } },
  },
};

/* Baseline de persistência; null até ser lida. */
let antes = null;

/* Lê de novo e compara com a baseline. Devolve true sse nada persistiu. */
function conferirPersistencia() {
  const depois = E.capturar();
  const dif = E.diferencas(antes, depois);
  if (dif.length) {
    console.error(`PERSISTIU: ${dif.join(' ; ')}`);
    return false;
  }
  console.log(
    `leitura so-leitura igual a baseline: ledger=${JSON.stringify(depois.ledger.map((x) => x.v))} funcoes=${Object.keys(depois.funcoes).length} revisao_rejeicao=${depois.revisao.existe || 'ausente'} mutacoes=${depois.mutacoes.length} fixtures=${JSON.stringify(depois.fixtures)}`
  );
  return true;
}

/* TODA saída passa por aqui. Depois da baseline, mede a persistência antes de sair. */
function sair(msg, codigo = 1) {
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

/* Texto de uma migration p51 pela versão (lido do disco; ausente = erro do harness). */
function mig(versao) {
  const m = E.MIGS.find((x) => E.versao(x) === versao);
  if (!m || !fs.existsSync(path.join(E.ROOT, m))) sair(`ANCORA AUSENTE/AMBIGUA: migration ${versao} nao existe no disco`);
  return fs.readFileSync(path.join(E.ROOT, m), 'utf8');
}

/* Um trecho da migration, delimitado por um início LITERAL único e um fim literal. */
function extrair(texto, inicio, fim, rotulo) {
  const n = texto.split(inicio).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (inicio «${inicio}» ocorre ${n} vez(es))`);
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  if (b < 0) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} (fim «${fim}» nao encontrado)`);
  return texto.slice(a, b + fim.length);
}

/* Troca textual sobre uma âncora LITERAL que tem de ocorrer exatamente uma vez no trecho. */
function trocar(trecho, ancora, novo, rotulo) {
  const n = trecho.split(ancora).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} («${ancora}» ocorre ${n} vez(es) no trecho)`);
  return trecho.replace(ancora, () => novo);
}

/* `CREATE OR REPLACE FUNCTION public.<nome>(` … `$function$;` de uma migration p51. */
const fn = (versao, nome) => extrair(mig(versao), `CREATE OR REPLACE FUNCTION public.${nome}(`, '$function$;', nome);

// ── 51-06: get_avaliacao_status (migration 20261008000001) ───────────────────
const V01 = '20261008000001';
const S51A = 'supabase/tests/p51_raven_status_smoke.sql';
const fnStatus = () => fn(V01, 'get_avaliacao_status');

// ── 51-08: pedido de revisão para toda rejeição (migration 20261008000002) ──
const V02 = '20261008000002';
const S51B = 'supabase/tests/p51_revisao_rejeicao_smoke.sql';
const fnSol = () => fn(V02, 'solicitar_revisao_rejeicao');
const fnEst = () => fn(V02, 'estado_revisao_rejeicao');
const fnResp = () => fn(V02, 'responder_revisao_rejeicao');

// ── 51-10: a fila do RH com as três origens, o KPI e o prazo (migration 20261008000003) ──
const V03 = '20261008000003';
const S50 = 'supabase/tests/p50_acesso_recrutador_smoke.sql';
/* `CREATE FUNCTION public.<nome>(` … `$function$;` de uma migration p51, reescrito como `CREATE OR REPLACE
 * FUNCTION` com assinatura e RETURNS idênticos: vale com a migration prefixada e, no modo pós-apply do
 * 51-16, contra o objeto vivo — um `CREATE FUNCTION` puro daria 42723 depois da migration e o runner o
 * contaria como não-mordida (a 0003 cria `listar_revisoes_decisao` por DROP + CREATE e
 * `ler_contexto_knockout_revisao` por CREATE). */
const fnNova = (versao, nome) => {
  const t = extrair(mig(versao), `CREATE FUNCTION public.${nome}(`, '$function$;', nome);
  return 'CREATE OR REPLACE FUNCTION' + t.slice('CREATE FUNCTION'.length);
};
const fnListar = () => fnNova(V03, 'listar_revisoes_decisao');
const fnCtx = () => fnNova(V03, 'ler_contexto_knockout_revisao');
const fnContar = () => fn(V03, 'contar_revisoes_pendentes');
const fnFunil = () => fn(V03, 'funil_kpis');
const fnVarrer = () => fn(V03, 'varrer_prazos_reabertura');

// ── 51-13: o motor raspa a resposta do revisor no registro novo (migration 20261008000004) ──
const V04 = '20261008000004';
const S45M = 'supabase/tests/p45_motor_exclusao_smoke.sql';
/* `CREATE OR REPLACE FUNCTION public.<nome>(` … o delimitador NOMEADO `$<nome>$` que FECHA o corpo,
 * mais `;`. A 0004 usa delimitadores nomeados (o `fn` acima procura `$function$;`, que la nao existe):
 * o delimitador tem de ocorrer EXATAMENTE duas vezes no arquivo (abre e fecha), senao a extracao
 * casaria uma mencao em prosa (a armadilha do 46-02) — erro do harness. */
const fnNomeada = (versao, nome) => {
  const t = mig(versao);
  const ini = `CREATE OR REPLACE FUNCTION public.${nome}(`;
  const D = '$' + nome + '$';
  const nIni = t.split(ini).length - 1;
  const nD = t.split(D).length - 1;
  if (nIni !== 1 || nD !== 2) sair(`ANCORA AUSENTE/AMBIGUA: ${nome} na ${versao} (inicio ${nIni} vez(es), delimitador ${D} ${nD} vez(es); exigido 1 e 2)`);
  const a = t.indexOf(ini);
  const d1 = t.indexOf(D);
  const d2 = t.indexOf(D, d1 + D.length);
  if (d1 < a) sair(`ANCORA AUSENTE/AMBIGUA: ${nome} — o delimitador ${D} aparece antes do CREATE`);
  return t.slice(a, d2 + D.length) + ';';
};
const fnMotor = () => fnNomeada(V04, 'anonimizar_candidato');
/* O statement que comeca na ancora (unica) e termina no primeiro `;` FORA DE LITERAL — varredura que
 * alterna dentro/fora a cada aspa (o '' de escape alterna duas vezes e volta ao mesmo estado). A
 * sentinela que o passo copia contem `foi removido;`: um indexOf(';') cortaria DENTRO dela e a 0004
 * mutada sairia com erro de sintaxe (42601), que o runner mostraria como NAO MORDE acusando a
 * assercao certa. O trecho e recortado do ARQUIVO em tempo de execucao e passado ao `trocar` como
 * ancora — nunca copiado para ca (49-PATTERNS §K: o literal da sentinela nao mora fora do motor). */
function statementForaDeLiteral(texto, inicio, rotulo) {
  const n = texto.split(inicio).length - 1;
  if (n !== 1) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} («${inicio}» ocorre ${n} vez(es))`);
  const a = texto.indexOf(inicio);
  let dentro = false;
  for (let i = a; i < texto.length; i++) {
    const c = texto[i];
    if (c === "'") dentro = !dentro;
    else if (c === ';' && !dentro) {
      const st = texto.slice(a, i + 1);
      // sanidade do corte: o statement inteiro tem o WHERE escopado; um corte que terminasse dentro
      // do literal o perderia — erro do harness, nunca uma mutacao mal formada mandada ao banco
      if (!/WHERE[\s\S]*candidato_id\s*=\s*p_candidato_id\)?;$/.test(st)) sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} — o corte no primeiro ; fora de literal nao terminou no WHERE escopado (${JSON.stringify(st.slice(-80))})`);
      return st;
    }
  }
  return sair(`ANCORA AUSENTE/AMBIGUA: ${rotulo} — sem ; fora de literal depois de «${inicio}»`);
}

const MUTACOES = [
  {
    // (b) RNF-07a: um número do Raven entra na chave. Com a fixture sem score a folha é null; com
    // score, é número — nos dois casos uma folha NÃO booleana, e raven passa a ter 3 chaves.
    id: 'MA1',
    desc: 'raven ganha um terceiro campo numerico lido de scores_raven.percentil',
    smoke: S51A,
    letra: 'b',
    requer: [V01],
    sql: () =>
      trocar(
        fnStatus(),
        "'registrado', EXISTS (SELECT 1 FROM public.scores_raven s",
        "'percentil', (SELECT s.percentil FROM public.scores_raven s WHERE s.candidatura_id = p_candidatura_id),\n      'registrado', EXISTS (SELECT 1 FROM public.scores_raven s",
        'MA1'
      ),
  },
  {
    // (d) IDOR: a guarda de titular desligada — o intruso, o rh e o sem-claims leem.
    id: 'MA2',
    desc: 'guarda de titular desligada (IF NOT v_owns vira IF false)',
    smoke: S51A,
    letra: 'd',
    requer: [V01],
    sql: () => trocar(fnStatus(), 'IF NOT v_owns THEN', 'IF false THEN', 'MA2'),
  },
  {
    // (a) o aperto nomeado desfeito: EXECUTE de volta a anon depois da migration.
    id: 'MA3',
    desc: 'GRANT EXECUTE de get_avaliacao_status a anon depois da migration',
    smoke: S51A,
    letra: 'a',
    requer: [V01],
    sql: 'GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO anon;',
  },
  {
    // (c) registrado lido da tabela errada — com liberação e sem score, registrado vira true.
    id: 'MA4',
    desc: 'registrado passa a ler cognitivo_liberacao em vez de scores_raven',
    smoke: S51A,
    letra: 'c',
    requer: [V01],
    sql: () => trocar(fnStatus(), 'FROM public.scores_raven s', 'FROM public.cognitivo_liberacao s', 'MA4'),
  },
  {
    // (c) liberado ignora a revogação — com revogado_em preenchido, liberado segue true.
    id: 'MA5',
    desc: 'liberado ignora revogado_em',
    smoke: S51A,
    letra: 'c',
    requer: [V01],
    sql: () => trocar(fnStatus(), '\n                               AND l.revogado_em IS NULL', '', 'MA5'),
  },
  {
    // (e) RNF-07a por forma: o corpo passa a LER o número do Raven sem devolvê-lo — a saída segue
    // só booleana ((b) passa), e só a cláusula de forma o vê. Acrescentada na execução do 51-06
    // para que (e) tenha mutação própria (MA1 quebra (b) antes de chegar a ela).
    id: 'MA6',
    desc: 'corpo le scores_raven.percentil sem devolve-lo (saida segue booleana)',
    smoke: S51A,
    letra: 'e',
    requer: [V01],
    sql: () =>
      trocar(
        fnStatus(),
        '\n  RETURN r;',
        '\n  PERFORM (SELECT s.percentil FROM public.scores_raven s WHERE s.candidatura_id = p_candidatura_id);\n  RETURN r;',
        'MA6'
      ),
  },

  // ── 51-08: pedido de revisão para toda rejeição (migration 20261008000002) ──
  // Toda mutação morde sobre linhas que a FIXTURE da cláusula alvo cria: a `revisao_rejeicao` viva
  // nasce vazia (D-08), então nenhuma cláusula depende dela para morder.
  {
    // (e) REVISAO-05 desligada — A responde a revisão da própria rejeição (fixture `tri`).
    id: 'MB1',
    desc: 'REVISAO-05 desligada (IF da guarda do decisor vira IF false)',
    smoke: S51B,
    letra: 'e',
    requer: [V02],
    sql: () => trocar(fnResp(), 'IF v_row.rejeitado_por IS NOT NULL AND v_row.rejeitado_por = v_uid THEN', 'IF false THEN', 'MB1'),
  },
  {
    // (e) helper fora do ramo rh — o recrutador INATIVO responde o pedido de `tri`.
    id: 'MB2',
    desc: 'is_active_rh_user() fora do ramo rh (a linha vira IF false)',
    smoke: S51B,
    letra: 'e',
    requer: [V02],
    sql: () => trocar(fnResp(), "IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN", 'IF false THEN', 'MB2'),
  },
  {
    // (a) EXECUTE de volta a anon na RPC do titular.
    id: 'MB3',
    desc: 'GRANT EXECUTE de solicitar_revisao_rejeicao a anon',
    smoke: S51B,
    letra: 'a',
    requer: [V02],
    sql: 'GRANT EXECUTE ON FUNCTION public.solicitar_revisao_rejeicao(uuid) TO anon;',
  },
  {
    // (a) privilégio de tabela a anon — a RLS sozinha devolveria 0 linhas; a sonda distingue.
    id: 'MB4',
    desc: 'GRANT SELECT em revisao_rejeicao a anon',
    smoke: S51B,
    letra: 'a',
    requer: [V02],
    sql: 'GRANT SELECT ON public.revisao_rejeicao TO anon;',
  },
  {
    // (f) reabertura só pelo status — sem etapa_atual no SET, avancar_etapa não roda: a candidatura
    // fica na etapa `rejeitado` (ou `inscricao`) com status em_analise e sem trilha.
    id: 'MB5',
    desc: 'reabertura so pelo status (sem etapa_atual no SET)',
    smoke: S51B,
    letra: 'f',
    requer: [V02],
    sql: () => trocar(fnResp(), "SET etapa_atual = v_row.etapa_reabertura,\n           status = 'em_analise',", "SET status = 'em_analise',", 'MB5'),
  },
  {
    // REDECLARADA de (f) para (b) na execução do 51-08: a etapa de reabertura é GRAVADA NO PEDIDO
    // (escolha 3 do planejador), e (b) assere `etapa_reabertura = triagem` no pedido do knockout
    // (D-30) — a mutação aparece ali, antes de chegar à reabertura de (f). Nenhuma cláusula foi
    // afrouxada: (f) continua exigindo `triagem` na candidatura reaberta (MB5 morde (f)).
    id: 'MB6',
    desc: 'knockout reabre em inscricao (etapa_reabertura do knockout vira inscricao e o CHECK cai)',
    smoke: S51B,
    letra: 'b',
    requer: [V02],
    sql: () =>
      'ALTER TABLE public.revisao_rejeicao DROP CONSTRAINT ck_revisao_rejeicao_knockout_triagem;\n' +
      trocar(
        fnSol(),
        "CASE WHEN v_origem = 'automatica' THEN 'triagem'::public.etapa_processo ELSE v_de END",
        "CASE WHEN v_origem = 'automatica' THEN 'inscricao'::public.etapa_processo ELSE v_de END",
        'MB6'
      ),
  },
  {
    // (d) um pedido por rejeição desfeito — o segundo pedido de `c400` grava outra linha.
    id: 'MB7',
    desc: 'UNIQUE de historico_rejeicao_id removida e ON CONFLICT trocado por INSERT simples',
    smoke: S51B,
    letra: 'd',
    requer: [V02],
    sql: () =>
      'ALTER TABLE public.revisao_rejeicao DROP CONSTRAINT uq_revisao_rejeicao_historico;\n' +
      trocar(fnSol(), '\n  ON CONFLICT (historico_rejeicao_id) DO NOTHING;', ';', 'MB7'),
  },
  {
    // (b) a forma do defeito C-4: guarda de titular comparando candidatos.id com auth.uid().
    id: 'MB8',
    desc: 'guarda de titular compara candidatos.id com auth.uid() (forma do C-4)',
    smoke: S51B,
    letra: 'b',
    requer: [V02],
    sql: () => trocar(fnSol(), 'SELECT ca.user_id, c.status, c.opcao_knockout_id', 'SELECT ca.id, c.status, c.opcao_knockout_id', 'MB8'),
  },
  {
    // (i) uma segunda escritora do knockout aparece em public (D-03 por forma).
    id: 'MB9',
    desc: 'cria public.p51_mutacao_knockout() que faz UPDATE public.candidaturas SET motivo_rejeicao = knockout_automatico',
    smoke: S51B,
    letra: 'i',
    requer: [V02],
    sql:
      'CREATE FUNCTION public.p51_mutacao_knockout() RETURNS void LANGUAGE sql AS $mb9$ ' +
      "UPDATE public.candidaturas SET motivo_rejeicao = 'knockout_automatico' WHERE false $mb9$;",
  },
  {
    // (h) D-36 desligado — a revertida do knockout não despacha a análise.
    id: 'MB10',
    desc: 'despacho da analise removido da revertida do knockout',
    smoke: S51B,
    letra: 'h',
    requer: [V02],
    sql: () => trocar(fnResp(), "IF v_row.origem = 'automatica' THEN", 'IF false THEN', 'MB10'),
  },
  {
    // (k) a allowlist do titular vaza o UUID de quem rejeitou dentro de `pedido` (fixture `k`).
    id: 'MB11',
    desc: 'estado_revisao_rejeicao expoe rejeitado_por dentro de pedido',
    smoke: S51B,
    letra: 'k',
    requer: [V02],
    sql: () => trocar(fnEst(), "'solicitada_em', r.solicitada_em,", "'solicitada_em', r.solicitada_em,\n        'rejeitado_por', r.rejeitado_por,", 'MB11'),
  },
  {
    // (j) predicado de dono desligado nas duas RPCs do titular: a rejeição por registrar_decisao
    // (fixture `rd`) fica elegível TAMBÉM no registro novo — dois caminhos para uma rejeição.
    id: 'MB12',
    desc: 'predicado de dono decisao_final desligado (rejeicao por registrar_decisao fica elegivel no registro novo)',
    smoke: S51B,
    letra: 'j',
    requer: [V02],
    sql: () =>
      trocar(fnSol(), 'IF EXISTS (SELECT 1 FROM public.decisao_final d', 'IF false AND EXISTS (SELECT 1 FROM public.decisao_final d', 'MB12 solicitar') +
      '\n' +
      trocar(fnEst(), 'IF EXISTS (SELECT 1 FROM public.decisao_final d', 'IF false AND EXISTS (SELECT 1 FROM public.decisao_final d', 'MB12 estado'),
  },
  {
    // (c) guarda de titular DESLIGADA no pedido — o intruso X pede a revisão de `tri`. Acrescentada
    // na execução do 51-08 para que (c) tenha mutação própria (MB8, a forma C-4, reprova (b) antes).
    id: 'MB13',
    desc: 'guarda de titular do pedido desligada (IF da guarda vira IF false)',
    smoke: S51B,
    letra: 'c',
    requer: [V02],
    sql: () => trocar(fnSol(), 'IF v_uid IS NULL OR v_dono IS DISTINCT FROM v_uid THEN', 'IF false THEN', 'MB13'),
  },
  {
    // (g) «já respondida» desligada — a segunda resposta ao pedido de `mant` (mantida) é aceita e
    // reabre. Acrescentada na execução do 51-08 para que (g) tenha mutação própria.
    id: 'MB14',
    desc: 'guarda de revisao ja respondida desligada (IF vira IF false)',
    smoke: S51B,
    letra: 'g',
    requer: [V02],
    sql: () => trocar(fnResp(), 'IF v_row.respondida_em IS NOT NULL THEN', 'IF false THEN', 'MB14'),
  },

  // ── 51-10: a fila do RH com as três origens, o KPI e o prazo (migration 20261008000003) ──
  // REGRA DE POPULAÇÃO (revisão 2 do plano): uma mutação só é declarada contra uma cláusula se mudar
  // a saída que ela observa SOBRE AS LINHAS QUE O MUNDO DELA CONTÉM — a fixture da própria cláusula
  // ou a população viva. A `revisao_rejeicao` viva nasce vazia (D-08): nenhuma mutação do ramo novo
  // pode ser julgada por um smoke que não semeia pedidos.
  {
    // (k) do p50: o RH ativo perde as revisões da DECISÃO FINAL — o único ramo que o mundo do (k)
    // popula (as revisões pendentes vivas, ou a que ele semeia). O md5 admin × rh ativo diverge.
    id: 'MC1a',
    desc: 'ramo decisao_final de listar_revisoes_decisao exige v_role = administrador',
    smoke: S50,
    letra: 'k',
    rotulos: ['igual.listar_revisoes_decisao_true', 'igual.listar_revisoes_decisao_false'],
    requer: [V02, V03],
    sql: () =>
      trocar(fnListar(), 'AND (p_incluir_respondidos OR d.revisao_respondida_em IS NULL)',
        "AND (p_incluir_respondidos OR d.revisao_respondida_em IS NULL)\n         AND v_role = 'administrador'", 'MC1a'),
  },
  {
    // (l): o RH ativo de papel rh perde os pedidos das origens novas (tri e ko da fixture de (l)).
    id: 'MC1b',
    desc: 'ramo revisao_rejeicao de listar_revisoes_decisao exige v_role = administrador',
    smoke: S51B,
    letra: 'l',
    requer: [V02, V03],
    sql: () =>
      trocar(fnListar(), 'WHERE (p_incluir_respondidos OR rr.respondida_em IS NULL)',
        "WHERE (p_incluir_respondidos OR rr.respondida_em IS NULL)\n         AND v_role = 'administrador'", 'MC1b'),
  },
  {
    // (m): o contador passa a contar o pedido RESPONDIDO (resp, da fixture de (m)).
    id: 'MC2',
    desc: 'ramo revisao_rejeicao de contar_revisoes_pendentes perde respondida_em IS NULL',
    smoke: S51B,
    letra: 'm',
    requer: [V02, V03],
    sql: () => trocar(fnContar(), 'WHERE rr.respondida_em IS NULL', 'WHERE true', 'MC2'),
  },
  {
    // (l): pode_responder do ramo novo ignora rejeitado_por — A vê "pode responder" no pedido de tri
    // (PENDENTE, rejeitado por A, da fixture de (l)).
    id: 'MC3',
    desc: 'pode_responder do ramo revisao_rejeicao ignora rejeitado_por (REVISAO-05)',
    smoke: S51B,
    letra: 'l',
    requer: [V02, V03],
    sql: () => trocar(fnListar(), '(rr.respondida_em IS NULL AND rr.rejeitado_por IS DISTINCT FROM v_uid)', '(rr.respondida_em IS NULL)', 'MC3'),
  },
  {
    // (o): o knockout revertido da fixture de (o) segue contado no knockout_rate.
    id: 'MC4',
    desc: 'funil_kpis sem o filtro de status no CTE ko (D-35 desfeito)',
    smoke: S51B,
    letra: 'o',
    requer: [V02, V03],
    sql: () =>
      trocar(fnFunil(), "FILTER (WHERE c.motivo_rejeicao = 'knockout_automatico' AND c.status = 'rejeitado')",
        "FILTER (WHERE c.motivo_rejeicao = 'knockout_automatico')", 'MC4'),
  },
  {
    // (n): o recrutador INATIVO lê o contexto do knockout da fixture de (n).
    id: 'MC5',
    desc: 'ler_contexto_knockout_revisao sem a linha do is_active_rh_user() (vira IF false)',
    smoke: S51B,
    letra: 'n',
    requer: [V02, V03],
    sql: () => trocar(fnCtx(), "IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN", 'IF false THEN', 'MC5'),
  },
  {
    // (p): sem a marcação no laço novo, a 2ª varredura enfileira de novo o alerta do ko da fixture de (p).
    id: 'MC6',
    desc: 'varrer_prazos_reabertura sem a marcacao de alerta_prazo_enviado_em no laco de revisao_rejeicao',
    smoke: S51B,
    letra: 'p',
    requer: [V02, V03],
    sql: () =>
      trocar(fnVarrer(), '    UPDATE public.revisao_rejeicao\n       SET alerta_prazo_enviado_em = pg_catalog.now()\n     WHERE id = q.id;\n', '', 'MC6'),
  },
  {
    // (p) WR-06 DESFEITO (o comportamento de antes do conserto): qualquer upsert em decisao_final depois
    // da reabertura — inclusive o em_espera do `dfd` da fixture de (p) — volta a silenciar o alerta.
    id: 'MC9',
    desc: 'laco de revisao_rejeicao volta a tratar em_espera como nova decisao (WR-06 desfeito)',
    smoke: S51B,
    letra: 'p',
    requer: [V02, V03],
    sql: () => trocar(fnVarrer(), "\n                          AND d.decisao IN ('aprovado', 'rejeitado'))", ')', 'MC9'),
  },
  {
    // (p) o outro lado do mesmo predicado: a «nova decisão depois da reabertura» desligada — o `dfx` da
    // fixture de (p) (rejeitado por B depois da reabertura, ciclo de decisao_final revertido) é alertado.
    id: 'MC10',
    desc: 'laco de revisao_rejeicao ignora a nova decisao depois da reabertura (NOT EXISTS sempre verdadeiro)',
    smoke: S51B,
    letra: 'p',
    requer: [V02, V03],
    sql: () => trocar(fnVarrer(), "AND d.decisao IN ('aprovado', 'rejeitado'))", 'AND false)', 'MC10'),
  },
  {
    // (i) do p50 — a entrada NOVA do MAPA (51-10) morde: sem o helper, o token velho passa da
    // autorização (P0002 do pedido inexistente em vez de 42501).
    id: 'MC7',
    desc: 'ler_contexto_knockout_revisao sem o helper — sonda (i) do p50',
    smoke: S50,
    letra: 'i',
    rotulos: ['velho.ler_contexto_knockout_revisao/1'],
    requer: [V02, V03],
    sql: () => trocar(fnCtx(), "IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN", 'IF false THEN', 'MC7'),
  },
  {
    // (i) do p50 — a outra entrada nova do MAPA: responder_revisao_rejeicao sem o helper.
    id: 'MC8',
    desc: 'responder_revisao_rejeicao sem o helper — sonda (i) do p50',
    smoke: S50,
    letra: 'i',
    rotulos: ['velho.responder_revisao_rejeicao/3'],
    requer: [V02],
    sql: () => trocar(fnResp(), "IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN", 'IF false THEN', 'MC8'),
  },
  {
    // (B25/respondido) do p45 — o passo novo removido: o UPDATE de revisao_rejeicao vira `NULL;`
    // (a contagem v_n_rr_res FICA, para o jsonb de retorno continuar igual e a mordida ser da
    // execucao, nao da contagem). Nada e escrito, nenhum CHECK em jogo: o pedido respondido
    // conserva o texto do revisor.
    id: 'MD1',
    desc: 'passo novo removido — o UPDATE de revisao_rejeicao vira NULL; (a contagem fica)',
    smoke: S45M,
    letra: 'B25/respondido',
    requer: [V02, V04],
    sql: () => {
      const motor = fnMotor();
      return trocar(motor, statementForaDeLiteral(motor, 'UPDATE public.revisao_rejeicao', 'MD1'), 'NULL;', 'MD1');
    },
  },
  {
    // (B25/nao_respondido) do p45 — SENTINELA SECA: a guarda do UPDATE novo vira `CASE WHEN false`,
    // e o ELSE <sentinela> passa a valer para todo pedido (o literal nunca e escrito aqui, §K).
    // ⚠ O CHECK de coerencia `(veredito IS NULL) = (resultado IS NULL)` da 0002 e DERRUBADO NA
    //   PROPRIA MUTACAO (rota 1 do fix_hint do checker): com ele de pe o motor mutado levanta 23514
    //   DENTRO do bloco B do smoke, cujo unico handler e `WHEN sqlstate 'P45B0'`, o erro atravessa o
    //   DO sem P45M FAIL e a mutacao nao e julgavel. A rota 2 (embrulhar a chamada do motor) foi
    //   recusada: aquela chamada e a do (B2), compartilhada pela especificacao inteira, e capturar
    //   23514 ali roubaria do (B2)/(B3) a classe de erro que eles existem para expor. O CHECK e a
    //   SEGUNDA defesa; o portao sob prova aqui e a ASSERCAO, que tem de morder sozinha. O CHECK de
    //   comprimento (>= 50) fica de pe — a sentinela o satisfaz.
    // ⚠ O CHECK e achado POR FORMA (o unico CHECK de revisao_rejeicao cuja definicao contem
    //   `veredito IS NULL` E `resultado IS NULL`), nunca pelo nome; zero ou mais de um =
    //   MUTACAO MD2 INVALIDA (o runner a mostra como NAO MORDE, nunca como mordida). Como o MB6.
    //   No modo pos-apply (51-16) o ALTER segura AccessExclusiveLock na revisao_rejeicao viva so
    //   durante a requisicao que aborta (lock_timeout 3s).
    id: 'MD2',
    desc: 'sentinela seca (CASE WHEN false) com o CHECK de coerencia veredito/resultado derrubado por forma',
    smoke: S45M,
    letra: 'B25/nao_respondido',
    requer: [V02, V04],
    sql: () =>
      'DO $md2$\n' +
      'DECLARE v_nomes text[];\n' +
      'BEGIN\n' +
      '  SELECT array_agg(co.conname::text) INTO v_nomes\n' +
      '    FROM pg_catalog.pg_constraint co\n' +
      "   WHERE co.conrelid = 'public.revisao_rejeicao'::regclass AND co.contype = 'c'\n" +
      "     AND position('veredito IS NULL' IN pg_catalog.pg_get_constraintdef(co.oid)) > 0\n" +
      "     AND position('resultado IS NULL' IN pg_catalog.pg_get_constraintdef(co.oid)) > 0;\n" +
      '  IF coalesce(array_length(v_nomes, 1), 0) <> 1 THEN\n' +
      "    RAISE EXCEPTION 'MUTACAO MD2 INVALIDA: % CHECK(s) de coerencia veredito/resultado em revisao_rejeicao (exigido 1): %', coalesce(array_length(v_nomes, 1), 0), coalesce(array_to_string(v_nomes, ','), '<nenhum>');\n" +
      '  END IF;\n' +
      "  EXECUTE format('ALTER TABLE public.revisao_rejeicao DROP CONSTRAINT %I', v_nomes[1]);\n" +
      'END\n' +
      '$md2$;\n' +
      trocar(fnMotor(), 'CASE WHEN r.resultado IS NULL THEN NULL', 'CASE WHEN false THEN NULL', 'MD2'),
  },
];

/* Primeira reprovação da saída, com QUALQUER prefixo. `inesperado` = o envelope abortou por erro
 * que não é a sonda reprovando («nada foi julgado») — nunca é mordida. */
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

/* O esperado do gate interno, LIDO do próprio smoke: primeira casa de `esperado` depois da linha
 * (única) que começa por `ancora`. Âncora ausente/ambígua ou número ausente = erro do harness. */
function esperadoGate(smoke, gate) {
  const texto = fs.readFileSync(path.join(E.ROOT, smoke), 'utf8');
  const linhas = texto.split('\n');
  const idx = [];
  linhas.forEach((l, i) => {
    if (l.startsWith(gate.ancora)) idx.push(i);
  });
  if (idx.length !== 1) throw new Error(`ERRO DO HARNESS: ancora do gate «${gate.ancora}» ocorre ${idx.length} vez(es) no inicio de linha em ${smoke}`);
  const m = linhas.slice(idx[0] + 1).join('\n').match(gate.esperado);
  if (!m) throw new Error(`ERRO DO HARNESS: esperado do gate (${gate.esperado}) ausente depois de «${gate.ancora}» em ${smoke}`);
  return Number(m[1]);
}

/*
 * Veredito de UMA rodada de mutação, puro (sem rede).
 * Devolve { tipo: 'morde' | 'nao_morde' | 'inconclusivo', motivo, f }.
 */
function julgarMutacao(m, r) {
  if (r.timeout) return { tipo: 'inconclusivo', motivo: r.timeout, f: null };
  if (r.serializacao) return { tipo: 'inconclusivo', motivo: 'SERIALIZACAO (40001)', f: null };
  const S = linhaSmoke(m.smoke);
  const f = falha(r.out);
  const exigidos = m.rotulos || [];
  let motivo = null;
  if (r.sentinela) motivo = `chegou ao sentinela (smokes=[${r.smokes}])`;
  else if (!f) motivo = `sem «<X> FAIL (…)» na saida — erro sem rotulo (${E.primeiraFalha(r.out).slice(0, 300)})`;
  else if (f.prefixo !== S.prefixo) motivo = `a primeira reprovacao e de outro prefixo (${f.prefixo} FAIL (${f.letra}); esperado ${S.prefixo}) — ${f.texto.slice(0, 200)}`;
  else if (f.inesperado) motivo = `reprovou em (${f.letra}) por erro INESPERADO do envelope — nada foi julgado, nao e mordida (${f.texto.slice(0, 200)})`;
  else if (f.letra !== m.letra) motivo = `reprovou em (${f.letra}), esperado (${m.letra})`;
  else if (f.rotulos.some((x) => x.startsWith('c_'))) motivo = `controle vacuo [${f.rotulos.join(',')}]`;
  else if (exigidos.some((x) => !f.rotulos.includes(x))) motivo = `reprovou em (${f.letra}) [${f.rotulos.join(',')}] sem o(s) rotulo(s) exigido(s) [${exigidos.join(',')}]`;
  return { tipo: motivo ? 'nao_morde' : 'morde', motivo, f };
}

/*
 * Veredito do CONTROLE, puro: null = verde; senão { tipo: 'vermelho' | 'inconclusivo', motivo }.
 * O par/gate é lido de `r.smokes`/`r.evidencia` (o que a sentinela carregou), nunca da posição em
 * `r.out`.
 */
function julgarControle(smoke, r) {
  const S = linhaSmoke(smoke);
  if (r.timeout || r.serializacao) return { tipo: 'inconclusivo', motivo: r.timeout || 'SERIALIZACAO (40001)' };
  if (!r.sentinela) return { tipo: 'vermelho', motivo: `sentinela ausente (${E.primeiraFalha(r.out).slice(0, 300)})` };
  if (/FAIL \(/.test(r.out)) return { tipo: 'vermelho', motivo: `FAIL na saida (${E.primeiraFalha(r.out).slice(0, 300)})` };
  if (S.controle.par) {
    const par = E.lerPares(r.smokes).find((x) => x.k === S.controle.par);
    if (!par) return { tipo: 'vermelho', motivo: `par ${S.controle.par} ausente da sentinela (smokes=[${r.smokes || ''}])` };
    if (!/^[0-9]+$/.test(par.p || '') || par.p !== par.e) return { tipo: 'vermelho', motivo: `par ${par.k}=${par.p}/${par.e} (pass != esperado)` };
    return null;
  }
  if (S.controle.gate) {
    const g = S.controle.gate;
    const n = esperadoGate(smoke, g);
    const tok = String(r.evidencia || '')
      .split(/\s+/)
      .find((x) => x.startsWith(`${g.chave}=`));
    if (!tok) return { tipo: 'vermelho', motivo: `gate ${g.chave} ausente da evidencia (evidencia=${r.evidencia || ''})` };
    const v = tok.slice(g.chave.length + 1);
    if (v !== String(n)) return { tipo: 'vermelho', motivo: `gate ${g.chave}=${v} de ${n} (o v_esperado do proprio smoke)` };
    return null;
  }
  throw new Error(`ERRO DO HARNESS: linha SMOKES sem controle (${smoke})`);
}

/* Corpo do ensaio para um smoke (com a instrução do gate, quando a linha for de gate interno). */
function comporPara(smoke, prefixadas, mutacao, rotuloMutacao) {
  const corpo = E.compor({ prefixadas, arquivos: [smoke], mutacao, rotuloMutacao });
  const g = linhaSmoke(smoke).controle.gate;
  if (!g) return corpo;
  if (!corpo.endsWith(E.FIM)) throw new Error('ERRO DO HARNESS: o corpo composto nao termina em E.FIM — nao ha onde inserir a instrucao do gate');
  const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const instr =
    '\nRESET ROLE;\n' +
    `SELECT set_config('p51.evidencia', btrim(coalesce(current_setting('p51.evidencia', true), '') || ${lit(` ${g.chave}=`)} || coalesce(current_setting(${lit(g.contador)}, true), '')), false);\n`;
  return corpo.slice(0, corpo.length - E.FIM.length) + instr + E.FIM;
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
    if (!m.letra || !Array.isArray(m.requer) || !m.sql) throw new Error(`ERRO DO HARNESS: ${m.id} sem letra/requer/sql`);
  }
  for (const [k, s] of Object.entries(SMOKES)) {
    if (!s.prefixo || !s.controle || (!s.controle.par && !s.controle.gate)) throw new Error(`ERRO DO HARNESS: linha SMOKES incompleta: ${k}`);
  }
}

function principal() {
  for (const a of process.argv.slice(2)) sair(`opcao desconhecida: ${a}`);
  try {
    validarCarga();
  } catch (e) {
    sair(e.message);
  }

  // ── baseline de persistência + plano ─────────────────────────────────────
  antes = E.capturar();
  const plano = E.planejar('padrao', [], E.lerEstado());
  const disponiveis = new Set([...plano.aplicadas, ...plano.prefixadas.map(E.versao)]);
  console.log(`modo: prefixadas=[${plano.prefixadas.map(E.versao).join(',')}] aplicadas=[${plano.aplicadas.join(',')}] ausentes=[${plano.ausentes.join(',')}]`);
  console.log(
    `baseline: ledger=${JSON.stringify(antes.ledger.map((x) => x.v))} funcoes=${Object.keys(antes.funcoes).length} revisao_rejeicao=${antes.revisao.existe || 'ausente'} mutacoes=${antes.mutacoes.length} fixtures=${JSON.stringify(antes.fixtures)}`
  );

  // smokes na ordem da primeira entrada que os usa
  const ordem = [];
  for (const m of MUTACOES) if (!ordem.includes(m.smoke)) ordem.push(m.smoke);

  let mordem = 0;
  let contadas = 0;
  let seguidasSemMorder = 0;
  const naoMordem = [];
  for (const smoke of ordem) {
    const S = SMOKES[smoke];
    const entradas = MUTACOES.filter((m) => m.smoke === smoke);
    const vivas = [];
    for (const m of entradas) {
      const falta = m.requer.filter((v) => !disponiveis.has(v));
      if (falta.length) console.log(`PULADA (migration ausente): ${m.id} (${m.desc}) — requer ${falta.join(',')}`);
      else vivas.push(m);
    }
    if (!vivas.length) continue;

    // ── CONTROLE deste smoke ────────────────────────────────────────────────
    let ctl;
    try {
      ctl = rodarOuSair(comporPara(smoke, plano.prefixadas, null), `CONTROLE_${path.basename(smoke, '.sql')}`);
    } catch (e) {
      sair(`ERRO DO HARNESS: ${e.message}`);
    }
    let vc;
    try {
      vc = julgarControle(smoke, ctl);
    } catch (e) {
      sair(e.message);
    }
    if (vc && vc.tipo === 'inconclusivo') sair(`INCONCLUSIVO: CONTROLE (${smoke}) (${ctl.ms} ms) — ${vc.motivo}; nada concluido sobre o portao`, 3);
    if (vc) sair(`CONTROLE VERMELHO (${smoke}): ${vc.motivo} (${ctl.ms} ms)`);
    if (S.controle.par) {
      const par = E.lerPares(ctl.smokes).find((x) => x.k === S.controle.par);
      console.log(`CONTROLE verde (${smoke}): par ${par.k}=${par.p}/${par.e} (${ctl.ms} ms)`);
    } else {
      const n = esperadoGate(smoke, S.controle.gate);
      console.log(`CONTROLE verde (${smoke}): gate ${S.controle.gate.chave}=${n} de ${n} (${ctl.ms} ms)`);
    }

    // ── MUTAÇÕES deste smoke ────────────────────────────────────────────────
    for (const m of vivas) {
      contadas += 1;
      const sql = typeof m.sql === 'function' ? m.sql() : m.sql;
      let r;
      try {
        r = rodarOuSair(comporPara(smoke, plano.prefixadas, sql, `MUTACAO ${m.id}`), m.id);
      } catch (e) {
        sair(`ERRO DO HARNESS: ${m.id}: ${e.message}`);
      }
      const v = julgarMutacao(m, r);
      if (v.tipo === 'inconclusivo') sair(`INCONCLUSIVO: ${m.id} (${r.ms} ms) — ${v.motivo}; nada concluido sobre o portao`, 3);
      if (v.motivo) {
        console.log(`NAO MORDE: ${m.id} (${m.desc}) — ${v.motivo} (${r.ms} ms)`);
        naoMordem.push(m.id);
        seguidasSemMorder += 1;
        if (seguidasSemMorder >= 2) sair('SUSPEITA DE INSTRUMENTO: duas mutacoes seguidas nao mordem — medir o harness antes de concluir qualquer coisa sobre o portao');
      } else {
        mordem += 1;
        seguidasSemMorder = 0;
        const lst = v.f.rotulos.length ? ` [${v.f.rotulos.join(',')}]` : '';
        console.log(`${m.id} morde: ${m.desc} -> ${S.prefixo} FAIL (${v.f.letra})${lst} (${r.ms} ms)`);
      }
    }
  }

  // ── NADA PERSISTIU ────────────────────────────────────────────────────────
  if (naoMordem.length) sair(`NAO MORDE: ${naoMordem.join(', ')}`);
  if (contadas === 0) sair('NENHUMA MUTACAO RODOU: todas puladas — nada provado');
  if (!conferirPersistencia()) {
    antes = null; // já medido e reportado
    sair('PERSISTIU — ver a linha acima');
  }
  console.log(`controle verde; ${mordem}/${contadas} mutacoes mordem; nada persistiu`);
}

module.exports = { MUTACOES, SMOKES, julgarMutacao, julgarControle, falha, esperadoGate, comporPara, validarCarga };

if (require.main === module) {
  try {
    principal();
  } catch (e) {
    sair(`ERRO DO HARNESS: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  }
}
