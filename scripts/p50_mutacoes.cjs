#!/usr/bin/env node
'use strict';
/*
 * p50_mutacoes.cjs — prova, por execução, que cada cláusula do smoke p50 MORDE.
 *
 * Roda contra PROD pela composição do `scripts/p50_ensaio.cjs` (mesmo prefixo, mesmo sentinela,
 * mesma via `p46apply.cjs run`). TODA requisição termina em `RAISE EXCEPTION
 * 'ENSAIO_P50_TERMINOU …'` (ou num `P50C FAIL` antes dele): o endpoint executa o corpo inteiro
 * numa transação, então nada persiste. O modo é o PADRÃO do ensaio — prefixa as migrations p50
 * que estão no disco e fora do ledger — então o MESMO runner serve antes do apply (com
 * 20261005000001 prefixada) e depois dele (contra os objetos vivos, sem prefixo).
 *
 *   CONTROLE : prefixo + migrations faltantes + smoke + sentinela
 *              ⇒ tem de chegar ao sentinela com smoke50 = esperado, sem `FAIL (` (senão
 *                CONTROLE VERMELHO, e para ali).
 *   M1..M<N> : prefixo + migrations faltantes + MUTAÇÃO (DDL avulsa) + smoke + sentinela
 *              (M1..M6 tracer; M7..M11 rodada de conserto do 50-REVIEW-TRACER-1; M12..M23 do 50-07,
 *              uma por cláusula nova (g)..(l) e pela extensão de (e) — extraídas de 0002..0004 ou,
 *              para objeto que a fase não reescreve, do `pg_get_functiondef` VIVO lido só-leitura
 *              no início; N = MUTACOES.length, ids sem buraco)
 *              ⇒ tem de reprovar na letra declarada e NÃO chegar ao sentinela. A mutação entra
 *                DEPOIS da migration, para que o pré e o pós-portão passem e quem morda seja o
 *                SMOKE (o portão recorrente). Cada uma declara `requer`: se a versão exigida não
 *                está aplicada nem prefixável, sai `PULADA (migration ausente)` e não conta.
 *
 * As mutações que reescrevem objetos da migration são EXTRAÍDAS dela por âncora literal única
 * (`trocar`), para não divergirem do texto que vai ao apply.
 *
 * PERSISTÊNCIA por baseline capturada NA execução (sem constante): `E.capturar()` do
 * `p50_ensaio.cjs` (ledger p50 com md5, corpo/ACL do helper, TODAS as policies de `public`,
 * `role|ativo|deleted_at` de `usuarios_rh` e a borda de `candidaturas` — as duas últimas porque o
 * smoke escreve nelas dentro do envelope P50C1). A baseline é lida ANTES do CONTROLE; a leitura
 * de depois roda em TODA saída depois dela — fim normal, `CONTROLE VERMELHO`, `LOCK/STATEMENT
 * TIMEOUT`, `SUSPEITA DE INSTRUMENTO`, `NAO MORDE` e erro do próprio harness —, porque é
 * justamente na saída anormal que o operador mais precisa saber se algo ficou (WR-05 do
 * 50-REVIEW-TRACER-1). Só as saídas da CARGA (âncoras ausentes, opção desconhecida) acontecem
 * antes da baseline e saem sem a leitura: nada foi enviado ainda.
 *
 * LOCK. Cada requisição com a migration prefixada segura `AccessExclusiveLock` em `candidaturas`
 * até abortar (o ALTER POLICY da migration e o de M2/M4/M5/M6) — desde o 50-07, com 0002..0004
 * prefixadas, em até 12 tabelas (as 13 policies do 0002) mais a view. `lock_timeout = 3s` /
 * `statement_timeout = 5s` vêm do prefixo do ensaio. A duração de cada requisição é impressa.
 * `LOCK TIMEOUT` / `STATEMENT TIMEOUT` saem 3 SEM concluir nada sobre o portão.
 *
 * SERIALIZAÇÃO (40001) — WR-01 do 50-REVIEW-TRACER-3. O ensaio roda em REPEATABLE READ; um UPDATE
 * do envelope P50C1 ((b)/(c) em `usuarios_rh`, (f) em `candidaturas`) numa linha que outra
 * transação commitou depois do snapshot dá `40001`. O smoke o relança como `P50C FAIL (<letra>):
 * … INESPERADO (40001: …)` — sem colchetes, na letra da cláusula que escreve: antes deste conserto,
 * M1 (b), M4 (c) e M5 (f) contavam isso como MORDIDA e o CONTROLE como vermelho. Agora:
 *   · `E.classificarSaida()` separa o 40001 ANTES de ler qualquer `FAIL (`: a rodada (CONTROLE ou
 *     mutação) é repetida UMA vez; um segundo 40001 sai `INCONCLUSIVO — SERIALIZACAO (40001)`,
 *     código 3, com a leitura de persistência — nada concluído sobre o portão;
 *   · `falha()` marca toda reprovação «a subtransacao abortou por erro INESPERADO» como
 *     `inesperado`, e `julgarMutacao()` nunca a conta como mordida (nada foi julgado ali): defesa
 *     em profundidade para um erro de instrumento que não seja 40001.
 *
 * Saída final esperada: `controle verde; <n>/<n> mutacoes mordem; nada persistiu`.
 *
 * Cada mutação declara a LETRA em que tem de reprovar e, quando a cláusula tem várias sondas, os
 * RÓTULOS que têm de aparecer em `P50C FAIL (<letra>): [<rótulos>]` — assim «morde» quer dizer
 * «morde PELA sonda que existe para ela», não por uma vizinha.
 *
 * Uso: node scripts/p50_mutacoes.cjs [--smoke=<arquivo.sql>]     (sem dependências)
 *   --smoke=   troca o smoke do CONTROLE e das mutações (padrão: o smoke p50). Serve para provar o
 *              próprio runner — p.ex. um smoke que reprova de propósito exercita a saída
 *              `CONTROLE VERMELHO` com a leitura de persistência.
 */

const fs = require('fs');
const path = require('path');
const E = require('./p50_ensaio.cjs');

const MIG1 = E.MIGS[0];
const SMOKE_PADRAO = 'supabase/tests/p50_acesso_recrutador_smoke.sql';

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
    `leitura so-leitura igual a baseline: helper=${depois.helper ? 'presente' : 'ausente'} ledger=${JSON.stringify(depois.ledger)} politicas(public)=${Object.keys(depois.politicas).length} usuarios_rh=${Object.keys(depois.usuarios_rh).length} borda=${Object.keys(depois.borda).length}`
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

const mig1 = fs.readFileSync(path.join(E.ROOT, MIG1), 'utf8');

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
  return trecho.replace(ancora, novo);
}

const fnHelper = extrair(mig1, 'CREATE FUNCTION public.is_active_rh_user()', '$helper$;', 'helper');
const polCand = extrair(mig1, 'ALTER POLICY rh_le_candidaturas ON public.candidaturas', '\n  );', 'rh_le_candidaturas');
const HELPER_NA_POLICY = ' AND (SELECT public.is_active_rh_user())';

/* v2 (50-07): os textos das migrations 0002..0004, de onde M12..M23 são extraídas por âncora. */
const mig2 = fs.readFileSync(path.join(E.ROOT, E.MIGS[1]), 'utf8');
const mig3 = fs.readFileSync(path.join(E.ROOT, E.MIGS[2]), 'utf8');
const mig4 = fs.readFileSync(path.join(E.ROOT, E.MIGS[3]), 'utf8');
const pol2 = (nome, tabela) => extrair(mig2, `ALTER POLICY ${nome} ON public.${tabela}`, '\n  );', nome);
const fn = (mig, nome) => extrair(mig, `CREATE OR REPLACE FUNCTION public.${nome}(`, '$function$;', nome);
/* O ramo rh da Forma B do 0002 — helper + candidatura viva (o mesmo texto nas 10 policies). */
const RAMO_B = '(SELECT public.is_active_rh_user()) AND (candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.deleted_at IS NULL AND c.is_rascunho = false))';
const LINHA_H = "IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN";

/*
 * Objetos que a fase NÃO reescreve vêm do corpo VIVO, lido só-leitura no início do runner
 * (`pg_get_functiondef`), nunca transcrito. Preguiçoso: `require()` deste módulo (a conferência
 * do verify) não toca a rede.
 */
let vivoResponder = null;
function responderVivo() {
  if (vivoResponder === null) {
    const r = E.sqlLeitura(
      "set transaction read only; select pg_get_functiondef('public.responder_revisao_decisao(uuid, text, text)'::regprocedure) as d"
    );
    vivoResponder = String(r[0].d).replace(/\s*$/, '') + ';\n';
  }
  return vivoResponder;
}

const MUTACOES = [
  {
    id: 'M1',
    desc: 'helper sempre verdadeiro (mesmo ACL: CREATE OR REPLACE preserva)',
    letra: 'b',
    requer: ['20261005000001'],
    sql: trocar(trocar(fnHelper, 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 'M1'), 'RETURN coalesce(ok, false);', 'RETURN true;', 'M1'),
  },
  {
    id: 'M2',
    desc: 'ramo rh so pelo JWT (sem o helper vivo)',
    letra: 'd',
    requer: ['20261005000001'],
    sql: trocar(polCand, HELPER_NA_POLICY, '', 'M2'),
  },
  {
    id: 'M3',
    desc: 'GRANT EXECUTE do helper a anon',
    letra: 'a',
    requer: ['20261005000001'],
    sql: 'GRANT EXECUTE ON FUNCTION public.is_active_rh_user() TO anon;',
  },
  {
    id: 'M4',
    desc: 'ramo rh de volta a posse (vagas.created_by = auth.uid()), ainda TO authenticated',
    letra: 'c',
    requer: ['20261005000001'],
    sql:
      trocar(
        polCand,
        '(SELECT public.is_active_rh_user())',
        '(vaga_id IN (SELECT vagas.id FROM public.vagas WHERE vagas.created_by = (SELECT auth.uid())))',
        'M4'
      ),
  },
  {
    id: 'M5',
    desc: 'policy de volta a TO public',
    letra: 'f',
    requer: ['20261005000001'],
    sql: 'ALTER POLICY rh_le_candidaturas ON public.candidaturas TO public;',
  },
  {
    id: 'M6',
    desc: "disjunto do administrador alterado (= ANY (ARRAY['administrador']))",
    letra: 'e',
    requer: ['20261005000001'],
    sql: trocar(polCand, "= 'administrador')", "= ANY (ARRAY['administrador']))", 'M6'),
  },
  {
    // WR-01: tira o conjunto do claim `rh` do ramo — qualquer linha usuarios_rh ativa leria tudo,
    // seja qual for o claim. Tem de morder pelas sondas da linha ATIVA com claim != rh.
    id: 'M7',
    desc: 'ramo rh sem o conjunto do claim (qualquer linha ativa, qualquer claim)',
    letra: 'd',
    rotulos: ['ativo_visualizador', 'ativo_gerente', 'ativo_sem_role'],
    requer: ['20261005000001'],
    sql: trocar(polCand, "((SELECT (auth.jwt() #>> '{app_metadata,role}')) = 'rh') AND ", '', 'M7'),
  },
  {
    // WR-02: helper que filtra PAPEL em vez de `ativo` — reabre a janela de 1 h do administrador
    // desativado e exclui todo recrutador. Tem de morder em (b) pela inativa de mesmo papel e
    // pelo recrutador ativo real.
    id: 'M8',
    desc: "helper com role = 'administrador' no lugar de ativo = true (mesmo ACL)",
    letra: 'b',
    rotulos: ['inativo_mesmo_papel', 'rec_ativo'],
    requer: ['20261005000001'],
    sql: trocar(trocar(fnHelper, 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 'M8'), 'AND u.ativo = true', "AND u.role = 'administrador'", 'M8'),
  },
  {
    // WR-03: ramo `rh` sem o filtro de candidatura excluída (LGPD/M8). Tem de morder em (f) pela
    // excluída SEMEADA (PROD não tem população real de borda).
    id: 'M9',
    desc: 'ramo rh sem deleted_at IS NULL (ve candidatura excluida)',
    letra: 'f',
    rotulos: ['rh_ve_excluida'],
    requer: ['20261005000001'],
    sql: trocar(polCand, ' AND (deleted_at IS NULL)', '', 'M9'),
  },
  {
    // WR-03: ramo `rh` sem o filtro de rascunho.
    id: 'M10',
    desc: 'ramo rh sem is_rascunho = false (ve rascunho)',
    letra: 'f',
    rotulos: ['rh_ve_rascunho'],
    requer: ['20261005000001'],
    sql: trocar(polCand, ' AND (is_rascunho = false)', '', 'M10'),
  },
  {
    // IN-06: helper que ignora `deleted_at` — a linha excluída e ainda `ativo` passaria.
    id: 'M11',
    desc: 'helper sem deleted_at IS NULL (mesmo ACL)',
    letra: 'b',
    rotulos: ['ativo_excluido'],
    requer: ['20261005000001'],
    sql: trocar(trocar(fnHelper, 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 'M11'), 'AND u.deleted_at IS NULL', 'AND true', 'M11'),
  },

  // ── v2 (Plano 50-07): uma mutação por cláusula nova (g)..(l) e pela extensão de (e). Cada uma
  //    declara `rotulos` — a lista que a cláusula tem de imprimir em `P50C FAIL (<letra>): [...]`.
  {
    // (g) SC1: a policy de scores volta à posse da vaga (ainda TO authenticated) — o rh ativo sem
    // vaga própria deixa de ver os scores.
    id: 'M12',
    desc: 'rh_le_scores de volta a subconsulta de posse (vagas.created_by = auth.uid()), TO authenticated',
    letra: 'g',
    rotulos: ['scores_candidato'],
    requer: ['20261005000002'],
    sql: trocar(
      pol2('rh_le_scores', 'scores_candidato'),
      RAMO_B,
      '(candidatura_id IN (SELECT c.id FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id WHERE v.created_by = (SELECT auth.uid())))',
      'M12'
    ),
  },
  {
    // (h) SC2: ramo rh de decisao_final só pelo JWT — o token antigo (das duas linhas inativas) lê.
    id: 'M13',
    desc: 'rh_le_decisao_final com o ramo rh so pelo JWT (sem helper, sem posse)',
    letra: 'h',
    rotulos: ['velho.decisao_final', 'velho_mp.decisao_final'],
    requer: ['20261005000002'],
    sql: trocar(pol2('rh_le_decisao_final', 'decisao_final'), ' AND ' + RAMO_B, '', 'M13'),
  },
  {
    // (h) D-05: a view volta a ler como dona (ignora a RLS) — a linha SEMEADA de (h) aparece a
    // quem não deveria vê-la.
    id: 'M14',
    desc: 'v_analises_presas sem security_invoker (RESET)',
    letra: 'h',
    rotulos: ['candidato.v_analises_presas', 'velho.v_analises_presas', 'visualizador.v_analises_presas'],
    requer: ['20261005000002'],
    sql: 'ALTER VIEW public.v_analises_presas RESET (security_invoker);',
  },
  {
    // (i) D-01: liberar_cognitivo volta a comparar o dono da vaga — o rh ativo (controle) é recusado.
    id: 'M15',
    desc: 'liberar_cognitivo com a comparacao de posse reintroduzida na linha de autorizacao',
    letra: 'i',
    rotulos: ['ativo.liberar_cognitivo/2'],
    requer: ['20261005000004'],
    sql: trocar(
      fn(mig4, 'liberar_cognitivo'),
      LINHA_H,
      "IF v_role = 'rh' AND NOT EXISTS (SELECT 1 FROM public.candidaturas c2 JOIN public.vagas v2 ON v2.id = c2.vaga_id WHERE c2.id = p_candidatura_id AND v2.created_by = v_uid) THEN",
      'M15'
    ),
  },
  {
    // (i) D-04: a guarda de reprocessar_analise sem o coalesce — falha ABERTO com papel nulo.
    id: 'M16',
    desc: 'reprocessar_analise com a guarda sem coalesce (v_role NOT IN)',
    letra: 'i',
    rotulos: ['sem_papel.reprocessar_analise/1'],
    requer: ['20261005000004'],
    sql: trocar(
      fn(mig4, 'reprocessar_analise'),
      "IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN",
      "IF v_uid IS NULL OR v_role NOT IN ('rh', 'administrador') THEN",
      'M16'
    ),
  },
  {
    // (i) D-04: EXECUTE de volta a anon numa RPC de escrita.
    id: 'M17',
    desc: 'GRANT EXECUTE de rejeitar_candidatura a anon',
    letra: 'i',
    rotulos: ['anon.rejeitar_candidatura/3'],
    requer: ['20261005000004'],
    sql: 'GRANT EXECUTE ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) TO anon;',
  },
  {
    // (k) D-03: a fila de pedidos do rh volta a exigir candidatura viva — o ÓRFÃO some para o rh.
    id: 'M18',
    desc: 'listar_pedidos_dados com filtro de candidatura viva no ramo rh (orfao escondido)',
    letra: 'k',
    rotulos: ['rh_ve_orfao', 'igual.listar_pedidos_dados'],
    requer: ['20261005000003'],
    sql: trocar(
      fn(mig3, 'listar_pedidos_dados'),
      "OR (v_role = 'rh' AND public.is_active_rh_user())",
      "OR (v_role = 'rh' AND public.is_active_rh_user() AND EXISTS (SELECT 1 FROM public.candidaturas cd WHERE cd.candidato_id = s.candidato_id AND cd.deleted_at IS NULL AND cd.is_rascunho = false))",
      'M18'
    ),
  },
  {
    // (l) REVISAO-05: a trava do decisor neutralizada no corpo VIVO (objeto que a fase não reescreve).
    id: 'M19',
    desc: 'responder_revisao_decisao com a trava do decisor neutralizada (IF false)',
    letra: 'l',
    rotulos: ['decisor'],
    requer: [],
    sql: () => trocar(responderVivo(), 'IF v_uid = v_row.por_usuario THEN', 'IF false THEN', 'M19'),
  },
  {
    // (j) SC3: uma função NOVA com a posse da vaga (ninguém a chama). Sem `v_role = 'rh'` de
    // propósito: com ele, (i) a pegaria antes como [sem_sonda] — a forma indireta já é mordida em
    // pg_temp pela própria (j).
    id: 'M20',
    desc: 'funcao nova public.p50_mut_dono() com a forma de posse (created_by + vagas)',
    letra: 'j',
    rotulos: ['fn:public.p50_mut_dono/0'],
    requer: [],
    sql:
      'CREATE FUNCTION public.p50_mut_dono() RETURNS boolean LANGUAGE sql STABLE SET search_path = \'\' AS $p50mut$\n' +
      '  SELECT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = (SELECT auth.uid()));\n' +
      '$p50mut$;',
  },
  {
    // (j) SC3: uma policy NOVA, RESTRICTIVE, numa tabela sem uso (0 linhas), que cita o autor da vaga.
    id: 'M21',
    desc: 'policy RESTRICTIVE nova em vagas_associadas_recrutadores com o autor da vaga',
    letra: 'j',
    rotulos: ['pol:public.vagas_associadas_recrutadores.p50_mut_dono_pol'],
    requer: ['20261005000002'],
    sql:
      'CREATE POLICY p50_mut_dono_pol ON public.vagas_associadas_recrutadores AS RESTRICTIVE FOR SELECT TO authenticated\n' +
      '  USING (vaga_id IN (SELECT v.id FROM public.vagas v WHERE v.created_by = (SELECT auth.uid())));',
  },
  {
    // (i) D-02/D-04: o escopo do funil incondicional — quem não devia vê os KPIs. A função sai do
    // conjunto por forma (perde o helper e `v_role = 'rh'`); o MAPA de (i) continua a sondá-la.
    id: 'M22',
    desc: 'funil_kpis com v_ve_tudo := true',
    letra: 'i',
    rotulos: ['velho.funil_kpis/1', 'sem_papel.funil_kpis/1', 'candidato.funil_kpis/1'],
    requer: ['20261005000003'],
    sql: trocar(
      fn(mig3, 'funil_kpis'),
      "v_ve_tudo  boolean := coalesce(v_role = 'administrador' OR (v_role = 'rh' AND public.is_active_rh_user()), false);",
      'v_ve_tudo  boolean := true;',
      'M22'
    ),
  },
  {
    // (e) D-02: o disjunto do administrador de OUTRA policy da forma (não rh_le_candidaturas),
    // mantendo o helper no ramo rh.
    id: 'M23',
    desc: "disjunto do administrador de rh_le_historico alterado (= ANY (ARRAY['administrador'])), helper mantido",
    letra: 'e',
    rotulos: ['admin_disjunto:historico_candidatura.rh_le_historico'],
    requer: ['20261005000002'],
    sql: trocar(pol2('rh_le_historico', 'historico_candidatura'), "= 'administrador')", "= ANY (ARRAY['administrador']))", 'M23'),
  },
];

/* A PRIMEIRA reprovação do smoke. `inesperado` = o envelope abortou por erro que não é o RAISE
 * P50C1 («nada foi julgado») — nunca é a sonda reprovando, logo nunca é mordida (WR-01, TRACER-3). */
function falha(out) {
  const m = out.match(/P50C FAIL \(([^)]+)\)(:\s*\[([^\]]*)\])?(:\s*a subtransacao abortou por erro INESPERADO)?/);
  if (!m) return null;
  return { letra: m[1], rotulos: m[3] ? m[3].split(',').filter(Boolean) : [], inesperado: !!m[4] };
}

/*
 * Veredito de UMA rodada de mutação, puro (sem rede) — exportado para a prova offline do WR-01.
 * Devolve { tipo: 'morde' | 'nao_morde' | 'inconclusivo', motivo, f }.
 */
function julgarMutacao(m, r) {
  if (r.timeout) return { tipo: 'inconclusivo', motivo: r.timeout, f: null };
  if (r.serializacao) return { tipo: 'inconclusivo', motivo: 'SERIALIZACAO (40001)', f: null };
  const f = falha(r.out);
  const exigidos = m.rotulos || [];
  let motivo = null;
  if (r.sentinela) motivo = `chegou ao sentinela (smoke50=${r.smoke50})`;
  else if (!f) motivo = `sem P50C FAIL (${E.primeiraFalha(r.out).slice(0, 300)})`;
  else if (f.inesperado) motivo = `reprovou em (${f.letra}) por erro INESPERADO do envelope — nada foi julgado, nao e mordida (${E.primeiraFalha(r.out).slice(0, 200)})`;
  else if (f.letra !== m.letra) motivo = `reprovou em (${f.letra}), esperado (${m.letra})`;
  else if (f.rotulos.some((x) => x.startsWith('c_'))) motivo = `controle vacuo [${f.rotulos.join(',')}]`;
  else if (exigidos.some((x) => !f.rotulos.includes(x))) motivo = `reprovou em (${f.letra}) [${f.rotulos.join(',')}] sem o(s) rotulo(s) exigido(s) [${exigidos.join(',')}]`;
  return { tipo: motivo ? 'nao_morde' : 'morde', motivo, f };
}

/* Veredito do CONTROLE, puro: null = verde; senão o motivo do vermelho. Um 40001/timeout é
 * inconclusivo e NÃO chega aqui (rodarOuSair sai antes), mas é recusado também aqui. */
function julgarControle(ctl) {
  if (ctl.timeout || ctl.serializacao) return { tipo: 'inconclusivo', motivo: ctl.timeout || 'SERIALIZACAO (40001)' };
  const f = falha(ctl.out);
  const s = ctl.smoke50 && ctl.smoke50 !== 'n/a' ? ctl.smoke50.split('/') : null;
  if (f || !ctl.sentinela || !s || s[0] !== s[1]) {
    return { tipo: 'vermelho', motivo: f ? `P50C FAIL (${f.letra})${f.inesperado ? ' por erro INESPERADO do smoke' : ''}` : !ctl.sentinela ? 'sentinela ausente' : `smoke50=${ctl.smoke50}` };
  }
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
  if (r.serializacao) {
    sair(`INCONCLUSIVO — SERIALIZACAO (40001) duas vezes seguidas: ${rodada} (${r.ms} ms) — escrita concorrente numa linha do envelope P50C1 depois do snapshot; nada concluido sobre o portao (nao conta como mordida nem como controle vermelho); repetir mais tarde, sem laco`, 3);
  }
  return r;
}

function principal() {
  let smoke = SMOKE_PADRAO;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--smoke=')) smoke = a.slice('--smoke='.length);
    else sair(`opcao desconhecida: ${a}`);
  }

  // ── baseline de persistência + plano ─────────────────────────────────────
  antes = E.capturar();
  const plano = E.planejar('padrao', [], E.lerEstado());
  const disponiveis = new Set([...plano.aplicadas, ...plano.prefixadas.map(E.versao)]);
  console.log(
    `modo: prefixadas=[${plano.prefixadas.map(E.versao).join(',')}] aplicadas=[${plano.aplicadas.join(',')}] ausentes=[${plano.ausentes.join(',')}]${smoke === SMOKE_PADRAO ? '' : ` smoke=${smoke}`}`
  );
  console.log(
    `baseline: helper=${antes.helper ? 'presente' : 'ausente'} ledger=${antes.ledger.length} politicas(public)=${Object.keys(antes.politicas).length} usuarios_rh=${Object.keys(antes.usuarios_rh).length} borda=${Object.keys(antes.borda).length}`
  );

  // ── CONTROLE ──────────────────────────────────────────────────────────────
  const ctl = rodarOuSair(E.compor({ prefixadas: plano.prefixadas, arquivos: [smoke] }), 'CONTROLE');
  const vc = julgarControle(ctl);
  if (vc && vc.tipo === 'inconclusivo') sair(`INCONCLUSIVO: CONTROLE (${ctl.ms} ms) — ${vc.motivo}; nada concluido sobre o portao`, 3);
  if (vc) {
    console.error(E.primeiraFalha(ctl.out));
    sair(`CONTROLE VERMELHO (${ctl.ms} ms): ${vc.motivo}`);
  }
  console.log(`CONTROLE verde — sentinela alcancado, smoke50=${ctl.smoke50}, nenhum P50C FAIL (${ctl.ms} ms)`);

  // ── MUTAÇÕES ──────────────────────────────────────────────────────────────
  let mordem = 0;
  let contadas = 0;
  let seguidasSemMorder = 0;
  const naoMordem = [];
  for (const m of MUTACOES) {
    const falta = m.requer.filter((v) => !disponiveis.has(v));
    if (falta.length) {
      console.log(`PULADA (migration ausente): ${m.id} (${m.desc}) — requer ${falta.join(',')}`);
      continue;
    }
    contadas += 1;
    // `sql` função = texto do corpo VIVO, lido só-leitura agora (M19); string = DDL avulsa pronta.
    const sql = typeof m.sql === 'function' ? m.sql() : m.sql;
    const r = rodarOuSair(E.compor({ prefixadas: plano.prefixadas, arquivos: [smoke], mutacao: sql, rotuloMutacao: `MUTACAO ${m.id}` }), m.id);
    const v = julgarMutacao(m, r);
    if (v.tipo === 'inconclusivo') sair(`INCONCLUSIVO: ${m.id} (${r.ms} ms) — ${v.motivo}; nada concluido sobre o portao`, 3);
    const { motivo, f } = v;

    const lista = f && f.rotulos.length ? ` [${f.rotulos.join(',')}]` : '';
    if (motivo) {
      console.log(`NAO MORDE: ${m.id} (${m.desc}) — ${motivo} (${r.ms} ms)`);
      naoMordem.push(m.id);
      seguidasSemMorder += 1;
      if (seguidasSemMorder >= 2) sair('SUSPEITA DE INSTRUMENTO: duas mutacoes seguidas nao mordem — medir o harness antes de concluir qualquer coisa sobre o portao (PATTERNS §L)');
    } else {
      mordem += 1;
      seguidasSemMorder = 0;
      console.log(`${m.id} morde: ${m.desc} -> P50C FAIL (${f.letra})${lista} (${r.ms} ms)`);
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

if (require.main === module) {
  try {
    principal();
  } catch (e) {
    sair(`ERRO DO HARNESS: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  }
}

module.exports = { MUTACOES, falha, julgarMutacao, julgarControle };
