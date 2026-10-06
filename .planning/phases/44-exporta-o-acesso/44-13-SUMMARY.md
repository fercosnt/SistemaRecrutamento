---
phase: 44-exporta-o-acesso
plan: 13
status: in-progress
---

# Phase 44 Plan 13: publicação do G5 — Summary (PARCIAL: Tasks 1-2; a publicação é o Task 3)

## Arquivo legível (Task 1, commit `38455e5f`)

- `COPY_ARQUIVO.rotuloTabela`: `retencao_hold` → «Conservação dos seus dados além do prazo»; `cognitivo_liberacao` → «Liberação da avaliação cognitiva».
- `COPY_ARQUIVO.rotuloColuna`, seis entradas novas: `faixa_etaria_materializada` → «Faixa etária registrada»; `encerrada_a_pedido_em` → «Encerrada a seu pedido em»; `executar_em` → «Data prevista para a execução do pedido»; `storage_concluido_em` → «Etapa dos arquivos concluída em»; `postgres_concluido_em` → «Etapa do cadastro concluída em»; `auth_concluido_em` → «Etapa da conta de acesso concluída em». Nenhuma para `recibo_enviado_em`.
- **(p5) vermelho antes do verde:** `npx vitest run …/exportacaoService.test.ts -t "p5"` antes da implementação → `Tests  1 failed | 49 skipped (50)`, falha em `expect(html).toContain('<h2>Conservação dos seus dados além do prazo</h2>')` (o HTML trazia o título humanizado pelo fallback). Depois: `npx vitest run src/features/privacidade` → `Test Files 10 passed (10) · Tests 155 passed (155)`, exit 0; `tsc` = 89 (`error TS` contados; 0 em `privacidade`); `grep -c "Conservação dos seus dados além do prazo" exportacaoService.ts` = 1. Hook do commit: `tsc errors: 89 (frozen baseline: 96)`.
- (t) (strings banidas) verde.
- Colisão de rótulo: `rotuloColuna` é indexado por NOME de coluna, não por tabela. Medido na allowlist 1.4.0: cada uma das seis chaves existe em exatamente UMA tabela exportada (`faixa_etaria_materializada` só em `candidatos`, `encerrada_a_pedido_em` só em `candidaturas`, as outras quatro só em `solicitacoes_dados`), então nenhum rótulo novo cai em coluna homônima de outra tabela.

## Antes de publicar (Task 2)

GATES_SHA: 38455e5f8794fbc95999c7aa9f1756ba92b00997

Os dois `<automated>` do Task 2 foram rodados LITERAIS, salvos em script e executados com `bash` (o shell da sessão é zsh), sobre o HEAD `38455e5f`, que é o commit do Task 1. Os dois imprimiram a linha final e saíram com exit 0.

### 1 · Re-revisão do artefato contra `origin/main` (`797c6110`)

Saída do primeiro comando:
```json
{"versao":["1.3.0","1.4.0"],"removidas_exportadas":[],"removidas_excluidas":[],"tabelas_novas":["cognitivo_liberacao","retencao_hold"],"excluidas_novas":["config_janela_exclusao","config_purga","purga_execucao_itens","purga_execucoes"],"exportadas_novas":["candidatos.faixa_etaria_materializada","candidaturas.encerrada_a_pedido_em","cognitivo_liberacao.candidatura_id","cognitivo_liberacao.id","cognitivo_liberacao.liberado_em","cognitivo_liberacao.motivo","cognitivo_liberacao.revogado_em","retencao_hold.candidatura_id","retencao_hold.criado_em","retencao_hold.id","retencao_hold.liberado_em","retencao_hold.motivo","solicitacoes_dados.auth_concluido_em","solicitacoes_dados.cancelado_em","solicitacoes_dados.executar_em","solicitacoes_dados.postgres_concluido_em","solicitacoes_dados.storage_concluido_em"]}
```
Conferência item a item das 17 exportadas novas contra o `<interfaces>`: as 13 com veredito (`faixa_etaria_materializada`, `encerrada_a_pedido_em`, `executar_em`, `cancelado_em`, `storage/postgres/auth_concluido_em`, `retencao_hold.{motivo, criado_em, liberado_em}`, `cognitivo_liberacao.{liberado_em, revogado_em, motivo}`) mais `id`/`candidatura_id` das duas tabelas = 17. Não aparecem `plano` nem `recibo_enviado_em`. Zero coluna removida e zero exclusão removida.

### 2 · Re-revisão independente: indisponível neste executor

A skill `gsd-code-review` está na lista do executor e foi carregada (`44 --files <os 11 arquivos de código de origin/main..HEAD>`). O workflow dela (`~/.claude/gsd-core/workflows/code-review.md:770`) despacha `Agent(subagent_type="gsd-code-reviewer")`, e este executor **não tem ferramenta de agente**. Além disso, o workflow grava em `44-REVIEW.md`, que já existe com a revisão anterior da fase. **A re-revisão independente não rodou.** Seguindo o plano, o que vale como re-revisão possível são os itens 1 e 3.

Para não ficar só nisso, o executor leu o diff de código de `origin/main..HEAD`. Isto é leitura do próprio executor, não revisão independente. São 13 arquivos fora de `.planning/`, com 2165 inserções e 122 remoções:
- `exportacaoService.ts`: +13 linhas, só entradas de rótulo e comentário. Nenhuma lógica mudou e o fallback `rotularTabela`/`rotularColuna` continua igual.
- `gen-export-allowlist.cjs`: flag nova `--sql-values-tabelas` (`paresTabelas`). Não muda a geração da allowlist.
- `p46apply.cjs`: lembrete BD-14 no `migrate`, só `console.log`.
- `export-scope-rules.yaml`: só acréscimos de veredito/disposição e a contagem de cobertura (69 → 75), com o histórico preservado.
- A EF `exportar-meus-dados/index.ts` **não mudou**. Ela lê as tabelas novas pelo caminho genérico `via:candidaturas`, e o Deno (19) prende isso.

Achado BLOCKER/CRITICAL: **nenhum.**

### 3 · Suíte inteira, `deno`, `tsc`, `check:*`, smoke limpo

- `npx vitest run --reporter=json`: 220 arquivos, **2419 testes**, 2417 passaram e **2 falharam**, ambas em `__tests__/promessasComExecutor.test.ts`, que é 1 arquivo de 220:
  - «Metade 1 — o registro curado: toda promessa nomeada tem executor provado no disco · deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…»
  - «Deferimento com prazo: a fase dona é conferida contra o roadmap, nos dois sentidos · fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos»

  São as 2 falhas pré-existentes nomeadas no plano (`faseDona 'Phase 46'`, registradas no `deferred-items.md` pelo 44-11). Não há nenhuma outra. 2419 ≥ baseline 2415 (+1 é a (p5); o resto é a (l) do 44-12 e testes entrados depois da medição do planejador).
- `deno test --allow-all supabase/functions/exportar-meus-dados/` → `ok | 21 passed | 0 failed`.
- `tsc` (`error TS`) = 89, dentro do limite de 89.
- `check:export-allowlist`, `check:recibo-exclusao`, `check:matriz-retencao`, `check:pii-inventory-md` → os quatro `OK`, exit 0.
- Smoke contra PROD, agora (`node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql`, 33118 octetos, SEM registro no ledger):
  ```json
  {"smoke":"p44_export_drift","pass":true,"n_tabelas_vivas":75,"n_tabelas_com_disposicao":75,"n_tabelas_em_escopo":32,"n_colunas_vivas_em_escopo":451,"n_pares_com_veredito":451,"n_drift":0}
  ```
  As populações são idênticas às do 44-12. Nenhuma coluna da allowlist sumiu do banco.

### 4 · O portão morde com o banco em zero (segundo comando, iniciado em 2026-10-06T21:11:20Z)

| | Entrada | Saída (literal) |
|---|---|---|
| ausência ANTES | `SET TRANSACTION READ ONLY; SELECT to_regclass('public.p44_sonda_drift') IS NULL AS ausente` | `"ausente": true` |
| (i) sonda | `CREATE TABLE public.p44_sonda_drift (id int);` + smoke literal + `SELECT 1/0;` (725 linhas, 33177 octetos) | `HTTP 400 … P0001: P44-DRIFT FAIL: n_drift=1 · populações: n_tabelas_vivas=76 n_tabelas_com_disposicao=75 n_tabelas_em_escopo=32 n_colunas_vivas_em_escopo=451 n_pares_com_veredito=451 · linhas: p44_sonda_drift — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml` |
| ausência DEPOIS | a mesma leitura | `"ausente": true` |
| (ii) coluna | smoke sem `    ('retencao_hold','detalhe'),` (722 → 721 linhas; a linha 535 fica entre `criado_por` e `liberado_por`) | `P44-DRIFT FAIL: n_drift=1 · … n_pares_com_veredito=450 · linhas: retencao_hold.detalhe — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml` |
| (iii) tabela | smoke sem `    ('purga_execucao_itens','telemetria_interna'),` (722 → 721 linhas; a linha 591 fica entre `prompt_versions` e `purga_execucoes`) | `P44-DRIFT FAIL: n_drift=1 · … n_tabelas_com_disposicao=74 … · linhas: purga_execucao_itens — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml` |

Quem decide a sonda é o `P44-DRIFT FAIL` que nomeia `p44_sonda_drift`, e ele apareceu antes de o `SELECT 1/0` ser alcançado: o `RAISE` aborta a requisição primeiro. A requisição terminou em erro e reverteu inteira, como mostra a ausência lida depois. `git status --porcelain -- supabase/tests docs/compliance` saiu vazio. Os scratches ficaram em `mktemp -d`, fora do repositório.

Linha final do comando: «portao mordeu nas tres direcoes, sem residuo» (exit 0).

<!-- gsd:write-continue -->
