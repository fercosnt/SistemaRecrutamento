-- =============================================================================
-- Phase 46 / Plan 46-02 (TRACER) — PURGA-02 · PURGA-07 · D-46-11/19
-- O predicado único ganha a allowlist e passa a RELATAR a política que aplicou;
-- e nasce o wrapper por TITULAR, que é o alvo real da purga.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO APAGA NENHUMA LINHA DE CANDIDATO, NÃO CRIA CRON E NÃO
-- CONTÉM UM ÚNICO VERBO DE ESCRITA — as duas funções são `STABLE` e só LEEM.**
--
-- Ela faz UM `DROP FUNCTION`, e esse `DROP` é o único ato irreversível do
-- arquivo: `RETURNS TABLE` não é substituível em lugar por `CREATE OR REPLACE`
-- quando a lista de colunas muda (de TRÊS para SEIS), então a recriação é
-- consciente e está declarada aqui no topo, não escondida no meio do arquivo.
--
-- ⚠⚠ ESTA MIGRATION MUDA UM NÚMERO MEDIDO, E ISSO É O CONTRATO DE NÃO-VACUIDADE:
-- sobre a fixture viva do 46-01, `public.candidaturas_alem_da_janela()` sai de
-- **7 para 6**. Quem sai é `neg-etapa#08`, que está em `entrevista_online` — um
-- estado que NÃO está na allowlist de D-46-19. **Um número que não cai é a
-- cláusula `elegivel_purga` falhando em silêncio**, e nenhuma outra evidência
-- ("a migration aplicou", "o smoke ficou verde") substitui essa medição.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR
-- (subagentes GSD não recebem os tools MCP do Supabase — bug upstream
-- anthropics/claude-code#13898). Sem par de transacao explicita no topo deste
-- arquivo: o driver ja envolve cada migration na sua propria transacao
-- implicita, e um par externo de abertura e fechamento de transacao
-- e o gatilho do SQLSTATE 42601 — CLAUDE.md §Migrations. Este arquivo é
-- exatamente a combinação que o transaction pooler recusa: dois corpos
-- delimitados por cifrões NOMEADOS, adjacentes a `COMMENT` / `REVOKE` / `GRANT`.
--
--   1. **`apply_migration` carimba a PRÓPRIA `version`.** Reparar:
--
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260823000003'
--         WHERE name LIKE '%p46_predicado_titular%';
--
--   2. **O ledger de migrations guarda o SQL LITERALMENTE aplicado.** Conferir:
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260823000003';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260823000003_*.sql)" | md5
--
--   ⚠ HÁ UM SEGUNDO md5 EM JOGO, E ELE É OUTRA COISA. O smoke
--   `supabase/tests/p43_previa_smoke.sql` pina o `md5(prosrc)` do PREDICADO — só
--   o CORPO, o texto entre os dois delimitadores NOMEADOS de cifrao do CREATE
--   FUNCTION daquele predicado. O pin antigo
--   (`ddfa6542921d241323c0124fc1bd1f99`, medido 2026-08-01) **DEIXA DE VALER com
--   esta migration, e isso é ESPERADO e declarado**. O re-pin é obrigação de
--   D-46-18 (obrigação 4) e tem de ser feito com CONFERÊNCIA CRUZADA: o md5 do
--   objeto VIVO (`pg_proc.prosrc`) contra o md5 do CORPO EXTRAÍDO DESTE ARQUIVO.
--   ⚠ Um re-pin **NUNCA** é desculpa para afrouxar a asserção (Pitfall 2): a rede
--   estrutural embaixo do md5 GANHOU checagens nesta fase (`elegivel_purga` e
--   `ancora_origem` presentes), e nunca perdeu nenhuma.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260801000004_p43_previa_retencao.sql:174-216` — o corpo VIVO do
--     predicado. Tudo o que já estava lá continua aqui, verbatim na forma: o
--     `deleted_at IS NULL`, a exceção de revisão do Art. 20 por `NOT EXISTS`
--     correlacionado, os quatro degraus da data-âncora terminando na coluna
--     `data_candidatura`, que é NOT NULL e por isso load-bearing. Mais o `REVOKE`
--     sem `GRANT` de volta, com a razão escrita em `:203-214`.
--
--   · `20260801000004:357-376` — a expressão de agrupamento por titular, que
--     `previa_retencao_total()` JÁ IMPLEMENTA: "titular cujas candidaturas VIVAS
--     estão TODAS fora da janela". `titulares_alem_da_janela()` é essa mesma
--     expressão sem o `count` — copiada na FORMA, não reinventada.
--
--   · `20260730000005_p42_invent05_not_exists.sql:40-91` — o idioma NULL-safe de
--     exceção, e a razão dele: perguntar pela INEXISTÊNCIA de linha correspondente
--     em vez de negar pertencimento a um conjunto de valores. A forma banida, com
--     um conjunto que contenha NULL, devolve DESCONHECIDO e o registro ESCAPA. Foi
--     literalmente o INVENT-05, do outro lado do mesmo tipo de predicado.
--
--   · ⚠ **NÃO foi copiado o `pg_catalog.now()`** do sweep (`20260727000001:172`)
--     para dentro deste predicado. A assimetria é deliberada e está registrada na
--     46-PATTERNS §INV-2: o predicado vivo usa `now()` nu, porque `now()` resolve
--     do `pg_catalog` implícito mesmo com `search_path = ''`. Mudar isso aqui
--     mudaria o corpo sem mudar o comportamento — um re-pin gratuito num arquivo
--     cujo md5 é gate. O código NOVO que roda sob cron (a varredura, migration
--     `20260823000004`) usa `pg_catalog.now()`.
--
--   · ⚠ **NÃO foram acrescentadas as exceções de `retencao_hold` e de VAGA ABERTA
--     (D-46-03/04).** Elas chegam no plano **46-03**, com a tabela
--     `public.retencao_hold` que ainda não existe. Acrescentá-las aqui exigiria
--     criar a tabela nesta migration, o que misturaria duas camadas e faria este
--     arquivo carregar dois re-pins em vez de um. A ordem é deliberada.
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PRECEDENTE, E POR QUÊ
-- -----------------------------------------------------------------------------
-- Duas divergências, e as duas têm a mesma causa: o ledger da purga (PURGA-06)
-- precisa registrar SOB QUAL POLÍTICA cada titular foi selecionado, e não apenas
-- que ele foi.
--
-- **(i) A assinatura passa de TRÊS para SEIS colunas.** Acrescenta
-- `janela_meses_aplicada`, `ancora_origem` e `ancora_em`. `RETURNS TABLE` não é
-- substituível em lugar, daí o `DROP FUNCTION` explícito.
--
-- **(ii) A escada da data-âncora é calculada UMA ÚNICA VEZ, num `LATERAL` que
-- devolve o par `(origem, em)`.** O precedente calculava-a só para filtrar; agora
-- ela também é RELATADA, e a tentação óbvia seria calcular duas vezes — uma no
-- `WHERE`, outra na lista de saída. **Calcular duas vezes é exatamente como o
-- ledger passa a mentir sobre por que a linha foi escolhida**: bastaria uma
-- edição futura tocar numa das cópias. O `WHERE` compara o MESMO `a.em` que a
-- lista de saída devolve. O degrau (1) — o `max(criado_em)` do histórico — é
-- avaliado uma vez só, no primeiro `LATERAL`, e tanto o `CASE` que nomeia a
-- origem quanto a ladeira que resolve o instante leem esse mesmo valor.
--
-- ⚠ CONTRATO DE DESEMPATE, EXPLÍCITO: a comparação é `<` ESTRITO. Uma candidatura
-- cuja âncora somada à janela dá EXATAMENTE `now()` **não** é elegível.
-- `make_interval(months => n)` conta meses de CALENDÁRIO, não blocos de 30 dias —
-- não há arredondamento nem perda de precisão a documentar além disso.
--
-- ⚠ DUAS OBRIGAÇÕES QUE O `DROP` CRIA, E QUE PASSAR BATIDO CUSTA CARO:
--   (a) Recriar a função faz o `pg_default_acl` deste schema conceder EXECUTE a
--       `anon` DE NOVO, como grant DIRETO E NOMEADO. O `REVOKE ALL … FROM PUBLIC,
--       anon, authenticated` tem de ser REEMITIDO, sem `GRANT` de volta. Medição
--       de 2026-07-30: 61 funções DEFINER em `public` com EXECUTE para `anon`,
--       39 chamáveis via PostgREST, porque revogar só de `PUBLIC` não remove nada
--       neste schema. A asserção (b) do smoke da 43 é o gate disso.
--   (b) `previa_retencao()` e `previa_retencao_total()` consomem este predicado
--       por CORPO TEXTUAL (plpgsql resolve em runtime), não por dependência de
--       catálogo — então o `DROP` não as invalida. **Conferido POR LEITURA antes
--       do apply**, e não presumido: `previa_retencao` (`20260801000004:291-297`)
--       lê apenas `a.etapa` e `a.candidato_id` de uma lista de seleção EXPLÍCITA;
--       `previa_retencao_total` (`:357-376`) faz `SELECT *` para a CTE `fora` mas
--       consome dela apenas `f.candidato_id` e `f2.candidatura_id`. As três
--       colunas novas são inofensivas para as duas, e a asserção (h) do smoke da
--       43 (soma por estado == linhas do predicado) continua valendo.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA + QUAL SMOKE É O CONTRATO
-- -----------------------------------------------------------------------------
-- ORDEM OBRIGATÓRIA das quatro migrations do plano 46-02:
--   1º  20260823000001  (config — CRIA `elegivel_purga`, que ESTA migration lê)
--   2º  20260823000002  (ledger)
--   3º  20260823000003  (ESTA — predicado)
--   4º  20260823000004  (varredura — CONSOME `titulares_alem_da_janela()`)
--
-- Aplicar esta antes da `20260823000001` FALHA ALTO no `CREATE FUNCTION` (coluna
-- `elegivel_purga` inexistente), e falhar no apply é a forma barata.
--
-- DOIS smokes são contrato deste arquivo:
--   · `supabase/tests/p43_previa_smoke.sql` — (e) re-pinado, (f) de dois para
--     TRÊS wrappers, (g) de três para QUATRO funções na negativa de escrita.
--     ⚠ As emendas (f) e (g) não são cosmética: sem elas o wrapper novo nasce
--     FORA da regra que proíbe reler a matriz por conta própria, e a asserção
--     continuaria VERDE enquanto o único wrapper que a Phase 46 realmente usa
--     ficava sem vigilância. Um portão que não enxerga o objeto novo é pior que
--     um portão vermelho: ele parece verde.
--   · `supabase/tests/p46_purga_smoke.sql` — (c), (i) e (h).
-- =============================================================================


-- =============================================================================
-- BLOCO A — O PREDICADO ÚNICO, com allowlist e com a política RELATADA
-- =============================================================================
-- ⚠ SE VOCÊ VEIO ESCREVER UM SEGUNDO CAMINHO DESTRUTIVO: **CHAME ESTA FUNÇÃO.**
-- Não copie o corpo, não reescreva "só a parte que interessa", não inline o
-- `JOIN`. A asserção (f) do smoke da 43 exige que os wrappers CHAMEM esta função
-- e proíbe qualquer um deles de referenciar `config_retencao_etapa` diretamente;
-- a asserção (e) pina o md5 do corpo. Uma segunda cópia é como um dry-run passa a
-- mentir sobre a purga sem que ninguém perceba.
--
-- `DROP` seguido de `CREATE`, e não `CREATE OR REPLACE`: a lista de colunas do
-- `RETURNS TABLE` mudou, e o Postgres recusa a substituição em lugar. É ato
-- consciente, declarado no escopo negativo do topo.
DROP FUNCTION public.candidaturas_alem_da_janela();

CREATE FUNCTION public.candidaturas_alem_da_janela()
RETURNS TABLE (
  candidatura_id        uuid,
  candidato_id          uuid,
  etapa                 public.etapa_processo,
  janela_meses_aplicada integer,
  ancora_origem         text,
  ancora_em             timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $candidaturas_alem_da_janela$
  SELECT c.id,
         c.candidato_id,
         c.etapa_atual,
         m.janela_meses,
         a.origem,
         a.em
    FROM public.candidaturas c
    JOIN public.config_retencao_etapa m ON m.etapa = c.etapa_atual
    CROSS JOIN LATERAL (
      SELECT (SELECT max(h.criado_em)
                FROM public.historico_candidatura h
               WHERE h.candidatura_id = c.id
                 AND h.etapa_para = c.etapa_atual) AS hist
    ) g
    CROSS JOIN LATERAL (
      SELECT CASE
               WHEN g.hist               IS NOT NULL THEN 'historico'
               WHEN c.data_decisao_final IS NOT NULL THEN 'decisao_final'
               WHEN c.updated_at         IS NOT NULL THEN 'updated_at'
               ELSE                                       'data_candidatura'
             END::text AS origem,
             COALESCE(g.hist,
                      c.data_decisao_final,
                      c.updated_at,
                      c.data_candidatura::timestamptz) AS em
    ) a
   WHERE c.deleted_at IS NULL
     AND m.elegivel_purga
     AND NOT EXISTS (
           SELECT 1
             FROM public.decisao_final d
            WHERE d.candidatura_id = c.id
              AND d.revisao_solicitada_em IS NOT NULL
              AND d.revisao_respondida_em IS NULL
         )
     AND a.em + make_interval(months => m.janela_meses) < now();
$candidaturas_alem_da_janela$;

-- ⚠ REEMITIDO PORQUE O `DROP` O DESFEZ, e **NENHUM `GRANT` DE VOLTA**.
-- Esta continua sendo a única função da família que devolve LINHAS
-- IDENTIFICÁVEIS (ids de candidatura e de candidato) — e agora devolve também a
-- política aplicada a cada uma. Uma tela capaz de enumerar as pessoas prestes a
-- serem apagadas é superfície de exfiltração de PII construída sem necessidade,
-- então a proibição vive AQUI, no `REVOKE`, e não na camada de apresentação.
--
-- `FROM PUBLIC` sozinho NÃO basta e não é redundância defensiva: medido na
-- P42-06, o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a
-- `anon` e `authenticated` como grants DIRETOS E NOMEADOS em todo
-- `CREATE FUNCTION` — e um `DROP`+`CREATE` os recria. Nomear os dois é obrigatório.
REVOKE ALL ON FUNCTION public.candidaturas_alem_da_janela()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.candidaturas_alem_da_janela() IS
  'Phase 43 / 43-06 RETEN-04, ESTENDIDA pela Phase 46 / 46-02 (PURGA-02/07, D-46-19): A UNICA '
  'DEFINICAO do predicado de retencao. Devolve as candidaturas cuja DATA-ANCORA somada a janela do '
  'proprio estado (public.config_retencao_etapa) ja passou de now(), MAIS a politica que foi '
  'aplicada a cada uma. '
  'SE VOCE VEIO ESCREVER O DELETE (PURGA-02): CHAME ESTA FUNCAO, nao copie o corpo. O dry-run e o '
  'delete real TEM de sair da mesma expressao; um dry-run que diverge do predicado e decoracao '
  '(precedente: P39 CR-02, uma guarda que era dead code). O smoke supabase/tests/p43_previa_smoke.sql '
  'pina o md5(prosrc) desta funcao e assere que os TRES wrappers a CHAMAM — uma segunda copia '
  'reprova o gate. '
  'ASSINATURA DE SEIS COLUNAS (era de tres ate 2026-08-23): candidatura_id, candidato_id, etapa, '
  'janela_meses_aplicada, ancora_origem, ancora_em. As tres ultimas existem porque PURGA-06 exige '
  'que o ledger registre SOB QUAL POLITICA cada titular foi selecionado, e nao apenas que foi. '
  'DATA-ANCORA, ladeira de quatro degraus NESTA ORDEM: (1) o criado_em MAIS RECENTE de '
  'historico_candidatura cuja etapa_para e a etapa_atual da candidatura (o instante em que ela '
  'ENTROU no estado atual — e por estado que a matriz e chaveada); (2) data_decisao_final; '
  '(3) updated_at; (4) data_candidatura, que e NOT NULL. O quarto degrau ser NOT NULL e '
  'LOAD-BEARING: se a ladeira pudesse render NULL, NULL + interval < now() avaliaria NULL, o WHERE '
  'nao seria satisfeito e a candidatura sairia SILENCIOSAMENTE da contagem — o sistema acreditaria '
  'ter politica de retencao funcionando enquanto classificava errado sem sinal. '
  '⚠ A LADEIRA E CALCULADA UMA UNICA VEZ, num CROSS JOIN LATERAL que devolve o par (origem, em); o '
  'WHERE compara o MESMO a.em que a lista de saida devolve. Calcula-la duas vezes — uma para '
  'filtrar, outra para relatar — e como o ledger passa a mentir sobre por que a linha foi escolhida. '
  '⚠ CONTRATO DE DESEMPATE: a comparacao e ESTRITA (<). Ancora + janela == now() NAO e elegivel. '
  'make_interval(months => n) conta meses de CALENDARIO, nao blocos de 30 dias. '
  'EXCECOES por NOT EXISTS correlacionado, JAMAIS por negacao de pertencimento a conjunto de '
  'valores (aquela forma, contra um conjunto que contenha NULL, devolve DESCONHECIDO e o registro '
  'ESCAPA — INVENT-05, 20260730000005). Sao elas, HOJE: deleted_at IS NULL; pedido de revisao do '
  'Art. 20 EM ABERTO (revisao_solicitada_em NOT NULL e revisao_respondida_em NULL), porque apagar a '
  'evidencia de um direito EM EXERCICIO e o defeito que o Art. 20 existe para impedir — exercitada '
  'por execucao pela primeira vez em 2026-08-22 (fixture neg-art20 do plano 46-01); e a ALLOWLIST '
  'de estados. '
  'ALLOWLIST (D-46-19 / PURGA-07): a clausula e m.elegivel_purga — DADO na matriz, jamais lista no '
  'codigo. Sao TRES estados: aprovado, rejeitado, decisao_final. '
  '⚠ LACUNA NOMEADA, e ela MUDA O EFEITO de D-46-01: rascunho (is_rascunho) e candidatura parada em '
  'funil ativo ficam em estados FORA da allowlist, logo NUNCA sao purgados automaticamente. E '
  'retencao indefinida DECLARADA, nao esquecimento — ver o COMMENT de config_retencao_etapa.'
  'elegivel_purga. '
  '⚠ DECISAO REGISTRADA (BD-1 / D-46-02): autorizacao_retencao_curriculo NAO ENTRA NESTE PREDICADO, '
  'e a Phase 46 MANTEM essa decisao. Ele segue sendo base legal CITADA na superficie do candidato '
  '(RETEN-03), nunca encurtador de janela — a regra "nao autorizou => retencao = duracao do '
  'processo" e decisao de POLITICA pendente de parecer juridico, e mante-la pendente e escolha '
  'deliberada e nao omissao. '
  '⚠ A LISTA DE EXCECOES SEGUE INCOMPLETA POR DESENHO, e o que falta tem PLANO E DATA: retencao por '
  'obrigacao legal concorrente ou litigio em curso (public.retencao_hold) e candidatura de VAGA '
  'AINDA ABERTA (D-46-03/04) chegam no plano 46-03, no mesmo lugar, por NOT EXISTS. '
  'SEM GRANT PARA PAPEL DE CLIENTE: e a unica funcao da familia que devolve linhas IDENTIFICAVEIS. '
  'A proibicao e ESTRUTURAL (vive no REVOKE, reemitido apos o DROP porque o pg_default_acl deste '
  'schema reconcede EXECUTE a anon em todo CREATE FUNCTION), nao confiada a apresentacao. '
  'STABLE e sem verbo de escrita: ela LE, nunca apaga.';


-- =============================================================================
-- BLOCO B — `titulares_alem_da_janela()`: o ALVO REAL da purga (D-46-11)
-- =============================================================================
-- ⚠ O PREDICADO DA 43 É POR CANDIDATURA; O MOTOR DA 45 OPERA POR TITULAR.
-- `public.anonimizar_candidato(p_candidato_id, ...)` apaga a PESSOA — Storage,
-- Postgres e Auth. Alimentá-lo com uma lista de candidaturas apagaria titulares
-- que ainda têm processo vivo, ou seja: apagaria MEIO CANDIDATO. Este wrapper é a
-- ponte entre as duas granularidades, e a regra é a mais conservadora possível —
-- o titular só entra quando **NENHUMA** de suas candidaturas vivas está dentro da
-- janela.
--
-- ⚠ ESTA FUNÇÃO NÃO REFERENCIA `public.config_retencao_etapa`, E ISSO É REGRA E
-- NÃO ESTILO. Ler a matriz por conta própria é o primeiro passo da segunda cópia
-- do predicado, e a asserção (f) do smoke da 43 — emendada de dois para TRÊS
-- wrappers no mesmo commit que cria esta função — reprova quem o fizer. Tudo o
-- que este wrapper sabe sobre política, ele sabe porque o predicado lhe contou.
--
-- A forma do agrupamento é copiada de `previa_retencao_total()`
-- (`20260801000004:357-376`), que já implementa exatamente esta regra: a mesma
-- expressão, sem o `count`. As colunas de política reportadas são as da
-- candidatura com o MAIOR `ancora_em` — a mais antiga em termos de exposição —
-- com desempate determinístico por `candidatura_id`, para que duas execuções
-- sobre o mesmo estado produzam o mesmo relato.
CREATE FUNCTION public.titulares_alem_da_janela()
RETURNS TABLE (
  candidato_id          uuid,
  candidaturas_alem     integer,
  etapa                 public.etapa_processo,
  janela_meses_aplicada integer,
  ancora_origem         text,
  ancora_em             timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $titulares$
  WITH fora AS (
    SELECT * FROM public.candidaturas_alem_da_janela()
  ),
  vivas AS (
    SELECT c.id, c.candidato_id
      FROM public.candidaturas c
     WHERE c.deleted_at IS NULL
  ),
  alvos AS (
    SELECT DISTINCT f.candidato_id
      FROM fora f
     WHERE NOT EXISTS (
             SELECT 1
               FROM vivas v
              WHERE v.candidato_id = f.candidato_id
                AND NOT EXISTS (
                      SELECT 1 FROM fora f2 WHERE f2.candidatura_id = v.id
                    )
           )
  )
  SELECT t.candidato_id,
         (SELECT count(*)::integer FROM fora f3 WHERE f3.candidato_id = t.candidato_id),
         r.etapa,
         r.janela_meses_aplicada,
         r.ancora_origem,
         r.ancora_em
    FROM alvos t
    CROSS JOIN LATERAL (
      SELECT f4.etapa, f4.janela_meses_aplicada, f4.ancora_origem, f4.ancora_em
        FROM fora f4
       WHERE f4.candidato_id = t.candidato_id
       ORDER BY f4.ancora_em DESC, f4.candidatura_id DESC
       LIMIT 1
    ) r;
$titulares$;

REVOKE ALL ON FUNCTION public.titulares_alem_da_janela()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.titulares_alem_da_janela() TO service_role;

COMMENT ON FUNCTION public.titulares_alem_da_janela() IS
  'Phase 46 / 46-02 PURGA-02 (D-46-11): o ALVO REAL da purga — os TITULARES cujas candidaturas '
  'VIVAS estao TODAS alem da janela. Wrapper de public.candidaturas_alem_da_janela(): CHAMA o '
  'predicado unico e NADA MAIS. '
  '⚠ POR QUE POR TITULAR E NAO POR CANDIDATURA: o predicado da Phase 43 e por CANDIDATURA, mas '
  'public.anonimizar_candidato(p_candidato_id, ...) — o motor exercitado em PROD na Phase 45 — apaga '
  'a PESSOA (Storage, Postgres e Auth). Alimenta-lo com candidaturas apagaria titulares que ainda '
  'tem processo vivo, ou seja: apagaria MEIO CANDIDATO. A regra e a mais conservadora possivel — '
  'basta UMA candidatura viva dentro da janela para o titular inteiro ficar de fora. '
  'A forma do agrupamento e a de previa_retencao_total() (20260801000004:357-376), a MESMA '
  'expressao sem o count, por NOT EXISTS aninhado. '
  '⚠ NAO REFERENCIA config_retencao_etapa, E ISSO E REGRA: ler a matriz por conta propria e o '
  'primeiro passo da segunda copia do predicado, e a asserção (f) de p43_previa_smoke.sql — emendada '
  'de DOIS para TRES wrappers no mesmo commit que criou esta funcao — reprova quem o fizer. Tudo o '
  'que este wrapper sabe sobre politica, ele sabe porque o predicado lhe contou. '
  'COLUNAS DE POLITICA: sao as da candidatura com o MAIOR ancora_em (a de exposicao mais antiga), '
  'com desempate DETERMINISTICO por candidatura_id, para que duas execucoes sobre o mesmo estado '
  'produzam o mesmo relato. candidaturas_alem conta quantas daquele titular entraram. '
  'ACL: REVOKE nominal de PUBLIC, anon e authenticated (o pg_default_acl deste schema concede '
  'EXECUTE a anon como grant DIRETO em todo CREATE FUNCTION — revogar so de PUBLIC nao remove nada); '
  'GRANT EXECUTE apenas a service_role. Ela devolve linhas IDENTIFICAVEIS de pessoas prestes a '
  'serem apagadas, entao nenhum papel de cliente a alcanca. '
  'STABLE e sem verbo de escrita: ela LE, nunca apaga. Quem executa e '
  'public.varrer_purga_retencao().';
