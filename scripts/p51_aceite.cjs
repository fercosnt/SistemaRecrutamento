#!/usr/bin/env node
'use strict';
/*
 * p51_aceite.cjs — Phase 51 / Plano 51-17: sonda de aceite SÓ-LEITURA do JORN-42 (direito de pedir
 * revisão de TODA rejeição: knockout e rejeição pelo RH) e do JORN-43 (card do Raciocínio lógico
 * (Matrizes)), em PROD.
 *
 * PROPÓSITO. O aceite D-28/D-29 é feito por CONSULTA NO BANCO (D-51): o operador faz no navegador os
 * passos que exigem uma pessoa (inscrição real com a conta de teste marcada, pedido de revisão, resposta
 * do RH2, rejeição pelo administrador, liberação do Raven) e, depois de cada passo, esta sonda confere o
 * estado esperado da candidatura de teste. Cada fase corresponde a um ponto da sessão:
 *
 *   knockout        inscrição eliminada no knockout: rejeitado/inscricao/knockout_automatico, linha de
 *                   histórico auto_rejeitado sem ator, e-mail de rejeição (evento decisao), contado no
 *                   funil como knockout, origem automatica para o titular, visível ao RH2.
 *   reaberta        o RH2 respondeu «revertida»: pedido automatica com etapa_reabertura=triagem,
 *                   respondida_por=RH2, reaberta_em e prazo; candidatura triagem/em_analise com +1 linha
 *                   de histórico (inscricao→triagem) de ator RH2; motivo ainda knockout (D-35); análise de
 *                   IA despachada depois da reabertura (D-36); fora do knockout no funil; nenhuma
 *                   rejeição depois da reabertura (D-03).
 *   reaberta-10min  tudo de `reaberta` MAIS ≥ 10 minutos desde reaberta_em (senão `FALHA cedo-demais`).
 *   rejeitada-rh    o ADMINISTRADOR rejeitou a candidatura reaberta (rejeitar_candidatura) e o titular
 *                   pediu revisão de novo: 2º pedido humana_triagem com rejeitado_por = admin, pendente,
 *                   de outra linha de histórico (D-06); na fila, pode_responder = false para o admin
 *                   (REVISAO-05) e true para o RH2.
 *   reaberta-2      o RH2 reverteu o 2º pedido: quem rejeitou é o ADMIN e quem reverteu é o RH2 (pela
 *                   0005, o decisor revertido não rejeita de novo, mas OUTRO RH pode — a sonda confere os
 *                   dois atores, não presume); reabertura rejeitado→triagem de ator RH2.
 *   raven           Raven liberado: liberação ativa em cognitivo_liberacao, e-mail cognitivo_liberado
 *                   (D-31), get_avaliacao_status(...).raven sob o JWT do titular com liberado = true e
 *                   registrado coerente com scores_raven.
 *
 * USO
 *   node scripts/p51_aceite.cjs <candidatura_id> --fase <fase> [--rh2 <user_id>] [--admin <user_id>]
 *   node scripts/p51_aceite.cjs --auto-teste     # offline: sem rede, sem credencial, sem banco
 *   --rh2 é exigido nas fases knockout, reaberta, reaberta-10min, rejeitada-rh e reaberta-2;
 *   --admin nas fases rejeitada-rh e reaberta-2. Sem candidatura (ou id que não é uuid): saída 2,
 *   `SEM CANDIDATURA`. Fase fora do vocabulário: saída 2, `FASE DESCONHECIDA`.
 *   Saída: linhas `info …`, linhas `OK|FALHA <check> esperado=<x> obtido=<y>` e a final
 *   `aceite: <k>/<n> conferencias OK`. Saída 0 só com todas OK; 1 com qualquer FALHA ou leitura que
 *   falhou; 2 em recusa de uso.
 *
 * COMO LÊ. Toda consulta vai por `node p46apply.cjs sql "set transaction read only; …"` e COMEÇA por
 * `set transaction read only;` (o script recusa montar outra coisa, e recusa um resultado em que
 * `transaction_read_only` não seja `on`). A visão de um ator é obtida por impersonação DENTRO da
 * transação só-leitura: `set_config('request.jwt.claims', …, true)` e, onde a RLS importa (o que o RH2
 * vê; o que o titular lê), `set local role authenticated`. As RPCs SECURITY DEFINER da fila e do funil
 * dependem só das claims e são chamadas com elas.
 *
 * REGRAS DE SEGREDO. Nenhuma credencial é lida, aceita ou impressa por este script: o único segredo
 * envolvido é o token da Management API que o `p46apply.cjs` já lê do Keychain do operador. Nenhum
 * usuário é criado, nenhuma senha é definida, nenhum login é feito.
 *
 * O QUE NUNCA IMPRIME. Nome, e-mail, CPF, telefone, texto livre (justificativa, resposta ao titular,
 * critério do histórico, texto de opção ou de pergunta), destinatário de notificação, o user_id do
 * titular. As consultas nem selecionam essas colunas, e toda linha impressa passa por um formatador que
 * só deixa passar números, booleanos, uuids e fichas curtas em minúsculas, e por uma blindagem que
 * redige qualquer coisa com forma de e-mail, JWT, URL ou corrida opaca longa. O --auto-teste confere.
 */

const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(ROOT, 'p46apply.cjs');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FASES = ['knockout', 'reaberta', 'reaberta-10min', 'rejeitada-rh', 'reaberta-2', 'raven'];
const PRECISA = {
  knockout: ['rh2'],
  reaberta: ['rh2'],
  'reaberta-10min': ['rh2'],
  'rejeitada-rh': ['rh2', 'admin'],
  'reaberta-2': ['rh2', 'admin'],
  raven: [],
};
const DEZ_MINUTOS = 600;
const SO_LEITURA = 'set transaction read only;';
const USO = `uso: node scripts/p51_aceite.cjs <candidatura_id> --fase ${FASES.join('|')} [--rh2 <user_id>] [--admin <user_id>]`;

class ErroSeguro extends Error {}
class ErroUso extends Error {}

// ═════════════════════════════════════════════════════════════════════════════
// IMPLEMENTAÇÃO
// ═════════════════════════════════════════════════════════════════════════════

// ── Saída blindada ───────────────────────────────────────────────────────────

/* Marca, sobre o texto original, todo trecho com forma de e-mail, JWT, URL ou corrida opaca longa e
 * troca cada corrida marcada por UM `<redigido>` (marcar antes de trocar não deixa sobra). */
function blindar(texto) {
  const t = String(texto);
  const marca = new Uint8Array(t.length);
  const padroes = [
    /[^\s@<>()"'=]+@[^\s@<>()"']+\.[^\s@<>()"']+/g, // e-mail
    /eyJ[\w-]{6,}\.[\w-]{6,}(\.[\w-]*)?/g, // JWT
    /https?:\/\/\S+/g, // URL
    /[A-Za-z0-9_-]{40,}/g, // corrida opaca longa (pedaço de token); um uuid tem 36
  ];
  for (const re of padroes) for (const m of t.matchAll(re)) for (let k = m.index; k < m.index + m[0].length; k += 1) marca[k] = 1;
  let r = '';
  for (let k = 0; k < t.length; ) {
    if (marca[k]) {
      while (k < t.length && marca[k]) k += 1;
      r += '<redigido>';
    } else {
      r += t[k];
      k += 1;
    }
  }
  return r;
}

function criarSaida(escrever) {
  return {
    linha: (s) => escrever('out', blindar(s)),
    erro: (s) => escrever('err', blindar(s)),
  };
}

/* Só números, booleanos, uuids e fichas curtas em minúsculas passam; o resto vira <redigido>. */
function valorSeguro(v) {
  if (v === null || v === undefined || v === '-') return '-';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '-';
  if (typeof v === 'string' && (UUID_RE.test(v) || /^[a-z][a-z0-9_:>.-]{0,47}$/.test(v))) return v;
  return '<redigido>';
}

const nomeSeguro = (n) => (typeof n === 'string' && /^[a-z0-9][a-z0-9_:.-]{0,63}$/.test(n) ? n : 'conferencia');
const notaSegura = (s) => (typeof s === 'string' && /^[A-Za-z0-9 _:.,=()/-]{1,80}$/.test(s) ? ` (${s})` : '');

function linhaCheck(c) {
  return blindar(
    `${c.ok ? 'OK' : 'FALHA'} ${nomeSeguro(c.nome)} esperado=${valorSeguro(c.esperado)} obtido=${valorSeguro(c.obtido)}${notaSegura(c.nota)}`
  );
}

function linhaInfo(chave, pares) {
  const corpo = Object.entries(pares)
    .map(([k, v]) => `${nomeSeguro(k)}=${valorSeguro(v)}`)
    .join(' ');
  return blindar(`info ${nomeSeguro(chave)} ${corpo}`);
}

// ── Argumentos ───────────────────────────────────────────────────────────────

/* As mensagens de recusa NUNCA ecoam o que foi digitado (poderia ser um e-mail). */
function lerArgs(argv) {
  const pos = [];
  const op = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--fase' || a === '--rh2' || a === '--admin') {
      op[a.slice(2)] = argv[i + 1];
      i += 1;
    } else if (typeof a === 'string' && a.startsWith('--')) {
      throw new ErroUso(`OPCAO DESCONHECIDA. ${USO}`);
    } else {
      pos.push(a);
    }
  }
  const cand = pos[0];
  if (pos.length !== 1 || typeof cand !== 'string' || !UUID_RE.test(cand)) {
    throw new ErroUso(`SEM CANDIDATURA: informe o id (uuid) de UMA candidatura da conta de teste. ${USO}`);
  }
  if (op.fase === undefined) throw new ErroUso(`FASE AUSENTE. ${USO}`);
  if (!FASES.includes(op.fase)) throw new ErroUso(`FASE DESCONHECIDA: use ${FASES.join('|')}`);
  for (const k of ['rh2', 'admin']) {
    if (op[k] !== undefined && (typeof op[k] !== 'string' || !UUID_RE.test(op[k]))) throw new ErroUso(`--${k} NAO E UUID`);
  }
  for (const k of PRECISA[op.fase]) if (!op[k]) throw new ErroUso(`FALTA --${k} para a fase ${op.fase}. ${USO}`);
  const rh2 = op.rh2 ? op.rh2.toLowerCase() : null;
  const admin = op.admin ? op.admin.toLowerCase() : null;
  if (rh2 && admin && rh2 === admin) throw new ErroUso('RH2 E ADMIN SAO A MESMA PESSOA: a fase confere dois atores distintos');
  return { cand: cand.toLowerCase(), fase: op.fase, rh2, admin };
}

// ── Consultas (todas começam por SO_LEITURA; ids interpolados só depois de validados como uuid) ──

function uuid(x) {
  if (!UUID_RE.test(String(x))) throw new ErroSeguro('ID INVALIDO: recuso montar a consulta');
  return String(x).toLowerCase();
}

const claims = (sub, papel) => JSON.stringify({ sub: uuid(sub), role: 'authenticated', app_metadata: { role: papel } });

function perfilSql(user) {
  if (!user) return 'null::json';
  return (
    "(select json_build_object('role', u.role::text, 'ativo', u.ativo, 'excluido', u.deleted_at is not null)" +
    `   from public.usuarios_rh u where u.user_id = '${uuid(user)}' order by u.deleted_at nulls first limit 1)`
  );
}

function sqlBase(a) {
  const c = uuid(a.cand);
  return [
    SO_LEITURA,
    '/* p51:base */',
    'with c as (',
    '  select c.id, c.vaga_id, c.etapa_atual::text as etapa, c.status::text as status,',
    "         coalesce(c.motivo_rejeicao = 'knockout_automatico', false) as motivo_ko,",
    '         (c.opcao_knockout_id is not null) as opcao_ko, ca.user_id as titular',
    '    from public.candidaturas c left join public.candidatos ca on ca.id = c.candidato_id',
    `   where c.id = '${c}' and c.deleted_at is null)`,
    'select',
    ' (select row_to_json(c) from c) as cand,',
    " (select json_agg(json_build_object('id', h.id, 'de', h.etapa_de::text, 'para', h.etapa_para::text,",
    "         'auto', h.auto_rejeitado, 'ator', h.ator, 't', extract(epoch from h.criado_em)) order by h.criado_em, h.id)",
    `    from public.historico_candidatura h where h.candidatura_id = '${c}') as hist,`,
    " (select json_agg(json_build_object('id', r.id, 'origem', r.origem, 'etapa_rejeitada', r.etapa_rejeitada::text,",
    "         'etapa_reabertura', r.etapa_reabertura::text, 'veredito', r.veredito, 'respondida_por', r.respondida_por,",
    "         'rejeitado_por', r.rejeitado_por, 'reaberta_t', extract(epoch from r.reaberta_em),",
    "         'prazo', r.prazo_nova_decisao_em is not null, 'hid', r.historico_rejeicao_id,",
    "         'opcao_ko', r.opcao_knockout_id is not null, 'solicitada_t', extract(epoch from r.solicitada_em))",
    '         order by r.solicitada_em, r.id)',
    `    from public.revisao_rejeicao r where r.candidatura_id = '${c}') as pedidos,`,
    " (select json_agg(json_build_object('t_criada', extract(epoch from x.created_at), 't_atual', extract(epoch from x.updated_at),",
    "         'status', x.status::text))",
    `    from public.analise_candidato_vaga x where x.candidatura_id = '${c}') as analises,`,
    " (select json_agg(json_build_object('evento', n.evento::text, 'status', n.status::text, 'template', n.template::text,",
    "         't', extract(epoch from n.criado_em)) order by n.criado_em, n.id)",
    `    from public.notificacoes_enviadas n where n.candidatura_id = '${c}') as notif,`,
    ` (select count(*) from public.cognitivo_liberacao l where l.candidatura_id = '${c}' and l.revogado_em is null)::int as raven_lib,`,
    ` (select count(*) from public.scores_raven s where s.candidatura_id = '${c}')::int as raven_scores,`,
    ` ${perfilSql(a.rh2)} as perfil_rh2,`,
    ` ${perfilSql(a.admin)} as perfil_admin,`,
    ' extract(epoch from pg_catalog.now()) as agora,',
    " current_setting('transaction_read_only') as ro;",
  ].join('\n');
}

/* Fila e funil sob as claims do ator (RPCs SECURITY DEFINER: dependem só das claims). `ko_outras` é a
 * contagem independente, na MESMA transação, dos OUTROS knockouts vigentes da vaga: `kpi - ko_outras`
 * diz se o funil conta ESTA candidatura (1) ou não (0). */
function sqlAtor(a, vaga, sub, papel) {
  const c = uuid(a.cand);
  const v = uuid(vaga);
  return [
    SO_LEITURA,
    '/* p51:ator */',
    `select set_config('request.jwt.claims', '${claims(sub, papel)}', true) is not null as claims;`,
    'select',
    " (select json_agg(json_build_object('pedido_id', f.pedido_id, 'origem', f.origem, 'pode_responder', f.pode_responder,",
    "         'veredito', f.revisao_veredito))",
    `    from public.listar_revisoes_decisao(true) f where f.candidatura_id = '${c}') as fila,`,
    ` ((public.funil_kpis('${v}'::uuid) -> 'knockout_rate' ->> 'knockouts'))::int as kpi_knockouts,`,
    ` (select count(*) from public.candidaturas o where o.vaga_id = '${v}' and o.deleted_at is null`,
    `     and o.motivo_rejeicao = 'knockout_automatico' and o.status = 'rejeitado' and o.id <> '${c}')::int as ko_outras,`,
    " current_setting('transaction_read_only') as ro;",
  ].join('\n');
}

/* O que o RH2 vê pela RLS (D-07 da 50: dado de teste não fica escondido do RH). */
function sqlVisivel(a) {
  const c = uuid(a.cand);
  return [
    SO_LEITURA,
    '/* p51:visivel */',
    `select set_config('request.jwt.claims', '${claims(a.rh2, 'rh')}', true) is not null as claims;`,
    'set local role authenticated;',
    'select',
    ` (select count(*) from public.candidaturas x where x.id = '${c}')::int as candidaturas,`,
    ' (select count(*) from public.candidatos ca where exists (select 1 from public.candidaturas x',
    `     where x.id = '${c}' and x.candidato_id = ca.id))::int as candidatos,`,
    " current_setting('transaction_read_only') as ro;",
  ].join('\n');
}

/* O que o TITULAR lê: a chave raven de get_avaliacao_status e o estado do pedido (só origem, elegível,
 * veredito — nunca a resposta). O user_id do titular só entra nas claims; nunca é impresso. */
function sqlTitular(a, titular) {
  const c = uuid(a.cand);
  return [
    SO_LEITURA,
    '/* p51:titular */',
    `select set_config('request.jwt.claims', '${claims(titular, 'candidato')}', true) is not null as claims;`,
    'set local role authenticated;',
    'select',
    ` (public.get_avaliacao_status('${c}'::uuid) -> 'raven') as raven,`,
    " (select json_build_object('origem', e ->> 'origem', 'elegivel', (e ->> 'elegivel')::boolean,",
    "         'veredito', e #>> '{pedido,veredito}')",
    `    from (select public.estado_revisao_rejeicao('${c}'::uuid) as e) z) as estado,`,
    " current_setting('transaction_read_only') as ro;",
  ].join('\n');
}

const DML_GUARDA = /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|merge|call|copy|vacuum|refresh|lock|notify)\b/i;

function lerSoLeitura(lerPg, sql) {
  if (!sql.startsWith(SO_LEITURA) || DML_GUARDA.test(sql)) throw new ErroSeguro('CONSULTA FORA DO SO-LEITURA: recuso enviar');
  const row = lerPg(sql);
  if (!row || row.ro !== 'on') throw new ErroSeguro('LEITURA POSTGRES NAO FOI SO-LEITURA: recuso seguir');
  return row;
}

function lerPostgresReal(sql) {
  let out;
  try {
    out = execFileSync(process.execPath, [APPLY, 'sql', sql], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const msg = String((e && (e.stderr || e.message)) || '').split('\n').find((l) => l.trim()) || 'sem mensagem';
    throw new ErroSeguro(`LEITURA POSTGRES FALHOU (p46apply): ${msg.slice(0, 200)}`);
  }
  let linhas;
  try {
    linhas = JSON.parse(out);
  } catch {
    throw new ErroSeguro('LEITURA POSTGRES SEM RESULTADO JSON');
  }
  if (!Array.isArray(linhas) || linhas.length !== 1) throw new ErroSeguro('LEITURA POSTGRES: esperava 1 linha');
  return linhas[0];
}

// ── Normalização ─────────────────────────────────────────────────────────────

const lista = (x) => (Array.isArray(x) ? x : []);
const num = (x) => (x === null || x === undefined || x === '' ? null : Number(x));
const idOuNulo = (x) => (UUID_RE.test(String(x)) ? String(x).toLowerCase() : null);

function normalizarBase(row) {
  const c = row.cand;
  if (!c || !UUID_RE.test(String(c.id))) throw new ErroSeguro('CANDIDATURA NAO ENCONTRADA (inexistente ou excluida)');
  return {
    cand: {
      id: idOuNulo(c.id),
      vaga: idOuNulo(c.vaga_id),
      etapa: c.etapa,
      status: c.status,
      motivo_ko: c.motivo_ko === true,
      opcao_ko: c.opcao_ko === true,
      titular: idOuNulo(c.titular),
    },
    hist: lista(row.hist).map((h) => ({ id: idOuNulo(h.id), de: h.de, para: h.para, auto: h.auto === true, ator: idOuNulo(h.ator), t: num(h.t) })),
    pedidos: lista(row.pedidos).map((p) => ({
      id: idOuNulo(p.id),
      origem: p.origem,
      etapa_rejeitada: p.etapa_rejeitada,
      etapa_reabertura: p.etapa_reabertura,
      veredito: p.veredito,
      respondida_por: idOuNulo(p.respondida_por),
      rejeitado_por: idOuNulo(p.rejeitado_por),
      reaberta_t: num(p.reaberta_t),
      prazo: p.prazo === true,
      hid: idOuNulo(p.hid),
      opcao_ko: p.opcao_ko === true,
    })),
    analises: lista(row.analises).map((x) => ({ t_criada: num(x.t_criada), t_atual: num(x.t_atual), status: x.status })),
    notif: lista(row.notif).map((x) => ({ evento: x.evento, status: x.status, template: x.template, t: num(x.t) })),
    raven: { lib: Number(row.raven_lib) || 0, scores: Number(row.raven_scores) || 0 },
    perfis: { rh2: row.perfil_rh2 || null, admin: row.perfil_admin || null },
    agora: num(row.agora),
  };
}

const normalizarAtor = (row) => ({
  fila: lista(row.fila).map((f) => ({ pedido_id: idOuNulo(f.pedido_id), origem: f.origem, pode_responder: f.pode_responder, veredito: f.veredito })),
  kpi: num(row.kpi_knockouts),
  outras: num(row.ko_outras),
});

function coletar(a, lerPg) {
  const d = normalizarBase(lerSoLeitura(lerPg, sqlBase(a)));
  d.atores = {};
  if (a.rh2) {
    d.atores.rh2 = normalizarAtor(lerSoLeitura(lerPg, sqlAtor(a, d.cand.vaga, a.rh2, 'rh')));
    const v = lerSoLeitura(lerPg, sqlVisivel(a));
    d.vis = { candidaturas: num(v.candidaturas), candidatos: num(v.candidatos) };
  }
  if (a.admin) d.atores.admin = normalizarAtor(lerSoLeitura(lerPg, sqlAtor(a, d.cand.vaga, a.admin, 'administrador')));
  d.titular = null;
  if (d.cand.titular) {
    const t = lerSoLeitura(lerPg, sqlTitular(a, d.cand.titular));
    d.titular = {
      raven: t.raven && typeof t.raven === 'object' ? { liberado: t.raven.liberado, registrado: t.raven.registrado } : null,
      estado: t.estado && typeof t.estado === 'object' ? t.estado : null,
    };
  }
  return d;
}

// ── Conferências por fase ────────────────────────────────────────────────────

function quem(u, a) {
  if (u === null || u === undefined) return 'nulo';
  if (a.rh2 && u === a.rh2) return 'rh2';
  if (a.admin && u === a.admin) return 'admin';
  return 'outro';
}

const ultimaRejeicao = (hist) => [...hist].reverse().find((h) => h.para === 'rejeitado' || h.auto) || null;
const rejeicoesDesde = (hist, t) => hist.filter((h) => h.t !== null && h.t >= t && (h.auto || h.para === 'rejeitado')).length;
const contaNotif = (d, evento, desde = null) => d.notif.filter((x) => x.evento === evento && (desde === null || (x.t !== null && x.t >= desde))).length;
const perfilFicha = (p) => (!p ? 'ausente' : p.excluido ? 'excluido' : `${p.role}_${p.ativo ? 'ativo' : 'inativo'}`);

function avaliar(fase, d, a) {
  const cs = [];
  const add = (nome, esperado, obtido, ok, nota) => cs.push({ nome, esperado, obtido, ok: ok === undefined ? obtido === esperado : !!ok, nota });
  const c = d.cand;
  const q = (u) => quem(u, a);
  const est = d.titular && d.titular.estado;
  const ultRej = ultimaRejeicao(d.hist);
  const pAuto = d.pedidos.find((p) => p.origem === 'automatica') || null;
  const pUlt = d.pedidos.length ? d.pedidos[d.pedidos.length - 1] : null;
  const p2 = pUlt && pUlt !== pAuto ? pUlt : null;
  const funil = () => {
    const r = d.atores.rh2;
    if (!r || r.kpi === null || r.outras === null) return '-';
    const dif = r.kpi - r.outras;
    return dif === 1 ? true : dif === 0 ? false : 'incoerente';
  };
  const linhaFila = (ator, p) => (d.atores[ator] && p ? d.atores[ator].fila.find((f) => f.pedido_id === p.id) || null : null);
  const visivel = () => {
    add('rh2:ve_candidatura', 1, d.vis ? d.vis.candidaturas : '-', undefined, 'D-07 da 50');
    add('rh2:ve_candidato', 1, d.vis ? d.vis.candidatos : '-');
  };
  const perfilRh2 = () => add('perfil:rh2', 'recrutador_ativo', perfilFicha(d.perfis.rh2));
  const perfilAdmin = () => add('perfil:admin', 'administrador_ativo', perfilFicha(d.perfis.admin));

  const reabertura1 = () => {
    const t = pAuto ? pAuto.reaberta_t : null;
    add('revisao:pedidos_automaticos', 1, d.pedidos.filter((p) => p.origem === 'automatica').length);
    add('revisao:etapa_reabertura', 'triagem', pAuto ? pAuto.etapa_reabertura : '-', undefined, 'D-30');
    add('revisao:veredito', 'revertida', pAuto ? pAuto.veredito : '-');
    add('revisao:respondida_por_rh2', true, !!pAuto && q(pAuto.respondida_por) === 'rh2');
    add('revisao:reaberta_em_presente', true, t !== null);
    add('revisao:prazo_presente', true, !!pAuto && pAuto.prazo, undefined, 'D-04');
    add('candidatura:etapa_atual', 'triagem', c.etapa);
    add('candidatura:status', 'em_analise', c.status);
    add('candidatura:motivo_knockout_mantido', true, c.motivo_ko, undefined, 'D-35');
    const linhas = t === null ? [] : d.hist.filter((h) => h.t !== null && h.t >= t && h.de === 'inscricao' && h.para === 'triagem');
    add('historico:linhas_de_reabertura', 1, linhas.length);
    add('historico:reabertura_ator_rh2', true, linhas.length === 1 && q(linhas[0].ator) === 'rh2');
    add(
      'analise:despachada_apos_reabertura',
      true,
      t !== null && d.analises.some((x) => Math.max(x.t_criada ?? -Infinity, x.t_atual ?? -Infinity) >= t),
      undefined,
      'D-36'
    );
    add('knockout:nao_voltou', 0, t === null ? '-' : rejeicoesDesde(d.hist, t), undefined, 'D-03');
    add('funil:conta_como_knockout', false, funil());
    add('notificacao:revisao_solicitada', true, contaNotif(d, 'revisao_solicitada') >= 1);
    add('notificacao:revisao_respondida', true, t !== null && contaNotif(d, 'revisao_respondida', t) >= 1);
    add('titular:estado_veredito', 'revertida', est ? est.veredito : '-');
    visivel();
    perfilRh2();
    return t;
  };

  switch (fase) {
    case 'knockout':
      add('candidatura:status', 'rejeitado', c.status);
      add('candidatura:etapa_atual', 'inscricao', c.etapa);
      add('candidatura:motivo_knockout', true, c.motivo_ko);
      add('candidatura:opcao_knockout_presente', true, c.opcao_ko);
      add('historico:ultima_rejeicao_automatica', true, !!ultRej && ultRej.auto);
      add('historico:ultima_rejeicao_sem_ator', true, !!ultRej && ultRej.ator === null);
      add('notificacao:decisao', true, !!ultRej && contaNotif(d, 'decisao', ultRej.t) >= 1, undefined, 'e-mail de rejeicao, D-09');
      add('revisao:pedidos_respondidos', 0, d.pedidos.filter((p) => p.veredito !== null && p.veredito !== undefined).length);
      add('funil:conta_como_knockout', true, funil());
      add('titular:estado_origem', 'automatica', est ? est.origem : '-');
      visivel();
      perfilRh2();
      break;
    case 'reaberta':
      reabertura1();
      break;
    case 'reaberta-10min': {
      const t = reabertura1();
      const seg = t === null || d.agora === null ? '-' : Math.floor(d.agora - t);
      const ok = typeof seg === 'number' && seg >= DEZ_MINUTOS;
      add(ok ? 'dez-minutos' : 'cedo-demais', DEZ_MINUTOS, seg, ok, 'segundos desde reaberta_em, D-03');
      break;
    }
    case 'rejeitada-rh': {
      add('candidatura:status', 'rejeitado', c.status);
      add('candidatura:etapa_atual', 'rejeitado', c.etapa);
      add('candidatura:motivo_knockout', false, c.motivo_ko);
      add('historico:ultima_rejeicao_humana', true, !!ultRej && !ultRej.auto && ultRej.para === 'rejeitado');
      add('historico:ultima_rejeicao_ator_admin', true, !!ultRej && q(ultRej.ator) === 'admin');
      add('historico:ultima_rejeicao_de', 'triagem', ultRej ? ultRej.de : '-');
      add('revisao:pedidos', 2, d.pedidos.length);
      add('revisao:pedido_1_revertido', true, !!pAuto && pAuto.veredito === 'revertida');
      add('revisao:pedido_2_origem', 'humana_triagem', p2 ? p2.origem : '-');
      add('revisao:pedido_2_rejeitado_por_admin', true, !!p2 && q(p2.rejeitado_por) === 'admin');
      add('revisao:pedido_2_pendente', true, !!p2 && (p2.veredito === null || p2.veredito === undefined));
      add('revisao:pedido_2_da_rejeicao_corrente', true, !!p2 && !!ultRej && p2.hid === ultRej.id);
      add('revisao:pedido_2_etapa_reabertura', 'triagem', p2 ? p2.etapa_reabertura : '-');
      add('revisao:rejeicoes_distintas', 2, new Set(d.pedidos.map((p) => p.hid)).size, undefined, 'D-06');
      const fa = linhaFila('admin', p2);
      const fr = linhaFila('rh2', p2);
      add('fila:admin_pode_responder', false, fa ? fa.pode_responder : '-', undefined, 'REVISAO-05');
      add('fila:rh2_pode_responder', true, fr ? fr.pode_responder : '-');
      add('notificacao:decisao_da_rejeicao_rh', true, !!ultRej && contaNotif(d, 'decisao', ultRej.t) >= 1);
      add('funil:conta_como_knockout', false, funil());
      add('titular:estado_origem', 'humana_triagem', est ? est.origem : '-');
      visivel();
      perfilRh2();
      perfilAdmin();
      break;
    }
    case 'reaberta-2': {
      const t2 = p2 ? p2.reaberta_t : null;
      add('revisao:pedidos', 2, d.pedidos.length);
      add('revisao:pedido_2_origem', 'humana_triagem', p2 ? p2.origem : '-');
      add('revisao:pedido_2_veredito', 'revertida', p2 ? p2.veredito : '-');
      add('revisao:pedido_2_rejeitado_por_admin', true, !!p2 && q(p2.rejeitado_por) === 'admin', undefined, 'decisor = admin');
      add('revisao:pedido_2_respondida_por_rh2', true, !!p2 && q(p2.respondida_por) === 'rh2', undefined, 'revisor = RH2');
      add(
        'revisao:pedido_2_decisor_distinto_do_revisor',
        true,
        !!p2 && p2.rejeitado_por !== null && p2.respondida_por !== null && p2.rejeitado_por !== p2.respondida_por,
        undefined,
        'REVISAO-05'
      );
      const hRej = p2 ? d.hist.find((h) => h.id === p2.hid) || null : null;
      add('historico:rejeicao_do_pedido_2_ator_admin', true, !!hRej && !hRej.auto && q(hRej.ator) === 'admin');
      add('revisao:pedido_2_reaberta_em_presente', true, t2 !== null);
      add('revisao:pedido_2_prazo_presente', true, !!p2 && p2.prazo);
      add('revisao:rejeicoes_distintas', 2, new Set(d.pedidos.map((p) => p.hid)).size, undefined, 'D-06');
      const linhas =
        t2 === null ? [] : d.hist.filter((h) => h.t !== null && h.t >= t2 && h.de === 'rejeitado' && h.para === p2.etapa_reabertura);
      add('historico:linhas_de_reabertura_2', 1, linhas.length);
      add('historico:reabertura_2_ator_rh2', true, linhas.length === 1 && q(linhas[0].ator) === 'rh2');
      add('candidatura:etapa_atual', 'triagem', c.etapa);
      add('candidatura:status', 'em_analise', c.status);
      add('rejeicao:nao_voltou', 0, t2 === null ? '-' : rejeicoesDesde(d.hist, t2));
      add('notificacao:revisao_respondida_2', true, t2 !== null && contaNotif(d, 'revisao_respondida', t2) >= 1);
      add('titular:estado_origem', 'humana_triagem', est ? est.origem : '-');
      add('titular:estado_veredito', 'revertida', est ? est.veredito : '-');
      add('funil:conta_como_knockout', false, funil());
      visivel();
      perfilRh2();
      perfilAdmin();
      break;
    }
    case 'raven': {
      const r = d.titular && d.titular.raven;
      add('raven:liberacao_ativa', true, d.raven.lib >= 1);
      add('notificacao:cognitivo_liberado', true, contaNotif(d, 'cognitivo_liberado') >= 1, undefined, 'D-31');
      add('titular:raven_liberado', true, r ? r.liberado : '-');
      add('titular:raven_registrado_coerente', true, !!r && typeof r.registrado === 'boolean' && r.registrado === d.raven.scores > 0);
      break;
    }
    default:
      throw new ErroSeguro('FASE DESCONHECIDA');
  }
  return cs;
}

function infos(fase, d, a) {
  const q = (u) => quem(u, a);
  const l = [];
  l.push(linhaInfo('fase', { fase, candidatura: d.cand.id, vaga: d.cand.vaga }));
  l.push(linhaInfo('candidatura', { etapa: d.cand.etapa, status: d.cand.status, motivo_knockout: d.cand.motivo_ko, opcao_knockout: d.cand.opcao_ko }));
  l.push(linhaInfo('historico', { linhas: d.hist.length }));
  d.hist.slice(-3).forEach((h, i, arr) => l.push(linhaInfo('historico_linha', { pos: i - arr.length, de: h.de, para: h.para, auto: h.auto, ator: q(h.ator) })));
  d.pedidos.forEach((p, i) =>
    l.push(
      linhaInfo('pedido', {
        k: i + 1,
        id: p.id,
        origem: p.origem,
        etapa_rejeitada: p.etapa_rejeitada,
        etapa_reabertura: p.etapa_reabertura,
        veredito: p.veredito,
        rejeitado_por: q(p.rejeitado_por),
        respondida_por: q(p.respondida_por),
        reaberta: p.reaberta_t !== null,
        prazo: p.prazo,
      })
    )
  );
  d.analises.forEach((x) => l.push(linhaInfo('analise', { status: x.status })));
  d.notif.forEach((x) => l.push(linhaInfo('notificacao', { evento: x.evento, status: x.status, template: x.template })));
  for (const [ator, r] of Object.entries(d.atores)) {
    l.push(linhaInfo('funil', { ator, kpi_knockouts: r.kpi, outros_knockouts_da_vaga: r.outras }));
    r.fila.forEach((f) => l.push(linhaInfo('fila', { ator, pedido: f.pedido_id, origem: f.origem, pode_responder: f.pode_responder, veredito: f.veredito })));
  }
  if (d.vis) l.push(linhaInfo('rh2_ve', d.vis));
  if (d.titular && d.titular.raven) l.push(linhaInfo('raven', { liberado: d.titular.raven.liberado, registrado: d.titular.raven.registrado, liberacoes_ativas: d.raven.lib, scores: d.raven.scores }));
  if (d.titular && d.titular.estado) l.push(linhaInfo('estado_titular', { origem: d.titular.estado.origem, elegivel: d.titular.estado.elegivel, veredito: d.titular.estado.veredito }));
  const ref = fase === 'reaberta-2' ? d.pedidos[d.pedidos.length - 1] : d.pedidos.find((p) => p.origem === 'automatica');
  if (ref && ref.reaberta_t !== null && d.agora !== null) l.push(linhaInfo('tempo', { segundos_desde_reabertura: Math.floor(d.agora - ref.reaberta_t) }));
  return l;
}

// ── Execução ─────────────────────────────────────────────────────────────────

function principal(argv, deps) {
  const { out, lerPg } = deps;
  let a;
  try {
    a = lerArgs(argv);
  } catch (e) {
    if (e instanceof ErroUso) {
      out.erro(e.message);
      return 2;
    }
    throw e;
  }
  try {
    const d = coletar(a, lerPg);
    const cs = avaliar(a.fase, d, a);
    for (const l of infos(a.fase, d, a)) out.linha(l);
    for (const c of cs) out.linha(linhaCheck(c));
    const k = cs.filter((c) => c.ok).length;
    out.linha(`aceite: ${k}/${cs.length} conferencias OK`);
    return cs.length > 0 && k === cs.length ? 0 : 1;
  } catch (e) {
    if (e instanceof ErroSeguro) {
      out.erro(e.message);
      return 1;
    }
    out.erro(`ERRO INESPERADO: ${(e && e.name) || 'Error'}`);
    return 1;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// --auto-teste (offline: rede proibida, banco substituído por fixtures)
// ═════════════════════════════════════════════════════════════════════════════

const T = {
  CAND: '11111111-1111-4111-8111-111111111111',
  VAGA: '22222222-2222-4222-8222-222222222222',
  RH2: '33333333-3333-4333-8333-333333333333',
  ADMIN: '44444444-4444-4444-8444-444444444444',
  TIT: '55555555-5555-4555-8555-555555555555',
  H0: 'a0000000-0000-4000-8000-000000000000',
  H1: 'a1111111-1111-4111-8111-111111111111',
  H2: 'a2222222-2222-4222-8222-222222222222',
  H3: 'a3333333-3333-4333-8333-333333333333',
  H4: 'a4444444-4444-4444-8444-444444444444',
  H5: 'a5555555-5555-4555-8555-555555555555',
  P1: 'b1111111-1111-4111-8111-111111111111',
  P2: 'b2222222-2222-4222-8222-222222222222',
};

const clone = (o) => JSON.parse(JSON.stringify(o));

/* Uma linha do tempo da sessão real, em segundos: 1000 knockout · 1500 pedido 1 · 2000 reabertura 1 ·
 * 3000 rejeição pelo admin · 3100 pedido 2 · 4000 reabertura 2 · 5000 Raven liberado. */
function fixtures() {
  const h = (id, de, para, auto, ator, t) => ({ id, de, para, auto, ator, t });
  const n = (evento, t, status = 'entregue', template = 'tpl_' + evento) => ({ evento, status, template, t });
  const perfis = {
    perfil_rh2: { role: 'recrutador', ativo: true, excluido: false },
    perfil_admin: { role: 'administrador', ativo: true, excluido: false },
  };
  const H0 = h(T.H0, null, 'inscricao', false, null, 900);
  const H1 = h(T.H1, 'inscricao', 'inscricao', true, null, 1000);
  const H2 = h(T.H2, 'inscricao', 'triagem', false, T.RH2, 2000);
  const H3 = h(T.H3, 'triagem', 'rejeitado', false, T.ADMIN, 3000);
  const H4 = h(T.H4, 'rejeitado', 'triagem', false, T.RH2, 4000);
  const P1pend = {
    id: T.P1, origem: 'automatica', etapa_rejeitada: 'inscricao', etapa_reabertura: 'triagem', veredito: null,
    respondida_por: null, rejeitado_por: null, reaberta_t: null, prazo: false, hid: T.H1, opcao_ko: true, solicitada_t: 1500,
  };
  const P1 = { ...P1pend, veredito: 'revertida', respondida_por: T.RH2, reaberta_t: 2000, prazo: true };
  const P2pend = {
    id: T.P2, origem: 'humana_triagem', etapa_rejeitada: 'triagem', etapa_reabertura: 'triagem', veredito: null,
    respondida_por: null, rejeitado_por: T.ADMIN, reaberta_t: null, prazo: false, hid: T.H3, opcao_ko: false, solicitada_t: 3100,
  };
  const P2 = { ...P2pend, veredito: 'revertida', respondida_por: T.RH2, reaberta_t: 4000, prazo: true };
  const ro = 'on';
  const cand = (etapa, status, motivo_ko) => ({ id: T.CAND, vaga_id: T.VAGA, etapa, status, motivo_ko, opcao_ko: true, titular: T.TIT });
  const vis = { candidaturas: 1, candidatos: 1, ro };
  const fila = (...linhas) => linhas.map(([p, pode]) => ({ pedido_id: p.id, origem: p.origem, pode_responder: pode, veredito: p.veredito }));

  const knockout = {
    base: {
      cand: cand('inscricao', 'rejeitado', true), hist: [H0, H1], pedidos: null, analises: null,
      notif: [n('confirmacao', 901), n('decisao', 1001)], raven_lib: 0, raven_scores: 0, ...perfis, agora: 1100, ro,
    },
    rh2: { fila: null, kpi_knockouts: 3, ko_outras: 2, ro },
    admin: { fila: null, kpi_knockouts: 3, ko_outras: 2, ro },
    vis,
    titular: { raven: { liberado: false, registrado: false }, estado: { origem: 'automatica', elegivel: true, veredito: null }, ro },
  };
  const reaberta = {
    base: {
      cand: cand('triagem', 'em_analise', true), hist: [H0, H1, H2], pedidos: [P1],
      analises: [{ t_criada: 2010, t_atual: 2030, status: 'sucesso' }],
      notif: [n('confirmacao', 901), n('decisao', 1001), n('revisao_solicitada', 1501), n('revisao_respondida', 2001)],
      raven_lib: 0, raven_scores: 0, ...perfis, agora: 2100, ro,
    },
    rh2: { fila: fila([P1, false]), kpi_knockouts: 2, ko_outras: 2, ro },
    admin: { fila: fila([P1, false]), kpi_knockouts: 2, ko_outras: 2, ro },
    vis,
    titular: { raven: { liberado: false, registrado: false }, estado: { origem: 'automatica', elegivel: false, veredito: 'revertida' }, ro },
  };
  const reaberta10 = clone(reaberta);
  reaberta10.base.agora = 2000 + 700;
  const rejeitadaRh = {
    base: {
      cand: cand('rejeitado', 'rejeitado', false), hist: [H0, H1, H2, H3], pedidos: [P1, P2pend],
      analises: [{ t_criada: 2010, t_atual: 2030, status: 'sucesso' }],
      notif: [n('confirmacao', 901), n('decisao', 1001), n('revisao_solicitada', 1501), n('revisao_respondida', 2001), n('decisao', 3001), n('revisao_solicitada', 3101)],
      raven_lib: 0, raven_scores: 0, ...perfis, agora: 3200, ro,
    },
    rh2: { fila: fila([P1, false], [P2pend, true]), kpi_knockouts: 2, ko_outras: 2, ro },
    admin: { fila: fila([P1, false], [P2pend, false]), kpi_knockouts: 2, ko_outras: 2, ro },
    vis,
    titular: { raven: { liberado: false, registrado: false }, estado: { origem: 'humana_triagem', elegivel: false, veredito: null }, ro },
  };
  const reaberta2 = {
    base: {
      cand: cand('triagem', 'em_analise', false), hist: [H0, H1, H2, H3, H4], pedidos: [P1, P2],
      analises: [{ t_criada: 2010, t_atual: 2030, status: 'sucesso' }],
      notif: [...rejeitadaRh.base.notif, n('revisao_respondida', 4001)],
      raven_lib: 0, raven_scores: 0, ...perfis, agora: 4100, ro,
    },
    rh2: { fila: fila([P1, false], [P2, false]), kpi_knockouts: 2, ko_outras: 2, ro },
    admin: { fila: fila([P1, false], [P2, false]), kpi_knockouts: 2, ko_outras: 2, ro },
    vis,
    titular: { raven: { liberado: false, registrado: false }, estado: { origem: 'humana_triagem', elegivel: false, veredito: 'revertida' }, ro },
  };
  const raven = clone(reaberta2);
  raven.base.raven_lib = 1;
  raven.base.notif.push(n('cognitivo_liberado', 5001));
  raven.base.agora = 5100;
  raven.titular.raven = { liberado: true, registrado: false };
  return { knockout, reaberta, 'reaberta-10min': reaberta10, 'rejeitada-rh': rejeitadaRh, 'reaberta-2': reaberta2, raven };
}

function falsoPg(estado, registro) {
  return (sql) => {
    registro.push(sql);
    if (sql.includes('/* p51:base */')) return clone(estado.base);
    if (sql.includes('/* p51:ator */')) return clone(sql.includes('"role":"administrador"') ? estado.admin : estado.rh2);
    if (sql.includes('/* p51:visivel */')) return clone(estado.vis);
    if (sql.includes('/* p51:titular */')) return clone(estado.titular);
    throw new ErroSeguro('LEITURA DESCONHECIDA NO AUTO-TESTE');
  };
}

function rodar(argv, estado) {
  const linhas = [];
  const registro = [];
  const out = criarSaida((canal, s) => linhas.push(s));
  let code;
  try {
    code = principal(argv, { lerPg: falsoPg(estado || fixtures().knockout, registro), out });
  } catch (e) {
    code = `excecao:${(e && e.message) || e}`;
  }
  return { code, linhas, registro, texto: linhas.join('\n') };
}

const ARGV = (fase, extra = []) => [T.CAND, '--fase', fase, '--rh2', T.RH2, '--admin', T.ADMIN, ...extra];
const EMAIL_RE = /[^\s@<>()"'=]+@[^\s@<>()"']+\.[^\s@<>()"']+/;
const DML_RE = /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|merge|call|copy|vacuum|refresh|lock|notify)\b/i;
const COLUNAS_PESSOAIS_RE = /\b(nome_completo|candidato_nome|vaga_titulo|decidido_por_nome|respondida_por_nome|email|destinatario_email|destinatario_original|cpf|celular|telefone|criterio_texto|resultado|revisao_resultado|justificativa|feedback_rejeicao|opcao_texto|resposta_texto)\b/i;

function autoTeste() {
  const falhas = [];
  let n = 0;
  const af = (cond, msg) => {
    n += 1;
    if (!cond) falhas.push(msg);
  };
  const fetchGlobal = globalThis.fetch;
  let redeUsada = 0;
  globalThis.fetch = () => {
    redeUsada += 1;
    throw new Error('rede proibida no auto-teste');
  };
  try {
    const fx = fixtures();

    // ── Recusas de uso (saída 2, nenhuma leitura)
    const recusa = (argv, codigo, trecho, rotulo) => {
      const r = rodar(argv);
      af(r.code === codigo, `${rotulo}: saida ${r.code}, esperava ${codigo}`);
      af(r.texto.includes(trecho), `${rotulo}: sem «${trecho}»`);
      af(r.registro.length === 0, `${rotulo}: leu o banco numa recusa de uso`);
      af(!EMAIL_RE.test(r.texto), `${rotulo}: imprimiu algo com forma de e-mail`);
    };
    recusa([], 2, 'SEM CANDIDATURA', 'sem argumento');
    recusa(['nao-e-uuid', '--fase', 'knockout', '--rh2', T.RH2], 2, 'SEM CANDIDATURA', 'argumento nao-uuid');
    recusa(['fulano@exemplo.com', '--fase', 'knockout'], 2, 'SEM CANDIDATURA', 'argumento com forma de e-mail');
    recusa([T.CAND, '--fase', 'qualquer'], 2, 'FASE DESCONHECIDA', 'fase fora do vocabulario');
    recusa([T.CAND, '--fase', 'fulano@exemplo.com'], 2, 'FASE DESCONHECIDA', 'fase com forma de e-mail');
    recusa([T.CAND], 2, 'FASE AUSENTE', 'sem --fase');
    recusa([T.CAND, '--fase', 'reaberta'], 2, 'FALTA --rh2', 'reaberta sem --rh2');
    recusa([T.CAND, '--fase', 'reaberta-2', '--rh2', T.RH2], 2, 'FALTA --admin', 'reaberta-2 sem --admin');
    recusa([T.CAND, '--fase', 'rejeitada-rh', '--rh2', 'x', '--admin', T.ADMIN], 2, '--rh2 NAO E UUID', 'rh2 nao-uuid');
    recusa([T.CAND, '--fase', 'reaberta-2', '--rh2', T.RH2, '--admin', T.RH2], 2, 'MESMA PESSOA', 'rh2 = admin');
    recusa([T.CAND, '--fase', 'knockout', '--rh2', T.RH2, '--senha', 'x'], 2, 'OPCAO DESCONHECIDA', 'opcao estranha');

    // ── Formatador e blindagem
    af(valorSeguro('fulano@exemplo.com') === '<redigido>', 'valorSeguro deixou passar e-mail');
    af(valorSeguro('Maria da Silva') === '<redigido>', 'valorSeguro deixou passar texto livre');
    af(valorSeguro('Resposta ao titular com mais de cinquenta caracteres, livre.') === '<redigido>', 'valorSeguro deixou passar justificativa');
    af(valorSeguro(T.CAND) === T.CAND, 'valorSeguro barrou uuid');
    af(valorSeguro(true) === 'true' && valorSeguro(false) === 'false', 'valorSeguro barrou booleano');
    af(valorSeguro(3) === '3' && valorSeguro(null) === '-' && valorSeguro('-') === '-', 'valorSeguro numero/nulo/ausente');
    af(valorSeguro('humana_triagem') === 'humana_triagem', 'valorSeguro barrou ficha');
    af(/^FALHA conferencia /.test(linhaCheck({ nome: 'Nome Livre', esperado: 1, obtido: 2, ok: false })), 'linhaCheck aceitou nome livre');
    af(!EMAIL_RE.test(linhaCheck({ nome: 'x', esperado: 'a@b.com', obtido: 'c@d.org', ok: false })), 'linhaCheck imprimiu e-mail');
    af(!EMAIL_RE.test(blindar('antes fulano@exemplo.com depois')), 'blindar deixou e-mail');
    af(!/eyJ/.test(blindar('token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc')), 'blindar deixou JWT');

    // ── Caminho feliz de cada fase: saída 0, N/N, nenhuma FALHA
    const minimo = { knockout: 12, reaberta: 19, 'reaberta-10min': 20, 'rejeitada-rh': 20, 'reaberta-2': 20, raven: 4 };
    for (const fase of FASES) {
      const r = rodar(ARGV(fase), fx[fase]);
      const m = /^aceite: (\d+)\/(\d+) conferencias OK$/m.exec(r.texto);
      af(r.code === 0, `${fase}: saida ${r.code} no caminho feliz${r.linhas.filter((l) => l.startsWith('FALHA')).map((l) => ' | ' + l).join('')}`);
      af(m && m[1] === m[2] && Number(m[2]) >= minimo[fase], `${fase}: linha final N/N ausente ou curta (${m ? m[0] : 'nenhuma'})`);
      af(!/^FALHA /m.test(r.texto), `${fase}: FALHA no caminho feliz`);
      af(r.linhas.every((l) => /^(OK|FALHA|info|aceite:) /.test(l)), `${fase}: linha fora do formato`);
      af(!r.texto.includes(T.TIT), `${fase}: imprimiu o user_id do titular`);
      af(!EMAIL_RE.test(r.texto), `${fase}: forma de e-mail na saida`);
      // Toda consulta só-leitura, sem DML e sem coluna pessoal
      af(r.registro.length >= 2, `${fase}: leu o banco ${r.registro.length} vez(es)`);
      af(r.registro.every((s) => s.startsWith(SO_LEITURA)), `${fase}: consulta sem «${SO_LEITURA}» no inicio`);
      af(r.registro.every((s) => !DML_RE.test(s)), `${fase}: consulta com palavra de escrita`);
      af(r.registro.every((s) => !COLUNAS_PESSOAIS_RE.test(s)), `${fase}: consulta seleciona coluna pessoal`);
      const titular = r.registro.find((s) => s.includes('/* p51:titular */'));
      af(titular && titular.includes('set local role authenticated;') && titular.includes(T.TIT), `${fase}: leitura do titular sem impersonacao`);
      if (PRECISA[fase].includes('rh2')) {
        const vis = r.registro.find((s) => s.includes('/* p51:visivel */'));
        af(vis && vis.includes('set local role authenticated;') && vis.includes(T.RH2), `${fase}: visibilidade sem impersonacao do RH2`);
      }
    }
    // knockout sem --admin também roda
    {
      const r = rodar([T.CAND, '--fase', 'knockout', '--rh2', T.RH2], fx.knockout);
      af(r.code === 0, `knockout sem --admin: saida ${r.code}`);
    }

    // ── O portão MORDE: cada mutação reprova com a conferência certa
    const morde = (fase, mutar, prefixo, rotulo) => {
      const e = clone(fx[fase]);
      mutar(e);
      const r = rodar(ARGV(fase), e);
      af(r.code === 1, `${rotulo}: saida ${r.code}, esperava 1`);
      af(r.linhas.some((l) => l.startsWith(prefixo)), `${rotulo}: sem linha «${prefixo}»`);
      af(/^aceite: \d+\/\d+ conferencias OK$/m.test(r.texto), `${rotulo}: sem linha final`);
    };
    morde('knockout', (e) => { e.rh2.kpi_knockouts = 2; }, 'FALHA funil:conta_como_knockout', 'knockout fora do funil');
    morde('knockout', (e) => { e.base.hist[1].auto = false; e.base.hist[1].para = 'rejeitado'; e.base.hist[1].ator = T.RH2; }, 'FALHA historico:ultima_rejeicao_automatica', 'knockout sem auto_rejeitado');
    morde('knockout', (e) => { e.base.notif = e.base.notif.filter((x) => x.evento !== 'decisao'); }, 'FALHA notificacao:decisao', 'knockout sem e-mail de rejeicao');
    morde('knockout', (e) => { e.vis.candidaturas = 0; }, 'FALHA rh2:ve_candidatura', 'dado de teste escondido do RH');
    morde('reaberta', (e) => { e.base.pedidos[0].respondida_por = T.ADMIN; }, 'FALHA revisao:respondida_por_rh2', 'reaberta por outro');
    morde('reaberta', (e) => { e.base.cand.motivo_ko = false; }, 'FALHA candidatura:motivo_knockout_mantido', 'motivo apagado (D-35)');
    morde('reaberta', (e) => { e.base.analises = [{ t_criada: 500, t_atual: 600, status: 'sucesso' }]; }, 'FALHA analise:despachada_apos_reabertura', 'analise antiga (D-36)');
    morde('reaberta', (e) => { e.base.hist[2].ator = T.ADMIN; }, 'FALHA historico:reabertura_ator_rh2', 'trilha com outro ator');
    morde('reaberta', (e) => { e.rh2.kpi_knockouts = 3; }, 'FALHA funil:conta_como_knockout', 'reaberta ainda no funil');
    morde('reaberta-10min', (e) => { e.base.agora = 2300; }, 'FALHA cedo-demais', 'menos de 10 minutos');
    morde('reaberta-10min', (e) => {
      e.base.hist.push({ id: T.H5, de: 'triagem', para: 'inscricao', auto: true, ator: null, t: 2500 });
    }, 'FALHA knockout:nao_voltou', 'knockout voltou (D-03)');
    morde('reaberta-10min', (e) => { e.base.cand.status = 'rejeitado'; }, 'FALHA candidatura:status', 'caiu de novo');
    morde('rejeitada-rh', (e) => { e.admin.fila[1].pode_responder = true; }, 'FALHA fila:admin_pode_responder', 'admin pode responder (REVISAO-05)');
    morde('rejeitada-rh', (e) => { e.rh2.fila[1].pode_responder = false; }, 'FALHA fila:rh2_pode_responder', 'RH2 nao pode responder');
    morde('rejeitada-rh', (e) => { e.base.pedidos.pop(); }, 'FALHA revisao:pedidos', 'sem o segundo pedido');
    morde('rejeitada-rh', (e) => { e.base.hist[3].ator = T.RH2; e.base.pedidos[1].rejeitado_por = T.RH2; }, 'FALHA historico:ultima_rejeicao_ator_admin', 'rejeitada pelo RH2, nao pelo admin');
    morde('reaberta-2', (e) => { e.base.pedidos[1].rejeitado_por = T.RH2; }, 'FALHA revisao:pedido_2_rejeitado_por_admin', 'presume o admin como decisor');
    morde('reaberta-2', (e) => { e.base.pedidos[1].respondida_por = T.ADMIN; }, 'FALHA revisao:pedido_2_respondida_por_rh2', 'revertida pelo admin');
    morde('reaberta-2', (e) => { e.base.hist[3].ator = T.RH2; }, 'FALHA historico:rejeicao_do_pedido_2_ator_admin', 'historico da rejeicao com outro ator');
    morde('reaberta-2', (e) => { e.base.pedidos[1].hid = T.H1; }, 'FALHA revisao:rejeicoes_distintas', 'mesma linha de historico (D-06)');
    morde('raven', (e) => { e.titular.raven.liberado = false; }, 'FALHA titular:raven_liberado', 'raven nao liberado ao titular');
    morde('raven', (e) => { e.base.raven_scores = 1; }, 'FALHA titular:raven_registrado_coerente', 'registrado incoerente');
    morde('raven', (e) => { e.base.notif = e.base.notif.filter((x) => x.evento !== 'cognitivo_liberado'); }, 'FALHA notificacao:cognitivo_liberado', 'sem e-mail do Raven (D-31)');

    // ── Leitura que não foi só-leitura: recusa
    {
      const e = clone(fx.knockout);
      e.base.ro = 'off';
      const r = rodar(ARGV('knockout'), e);
      af(r.code === 1 && /SO-LEITURA/.test(r.texto), 'resultado sem transaction_read_only=on nao foi recusado');
    }
    // ── Candidatura inexistente: falha, sem N/N
    {
      const e = clone(fx.knockout);
      e.base.cand = null;
      const r = rodar(ARGV('knockout'), e);
      af(r.code === 1 && /CANDIDATURA NAO ENCONTRADA/.test(r.texto), 'candidatura inexistente nao reprovou');
    }
    // ── Dado pessoal que escape do banco não chega à saída
    {
      const e = clone(fx['reaberta-2']);
      e.base.notif[0].status = 'fulano@exemplo.com';
      e.base.notif[1].template = 'Maria da Silva';
      e.base.analises[0].status = 'Resposta livre ao titular, com nome e tudo';
      const r = rodar(ARGV('reaberta-2'), e);
      af(!EMAIL_RE.test(r.texto), 'e-mail vindo do banco chegou a saida');
      af(!/Maria|Resposta livre/.test(r.texto), 'texto livre vindo do banco chegou a saida');
      af(r.texto.includes('<redigido>'), 'o valor suspeito nao foi redigido');
    }
    // ── Falha de leitura vira FALHA de leitura, não exceção crua
    {
      const r = (() => {
        const linhas = [];
        const out = criarSaida((c, s) => linhas.push(s));
        const code = principal(ARGV('knockout'), {
          lerPg: () => {
            throw new ErroSeguro('LEITURA POSTGRES FALHOU (p46apply): fulano@exemplo.com');
          },
          out,
        });
        return { code, texto: linhas.join('\n') };
      })();
      af(r.code === 1 && /LEITURA POSTGRES FALHOU/.test(r.texto) && !EMAIL_RE.test(r.texto), 'falha de leitura mal tratada');
    }
    af(redeUsada === 0, `rede usada ${redeUsada} vez(es)`);
  } catch (e) {
    falhas.push(`excecao: ${(e && e.message) || e}`);
  } finally {
    globalThis.fetch = fetchGlobal;
  }

  if (falhas.length) {
    console.error(`auto-teste FALHOU (${falhas.length}/${n}):\n  - ${falhas.join('\n  - ')}`);
    return 1;
  }
  console.log(`auto-teste: ${n} afirmacoes, rede nao usada, banco substituido por fixtures`);
  console.log('auto-teste ok');
  return 0;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--auto-teste')) {
    process.exit(autoTeste());
  } else {
    const out = criarSaida((canal, s) => (canal === 'err' ? console.error(s) : console.log(s)));
    process.exit(principal(argv, { lerPg: lerPostgresReal, out }));
  }
}

module.exports = { FASES, valorSeguro, linhaCheck, blindar, principal, lerPostgresReal };
