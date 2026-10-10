---
phase: 51-consertos-da-jornada-bloco-3
reviewed: 2026-10-10T06:08:32Z
depth: deep
diff_base: ef7fa24c690474245dd5b0363c436222e8981381
reviewed_head: c35cd52408040a0258730641fead1612fcffe2a8
scope: review adversarial bloqueante nº 1 dos gaps da Phase 51 (re-review do conserto, antes do apply em PROD da 20261010000001). Escopo — o diff de código inteiro `ef7fa24c..c35cd524 -- . ':!.planning'` (24 arquivos, inclusive os três commits `test(51-validacao)` do JORN-48 — 4eb383f8, 138a5d2f, 39c92206 — nunca revisados antes) e os planos 51-22, 51-23 e 51-24, lidos como os programas que escrevem em PROD. Lidos como contexto, fora da lista revisada — CLAUDE.md, 51-GAPS-DECISAO, 51-SECURITY (T-51-14, UF-3), 51-REVIEW-DISPOSITION, SUMMARYs 51-18..51-21, 51-19-TEXTO-APROVADO, 51-22-CORPO-ANTES.sql, a 20261008000004 (corpo e plano), a 20261008000001 (get_avaliacao_status), p46apply.cjs, p51_portao.cjs, a EF executar-direito-titular (contagemDe, somarPassosDoBanco, helpers), avaliar-redacao, AvaliacaoContainer e AvaliacaoRavenScreen.tsx:143-146. PROD só leitura (`set transaction read only`) ou em requisições que abortam. Medido — corpo da 0001 = corpo da 0004 = corpo de 51-22-CORPO-ANTES (byte a byte, md5 a68e4a6a…, extraído pelo delimitador nomeado) mais EXATAMENTE quatro edições (declaração `v_n_disp`, DELETE + GET DIAGNOSTICS no fim de `tombstone_candidato`, chave `disponibilidade` no retorno, campo `disponibilidade=%` no terminador), corpo novo md5 9b87e5ee… = `v_pin_anon` do p45; PROD com md5 vivo a68e4a6a…, plano 0a4996fe…, `config_purga.modo = dry_run`, cabeça do ledger 20261008000005, nenhuma 20261010%, anon sem EXECUTE, `disponibilidade` com 1 trigger e 0 FK apontando para ela; população — 2 reconhecidos pela igualdade do motor = 2 pela sentinela de nome = 2 por prefixo = 2 exclusões com passo postgres concluído, 0 exclusão concluída fora do reconhecedor, 2 linhas-alvo. Re-executados — ensaio `--vistas --migracoes=0001` + p45 (VERDE, vistas=igual, `g1a:anon=9b87e5ee…`); ensaio padrão (0001+0002) + p45 e + p46_purga (VERDES, `g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual`); `p51_mutacoes.cjs --so=MD1,MF1,MF2` (controle 45m=40/40; 3/3 mordem pelos rótulos B25/respondido, B26/apagou, B26/outros; nada persistiu); duas mutações do revisor na 0001, em ensaio que aborta (OR no escopo → POS-PORTAO (2); DELETE movido para fora do passo → POS-PORTAO «0 no passo, 1 no motor») — as duas mordem; vitest dos 8 arquivos de teste do diff (67 verdes) e de exportAllowlist (41 verdes); os testes do G2 contra as quatro telas de ef7fa24c num worktree descartável (5 de 10 vermelhos — mordem); os testes do JORN-48 contra os componentes de refs/gsd/51-03/base (6 vermelhos — mordem); `check:recibo-exclusao` OK; texto de 51-19-TEXTO-APROVADO = JSON = espelho da EF = .generated.ts nos dois tempos; `p51_portao.cjs --auto-teste` (68 ok); montagem offline das mutações. Nada foi aplicado, publicado ou empurrado. O único commit é este arquivo.
files_reviewed: 27
files_reviewed_list:
  - docs/compliance/__tests__/genReciboExclusao.test.ts
  - docs/compliance/pii-inventory.md
  - docs/compliance/pii-inventory.yaml
  - docs/compliance/recibo-exclusao.json
  - docs/compliance/sql/gen-recibo-exclusao.cjs
  - scripts/p51_ensaio.cjs
  - scripts/p51_mutacoes.cjs
  - src/components/__tests__/ScoreCard.test.tsx
  - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/LiberacaoCognitivoBlock.test.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/ProvaCognitivaScreen.conclusao.test.tsx
  - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
  - src/features/avaliacao/components/RedacaoEditorScreen.tsx
  - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
  - src/features/avaliacao/components/__tests__/conclusao-cache.test.tsx
  - src/features/avaliacao/lib/__tests__/avaliacaoStatusCache.test.ts
  - src/features/avaliacao/lib/avaliacaoStatusCache.ts
  - src/features/entrevista/components/__tests__/CognitivoBandCard.nome.test.tsx
  - src/features/privacidade/components/__tests__/ReciboExclusao.test.tsx
  - src/features/privacidade/constants/reciboExclusao.generated.ts
  - supabase/functions/_shared/reciboExclusao.ts
  - supabase/migrations/20261010000001_p51_motor_apaga_disponibilidade.sql
  - supabase/migrations/20261010000002_p51_limpa_disponibilidade_anonimizados.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - .planning/phases/51-consertos-da-jornada-bloco-3/51-22-PLAN.md
  - .planning/phases/51-consertos-da-jornada-bloco-3/51-23-PLAN.md
  - .planning/phases/51-consertos-da-jornada-bloco-3/51-24-PLAN.md
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 51: Code Review Report — gaps G1a / G1b / G2 (re-review do conserto, nº 1)

**Reviewed:** 2026-10-10T06:08:32Z
**Depth:** deep
**Files Reviewed:** 27: os 24 arquivos de código do diff `ef7fa24c..c35cd524` e os planos 51-22, 51-23 e 51-24
**Status:** issues_found, com 0 crítico

## Summary

Parti do pressuposto de que havia um blocker, como já aconteceu duas vezes neste projeto. Procurei primeiro onde ele
causaria mais dano:

- o apagamento do motor escapando do titular;
- a limpeza destrutiva alcançando quem não é tombstone;
- um portão que não morde;
- o recibo dizendo uma coisa e o banco fazendo outra;
- a ordem de publicação.

**Não achei crítico.** O que conferi e está certo, com evidência:

- **G1a, motor (0001).** O corpo é o vivo de hoje, mais quatro edições e nada além delas. Conferi com um diff
  de `51-22-CORPO-ANTES.sql` contra a 0004 e contra a 0001, extraindo pelo delimitador nomeado:
  - o DELETE é `WHERE d.candidato_id = p_candidato_id`, sem `OR`;
  - ele está no fim de `tombstone_candidato`, depois do UPDATE de `candidaturas`;
  - portanto vem depois das guardas (a)–(c)/(p) e do retorno `ja_anonimizado`.

  O plano já contava `disponibilidade` pela mesma expressão, então dry-run e delete real saem da mesma
  expressão. A EF soma os números do bloco (`contagemDe`) e não fixa chaves. A purga em ensaio guarda o
  `SQLERRM` em `relato_dry_run`, que é `text`, e nada interpreta a mensagem por regex. O PRE e o POS estão
  certos:
  - md5 medido;
  - `dry_run`;
  - prova negativa;
  - ACL, comentário e propriedades iguais;
  - `anon` sem EXECUTE;
  - conjunto de alvos = D-62 ∪ G1a.

  As duas mutações do revisor na própria migration mordem o POS.
- **G1a, limpeza (0002).** O reconhecedor é a igualdade do motor (CR-06), sem sentinela de nome nem padrão
  de e-mail. Não há constante de população. A evidência traz só contagens e md5. Nada é escrito fora de
  `public.disponibilidade`. A baseline do `(outros)` é capturada na execução, com `to_jsonb` da linha
  inteira, e L1/L2 já mordiam (51-21). Duas execuções são impossíveis: o ledger recusa a versão repetida e o
  `(alvo)` recusa com zero linhas. A população de PROD bate nas quatro leituras independentes (2/2/2/2), e
  nenhuma exclusão concluída fica fora do reconhecedor.
- **Ensaio e runner.** O ensaio aborta e `capturar()` bate. O `--so` seleciona na ordem declarada. As
  mutações são montadas sobre o corpo vigente (`fnMotor` → a 0001), e MF1/MF2/MD1 mordem pelos rótulos
  certos.
- **G2.** A chave é a de `avaliacaoStatusKey`, igual em valor à do container. Nenhuma escrita acontece em
  falha nem em `locked`/`LOCKED`: nas quatro telas o helper só roda depois do `await` resolvido e depois do
  desvio `locked`. O cache não recebe nenhum número, só `registrado: true`. A ordem é
  `setQueryData` → `invalidateQueries`. Na Redação, o cache é escrito só no envio que completa o conjunto.
  Os testes reprovam sem o conserto (medido num worktree com as quatro telas de `ef7fa24c`: 5 vermelhos).
  Todo caminho 200 da `avaliar-redacao` grava linha em `scores_candidato`, então «registrado» no cache não
  promete o que o servidor não tem.
- **G1b.** A frase da UF não diz «relatório agregado». O texto é byte a byte o de `51-19-TEXTO-APROVADO.md`
  nos dois tempos, em JSON, no espelho da EF e em `.generated.ts`. `exportAllowlist.ts` e
  `export-allowlist.json` estão intactos. A mudança de `colunas_origem` (`disponibilidade.candidato_id` →
  `dados_de_cadastro`/`tombstone_candidato`) é coerente com o motor novo. A única EF que embute o recibo é
  `executar-direito-titular`.
- **Planos.** A ordem é motor (51-22) → limpeza (51-23) → EF → cliente (51-24), travada pela regra (8). Cada
  escrita em PROD está amarrada por `&&` ao portão no mesmo comando. O push é por sha, com `p50_enumera` e a
  lista de caminhos, que cobre os 24 arquivos do diff, nem mais nem menos (conferido contra
  `origin/main..HEAD`). O marcador é conferido no chunk certo.
- **JORN-48.** Os três testes renderizam o componente e asserem o texto visível, não uma fotografia de
  constante. Passam, e mordem contra os componentes de `refs/gsd/51-03/base` (6 vermelhos).

Ficaram quatro warnings:

- **WR-01:** o comentário do motor no catálogo continua dizendo que ele «não remove linha de tabela
  alguma», e o POS **exige** que continue assim.
- **WR-02:** o vínculo da limpeza à população aprovada, no passo irreversível, existe só em prosa no 51-23.
- **WR-03:** a decisão do 51-23 não é conferida por máquina como commitada.
- **WR-04:** a invariante de persistência do ensaio fica vazia depois do 51-23 e nunca vigiou as linhas dos
  candidatos vivos. É justamente o que o MF2 apaga em PROD dentro da requisição.

Nenhum desses causa dano no apply do 51-22 tal como planejado.

## Warnings

### WR-01: o motor passa a apagar duas origens, e o comentário vivo continua dizendo «nao remove linha de tabela alguma» — com o POS travando o comentário velho

**File:** `supabase/migrations/20261010000001_p51_motor_apaga_disponibilidade.sql:1669-1671` (o `IF v_com IS DISTINCT FROM …`); o texto vivo está em `.planning/phases/51-consertos-da-jornada-bloco-3/51-22-CORPO-ANTES.sql` (linha do `COMMENT ON FUNCTION`), vindo de `supabase/migrations/20260823000006_p46_guard_purga.sql:1297`

**Issue:** o `obj_description` de `anonimizar_candidato` em PROD diz, nesta ordem:

- «⚠ O QUE ESTA FUNCAO NUNCA FAZ: nao remove linha de tabela alguma»;
- «MAPA passo_motor -> statements: tombstone_candidato = os DOIS updates em candidatos … MAIS o update em
  candidaturas».

Depois desta migration, o motor apaga linha em cinco tabelas: as quatro do D-62 e `disponibilidade` no
próprio `tombstone_candidato`. O comentário já estava defasado desde o D-62, e agora a defasagem cresce.
O POS-PORTAO (5) **recusa o apply se o comentário mudar**, então o arquivo garante que o catálogo continue
afirmando o contrário do código.

Cenário concreto: um auditor ou a próxima fase lê o contrato pelo catálogo, que é o que o
`51-22-CORPO-ANTES.sql` registrou como «base de desfazer». O desfazer corretivo reaplica esse COMMENT. A
pessoa lê «nunca remove linha» e vê um `DELETE FROM public.disponibilidade` no passo do tombstone. A leitura
mais natural é «violação do ERASE-08 a consertar». É o mesmo modo de falha que este projeto já registrou
(«instrução de conserto pode estar uma rodada atrasada»): documento oficial e defasado com autoridade.

**Fix:** não reabrir a 0001 a esta altura, porque o md5 do arquivo é o que o review amarra. Registrar em
`deferred-items.md` uma migration de COMMENT, aditiva e sem tocar no corpo. Ela deve fazer duas coisas:

- acrescentar ao texto vivo um parágrafo «EXCEÇÕES EXPLÍCITAS AO "NUNCA REMOVE LINHA": D-62 (quatro tabelas
  de múltipla escolha, `apagar_respostas_e_producoes`) e G1a (`disponibilidade`, `tombstone_candidato`,
  2026-10-10)»;
- corrigir o MAPA.

O POS dela confere `v_com = <comentário antigo> || <parágrafo>`. Se o operador preferir resolver no 51-22,
então a 0001 ganha o `COMMENT ON FUNCTION`, e o POS (5) troca a igualdade por
`v_com = current_setting('p51.g1a.comment') || <parágrafo>`. Isso exige um review novo.

### WR-02: no 51-23, o vínculo da limpeza irreversível à população aprovada é prosa, não programa — o código que roda no passo de mão única não passa por review

**File:** `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-PLAN.md:207-211` (Task 3, Passo 1, elos (i) e (ii))

**Issue:** o 51-22 escreve byte a byte cada elo do comando de apply (o terceiro `<verify>` da Task 2 é
`node -e` completo, e o Passo 2 manda repeti-lo «byte a byte»). O 51-23, no único passo irreversível da
fase, só descreve:

- (i) «a medição canônica do contexto, gravada em `${TMPDIR}/p51_23_agora.json`». O SQL do contexto não
  grava JSON. Falta o código que converte a saída do `p46apply sql` em arquivo.
- (ii) «um `node -e` que compara esse arquivo com `51-23-DECISAO.md` e recusa …». Esse `node -e` não
  existe no plano.

O executor vai escrever esse código na hora, no comando que antecede o DELETE, e ninguém o revisou.

Cenários concretos de comparação que deixa de recusar:

- comparar `linhas` como string com número sem `Number()`;
- ler `alvo_md5` de `51-23-POPULACAO.json` em vez de `alvo_md5_aprovado` da decisão, o que compara a
  medição com ela mesma;
- um regex de chave sem âncora `^`;
- `titulares >= j.titulares` invertido.

Todos passam silenciosos e entregam o apply a uma população que o operador não viu. O dano é limitado: o
PRE/POS da própria 0002 continua restringindo o apagamento às linhas de titulares tombstone, e `(outros)`
reprova se tocar qualquer outra. Por isso é warning, não crítico. Mas o must_have «vinculado à população
aprovada no MESMO comando» passa a depender de código não revisado, que é exatamente o que T-51-92 diz
mitigar.

**Fix:** escrever no plano o comando completo. No mesmo idioma do 51-22 Task 2 `<verify>` 3, seria algo
como:

```
node p46apply.cjs sql "set transaction read only; <a medição canônica>" | node -e "…lê o JSON, lê 51-23-DECISAO.md por ^chave:, compara Number(linhas)===Number(linhas_aprovadas), Number(com_disp)===Number(com_disp_aprovados), alvo_md5===alvo_md5_aprovado, Number(titulares)>=POPULACAO.titulares; recusa com 'POPULACAO DIFERE DA APROVADA: …'" && node scripts/p51_portao.cjs … --modo apply && node p46apply.cjs migrate supabase/migrations/20261010000002_p51_limpa_disponibilidade_anonimizados.sql
```

O comando também precisa de um caso de mordida registrado no SUMMARY da Task 1: rodar o comparador contra
uma decisão com `linhas_aprovadas` alterado num arquivo temporário, e ele tem de recusar.

### WR-03: a decisão do passo destrutivo (`51-23-DECISAO.md`) não é conferida como commitada e idêntica a HEAD — ao contrário da do motor

**File:** `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-PLAN.md:184` (Task 2 `<verify>`) e `:196`/`:207-211` (precondição e Passo 1 da Task 3)

**Issue:** no 51-22, o OK do motor só vale se o arquivo estiver em `git ls-files` e idêntico a HEAD
(`51-22-PLAN.md:216`). No 51-23, que é o passo **irreversível**, isso não é conferido:

- o `<verify>` da Task 2 lê o arquivo do disco e não confere se ele está commitado;
- o elo (ii) da Task 3 lê a cópia de trabalho;
- o portão não cobre a lacuna: a regra (7) do `p51_portao.cjs` só vigia `supabase src scripts e2e
  docs/compliance p46apply.cjs efdeploy.cjs database.types.ts`, e `.planning/` fica fora de propósito;
- a regra (4) do modo apply exige HEAD = pin, mas não exige que a decisão esteja no pin.

Cenário concreto: a decisão é escrita (ou corrigida, «só um número») e não é commitada, ou é editada depois
do commit. A Task 2 fica verde, o pin nasce, o apply roda, e o registro do que o operador aprovou nunca
existiu no repositório na forma que autorizou a destruição. O executor que «passa por cima de parada do
plano» (memória do projeto) tem aqui um caminho sem atrito.

**Fix:** copiar o guarda do 51-22 para o `<verify>` da Task 2 e para o elo (ii) da Task 3:

```
DEC=.planning/phases/51-consertos-da-jornada-bloco-3/51-23-DECISAO.md; git ls-files --error-unmatch "$DEC" >/dev/null 2>&1 && git diff --quiet HEAD -- "$DEC" && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$DEC")" refs/gsd/51-23/sha || { echo "SEM OK DO OPERADOR: 51-23-DECISAO.md ausente, nao commitado, modificado ou fora do pin" >&2; false; }
```

### WR-04: a invariante de persistência do ensaio fica vazia depois do 51-23 e nunca vigiou o que o MF2 apaga em PROD

**File:** `scripts/p51_ensaio.cjs:309-312` (`capturar()`: `fixtures` e `disp_anonimizados`); `scripts/p51_mutacoes.cjs:672-682` (MF2)

**Issue:** o próprio cabeçalho do ensaio diz que `capturar()` é a segunda linha de defesa, a que lê de fora
«o que nenhum ensaio pode mudar». Para a `disponibilidade`, ela vigia só as linhas dos titulares
**anonimizados**, e isso tem três buracos:

1. **População vazia depois do 51-23.** A limpeza leva `disp_anonimizados.linhas` a 0 por desenho. A partir
   daí, essa chave dá `0 → 0` em qualquer ensaio, aconteça o que acontecer: um portão que não pode mais
   falhar (memória «população vazia mente nas duas direções»).
2. **Os candidatos vivos nunca foram vigiados.** O MF2 roda contra PROD no 51-22 Task 3 e troca o escopo por
   `true`, ou seja, apaga dentro da requisição as 28 linhas de `disponibilidade` de PROD (medido hoje). Se
   um dia a premissa «uma requisição = uma transação» falhar (o tipo de defeito que o WR-02 do
   50-REVIEW-TRACER-2 já achou), 26 dessas linhas são de candidatos vivos, e o `capturar()` não tem chave
   que as conte.
3. **A fixture de controle da (B26) fica fora do padrão.** Ela é `p45smoke-ctl-…@invalido.local`, e o
   padrão de `fixtures` é `p51%smoke-%`. Um candidato de controle que persistisse também passaria.

Hoje, antes do 51-23, o MF2 que persistisse ainda seria pego pelas 2 linhas-alvo (`linhas 2 → 0`). Por isso
este achado não bloqueia o 51-22. Depois do 51-23, qualquer ensaio ou runner que apague a tabela e escape
do aborto imprime «nada persistiu».

**Fix:** acrescentar a `capturar()` uma chave que não envelheça com o tráfego e cubra as linhas dos vivos.
Por exemplo, contagem e `md5(string_agg(to_jsonb(d)::text, E'\n' ORDER BY d.id))` das linhas de
`public.disponibilidade` com `created_at <= <instante capturado no antes>`. Linhas antigas só mudam se
alguém as apaga ou edita, e um cadastro novo durante o ensaio não gera falso `PERSISTIU`. Também é preciso
alargar `fixtures` para cobrir `p45smoke-%@invalido.local`. E provar que a chave morde: comparar `capturar()`
antes e depois de um `diferencas()` com a linha alterada, offline.

## Info

### IN-01: Redação — o critério do cliente («último envio») diverge do critério do servidor («qualquer redação»)

**File:** `src/features/avaliacao/components/RedacaoEditorScreen.tsx:239-248` e `supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql:150-152`

**Issue:** o servidor dá `redacao.registrado = EXISTS(redacoes_candidato da candidatura)`, ou seja, verdade
já depois do **primeiro** envio de N. O cliente escreve só no último, como o G2 decidiu, e nos envios
intermediários nem invalida a entrada. Na prática:

- depois de um envio intermediário, a lista volta com o status de antes (até 5 min);
- depois disso, o servidor mostra «Concluído» com perguntas ainda abertas, e o `AvaliacaoContainer:388`
  mapeia `registrado` → `concluido`.

A divergência é do servidor e é anterior a esta fase. O conserto do cliente é internamente consistente com
a decisão do operador.

**Fix:** registrar em `deferred-items.md`, ao lado da entrada `(51-18)` de `pontuar_cognitivo`. A correção
do servidor é `registrado` = todas as perguntas ativas com redação. Um comentário no helper evitaria que
alguém «alinhasse» o cliente ao servidor na direção errada.

### IN-02: «a fábrica única `avaliacaoStatusKey` (a mesma do container)» não é verdade no código

**File:** `src/features/avaliacao/lib/avaliacaoStatusCache.ts:26`; os literais em `src/features/avaliacao/components/AvaliacaoContainer.tsx:484` e `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx:168`

**Issue:** o container e a SJT de múltipla escolha usam o literal `['avaliacao', 'status', candidaturaId]`,
não a fábrica. Hoje os valores são iguais. Se a fábrica ou o literal mudar, o helper passa a escrever numa
entrada que ninguém lê, e a lista volta a abrir do cache velho. Só o TRACER da prova cognitiva (que monta o
container real) pegaria isso. Os testes das outras três telas comparam com a própria fábrica.

**Fix:** trocar os dois literais por `avaliacaoStatusKey(candidaturaId)` num plano futuro. Fazer isso agora
tornaria o commit ALHEIO à lista de caminhos do push do 51-24. Até lá, corrigir o comentário para «igual em
valor ao literal do container».

### IN-03: a regra (8) acopla a publicação do G1b e do G2 à limpeza destrutiva, sem saída desenhada

**File:** `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-PLAN.md:163-167` (opção «vetar») e `51-24-PLAN.md:60`

**Issue:** a regra (8) do portão exige no ledger **toda** `*_p51_*.sql` do pin. Há duas situações em que a
`20261010000002` fica no disco e fora do ledger:

- o operador veta o passo destrutivo;
- o `(alvo)` da 0002 recusa porque a população sumiu, por exemplo um `candidatos` apagado com cascata.

Nos dois casos, o texto aprovado do recibo (G1b) e o conserto da lista (G2) ficam bloqueados por tempo
indeterminado. Nenhum dos dois depende da limpeza. O plano diz «volta ao planejador». A saída real, porém,
é mexer em código: remover ou renomear o arquivo da migration. Isso pede um review novo, sob pressão de
fecho.

**Fix:** decidir agora, por escrito na resposta (e) do 51-22, qual é a saída em caso de veto. Por exemplo:
um commit que move a 0002 para fora de `supabase/migrations/`, com o caminho incluído na lista do push, mais
um review curto. Assim a saída não fica para ser inventada no meio do 51-23.

---

Sobre o que **não** é achado, porque foi conferido e está certo:

- O `alvo=<md5>` da evidência é md5 de UUIDs de tombstones. Não é PII e não é reversível sem acesso ao banco.
- As listas literais novas, todas declaradas como escopo e não como fotografia:
  - `v_alvos_ok`, `v_g1a_permit`, `v_esperado := 40`;
  - `v_md5_medido`;
  - `aplicadas=[…]` do 51-22 Task 3.

  Cada uma vale para um instante ou para uma decisão nomeada, e reprova para o lado seguro.
- O texto aprovado não entra no `&&` do deploy do 51-24. Mesmo assim, o portão (5)+(7) garante que a EF sai
  do código revisado, e esse código carrega o texto aprovado (medido).

---

_Reviewed: 2026-10-10T06:08:32Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
