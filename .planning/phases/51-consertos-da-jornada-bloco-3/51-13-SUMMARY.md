---
phase: 51-consertos-da-jornada-bloco-3
plan: 13
subsystem: database
tags: [jorn-42, lgpd, erase, motor-exclusao, anonimizar_candidato, plano_exclusao_titular, revisao_rejeicao, smoke, mutacoes, tracer]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-08: tabela revisao_rejeicao (migration 20261008000002, NAO aplicada) com os CHECKs de resultado; 51-10: 20261008000003; 51-06: p51_ensaio.cjs e p51_mutacoes.cjs (linha P45M de SMOKES com o gate interno)"
  - phase: 49-consertos-da-jornada-bloco-2
    provides: "49-29: corpos vivos do motor e do plano (20260923000002, md5 46248544/35d45141) e a rede (C3/viii) como molde"
provides:
  - "migration 20261008000004 (NAO aplicada): passo revisao_rejeicao.resultado no motor + a mesma contagem no plano, chave revisao_rejeicao_resultado dentro de tombstone_decisao_final"
  - "p45: (B25) com cinco sub-rotulos, rede de forma (C3/ix) com fronteira de statement auto-conferida, pins do (C3/i) re-carimbados do ARQUIVO (a68e4a6a / 0a4996fe), revisao_rejeicao na baseline e no (z), v_esperado 39"
  - "p51_mutacoes: MD1/MD2 (31 mutacoes no total), fnNomeada e statementForaDeLiteral"
  - "ref local refs/gsd/51-13/base = 011c50e3"
affects: [51-15, 51-16]

actuals:
  tokens: 52190        # chars/4 sobre o diff realizado 011c50e3..a9a2f5e7 (208 762 chars)
  tasks: 2
  commits: 2           # MEDIDO: git rev-list --count 011c50e3..HEAD antes do commit deste SUMMARY
plan_head_before: 011c50e3d543806e2c353249e387322d9704d715
plan_head_after: a9a2f5e71cc90f1c71b3e521983caf3bb4d5fa0e

tech-stack:
  added: []
  patterns:
    - "Fronteira de statement = primeiro ; FORA de literal (comentarios tirados primeiro, literais mascarados para ''), com controle auto-conferido sobre um statement REAL do mesmo trecho: falha da regua sai DEFEITO DA REDE, nunca como propriedade ausente"
    - "Migration montada por script de ancora unica a partir do ARQUIVO anterior (md5 conferido em tres fontes antes da edicao); sentinela copiada do proprio corpo por regex, nunca transcrita"
    - "Delimitadores NOMEADOS por funcao (exatamente 2 ocorrencias, nunca em comentario) para a extracao do pin e da mutacao"

key-files:
  created:
    - supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql
  modified:
    - supabase/tests/p45_motor_exclusao_smoke.sql
    - scripts/p51_mutacoes.cjs

key-decisions:
  - "Contagem nova DENTRO de tombstone_decisao_final (sem chave de topo): consumidores conferidos — a EF executar-direito-titular SOMA os numeros do bloco (contagemDe) e nao fixa chaves; reciboExclusao.ts cita so o nome do passo; nenhum smoke le a mensagem do terminador do dry-run por regex"
  - "Sem REVOKE/GRANT/COMMENT na 0004: CREATE OR REPLACE preserva ACL e comentario (como o 49-29); o PRE os captura e o POS exige iguais, mais anon sem EXECUTE"
  - "(C3/ix)(6) no plano corta tambem na proxima chave (proximo literal mascarado) alem do primeiro ; — o plano e UM statement e sem o segundo corte um IS NOT NULL de bloco posterior satisfaria a clausula por vizinhanca"
  - "(B25/plano) confere o plano (PASSO 0 do motor) E o que o motor declarou em passos, os dois = 1"

patterns-established:
  - "Rede de forma crescida e rodada VERMELHA contra o corpo vivo ANTES do re-pin, e o vermelho registrado com a duracao (a mordida da rede so e observavel nesse ponto da sequencia)"

requirements-completed: []   # JORN-42 e declarado por mais planos da fase (51-14..51-17 sem SUMMARY) — fica aberto pelo shared-ID gate

coverage:
  - id: D1
    description: "O motor raspa revisao_rejeicao.resultado do pedido RESPONDIDO com a sentinela do motor; o NAO respondido continua NULL; o resto das linhas fica; plano = passos = 1 — provado no contrato da 45 com 0002..0004 prefixadas"
    requirement: JORN-42
    verification:
      - kind: integration
        ref: "node scripts/p51_ensaio.cjs --vistas --migracoes=…0002,…0003,…0004 supabase/tests/p45_motor_exclusao_smoke.sql -> ENSAIO VERDE … vistas=igual (abortado; capturar identico)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A asserção morde: MD1 (passo removido) -> P45M FAIL (B25/respondido); MD2 (sentinela seca, CHECK de coerencia derrubado por forma) -> P45M FAIL (B25/nao_respondido); 31/31 no runner, CONTROLE do p45 pelo gate interno 45m=39 de 39"
    requirement: JORN-42
    verification:
      - kind: integration
        ref: "node scripts/p51_mutacoes.cjs -> controle verde; 31/31 mutacoes mordem; nada persistiu"
        status: pass
    human_judgment: false
  - id: D3
    description: "A rede de forma (C3/ix) morde o corpo sem o passo (vermelho registrado ANTES do re-pin) e os pins do (C3/i) sao o md5 dos corpos da 0004 previstos do arquivo, batendo com o 04:anon=…,plano=… do POS-PORTAO no ensaio"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "ensaio com 0002/0003 e pins do 49-29 -> ENSAIO VERMELHO: P45M FAIL (C3/ix): o passo tombstone_decisao_final nao tem exatamente UM UPDATE public.revisao_rejeicao (achados: 0); estatico do smoke -> OK smoke do motor: pins = arquivo (a68e4a6a/0a4996fe)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A purga que chama o motor continua verde (p46_purga_smoke no ensaio com 0002..0004)"
    requirement: JORN-42
    verification:
      - kind: integration
        ref: "node scripts/p51_ensaio.cjs --migracoes=…0002,…0003,…0004 supabase/tests/p46_purga_smoke.sql -> ENSAIO VERDE (1349 ms), sem P46P FAIL"
        status: pass
    human_judgment: false
  - id: D5
    description: "Conferencia ao vivo (C3/i vivo x arquivo, B25 contra o motor aplicado) — so depois do apply da 0004 no portao 51-16"
    requirement: JORN-42
    verification: []
    human_judgment: true
    rationale: "Nada foi aplicado neste plano (ledger em 20261008000001). A corrida ao vivo do p45 e do p46 logo depois do apply e do 51-16"

duration: 14min
completed: 2026-10-09
---

# Phase 51 Plan 13: o motor de exclusão raspa a resposta do revisor no registro novo Summary

**A migration `20261008000004` (não aplicada) faz `anonimizar_candidato` raspar `revisao_rejeicao.resultado`, que é o texto escrito pelo revisor sobre o titular. A raspagem usa a mesma sentinela e a mesma forma `CASE WHEN … IS NULL THEN NULL` do D-60, e `plano_exclusao_titular` conta pela mesma expressão. Isso foi provado no contrato da 45: a (B25) passa, a rede (C3/ix) cresceu e foi rodada vermelha antes do re-pin, e MD1/MD2 mordem nos rótulos certos. A purga continua verde. Nada foi aplicado, publicado ou empurrado.**

## Performance

- **Duração:** ~14 min (2026-10-09T06:31:02Z → 06:45:36Z)
- **Tasks:** 2 de 2
- **Arquivos:** 1 criado, 2 modificados

## Passo 0 — base e medições (só leitura)

- `refs/gsd/51-13/base` = `011c50e3`.
- **Três fontes concordantes:**

| Função | md5 vivo (PROD) | md5 do corpo extraído do `20260923000002` (par de `$function$`) | pin do p45 antes |
|---|---|---|---|
| `anonimizar_candidato(uuid,boolean)` | `4624854408950110cbfebc971481145a` — 86 864 chars / 89 207 octetos | idem, 86 864 / 89 207 | `v_pin_anon` idem |
| `plano_exclusao_titular(uuid)` | `35d451416c22e150e48a583d879fe48d` — 35 368 / 36 664 | idem, 35 368 / 36 664 | `v_pin_plano` idem |

- `config_purga.modo = 'dry_run'`.
- Consumidores do jsonb (`grep tombstone_decisao_final`): `executar-direito-titular/index.ts:1369,1673` soma os números do bloco em `contagemDe` e não fixa chaves; o `index.test.ts` usa fixtures próprias; `_shared/reciboExclusao.ts` (e o gerado) citam só o nome do passo. Nenhum smoke faz regex sobre a mensagem do terminador do dry-run. Por isso a chave nova ficou dentro de `tombstone_decisao_final`.

## Passo 1 — o VERMELHO da rede, ANTES do re-pin

A corrida usou `0002`+`0003` prefixadas, os pins ainda do 49-29, sem `0004` e sem B25:

```
rc=1
ENSAIO VERMELHO: P45M FAIL (C3/ix): o passo tombstone_decisao_final nao tem exatamente UM UPDATE public.revisao_rejeicao (achados: 0). … JORN-42 (1016 ms)
```

O resultado foi a mensagem da (1), e não `DEFEITO DA REDE`. Na mesma corrida, o controle da fronteira passou sobre o `UPDATE public.decisao_final d` real: (c1) não sobrou aspa solta, (c2) o corte saiu com o WHERE escopado e (c3) os juízes de (2), (3), (4) e (6) reprovaram texto real. Todas as asserções anteriores (A, B0..B24, C1, C2, C3/i..viii) ficaram verdes com a `0002`/`0003` prefixadas. Na medição prévia (só leitura), o `UPDATE public.decisao_final d` mascarado saiu inteiro até `c.candidato_id = p_candidato_id);`, com 0 aspas soltas no trecho.

## Os pins novos (previstos do ARQUIVO, nunca do catálogo)

| Função | md5 (corpo entre `$<nome>$` na `0004`) | chars | octetos |
|---|---|---|---|
| `anonimizar_candidato` | `a68e4a6a47d9482f75d3326a8bf2b3e4` | 89 610 | 91 972 |
| `plano_exclusao_titular` | `0a4996feea738f7cfd25feda0ecd7904` | 35 921 | 37 222 |

A segunda leitura, independente, veio do POS-PORTAO no ensaio: `evidencia=… 04:anon=a68e4a6a47d9482f75d3326a8bf2b3e4,plano=0a4996feea738f7cfd25feda0ecd7904`. Os dois valores batem com a tabela.

## Accomplishments

- **Migration `20261008000004`**, montada por script de âncora única a partir do arquivo do 49-29. São 6 âncoras, cada uma com 1 ocorrência (medido), e a sentinela foi copiada do próprio corpo por regex. Ela contém:
  - PRE-PORTAO: os dois md5, `config_purga.modo = 'dry_run'`, a existência de `revisao_rejeicao` e a prova negativa de que o corpo vivo não cita a tabela. Também captura ACL, comentário e propriedades.
  - Os dois `CREATE OR REPLACE` com delimitadores nomeados. Cada delimitador aparece exatamente 2 vezes e nunca em comentário.
  - O passo `SELECT count(*) INTO v_n_rr_res` seguido de `UPDATE public.revisao_rejeicao r SET resultado = CASE WHEN r.resultado IS NULL THEN NULL ELSE <sentinela> END`, escopado às candidaturas do titular e colocado depois do par `decisao_final` → `decisao_final_historico`.
  - A chave nova no retorno, no plano e na mensagem do terminador.
  - POS-PORTAO: forma pelo regex ancorado da (2), ausência de DELETE, ACL/comentário/props iguais, `anon` sem EXECUTE e a evidência `04:`.
- **p45**:
  - (C3/ix), com fronteira fora de literal, CONTROLE DA FRONTEIRA e as cláusulas (1) a (6). A mensagem do PASS (C3) passa a citar «(ix)».
  - (B25), com os sub-rótulos fixture, respondido, nao_respondido, intactas e plano. A fixture tem 2 pedidos em `v_candtr`: um `humana_triagem` respondido e um `automatica` não respondido. Para isso foi acrescentada 1 linha de histórico com ator NULO e `etapa_para = 'triagem'`.
  - O (B1) passou a `+ 1 + v_n_hist_b25`, com o valor vindo de `GET DIAGNOSTICS`.
  - `revisao_rejeicao` entrou na baseline (guarda `P45M FAIL (baseline)`) e no laço do (z). `net.http_request_queue` ficou fora, com a razão escrita.
  - O RESUMO conta as tabelas em `v_ntab`.
  - A contagem passou de 38 para 39 nas seis menções. O «acumula < 37», já defasado, foi corrigido.
  - Re-pin com PROVENIÊNCIA, HISTÓRICO DOS PINS (49-21, 49-29 — antes não registrado — e 51-13), `recomputar`, comentário dos pins e as duas mensagens do (C3/i), tudo por acréscimo. O COMO RODAR ganhou a nota do ensaio.
- **p51_mutacoes**: `fnNomeada`, `statementForaDeLiteral` (com checagem de sanidade do WHERE), MD1 e MD2.

## Gates / smokes (todos ensaios que abortam)

| Verify | Resultado |
|---|---|
| Estático da migration | `OK migration estatica (motor)` |
| Estático do smoke | `OK smoke do motor: pins = arquivo (a68e4a6a/0a4996fe), rede C3/ix, B25, revisao_rejeicao no (z), contagem 39` |
| p45 com `0002`..`0004` + `--vistas` | `ENSAIO VERDE … prefixadas=[20261008000002,20261008000003,20261008000004] … vistas=igual … 1471 ms`; re-rodado no portão do tracer: verde, 1585 ms |
| `capturar()` antes × depois do ensaio do motor | **IDÊNTICO**. A captura inclui a impressão digital de `anonimizar_candidato` e `plano_exclusao_titular` (7 funções) |
| Runner de mutações | `controle verde; 31/31 mutacoes mordem; nada persistiu`; `CONTROLE verde (…p45…): gate 45m=39 de 39 (1025 ms)`; `MD1 morde … -> P45M FAIL (B25/respondido) (948 ms)` no pedido respondido; `MD2 morde … -> P45M FAIL (B25/nao_respondido) (915 ms)` no pedido não respondido |
| p46_purga_smoke com `0002`..`0004` | `ENSAIO VERDE` na 1ª tentativa (1349 ms), sem `P46P FAIL` e sem timeout; `capturar()` antes × depois **IDÊNTICO** |

## Task Commits

1. **Task 1 (tracer): migration 0004 + contrato da 45** — `dc2e89f3` (feat)
2. **Task 2: MD1/MD2 + regressão da purga** — `a9a2f5e7` (test)

## PROD — escritas

**Nenhuma.** Houve apenas leituras e ensaios que abortam. Conferência só-leitura ao final:
- O ledger tem `max(version) = 20261008000001` e nenhuma linha `20261008000004`.
- O motor vivo segue com `4624854408950110…` e o plano com `35d451416c22…`, os corpos do 49-29.
- `revisao_rejeicao` não existe em PROD.
- `config_purga.modo = 'dry_run'`.
- Não houve `git push`: `origin/main..HEAD` tem os commits locais da onda, que sobem no 51-16.

## Files Created/Modified

- `supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql`: o motor e o plano com o passo novo, PRE e POS. Não aplicada.
- `supabase/tests/p45_motor_exclusao_smoke.sql`: (C3/ix), (B25), (z), contagem 39 e re-pin.
- `scripts/p51_mutacoes.cjs`: MD1, MD2 e os dois auxiliares.

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Força do portão] A (C3/ix)(6) no plano corta também na próxima chave**
- **Found during:** Task 1, Passo 1
- **Issue:** a regra do plano é «de `public.revisao_rejeicao` até o primeiro `;`». Só que o plano é um único statement `RETURN jsonb_build_object(…)`, então o corte ia até o fim do corpo. Um `resultado IS NOT NULL` ancorado de um bloco posterior satisfaria a cláusula por vizinhança.
- **Fix:** depois do corte no primeiro `;`, o trecho também é cortado no próximo literal mascarado (`''`), que é a chave seguinte. A regra fica mais estrita, nunca mais frouxa.
- **Commit:** `dc2e89f3`

**2. [Rule 1 - Medição] Os comentários removidos são `/* */` e também `--`**
- **Issue:** o plano diz «comentários removidos», e o molde (C3/viii) só tirava `--`. `plano_exclusao_titular` tem blocos `/** */` dentro do corpo, medidos no octeto 417. Um bloco com aspa ímpar quebraria a máscara de literais.
- **Fix:** o bloco `/* */` é removido primeiro e depois o `--`, na ordem que o (C3/janela) já documenta. Isso vale para a rede e para o POS-PORTAO.
- **Commit:** `dc2e89f3`

**3. [Rule 2] (B25/plano) confere também os `passos` declarados pelo motor**
- **Issue:** o plano manda conferir só `v_plano_j`. A verdade escrita para o sub-rótulo é «o plano conta igual ao motor».
- **Fix:** a sub-asserção exige `plano = passos = 1`. Continua sendo um único incremento.
- **Commit:** `dc2e89f3`

**4. [Rule 3] Extrator de função nomeada no runner**
- **Issue:** o `fn()` do runner procura `$function$;`, que não existe na `0004` (delimitadores nomeados).
- **Fix:** criado `fnNomeada`, que exige o delimitador exatamente 2 vezes. `statementForaDeLiteral` ganhou uma checagem de sanidade: o corte precisa terminar no WHERE escopado, e um corte dentro da sentinela sai como erro do harness, nunca como mutação mal formada mandada ao banco.
- **Commit:** `a9a2f5e7`

---

**Total deviations:** 4 auto-fixed (2 de força de portão, 1 de medição, 1 bloqueante do harness).
**Impact on plan:** nenhuma cláusula foi afrouxada, e nenhum portão ficou incapaz de falhar. O vermelho do Passo 1 e as mordidas MD1/MD2 provam isso por execução.

## Issues Encountered

Nenhum. Todos os ensaios fecharam na primeira tentativa: não houve timeout, 40001 nem `DEFEITO DA REDE`.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`. As mitigações cobrem T-51-43, 44, 45, 72, 73 e 74. Nenhum pacote foi instalado (T-51-SC).

## Known Stubs

Nenhum.

## User Setup Required

None.

## Next Phase Readiness

- O 51-15 (D-57 da tabela nova: catálogo, export, inventário, recibo) já pode prometer «sai» para a resposta do revisor, porque o motor provou que a raspa.
- Itens do 51-16, que é o portão do apply:
  - aplicar `0002` → `0003` → `0004` nessa ordem. O PRE da `0004` exige a tabela e a purga em `dry_run`.
  - Depois do apply, rodar ao vivo o p45 (conferência cruzada vivo × arquivo dos pins `a68e4a6a`/`0a4996fe`) e o p46.
  - Rodar de novo o runner no modo pós-apply (MD2 segura AccessExclusiveLock na `revisao_rejeicao` viva só durante a requisição que aborta).
- O `JORN-42` segue aberto: a ID é compartilhada com 51-14..51-17.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql`, `supabase/tests/p45_motor_exclusao_smoke.sql`, `scripts/p51_mutacoes.cjs`
- FOUND: `dc2e89f3`, `a9a2f5e7` (ancestrais de HEAD)
- commits medidos: `git rev-list --count 011c50e3..HEAD` = 2

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*
