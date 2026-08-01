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
