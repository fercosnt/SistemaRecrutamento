---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-15T12:50:00Z
depth: deep
diff_base: c3e04a717c9338387160a7dc03d2e74e2f4133c7
reviewed_head: dab6fb4df4d7ffdacab185152e1d42058672a55a
scope: review adversarial bloqueante nº 3 do bloco D — rodada 3, o delta da «janela de vagas» 4e0f5acd..dab6fb4d (38 arquivos fora de .planning/, 5 commits de código), com o bloco D INALTERADO por diff; mesmo diff_base dos reviews 1 e 2; a pergunta única: algo do delta muda o que a 0004 apaga/recusa, o que o export cobre ou o que o Storage remove?
files_reviewed: 52
files_reviewed_list:
  - docs/specs/BANCO-SJT-V3-SDR.md
  - docs/specs/DRAFT-banco-sjt-marketing.md
  - docs/vagas/editor-video.md
  - docs/vagas/proveniencia/RUBRICA-editor-video.md
  - docs/vagas/proveniencia/RUBRICA-social-media-senior.md
  - docs/vagas/proveniencia/RUBRICA-videomaker-storymaker.md
  - docs/vagas/proveniencia/editor-video.payload.json
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas.payload.json
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/build-banco.py
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/build-payload.cjs
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/doc-template.md
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/gen-doc.cjs
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/gen-migration.cjs
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/novos-itens.md
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/novos.json
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/perguntas-antigas.json
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/pesos-antigos.json
  - docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/vaga-antiga-extraida.json
  - docs/vagas/proveniencia/social-media-senior.payload.json
  - docs/vagas/proveniencia/videomaker-storymaker.payload.json
  - docs/vagas/sdr-relacionamento-pre-vendas.md
  - docs/vagas/social-media-senior-marca-pessoal.md
  - docs/vagas/videomaker-storymaker.md
  - plugins/cadastro-de-vaga/skills/cadastro-de-vaga/SKILL.md
  - plugins/cadastro-de-vaga/skills/cadastro-de-vaga/references/avaliacoes.md
  - plugins/cadastro-de-vaga/skills/cadastro-de-vaga/references/mapa-de-visibilidade.md
  - plugins/cadastro-de-vaga/skills/cadastro-de-vaga/references/perguntas-etapa1.md
  - scripts/geradores/gen-104-sjt-pratico.py
  - scripts/geradores/gen-sjt-sdr-v3.py
  - supabase/functions/_shared/__tests__/sjt-rubrica.test.ts
  - supabase/functions/_shared/sjt-rubrica.ts
  - supabase/migrations/20261013000101_vaga_editor_video.sql
  - supabase/migrations/20261013000102_vaga_videomaker_storymaker.sql
  - supabase/migrations/20261013000103_vaga_social_media_senior.sql
  - supabase/migrations/20261013000104_sjt_pratico_e_mc3.sql
  - supabase/migrations/20261014000001_mc3_videomaker_encurtado.sql
  - supabase/migrations/20261014000101_vaga_sdr_relacionamento_pre_vendas.sql
  - supabase/migrations/20261014000102_sjt_sdr_v3.sql
  - supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql
  - scripts/p52_limpeza_portao.cjs
  - scripts/p52_export_limpeza.cjs
  - scripts/p52_remove_storage.cjs
  - scripts/p52_backup.cjs
  - scripts/p52_portao.cjs
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-PLAN.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-COMANDO-APPLY.sh
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-DECISAO.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-POPULACAO.json
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-STORAGE.json
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-19-DECISAO-ESCOPO.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-LIMPEZA-1.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-LIMPEZA-2.md
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: approved
---

# Phase 52 — bloco D (LIMPEZA-3): Code Review Report — a janela de vagas

**Reviewed:** 2026-10-15T12:50:00Z
**Depth:** deep
**Files Reviewed:** 52 (38 do delta + 14 do bloco D, lidos para medir o efeito do delta sobre eles)
**Status:** approved (critical 0; dois warnings a tratar no despacho, sem mudar código do bloco D)

## Summary

Postura: assumir que a janela de vagas quebrou alguma premissa do bloco D sem tocar nos arquivos dele. Por que este review existe: o portão recusou o apply de hoje com `CODIGO DO PIN != CODIGO REVISADO` — o LIMPEZA-2 leu `4e0f5acd`, o pin é `dab6fb4d`, e entre os dois há 5 commits de código fora de `.planning/` (`8a7a5dba`, `b97fb917`, `9b76244b`, `1581cf9a`, `a28a2522`; 38 arquivos, 9.031 inserções, 58 remoções). O portão fez o que deve: código novo exige revisão nova, mesmo quando o código novo não é do bloco D.

**Prova de que o bloco D está inalterado.** Rodei, em `dab6fb4d` = HEAD:

```
git diff --stat 4e0f5acd dab6fb4d -- supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql scripts/p52_*.cjs supabase/tests/p52_limpeza_pos_smoke.sql p46apply.cjs .planning/phases/52-hub-do-rh-dados-e-contato/52-21-COMANDO-APPLY.sh .planning/phases/52-hub-do-rh-dados-e-contato/52-21-PLAN.md
```

Saída vazia, código 0. E por md5: a 0004 é `1dcc6013…` em `4e0f5acd`, em `dab6fb4d` e na árvore de trabalho; o `52-21-COMANDO-APPLY.sh` é `605e80b8…` em `dab6fb4d` e na árvore — o mesmo `comando_md5_aprovado` da `52-21-DECISAO.md:19`. O delta restrito aos caminhos vigiados pelo portão (`scripts`, `supabase`, `p46apply.cjs`, `efdeploy.cjs`, `database.types.ts`, `src`, `e2e`, `docs/compliance`) é só `scripts/geradores/*.py` (2 arquivos novos), `supabase/functions/_shared/sjt-rubrica.ts` (+teste) e as 7 migrations novas. Nenhum `scripts/p52_*`, nenhum `supabase/tests/p52_*`. Para o código do bloco D valem, sem releitura, os vereditos `critical: 0` do LIMPEZA-1 e do LIMPEZA-2, com WR-05/WR-07 deferidos ao 52-22 e WR-08 a tratar no despacho.

**O que procurei, e não achei.** Nenhuma das 7 migrations tem `CREATE`, `ALTER`, `DROP`, FK, trigger, `EXECUTE` dinâmico ou chamada de RPC. São `INSERT` em `vagas`, `perguntas_formulario`, `pergunta_opcao_metadata`, `perguntas`, `perguntas_opcao_sjt` e `UPDATE perguntas SET status='retired'`, dentro de `DO` com PRE/POS próprios. Nenhuma toca `usuarios_rh`, `candidatos`, `candidaturas`, `historico_candidatura`, `auth.users` nem linha existente de `vagas` — a única referência a `candidaturas` (`…104:131`) é um `SELECT count(*)` informativo no PRE. As 4 vagas novas não casam o padrão de vaga de teste. `sjt-rubrica.ts` tem zero imports por contrato, nenhum SQL, nenhuma rede. Geradores, docs e plugin não são lidos por nenhum script p52 nem pelo comando. Nenhuma credencial, chave, telefone, CPF ou nome de candidato no delta.

**O que a janela mudou de fato — e já está absorvido.** O STATE em `dab6fb4d` e a `52-21-DECISAO.md` (re-aprovação de 2026-10-15 09:37 -03) registram: a conta `+cand1` (`dd1ba030`, já na população) criou 3 candidaturas com 3 currículos nas 3 vagas novas; o primeiro candidato real (`920ac182`, candidatura `3590d2a5`) caiu em `fora_da_populacao`. A população ficou com o mesmo `populacao_md5` `1b4b21a9…` (6/2/14/16, 30 `user_id`); as candidaturas da população foram de 32 a 35; o Storage de 24 a 27 (`d80d26f2…`); o export anterior foi recusado pelo `--conferir --vivo` e substituído pelo `63b60ef7…` (`20261015T005904Z`), conferido `vivo=igual`. Ou seja: o mecanismo que o LIMPEZA-1/2 aprovou detectou a mudança do vivo e forçou nova medição, novo export e nova decisão — é a prova de que ele morde.

**Auto-testes locais (sem rede, sem PROD), nesta sessão:** `p52_limpeza_portao` 44/44 · `p52_remove_storage` 19/19 · `p52_backup` 29/29 · `p52_export_limpeza` 49/49 · `p52_portao` 68/68.

## Os itens da instrução, um a um

1. **As 7 migrations novas — OK; nada altera o grafo, a trava, as vagas-alvo ou os padrões.**
   - **DDL:** varri por forma (`^\s*(create|alter|drop|grant|revoke|truncate|execute|perform)`) os 7 arquivos: zero ocorrências. O catálogo de FK e de triggers que o PRE (fk) `0004:224-251`, (imutavel) `:253-259` e (triggers) `:260-270` lê, e que o export fotografa em `fk_md5`, não mudou por estes arquivos. Prova independente: o `--conferir --vivo` do disparo das 04:07 BRT saiu `vivo=igual` (compara `fk_md5` do manifesto com o catálogo de agora, `p52_export_limpeza.cjs:814`), DEPOIS do apply das `…101/102` (~03:06Z).
   - **Tabelas tocadas:** `vagas` (INSERT de 1 linha nova por arquivo em `…0101:89`, `…0102:64`, `…0103:63`, `…0101(14):72`), `perguntas_formulario`, `pergunta_opcao_metadata`, `perguntas`, `perguntas_opcao_sjt`. Nenhuma é filha de `candidatos`/`candidaturas`/`historico_candidatura`/`auth.users` por FK NO ACTION — logo nenhuma entra no fecho do export nem nos passos de DELETE da 0004. A 0004 não toca `perguntas*`.
   - **`usuarios_rh`:** só `SELECT user_id … WHERE email = <RH> AND ativo AND deleted_at IS NULL` para resolver o autor (`…0101:57-62` e equivalentes). Sem escrita. A trava (`0004:172`, `:308-313`) não muda por estes arquivos.
   - **`created_by`/`updated_by` das vagas e perguntas novas:** apontam para o autor RH. Não encontrei FK `vagas.created_by` em `database.types.ts` (as duas `*_created_by_fkey → usuarios_rh` são de `biblioteca_perguntas` e `questoes_bigfive`). Nos três casos possíveis (sem FK; FK → `usuarios_rh`; FK → `auth.users`), o resultado é o mesmo: o autor está em `usuarios_rh`, fora da população, e o laço `(auth_ref)` `0004:447-460` só conta referências a `v_apagar`.
   - **`vagas.slug/titulo/status/deleted_at`:** só INSERT, com `status='rascunho'`; nenhum UPDATE em vaga existente. As 8 vagas-alvo do `deleted_at` (`0004:302-304`) e a `cb413d5d` não são tocadas. `n_vagas_teste` continua 9 no `52-21-POPULACAO.json:219`, igual ao 52-19.
   - **Padrões de e-mail:** nenhum arquivo do delta toca `PADROES_D30`/`SEMENTE_P47` (`scripts/p52_limpeza_portao.cjs:61-69`) nem a lista copiada em `0004:173-179`. O `padroes_md5` `fa46cb9e…` segue o da `52-19-DECISAO-ESCOPO.md`.
   - **Triggers:** nenhum `CREATE TRIGGER`. O (triggers) da 0004 continua a recusar qualquer trigger de DELETE em `public`/`auth` fora dos dois conhecidos.

2. **As vagas novas — OK; fora do padrão de teste, com a candidatura real intacta.**
   - Slugs e títulos lidos dos INSERTs: `editor-video` / «Editor(a) de Vídeo» (`…0101:89-105`); `videomaker-storymaker` / «Videomaker / Storymaker» (`…0102:64-79`); `social-media-senior-marca-pessoal` / «Social Media Sênior» (`…0103:63-78`); `sdr-relacionamento-pre-vendas` / «Consultor(a) de Relacionamento e Pré-vendas» (`…0101(14):72-87`). Nenhum `titulo ILIKE '%[TESTE%'`, nenhum `slug ILIKE 'teste-%'` (`0004:185`, `:303`; `SQL_VARREDURA` `vaga_teste`). A entrada (ii) da varredura não as alcança.
   - Medido e commitado em `52-21-POPULACAO.json:265-290` (`medido_em` 2026-10-15T00:56:49Z): `71052ef1` (`social-media-senior-marca-pessoal`) `teste:false`, 2 candidaturas, 1 da população; `7baef6ff` (`editor-video`) 1/1; `f45c026d` (`videomaker-storymaker`) 1/1. A candidatura `3590d2a5` do candidato `920ac182` está em `candidaturas_ativas_fora_da_populacao` (`:334-340`) e `920ac182` em `fora_da_populacao` (`:65-70`, n=1).
   - **Por que a 0004 a deixa intacta, por construção:** `v_ids` são só os 38 das 4 categorias (`:202-206`); `v_kids` são as candidaturas desses ids (`:375`); `920ac182` entra em `v_fp_nao_alvo` como `c:` e `3590d2a5` como `k:` (`:321-323`), e o POS (nao_alvo) `:563-573` recusa a transação inteira se qualquer octeto dessas linhas mudar. As 3 candidaturas da `+cand1` nas vagas novas SAEM — é a categoria `contas_teste_com_candidatura` («as candidaturas delas, em qualquer vaga, inclusive as ativas», `0004:24-26`), e os 3 currículos estão nos 27 do `52-21-STORAGE.json` (prefixo `dd1ba030`) e no export `63b60ef7…`.
   - Aritmética do `52-21-POPULACAO.json`: `candidaturas_total` 48 = 35 (população) + 3 (trava `d8ef9db1`) + 9 (fixtures) + 1 (`3590d2a5`, fora). Fecha. Nenhuma candidatura fica sem dono de categoria.
   - **Nenhuma vaga nova é `remover`/`deleted_at`:** `v_remover_ids8 = '{}'` (`:149`) e `v_vagas` exige padrão de teste (`:303`). As vagas novas entram no `v:` do não-alvo e são protegidas pelo POS.
   - A SDR (`sdr-relacionamento-pre-vendas`) nasce `rascunho` e não aparece em `vagas_ativas` na medição de 00:56Z. Se tiver sido publicada depois e um candidato real se inscrever antes do apply, a linha nova entra no não-alvo no PRE da própria execução — nada a fazer. Se uma conta DE TESTE se inscrever, o `populacao_md5` não muda mas o `--conferir --vivo` recusa (`EXPORT DIFERE DO VIVO: linhas`) e o comando para antes do `migrate` — o mesmo caminho que já aconteceu na noite de 14/10.

3. **`sjt-rubrica.ts` — OK; não interage com o bloco D.** Zero `import` (contrato com portão próprio no teste `:83-85`); só `export interface/const/function` (`:121`, `:152`, `:164`, `:176`, `:457`, `:464`, `:491`, `:599`). Nenhum SQL, `fetch`, `Deno.env`, `process.env`. Único consumidor: `supabase/functions/avaliar-redacao/index.ts:69`. Não está deployado (STATE: «sem push, sem deploy») e, deployado, só muda o bloco de rubrica no prompt do caso aberto — fora do bloco D. O teste cresceu 59 linhas (catálogo das 8 dimensões SDR); não o rodei (deno fora do escopo deste review; STATE registra 15/15).

4. **Geradores, docs, plugins — OK; nada roda no apply nem é lido pelos scripts p52.** `grep` por `geradores`/`.py` em `scripts/p52_*.cjs`, `p46apply.cjs` e no `52-21-COMANDO-APPLY.sh`: a única ocorrência é `scripts/p52_mutacoes.cjs:192` (`pontuar_sjt_vivo.plpgsql`, do 52-18, fora do delta e fora do comando). Os geradores (`gen-104-sjt-pratico.py`, `gen-sjt-sdr-v3.py`, `build-banco.py`, `gen-doc.cjs`, `gen-migration.cjs`, `build-payload.cjs`) só leem/escrevem arquivos locais: nenhum `requests`/`psycopg`/`supabase`/`os.environ`/`subprocess`. O `gen-104` reescreve `supabase/migrations/20261013000104_…` no lugar (`:32`, `:581`) — ver IN-16. O `SKILL.md` do plugin não instrui `supabase db push` nem `apply_migration`; as únicas menções a apply no delta são o comentário «não um INSERT no SQL Editor» (`…0101(14):6`) e dois `node p46apply.cjs` (um `sql` de leitura em `references/avaliacoes.md`; um `migrate` no cabeçalho gerado, IN-16). A regra (7) do portão (árvore limpa nos VIGIADOS) segue valendo: `git status --porcelain` nos caminhos vigiados saiu vazio agora.

5. **Privacidade (LGPD / JORN-63) — OK.** Nas linhas adicionadas do delta: nenhum `sbp_`, JWT (`eyJ…`), `service_role`, `password`/`senha`/`secret`/`api_key`, `postgres://`, chave PEM. Um único e-mail, o corporativo do autor RH, 13 vezes, nos `SELECT … usuarios_rh WHERE email =` e nos docs — convenção já usada por 5 migrations de 2026-08 (`git grep` em `4e0f5acd`), e não casa nenhum padrão de teste (`test+%@`, `uat-form-%@`, `paulista@` exigem outro local-part). Nenhum telefone, CPF, nome de candidato, nome de arquivo de currículo. Um uuid (`4fceff36…`, `created_by` do autor RH, em `docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/vaga-antiga-extraida.json:64`): não está no `52-21-POPULACAO.json`, no `52-21-STORAGE.json` nem na DECISAO — IN-18. O nome do cirurgião-dentista dono da clínica aparece no `subtitulo` da vaga de Social Media: é anúncio público, não dado de candidato.

## Prova de que o pipeline segue íntegro em `dab6fb4d`

- `52-21-COMANDO-APPLY.sh`: `605e80b8…` na árvore = em `dab6fb4d` = `comando_md5_aprovado` (`DECISAO:19`). O passo (0b) vai escolher ESTE review (maior N = 3), ler `reviewed_head` `dab6fb4d` e exigir `git show dab6fb4d:…COMANDO-APPLY.sh | md5` = `605e80b8…` — bate.
- `52-21-DECISAO.md` (último commit `dab6fb4d`), `52-21-POPULACAO.json` e `52-21-STORAGE.json` (último commit `e52ee00b`): rastreados, iguais a HEAD, ancestrais do pin atual. A DECISAO tem `decisao: apagar`, `populacao_md5_aprovado` = `1b4b21a9…` = constante `0004:145`, `aprovado_ficticios/tombstones/contas_teste_com_candidatura/contas_sem_candidatura` = 6/2/14/16 = `apagaveis` do POPULACAO, `storage_n_aprovado` 27 / `storage_md5_aprovado` `d80d26f2…` = STORAGE, `export_md5_aprovado` `63b60ef7…` / `export_em_aprovado` 2026-10-15T00:59:04.871Z, `comando_md5_aprovado`, `janela_unica: confirmada`, `aprovado_em`, `janela_apply`.
- `diff_base` `c3e04a71…` é ancestral de `refs/gsd/52/base` (`0d70ac7d`): regra (3) OK. `52-21-PLAN.md` não mudou entre `4e0f5acd` e `dab6fb4d`: regra (6) OK.
- 7 migrations `_p52_` na árvore do pin (`…0001`..`…0007`); a regra (8) do modo deploy (Comando dos currículos) só olha `_p52_` — as 7 migrations da janela não entram nela nem precisam.

## Critical

Nenhum.

## Warnings

### WR-09: o comentário da `20261014000101` descreve como «histórico a preservar» as 10 candidaturas que o bloco D vai apagar

**Onde:** `supabase/migrations/20261014000101_vaga_sdr_relacionamento_pre_vendas.sql:14-17` («aquela vaga tem 10 candidaturas de uma rodada encerrada. Reabri-la poria candidatos antigos e novos no mesmo ranking … Ela fica intacta, com o historico»); `52-19-DECISAO-ESCOPO.md` §Extras («`fdbe1a4a` (Consultor) … limpa só as candidaturas da população nelas (10 e 13 candidaturas medidas, todas na população)»); `52-21-POPULACAO.json:258-263` (`fdbe1a4a` = `consultor-relacionamento-pre-vendas`, `inativa`).

**O que:** a vaga antiga de SDR é a `fdbe1a4a`. As 10 candidaturas dela estão TODAS na população (entraram pela entrada (i), por e-mail de teste — a vaga não é vaga de teste; e a aritmética 48 = 35 + 3 + 9 + 1 não deixa candidatura sem categoria). O apply da 0004 as apaga; a linha da vaga fica (correto: `fdbe1a4a` não casa padrão de teste, está no `v:` do não-alvo). O comentário da migration — escrito em 14/10, um dia depois da decisão de 13/10 — trata essas 10 como uma rodada real cujo ranking não se quer misturar. As duas premissas não podem ser verdadeiras ao mesmo tempo. Se as 10 são de teste (o que os padrões de e-mail dizem), a decisão de criar vaga nova foi inócua e o comentário só envelhece mal. Se o operador as considera uma rodada real, a decisão `apagar` de 13/10 (re-aprovada em 15/10) foi tomada com uma premissa errada — e é isso que precisa ser descartado por escrito antes do apply.

**Por que não é crítico:** o operador decidiu duas vezes com os números na frente (`52-19`, item (5) do verbatim; `52-21-DECISAO.md`, re-aprovação de 15/10), as 10 casam padrões de e-mail que só contas internas/de teste têm, e as linhas estão no export `63b60ef7…` (restauração cirúrgica possível). O código do bloco D está correto para o escopo decidido.

**Conserto proposto (sem mudar código):** uma linha do operador, verbatim, no SUMMARY do 52-21 ou na DECISAO, antes do apply: «as 10 candidaturas da `fdbe1a4a` são da população de teste; o comentário da `20261014000101:14-17` sobre “histórico” não se refere a candidatos reais». Não corrigir o arquivo da migration: ele já está no ledger de PROD com `statements[1]` literal (CLAUDE.md: a correção vive na documentação, não no arquivo).

### WR-10: depois do commit deste review, o pin `refs/gsd/52-21/sha` tem de ser movido — e o plano só cria o pin, não o move

**Onde:** `scripts/p52_portao.cjs` regra (4) («`apply`: HEAD = pin»), cabeçalho `:43-44` e código do modo apply; `52-21-PLAN.md:256` (Passo 0: `git rev-parse --verify -q refs/gsd/52-21/sha || git update-ref refs/gsd/52-21/sha HEAD ""` — só cria se ausente); `52-21-COMANDO-APPLY.sh` passo (0b) (lê a revisão de maior N em HEAD).

**O que:** a regra (1) exige este arquivo commitado em HEAD, e a regra (4) exige HEAD = pin no modo apply. O pin hoje é `dab6fb4d`. Commitar o LIMPEZA-3 move HEAD; o pin fica para trás; o portão recusa (`HEAD != pin`, fail-closed). O Passo 0 do plano não cobre o caso «pin existe e precisa avançar» — e o plano está protegido pela regra (6), então não pode ser editado sem um LIMPEZA-4. Mesma família do WR-08 (plano atrasado em relação ao mecanismo).

**Por que não é crítico:** a falha é uma recusa, nunca um apply errado. E mover o pin para o commit deste review preserva todas as outras regras: (5) `reviewed_head` `dab6fb4d` ancestral do pin novo com `git diff --quiet dab6fb4d <pin> -- . ':!.planning'` vazio (só `.planning/` muda); (0) DECISAO/STORAGE/POPULACAO commitados antes do pin; (0b) o md5 do comando em `dab6fb4d` = `605e80b8…`.

**Conserto proposto (despacho, sem mudar código):** depois de `git commit` só deste arquivo (`docs(52-21): review bloqueante nº 3 — 52-REVIEW-LIMPEZA-3`), avançar o pin com guarda do valor antigo: `git update-ref refs/gsd/52-21/sha HEAD dab6fb4df4d7ffdacab185152e1d42058672a55a`. Nenhum outro commit entre esse e o apply (qualquer commit de `.planning/` depois exige mover o pin de novo). Registrar no SUMMARY o sha novo do pin e o antigo. Conferir antes do comando: `node scripts/p52_portao.cjs --revisao $P/52-REVIEW-LIMPEZA --base refs/gsd/52-18/sha --pin refs/gsd/52-21/sha --plano $P/52-21-PLAN.md --modo apply` → `PORTAO OK … reviewed_head=dab6fb4d…`.

## Info

### IN-15: a condição (1) da D-41 é cega a migrations que não sejam `p52_%` — hoje está satisfeita pelos instantes registrados, mas só por eles
**Onde:** `scripts/p52_backup.cjs:18`, `:69` (`where name like 'p52\_%'`), `:157`; `52-APLICACOES.json` (7 entradas, todas `p52_`). **O que:** as 7 migrations da janela (`…0101..104`, `…0001`, `…0101/0102`) foram aplicadas em PROD fora desse filtro — as duas últimas ~03:06Z de 15/10 (STATE em `dab6fb4d`). O backup diário `2026-10-15T06:26:10Z` (`DECISAO:26`) é posterior a todas, então uma restauração de banco inteiro não as perderia. Mas o portão não mediu isso; o STATE mediu. **Conserto:** nenhum agora. Nenhum apply (de qualquer prefixo) entre o backup de 06:26Z e o `migrate` da 0004; registrar no SUMMARY os instantes das `…0101/0102` como conferência manual da condição (1). Para o 52-22: ampliar o filtro para toda `version` do ledger, ou registrar a limitação no `52-SECURITY.md`.

### IN-16: o `gen-104` reescreve no lugar uma migration já no ledger e carimba nela um caminho que não existe mais
**Onde:** `scripts/geradores/gen-104-sjt-pratico.py:26` («movido de docs/vagas/migrations em 2026-10-14»), `:32` (`SAIDA = supabase/migrations/…104_sjt_pratico_e_mc3.sql`), `:273` e `:289` (escrevem `docs/vagas/migrations/…` no cabeçalho); `supabase/migrations/20261013000104_sjt_pratico_e_mc3.sql:45` (`-- APLICAR COM … node p46apply.cjs migrate docs/vagas/migrations/20261013000104_…`). **O que:** o arquivo aplicado em PROD manda aplicá-lo por um caminho que não existe. Inofensivo para o bloco D: `p46apply.cjs migrate` com caminho inexistente falha antes de qualquer rede. Rodar o gerador de novo reescreve um arquivo já no ledger — a regra (7) recusa a árvore suja (fail-closed); se alguém commitar a reescrita, o arquivo diverge do `statements[1]` de PROD sem portão (a regra (8) só vigia `_p52_`). **Conserto:** fora do bloco D; no gerador, trocar as duas strings para `supabase/migrations/` e NÃO regerar o `…104` (o md5 no ledger é a prova de proveniência dele).

### IN-17: arquivos não rastreados de teste em `docs/vagas/` — fora do delta, fora dos VIGIADOS, dado sintético
**Onde:** `docs/vagas/ROTEIRO-TESTE-cand1.md` e `docs/vagas/curriculo-cand1-teste-vaga-nova.pdf` (ambos `??` no `git status`, datados de 14/10 00:27–00:34 -03). **O que:** o roteiro documenta a inscrição da conta `+cand1` nas 3 vagas novas com um currículo sintético (nome, e-mail `@exemplo.com` e telefone fictícios) — são as 3 candidaturas/3 currículos que a re-medição de 00:56Z absorveu. Não estão em `docs/compliance` nem em outro VIGIADO, então não recusam o portão. O próprio roteiro diz «apague depois». **Conserto:** não commitar; apagar depois do apply. Confirma a regra já registrada: nenhuma conta da população entra no app até o `migrate`.

### IN-18: identificadores de pessoal interno no delta — sem ação, registrado
**Onde:** o e-mail corporativo do autor RH (13 ocorrências, migrations e docs); o uuid `4fceff36…` em `docs/vagas/proveniencia/sdr-relacionamento-pre-vendas/vaga-antiga-extraida.json:64`. **O que:** não são candidatos, não casam padrão de teste, não estão na população nem nos prefixos do Storage. O uuid é `created_by` de uma vaga, extraído do banco para proveniência. **Conserto:** nenhum. Se o `vaga-antiga-extraida.json` for considerado dado interno demais para o repositório, é decisão fora do bloco D.

### IN-19: três vagas ativas novas aumentam a chance de uma recusa benigna no POS — não é defeito
**Onde:** `0004:126-128` (cabeçalho §3: READ COMMITTED; linha do não-alvo que mude entre PRE e POS → POS recusa, nada persiste, repetir o comando); `:321-327`, `:563-573`. **O que:** antes da janela, as vagas ativas com candidatura eram só as da população. Agora há 3 vagas ativas recebendo candidaturas reais (`71052ef1` já tem uma). Uma inscrição real nos segundos entre o PRE e o POS muda o `v_fp_nao_alvo` (`k:` nova) e o POS (nao_alvo) aborta a transação. É o comportamento desejado. **Conserto:** nenhum. Para o executor: `P52D POS-PORTAO (nao_alvo)` com os dois números de `antes %, depois %` diferindo por +1 em `k:` é concorrência, não defeito — repetir o MESMO comando, sem nova decisão, como o plano já diz para `55P03`/`57014`.

## O que NÃO foi coberto

- Nada rodado contra PROD, nem leitura: o catálogo vivo (FK/triggers) não foi remedido por mim. A prova de que ele não mudou vem de (a) a ausência de DDL nos 7 arquivos, (b) `EXPORT CONFERIDO … vivo=igual` do disparo das 04:07 BRT (conferência de `fk_md5`), (c) o PRE (fk)/(triggers) da própria 0004, que recusa no apply se algo estiver diferente.
- Os ~3.500 linhas de `docs/vagas/*.md` e `docs/specs/*.md` foram varridas por padrão (segredos, e-mails, telefones, CPF, padrões de teste, instruções de apply), não lidas linha a linha. O conteúdo semântico de rubricas, SJT e anúncios está fora do bloco D.
- `deno test` do `sjt-rubrica.test.ts` não foi rodado; o `vitest`/`node --test` dos scripts p52 não foram re-rodados (só os `--auto-teste`, 209 casos no total).
- O ensaio da 0004 (`p52_ensaio.cjs`) não foi rodado (proibido a este review); a evidência mais recente é a do STATE em `dab6fb4d` (`ensaio candidatos=38 candidaturas=35 auth=30`, depois das vagas novas).

## Veredito

**critical: 0 — `approved`.** O delta da janela de vagas é aditivo, sem DDL, sem FK, sem trigger, sem toque em `usuarios_rh`, nas tabelas-alvo, nas vagas de teste ou nos padrões. Nada nele muda o que a 0004 apaga (`v_ids` pela mesma varredura, `populacao_md5` `1b4b21a9…` amarrado em `:145`), o que ela recusa (PRE/POS intactos), o que o export cobre (fecho por `pg_constraint`, `fk_md5` conferido `vivo=igual`) ou o que o Storage remove (27 objetos, `d80d26f2…`, 16 prefixos todos da população). A única candidatura real medida (`3590d2a5`/`920ac182`) está no não-alvo por construção e protegida pelo POS. O que a janela mudou no vivo — 3 candidaturas e 3 currículos da `+cand1` — foi detectado pelo `--conferir --vivo`, re-medido, re-exportado e re-aprovado, e é por isso que os números de hoje são 35/27 e não 32/24.

Antes do apply, nesta ordem:
1. commit SÓ deste arquivo;
2. avançar o pin com guarda (WR-10): `git update-ref refs/gsd/52-21/sha HEAD dab6fb4df4d7ffdacab185152e1d42058672a55a`;
3. a linha do operador sobre as 10 candidaturas da `fdbe1a4a` (WR-09) no SUMMARY, verbatim;
4. `p52_portao.cjs … --modo apply` → `PORTAO OK`; então `bash 52-21-COMANDO-APPLY.sh` dentro da `janela_apply` (até 12:00 BRT de hoje), sem nenhum outro apply, de qualquer prefixo, entre o backup de 06:26Z e o `migrate` (IN-15);
5. despacho da Task 3 com o WR-08 (LIMPEZA-2) e o IN-19 em mãos: `REMOCAO TOCOU FORA DA LISTA`/`REMOCAO INCOMPLETA` = PARAR; `POS-PORTAO (nao_alvo)` por +1 candidatura = repetir o mesmo comando.

---

_Reviewed: 2026-10-15T12:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
