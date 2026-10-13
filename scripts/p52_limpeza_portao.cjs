#!/usr/bin/env node
'use strict';
/*
 * p52_limpeza_portao.cjs — portão da limpeza dos dados de teste (Phase 52, bloco D; plano 52-19 Task 1).
 *
 * D-30 (com a emenda «por conta, qualquer status» e a trava «só candidatos»), D-32, JORN-63.
 * Nada aqui escreve em PROD: a única leitura é `node p46apply.cjs sql "<SQL_VARREDURA>"`, e o
 * `SQL_VARREDURA` COMEÇA por `set transaction read only;`. É a MESMA query que o comando do apply
 * (52-21) usa para re-medir — o dry-run é pela mesma query.
 *
 * A POPULAÇÃO é POR CONTA, com DUAS entradas:
 *   (i)  contas de `candidatos` cujo e-mail (em minúsculas) casa algum padrão de teste — a lista da
 *        D-30 POR INTEIRO (`PADROES_D30`: +claudeN, +cand1, @teste.com, @invalido.local —
 *        `52-18-DECISAO-OPERADOR.md` item 3, mantida em `52-DECISAO-2026-10-11-gaps-e-pitr.md` item 5),
 *        MAIS a semente do `p47_teardown_dados_de_teste.sql` (:87-98) MENOS o padrão do candidato do
 *        admin (`fernando@beautysmile.com.br` — a trava já o cobre), mais os padrões medidos na UAT
 *        da 52 (nenhum novo: a conta nova da UAT, +claude8, casa `+claude%`), em qualquer vaga;
 *   (ii) TODA candidatura em vaga de teste (`titulo ILIKE '%[TESTE%'` ou `slug ILIKE 'teste-%'`, qualquer
 *        `status` e `deleted_at`), seja qual for a conta.
 *   TRAVA (operador): todo `candidatos.user_id` presente em `usuarios_rh` é excluído das DUAS entradas,
 *   por anti-join `NOT EXISTS` — NUNCA `NOT IN` (um `user_id` nulo em `usuarios_rh` esvaziaria o
 *   resultado e o portão veria «0»).
 *
 * CATEGORIAS. A PARTIÇÃO de `candidatos` (`particao_candidatos`, cada linha em exatamente uma, por
 * precedência — a soma TEM de fechar com `examinados_total`, nada some do relatório):
 *   trava_rh_excluidos → fixtures_p46 → ficticios → tombstones → contas_teste_com_candidatura →
 *   contas_sem_candidatura → fora_da_populacao
 * e, fora da partição, os `auth.users` órfãos (sem `candidatos` nem `usuarios_rh`) em duas:
 *   auth_orfaos_padrao_teste (o e-mail casa um padrão) e auth_orfaos_sem_padrao.
 * `trava_rh_excluidos` e `fora_da_populacao` NUNCA são apagáveis (`--decisao` recusa).
 *
 * FIXTURES `fixture-p46-*`: casam `%@invalido.local` (estão na entrada (i)), mas têm teardown próprio
 * no fecho do M8 (`p46_teardown_fixture.sql`). Ficam na categoria `fixtures_p46`, com a impressão digital
 * `fixtures_md5`, e FORA de «possível dado real» (o `created_at` delas é recuado de propósito — são a
 * data-âncora da purga). Fronteira mostrada, não decidida.
 *
 * POSSÍVEL DADO REAL (decisão explícita por item): candidatura da população (fora das fixtures) com
 * `created_at` até 26/04/2026 (BRT), ou conta `@beautysmile.com.br`/`@beautysmile.com` sem «+» no e-mail
 * (candidato da população ou `auth.users` órfão).
 *
 * PRIVACIDADE: o SQL não projeta e-mail, nome nem CPF — só ids, categorias, contagens, md5 e, onde
 * dito, o DOMÍNIO do e-mail. Nada disso sai do script em outra forma.
 *
 * Uso:
 *   node scripts/p52_limpeza_portao.cjs --auto-teste
 *   node scripts/p52_limpeza_portao.cjs medir <saida.json> [--decisao <52-19-DECISAO-ESCOPO.md>] [--pos]
 *   node scripts/p52_limpeza_portao.cjs comparar <agora.json> <decisao.md> <populacao.json>
 * Saída: 0 ok · 1 recusa · 2 uso.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const SMOKE_REL = 'supabase/tests/p52_populacao_limpeza.sql';

/* A lista da D-30 POR INTEIRO (operador). Cada elemento TEM de aparecer literal no SQL_VARREDURA
 * (conferido pelo --auto-teste). */
const PADROES_D30 = [
  'fernandinho.costa.neto+claude%@gmail.com', // +claudeN
  'fernandinho.costa.neto+cand1@gmail.com', // +cand1
  '%@teste.com',
  '%@invalido.local',
];

/* Semente do p47 (:87-98) MENOS 'fernando@beautysmile.com.br' (o candidato do admin: a trava cobre). */
const SEMENTE_P47 = [
  '%@teste.com',
  'test+%@beautysmile.com.br',
  'uat-form-%@beautysmile.com.br',
  'fernandinho.costa.neto+claude%@gmail.com',
  'fernandinho.costa.neto+cand%@gmail.com',
  'fernando@fotona.com.br',
  'paulista@beautysmile.com.br',
  '%.teste@invalido.local',
  'anonimizado+%@invalido.local',
];

/* ESCOPO deliberado (não fotografia): candidaturas que o operador nomeou como de teste e que TÊM de
 * estar na população. A 3a9254c3 é da conta +claude6 (aceite do 51-17), que o review do bloco C não
 * reconheceu como teste (`52-18-DECISAO-OPERADOR.md`). Copiada no smoke52d, com comentário. */
const OBRIGATORIAS_NA_POPULACAO = ['3a9254c3-8086-42df-8d81-42889c3a1f8d'];

const PARTICAO = [
  'trava_rh_excluidos',
  'fixtures_p46',
  'ficticios',
  'tombstones',
  'contas_teste_com_candidatura',
  'contas_sem_candidatura',
  'fora_da_populacao',
];
const NUNCA_APAGAVEIS = ['trava_rh_excluidos', 'fora_da_populacao'];

/* A query canônica. Literal (sem interpolação) para que a conferência «cada padrão da D-30 aparece
 * no SQL» seja sobre o texto que roda. Uma linha de resultado, coluna `r` (jsonb). */
const SQL_VARREDURA = `set transaction read only;
with
rh as (select r.user_id from public.usuarios_rh r),
padroes(p) as (values
  -- D-30 por inteiro (PADROES_D30)
  ('fernandinho.costa.neto+claude%@gmail.com'), ('fernandinho.costa.neto+cand1@gmail.com'), ('%@teste.com'), ('%@invalido.local'),
  -- semente do p47 menos o candidato do admin (SEMENTE_P47)
  ('test+%@beautysmile.com.br'), ('uat-form-%@beautysmile.com.br'), ('fernandinho.costa.neto+cand%@gmail.com'),
  ('fernando@fotona.com.br'), ('paulista@beautysmile.com.br'), ('%.teste@invalido.local'), ('anonimizado+%@invalido.local')
),
ob(id) as (values ('3a9254c3-8086-42df-8d81-42889c3a1f8d'::uuid)),
eh_rh as (select c.id from public.candidatos c where exists (select 1 from rh where rh.user_id = c.user_id)),
cand_i as (
  select c.id from public.candidatos c
   where exists (select 1 from padroes where lower(c.email) like padroes.p)
     and not exists (select 1 from rh where rh.user_id = c.user_id)),
vaga_teste as (
  select v.id, v.slug, v.status::text as status, v.deleted_at from public.vagas v
   where v.titulo ilike '%[TESTE%' or v.slug ilike 'teste-%'),
cand_ii as (
  select distinct k.candidato_id as id from public.candidaturas k join vaga_teste t on t.id = k.vaga_id
   where not exists (select 1 from public.candidatos c join rh on rh.user_id = c.user_id where c.id = k.candidato_id)),
pop as (select id from cand_i union select id from cand_ii),
cls as (
  select c.id, c.user_id,
    case
      when exists (select 1 from rh where rh.user_id = c.user_id) then 'trava_rh_excluidos'
      when lower(c.email) like 'fixture-p46+%@invalido.local' then 'fixtures_p46'
      when lower(c.email) like '%.teste@invalido.local' and c.user_id is null then 'ficticios'
      when c.email = 'anonimizado+' || c.id::text || '@invalido.local' and c.user_id is null and c.data_nascimento = date '1900-01-01' then 'tombstones'
      when exists (select 1 from pop where pop.id = c.id) and exists (select 1 from public.candidaturas k where k.candidato_id = c.id) then 'contas_teste_com_candidatura'
      when exists (select 1 from pop where pop.id = c.id) then 'contas_sem_candidatura'
      else 'fora_da_populacao'
    end as cat
  from public.candidatos c),
orf as (
  select u.id,
    case when exists (select 1 from padroes where lower(u.email) like padroes.p) then 'auth_orfaos_padrao_teste' else 'auth_orfaos_sem_padrao' end as cat,
    coalesce(split_part(lower(u.email), '@', 2), '') as dominio,
    (u.email is not null and position('+' in split_part(u.email, '@', 1)) = 0) as sem_mais
  from auth.users u
  where not exists (select 1 from public.candidatos c where c.user_id = u.id)
    and not exists (select 1 from rh where rh.user_id = u.id)),
itens as (
  select cls.cat, cls.id, cls.user_id from cls
  union all
  select orf.cat, orf.id, orf.id from orf),
nomes(cat) as (values ('trava_rh_excluidos'), ('fixtures_p46'), ('ficticios'), ('tombstones'), ('contas_teste_com_candidatura'),
  ('contas_sem_candidatura'), ('fora_da_populacao'), ('auth_orfaos_padrao_teste'), ('auth_orfaos_sem_padrao')),
pr as (
  select k.id, 'candidatura'::text as tipo, 'candidatura_ate_2026-04-26'::text as motivo
    from public.candidaturas k join pop on pop.id = k.candidato_id join cls on cls.id = k.candidato_id
   where cls.cat <> 'fixtures_p46' and k.created_at < timestamptz '2026-04-27 00:00:00-03'
  union all
  select c.id, 'candidato', 'conta_beautysmile_sem_mais'
    from public.candidatos c join pop on pop.id = c.id join cls on cls.id = c.id
   where cls.cat <> 'fixtures_p46'
     and split_part(lower(c.email), '@', 2) in ('beautysmile.com.br', 'beautysmile.com')
     and position('+' in split_part(c.email, '@', 1)) = 0
  union all
  select orf.id, 'auth_orfao', 'conta_beautysmile_sem_mais' from orf
   where orf.dominio in ('beautysmile.com.br', 'beautysmile.com') and orf.sem_mais),
fix_ids as (
  select 'c:' || c.id::text as x from public.candidatos c where lower(c.email) like 'fixture-p46+%@invalido.local'
  union all
  select 'k:' || k.id::text from public.candidaturas k join public.candidatos c on c.id = k.candidato_id
   where lower(c.email) like 'fixture-p46+%@invalido.local'
  union all
  select 'v:' || v.id::text from public.vagas v where v.titulo ilike 'fixture-p46%'),
kpop as (
  select k.id from public.candidaturas k join cls on cls.id = k.candidato_id
   where exists (select 1 from pop where pop.id = k.candidato_id) and cls.cat <> 'fixtures_p46'),
obr as (
  select ob.id, (k.id is not null) as existe,
    exists (select 1 from cand_i where cand_i.id = k.candidato_id) as em_i,
    exists (select 1 from cand_ii where cand_ii.id = k.candidato_id) as em_ii,
    exists (select 1 from eh_rh where eh_rh.id = k.candidato_id) as rh
  from ob left join public.candidaturas k on k.id = ob.id)
select jsonb_build_object(
  'examinados_total', (select count(*) from public.candidatos),
  'entrada_i', (select count(*) from cand_i),
  'entrada_ii', (select count(*) from cand_ii),
  'i_e_ii', (select count(*) from cand_i where exists (select 1 from cand_ii where cand_ii.id = cand_i.id)),
  'i_menos_ii', (select count(*) from cand_i where not exists (select 1 from cand_ii where cand_ii.id = cand_i.id)),
  'ii_menos_i', (select count(*) from cand_ii where not exists (select 1 from cand_i where cand_i.id = cand_ii.id)),
  'ii_menos_i_ids8', (select coalesce(jsonb_agg(left(cand_ii.id::text, 8) order by cand_ii.id::text collate "C"), '[]'::jsonb) from cand_ii
                       where not exists (select 1 from cand_i where cand_i.id = cand_ii.id)),
  'populacao_contas', (select count(*) from pop),
  'excluidos_rh', (select count(*) from eh_rh),
  'rh_com_candidato', (select count(distinct c.id) from public.candidatos c join rh on rh.user_id = c.user_id),
  'usuarios_rh_total', (select count(*) from public.usuarios_rh),
  'usuarios_rh_user_id_nulo', (select count(*) from public.usuarios_rh r where r.user_id is null),
  'candidaturas_excluidas_rh', (select count(*) from public.candidaturas k join eh_rh on eh_rh.id = k.candidato_id),
  'candidaturas_total', (select count(*) from public.candidaturas),
  'candidaturas_populacao', jsonb_build_object('n', (select count(*) from kpop),
     'md5', (select md5(coalesce(string_agg(kpop.id::text, ',' order by kpop.id::text collate "C"), '')) from kpop)),
  'categorias', (select jsonb_object_agg(nomes.cat, jsonb_build_object(
      'n', (select count(*) from itens where itens.cat = nomes.cat),
      'md5', (select md5(coalesce(string_agg(itens.id::text, ',' order by itens.id::text collate "C"), '')) from itens where itens.cat = nomes.cat),
      'itens', (select coalesce(jsonb_agg(jsonb_build_object('id', itens.id, 'user_id', itens.user_id,
                   'k', (select coalesce(jsonb_agg(k.id order by k.id::text collate "C"), '[]'::jsonb) from public.candidaturas k where k.candidato_id = itens.id))
                 order by itens.id::text collate "C"), '[]'::jsonb) from itens where itens.cat = nomes.cat)))
    from nomes),
  'vagas_teste', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'slug', t.slug, 'status', t.status, 'deleted_at', t.deleted_at,
      'candidaturas_populacao', (select count(*) from public.candidaturas k where k.vaga_id = t.id and exists (select 1 from pop where pop.id = k.candidato_id)),
      'candidaturas_excluidas', (select count(*) from public.candidaturas k where k.vaga_id = t.id and exists (select 1 from eh_rh where eh_rh.id = k.candidato_id)),
      'candidaturas_total', (select count(*) from public.candidaturas k where k.vaga_id = t.id))
    order by t.id::text collate "C"), '[]'::jsonb) from vaga_teste t),
  'n_vagas_teste', (select count(*) from vaga_teste),
  'n_colisoes', (select count(*) from vaga_teste t where exists (select 1 from public.candidaturas k join eh_rh on eh_rh.id = k.candidato_id where k.vaga_id = t.id)),
  'vagas_fora_do_padrao_nao_ativas', (select coalesce(jsonb_agg(jsonb_build_object('id8', left(v.id::text, 8), 'slug', v.slug, 'status', v.status::text,
      'deleted_at', v.deleted_at, 'fixture', v.titulo ilike 'fixture-p46%') order by v.id::text collate "C"), '[]'::jsonb)
    from public.vagas v where not (v.titulo ilike '%[TESTE%' or v.slug ilike 'teste-%') and (v.status::text <> 'ativa' or v.deleted_at is not null)),
  'vagas_ativas', (select coalesce(jsonb_agg(jsonb_build_object('id8', left(v.id::text, 8), 'slug', v.slug,
      'teste', (v.titulo ilike '%[TESTE%' or v.slug ilike 'teste-%'),
      'candidaturas_populacao', (select count(*) from public.candidaturas k where k.vaga_id = v.id and exists (select 1 from pop where pop.id = k.candidato_id)),
      'candidaturas_excluidas', (select count(*) from public.candidaturas k where k.vaga_id = v.id and exists (select 1 from eh_rh where eh_rh.id = k.candidato_id)),
      'candidaturas_total', (select count(*) from public.candidaturas k where k.vaga_id = v.id)) order by v.id::text collate "C"), '[]'::jsonb)
    from public.vagas v where v.status::text = 'ativa' and v.deleted_at is null),
  'possivel_real', (select coalesce(jsonb_agg(jsonb_build_object('id', pr.id, 'tipo', pr.tipo, 'motivo', pr.motivo) order by pr.id::text collate "C"), '[]'::jsonb) from pr),
  'n_possivel_real', (select count(*) from pr),
  'fora_ativas', (select coalesce(jsonb_agg(jsonb_build_object('id8', left(k.id::text, 8), 'created_at', k.created_at,
      'dominio', split_part(lower(c.email), '@', 2)) order by k.id::text collate "C"), '[]'::jsonb)
    from public.candidaturas k join public.vagas v on v.id = k.vaga_id join public.candidatos c on c.id = k.candidato_id
   where v.status::text = 'ativa' and v.deleted_at is null and not exists (select 1 from pop where pop.id = k.candidato_id)),
  'fixtures', jsonb_build_object(
      'candidatos', (select count(*) from public.candidatos c where lower(c.email) like 'fixture-p46+%@invalido.local'),
      'candidaturas', (select count(*) from fix_ids where x like 'k:%'),
      'vagas', (select count(*) from fix_ids where x like 'v:%'),
      'em_vaga_de_teste', (select count(*) from public.candidaturas k join public.candidatos c on c.id = k.candidato_id join vaga_teste t on t.id = k.vaga_id
                             where lower(c.email) like 'fixture-p46+%@invalido.local'),
      'vagas_casam_teste', (select count(*) from public.vagas v where v.titulo ilike 'fixture-p46%' and (v.titulo ilike '%[TESTE%' or v.slug ilike 'teste-%')),
      'candidaturas_de_outros_em_vaga_fixture', (select count(*) from public.candidaturas k join public.vagas v on v.id = k.vaga_id join public.candidatos c on c.id = k.candidato_id
                             where v.titulo ilike 'fixture-p46%' and lower(c.email) not like 'fixture-p46+%@invalido.local'),
      'na_entrada_i', (select count(*) from cand_i join public.candidatos c on c.id = cand_i.id where lower(c.email) like 'fixture-p46+%@invalido.local')),
  'fixtures_md5', (select md5(coalesce(string_agg(x, ',' order by x collate "C"), '')) from fix_ids),
  'tombstones_onde', (select coalesce(jsonb_agg(jsonb_build_object('id8', left(c.id::text, 8),
      'candidaturas', (select coalesce(jsonb_agg(jsonb_build_object('id8', left(k.id::text, 8), 'vaga8', left(k.vaga_id::text, 8),
          'vaga_teste', exists (select 1 from vaga_teste t where t.id = k.vaga_id)) order by k.id::text collate "C"), '[]'::jsonb)
        from public.candidaturas k where k.candidato_id = c.id)) order by c.id::text collate "C"), '[]'::jsonb)
    from cls c where c.cat = 'tombstones'),
  'auth_orfaos_por_classe', (select coalesce(jsonb_agg(jsonb_build_object('dominio', q.dominio, 'categoria', q.cat, 'sem_mais', q.sem_mais, 'n', q.n)
      order by q.dominio, q.cat), '[]'::jsonb)
    from (select orf.dominio, orf.cat, orf.sem_mais, count(*) as n from orf group by 1, 2, 3) q),
  'auth_contas_da_populacao', (select count(*) from auth.users u join public.candidatos c on c.user_id = u.id join cls on cls.id = c.id
                                where exists (select 1 from pop where pop.id = c.id) and cls.cat <> 'fixtures_p46'),
  'storage_curriculos', (select coalesce(jsonb_object_agg(q.classe, q.n), '{}'::jsonb) from (
      select case
        when exists (select 1 from cls where cls.cat = 'trava_rh_excluidos' and cls.user_id::text = split_part(o.name, '/', 1))
          or exists (select 1 from rh where rh.user_id::text = split_part(o.name, '/', 1)) then 'trava_rh'
        when exists (select 1 from cls where cls.cat = 'fixtures_p46' and (cls.user_id::text = split_part(o.name, '/', 1) or cls.id::text = split_part(o.name, '/', 1))) then 'fixtures_p46'
        when exists (select 1 from cls where cls.cat = 'ficticios' and cls.id::text = split_part(o.name, '/', 1)) then 'ficticios'
        when exists (select 1 from cls where cls.cat in ('tombstones', 'contas_teste_com_candidatura', 'contas_sem_candidatura')
                       and (cls.user_id::text = split_part(o.name, '/', 1) or cls.id::text = split_part(o.name, '/', 1))) then 'populacao'
        when exists (select 1 from orf where orf.id::text = split_part(o.name, '/', 1)) then 'auth_orfaos'
        else 'outros' end as classe, count(*) as n
      from storage.objects o where o.bucket_id = 'curriculos' group by 1) q),
  'obrigatorias', (select coalesce(jsonb_agg(jsonb_build_object('id', obr.id,
      'na_populacao', (obr.existe and (obr.em_i or obr.em_ii) and not obr.rh),
      'entrada', case when obr.em_i and obr.em_ii then 'i+ii' when obr.em_i then 'i' when obr.em_ii then 'ii' else null end,
      'situacao', case when not obr.existe then 'inexistente' when obr.rh then 'barrada pela trava'
                       when not (obr.em_i or obr.em_ii) then 'fora de (i) e de (ii)' else 'na populacao' end)
    order by obr.id::text collate "C"), '[]'::jsonb) from obr)
) as r`;

/* ───────────────────────────── utilitários ───────────────────────────── */

const U = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const H = /^[0-9a-f]{32}$/;
const NOME = /^[a-z0-9_]+$/;
const I = (x) => Number.isInteger(x) && x >= 0;
const O = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');
/* Ordem de byte (as ids são ASCII: a ordem de unidade de código do JS é a de byte = COLLATE "C"). */
const md5Ids = (ids) => md5([...ids].sort().join(','));

function padroesNoSql(sql) {
  const falta = PADROES_D30.filter((p) => !sql.includes(`('${p}')`));
  return falta;
}

function linha(doc, k) {
  const m = doc.match(new RegExp('^' + k + ': *(.*)$', 'm'));
  return m ? m[1].trim() : null;
}

function lerApagarCategorias(doc) {
  const v = linha(doc, 'apagar_categorias');
  if (v === null || v === '') return { erro: 'linha apagar_categorias ausente ou vazia' };
  const nomes = v.split(',').map((x) => x.trim()).filter(Boolean);
  if (!nomes.length) return { erro: 'linha apagar_categorias ausente ou vazia' };
  if (new Set(nomes).size !== nomes.length) return { erro: 'apagar_categorias com nome repetido' };
  return { nomes };
}

/* O contrato do 52-19-POPULACAO.json. Devolve a lista de erros (vazia = no contrato).
 * opts.pos: prova depois da limpeza (alvo vazio é o esperado); opts.apagar: nomes da decisão (ou null). */
function conferirContrato(j, opts = {}) {
  const e = [];
  const pos = !!opts.pos;
  const apagar = opts.apagar || null;
  if (!O(j)) return ['raiz nao e objeto'];
  const reqI = ['n_vagas_teste', 'n_colisoes', 'n_possivel_real', 'excluidos_rh', 'candidaturas_excluidas_rh', 'entrada_i', 'entrada_ii', 'rh_com_candidato'];
  if (typeof j.medido_em !== 'string' || !Number.isFinite(Date.parse(j.medido_em))) e.push('medido_em');
  for (const k of reqI) if (!I(j[k])) e.push(k);
  if (!(I(j.examinados_total) && j.examinados_total >= 1)) e.push('examinados_total');
  if (typeof j.fixtures_md5 !== 'string' || !H.test(j.fixtures_md5)) e.push('fixtures_md5');

  if (!O(j.categorias) || !Object.keys(j.categorias).length) e.push('categorias');
  else
    for (const [k, c] of Object.entries(j.categorias)) {
      if (!NOME.test(k)) e.push(`categorias.${k} (nome)`);
      if (!O(c) || !I(c.n) || typeof c.md5 !== 'string' || !H.test(c.md5)) e.push(`categorias.${k}`);
    }

  const V = j.vagas_teste;
  if (!Array.isArray(V) || !V.length) e.push('vagas_teste');
  else {
    for (const v of V)
      if (!O(v) || !U.test(v.id || '') || typeof v.slug !== 'string' || typeof v.status !== 'string' || !(v.deleted_at === null || typeof v.deleted_at === 'string') || !I(v.candidaturas_populacao) || !I(v.candidaturas_excluidas))
        e.push(`vagas_teste[${String(O(v) && v.id).slice(0, 8)}]`);
    if (I(j.n_vagas_teste) && V.length !== j.n_vagas_teste) e.push(`vagas_teste (${V.length} != n_vagas_teste ${j.n_vagas_teste})`);
    if (I(j.n_colisoes) && V.filter((v) => O(v) && v.candidaturas_excluidas > 0).length !== j.n_colisoes) e.push(`vagas_teste (colisoes na lista != n_colisoes ${j.n_colisoes})`);
  }

  const R = j.possivel_real;
  if (!Array.isArray(R)) e.push('possivel_real');
  else {
    for (const r of R) if (!O(r) || !U.test(r.id || '') || typeof r.tipo !== 'string' || typeof r.motivo !== 'string') e.push('possivel_real[item]');
    if (I(j.n_possivel_real) && R.length !== j.n_possivel_real) e.push(`possivel_real (${R.length} != n_possivel_real ${j.n_possivel_real})`);
  }

  const OB = j.obrigatorias;
  if (!Array.isArray(OB) || !OB.length) e.push('obrigatorias');
  else {
    for (const o of OB)
      if (!O(o) || !U.test(o.id || '') || typeof o.na_populacao !== 'boolean' || !(o.entrada === null || ['i', 'ii', 'i+ii'].includes(o.entrada))) e.push('obrigatorias[item]');
    for (const id of OBRIGATORIAS_NA_POPULACAO) if (!OB.some((o) => O(o) && o.id === id)) e.push(`obrigatorias (sem ${id.slice(0, 8)})`);
  }

  if (!tem(j, 'apagaveis')) e.push('apagaveis');
  if (!tem(j, 'populacao_md5')) e.push('populacao_md5');
  if (!apagar) {
    if (tem(j, 'apagaveis') && j.apagaveis !== null) e.push('apagaveis (tem de ser null sem --decisao)');
    if (tem(j, 'populacao_md5') && j.populacao_md5 !== null) e.push('populacao_md5 (tem de ser null sem --decisao)');
  } else if (O(j.apagaveis)) {
    const chaves = Object.keys(j.apagaveis).sort();
    for (const k of apagar) if (!tem(j.apagaveis, k)) e.push(`apagaveis (categoria aprovada sem chave: ${k})`);
    for (const k of chaves) if (!apagar.includes(k)) e.push(`apagaveis (chave sem aprovacao: ${k})`);
    const ids = [];
    for (const [k, a] of Object.entries(j.apagaveis)) {
      if (!Array.isArray(a)) {
        e.push(`apagaveis.${k}`);
        continue;
      }
      for (const x of a) {
        if (!O(x) || !U.test(x.id || '') || !(x.user_id === null || U.test(x.user_id || ''))) e.push(`apagaveis.${k}[item]`);
        else ids.push(x.id);
      }
      const n = O(j.categorias) && O(j.categorias[k]) ? j.categorias[k].n : -1;
      if (n < 0) e.push(`apagaveis.${k} (nao e categoria medida)`);
      else if (a.length > n) e.push(`apagaveis.${k} (${a.length} > categorias.${k}.n ${n})`);
    }
    if (!pos && ids.length === 0) e.push('apagaveis (nenhuma entrada com --decisao)');
    const esperado = md5Ids([...new Set(ids)]);
    if (typeof j.populacao_md5 !== 'string' || !H.test(j.populacao_md5)) e.push('populacao_md5 (malformado)');
    else if (j.populacao_md5 !== esperado) e.push('populacao_md5 (nao e o md5 dos ids de apagaveis)');
  } else e.push('apagaveis (objeto com --decisao)');

  if (/@[a-z0-9.-]+\.[a-z]{2,}/i.test(JSON.stringify(j).replace(/"dominio":"[^"]*"/g, ''))) e.push('e-mail no JSON');
  return e;
}

/* As recusas de POPULAÇÃO (as que o contrato de tipos não vê). Devolve a primeira mensagem ou null. */
function conferirPopulacao(j, opts = {}) {
  const pos = !!opts.pos;
  const OB = Array.isArray(j.obrigatorias) ? j.obrigatorias : [];
  if (!pos) {
    if (j.entrada_i === 0) return 'POPULACAO VAZIA: entrada (i) sem nenhuma conta (populacao vazia nao prova nada)';
    if (j.entrada_ii === 0) return 'POPULACAO VAZIA: entrada (ii) sem nenhuma conta (populacao vazia nao prova nada)';
    for (const o of OB) if (O(o) && o.na_populacao !== true) return `POPULACAO SEM A OBRIGATORIA: ${String(o.id).slice(0, 8)} (${o.situacao || 'fora da populacao'})`;
  }
  if (j.rh_com_candidato > 0 && j.excluidos_rh === 0) return `TRAVA DO RH SEM EFEITO: ${j.rh_com_candidato} candidato(s) com user_id de RH e 0 excluidos`;
  if (j.rh_com_candidato !== j.excluidos_rh) return `TRAVA DO RH DIVERGE: anti-join excluiu ${j.excluidos_rh}, a juncao conta ${j.rh_com_candidato}`;
  if (!Array.isArray(j.particao_candidatos) || !j.particao_candidatos.length) return 'SOMA DAS CATEGORIAS: particao_candidatos ausente';
  let soma = 0;
  for (const k of j.particao_candidatos) {
    if (!O(j.categorias) || !O(j.categorias[k])) return `SOMA DAS CATEGORIAS: ${k} ausente de categorias`;
    soma += j.categorias[k].n;
  }
  if (soma !== j.examinados_total) return `SOMA DAS CATEGORIAS: ${soma} != examinados_total ${j.examinados_total} (alguma conta sumiu do relatorio)`;
  return null;
}

/* ───────────────────────────── medir ───────────────────────────── */

function normalizar(r, opts) {
  const e = [];
  const categorias = {};
  const itensPorCat = {};
  for (const [k, c] of Object.entries(r.categorias || {})) {
    const itens = Array.isArray(c.itens) ? c.itens : [];
    if (itens.length !== Number(c.n)) e.push(`categorias.${k} (lista ${itens.length} != count ${c.n})`);
    if (md5Ids(itens.map((x) => x.id)) !== c.md5) e.push(`categorias.${k} (md5 da lista != md5 do SQL)`);
    categorias[k] = { n: Number(c.n), md5: c.md5, ids8: itens.map((x) => String(x.id).slice(0, 8)) };
    itensPorCat[k] = itens;
  }
  const j = {
    medido_em: new Date().toISOString(),
    examinados_total: Number(r.examinados_total),
    particao_candidatos: PARTICAO,
    entrada_i: Number(r.entrada_i),
    entrada_ii: Number(r.entrada_ii),
    i_e_ii: Number(r.i_e_ii),
    i_menos_ii: Number(r.i_menos_ii),
    ii_menos_i: Number(r.ii_menos_i),
    ii_menos_i_ids8: r.ii_menos_i_ids8,
    populacao_contas: Number(r.populacao_contas),
    excluidos_rh: Number(r.excluidos_rh),
    rh_com_candidato: Number(r.rh_com_candidato),
    usuarios_rh_total: Number(r.usuarios_rh_total),
    usuarios_rh_user_id_nulo: Number(r.usuarios_rh_user_id_nulo),
    candidaturas_excluidas_rh: Number(r.candidaturas_excluidas_rh),
    candidaturas_total: Number(r.candidaturas_total),
    candidaturas_populacao: r.candidaturas_populacao,
    categorias,
    vagas_teste: r.vagas_teste,
    n_vagas_teste: Number(r.n_vagas_teste),
    n_colisoes: Number(r.n_colisoes),
    vagas_fora_do_padrao_nao_ativas: r.vagas_fora_do_padrao_nao_ativas,
    vagas_ativas: r.vagas_ativas,
    possivel_real: r.possivel_real,
    n_possivel_real: Number(r.n_possivel_real),
    candidaturas_ativas_fora_da_populacao: r.fora_ativas,
    fixtures: r.fixtures,
    fixtures_md5: r.fixtures_md5,
    tombstones_onde: r.tombstones_onde,
    auth_orfaos_por_classe: r.auth_orfaos_por_classe,
    auth_contas_da_populacao: Number(r.auth_contas_da_populacao),
    storage_curriculos: r.storage_curriculos,
    obrigatorias: r.obrigatorias,
    padroes: { d30: PADROES_D30, semente_p47_sem_admin: SEMENTE_P47 },
    apagaveis: null,
    populacao_md5: null,
  };
  if (Array.isArray(j.vagas_teste))
    for (const v of j.vagas_teste)
      if (O(v) && v.candidaturas_populacao + v.candidaturas_excluidas !== v.candidaturas_total)
        e.push(`vagas_teste[${String(v.id).slice(0, 8)}] (populacao + excluidas != total: candidatura escapou das duas)`);

  if (opts.apagar) {
    /* Recorte: `manter_ids:` (prefixos de 8, vírgula) e `possivel_real_<id8>: manter` retiram de
     * apagaveis a entrada cujo id (ou uma candidatura dela) começa pelo prefixo. Nunca acrescentam. */
    const manter = new Set();
    const mi = linha(opts.doc, 'manter_ids');
    if (mi) for (const x of mi.split(',').map((s) => s.trim()).filter(Boolean)) manter.add(x);
    for (const m of opts.doc.matchAll(/^possivel_real_([0-9a-f]{8}): *(\S+)/gm)) if (m[2] === 'manter') manter.add(m[1]);
    const casa = (x) => [...manter].some((p) => String(x.id).startsWith(p) || (Array.isArray(x.k) && x.k.some((kid) => String(kid).startsWith(p))));
    j.apagaveis = {};
    for (const k of opts.apagar) {
      if (NUNCA_APAGAVEIS.includes(k)) e.push(`apagar_categorias: ${k} nunca e apagavel`);
      if (!itensPorCat[k]) {
        e.push(`apagar_categorias: ${k} nao e categoria medida`);
        continue;
      }
      j.apagaveis[k] = itensPorCat[k].filter((x) => !casa(x)).map((x) => ({ id: x.id, user_id: x.user_id === undefined ? null : x.user_id }));
    }
    j.populacao_md5 = md5Ids([...new Set(Object.values(j.apagaveis).flat().map((x) => x.id))]);
  }
  return { j, erros: e };
}

function medir(saida, decisao, pos) {
  let apagar = null;
  let doc = null;
  if (decisao) {
    try {
      doc = fs.readFileSync(decisao, 'utf8');
    } catch {
      console.error(`POPULACAO FORA DO CONTRATO: decisao ilegivel (${decisao})`);
      process.exit(1);
    }
    const a = lerApagarCategorias(doc);
    if (a.erro) {
      console.error(`POPULACAO FORA DO CONTRATO: ${a.erro}`);
      process.exit(1);
    }
    apagar = a.nomes;
  }
  let out;
  try {
    out = execFileSync(process.execPath, [path.join(RAIZ, 'p46apply.cjs'), 'sql', SQL_VARREDURA], {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    const msg = String((err && err.stderr) || '').split('\n')[0].slice(0, 300);
    console.error(`MEDICAO FALHOU: a leitura so leitura nao respondeu (${msg || 'sem stderr'})`);
    process.exit(1);
  }
  let r;
  try {
    r = JSON.parse(out.slice(out.indexOf('[')))[0].r;
  } catch {
    console.error('MEDICAO FALHOU: saida sem JSON');
    process.exit(1);
  }
  const { j, erros } = normalizar(r, { apagar, doc });
  const e = erros.concat(conferirContrato(j, { pos, apagar }));
  if (e.length) {
    console.error(`POPULACAO FORA DO CONTRATO: ${e.join('; ')}`);
    process.exit(1);
  }
  const p = conferirPopulacao(j, { pos });
  if (p) {
    console.error(p);
    process.exit(1);
  }
  fs.writeFileSync(saida, JSON.stringify(j, null, 2) + '\n');
  const ob = j.obrigatorias.map((o) => `${o.id.slice(0, 8)}=${o.entrada}`).join(',');
  console.log(
    `POPULACAO MEDIDA${pos ? ' (pos)' : ''}: examinados=${j.examinados_total} entrada_i=${j.entrada_i} entrada_ii=${j.entrada_ii} ` +
      `(i∩ii=${j.i_e_ii}, i−ii=${j.i_menos_ii}, ii−i=${j.ii_menos_i}) trava=${j.excluidos_rh} (candidaturas ${j.candidaturas_excluidas_rh}) ` +
      `vagas_teste=${j.n_vagas_teste} colisoes=${j.n_colisoes} possivel_real=${j.n_possivel_real} obrigatorias[${ob}] ` +
      `apagaveis=${j.apagaveis === null ? 'null' : Object.keys(j.apagaveis).join('+')} → ${saida}`
  );
}

/* ───────────────────────────── comparar ───────────────────────────── */

function compararDocs(agora, doc, popul) {
  const e = [];
  const decisao = linha(doc, 'decisao');
  if (decisao !== 'apagar') e.push('decisao nao e apagar');
  const ap = linha(doc, 'populacao_md5_aprovado');
  if (!ap || !H.test(ap)) e.push('populacao_md5_aprovado ausente ou malformado');
  const aprov = {};
  for (const m of doc.matchAll(/^aprovado_([a-z0-9_]+): *(\S*)/gm)) {
    if (!/^[0-9]+$/.test(m[2])) e.push(`aprovado_${m[1]} malformado`);
    else aprov[m[1]] = Number(m[2]);
  }
  if (!Object.keys(aprov).length) e.push('nenhuma linha aprovado_<categoria>');
  const apagar = O(agora) && O(agora.apagaveis) ? Object.keys(agora.apagaveis) : null;
  const ec = conferirContrato(agora, { apagar: apagar || [] });
  if (!apagar) e.push('medicao de agora sem apagaveis');
  if (ec.length) e.push(`medicao de agora fora do contrato (${ec.join(', ')})`);
  const ep = conferirContrato(popul, {});
  if (ep.length) e.push(`populacao aprovada fora do contrato (${ep.join(', ')})`);
  if (apagar) {
    for (const k of Object.keys(aprov)) if (!apagar.includes(k)) e.push(`aprovado_${k} sem chave em apagaveis`);
    for (const k of apagar) if (!tem(aprov, k)) e.push(`apagaveis.${k} sem aprovado_${k}`);
    for (const k of apagar) if (tem(aprov, k) && Array.isArray(agora.apagaveis[k]) && agora.apagaveis[k].length !== aprov[k]) e.push(`apagaveis.${k} ${agora.apagaveis[k].length} != aprovado_${k} ${aprov[k]}`);
    if (ap && H.test(ap) && agora.populacao_md5 !== ap) e.push(`populacao_md5 agora ${agora.populacao_md5} != aprovado ${ap}`);
  }
  return e;
}

function comparar(fa, fd, fp) {
  let agora;
  let doc;
  let popul;
  try {
    agora = JSON.parse(fs.readFileSync(fa, 'utf8'));
    doc = fs.readFileSync(fd, 'utf8');
    popul = JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    console.error('POPULACAO DIFERE DA APROVADA: arquivo ilegivel ou JSON malformado');
    process.exit(1);
  }
  const e = compararDocs(agora, doc, popul);
  if (e.length) {
    console.error(`POPULACAO DIFERE DA APROVADA: ${e.join('; ')}`);
    process.exit(1);
  }
  console.log(`POPULACAO DE AGORA = APROVADA: populacao_md5=${agora.populacao_md5}; ${Object.entries(agora.apagaveis).map(([k, a]) => `${k}=${a.length}`).join(', ')}`);
}

/* ───────────────────────────── auto-teste (sem rede) ───────────────────────────── */

function autoTeste() {
  const id = (n) => `0000000${n}`.slice(-8) + '-0000-4000-8000-000000000000';
  const OBR = OBRIGATORIAS_NA_POPULACAO[0];
  const cat = (ids) => ({ n: ids.length, md5: md5Ids(ids), ids8: ids.map((x) => x.slice(0, 8)) });
  const base = () => ({
    medido_em: '2026-10-13T08:00:00.000Z',
    examinados_total: 4,
    particao_candidatos: PARTICAO,
    entrada_i: 2,
    entrada_ii: 1,
    excluidos_rh: 1,
    rh_com_candidato: 1,
    candidaturas_excluidas_rh: 1,
    categorias: {
      trava_rh_excluidos: cat([id(1)]),
      fixtures_p46: cat([]),
      ficticios: cat([id(2)]),
      tombstones: cat([]),
      contas_teste_com_candidatura: cat([id(3), id(4)]),
      contas_sem_candidatura: cat([]),
      fora_da_populacao: cat([]),
      auth_orfaos_sem_padrao: cat([id(9)]),
    },
    vagas_teste: [
      { id: id(5), slug: 'teste-a', status: 'inativa', deleted_at: null, candidaturas_populacao: 1, candidaturas_excluidas: 0 },
      { id: id(6), slug: 'teste-b', status: 'arquivada', deleted_at: null, candidaturas_populacao: 0, candidaturas_excluidas: 1 },
    ],
    n_vagas_teste: 2,
    n_colisoes: 1,
    possivel_real: [],
    n_possivel_real: 0,
    fixtures_md5: md5(''),
    obrigatorias: [{ id: OBR, na_populacao: true, entrada: 'i', situacao: 'na populacao' }],
    apagaveis: null,
    populacao_md5: null,
  });
  const CHEIAS = { ficticios: [id(2)], contas_teste_com_candidatura: [id(3), id(4)], tombstones: [] };
  const comDecisao = (cats) => {
    const j = base();
    j.apagaveis = {};
    for (const k of cats) j.apagaveis[k] = (CHEIAS[k] || []).map((x) => ({ id: x, user_id: null }));
    j.populacao_md5 = md5Ids([...new Set(Object.values(j.apagaveis).flat().map((x) => x.id))]);
    return j;
  };
  const mod = (f) => {
    const j = base();
    f(j);
    return j;
  };
  const ok = (j, o) => conferirContrato(j, o).length === 0 && conferirPopulacao(j, o) === null;
  const recusa = (j, o, re) => {
    const e = conferirContrato(j, o);
    const p = conferirPopulacao(j, o);
    const msg = e.length ? `POPULACAO FORA DO CONTRATO: ${e.join('; ')}` : p || '';
    return !!msg && (!re || re.test(msg));
  };
  const DEC = (cats, extra) => `decisao: apagar\npopulacao_md5_aprovado: ${comDecisao(cats).populacao_md5}\n${cats.map((k) => `aprovado_${k}: ${comDecisao(cats).apagaveis[k].length}`).join('\n')}\n${extra || ''}`;

  const casos = [
    ['contrato: base sem decisao -> OK', () => ok(base(), {})],
    ['sem vagas_teste -> recusa', () => recusa(mod((j) => delete j.vagas_teste), {}, /vagas_teste/)],
    ['vagas_teste [] -> recusa', () => recusa(mod((j) => { j.vagas_teste = []; }), {}, /vagas_teste/)],
    ['possivel_real ausente -> recusa', () => recusa(mod((j) => delete j.possivel_real), {}, /possivel_real/)],
    ['possivel_real [] com n 0 -> OK', () => ok(base(), {})],
    ['possivel_real 1 entrada com n 2 -> recusa', () => recusa(mod((j) => { j.possivel_real = [{ id: id(7), tipo: 'candidatura', motivo: 'x' }]; j.n_possivel_real = 2; }), {}, /possivel_real/)],
    ['vaga sem candidaturas_excluidas -> recusa', () => recusa(mod((j) => delete j.vagas_teste[0].candidaturas_excluidas), {}, /vagas_teste\[/)],
    ['colisoes na lista != n_colisoes -> recusa', () => recusa(mod((j) => { j.n_colisoes = 0; }), {}, /colisoes/)],
    ['md5 de categoria malformado -> recusa', () => recusa(mod((j) => { j.categorias.ficticios.md5 = 'xyz'; }), {}, /categorias\.ficticios/)],
    ['categorias vazia -> recusa', () => recusa(mod((j) => { j.categorias = {}; }), {}, /categorias/)],
    ['apagaveis nao-null sem decisao -> recusa', () => recusa(mod((j) => { j.apagaveis = {}; }), {}, /apagaveis/)],
    ['e-mail no JSON -> recusa', () => recusa(mod((j) => { j.vagas_teste[0].slug = 'a@b.com'; }), {}, /e-mail/)],
    ['entrada (i) vazia -> recusa', () => recusa(mod((j) => { j.entrada_i = 0; }), {}, /POPULACAO VAZIA: entrada \(i\)/)],
    ['entrada (ii) vazia -> recusa', () => recusa(mod((j) => { j.entrada_ii = 0; }), {}, /POPULACAO VAZIA: entrada \(ii\)/)],
    ['trava com zero excluidos e candidato de RH -> recusa', () => recusa(mod((j) => { j.excluidos_rh = 0; }), {}, /TRAVA DO RH SEM EFEITO/)],
    ['soma das categorias != total -> recusa', () => recusa(mod((j) => { j.examinados_total = 5; }), {}, /SOMA DAS CATEGORIAS/)],
    ['obrigatorias com 3a9254c3 na_populacao false -> recusa', () => recusa(mod((j) => { j.obrigatorias[0].na_populacao = false; j.obrigatorias[0].entrada = null; j.obrigatorias[0].situacao = 'fora de (i) e de (ii)'; }), {}, /POPULACAO SEM A OBRIGATORIA: 3a9254c3/)],
    ['a mesma com --pos -> OK', () => ok(mod((j) => { j.obrigatorias[0].na_populacao = false; j.obrigatorias[0].entrada = null; }), { pos: true })],
    ['obrigatorias ausente -> recusa', () => recusa(mod((j) => delete j.obrigatorias), {}, /obrigatorias/)],
    ['obrigatorias sem a 3a9254c3 -> recusa', () => recusa(mod((j) => { j.obrigatorias[0].id = id(8); }), {}, /obrigatorias/)],
    ['com decisao: apagaveis no contrato -> OK', () => ok(comDecisao(['ficticios', 'contas_teste_com_candidatura']), { apagar: ['ficticios', 'contas_teste_com_candidatura'] })],
    ['com decisao: categoria aprovada sem chave -> recusa', () => recusa(comDecisao(['ficticios']), { apagar: ['ficticios', 'contas_teste_com_candidatura'] }, /categoria aprovada sem chave/)],
    ['com decisao e --pos: categoria aprovada sem chave -> recusa', () => recusa(mod((j) => { j.apagaveis = { ficticios: [] }; j.populacao_md5 = md5(''); }), { pos: true, apagar: ['ficticios', 'tombstones'] }, /categoria aprovada sem chave/)],
    ['--pos com as chaves presentes e vazias -> OK', () => ok(mod((j) => { j.apagaveis = { ficticios: [], tombstones: [] }; j.populacao_md5 = md5(''); }), { pos: true, apagar: ['ficticios', 'tombstones'] })],
    ['com decisao sem --pos: apagaveis sem entrada -> recusa', () => recusa(mod((j) => { j.apagaveis = { tombstones: [] }; j.populacao_md5 = md5(''); }), { apagar: ['tombstones'] }, /nenhuma entrada/)],
    ['com decisao: populacao_md5 errado -> recusa', () => recusa(mod((j) => { const d = comDecisao(['ficticios']); j.apagaveis = d.apagaveis; j.populacao_md5 = md5('x'); }), { apagar: ['ficticios'] }, /populacao_md5/)],
    ['comparar: igual -> OK', () => compararDocs(comDecisao(['ficticios', 'contas_teste_com_candidatura']), DEC(['ficticios', 'contas_teste_com_candidatura']), base()).length === 0],
    ['comparar: id a mais -> recusa', () => { const a = comDecisao(['ficticios']); a.apagaveis.ficticios.push({ id: id(7), user_id: null }); a.categorias.ficticios = cat([id(2), id(7)]); a.examinados_total = 5; a.populacao_md5 = md5Ids([id(2), id(7)]); return compararDocs(a, DEC(['ficticios']), base()).length > 0; }],
    ['comparar: id a menos -> recusa', () => { const a = comDecisao(['ficticios']); a.apagaveis.ficticios = []; a.populacao_md5 = md5(''); return compararDocs(a, DEC(['ficticios']), base()).length > 0; }],
    ['comparar: md5 aprovado malformado -> recusa', () => compararDocs(comDecisao(['ficticios']), DEC(['ficticios']).replace(/populacao_md5_aprovado: \S+/, 'populacao_md5_aprovado: 123'), base()).some((x) => /malformado/.test(x))],
    ['comparar: aprovado_<k> sem chave em apagaveis -> recusa', () => compararDocs(comDecisao(['ficticios']), DEC(['ficticios'], 'aprovado_tombstones: 0'), base()).some((x) => /aprovado_tombstones sem chave/.test(x))],
    ['comparar: chave sem aprovado_ -> recusa', () => compararDocs(comDecisao(['ficticios', 'contas_teste_com_candidatura']), DEC(['ficticios', 'contas_teste_com_candidatura']).replace(/^aprovado_contas_teste_com_candidatura: .*$/m, ''), base()).some((x) => /sem aprovado_contas_teste/.test(x))],
    ['comparar: contagem diferente -> recusa', () => compararDocs(comDecisao(['ficticios']), DEC(['ficticios']).replace(/aprovado_ficticios: \d+/, 'aprovado_ficticios: 2'), base()).some((x) => /!= aprovado_ficticios/.test(x))],
    ['comparar: decisao != apagar -> recusa', () => compararDocs(comDecisao(['ficticios']), DEC(['ficticios']).replace('decisao: apagar', 'decisao: adiar'), base()).some((x) => /decisao nao e apagar/.test(x))],
    ['D-30: cada padrao literal no SQL_VARREDURA', () => padroesNoSql(SQL_VARREDURA).length === 0],
    ['D-30: um padrao tirado do SQL -> recusa', () => PADROES_D30.every((p) => padroesNoSql(SQL_VARREDURA.split(`('${p}')`).join('')).includes(p))],
    ['SQL comeca por set transaction read only', () => SQL_VARREDURA.startsWith('set transaction read only;')],
    ['SQL sem NOT IN', () => !/not\s+in\s*\(/i.test(SQL_VARREDURA)],
    ['SQL sem projecao de email/nome/cpf', () => !/'(email|nome_completo|cpf)'/i.test(SQL_VARREDURA) && !/\bcpf\b|nome_completo/i.test(SQL_VARREDURA)],
    ['smoke52d copia os padroes e as obrigatorias', () => {
      let s = '';
      try { s = fs.readFileSync(path.join(RAIZ, SMOKE_REL), 'utf8'); } catch { return false; }
      return [...PADROES_D30, ...SEMENTE_P47].every((p) => s.includes(`('${p}')`)) && OBRIGATORIAS_NA_POPULACAO.every((o) => s.includes(o)) && s.includes('smoke52d');
    }],
  ];
  const falhas = [];
  for (const [nome, f] of casos) {
    let r = false;
    try { r = f() === true; } catch (err) { r = false; }
    if (!r) falhas.push(nome);
  }
  if (falhas.length) {
    console.error(`PORTAO AUTO-TESTE FALHOU: ${falhas.join('; ')}`);
    process.exit(1);
  }
  console.log(`PORTAO AUTO-TESTE OK: ${casos.length}/${casos.length} (contrato do POPULACAO.json, recusas de populacao, --decisao/--pos, comparar, lista da D-30 no SQL, obrigatorias)`);
}

module.exports = { SQL_VARREDURA, PADROES_D30, SEMENTE_P47, OBRIGATORIAS_NA_POPULACAO, PARTICAO, conferirContrato, conferirPopulacao, compararDocs, padroesNoSql };

if (require.main === module) {
  const a = process.argv.slice(2);
  const uso = () => {
    console.error('USO: node scripts/p52_limpeza_portao.cjs --auto-teste | medir <saida.json> [--decisao <arquivo>] [--pos] | comparar <agora.json> <decisao.md> <populacao.json>');
    process.exit(2);
  };
  if (a.length === 1 && a[0] === '--auto-teste') autoTeste();
  else if (a[0] === 'medir' && a[1] && !a[1].startsWith('--')) {
    const resto = a.slice(2);
    let dec = null;
    let pos = false;
    for (let i = 0; i < resto.length; i++) {
      if (resto[i] === '--pos') pos = true;
      else if (resto[i] === '--decisao' && resto[i + 1]) dec = resto[++i];
      else uso();
    }
    medir(a[1], dec, pos);
  } else if (a[0] === 'comparar' && a.length === 4) comparar(a[1], a[2], a[3]);
  else uso();
}
