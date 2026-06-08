---
phase: 08-inscri-o-knock-out-etapa-1
plan: 03
subsystem: config-vaga
tags: [knockout, qualificacao, publish-gate, cargoTemplates, INSCR-02, INSCR-03, D-06, D-09, D-14]
requires:
  - "src/features/config-vaga/schemas/tagOpcaoSchema.ts (TAGS_OPCAO / enum_tag_opcao taxonomy, Phase 7)"
  - "src/features/config-vaga/publishGate.ts (D-12 client gate, Phase 7)"
provides:
  - "QualificacaoPergunta type + Zod schema (Etapa-1 qualification pergunta with knockout-as-option, D-06)"
  - "cargoTemplates default knockouts: presencial-SP (all 8 cargos) + harmonização-orofacial (dentista-only), D-14"
  - "client publish gate ≤10 perguntas / ≤1 aberta over the Etapa-1 qualification block (D-09)"
affects:
  - "Plan 08-04 server publish_vaga RPC extends the D-09 gate authoritatively"
  - "the copy-into-vaga write owns the per-vaga mutable qualificacao copy (fresh ids per copy)"
tech-stack:
  added: []
  patterns:
    - "knockout = an OPTION tagged 'knockout' inside an obrigatoria qualification pergunta (D-06), never a pergunta property"
    - "git template = source of truth for default knockouts; getCargoTemplateDefaults deep-copies + mints fresh ids per vaga"
    - "client gate mirrors server publish_vaga; pt-BR copy consistent with existing D-12 messages"
key-files:
  created:
    - "src/features/config-vaga/schemas/qualificacaoSchema.ts"
  modified:
    - "src/features/config-vaga/templates/cargoTemplates.ts"
    - "src/features/config-vaga/types/configVagaTypes.ts"
    - "src/features/config-vaga/publishGate.ts"
decisions:
  - "QualificacaoPergunta field is `texto_pergunta` (not `texto`) to satisfy the Plan-01 RED contract which reads `p.texto_pergunta`"
  - "open-ended detection treats BOTH `'texto'` (schema spelling) and `'resposta_texto'` (server/contract spelling) as aberta — robust to either"
  - "harmonização knockout texto = `Está ciente que não realizamos atendimentos de harmonização orofacial?` (Etapa 2 — Dentista, perguntas-vagas.md); `Não` → tag='knockout'"
  - "template-local opcao/pergunta ids are stable singletons; fresh crypto.randomUUID() ids minted in getCargoTemplateDefaults deep-copy"
metrics:
  duration: "~6 min"
  completed: "2026-06-08"
  tasks: 2
  files: 4
---

# Phase 8 Plan 03: Etapa-1 Default Knockouts + Publish Gate Summary

Seeds the per-cargo Etapa-1 qualification block with default knockouts (presencial-SP for all 8 cargos, harmonização-orofacial dentista-only) in `cargoTemplates.ts` as the git source of truth, and extends the client publish gate with the D-09 ≤10-perguntas / ≤1-aberta rule mirroring the Plan-04 server gate.

## What Was Built

### Task 1 — QualificacaoPergunta + cargoTemplates default-knockout seed (commit `9f2bac9`)
- **New** `src/features/config-vaga/schemas/qualificacaoSchema.ts`: `QualificacaoPergunta` type + Zod schema (`id`, `texto_pergunta`, `tipo_resposta` ∈ {single_choice, multiple_choice, texto, numerica}, `obrigatoria`, `ordem`, `opcoes[{id, texto, tag?, peso?}]`). The `tag` enum reuses the Phase-7 `TAGS_OPCAO` / `enum_tag_opcao` taxonomy — NOT redefined.
- `CargoTemplate` extended with `qualificacao: QualificacaoPergunta[]`.
- `baseQualificacao()` factory (mirroring `baseTestes`) seeds the presencial-SP knockout for ALL 8 cargos: texto exactly `"Você tem disponibilidade para trabalhar presencialmente em São Paulo, perto dos metros Brigadeiro e Paraíso?"`, `single_choice`, `obrigatoria=true`, opcoes `[{Sim, neutro}, {Não, knockout}]`. Single-tenant → FIXED clinic texto (not derived from vaga.cidade).
- `dentistaQualificacao()` appends the harmonização-orofacial knockout (`Não` → knockout) for `dentista` ONLY.
- `getCargoTemplateDefaults` deep-copies `qualificacao`, minting fresh `crypto.randomUUID()` ids per copy.
- `VagaConfig` (configVagaTypes.ts) extended with `qualificacao`.

### Task 2 — client publish gate ≤10 / ≤1-aberta (commit `e764ef9`)
- `PublishGateInput` gains optional `qualificacao[]` (`PublishGateQualificacaoPergunta`).
- Condition 4: reject `>10` perguntas → `"A qualificação da Etapa 1 permite no máximo 10 perguntas."`
- Condition 5: reject `>1` open-ended pergunta → `"A qualificação da Etapa 1 permite no máximo 1 pergunta aberta."` (`texto` and `resposta_texto` both treated as aberta).
- Existing D-12 checks (pesos=100 / ≥1 obrigatorio / knockout-must-be-obrigatoria) intact.

## Verification

- `cargoTemplates.test.ts`: 19/19 PASS (Plan-01 RED → GREEN; presencial-SP for all 8, harmonização dentista-only, deep-copy isolation).
- `publishGate.test.ts`: 8/8 PASS (Plan-01 D-09 RED → GREEN; rejects 11 perguntas + 2 open-ended; D-12 cases preserved).
- Full `src/features/config-vaga` suite: 47/47 PASS (zero regression).
- `npm run build`: exit 0 (~38s).
- `grep -c "qualificacao" cargoTemplates.ts` = 11 (≥3).

## Deviations from Plan

None — plan executed as written. One contract clarification (not a deviation): the plan action text suggested a `texto` field, but the authoritative Plan-01 RED test reads `p.texto_pergunta`, so the field was named `texto_pergunta` to satisfy the binding test contract.

## Threat Surface

T-08-04 (client gate bypass) and T-08-05 (knockout on non-obrigatoria) handled per the threat register: the client gate is defense-in-depth (Plan-04 server gate is authoritative); seeded knockouts are `obrigatoria=true`. No new threat surface introduced. Zero new packages (T-08-SC).
