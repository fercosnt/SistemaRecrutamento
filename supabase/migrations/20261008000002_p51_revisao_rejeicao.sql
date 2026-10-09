-- =============================================================================
-- Migration 20261008000002 — registro PRÓPRIO do pedido de revisão para TODA rejeição
-- Phase 51 / Plano 51-08 · JORN-42 · D-01..D-12, D-30, D-33, D-35, D-36 · correções C-1..C-3, C-9
-- =============================================================================
--
-- O QUE ESTAVA ERRADO (JORN-42). O direito de revisão (LGPD Art. 20) dependia do CAMINHO que
-- registrou a rejeição: só a decisão final (`registrar_decisao` → linha em `decisao_final`) tinha
-- pedido de revisão. A rejeição pelo RH em qualquer etapa (`rejeitar_candidatura`) e o knockout
-- automático (`submit_candidatura_atomic`) não gravam `decisao_final` e ficavam sem pedido. A D-20
-- da 48, que justificava isso, foi REVOGADA pelo operador em 29/09.
-- E POR QUE NÃO GRAVAR TUDO EM `decisao_final` (C-9). `decisao_final.por_usuario` é NOT NULL + FK,
-- `decisao_final_historico.por_usuario` também, `justificativa` tem CHECK ≥ 50, e
-- `responder_revisao_decisao` recusa `por_usuario IS NULL` («decisor indeterminado»). O knockout
-- não tem autor: gravá-lo ali exigiria afrouxar dois NOT NULL e desligar a guarda de integridade
-- que separa «knockout» de «linha corrompida», e quebraria `oper31` e `p48_rejeicao_triagem`
-- (c)/(e). Por isso o mecanismo (b): um registro próprio, aditivo; o ciclo de `decisao_final`
-- fica byte-idêntico (o POS-PORTAO prova).
--
-- O QUE MUDA.
--   1. Tabela `public.revisao_rejeicao` — um pedido por REJEIÇÃO (`historico_rejeicao_id` UNIQUE,
--      D-06). RLS LIGADA, ZERO policy e ZERO privilégio de tabela para `anon`/`authenticated`:
--      acesso só pelas RPCs DEFINER abaixo (D-12 da 50).
--   2. REJEIÇÃO CORRENTE e DONO (D-01 sem buraco). A rejeição corrente de uma candidatura é a linha
--      MAIS RECENTE de `historico_candidatura` dela com `etapa_para = 'rejeitado'` ou
--      `auto_rejeitado = true` (`ORDER BY criado_em DESC, id DESC`). O caminho de `decisao_final` é
--      DONO dela quando existe linha de `decisao_final` com `decisao = 'rejeitado'` e
--      (`revisao_respondida_em IS NULL` ou `reaberta_em IS NULL`); em todo outro caso de
--      `status = 'rejeitado'` o pedido vem para cá — `origem = 'automatica'` se a linha corrente
--      tem `auto_rejeitado`, `'humana_triagem'` senão (o vocabulário do cliente,
--      `ExplicacaoCandidato.origem`; o selo da fila é «Rejeição pelo RH», D-33). Assim toda
--      rejeição tem exatamente UM caminho — inclusive a de `rejeitar_candidatura` depois de uma
--      decisão final em espera ou revertida. `explicacao_rejeicao_origem` NÃO muda.
--   3. `solicitar_revisao_rejeicao(uuid)` (titular): guarda de titular por `user_id` ANTES de
--      qualquer leitura de estado (falha fechada, sem oráculo); só `status = 'rejeitado'` (D-07);
--      sem prazo (D-05); `ON CONFLICT DO NOTHING` devolve o pedido existente (D-06). A etapa de
--      reabertura é gravada no pedido: knockout → `triagem` (D-30), RH → `etapa_de` da linha
--      corrente (inclusive `decisao_final`, C-2).
--      ⚠ ASSUMPTION (portão 51-16): rejeição pelo RH registrada SEM ator no histórico (nunca
--      medida; `rejeitar_candidatura` sempre grava `auth.uid()`) faz o pedido falhar com P0002 em
--      vez de abrir uma revisão sem dono — a mesma escolha fail-closed de
--      `responder_revisao_decisao` («decisor indeterminado»).
--   4. `estado_revisao_rejeicao(uuid)` (titular, STABLE): `NULL` para quem não é o titular; o
--      pedido da rejeição corrente (mesmo depois da reabertura — a página do titular não some), ou
--      `elegivel = true`, ou `NULL`. Allowlist montada DENTRO do `jsonb_build_object`: só
--      `origem`, `elegivel` e `pedido{solicitada_em, veredito, resultado, respondida_em,
--      reaberta_em, prazo_nova_decisao_em}` — nunca `rejeitado_por`, `respondida_por`,
--      `opcao_knockout_id` (D-15 da 48), ids ou etapas.
--   5. `responder_revisao_rejeicao(uuid,text,text)` (RH ativo ou administrador): ordem de guardas
--      do molde P48-11 (papel com `coalesce`, `sub` obrigatório, `is_active_rh_user()` no ramo
--      `rh` — D-02 da 50 —, pedido `FOR UPDATE`, REVISAO-05 — quem rejeitou não responde; no
--      knockout não há decisor e qualquer RH ativo responde, D-10 —, já respondido, veredito
--      fechado, resposta ≥ 50). A procedente reabre sob `app.transicao_sancionada = 'reabertura'`
--      na etapa do pedido, `status = 'em_analise'`, sem `feedback_rejeicao`/`data_decisao_final`,
--      com prazo = 00:00 de SP do 11º dia (fórmula de `responder_revisao_decisao`), vaga em
--      qualquer estado (D-04). No knockout: `motivo_rejeicao`/`opcao_knockout_id` FICAM (D-35) e o
--      mesmo `net.http_post` para `analise-candidato-individual` que a inscrição dispara
--      (`trg_candidatura_analise`, com o timeout de 120 s dele) sai UMA vez (D-36), fail-open.
--      Reabrir para `avaliacao_assincrona` dispara o e-mail de avanço do `trg_notif_transicao`
--      vivo (convite para retomar) — aceito e registrado no 51-08.
--      CASO NOMEADO (P48, `20260921000004`): 3 knockouts de teste do operador (0f7b217c,
--      25a4231c, 92522073) têm em `analise_candidato_vaga` uma análise `sucesso` marcada
--      `descartada_em`/`descartada_motivo = 'knockout_automatico'`. A reabertura NÃO toca essa
--      marca (D-02 da 48: marcar, não apagar); a EF faz upsert por `candidatura_id` sem escrever
--      essas colunas — se uma das 3 for revertida, a análise NOVA herdaria a marca antiga. Levado
--      ao operador no checkpoint do 51-16.
--   6. Triggers de notificação no molde P48 (Vault com pulo gracioso, fail-open):
--      INSERT → `notificar-rh` com EXATAMENTE `{evento:'revisao_solicitada', candidatura_id,
--      ciclo}` (a EF de hoje, inalterada); `respondida_em` NULL → NOT NULL → `notificar-candidato`
--      com `{evento:'revisao_respondida', candidatura_id, ciclo, pedido_id}` (`ciclo` = epoch de
--      `solicitada_em`). A EF que lê `pedido_id` é do 51-11 e vai ao ar no portão (51-16), ANTES
--      de qualquer cliente que permita pedir.
--   7. D-08 NÃO dispara (C-3): o direito é calculado na hora; esta migration não escreve linha
--      nenhuma e não manda e-mail retroativo (POS-PORTAO: `count(*) = 0`).
--
-- MEDIDO EM PROD (só leitura, 2026-10-09, Passo 0 do 51-08) — o caminho `decisao_final`, que esta
-- migration NÃO toca; FORMA DO PORTÃO: md5(p.prosrc) (md5(pg_get_functiondef) só conferência,
-- igual ao do 51-RESEARCH em todas as oito):
--   avancar_etapa                78317b0734f876b69737c51c3158e502   (def b104f768…)
--   explicacao_rejeicao_origem   b53400f55502167dbef166173390c9d2   (def 29f63b16…)
--   guard_rejeicao_auditada      dc695aa49a76c1dab31e9867703556ec   (def 89d85b8b…)
--   registrar_decisao            7da195353109938c8e572cb61800de06   (def f7c64906…)
--   rejeitar_candidatura         75c0d3d0451a6f8c1e1a4425208daa4a   (def c4301082…)
--   responder_revisao_decisao    301ca807c5a41b9bac417e16f6321682   (def d4b47f5b…)
--   solicitar_revisao_decisao    c0209efc7ccdac82e83593eba0b24fcc   (def 13957aa6…)
--   submit_candidatura_atomic    c3e7302b93305883a0d58e7787a08dc3   (def 7fddda4c…)
--   `historico_candidatura.id` = uuid; Vault `project_url`/`edge_invoke_key` presentes (1/1).
--   população `status = 'rejeitado'`: 9 (4 automatica, 4 humana_triagem, 1 dono decisao_final),
--   todas de contas de teste; rejeições pelo RH sem ator: 0. Cabeça do ledger: 20261008000001.
--
-- PRE-PORTAO (P51-02): a tabela e as três RPCs AUSENTES; o md5(prosrc) das oito funções do caminho
-- `decisao_final` = o medido (senão RAISE e nada muda). Captura o conjunto em GUC LOCAL.
-- POS-PORTAO (P51-02): colunas e nulidade; constraints por nome; RLS ligada e ZERO policy;
-- `has_table_privilege` falso para `anon`/`authenticated`; `count(*) = 0`; as três RPCs DEFINER
-- com `search_path=""`; `anon` sem EXECUTE em NENHUMA função nova; os dois triggers; marcadores no
-- código sem comentários; o md5 das oito = o capturado no PRE; anexa `02:…` a `p51.evidencia`.
--
-- LOCK. `CREATE TABLE` com FKs toma SHARE ROW EXCLUSIVE em `candidaturas` e
-- `historico_candidatura` pelo tempo da transação (curta). `lock_timeout 3s`/`statement_timeout 5s`
-- (as duas PRIMEIRAS instruções) limitam a espera e cada instrução; `55P03`/`57014` = fila, não a
-- migration — repetir depois, nunca subir o teto.
--
-- IDEMPOTÊNCIA. Não é reaplicável por desenho: o PRE-PORTAO recusa a tabela já existente, e o
-- `p46apply migrate` recusa versão já no ledger. Reaplicar exige migration nova.
--
-- EVIDÊNCIA. `02:…` em `p51.evidencia`; prova comportamental no smoke
-- `supabase/tests/p51_revisao_rejeicao_smoke.sql` (smoke51b, 12 cláusulas, só pelo ensaio que
-- aborta); mutações MB1..MB12 em `scripts/p51_mutacoes.cjs`; regressão do ciclo `decisao_final`
-- (p42/p48/p49/oper31/submit) com esta migration prefixada.
--
-- NÃO APLICADA NO 51-08: o apply espera a review bloqueante do 51-16 (D-12 da 50). Todo uso em PROD
-- neste plano é ensaio que aborta.
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira (esta
-- migration + a linha do ledger) numa única transação (CLAUDE.md §«Via de apply ATUAL»); um
-- wrapper externo é o gatilho do 42601 conhecido e quebraria o ensaio que aborta.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261008000002_p51_revisao_rejeicao.sql
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P51-02 PRE-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  -- Medido em PROD em 2026-10-09 (Passo 0 do 51-08): nome:md5(prosrc), ordenado por nome.
  c_df  constant text :=
    'avancar_etapa:78317b0734f876b69737c51c3158e502,'
    'explicacao_rejeicao_origem:b53400f55502167dbef166173390c9d2,'
    'guard_rejeicao_auditada:dc695aa49a76c1dab31e9867703556ec,'
    'registrar_decisao:7da195353109938c8e572cb61800de06,'
    'rejeitar_candidatura:75c0d3d0451a6f8c1e1a4425208daa4a,'
    'responder_revisao_decisao:301ca807c5a41b9bac417e16f6321682,'
    'solicitar_revisao_decisao:c0209efc7ccdac82e83593eba0b24fcc,'
    'submit_candidatura_atomic:c3e7302b93305883a0d58e7787a08dc3';
  v_got text;
BEGIN
  IF pg_catalog.to_regclass('public.revisao_rejeicao') IS NOT NULL THEN
    RAISE EXCEPTION 'P51-02 PRE-PORTAO: public.revisao_rejeicao JA existe — esta migration nao e reaplicavel; nada mudou';
  END IF;
  IF pg_catalog.to_regprocedure('public.solicitar_revisao_rejeicao(uuid)') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.estado_revisao_rejeicao(uuid)') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.responder_revisao_rejeicao(uuid,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'P51-02 PRE-PORTAO: uma das RPCs do pedido de revisao de rejeicao JA existe — nada mudou';
  END IF;
  SELECT string_agg(p.proname || ':' || md5(p.prosrc), ',' ORDER BY p.proname)
    INTO v_got
    FROM pg_catalog.pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace
     AND p.proname IN ('avancar_etapa', 'explicacao_rejeicao_origem', 'guard_rejeicao_auditada', 'registrar_decisao',
                       'rejeitar_candidatura', 'responder_revisao_decisao', 'solicitar_revisao_decisao',
                       'submit_candidatura_atomic');
  IF v_got IS DISTINCT FROM c_df THEN
    RAISE EXCEPTION 'P51-02 PRE-PORTAO: o caminho decisao_final vivo divergiu do medido em 2026-10-09 (vivo: %) — reler os corpos vivos e refazer esta migration; nada mudou', v_got;
  END IF;
  PERFORM set_config('p51.p02_df', v_got, true);
END
$pre$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · public.revisao_rejeicao — o registro do pedido
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.revisao_rejeicao (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id          uuid        NOT NULL,
  historico_rejeicao_id   uuid        NOT NULL,
  origem                  text        NOT NULL,
  etapa_rejeitada         public.etapa_processo NOT NULL,
  etapa_reabertura        public.etapa_processo NOT NULL,
  rejeitado_por           uuid,
  opcao_knockout_id       uuid,
  solicitada_em           timestamptz NOT NULL DEFAULT now(),
  veredito                text,
  resultado               text,
  respondida_por          uuid,
  respondida_em           timestamptz,
  reaberta_em             timestamptz,
  prazo_nova_decisao_em   timestamptz,
  alerta_prazo_enviado_em timestamptz,

  CONSTRAINT fk_revisao_rejeicao_candidatura
    FOREIGN KEY (candidatura_id) REFERENCES public.candidaturas(id),
  CONSTRAINT fk_revisao_rejeicao_historico
    FOREIGN KEY (historico_rejeicao_id) REFERENCES public.historico_candidatura(id),
  CONSTRAINT uq_revisao_rejeicao_historico
    UNIQUE (historico_rejeicao_id),
  CONSTRAINT ck_revisao_rejeicao_origem
    CHECK (origem IN ('humana_triagem', 'automatica')),
  CONSTRAINT ck_revisao_rejeicao_veredito
    CHECK (veredito IN ('mantida', 'revertida')),
  CONSTRAINT ck_revisao_rejeicao_autor
    CHECK ((origem = 'automatica') = (rejeitado_por IS NULL)),
  CONSTRAINT ck_revisao_rejeicao_opcao
    CHECK (origem = 'automatica' OR opcao_knockout_id IS NULL),
  CONSTRAINT ck_revisao_rejeicao_knockout_triagem
    CHECK (origem <> 'automatica' OR etapa_reabertura = 'triagem'),
  CONSTRAINT ck_revisao_rejeicao_resposta
    CHECK ((veredito IS NULL) = (respondida_em IS NULL)),
  CONSTRAINT ck_revisao_rejeicao_revisor
    CHECK ((respondida_em IS NULL) = (respondida_por IS NULL)),
  CONSTRAINT ck_revisao_rejeicao_resultado
    CHECK ((veredito IS NULL) = (resultado IS NULL)),
  CONSTRAINT ck_revisao_rejeicao_resultado_min
    CHECK (resultado IS NULL OR length(btrim(resultado)) >= 50),
  CONSTRAINT ck_revisao_rejeicao_prazo
    CHECK ((reaberta_em IS NULL) = (prazo_nova_decisao_em IS NULL)),
  CONSTRAINT ck_revisao_rejeicao_reabertura
    CHECK ((veredito IS NOT DISTINCT FROM 'revertida') = (reaberta_em IS NOT NULL))
);

CREATE INDEX idx_revisao_rejeicao_candidatura ON public.revisao_rejeicao (candidatura_id);

ALTER TABLE public.revisao_rejeicao ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.revisao_rejeicao FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.revisao_rejeicao IS
  'Phase 51 / JORN-42 (LGPD Art. 20): o pedido de revisao de uma REJEICAO que nao e da decisao final '
  '— rejeicao pelo RH em qualquer etapa (rejeitar_candidatura, origem humana_triagem) e knockout '
  'automatico (submit_candidatura_atomic, origem automatica). Um pedido por rejeicao: a chave e a '
  'linha de historico_candidatura que registrou a rejeicao (UNIQUE), e uma nova rejeicao depois de '
  'uma reabertura gera direito novo (D-06). O ciclo de decisao_final segue na propria tabela dele. '
  '⚠ ZERO POLICY E ZERO PRIVILEGIO DE TABELA, DE PROPOSITO: RLS ligada sem policy E REVOKE ALL de '
  'PUBLIC, anon e authenticated. O acesso e SO pelas RPCs SECURITY DEFINER solicitar_revisao_rejeicao, '
  'estado_revisao_rejeicao e responder_revisao_rejeicao, que carregam a guarda de titular, a '
  'allowlist do titular e a REVISAO-05. A RLS sozinha devolveria 0 linhas e uma sonda nao '
  'distinguiria «vazio» de «barrado»; sem privilegio, a leitura direta falha com 42501 (defesa em '
  'profundidade, D-12 da 50). service_role (EFs) le por bypass, como em decisao_final.';

COMMENT ON COLUMN public.revisao_rejeicao.candidatura_id IS
  'A candidatura rejeitada. FK sem ON DELETE (ver a constraint).';
COMMENT ON COLUMN public.revisao_rejeicao.historico_rejeicao_id IS
  'A linha de historico_candidatura que registrou a rejeicao corrente no momento do pedido (a mais '
  'recente com etapa_para = rejeitado ou auto_rejeitado). UNIQUE: um pedido por rejeicao (D-06).';
COMMENT ON COLUMN public.revisao_rejeicao.origem IS
  'humana_triagem = rejeicao pelo RH fora da decisao final, em qualquer etapa (selo «Rejeicao pelo '
  'RH», D-33); automatica = knockout. Mesmo vocabulario de ExplicacaoCandidato.origem no cliente.';
COMMENT ON COLUMN public.revisao_rejeicao.etapa_rejeitada IS
  'etapa_de da linha de rejeicao (inscricao no knockout). Copia do historico no momento do pedido.';
COMMENT ON COLUMN public.revisao_rejeicao.etapa_reabertura IS
  'Para onde a procedente reabre: a etapa_rejeitada na rejeicao pelo RH (D-02, inclusive '
  'decisao_final, C-2); triagem no knockout (D-30 — inscricao nao e etapa de trabalho e nao gera '
  'historico).';
COMMENT ON COLUMN public.revisao_rejeicao.rejeitado_por IS
  'O ator da linha de rejeicao (quem rejeitou). NULL so no knockout, que nao tem autor. E o decisor '
  'da REVISAO-05: ele nao responde a propria revisao. Nunca sai para o titular.';
COMMENT ON COLUMN public.revisao_rejeicao.opcao_knockout_id IS
  'Copia de candidaturas.opcao_knockout_id no pedido, so no knockout (D-11: o RH ve a opcao que '
  'eliminou). Nunca sai para o titular (D-15 da 48).';
COMMENT ON COLUMN public.revisao_rejeicao.solicitada_em IS
  'Quando o titular pediu. extract(epoch) dele e o ciclo das notificacoes (dedupe nas EFs).';
COMMENT ON COLUMN public.revisao_rejeicao.veredito IS
  'mantida (improcedente: encerra o pedido) | revertida (procedente: reabre). NULL ate a resposta.';
COMMENT ON COLUMN public.revisao_rejeicao.resultado IS
  'A resposta do revisor AO TITULAR (>= 50 caracteres apos trim). E dado do titular: o motor de '
  'exclusao tem de raspa-la (passo do 51-13).';
COMMENT ON COLUMN public.revisao_rejeicao.respondida_por IS
  'Quem respondeu (RH ativo ou administrador). Nunca sai para o titular.';
COMMENT ON COLUMN public.revisao_rejeicao.respondida_em IS
  'Quando a revisao foi respondida. NULL -> NOT NULL dispara o aviso ao titular.';
COMMENT ON COLUMN public.revisao_rejeicao.reaberta_em IS
  'Preenchida SO na revertida: quando a candidatura foi reaberta.';
COMMENT ON COLUMN public.revisao_rejeicao.prazo_nova_decisao_em IS
  'Na revertida: 00:00 de Sao Paulo do 11o dia (mesma formula de responder_revisao_decisao, D-04).';
COMMENT ON COLUMN public.revisao_rejeicao.alerta_prazo_enviado_em IS
  'Reservada ao alerta de prazo (varrer_prazos_reabertura, plano 51-10). NULL ate la.';

COMMENT ON CONSTRAINT fk_revisao_rejeicao_candidatura ON public.revisao_rejeicao IS
  'SEM ON DELETE, de proposito (molde p44): nenhuma funcao viva apaga candidatura (medido em '
  '2026-10-09), e historico_candidatura e decisao_final tambem a referenciam sem cascade. Um pedido '
  'de revisao e registro de um direito exercido; a remocao do titular e trabalho do motor de '
  'exclusao, que raspa e preserva, nunca uma cascata silenciosa.';
COMMENT ON CONSTRAINT fk_revisao_rejeicao_historico ON public.revisao_rejeicao IS
  'SEM ON DELETE, de proposito: a linha de historico que registrou a rejeicao e a chave do pedido '
  '(D-06). historico_candidatura tem um unico escritor (avancar_etapa / submit_candidatura_atomic) e '
  'nenhum apagador vivo.';
COMMENT ON CONSTRAINT uq_revisao_rejeicao_historico ON public.revisao_rejeicao IS
  'D-06: um pedido por rejeicao. solicitar_revisao_rejeicao faz ON CONFLICT DO NOTHING sobre esta '
  'chave e devolve o pedido existente.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · solicitar_revisao_rejeicao — o titular pede
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.solicitar_revisao_rejeicao(p_candidatura_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_dono    uuid;
  v_status  public.status_candidatura;
  v_opcao   uuid;
  v_hid     uuid;
  v_de      public.etapa_processo;
  v_ator    uuid;
  v_auto    boolean;
  v_origem  text;
  v_em      timestamptz;
BEGIN
  -- Guarda de titular ANTES de qualquer leitura de estado (sem oraculo): `IS DISTINCT FROM`, nunca
  -- `NOT IN` — candidatura inexistente, sem JWT ou alheia dao o MESMO 42501 (falha fechada).
  SELECT ca.user_id, c.status, c.opcao_knockout_id
    INTO v_dono, v_status, v_opcao
    FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id;
  IF v_uid IS NULL OR v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- D-07: so status rejeitado entra (retirada e finalizado seguem as regras atuais). D-05: sem prazo.
  IF v_status IS DISTINCT FROM 'rejeitado' THEN
    RAISE EXCEPTION 'revisao indisponivel: a candidatura nao esta rejeitada' USING ERRCODE = 'no_data_found';
  END IF;

  -- A rejeicao CORRENTE: a linha mais recente de rejeicao do historico.
  SELECT h.id, h.etapa_de, h.ator, h.auto_rejeitado
    INTO v_hid, v_de, v_ator, v_auto
    FROM public.historico_candidatura h
   WHERE h.candidatura_id = p_candidatura_id
     AND (h.etapa_para = 'rejeitado' OR h.auto_rejeitado)
   ORDER BY h.criado_em DESC, h.id DESC
   LIMIT 1;
  IF v_hid IS NULL OR v_de IS NULL THEN
    RAISE EXCEPTION 'revisao indisponivel: a rejeicao nao tem registro no historico' USING ERRCODE = 'no_data_found';
  END IF;

  -- DONO: o ciclo de decisao_final, quando ele tem a rejeicao viva (D-01 sem buraco: exatamente um
  -- caminho por rejeicao).
  IF EXISTS (SELECT 1 FROM public.decisao_final d
              WHERE d.candidatura_id = p_candidatura_id
                AND d.decisao = 'rejeitado'
                AND (d.revisao_respondida_em IS NULL OR d.reaberta_em IS NULL)) THEN
    RAISE EXCEPTION 'revisao indisponivel: esta rejeicao e da decisao final e tem caminho proprio' USING ERRCODE = 'no_data_found';
  END IF;

  v_origem := CASE WHEN v_auto THEN 'automatica' ELSE 'humana_triagem' END;
  -- ASSUMPTION (51-16): rejeicao pelo RH sem autor nao abre revisao sem dono (fail-closed).
  IF v_origem = 'humana_triagem' AND v_ator IS NULL THEN
    RAISE EXCEPTION 'revisao indisponivel: rejeicao sem autor registrado (decisor indeterminado)' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.revisao_rejeicao
    (candidatura_id, historico_rejeicao_id, origem, etapa_rejeitada, etapa_reabertura, rejeitado_por, opcao_knockout_id)
  VALUES
    (p_candidatura_id, v_hid, v_origem, v_de,
     CASE WHEN v_origem = 'automatica' THEN 'triagem'::public.etapa_processo ELSE v_de END,
     CASE WHEN v_origem = 'automatica' THEN NULL ELSE v_ator END,
     CASE WHEN v_origem = 'automatica' THEN v_opcao ELSE NULL END)
  ON CONFLICT (historico_rejeicao_id) DO NOTHING;

  SELECT r.solicitada_em INTO v_em
    FROM public.revisao_rejeicao r
   WHERE r.historico_rejeicao_id = v_hid;

  RETURN jsonb_build_object('solicitada_em', v_em);
END;
$function$;

REVOKE ALL ON FUNCTION public.solicitar_revisao_rejeicao(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.solicitar_revisao_rejeicao(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.solicitar_revisao_rejeicao(uuid) TO authenticated;

COMMENT ON FUNCTION public.solicitar_revisao_rejeicao(uuid) IS
  'Phase 51 / JORN-42 (Art. 20): o titular pede revisao de uma rejeicao que nao e da decisao final '
  '(rejeicao pelo RH em qualquer etapa, ou knockout). Guarda de titular por candidatos.user_id com '
  'IS DISTINCT FROM antes de qualquer leitura de estado (42501, sem oraculo); so status rejeitado '
  '(D-07, P0002 senao); sem prazo (D-05); rejeicao da decisao final -> P0002 (o caminho e o '
  'solicitar_revisao_decisao); rejeicao pelo RH sem autor -> P0002 (fail-closed). Um pedido por '
  'rejeicao: ON CONFLICT devolve o existente (D-06). Devolve so {solicitada_em}. O INSERT dispara o '
  'aviso ao RH (trg_notif_revisao_rejeicao_solicitada). REVOKE de PUBLIC e de anon NOMINALMENTE: o '
  'pg_default_acl de public concede EXECUTE a anon em todo CREATE FUNCTION como grant direto, e '
  'revogar so de PUBLIC removeria um grant que nunca existiu. GRANT EXECUTE a authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · estado_revisao_rejeicao — o titular le (allowlist)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.estado_revisao_rejeicao(p_candidatura_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_dono    uuid;
  v_status  public.status_candidatura;
  v_hid     uuid;
  v_de      public.etapa_processo;
  v_ator    uuid;
  v_auto    boolean;
  r         public.revisao_rejeicao;
BEGIN
  SELECT ca.user_id, c.status
    INTO v_dono, v_status
    FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id;
  IF v_uid IS NULL OR v_dono IS DISTINCT FROM v_uid THEN
    RETURN NULL;   -- nao e o titular (ou nao existe, ou sem JWT): nada
  END IF;

  SELECT h.id, h.etapa_de, h.ator, h.auto_rejeitado
    INTO v_hid, v_de, v_ator, v_auto
    FROM public.historico_candidatura h
   WHERE h.candidatura_id = p_candidatura_id
     AND (h.etapa_para = 'rejeitado' OR h.auto_rejeitado)
   ORDER BY h.criado_em DESC, h.id DESC
   LIMIT 1;
  IF v_hid IS NULL THEN
    RETURN NULL;
  END IF;

  -- O pedido da rejeicao corrente, em QUALQUER status: depois da revertida a candidatura esta
  -- em_analise e a pagina do titular continua mostrando a resposta (armadilha 3 do RESEARCH).
  SELECT * INTO r FROM public.revisao_rejeicao x WHERE x.historico_rejeicao_id = v_hid;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'origem',   r.origem,
      'elegivel', false,
      'pedido',   jsonb_build_object(
        'solicitada_em', r.solicitada_em,
        'veredito', r.veredito,
        'resultado', r.resultado,
        'respondida_em', r.respondida_em,
        'reaberta_em', r.reaberta_em,
        'prazo_nova_decisao_em', r.prazo_nova_decisao_em));
  END IF;

  IF v_status IS DISTINCT FROM 'rejeitado' OR v_de IS NULL THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.decisao_final d
              WHERE d.candidatura_id = p_candidatura_id
                AND d.decisao = 'rejeitado'
                AND (d.revisao_respondida_em IS NULL OR d.reaberta_em IS NULL)) THEN
    RETURN NULL;   -- o dono e o ciclo de decisao_final
  END IF;
  IF NOT v_auto AND v_ator IS NULL THEN
    RETURN NULL;   -- ASSUMPTION (51-16): rejeicao pelo RH sem autor
  END IF;

  RETURN jsonb_build_object(
    'origem',   CASE WHEN v_auto THEN 'automatica' ELSE 'humana_triagem' END,
    'elegivel', true,
    'pedido',   NULL);
END;
$function$;

REVOKE ALL ON FUNCTION public.estado_revisao_rejeicao(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.estado_revisao_rejeicao(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.estado_revisao_rejeicao(uuid) TO authenticated;

COMMENT ON FUNCTION public.estado_revisao_rejeicao(uuid) IS
  'Phase 51 / JORN-42: a fonte do cliente (51-12) para o pedido de revisao fora da decisao final. '
  'NULL para quem nao e o titular. Senao: o pedido da rejeicao corrente (mesmo depois da '
  'reabertura), ou {origem, elegivel:true, pedido:null}, ou NULL (sem rejeicao, ou rejeicao da '
  'decisao final). ALLOWLIST montada dentro do jsonb_build_object: so origem, elegivel e pedido '
  '{solicitada_em, veredito, resultado, respondida_em, reaberta_em, prazo_nova_decisao_em} — nunca '
  'rejeitado_por, respondida_por, opcao_knockout_id (D-15 da 48), ids de historico ou etapas. '
  'explicacao_rejeicao_origem NAO muda. REVOKE de PUBLIC e de anon NOMINALMENTE (pg_default_acl), '
  'GRANT EXECUTE a authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · responder_revisao_rejeicao — o RH responde; a procedente reabre na etapa
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.responder_revisao_rejeicao(p_pedido_id uuid, p_veredito text, p_justificativa text)
 RETURNS public.revisao_rejeicao
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_row          public.revisao_rejeicao;
  v_uid          uuid := auth.uid();
  v_role         text := (select auth.jwt() #>> '{app_metadata,role}');
  v_etapa        public.etapa_processo;
  v_status       public.status_candidatura;
  v_vaga         uuid;
  v_cur          uuid;
  v_data_limite  date;
  v_prazo        timestamptz;
  v_n            int;
  v_project_url  text;
  v_invoke_key   text;
BEGIN
  -- Papel fail-closed (P50 / D-04): sem coalesce, um papel nulo daria NULL no NOT IN e passaria.
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- D-02 da 50: rh ATIVO (helper vivo); token de recrutador desativado -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
    FROM public.revisao_rejeicao r
   WHERE r.id = p_pedido_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pedido de revisao inexistente' USING ERRCODE = 'no_data_found';
  END IF;

  -- REVISAO-05: quem rejeitou nao responde. No knockout (rejeitado_por NULL) nao ha decisor e
  -- qualquer RH ativo responde (D-10).
  IF v_row.rejeitado_por IS NOT NULL AND v_row.rejeitado_por = v_uid THEN
    RAISE EXCEPTION 'quem rejeitou a candidatura nao pode responder a revisao dela (decisor)'
      USING ERRCODE = '42501';
  END IF;

  IF v_row.respondida_em IS NOT NULL THEN
    RAISE EXCEPTION 'revisao ja respondida' USING ERRCODE = '22023';
  END IF;
  IF coalesce(p_veredito, '') NOT IN ('mantida', 'revertida') THEN
    RAISE EXCEPTION 'veredito invalido' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(coalesce(p_justificativa, ''))) < 50 THEN
    RAISE EXCEPTION 'justificativa precisa de ao menos 50 caracteres' USING ERRCODE = '22023';
  END IF;

  IF p_veredito = 'revertida' THEN
    -- So ha o que reabrir sobre a rejeicao DESTE pedido, ainda vigente. Conferido antes de qualquer
    -- escrita; a candidatura e lida FOR UPDATE (ninguem a move ate o UPDATE abaixo).
    SELECT c.etapa_atual, c.status, c.vaga_id
      INTO v_etapa, v_status, v_vaga
      FROM public.candidaturas c
     WHERE c.id = v_row.candidatura_id
       FOR UPDATE;
    SELECT h.id INTO v_cur
      FROM public.historico_candidatura h
     WHERE h.candidatura_id = v_row.candidatura_id
       AND (h.etapa_para = 'rejeitado' OR h.auto_rejeitado)
     ORDER BY h.criado_em DESC, h.id DESC
     LIMIT 1;
    IF v_status IS DISTINCT FROM 'rejeitado'
       OR v_etapa IS DISTINCT FROM (CASE WHEN v_row.origem = 'automatica' THEN 'inscricao' ELSE 'rejeitado' END)::public.etapa_processo
       OR v_cur IS DISTINCT FROM v_row.historico_rejeicao_id THEN
      RAISE EXCEPTION 'nada a reabrir: a candidatura nao esta mais na rejeicao deste pedido'
        USING ERRCODE = '22023';
    END IF;

    -- D-04: 10 dias corridos em SP; vence no FIM do 10o dia (00:00 de SP do 11o). Vaga em qualquer estado.
    v_data_limite := (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date + 10;
    v_prazo       := ((v_data_limite + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo');

    -- Reabrir, NAO aprovar (RNF-07a): a etapa do pedido (D-02; triagem no knockout, D-30),
    -- em_analise. A candidatura esta ENCERRADA; a reabertura do Art. 20 e transicao sancionada,
    -- declarada aqui. etapa_atual NO SET: e o que aciona avancar_etapa e grava a trilha (+1 linha
    -- de historico com o revisor como ator). feedback_rejeicao = NULL (armadilha 4) e
    -- data_decisao_final = NULL. motivo_rejeicao e opcao_knockout_id FICAM (auditoria, D-35).
    PERFORM set_config('app.transicao_sancionada', 'reabertura', true);
    UPDATE public.candidaturas
       SET etapa_atual = v_row.etapa_reabertura,
           status = 'em_analise',
           etapa_justificativa = format(
             'Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até %s.',
             to_char(v_data_limite, 'DD/MM/YYYY')),
           feedback_rejeicao = NULL,
           data_decisao_final = NULL
     WHERE id = v_row.candidatura_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    -- O reset vem DEPOIS do GET DIAGNOSTICS (um PERFORM antes zeraria o ROW_COUNT); sem ele a
    -- sancao vazaria para todo UPDATE seguinte da mesma transacao (Correcao 31).
    PERFORM set_config('app.transicao_sancionada', '', true);
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'reabertura nao moveu a candidatura (% linhas) — nada foi gravado', v_n;
    END IF;

    -- D-36: o knockout nunca teve analise de IA (a EF pula knockout). O MESMO despacho que a
    -- inscricao faz (trg_candidatura_analise), uma vez, fail-open: Vault ausente pula, falha de
    -- rede nao derruba a reabertura.
    IF v_row.origem = 'automatica' THEN
      SELECT decrypted_secret INTO v_project_url
        FROM vault.decrypted_secrets WHERE name = 'project_url';
      SELECT decrypted_secret INTO v_invoke_key
        FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
      IF v_project_url IS NOT NULL AND v_invoke_key IS NOT NULL THEN
        BEGIN
          PERFORM net.http_post(
            url := v_project_url || '/functions/v1/analise-candidato-individual',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_invoke_key
            ),
            body := jsonb_build_object(
              'candidatura_id', v_row.candidatura_id,
              'vaga_id', v_vaga
            ),
            timeout_milliseconds := 120000
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'responder_revisao_rejeicao: despacho da analise falhou (%: %) — reabertura intacta', SQLSTATE, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  UPDATE public.revisao_rejeicao
     SET veredito              = p_veredito,
         resultado             = p_justificativa,
         respondida_por        = v_uid,
         respondida_em         = pg_catalog.now(),
         reaberta_em           = CASE WHEN p_veredito = 'revertida' THEN pg_catalog.now() END,
         prazo_nova_decisao_em = CASE WHEN p_veredito = 'revertida' THEN v_prazo END
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.responder_revisao_rejeicao(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.responder_revisao_rejeicao(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.responder_revisao_rejeicao(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.responder_revisao_rejeicao(uuid, text, text) IS
  'Phase 51 / JORN-42 (Art. 20): o RH responde o pedido de revisao de uma rejeicao fora da decisao '
  'final. Papel rh|administrador com coalesce (fail-closed), sub obrigatorio, is_active_rh_user() no '
  'ramo rh (D-02 da 50), pedido FOR UPDATE, REVISAO-05 (quem rejeitou nao responde: 42501 com '
  '«decisor»; no knockout qualquer RH ativo), ja respondido / veredito fora de mantida|revertida / '
  'resposta < 50 -> 22023. A revertida reabre sob app.transicao_sancionada = reabertura na etapa do '
  'pedido (D-02; triagem no knockout, D-30), em_analise, prazo 00:00 SP do 11o dia (D-04), vaga em '
  'qualquer estado; o knockout revertido mantem motivo/opcao (D-35), nao e reaplicado (D-03: so '
  'submit_candidatura_atomic escreve o knockout) e despacha a analise de IA uma vez (D-36). '
  'p_justificativa e a resposta AO TITULAR (coluna resultado). A resposta dispara o aviso ao titular '
  '(trg_notif_revisao_rejeicao_respondida). REVOKE de PUBLIC e de anon NOMINALMENTE (pg_default_acl), '
  'GRANT EXECUTE a authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · Triggers de notificação (molde P48: Vault com pulo gracioso, fail-open)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notif_revisao_rejeicao_solicitada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- AFTER INSERT: o pedido NASCE aqui (ON CONFLICT DO NOTHING nao insere e nao dispara — o segundo
  -- pedido da mesma rejeicao nao avisa o RH de novo).
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, pedido do titular intacto
  END IF;

  BEGIN
    -- EXATAMENTE as tres chaves que a EF notificar-rh de hoje aceita (inalterada).
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-rh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'revisao_solicitada',
        'candidatura_id', NEW.candidatura_id,
        'ciclo', extract(epoch from NEW.solicitada_em)::bigint::text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_revisao_rejeicao_solicitada: dispatch falhou (%: %) — pedido intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_notif_revisao_rejeicao_respondida()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Guard de transicao: SO a primeira resposta (NULL -> NOT NULL).
  IF NOT (OLD.respondida_em IS NULL AND NEW.respondida_em IS NOT NULL) THEN
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
    -- pedido_id: a EF notificar-candidato le o veredito/prazo DESTE pedido (51-11), nunca de
    -- decisao_final (armadilha 2 do RESEARCH).
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'revisao_respondida',
        'candidatura_id', NEW.candidatura_id,
        'ciclo', extract(epoch from NEW.solicitada_em)::bigint::text,
        'pedido_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_revisao_rejeicao_respondida: dispatch falhou (%: %) — resposta intacta', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notif_revisao_rejeicao_solicitada
  AFTER INSERT ON public.revisao_rejeicao
  FOR EACH ROW EXECUTE FUNCTION public.trg_notif_revisao_rejeicao_solicitada();

CREATE TRIGGER trg_notif_revisao_rejeicao_respondida
  AFTER UPDATE OF respondida_em ON public.revisao_rejeicao
  FOR EACH ROW EXECUTE FUNCTION public.trg_notif_revisao_rejeicao_respondida();

REVOKE ALL ON FUNCTION public.trg_notif_revisao_rejeicao_solicitada() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_rejeicao_solicitada() FROM anon;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_rejeicao_solicitada() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_rejeicao_respondida() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_rejeicao_respondida() FROM anon;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_rejeicao_respondida() FROM authenticated;

COMMENT ON FUNCTION public.trg_notif_revisao_rejeicao_solicitada() IS
  'Phase 51 / JORN-42: AFTER INSERT em revisao_rejeicao -> notificar-rh com exatamente {evento: '
  'revisao_solicitada, candidatura_id, ciclo = epoch(solicitada_em)} (a EF de hoje, sem mudanca). '
  'Vault com pulo gracioso; falha de rede vira WARNING (o pedido do titular nunca cai). Funcao de '
  'trigger: REVOKE de PUBLIC, anon (pg_default_acl, nominal) e authenticated — ninguem a chama.';
COMMENT ON FUNCTION public.trg_notif_revisao_rejeicao_respondida() IS
  'Phase 51 / JORN-42: AFTER UPDATE OF respondida_em (so NULL -> NOT NULL) -> notificar-candidato '
  'com {evento: revisao_respondida, candidatura_id, ciclo, pedido_id}. A EF que le pedido_id e do '
  '51-11 e sobe no portao 51-16, antes de qualquer cliente que permita pedir. Vault com pulo '
  'gracioso, fail-open. Funcao de trigger: REVOKE de PUBLIC, anon (pg_default_acl, nominal) e '
  'authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- P51-02 POS-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  c_cols constant text :=
    'id:uuid:NO,candidatura_id:uuid:NO,historico_rejeicao_id:uuid:NO,origem:text:NO,'
    'etapa_rejeitada:etapa_processo:NO,etapa_reabertura:etapa_processo:NO,rejeitado_por:uuid:YES,'
    'opcao_knockout_id:uuid:YES,solicitada_em:timestamptz:NO,veredito:text:YES,resultado:text:YES,'
    'respondida_por:uuid:YES,respondida_em:timestamptz:YES,reaberta_em:timestamptz:YES,'
    'prazo_nova_decisao_em:timestamptz:YES,alerta_prazo_enviado_em:timestamptz:YES';
  c_cons constant text :=
    'ck_revisao_rejeicao_autor,ck_revisao_rejeicao_knockout_triagem,ck_revisao_rejeicao_opcao,'
    'ck_revisao_rejeicao_origem,ck_revisao_rejeicao_prazo,ck_revisao_rejeicao_reabertura,'
    'ck_revisao_rejeicao_resposta,ck_revisao_rejeicao_resultado,ck_revisao_rejeicao_resultado_min,'
    'ck_revisao_rejeicao_revisor,ck_revisao_rejeicao_veredito,fk_revisao_rejeicao_candidatura,'
    'fk_revisao_rejeicao_historico,revisao_rejeicao_pkey,uq_revisao_rejeicao_historico';
  v_cols text;
  v_cons text;
  v_rls  boolean;
  v_pol  bigint;
  v_priv text;
  v_n    bigint;
  v_bad  text := '';
  v_fn   text;
  v_src  text;
  v_trg  text;
  v_df   text;
  k      text;
BEGIN
  SELECT string_agg(c.column_name || ':' || c.udt_name || ':' || c.is_nullable, ',' ORDER BY c.ordinal_position)
    INTO v_cols
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'revisao_rejeicao';
  IF v_cols IS DISTINCT FROM c_cols THEN
    RAISE EXCEPTION 'P51-02 POS-PORTAO: colunas de revisao_rejeicao = % (esperado %)', v_cols, c_cols;
  END IF;

  SELECT string_agg(co.conname::text, ',' ORDER BY co.conname)
    INTO v_cons
    FROM pg_catalog.pg_constraint co
   WHERE co.conrelid = 'public.revisao_rejeicao'::regclass AND co.contype IN ('p', 'f', 'u', 'c');
  IF v_cons IS DISTINCT FROM c_cons THEN
    RAISE EXCEPTION 'P51-02 POS-PORTAO: constraints de revisao_rejeicao = % (esperado %)', v_cons, c_cons;
  END IF;

  SELECT c.relrowsecurity INTO v_rls FROM pg_catalog.pg_class c WHERE c.oid = 'public.revisao_rejeicao'::regclass;
  SELECT count(*) INTO v_pol FROM pg_catalog.pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'revisao_rejeicao';
  SELECT string_agg(r || ':' || pv, ',' ORDER BY r, pv) INTO v_priv
    FROM unnest(ARRAY['anon', 'authenticated']) r,
         unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) pv
   WHERE has_table_privilege(r, 'public.revisao_rejeicao', pv);
  IF NOT coalesce(v_rls, false) OR v_pol <> 0 OR v_priv IS NOT NULL THEN
    RAISE EXCEPTION 'P51-02 POS-PORTAO: rls=% policies=% privilegios=[%] (esperado rls ligada, zero policy, nenhum privilegio para anon/authenticated)',
      v_rls, v_pol, coalesce(v_priv, '');
  END IF;

  SELECT count(*) INTO v_n FROM public.revisao_rejeicao;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'P51-02 POS-PORTAO: revisao_rejeicao nasceu com % linha(s) (esperado 0 — D-08: nenhuma escrita retroativa)', v_n;
  END IF;

  FOREACH v_fn IN ARRAY ARRAY['public.solicitar_revisao_rejeicao(uuid)', 'public.estado_revisao_rejeicao(uuid)',
                              'public.responder_revisao_rejeicao(uuid,text,text)'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p
                    WHERE p.oid = pg_catalog.to_regprocedure(v_fn)
                      AND p.prosecdef AND p.proconfig = ARRAY['search_path=""']
                      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')) THEN
      v_bad := v_bad || v_fn || ' (definer/search_path/authenticated); ';
    END IF;
  END LOOP;
  FOR v_fn IN
    SELECT p.oid::regprocedure::text
      FROM pg_catalog.pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('solicitar_revisao_rejeicao', 'estado_revisao_rejeicao', 'responder_revisao_rejeicao',
                         'trg_notif_revisao_rejeicao_solicitada', 'trg_notif_revisao_rejeicao_respondida')
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    v_bad := v_bad || v_fn || ' (anon EXECUTE); ';
  END LOOP;
  FOR v_fn IN
    SELECT p.oid::regprocedure::text
      FROM pg_catalog.pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('trg_notif_revisao_rejeicao_solicitada', 'trg_notif_revisao_rejeicao_respondida')
       AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  LOOP
    v_bad := v_bad || v_fn || ' (authenticated EXECUTE em funcao de trigger); ';
  END LOOP;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'P51-02 POS-PORTAO: funcoes fora do contrato: %', v_bad;
  END IF;

  SELECT string_agg(t.tgname::text, ',' ORDER BY t.tgname) INTO v_trg
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.revisao_rejeicao'::regclass AND NOT t.tgisinternal;
  IF v_trg IS DISTINCT FROM 'trg_notif_revisao_rejeicao_respondida,trg_notif_revisao_rejeicao_solicitada' THEN
    RAISE EXCEPTION 'P51-02 POS-PORTAO: triggers de revisao_rejeicao = % (esperado os dois de notificacao)', v_trg;
  END IF;

  SELECT regexp_replace(p.prosrc, '--[^\n]*', '', 'g') INTO v_src
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.responder_revisao_rejeicao(uuid,text,text)'::regprocedure;
  FOREACH k IN ARRAY ARRAY['is_active_rh_user', 'transicao_sancionada', 'GET DIAGNOSTICS', 'analise-candidato-individual', 'coalesce(v_role'] LOOP
    IF position(k IN v_src) = 0 THEN
      RAISE EXCEPTION 'P51-02 POS-PORTAO: responder_revisao_rejeicao (sem comentarios) nao contem «%»', k;
    END IF;
  END LOOP;
  IF position('knockout_automatico' IN lower(v_src)) > 0 THEN
    RAISE EXCEPTION 'P51-02 POS-PORTAO: responder_revisao_rejeicao cita knockout_automatico — so submit_candidatura_atomic escreve o knockout (D-03)';
  END IF;

  SELECT string_agg(p.proname || ':' || md5(p.prosrc), ',' ORDER BY p.proname)
    INTO v_df
    FROM pg_catalog.pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace
     AND p.proname IN ('avancar_etapa', 'explicacao_rejeicao_origem', 'guard_rejeicao_auditada', 'registrar_decisao',
                       'rejeitar_candidatura', 'responder_revisao_decisao', 'solicitar_revisao_decisao',
                       'submit_candidatura_atomic');
  IF v_df IS DISTINCT FROM current_setting('p51.p02_df', true) THEN
    RAISE EXCEPTION 'P51-02 POS-PORTAO: o caminho decisao_final MUDOU nesta migration (antes %, depois %) — o mecanismo (b) exige ele byte-identico', current_setting('p51.p02_df', true), v_df;
  END IF;

  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || ' 02:rr=0,rpcs=3,trg=2,df=8/8'), false);
END
$pos$;
