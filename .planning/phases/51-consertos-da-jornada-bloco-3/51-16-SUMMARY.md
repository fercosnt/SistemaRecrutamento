---
phase: 51-consertos-da-jornada-bloco-3
plan: 16
subsystem: database+edge-functions+client (publicação PROD do JORN-42)
tags: [jorn-42, lgpd, art-20, revisao-rejeicao, d-12, d-23, d-55, apply, efdeploy, push, prod]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-08..51-15: migrations 20261008000002..4, cliente da explicação e da fila, EFs, D-57; rodadas de conserto dos reviews -1/-2 (0005 reescrita nas 4 combinações); 51-REVIEW-PORTAO-3 (0 critical) e a decisão do operador «Aplicar agora»"
provides:
  - "PROD: tabela public.revisao_rejeicao (RLS ligada, 0 policy, sem privilégio de tabela para anon/authenticated, 0 linha), RPCs solicitar/estado/responder_revisao_rejeicao, ler_contexto_knockout_revisao, triggers de notificação, fila com três origens, KPI, prazo, motor e o D-23 nas 4 combinações (rejeitar_candidatura e registrar_decisao)"
  - "ledger de PROD com 20261008000002..5, md5 relido = arquivo"
  - "EFs notificar-candidato v19, exportar-meus-dados v8, executar-direito-titular v14 (ACTIVE)"
  - "origin/main = 87be2703 (cliente da explicação e da fila publicado pela Vercel)"
  - ".planning/phases/51-consertos-da-jornada-bloco-3/51-16-CORPOS-ANTES.sql (base de desfazer)"
  - "ref local refs/gsd/51-16/sha = 87be2703"
affects: [51-17]

actuals:
  tokens: 54000        # chars/4 sobre o diff realizado: 51-16-CORPOS-ANTES.sql (194 645 chars) + este SUMMARY (~21 000 chars)
  tasks: 2             # Task 2 e Task 3 (a Task 1 foi fechada antes, pelo orquestrador e pelo operador)
  commits: 1           # MEDIDO: git rev-list --count 86bfa6e6..HEAD antes do commit deste SUMMARY
plan_head_before: 86bfa6e64871358aa75fe76303b1390de830bb54
plan_head_after: 87be2703ea130384e6ea66a14c9093717a980dea

tech-stack:
  added: []
  patterns:
    - "Apply com o portão no MESMO comando (`p51_portao --modo apply && p46apply migrate`), um comando por arquivo, HEAD = pin"
    - "Prova D-12 no estado vivo minutos antes (ensaio --vistas) e provas pós-apply só pelo ensaio que aborta (--sem-migracoes)"
    - "Publicação validada em seco (cadeia inteira, último elo trocado por echo) ANTES do primeiro deploy de EF"
    - "Schema cache do PostgREST conferido por sonda anon com controle negativo: função existente sem EXECUTE → 42501; função inexistente → PGRST202"

key-files:
  created:
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-16-CORPOS-ANTES.sql
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-16-SUMMARY.md
  modified: []

key-decisions:
  - "Operador, 2026-10-09 ~15:25 -03: «Aplicar» o JORN-42 pelo mecanismo (b); (b) nenhuma outra janela publica até o fim da Task 3; (c)+(d) A5 = 0 e purga em dry_run, nada a decidir; (e) as 3 candidaturas de teste do 51-08 ficam como auditoria histórica; (f) confirmado o aperto A4"
  - "Operador, 2026-10-09, review -2: D-23 «Fechar as 4»; mensagem no cliente «Incluir»"
  - "Operador, 2026-10-09, review -3 (f37d3038): «Aplicar agora», sem nova rodada de código; adendo obrigatório ao Desfazer (IN-04/IN-05/IN-07)"
  - "WR-05 do review -1 (knockout_rate volta a contar o knockout revertido depois rejeitado por registrar_decisao): aceito pelo operador sem conserto"

metrics:
  duration: "~4 min de escrita em PROD (21:53:17 primeiro apply → 21:57:06 push); sessão 21:51:45 → 21:59:33 -03 (crawler verde)"
  completed: 2026-10-09
---

# Phase 51 Plan 16: Portão da Onda B do JORN-42 — apply, EFs e push Summary

**O pedido de revisão de toda rejeição está no ar em PROD: as migrations `20261008000002..5` foram aplicadas pela via do
projeto com o portão no mesmo comando, as três EFs redeployadas na ordem D-55, e o cliente empurrado por sha
(`ad2790a3..87be2703`). As provas D-12 deram verde antes e depois do apply, e as 44/44 mutações mordem contra os objetos
vivos.**

O review que liberou tudo isto é o **`51-REVIEW-PORTAO-3.md`, commitado em `f37d3038`** (`reviewed_head` `371c6f75`,
`diff_base` `bb629816` = `refs/gsd/51-06/base`): 0 critical, 2 warning e 7 info. O `--modo revisao` deu `PORTAO OK` às
21:51:45 -03, e cada apply, deploy e o push repetiram o portão no mesmo comando. Não houve review -4.

## Decisões do operador (verbatim, de `51-16-DECISAO-PENDENTE.md`)

### 2026-10-09 ~15:25 -03 — respostas ao pacote do review -1 (via `/gsd-execute-phase 51`, AskUserQuestion)

Medições só-leitura do orquestrador às 15:21:23 -03: ledger head `20261008000001`, `0002..0004` ausentes,
`revisao_rejeicao` = null, `config_purga.modo` = `dry_run`, A5 = 0, `origin/main` = `ad2790a3`.

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

### 2026-10-09 — respostas ao review -2 (`51-REVIEW-PORTAO-2.md`, commit `6dc622da`)

- **D-23**: «**Fechar as 4**». O decisor revertido é recusado tanto em `rejeitar_candidatura` quanto em
  `registrar_decisao(rejeitado)`, venha a reversão de `revisao_rejeicao` ou do ciclo `decisao_final`. Isso pede mais uma
  rodada de conserto e depois o `51-REVIEW-PORTAO-3`, antes do apply.
- **Mensagem no cliente**: «**Incluir**». A recusa do D-23 na rejeição direta mostra o motivo real, como a 48-15 já faz
  em `registrar_decisao`.

### 2026-10-09 — resposta ao review -3 (`51-REVIEW-PORTAO-3.md`, commit `f37d3038`)

Resposta: «**Aplicar agora**». O apply e o push seguem sem nova rodada de código.

**Adendo obrigatório ao «Desfazer» e ao Passo 2** (vale como parte do plano):
1. **IN-05, ordem dentro do banco.** Ao desfazer, TODA função reescrita por 0002..0005 volta ao corpo de
   `51-16-CORPOS-ANTES.sql` ANTES de qualquer `DROP` de `revisao_rejeicao` ou dos objetos novos. Isso inclui
   `rejeitar_candidatura` e `registrar_decisao`. Na ordem inversa, as duas RPCs falham com 42P01 para todo RH.
2. **IN-04, desfazer do cliente.** Reverta só os commits de código do 51, e um por um. A lista sai do enumerador, não de um
   revert de `src/` inteiro. Remova também os arquivos que o push acrescentou. Rode `npm run lint` (teto 89) e
   `npm run build` na árvore desfeita ANTES de empurrar. Commits de outras sessões ficam intocados.
3. **IN-07.** Onde o Passo 2 diz «três prefixadas», leia «quatro»: 0002, 0003, 0004, 0005, nessa ordem e um comando de
   portão por arquivo. **Cumprido:** o ensaio `--vistas` rodou com as quatro, e cada apply teve o seu portão.

## Task 2 — apply em PROD (2026-10-09, horários -03)

### Pré-condição (só leitura, 21:51:45)

`PORTAO OK … modo=revisao`; ledger head `20261008000001` (só `…0001` dos p51); `to_regclass('public.revisao_rejeicao')` =
null; `config_purga.modo` = `dry_run`; A5 = 0; `git status --porcelain` dos caminhos vigiados vazio. Os arquivos sujos de
outras sessões (`docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`, `AGENTS.md`, `.planning/ui-reviews/.gitignore`,
`.planning/phases/51-*/.gitkeep`) ficaram intocados.

### Passo 1 — `51-16-CORPOS-ANTES.sql` (commit `87be2703`, 21:52:56, ANTES do 1º apply às 21:53:17)

Leitura só-leitura às 21:52:43. São oito funções com `pg_get_functiondef`, ACL (`aclexplode`) e comentário: nenhuma
estava sem comentário, e nenhuma das funções NOVAS já existia no vivo.

| Função | md5(prosrc) vivo | ACL |
|---|---|---|
| `listar_revisoes_decisao(boolean)` | `85642fe45f6bb786fc7e965476b727a6` | postgres, authenticated, service_role |
| `contar_revisoes_pendentes()` | `63b7abffd3eee25a26810d9fc01fbadf` | postgres, authenticated, service_role |
| `funil_kpis(uuid)` | `52583cd9fbe981cd92c307853a9604af` | postgres, authenticated, service_role |
| `varrer_prazos_reabertura()` | `8407510d618883efcf28b4af826e509f` | postgres, service_role |
| `anonimizar_candidato(uuid,boolean)` | `4624854408950110cbfebc971481145a` | postgres, service_role, authenticated |
| `plano_exclusao_titular(uuid)` | `35d451416c22e150e48a583d879fe48d` | postgres, service_role, authenticated |
| `rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)` | `75c0d3d0451a6f8c1e1a4425208daa4a` | postgres, authenticated, service_role |
| `registrar_decisao(uuid,decisao_final_resultado,text)` | `7da195353109938c8e572cb61800de06` | postgres, authenticated, service_role |

Os md5 de `rejeitar_candidatura` e `registrar_decisao` são os que o review -3 mediu.

**EFs vivas** (GET só leitura da Management API), iguais às do plano. Por isso a fonte de desfazer é conhecida:

| EF | versão | status | verify_jwt | updated_at | fonte |
|---|---|---|---|---|---|
| `notificar-candidato` | 18 | ACTIVE | false | 2026-10-09T04:44:02Z | `refs/gsd/51-07/sha` = `ad2790a3` |
| `exportar-meus-dados` | 7 | ACTIVE | true | 2026-10-09T03:59:26Z | `refs/gsd/51-05/sha` = `da815714` |
| `executar-direito-titular` | 13 | ACTIVE | true | 2026-10-09T03:59:19Z | `refs/gsd/51-05/sha` = `da815714` |

### Passo 2 — pin e prova D-12 imediatamente antes (21:53:08 → 21:53:12)

`refs/gsd/51-16/sha` = **`87be2703ea130384e6ea66a14c9093717a980dea`** (criado agora; HEAD = pin).

```
ENSAIO VERDE: supabase/tests/p51_revisao_rejeicao_smoke.sql · prefixadas=[20261008000002,20261008000003,20261008000004,20261008000005] · aplicadas=[20261008000001] · ausentes=[] · vistas=igual · smokes=[51b=18/18] · evidencia=02:rr=0,rpcs=3,trg=2,df=8/8 03a:…,anon=false,d08=igual 03b:…,d08=igual:n=2 04:anon=a68e4a6a…,plano=0a4996fe… 05:rejeitar_candidatura=703e47e67cc8,registrar_decisao=45f65ffc5679,d23=4,outras=igual,anon=false 51b.q=d23x8(rc,rd:rv,rvd,dv,dh)=42501,ok=16(b:administrador,c:rh),a_mt=encerrada … · 1515 ms
prova D-12 no estado vivo de agora: vistas iguais, smoke 18/18 (abortado)
```

### Passo 3 — apply, um comando por arquivo, com `p51_portao.cjs --modo apply` no mesmo comando

Cada linha teve `PORTAO OK: revisao=…51-REVIEW-PORTAO-3.md reviewed_head=371c6f75… pin=87be2703… modo=apply` e a saída
`✅ aplicada e escriturada — md5 do ledger BATE`.

| Versão | Arquivo | Octetos | md5 do arquivo | md5 relido do ledger | Início → fim |
|---|---|---|---|---|---|
| 20261008000002 | `p51_revisao_rejeicao` | 50163 | `5644b32619a24de9b18bf9932debebed` | `5644b32619a24de9b18bf9932debebed` | 21:53:17 → 21:53:19 |
| 20261008000003 | `p51_fila_tres_origens` | 65024 | `c499bb38d088dba62e810badfa6e93ef` | `c499bb38d088dba62e810badfa6e93ef` | 21:53:22 → 21:53:25 |
| 20261008000004 | `p51_motor_revisao_rejeicao` | 149824 | `28a657a2468dac39177a5094b11fa2b4` | `28a657a2468dac39177a5094b11fa2b4` | 21:53:29 → 21:53:30 |
| 20261008000005 | `p51_d23_decisor_revertido` | 48265 | `f26a2fbb3225c3b4d38463559447bedf` | `f26a2fbb3225c3b4d38463559447bedf` | 21:53:34 → 21:53:36 |

Não houve recusa nem timeout. O `p46apply` emitiu o aviso BD-14 na 0002, e o drift do export foi conferido no verify 4.

### Passo 4 — provas depois do apply

1. **Verify 2 (21:53:45, só leitura):** `JORN-42 no ar: 4 ledgers = arquivos, tabela fechada, anon sem EXECUTE, 0 linha(s) na tabela`.
   Medido: `rls=true`, `policies=0`, `tabela_aberta=false`, `anon_x=false`, **`linhas=0`** (D-08: nenhuma linha
   retroativa).
2. **Verify 3 (21:53:52 → 21:54:26):** os 16 smokes rodaram só pelo ensaio que aborta (`--sem-migracoes`), e todos têm
   `prefixadas=[]` e `aplicadas=[…0001..…0005]`:

   | Smoke | Resultado |
   |---|---|
   | `p51_revisao_rejeicao_smoke` | 51b=**18/18** (a (q) do D-23 nas 4 combinações incluída) |
   | `p51_raven_status_smoke` | 51a=**7/7** |
   | `p50_acesso_recrutador_smoke` | 50=**13/13** |
   | `p45_motor_exclusao_smoke`, `p46_purga_smoke` (3905 ms), `p42_revisao_art20_smoke`, `p48_reabertura_smoke`, `p48_rejeicao_triagem_smoke`, `p48_dedupe_smoke`, `p48_candidatura_encerrada_smoke`, `p48_prazo_reabertura_smoke`, `p49_snapshot_smoke`, `p49_trilha_smoke`, `oper31_rejeitar_candidatura_smokes`, `submit_candidatura_atomic_smokes`, `funil34_kpis_smokes` | ENSAIO VERDE. São smokes legados de RAISE-em-falha: o veredito não traz contagem N/N, e verde quer dizer que nenhuma cláusula levantou |

   O `p46_purga_smoke` rodou pelo ensaio, como os outros. Nenhum smoke rodou por `p46apply.cjs run`.
3. **Verify 4 (21:54:37):** o `p44_export_drift_smoke` é só leitura (0 DML/DDL no arquivo) e roda por `run`, como o plano
   nomeia. Resultado: `{"pass":true,"n_tabelas_vivas":76,"n_tabelas_com_disposicao":76,"n_tabelas_em_escopo":33,"n_colunas_vivas_em_escopo":467,"n_pares_com_veredito":467,"n_drift":0}`, ou seja,
   `drift do export aprovado ao vivo com a tabela nova`. O catálogo também confere:
   `catalogo vivo de revisao_rejeicao = acrescimo 51-15 do catalogo-vivo-44, por igualdade de conjunto nas duas direcoes (coluna, tipo, nulidade, ordinal) (16 colunas)`.
4. **Verify 6 (21:54:47 → 21:55:30, rodado uma única vez, antes da publicação, como o IN-04 manda):**
   `controle verde; 44/44 mutacoes mordem; nada persistiu` e `portao morde contra os objetos vivos: 44/44 (todas as definidas)`.
   A leitura final é igual à baseline: ledger `…0001..…0005`, `revisao_rejeicao` presente, fixtures 0/0.
5. **Schema cache do PostgREST (21:55, pedido do despacho, porque `listar_revisoes_decisao` trocou de OID):** as
   migrations não emitem `NOTIFY pgrst`, mas o event trigger `pgrst_ddl_watch` (ddl_command_end) e o `pgrst_drop_watch`
   estão ativos. Sondei a REST como `anon`, que não tem EXECUTE, então nada executa:
   - `listar_revisoes_decisao`, `estado_revisao_rejeicao`, `ler_contexto_knockout_revisao`, `contar_revisoes_pendentes`
     e `solicitar_revisao_rejeicao` → **401 / 42501 permission denied**: o cache conhece as funções;
   - o controle `funcao_que_nao_existe_p51` → **404 / PGRST202**: a sonda distingue função ausente de função presente.

   O cache está recarregado com os objetos novos.

`git ls-remote origin refs/heads/main` continuou `ad2790a3` durante toda a Task 2: nenhum push nela.

## Task 3 — EFs e push

### Passo 0 (só leitura, antes do 1º `efdeploy`)

- **(i) WR-04, 21:56:05:** `EFs vivas = capturadas: {"notificar-candidato":18,"exportar-meus-dados":7,"executar-direito-titular":13}`.
- **(ii) IN-11:** A5 remedido = **0**.
- **(iii) WR-02, 21:56:18:** a cadeia inteira do push rodou em seco, com o último elo trocado por `echo`. Resultado:
  `PORTAO OK … modo=push ledger=[20261008000001,…,20261008000005]`, depois
  `enumeracao ok: 64 commit(s) em ad2790a3..87be2703 · codigo coberto por 51-REVIEW-PORTAO-3.md (reviewed_head 371c6f75) · codigo contido no apply 87be2703`
  e `PUSH VALIDADO EM SECO (nada empurrado)`. Nenhum ALHEIO.

### Deploys (ordem D-55; cada um com `p51_portao --modo deploy` com `ledger=[…0001..…0005]` + `--dry-run` no mesmo comando)

| EF | Versão antes | Versão depois | Linha `efdeploy` | Horário |
|---|---|---|---|---|
| `notificar-candidato` | 18 | **19** | `efdeploy: OK · version=19 · status=ACTIVE · verify_jwt=false` | 21:56:29 → 21:56:31 |
| `exportar-meus-dados` | 7 | **8** | `efdeploy: OK · version=8 · status=ACTIVE · verify_jwt=true` | 21:56:36 → 21:56:38 |
| `executar-direito-titular` | 13 | **14** | `efdeploy: OK · version=14 · status=ACTIVE · verify_jwt=true` | 21:56:43 → 21:56:45 |

Verify: `3 EFs publicadas (ACTIVE)`.

### Push por sha (21:56:56 → 21:57:06, sem pausa depois dos deploys)

- **`R-antes` = `ad2790a334bc21ba89154baeaa8a81e483799033`.** É o alvo do passo 1 do «Desfazer» (cliente).
- `S` = PIN = `87be2703ea130384e6ea66a14c9093717a980dea`.
- Portão: `PORTAO OK … modo=push ledger=[20261008000001,20261008000002,20261008000003,20261008000004,20261008000005]`.
- Enumeração: `enumeracao ok: 64 commit(s) em ad2790a3..87be2703 · codigo coberto por 51-REVIEW-PORTAO-3.md (reviewed_head 371c6f75) · codigo contido no apply 87be2703`.
  São 36 commits `codigo` e 28 `planning`, **0 ALHEIO**, e a lista é idêntica, linha a linha, à do seco.
- `git push origin 87be2703…:refs/heads/main` → `ad2790a3..87be2703  87be2703… -> main`. Sem force, sem nome de branch,
  sem `--no-verify`.
- `git log --oneline origin/main..HEAD` → **vazio**. `origin/main` = `87be2703`, e o pin está em `origin/main`.

### Marcadores servidos (`https://rh.beautysmile.com.br`)

O crawler do `<verify>` rodou até 3 vezes, com 2 minutos de intervalo:

- **Tentativa 1 (21:57:24):** `AUSENTE NO CHUNK CERTO EM PROD`, os dois marcadores ausentes. A Vercel ainda construía: o
  deployment `sistema-recrutamento-r5ii3up56` foi criado às 21:57:10, ficou Ready em 34 s, Production, com alias
  `https://rh.beautysmile.com.br`.
- **Tentativa 2 (21:59:33):** verde.
  ```
  cliente do JORN-42 servido: {"solicitar_revisao_rejeicao":["/assets/index-BnGosyaL.js"],"fila-origem-badge":["/assets/RevisoesRHPage-8PfiAeM0.js"]}
  ```
  - `solicitar_revisao_rejeicao` está no chunk eager **`index-BnGosyaL.js`** (explicação do candidato);
  - `fila-origem-badge` está no chunk lazy **`RevisoesRHPage-8PfiAeM0.js`** (`/rh/revisoes`);
  - na mesma execução, o remote main = HEAD local, `origin/main..HEAD` está vazio e o pin está em `origin/main`.

## Pendências registradas (sem conserto no 51-16, por decisão do operador)

- **WR-01 do -3:** o decisor revertido re-rejeita por PATCH direto em `candidaturas` (policy `rh_avanca_etapa`). É
  anterior à P51 e vale também para o D-23 da 48, e a interface não oferece esse caminho. **Ressalva ao «fechar as 4»:**
  ele descreve as combinações fonte × **RPC**, não todo caminho de rejeição. O conserto proposto pelo revisor é
  `guard_rejeicao_auditada` exigir `app.rejeicao_sancionada` para `auth.uid()` não nulo; é um plano próprio, com review.
- **WR-02 do -3:** o filtro `h.decisao = 'rejeitado'` do ramo arquivo de `rejeitar_candidatura` não tem mutação nem
  sonda. Os 44/44 não o cobrem: o portão não morde uma edição futura que o tire.
- **IN-01..IN-03 e IN-06 do -3:** toast «peça a outra pessoa» numa candidatura encerrada; cópia «a nova decisão» mais larga
  que o (2c); diagnóstico falso da (q) quando a trava quebra no filtro de candidatura; `RE_CITA_P51` sensível a caixa.
- **IN-01 e IN-04 do -2:** aceitos como o executor propôs e o revisor concordou: o alerta de prazo de ciclo superado
  reacende por `em_espera`, e «EF antes do push» fica como `verification: judgment`.
- **WR-05 do -1:** aceito sem conserto (ver key-decisions).
- **Fora do portão, sem resposta** (fecho da fase): WINDOWS 89 (`disponibilidade` no recibo), 51-03
  (`aplica_cognitivo=false`), 51-14 (texto neutro), WINDOWS 91-93 (51-15) e IN-16 (`solicitar_revisao_decisao` com
  EXECUTE para `anon`).
- **Do plano:** `db:types` é do 51-17, porque o cliente publicado usa cast estreito nas RPCs novas.

## Deviations from Plan

1. **[Instrução do despacho uma rodada atrasada, não executada] exceção `run` do `p46_purga_smoke`.** O despacho dizia
   que a única exceção a «nenhum smoke por `run`» era o `p46_purga_smoke.sql`, com duas leituras iguais em volta. O
   plano vigente (prohibitions e verify 3) diz que essa exceção foi **removida** no 51-16 (IN-02 do review -1). Segui o
   plano: o `p46_purga_smoke` rodou pelo ensaio que aborta, verde em 3905 ms, e nada rodou por `run` além do drift só
   leitura que o plano nomeia.
2. **[N/N dos smokes legados]** O despacho pedia N/N de cada smoke. Os 13 legados são de RAISE-em-falha e não publicam
   contagem no veredito do ensaio. Para eles registro «ENSAIO VERDE» e não invento N.
3. **[Verificação acrescentada] schema cache do PostgREST:** sonda `anon` com controle negativo, pedida pelo despacho e
   fora dos `<verify>` do plano. É só leitura, porque nada executa sem EXECUTE.
4. **[IN-07 do adendo]** O Passo 2 do plano diz «três prefixadas». Segui o adendo, com as quatro, como o `<verify>` 1 já
   exigia.

Nenhuma recusa, nenhum timeout, nenhum re-apply, nenhuma troca de via, nada desfeito. Nenhum e-mail retroativo: A5 = 0
nas duas medições, e a tabela nasceu vazia.

## Known Stubs

Nenhum. Este plano não escreveu código.

## Self-Check

- FOUND: `51-16-CORPOS-ANTES.sql`, `51-16-SUMMARY.md`.
- FOUND: `87be2703` (CORPOS-ANTES = pin, ancestral de HEAD e em `origin/main`); o review -3 está em `f37d3038`, ancestral
  de HEAD.
- PROD, só leitura, depois de tudo: ledger p51 = `…0001..…0005`, `revisao_rejeicao` presente, 0 linha.
- `commits: 1` medido de `86bfa6e6..HEAD` antes do commit deste SUMMARY.
- ⚠ O commit deste SUMMARY (só `.planning/`) fica **local**, sem push: o push do plano foi o de `87be2703`, e
  `origin/main..HEAD` foi medido vazio depois dele. Publicar commits de `.planning/` é do orquestrador, junto com
  STATE/ROADMAP; o `--modo push` do portão aceita commits só de `.planning/` depois do pin.

## Self-Check: PASSED
