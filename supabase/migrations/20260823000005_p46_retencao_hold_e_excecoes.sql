-- =============================================================================
-- Phase 46 / Plan 46-03 — PURGA-07 · PURGA-02 · D-46-01/02/03/04/19
-- As QUATRO exceções de política que a Phase 43 deixou explicitamente abertas,
-- fechadas dentro da ÚNICA definição do predicado. Duas ganham cláusula, duas
-- são satisfeitas por AUSÊNCIA — e as duas ausências ficam ESCRITAS.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO APAGA NENHUMA LINHA, NÃO AGENDA NADA, NÃO CRIA CAPACIDADE
-- DESTRUTIVA E NÃO LIGA A PURGA — `config_purga.modo` continua como está.**
--
-- Nenhum verbo de escrita sobre dado de pessoa. Ela cria UMA tabela-guarda
-- ADITIVA e VAZIA, e substitui EM LUGAR o corpo de uma função `STABLE` que só LÊ.
-- Não há `DROP FUNCTION` aqui: a assinatura de seis colunas do plano 46-02 fica
-- inalterada, então `CREATE OR REPLACE` basta — e isso evita de saída o problema
-- de ACL que um `DROP` cria (o `pg_default_acl` deste schema reconcede EXECUTE a
-- `anon` em todo `CREATE FUNCTION`).
--
-- ⚠⚠ ESTA MIGRATION MUDA UM NÚMERO MEDIDO, E ISSO É O CONTRATO DE NÃO-VACUIDADE:
-- sobre a fixture viva do 46-01, `public.candidaturas_alem_da_janela()` sai de
-- **6 para 4**. Quem sai é `neg-hold#05` (candidatura
-- `4601c000-0000-4000-8000-000000000005`, protegida pela linha de
-- `public.retencao_hold` que ESTA migration insere) e `neg-vaga#06` (candidatura
-- `4601c000-0000-4000-8000-000000000006`, cuja vaga está em `ativa`).
-- **Um número que não cai é a exceção correspondente falhando em SILÊNCIO**, e
-- nenhuma outra evidência ("a migration aplicou", "o smoke ficou verde")
-- substitui essa medição. Sobram `pos1#01`, `pos2#02`, `pos3#03` e `cap2#04`.
--
-- ⚠ A INSERÇÃO DA LINHA DE HOLD NÃO É FIXTURE OPCIONAL, É OBRIGAÇÃO HERDADA.
-- `supabase/tests/p46_fixture_elegivel.sql` §5f tentou inserir essa linha em
-- 2026-08-22, não conseguiu (a tabela não existia) e emitiu apenas um aviso.
-- Enquanto ela faltar, `neg-hold` é só mais uma candidatura elegível e a asserção
-- (j.1) do smoke desta fase passa **por VACUIDADE** — exatamente o modo de falha
-- que a Phase 46 inteira existe para eliminar. Por isso o `INSERT` está aqui, na
-- migration que cria a tabela, e não num arquivo de teste que pode não rodar.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — VIA ATUAL, e ela NÃO pede reparo de `version`
-- -----------------------------------------------------------------------------
-- O apply é feito PELO ORQUESTRADOR, pela **Management API do Supabase**
-- (`POST /v1/projects/{ref}/database/query`), com o SQL **lido deste arquivo byte
-- a byte** — nunca transcrito. O comando de push do CLI é PROIBIDO neste projeto,
-- e a via por transcrição é a que fez duas das cinco migrations do M8 chegarem a
-- PROD com os comentários descartados. Ver CLAUDE.md §"Via de apply ATUAL".
--
-- Sem par de transacao explicita no topo deste arquivo: o endpoint ja envolve o
-- corpo inteiro da requisicao na sua propria transacao, e um par externo de
-- abertura e fechamento de transacao e o gatilho do SQLSTATE 42601 ("cannot
-- insert multiple commands into a prepared statement") — CLAUDE.md §Migrations.
-- Este arquivo tem a combinação que o transaction pooler recusa: um corpo
-- delimitado por cifrões NOMEADOS adjacente a `COMMENT` e a `REVOKE`.
--
--   1. ⚠ **NÃO HÁ REPARO DE `version` A FAZER, E PEDIR UM SERIA ERRO.** Pela
--      Management API a `version` nasce CORRETA. A instrução de
--      `UPDATE supabase_migrations.schema_migrations SET version = …` que os
--      cabeçalhos das migrations `20260823000001`..`4` carregam ficou OBSOLETA no
--      mesmo dia em que foi escrita (ela descrevia o comportamento do transporte
--      anterior, que carimbava o instante do apply em vez da versão do arquivo).
--      Aqueles arquivos NÃO foram corrigidos de propósito: o ledger guarda o
--      arquivo literal, e editá-los faria o md5 divergir e quebraria a própria
--      prova. A correção vive no CLAUDE.md, e esta migration não propaga o erro.
--
--   2. **O ledger guarda o SQL LITERALMENTE aplicado** em
--      `supabase_migrations.schema_migrations.statements text[]`. Pela via atual
--      o md5 bate **por construção** — e ainda assim é CONFERIDO por leitura de
--      volta, porque "bate por construção" é uma afirmação sobre o mecanismo e
--      não uma medição:
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260823000005';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260823000005_*.sql)" | md5
--
--      ⚠ AQUI A PERDA DE COMENTÁRIO **NÃO É BENIGNA**: o `COMMENT ON FUNCTION`
--      reescrito abaixo é o único lugar DENTRO DO BANCO onde ficam registradas as
--      DUAS decisões satisfeitas por ausência (D-46-01 e D-46-02). Uma decisão
--      registrada como ausência é indistinguível de um esquecimento quando o
--      próximo leitor chega; perder o comentário é perder a decisão.
--
--   ⚠ HÁ UM SEGUNDO md5 EM JOGO, E ELE É OUTRA COISA. O smoke
--   `supabase/tests/p43_previa_smoke.sql` pina o `md5(prosrc)` do PREDICADO — só
--   o CORPO, o texto entre os dois delimitadores NOMEADOS de cifrao do CREATE
--   FUNCTION abaixo. O pin vigente ate esta migration
--   (`6df3564414519abc56379d9b8924fad0`, 1357 octetos, carimbado em 2026-08-23
--   pelo plano 46-02) **DEIXA DE VALER**, e isso é ESPERADO e declarado. Este é o
--   **SEGUNDO** re-pin da Phase 46, e ele é feito com CONFERÊNCIA CRUZADA: o md5
--   do objeto VIVO (`pg_proc.prosrc`) contra o md5 do CORPO EXTRAÍDO DESTE
--   ARQUIVO, os dois lados medidos e registrados no `46-03-SUMMARY.md`.
--   ⚠ Um re-pin **NUNCA** é desculpa para afrouxar a asserção (Pitfall 2): a rede
--   estrutural embaixo do md5 GANHOU duas checagens nesta migration
--   (`retencao_hold` presente e `status_vaga` presente) e não perdeu nenhuma.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260823000003_p46_predicado_titular.sql:177-227` — o corpo VIVO do
--     predicado, que esta migration substitui EM LUGAR. Tudo o que já estava lá
--     continua aqui, verbatim na forma: `deleted_at IS NULL`, a cláusula
--     `m.elegivel_purga` (a allowlist de D-46-19), a exceção de revisão do Art. 20
--     por inexistência de linha correspondente, a escada da data-âncora calculada
--     UMA vez num `CROSS JOIN LATERAL` que devolve o par `(origem, em)`, e a
--     comparação ESTRITA (`<`) contra `now()`.
--
--   · `20260730000005_p42_invent05_not_exists.sql:40-91` — o idioma NULL-safe de
--     exceção e a tese por trás dele: perguntar pela INEXISTÊNCIA de linha
--     correspondente em vez de negar pertencimento a um conjunto de valores. A
--     forma banida, contra um conjunto que contenha NULL, devolve DESCONHECIDO, o
--     `WHERE` não é satisfeito e o registro ESCAPA. Foi literalmente esse bug, do
--     outro lado do mesmo predicado, no INVENT-05. As DUAS cláusulas novas deste
--     arquivo são correlacionadas, e nenhuma delas é negociável.
--
--   · `20260804000002_p44_solicitacoes_dados.sql:90-131` — a forma da tabela:
--     restrições NOMEADAS explicitamente (`fk_…`, `ck_…`) e uma chave estrangeira
--     sem ação referencial declarada, com o silêncio JUSTIFICADO POR ESCRITO em
--     `COMMENT ON CONSTRAINT`. Copiado na forma e na disciplina.
--
--   · `20260804000002:179-200` — RLS com UMA policy de leitura e ZERO de escrita,
--     mais o `COMMENT ON POLICY` que explica por que a ausência é decisão. É o
--     mesmo molde de `config_purga_admin_read` (`20260823000001:232-243`).
--
--   · `20260804000002:147-153` — o molde do `COMMENT ON COLUMN` que PROÍBE um
--     campo de texto livre de virar depósito de PII. Aplicado a `detalhe`.
--
--   · `20260801000004_p43_previa_retencao.sql:203-214` — a razão escrita do
--     `REVOKE` sem `GRANT` de volta: esta é a única função da família que devolve
--     LINHAS IDENTIFICÁVEIS de pessoas prestes a serem apagadas.
--
--   · ⚠ **NÃO foi copiado o `pg_catalog.now()`** do sweep (`20260727000001:172`)
--     para dentro deste predicado. A assimetria é deliberada e está registrada na
--     46-PATTERNS §INV-2: o predicado vivo usa `now()` nu, porque `now()` resolve
--     do `pg_catalog` implícito mesmo com o caminho de busca vazio. Mudar isso
--     aqui mudaria o corpo sem mudar o comportamento — um re-pin gratuito num
--     arquivo cujo md5 é gate.
--
--   · ⚠ **NÃO foi criada policy de ESCRITA em `retencao_hold`, e NÃO foi criada
--     RPC de escrita.** Quem escreve nessa tabela decide quem NÃO é purgado. A
--     escrita fica com `service_role` e com funções DEFINER, e a superfície de
--     escrita para papel de cliente é ZERO. Ver o `COMMENT ON POLICY`.
--
--   · ⚠ **NÃO entrou cláusula sobre `is_rascunho` (D-46-01) nem sobre
--     `autorizacao_retencao_curriculo` (D-46-02).** As duas ausências são
--     DELIBERADAS e estão escritas no corpo e no `COMMENT ON FUNCTION` — ver a
--     seção (3).
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PRECEDENTE, E POR QUÊ
-- -----------------------------------------------------------------------------
-- **(i) `CREATE OR REPLACE`, e não `DROP` + `CREATE`.** A `20260823000003`
-- precisou do `DROP` porque a lista de colunas do `RETURNS TABLE` mudou. Aqui ela
-- NÃO muda: continuam as mesmas seis colunas. Substituir em lugar preserva o
-- `proacl` e evita que o `pg_default_acl` do schema reconceda EXECUTE a `anon`.
-- O `REVOKE` abaixo é reemitido mesmo assim, por segurança e não por necessidade.
--
-- **(ii) A exceção de vaga é `NOT EXISTS` E allowlist AO MESMO TEMPO, e essa
-- propriedade é o ponto.** O que está DENTRO do `NOT EXISTS` é o **COMPLEMENTO**
-- da allowlist de estados FECHADOS (`arquivada`, `inativa`). Consequência: um
-- valor NOVO em `public.status_vaga` que ninguém previu cai FORA da allowlist,
-- casa o `NOT EXISTS` e **PROTEGE** a candidatura em vez de expô-la.
-- **Fail-closed por CONSTRUÇÃO, não por vigilância.** Processo vivo não se apaga,
-- mesmo que a data-âncora já tenha estourado. Os quatro valores vivos do enum,
-- verbatim do catálogo em 2026-08-22: `rascunho`, `ativa`, `inativa`, `arquivada`.
-- ⚠ `public.candidaturas.vaga_id` é NOT NULL, e isso é LOAD-BEARING aqui do mesmo
-- jeito que `data_candidatura` é load-bearing na escada da data-âncora: se ele
-- pudesse ser nulo, nenhuma linha de `vagas` casaria, o `NOT EXISTS` seria
-- verdadeiro e a candidatura órfã ficaria purgável em SILÊNCIO.
--
-- **(iii) AS DUAS AUSÊNCIAS SÃO DECLARADAS, DENTRO DO BANCO.** D-46-01 (rascunho)
-- e D-46-02 (autorização de retenção de currículo) são satisfeitas por AUSÊNCIA
-- de cláusula. Ausência silenciosa é indistinguível de esquecimento, então as
-- duas ficam escritas em comentário inline **e** no `COMMENT ON FUNCTION`:
--   · **D-46-01:** rascunho NÃO ganha janela própria. Segue a matriz pelo estado
--     em que está. Criar uma janela curta própria sem parecer jurídico seria
--     tomar decisão de política por acidente de implementação.
--   · **D-46-02 (BD-1 mantido):** `autorizacao_retencao_curriculo` continua sendo
--     BASE LEGAL CITADA na superfície do candidato (RETEN-03), e NUNCA
--     encurtador de janela. A regra "não autorizou ⇒ retenção = duração do
--     processo" permanece decisão de POLÍTICA pendente de parecer, mantida
--     pendente DE PROPÓSITO em vez de resolvida por omissão.
--
-- **(iv) A LACUNA NOMEADA DE D-46-19 é repetida aqui.** D-46-19 MUDA O EFEITO de
-- D-46-01, e a mudança é declarada: rascunho fica em `inscricao`, que não está na
-- allowlist, logo **rascunho nunca é purgado automaticamente** — e o mesmo vale
-- para qualquer candidatura parada em funil ativo. Essa retenção indefinida é uma
-- lacuna NOMEADA desta fase. Ela já está escrita no `COMMENT` da coluna
-- `config_retencao_etapa.elegivel_purga` (plano 46-02) e fica escrita aqui também,
-- porque lacuna escrita é auditável e lacuna silenciosa é o próprio modo de falha
-- que PURGA-07 descreve ("o sistema acredita ter uma política funcionando e apaga
-- zero").
--
-- **(v) A LISTA DE EXCEÇÕES DEIXA DE SER EXTENSÍVEL POR DESENHO.** O texto vivo
-- do `COMMENT` escrito na Phase 43 dizia que a lista seguia incompleta e
-- endereçava esta fase por nome. As quatro estão agora escritas; o texto novo
-- FECHA a lista e mantém a frase que manda chamar a função em vez de copiar o
-- corpo.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA + QUAL SMOKE É O CONTRATO
-- -----------------------------------------------------------------------------
-- Esta migration DEPENDE das quatro do plano 46-02, já aplicadas em PROD em
-- 2026-08-23 (`20260823000001` a `20260823000004`). Aplicá-la antes falharia alto
-- no `CREATE OR REPLACE` (coluna `elegivel_purga` inexistente), e falhar no apply
-- é a forma barata.
--
-- DOIS smokes são contrato deste arquivo:
--   · `supabase/tests/p46_purga_smoke.sql` — as letras (j.1), (j.2), (j.3), (k) e
--     (l), cada uma sobre fixture que está ALÉM DA JANELA. Se a fixture negativa
--     estivesse DENTRO da janela, a asserção passaria porque a DATA protegeu e não
--     porque a EXCEÇÃO funcionou, e isso é um falso verde.
--   · `supabase/tests/p43_previa_smoke.sql` — (e) re-pinado pela SEGUNDA vez nesta
--     fase, com a rede estrutural crescida para `retencao_hold` e `status_vaga`.
-- =============================================================================


-- =============================================================================
-- SEÇÃO A — `public.retencao_hold`: a tabela-guarda de D-46-04
-- =============================================================================
-- ADITIVA e VAZIA por padrão. Ela não muda o comportamento de nada enquanto não
-- tiver linha — com a única e deliberada exceção da linha de fixture inserida na
-- seção A.2, que existe para que a asserção (j.1) do smoke tenha o que provar.
CREATE TABLE public.retencao_hold (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid        NOT NULL,
  motivo         text        NOT NULL,
  detalhe        text,
  criado_por     uuid        NULL REFERENCES public.usuarios_rh(id),
  criado_em      timestamptz NOT NULL DEFAULT now(),
  liberado_em    timestamptz,
  liberado_por   uuid        NULL REFERENCES public.usuarios_rh(id),

  CONSTRAINT fk_retencao_hold_candidatura
    FOREIGN KEY (candidatura_id) REFERENCES public.candidaturas(id),

  CONSTRAINT ck_retencao_hold_motivo
    CHECK (motivo IN ('obrigacao_legal', 'litigio', 'fiscal', 'trabalhista', 'outro'))
);

COMMENT ON TABLE public.retencao_hold IS
  'Phase 46 / 46-03 PURGA-07 (D-46-04): a TABELA-GUARDA que segura UMA candidatura especifica fora '
  'da purga automatica, por obrigacao legal concorrente (trabalhista, fiscal), litigio em curso, ou '
  'qualquer motivo que exija reter um registro pontual. '
  '⚠ A RAZAO DE EXISTIR, E NAO A ESTRUTURA: sem esta tabela, o unico jeito de proteger uma '
  'candidatura especifica e DESLIGAR A PURGA INTEIRA — um controle grosso demais para um caso que e '
  'por definicao pontual, e que na pratica significa escolher entre reter tudo e apagar quem nao '
  'podia ser apagado. Estrutura aditiva e barata AGORA; ausente, ela custa uma migration sob pressao '
  'no dia em que for necessaria, que e sempre o pior dia possivel para escrever uma. '
  'CONSUMIDA POR INEXISTENCIA DE LINHA CORRESPONDENTE dentro de '
  'public.candidaturas_alem_da_janela(): uma linha com liberado_em NULO protege; carimbar '
  'liberado_em devolve a candidatura ao conjunto elegivel. Nada e apagado pela liberacao — ela '
  'apenas deixa de proteger, e a purga volta a poder alcancar a linha na varredura seguinte. '
  'NASCE VAZIA de proposito, com UMA excecao declarada: a linha de fixture da candidatura '
  '4601c000-0000-4000-8000-000000000005 (variante neg-hold do plano 46-01), sem a qual a assercao '
  '(j.1) do smoke da fase passaria por VACUIDADE. '
  'ACL: RLS ligada, UMA policy de SELECT para administrador, ZERO policy de escrita — ver o '
  'COMMENT ON POLICY, onde a ausencia esta justificada. '
  'RETENCAO DA PROPRIA TABELA: indefinida e DECLARADA (mesma disciplina de D-46-16 aplicada ao '
  'ledger). Uma linha de hold e a prova de que houve obrigacao legal concorrente, e apagar a prova '
  'junto com o motivo tornaria a decisao de nao ter purgado inauditavel.';

COMMENT ON COLUMN public.retencao_hold.candidatura_id IS
  'A candidatura protegida. GRANULARIDADE DELIBERADA: o hold e por CANDIDATURA e nao por TITULAR, '
  'porque o predicado e por candidatura e o alvo da purga (public.titulares_alem_da_janela) so '
  'seleciona o titular quando TODAS as suas candidaturas vivas estao alem da janela — entao segurar '
  'UMA candidatura ja segura o titular inteiro, e a reciproca nao vale: um hold por titular nao '
  'diria QUAL processo gerou a obrigacao legal.';

COMMENT ON CONSTRAINT fk_retencao_hold_candidatura ON public.retencao_hold IS
  '⚠ SEM clausula de acao referencial declarada, deliberadamente (= NO ACTION). As tres alternativas '
  'sao piores, cada uma a seu modo, e a escolha esta escrita para nao ser refeita por reflexo: '
  'a propagacao em cascata apagaria a PROVA de que houve obrigacao legal junto com o fato, que e '
  'exatamente o que esta tabela existe para impedir; a restricao impediria a purga de concluir '
  'mesmo depois de o hold ter sido liberado, transformando um controle pontual em bloqueio '
  'permanente; e anular a coluna destruiria a unica informacao que responde QUAL candidatura estava '
  'sob hold. NO ACTION significa que remover a candidatura exige remover o hold ANTES, '
  'explicitamente — e essa ordem e a pergunta que quem apaga precisa responder.';

COMMENT ON COLUMN public.retencao_hold.motivo IS
  'Vocabulario FECHADO por ck_retencao_hold_motivo: obrigacao_legal, litigio, fiscal, trabalhista, '
  'outro. E ELE que carrega a semantica auditavel — nunca o campo de texto livre ao lado. Um '
  'vocabulario fechado e agregavel ("quantos holds fiscais existem hoje"); texto livre nao e.';

COMMENT ON COLUMN public.retencao_hold.detalhe IS
  '⚠ NAO GUARDA PII, E A PROIBICAO E EXPLICITA PORQUE O CAMPO E TENTADOR: nunca nome, e-mail, CPF, '
  'telefone, endereco, data de nascimento, caminho de Storage nem conteudo de documento. Guarda '
  'REFERENCIA a processo externo (numero de processo, protocolo, oficio) e nada mais. '
  'A razao e a mesma da banlist do ledger (D-46-15): uma tabela criada para IMPEDIR uma purga nao '
  'pode virar o lugar onde a PII sobrevive a ela — isso faria a purga apenas MOVER o dado, com '
  'retencao indefinida por cima. NULL e o valor normal: motivo ja diz o que precisa ser dito.';

COMMENT ON COLUMN public.retencao_hold.criado_por IS
  'Quem registrou o hold, quando houver operador humano. NULO e legitimo e nao e falha de auditoria: '
  'a linha da fixture do plano 46-01 nao tem autor humano, e um hold inserido por processo '
  'automatico tampouco teria. A FK aponta para public.usuarios_rh e NAO para auth.users, porque o '
  'ator relevante aqui e o operador de RH — assimetria consciente com decisao_final.por_usuario, '
  'que aponta para auth.users (medido em 46-01 §M2c).';

COMMENT ON COLUMN public.retencao_hold.liberado_em IS
  '⚠ E ESTA COLUNA QUE O PREDICADO LE. Nula = hold ATIVO = candidatura protegida. Carimbada = hold '
  'encerrado = a candidatura volta ao conjunto elegivel na varredura seguinte. A linha NAO e '
  'apagada na liberacao, e isso e o ponto: apagar destruiria o registro de que houve protecao e por '
  'quanto tempo, que e a unica coisa capaz de explicar, meses depois, por que aquela pessoa nao foi '
  'purgada na janela em que deveria.';

COMMENT ON COLUMN public.retencao_hold.liberado_por IS
  'Quem encerrou o hold. Mesma semantica de criado_por, e mesma FK.';

CREATE INDEX idx_retencao_hold_ativo
  ON public.retencao_hold (candidatura_id)
  WHERE liberado_em IS NULL;

COMMENT ON INDEX public.idx_retencao_hold_ativo IS
  'Phase 46 / 46-03: serve a subconsulta correlacionada de public.candidaturas_alem_da_janela(), que '
  'pergunta pela INEXISTENCIA de hold ativo para cada candidatura. E o caminho quente do predicado — '
  'roda uma vez por candidatura viva em toda previa e em toda varredura —, e o indice e PARCIAL '
  '(liberado_em nulo) porque holds encerrados nao participam da pergunta.';


-- ---------------------------------------------------------------------------
-- A.1 · RLS — UMA policy de leitura admin-only, e NENHUM caminho de escrita
-- ---------------------------------------------------------------------------
ALTER TABLE public.retencao_hold ENABLE ROW LEVEL SECURITY;

-- Espelho verbatim de `config_purga_admin_read` (`20260823000001:232-234`), que
-- por sua vez espelha `config_retencao_etapa_admin_read`. É o idioma admin-only
-- deste projeto.
CREATE POLICY retencao_hold_admin_read ON public.retencao_hold
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador');

COMMENT ON POLICY retencao_hold_admin_read ON public.retencao_hold IS
  'Phase 46 / 46-03 (D-46-04): LEITURA admin-only, espelho de config_purga_admin_read. '
  '⚠ ZERO POLICY DE ESCRITA, E A AUSENCIA E O CONTROLE — ela NAO e esquecimento. Quem escreve nesta '
  'tabela decide quem NAO e purgado, e isso corta nos DOIS sentidos: inserir uma linha subtrai uma '
  'pessoa da purga, e LIBERAR uma linha devolve a purga uma pessoa que estava protegida por '
  'obrigacao legal. A segunda direcao e a perigosa, e e a que uma policy de UPDATE abriria para '
  'qualquer sessao autenticada que soubesse o id: destravar um hold e o passo que falta entre '
  '"registro sob litigio" e "registro apagado irreversivelmente" (PITR desligado por D-45-10, '
  'Storage fora do backup). '
  'A escrita fica com service_role e com funcoes SECURITY DEFINER, que bypassam RLS e por isso nao '
  'precisam de policy. Se um dia a tela do RH precisar registrar holds, o caminho e uma RPC AUDITADA '
  '— que grava a mudanca e a linha de auditoria na MESMA transacao e que pode RECUSAR —, nunca uma '
  'policy de escrita, pela mesma razao registrada em config_purga_admin_read.';


-- ---------------------------------------------------------------------------
-- A.2 · A LINHA DE HOLD DA FIXTURE — obrigação herdada do plano 46-01
-- ---------------------------------------------------------------------------
-- ⚠ ESTA É A ÚNICA ESCRITA DE DADO DESTA MIGRATION, E ELA É SOBRE UM REGISTRO
-- SINTÉTICO. A candidatura `4601c000-0000-4000-8000-000000000005` é a variante
-- `neg-hold` da fixture do plano 46-01: um titular sintético, em domínio não
-- roteável (`fixture-p46+neg-hold@invalido.local`), que nunca participou de
-- processo seletivo e nunca foi uma pessoa.
--
-- **Sem esta linha, a asserção (j.1) do smoke passa por VACUIDADE.** `neg-hold`
-- está ALÉM da janela e continuaria elegível; a asserção "neg-hold não aparece"
-- seria falsa, e a metade que a salva ("aparece depois de liberado") não teria
-- linha para liberar. A fixture tentou inserir isto em 2026-08-22, guardada por
-- `to_regclass`, e só pôde emitir um aviso porque a tabela ainda não existia.
--
-- Correlacionado por EXISTÊNCIA da candidatura, e não cego: se a fixture tiver
-- sido removida por teardown, o `INSERT` não grava nada e a migration aplica
-- assim mesmo — o smoke é quem reprova, com diagnóstico correto, em vez de o
-- apply falhar por causa de um dado de teste.
INSERT INTO public.retencao_hold (candidatura_id, motivo, detalhe)
SELECT c.id,
       'obrigacao_legal',
       'FIXTURE P46 (plano 46-01, variante neg-hold) — hold sintetico sobre candidatura sintetica. '
       'Existe para que a assercao (j.1) de supabase/tests/p46_purga_smoke.sql prove a excecao de '
       'D-46-04 por EXECUCAO em vez de por vacuidade. Sem PII: nenhum dado de pessoa real.'
  FROM public.candidaturas c
 WHERE c.id = '4601c000-0000-4000-8000-000000000005'::uuid;


-- =============================================================================
-- SEÇÃO B — O PREDICADO ÚNICO, com as DUAS exceções que faltavam
-- =============================================================================
-- ⚠ SE VOCÊ VEIO ESCREVER UM SEGUNDO CAMINHO DESTRUTIVO: **CHAME ESTA FUNÇÃO.**
-- Não copie o corpo, não reescreva "só a parte que interessa", não inline o
-- `JOIN`. A asserção (f) do smoke da 43 exige que os TRÊS wrappers CHAMEM esta
-- função e proíbe qualquer um deles de referenciar `config_retencao_etapa`
-- diretamente; a asserção (e) pina o md5 do corpo. Uma segunda cópia é como um
-- dry-run passa a mentir sobre a purga sem que ninguém perceba.
--
-- `CREATE OR REPLACE` e NÃO `DROP` + `CREATE`: a lista de colunas do
-- `RETURNS TABLE` é a mesma do plano 46-02 (seis colunas), então o Postgres
-- aceita a substituição em lugar — e a substituição em lugar preserva o `proacl`.
CREATE OR REPLACE FUNCTION public.candidaturas_alem_da_janela()
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
   -- D-46-01 e D-46-02 sao satisfeitas por AUSENCIA e nao aparecem aqui de
   -- proposito: NENHUMA clausula sobre is_rascunho, NENHUMA clausula sobre
   -- autorizacao_retencao_curriculo. Ver o COMMENT ON FUNCTION.
   WHERE c.deleted_at IS NULL
     AND m.elegivel_purga
     AND NOT EXISTS (
           SELECT 1
             FROM public.decisao_final d
            WHERE d.candidatura_id = c.id
              AND d.revisao_solicitada_em IS NOT NULL
              AND d.revisao_respondida_em IS NULL
         )
     AND NOT EXISTS (
           SELECT 1
             FROM public.retencao_hold h
            WHERE h.candidatura_id = c.id
              AND h.liberado_em IS NULL
         )
     AND NOT EXISTS (
           SELECT 1
             FROM public.vagas v
            WHERE v.id = c.vaga_id
              AND v.status <> ALL (ARRAY['arquivada','inativa']::public.status_vaga[])
         )
     AND a.em + make_interval(months => m.janela_meses) < now();
$candidaturas_alem_da_janela$;

-- ⚠ REEMITIDO POR SEGURANÇA, e **NENHUM `GRANT` DE VOLTA**.
-- `CREATE OR REPLACE` não repõe grants perdidos nem cria novos — diferente do
-- `DROP` + `CREATE` do plano 46-02, que fazia o `pg_default_acl` deste schema
-- reconceder EXECUTE a `anon` como grant DIRETO E NOMEADO. O `REVOKE` fica aqui
-- de qualquer modo porque custa nada e porque um dia alguém troca a forma de
-- substituição sem lembrar da consequência.
--
-- Esta continua sendo a única função da família que devolve LINHAS
-- IDENTIFICÁVEIS (ids de candidatura e de candidato) mais a política aplicada a
-- cada uma. Uma tela capaz de enumerar as pessoas prestes a serem apagadas é
-- superfície de exfiltração de PII construída sem necessidade, então a proibição
-- vive AQUI, no `REVOKE`, e não na camada de apresentação. `FROM PUBLIC` sozinho
-- NÃO basta e não é redundância defensiva: medido na P42-06, o `pg_default_acl`
-- do schema `public` neste projeto concede EXECUTE a `anon` e `authenticated`
-- como grants DIRETOS E NOMEADOS. Nomear os dois é obrigatório.
REVOKE ALL ON FUNCTION public.candidaturas_alem_da_janela()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.candidaturas_alem_da_janela() IS
  'Phase 43 / 43-06 RETEN-04, ESTENDIDA pela Phase 46 (46-02: allowlist + politica relatada; 46-03: '
  'as duas ultimas excecoes de politica): A UNICA DEFINICAO do predicado de retencao. Devolve as '
  'candidaturas cuja DATA-ANCORA somada a janela do proprio estado '
  '(public.config_retencao_etapa) ja passou de now(), MAIS a politica aplicada a cada uma. '
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
  '=== AS QUATRO EXCECOES DE POLITICA, AGORA COMPLETAS (PURGA-07) === '
  'TODAS por INEXISTENCIA DE LINHA CORRESPONDENTE, JAMAIS por negacao de pertencimento a conjunto '
  'de valores (aquela forma, contra um conjunto que contenha NULL, devolve DESCONHECIDO e o registro '
  'ESCAPA — INVENT-05, 20260730000005). Sao elas: '
  '(1) deleted_at IS NULL. '
  '(2) ALLOWLIST de estados (D-46-19 / 46-02): a clausula e m.elegivel_purga — DADO na matriz, '
  'jamais lista no codigo. Sao TRES estados: aprovado, rejeitado, decisao_final. '
  '(3) REVISAO DO ART. 20 EM ABERTO (revisao_solicitada_em NOT NULL e revisao_respondida_em NULL): '
  'apagar a evidencia de um direito EM EXERCICIO e o defeito que o Art. 20 existe para impedir. '
  'Exercitada por execucao pela primeira vez em 2026-08-22 (fixture neg-art20 do plano 46-01). '
  '(4) HOLD PONTUAL (D-46-04 / 46-03): linha em public.retencao_hold com liberado_em NULO. Sem essa '
  'tabela, o unico jeito de proteger uma candidatura especifica seria DESLIGAR A PURGA INTEIRA. '
  '(5) VAGA AINDA ABERTA (D-46-03 / 46-03): processo vivo nao se apaga, mesmo com a data-ancora '
  'estourada. ⚠ ESTA CLAUSULA E INEXISTENCIA DE LINHA **E** ALLOWLIST AO MESMO TEMPO, e a '
  'propriedade e DELIBERADA: o interior da subconsulta e o COMPLEMENTO da allowlist de estados '
  'FECHADOS (arquivada, inativa), entao um valor NOVO em public.status_vaga que ninguem previu cai '
  'fora da allowlist, casa a subconsulta e PROTEGE a candidatura. FAIL-CLOSED POR CONSTRUCAO, nao '
  'por vigilancia. Os quatro valores vivos do enum em 2026-08-22: rascunho, ativa, inativa, '
  'arquivada. E candidaturas.vaga_id e NOT NULL, o que e load-bearing: com nulo permitido, a '
  'candidatura orfa ficaria purgavel em silencio. '
  '=== AS DUAS DECISOES SATISFEITAS POR AUSENCIA — NOMEADAS AQUI PORQUE AUSENCIA SILENCIOSA E '
  'INDISTINGUIVEL DE ESQUECIMENTO === '
  '⚠ D-46-01: NAO HA CLAUSULA SOBRE is_rascunho, e a ausencia e DECISAO. Candidatura em rascunho '
  'NAO ganha janela propria: segue a matriz pelo estado em que esta. Criar uma janela curta propria '
  'sem parecer juridico seria tomar decisao de politica por acidente de implementacao — foi para '
  'evitar isso que a Phase 43 deixou esta excecao explicitamente ABERTA em vez de fecha-la por '
  'reflexo. '
  '⚠ D-46-02 (BD-1 MANTIDO): NAO HA CLAUSULA SOBRE autorizacao_retencao_curriculo, e a ausencia '
  'tambem e DECISAO. Ela segue sendo BASE LEGAL CITADA na superficie do candidato (RETEN-03, '
  '/candidato/privacidade) e NUNCA encurtador de janela. A regra "nao autorizou => retencao = '
  'duracao do processo" permanece decisao de POLITICA PENDENTE DE PARECER JURIDICO, e mante-la '
  'pendente e escolha deliberada desta fase, nao omissao dela. '
  '⚠ LACUNA NOMEADA, e ela MUDA O EFEITO de D-46-01: como rascunho fica em inscricao, que NAO esta '
  'na allowlist, rascunho NUNCA e purgado automaticamente — e o mesmo vale para qualquer '
  'candidatura parada em funil ativo. E retencao indefinida DECLARADA, nao esquecimento. A mesma '
  'lacuna esta escrita no COMMENT de config_retencao_etapa.elegivel_purga. Lacuna escrita e '
  'auditavel; lacuna silenciosa e o proprio modo de falha que PURGA-07 descreve. '
  '⚠ A LISTA DE EXCECOES ESTA AGORA COMPLETA e deixou de ser extensivel por desenho: o texto '
  'anterior (Phase 43) dizia que faltavam duas e endereçava a Phase 46 pelo nome; as duas chegaram '
  'em 20260823000005. Acrescentar uma sexta excecao e decisao de POLITICA e exige o mesmo caminho: '
  'decisao registrada, clausula por inexistencia de linha, fixture negativa ALEM DA JANELA, e '
  're-pin do md5 com conferencia cruzada. '
  'SEM GRANT PARA PAPEL DE CLIENTE: e a unica funcao da familia que devolve linhas IDENTIFICAVEIS. '
  'A proibicao e ESTRUTURAL (vive no REVOKE), nao confiada a apresentacao. '
  'STABLE e sem verbo de escrita: ela LE, nunca apaga.';
