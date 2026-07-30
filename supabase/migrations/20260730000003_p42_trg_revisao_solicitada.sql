-- =============================================================================
-- Phase 42 / Plan 42-07 — REVISAO-01 · D-P42-13 · D-P42-15
-- Disparo do nudge ao RH quando um titular solicita revisão da decisão (Art. 20 LGPD)
-- =============================================================================
--
-- ESTE TRIGGER NÃO É NOVO. É a RE-CRIAÇÃO de `trg_n8n_revisao_decisao`
-- (`20260706110005_sec03_n8n_serverside.sql:163-211`), com exatamente o mesmo guard de
-- transição (`OLD IS NULL AND NEW IS NOT NULL`) e exatamente a mesma cláusula
-- `AFTER UPDATE OF revisao_solicitada_em ON public.decisao_final`, DROPado pela P39 ao
-- aposentar o n8n. A única diferença é o destino: uma Edge Function do próprio projeto
-- em vez de um webhook externo. Não é caminho novo; é o caminho antigo no idioma vivo.
--
-- Hoje `solicitar_revisao_decisao` (`20260625100001:174-231`) grava
-- `revisao_solicitada_em` e o processo termina ali — um timestamp que ninguém lê. Este
-- arquivo fecha a metade que faltava do round-trip.
--
-- ORDEM DE APLICAÇÃO (o controle, não uma preferência)
-- `net.http_post` é AT-MOST-ONCE. Um trigger que dispara contra uma Edge Function
-- inexistente perde a notificação sem erro em lugar nenhum. Uma EF que aceita um evento
-- que ninguém envia é inerte; o contrário não é. Logo: DEPLOY DA EF `notificar-rh`
-- PRIMEIRO, esta migration DEPOIS. O checkpoint do plano 42-07 é o gate dessa ordem.
--
-- ⛔ SEM WRAPPER `BEGIN;/COMMIT;` (CLAUDE.md · SQLSTATE 42601)
-- Corpos `$$` de PL/pgSQL adjacentes a `COMMENT`/`REVOKE`/`GRANT` batem
-- "cannot insert multiple commands into a prepared statement" no transaction pooler; o
-- driver do CLI já envolve cada migration na sua própria transação implícita, e o
-- BEGIN/COMMIT externo é o gatilho do erro. Aplicação por MCP `apply_migration`,
-- seguida de reconcile do ledger `schema_migrations` — padrão P37-04 / P39-04 / P41-05.
-- `supabase db push` permanece proibido neste projeto.
--
-- CONTEÚDO
--   BLOCO A — vocabulário do ledger: `notificacoes_enviadas.evento` passa a aceitar
--             `revisao_solicitada` (5 valores).
--   BLOCO B — `trg_notif_revisao_solicitada()` + trigger em `public.decisao_final`.
--   BLOCO C — `varrer_retry_notificacoes()` SUBSTITUÍDA: exclui os eventos de RH da
--             varredura de retry, fechando a colisão do ledger compartilhado.
-- =============================================================================


-- =============================================================================
-- BLOCO A — Vocabulário do ledger (pré-requisito de D-P42-15)
-- =============================================================================
-- ⚠ DESVIO REGISTRADO EM RELAÇÃO AO PLANO 42-07, e é bloqueante:
--
-- D-P42-15 manda o nudge ao RH entrar no MESMO ledger `notificacoes_enviadas`. O plano
-- descreve a claim-before-send e a `dedupe_key` por destinatário, mas não menciona que a
-- coluna `evento` daquela tabela carrega o CHECK `notificacoes_enviadas_evento_check`,
-- fechado nos 4 eventos do M7 (`confirmacao`, `avanco`, `convite`, `decisao` —
-- `20260721000001:77`). Sem estender esse CHECK, TODA reivindicação da EF `notificar-rh`
-- falharia com `23514`, nenhuma linha entraria no ledger e NENHUM e-mail seria enviado:
-- a entrega inteira do REVISAO-01 seria um no-op silencioso.
--
-- O mecanismo é conhecido no repositório — a própria pesquisa da fase o nomeia ("um sem
-- o outro = 500 em runtime ou linha rejeitada pelo CHECK") — mas o planner atribuiu a
-- extensão do CHECK apenas ao plano 42-08 (o 5º evento de CANDIDATO,
-- `revisao_respondida`) e não percebeu que o evento DESTE plano precisa da mesma coisa.
--
-- Escopo mínimo deliberado: acrescenta-se APENAS `revisao_solicitada`.
-- `revisao_respondida` NÃO é adicionado aqui, mesmo sendo "de graça", porque o CHECK é
-- um dos sítios que fecham aquele vocabulário e registrá-lo sem os sítios de código
-- correspondentes criaria exatamente o drift que o D-P42-14 existe para impedir.
--
-- ⚠ CONSEQUÊNCIA PARA O PLANO 42-08: a asserção (a) do smoke daquele plano espera um
-- CHECK de 5 valores e a (b) espera que um 6º seja recusado. Depois desta migration o
-- CHECK vivo tem 5, e depois da 42-08 terá 6 — aquele smoke tem de ser reescrito para
-- 6 aceitos e um 7º recusado. Registrado no SUMMARY como follow-up.
--
-- Substituição por nome: `notificacoes_enviadas_evento_check` é o nome auto-gerado que a
-- declaração inline de `20260721000001` produz deterministicamente, e o cabeçalho daquele
-- arquivo o declara LOAD-BEARING. Preservá-lo é obrigatório. O `ADD CONSTRAINT` valida a
-- tabela inteira sob ACCESS EXCLUSIVE — sobre uma tabela de poucas linhas é instantâneo,
-- e não pode falhar por dado vivo porque o vocabulário apenas CRESCE.

ALTER TABLE public.notificacoes_enviadas
  DROP CONSTRAINT IF EXISTS notificacoes_enviadas_evento_check;

ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT notificacoes_enviadas_evento_check
  CHECK (evento IN ('confirmacao', 'avanco', 'convite', 'decisao', 'revisao_solicitada'));

-- Auto-verificação: falha ALTO se restou algum OUTRO CHECK sobre `evento` (nome
-- divergente em PROD) — nesse cenário o novo CHECK conviveria com o antigo e a
-- reivindicação continuaria sendo recusada, mas em silêncio, e a migration teria
-- "passado". Um gate que não morde não é um gate.
DO $verifica_check$
DECLARE
  v_qtd int;
  v_defs text;
BEGIN
  SELECT count(*), string_agg(c.conname || ' => ' || pg_get_constraintdef(c.oid), ' | ')
    INTO v_qtd, v_defs
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'notificacoes_enviadas'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%evento%';

  IF v_qtd <> 1 THEN
    RAISE EXCEPTION 'P42-07 BLOCO A: esperava 1 CHECK sobre evento, achei % — %', v_qtd, v_defs;
  END IF;
  IF v_defs NOT LIKE '%revisao_solicitada%' THEN
    RAISE EXCEPTION 'P42-07 BLOCO A: o CHECK vivo de evento nao aceita revisao_solicitada — %', v_defs;
  END IF;
  RAISE NOTICE 'P42-07 BLOCO A OK: %', v_defs;
END
$verifica_check$;

COMMENT ON CONSTRAINT notificacoes_enviadas_evento_check ON public.notificacoes_enviadas IS
  'Phase 42 / 42-07 REVISAO-01: vocabulario de evento do ledger, agora com 5 valores. '
  'Os 4 do M7 (confirmacao/avanco/convite/decisao) sao produzidos pelos triggers de '
  'funil e consumidos pela EF notificar-candidato; revisao_solicitada e produzido por '
  'trg_notif_revisao_solicitada e consumido pela EF notificar-rh. O CHECK e um dos '
  'sitios que FECHAM esse vocabulario: adicionar valor aqui sem os sitios de codigo '
  'correspondentes produz 400 VALIDATION sobre um dispatch at-most-once; adicionar em '
  'codigo sem adicionar aqui produz 23514 no claim. Sempre na mesma entrega (D-P42-14).';


-- =============================================================================
-- BLOCO B — trg_notif_revisao_solicitada · o disparo (D-P42-13)
-- =============================================================================
-- Corpo do dispatch copiado quase verbatim de `trg_notif_transicao`
-- (`20260726000001_p39_rewire_triggers_aposenta_n8n.sql:60-120`): leitura do Vault com
-- graceful-skip, `net.http_post` dentro de `BEGIN … EXCEPTION WHEN OTHERS THEN
-- RAISE WARNING`. Três invariantes herdadas, todas load-bearing:
--
--   1. BEARER = `edge_invoke_key` DO VAULT, nunca a chave de servidor privilegiada.
--      A igualdade entre as duas está QUEBRADA POR ROTAÇÃO (Pitfall 5 da P41), então
--      usar a segunda produziria 401 na EF — e um 401 numa chamada at-most-once não
--      volta para o banco.
--   2. GRACEFUL-SKIP: segredo ausente ⇒ `RETURN NEW`. Um segredo não provisionado nunca
--      pode quebrar o pedido do titular.
--   3. FAIL-OPEN: todo o dispatch dentro de EXCEPTION WHEN OTHERS. O funil nunca quebra
--      por falha de despacho, e a mensagem do WARNING não interpola dado pessoal.
--
-- Corpo do POST IDS-ONLY: duas chaves, e nada mais. Nem identificação do titular, nem
-- endereço, nem documento — a EF resolve o que precisa com privilégio próprio, e o corpo
-- do e-mail ao RH não usa nada disso (decisão de privacidade T-42-24, ver
-- `notificar-rh/helpers.ts`).

CREATE OR REPLACE FUNCTION public.trg_notif_revisao_solicitada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Guard de transição, idêntico ao do ancestral droppado: dispara SÓ quando a revisão
  -- é solicitada pela PRIMEIRA vez (NULL -> NOT NULL). Idempotente com o write-path, que
  -- nunca sobrescreve um pedido existente. Um UPDATE que apenas toque outras colunas de
  -- decisao_final não chega aqui (a cláusula AFTER UPDATE OF já filtra), e um UPDATE que
  -- reescreva o mesmo timestamp não passa deste IF.
  IF NOT (OLD.revisao_solicitada_em IS NULL AND NEW.revisao_solicitada_em IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, pedido do titular intacto
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-rh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'revisao_solicitada',
        'candidatura_id', NEW.candidatura_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_revisao_solicitada: dispatch falhou (%: %) — pedido intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- `REVOKE … FROM PUBLIC` NÃO remove `anon`: medido na P42-06, o `pg_default_acl` do
-- schema `public` neste projeto concede EXECUTE a anon/authenticated/service_role como
-- grants DIRETOS E NOMEADOS em todo CREATE FUNCTION, então o revoke de PUBLIC remove um
-- grant que nunca existiu. O revoke nominal de `anon` é obrigatório — foi essa exata
-- regressão contra um padrão vivo que a 42-06 teve de corrigir por migration extra.
-- `authenticated` fica: o write-path é um RPC SECURITY DEFINER cujo dono é o usuário
-- efetivo quando o trigger dispara, e revogar além do necessário numa função de
-- fire-path é mudança sem requirement por trás.
REVOKE ALL ON FUNCTION public.trg_notif_revisao_solicitada() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_solicitada() FROM anon;

-- `DROP TRIGGER IF EXISTS` AQUI É CORRETO: recria-se um trigger que JÁ EXISTIU nesta
-- mesma tabela com este mesmo nome de conceito (`trg_n8n_revisao_decisao`), e a forma
-- condicional torna a migration re-aplicável.
--
-- ⚠ ASSIMETRIA CONSCIENTE com o trigger de `atualizado_em` do plano 42-06
-- (`20260730000001:503-513`), que usa `CREATE TRIGGER` PURO sem DROP prévio. Lá a tabela
-- é criada duas seções acima e não pode haver trigger nenhum, então a forma pura FALHA
-- ALTO contra um trigger inesperado em vez de substituí-lo em silêncio. Aqui o objeto é
-- conhecido e substituí-lo é o objetivo. As duas convenções coexistem por razões
-- diferentes — criar algo novo versus substituir algo conhecido — e NÃO devem ser
-- uniformizadas. O arquivo da 42-06 documenta a mesma assimetria do lado dele.
DROP TRIGGER IF EXISTS trg_notif_revisao_solicitada ON public.decisao_final;
CREATE TRIGGER trg_notif_revisao_solicitada
  AFTER UPDATE OF revisao_solicitada_em ON public.decisao_final
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notif_revisao_solicitada();

COMMENT ON FUNCTION public.trg_notif_revisao_solicitada() IS
  'Phase 42 / 42-07 REVISAO-01 (D-P42-13): despacha o nudge ao RH quando um titular '
  'solicita revisao da decisao. AFTER UPDATE OF revisao_solicitada_em em decisao_final, '
  'guard de transicao NULL -> NOT NULL. RE-CRIACAO de trg_n8n_revisao_decisao '
  '(20260706110005:163-211), dropado pela P39, agora apontado para a Edge Function '
  'notificar-rh em vez do webhook n8n aposentado. Corpo ids-only (evento + '
  'candidatura_id) via Bearer self-auth do Vault (project_url + edge_invoke_key, NUNCA a '
  'chave de servidor privilegiada — a igualdade esta quebrada por rotacao), '
  'graceful-skip se algum segredo faltar, fail-open num EXCEPTION WHEN OTHERS. '
  'AT-MOST-ONCE: a EF tem de estar deployada ANTES deste trigger existir, senao o nudge '
  'se perde sem erro em lugar nenhum. Nao existe retry automatico deste evento — ver o '
  'COMMENT de varrer_retry_notificacoes; a fila /rh/revisoes e a superficie duravel.';


-- =============================================================================
-- BLOCO C — varrer_retry_notificacoes SUBSTITUÍDA · a colisão do ledger compartilhado
-- =============================================================================
-- ⚠ ESTA FUNÇÃO ESTÁ VIVA E RODA A CADA 15 MINUTOS EM PROD (cron `notif-retry-sweep`,
-- P41 / RECON-03). O corpo abaixo é a transcrição da versão de
-- `20260727000001_p41_recon_retry.sql:145-200` com UMA alteração funcional. O checkpoint
-- do plano 42-07 exige ler `pg_get_functiondef('public.varrer_retry_notificacoes()')` do
-- CATÁLOGO VIVO e diffar contra esta transcrição ANTES de aplicar: a única diferença
-- admissível é a cláusula de exclusão e o comentário adjacente. Qualquer outra divergência
-- significa que a função viva não é a do arquivo, e o apply deve PARAR — é a mesma classe
-- de erro do achado A1 da pesquisa (ler um objeto vivo a partir de um único arquivo de
-- migration em vez do estado acumulado).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- A COLISÃO, encontrada no planejamento e fechada aqui (não estava na pesquisa)
-- ─────────────────────────────────────────────────────────────────────────────
-- D-P42-15 manda o nudge ao RH entrar no MESMO ledger. Mas esta varredura seleciona
-- TODA linha não-terminal e a re-despacha por URL FIXA para `/functions/v1/
-- notificar-candidato`. Uma linha de evento de RH que falhasse ao enviar produziria,
-- em quatro etapas:
--
--   1. URL FIXA — a linha é re-postada contra a EF ERRADA (`notificar-candidato`),
--      porque a varredura não olha o evento para escolher o destino.
--   2. `400 VALIDATION` — aquela EF valida o payload contra o vocabulário dela e recusa
--      o evento de RH ANTES de qualquer branch de retry.
--   3. `tentativas` NUNCA INCREMENTA — quem incrementa é a EF, e ela nem chegou ao ponto
--      de incrementar. O predicado `tentativas < 5` continua verdadeiro para sempre.
--   4. LAÇO INFINITO CONSUMINDO O `LIMIT 20` — a linha volta a ser selecionada a cada 15
--      minutos, para sempre, gastando o orçamento por varredura que existe para os
--      retries LEGÍTIMOS de candidato (T-42-23, cinto anti-rajada do free-tier Resend).
--
-- RESOLUÇÃO ADOTADA: a varredura passa a EXCLUIR explicitamente os eventos de RH.
-- O retry automático do e-mail ao RH fica FORA DO v1, e isso é decisão registrada, não
-- omissão: a fila `/rh/revisoes` é a SUPERFÍCIE DURÁVEL — um nudge perdido é recuperável
-- abrindo a fila, ao passo que um e-mail de candidato perdido não é recuperável por
-- caminho nenhum, porque o candidato não tem fila. A assimetria é justificada. Fica um
-- todo rastreado para reavaliar em M8+.
--
-- REJEITADA: gravar `tentativas = 5` na primeira falha do RH para que o predicado do cap
-- a exclua. Funciona, não toca esta função, e é exatamente o tipo de truque opaco que
-- produz um CR-01: um leitor futuro vê `tentativas = 5` e conclui que houve cinco
-- tentativas. Pela mesma razão a EF `notificar-rh` grava `proxima_tentativa_em` NULO na
-- falha — agendar uma próxima tentativa que nada consumirá é escrever afirmação falsa.
--
-- NÃO-REGRESSÃO: `supabase/tests/p41_recon_retry_smoke.sql:187-220` afere este corpo por
-- `pg_get_functiondef` e exige 7 substrings (`status IN`, `pendente`, `falhou`,
-- `tentativas < 5`, `edge_invoke_key`, `/functions/v1/notificar-candidato`, `retry_id`,
-- `split_part`) e a AUSÊNCIA da chave de servidor privilegiada. Todas preservadas.

CREATE OR REPLACE FUNCTION public.varrer_retry_notificacoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
  r             record;
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN;  -- segredos ausentes — varredura adiada, ledger intacto (graceful-skip)
  END IF;

  -- Seleção coberta por idx_notif_retry (btree proxima_tentativa_em WHERE status
  -- IN ('pendente','falhou')). tentativas < 5 = cap; NULLS FIRST prioriza as que
  -- nunca foram agendadas; LIMIT 20 é o cinto anti-rajada (free-tier Resend,
  -- T-41-10/T-41-13).
  --
  -- P42-07 · a cláusula de exclusão abaixo: esta varredura despacha por URL FIXA para
  -- notificar-candidato, então uma linha de evento de RH seria re-postada contra a EF
  -- errada, recusada com 400 VALIDATION antes do branch de retry, jamais teria
  -- tentativas incrementado e voltaria a ser selecionada a cada 15 minutos para sempre,
  -- consumindo o LIMIT 20 dos retries legítimos de candidato (T-42-23). O `\_` escapa o
  -- underscore para que ele seja literal e não um curinga de um caractere. O prefixo (em
  -- vez de igualdade) cobre variantes futuras do mesmo evento de RH. Nota: o 5º evento
  -- de CANDIDATO do plano 42-08 (revisao_respondida) NÃO casa este prefixo e continua
  -- elegível a retry, o que é o correto — o candidato não tem fila.
  FOR r IN
    SELECT id, evento, candidatura_id, dedupe_key
      FROM public.notificacoes_enviadas
     WHERE status IN ('pendente','falhou')
       AND tentativas < 5
       AND evento NOT LIKE 'revisao\_solicitada%'
       AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= pg_catalog.now())
     ORDER BY proxima_tentativa_em NULLS FIRST
     LIMIT 20
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/notificar-candidato',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_invoke_key
        ),
        body := jsonb_build_object(
          'retry_id', r.id,               -- sinaliza o branch de retry na EF (P41-01)
          'evento', r.evento,
          'candidatura_id', r.candidatura_id,
          -- convite: dedupe_key = '{agendamento_id}:convite' (helpers.ts:38),
          -- então o agendamento_id é o 1º campo. Demais eventos: NULL.
          'agendamento_id',
            CASE WHEN r.evento = 'convite'
                 THEN split_part(r.dedupe_key, ':', 1) END
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'varrer_retry: dispatch falhou id=% (%: %)', r.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- `CREATE OR REPLACE` PRESERVA a ACL existente (só um CREATE novo re-aplica o
-- pg_default_acl), então os grants diretos e nomeados que a P42-06 mediu continuam de pé
-- nesta função. O `REVOKE … FROM PUBLIC` da P41 é reafirmado, e os revokes nominais de
-- `anon` e `authenticated` são ACRESCENTADOS: esta é uma função SECURITY DEFINER
-- diretamente invocável que dispara e-mail, e um chamador anônimo com a chave pública do
-- projeto poderia acionar uma varredura de envio. Mesma classe de defeito que a P42-06
-- corrigiu nos 3 RPCs do Art. 20 — aqui apanhada na função que este plano já reescreve.
-- Ninguém a chama fora do cron: o job `notif-retry-sweep` roda como o papel que o
-- agendou (superusuário), que não passa por checagem de privilégio.
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM anon;
REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM authenticated;

-- COMMENT da P41 preservado INTEGRALMENTE (nenhuma frase apagada), com a cláusula da
-- exclusão acrescentada no fim.
COMMENT ON FUNCTION public.varrer_retry_notificacoes() IS
  'M7/P41 RECON-03: varredura de retry acionada pelo cron notif-retry-sweep a '
  'cada 15 min. Re-invoca a EF notificar-candidato (branch retry via retry_id no '
  'body) para cada notificacao nao-terminal (status pendente/falhou) dentro do '
  'cap (tentativas < 5) e com o backoff vencido (proxima_tentativa_em). Bearer = '
  'edge_invoke_key do Vault (== NOTIFICAR_SECRET da EF), NUNCA a chave de '
  'servidor privilegiada — a invariante esta quebrada por rotacao (Pitfall 5). A varredura '
  'NAO incrementa tentativas: o net.http_post e at-most-once e ela nao sabe o '
  'resultado; quem incrementa e a EF, so ao tentar. LIMIT 20 por sweep = cinto '
  'anti-rajada do free-tier Resend. SECURITY DEFINER + search_path vazio; cada '
  'dispatch isolado em EXCEPTION WHEN OTHERS (uma falha nao aborta as demais). '
  'Phase 42 / 42-07 (T-42-23): EXCLUI os eventos de RH (prefixo revisao_solicitada) '
  'do SELECT. O despacho e por URL FIXA para notificar-candidato, entao uma linha de '
  'RH seria re-postada contra a EF errada, recusada com 400 VALIDATION antes do branch '
  'de retry, jamais teria tentativas incrementado e voltaria a ser selecionada a cada 15 '
  'minutos para sempre, consumindo o LIMIT 20 dos retries legitimos de candidato. O '
  'retry automatico do e-mail ao RH fica fora do v1 por decisao registrada: a fila '
  '/rh/revisoes e a superficie duravel e um nudge perdido e recuperavel por ela, ao '
  'passo que um e-mail de candidato perdido nao e recuperavel por caminho nenhum. '
  'Reavaliar em M8+.';
