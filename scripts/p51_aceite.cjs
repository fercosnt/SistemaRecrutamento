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

function naoImplementado() {
  throw new Error('NAO IMPLEMENTADO');
}
const criarSaida = (escrever) => ({ linha: (s) => escrever('out', s), erro: (s) => escrever('err', s) });
const valorSeguro = naoImplementado;
const linhaCheck = naoImplementado;
const blindar = naoImplementado;
const lerPostgresReal = naoImplementado;
function principal() {
  return 0;
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
    af(valorSeguro(3) === '3' && valorSeguro(null) === '-', 'valorSeguro numero/nulo');
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
