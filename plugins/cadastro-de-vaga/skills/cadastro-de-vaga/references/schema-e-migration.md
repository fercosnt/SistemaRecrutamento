# Schema, payload e o template da migration

| Seção | Para quê |
|---|---|
| [A forma do payload](#a-forma-do-payload) | o JSON que a skill monta antes de virar SQL |
| [`pesos_avaliacao` e `testes_aplicaveis`](#pesos_avaliacao-e-testes_aplicaveis--não-invente-reaproveite) | os 8 defaults por cargo que já existem no repo |
| [Colunas de `vagas`](#colunas-de-vagas-que-importam) | tipos, CHECKs e as armadilhas de cada uma |
| [Colunas de `perguntas_formulario`](#colunas-de-perguntas_formulario) | blocos, enums e o `created_by` nulo |
| [O template da migration](#o-template-da-migration) | modo 1 — cria a vaga inteira |
| [Modo 2 — perguntas](#modo-2--acrescentar-perguntas-a-uma-vaga-que-já-existe) | acrescentar perguntas a vaga existente |
| [Provar antes de aplicar](#como-provar-o-template-antes-de-aplicar) | o truque do `SELECT 1/0` |
| [Aplicar](#aplicar) | via de apply e as provas de depois |

## A forma do payload

Um JSON com quatro partes. O validador (`scripts/validar-payload.mjs`) confere esta forma.

```json
{
  "autor_email": "fernando@beautysmile.com.br",
  "vaga": {
    "slug": "consultor-relacionamento-pre-vendas",
    "titulo": "Consultor de Relacionamento e Pré-vendas",
    "descricao_curta": "texto puro, sem markdown — 1 a 3 frases",
    "departamento": "Comercial",
    "tipo_contrato": "CLT",
    "modelo_trabalho": "Presencial",
    "cidade": "São Paulo",
    "estado": "SP",
    "jornada_trabalho": "44h/semana",
    "faixa_salarial_min": 2500,
    "faixa_salarial_max": 3500,
    "exibir_salario": false,
    "total_vagas": 1,
    "sobre_cargo": "markdown do TextoRico",
    "responsabilidades": "markdown do TextoRico",
    "requisitos_formacao": "markdown do TextoRico",
    "requisitos_experiencia": "markdown do TextoRico",
    "requisitos_tecnicos": "markdown do TextoRico",
    "requisitos_habilidades": "markdown do TextoRico",
    "diferenciais": "markdown do TextoRico",
    "beneficios": "markdown do TextoRico"
  },
  "secoes_extras": [
    { "titulo": "O que essa vaga NÃO é", "conteudo": "markdown do TextoRico" }
  ],
  "template_cargo": "sdr_social_seller",
  "pesos_avaliacao": { "triagem": 25, "work_sample_sjt": 35, "redacao_cultural": 15, "entrevista": 25 },
  "testes_aplicaveis": [
    { "teste": "triagem", "obrigatorio": true, "customizado": false },
    { "teste": "work_sample_sjt", "obrigatorio": true, "customizado": false },
    { "teste": "redacao_cultural", "obrigatorio": false, "customizado": false },
    { "teste": "big_five", "obrigatorio": false, "customizado": false },
    { "teste": "cognitivo", "obrigatorio": false, "customizado": false },
    { "teste": "entrevista", "obrigatorio": true, "customizado": false }
  ],
  "rubrica_ia": "## Requisitos eliminatórios\n…",
  "perguntas": [
    {
      "bloco": "curriculo",
      "ordem": 1,
      "texto_pergunta": "Cole o link do seu portfólio…",
      "texto_ajuda": null,
      "tipo_resposta": "texto_curto",
      "obrigatoria": true,
      "limite_caracteres": 500
    }
  ]
}
```

`status` não entra no payload: **a vaga sempre nasce `rascunho`**.

## `pesos_avaliacao` e `testes_aplicaveis` — não invente, reaproveite

Sem os dois, a vaga **nunca poderá ser publicada** pela RPC: `publish_vaga` exige que os pesos
somem exatamente 100 e que exista pelo menos um teste `obrigatorio`. As duas vagas hoje em
produção estão com pesos zerados justamente porque foram publicadas fora da RPC — não copie
esse caminho.

O repositório já tem 8 conjuntos de defaults por cargo em
`src/features/config-vaga/templates/cargoTemplates.ts`. Escolha o mais próximo e ajuste, em vez
de inventar números:

| `template_cargo` | triagem | work_sample_sjt | redacao_cultural | entrevista |
|---|---|---|---|---|
| `dentista` | 20 | 35 | 15 | 30 |
| `recepcionista` | 25 | 30 | 20 | 25 |
| `consultor_vendas_premium` | 20 | 35 | 15 | 30 |
| `sdr_social_seller` | 25 | 35 | 15 | 25 |
| `assistente_financeiro` | 30 | 30 | 15 | 25 |
| `asb` | 35 | 25 | 15 | 25 |
| `tsb` | 30 | 30 | 15 | 25 |
| `vaga_generica` | 30 | 25 | 20 | 25 |

Os pesos são inteiros e a soma é comparada com `=== 100` — nada de fração.

`big_five` e `cognitivo` entram na lista de testes como contexto, sempre `obrigatorio: false`,
e **não têm peso** (ficam fora da soma). O default de `redacao_cultural` é `false`, exceto no
template de dentista.

⚠ Estes números são uma **proposta**, como a rubrica. Mostre ao operador junto com ela.

## Colunas de `vagas` que importam

Tipos e regras medidos em produção. As colunas que ninguém lê estão no
[mapa-de-visibilidade](mapa-de-visibilidade.md) e não devem receber conteúdo que importe.

| Coluna | Tipo | Regra |
|---|---|---|
| `slug` | `text` NOT NULL | **único**. CHECK `^[a-z0-9-]+$` — sem acento, sem maiúscula, sem `_` |
| `titulo` | `text` NOT NULL | |
| `estado` | `char(2)` | CHECK contra as 27 UFs |
| `modelo_trabalho` | `text` | `Presencial` \| `Remoto` \| `Híbrido` — **com maiúscula**, o código compara literal |
| `tipo_contrato` | `text` | `CLT` \| `PJ` \| `Estágio` \| `Temporário` \| `Freelancer` |
| `faixa_salarial_min`/`max` | `numeric` | CHECK: ou as duas nulas, ou `max >= min` |
| `exibir_salario` | `bool` DEFAULT false | CHECK: só pode ser `true` se as duas faixas existirem |
| `status` | enum `status_vaga` | `rascunho` \| `ativa` \| `inativa` \| `arquivada` |
| `data_abertura`/`fechamento` | `date` | CHECK: `fechamento > abertura` |
| `secoes_extras` | `jsonb` NOT NULL DEFAULT `[]` | CHECK: array de objetos, **cada um com `titulo` E `conteudo` string não-vazia** |
| `rubrica_ia` | `text` | livre; o teto de 5 competências é de tokens, não de banco |
| `created_by`/`updated_by` | `uuid` | nullable no schema, **obrigatório na prática** |

⚠ O CHECK de `secoes_extras` foi corrigido uma vez porque a primeira versão aceitava
`[{"titulo":"X"}]` — jsonpath lax não vê chave ausente. Emita sempre as duas chaves.

## Colunas de `perguntas_formulario`

| Coluna | Regra |
|---|---|
| `vaga_id` | FK |
| `bloco` | CHECK — **só** `jornada`, `tecnologia`, `valores`, `curriculo` |
| `ordem` | CHECK `>= 1`. Não há índice único; mantenha único por vaga, contando de 1 |
| `texto_pergunta` | NOT NULL |
| `texto_ajuda` | opcional |
| `tipo_resposta` | enum `tipo_resposta_pergunta`: `texto_curto`, `texto_longo`, `single_choice`, `multiple_choice`, `numerico` |
| `opcoes_resposta` | `jsonb` array de strings — CHECK: **obrigatório e não-vazio** nos dois `*_choice` |
| `obrigatoria` | DEFAULT `true` |
| `limite_caracteres` · `valor_minimo`/`maximo` | opcionais |
| `deleted_at` | soft delete — filtre sempre |
| `created_by` | ⚠ **NULL nas 6 perguntas existentes.** É a doença que esta skill existe para não repetir |

## O template da migration

Provado por execução: o `DO` block, o dollar-quoting aninhado e o cast de enum funcionam pela
via de apply desta base, e **o portão do autor dispara antes de qualquer `INSERT`**.

Arquivo em `supabase/migrations/<AAAAMMDD><NNNNNN>_vaga_<slug>.sql`. Sem `BEGIN/COMMIT` — o
driver já envolve cada migration na própria transação, e o wrapper externo é o gatilho de um
erro conhecido (D-22).

```sql
-- =============================================================================
-- Migration: vaga <slug>
-- Date: <AAAA-MM-DD>
-- =============================================================================
--
-- POR QUE ESTE ARQUIVO EXISTE, e nao um INSERT no SQL Editor. Vaga criada por
-- INSERT ad-hoc foi o que deixou 9 de 12 vagas com `created_by` nulo — e
-- `vagas.created_by = auth.uid()` gateia o escopo de trabalho do recrutador
-- inteiro: revisao de redacao, avaliacao de entrevista, decisao final e
-- reprocessamento. O bloco abaixo resolve o autor e ABORTA se nao achar, em vez
-- de gravar NULL calado.
--
-- A vaga nasce `rascunho`. Publicar e ato humano separado, com portao proprio.
--
-- ANUNCIO x RUBRICA: `sobre_cargo`/`requisitos_*` sao a copia que ATRAI;
-- `rubrica_ia` e o criterio que AVALIA. Sao textos com propositos opostos e
-- nunca o mesmo texto — misturar enfia na avaliacao sinais que ninguem decidiu
-- que pesariam. Aditivo e reversivel. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $vaga$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
BEGIN
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = '<autor_email>'
     AND ativo IS TRUE
     AND deleted_at IS NULL;

  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido para % — a vaga nasceria com created_by nulo',
      '<autor_email>';
  END IF;

  INSERT INTO public.vagas (
    slug, titulo, status,
    descricao_curta, departamento, tipo_contrato, modelo_trabalho,
    cidade, estado, jornada_trabalho,
    faixa_salarial_min, faixa_salarial_max, exibir_salario, total_vagas,
    sobre_cargo, responsabilidades,
    requisitos_formacao, requisitos_experiencia,
    requisitos_tecnicos, requisitos_habilidades,
    diferenciais, beneficios,
    secoes_extras, rubrica_ia,
    pesos_avaliacao, testes_aplicaveis,
    created_by, updated_by
  )
  VALUES (
    '<slug>', $tit$<titulo>$tit$, 'rascunho',
    $dcurta$<descricao_curta>$dcurta$, '<departamento>', '<tipo_contrato>', '<modelo_trabalho>',
    '<cidade>', '<UF>', '<jornada>',
    <min>, <max>, <exibir_salario>, <total_vagas>,
    $scargo$<sobre_cargo>$scargo$, $resp$<responsabilidades>$resp$,
    $rform$<requisitos_formacao>$rform$, $rexp$<requisitos_experiencia>$rexp$,
    $rtec$<requisitos_tecnicos>$rtec$, $rhab$<requisitos_habilidades>$rhab$,
    $dif$<diferenciais>$dif$, $ben$<beneficios>$ben$,
    $sec$<secoes_extras_json>$sec$::jsonb,
    $rub$<rubrica_ia>$rub$,
    $pesos$<pesos_avaliacao_json>$pesos$::jsonb,
    $testes$<testes_aplicaveis_json>$testes$::jsonb,
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
      ('curriculo', 1, $q1$<texto_pergunta>$q1$, NULL::text,
       'texto_curto', NULL::jsonb, true, 500)
      -- , ('jornada', 2, …)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

  RAISE NOTICE 'vaga % criada como rascunho, autor %', v_vaga, v_autor;
END
$vaga$;
```

## Modo 2 — acrescentar perguntas a uma vaga que já existe

Nem toda tarefa é vaga nova. As duas vagas publicadas hoje têm **zero perguntas**, e criá-las
por `INSERT` ad-hoc reproduziria o defeito do `created_by` nulo que já existe nas 6 perguntas
antigas. Este modo é o caminho certo para isso.

Ele resolve **duas** coisas e aborta em qualquer uma que falhe: o autor e a vaga. E continua a
numeração de `ordem` de onde parou, em vez de assumir que começa em 1.

```sql
-- =============================================================================
-- Migration: perguntas da Etapa 1 — vaga <slug>
-- Date: <AAAA-MM-DD>
-- =============================================================================
-- A vaga existe e esta publicada com ZERO perguntas: candidato que se inscreve e
-- analisado so pelo curriculo. Criar por INSERT ad-hoc repetiria o defeito das 6
-- perguntas antigas, todas com created_by nulo. Aditivo e reversivel (soft delete).
-- =============================================================================

DO $perg$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
  v_base  int;
BEGIN
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = '<autor_email>' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido para % — as perguntas nasceriam com created_by nulo',
      '<autor_email>';
  END IF;

  SELECT id INTO v_vaga FROM public.vagas WHERE slug = '<slug>' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'vaga "%" nao encontrada — nada a fazer', '<slug>';
  END IF;

  -- Continua a numeracao existente. Conta SEM filtrar deleted_at de proposito: e
  -- assim que o publish_vaga conta, e o teto de 10 e o dele.
  SELECT COALESCE(max(ordem), 0) INTO v_base
    FROM public.perguntas_formulario WHERE vaga_id = v_vaga;

  INSERT INTO public.perguntas_formulario (
    vaga_id, bloco, ordem, texto_pergunta, texto_ajuda,
    tipo_resposta, opcoes_resposta, obrigatoria, limite_caracteres,
    created_by, updated_by
  )
  SELECT v_vaga, p.bloco, v_base + p.ordem, p.texto, p.ajuda,
         p.tipo::tipo_resposta_pergunta, p.opcoes, p.obrig, p.limite,
         v_autor, v_autor
    FROM (VALUES
      ('curriculo', 1, $q1$<texto_pergunta>$q1$, NULL::text,
       'texto_curto', NULL::jsonb, true, 500)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

  RAISE NOTICE 'perguntas acrescentadas a vaga %, a partir da ordem %', v_vaga, v_base + 1;
END
$perg$;
```

⚠ **Confira o teto ANTES de emitir**: a vaga pode já ter perguntas, inclusive soft-deletadas,
e a soma tem de continuar dentro de 10 no total e 1 aberta.

```bash
node p46apply.cjs sql "
  select count(*) as total_bruto,
         count(*) filter (where deleted_at is null) as vivas,
         count(*) filter (where tipo_resposta in ('texto_curto','texto_longo')) as abertas,
         coalesce(max(ordem),0) as ultima_ordem
    from public.perguntas_formulario
   where vaga_id = (select id from public.vagas where slug = '<slug>')"
```

Para validar o payload deste modo, passe só `autor_email`, `vaga.slug` e `perguntas` — o
validador aceita e pula as checagens de campo de vaga que não se aplicam.

### Regras de dollar-quoting

Cada texto longo ganha uma tag **própria e nomeada** (`$scargo$`, `$rub$`, `$q1$`). Tags
aninhadas funcionam desde que sejam diferentes entre si. Nunca use `$$` cru: se o conteúdo
contiver `$$`, o literal quebra em silêncio.

Antes de emitir, confira que **nenhum texto do payload contém a própria tag**. O validador faz
essa checagem.

## Como provar o template antes de aplicar

Acrescente `SELECT 1/0;` como última linha e rode com `run` (que não registra no ledger). O
endpoint executa o corpo inteiro numa transação única, então:

- se o erro for `22012: division by zero`, **tudo antes dele parseou e executou** — e reverteu;
- se for outro erro, é um defeito real do seu SQL, com linha e código.

```bash
node p46apply.cjs run /tmp/probe.sql            # espera-se 22012
node p46apply.cjs sql "select count(*) from public.vagas where slug='<slug>'"   # espera-se 0
```

Prove também que o **portão morde**: troque o e-mail do autor por um inexistente e confirme que
sai `P0001: autor nao resolvido`. Um portão que você tornou incapaz de falhar é pior que o
quebrado.

## Aplicar

```bash
node p46apply.cjs migrate supabase/migrations/<arquivo>.sql
```

O SQL vai **lido do arquivo**, não transcrito — foi por transcrição que duas migrations do M8
chegaram a produção com os comentários descartados. A migration e a linha do ledger vão na
mesma requisição, logo na mesma transação: um apply que roda e não se registra é
indistinguível de um que não rodou.

Não é necessária a senha do banco. O token está no Keychain (serviço "Supabase CLI", conta
"supabase") ou em `SUPABASE_ACCESS_TOKEN`.

### Depois de aplicar, prove

```bash
node p46apply.cjs sql "
  select v.slug, v.status, v.created_by,
         (select count(*) from public.perguntas_formulario p
           where p.vaga_id = v.id and p.deleted_at is null) as perguntas,
         (select count(*) from public.perguntas_formulario p
           where p.vaga_id = v.id and p.deleted_at is null and p.created_by is null) as sem_autor
    from public.vagas v where v.slug = '<slug>'"
```

Esperado: `status = rascunho`, `created_by` não nulo, `sem_autor = 0`.
