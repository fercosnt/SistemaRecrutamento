# 52-26 — Decisão do operador sobre o push (Task 4, Passo 3)

decisao: push-uma-vez-com-caminhos-na-linha-de-comando
decidido_em: 2026-10-11 (America/Sao_Paulo)
pin: 87cfe0ea503f5b7e3c16f91ff53cff5c5f680342 (refs/gsd/52-26/sha — o commit aplicado; não se move)
revisao: 52-REVIEW-GAP-2.md (reviewed_head c1daf9b8)

## O que aconteceu

O «Comando de push» do `<context>` do plano parou em `COMMIT ALHEIO: PARAR` (sessão B, `p50_enumera.cjs`): a lista
fixa `--caminhos` foi escrita antes da rodada de conserto do WR-01 (52-REVIEW-GAP-1) e não tem os dois arquivos que
ela criou — `src/features/entrevista/__tests__/competencias-normalizacao-servidor.test.ts` (8f625cde) e
`src/features/entrevista/services/entrevistaService.ts` (5f091c8d). Os dois estão no `files_reviewed_list` do
52-REVIEW-GAP-2 e antes do pin. A trava agiu certo (recusou em vez de deixar passar); o defeito é a lista literal
— a forma «iteração sobre lista literal» do CLAUDE.md, desta vez do lado que recusa.

A primeira opção levada ao operador (corrigir o plano + review -3) foi aceita e depois RETIRADA pelo orquestrador
antes de qualquer commit: o portão no modo push exige `reviewed_head` ancestral do pin (regra 5) E o plano igual
entre o `reviewed_head` e o HEAD (regra 6); com o plano editado depois do pin, nenhum review satisfaz as duas sem
mover o pin. A edição foi desfeita (`git checkout` do plano) e a pergunta refeita.

## O que roda (uma vez)

O comando do plano, byte a byte, com UMA diferença: no regex de `--caminhos`, o trecho
`src/features/entrevista/__tests__/(entrevista-contract|competencias-padrao-servidor)\.test\.ts$|` vira
`src/features/entrevista/__tests__/(entrevista-contract|competencias-padrao-servidor|competencias-normalizacao-servidor)\.test\.ts$|src/features/entrevista/services/entrevistaService\.ts$|`.
O plano NÃO muda (portão inalterado, coberto pelo 52-REVIEW-GAP-2); continuam valendo `--revisoes` (código coberto
pela revisão de maior N), `--aplicado refs/gsd/52-26/sha` (código contido no apply), o `merge-base --is-ancestor`
e o push por sha. Ensaio em seco da enumeração com a lista acrescida: `enumeracao ok: 31 commit(s) … codigo coberto
por 52-REVIEW-GAP-2.md (reviewed_head c1daf9b8) · codigo contido no apply 87cfe0ea`, 0 commit classificado ALHEIO.

Comando executado:

```
S=$(git rev-parse HEAD); node scripts/p52_portao.cjs --revisao .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-GAP --base refs/gsd/52-18/sha --pin refs/gsd/52-26/sha --plano .planning/phases/52-hub-do-rh-dados-e-contato/52-26-PLAN.md --modo push && git fetch -q origin main && R=$(git ls-remote origin refs/heads/main | awk '{print $1}') && test -n "$R" && test "$R" = "$(git rev-parse origin/main)" && git merge-base --is-ancestor "$R" "$S" && node scripts/p50_enumera.cjs --de "$R" --ate "$S" --caminhos '^(supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa\.sql$|supabase/tests/p52_gap_servidor_smoke\.sql$|scripts/p52_(ensaio|mutacoes)\.cjs$|scripts/geradores/(gen-p52-gap\.cjs|pontuar_sjt_vivo_v2\.plpgsql|salvar_avaliacao_entrevista4_vivo\.plpgsql)$|src/features/entrevista/components/EntrevistaScorecardInline\.tsx$|src/features/entrevista/__tests__/(entrevista-contract|competencias-padrao-servidor|competencias-normalizacao-servidor)\.test\.ts$|src/features/entrevista/services/entrevistaService\.ts$|src/features/avaliacao/__tests__/avaliacaoService\.funil\.test\.ts$)' --assunto '^(feat|fix|test|refactor|chore|docs)\(52-[0-9]{2}\): ' --revisoes .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-GAP --base refs/gsd/52-18/sha --aplicado refs/gsd/52-26/sha && git push origin "$S":refs/heads/main
```

## Resposta do operador

1ª pergunta (orquestrador, AskUserQuestion): «A — corrigir o plano + review -3 (Recomendado)» — retirada pelo
orquestrador (acima).

2ª pergunta, «Correção da minha recomendação anterior: a opção A não destrava o push. […] Como seguir?»:
«B — rodar uma vez com autorização escrita (Recomendado)».
