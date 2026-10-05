---
phase: 50-acesso-do-recrutador
reviewed: 2026-10-05T19:49:56Z
depth: deep
diff_base: 81bfab810306c05b1e503ca4a8929d6fb674b466
reviewed_head: 300470276146959088c2b3a64ce1b23198e866f0
scope: re-revisão adversarial nº 3 do tracer, depois da rodada de conserto do 50-REVIEW-TRACER-2 (2f9429d9, a3f44d13, 939247f2, b38cb66e, 30047027). Escopo — o diff de código inteiro (`81bfab81..HEAD -- . ':!.planning'`, 7 arquivos) e o `50-02-PLAN.md`, lido como o programa que escreve em PROD; foco no diff `5d93e378..HEAD`. Lidos como contexto, fora da lista revisada — `50-REVIEW-TRACER-2.md`, `50-07-PLAN.md`, `50-10-PLAN.md`, `50-11-PLAN.md`, `50-VALIDATION.md`, `p46apply.cjs`, CLAUDE.md. PROD só leitura (`set transaction read only`), ou dentro de requisições que abortam. Re-executados — `node scripts/p50_mutacoes.cjs` (CONTROLE 7/7; 11/11 mordem; «nada persistiu»), `p50_ensaio.cjs --vistas --migracoes=…0001… <smoke>` (vistas=igual, 7/7), o Step 1 d (`--vistas --migracoes=…0001… --mutacao=…desfazer_tracer.sql`, vistas=igual), uma exposição semeada sob RR (`P50V FAIL (vistas)`), um arquivo com `COMMIT` (`P50E RECUSADO`, nada enviado), a marca `p50.tx` com controle e com `ROLLBACK` no topo (que encerra sem gravar nada). Também as sondas de ordem do `SET TRANSACTION`, todas só leitura. O `terminadores()` foi exercitado offline sobre 35 casos e sobre os 273 `.sql` do repositório. Nada foi aplicado e nada foi enviado.
files_reviewed: 8
files_reviewed_list:
  - supabase/migrations/20261005000001_p50_helper_candidaturas.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p50_vistas_externas.sql
  - supabase/tests/p50_desfazer_tracer.sql
  - scripts/p50_ensaio.cjs
  - scripts/p50_mutacoes.cjs
  - scripts/p50_enumera.cjs
  - .planning/phases/50-acesso-do-recrutador/50-02-PLAN.md
findings:
  critical: 0
  warning: 8
  info: 11
  total: 19
status: issues_found
---

# Phase 50: Code Review Report — re-revisão nº 3 do tracer (rodada de conserto do TRACER-2) e do programa de apply (50-02)

**Reviewed:** 2026-10-05T19:49:56Z
**Depth:** deep
**Files Reviewed:** 8 — os 7 arquivos de código e o `50-02-PLAN.md`
**Status:** issues_found, com 0 crítico

## Summary

A memória do projeto registra que, duas vezes, uma rodada de conserto trouxe um blocker novo. Por isso li os cinco commits desta
rodada procurando especificamente um caminho novo de escrita em PROD. Também procurei um portão que tivesse ficado incapaz de
falhar, ou que passasse a reprovar trabalho correto. **Não achei blocker.** O objeto que vai a PROD não mudou:
- `git diff e80d9bb6..HEAD` na migration `20261005000001` dá 0 linha;
- o único commit no arquivo é `358c0090`;
- o md5 do arquivo segue `e7383d5d736a75f2b9fe7d862ea4308a`.

Os três consertos fecham o que prometem. Conferi cada um por execução:
- **WR-01 (smoke pós-apply só pelo ensaio).** O verify #2 agora roda `p50_ensaio.cjs --sem-migracoes <smoke>`. Reproduzi a linha
  exata que `principal()` imprime pós-apply (`prefixadas=[] · aplicadas=[20261005000001] · ausentes=[…0002,…0003,…0004] · smoke50=7/7`).
  O `grep` do plano casa essa linha, inclusive com `LC_ALL=C`. Ele **não** casa a linha pré-apply, nem `6/7`, nem um ledger com 0002.
  A linha `ENSAIO VERDE` só é impressa no caminho de saída 0, e o `test "$rc" = 0` vem antes do `grep`. Por isso uma saída de erro não
  produz linha que case.
- **WR-02 (guarda de transação).**
  - **Barreira estática.** `terminadores()` acertou 34 de 35 casos adversariais: comentários aninhados; `E'…\'…'`; `date'…'` e
    `ELSE'…'` (que não são E-string); identificadores `"commit"`/`"end"`; `$o$ … $i$ … $i$ … $o$`; `END IF`/`END CASE` em corpo
    plpgsql; DO com corpo entre aspas simples; `a$b$`; `$1`. A falha única é a do IN-01.
  - **Sem recusa falsa no repositório.** Nos 273 `.sql`, as 7 recusas são `BEGIN;…COMMIT;` reais de topo
    (`20260420*`..`20260425*`), sem nenhuma exceção de leitura.
  - **Marca de tempo de execução.** O controle chega ao sentinela. Com um `ROLLBACK;` no topo, a requisição sai com
    `P50E FAIL (transacao): … dentro de PARTE_COM_ROLLBACK` sem gravar nada.
  - **A marca não pode ficar sempre verde.** Ela é `set_config(…, true)`, LOCAL, e é comparada com `txid_current()`. Um valor de
    sessão velho, deixado numa conexão do pool, é um txid passado e nunca casa. Nenhum arquivo composto tem `RESET ALL`/`DISCARD`/
    `SET SESSION`/`p50.tx`.
- **WR-03 (REPEATABLE READ).** Sondas só leitura pela via:
  - `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ` como primeira instrução dá `repeatable read`;
  - depois de um `SELECT`, e também depois de um `SELECT set_config(…)`, dá `ERROR 25001 … must be called before any query`, um
    vermelho alto e não um no-op calado;
  - depois de `SET LOCAL`, continua valendo, porque `SET` não toma snapshot.

  A ordem do `PREFIXO` (SET TRANSACTION → SET LOCAL ×2 → SELECT) está certa, e a asserção `P50E FAIL (isolamento)` cobre o caso de
  aviso. Sob RR a comparação **ainda morde**: «migration + `OR (SELECT auth.uid()) IS NULL`» deu
  `P50V FAIL (vistas): sem_claims.public.candidaturas,sem_claims.public.v_fila_trabalho,sem_claims.public.v_triagem_panel`.

**Os defeitos novos são efeitos colaterais do RR, que é o conserto certo, sobre o que já existia:**
1. O RR torna o `40001` um erro movido por tráfego **dentro dos envelopes que escrevem**. O runner de mutações conta esse erro como
   «mordida» para M1/M4/M5. O plano trata o `40001` como inconclusivo só no verify #2 (WR-01).
2. Quatro diagnósticos do smoke ainda atribuem diferenças a «tráfego concorrente — rodar de novo». Sob RR isso é falso, e o do (z)
   aponta para longe do vazamento de envelope que ele agora só pode significar (WR-02).
3. O conserto do WR-01 do TRACER-2 parou no 50-02. O 50-10 e o contrato de validação da fase ainda rodam o smoke que escreve pela via
   que commita (WR-03).

Os cinco warnings do TRACER-2 que estavam fora desta rodada seguem abertos, sem mudança (WR-04..WR-08).

## Status dos achados do 50-REVIEW-TRACER-2

| Achado | Status | Evidência |
|---|---|---|
| WR-01 smoke que escreve rodado por `p46apply run` | **fechado no 50-02** | verify #2 (linha 188) pelo ensaio; regex conferida contra a linha real (acima); cabeçalho do smoke: «PROIBIDO … `p46apply.cjs run` DESTE arquivo» (linhas 151-159). **Não portado** ao 50-10/`50-VALIDATION.md` → WR-03 |
| WR-02 terminador de transação no corpo | **fechado** | recusa estática + marca `p50.tx` medidas (acima). Resíduos: IN-01, IN-02 |
| WR-03 READ COMMITTED no ensaio reverso | **fechado** | RR primeiro + asserção; ordem medida; exposição sob RR morde. Resíduos: WR-01, WR-02 |
| WR-04 «MUDOU SEM TRAFEGO» sem conferir atores/dependência | **aberto** | verify #3 (linha 190) inalterado → WR-04 abaixo, com um terceiro modo |
| WR-05 50-07 `18/18` e M7..M18 em colisão | **aberto** | `50-07-PLAN.md:28, 34-35, 172, 195-200` inalterados → WR-05 |
| WR-06 50-10 sem amarrações, `18/18` | **aberto** | `50-10-PLAN.md:154-155, 170-171, 189, 234` inalterados → WR-06 |
| WR-07 `capturar()` sem corpos de função | **aberto** | `p50_ensaio.cjs:23-24` ainda diz «aberto» → WR-07 |
| WR-08 `anon` cego (`e:42501`) | **aberto** | a sonda só mudou no cabeçalho → WR-08 |
| IN-01 revisão lida da árvore | **aberto** | → IN-03 |
| IN-02 `capturar()` largo demais | **aberto** | → IN-04 |
| IN-03 `capturar()` pós-envio sem `try` no CLI | **aberto** | agora `p50_ensaio.cjs:512` → IN-05 |
| IN-04 população 345 × 346 | **aberto** | o padrão do CLAUDE.md ainda acha 346 linhas; o cabeçalho (128) diz 345 → IN-06 |
| IN-05 advisory lock / linhas-semente | **aberto** | → IN-07 |
| IN-06 50-11 sem `--revisoes` | **aberto** | → IN-08 |
| IN-07 orçamento de lock / `anon` 3 s | **aberto** | `p50_ensaio.cjs:43-48` → IN-09 |
| IN-08 aviso (c) do Task 1 | **aberto** | `50-02-PLAN.md:138` → IN-10 |
| IN-09 `sec05_08` vermelho até o 50-08 | **aberto** | → IN-11 |

## Warnings

### WR-01: sob REPEATABLE READ, um `40001` nos envelopes que escrevem conta como «mordida» de M1/M4/M5 — e o plano só o trata como inconclusivo no verify #2

**File:** `scripts/p50_mutacoes.cjs:214-218, 266-274` · `scripts/p50_ensaio.cjs:94-103, 431-433` · `supabase/tests/p50_acesso_recrutador_smoke.sql:447, 524, 806` · `50-02-PLAN.md:195`

**Issue:** O RR, que é o conserto correto do WR-03, criou uma classe nova de erro que depende do tráfego:
- **onde nasce.** Um `UPDATE` do envelope P50C1 numa linha que outra transação commitou depois do snapshot da requisição dá
  `40001`. As linhas atingidas são `usuarios_rh` de a_ativo em (b)/(c) e as duas primeiras candidaturas vivas por id em (f);
- **como sai.** O `WHEN OTHERS` do envelope captura o erro e o juiz levanta
  `P50C FAIL (<letra>): a subtransacao abortou por erro INESPERADO (40001: could not serialize access …) — … o defeito e do SMOKE`;
- **como o runner lê.** `falha()` pega só a letra e os rótulos entre colchetes. Essa mensagem não tem colchetes. Para mutação sem
  `rotulos` exigidos, «reprovou na letra declarada» basta para contar como mordida. O `rodar()` também não classifica `40001` como
  inconclusivo, como faz com `55P03`/`57014`.

Simulei a classificação com a mensagem real para as 11 mutações:
- **M1 (b), M4 (c) e M5 (f)** viram `CONTADA COMO MORDIDA`. São as três sem rótulo exigido cujas letras escrevem;
- **M8..M11** viram `NAO MORDE`. Se dois desses caírem seguidos, o resultado é `SUSPEITA DE INSTRUMENTO`, um vermelho falso;
- **no CONTROLE**, o `40001` vira `CONTROLE VERMELHO … o defeito e do SMOKE`. O `fails_when` do verify #5 lê isso como defeito,
  STOP antes do push, e não como inconclusivo.

O 50-02 só ensina «40001 = repetir uma vez» no verify #2.

O tráfego de hoje é quase nulo. Medi `usuarios_rh` sem escrita por login (`data_ultimo_login` nulo nos administradores; última
atualização em 2026-09-06) e 1 `UPDATE` em `candidaturas` nos últimos 7 dias. Mas o mesmo runner é o portão do 50-07 e do 50-10,
depois que recrutadores reais passarem a trabalhar, e o smoke v2 acrescenta envelopes («filas semeadas»).

**Failure scenario:** Uma revisão do 50-07 quebra o helper de um jeito que M1 deveria pegar e não pega mais. No mesmo segundo, um
recrutador move a etapa de uma candidatura semeada em (f), ou um administrador edita a_ativo. O runner imprime
`M1 morde … P50C FAIL (b)` pelo `40001`, e não pela sonda. O portão fica verde com uma mordida que não foi da sonda.

**Fix:** tratar a serialização como timeout, nos dois runners, e fazer a mordida exigir o julgamento:
```js
// p50_ensaio.cjs rodar()
else if (/\b40001\b|could not serialize access/i.test(out)) timeout = 'SERIALIZACAO (40001)';
// p50_mutacoes.cjs falha(): uma reprovação «INESPERADO» nunca é mordida
if (/P50C FAIL \([^)]+\): a subtransacao abortou por erro INESPERADO/.test(out)) return { letra: '?', rotulos: [], inesperado: true };
```
Há duas alternativas no smoke:
- `WHEN serialization_failure THEN v_err := 'SERIALIZACAO'`, com um prefixo próprio no juiz, `P50C INCONCLUSIVO (b)`;
- ou declarar `rotulos` para M1/M4/M5. M4 e M5 hoje mordem sem colchetes, então isso pede rótulos nas mensagens (c) e (f).

No `fails_when` do verify #5 e no cabeçalho do runner (linhas 6-11 e 35-38), escrever: «`SERIALIZACAO (40001)` / exit 3: inconclusivo,
repetir uma vez».

### WR-02: quatro diagnósticos do smoke atribuem a diferença a «tráfego concorrente — rodar de novo», o que o RR torna falso; o do (z) aponta para longe de um vazamento de envelope

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:537` (c), `:697` (e), `:835` (f), `:861` (z)

**Issue:** Desde o b38cb66e, o smoke só roda pelo ensaio (verify #2 e cabeçalho), e o ensaio roda num snapshot único. Comparações
como postgres × como ator, e baseline × fim, deixaram de ver tráfego. As mensagens não acompanharam:
- **(c), (e) e (f)** dizem que «um total que difere por pouco» é «trafego concorrente commitado entre a baseline e (x) — rodar de
  novo». Sob RR, uma diferença assim é defeito de policy. Repetir dá o mesmo vermelho, mas o SUMMARY registra a causa errada;
- **(z)** diz «este smoke nao escreve; o delta e de trafego concorrente commitado durante a requisicao: rodar de novo». As duas
  orações são falsas:
  - o smoke escreve desde a rodada do TRACER-1 (envelopes de (b)/(c)/(f));
  - sob RR, um delta de contagem global só pode ser **resíduo da própria requisição**, ou seja, uma escrita que escapou de um
    envelope.

  Essa é exatamente a classe que o WR-01 do TRACER-2 temia para o smoke v2. A mensagem manda o operador repetir em vez de olhar o
  envelope.

É a forma «diagnóstico falso» que o CLAUDE.md §Portões e a memória «portão é código» tratam como o modo pior.

**Failure scenario:** No 50-07, uma cláusula SC4 nova semeia uma fila com `INSERT` fora do bloco interno. O (z) acusa
`contagem global mudou (candidaturas 40 -> 41 …) — este smoke nao escreve … rodar de novo`. O executor repete, vê o mesmo vermelho e
registra «tráfego persistente» em vez de «envelope furado». Rodado pelo 50-10:164 (WR-03), que commita, esse `INSERT` sem RAISE
seguinte grava em PROD.

**Fix:**
- No (z), trocar por `… — sob o snapshot unico do ensaio (REPEATABLE READ) o delta e RESIDUO DESTA requisicao: uma escrita escapou
  de um envelope P50C1 — nao repetir, achar a escrita`.
- Em (c)/(e)/(f), tirar o conselho de tráfego, ou condicioná-lo a `current_setting('transaction_isolation') = 'read committed'`.
- Registrar no cabeçalho que (z) agora mede resíduo próprio.

### WR-03: o 50-10 (`:164`) e o contrato de validação da fase ainda rodam o smoke que ESCREVE pela via que COMMITA — o WR-01 do TRACER-2 foi fechado só no 50-02

**File:** `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:164-165` · `.planning/phases/50-acesso-do-recrutador/50-VALIDATION.md:24, 46` e §Sampling Rate («smoke p50 (ensaio antes do apply, real depois)»)

**Issue:** O 50-10:164 roda `node p46apply.cjs run supabase/tests/p50_acesso_recrutador_smoke.sql` depois do apply de 0002–0004,
com `esperado = 13`. Até lá o smoke v2 terá os envelopes atuais e mais os do SC4 («filas semeadas»), e nenhuma das duas guardas do
WR-02 vale ali:
- a recusa estática e a marca `p50.tx` vivem em `compor()`, que o `run` não usa;
- não há `lock_timeout` nem leitura de persistência.

O `50-VALIDATION.md` reforça o mesmo caminho em três pontos:
- o «Quick run command» é o `run` committante;
- o mapa SC1/SC2/SC4 manda «idem»;
- o Sampling Rate diz «real depois» do apply, a cada onda.

Ou seja, depois do 50-02 os executores de 50-03..50-09 rodam por ali, a cada onda, um smoke **em construção** que escreve em linhas
reais de PROD. O próprio cabeçalho do smoke (linhas 151-159) proíbe isso, mas nenhum documento que os executores leem repete a
proibição.

**Failure scenario:** O executor do 50-07, na amostragem de onda, roda o «Quick run command». A cláusula nova, ainda incompleta, faz
`UPDATE candidaturas SET deleted_at = now()` num bloco que termina sem `RAISE P50C1`, e o resto do smoke passa. A requisição commita:
a candidatura de um titular real fica marcada como excluída, sem teto de lock e sem leitura de persistência.

**Fix:** a barreira estrutural fica no próprio smoke, e não em cada plano. A primeira instrução do arquivo recusa rodar fora do
ensaio:
```sql
DO $p50_so_ensaio$
BEGIN
  IF coalesce(current_setting('p50.tx', true), '') <> txid_current()::text THEN
    RAISE EXCEPTION 'P50C FAIL (ensaio): este smoke ESCREVE (envelopes P50C1) e so roda dentro de scripts/p50_ensaio.cjs — p46apply.cjs run e proibido';
  END IF;
END
$p50_so_ensaio$;
```
Com isso, `p46apply run` do smoke falha antes de qualquer escrita, para todo plano e executor. O ensaio e o runner de mutações
continuam verdes, porque o `PREFIXO` grava `p50.tx`.
- No 50-10:164, usar a forma do verify #2 do 50-02, com `smoke50=13/13`.
- No `50-VALIDATION.md`, trocar o «Quick run command» e o «real depois» pelo ensaio `--sem-migracoes`.

Se a guarda entrar no smoke antes do apply, ela é código: pede um `50-REVIEW-TRACER-4`. Se não entrar, ela tem de entrar antes do
50-07 acrescentar escritas.

### WR-04 (carregado do WR-04 do TRACER-2): «VISTA EXTERNA MUDOU SEM TRAFEGO» acusa exposição sem conferir os atores, a dependência entre relações, nem o snapshot da própria captura

**File:** `50-02-PLAN.md:190-191` (verify #3) · `supabase/tests/p50_vistas_externas.sql:43-51, 86-104`

**Issue:** Os dois modos do TRACER-2 continuam como estavam:
1. o verify #3 não compara `a.ids`/`d.ids`;
2. a vista de R depende de outras relações (`historico_candidatura` e `v_triagem_panel` do candidato).

Há ainda o TypeError em `Object.keys(a.pop_fp)` quando o log não tem `pop_fp`. A rodada acrescentou ao cabeçalho da sonda a admissão
de um **terceiro** modo. Rodada avulsa (`p46apply run`, que é como o Step 1 a e o verify #3 a rodam), a sonda está em READ COMMITTED,
e «dentro de UMA captura, cada EXECUTE vê o banco num instante diferente». Se a vista de um ator for lida depois de um commit e o
`pop_fp` daquela relação antes dele, a captura sai com vista mudada e `pop_fp` igual. O verify #3 lê isso como `MUDOU SEM TRAFEGO`,
que o `fails_when` chama de «possible exposure, STOP». O ensaio reverso, agora sem janela, não tem poder de limpar esse veredito,
porque o plano só o deixa limpar o `AMBIGUO`.

**Failure scenario:** O mesmo do TRACER-2: um titular-fixture removido entre as capturas, ou uma vaga ativada no meio da captura
«depois». Sai STOP com diagnóstico de exposição contra um apply correto.

**Fix:** o do TRACER-2:
- tratar `a.ids` ≠ `d.ids` como `ATOR MUDOU`;
- usar `ex` só com o `pop_fp` global igual;
- validar `pop_fp`.

E mais duas coisas:
- rodar as duas capturas avulsas em RR. O arquivo não pode ter `SET TRANSACTION` próprio, porque no ensaio daria 25001. Então
  prefixar no comando, por exemplo com `node -e` que lê o arquivo e envia `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;\n` +
  conteúdo pela mesma via;
- deixar o ensaio reverso (agora sem janela) decidir **todo** vermelho do verify #3, e não só o `AMBIGUO`.

### WR-05 (carregado do WR-05 do TRACER-2): o 50-07 numera M7..M18 e exige `18/18` — colide com os M7..M11 existentes

**File:** `.planning/phases/50-acesso-do-recrutador/50-07-PLAN.md:28, 34-35, 172, 180-192, 195-200, 229, 241`

**Issue:** Sem mudança. O runner tem 11 mutações (`MUTACOES.length`), e as 12 planejadas levariam a 23. Há duas saídas, e as duas são
ruins:
- o portão fica vermelho para sempre com `18/18`;
- o executor renumera ou apaga M7..M11, e o claim, o mesmo papel e a borda voltam a ficar sem vigia.

**Failure scenario:** O do TRACER-2.

**Fix:** O do TRACER-2:
- M12..M23;
- `N = MUTACOES.length`, sem `PULADA`;
- `rotulos` para cada mutação nova (veja também o WR-01: M1/M4/M5 sem rótulo);
- `contains` por checagem de ids sem buraco.

### WR-06 (carregado do WR-06 do TRACER-2): o 50-10 não herdou as amarrações do apply/push e fixa `18/18`

**File:** `.planning/phases/50-acesso-do-recrutador/50-10-PLAN.md:154-155, 170-171, 189, 191, 234`

**Issue:** Sem mudança:
- o apply não amarra o `reviewed_head`;
- `efdeploy` confere só `supabase` limpo;
- o push roda sem `--revisoes`/`--aplicado`;
- a contagem fixa é `18/18`.

A linha 164 é o WR-03 acima.

**Failure scenario:** O do TRACER-2: um `fix(50-0N)` entre a revisão e o apply, ou entre o apply e o push, vai a PROD ou ao `main` sem
revisão.

**Fix:** Portar a cadeia do Step 2 e do Task 3 do 50-02 com `50-REVIEW-ACESSO`, e trocar `18/18` por `MUTACOES.length`.

### WR-07 (carregado do WR-07 do TRACER-2): `capturar()` ainda não lê os corpos das funções que 0002–0004 vão reescrever

**File:** `scripts/p50_ensaio.cjs:23-24, 243-253`

**Issue:** Sem mudança. O WR-02 desta rodada estreita muito o caminho de commit no meio do ensaio. Mas o próprio cabeçalho admite que
um terminador grava «o que veio antes», e as escritas de `CREATE OR REPLACE FUNCTION` de 0003/0004 continuam invisíveis ao
`PERSISTIU`.

**Failure scenario:** O do TRACER-2, por um caminho que escape às duas guardas (IN-01).

**Fix:** O do TRACER-2: `funcoes` = `md5(prosrc)||proacl||prosecdef||proconfig` de toda função de `public`, por forma, antes do
primeiro ensaio de 0002–0004.

### WR-08 (carregado do WR-08 do TRACER-2): para `anon`, a sonda segue gravando `e:42501` como fotografia

**File:** `supabase/tests/p50_vistas_externas.sql:168-183` (desde a rodada: 171-186)

**Issue:** Sem mudança no corpo da sonda. Para `anon`, «igual» entre duas recusas não prova nada sobre a policy.

**Failure scenario:** O do TRACER-1/2, na expansão: uma policy `{public}` alargada abre para `anon`, e a sonda segue `vistas=igual`.

**Fix:** O do TRACER-1/2: fingerprint das policies aplicáveis a `anon` e `has_table_privilege('anon', rel, 'SELECT')`, com `e:42501`
marcado `cego`, antes do 50-07.

## Info

### IN-01: `terminadores()` — um `BEGIN ATOMIC END;` de corpo vazio deixa o modo atômico ligado e engole toda instrução seguinte

**File:** `scripts/p50_ensaio.cjs:365-377`

**Issue:** `CREATE PROCEDURE p() LANGUAGE sql BEGIN ATOMIC END; COMMIT;` passa sem recusa (medido offline: o único dos 35 casos que
errou). A instrução que abre o modo já contém o `END`, então `atomico` só desliga num `END` isolado que nunca vem. A marca `p50.tx`
ainda pega o `COMMIT` em tempo de execução, mas depois do fato.

**Fix:** não entrar no modo quando a própria instrução termina o corpo, por exemplo
`if (/\bBEGIN\s+ATOMIC\s+END$/i.test(s)) continue;` antes de `atomico = true`. Ou recusar `BEGIN ATOMIC` em partes do ensaio, já que
nenhum arquivo do repositório usa.

### IN-02: a mensagem da marca afirma «o que veio antes PERSISTIU» mesmo quando nada persistiu

**File:** `scripts/p50_ensaio.cjs:139, 154`

**Issue:** A marca dispara em qualquer fim de transação. Medi com `ROLLBACK;`: nada foi gravado, e a mensagem diz que persistiu. O
`capturar()` do CLI, que vem depois, não acusa diferença. O operador recebe duas afirmações que se contradizem.

**Fix:** `… a transacao da requisicao terminou dentro de X — o que veio antes PODE ter persistido (ver a leitura de persistencia); o
ensaio parou aqui`.

### IN-03 (carregado do IN-01 do TRACER-2): o Step 2 e o enumerador leem a revisão da árvore de trabalho

**File:** `50-02-PLAN.md:179` · `scripts/p50_enumera.cjs:76-104`

**Issue:** Sem mudança. O verify do Task 1 cobre «commitada uma vez», mas o Step 2 lê `"$F"` do disco.

**Fix:** O do TRACER-2: `git show "$S:$F"` e `git status --porcelain -- "$F"` vazio.

### IN-04 (carregado do IN-02 do TRACER-2): `capturar()` acusa `PERSISTIU` por tráfego legítimo

**File:** `scripts/p50_ensaio.cjs:243-253`

**Issue:** Sem mudança. O RR não muda isso, porque `capturar()` roda em requisições separadas, antes e depois.

**Fix:** O do TRACER-2.

### IN-05 (carregado do IN-03 do TRACER-2): `capturar()` depois do envio, no CLI, sem `try`

**File:** `scripts/p50_ensaio.cjs:512`

**Issue:** Sem mudança. A rodada moveu o `compor` para antes do `capturar()` de baseline, o que está certo: a recusa sai sem rede. A
leitura de depois segue sem `try`.

**Fix:** O do TRACER-2: `PERSISTENCIA NAO MEDIDA` e exit 1.

### IN-06 (carregado do IN-04 do TRACER-2): população da varredura registrada (345) defasada

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:127-129`

**Issue:** O padrão do CLAUDE.md §Portões acha 346 linhas hoje. A 346ª é a própria prosa do cabeçalho.

**Fix:** O do TRACER-2.

### IN-07 (carregado do IN-05 do TRACER-2): advisory lock do `anti_lockout` e linhas-semente não registrados

**File:** `supabase/tests/p50_acesso_recrutador_smoke.sql:35-47, 205-215`

**Issue:** Sem mudança.

**Fix:** O do TRACER-2.

### IN-08 (carregado do IN-06 do TRACER-2): o push do 50-11 roda o enumerador sem `--revisoes`/`--aplicado`

**File:** `.planning/phases/50-acesso-do-recrutador/50-11-PLAN.md:165`

**Issue:** Sem mudança.

**Fix:** O do TRACER-2.

### IN-09 (carregado do IN-07 do TRACER-2): orçamento de lock por instrução e `anon` com `statement_timeout = 3s` fora do cabeçalho

**File:** `supabase/migrations/20261005000001_p50_helper_candidaturas.sql:33-44` · `scripts/p50_ensaio.cjs:43-48`

**Issue:** Sem mudança.

**Fix:** O do TRACER-1.

### IN-10 (carregado do IN-08 do TRACER-2): o aviso (c) do Task 1 não diz que as filhas e o avanço de etapa seguem por posse até a expansão

**File:** `50-02-PLAN.md:138`

**Issue:** Sem mudança.

**Fix:** O do TRACER-1.

### IN-11 (carregado do IN-09 do TRACER-2): `sec05_08_smokes.sql` fica vermelho contra o apply correto até o 50-08

**File:** `50-02-PLAN.md` (ausente) · `supabase/tests/sec05_08_smokes.sql:189, 196`

**Issue:** Sem mudança.

**Fix:** O do TRACER-1: registrar no SUMMARY.

## Verificado e correto (não são achados)

- **Migration intacta.** Diff vazio desde `e80d9bb6`; md5 `e7383d5d736a75f2b9fe7d862ea4308a`.
- **Ensaio em RR, apply em RC: divergência inócua para a 0001.** O apply real (`p46apply migrate`) roda em READ COMMITTED; o ensaio,
  agora, em RR. Os portões da migration leem só catálogo:
  - PRÉ-PORTÃO: `pg_proc` e `pg_policies`;
  - PÓS-PORTÃO: `pg_proc`, ACL e `pg_policies`.

  A linha 178 está no corpo do helper, não num portão. Por isso o que foi ensaiado é o que roda. Isso precisa ser reconferido se 0002–0004 tiverem portões que leiam dados.
- **Ordem do PREFIXO.** `SET TRANSACTION` → `SET LOCAL` ×2 → `SELECT set_config('p50.tx', txid_current())` → reset das GUCs →
  asserção de isolamento. O primeiro `SELECT` é o que toma o snapshot. Uma inversão vira `25001` alto (medido), não um no-op calado.
- **`ponto()` depois de cada parte.** Ele acrescenta `RESET ROLE`, e nenhuma parte depende de papel herdado. A migration composta segue
  byte a byte a do apply, só com instruções depois dela. A marca roda depois da mutação e **antes** do smoke, então um terminador na
  mutação é pego antes de o smoke poder «morder» por cima dele.
- **Rodadas re-executadas, todas abortadas, com leitura de persistência:**
  - runner: `controle verde; 11/11 mutacoes mordem; nada persistiu`, com os rótulos declarados (M7..M11) e a baseline igual no fim
    (`politicas(public)=155 usuarios_rh=7 borda=0`);
  - `--vistas` + smoke: `vistas=igual · smoke50=7/7`;
  - Step 1 d: `vistas=igual`;
  - exposição semeada: `P50V FAIL (vistas)`;
  - `COMMIT` em `--mutacao`: `P50E RECUSADO (transacao) … (nada enviado)`.
- **Verify #2.** A forma e a regex foram conferidas acima. Os `fails_when` cobrem `PERSISTIU`, timeouts e `40001`. Neste último,
  a linha real contém `could not serialize access` pelo `primeiraFalha()`.

---

_Reviewed: 2026-10-05T19:49:56Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
