---
phase: 51-consertos-da-jornada-bloco-3
review: 51-REVIEW.md
review_counts: { critical: 0, warning: 2, info: 6, total: 8 }
recorded: 2026-10-10
---

# 51 — Disposição dos achados do code review da fase

Toda linha nasce `open`. Só o operador ou um plano de conserto mudam o estado, com evidência.

| Id | Severidade | Arquivo | Disposição | Nota |
|---|---|---|---|---|
| WR-01 | warning | `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx:115` | open | A lista de avaliações abre do cache depois de «Prova registrada», e refazer a prova sobrescreve score e banda em `pontuar_cognitivo`. O 51-07 resolveu o mesmo caso para o Raven. Candidato a conserto antes do fecho do M8. |
| WR-02 | warning | `docs/compliance/sql/gen-recibo-exclusao.cjs:575` | open | O recibo atribui à UF uma finalidade («relatório agregado») que nenhum objeto vivo usa. É texto ao titular (LGPD); decisão do operador. Junta-se ao WINDOWS 89 (`disponibilidade`). |
| IN-01 | info | `scripts/p51_aceite.cjs:302` | open | O erro repassado pode trazer o user_id; a sonda é ferramenta local. |
| IN-02 | info | `src/features/hub-candidato/components/HubCandidatoRH.tsx:443` | open | A contagem de respondidas aparece duas vezes. |
| IN-03 | info | `src/features/avaliacao/components/ScorecardAvaliacao.tsx:366` | open | «Não fez» aparece também para Big Five em andamento ou não aplicado. |
| IN-04 | info | `DevolutivaBigFiveView.tsx:174`, `RedacaoEditorScreen.tsx:320` | open | A cópia diz «painel» e o botão leva à lista. |
| IN-05 | info | `src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts` | open | O guarda confere o rótulo, não o destino. |
| IN-06 | info | `scripts/p51_aceite.cjs:186` | open | A sonda fabrica as claims de papel. A sessão real do operador cobriu o papel de verdade. |
