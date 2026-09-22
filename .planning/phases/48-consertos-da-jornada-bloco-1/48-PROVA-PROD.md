---
phase: 48-consertos-da-jornada-bloco-1
plan: 18
artefato: prova em PROD (D-19)
t0: 2026-09-21T23:00:36Z
---

# 48-PROVA-PROD — a Phase 48 provada no banco de produção

T0: 2026-09-21T23:00:36Z

Tudo o que a prova conta aconteceu **depois** deste instante e em conta de teste
(`candidatos.email ILIKE '%+claude%'`). A consulta é `supabase/tests/p48_prova_prod.sql`,
sempre rodada com o prefixo:

```sql
SET TRANSACTION READ ONLY; SELECT set_config('p48.t0', '2026-09-21T23:00:36Z', false);
```

## Como estas consultas foram rodadas (e por que não pelo `p46apply.cjs`)

O `security find-generic-password -s 'Supabase CLI' -a supabase -w` devolve **exit 36**
(«User interaction is not allowed»): o Keychain de login recusa o token a processo não
interativo, dentro e fora do sandbox — a mesma trava do 48-05. Sem o token, o
`p46apply.cjs` e o `curl` da Management API não rodam.

Via usada, **só leitura**: o MCP do Supabase (`execute_sql` para as duas consultas, com o
`SET TRANSACTION READ ONLY` na frente; `get_edge_function` para os bundles). Diferença
honesta em relação ao `verify` do plano: o `get_edge_function` devolve o **fonte da versão
ATIVA** de cada função, não o `/body` (eszip). Para a pergunta «o conserto está no ar?» é
a mesma evidência — é o fonte que o runtime empacotou na versão que atende hoje — e a
versão de cada uma fica registrada abaixo.

## 1. Prontidão — medida em 2026-09-21, antes de chamar o operador

### 1a. Banco (`p48_prontidao_prod.sql`) — 25 de 25 `true`

| # | Item | Resultado |
|---|---|---|
| b01 | `candidatura_encerrada(etapa_processo, status_candidatura)` existe | ✓ |
| b02 | `registrar_pedido_exclusao` usa o predicado | ✓ |
| b03 | `retirar_candidatura` usa o predicado | ✓ |
| b04 | `rejeitar_candidatura` usa o predicado | ✓ |
| b05 | `funil_kpis` usa o predicado | ✓ |
| b06 | `v_fila_trabalho` usa o predicado | ✓ |
| b07 | `rejeitar_candidatura` grava o `feedback_rejeicao` neutro (texto exato) | ✓ |
| b08 | `explicacao_rejeicao_origem(uuid)` existe | ✓ |
| b09 | `trg_notif_transicao` passa `historico_id` | ✓ |
| b10 | `trg_notif_revisao_solicitada` passa `ciclo` | ✓ |
| b11 | `trg_notif_revisao_respondida` passa `ciclo` | ✓ |
| b12 | trigger `trg_notif_cognitivo_liberado` em `cognitivo_liberacao`, habilitado | ✓ |
| b13 | CHECK de evento contém os 10 valores | ✓ |
| b14 | classe de `cognitivo_liberado` = `transacional` | ✓ |
| b15 | classe de `prazo_reabertura_vencido` = `interno` | ✓ |
| b16 | `varrer_retry_notificacoes` exclui `prazo_reabertura_vencido` | ✓ |
| b17 | `varrer_prazos_reabertura()` existe, sem EXECUTE para `authenticated` nem `anon` | ✓ |
| b18 | job `prazo-reabertura-sweep` ativo em `cron.job`, chamando a varredura | ✓ |
| b19 | triggers `trg_agendamento_valida_local_ins` / `_upd` habilitados | ✓ |
| b20 | colunas novas de `decisao_final` | ✓ |
| b21 | colunas novas de `decisao_final_historico` | ✓ |
| b22 | colunas `aviso_pedido_enviado_em` / `aviso_cancelamento_enviado_em` | ✓ |
| b23 | colunas `descartada_em` / `descartada_motivo` de `analise_candidato_vaga` | ✓ |
| b24 | `registrar_decisao` com `coalesce(v_role` e D-23 | ✓ |
| b25 | as 17 migrations `20260921000001`..`17` estão no ledger | ✓ |

**Lista viva completa do CHECK de evento** (a sonda só exige contenção; aqui, para uma
pessoa ver se há valor a mais): `confirmacao`, `avanco`, `convite`, `decisao`,
`revisao_solicitada`, `revisao_respondida`, `divulgacao_vagas`,
`candidatura_encerrada_a_pedido`, `cognitivo_liberado`, `prazo_reabertura_vencido` —
exatamente os 10, nenhum a mais.

### 1b. Bundles das Edge Functions — todos os marcadores no ar

| Função | Versão ativa | Marcadores | Resultado |
|---|---|---|---|
| `notificar-candidato` | v16 | `historico_inconsistente`, `cognitivo_liberado`, `Acessar meu painel`, `Acompanhe o andamento pelo seu painel`, `prazo_nova_decisao_em` | ✓ 5/5 |
| `notificar-rh` | v9 | `prazo_reabertura_vencido`, `ciclo` | ✓ 2/2 |
| `executar-direito-titular` | v9 | `aviso_pedido_enviado_em`, `aviso_cancelamento_enviado_em` | ✓ 2/2 |
| `analise-candidato-individual` | v29 | `knockout` | ✓ |
| `submit-bigfive-final` | v13 | `serviceKey` (Bearer explícito do 48-05) | ✓ |
| `exportar-meus-dados` | v3 | `descartada_em` | ✓ |
| `gerar-devolutiva-bigfive` | v24 | **ausência** de `diag-auth` | ✓ ausente |

### 1c. Front publicado (`https://rh.beautysmile.com.br`) — todos os marcadores no ar

Grafo de import seguido inteiro: 47 chunks a partir de `index-LSetSTSi.js` e
`react-vendor-CSwU0OnC.js` (buscar só no índice eager daria falso negativo).

| Marcador | Chunk |
|---|---|
| `hub-acoes-encerrada` | `PerfilCandidatoRHPage-DEXKMeni.js` (lazy) |
| `http:// ou https://` | `PerfilCandidatoRHPage-DEXKMeni.js` (lazy) |
| `explicacao-humana-triagem` | `index-LSetSTSi.js` (eager) |
| `prazo-reabertura` | `index-LSetSTSi.js` (eager) |
| `decisao-recusa-decisor-revertido` | `DecisaoFinalPage-CmoUMqqI.js` (lazy) |
| `Mudar o status aqui n` | `CandidatosRHPage-BEQUQpgL.js` (lazy) |

### 1d. Git

`git fetch` + `git log --oneline origin/main..HEAD` → **vazio** antes do commit desta
Task 1: nenhum código da fase parado no disco. Os únicos commits que entram depois são os
deste plano, e tocam só os três arquivos do `files_modified`.

## 2. Linha de base da consulta de prova (T0 = 2026-09-21T23:00:36Z, rodada logo depois)

| Prova | Baseline | Observação |
|---|---|---|
| `p1_confirmacao_d09_enviada` | false | depende da inscrição (a) |
| `p1_knockout_sem_analise` | false | depende da inscrição (b) — exige que o knockout EXISTA |
| `p1_triagem_feedback_neutro` | false | depende de (c) |
| `p1_triagem_decisao_avisada` | false | depende de (c) |
| `p1_cognitivo_avisado` | false | depende de (d) |
| `p1_agendamento_invalido_fora` | **true** | prova negativa — nada inválido entrou; tem de continuar `true` depois de (e) |
| `p1_devolutiva_gerada` | false | depende de (f) |
| `p1_fila_sem_encerrada` | **true** | prova negativa — já verdade; não pode regredir |
| `p1_sem_encerrada_a_pedido_errada` | **true** | prova negativa — já verdade; não pode regredir |
| `p2_reabertura_registrada` | false | sessão 2 (i) |
| `p2_revisao_respondida_avisada` | false | sessão 2 (i) |
| `p2_revisao_solicitada_com_ciclo` | false | sessão 2 (h) |
| `p2_redecisao_avisada` | false | sessão 2 (k) |
| `p2_ciclo_zerado_e_arquivado` | false | sessão 2 (k) |
| `p2_d23` | false | sessão 2 (j)+(k) |
| `p2_titular_avisado` | false | sessão 2 (l) |
| `p2_devolutiva_template_oficial` | false | *(acrescentada pelo 48-19)* sessão 2 (m), depois do deploy do 48-19 — hoje reprova a linha da `+claude5` por 3 razões |

Conferências de forma feitas antes da linha de base, contra o catálogo e o fonte vivos:

- as 55 colunas que a consulta lê existem; os valores de enum usados (`rejeitado`,
  `decisao_final`, `online`, `enviado`, `entregue`, `aprovado`, `revertida`, `exclusao`)
  são válidos nos tipos vivos;
- formato das chaves no fonte ativo: `decisao` → `{candidatura}:decisao:{historico_id}`;
  `revisao_respondida` → `{candidatura}:revisao_respondida:{ciclo}`;
  `revisao_solicitada` (RH) → `{candidatura}:revisao_solicitada:{ciclo}:{user_id}`, com
  `ciclo` = epoch inteiro do `revisao_solicitada_em` — o que as regex da prova esperam;
- candidatura de knockout em PROD tem a forma `etapa_atual='inscricao'`,
  `status='rejeitado'`, `opcao_knockout_id` preenchido e **nenhum** histórico para
  `rejeitado` — é o que o CTE `ko` procura;
- `ai_call_logs` tem `candidato_id` em 44 de 46 linhas — a prova do knockout não passa
  por vacuidade;
- o arquivo da decisão revertida nasce do `trg_decisao_final_snapshot` (AFTER UPDATE,
  grava `OLD.*`, inclusive `OLD.por_usuario`) no instante em que RH3 redecide — por isso
  `p2_d23` compara RH-A (arquivado) com RH3 (vigente).

## 3. Contas de teste disponíveis em T0

| Conta | Candidaturas | Serve para |
|---|---|---|
| `+claude1` | Social Media: `aprovado`/`finalizado` · Consultor `2ce20fbf-df1a-4850-b7ee-1c2a0fb88a13`: **`avaliacao_assincrona`**, Big Five **já enviado** às 20:01Z (antes do conserto do 48-05), cognitivo **não** liberado | (d) liberar o cognitivo; (e) tentar o agendamento; candidata natural da sessão 2 |
| `+claude2` | Consultor: knockout (encerrada) · **Social Media: nenhuma** | (b) knockout na Social Media |
| `+claude3` | as duas encerradas | titular da (l) |
| `+claude4` | as duas encerradas | titular da (l) (alternativa) |
| `+claude5` | **não existe** | (a)+(c) na Consultor e (f) na Social Media — cadastro novo |

Nenhuma conta de teste está hoje em `avaliacao_assincrona` **sem** Big Five, nem em
`decisao_final`: a (f) e a sessão 2 precisam avançar uma candidatura pelo fluxo normal.
Nenhum reset é necessário.

## 4. Sessão 1 — jornada do candidato e do RH

Feita pelo operador em 2026-09-21 (horários abaixo em -03:00, como ele os leu).

### Conferências humanas

| Passo | Resultado | Observação do operador |
|---|---|---|
| (a) | ✓ | `+claude5` criada; inscrições na Consultor (20:14) e na Social Media (20:15). Os 2 e-mails de confirmação trazem o texto D-09, **sem** «a cada etapa», com «Acessar meu painel» + URL de reserva `/auth/login`. |
| (b) | ✓ | `+claude2` eliminada por knockout na Social Media; tela com o texto neutro; e-mail de rejeição com o botão do painel. *(Defeito 23 segue: «Agradecemos seu interesse» em cinza ilegível — Bloco 4.)* |
| (c) | ✓ | Rejeição na triagem da Consultor da `+claude5`: e-mail com o botão; cartão «Entenda a decisão»; página diz «analisada por uma pessoa da nossa equipe», **não** oferece revisão, mostra o canal (`lgpd@`, que é PP-16, fora do bloco). *(Defeito 21 segue: select do motivo branco no hover — Bloco 3.)* |
| (d) | ✓ | Cognitiva da `+claude1` liberada; e-mail chegou às 23:20 com o botão. |
| (e) | ✓ | `+claude1` avançada para Entrevista online (o bloco de agendamento só abre nas etapas de entrevista). `dddd` recusado com «Informe um link válido, começando com http:// ou https://.»; nada salvo. A `+claude1` **fica em Entrevista online** para a sessão 2 chegar a «Decisão final». |
| (f) | ✓ geração · ✗ conteúdo | Social Media da `+claude5` avançada (e-mail de avanço); Big Five enviado; às 23:30 «ainda sendo preparada», ~1 min depois a devolutiva apareceu (5 chamadas Sonnet 4.6, 23:30:12–13, todas com sucesso). **A geração pelo caminho real funciona. O conteúdo tem os Defeitos 30 e 31 (abaixo).** |

### Resultado da consulta de prova (`p1_*`) — 9 de 9 `true`

Primeira rodada: **8 de 9**. A `p1_devolutiva_gerada` saiu `false` **com a devolutiva no
banco** (`122321aa-…`, criada 23:30:13 -03:00). O defeito era da consulta, não do sistema:
em `devolutivas_candidato`, `candidato_id` é o **uid do Auth** (`candidatos.user_id`, FK
`auth.users`), e a consulta comparava com `candidatos.id` — nunca casaria. A conferência de
forma da Task 1 viu que a coluna **existia**, não o que ela **guarda**. Consulta corrigida
para filtrar por `candidatura_id` (48-19); rodada de novo: `true`.

| Prova | Resultado |
|---|---|
| `p1_confirmacao_d09_enviada` | ✓ true |
| `p1_knockout_sem_analise` | ✓ true |
| `p1_triagem_feedback_neutro` | ✓ true |
| `p1_triagem_decisao_avisada` | ✓ true |
| `p1_cognitivo_avisado` | ✓ true |
| `p1_agendamento_invalido_fora` | ✓ true (continuou `true` depois da tentativa com `dddd`) |
| `p1_devolutiva_gerada` | ✓ true (depois da correção da consulta) |
| `p1_fila_sem_encerrada` | ✓ true |
| `p1_sem_encerrada_a_pedido_errada` | ✓ true |

### Defeitos novos achados na sessão 1 — e a decisão do operador

**Defeito 30 — a devolutiva inventa nome, percentil e cargo.** Medido no banco (só
leitura): a devolutiva da `+claude5` cita «Rodrigo Fonseca» (C e A), «percentil 12» (A),
«Candidato não informado» (E) e «[NOME COMPLETO DO CANDIDATO]» (N); **4 das 5 páginas** fogem
do texto oficial. Não existe candidato com esse nome; as 5 chamadas foram novas, com chave
própria; nem o prompt de sistema nem o de usuário citam o nome. Causa: o prompt
`bigfive_devolutiva` v1.0.0 manda personalizar e o bloco de usuário só leva a faixa e o
texto oficial. O texto também fala do candidato na terceira pessoa numa página dirigida a
ele.

> **Decisão do operador (2026-09-21):** servir o template oficial da faixa (desligar a
> personalização da IA) até haver um prompt corrigido e testado. Não fechar o JORN-06 sem isto.

**Defeito 31 — a aba «Sensibilidade Emocional» não é clicável.** Ela quebra para a 2ª
linha e fica sob o cartão. Medido depois no navegador, com o componente real: em 1280 px é
exatamente isso; em **375 px, 4 das 5 abas** ficam cobertas.

> **Decisão do operador (2026-09-21):** as cinco abas clicáveis e legíveis no
> `DevolutivaBigFiveView.tsx`, sem alterar o componente base de abas. Os dois são
> consequência do JORN-06 (a página só passou a existir agora); não fechar o JORN-06 sem eles.

Consertos: **plano 48-19** (`eba5cd27` EF, `c5e695f9` front). A prova em PROD é a nova
`p2_devolutiva_template_oficial` + o passo (m) da sessão 2 — ela já reprova a linha da
`+claude5` por três razões independentes (`prompt_version` 1.0.0, 4 páginas fora do
template, 5 chamadas de IA), então morde.

**Alcance medido:** existem **2** devolutivas em PROD, ambas de conta de teste
(`+claude5` e `candidato.funil@teste.com`, de 2026-06-30 — esta também expõe «percentil 54»
e «percentil 86», contra o UX-07). **Nenhum candidato real viu texto inventado.** As duas
linhas **não foram tocadas**: a da `+claude5` é a evidência do Defeito 30, e reescrever ou
apagar qualquer uma é escrita destrutiva que pede confirmação.

**Observação do operador — decidida em parte (2026-09-22): a frase «não é teste
psicológico» FICA** (decisão do operador). Segue sem decisão o resto: o rodapé diz «Conteúdo revisado por
psicólogo(a) responsável» — com a IA desligada, isso só pode valer para os textos oficiais,
e o próprio código diz que eles estão «pendente revisão final CRP antes do go-live»
(`gerar-devolutiva-bigfive/index.ts`, comentário dos `BAND_TEMPLATES`). E o rodapé cita
«teste psicológico», ainda que em negação — a regra de produto do `CLAUDE.md` é nunca
usar o termo. O fallback do front (`DevolutivaBigFiveView.tsx`, usado só se a linha não
trouxer rodapé) ainda tem o placeholder «Dra. [Nome], CRP-XX/XXXXX».

### Deploy do 48-19 — conferido no ar (2026-09-22)

- `gerar-devolutiva-bigfive` **v25** (operador, `efdeploy.cjs`): os 9 arquivos do bundle batem
  byte a byte (sha256) com o disco e com o `git HEAD` `666a43fb`; `PERSONALIZACAO_IA_ATIVA =
  false`, `template_oficial`, guarda SEC-04 e SDKs condicionados presentes; `diag-auth` 0×;
  `verify_jwt=false` inalterado.
- Front: push `816b7b08..666a43fb` autorizado pelo operador; build novo `index-Cicf4ORj.js`
  com `devolutiva-abas` e as classes novas dos gatilhos (chunk eager, onde a view mora);
  `origin/main..HEAD` vazio.

## 5. Sessão 2 — revisão, reabertura, D-23, redecisão e avisos do titular

_A preencher quando o operador avisar «sessão 2 feita»._

### Conferências humanas

### Resultado da consulta de prova (todas)

## 6. O que NÃO foi rodado

`p47_teardown_dados_de_teste.sql` e o bloco `salvar_config_purga(... p_confirmo_live :=
true)` do `46-07-RUNBOOK-FLIP` não foram rodados. Nenhuma escrita em PROD foi feita por
esta Task 1.
