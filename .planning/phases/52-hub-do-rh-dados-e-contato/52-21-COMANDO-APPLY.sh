#!/usr/bin/env bash
# =============================================================================
# 52-21 — o comando EXATO do apply da limpeza destrutiva 20261011000004 (bloco D; D-30, D-32, D-41 emendada)
# =============================================================================
# ⛔ DESTRUTIVO E IRREVERSIVEL. Apaga de PROD a população de teste aprovada: candidatos, candidaturas,
#    contas de login e o que cascateia; põe deleted_at nas vagas de teste do escopo.
#    O PITR foi RECUSADO (D-41 emendada, 2026-10-11). O desfazer das linhas é a restauração CIRÚRGICA pelo
#    export local da Task 1 (fora do git, md5 em 52-21-EXPORT.md/52-21-DECISAO.md) ou, com o banco
#    INTEIRO, a restauração do backup diário (perde tudo o que mudou depois dele). Os currículos não
#    passam por este comando: saem depois, pelo «Comando dos currículos» do 52-21-PLAN.md, e só voltam
#    pelo export.
#
# Executar só por `bash .planning/phases/52-hub-do-rh-dados-e-contato/52-21-COMANDO-APPLY.sh`, da raiz do
# repositório, com:
#   - 52-21-DECISAO.md commitado (`decisao: apagar`, números aprovados, export aprovado,
#     `comando_md5_aprovado:` = md5 DESTE arquivo no momento do OK);
#   - este arquivo, a DECISAO, a POPULACAO e o STORAGE commitados ANTES de nascer o pin refs/gsd/52-21/sha
#     (HEAD = pin; o portão --modo apply exige isso);
#   - na manhã (America/Sao_Paulo, antes de 12:00) seguinte a um backup diário físico COMPLETED posterior
#     ao export aprovado e ao último apply da fase; antes disso o passo (iv) recusa e nada é escrito.
#
# Um ÚNICO encadeamento por `&&`, nesta ordem:
#   (0)   DECISAO, POPULACAO, STORAGE e este arquivo rastreados, sem diferença com HEAD nem staged, com o
#         último commit de cada um ancestral do pin; o script em execução É o arquivo do repositório
#         (`-ef`: uma cópia editada fora dele não roda); e o md5 deste arquivo = a linha única
#         `comando_md5_aprovado:` da DECISAO (I6: ausente, malformada ou diferente recusa com
#         `SEM OK DO OPERADOR: …`). O comando que roda é o que o revisor leu e o operador aprovou;
#   (0b)  WR-04 do 52-REVIEW-LIMPEZA-1, por máquina: o md5 deste arquivo NO `reviewed_head` do review
#         vigente (o 52-REVIEW-LIMPEZA-N.md de MAIOR N — a regra (1) do p52_portao.cjs —, lido em HEAD,
#         `reviewed_head:` único no frontmatter) = `comando_md5_aprovado`. Uma edição feita entre o review
#         e o OK recusa com `COMANDO NAO E O REVISADO: …`;
#   (i)   a medição só leitura pela MESMA query do 52-19/52-21 (`p52_limpeza_portao.cjs medir`), gravada em
#         ${TMPDIR:-/tmp}/p52_21_agora.json;
#   (ii)  `p52_limpeza_portao.cjs comparar`: recusa com `POPULACAO DIFERE DA APROVADA: …` se a população
#         de agora não for a aprovada (md5, conjunto de categorias, contagem por categoria);
#   (iii) `p52_portao.cjs --modo apply` com o review 52-REVIEW-LIMPEZA-N.md (critical: 0; HEAD = pin;
#         código do pin = o revisado; plano inalterado; árvore limpa);
#   (iv)  `p52_backup.cjs --apply --decisao`: D-41 emendada, condições 1 e 3 AGORA. O último backup
#         físico COMPLETED é posterior ao último apply da fase e ao `export_em_aprovado`, e agora (Date do
#         servidor) é a manhã seguinte a ele;
#   (v)   `p52_export_limpeza.cjs --conferir --decisao … --vivo`: D-41 emendada, condição 2 AGORA. O export
#         aprovado existe fora do git, íntegro, é a população aprovada e é igual ao banco de agora;
#   (vi)  o migrate da 20261011000004 (PRE/POS dentro da mesma transação; ledger na mesma requisição).
#   (iv) e (v) são os DOIS elos imediatamente anteriores ao (vi). O quarto <verify> da Task 1 e o segundo
#   da Task 2 do 52-21-PLAN.md conferem isso por POSIÇÃO.
# Recusa em (0)…(v): nada é escrito em PROD. Recusa do PRE/POS em (vi): a transação inteira volta.
# Em qualquer recusa: PARAR e levar ao operador. Exceção: se a recusa do (iv) for SÓ pela janela da manhã,
# rodar o MESMO comando na próxima manhã, depois do backup diário. Não re-aplicar, não trocar de via, não
# contornar, não editar este arquivo depois do OK (o md5 dele está na decisão).
# Só contagens e md5: nenhum nome, e-mail, CPF ou nome de arquivo é impresso nem gravado.
# =============================================================================
set -o pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

P=.planning/phases/52-hub-do-rh-dados-e-contato
DEC=$P/52-21-DECISAO.md
POP=$P/52-21-POPULACAO.json
STO=$P/52-21-STORAGE.json
SELF=$P/52-21-COMANDO-APPLY.sh
PIN=refs/gsd/52-21/sha
AGORA="${TMPDIR:-/tmp}/p52_21_agora.json"
MIG=supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql

rm -f "$AGORA" \
&& echo "inicio: $(date '+%Y-%m-%d %H:%M:%S %z') ($(date -u '+%Y-%m-%dT%H:%M:%SZ'))" \
&& { { git ls-files --error-unmatch "$DEC" "$POP" "$STO" "$SELF" >/dev/null 2>&1 \
       && git diff --quiet HEAD -- "$DEC" "$POP" "$STO" "$SELF" \
       && git diff --quiet --cached -- "$DEC" "$POP" "$STO" "$SELF" \
       && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$DEC")" "$PIN" \
       && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$POP")" "$PIN" \
       && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$STO")" "$PIN" \
       && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$SELF")" "$PIN" \
       && [ "${BASH_SOURCE[0]}" -ef "$SELF" ] \
       && [ "$(grep -cE '^comando_md5_aprovado: *[0-9a-f]{32} *$' "$DEC")" = 1 ] \
       && [ "$(md5 -q "$SELF")" = "$(sed -n 's/^comando_md5_aprovado: *\([0-9a-f]\{32\}\) *$/\1/p' "$DEC")" ]; } \
     || { echo "SEM OK DO OPERADOR: 52-21-DECISAO.md/POPULACAO/STORAGE/este comando ausente, nao commitado, modificado, fora do pin, executado fora do repositorio, ou md5 deste arquivo != comando_md5_aprovado" >&2; false; }; } \
&& { { REV=$(ls "$P" | sed -n 's/^52-REVIEW-LIMPEZA-\([0-9][0-9]*\)\.md$/\1/p' | sort -n | tail -1) \
       && RH=$(git show "HEAD:$P/52-REVIEW-LIMPEZA-$REV.md" | sed -n '2,/^---$/s/^reviewed_head: *\([0-9a-f]\{7,40\}\) *$/\1/p') \
       && [ "$(printf '%s\n' "$RH" | grep -c .)" = 1 ] \
       && [ "$(git show "$RH:$SELF" | md5 -q)" = "$(sed -n 's/^comando_md5_aprovado: *\([0-9a-f]\{32\}\) *$/\1/p' "$DEC")" ]; } \
     || { echo "COMANDO NAO E O REVISADO: md5 deste arquivo no reviewed_head do 52-REVIEW-LIMPEZA de maior N (lido em HEAD) != comando_md5_aprovado, ou review/reviewed_head ausente ou repetido" >&2; false; }; } \
&& echo "(0) ok: DECISAO, POPULACAO, STORAGE e este comando commitados, identicos a HEAD e no pin $(git rev-parse --short "$PIN"); comando $(md5 -q "$SELF" | cut -c1-8) = comando_md5_aprovado = o de 52-REVIEW-LIMPEZA-$REV no reviewed_head $(printf '%s' "$RH" | cut -c1-8)" \
&& node scripts/p52_limpeza_portao.cjs medir "$AGORA" --decisao $P/52-19-DECISAO-ESCOPO.md \
&& node scripts/p52_limpeza_portao.cjs comparar "$AGORA" "$DEC" "$POP" \
&& node scripts/p52_portao.cjs --revisao $P/52-REVIEW-LIMPEZA --base refs/gsd/52-18/sha --pin "$PIN" --plano $P/52-21-PLAN.md --modo apply \
&& node scripts/p52_backup.cjs --apply --decisao "$DEC" \
&& node scripts/p52_export_limpeza.cjs --conferir --decisao "$DEC" --populacao "$POP" --storage "$STO" --vivo \
&& node p46apply.cjs migrate "$MIG"
rc=$?
echo "fim: $(date '+%Y-%m-%d %H:%M:%S %z') ($(date -u '+%Y-%m-%dT%H:%M:%SZ')) rc=$rc"
exit $rc
