# Phase 7: Configuração de Vaga & Tags - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-07
**Phase:** 7-configura-o-de-vaga-tags
**Areas discussed:** Página (nova feature vs legado), Fonte dos templates + banco SJT, Dimensões + UX dos sliders de peso, Modelo de tags + validação no Publicar

---

## A. Página: nova feature vs legado

| Option | Description | Selected |
|--------|-------------|----------|
| Nova feature config-vaga/ | Substitui a página legada por feature M1-pattern | |
| Enxertar blocos M2 na página legada | Mantém o monólito direct-supabase | |
| Híbrido: feature nova reusando UI legada | features/config-vaga/ p/ lógica M2 + reusa casca Glass | ✓ |

**User's choice:** Híbrido (D-01) + escopo só os 3 blocos M2 (D-02) + Publicar reusa rascunho→ativa (D-03)
**Notes:** Descoberta-chave que firmou as 3: o save da `CriarEditarVagaPage` legada é stub
(`console.log` L257) — persistência M2 é greenfield, então herda-se só o visual. Fernando pediu
minhas sugestões e concordou com as 3 recomendações.

---

## B. Fonte dos 8 templates + banco SJT

| Option | Description | Selected |
|--------|-------------|----------|
| TS config module (git) | Templates em cargoTemplates.ts, copiados p/ vaga no select | ✓ |
| Tabela seed no DB (vaga_templates) | Templates como rows editáveis | |
| Híbrido git→DB completo (sync-sjt.ts) | Pipeline de sync — rejeitado p/ templates no V1 | |

**User's choice:** TS config (D-04); banco SJT defere p/ F11 (D-05); só 2 colunas jsonb novas na vaga (D-06)
**Notes:** Concordou, incluindo o ponto sensível B2 (banco SJT na F11, não aqui).

---

## C. Dimensões + UX dos sliders de peso

| Option | Description | Selected |
|--------|-------------|----------|
| 4 chaves pontuadas (triagem/sjt/redação/entrevista) | Big Five + cognitivo fora (contexto) | ✓ |
| Sliders livres + erro inline (sem auto-rebalance) | RF-34 literal | ✓ |
| Pesos default starter calibrados em UAT | PRD §10 Q8 | ✓ |

**User's choice:** D-07 (4 chaves) + D-08 (livres + inline) + D-09 (starter defaults UAT)
**Notes:** Concordou com o conjunto de 4 chaves sem ajuste.

---

## D. Modelo de tags + validação no Publicar

| Option | Description | Selected |
|--------|-------------|----------|
| Path 1 — tabela relacional pergunta_opcao_metadata + opcao_id estável | SQL/RLS limpos p/ F8/F10/F15 | ✓ |
| Path 2 — tags embutidas no opcoes_resposta jsonb | Single source, mas jsonb-query nos EFs | |

**User's choice:** Path 1 (D-10) + taxonomia/bulk-mark PRD-aligned (D-11) + gate de publicação 3 checks (D-12)
**Notes:** Descoberta: opções vivem em `perguntas_formulario.opcoes_resposta` jsonb sem ID por
opção → D-10 introduz `opcao_id` uuid. Fernando concordou com Path 1 + D2/D3/D4 travados.

## Claude's Discretion

- Naming exato (TS module, colunas jsonb, enum_tag_opcao, tabela pergunta_opcao_metadata)
- Shape interno dos jsonb testes_aplicaveis + pesos_avaliacao
- Números concretos dos pesos default por cargo (starter, calibrado em UAT)
- Mecânica do sync jsonb↔pergunta_opcao_metadata (candidato a RPC/EF)
- Índices em pergunta_opcao_metadata

## Deferred Ideas

- Banco de perguntas SJT por cargo + pipeline sync-sjt.ts → Phase 11
- Knockouts padrão + auto-rejeição → Phase 8
- vaga.qualificacao_etapa1 → Phase 8
- Tabela vaga_templates editável + UI de edição de template → pós-V1
- Calibração dos pesos default por cargo → UAT Phase 1 (PRD §10 Q8)
- Reescrita completa da tela de config → Phase 16
