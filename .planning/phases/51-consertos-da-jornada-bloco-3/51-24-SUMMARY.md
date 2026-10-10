---
phase: 51-consertos-da-jornada-bloco-3
plan: 24
subsystem: publicacao
status: complete
tags: [lgpd, recibo-exclusao, edge-function, efdeploy, push-enumerado, vercel, gap-closure, G1b, G2, T-51-14]
requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-18 (cliente G2), 51-19 (recibo G1b + texto aprovado), 51-22 (motor G1a no ledger + publicar_texto_51_19 confirmado), 51-23 (limpeza no ledger, T-51-14 provado)"
provides:
  - "executar-direito-titular v15 ACTIVE com o recibo aprovado no 51-19 (antes v14 de 87be2703)"
  - "cliente dos gaps publicado: origin/main 53cb73ff -> 3bb9653d -> 30e0b5f6, por sha enumerado"
  - "51-24-EF-ANTES.md: base de desfazer das EFs + marcador M"
  - "DISPOSITION WR-01/WR-02 fixed; evidencia do conserto no SECURITY; mapa Nyquist 51-18..51-24; nota 51-GAPS-DECISAO no SC6 e no JORN-49"
affects: [gsd-secure-phase 51, re-verificacao da fase 51, gsd-validate-phase 51]
estimate:
  tokens: 60000
  tasks: 3
actuals:
  tokens: 5640     # chars/4 sobre as linhas acrescentadas em 70ad42b4..30e0b5f6 (22 561 chars), sem este SUMMARY
  tasks: 3
  commits: 2       # git rev-list --count 70ad42b4..HEAD antes do commit deste SUMMARY
plan_head_before: 70ad42b4cffb37f7b00f20e759deff7f97e6b0f3
plan_head_after: 30e0b5f6de817d75eed4fdc0a3f555f3c2e7d76f
tech-stack:
  added: []
  patterns:
    - "marcador ASCII-only com controle positivo no mesmo crawler: o texto ANTIGO achado no chunk prova que o AUSENTE do novo discrimina"
    - "nome de chunk com hash de conteúdo igual entre o build local do sha e o servido: o servido é o build daquele sha"
key-files:
  created:
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-24-EF-ANTES.md
  modified:
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-REVIEW-DISPOSITION.md
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-SECURITY.md
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-VALIDATION.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - "exportar-meus-dados nao redeployada: o fechamento de imports (exportAllowlist.ts, index.ts, deno.json) e igual ao de refs/gsd/51-16/sha, de onde saiu a v8 viva"
  - "Marcador M = «porque o cadastro exige uma UF» (30 chars, so ASCII), para nao depender de o bundler escapar acentos"
  - "O commit deste SUMMARY nao foi empurrado: o plano manda empurrar so o registro da Task 3; o orquestrador decide o push do tracking"
requirements-completed: []   # JORN-46/JORN-49: a re-verificacao decide (must_not do plano)
coverage:
  - id: D1
    description: "A EF que manda o recibo ao titular embute o texto aprovado pelo operador (v15 ACTIVE)"
    requirement: "JORN-49"
    verification:
      - kind: other
        ref: "grep 'efdeploy: OK .*status=ACTIVE' $TMPDIR/p51_24_ef_executar-direito-titular.log + igualdade byte a byte 51-19-TEXTO-APROVADO.md x recibo-exclusao.json x _shared/reciboExclusao.ts + check:recibo-exclusao"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cliente dos gaps publicado por sha enumerado, e o recibo novo servido no chunk index-*"
    requirement: "JORN-46"
    verification:
      - kind: other
        ref: "p51_portao --modo push && p50_enumera ... && git push origin <sha>:refs/heads/main; crawler de rh.beautysmile.com.br (AUSENTE antes, PRESENTE depois)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Leitura do recibo novo na tela de privacidade do candidato (texto legal ao titular)"
    requirement: "JORN-49"
    verification: []
    human_judgment: true
    rationale: "A prévia do recibo na tela segue como item de UAT do 51-17 (51-VALIDATION, Manual-Only); o crawler prova a presença do texto no bundle, não a leitura."
duration: 9min
completed: 2026-10-10
---

# Phase 51 Plan 24: recibo aprovado no ar, cliente dos gaps publicado e registro da fase Summary

**`executar-direito-titular` subiu de v14 para v15 (ACTIVE, 03:31:35 -0300) com o recibo que o operador aprovou no 51-19, conferido byte a byte antes do deploy. Em seguida o cliente do G2 e do G1b foi publicado por sha enumerado (`53cb73ff..3bb9653d`, 42 commits, nenhum ALHEIO). O marcador do recibo novo estava AUSENTE do PROD antes do push e passou a ser servido em `/assets/index--Yy-gC6F.js`. DISPOSITION, SECURITY e VALIDATION agora registram o conserto com evidência, sem mexer em veredito, `threats_open` ou `nyquist_compliant`.**

## Performance

- **Duration:** cerca de 9 min (03:29:16 → 03:37:52 -0300)
- **Started:** 2026-10-10T06:29:16Z
- **Completed:** 2026-10-10T06:38Z
- **Tasks:** 3/3
- **Files modified:** 7 (1 criado, 6 editados), mais este SUMMARY

## Accomplishments

- **Tracer:** o recibo aprovado chegou à EF que o manda ao titular. A EF foi publicada pelo portão (regra 8: as duas migrations do gap estão no ledger com o md5 do arquivo) e não houve recusa.
- **Cliente:** foi publicado do código revisado (`51-REVIEW-GAPS-1.md`, `reviewed_head c35cd524`) e contido no pin aplicado (`a4c5642a`). O repositório é igual a PROD: `origin/main..HEAD` ficou vazio depois do push do registro.
- **Registro:** WR-01/WR-02 estão `fixed` com evidência. O SECURITY ganhou a seção «Evidência do conserto (51-18..51-24)». O VALIDATION ganhou 18 linhas novas no mapa e os escalados agora apontam o conserto. O SC6 e o JORN-49 receberam a nota de que o `51-GAPS-DECISAO.md` prevalece.

## Task Commits

1. **Task 1 (tracer): versões vivas, marcador, deploy.** Commit `3bb9653d` (docs, `51-24-EF-ANTES.md`), feito às 03:31:21, ANTES do deploy das 03:31:33. O deploy em si é escrita em PROD e não gera arquivo.
2. **Task 2: push do cliente.** Sem arquivo no repositório. O push foi `53cb73ff..3bb9653d` às 03:32:02–03:32:10.
3. **Task 3: registro da fase.** Commit `30e0b5f6` (docs). O push só de `.planning/` foi `3bb9653d..30e0b5f6` às 03:37:37–03:37:43.

`commits: 2` foi medido por `git rev-list --count 70ad42b4..HEAD` antes do commit deste SUMMARY.

## Task 1: Passo 0 (só leitura) e deploy

**Precondição:** `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` saiu vazio. `51-19-TEXTO-APROVADO.md` está commitado (`4d58129e`) e é igual a HEAD. Ledger: `20261010000001` = `7e88599631e1d22666615935ef19477c` e `20261010000002` = `6b4a9d59d7da5e4a98cf66f4302dc175`, os dois iguais ao `md5 -q` dos arquivos.

**(i) Texto.** O segundo `<verify>` imprimiu `o recibo que a EF embute e o aprovado pelo operador` e `check:recibo-exclusao` deu `OK`, rc=0.

**(ii) Versões vivas** (GET só-leitura às 03:29:45 -0300). Ficaram gravadas em `51-24-EF-ANTES.md`:

| slug | version | status | verify_jwt | updated_at | ezbr_sha256 | origem |
|---|---|---|---|---|---|---|
| executar-direito-titular | 14 | ACTIVE | true | 2026-10-10T00:56:44.937Z | `afc9ec2a…8033e` | `87be2703` (`refs/gsd/51-16/sha`) |
| exportar-meus-dados | 8 | ACTIVE | true | 2026-10-10T00:56:38.268Z | `114d9710…934d2a` | `87be2703` |

As duas versões batem com as esperadas (14 e 8), então não houve motivo para parar.

**(iii) `exportar-meus-dados` não foi redeployada.** O fechamento de imports dela é igual ao da v8. `efdeploy.cjs exportar-meus-dados --dry-run` lista `_shared/exportAllowlist.ts` e `exportar-meus-dados/index.ts` (mais o import map `deno.json`). Os três arquivos dão `igual` em `git diff --quiet refs/gsd/51-16/sha HEAD`. Entre `87be2703` e HEAD, o único arquivo que mudou em `supabase/functions/` foi `_shared/reciboExclusao.ts` (4 linhas).

**(iv) Validação da publicação em seco** (03:30:24–03:30:29). Rodou o comando «Push» da Task 2 byte a byte. Os dois regex foram extraídos do plano por máquina e conferidos por `cmp`. O último elo foi trocado por `echo`. Saída:
- `PORTAO OK: … pin=a4c5642a… modo=push ledger=[20261008000001,…,20261010000001,20261010000002]`
- `enumeracao ok: 41 commit(s) em 53cb73ff..70ad42b4 · codigo coberto por 51-REVIEW-GAPS-1.md (reviewed_head c35cd524) · codigo contido no apply a4c5642a`
- `PUSH VALIDADO EM SECO (nada empurrado)`

**(v) Marcador VERMELHO.** `M` = `porque o cadastro exige uma UF`: são 30 caracteres, só ASCII, da frase da UF de `texto_futuro`. O trecho tem 0 ocorrências no `recibo-exclusao.json` de `87be2703` e 2 no de HEAD. O crawler foi rodado às 03:30:50:
```
AUSENTE no chunk index de PROD: porque o cadastro exige uma UF (visitados=53; achados=[])
```
Junto rodou um controle no mesmo instante, com o texto ANTIGO `Ficam guardados o seu estado (UF)`, que foi achado em `["/assets/index-BnGosyaL.js"]`. Isso mostra que o crawler alcança o chunk do recibo, e portanto o AUSENTE acima discrimina.

**Passo 1, deploy** (03:31:33 → 03:31:35 -0300, um comando):
```
PORTAO OK: revisao=…/51-REVIEW-GAPS-1.md reviewed_head=c35cd524… pin=a4c5642a… modo=deploy ledger=[…,20261010000001,20261010000002]
efdeploy: executar-direito-titular · verify_jwt=true · 5 arquivo(s): _shared/email-config.ts, _shared/email-templates.ts, _shared/reciboExclusao.ts, executar-direito-titular/helpers.ts, executar-direito-titular/index.ts (+ deno.json)
efdeploy: OK · version=15 · status=ACTIVE · verify_jwt=true · entrypoint=file:///tmp/user_fn_isljnozzlvckrgjjbjwp_…_15/source/functions/executar-direito-titular/index.ts
```
A leitura de volta por GET deu `version 15`, `ACTIVE`, `verify_jwt true`, `updated 2026-10-10T06:31:35.436Z` e `ezbr_sha256 8b5c4024…2a9b`. `exportar-meus-dados` continua na v8, sem mudança.

**Portão de feedback do tracer** (auto, só `<automated>`): os dois `<verify>` foram re-executados e saíram verdes. O verify 1 imprimiu `executar-direito-titular publicada (ACTIVE)`; o verify 2 imprimiu `o recibo que a EF embute e o aprovado pelo operador` e `check:` OK. Só depois disso a Task 2 começou.

## Task 2: push e marcador

Antes do push: `git ls-remote origin refs/heads/main` = `origin/main` = `53cb73ff`, e a árvore vigiada estava limpa.

**Push** (03:32:02–03:32:10 -0300, um comando, por sha):
```
PORTAO OK: … modo=push ledger=[20261008000001,…,20261010000001,20261010000002]
enumeracao ok: 42 commit(s) em 53cb73ff..3bb9653d · codigo coberto por 51-REVIEW-GAPS-1.md (reviewed_head c35cd524) · codigo contido no apply a4c5642a
To github.com:fercosnt/SistemaRecrutamento.git
   53cb73ff..3bb9653d  3bb9653d8b88db4998124bfddaac4ea1cf3ecc9e -> main
```
`R` = `53cb73ff240df4507fd808aa86c909e43a941669`, `S` = `3bb9653d8b88db4998124bfddaac4ea1cf3ecc9e`.

**Enumeração:** 42 commits, sendo 10 `codigo`, 32 `planning` e **0 ALHEIO**. Os `codigo` são:

| sha | assunto |
|---|---|
| `39c92206` | test(51-validacao): JORN-48 — bloco do Raven no hub |
| `138a5d2f` | test(51-validacao): JORN-48 — célula do Raven no ScoreCard |
| `4eb383f8` | test(51-validacao): JORN-48 — CognitivoBandCard «Prova cognitiva» |
| `359fd59a` | feat(51-19): tracer — recibo separa as razões (G1b) |
| `4014c299` | feat(51-18): tracer — prova cognitiva escreve a conclusão no cache (G2) |
| `4003bfb1` | feat(51-18): caso aberto, Big Five e último envio da Redação (G2) |
| `405e19bd` | test(51-19): razões separadas e origem da disponibilidade |
| `68a670d3` | feat(51-20): tracer — motor apaga a disponibilidade (G1a) |
| `1c0a89b6` | test(51-20): MF1/MF2, mutações sobre o corpo vigente, `--so` |
| `aca02722` | feat(51-21): tracer — limpeza da disponibilidade (G1a destrutiva) |

Os outros 32 são `planning`, de `8448c815` (51-17) a `3bb9653d` (51-24). A lista completa saiu no log da enumeração e é a mesma da validação em seco, mais o `3bb9653d`.

**Verify 1** (logo após o push) imprimiu `remoto = HEAD, pin aplicado publicado, origin/main..HEAD vazio`.

**Build local do mesmo sha:** `npm run build` terminou com rc=0 e `assert-chunks PASSED`. `grep -rl "porque o cadastro exige uma UF" build/assets/` devolveu `build/assets/index--Yy-gC6F.js`, que é um `index-*`, o chunk eager.

**Vercel e marcador servido:**
- 1ª tentativa (03:32:37): `AUSENTE … (visitados=53; achados=[])`. O `/` ainda servia `index-BnGosyaL.js`, ou seja, o build não tinha terminado.
- `vercel ls` mostrou a Production mais nova como `● Ready`. `vercel inspect` dela: `dpl_6Jvxyv1JWsi3CWABhmFUekXbie7V`, criada às 03:32:13 -0300, status Ready, build de 26 s.
- 2ª tentativa (03:33:32): `PRESENTE em PROD: ["/assets/index--Yy-gC6F.js"]`, rc=0. O nome do chunk, que carrega hash de conteúdo, é o MESMO do build local de `3bb9653d`. Isso indica que o servido é o build desse sha, e o G2 está nele.
- Re-conferido às 03:37:52, depois do push do registro: continua PRESENTE no mesmo chunk.

## Task 3: registro

Todas as edições foram feitas à mão. Nenhum escritor de estado do gsd-tools foi chamado. O diff de cada arquivo foi conferido:
- `51-REVIEW-DISPOSITION.md`: WR-01 e WR-02 passaram de `open` para `fixed`, com nota e evidência (planos, commits, versão da EF, chunk). Ganhou `updated: 2026-10-10`. `review_counts` não mudou.
- `51-SECURITY.md`: a seção «Evidência do conserto (51-18..51-24) — aguardando a re-auditoria» entrou logo depois de «Como fechar o T-51-14». Ela cobre a metade da disponibilidade (51-22 e 51-23), a metade da UF (51-19 e 51-24) e o UF-3 (cliente consertado, servidor em backlog). O diff do frontmatter está vazio: `status`, `verdict`, `threats_open: 1` e a linha «OPEN — BLOQUEANTE» ficaram intocados.
- `51-VALIDATION.md`:
  - 18 linhas novas no mapa (51-18-T1 … 51-24-T3), com os threat refs T-51-75..T-51-98 tirados do `<threat_model>` de cada plano;
  - os três escalados ganharam «→ consertado em 51-NN (evidência: …)»;
  - JORN-46 e JORN-49 ganharam, na cobertura, a nota do conserto publicado.
  - `nyquist_compliant: false` e `status` ficaram intocados.
- `ROADMAP.md`:
  - o critério 6 da Phase 51 ganhou a nota «⚠ Prevalece o `51-GAPS-DECISAO.md`…», sem reescrever o texto original;
  - `**Plans**: 24/24`;
  - 51-18..51-24 estão `[x]` e com «— ✓ 2026-10-10»;
  - a linha da tabela de progresso passou a `24/24 | In Progress`.
- `REQUIREMENTS.md`: só a linha do JORN-49 mudou, com a nota no fim. A caixa continua `- [ ]` e a rastreabilidade não mudou.
- `STATE.md`: só o frontmatter mudou: `status: verifying` (precedente do `ef7fa24c`), `stopped_at`, `last_updated`, `completed_plans: 171` e `last_activity_desc`. Nenhum bloco histórico foi tocado (`git diff -U0`: 3 hunks, todos no frontmatter).

**Verify 1** imprimiu `registro: WR-01/WR-02 fixed, evidencia do T-51-14 anexada sem mudar veredito, mapa com 51-18..51-24, 51-GAPS-DECISAO anotado no SC6 e no JORN-49`.

**Push do registro** (03:37:37–03:37:43): `PORTAO OK … modo=push`, depois `enumeracao ok: 1 commit(s) em 3bb9653d..30e0b5f6` (o `30e0b5f6` classificado como `planning`) e `3bb9653d..30e0b5f6 -> main`.

**Verify 2** imprimiu `origin/main..HEAD vazio depois do registro`.

## `origin/main..HEAD`

Ficou vazio em `30e0b5f6`. Depois dele, a única coisa que entra é o commit DESTE SUMMARY (só `.planning/`), que não foi empurrado: o plano manda empurrar apenas o registro da Task 3, e o push do tracking cabe ao orquestrador. Ele é empurrável pela mesma cadeia «Push», porque a enumeração o classifica como `planning`.

## Decisions Made

- `exportar-meus-dados` não foi redeployada porque o fechamento de imports é igual ao da v8 (razão acima).
- O marcador escolhido é só ASCII, e o AUSENTE foi provado com um controle positivo.
- O status do STATE ficou `verifying`, com o mesmo valor usado quando os 17 planos originais terminaram (`ef7fa24c`).

## Deviations from Plan

**1. [Rule 2, procedimento de verificação] Controle positivo no passo VERMELHO do marcador**
- **Found during:** Task 1 (v)
- **Issue:** sem um controle, um AUSENTE do crawler não distingue «o build novo ainda não está no ar» de «o crawler não alcança o chunk do recibo».
- **Fix:** o mesmo crawler rodou em seguida com o texto ANTIGO e o achou em `index-BnGosyaL.js`. O controle ficou registrado em `51-24-EF-ANTES.md`.
- **Files modified:** `51-24-EF-ANTES.md` (`3bb9653d`)

**2. [Rule 3] Laço em zsh no Passo 0 (iii)**
- **Issue:** `for f in $F` no zsh não divide por linha, então a primeira comparação recebeu os dois caminhos num único argumento.
- **Fix:** a comparação foi repetida com os três caminhos literais, e todos deram `igual`. Esse resultado é o que está registrado.

**3. Leitura do estado da Vercel em vez de espera cega**
- A 1ª tentativa do crawler deu AUSENTE. Em vez de esperar 2 minutos, o executor consultou `vercel ls`/`vercel inspect` (só leitura), viu Ready e repetiu o crawler, que deu PRESENTE. Foram 2 das 3 tentativas permitidas.

---

**Total deviations:** 3, nenhuma afrouxando portão.
**Impact on plan:** nenhum desvio de escopo. Nenhum `git add -A`, nenhum `--no-verify`, nenhum `supabase db push`. O hook `guard-git.sh` não bloqueou nada.

## Issues Encountered

Nenhum. O portão não recusou nada, a enumeração não achou ALHEIO, e `origin/main` estava em `53cb73ff` na hora do push, como esperado.

## Threat Flags

Nenhuma superfície nova. T-51-96, T-51-97 e T-51-98 foram mitigados como o `<threat_model>` prevê:
- igualdade byte a byte e `check:` antes do deploy;
- portão no mesmo comando de cada escrita, validação em seco antes do 1º deploy, enumerador com `--revisoes`/`--aplicado`, push por sha;
- registro escrito só depois das provas, com veredito, `threats_open` e `nyquist_compliant` intocados.

## Desfazer (não executado; só com checkpoint do operador)

O desfazer segue a ordem inversa do D-55:
1. **Cliente:** commit de revert dos caminhos do gap, enviado por sha em avanço rápido. Nunca reenviar sha antigo.
2. **EF:** `git worktree add <dir> 87be2703ea130384e6ea66a14c9093717a980dea` e `node <dir>/efdeploy.cjs executar-direito-titular`. A fonte está em `51-24-EF-ANTES.md`.

## Next Phase Readiness

A fase está pronta para a re-auditoria e a re-verificação. Nenhuma delas é feita aqui. Próximos passos:
1. **`/gsd-secure-phase 51`**: re-auditar o T-51-14 (a evidência está na seção nova do `51-SECURITY.md`) e o UF-3.
2. **Re-verificação da fase:** `/gsd-verify-work 51` ou o verificador, contra os critérios com a nota do `51-GAPS-DECISAO.md`. Decide JORN-46 e JORN-49.
3. **`/gsd-validate-phase 51`**: re-auditar `nyquist_compliant`.

Pendências abertas e registradas:
- backlog `(51-18)` (`pontuar_cognitivo` aceita reenvio);
- WR-01/WR-04 do `51-REVIEW-GAPS-1` (comentário do motor; invariante dos vivos);
- UAT da prévia do recibo na tela;
- JORN-42 (WR-01/WR-02 do review -3).

## Self-Check: PASSED

- FOUND: `51-24-EF-ANTES.md`, `51-24-SUMMARY.md`
- FOUND (ancestrais de HEAD): `3bb9653d`, `30e0b5f6`, `4014c299`, `4003bfb1`, `359fd59a`, `405e19bd`, `4d58129e`, `db65ccf4`
- `30e0b5f6` contido em `origin/main`

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-10*
