---
phase: 49-consertos-da-jornada-bloco-2
plan: 11
subsystem: edge-functions
tags: [deno, edge-function, ai-provenance, lgpd, efdeploy, d-28, jorn-28, jorn-39, triagem]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "`analise_candidato_vaga.provedor_ia` / `.modelo_ia` em PROD, com o CHECK `(provedor_ia IS NULL OR provedor_ia = ANY (ARRAY['anthropic','openai']))` — é esse vocabulário FECHADO que obriga a normalização deste plano"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`CallAiResult.model` (o modelo que DE FATO respondeu) e `.provider`, mais o `_shared/ai-error-codes.ts` que entra no fechamento de imports das duas EFs deployadas aqui"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "08"
    provides: "`_shared/comparativo-config.ts`, que o `analise-schemas.ts` passou a importar — por isso o fechamento desta EF tem 11 arquivos e não 10"
  - phase: 46-purga-e-guardas
    provides: "`efdeploy.cjs` (bundle LIDO DO DISCO, `verify_jwt` por tabela) e `p46apply.cjs sql` para a medição só-leitura de PROD"
provides:
  - "`analise-candidato-individual` v31 em PROD: o upsert de sucesso grava `provedor_ia` (normalizado) e `modelo_ia` = `result.model` — o modelo REAL, não o alias configurado"
  - "as TRÊS escritas de `analise_candidato_vaga` na EF checam o `error` que o `supabase-js` devolve; as duas que o descartavam (varredura C6 #6, `:301` e `:602`) logam o CÓDIGO no `console.error` redigido"
  - "`provedorDeResultado()` exportado — o vocabulário fechado do CHECK normalizado no lado do chamador (3º precedente da fase, depois de 49-09 e 49-10)"
  - "6 casos novos em `__tests__/index.test.ts` (12 → 18), provados MORDENTES por 7 mutações, uma por cláusula"
  - "`gerar-devolutiva-bigfive` v29 em PROD com o `_shared` do contrato novo, sem UMA linha de mudança de comportamento (o `_NEG` e o `PERSONALIZACAO_IA_ATIVA` conferidos idênticos no bundle antes e depois)"
  - "as SETE EFs que embarcam `_shared/ai-client.ts` rodando o contrato novo em PROD — medido EF a EF, não suposto"
affects: [49-12, 49-15, 49-16, 49-18, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 4187
  tasks: 2
  commits: 1
  plan_head_before: 9fb507d594eeeb750c729bce2e6259aa37a163bd
  estimate_tokens_do_plano: 45000
  # `commits: 1` = MEDIDO por `git rev-list --count 9fb507d5..HEAD` no instante em que este
  # SUMMARY foi escrito (só `7397524b`), não narrado. ⚠ Re-medir DEPOIS do commit de metadado
  # deste plano dá 2, por construção — o `plan_head_before` é anterior a ele. A fronteira de
  # PRODUÇÃO é 1: a Task 2 não edita código (redeploy de sincronia), então ela não tem commit
  # próprio, e o `git push` dela é o da Task 1.
  # `tokens: 4187` = 16 751 octetos das linhas `+` dos 2 arquivos ÷ 4. A estimativa era 45 000;
  # o realizado é 0,09× — o maior desvio já medido nesta fase (49-06 0,25×, 49-07 0,24×,
  # 49-10 0,28×). Registrado como medido, sem arredondar para parecer perto. A razão é a
  # mesma das três anteriores e vale nomeá-la de novo porque aqui ela é extrema: o orçamento
  # foi dimensionado pelo TRABALHO (ler dois corpos de EF vivos, medir o CHECK e as 25 linhas
  # em PROD, comparar o fechamento de imports com a versão viva à mão, 7 mutações, medir 8 EFs
  # no ar) e o `actuals` mede o ARTEFATO — que aqui é ~100 linhas de código e 225 de teste,
  # porque a Task 2 não tem artefato NENHUM por desenho.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "omitir a chave do objeto de upsert, em vez de mandá-la como `null`, quando a coluna não deve ser tocada: com `onConflict` um `null` explícito APAGA o valor anterior, e é o oposto do que «não tocar» significa"
    - "proveniência só na escrita que carrega CONTEÚDO — marca de estado (`pendente`) e linha de falha não afirmam modelo nenhum, porque não há resultado a atribuir"
    - "log de erro de escrita com o CÓDIGO e nunca a `message`: a mensagem do Postgres pode embutir valor de coluna (e esta tabela guarda `resumo_cv`), então o log redigido do Pitfall 7 exige o código"
    - "comparar o fechamento de imports do `--dry-run` com a lista de arquivos EXTRAÍDA do bundle vivo (`strings -a | grep -oE 'functions/...'`), porque o `efdeploy.cjs` afirma uma trava de divergência que ele não implementa (item aberto do 48-19)"
    - "provar que um redeploy de sincronia NÃO mudou comportamento contando marcadores de comportamento no bundle antes e depois (`_NEG` 3→3, `PERSONALIZACAO_IA_ATIVA` 7→7), e não pela ausência de diff no disco"

key-files:
  created: []
  modified:
    - supabase/functions/analise-candidato-individual/index.ts
    - supabase/functions/analise-candidato-individual/__tests__/index.test.ts

key-decisions:
  - "A marca `pendente` e a linha `falhou` NÃO carregam `provedor_ia`/`modelo_ia` — e não os carregam nem como `null`. Com `onConflict: candidatura_id`, toda coluna PRESENTE no objeto é sobrescrita: um `null` explícito apagaria a proveniência da execução anterior no instante em que o reprocessamento começa, e a linha passaria a não dizer nada sobre um conteúdo que ainda está lá. Omitir a chave preserva o valor antigo até o upsert final substituí-lo (sucesso) ou deixá-lo como está (falha). O teste assere `!(\"provedor_ia\" in row)`, não `=== null`, exatamente por isso"
  - "`provedorDeResultado()` fica mesmo sendo REDUNDANTE na fiação atual. Medido: os dois retornos `provider: 'none'` do `ai-client` vêm com `flagged_for_human_review: true`, e o guard da EF (`:496`) lança antes do upsert final — então `'none'` não chega hoje ao CHECK. Ela fica porque a coluna tem vocabulário FECHADO e o `error` do upsert final É checado: quem mexer naquele guard descobriria o CHECK por um `falhou` inexplicável em PROD, não por um teste. Terceiro precedente da fase (49-09 `provedorIaDaColuna`, 49-10 `provedorDeResultado`)"
  - "O `modelo_ia` gravado é `result.model` e o teste o prova DISCRIMINANDO: a fixture do mock responde `claude-sonnet-4-6-20260215` e o `PROMPT_ROW_FIXTURE.model_id` é `claude-sonnet-4-6`. Uma asserção contra o alias configurado passaria nos dois mundos e não provaria nada — e é justamente essa confusão que fazia uma análise escrita pelo `gpt-4o-mini` do fallback ficar indistinguível de uma do Sonnet"
  - "O log de erro das duas escritas leva o CÓDIGO e nunca a `message`. Estreitado também no ramo de EXCEÇÃO, que antes logava `marcaErr.message`: a mensagem de um erro de banco pode embutir valor de coluna, e esta tabela guarda `resumo_cv` (texto do currículo do titular). No lugar vai a CLASSE da exceção, que diagnostica o transporte sem carregar conteúdo"
  - "`consolidar-decisao-final` NÃO é uma das EFs do contrato. O briefing deste plano a listava como «ainda no contrato antigo», sugerindo uma oitava pendência; medido por fechamento de imports, ela não tem nenhum import de `_shared/` e nenhum `callAi`, e o bundle vivo dá 0/0/0 nos três marcadores. O conjunto fecha em SETE, e as sete estão feitas"
  - "Nenhum `max_tokens` nem `timeoutMs` tocado (conferido por diff das linhas de teto). O `cv_job_match` a 79 % do teto fica como risco moderado registrado, não consertado — é o que o plano manda"
  - "D-37 preservado: `onConflict: candidatura_id` nas três escritas, nenhum append por etapa. A análise da triagem continua sobrescrita ao reprocessar"
  - "`main` como branch de trabalho, por autorização explícita (`git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Não registrado como desvio"

patterns-established:
  - "Ao decidir que uma coluna «não é tocada» por uma escrita, decidir também COMO: ausente do objeto ≠ presente como `null`. Num upsert as duas formas têm efeitos opostos, e a asserção tem de ser sobre a presença da CHAVE"
  - "Um teste de proveniência só vale se a fixture faz o valor REAL divergir do valor CONFIGURADO. Sem essa divergência a asserção passa nos dois mundos, e o defeito que ela existe para pegar é exatamente confundir os dois"
  - "Redeploy de sincronia de `_shared` prova-se por marcadores de COMPORTAMENTO contados no bundle antes e depois, não por «não editei o arquivo». O que sobe é o fechamento de imports, e ele mudou — a questão é se mudou algo além do que se quis"

requirements-completed: []
# JORN-28 e JORN-39 declarados por este plano e por planos IRMÃOS ainda sem SUMMARY.
# `requirements.ready-ids` devolveu «0/2 requirement(s) ready» e NADA foi marcado: um ID
# compartilhado não pode ler `Complete` enquanto um irmão que o declara ainda está de pé.

coverage:
  - id: D1
    description: "A análise da triagem grava `provedor_ia` e `modelo_ia` REAIS (do `CallAiResult` do 49-02) no upsert de SUCESSO — `modelo_ia` é o modelo que respondeu, não o alias configurado no prompt"
    requirement: JORN-28
    verification:
      - kind: unit
        ref: "supabase/functions/analise-candidato-individual/__tests__/index.test.ts#49-11 / D-28 — o upsert de SUCESSO grava provedor_ia e modelo_ia REAIS (o que respondeu, não o configurado) — assere `modelo_ia === 'claude-sonnet-4-6-20260215'` E `!== PROMPT_ROW_FIXTURE.model_id`"
        status: pass
      - kind: other
        ref: "mutação M1 (`modelo_ia` passa a gravar `resolved.model_id`, o configurado) ⇒ reprova exatamente este teste"
        status: pass
      - kind: other
        ref: "mutação M2 (as duas colunas removidas do upsert) ⇒ reprova exatamente este teste"
        status: pass
      - kind: other
        ref: "PROD: `key_links` do plano conferido por padrão — `grep -cE 'modelo_ia:\\s*result\\.model'` = 2; marcador `modelo_ia` no bundle publicado (v31) = 9, era 0 na v29"
        status: pass
    human_judgment: false
  - id: D2
    description: "A marca `pendente` (reprocessamento) NÃO toca a proveniência — nem com valor nem como `null` —, e a linha `falhou` também não afirma modelo nenhum: a coluna sempre descreve o conteúdo que está NA linha"
    requirement: JORN-28
    verification:
      - kind: unit
        ref: "index.test.ts#49-11 / D-28 — a marca 'pendente' NÃO toca provedor_ia nem modelo_ia — assere a ausência da CHAVE (`!('provedor_ia' in row)`), porque um `null` no objeto APAGARIA a proveniência anterior pelo `onConflict`"
        status: pass
      - kind: unit
        ref: "index.test.ts#49-11 / D-28 — a linha 'falhou' também não afirma modelo nenhum"
        status: pass
      - kind: other
        ref: "mutação M3 (a marca passa a carregar `provedor_ia: null, modelo_ia: null`) ⇒ reprova exatamente o teste da marca"
        status: pass
    human_judgment: false
  - id: D3
    description: "As duas escritas que descartavam o `error` (varredura C6 #6, `:301` a marca e `:602` a linha `falhou`) passam a destruturá-lo e a registrar o CÓDIGO no `console.error` redigido; a marca continua NÃO interrompendo a análise"
    requirement: JORN-39
    verification:
      - kind: unit
        ref: "index.test.ts#49-11 / C6 #6 — marca 'pendente' recusada pelo banco: loga o CÓDIGO e a análise NÃO é interrompida — assere resposta `sucesso`, IA chamada, linha de sucesso gravada, `error_code === '42501'` no log E ausência da mensagem do banco no log"
        status: pass
      - kind: unit
        ref: "index.test.ts#49-11 / C6 #6 — upsert 'falhou' recusado pelo banco: loga o código (e a resposta segue 'falhou') — `error_code === '23514'`, mensagem ausente"
        status: pass
      - kind: other
        ref: "mutação M5 (a recusa da marca volta a ser silenciosa) ⇒ reprova o teste da marca; mutação M6 (a recusa da linha `falhou` volta a ser silenciosa) ⇒ reprova o teste da falha; mutação M7 (o log volta a carregar a `message`) ⇒ reprova a asserção de redação"
        status: pass
      - kind: other
        ref: "varredura C6 re-rodada no fim: `grep -rnE '^\\s*await supabaseAdmin\\.from\\([^)]*\\)\\.(insert|upsert|update)\\(' supabase/functions --include='*.ts' | grep -v __tests__ | grep -v '\\.test\\.'` devolve ZERO linhas no repositório inteiro (eram 11 no kickoff)"
        status: pass
    human_judgment: false
  - id: D4
    description: "`provedorDeResultado()` normaliza o vocabulário FECHADO do CHECK no lado do chamador: `'none'` e desconhecidos viram NULL, `anthropic`/`openai` passam"
    requirement: JORN-28
    verification:
      - kind: unit
        ref: "index.test.ts#49-11 / D-28 — provedorDeResultado: 'none' e desconhecidos viram NULL; anthropic/openai passam (6 asserções)"
        status: pass
      - kind: other
        ref: "mutação M4 (devolve o valor cru) ⇒ reprova exatamente este teste"
        status: pass
      - kind: integration
        ref: "PROD, medido antes de escrever: `analise_candidato_vaga_provedor_ia_check` = `CHECK ((provedor_ia IS NULL) OR (provedor_ia = ANY (ARRAY['anthropic','openai'])))`"
        status: pass
    human_judgment: false
  - id: D5
    description: "`analise-candidato-individual` deployada com `verify_jwt=false` e o contrato novo do `ai-client` (49-02) no bundle, com o fechamento de imports registrado"
    verification:
      - kind: other
        ref: "`efdeploy: OK · version=31 · status=ACTIVE · verify_jwt=false`; readback pela Management API confirma 31/ACTIVE/false"
        status: pass
      - kind: other
        ref: "`--dry-run`: fechamento de 11 arquivos, `functions/_shared/ai-error-codes.ts` incluído (o marcador do contrato do 49-02) e `functions/_shared/comparativo-config.ts` (a adição do 49-08)"
        status: pass
      - kind: other
        ref: "marcadores no bundle, v29 (antes) → v31 (agora): `modelo_ia` 0→9, `provedor_ia` 0→8, `provedorDeResultado` 0→3, `fallback_cause` 0→6, `ai-error-codes` 0→4, `log_id` 0→8, `inputHashDe` 0→5"
        status: pass
    human_judgment: false
  - id: D6
    description: "`gerar-devolutiva-bigfive` redeployada só para sincronizar o `_shared`, com ZERO mudança de comportamento — incluindo o disclaimer NEGADO montado por fragmentos (`_NEG`), que é exceção decidida do CLAUDE.md e NÃO foi tocado"
    verification:
      - kind: other
        ref: "`deno test --allow-all supabase/functions/gerar-devolutiva-bigfive/` = 16 passed / 0 failed, SEM nenhuma edição — o contrato novo do `callAi` não quebra o handler"
        status: pass
      - kind: other
        ref: "`efdeploy: OK · version=29 · status=ACTIVE · verify_jwt=false`; readback confirma; fechamento de 9 arquivos conferido À MÃO contra a lista extraída do bundle da v27 (8 arquivos) — é a MESMA lista mais `ai-error-codes.ts`, nada removido"
        status: pass
      - kind: other
        ref: "marcadores de COMPORTAMENTO no bundle, v27 → v28/29: `_NEG` 3→3 e o fragmento final do disclaimer negado 2→2 (intocados); `PERSONALIZACAO_IA_ATIVA` 7→7 (IA segue desligada). Marcadores do contrato NOVO: `ai-error-codes` 0→4, `fallback_cause` 0→6, `log_id` 0→8, `inputHashDe` 0→5"
        status: pass
    human_judgment: false
  - id: D7
    description: "As SETE EFs que embarcam `_shared/ai-client.ts` rodam o contrato novo em PROD — medido EF a EF por marcador no bundle vivo, não suposto pelo histórico de planos"
    verification:
      - kind: other
        ref: "conjunto das 7 calculado por fechamento de imports (não por lista escrita à mão); tabela de versão/status/verify_jwt/marcadores lida da Management API — ver «Deploy e prova de publicação»"
        status: pass
      - kind: other
        ref: "`consolidar-decisao-final` medida e EXCLUÍDA do conjunto: nenhum import de `_shared/`, nenhum `callAi`, bundle vivo 0/0/0"
        status: pass
    human_judgment: false
  - id: D8
    description: "Nenhum `max_tokens` alterado e D-37 preservado (a análise da triagem segue sobrescrita ao reprocessar)"
    verification:
      - kind: other
        ref: "`git diff HEAD~1 HEAD` filtrado por `max_tokens|timeoutMs|CV_CHAR_BUDGET|RESPOSTAS_CHAR` = nenhuma linha; `onConflict: \"candidatura_id\"` em 3 escritas, nenhum append"
        status: pass
    human_judgment: false

# Metrics
duration: 34 min
completed: 2026-09-23
status: complete
---

# Phase 49 Plano 11: A análise da triagem diz quem a escreveu Summary

**O upsert de sucesso de `analise_candidato_vaga` passa a gravar `provedor_ia` e `modelo_ia` REAIS (o modelo que respondeu, não o alias configurado), a marca `pendente` e a linha `falhou` deixam de ser escritas silenciosas sem deixar de ser escritas que não afirmam modelo nenhum, e as duas últimas linhas da varredura C6 do kickoff fecham — o `grep` agora sai VAZIO no repositório inteiro. Com os deploys de `analise-candidato-individual` (v31) e `gerar-devolutiva-bigfive` (v29), as SETE EFs que embarcam o `ai-client` rodam o contrato novo em PROD, medido EF a EF.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-23T03:10Z (aprox.)
- **Completed:** 2026-09-23T03:44Z
- **Tasks:** 2 / 2
- **Files modified:** 2 (0 criados, 2 modificados)
- **Testes:** 12 → 18 no arquivo tocado; suíte das EFs **715 / 0**

## Accomplishments

- **A análise mais caras do sistema passa a dizer quem a escreveu.** Medido em PROD antes de escrever: **25 análises**, todas `sucesso`, e `provedor_ia`/`modelo_ia` preenchidos em **ZERO** delas. O `cv_job_match` é o `call_type` com MAIS fallbacks em 05–06/09 (timeout ×6, truncamento ×2, Zod ×5) — ou seja, é o lugar onde a diferença entre «o Sonnet avaliou este candidato» e «o `gpt-4o-mini` do fallback avaliou este candidato» mais provavelmente aconteceu, e era o lugar onde ela não deixava rastro nenhum na linha.

- **O teste prova a coisa difícil, não a fácil.** A fixture do mock responde `claude-sonnet-4-6-20260215` e o prompt está configurado com `claude-sonnet-4-6`. Uma asserção contra o valor configurado passaria tanto no código certo quanto no errado — e confundir os dois É o defeito. Duas mutações confirmam: trocar `result.model` por `resolved.model_id` reprova, e remover as colunas reprova.

- **«Não tocar a coluna» virou uma decisão sobre a FORMA da escrita, não só sobre a intenção.** Num upsert com `onConflict`, mandar `provedor_ia: null` não é «não tocar» — é APAGAR. A marca `pendente` roda no começo de um reprocessamento, quando a linha ainda contém a análise anterior inteira; um `null` ali destruiria a proveniência daquele conteúdo no instante em que a nova execução começa, e a linha passaria a não dizer nada sobre um texto que continua lá. A chave ficou FORA do objeto, e o teste assere ausência de chave (`!('provedor_ia' in row)`), não igualdade a `null`. A mutação M3 (as colunas como `null`) reprova.

- **As duas últimas escritas silenciosas da varredura C6 fecharam — e o portão agora sai vazio.** O `supabase-js` devolve `{ error }` em vez de lançar, então o `try/catch` que envolvia as duas só via exceção de TRANSPORTE: uma recusa do banco (RLS, CHECK, 22P05) passava batida. Na linha `falhou` isso é o pior caso possível, porque ela É o invariante never-absent inteiro — a última prova de que a análise existiu. O `grep` da C6, re-rodado no fim, devolve **ZERO linhas no repositório**: eram 11 no kickoff, e a fase fechou todas (49-02 as três do `_shared`, 49-08/09/10/23 as das EFs, este plano as duas últimas).

- **O log ficou mais redigido do que estava, não só mais informativo.** O ramo de exceção da marca logava `marcaErr.message`. Uma mensagem de erro do Postgres pode embutir valor de coluna — e esta tabela guarda `resumo_cv`, que é texto do currículo do titular. Agora vão o CÓDIGO (no caminho `{ error }`) e a CLASSE da exceção (no caminho de throw). A mutação M7 (a `message` de volta) reprova a asserção de redação, que é o que impede o retrocesso.

- **A marca continua não interrompendo a análise, e isso está agora provado e não só escrito.** A decisão mora no próprio arquivo desde 2026-09-05 — «perder observabilidade é ruim, perder a análise inteira é pior» — mas nada a testava. Agora um teste recusa a marca no banco e assere que a IA é chamada, a linha de sucesso é gravada e a resposta é `sucesso`. Deixar de ser silenciosa e continuar não-bloqueante são duas propriedades, e as duas são cobradas.

- **O redeploy da devolutiva foi provado INÓCUO por medição, não por «não editei o arquivo».** O que sobe é o fechamento de imports, e ele mudou (ganhou `ai-error-codes.ts`). A pergunta certa é se mudou algo ALÉM disso — e a resposta veio de contar marcadores de comportamento no bundle vivo antes e depois: o disclaimer NEGADO montado por fragmentos (`_NEG`, exceção decidida pelo operador no CLAUDE.md) está **3 → 3** e seu fragmento final **2 → 2**; `PERSONALIZACAO_IA_ATIVA` está **7 → 7**. A IA segue desligada e o rodapé segue exatamente como o operador decidiu.

- **O conjunto das EFs de IA foi CALCULADO, não copiado.** Rodei o mesmo algoritmo de fechamento de imports do `efdeploy.cjs` sobre as 20 EFs do repositório: **exatamente sete** embarcam `_shared/ai-client.ts`. `consolidar-decisao-final`, que o briefing deste plano listava como «ainda no contrato antigo», **não tem nenhum import de `_shared/` nem um `callAi`** — o bundle vivo dela dá 0/0/0 nos três marcadores porque ela nunca embarcou o contrato, não porque falta sincronizar. Não há oitava pendência.

## Task Commits

1. **Task 1 (tracer): a análise da triagem grava o modelo real — testada e deployada** — `7397524b` (feat)
2. **Task 2: `gerar-devolutiva-bigfive` com o `_shared` do contrato novo** — **sem commit próprio, por desenho**: o plano manda «nenhuma edição de código na devolutiva». A Task 2 produz um deploy e uma medição, não um artefato de disco; o `git push` que ela cobra é o da Task 1.

## Deploy e prova de publicação (§J do PATTERNS)

| Item | Estado |
|---|---|
| Colunas no catálogo ANTES do deploy (Pitfall 8) | ✅ `provedor_ia` e `modelo_ia` presentes e nuláveis; CHECK lido e usado para desenhar a normalização |
| `efdeploy --dry-run` (análise) | ✅ 11 arquivos, com `_shared/ai-error-codes.ts` (49-02) e `_shared/comparativo-config.ts` (49-08) |
| `efdeploy --dry-run` (devolutiva) | ✅ 9 arquivos = os 8 do bundle vivo da v27 **mais** `ai-error-codes.ts`; nada removido, conferido À MÃO |
| Deploy (análise) | ✅ **v31 · ACTIVE · verify_jwt=false** (v30 no deploy da ação; v31 na execução LITERAL do `<verify>` #2, que redeploya — mesmos bytes) |
| Deploy (devolutiva) | ✅ **v29 · ACTIVE · verify_jwt=false** (v28 na ação; v29 na execução literal do `<verify>` #2) |
| Marcador no bundle publicado | ✅ `modelo_ia` × 9 na análise; `ai-error-codes` × 4 nas duas |
| `npm run lint` | ✅ **89** (teto D-53 = 90), e o **conjunto de mensagens é IDÊNTICO** ao de antes do plano — conferido por `diff` do set ordenado, não pela contagem |
| `deno test` da EF tocada | ✅ **18 / 0** (baseline 12 / 0) |
| Suíte das EFs | ✅ **715 / 0** (excluindo `resend-webhook` e `strict-schema`, pré-existentes) |
| `git log --oneline origin/main..HEAD` | ✅ **vazio** — `origin/main` = `HEAD` = `7397524b` no momento do `<verify>` #2 da Task 2, que o exige por `test -z` |

### As SETE EFs que embarcam `ai-client.ts` — lidas da Management API no fecho

Conjunto calculado por fechamento de imports (o mesmo algoritmo do `efdeploy.cjs`), não por lista escrita à mão. Marcadores = `ai-error-codes` / `fallback_cause` / `log_id`, os três que só existem no contrato do 49-02:

| EF | version | status | verify_jwt | marcadores | Contrato novo? | Plano dono |
|---|---|---|---|---|---|---|
| `analise-candidato-individual` | **31** | ACTIVE | false | 4/6/8 | ✅ | **49-11 (este)** |
| `gerar-devolutiva-bigfive` | **29** | ACTIVE | false | 4/6/8 | ✅ | **49-11 (este)** |
| `comparativo-candidatos` | 28 | ACTIVE | true | 4/8/8 | ✅ | 49-08 |
| `avaliar-redacao-cultural` | 15 | ACTIVE | true | 4/7/8 | ✅ | 49-09 |
| `avaliar-redacao` | 21 | ACTIVE | true | 4/6/8 | ✅ | 49-23 |
| `avaliar-transcricao-entrevista` | 17 | ACTIVE | true | 4/6/11 | ✅ | 49-10 |
| `gerar-guia-entrevista` | 18 | ACTIVE | true | 4/6/8 | ✅ | 49-24 |

**7 / 7.** Nenhuma EF de IA fica rodando, em PROD, o cliente antigo que escondia o fallback — que é o `<done>` da Task 2.

Todos os `verify_jwt` batem com a tabela do `efdeploy.cjs`: `false` só nas duas que recebem `net.http_post`/Bearer de segredo (`analise-candidato-individual`) ou invocação interna servidor→servidor (`gerar-devolutiva-bigfive`).

**Fora do conjunto, medido:** `consolidar-decisao-final` v9 · ACTIVE · verify_jwt=true · marcadores **0/0/0** — e `grep "_shared/"` no fonte dela devolve **nada**, `grep -c callAi` devolve **0**. Ela não embarca o contrato e nunca embarcou; não é pendência.

## O portão morde — SETE mutações, uma por cláusula

Cada mutação faz UMA inversão exata no `index.ts`, roda a suíte da EF e restaura o arquivo byte a byte (arnês `mut.cjs` no scratchpad, lendo o original em memória e reescrevendo-o no `finally` de cada rodada). Restauração conferida depois: `git diff --stat` com os mesmos 320/5 de antes, `deno test` de volta a 18/0.

| # | Inversão | Esperado | Obtido |
|---|---|---|---|
| M1 | `modelo_ia` passa a gravar `resolved.model_id` (o CONFIGURADO) | reprova o teste de proveniência | ✅ 17 passed / 1 failed — «o upsert de SUCESSO grava provedor_ia e modelo_ia REAIS» |
| M2 | as duas colunas removidas do upsert de sucesso | idem | ✅ mesmo teste |
| M3 | a marca `pendente` passa a carregar `provedor_ia: null, modelo_ia: null` | reprova o teste da marca | ✅ «a marca 'pendente' NÃO toca provedor_ia nem modelo_ia» |
| M4 | `provedorDeResultado` devolve o valor CRU | reprova o teste do helper | ✅ «'none' e desconhecidos viram NULL» |
| M5 | a recusa da marca volta a ser silenciosa | reprova o teste de C6 da marca | ✅ «marca 'pendente' recusada pelo banco: loga o CÓDIGO…» |
| M6 | a recusa da linha `falhou` volta a ser silenciosa | reprova o teste de C6 da falha | ✅ «upsert 'falhou' recusado pelo banco: loga o código» |
| M7 | o log da marca volta a carregar a `message` do banco | reprova a asserção de REDAÇÃO | ✅ mesmo teste da M5, pela asserção de ausência da mensagem |

**Nenhum portão passou incólume, e cada um reprovou a cláusula NOMEADA** — não «o smoke ficou vermelho». É a lição que o 49-10 pagou para aprender (um portão vermelho pelo motivo certo apontando para o lugar errado), aplicada aqui de saída.

## Varredura de portões (D-56 / CLAUDE.md §«Portões»)

Padrão exato do CLAUDE.md, re-rodável:

```bash
grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql
```

**310 linhas em 45 arquivos — DELTA ZERO** contra o fecho do 49-10. Este plano não acrescenta objeto SQL nem smoke, então a varredura de FORMA não tem alvo novo: os portões deste plano são os testes Deno, e a metade que importa do D-56 («provei que morde») está na tabela das 7 mutações acima.

## Varreduras C5 e C6 re-rodadas (D-50)

### C5 — resultado sem modelo real

```bash
grep -rn 'model_version\|modelo_ia\|provider:' supabase/functions --include='*.ts' | grep -v test | grep -v _shared/ai-client
```

**Delta contra a tabela do kickoff — cinco dos oito itens fecharam, este plano fechou o item 1:**

| # | Tabela | No kickoff | Agora |
|---|---|---|---|
| 1 | `analise_candidato_vaga` | **defeito** (sem coluna de modelo) | ✅ **fechado neste plano** — `provedor_ia`/`modelo_ia` gravados |
| 2 | `comparativo_solicitado` | defeito | ✅ fechado (49-08) |
| 3 | `entrevista_guias` | defeito | ✅ fechado (49-24) |
| 4 | `entrevista_analises` | defeito | ✅ fechado (49-10) |
| 5 | `redacoes_candidato.model_version` | defeito (gravava o configurado) | ✅ fechado (49-09) — `model_version` = `result.model` |
| 6 | `scores_candidato` tipo `sjt` | defeito fora da lista do D-28 | ✅ fechado (49-23) |
| 7 | `devolutivas_candidato.modelo_ia` literal | escopo deliberado enquanto a IA está desligada | **segue literal** (`:565`), IA desligada grava `null` = verdade. Item aberto do 48-19, **fora desta fase** — confirmado intocado |
| 8 | `ResolvedPrompt.fallback_model_id` ignorado | defeito de contrato, P1 fora | **segue** — já em `WINDOWS.md` pelo 49-02 |

### C6 — escrita de EF sem erro destruturado

```bash
grep -rnE "^\s*await supabaseAdmin\.from\([^)]*\)\.(insert|upsert|update)\(" supabase/functions --include='*.ts' | grep -v __tests__ | grep -v '\.test\.'
```

**ZERO linhas.** Eram 11 no kickoff (itens 4, 5 e 6 da tabela C6), e as duas últimas — `analise-candidato-individual:301,602` — fecharam neste plano. O portão é re-rodável e agora sai vazio no repositório inteiro.

## Medições vivas (D-49 / D-51) — o plano não foi ajustado para caber

| O que o plano assume | Medido em PROD / no disco (2026-09-23) | Bate? |
|---|---|---|
| **Precondição:** 49-01 em PROD (`provedor_ia`/`modelo_ia` existem) | as duas presentes, `text`, nuláveis | sim |
| **Precondição:** 49-02 no disco (`CallAiResult.model`) | `ai-client.ts:315` com o docblock do D-28 | sim |
| CHECK de `provedor_ia` com vocabulário fechado | `NULL | 'anthropic' | 'openai'` — **igual ao de `entrevista_analises`** do 49-10 | sim |
| C5 #1: `analise_candidato_vaga` sem coluna de modelo preenchida | 25 linhas, `provedor_ia` e `modelo_ia` em **0** delas | sim |
| C6 #6: 2 escritas sem erro checado em `:301,602` | exatamente essas 2 | sim |
| fechamento do `analise-schemas.ts` importando `comparativo-config.ts` se o 49-08 estiver no disco | **está** — 11 arquivos no fechamento, não 10 | sim |
| `VERIFY_JWT['analise-candidato-individual'] = false` | `false`, e o deploy confirmou por readback | sim |
| `VERIFY_JWT['gerar-devolutiva-bigfive'] = false` | `false`, idem | sim |
| a devolutiva com a IA desligada | `PERSONALIZACAO_IA_ATIVA = false` (`:99`), 7→7 no bundle | sim |
| `tsc` = 89, teto 90 | **89**, conjunto de mensagens idêntico | sim |
| varredura de portões estável | 310 / 45, delta zero contra o 49-10 | sim |
| «`consolidar-decisao-final` ainda no contrato antigo» (briefing) | **NÃO bate** — ela não embarca o `ai-client`; ver Deviation 4 | **não** |

Extra, medido porque a decisão dependia dele: os dois retornos `provider: 'none'` do `ai-client` (`:712-726` teto de custo, `:760-773` injeção) vêm **os dois** com `flagged_for_human_review: true`, e o guard da EF em `:496` lança antes do upsert final. É isso que torna `provedorDeResultado()` redundante HOJE — e é isso que está registrado no docblock dela, para ninguém a remover achando que é código morto.

## Deviations from Plan

### Auto-corrigidas

**1. [Regra 2 - Correção crítica ausente] O log do ramo de EXCEÇÃO ainda podia vazar valor de coluna**

- **Found during:** Task 1, ao destruturar o `error` da marca `pendente`
- **Issue:** o plano manda logar `error.code` «pelo mesmo `console.error` redigido (sem texto, sem nome)». O caminho `{ error }` ficou com o código, como pedido. Mas o `catch` que já existia logava `marcaErr.message` — e uma mensagem de erro do Postgres pode embutir valor de coluna (uma violação cita o valor). Esta tabela guarda `resumo_cv`, que é texto do currículo do titular. Deixar a `message` ali seria fechar metade da porta e chamar de fechada.
- **Fix:** o ramo de exceção passa a logar a CLASSE da exceção (`marcaErr.name`) e `error_code: null`, com comentário inline explicando que a `message` saiu de propósito. Mesmo tratamento no `catch` externo da linha `falhou`.
- **Files modified:** `supabase/functions/analise-candidato-individual/index.ts`
- **Verification:** a asserção de redação dos dois testes de C6 (`!JSON.stringify(dados).includes(...)`), e a mutação **M7** prova que ela morde.
- **Committed in:** `7397524b`
- **Custo reconhecido:** perde-se o texto da exceção de transporte no diagnóstico. A classe (`TypeError`, `AbortError`) distingue os casos que importam sem carregar conteúdo do titular, e o código do banco — que é o caso comum — continua registrado no outro ramo.

**2. [Regra 2 - Correção crítica ausente] `modelo_ia` acrescentado ao log de sucesso**

- **Found during:** Task 1, Passo 2
- **Issue:** o `console.log("[analise] ok", …)` levava `provider` mas não o modelo. Com `provider` sozinho, um fallback aparece no log como `openai` sem dizer QUAL modelo — e as três EFs irmãs desta fase (49-08/09/10) todas logam o modelo ao lado do provedor. Um log que não permite ver o fallback sem consultar a tabela é metade do conserto.
- **Fix:** `modelo_ia: result.model` no log, com comentário registrando que um id de modelo não é dado do titular (não viola o Pitfall 7).
- **Files modified:** `supabase/functions/analise-candidato-individual/index.ts`
- **Verification:** visível na saída dos testes (`modelo_ia: "claude-sonnet-4-6-20260215"`); `key_links` do plano passa a casar em 2 lugares.
- **Committed in:** `7397524b`

### Registradas (de processo, sem alteração de artefato)

**3. [Processo] Cada EF foi deployada DUAS vezes, com os mesmos bytes**

- **Found during:** verificação das duas tasks
- **Issue:** o `<verify>` #2 de cada task **contém o próprio comando de deploy**. Executá-lo literalmente depois de já ter deployado na `<action>` produz uma versão nova com bundle idêntico: análise v30 → **v31**, devolutiva v28 → **v29**.
- **Decisão:** rodar os dois literalmente, e registrar as quatro versões. A alternativa — declarar equivalência e não rodar — deixaria o portão do plano sem execução literal, que é pior do que dois números de versão a mais. Bundle idêntico conferido pelo tamanho dos 11/9 arquivos no `--dry-run` das duas execuções.
- **Verification:** readback pela Management API nas quatro versões; marcadores idênticos.
- **Committed in:** n/a

**4. [Processo] O briefing deste plano afirmava uma oitava EF pendente que não existe**

- **Found during:** Task 2, ao montar a tabela das 7
- **Issue:** o briefing de execução dizia que `analise-candidato-individual`, `gerar-devolutiva-bigfive` **e `consolidar-decisao-final`** estavam no contrato antigo. As duas primeiras estavam; a terceira **não embarca o `ai-client`** — `grep "_shared/"` no fonte dela não devolve nada e `callAi` aparece 0 vezes. O bundle vivo dá 0/0/0 porque ela nunca teve o contrato, não porque falta sincronizar.
- **Fix:** o conjunto das 7 foi **calculado** por fechamento de imports (o mesmo algoritmo do `efdeploy.cjs`) sobre as 20 EFs do repositório, em vez de copiado de uma lista. A afirmação foi corrigida aqui e no `STATE.md`, sem ficar de pé — é a lição do 49-10 sobre registro plausível que ninguém mediu.
- **Verification:** conjunto = exatamente 7; `consolidar-decisao-final` fora, com a medição registrada.
- **Committed in:** n/a

**5. [Processo] O portão de realimentação do tracer re-executou o `<verify>` #2 por EQUIVALÊNCIA**

- **Found during:** portão do tracer, depois do commit da Task 1
- **Issue:** o portão manda re-rodar o `<verify>` do tracer de ponta a ponta. O `<verify>` #2 dele **deploya**; re-rodá-lo uma terceira vez produziria uma v32 sem nenhuma informação nova.
- **Fix:** o `<verify>` #1 (`deno test`) foi re-executado LITERALMENTE (18/0). Para o #2, re-executei as três ASSERÇÕES que ele faz, todas por leitura: `ai-error-codes.ts` no fechamento (`--dry-run` = 1), `version=31 status=ACTIVE verify_jwt=false` pela Management API, e marcador `modelo_ia` = 9 no bundle. Modo auto **desligado** (`auto_advance: false`, `_auto_chain_active: false`), `human_verify_mode` no default `end-of-phase` e o `<verify>` do tracer é só automatizado ⇒ o portão não vira checkpoint.
- **Verification:** as três asserções verdes; `⚡ Tracer verificado de ponta a ponta — expandindo`.
- **Committed in:** n/a

---

**Total deviations:** 5 — **2 auto-corrigidas** (as duas de Regra 2) e 3 de processo. A Deviation 4 é a mais útil: ela retira uma pendência que não existia, e o instrumento que a pegou foi calcular o conjunto em vez de confiar na lista.
**Impact on plan:** nenhum no escopo nem na interface. A 1 estreita um log existente (custo reconhecido acima), a 2 acrescenta um campo a um log.

## Issues Encountered

- **`tsc` segue em 89 com teto 90 (D-53): margem de UM.** Este plano não acrescentou nenhum erro — o **conjunto de mensagens** foi diffado (arquivo ordenado antes × depois) e é **idêntico**, não só a contagem. O aviso vale para os 12 planos restantes da fase, e a parte operacional continua sendo: **diffar o CONJUNTO**, porque a baseline congelada do hook de pre-commit é 96 e ela não pega o 90º erro. Os arquivos tocados aqui são Deno/EF, fora do `include` do `tsconfig.json`, então o risco deste plano era estruturalmente zero.
- **`resend-webhook.test.ts` continua abortando ao resolver `npm:svix@1.99.1`** — pré-existente, fora de escopo, já em `WINDOWS.md`. Excluído da rodada da suíte completa (junto com `strict-schema`, pela mesma razão histórica), e **não** «consertado».
- **`efdeploy.cjs` continua afirmando uma trava que não implementa.** O cabeçalho (`:14-18`) diz que o script recusa subir se o fechamento divergir de uma lista esperada; não há lista esperada no código. É item **aberto** do 48-19, e é exatamente por isso que a conferência do fechamento da devolutiva foi feita À MÃO neste plano, contra a lista extraída do bundle vivo. Não consertado aqui (fora de escopo), mas a consequência prática está registrada: sem a conferência manual, um `_shared` a menos subiria em silêncio.
- **As 25 análises vivas seguem com `provedor_ia`/`modelo_ia` NULL.** Por decisão medida (D-30): a proveniência delas não é recuperável, e NULL é a verdade — inventá-la seria pior que registrar que não se sabe. Não há escrita retroativa neste plano.

## Deferred (registrado, não consertado)

| Item | Por quê fica fora | Onde ficou registrado |
|---|---|---|
| `cv_job_match` com `max_tokens` a 79 % da maior saída medida | o plano proíbe explicitamente mexer em `max_tokens` aqui («Nenhum `max_tokens` é alterado»); e a taxonomia do 49-02 é justamente o que passa a dizer se a causa é teto ou tempo | `must_haves` do plano; varredura C9 do 49-02 |
| D-37: a análise da triagem sobrescrita ao reprocessar (sem append por etapa) | §Deferred do plano; o append por etapa foi feito só na análise de ENTREVISTA (49-10) | `must_haves` do plano; confirmado por `onConflict` inalterado |
| `devolutivas_candidato.modelo_ia` literal ao RELIGAR a personalização | item aberto do 48-19, fora desta fase; hoje a IA está desligada e a linha grava `null`, que é verdade | `48-consertos-da-jornada-bloco-1/deferred-items.md:139` |
| fiação do `Deno.serve` da devolutiva com a IA desligada sem teste | item aberto do 48-19 (LOW); o mesmo `if` sobre a mesma constante do handler, que É testado | `48-.../deferred-items.md:134` |
| cabeçalho do `efdeploy.cjs` afirmando trava inexistente | item aberto do 48-19; mitigado neste plano pela conferência manual do fechamento | `48-.../deferred-items.md:129` |

## Known Stubs

**Nenhum.** Não há componente, valor vazio codificado, texto de placeholder nem fonte de dados não ligada. A EF grava a proveniência REAL no mesmo instante em que grava o conteúdo, e o teste a assere campo a campo com uma fixture que DISCRIMINA o modelo real do configurado.

Duas coisas que PARECEM stub e não são, com a medição que sustenta cada uma:

- **`provedorDeResultado()` é redundante na fiação atual** — e fica, de propósito. Não é código morto por descuido: o docblock registra a medição (os dois retornos `'none'` do `ai-client` vêm com `flagged_for_human_review: true` e o guard da EF em `:496` lança antes) e a razão (a coluna tem vocabulário FECHADO e o `error` do upsert final É checado, então um `'none'` que chegasse ali transformaria uma análise CORRETA em linha `falhou`).
- **As 25 análises vivas com as duas colunas NULL** — decisão medida (D-30), não fiação faltando. A proveniência delas não é recuperável.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. Nenhum endpoint novo, nenhum caminho de auth alterado, nenhuma mudança de esquema. As quatro mitigações declaradas ficaram provadas:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-11-01 (análise de fallback sem proveniência) | mitigate | `provedor_ia`/`modelo_ia` no upsert final, com o teste DISCRIMINANDO real × configurado; mutações M1 e M2 mordem |
| T-49-11-02 (escrita falha silenciosa na marca / na falha) | mitigate | as duas destruturam o `error` e logam o CÓDIGO; 2 testes com asserção de redação; mutações M5, M6 e M7 mordem; o `grep` da C6 sai vazio |
| T-49-11-03 (redeploy com `verify_jwt` trocado) | mitigate | tabela `VERIFY_JWT` do `efdeploy.cjs` (nenhuma flag de override usada); `verify_jwt=false` lido de volta pela Management API nas duas EFs, e os 7 valores da tabela das EFs conferidos contra a tabela do script |
| T-49-11-SC (supply chain) | mitigate | **zero instalação de pacote**; nenhum import novo (o `ai-error-codes.ts` que entrou no bundle é arquivo do repositório, com contrato de zero imports do 49-02) |

**Uma propriedade de privacidade REFORÇADA que o plano não previa:** o log de exceção da marca deixou de poder carregar a `message` de um erro de banco — que pode embutir valor de coluna numa tabela que guarda `resumo_cv`. Não é risco novo; é risco pré-existente fechado (Deviation 1).

## User Setup Required

**Nenhum.** Nenhuma configuração de serviço externo, nenhuma variável de ambiente nova, zero instalação de pacote. O token do Supabase já estava no Keychain (serviço "Supabase CLI", conta "supabase"), usado pelo `efdeploy.cjs` e pelo `p46apply.cjs sql`.

**Nada pendente do operador.** O `git push origin main` **passou na primeira tentativa** (`9fb507d5..7397524b`), e `git log --oneline origin/main..HEAD` sai **vazio** — o que o `<verify>` #2 da Task 2 exige por `test -z` e só passa se for verdade.

⚠ **Uma pendência HERDADA do 49-10 que este plano não fecha:** o SUMMARY do 49-10 registra que os apontamentos de blocker abertos em `STATE.md` e `WINDOWS.md`, durante a janela em que o push dele estava negado, **devem ser fechados** — a afirmação deixou de ser verdadeira quando a segunda tentativa passou. Não foi feito aqui porque é registro de outro plano e mexer nele às cegas é como a afirmação falsa nasceu. Fica nomeado para o fecho da fase.

## Next Phase Readiness

**Pronto para os planos que dependem deste** (`affects`):

- **`49-12`** (marcação retroativa) herda a medição: 25 análises em `analise_candidato_vaga`, todas `sucesso`, `provedor_ia`/`modelo_ia` em zero delas. Se ele decidir marcar retroativamente algo aqui, o conjunto está medido e o checkpoint do operador (D-54) é o caminho.
- **`49-15`** (tela do admin de logs de IA) tem agora **todas as sete** EFs escrevendo a taxonomia nova em `ai_call_logs` — antes deste plano, duas ainda escreviam pelo cliente antigo, e uma tela correta mostraria «Sucesso» verde para um fallback. O contrato de zero imports do `ai-error-codes.ts` segue intacto no bundle das sete.
- **`49-16` e `49-22`** (selo de proveniência na tela e no PDF) podem ler `analise_candidato_vaga.provedor_ia`/`modelo_ia` para as análises NOVAS. ⚠ Para as 25 antigas os campos são NULL, e a tela precisa dizer «não registrado» em vez de omitir — omitir torna «modelo desconhecido» indistinguível de «Sonnet».
- **`49-18`** (`p49_prova_prod`) ganha alvo: `analise_candidato_vaga` passa a ter duas colunas cujo preenchimento é asserível por consulta (`count(*) where status='sucesso' and modelo_ia is null` deve parar de crescer a partir da próxima análise). ⚠ **E o valor tem de ser lido como baseline da execução, nunca comparado com constante** — hoje são 25 e amanhã são 26; um `IS DISTINCT FROM 25` seria exatamente a fotografia que o CLAUDE.md §«Portões» proíbe.

**Atenção para os planos seguintes:**

1. **`tsc` em 89 com teto 90 — margem de UM**, e a baseline congelada do hook (96) **não** pega o 90º. Diffar o conjunto de mensagens, não a contagem.
2. **As sete EFs de IA estão sincronizadas com o `_shared` do disco.** Quem editar `_shared/ai-client.ts`, `audit-logger.ts` ou `ai-error-codes.ts` daqui para frente **dessincroniza as sete de uma vez** — e o sintoma (proveniência NULL na tabela de resultado) é idêntico ao de uma coluna que ninguém preencheu. Esse é o custo do bundle por fechamento de imports, e ele agora é de sete EFs.
3. **O `efdeploy.cjs` não confere o fechamento contra lista esperada**, apesar do que o cabeçalho dele diz. Conferir à mão, contra a lista extraída do bundle vivo (`strings -a <bundle> | grep -oE 'functions/...'`), é o procedimento que este plano usou.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `supabase/functions/analise-candidato-individual/index.ts` — FOUND (modificado)
- `supabase/functions/analise-candidato-individual/__tests__/index.test.ts` — FOUND (modificado)
- commit `7397524b` — FOUND em `git log --all`
- `commits: 1` **MEDIDO** por `git rev-list --count 9fb507d5..HEAD`, não narrado; `plan_head_before` registrado no `actuals`. O `0` não se aplica: há 1 commit de produção e a árvore está limpa (`git status --short` vazio antes do commit de metadado), nenhuma deleção (`git diff --diff-filter=D` vazio), nenhum arquivo untracked
- `must_haves.artifacts`: `index.ts` contém `modelo_ia` (6 ocorrências) ✅
- `must_haves.key_links`: padrão `modelo_ia:\s*result\.model` = **2** ✅
- `<acceptance_criteria>` da Task 1 re-executados: upsert final com as duas colunas ✅ · marca `pendente` sem tocá-las ✅ · as duas escritas antes silenciosas logando o erro ✅ (testes) · EF com `verify_jwt=false` ✅ · fechamento com os `_shared` do 49-02 ✅ · marcador no bundle ✅
- `<acceptance_criteria>` da Task 2 re-executados: `deno test` da devolutiva 16/0 sem edição ✅ · v29 ACTIVE `verify_jwt=false` com `ai-error-codes.ts` no fechamento ✅ · tabela das 7 EFs com a versão viva no SUMMARY ✅ · `origin/main..HEAD` vazio ✅
- `<verification>` de plano re-executada: `deno test` das duas EFs verdes (18/0 e 16/0), duas EFs deployadas com `verify_jwt=false` lido de volta, `origin/main..HEAD` vazio
- 7 mutações, **todas** mordendo a cláusula NOMEADA; arquivo restaurado e conferido (320/5 no `git diff --stat`, `deno test` de volta a 18/0)
- varreduras C5 e C6 re-rodadas (D-50): C5 item 1 fechado por este plano, C6 **sai vazia** no repositório
- varredura de FORMA dos portões: 310 / 45, delta zero
- `npm run lint` = **89**, conjunto de mensagens **idêntico** por `diff` do set ordenado
- `git log --oneline origin/main..HEAD` **vazio**; `origin/main` = `HEAD` = `7397524b` (push na PRIMEIRA tentativa)
- **Todos** os critérios de aceite do plano satisfeitos.
