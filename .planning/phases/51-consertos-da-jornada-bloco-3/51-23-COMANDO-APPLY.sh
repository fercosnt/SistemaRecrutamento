#!/usr/bin/env bash
# =============================================================================
# 51-23 — o comando EXATO do apply da limpeza destrutiva 20261010000002 (WR-02 do 51-REVIEW-GAPS-1)
# =============================================================================
# ⛔ DESTRUTIVO E IRREVERSIVEL. Executar só por `bash <este arquivo>`, da raiz do repositório, com:
#   - 51-23-DECISAO.md commitado (`decisao: apagar`);
#   - este arquivo commitado ANTES de nascer o pin refs/gsd/51-23/sha (HEAD = pin; o portão exige isso).
#
# Um ÚNICO encadeamento por `&&`, nesta ordem:
#   (0)  WR-03: DECISAO, POPULACAO e este arquivo estão rastreados, commitados, idênticos a HEAD, e
#        os commits da DECISAO e da POPULACAO são ancestrais do pin;
#   (i)  a medição canônica do 51-23-PLAN.md, só leitura, gravada em ${TMPDIR:-/tmp}/p51_23_agora.json;
#   (ii) a comparação da medição de AGORA com os números APROVADOS em 51-23-DECISAO.md. Ela recusa com
#        `POPULACAO DIFERE DA APROVADA: …` (saída 1) nestes casos: alvo_md5 ≠ alvo_md5_aprovado,
#        linhas ≠ linhas_aprovadas, com_disp ≠ com_disp_aprovados, titulares < o de 51-23-POPULACAO.json,
#        o motor fora do ledger, ou a limpeza já no ledger;
#   (iii) node scripts/p51_portao.cjs … --modo apply;
#   (iv) node p46apply.cjs migrate <a 20261010000002>.
# Recusa em (0)/(i)/(ii)/(iii): nada é escrito em PROD. Recusa do PRE/POS em (iv): a transação inteira
# volta. Em qualquer recusa: PARAR e levar ao operador. Não re-aplicar, não trocar de via, não contornar.
# Só contagens e md5: nenhum id, nome ou e-mail é impresso nem gravado.
# =============================================================================
set -o pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

P=.planning/phases/51-consertos-da-jornada-bloco-3
DEC=$P/51-23-DECISAO.md
POP=$P/51-23-POPULACAO.json
SELF=$P/51-23-COMANDO-APPLY.sh
PIN=refs/gsd/51-23/sha
AGORA="${TMPDIR:-/tmp}/p51_23_agora.json"
MIG=supabase/migrations/20261010000002_p51_limpa_disponibilidade_anonimizados.sql

SQL="set transaction read only; with t as (select c.id from public.candidatos c where c.email = 'anonimizado+' || c.id::text || '@invalido.local' and c.user_id is null and c.data_nascimento = date '1900-01-01'), alvo as (select d.candidato_id from public.disponibilidade d join t on t.id = d.candidato_id) select (select count(*) from t) as titulares, (select count(distinct candidato_id) from alvo) as com_disp, (select count(*) from alvo) as linhas, (select md5(coalesce(string_agg(x, ',' order by x), '')) from (select distinct candidato_id::text as x from alvo) s) as alvo_md5, (select count(*) from public.disponibilidade d where not exists (select 1 from t where t.id = d.candidato_id)) as outros_n, (select count(*) from supabase_migrations.schema_migrations where version = '20261010000001') as motor_no_ledger, (select count(*) from supabase_migrations.schema_migrations where version = '20261010000002') as limpeza_no_ledger"

MED='let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=s.indexOf("[");if(i<0){console.error("MEDICAO FALHOU: saida sem JSON");process.exit(1)}const r=JSON.parse(s.slice(i))[0];const o={titulares:Number(r.titulares),com_disp:Number(r.com_disp),linhas:Number(r.linhas),alvo_md5:String(r.alvo_md5),outros_n:Number(r.outros_n),motor_no_ledger:Number(r.motor_no_ledger),limpeza_no_ledger:Number(r.limpeza_no_ledger),medido_em:new Date().toISOString()};require("fs").writeFileSync(process.argv[1],JSON.stringify(o)+"\n");console.log("(i) medido agora: "+JSON.stringify(o))})'

CMP='const fs=require("fs");const a=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const d=fs.readFileSync(process.argv[2],"utf8");const p=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));const g=k=>{const m=d.match(new RegExp("^"+k+": *(\\S+)","m"));return m?m[1]:""};const e=[];const ap=g("alvo_md5_aprovado"),la=g("linhas_aprovadas"),ca=g("com_disp_aprovados");if(g("decisao")!=="apagar")e.push("decisao nao e apagar");if(!/^[0-9a-f]{32}$/.test(ap))e.push("alvo_md5_aprovado ausente ou malformado");if(!/^[0-9]+$/.test(la))e.push("linhas_aprovadas ausente ou malformado");if(!/^[0-9]+$/.test(ca))e.push("com_disp_aprovados ausente ou malformado");for(const k of ["titulares","com_disp","linhas","outros_n","motor_no_ledger","limpeza_no_ledger"])if(!Number.isInteger(a[k]))e.push("medicao de agora sem "+k);if(!Number.isInteger(p.titulares)||p.titulares<1)e.push("51-23-POPULACAO.json sem titulares");if(a.alvo_md5!==ap)e.push("alvo_md5 agora "+a.alvo_md5+" != aprovado "+ap);if(a.linhas!==Number(la))e.push("linhas agora "+a.linhas+" != aprovadas "+la);if(a.com_disp!==Number(ca))e.push("com_disp agora "+a.com_disp+" != aprovados "+ca);if(!(a.titulares>=p.titulares))e.push("titulares agora "+a.titulares+" < medido "+p.titulares);if(a.linhas<1)e.push("nada a apagar");if(a.motor_no_ledger!==1)e.push("20261010000001 fora do ledger");if(a.limpeza_no_ledger!==0)e.push("20261010000002 ja no ledger");if(e.length){console.error("POPULACAO DIFERE DA APROVADA: "+e.join("; "));process.exit(1)}console.log("(ii) populacao de agora = aprovada: titulares="+a.titulares+" (>= "+p.titulares+"), com_disp="+a.com_disp+", linhas="+a.linhas+", alvo_md5="+a.alvo_md5+"; outros_n="+a.outros_n+" (so registro); ledger 0001=1, 0002=0")'

rm -f "$AGORA" \
&& echo "inicio: $(date '+%Y-%m-%d %H:%M:%S %z')" \
&& { { git ls-files --error-unmatch "$DEC" "$POP" "$SELF" >/dev/null 2>&1 \
       && git diff --quiet HEAD -- "$DEC" "$POP" "$SELF" \
       && git diff --quiet --cached -- "$DEC" "$POP" "$SELF" \
       && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$DEC")" "$PIN" \
       && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$POP")" "$PIN" \
       && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$SELF")" "$PIN"; } \
     || { echo "SEM OK DO OPERADOR: 51-23-DECISAO.md/POPULACAO/este comando ausente, nao commitado, modificado ou fora do pin" >&2; false; }; } \
&& echo "(0) WR-03 ok: DECISAO, POPULACAO e este comando commitados, identicos a HEAD e no pin $(git rev-parse --short "$PIN")" \
&& node p46apply.cjs sql "$SQL" | node -e "$MED" "$AGORA" \
&& node -e "$CMP" "$AGORA" "$DEC" "$POP" \
&& node scripts/p51_portao.cjs --revisao .planning/phases/51-consertos-da-jornada-bloco-3/51-REVIEW-GAPS --base refs/gsd/51-gaps/base --pin refs/gsd/51-23/sha --plano .planning/phases/51-consertos-da-jornada-bloco-3/51-23-PLAN.md --modo apply \
&& node p46apply.cjs migrate "$MIG"
rc=$?
echo "fim: $(date '+%Y-%m-%d %H:%M:%S %z') rc=$rc"
exit $rc
