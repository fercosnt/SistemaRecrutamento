-- =============================================================================
-- 20260813000001 — o IP do log de acesso passa a vir do SERVIDOR, e a coluna
--                  aceita "não sei" em vez de exigir um valor inventado
-- =============================================================================
-- ⚠ NÃO APLICADA POR AGENTE. Esta migration é escrita e commitada; o apply é
--   checkpoint do operador, atrás do portão de fase destrutiva do M8 (code
--   review bloqueante ANTES do apply). Ver §ORDEM OBRIGATÓRIA no fim.
--
-- ⚠ Sem wrapper `BEGIN; ... COMMIT;` — o driver do Supabase CLI já envolve cada
--   migration na sua própria transação, e o wrapper externo é o gatilho do
--   `42601 cannot insert multiple commands into a prepared statement` com corpos
--   `$$` adjacentes a `COMMENT`/`GRANT` (CLAUDE.md §Migrations).
--
-- -----------------------------------------------------------------------------
-- POR QUE ESTA MIGRATION EXISTE — DOIS DEFEITOS, UMA CAUSA
-- -----------------------------------------------------------------------------
-- O cliente descobria o próprio IP pedindo a `https://api.ipify.org` e mandava o
-- resultado no INSERT (`src/services/logAccessService.ts`). Disso saíam dois
-- problemas distintos, e os dois têm a MESMA raiz — `ip_address` é `NOT NULL`,
-- então o cliente PRECISAVA produzir algum valor:
--
--   1. TRANSFERÊNCIA DESNECESSÁRIA. Todo registro de acesso mandava o endereço
--      de quem usa o sistema para um terceiro. `api.ipify.org` estava registrado
--      como `pendente-de-decisao` em `src/__tests__/destinosDeRedeComFicha.test.ts`.
--      Decisão do operador em 2026-08-13: **eliminar a transferência em vez de
--      declará-la**. O servidor já vê o IP; pedir a um terceiro o que se tem em
--      casa é transferir dado à toa.
--
--   2. DADO FALSO NUM LOG DE SEGURANÇA. Quando o `fetch` falhava, o `catch`
--      gravava `127.0.0.1` — um IP que não é o de ninguém — num registro de
--      auditoria. Um log que inventa o campo que ele existe para provar é pior
--      que um log sem o campo. Hoje os 23 registros vivos têm IP real (o
--      fallback nunca chegou a gravar), então isto fecha a porta ANTES de o
--      defeito produzir dado ruim, não depois.
--
-- ⚠ E UM TERCEIRO, QUE JÁ ESTAVA MEDIDO E ESPERANDO: o `docs/compliance/pii-inventory.yaml`
--   classifica `logs_acesso.ip_address` como `apagar` e anota, textualmente,
--   «NOT NULL — apagar exige tornar nullable ou truncar». Ou seja: a constraint
--   **já bloqueava o ERASE-09**. O motor de exclusão não conseguiria apagar esse
--   IP sem esta mudança. Tornar a coluna nullable não é escopo novo — é dívida
--   que o inventário já tinha nomeado, e ela se paga aqui de carona.
--
-- -----------------------------------------------------------------------------
-- POR QUE `DROP NOT NULL` E NÃO UM FALLBACK NO SERVIDOR
-- -----------------------------------------------------------------------------
-- A tentação é o trigger cair em `inet_client_addr()` quando o cabeçalho falta.
-- Isso REPETE o defeito do `127.0.0.1` de forma mais sutil: `inet_client_addr()`
-- através do PostgREST devolve o endereço do POOLER, não o de quem acessou. Seria um
-- IP real e verdadeiro sobre a coisa errada — mais difícil de detectar que o
-- localhost, e igualmente mentiroso sobre a pergunta que o log responde.
-- Quando o IP não é conhecível, a resposta honesta é NULL.
-- =============================================================================

-- (1) A coluna passa a aceitar "não sei".
ALTER TABLE public.logs_acesso ALTER COLUMN ip_address DROP NOT NULL;

-- (2) O preenchimento no servidor, a partir do cabeçalho que o proxy do Supabase
--     escreve. `security invoker` de propósito: não há nada a elevar — a função
--     lê um GUC da própria requisição e escreve numa coluna da linha que está
--     entrando. `SECURITY DEFINER` aqui só ampliaria superfície sem ganho.
CREATE OR REPLACE FUNCTION public.preencher_ip_logs_acesso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $preencher_ip_logs_acesso$
DECLARE
  v_headers text;
  v_xff     text;
  v_primeiro text;
BEGIN
  -- Um IP explicitamente enviado vence: o trigger PREENCHE o que falta, nunca
  -- sobrescreve o que veio. Isso mantém utilizável qualquer inserção de servidor
  -- que já saiba o endereço (e mantém os testes de fixture escrevendo o que querem).
  IF NEW.ip_address IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_headers := nullif(current_setting('request.headers', true), '');
  IF v_headers IS NULL THEN
    RETURN NEW;                      -- fora de uma requisição PostgREST: NULL honesto
  END IF;

  BEGIN
    v_xff := v_headers::json ->> 'x-forwarded-for';
  EXCEPTION WHEN others THEN
    RETURN NEW;                      -- cabeçalho ilegível: NULL honesto, nunca palpite
  END;

  IF v_xff IS NULL OR btrim(v_xff) = '' THEN
    RETURN NEW;
  END IF;

  -- `x-forwarded-for` é uma LISTA: "cliente, proxy1, proxy2". O primeiro elemento
  -- é a origem. Pegar o último daria o proxy — o mesmo erro de medir a coisa errada.
  v_primeiro := btrim(split_part(v_xff, ',', 1));

  BEGIN
    NEW.ip_address := v_primeiro::inet;
  EXCEPTION WHEN others THEN
    NEW.ip_address := NULL;          -- valor não-parseável: NULL, jamais inventado
  END;

  RETURN NEW;
END;
$preencher_ip_logs_acesso$;

DROP TRIGGER IF EXISTS trg_preencher_ip_logs_acesso ON public.logs_acesso;
CREATE TRIGGER trg_preencher_ip_logs_acesso
  BEFORE INSERT ON public.logs_acesso
  FOR EACH ROW
  EXECUTE FUNCTION public.preencher_ip_logs_acesso();

COMMENT ON FUNCTION public.preencher_ip_logs_acesso() IS
  'Preenche logs_acesso.ip_address a partir do primeiro elemento de x-forwarded-for, '
  'quando o INSERT nao trouxe o valor. Existe para que o NAVEGADOR nao precise pedir o '
  'proprio IP a um terceiro (api.ipify.org) — transferencia eliminada em 2026-08-13 por '
  'decisao do operador. NUNCA adivinha: sem cabecalho legivel o valor fica NULL, porque '
  'inet_client_addr() devolveria o IP do POOLER e seria uma resposta verdadeira sobre a '
  'pergunta errada. A coluna deixou de ser NOT NULL na mesma migration, o que tambem '
  'desbloqueia o ERASE-09 (pii-inventory.yaml ja anotava a constraint como obstaculo).';

-- -----------------------------------------------------------------------------
-- AUTO-VERIFICAÇÃO — executa no apply e ABORTA se qualquer premissa não valer.
-- Toda asserção mede o CATÁLOGO VIVO ou EXERCITA o caminho; nenhuma lê o arquivo.
-- -----------------------------------------------------------------------------
DO $verifica_ip_no_servidor$
DECLARE
  v_notnull   boolean;
  v_tgexiste  boolean;
  v_tgtiming  text;
  v_cfg       text[];
  v_id        uuid;
  v_ip        inet;
BEGIN
  -- (a) a coluna aceita NULL
  SELECT a.attnotnull INTO v_notnull
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'logs_acesso' AND a.attname = 'ip_address';
  IF v_notnull IS NULL THEN
    RAISE EXCEPTION 'P47-IP FAIL (a): coluna logs_acesso.ip_address nao encontrada no catalogo';
  END IF;
  IF v_notnull THEN
    RAISE EXCEPTION 'P47-IP FAIL (a): logs_acesso.ip_address continua NOT NULL — o DROP NOT NULL nao vigorou, e o cliente continuaria OBRIGADO a inventar um valor (era assim que o 127.0.0.1 entrava)';
  END IF;

  -- (b) o trigger existe e e BEFORE INSERT (um AFTER nao consegue escrever NEW)
  SELECT true, CASE WHEN (t.tgtype & 2) <> 0 THEN 'BEFORE' ELSE 'AFTER' END
    INTO v_tgexiste, v_tgtiming
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'logs_acesso'
     AND t.tgname = 'trg_preencher_ip_logs_acesso' AND NOT t.tgisinternal;
  IF v_tgexiste IS NOT TRUE THEN
    RAISE EXCEPTION 'P47-IP FAIL (b): trigger trg_preencher_ip_logs_acesso nao existe em public.logs_acesso';
  END IF;
  IF v_tgtiming <> 'BEFORE' THEN
    RAISE EXCEPTION 'P47-IP FAIL (b): o trigger e % e nao BEFORE — um trigger AFTER nao pode alterar NEW, entao o preenchimento seria silenciosamente inutil e a coluna ficaria NULA em toda insercao do cliente', v_tgtiming;
  END IF;

  -- (c) search_path estrito. ⚠ O catalogo grava `search_path=""` (aspas duplas,
  --     string vazia) e NAO `search_path=` — e o portao nº 1 da lista de sete que
  --     reprovaram trabalho correto na Phase 45. Comparar pela forma errada aqui
  --     reprovaria uma funcao corretamente configurada.
  SELECT p.proconfig INTO v_cfg
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'preencher_ip_logs_acesso';
  IF v_cfg IS NULL OR NOT ('search_path=""' = ANY (v_cfg)) THEN
    RAISE EXCEPTION 'P47-IP FAIL (c): preencher_ip_logs_acesso sem search_path="" no catalogo (proconfig = %)', coalesce(v_cfg::text, 'NULO');
  END IF;

  -- (d) CAMINHO EXERCITADO, nao so estrutura. A licao do 42804 da Phase 43: um
  --     smoke que so olha a forma conta como verde sem nunca ter rodado o corpo.
  --     Aqui a insercao ACONTECE, em subtransacao revertida.
  BEGIN
    -- (d1) sem cabecalho de requisicao (este DO nao e PostgREST) e sem IP no
    --      INSERT: o resultado honesto e NULL, e antes desta migration seria 23502.
    INSERT INTO public.logs_acesso (evento) VALUES ('p47_ip_probe')
      RETURNING id, ip_address INTO v_id, v_ip;
    IF v_ip IS NOT NULL THEN
      RAISE EXCEPTION 'P47-IP FAIL (d1): sem cabecalho legivel o trigger produziu % em vez de NULL — ele esta ADIVINHANDO, que e exatamente o defeito que esta migration remove', v_ip;
    END IF;

    -- (d2) IP explicito e PRESERVADO (o trigger preenche o que falta, nunca sobrescreve)
    INSERT INTO public.logs_acesso (evento, ip_address) VALUES ('p47_ip_probe', '203.0.113.7'::inet)
      RETURNING ip_address INTO v_ip;
    IF v_ip IS DISTINCT FROM '203.0.113.7'::inet THEN
      RAISE EXCEPTION 'P47-IP FAIL (d2): o trigger SOBRESCREVEU um ip_address explicito (% em vez de 203.0.113.7) — inserções de servidor que ja sabem o endereco perderiam o valor', v_ip;
    END IF;

    RAISE EXCEPTION 'rollback_p47_ip' USING ERRCODE = 'P47IP';
  EXCEPTION
    WHEN sqlstate 'P47IP' THEN
      NULL;  -- reversao ESPERADA: as duas sondas nao deixam linha
  END;

  -- (e) asserção negativa: as sondas foram revertidas de verdade
  IF EXISTS (SELECT 1 FROM public.logs_acesso WHERE evento = 'p47_ip_probe') THEN
    RAISE EXCEPTION 'P47-IP FAIL (e): sobrou linha de sonda em logs_acesso — o idioma de rollback nao funcionou como escrito, e esta migration acabou de sujar um log de auditoria';
  END IF;

  RAISE NOTICE 'P47-IP OK: coluna nullable, trigger BEFORE INSERT vivo, search_path estrito, caminho exercitado nos dois ramos e sondas revertidas';
END
$verifica_ip_no_servidor$;

-- =============================================================================
-- ⚠⚠ ORDEM OBRIGATÓRIA — A INVERSÃO DEGRADA UM LOG DE SEGURANÇA EM SILÊNCIO
-- =============================================================================
--   1º  APLICAR ESTA MIGRATION.
--   2º  SÓ ENTÃO fazer deploy do frontend que para de mandar `ip_address`
--       (`src/services/logAccessService.ts`, no mesmo commit que esta migration).
--
-- Se o frontend subir ANTES do apply, o INSERT bate `23502 not-null violation` —
-- e `logAccessEvent` ENGOLE o erro (`console.error`, sem `throw`, de propósito:
-- «logging é secundário ao processo de autenticação»). O efeito é o pior possível:
-- o registro de sessão expirada simplesmente PARA de ser gravado, sem alarme,
-- sem exceção e sem ninguém notar. É a razão de esta ordem estar escrita aqui e
-- não só na mensagem de commit.
--
-- Se a migration subir e o frontend não, nada quebra: o cliente continua mandando
-- o IP do ipify e o trigger respeita o valor recebido (asserção (d2)). Essa é a
-- direção segura, e é por isso que ela é a primeira.
--
-- ── OBRIGAÇÃO PÓS-APPLY, para não repetir o defeito da Phase 47 ──────────────
-- `docs/compliance/pii-inventory.yaml:190` ainda diz «NOT NULL — apagar exige
-- tornar nullable ou truncar». Depois do apply isso vira FALSO. Atualizar a nota
-- e regenerar `pii-inventory.md` (`npm run check:pii-inventory-md`) no mesmo
-- checkpoint. Um apply que não atualiza o artefato que ele contradiz é como um
-- apply sem artefato — indistinguível de não ter acontecido.
-- =============================================================================
