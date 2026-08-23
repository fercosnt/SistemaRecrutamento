-- =============================================================================
-- Phase 46 / Code review retroativo (`46-REVIEW-2.md`) — BL-01 · HI-01
-- `public.salvar_config_purga`: o portao do flip deixa de contar como ENSAIO
-- execucoes que nao ensaiaram nada, e o KILL SWITCH deixa de ser recusavel por
-- uma falha na escrita da trilha.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NAO APAGA NADA, NAO CRIA TABELA, NAO CRIA COLUNA, NAO CRIA
-- CRON, NAO TOCA EM NENHUM GUARD EXISTENTE, NAO GRAVA NENHUMA LINHA E NAO MUDA
-- O MODO DA PURGA.** Ela substitui o CORPO de UMA funcao. `config_purga.modo`
-- continua exatamente onde estava quando o apply comecou — hoje `dry_run`,
-- desde T0 = 2026-08-23 02:06:37-03.
--
-- Nenhum `DELETE`, nenhum `DROP`, nenhum `INSERT`, nenhum `UPDATE`, nenhum
-- `ALTER`, nenhum agendamento.
--
-- ⚠⚠ **POR QUE UMA MIGRATION NOVA E NAO UMA EDICAO DA `20260823000013`.**
-- Aquela migration esta APLICADA em PROD e os bytes literais do arquivo estao
-- pinados por `md5(statements[1])` no ledger de `supabase_migrations`. Edita-la
-- no lugar faria o md5 divergir e quebraria a propria prova de que o que rodou
-- foi o que esta no repositorio (CLAUDE.md §"Via de apply ATUAL", ponto 3). O
-- idioma correto e `CREATE OR REPLACE FUNCTION` numa migration nova — e e o
-- mesmo motivo pelo qual a instrucao obsoleta de reparo de `version` continua
-- escrita dentro dos cabecalhos das `20260823000001`..`4` e so foi corrigida no
-- CLAUDE.md.
--
-- -----------------------------------------------------------------------------
-- (1) BL-01 · O PORTAO CONTAVA COMO ENSAIO EXECUCOES QUE NAO ENSAIARAM NADA
-- -----------------------------------------------------------------------------
-- O recorte de `20260823000013:443-449` era por **`modo_vigente`** e por mais
-- nada:
--
--     WHERE modo_vigente IN ('dry_run', 'live')
--
-- O comentario imediatamente acima dele argumentava, com razao e por extenso,
-- que execucoes em `off` nao podem contar porque *"o kill switch retorna logo
-- depois de contar os elegiveis, antes de qualquer item"*. **Essa propriedade
-- vale, palavra por palavra, para outros dois vereditos que o recorte deixava
-- passar** — e os dois sao alcancaveis em `modo_vigente = 'dry_run'`:
--
--   | veredito          | Onde retorna         | Abriu item? | Chamou o motor? | `elegiveis` > 0? |
--   |-------------------|----------------------|-------------|-----------------|------------------|
--   | `desligado`       | (f)  `:607-613`      | nao         | nao             | sim              |
--   | `cap_excedido`    | (d)  `:578-585`      | nao         | nao             | **por definicao**|
--   | `segredo_ausente` | (f.5) `:645-653`     | nao         | nao             | sim              |
--   | `dry_run`         | (h)                  | **sim**     | **sim**         | sim              |
--   | `despachado`      | (h)                  | **sim**     | **sim**         | sim              |
--
-- Consequencia concreta e nao hipotetica: **catorze noites com o Vault sem
-- `edge_invoke_key` produziriam catorze linhas em `modo_vigente = 'dry_run'`
-- com `elegiveis = 4` e veredito `segredo_ausente`, e os TRES criterios de
-- D-46-14 estariam satisfeitos com ZERO evidencia sobre o caminho do delete.**
-- Que e literalmente o "dry-run decorativo" que o SC#1 proibe, na forma que o
-- criterio escrito por extenso nao pega — exatamente como o comentario original
-- ja dizia sobre `off`, sem perceber que dizia sobre mais dois.
--
-- O proprio `46-07-RUNBOOK-FLIP.md:231-232` marca os dois vereditos com ⛔ na
-- tabela de vigilancia dos 14 dias. **O runbook sabia que eram estados ruins e
-- o servidor os aceitava como prova.**
--
--   CONSERTO A · ALLOWLIST DE VEREDITO, JAMAIS NEGACAO.
--   `veredito IN ('dry_run', 'despachado')`. Um veredito novo no futuro fica de
--   FORA — que e a direcao segura num portao que autoriza destruicao
--   irreversivel. Uma negacao (`veredito <> 'segredo_ausente'`) deixaria o
--   desconhecido CONTAR, que e a direcao oposta.
--
--   ⚠ VARREDURA PELA FORMA (CLAUDE.md), respondida aqui e nao deixada implicita:
--   esta lista literal de dois rotulos e um ESCOPO DELIBERADO, e nao uma
--   FOTOGRAFIA. Ela nao enumera "os vereditos que existem hoje" — ela enumera
--   **a propriedade** "a funcao chegou a abrir item e a chamar o motor", que so
--   os dois ramos de (h) satisfazem. Se um veredito novo nascer com essa
--   propriedade, esta lista tem de ser reescrita junto, e ate la ele nao conta:
--   o portao RECUSA a mais, nunca a menos. O bloco de auto-verificacao abaixo
--   ABORTA o apply se qualquer um dos dois rotulos tiver deixado de existir no
--   `CHECK` vivo — porque uma allowlist que aponta para rotulos mortos conta
--   zero para sempre, e um portao que passou a recusar TUDO tambem e um portao
--   quebrado (modo de falha no 3 dos sete portoes da Phase 45).
--
--   CONSERTO B · O CRITERIO 3 MEDE A **EVIDENCIA**, E NAO SO O NUMERO.
--   Uma execucao so ensaiou o caminho do delete se algum item dela carrega
--   `relato_dry_run` — a pre-imagem que o laco (g) captura chamando
--   `anonimizar_candidato(id, true)`, ou seja a MESMA expressao do delete real.
--   `elegiveis > 0` diz apenas que o PREDICADO selecionou alguem; nada nele
--   prova que o motor foi chamado. Uma execucao em que todos os titulares
--   falhassem ANTES da chamada ao motor (ramo `WHEN OTHERS` do laco, que grava
--   `desfecho_postgres = 'falha'` e deixa `relato_dry_run` NULO) satisfaria o
--   criterio antigo com zero ensaio.
--
--   ⚠ DIVERGENCIA DECLARADA do texto de BL-01, que propunha trocar o numero
--   PELA evidencia. Aqui os dois viram CONJUNCAO — `elegiveis > 0 AND EXISTS
--   (item com relato_dry_run)` —, e a escolha e estritamente mais forte que
--   qualquer das duas metades sozinha. Nao ha predicado enfraquecido: o
--   conjunto de execucoes que contam so DIMINUI. E a conjuncao preserva a
--   capacidade do caso `(d.4)` do smoke — "14+ execucoes e NENHUMA sobre
--   conjunto nao-vazio" — de reprovar pelo criterio que ele existe para medir,
--   em vez de deixa-lo passar a medir outro.
--
-- -----------------------------------------------------------------------------
-- (2) HI-01 · O KILL SWITCH PODIA SER RECUSADO POR UMA FALHA NA TRILHA
-- -----------------------------------------------------------------------------
-- A ordem do corpo e (7) mutacao -> (8) `PERFORM public.log_auditoria(...)`, na
-- MESMA transacao. Isso e correto e OBRIGATORIO para o flip `-> live`: a
-- mudanca e o registro dela tem de commitar ou reverter juntos, e e o que torna
-- o flip EVIDENCIADO em vez de meramente registrado.
--
-- **Para `-> off` a prioridade INVERTE, e o arquivo original nao percebeu.**
-- Qualquer falha do passo (8) — um rotulo de enum removido depois do apply, uma
-- constraint nova em `logs_auditoria`, um trigger, disco cheio — **reverte a
-- mutacao junto**, e o operador que digitou o kill switch as tres da manha
-- recebe um erro e a purga CONTINUA LIGADA.
--
-- O proprio `20260823000013` escreve, tres secoes acima do defeito: *"Um kill
-- switch que pode ser recusado nao e um kill switch, e o momento em que ele
-- mais importa e exatamente aquele em que algum criterio estaria falhando."* E
-- o `COMMENT` vivo daquela funcao promete, em maiusculas, que `off` nao passa
-- pelo portao **"DE ESTADO NENHUM"**. A trilha era um estado a partir do qual o
-- `off` era recusavel.
--
-- ⚠ O bloco de auto-verificacao do topo da `20260823000013` (`:176-196`)
-- confere os rotulos de enum **no instante do APPLY** — nao no instante da
-- CHAMADA, que e quando importa.
--
--   CONSERTO · A atomicidade e MANTIDA para toda transicao EXCETO `-> off`, e
--   so nesse caso a falha da trilha e degradada para `WARNING`. O desligamento
--   vale; a trilha e o que falta, e o `WARNING` diz isso com essas palavras.
--
--   ⚠ E ESTA ASSIMETRIA E O PONTO INTEIRO, entao ela e dita duas vezes: para
--   `-> live` a trilha continua ATOMICA e uma falha dela continua REVERTENDO o
--   flip. Ligar destruicao irreversivel de PII sem registro e pior que nao
--   ligar; desligar sem registro e melhor que nao desligar. As duas frases sao
--   a mesma regra — o erro deve cair sempre para o lado que NAO destroi.
--
-- -----------------------------------------------------------------------------
-- (3) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE pela Management API com o SQL LIDO DO ARQUIVO
-- (CLAUDE.md §"Via de apply ATUAL" — `node p46apply.cjs migrate`). A `version`
-- nasce correta do nome do arquivo; NAO ha reparo a fazer.
--
-- Sem par de transacao explicita no topo, e corpos em delimitadores NOMEADOS: o
-- driver ja envolve cada migration na sua propria transacao, e um par externo
-- adjacente a `COMMENT` / `REVOKE` / `GRANT` e o gatilho do SQLSTATE 42601.
--
-- Conferencia obrigatoria, os DOIS lados registrados:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000014';
--   -- comparar com o md5 dos BYTES CRUS do arquivo:
--   --   md5 -q supabase/migrations/20260823000014_p46_portao_flip_veredito.sql   (macOS)
--   --   md5sum  supabase/migrations/20260823000014_p46_portao_flip_veredito.sql  (Linux)
--
-- ⛔ NAO usar `printf '%s' "$(cat <arquivo>)" | md5`, que e a forma herdada dos
--    cabecalhos anteriores deste repositorio: `$( … )` REMOVE as quebras de
--    linha finais, e o ledger guarda os bytes crus (`p46apply.cjs` faz
--    `fs.readFileSync` e registra o MESMO buffer em `statements[1]`). A forma
--    herdada reporta DIVERGENCIA num apply CORRETO — HI-R3-01 do
--    `46-REVIEW-3.md`. Medido em 2026-08-23 contra a `20260823000013`, que ja
--    esta aplicada e pinada:
--
--      md5 do ledger                          = 63feeec5f3d55ea4371fa6fb5954d10a
--      md5 -q do arquivo (bytes crus)         = 63feeec5f3d55ea4371fa6fb5954d10a  ✅
--      printf '%s' "$(cat arquivo)" | md5     = c410a6723d0f8557bc3c7b13e7ddc7b0  ⛔
--
--    ⚠ Num projeto cuja via de apply existe *porque* duas das cinco migrations
--    do M8 chegaram a PROD com os comentarios descartados (CLAUDE.md), uma
--    conferencia de md5 que da FALSO NEGATIVO e um convite a reverter o que
--    estava certo. Os cabecalhos das migrations JA APLICADAS carregam a forma
--    errada e nao podem ser corrigidos — editar o arquivo faria o md5 divergir
--    do ledger e quebraria a propria prova. A correcao vive aqui e nos
--    cabecalhos futuros, como o `CLAUDE.md` ja faz com a instrucao obsoleta de
--    reparo de `version`.
--
-- ⚠ A via automatica JA FAZ o cross-check CERTO por conta propria: `p46apply.cjs`
--   calcula `crypto.createHash('md5')` sobre o buffer do arquivo e o compara com
--   `md5(statements[1])` lido de volta do ledger, abortando se divergir. A
--   conferencia manual acima existe para quem aplicar por outra via.
--
-- ⚠ A espec executavel deste conserto sao os casos `(d.8)` e `(d.9)` de
-- `supabase/tests/p46_purga_smoke.sql`. Sem eles o conserto nao fica vigiado —
-- e a assercao `(d)` original NAO pegava BL-01: `(d.4)` monta "14+ execucoes e
-- NENHUMA sobre conjunto nao-vazio" zerando `elegiveis`, e nunca constroi o
-- caso "14 execucoes com `elegiveis > 0` que nao ensaiaram".
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0 · AUTO-VERIFICACAO DE APPLY — os pressupostos que o corpo abaixo NAO mede
-- ---------------------------------------------------------------------------
-- Molde: `20260823000013:139-225`. Duas familias, e as duas ABORTAM o apply em
-- vez de virarem defeito silencioso na primeira chamada real:
--
--   (i)  ⚠⚠ OS DOIS ROTULOS DA ALLOWLIST DE VEREDITO SAO ROTULOS VIVOS. Este e
--        o pressuposto que a allowlist inteira carrega: uma lista que aponta
--        para rotulos que nao existem mais conta ZERO para sempre, e o portao
--        passa a recusar o flip em toda circunstancia. Um portao que voce
--        tornou incapaz de APROVAR e tao quebrado quanto um incapaz de recusar
--        — e a descoberta chegaria no dia do flip, com o operador incapaz de
--        ligar a purga e sem saber por que (modo de falha no 3 dos sete portoes
--        da Phase 45). A pergunta e feita contra o `CHECK` VIVO da coluna, e
--        nao contra uma lista escrita aqui.
--
--   (ii) `purga_execucao_itens.relato_dry_run` existe. E a coluna em que o
--        criterio 3 passa a medir EVIDENCIA; sem ela o `EXISTS` seria erro de
--        compilacao na primeira chamada real, que e a hora errada de descobrir.
DO $verifica_pressupostos_portao_flip$
DECLARE
  v_def        text;
  v_falta      text;
  v_tem_col    boolean;
BEGIN
  -- ── (i) os rotulos da allowlist, medidos contra o CHECK VIVO ───────────────
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO v_def
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = pg_catalog.to_regclass('public.purga_execucoes')
     AND c.conname  = 'ck_purga_execucoes_veredito';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P46-FLIP: a constraint ck_purga_execucoes_veredito NAO existe em public.purga_execucoes (migration 20260823000002). Sem o dominio fechado do veredito, a allowlist deste portao nao tem contra o que ser conferida — e uma allowlist sobre um dominio aberto e uma lista de nomes que envelhece em silencio, exatamente a forma que o CLAUDE.md manda evitar';
  END IF;

  -- ⚠ `strpos(haystack, needle)` e nao `position(needle in haystack)`: a segunda
  --   e sintaxe ESPECIAL do SQL e nao aceita qualificacao de schema, e este
  --   arquivo roda com `search_path` fechado. A troca e mecanica, nao estilo —
  --   `pg_catalog.position(… in …)` e erro de sintaxe 42601.
  -- ⚠ E a busca inclui as ASPAS do literal (`'dry_run'`, e nao `dry_run`), para
  --   que o rotulo nao case por acidente com um prefixo de outro rotulo futuro.
  v_falta := pg_catalog.concat_ws(', '::text,
    CASE WHEN pg_catalog.strpos(v_def, '''dry_run''')    > 0 THEN NULL ELSE 'dry_run'    END,
    CASE WHEN pg_catalog.strpos(v_def, '''despachado''') > 0 THEN NULL ELSE 'despachado' END
  );

  IF v_falta IS NOT NULL AND v_falta <> '' THEN
    RAISE EXCEPTION 'P46-FLIP: rotulo(s) de veredito ausente(s) no CHECK vivo de purga_execucoes: [%]. Definicao medida: [%]. A allowlist do criterio de D-46-14 conta EXATAMENTE os vereditos em que a varredura chegou a abrir item e a chamar o motor, e uma allowlist que aponta para rotulo morto conta ZERO PARA SEMPRE — o portao passaria a RECUSAR o flip em toda circunstancia, e a descoberta chegaria no dia do flip com o operador incapaz de ligar a purga e sem saber por que. Se um veredito foi renomeado, esta migration tem de ser reescrita junto',
      v_falta, v_def;
  END IF;

  -- ── (ii) a coluna em que o criterio 3 passa a medir evidencia ──────────────
  SELECT count(*) > 0 INTO v_tem_col
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = pg_catalog.to_regclass('public.purga_execucao_itens')
     AND a.attname = 'relato_dry_run'
     AND a.attnum > 0
     AND NOT a.attisdropped;

  IF NOT coalesce(v_tem_col, false) THEN
    RAISE EXCEPTION 'P46-FLIP: public.purga_execucao_itens NAO tem a coluna relato_dry_run (migration 20260823000002). E nela que o criterio 3 passa a medir EVIDENCIA de ensaio em vez do numero de elegiveis — sem ela o EXISTS do corpo abaixo falharia na PRIMEIRA chamada real, que e o flip que ninguem quer descobrir quebrado';
  END IF;

  RAISE NOTICE 'P46-FLIP: pressupostos conferidos — vereditos dry_run e despachado vivos no CHECK, relato_dry_run presente';
END $verifica_pressupostos_portao_flip$;


-- ---------------------------------------------------------------------------
-- 1 · public.salvar_config_purga — corpo substituido (BL-01 + HI-01)
-- ---------------------------------------------------------------------------
-- ⚠ O corpo abaixo e o da `20260823000013` com DUAS mudancas, e nenhuma outra:
--   · o `SELECT` do passo (6.b) ganha a allowlist de veredito e a evidencia;
--   · o passo (8) ganha o ramo degradado para `-> off`.
-- Todo o resto — os guards (1) e (2), a validacao (3), o bloqueio (4), a
-- nao-op (5), a confirmacao (6.a), a pre-condicao (6.c) e a mutacao (7) —
-- permanece byte a byte o que foi revisado e aplicado, de proposito: uma
-- reescrita oportunista aqui seria diff que ninguem consegue revisar contra um
-- portao que autoriza destruicao irreversivel.
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
  -- NULL, um `IF` NULL **nao e tomado**, e o guard FALHA ABERTO.
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode alterar a configuracao da purga'
      USING ERRCODE = '42501';
  END IF;

  -- ═══ (2) O ATOR E RESOLVIDO NO SERVIDOR ═══════════════════════════════════
  --
  -- Nunca recebido por parametro: um ator vindo do cliente seria a autoria da
  -- trilha escolhida por quem esta sendo auditado, e a assinatura desta funcao
  -- NAO TEM parametro de ator justamente por isso.
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
  -- ⚠ NULL e tratado EXPLICITAMENTE, e significa "nao alterar este campo".
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
  --    A transicao para `off` NAO ENTRA AQUI.
  v_virando_live := (p_modo = 'live' AND v_modo_antes IS DISTINCT FROM 'live');

  IF coalesce(v_virando_live, false) THEN

    -- ── (6.a) A CONFIRMACAO EXPLICITA ────────────────────────────────────────
    IF p_confirmo_live IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'VALIDATION: ligar a purga em modo live exige confirmacao EXPLICITA — o argumento de confirmacao veio [%] e precisa vir verdadeiro. A partir de live a varredura noturna destroi Storage, Postgres e Auth de pessoas reais, de forma irreversivel e sem PITR: o flip nao pode ser efeito colateral de uma chamada que pretendia mudar outro campo', coalesce(p_confirmo_live::text, 'NULL')
        USING ERRCODE = '22023';
    END IF;

    -- ── (6.b) OS TRES CRITERIOS DE D-46-14, MEDIDOS NO LEDGER ────────────────
    --
    -- ⚠ LEDGER VAZIO RECUSA POR AUSENCIA, nunca por comparacao com NULL:
    --   `min(iniciada_em)` de uma tabela vazia e NULL, e a comparacao seria NULL —
    --   um `IF` NULL nao e tomado e o portao passaria em silencio sobre um sistema
    --   que nunca rodou uma varredura. O `coalesce` abaixo transforma a ausencia
    --   num FALSE explicito.
    --
    -- ⚠⚠ BL-01 · O RECORTE E POR **MODO E POR VEREDITO**, E AS DUAS ALLOWLISTS
    --   SAO NECESSARIAS. `modo_vigente IN ('dry_run','live')` sozinho deixava
    --   passar `cap_excedido` e `segredo_ausente` — dois vereditos alcancaveis
    --   EM `dry_run` nos quais a funcao retorna ANTES de abrir qualquer item,
    --   exatamente como o kill switch faz em `off`. Catorze noites com o Vault
    --   vazio produziriam catorze linhas em `dry_run` com `elegiveis = 4`, e os
    --   tres criterios estariam satisfeitos com ZERO evidencia sobre o caminho
    --   do delete — o dry-run decorativo que o SC#1 proibe, na forma que o
    --   criterio escrito por extenso nao pega.
    --
    -- ⚠ ALLOWLIST, JAMAIS NEGACAO, nos DOIS eixos. `modo_vigente <> 'off'`
    --   deixaria contar `ausente`, o valor fail-closed que a reconciliacao grava
    --   quando nao conseguiu ler o cerco (`20260823000009:89-90`); e
    --   `veredito <> 'segredo_ausente'` deixaria contar todo veredito novo por
    --   omissao. A allowlist deixa o desconhecido de FORA, que e a direcao
    --   segura num portao que autoriza destruicao irreversivel.
    --
    -- ⚠⚠ E O CRITERIO 3 MEDE **EVIDENCIA**, E NAO SO O NUMERO. Uma execucao so
    --   ensaiou o caminho do delete se algum item dela carrega `relato_dry_run`
    --   — a pre-imagem que o laco (g) captura chamando `anonimizar_candidato(id,
    --   true)`, ou seja a MESMA expressao do delete real. `elegiveis > 0` diz
    --   apenas que o PREDICADO selecionou alguem: uma execucao cujos titulares
    --   falhassem TODOS antes da chamada ao motor (ramo `WHEN OTHERS` do laco,
    --   que grava `desfecho_postgres = 'falha'` e deixa `relato_dry_run` NULO)
    --   satisfaria o criterio antigo tendo ensaiado nada. Os dois viram
    --   CONJUNCAO, que e estritamente mais forte que qualquer das metades.
    SELECT min(pe.iniciada_em),
           count(*),
           count(*) >= 14,
           count(*) FILTER (
             WHERE pe.elegiveis > 0
               AND EXISTS (
                 SELECT 1
                   FROM public.purga_execucao_itens i
                  WHERE i.execucao_id    = pe.id
                    AND i.relato_dry_run IS NOT NULL
               )
           )
      INTO v_primeira, v_total, v_tem_14_exec, v_com_eleg
      FROM public.purga_execucoes pe
     WHERE pe.modo_vigente IN ('dry_run', 'live')
       AND pe.veredito     IN ('dry_run', 'despachado');

    v_tem_14_dias := coalesce(v_primeira <= pg_catalog.now() - interval '14 days', false);

    -- ── (6.c) A PRE-CONDICAO DE POLITICA — D-46-22 ───────────────────────────
    --
    -- Nenhuma etapa da allowlist pode estar em procedencia de seed: **um valor
    -- em seed significa que ninguem CONTESTOU aquele numero, nao que alguem o
    -- DECIDIU.**
    --
    -- ⚠ A CONTAGEM DA ALLOWLIST TAMBEM E MEDIDA: sem ela, uma matriz com
    --   `elegivel_purga` falso em TODA linha faria "zero etapas em seed" ser
    --   verdade por VACUIDADE. Uma condicao que so pode ser satisfeita por
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
    --   plausivel que estava errado.
    v_faltas := concat_ws('; '::text,
      CASE WHEN v_tem_14_dias THEN NULL ELSE
        format('dias corridos desde a primeira execucao de ENSAIO = %s (exigido 14; primeira registrada em %s — contam SO as execucoes em dry_run ou live cujo veredito foi dry_run ou despachado, porque desligado, cap_excedido e segredo_ausente retornam ANTES de abrir qualquer item e nao ensaiam nada)',
               CASE WHEN v_primeira IS NULL
                      THEN 'INDEFINIDO, o ledger nao tem nenhuma execucao de ensaio'
                    ELSE floor(extract(epoch FROM (pg_catalog.now() - v_primeira)) / 86400)::text
               END,
               coalesce(v_primeira::text, 'NENHUMA'))
      END,
      CASE WHEN v_tem_14_exec THEN NULL ELSE
        format('execucoes com linha no ledger em dry_run ou live, e com veredito de ensaio = %s (exigido 14)', v_total)
      END,
      CASE WHEN v_com_eleg >= 1 THEN NULL ELSE
        format('execucoes de ensaio sobre conjunto elegivel NAO-VAZIO e COM EVIDENCIA de que o caminho do delete foi percorrido = %s (exigido ao menos 1). A evidencia e um item com relato_dry_run gravado, que e a pre-imagem que a chamada a anonimizar_candidato(id, true) produz — a MESMA expressao do delete real. Catorze dias de zeros, ou catorze noites em que nenhum titular chegou ao motor, nao provam nada sobre o caminho do delete', v_com_eleg)
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
  -- E este `PERFORM` que torna o flip EVIDENCIADO em vez de meramente
  -- registrado: a mudanca e o registro dela commitam ou revertem JUNTOS.
  --
  -- ⚠ A SEVERIDADE SOBE PARA O TOPO DO VOCABULARIO QUANDO O DESTINO E `live`:
  --   em `live` a varredura noturna passa a destruir PII de pessoas reais em
  --   tres sistemas, de forma irreversivel, num projeto sem PITR e com o Storage
  --   fora de todo caminho de backup. Ligar isso nao e um aviso.
  v_sev := CASE WHEN coalesce(v_virando_live, false)
                  THEN 'critico'::public.severidade_log
                ELSE 'aviso'::public.severidade_log
           END;

  -- ⚠⚠ HI-01 · A ATOMICIDADE DA TRILHA E MANTIDA PARA TODA TRANSICAO **EXCETO**
  --   `-> off`, E A ASSIMETRIA E O PONTO INTEIRO.
  --
  --   Para `-> live`: atomica, como sempre foi. Uma falha da trilha REVERTE o
  --   flip, e isso e correto — ligar destruicao irreversivel de PII sem registro
  --   e pior que nao ligar.
  --
  --   Para `-> off`: a falha da trilha e degradada para `WARNING`. Qualquer
  --   estado a partir do qual o kill switch e RECUSAVEL contradiz o `COMMENT`
  --   desta funcao, que promete "DE ESTADO NENHUM" — e a trilha era um deles: um
  --   rotulo de enum removido depois do apply, uma constraint nova em
  --   `logs_auditoria`, um trigger, disco cheio. Qualquer um deles reverteria a
  --   mutacao junto, e o operador que digitou o kill switch as tres da manha
  --   receberia um erro com a purga CONTINUANDO LIGADA. Um kill switch que pode
  --   ser recusado nao e um kill switch, e o momento em que ele mais importa e
  --   exatamente aquele em que algum criterio estaria falhando.
  --
  --   ⚠ O bloco de auto-verificacao da `20260823000013` confere os rotulos de
  --     enum no instante do APPLY — nao no instante da CHAMADA, que e quando
  --     importa.
  --
  --   ⚠ A DEGRADACAO NAO E SILENCIOSA, e a diferenca importa: o `WARNING` diz,
  --     com essas palavras, que o desligamento VALE e que a trilha e o que
  --     falta. Um `WARNING` do Postgres chega ao `return_message` do cron e ao
  --     log do servidor; o que ele nao faz e transformar uma falha de
  --     escrituracao numa purga que continua apagando gente.
  IF v_modo_novo = 'off' THEN
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'salvar_config_purga: ⚠ A PURGA FOI DESLIGADA E A TRILHA NAO PODE SER GRAVADA (%: %). O DESLIGAMENTO VALE — modo % -> off, gravado e commitado com esta transacao; o que falta e a linha de logs_auditoria. Registrar a mudanca a mao, com este horario e o ator %. ⚠ Esta degradacao vale EXCLUSIVAMENTE para a transicao para off: um kill switch que pode ser recusado nao e um kill switch, e a trilha era um estado a partir do qual ele era recusavel. Para live a trilha continua ATOMICA e uma falha dela REVERTE o flip.',
        SQLSTATE, SQLERRM, v_modo_antes, v_actor;
    END;
  ELSE
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
  END IF;
END;
$salvar_config_purga$;


-- ---------------------------------------------------------------------------
-- 2 · Hardening de EXECUTE — reafirmado, e a razao de reafirmar
-- ---------------------------------------------------------------------------
-- ⚠ `CREATE OR REPLACE FUNCTION` PRESERVA a ACL existente, entao as duas linhas
-- abaixo sao idempotentes hoje. Elas ficam mesmo assim porque este arquivo tem
-- de ser reaplicavel sobre um banco em que a funcao tenha sido DROPADA e
-- recriada — caso em que o `pg_default_acl` do schema `public` deste projeto
-- concede EXECUTE a `anon` de novo, como grant DIRETO e NOMEADO. O idioma
-- difundido daqui (`REVOKE ALL … FROM PUBLIC` sozinho) remove um grant de
-- `PUBLIC` que nunca existiu e deixa `anon=X` de pe; por isso `anon` aparece
-- EXPLICITAMENTE na lista.
REVOKE ALL ON FUNCTION public.salvar_config_purga(text, integer, integer, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.salvar_config_purga(text, integer, integer, boolean) TO authenticated;

COMMENT ON FUNCTION public.salvar_config_purga(text, integer, integer, boolean) IS
  'Phase 46 / 46-07 PURGA-04/05 (D-46-05/14/22), corpo substituido pela 20260823000014 (BL-01 e '
  'HI-01 do 46-REVIEW-2): UNICO caminho de aplicacao para alterar o cerco da purga automatica '
  '(modo, cap de titulares e janela de retencao de notificacoes). SECURITY DEFINER VOLATILE com '
  'search_path vazio. E RPC e NAO policy de UPDATE porque uma policy nao da nenhuma das duas coisas '
  'que PURGA-04 exige junto com a escrita: trilha ATOMICA e RECUSA server-side do flip. '
  'PARAMETRO NULO SIGNIFICA "nao alterar este campo". '
  'ORDEM DO CORPO E SQLSTATE DE CADA RECUSA: '
  '(1) 42501 se o papel do JWT nao for administrador — guard NULL-SAFE por diferenca explicita; '
  '(2) 42501 se nenhuma linha VIVA de usuarios_rh corresponder a sessao; '
  '(3) 22023 para modo fora de (off, dry_run, live), cap fora de 1..500 ou janela fora de 1..120; '
  '(4) leitura do estado anterior com bloqueio da linha; '
  '(5) 22023 em nao-op, com ramo dedicado quando a purga JA ESTA desligada; '
  '(6) O PORTAO DO FLIP, alcancado SOMENTE quando o modo novo e live e o anterior nao era: '
  '22023 sem o argumento explicito de confirmacao; 22023 se faltar qualquer criterio de D-46-14. '
  '⚠⚠ BL-01 · OS CRITERIOS SAO MEDIDOS SOBRE DUAS ALLOWLISTS SIMULTANEAS, e jamais por negacao: '
  'modo_vigente IN (dry_run, live) E veredito IN (dry_run, despachado). O recorte so por modo '
  'deixava passar cap_excedido e segredo_ausente — dois vereditos alcancaveis EM dry_run nos quais '
  'a varredura retorna ANTES de abrir qualquer item, exatamente como o kill switch faz em off. '
  'Catorze noites com o Vault sem edge_invoke_key produziriam catorze linhas em dry_run com '
  'elegiveis > 0 e veredito segredo_ausente, e os tres criterios estariam satisfeitos com ZERO '
  'evidencia sobre o caminho do delete — o dry-run decorativo que D-46-14 existe para impedir. A '
  'allowlist deixa o desconhecido de FORA, que e a direcao segura num portao que autoriza '
  'destruicao irreversivel; um veredito novo no futuro NAO conta ate que esta funcao seja reescrita. '
  '⚠⚠ BL-01 · E O CRITERIO 3 MEDE EVIDENCIA, e nao so o numero: uma execucao so conta se tinha '
  'elegiveis > 0 E algum item dela carrega relato_dry_run — a pre-imagem que a chamada a '
  'anonimizar_candidato(id, true) produz, ou seja a MESMA expressao do delete real. elegiveis > 0 '
  'sozinho diz apenas que o PREDICADO selecionou alguem, e uma execucao cujos titulares falhassem '
  'todos antes da chamada ao motor satisfaria o criterio tendo ensaiado nada. '
  'Ainda no passo (6): 22023 se qualquer etapa da allowlist ainda estiver em procedencia de seed '
  '(D-46-22), ou se a allowlist estiver VAZIA. Cada recusa nomeia o valor MEDIDO e o exigido; '
  '(7) a mutacao, com alterado_por resolvido no servidor; '
  '(8) a trilha, no mesmo corpo, com severidade no TOPO do vocabulario quando o destino e live. '
  '⚠⚠ A TRANSICAO PARA off NAO PASSA PELO PORTAO, DE ESTADO NENHUM: nao exige confirmacao, nao '
  'consulta o ledger e nao consulta a matriz. UM KILL SWITCH QUE PODE SER RECUSADO NAO E UM KILL '
  'SWITCH. '
  '⚠⚠ HI-01 · E ISSO INCLUI A TRILHA. Para a transicao para off, uma falha de log_auditoria e '
  'degradada para WARNING e o desligamento COMMITA assim mesmo: a trilha era um estado a partir do '
  'qual o kill switch era recusavel (rotulo de enum removido depois do apply, constraint nova em '
  'logs_auditoria, trigger, disco cheio), e o bloco de auto-verificacao da 20260823000013 confere '
  'os rotulos no instante do APPLY, nao no da CHAMADA. Para toda outra transicao — live inclusive — '
  'a trilha continua ATOMICA e uma falha dela REVERTE a mudanca: ligar destruicao irreversivel de '
  'PII sem registro e pior que nao ligar, e desligar sem registro e melhor que nao desligar. '
  'A unica coisa que continua valendo para off sem excecao e a autorizacao dos passos (1) e (2). '
  'ACL: revogada nominalmente de PUBLIC, anon e authenticated, e so entao concedida ao papel '
  'autenticado — a funcao e chamada pela tela do administrador com o JWT da pessoa.';
