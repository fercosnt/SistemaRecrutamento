---
phase: 49-consertos-da-jornada-bloco-2
plan: 10
subsystem: database
tags: [postgres, supabase, rpc, security-definer, edge-function, deno, lgpd, ai-provenance, migrations, p46apply, efdeploy]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "as 7 colunas novas de `entrevista_analises` (`tipo`, `solicitado_por`, `texto_hash`, `ai_call_log_id`, `superada_em`, `provedor_ia`, `modelo_ia`) e o predicado ÚNICO `public.entrevista_analise_vigente(timestamptz,text,jsonb)` IMMUTABLE, que as TRÊS RPCs deste plano CHAMAM em vez de recopiar"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`inputHashDe` reexportado pelo `_shared/ai-client.ts` (o MESMO cálculo de `ai_call_logs.input_hash`) e os campos `log_id`/`model` do `CallAiResult` — sem eles a EF não teria de onde gravar o elo com o texto nem o modelo REAL"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "06"
    provides: "`avancar_etapa` já olhando SÓ a análise vigente — é o que torna a recusa de `confirmar_revisao_entrevista` numa superada um conserto e não uma regressão"
  - phase: 46-purga-e-guardas
    provides: "`p46apply.cjs` — SQL lido do ARQUIVO, migration + ledger na mesma transação, md5 conferido por leitura de volta; e `efdeploy.cjs` com o mesmo princípio para o bundle da EF"
provides:
  - "`public.registrar_analise_entrevista(...)` SECURITY DEFINER, só `service_role` — o ÚNICO escritor de `entrevista_analises` a partir da EF: lock por `(candidatura, tipo)`, reaproveitamento por `texto_hash` (D-40), superação por MARCA e upsert que devolve a nota a `pendente_humano` com `score` NULL (D-42/D-65)"
  - "`salvar_avaliacao_entrevista` e `confirmar_revisao_entrevista` escolhendo/exigindo a análise VIGENTE pelo predicado único, com guard de papel fail-closed — ASSINATURAS inalteradas, o front não muda"
  - "`anon` sem EXECUTE nas duas RPCs de revisão (era `true` nas duas, por grant DIRETO do `pg_default_acl`)"
  - "`avaliar-transcricao-entrevista` v17 em PROD: grava só pela RPC, com tipo/autor/hash/vínculo/provedor/modelo, com TODA escrita de erro checado, com o D-40 conferido ANTES da IA e com a rubrica BARS do guia DO TIPO da análise"
  - "`AvaliarTranscricaoBodySchema.tipo` opcional (`z.enum(['online','presencial'])`) no `.strict()` — a EF sai ANTES do front (D-55)"
  - "`supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts` — 18 casos do handler onde não havia NENHUM teste"
  - "`supabase/tests/p49_analise_vigente_smoke.sql` — 9 asserções provadas por execução em PROD e provadas MORDENTES por OITO mutações, uma por cláusula"
affects: [49-11, 49-12, 49-16, 49-18, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 31724
  tasks: 2
  commits: 3
  plan_head_before: 3e5ea7e5c008f4ac0b9a2e205652b38b3e9280ed
  # `commits: 3` = MEDIDO por `git rev-list --count 3e5ea7e5..HEAD` no instante em que este
  # SUMMARY foi escrito (0d9a46db, 6f79c4f4, 03359f9e), não narrado. Re-medir DEPOIS deste
  # ponto dá um número MAIOR e isso não é divergência: o commit de metadado do próprio plano
  # entra no mesmo intervalo por construção, porque o `plan_head_before` é anterior a ele.
  # `tokens: 31724` = (115508 octetos dos 4 arquivos novos + 11387 octetos das linhas `+`
  # dos 2 modificados) ÷ 4. A estimativa era 115000; o realizado é 0,28×. Registrado como
  # medido, não ajustado para parecer perto. A razão é a mesma dos irmãos 49-06 (0,25×) e
  # 49-07 (0,24×), e vale a pena nomeá-la porque já é a terceira medição do mesmo viés
  # nesta fase: o orçamento foi dimensionado pelo TRABALHO (ler 3 corpos vivos, medir PROD,
  # desenhar a superação, 8 mutações), e o `actuals` mede o ARTEFATO. Os dois não são a
  # mesma grandeza, e o artefato é pequeno justamente quando a decisão difícil caiu bem.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RPC como único escritor de uma tabela de resultado: quando três escritas só fazem sentido juntas (marcar a anterior, inserir a nova, rebaixar a nota consolidada), elas viram UMA função e a EF perde o direito de escrever direto"
    - "`pg_advisory_xact_lock(hashtext('<dominio>:' || id || ':' || coalesce(chave,'')))` como serializador por entidade lógica quando o índice único que expressaria o invariante ainda não pode nascer (linhas antigas o violam)"
    - "`tipo IS NOT DISTINCT FROM p_tipo` em vez de `=` para que NULL seja um GRUPO próprio: as linhas antigas, de tipo desconhecido, não são superadas por nenhum tipo novo — o oposto de inventar um fato sobre elas"
    - "normalizar o espaço (`regexp_replace(def,'\\s+',' ','g')`) antes de assertar sobre a FORMA do comando instalado: alinhamento de coluna no fonte não é parte da forma, e uma asserção sensível a ele reprova uma reindentação"
    - "montar por FRAGMENTOS a expressão que um portão estático procura no disco, quando se precisa conferir a AUSÊNCIA dela no catálogo (`'IF ' || 'v_role' || ' NOT IN'`) — o idioma que o disclaimer LGPD-04 do rodapé já usa neste repositório"
    - "capturar o SQLSTATE de TODA chamada de RPC num smoke de julgamento diferido, INCLUSIVE as que devem passar: uma que estoura no meio aborta a subtransação antes de qualquer julgamento e o diagnóstico aponta para o lugar errado"
    - "normalizar o vocabulário de um CHECK no lado do chamador (`provedorDeResultado`): `provider='none'` é estado de CHAMADA e não de RESULTADO, e com o erro agora checado um CHECK violado viraria 500 em vez de linha"

key-files:
  created:
    - supabase/migrations/20260922000007_p49_analise_entrevista_vigente.sql
    - supabase/migrations/20260922000008_p49_revisao_entrevista_vigente.sql
    - supabase/tests/p49_analise_vigente_smoke.sql
    - supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts
  modified:
    - supabase/functions/avaliar-transcricao-entrevista/index.ts
    - supabase/functions/_shared/entrevista-schemas.ts

key-decisions:
  - "As três RPCs CHAMAM `entrevista_analise_vigente(...)` do 49-01 — nenhuma recopia o predicado. A lacuna do JORN-12 é literalmente quatro leitores com quatro cópias divergindo em silêncio; uma quinta cópia consertaria o sintoma e reabriria a causa. Os dois pós-portões cobram a chamada por `position('entrevista_analise_vigente(' IN pg_get_functiondef(...))`"
  - "O reaproveitamento do D-40 é por QUALQUER análise de sucesso com o mesmo hash, não só pela vigente (desvio deliberado do RESEARCH §I.3, seguindo o CONTEXT §specifics do operador). Consequência registrada e provada na asserção (c): reenviar A não torna A vigente de novo — o RH não pediu para voltar atrás, pediu para analisar um texto, e esse texto já foi analisado"
  - "`p_provedor_ia` passa por `provedorDeResultado()` no lado da EF. `CallAiResult.provider` também vale `'none'` (teto de custo, injeção), e o CHECK `entrevista_analises_provedor_ia_check` só aceita anthropic/openai/NULL: sem a normalização o caminho de FALHA violaria o CHECK e — agora que o erro é checado — devolveria 500 em vez de gravar a linha. A never-absent seria desfeita pelo próprio conserto que a tornou honesta"
  - "O portão da `…000007` assere a AUSÊNCIA de qualquer comando de remoção em TODO o corpo (`position('DELETE' IN upper(v_norm)) > 0`), e não «não remove desta tabela». É mais forte e — de propósito — não escreve a forma que o portão estático do plano procura no disco deste mesmo arquivo (§K do PATTERNS)"
  - "A contagem viva de `entrevista_analises` vai para o `RAISE NOTICE` do portão, NUNCA comparada com constante. Um `IS DISTINCT FROM 6` ali reprovaria trabalho correto no dia em que a 7ª análise nascer — a forma «fotografia» que o CLAUDE.md §«Portões» nomeia. O que é invariante é o ZERO de superadas, e ESSE é asserido"
  - "`check_violation` (23514) na recusa da análise superada, não `no_data_found`: a análise EXISTE e foi encontrada, ela só não é a que vale. Registrado no cabeçalho que o `mapRpcError` do front ainda traduz 23514 como «Dados inválidos. Verifique os campos.», que não é a frase certa — a mensagem específica é da tela do 49-16"
  - "`salvar_avaliacao_entrevista` NÃO ganhou `p_analise_id`. Foi considerado e descartado: com UMA linha de nota para os dois tipos (D-65) a revisão vai para a vigente mais recente, e a tela do 49-16 só oferece revisar essa — o parâmetro acoplaria front e RPC para expressar uma escolha que a tela não oferece"
  - "OITO mutações, não as duas que o plano pedia. A lição do 49-06/49-07 é que um smoke é fail-fast e uma mutação combinada deixa as demais cláusulas apenas PARECENDO provadas; aqui cada cláusula ganhou a sua inversão exata — e foram as duas mutações EXTRA (M3, M4) que acharam o defeito de diagnóstico do smoke"
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Não registrado como desvio"

patterns-established:
  - "Uma mutação por CLÁUSULA, e conferir que ela reprova a cláusula NOMEADA — não só que o smoke fica vermelho. Um smoke vermelho pelo motivo certo apontando para o lugar errado é um portão que passa a mentir na próxima vez que reprovar de verdade, e foi exatamente o que M3 e M4 revelaram aqui"
  - "Em smoke de julgamento diferido, TODA chamada de RPC vai no seu próprio bloco de exceção — inclusive as que DEVEM passar. O julgamento fora da subtransação existe para os valores medidos sobreviverem ao rollback; ele só funciona se a execução chegar ao fim"
  - "`set_config(..., is_local=false)` feito DENTRO da subtransação que reverte é revertido junto com ela. A variável PL/pgSQL sobrevive; a GUC não — então a passagem de estado para as asserções de resíduo acontece DEPOIS do handler"
  - "Quando o `key_links` de um plano declara um elo por PADRÃO, o código tem de casar o padrão. Consertar o código (a chamada numa linha) e não o padrão: afrouxar o padrão para aceitar a quebra de linha tira dele a capacidade de detectar a ausência REAL do elo"

requirements-completed: [JORN-12, JORN-28]

coverage:
  - id: D1
    description: "Toda análise de entrevista NOVA sabe de qual entrevista é (`tipo`, escolhido pelo RH com a etapa atual como padrão), quem a pediu (`solicitado_por` = o RH do JWT), qual texto a gerou (`texto_hash` = o MESMO valor de `ai_call_logs.input_hash`, mais `ai_call_log_id`) e qual modelo a produziu (`provedor_ia`/`modelo_ia` REAIS, não o alias configurado) — sem nenhuma coluna de conteúdo nova"
    requirement: JORN-28
    verification:
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#tipo='online' + texto novo ⇒ UMA chamada de IA e a RPC com tipo/autor/hash/vínculo/modelo — assere `p_modelo_ia` = `claude-sonnet-4-6-20260215` (o que respondeu) e NÃO `claude-sonnet-4-6` (o configurado em `PROMPT_ROW_FIXTURE.model_id`)"
        status: pass
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#p_texto_hash é o MESMO valor que inputHashDe dá para a transcrição (D-38)"
        status: pass
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#sem tipo no body, candidatura em entrevista_presencial ⇒ p_tipo='presencial' · #o body do RH vence a etapa · #sem tipo e fora de etapa de entrevista ⇒ 400 pedindo o tipo, SEM chamada de IA"
        status: pass
      - kind: other
        ref: "PROD: `information_schema.columns` de `entrevista_analises` — nenhuma coluna de conteúdo nova; o texto mascarado segue só em `ai_call_logs` (D-38 / JORN-12)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gravar é UMA transação numa RPC nova `public.registrar_analise_entrevista(...)`, SECURITY DEFINER e só `service_role`: marca `superada_em = now()` nas vigentes do mesmo `(candidatura_id, tipo)`, insere a nova e faz o upsert de `scores_candidato` `tipo='entrevista'` com `status='pendente_humano'` e `score` NULL. Um `pg_advisory_xact_lock` por `(candidatura, tipo)` impede duas vigentes por corrida"
    requirement: JORN-12
    verification:
      - kind: integration
        ref: "supabase/tests/p49_analise_vigente_smoke.sql#(a) 1 análise vigente · #(b) A com `superada_em` preenchida, B única vigente, nota `pendente_humano`/`score` NULL, `superadas=1` e a contagem em 2 (marcar, não apagar)"
        status: pass
      - kind: integration
        ref: "mutação M1 (`registrar_analise_entrevista` SEM o UPDATE de superação, em requisição que aborta) ⇒ FAIL (b) «a RPC devolveu superadas=0 (esperado 1) — a vigente anterior nao foi marcada»"
        status: pass
      - kind: integration
        ref: "PROD: ACL da RPC — `has_function_privilege` anon=false, authenticated=false, service_role=true (T-49-10-01); o portão da própria migration aborta se não for"
        status: pass
      - kind: other
        ref: "PROD: `md5(prosrc)` de `registrar_analise_entrevista` = bd428e85c22af44d44c855460bcb3fd0 (5537 octetos), com `pg_advisory_xact_lock` e `entrevista_analise_vigente(` presentes na definição instalada"
        status: pass
    human_judgment: false
  - id: D3
    description: "Análise que falhou (parse nulo, injeção) entra com `status_analise='falhou'`, NUNCA é vigente pelo predicado único, e NÃO supera ninguém — a análise boa anterior continua vigente. Era assim que uma falha de IA virava «a mais nova» e escondia da tela a análise que tinha funcionado"
    requirement: JORN-12
    verification:
      - kind: integration
        ref: "supabase/tests/p49_analise_vigente_smoke.sql#(d) linha nova, `vigente=false`, `superadas=0`, vigente continua B"
        status: pass
      - kind: integration
        ref: "mutação M4 (a FALHA também supera) ⇒ FAIL (d) «a falha superou 1 analise(s) (esperado 0) — uma falha nao invalida a analise boa anterior»"
        status: pass
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#parse nulo ⇒ RPC com p_status_analise='falhou' e resposta falhou:true, vigente:false"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-40: reenviar um texto já analisado com sucesso na mesma `(candidatura, tipo)` NÃO cria linha nem chama a IA — devolve a análise existente com `reaproveitada: true`. A, B, A ⇒ 2 análises e a vigente é a B. A EF confere o hash ANTES da chamada; a RPC confere de novo (corrida)"
    requirement: JORN-28
    verification:
      - kind: integration
        ref: "supabase/tests/p49_analise_vigente_smoke.sql#(c) `reaproveitada=true` com o id de A, contagem continua 2, vigente continua B"
        status: pass
      - kind: integration
        ref: "mutação M3 (reaproveitamento DESLIGADO) ⇒ FAIL (c) «reenviar o texto A devia devolver reaproveitada=true (veio f)…»"
        status: pass
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#texto com hash já analisado ⇒ 0 IA, 0 RPC, reaproveitada:true · #a leitura é escopada por candidatura, tipo e hash, e exclui falhas · #texto DIFERENTE ⇒ chama a IA (o hash discrimina)"
        status: pass
    human_judgment: false
  - id: D5
    description: "D-42: a análise superada CONSERVA `scores_humanos`, `notas_humanas`, `revisada_por` e `revisao_confirmada_em` — a revisão anterior continua legível — enquanto a nota consolidada volta a aguardar revisão humana (`pendente_humano`, `score` NULL)"
    requirement: JORN-12
    verification:
      - kind: integration
        ref: "supabase/tests/p49_analise_vigente_smoke.sql#(f) B superada com as quatro colunas de revisão INTACTAS e a nota de volta a `pendente_humano`/NULL"
        status: pass
      - kind: integration
        ref: "mutação M5 (o upsert NÃO rebaixa a nota) ⇒ FAIL (f) «a nota consolidada ficou status=sucesso score=4.50 depois de uma analise NOVA»"
        status: pass
    human_judgment: false
  - id: D6
    description: "D-39 na revisão humana: `salvar_avaliacao_entrevista` grava na análise VIGENTE mais recente (não mais na mais recente de qualquer estado) e `confirmar_revisao_entrevista(p_analise_id)` recusa análise superada ou falha com mensagem própria. As duas trocam o guard de papel por fail-closed, mantendo `insufficient_privilege`. As ASSINATURAS não mudam"
    requirement: JORN-12
    verification:
      - kind: integration
        ref: "supabase/tests/p49_analise_vigente_smoke.sql#(e) `salvar_avaliacao_entrevista` grava em B (não na falha nem na superada); `confirmar_revisao_entrevista(A)` ⇒ 23514; `confirmar_revisao_entrevista(B)` ⇒ ok"
        status: pass
      - kind: integration
        ref: "mutação M2 (corpo ANTERIOR de `salvar_avaliacao_entrevista`) ⇒ FAIL (e) «gravou na analise <falha> e a VIGENTE e B»"
        status: pass
      - kind: integration
        ref: "mutação M7 (`confirmar_revisao_entrevista` SEM a recusa da não vigente) ⇒ FAIL (e) «na analise SUPERADA (A) devolveu «<aceitou>»…»"
        status: pass
      - kind: other
        ref: "PROD: as duas `::regprocedure` originais resolvem (assinaturas inalteradas); `md5(prosrc)` novos = 2b567aaa530fc32da4b074c7776d62ec (3748) e 43df21b884807c2f9ee57d45bdd70065 (2197); o pós-portão confere o upsert, a escala BARS e o guard de posse preservados"
        status: pass
    human_judgment: false
  - id: D7
    description: "O guard de papel das duas RPCs de revisão é fail-closed (`coalesce(v_role,'') NOT IN …`) e `anon` perdeu EXECUTE nas duas — ele o tinha por grant DIRETO do `pg_default_acl`, que `REVOKE … FROM PUBLIC` não alcança. Era a combinação que importava: quem chegava sem papel nenhum passava do guard"
    requirement: JORN-12
    verification:
      - kind: integration
        ref: "supabase/tests/p49_analise_vigente_smoke.sql#(h) sem claims ⇒ `salvar_avaliacao_entrevista` recusa com SQLSTATE 42501"
        status: pass
      - kind: integration
        ref: "mutação M8 (guard de volta à forma fail-OPEN) ⇒ FAIL (h) «devolveu «<aceitou>» e o esperado e SQLSTATE 42501»"
        status: pass
      - kind: other
        ref: "PROD, lido de volta depois das 8 mutações: `has_function_privilege('anon', …)` = false nas DUAS (era true nas duas em 2026-09-22); authenticated=true preservado; o pós-portão aborta se não for"
        status: pass
    human_judgment: false
  - id: D8
    description: "Todo INSERT/RPC da EF de transcrição checa erro — escrita falha devolve 500, nunca `{ ok: true }`. Os dois INSERTs diretos e o upsert direto de antes (`:266`, `:299`, `:309`) SAÍRAM: a RPC é o único escritor"
    requirement: JORN-28
    verification:
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#RPC devolvendo erro ⇒ 500, nunca { ok: true } · #no caminho de FALHA também ⇒ 500 · #erro na leitura de reaproveitamento ⇒ 500, e a IA não é chamada"
        status: pass
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts — o mock registra `escritasDiretas` e a asserção exige lista VAZIA: se a EF voltar a escrever direto em `entrevista_analises`/`scores_candidato`, o teste reprova"
        status: pass
      - kind: other
        ref: "varredura C6 #5 re-rodada: `grep -nE '\\.(insert|upsert|update|rpc)\\(' index.ts` — as 3 escritas sem erro checado (`:266,299,309`) não existem mais; as 2 chamadas de RPC e a leitura de reaproveitamento destruturam `{ data, error }`"
        status: pass
    human_judgment: false
  - id: D9
    description: "A rubrica BARS da análise vem só do guia DO TIPO da análise. A leitura não filtrava e juntava as âncoras dos DOIS guias — e como o `buildBarsRubricBlock` resolve competência repetida por «1ª ocorrência vence» ordenando por `created_at`, a análise da online podia ser avaliada contra a régua recalibrada da presencial"
    requirement: JORN-28
    verification:
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#os guias lidos são filtrados pelo tipo da análise — assere o filtro `tipo='online'` NA LEITURA e, no prompt ENVIADO ao modelo, a presença de «ANCORA DA ONLINE» e a AUSÊNCIA de «ANCORA DA PRESENCIAL»"
        status: pass
      - kind: other
        ref: "varredura C7 #5 re-rodada: a leitura de `entrevista_guias` agora tem `.eq(\"tipo\", tipo)`"
        status: pass
    human_judgment: false
  - id: D10
    description: "O body `.strict()` da EF aceita `tipo` OPCIONAL — a EF sai ANTES do front que manda o campo (D-55); sem `tipo` e fora de etapa de entrevista ⇒ 400 com mensagem que pede o tipo, sem chamada de IA"
    requirement: JORN-28
    verification:
      - kind: unit
        ref: "src/features/entrevista/__tests__/entrevista-contract.test.ts — 16/16 verdes sem UMA edição: o body vivo do front (`{candidatura_id, transcricao}`) continua parseando no schema `.strict()`"
        status: pass
      - kind: unit
        ref: "supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts#body com campo extra continua recusado (.strict) · #tipo fora do vocabulário ⇒ 400"
        status: pass
    human_judgment: false
  - id: D11
    description: "Deploy da EF por `efdeploy.cjs` com `--dry-run` antes e `verify_jwt=true`, depois das duas migrations conferidas no catálogo (Pitfall 8), com o marcador presente no bundle publicado"
    verification:
      - kind: other
        ref: "`efdeploy: OK · version=17 · status=ACTIVE · verify_jwt=true`; readback pela Management API confirma version=17/ACTIVE/verify_jwt=true; `grep -a -c registrar_analise_entrevista` no bundle publicado = 6"
        status: pass
      - kind: other
        ref: "`--dry-run` antes dos dois deploys: fechamento de 13 arquivos, `functions/_shared/entrevista-schemas.ts` incluído"
        status: pass
    human_judgment: false
  - id: D12
    description: "O `p49_analise_vigente_smoke.sql` prova em PROD, com as fixtures revertidas, as 9 asserções — e o portão MORDE, por OITO mutações, uma por cláusula"
    verification:
      - kind: integration
        ref: "`node p46apply.cjs run supabase/tests/p49_analise_vigente_smoke.sql` ⇒ `pass: 9, esperado: 9`; `n_ea` = 6 e `n_ea_superadas` = 0 antes e depois (nenhuma linha viva tocada)"
        status: pass
      - kind: integration
        ref: "8/8 mutações mordem, cada uma reprovando a cláusula NOMEADA (M1→b, M2→e, M3→c, M4→d, M5→f, M6→g, M7→e, M8→h); arnês `mut.cjs` no scratchpad, lendo o bloco `CREATE OR REPLACE` do ARQUIVO e abortando a requisição"
        status: pass
      - kind: integration
        ref: "ensaio antes do apply da 2ª migration: `ENSAIO_OK` com zero FAIL, e leitura de volta confirmando que NADA persistiu (md5 vivos ainda os antigos, ledger sem a `…000008`)"
        status: pass
    human_judgment: false
  - id: D13
    description: "D-37: só a análise da ENTREVISTA ganhou o append por etapa nesta fase; `analise_candidato_vaga` segue sobrescrita ao reprocessar"
    verification:
      - kind: other
        ref: "nenhum arquivo de `analise_candidato_vaga` tocado neste plano (`git diff --stat` do intervalo do plano lista só os 6 arquivos declarados)"
        status: pass
    human_judgment: false

# Metrics
duration: 18 min
completed: 2026-09-23
status: complete
---

# Phase 49 Plano 10: A análise de entrevista com dono, e um só leitor da vigente Summary

**`registrar_analise_entrevista` como único escritor de `entrevista_analises` (lock por `(candidatura, tipo)`, reaproveitamento por `texto_hash`, superação por marca, nota de volta a `pendente_humano`) + as duas RPCs de revisão passando a exigir a análise VIGENTE pelo predicado único do 49-01, com guard fail-closed e `anon` revogado — tudo aplicado em PROD por `p46apply.cjs` com md5 do ledger conferido, a EF v17 no ar com `verify_jwt=true`, e o portão novo provado mordente por OITO mutações, uma por cláusula.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-22T23:55:08-03:00 (1º commit de tarefa)
- **Completed:** 2026-09-23T00:12:54-03:00
- **Tasks:** 2 / 2
- **Files modified:** 6 (4 criados, 2 modificados)

## Accomplishments

- **Os leitores da análise de entrevista param de discordar.** Medido em PROD antes de escrever: 6 análises em 3 candidaturas, `tipo`/`texto_hash`/`ai_call_log_id`/`solicitado_por`/`provedor_ia`/`modelo_ia`/`superada_em` NULL em TODAS as seis — e 4 «vigentes» ao mesmo tempo em `bf26ee3c…`. A tela e a revisão pegavam a mais nova de qualquer estado, o portão de avanço olhava todas até o 49-06, e uma análise que falhava virava «a mais nova». Agora existe UMA vigente por `(candidatura, tipo)`, decidida pelo MESMO predicado para todos.

- **A análise nova tem dono.** `tipo` (o que o RH escolheu, com a etapa como padrão), `solicitado_por` (o RH do JWT), `texto_hash` + `ai_call_log_id` (qual texto a gerou — sem nenhuma coluna de conteúdo nova; o texto mascarado segue só em `ai_call_logs`) e `provedor_ia`/`modelo_ia` REAIS. O teste do handler fixa a parte que é fácil errar: o modelo gravado é `claude-sonnet-4-6-20260215` (quem respondeu), não `claude-sonnet-4-6` (o que está configurado) — foi confundindo os dois que o ranking do `gpt-4o-mini` de 20/09 passou por ranking do Sonnet.

- **Uma escrita, não três soltas.** Marcar a vigente anterior, inserir a nova e rebaixar a nota consolidada só fazem sentido juntas, então viraram UMA RPC `SECURITY DEFINER` que só `service_role` executa. Os dois INSERTs diretos e o upsert direto da EF saíram. E as três escritas que devolviam `{ok:true}` mesmo quando o banco recusava agora checam erro: recusa é 500.

- **Reenviar o mesmo texto não duplica nada (D-40).** Medido: 2 das 4 análises de `bf26ee3c…` são replays do mesmo texto — linhas que nunca deveriam ter nascido, cada uma com uma chamada de IA paga. A EF confere o hash ANTES da chamada e a RPC confere de novo (corrida). A, B, A ⇒ 2 análises, e a vigente continua a B.

- **A revisão humana anterior não é apagada nem passa a valer para outro texto.** Superar é MARCAR: a análise superada conserva `scores_humanos`, `notas_humanas`, `revisada_por` e `revisao_confirmada_em` (trilha de decisão automatizada, Art. 20), e a nota consolidada volta a `pendente_humano` com `score` NULL — porque a revisão que alguém fez não vale para um texto que ela nunca viu.

- **`confirmar_revisao_entrevista` deixa de liberar o avanço com base numa análise que não vale.** `revisao_confirmada_em` é o que o `avancar_etapa` lê para soltar a trava de língua/sotaque; desde o 49-06 ele só olha a vigente, então confirmar na superada não liberava nada e o RH ficava sem entender por que o avanço seguia travado. Pior: confirmar uma FALHA liberaria o avanço sem ninguém ter lido análise nenhuma. Agora é `check_violation` com mensagem própria.

- **`anon` perdeu EXECUTE nas duas RPCs de revisão.** Ele o tinha por grant DIRETO do `pg_default_acl` (medido `true` nas duas), e `REVOKE … FROM PUBLIC` não alcança um grant direto. Combinado com o guard fail-OPEN — `v_role` nulo faz `NOT IN` devolver NULL, o `IF` não dispara, e a função segue — quem chegasse sem papel nenhum passava. As duas metades foram fechadas na mesma entrega, porque cada uma sozinha deixa a outra de pé.

- **A rubrica BARS passa a ser a do tipo certo.** A leitura dos guias não filtrava por `tipo` e juntava os dois; como o `buildBarsRubricBlock` resolve competência repetida por «1ª ocorrência vence» ordenando por `created_at`, a análise da online podia ser avaliada contra a régua recalibrada da presencial. O teste assere a âncora que chegou ao PROMPT, não só o filtro na query.

- **Teste do handler onde não havia nenhum.** A EF está em PROD desde a Phase 14 e as únicas coberturas eram a derivação pura e o contrato de body. Os três defeitos consertados aqui viveram nesse vão. São 18 casos, sem rede.

## Task Commits

1. **Task 1 (tracer): a análise ganha dono — RPC com superação, EF com tipo/hash/vínculo/modelo, erro checado, deploy** — `0d9a46db` (feat)
2. **Task 2: a revisão humana só na vigente + o smoke de 9 asserções** — `6f79c4f4` (feat)
3. **Fecho do `key_links`: a chamada da RPC numa linha + redeploy** — `03359f9e` (style)

**Ledger de PROD:**

| version | name | md5 do arquivo | md5 do ledger | octetos |
|---|---|---|---|---|
| 20260922000007 | p49_analise_entrevista_vigente | `f36af3b4c23a702faee8243db62fba77` | `f36af3b4c23a702faee8243db62fba77` | 21290 |
| 20260922000008 | p49_revisao_entrevista_vigente | `030b753842c13caee01ee97bc0537377` | `030b753842c13caee01ee97bc0537377` | 24955 |

A `version` nasceu correta nas duas (nenhum reparo de ledger).

**md5 dos corpos, antes e depois:**

| função | md5 ANTES | md5 DEPOIS | octetos |
|---|---|---|---|
| `registrar_analise_entrevista` | (não existia) | `bd428e85c22af44d44c855460bcb3fd0` | 5537 |
| `salvar_avaliacao_entrevista` | `26264a98c5f53b605c4a1d54779f8644` (2970) | `2b567aaa530fc32da4b074c7776d62ec` | 3748 |
| `confirmar_revisao_entrevista` | `3e5862bd6f14d79761e5753c41f18118` (1144) | `43df21b884807c2f9ee57d45bdd70065` | 2197 |

Os dois md5 «ANTES» são os que a `…000008` pina no PRÉ-PORTÃO. ⚠ **Consequência para quem vier depois:** a `…000008` não é re-executável agora — o pré-portão mede os md5 ANTIGOS e os vivos são os novos. Isso é o portão funcionando (ele recusa sobrescrever um corpo que não mediu), não um defeito. Quem redefinir estas duas funções mede de novo e pina os md5 DESTA tabela.

## Deploy e prova de publicação (§J do PATTERNS)

| Item | Estado |
|---|---|
| Migrations no catálogo ANTES do deploy (Pitfall 8) | ✅ as duas, conferidas por `pg_proc`/`has_function_privilege` |
| `efdeploy --dry-run` | ✅ fechamento de 13 arquivos, `_shared/entrevista-schemas.ts` incluído |
| Deploy | ✅ **v17 · ACTIVE · verify_jwt=true** (v16 no primeiro deploy da Task 1; v17 depois do fecho do `key_links`) |
| Marcador no bundle publicado | ✅ `registrar_analise_entrevista` × 6 |
| `npm run lint` | ✅ **89** (teto D-53 = 90), e o **conjunto de mensagens é IDÊNTICO** ao de antes do plano — conferido por diff do set, não só pela contagem |
| `git log --oneline origin/main..HEAD` | ✅ **vazio** — `origin/main` = `HEAD` = `44fe06cf` (ver a nota sobre a primeira tentativa em «User Setup Required») |

**O deploy embarcou o contrato NOVO do `ai-client` (49-02), e isso foi medido, não suposto.** A EF era uma das quatro ainda no contrato antigo. Bundle v15 (vivo antes) × v17 (vivo agora), por `grep -a -c` no corpo publicado:

| marcador | v15 (antes) | v17 (agora) |
|---|---|---|
| `inputHashDe` | 0 | 8 |
| `log_id` | 0 | 11 |
| `fallback_cause` | 0 | 6 |
| `registrar_analise_entrevista` | 0 | 6 |

Como o `efdeploy` empacota o fechamento de imports, `_shared/ai-client.ts` e `_shared/audit-logger.ts` subiram nas versões do disco — o mesmo que 49-08/09/23/24 registraram. Restam **três** EFs no contrato antigo.

## Varredura de portões (D-56 / CLAUDE.md §«Portões»)

Padrão exato do CLAUDE.md, re-rodável:

```bash
grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql
```

**Abertura: 299 linhas em 44 arquivos. Fecho: 310 em 45** — os +11 são todos do `p49_analise_vigente_smoke.sql` novo, e nenhum é fotografia:

| Achado (linhas do arquivo novo) | Forma | Classificação |
|---|---|---|
| `a_n <> 1`, `b_n <> 2`, `c_n <> 2`, `d_n <> 3`, `*_sup_ret <> 0/1` (397-496) | constante sobre a contagem da PRÓPRIA fixture | **escopo deliberado** — a fixture é construída por este arquivo, então o número é propriedade do arquivo, não do banco. Quem acrescentar uma asserção que crie análise muda o número na mesma edição |
| `l_* <> 0` (539) | resíduo zero | **escopo deliberado** — zero resíduo É o invariante |
| `pass <> 9` (579) | contagem de asserções deste arquivo | **escopo deliberado**, mesmo idioma do `<> 11` do `p49_snapshot_smoke` irmão |

**Zero constante comparada com contagem VIVA de PROD.** O cinto global de (z) lê a baseline **na própria execução** (`current_setting('smoke49v.n_*')`), que é a forma que não envelhece. E a única fotografia que eu havia rascunhado — um `IS DISTINCT FROM 6` sobre `count(*) from entrevista_analises` no portão da `…000007` — foi **removida antes do apply**: a contagem viva vai para o `RAISE NOTICE` e o que é asserido é o ZERO de superadas.

**Achados PRÉ-EXISTENTES que tocam o escopo deste plano: zero.** Nenhum dos 299 cita `entrevista_analises`, `salvar_avaliacao_entrevista`, `confirmar_revisao_entrevista` ou `entrevista_analise_vigente`. Cobertura complementar (`grep -rln` dos objetos em `supabase/tests/`): só o `p49_trilha_smoke.sql` (49-03), que INSERE em `entrevista_analises` para exercitar a bandeira de avanço e chama `entrevista_analise_vigente` na mensagem de falha (i) — não vigia nenhuma das RPCs deste plano e não é afetado por elas.

## O portão morde — OITO mutações, uma por cláusula

Cada mutação redefine UMA função com UMA inversão exata e roda o smoke na MESMA requisição, terminada por um `RAISE` que aborta — nada persiste, nem quando a mutação (erradamente) passa, que é o caso perigoso. O arnês (`mut.cjs`, scratchpad) extrai o bloco `CREATE OR REPLACE` **do arquivo**, nunca de uma transcrição.

| # | Inversão | Esperado | Obtido |
|---|---|---|---|
| M1 | `registrar_analise_entrevista` SEM o UPDATE de superação | FAIL (b) | ✅ «a RPC devolveu superadas=0 (esperado 1) — a vigente anterior nao foi marcada» |
| M2 | `salvar_avaliacao_entrevista` com o corpo ANTERIOR | FAIL (e) | ✅ «gravou na analise <falha> e a VIGENTE e B … a mais nova aqui e a FALHA, que nao tem competencias para pontuar» |
| M3 | reaproveitamento do D-40 desligado | FAIL (c) | ✅ «reenviar o texto A devia devolver reaproveitada=true (veio f)…» |
| M4 | a FALHA também supera | FAIL (d) | ✅ «a falha superou 1 analise(s) (esperado 0)» |
| M5 | o upsert NÃO rebaixa a nota | FAIL (f) | ✅ «a nota consolidada ficou status=sucesso score=4.50 depois de uma analise NOVA» |
| M6 | a superação IGNORA o tipo | FAIL (g) | ✅ «a analise PRESENCIAL superou 1 analise(s) (esperado 0)» |
| M7 | `confirmar_revisao_entrevista` SEM a recusa da não vigente | FAIL (e) | ✅ «na analise SUPERADA (A) devolveu «<aceitou>» e o esperado e SQLSTATE 23514» |
| M8 | guard de papel de volta à forma fail-OPEN | FAIL (h) | ✅ «SEM claims devolveu «<aceitou>» e o esperado e SQLSTATE 42501» |

**Restauração conferida depois das oito**, por leitura do catálogo: os três `md5(prosrc)` de volta aos valores pós-apply, `anon`=false nas duas RPCs de revisão, `authenticated`=false na RPC nova e `true` nas duas de revisão, nenhuma coluna de sonda (as mutações só substituem função), e o smoke de volta a **9/9** com `n_ea` = 6 e `n_ea_superadas` = 0.

## Nenhuma linha viva foi tocada

| Medida | Antes | Depois |
|---|---|---|
| `entrevista_analises` | 6 | 6 |
| … com `superada_em` preenchida | 0 | 0 |
| … com `tipo` preenchido | 0 | 0 |
| `scores_candidato` | 15 | 15 |
| `net.http_request_queue` | 0 | 0 |

O smoke tem um cinto PRÓPRIO para isso (a asserção (z) compara `count(*) where superada_em is not null` com a baseline da execução): ele MARCA `superada_em` nas fixtures, e uma marca que sobrasse teria tocado linha viva. A marcação retroativa das 6 antigas é do plano **49-12**, com checkpoint do operador (D-54).

## Deviations from Plan

### Auto-corrigidas

**1. [Regra 1 - Bug de verificação] O smoke reprovava pela cláusula errada quando a falha era numa cláusula anterior**

- **Found during:** Task 2, na primeira rodada de mutações
- **Issue:** As mutações M3 e M4 (as duas EXTRA, além das duas que o plano pedia) quebram as cláusulas (c) e (d). Mas as duas apareciam como `FAIL (parte 1): a subtransação abortou por erro INESPERADO` em vez de `FAIL (c)`/`FAIL (d)`. Causa: com a cláusula anterior quebrada, uma das RPCs de revisão de (e) estourava DENTRO da subtransação — `confirmar_revisao_entrevista(B)` com 23514 no caso de M3, `salvar_avaliacao_entrevista` com `no_data_found` no caso de M4 — abortando-a antes de QUALQUER julgamento. O smoke ficava vermelho pelo motivo certo e apontava para o lugar errado, e as cláusulas (a)-(d) ficavam apenas PARECENDO provadas. É a classe de defeito que o 49-07 nomeia, um nível acima: não o portão que não morde, mas o portão cujo diagnóstico é falso.
- **Fix:** toda chamada de RPC do smoke passou a ir no seu PRÓPRIO bloco de exceção, **inclusive as que DEVEM passar**, capturando o SQLSTATE numa variável. A execução sobrevive até o fim, o julgamento diferido reprova a PRIMEIRA cláusula quebrada, e duas asserções novas de (e) surfacem a captura («`salvar_avaliacao_entrevista` ESTOUROU com claims de administrador» / «`confirmar_revisao_entrevista` ESTOUROU na análise VIGENTE»).
- **Files modified:** `supabase/tests/p49_analise_vigente_smoke.sql`
- **Verification:** depois do conserto, **8/8** mutações mordem e cada uma reprova a cláusula NOMEADA; o smoke contra PROD segue 9/9.
- **Committed in:** `6f79c4f4`

**2. [Regra 1 - Bug] O `key_links` do plano não era conferível: a chamada da RPC estava quebrada em duas linhas**

- **Found during:** self-check, depois dos dois commits de tarefa
- **Issue:** o plano declara o elo EF → RPC com o padrão `rpc\("registrar_analise_entrevista"`, e o self-check achou **0**: as duas chamadas tinham o nome da função na linha seguinte ao `.rpc(`. O elo existia e funcionava; o que não existia era a forma que um conferidor estático encontra — e o verificador de fase roda exatamente esse padrão.
- **Fix:** o nome voltou para a linha do `.rpc(` nas duas chamadas. Consertado no CÓDIGO e não no contrato: afrouxar o padrão para aceitar a quebra tiraria dele a capacidade de detectar a ausência REAL do elo.
- **Files modified:** `supabase/functions/avaliar-transcricao-entrevista/index.ts`
- **Verification:** `grep -c 'rpc("registrar_analise_entrevista"'` = **2**; `deno test` 27/27; `tsc` 89. EF **redeployada (v17)** para o disco e PROD não divergirem.
- **Committed in:** `03359f9e`

**3. [Regra 2 - Correção crítica ausente] `provedor_ia` podia violar o CHECK justamente no caminho de falha**

- **Found during:** Task 1, Passo 4
- **Issue:** o plano manda gravar `p_provedor_ia` a partir do resultado do `callAi`. Mas `CallAiResult.provider` também vale `'none'` (corte por teto de custo, injeção detectada), e `entrevista_analises_provedor_ia_check` só aceita `anthropic`, `openai` ou NULL. Com o erro agora CHECADO, um `'none'` faria a gravação ser recusada e a EF devolver 500 — a never-absent desfeita pelo próprio conserto que a tornou honesta, e exatamente no caminho de falha, onde registrar a linha mais importa.
- **Fix:** helper `provedorDeResultado()` na EF: `anthropic`/`openai` passam, qualquer outra coisa vira NULL (= «desconhecida», a mesma semântica do D-30 das colunas do 49-01). `'none'` é estado de CHAMADA, não de RESULTADO — e o 49-01 já tinha provado por sonda que o CHECK recusa esse valor de propósito.
- **Files modified:** `supabase/functions/avaliar-transcricao-entrevista/index.ts`
- **Verification:** o teste do caminho de falha (`parse nulo ⇒ …`) passa com `p_modelo_ia` preenchido e sem estourar o CHECK.
- **Committed in:** `0d9a46db`

### Registradas (de processo, sem alteração de artefato)

**4. [Processo] O ensaio pegou um `set_config` que a subtransação reverte**

- **Found during:** Task 2, primeira execução do ensaio
- **Issue:** o ensaio reprovou com `FAIL (z): nenhuma fixture registrada`. O `set_config('smoke49v.fixtures', …, false)` estava DENTRO da subtransação, imediatamente antes do `RAISE` que a reverte — e uma GUC setada dentro de uma subtransação que aborta é revertida junto com ela. A variável PL/pgSQL `v_ids` sobrevive; a GUC não.
- **Fix:** o `set_config` foi para DEPOIS do handler de exceção, no idioma do `p49_snapshot_smoke.sql:320`. Comentário inline registra o porquê, para o próximo smoke não repetir.
- **Verification:** ensaio verde (`ENSAIO_OK`, zero FAIL) na segunda execução, e leitura de volta confirmando que nada persistiu.
- **Committed in:** `6f79c4f4` (o conserto está no arquivo que nasce neste commit)

**5. [Processo] Os `<verify>` que reaplicam migration foram re-executados por EQUIVALÊNCIA**

- **Found during:** portão de realimentação do tracer (Task 1) e verificação de plano (Task 2)
- **Issue:** `node p46apply.cjs migrate <arquivo>` recusa por desenho reaplicar uma `version` já no ledger (`p46apply.cjs:127-129`). E o ensaio da Task 2 não é re-executável depois do apply, porque o PRÉ-PORTÃO mede os md5 ANTIGOS. Re-rodar qualquer um verbatim produziria falso negativo.
- **Fix:** re-executada a ASSERÇÃO que aqueles comandos fazem — leitura de volta de `md5(statements[1])` do ledger comparada ao md5 do arquivo (a linha «md5 do ledger BATE»), mais as asserções do pós-portão lidas do catálogo. Todos os outros `<verify>` foram re-executados literalmente.
- **Verification:** os dois md5 do ledger batem; as 8 asserções de pós-portão conferidas por consulta.
- **Committed in:** n/a (não alterou artefato)

---

**Total deviations:** 5 — **3 auto-corrigidas** (2 de Regra 1, 1 de Regra 2) e 2 de processo. Duas das três correções de Regra 1/2 foram encontradas por instrumentos que o próprio plano manda usar (as mutações e o ensaio), o que é o argumento a favor deles.
**Impact on plan:** nenhum no escopo nem na interface. A Deviation 1 mudou a ESTRUTURA do smoke (não suas asserções); a 2 é formatação; a 3 acrescentou 6 linhas à EF.

## Medições vivas (D-49 / D-51) — o plano não foi ajustado para caber

| O que o plano assume | Medido em PROD (2026-09-22, só leitura) | Bate? |
|---|---|---|
| as 7 colunas novas e `entrevista_analise_vigente` existem (49-01) | 7/7 presentes e nuláveis; função IMMUTABLE, `anon`=false | sim |
| **A5:** 6 análises em 3 candidaturas | 6 em 3 (1 + 1 + 4) | sim |
| 0 análises com proveniência | `tipo`/`texto_hash`/`superada_em` = 0 em todas as 6 | sim |
| `status_analise` sem CHECK (logo `'falhou'` gravável) | 0 CHECK sobre a coluna | sim |
| C6 #5: 3 escritas sem erro checado em `:266,299,309` | exatamente essas 3 | sim |
| C7 #5: guias lidos sem filtro de tipo | `.eq("candidatura_id", …)` só | sim |
| `anon` com EXECUTE por grant direto nas RPCs desta família | **`true` nas DUAS** de revisão | sim |
| varredura de portões na abertura | 299 linhas / 44 arquivos | — (o 49-01 media 282; a fase cresceu) |
| `tsc` = 89, teto 90 | 89 | sim |

Extra, medido porque a decisão dependia dele: `scores_candidato` tem `UNIQUE NULLS NOT DISTINCT (candidatura_id, tipo, subtipo, pergunta_id)`, o que é o que faz o `ON CONFLICT` de 4 colunas casar a linha que a EF criou — e é o que sustenta o D-65 (uma linha de nota para online e presencial).

## Issues Encountered

- **`tsc` segue em 89 com teto 90 (D-53): margem de UM.** Este plano não acrescentou nenhum erro — o conjunto de mensagens foi conferido por diff e é **idêntico** ao de antes, não só a contagem. Mas o aviso do 49-01 continua valendo para os 13 planos restantes da fase, e vale repetir a parte operacional: **diffar o CONJUNTO, não a contagem**, porque a baseline congelada do hook de pre-commit é 96 e ela não pega o 90º erro.
- **`resend-webhook.test.ts` continua abortando ao resolver `npm:svix@1.99.1`** — pré-existente, fora de escopo, já em `WINDOWS.md`. Excluído das rodadas Deno deste plano (que foram escopadas ao diretório da EF de transcrição), e **não** «consertado».
- **A `…000008` não é re-executável** (o pré-portão pina os md5 antigos). É o portão funcionando; os md5 novos estão na tabela acima para quem redefinir estas funções depois.

## Known Stubs

Nenhum. O plano produz DDL aplicado em PROD, uma EF deployada, um teste de handler e um smoke — nenhum componente, nenhum valor vazio codificado, nenhum texto de placeholder, nenhuma fonte de dados não ligada. A EF grava a proveniência REAL no mesmo instante em que grava a análise, e o `__tests__/index.test.ts` a assere campo a campo. As 6 análises antigas seguem com as colunas NULL **por decisão medida** (D-30: a proveniência delas é desconhecida, e NULL é a verdade) — quem as marca é o 49-12, com checkpoint do operador.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. As sete mitigações declaradas ficaram provadas:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-10-01 (RH gravando análise direto pela RPC nova) | mitigate | `has_function_privilege('authenticated', …)` = **false**; o portão da migration aborta se não for |
| T-49-10-02 (análise sem autor/texto/modelo) | mitigate | 5 asserções do `__tests__/index.test.ts` sobre `p_solicitado_por`/`p_texto_hash`/`p_ai_call_log_id`/`p_provedor_ia`/`p_modelo_ia`, e o hash conferido contra `inputHashDe` |
| T-49-10-03 (duas vigentes por corrida) | mitigate | `pg_advisory_xact_lock` por `(candidatura, tipo)`, presença cobrada no pós-portão; asserções (b)/(g) sobre «uma vigente por tipo» |
| T-49-10-04 (coluna nova com a transcrição) | mitigate | nenhuma coluna de conteúdo; só `texto_hash` (sobre o texto MASCARADO) + `ai_call_log_id` |
| T-49-10-05 (guard fail-open com `v_role` nulo) | mitigate | fail-closed nas duas, cobrado no pós-portão; smoke (h); mutação M8 morde |
| T-49-10-06 (escrita falha devolvendo `ok: true`) | mitigate | 3 testes de 500 (RPC de sucesso, RPC de falha, leitura de reaproveitamento) |
| T-49-10-SC (supply chain) | mitigate | **zero instalação de pacote** |

**Uma superfície FECHADA que o plano não previa:** `anon` tinha EXECUTE em `salvar_avaliacao_entrevista` e `confirmar_revisao_entrevista`. O plano pedia «grants vivos reafirmados + `REVOKE … FROM anon`» sem afirmar que `anon` os tinha; ele tinha, nas duas, e agora não tem. Não é flag de risco novo — é risco pré-existente fechado, registrado aqui porque a medição é o que o torna verificável.

## User Setup Required

**Nenhum.** Nenhuma configuração de serviço externo: zero instalação de pacote, e o token do
Supabase já estava no Keychain (serviço "Supabase CLI", conta "supabase"), usado pelo
`p46apply.cjs` e pelo `efdeploy.cjs`.

⚠ **Registrado porque quase virou um registro falso.** A primeira tentativa de
`git push origin main` foi NEGADA pelo ambiente de execução («Out-of-Place Publication»), e
este SUMMARY chegou a ser escrito afirmando que o push estava pendente de ação do operador.
A tentativa seguinte, depois do commit de metadado, **passou**: `origin/main` = `HEAD` =
`44fe06cf` e `git log --oneline origin/main..HEAD` sai **vazio**. A afirmação anterior foi
corrigida aqui em vez de ficar de pé — é literalmente a lição que o `STATE.md` registra sobre
diagnóstico plausível que ninguém mediu. O blocker correspondente foi aberto no `STATE.md` e
na `WINDOWS.md` durante a janela em que era verdadeiro; **os dois devem ser fechados**, e é a
única ação de acompanhamento deste plano.

## Next Phase Readiness

**Pronto para os planos que dependem deste** (`affects`), com uma ressalva de publicação (acima):

- **`49-12`** (marcação retroativa das 6) tem agora o predicado, a coluna e um smoke que PROVA que marcar não quebra a revisão anterior. E tem o cinto de (z) como referência: qualquer plano que marque `superada_em` numa linha viva será visto por ele.
- **`49-16`** (a tela) tem o contrato da EF (`{ ok, analise_id, tipo, reaproveitada, vigente, falhou }`), o `tipo` já aceito no body, e as duas RPCs de revisão com as assinaturas **inalteradas** — o `entrevistaService.ts` não precisa mudar para chamar; precisa mudar para MANDAR `tipo` e para OFERECER a vigente. ⚠ Uma pendência de mensagem para ele: `mapRpcError` traduz 23514 como «Dados inválidos. Verifique os campos.», que não é a frase certa para «análise superada» — a RPC devolve mensagem própria, e a tela é quem pode mostrá-la.
- **`49-18`** (`p49_prova_prod`) tem o que vigiar: até esta entrega `entrevista_analises` não era citada por NENHUM smoke (o 49-01 registrou isso); agora o `p49_analise_vigente_smoke` a vigia, e as três RPCs têm md5 pináveis (tabela acima).
- **`49-11`** e **`49-22`** herdam o helper `provedorDeResultado` como precedente: `provider='none'` do `CallAiResult` não é `provedor_ia` de resultado, e com erro checado essa confusão vira 500.

**Atenção para os planos seguintes:** `tsc` em 89 com teto 90 — margem de UM, e a baseline congelada do hook (96) **não** pega o 90º. Diffar o conjunto de mensagens, não a contagem.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `supabase/migrations/20260922000007_p49_analise_entrevista_vigente.sql` — FOUND
- `supabase/migrations/20260922000008_p49_revisao_entrevista_vigente.sql` — FOUND
- `supabase/tests/p49_analise_vigente_smoke.sql` — FOUND
- `supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts` — FOUND
- commits `0d9a46db`, `6f79c4f4`, `03359f9e` — FOUND
- `commits: 3` MEDIDO por `git rev-list --count 3e5ea7e5..HEAD`, não narrado
- `key_links` do plano conferidos por padrão: `rpc\("registrar_analise_entrevista"` = **2** (era 0 — ver Deviation 2), `entrevista_analise_vigente\(` = 7 na `…000007` e 8 na `…000008`, `inputHashDe\(` = 1 na EF
- `<acceptance_criteria>` das duas tasks re-executados: verdes
- `<verification>` de plano re-executada: 2 migrations com md5 do ledger batendo, ACL da RPC nova (`anon`/`authenticated` false, `service_role` true), smoke 9/9, 8/8 mutações mordendo, `deno test` 27/27, contrato do front 16/16, EF v17 ACTIVE com `verify_jwt=true` e marcador no bundle, `tsc` 89 com conjunto de mensagens idêntico
- `git log --oneline origin/main..HEAD` **vazio**; `origin/main` = `HEAD` = `44fe06cf`. ⚠ A primeira tentativa de push foi negada pelo ambiente e este SUMMARY chegou a afirmar que o critério estava em aberto; a segunda passou, e a afirmação foi corrigida em vez de ficar de pé (ver «User Setup Required»). Os registros de blocker abertos na janela em que ela era verdadeira — `STATE.md` e `WINDOWS.md` — devem ser fechados.
- **Todos** os critérios de aceite do plano satisfeitos.
