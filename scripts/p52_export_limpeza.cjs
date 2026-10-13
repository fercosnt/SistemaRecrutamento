#!/usr/bin/env node
'use strict';
/*
 * p52_export_limpeza.cjs — export prévio da população APROVADA da limpeza do bloco D (Phase 52; plano 52-27;
 * D-41 emendada, condição 2 — operador, 2026-10-11: «export prévio, em arquivo local fora do git, exatamente
 * das linhas e objetos de Storage da população aprovada, com md5 registrado no SUMMARY, para restauração
 * cirúrgica»). O export real é UM passo do 52-21 Task 1; este plano só constrói e prova a ferramenta.
 *
 * NUNCA ESCREVE EM PROD. Toda leitura é `node p46apply.cjs sql "set transaction read only; …"`; o fecho de
 * cada operação vem de UMA requisição (todas as tabelas do mesmo snapshot). O grafo é lido antes, numa
 * requisição de catálogo, e a requisição das linhas recalcula a impressão digital do catálogo (`fk_md5`) —
 * catálogo diferente entre as duas = recusa, nunca um fecho calculado sobre um grafo que já não existe.
 *
 * O FECHO (lido de `pg_constraint` NA EXECUÇÃO, esquemas `public` e `auth`, por forma — nenhuma lista
 * literal de tabela do fecho):
 *   · raízes: os `id` de `apagaveis` do POPULACAO.json (contrato do 52-19: `{id, user_id}`) em
 *     `public.candidatos`, e os `user_id` não nulos em `auth.users` — só com a DUPLA GUARDA da migration
 *     `20261011000004` (sem linha em `public.usuarios_rh` e sem `public.candidatos` fora das raízes). Os
 *     fictícios e os tombstones têm `user_id` nulo: raiz sem `auth.users`. Uma entrada órfã (`id` = conta de
 *     `auth.users`) casa só em `auth.users`;
 *   · vagas pelo `52-19-DECISAO-ESCOPO.md`: `vaga_<id8>: deleted_at` → modo `atualiza` (não desce);
 *     `remover` → modo `apaga` (desce); `manter`/`fora_do_bloco_d` → nada;
 *   · descida: filho por FK `CASCADE`/`NO ACTION`/`RESTRICT` de uma linha em `apaga` → `apaga`, e desce;
 *     por `SET NULL`/`SET DEFAULT` → `anula` (o estado de antes), sem descer — EXCETO quando a coluna é
 *     `NOT NULL` (ou a FK tem mais de uma coluna): aí a linha não pode sobreviver com a referência nula e a
 *     migration a apaga (medido no ensaio do 52-20: `candidate_ai_decisions.candidato_id`, 23502) → `apaga`.
 *     É a MESMA forma que o PRE da migration trata como RESTRICT;
 *   · do esquema `auth`, só `auth.users` e `auth.identities` são exportadas; toda outra tabela de `auth` que
 *     o fecho alcança (sessões, refresh tokens, MFA, OAuth, one-time tokens, SCIM, WebAuthn — hoje) é só
 *     CONTADA em `excluidas_por_desenho`. Em `auth.users`, toda coluna cujo nome contém `token` (por forma)
 *     vai em branco (`''`) e é listada em `colunas_em_branco`; `encrypted_password` FICA (escolha do
 *     planejador, vetável pelo operador no 52-21 Task 2, chave `export_escopo`);
 *   · um ciclo no grafo alcançado = recusa (`FECHO COM CICLO`), nunca um fecho pela metade.
 *
 * MODOS
 *   --contar --populacao <POPULACAO.json> --decisao-escopo <52-19-DECISAO-ESCOPO.md>
 *       Só leitura, só contagens: `EXPORT CONTAGEM: <tabela>:<modo>=<n> … raizes=<n> populacao_md5=<md5>`.
 *   --auto-teste
 *       Os casos do plano com dublê de consulta (sem rede).
 *
 * PRIVACIDADE (JORN-63): nada aqui imprime e-mail, nome, CPF, nome de arquivo, token ou chave — só ids
 * (prefixo de 8), nomes de tabela, contagens e md5. Mensagens de erro da leitura saem truncadas e redigidas.
 *
 * Saída: 0 ok · 1 recusa/erro · 2 uso. Sem dependências.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');

const T_CAND = 'public.candidatos';
const T_AUTH = 'auth.users';
const T_VAGAS = 'public.vagas';
const T_RH = 'public.usuarios_rh';
/* Do esquema auth, só estas são exportadas (escolha do planejador, vetável no 52-21 — chave export_escopo). */
const AUTH_EXPORTADAS = ['auth.users', 'auth.identities'];
const DESTINOS_VAGA = { deleted_at: 'atualiza', remover: 'apaga', manter: null, fora_do_bloco_d: null };

const U = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ID8 = /^[0-9a-f]{8}$/;
const TAB = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/;
const COL = /^[a-z_][a-z0-9_]*$/;
const O = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const md5 = (s) => crypto.createHash('md5').update(typeof s === 'string' ? Buffer.from(s, 'utf8') : s).digest('hex');

class Recusa extends Error {}

/* ───────────────────────────── juízes puros ───────────────────────────── */

function ordenarBytes(xs) {
  return [...xs].sort((a, b) => Buffer.compare(Buffer.from(String(a), 'utf8'), Buffer.from(String(b), 'utf8')));
}

/* O populacao_md5 canônico do 52-19: ids distintos, ordem de byte, vírgula. */
function md5Ids(ids) {
  return md5(ordenarBytes([...new Set(ids)]).join(','));
}

/* O contrato do POPULACAO.json (52-19). Devolve { ids, users, populacao_md5, prefixos } ou lança Recusa. */
function lerPopulacao(pop) {
  if (!O(pop) || !O(pop.apagaveis)) throw new Recusa('EXPORT NAO E A POPULACAO: POPULACAO.json sem apagaveis (ausente, null ou nao-objeto)');
  const ids = [];
  const users = [];
  const prefixos = [];
  for (const [k, lista] of Object.entries(pop.apagaveis)) {
    if (!Array.isArray(lista)) throw new Recusa(`EXPORT NAO E A POPULACAO: apagaveis.${k} nao e lista`);
    for (const x of lista) {
      if (!O(x) || !U.test(String(x.id || '')) || !(x.user_id === null || x.user_id === undefined || U.test(String(x.user_id)))) {
        throw new Recusa(`EXPORT NAO E A POPULACAO: entrada malformada em apagaveis.${k}`);
      }
      ids.push(x.id);
      if (x.user_id) users.push(x.user_id);
      prefixos.push(x.user_id ? x.user_id : x.id);
    }
  }
  if (!ids.length) throw new Recusa('EXPORT NAO E A POPULACAO: apagaveis sem entrada (populacao vazia nao prova nada)');
  const m = md5Ids(ids);
  if (pop.populacao_md5 !== m) throw new Recusa('EXPORT NAO E A POPULACAO: populacao_md5 do POPULACAO.json != md5 dos ids de apagaveis');
  return { ids: ordenarBytes([...new Set(ids)]), users: ordenarBytes([...new Set(users)]), populacao_md5: m, prefixos: ordenarBytes([...new Set(prefixos)]) };
}

/* Os destinos de vaga do 52-19-DECISAO-ESCOPO.md. Devolve { <id8>: 'deleted_at'|'remover' } (só os que mudam). */
function lerDestinosVagas(doc) {
  const vagas = {};
  let linhas = 0;
  for (const m of String(doc).matchAll(/^vaga_([0-9a-f]{8}): *(\S+)\s*$/gm)) {
    linhas += 1;
    if (!Object.prototype.hasOwnProperty.call(DESTINOS_VAGA, m[2])) throw new Recusa(`DECISAO FORA DO FORMATO: vaga_${m[1]} com destino desconhecido`);
    if (Object.prototype.hasOwnProperty.call(vagas, m[1])) throw new Recusa(`DECISAO FORA DO FORMATO: vaga_${m[1]} repetida`);
    if (DESTINOS_VAGA[m[2]]) vagas[m[1]] = m[2];
  }
  if (!linhas) throw new Recusa('DECISAO FORA DO FORMATO: nenhuma linha vaga_<id8> no 52-19-DECISAO-ESCOPO.md');
  const ord = {};
  for (const k of ordenarBytes(Object.keys(vagas))) ord[k] = vagas[k];
  return ord;
}

function conferirFks(fks) {
  if (!Array.isArray(fks) || !fks.length) throw new Recusa('FECHO: catalogo de FK vazio ou ilegivel');
  for (const f of fks) {
    const ok =
      O(f) && TAB.test(String(f.tab)) && TAB.test(String(f.ref)) && Array.isArray(f.cols) && Array.isArray(f.refcols) &&
      f.cols.length > 0 && f.cols.length === f.refcols.length && f.cols.every((c) => COL.test(String(c))) && f.refcols.every((c) => COL.test(String(c))) &&
      typeof f.tipo === 'string' && typeof f.nn === 'boolean';
    if (!ok) throw new Recusa('FECHO: FK do catalogo fora da forma esperada (identificador ou colunas)');
  }
}

/* O modo de uma linha alcançada por uma FK a partir de uma linha em `apaga` (a forma do PRE da migration). */
function modoDaAresta(fk) {
  if (['c', 'a', 'r'].includes(fk.tipo)) return 'apaga';
  if (['n', 'd'].includes(fk.tipo)) return fk.nn || fk.cols.length !== 1 ? 'apaga' : 'anula';
  throw new Recusa(`FECHO: tipo de FK desconhecido (${fk.tipo}) em ${fk.tab}`);
}

const excluidaPorDesenho = (t) => t.startsWith('auth.') && !AUTH_EXPORTADAS.includes(t);

/*
 * O planejador do fecho: nós (tabela, modo) a partir das raízes, descendo pelas FKs do catálogo; ordem
 * topológica (pais antes de filhos; empate pela chave, em ordem de bytes — determinístico).
 * op: { vagasAtualiza: boolean, vagasRemover: boolean }.
 */
function planejarFecho(fks, op = {}) {
  conferirFks(fks);
  const ordFks = [...fks].sort((a, b) => Buffer.compare(Buffer.from(JSON.stringify([a.tab, a.cols, a.ref, a.refcols, a.tipo])), Buffer.from(JSON.stringify([b.tab, b.cols, b.ref, b.refcols, b.tipo]))));
  const nos = new Map();
  const no = (t, m) => {
    const k = `${t}|${m}`;
    if (!nos.has(k)) nos.set(k, { chave: k, tabela: t, modo: m, raiz: null, excluida: excluidaPorDesenho(t), arestas: [] });
    return nos.get(k);
  };
  const fila = [];
  const raiz = (t, m, tipo) => {
    no(t, m).raiz = tipo;
    if (m === 'apaga') fila.push(t);
  };
  raiz(T_CAND, 'apaga', 'candidatos');
  raiz(T_AUTH, 'apaga', 'auth');
  if (op.vagasRemover) raiz(T_VAGAS, 'apaga', 'vagas_remover');
  if (op.vagasAtualiza) raiz(T_VAGAS, 'atualiza', 'vagas_deleted_at');
  const vistos = new Set();
  while (fila.length) {
    const t = fila.shift();
    if (vistos.has(t)) continue;
    vistos.add(t);
    for (const fk of ordFks.filter((f) => f.ref === t)) {
      const m = modoDaAresta(fk);
      no(fk.tab, m).arestas.push({ pai: t, cols: fk.cols, refcols: fk.refcols, tipo: fk.tipo });
      if (m === 'apaga') fila.push(fk.tab);
    }
  }
  const dep = new Map();
  for (const n of nos.values()) {
    const d = new Set(n.arestas.map((a) => `${a.pai}|apaga`));
    if (n.modo !== 'apaga' && nos.has(`${n.tabela}|apaga`)) d.add(`${n.tabela}|apaga`);
    dep.set(n.chave, d);
  }
  const ordem = [];
  const feitos = new Set();
  for (;;) {
    const prontos = ordenarBytes([...nos.keys()].filter((k) => !feitos.has(k) && [...dep.get(k)].every((d) => feitos.has(d))));
    if (!prontos.length) break;
    feitos.add(prontos[0]);
    ordem.push(nos.get(prontos[0]));
  }
  if (ordem.length !== nos.size) {
    const resto = ordenarBytes([...nos.keys()].filter((k) => !feitos.has(k)));
    throw new Recusa(`FECHO COM CICLO: ${resto.join(', ')} — o fecho nao tem ordem pais-antes-de-filhos; nada lido`);
  }
  return { nos: ordem };
}

/* ───────────────────────────── SQL (só leitura) ───────────────────────────── */

const FK_LINHAS = `select tn.nspname || '.' || tr.relname as tab,
    (select array_agg(a.attname::text order by k.n) from unnest(c.conkey) with ordinality as k(attnum, n)
       join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols,
    rn.nspname || '.' || rr.relname as ref,
    (select array_agg(a.attname::text order by k.n) from unnest(c.confkey) with ordinality as k(attnum, n)
       join pg_catalog.pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as refcols,
    c.confdeltype::text as tipo,
    (select bool_and(a.attnotnull) from unnest(c.conkey) as k(attnum)
       join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as nn,
    c.conname::text as nome
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class tr on tr.oid = c.conrelid
  join pg_catalog.pg_namespace tn on tn.oid = tr.relnamespace
  join pg_catalog.pg_class rr on rr.oid = c.confrelid
  join pg_catalog.pg_namespace rn on rn.oid = rr.relnamespace
 where c.contype = 'f' and tn.nspname in ('public', 'auth') and rn.nspname in ('public', 'auth')`;

const FK_MD5 = `(select md5(coalesce(string_agg(to_jsonb(f)::text, E'\\n' order by to_jsonb(f)::text collate "C"), '')) from (${FK_LINHAS}) f)`;

const SQL_CATALOGO = `set transaction read only;
select jsonb_build_object(
  'fks', (select coalesce(jsonb_agg(to_jsonb(f) order by to_jsonb(f)::text collate "C"), '[]'::jsonb) from (${FK_LINHAS}) f),
  'fk_md5', ${FK_MD5})::text as r`;

const qi = (s) => `"${String(s).replace(/"/g, '""')}"`;
const qt = (t) => t.split('.').map(qi).join('.');
const arrUuid = (xs) => {
  for (const x of xs) if (!U.test(x)) throw new Recusa('FECHO: id fora da forma uuid');
  return `'{${xs.join(',')}}'::uuid[]`;
};
const arrId8 = (xs) => {
  for (const x of xs) if (!ID8.test(x)) throw new Recusa('FECHO: prefixo de vaga fora da forma');
  return `'{${xs.join(',')}}'::text[]`;
};

/* A expressão de projeção de uma linha (texto jsonb); em auth.users, toda coluna com «token» no nome vai em ''. */
function exprLinha(tabela) {
  if (tabela === T_AUTH) {
    return `(select jsonb_object_agg(e.key, case when e.key like '%token%' then to_jsonb(''::text) else e.value end) from jsonb_each(to_jsonb(t)) e)::text`;
  }
  return 'to_jsonb(t)::text';
}

/*
 * A requisição única do fecho. entrada: { ids, users, vagas: {id8: destino} }; modo: 'contar' | 'linhas'.
 * Devolve o texto SQL (começa por `set transaction read only;`). Resposta: uma linha, coluna `r` (texto jsonb).
 */
function sqlDoFecho(plano, entrada, modo) {
  const nomeCte = new Map(plano.nos.map((n, i) => [n.chave, `n${i}`]));
  const remover = Object.keys(entrada.vagas).filter((k) => entrada.vagas[k] === 'remover');
  const deletedAt = Object.keys(entrada.vagas).filter((k) => entrada.vagas[k] === 'deleted_at');
  const ctes = plano.nos.map((n) => {
    const partes = [];
    if (n.raiz === 'candidatos') partes.push(`select t.ctid as k from ${qt(T_CAND)} t where t.id = any (${arrUuid(entrada.ids)})`);
    if (n.raiz === 'auth') {
      partes.push(
        `select t.ctid as k from ${qt(T_AUTH)} t where t.id = any (${arrUuid(entrada.users)})` +
          ` and not exists (select 1 from ${qt(T_RH)} g where g.user_id = t.id)` +
          ` and not exists (select 1 from ${qt(T_CAND)} g where g.user_id = t.id and not (g.id = any (${arrUuid(entrada.ids)})))`
      );
    }
    if (n.raiz === 'vagas_remover') partes.push(`select t.ctid as k from ${qt(T_VAGAS)} t where left(t.id::text, 8) = any (${arrId8(remover)})`);
    if (n.raiz === 'vagas_deleted_at') partes.push(`select t.ctid as k from ${qt(T_VAGAS)} t where left(t.id::text, 8) = any (${arrId8(deletedAt)})`);
    for (const a of n.arestas) {
      const pai = nomeCte.get(`${a.pai}|apaga`);
      partes.push(
        `select t.ctid as k from ${qt(n.tabela)} t where (${a.cols.map((c) => `t.${qi(c)}`).join(', ')}) in ` +
          `(select ${a.refcols.map((c) => `p.${qi(c)}`).join(', ')} from ${qt(a.pai)} p where p.ctid in (select k from ${pai}))`
      );
    }
    let corpo = partes.join('\n    union ');
    const apaga = nomeCte.get(`${n.tabela}|apaga`);
    if (n.modo !== 'apaga' && apaga) corpo = `select s.k from (${corpo}) s except select k from ${apaga}`;
    return `${nomeCte.get(n.chave)}(k) as (\n    ${corpo})`;
  });
  const cand = nomeCte.get(`${T_CAND}|apaga`);
  const auth = nomeCte.get(`${T_AUTH}|apaga`);
  const projNos = plano.nos.map((n) => {
    const c = nomeCte.get(n.chave);
    const campos = [`'n', (select count(*) from ${c})`];
    if (modo === 'linhas' && !n.excluida) {
      campos.push(
        `'l', (select coalesce(jsonb_agg(x.j order by x.j collate "C"), '[]'::jsonb) from (select ${exprLinha(n.tabela)} as j from ${qt(n.tabela)} t where t.ctid in (select k from ${c})) x)`
      );
    }
    return `jsonb_build_object('${n.chave}', jsonb_build_object(${campos.join(', ')}))`;
  });
  const prefixos = Object.keys(entrada.vagas);
  return `set transaction read only;
with
${ctes.join(',\n')}
select (jsonb_build_object(
  'agora', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'fk_md5', ${FK_MD5},
  'colunas_token', (select coalesce(jsonb_agg(a.attname::text order by a.attname::text collate "C"), '[]'::jsonb) from pg_catalog.pg_attribute a
                     where a.attrelid = '${T_AUTH}'::regclass and a.attnum > 0 and not a.attisdropped and a.attname like '%token%'),
  'vagas', (select coalesce(jsonb_object_agg(p, (select count(*) from ${qt(T_VAGAS)} v where left(v.id::text, 8) = p)), '{}'::jsonb) from unnest(${arrId8(prefixos)}) p),
  'raizes', jsonb_build_object(
     'candidatos', (select coalesce(jsonb_agg(jsonb_build_array(t.id, t.user_id) order by t.id::text collate "C"), '[]'::jsonb) from ${qt(T_CAND)} t where t.ctid in (select k from ${cand})),
     'auth', (select coalesce(jsonb_agg(t.id order by t.id::text collate "C"), '[]'::jsonb) from ${qt(T_AUTH)} t where t.ctid in (select k from ${auth}))),
  'nos', '{}'::jsonb
    || ${projNos.join('\n    || ')}))::text as r`;
}

/* ───────────────────────────── avaliação da resposta ───────────────────────────── */

/*
 * Confere a resposta do fecho e a reduz a { agora, colunasToken, contagens: [{chave, tabela, modo, excluida, n}],
 * linhas: [{t, m, texto}] (ordem do fecho; dentro do nó, ordem de bytes), raizesExport, raizesMd5 }.
 */
function avaliarFecho(plano, resp, entrada, fkMd5Catalogo, modo) {
  if (!O(resp) || !O(resp.nos) || !O(resp.raizes)) throw new Recusa('FECHO: resposta da leitura fora da forma');
  if (resp.fk_md5 !== fkMd5Catalogo) throw new Recusa('FECHO: o catalogo de FK mudou entre a leitura do grafo e a das linhas; repetir (nada gravado)');
  for (const p of Object.keys(entrada.vagas)) {
    const n = O(resp.vagas) ? resp.vagas[p] : undefined;
    if (n !== 1) throw new Recusa(`EXPORT NAO E A POPULACAO: vaga_${p} (${entrada.vagas[p]}) casa ${n === undefined ? '?' : n} vaga(s), nao exatamente uma`);
  }
  const colunasToken = Array.isArray(resp.colunas_token) ? ordenarBytes(resp.colunas_token.map(String)) : [];
  const contagens = [];
  const linhas = [];
  for (const n of plano.nos) {
    const r = resp.nos[n.chave];
    if (!O(r) || !Number.isInteger(r.n) || r.n < 0) throw new Recusa(`FECHO: no ${n.chave} ausente da resposta`);
    contagens.push({ chave: n.chave, tabela: n.tabela, modo: n.modo, excluida: n.excluida, n: r.n });
    if (modo !== 'linhas' || n.excluida) continue;
    if (!Array.isArray(r.l) || r.l.length !== r.n || r.l.some((x) => typeof x !== 'string')) throw new Recusa(`FECHO: linhas de ${n.chave} inconsistentes com a contagem`);
    for (const texto of ordenarBytes(r.l)) {
      if (n.tabela === T_AUTH) {
        let o;
        try {
          o = JSON.parse(texto);
        } catch {
          throw new Recusa('FECHO: linha de auth.users ilegivel');
        }
        for (const c of colunasToken) if (o[c] !== '') throw new Recusa('FECHO: coluna token de auth.users nao veio em branco; nada gravado');
      }
      linhas.push({ t: n.tabela, m: n.modo, texto });
    }
  }
  const cand = (resp.raizes.candidatos || []).map((x) => (Array.isArray(x) ? x : [null, null]));
  const authIds = (resp.raizes.auth || []).map(String);
  const usersCand = new Set(cand.map((x) => x[1]).filter(Boolean));
  for (const u of authIds) if (!entrada.users.includes(u)) throw new Recusa(`EXPORT NAO E A POPULACAO: conta ${u.slice(0, 8)} em apaga fora dos user_id de apagaveis`);
  const raizesExport = ordenarBytes([...new Set([...cand.map((x) => String(x[0])), ...authIds.filter((u) => !usersCand.has(u))])]);
  return { agora: String(resp.agora || ''), colunasToken, contagens, linhas, raizesExport, raizesMd5: md5Ids(raizesExport) };
}

/* Raízes ≠ apagaveis (id a mais ou a menos) = recusa. */
function exigirRaizes(raizesExport, pop) {
  const a = new Set(raizesExport);
  const b = new Set(pop.ids);
  const mais = [...a].filter((x) => !b.has(x));
  const menos = [...b].filter((x) => !a.has(x));
  if (mais.length || menos.length || md5Ids(raizesExport) !== pop.populacao_md5) {
    throw new Recusa(
      `EXPORT NAO E A POPULACAO: raizes do fecho != apagaveis (a mais: ${mais.map((x) => x.slice(0, 8)).join(',') || '-'}; a menos: ${menos.map((x) => x.slice(0, 8)).join(',') || '-'})`
    );
  }
}

function linhaContagem(av, pop, plano) {
  const partes = av.contagens.filter((c) => c.n > 0 || c.chave === `${T_CAND}|apaga`).map((c) => `${c.tabela}:${c.excluida ? 'excluida' : c.modo}=${c.n}`);
  return `EXPORT CONTAGEM: ${partes.join(' ')} tabelas_no_fecho=${plano.nos.length} raizes=${av.raizesExport.length} populacao_md5=${av.raizesMd5}`;
}

/* ───────────────────────────── leitura de PROD (só leitura) ───────────────────────────── */

const redigirErro = (s) => String(s || '').split('\n')[0].replace(/\S*@\S*/g, '<redigido>').slice(0, 240);

function consultarProd(pedido) {
  const sql = pedido.tipo === 'catalogo' ? SQL_CATALOGO : pedido.sql;
  if (!/^set transaction read only;/.test(sql)) throw new Recusa('LEITURA SEM TRAVA: toda leitura comeca por set transaction read only');
  let out;
  try {
    out = execFileSync(process.execPath, [path.join(RAIZ, 'p46apply.cjs'), 'sql', sql], {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180000,
      maxBuffer: 512 * 1024 * 1024,
    });
  } catch (err) {
    throw new Recusa(`LEITURA FALHOU: ${redigirErro(err && err.stderr) || 'sem stderr'}`);
  }
  try {
    return JSON.parse(JSON.parse(out.slice(out.indexOf('[')))[0].r);
  } catch {
    throw new Recusa('LEITURA FALHOU: saida sem JSON');
  }
}

/* Lê o grafo e o fecho (duas requisições: catálogo; depois TODAS as linhas/contagens numa só). */
async function lerFecho(d, pop, vagas, modo) {
  const cat = await d.consultar({ tipo: 'catalogo' });
  if (!O(cat) || typeof cat.fk_md5 !== 'string') throw new Recusa('FECHO: catalogo ilegivel');
  const op = { vagasAtualiza: Object.values(vagas).includes('deleted_at'), vagasRemover: Object.values(vagas).includes('remover') };
  const plano = planejarFecho(cat.fks, op);
  const entrada = { ids: pop.ids, users: pop.users, vagas };
  const sql = sqlDoFecho(plano, entrada, modo);
  const resp = await d.consultar({ tipo: 'dados', modo, plano, entrada, sql });
  const av = avaliarFecho(plano, resp, entrada, cat.fk_md5, modo);
  return { plano, av, fkMd5: cat.fk_md5 };
}

/* ───────────────────────────── modos ───────────────────────────── */

function lerJson(d, p, rotulo) {
  try {
    return JSON.parse(d.ler(p));
  } catch {
    throw new Recusa(`${rotulo}: arquivo ilegivel ou JSON malformado`);
  }
}

function lerTexto(d, p, rotulo) {
  try {
    return d.ler(p);
  } catch {
    throw new Recusa(`${rotulo}: arquivo ilegivel`);
  }
}

async function modoContar(a, d, out) {
  const pop = lerPopulacao(lerJson(d, a.populacao, 'EXPORT NAO E A POPULACAO'));
  const vagas = lerDestinosVagas(lerTexto(d, a.decisaoEscopo, 'DECISAO FORA DO FORMATO'));
  const { plano, av } = await lerFecho(d, pop, vagas, 'contar');
  exigirRaizes(av.raizesExport, pop);
  out.log(linhaContagem(av, pop, plano));
  return 0;
}

const USO =
  'USO: node scripts/p52_export_limpeza.cjs --auto-teste | --contar --populacao <POPULACAO.json> --decisao-escopo <52-19-DECISAO-ESCOPO.md>';

function lerArgs(argv) {
  const a = { modo: null, populacao: null, decisaoEscopo: null };
  const valor = (i) => (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null);
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--auto-teste') a.modo = a.modo ? 'erro' : 'auto';
    else if (x === '--contar') a.modo = a.modo ? 'erro' : 'contar';
    else if (x === '--populacao' && valor(i)) a.populacao = argv[++i];
    else if (x === '--decisao-escopo' && valor(i)) a.decisaoEscopo = argv[++i];
    else a.modo = 'erro';
  }
  if (a.modo === 'auto' && argv.length !== 1) a.modo = 'erro';
  if (a.modo === 'contar' && (!a.populacao || !a.decisaoEscopo)) a.modo = 'erro';
  return a;
}

function depsPadrao() {
  return {
    consultar: async (p) => consultarProd(p),
    io: { log: (s) => console.log(s), err: (s) => console.error(s) },
    ler: (p) => fs.readFileSync(p, 'utf8'),
  };
}

/* CLI testável: devolve o código de saída. `deps` substitui consulta, saída e arquivos. */
async function principal(argv, deps) {
  const d = { ...depsPadrao(), ...(deps || {}) };
  const out = { log: (s) => d.io.log(String(s)), err: (s) => d.io.err(String(s)) };
  const a = lerArgs(argv);
  if (!a.modo || a.modo === 'erro') {
    out.err(USO);
    return 2;
  }
  try {
    if (a.modo === 'auto') return await autoTeste(out);
    return await modoContar(a, d, out);
  } catch (e) {
    if (e instanceof Recusa) out.err(e.message);
    else out.err(`ERRO INESPERADO: ${e && e.name ? e.name : 'erro'}; nada concluido`);
    return 1;
  }
}

/* ───────────────────────────── dublê de consulta (auto-teste, sem rede) ───────────────────────────── */

/*
 * Avalia o PLANO sobre tabelas em memória com a mesma semântica do SQL gerado: raízes (com a dupla guarda),
 * descida por aresta (coluna nula não casa), `anula`/`atualiza` sem as linhas já em `apaga`, projeção com as
 * colunas «token» de auth.users em ''.
 */
function consultaEmMemoria(db) {
  const fkMd5 = () => md5(JSON.stringify(db.fks));
  return async (pedido) => {
    if (pedido.tipo === 'catalogo') return { fks: db.fks, fk_md5: fkMd5() };
    const { plano, entrada, modo } = pedido;
    const linhasDe = (t) => db.tabelas[t] || [];
    const sets = new Map();
    const remover = Object.keys(entrada.vagas).filter((k) => entrada.vagas[k] === 'remover');
    const deletedAt = Object.keys(entrada.vagas).filter((k) => entrada.vagas[k] === 'deleted_at');
    for (const n of plano.nos) {
      const rows = linhasDe(n.tabela);
      const s = new Set();
      rows.forEach((r, i) => {
        if (n.raiz === 'candidatos' && entrada.ids.includes(r.id)) s.add(i);
        if (n.raiz === 'auth' && entrada.users.includes(r.id) && !linhasDe(T_RH).some((g) => g.user_id === r.id) && !linhasDe(T_CAND).some((g) => g.user_id === r.id && !entrada.ids.includes(g.id))) s.add(i);
        if (n.raiz === 'vagas_remover' && remover.includes(String(r.id).slice(0, 8))) s.add(i);
        if (n.raiz === 'vagas_deleted_at' && deletedAt.includes(String(r.id).slice(0, 8))) s.add(i);
      });
      for (const a of n.arestas) {
        const pais = linhasDe(a.pai);
        const chaves = new Set([...sets.get(`${a.pai}|apaga`)].map((i) => JSON.stringify(a.refcols.map((c) => pais[i][c]))));
        rows.forEach((r, i) => {
          const v = a.cols.map((c) => r[c]);
          if (v.every((x) => x !== null && x !== undefined) && chaves.has(JSON.stringify(v))) s.add(i);
        });
      }
      if (n.modo !== 'apaga' && sets.has(`${n.tabela}|apaga`)) for (const i of sets.get(`${n.tabela}|apaga`)) s.delete(i);
      sets.set(n.chave, s);
    }
    const proj = (t, r) => {
      if (t !== T_AUTH) return JSON.stringify(r);
      const o = {};
      for (const [k, v] of Object.entries(r)) o[k] = k.includes('token') ? '' : v;
      return JSON.stringify(o);
    };
    const nos = {};
    for (const n of plano.nos) {
      const s = sets.get(n.chave);
      nos[n.chave] = { n: s.size };
      if (modo === 'linhas' && !n.excluida) nos[n.chave].l = ordenarBytes([...s].map((i) => proj(n.tabela, linhasDe(n.tabela)[i])));
    }
    const vagas = {};
    for (const p of Object.keys(entrada.vagas)) vagas[p] = linhasDe(T_VAGAS).filter((v) => String(v.id).startsWith(p)).length;
    const cands = [...sets.get(`${T_CAND}|apaga`)].map((i) => linhasDe(T_CAND)[i]);
    const auths = [...sets.get(`${T_AUTH}|apaga`)].map((i) => linhasDe(T_AUTH)[i]);
    const colsAuth = new Set(linhasDe(T_AUTH).flatMap((r) => Object.keys(r)));
    return {
      agora: db.agora || '2026-10-13T12:00:00.000Z',
      fk_md5: db.fkMd5Dados || fkMd5(),
      colunas_token: ordenarBytes([...colsAuth].filter((c) => c.includes('token'))),
      vagas,
      raizes: { candidatos: cands.map((r) => [r.id, r.user_id || null]), auth: auths.map((r) => r.id) },
      nos,
    };
  };
}

/* O grafo e as linhas da fixture do <behavior> (ids sintéticos; e-mails e nomes FALSOS, para provar que não vazam). */
function fixtureFecho() {
  const id = (p, n) => `${p}${String(n).padStart(7, '0')}-0000-4000-8000-000000000000`;
  const C = (n) => id('c', n);
  const Uu = (n) => id('e', n);
  const K = (n) => id('d', n);
  const fk = (tab, col, ref, tipo, nn) => ({ tab, cols: [col], ref, refcols: ['id'], tipo, nn });
  const fks = [
    fk('public.candidaturas', 'candidato_id', 'public.candidatos', 'c', true),
    fk('public.candidaturas', 'vaga_id', 'public.vagas', 'c', true),
    fk('public.filho', 'candidatura_id', 'public.candidaturas', 'c', true),
    fk('public.neto', 'filho_id', 'public.filho', 'c', true),
    fk('public.filho_na', 'candidatura_id', 'public.candidaturas', 'a', true),
    fk('public.filho_sn', 'candidatura_id', 'public.candidaturas', 'n', false),
    fk('public.filho_sn_filho', 'filho_sn_id', 'public.filho_sn', 'c', true),
    fk('public.filho_snnn', 'candidato_id', 'public.candidatos', 'n', true),
    fk('public.candidatos', 'user_id', 'auth.users', 'n', false),
    fk('public.usuarios_rh', 'user_id', 'auth.users', 'c', true),
    fk('public.vagas', 'created_by', 'auth.users', 'a', false),
    fk('auth.identities', 'user_id', 'auth.users', 'c', true),
    fk('auth.sessions', 'user_id', 'auth.users', 'c', true),
    fk('auth.refresh_tokens', 'session_id', 'auth.sessions', 'c', false),
    fk('auth.mfa_factors', 'user_id', 'auth.users', 'c', true),
  ];
  const conta = (n, extra) => ({
    id: Uu(n), email: `fulano${n}@exemplo.invalid`, encrypted_password: `$2a$10$hashfalso${n}`, confirmation_token: `tok-conf-${n}`,
    recovery_token: `tok-rec-${n}`, email_change_token_new: '', raw_user_meta_data: { nome: `Fulano Sobrenome ${n}` }, ...extra,
  });
  const tabelas = {
    'public.candidatos': [
      { id: C(1), user_id: Uu(1), email: 'fulano1@exemplo.invalid', nome_completo: 'Fulano Um', cpf: '000.000.000-01' },
      { id: C(2), user_id: Uu(2), email: 'fulano2@exemplo.invalid', nome_completo: 'Fulano Dois', cpf: '000.000.000-02' },
      { id: C(3), user_id: Uu(2), email: 'fulano2b@exemplo.invalid', nome_completo: 'Fulano Dois B', cpf: '000.000.000-03' },
      { id: C(4), user_id: null, email: 'ficticio@exemplo.invalid', nome_completo: 'Ficticio', cpf: null },
      { id: C(5), user_id: Uu(5), email: 'fora@exemplo.invalid', nome_completo: 'Fora', cpf: '000.000.000-05' },
      { id: C(6), user_id: Uu(6), email: 'rh@exemplo.invalid', nome_completo: 'Pessoa RH', cpf: '000.000.000-06' },
    ],
    'auth.users': [conta(1), conta(2), conta(5), conta(6), conta(8)],
    'auth.identities': [{ id: id('f', 1), user_id: Uu(1) }, { id: id('f', 2), user_id: Uu(2) }],
    'auth.sessions': [{ id: id('a', 1), user_id: Uu(1) }],
    'auth.refresh_tokens': [{ id: id('a', 2), session_id: id('a', 1), token: 'refresh-falso' }],
    'auth.mfa_factors': [{ id: id('a', 3), user_id: Uu(1) }],
    'public.usuarios_rh': [{ id: id('b', 1), user_id: Uu(6) }],
    'public.vagas': [
      { id: 'aaaaaaaa-0000-4000-8000-000000000000', titulo: '[TESTE] a', deleted_at: null, created_by: null },
      { id: 'bbbbbbbb-0000-4000-8000-000000000000', titulo: '[TESTE] b', deleted_at: null, created_by: null },
      { id: 'cccccccc-0000-4000-8000-000000000000', titulo: 'real', deleted_at: null, created_by: null },
    ],
    'public.candidaturas': [
      { id: K(1), candidato_id: C(1), vaga_id: 'cccccccc-0000-4000-8000-000000000000' },
      { id: K(2), candidato_id: C(4), vaga_id: 'cccccccc-0000-4000-8000-000000000000' },
      { id: K(3), candidato_id: C(3), vaga_id: 'cccccccc-0000-4000-8000-000000000000' },
      { id: K(5), candidato_id: C(5), vaga_id: 'bbbbbbbb-0000-4000-8000-000000000000' },
    ],
    'public.filho': [{ id: id('9', 1), candidatura_id: K(1) }],
    'public.neto': [{ id: id('9', 2), filho_id: id('9', 1) }],
    'public.filho_na': [{ id: id('9', 3), candidatura_id: K(2) }, { id: id('9', 4), candidatura_id: K(3) }],
    'public.filho_sn': [{ id: id('9', 5), candidatura_id: K(1) }],
    'public.filho_sn_filho': [{ id: id('9', 6), filho_sn_id: id('9', 5) }],
    'public.filho_snnn': [{ id: id('9', 7), candidato_id: C(1) }],
  };
  const apagaveis = { ficticios: [{ id: C(4), user_id: null }], contas_teste_com_candidatura: [{ id: C(1), user_id: Uu(1) }, { id: C(2), user_id: Uu(2) }, { id: C(6), user_id: Uu(6) }] };
  const pop = { apagaveis, populacao_md5: md5Ids([C(1), C(2), C(4), C(6)]) };
  const decisao = 'vaga_aaaaaaaa: deleted_at\nvaga_bbbbbbbb: remover\nvaga_cccccccc: manter\nvaga_dddddddd: fora_do_bloco_d\n';
  return { db: { fks, tabelas }, pop, decisao, C, Uu, K, id };
}

/* ───────────────────────────── auto-teste ───────────────────────────── */

async function autoTeste(out) {
  const F = fixtureFecho;
  const amb = (f, arquivos) => {
    const saida = [];
    const mem = { 'pop.json': JSON.stringify(f.pop), 'dec.md': f.decisao, ...(arquivos || {}) };
    return {
      saida,
      deps: {
        consultar: consultaEmMemoria(f.db),
        io: { log: (s) => saida.push(String(s)), err: (s) => saida.push(String(s)) },
        ler: (p) => {
          if (!(p in mem)) throw new Error('ausente');
          return mem[p];
        },
      },
    };
  };
  const fechoDe = async (f, modo) => {
    const pop = lerPopulacao(f.pop);
    return lerFecho({ consultar: consultaEmMemoria(f.db) }, pop, lerDestinosVagas(f.decisao), modo || 'linhas');
  };
  const n = (av, chave) => (av.contagens.find((c) => c.chave === chave) || { n: -1 }).n;
  const temLinha = (av, t, m, idv) => av.linhas.some((l) => l.t === t && l.m === m && JSON.parse(l.texto).id === idv);
  const todasSaidas = [];

  const casos = [
    ['fecho: raiz, filhos, neto (CASCADE) e o filho NO ACTION em apaga', async () => {
      const f = F();
      const { av } = await fechoDe(f);
      return (
        temLinha(av, 'public.candidatos', 'apaga', f.C(1)) && temLinha(av, 'public.candidatos', 'apaga', f.C(4)) &&
        temLinha(av, 'public.candidaturas', 'apaga', f.K(1)) && temLinha(av, 'public.candidaturas', 'apaga', f.K(2)) &&
        temLinha(av, 'public.filho', 'apaga', f.id('9', 1)) && temLinha(av, 'public.neto', 'apaga', f.id('9', 2)) &&
        temLinha(av, 'public.filho_na', 'apaga', f.id('9', 3)) && !temLinha(av, 'public.filho_na', 'apaga', f.id('9', 4)) &&
        !temLinha(av, 'public.candidaturas', 'apaga', f.K(3))
      );
    }],
    ['fecho: o filho SET NULL em anula, SEM descer (o neto dele fica fora)', async () => {
      const f = F();
      const { av, plano } = await fechoDe(f);
      return temLinha(av, 'public.filho_sn', 'anula', f.id('9', 5)) && n(av, 'public.filho_sn|apaga') === -1 && !av.linhas.some((l) => l.t === 'public.filho_sn_filho') && !plano.nos.some((x) => x.tabela === 'public.filho_sn_filho');
    }],
    ['fecho: SET NULL sobre coluna NOT NULL vai em apaga (a forma de candidate_ai_decisions)', async () => {
      const f = F();
      const { av } = await fechoDe(f);
      return temLinha(av, 'public.filho_snnn', 'apaga', f.id('9', 7)) && n(av, 'public.filho_snnn|anula') === -1;
    }],
    ['auth: users e identities exportadas; sessoes, refresh tokens e MFA so em excluidas_por_desenho', async () => {
      const f = F();
      const { av } = await fechoDe(f);
      const exc = av.contagens.filter((c) => c.excluida).map((c) => `${c.tabela}=${c.n}`).sort().join(',');
      return (
        temLinha(av, 'auth.users', 'apaga', f.Uu(1)) && temLinha(av, 'auth.identities', 'apaga', f.id('f', 1)) &&
        exc === 'auth.mfa_factors=1,auth.refresh_tokens=1,auth.sessions=1' &&
        !av.linhas.some((l) => ['auth.sessions', 'auth.refresh_tokens', 'auth.mfa_factors'].includes(l.t))
      );
    }],
    ['dupla guarda: conta com candidatos fora das raizes e conta com usuarios_rh NAO entram em apaga (nem as identities delas)', async () => {
      const f = F();
      const { av } = await fechoDe(f);
      return (
        n(av, 'auth.users|apaga') === 1 && !temLinha(av, 'auth.users', 'apaga', f.Uu(2)) && !temLinha(av, 'auth.users', 'apaga', f.Uu(6)) &&
        !temLinha(av, 'auth.identities', 'apaga', f.id('f', 2)) && temLinha(av, 'public.candidatos', 'apaga', f.C(2)) && temLinha(av, 'public.candidatos', 'apaga', f.C(6)) &&
        n(av, 'public.usuarios_rh|apaga') === 0
      );
    }],
    ['ordem: pais antes de filhos (plano e linhas)', async () => {
      const f = F();
      const { av, plano } = await fechoDe(f);
      const pos = (k) => plano.nos.findIndex((x) => x.chave === k);
      const antes = (a, b) => pos(a) >= 0 && pos(b) >= 0 && pos(a) < pos(b);
      const ultima = (t) => av.linhas.map((l) => l.t).lastIndexOf(t);
      const primeira = (t) => av.linhas.map((l) => l.t).indexOf(t);
      return (
        antes('auth.users|apaga', 'auth.identities|apaga') && antes('auth.users|apaga', 'public.candidatos|anula') && antes('public.candidatos|apaga', 'public.candidaturas|apaga') &&
        antes('public.vagas|apaga', 'public.candidaturas|apaga') && antes('public.vagas|apaga', 'public.vagas|atualiza') && antes('public.candidaturas|apaga', 'public.filho|apaga') &&
        antes('public.filho|apaga', 'public.neto|apaga') && ultima('public.candidatos') < primeira('public.candidaturas') && ultima('public.candidaturas') < primeira('public.neto') &&
        ultima('auth.users') < primeira('auth.identities')
      );
    }],
    ['vagas: deleted_at em atualiza (nao desce); remover em apaga e desce; manter e fora_do_bloco_d nada', async () => {
      const f = F();
      const { av } = await fechoDe(f);
      return (
        temLinha(av, 'public.vagas', 'atualiza', 'aaaaaaaa-0000-4000-8000-000000000000') && temLinha(av, 'public.vagas', 'apaga', 'bbbbbbbb-0000-4000-8000-000000000000') &&
        temLinha(av, 'public.candidaturas', 'apaga', f.K(5)) && !av.linhas.some((l) => l.t === 'public.vagas' && JSON.parse(l.texto).id.startsWith('cccccccc'))
      );
    }],
    ['vaga da decisao que nao casa exatamente uma vaga -> recusa', async () => {
      const f = F();
      f.decisao += 'vaga_eeeeeeee: deleted_at\n';
      const e = amb(f);
      const c = await principal(['--contar', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md'], e.deps);
      todasSaidas.push(...e.saida);
      return c === 1 && /EXPORT NAO E A POPULACAO: vaga_eeeeeeee/.test(e.saida.join('\n'));
    }],
    ['ciclo no grafo alcancado -> FECHO COM CICLO', async () => {
      const f = F();
      f.db.fks.push({ tab: 'public.neto', cols: ['outro_id'], ref: 'public.neto', refcols: ['id'], tipo: 'c', nn: false });
      const e = amb(f);
      const c = await principal(['--contar', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md'], e.deps);
      todasSaidas.push(...e.saida);
      return c === 1 && /FECHO COM CICLO/.test(e.saida.join('\n'));
    }],
    ['--contar: UMA linha EXPORT CONTAGEM, sem @ nem nome, com o populacao_md5 das raizes = o do POPULACAO.json', async () => {
      const f = F();
      const e = amb(f);
      const c = await principal(['--contar', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md'], e.deps);
      todasSaidas.push(...e.saida);
      const t = e.saida.join('\n');
      return (
        c === 0 && e.saida.length === 1 && /^EXPORT CONTAGEM: /.test(t) && t.includes(`populacao_md5=${f.pop.populacao_md5}`) && / raizes=4 /.test(t) &&
        t.includes('public.candidatos:apaga=4') && t.includes('auth.users:apaga=1') && t.includes('auth.sessions:excluida=1') && t.includes('public.vagas:atualiza=1') &&
        t.includes('public.filho_sn:anula=1') && !/@|Fulano|Sobrenome|tok-|hashfalso/.test(t)
      );
    }],
    ['--contar: id a mais em apagaveis (sem linha no banco) -> EXPORT NAO E A POPULACAO', async () => {
      const f = F();
      const extra = f.C(9);
      f.pop.apagaveis.ficticios.push({ id: extra, user_id: null });
      f.pop.populacao_md5 = md5Ids([f.C(1), f.C(2), f.C(4), f.C(6), extra]);
      const e = amb(f);
      const c = await principal(['--contar', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md'], e.deps);
      todasSaidas.push(...e.saida);
      return c === 1 && /EXPORT NAO E A POPULACAO: raizes do fecho != apagaveis \(a mais: -; a menos: c0000009\)/.test(e.saida.join('\n'));
    }],
    ['--contar: populacao_md5 do POPULACAO.json adulterado ou apagaveis vazio -> EXPORT NAO E A POPULACAO', async () => {
      const f1 = F();
      f1.pop.populacao_md5 = md5('x');
      const f2 = F();
      f2.pop = { apagaveis: { ficticios: [] }, populacao_md5: md5('') };
      const e1 = amb(f1);
      const e2 = amb(f2);
      const c1 = await principal(['--contar', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md'], e1.deps);
      const c2 = await principal(['--contar', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md'], e2.deps);
      todasSaidas.push(...e1.saida, ...e2.saida);
      return c1 === 1 && c2 === 1 && /EXPORT NAO E A POPULACAO/.test(e1.saida.join('\n')) && /populacao vazia/.test(e2.saida.join('\n'));
    }],
    ['entrada orfa (id = conta de auth.users) entra so por auth.users e conta como raiz', async () => {
      const f = F();
      f.pop.apagaveis.auth_orfaos_padrao_teste = [{ id: f.Uu(8), user_id: f.Uu(8) }];
      f.pop.populacao_md5 = md5Ids([f.C(1), f.C(2), f.C(4), f.C(6), f.Uu(8)]);
      const { av } = await fechoDe(f);
      return temLinha(av, 'auth.users', 'apaga', f.Uu(8)) && av.raizesExport.includes(f.Uu(8)) && av.raizesMd5 === f.pop.populacao_md5;
    }],
    ['catalogo que muda entre o grafo e as linhas -> recusa', async () => {
      const f = F();
      f.db.fkMd5Dados = md5('outro');
      const e = amb(f);
      const c = await principal(['--contar', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md'], e.deps);
      todasSaidas.push(...e.saida);
      return c === 1 && /catalogo de FK mudou/.test(e.saida.join('\n'));
    }],
    ['SQL: so leitura, trava primeiro, dupla guarda e uma subconsulta por aresta; colunas token em branco por forma', async () => {
      const f = F();
      const plano = planejarFecho(f.db.fks, { vagasAtualiza: true, vagasRemover: true });
      const pop = lerPopulacao(f.pop);
      const s = sqlDoFecho(plano, { ids: pop.ids, users: pop.users, vagas: lerDestinosVagas(f.decisao) }, 'linhas');
      const arestas = plano.nos.reduce((acc, x) => acc + x.arestas.length, 0);
      return (
        s.startsWith('set transaction read only;') && SQL_CATALOGO.startsWith('set transaction read only;') &&
        !/\b(insert\s+into|delete\s+from|truncate|update\s+\S+\s+set)\b/i.test(s) && /not exists \(select 1 from "public"\."usuarios_rh" g where g\.user_id = t\.id\)/.test(s) &&
        /not exists \(select 1 from "public"\."candidatos" g where g\.user_id = t\.id and not \(g\.id = any/.test(s) && (s.match(/ in \(select p\./g) || []).length === arestas &&
        s.includes("e.key like '%token%'") && !s.includes("'l', (select coalesce(jsonb_agg(x.j order by x.j collate \"C\"), '[]'::jsonb) from (select to_jsonb(t)::text as j from \"auth\".\"sessions\"")
      );
    }],
    ['uso invalido -> 2', async () => {
      const e = amb(F());
      return (await principal([], e.deps)) === 2 && (await principal(['--contar', '--populacao', 'pop.json'], e.deps)) === 2 && (await principal(['--auto-teste', '--contar'], e.deps)) === 2;
    }],
    ['nenhum e-mail, nome, CPF, token ou hash em nenhuma saida dos casos acima', async () => !/@|Fulano|Sobrenome|Ficticio|000\.000|tok-|hashfalso|refresh-falso/.test(todasSaidas.join('\n')) && todasSaidas.length > 0],
  ];

  const falhas = [];
  for (const [nome, f] of casos) {
    let r = false;
    try {
      r = (await f()) === true;
    } catch {
      r = false;
    }
    if (!r) falhas.push(nome);
  }
  if (falhas.length) {
    out.err(`EXPORT AUTO-TESTE FALHOU: ${falhas.join('; ')}`);
    return 1;
  }
  out.log(`EXPORT AUTO-TESTE OK: ${casos.length}/${casos.length} (fecho de FK, modos apaga/anula/atualiza, auth fora por desenho, dupla guarda, ordem, contagem so leitura, recusas)`);
  return 0;
}

module.exports = {
  ordenarBytes, md5Ids, lerPopulacao, lerDestinosVagas, modoDaAresta, planejarFecho, sqlDoFecho, avaliarFecho, exigirRaizes, linhaContagem,
  consultaEmMemoria, fixtureFecho, principal, SQL_CATALOGO, Recusa,
};

if (require.main === module) {
  principal(process.argv.slice(2)).then(
    (c) => process.exit(c),
    () => {
      console.error('ERRO INESPERADO; nada concluido');
      process.exit(1);
    }
  );
}
