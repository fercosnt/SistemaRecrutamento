---
phase: 47-transpar-ncia-consolida-o
plan: 02
subsystem: database
tags: [rpc, security-definer, rls, lgpd, historico, consol-02, visrh-03, smoke-sql]

requires:
  - phase: 06-pipeline-backbone-schema
    provides: "public.historico_candidatura — a trilha append-only de transições, com `ator` FK de auth.users(id) (D-09)"
  - phase: 32-hardening-rls
    provides: "a policy rh_le_historico VAGA-SCOPED (WR-04) — o predicado que esta RPC reimpõe no corpo"
  - phase: 43-retencao-configuravel
    provides: "listar_matriz_retencao + o fix do 42804 — o molde de FORMA (guard NULL-safe, ordem REVOKE/GRANT→DO→COMMENT) e o defeito de cast que este plano existe para não repetir"
  - phase: 45-motor-de-exclusao
    provides: "a severação de historico_candidatura.ator — a origem do resíduo declarado (D-47-U09)"
provides:
  - "supabase/migrations/20260809000001_p47_listar_historico_candidatura.sql — a RPC de leitura, ESCRITA e NÃO aplicada"
  - "public.listar_historico_candidatura(uuid) — STABLE SECURITY DEFINER que devolve o RÓTULO do ator como text, nunca o uuid"
  - "supabase/tests/p47_historico_smoke.sql — a espec executável do CONSOL-02, 6 asserções + contador"
affects: [47-07-historico-service, 47-08-uat]

actuals:
  tokens: 14586
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Guard de forma NO PRÓPRIO APPLY: um `DO` block que lê `pg_get_functiondef` e REPROVA a migration quando a chave de junção ou o cast vêm errados — a classe de defeito que deixa a suíte verde é barrada antes de existir tela"
    - "Predicado de escopo expresso inteiro no `ON` do `EXISTS`, sem `WHERE`, para que a única cláusula `WHERE` do arquivo venha depois da condição de deleção do `LEFT JOIN` (legibilidade para leitor e para guard automático)"
    - "Asserção de caminho feliz que MONTA a própria fixture em subtransação revertida quando o banco vivo não oferece o caso — nunca é pulada"

key-files:
  created:
    - supabase/migrations/20260809000001_p47_listar_historico_candidatura.sql
    - supabase/tests/p47_historico_smoke.sql
  modified: []

key-decisions:
  - "A junção é `usuarios_rh.user_id = historico_candidatura.ator`, NÃO a do precedente `listar_matriz_retencao` — e a diferença é travada por leitura de catálogo no apply, não por revisão"
  - "`nome_completo::text` explícito, mais os quatro rótulos literais também com `::text` — o 42804 desta coluna já foi shippado uma vez neste repositório"
  - "O escopo por vaga do `rh_le_historico` é COPIADO para o corpo, não reinventado — DEFINER bypassa a RLS e a regressão seria silenciosa na UI"
  - "O guard de papel é `IS DISTINCT FROM` e é o ÚNICO controle contra o candidato, porque `candidato_le_proprio_historico` continua viva no banco"
  - "O `DO` block é de CATÁLOGO, não de fixture: montar candidato+candidatura+RH dentro da migration custa mais do que vale, e o caminho feliz com dado real é o smoke"
  - "O resíduo da severação da Phase 45 é ACEITO e ESCRITO no `COMMENT` (D-47-U09), não corrigido por um 5º rótulo que vazaria o exercício do direito de exclusão"

requirements-completed: [CONSOL-02]

coverage:
  - id: D1
    description: "A RPC resolve o nome do recrutador no servidor e devolve rótulo de texto — o uuid do ator nunca sai da função"
    requirement: CONSOL-02
    verification:
      - kind: other
        ref: "guard automático do plano sobre o arquivo (junção, cast, ordem dos ramos, guard NULL-safe, sem wrapper de transação) → OK"
        status: pass
      - kind: integration
        ref: "supabase/tests/p47_historico_smoke.sql#(a) — chamada autorizada devolve ≥1 linha com rótulo IGUAL a um nome_completo real"
        status: pending
        note: "PENDENTE DE EXECUÇÃO: exige o apply da migration, que é checkpoint do orquestrador. Este plano é write-only por desenho."
      - kind: integration
        ref: "supabase/tests/p47_historico_smoke.sql#(d) — nenhum rótulo com forma de uuid, vazio ou nulo"
        status: pending
    human_judgment: false
  - id: D2
    description: "As duas armadilhas de forma (junção pelo lado errado, cast ausente) são INAPLICÁVEIS — o apply reprova antes de qualquer tela existir"
    requirement: CONSOL-02
    verification:
      - kind: other
        ref: "`DO $verifica_historico$` da migration, condições (a), (b) e (c) — lê pg_get_functiondef e reprova nomeando o medido"
        status: pending
        note: "O bloco é executado NO APPLY. Escrito e verificado por forma; a execução é o checkpoint do orquestrador."
    human_judgment: false
  - id: D3
    description: "O escopo de acesso que a RLS impunha continua valendo depois da troca de tier de controle"
    requirement: CONSOL-02
    verification:
      - kind: integration
        ref: "supabase/tests/p47_historico_smoke.sql#(b) — recrutador fora do escopo da vaga recebe 42501"
        status: pending
      - kind: integration
        ref: "supabase/tests/p47_historico_smoke.sql#(c) — candidato autenticado E chamador sem claim recebem 42501"
        status: pending
    human_judgment: false
  - id: D4
    description: "Os quatro rótulos e a ordem load-bearing dos ramos do CASE"
    requirement: CONSOL-02
    verification:
      - kind: integration
        ref: "supabase/tests/p47_historico_smoke.sql#(e) — quatro recortes, um por vez, em fixture revertida"
        status: pending
    human_judgment: false
  - id: D5
    description: "O caminho é de LEITURA: o smoke não deixa estado no banco"
    requirement: CONSOL-02
    verification:
      - kind: integration
        ref: "supabase/tests/p47_historico_smoke.sql#(f) — contagem de historico_candidatura idêntica e zero linha de fixture sobrevivente"
        status: pending
    human_judgment: false

duration: 10min
completed: 2026-08-09
status: complete
---

# Phase 47 Plan 02: A RPC que resolve quem agiu — com as duas armadilhas travadas no apply

**`listar_historico_candidatura(uuid)` passa a resolver no servidor, como RÓTULO de texto, quem agiu em cada transição do Histórico — junção por `usuarios_rh.user_id = historico_candidatura.ator`, `nome_completo::text` explícito, escopo por vaga reimposto no corpo porque `SECURITY DEFINER` bypassa a RLS, e um `DO` block de catálogo que REPROVA o apply se a junção ou o cast vierem errados.**

## Performance

- **Duração:** ~10 min
- **Iniciado:** 2026-08-09T21:43Z
- **Concluído:** 2026-08-09T21:53Z
- **Tarefas:** 2 (1 tracer + 1 auto)
- **Arquivos criados:** 2 · **Modificados:** 0

## Accomplishments

- **A chave de junção certa está no arquivo E está travada mecanicamente.** `historico_candidatura.ator`
  é FK de **`auth.users(id)`** (`20260607000001:43`), não de `usuarios_rh.id`. O precedente que a
  UI-SPEC manda clonar junta por `u.id`, e `usuarios_rh` tem **as duas colunas**, ambas `uuid` — nada
  no tipo denuncia o erro. O clone verbatim faria **zero linhas resolverem**, todas cairiam em
  "Recrutador removido", a tela ficaria plausível e a suíte ficaria verde. A condição (b) do `DO`
  block lê `pg_get_functiondef` e **reprova o apply** se a junção pela PK interna aparecer.
- **O `::text` está lá, e a ausência dele reprova o apply.** `nome_completo` é `varchar(255)` e
  `RETURN QUERY` sob `RETURNS TABLE` exige IDENTIDADE de tipo. Este projeto já shippou este bug nesta
  coluna: `/admin/retencao` não carregou para ninguém desde o apply (`STATE.md:752`). Os quatro
  rótulos literais também carregam `::text`, para que o tipo do `CASE` não dependa de resolução de
  literal desconhecido.
- **O escopo por vaga que a Phase 32 instalou continua valendo depois da troca de tier.** `SECURITY
  DEFINER` bypassa a RLS `rh_le_historico`, que é vaga-scoped desde a WR-04 — e a própria migration de
  origem escreve "DEFINER bypasses row RLS". O predicado foi **copiado** da policy para o bloco 2 do
  corpo. Sem ele a regressão seria invisível: nada mudaria de aparência e um recrutador passaria a ler
  o histórico de vagas alheias.
- **A porta que esta fase abriu está guardada.** `candidato_le_proprio_historico` continua VIVA no
  banco (a Phase 32 declarou que não a tocou), então o `GRANT EXECUTE TO authenticated` põe a função
  ao alcance do candidato. O guard de papel por `IS DISTINCT FROM` é o único controle que impede um
  vazamento de PII de funcionário que **não existia** antes desta fase.
- **O smoke exercita o CAMINHO FELIZ, e é a razão de ele existir.** O smoke da fase que introduziu o
  `42804` passou **10/10** porque a única asserção sobre aquela função testava a recusa sem claim — o
  guard levanta na primeira linha e o `RETURN QUERY` nunca executava. A asserção (a) daqui exige ≥1
  linha com rótulo IGUAL a um `nome_completo` real e, quando o banco vivo não oferece o caso, **monta
  a própria fixture** em subtransação revertida. Ela nunca é pulada.

## Task Commits

Cada tarefa commitada atomicamente, com o hook de pre-commit rodando — **zero `--no-verify`**.

1. **Task 1 (tracer): a RPC, os quatro rótulos e as duas armadilhas travadas no apply**
   - `3647e6e` — `feat(47-02)`: a migration inteira (função + ACL + `DO` block de catálogo + `COMMENT`)
   - `e44f100` — `fix(47-02)`: o gate de `search_path` passa a aceitar as duas grafias normalizadas do
     catálogo (auto-fix, ver Desvios)
2. **Task 2: o smoke — caminho feliz com dado real + as asserções negativas**
   - `78e51c8` — `test(47-02)`: `p47_historico_smoke.sql`, 6 asserções + contador

**Metadados do plano:** commit `docs(47-02)` final.

## Files Created

### `supabase/migrations/20260809000001_p47_listar_historico_candidatura.sql` — **ESCRITA, NÃO APLICADA**

Cabeçalho de migration do M8 com os cinco blocos, **sem wrapper `BEGIN;`/`COMMIT;`**, com o comando de
reconcile do ledger (`supabase migration repair --status applied 20260809000001`) e o `md5(statements[1])`
de conferência de fidelidade. Delimitadores **nomeados** (`fn_historico`, `verifica_historico`) — o par
de cifrões anônimo não aparece literalmente em lugar nenhum, nem em comentário.

`public.listar_historico_candidatura(p_candidatura_id uuid)`, `LANGUAGE plpgsql`, `STABLE`,
`SECURITY DEFINER`, `SET search_path = ''`, referências totalmente qualificadas. `RETURNS TABLE` com
cinco colunas: as duas etapas mantendo o enum `public.etapa_processo` (o componente já as passa pelo
mapa de rótulos do funil), `ator_rotulo text`, `criterio_texto text`, `criado_em timestamptz`.

Corpo, na ordem que é contrato:

1. **Guard de papel, primeiro statement, NULL-safe** — `IS DISTINCT FROM` duas vezes, `42501`. O
   comentário acima registra que o idioma difundido (`NOT IN`) falha **ABERTO** com claim nula (defeito
   real medido na 42-06) e que a policy do candidato continua viva.
2. **Reimposição do escopo por vaga** — `NOT EXISTS` com o predicado copiado de `rh_le_historico`,
   `42501`. Só morde `rh`; `administrador` continua vendo tudo, que é o que a policy diz.
3. **`RETURN QUERY`** com os quatro rótulos: `ator IS NULL` → `'Sistema'` (**primeiro ramo**),
   `ator = cand.user_id` → `'O próprio candidato'`, nome resolvido → `nome_completo::text`, resto →
   `'Recrutador removido'`. `LEFT JOIN public.usuarios_rh u ON u.user_id = h.ator AND u.deleted_at IS
   NULL` — a condição de deleção **no `ON`**, e `ativo` fora do predicado. `ORDER BY h.criado_em DESC
   LIMIT 100`.
4. `REVOKE ALL … FROM PUBLIC, anon` e só então `GRANT EXECUTE … TO authenticated`.
5. **`DO` block de catálogo** com cinco condições, cada uma nomeando o medido: (a) a junção pela coluna
   que aponta para `auth.users`; (b) ⊖ a junção pela PK interna contra o ator; (c) o cast explícito;
   (d) `prosecdef` + `proconfig` com `search_path` vazio; (e) ⊖ ACL sem `PUBLIC` e sem `anon`, com
   `authenticated` em EXECUTE.
6. `COMMENT ON FUNCTION` com a chave e por que ela não é a do precedente, a razão do cast, o escopo no
   corpo, os quatro rótulos com a ordem dos ramos, e o **resíduo declarado** da severação.

### `supabase/tests/p47_historico_smoke.sql` — **ESCRITO, NÃO EXECUTADO**

Docblock declarando em voz alta a lição do smoke 10/10. Estrutura no molde do irmão da Phase 43:
`RESET ROLE` em toda troca de contexto, impersonação por `request.jwt.claims`, contador
`smoke47h.pass` auto-exigido, e um RESUMO (z) que **levanta exceção** quando o total não bate 6.
Asserções (a) caminho feliz com nome real; (b) escopo por vaga → `42501`; (c) candidato **e** chamador
sem claim → `42501`; (d) nenhum rótulo com forma de uuid, vazio ou nulo; (e) os quatro rótulos, um
recorte por vez; (f) contagem de `historico_candidatura` idêntica antes e depois.

## Decisions Made

- **A ordem dos ramos do `CASE` é contrato e está escrita como tal**, no código, no `COMMENT` e na
  asserção (e). Se `ator IS NULL` não vier primeiro, a comparação com o titular avalia NULL, cai no
  `ELSE`, e "Sistema" vira "Recrutador removido" — a colisão da Correção factual 3 reintroduzida por
  ordem de cláusula.
- **O `DO` block é de CATÁLOGO, não de fixture.** Montar candidato + candidatura + usuário RH com todas
  as colunas obrigatórias dentro de uma subtransação da migration custa mais do que vale; o caminho
  feliz com dado REAL é o smoke, que roda contra o banco vivo depois do apply. O que o `DO` block
  precisa garantir é que as duas armadilhas de **forma** não consigam sequer ser aplicadas.
- **`REVOKE ALL … FROM PUBLIC, anon`** — `anon` é NOMEADO, porque o `pg_default_acl` de `public`
  concede EXECUTE a `anon` em todo `CREATE FUNCTION` e o `REVOKE … FROM PUBLIC` sozinho não o remove.
  A asserção (e) do `DO` block é o gate contra a regressão para o idioma incompleto.
- **O `sub` impersonado na asserção (b) é sorteado de propósito.** Um uuid aleatório não pode coincidir
  com o criador da vaga, então a asserção não depende de qual candidatura a fixture escolheu.
- **A saída do smoke não carrega `nome_completo`.** As asserções comparam o nome e reportam apenas se
  bateu — a mensagem de falha nomeia a CLASSE do rótulo esperado, nunca o valor. Um smoke de compliance
  que imprime PII de funcionário no log seria o defeito dentro do gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] O gate de `search_path` reprovaria uma função CORRETA**

- **Encontrado durante:** Task 2 (revisão do `DO` block enquanto o smoke era escrito)
- **Problema:** a condição (d) exigia `'search_path=' = ANY(proconfig)` — igualdade literal. O catálogo
  grava a forma normalizada e pode registrar `search_path=''`. Com a outra grafia, o `DO` block
  **abortaria o apply de uma migration correta**. Um gate que reprova o trabalho certo é pior que gate
  nenhum: ele treina quem executa a desligá-lo (a lição literal registrada no 47-01 e no
  `copyPortoesLgpd.test.ts`).
- **Correção:** `EXISTS (SELECT 1 FROM unnest(proconfig) cfg WHERE cfg ~ '^search_path=(''''|"")?$')`.
  Aceita as duas grafias e continua reprovando a **ausência**, que é o que a condição existe para pegar.
- **Arquivos:** `supabase/migrations/20260809000001_p47_listar_historico_candidatura.sql`
- **Verificação:** guard automático do plano re-executado → OK.
- **Commit:** `e44f100`

### Desvios de forma (documentados, não auto-fixes)

**2. O predicado do escopo por vaga vive INTEIRO no `ON` do `EXISTS`, sem `WHERE`.**
`JOIN … ON` e `WHERE` são equivalentes num inner join, então a semântica é idêntica à da policy
`rh_le_historico`. A forma foi escolhida para que a **única** cláusula `WHERE` do arquivo venha depois
da condição de deleção do `LEFT JOIN` — que é a propriedade que o guard automático do plano mede
(`deleted_at IS NULL` antes do primeiro `WHERE`), e que é a propriedade que importa: no `WHERE`, o
`LEFT JOIN` viraria `INNER` e apagaria justamente as linhas do quarto rótulo. Registrado em comentário
no bloco (4) do cabeçalho, para que ninguém "simplifique" de volta.

**3. A asserção (c) tem DUAS metades, não uma.** O plano pede o candidato autenticado; foi acrescentada
a metade **sem claim nenhuma**. É a asserção que fecha o defeito NULL-cego sistêmico da 42-06 — um
guard por `NOT IN` passaria por (b) em verde e reprovaria só aqui. Sem ela o smoke provaria que o guard
recusa um papel errado, não que ele **guarda**.

**4. A asserção (d) monta fixture própria** (duas linhas: uma que resolve, outra que não), em vez de
inspecionar só o dado vivo. Sem isso a asserção passaria por VACUIDADE quando a candidatura escolhida
tivesse poucas transições — e uma asserção vacuosa é o mesmo falso verde que este arquivo repudia.

**5. Os quatro rótulos literais carregam `::text` explícito**, não só o `nome_completo`. O plano exige o
cast sobre o nome; estender aos literais tira do caminho qualquer dependência de resolução de tipo
`unknown` no `CASE`, num arquivo cuja premissa é que o `42804` desta forma já foi shippado uma vez.

**6. O portão de tracer foi satisfeito pelo `<verify>` automatizado, não por checkpoint humano.**
O plano declara `autonomous: true`, não tem nenhuma tarefa `checkpoint:*`, e o artefato do tracer é uma
**migration não aplicada** — não há nada que um humano pudesse verificar antes do apply, que é
explicitamente checkpoint do orquestrador e proibido nesta wave. Emitir um `checkpoint:human-verify`
aqui seria pedir verificação de algo inverificável; o `<verify>` do tracer foi re-executado
end-to-end e passou antes de a Task 2 começar.

---

**Total de desvios:** 1 auto-fix (bug num gate) + 5 desvios de forma documentados.
**Impacto no plano:** nenhum scope creep. As adições são todas endurecimento de asserção; nenhuma
relaxa o contrato.

## Issues Encountered

- **Nada foi aplicado, executado nem deployado.** Zero `supabase db push`, zero `apply_migration`, zero
  `execute_sql`, zero MCP chamado por este executor, zero contato com PROD. O plano é write-only por
  desenho, e a regra de wave do M8 proíbe misturar escrever uma migration com aplicá-la.
- **Precondição verificada antes de qualquer escrita:** `usuarios_rh` tem `id`, `user_id`,
  `nome_completo`, `ativo` e `deleted_at` (`database.types.ts:4216-4234`). O predicado do `LEFT JOIN`
  foi escrito contra o que foi medido, não contra o que o plano assumia.
- **O smoke pressupõe um chamador com privilégio de escrita na trilha** para montar as fixtures
  revertidas (as asserções (a) fallback, (d) e (e) inserem em `historico_candidatura`). O canal previsto
  é o `execute_sql` do MCP pelo orquestrador, que roda como dono e não é barrado pela RLS. Se o smoke
  for rodado por um papel sem esse privilégio, ele falha **alto** com `42501` na inserção — nunca em
  silêncio.

## Verificação final

| Gate | Resultado |
|---|---|
| Guard automático da migration (junção, cast, ordem dos ramos, guard NULL-safe, sem wrapper, `LIMIT 100`) | **OK** |
| Guard automático do smoke (6 asserções, ≥2 recusas, contagem) | **OK — 6 asserções declaradas** |
| `npm run test:run` | **1725 passed / 176 files** (baseline 1725 — sem regressão) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada 97 — sem regressão) |
| Migrations aplicadas | **0** |
| Smokes executados | **0** |
| Dependências npm novas | **0** |
| `--no-verify` | **0 usos** — o hook rodou e passou nos 3 commits |

## Known Stubs

Nenhum stub de código. **Duas pendências de EXECUÇÃO, ambas por desenho e ambas roteadas:**

| Item | Arquivo | Por quê |
|---|---|---|
| A migration não foi aplicada | `supabase/migrations/20260809000001_p47_listar_historico_candidatura.sql` | O apply é checkpoint do orquestrador (`apply_migration` por MCP), fora de qualquer wave que escreva migration. **O `DO` block só morde no apply** — até lá, as duas armadilhas estão barradas por guard de forma, não por catálogo. |
| O smoke não foi executado | `supabase/tests/p47_historico_smoke.sql` | Exige a função em PROD. É checkpoint do orquestrador por `execute_sql`, numa **única chamada**, depois do apply. Enquanto não rodar, as coberturas D1/D3/D4/D5 continuam `pending`. |

## Threat Flags

Nenhuma superfície além da que o `<threat_model>` do plano já registrou. A superfície nova é **uma**
função exposta a `authenticated` via PostgREST, e as três mitigações críticas (`T-47-02-01`,
`T-47-02-02`, `T-47-02-03`) estão implementadas no corpo e cobertas pelas asserções (b) e (c) do smoke.
`T-47-02-07` continua `accept`, agora **escrito no `COMMENT ON FUNCTION`** em vez de só no plano.

## User Setup Required

Nenhuma. Nenhum serviço externo, nenhuma variável de ambiente, nenhuma dependência npm.

## Next Phase Readiness

- **47-07 (`historicoCandidaturaService`) está desbloqueado no contrato:** a RPC devolve
  `ator_rotulo text` no lugar de `ator uuid`, com as outras quatro colunas idênticas às da
  `HISTORICO_ALLOWLIST` de hoje. O serviço troca o `.from(...).select(...)` por `.rpc(...)`, e o campo
  `ator: string | null` de `HistoricoRow` vira o rótulo já resolvido (nunca nulo).
  ⚠ E o docblock do serviço que hoje afirma *"candidate DB-denied via `rh_le_historico`"* precisa ser
  corrigido: é verdade sobre a montagem da tela e **falso sobre o banco**.
- **Ordem obrigatória para o orquestrador:** apply de `20260809000001` → reconcile do ledger →
  `p47_historico_smoke.sql` em chamada única, exigindo **6 PASS** no RESUMO (z) → só então o 47-07
  encosta no serviço. Ligar a tela antes do smoke reintroduziria exatamente a sequência que produziu o
  `42804` em `/admin/retencao`.
- **Se o `DO` block reprovar o apply**, a mensagem nomeia qual das cinco condições falhou e por quê.
  Reprovar ali é o sistema funcionando: corrige-se a migration, nunca o gate.

## Self-Check: PASSED

Os 2 artefatos declarados existem em disco e os 3 commits de tarefa existem em `git log`. Verificado
por execução, não por leitura.

---
*Phase: 47-transpar-ncia-consolida-o*
*Completed: 2026-08-09*
