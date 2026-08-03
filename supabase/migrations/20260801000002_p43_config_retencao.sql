-- =============================================================================
-- Phase 43 / Plan 43-04 — RETEN-01 · RETEN-02
-- A matriz de retenção nasce como DADO: configuração por etapa, semeada no teto
-- que o candidato já consentiu, e alterável por um administrador sem deploy.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO LÊ, NÃO ESCREVE E NÃO APAGA NENHUMA LINHA DE CANDIDATO.**
--
-- Nenhum `DELETE`, nenhum `DROP`, nenhum predicado de purga ligado, nenhum `UPDATE`
-- sobre dado de titular. Ela cria UMA tabela de configuração, semeia OITO linhas de
-- configuração, e expõe duas funções que só tocam essa mesma tabela e o ledger de
-- auditoria. A propriedade zero-destrutiva da Phase 43 é DESENHO, não sorte: é o que
-- torna seguro esta matriz nascer agora, meses antes de a purga existir. Ela só passa
-- a MORDER na Phase 46.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- Sem wrapper `BEGIN;/COMMIT;`: o driver já envolve cada migration na sua própria
-- transação implícita, e o BEGIN/COMMIT externo é o gatilho do SQLSTATE 42601
-- ("cannot insert multiple commands into a prepared statement") — CLAUDE.md §Migrations.
-- Este arquivo é exatamente a combinação que o transaction pooler recusa: dois corpos
-- PL/pgSQL delimitados por cifrões, ADJACENTES a `COMMENT` / `REVOKE` / `GRANT`.
--
-- ⚠ AS DUAS PROPRIEDADES DO `apply_migration`, MEDIDAS TRÊS VEZES NA PHASE 42:
--
--   1. **Ele carimba a PRÓPRIA `version` no ledger** — um timestamp do instante do
--      apply, não o do nome deste arquivo. A linha PRECISA ser reparada à mão:
--
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260801000002'
--         WHERE name LIKE '%p43_config_retencao%';
--
--      Sem o reparo, `supabase db push` leria este arquivo como NÃO aplicado e
--      tentaria reaplicá-lo — e `CREATE TABLE` puro falha alto na segunda vez.
--
--   2. **O ledger guarda o SQL LITERALMENTE aplicado** em
--      `supabase_migrations.schema_migrations.statements text[]`. Isso torna a
--      fidelidade PROVÁVEL em vez de presumida — e ela precisa ser provada, porque
--      o `apply_migration` recebe o SQL como STRING na chamada da ferramenta e o
--      agente que aplica precisa RETRANSMITI-LO. Duas das cinco migrations do M8
--      chegaram a PROD com os comentários descartados por essa via. Asserção
--      obrigatória logo após o apply:
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260801000002';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260801000002_*.sql)" | md5
--
--      Divergência ⇒ o conteúdo aplicado NÃO é este arquivo. E aqui a perda de um
--      comentário NÃO é benigna: os `COMMENT` desta migration são o único lugar onde
--      o enquadramento de BD-1 (24 meses = teto consentido, não recomendação técnica)
--      e a DEPENDÊNCIA DA PHASE 46 estão escritos dentro do banco. Um apply que os
--      descartasse entregaria a estrutura e perderia a razão dela.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260730000001_p42_revisao_art20.sql:442-513` (`config_sla_revisao`) — o MOLDE
--     da tabela de config: RLS ligada, UMA policy de SELECT restrita por papel,
--     NENHUMA policy de escrita, seed `ON CONFLICT DO NOTHING`, `COMMENT` que nomeia
--     o número como decisão e não como recomendação, trigger `tocar_atualizado_em()`
--     REUSADA (nunca redefinida).
--
--   · ⚠ **`config_sla_etapa` (P37) NÃO é o molde, e a RLS dela NUNCA é copiada.**
--     Aquela tabela tem leitura PÚBLICA por design (`{anon, authenticated}`,
--     `USING (true)`) porque a P37 a construiu para o painel do CANDIDATO. A própria
--     `20260730000001:437-441` já registrou essa armadilha in loco. Copiá-la aqui
--     poria a POLÍTICA DE RETENÇÃO — quanto tempo a empresa guarda dado de quem —
--     ao alcance do papel anônimo. A semelhança é enganosa: as duas tabelas têm a
--     mesma PK (`etapa_processo`) e posturas de exposição opostas.
--
--   · `20260713000003_usr_rh_mutacao_rpc.sql:119-132` — o idioma de mutar e auditar
--     na MESMA transação (`PERFORM public.log_auditoria(...)` dentro do corpo).
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PRECEDENTE, E POR QUÊ
-- -----------------------------------------------------------------------------
-- `config_sla_revisao` declara: *"Alterar o limiar é operação de banco, não de
-- aplicação — e é justamente isso que o torna alterável SEM DEPLOY (um UPDATE
-- resolve)"* (`20260730000001:454-456`).
--
-- **Isso não satisfaz o RETEN-02.** O requirement pede que um ADMINISTRADOR altere
-- a janela pela TELA. "Um DBA roda um UPDATE" e "um administrador clica em salvar"
-- são a mesma frase só para quem tem credencial de banco. Daí a única divergência
-- deliberada: a matriz ganha um caminho de escrita de APLICAÇÃO, que
-- `config_sla_revisao` não tem — a RPC `salvar_janela_retencao` da seção 6, que
-- grava a mudança e sua linha de auditoria na mesma transação.
--
-- A escrita é RPC `SECURITY DEFINER` e **não** policy de `UPDATE` porque uma policy
-- não dá NENHUMA das duas coisas que o requirement exige junto com a escrita:
-- trilha de auditoria atômica e guard server-side sobre o teto. Ver o COMMENT da
-- função na seção 6.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA
-- -----------------------------------------------------------------------------
-- Esta migration é independente do deploy de qualquer Edge Function e não tem
-- interação com a `20260801000001` (plano 43-01) além da ordem numérica. Ela pode
-- ser aplicada isoladamente. A espec executável que ela tem de satisfazer é
-- `supabase/tests/p43_matriz_retencao_smoke.sql` (10 asserções, quatro delas
-- NEGATIVAS). Ele é CONTRATO: se algo divergir, corrige-se ESTA migration, nunca o
-- smoke.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.config_retencao_etapa — a matriz (RETEN-01)
-- ---------------------------------------------------------------------------
-- ⚠ CHAVE = `etapa_processo` (8 valores), NÃO `status_candidatura` (5). A UI-SPEC
-- deixava a escolha aberta; as razões da decisão, na ordem que importa:
--
--   1. `candidaturas.etapa_atual` é NOT NULL. Toda candidatura viva mapeia para uma
--      linha desta matriz, e NENHUMA cai num buraco silencioso. Uma matriz com
--      buracos, num mecanismo que um dia apaga dado, é a pior forma de erro: o
--      buraco não gera exceção, gera dado guardado para sempre ou apagado sem regra.
--   2. `historico_candidatura` registra as TRANSIÇÕES de etapa
--      (`etapa_de`/`etapa_para`/`criado_em`), o que dá uma data-âncora defensável por
--      estado — o instante em que a candidatura entrou na etapa atual. Não existe
--      equivalente para `status`.
--   3. Oito valores é a granularidade que permite ao parecer jurídico da Phase 46
--      diferenciar `rejeitado` de `aprovado` de `triagem` — que é o ponto inteiro de
--      a matriz ser uma matriz e não um número único.
--
-- TRADEOFF, registrado para quem chegar depois: `etapa_processo` MISTURA etapa de
-- funil com DESFECHO (`aprovado`/`rejeitado` são valores do mesmo enum). Se a Phase
-- 46 precisar de um eixo ortogonal (ex.: "candidatura cancelada pelo próprio
-- titular"), esta matriz precisará de uma segunda dimensão. Foi aceito porque a
-- alternativa (`status_candidatura`) tem o MESMO problema com menos granularidade.
CREATE TABLE public.config_retencao_etapa (
  etapa         public.etapa_processo NOT NULL PRIMARY KEY,
  janela_meses  integer     NOT NULL CHECK (janela_meses BETWEEN 1 AND 24),
  origem        text        NOT NULL DEFAULT 'seed' CHECK (origem IN ('seed', 'admin')),
  alterado_por  uuid        NULL REFERENCES public.usuarios_rh(id),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_retencao_etapa ENABLE ROW LEVEL SECURITY;

-- UMA única policy, de SELECT, restrita a administrador. **NENHUMA policy de
-- escrita** — default-deny. A escrita passa EXCLUSIVAMENTE pela RPC da seção 6, que
-- audita. Acrescentar depois uma policy de `UPDATE` a esta tabela não seria uma
-- conveniência: seria abrir um segundo caminho de escrita que NÃO deixa rastro,
-- contornando a trilha de auditoria que o RETEN-02 exige. A asserção (b) do smoke
-- existe para que esse acréscimo reprove alto em vez de passar despercebido.
CREATE POLICY config_retencao_etapa_admin_read ON public.config_retencao_etapa
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador');

COMMENT ON TABLE public.config_retencao_etapa IS
  'Phase 43 / RETEN-01: janela de retencao por etapa da candidatura, alteravel SEM DEPLOY. '
  'Chave = etapa_processo (8 valores) e nao status_candidatura (5): candidaturas.etapa_atual e '
  'NOT NULL, entao toda candidatura mapeia para uma linha e nenhuma cai em buraco silencioso; '
  'historico_candidatura da a data-ancora por estado; 8 valores e a granularidade que o parecer '
  'juridico da Phase 46 precisa. Tradeoff aceito: etapa_processo mistura etapa de funil com '
  'desfecho — um eixo ortogonal exigiria segunda dimensao. Reusa o PADRAO de config_sla_revisao '
  '(P42) e NAO a RLS de config_sla_etapa (P37), que e public-read por design: copiar aquela '
  'policy poria a politica de retencao ao alcance do papel anonimo. UMA policy, de SELECT, '
  'admin-only; ZERO policy de escrita (default-deny) — a escrita e exclusivamente por '
  'salvar_janela_retencao, que audita na mesma transacao. '
  '⚠ ESTA TABELA E CONFIGURACAO E NADA MAIS: nenhuma rotina deste sistema apaga dado de '
  'candidato hoje. A matriz nasce como DADO na Phase 43 e so passa a MORDER na Phase 46.';

COMMENT ON COLUMN public.config_retencao_etapa.janela_meses IS
  'Meses de retencao a partir da data-ancora do estado. Semeada em 24 para os OITO estados (BD-1). '
  '⚠ 24 MESES E O TETO QUE O CANDIDATO JA LEU E ACEITOU na copy do cadastro — NAO e recomendacao '
  'tecnica, NAO e exigencia estatutaria, e NAO e um numero afinado por estado. E o teto consentido, '
  'e nada mais. O seed e generico DE PROPOSITO: retencao mais longa nunca apaga cedo demais, e um '
  'seed curto seria a unica forma de a Phase 43 causar dano — ela e declaradamente zero-destrutiva. '
  'O numero fino por estado exige parecer juridico trabalhista. '
  '⚠ DEPENDENCIA EXPLICITA DA PHASE 46, registrada aqui dentro do banco e nao em prosa de planning: '
  'a Phase 46 NAO PODE LIGAR A PURGA enquanto esta matriz ainda estiver no seed generico, sem que o '
  'operador confirme os prazos POR ESTADO. Uma coluna com origem=''seed'' em toda linha significa '
  'que ninguem escolheu esses numeros — significa apenas que ninguem os contestou ainda. '
  'O CHECK BETWEEN 1 AND 24 impoe o teto na TABELA; salvar_janela_retencao o impoe de novo na RPC. '
  'Duas camadas, porque o cap da tela e cosmetico.';

COMMENT ON COLUMN public.config_retencao_etapa.origem IS
  'Procedencia do valor vivo: ''seed'' = nunca tocado desde a criacao (ninguem escolheu, apenas '
  'ninguem contestou); ''admin'' = um administrador alterou pela tela via salvar_janela_retencao. '
  'E o discriminador que a Phase 46 tem de consultar ANTES de ligar a purga.';

COMMENT ON COLUMN public.config_retencao_etapa.alterado_por IS
  'usuarios_rh.id do ultimo administrador que alterou a janela, resolvido no SERVIDOR a partir de '
  'auth.uid() — nunca recebido por parametro. NULL enquanto origem = ''seed''. A tela do admin le '
  'o NOME por listar_matriz_retencao (LEFT JOIN resolvido no servidor) e nunca consulta '
  'usuarios_rh, que e admin-only desde a SEG-02.';


-- ---------------------------------------------------------------------------
-- 2 · Trigger de atualizado_em — TRABALHO HERDADO, não trabalho novo
-- ---------------------------------------------------------------------------
-- A função de carimbo já existe desde a P37 (`20260722000002:144`) e é reutilizável
-- tal como está: sem privilégio elevado, com `search_path` vazio e referência
-- totalmente qualificada. Ela **NÃO é redefinida aqui** — redefini-la criaria
-- divergência com a versão viva sem ganho nenhum (`20260730000001:498-501`).
--
-- `CREATE TRIGGER` PURO, sem `DROP` prévio: é o idioma deliberado, que prefere
-- FALHAR ALTO contra um trigger inesperado a substituí-lo em silêncio. Numa tabela
-- criada uma seção acima não pode haver trigger algum.
CREATE TRIGGER trg_config_retencao_atualizado_em
  BEFORE UPDATE ON public.config_retencao_etapa
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();


-- ---------------------------------------------------------------------------
-- 3 · Seed — os OITO estados no teto consentido (RETEN-02 · BD-1)
-- ---------------------------------------------------------------------------
-- `ON CONFLICT (etapa) DO NOTHING`, **JAMAIS upsert**. Re-seedar sobrescreveria em
-- produção um número que o operador ajustou pela tela — e a decisão está travada
-- desde a P37 (`20260721000002:96-98`). Um `DO UPDATE` aqui transformaria um reapply
-- acidental desta migration numa REVOGAÇÃO SILENCIOSA de política de retenção
-- escolhida por um humano. É a forma mais barata de esta fase virar destrutiva sem
-- conter um único `DELETE`.
--
-- Os oito valores são o enum `etapa_processo` INTEIRO (database.types.ts:5290-5298).
-- A asserção (c) do smoke conta 8 exatas: um estado a menos aqui vira, na Phase 46,
-- uma candidatura sem regra de retenção.
INSERT INTO public.config_retencao_etapa (etapa, janela_meses, origem)
VALUES
  ('inscricao',             24, 'seed'),
  ('triagem',               24, 'seed'),
  ('avaliacao_assincrona',  24, 'seed'),
  ('entrevista_online',     24, 'seed'),
  ('entrevista_presencial', 24, 'seed'),
  ('decisao_final',         24, 'seed'),
  ('aprovado',              24, 'seed'),
  ('rejeitado',             24, 'seed')
ON CONFLICT (etapa) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 4 · Por que a ESCRITA é RPC e não policy de UPDATE (RETEN-02)
-- ---------------------------------------------------------------------------
-- Uma policy de `UPDATE` seria menos código e entregaria "administrador altera pela
-- tela". Ela NÃO entrega nenhuma das outras duas coisas que o RETEN-02 exige na
-- mesma respiração:
--
--   · **Trilha de auditoria ATÔMICA.** Uma policy não escreve linha de auditoria. A
--     copy do diálogo promete ao operador "A alteração fica registrada na trilha de
--     auditoria" — e uma promessa de produto sem código que a execute é exatamente a
--     classe de coisa que este milestone existe para eliminar. Um trigger de
--     auditoria chegaria perto, mas não pode RECUSAR (ele roda depois da decisão) e
--     não tem acesso ao motivo da mudança.
--   · **Guard server-side sobre o TETO.** O `CHECK` da tabela impõe 1..24, mas o cap
--     da tela é cosmético e quem impede de verdade tem de ser o servidor, com
--     mensagem própria — mesmo modelo mental do guard REVISAO-05 (D-13).
--
-- As duas funções abaixo são `SECURITY DEFINER` com `SET search_path = ''` e todas as
-- referências totalmente qualificadas. DEFINER **bypassa RLS**, logo o guard do CORPO
-- é o ÚNICO controle de acesso das duas — e é por isso que o formato do guard, abaixo,
-- é load-bearing e não estilo.


-- ---------------------------------------------------------------------------
-- 5 · public.listar_matriz_retencao — leitura com o nome resolvido no SERVIDOR
-- ---------------------------------------------------------------------------
-- Existe para que a tela do admin NUNCA precise de acesso a `public.usuarios_rh`,
-- que é admin-only desde a SEG-02. O `LEFT JOIN` resolve o nome do último alterador
-- aqui dentro e devolve NULL quando esse usuário não existe mais — que é o caso
-- parcial "Não identificado" da UI-SPEC, e não um erro.
--
-- Devolve APENAS as cinco colunas nomeadas. Nunca `usuarios_rh.*`, nunca o e-mail do
-- alterador, nunca o `id` dele: a tela precisa de um NOME para exibir, e tudo além
-- disso seria vazamento por conveniência (`[[reference_select_star_leaks_pii]]`).
CREATE OR REPLACE FUNCTION public.listar_matriz_retencao()
RETURNS TABLE (
  etapa              public.etapa_processo,
  janela_meses       integer,
  origem             text,
  alterado_por_nome  text,
  atualizado_em      timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Guard NULL-SAFE. Ver a seção 6 para a razão completa de `IS DISTINCT FROM`:
  -- em SECURITY DEFINER, um guard NULL-cego falha ABERTO para quem chama sem JWT.
  -- Aqui o que vazaria não é uma escrita, mas a POLÍTICA DE RETENÇÃO da empresa
  -- somada aos NOMES dos administradores — a RLS admin-only da tabela não protege
  -- nada se um DEFINER sem guard a lê por baixo.
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode ler a matriz de retencao'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.etapa,
         c.janela_meses,
         c.origem,
         u.nome_completo,
         c.atualizado_em
    FROM public.config_retencao_etapa c
    LEFT JOIN public.usuarios_rh u ON u.id = c.alterado_por
   ORDER BY c.etapa;
END;
$$;

COMMENT ON FUNCTION public.listar_matriz_retencao() IS
  'Phase 43 / RETEN-01: le a matriz de retencao com o NOME do ultimo alterador ja resolvido no '
  'servidor. SECURITY DEFINER + STABLE com search_path vazio. Existe para que a tela do admin '
  'nunca precise de acesso a usuarios_rh (admin-only desde a SEG-02): o LEFT JOIN devolve NULL '
  'quando o alterador nao existe mais, que e o caso "Nao identificado" da UI-SPEC e nao um erro. '
  'Projecao por allowlist de 5 colunas — nunca usuarios_rh.*, nunca e-mail, nunca o id do '
  'alterador. Guard NULL-SAFE por IS DISTINCT FROM: recusa com 42501 tanto o papel errado quanto '
  'o chamador SEM claim nenhuma — DEFINER bypassa RLS, entao este guard e o unico controle. '
  'REVOKE ALL de PUBLIC/anon/authenticated e so entao GRANT EXECUTE a authenticated.';


-- ---------------------------------------------------------------------------
-- 6 · public.salvar_janela_retencao — a escrita AUDITADA na mesma transação
-- ---------------------------------------------------------------------------
-- Molde: `gerir_usuario_rh_mutacao` (`20260713000003:119-132`) — mutação e
-- `log_auditoria` no MESMO corpo, portanto na MESMA transação: as duas commitam ou
-- revertem juntas. Não existe estado em que a janela mudou e a trilha não registrou.
CREATE OR REPLACE FUNCTION public.salvar_janela_retencao(
  p_etapa public.etapa_processo,
  p_meses integer
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_antes integer;
  antes   jsonb;
  depois  jsonb;
BEGIN
  -- (1) GUARD DE PAPEL, NULL-SAFE. `IS DISTINCT FROM`, NUNCA `NOT IN`.
  --
  -- ⚠ O idioma difundido neste repositório — `IF v_role NOT IN ('rh','administrador')`
  -- — é NULL-CEGO: com `v_role` NULL (chamador sem JWT), a expressão avalia NULL, um
  -- `IF` NULL **não é tomado**, e o guard FALHA ABERTO. Ele só recusa claim
  -- presente-e-errada; claim AUSENTE passa direto. Em SECURITY DEFINER isso é grave
  -- porque DEFINER bypassa RLS e o guard do corpo é o único controle que existe.
  -- Não é hipótese: é defeito REAL medido na 42-06 e catalogado em
  -- `.planning/todos/pending/42-anon-execute-definer-sistemico.md` (61 funções
  -- DEFINER com EXECUTE para `anon`, 39 chamáveis via PostgREST).
  -- `IS DISTINCT FROM` é NULL-safe por definição: NULL É distinto de 'administrador',
  -- então o `IF` é tomado e o chamador sem claim é RECUSADO. A asserção (f) do smoke
  -- prova isso por execução.
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode alterar a janela de retencao'
      USING ERRCODE = '42501';
  END IF;

  -- (2) O ATOR É RESOLVIDO NO SERVIDOR, nunca recebido por parâmetro — um `p_actor`
  -- vindo do cliente seria a autoria da trilha de auditoria escolhida por quem está
  -- sendo auditado. Uma claim de administrador SEM linha viva de RH não é um
  -- operador deste sistema (conta desativada ou soft-deleted que ainda carrega a
  -- claim no JWT até o refresh), e o `alterado_por` da matriz é FK para usuarios_rh.
  SELECT u.id INTO v_actor
    FROM public.usuarios_rh u
   WHERE u.user_id = (select auth.uid())
     AND u.ativo
     AND u.deleted_at IS NULL;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: nenhuma conta de RH viva corresponde ao chamador'
      USING ERRCODE = '42501';
  END IF;

  -- (3) O TETO É IMPOSTO NO SERVIDOR. O cap do input na tela é COSMÉTICO; quem
  -- impede de verdade é aqui (mesmo modelo mental do guard REVISAO-05 / D-13). O
  -- `CHECK` da tabela é a segunda camada e daria 23514 — esta dá 22023 com mensagem
  -- que nomeia o teto e sua origem. `p_meses IS NULL` entra no mesmo ramo de
  -- propósito: a comparação `NULL < 1` avaliaria NULL e cairia para o CHECK.
  IF p_meses IS NULL OR p_meses < 1 OR p_meses > 24 THEN
    RAISE EXCEPTION 'VALIDATION: janela de % meses fora do intervalo permitido (1 a 24); 24 e o teto ja consentido pela copy do cadastro', coalesce(p_meses::text, 'NULL')
      USING ERRCODE = '22023';
  END IF;

  -- (4) Estado anterior + LOCK da linha, para que o snapshot da auditoria seja
  -- consistente com a mutação abaixo e alterações concorrentes serializem na linha.
  SELECT to_jsonb(c), c.janela_meses INTO antes, v_antes
    FROM public.config_retencao_etapa c
   WHERE c.etapa = p_etapa
   FOR UPDATE;

  IF antes IS NULL THEN
    RAISE EXCEPTION 'VALIDATION: etapa % nao existe na matriz de retencao', p_etapa
      USING ERRCODE = '22023';
  END IF;

  -- (5) NO-OP É RECUSA, não sucesso silencioso. Salvar sem mudança escreveria uma
  -- linha de auditoria que afirma uma alteração que não houve — poluir a trilha
  -- probatória é o oposto do que o RETEN-02 pede dela. A UI-SPEC já desabilita o CTA
  -- nesse caso, e o servidor tem de ter o GÊMEO do que a tela promete: uma regra que
  -- só vive na tela é uma regra que não existe.
  IF v_antes = p_meses THEN
    RAISE EXCEPTION 'VALIDATION: a janela de % ja e de % meses — nada a alterar', p_etapa, p_meses
      USING ERRCODE = '22023';
  END IF;

  -- (6) A mutação. `origem` passa a 'admin': o valor deixa de ser "ninguém
  -- contestou" e passa a ser "alguém escolheu" — é esse discriminador que a Phase 46
  -- tem de consultar antes de ligar a purga. O trigger carimba `atualizado_em`.
  UPDATE public.config_retencao_etapa c
     SET janela_meses = p_meses,
         origem       = 'admin',
         alterado_por = v_actor
   WHERE c.etapa = p_etapa;

  SELECT to_jsonb(c) INTO depois
    FROM public.config_retencao_etapa c
   WHERE c.etapa = p_etapa;

  -- (7) A LINHA DE AUDITORIA, NA MESMA TRANSAÇÃO. Este `PERFORM` é o que torna
  -- VERDADEIRA a frase do diálogo "A alteração fica registrada na trilha de
  -- auditoria" — sem ele a copy seria mais uma promessa órfã. `log_auditoria` é
  -- SECURITY DEFINER com owner BYPASSRLS, então a linha sobrevive ao REVOKE de
  -- INSERT que a P28 aplicou sobre logs_auditoria. Os valores 'configuracao' e
  -- 'aviso' foram MEDIDOS contra os enums vivos `categoria_log_auditoria` e
  -- `severidade_log` (database.types.ts:5265-5275 e :5318) — não são valores novos.
  PERFORM public.log_auditoria(
    p_usuario_id   := v_actor,
    p_usuario_tipo := 'admin',
    p_acao         := 'alterar_janela_retencao',
    p_categoria    := 'configuracao',
    p_descricao    := format('Janela de retencao da etapa %s alterada de %s para %s meses', p_etapa, v_antes, p_meses),
    p_severidade   := 'aviso',
    p_recurso_tipo := 'config_retencao_etapa',
    p_recurso_id   := NULL::uuid,
    p_dados_antes  := antes,
    p_dados_depois := depois,
    p_sucesso      := true
  );
END;
$$;

COMMENT ON FUNCTION public.salvar_janela_retencao(public.etapa_processo, integer) IS
  'Phase 43 / RETEN-02: UNICO caminho de aplicacao para alterar a janela de retencao de uma etapa. '
  'SECURITY DEFINER + VOLATILE com search_path vazio. E RPC e NAO policy de UPDATE porque uma '
  'policy nao da nenhuma das duas coisas que o requirement exige junto com a escrita: trilha de '
  'auditoria ATOMICA (o PERFORM log_auditoria roda no mesmo corpo, logo na mesma transacao — a '
  'mudanca e o registro commitam ou revertem juntos) e guard SERVER-SIDE sobre o teto de 24 meses '
  '(o cap da tela e cosmetico). Ordem do corpo e SQLSTATE de cada recusa: '
  '42501 se o papel nao for administrador — guard NULL-SAFE por IS DISTINCT FROM, que recusa '
  'TAMBEM o chamador sem claim nenhuma (o idioma NOT IN falha ABERTO com claim NULL, defeito real '
  'medido na 42-06); 42501 se nenhuma linha VIVA de usuarios_rh corresponder a auth.uid() — o ator '
  'e resolvido no servidor, nunca recebido por parametro; 22023 se p_meses for NULL ou estiver '
  'fora de 1..24; 22023 se a etapa nao existir na matriz; 22023 em NO-OP (salvar sem mudanca '
  'escreveria linha de auditoria de uma alteracao que nao houve). Marca origem=admin e '
  'alterado_por; o trigger carimba atualizado_em. categoria=configuracao e severidade=aviso sao '
  'valores medidos dos enums vivos. REVOKE ALL de PUBLIC/anon/authenticated e so entao GRANT '
  'EXECUTE a authenticated.';


-- ---------------------------------------------------------------------------
-- 7 · Hardening de EXECUTE — `anon` revogado NOMINALMENTE
-- ---------------------------------------------------------------------------
-- ⚠ `REVOKE ALL ON FUNCTION … FROM PUBLIC` SOZINHO **NÃO BASTA**, e este é o defeito
-- sistêmico mais difundido do repositório. O `pg_default_acl` do schema `public`
-- concede EXECUTE a `anon` em TODO `CREATE FUNCTION`, como grant DIRETO e NOMEADO.
-- O idioma usado em quase toda migration daqui remove um grant de `PUBLIC` que nunca
-- existiu — e deixa `anon=X` de pé. Medição de 2026-07-30: **61** funções DEFINER em
-- `public` com EXECUTE para `anon`, **39** delas chamáveis via PostgREST; apenas 2
-- migrations em toda a história revogam de `anon` nominalmente
-- (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
--
-- Por isso `anon` aparece EXPLICITAMENTE na lista abaixo. A asserção (h) do smoke
-- verifica o `proacl` das duas funções para que a regressão reprove alto.
REVOKE ALL ON FUNCTION public.listar_matriz_retencao()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.salvar_janela_retencao(public.etapa_processo, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.listar_matriz_retencao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_janela_retencao(public.etapa_processo, integer) TO authenticated;
