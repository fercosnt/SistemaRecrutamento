---
phase: 52-hub-do-rh-dados-e-contato
plan: 15
subsystem: deploy
tags: [prod-apply, p46apply, efdeploy, push-por-sha, portao, db-types, bloco-b]
status: complete

requires:
  - phase: 52-14
    provides: "52-REVIEW-PORTAO-2 (critical 0, reviewed_head 040c6b4d), PORTAO OK, operador (a) «aplicar» (b) «Confirmo»"
provides:
  - "PROD: migrations 20261011000001 (3 RPCs de leitura do RH) e 20261011000002 (nomes por papel) aplicadas, ledger = arquivo"
  - "PROD: EF ler-cadastro-candidato-rh v1 ACTIVE, verify_jwt=true, 401 sem sessao"
  - "origin/main = bc0d2720 (cliente dos blocos A e B), marcadores no ar nos chunks certos"
  - "database.types.ts com as tres RPCs (commit LOCAL fa6ab81b, sobe no push do bloco C / 52-18)"
affects: [52-16, 52-17, 52-18, 52-SECURITY, 52-UAT]

actuals:
  tokens: 2600      # chars/4: diff de database.types.ts (~75) + este SUMMARY + STATE/ROADMAP; as escritas em PROD nao mudam arquivo do repo
  tasks: 3
  commits: 1        # MEDIDO: git rev-list --count bc0d2720..fa6ab81b (antes do commit deste SUMMARY)
plan_head_before: bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4
plan_head_after: fa6ab81b7d2bd5a8f211cf63454cf664ba91fb43

tech-stack:
  added: []
  patterns:
    - "Escrita em PROD sempre com o portao no MESMO comando (p52_portao --modo apply|deploy|push && escrita)"
    - "db:types num temporario com < /dev/null, movido so com test -s e grep das RPCs novas"

key-files:
  created:
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-15-SUMMARY.md
  modified:
    - database.types.ts

key-decisions:
  - "Pin refs/gsd/52-15/sha = bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4; nenhum commit entre os dois migrate (IN-07 do portao 1)"
  - "Commit do database.types.ts feito so DEPOIS do verify de marcadores no ar (o verify exige origin/main = HEAD)"
  - "Casts confinados mantidos como divida nomeada (avaliacoesRhService.ts:63, revisaoService.ts:479); remove-los e codigo novo depois do review"
  - "JORN-53..62 NAO marcados em REQUIREMENTS.md: IDs compartilhados com planos irmaos ainda abertos e UAT da 52 pendente; operator_rules 3 restringe o tracking a STATE frontmatter e linha do ROADMAP"

requirements-completed: []

coverage:
  - id: D1
    description: "Migrations 0001 e 0002 em PROD pelo p46apply com o portao no mesmo comando; ledger md5 = arquivo"
    requirement: JORN-54
    verification:
      - kind: other
        ref: "Task 1 verify 1: node p46apply.cjs sql … md5(statements[1]) → «ledger = arquivo nas duas versoes»"
        status: pass
    human_judgment: false
  - id: D2
    description: "Smoke das leituras contra os objetos vivos verde (vistas=vacua) e 8/8 mutacoes pos-apply mordem"
    requirement: JORN-56
    verification:
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --sem-migracoes --vistas supabase/tests/p52_leituras_rh_smoke.sql; node scripts/p52_mutacoes.cjs --pos-apply"
        status: pass
    human_judgment: false
  - id: D3
    description: "EF ler-cadastro-candidato-rh ACTIVE com verify_jwt=true; chamada sem Authorization = 401"
    requirement: JORN-55
    verification:
      - kind: other
        ref: "Task 2 verify 1: GET Management API + curl sem sessao → «EF ACTIVE v1 verify_jwt=true» / «sem sessao: 401»"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cliente dos blocos A e B empurrado por sha (enumerado, 0 ALHEIO); origin/main..HEAD vazio; marcadores no ar"
    requirement: JORN-58
    verification:
      - kind: other
        ref: "Task 2 verify 2 → «PRESENTE em PROD: sair-da-prova [/assets/index-CfSo-z5g.js]» e «PRESENTE em PROD, chunk lazy: hub-abas [/assets/PerfilCandidatoRHPage-CqFjwW7k.js]»"
        status: pass
    human_judgment: false
  - id: D5
    description: "Hub /rh/candidatos/:id com sessao real de recrutador ativo (contato, abas, cadastro, inscricao, Big Five, SJT) e linha de log da EF"
    verification: []
    human_judgment: true
    rationale: "human-check do plano: UAT da 52 com sessao real do operador, recarregando sem cache"
  - id: D6
    description: "database.types.ts regenerado sem truncar, com as tres RPCs; tsc 89 → 89"
    verification:
      - kind: other
        ref: "Task 3 verify → «lint exit=2 tsc errors=89»"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-10-11
---

# Phase 52 Plan 15: Bloco B no ar Summary

**O bloco B está em PROD na ordem migration → EF → cliente, com o portão `p52_portao` no mesmo comando de cada
escrita e prova depois de cada passo. As três RPCs de leitura do RH e os nomes por papel foram aplicados pelo
`p46apply`, com o md5 do ledger igual ao arquivo. O smoke contra os objetos vivos deu 20/20 e as 8 mutações
pós-apply mordem. A EF `ler-cadastro-candidato-rh` v1 está ACTIVE com `verify_jwt=true` e responde 401 sem
sessão. O cliente subiu por sha (`ff6878c2..bc0d2720`, 109 commits, 0 ALHEIO), e os dois marcadores estão no ar
nos chunks certos. O `database.types.ts` foi regenerado sem truncar (tsc 89 → 89) e ficou em commit LOCAL até o
push do 52-18.**

## Performance

- **Início:** 2026-10-11T17:11:56Z
- **Fim:** 2026-10-11T17:15:02Z (commit dos tipos), SUMMARY em seguida
- **Tasks:** 3 de 3
- **Arquivos do repositório modificados:** 1 (`database.types.ts`)

## Pré-condições (medidas antes de qualquer escrita)

- **Decisão do operador.** 52-14-SUMMARY tem «aplicar» e «Confirmo» (linhas 14 e 49). O review
  `52-REVIEW-PORTAO-2.md` tem `critical: 0`, `diff_base 0d70ac7d` e `reviewed_head 040c6b4d`.
- **Portão no modo revisão.** `PORTAO OK: revisao=…/52-REVIEW-PORTAO-2.md reviewed_head=040c6b4d6d2e1c6b839c59a14394d1bdf0b138c4 pin=- modo=revisao` (rc=0).
- **Ledger antes do apply.** A leitura só-leitura de `version >= '20261010000000'` devolveu só `20261010000001` e
  `20261010000002`. Nenhuma `20261011…`.
- **Árvore limpa.** `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts`: 0 linhas.
- **Prévia do enumerador.** Rodei antes do apply, com `--aplicado HEAD`, só leitura de git:
  `enumeracao ok: 109 commit(s) em ff6878c2..bc0d2720`, 0 ALHEIO.

## Task 1 (tracer): apply das duas migrations

**Pin:** `refs/gsd/52-15/sha` = `bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4` (= HEAD). Nenhum commit entre os dois `migrate` (IN-07).

| Migration | Início → fim (UTC) | octetos | md5 | Resultado |
|---|---|---|---|---|
| `20261011000001_p52_leituras_rh.sql` | 17:11:59 → 17:12:01 | 29974 | `a42c4754c29cbceb31d7d538f90e37ae` | `PORTAO OK … pin=bc0d2720… modo=apply` → `✅ aplicada e escriturada — md5 do ledger BATE (29974 octetos)` |
| `20261011000002_p52_nomes_rh_por_papel.sql` | 17:12:05 → 17:12:06 | 10931 | `08c996acca5e9248cd15ba491209f444` | `PORTAO OK … pin=bc0d2720… modo=apply` → `✅ aplicada e escriturada — md5 do ledger BATE (10931 octetos)` |

O PRE e o POS de cada migration rodaram dentro da transação e não recusaram. Não houve `55P03` nem `57014`.

**Verify 1:** `ledger = arquivo nas duas versoes` (rc=0).

**Verify 2.** Smoke contra os objetos vivos e mutações:
```
ENSAIO VERDE: supabase/tests/p52_leituras_rh_smoke.sql · prefixadas=[] · aplicadas=[20261011000001,20261011000002] · ausentes=[20261011000003,20261011000004] · vistas=vacua · smokes=[52l=20/20] · evidencia=52l.pop=dev:3,sjt:6,tri:1 · 920 ms
leitura so-leitura igual a baseline: ledger=["20261011000001","20261011000002"] funcoes=4 mutacoes_p52=0 fixtures_p52={"users":0,"candidatos":0}
MUTACOES: 8/8 mordem; controle verde; nada persistiu (pos-apply)
vivo verde e mutacoes mordem
```
`vistas=vacua` é o esperado neste modo, porque nada foi prefixado. A comparação de vistas de verdade foi a do
ensaio do 52-14 (`vistas=igual`).

Tracer: o modo é interativo, `end-of-phase`, e o verify é só `<automated>`. O verify foi re-executado, deu
verde, e a execução seguiu para a expansão.

## Task 2: EF, push e marcadores

**Passo 1, EF (17:12:33 → 17:12:35):**
```
PORTAO OK: … pin=bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4 modo=deploy ledger=[20261011000001,20261011000002]
efdeploy: ler-cadastro-candidato-rh · verify_jwt=true · 1 arquivo(s):
  functions/ler-cadastro-candidato-rh/index.ts  (19932 bytes)
  functions/deno.json  (import map)
efdeploy: OK · version=1 · status=ACTIVE · verify_jwt=true · entrypoint=…/functions/ler-cadastro-candidato-rh/index.ts
```
O GET na Management API devolveu `version=1` e `updated_at = created_at = 2026-10-11T17:12:34.899Z` (slug novo).

**Passo 2, verify 1:** `EF ACTIVE v1 verify_jwt=true` · `sem sessao: 401` (rc=0).

**Passo 3, push (17:12:59 → 17:13:10).** O comando é o «Comando de push» do plano, rodado como está escrito.
- `S` = `bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4`
- `R` (o origin/main antes do push) = `ff6878c2b5d97803c01af54014944ab42b901498`
- O portão no modo push deu `PORTAO OK … modo=push ledger=[20261011000001,20261011000002]`.
- O enumerador classificou **68 `codigo` e 41 `planning`, 0 ALHEIO**: `enumeracao ok: 109 commit(s) em ff6878c2..bc0d2720 · codigo coberto por 52-REVIEW-PORTAO-2.md (reviewed_head 040c6b4d) · codigo contido no apply bc0d2720`.
- O push: `ff6878c2..bc0d2720  bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4 -> main`.

**Passo 4, verify 2.** A primeira tentativa foi às 17:13:32, cerca de 20 s depois do push. A Vercel ainda não tinha
publicado e o resultado foi `AUSENTE no chunk index de PROD: sair-da-prova`. Repeti o mesmo comando, sem mudar
nada, e ele passou às 17:14:25:
```
PRESENTE em PROD: sair-da-prova ["/assets/index-CfSo-z5g.js"]
PRESENTE em PROD, chunk lazy: hub-abas ["/assets/PerfilCandidatoRHPage-CqFjwW7k.js"]
```
Os nomes dos chunks no ar são os mesmos do build local medido no fecho do 52-14. Nesse momento,
`git log --oneline origin/main..HEAD` estava vazio e origin/main = HEAD.

## Task 3: `database.types.ts`

- **Gerador:** binário `supabase` instalado, **v2.116.0**. O comando foi `gen types typescript --project-id isljnozzlvckrgjjbjwp < /dev/null`, com saída num `mktemp`. O resultado foi `rc=0` e 223613 octetos, com as três RPCs. Só depois disso o arquivo foi movido, com `chmod 644`.
- **Diff:** +9 linhas, que são só as três assinaturas novas (`ler_contexto_rejeicao_triagem_revisao`,
  `ler_devolutiva_bigfive_rh`, `ler_sjt_mc_rh`, todas com retorno `Json`).
- **tsc:** 89 antes e 89 depois. `comm -13` (erros novos) e `comm -23` (erros que sumiram) saíram vazios. Verify: `lint exit=2 tsc errors=89`.
- **Commit:** `fa6ab81b chore(52-15): db:types com as RPCs de leitura do RH`. Fica **LOCAL**. Ele sobe no push do bloco
  C (52-18), sob o `52-REVIEW-BANCO`. Até lá, **`git log origin/main..HEAD` terá este commit**, além dos commits de
  `.planning` deste fecho. Isso é esperado e tem dono.
- **Ordem:** o commit foi feito só depois do verify 2 da Task 2 ficar verde, porque esse verify exige origin/main = HEAD.

### Dívida nomeada: casts confinados que continuam no código

O plano manda mantê-los, porque removê-los é código novo depois do review.
- `src/features/avaliacao/services/avaliacoesRhService.ts:63`: `chamarRpc` (`supabase.rpc as unknown as …`), usado
  por `ler_devolutiva_bigfive_rh` e `ler_sjt_mc_rh`. O comentário em :58-60 promete que «o 52-15 apaga este cast no
  mesmo commit». Isso é o IN-09 do portão 1 e está desatualizado: o cast fica.
- `src/features/revisao/services/revisaoService.ts:479`: cast de `ler_contexto_rejeicao_triagem_revisao`.

## Artefatos das escritas em PROD

| Escrita | Artefato |
|---|---|
| migration 0001 | version `20261011000001`, 29974 octetos, md5 `a42c4754c29cbceb31d7d538f90e37ae`, «md5 do ledger BATE» |
| migration 0002 | version `20261011000002`, 10931 octetos, md5 `08c996acca5e9248cd15ba491209f444`, «md5 do ledger BATE» |
| EF | `ler-cadastro-candidato-rh` v1, ACTIVE, verify_jwt=true, `updated_at` 2026-10-11T17:12:34.899Z |
| push | S=`bc0d27204ed4c2b5f8bc24d4889f3f0556411eb4`, R=`ff6878c2b5d97803c01af54014944ab42b901498` |

## Task Commits

1. **Task 1:** nenhum commit. A escrita foi só em PROD; nenhum arquivo do repositório mudou.
2. **Task 2:** nenhum commit. A escrita foi em PROD e no push.
3. **Task 3:** `fa6ab81b` (chore). Fica local até o 52-18.

## Decisions Made

- O commit dos tipos ficou para depois do verify de marcadores, porque esse verify exige origin/main = HEAD.
- REQUIREMENTS.md não foi tocado. JORN-53..62 são declarados também por planos irmãos ainda abertos, e o UAT da 52
  está pendente. Pela operator_rules 3, o tracking fica só no frontmatter do STATE e na linha do ROADMAP.

## Deviations from Plan

**1. [Registro] Saída das mutações capturada em log, não em `/dev/null`**
- No verify 2 da Task 1, a saída do `p52_mutacoes.cjs --pos-apply` foi para um log no scratchpad em vez de
  `>/dev/null`. O objetivo era registrar a linha `MUTACOES: 8/8 …` que o critério de aceite exige. A condição de
  aprovação é a mesma (`&&` sobre o código de saída).

**2. [Registro] A sonda «só com a chave anônima» não rodou**
- O must_have menciona uma chamada «só com a chave anônima» → 401. O `<verify>` do plano só sonda sem
  Authorization, e essa sonda deu 401. Tentei a sonda extra, mas o guarda de segredo do harness bloqueou a leitura
  do `.env`. Não contornei o bloqueio. Fica para o UAT, ou para uma sonda com a chave fornecida pelo operador.

**3. [Registro] Prévia só-leitura do enumerador antes do apply**
- Não é passo do plano. Rodei a prévia para não chegar ao push com as migrations e a EF já no ar e um ALHEIO
  pendente. Não houve escrita.

Total: nenhuma mudança de comportamento; três registros.

## Issues Encountered

A Vercel levou cerca de 1 min para publicar. A primeira leitura de marcadores deu AUSENTE e a repetição, com o
mesmo comando, deu PRESENTE.

## Threat Flags

Nenhuma superfície fora do `<threat_model>`. As ameaças do plano:
- **T-52-41 mitigada:** `--modo apply` com HEAD = pin, e md5 do ledger = arquivo.
- **T-52-42 mitigada:** o GET devolve `verify_jwt=true` e a sonda sem sessão dá 401.
- **T-52-43 mitigada:** a ordem foi migration → EF → cliente, e o deploy e o push mostraram `ledger=[…]` no portão.
- **T-52-44 mitigada:** o arquivo foi gerado em temporário, com `< /dev/null`, `test -s` e o grep das RPCs.
- **T-52-SC:** nenhuma instalação; o binário `supabase` já estava instalado.

## Next Phase Readiness

- O bloco B está no ar. O human-check (UAT da 52) fica com o operador: abrir o hub `/rh/candidatos/:id` com uma conta de
  recrutador ativo, sem cache, e conferir a linha `[ler-cadastro-candidato-rh] ok` no log da EF.
- O bloco C (52-16/17/18) continua bloqueado pelos três carry-forwards do 52-14 (WR-01, WR-02, IN-09 do -2). O
  `fa6ab81b` sobe com ele.
- A janela única (b) termina com este plano.

## Self-Check: PASSED

- `database.types.ts` existe, não está vazio e tem as três RPCs.
- O commit `fa6ab81b` é ancestral de HEAD.
- O pin `refs/gsd/52-15/sha` resolve para `bc0d2720`.
- O ledger de PROD tem `20261011000001` e `20261011000002` com md5 = arquivo.
- origin/main é `bc0d2720` desde o push.
