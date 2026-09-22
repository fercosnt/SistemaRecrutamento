-- =============================================================================
-- 20260922000002 — as 16 colunas de proveniencia/analise + o predicado unico de
--                  «vigente»  (Phase 49 / Plano 49-01 / D-28, D-26, D-38..D-41)
-- =============================================================================
-- Phase 49 / Plano 49-01 · JORN-28 (proveniência real), JORN-07 (versão da
-- rubrica), JORN-12 (dono da análise de entrevista) · D-52 (via de apply) ·
-- D-55 (migration → EF → cliente: esta é a primeira etapa; quem grava são os
-- planos 49-08..49-11/49-23/49-24, quem lê são as telas 49-13/49-15/49-16/49-22).
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-22, só leitura).
--   · NENHUMA das 5 tabelas de resultado de IA guarda o provedor/modelo REAL da
--     chamada que a produziu. Quando o Sonnet falha, o resultado ainda sai do
--     `gpt-4o-mini` (`ai-client.ts:731-806`) e a linha do resultado não registra
--     a troca — a tela mostra o resultado como se fosse do modelo configurado.
--   · `redacoes_candidato.model_version` PARECE resolver isso e não resolve: ela
--     grava o modelo CONFIGURADO em `prompt_versions`
--     (`avaliar-redacao-cultural/index.ts:304,364`), não o que respondeu. O D-28
--     declara isso defeito. A coluna NÃO é removida (o trigger
--     `trg_redacao_rh_only_review_fields` e o veredito `export: false` a citam) e
--     passa a receber o modelo REAL a partir do deploy do 49-09; todo leitor NOVO
--     lê `modelo_ia`, nunca `model_version`.
--   · A única proveniência que sobrevive hoje é `ai_call_logs.model_snapshot`, que
--     a purga de 180 d apaga. Coluna na linha do resultado sobrevive à purga.
--   · A redação avaliada não registra QUAL rubrica foi enviada ao modelo — e até a
--     Phase 49 nenhuma âncora BARS era enviada (a «rubrica fantasma», JORN-07).
--     Sem essa coluna a tela não consegue distinguir as 2 avaliações antigas das
--     novas, e a nota consolidada de ambas pareceria significar o mesmo (D-26).
--   · `entrevista_analises` tem 6 linhas e NENHUM dono: não registra de QUAL
--     entrevista a transcrição veio (online/presencial), quem pediu a análise, que
--     texto foi analisado, qual linha do log o contém, nem qual análise vale. Os
--     leitores discordam entre si — a tela e a revisão pegam a mais NOVA, o portão
--     de avanço (`avancar_etapa`) olha TODAS — e uma análise que falhou vira «a
--     mais nova» (JORN-12, D-38..D-42).
--
-- POR QUE TUDO NULÁVEL (D-55 / Pitfall 3 do 49-RESEARCH). Entre este apply e o
-- deploy das EFs novas (planos 49-08..49-11), a EF VELHA continua gravando nessas
-- tabelas sem conhecer nenhuma destas colunas. Uma coluna obrigatória a derrubaria
-- em silêncio — o `audit-logger` engole erro de escrita, e o RH veria «análise não
-- salvou» sem causa. Nada aqui é obrigatório, e o bloco (f) PROVA isso lendo
-- `is_nullable` das 16. Apertar depois é aditivo; afrouxar depois de quebrar, não.
--
-- POR QUE NULL É A VERDADE NAS LINHAS ANTIGAS, E NADA É PREENCHIDO RETROATIVAMENTE
-- (D-30). A proveniência dos resultados já gerados é DESCONHECIDA — os comparativos
-- de 06/09 e 20/09 e 1 guia presencial saíram por fallback, e o log que o provaria
-- será purgado. Inventar `provedor_ia='anthropic'` neles seria uma afirmação falsa
-- com cara de dado. NULL = «proveniência desconhecida», e é o que a tela mostra.
-- Nenhuma linha é tocada por esta migration (o bloco (f) confere a contagem).
--
-- POR QUE `text` E NÃO O ENUM `public.llm_provider`. O enum ganhou `'none'` na
-- migration irmã `20260922000001` (JORN-39) para a linha de LOG das chamadas que
-- nunca saíram da EF. `'none'` não é provedor de RESULTADO: um resultado existe
-- porque algum modelo respondeu. Usar o enum importaria um valor que é inválido
-- neste domínio. O vocabulário fica fechado por CHECK nomeado, por tabela:
-- `provedor_ia IS NULL OR provedor_ia IN ('anthropic','openai')`.
--
-- POR QUE `solicitado_por`, E NÃO `solicitada_por` (desvio deliberado do RESEARCH
-- e do PATTERNS, que escrevem o feminino). A regra R2 do `pii-inventory.yaml:60`
-- casa por NOME LITERAL e lista `solicitado_por`; o fecho do
-- `export-scope-rules.yaml:380-402` exige que todo nome da R2 apareça em
-- `ponteiros.de_terceiro` — e `solicitado_por` JÁ está lá (`:396`). Com o nome
-- feminino, a coluna nasceria FORA da regra e o UUID de um FUNCIONÁRIO poderia
-- sair na cópia do titular até alguém editar os dois arquivos. Com o nome
-- masculino, o risco desaparece por construção (T-49-01-02).
--
-- POR QUE SEM FK EM `ai_call_log_id` E EM `solicitado_por`.
--   · `ai_call_log_id`: a linha do log é PURGADA em 180 d e o motor de exclusão a
--     redige — uma FK forçaria a escolha entre bloquear a purga e apagar a análise.
--     Precedente: `candidate_ai_decisions.ai_call_log_ids uuid[]`, também sem FK.
--     Consequência aceita (D-38): depois de 180 d o vínculo aponta para o vazio.
--   · `solicitado_por`: precedente `entrevista_analises.revisada_por uuid`, que
--     nasceu sem FK na mesma tabela (`20260624000001:90`).
--
-- POR QUE UMA FUNÇÃO PARA «VIGENTE», E NÃO O PREDICADO ESCRITO EM CADA LUGAR
-- (D-39). Quatro chamadores precisam da MESMA definição: o portão de avanço
-- (`avancar_etapa`, plano 49-06), a RPC que grava a análise e as duas RPCs de
-- revisão humana (plano 49-10). Hoje eles JÁ discordam entre si, e é exatamente
-- essa a lacuna do JORN-12: quatro cópias de um predicado divergem em silêncio.
-- `public.entrevista_analise_vigente` é a única definição, no molde de
-- `public.candidatura_encerrada` (Phase 48): SQL, IMMUTABLE, `SET search_path = ''`,
-- sem leitura de tabela — só compara os três argumentos.
--
-- «VIGENTE» = não superada E não falhou E com competências. `superada_em IS NULL`
-- porque a análise anterior é MARCADA, nunca apagada (D-02/D-39, e o D4 exige que
-- ela siga acessível). `status_analise IS DISTINCT FROM 'falhou'` — medido:
-- `entrevista_analises` NÃO tem CHECK em `status_analise` (0 constraints de CHECK
-- na tabela), então `'falhou'` é gravável; os valores vivos hoje são `concluida` e
-- `pendente_humano`. O `IS DISTINCT FROM` (não `<>`) é o que faz NULL contar como
-- «não falhou». `competencias IS NOT NULL` porque análise sem competências não tem
-- o que pesar (RNF-07a: nada entra na consolidação sem substância).
--
-- AUTHZ. Nenhuma policy nova. As colunas herdam o GRANT de TABELA já existente
-- (medido: os grants das 5 tabelas são de tabela, não de coluna — 15/15, 30/30 etc.
-- para `anon`/`authenticated`/`service_role`), logo a exposição de cada coluna nova
-- é exatamente a da tabela que a contém, governada por RLS. A função: `REVOKE ALL
-- … FROM PUBLIC, anon` com `anon` NOMEADO — o `pg_default_acl` de `public` concede
-- EXECUTE a `anon` como grant DIRETO e `FROM PUBLIC` sozinho não o remove
-- (`20260805000009:150-153`) — e `GRANT EXECUTE … TO authenticated, service_role`.
--
-- ERRO: `check_violation` (23514) num provedor fora do vocabulário ou num `tipo`
-- fora de `{online,presencial}`. Os blocos DO levantam `raise_exception` (P0001).
--
-- IDEMPOTÊNCIA: nenhuma nos `ADD COLUMN`, de propósito (idioma de
-- `20260921000004` §IDEMPOTÊNCIA): `IF NOT EXISTS` transformaria «já existe com
-- outra forma» em no-op silencioso. Um segundo apply falha alto na primeira linha,
-- e o `p46apply.cjs` recusa reaplicar uma `version` que já está no ledger. A função
-- é `CREATE OR REPLACE` porque nasce aqui (nenhum corpo vivo a preservar — medido:
-- `to_regprocedure` nulo na abertura).
--
-- CÓPIA LGPD (D-57, precedente 48-17): os itens 3–9 do checklist (catálogo vivo,
-- veredito de export, inventário PII, recibo de exclusão, allowlist + espelhos,
-- os dois VALUES do drift e os snapshots) são do plano 49-17. Até lá,
-- `docs/compliance/sql/05-export-allowlist-drift.sql` acusa estas 16 colunas como
-- SEM VEREDITO — e elas NÃO saem na cópia, porque a cópia exporta por allowlist
-- (fail-safe). É o mesmo estado que a Phase 48 atravessou entre 48-11 e 48-17.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo `$$` com
-- REVOKE/GRANT/COMMENT adjacentes é a forma exata do 42601, e o endpoint já roda o
-- corpo inteiro numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000002_p49_colunas_proveniencia_e_analise.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação,
-- md5 de statements[1] conferido por leitura de volta).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- (a) Proveniência real nas 5 tabelas de resultado (D-28) — 10 colunas + 5 CHECKs
-- ---------------------------------------------------------------------------
ALTER TABLE public.analise_candidato_vaga
  ADD COLUMN provedor_ia text,
  ADD COLUMN modelo_ia text;

ALTER TABLE public.analise_candidato_vaga
  ADD CONSTRAINT analise_candidato_vaga_provedor_ia_check
    CHECK (provedor_ia IS NULL OR provedor_ia IN ('anthropic', 'openai'));

ALTER TABLE public.comparativo_solicitado
  ADD COLUMN provedor_ia text,
  ADD COLUMN modelo_ia text;

ALTER TABLE public.comparativo_solicitado
  ADD CONSTRAINT comparativo_solicitado_provedor_ia_check
    CHECK (provedor_ia IS NULL OR provedor_ia IN ('anthropic', 'openai'));

ALTER TABLE public.entrevista_guias
  ADD COLUMN provedor_ia text,
  ADD COLUMN modelo_ia text;

ALTER TABLE public.entrevista_guias
  ADD CONSTRAINT entrevista_guias_provedor_ia_check
    CHECK (provedor_ia IS NULL OR provedor_ia IN ('anthropic', 'openai'));

ALTER TABLE public.entrevista_analises
  ADD COLUMN provedor_ia text,
  ADD COLUMN modelo_ia text;

ALTER TABLE public.entrevista_analises
  ADD CONSTRAINT entrevista_analises_provedor_ia_check
    CHECK (provedor_ia IS NULL OR provedor_ia IN ('anthropic', 'openai'));

ALTER TABLE public.redacoes_candidato
  ADD COLUMN provedor_ia text,
  ADD COLUMN modelo_ia text;

ALTER TABLE public.redacoes_candidato
  ADD CONSTRAINT redacoes_candidato_provedor_ia_check
    CHECK (provedor_ia IS NULL OR provedor_ia IN ('anthropic', 'openai'));


-- ---------------------------------------------------------------------------
-- (b) A versão da rubrica enviada ao modelo na redação (D-26 / JORN-07)
-- ---------------------------------------------------------------------------
ALTER TABLE public.redacoes_candidato
  ADD COLUMN rubrica_versao text;


-- ---------------------------------------------------------------------------
-- (c) O dono da análise de entrevista (D-38, D-39, D-41 / JORN-12) — 5 colunas
--     SEM FK em ai_call_log_id (log purgado em 180 d) nem em solicitado_por
--     (precedente revisada_por, mesma tabela).
-- ---------------------------------------------------------------------------
ALTER TABLE public.entrevista_analises
  ADD COLUMN tipo text,
  ADD COLUMN solicitado_por uuid,
  ADD COLUMN texto_hash text,
  ADD COLUMN ai_call_log_id uuid,
  ADD COLUMN superada_em timestamptz;

ALTER TABLE public.entrevista_analises
  ADD CONSTRAINT entrevista_analises_tipo_check
    CHECK (tipo IS NULL OR tipo IN ('online', 'presencial'));


-- ---------------------------------------------------------------------------
-- (d) O predicado ÚNICO de «vigente» (D-39). Uma definição, quatro chamadores.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.entrevista_analise_vigente(
  p_superada_em    timestamptz,
  p_status_analise text,
  p_competencias   jsonb
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $entrevista_analise_vigente$
  SELECT p_superada_em IS NULL
     AND p_status_analise IS DISTINCT FROM 'falhou'
     AND p_competencias IS NOT NULL
$entrevista_analise_vigente$;

REVOKE ALL ON FUNCTION public.entrevista_analise_vigente(timestamptz, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entrevista_analise_vigente(timestamptz, text, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.entrevista_analise_vigente(timestamptz, text, jsonb) IS
  'Phase 49 / JORN-12 / D-39: a UNICA definicao de «analise de entrevista vigente». '
  'Vigente = nao superada (superada_em IS NULL) E nao falhou (status_analise IS DISTINCT '
  'FROM ''falhou'' — IS DISTINCT FROM para que NULL conte como nao-falhou) E com '
  'competencias presentes (RNF-07a: nada entra na consolidacao sem substancia). '
  'CHAMADORES: avancar_etapa (a bandeira de bloqueio de avanco, plano 49-06), a RPC de '
  'gravacao da analise e as duas RPCs de revisao humana — salvar_avaliacao_entrevista e '
  'confirmar_revisao_entrevista (plano 49-10). POR QUE FUNCAO E NAO O PREDICADO REESCRITO '
  'EM CADA LUGAR: antes da Phase 49 esses leitores DISCORDAVAM — a tela e a revisao pegavam '
  'a mais nova, o portao de avanco olhava TODAS, e uma analise que falhou virava «a mais '
  'nova». Quatro copias de um predicado divergem em silencio; esta e a correcao estrutural. '
  'Molde: public.candidatura_encerrada (Phase 48) — SQL, IMMUTABLE, search_path vazio, '
  'nenhuma leitura de tabela, so compara os tres argumentos.';


-- ---------------------------------------------------------------------------
-- (e) COMMENT por coluna nova — o que NULL significa, e por que nao e outra coisa
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.analise_candidato_vaga.provedor_ia IS
  'Phase 49 / JORN-28 / D-28: provedor que REALMENTE respondeu esta analise (anthropic|openai, '
  'vocabulario fechado por CHECK). Vem da resposta do SDK, nunca do configurado em '
  'prompt_versions. NULL = proveniencia DESCONHECIDA: e o valor das linhas anteriores ao deploy '
  'da EF nova, e nada e preenchido retroativamente (D-30) — inventar o provedor seria afirmacao '
  'falsa com cara de dado. Sobrevive a purga de 180 d do ai_call_logs, que e a unica proveniencia '
  'que existia antes.';

COMMENT ON COLUMN public.analise_candidato_vaga.modelo_ia IS
  'Phase 49 / JORN-28 / D-28: modelo que REALMENTE respondeu (response.model do SDK, o mesmo '
  'valor que o audit-logger grava em ai_call_logs.model_snapshot). NULL = desconhecido (D-30). '
  'E a proveniencia canonica lida pelo selo das telas (planos 49-13/49-15/49-16/49-22) — '
  'nenhum leitor novo le o modelo configurado.';

COMMENT ON COLUMN public.comparativo_solicitado.provedor_ia IS
  'Phase 49 / JORN-28 / D-28: provedor REAL deste comparativo (anthropic|openai por CHECK). '
  'NULL = desconhecida — inclui os comparativos de 06/09 e 20/09, que a medicao identificou como '
  'gerados por fallback e que ficam como estao (D-30). O selo do PDF exportado le esta coluna.';

COMMENT ON COLUMN public.comparativo_solicitado.modelo_ia IS
  'Phase 49 / JORN-28 / D-28: modelo REAL deste comparativo (response.model). NULL = desconhecido '
  '(D-30, sem escrita retroativa).';

COMMENT ON COLUMN public.entrevista_guias.provedor_ia IS
  'Phase 49 / JORN-28 / D-28: provedor REAL deste guia (anthropic|openai por CHECK). NULL = '
  'desconhecida — inclui o guia presencial que a medicao identificou como gerado por fallback '
  '(D-30).';

COMMENT ON COLUMN public.entrevista_guias.modelo_ia IS
  'Phase 49 / JORN-28 / D-28: modelo REAL deste guia (response.model). NULL = desconhecido (D-30).';

COMMENT ON COLUMN public.entrevista_analises.provedor_ia IS
  'Phase 49 / JORN-28 / D-28: provedor REAL desta analise de transcricao (anthropic|openai por '
  'CHECK). NULL = desconhecida (D-30, nenhuma das 6 linhas vivas e tocada por esta migration).';

COMMENT ON COLUMN public.entrevista_analises.modelo_ia IS
  'Phase 49 / JORN-28 / D-28: modelo REAL desta analise (response.model). NULL = desconhecido '
  '(D-30).';

COMMENT ON COLUMN public.redacoes_candidato.provedor_ia IS
  'Phase 49 / JORN-28 / D-28: provedor REAL desta avaliacao de redacao (anthropic|openai por '
  'CHECK). NULL = desconhecida (D-30). NAO CONFUNDIR COM model_version, que grava o modelo '
  'CONFIGURADO em prompt_versions (avaliar-redacao-cultural/index.ts:304,364) e que o D-28 '
  'declara defeito: model_version fica (o trigger trg_redacao_rh_only_review_fields e o veredito '
  'de export a citam) e passa a receber o modelo REAL a partir do 49-09, mas todo leitor NOVO le '
  'modelo_ia/provedor_ia.';

COMMENT ON COLUMN public.redacoes_candidato.modelo_ia IS
  'Phase 49 / JORN-28 / D-28: modelo REAL desta avaliacao (response.model). NULL = desconhecido '
  '(D-30). E esta coluna, nao model_version, que o selo de proveniencia le.';

COMMENT ON COLUMN public.redacoes_candidato.rubrica_versao IS
  'Phase 49 / JORN-07 / D-26: versao da rubrica BARS que foi REALMENTE enviada ao modelo nesta '
  'avaliacao (ex.: bars-prd-1.1, a constante versionada de _shared/bars-redacao.ts). NULL = '
  'redacao avaliada ANTES de a rubrica ser enviada ao modelo — a «rubrica fantasma»: o prompt '
  'mandava usar ancoras BARS que nunca chegavam no input. As 2 avaliacoes antigas (ambas de conta '
  'de teste) ficam NULL, sem escrita retroativa (D-26), e e por esta coluna que a tela de revisao '
  'distingue o que a nota consolidada de cada uma significa.';

COMMENT ON COLUMN public.entrevista_analises.tipo IS
  'Phase 49 / JORN-12 / D-41: de qual entrevista veio a transcricao analisada — online|presencial '
  '(vocabulario fechado por CHECK; o mesmo par de CTAs da aba do guia). Quem escolhe e o RH na aba '
  'da transcricao, com a etapa atual como padrao: e isso que LIGA a analise a uma entrevista. '
  'NULL = analise anterior a Phase 49, cujo tipo nunca foi registrado (as 6 linhas vivas ficam '
  'assim); nao e «indefinido no produto».';

COMMENT ON COLUMN public.entrevista_analises.solicitado_por IS
  'Phase 49 / JORN-12 / D-38: funcionario (RH/admin) que pediu esta analise. SEM FK, precedente '
  'revisada_por nesta mesma tabela (20260624000001:90). E UUID DE TERCEIRO, nao do titular: o nome '
  'literal solicitado_por esta na regra R2 do pii-inventory.yaml e em ponteiros.de_terceiro do '
  'export-scope-rules.yaml, e e por isso que ele foi escolhido em vez de solicitada_por — assim o '
  'UUID de funcionario fica fora da copia do titular POR CONSTRUCAO, sem depender de edicao futura. '
  'NULL = analise anterior a Phase 49 (autor nao registrado).';

COMMENT ON COLUMN public.entrevista_analises.texto_hash IS
  'Phase 49 / JORN-12 / D-38: sha256 do texto mascarado que foi analisado — o MESMO valor de '
  'ai_call_logs.input_hash da chamada correspondente. NENHUMA COLUNA DE CONTEUDO NOVA: o texto '
  'segue onde ja esta (ai_call_logs.user_prompt_template, so admin, 180 d). Serve para reanalisar '
  'o mesmo texto NAO criar linha nova (D-40): texto igual devolve a analise existente. '
  'NULL = analise anterior a Phase 49.';

COMMENT ON COLUMN public.entrevista_analises.ai_call_log_id IS
  'Phase 49 / JORN-12 / D-38: id da linha de ai_call_logs que contem o texto mascarado analisado. '
  'SEM FK de proposito: esse log e PURGADO em 180 d e o motor de exclusao o redige — uma FK '
  'forcaria escolher entre bloquear a purga e apagar a analise. Precedente sem FK: '
  'candidate_ai_decisions.ai_call_log_ids uuid[]. CONSEQUENCIA ACEITA (D-38): depois de 180 d o '
  'vinculo aponta para o vazio e o RH nao le o texto. NULL = analise anterior a Phase 49.';

COMMENT ON COLUMN public.entrevista_analises.superada_em IS
  'Phase 49 / JORN-12 / D-39 / D-02: quando esta analise deixou de ser a vigente, por ter sido '
  'substituida por uma analise mais nova do mesmo tipo. MARCAR, NAO APAGAR: a analise superada '
  'segue visivel e acessivel, com quem revisou e quando (D-42/D4). NULL = vigente, OU nunca '
  'vigente (analise que falhou). Quem decide «vigente» e a funcao '
  'public.entrevista_analise_vigente, nunca esta coluna sozinha. A marcacao das 6 linhas vivas '
  'e do plano 49-12, com checkpoint do operador — esta migration nao toca nenhuma linha.';


-- ---------------------------------------------------------------------------
-- (f) Auto-verificacao por CATALOGO do que ficou instalado. Aborta a transacao
--     INTEIRA (DDL inclusive) se qualquer afirmacao do cabecalho for falsa.
-- ---------------------------------------------------------------------------
DO $portao_p49_01$
DECLARE
  v_n_colunas   int;
  v_n_nulaveis  int;
  v_n_text      int;
  v_n_uuid      int;
  v_n_tstz      int;
  v_n_checks    int;
  v_volatil     "char";
  v_anon_pode   boolean;
  v_linhas      bigint;
BEGIN
  -- as 16 colunas, todas presentes e todas NULAVEIS (D-55 / Pitfall 3)
  SELECT count(*),
         count(*) FILTER (WHERE c.is_nullable = 'YES'),
         count(*) FILTER (WHERE c.udt_name = 'text'),
         count(*) FILTER (WHERE c.udt_name = 'uuid'),
         count(*) FILTER (WHERE c.udt_name = 'timestamptz')
    INTO v_n_colunas, v_n_nulaveis, v_n_text, v_n_uuid, v_n_tstz
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND (
          (c.column_name IN ('provedor_ia', 'modelo_ia')
             AND c.table_name IN ('analise_candidato_vaga', 'comparativo_solicitado',
                                  'entrevista_guias', 'entrevista_analises', 'redacoes_candidato'))
       OR (c.table_name = 'redacoes_candidato' AND c.column_name = 'rubrica_versao')
       OR (c.table_name = 'entrevista_analises'
             AND c.column_name IN ('tipo', 'solicitado_por', 'texto_hash', 'ai_call_log_id', 'superada_em'))
         );

  IF v_n_colunas <> 16 THEN
    RAISE EXCEPTION 'P49-01 PORTAO: % coluna(s) instalada(s), esperado 16', v_n_colunas;
  END IF;
  IF v_n_nulaveis <> 16 THEN
    RAISE EXCEPTION 'P49-01 PORTAO: apenas % das 16 colunas sao NULAVEIS — uma coluna obrigatoria derrubaria a EF velha entre esta migration e o deploy da nova (D-55)', v_n_nulaveis;
  END IF;
  IF v_n_text <> 13 OR v_n_uuid <> 2 OR v_n_tstz <> 1 THEN
    RAISE EXCEPTION 'P49-01 PORTAO: tipos divergentes — text=% (esperado 13), uuid=% (esperado 2), timestamptz=% (esperado 1)', v_n_text, v_n_uuid, v_n_tstz;
  END IF;

  -- as 6 CHECKs nomeadas
  SELECT count(*) INTO v_n_checks
    FROM pg_catalog.pg_constraint
   WHERE conname IN ('analise_candidato_vaga_provedor_ia_check',
                     'comparativo_solicitado_provedor_ia_check',
                     'entrevista_guias_provedor_ia_check',
                     'entrevista_analises_provedor_ia_check',
                     'redacoes_candidato_provedor_ia_check',
                     'entrevista_analises_tipo_check');
  IF v_n_checks <> 6 THEN
    RAISE EXCEPTION 'P49-01 PORTAO: % CHECK(s) de vocabulario, esperado 6', v_n_checks;
  END IF;

  -- o predicado unico: existe, e IMMUTABLE, e `anon` NAO o executa
  SELECT p.provolatile INTO v_volatil
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.entrevista_analise_vigente(timestamptz,text,jsonb)'::regprocedure;
  IF v_volatil IS DISTINCT FROM 'i' THEN
    RAISE EXCEPTION 'P49-01 PORTAO: entrevista_analise_vigente tem provolatile = %, esperado i (IMMUTABLE)', v_volatil;
  END IF;

  SELECT has_function_privilege('anon', 'public.entrevista_analise_vigente(timestamptz,text,jsonb)', 'EXECUTE')
    INTO v_anon_pode;
  IF v_anon_pode THEN
    RAISE EXCEPTION 'P49-01 PORTAO: anon ainda executa entrevista_analise_vigente — o REVOKE com anon NOMEADO nao pegou';
  END IF;

  -- a funcao responde o que o cabecalho afirma (tabela-verdade minima)
  IF NOT public.entrevista_analise_vigente(NULL, 'concluida', '{"x":1}'::jsonb) THEN
    RAISE EXCEPTION 'P49-01 PORTAO: analise nao superada, nao falhada e com competencias deveria ser vigente';
  END IF;
  IF public.entrevista_analise_vigente(now(), 'concluida', '{"x":1}'::jsonb) THEN
    RAISE EXCEPTION 'P49-01 PORTAO: analise superada NAO pode ser vigente';
  END IF;
  IF public.entrevista_analise_vigente(NULL, 'falhou', '{"x":1}'::jsonb) THEN
    RAISE EXCEPTION 'P49-01 PORTAO: analise que falhou NAO pode ser vigente';
  END IF;
  IF public.entrevista_analise_vigente(NULL, 'concluida', NULL) THEN
    RAISE EXCEPTION 'P49-01 PORTAO: analise sem competencias NAO pode ser vigente';
  END IF;
  IF NOT public.entrevista_analise_vigente(NULL, NULL, '{"x":1}'::jsonb) THEN
    RAISE EXCEPTION 'P49-01 PORTAO: status NULL deve contar como nao-falhou (IS DISTINCT FROM)';
  END IF;

  -- nenhuma linha tocada: a marcacao das 6 e do plano 49-12, com checkpoint
  SELECT count(*) INTO v_linhas FROM public.entrevista_analises;
  IF v_linhas <> 6 THEN
    RAISE EXCEPTION 'P49-01 PORTAO: entrevista_analises tem % linha(s), medido 6 antes do apply — esta migration nao escreve nem apaga linha', v_linhas;
  END IF;

  RAISE NOTICE 'P49-01 OK: 16 colunas nulaveis (text=% uuid=% timestamptz=%), 6 CHECKs, entrevista_analise_vigente IMMUTABLE e fechada para anon, % linha(s) em entrevista_analises intocada(s)',
    v_n_text, v_n_uuid, v_n_tstz, v_linhas;
END
$portao_p49_01$;
