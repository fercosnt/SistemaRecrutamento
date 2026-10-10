---
phase: 51-consertos-da-jornada-bloco-3
plan: 20
subsystem: lgpd-motor-exclusao
status: complete
tags: [lgpd, motor-exclusao, anonimizar_candidato, disponibilidade, gap-closure, G1a, T-51-14, WINDOWS-89, ensaio]

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-13 — corpo do motor da 0004 (a68e4a6a…), rede (C3/ix), (B25), MD1/MD2; 51-16 — 0001..0005 publicadas; 51-19 — recibo com disponibilidade.candidato_id no passo tombstone_candidato"
provides:
  - "migration 20261010000001 (NAO aplicada): anonimizar_candidato apaga public.disponibilidade do titular no passo tombstone_candidato, escopado por candidato_id = p_candidato_id, contagem v_n_disp na chave tombstone_candidato.disponibilidade e disponibilidade=% no terminador do dry-run; P51-G1A PRE/POS-PORTAO"
  - "p45: rede (C3/x) provada vermelha antes do re-pin; (C3/vi) com dois escopos nomeados (D-62 e G1a); (B26) fixture/apagou/outros/plano; disponibilidade no (z); v_esperado 40; v_pin_anon = 9b87e5ee… (do arquivo)"
  - "p51_mutacoes: MF1 (B26/apagou), MF2 (B26/outros), fnMotor sobre o corpo vigente (por forma), --so=<ids> com selecionar() pura e exportada"
  - "p51_ensaio: MIGS com 20261010000001/20261010000002; capturar().disp_anonimizados"
affects: [51-21, 51-22, 51-23]

estimate:
  tokens: 90000
  tasks: 2
actuals:
  tokens: 38700    # chars/4 sobre as linhas acrescentadas no diff 1043acc7..1c0a89b6 (154 763 chars; ~85% e o corpo do motor EXTRAIDO da 0004)
  tasks: 2
  commits: 2
plan_head_before: 1043acc7562394df7b69640b2e7c96138f431f27
plan_head_after: 1c0a89b67db8719e124ff108662d2b0aa4a32551

tech-stack:
  added: []
  patterns:
    - "rede de forma crescida e provada VERMELHA contra o corpo vivo antes do re-pin; pin previsto do ARQUIVO e conferido pela evidencia do POS no ensaio"
    - "segundo escopo NOMEADO numa lista de permissao (D-62 ∪ G1a), com a mordida do portao alargado provada por rascunho (K0 controle verde / K1 vermelho)"
    - "mutacoes do motor montadas sobre a migration mais nova que cria a funcao, achada por forma"

key-files:
  created:
    - supabase/migrations/20261010000001_p51_motor_apaga_disponibilidade.sql
  modified:
    - supabase/tests/p45_motor_exclusao_smoke.sql
    - scripts/p51_ensaio.cjs
    - scripts/p51_mutacoes.cjs

key-decisions:
  - "Chave disponibilidade DENTRO de passos.tombstone_candidato (escolha (1) do planejador): a EF soma os numeros do bloco por contagemDe e nao fixa chaves; nenhum smoke/script le a mensagem do terminador por regex (o p46 so exige o prefixo «P45 DRY-RUN»)"
  - "Fixture B26 com DUAS linhas para o titular (a tabela nao tem UNIQUE em candidato_id, medido) e um candidato de CONTROLE sintetico NOVO, sem auth.users (user_id e cpf nulos) e sem candidatura — a fixture nao tinha outro candidato, e assim ele nao entra em nenhuma outra assercao"
  - "MF2 troca o predicado inteiro `d.candidato_id = p_candidato_id` por `true` dentro do statement achado pela fronteira fora de literal (o motor usa alias, entao trocar so `candidato_id = …` deixaria `d.true`)"
  - "plano_exclusao_titular NAO reescrita; v_pin_plano inalterado (0a4996fe…, o da 0004, vivo)"

requirements-completed: []   # JORN-49 fecha com o apply (51-22) e a limpeza (51-21/51-23); nao marcado aqui

coverage:
  - id: G1a-aditiva
    description: "Uma exclusao de titular passa a apagar a disponibilidade dele, e so a dele"
    requirement: "JORN-49"
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B26) — ensaio em PROD que aborta"
        status: pass
      - kind: static
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(C3/x)"
        status: pass
      - kind: mutation
        ref: "scripts/p51_mutacoes.cjs --so=MD1,MF1,MF2"
        status: pass

metrics:
  duration: "~45 min"
  completed: 2026-10-10
---

# Phase 51 Plan 20: o motor apaga a disponibilidade do titular (G1a, parte aditiva) Summary

**`anonimizar_candidato` passa a apagar as linhas de `public.disponibilidade` do titular no passo `tombstone_candidato` (escopado por `candidato_id = p_candidato_id`, contado em `tombstone_candidato.disponibilidade`). A migration `20261010000001` foi escrita e provada em PROD só por ensaios que abortam. Ela NÃO foi aplicada: o apply é do 51-22, depois do review e do OK do operador.**

## O que NÃO rodou contra PROD, e por quê

- **A migration não foi aplicada.** Não houve `p46apply.cjs migrate`. Antes e depois, a leitura só-leitura deu `max(version) = 20261008000005`, zero linhas `20261010%` no ledger e o motor vivo com `md5 = a68e4a6a…`, o corpo do 51-13.
- **MB4, MB6, MB7 e MD2 não rodaram contra PROD.** Elas fazem ALTER/GRANT na `revisao_rejeicao`, que está viva desde a publicação do 51-16 (IN-04 do 51-16), e segurariam AccessExclusiveLock na tabela de produção. Foram só montadas offline: as 47 entradas do runner montam via `require` + `m.sql()`.
- **O runner inteiro não rodou.** Rodou só `--so=MD1,MF1,MF2`.
- **Nenhum smoke rodou por `p46apply.cjs run`.** Tudo passou por `scripts/p51_ensaio.cjs`, cuja requisição termina na sentinela e aborta.
- Nada foi publicado: sem push, sem deploy de EF. `database.types.ts` não foi tocado, porque nenhuma assinatura mudou. STATE.md e ROADMAP.md também ficaram intocados.

## Passo 0 — medições (só leitura, 2026-10-10)

| Medição | Valor |
|---|---|
| md5 do motor em três fontes | vivo `md5(prosrc)` = `a68e4a6a47d9482f75d3326a8bf2b3e4` (89 610 chars / 91 972 octetos), igual ao corpo entre `$anonimizar_candidato$` na `0004` e ao `v_pin_anon` do p45. **Concordam** |
| `plano_exclusao_titular` | vivo `0a4996fe…`, igual ao arquivo `0004` e ao `v_pin_plano`. Cita `disponibilidade` (pos 19372) |
| `config_purga.modo` | `dry_run` |
| `public.disponibilidade`: colunas | `id uuid` PK default `gen_random_uuid()`; `candidato_id uuid NOT NULL`; `periodo_disponivel varchar(50) NOT NULL`; `regime_trabalho varchar(50) NOT NULL`; `disponibilidade_imediata bool NOT NULL default false`; `data_disponibilidade timestamptz`; `created_at`/`updated_at` NOT NULL default `now()` |
| constraints | `disponibilidade_pkey PRIMARY KEY (id)`, `disponibilidade_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE`. **Sem UNIQUE em `candidato_id`** (índice `idx_disponibilidade_candidato_id` não único). Sem CHECK |
| triggers não internos | `update_disponibilidade_updated_at` (BEFORE UPDATE, `updated_at`) |
| RLS | `relrowsecurity = true`, **`relforcerowsecurity = false`**, dono `postgres`. Policies: 2× SELECT e 1× UPDATE para `authenticated`. O motor (DEFINER, dono `postgres`) apaga como dono |
| motor | dono `postgres`, `prosecdef = true`, `proconfig = {search_path=""}`, ACL `{postgres=X, service_role=X, authenticated=X}` |
| população | 28 linhas em `disponibilidade`; o reconhecedor do motor acha **2 titulares anonimizados com 2 linhas** (máximo 1 linha por candidato hoje) |
| cabeça do ledger | `20261008000005`, menor que `20261010000001` |
| consumidores | `grep tombstone_candidato`: EF `executar-direito-titular` (`contagemDe` soma os números do bloco sem fixar chaves), testes da EF, `reciboExclusao.ts` e `.generated.ts` (só o nome do passo). `grep "DRY-RUN concluido"`: só as migrations do motor e o teste da EF (mensagem própria). Daí a escolha (1) |

## Task 1 (tracer): rede vermelha, migration, (B26), re-pin

**VERMELHO do Passo 1**, registrado ANTES do re-pin. Pins ainda do 51-13, `--sem-migracoes`, corpo vivo:
```
ENSAIO VERMELHO: P45M FAIL (C3/x): o passo tombstone_candidato nao tem exatamente UM DELETE public.disponibilidade (achados: 0). … (1061 ms)
```
Não veio `DEFEITO DA REDE`, então o controle da fronteira (o UPDATE de `public.candidaturas` cortado pela mesma regra) passou no corpo real.

**Migration.** O corpo foi extraído da `0004` pelo delimitador nomeado e conferido como `a68e4a6a…` antes de qualquer edição. Depois recebeu cinco substituições de âncora única, montadas por um script em scratchpad:
- `v_n_disp` no DECLARE;
- o apagamento escopado e `GET DIAGNOSTICS v_n_disp` logo depois de `GET DIAGNOSTICS v_n_cvurl = ROW_COUNT;`;
- `'disponibilidade', v_n_disp` dentro de `tombstone_candidato` no retorno;
- `disponibilidade=%` na mensagem do terminador;
- `v_n_disp` na lista de argumentos, na posição correspondente.

O `diff` contra a `0004` mostra só essas mudanças. Corpo novo: **`9b87e5ee3d072df5f9bf6e99ee1ae7c1` (90 934 chars / 93 307 octetos)**.

**Re-pin.** `v_pin_anon` = `9b87e5ee…`, calculado do ARQUIVO. `v_pin_plano` não mudou. PROVENIÊNCIA mantém exatamente duas linhas `valor :`, com a origem indicada por função. Também foram atualizados o bloco «O QUE MUDOU NO CORPO NO 51-20», o HISTÓRICO DOS PINS (geração 51-20), o `recomputar` (que agora aponta as duas migrations), as duas mensagens do (C3/i) e o COMO RODAR.

**Verifies:**
- `OK migration estatica (G1a)`.
- `OK smoke do motor: pin anon = arquivo G1a (9b87e5ee), pin plano = 0004 (0a4996fe), C3/x, B26, G1a no C3/vi, disponibilidade no (z), contagem 40`.
- Ensaio em PROD:
  ```
  ENSAIO VERDE: supabase/tests/p45_motor_exclusao_smoke.sql · prefixadas=[20261010000001] · aplicadas=[…0001..0005] · ausentes=[] · vistas=igual · smokes=[] · evidencia=g1a:anon=9b87e5ee3d072df5f9bf6e99ee1ae7c1 · 1396 ms
  ```
  O md5 previsto do arquivo é igual ao `g1a:anon=` lido do POS.
- Conferência extra da nota do COMO RODAR: `--sem-migracoes` contra o vivo dá `ENSAIO VERMELHO: P45M FAIL (B26/apagou): … ainda tem 2 linha(s) …`.

**Varredura D-56** (comando literal do CLAUDE.md sobre `supabase/tests/*.sql`): **405** achados, 44 no p45. Os achados novos que tocam o motor, `disponibilidade` ou o (z) são todos escopo deliberado:
- (B26): `v_b26_ctl_a IS DISTINCT FROM 1` e `v_b26_tit_d IS DISTINCT FROM 0`. São as linhas que a própria fixture inseriu num candidato sintético novo, e o «zero depois» é a propriedade.
- (C3/x): `v_x_n_ini <> 1`, `v_x_n_fim <> 1` e `v_x_n <> 1`. «Um marcador / um apagamento» é fato de desenho.
- `v_esperado := 40` e os dois escopos do (C3/vi), `v_rp_permit` e `v_g1a_permit`. São escopo deliberado e estão documentados no cabeçalho e no DECLARE.

Nenhum outro smoke pina o md5 do motor (`grep a68e4a6a|4624854408` vazio fora do p45). `p44_export_drift` cita só as colunas da tabela, e `p47_teardown` só um comentário. Nenhuma fotografia nova.

## Task 2: o portão morde, `--so`, MIGS, invariante e purga

| Prova | Resultado | Duração |
|---|---|---|
| offline | `offline: MIGS com o gap, MD1/MD2/MF1/MF2 montam do corpo vigente, selecionar pura`. As 47 entradas montam, e os diffs de MF1/MF2 são exatamente `NULL;` e `WHERE true;` | — |
| `disp_anonimizados` | `titulares=2 linhas=2` (bate com o Passo 0 e o 51-SECURITY) | — |
| CONTROLE p45 | `gate 45m=40 de 40` | 1153 ms |
| MD1 | `P45M FAIL (B25/respondido)` | 1275 ms |
| MF1 | `P45M FAIL (B26/apagou)` | 856 ms |
| MF2 | `P45M FAIL (B26/outros)` | 1123 ms |
| runner | `controle verde; 3/3 mutacoes mordem; nada persistiu (so=MD1,MF1,MF2)`. A leitura de persistência, incluindo `disp_anonimizados`, ficou igual à baseline | — |
| K0 (controle: mesma montagem, `NULL;`) | `ENSAIO VERDE: … evidencia=g1a:anon=9b87e5ee…` | 1062 ms |
| K1 (`candidaturas` com `WHERE false`) | `ENSAIO VERMELHO: P45M FAIL (C3/vi): ⛔ O MOTOR APAGA LINHA EM TABELA FORA DOS DOIS ESCOPOS (D-62 e G1a): candidaturas. …` | 1037 ms |
| purga | `ENSAIO VERDE: supabase/tests/p46_purga_smoke.sql · prefixadas=[20261010000001] · … · evidencia=g1a:anon=9b87e5ee… · 2732 ms` | 2732 ms |

Os rascunhos K ficaram fora do repositório e foram apagados pelo próprio verify. `git status --porcelain -- supabase scripts` só mostrava os dois scripts editados.

## Bordas (EDGE-PROBE G1a)

- **Várias linhas:** a fixture tem 2 linhas, que saem todas. Provado pela (B26/apagou), com plano = passos = 2 na (B26/plano).
- **Titular sem linha:** a purga sintética do `p46_purga_smoke` chama o motor e ficou verde com a migration prefixada, com o passo contando 0.
- **Linha de outro candidato:** fica idêntica, pela impressão digital `to_jsonb` (B26/outros). MF2 prova que a asserção morde.
- **Titular já anonimizado:** o motor devolve `ja_anonimizado` sem tocar nada. As 2 linhas que sobraram ficam para a `20261010000002` (51-21/51-23), e o cabeçalho da migration diz isso.

## Deviations from Plan

None — plan executed exactly as written. Escolhas dentro do que o plano deixou em aberto:
- O candidato de CONTROLE foi criado dentro do envelope (a fixture não tinha outro), sem `auth.users`.
- A (B26/fixture) exige `≥ 2` linhas inseridas, medidas por GET DIAGNOSTICS, em vez de uma constante.
- MF2 troca o predicado com alias inteiro.

Rodaram ensaios que abortam além dos `<verify>`: o vermelho `--sem-migracoes` depois do re-pin, para conferir a nota do COMO RODAR. Isso está dentro do permitido. O hook `guard-git.sh` não bloqueou nenhum verify.

## Notas para o 51-22

- O PRE-PORTAO aceita só `a68e4a6a…` e exige `config_purga.modo = 'dry_run'`. Se a purga estiver em `live` no dia do apply, a decisão vai ao checkpoint e não deve ser contornada.
- `git log origin/main..HEAD` tem 23 commits não enviados neste checkout (dos planos 51-18/19/20 e anteriores). O push não é deste plano.

## Self-Check: PASSED

- FOUND: supabase/migrations/20261010000001_p51_motor_apaga_disponibilidade.sql
- FOUND: supabase/tests/p45_motor_exclusao_smoke.sql, scripts/p51_ensaio.cjs, scripts/p51_mutacoes.cjs
- FOUND: 68a670d3 (feat 51-20 tracer), 1c0a89b6 (test 51-20), ancestrais de HEAD
- Ledger PROD sem `20261010000001` (só leitura, depois da última prova)
