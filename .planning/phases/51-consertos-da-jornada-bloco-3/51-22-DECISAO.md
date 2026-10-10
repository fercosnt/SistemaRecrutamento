decisao: aplicar
migration: 20261010000001
pausa_outras_janelas: confirmada
config_purga_modo: dry_run
publicar_texto_51_19: confirmado
review_aprovado: 51-REVIEW-GAPS-1.md
aprovado_em: 2026-10-10 03:15 -0300
canal: AskUserQuestion, na sessão do orquestrador (checkpoint da Task 2 do 51-22, gate blocking-human)
escrito_por: executor do 51-22, com a resposta repassada pelo orquestrador; o executor não decidiu nem revisou

# 51-22 — OK do operador para o apply do motor G1a (`20261010000001`)

Este arquivo não é relatório: é a entrada que o comando do apply da Task 3 lê por máquina (terceiro `<verify>` da Task 2,
encadeado por `&&` antes do `p51_portao.cjs --modo apply` e do `p46apply.cjs migrate`). As chaves acima são uma por linha,
sem quebra dentro do valor. A limpeza destrutiva `20261010000002` NÃO é autorizada aqui — tem checkpoint próprio no 51-23.

Review sobre o qual o operador decidiu: `51-REVIEW-GAPS-1.md` (commit d9553a17), `critical: 0`, `warning: 4`, `info: 3`,
`diff_base: ef7fa24c690474245dd5b0363c436222e8981381`, `reviewed_head: c35cd52408040a0258730641fead1612fcffe2a8`.

Medições da Task 1 mostradas ao operador (só leitura, 2026-10-10 02:55–02:56 -0300): `md5(prosrc)` vivo de
`anonimizar_candidato(uuid,boolean)` = `a68e4a6a47d9482f75d3326a8bf2b3e4`; `config_purga.modo` = `dry_run`; cabeça do ledger
`20261008000005`, nenhuma `20261010%`; ensaios p45 e p46 com a `20261010000001` prefixada: ENSAIO VERDE, `g1a:anon=9b87e5ee3d072df5f9bf6e99ee1ae7c1`, abortados.

## Resposta do operador

VERBATIM (AskUserQuestion, 2026-10-10 03:15 -0300). As perguntas como foram feitas, e a resposta:

(a) «Aplicar em PROD a migration 20261010000001 (o motor de exclusão passa a apagar a disponibilidade do titular em toda exclusão futura), sobre o review 51-REVIEW-GAPS-1.md (critical 0)?» → «Aplicar»

(b) «Você confirma que nenhuma outra janela do Claude publica ou aplica neste repositório até o fim do 51-24? (A janela de cadastro de vagas pode continuar editando docs/vagas e docs/specs, desde que não faça push nem apply.)» → «Confirmo»

(c) apresentada como medição: `config_purga.modo` = `dry_run` (medido na Task 1; remedido imediatamente antes do apply — se não for `dry_run`, PARAR)

(d) «A frase aprovada no 51-19-TEXTO-APROVADO.md vai ao ar no redeploy da EF executar-direito-titular do 51-24?» → «Confirmo a publicação»

(e) «A disposição dos achados WR-01..04 e IN-01..03 do review: aceita a proposta da tabela?» → «Aceito a proposta (Recommended)»

### Disposição dos achados do review (dada pelo operador, proposta pelo orquestrador)

| Achado | Resumo | Disposição |
|---|---|---|
| WR-01 | comentário do motor no catálogo diz «não remove linha de tabela alguma»; o POS-PORTAO exige que fique igual | backlog — migration só de comentário depois do 51-24, com review próprio |
| WR-02 | 51-23: vínculo do apply à população aprovada só em prosa | mitigar na execução do 51-23 — o comando exato fica num arquivo commitado e é mostrado ao operador no checkpoint, antes de rodar |
| WR-03 | 51-23-DECISAO.md não conferido como commitado e igual a HEAD | mitigar na execução do 51-23 — conferência por máquina no despacho |
| WR-04 | a invariante do ensaio não vigia as 26 linhas dos candidatos vivos | backlog; no apply real o POS `(outros)` da 0002 cobre |
| IN-01 | Redação: servidor marca concluída no primeiro envio, cliente no último; anterior à fase | registrar, sem ação |
| IN-02 | comentário «fábrica única» vs usos literais da chave | registrar, sem ação |
| IN-03 | se a limpeza for vetada, a regra (8) do portão trava a publicação do G1b/G2 | decidir no checkpoint do 51-23 se ocorrer |
