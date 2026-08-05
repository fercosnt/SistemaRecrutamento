---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 07
subsystem: database
tags: [postgres, plpgsql, lgpd, anonimizacao, security-definer, migrations, dry-run, rls]

requires:
  - phase: 44-exporta-o-acesso
    provides: "o inventário do export (`exportAllowlist.ts`, `pii-inventory.yaml`) — o inventário É o plano de exclusão"
  - phase: 45-motor-de-exclus-o-anonimiza-o
    provides: "45-01 (sondas de PROD medidas), 45-02 (`PASSOS_MOTOR` do recibo), 45-03 (as duas RPCs de estado + a EF), 45-04 (o smoke que é a especificação executável), 45-05 (`candidatos.faixa_etaria_materializada`)"
provides:
  - "`candidatos.user_id` nulável com FK `ON DELETE SET NULL` — o ERASE-10 deixa de ser inexecutável"
  - "`public.plano_exclusao_titular(uuid)` — a expressão ÚNICA da qual o dry-run e o delete real saem"
  - "`public.anonimizar_candidato(uuid, boolean DEFAULT true)` — o tombstone, uma transação, dry-run no MESMO corpo"
  - "`SQLSTATE P45DR` como contrato de erro do dry-run"
  - "md5(prosrc) das duas funções, computados do arquivo, para o 45-11 pinar na asserção C3"
affects: [45-10, 45-11, 46-purga, 47-consolidacao]

actuals:
  tokens: 25408
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Dry-run pela MESMA expressão: o corpo completo executa e termina em `RAISE EXCEPTION` com ERRCODE próprio, nunca dois corpos"
    - "Idempotência por ESTADO (o predicado reconhece a sentinela), nunca por try/catch"
    - "Sentinela escolhida contra o catálogo VIVO, nunca contra arquivo de DDL do repositório"
    - "`attnotnull` lido em tempo de execução para cobrir as duas metades de uma FK inexequível"
    - "Bloco `DO` de auto-verificação que exige COMPLETUDE do caminho feliz e reverte por subtransação"

key-files:
  created:
    - supabase/migrations/20260805000004_p45_sever_user_id.sql
    - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql
    - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
  modified:
    - src/__tests__/copyPortoesLgpd.test.ts
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/deferred-items.md

key-decisions:
  - "`candidatos.estado` é PRESERVADA: não existe valor 'removido' válido para a CHECK das 27 UFs, e alterar uma constraint de tabela viva numa fase irreversível é risco maior que o dado retido"
  - "`candidate_ai_decisions`: desidentificar o CONTEÚDO em vez de afrouxar as duas colunas NOT NULL — a fase foi desenhada para conter UMA única migration destrutiva de schema"
  - "O tombstone NÃO escreve em `logs_auditoria`: os dois enums daquela tabela não puderam ser medidos, e um valor inventado abortaria a anonimização no pedido real"
  - "O guard aceita `rh` e `administrador` e recusa 42501 tanto o papel errado quanto o chamador sem claim — contrato fixado pela asserção C2 do smoke"
  - "O scrub de `decisao_final_historico` é o ÚLTIMO statement a tocar o par, depois do UPDATE em `decisao_final`, porque `trg_decisao_final_snapshot` recria a PII no arquivo"

patterns-established:
  - "Re-pin consciente: um pino de teste que vira verdadeiro é re-pinado com a proveniência escrita, nunca com um boolean virado em silêncio"
  - "O token do delimitador de cifrões nunca aparece em prosa, para que a receita de extração do md5 (um `indexOf` ingênuo) pegue o corpo e não um comentário"

requirements-completed: [ERASE-02, ERASE-08, ERASE-09, ERASE-10]

coverage:
  - id: D1
    description: "`candidatos.user_id` passa a aceitar NULL e a FK para `auth.users` é recriada com `ON DELETE SET NULL` (D-45-11 / saída S1)"
    requirement: ERASE-10
    verification:
      - kind: other
        ref: "node guard de forma da Task 1 (DROP NOT NULL + ON DELETE SET NULL presentes; zero ON DELETE CASCADE; zero ALTER nas 3 tabelas da trilha)"
        status: pass
      - kind: other
        ref: "45-SONDAS-PROD.md §6c — a sequência S1 + DELETE FROM auth.users executada em PROD com contagens idênticas antes/depois, revertida"
        status: pass
    human_judgment: true
    rationale: "O `DO` block que assere `attnotnull=false`, `confdeltype='n'` e as DUAS linhas com user_id NULL só EXECUTA no apply, que é do 45-11 e está atrás de code review bloqueante. Até lá o arquivo está verificado por forma, não por execução."
  - id: D2
    description: "`plano_exclusao_titular(uuid)` devolve um jsonb com uma chave por passo de PASSOS_MOTOR, com Storage e Auth marcados `fora_do_banco`"
    requirement: ERASE-02
    verification:
      - kind: other
        ref: "node guard de forma da Task 2 (STABLE/DEFINER/search_path vazio/delimitador nomeado/REVOKE nominal/IS DISTINCT FROM; cada passo do recibo coberto; zero NOT IN em guard)"
        status: pass
      - kind: other
        ref: "checagem de corpo read-only: zero UPDATE/INSERT/DELETE entre os delimitadores"
        status: pass
    human_judgment: true
    rationale: "O `DO` block que chama a função e exige uma chave por passo só executa no apply (45-11). A verificação feita aqui é estática."
  - id: D3
    description: "`anonimizar_candidato(uuid, boolean DEFAULT true)` — tombstone numa transação, dry-run no MESMO corpo com SQLSTATE P45DR, idempotente por estado"
    requirement: ERASE-02
    verification:
      - kind: other
        ref: "node guard de forma da Task 3 (dry-run de corpo único; ordem faixa-antes-de-data_nascimento; 5 severações; zero ALTER/DELETE na trilha; zero CASCADE)"
        status: pass
      - kind: other
        ref: "checagem de aridade de todos os RAISE (placeholders vs argumentos) nas três migrations"
        status: pass
    human_judgment: true
    rationale: "A prova real é o `DO` block que cria fixture completa, exige COMPLETUDE e reverte — e ele só executa no apply do 45-11. Uma sentinela que viola formato só se revela num apply que EXECUTA (Pitfall 1)."
  - id: D4
    description: "As 3 FKs `NO ACTION` da trilha de decisão permanecem intocadas pelas três migrations (ERASE-08)"
    requirement: ERASE-08
    verification:
      - kind: other
        ref: "guards automáticos das Tasks 1 e 3: zero `ALTER TABLE` e zero `DELETE FROM` sobre historico_candidatura/decisao_final/decisao_final_historico, zero `ON DELETE CASCADE`, em conteúdo com comentários removidos"
        status: pass
    human_judgment: false
  - id: D5
    description: "As 5 tabelas `SET NULL` do ERASE-09 recebem statement de severação explícito, com os dois `inet` truncados em vez de anulados"
    requirement: ERASE-09
    verification:
      - kind: other
        ref: "guard de forma da Task 3 — as 5 tabelas presentes; revisão do par network(set_masklen(...))::inet"
        status: pass
    human_judgment: true
    rationale: "O pós-estado das cinco (contagem zero apontando ao titular) é asserção B6 do smoke, que roda no 45-11 contra fixture real. Aqui só a presença dos statements foi verificada."
  - id: D6
    description: "Varredura dos consumidores de `candidatos.user_id` em `src/` que assumiam non-null (custo aceito declarado no D-45-11)"
    requirement: ERASE-10
    verification:
      - kind: other
        ref: "grep de `.user_id` em src/ cruzado com referências a `candidatos` — zero leituras de propriedade; ver §Varredura"
        status: pass
    human_judgment: false
  - id: D7
    description: "Meta-teste do CONSOL-04 re-pinado: a metade Postgres do motor existe e o portão segue vermelho pela metade da EF"
    verification:
      - kind: unit
        ref: "src/__tests__/copyPortoesLgpd.test.ts#o portão do CONSOL-04 mede o disco de verdade, e MENÇÃO não conta como execução"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-08-05
status: complete
---

# Phase 45 Plano 07: A metade Postgres do motor de exclusão — Summary

**Três migrations não-aplicadas que tornam o ERASE-10 executável (`candidatos.user_id` nulável com FK `SET NULL`), definem a expressão única do plano de exclusão, e escrevem o tombstone numa transação com `p_dry_run` no mesmo corpo e `SQLSTATE P45DR` como contrato de erro.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-05T22:49:57Z
- **Completed:** 2026-08-05T23:08:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 criados, 2 modificados)

## Accomplishments

- **O ERASE-10 deixou de ser inexecutável.** `candidatos.user_id` passa a aceitar NULL e a FK para `auth.users` é recriada com `SET NULL` — a cascata que hoje **garante** o pior desfecho da fase (currículo apagado do Storage, irrecuperável, com 100% da PII intacta no banco) vira rede de contenção.
- **Existe uma única expressão que diz o que a exclusão faria**, e o tombstone a CHAMA em vez de copiá-la — com o gate de não-divergência já armado nos dois lados (md5 pinável + `pg_get_functiondef` contendo a chamada).
- **O tombstone completa contra o catálogo VIVO**, não contra prosa: cada sentinela foi escolhida contra as sete CHECKs medidas na SONDA 1, incluindo a sétima (`check_como_conheceu`) que a pesquisa não previu.
- **A armadilha do trigger foi fechada por ORDEM**: o scrub de `decisao_final_historico` é o último statement a tocar o par, depois do `UPDATE` em `decisao_final`, porque `trg_decisao_final_snapshot` recria no arquivo a PII que o statement anterior removeu.
- **Zero apply.** As três migrations existem no repositório e nenhuma tocou PROD.

## Task Commits

1. **Task 1 (tracer): `p45_sever_user_id`** — `5f81fbe` (feat)
2. **Task 2: `plano_exclusao_titular`** — `eab6de0` (feat)
3. **Task 3: `anonimizar_candidato`** — `cfeaeee` (feat)
4. **Desvio: re-pin do meta-teste do CONSOL-04** — `532fef4` (test)

## Files Created/Modified

- `supabase/migrations/20260805000004_p45_sever_user_id.sql` — DDL destrutiva de schema **sem precedente interno**: `DROP NOT NULL` + FK recriada `ON DELETE SET NULL`, com `COMMENT ON CONSTRAINT` carregando os quatro registros (a)–(d) e um `DO` block que prova que o índice UNIQUE aceita **duas** linhas com `user_id NULL`.
- `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql` — `plano_exclusao_titular(uuid)`, `STABLE SECURITY DEFINER`, read-only por contrato **e por corpo**.
- `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql` — o tombstone.
- `src/__tests__/copyPortoesLgpd.test.ts` — re-pin do meta-teste (ver Desvios).
- `.planning/phases/45-.../deferred-items.md` — `DI-45-07-01` (ver Blocos abaixo).

## ⚠ Os md5 para o 45-11 pinar (asserção C3 do smoke)

Computados **do arquivo**, pela receita registrada no cabeçalho do smoke (corpo entre os dois
delimitadores nomeados). O 45-11 os confirma **por execução** contra `md5(prosrc)` do objeto vivo:

| função | `md5(prosrc)` esperado | octetos |
|---|---|---|
| `plano_exclusao_titular` | `58d4a8037d46aa81bc9ff2e2c1884d09` | 8708 |
| `anonimizar_candidato` | `074fa72d2e199c766c35bc5453819044` | 16796 |

E os md5 **do arquivo sem o newline final** (receita medida no 45-06), para conferir
`md5(statements[1])` do ledger depois do apply:

| migration | md5 do arquivo |
|---|---|
| `20260805000004_p45_sever_user_id.sql` | `52ed5dcf8496085908a2cfabd26f0d4d` |
| `20260805000005_p45_plano_e_dry_run.sql` | `4ebf2a996e0dc4899c88bc869bd40b72` |
| `20260805000006_p45_anonimizar_candidato.sql` | `f5cdd23bcef419792e8a8a108c2ab0c8` |

⚠ **Se qualquer uma das três migrations for editada antes do apply, TODOS os valores acima
mudam.** Re-pinar é ato consciente e revisável.

## ⚠ Varredura de consumidores non-null de `candidatos.user_id` (custo aceito do D-45-11)

**Resultado: ZERO leituras de propriedade de `candidatos.user_id` em `src/`.** O custo declarado é
menor que o previsto, e é auditado aqui em vez de descoberto no `tsc`.

| arquivo | como usa | quebra com `string \| null`? |
|---|---|---|
| `src/store/authStore.ts:210` | `.from('candidatos').select('*').eq('user_id', userId)` — **filtro**, não leitura | **Não.** `.eq()` nunca casa NULL: o tombstone simplesmente deixa de resolver perfil. É o efeito **desejado** |
| `src/features/privacidade/services/exportacaoService.ts:231` | rótulo `user_id: 'Identificador da conta de acesso'` | Não — é um mapa de rótulos |
| `src/features/agendamento/services/agendamentoCandidatoService.ts:8` | docblock citando a policy RLS | Não — comentário |
| `src/features/avaliacao/services/redacaoService.ts:12,161` | docblock citando `candidatos.user_id = auth.uid()` | Não — comentário |
| `src/features/explicacao/services/explicacaoService.ts:15,206` | idem | Não — comentário |
| `src/features/cadastro/types/formTypes.ts:143` | comentário | Não |
| `src/store/__tests__/authStore.test.ts` | fixture de teste | Não |

**O que muda de verdade, e já está declarado:** `database.types.ts` (raiz) hoje declara
`candidatos.Row.user_id: string`. Depois do apply, `npm run db:types` o regenera como
`string | null` — e como não há leitura de propriedade, a regeneração **não deve mover a baseline
de 97 erros do `tsc`**. As quatro policies RLS documentadas como `candidatos.user_id = auth.uid()`
deixam de casar para o titular anonimizado: **efeito desejado**, já registrado no
`COMMENT ON CONSTRAINT`.

## Decisions Made

1. **`estado` preservada.** Alternativa recusada e nomeada no `COMMENT`: mexer no `check_estado`
   para admitir uma sentinela. A UF sozinha não re-identifica (27 valores sobre 22 candidatos), e
   o que fecha o vetor de re-identificação é a faixa etária deixar de casar (ERASE-01).
2. **`candidate_ai_decisions`: desidentificar o conteúdo, não afrouxar as colunas.** Mas o corpo
   **lê `attnotnull` ao vivo** — se alguém afrouxar depois, o mesmo statement passa a severar o
   ponteiro. As duas metades do achado M2 ficam cobertas sem reescrita.
3. **Nada é escrito em `logs_auditoria`.** Os dois enums (`categoria_log_auditoria`,
   `severidade_log`) não puderam ser medidos por este plano, e a regra da fase é que nenhuma
   escrita é escolhida por parecer razoável. Efeito colateral favorável: a asserção B4 (re-execução
   acrescenta zero linha de auditoria) fica satisfeita por construção.
4. **`deleted_at` e `ativo` não são tocados** — cinco leituras de RH filtram por `deleted_at`, e um
   soft delete faria a linha sumir de todas em silêncio (Invariante 9 da UI-SPEC).
5. **`decisao_final.por_usuario` e `decisao_final_historico.por_usuario` não são severados:** as
   duas são `NOT NULL` no catálogo vivo e apontam ao RECRUTADOR (a SONDA 6 mediu zero linha de
   titular). Severá-las é impossível sem DDL — registrado como resíduo declarado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A menção do delimitador em prosa quebrava a receita de extração do md5 do 45-11**
- **Encontrado em:** Task 2, ao COMPUTAR o md5 em vez de assumi-lo.
- **Issue:** a receita registrada no smoke é um `indexOf` ingênuo do par de cifrões. O arquivo
  citava `$plano_exclusao_titular$` num comentário **antes** da função, então a extração devolveu
  **273 octetos de prosa** em vez do corpo. O 45-11 teria pinado o md5 de um comentário — e gastado
  a única divergência autorizada da asserção C3 num falso alarme.
- **Fix:** o token do delimitador foi removido da prosa nos dois arquivos, com a razão escrita
  inline. Extração agora devolve 8708 e 16796 octetos, começando em `\nDECLARE` e terminando em
  `END;\n` — exatamente o que `prosrc` vai conter.
- **Verificação:** contagem de delimitadores = **exatamente 2** por token nos três arquivos.
- **Committed in:** `eab6de0`, `cfeaeee`

**2. [Rule 2 - Missing Critical] Severar o ponteiro sem apagar o conteúdo é pseudonimização**
- **Encontrado em:** Task 3.
- **Issue:** o plano listava a severação dos **ponteiros** das 5 tabelas. Mas
  `ai_call_logs.raw_response` (a resposta bruta da IA, que contém trechos do currículo),
  `.parsed_reasoning`, `logs_acesso.email_tentativa` (o endereço digitado),
  `recruiter_alerts.message` e `notificacoes_enviadas.ultimo_erro` continuariam carregando texto
  que **re-identifica sozinho**. A prohibition do plano é literal: *"MUST NOT apresentar
  pseudonimização como anonimização"*.
- **Fix:** cada statement de severação também desidentifica o conteúdo da própria linha,
  respeitando a nullability medida (`raw_response` é `NOT NULL` → marcador jsonb, não NULL).
- **Committed in:** `cfeaeee`

**3. [Rule 2 - Missing Critical] `candidatos.created_by`/`updated_by` bloqueariam o `deleteUser` em conta híbrida**
- **Encontrado em:** Task 3.
- **Issue:** as duas apontam a `auth.users` com `NO ACTION`. A SONDA 6 mediu zero no caminho do
  titular puro — **mas mediu 1 linha bloqueante numa conta híbrida candidato+RH**, e contas
  híbridas existem em PROD. Qualquer ponteiro esquecido produz o 23503 **depois** de o currículo
  já ter sido apagado.
- **Fix:** severança **condicional** (`CASE WHEN … c.created_by = v_user_id THEN NULL ELSE …`) —
  anula só quando aponta ao titular, preservando o registro de quem era RH.
- **Committed in:** `cfeaeee`

**4. [Rule 1 - Bug] `network(...)` devolve `cidr`, não `inet`**
- **Encontrado em:** auto-revisão da Task 3.
- **Fix:** cast explícito `::inet` nos dois mascaramentos, removendo a dependência de um cast
  implícito. E o mascaramento usa `network(set_masklen(...))` e não `set_masklen(...)` sozinho —
  este último preservaria o endereço completo e só mudaria a máscara: mascaramento de fachada.
- **Committed in:** `cfeaeee`

**5. [Rule 1 - Bug] O meta-teste do CONSOL-04 passou a reprovar o comportamento CORRETO**
- **Encontrado em:** ao rodar a suíte depois da Task 3.
- **Issue:** o meta-teste do 45-04 pinava `rpcTombstoneDefinido() === false` com a instrução
  literal *"Se virou true, o 45-07 definiu o RPC de tombstone — confira se o portão do CONSOL-04
  ficou verde sozinho e ajuste este meta-teste."* Ele disparou, **como desenhado**.
- **Conferência exigida pelo próprio teste, e feita:** `motorDeExclusaoExiste()` segue **false** —
  o portão **não** ficou verde sozinho, porque `efExecutaPassosDestrutivos()` segue false (a EF do
  45-10 ainda não chama Storage nem Auth).
- **Fix:** o pino virou `true` **e mudou de natureza** — deixou de registrar ausência e passou a
  ser asserção de **não-regressão**: se voltar a false, alguém apagou ou comentou a definição do
  RPC, e o portão continuaria vermelho pela metade da EF, **escondendo a perda**. A proveniência
  do re-pin está escrita no arquivo. **Zero asserção afrouxada.**
- **Committed in:** `532fef4`

---

**Total deviations:** 5 auto-fixed (3 bugs, 2 missing-critical).
**Impact:** nenhuma expandiu escopo. As duas de *missing-critical* fecham lacunas de
**irreversibilidade** — que é o critério do Art. 12 §1º e a prohibition explícita do plano. As três
de *bug* teriam custado, respectivamente, um pino falso no 45-11, um cast implícito frágil, e uma
suíte com uma falha a mais do que o esperado.

## Divergências entre o PLANO e o CATÁLOGO MEDIDO (implementado contra a medição)

| # | O plano dizia | O catálogo vivo diz | O que foi feito |
|---|---|---|---|
| 1 | "`logs_acesso.ip_address` e `autorizacoes.ip_aceite` são `inet NOT NULL`" | `ip_address` é **NOT NULL**; **`ip_aceite` é NULÁVEL** | Os dois são mascarados (nunca anulados) — o comportamento exigido pela asserção B6 vale para ambos, então a divergência não muda a implementação, mas a premissa era falsa e fica registrada |
| 2 | "cinco statements de severação, um por tabela `SET NULL`" | `candidate_ai_decisions.candidato_id` é `NOT NULL` — a severação é **inexequível** | Cinco statements existem; o dessa tabela desidentifica o conteúdo e severa o ponteiro **condicionalmente**, lendo `attnotnull` ao vivo |
| 3 | "a migration S1 tem de severar **sete** colunas" (§45-SONDAS "O que isto muda no plano") | A **SONDA 6 §6a refutou a própria inferência**: as vinte FKs `NO ACTION` medem **zero linha** para os 21 titulares puros | O motor enumera por conta e trata `23503` como CLASSE; a severança de `created_by`/`updated_by`/`ator` é condicional, não uma lista fixa |

## Issues Encountered

**⚠ BLOQUEADOR PARA O 45-10 — registrado como `DI-45-07-01`, NÃO consertado aqui.**

A EF `executar-direito-titular` (já **deployada em PROD** pelo 45-06) chama as duas RPCs com
`supabaseAdmin` — um client construído com a **service-role key e sem repassar o `Authorization`
do titular** (`index.ts:377-379`, chamadas em `:218` e `:270`). O JWT que chega ao PostgREST é a
própria service key, que **não tem claim `sub`**, logo `auth.uid()` é **NULL** — e as duas RPCs
**já aplicadas em PROD** abrem recusando exatamente isso com `42501`.

**Consequência:** o titular clica "quero excluir meus dados" e **nenhum pedido jamais é
registrado**. Não é defeito deste plano — é do par EF+RPC autorado no 45-03 e deployado no 45-06.

**Por que ninguém viu:** o **G1 está ABERTO**; o fluxo nunca foi exercitado ponta a ponta em
produção e `solicitacoes_dados` segue em 0 linhas. É precisamente a classe de defeito que a
cláusula *"exercitado em produção"* existe para pegar — e a prova de que ela não é formalidade.

As duas funções novas deste plano **herdam o mesmo contrato** (a asserção C2 do smoke exige das
cinco que recusem chamador sem claim), então o 45-10 tem de resolver isto **antes** de o motor
destrutivo ter qualquer chance de rodar. As duas saídas e a recomendação estão em
`deferred-items.md`. **Este plano não afrouxou o guard** — fazê-lo reintroduziria o defeito que a
C2 fecha, numa função que apaga PII irreversivelmente.

### Nota sobre o portão do tracer

A Task 1 é `type="tracer"` e o gate de feedback foi resolvido **por re-execução do `<verify>`**, não
por checkpoint humano: o plano é `autonomous: true`, não contém tarefa `checkpoint:*`, e seu próprio
objetivo argumenta explicitamente que inserir um checkpoint aqui seria re-perguntar uma decisão já
travada (D-45-11) — *"o controle humano que realmente falta — code review bloqueante antes do apply
— está em 45-11, onde ele morde."* Nada foi aplicado a produção, então não há fatia viva a inspecionar.

## Verification

| critério do plano | resultado |
|---|---|
| As três migrations passam os guards automáticos de forma | ✅ os três scripts do plano, sem modificação |
| Cada uma tem `DO` block de auto-verificação do caminho FELIZ com `ROLLBACK` | ✅ (o da Task 1 exercita duas linhas `user_id NULL`; o da Task 3 cria fixture completa, prova a ordem da faixa `35-44`, a idempotência e o `P45DR`) |
| Cada função nova tem `REVOKE … FROM PUBLIC, anon, authenticated` nominal e guard NULL-safe | ✅ |
| **Nenhum apply foi feito** | ✅ zero chamada a `apply_migration`, zero `db push` |
| O SUMMARY registra os md5 e a varredura | ✅ acima |
| `npm run lint` inalterado | ✅ `tsc errors: 97 (frozen baseline: 97)` nos **quatro** commits, **zero `--no-verify`** |
| Suíte | ✅ **1 failed \| 1632 passed** — a única falha é o portão do CONSOL-04 (promessa órfã), exatamente a esperada |

**Verificações adicionais que este plano rodou por conta própria** (o `DO` block só executa no
apply, então a forma teve de ser verificada por outro meio): balanceamento de aspas simples e
pareamento dos delimitadores de cifrão nos três arquivos; **aridade de todos os `RAISE`**
(placeholders vs argumentos) — um descasamento só apareceria em tempo de execução e abortaria o
apply.

## Known Stubs

Nenhum. As três migrations são completas e auto-verificáveis; o que falta é **apply**, que é o
45-11 por desenho, e **não** um stub.

## User Setup Required

Nenhum.

## Next Phase Readiness

**Pronto para o 45-11 (o portão destrutivo):**
- As três migrations, na ordem `…003 → …004 → …005 → …006`. A ordem é **verificada pelo próprio
  arquivo `…006`**, que recusa alto e nomeado se qualquer precondição faltar.
- Os md5 acima, para pinar na asserção C3 e conferir `md5(statements[1])` do ledger.
- A `20260805000004` é o **candidato número 1 a code review bloqueante**: é DDL destrutiva de
  schema sobre tabela viva, sem precedente interno.

**Bloqueios que o 45-11 NÃO pode ignorar:**
1. **G1 continua ABERTO.** `45-SONDAS-PROD.md` é explícito: *"o portão destrutivo do 45-11 NÃO PODE
   ABRIR enquanto o G1 estiver aberto"*.
2. **`DI-45-07-01`** (as claims da EF) tem de estar resolvido, senão o G1 nem consegue ser
   exercitado — é o mesmo defeito visto de dois ângulos.
3. **`NOTIFICACOES_MODO`** tem de ser confirmado no dashboard antes de qualquer smoke que dispare
   e-mail — a SONDA 5 não conseguiu lê-lo por SQL, e o último valor registrado é `producao`.

**Para o 45-10:** o `passo_motor` de Storage e o de Auth vêm marcados `fora_do_banco` no jsonb do
plano — é a EF que os preenche. E a ordem `Storage → Postgres → Auth` **não é imposta pela
plataforma** (SONDA 2, D3): é disciplina do motor, e o modo de falha é silencioso.

---
*Phase: 45-motor-de-exclus-o-anonimiza-o*
*Completed: 2026-08-05*

## Self-Check: PASSED

- Os 3 arquivos de migration e o SUMMARY existem em disco.
- Os 4 commits de tarefa/desvio existem no histórico (`5f81fbe`, `eab6de0`, `cfeaeee`, `532fef4`).
- Nenhum apply: zero chamada a `apply_migration`, zero `supabase db push`, ledger local intocado.
