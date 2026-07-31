-- =============================================================================
-- Phase 42 / Plan 42-08 — REVISAO-04 · D-P42-14
-- O 5º evento do pipeline de comunicação: avisar o CANDIDATO de que sua solicitação
-- de revisão da decisão (Art. 20 LGPD) foi RESPONDIDA
-- =============================================================================
--
-- Hoje `responder_revisao_decisao` (`20260730000002:145-165`) grava o veredito, a
-- justificativa, a autoria e `revisao_respondida_em` — e o processo termina ali. O titular
-- que pediu a revisão não é avisado de que ela foi respondida; ele descobre se e quando
-- voltar ao painel por conta própria. Este arquivo fecha essa metade.
--
-- -----------------------------------------------------------------------------
-- ORDEM DE ENTREGA OBRIGATÓRIA — É O CONTROLE, NÃO UMA PREFERÊNCIA
-- -----------------------------------------------------------------------------
--   1º  EDGE FUNCTION `notificar-candidato` deployada com o 5º evento no vocabulário
--   2º  BLOCO A desta migration (o CHECK do ledger)
--   3º  BLOCO B desta migration (a função + o trigger)
--
-- O motivo é mecânico. `net.http_post` é AT-MOST-ONCE: a resposta da Edge Function não
-- volta para o banco, não vira exceção e não vira linha em lugar nenhum. Logo:
--
--   · trigger ANTES da EF  ⇒ a EF responde `400 VALIDATION` a um evento que ainda não
--     conhece, e a notificação some SEM ERRO EM LUGAR NENHUM. É a falha mais cara de
--     detectar do sistema, porque não há artefato que a registre.
--   · CHECK ANTES do código ⇒ o mesmo `400 VALIDATION` sobre um dispatch at-most-once.
--   · código ANTES do CHECK ⇒ a EF aceita, tenta reivindicar o ledger e leva `23514`;
--     nenhuma linha entra, nenhum e-mail sai. Ao menos há log da EF.
--   · EF ANTES de tudo ⇒ uma função que aceita um evento que ninguém envia é INERTE.
--
-- A assimetria acima é a razão da ordem: só o último cenário é benigno. Os BLOCOS A e B
-- vivem no mesmo arquivo (um apply só), então o gate real é o passo 3 do checkpoint da
-- Task 3 — provar que a EF deployada aceita `revisao_respondida` ANTES de o trigger
-- existir. Precedente direto: o checkpoint da 42-07 executou exatamente esta ordem.
--
-- -----------------------------------------------------------------------------
-- ⛔ SEM WRAPPER `BEGIN;/COMMIT;` (CLAUDE.md · SQLSTATE 42601)
-- -----------------------------------------------------------------------------
-- Corpos `$$` de PL/pgSQL adjacentes a `COMMENT`/`REVOKE`/`GRANT` batem "cannot insert
-- multiple commands into a prepared statement" no transaction pooler; o driver do CLI já
-- envolve cada migration na sua própria transação implícita, e o BEGIN/COMMIT externo é o
-- gatilho do erro. Aplicação por MCP `apply_migration`, seguida de reconcile do ledger
-- `supabase_migrations.schema_migrations` — padrão P37-04 / P39-04 / P41-05 / P42-07.
-- `supabase db push` permanece PROIBIDO neste projeto.
--
-- ⚠ DUAS PROPRIEDADES DO `apply_migration` MEDIDAS NO CHECKPOINT DA 42-07 (2026-07-31),
-- e que valem para o apply DESTE arquivo:
--   1. `apply_migration` CARIMBA A PRÓPRIA `version` no ledger (um timestamp do momento
--      do apply, não o do nome do arquivo). A linha precisa ser REPARADA à mão para
--      `20260730000004`, senão a ordenação do ledger diverge da ordenação dos arquivos.
--   2. `supabase_migrations.schema_migrations` tem uma coluna `statements text[]` com o
--      SQL LITERALMENTE aplicado. Isso torna a fidelidade PROVÁVEL em vez de presumida:
--      `md5(statements[1])` da linha deve bater com o md5 deste arquivo. Foi assim que a
--      42-07 provou byte-a-byte que a retransmissão não perdeu comentário nenhum — a
--      classe de drift documentada em
--      `.planning/todos/pending/processo-origem-do-drift-desconhecida.md`.
--
-- -----------------------------------------------------------------------------
-- ⚠ LEITURA OBRIGATÓRIA ANTES DO APPLY (mitigação da suposição A1 da pesquisa)
-- -----------------------------------------------------------------------------
-- `SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname = 'notificacoes_enviadas_evento_check';`
--
-- Transcrever o resultado como comentário AQUI, antes do apply. Se o vivo carregar
-- QUALQUER cláusula além da lista de eventos, PARAR: o `ADD CONSTRAINT` abaixo tem de
-- preservá-la, senão o DROP/ADD a perde em silêncio. O arquivo `20260721000001` é
-- reconstrução por engenharia reversa e pode não bater byte a byte com o objeto vivo.
--
-- ESTADO ESPERADO (após o apply de `20260730000003` pelo checkpoint da 42-07):
--   CHECK ((evento = ANY (ARRAY['confirmacao'::text, 'avanco'::text, 'convite'::text,
--                              'decisao'::text, 'revisao_solicitada'::text])))
--
-- >>> TRANSCRIÇÃO DO VIVO (preencher no checkpoint, ANTES do apply):
-- >>> antes:
-- >>> depois:
--
-- CONTEÚDO
--   BLOCO A — vocabulário do ledger: `notificacoes_enviadas.evento` passa a aceitar
--             `revisao_respondida` (6 valores).
--   BLOCO B — `trg_notif_revisao_respondida()` + trigger em `public.decisao_final`.
-- =============================================================================


-- =============================================================================
-- BLOCO A — Vocabulário do ledger (D-P42-14)
-- =============================================================================
-- O CHECK e o tipo `EventoLedger` de `notificar-candidato/helpers.ts` são A MESMA VERDADE
-- ESCRITA DUAS VEZES, e têm de andar na MESMA entrega: o valor no código sem o CHECK
-- produz `23514` no claim; o CHECK sem o valor no código produz `400 VALIDATION` sobre um
-- dispatch at-most-once. É o D-P42-14 inteiro, e é por isso que este bloco não foi
-- adiantado "de graça" pela 42-07, que teria podido.
--
-- ⚠ O VOCABULÁRIO SÓ CRESCE — 4 (M7) → 5 (42-07) → 6 (aqui). A lista abaixo PRESERVA
-- `revisao_solicitada`, entregue pela 42-07 e VIVO em PROD (a EF `notificar-rh` já gravou
-- linhas reais com esse evento). Um `DROP`/`ADD` que o omitisse quebraria o REVISAO-01 já
-- provado ao vivo. Hoje ele falharia ALTO, porque existem linhas com esse valor e o `ADD
-- CONSTRAINT` valida a tabela inteira — mas contar com isso seria contar com sorte, e a
-- asserção (a) de `supabase/tests/p42_notif_revisao_smoke.sql` existe justamente para não
-- depender dela.
--
-- ⚠ O NOME DA CONSTRAINT É LOAD-BEARING. `notificacoes_enviadas_evento_check` é o nome
-- auto-gerado que a declaração inline de `20260721000001` produz deterministicamente, e o
-- cabeçalho daquele arquivo o declara load-bearing. Preservá-lo é obrigatório.
--
-- Os 6 valores e quem os produz/consome:
--   confirmacao · avanco · convite · decisao   → triggers de funil (P39) → EF notificar-candidato
--   revisao_solicitada                          → trg_notif_revisao_solicitada (42-07) → EF notificar-rh
--   revisao_respondida                          → trg_notif_revisao_respondida (ESTE arquivo) → EF notificar-candidato

ALTER TABLE public.notificacoes_enviadas
  DROP CONSTRAINT IF EXISTS notificacoes_enviadas_evento_check;

ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT notificacoes_enviadas_evento_check
  CHECK (evento IN ('confirmacao', 'avanco', 'convite', 'decisao', 'revisao_solicitada', 'revisao_respondida'));

-- Auto-verificação: falha ALTO se restou algum OUTRO CHECK sobre `evento` (nome divergente
-- em PROD) — nesse cenário o novo conviveria com o antigo, a reivindicação continuaria
-- recusada, e a migration teria "passado". Um gate que não morde não é um gate.
--
-- A segunda checagem é a rede do REVISAO-01: se `revisao_solicitada` sumir da definição
-- viva, o apply ABORTA aqui em vez de deixar o evento de RH cair em 23514 na próxima
-- solicitação real de revisão.
DO $verifica_check$
DECLARE
  v_qtd  int;
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
    RAISE EXCEPTION 'P42-08 BLOCO A: esperava 1 CHECK sobre evento, achei % — %', v_qtd, v_defs;
  END IF;
  IF v_defs NOT LIKE '%revisao_respondida%' THEN
    RAISE EXCEPTION 'P42-08 BLOCO A: o CHECK vivo de evento nao aceita revisao_respondida — %', v_defs;
  END IF;
  IF v_defs NOT LIKE '%revisao_solicitada%' THEN
    RAISE EXCEPTION 'P42-08 BLOCO A: o CHECK vivo PERDEU revisao_solicitada — o REVISAO-01 da 42-07 acabou de ser quebrado por esta migration: %', v_defs;
  END IF;
  RAISE NOTICE 'P42-08 BLOCO A OK: %', v_defs;
END
$verifica_check$;

COMMENT ON CONSTRAINT notificacoes_enviadas_evento_check ON public.notificacoes_enviadas IS
  'Phase 42 / 42-08 REVISAO-04: vocabulario de evento do ledger, agora com 6 valores. '
  'Os 4 do M7 (confirmacao/avanco/convite/decisao) sao produzidos pelos triggers de funil '
  'e consumidos pela EF notificar-candidato; revisao_solicitada e produzido por '
  'trg_notif_revisao_solicitada e consumido pela EF notificar-rh (42-07); '
  'revisao_respondida e produzido por trg_notif_revisao_respondida e consumido pela EF '
  'notificar-candidato. O CHECK e um dos sitios que FECHAM esse vocabulario: adicionar '
  'valor aqui sem os sitios de codigo correspondentes produz 400 VALIDATION sobre um '
  'dispatch at-most-once; adicionar em codigo sem adicionar aqui produz 23514 no claim. '
  'Sempre na mesma entrega (D-P42-14). O vocabulario apenas CRESCE: remover um valor '
  'quebra o evento correspondente em silencio.';


-- =============================================================================
-- BLOCO B — trg_notif_revisao_respondida · o disparo ao candidato (D-P42-14)
-- =============================================================================
-- Mesma forma do trigger irmao da 42-07 (`20260730000003:142-215`), com DOIS pontos
-- diferentes: a coluna do guard (`revisao_respondida_em`) e o destino (a EF do CANDIDATO,
-- nao a do RH). Invariantes herdadas, todas load-bearing:
--
--   1. BEARER = `edge_invoke_key` DO VAULT, nunca a chave de servidor privilegiada. A
--      igualdade entre as duas esta QUEBRADA POR ROTACAO (Pitfall 5 da P41), entao usar a
--      segunda produziria 401 na EF — e um 401 numa chamada at-most-once nao volta para o
--      banco.
--   2. GRACEFUL-SKIP: segredo ausente ⇒ `RETURN NEW`. Um segredo nao provisionado nunca
--      pode quebrar a resposta do RH ao titular.
--   3. FAIL-OPEN: todo o dispatch dentro de EXCEPTION WHEN OTHERS. O write-path do Art. 20
--      nunca quebra por falha de despacho, e a mensagem do WARNING nao interpola dado
--      pessoal.
--
-- Corpo do POST IDS-ONLY: duas chaves, e nada mais. O VEREDITO NAO VIAJA NO PAYLOAD — a EF
-- o le de `decisao_final.revisao_veredito` com privilegio proprio. Enviar o veredito aqui
-- criaria um SEGUNDO registro da mesma verdade (payload vs coluna) que poderia divergir, e
-- e exatamente essa classe de duplicacao que o D-P42-14 existe para impedir.
--
-- ⚠ ESTE TRIGGER E O UNICO DESPACHANTE DESTE EVENTO. O RPC `responder_revisao_decisao`
-- (plano 42-06) NUNCA chama `net.http_post`, e nao deve passar a chamar: dois despachantes
-- produziriam e-mail duplo ou — pior — colisao na chave de deduplicacao, em que o segundo
-- cai em `ON CONFLICT DO NOTHING` e desaparece sem erro. A assercao negativa ao vivo (uma
-- resposta ⇒ exatamente UMA requisicao em `net._http_response`) e o passo 7 do checkpoint.
--
-- Idempotencia em duas camadas, uma reforcando a outra: o guard de transicao abaixo
-- (`NULL -> NOT NULL`) e o guard 4 do proprio RPC, que recusa uma segunda resposta com
-- 22023. Por isso `montarDedupeKey` NAO ganhou ramo novo em helpers.ts: ha no maximo uma
-- revisao por candidatura (`decisao_final.candidatura_id` e UNIQUE), logo no maximo um
-- e-mail legitimo, logo a chave `{candidatura_id}:revisao_respondida` nunca bloqueia nada.

CREATE OR REPLACE FUNCTION public.trg_notif_revisao_respondida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Guard de transição: dispara SÓ quando a revisão é respondida pela PRIMEIRA vez
  -- (NULL -> NOT NULL). Um UPDATE que apenas toque outras colunas de decisao_final não
  -- chega aqui (a cláusula AFTER UPDATE OF já filtra), e um UPDATE que reescreva o mesmo
  -- timestamp não passa deste IF — provado ao vivo no trigger irmão da 42-07, onde um 2º
  -- UPDATE com o mesmo valor não produziu segunda linha de ledger.
  IF NOT (OLD.revisao_respondida_em IS NULL AND NEW.revisao_respondida_em IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, resposta do RH intacta
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'revisao_respondida',
        'candidatura_id', NEW.candidatura_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_revisao_respondida: dispatch falhou (%: %) — resposta intacta', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- `REVOKE … FROM PUBLIC` NÃO remove `anon`: medido na P42-06, o `pg_default_acl` do schema
-- `public` neste projeto concede EXECUTE a anon/authenticated como grants DIRETOS E
-- NOMEADOS em todo CREATE FUNCTION, então o revoke de PUBLIC remove um grant que nunca
-- existiu. O revoke nominal de `anon` é obrigatório. `authenticated` fica, pela mesma razão
-- registrada no trigger irmão: o write-path é um RPC SECURITY DEFINER cujo dono é o usuário
-- efetivo quando o trigger dispara, e revogar além do necessário numa função de fire-path é
-- mudança sem requirement por trás.
REVOKE ALL ON FUNCTION public.trg_notif_revisao_respondida() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_respondida() FROM anon;

-- `DROP TRIGGER IF EXISTS` torna a migration re-aplicável e substitui um objeto de nome
-- conhecido. ⚠ ASSIMETRIA CONSCIENTE com o trigger de `atualizado_em` da 42-06
-- (`20260730000001:503-513`), que usa `CREATE TRIGGER` PURO: lá a tabela nasce na própria
-- migration e não pode haver trigger nenhum, então a forma pura FALHA ALTO contra um
-- trigger inesperado em vez de substituí-lo em silêncio. As duas convenções coexistem por
-- razões diferentes — criar algo novo versus substituir algo conhecido — e NÃO devem ser
-- uniformizadas.
--
-- ⚠ O nome dropado é EXATAMENTE `trg_notif_revisao_respondida`. O vizinho
-- `trg_notif_revisao_solicitada` (42-07) e o `trg_decisao_final_snapshot` vivem na MESMA
-- tabela e não podem ser tocados; a asserção (d) do smoke afere isso depois do apply.
DROP TRIGGER IF EXISTS trg_notif_revisao_respondida ON public.decisao_final;
CREATE TRIGGER trg_notif_revisao_respondida
  AFTER UPDATE OF revisao_respondida_em ON public.decisao_final
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notif_revisao_respondida();

COMMENT ON FUNCTION public.trg_notif_revisao_respondida() IS
  'Phase 42 / 42-08 REVISAO-04 (D-P42-14): despacha o aviso ao CANDIDATO de que sua '
  'solicitacao de revisao da decisao (Art. 20) foi respondida. AFTER UPDATE OF '
  'revisao_respondida_em em decisao_final, guard de transicao NULL -> NOT NULL. Corpo '
  'ids-only (evento + candidatura_id) via Bearer self-auth do Vault (project_url + '
  'edge_invoke_key, NUNCA a chave de servidor privilegiada — a igualdade esta quebrada por '
  'rotacao), graceful-skip se algum segredo faltar, fail-open num EXCEPTION WHEN OTHERS. '
  'O VEREDITO NAO viaja no payload: a EF o le de decisao_final.revisao_veredito com '
  'privilegio proprio, para nao criar um segundo registro da mesma verdade. '
  'AT-MOST-ONCE: a EF notificar-candidato tem de aceitar o evento revisao_respondida '
  'ANTES deste trigger existir, senao a notificacao se perde sem erro em lugar nenhum. '
  'UNICO DESPACHANTE deste evento — responder_revisao_decisao nunca chama net.http_post; '
  'dois despachantes produziriam e-mail duplo ou colisao de dedupe_key. Diferente do '
  'evento de RH, ESTE evento CONTINUA elegivel a varrer_retry_notificacoes: o candidato '
  'nao tem fila onde recuperar um aviso perdido.';
