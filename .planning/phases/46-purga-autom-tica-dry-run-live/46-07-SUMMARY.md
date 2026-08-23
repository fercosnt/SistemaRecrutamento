---
phase: 46-purga-autom-tica-dry-run-live
plan: 07
subsystem: database
tags: [postgres, plpgsql, lgpd, purga, retencao, authz, auditoria, portao, kill-switch, runbook, checkpoint]
status: checkpoint

requires:
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 02
    provides: "public.config_purga (singleton com RLS ligada e ZERO policy de escrita — a ausencia de caminho de escrita e o que torna esta RPC O caminho) e public.purga_execucoes (o ledger sobre o qual os tres criterios de D-46-14 sao medidos)"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 06
    provides: "o cron purga-retencao-sweep VIVO em PROD (0 3 * * *) e a varredura v3 — o gatilho que faz o ledger acumular a evidencia que este portao exige"
  - phase: 43-matriz-retencao
    provides: "20260801000002 — o molde integral da escrita auditada (guard NULL-safe, ator no servidor, nao-op como recusa, trilha no mesmo corpo) E o COMMENT da coluna origem, que declara a pre-condicao de D-46-22 dentro do banco desde 2026-08-01"
provides:
  - "supabase/migrations/20260823000013_p46_salvar_config_purga.sql — a UNICA porta de escrita de config_purga, com o portao do flip recusavel no servidor"
  - "supabase/tests/p46_purga_smoke.sql — assercoes (d) e (e); RESUMO (z) 25 -> 27 (o total FINAL da fase)"
  - ".planning/phases/46-purga-autom-tica-dry-run-live/46-07-RUNBOOK-FLIP.md — o documento do periodo de dry-run e do teardown"
  - "⚠ O RECORTE POR MODO em D-46-14: os tres criterios contam SO execucoes em dry_run ou live — sem ele, 14 noites com a purga DESLIGADA abririam o portao"
affects: []

actuals:
  tokens: 24600
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Portao guardado por 'o modo novo e live', e nao por 'o modo mudou': e essa guarda que torna a transicao para off inalcancavel pelos criterios. Um kill switch que pode ser recusado nao e um kill switch, e o momento em que ele mais importa e exatamente aquele em que algum criterio estaria falhando"
    - "Criterio de janela temporal medido sobre um RECORTE de modo e nao sobre a tabela inteira: uma execucao em off retorna antes de qualquer item e nao contem evidencia nenhuma sobre o caminho que o portao autoriza. Contar heartbeats de desligado como dias de ensaio e o dry-run decorativo renascendo dentro do proprio criterio que existe para bani-lo"
    - "Allowlist de modos JAMAIS negacao de off: o CHECK de 20260823000009 admite tambem 'ausente', o valor fail-closed que a reconciliacao grava quando NAO conseguiu ler o cerco — uma negacao o deixaria CONTAR, e um modo novo contaria por omissao"
    - "Pre-condicao de POLITICA medida com guarda de vacuidade acoplada: 'nenhuma etapa da allowlist em seed' e verdade por AUSENCIA DE SUJEITO quando a allowlist esta vazia. Uma condicao que so pode ser satisfeita por ausencia de sujeito nao e uma condicao"
    - "Nao-op com ramo DEDICADO para o estado desejado: quem chama off as tres da manha esta acionando o kill switch, e uma mensagem generica de 'nada a alterar' seria lida, com razao, como 'o kill switch falhou'"
    - "Assercao que planta o proprio estado em vez de depender do real: o ledger sintetico nao existe porque hoje nao da — existe porque daqui a duas semanas o estado real passaria a satisfazer os criterios sozinho e dois casos negativos ficariam VERDES sem medir nada"
    - "Fronteira PINADA em vez de herdada do historico: sem o pino, o caso positivo continuaria passando mas deixaria de exercitar a borda — que e como um contrato de fronteira deixa de ser um contrato de fronteira sem ninguem perceber"
    - "Mutacao destrutiva de teste escopada + aninhada + MEDIDA: escopada aos modos que o criterio conta, revertida por subtransacao propria quatro statements depois, e a restauracao aferida por impressao digital capturada antes do envelope"
    - "Marco temporal RECUPERAVEL do banco em vez de anotado: o runbook traz o slot de T0 e, logo abaixo, a consulta que o recupera da trilha de auditoria — um marco que depende de alguem lembrar de anota-lo nao existe (licao do 42-12)"

key-files:
  created:
    - supabase/migrations/20260823000013_p46_salvar_config_purga.sql
    - .planning/phases/46-purga-autom-tica-dry-run-live/46-07-RUNBOOK-FLIP.md
  modified:
    - supabase/tests/p46_purga_smoke.sql

key-decisions:
  - "Os tres criterios de D-46-14 contam SO execucoes em dry_run ou live (Rule 2): sem o recorte, catorze noites com a purga desligada satisfariam o portao. Medido: as 3 linhas vivas do ledger estao em off e UMA delas ja tem elegiveis = 4"
  - "Parametro nulo significa 'nao alterar este campo', divergindo do molde da Phase 43 onde nulo era invalido: a funcao escreve tres campos independentes, e obrigar o reenvio dos outros dois transformaria 'ajustar o cap' numa oportunidade de mudar o MODO por descuido"
  - "Sexta condicao acrescentada ao portao: a allowlist nao pode estar VAZIA, senao 'zero etapas em seed' e verdade por vacuidade e o portao aprova o flip de uma purga que nao alcanca estado nenhum"
  - "Ramo dedicado de nao-op quando a purga JA ESTA em off, com mensagem que diz que o estado desejado ja vale — a alternativa era a mensagem generica ser lida como falha do kill switch"
  - "Severidade sobe para critico (o topo do enum vivo) quando o destino e live, e o valor e conferido no APPLY por bloco de auto-verificacao — um rotulo que sumiu faria a funcao levantar 22P02 na PRIMEIRA mudanca de modo"
  - "GRANT ao papel autenticado e nao ao papel de servico: a funcao e chamada pela tela do administrador com o JWT da pessoa, e e desse JWT que saem o papel do passo (1) e o ator do passo (2)"
  - "O bloco de auto-verificacao ABORTA o apply se config_purga tiver ganho policy de escrita — T-46-07-01 so e verdade enquanto esta funcao for o unico caminho, e instalar o portao por cima de uma porta aberta seria criar a APARENCIA do cerco"
  - "A asserção (d) planta 14 execucoes sinteticas e monta cada negativa quebrando UM criterio dentro de subtransacao aninhada revertida na hora — o estado real nao e usado por decisao nenhuma do bloco"
  - "O caso do 'menos de 14 execucoes' e o unico que exige DELETE, e ele e escopado aos modos que o criterio conta: as linhas de heartbeat em off, que hoje sao TODAS as reais, nunca sao tocadas"
  - "A restauracao do ledger e medida DEPOIS do rollback, unica excecao legitima a regra do cabecalho do smoke: o que se afere e que o estado VOLTOU, o que e verdade exatamente quando o run esta correto"

requirements-completed: []  # PURGA-03/04/05 NAO fecham aqui — ver §Requirements

metrics:
  duration: ~85min
  completed: 2026-08-23
---

# Phase 46 Plano 07: O portão do flip — Summary

A purga ganhou a única porta de escrita da própria configuração, e essa porta **recusa**. O flip
`dry_run → live` deixou de ser uma frase num checklist e passou a ser uma expressão avaliada no
servidor, em toda chamada, sobre o ledger e sobre a matriz de retenção — e a transição para `off`
foi deliberadamente deixada **fora** desse portão, porque um kill switch que pode ser recusado não é
um kill switch.

⚠ **NADA FOI APLICADO E `config_purga.modo` CONTINUA EM `'off'`.** Uma migration, duas asserções de
smoke e um runbook — tudo no disco. O apply, os smokes contra PROD, o `db:types`, a prova ao vivo da
recusa e o flip `off → dry_run` são a Task 3 e pertencem ao orquestrador.

⚠ **`status: checkpoint`, e não `complete`, DE PROPÓSITO** — mesma razão do 46-05 e do 46-06.
**Condição exata para virar `complete`:** `20260823000013` no ledger com `md5(statements[1])`
conferido dos dois lados, `database.types.ts` contendo `salvar_config_purga`, os cinco smokes verdes
com o contador de PASS lido do GUC (`p46_purga_smoke` em **27/27**), a recusa real de `live`
registrada com a mensagem inteira, e `config_purga.modo = 'dry_run'` com linha de auditoria e `T0`
anotado.

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1 | `salvar_config_purga` — a escrita auditada e o flip recusável | `02cb45e` |
| 2 | As duas asserções do portão — `(d)` e `(e)`; RESUMO 25 → 27 | `8a0c55c` |
| 1+2 | ⭐ O recorte por modo em D-46-14 (Rule 2 — ver §Deviations) | `07ece24` |
| 5 | `46-07-RUNBOOK-FLIP.md` | `053debf` |
| 3 | ⏸ **APPLY + SMOKES + A RECUSA AO VIVO + O FLIP PARA `dry_run` — do orquestrador** | — |
| 4 | ⏸ **CHECKPOINT DIFERIDO** — o flip para `live`, ≥ 14 dias depois | — |

Zero `--no-verify`: o hook de type-check rodou nos quatro commits e reportou **96 erros — o baseline
congelado**, inalterado. Nenhum arquivo TypeScript foi tocado.

**md5 do arquivo de migration, para a conferência cruzada do apply:**

| Forma | Valor |
|---|---|
| `printf '%s' "$(cat …)" \| md5` (a do protocolo, sem o `\n` final) | `c410a6723d0f8557bc3c7b13e7ddc7b0` |
| `md5 -q <arquivo>` (byte a byte, com o `\n` final) | `63feeec5f3d55ea4371fa6fb5954d10a` |

⚠ **As duas formas estão registradas de propósito.** Os cabeçalhos das migrations desta fase mandam
comparar com a primeira; a via de apply atual lê o arquivo com `fs.readFileSync`, byte a byte, e
portanto o que chega ao ledger é o que a **segunda** resume. Registrar só uma delas produziria uma
divergência que se leria como perda de comentário quando é diferença de terminador — e um
diagnóstico errado custa mais caro que "falhou".

## ⭐ O achado do plano: o portão contava as noites em que a purga estava DESLIGADA

O plano especifica os três critérios de D-46-14 sobre `public.purga_execucoes`, sem recorte:
`now() - min(iniciada_em) >= interval '14 days'`, `count(*) >= 14`,
`count(*) FILTER (WHERE elegiveis > 0) >= 1`. Escrito assim, o portão **conta os heartbeats em
`off`**.

Uma execução em `off` conta os elegíveis, grava o cabeçalho de heartbeat e **retorna antes de
qualquer item**. Ela não percorre titular nenhum, não chama o motor, não escreve `relato_dry_run`.
Ela não contém evidência **nenhuma** sobre o caminho que o portão autoriza.

**A consequência, com os números de hoje:**

| | Medido em 2026-08-23 |
|---|---|
| linhas em `purga_execucoes` | 3 |
| delas em `modo_vigente = 'off'` | **3 — todas** |
| a mais antiga | 2026-08-22 |
| com `elegiveis > 0` | **1** (o heartbeat de hoje, `elegiveis = 4`) |

Sem o recorte, **o relógio dos 14 dias já estaria correndo** sobre execuções que não ensaiaram nada,
e o critério do conjunto não-vazio — o que D-46-14 chama de *"a decisão que impede a fase de falhar
em silêncio"* — **já estaria satisfeito** por uma contagem que nenhuma varredura chegou a percorrer.
Catorze noites com a purga desligada abririam o portão.

É o dry-run decorativo que o SC#1 proíbe, renascendo **dentro do critério que existe para bani-lo** —
a mesma forma do INVENT-05 renascendo dentro do arquivo que corrige o INVENT-05 (46-06).

**O conserto:** os três critérios são medidos sobre `WHERE modo_vigente IN ('dry_run', 'live')`.

⚠ **Allowlist de modos, JAMAIS `<> 'off'`**, e a distinção é a de sempre: o `CHECK` de
`20260823000009:89-90` admite **quatro** valores, e o quarto é `'ausente'` — o valor *fail-closed*
que a reconciliação grava quando **não conseguiu ler o cerco**. Uma negação deixaria justamente esse
valor contar, e um modo novo no futuro contaria por omissão. A allowlist deixa o desconhecido de
fora, que é a direção segura num portão que autoriza destruição irreversível.

## O que foi construído

### `20260823000013` — a RPC

Oito passos, cada um com o SQLSTATE da sua recusa, no molde integral de
`20260801000002:322-438`:

| Passo | O que faz | Recusa |
|---|---|---|
| (1) | Guard de papel por **diferença explícita** — NULL-safe | `42501` |
| (2) | Ator resolvido **no servidor** contra `usuarios_rh` viva; zero parâmetro de ator na assinatura | `42501` |
| (3) | Domínio de `modo`, `cap` e `janela`, com NULL tratado **explicitamente** como "não alterar" | `22023` |
| (4) | Estado anterior + bloqueio da linha, que serializa contra a varredura concorrente | — |
| (5) | Não-op, com **ramo dedicado** quando a purga já está em `off` | `22023` |
| (6) | ⚠ **O portão**, alcançado só quando o modo novo é `live` e o anterior não era | `22023` |
| (7) | A mutação, com `alterado_por` do servidor | — |
| (8) | A trilha, no MESMO corpo — severidade no topo do enum quando o destino é `live` | — |

E um **bloco de auto-verificação de apply** que ABORTA quando:
- alguma relação lida pelo corpo não existe, ou `elegivel_purga` sumiu de `config_retencao_etapa`;
- um dos rótulos de enum usados pela trilha (`aviso`, `critico`, `configuracao`) deixou de existir —
  a medição veio do `database.types.ts` gerado do banco, e este bloco é o que impede a medição de
  envelhecer em silêncio;
- ⚠⚠ `public.config_purga` ganhou **qualquer policy de escrita**, aferido pela FORMA (`cmd <>
  'SELECT'`) e não por lista de nomes. T-46-07-01 — *"nenhum caminho de deploy altera o modo"* — só é
  verdade enquanto esta função for o único caminho de escrita. Instalar o portão do flip por cima de
  uma porta aberta seria criar a **aparência** do cerco.

### As duas asserções

**`(d)` — sete chamadas de controle, e as sete rodam.**

| Caso | Estado montado | Esperado |
|---|---|---|
| 1 | tudo satisfeito, **sem** confirmação | `22023` |
| 2 | primeira execução de ensaio a **13 dias** | `22023` |
| 3 | exatamente **13** execuções de ensaio | `22023` |
| 4 | 14+ execuções, **nenhuma** com `elegiveis > 0` | `22023` |
| 5 | allowlist de volta a `origem = 'seed'` | `22023` |
| 6 | ⊕ os cinco satisfeitos, **14 dias EXATOS** | **aceita**, e `modo` vira `live` |
| 7 | ⊖⊕ de `live` para `off`, com os **três** critérios falhando e **sem** confirmação | **passa**, e `modo` vira `off` |

**`(e)`** — exatamente uma linha nova em `logs_auditoria`, ator batendo o `usuarios_rh.id` resolvido
no servidor, `categoria = 'configuracao'`, `severidade = 'critico'`, `dados_antes` e `dados_depois`
não nulos e com `modo` **diferente** — e a linha **desaparece** com o rollback, que é a prova
estrutural de que ela vive na mesma transação da mutação.

### `46-07-RUNBOOK-FLIP.md`

Sete seções. As duas que valem ser citadas aqui:

- **`## T0 e a contagem`** traz o slot a preencher **e**, logo abaixo, a consulta que **recupera**
  `T0` da trilha de auditoria. Um marco temporal que depende de alguém lembrar de anotá-lo não
  existe (lição do 42-12). E declara por extenso que **o relógio que o servidor confere não é `T0`**:
  ele conta de `min(iniciada_em)` das execuções em `dry_run` ou `live`.
- **`## Se algo der errado`** abre com a chamada exata do kill switch, a afirmação de que ela nunca é
  recusada, e o aviso — que é o mais importante do arquivo — de que o não-op de `off → off` **não é
  falha do kill switch**.

## Deviations from Plan

### ⭐ [Rule 2 - Segurança] Os três critérios de D-46-14 contam SÓ execuções em `dry_run` ou `live`

Descrito em §"O achado do plano". O plano especifica os agregados sobre `purga_execucoes` sem
recorte; assim escrito, catorze noites com a purga **desligada** abrem o portão. O recorte é
estritamente mais restritivo — ele só pode fazer o portão recusar mais, nunca menos —, e os literais
que os critérios de aceite do plano medem (`interval '14 days'`, `count(*) >= 14`,
`FILTER (WHERE elegiveis > 0)`) continuam intactos: mudou o `WHERE`, não a aritmética.

### [Rule 2 - Correção] Uma sexta condição: a allowlist não pode estar VAZIA

D-46-22 pede "nenhuma etapa da allowlist em `origem = 'seed'`". Com `elegivel_purga` falso em toda
linha, isso é verdade **por ausência de sujeito** — e o portão aprovaria o flip de uma purga que não
alcança estado nenhum. *Uma condição que só pode ser satisfeita por ausência de sujeito não é uma
condição.* Medido junto, na mesma consulta, e com mensagem própria.

### [Rule 2 - Correção] Ramo dedicado de não-op quando a purga JÁ ESTÁ em `off`

O molde trata o não-op como recusa genérica, e o plano herda isso. Mas o chamador de `off` às três da
manhã está acionando o **kill switch**, e uma mensagem genérica de *"nada a alterar"* seria lida, com
razão, como *"o kill switch falhou"*. O ramo dedicado diz, com todas as letras, que o estado
desejado já é o vigente e que nenhuma execução vai apagar nada enquanto ele valer.

⚠ A alternativa — fazer `off → off` **passar** — foi recusada: escreveria linha de trilha afirmando
uma alteração que não houve, poluindo a trilha probatória com não-mudanças.

### [Rule 1] Parâmetro nulo significa "não alterar", divergindo do molde

`20260801000002:377` trata `p_meses IS NULL` como **inválido**. Aqui a função escreve **três** campos
independentes: obrigar o chamador a reenviar os outros dois transformaria "ajustar o cap" numa
oportunidade de mudar o **modo** por descuido — que é exatamente o efeito colateral que PURGA-04
proíbe. A validação trata NULL **explicitamente** (`p_modo IS NOT NULL AND …`), e não o deixa cair
por NULL-cegueira, que produziria a mesma resposta pelo motivo errado.

### [Rule 1] Um critério de aceite do plano reprovaria o arquivo CORRETO — pela QUINTA vez nesta fase

| Critério | Medido | Por quê |
|---|---|---|
| `grep -c 'log_auditoria' <arquivo>` = **1** | **3** | O nome do enum `categoria_log_auditoria` **contém** a substring, e ele aparece duas vezes no bloco de auto-verificação que confere os rótulos vivos |

**Medição honesta da propriedade que o critério queria:**
`grep -c 'public.log_auditoria(' <arquivo>` = **1** — a chamada da trilha acontece **uma única vez**,
no corpo da função, na mesma transação da mutação. Contorcer o arquivo para o `grep` bater — trocar a
auto-verificação dos rótulos por um pressuposto silencioso — seria afrouxar um portão para satisfazer
outro.

### [Rule 1] `p_confirmo_live` não aparecia no smoke, e o critério de aceite pedia ≥ 2

As chamadas por posição (`salvar_config_purga('live', NULL, NULL, true)`) nunca nomeiam o parâmetro.
Trocadas para **notação nomeada** nas sete chamadas — o que é melhor de qualquer forma: o argumento
de confirmação fica visível no ponto de chamada, que é a única razão de ele existir.

### [Rule 1] A fronteira de 14 dias virava folga confortável com o tempo

O caso positivo confia em `min(iniciada_em)` ser exatamente `-14 dias`. Depois do checkpoint haverá
execuções **reais** em `dry_run`, e daqui a meses a mais antiga teria noventa dias: o caso continuaria
passando, mas deixaria de exercitar a **borda** — que é como um contrato de fronteira deixa de ser um
contrato de fronteira sem ninguém perceber. A fronteira passou a ser **pinada** dentro do envelope.

## Não-vacuidade, respondida caso a caso

A pergunta que este arquivo faz de toda asserção — *isto passaria se o conjunto fosse vazio?* — e as
respostas:

| Cenário | `(d)` passaria? |
|---|---|
| a função recusa **tudo** | **Não** — o caso 6 exige aceitação, e o 7 exige o kill switch |
| a função aceita **tudo** | **Não** — os cinco casos negativos |
| a função aceita mas não escreve | **Não** — o caso 6 afere `config_purga.modo = 'live'` depois |
| a função recusa pelo motivo **errado** | **Não** — os marcadores de diagnóstico são comparados por igualdade exata de conjunto, um por caso |
| o smoke roda sem sessão | **Não** — a não-vacuidade da impersonação é medida (`auth.uid()` não nulo) antes de qualquer julgamento |
| o ledger sintético não foi plantado | **Não** — o caso 3 afere que a montagem deixou exatamente 13 execuções |

## Varredura por FORMA — feita

Rodada conforme o `CLAUDE.md`: `grep -nE "v_[a-z_]* (<>|!=) [0-9]+|= ANY \(ARRAY\['"`. **Zero achados
novos** — nenhuma comparação que eu escrevi usa essa forma. As que uso são `IS DISTINCT FROM`, o
idioma dominante do arquivo (e o **ponto cego do próprio regex**, que segue aberto no `WINDOWS.md`):

| Achado meu | Veredito |
|---|---|
| `v_uid_ok IS DISTINCT FROM 1`, `array_length(v_d_st,1) IS DISTINCT FROM 7`, `v_d_conta13 IS DISTINCT FROM 13`, `v_e_delta IS DISTINCT FROM 1` | comparam contra o que o **próprio bloco fez na mesma execução** — baseline capturada, não fotografia |
| `v_led_n_z IS DISTINCT FROM v_led_n_a`, `v_e_acao_z IS DISTINCT FROM v_e_base` | baseline capturada na própria execução, por impressão digital de `to_jsonb` que **não envelhece** quando nasce coluna nova |
| `v_d_modo_pos IS DISTINCT FROM 'live'`, `v_d_modo_off IS DISTINCT FROM 'off'`, `v_e_cat/'configuracao'`, `v_e_sev/'critico'` | vocabulários **fechados** por `CHECK` e por enum, não inventários |
| a lista de quatro marcadores de diagnóstico em `(d)` | **ESCOPO declarado**, justificado por extenso inline: são exatamente os quatro critérios de D-46-14 + D-46-22, e a lista só muda no dia em que os CRITÉRIOS mudarem — que é o dia em que esta asserção tem de ser reescrita junto |
| `modo_vigente IN ('dry_run','live')` (migration e smoke) | **ESCOPO declarado**: os modos que percorrem itens. Fail-CLOSED de propósito contra `'ausente'` e contra qualquer modo futuro |

## Requirements

**PURGA-03, PURGA-04 e PURGA-05 NÃO fecham aqui**, e por isso `requirements-completed` está vazio. A
RPC existe no disco e **nada a chama**; `config_purga.modo` continua em `'off'` e o portão nunca foi
exercitado contra Postgres nenhum. Fechá-los agora seria declarar cumprido um requisito cujo caminho
vivo não existe — a mesma disciplina do 46-05 e do 46-06.

**PURGA-04 e PURGA-05 fecham no checkpoint da Task 3** (a recusa real registrada, o flip para
`dry_run` com trilha). **PURGA-03 fecha 14 dias depois**, no checkpoint diferido da Task 4 — ou não
fecha, se a decisão for `estender-dry-run`, e isso também é um desfecho legítimo.

## O checkpoint diferido (Task 4), registrado como o plano manda

| | |
|---|---|
| `T0` | ⏳ **a definir no passo 6 da Task 3** — é o `now()` do servidor no instante do flip `off → dry_run` |
| Data mínima do flip | `T0 + 14 dias`, **e nunca antes** de `min(iniciada_em)` das execuções de ensaio + 14 dias — que é o que o servidor confere |
| Estado enquanto aberto | `config_purga.modo = 'dry_run'`, conferível por `SELECT modo FROM public.config_purga;` |
| Artefato | `46-07-RUNBOOK-FLIP.md`, com as cinco pré-condições do servidor e as três humanas |
| Opções | `ligar-live` · `estender-dry-run` · `ajustar-matriz-antes` |

⚠ **Responder antes de 14 dias não é possível** — não porque alguém vá lembrar da regra, mas porque a
RPC **recusa**.

## O que a Task 3 tem de fazer, na ordem — e o que ela pode reprovar

Está no `<checkpoint>` devolvido ao orquestrador. Cinco pontos que não são óbvios:

1. **O apply é `node p46apply.cjs migrate`, lendo o arquivo.** `apply_migration` do MCP e o "reparo da
   `version`" estão **obsoletos e condenados** (RD4-02). Por esta via a `version` nasce correta.
2. **O md5 tem duas formas, e as duas estão na tabela acima.** A via atual lê o arquivo byte a byte,
   então o valor que deve bater com `md5(statements[1])` é `63feeec5…`.
3. **Ler o contador de PASS do GUC de cada smoke.** *"Não levantou"* nunca foi *"as asserções
   rodaram"*. `p46_purga_smoke` tem de bater **27**.
4. **A recusa do passo 4 vai nomear QUATRO critérios, e não os três de sempre** — por causa do recorte
   por modo, o ledger de **ensaio** está VAZIO hoje (as 3 linhas reais estão em `off`). Espere ler
   *"dias corridos … = INDEFINIDO, o ledger nao tem nenhuma execucao em dry_run nem em live"*,
   *"execucoes com linha … = 0"*, *"execucoes de ensaio sobre conjunto elegivel NAO-VAZIO = 0"* e
   *"etapas da allowlist ainda em procedencia de seed = N [nomes]"*. **Copiar a mensagem inteira.**
5. **`(d)` e `(e)` nunca foram executadas contra Postgres nenhum.** Esta máquina não tem instância
   local e subagentes não recebem os tools do Supabase. Se elas reprovarem, **medir o portão antes de
   acreditar na explicação**: um diagnóstico plausível escrito num documento não é evidência.

## Self-Check: PASSED

| Item | Verificado |
|---|---|
| `supabase/migrations/20260823000013_p46_salvar_config_purga.sql` | ✅ existe (624 linhas) |
| `.planning/phases/46-purga-autom-tica-dry-run-live/46-07-RUNBOOK-FLIP.md` | ✅ existe (365 linhas, 7 seções `##`, `T0` × 7) |
| `supabase/tests/p46_purga_smoke.sql` — `(z)` em 27 | ✅ |
| Commits `02cb45e` `8a0c55c` `07ece24` `053debf` | ✅ os quatro em `git log` |
| Numeração `20260823000013` sem colisão nem buraco em `…0001`..`…0013` | ✅ 13 arquivos, um por número |
| Balanço de aspas e de delimitadores nos dois arquivos SQL | ✅ conferido por tokenizador |
| Variáveis usadas × declaradas (migration, bloco de apply, bloco `(d)/(e)`) | ✅ nenhuma indefinida, nenhuma órfã (só `v_k`, o contador implícito do `FOR`) |
| Portões estáticos da migration | ✅ **todos**, exceto o de `log_auditoria` (medido honestamente em 3 — ver §Deviations) |
| Portão estático do smoke (`(d)`/`(e)`, `p_confirmo_live` ≥ 2) | ✅ |
| Colunas `NOT NULL` sem default de `purga_execucoes` no `INSERT` de fixture | ✅ lidas de `20260823000002:136-153`, não de memória: `modo_vigente`, `cap_vigente`, `elegiveis`, `veredito` — as quatro nomeadas |
| Valores contra os `CHECK` vivos (`veredito`, `situacao`, `origem`, `modo_vigente`) | ✅ lidos dos arquivos de migration |
| `npm run lint` (hook, quatro commits) | ✅ **96 erros = baseline congelado** |
| Zero `--no-verify` | ✅ |
| `config_purga.modo` intocado | ✅ nenhum comando foi executado contra PROD por este plano |

⚠ **O que este Self-Check NÃO cobre, dito por extenso:** nenhuma linha destes arquivos foi executada
contra Postgres nenhum. A migration, o bloco de auto-verificação de apply e as duas asserções são
**RED até a Task 3**. Em particular, **o caminho de SUCESSO de `(d.6)` e `(d.7)` nunca rodou** — e a
lição desta fase é literalmente que *uma asserção cujo caminho de sucesso nunca rodou não é asserção,
é promessa*. Ela foi escrita para rodar (o ledger sintético é plantado pelo próprio bloco, e a
não-vacuidade da impersonação é medida antes do julgamento), mas isso é desenho, não evidência. A
evidência é o contador em 27.
