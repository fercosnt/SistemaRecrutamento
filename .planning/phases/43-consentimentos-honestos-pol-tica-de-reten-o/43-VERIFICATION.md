---
phase: 43-consentimentos-honestos-pol-tica-de-reten-o
verified: 2026-08-03T05:02:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 4/5
  previous_verified: 2026-08-03T04:18:24Z
  pass_number: 3
  gaps_closed:
    - >-
      SC#4 — o caminho de LEITURA e o de ESCRITA foram ambos exercitados ao vivo. O
      rebaixamento da 2ª passagem produziu um bug REAL de produção (42804 em toda chamada
      bem-sucedida de `listar_matriz_retencao`), corrigido por `20260803000001`. A escrita
      foi feita por administrador real pela tela (`rejeitado` 24 → 18), com `origem` indo a
      `admin`, `alterado_por` resolvido ATRAVÉS do LEFT JOIN que estava quebrado, e
      EXATAMENTE uma linha nova em `logs_auditoria` na mesma transação
  upgrades:
    - truth: "SC#4 — Um administrador altera a janela de retenção sem deploy"
      from: "PRESENT_BEHAVIOR_UNVERIFIED"
      to: "VERIFIED"
      reason: >-
        O padrão que eu mesmo fixei na 2ª passagem foi "até que um administrador de verdade
        mude uma janela de verdade". Foi exatamente o que aconteceu. Manter o rebaixamento
        agora exigiria de SC#4 uma guarda de regressão que eu NÃO exigi de SC#1 nem de SC#2
        — os dois fecharam por ação humana única, sem teste novo no elo cliente→servidor.
        Seria a mesma inconsistência da 1ª passagem, com o sinal trocado.
  regressions:
    - >-
      ⚠ NÃO é regressão de produto, e sim do APARATO DE VERIFICAÇÃO:
      `p43_matriz_retencao_smoke.sql` deixou de ser executável como gate. A asserção (c)
      aborta o run, e as asserções (d)…(k) e (z) — incluindo a (k), a guarda de regressão do
      42804 acrescentada no MESMO dia — tornaram-se inalcançáveis. Ver W-1
  new_findings:
    - "W-1 — a (c) mata o resto do arquivo, e a mensagem que DE FATO dispara não é a que o cabeçalho declarou"
    - "W-2 — a escrita ao vivo (24 → 18) não está registrada em NENHUM artefato do repositório"
    - "W-3 — `services/` e `hooks/` de `admin/retencao` seguem sem teste, e isso não tem todo"
    - "W-4 — a lição do contador de asserções vive só em `supabase/`, nada em `.planning/`"
    - "W-5 — a disciplina das DUAS asserções já estava aplicada em 43-05 e 43-06; faltou só no 43-04, que foi escrito primeiro"
    - "W-6 — `REQUIREMENTS.md` contradiz a si mesmo: checklist atualizado, tabela de status não"
    - "W-7 — `STATE.md` § Current Position ainda diz `gaps_found, 2/5`; o 2º incidente não está lá"
  retractions:
    - >-
      RETEN-02, linha 181 de `REQUIREMENTS.md` — a parentética "alteração PELA TELA,
      auditada, em 43-09". Eu a chamei de sobreafirmação em DUAS passagens. Ela agora é
      VERDADEIRA, literalmente: a alteração foi pela tela e foi auditada. Retirada.
    - >-
      `43-07-SUMMARY.md:366` "o bundle do cliente nao foi publicado" — o bloco de correção
      datado foi acrescentado, com o corpo original preservado, exatamente no padrão da
      P37/37-05 que eu citei. Fechado.
human_verification:
  - test: "Ver o bloco de guarda do currículo no ramo AUTORIZADO, em /candidato/privacidade"
    expected: "A linha «Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.» aparece na tela"
    why_human: >-
      É o único item de produto que resta, e é barato: basta um cadastro com a caixa
      `autorizacao_retencao_curriculo` MARCADA. O ramo que satisfaz o RETEN-03 renderiza só
      sob `autorizado === true` (`GuardaCurriculoBloco.tsx:114`); a conta de teste ao vivo
      deixou justamente aquela caixa desmarcada, então o que foi visto foi o ramo NÃO-autorizado.
  - test: "Prévia de retenção no estado POPULADO — aceitação permanente, não ação pendente"
    expected: "As linhas por estado contam CANDIDATURAS e o total conta CANDIDATOS, com o carimbo `calculada_em` do servidor"
    why_human: >-
      Impossível hoje e por meses (janela de 24 meses num sistema mais novo que isso), e
      produzir a condição encurtando a janela seria fabricar a evidência. Isto NÃO é uma
      pendência acionável — recomendo convertê-lo em `overrides:` no fecho do milestone, com
      `accepted_by`, para que pare de manter a fase em `human_needed` para sempre.
  - test: "Correções de registro (decisão do operador, não comportamento de produto)"
    expected: >-
      (1) Registrar a escrita ao vivo `rejeitado` 24 → 18 em algum artefato durável — hoje a
      ÚNICA evidência que fecha o SC#4 não existe no repositório. (2) `REQUIREMENTS.md`
      tabela de status (linhas 174-184) segue dizendo CONSENT-01/02/03/05 "In Progress" e
      CONSENT-06 "Pending", contradizendo o checklist logo acima; e o bloco de nota 58-66
      afirma que 01/02/03 estão deliberadamente sem `[x]`, o que deixou de ser verdade.
      (3) CONSENT-05 deveria apontar para a Phase 47 do jeito que RETEN-05 aponta para a 46.
      (4) `STATE.md` § Current Position ainda diz `gaps_found, 2/5` e não menciona o 42804.
      (5) `43-09-SUMMARY.md` § `requires:` afirma "8 linhas, todas em 24 meses, origem='seed'"
      — falso desde a alteração ao vivo.
    why_human: "São decisões de registro do milestone, não comportamento de produto."
deferred:
  - truth: "`autorizacao_analise_video` continua `NOT NULL DEFAULT false` — cada linha nova ainda afirma resposta a uma pergunta que deixou de ser feita"
    addressed_in: "Phase 47"
    evidence: "`.planning/todos/pending/43-analise-video-default-false-fabrica-afirmacao.md`, `resolves_phase: 47` (reconferido nesta passagem)"
  - truth: "O guard de marketing é `BEFORE INSERT` e só — um `UPDATE` de `evento` numa linha pendente escaparia dele"
    addressed_in: "Phase 46"
    evidence: "`.planning/todos/pending/43-guard-marketing-so-before-insert.md`, `resolves_phase: 46` (reconferido)"
  - truth: "Os smokes com baseline congelada viram RED no primeiro cadastro real — e acusam a coisa errada"
    addressed_in: "Phase 44"
    evidence: >-
      `.planning/todos/pending/43-smokes-com-baseline-congelada-viram-red.md`, `resolves_phase: 44`.
      ⚠ O arquivo ganhou um bloco «CONFIRMADO — a previsão virou fato», e a §Escopo distingue
      corretamente a (c) da matriz como DELIBERADA. Mas essa mesma §Escopo a EXIME da correção
      — e é justamente ela que agora mata o arquivo inteiro. Ver W-1: o todo precisa ser
      emendado, senão a Phase 44 conserta o smoke do consentimento e deixa o da matriz morto.
  - truth: "`updated_at` do consentimento é carimbado pelo relógio do navegador, e a tela apresenta essa data como fato"
    addressed_in: "Phase 46"
    evidence: "`.planning/todos/pending/43-updated-at-do-consentimento-vem-do-cliente.md`, `resolves_phase: 46` (reconferido)"
  - truth: "Publicar o cliente não pertence a plano, fase ou todo nenhum, e nada observa o artefato deployado"
    addressed_in: "Phase 44"
    evidence: >-
      `.planning/todos/pending/publicar-cliente-nao-pertence-a-plano-nenhum.md`, `priority: high`,
      `resolves_phase: 44` — NOVO desde a 2ª passagem, e ele fecha o achado que eu abri. Ressalva
      em W-8: a ação nº 1 que ele prescreve é mudança de TEMPLATE de plano, não entregável da 44.
untracked_debt:
  - "`src/features/admin/retencao/services/` e `hooks/` seguem com ZERO arquivo de teste — nenhum todo cobre isso (W-3)"
  - "A lição «contador de asserções mede caminhos exercitados, não existentes» não existe em `.planning/` (W-4)"
  - "A ordenação que torna (d)…(k) inalcançáveis não está em todo nenhum (W-1)"
---

# Phase 43: Consentimentos Honestos & Política de Retenção — Verification Report (3ª passagem)

**Phase Goal:** Cada checkbox que o candidato marca passa a ter consequência real, e o prazo de validade do dado existe como configuração alterável sem deploy — tudo isso **sem que nada seja apagado ainda**.
**Verified:** 2026-08-03T05:02:00Z
**Status:** human_needed — **5/5**, zero truths não-exercitados
**Re-verification:** Sim — 3ª passagem, após o fechamento do SC#4

---

## Veredito em uma frase

**SC#4 está genuinamente fechado**, e fechou pelo mesmo padrão que fechou SC#1 e SC#2 — pessoa real, tela real, linha real. O rebaixamento da 2ª passagem se pagou imediatamente: ele encontrou um bug que fazia **toda chamada bem-sucedida** de `listar_matriz_retencao` levantar `42804` desde o apply. **Mas o que ele comprou foi o conserto, não uma guarda.** A única asserção que exercita o caminho corrigido nasceu dentro de um arquivo que a ação seguinte do operador tornou inalcançável — e a fase não registrou isso.

---

## SC#4 — a resposta direta à pergunta 1

### As três cláusulas

| Cláusula | Estado | Como sei |
|---|---|---|
| «Um administrador altera a janela de retenção de um estado **sem deploy**» | ✓ **EXERCITADA** | Leitura E escrita, ambas ao vivo. Detalhe abaixo |
| «seed de 2 anos documentado como *teto já consentido*, não recomendação técnica» | ✓ VERIFIED (2ª passagem) | `COMMENT` do banco + texto de ajuda do diálogo, enquadramento BD-1 |
| «veredito RETEN-06 registrado **antes** de a estrutura nova existir» | ✓ VERIFIED (2ª passagem) | `reten06-veredito-retain-until.md` na wave 1 (43-02), antes da migration da matriz (43-04, wave 2) |

### O caminho de LEITURA — e por que ele é mais forte que uma atestação

A cadeia que verifiquei **no repositório**, não por leitura de SUMMARY:

1. `20260803000001_p43_fix_listar_matriz_cast.sql` existe, e o `::text` está na projeção (linha 102). O comentário explica por que **não** se troca a declaração para `varchar(255)` — argumento correto: `text` é o tipo certo na fronteira da API.
2. **A migration é auto-verificável por construção.** O bloco `DO $verifica_leitura$` (linhas 121-150) resolve um administrador vivo, injeta a claim, **EXECUTA** `listar_matriz_retencao()` e levanta se o retorno não for 8 linhas. Levanta também se não houver administrador vivo — com a mensagem certa: *"verificar so a recusa foi exatamente o defeito que esta migration corrige"*. **Consequência lógica: se o apply teve sucesso, o caminho feliz executou em PROD.** Isso é qualitativamente melhor que "o operador diz que aplicou".
3. **O md5 registrado é reproduzível a partir do arquivo.** `7e9b9797ac3fe22f95b34b25db30bfa4` é exatamente `md5` do conteúdo do arquivo sem a newline final — reproduzi byte a byte nesta passagem. Não prova que PROD tem essa versão (não tenho MCP), mas prova que o hash registrado no commit `8fb4449` **não foi fabricado** e corresponde a este conteúdo.
4. O operador abriu a tela e a matriz carregou.

### O caminho de ESCRITA

`rejeitado` foi de 24 para 18 meses pela tela. O que isso prova, e prova de um jeito que nenhum teste teria provado:

- `alterado_por` resolveu para "Fernando Costa Neto" **através do mesmo `LEFT JOIN` que estava quebrado**. A leitura que falhava é a que exibiu o resultado da escrita — o conserto se prova pelo próprio defeito;
- `origem` foi de `'seed'` a `'admin'` — o discriminador de que a Phase 46 depende;
- **exatamente uma** linha em `logs_auditoria`, `acao = alterar_janela_retencao`, `dados_antes.janela_meses = 24`, `dados_depois.janela_meses = 18`, `sucesso = true`. A atomicidade que o smoke (g) prova em subtransação revertida foi honrada em uso real;
- 7 dos 8 estados seguem `origem = 'seed'` — a escrita foi cirúrgica.

### Por que eu subo o SC#4 a VERIFIED, sem hesitar

O padrão que **eu mesmo** fixei na 2ª passagem foi, verbatim: *"até que um administrador de verdade mude uma janela de verdade"*. Foi exatamente o que aconteceu.

Manter o rebaixamento agora exigiria do SC#4 uma **guarda de regressão** que eu não exigi do SC#1 nem do SC#2. Aqueles dois fecharam por ação humana única, e nenhum teste novo foi acrescentado ao elo cliente→EF nem ao elo tela→PostgREST. Seria a mesma inconsistência da 1ª passagem, com o sinal trocado. **5/5.**

### O que isso deixa exposto — dito sem eufemismo

**A prova viva é um evento, não um mecanismo.** Confirmado por medição nesta passagem, não por leitura:

```
src/features/admin/retencao/services/  → 0 arquivos de teste
src/features/admin/retencao/hooks/     → 0 arquivos de teste
suíte inteira: 1422 testes (155 arquivos) — IDÊNTICO à 2ª passagem
arquivos alterados desde a 2ª passagem: index.html, a migration, o smoke. Só.
```

O elo `EditarJanelaDialog` → `useSalvarJanela` → `retencaoService.salvarJanela` → `rpc(...)` foi **executado uma vez, por uma pessoa, num dia**. Amanhã, um refactor que troque o nome do parâmetro da RPC, ou que quebre a invalidação do TanStack Query, passa por `tsc` 97 e por 1422/1422 sem que nada acuse. Os 50 casos da feature mockam a mutação — eles provam o formulário, não o hop.

**Isto é dívida, não gap.** Não é gap porque o SC#4 pergunta se um administrador consegue alterar a janela sem deploy, e a resposta medida é sim. Mas é dívida **NÃO RASTREADA**: varri `.planning/todos/pending/` e nenhum dos cinco todos da fase cobre a ausência de teste em `services/`/`hooks/`. Ela sobreviveu a três passagens de verificação sendo nomeada e nunca virando arquivo. **Nomear um débito três vezes sem lhe dar arquivo é a forma lenta de esquecê-lo.**

---

## Pergunta 2 — o padrão, e por que "número de asserções" é o defeito

Sim, há um padrão, e ele é mais específico e mais incômodo do que "escrevemos gates fracos".

### Os quatro smokes da fase, comparados

| Smoke | Plano | Recusa | Caminho positivo | Veredito |
|---|---|---|---|---|
| `p43_guard_marketing_smoke.sql` | 43-05 | (a) por INSERT real | **(f) «O CAMINHO POSITIVO EXISTE»** | ✓ disciplina aplicada |
| `p43_previa_smoke.sql` | 43-06 | (d), 4 casos | **(h) «COERÊNCIA — a prévia EXECUTA»** | ✓ disciplina aplicada |
| `p43_matriz_retencao_smoke.sql` | **43-04** | (f) | **nenhum** (até 2026-08-03) | ✗ **o buraco** |
| `p43_consent_prova_smoke.sql` | 43-01 | — | — | n/a (assertivas estruturais, sem função guardada) |

**A disciplina não era desconhecida da fase. Ela foi aplicada em dois dos três casos aplicáveis.** E o 43-06 não a aplicou por acaso — o comentário da (h) raciocina explicitamente sobre ela:

> *"A impersonação é de `administrador` porque (d) já provou a recusa; aqui o que se mede é o NÚMERO."*

O 43-04 foi escrito **antes** dos outros dois. A disciplina emergiu no meio da fase e **nunca foi retrofitada** ao artefato anterior. Nada — nenhum revisor, nenhum gate, nenhum checklist — comparou os quatro smokes entre si.

### O defeito de métrica, nomeado

A fase mediu seus smokes por **contagem de asserções verdes** (`10/10`, `9/9`, `6/6`, `9/9`) e essa contagem apareceu como evidência em SUMMARY, em REVIEW e nas minhas duas passagens anteriores — **inclusive nas minhas**, e é justo que isso fique escrito aqui.

Um contador de asserções mede **quantos caminhos foram exercitados, não quantos existem**. `listar_matriz_retencao` tinha cobertura declarada e cobertura de corpo igual a zero: sua única asserção testava a recusa, e o guard levanta na primeira linha — o `RETURN QUERY` nunca executava. **10/10 verdes com o corpo da função jamais executado, em nenhum lugar do sistema.**

O invariante certo é estrutural, não numérico: **toda função com guard precisa de duas asserções — a que prova que ela recusa quem deve recusar, e a que prova que ela FUNCIONA para quem deve passar.** Uma função cujo único teste é a recusa está, para efeito de corpo, sem teste nenhum.

### Onde essa lição está registrada — e onde não está

| Lugar | Registra? | Durabilidade |
|---|---|---|
| `20260803000001` §2, no corpo do arquivo | ✓ e muito bem | Alta — arquivo versionado |
| `COMMENT ON FUNCTION listar_matriz_retencao` | ✓ | **Máxima — vive no BANCO**, sobrevive ao repositório |
| `p43_matriz_retencao_smoke.sql`, cabeçalho da (k) | ✓ | Alta |
| Mensagem do commit `8fb4449` | ✓ | Média — ninguém faz `git log` ao planejar |
| **`.planning/` — todo, learning, ADR, checklist** | ✗ **NADA** | — |

**Este é o achado desta pergunta.** A lição está escrita nos três lugares onde quem já está lendo aquele código a encontrará, e em **nenhum** lugar onde quem vai *planejar* a Phase 46 a encontrará. A Phase 46 é a que arma um `DELETE` por cron sobre funções guardadas. É precisamente a fase onde uma função cujo único teste é a recusa custa caro.

**Recomendação concreta:** um todo (ou uma entrada de learnings) que diga a regra estrutural em uma linha, com `resolves_phase: 46`, e que exija a varredura retroativa dos smokes existentes — a mesma varredura que eu fiz nesta passagem em três comandos e que ninguém tinha feito.

---

## Pergunta 3 — a asserção (c): por desenho, sim; mas a declaração não cobre o que vai disparar

Esta era a pergunta mais afiada e a resposta é dividida. Investiguei por `git`, não por leitura do cabeçalho.

### O que É genuinamente por desenho

O cabeçalho da (c) está no commit **`b01e11e`** — o commit ORIGINAL da especificação, escrito **antes** do apply e muito antes da escrita ao vivo. Confirmei que `8fb4449` não tocou uma linha do bloco (c). Verbatim, de `b01e11e`:

> *"⚠ Esta asserção é escrita para o estado RECÉM-APLICADO. Se um administrador já tiver alterado alguma janela pela tela (`origem = 'admin'`), ela reprova de propósito (…) e não deve ser re-rodada como se fosse regressão."*

E o todo `43-smokes-com-baseline-congelada-viram-red.md` §Escopo já fazia a distinção que a pergunta pede, **sem que ninguém tivesse me perguntado**:

> *"Vale tambem para `p43_matriz_retencao_smoke.sql` assercao (c) (…) Aquela e uma escolha DELIBERADA e documentada; estas duas nao sao."*

**Isso é o oposto do defeito de baseline congelada do smoke do consentimento.** Lá, a acusação é FALSA (*"o apply BACK-FILLOU prova de consentimento"* quando houve um cadastro legítimo) e não foi prevista. Aqui foi prevista, declarada por escrito antes do fato, e distinguida em todo. **Crédito devido, e é crédito raro.**

### O que NÃO é por desenho — e o cabeçalho não cobre

Fui ler a ordem interna dos três `IF` da (c). Com `rejeitado` em 18 meses:

| Checagem | Valor | Dispara? | Mensagem |
|---|---|---|---|
| `v_total <> 8` | 8 | não | — |
| **`v_em24 <> 8`** | **7** | **✗ DISPARA AQUI** | *"apenas 7 de 8 linhas estao em 24 meses — o seed BD-1 e o **TETO JA CONSENTIDO** pela copy do cadastro, uniforme por decisao do operador"* |
| `v_seed <> 8 OR v_semdono <> 8` | 7 / 7 | nunca alcançada | *"alguma linha ja foi alterada"* ← **esta é a que o cabeçalho declarou** |

**A falha que o cabeçalho previu é a terceira. A que vai disparar é a segunda.** E a mensagem da segunda enquadra como violação do teto consentido o que é, de fato, um **aperto**: 18 < 24 é mais conservador que o seed, é exatamente o ato que o RETEN-01 existe para permitir, e é o mais protetivo dos dois para o titular. Quem rodar o arquivo lê uma acusação sobre "o teto já consentido" a respeito de uma ação que respeitou o teto com folga.

**Portanto: sim, é uma segunda instância — parcialmente.** Não na dimensão que a pergunta suspeitava (a reprovação em si foi declarada), mas na dimensão que importa operacionalmente: *a mensagem que o operador vai ler acusa a coisa errada*, e a declaração de "por desenho" não a cobre porque descreve outra checagem.

### E a consequência que ninguém registrou — a mais séria das duas

A (c) é a **3ª de 11** asserções. O gate (z) exige 11 PASS fixos. O arquivo roda numa **única chamada** `execute_sql` (obrigatório por mecânica de `set_config`), então uma exceção num bloco `DO` aborta o batch inteiro.

**Consequência: as asserções (d), (e), (f), (g), (h), (i), (j), (k) e (z) tornaram-se inalcançáveis.** O que morreu junto:

| Asserção | O que ela guardava | Perda |
|---|---|---|
| **(k)** | O caminho feliz de `listar_matriz_retencao` | **A guarda de regressão do 42804, acrescentada no MESMO dia** |
| (f) | Guard NULL-cego em DEFINER | O gate do defeito sistêmico da 42-06 (`42-anon-execute-definer-sistemico`, priority alta) |
| (g) | Atomicidade da trilha de auditoria | A promessa da copy do diálogo |
| (h) | `anon` sem EXECUTE | O hardening de privilégio |
| (j) | Zero linha de candidato tocada | **A invariante que define a fase** |

A ironia é exata: a (k) foi acrescentada em 2026-08-03 com enquadramento de guarda durável (*"Toda função com guard precisa de DUAS asserções"*), e a `COMMENT` da migration diz que ela *"fecha essa lacuna especifica"*. **A ação seguinte do operador — a escrita legítima que fecha o SC#4 — tornou-a inalcançável.** Vida útil efetiva: um run.

E o todo que deveria cobrir isso **exime** a (c) da correção: sua §Escopo a classifica como deliberada e prescreve remediação apenas para a (b) e a (f) do smoke do consentimento. **Do jeito que está escrito, a Phase 44 vai consertar um smoke e deixar o outro morto.**

**Recomendação concreta:** emendar `43-smokes-com-baseline-congelada-viram-red.md` com (1) o achado de que a (c) mata (d)…(k)(z), (2) a inversão da mensagem do `v_em24`, e (3) a decisão explícita entre extrair a (k) para um arquivo próprio ou reordenar a (c) para depois dela. A opção barata e honesta é mover a (c) para o fim, junto de (z) — o estado nascente da matriz é um fato histórico e não precisa ser a terceira coisa medida.

---

## Pergunta 4 — os todos diferidos

### Os quatro anteriores: todos íntegros, reconferidos por leitura de frontmatter

| Todo | `priority` | `resolves_phase` | Confere? |
|---|---|---|---|
| `43-analise-video-default-false-fabrica-afirmacao` | medium | **47** | ✓ |
| `43-guard-marketing-so-before-insert` | medium | **46** | ✓ |
| `43-smokes-com-baseline-congelada-viram-red` | high | **44** | ✓ — e ganhou um bloco «CONFIRMADO — a previsão virou fato». Ver a ressalva de W-1 |
| `43-updated-at-do-consentimento-vem-do-cliente` | medium | **46** | ✓ |

### O novo: `publicar-cliente-nao-pertence-a-plano-nenhum.md`

**Ele captura o defeito de processo bem, e melhor do que eu esperava.** Ele não narra o incidente — nomeia as três falhas estruturais separadamente (o passo 3 sem dono; nenhum artefato observando o deploy; a titularidade do push indefinida), quantifica o invisível (*"cinco semanas invisíveis"*), e prescreve três ações concretas em ordem de custo. A frase que o justifica é a certa:

> *"O repo prova exaustivamente o que ele CONTEM e nada sobre o que esta NO AR."*

E ele nomeia explicitamente as Phases 44, 45 e 47 como dependentes, com o argumento correto: entregar um direito do titular que existe em teste e não no navegador é *"precisamente a classe de defeito que este milestone existe para eliminar, so que aplicada ao proprio milestone."*

**Uma ressalva, e ela é de mecânica, não de conteúdo.** O todo tem `resolves_phase: 44`, mas a ação nº 1 que ele prescreve — *"um passo de publicação explícito no plano de TODA fase que toque `src/`"* — é mudança no **template de planejamento**, não entregável da Phase 44. Se a 44 a implementar só para si, a 45 e a 47 recorrem, e o todo fecha tendo consertado uma instância de um defeito de classe. As ações 2 e 3 (o gate que observa o deploy; decidir de quem é o passo) são genuinamente da 44. **Vale marcar essa distinção no arquivo antes que ele seja fechado como resolvido.**

---

## Pergunta 5 — RETEN-05 e CONSENT-05 seguem `[ ]`. Ambos corretos.

### RETEN-05 — correto, e bem fundamentado em quatro lugares consistentes

| Local | Conteúdo |
|---|---|
| `REQUIREMENTS.md:76` | `[ ]` no checklist |
| `REQUIREMENTS.md:184` | `RETEN-05 \| **Phase 46** \| Pending` |
| `REQUIREMENTS.md:231` | Phase 46 = `PURGA (7) + RETEN-05` |
| `REQUIREMENTS.md:236` | A razão, explícita |

A razão registrada é a certa, e é a razão que **protege a propriedade que define a Phase 43**:

> *"o requirement diz 'definida **e aplicada**' — e a aplicação é um `DELETE` por cron. Pôr um cron destrutivo na Phase 43 quebraria a propriedade que define aquela fase (zero ação destrutiva), que é justamente o que a torna segura de executar cedo."*

**Não é omissão. É escopo defendido, com o argumento escrito.** Nada a fazer.

### CONSENT-05 — o `[ ]` é correto, mas o roteamento está errado

O `[ ]` é **defensável e correto**. O requirement pede `autorizacao_analise_video` **resolvido**. Metade está feita e provada: a coleta parou (chave nunca emitida, `.strict()` recusa, Deno 16/16, e o print do cadastro ao vivo sem menção alguma a vídeo). A outra metade não: a coluna segue `NOT NULL DEFAULT false`, então **cada linha nova ainda afirma uma resposta a uma pergunta que deixou de ser feita**. Um `[x]` aqui afirmaria em `.planning/` exatamente a classe de coisa que esta fase existe para eliminar.

**Mas o roteamento contradiz o todo.** `REQUIREMENTS.md:178` diz:

```
| CONSENT-05 | Phase 43 | In Progress (servidor em 43-01; cliente em 43-03; apply/deploy em 43-07) |
```

O trabalho que resta **não é** da Phase 43 — `43-analise-video-default-false-fabrica-afirmacao.md` o roteia para a **47**, e o ROADMAP põe o portão destrutivo do `DROP` sob CONSOL-03/Phase 47. Do jeito que está, no fecho do milestone o CONSENT-05 vai ler como *"item inacabado da Phase 43"* em vez de *"deferimento deliberado para a 47"*.

**A correção é de uma linha, e o modelo certo está na linha 184, seis linhas abaixo:** RETEN-05 aponta para a Phase 46, não para a 43. CONSENT-05 deveria apontar para a 47 do mesmo jeito.

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Consentimentos opcionais nascem desmarcados; ao marcar, grava versão + hash + timestamp | ✓ **VERIFIED** | Cadastro REAL em navegador (2ª passagem): `v2-2026-08`, hash idêntico ao hex pinado, `consent_registrado_em` preenchida, as duas caixas desmarcadas gravando `false`. Sem alteração nesta passagem |
| 2 | Dois consentimentos distintos; revogação de marketing pelo painel honrada no envio | ✓ **VERIFIED** | Recusa por INSERÇÃO REAL (`P0003`) + revogação REAL na tela com o GRANT de coluna do CR-01 segurando. Sem alteração nesta passagem |
| 3 | `autorizacao_analise_video` deixou de ser promessa órfã **e** click tracking desligado, verificado no provedor | ✓ **VERIFIED** | Chave nunca emitida + `.strict()` recusa (Deno 16/16); CONSENT-06 executado com confirmação POSITIVA (`open_tracking:false`, `click_tracking:false`), lógica do marcador `✓` conferida no fonte. Ressalva `DEFAULT false` → Phase 47 |
| 4 | Admin altera a janela de retenção sem deploy; seed de 2 anos como teto consentido; veredito RETEN-06 ANTES da estrutura | ✓ **VERIFIED** *(era ⚠️ PRESENT_BEHAVIOR_UNVERIFIED)* | **As 3 cláusulas fechadas.** Leitura: `20260803000001` com `::text`, auto-verificável por `DO` que EXECUTA e exige 8 linhas; md5 `7e9b9797…` reproduzido do arquivo nesta passagem; tela carregou. Escrita: `rejeitado` 24 → 18 pela tela, `origem`→`admin`, `alterado_por` resolvido **pelo LEFT JOIN que estava quebrado**, **exatamente 1** linha de auditoria com `dados_antes/depois` corretos, 7/8 estados intactos. ⚠ Ver W-3: prova por evento, sem guarda de regressão |
| 5 | Prévia read-only responde "estes N seriam purgados" sem executar nada; `autorizacao_retencao_curriculo` citado como base legal | ✓ **VERIFIED** | `candidaturas_alem_da_janela()` com `REVOKE ALL` sem grant de volta; `md5(prosrc)` bateu o pin; `calculada_em := now()` no servidor; asserção negativa estrutural. ⚠ Duas ressalvas de "nunca visto ao vivo" seguem, em human_verification |

**Score:** **5/5** truths verified · 0 presentes-não-exercitados · 0 falhados

---

## O que mudou desde a 2ª passagem — medido

Apenas **três arquivos** mudaram (`git diff --name-only 1076434..HEAD`). Listo-os todos porque a economia da mudança é ela própria uma evidência:

| Arquivo | Mudança | Verificação minha |
|---|---|---|
| `supabase/migrations/20260803000001…` | **NOVO** — o `::text` que fecha o 42804 | Lido linha a linha. O `DO` de auto-verificação executa o caminho feliz e exige 8 linhas. md5 reproduzido |
| `supabase/tests/p43_matriz_retencao_smoke.sql` | +67/−5 — a (k) e o gate 10 → 11 | Diff conferido: a (k) executa de verdade, com claim válida, e assere 8 linhas E 8 etapas distintas. O bloco (c) **não foi tocado** |
| `index.html` | Título e `lang` | `<html lang="pt-BR">`, `<title>Beauty Smile — Carreiras</title>`, `<meta description>` em pt-BR. O título do protótipo do Figma sumiu |

**Zero linhas de `src/` mudaram. Zero testes acrescentados** — 1422 antes, 1422 depois, em 155 arquivos. Isso é consistente com a narrativa e é o fato que sustenta W-3.

### O 42804, e por que o rebaixamento se pagou

O rebaixamento do SC#4 na 2ª passagem foi feito por dois motivos: consistência de padrão, e o fato novo de que `services/`/`hooks/` não tinham teste. **Ele encontrou um bug que fazia toda chamada bem-sucedida da função falhar desde o apply.** A cadeia causal é limpa e vale registrar:

```
rebaixamento por "a tela nunca foi aberta"
  → operador abre a tela
    → matriz não carrega (prévia carrega — o contraste já localiza o defeito no CORPO)
      → 42804: RETURNS TABLE declara text, u.nome_completo é varchar(255)
        → RETURN QUERY exige IDENTIDADE de tipo, não compatibilidade
          → ::text, migration, (k), 11/11
```

O diagnóstico registrado no cabeçalho da migration é o de alguém que raciocinou em vez de tentar: *"As duas funcoes tem o MESMO guard, entao o contraste ja localizava o problema no CORPO desta, nao na autorizacao."*

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `supabase/migrations/20260803000001…` | O cast que fecha o 42804 | ✓ **VERIFIED** | `::text` na linha 102; auto-verificação que EXECUTA o caminho feliz; md5 `7e9b9797…` **reproduzido do arquivo nesta passagem**; `COMMENT` carrega a lição para dentro do banco |
| `supabase/tests/p43_matriz_retencao_smoke.sql` | Asserção (k), gate 11 | ⚠️ **PRESENTE E CORRETA, MAS INALCANÇÁVEL** | A (k) é bem escrita (8 linhas E 8 etapas distintas). Mas a (c) aborta o run antes dela desde a escrita ao vivo. Ver W-1 |
| `index.html` | Identidade do produto | ✓ VERIFIED | `lang="pt-BR"`, título e description do produto real |
| `src/features/admin/retencao/**` | Matriz editável + prévia | ✓ **VERIFIED — E AGORA EXERCITADO** *(era ⚠ NUNCA EXERCITADO)* | Tela aberta, matriz renderizada, escrita executada. 50 casos verdes em 4 arquivos. ⚠ `services/` e `hooks/` seguem com **zero** teste |
| `supabase/migrations/20260801000001…04` + `20260802000001` | 5 migrations da fase | ✓ VERIFIED | Inalteradas. Ver a ressalva de probes |
| `src/features/privacidade/**` | Superfície de revogação | ✓ VERIFIED | Inalterada; exercitada ao vivo na 2ª passagem. ⚠ ramo autorizado da guarda nunca visto |
| `43-07-SUMMARY.md` | Bloco de correção datado | ✓ **VERIFIED** *(era ⚠ Warning)* | Linha 366: `✅ CORRECAO (2026-08-03) — a secao abaixo esta SUPERADA`, com o corpo original **preservado** e a razão da preservação escrita. Exatamente o padrão da P37/37-05 que apontei |
| `.planning/todos/pending/publicar-cliente…` | Dono para o defeito de processo | ✓ **VERIFIED** *(era 🔴 sem dono)* | `priority: high`, `resolves_phase: 44`, três ações concretas, Phases 44/45/47 nomeadas. Ressalva em W-8 |
| `REQUIREMENTS.md` | Marcas alinhadas ao estado real | ⚠️ **PARCIAL** | Checklist corrigido (CONSENT-01/02/03/04/06 → `[x]`). **Tabela de status 174-184 NÃO corrigida** — contradiz o checklist. Ver W-6 |
| `STATE.md` | Registro do incidente | ⚠️ **PARCIAL** | §BLOQUEADOR FECHADO cobre bem o 1º incidente. **Current Position ainda diz `gaps_found, 2/5`; o 42804 não está em lugar nenhum.** Ver W-7 |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `MatrizRetencaoTable` | `rpc('listar_matriz_retencao')` | `useMatrizRetencao` → `retencaoService.listarMatriz` | ✓ **WIRED — EXERCITADO AO VIVO** *(era ✓ em código, nunca renderizado)* | `retencaoService.ts:177`. A matriz carregou na tela depois do fix. ⚠ sem teste no elo |
| `EditarJanelaDialog` | `rpc('salvar_janela_retencao')` | `useSalvarJanela` → `retencaoService.salvarJanela` | ✓ **WIRED — EXERCITADO AO VIVO** *(era ⚠ SEM TESTE E SEM EXECUÇÃO)* | `retencaoService.ts:289`. Escrita real 24 → 18, auditada. ⚠ **segue sem teste** — a execução foi evento único |
| `salvar_janela_retencao` | `logs_auditoria` | `PERFORM` no mesmo corpo | ✓ **WIRED — CONFIRMADO EM USO REAL** | Exatamente 1 linha, `dados_antes:24` / `dados_depois:18`, `sucesso:true`. A atomicidade que (g) prova em rollback foi honrada em produção |
| `config_retencao_etapa.alterado_por` | `usuarios_rh.nome_completo` | `LEFT JOIN` em `listar_matriz_retencao` | ✓ **WIRED** *(era QUEBRADO em silêncio)* | `::text` no `20260803000001`. Provado pela leitura que exibiu o nome do próprio alterador |
| Cliente publicado | EF `cadastrar-candidato` v16 | POST | ✓ WIRED | Reconferido por execução na 2ª passagem |
| `PrivacidadeCandidatoPage` | `public.autorizacoes` | `revogarMarketing` → PostgREST | ✓ WIRED — exercitado ao vivo | 1 coluna escrita, 4 colunas de prova intactas |
| `config_retencao_etapa` | `previa_retencao()` | `candidaturas_alem_da_janela()` | ✓ WIRED | Gate de md5 + asserção (f) do previa smoke |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `MatrizRetencaoTable` | `linhas` | `rpc('listar_matriz_retencao')` | **Sim — 8 linhas renderizadas na tela, ao vivo** | ✓ **FLOWING** *(era "nunca renderizado")* |
| `EditarJanelaDialog` | `janela_meses` → RPC | `useSalvarJanela` | **Sim — escrita real chegou ao banco e voltou pela leitura** | ✓ FLOWING |
| `PreviaRetencaoBloco` | `linhas`, `total` | `rpc('previa_retencao')` + `_total` | Zero hoje, e zero é a resposta certa. Carimbo do servidor visto ao vivo (`01:36`) | ✓ FLOWING (estado zero explícito) |
| `AutorizacoesStep` | `AUTORIZACOES` | `consent-text.json` | Sim — confirmado em tela | ✓ FLOWING |
| `GuardaCurriculoBloco` | `autorizado`, `autorizadoEm` | `.select(ALLOWLIST)` | Sim, mas só o ramo **NÃO-autorizado** foi visto | ⚠️ FLOWING — ramo autorizado só em teste |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Baseline `tsc` congelada em 97 | `npm run lint` | **97** — idêntico | ✓ PASS |
| Suíte inteira | `npm run test:run` | **155 arquivos · 1422 testes · 0 falhas** | ✓ PASS |
| Feature `admin/retencao` | `npx vitest run src/features/admin/retencao` | **4 arquivos · 50 testes · 0 falhas** — todos de componente | ✓ PASS |
| Testes em `services/` ou `hooks/` de retenção | `find … -name "*.test.*" \| wc -l` | **0** | ✗ **AUSENTE (W-3)** |
| Build + gates PERF-03/segredo | `npm run build` | verde · 45 chunks · eager 922.84 kB < 2722.92 kB · `assert-chunks PASSED` | ✓ PASS |
| md5 do `20260803000001` × o hash registrado | `printf '%s' "$(cat …)" \| md5` | **`7e9b9797ac3fe22f95b34b25db30bfa4`** — bate | ✓ **PASS** |
| Origem sincronizada | `git rev-list --left-right --count origin/main...HEAD` | **`0  0`** — `origin/main` = `6588ba6` = HEAD | ✓ PASS |
| Marcadores de dívida nos arquivos mudados | `grep -nE "TBD\|FIXME\|XXX"` em `1076434..HEAD` | **nenhum** | ✓ PASS |
| `p43_matriz_retencao_smoke.sql` re-run | análise determinística da ordem dos `IF` de (c) | **RED em (c) via `v_em24=7`; (d)…(k),(z) inalcançáveis** | ✗ **RED (W-1)** |
| `p43_consent_prova_smoke.sql` re-run | análise determinística (2ª passagem) | **RED em (b), com acusação falsa** | ✗ RED (rastreado → 44) |

### Probe Execution

Não há probes `scripts/*/tests/probe-*.sh` neste repositório. Os equivalentes são os quatro smokes SQL, que exigem MCP do Supabase — **indisponível a subagentes** (bug upstream registrado no cabeçalho dos próprios smokes). Não executei nenhum, e não tomo nenhum resultado de execução como meu.

| Probe | Como o avaliei | Status |
|---|---|---|
| `p43_matriz_retencao_smoke.sql` (11 asserções) | Análise determinística do SQL + do estado conhecido do banco | ✗ **RED em (c)** — ver W-1. O `11/11` registrado é **histórico**, válido para o instante entre o apply do fix e a escrita ao vivo |
| `p43_consent_prova_smoke.sql` (6) | Análise determinística (2ª passagem) | ✗ **RED em (b)**, com acusação falsa. `6/6` é histórico |
| `p43_guard_marketing_smoke.sql` (9) | Não re-avaliado; sem baseline congelada de linha | ? Presumido válido |
| `p43_previa_smoke.sql` (9) | Não re-avaliado; assertivas estruturais + coerência relativa | ? Presumido válido |

**Substituto que não depende de MCP, e é forte:** a migration `20260803000001` **é** seu próprio probe. O bloco `DO $verifica_leitura$` executa `listar_matriz_retencao()` com claim de administrador real e levanta se o retorno não for 8 linhas. Um apply bem-sucedido implica, logicamente, que o caminho feliz executou em PROD. Somado ao md5 que reproduzi do arquivo, isto é corroboração estrutural — não atestação.

### Requirements Coverage

| Requirement | Marca em REQUIREMENTS.md | Status real | Evidence |
|---|---|---|---|
| CONSENT-01 | `[x]` ✓ *(corrigido)* | ✓ SATISFIED | As duas caixas desmarcadas gravaram `false`, ao vivo |
| CONSENT-02 | `[x]` ✓ *(corrigido)* | ✓ SATISFIED | Versão + hash + timestamp na linha real; hash == pin |
| CONSENT-03 | `[x]` ✓ *(corrigido)* | ✓ SATISFIED | Dois consentimentos distintos; guard vivo; transacional informativo em tela |
| CONSENT-04 | `[x]` | ✓ SATISFIED | Revogação real pelo painel, GRANT do CR-01 segurando |
| CONSENT-05 | `[ ]` | ⚠️ **PARCIAL — `[ ]` CORRETO** | Coleta parou (provado); coluna `NOT NULL DEFAULT false` não. ⚠ tabela de status roteia p/ 43, o todo p/ **47** |
| CONSENT-06 | `[x]` ✓ *(corrigido)* | ✓ SATISFIED | Confirmação POSITIVA do provedor |
| RETEN-01 | `[x]` | ✓ **SATISFIED — agora com a tela exercitada** | Tabela + RPCs vivas; **a leitura estava quebrada e foi consertada**; matriz renderizada ao vivo |
| RETEN-02 | `[x]` | ✓ **SATISFIED — parentética RETIRADA da objeção** | Seed 8/8 @24 com enquadramento BD-1. *"alteração PELA TELA, auditada, em 43-09"* agora é **literalmente verdadeira** |
| RETEN-03 | `[x]` | ✓ SATISFIED (com ressalva) | Bloco na página aberta ao vivo; 3 casos em teste. **Ramo autorizado nunca visto em tela** |
| RETEN-04 | `[x]` | ✓ SATISFIED | Prévia agregada viva, enumerador revogado, carimbo no servidor, gate de md5 |
| RETEN-06 | `[x]` | ✓ SATISFIED | Veredito datado, wave anterior à da estrutura |
| RETEN-05 | `[ ]` → Phase 46 | ✓ **CORRETO, não omissão** | Justificado em 4 locais consistentes; ver Pergunta 5 |

**Zero requirements órfãos.** Todos os 11 IDs do ROADMAP aparecem no frontmatter de algum plano.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | `TBD`/`FIXME`/`XXX` nos arquivos mudados em `1076434..HEAD` | — | **Nenhum.** Varredura limpa |
| `p43_matriz_retencao_smoke.sql` | 242-244 | Mensagem que acusa violação de teto quando houve **aperto** de teto | ⚠️ **Warning** | Quem rodar lê a acusação errada. E o `IF` mata (d)…(k)(z). **W-1** |
| `src/features/admin/retencao/{services,hooks}` | — | Zero cobertura na camada que fala com a RPC | ⚠️ Warning | **Sem todo.** Dívida não rastreada. **W-3** |
| `REQUIREMENTS.md` | 58-66, 174-184 | Tabela de status contradiz o checklist; bloco de nota descreve estado superado | ⚠️ Warning | O arquivo contradiz a si mesmo. **W-6** |
| `.planning/` (varredura completa) | — | A escrita ao vivo 24 → 18 não existe em artefato nenhum | ⚠️ Warning | A evidência que fecha o SC#4 só existe em conversa. **W-2** |
| `STATE.md` | Current Position, Session Continuity | `gaps_found, 2/5`; 42804 ausente | ⚠️ Warning | **W-7** |
| `43-09-SUMMARY.md` | `requires:` | *"8 linhas, todas em 24 meses, origem='seed'"* | ℹ️ Info | Falso desde a alteração ao vivo. Correção de uma linha |
| `privacidadeService.ts` | 190 | `updated_at` do relógio do cliente | ℹ️ Info | Rastreado, `resolves_phase: 46` |

---

## Warnings

**W-1 — 🔴 O smoke da matriz morreu, e a mensagem que ele vai dar é a errada.** A (c) dispara em `v_em24 = 7` acusando violação do *"teto já consentido"* a respeito de um **aperto** (18 < 24). A declaração de "por desenho" do cabeçalho cobre a **terceira** checagem, que nunca é alcançada. E porque a (c) é a 3ª de 11 num batch de chamada única, **(d), (e), (f), (g), (h), (i), (j), (k) e (z) tornaram-se inalcançáveis** — incluindo a **(k)**, a guarda do 42804 acrescentada no mesmo dia, e a **(j)**, a asserção que mede a invariante zero-destrutiva que define a fase. O todo existente **exime** a (c) da correção, então a Phase 44 vai consertar um smoke e deixar este morto. **É o achado mais consequente desta passagem.**

**W-2 — 🔴 A escrita que fecha o SC#4 não está escrita em lugar nenhum.** Varri `.planning/` e `docs/`: zero ocorrências de `18 meses`, `janela_meses = 18`, `24 → 18`. A evidência decisiva do critério de sucesso mais disputado da fase existe apenas na conversa que me trouxe até aqui. Se este relatório for lido em três meses, o `VERIFIED` do SC#4 não terá lastro consultável — exceto por este próprio parágrafo. O 42804 tem registro excelente (migration, smoke, commit); **a escrita que o validou, nenhum.**

**W-3 — 🔴 `services/` e `hooks/` de `admin/retencao` seguem sem um único teste, e isso não tem arquivo.** Medido: 0 arquivos de teste; suíte idêntica (1422) antes e depois. A prova viva é um **evento**, não um mecanismo — um refactor que quebre o hop passa por `tsc` 97 e 1422/1422 sem que nada acuse. **Nomeado em três passagens de verificação e nunca convertido em todo.** É a única dívida desta fase sem dono em arquivo.

**W-4 — ⚠️ A lição do contador de asserções vive só em `supabase/`.** Registrada de forma exemplar em três lugares (migration, smoke, e a `COMMENT` que a leva para dentro do banco — durabilidade máxima). **Nada em `.planning/`.** Quem planejar a Phase 46 — a fase que arma um `DELETE` por cron sobre funções guardadas — não vai encontrá-la.

**W-5 — ⚠️ A disciplina já existia na própria fase.** 43-05 tem a (f) *"O CAMINHO POSITIVO EXISTE"*; 43-06 tem a (h) *"a prévia EXECUTA"*, com o raciocínio explícito no comentário. Só o 43-04 não tem — e foi escrito primeiro. **Isto não foi ignorância; foi inconsistência sem ninguém verificando consistência.** A varredura que a teria pego custa três comandos e foi feita pela primeira vez nesta passagem.

**W-6 — ⚠️ `REQUIREMENTS.md` contradiz a si mesmo.** Checklist corrigido (linhas 52-68); tabela de status (174-184) **não** — segue "In Progress"/"Pending" para itens que o checklist marca `[x]`. E o bloco de nota 58-66 ainda afirma que CONSENT-01/02/03 estão deliberadamente sem `[x]`. Meia correção é pior que nenhuma: agora o arquivo tem duas respostas para a mesma pergunta.

**W-7 — ⚠️ `STATE.md` está uma passagem atrás.** Current Position: `gaps_found, 2/5`, *"Last activity: 2026-08-02"*. O §BLOQUEADOR FECHADO cobre bem o primeiro incidente e **não menciona o 42804** — o segundo incidente da fase, e o único encontrado por verificação em vez de por acaso.

**W-8 — ⚠️ O novo todo é bom, mas sua ação nº 1 não é entregável da Phase 44.** *"Um passo de publicação explícito no plano de TODA fase que toque `src/`"* é mudança de template. Se a 44 a implementar só para si, a 45 e a 47 recorrem e o todo fecha tendo consertado uma instância de um defeito de classe.

**W-9 — ⚠️ A revogação depende de uma policy que não existe em arquivo nenhum.** `Candidatos podem atualizar suas autorizacoes` vive em PROD e em nenhuma migration — 4ª instância do drift, com todo aberto (`processo-origem-do-drift-desconhecida`). Um `db reset` a perderia em silêncio. Inalterado desde a 2ª passagem.

**W-10 — ⚠️ Os 4 candidatos sem linha de consentimento continuam sem linha.** Correto e deliberado (BD-4: back-fill seria fabricar prova). Registrado para que ninguém "corrija" depois por engano.

---

## Gaps Summary

**Não há gaps.** Os cinco critérios de sucesso do ROADMAP são verdadeiros no código e no banco, e os dois que dependiam de comportamento de runtime — SC#2 e SC#4 — foram exercitados por pessoas reais em produção. **5/5.**

O SC#4 fechou pelo padrão que eu mesmo estipulei, e o caminho até lá foi o melhor argumento possível a favor do rebaixamento: ele produziu um bug real, de produção, que três smokes verdes, 1422 testes e duas passagens de verificação não tinham visto. **`listar_matriz_retencao` falhava em toda chamada bem-sucedida desde o apply, e nada no sistema sabia.**

O que resta não falsifica critério nenhum, mas eu não o suavizo. **A fase corrigiu o defeito e não corrigiu a condição que o produziu.** A (k) — a asserção que existe exatamente para impedir que o 42804 volte — nasceu dentro de um arquivo que a ação legítima seguinte tornou inalcançável, junto com a asserção que mede a invariante zero-destrutiva da fase inteira. A lição sobre contadores de asserções está escrita com uma clareza que merece elogio, em três lugares, e em nenhum deles quem planeja a próxima fase vai olhar. E o elo cliente→RPC segue provado por um evento de um dia, sem uma linha de teste, com essa dívida nomeada em três passagens consecutivas e ainda sem arquivo.

Há uma simetria que vale dizer em voz alta, porque é a mesma da 2ª passagem com outro objeto. Lá, a fase previu o incidente do deploy por escrito e mesmo assim o sofreu, porque o aviso não estava onde a execução o lê. Aqui, a fase diagnosticou a doença do gate com precisão — *"um contador de asserções verdes mede caminhos exercitados, não caminhos existentes"* — e escreveu o remédio dentro do frasco que acabou de lacrar. **Diagnóstico excelente, entrega no endereço errado, duas vezes.** Essa, e não nenhum dos dois bugs, é a coisa que a Phase 44 precisa levar consigo.

---

# ── HISTÓRICO ──────────────────────────────────────────────────────────

Preservado porque o registro de uma fase que embarcou quebrada, foi pega, consertada, pega de novo e consertada de novo vale mais que um arquivo de aparência limpa. As duas passagens abaixo ficam com o veredito que tinham **no momento em que foram escritas** — não são retro-editadas.

## 2ª passagem — 2026-08-03T04:18:24Z · `human_needed` · **4/5**

**Veredito de então, verbatim:**

> Os três gaps que eu abri estão **genuinamente fechados**, e dois deles pelo padrão mais forte que existe neste projeto — uma pessoa real, num navegador real, produzindo uma linha real cujos valores eu consigo amarrar a um hash pinado independentemente. **O que resta não é um resíduo do que eu apontei: é uma tela que ninguém nunca abriu**, e o elo que a liga ao mecanismo provado é o único da fase sem teste e sem execução.

**Placar de então:** SC#1 ✓ · SC#2 ✓ · SC#3 ✓ · **SC#4 ⚠️ PRESENT_BEHAVIOR_UNVERIFIED** · SC#5 ✓.

**O movimento que definiu a passagem — o rebaixamento do SC#4.** Na 1ª passagem o SC#4 estava ✓ VERIFIED, creditado com *"o mecanismo é o que 'sem deploy' significa"*. A 2ª passagem o rebaixou por dois motivos: consistência (SC#1 e SC#2 tinham acabado de ser levados ao padrão vivo, e manter padrão mais frouxo para o SC#4 seria incoerência) e um fato novo medido (`retencaoService`, `useSalvarJanela`, `usePreviaRetencao` e `useMatrizRetencao` sem nenhum teste; os casos do `EditarJanelaDialog` mockam a mutação).

**O que o rebaixamento produziu:** o operador abriu `/admin/retencao` pela primeira vez e a matriz não carregou. `42804 — structure of query does not match function result type`. **A função falhava em toda chamada bem-sucedida desde o apply**, e o smoke 10/10 não pegou porque sua única asserção sobre aquela função testava a recusa sem claim — o guard levanta na primeira linha e o `RETURN QUERY` nunca executava.

**Os três gaps da 1ª passagem e seu desfecho, confirmados nesta 2ª:**

| # | Gap | Desfecho |
|---|---|---|
| 1 | **SC#1** — cliente nunca publicado; 136 commits fora de remote; EF v16 recusa o payload → 400 em produção | **FECHADO.** `origin/main = 581abe1`; payload aceito, reconferido por execução; cadastro real ponta a ponta |
| 2 | **SC#2** — `/candidato/privacidade` existia em código e em teste, não em produção | **FECHADO.** Revogação real na tela, com o GRANT do CR-01 segurando |
| 3 | **SC#3** — CONSENT-06 nunca executado | **FECHADO.** Confirmação positiva do provedor; lógica do marcador `✓` conferida no fonte |

**O que a 2ª passagem descobriu que a 1ª não viu:** que havia **três** causas empilhadas no incidente do cadastro, não uma. Que o Vercel não buildava desde **2026-06-27** — cinco semanas servindo um build congelado, os 20 deployments visíveis em ERROR, por uma divergência `dist/` × `build/`. Que o SPA fallback nunca existiu (nenhuma URL direta funcionava, nem `/cadastro`). E que o dashboard do candidato renderizava uma cópia local da barra persona **sem** o link "Área do candidato" — a causa concreta de a revogação ser inalcançável.

**Achados de processo que ela abriu:** que publicar o cliente não pertencia a plano, fase ou todo nenhum; e que nenhum gate observava o artefato deployado. **Ambos fechados na 3ª passagem** pelo todo `publicar-cliente-nao-pertence-a-plano-nenhum.md` (high, → 44).

## 1ª passagem — 2026-08-02T18:59:05Z · `gaps_found` · **2/5**

**Veredito de então, verbatim:**

> O banco e o servidor desta fase estão entre os trabalhos mais bem provados do projeto — cinco migrations vivas com fidelidade md5, quatro smokes nos totais exatos, uma escrita real de consentimento com hash idêntico ao pin, e um CR-01 crítico achado, confirmado por execução e fechado. **E mesmo assim o objetivo da fase não está alcançado, porque nenhum candidato consegue marcar checkbox nenhum: a Edge Function v16 é breaking contra o bundle que a produção serve, e o cadastro responde 400.**

**Placar de então:** SC#1 ✗ FAILED · SC#2 ✗ FAILED (metade) · SC#3 ✗ FAILED · SC#4 ✓ VERIFIED · SC#5 ✓ VERIFIED.

**O que a 1ª passagem acertou:** que o cadastro estava quebrado em produção, e **por execução, não por leitura**. Que parar no passo 2 de uma sequência declarada obrigatória não é pausa neutra. Que "não reportado pela API" não conta como confirmação de tracking desligado.

**O que a 1ª passagem errou, e foi corrigido depois:** creditou o SC#4 como VERIFIED sobre o mecanismo, sem a tela — julgamento que a 2ª passagem reverteu e que a 3ª mostrou ter sido a reversão certa: **havia um bug ali, e ele só apareceu quando a tela foi aberta.**

## Evolução do julgamento entre as três passagens

| Item | 1ª (2026-08-02) | 2ª (2026-08-03 04:18) | 3ª (2026-08-03 05:02) |
|---|---|---|---|
| **Placar** | 2/5 · `gaps_found` | 4/5 · `human_needed` | **5/5 · `human_needed`** |
| **SC#1** | ✗ FAILED | ✓ VERIFIED (ao vivo) | ✓ VERIFIED |
| **SC#2** | ✗ FAILED (metade) | ✓ VERIFIED (ao vivo) | ✓ VERIFIED |
| **SC#3** | ✗ FAILED | ✓ VERIFIED (provedor) | ✓ VERIFIED |
| **SC#4** | ✓ VERIFIED (mecanismo) | ⚠️ **rebaixado** | ✓ **VERIFIED (ao vivo)** — o rebaixamento achou um bug real |
| **SC#5** | ✓ VERIFIED | ✓ VERIFIED | ✓ VERIFIED |
| `[x]` de **CONSENT-04** | "prematuro" | aceito | aceito |
| `[x]` de **RETEN-03** | "prematuro" | aceito, com ressalva | aceito, ressalva mantida (ramo autorizado) |
| Parentética de **RETEN-02** | "sobreafirma" | "continua sobreafirmando" | **RETIRADA — agora é literalmente verdadeira** |
| `REQUIREMENTS.md` | `[x]` prematuro em 3 | `[ ]` atrasado em 4 | **checklist corrigido; tabela de status não (W-6)** |
| Publicação do cliente sem dono | não visto | 🔴 aberto | ✓ **fechado** por todo high → 44 |
| `43-07-SUMMARY` sem correção | não visto | ⚠ aberto | ✓ **fechado** — bloco datado, corpo preservado |
| Smokes com baseline congelada | não visto | 1 arquivo RED (consentimento) | **2 arquivos RED** — o da matriz morreu (W-1) |
| `services/`/`hooks/` sem teste | não medido | medido, nomeado | **medido, nomeado 3ª vez, ainda sem todo (W-3)** |

---

_Verified: 2026-08-03T05:02:00Z_
_Verifier: Claude (gsd-verifier) — 3ª passagem, re-verificação após o fechamento do SC#4_
