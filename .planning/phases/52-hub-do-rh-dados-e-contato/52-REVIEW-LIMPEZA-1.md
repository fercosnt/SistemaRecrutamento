---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-13T12:37:16Z
depth: deep
diff_base: c3e04a717c9338387160a7dc03d2e74e2f4133c7
reviewed_head: f529c56f6b79afe91948b45963e80b543b9653f8
scope: review adversarial bloqueante nº 1 do bloco D (52-19, 52-20, 52-27, 52-21 Task 1), que decide o apply destrutivo da 20261011000004 e a remoção dos currículos; escopo = refs/gsd/52-18/sha..HEAD -- . ':!.planning' + 52-21-PLAN.md + 52-21-COMANDO-APPLY.sh + 52-22-PLAN.md; não-foco já coberto por 52-REVIEW-GAP-1/2, G7-1, G7B-1/2, UAT-1/2
files_reviewed: 21
files_reviewed_list:
  - supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql
  - supabase/tests/p52_limpeza_pos_smoke.sql
  - supabase/tests/p52_populacao_limpeza.sql
  - scripts/p52_limpeza_portao.cjs
  - scripts/p52_backup.cjs
  - scripts/p52_export_limpeza.cjs
  - scripts/__tests__/p52_export_limpeza.test.cjs
  - scripts/p52_remove_storage.cjs
  - scripts/__tests__/p52_remove_storage.test.cjs
  - scripts/p52_mutacoes.cjs
  - scripts/p52_ensaio.cjs
  - scripts/p52_portao.cjs
  - p46apply.cjs
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-PLAN.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-COMANDO-APPLY.sh
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-22-PLAN.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-19-DECISAO-ESCOPO.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-POPULACAO.json
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-STORAGE.json
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-21-EXPORT.md
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-20-SUMMARY.md
findings:
  critical: 0
  warning: 7
  info: 9
  total: 16
status: changes_required
---

# Phase 52 — bloco D (LIMPEZA-1): Code Review Report

**Reviewed:** 2026-10-13T12:37:16Z
**Depth:** deep
**Files Reviewed:** 21
**Status:** changes_required (nenhum crítico pela definição do portão; mas o comando, como está, **recusa no passo (ii) em 100% das execuções** — ver WR-01)

## Summary

Postura: assumir defeito. Tentei quebrar, nesta ordem, (a) a trava do RH e a partição da população, (b) o grafo de FK e a ordem dos DELETE, (c) o desligamento do trigger de `historico_acoes`, (d) as impressões digitais e o md5 canônico, (e) o encadeamento do comando e o que ele realmente compara, (f) as condições da D-41 emendada (backup, export, janela), (g) o removedor de Storage e a ordem banco → Storage, e (h) a capacidade real de voltar atrás.

**O que segurou.** A migration é correta e fail-closed no que apaga. Comparei por máquina as CTEs da população no script, na migration e no smoke: são idênticas, com `NOT EXISTS` nas duas entradas. Li o grafo de FK em PROD (só leitura): o conjunto tratado pelo PRE é exatamente o que existe hoje, e nenhuma FK de outro esquema aponta para as tabelas-alvo. A dupla guarda de `auth.users` está na migration e no export. A trava, as fixtures e o não-alvo têm impressão digital de linha inteira capturada na própria execução, e qualquer divergência aborta a transação inteira. O export é o espelho do que a migration apaga, anula ou atualiza: 778 linhas, 31 tabelas, md5 do manifesto `0ea5ffb9…` conferido no disco, diretório 0700, arquivos 0600, fora de qualquer árvore git. O removedor só lista e remove os prefixos aprovados, guarda a chave só em memória e não imprime nome de arquivo. O passo (0) do comando simulei num repositório de rascunho, com `node` substituído: passa quando tudo está certo e recusa nos casos cópia fora do repo, DECISAO modificada, DECISAO commitada depois do pin e execução de subdiretório. Uma recusa no meio impede o `migrate`. O verificador da cadeia do plano sai `CADEIA CONDICOES-MIGRATE OK` (23 mutações mordem, 2 formas legítimas passam). Auto-testes: backup 29/29, limpeza 40/40, export 49/49, remoção 16/16, portão 68/68, `node --test` nos dois arquivos 26/26.

**O que não segurou.**
1. O `comparar`, elo (ii), recusa sempre com as entradas reais, por **dois** defeitos independentes. Provei por execução. É fail-closed (nada é escrito), mas sem conserto o apply de amanhã não acontece (WR-01). O auto-teste não morde nem isso nem a remoção da própria checagem de md5 (WR-02).
2. No instante da escrita, a migration não está amarrada à população nem às vagas aprovadas. A amarração vem só do `comparar`, segundos antes. A evidência da migration nem aparece num apply real (WR-03).
3. O md5 de comando que o operador aprova não está amarrado por máquina à versão que este review leu (WR-04).
4. A restauração cirúrgica nunca foi ensaiada e tem armadilhas concretas medidas no catálogo (WR-05).
5. A prova depois do Storage compara com uma constante e pode reprovar uma remoção correta (WR-06).
6. O 52-22 deixa cair itens de backlog decididos pelo operador (WR-07).

**As duas decisões do 52-20, em palavras simples para o operador:**

- **`historico_acoes` (auditoria imutável).** A tabela de auditoria tem um trigger que proíbe qualquer DELETE, inclusive o que vem em cascata da candidatura. Para apagar as 8 linhas de auditoria de **uma** candidatura de teste (`f8318f39`), a migration desliga **só** esse trigger por uma instrução, apaga só essas linhas e religa o trigger na instrução seguinte, tudo dentro da mesma transação. Nenhuma outra sessão vê o trigger desligado. Se qualquer coisa falhar, tudo volta, inclusive o trigger (o desligar fica num sub-bloco que é desfeito junto com o erro). O POS exige o trigger religado antes do commit. **Meu julgamento:** a forma está correta e é a mais estreita possível. `session_replication_role = replica` seria pior, porque desligaria também os triggers internos de FK que fazem a cascata. O que você aprova ao dizer «apagar»: somem 8 linhas de auditoria imutável de uma candidatura de teste (elas estão no export).
- **`candidate_ai_decisions` e as colunas de ator.** Há 1 linha cuja FK diz «anular» numa coluna que não aceita nulo. Ela não pode sobreviver ao candidato, então a migration a apaga explicitamente (está no export). As colunas de «quem fez» do RH (`created_by`/`updated_by`, `historico_candidatura.ator`, `decisao_final.por_usuario`, `redacoes_candidato.revisada_por`, `sessoes_ativas.revogado_por`) são tratadas por conferência: se alguma linha que fica apontar para uma conta a apagar, a migration para inteira, sem apagar nada. As 64 linhas de `ai_call_logs` ficam, com `candidato_id` nulo. O estado anterior delas está no export.

**O que tem de mudar antes do OK do Task 2:** consertar WR-01 e WR-02 em `scripts/p52_limpeza_portao.cjs`. Isso é código depois deste `reviewed_head`, então pela regra (5) do portão é obrigatório um `52-REVIEW-LIMPEZA-2`. Só depois disso criar o pin `refs/gsd/52-21/sha`. WR-03, WR-04 e WR-06 são consertos baratos que cabem na mesma rodada. WR-05 e WR-07 podem ser pendência nomeada com dono.

Registro para conferência humana (WR-04): **`comando_md5_revisado: 99b8c90e4b34cd92a05cd0b768a32cad`** (`md5 -q 52-21-COMANDO-APPLY.sh` no `reviewed_head` `f529c56f`).

## Os pontos da instrução, um a um

1. **A trava do RH — OK.** `NOT EXISTS` aparece nas duas entradas: migration :174-182, `SQL_VARREDURA` :111-120 e smoke :77-85. Nenhum `NOT IN` no script (auto-teste :681) nem na migration. O `NOT IN` do `p52_populacao_limpeza.sql` :85/:94 é a sonda de igualdade da cláusula (c), de propósito. Comparação normalizada por máquina: as CTEs `rh…cls` são idênticas no script, na migration e no smoke (só diferem colunas projetadas em `vaga_teste`, sem efeito na pertença). O PRE recomputa a população, sem lista de ids. A fonte de papel do JWT (`custom_access_token_hook`) é só `usuarios_rh`, então a trava por `usuarios_rh` (qualquer linha, ativa ou não) é superconjunto. As 30 contas da população não têm `role` em `raw_app_meta_data`/`raw_user_meta_data` (medido). D1 morde na cláusula exata (`P52D POS-PORTAO (trava)`, 52-20-SUMMARY:166). A impressão da trava lê `usuarios_rh` direto (:298-303), independente da CTE mutada.
2. **Grafo de FK lido na execução — OK.** PRE (fk) :215-241, por forma: `confdeltype IN ('a','r')`, mais `SET NULL/DEFAULT` sobre `NOT NULL` ou com várias colunas, para as quatro tabelas-mãe, em qualquer esquema. Medido em PROD (só leitura): `revisao_rejeicao`, `retencao_hold`, `decisao_final(_historico)` e `historico_candidatura` são `a` → DELETE explícito. `historico_candidatura ← revisao_rejeicao.historico_rejeicao_id` é `a` → `revisao_rejeicao` primeiro. `solicitacoes_dados` é `a`. `candidate_ai_decisions.candidato_id` é `n` NOT NULL → DELETE explícito. As colunas de ator para `auth.users` (`created_by/updated_by` em 8 tabelas, `ator`, `por_usuario` NN, `revisada_por`, `revogado_por`) são `a` → conferência :437-450. Anuláveis `n` (`ai_call_logs`, `recruiter_alerts`, `logs_acesso`, `autorizacoes.user_id`, `decisao_final.revisao_por_usuario`, `candidatos.user_id`) e `auth.scim_users.user_id` (0 linhas; só contado no export). Não há FK de `storage`/outros esquemas para as tabelas-alvo. A checagem «(filhos)» do LIMPA :381-391/:409-420 relê o catálogo e exige um passo por filho. D2 morde.
3. **Ordem dos DELETE — OK.** Ordem em :369-424: filhos NO ACTION, depois `historico_acoes`, depois `candidaturas` (o resto vai por CASCADE), depois `solicitacoes_dados` e `candidate_ai_decisions`, depois `candidatos`. Em seguida, `auth.users` só de `v_users` com dupla guarda, recomputada em :432-435 e repetida no próprio DELETE :451-454. Por fim, `UPDATE vagas SET deleted_at` :459. `GET DIAGNOSTICS` em cada passo. Nenhuma vaga removida: `v_remover_ids8 = '{}'` (:143), POS (vagas) :582-587 e evidência `vagas_removidas=0`.
4. **Trigger de `historico_acoes` — OK (decisão D5, aprovação explícita do operador).** O DISABLE/ENABLE (:395-398) fica dentro do sub-bloco `BEGIN … EXCEPTION` (:367-429). Erro em qualquer instrução desfaz a subtransação, inclusive o DISABLE, e o handler relança: abortam a requisição e o ledger juntos. O ENABLE vem logo depois do DELETE, sem caminho de commit entre os dois. O PRE (imutavel) :244-249 exige exatamente esse trigger, `tgenabled='O'`, bit DELETE e a função conhecida. PRE (triggers) :251-260 recusa outro trigger de DELETE em public/auth. Medido: só existem `prevent_delete_historico_acoes` e `trg_usuarios_rh_anti_lockout`. O POS (imutavel) :572-579 exige o trigger religado e `apagadas_ha = ha_alvo`. O DELETE é `candidatura_id = ANY (v_kids)`. Não há outra FK para `historico_acoes` (0 medida) e a coluna é NOT NULL, então não alcança outras candidaturas; o não-alvo inclui `h:` fora das candidaturas-alvo. A forma `ALTER TABLE … DISABLE TRIGGER` é a certa, pelo motivo dito no Summary. Efeitos colaterais em IN-01.
5. **Impressões digitais — OK.** `md5(to_jsonb(linha))` com baseline desta execução para trava, fixtures e não-alvo (:298-317). As expressões do POS são as mesmas (:530-563). O resíduo é zero por categoria (:498-517), e a população vazia recusa no PRE (:205-207). A população examinada sai na prova depois (`medir --pos`, `examinados_total`).
6. **md5 canônico — parcialmente OK.** `populacao_md5` usa a mesma forma nos dois lados: ids distintos, `COLLATE "C"` / `sort()` sobre ASCII, junção por vírgula (migration :211; script :275). O 52-21-POPULACAO dá `1b4b21a9…`, o mesmo da evidência do ensaio. **Mas `vagas_md5` não é comparado por ninguém.** Conferi que `22cc6263…` é o md5 dos 8 prefixos decididos, mas nenhum script ou plano o lê. E o `comparar` recusa sempre por defeito (WR-01, WR-03).
7. **Vagas — OK no conteúdo, sem amarra (WR-03).** Hoje o alvo são as 8 vagas de teste sem `deleted_at`; `cb413d5d` fica fora porque já tem. As colisões `53b73af6`/`53f75c81` recebem só `deleted_at`, e as 3 candidaturas da trava ficam (impressão da trava). `fdbe1a4a`/`e897f709`/`9f6ccf1a` não são vagas de teste e entram no não-alvo por linha inteira. `629a5f31` recebe `deleted_at` no último passo, depois da candidatura sair. O trigger `vagas_status_soft_delete_sync_trg` só muda `status` de vaga `ativa`, e as 8 são `arquivada`/`inativa`. `vagas_estado` do `p52_ensaio.cjs` (WR-02 do G7) captura `id|status|deleted_at` antes e depois do ensaio e a prova de mordida está no envelope. Revisado no G7B; sem achado novo.
8. **O comando — OK na forma, falha no conteúdo do elo (ii).** `bash -n` ok; verificador da cadeia (4º `<automated>` do Task 1) OK. (iv) `p52_backup.cjs --apply` e (v) `p52_export_limpeza.cjs --conferir … --vivo` são os dois elos imediatamente anteriores a (vi) :77-79. (0) simulado com sucesso e recusas (ver Summary). Só imprime contagens, md5 e instantes. O portão em (iii) cobre `p46apply.cjs` e `scripts/` (VIGIADOS, regra (7)). **Mas (ii) recusa sempre (WR-01)**, e o md5 aprovado não está amarrado ao revisado (WR-04).
9. **Removedor de Storage — OK, com uma ressalva na prova depois (WR-06).** `--aprovado` lista só `ap.prefixos` e compara `n_objetos`/`nomes_md5`. Mutação no rascunho: tirar o md5 da comparação faz o auto-teste falhar, ou seja, morde. Remove só os caminhos listados, por `DELETE /storage/v1/object/curriculos` com caminhos completos, e relista. Nenhum SQL no Storage (teste :232). A chave vem só da Management API, fica em memória e passa pelo redator. Toda saída passa por `out.log/err`; não há `console.*` direto fora do auto-teste. Forma canônica: `Buffer.compare`, `\n`, sem `\n` final, fixture `224b2ac1…` (auto-teste e teste).
10. **«Comando dos currículos» — OK.** Primeiro, `--modo deploy --pin refs/gsd/52-21/sha`: a regra (8) exige toda `_p52_` do pin, inclusive a 0004, no ledger com md5 = arquivo, então o Storage só sai depois do commit do banco, por máquina. Depois, DECISAO × STORAGE com proveniência git (rastreado, igual a HEAD, último commit ancestral do pin), seguido de `--dry-run` e de `--aprovado`. O caminho do STORAGE é fixo e o plano é protegido pela regra (6). Não encontrei caminho que remova antes do commit do banco ou com outro STORAGE.json. O POS da migration garante resíduo zero dentro da transação, então a prova depois do banco é redundante e não precisa estar na cadeia.
11. **Mutações e auto-testes — parcial.** Rodei os auto-testes (backup 29/29, limpeza 40/40, export 49/49, remoção 16/16, portão 68/68), `node --test` nos dois arquivos (26/26) e o verificador da cadeia (23+2). D1–D4 (52-20-SUMMARY:159-169, 43/43, controle verde) **não** re-executei: rodam no ensaio, proibido a este review. Mutações próprias em cópias no scratchpad: M1 (remover a checagem de `populacao_md5` do `comparar`) **não morde**, 40/40 verde (WR-02). M2 (remover a checagem do contrato da população aprovada) também 40/40 verde: o auto-teste nunca exercita a população real (WR-01). Remoção sem o md5: morde. Export sem o md5 no download: não morde (IN-08).
12. **`p52_backup.cjs` — OK.** Exige `walg_enabled === true` estrito (:113); backup físico COMPLETED com `inserted_at` ISO válido (:117-123); registro por forma nos dois sentidos (:137-145); B > L estrito (:156). No modo apply: janela 03:00–15:00 UTC (:161-167), B > `export_em_aprovado` (:168-170), `Date` do servidor (:349) com agora ≥ B, mesmo dia BRT e antes de 12:00 (:171-183). Sem flag de contorno. O token nunca é impresso e o corpo nunca sai. Bordas: `inserted_at` sem milissegundos ou com `+00:00` é aceito; sem fuso recusa (fail-closed). Backup depois de 12:00 BRT (≥ 15:00Z) recusa pela janela, e um dia sem backup antes disso perde a janela daquele dia. Com o export de hoje (12:13Z), o apply cabe amanhã entre o backup (~06:28Z) e 15:00Z (03:28–12:00 BRT).
13. **`p52_export_limpeza.cjs` — OK, e o espelho bate.** O fecho é lido de `pg_constraint` (public+auth) na execução (:294-312). Raízes com dupla guarda (:313-321). `c/a/r` → `apaga` e desce; `n/d` → `anula` sem descer, salvo NOT NULL ou várias colunas → `apaga` (:220-224). Do `auth`, só `users`/`identities`; colunas `%token%` em branco e `encrypted_password` mantido. Recusa dentro de árvore git e diretório existente. 0700/0600 conferidos no disco. Manifesto selado; `--vivo` refaz o fecho e confere o catálogo (`fk_md5`) entre as duas leituras. Espelho: tudo o que a migration apaga, anula ou atualiza está no fecho (as 31 tabelas e as contagens de 52-21-EXPORT.md batem com 52-27-SUMMARY:140 e com a evidência `candidatos=38, candidaturas=32, auth=30, historico_acoes=8, vagas_deleted_at=8`). Fica de fora só o `auth` excluído por desenho: sessões 29, `mfa_amr_claims` 29, refresh 206, `one_time_tokens` 1, `scim_users` 0. Restaurabilidade em WR-05.
14. **Privacidade — OK.** Nenhum e-mail, nome, CPF, nome de arquivo, token ou chave em 52-21-POPULACAO/STORAGE/EXPORT, no comando ou nos SUMMARYs (varredura por regex). Não abri o export: só `stat` e `md5 -q` do MANIFESTO (`0ea5ffb9…`). `.planning/tmp/` e `$TMPDIR/p52_21_ensaio.log` sem DETAIL de linha. Padrões de e-mail interno literais na migration estão em IN-05. Eco de DETAIL do Postgres pelo `p46apply` está em IN-03.
15. **52-22-PLAN — push OK, backlog incompleto (WR-07).** `--modo push` com regra (8) impede o push sem a 0004 no ledger, e a enumeração usa `--revisoes`/`--aplicado`. Mas o backlog não nomeia os 3 `auth.users` órfãos, o `deleted_at` da `9f6ccf1a` nem a purga de notificações e os `ai_call_logs` sobreviventes.

## Warnings

### WR-01: `comparar` (elo (ii) do comando) recusa SEMPRE com as entradas reais — dois defeitos independentes

**Onde:** `scripts/p52_limpeza_portao.cjs:543-546` e `:552-553` (`compararDocs`); `:343-345` (contrato «sem `--decisao`»); auto-teste `:589-641`, `:670`. Chamado em `52-21-COMANDO-APPLY.sh:75`.

**O que:**
- (a) `const ep = conferirContrato(popul, {})` aplica à população **aprovada** o contrato «sem `--decisao`», que exige `apagaveis === null` e `populacao_md5 === null`. O `$POP` do comando é o `52-21-POPULACAO.json`, medido **com** `--decisao` (38 entradas, `1b4b21a9…`). Resultado: sempre `populacao aprovada fora do contrato (apagaveis (tem de ser null sem --decisao), populacao_md5 (tem de ser null sem --decisao))`.
- (b) A regex `^aprovado_([a-z0-9_]+): *(\S*)` também casa `aprovado_em: 2026-10-1x HH:MM -03`, linha que o Task 2 manda escrever (52-21-PLAN.md:228) e cujo verify exige (:233, `sem data`). Resultado: sempre `aprovado_em malformado`.

Provado por execução, com o 52-21-POPULACAO.json real como `agora` e como população aprovada e uma DECISAO no formato do Task 2: `["aprovado_em malformado","populacao aprovada fora do contrato (...)"]`. O auto-teste fica 40/40 porque `base()` tem `apagaveis: null` e o `DEC()` do teste não tem `aprovado_em`: a fixture não tem a forma da entrada real (memória «o sintoma pode ser do próprio teste»).

**Por que importa:** é fail-closed (nada escrito em PROD), mas o comando nunca chega ao `migrate`: o apply de amanhã não acontece. Pior: se o pin `refs/gsd/52-21/sha` nascer antes do conserto, o Passo 0 do Task 3 («cria só se ausente», 52-21-PLAN.md:256) deixa o pin velho. Depois do commit do conserto, o `--modo apply` recusa `HEAD != PIN`, e o plano não diz como mover o pin.

**Conserto proposto:**
```js
// compararDocs
for (const m of doc.matchAll(/^aprovado_([a-z0-9_]+): *(\S*)/gm)) {
  if (m[1] === 'em') continue;            // aprovado_em é data, não categoria (mesma exclusão dos verifies do 52-21)
  ...
}
const apagarPop = O(popul) && O(popul.apagaveis) ? Object.keys(popul.apagaveis) : [];
const ep = conferirContrato(popul, { apagar: apagarPop });
if (!apagarPop.length) e.push('populacao aprovada sem apagaveis');
if (ap && popul.populacao_md5 !== ap) e.push('populacao_md5_aprovado != populacao_md5 do POPULACAO.json');
```
Auto-teste: casos com a população na forma real (`comDecisao(...)` como `popul`) e `DEC(..., 'aprovado_em: 2026-10-14 08:00 -03')`. No verify do Task 2, antes do pin: `node scripts/p52_limpeza_portao.cjs comparar $P/52-21-POPULACAO.json $P/52-21-DECISAO.md $P/52-21-POPULACAO.json` tem de sair 0. Ordem: conserto, `52-REVIEW-LIMPEZA-2`, OK do operador, pin.

### WR-02: a checagem que pega «mesma contagem, ids trocados» não é mordida pelo auto-teste

**Onde:** `scripts/p52_limpeza_portao.cjs:558`; casos `:671-672`.

**O que:** é a única linha que recusa uma população de mesma contagem por categoria com um id trocado (por exemplo, uma conta de teste que saiu e uma conta real que entrou): `if (ap && H.test(ap) && agora.populacao_md5 !== ap)`. Mutação no scratchpad apagando essa linha: o auto-teste segue **40/40**. Os casos «id a mais» e «id a menos» mordem pela contagem, não pelo md5. O código de hoje está certo, mas o portão não prova que morde (CLAUDE.md §Portões: «prove por execução que o portão ainda MORDE»).

**Por que importa:** uma regressão futura nessa linha passaria verde, e é exatamente a linha que separa «a população aprovada» de «uma população do mesmo tamanho».

**Conserto proposto:** caso novo: mesma contagem com um id trocado → recusa só por `populacao_md5 agora … != aprovado`. Provar a mordida tirando a linha numa cópia (vermelho) e mantendo (verde), com linha de base.

### WR-03: no instante da escrita, a migration não está amarrada à população nem às vagas aprovadas

**Onde:** migration `:162-198` (população recomputada por forma), `:291-295` (vagas por forma), `:590-601` (evidência só numa GUC); `p46apply.cjs:145` (a resposta do `migrate` é descartada; `p52.evidencia` nunca é lida num apply real); `scripts/p52_limpeza_portao.cjs:453-469` (recorte `manter`, que a migration não aplica); `compararDocs` (não compara `vagas_teste`); `52-21-COMANDO-APPLY.sh:75-79`.

**O que:**
- (1) Entre (ii) e (vi) há três elos, alguns segundos. Uma conta nova que case a varredura nesse intervalo entra no PRE e é apagada sem export, e nada compara depois.
- (2) A migration não honra `manter_ids:` nem `possivel_real_<id8>: manter`; o script honra. Hoje é inerte, porque os 3 `manter` são `auth.users` órfãos fora das categorias.
- (3) As vagas: a migration põe `deleted_at` em **toda** vaga de teste sem `deleted_at` no instante. Nada compara com os 8 destinos `vaga_<id8>: deleted_at` da decisão (`vagas_md5 = 22cc6263…` é calculado e nunca comparado; o `--vivo` do export só olha as 8 aprovadas).
- (4) Num apply real, o `populacao_md5` que a migration efetivamente apagou não aparece em lugar nenhum. A prova depois (`medir --pos`) prova resíduo zero, não «só a aprovada».

**Por que warning e não crítico:** a janela é de segundos; as 9 vagas de teste estão `arquivada`/`inativa` e não recebem candidatura; o recorte está vazio hoje; e o efeito em vaga é um UPDATE reversível.

**Conserto proposto:** mínimo, sem tocar a migration: o `comparar` também confere (i) que o conjunto de vagas de teste sem `deleted_at` em `agora.vagas_teste` é exatamente o `vaga_<id8>: deleted_at` do 52-19-DECISAO-ESCOPO, e (ii) recusa se alguma linha `manter` da decisão casar uma entrada de categoria apagável (a migration não a honraria). Recomendado (exige reensaio e LIMPEZA-2): o PRE recusar se `v_md5`/`v_vmd5` diferirem de `1b4b21a93ff00a9d01f7d10926dd1f54`/`22cc6263eedd2ef195561b539db9a152`. É escopo **decidido**, não fotografia (a constante vem da decisão do operador e envelhece de propósito: população nova exige decisão nova).

### WR-04: o `comando_md5_aprovado` não está amarrado por máquina à versão revisada

**Onde:** `scripts/p52_portao.cjs:247-251` (regra (5) só fora de `.planning/`); `52-21-PLAN.md:233` (`cm = md5(arquivo atual)`); `52-21-COMANDO-APPLY.sh:69-71`.

**O que:** o comando mora em `.planning/`, fora da regra (5). O verify do Task 2 calcula o md5 do arquivo **atual** e exige que a DECISAO o carregue. Uma edição feita entre este review e o OK seria aprovada pelo operador sem review. O cabeçalho (:23-27) e o plano (I6) dizem «o comando que roda é o que o revisor leu», mas a máquina prova só «o que o operador aprovou».

**Por que importa:** é o arquivo que encadeia todos os portões; tirar um elo que não seja (iv)/(v) não é visto pelo verificador da cadeia.

**Conserto proposto:** no verify do Task 2, exigir `git diff --quiet <reviewed_head do maior 52-REVIEW-LIMPEZA-N> HEAD -- $SELF`, ou `git show <reviewed_head>:$SELF | md5` = `comando_md5_aprovado`. Até lá: o operador confere `comando_md5_aprovado = 99b8c90e4b34cd92a05cd0b768a32cad`. WR-01 não exige mudar o comando.

### WR-05: a restauração cirúrgica nunca foi ensaiada, e o catálogo tem armadilhas concretas

**Onde:** `52-21-PLAN.md:120` (procedimento em prosa: «reinserir … com `jsonb_populate_record`»); `scripts/p52_export_limpeza.cjs:41-43`.

**O que:** medido em PROD (só leitura):
- Há colunas **geradas**: `auth.users.confirmed_at` e `auth.identities.email` (`attgenerated='s'`). Um `INSERT … SELECT (jsonb_populate_record(null::auth.users, r)).*` falha.
- Na reinserção disparam triggers `AFTER INSERT`: em `candidaturas`, `trg_notif_confirmacao` e `trg_candidaturas_analise` (`net.http_post` às Edge Functions: e-mail de confirmação às caixas das contas, algumas reais do operador, e análise de IA paga); em `historico_candidatura`, `trg_notif_transicao`; em `revisao_rejeicao`, `trg_notif_revisao_rejeicao_solicitada`.

Nada disso torna a volta impossível, por isso não é crítico. Mas o `--conferir` prova integridade, não restaurabilidade, e o export é a **única** volta dos 24 currículos.

**Por que importa:** na hora da necessidade, a primeira tentativa de restauração falha ou dispara e-mail e custo.

**Conserto proposto:** antes do apply, ou como pendência com dono no 52-22: escrever o restaurador com colunas explícitas sem as geradas, desligando de forma estreita os triggers de notificação e IA (o mesmo idioma da 0004), ou com `session_replication_role` e conferência de FK depois. Ensaiá-lo no envelope que aborta (0004 + restauração → impressões digitais iguais às do PRE).

### WR-06: a prova depois do Storage compara o total do bucket com uma constante da captura

**Onde:** `scripts/p52_remove_storage.cjs:294-303`; `52-21-STORAGE.json` (`total_bucket: 28`, `capturado_em 2026-10-13T12:16:36Z`); `52-21-PLAN.md:261-262`.

**O que:** `--esperar-vazio` sai 1 se `total_bucket` de agora ≠ capturado − aprovados, com «STORAGE NAO ESVAZIOU COMO APROVADO». O `fails_when` lê isso como «tocou algo fora da lista». `fdbe1a4a`/`e897f709` seguem `ativa` e abertas a candidato real, e qualquer upload de currículo entre a captura e a prova reprova uma remoção correta com diagnóstico falso. É a forma «contagem contra constante» do CLAUDE.md §Portões. Medido agora: 28 objetos, 0 depois da captura, último upload em 2026-10-12. O risco é baixo, mas real a partir do momento em que a vaga reabre.

**Conserto proposto:** em `--aprovado` real, medir na **mesma execução**, antes de remover, a contagem por prefixo de tudo fora dos prefixos aprovados, e exigir igualdade depois da remoção. `--esperar-vazio` julga `restantes=0` e imprime o total como informativo, ou compara com uma baseline gravada pela execução da remoção, nunca pela captura.

### WR-07: o 52-22 deixa cair itens de backlog decididos pelo operador

**Onde:** `52-22-PLAN.md:20` e `:70` (lista do SUMMARY); `52-19-DECISAO-ESCOPO.md:74` (`backlog_fecho_m8`) e :89-94 (verbatim); `.planning/STATE.md:59-70` (checklist do M8 sem esses itens).

**O que:** o 52-22 nomeia fixtures, PITR, export local e F4/F15/O5/F18. Não nomeia:
- os 3 `auth.users` órfãos `2a71d384`/`95d4b83c`/`e41b0bd5` («manter (backlog do fecho do M8)», operador);
- o `deleted_at` da `9f6ccf1a` («backlog: deleted_at no fecho do M8»);
- as 64 linhas de `ai_call_logs` que sobrevivem com `candidato_id` nulo e conteúdo (`raw_response`, `parsed_reasoning`) até `retain_until` ≥ 2027-03-04;
- a purga de `notificacoes_enviadas` deferida a LGPD-OPS (STATE.md:1494).

**Por que importa:** memória «deploy cuja próxima etapa não tem plano». O registro só existe numa linha narrativa do STATE e na decisão da 52-19.

**Conserto proposto:** acrescentar os quatro itens ao `must_haves` e à ação do 52-22, com dono, e ao checklist de fecho do M8 no STATE (pelo orquestrador).

## Info

### IN-01: efeitos colaterais do DISABLE/ENABLE em `historico_acoes`
**Onde:** migration `:395-398`. **O que:** o `ALTER TABLE` toma `SHARE ROW EXCLUSIVE` em `historico_acoes` até o commit, o que bloqueia inserts concorrentes do RH por segundos; com `lock_timeout 3s`, uma espera longa vira 55P03, fail-closed, e o mesmo comando roda depois. Ele também dispara o event trigger `pgrst_ddl_watch` (recarga do cache do PostgREST, inofensiva). E faz o `p46apply.cjs:126-131` imprimir o aviso BD-14 («rode o drift smoke»): é falso positivo, porque a 0004 não muda a forma de nenhuma tabela. **Conserto:** dizer isso no SUMMARY, para o executor não tratar o aviso como pendência.

### IN-02: `candidate_ai_decisions` e colunas de ator, julgados corretos
**Onde:** migration `:234-238`, `:407-408`, `:436-450`. **O que:** há 1 linha apagada explicitamente (FK `n` sobre NOT NULL; o 23502 medido no 52-20). As colunas de ator ficam por conferência: aborta se alguma linha restante apontar para conta a apagar. `ai_call_logs:anula=64`, com o estado anterior no export. Sem ação.

### IN-03: evidência em GUC de sessão; o `p46apply` ecoa o corpo inteiro do erro
**Onde:** migration `:590` (`set_config(..., false)`); `p46apply.cjs:77`. **O que:** `p52.evidencia` fica na sessão do pool depois do commit e ninguém a lê num apply real. Numa recusa inesperada do Postgres com DETAIL (23502/23514, «Failing row contains (…)»), a linha inteira, possivelmente com dado pessoal, sai no terminal, e o plano manda «registrar a saída inteira» no SUMMARY (52-21-PLAN.md:256). O PRE torna isso improvável. **Conserto:** no SUMMARY, registrar só o SQLSTATE e o rótulo `P52D …`, nunca o DETAIL.

### IN-04: disponibilidade do `--vivo` até a manhã do apply
**Onde:** `scripts/p52_export_limpeza.cjs:813-835`. **O que:** as contas da população têm 29 sessões e 206 refresh tokens vivos. Login ou atividade nelas (as `+claudeN`, a interna `paulista@`, a `fernando@fotona`) mudam `auth.users` ou o fecho, e o resultado é `EXPORT DIFERE DO VIVO`: novo export e nova decisão. Conferi os crons (só leitura): `ai-logs-retention-cleanup` não alcança (menor `retain_until` 2027-03-04); `notif-retry-sweep` sem pendente na população; `purga-retencao-sweep` em `dry_run`; `prazo-reabertura-sweep` com 0 decisões reabertas na população. **Conserto:** dizer ao operador para não entrar nessas contas até o apply.

### IN-05: e-mails internos literais como padrões
**Onde:** migration `:169-172`, smoke `:72-75`, script `:61-79`. **O que:** as duas contas internas sem «+» (fotona / beautysmile — prefixos aa8d21d7 e eb718a32) e o padrão +claudeN do gmail do operador são padrões decididos (D-30, já no p47) e ficam no `statements[1]` do ledger. Não é dado de candidato. Sem ação.

### IN-06: o export é cópia única num disco
**Onde:** `/Users/fernando/p52-export-limpeza/20261013T121303Z`. **O que:** é o único caminho de volta dos 24 currículos (o Storage não tem backup) e mora num só disco. Pode também ser copiado por Time Machine para fora do controle 0700. É escolha do operador; nomear no 52-22.

### IN-07: `node --test scripts/__tests__/` (forma de diretório) falha no Node 24
**O que:** dá `MODULE_NOT_FOUND`. Com os arquivos explícitos, 26/26. É invocação, não defeito; usar arquivos explícitos nos verifies.

### IN-08: o auto-teste do export não morde a checagem de md5 no download
**Onde:** `scripts/p52_export_limpeza.cjs:648-650`. **O que:** mutação sem o md5 → 49/49. O modo `--exportar` já rodou, e o `--conferir` recompara `nomesMd5` com o STORAGE.json (`:806-808`). Baixo.

### IN-09: o PRE não lê FKs para os netos da cascata
**Onde:** migration `:227-228`. **O que:** uma FK NO ACTION futura para um filho CASCADE (por exemplo, para `respostas_formulario`) para no handler `foreign_key_violation` (`:425-428`, fail-closed), com mensagem menos precisa que a do (fk). Hoje não existe nenhuma (lista medida). Sem ação.

## Veredito

**critical: 0 — mas `changes_required`.** Nada aqui apaga fora da população aprovada, deixa o apply rodar sem os portões, vaza dado pessoal ou torna a volta impossível. Porém o comando aprovado como está nunca passa do passo (ii) (WR-01). Antes do OK do Task 2: consertar WR-01 e WR-02 em `scripts/p52_limpeza_portao.cjs` (de preferência junto com WR-03 mínimo, WR-04 e WR-06), rodar `52-REVIEW-LIMPEZA-2` e só então criar o pin `refs/gsd/52-21/sha`. WR-05 e WR-07 podem ficar como pendência nomeada com dono no 52-22.

---

_Reviewed: 2026-10-13T12:37:16Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
