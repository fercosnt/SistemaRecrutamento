# 51-16 — Portão da Onda B: pacote de decisão do operador (pendente)

Preparado pelo orquestrador do `/gsd-execute-phase 51` em 2026-10-09, enquanto o operador dormia.
Nada da Onda B (`20261008000002..4`, EFs, cliente de 51-12/51-14) foi aplicado, deployado ou empurrado.

## Onde a execução parou

- 15/17 planos com SUMMARY (51-01..51-15). Onda A publicada; 51-06 (`raven`, migration `0001`) no ar.
- 51-16 Task 1 (`checkpoint:decision`, `gate="blocking-human"`): **review feito, decisão pendente.**
- `origin/main` = `ad2790a3`; o `main` local tem ~40 commits à frente. ⚠ O cliente desses commits (51-12, 51-14)
  **quebra a página de explicação e a fila do RH se for publicado antes do apply** — ninguém deve empurrar `main`
  fora da Task 3 do 51-16.

## Medições só-leitura (Task 1, 2026-10-09 04:17:21-03)

| Medição | Valor |
|---|---|
| A5 — `notificacoes_enviadas` com `status='falhou'` e `evento='decisao'` | **0** → pergunta (c) não se aplica |
| `config_purga.modo` | **`dry_run`** → pergunta (d) não se aplica |
| ledger head | `20261008000001`; `0002..0004` ausentes |

## Review

`51-REVIEW-PORTAO-1.md` (commit `5ff2d0ab`, `reviewed_head` `1c9a1276`): **0 critical, 9 warning, 16 info.**
`node scripts/p51_portao.cjs … --modo revisao` → `PORTAO OK`.

O orquestrador **não** abriu rodada de conserto: cinco warnings mexem no programa de publicação ou são escolhas da
porta de mão única, e cada conserto exige um review novo (`-2`). Uma rodada só, depois das disposições, custa menos.

### Warnings que pedem disposição antes de «aplicar»

| # | O quê | Recomendação do orquestrador |
|---|---|---|
| WR-01 | `--modo deploy`/`push` do portão não conferem que `0002..0004` estão no ledger; o pin nasce antes do apply. Task 2 parada no meio + Task 3 = exportação LGPD e página de explicação quebradas para todos | **Consertar** (portão lê o ledger + md5 no mesmo comando) |
| WR-02 | o e-mail de rejeição novo (D-09) vai ao ar no deploy da EF, antes do push ser validado; se o push for recusado, e-mail e página se contradizem | **Consertar** (pré-validação do push em seco antes do 1º `efdeploy`; desfazer da EF escrito) |
| WR-03 | `getExplicacao` lança se a RPC nova faltar e derruba também a explicação de `decisao_final` | **Consertar** (RPC ausente → fluxo antigo) |
| WR-04 | o «Desfazer» não fixa a ordem inversa (cliente → EF → banco) | **Consertar** (texto do plano + capturar versões vivas das EFs) |
| WR-09 | sem D-23 no caminho novo: quem teve a rejeição revertida pode re-rejeitar na hora | **Sua decisão** — estender o D-23 a `rejeitar_candidatura` (migration própria) ou aceitar |
| WR-05 | `knockout_rate` volta a contar knockout revertido depois rejeitado na decisão final | aceitar e registrar, ou consertar |
| WR-06 | `em_espera` silencia o alerta de prazo novo (o laço irmão faz o contrário) | alinhar com o A5 do laço irmão |
| WR-07 | `p48_prazo_reabertura_smoke` reprova com diagnóstico falso pós-apply (WINDOWS #90) | consertar o smoke antes do apply |
| WR-08 | o check «catálogo vivo = acréscimo» é substring | consertar |

Infos: ver o review (IN-01..IN-16). IN-16: `solicitar_revisao_decisao` ainda tem EXECUTE para `anon`.

## Perguntas do plano (responder por escrito; o SUMMARY registra verbatim e datado)

- **(a)** Aplicar o JORN-42 pelo mecanismo (b) com as escolhas do planejador, sabendo que depois do apply e do push o
  candidato passa a exercer o direito e que desfazer retira um direito já exercido? — «aplicar» / «vetar: <motivo>»
- **(b)** Nenhuma outra janela do Claude publica neste repositório até o fim da Task 3? (há arquivos sujos de outras
  sessões: `docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`, `AGENTS.md`, `.planning/ui-reviews/.gitignore`)
- **(c)** A5 — medido 0; nada a decidir (confirmar).
- **(d)** `config_purga.modo` — medido `dry_run`; nada a decidir (confirmar).
- **(e)** Pendências da varredura de leitores de `knockout_automatico` do 51-10 — disposição.
- **(f)** Confirma o aperto A4 do 51-06 (`anon` sem EXECUTE em `get_avaliacao_status`)? Um veto desfaz só isso.

## Decisões pendentes de antes do portão

- **WINDOWS 89 (51-05):** o recibo promete apagar `disponibilidade`; nada apaga (medido duas vezes: nenhuma função
  grava a tabela nem apaga `candidatos`; os 2 anonimizados ainda têm a linha). Motor (proibido pelo D-23 nesta fase)
  ou mover para «mantém» com base legal sua.
- **51-03:** as 15 vagas têm `aplica_cognitivo=false` → «Prova cognitiva» mostra «Não se aplica» para todos sem faixa.
- **51-14:** «a pedido do titular» trocado por texto neutro (a purga de retenção também apaga as respostas) — confirmar.
- **51-15:** WINDOWS 91 (três chaves de `revisao_rejeicao` no export), 92 (fonte do «opção do knockout nunca vai ao
  candidato»), 93 (recibo omite o registro que sobrevive).
- **51-04:** o executor passou por cima da parada do passo 0 (wrapper de 3 args não previsto pela sonda); o
  orquestrador conferiu no banco e a regra D-22 vale em todo caminho de gravação.

## Próximo passo

Responder (a)–(f) e as disposições acima; então `/gsd-execute-phase 51` retoma no 51-16: rodada de conserto →
`51-REVIEW-PORTAO-2.md` → Task 2 (apply) → Task 3 (EFs → push) → 51-17.

---

## ✅ Respostas do operador — 2026-10-09 ~15:25 -03 (via `/gsd-execute-phase 51`, AskUserQuestion)

Antes de perguntar, o orquestrador repetiu as medições só-leitura em PROD às **15:21:23 -03**:
ledger head `20261008000001`, `0002..0004` ausentes (0 no ledger), `to_regclass('public.revisao_rejeicao')` = null,
`config_purga.modo` = `dry_run`, A5 = 0, `origin/main` = `ad2790a3` (fetch), `main` local 41 à frente.
Ou seja, o pacote acima continuava valendo.

Respostas registradas como foram dadas (opção escolhida em cada pergunta):

- **(a)** «**Aplicar**». O fluxo será: conserto → `51-REVIEW-PORTAO-2` com 0 critical → apply de 0002..0004 (e da
  migration do D-23, ver WR-09) → EFs → push do cliente.
- **Disposição do review -1**: «**Seguir recomendações**». Consertar WR-01, WR-02, WR-03, WR-04, WR-07 e WR-08.
  **WR-06**: o laço novo ignora `decisao = 'em_espera'`, alinhado com o A5 do laço irmão (P48).
  **WR-05** (`knockout_rate`): aceito e registrado, sem conserto.
- **WR-09**: «**Estender o D-23**» a `rejeitar_candidatura`. A semântica é a do D-23 da 48: **o decisor revertido**
  (quem fez a rejeição que a revisão reverteu) não re-rejeita a mesma candidatura. Outro RH pode. Vai numa
  migration própria e entra no escopo do review -2.
- **(b)** Confirmado: nenhuma outra janela do Claude publica (apply/deploy/push) até o fim da Task 3.
- **(c)+(d)** Confirmado: A5 = 0 e purga em `dry_run`, nada a decidir.
- **(e)** Confirmado: as 3 candidaturas de teste do 51-08 (0f7b217c, 25a4231c, 92522073) ficam como auditoria histórica,
  sem conserto.
- **(f)** Confirmado o aperto A4: `anon` continua sem EXECUTE em `get_avaliacao_status`.

**Fora do portão e ainda sem resposta** (não bloqueiam o 51-16; ficam para o fecho da fase): WINDOWS 89 (`disponibilidade`
no recibo), 51-03 (`aplica_cognitivo=false`), 51-14 (texto neutro), WINDOWS 91-93 (51-15) e IN-16
(`solicitar_revisao_decisao` com EXECUTE para `anon`).

## ✅ Respostas do operador ao review -2 — 2026-10-09 (via `/gsd-execute-phase 51`, AskUserQuestion)

`51-REVIEW-PORTAO-2.md` (commit `6dc622da`, `reviewed_head` `be4eddce`): 0 critical, 3 warning, 6 info. WR-09 do -1 ficou
**parcial**, porque o D-23 cobre só 2 das 4 combinações (fonte da reversão × caminho da re-rejeição).

- **D-23**: «**Fechar as 4**». O decisor revertido é recusado tanto em `rejeitar_candidatura` quanto em
  `registrar_decisao(rejeitado)`, venha a reversão de `revisao_rejeicao` ou do ciclo `decisao_final`. Isso pede mais uma
  rodada de conserto e depois o `51-REVIEW-PORTAO-3`, antes do apply.
- **Mensagem no cliente**: «**Incluir**». A recusa do D-23 na rejeição direta mostra o motivo real, como a 48-15 já faz
  em `registrar_decisao`.
