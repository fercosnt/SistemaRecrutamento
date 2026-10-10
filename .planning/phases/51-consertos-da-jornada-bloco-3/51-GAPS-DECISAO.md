---
phase: 51-consertos-da-jornada-bloco-3
fonte: 51-VERIFICATION.md (gaps_found 7/9) · 51-SECURITY.md (T-51-14 OPEN, bloqueante) · 51-REVIEW-DISPOSITION.md (WR-01, WR-02)
decidido_por: operador
decidido_em: 2026-10-10
canal: /gsd-plan-phase 51 --gaps (pergunta direta, antes de despachar o planner)
---

# 51 — Decisões do operador para o fechamento dos gaps

Respostas do operador às três perguntas feitas antes do planejamento. São a fonte única para os
planos de `gap_closure` desta fase. Um plano que contradiga uma delas está errado.

| # | Gap | Decisão | O que ficou fora |
|---|---|---|---|
| G1a | T-51-14 / WINDOWS 89: o recibo promete apagar `disponibilidade` e o motor não apaga | **O motor apaga.** Uma migration nova faz `anonimizar_candidato` apagar as linhas de `disponibilidade` do titular, e um passo **destrutivo** com portão limpa as linhas que sobraram dos titulares já anonimizados (2/2 medidos em 2026-10-10). O texto do recibo ("… e disponibilidade vão ser / foram apagados") **fica como está** e passa a ser verdade. | Reclassificar para «mantém». Aceite de risco (AR). |
| G1b | WR-02: o recibo atribui à UF a finalidade «relatório agregado» e `gerar_bias_snapshot` não lê `estado` | **Separar as razões no texto.** A faixa etária continua «para relatório agregado». A UF ganha a razão verdadeira: o cadastro exige uma UF válida e ela fica sem vínculo com o nome. É só texto e regeneração (`gen-recibo-exclusao.cjs` → JSON, `reciboExclusao.ts`, `.generated.ts`, inventário, teste do gerador) e redeploy das EFs pela via do projeto. **A frase final passa pelo operador num checkpoint antes do deploy.** | Mudar `gerar_bias_snapshot` para agregar por UF (mudança de produto). |
| G2 | WR-01: a lista de avaliações abre do cache depois de concluir uma prova | **Só o cliente.** `setQueryData` + `invalidateQueries` em `avaliacaoStatusKey(id)` no sucesso do envio (molde do Raven, `AvaliacaoRavenScreen.tsx:143-146`), em: prova cognitiva, caso aberto do SJT, envio final do Big Five e último envio da Redação, com teste. | Recusar reenvio em `pontuar_cognitivo` no servidor. Vai para backlog e terá review próprio. |

## Regras que vêm junto

- G1a escreve no motor de purga vivo. A limpeza das linhas remanescentes é **destrutiva e
  irreversível**. Por isso a migration passa por ensaio, re-review do conserto e OK do operador antes
  do apply, como em toda escrita destrutiva da fase. A parte aditiva (o motor passar a apagar daqui
  para frente) e a parte destrutiva (apagar as linhas que já existem) são passos separados, para que
  cada um tenha a sua prova.
- Depois do apply, a prova no banco é a que o T-51-14 exigia e que falhou no 51-05: o corpo vivo de
  `anonimizar_candidato` cita `disponibilidade` e 0 titulares anonimizados ainda têm linha em
  `disponibilidade`.
- Via de apply: `p46apply.cjs migrate` (SQL lido do arquivo, ledger na mesma transação). As EFs são
  redeployadas por `efdeploy.cjs`. Depois de tudo, `git log --oneline origin/main..HEAD` tem de sair
  vazio, e os marcadores têm de ser conferidos no chunk certo.
- Fecho: rodar de novo `/gsd-secure-phase 51` (T-51-14) e `/gsd-verify-work` / re-verificação da fase.

## Decisão de execução (operador, 2026-10-10, `/gsd-execute-phase 51 --gaps-only`, AskUserQuestion)

- **Trava `verify.schema-drift` do GSD: pular nesta fase** (resposta: «Pular a trava nesta fase»). Ela bloqueou o fim
  da wave 1 dizendo que «no database push was executed» e recomendando `supabase db push`. Medido no ledger de PROD
  (leitura, 2026-10-10): `20261008000001..5` **aplicadas**; `20261010000001` não aplicada **de propósito** (apply no
  51-22, depois do review e do OK do operador); `20261010000002` **não existia no disco** (a trava lê o
  `files_modified` dos PLANs). `supabase db push` aqui aplicaria o motor antes do portão do 51-22 — não é a via do
  projeto (`p46apply.cjs migrate`). As waves seguintes rodam com `GSD_SKIP_SCHEMA_CHECK=true`; os applies continuam
  nos planos 51-22/51-23, com os portões deles.
