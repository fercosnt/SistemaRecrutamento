#!/usr/bin/env node
'use strict';
/*
 * p52_backup.cjs — conferência da D-41 EMENDADA (Phase 52, bloco D; plano 52-19 Passo 0).
 *
 * POR QUE EXISTE. O operador RECUSOU o PITR (2026-10-11, `52-DECISAO-2026-10-11-gaps-e-pitr.md`):
 * sai «`pitr_enabled = true`» e entra, como condição 1 da D-41, um backup diário físico COMPLETED
 * POSTERIOR ao último apply da fase. Sem ele, nada do bloco D roda — nem a medição só leitura do
 * 52-19, nem o apply destrutivo do 52-21. Este script é a cabeça, encadeada por `&&`, de cada
 * comando que mede ou apaga.
 *
 * O QUE ELE LÊ (tudo SÓ LEITURA; nunca escreve em PROD):
 *   1. UM ÚNICO endpoint HTTP, por GET:
 *        GET https://api.supabase.com/v1/projects/isljnozzlvckrgjjbjwp/database/backups
 *      (nenhum outro método nem rota). O corpo da resposta NUNCA é impresso.
 *   2. O ledger p52 POR FORMA, só leitura:
 *        node p46apply.cjs sql "set transaction read only; select coalesce(json_agg(version order by
 *        version), '[]'::json) as v from supabase_migrations.schema_migrations where name like 'p52\_%'"
 *      O ledger não tem coluna de tempo e `track_commit_timestamp` é `off` (medido) — por isso:
 *   3. O registro `.planning/phases/52-hub-do-rh-dados-e-contato/52-APLICACOES.json` (criado no
 *      52-26): o instante UTC ≥ o COMMIT de cada apply p52. Tem de estar rastreado e idêntico a HEAD
 *      (`registro nao commitado` recusa), cobrir TODA versão p52 do ledger e não ter versão que o
 *      ledger não tenha.
 *
 * TOKEN. O MESMO mecanismo do `p46apply.cjs` (`token()`): `SUPABASE_ACCESS_TOKEN` com precedência,
 * senão `security find-generic-password -s "Supabase CLI" -a supabase -w` (stderr ignorado). O token
 * NUNCA é impresso nem posto em mensagem de erro. `SUPABASE_PROJECT_REF` definido e diferente de
 * `REF` recusa (o p46apply leria outro projeto para o ledger).
 *
 * JULGAMENTO — função pura exportada `julgar({ status, texto, data, ledger, registro, modo, exportEm })`
 * → `{ ok, motivo, B, L, vL }`. `ok` SÓ com: HTTP 200; JSON que é objeto (não array, não null);
 * `walg_enabled === true` (nunca «truthy»); `backups` array com ≥1 elemento `status === 'COMPLETED'`,
 * `is_physical_backup === true` e `inserted_at` ISO UTC válido — B = o MAIOR desses; ledger p52 não
 * vazio; registro no contrato; toda versão do ledger no registro E todo registro no ledger — L = o
 * MAIOR `aplicado_ate`, vL a versão dele —; e B ESTRITAMENTE maior que L.
 * Com `modo: 'apply'` (só o 52-21: `--apply --decisao <52-21-DECISAO.md>`), também:
 *   - condição 3: `exportEm` = a linha `export_em_aprovado:` da decisão, ISO válido, e B > exportEm
 *     (o backup é da noite DEPOIS do export aprovado);
 *   - «o apply roda na manhã seguinte a um backup diário»: agora = cabeçalho HTTP `Date` da resposta
 *     (relógio do SERVIDOR, nunca o local) ≥ B, no MESMO dia de America/Sao_Paulo que B (UTC−03:00
 *     fixo — o Brasil não tem horário de verão desde 2019) e antes de 12:00 desse fuso.
 *
 * ⚠ PREMISSA EXPLÍCITA (modo apply): o backup diário roda entre 03:00 e 15:00 UTC (medido: entre
 *   06:25 e 06:31 UTC de 04 a 11/10/2026). Só assim o dia de America/Sao_Paulo do backup é o dia em que
 *   a manhã acontece. No modo apply, um B fora dessa janela RECUSA com motivo próprio, em vez de uma
 *   janela vazia e muda. Se o Supabase mudar o horário do backup, o script passa a recusar sempre e o
 *   bloco D volta ao planejador.
 *
 * NÃO EXISTE opção que faça o modo real passar sem o GET e sem a leitura do ledger (fixture,
 * `--forcar`, variável de ambiente: proibidos).
 *
 * Uso:
 *   node scripts/p52_backup.cjs --auto-teste                  sem rede: 29 fixtures, ok E motivo de cada uma
 *   node scripts/p52_backup.cjs                               modo fase (52-19): GET + ledger + registro
 *   node scripts/p52_backup.cjs --apply --decisao <arquivo>   modo apply (52-21)
 * Saída: 0 conferido · 1 não conferido / auto-teste falhou · 2 uso.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REF = 'isljnozzlvckrgjjbjwp';
const URL_BACKUPS = 'https://api.supabase.com/v1/projects/isljnozzlvckrgjjbjwp/database/backups';
const RAIZ = path.resolve(__dirname, '..');
const REGISTRO_REL = '.planning/phases/52-hub-do-rh-dados-e-contato/52-APLICACOES.json';
const SQL_LEDGER =
  "set transaction read only; select coalesce(json_agg(version order by version), '[]'::json) as v " +
  "from supabase_migrations.schema_migrations where name like 'p52\\_%'";

/* UTC−03:00 fixo (America/Sao_Paulo sem horário de verão desde 2019). */
const BRT_OFFSET_MS = -3 * 3600 * 1000;
const JANELA_UTC_INI = 3; // 03:00 UTC (inclusive)
const JANELA_UTC_FIM = 15; // 15:00 UTC (exclusive)

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|\+00:00)$/;

function isoUtc(x) {
  if (typeof x !== 'string' || !ISO_UTC.test(x)) return null;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

function iso(t) {
  return new Date(t).toISOString();
}

function brt(t) {
  const d = new Date(t + BRT_OFFSET_MS);
  return { dia: d.toISOString().slice(0, 10), hora: d.getUTCHours(), hms: d.toISOString().slice(11, 19) };
}

function ehObjeto(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function valorTexto(v) {
  return v === undefined ? 'ausente' : JSON.stringify(v);
}

/* Função PURA. Nenhuma rede, nenhum relógio local, nenhum arquivo. */
function julgar({ status, texto, data, ledger, registro, modo, exportEm } = {}) {
  const recusa = (motivo, extra) => Object.assign({ ok: false, motivo, B: null, L: null, vL: null }, extra || {});

  if (status !== 200) return recusa(`HTTP ${status}`);
  let j;
  try {
    j = JSON.parse(texto);
  } catch {
    return recusa('resposta nao e JSON');
  }
  if (!ehObjeto(j)) return recusa('resposta nao e objeto');
  if (j.walg_enabled !== true) return recusa(`walg_enabled != true (${valorTexto(j.walg_enabled)})`);
  if (!Array.isArray(j.backups)) return recusa('backups ausente ou nao-array');

  let B = null;
  for (const b of j.backups) {
    if (!ehObjeto(b) || b.status !== 'COMPLETED' || b.is_physical_backup !== true) continue;
    const t = isoUtc(b.inserted_at);
    if (t === null) continue;
    if (B === null || t > B) B = t;
  }
  if (B === null) return recusa('nenhum backup fisico COMPLETED com inserted_at valido');

  if (!Array.isArray(ledger) || ledger.length === 0 || !ledger.every((v) => typeof v === 'string')) {
    return recusa('ledger p52 vazio (leitura falhou ou forma mudou)', { B: iso(B) });
  }

  const aps = ehObjeto(registro) ? registro.aplicacoes : null;
  if (
    !Array.isArray(aps) ||
    aps.length === 0 ||
    !aps.every((a) => ehObjeto(a) && typeof a.version === 'string' && /^\d{14}$/.test(a.version) && typeof a.aplicado_ate === 'string' && /Z$/.test(a.aplicado_ate) && isoUtc(a.aplicado_ate) !== null)
  ) {
    return recusa('registro ausente ou fora do contrato', { B: iso(B) });
  }
  const noRegistro = new Set(aps.map((a) => a.version));
  const noLedger = new Set(ledger);
  for (const v of [...noLedger].sort()) {
    if (!noRegistro.has(v)) return recusa(`APLICACAO SEM HORARIO REGISTRADO: ${v}`, { B: iso(B) });
  }
  for (const v of [...noRegistro].sort()) {
    if (!noLedger.has(v)) return recusa(`registro com versao fora do ledger: ${v}`, { B: iso(B) });
  }

  let L = null;
  let vL = null;
  for (const a of aps) {
    const t = isoUtc(a.aplicado_ate);
    if (L === null || t > L) {
      L = t;
      vL = a.version;
    }
  }
  const base = { B: iso(B), L: iso(L), vL };
  if (!(B > L)) {
    return recusa(`ultimo backup ${iso(B)} nao e posterior ao ultimo apply da fase ${iso(L)} (${vL})`, base);
  }

  if (modo === 'apply') {
    const hB = new Date(B).getUTCHours();
    if (hB < JANELA_UTC_INI || hB >= JANELA_UTC_FIM) {
      return recusa(
        `backup fora da janela assumida (03:00-15:00 UTC; o dia de America/Sao_Paulo do backup deixa de ser o da manha seguinte — volta ao planejador): ${iso(B)}`,
        base
      );
    }
    const E = isoUtc(exportEm);
    if (E === null) return recusa('sem export_em_aprovado na decisao', base);
    if (!(B > E)) return recusa(`ultimo backup ${iso(B)} nao e posterior ao export ${iso(E)}`, base);
    const agora = typeof data === 'string' && data.trim() ? Date.parse(data) : NaN;
    if (!Number.isFinite(agora)) return recusa('sem cabecalho Date na resposta', base);
    const bB = brt(B);
    const bA = brt(agora);
    if (agora < B) {
      return recusa(`fora da manha seguinte ao backup: agora ${iso(agora)} anterior ao backup ${iso(B)}`, base);
    }
    if (bA.dia !== bB.dia) {
      return recusa(`fora da manha seguinte ao backup: agora ${bA.dia} ${bA.hms} BRT, backup do dia ${bB.dia} BRT`, base);
    }
    if (bA.hora >= 12) {
      return recusa(`fora da manha seguinte ao backup: agora ${bA.dia} ${bA.hms} BRT, depois de 12:00`, base);
    }
  }

  return Object.assign({ ok: true, motivo: '' }, base);
}

/* ───────────────────────────── auto-teste (sem rede) ───────────────────────────── */

function autoTeste() {
  const REG = {
    aplicacoes: [
      { version: '20261011000006', aplicado_ate: '2026-10-12T21:04:42Z' },
      { version: '20261011000007', aplicado_ate: '2026-10-13T01:29:02Z' },
    ],
  };
  const LED = ['20261011000006', '20261011000007'];
  const bk = (inserted_at, extra) => Object.assign({ id: 1, inserted_at, is_physical_backup: true, status: 'COMPLETED' }, extra || {});
  const corpo = (o) => JSON.stringify(Object.assign({ region: 'sa-east-1', walg_enabled: true, pitr_enabled: false, backups: [bk('2026-10-12T06:31:59.437Z'), bk('2026-10-13T06:28:38.387Z')] }, o || {}));
  const BOM = corpo();
  const fase = (o) => Object.assign({ status: 200, texto: BOM, data: null, ledger: LED, registro: REG, modo: 'fase' }, o || {});
  const EXP = '2026-10-12T23:00:00Z';
  // Backup 06:28:38Z = 03:28:38 BRT do dia 13; a manhã vai até 12:00 BRT = 15:00Z.
  const apply = (o) => Object.assign({ status: 200, texto: BOM, data: 'Tue, 13 Oct 2026 12:00:00 GMT', ledger: LED, registro: REG, modo: 'apply', exportEm: EXP }, o || {});
  const ULT = 'ultimo backup 2026-10-13T06:28:38.387Z';

  const casos = [
    // ── 26 recusas ──
    ['HTTP 401 com corpo bom', fase({ status: 401 }), 'HTTP 401'],
    ['HTTP 500 vazio', fase({ status: 500, texto: '' }), 'HTTP 500'],
    ['<html>', fase({ texto: '<html><body>erro</body></html>' }), 'resposta nao e JSON'],
    ['[]', fase({ texto: '[]' }), 'resposta nao e objeto'],
    ['null', fase({ texto: 'null' }), 'resposta nao e objeto'],
    ['walg_enabled false', fase({ texto: corpo({ walg_enabled: false }) }), 'walg_enabled != true (false)'],
    ['walg_enabled "true"', fase({ texto: corpo({ walg_enabled: 'true' }) }), 'walg_enabled != true ("true")'],
    ['walg_enabled ausente', fase({ texto: corpo({ walg_enabled: undefined }) }), 'walg_enabled != true (ausente)'],
    ['backups ausente', fase({ texto: corpo({ backups: undefined }) }), 'backups ausente ou nao-array'],
    ['so FAILED', fase({ texto: corpo({ backups: [bk('2026-10-13T06:28:38.387Z', { status: 'FAILED' })] }) }), 'nenhum backup fisico COMPLETED com inserted_at valido'],
    ['COMPLETED nao fisico', fase({ texto: corpo({ backups: [bk('2026-10-13T06:28:38.387Z', { is_physical_backup: false })] }) }), 'nenhum backup fisico COMPLETED com inserted_at valido'],
    ['inserted_at invalido', fase({ texto: corpo({ backups: [bk('13/10/2026 06:28')] }) }), 'nenhum backup fisico COMPLETED com inserted_at valido'],
    ['ledger vazio', fase({ ledger: [] }), 'ledger p52 vazio (leitura falhou ou forma mudou)'],
    ['versao do ledger sem registro', fase({ ledger: [...LED, '20261011000008'] }), 'APLICACAO SEM HORARIO REGISTRADO: 20261011000008'],
    ['registro com versao fora do ledger', fase({ ledger: ['20261011000007'] }), 'registro com versao fora do ledger: 20261011000006'],
    ['registro malformado', fase({ registro: { aplicacoes: [{ version: '2026101100006', aplicado_ate: 'ontem' }] } }), 'registro ausente ou fora do contrato'],
    ['backup antes do ultimo apply', fase({ texto: corpo({ backups: [bk('2026-10-12T06:31:59.437Z')] }) }), 'ultimo backup 2026-10-12T06:31:59.437Z nao e posterior ao ultimo apply da fase 2026-10-13T01:29:02.000Z (20261011000007)'],
    ['backup = ultimo apply', fase({ texto: corpo({ backups: [bk('2026-10-13T01:29:02.000Z')] }) }), 'ultimo backup 2026-10-13T01:29:02.000Z nao e posterior ao ultimo apply da fase 2026-10-13T01:29:02.000Z (20261011000007)'],
    ['apply sem exportEm', apply({ exportEm: undefined }), 'sem export_em_aprovado na decisao'],
    ['backup antes do export', apply({ exportEm: '2026-10-13T07:00:00Z' }), `${ULT} nao e posterior ao export 2026-10-13T07:00:00.000Z`],
    ['sem Date', apply({ data: null }), 'sem cabecalho Date na resposta'],
    ['agora antes do backup', apply({ data: 'Tue, 13 Oct 2026 06:00:00 GMT' }), 'fora da manha seguinte ao backup: agora 2026-10-13T06:00:00.000Z anterior'],
    ['agora as 12:00 BRT', apply({ data: 'Tue, 13 Oct 2026 15:00:00 GMT' }), 'fora da manha seguinte ao backup: agora 2026-10-13 12:00:00 BRT, depois de 12:00'],
    ['agora no dia seguinte', apply({ data: 'Wed, 14 Oct 2026 12:00:00 GMT' }), 'fora da manha seguinte ao backup: agora 2026-10-14 09:00:00 BRT, backup do dia 2026-10-13 BRT'],
    ['backup de hoje FAILED, COMPLETED mais recente de ontem', fase({ texto: corpo({ backups: [bk('2026-10-12T06:31:59.437Z'), bk('2026-10-13T06:28:38.387Z', { status: 'FAILED' })] }) }), 'ultimo backup 2026-10-12T06:31:59.437Z nao e posterior ao ultimo apply da fase'],
    ['modo apply, backup 01:00 UTC (fora da janela assumida)', apply({ texto: corpo({ backups: [bk('2026-10-13T01:30:00.000Z')] }), data: 'Tue, 13 Oct 2026 01:40:00 GMT' }), 'backup fora da janela assumida (03:00-15:00 UTC;'],
    // ── 3 que passam ──
    ['modo fase com pitr_enabled false (irrelevante)', fase(), null],
    ['apply 09:00 BRT do dia do backup', apply(), null],
    ['apply 11:59:59 BRT', apply({ data: 'Tue, 13 Oct 2026 14:59:59 GMT' }), null],
  ];

  const falhas = [];
  let recusas = 0;
  let passam = 0;
  for (const [nome, entrada, esperado] of casos) {
    const r = julgar(entrada);
    if (esperado === null) {
      if (r.ok === true) passam++;
      else falhas.push(`${nome}: devia passar e recusou (${r.motivo})`);
    } else if (r.ok !== false) {
      falhas.push(`${nome}: devia recusar e passou`);
    } else if (!r.motivo.startsWith(esperado)) {
      falhas.push(`${nome}: recusou pelo motivo errado (${r.motivo})`);
    } else recusas++;
  }
  if (casos.length !== 29 || recusas !== 26 || passam !== 3 || falhas.length) {
    console.error(`BACKUP AUTO-TESTE FALHOU: ${falhas.join('; ') || `contagem ${casos.length}/${recusas}/${passam}`}`);
    process.exit(1);
  }
  console.log(`BACKUP AUTO-TESTE OK: ${casos.length}/29 (${recusas} recusas pelo motivo certo, ${passam} passam)`);
}

/* ───────────────────────────── modo real ───────────────────────────── */

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function lerRegistro() {
  const abs = path.join(RAIZ, REGISTRO_REL);
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', REGISTRO_REL], { cwd: RAIZ, stdio: 'ignore' });
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', REGISTRO_REL], { cwd: RAIZ, stdio: 'ignore' });
  } catch {
    return { erro: 'registro nao commitado' };
  }
  try {
    return { registro: JSON.parse(fs.readFileSync(abs, 'utf8')) };
  } catch {
    return { registro: null };
  }
}

function lerLedger() {
  let out;
  try {
    out = execFileSync(process.execPath, [path.join(RAIZ, 'p46apply.cjs'), 'sql', SQL_LEDGER], {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 60000,
    });
  } catch {
    return null;
  }
  try {
    const i = out.indexOf('[');
    const linhas = JSON.parse(out.slice(i));
    const v = Array.isArray(linhas) && linhas[0] ? linhas[0].v : null;
    return Array.isArray(v) ? v.map(String) : null;
  } catch {
    return null;
  }
}

function lerExportEm(arquivo) {
  try {
    const d = fs.readFileSync(arquivo, 'utf8');
    const m = d.match(/^export_em_aprovado: *(\S+)/m);
    return m ? m[1] : undefined;
  } catch {
    return undefined;
  }
}

async function modoReal(modo, decisao) {
  const prefixoNao = modo === 'apply' ? 'BACKUP NAO CONFERIDO PARA O APPLY (D-41)' : 'BACKUP NAO CONFERIDO (D-41)';
  const nao = (motivo) => {
    console.error(
      `${prefixoNao}: ${motivo} — nada do bloco D roda; esperar o proximo backup diario (~06:28 UTC) depois do ultimo apply da fase`
    );
    process.exit(1);
  };

  if (process.env.SUPABASE_PROJECT_REF !== undefined && process.env.SUPABASE_PROJECT_REF !== REF) {
    nao(`SUPABASE_PROJECT_REF definido e diferente de ${REF}`);
  }
  const reg = lerRegistro();
  if (reg.erro) nao(reg.erro);
  const exportEm = modo === 'apply' ? lerExportEm(decisao) : undefined;

  const tk = token();
  if (!tk) nao('sem token (SUPABASE_ACCESS_TOKEN ou Keychain "Supabase CLI")');

  let status;
  let texto;
  let data;
  try {
    const res = await fetch(URL_BACKUPS, { method: 'GET', headers: { Authorization: `Bearer ${tk}`, Accept: 'application/json' } });
    status = res.status;
    data = res.headers.get('date');
    texto = await res.text();
  } catch (e) {
    nao(`falha de rede no GET de database/backups (${e && e.name ? e.name : 'erro'})`);
  }

  const ledger = lerLedger();
  const r = julgar({ status, texto, data, ledger, registro: reg.registro, modo, exportEm });
  if (!r.ok) nao(r.motivo);
  if (modo === 'apply') {
    console.log(
      `BACKUP CONFERIDO PARA O APPLY (D-41): ultimo backup fisico COMPLETED ${r.B} > ultimo apply da fase ${r.L} (${r.vL}) e > export ${exportEm}; agora (Date do servidor) ${data} na manha do dia do backup (BRT); walg_enabled=true`
    );
  } else {
    console.log(`BACKUP CONFERIDO (D-41): ultimo backup fisico COMPLETED ${r.B} > ultimo apply da fase ${r.L} (${r.vL}); walg_enabled=true`);
  }
}

module.exports = { julgar, REF, URL_BACKUPS, SQL_LEDGER };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const uso = () => {
    console.error('USO: node scripts/p52_backup.cjs [--auto-teste | --apply --decisao <52-21-DECISAO.md>]');
    process.exit(2);
  };
  if (argv.length === 1 && argv[0] === '--auto-teste') autoTeste();
  else if (argv.length === 0) modoReal('fase');
  else if (argv.length === 3 && argv[0] === '--apply' && argv[1] === '--decisao' && argv[2] && !argv[2].startsWith('--')) modoReal('apply', argv[2]);
  else uso();
}
