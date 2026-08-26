-- =============================================================================
-- Migration: check_como_conheceu passa a aceitar o que o formulario oferece
-- Date: 2026-08-26
-- =============================================================================
--
-- ⛔ O DEFEITO, medido em PROD em 2026-08-25 durante um teste E2E do cadastro.
-- QUATRO das nove opcoes do campo "Como conheceu a vaga?" IMPEDIAM o cadastro:
--
--   formulario oferece        CHECK aceitava
--   ------------------------  --------------------------------------------
--   instagram facebook        instagram facebook linkedin indicacao google
--   linkedin indicacao google  ✅ (os cinco coincidiam)
--   catho vagas_com solides   ❌ nao existiam no CHECK
--   outros                    ❌ o CHECK tinha `outro`, no SINGULAR
--   —                         `site`, que o formulario nao oferece
--
-- O caminho da falha e o que a torna traicoeira: o Zod do front valida contra a
-- PROPRIA lista (candidatoSchema.ts), entao a tela aprova; a Edge Function aceita
-- `z.string()` (_shared/schemas.ts) e repassa sem olhar; o INSERT morre no banco.
-- O candidato le "Nao foi possivel registrar o candidato." e nao tem como saber
-- que o problema foi ter escolhido "Outros". Diferenca de UMA LETRA.
--
-- ⚠ TRES LISTAS PARA O MESMO FATO, e nenhuma sabia das outras. Esta migration
-- alarga o CHECK; o commit que a acompanha corrige `outros`->`outro` no front e
-- acrescenta um teste que compara as duas listas, para elas nao divergirem de
-- novo em silencio.
--
-- DECISAO DE PRODUTO embutida: os portais de emprego (Catho, Vagas.com, Solides)
-- PERMANECEM como opcao — sao origem real de candidato e a clinica pode querer
-- rastrear. O caminho oposto (remove-los do front) descartaria esse dado.
--
-- `site` fica no CHECK mesmo sem estar no formulario: e valor legado, nao custa
-- nada manter, e remove-lo poderia invalidar dado antigo.
--
-- ADITIVO E SEGURO: um CHECK que ACEITA MAIS nunca invalida linha existente.
-- Conferido antes de emitir — os valores em uso sao instagram (17), google (1),
-- indicacao (1) e NULL (13), todos aceitos pelo CHECK novo. NULL passa em CHECK
-- por definicao (avalia para unknown, que nao reprova).
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $cc$
DECLARE
  v_invalidos int;
BEGIN
  -- Portao 1: nenhum valor EXISTENTE pode ficar de fora da lista nova. Um CHECK
  -- que reprova dado ja gravado nao consegue nem ser criado (o ALTER valida a
  -- tabela inteira), mas falhar aqui da uma mensagem util em vez de um 23514 cru.
  SELECT count(*) INTO v_invalidos
    FROM public.candidatos
   WHERE como_conheceu IS NOT NULL
     AND como_conheceu NOT IN ('linkedin','instagram','indicacao','site','google',
                               'facebook','outro','catho','vagas_com','solides');
  IF v_invalidos > 0 THEN
    RAISE EXCEPTION 'ha % candidato(s) com como_conheceu fora da lista nova — alargue a lista antes', v_invalidos;
  END IF;

  ALTER TABLE public.candidatos DROP CONSTRAINT IF EXISTS check_como_conheceu;

  ALTER TABLE public.candidatos ADD CONSTRAINT check_como_conheceu
    CHECK (como_conheceu IS NULL OR (como_conheceu)::text = ANY (ARRAY[
      'linkedin','instagram','indicacao','site','google','facebook','outro',
      'catho','vagas_com','solides'
    ]::text[]));

  RAISE NOTICE 'check_como_conheceu alargado: 7 -> 10 valores aceitos';
END
$cc$;

COMMENT ON CONSTRAINT check_como_conheceu ON public.candidatos IS
  'Origem declarada do candidato. A lista TEM de bater com comoConheceuSchema em '
  'src/features/cadastro/schemas/candidatoSchema.ts — divergir quebra o cadastro no '
  'INSERT, depois de o front ter aprovado. Ha teste que compara as duas.';
