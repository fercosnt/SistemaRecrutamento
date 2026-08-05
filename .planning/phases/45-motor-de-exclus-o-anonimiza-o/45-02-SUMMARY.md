---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 02
subsystem: compliance
tags: [lgpd, codegen, node, vitest, pii-inventory, recibo-exclusao]

requires:
  - phase: 42-invent-rio-pii
    provides: "docs/compliance/pii-inventory.yaml — o catálogo coluna-a-coluna que é a FONTE do recibo"
  - phase: 44-exporta-o-acesso
    provides: "gen-export-allowlist.cjs — o molde do gerador + `--check`, e o precedente do espelho .ts em vez de import de JSON (assunção A1 fechada em PROD)"
provides:
  - "Recibo de exclusão em duas colunas como artefato GERADO do inventário PII completo (69 tabelas), nunca digitado"
  - "Vocabulário fechado `PASSOS_MOTOR` (7 valores) — o contrato que 45-07 (tombstone/RPC) e 45-10 (Edge Function) têm de satisfazer"
  - "Três artefatos derivados sob `--check` separado: `.json` de auditoria, espelho `.ts` da Edge Function, espelho `.ts` do frontend"
  - "Gate `npm run check:recibo-exclusao` na cadeia de merge de wave"
  - "Fecho que falha ALTO em toda condição que faria o recibo mentir — nas duas direções (afirmar demais e afirmar de menos)"
affects: [45-07, 45-08, 45-10, 46, 47]

actuals:
  tokens: 36891
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Gerador Node `fs`/`path` + `js-yaml`, `--check` que confere CADA artefato separadamente, `morrer()` que falha ALTO"
    - "Mutação de FONTE (não de fixture) como prova de que o gate morde, quando o mapeamento mora no próprio gerador"

key-files:
  created:
    - docs/compliance/sql/gen-recibo-exclusao.cjs
    - docs/compliance/recibo-exclusao.json
    - supabase/functions/_shared/reciboExclusao.ts
    - src/features/privacidade/constants/reciboExclusao.generated.ts
    - docs/compliance/__tests__/genReciboExclusao.test.ts
  modified:
    - package.json

key-decisions:
  - "A fonte do recibo é `pii-inventory.yaml` (69 tabelas), NÃO `exportAllowlist.ts` (30 de 69) — a 45-UI-SPEC nomeava a fonte errada e a 45-RESEARCH §C2/§Pitfall 5 já tinha medido isso"
  - "TRÊS saídas, não duas: o frontend não alcança `supabase/functions/` nem `docs/` (`@/` aponta para `src/`), então a Invariante 4 só continua válida na tela com um espelho sob `src/`"
  - "A asserção de banidos de copy roda sobre os campos de TEXTO DE TITULAR, nunca sobre o JSON inteiro — `tombstone` é metade do vocabulário `PASSOS_MOTOR` que o próprio plano fecha"
  - "O fecho tem DUAS direções: `apagar`/`anonimizar` obriga linha «sai» (anti-omissão), e `preservar`/`preservar_com_ressalva` não pode viver só no «sai» (anti-superestimação)"
  - "`FORA_DO_RECIBO` só aceita chave literal `tabela.coluna`, sem curinga — um curinga engoliria em silêncio a próxima coluna que nascer na tabela"

patterns-established:
  - "Cobertura como identidade auditável: 209 de 209 colunas em escopo do titular têm linha de recibo OU razão de silêncio de vocabulário fechado"
  - "Backstop bidirecional linha↔passo: linha sem passo é promessa sem executor; passo sem linha é apagamento que o titular nunca soube"
  - "Chave estável (`item_id`) para as linhas obrigatórias: edição de copy aprovada não reprova, remoção do item reprova"

requirements-completed: [ERASE-07, ERASE-09]

coverage:
  - id: D1
    description: "O recibo em duas colunas existe como artefato gerado do inventário PII completo, com os três consumidores em sincronia sob `--check` separado"
    requirement: "ERASE-07"
    verification:
      - kind: integration
        ref: "node docs/compliance/sql/gen-recibo-exclusao.cjs --check"
        status: pass
      - kind: unit
        ref: "docs/compliance/__tests__/genReciboExclusao.test.ts#(7) caminho feliz: o inventário real gera os três artefatos e sai 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Nenhuma linha pode ser editada à mão sem reprovar o gate — os três artefatos são conferidos separadamente"
    requirement: "ERASE-07"
    verification:
      - kind: manual_procedural
        ref: "edição à mão de cada um dos três artefatos → --check exit 1 com `DIVERGENTE:` nomeando o arquivo (executado em 2026-08-05)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Backstop E4·error: o recibo não pode afirmar mais nem menos do que o motor faz — confronto linha «sai» × `passo_motor` nas duas direções, sem snapshot de texto"
    requirement: "ERASE-07"
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genReciboExclusao.test.ts#(1) E4·error, ida / #(2) E4·error, volta / #(8) passo inventado REPROVA / #(9) passo sem linha REPROVA"
        status: pass
    human_judgment: false
  - id: D4
    description: "Backstop E4·partial: a linha inaplicável ao titular sem currículo e sem decisão registrada é OMITIDA, nunca renderizada vazia"
    requirement: "ERASE-07"
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genReciboExclusao.test.ts#(5) E4·partial: o recorte omite a linha inaplicável, e nunca produz texto vazio"
        status: pass
    human_judgment: false
  - id: D5
    description: "As oito tabelas `telemetria_interna` que o `exportAllowlist.ts` omite — inclusive `ai_call_logs` e `logs_acesso`, duas das cinco do ERASE-09 — aparecem no recibo"
    requirement: "ERASE-09"
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genReciboExclusao.test.ts#(6) Pitfall 5: as oito tabelas telemetria_interna com PII do titular aparecem em colunas_origem"
        status: pass
      - kind: unit
        ref: "docs/compliance/__tests__/genReciboExclusao.test.ts#(12) Pitfall 5 pela porta dos fundos: silenciar coluna `apagar` REPROVA a geração"
        status: pass
    human_judgment: false
  - id: D6
    description: "Gate `npm run check:recibo-exclusao` executável na cadeia de merge de wave, com zero dependência npm nova"
    requirement: "ERASE-07"
    verification:
      - kind: integration
        ref: "npm run check:recibo-exclusao (exit 0) + git diff package.json = 1 linha em scripts, 0 em dependencies/devDependencies"
        status: pass
    human_judgment: false
  - id: D7
    description: "A copy destinada ao titular — 20 rótulos/textos e 9 bases legais — e o mapeamento «item legível → colunas de banco»"
    verification: []
    human_judgment: true
    rationale: "O gerador prova mecanicamente que a copy não usa termo banido, que toda linha «mantém» tem base legal não-vazia e que as três obrigatórias da UI-SPEC estão presentes verbatim. Ele NÃO pode provar que as SEIS bases legais que a UI-SPEC não ditou (Art. 8º §1º, Art. 20, Art. 16 I, Art. 7º IX e os dois Art. 7º VI adicionais) são as corretas, nem que o agrupamento de 209 colunas de banco em 20 itens legíveis lê bem para a pessoa. Ver §Julgamento pendente."

duration: 41 min
completed: 2026-08-05
status: complete
---

# Phase 45 Plan 02: Recibo de Exclusão Derivado Summary

**O recibo em duas colunas passou a ser um artefato gerado do inventário PII inteiro (69 tabelas, 209 colunas em escopo do titular, 100% com veredito), com um fecho que falha ALTO nas duas direções — nenhuma linha pode afirmar um apagamento sem um `passo_motor` que o execute, e nenhuma coluna que o motor toca pode ficar de fora em silêncio.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-08-05T00:32Z
- **Completed:** 2026-08-05T01:13Z
- **Tasks:** 3 de 3
- **Files modified:** 6 (5 criados, 1 editado)

## Accomplishments

- **O Pitfall 5 fechado na origem.** A 45-UI-SPEC §Invariante 4 nomeava `exportAllowlist.ts` como fonte do recibo. A 45-RESEARCH §C2 mediu que essa fonte cobre **30 de 69 tabelas** e exclui, sob a razão `telemetria_interna`, oito tabelas que guardam PII do titular — inclusive `ai_call_logs` e `logs_acesso`, **duas das cinco do ERASE-09**. O gerador lê `pii-inventory.yaml` e as oito aparecem no recibo, provadas por teste nominal.
- **O vocabulário `PASSOS_MOTOR` fechado em sete valores** — `storage_remove` · `tombstone_candidato` · `tombstone_decisao_final` · `severar_user_id` · `severar_fks_set_null` · `scrub_ledger_email` · `auth_delete_user` — e cada um com ao menos uma linha de recibo. É o contrato interface-first que 45-07 e 45-10 assinam; o artefato carrega `passos_motor_onde` mapeando cada passo ao plano que o implementa.
- **Cobertura como identidade, não como intenção.** 209 de 209 colunas em escopo do titular têm linha de recibo **ou** razão de silêncio de vocabulário fechado. Coluna sem veredito para a geração nomeando a coluna.
- **O backstop E4·error nas duas direções, sem snapshot.** Linha sem passo é promessa sem executor; passo sem linha é apagamento que o titular nunca soube. Os sete gates do gerador são provados **mordendo**: cópia mutada rodada como processo, asserindo `exit 1` e a mensagem.
- **Três artefatos, três `--check` separados.** A edição à mão de qualquer um dos três — `.json`, espelho da EF, espelho do frontend — reprova o gate, verificado um a um.

## Task Commits

1. **Task 1 (tracer): `gen-recibo-exclusao.cjs` + os três artefatos** — `5bd164b` (feat)
2. **Task 2: testes do gerador — backstop E4·error e E4·partial** — `ed3aa7d` (test)
3. **Task 3: `check:recibo-exclusao` no `package.json`** — `3a89bd9` (chore)

**Plan metadata:** ver commit `docs(45-02)` abaixo.

## Files Created/Modified

- `docs/compliance/sql/gen-recibo-exclusao.cjs` — o gerador. Lê `pii-inventory.yaml`, emite os três artefatos, e implementa os cinco fechos (cobertura, direção, passo do motor, base legal, vocabulário de copy). `--check` confere cada artefato separadamente e pina `meta.gerado_em` do disco.
- `docs/compliance/recibo-exclusao.json` — artefato de auditoria. 11 linhas na coluna «sai», 9 na «mantém», mais `fora_do_recibo` (razão por coluna preservada) e `fora_do_escopo_do_titular` (razão por tabela).
- `supabase/functions/_shared/reciboExclusao.ts` — espelho para a EF de execução (45-10). Exporta `RECIBO_EXCLUSAO`, `PASSOS_MOTOR` e o tipo `PassoMotor`.
- `src/features/privacidade/constants/reciboExclusao.generated.ts` — espelho para o componente `ReciboExclusao` (45-08). Corpo byte-idêntico ao da EF.
- `docs/compliance/__tests__/genReciboExclusao.test.ts` — 13 testes: 6 sobre o artefato, 7 gates provados por mutação de fonte.
- `package.json` — uma linha em `scripts`, zero em `dependencies`/`devDependencies`.

## Decisions Made

**1 · A fonte é `pii-inventory.yaml`, e a recusa viaja DENTRO do artefato.**
`meta.fonte_recusada` nomeia o `exportAllowlist.ts` e diz por que ele não serve. Quem auditar o recibo daqui a um ano não vai ter a 45-RESEARCH aberta; a razão da escolha tem de estar no arquivo que ele lê.

**2 · Três saídas, e a terceira tem razão própria.** O frontend não alcança `supabase/functions/` nem `docs/` — `@/` aponta para `src/`. Sem o espelho sob `src/`, o componente de 45-08 teria de digitar as linhas, e a Invariante 4 ("derivado, nunca digitado") deixaria de valer exatamente na superfície onde o titular lê.

**3 · O fecho tem duas direções, porque a desonestidade tem duas.**
- `apagar`/`anonimizar` **obriga** linha «sai», e **não pode** ser silenciada em `FORA_DO_RECIBO` (erro `SILÊNCIO PROIBIDO`). É o que arrasta as oito tabelas de telemetria para dentro.
- `preservar`/`preservar_com_ressalva` **não pode** viver só na coluna «sai». Prometer apagar o que sobrevive é a superestimação que o SC#5 proíbe.
- Uma coluna pode aparecer nos **dois** lados, e o par `ligacao_com_a_justificativa` (sai) × `justificativa_do_recrutador` (mantém) é exatamente isso: é a forma do D-45-02/03 no recibo — o texto sobrevive, a ligação não.

**4 · `FORA_DO_RECIBO` sem curinga de tabela.** Cada chave é literal `tabela.coluna`. Um curinga engoliria em silêncio a próxima coluna que nascer na tabela — o drift que o fecho existe para pegar.

**5 · Mutação de FONTE como prova de mordida.** O irmão `genExportAllowlist.test.ts` varia fixtures porque os vereditos dele moram em YAML; aqui o mapeamento «item legível → colunas» mora no próprio gerador. `patch()` reprova quando a substituição não casa exatamente uma vez — uma mutação que não aplicou faria o gate passar por vacuidade, que é o falso verde que o arquivo inteiro existe para impedir.

**6 · `historico_candidatura.ator` classificado como dado de funcionário.** O trigger `avancar_etapa()` só dispara em `UPDATE OF etapa_atual` e é o único escritor daquela tabela (invariante do M2/Phase 6) — quem move a etapa é o RH. ⚠ Consequência para 45-07: a FK `NO ACTION` de `ator → auth.users` **continua sendo um bloqueador de `deleteUser`** e precisa de tratamento próprio; o recibo diz que a trilha fica, não que o ponteiro fica.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] O `<verify>` do plano contradiz o vocabulário que o próprio plano manda fechar**

- **Found during:** Task 1
- **Issue:** O comando `<automated>` do plano varre `JSON.stringify(recibo).toLowerCase()` inteiro procurando, entre outros, a string `tombstone`. Mas o `<action>` do mesmo plano manda `PASSOS_MOTOR` conter **`tombstone_candidato`** e **`tombstone_decisao_final`**. O comando, como escrito, é **impossível de satisfazer** sem violar o `<action>` — reprovou também em `anonimizado`, presente em `meta.banidos_vocabulario` (a própria lista de banidos, ecoada no artefato para o consumidor poder asserir contra ela).
- **Fix:** A must_have arbitra e é precisa: *"O texto **de titular** do recibo nunca contém…"*. A varredura foi escopada aos campos de texto de titular, que o artefato nomeia em `meta.campos_de_texto_de_titular` (`rotulo`, `texto_futuro`, `texto_passado`, `base_legal`) mais os quatro cabeçalhos — uma fonte só, consumida igual pelo gerador, pelo comando de verificação e pelo teste (4). Escopar a varredura ao texto que a pessoa lê é a mesma disciplina que a UI-SPEC §Bans exige de cada ban, e o defeito que a UI-SPEC diz que este projeto já produziu **duas vezes** (43, "automaticamente"; 44, os verbos de exclusão) é exatamente o grep repo-wide que reprova a própria spec.
- **Files modified:** nenhum arquivo de plano; a correção vive no gerador (`CAMPOS_DE_TEXTO_DE_TITULAR` + o bloco de banidos) e no comando executado.
- **Verification:** `node gen-recibo-exclusao.cjs && --check && <verify escopado>` → `OK 11 sai / 9 mantem / 73 textos de titular limpos`, exit 0. O gate morde: o teste (11) injeta «anonimizado» na copy e a geração reprova.
- **Committed in:** `5bd164b`

**2. [Rule 2 — Missing critical] Bans de soft delete acrescentados ao vocabulário**

- **Found during:** Task 1
- **Issue:** O plano lista dois grupos de banidos (vocabulário e totalidade). A 45-UI-SPEC §Bans traz um terceiro grupo com escopo "superfície de exclusão": `desativar conta` · `pausar conta` · `conta suspensa` · `conta inativa` — vocabulário de **soft delete** numa fase de **hard delete** (D-45-09), que prometeria um estado recuperável que não vai existir. O recibo é superfície de exclusão.
- **Fix:** Os quatro termos entraram em `BANIDOS_VOCABULARIO` (a lista existente), mantendo os **dois** grupos que o plano e o teste (4) preveem.
- **Verification:** teste (4) percorre `banidos_vocabulario ∪ banidos_totalidade` sobre os 73 textos de titular.
- **Committed in:** `5bd164b`

---

**Total deviations:** 2 auto-fixed (1× Rule 1 — bug no comando de verificação do plano; 1× Rule 2 — ban de contrato da UI-SPEC ausente do plano).
**Impact on plan:** Nenhum desvio de escopo. Os três artefatos, o vocabulário de sete passos e o gate saíram exatamente como especificados; o que mudou foi o **escopo da varredura de banidos**, na direção que a própria must_have já determinava.

## Issues Encountered

**Nenhum bloqueador.** Zero MCP, zero PROD, zero migration — como o plano exigia. Um ponto de atrito registrado, não resolvido aqui:

- `grep -c toMatchSnapshot` no arquivo de teste devolve **1**, e a ocorrência é o docblock explicando **por que não há nenhum**. Um gate futuro que gruda em `grep -c` reprovaria o arquivo que cumpre o critério. Se alguém escrever esse gate, ele tem de casar a chamada (`.toMatchSnapshot(`), não a palavra.

## Julgamento pendente — o que o gate NÃO prova (D7)

Isto não é stub e não é débito: é a fronteira do que um gerador consegue asserir. **Merece revisão humana antes de 45-08/45-10 congelarem a copy.**

1. **Seis das nove bases legais foram escritas pela engenharia.** A UI-SPEC ditou três (as obrigatórias, todas `Art. 7º, VI`). As outras seis — `Art. 8º, §1º` (prova do consentimento), `Art. 20` (registro da decisão humana), `Art. 16, I` (trilha de auditoria), `Art. 7º, IX` (registros técnicos) e dois `Art. 7º, VI` adicionais (anotações da equipe, avaliações e análises) — são o **melhor mapeamento da engenharia**, não veredito jurídico. O gerador prova que **existe** base legal não-vazia; não prova que ela é **a certa**. Recomendação: revisão pelo Encarregado de Dados antes de o e-mail de recibo sair em PROD.
2. **O agrupamento de 209 colunas de banco em 20 itens legíveis é editorial.** `colunas_origem` torna cada agrupamento auditável, e o fecho garante que nada ficou de fora — mas se «Os seus dados de cadastro» lê bem para a pessoa é julgamento, não asserção.
3. **`preservar_com_ressalva` foi mapeado inteiro para a coluna «mantém».** O inventário diz que essa classificação *"exige tratamento caso a caso na Phase 45"*. O recibo hoje afirma que essas colunas **ficam**. Se 45-07 decidir apagar alguma, **o inventário tem de ser atualizado junto** — é o acoplamento desejado, e o `--check` na cadeia de merge é quem o cobra.

## User Setup Required

None — nenhuma configuração de serviço externo. Zero dependência npm nova (invariante do M8 herdada do M7).

## Next Phase Readiness

**Pronto e desbloqueante para a Wave seguinte:**

- **45-07 (tombstone/RPC)** assina cinco passos: `tombstone_candidato`, `tombstone_decisao_final`, `severar_user_id`, `severar_fks_set_null`, `scrub_ledger_email`. `passos_motor_onde` no artefato mapeia cada um ao plano.
- **45-10 (Edge Function)** assina `storage_remove` e `auth_delete_user`, e importa `_shared/reciboExclusao.ts` (import estático relativo — assunção A1 da 44, fechada positivamente em PROD).
- **45-08 (`ReciboExclusao`)** importa `@/features/privacidade/constants/reciboExclusao.generated` e filtra por `aplicavel_quando`; o teste (5) já é o molde do recorte.

**Atenção declarada, não a descobrir depois:**

- `historico_candidatura.ator` é FK `NO ACTION` para `auth.users` e está classificada como dado de funcionário. Ela **não** ganhou linha de recibo, mas **continua bloqueando `deleteUser`** — 45-07 precisa tratá-la, e o recibo não promete nada sobre ela.
- O recibo afirma, hoje, que `webhooks_logs.payload_enviado` e `resposta_recebida` **ficam** (linha «A trilha de auditoria do sistema»). São `preservar_com_ressalva` e podem carregar PII completa do titular. Se a fase decidir purgá-las, inventário e recibo mudam juntos.

## Self-Check: PASSED

**Arquivos criados — todos presentes em disco:**
- `docs/compliance/sql/gen-recibo-exclusao.cjs` — FOUND
- `docs/compliance/recibo-exclusao.json` — FOUND
- `supabase/functions/_shared/reciboExclusao.ts` — FOUND
- `src/features/privacidade/constants/reciboExclusao.generated.ts` — FOUND
- `docs/compliance/__tests__/genReciboExclusao.test.ts` — FOUND

**Commits — todos em `git log`:** `5bd164b`, `ed3aa7d`, `3a89bd9`

**`<verification>` do plano, os cinco:**
1. `node docs/compliance/sql/gen-recibo-exclusao.cjs --check` → exit 0 — PASS
2. `npx vitest run docs/compliance/__tests__/genReciboExclusao.test.ts` → 13 passed — PASS
3. `npm run check:recibo-exclusao` → exit 0 — PASS
4. `npm run lint` → `tsc errors: 97 (frozen baseline: 97)` — PASS (não aumentou)
5. `npm run check:export-allowlist` → exit 0 — PASS (gate irmão não regrediu)

**Disciplina de commit:** 3 commits, **zero `--no-verify`**. O hook `.husky/pre-commit` rodou e passou nos três (97/97), como o item 4 do portão de fase destrutiva do M8 exige.

---
*Phase: 45-motor-de-exclus-o-anonimiza-o*
*Completed: 2026-08-05*
