---
phase: 51-consertos-da-jornada-bloco-3
plan: 21
subsystem: lgpd-motor-exclusao
status: complete
tags: [lgpd, disponibilidade, limpeza-destrutiva, gap-closure, G1a, T-51-14, WINDOWS-89, ensaio, mordida]

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-20 — migration 20261010000001 (motor apaga a disponibilidade do titular; corpo 9b87e5ee…), MIGS com 20261010000002 e capturar().disp_anonimizados no p51_ensaio.cjs"
provides:
  - "migration 20261010000002 (NAO aplicada, DESTRUTIVA): DELETE de public.disponibilidade USING public.candidatos com o reconhecedor do motor por igualdade; P51-G1L PRE-PORTAO (motor)/(populacao)/(alvo) e POS-PORTAO (restantes)/(outros)/(apagadas); evidencia g1l: so contagens e md5"
  - ".red-51-21/mordida.txt — L0 verde, L1 (restantes), L2 (outros)"
  - "ref local refs/gsd/51-21/base = 36c96af1"
affects: [51-22, 51-23]

estimate:
  tokens: 50000
  tasks: 2
actuals:
  tokens: 4300    # chars/4 sobre as linhas acrescentadas no diff 36c96af1..411e033b (17 094 chars)
  tasks: 2
  commits: 2
plan_head_before: 36c96af1f3a5567efe786ce46bf641b7e3348d8f
plan_head_after: 411e033b042e3f68afa732fc9744e57f496c5a70

tech-stack:
  added: []
  patterns:
    - "limpeza destrutiva com PRE que exige o motor novo em vigor (forma POSIX no prosrc sem comentarios) antes de limpar o legado"
    - "POS com baseline de impressao digital (to_jsonb da linha inteira) capturada pelo PRE na MESMA execucao, para o que NAO e alvo"
    - "ancora textual unica do apagamento como ponto de mutacao de rascunho (L0 controle / L1 neutralizado / L2 escopo aberto)"

key-files:
  created:
    - supabase/migrations/20261010000002_p51_limpa_disponibilidade_anonimizados.sql
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-21/mordida.txt
  modified: []

key-decisions:
  - "O reconhecedor aparece em todo predicado do arquivo (PRE x4, limpeza, POS x2) por igualdade com a sentinela derivada do id + user_id IS NULL + DATE '1900-01-01'; nenhum predicado guarda ids em GUC (so contagens e md5)"
  - "PRE/POS usam aliases a/t/o/r (e d so na expressao canonica do alvo, com WHERE EXISTS) para que o texto `WHERE d.candidato_id = c.id` ocorra UMA vez no arquivo inteiro (comentarios inclusive), a ancora das mutacoes"
  - "O (motor) le o prosrc sem comentarios com `~*` e alias opcional; exige tambem que a remocao de comentarios tenha removido algo (portao que nao mede nao responde ok)"
  - "md5 do alvo pela expressao canonica md5(coalesce(string_agg(x, ',' ORDER BY x), '')) sobre candidato_id::text DISTINCT — medido so-leitura antes = 6819cb8d…, igual ao da evidencia"

requirements-completed: []   # JORN-49 fecha com os applies (51-22 motor, 51-23 limpeza); nao marcado aqui

coverage:
  - id: G1a-destrutiva
    description: "A limpeza das linhas de disponibilidade que sobraram dos titulares ja anonimizados alcanca so eles e prova o que apagou e o que deixou"
    requirement: "JORN-49"
    verification:
      - kind: other
        ref: "static verify do 51-21 Task 1 (OK migration estatica (G1L))"
        status: pass
      - kind: integration
        ref: "node scripts/p51_ensaio.cjs --migracoes=…0001…,…0002… supabase/tests/p45_motor_exclusao_smoke.sql (PROD, abortado)"
        status: pass
      - kind: other
        ref: ".planning/phases/51-consertos-da-jornada-bloco-3/.red-51-21/mordida.txt (L0/L1/L2)"
        status: pass
    human_judgment: true
    rationale: "Migration destrutiva e irreversivel: o apply (51-23) exige o OK do operador sobre a populacao medida de novo; a prova aqui e so de ensaio"

metrics:
  duration: "~5 min (execucao; leitura de contexto a parte)"
  completed: 2026-10-10
---

# Phase 51 Plan 21: limpeza da disponibilidade que sobrou dos titulares ja anonimizados (G1a, parte destrutiva) Summary

**A migration `20261010000002` apaga de `public.disponibilidade` as linhas dos titulares que o reconhecedor do próprio motor dá por anonimizados (o e-mail igual à sentinela derivada do id, `user_id` nulo e nascimento em 1900). O PRE só a deixa correr se o motor novo estiver em vigor e se houver população e alvo. O POS prova que não sobrou linha do alvo, que as outras linhas ficaram idênticas e que o número apagado é exatamente o alvo. Ela passou verde em PROD só em requisições que abortam, e as mutações L1 e L2 mordem. NÃO foi aplicada: o apply é do 51-23, depois do checkpoint do operador.**

## O que NÃO rodou contra PROD, e por quê

- **A migration não foi aplicada.** Não houve `p46apply.cjs migrate`, nem `supabase db push`, nem nenhum `p46apply.cjs run` que commitasse. Toda execução passou por `scripts/p51_ensaio.cjs`, cuja requisição termina na sentinela e aborta.
- O ledger de PROD foi lido só-leitura depois da última prova e continua **sem `20261010000002`**. A cabeça é `20261008000005`, sem nenhuma linha `20261010%`. O motor vivo continua `a68e4a6a…`.
- Nada foi publicado: sem push e sem deploy de EF. STATE.md e ROADMAP.md não foram tocados.

## Passo 0 — medições (só leitura, 2026-10-10)

| Medição | Valor |
|---|---|
| Triggers não internos em `disponibilidade` | só `update_disponibilidade_updated_at` (tgtype 19 = ROW + BEFORE + UPDATE). **Nenhum de DELETE**, então não houve motivo para parar |
| Regras / FKs que apontam para `disponibilidade` | 0 / nenhuma |
| Cabeça do ledger / linhas `20261010%` | `20261008000005` / 0 |
| Motor vivo | `a68e4a6a47d9482f75d3326a8bf2b3e4` (o corpo da 0004, não o G1a) |
| `config_purga.modo` | `dry_run` |
| `disponibilidade` total | 28 linhas |
| `capturar().disp_anonimizados` | `titulares=2, linhas=2` |
| Titulares com linha / linhas fora do alvo (controle do L2) | 2 / **26** |
| md5 canônico do alvo | `6819cb8d99bbaaae5de23cefae2c88bd` |

## Task 1 (tracer): a migration e o ensaio

- **Estático:** `OK migration estatica (G1L)`. A âncora `WHERE d.candidato_id = c.id` ocorre 1 vez no arquivo inteiro, comentários inclusive.
- **Ensaio em PROD que aborta**, com `0001`+`0002` prefixadas e o p45 depois:
  ```
  ENSAIO VERDE: supabase/tests/p45_motor_exclusao_smoke.sql · prefixadas=[20261010000001,20261010000002] · … · evidencia=g1a:anon=9b87e5ee3d072df5f9bf6e99ee1ae7c1 g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual,alvo=6819cb8d99bbaaae5de23cefae2c88bd · 1111 ms
  limpeza verde em PROD (abortada): g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual,alvo=6819cb8d…
  ```
  `titulares` e `linhas` são iguais aos medidos só-leitura imediatamente antes (`{"titulares":2,"linhas":2}`). O `alvo` é igual ao md5 do Passo 0. Não houve `PERSISTIU`.
- **Ensaio extra (aborta) da recusa `(motor)`:** com só a `0002` prefixada, sobre o motor vivo da 0004, o resultado é `ENSAIO VERMELHO: P0001: P51-G1L PRE-PORTAO (motor): o anonimizar_candidato em vigor NAO apaga a disponibilidade do titular — aplicar a 20261010000001 primeiro …` (344 ms).
- **Portão de feedback do tracer:** o `<verify>` foi repetido ponta a ponta sobre o arquivo commitado antes da expansão. Deu verde de novo, com a mesma evidência `g1l:` (1042 ms), e só então a Task 2 começou.

## Task 2: a mordida

As cópias de rascunho ficaram em `$TMPDIR/p51_21_mut`, foram montadas do arquivo COMMITADO por troca da âncora única e depois apagadas:

| Mutação | Troca | Resultado | Duração |
|---|---|---|---|
| L0 (controle) | nenhuma | `ENSAIO VERDE` · `g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual,alvo=6819cb8d…` | 644 ms |
| L1 | `WHERE false AND d.candidato_id = c.id` | `ENSAIO VERMELHO: P51-G1L POS-PORTAO (restantes)` (2 linhas ficaram) | 612 ms |
| L2 | `WHERE d.candidato_id = c.id OR true` | `ENSAIO VERMELHO: P51-G1L POS-PORTAO (outros)` (26 → 0 dentro da requisição abortada) | 631 ms |

Nenhum dos três logs teve `PERSISTIU`. As verificações deram:
- `portao da limpeza morde: L1 restantes, L2 outros, L0 verde`;
- `limpeza commitada, rascunhos fora do repositorio, nada aplicado`.

## Bordas (EDGE-PROBE G1a)

- **Titular com várias linhas:** `DELETE … USING` casa cada linha de `disponibilidade` com exatamente uma de `candidatos` (PK). Por isso o `ROW_COUNT` conta linhas, e o `(apagadas)` compara linhas com linhas. Na população de hoje há 1 linha por titular, então a borda foi provada por construção, não por fixture.
- **Titular anonimizado sem linha:** entra em `titulares` (contado sobre `candidatos`) e não entra em `com_disp`/`linhas` (contados sobre `disponibilidade`). Hoje `titulares = com_disp = 2`.
- **Candidato vivo com `user_id` nulo e nascimento em 1900, mas com e-mail que não é a sentinela do próprio id:** não é alvo, porque o predicado é de igualdade com o valor derivado do id da mesma linha. Se a limpeza o alcançasse, o POS `(outros)` reprovaria, e o L2 prova que esse portão morde.

## Deviations from Plan

None — plan executed exactly as written. Fora dos `<verify>`, rodaram dois ensaios a mais, ambos abortando e dentro do permitido: a recusa `(motor)` sem a 0001 e a repetição do tracer no portão de feedback. O hook `guard-git.sh` não bloqueou nada, e nenhum commit usou `--no-verify`.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>`. Os pontos do T-51-85/86/87 ficam assim:
- o reconhecedor é por igualdade;
- o `(outros)` usa baseline capturada na execução, e o L2 morde;
- a evidência traz só contagens e md5;
- `mordida.txt` foi cortado no rótulo.

## Notas para o 51-23

- O PRE `(motor)` exige que a `20261010000001` esteja em vigor. Portanto o 51-22 (apply do motor) vem ANTES do 51-23.
- O md5 do alvo a vincular no comando do apply sai da expressão canônica, a mesma do PRE. Medido hoje, ele é `6819cb8d99bbaaae5de23cefae2c88bd` (2 titulares / 2 linhas). **Tem de ser medido de novo no dia.**
- Em PROD (READ COMMITTED), se uma linha de outro candidato mudar entre o PRE e o POS, o resultado é recusa `(outros)` sem nada persistido. Nesse caso, repetir o apply.

## Self-Check: PASSED

- FOUND: supabase/migrations/20261010000002_p51_limpa_disponibilidade_anonimizados.sql
- FOUND: .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-21/mordida.txt
- FOUND: aca02722 (feat 51-21 tracer) e 411e033b (test 51-21), ambos ancestrais de HEAD
- Ledger de PROD sem `20261010000002` (só leitura, depois da última prova)
