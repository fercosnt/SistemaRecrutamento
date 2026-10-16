#!/usr/bin/env node
// payload.json -> migration SQL da vaga nova. Gerado, nunca transcrito.
//   node gen-migration.cjs payload.json saida.sql
// Copia do gerador da vaga de dentista (20261015000101), com dois ajustes: o cabecalho POR QUE e
// o knockout passa a ser opcional (zero perguntas com metadata = nenhum bloco, guarda espera 0).
const fs = require('fs');
const [entrada, saida] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(entrada, 'utf8'));
const V = P.vaga;
const falha = (m) => { console.error('RECUSADO: ' + m); process.exit(1); };

const usadas = new Set();
function dq(tag, txt) {
  if (txt == null) return 'NULL';
  if (usadas.has(tag)) falha(`tag $${tag}$ repetida`);
  usadas.add(tag);
  if (String(txt).includes(`$${tag}$`)) falha(`o texto contem a propria tag $${tag}$`);
  return `$${tag}$${txt}$${tag}$`;
}
const lit = (s) => { if (/'/.test(s)) falha(`aspas simples em literal curto: ${s}`); return `'${s}'`; };
const num = (n) => (n == null ? 'NULL' : String(Number(n)));

// knockout: uma ou mais perguntas com metadata; cada uma com ao menos 1 opcao knockout que
// casa por texto. Metadata para TODAS as opcoes de cada uma (a guarda compara com o tamanho do array).
const comMeta = P.perguntas.filter((q) => q.opcoes_metadata);
const kosPorPergunta = comMeta.map((q) => {
  const kos = q.opcoes_metadata.filter((m) => m.tag === 'knockout');
  if (kos.length < 1) falha(`pergunta ${q.ordem} com metadata e sem knockout`);
  for (const m of kos) if (!q.opcoes_resposta.includes(m.opcao_texto)) falha('knockout nao casa por texto: ' + m.opcao_texto);
  if (!q.obrigatoria) falha(`pergunta ${q.ordem} tem knockout e nao e obrigatoria`);
  const ko = new Set(kos.map((m) => m.opcao_texto));
  return { q, kos, meta: q.opcoes_resposta.map((t, i) => ({ texto: t, tag: ko.has(t) ? 'knockout' : 'neutro', ordem: i + 1 })) };
});
const totalKos = kosPorPergunta.reduce((n, x) => n + x.kos.length, 0);
let kTag = 0;
const blocosKnockout = kosPorPergunta.map(({ q, meta }) => `
  -- ── knockout da pergunta ${q.ordem} ──────────────────────────────────────────
  SELECT id INTO v_pk FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = ${q.ordem} AND deleted_at IS NULL;

  INSERT INTO public.pergunta_opcao_metadata
    (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  SELECT v_pk, gen_random_uuid(), o.texto, o.tag::public.enum_tag_opcao, 0, o.ordem
    FROM (VALUES
${meta.map((m) => `      (${dq('k' + (++kTag), m.texto)}, ${lit(m.tag)}, ${m.ordem})`).join(',\n')}
    ) AS o(texto, tag, ordem);

  -- Todo texto do metadata TEM de casar com opcoes_resposta (compara com o tamanho do array).
  SELECT count(*), max(jsonb_array_length(f.opcoes_resposta)) INTO v_n, v_m
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_pk AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n IS DISTINCT FROM v_m THEN
    RAISE EXCEPTION 'pergunta ${q.ordem}: so % de % opcoes casam por texto com opcoes_resposta — o knockout seria letra morta', v_n, v_m;
  END IF;`).join('\n');

const pergValues = P.perguntas.map((q) => {
  const n = q.ordem;
  return `      (${lit(q.bloco)}, ${n}, ${dq('q' + n, q.texto_pergunta)}, ${q.texto_ajuda == null ? 'NULL::text' : dq('a' + n, q.texto_ajuda)},\n` +
    `       ${lit(q.tipo_resposta)}, ${q.opcoes_resposta ? dq('o' + n, JSON.stringify(q.opcoes_resposta)) + '::jsonb' : 'NULL::jsonb'}, ${q.obrigatoria ? 'true' : 'false'}, ${q.limite_caracteres == null ? 'NULL::int' : q.limite_caracteres})`;
}).join(',\n');


const sql = `-- =============================================================================
-- Migration: vaga ${V.slug} (${V.titulo})
-- Date: 2026-10-16
-- =============================================================================
--
-- POR QUE ESTE ARQUIVO EXISTE, e nao um INSERT no SQL Editor. Vaga criada por
-- INSERT ad-hoc foi o que deixou 9 de 12 vagas com \`created_by\` nulo — e
-- \`vagas.created_by = auth.uid()\` gateia o escopo de trabalho do recrutador
-- inteiro. O bloco abaixo resolve o autor e ABORTA se nao achar. A tela do RH nao
-- cria vaga do zero; vaga nova com perguntas so nasce por migration.
--
-- FONTE: docs/vagas/${V.slug}.md e o payload em
-- docs/vagas/proveniencia/${V.slug}.payload.json, montado a partir do descritivo
-- antigo de Recepcionista e do formulario antigo colados pelo operador (2026-10-16)
-- e das decisoes dele: a lideranca comeca sozinha na recepcao e monta a equipe;
-- fidelizacao SEM vender (orcamento e valores sao do Dr. Fernando e do pre-vendas);
-- 2+ anos de recepcao/atendimento como eliminatorio da triagem; lideranca formal
-- NAO eliminatoria; CLT presencial, sem valores no anuncio (faixa so no banco, nao
-- exibida); redacao C1 (melhoria de processo); pesos do template recepcionista
-- (25/30/20/25). O banco SJT do cargo NOVO \`lider-recepcao\` nasce na migration
-- 20261016000101, que tem de estar aplicada antes desta (o portao do banco abaixo
-- aborta sem ela).
--
-- A vaga nasce \`rascunho\`. Publicar e ato humano separado, com portao proprio
-- (\`publish_vaga\`). Este arquivo ja confere, depois dos INSERTs, os portoes
-- daquela RPC — para a vaga nao nascer impublicavel.
--
-- KNOCKOUT: ${totalKos} opcao(oes) encerram a candidatura na inscricao (aprovadas pelo
-- operador): ${kosPorPergunta.map(({ q, kos }) => 'pergunta ' + q.ordem + ': ' + kos.map((k) => '"' + k.opcao_texto + '"').join(', ')).join('; ')}. E escrito DIRETO em \`pergunta_opcao_metadata\`: a RPC
-- oficial le \`auth.jwt()\`, que a via de apply nao carrega. O sweep de
-- \`submit_candidatura_atomic\` casa por TEXTO, entao a guarda abaixo aborta se
-- algum texto do metadata nao casar com \`opcoes_resposta\`.
--
-- ANUNCIO x RUBRICA: \`sobre_cargo\`/\`requisitos_*\` sao a copia que ATRAI;
-- \`rubrica_ia\` e o criterio que AVALIA. \`qualificacao_etapa1\` nao e tocado.
-- \`aplica_cognitivo\` fica false: ele liga a prova textual, de banco vazio.
--
-- Aditivo e reversivel. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $vaga$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
  v_pk    uuid;
  v_n     int;
  v_m     int;
BEGIN
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = ${lit(P.autor_email)}
     AND ativo IS TRUE
     AND deleted_at IS NULL;

  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido para % — a vaga nasceria com created_by nulo',
      ${lit(P.autor_email)};
  END IF;

${(P.redacoes_novas || []).map((r, i) => `  -- ── redacao nova ${r.codigo}: o texto exato que o operador aprovou ─────────────
  INSERT INTO public.perguntas_redacao
    (codigo, texto, template_cargo, valor_primario, valor_secundario, is_padrao, default_on, ativa)
  SELECT ${lit(r.codigo)}, ${dq('red' + i, r.texto)}, ${lit(r.template_cargo)}, ${lit(r.valor_primario)},
         ${r.valor_secundario ? lit(r.valor_secundario) : 'NULL'}, ${r.is_padrao ? 'true' : 'false'}, ${r.default_on ? 'true' : 'false'}, true
   WHERE NOT EXISTS (SELECT 1 FROM public.perguntas_redacao WHERE codigo = ${lit(r.codigo)});
  -- Se o codigo ja existia, tem de ser com ESTE texto: senao a vaga usaria um enunciado
  -- que ninguem aprovou.
  IF NOT EXISTS (SELECT 1 FROM public.perguntas_redacao
                  WHERE codigo = ${lit(r.codigo)} AND texto = ${dq('redchk' + i, r.texto)} AND ativa IS TRUE) THEN
    RAISE EXCEPTION 'redacao % existe com outro texto ou inativa — nada a fazer', ${lit(r.codigo)};
  END IF;
`).join('\n')}
  IF EXISTS (SELECT 1 FROM public.vagas WHERE slug = ${lit(V.slug)}) THEN
    RAISE EXCEPTION 'ja existe vaga com slug % — nada a fazer', ${lit(V.slug)};
  END IF;

  INSERT INTO public.vagas (
    slug, titulo, subtitulo, status,
    descricao_curta, departamento, tipo_contrato, modelo_trabalho,
    cidade, estado, endereco_completo, jornada_trabalho,
    faixa_salarial_min, faixa_salarial_max, exibir_salario, total_vagas,
    data_abertura, aplica_cognitivo,
    sobre_cargo, responsabilidades,
    requisitos_formacao, requisitos_experiencia,
    requisitos_tecnicos, requisitos_habilidades,
    diferenciais, beneficios, sobre_empresa, perfil_ideal,
    secoes_extras, rubrica_ia,
    pesos_avaliacao, testes_aplicaveis,
    created_by, updated_by
  )
  VALUES (
    ${lit(V.slug)}, ${dq('tit', V.titulo)}, ${dq('sub', V.subtitulo)}, 'rascunho',
    ${dq('dcurta', V.descricao_curta)}, ${lit(V.departamento)}, ${lit(V.tipo_contrato)}, ${lit(V.modelo_trabalho)},
    ${dq('cid', V.cidade)}, ${lit(V.estado)}, ${dq('ender', V.endereco_completo)}, ${dq('jorn', V.jornada_trabalho)},
    ${num(V.faixa_salarial_min)}, ${num(V.faixa_salarial_max)}, ${V.exibir_salario ? 'true' : 'false'}, ${num(V.total_vagas)},
    (now() AT TIME ZONE 'America/Sao_Paulo')::date, ${V.aplica_cognitivo ? 'true' : 'false'},
    ${dq('scargo', V.sobre_cargo)},
    ${dq('resp', V.responsabilidades)},
    ${dq('rform', V.requisitos_formacao)},
    ${dq('rexp', V.requisitos_experiencia)},
    ${dq('rtec', V.requisitos_tecnicos)},
    ${dq('rhab', V.requisitos_habilidades)},
    ${dq('dif', V.diferenciais)},
    ${dq('ben', V.beneficios)},
    ${dq('semp', V.sobre_empresa)},
    ${dq('perfil', V.perfil_ideal)},
    ${dq('sec', JSON.stringify(P.secoes_extras))}::jsonb,
    ${dq('rub', P.rubrica_ia)},
    ${dq('pesos', JSON.stringify(P.pesos_avaliacao))}::jsonb,
    ${dq('testes', JSON.stringify(P.testes_aplicaveis))}::jsonb,
    v_autor, v_autor
  )
  RETURNING id INTO v_vaga;

  INSERT INTO public.perguntas_formulario (
    vaga_id, bloco, ordem, texto_pergunta, texto_ajuda,
    tipo_resposta, opcoes_resposta, obrigatoria, limite_caracteres,
    created_by, updated_by
  )
  SELECT v_vaga, p.bloco, p.ordem, p.texto, p.ajuda,
         p.tipo::tipo_resposta_pergunta, p.opcoes, p.obrig, p.limite,
         v_autor, v_autor
    FROM (VALUES
${pergValues}
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

${blocosKnockout}

  SELECT count(*) INTO v_n
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE f.vaga_id = v_vaga AND m.tag = 'knockout'
     AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n <> ${totalKos} THEN
    RAISE EXCEPTION 'knockout casou com % opcao(oes), esperado exatamente ${totalKos}', v_n;
  END IF;

  -- ── portoes do publish_vaga, conferidos agora ─────────────────────────────
  -- Os tetos 10 e 1 sao do publish_vaga (escopo deliberado da RPC, nao fotografia).
  SELECT count(*) INTO v_n FROM public.perguntas_formulario WHERE vaga_id = v_vaga;
  IF v_n > 10 THEN
    RAISE EXCEPTION '% perguntas — publish_vaga aceita no maximo 10', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND tipo_resposta IN ('texto_curto', 'texto_longo');
  IF v_n > 1 THEN
    RAISE EXCEPTION '% perguntas abertas — publish_vaga aceita no maximo 1', v_n;
  END IF;
  SELECT count(DISTINCT f.id) INTO v_n
    FROM public.perguntas_formulario f
    JOIN public.pergunta_opcao_metadata m ON m.pergunta_id = f.id AND m.tag = 'knockout'
   WHERE f.vaga_id = v_vaga AND f.obrigatoria IS NOT TRUE;
  IF v_n > 0 THEN
    RAISE EXCEPTION '% pergunta(s) com knockout nao obrigatoria(s) — publish_vaga recusaria', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND created_by IS NULL;
  IF v_n > 0 THEN
    RAISE EXCEPTION '% pergunta(s) sem autor', v_n;
  END IF;

  SELECT (pesos_avaliacao->>'triagem')::int + (pesos_avaliacao->>'work_sample_sjt')::int
       + (pesos_avaliacao->>'redacao_cultural')::int + (pesos_avaliacao->>'entrevista')::int
    INTO v_n FROM public.vagas WHERE id = v_vaga;
  IF v_n IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'pesos somam % — publish_vaga exige 100', v_n;
  END IF;
  SELECT count(*) INTO v_n
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t
   WHERE v.id = v_vaga AND (t->>'obrigatorio')::boolean IS TRUE;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'nenhum teste obrigatorio — publish_vaga recusaria';
  END IF;

  -- ── o que o publish_vaga NAO confere: o banco do cargo tem itens? ──────────
  SELECT count(*) INTO v_n
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t, public.perguntas q
   WHERE v.id = v_vaga AND t->>'teste' = 'work_sample_sjt'
     AND q.tipo = 'sjt' AND q.status = 'active' AND q.formato = 'mc'
     AND q.cargo = t->>'cargo';
  IF v_n = 0 THEN
    RAISE EXCEPTION 'o banco SJT do cargo apontado nao tem item de multipla escolha ativo';
  END IF;
  SELECT count(*) INTO v_n
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t,
         jsonb_array_elements_text(t->'codigos') c
   WHERE v.id = v_vaga AND t->>'teste' = 'redacao_cultural'
     AND NOT EXISTS (SELECT 1 FROM public.perguntas_redacao r WHERE r.codigo = c AND r.ativa IS TRUE);
  IF v_n > 0 THEN
    RAISE EXCEPTION '% codigo(s) de redacao sem enunciado ativo', v_n;
  END IF;

  RAISE NOTICE 'vaga % criada como rascunho, autor %, % knockout(s) armado(s)', v_vaga, v_autor, ${totalKos};
END
$vaga$;
`;
fs.writeFileSync(saida, sql);
console.log('ok —', saida, sql.length, 'bytes');
