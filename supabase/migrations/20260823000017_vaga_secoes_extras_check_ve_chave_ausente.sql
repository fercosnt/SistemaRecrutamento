-- =============================================================================
-- `vagas_secoes_extras_forma_check` passa a enxergar CHAVE AUSENTE
-- =============================================================================
-- Migration NOVA porque a `20260823000016` já está aplicada e seus bytes estão
-- pinados por `md5(statements[1])` no ledger — editá-la no lugar quebraria a
-- própria prova.
--
-- -----------------------------------------------------------------------------
-- O BURACO, E COMO ELE APARECEU
-- -----------------------------------------------------------------------------
-- O CHECK da `…0016` foi provado por execução logo após o apply, com cinco casos.
-- O caso (b) — `[{"titulo":"X"}]`, objeto SEM a chave `conteudo` — **passou**.
--
-- Causa: em jsonpath modo lax, acessar um membro inexistente não produz resultado
-- nenhum. Então o predicado `@.conteudo.type() != "string"` simplesmente NÃO CASA
-- quando `conteudo` está ausente — ele só sabe julgar o valor que existe, nunca a
-- ausência dele.
--
-- É a classe de defeito que o `CLAUDE.md` chama de asserção vácua, e a mesma que
-- já custou à Phase 45 cinco portões medindo nada (`to_regproc` devolvendo NULL
-- sempre) e à Phase 43 o ramo `NOT v_exige_auth AND v_auth` inalcançável.
--
-- ⚠ A lição de processo: o portão foi provado por execução — e foi ISSO que o
--   pegou, 30 segundos depois do apply. Uma revisão por leitura teria aprovado o
--   predicado, porque ele PARECE completo. `exists()` é a diferença entre julgar
--   um valor e julgar a presença dele, e não se vê olhando.
--
-- Conserto: exigir explicitamente que as duas chaves EXISTAM, além de serem
-- strings não vazias.
-- =============================================================================

ALTER TABLE public.vagas
  DROP CONSTRAINT IF EXISTS vagas_secoes_extras_forma_check;

ALTER TABLE public.vagas
  ADD CONSTRAINT vagas_secoes_extras_forma_check CHECK (
    jsonb_typeof(secoes_extras) = 'array'
    -- elemento que não é objeto: `["texto solto"]`
    AND NOT jsonb_path_exists(secoes_extras, '$[*] ? (@.type() != "object")')
    -- chave AUSENTE: `[{"titulo":"X"}]` — o que a …0016 deixava passar
    AND NOT jsonb_path_exists(
          secoes_extras,
          '$[*] ? (!exists(@.titulo) || !exists(@.conteudo))'
        )
    -- chave presente porém do tipo errado ou vazia
    AND NOT jsonb_path_exists(
          secoes_extras,
          '$[*] ? (@.titulo.type() != "string" || @.conteudo.type() != "string" || @.titulo == "" || @.conteudo == "")'
        )
  );

COMMENT ON CONSTRAINT vagas_secoes_extras_forma_check ON public.vagas IS
  'Forma de `secoes_extras`: array de {titulo, conteudo} strings não vazias. As TRÊS cláusulas são necessárias e nenhuma cobre a outra — a de tipo não vê elemento não-objeto, e a de valor não vê chave AUSENTE (jsonpath lax não casa membro inexistente). A cláusula `exists()` foi acrescentada pela …0017 depois de o caso `[{"titulo":"X"}]` passar num teste de execução do CHECK da …0016.';
