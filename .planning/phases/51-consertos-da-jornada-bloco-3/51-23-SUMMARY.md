---
phase: 51-consertos-da-jornada-bloco-3
plan: 23
subsystem: database
tags: [postgres, supabase, lgpd, disponibilidade, limpeza-destrutiva, p46apply, portao, windows]

requires:
  - phase: 51-21
    provides: "migration 20261010000002 (limpeza destrutiva, PRE/POS, evidência g1l:) e as mordidas L0/L1/L2"
  - phase: 51-22
    provides: "motor G1a (20261010000001) no ar, md5 vivo 9b87e5ee…; disposição WR-02/WR-03 (mitigar no 51-23)"
provides:
  - "20261010000002 aplicada em PROD: as 2 linhas de disponibilidade dos 2 titulares já anonimizados apagadas, e nenhuma outra"
  - "prova T-51-14 completa: motor vivo apaga; 2 titulares anonimizados examinados, 0 com linha; ledger = arquivo"
  - "WINDOWS 89 fixed"
  - "51-23-POPULACAO.json, 51-23-DECISAO.md, 51-23-COMANDO-APPLY.sh; ref refs/gsd/51-23/sha = a4c5642a"
affects: [51-24]

actuals:
  tokens: 2974
  tasks: 3
  commits: 4
plan_head_before: ee6309facab688d162591e962331e07dabecb0ec
plan_head_after: db65ccf4b20c823ed3fff9d0ebba08581d85967f

tech-stack:
  added: []
  patterns:
    - "comando destrutivo como arquivo commitado antes do pin, executado por `bash <arquivo>` (WR-02); o comparador foi mordido antes do commit"
    - "autorização condicional do operador conferida por máquina contra a medição commitada"

key-files:
  created:
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-23-POPULACAO.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-23-DECISAO.md
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-23-COMANDO-APPLY.sh
  modified:
    - .planning/WINDOWS.md

key-decisions:
  - "Operador (2026-10-10, ~03:20 -0300, pré-autorização condicional): «autorizo a limpeza se a medição de agora der 2 titulares / 2 linhas e o alvo for 6819cb8d…» — condição conferida por máquina e satisfeita"
  - "WINDOWS 89 fechado à mão porque gsd-tools windows fixed recusou por uma divergência pré-existente (entrada 90). A divergência não foi corrigida porque está fora do escopo"

patterns-established: []

requirements-completed: [JORN-49]

coverage:
  - id: D1
    description: "População medida fresca (2/2/2, alvo 6819cb8d…, outros 26) e ensaio da 20261010000002 exata sobre o vivo com g1l: igual à medição, abortado, nada persistiu"
    requirement: JORN-49
    verification:
      - kind: integration
        ref: "51-23-PLAN.md Task 1 verify 1 e 2 (rodados duas vezes: execução e portão do tracer)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Autorização condicional do operador conferida por máquina; DECISAO commitada e idêntica a HEAD (WR-03)"
    requirement: JORN-49
    verification:
      - kind: other
        ref: "scratchpad/gate51_23.cjs (AUTORIZACAO CONDICIONAL SATISFEITA) + 51-23-PLAN.md Task 2 verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "Apply vinculado à população aprovada no mesmo comando (51-23-COMANDO-APPLY.sh), portão --modo apply, p46apply migrate, ledger md5 = arquivo"
    requirement: JORN-49
    verification:
      - kind: integration
        ref: "bash .planning/phases/51-consertos-da-jornada-bloco-3/51-23-COMANDO-APPLY.sh (rc=0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Prova T-51-14: motor vivo apaga public.disponibilidade; 2 titulares anonimizados examinados, 0 com linha, 0 linhas restantes"
    requirement: JORN-49
    verification:
      - kind: integration
        ref: "51-23-PLAN.md Task 3 verify 1 — 'T-51-14 provado: …'"
        status: pass
    human_judgment: false
  - id: D5
    description: "WINDOWS 89 fixed na tabela e no JSON, diff restrito"
    requirement: JORN-49
    verification:
      - kind: other
        ref: "51-23-PLAN.md Task 3 verify 2 — 'WINDOWS 89 fixed na tabela e no JSON'"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-10-10
status: complete
---

# Phase 51 Plan 23: limpeza destrutiva da disponibilidade dos titulares já anonimizados (20261010000002) Summary

**As 2 linhas de `public.disponibilidade` dos 2 titulares já anonimizados foram apagadas em PROD. A limpeza é irreversível e não há cópia. Ela rodou com a pré-autorização condicional do operador conferida por máquina, e a população foi conferida no mesmo comando do apply contra os números aprovados. Depois do apply, a prova que o T-51-14 exigia está completa: o motor vivo apaga a disponibilidade, os 2 titulares anonimizados examinados não têm mais linha, as 26 linhas fora do alvo ficaram idênticas, e o ledger é igual ao arquivo. O WINDOWS 89 está `fixed`.**

## Performance

- **Duration:** ~6 min (despacho 03:20:45; apply 03:25:02–03:25:04; prova 03:25:09; WINDOWS 03:25:53 -0300)
- **Started:** 2026-10-10T06:20:45Z
- **Completed:** 2026-10-10T06:26:33Z
- **Tasks:** 3/3
- **Files created:** 3 (+ este SUMMARY); modificado: 1

## Task Commits

1. **Task 1 (tracer): população medida + ensaio.** Commit `f921a2a2` (`51-23-POPULACAO.json`).
2. **Task 2: OK do operador.** Commit `6cc23951` (`51-23-DECISAO.md`).
3. **Task 3: comando do apply, apply e WINDOWS 89.** Commits `a4c5642a` (`51-23-COMANDO-APPLY.sh`, WR-02, antes do pin) e `db65ccf4` (`WINDOWS.md`). O apply em si é escrita em PROD por `p46apply.cjs migrate` e não gera arquivo.

`commits: 4` medido por `git rev-list --count ee6309fa..HEAD` antes do commit deste SUMMARY.

## Task 1: medição fresca e ensaio (só leitura e requisições que abortam)

- Verify 1 (03:21:00): `medido: {"titulares":2,"com_disp":2,"linhas":2,"alvo_md5":"6819cb8d99bbaaae5de23cefae2c88bd","outros_n":26,"medido_em":"2026-10-10T06:21:01.050Z"}`. O ledger tinha `20261010000001` e não tinha `20261010000002`.
- Verify 2 (03:21:04–03:21:07):
  - `ENSAIO VERDE: supabase/tests/p45_motor_exclusao_smoke.sql · prefixadas=[20261010000002] · aplicadas=[…,20261010000001] · ausentes=[] · smokes=[] · evidencia=g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual,alvo=6819cb8d99bbaaae5de23cefae2c88bd · 1052 ms`
  - `ensaio da limpeza exata sobre o vivo: g1l:… = medicao`. Sem `PERSISTIU`.
- Releitura logo depois: titulares 2, linhas 2, total 28 (= 2 + 26). Nada persistiu.
- **PITR:** `GET /v1/projects/isljnozzlvckrgjjbjwp/database/backups` → `http=200 pitr_enabled=false` (`walg_enabled=true`, 7 backups diários). Não há desfazer pontual.
- **Portão de feedback do tracer:** os dois verifies foram repetidos ponta a ponta (03:21:51) e deram verde com os mesmos números. O re-run regravou só o `medido_em` do JSON, e o arquivo commitado foi restaurado (`git checkout --` do arquivo).

As mordidas L0/L1/L2 do 51-21 continuam valendo para o arquivo aplicado, que não mudou: L1 → `POS-PORTAO (restantes)`, L2 → `POS-PORTAO (outros)`, L0 verde.

## Task 2: o OK do operador (pré-autorização condicional) e a conferência por máquina

**Resposta do operador (VERBATIM, mensagem digitada ao orquestrador em 2026-10-10, antes de dormir):**

> «autorizo a limpeza se a medição de agora der 2 titulares / 2 linhas e o alvo for 6819cb8d…»

O orquestrador vinculou essa autorização a condições mais estritas que o texto. O executor conferiu cada uma por máquina (`gate51_23.cjs`, só leitura, que lê a medição COMMITADA). Saída (rc=0):

```
AUTORIZACAO CONDICIONAL SATISFEITA (2026-10-10T06:22:14.419Z): medicao commitada titulares=2,com_disp=2,linhas=2,alvo_md5=6819cb8d99bbaaae5de23cefae2c88bd · ensaio g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual,alvo=6819cb8d99bbaaae5de23cefae2c88bd sem PERSISTIU · ledger 20261010000001=1, 20261010000002=0 · motor vivo md5=9b87e5ee3d072df5f9bf6e99ee1ae7c1
```

Mordida da conferência: contra uma cópia do log com `apagadas=1`, ela recusou (rc=1, `AUTORIZACAO CONDICIONAL NAO SATISFEITA: g1l fora de apagadas=2,…`).

`51-23-DECISAO.md` (commit `6cc23951`): `decisao: apagar`, `alvo_md5_aprovado: 6819cb8d99bbaaae5de23cefae2c88bd`, `linhas_aprovadas: 2`, `com_disp_aprovados: 2`, `aprovado_em: 2026-10-10 03:20 -0300 (aproximado)`. O arquivo também traz a resposta verbatim e diz explicitamente que foi uma pré-autorização condicional. Task 2 verify: `OK do operador registrado para alvo 6819cb8d (2 linhas)` (rc=0).

**WR-03:** `git ls-files --error-unmatch` e `git diff --quiet HEAD --` sobre a DECISAO deram `rastreado, commitado (6cc23951), identico a HEAD`. A conferência rodou antes da Task 3 e de novo dentro do comando do apply, no elo (0), que também exige a DECISAO no pin.

## Task 3: o apply e a prova

**Precondição (03:24):** Task 2 verify verde; `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` vazio; o ledger tinha a 0001 e não tinha a 0002 (conferido de novo no elo (ii)).

**WR-02, o comando exato.** O encadeamento (0)→(i)→(ii)→(iii)→(iv) foi escrito em `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-COMANDO-APPLY.sh` e commitado SOZINHO (`a4c5642a`) ANTES do pin. O pin `refs/gsd/51-23/sha` nasceu depois, em `a4c5642a4e56afc2b381f64a1e84b449a5698864` (= HEAD, que contém o arquivo). O apply rodou por `bash <arquivo>`, sem redigitar nada. Como o operador está dormindo, o «mostrado no checkpoint» da disposição do WR-02 foi trocado por «commitado antes de rodar e reportado aqui».

O elo (ii) lê `alvo_md5_aprovado`/`linhas_aprovadas`/`com_disp_aprovados` da DECISAO, por chave ancorada em `^`, e compara:

- `alvo_md5` como string;
- `linhas` e `com_disp` com `Number()`;
- `titulares` ≥ o de `51-23-POPULACAO.json`.

Ele também exige `decisao: apagar`, a 0001 no ledger e a 0002 fora dele.

**Mordida do comparador.** Foi a linha `CMP=` exata do arquivo, rodada antes do commit sobre uma medição só-leitura real e cópias alteradas no scratchpad. O controle deu verde (rc=0). Todos os casos abaixo recusaram com rc=1 e `POPULACAO DIFERE DA APROVADA: …`:

| Caso | Alteração | Resultado |
|---|---|---|
| B1 | `linhas_aprovadas: 3` | `linhas agora 2 != aprovadas 3` |
| B2 | alvo aprovado com 1 dígito trocado | `alvo_md5 agora … != aprovado 6818…` |
| B3 | `com_disp_aprovados: 1` | `com_disp agora 2 != aprovados 1` |
| B4 | POPULACAO com `titulares: 3` | `titulares agora 2 < medido 3` |
| B5 | chave `linhas_aprovadas` removida | `ausente ou malformado` |
| B6 | `decisao: vetar` | `decisao nao e apagar` |
| B7 | medição com `limpeza_no_ledger: 1` | `20261010000002 ja no ledger` |
| B8 | chave sem âncora (espaço antes) | `ausente ou malformado` |

**Saída do apply** (`bash 51-23-COMANDO-APPLY.sh`, rc=0):

```
inicio: 2026-10-10 03:25:02 -0300
(0) WR-03 ok: DECISAO, POPULACAO e este comando commitados, identicos a HEAD e no pin a4c5642a
(i) medido agora: {"titulares":2,"com_disp":2,"linhas":2,"alvo_md5":"6819cb8d99bbaaae5de23cefae2c88bd","outros_n":26,"motor_no_ledger":1,"limpeza_no_ledger":0,"medido_em":"2026-10-10T06:25:03.008Z"}
(ii) populacao de agora = aprovada: titulares=2 (>= 2), com_disp=2, linhas=2, alvo_md5=6819cb8d99bbaaae5de23cefae2c88bd; outros_n=26 (so registro); ledger 0001=1, 0002=0
PORTAO OK: revisao=.planning/phases/51-consertos-da-jornada-bloco-3/51-REVIEW-GAPS-1.md reviewed_head=c35cd52408040a0258730641fead1612fcffe2a8 pin=a4c5642a4e56afc2b381f64a1e84b449a5698864 modo=apply

── 20261010000002_p51_limpa_disponibilidade_anonimizados.sql
   version : 20261010000002
   name    : p51_limpa_disponibilidade_anonimizados
   octetos : 16300
   md5     : 6b4a9d59d7da5e4a98cf66f4302dc175
   ✅ aplicada e escriturada — md5 do ledger BATE (16300 octetos)
fim: 2026-10-10 03:25:04 -0300 rc=0
```

A primeira tentativa passou: não houve `55P03`/`57014` nem retry. O PRE/POS rodou na mesma transação. Se o POS `(outros)` tivesse recusado, nada teria persistido.

**Prova T-51-14 (Task 3 verify 1, 03:25:09, rc=0):** `T-51-14 provado: motor vivo apaga a disponibilidade; 2 titular(es) anonimizado(s) examinado(s), 0 com linha; ledger = arquivo`. A população examinada (2) é ≥ a medida (2), então o zero não vem de população vazia.

**Leitura de volta (só leitura, 03:25:10):** `outros_n` = 26, total = 26. Antes eram 26 fora do alvo e 28 no total; as 2 linhas a menos são exatamente as do alvo. Motor vivo md5 = `9b87e5ee3d072df5f9bf6e99ee1ae7c1` (não mudou). Cabeça do ledger = `20261010000002`. `config_purga.modo` = `dry_run`.

| | antes (06:21Z / 06:25:03Z) | depois (06:25:10Z) |
|---|---|---|
| titulares anonimizados | 2 | 2 |
| linhas deles | 2 | 0 |
| outros_n (só registro) | 26 | 26 |

**WINDOWS 89.** Primeiro rodou `gsd-tools windows fixed 89`. Ele recusou SEM escrever: `Ledger counts disagree with entries: frontmatter open/waived/fixed/total=37/10/46/93 but entries yield 38/10/45/93`. A causa é pré-existente: o commit `26a168cc` (51-16) marcou a entrada 90 como `fixed` na tabela e no frontmatter, mas deixou a entrada JSON 90 `open`. O plano manda editar à mão nesse caso, e a edição foi feita por script: linha 89 → `fixed` com motivo e `resolved_at`; JSON 89 → `status: fixed`, `reason`, `resolved_at: 2026-10-10T06:25:53.000Z`; frontmatter `open_count 37→36`, `fixed_count 46→47`, `last_updated`. O script também confere que o JSON inteiro ainda faz parse. O diff conferido (`git diff -U0`) só toca o frontmatter (linhas 3, 5 e 7), a linha da tabela 106 (id 89) e as linhas 1222–1225 (JSON 89). Task 3 verify 2: `WINDOWS 89 fixed na tabela e no JSON` (rc=0). Commit `db65ccf4`.

**Nenhum push:** `git ls-remote origin refs/heads/main` = `53cb73ff240df4507fd808aa86c909e43a941669` = `R0` do 51-22.

## Files Created/Modified

- `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-POPULACAO.json`: medição (contagens e md5)
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-DECISAO.md`: OK condicional verbatim e conferência por máquina
- `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-COMANDO-APPLY.sh`: o comando exato do apply (WR-02)
- `.planning/WINDOWS.md`: entrada 89 → fixed
- PROD: `public.disponibilidade` (−2 linhas, as do alvo aprovado); linha `20261010000002` do ledger

## Decisions Made

As do operador, descritas acima. O executor não decidiu pelo operador: ele só conferiu, por máquina, a condição que o operador escreveu.

## Deviations from Plan

1. **[Rule 3, bloqueio] WINDOWS 89 editado à mão.** O `windows fixed 89` recusou por uma divergência de contagem pré-existente, a da entrada 90 que o 51-16 deixou divergente entre tabela e JSON. O plano já prevê a edição à mão («se o diff tocar mais, restaurar e editar à mão»). A divergência da entrada 90 **não** foi corrigida porque está fora do escopo (ver «Deferred Issues»). Commit `db65ccf4`.
2. **`aprovado_em` diverge do horário informado pelo orquestrador.** O despacho informou «~03:25 -0300, aproximado», mas o relógio da máquina marcava 03:20:45 -0300 quando este executor começou, e isso é depois da mensagem. A DECISAO registra `03:20 -0300 (aproximado)` como limite superior e explica a divergência. O valor exato não foi medido.
3. **Fortalecimentos no comando do apply, além do texto do plano (WR-02/WR-03):** o elo (0) confere DECISAO, POPULACAO e o próprio comando como commitados, idênticos a HEAD e no pin; o elo (ii) também exige `decisao: apagar`, chaves bem formadas, a 0001 no ledger e a 0002 fora. Esses elos só podem recusar mais, nunca menos.
4. **Execução dos verifies.** Os `<verify>` foram extraídos byte a byte do PLAN.md para arquivos no scratchpad e rodados de lá, como no 51-22. Nenhum foi alterado.

## Deferred Issues

- **WINDOWS 90: tabela/frontmatter `fixed` × JSON `open`.** O commit `26a168cc` (51-16) editou a tabela e as contagens, mas não a entrada JSON. Por isso `gsd-tools windows status`/`fixed` recusam com «Ledger counts disagree with entries» (hoje `36/10/47/93` × `37/10/46/93`). Conserto: pôr a entrada JSON 90 em `status: fixed` com o `reason`/`resolved_at` que a linha da tabela já traz, num commit só de `.planning/`. Isso fica fora deste plano.

## Issues Encountered

None além dos desvios acima.

## User Setup Required

None.

## Next Phase Readiness

- 51-24 (push e redeploy da EF `executar-direito-titular`): a regra (8) do portão (`--modo deploy|push`) exige toda migration `_p51_` no ledger, e agora a `20261010000002` está lá. O HEAD local continua à frente de `origin/main`, o que é esperado porque o push é do 51-24.
- Desfazer: não existe. As linhas apagadas não voltam e não há cópia (`pitr_enabled=false`).

## Self-Check: PASSED

- FOUND: `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-POPULACAO.json`, `51-23-DECISAO.md`, `51-23-COMANDO-APPLY.sh`
- FOUND: commits `f921a2a2`, `6cc23951`, `a4c5642a`, `db65ccf4` (ancestrais de HEAD)
- FOUND: `refs/gsd/51-23/sha` = `a4c5642a`
- PROD: ledger `20261010000002` com md5 = arquivo; 0 linhas de titular anonimizado; `origin/main` = R0

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-10*
