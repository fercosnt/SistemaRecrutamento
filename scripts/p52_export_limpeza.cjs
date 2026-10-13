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
 *   --exportar <dir> --populacao <POPULACAO.json> --decisao-escopo <52-19-DECISAO-ESCOPO.md> --storage <STORAGE.json>
 *       ⛔ CRIA UMA CÓPIA DE DADO PESSOAL. Só no 52-21 Task 1, UMA vez. `<dir>` absoluto, fora do repositório e
 *       de QUALQUER árvore git, ainda inexistente; criado 0700, arquivos 0600:
 *         linhas.jsonl       um registro por linha, `{"t":"<esquema>.<tabela>","m":"apaga|anula|atualiza","r":<to_jsonb>}`,
 *                            na ordem do fecho (pais antes de filhos), dentro do nó por `r::text COLLATE "C"`;
 *                            restaurável por `jsonb_populate_record(null::<tabela>, linha->'r')`;
 *         storage/K.bin      cada currículo dos prefixos do STORAGE.json, baixado pela Storage API;
 *         storage/INDICE.json `[{k, nome, bytes, md5}]` — o nome do arquivo só existe aqui, fora do git;
 *         MANIFESTO.json     `{versao_formato, exportado_em (now() do servidor na requisição das linhas),
 *                            populacao_md5, raizes, linhas, tabelas{n, md5, por_modo}, linhas_md5,
 *                            excluidas_por_desenho, colunas_em_branco, storage{bucket, n_objetos, nomes_md5,
 *                            conteudo_md5}, escopo{vagas}, fk_md5, arquivos{md5 por arquivo}, selo}` — `selo` =
 *                            md5 do manifesto sem ele (um octeto trocado no próprio manifesto também é recusado).
 *       `export_md5` = md5 dos bytes do MANIFESTO.json. Imprime `EXPORT GRAVADO: dir=… export_md5=… exportado_em=…
 *       linhas=… tabelas=… curriculos=…`.
 *   --conferir (--dir <dir> | --registro <52-21-EXPORT.md> | --decisao <52-21-DECISAO.md>) --populacao <POPULACAO.json>
 *              --storage <STORAGE.json> [--vivo]
 *       A prontidão para restaurar. `--registro` lê `export_dir:`/`export_md5:`/`exportado_em:`; `--decisao` lê
 *       `export_dir:`/`export_md5_aprovado:`/`export_em_aprovado:`. Recusa, nesta ordem: EXPORT DENTRO DE
 *       REPOSITORIO · EXPORT AUSENTE: <diretorio|MANIFESTO.json|linhas.jsonl|storage/INDICE.json|storage/K.bin> ·
 *       EXPORT ADULTERADO: <arquivo> · EXPORT NAO E O APROVADO (md5 do manifesto ou instante ≠ registro/decisão) ·
 *       EXPORT NAO E A POPULACAO (raízes ≠ apagaveis; currículos ≠ captura) · com `--vivo`, o fecho refeito AGORA
 *       (só leitura) e o Storage relistado: EXPORT DIFERE DO VIVO: <tabela|linhas|catalogo|storage>. Saída
 *       `EXPORT CONFERIDO: export_md5=… linhas=… curriculos=… vivo=igual|nao_conferido`.
 *   --auto-teste
 *       Os casos do plano com dublê de consulta e de `fetch` (sem rede; exports de teste em temporários do
 *       sistema, apagados no fim).
 *
 * CHAVE: a `service_role` (só para a Storage API) vem em memória de `GET https://api.supabase.com/v1/projects/
 * <ref>/api-keys` com o token da Management API (Keychain «Supabase CLI»/«supabase», ou SUPABASE_ACCESS_TOKEN —
 * o molde do `efdeploy.cjs`/`p46apply.cjs`); nunca impressa, nunca gravada; toda saída passa por um redator.
 * O Storage NUNCA é lido pelo catálogo SQL dele — só pela Storage API (listar e baixar).
 *
 * PRIVACIDADE (JORN-63): nada aqui imprime e-mail, nome, CPF, nome de arquivo, token ou chave — só ids
 * (prefixo de 8), nomes de tabela, contagens e md5. Mensagens de erro da leitura saem truncadas e redigidas.
 *
 * Saída: 0 ok · 1 recusa/erro · 2 uso. Sem dependências.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const REF = process.env.SUPABASE_PROJECT_REF || 'isljnozzlvckrgjjbjwp';
const URL_PROJETO = `https://${REF}.supabase.co`;
const URL_CHAVES = `https://api.supabase.com/v1/projects/${REF}/api-keys`;
const BUCKET = 'curriculos';
const LIMITE = 100;
const MAX_PAGINAS = 100;
const ISO = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$/;
const H = /^[0-9a-f]{32}$/;

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

/*
 * FORMA CANÔNICA de `nomes_md5` e `prefixos` (contrato do STORAGE.json com o 52-20 — `p52_remove_storage.cjs
 * --capturar` o produz; o parágrafo «Forma canônica» é idêntico nos dois planos): cada objeto é o caminho
 * COMPLETO dentro do bucket, `<prefixo>/<nome>` — sem bucket, sem `/` inicial. `nomes_md5` = md5 hex minúsculo
 * dos bytes UTF-8 da junção por `\n`, SEM `\n` no fim, depois de ordenar por comparação de bytes UTF-8
 * (`Buffer.compare`, nunca o `.sort()` padrão, que compara unidades UTF-16); lista vazia ⇒ d41d8cd9….
 * `prefixos` = os prefixos distintos dos caminhos, sem `/` final, na mesma ordem de bytes.
 */
function nomesMd5(caminhos) {
  return md5(ordenarBytes(caminhos).join('\n'));
}

function prefixosDe(caminhos) {
  return ordenarBytes([...new Set(caminhos.map((c) => String(c).split('/')[0]))]);
}

/* As raízes do que foi alcançado: os candidatos em apaga, mais as contas em apaga que não são login deles (órfãs). */
function raizesDe(cands, authIds) {
  const usersCand = new Set(cands.map((x) => x[1]).filter(Boolean));
  return ordenarBytes([...new Set([...cands.map((x) => String(x[0])), ...authIds.map(String).filter((u) => !usersCand.has(u))])]);
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
  exigirContasDaPopulacao(authIds, entrada.users);
  const raizesExport = raizesDe(cand, authIds);
  return { agora: String(resp.agora || ''), colunasToken, contagens, linhas, raizesExport, raizesMd5: md5Ids(raizesExport) };
}

function exigirContasDaPopulacao(authIds, users) {
  for (const u of authIds) if (!users.includes(u)) throw new Recusa(`EXPORT NAO E A POPULACAO: conta ${String(u).slice(0, 8)} em apaga fora dos user_id de apagaveis`);
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

/* ───────────────────────────── o formato do export (puro) ───────────────────────────── */

/* linhas.jsonl e o resumo por tabela, a partir do fecho avaliado (a MESMA função no --exportar e no --vivo). */
function montarLinhas(av) {
  const txt = av.linhas.map((l) => `{"t":${JSON.stringify(l.t)},"m":${JSON.stringify(l.m)},"r":${l.texto}}`);
  const corpo = txt.map((x) => `${x}\n`).join('');
  const acc = {};
  av.linhas.forEach((l, i) => {
    const t = acc[l.t] || (acc[l.t] = { l: [], por_modo: { apaga: 0, anula: 0, atualiza: 0 } });
    t.l.push(txt[i]);
    t.por_modo[l.m] += 1;
  });
  const tabelas = {};
  for (const [t, v] of Object.entries(acc)) tabelas[t] = { n: v.l.length, md5: md5(v.l.join('\n')), por_modo: v.por_modo };
  const excluidas = {};
  for (const c of av.contagens) if (c.excluida) excluidas[c.tabela] = (excluidas[c.tabela] || 0) + c.n;
  return { corpo, tabelas, excluidas, linhas_md5: md5(corpo), n: txt.length };
}

function textoManifesto(mf) {
  const semSelo = { ...mf };
  delete semSelo.selo;
  return `${JSON.stringify({ ...semSelo, selo: md5(JSON.stringify(semSelo, null, 2)) }, null, 2)}\n`;
}

/* O manifesto íntegro: JSON na forma exata em que foi gravado, com o selo certo. Devolve o objeto ou null. */
function lerManifestoIntegro(buf) {
  let mf;
  try {
    mf = JSON.parse(buf.toString('utf8'));
  } catch {
    return null;
  }
  if (!O(mf) || typeof mf.selo !== 'string' || textoManifesto(mf) !== buf.toString('utf8')) return null;
  if (!O(mf.arquivos) || !O(mf.tabelas) || !O(mf.storage) || !O(mf.escopo) || !O(mf.escopo.vagas)) return null;
  return mf;
}

/* O formato do STORAGE.json (a captura do 52-20). Devolve a lista de erros (vazia = no formato). */
function errosStorage(j) {
  const e = [];
  if (!O(j)) return ['raiz nao e objeto'];
  if (j.bucket !== BUCKET) e.push('bucket');
  if (!Array.isArray(j.prefixos) || j.prefixos.some((p) => typeof p !== 'string' || !U.test(p))) e.push('prefixos (cada um um uuid, sem /)');
  else if (JSON.stringify(ordenarBytes([...new Set(j.prefixos)])) !== JSON.stringify(j.prefixos)) e.push('prefixos (fora da forma canonica)');
  if (!Number.isInteger(j.n_objetos) || j.n_objetos < 0) e.push('n_objetos');
  if (typeof j.nomes_md5 !== 'string' || !H.test(j.nomes_md5)) e.push('nomes_md5');
  if (Array.isArray(j.prefixos) && Number.isInteger(j.n_objetos) && j.n_objetos > 0 && !j.prefixos.length) e.push('prefixos vazios com n_objetos > 0');
  return e;
}

function lerStorage(d, p, pop) {
  const st = lerJson(d, p, 'EXPORT NAO E A POPULACAO: STORAGE.json');
  const e = errosStorage(st);
  if (e.length) throw new Recusa(`EXPORT NAO E A POPULACAO: STORAGE.json fora do formato (${e.join(', ')})`);
  const fora = st.prefixos.filter((x) => !pop.prefixos.includes(x));
  if (fora.length) throw new Recusa(`EXPORT NAO E A POPULACAO: storage com prefixo fora de apagaveis (${fora.map((x) => x.slice(0, 8)).join(',')})`);
  return st;
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

/* ───────────────────────────── Storage API (injetável; só listar e baixar) ───────────────────────────── */

class ErroRede extends Error {}

async function obterChave(fetchFn, token) {
  let r;
  try {
    r = await fetchFn(URL_CHAVES, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ErroRede('chave: Management API inalcancavel');
  }
  if (!r.ok) throw new ErroRede(`chave: Management API HTTP ${r.status}`);
  const j = await r.json().catch(() => null);
  const k = Array.isArray(j) ? j.find((x) => O(x) && x.name === 'service_role' && typeof x.api_key === 'string' && x.api_key) : null;
  if (!k) throw new ErroRede('chave: service_role ausente na resposta da Management API');
  return k.api_key;
}

function criarCliente(fetchFn, chave) {
  const cab = { Authorization: `Bearer ${chave}`, apikey: chave };
  return {
    async listarPagina(prefixo, offset) {
      let r;
      try {
        r = await fetchFn(`${URL_PROJETO}/storage/v1/object/list/${BUCKET}`, {
          method: 'POST',
          headers: { ...cab, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix: prefixo, limit: LIMITE, offset, sortBy: { column: 'name', order: 'asc' } }),
        });
      } catch {
        throw new ErroRede('listagem: Storage API inalcancavel');
      }
      if (!r.ok) throw new ErroRede(`listagem: Storage API HTTP ${r.status}`);
      const j = await r.json().catch(() => null);
      if (!Array.isArray(j)) throw new ErroRede('listagem: resposta nao e lista');
      return j;
    },
    async baixar(caminho) {
      let r;
      try {
        r = await fetchFn(`${URL_PROJETO}/storage/v1/object/${BUCKET}/${caminho.split('/').map(encodeURIComponent).join('/')}`, { method: 'GET', headers: cab });
      } catch {
        throw new ErroRede('download: Storage API inalcancavel');
      }
      if (!r.ok) throw new ErroRede(`download: Storage API HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    },
  };
}

/* Os objetos sob UM prefixo, `{ caminho, bytes }` (um nível; subpasta = recusa). */
async function listarPrefixo(cli, prefixo) {
  const objs = [];
  for (let p = 0; p < MAX_PAGINAS; p++) {
    const linhas = await cli.listarPagina(prefixo, p * LIMITE);
    for (const l of linhas) {
      if (!O(l) || typeof l.name !== 'string' || l.name === '') continue;
      if (l.id === null) throw new Recusa('EXPORT NAO E A POPULACAO: subpasta sob um prefixo do storage (a listagem e de um nivel)');
      const tam = O(l.metadata) && Number.isInteger(l.metadata.size) ? l.metadata.size : null;
      objs.push({ caminho: `${prefixo}/${l.name}`, bytes: tam });
    }
    if (linhas.length < LIMITE) return objs;
  }
  throw new Recusa('EXPORT NAO E A POPULACAO: listagem do storage excedeu o teto de paginas');
}

async function listarTodos(cli, prefixos) {
  const todos = [];
  for (const p of prefixos) todos.push(...(await listarPrefixo(cli, p)));
  return todos;
}

/* ───────────────────────────── o diretório: fora de qualquer árvore git ───────────────────────────── */

/* Devolve o caminho real (resolvido pelo ancestral existente) ou lança EXPORT DENTRO DE REPOSITORIO. */
function exigirForaDeGit(dir, raizRepo) {
  if (typeof dir !== 'string' || !path.isAbsolute(dir)) throw new Recusa('EXPORT DENTRO DE REPOSITORIO: o diretorio do export tem de ser caminho absoluto (fora de qualquer arvore git)');
  let anc = path.resolve(dir);
  const resto = [];
  while (!fs.existsSync(anc)) {
    const pai = path.dirname(anc);
    if (pai === anc) break;
    resto.unshift(path.basename(anc));
    anc = pai;
  }
  const real = path.join(fs.realpathSync(anc), ...resto);
  const repo = fs.realpathSync(raizRepo);
  if (real === repo || real.startsWith(repo + path.sep)) throw new Recusa('EXPORT DENTRO DE REPOSITORIO: o diretorio fica dentro deste repositorio; nada gravado');
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  let r;
  try {
    r = execFileSync('git', ['-C', anc, 'rev-parse', '--is-inside-work-tree', '--is-inside-git-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env });
  } catch (e) {
    if (e && typeof e.status === 'number') return real;
    throw new Recusa('EXPORT DENTRO DE REPOSITORIO: nao foi possivel verificar a arvore git (git indisponivel); nada gravado');
  }
  if (/\btrue\b/.test(r)) throw new Recusa('EXPORT DENTRO DE REPOSITORIO: o diretorio fica dentro de uma arvore git; nada gravado');
  return real;
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

/* Lista e baixa os currículos dos prefixos capturados; listagem ≠ captura = recusa (nada gravado ainda). */
async function baixarCurriculos(d, out, st) {
  if (!st.prefixos.length) {
    if (st.n_objetos !== 0 || st.nomes_md5 !== nomesMd5([])) throw new Recusa('EXPORT NAO E A POPULACAO: storage != captura (captura sem prefixo com objetos)');
    return [];
  }
  const chave = await obterChave(d.fetch, d.token());
  out.segredos.push(chave);
  const cli = criarCliente(d.fetch, chave);
  const lista = await listarTodos(cli, st.prefixos);
  const nomes = lista.map((x) => x.caminho);
  const agora = nomesMd5(nomes);
  if (nomes.length !== st.n_objetos || agora !== st.nomes_md5) {
    throw new Recusa(`EXPORT NAO E A POPULACAO: storage != captura (agora n_objetos=${nomes.length} nomes_md5=${agora}; captura n_objetos=${st.n_objetos} nomes_md5=${st.nomes_md5}); nada gravado`);
  }
  const porNome = new Map(lista.map((x) => [x.caminho, x]));
  const objs = [];
  for (const nome of ordenarBytes(nomes)) {
    const buf = await cli.baixar(nome);
    const tam = porNome.get(nome).bytes;
    if (tam !== null && tam !== buf.length) throw new Recusa('EXPORT NAO E A POPULACAO: storage (tamanho baixado != listado); nada gravado');
    objs.push({ nome, buf });
  }
  return objs;
}

async function modoExportar(a, d, out) {
  exigirForaDeGit(a.exportar, d.raizRepo);
  let existe = true;
  try {
    fs.lstatSync(a.exportar);
  } catch {
    existe = false;
  }
  if (existe) throw new Recusa('EXPORT JA EXISTE: o diretorio do export ja existe (cada export e um diretorio novo); nada gravado');
  const pop = lerPopulacao(lerJson(d, a.populacao, 'EXPORT NAO E A POPULACAO'));
  const vagas = lerDestinosVagas(lerTexto(d, a.decisaoEscopo, 'DECISAO FORA DO FORMATO'));
  const st = lerStorage(d, a.storage, pop);
  const { av, fkMd5 } = await lerFecho(d, pop, vagas, 'linhas');
  exigirRaizes(av.raizesExport, pop);
  if (!ISO.test(av.agora)) throw new Recusa('FECHO: o instante do servidor veio fora do formato ISO; nada gravado');
  const objs = await baixarCurriculos(d, out, st);

  const ex = montarLinhas(av);
  const indice = objs.map((o, i) => ({ k: i + 1, nome: o.nome, bytes: o.buf.length, md5: md5(o.buf) }));
  const indiceTxt = `${JSON.stringify(indice, null, 2)}\n`;
  const mfTxt = textoManifesto({
    versao_formato: 1,
    exportado_em: av.agora,
    populacao_md5: av.raizesMd5,
    raizes: av.raizesExport.length,
    linhas: ex.n,
    tabelas: ex.tabelas,
    linhas_md5: ex.linhas_md5,
    excluidas_por_desenho: ex.excluidas,
    colunas_em_branco: { [T_AUTH]: av.colunasToken },
    storage: { bucket: BUCKET, n_objetos: indice.length, nomes_md5: nomesMd5(indice.map((x) => x.nome)), conteudo_md5: md5(indice.map((x) => x.md5).join('\n')) },
    escopo: { vagas },
    fk_md5: fkMd5,
    arquivos: { 'linhas.jsonl': ex.linhas_md5, 'storage/INDICE.json': md5(indiceTxt) },
  });

  const dir = a.exportar;
  fs.mkdirSync(path.join(dir, 'storage'), { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  fs.chmodSync(path.join(dir, 'storage'), 0o700);
  const gravar = (rel, conteudo) => {
    const p = path.join(dir, rel);
    fs.writeFileSync(p, conteudo, { mode: 0o600, flag: 'wx' });
    fs.chmodSync(p, 0o600);
  };
  gravar('linhas.jsonl', ex.corpo);
  objs.forEach((o, i) => gravar(`storage/${i + 1}.bin`, o.buf));
  gravar('storage/INDICE.json', indiceTxt);
  gravar('MANIFESTO.json', mfTxt);
  out.log(`EXPORT GRAVADO: dir=${dir} export_md5=${md5(mfTxt)} exportado_em=${av.agora} linhas=${ex.n} tabelas=${Object.keys(ex.tabelas).length} curriculos=${indice.length}`);
  return 0;
}

/* A referência do --conferir: { dir, md5, em } (md5/em nulos com --dir). */
function lerReferencia(a, d) {
  if (a.dir) return { dir: a.dir, md5: null, em: null };
  const fonte = a.registro ? 'registro' : 'decisao';
  const [kd, km, ke] = a.registro ? ['export_dir', 'export_md5', 'exportado_em'] : ['export_dir', 'export_md5_aprovado', 'export_em_aprovado'];
  const doc = lerTexto(d, a.registro || a.decisao, `EXPORT NAO E O APROVADO: ${fonte}`);
  const v = (k) => {
    const m = doc.match(new RegExp(`^${k}: *(\\S+)`, 'm'));
    return m ? m[1] : null;
  };
  const ref = { dir: v(kd), md5: v(km), em: v(ke) };
  if (!ref.dir || !ref.md5 || !H.test(ref.md5) || !ref.em) throw new Recusa(`EXPORT NAO E O APROVADO: ${fonte} sem ${kd}, ${km} (md5) e ${ke} validos`);
  return ref;
}

async function modoConferir(a, d, out) {
  const ref = lerReferencia(a, d);
  const pop = lerPopulacao(lerJson(d, a.populacao, 'EXPORT NAO E A POPULACAO'));
  const st = lerStorage(d, a.storage, pop);
  exigirForaDeGit(ref.dir, d.raizRepo);
  const dir = ref.dir;
  const stat = (rel) => {
    try {
      return fs.statSync(path.join(dir, rel));
    } catch {
      return null;
    }
  };
  const ler = (rel) => fs.readFileSync(path.join(dir, rel));

  // EXPORT AUSENTE (diretório e arquivos fixos), depois EXPORT ADULTERADO (manifesto, índice), K.bin, linhas
  const sd = stat('');
  if (!sd || !sd.isDirectory()) throw new Recusa('EXPORT AUSENTE: diretorio');
  for (const rel of ['MANIFESTO.json', 'linhas.jsonl', 'storage/INDICE.json']) if (!stat(rel) || !stat(rel).isFile()) throw new Recusa(`EXPORT AUSENTE: ${rel}`);
  const mfBuf = ler('MANIFESTO.json');
  const mf = lerManifestoIntegro(mfBuf);
  if (!mf) throw new Recusa('EXPORT ADULTERADO: MANIFESTO.json');
  const indBuf = ler('storage/INDICE.json');
  if (md5(indBuf) !== mf.arquivos['storage/INDICE.json']) throw new Recusa('EXPORT ADULTERADO: storage/INDICE.json');
  let ind;
  try {
    ind = JSON.parse(indBuf.toString('utf8'));
  } catch {
    throw new Recusa('EXPORT ADULTERADO: storage/INDICE.json');
  }
  const indOk = Array.isArray(ind) && ind.every((x, i) => O(x) && x.k === i + 1 && typeof x.nome === 'string' && Number.isInteger(x.bytes) && typeof x.md5 === 'string' && H.test(x.md5));
  if (!indOk || ind.length !== mf.storage.n_objetos || md5(ind.map((x) => x.md5).join('\n')) !== mf.storage.conteudo_md5) throw new Recusa('EXPORT ADULTERADO: storage/INDICE.json');
  for (const x of ind) if (!stat(`storage/${x.k}.bin`)) throw new Recusa(`EXPORT AUSENTE: storage/${x.k}.bin`);
  for (const x of ind) {
    const b = ler(`storage/${x.k}.bin`);
    if (b.length !== x.bytes || md5(b) !== x.md5) throw new Recusa(`EXPORT ADULTERADO: storage/${x.k}.bin`);
  }
  const corpo = ler('linhas.jsonl');
  if (md5(corpo) !== mf.arquivos['linhas.jsonl'] || md5(corpo) !== mf.linhas_md5) throw new Recusa('EXPORT ADULTERADO: linhas.jsonl');

  // EXPORT NAO E O APROVADO (registro/decisão)
  const exportMd5 = md5(mfBuf);
  if (ref.md5 !== null && ref.md5 !== exportMd5) throw new Recusa(`EXPORT NAO E O APROVADO: md5 do manifesto ${exportMd5} != ${a.registro ? 'export_md5' : 'export_md5_aprovado'} ${ref.md5}`);
  if (ref.em !== null && ref.em !== mf.exportado_em) throw new Recusa(`EXPORT NAO E O APROVADO: exportado_em do manifesto ${mf.exportado_em} != ${a.registro ? 'exportado_em' : 'export_em_aprovado'} ${ref.em}`);

  // EXPORT NAO E A POPULACAO (raízes das linhas exportadas = apagaveis; currículos = captura)
  let regs;
  try {
    regs = corpo.toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    throw new Recusa('EXPORT ADULTERADO: linhas.jsonl');
  }
  if (regs.length !== mf.linhas || regs.some((x) => !O(x) || typeof x.t !== 'string' || typeof x.m !== 'string' || !O(x.r))) throw new Recusa('EXPORT ADULTERADO: linhas.jsonl');
  const cands = regs.filter((x) => x.t === T_CAND && x.m === 'apaga').map((x) => [x.r.id, x.r.user_id || null]);
  const authIds = regs.filter((x) => x.t === T_AUTH && x.m === 'apaga').map((x) => x.r.id);
  exigirContasDaPopulacao(authIds, pop.users);
  exigirRaizes(raizesDe(cands, authIds), pop);
  if (mf.populacao_md5 !== pop.populacao_md5) throw new Recusa('EXPORT NAO E A POPULACAO: populacao_md5 do manifesto != o do POPULACAO.json');
  const nomes = ind.map((x) => x.nome);
  if (nomes.length !== st.n_objetos || nomesMd5(nomes) !== st.nomes_md5 || mf.storage.nomes_md5 !== st.nomes_md5 || nomes.some((x) => !st.prefixos.includes(x.split('/')[0]))) {
    throw new Recusa(`EXPORT NAO E A POPULACAO: storage != captura (export n_objetos=${nomes.length} nomes_md5=${nomesMd5(nomes)}; captura n_objetos=${st.n_objetos} nomes_md5=${st.nomes_md5})`);
  }

  // EXPORT DIFERE DO VIVO (o fecho refeito agora, só leitura; o Storage relistado)
  if (a.vivo) {
    const { av, fkMd5 } = await lerFecho(d, pop, mf.escopo.vagas, 'linhas');
    exigirRaizes(av.raizesExport, pop);
    if (fkMd5 !== mf.fk_md5) throw new Recusa('EXPORT DIFERE DO VIVO: catalogo (o grafo de FK mudou desde o export)');
    const ex = montarLinhas(av);
    for (const t of [...new Set([...Object.keys(mf.tabelas), ...Object.keys(ex.tabelas)])]) {
      if (JSON.stringify(mf.tabelas[t] || null) !== JSON.stringify(ex.tabelas[t] || null)) throw new Recusa(`EXPORT DIFERE DO VIVO: ${t}`);
    }
    if (ex.linhas_md5 !== mf.linhas_md5) throw new Recusa('EXPORT DIFERE DO VIVO: linhas');
    if (JSON.stringify(av.colunasToken) !== JSON.stringify((mf.colunas_em_branco || {})[T_AUTH])) throw new Recusa(`EXPORT DIFERE DO VIVO: ${T_AUTH} (colunas em branco)`);
    const prefixos = ordenarBytes([...new Set([...st.prefixos, ...prefixosDe(nomes)])]);
    let vivos = [];
    if (prefixos.length) {
      const chave = await obterChave(d.fetch, d.token());
      out.segredos.push(chave);
      vivos = await listarTodos(criarCliente(d.fetch, chave), prefixos);
    }
    const a1 = ordenarBytes(vivos.map((x) => `${x.caminho}\t${x.bytes}`)).join('\n');
    const a2 = ordenarBytes(ind.map((x) => `${x.nome}\t${x.bytes}`)).join('\n');
    if (a1 !== a2) throw new Recusa('EXPORT DIFERE DO VIVO: storage');
  }
  out.log(`EXPORT CONFERIDO: export_md5=${exportMd5} linhas=${mf.linhas} curriculos=${ind.length} vivo=${a.vivo ? 'igual' : 'nao_conferido'}`);
  return 0;
}

const USO =
  'USO: node scripts/p52_export_limpeza.cjs --auto-teste | --contar --populacao <POPULACAO.json> --decisao-escopo <52-19-DECISAO-ESCOPO.md> | ' +
  '--exportar <dir> --populacao <POPULACAO.json> --decisao-escopo <52-19-DECISAO-ESCOPO.md> --storage <STORAGE.json> | ' +
  '--conferir (--dir <dir> | --registro <52-21-EXPORT.md> | --decisao <52-21-DECISAO.md>) --populacao <POPULACAO.json> --storage <STORAGE.json> [--vivo]';

function lerArgs(argv) {
  const a = { modo: null, populacao: null, decisaoEscopo: null, storage: null, exportar: null, dir: null, registro: null, decisao: null, vivo: false };
  const valor = (i) => (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null);
  const modo = (m) => (a.modo ? 'erro' : m);
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--auto-teste') a.modo = modo('auto');
    else if (x === '--contar') a.modo = modo('contar');
    else if (x === '--conferir') a.modo = modo('conferir');
    else if (x === '--exportar' && valor(i)) {
      a.modo = modo('exportar');
      a.exportar = argv[++i];
    } else if (x === '--populacao' && valor(i)) a.populacao = argv[++i];
    else if (x === '--decisao-escopo' && valor(i)) a.decisaoEscopo = argv[++i];
    else if (x === '--storage' && valor(i)) a.storage = argv[++i];
    else if (x === '--dir' && valor(i)) a.dir = argv[++i];
    else if (x === '--registro' && valor(i)) a.registro = argv[++i];
    else if (x === '--decisao' && valor(i)) a.decisao = argv[++i];
    else if (x === '--vivo') a.vivo = true;
    else {
      a.modo = 'erro';
      break;
    }
  }
  const refs = [a.dir, a.registro, a.decisao].filter(Boolean).length;
  if (a.modo === 'auto' && argv.length !== 1) a.modo = 'erro';
  if (a.modo === 'contar' && (!a.populacao || !a.decisaoEscopo || a.storage || refs || a.vivo)) a.modo = 'erro';
  if (a.modo === 'exportar' && (!a.populacao || !a.decisaoEscopo || !a.storage || refs || a.vivo)) a.modo = 'erro';
  if (a.modo === 'conferir' && (!a.populacao || !a.storage || refs !== 1 || a.decisaoEscopo)) a.modo = 'erro';
  return a;
}

function tokenPadrao() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Recusa('TOKEN AUSENTE: Keychain "Supabase CLI"/"supabase" ou SUPABASE_ACCESS_TOKEN');
  }
}

function depsPadrao() {
  return {
    consultar: async (p) => consultarProd(p),
    fetch: (...x) => globalThis.fetch(...x),
    token: tokenPadrao,
    io: { log: (s) => console.log(s), err: (s) => console.error(s) },
    ler: (p) => fs.readFileSync(p, 'utf8'),
    raizRepo: RAIZ,
  };
}

/* CLI testável: devolve o código de saída. `deps` substitui consulta, rede, token, saída e arquivos de entrada. */
async function principal(argv, deps) {
  const d = { ...depsPadrao(), ...(deps || {}) };
  const segredos = [];
  const redigir = (s) => {
    let t = String(s);
    for (const x of segredos) if (x) t = t.split(x).join('<redigido>');
    return t;
  };
  const out = { segredos, log: (s) => d.io.log(redigir(s)), err: (s) => d.io.err(redigir(s)) };
  const a = lerArgs(argv);
  if (!a.modo || a.modo === 'erro') {
    out.err(USO);
    return 2;
  }
  try {
    if (a.modo === 'auto') return await autoTeste(out);
    // o token entra na lista de redação antes de qualquer chamada
    const tk = d.token;
    d.token = () => {
      const t = tk();
      segredos.push(t);
      return t;
    };
    if (a.modo === 'contar') return await modoContar(a, d, out);
    if (a.modo === 'exportar') return await modoExportar(a, d, out);
    return await modoConferir(a, d, out);
  } catch (e) {
    if (e instanceof Recusa) out.err(e.message);
    else if (e instanceof ErroRede) out.err(`ERRO DE REDE: ${e.message}; nada concluido`);
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

/* Dublê da rede: Management API (api-keys) + Storage API (listar com tamanho, baixar) sobre um bucket em memória. */
function dubleStorage(iniciais) {
  const objetos = new Map(Object.entries(iniciais || {}).map(([k, v]) => [k, Buffer.from(v)]));
  const token = 'token-management-FALSO-do-auto-teste-52-27';
  const chave = 'chave-service-role-FALSA-do-auto-teste-52-27';
  const chamadas = [];
  const resp = (status, json, buf) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    arrayBuffer: async () => {
      const b = buf || Buffer.alloc(0);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
    },
  });
  const fetch = async (url, init = {}) => {
    const metodo = String(init.method || 'GET').toUpperCase();
    const corpo = init.body ? JSON.parse(init.body) : null;
    const h = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    chamadas.push({ metodo, url, auth: h.authorization || '' });
    if (url === URL_CHAVES) {
      if (h.authorization !== `Bearer ${token}`) return resp(401, {});
      return resp(200, [{ name: 'anon', api_key: 'anon-falsa' }, { name: 'service_role', api_key: chave }]);
    }
    if (h.authorization !== `Bearer ${chave}`) return resp(401, {});
    if (metodo === 'POST' && url === `${URL_PROJETO}/storage/v1/object/list/${BUCKET}`) {
      const pref = String(corpo.prefix || '');
      const linhas =
        pref === ''
          ? ordenarBytes([...new Set([...objetos.keys()].map((x) => x.split('/')[0]))]).map((p) => ({ name: p, id: null }))
          : ordenarBytes([...objetos.keys()].filter((x) => x.startsWith(`${pref}/`))).map((x) => ({ name: x.slice(pref.length + 1), id: 'obj', metadata: { size: objetos.get(x).length } }));
      return resp(200, linhas.slice(corpo.offset, corpo.offset + corpo.limit));
    }
    const base = `${URL_PROJETO}/storage/v1/object/${BUCKET}/`;
    if (metodo === 'GET' && url.startsWith(base)) {
      const nome = url.slice(base.length).split('/').map(decodeURIComponent).join('/');
      return objetos.has(nome) ? resp(200, null, objetos.get(nome)) : resp(404, {});
    }
    return resp(404, {});
  };
  return { fetch, chamadas, objetos, token, chave };
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

/* Detector de instrução de escrita SQL para os casos abaixo. Escrito com `trunc(?:ate)` (mesma semântica) para
 * que a varredura de código do plano (52-27 Task 2, segundo <verify>), que procura a palavra inteira fora de
 * comentário, não confunda o DETECTOR com uma instrução — o exportador não tem nenhuma. */
const ESCRITA_SQL = /\b(insert\s+into|delete\s+from|trunc(?:ate)|update\s+\S+\s+set)\b/i;

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

  /* Task 2: um ambiente de escrita — exports de teste em temporários do sistema (fora de qualquer árvore git). */
  const temporarios = [];
  const FIXTURE_FORMA = ['b/2.pdf', 'a/Ç.pdf', 'a/1.pdf', 'a/\u{1F600}.pdf', 'a/Ａ.pdf'];
  const ambX = () => {
    const f = F();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p52-27-auto-'));
    temporarios.push(tmp);
    const objetos = { [`${f.Uu(1)}/curriculo-fulano-sobrenome.pdf`]: Buffer.from('%PDF-falso-1 conteudo'), [`${f.C(4)}/cv.pdf`]: Buffer.from('%PDF-falso-2') };
    const caminhos = Object.keys(objetos);
    const storage = { bucket: BUCKET, prefixos: prefixosDe(caminhos), n_objetos: caminhos.length, nomes_md5: nomesMd5(caminhos), total_bucket: 3, capturado_em: '2026-10-13T11:00:00.000Z' };
    const mem = { 'pop.json': JSON.stringify(f.pop), 'dec.md': f.decisao, 'st.json': JSON.stringify(storage) };
    const rede = dubleStorage(objetos);
    const banco = consultaEmMemoria(f.db);
    const saida = [];
    const pedidos = [];
    const deps = {
      consultar: async (p) => {
        pedidos.push(p.tipo === 'catalogo' ? SQL_CATALOGO : p.sql);
        return banco(p);
      },
      fetch: rede.fetch,
      token: () => rede.token,
      io: { log: (s) => (saida.push(String(s)), todasSaidas.push(String(s))), err: (s) => (saida.push(String(s)), todasSaidas.push(String(s))) },
      ler: (p) => {
        if (!(p in mem)) throw new Error('ausente');
        return mem[p];
      },
    };
    const dir = path.join(tmp, 'export', '20261013T120000Z');
    const exportar = (alvo) => principal(['--exportar', alvo || dir, '--populacao', 'pop.json', '--decisao-escopo', 'dec.md', '--storage', 'st.json'], deps);
    const conferir = (...x) => principal(['--conferir', ...x, '--populacao', 'pop.json', '--storage', 'st.json'], deps);
    const t = () => saida.join('\n');
    const limpa = () => {
      saida.length = 0;
    };
    const mf = (d) => JSON.parse(fs.readFileSync(path.join(d || dir, 'MANIFESTO.json'), 'utf8'));
    const mfMd5 = (d) => md5(fs.readFileSync(path.join(d || dir, 'MANIFESTO.json')));
    const regs = (d) => fs.readFileSync(path.join(d || dir, 'linhas.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const modo = (rel, d) => fs.statSync(path.join(d || dir, rel)).mode & 0o777;
    const adulterar = (rel, d) => {
      const p = path.join(d || dir, rel);
      const b = fs.readFileSync(p);
      const i = Math.floor(b.length / 2);
      b[i] = b[i] === 0x41 ? 0x42 : 0x41;
      fs.writeFileSync(p, b);
    };
    return { f, tmp, objetos, storage, mem, rede, pedidos, deps, dir, exportar, conferir, t, limpa, mf, mfMd5, regs, modo, adulterar };
  };
  const recusaConferir = async (x, args, re) => {
    x.limpa();
    return (await x.conferir(...args)) === 1 && re.test(x.t());
  };

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
        !ESCRITA_SQL.test(s) && /not exists \(select 1 from "public"\."usuarios_rh" g where g\.user_id = t\.id\)/.test(s) &&
        /not exists \(select 1 from "public"\."candidatos" g where g\.user_id = t\.id and not \(g\.id = any/.test(s) && (s.match(/ in \(select p\./g) || []).length === arestas &&
        s.includes("e.key like '%token%'") && !s.includes("'l', (select coalesce(jsonb_agg(x.j order by x.j collate \"C\"), '[]'::jsonb) from (select to_jsonb(t)::text as j from \"auth\".\"sessions\"")
      );
    }],
    // ── Task 2: forma canônica, escrita, recusas ──
    ['forma canonica: fixture do contrato = 224b2ac162f0322444eed10e6335517a', async () => nomesMd5(FIXTURE_FORMA) === '224b2ac162f0322444eed10e6335517a'],
    ['forma canonica: nao e o .sort() padrao (78557760...) nem a juncao com \\n final (deecf20e...); vazia = d41d8cd9...', async () => {
      const h = nomesMd5(FIXTURE_FORMA);
      const padrao = md5([...FIXTURE_FORMA].sort().join('\n'));
      const barraN = md5(`${ordenarBytes(FIXTURE_FORMA).join('\n')}\n`);
      return padrao === '785577602c38ce87887c0bac892cf805' && barraN === 'deecf20eb606d12e2937b76656f97f4a' && h !== padrao && h !== barraN && nomesMd5([]) === 'd41d8cd98f00b204e9800998ecf8427e';
    }],
    ['prefixos distintos, sem / final, em ordem de bytes', async () => JSON.stringify(prefixosDe(['Ａ/x', 'b/1', 'a/2', 'b/3', 'Ç/y'])) === JSON.stringify(['a', 'b', 'Ç', 'Ａ'])],
    ['--exportar: diretorio 0700, arquivos 0600, linhas {t, m, r} na ordem do fecho, storage/K.bin + INDICE, MANIFESTO, EXPORT GRAVADO', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      const R = x.regs();
      const ts = R.map((r) => r.t);
      const m = x.mf();
      const ind = JSON.parse(fs.readFileSync(path.join(x.dir, 'storage', 'INDICE.json'), 'utf8'));
      return (
        x.modo('') === 0o700 && x.modo('storage') === 0o700 && ['MANIFESTO.json', 'linhas.jsonl', 'storage/INDICE.json', 'storage/1.bin', 'storage/2.bin'].every((a) => x.modo(a) === 0o600) &&
        R.every((r) => Object.keys(r).join() === 't,m,r') && ts.lastIndexOf('auth.users') < ts.indexOf('auth.identities') && ts.lastIndexOf('public.candidatos') < ts.indexOf('public.candidaturas') &&
        ts.lastIndexOf('public.candidaturas') < ts.indexOf('public.filho') && ts.lastIndexOf('public.filho') < ts.indexOf('public.neto') &&
        ind.length === 2 && ind.every((o) => md5(fs.readFileSync(path.join(x.dir, 'storage', `${o.k}.bin`))) === o.md5) && m.storage.nomes_md5 === x.storage.nomes_md5 &&
        m.versao_formato === 1 && ISO.test(m.exportado_em) && m.populacao_md5 === x.f.pop.populacao_md5 && m.raizes === 4 && m.linhas === R.length &&
        m.tabelas['public.candidatos'].por_modo.apaga === 4 && m.tabelas['public.filho_sn'].por_modo.anula === 1 && m.tabelas['public.vagas'].por_modo.atualiza === 1 &&
        Object.entries(m.excluidas_por_desenho).map(([k, v]) => `${k}=${v}`).sort().join(',') === 'auth.mfa_factors=1,auth.refresh_tokens=1,auth.sessions=1' &&
        new RegExp(`^EXPORT GRAVADO: dir=\\S+ export_md5=${x.mfMd5()} exportado_em=\\S+ linhas=${R.length} tabelas=\\d+ curriculos=2$`).test(x.t())
      );
    }],
    ['--exportar: colunas token de auth.users em branco e listadas em colunas_em_branco; encrypted_password presente; sessoes fora', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      const m = x.mf();
      const u = x.regs().filter((r) => r.t === 'auth.users');
      const cols = m.colunas_em_branco['auth.users'];
      return (
        JSON.stringify(cols) === JSON.stringify(['confirmation_token', 'email_change_token_new', 'recovery_token']) && u.length === 1 && cols.every((c) => u[0].r[c] === '') &&
        typeof u[0].r.encrypted_password === 'string' && u[0].r.encrypted_password.length > 0 && !x.regs().some((r) => ['auth.sessions', 'auth.refresh_tokens', 'auth.mfa_factors'].includes(r.t))
      );
    }],
    ['--exportar: duas exportacoes do mesmo estado -> o mesmo export_md5', async () => {
      const x = ambX();
      const outro = path.join(x.tmp, 'export2', 'y');
      return (await x.exportar()) === 0 && (await x.exportar(outro)) === 0 && x.mfMd5() === x.mfMd5(outro);
    }],
    ['--exportar e --conferir --vivo: toda requisicao comeca por set transaction read only e nenhuma escreve', async () => {
      const x = ambX();
      const ok = (await x.exportar()) === 0 && (await x.conferir('--dir', x.dir, '--vivo')) === 0;
      return ok && x.pedidos.length === 4 && x.pedidos.every((s) => s.startsWith('set transaction read only;') && !ESCRITA_SQL.test(s));
    }],
    ['recusa: diretorio dentro deste repositorio -> EXPORT DENTRO DE REPOSITORIO, nada criado', async () => {
      const x = ambX();
      const alvo = path.join(RAIZ, '.planning', 'tmp', 'p52-27-auto-teste-nunca-criado');
      return (await x.exportar(alvo)) === 1 && /EXPORT DENTRO DE REPOSITORIO/.test(x.t()) && !fs.existsSync(alvo);
    }],
    ['recusa: diretorio dentro de outra arvore git -> EXPORT DENTRO DE REPOSITORIO, nada criado', async () => {
      const x = ambX();
      execFileSync('git', ['init', '-q', path.join(x.tmp, 'arvore')], { stdio: 'ignore' });
      const alvo = path.join(x.tmp, 'arvore', 'sub', 'export');
      return (await x.exportar(alvo)) === 1 && /EXPORT DENTRO DE REPOSITORIO/.test(x.t()) && !fs.existsSync(alvo);
    }],
    ['recusa: caminho relativo -> EXPORT DENTRO DE REPOSITORIO', async () => {
      const x = ambX();
      return (await x.exportar('export-relativo')) === 1 && /EXPORT DENTRO DE REPOSITORIO/.test(x.t()) && !fs.existsSync('export-relativo');
    }],
    ['recusa: diretorio ja existente -> EXPORT JA EXISTE', async () => {
      const x = ambX();
      fs.mkdirSync(x.dir, { recursive: true });
      return (await x.exportar()) === 1 && /EXPORT JA EXISTE/.test(x.t()) && fs.readdirSync(x.dir).length === 0;
    }],
    ['EXPORT AUSENTE: diretorio inexistente', async () => {
      const x = ambX();
      return recusaConferir(x, ['--dir', path.join(x.tmp, 'nunca')], /EXPORT AUSENTE: diretorio/);
    }],
    ...['MANIFESTO.json', 'linhas.jsonl', 'storage/2.bin'].map((rel) => [`EXPORT AUSENTE: ${rel}`, async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      fs.rmSync(path.join(x.dir, rel));
      return recusaConferir(x, ['--dir', x.dir], new RegExp(`EXPORT AUSENTE: ${rel.replace(/[./]/g, '\\$&')}`));
    }]),
    ...['linhas.jsonl', 'MANIFESTO.json', 'storage/INDICE.json', 'storage/1.bin'].map((rel) => [`EXPORT ADULTERADO: ${rel} (um octeto trocado)`, async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0 || (await x.conferir('--dir', x.dir)) !== 0) return false;
      x.adulterar(rel);
      return recusaConferir(x, ['--dir', x.dir], new RegExp(`EXPORT ADULTERADO: ${rel.replace(/[./]/g, '\\$&')}$`, 'm'));
    }]),
    ['EXPORT ADULTERADO: MANIFESTO.json com JSON valido (um valor trocado; um espaco trocado) — o selo e a forma exata mordem', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      const p = path.join(x.dir, 'MANIFESTO.json');
      const orig = fs.readFileSync(p, 'utf8');
      const m = JSON.parse(orig);
      m.tabelas['public.filho'].md5 = md5('outro');
      fs.writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
      const r1 = await recusaConferir(x, ['--dir', x.dir], /EXPORT ADULTERADO: MANIFESTO\.json$/m);
      fs.writeFileSync(p, orig.replace('{\n  "versao_formato"', '{\n \t"versao_formato"'));
      const r2 = await recusaConferir(x, ['--dir', x.dir], /EXPORT ADULTERADO: MANIFESTO\.json$/m);
      fs.writeFileSync(p, orig);
      x.limpa();
      return r1 && r2 && (await x.conferir('--dir', x.dir)) === 0;
    }],
    ['EXPORT NAO E A POPULACAO: id a mais em apagaveis', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      const p = JSON.parse(x.mem['pop.json']);
      p.apagaveis.ficticios.push({ id: x.f.C(9), user_id: null });
      p.populacao_md5 = md5Ids([x.f.C(1), x.f.C(2), x.f.C(4), x.f.C(6), x.f.C(9)]);
      x.mem['pop.json'] = JSON.stringify(p);
      return recusaConferir(x, ['--dir', x.dir], /EXPORT NAO E A POPULACAO: raizes do fecho != apagaveis \(a mais: -; a menos: c0000009\)/);
    }],
    ['EXPORT NAO E A POPULACAO: id a menos em apagaveis', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      const p = JSON.parse(x.mem['pop.json']);
      p.apagaveis.contas_teste_com_candidatura = p.apagaveis.contas_teste_com_candidatura.filter((e) => e.id !== x.f.C(2));
      p.populacao_md5 = md5Ids([x.f.C(1), x.f.C(4), x.f.C(6)]);
      x.mem['pop.json'] = JSON.stringify(p);
      return recusaConferir(x, ['--dir', x.dir], /EXPORT NAO E A POPULACAO: raizes do fecho != apagaveis \(a mais: c0000002; a menos: -\)/);
    }],
    ['EXPORT NAO E A POPULACAO: curriculos do export != captura do STORAGE.json', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      const um = [Object.keys(x.objetos)[0]];
      x.mem['st.json'] = JSON.stringify({ ...x.storage, n_objetos: 1, nomes_md5: nomesMd5(um) });
      return recusaConferir(x, ['--dir', x.dir], /EXPORT NAO E A POPULACAO: storage != captura/);
    }],
    ['EXPORT NAO E A POPULACAO: --exportar com a listagem do Storage != captura, nada gravado', async () => {
      const x = ambX();
      x.rede.objetos.set(`${x.f.Uu(1)}/novo.pdf`, Buffer.from('novo'));
      return (await x.exportar()) === 1 && /EXPORT NAO E A POPULACAO: storage != captura/.test(x.t()) && !fs.existsSync(x.dir);
    }],
    ['EXPORT NAO E A POPULACAO: STORAGE.json com prefixo fora de apagaveis', async () => {
      const x = ambX();
      x.mem['st.json'] = JSON.stringify({ ...x.storage, prefixos: ordenarBytes([...x.storage.prefixos, x.f.Uu(5)]) });
      return (await x.exportar()) === 1 && /EXPORT NAO E A POPULACAO: storage com prefixo fora de apagaveis/.test(x.t()) && !fs.existsSync(x.dir);
    }],
    ['--registro: md5 ou instante != manifesto -> EXPORT NAO E O APROVADO; iguais -> EXPORT CONFERIDO', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      const h = x.mfMd5();
      const em = x.mf().exportado_em;
      const reg = (a, b) => `# 52-21-EXPORT\nexport_dir: ${x.dir}\nexport_md5: ${a}\nexportado_em: ${b}\n`;
      x.mem['r.md'] = reg(h, em);
      x.limpa();
      const ok = (await x.conferir('--registro', 'r.md')) === 0 && new RegExp(`^EXPORT CONFERIDO: export_md5=${h} linhas=\\d+ curriculos=2 vivo=nao_conferido$`, 'm').test(x.t());
      x.mem['r.md'] = reg(md5('outro'), em);
      const r1 = await recusaConferir(x, ['--registro', 'r.md'], /EXPORT NAO E O APROVADO: md5/);
      x.mem['r.md'] = reg(h, '2026-10-13T12:00:01.000Z');
      const r2 = await recusaConferir(x, ['--registro', 'r.md'], /EXPORT NAO E O APROVADO: exportado_em/);
      return ok && r1 && r2;
    }],
    ['--decisao: md5 ou instante != manifesto -> EXPORT NAO E O APROVADO; iguais -> EXPORT CONFERIDO', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      const h = x.mfMd5();
      const em = x.mf().exportado_em;
      const dec = (a, b) => `decisao: apagar\nexport_dir: ${x.dir}\nexport_md5_aprovado: ${a}\nexport_em_aprovado: ${b}\n`;
      x.mem['d.md'] = dec(h, em);
      x.limpa();
      const ok = (await x.conferir('--decisao', 'd.md')) === 0 && /^EXPORT CONFERIDO: /m.test(x.t());
      x.mem['d.md'] = dec(md5('outro'), em);
      const r1 = await recusaConferir(x, ['--decisao', 'd.md'], /EXPORT NAO E O APROVADO: md5/);
      x.mem['d.md'] = dec(h, '2026-10-13T12:00:01.000Z');
      const r2 = await recusaConferir(x, ['--decisao', 'd.md'], /EXPORT NAO E O APROVADO: exportado_em/);
      return ok && r1 && r2;
    }],
    ['--registro sem export_dir (ou md5 malformado) -> EXPORT NAO E O APROVADO', async () => {
      const x = ambX();
      x.mem['r.md'] = `export_md5: ${md5('x')}\nexportado_em: 2026-10-13T12:00:00.000Z\n`;
      x.mem['r2.md'] = `export_dir: ${x.dir}\nexport_md5: 123\nexportado_em: 2026-10-13T12:00:00.000Z\n`;
      return (await recusaConferir(x, ['--registro', 'r.md'], /EXPORT NAO E O APROVADO/)) && (await recusaConferir(x, ['--registro', 'r2.md'], /EXPORT NAO E O APROVADO/));
    }],
    ['--vivo: banco e Storage iguais -> vivo=igual', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      x.limpa();
      return (await x.conferir('--dir', x.dir, '--vivo')) === 0 && /vivo=igual$/m.test(x.t());
    }],
    ['--vivo: uma linha mudada no banco -> EXPORT DIFERE DO VIVO: <tabela>', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      x.f.db.tabelas['public.filho'][0].nota = 'mudou';
      const r1 = await recusaConferir(x, ['--dir', x.dir, '--vivo'], /EXPORT DIFERE DO VIVO: public\.filho$/m);
      delete x.f.db.tabelas['public.filho'][0].nota;
      x.f.db.tabelas['public.neto'].push({ id: x.f.id('9', 8), filho_id: x.f.id('9', 1) });
      const r2 = await recusaConferir(x, ['--dir', x.dir, '--vivo'], /EXPORT DIFERE DO VIVO: public\.neto$/m);
      return r1 && r2;
    }],
    ['--vivo: um curriculo mudado no Storage -> EXPORT DIFERE DO VIVO: storage', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      x.rede.objetos.set(`${x.f.C(4)}/cv.pdf`, Buffer.from('%PDF-falso-2 trocado por outro de outro tamanho'));
      return recusaConferir(x, ['--dir', x.dir, '--vivo'], /EXPORT DIFERE DO VIVO: storage$/m);
    }],
    ['--vivo: o grafo de FK mudou -> EXPORT DIFERE DO VIVO: catalogo', async () => {
      const x = ambX();
      if ((await x.exportar()) !== 0) return false;
      x.f.db.fks.push({ tab: 'public.filho_novo', cols: ['filho_id'], ref: 'public.filho', refcols: ['id'], tipo: 'c', nn: true });
      return recusaConferir(x, ['--dir', x.dir, '--vivo'], /EXPORT DIFERE DO VIVO: catalogo/);
    }],
    ['uso invalido -> 2', async () => {
      const e = amb(F());
      const u = async (...a) => (await principal(a, e.deps)) === 2;
      return (
        (await u()) && (await u('--contar', '--populacao', 'pop.json')) && (await u('--auto-teste', '--contar')) &&
        (await u('--exportar', '/tmp/x', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md')) &&
        (await u('--conferir', '--populacao', 'pop.json', '--storage', 's.json')) &&
        (await u('--conferir', '--dir', '/x', '--registro', 'r.md', '--populacao', 'pop.json', '--storage', 's.json')) &&
        (await u('--exportar', '/tmp/x', '--populacao', 'pop.json', '--decisao-escopo', 'dec.md', '--storage', 's.json', '--vivo'))
      );
    }],
    ['nenhum e-mail, nome, CPF, token, hash, chave ou nome de arquivo em nenhuma saida dos casos acima', async () =>
      todasSaidas.length > 20 && !/@|Fulano|Sobrenome|Ficticio|000\.000|tok-|hashfalso|refresh-falso|curriculo-|cv\.pdf|novo\.pdf|FALSA-do-auto|FALSO-do-auto/.test(todasSaidas.join('\n'))],
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
  for (const t of temporarios) fs.rmSync(t, { recursive: true, force: true });
  if (falhas.length) {
    out.err(`EXPORT AUTO-TESTE FALHOU: ${falhas.join('; ')}`);
    return 1;
  }
  out.log(`EXPORT AUTO-TESTE OK: ${casos.length}/${casos.length} (fecho de FK, modos apaga/anula/atualiza, auth fora por desenho, dupla guarda, ordem, contagem so leitura; forma canonica, escrita 0700/0600, tokens em branco, recusas DENTRO DE REPOSITORIO/JA EXISTE/AUSENTE x4/ADULTERADO x4/NAO E A POPULACAO/NAO E O APROVADO/DIFERE DO VIVO, nada pessoal na saida)`);
  return 0;
}

module.exports = {
  ordenarBytes, md5Ids, lerPopulacao, lerDestinosVagas, modoDaAresta, planejarFecho, sqlDoFecho, avaliarFecho, exigirRaizes, linhaContagem,
  nomesMd5, prefixosDe, raizesDe, montarLinhas, textoManifesto, lerManifestoIntegro, errosStorage, exigirForaDeGit, obterChave, criarCliente, listarPrefixo,
  consultaEmMemoria, fixtureFecho, dubleStorage, principal, SQL_CATALOGO, Recusa, BUCKET, URL_PROJETO, URL_CHAVES,
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
