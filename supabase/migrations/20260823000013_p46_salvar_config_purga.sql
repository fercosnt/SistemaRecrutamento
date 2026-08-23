-- =============================================================================
-- Phase 46 / Plano 46-07 — PURGA-04 · PURGA-05 · D-46-05/14/22
-- `public.salvar_config_purga`: a UNICA porta de escrita da configuracao da
-- purga — e o portao que RECUSA, no SERVIDOR, o flip `dry_run -> live`.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NAO APAGA NADA, NAO CRIA TABELA, NAO CRIA COLUNA, NAO CRIA
-- CRON, NAO TOCA EM NENHUM GUARD EXISTENTE, NAO GRAVA NENHUMA LINHA E NAO LIGA
-- A PURGA.** Ela cria UMA funcao. `config_purga.modo` continua exatamente onde
-- estava quando o apply comecou — ligar o dry-run e ato humano, separado, feito
-- CHAMANDO esta funcao depois do apply, e nunca efeito colateral dele.
--
-- Nenhum `DELETE`, nenhum `DROP`, nenhum `INSERT`, nenhum `UPDATE`, nenhum
-- `ALTER`, nenhum agendamento.
--
-- -----------------------------------------------------------------------------
-- (0) POR QUE ESTA FUNCAO EXISTE, E POR QUE ELA E RPC E NAO POLICY
-- -----------------------------------------------------------------------------
-- PURGA-04 exige que o flip para destruicao real seja **checkpoint separado e
-- evidenciado**, nunca efeito colateral de um deploy. D-46-05 poe o modo numa
-- TABELA, e nao num secret de projeto, exatamente por isso: um secret muda sem
-- deixar trilha e **nao recusa nada**; uma linha alterada por RPC deixa trilha
-- atomica e **PODE RECUSAR**.
--
-- Uma policy de `UPDATE` em `public.config_purga` seria menos codigo e entregaria
-- "administrador altera pela tela". Ela nao entrega NENHUMA das outras duas
-- coisas que o requirement pede na mesma respiracao:
--
--   · **Trilha atomica.** Uma policy nao escreve linha de trilha. Um trigger
--     chegaria perto, mas roda DEPOIS da decisao e portanto nao pode recusar.
--   · **Recusa server-side dos criterios de D-46-14 e D-46-22.** O checklist do
--     runbook e a tela do administrador sao cosmeticos por definicao: **uma regra
--     que so vive na tela e uma regra que nao existe** — a licao que a Phase 43
--     ja pagou com o teto de 24 meses (`20260801000002:372-380`).
--
-- ⚠⚠ E A ASSIMETRIA QUE GOVERNA O ARQUIVO INTEIRO, dita aqui antes de qualquer
--    codigo: os criterios valem **APENAS** para a entrada em `live`. A transicao
--    **para `off` nao passa pelo portao** — nao exige confirmacao, nao consulta o
--    ledger e nao consulta a matriz. **Um kill switch que pode ser recusado nao e
--    um kill switch**, e o instante em que ele mais importa e exatamente aquele
--    em que algum criterio estaria falhando.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE pelo ORQUESTRADOR, pela via da Management API com o SQL
-- LIDO DO ARQUIVO (CLAUDE.md §"Via de apply ATUAL" — `node p46apply.cjs migrate`).
-- **NAO ha reparo de `version` a fazer**: por aquela via ela nasce correta, do
-- nome do arquivo. As instrucoes de reparo que ainda vivem nos cabecalhos das
-- migrations `20260823000001`..`4` estao OBSOLETAS e foram condenadas pela rodada
-- 4 do review do 46-04 (RD4-02); corrigi-las la faria o md5 divergir do ledger e
-- quebraria a propria prova, e por isso a correcao vive no CLAUDE.md.
--
-- Sem par de transacao explicita no topo deste arquivo, e corpos em delimitadores
-- NOMEADOS: o driver ja envolve cada migration na sua propria transacao, e um par
-- externo adjacente a `COMMENT` / `REVOKE` / `GRANT` e o gatilho do SQLSTATE
-- 42601 (CLAUDE.md §Migrations).
--
-- Conferencia obrigatoria, os DOIS lados registrados:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000013';
--   -- comparar com:  printf '%s' "$(cat supabase/migrations/20260823000013_*.sql)" | md5
--
-- ⚠ AQUI A PERDA DE COMENTARIO NAO E BENIGNA: o `COMMENT ON FUNCTION` desta
-- funcao e o unico lugar DENTRO DO BANCO onde fica escrito que `-> off` nao passa
-- pelo portao. Quem for desligar a purga as tres da manha le o catalogo, nao o
-- planning.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NAO
-- -----------------------------------------------------------------------------
--   · `20260801000002_p43_config_retencao.sql:322-438` — o MOLDE INTEGRAL:
--     `SECURITY DEFINER` `VOLATILE` com `search_path` vazio; guard de papel
--     NULL-safe por diferenca explicita; ator resolvido no SERVIDOR contra
--     `public.usuarios_rh`; validacao de dominio com SQLSTATE proprio; leitura do
--     estado anterior com bloqueio de linha; nao-op como RECUSA; mutacao e trilha
--     no MESMO corpo.
--
--   · `20260801000002:167-184` — os dois `COMMENT` que declaram, DENTRO DO BANCO
--     e desde a Phase 43, que a Phase 46 nao pode ligar a purga enquanto a matriz
--     estiver em procedencia de seed. O passo (6.c) abaixo e a execucao daquela
--     frase; ate hoje ela era um pressuposto escrito.
--
--   · `20260823000006:1033+` — o idioma do bloco de auto-verificacao que ABORTA o
--     apply quando um pressuposto do corpo nao vale no banco de destino.
--
--   · ⚠ **NAO foi copiada a checagem de `p_meses IS NULL` como INVALIDO**
--     (`20260801000002:377`). La um parametro nulo era erro; aqui ele significa
--     "nao alterar este campo", porque a funcao escreve tres campos independentes
--     e obrigar o chamador a reenviar os outros dois transformaria "mudar o cap"
--     numa oportunidade de mudar o modo por descuido. A validacao abaixo trata
--     NULL EXPLICITAMENTE em vez de deixa-lo cair por NULL-cegueira.
--
--   · ⚠ **NAO foi copiada nenhuma forma de negacao por pertencimento a conjunto**
--     (o idioma difundido `NOT` + conjunto de valores). Ele e NULL-CEGO: com a
--     claim ausente a expressao avalia NULL, o `IF` nao e tomado e o guard FALHA
--     ABERTO. Nao e hipotese — sao 61 funcoes `SECURITY DEFINER` deste schema com
--     EXECUTE para `anon`
--     (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
--
-- -----------------------------------------------------------------------------
-- (3) ORDEM DO CORPO, E O SQLSTATE DE CADA RECUSA
-- -----------------------------------------------------------------------------
--   (1) papel diferente de administrador, ou SEM claim nenhuma ......... 42501
--   (2) nenhuma conta VIVA de RH correspondendo ao chamador ............ 42501
--   (3) `p_modo` fora do vocabulario, cap fora de 1..500,
--       janela fora de 1..120 ......................................... 22023
--   (4) leitura do estado anterior com bloqueio da linha .............. (nao recusa)
--   (5) nada a alterar ................................................ 22023
--   (6) ⚠ O PORTAO DO FLIP — SO quando o modo novo e `live`:
--       (a) sem o argumento explicito de confirmacao .................. 22023
--       (b) criterios de D-46-14 (dias, execucoes, conjunto nao-vazio) . 22023
--       (c) pre-condicao de D-46-22 (matriz em procedencia de seed) ... 22023
--   (7) a mutacao  ·  (8) a trilha, no MESMO corpo .................... (nao recusa)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0 · AUTO-VERIFICACAO DE APPLY — os pressupostos que o corpo abaixo NAO mede
-- ---------------------------------------------------------------------------
-- Molde: `20260823000006:1033+`. Tres familias de pressuposto, e as tres abortam
-- o apply em vez de virarem defeito silencioso na primeira chamada real:
--
--   (i)   as relacoes que o corpo le existem, e `config_retencao_etapa` ja tem a
--         coluna `elegivel_purga` (nascida em `20260823000001`);
--   (ii)  os rotulos de enum que a chamada da trilha usa sao rotulos VIVOS. Eles
--         foram MEDIDOS (`database.types.ts:5799-5809` e `:5852`, gerado do banco
--         vivo), e nao inventados; este bloco e o que impede a medicao de
--         envelhecer em silencio — um rotulo removido faria a funcao levantar
--         `22P02` na primeira mudanca de modo, que e a hora errada de descobrir;
--   (iii) ⚠⚠ `public.config_purga` continua com RLS LIGADA e **ZERO policy de
--         escrita**. Este e o pressuposto que sustenta T-46-07-01 inteiro: a
--         afirmacao "nenhum caminho de deploy altera o modo" so e verdadeira
--         enquanto esta funcao for o UNICO caminho de escrita. Uma policy de
--         `UPDATE` acrescentada por conveniencia daria escrita SEM trilha e SEM
--         recusa — as duas coisas que PURGA-04 exige na mesma respiracao — e este
--         bloco a transforma em apply reprovado, com o nome da policy na mensagem.
DO $verifica_pressupostos_config_purga$
DECLARE
  v_falta      text;
  v_tem_col    boolean;
  v_rls_on     boolean;
  v_escrita_n  int;
  v_escrita    text;
  v_sev_falta  text;
  v_cat_falta  text;
BEGIN
  -- ── (i) as relacoes ────────────────────────────────────────────────────────
  v_falta := NULL;
  IF pg_catalog.to_regclass('public.config_purga') IS NULL THEN
    v_falta := 'public.config_purga (migration 20260823000001)';
  ELSIF pg_catalog.to_regclass('public.purga_execucoes') IS NULL THEN
    v_falta := 'public.purga_execucoes (migration 20260823000002)';
  ELSIF pg_catalog.to_regclass('public.config_retencao_etapa') IS NULL THEN
    v_falta := 'public.config_retencao_etapa (migration 20260801000002)';
  ELSIF pg_catalog.to_regclass('public.usuarios_rh') IS NULL THEN
    v_falta := 'public.usuarios_rh — sem ela o ator nao e resolvivel no servidor';
  END IF;

  IF v_falta IS NOT NULL THEN
    RAISE EXCEPTION 'P46-CFG: % NAO existe. O corpo desta funcao LE essa relacao, e uma funcao que referencia relacao inexistente falha na PRIMEIRA chamada real — que e quando ja nao ha ninguem lendo o log. Aplicar as migrations anteriores da fase ANTES desta', v_falta;
  END IF;

  SELECT count(*) > 0 INTO v_tem_col
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = pg_catalog.to_regclass('public.config_retencao_etapa')
     AND a.attname = 'elegivel_purga'
     AND a.attnum > 0
     AND NOT a.attisdropped;

  IF NOT coalesce(v_tem_col, false) THEN
    RAISE EXCEPTION 'P46-CFG: public.config_retencao_etapa NAO tem a coluna elegivel_purga (migration 20260823000001). Sem ela a pre-condicao de D-46-22 nao tem como cruzar "etapa da allowlist" com "procedencia do valor", e o portao do flip passaria a medir a matriz INTEIRA — oito linhas em vez de tres — recusando por linhas que a purga nunca alcanca';
  END IF;

  -- ── (ii) os rotulos de enum, MEDIDOS e nao presumidos ──────────────────────
  SELECT string_agg(f.rotulo, ', ') INTO v_sev_falta
    FROM (VALUES ('aviso'::text), ('critico'::text)) AS f(rotulo)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_catalog.pg_enum e
       JOIN pg_catalog.pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'severidade_log' AND e.enumlabel = f.rotulo
   );

  SELECT string_agg(f.rotulo, ', ') INTO v_cat_falta
    FROM (VALUES ('configuracao'::text)) AS f(rotulo)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_catalog.pg_enum e
       JOIN pg_catalog.pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'categoria_log_auditoria' AND e.enumlabel = f.rotulo
   );

  IF v_sev_falta IS NOT NULL OR v_cat_falta IS NOT NULL THEN
    RAISE EXCEPTION 'P46-CFG: rotulo(s) de enum ausente(s) no banco vivo — severidade_log: [%], categoria_log_auditoria: [%]. Os valores usados pela chamada da trilha foram MEDIDOS em database.types.ts (gerado do banco), e este bloco existe para que a medicao nao envelheca em silencio: um rotulo que sumiu faria a funcao levantar 22P02 na PRIMEIRA mudanca de modo — e a primeira mudanca de modo e justamente o flip que ninguem quer descobrir quebrado',
      coalesce(v_sev_falta, 'nenhum ausente'), coalesce(v_cat_falta, 'nenhum ausente');
  END IF;

  -- ── (iii) RLS ligada e ZERO policy de escrita em config_purga ──────────────
  -- ⚠ A pergunta e sobre a FORMA da policy (o comando dela), e nao sobre uma
  -- lista de nomes conhecidos: uma lista de nomes envelhece em silencio no dia em
  -- que alguem cria uma policy com nome novo. `cmd <> 'SELECT'` alcanca INSERT,
  -- UPDATE, DELETE e ALL — inclusive a policy de nome que ninguem previu.
  SELECT c.relrowsecurity INTO v_rls_on
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'config_purga';

  IF NOT coalesce(v_rls_on, false) THEN
    RAISE EXCEPTION 'P46-CFG: RLS NAO esta ligada em public.config_purga. Com a RLS desligada, qualquer papel com privilegio de tabela escreve o modo direto — e a afirmacao de que esta funcao e o unico caminho de escrita (T-46-07-01) deixa de ser verdadeira no instante do apply';
  END IF;

  SELECT count(*), coalesce(string_agg(p.policyname || ':' || p.cmd, ', '), '')
    INTO v_escrita_n, v_escrita
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public'
     AND p.tablename = 'config_purga'
     AND p.cmd <> 'SELECT';

  IF v_escrita_n > 0 THEN
    RAISE EXCEPTION 'P46-CFG: existe(m) % policy(ies) de ESCRITA em public.config_purga [%]. Ha um segundo caminho que altera o modo SEM deixar trilha e SEM poder RECUSAR — as duas coisas que PURGA-04 exige na mesma respiracao. O apply para AQUI: instalar o portao do flip por cima de uma porta aberta seria criar a APARENCIA do cerco',
      v_escrita_n, v_escrita;
  END IF;

  RAISE NOTICE 'P46-CFG: pressupostos conferidos — relacoes presentes, elegivel_purga presente, rotulos de enum vivos, RLS ligada e ZERO policy de escrita em config_purga';
END $verifica_pressupostos_config_purga$;


-- ---------------------------------------------------------------------------
-- 1 · public.salvar_config_purga — a escrita AUDITADA e o flip RECUSAVEL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.salvar_config_purga(
  p_modo                      text,
  p_cap_titulares             integer,
  p_janela_notificacoes_meses integer,
  p_confirmo_live             boolean
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $salvar_config_purga$
DECLARE
  v_actor        uuid;

  -- estado anterior, lido sob bloqueio
  v_antes        jsonb;
  v_depois       jsonb;
  v_modo_antes   text;
  v_cap_antes    integer;
  v_janela_antes integer;

  -- estado efetivo (parametro nulo = "nao alterar este campo")
  v_modo_novo    text;
  v_cap_novo     integer;
  v_janela_nova  integer;

  -- o portao do flip
  v_virando_live boolean;
  v_primeira     timestamptz;
  v_total        bigint;
  v_tem_14_exec  boolean;
  v_com_eleg     bigint;
  v_tem_14_dias  boolean;
  v_allow_n      bigint;
  v_seed_n       bigint;
  v_seed_nomes   text;
  v_faltas       text;

  v_sev          public.severidade_log;
BEGIN
  -- ═══ (1) GUARD DE PAPEL, NULL-SAFE ════════════════════════════════════════
  --
  -- ⚠ A comparacao e por DIFERENCA EXPLICITA, e a forma e load-bearing e nao
  -- estilo. O idioma difundido neste repositorio — negar o pertencimento da claim
  -- a um conjunto de papeis — e NULL-CEGO: com a claim ausente a expressao avalia
  -- NULL, um `IF` NULL **nao e tomado**, e o guard FALHA ABERTO. Ele so recusaria
  -- claim presente-e-errada; claim AUSENTE passaria direto.
  --
  -- Em `SECURITY DEFINER` isso e grave porque DEFINER bypassa RLS: este guard e o
  -- UNICO controle de acesso que existe aqui dentro. E defeito REAL medido na
  -- 42-06 (61 funcoes DEFINER com EXECUTE para `anon`, 39 alcancaveis por
  -- PostgREST), nao hipotese. `IS DISTINCT FROM` e NULL-safe por definicao: NULL
  -- E distinto de qualquer literal, entao o desvio E tomado e o chamador sem
  -- claim e RECUSADO.
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode alterar a configuracao da purga'
      USING ERRCODE = '42501';
  END IF;

  -- ═══ (2) O ATOR E RESOLVIDO NO SERVIDOR ═══════════════════════════════════
  --
  -- Nunca recebido por parametro: um ator vindo do cliente seria a autoria da
  -- trilha escolhida por quem esta sendo auditado, e a assinatura desta funcao
  -- NAO TEM parametro de ator justamente por isso. Uma claim de administrador SEM
  -- linha viva de RH nao e um operador deste sistema (conta desativada ou
  -- soft-deleted que ainda carrega a claim no JWT ate o refresh), e
  -- `config_purga.alterado_por` e FK para `public.usuarios_rh`.
  SELECT u.id INTO v_actor
    FROM public.usuarios_rh u
   WHERE u.user_id = (select auth.uid())
     AND u.ativo
     AND u.deleted_at IS NULL;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: nenhuma conta de RH viva corresponde ao chamador — o ator desta mudanca e resolvido no servidor a partir da sessao, e uma mudanca de modo sem ator identificavel nao seria evidenciada'
      USING ERRCODE = '42501';
  END IF;

  -- ═══ (3) VALIDACAO DE DOMINIO ═════════════════════════════════════════════
  --
  -- ⚠ NULL e tratado EXPLICITAMENTE, e significa "nao alterar este campo". Nao e
  -- descuido nem NULL-cegueira aproveitada: a funcao escreve tres campos
  -- independentes, e obrigar o chamador a reenviar os outros dois transformaria
  -- "ajustar o cap" numa oportunidade de mudar o MODO por descuido — que e
  -- precisamente o efeito colateral que PURGA-04 proibe.
  --
  -- Cada comparacao e escrita por extenso em vez de por pertencimento a conjunto,
  -- pela razao do passo (1). O `CHECK` da tabela e a segunda camada e daria
  -- 23514; esta da 22023 com mensagem que nomeia o valor recebido e o permitido.
  IF p_modo IS NOT NULL
     AND p_modo <> 'off' AND p_modo <> 'dry_run' AND p_modo <> 'live' THEN
    RAISE EXCEPTION 'VALIDATION: modo [%] fora do vocabulario fechado (off, dry_run, live)', p_modo
      USING ERRCODE = '22023';
  END IF;

  IF p_cap_titulares IS NOT NULL
     AND (p_cap_titulares < 1 OR p_cap_titulares > 500) THEN
    RAISE EXCEPTION 'VALIDATION: cap de % titulares fora do intervalo permitido (1 a 500) — o cap e o teto de blast-radius por execucao (D-46-07), e um conjunto acima dele ABORTA a execucao inteira em vez de processar ate o teto', p_cap_titulares
      USING ERRCODE = '22023';
  END IF;

  IF p_janela_notificacoes_meses IS NOT NULL
     AND (p_janela_notificacoes_meses < 1 OR p_janela_notificacoes_meses > 120) THEN
    RAISE EXCEPTION 'VALIDATION: janela de % meses para notificacoes fora do intervalo permitido (1 a 120)', p_janela_notificacoes_meses
      USING ERRCODE = '22023';
  END IF;

  -- ═══ (4) ESTADO ANTERIOR + BLOQUEIO DA LINHA ══════════════════════════════
  --
  -- O bloqueio serializa esta mudanca contra uma VARREDURA CONCORRENTE que ja
  -- tenha lido o modo antigo — e o mesmo idioma que a varredura usa do outro lado
  -- (`20260823000007`), o que fecha a corrida nas duas pontas em vez de numa so.
  -- Sem ele, o kill switch acionado no instante em que o cron acorda poderia ser
  -- lido depois de a varredura ja ter decidido que o regime era `live`.
  SELECT to_jsonb(cp), cp.modo, cp.cap_titulares, cp.janela_notificacoes_meses
    INTO v_antes, v_modo_antes, v_cap_antes, v_janela_antes
    FROM public.config_purga cp
   FOR UPDATE;

  IF v_antes IS NULL THEN
    RAISE EXCEPTION 'VALIDATION: public.config_purga esta VAZIA — a linha unica do cerco nao existe, e sem ela nao ha estado anterior a registrar na trilha. Reaplicar o seed de 20260823000001'
      USING ERRCODE = '22023';
  END IF;

  v_modo_novo   := coalesce(p_modo,                      v_modo_antes);
  v_cap_novo    := coalesce(p_cap_titulares,             v_cap_antes);
  v_janela_nova := coalesce(p_janela_notificacoes_meses, v_janela_antes);

  -- ═══ (5) NAO-OP E RECUSA, NAO SUCESSO SILENCIOSO ══════════════════════════
  --
  -- Salvar sem mudanca escreveria uma linha de trilha que afirma uma alteracao
  -- que nao houve — poluir a trilha probatoria e o oposto do que PURGA-04 pede
  -- dela.
  --
  -- ⚠ E O RAMO DEDICADO ABAIXO NAO E COSMETICA: quem chama `off` as tres da manha
  -- esta acionando o kill switch, e uma mensagem generica de "nada a alterar"
  -- seria lida, com razao, como "o kill switch falhou". O desfecho desejado JA
  -- VALE, e a mensagem tem de dizer isso, nao um sinonimo de "erro".
  IF v_modo_novo = v_modo_antes
     AND v_cap_novo = v_cap_antes
     AND v_janela_nova = v_janela_antes THEN
    IF v_modo_novo = 'off' THEN
      RAISE EXCEPTION 'VALIDATION: a purga JA ESTA desligada (modo off) e nada mais mudou — nao ha o que alterar. ⚠ ISTO NAO E FALHA DO KILL SWITCH: o estado que voce queria ja e o estado vigente, e nenhuma execucao vai apagar nada enquanto ele valer'
        USING ERRCODE = '22023';
    END IF;
    RAISE EXCEPTION 'VALIDATION: nada a alterar — o cerco ja esta em modo [%], cap % e janela de % meses', v_modo_antes, v_cap_antes, v_janela_antes
      USING ERRCODE = '22023';
  END IF;

  -- ═══ (6) ⚠⚠ O PORTAO DO FLIP ══════════════════════════════════════════════
  --
  -- ⚠⚠ ELE E GUARDADO POR "O MODO NOVO E `live`", E ESSA GUARDA E DE SEGURANCA.
  --    A transicao para `off` NAO ENTRA AQUI: nao exige confirmacao, nao consulta
  --    o ledger, nao consulta a matriz. Um kill switch que pode ser recusado nao e
  --    um kill switch, e o momento em que ele mais importa e exatamente aquele em
  --    que algum criterio estaria falhando. O mesmo vale para voltar de `live`
  --    para `dry_run`: reduzir o alcance da purga nunca e recusado.
  --
  -- A segunda metade da condicao — o modo anterior NAO ser `live` — existe para
  -- que reafirmar um `live` que ja vale junto com uma mudanca de cap nao releia o
  -- ledger. A purga ja esta ligada; o portao existe para a ENTRADA.
  v_virando_live := (p_modo = 'live' AND v_modo_antes IS DISTINCT FROM 'live');

  IF coalesce(v_virando_live, false) THEN

    -- ── (6.a) A CONFIRMACAO EXPLICITA ────────────────────────────────────────
    -- O modo seguro e o padrao, e destruir exige AFIRMAR a intencao. Sem isto, o
    -- flip poderia ser efeito colateral de uma chamada que o operador achou que
    -- fazia outra coisa — um formulario que reenvia todos os campos, por exemplo.
    IF p_confirmo_live IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'VALIDATION: ligar a purga em modo live exige confirmacao EXPLICITA — o argumento de confirmacao veio [%] e precisa vir verdadeiro. A partir de live a varredura noturna destroi Storage, Postgres e Auth de pessoas reais, de forma irreversivel e sem PITR: o flip nao pode ser efeito colateral de uma chamada que pretendia mudar outro campo', coalesce(p_confirmo_live::text, 'NULL')
        USING ERRCODE = '22023';
    END IF;

    -- ── (6.b) OS TRES CRITERIOS DE D-46-14, MEDIDOS NO LEDGER ────────────────
    --
    -- ⚠ O TERCEIRO E A DECISAO QUE IMPEDE A FASE DE FALHAR EM SILENCIO. A previa
    --   devolve zero por ARITMETICA, nao por defeito: a matriz esta em 24 meses e
    --   o sistema e mais novo que a janela. Catorze dias de zeros nao provam NADA
    --   sobre o caminho do delete — seriam exatamente o dry-run decorativo que o
    --   SC#1 nomeia, e a mesma classe de falha de uma guarda que era dead code.
    --   Um criterio que conta dias e execucoes mas nao conta ELEGIVEIS e o sinal
    --   de alerta que a pesquisa desta fase deixou escrito.
    --
    -- ⚠ LEDGER VAZIO RECUSA POR AUSENCIA, nunca por comparacao com NULL:
    --   `min(iniciada_em)` de uma tabela vazia e NULL, e a comparacao seria NULL —
    --   um `IF` NULL nao e tomado e o portao passaria em silencio sobre um sistema
    --   que nunca rodou uma varredura. O `coalesce` abaixo transforma a ausencia
    --   num FALSE explicito. As contagens nao precisam dele (contagem de tabela
    --   vazia e 0, nunca NULL) e por isso nao o levam: um `coalesce` decorativo
    --   ensinaria a proxima pessoa que ele e ritual em vez de mecanismo.
    --
    -- ⚠⚠ O RECORTE POR MODO NAO E DETALHE — SEM ELE O PORTAO SE ABRE SOZINHO.
    --   D-46-14 exige 14 dias de DRY-RUN, e uma execucao em `off` nao contem
    --   evidencia nenhuma sobre o caminho do delete: o kill switch retorna logo
    --   depois de contar os elegiveis, antes de qualquer item. Se os heartbeats de
    --   `off` contassem, catorze noites com a purga DESLIGADA satisfariam os tres
    --   criterios e autorizariam `live` com ZERO evidencia de ensaio — que e
    --   exatamente o "dry-run decorativo" que D-46-14 existe para impedir, na
    --   forma que o criterio escrito por extenso nao pega.
    --   ⚠ E nao e hipotese: medido em 2026-08-23, as TRES linhas vivas de
    --   `purga_execucoes` estao em `off`, e UMA delas tem `elegiveis = 4`. Sem
    --   este recorte, o relogio dos 14 dias ja estaria correndo sobre execucoes
    --   que nao ensaiaram nada, e o criterio do conjunto nao-vazio ja estaria
    --   satisfeito por uma contagem que nenhuma varredura chegou a percorrer.
    --   ⚠ ALLOWLIST DE MODOS, JAMAIS `<> 'off'`: o `CHECK` de
    --   `20260823000009:89-90` admite tambem `'ausente'`, o valor fail-closed que
    --   a reconciliacao grava quando nao conseguiu ler o cerco. Uma negacao
    --   deixaria esse valor CONTAR, e um modo novo no futuro contaria por omissao.
    --   A allowlist deixa o desconhecido de FORA, que e a direcao segura num
    --   portao que autoriza destruicao irreversivel.
    SELECT min(iniciada_em),
           count(*),
           count(*) >= 14,
           count(*) FILTER (WHERE elegiveis > 0)
      INTO v_primeira, v_total, v_tem_14_exec, v_com_eleg
      FROM public.purga_execucoes
     WHERE modo_vigente IN ('dry_run', 'live');

    v_tem_14_dias := coalesce(v_primeira <= pg_catalog.now() - interval '14 days', false);

    -- ── (6.c) A PRE-CONDICAO DE POLITICA — D-46-22 ───────────────────────────
    --
    -- Nenhuma etapa da allowlist pode estar em procedencia de seed. O `COMMENT`
    -- da coluna, escrito dentro do banco desde a Phase 43
    -- (`20260801000002:174-184`), ja declara esta pre-condicao: **um valor em seed
    -- significa que ninguem CONTESTOU aquele numero, nao que alguem o DECIDIU.**
    -- Medido em PROD em 2026-08-22: 7 das 8 linhas da matriz seguem em seed; so
    -- `rejeitado` foi editado por um administrador de verdade.
    --
    -- ⚠ A CONTAGEM DA ALLOWLIST TAMBEM E MEDIDA, e nao por zelo: sem ela, uma
    --   matriz com `elegivel_purga` falso em TODA linha faria "zero etapas em
    --   seed" ser verdade por VACUIDADE, e o portao aprovaria o flip de uma purga
    --   que nao alcanca estado nenhum. Uma condicao que so pode ser satisfeita por
    --   ausencia de sujeito nao e uma condicao.
    SELECT count(*) FILTER (WHERE elegivel_purga),
           count(*) FILTER (WHERE elegivel_purga AND origem = 'seed'),
           coalesce(string_agg(etapa::text, ', ' ORDER BY etapa::text)
                      FILTER (WHERE elegivel_purga AND origem = 'seed'), '')
      INTO v_allow_n, v_seed_n, v_seed_nomes
      FROM public.config_retencao_etapa;

    -- ── O DIAGNOSTICO IMPRIME O QUE MEDIU, criterio por criterio ─────────────
    -- ⚠ Uma mensagem que narra uma causa presumida custa mais caro que um
    --   "falhou": esta fase perdeu um dia inteiro atras de um diagnostico
    --   plausivel que estava errado. Cada linha abaixo carrega o valor ACHADO e o
    --   EXIGIDO, para que o operador saiba o que fazer em vez de so saber que nao.
    v_faltas := concat_ws('; '::text,
      CASE WHEN v_tem_14_dias THEN NULL ELSE
        format('dias corridos desde a primeira execucao em dry_run ou live = %s (exigido 14; primeira registrada em %s — execucoes em off NAO contam, porque o kill switch retorna antes de qualquer item e nao ensaia nada)',
               CASE WHEN v_primeira IS NULL
                      THEN 'INDEFINIDO, o ledger nao tem nenhuma execucao em dry_run nem em live'
                    ELSE floor(extract(epoch FROM (pg_catalog.now() - v_primeira)) / 86400)::text
               END,
               coalesce(v_primeira::text, 'NENHUMA'))
      END,
      CASE WHEN v_tem_14_exec THEN NULL ELSE
        format('execucoes com linha no ledger em dry_run ou live = %s (exigido 14)', v_total)
      END,
      CASE WHEN v_com_eleg >= 1 THEN NULL ELSE
        format('execucoes de ensaio sobre conjunto elegivel NAO-VAZIO = %s (exigido ao menos 1; catorze dias de zeros nao provam nada sobre o caminho do delete)', v_com_eleg)
      END,
      CASE WHEN v_allow_n >= 1 THEN NULL ELSE
        format('etapas com elegivel_purga verdadeiro = %s (exigido ao menos 1; com a allowlist vazia a purga nao alcanca estado nenhum e a pre-condicao de procedencia seria satisfeita por vacuidade)', v_allow_n)
      END,
      CASE WHEN v_seed_n = 0 THEN NULL ELSE
        format('etapas da allowlist ainda em procedencia de seed = %s [%s] (exigido nenhuma; confirmar a janela de cada uma pela tela, o que marca a procedencia como escolhida por um administrador)', v_seed_n, v_seed_nomes)
      END
    );

    IF v_faltas IS NOT NULL AND v_faltas <> '' THEN
      RAISE EXCEPTION 'VALIDATION: o flip para live foi RECUSADO pelo servidor. Faltam: %. ⚠ Estes criterios vivem numa migration e nao num checklist, de proposito: uma regra que so vive na tela e uma regra que nao existe, e afrouxa-los exige migration nova, visivel no diff — que e exatamente o ponto de D-46-05 contra um secret que muda sem trilha. Enquanto qualquer um faltar, a purga permanece em modo de relatorio e nao apaga nada', v_faltas
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ═══ (7) A MUTACAO ════════════════════════════════════════════════════════
  -- O trigger `trg_config_purga_atualizado_em` carimba `atualizado_em`.
  UPDATE public.config_purga cp
     SET modo                      = v_modo_novo,
         cap_titulares             = v_cap_novo,
         janela_notificacoes_meses = v_janela_nova,
         alterado_por              = v_actor
   WHERE cp.id;

  SELECT to_jsonb(cp) INTO v_depois FROM public.config_purga cp;

  -- ═══ (8) A TRILHA, NO MESMO CORPO — LOGO NA MESMA TRANSACAO ═══════════════
  --
  -- E este `PERFORM` que torna o flip EVIDENCIADO em vez de meramente registrado:
  -- a mudanca e o registro dela commitam ou revertem JUNTOS, e nao existe estado
  -- em que o modo mudou e a trilha nao registrou. A funcao chamada e
  -- `SECURITY DEFINER` com owner que ignora RLS, entao a linha sobrevive a
  -- revogacao de INSERT que a Phase 28 aplicou sobre `public.logs_auditoria`.
  --
  -- ⚠ A SEVERIDADE SOBE PARA O TOPO DO VOCABULARIO QUANDO O DESTINO E `live`, e
  --   nao e enfase: em `live` a varredura noturna passa a destruir PII de pessoas
  --   reais em tres sistemas, de forma irreversivel, num projeto sem PITR e com o
  --   Storage fora de todo caminho de backup. Ligar isso nao e um aviso. Os dois
  --   rotulos foram MEDIDOS contra os enums vivos e o bloco de auto-verificacao do
  --   topo deste arquivo aborta o apply se algum deles tiver deixado de existir.
  v_sev := CASE WHEN coalesce(v_virando_live, false)
                  THEN 'critico'::public.severidade_log
                ELSE 'aviso'::public.severidade_log
           END;

  PERFORM public.log_auditoria(
    p_usuario_id   := v_actor,
    p_usuario_tipo := 'admin',
    p_acao         := 'alterar_config_purga',
    p_categoria    := 'configuracao',
    p_descricao    := format('Cerco da purga alterado: modo %s -> %s, cap %s -> %s, janela de notificacoes %s -> %s meses',
                             v_modo_antes, v_modo_novo,
                             v_cap_antes, v_cap_novo,
                             v_janela_antes, v_janela_nova),
    p_severidade   := v_sev,
    p_recurso_tipo := 'config_purga',
    p_recurso_id   := NULL::uuid,
    p_dados_antes  := v_antes,
    p_dados_depois := v_depois,
    p_sucesso      := true
  );
END;
$salvar_config_purga$;


-- ---------------------------------------------------------------------------
-- 2 · Hardening de EXECUTE — `anon` revogado NOMINALMENTE
-- ---------------------------------------------------------------------------
-- ⚠ `REVOKE ALL ON FUNCTION … FROM PUBLIC` SOZINHO **NAO BASTA**, e este e o
-- defeito sistemico mais difundido do repositorio: o `pg_default_acl` do schema
-- `public` concede EXECUTE a `anon` em TODO `CREATE FUNCTION`, como grant DIRETO
-- e NOMEADO. O idioma usado em quase toda migration daqui remove um grant de
-- `PUBLIC` que nunca existiu — e deixa `anon=X` de pe. Por isso `anon` aparece
-- EXPLICITAMENTE na lista.
--
-- ⚠ A variante correta para esta funcao e GRANT ao papel autenticado, e nao ao
-- papel de servico: ela e chamada pela TELA DE ADMINISTRADOR com o JWT da pessoa,
-- e e do JWT que o passo (1) tira o papel e o passo (2) tira o ator. Um GRANT ao
-- papel de servico deixaria a funcao inalcancavel pela tela e, pior, chamavel por
-- um contexto sem sessao — onde o passo (2) nao teria ator a resolver.
-- Quem faz o trabalho de autorizacao e o guard do corpo.
REVOKE ALL ON FUNCTION public.salvar_config_purga(text, integer, integer, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.salvar_config_purga(text, integer, integer, boolean) TO authenticated;

COMMENT ON FUNCTION public.salvar_config_purga(text, integer, integer, boolean) IS
  'Phase 46 / 46-07 PURGA-04/05 (D-46-05/14/22): UNICO caminho de aplicacao para alterar o cerco da '
  'purga automatica (modo, cap de titulares e janela de retencao de notificacoes). SECURITY DEFINER '
  'VOLATILE com search_path vazio. E RPC e NAO policy de UPDATE porque uma policy nao da nenhuma das '
  'duas coisas que PURGA-04 exige junto com a escrita: trilha ATOMICA (a chamada da trilha roda no '
  'mesmo corpo, logo na mesma transacao — a mudanca e o registro commitam ou revertem juntos) e '
  'RECUSA server-side do flip. '
  'PARAMETRO NULO SIGNIFICA "nao alterar este campo": a funcao escreve tres campos independentes, e '
  'obrigar o chamador a reenviar os outros dois transformaria "ajustar o cap" numa oportunidade de '
  'mudar o MODO por descuido. '
  'ORDEM DO CORPO E SQLSTATE DE CADA RECUSA: '
  '(1) 42501 se o papel do JWT nao for administrador — guard NULL-SAFE por diferenca explicita, que '
  'recusa TAMBEM o chamador sem claim nenhuma (a negacao por pertencimento a conjunto falha ABERTA '
  'com claim NULL, defeito real medido na 42-06); '
  '(2) 42501 se nenhuma linha VIVA de usuarios_rh corresponder a sessao — o ator e resolvido no '
  'SERVIDOR e a assinatura NAO TEM parametro de ator; '
  '(3) 22023 para modo fora de (off, dry_run, live), cap fora de 1..500 ou janela fora de 1..120; '
  '(4) leitura do estado anterior com bloqueio da linha, que serializa contra a varredura concorrente; '
  '(5) 22023 em nao-op, com ramo dedicado quando a purga JA ESTA desligada — quem aciona o kill '
  'switch as tres da manha tem de ler "o estado desejado ja vale", e nunca um sinonimo de falha; '
  '(6) O PORTAO DO FLIP, alcancado SOMENTE quando o modo novo e live e o anterior nao era: '
  '22023 sem o argumento explicito de confirmacao; 22023 se faltar qualquer criterio de D-46-14 '
  '(>= 14 dias corridos desde a primeira execucao do ledger, >= 14 execucoes com linha, >= 1 execucao '
  'sobre conjunto elegivel NAO-VAZIO — ledger vazio recusa por AUSENCIA, jamais por comparacao com '
  'NULL). '
  '⚠ OS TRES CRITERIOS SAO MEDIDOS APENAS SOBRE EXECUCOES EM dry_run OU live, por allowlist de modo '
  'e jamais por negacao de off: uma execucao em off retorna logo depois de contar os elegiveis, antes '
  'de qualquer item, e portanto NAO contem evidencia nenhuma sobre o caminho do delete. Se os '
  'heartbeats de off contassem, catorze noites com a purga DESLIGADA satisfariam o portao e '
  'autorizariam live com zero ensaio — o dry-run decorativo que D-46-14 existe para impedir. A '
  'allowlist tambem deixa de fora o valor ausente do CHECK de 20260823000009, que a reconciliacao '
  'grava quando nao conseguiu ler o cerco. '
  'Ainda no passo (6): 22023 se qualquer etapa da allowlist ainda estiver em procedencia de seed (D-46-22), ou se '
  'a allowlist estiver VAZIA, caso em que a pre-condicao seria satisfeita por vacuidade. Cada recusa '
  'nomeia o valor MEDIDO e o exigido; '
  '(7) a mutacao, com alterado_por resolvido no servidor e atualizado_em carimbado pelo trigger; '
  '(8) a trilha, no mesmo corpo, com severidade no TOPO do vocabulario quando o destino e live — '
  'ligar destruicao automatica de PII irreversivel num projeto sem PITR nao e um aviso. '
  '⚠⚠ A TRANSICAO PARA off NAO PASSA PELO PORTAO, DE ESTADO NENHUM: nao exige confirmacao, nao '
  'consulta o ledger e nao consulta a matriz. UM KILL SWITCH QUE PODE SER RECUSADO NAO E UM KILL '
  'SWITCH, e o momento em que ele mais importa e exatamente aquele em que algum criterio estaria '
  'falhando. A unica coisa que continua valendo para off e a autorizacao dos passos (1) e (2): '
  'desligar e ato de operador identificado, e ele fica na trilha como qualquer outra mudanca. '
  'ACL: revogada nominalmente de PUBLIC, anon e authenticated, e so entao concedida ao papel '
  'autenticado — a funcao e chamada pela tela do administrador com o JWT da pessoa, e e desse JWT '
  'que saem o papel do passo (1) e o ator do passo (2).';
