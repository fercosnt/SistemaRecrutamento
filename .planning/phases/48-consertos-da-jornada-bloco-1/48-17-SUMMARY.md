---
phase: 48-consertos-da-jornada-bloco-1
plan: 17
subsystem: compliance
status: complete
tags: [jorn-24, jorn-27, jorn-19, lgpd, export-06, export-allowlist, pii-inventory, recibo-exclusao, edge-function, prod]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-04 — analise_candidato_vaga.descartada_em/descartada_motivo (D-02)"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-07 — solicitacoes_dados.aviso_pedido_enviado_em/aviso_cancelamento_enviado_em"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-11 — decisao_final (3) e decisao_final_historico (9) do ciclo de reabertura"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-13 / 48-16 — versões vivas das EFs (executar-direito-titular v8)"
provides:
  - "16 colunas da fase MEDIDAS em PROD e acrescentadas ao catalogo-vivo-44.json (meta.acrescimos, com a query)"
  - "veredito de export ESCRITO para as 16 (11 entram, 5 ficam fora com razão); allowlist 1.2.0"
  - "classificação no pii-inventory.yaml para as 16; recibo com linha ou razão para cada coluna nova"
  - "exportar-meus-dados v3 e executar-direito-titular v9 em PROD com os artefatos novos"
  - "05-export-allowlist-drift.sql contra PROD: nenhuma coluna da fase; só as 9 pré-existentes"
affects: [48-18]

actuals:
  tokens: 8674
  tasks: 3
  commits: 2
plan_head_before: 71931e6ffdec32b0a9ade6575346701fe6371b3d

tech-stack:
  added: []
  patterns:
    - "Acréscimo MEDIDO ao catálogo versionado: meta.acrescimos com data e query, entradas lidas da medição salva por script (nunca digitadas), medido_em/totais originais intocados"
    - "Histórico herda o veredito da coluna homônima da tabela corrente, escrito por extenso com a proveniência citada"

key-files:
  created: []
  modified:
    - docs/compliance/catalogo-vivo-44.json
    - docs/compliance/export-scope-rules.yaml
    - docs/compliance/pii-inventory.yaml
    - docs/compliance/pii-inventory.md
    - docs/compliance/export-allowlist.json
    - supabase/functions/_shared/exportAllowlist.ts
    - docs/compliance/sql/05-export-allowlist-drift.sql
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - docs/compliance/sql/gen-recibo-exclusao.cjs
    - docs/compliance/recibo-exclusao.json
    - supabase/functions/_shared/reciboExclusao.ts
    - src/features/privacidade/constants/reciboExclusao.generated.ts
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "A6 decidida: a marca do D-02 (descartada_em/descartada_motivo) ENTRA na cópia do titular — revisável pelo operador com uma palavra"
  - "decisao_final.reaberta_em/prazo_nova_decisao_em entram; alerta_prazo_enviado_em e solicitacoes_dados.aviso_*_enviado_em ficam fora (telemetria de envio) — sem veredito, as quatro sairiam SOZINHAS por R1 (*_em)"
  - "As 9 de decisao_final_historico herdam o veredito da homônima de decisao_final (7 entram; revisao_por_usuario e alerta_prazo_enviado_em ficam fora)"
  - "solicitacoes_dados entra no pii-inventory.yaml como entrada PARCIAL declarada (só as 2 colunas da fase); as outras 14 colunas vivas seguem drift pré-existente"
  - "Recibo: reabertura/prazo/ciclo de revisão vão para registro_da_decisao, revisao_resultado do histórico para anotacoes_da_equipe, controle de envio e revisor para FORA_DO_RECIBO — só origens e totais mudam, nenhum texto ao titular"

requirements-completed: [JORN-24, JORN-27, JORN-19]

coverage:
  - id: D1
    description: "A marca do D-02 medida em PROD, com veredito export:true, regenerada na allowlist 1.2.0 (tracer)"
    requirement: JORN-24
    verification:
      - kind: other
        ref: "node docs/compliance/sql/gen-export-allowlist.cjs && npm run -s check:export-allowlist && node -e (descartada_em/descartada_motivo e 1.2.0 no artefato)"
        status: pass
    human_judgment: false
  - id: D2
    description: "As 14 colunas restantes com veredito e classificação escritos; os quatro check:* e o vitest de docs/compliance verdes; snapshots (b)/(j) mudaram só pelas colunas da fase; asserção (k) cruza os VALUES regenerados"
    requirement: JORN-27
    verification:
      - kind: unit
        ref: "npx vitest run docs/compliance — 66/66"
        status: pass
      - kind: other
        ref: "npm run -s check:matriz-retencao / check:pii-inventory-md / check:recibo-exclusao / check:export-allowlist — OK nos quatro"
        status: pass
      - kind: other
        ref: "node -e (10 chaves tabela.coluna com veredito no export-scope-rules.yaml) — «vereditos escritos»"
        status: pass
    human_judgment: false
  - id: D3
    description: "Drift contra PROD sem coluna da fase; a consulta ainda morde (par removido numa cópia de rascunho reaparece)"
    requirement: JORN-19
    verification:
      - kind: integration
        ref: "node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql — 9 linhas, todas pré-existentes; verify do plano «nenhuma coluna da fase no drift»"
        status: pass
      - kind: integration
        ref: "cópia de rascunho sem ('decisao_final','reaberta_em') → a consulta lista reaberta_em"
        status: pass
    human_judgment: false
  - id: D4
    description: "EFs redeployadas com os artefatos novos; tipos finais; tsc ≤ 90; origin/main..HEAD vazio; front publicado"
    requirement: JORN-24
    verification:
      - kind: other
        ref: "node efdeploy.cjs exportar-meus-dados (v2→v3) + GET /functions/exportar-meus-dados/body | grep -c descartada_em → 3; \"1.2.0\" 1×, \"1.1.0\" 0×; OPTIONS 200, POST sem JWT 401"
        status: pass
      - kind: other
        ref: "node efdeploy.cjs executar-direito-titular (v8→v9); bundle com colunas_com_veredito 223; OPTIONS 200, POST sem JWT 401"
        status: pass
      - kind: other
        ref: "Task 3 verify 3: database.types.ts não vazio com os objetos da fase; lint exit=2 tsc errors=90; origin/main..HEAD vazio"
        status: pass
    human_judgment: false
  - id: D5
    description: "A cópia real baixada por um titular traz a marca do D-02 e a reabertura, e não traz os carimbos de envio"
    verification: []
    human_judgment: true
    rationale: "Exige baixar a cópia com o JWT de uma conta real em PROD; o operador pode estar usando as contas +claude (48-05) e a prova ao vivo com conta é do 48-18"

duration: 12min
completed: 2026-09-21
---

# Phase 48 Plan 17: Inventário fechado das colunas da fase Summary

**As 16 colunas que a Phase 48 criou em tabelas do titular foram medidas em PROD, acrescentadas ao catálogo e receberam veredito de export e classificação escritos. Onze entram na cópia: a marca do D-02 (A6 decidida), a reabertura com o prazo e o ciclo arquivado. Cinco ficam fora com razão: os carimbos de envio e o UUID do revisor. A allowlist subiu para 1.2.0 e está no ar em `exportar-meus-dados` v3, e o recibo está em `executar-direito-titular` v9. A consulta de drift contra PROD não acusa nenhuma coluna da fase.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-21T17:30:00Z (leitura); primeira medição em PROD 17:33:50Z
- **Completed:** 2026-09-21T17:42:21Z
- **Tasks:** 3 (Task 1 tracer)
- **Files modified:** 12 de código/artefato + `deferred-items.md`

## Medição (PROD, só leitura, 2026-09-21T17:33:50Z)

`information_schema.columns` das 4 tabelas devolveu 62 colunas vivas. Delas, 23 estavam fora do catálogo: as 16 da fase e 7 de drift pré-existente em `solicitacoes_dados`. As 39 que já estavam catalogadas bateram com o catálogo em tipo, nulidade e ordem (0 divergências). O catálogo recebeu SÓ as 16, lidas da medição salva por script. `meta.acrescimos` registra a data, a query e a lista, e `medido_em`/`totais` de 2026-08-04 ficaram intocados.

## Vereditos

| Coluna | Export | Classificação | Recibo |
|---|---|---|---|
| `analise_candidato_vaga.descartada_em` / `descartada_motivo` | **true** (A6) | preservar (segue a linha, como `status`) | — (tabela fora do inventário explícito) |
| `solicitacoes_dados.aviso_pedido_enviado_em` / `aviso_cancelamento_enviado_em` | false (telemetria de envio) | preservar | FORA_DO_RECIBO `estado_do_processo` |
| `decisao_final.reaberta_em` / `prazo_nova_decisao_em` | **true** | preservar | `registro_da_decisao` |
| `decisao_final.alerta_prazo_enviado_em` | false (alerta a funcionário) | preservar | FORA_DO_RECIBO `estado_do_processo` |
| `decisao_final_historico.` explicacao_solicitada_em, revisao_solicitada_em, revisao_veredito, revisao_respondida_em, reaberta_em, prazo_nova_decisao_em | **true** (herdam a homônima) | preservar | `registro_da_decisao` |
| `decisao_final_historico.revisao_resultado` | **true** (herda) | preservar_com_ressalva | `anotacoes_da_equipe` |
| `decisao_final_historico.revisao_por_usuario` | false (herda R2 `pii_de_terceiro`) | preservar | FORA_DO_RECIBO `dado_de_funcionario` |
| `decisao_final_historico.alerta_prazo_enviado_em` | false (herda) | preservar | FORA_DO_RECIBO `estado_do_processo` |

Totais: allowlist **376 exportadas + 39 excluídas = 415** (antes 365 + 34 = 399); recibo **223/223** colunas em escopo com veredito (antes 209).

## Accomplishments

- **Fecho do EXPORT-06 sem órfã.** Sem os vereditos, oito das dezesseis colunas (as `*_em`) já teriam passado a sair na cópia pela R1, inclusive os três carimbos de envio. Uma coluna `text` (`descartada_motivo`) teria parado a geração. Agora todas têm decisão com razão.
- **Drift contra PROD** (`node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql`), com as 9 linhas pré-existentes. Contato não consertado, fora da fase:
  - `candidatos.faixa_etaria_materializada`
  - `candidaturas.encerrada_a_pedido_em`
  - `solicitacoes_dados.auth_concluido_em`, `cancelado_em`, `executar_em`, `plano`, `postgres_concluido_em`, `recibo_enviado_em`, `storage_concluido_em`
- **A consulta ainda morde.** Numa cópia de rascunho, sem o par `('decisao_final','reaberta_em')`, ela lista `reaberta_em` como «COLUNA NOVA NO BANCO».
- **A decisão chegou à cópia real.**

  | UTC | Alvo | Antes → depois | Prova |
  |---|---|---|---|
  | 17:40:00 | `exportar-meus-dados` | v2 (2026-08-05) → **v3**, `verify_jwt=true` | bundle: `descartada_em` 3×, `"1.2.0"` 1×, `"1.1.0"` 0×, `prazo_nova_decisao_em` 10×; OPTIONS 200; POST sem JWT 401 |
  | 17:40:28 | `executar-direito-titular` | v8 → **v9**, `verify_jwt=true` | bundle: `colunas_com_veredito: 223`, `solicitacoes_dados.aviso_pedido_enviado_em` 2×; OPTIONS 200; 401 |
  | ~17:41 | front (`git push`, `71931e6f..bab3c0f8`) | — | PROD serve `/assets/index-LSetSTSi.js` (mesmo hash do build local) com `decisao_final_historico.reaberta_em` |

  Antes do deploy, conferi que o bundle de cada EF só mudou pelos commits deste plano: `exportar-meus-dados/index.ts` está intocado desde 2026-08-04, e desde o commit que virou a v8 só `reciboExclusao.ts` mudou. As suítes Deno das duas EFs passaram: 20/20 e 105/105.
- **Tipos finais.** `database.types.ts` foi regenerado com `< /dev/null`: 215447 octetos, **byte a byte igual** ao do disco. O 48-14 já o tinha regenerado depois da última migration que muda schema (a 000016/000017 só mexeram em ACL). tsc 90, `origin/main..HEAD` vazio.

## Task Commits

1. **Task 1 (tracer): a marca do D-02 de ponta a ponta:** `4f524085` (feat)
   - Portão do tracer (interativo, `end-of-phase`, verify só `<automated>`): re-executei gerador, `check:export-allowlist` e vitest (66/66). Passou, e segui para a expansão.
2. **Task 2: as 14 colunas restantes:** `bab3c0f8` (feat)
3. **Task 3: drift, redeploys, tipos e push:** sem commit próprio. A task não gerou diff de arquivo: os tipos saíram idênticos, e os artefatos do recibo que as EFs embarcam já estavam no `bab3c0f8`. O trabalho dela foi em PROD (dois deploys) e no push.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `gen-recibo-exclusao.cjs` editado (fora da lista `files` do plano)**
- **Found during:** Task 2
- **Issue:** o gerador do recibo cobre toda coluna explícita do inventário. Com as classificações novas, o `check:recibo-exclusao` reprovou em 14 colunas por `ERRO DE FECHAMENTO (cobertura)`. Os vereditos do recibo moram no próprio gerador (`ITENS_MANTEM`, `FORA_DO_RECIBO`); não são artefato gerado.
- **Fix:** cada coluna nova ganhou linha ou razão (ver a tabela acima). Regenerados: `recibo-exclusao.json`, `_shared/reciboExclusao.ts` e o espelho do front `src/features/privacidade/constants/reciboExclusao.generated.ts`, que também ficava fora da lista. Nenhum consumidor em runtime lê `colunas_origem`, então o texto ao titular não muda. As suítes de `src/features/privacidade` passaram (154/154).
- **Committed in:** `bab3c0f8`

**2. [Ordem] Snapshots (b) e `VALUES` do `05-drift` atualizados JÁ na Task 1**
- O plano os põe na Task 2. Mas a Task 1 muda o artefato, e com isso (b) e (k) reprovam, como devem. Atualizei os dois na fatia do tracer para que cada commit saísse verde. O diff de (b) na Task 1 foi exatamente as 2 chaves do D-02. Na Task 2, (b) ganhou as 9 exportadas e (j) as 5 excluídas.
- Os `VALUES` foram regenerados por script, que chama `--sql-values` / `--sql-values-excluidas` e troca os blocos. Nunca foram digitados.

**3. [Escopo de classificação] `solicitacoes_dados` entrou no `pii-inventory.yaml` como entrada parcial**
- A tabela não tinha entrada nenhuma (é posterior à coleta de 2026-07-29). Para que a classificação das 2 colunas da fase ficasse escrita e visível no `.md`, criei a entrada com uma `natureza` que declara ser parcial.
- Efeito colateral: o `.md` passou a dizer «Cobertura de tabelas: 65 / 64», com o denominador datado. Registrado em deferred.
- `analise_candidato_vaga` ficou no padrão das vizinhas: a tabela é coberta por regra de tabela, e a nota vai no comentário da lista.

---

**Total deviations:** 1 bloqueio auto-corrigido (Rule 3), 1 reordenação para manter commits verdes, 1 decisão de escopo de classificação.
**Impact:** nenhum muda o que o plano prova. O nº 1 era condição para o `check:recibo-exclusao` do próprio plano passar.

## Issues Encountered

- O zsh não separa `$N` em palavras, e a primeira chamada do script de acréscimo recebeu as 14 colunas como um argumento só. O script recusou (`NAO MEDIDA`) antes de escrever; refiz com `${=N}`.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova. T-48-17-01: os carimbos de envio e o UUID do revisor ficam fora por veredito explícito. T-48-17-02: o drift contra PROD foi conferido e a mordida provada. T-48-17-03: só os geradores escreveram artefato, e os quatro `check:*` estão verdes. T-48-17-04: redeploy com marcador no bundle. T-48-17-SC: nada instalado.

## Next Phase Readiness

- **48-18 (prova com conta real):** baixar a cópia LGPD de uma conta de teste cuja análise foi descartada (as 3 `+claude` do D-02) e conferir:
  - `analise_candidato_vaga[].descartada_em` e `descartada_motivo='knockout_automatico'` presentes;
  - `versao_allowlist = 1.2.0`;
  - nenhum `aviso_*_enviado_em` nem `alerta_prazo_enviado_em` no JSON.
- **Deferred** (`deferred-items.md` §48-17): as 9 colunas de drift pré-existente; o denominador datado do inventário (65/64); as 3 colunas P42 de `decisao_final` sem entrada no inventário.

---
*Phase: 48-consertos-da-jornada-bloco-1*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: catalogo-vivo-44.json (16 em `meta.acrescimos[0].colunas`), export-scope-rules.yaml (`versao: "1.2.0"`), pii-inventory.yaml (`prazo_nova_decisao_em`), export-allowlist.json (`1.2.0`)
- FOUND commits: 4f524085, bab3c0f8 (em origin/main)
- PROD: exportar-meus-dados v3, executar-direito-titular v9; drift sem coluna da fase
