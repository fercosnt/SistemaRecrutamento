---
phase: 37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s
plan: 03
subsystem: database
tags: [postgres, supabase, migrations, rls, plpgsql, trigger, idempotencia, smoke-test]

# Dependency graph
requires:
  - phase: 37-01
    provides: "37-SCHEMA-VIVO.md — dump literal do catálogo de PROD; falsificou a 3ª lacuna (idx_notif_retry já existe) e fixou o literal de role `administrador`"
  - phase: 37-02
    provides: "Os dois arquivos reconstruídos que descrevem o estado ANTERIOR à aditiva, e o gate de fidelidade com toggle v_pos_aditiva já codificado para 18 colunas / 6 constraints / 5 índices / 1 trigger por tabela"
provides:
  - "supabase/migrations/20260722000002_p37_notificacoes_lacunas.sql — migration ADITIVA: notificacoes_enviadas.destinatario_original (NOT NULL, sem default) + .modo (NOT NULL DEFAULT 'teste') + ck_notif_modo; public.tocar_atualizado_em() + trg_notificacoes_atualizado_em e trg_config_sla_atualizado_em"
  - "supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql — prova COMPORTAMENTAL: 14 asserções (a..n) + gate de contagem auto-exigido (o)"
  - "Verificação executável de que idx_notif_retry pré-existente continua cobrindo a varredura de retry da P41 — a fase VERIFICA em vez de criar"
  - "Superfície de gravação que a EF da P38 precisa: o par (destinatario_original, modo) que resolverDestinatario()/resolverModo() já produzem"
affects: [37-04, 38, 40, 41]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration ADITIVA com nota de escopo explicando a AUSÊNCIA de um objeto: o cabeçalho registra por que não há CREATE INDEX, para que um leitor futuro não conclua esquecimento"
    - "Prova de trigger de timestamp imune a tempo-de-transação: inserir a linha da fixture com atualizado_em deliberadamente antigo, o que torna 'estritamente maior' verdadeiro em qualquer arranjo transacional e prova que o trigger SOBRESCREVE o valor do cliente"
    - "Gate de contagem AUTO-EXIGIDO via GUC (`smoke37.pass`): a asserção final levanta exceção se o total de PASS não bater, em vez de depender de alguém contar NOTICEs"
    - "Par nega/permite obrigatório em asserção de RLS horizontal: 'não-dono lê 0' sem 'dono lê >= 1' passa trivialmente num bug que nega tudo"
    - "Asserção estrutural sobre objeto PRÉ-EXISTENTE declarada como verificação, com o comentário explicando por que o comportamento não é observável (tabela pequena demais para o planner escolher o índice)"

key-files:
  created:
    - supabase/migrations/20260722000002_p37_notificacoes_lacunas.sql
    - supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql
  modified: []

key-decisions:
  - "A migration NÃO cria índice: idx_notif_retry já existe em PROD na forma btree (proxima_tentativa_em) WHERE status IN ('pendente','falhou'), que é a CORRETA — o predicado parcial já fixa status, então repeti-lo na chave só engordaria o índice. A asserção (m) foi escrita para NÃO exigir status como primeira coluna: uma asserção assim reprovaria a forma boa"
  - "`atualizado_em` é carimbado com pg_catalog.now() (timestamp de transação), coerente com o DEFAULT now() já vivo nas colunas — e não com clock_timestamp(). A prova do trigger foi adaptada ao fato em vez de o fato ser adaptado à prova"
  - "Nenhuma policy nova: o candidato-DENY permanece implícito pelo default-deny e é provado por impersonação real (asserção g). Uma policy PERMISSIVE mal escrita abre acesso; a ausência nunca abre"
  - "Função de trigger SEM SECURITY DEFINER: carimbar coluna da própria linha não requer privilégio elevado, e DEFINER só ampliaria superfície"
  - "Gate provado por 10 sabotagens num Postgres 17.6 descartável, não por revisão de leitura: cada mitigação do threat model foi quebrada e o smoke exigido a pegar"

patterns-established:
  - "Nota de escopo em migration para objetos deliberadamente ausentes — documenta a verificação para que a decisão não seja reaberta por engano"
  - "Suite de negativos scriptada (rebuild → sabotar → exigir vermelho → restaurar) como parte da execução do plano, não como revisão posterior"

requirements-completed: [LEDGER-01, LEDGER-02, LEDGER-03, TIMELINE-01]

# Metrics
duration: 12min
completed: 2026-07-22
---

# Phase 37 Plano 03: Lacunas Aditivas do Ledger de Notificação Summary

**As 2 lacunas REAIS do schema vivo foram fechadas numa migration aditiva — auditoria do modo teste e `atualizado_em` que de fato atualiza — e o candidato-DENY, o escopo por vaga do RH e a idempotência da `dedupe_key` passaram a ser provados por COMPORTAMENTO, com o gate validado por 10 sabotagens num Postgres descartável.**

## Performance

- **Duração:** ~12 min
- **Iniciado:** 2026-07-22T17:37:00Z
- **Concluído:** 2026-07-22T17:49:13Z
- **Tasks:** 2/2
- **Arquivos criados:** 2

## Accomplishments

### Task 1 — `20260722000002_p37_notificacoes_lacunas.sql` (commit `922f25b`)

Migration **aditiva** (nunca editando os arquivos `20260721000001`/`02`, que já constam no ledger de PROD — reescrevê-los seria mentira histórica sobre o que rodou).

**Lacuna 1 — auditoria do modo teste.** `destinatario_original text NOT NULL` **sem default** (a tabela tem 0 linhas: nada a backfillar, e a ausência de default obriga a EF da P38 a gravar o valor explicitamente em vez de herdar um placeholder) e `modo text NOT NULL DEFAULT 'teste'` com `ck_notif_modo CHECK (modo IN ('producao','teste'))`. O default é **fail-safe deliberado**, espelhando `resolverModo()`: um default `producao` faria uma linha mal gravada parecer um envio real. Sem esse par, um envio de UAT desviado para `delivered+<evento>@resend.dev` fica indistinguível de um envio real e a auditoria mente sobre quem *deveria* ter recebido. Nenhuma coluna booleana de desvio — ela é derivável de `destinatario_email <> destinatario_original`, e persistir um derivado cria uma segunda fonte da verdade que pode divergir.

**Lacuna 2 — `atualizado_em` congelado.** `public.tocar_atualizado_em()` (plpgsql, `SET search_path = ''`, `pg_catalog.now()` qualificado, **sem** `SECURITY DEFINER`) + `trg_notificacoes_atualizado_em` e `trg_config_sla_atualizado_em`, ambos `BEFORE UPDATE FOR EACH ROW`. `CREATE TRIGGER` puro, sem `DROP … IF EXISTS`: a seção E do dump prova 0 triggers hoje, e falhar alto contra um trigger inesperado é melhor que substituí-lo em silêncio.

**Lacuna 3 — não existe.** O cabeçalho traz um parágrafo próprio explicando que `idx_notif_retry` **já vive em PROD**, por que a forma viva é a correta (o predicado parcial já fixa `status`, tornando-o redundante na chave), e por que recriá-lo seria ruim nos dois caminhos possíveis (nome duplicado aborta o apply; `IF NOT EXISTS` vira no-op silencioso que mascara divergência de definição). O parágrafo existe para que um leitor futuro **não conclua esquecimento** — os índices foram verificados, não omitidos, e a verificação é executável.

### Task 2 — `p37_lacunas_rls_idempotencia_smokes.sql` (commit `7c94c9d`)

14 asserções comportamentais + gate de contagem. Destaques:

- **(a) idempotência EMPÍRICA:** a mesma `dedupe_key` duas vezes DEVE levantar 23505, e `GET STACKED DIAGNOSTICS` exige que a constraint seja nominalmente `uq_notif_dedupe`. O caminho *sem* exceção é falha explícita — "não deu erro" não prova nada.
- **(b) claim pattern:** `INSERT … ON CONFLICT (dedupe_key) DO NOTHING RETURNING id` devolvendo 0 na chave já reclamada e 1 na inédita — o protocolo exato que o COMMENT da coluna já especifica para a P38.
- **(g) candidato-DENY por impersonação real:** `set_config('request.jwt.claims', …)` com `app_metadata.role = 'candidato'` + `SET ROLE authenticated`, com a linha da fixture **existindo**, exigindo `count(*) = 0` e INSERT negado com 42501. Não consulta `pg_policies` — afirmar "não há policy" prova o catálogo, não o acesso.
- **(h)+(i) par nega/permite:** sem (i), a asserção (h) passaria trivialmente num bug que nega tudo, inclusive ao dono legítimo.
- **(m) verificação estrutural do índice pré-existente**, escrita para **não** exigir `status` como primeira coluna da chave, com o comentário registrando por que o comportamento não é observável (a tabela é pequena demais para o planner preferir o índice num `EXPLAIN`; asserir plano de execução ali produziria um gate que mente nos dois sentidos).
- **(n) cleanup** exigindo `notificacoes_enviadas` de volta a 0 linhas, e **(o)** um gate de contagem **auto-exigido**: cada asserção incrementa o GUC `smoke37.pass` e (o) levanta exceção se o total não for 14. Um run parcial ou todo-SKIP falha em vez de parecer verde.

## Verificação executada (não apenas asserida)

O executor não tem os tools MCP do Supabase, então — seguindo a técnica da 37-02 — a prova foi feita num **Postgres 17.6 descartável** (`supabase/postgres:17.6.1.132`, container criado e **removido** ao fim, zero resíduo, zero contato com PROD), com um bootstrap mínimo Supabase-like (`auth.uid()`/`auth.jwt()`, roles `anon`/`authenticated`/`service_role`, tabelas e enums pré-existentes referenciados pelas FKs e pela policy).

| Verificação | Resultado |
|---|---|
| Bootstrap + as 3 migrations (2 reconstruídas + a aditiva) aplicam num banco vazio | ✅ limpo, sem erro |
| Schema resultante | ✅ **18 colunas · 6 constraints · 5 índices · 1 trigger por tabela** — exatamente o que o toggle `v_pos_aditiva` da 37-02 espera |
| `tocar_atualizado_em()` no catálogo | ✅ `prosecdef = f` · `proconfig = {search_path=""}` |
| Smoke de fidelidade da 37-02 em modo `v_pos_aditiva=true` | ✅ PASS (a)(b)(c)(d) — as asserções afetadas pela aditiva |
| Smoke comportamental deste plano | ✅ **14/14 PASS**, `RESUMO: gate VERDE` |

### Negativos — prova de que o gate não é vazio

Dez sabotagens aplicadas ao banco descartável, cada uma exigindo que o smoke ficasse vermelho **na asserção certa**:

| # | Sabotagem | Threat | Pego por |
|---|---|---|---|
| 1 | `uq_notif_dedupe` removida | T-37-03-03 | ✅ (a) — "a guarda de idempotência está morta (double-send possível)" |
| 2 | Policy permissiva de candidato adicionada | T-37-03-01 / T-37-03-11 | ✅ (g) — "candidato leu 3 linhas — VAZAMENTO de PII de funil" |
| 3 | `trg_notificacoes_atualizado_em` removido | T-37-03-05 | ✅ (e) — timestamps antes/depois idênticos |
| 4 | `ck_notif_modo` removida | T-37-03-04 | ✅ (d) |
| 5 | `idx_notif_retry` trocado por `(status, proxima_tentativa_em)` sem predicado parcial | T-37-03-10 | ✅ (m) — "perdeu o predicado parcial com pendente/falhou" |
| 6 | Literal de role da policy trocado pela forma abreviada | seção D do dump | ✅ (j) |
| 7 | Policy do RH afrouxada, perdendo o escopo por vaga | T-37-03-02 | ✅ (h) — "não-dono leu 3 linhas — o join-through vazou" |
| 8 | Seed de `config_sla_etapa` mutilado | T-37-03-09 | ✅ (k) — "7 linhas (esperado 8)" |
| 9 | `sla_public_read` removida | TIMELINE-01 | ✅ (l) — "anon leu 0 (esperado 8)" |
| 10 | Fixture impossível (candidatos sem `user_id`) | Pitfall 2 do seg33 | ✅ (o) — "2 asserções PASS de 14 — NÃO tratar como verde" |

Controle: rebuild limpo volta a **14/14**.

## Deviations from Plan

### 1. [Rule 1 — Bug latente] `now()` é constante dentro da transação; a prova do trigger foi redesenhada

- **Encontrado em:** Task 2, na modelagem da asserção (e).
- **Problema:** o plano manda capturar `atualizado_em`, dar `pg_sleep(0.05)`, fazer um UPDATE e exigir o valor **estritamente maior**. Mas `now()` é o timestamp de **início da transação** e é **constante dentro dela** — e é `pg_catalog.now()` que o trigger usa (coerente com o `DEFAULT now()` já vivo nas colunas). Se o smoke rodar como uma única transação implícita — que é exatamente o que `execute_sql` faz com um arquivo multi-statement — o `atualizado_em` carimbado no UPDATE seria **igual**, não maior, ao gravado pelo INSERT da mesma transação. A asserção teria ficado **vermelha em PROD por motivo errado**, e a reação natural (afrouxar para `>=`) teria destruído o valor da asserção.
- **Correção:** a linha da fixture nasce com `criado_em`/`atualizado_em` **deliberadamente antigos** (`now() - interval '1 day'`). A comparação estrita passa a valer em qualquer arranjo transacional **e** a asserção fica mais forte: ela prova que o trigger **sobrescreve** o valor vindo do cliente, não apenas que ele existe. O `pg_sleep(0.05)` foi mantido, e o cabeçalho traz um parágrafo explicando a sutileza para quem for mexer no arquivo depois. Em (f) o ponto de partida é o `atualizado_em` do seed (2026-07-21), já no passado por construção. Confirmado pelo negativo 3: com o trigger removido, os dois timestamps saem idênticos e a asserção pega.
- **Arquivo:** `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql` · **Commit:** `7c94c9d`

### 2. [Rule 2 — Correção] Gate de contagem tornado auto-exigido em vez de dependente de alguém contar NOTICEs

- **Encontrado em:** Task 2.
- **Situação:** o idioma do `seg33` (e a instrução do plano) é "gate = CONTAR os PASS". Na prática isso delega ao orquestrador uma contagem manual sobre dezenas de linhas de NOTICE — exatamente o tipo de verificação que se degrada em "não vi erro, então passou". A asserção (o) pedida pelo plano é um `RAISE NOTICE` de resumo, que não falha nada.
- **Correção:** cada asserção incrementa o GUC `smoke37.pass`, e (o) faz `RAISE EXCEPTION` se o total não for exatamente 14. O gate passou a ser executável. Validado pelo negativo 10: com a fixture impossível, o run acumula 2 PASS (as duas asserções que independem de fixture — a estrutural (m) e o cleanup (n)) e **falha em (o)** em vez de terminar em silêncio.
- **Commit:** `7c94c9d`

### 3. [Nota de escopo] `SET ROLE service_role` evitado nos blocos de escrita

- O plano descreve a asserção (a) como executada "como `service_role`". O arquivo usa `RESET ROLE` e o papel de sessão do `execute_sql` (que bypassa RLS pelo mesmo motivo que `service_role`), seguindo literalmente o precedente do `seg33_agendamento_smokes.sql`. Motivo: um `SET ROLE service_role` explícito depende de o papel de conexão do MCP ser membro de `service_role` — uma premissa não verificada que, se falsa, aborta o smoke inteiro no primeiro bloco. O efeito sobre RLS é idêntico e o comportamento provado é o mesmo.

## Threat Flags

Nenhuma. As duas colunas novas não criam endpoint, caminho de auth, acesso a arquivo ou fronteira de confiança nova; a função de trigger não tem privilégio elevado e não é chamável diretamente por `anon`/`authenticated` de forma útil.

## Known Stubs

Nenhum. Os dois arquivos são completos e auto-suficientes.

## O que a 37-04 (checkpoint do orquestrador) precisa fazer

1. **Aplicar** `supabase/migrations/20260722000002_p37_notificacoes_lacunas.sql` via Supabase MCP `apply_migration` (**nunca** `supabase db push --linked` — SQLSTATE 42601) + reconcile do ledger para a version `20260722000002`.
2. **Rodar** `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql` via `execute_sql`. Verde = `RESUMO: 14 asserções PASS de 14 esperadas`. Qualquer outro total é vermelho **por construção**.
3. **Re-rodar** `supabase/tests/p37_fidelidade_schema_smoke.sql` com `v_pos_aditiva := true` — as contagens pós-aditiva (18/6/5/1) já foram confirmadas contra um Postgres real.
4. **Regenerar** `database.types.ts` (`npm run db:types`) — a P40 consome `config_sla_etapa`, e a P38 grava as duas colunas novas.

⚠ Se a asserção **(g)** falhar em PROD, isso é um vazamento de PII de funil, não um problema do smoke — **escalar, não ajustar o gate**. Idem para (h): um "não-dono lê > 0" significa que o join-through da `rh_le_notificacoes` está furado.

⚠ Se o `ALTER TABLE … ADD COLUMN destinatario_original text NOT NULL` falhar, é porque `notificacoes_enviadas` ganhou linhas depois da captura do dump. Isso é **falha desejada** — não contornar com um default: um backfill silencioso inventaria um "destinatário original" que ninguém sabe qual era.

## Nenhum contato com PROD

Este plano é 100% de arquivo. Nada foi aplicado, nada foi re-seedado, nada foi editado retroativamente. Os arquivos reconstruídos pela 37-02 permanecem sem modificação (`git status` limpo para ambos ao longo de toda a execução).

## Verificação do plano

- ✅ A migration aditiva tem as 2 colunas, o CHECK, a função e os 2 triggers — e **nenhum** `CREATE INDEX`
- ✅ O cabeçalho contém a nota explicando por que não há índice (`idx_notif_retry`, seção C do dump)
- ✅ Sem `CREATE POLICY`, `IF NOT EXISTS`, `BEGIN;`, `COMMIT;` nem `SECURITY DEFINER` fora de comentários
- ✅ `20260721000001` e `20260721000002` sem modificação no `git status`
- ✅ Smoke com 16 ocorrências de `PASS` (≥14) e 16 de `RESET ROLE` (≥4), última linha executável = `RESET ROLE;`, `grep -c "'admin'"` = 0
- ✅ `npm run lint` = **97 erros** `tsc` (baseline pré-existente inalterado; teto CI 104); **0** citam arquivos deste plano
- ✅ `npm run build` verde (assert-chunks PERF-03 OK) · `npm run test:run` verde (126 arquivos, **1018 testes**)

## Self-Check: PASSED

Arquivos: `supabase/migrations/20260722000002_p37_notificacoes_lacunas.sql` ✅ · `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql` ✅
Commits: `922f25b` ✅ · `7c94c9d` ✅
