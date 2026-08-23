-- =============================================================================
-- Vaga: `secoes_extras` (exibição flexível) + `rubrica_ia` (avaliação deliberada)
-- =============================================================================
-- Aprovado pelo operador em 2026-08-23. Decisão registrada em
-- `.planning/DECISAO-campos-vaga-e-rubrica-ia.md`.
--
-- ADITIVA E REVERSÍVEL: duas colunas anuláveis, nenhum dado tocado, nenhum
-- comportamento existente alterado. Desfazer é `ALTER TABLE ... DROP COLUMN`.
--
-- -----------------------------------------------------------------------------
-- POR QUE `secoes_extras` É UM JSONB E NÃO SETE COLUNAS
-- -----------------------------------------------------------------------------
-- Ao transcrever os dois primeiros descritivos reais (SDR e Social Media), SETE
-- seções não couberam em campo nenhum e tiveram de ser espremidas onde não são:
-- indicadores de desempenho dentro de `perfil_ideal`, rotina dentro de
-- `responsabilidades`, plano de carreira dentro de `diferenciais`, remuneração
-- dentro de `beneficios`, ferramentas dentro de `requisitos_tecnicos` — e duas
-- («O que essa vaga NÃO é», «Processo seletivo») sem lugar algum.
--
-- Sete colunas novas resolveriam ESSES sete casos. O argumento contra é empírico:
-- o problema apareceu DUAS VEZES nos DOIS únicos descritivos que existem. A oitava
-- seção virá, e uma coluna fixa por seção é a fotografia que o `CLAUDE.md` manda
-- evitar — envelhece e obriga migration por descritivo.
--
-- Forma: lista ORDENADA de `{titulo, conteudo}`. A ordem é do array, e não de uma
-- coluna `ordem` que pode divergir dela.
--
-- -----------------------------------------------------------------------------
-- POR QUE `rubrica_ia` É SEPARADA DA CÓPIA DE DIVULGAÇÃO
-- -----------------------------------------------------------------------------
-- O texto que ATRAI candidato e o texto que AVALIA candidato têm propósitos
-- opostos, e não devem ser o mesmo texto.
--
-- A cópia de divulgação vende a vaga: fala de trilha de carreira, de acesso ao
-- especialista, de Gympass. Uma rubrica de avaliação existe para discriminar COM
-- JUSTIÇA — o que conta como evidência de que a pessoa faz o trabalho.
--
-- Alimentar a IA com a cópia de marketing enfia na avaliação sinais que ninguém
-- decidiu que pesariam («operação enxuta», «ambição saudável», «desenvoltura com
-- pessoas»), e é por aí que viés entra sem passar por decisão de ninguém.
--
-- Separada, a rubrica é DELIBERADA (alguém escreveu o que conta), AUDITÁVEL (dá
-- para ler e discutir se é justa, sem garimpar num texto de venda) e VERSIONÁVEL
-- (muda sem mexer no que o candidato lê). E conversa com a RNF-07a deste projeto
-- — «o sistema NUNCA rejeita candidato automaticamente por score»: se o score
-- nunca decide sozinho, a rubrica que o gera precisa ser legível por humano.
--
-- ⚠ NULL é estado legítimo e informativo: significa «esta vaga ainda não tem
-- rubrica escrita». A Edge Function `analise-candidato-individual` marca o flag
-- `vaga_sem_rubrica_deliberada` e cai no fallback dos campos de exibição — o que
-- é pior que uma rubrica, e melhor que o vazio que rodou até 2026-08-23.
-- =============================================================================

ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS secoes_extras jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rubrica_ia    text;

-- A forma do jsonb é imposta aqui, e não só na aplicação: um array de objetos com
-- `titulo` e `conteudo` textuais e não vazios. Sem isto, a primeira gravação
-- errada só apareceria na tela do candidato.
ALTER TABLE public.vagas
  DROP CONSTRAINT IF EXISTS vagas_secoes_extras_forma_check;

-- ⚠ `jsonb_path_exists`, e NÃO `NOT EXISTS (SELECT ...)`: Postgres recusa subquery
--   em CHECK constraint (`0A000: cannot use subquery in check constraint`). O
--   jsonpath é expressão ESCALAR e imutável, então é aceito — e diz a mesma coisa.
--
-- ⚠ As duas cláusulas são necessárias e não se cobrem. A primeira pega elemento que
--   NÃO É objeto: num elemento escalar, `@.titulo` simplesmente não existe, então o
--   predicado da segunda nunca casaria e um `["texto solto"]` passaria batido.
ALTER TABLE public.vagas
  ADD CONSTRAINT vagas_secoes_extras_forma_check CHECK (
    jsonb_typeof(secoes_extras) = 'array'
    AND NOT jsonb_path_exists(secoes_extras, '$[*] ? (@.type() != "object")')
    AND NOT jsonb_path_exists(
          secoes_extras,
          '$[*] ? (@.titulo.type() != "string" || @.conteudo.type() != "string" || @.titulo == "" || @.conteudo == "")'
        )
  );

COMMENT ON COLUMN public.vagas.secoes_extras IS
  'Seções livres do descritivo, em ORDEM: [{"titulo","conteudo"}]. Conteúdo usa as marcas do TextoRico (### / - / 1. / **negrito** / *italico*). Existe porque descritivo real tem seção que coluna fixa não prevê — sete não couberam nos dois primeiros PDFs. Forma imposta por CHECK, não só pela aplicação.';

COMMENT ON COLUMN public.vagas.rubrica_ia IS
  'O que a IA lê para AVALIAR — deliberadamente separado da cópia que ATRAI. Cópia de divulgação vende a vaga; rubrica discrimina com justiça. Misturar as duas enfia na avaliação sinais que ninguém decidiu que pesariam, e e por ai que vies entra sem decisao. NULL = vaga sem rubrica escrita: a EF marca flag `vaga_sem_rubrica_deliberada` e cai no fallback dos campos de exibicao. Alinhado a RNF-07a: se o score nunca rejeita sozinho, a rubrica que o gera tem de ser legivel por humano.';
