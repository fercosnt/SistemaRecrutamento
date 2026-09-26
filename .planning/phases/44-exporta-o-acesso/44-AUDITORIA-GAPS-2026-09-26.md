# Phase 44 — Auditoria dos gaps de 2026-08-04, relida em 2026-09-26

> **O que este documento é.** Uma **releitura** dos gaps registrados em
> `44-VERIFICATION.md` (verificada em 2026-08-04), medida contra o estado de PROD e do
> repositório em **2026-09-26**, depois das fases 45, 46, 47, 48 e 49.
>
> **O que este documento NÃO é.** Não substitui, não corrige e não invalida a
> `44-VERIFICATION.md` — aquele arquivo continua intacto e continua sendo o veredito da
> fase **na data em que foi escrito**. Não marca requisito nem fase como completa, não
> edita `ROADMAP.md` nem `STATE.md`, e não escreveu um byte em PROD: toda medição abaixo
> é `SELECT` ou `GET`.
>
> **Por que existe.** A própria `44-VERIFICATION.md` afirma, com autoridade de documento
> oficial, coisas que **deixaram de ser verdade** — a mais grave delas é «a EF está
> implantada na version 1, a versão PRÉ-correção». O `STATE.md:1053` já registrava a
> suspeita («registro provavelmente STALE. Conferir ao retomar») e ninguém conferiu.
> Esta auditoria confere.

**Auditor:** Claude (subagente de leitura) · **Data:** 2026-09-26
**Projeto Supabase:** `isljnozzlvckrgjjbjwp` · **Branch:** `main` · árvore limpa ·
`git log origin/main..HEAD` **vazio** (os dois canais — Supabase e Vercel — estão em dia)

---

## 0 · A população, antes de qualquer booleano

A regra que esta sessão aprendeu do jeito caro: **um `false` numa prova positiva tem duas
causas** — critério violado ou conjunto vazio. Então a primeira medição é a população.

| O que | 2026-08-04 (o que a VERIFICATION mediu) | **2026-09-26 (medido hoje)** |
|---|---|---|
| `solicitacoes_dados` — total | **0 linhas** | **7 linhas** |
| … `tipo='acesso'`, `situacao='atendido'`, `causa NULL` | 0 | **3** (2026-08-11, 2026-09-06, 2026-09-20) |
| … `tipo='acesso'`, `situacao='pendente'` | 0 | **0** (nunca houve uma linha pendurada) |
| … `tipo='exclusao'` | 0 | 4 (1 `concluido`, 3 `cancelado`) |
| `candidatos` | — | 44 |
| `vagas` | 9 | **15** (6 com `created_by`, **9 NULL**) |
| `storage.objects` no bucket `curriculos` | 3 medidos | **24** (18 com `owner` não nulo) |
| EF `exportar-meus-dados` | **version 1**, ACTIVE | **version 5**, ACTIVE, `verify_jwt=true`, atualizada em **2026-09-24 05:24Z** |

**A consequência imediata:** a frase-âncora da `44-VERIFICATION.md` — «`solicitacoes_dados`
holds 0 rows in production» — **não descreve mais esta base**. O conjunto deixou de ser
vazio, e por isso as afirmações que dependiam dele mudam de veredito por medição, não por
interpretação.

**A ressalva que anda junto, e que é honesta dizer primeiro:** os três titulares que
exerceram o fluxo são **contas de teste do próprio operador** —
`candidato.funil@teste.com`, `fernandinho.costa.neto+claude3@gmail.com` e
`fernandinho.costa.neto+claude4@gmail.com` («Marina Alves Tavares»). O cabeçalho de
`supabase/tests/p47_teardown_dados_de_teste.sql` mede e declara o mesmo: *«Medido em
2026-09-07: `public.candidatos` tem 41 linhas e NENHUMA é de pessoa real — as vagas nunca
foram divulgadas»*. Portanto **«titular real» aqui = o operador exercendo o papel de
titular num navegador de verdade**, contra PROD, e não um terceiro. Onde isso muda o
veredito, está dito na linha.

---

## 1 · Tabela: gap × categoria × evidência

Categorias: **(1)** fechado por trabalho posterior · **(2)** ainda real ·
**(3)** fechado por decisão registrada · **(4)** não medível sem o operador.

| # | Gap como está escrito na `44-VERIFICATION.md` | Cat. | Evidência de hoje |
|---|---|:--:|---|
| **G1** | **EXPORT-01** — «Zero end-to-end exercises exist. `solicitacoes_dados` holds 0 rows… No `.json`/`.html` has ever been produced for a real titular» | **1** | **3 linhas** `tipo=acesso / situacao=atendido / causa NULL` medidas hoje, atendidas em **4,77 s · 4,78 s · 4,65 s**. Dois exercícios estão escriturados linha a linha: `GUIA-VALIDACAO-FINAL.md` §7.22 (**F1, 2026-09-06 12:31**) — *«os **dois arquivos** baixaram: `beauty-smile-meus-dados-2026-09-06.json` (18 KB) e o `.html` legível (23 KB)»*; e `JORNADA-GUIADA.md` §Etapa 12 (**2026-09-20 20:30**) — *«`.json`, **82.715 bytes**, 30 coleções, `versao_allowlist` 1.1.0»*, com o 2º pedido barrado **no banco** (a tabela ficou com 1 linha). Só a EF escreve `tipo='acesso'` (candidato não tem policy de escrita, medido em `44-05-EVIDENCIA-DEPLOY.md` §4) e ela exige JWT — logo as 3 linhas provam 3 sessões autenticadas de titular |
| **G1-art** | **artefato de G1** — «Deployed at version **1** — the PRE-fix version… the Edge Function specifically has NOT been redeployed since 81c40cc» | **1** | ⚠ **OBSOLETO, e foi o registro mais enganoso do documento.** Hoje: **v5**. Fechado em **2026-08-05** pela **Phase 45 / plano 45-01 Task 3 / commit `9bdd9af`** (`v1 → v2`, `sha256 43a3297d… → 2d05de28…`, `verify_jwt` preservado) — escriturado em `45-SONDAS-PROD.md` §«G2 · ✅ FECHADO» e `STATE.md:425`. Depois: **v3** em 2026-09-21 (48-17, allowlist 1.2.0) e **v5** em 2026-09-24 (49-17, allowlist 1.3.0). O corpo publicado hoje, lido por `GET /functions/exportar-meus-dados/body`, carrega os marcadores dos consertos: `"FECHA no ilegível"` (WR-02, o cooldown que falhava ABERTO) 2×, `"Descartar o erro deixava"` (WR-03) 2×, `"WR-04"` 2×, `situacao: "atendido"` 2×, `falha_geracao` 2×, `"1.3.0"` 2×. **E a ORDEM que o gap exigia foi respeitada:** o redeploy (2026-08-05) veio **antes** do primeiro exercício (2026-08-11) |
| **G2** | **EXPORT-02** — «nenhum byte projetou dado real… no production row has ever been read through this path»; CR-01 corrigido no repo «but has never been exercised against a real payload» | **1** | Os dois exercícios acima produziram payload real: **30 coleções** (as vazias inclusive), 18 KB / 82.715 B de `.json`, `.html` de 23 KB, e a seção `o_que_nao_esta_nesta_copia` renderizada. O conserto do CR-01 está vivo **nos dois canais**: no corpo da EF v5 e no bundle publicado do front (`index-TmukRNYL.js` traz `padrao_nome_de_endereco` e `fora_do_arquivo_legivel`, e o objeto da allowlist compilada inclui `entrevista_analises` — a tabela que só existe a partir da 1.3.0). Nada de `select('*')` na projeção: `.select(def.colunas.join(', '))` segue sendo o único caminho |
| **G3** | **EXPORT-03** — «No human has opened their own currículo through the new client-minted URL… TTL expiry and the three DevTools negative assertions (deferred by the operator)» | **1** | Executado e escriturado em `GUIA-VALIDACAO-FINAL.md` (linha 337): **B14 ✅** *«Assinada com TTL 60 s (`iat`/`exp` no token); recarregada depois → **400**»* e **B15 ✅** *«Zero chamadas a `get-curriculo-url`; URL assinada ausente do console e do DOM»*. São exatamente a expiração e as três asserções negativas que o gap pedia. Corroboração de banco: dos 18 objetos de `curriculos` com `owner` não nulo, **18/18** têm o prefixo de caminho **igual ao `owner`** — a convenção `auth.uid()/` do BD-7 vale para todos, e a hipótese «403/400 por convenção de pasta» (item 8 do roteiro) **não** se materializou |
| **G4-a** | **EXPORT-05** — «A live UAT with one pending row scoped to a real recruiter, per 44-09 §Checkpoint (deferred by the operator)» | **1** | A UAT rodou **nos dois papéis**, ao vivo, em 2026-09-06. **administrador:** `GUIA-VALIDACAO-FINAL.md` §7.17 **E12 ✅** — *«`/rh/pedidos-dados`: 1 pedido de acesso, atendido no mesmo dia (11/08 09:03), copy explicando que a fila é de supervisão e que o Art. 19 dá 15 dias. Fila com 0 não atendidos ≡ menu sem badge — consistentes»*. Aqui a igualdade **deixou de ser vazia**: a fila renderizou uma linha real. **recrutador:** §7.6 — *«`/rh/pedidos-dados` abre para o recrutador e diz «Nenhum pedido» — há 2; a fila é do administrador e a tela não avisa»*. Ou seja: a UAT confirmou ao vivo o defeito que o G4 previu por medição |
| **G4-b** | **EXPORT-05** — «Operator decision named in 44-09-EVIDENCIA-BD8.md §3: populate `created_by`… switch the predicate to `vagas_associadas_recrutadores`… or explicitly accept the queue as administrador-only» | **2** | **AINDA REAL, e com escopo maior do que o gap descreve.** Medido hoje: (a) o predicado **não mudou** — `pg_get_functiondef` das duas RPCs traz, idêntico, `vg.created_by = v_uid`; (b) **0 de 6** vagas com `created_by` pertencem a um `recrutador` — as 6 são de `administrador` (3 de admin ativo, 3 do inativo `recruiter@teste.com`); (c) o **único** `recrutador` em `usuarios_rh` é `recrutador.rh@teste.com` e está **`ativo=false`**, com **0 vagas**; (d) as três saídas nomeadas seguem todas abertas — `vagas_associadas_recrutadores` continua **vazia e sem leitor** (`JORNADA-GUIADA.md` linha 2205 a lista entre as tabelas «inertes de verdade»), as vagas órfãs **aumentaram** (6 NULL → **9 NULL**), e o predicado não foi trocado. A forma do defeito é a mesma de 44-09 (0 de 9 → 0 de 6); o que mudou é o número de dependentes (§2 abaixo) |
| **EXPORT-06** | Não está na lista `gaps:` do frontmatter, mas a §Gaps Summary o usa como razão de dependência: «o inventário do export **é** o plano de exclusão»; `REQUIREMENTS.md` o mantém `[ ]` | **3** | **Fechado por decisão registrada — e o requisito precisa ser reescrito, não trabalhado.** A Phase 45 **mediu** (45-RESEARCH §C2) e escreveu a razão em `docs/compliance/sql/gen-recibo-exclusao.cjs:12-25`: *«o `exportAllowlist.ts` cobre **30 de 69 tabelas** e exclui, sob a razão `telemetria_interna`, oito tabelas que guardam PII do titular — inclusive `ai_call_logs` e `logs_acesso`, DUAS das cinco do ERASE-09. Um recibo derivado dele seria honesto sobre o que diz e omisso sobre o que não diz»*. A fonte do motor é `pii-inventory.yaml`. Confirmado por varredura hoje: os **únicos** importadores de `EXPORT_ALLOWLIST` em runtime são `exportar-meus-dados/index.ts` e `src/features/privacidade/services/exportacaoService.ts` — **nada** no motor de exclusão |

---

## 2 · Onde a minha medição CONTRARIA o documento

Três lugares. O primeiro é o que esta auditoria existia para achar.

### 2.1 · «Deployed at version 1 — the PRE-fix version» é falso desde 2026-08-05

A `44-VERIFICATION.md` constrói um **anti-pattern 🛑 Blocker** inteiro sobre isso, e o
usa como «uma segunda razão independente» para a cláusula do goal não estar cumprida:

> «even if a titular clicked the button today, the artifact they would receive would carry
> known, already-fixed-in-repo defects»

Medido: a EF está na **v5**, e o redeploy que fechou esse débito aconteceu **um dia depois
da verificação** (2026-08-05, commit `9bdd9af`, Phase 45). O cenário que o documento
descreve — um titular recebendo o artefato da v1 — **nunca aconteceu**: o primeiro
exercício é de 2026-08-11, seis dias depois do conserto chegar ao ar. O documento estava
certo no instante em que foi escrito e ficou **errado por 52 dias**, com autoridade de
veredito de fase.

O `STATE.md:1053` já dizia «registro provavelmente STALE. Conferir ao retomar». A
suspeita ficou escrita e não foi convertida em medição — que é o custo específico deste
tipo de registro: ele não some, ele **envelhece com selo de verdade**.

### 2.2 · O defeito do BD-8 não é do BD-8 — é do modelo de papel, e ganhou dependentes

O G4 enquadra o problema como «o predicado de escopo da RPC de `solicitacoes_dados`».
Medido hoje, é mais largo em duas direções, e as duas mudam qual conserto faz sentido:

1. **O mesmo predicado é a espinha de RLS do papel recrutador em geral.**
   `GUIA-VALIDACAO-FINAL.md` §7.6: *«Recrutador não vê candidato nenhum. Hook mapeia
   `recrutador → rh`; `rh_le_candidaturas` exige `vagas.created_by = auth.uid()`; não há
   tela de criar vaga → o papel não alcança nada (dashboard «0 Candidatos» com 7
   candidaturas). O BD-8 já registrava «ramo rh morto por construção»; hoje ficou
   visível.»* Consertar só a RPC da fila deixaria o recrutador cego em todo o resto.
2. **A Phase 49 REFORÇOU o mesmo predicado.** O conserto de IDOR do 49-08 (commit
   `963637f3`) usa `vagaRow.created_by !== user.id` como autorização do comparativo
   (`49-PATTERNS.md:663-665`). Cada fase nova adiciona um consumidor da mesma premissa —
   trocar o predicado hoje custa mais do que custava em 2026-08-04, e custará mais amanhã.

O gap continua real. A **decisão** que ele pede é que virou maior.

### 2.3 · O artefato do export declara um consumidor que a Phase 45 recusou por escrito

`docs/compliance/export-allowlist.json`, `meta.consumidores`, ainda afirma hoje:

> «Phase 45 — plano de exclusão/anonimização: o escopo do titular **exercitado em
> produção** é o insumo do motor destrutivo (ERASE-02, ERASE-06)»

A Phase 45 mediu essa fonte e **recusou-a**, com razão nomeada (§1, EXPORT-06). O motor
consome `pii-inventory.yaml`. O artefato gerado, portanto, **superestima o próprio
alcance** — e é um artefato de conformidade, versionado, que se apresenta como autoridade.
É a mesma classe de defeito do §2.1, num arquivo gerado em vez de num relatório.

---

## 3 · Residuais que o gap original NÃO nomeava

Nenhum destes estava na lista de 2026-08-04. Aparecem porque o mundo andou.

| Residual | Cat. | Medição |
|---|:--:|---|
| **A versão exercitada não é a versão no ar.** Os dois exercícios de titular rodaram com allowlist **1.1.0**; PROD roda **1.3.0** desde 2026-09-24 (1.2.0 em 21/09 pelo 48-17; 1.3.0 em 23–24/09 pelo 49-17, com `entrevista_analises` nova na cópia). O mecanismo está provado; **esta** versão do artefato nunca passou por um titular | **4** | Exige uma sessão autenticada de titular — e o cooldown de 24 h significa escolher qual conta queimar |
| **O prazo perto do fim nunca renderizou.** Os 3 pedidos foram atendidos em **4,65–4,78 s** e **nunca houve uma linha `pendente`**. `config_sla_dados` está vivo (`acesso_dados`, atenção **7 d**, atraso **12 d**, intocado desde 2026-08-03), mas a classificação âmbar/vermelha — a metade «um pedido perto do prazo é distinguível de um recém-chegado» do SC#4 — **nunca foi vista com dado real**. As 24 asserções de componente que a 44-09 cita provam o render; não provam a fila | **4** | Exige um pedido que **fique** pendente (ou seja, uma falha de geração deliberada), ou uma fixture com `solicitado_em` retroativo — escrita em PROD, portanto decisão do operador |
| **Nenhum titular de terceiro exerceu nada.** As 3 contas são do operador; as vagas nunca foram divulgadas (medido e declarado em `p47_teardown_dados_de_teste.sql`) | **4** | Exige divulgação das vagas — que é a decisão de go-live, não um item da fase 44 |
| **A página de privacidade lê com `select=*`.** `GUIA-VALIDACAO-FINAL.md` B15: *«⚠ A página faz `candidatos?select=*` (convenção pede allowlist)»*. Não é a projeção do export (essa é por allowlist, conferida), mas encosta no vocabulário do EXPORT-02 e na classe de vulnerabilidade nº 1 do projeto | **2** | Trabalho de código, pequeno e localizado; fora do escopo literal do EXPORT-02 |
| **O `.html` do exercício de 20/09 não foi escriturado.** O registro da Etapa 12 nomeia só o `.json` (82.715 B). O código dispara os dois downloads em ordem, e o próprio docblock avisa que *«se o navegador barrar o segundo download, o que sobrevive é o que a lei exige»* | **1** | Coberto: o exercício de **06/09** registrou os **dois** arquivos (18 KB + 23 KB). O `.html` está provado — só não naquela sessão |

---

## 4 · O que falta de verdade na fase 44

Separado pelo único corte que muda o que o operador faz a seguir.

### 4.1 · É TRABALHO (código ou dado) — 1 item, e ele é uma decisão antes de ser trabalho

**T1 · O papel `recrutador` não alcança nada, e a fila do Art. 19 é só um dos sintomas.**
As três saídas continuam as de 2026-08-04 (`44-09-EVIDENCIA-BD8.md` §3), agora com dois
agravantes medidos: o predicado virou espinha de RLS do papel inteiro (`rh_le_candidaturas`)
e a Phase 49 acrescentou um consumidor novo (49-08). As opções, como estão escritas em
`GUIA-VALIDACAO-FINAL.md` §7.6:

- **(a)** recrutador vira administrador — zero código, muda o modelo de acesso;
- **(b)** as policies passam a honrar `vagas_associadas_recrutadores` — a tabela existe,
  tem **0 linhas** e **nenhuma policy a lê**; é o conserto certo e o mais caro, porque
  agora tem de varrer **todos** os consumidores do predicado, não só a RPC do BD-8;
- **(c)** tela de criar vaga, para que `created_by` nasça preenchido — não resolve as
  **9 vagas órfãs** já existentes;
- **(d)** aceitar por escrito que a fila é de administrador — o mais baixo custo, e nesse
  caso sobra um item de **copy/guard**: hoje `/rh/pedidos-dados` diz «Nenhum pedido» ao
  recrutador sem avisar que a fila não é dele (§7.6, registrado como «copy/guard»).

⚠ **Varra pela FORMA, não pelo sintoma** (CLAUDE.md): antes de mexer no predicado, liste
**todos** os lugares que hoje decidem escopo por `vagas.created_by = auth.uid()` — RPCs,
policies e EFs. Consertar um e deixar os outros produz exatamente o estado em que o
sistema está: um papel que existe, autentica e não alcança nada.

**T2 (menor, fora do escopo literal do EXPORT-02):** trocar o `candidatos?select=*` da
página de privacidade por allowlist.

### 4.2 · É UAT DO OPERADOR — 2 itens, nenhum deles o que o documento de 2026-08-04 pedia

As três UATs que a `44-VERIFICATION.md` listou em `human_verification` **foram todas
executadas** (F1, B14/B15, E12 + §7.6). O que sobra é diferente, e é menor:

- **U1 · Um pedido de cópia na allowlist 1.3.0.** Uma sessão de titular contra a versão
  que está no ar hoje, conferindo que as coleções novas (`entrevista_analises`) aparecem e
  que os dois arquivos saem coerentes. Custo: queima o cooldown de 24 h de uma conta.
- **U2 · Uma linha `pendente` que dure.** É a única forma de ver a faixa âmbar/vermelha e a
  ordenação «não atendidos primeiro» com dado real. Exige provocar `causa='falha_geracao'`
  ou semear `solicitado_em` retroativo — **escrita em PROD**, logo decisão sua, não minha.

### 4.3 · É SÓ ESCRITURAÇÃO — 4 itens, nenhum exige tocar código

Estes são os que fazem a fase **parecer** mais aberta do que está:

- **E1 · `REQUIREMENTS.md` mantém EXPORT-01, EXPORT-02 e EXPORT-03 como `[ ]` Pending.**
  Os três foram exercitados em PROD, com arquivo entregue, e a razão registrada para o `[ ]`
  («nenhum byte projetou dado real», «ninguém abriu um currículo») **não descreve mais esta
  base**. São 3 linhas de status e a tabela de rastreabilidade (linhas 92-94 e 242-244).
- **E2 · `EXPORT-06` não pode fechar como está redigido.** «O inventário construído aqui é
  o artefato consumido pelo motor de exclusão» foi **medido e recusado** pela Phase 45 com
  razão escrita. Precisa de reescrita do requisito ou de override registrado — nunca de
  trabalho. Fechar por trabalho seria refazer a decisão que a 45 tomou com medição.
- **E3 · `meta.consumidores` do `export-allowlist.json` declara um consumidor falso** (§2.3).
  Como é artefato **gerado**, o conserto é no gerador / no `export-scope-rules.yaml`, e faz
  o `check:export-allowlist` reprovar até regenerar — ou seja, tem portão, e o portão morde.
- **E4 · `STATE.md:1321` (tabela G1/G2/G3) e `STATE.md:1053`** descrevem G1 e G2 como
  abertos e a v1 como viva. Os dois estão fechados e datados (2026-08-05 / 2026-08-11 em
  diante). *(Não editei — está fora do que esta auditoria pode tocar.)*

### 4.4 · A cláusula «exercitado em produção», relida

O goal da fase 44 pede que o inventário de PII seja **exercitado em produção**,
explicitamente como alternativa a a Phase 45 fazer «um levantamento novo feito sob a
pressão de uma migration destrutiva». Relido hoje:

- **A cláusula foi cumprida em substância.** Três pedidos de acesso reais, autenticados,
  contra PROD, com arquivos entregues (`.json` + `.html`), 30 coleções, currículo aberto por
  URL assinada de 60 s com expiração observada, e a fila do RH aberta nos dois papéis. O
  inventário deixou de ser palpite.
- **Foi cumprida por um caminho que a fase não previu:** não pelos checkpoints do 44-05 /
  44-07 / 44-09, que seguem sem `[x]`, mas pelas sessões de validação guiada de 2026-09-06 e
  2026-09-20 — escrituradas em `GUIA-VALIDACAO-FINAL.md` e `JORNADA-GUIADA.md`, arquivos que
  **nenhum documento da fase 44 referencia**. É por isso que os gaps pareciam abertos: a
  prova existe e mora fora da pasta da fase.
- **E foi cumprida na ORDEM certa**, que era metade do que o gap exigia: o redeploy dos
  consertos (2026-08-05) precedeu o primeiro exercício (2026-08-11). O cenário «exercitado
  contra código que a equipe já sabe estar errado» não ocorreu.
- **O que continua legitimamente não-cumprido** é a cláusula do **SC#4 para o papel `rh`**:
  «visível ao RH» não vale para recrutador nenhum hoje, por medição, e o rebaixamento de
  EXPORT-05 a **parcial** que a `44-VERIFICATION.md` fez **se sustenta em 2026-09-26** —
  é o único veredito dela que o tempo confirmou em vez de desmentir.

---

## 5 · Contagem final

| Categoria | Itens |
|---|---|
| **1 — Fechado por trabalho posterior** | **G1** (EXPORT-01) · **G1-art** (a EF na v1) · **G2** (EXPORT-02) · **G3** (EXPORT-03) · **G4-a** (a UAT dos dois papéis) — **5** |
| **2 — Ainda real** | **G4-b** (o predicado/dado do ramo `rh` do BD-8) · *(menor, fora do escopo literal)* o `select=*` da página de privacidade — **1 + 1** |
| **3 — Fechado por decisão registrada** | **EXPORT-06** (Phase 45 recusou a fonte, com razão medida e escrita) — **1** |
| **4 — Não medível sem o operador** | **U1** (exercício na allowlist 1.3.0) · **U2** (linha pendente que dure) · titular de terceiro (depende da divulgação das vagas) — **3** |

**Dos 4 gaps do frontmatter da `44-VERIFICATION.md`: 3 fechados, 1 parcialmente fechado**
(a UAT rodou; a decisão continua aberta). **Dos 3 itens de `human_verification`: 3
executados.** O que resta da fase 44 é **uma decisão de modelo de papel**, duas UATs
menores e **quatro linhas de escrituração** — nenhuma linha de código de export.

---

## 6 · Como cada número acima foi obtido (para refazer)

- **Banco (só leitura):** `node p46apply.cjs sql "<SELECT>"` da raiz do repo. Nenhum
  `INSERT`/`UPDATE`/`DELETE`; nenhum `p47_teardown_*`; nenhum `salvar_config_purga`.
  Predicados das RPCs lidos por `pg_get_functiondef` — a definição **viva**, não o arquivo
  de migration.
- **EF:** `GET /v1/projects/isljnozzlvckrgjjbjwp/functions/exportar-meus-dados` (version,
  status, `verify_jwt`, `updated_at`) e `…/body` (`grep -a` dos marcadores). Token pelo
  Keychain (`security find-generic-password -s 'Supabase CLI' -a supabase -w`).
- **Front publicado:** grafo de import a partir de `https://rh.beautysmile.com.br/`,
  seguindo **tanto** `/assets/nome-hash.js` **quanto** os dinâmicos `./nome-hash.js` (sem
  prefixo). 50 chunks baixados. ⚠ **Cobertura provada antes de ler o resultado:** os
  marcadores do export (`padrao_nome_de_endereco`, `fora_do_arquivo_legivel`,
  `o_que_nao_esta_nesta_copia`, `beauty-smile-meus-dados`) moram no chunk **eager**
  `index-TmukRNYL.js` — não há risco de falso negativo por chunk lazy neste caso
  específico, e a varredura dos 50 confirma que não há segunda cópia.
- **Os dois canais:** `git log origin/main..HEAD` **vazio** e árvore limpa — o código do
  front que gera os dois arquivos está publicado, não parado no disco.

---

_Auditoria de releitura · 2026-09-26 · `44-VERIFICATION.md` intacta e não editada._
