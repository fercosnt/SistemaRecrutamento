---
phase: 51-consertos-da-jornada-bloco-3
review: 51-REVIEW.md
review_counts: { critical: 0, warning: 2, info: 6, total: 8 }
recorded: 2026-10-10
updated: 2026-10-10
---

# 51 — Disposição dos achados do code review da fase

Toda linha nasce `open`. Só o operador ou um plano de conserto mudam o estado, com evidência.

| Id | Severidade | Arquivo | Disposição | Nota |
|---|---|---|---|---|
| WR-01 | warning | `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx:115` | fixed | A lista de avaliações abre do cache depois de «Prova registrada», e refazer a prova sobrescreve score e banda em `pontuar_cognitivo`. O 51-07 resolveu o mesmo caso para o Raven. Candidato a conserto antes do fecho do M8. **Consertado no cliente pelo 51-18 (G2, decisão do operador em `51-GAPS-DECISAO.md`: «só o cliente»):** o helper `marcarInstrumentoRegistrado` escreve `registrado: true` em `['avaliacao','status',id]` e invalida a entrada no sucesso do envio da prova cognitiva, do caso aberto do SJT, do Big Five final e do último envio da Redação (`4014c299`, `4003bfb1`). Os testes falham na base `359fd59a` (o card voltava «Pendente / Começar avaliação») e passam no HEAD (`.red-51-18/`). Publicado no push do 51-24 (`53cb73ff..3bb9653d`, 2026-10-10 03:32). A defesa no servidor (`pontuar_cognitivo` recusar o reenvio) segue em backlog: entrada `(51-18)` em `deferred-items.md`; por ela o UF-3 do `51-SECURITY.md` segue `open`. |
| WR-02 | warning | `docs/compliance/sql/gen-recibo-exclusao.cjs:575` | fixed | O recibo atribui à UF uma finalidade («relatório agregado») que nenhum objeto vivo usa. É texto ao titular (LGPD); decisão do operador. Junta-se ao WINDOWS 89 (`disponibilidade`). **Consertado pelo 51-19 (G1b):** razões separadas — a faixa etária fica «para relatório agregado»; a UF fica «porque o cadastro exige uma UF válida» (`359fd59a`, testes `405e19bd`). Texto aprovado pelo operador em 2026-10-10 (`51-19-TEXTO-APROVADO.md`, `4d58129e`) e confirmado para publicação em 2026-10-10 03:15 -0300 (`51-22-DECISAO.md`, (d)). No ar: `executar-direito-titular` **v15** ACTIVE (2026-10-10 03:31:35 -0300; era v14 de `87be2703`, base de desfazer em `51-24-EF-ANTES.md`), texto conferido byte a byte contra o aprovado antes do deploy; cliente no push `53cb73ff..3bb9653d`, marcador «porque o cadastro exige uma UF» servido em `/assets/index--Yy-gC6F.js` (AUSENTE antes). A metade da `disponibilidade` (WINDOWS 89) foi fechada pelo motor (51-22) e pela limpeza (51-23). |
| IN-01 | info | `scripts/p51_aceite.cjs:302` | open | O erro repassado pode trazer o user_id; a sonda é ferramenta local. |
| IN-02 | info | `src/features/hub-candidato/components/HubCandidatoRH.tsx:443` | open | A contagem de respondidas aparece duas vezes. |
| IN-03 | info | `src/features/avaliacao/components/ScorecardAvaliacao.tsx:366` | open | «Não fez» aparece também para Big Five em andamento ou não aplicado. |
| IN-04 | info | `DevolutivaBigFiveView.tsx:174`, `RedacaoEditorScreen.tsx:320` | open | A cópia diz «painel» e o botão leva à lista. |
| IN-05 | info | `src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts` | open | O guarda confere o rótulo, não o destino. |
| IN-06 | info | `scripts/p51_aceite.cjs:186` | open | A sonda fabrica as claims de papel. A sessão real do operador cobriu o papel de verdade. |
