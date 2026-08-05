---
phase: 45
plan: 04
subsystem: compliance-lgpd
tags: [smoke-sql, espec-executavel, erase-08, erase-10, asseracoes-negativas, gate-guc]
status: complete

requires:
  - "45-01 (SONDAS-PROD: nomes de CHECK vivos, grafo de FK medido, contagens vivas)"
  - "supabase/tests/p43_previa_smoke.sql (molde do cabecalho gate-GUC)"
provides:
  - "supabase/tests/p45_motor_exclusao_smoke.sql — a especificacao executavel do motor, em RED"
  - "contrato de erro: SQLSTATE P45DR para o dry-run de anonimizar_candidato"
  - "contrato de chamada: as 5 funcoes novas recusam chamador sem claim (a EF do 45-10 tem de passar claims)"
affects:
  - "45-07 (a implementacao se corrige contra este arquivo, nunca o contrario; M1 e M2 sao obrigacoes dele)"
  - "45-11 (pina os md5(prosrc) por execucao e roda o smoke ANTES e DEPOIS do apply)"
  - "45-10 (a EF distingue P45DR de erro real; e passa claims, porque o guard recusa sem elas)"

tech-stack:
  added: []
  patterns:
    - "smoke SQL gate-GUC com contador FIXO (smoke45m.pass = 21), executado por MCP execute_sql numa unica chamada"
    - "medir DENTRO da subtransacao, guardar em variaveis PL/pgSQL, reverter, julgar e incrementar FORA (GUC e transacional)"
    - "bloco estrutural sem fixture ANTES de qualquer escrita (licao W-1 da P43)"
    - "survivor-guard (status='rejeitado') como cinto contra dispatch de e-mail, em vez de confiar no rollback"

key-files:
  created:
    - supabase/tests/p45_motor_exclusao_smoke.sql
  modified: []

key-decisions:
  - "B7 assere o invariante MEDIDO do ERASE-08, nao o literal: contagem estrita em historico_candidatura e decisao_final; no arquivo, nao-decrescimento com teto = linhas de decisao_final atualizadas, MAIS zero justificativa identificavel do titular"
  - "B8 escopa o ERASE-10 ao titular anonimizado — a leitura global reprovaria os 22 candidatos vivos e nao diria nada sobre a exclusao"
  - "O smoke pina P45DR como o SQLSTATE combinado do dry-run; o 45-07 implementa contra ele"
  - "O motor NAO e chamavel sem claim (C2 assere a recusa nas 5 funcoes), o que torna 'passar claims' obrigacao declarada da EF do 45-10"
  - "A fixture escreve em auth.users dentro de subtransacao revertida, com o precedente medido da SONDA 6 (§6d, zero residuo)"

requirements-completed: [ERASE-01, ERASE-02, ERASE-08, ERASE-09, ERASE-10]

coverage:
  - deliverable: "Bloco A (A1-A4): as negativas estruturais do ERASE-08/ERASE-09 e a prova da D-45-11, antes de qualquer escrita"
    verification:
      - kind: command
        ref: "node -e guard de forma da Task 1 (tokens + ordem confdeltype < primeiro INSERT INTO)"
        status: pass
    human_judgment: false
  - deliverable: "Bloco B (B0-B10): o caminho FELIZ do tombstone com fixture obrigatoria nas 3 tabelas em zero linhas"
    verification:
      - kind: command
        ref: "node -e guard de forma da Task 2 (tokens + >=10 INSERT INTO; medido 16)"
        status: pass
    human_judgment: false
  - deliverable: "Bloco C (C1-C6) + (z): seguranca, nao-divergencia do dry-run, negativas do encerramento e contador fixo"
    verification:
      - kind: command
        ref: "node -e guard de forma da Task 3 (proacl, 42501, md5(prosrc), pg_get_functiondef, p_dry_run := true, auto_rejeitado, set_config sem claim, v_asserts <>)"
        status: pass
    human_judgment: false
  - deliverable: "As 21 assercoes passam contra o banco vivo (gate VERDE)"
    human_judgment: true
    rationale: "RED e o estado CORRETO ao fim deste plano — as 5 funcoes nascem em 45-03/45-05/45-07 e os pins md5 sao preenchidos em 45-11. A execucao e do orquestrador por MCP execute_sql (subagentes nao recebem os tools MCP do Supabase) e e o gate do portao destrutivo de 45-11, nao deste plano."

estimate:
  tokens: 70000
  tasks: 3
actuals:
  tokens: 25263
  tasks: 3
  commits: 3

metrics:
  duration: "~55 min"
  completed: 2026-08-05
---

# Phase 45 Plano 04: Smoke do Motor de Exclusão — Summary

Especificação executável do motor de exclusão/anonimização escrita **antes** do motor, em RED
deliberado: 21 asserções nomeadas e numeradas, treze delas negativas, com as provas de sobrevivência
da trilha de decisão colocadas estruturalmente antes de qualquer escrita.

## O que foi construído

`supabase/tests/p45_motor_exclusao_smoke.sql` — 1.684 linhas, gate-GUC no idioma do
`p43_previa_smoke.sql`, executável por MCP `execute_sql` numa única chamada, com o gate verde
definido como **o contador `smoke45m.pass` bater 21** — nunca "não deu erro".

| Bloco | Asserções | Natureza |
|---|---|---|
| **A** (A1–A4) | 4 | Estrutural, sem fixture, sem escrita — roda antes de tudo |
| **B** (B0–B10) | 11 | Comportamental, fixture sintética de 13 `INSERT`, subtransação revertida |
| **C** (C1–C6) | 6 | Segurança, não-divergência do dry-run, negativas do encerramento |
| **(z)** | — | Resíduo zero em 13 tabelas + gate de contagem fixo |

**A ordem é a decisão mais importante do arquivo.** Num batch de chamada única, tudo depois do
primeiro `RAISE` é inalcançável e conta como verde — foi assim que a P43 perdeu 9 asserções,
incluindo a guarda de regressão do `42804` acrescentada no mesmo dia. As negativas do ERASE-08 e do
ERASE-10 estão no Bloco A, puramente estrutural, antes do primeiro `INSERT` (verificado por guard
automático: `confdeltype@6419 < INSERT@38477`).

Dentro do Bloco B a mesma lição foi aplicada ao julgamento: **todas** as medições acontecem antes de
qualquer julgamento, e a ordem de julgamento é `B0 → B1 → B2 → B7 → B8 → resto`. B2 (o tombstone
completou) vem antes de B7/B8 porque um tombstone que não rodou torna toda asserção de pós-estado
sem sentido — B7 passaria por **vacuidade**, que é pior que reprovar.

## Deviations from Plan

### [Rule 2 — Missing critical] M1: a asserção literal do ERASE-08 era insatisfazível

- **Encontrado em:** Task 2, ao ler `20260709000011_decisao_final_historico.sql:105-118`
- **Medido:** `trg_decisao_final_snapshot` é `AFTER UPDATE ON public.decisao_final FOR EACH ROW`,
  **sem cláusula `WHEN`**, e o corpo insere em `decisao_final_historico` o `OLD.justificativa` — o
  texto identificável — junto com `OLD.por_usuario`.
- **Consequência dupla:** (i) o `UPDATE ... SET justificativa = <desidentificado>` da D-45-02 **sobe**
  a contagem do arquivo, e mantê-la exigiria apagar linha — o que o próprio ERASE-08 proíbe;
  (ii) pior, o tombstone **recria no arquivo a PII que acabou de desidentificar**. É exatamente o modo
  de falha que o operador antecipou por escrito ao travar a BD-9: *"senão o histórico entrega o que a
  linha corrente protege"*.
- **Fix:** B7 assere o invariante que protege a pessoa em vez do que protege o número — contagem
  estrita em `historico_candidatura` e `decisao_final`; no arquivo, não-decrescimento (zero
  apagamento é o que o ERASE-08 garante) com crescimento limitado ao número de linhas de
  `decisao_final` atualizadas; **e** zero linha do titular com justificativa distinta do texto
  desidentificado ou `por_usuario` apontando a ele.
- **Escalado ao operador** no portão do tracer e **confirmado por medição no catálogo vivo** antes de
  eu construir os Blocos B e C.
- **Obrigação que impõe ao 45-07:** o scrub de `decisao_final_historico` tem de ser o **último**
  statement a tocar o par, depois do `UPDATE` em `decisao_final` — fazê-lo antes deixa uma linha
  identificável recém-criada atrás dele. Registrado no cabeçalho do arquivo e em `WINDOWS.md`.
- **Commit:** `3dc96bc`

### [Rule 2 — Missing critical] M2: duas FKs inexequíveis em `candidate_ai_decisions`

- **Encontrado em:** Task 2 · **Estendido pelo operador** de uma coluna para o par
- **Medido:** `candidato_id` **e** `vaga_id` são `NOT NULL REFERENCES ... ON DELETE SET NULL`
  (`20260609000001:236-237`). A cláusula nunca pode ser cumprida — apagar a linha referenciada
  tentaria gravar `NULL` em coluna `NOT NULL` e levantaria `23502`. A FK é bomba latente, não
  proteção, e está dormente apenas porque a tabela tem 0 linhas.
- **Fix:** B6 lê `attnotnull` **ao vivo** das duas colunas e adapta a exigência: coluna nulável ⇒
  zero linha apontando ao titular; coluna `NOT NULL` ⇒ o ponteiro pode ficar, mas o **conteúdo**
  (`ai_reasoning_summary`) não pode continuar identificante.
- **Commit:** `3dc96bc`

### [Rule 2 — Missing critical] M3: a fixture podia disparar e-mail real em PROD

- **Encontrado em:** Task 2
- **Medido:** dois triggers `AFTER INSERT ON public.candidaturas` vivos — `trg_notif_confirmacao`
  (`20260726000001:174-177`) e `trg_candidaturas_analise` (`20260610000002:68-70`) — e os dois fazem
  `net.http_post` para Edge Functions. `NOTIFICACOES_MODO` **não é legível por SQL** (SONDA 5 tentou
  e não conseguiu; é secret de projeto) e o último valor registrado é `producao`.
- **Fix:** a fixture nasce com `status = 'rejeitado'`, que é o survivor-guard compartilhado pelos
  dois triggers — nenhum deles enfileira nada, nem sequer linha em `net.http_request_queue`.
  `etapa_atual` fica em `'triagem'`, que é o que o encerramento a pedido de 45-03 exige (colunas
  independentes). A linha de `historico_candidatura` usa `etapa_para = 'triagem'`, que cai no ramo
  `RETURN NEW` do CASE de `trg_notif_transicao`.
- **Por que não confiar no rollback:** a fila do `pg_net` é transacional e seria descartada — mas
  "provavelmente reverte" não é postura aceitável quando o erro manda e-mail real para pessoa real.
  Cinto **e** suspensório.
- **Commit:** `3dc96bc`

### [Rule 1 - Bug] Três defeitos de mecânica corrigidos antes do commit da Task 2

1. **B6 seria falso-vermelha:** as leituras pós-tombstone de `logs_acesso`/`autorizacoes`/
   `notificacoes_enviadas` usavam o ponteiro ao titular — que é exatamente o que o tombstone severa.
   Reler por ele devolveria zero linhas e **reprovaria a implementação correta**. Corrigido para
   leitura por `id` capturado no `RETURNING` da fixture.
2. **B4 contaria a auditoria da primeira execução:** o delta de `logs_auditoria` usava o marco
   pré-tombstone. Corrigido com marco `v_aud_mid` capturado após a primeira chamada.
3. **Regex de e-mail com `%%`:** o `%` fora duplicado como se fosse string de formato de `RAISE`,
   quando é literal de regex. Corrigido.

### [Rule 2 — Missing critical] C5 cobria só uma das duas RPCs

- **Encontrado em:** Task 3, ao reler o critério de aceite
- **Fix:** acrescentadas duas pernas — `contar_pedidos_dados_pendentes()` não se move quando o pedido
  de exclusão nasce, e fila ≡ contador. Um badge que conta o que a tela não mostra manda o operador
  caçar trabalho invisível.
- **Commit:** `9b91c36`

**Total: 5 desvios auto-corrigidos** (4× Rule 2, 1× Rule 1 com três itens). **Impacto:** dois deles
(M1, M2) mudam o que o 45-07 tem de implementar e estão registrados no cabeçalho do arquivo e no
ledger; nenhum deles enfraquece uma asserção — M1 substitui uma asserção insatisfazível por uma
estritamente mais forte no que protege a pessoa.

## Verificação

| Item do `<verification>` do plano | Resultado |
|---|---|
| O arquivo existe e passa os três guards automáticos de forma | ✅ os três verdes |
| O arquivo **não foi executado** (RED é o estado correto) | ✅ nenhuma das 5 funções existe ainda |
| O Bloco A precede o primeiro `INSERT` | ✅ `confdeltype@6419 < INSERT@38477` |
| Contador fixo no cabeçalho e no rodapé, mesmo número | ✅ 21 nos dois, e **21 incrementos** no corpo |
| Proveniência do md5 com `PENDENTE-45-07`, nenhum valor inventado | ✅ e C3 **reprova** enquanto o marcador estiver lá |
| `npm run lint` inalterado | ✅ **97**, baseline congelada |

Conferências estruturais extras: dollar-quotes balanceados nos 11 blocos `DO`, zero variável
declarada e não usada, 16 `INSERT INTO`.

**Zero `--no-verify`.** Os três commits passaram pelo `.husky/pre-commit` com `tsc errors: 97
(frozen baseline: 97)`.

⚠ `copyPortoesLgpd.test.ts` (CONSOL-04) segue falhando — é a falha **esperada e correta**: o recibo
promete exclusão e o motor ainda não existe. Não foi tocada.

## Known Stubs

| Item | Arquivo | Motivo | Quem resolve |
|---|---|---|---|
| Pins `md5(prosrc)` = `PENDENTE-45-07` | `p45_motor_exclusao_smoke.sql` (bloco de PROVENIÊNCIA) | Os corpos vivos não existem; pinar valor inventado destruiria o gate | **45-11**, por execução |

O stub é **auto-protegido**: C3 levanta enquanto o marcador estiver presente, imprimindo os md5
vivos medidos. Um placeholder que ficasse verde seria pior que asserção nenhuma.

Registrado em `.planning/WINDOWS.md` (`unrun-verify` + `deviation`). ⚠ O arquivo não foi staged neste
plano porque estava sendo escrito em paralelo pelo executor do 45-05 — fica para o commit central do
orquestrador.

## Contratos que este arquivo fixa para os planos seguintes

| Contrato | Consumidor |
|---|---|
| `SQLSTATE = P45DR` para o dry-run de `anonimizar_candidato` | 45-07 implementa · 45-10 distingue de erro real · 45-11 registra |
| As 5 funções recusam chamador **sem claim** com `42501` | 45-10: a EF **tem de passar claims**, não é detalhe a descobrir em produção |
| `anonimizar_candidato` retorna `ja_anonimizado` na re-execução | 45-07 |
| O scrub de `decisao_final_historico` é o **último** statement do par (M1) | 45-07 |
| Decidir entre afrouxar `candidato_id`+`vaga_id` ou desidentificar o conteúdo (M2) | 45-07 |

## Issues Encountered

Nenhum bloqueador. O portão do tracer foi acionado (auto mode desligado) e o operador confirmou M1 e
M2 **por medição no catálogo vivo**, estendendo M2 de uma coluna para o par.

## Next Phase Readiness

Pronto para o **45-06**. O arquivo entregue é a especificação contra a qual 45-07 será escrito e o
gate verde que o portão destrutivo do 45-11 exige — executado pelo orquestrador, **antes e depois**
do apply real.

⚠ Lembrete que não é deste plano mas o bloqueia lá na frente: **G1 continua aberto** (o export nunca
foi exercitado ponta a ponta em PROD) e o portão destrutivo do 45-11 não pode abrir enquanto estiver.

## Self-Check: PASSED

- `supabase/tests/p45_motor_exclusao_smoke.sql` existe em disco (1.684 linhas)
- `45-04-SUMMARY.md` existe em disco
- Os 3 commits existem no histórico: `61d5f9c`, `3dc96bc`, `9b91c36`
- Os 3 guards `<automated>` do plano re-executados ao final: **os três verdes**
- `<verification>` do plano: 6 de 6 itens conferidos
