# 52-26 — Decisão do gap (Task 3)

decisao: aplicar
revisao: 52-REVIEW-GAP-2.md
warnings: 1
disposicao_WR-01: aceitar — residual: a guarda cliente × servidor da normalização das competências não fixa o tratamento de espaços (um `trim` de um lado só passa verde); regra registrada: «mudar `normalizeCompetencia` (ou o filtro `competenciasDoScorecard`) ou o CASE da 0005 exige mudar os dois e regenerar»; dono: operador (Fernando). Vai ao `52-SECURITY.md` quando ele for escrito (junto do residual do `p50_desfazer_expansao.sql`, IN-05)
janela_unica: confirmada
decidido_em: 2026-10-11 (America/Sao_Paulo)

Caminho que valeu para o CONTEÚDO: a autorização de 2026-10-11 (`52-DECISAO-2026-10-11-gaps-e-pitr.md`, «Antes do UAT: … o
WR-04 … e, no mesmo plano, o F13 …») mais a resposta do operador a cada WR dos reviews:
- `52-REVIEW-GAP-1` (critical 0, warning 1): WR-01 «consertar agora» — `52-26-DECISAO-RODADA-1.md`; conserto em
  `0187b7af..c1daf9b8` (cláusula (n), G8/G9, guarda do cliente), corpo da 0005 inalterado (md5 do arquivo `036d9d45…`).
- `52-REVIEW-GAP-2` (critical 0, warning 1, nada destrutivo; o conserto não introduziu defeito): WR-01 «aceitar» (acima).
INFOs (IN-01..IN-08 do -2) ficam registradas no review, sem disposição exigida.

## Resposta do operador

Rodada 1 (sobre o 52-REVIEW-GAP-1), perguntado pelo orquestrador (AskUserQuestion):
- WR-01: «Consertar agora (Recomendado)».
- «Janela única (obrigatória em todo caminho): nenhuma outra janela publica (migration, Edge Function ou push) até o
  fim do plano 52-26?»: «Janela única: confirmo».

Rodada 2 (sobre o 52-REVIEW-GAP-2), perguntado pelo orquestrador (AskUserQuestion):
- WR-01: «Aceitar como residual (Recomendado)».
