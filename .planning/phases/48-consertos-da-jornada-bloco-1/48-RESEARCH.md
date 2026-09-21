# Phase 48: Consertos da Jornada — Bloco 1 - Research

**Researched:** 2026-09-21
**Domain:** Supabase (Postgres PL/pgSQL SECURITY DEFINER + triggers + pg_net + pg_cron), Edge Functions Deno, React/TS — correções de fluxo em PROD
**Confidence:** HIGH na maior parte (medido em PROD só-leitura, definições vivas via `pg_get_functiondef`, logs da plataforma, bundles deployados); MEDIUM nos desenhos recomendados (JORN-19, JORN-27)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Decisões do operador (JORNADA-GUIADA.md §«DECISÕES TOMADAS», 2026-09-21) — NÃO reabrir

- **D-01:** **Reabrir, não reverter** (JORN-19). Veredito `revertida` devolve a candidatura a `decisao_final`, **aguardando nova decisão** — nunca a `aprovado`. «Reverter» significa que a rejeição não se sustenta, não que o candidato foi aprovado; aprovar automaticamente seria o sistema decidindo o que nenhum humano decidiu. **Exige prazo** (valor em D-10) e **exige corrigir o e-mail**, que hoje diz «a decisão anterior foi revista» e passa a dizer «sua candidatura foi reaberta e será decidida novamente».
- **D-02:** **Marcar, não apagar** (JORN-24 parte b). Escopo: **só as análises geradas após knockout automático** — não as de quem pediu exclusão, nem as de não-contratados. Hoje é 1 candidatura (medir de novo no plano). Marcar (ex.: `finalidade='descartada_por_knockout'`) em vez de apagar: apagar é irreversível, o titular já recebeu essa análise numa cópia LGPD, e a marca deixa auditável que houve tratamento sem finalidade e que foi corrigido. O conserto principal segue sendo **parar de analisar após o knockout** (parte a).
- **D-03 [informational]:** `sessionStorage`, não banco, para o rascunho do formulário (Defeito 1 — Bloco 4). Não é desta fase.
- **D-04 [informational]:** análise da IA em append por etapa, exibindo a mais recente (Defeito 12 — Bloco 2). Não é desta fase.
- **D-05:** **Só a parte antecipada do D5 entra aqui** (JORN-D5): tornar o campo `local_ou_link` **obrigatório e validado na escrita**. `isSafeHttpUrl` já existe e já funcionou (impediu o `dddd` de virar link clicável em `AgendamentoCandidatoCard.tsx:210`); só não é exigido na escrita. O redesenho do agendamento (janelas + escolha do candidato + confirmação, PP-8) é fase própria, **depois** do Bloco 2 — fora daqui.
- **D-06 [informational]:** `ANALISE_HUB_ALLOWLIST` passa a mostrar `resumo_respostas` e segue escondendo `resumo_cv` (Bloco 3). Não é desta fase.
- **D-07 [informational]:** `rh@beautysmile.com.br` existe e é lido; a troca `lgpd@` → `rh@` (PP-16) tem escopo medido de 4 lugares e **não está no Bloco 1**. Consequência para esta fase: **nenhum texto novo pode introduzir uma quinta ocorrência literal** do endereço do canal de privacidade — se um e-mail novo precisar citar o canal, derive-o da mesma fonte que os outros usam ou não o cite, para que o PP-16 continue sendo troca em lugares contados.
- **D-08 [informational]:** avançar **não** exige evidência da etapa (Defeito 14). Nenhum conserto desta fase pode introduzir portão de evidência no avanço.

#### Decisões tomadas no kickoff desta fase (operador, 2026-09-21)

- **D-09:** **Defeito 15 — mudar a promessa, não avisar em cada avanço** (JORN-15, JORN-U2). O texto do e-mail de confirmação passa a apontar para o painel, na linha de: «acompanhe no seu painel a qualquer momento; avisaremos quando houver algo para você fazer ou uma decisão». **Condição do operador, obrigatória:** o link para o login do candidato nos e-mails (U2) **sobe para este bloco** — senão a promessa aponta para um lugar inalcançável. Depois desta fase a promessa tem de ser **verdade**: todo desfecho avisa (JORN-20, JORN-18, e o knockout já avisa) e toda ação pedida ao candidato avisa (`avaliacao_liberada`, `convite`).
- **D-10:** **Prazo da reabertura = 10 dias corridos** (JORN-19). O e-mail ao candidato diz a data exata. Vencido o prazo sem nova decisão, **só alerta o RH** — nenhuma decisão automática, nem aprovar nem rejeitar (é a lógica da própria D-01).

#### Restrições de execução impostas pelo operador para esta fase — NÃO negociáveis

- **D-11:** **Os Defeitos 22 e 26 são o MESMO erro** — código que usa `etapa_atual` para saber se a candidatura acabou (ou está em andamento), ignorando `status`. **Varrer pela FORMA antes de consertar os dois casos conhecidos**, como o `CLAUDE.md` manda fazer com portões («varra pela forma, não pelo sintoma»). Senão o terceiro aparece depois. A varredura tem de: (a) cobrir `src/`, `supabase/functions/` **e as definições VIVAS** das funções/views/triggers do banco (a migration mais recente de um objeto, ou `pg_get_functiondef` em PROD — não o histórico de migrations como se fosse código vivo); (b) sair como **artefato** com cada ocorrência classificada como *escopo deliberado* (ex.: o knockout preserva `etapa_atual='inscricao'` **por desenho**) ou *defeito*; (c) registrar o **padrão de busca** usado, para que possa ser re-rodado; (d) ser feita **antes** das tasks que consertam 22 e 26, e alimentá-las. Knockout mantém `etapa_atual='inscricao'` com `status='rejeitado'` por desenho — qualquer predicado de «acabou» que olhe só `etapa_atual` erra exatamente nesse caso.
- **D-12:** **O conserto do Defeito 22 já está escolhido e confirmado por experimento na Etapa 10 — não redecidir.** `rejeitar_candidatura` passa a gravar `feedback_rejeicao` com texto **neutro**, que é o que o knockout já faz (`20260608000001:197`). O front (`DashboardCandidatoPage.tsx:148-159`, condição `data_decisao_final OR feedback_rejeicao`) **não muda**. Alternativa **rejeitada**: mexer na condição do front — deixaria o candidato com cartão mas sem texto de feedback. O texto neutro **não** é a `etapa_justificativa` do RH nem revela o motivo.
- **D-13:** **O Defeito 6 NÃO tem causa provada** e é o único do bloco que precisa de **investigação antes de virar tarefa de conserto** — tratá-lo como conserto conhecido gera chute. O plano tem de ter, nesta ordem: (1) **medir a causa** — o QUÊ está provado (401 em `gerar-devolutiva-bigfive` no mesmo instante do 200 do `submit-bigfive-final`; guarda SEC-04 `guardDevolutivaBearer` criada em `595727da`, 2026-07-07; única devolutiva do banco é de 2026-06-30), o PORQUÊ não; (2) **só então** o conserto derivado da causa medida. As duas vias registradas na JORNADA: **instrumentar** (logar o PREFIXO/formato do Bearer recebido, **nunca o valor**) ou **trocar `supabaseAdmin.functions.invoke` por `fetch` explícito** com `Authorization: Bearer ${SERVICE_KEY}`. A segunda só é conserto se a medição mostrar que a causa é o que o `invoke` envia; aplicada às cegas é o chute que esta restrição proíbe. A investigação também tem de distinguir se o 401 vem do **gateway** (`verify_jwt` da função, antes de o código rodar) ou da **guarda no código** — são causas diferentes com consertos diferentes.
- **D-14:** **As decisões D-01..D-10 são do operador, não do executor.** Nenhum plano, task ou checkpoint as reabre. Se a execução achar que uma delas é inexequível como escrita, o executor **para e reporta** — não escolhe outra.

#### Restrições de ambiente (CLAUDE.md + memória do projeto)

- **D-15:** `tsc` **não pode subir acima de 90** (baseline congelada em 96, hoje 90). Todo plano que toca TS confere `npm run lint` e reprova se o número de erros passar de 90.
- **D-16:** **Via de apply de migration = `p46apply.cjs`** (Management API, SQL **lido do arquivo**, migration + linha de `supabase_migrations.schema_migrations` na mesma requisição atômica, md5 de `statements[1]` conferido por leitura de volta do ledger). Nunca SQL Editor nem `apply_migration` do MCP (transcrevem e perdem comentários). **Depois de todo apply cujo efeito é visível na interface: `git log --oneline origin/main..HEAD` tem de sair VAZIO** — a Vercel publica o front a partir do `main`, e migration no ar com o código parado no disco produz um sintoma idêntico ao de um conserto que não funciona (§7.27 do GUIA). Para conferir que um marcador chegou ao ar, procure no **chunk certo** (rotas `/rh/*` e `/admin/*` são lazy).
- **D-17:** **Antes de acrescentar qualquer objeto que um smoke vigia** (novo `evento` no CHECK de `notificacoes_enviadas`, novo cron, nova função, nova coluna), rodar a varredura de portões do `CLAUDE.md` (`grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql`) e classificar cada achado tocado como *escopo deliberado* × *fotografia*. Conserto de fotografia = baseline capturada na própria execução, nunca nova constante; e provar por execução que o portão **ainda morde**.
- **D-18:** **Escrita em PROD** segue a divisão do operador: aditivo/corretivo (CREATE, ADD COLUMN, CREATE OR REPLACE, deploy de EF, smoke) roda sem pausa, reportando cada apply; **UPDATE/DELETE retroativo sobre linha existente, e qualquer e-mail disparado para candidato real fora do fluxo normal, é checkpoint** com contagem antes/depois. E antes de todo deploy: se houver sequência obrigatória (`migration → EF → cliente`), o passo seguinte tem de pertencer a um plano desta fase.
- **D-19:** **Verificação no banco, nunca só na tela** (regra 1 da JORNADA). Todo critério de aceite de comportamento em PROD é uma consulta com resultado esperado, não «apareceu na tela». Os resets de conta de teste são escrita destrutiva em PROD: medir antes e depois, escopar ao `candidatura_id`, e confirmar com o operador (regra 4). **Não rodar** `p47_teardown_dados_de_teste.sql` (a trava de contagem dele, 41, já recusa — é o guard funcionando) nem o bloco `salvar_config_purga(... p_confirmo_live := true)` do `46-07-RUNBOOK-FLIP`.

### Claude's Discretion

- A forma exata da chave de dedupe do evento de decisão (JORN-18): incluir a decisão, o instante, o id da linha de decisão, ou combinação — desde que uma redecisão real gere aviso e um retry do mesmo evento continue deduplicado. A JORNADA diz «incluir a decisão e/ou o instante».
- Se a rejeição na triagem (JORN-20) reusa o evento `decisao` (como o knockout, `20260906000006_notifica_rejeicao_automatica.sql`) ou ganha evento próprio — decidir junto com JORN-18, porque os dois dividem a chave.
- O texto neutro do `feedback_rejeicao` da rejeição humana (JORN-22), espelhando o tom do knockout e respeitando a linguagem de produto do `CLAUDE.md`.
- Onde a validação do `local_ou_link` mora (schema Zod do formulário, RPC, `CHECK` no banco — um ou mais), e como tratar as linhas existentes que já violam (ex.: `dddd`) sem `UPDATE` retroativo não autorizado (`NOT VALID` é uma saída). ⚠ Se o mesmo campo guardar **endereço** de entrevista presencial, a exigência de URL http(s) vale só para a modalidade online — um endereço não é link inválido, e exigir URL ali quebraria o agendamento presencial. Medir antes de decidir.
- Como o vencimento dos 10 dias vira alerta ao RH (cron que notifica, badge na fila, ou ambos), respeitando D-17 para qualquer cron novo.
- Tornar a falha da devolutiva **observável** (log com código de erro em vez de `catch` mudo) como parte do conserto do JORN-06 — sem mudar o contrato com o candidato (o submit segue best-effort e devolve ok). E se gera retroativamente a devolutiva de quem já concluiu o Big Five sem recebê-la (é aditivo; medir quantos são).
- A granularidade dos planos, as waves e a ordem — respeitando as dependências de §Integração.

### Deferred Ideas (OUT OF SCOPE)

- Blocos 2, 3 e 4 da fila de consertos — incluindo 17, 3b, 25, 28, 13, 7, 12, 14, 2, 11, 5, 29, 21, 6b, e o Bloco 4 inteiro exceto o U2 (que subiu por D-09).
- PP-8 (redesenho do agendamento) — fase própria depois do Bloco 2 (D-05).
- PP-16 (`lgpd@` → `rh@`) — decidido, escopo medido, não está no Bloco 1 (D-07).
- PP-15 (requisitos eliminatórios na página da vaga) — decidido, não está no Bloco 1.
- Avisar o candidato em **cada** avanço de etapa — rejeitado pelo operador em D-09.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JORN-22 | Rejeição humana na triagem torna o Art. 20 alcançável — `rejeitar_candidatura` grava `feedback_rejeicao` neutro e o cartão aparece | §B. ⚠ **D-12 é necessário e NÃO suficiente**: com o cartão visível, a página `/candidato/explicacao/:id` responde «Esta página não está disponível» para o caso (b) — ver Achado Contraditório #2 |
| JORN-26 | Nenhum código decide «encerrada/em andamento» só por `etapa_atual`; pedido de exclusão deixa de marcar knockout | §A + `48-VARREDURA-ETAPA-ATUAL.md`: 6 objetos vivos + 3 pontos de código com a mesma forma; predicado canônico já existe no front |
| JORN-20 | Rejeição na triagem avisa o candidato | §D. ⚠ **A causa NÃO é ausência de despacho**: o despacho existe (trigger em `historico_candidatura`) e foi **engolido pelo dedupe** — provado no log. JORN-20 se resolve com JORN-18 + verificação |
| JORN-27 | Pedido e cancelamento de exclusão avisam o titular; `recibo_enviado_em` passa a ser escrito | §D. ⚠ `recibo_enviado_em` **já é escrito** — é o recibo PÓS-execução (Phase 45 passo 4). Escrevê-lo no pedido **suprimiria o recibo final**. Precisa de coluna/registro próprio → confirmação do operador (D-14) |
| JORN-18 | 2ª decisão gera aviso — chave de dedupe distingue decisões | §D: chave `{candidatura}:decisao:{historico_id}`; o mesmo defeito existe em `revisao_solicitada`/`revisao_respondida` e morde JORN-19 |
| JORN-15 | Confirmação deixa de prometer «a cada etapa» e aponta para o painel | §D: texto único em `supabase/functions/_shared/email-templates.ts:150`; `templates_email` (3 linhas) é tabela morta |
| JORN-U2 | Todo e-mail transacional ao candidato traz link para o login | §D: `/auth/login` (+ `?redirect=`); padrão `APP_BASE_URL` + default já existe em `notificar-rh`; ⚠ `layoutBase` é compartilhado com e-mails do RH e com o recibo de exclusão — o link não pode ir no rodapé comum |
| JORN-24 | Knockout não dispara IA; análises pós-knockout marcadas | §F: guarda na EF (padrão `notificar-candidato` 3a); **3** linhas a marcar (não 1), todas contas `+claude` |
| JORN-06 | Devolutiva volta, com causa provada antes | §G: 401 vem da **guarda no código** (log da função); `verify_jwt=false` deployado; a chave do ambiente é `sb_secret_…` e supabase-js 2.110.9 **não manda `Authorization`** para chave `sb_secret_` sem sessão. Backlog = 1 |
| JORN-19 | `revertida` reabre em `decisao_final`, prazo 10 dias, e-mail corrigido, alerta ao RH | §E: Desenho A recomendado (reabrir dentro de `responder_revisao_decisao`; redecisão pelo upsert que já existe; arquivar/zerar o ciclo de revisão) |
| JORN-D5 | `local_ou_link` obrigatório e validado na escrita | §H: o campo guarda **endereço** no presencial (medido); URL só no online; escrita é PostgREST direto sob RLS |
</phase_requirements>

## Summary

A medição em PROD (só leitura) confirma o essencial da JORNADA, mas **quatro diagnósticos da CONTEXT estão errados ou incompletos, e um deles muda o tamanho de um item**:

1. **JORN-20 não é «a RPC não despacha».** `rejeitar_candidatura` faz `UPDATE etapa_atual='rejeitado'` → `avancar_etapa()` grava `historico_candidatura` → `trg_notif_transicao` despacha `decisao` para `notificar-candidato`. O log da Edge Function às 16:03:25 UTC de 2026-09-20 (a rejeição da Etapa 9) mostra `evento:"decisao", dedupe_key:"bf26ee3c…:decisao", skipped:"duplicate"`. **O Defeito 20 é o Defeito 18.** [VERIFIED: function_logs via Management API; `pg_get_functiondef(trg_notif_transicao)`]
2. **JORN-22: o cartão vai aparecer e levar a uma página que diz «Esta página não está disponível».** `explicacaoService.getExplicacao` lê `decisao_final` (vazia para rejeição na triagem) e cai em `explicacao_rejeicao_automatica`, que devolve `true` **só** para knockout. A migration `20260906000007` lista o caso (b) para **não** confundi-lo com (c), não para servi-lo. «Backend cobre os 3 casos» é falso. [VERIFIED: `src/features/explicacao/services/explicacaoService.ts:245-338`; `pg_get_functiondef(explicacao_rejeicao_automatica)`]
3. **JORN-27: `recibo_enviado_em` não é «nunca escrito» — é o recibo pós-exclusão** (`executar-direito-titular/index.ts:1075-1103`), e há 1 pedido `concluido` com ele preenchido. Escrever essa coluna no pedido faria o passo 4 (`if (!estado.recibo_enviado_em)`) **pular o recibo final**. [VERIFIED]
4. **JORN-06: a causa foi estreitada a quase-prova.** O 401 vem da guarda no código (o próprio `console.warn` da guarda está no log, 9 ms antes do 401), não do gateway (`verify_jwt=false` no deploy). O `apikey` da chamada interna tem prefixo `sb_secret_`, as chaves legadas estão **desligadas** no projeto, e o bundle deployado usa supabase-js **2.110.9**, cujo `functionsFetch` é criado com `omitApiKeyAsBearer: true` — para chave `sb_secret_`/`sb_publishable_` sem sessão ele **não põe `Authorization`**. [VERIFIED: edge logs, function_logs, bundle `…/functions/submit-bigfive-final/body`, `/api-keys/legacy`]

A varredura D-11 achou **mais quatro** instâncias vivas da mesma forma além do Defeito 26 (`retirar_candidatura`, guard terminal de `rejeitar_candidatura`, view `v_fila_trabalho`, ações do hub do RH) e uma quinta num mecanismo destrutivo (a elegibilidade da purga é por etapa — knockout nunca é purgado). O predicado correto **já existe** no painel do candidato (`STATUS_TERMINAIS`).

**Primary recommendation:** tratar JORN-18 como a espinha da fase (chave `{candidatura}:decisao:{historico_id}` passada pelo trigger, e o mesmo para o ciclo de revisão), consertar o predicado de «encerrada» num único helper SQL + TS antes de mexer em `rejeitar_candidatura`, e levar ao operador **três** confirmações antes da execução: explicação para a rejeição na triagem (JORN-22), onde registrar o aviso ao titular (JORN-27, não em `recibo_enviado_em`), e o destino da purga do knockout (D5 da varredura).

## Project Constraints (from CLAUDE.md)

- Migrations via `p46apply.cjs` (Management API, SQL lido do arquivo, ledger na mesma transação, md5 conferido). Nunca SQL Editor / `apply_migration` do MCP.
- Sem `BEGIN; ... COMMIT;` externo em migration com `$$` + `COMMENT/REVOKE/GRANT` adjacentes (42601).
- Depois de apply com efeito visível: `git log --oneline origin/main..HEAD` vazio (Vercel publica do `main`). Hoje há **2 commits locais não enviados** (só docs: `2a3d6250`, `74af464b`) [VERIFIED: git].
- Marcador no ar: procurar no chunk certo (`/rh/*`, `/admin/*` são lazy): `grep -rl "<marcador>" build/assets/`.
- Portões: varrer pela **forma** antes de acrescentar objeto vigiado; conserto de fotografia = baseline capturada na execução; provar que o portão ainda morde.
- `database.types.ts` só pelo CLI (`< /dev/null` obrigatório — ver CONTEXT §code_context); nunca editar à mão.
- Nunca `service_role` no client; escrita privilegiada via RPC SECURITY DEFINER ou EF; RLS em 100% das tabelas com dado de usuário.
- Linguagem: «avaliação comportamental/cognitiva», nunca «teste psicológico». Sistema nunca rejeita por score (RNF-07a).
- Componentes PascalCase com export nomeado; hooks `useX`; services `xService.ts` com classes de erro; Zod pt-BR; query keys hierárquicas.
- `tsc` ≤ 90 (medido hoje: **90** [VERIFIED: `npm run lint`, 2026-09-21]).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Predicado «candidatura encerrada» | Database (função SQL IMMUTABLE) | Browser (helper TS espelho) | RPCs/views decidem no servidor; o front só espelha para esconder ações |
| Rejeição na triagem (feedback neutro) | Database (`rejeitar_candidatura`) | — | write-path único auditado |
| Explicação Art. 20 para rejeição na triagem | Database (RPC de leitura que lê `motivo_rejeicao` sem devolvê-lo) | Browser (`explicacaoService` + página) | o cliente não pode distinguir (b) de (c) — allowlist exclui `motivo_rejeicao` |
| Despacho de notificação | Database (trigger AFTER INSERT em `historico_candidatura` → `net.http_post`) | Edge Function (`notificar-candidato`: dedupe, template, Resend) | at-most-once no transporte; idempotência por `UNIQUE(dedupe_key)` na EF |
| Chave de dedupe | Edge Function (`montarDedupeKey`) | Database (trigger passa o discriminador) | a EF monta; o trigger é quem conhece o `historico.id` |
| Aviso ao titular (pedido/cancelamento de exclusão) | Edge Function (`executar-direito-titular`) | Database (coluna de estado idempotente) | a EF já tem sessão do titular e a infraestrutura do recibo |
| Reabertura pós-revisão | Database (`responder_revisao_decisao`, uma transação) | Edge Function (`notificar-candidato` copy + data) | atomicidade veredito + reabertura; trilha via trigger |
| Alerta de prazo vencido | Database (função `varrer_*` + pg_cron) | Edge Function (`notificar-rh`) | mesmo padrão de `notif-retry-sweep` |
| Parar IA após knockout | Edge Function (`analise-candidato-individual`) | — | o trigger AFTER INSERT vê `status='aguardando_resposta'`; só a EF vê o estado final pós-COMMIT |
| Validação de `local_ou_link` | Browser (Zod) + Database (trigger/CHECK) | — | a escrita é PostgREST direto sob RLS — sem RPC no meio |
| Devolutiva Big Five | Edge Function (`submit-bigfive-final` → `gerar-devolutiva-bigfive`) | — | chamada server-to-server |

## Standard Stack

Nenhuma biblioteca nova. Tudo o que a fase precisa já está no repositório e em PROD.

### Core (já instalado)
| Library | Version | Purpose | Onde |
|---------|---------|---------|------|
| `@supabase/supabase-js` (EF, via esm.sh) | **2.110.9** (resolvido em `supabase/functions/deno.lock` e no bundle deployado de `submit-bigfive-final`); `gerar-devolutiva-bigfive` deployado com **2.115.0** | client das EFs | [VERIFIED: deno.lock + bundle] |
| `@supabase/supabase-js` (web) | 2.104.0 (x-client-info no edge log) | client do front | [VERIFIED: edge log] |
| zod | 3.25.76 (EF, `deno.json`) | schemas | [VERIFIED] |
| pg_net / pg_cron | vivos | despacho assíncrono / varreduras | [VERIFIED: `cron.job`] |
| Deno | 2.9.4 (local) | `deno test` das EFs | [VERIFIED] |
| Vitest | (package.json) | testes do front | [VERIFIED: 223 testes verdes nas pastas tocadas] |

**Installation:** nenhuma.

## Package Legitimacy Audit

Esta fase **não instala pacote externo**. Nenhum `npm install`, nenhum specifier `npm:`/`esm.sh` novo é recomendado.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | nenhum pacote novo |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## A. Varredura pela forma (D-11) — resumo

Artefato completo: **`48-VARREDURA-ETAPA-ATUAL.md`** (padrões re-rodáveis, cada ocorrência classificada).

| Superfície | Total | (i) defeito / latente | (ii) escopo deliberado | (iii) não-predicado |
|---|---|---|---|---|
| Código `src/` + `supabase/functions/` | 135 linhas / 27 arquivos | **4** (C1, C1b, C2, L1) | 33 | 98 |
| Objetos vivos do banco | 17 (12 funções, 2 views, 3 policies) | **6** (D1–D6) | 8 | 3 |
| Smokes | — | `p45_motor_exclusao_smoke.sql` (2 fixtures) codifica o predicado errado | 4 posicionais | — |

**Defeitos vivos (por severidade):**

| # | Objeto | Efeito |
|---|---|---|
| D1 | `registrar_pedido_exclusao` — `AND c.etapa_atual NOT IN ('aprovado','rejeitado')` [VERIFIED: pg_get_functiondef; `20260805000002:220`] | Defeito 26. **2** knockouts marcados (não 1): `92522073…` e `25a4231c…`, ambos `+claude` |
| D2 | `retirar_candidatura` — guard `v_etapa IN (...)` + `UPDATE ... NOT IN` [VERIFIED; `20260805000007:230`] | caminho não-UI retira knockout e avisa o RH |
| D3 | `rejeitar_candidatura` — guard terminal `IF v_etapa IN ('aprovado','rejeitado')` [VERIFIED; `20260714100001:135`] | re-rejeita knockout, reescreve `motivo_rejeicao`; **com JORN-18, manda 2º e-mail de rejeição** |
| C1/C1b | `HubCandidatoRH.tsx:137-138` e `:232/:271` [VERIFIED] | hub oferece **Avançar** (→ triagem) e **Rejeitar** para knockout/`finalizado` |
| D4 | view `v_fila_trabalho` — `WHERE c.etapa_atual <> ALL (...)` [VERIFIED] | fila de trabalho do RH tem hoje **3 knockouts + 3 `finalizado`** com SLA vencido |
| D5 | `candidaturas_alem_da_janela()` — allowlist `elegivel_purga` **por etapa** [VERIFIED] | knockout **nunca** purgável (retenção indefinida não declarada). Destrutivo, `modo='dry_run'` → decisão do operador |
| D6, C2 | `funil_kpis` (CTE volume) e `CandidatosRHPage.tsx:258` | knockout conta como «inscrição» (relatório, baixo) |
| L1 | `notificar-candidato/index.ts:369` — desfecho por `etapa_atual` na hora do envio | latente: retry pós-reabertura pode mandar a cópia errada |

**Enums vivos** [VERIFIED: pg_enum]: `etapa_processo` = `inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado`; `status_candidatura` = `aguardando_resposta, em_analise, aprovado_proxima, rejeitado, finalizado`.

**Predicado canônico — já existe e está certo:** `src/components/pages/DashboardCandidatoPage.tsx:65` — `const STATUS_TERMINAIS: ReadonlySet<string> = new Set(['rejeitado', 'finalizado']);` e `:459-464` (`emAndamento` com etapa **e** status) [VERIFIED]. **PURGA-07 não é reutilizável como código** — ele próprio é a instância D5; serve só como doutrina (allowlist de terminais, COALESCE). Recomendação: função SQL `candidatura_encerrada(etapa, status)` (allowlist de terminais, NULL-safe) + helper TS espelho, e D1/D2/D3/D4/C1 passam a usá-la.

⚠ Existem **4 linhas legadas** com `status='finalizado'` em etapa de trabalho (`triagem`, `entrevista_online`, `decisao_final`, e 1 em `rejeitado`), **sem nenhuma linha de histórico** [VERIFIED]. O predicado precisa tratar `finalizado` como terminal, senão elas seguem «em andamento».

---

## B. JORN-22 — feedback neutro na rejeição humana

**Definição viva** [VERIFIED: `pg_get_functiondef`, idêntica à `20260714100001`; nenhuma redefinição posterior]:

```sql
-- rejeitar_candidatura(p_candidatura_id uuid, p_motivo motivo_rejeicao_rh, p_justificativa text) RETURNS void
-- (0) role guard: v_role IS NULL OR v_role NOT IN ('rh','administrador') → 42501
-- (1) char_length(btrim(justificativa)) < 50 → check_violation
-- (2b) rh precisa ser dono da vaga (admin bypassa)
-- (3) IF v_etapa IN ('aprovado', 'rejeitado') THEN RAISE ...          ← D3 da varredura
-- (4) UPDATE public.candidaturas
--        SET etapa_atual = 'rejeitado', status = 'rejeitado',
--            motivo_rejeicao = p_motivo::text, etapa_justificativa = v_just
--      WHERE id = p_candidatura_id;
```

**Como o knockout grava o texto neutro** — a definição VIVA é `submit_candidatura_atomic` de **`20260709000014:143`** (a `20260608000001:197` citada na CONTEXT é a versão anterior, superada; o texto é o mesmo) [VERIFIED]:
`feedback_rejeicao = 'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.'` (coluna `candidaturas.feedback_rejeicao text`).

**Quem lê `feedback_rejeicao`** [VERIFIED: grep + `pg_proc.prosrc`]:

| Leitor | Uso | Impacto de gravar texto neutro na rejeição humana |
|---|---|---|
| `DashboardCandidatoPage.tsx:158` (`hasDecisaoFinal`) | segunda condição do cartão | cartão aparece (objetivo) |
| `DashboardCandidatoPage.tsx:382-393` | mostra o texto + «Agradecemos seu interesse…» quando `status='rejeitado'` | a rejeição humana passa a mostrar o texto neutro — correto |
| `candidaturasService.ts:288` | allowlist de leitura do candidato | já inclui |
| `supabase/functions/_shared/exportAllowlist.ts:412,459` (`"preservar_com_ressalva"`) + `exportacaoService.ts:244` (rótulo «Retorno registrado») | cópia LGPD | entra na cópia — texto neutro, **não** vaza a justificativa (a `etapa_justificativa` **já** está na cópia hoje; `avisoJustificativa.ts`) |
| `reciboExclusao.ts:161` | categoria do recibo | nenhum |
| Funções vivas | só `submit_candidatura_atomic` escreve | — |
| **`candidaturasService.ts:458`** | legado `updateCandidaturaStatus` escreve `feedback_rejeicao: motivo_rejeicao` (texto livre!) | **Ramo morto hoje**: o único chamador (`UpdateStatusModal`) manda a rejeição para `registrar_decisao` e nunca passa `motivo_rejeicao` ao caminho de status. Recomenda-se **remover o ramo** — viola o espírito de D-12 se reativado |

**Condição do front** (`DashboardCandidatoPage.tsx:148-159`) — confirmada linha a linha; **não precisa mudar** [VERIFIED].

### ⚠ Achado Contraditório #2 — o cartão leva a uma página indisponível

`getExplicacao(candidaturaId)` (`explicacaoService.ts:245-296`): sem linha em `decisao_final` → `getExplicacaoAutomatica` → RPC `explicacao_rejeicao_automatica` que exige `motivo_rejeicao = 'knockout_automatico' AND opcao_knockout_id IS NOT NULL` → `false` → `null` → a página renderiza **«Esta página não está disponível.»** (`ExplicacaoCandidatoPage.tsx:73`) [VERIFIED]. Ninguém clicou no cartão na Etapa 9 (ele não aparecia), então isso nunca foi observado.

**O que a fase precisa para JORN-22 cumprir o objetivo** (e não só a letra):
- RPC de leitura que devolva um tri-estado (`'automatica' | 'humana_triagem' | null`) em vez de boolean — mesmo guard own-row, lendo `motivo_rejeicao` sem devolvê-lo (a razão de existir da `20260906000007`).
- `explicacaoService`: novo `origem: 'humana_triagem'` com razão neutra própria; `ExplicacaoCandidatoPage` com o ramo correspondente.
- **Decisão de produto antes do código** (D-14 — o executor não escolhe): a rejeição humana na triagem **oferece pedido de revisão**? Hoje `solicitar_revisao_decisao` exige linha em `decisao_final` com `decisao='rejeitado'`, então oferecer revisão exige criar esse caminho. A opção mínima coerente com o knockout é: explicação humana + canal (sem revisão). É `checkpoint:decision` do operador.
- Isso **não** contradiz D-12 (a condição do dashboard continua intacta); contradiz a premissa de que «o backend cobre os 3 casos».

**Retroatividade:** rejeições humanas já feitas sem `feedback_rejeicao` e sem `data_decisao_final` = **1** (a da Marina, conta de teste) [VERIFIED]. Backfill = `checkpoint:decision` (D-18), com contagem 1.

**Texto neutro sugerido (discrição do Claude):** algo como «Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.» — sem «motivo», «critério», «nota», «pontuação» (o grep-guard dos e-mails usa `/score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i` e é boa régua também aqui) [VERIFIED: `email-templates.test.ts:74`].

---

## C. JORN-26 — o filtro do pedido de exclusão

- Caminho: EF `executar-direito-titular` acao=`pedir` → `supabaseTitular.rpc("registrar_pedido_exclusao")` (`index.ts:554`) → dentro da RPC, `UPDATE public.candidaturas SET encerrada_a_pedido_em = now() WHERE ... AND c.etapa_atual NOT IN ('aprovado','rejeitado')` → trigger `trg_candidatura_encerrada_a_pedido` (AFTER UPDATE OF `encerrada_a_pedido_em`, NULL→NOT NULL) → `trg_notif_candidatura_encerrada()` → `net.http_post` a `notificar-rh` com evento `candidatura_encerrada_a_pedido` → 1 e-mail por RH ativo (chave `{candidatura}:candidatura_encerrada_a_pedido:{user_id}`) [VERIFIED: definições vivas + `notificar-rh/helpers.ts:125-141`].
- **Predicado correto:** `NOT public.candidatura_encerrada(c.etapa_atual, c.status)` (ou inline `c.etapa_atual NOT IN ('aprovado','rejeitado') AND c.status NOT IN ('rejeitado','finalizado')`, NULL-safe com COALESCE). O mesmo em `retirar_candidatura` (guard + UPDATE).
- **Smoke que vai reprovar trabalho correto:** `p45_motor_exclusao_smoke.sql` (C6) usa fixture `etapa_atual='triagem', status='rejeitado'` e **espera** encerramento. Refazer a fixture (INSERT com `status='rejeitado'` para desarmar o dispatch do INSERT, depois `UPDATE status='em_analise'`) — ver varredura §6.
- **Retroativo:** 2 marcas erradas (contas de teste) → `UPDATE` retroativo = checkpoint. Os 3 e-mails ao RH já saíram.

---

## D. Arquitetura de notificação (JORN-20, 27, 18, 15, U2 e e-mails do 19)

### D.1 Mapa ponta a ponta [VERIFIED: pg_get_functiondef + pg_trigger + código das EFs]

```
candidaturas INSERT ──► trg_notif_confirmacao ──(guard NEW.status/opcao_knockout — MORTO no knockout,
                    │                              ver abaixo)──► net.http_post notificar-candidato {evento:'confirmacao'}
                    └─► trg_candidaturas_analise ─► net.http_post analise-candidato-individual   (JORN-24)
candidaturas UPDATE OF etapa_atual ─► avancar_etapa() (BEFORE) ─► INSERT historico_candidatura
historico_candidatura INSERT ─► trg_notif_transicao:
        etapa_para='avaliacao_assincrona'                  → 'avanco'
        etapa_para IN ('aprovado','rejeitado') ∧ ¬auto      → 'decisao'   (humano: final E triagem)
        auto_rejeitado                                      → 'decisao'   (knockout, 20260906000006)
        demais                                              → silêncio
agendamentos_entrevista INSERT / UPDATE OF data_hora,tipo,local_ou_link ─► trg_notif_convite → 'convite'
decisao_final UPDATE OF revisao_solicitada_em ─► notificar-rh 'revisao_solicitada'
decisao_final UPDATE OF revisao_respondida_em ─► notificar-candidato 'revisao_respondida'
candidaturas UPDATE OF encerrada_a_pedido_em ─► notificar-rh 'candidatura_encerrada_a_pedido'
cron notif-retry-sweep (*/15) ─► varrer_retry_notificacoes() ─► notificar-candidato {retry_id,...}
        (exclui por DENYLIST: evento NOT LIKE 'revisao\_solicitada%' AND evento <> 'candidatura_encerrada_a_pedido')
```

Autenticação trigger→EF: `Authorization: Bearer <vault.edge_invoke_key>` (64 caracteres hex, 1 segmento — **não** é JWT nem `sb_secret_`); `notificar-candidato` compara com `NOTIFICAR_SECRET ?? SUPABASE_SERVICE_ROLE_KEY`, e `NOTIFICAR_SECRET` **existe** entre os segredos da EF; `analise-candidato-individual` idem com `ANALISE_SECRET` [VERIFIED: vault (prefixo/comprimento só), `/secrets` (só nomes)].

**Na EF `notificar-candidato`** (`index.ts`): valida payload → (retry) carrega linha por `retry_id` → lê candidatura por allowlist → **survivor-guard do knockout só para `confirmacao`** (`:196-213`, porque o guard do trigger é código morto: o INSERT nasce `aguardando_resposta` e o knockout é um UPDATE posterior) → claim `upsert(..., {onConflict:'dedupe_key', ignoreDuplicates:true})` → **vazio ⇒ `skipped:"duplicate"` e 200, sem linha e sem erro** (a causa do Defeito 18) → guard de sink em modo teste → render → Resend com `Idempotency-Key: retry_id ?? dedupe_key` (⚠ o Resend também deduplica 24 h pela mesma chave) → grava `enviado` [VERIFIED].

**Estado:** `NOTIFICACOES_MODO` = **`producao`** [VERIFIED: digest SHA-256 do segredo = sha256('producao'); o valor não foi lido].

**CHECK vivo de `evento`** [VERIFIED: pg_get_constraintdef]:
`CHECK ((evento = ANY (ARRAY['confirmacao'::text, 'avanco'::text, 'convite'::text, 'decisao'::text, 'revisao_solicitada'::text, 'revisao_respondida'::text, 'divulgacao_vagas'::text, 'candidatura_encerrada_a_pedido'::text])))`

**Todo evento novo precisa de CINCO coisas na mesma entrega** (senão o e-mail some em silêncio):
1. valor no CHECK `notificacoes_enviadas_evento_check`;
2. linha em **`classe_evento_notificacao`** (`transacional|marketing|interno`) — o trigger `guard_marketing_consentimento` é **fail-closed** (P0003) para evento sem classe [VERIFIED];
3. vocabulário da EF (`EVENTO_MAP` em `notificar-candidato/helpers.ts`, ou `EVENTOS_RH_VALIDOS` em `notificar-rh/helpers.ts`) — `vocabulario-eventos.test.ts` pina a paridade;
4. **se for evento do RH:** acrescentar à exclusão de `varrer_retry_notificacoes()` — a varredura posta **toda** linha falha em `notificar-candidato`; um evento de RH não excluído é recusado com 400 antes do branch de retry, nunca incrementa `tentativas` e volta a cada 15 min consumindo o `LIMIT 20` (T-42-23, documentado no próprio corpo da função) [VERIFIED];
5. smokes com lista literal de eventos (§I).

`notificacoes_enviadas.candidatura_id` é **NOT NULL** [VERIFIED] — evento ao titular sem candidatura não cabe no ledger. **16 de 42** candidatos não têm candidatura [VERIFIED].

**Templates:** o texto vive **só** em `supabase/functions/_shared/email-templates.ts` (`CORPOS`, `SUBJECTS`, `PREHEADERS`). A tabela `templates_email` (3 linhas, 2025-11-04) **não tem leitor** em `src/` nem em `supabase/functions/` — é morta [VERIFIED: grep + SELECT].

### D.2 JORN-18 — chave de dedupe

Hoje (`notificar-candidato/helpers.ts:78-93`): `convite` → `{agendamento}:convite[:{data_hora}]`; demais → `{candidatura}:{evento}` [VERIFIED].

**Recomendação: `{candidatura}:decisao:{historico_id}`**, com o trigger passando o id da linha de histórico:
- `trg_notif_transicao` é AFTER INSERT **em `historico_candidatura`** → `NEW.id` é o id da transição. Acrescentar `'historico_id', NEW.id` ao `body` (e `'avanco'` também pode usar, por simetria).
- `montarDedupeKey` **já aceita** um 4º parâmetro `versao` (usado pelo reagendamento) — é passar o `historico_id` validado (uuid).
- **Retry continua deduplicado:** o branch de retry usa `retry_id` (a linha existente), não a chave; o `Idempotency-Key` do Resend é `retry_id ?? dedupe_key` [VERIFIED].
- **Um disparo duplicado do mesmo evento** (mesma linha de histórico) continua colapsando; uma **nova decisão** é nova linha de histórico ⇒ nova chave.
- Linhas antigas `{candidatura}:decisao` não colidem com as novas (sufixo). Nada lê o formato da chave de `decisao` além da própria EF: `varrer_retry` só faz `split_part` para `convite`; `anonimizar_candidato` re-namespaceia por `evento||':'||candidatura_id||':purgado-'||id` [VERIFIED].
- **Aproveitar para matar L1:** com o `historico_id` no corpo, a EF pode derivar `desfecho` de `historico.etapa_para` (estável) em vez de `candidaturas.etapa_atual` na hora do envio.

⚠ **O mesmo defeito existe no ciclo de revisão, e JORN-19 o arma:** `revisao_respondida` usa `{candidatura}:revisao_respondida` (o comentário em `helpers.ts:68-76` justifica com «no máximo UMA revisão por candidatura» — **premissa que D-01 derruba**), e `notificar-rh` usa `{candidatura}:revisao_solicitada:{user_id}`. Uma segunda revisão depois de reabrir seria engolida. Discriminador recomendado: o instante do pedido do ciclo (`extract(epoch from revisao_solicitada_em)`), passado pelos dois triggers de `decisao_final`.

**O que depende do formato:** `notificar-candidato/__tests__/notificar-candidato.test.ts` («T-42-V4 — montarDedupeKey…» e «as dedupe keys de uma mesma candidatura NÃO colidem») [VERIFIED: deno test, 53 verdes hoje]; nenhum smoke SQL assere o formato de `:decisao`.

### D.3 JORN-20 — rejeição na triagem

**Provado:** a rejeição da Etapa 9 (2026-09-20 13:03:25 -03) gerou histórico `triagem→rejeitado` com ator e `auto_rejeitado=false`, e o log de `notificar-candidato` 16:03:25 UTC registra `{ evento: "decisao", candidatura_id: "bf26ee3c-…", dedupe_key: "bf26ee3c-…:decisao", skipped: "duplicate" }` [VERIFIED: function_logs]. A candidatura já tinha a chave ocupada pela aprovação de 02:11.

**Portanto:** reusar o evento `decisao` (é o que já acontece — o trigger não distingue triagem de decisão final, e o knockout também usa `decisao`). A cópia `COPY_REJEICAO` («Sua candidatura não seguirá para as próximas etapas deste processo seletivo…») serve para triagem. **Não criar evento novo** — acrescentaria as 5 obrigações de D.1 sem ganho. JORN-20 = JORN-18 + prova em PROD com uma candidatura que nunca teve `decisao`.

Nenhuma rejeição na triagem **limpa** (primeira decisão da candidatura) existe no banco para confirmar o caminho feliz — a verificação de JORN-20 tem de ser feita com conta de teste (§K).

### D.4 JORN-27 — aviso ao titular

**Fato:** `solicitacoes_dados.recibo_enviado_em` é o **cinto primário do recibo pós-exclusão** (passo 4 de `executarExclusao`, `executar-direito-titular/index.ts:1075-1103`; usado também para reencontrar pedidos órfãos em `:522`). Estado: `exclusao/cancelado` 2 (sem recibo — **correto**), `exclusao/concluido` 1 (**com** recibo), `acesso/atendido` 3 [VERIFIED].

**Escrever `recibo_enviado_em` ao pedir faria o passo 4 pular o recibo final** — o titular teria a conta apagada sem o único e-mail que prova a exclusão. A letra de JORN-27 («`recibo_enviado_em` passa a ser escrito») precisa ser **reinterpretada pelo operador** (D-14: o executor para e reporta).

**Desenho recomendado (MEDIUM):**
- colunas novas em `solicitacoes_dados`: `aviso_pedido_enviado_em timestamptz`, `aviso_cancelamento_enviado_em timestamptz` (idempotência por estado, como o recibo);
- envio **na EF `executar-direito-titular`**, logo depois de a RPC `registrar_pedido_exclusao`/`cancelar_pedido_exclusao` devolver linha, reusando a mecânica de `enviarRecibo` (`resolverModo`, `exigirSinkTeste`, `ler_resend_api_key`, `Idempotency-Key` própria) e o `layoutBase`;
- **não** passar por `notificacoes_enviadas` (o ledger exige `candidatura_id`; 16/42 titulares não têm candidatura);
- falha de envio **não** desfaz o pedido; grava a causa (log por código) e deixa a coluna nula para reenvio — o aviso é controle de conta invadida, então silêncio é o pior modo de falha;
- conteúdo: data de execução (`executar_em`) e como cancelar (link para `/candidato/privacidade`); **nunca** `solicitacao_id` (Invariante 12); **não** citar o canal de privacidade por literal (D-07 — as EFs Deno não importam `src/features/privacidade/constants/canalPrivacidade.ts`, então qualquer citação seria a 5ª ocorrência; o `REPLY_TO` já é `rh@beautysmile.com.br` e o rodapé diz «responda a este e-mail»).

Alternativa (trigger em `solicitacoes_dados` → nova EF/evento): rejeitada — exigiria `candidatura_id` nulo no ledger ou evento fora do ledger de qualquer jeito.

### D.5 JORN-15 — a promessa

Única ocorrência viva: `supabase/functions/_shared/email-templates.ts:150` — «A partir de agora, você poderá acompanhar o andamento pelo painel do candidato. Avisaremos por e-mail a cada etapa.» [VERIFIED]. Nenhum teste pina esse texto.

Outras promessas de e-mail achadas no grep amplo (P2 da busca):

| Onde | Texto | Situação |
|---|---|---|
| `src/components/modals/UpdateStatusModal.tsx:284` | «O candidato receberá um email informando sobre a mudança de status» (para o RH) | **promessa sem código**: transição de status não notifica (`notificar_candidato` «honored server-side/M5» — não é) |
| `src/features/explicacao/services/explicacaoService.ts:206` | «Sua candidatura segue em análise. Avisaremos você sobre os próximos passos.» (razão para `em_espera`) | inalcançável hoje (a página só existe para `rejeitado`) |
| `src/features/cadastro/hooks/useFormToast.ts:203` | «Você receberá um email de confirmação em breve» | cadastro/Auth — fora do escopo |
| `src/features/agendamento/components/AgendamentoCandidatoCard.tsx:242` | «Você será avisado aqui…» | «aqui» = painel — honesto |

Linha canônica honesta **já existente** no front: `'Acompanhe o andamento pelo seu painel'` (guard `src/__tests__/guards/wait-state-copy.grep.test.ts`, que vigia 7 arquivos por **lista literal** — não vê arquivo novo, e não vigia `supabase/functions/`) [VERIFIED]. Recomenda-se o e-mail usar a mesma frase + a promessa condicional de D-09.

⚠ **D-09 diz «toda ação pedida ao candidato avisa (`avaliacao_liberada`, `convite`)» — medido: `liberar_cognitivo` (o botão «Liberar avaliação» do Raven) NÃO notifica** (`prosrc` sem `net.http`, nenhum trigger nas tabelas do Raven) [VERIFIED]. Com o texto novo («avisaremos quando houver algo para você fazer»), essa liberação seria uma promessa descumprida. É **pergunta para o operador**: acrescentar aviso na liberação cognitiva, ou aceitar a lacuna registrada. Idem `em_espera` (registrar decisão «em espera» não gera histórico nem aviso).

### D.6 JORN-U2 — link para o login do candidato

- Rota: **`/auth/login`** (`LoginCandidatoPage`) [VERIFIED: `src/router/routes.tsx:179`]. `/candidato/dashboard` sob `RoleGuard` redireciona o não-autenticado para `/auth/login?redirect=…` (`RoleGuard.tsx:131`), e o login consome `?redirect=` com `resolveRedirect` (anti-open-redirect; default `/candidato/dashboard`) [VERIFIED].
- Base URL: `notificar-rh` já tem o padrão — env `APP_BASE_URL` (**não está** entre os segredos da EF hoje) com default `APP_BASE_URL_PADRAO = "https://rh.beautysmile.com.br"` e validação `montarUrlFila` que cai no default se a env for malformada [VERIFIED: `notificar-rh/helpers.ts:37,180-215`, `/secrets`]. Mover para `_shared/email-config.ts` e reusar.
- **Onde pôr o link:** nos corpos de candidato de `renderarEmail`, **não** no rodapé de `layoutBase` — `layoutBase` também monta os e-mails do RH (`notificar-rh/helpers.ts:239,277`) e o **recibo de exclusão** (`executar-direito-titular/helpers.ts:391`), que é enviado **depois** de a conta deixar de existir [VERIFIED]. Um parâmetro opcional em `layoutBase` resolve sem afetar os outros.

**E-mails ao candidato que devem levar o link:**

| Evento / template | Destino sugerido |
|---|---|
| `confirmacao` / `candidatura_recebida` | `/auth/login` (cai no painel) |
| `avanco` / `avaliacao_liberada` | `/auth/login` |
| `convite` / `convite_entrevista` | `/auth/login` |
| `decisao` / `decisao_final` (aprovado e rejeitado, inclui knockout) | `/auth/login` |
| `revisao_respondida` | `/auth/login` |
| novos de JORN-27 (pedido/cancelamento) | `/auth/login?redirect=/candidato/privacidade` |
| recibo de exclusão | **sem link** (conta apagada) — exceção a registrar em JORN-U2 |

**D-07:** ocorrências literais de `lgpd@beautysmile.com.br` hoje: `src/features/privacidade/constants/canalPrivacidade.ts:42`, `src/features/cadastro/components/steps/AutorizacoesStep.tsx:284,287` (+ o teste `ExplicacaoCandidatoPage.test.tsx:422-423`); **zero** em `supabase/functions/` e zero em funções do banco [VERIFIED]. Nenhum e-mail novo deve citar o endereço.

---

## E. JORN-19 — reabrir, prazo, alerta

### E.1 O que existe (definições vivas) [VERIFIED: pg_get_functiondef]

- `responder_revisao_decisao(p_candidatura_id, p_veredito, p_justificativa)`: guards — role (`coalesce(v_role,'') NOT IN ('rh','administrador')` → 42501), `auth.uid()` não nulo, linha existe, `revisao_solicitada_em` não nulo, `por_usuario` não nulo, **`v_uid = por_usuario` → 42501 (decisor não responde)**, `revisao_respondida_em IS NULL` (idempotência, 22023), veredito ∈ {mantida, revertida}, justificativa ≥ 50. Depois: `UPDATE decisao_final SET revisao_veredito, revisao_resultado, revisao_por_usuario, revisao_respondida_em = now()`. **Não toca `candidaturas`.**
- `registrar_decisao(p_candidatura_id, p_decisao decisao_final_resultado, p_justificativa)`: ⚠ a definição viva vem de um **patch dinâmico** (`20260826000004` reescreve o corpo via `EXECUTE` sobre `pg_get_functiondef`), então **nenhum arquivo de migration contém o texto vivo** — a próxima redefinição tem de partir de `pg_get_functiondef`. Faz `INSERT ... ON CONFLICT (candidatura_id) DO UPDATE SET decisao, justificativa, por_usuario = auth.uid(), em = now()` e move `candidaturas` para `aprovado/finalizado` ou `rejeitado/rejeitado` com `data_decisao_final = now()` e `etapa_justificativa = p_justificativa`; `em_espera` não move a etapa.
- `decisao_final`: `UNIQUE (candidatura_id)`; CHECKs `revisao_veredito ∈ {mantida,revertida}`, «resposta completa» (veredito, revisor e respondida_em juntos) e justificativa de revisão ≥ 50; triggers `trg_decisao_final_snapshot` (AFTER UPDATE, arquiva **só** `decisao, justificativa, por_usuario, decidido_em`), `trg_notif_revisao_solicitada`, `trg_notif_revisao_respondida`. Policies: candidato e RH só SELECT; INSERT `WITH CHECK (false)`; sem UPDATE.
- `decisao_final_historico`: `id, candidatura_id, decisao, justificativa, por_usuario, decidido_em, arquivado_em` — **sem colunas de revisão**.
- `avancar_etapa()`: `rejeitado → decisao_final` é regressão (`NEW.etapa_atual < OLD.etapa_atual`) → exige `NEW.etapa_justificativa` não vazia no **mesmo UPDATE**.

### E.2 Achado — a redecisão já é alcançável pela UI (não só por reset)

`RegistrarDecisaoForm.tsx:94-99` mostra «Já existe uma decisão registrada. Registrar novamente cria uma nova linha auditável — a decisão anterior não é apagada.» e o upsert de `registrar_decisao` aceita. **O `UNIQUE(candidatura_id)` não bloqueia uma nova decisão** — ela sobrescreve a linha e o snapshot arquiva a anterior. Duas consequências: o Defeito 18 é alcançável em uso normal (hoje), e um RH pode mudar `rejeitado → aprovado` sem revisão alguma, com os campos de revisão da decisão antiga **continuando na linha**.

### E.3 Três desenhos

| | Desenho | Como a nova decisão é registrada | Trade-offs |
|---|---|---|---|
| **A (recomendado)** | Reabrir **dentro** de `responder_revisao_decisao` quando `p_veredito='revertida'` (mesma transação); redecidir pelo **upsert existente** de `registrar_decisao`, que passa a **arquivar e zerar** o ciclo de revisão | `registrar_decisao` sobrescreve a linha; o snapshot arquiva a decisão anterior; `decisao_final_historico` ganha colunas **nullable** de revisão/reabertura e `snapshot_decisao_final()` passa a copiá-las | Mínimo de superfície; `UNIQUE` intacto; leitores (`maybeSingle` por `candidatura_id` em `notificar-candidato`, `explicacaoService`, `decisaoService`, purga) não mudam. Custo: alterar `snapshot_decisao_final` (toca a área do Defeito 3b — **não** consertar o 3b, só acrescentar colunas) |
| B | Várias linhas por candidatura: derrubar o `UNIQUE`, `vigente boolean` + índice único parcial | `INSERT` de linha nova | Trilha mais «pura», mas **todo leitor** que faz `.eq('candidatura_id').maybeSingle()` / `EXISTS (decisao_final …)` quebra ou passa a ler a errada (EF, explicação, purga `candidaturas_alem_da_janela`, `listar_revisoes_decisao`, export, smokes). Não cabe num bloco de consertos |
| C | RPC separada `reabrir_candidatura(p_candidatura_id)` chamada pelo RH depois do veredito | igual a A | Dois passos: o veredito `revertida` fica registrado sem efeito até alguém clicar de novo — é **exatamente** o Defeito 19 («decisão documentada cuja próxima etapa não tem plano»). Só vale se o operador quiser o veredito sem efeito imediato |

**Desenho A em detalhe (o que o planejador precisa decidir/escrever):**

1. `responder_revisao_decisao`, ramo `revertida`, no MESMO statement block:
   - `UPDATE decisao_final SET ... , reaberta_em = now(), prazo_nova_decisao_em = <10 dias corridos>` (**no mesmo UPDATE do veredito** → um snapshot só, não dois);
   - `UPDATE candidaturas SET etapa_atual='decisao_final', status='em_analise', etapa_justificativa = <texto próprio da reabertura>` — justificativa **própria** exigida pela regressão (não a residual do Defeito 17). ⚠ `etapa_justificativa` é **visível ao candidato** (vai à cópia LGPD e a `historico_candidatura.criterio_texto`) — escrever texto que se assinaria (ex.: «Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até DD/MM/AAAA.»), **não** copiar a justificativa do revisor;
   - `data_decisao_final`: **recomendado zerar (NULL)**. Com ela preenchida, o cartão do dashboard continua «Entenda a decisão» apontando para a decisão revertida; zerada, o cartão some até haver nova decisão (a data antiga fica em `decisao_final.em`, no snapshot e no histórico). A purga ancora primeiro em `historico` (`etapa_para = etapa_atual`), então nada se perde ali.
   - Guard adicional: só reabre se `candidaturas.status='rejeitado' AND etapa_atual='rejeitado'` (hoje `solicitar_revisao` só existe para `decisao='rejeitado'`).
2. Histórico: o UPDATE grava `rejeitado → decisao_final` com `ator = revisor`; `trg_notif_transicao` **não** despacha para `etapa_para='decisao_final'` (correto: o aviso é o `revisao_respondida`).
3. `registrar_decisao` (redecisão): quando a linha tinha ciclo de revisão, zerar `explicacao_solicitada_em`, `revisao_*`, `reaberta_em`, `prazo_nova_decisao_em`, `alerta_prazo_enviado_em` **depois** de o snapshot tê-los arquivado (snapshot AFTER UPDATE lê `OLD`, então basta o snapshot copiar as colunas novas). Sem isso: (a) a nova rejeição aparece ao candidato com «revisão respondida: revertida»; (b) `solicitar_revisao_decisao` vira no-op (`revisao_solicitada_em IS NULL` falso) e o Art. 20 fica inalcançável na nova decisão.
4. Chaves de dedupe do ciclo (D.2) — sem isso a 2ª revisão some.
5. Prazo: guardar `prazo_nova_decisao_em`. «10 dias corridos» com «data exata» no e-mail: recomendado data em `America/Sao_Paulo` = (dia da reabertura) + 10, vencendo no fim desse dia. Onde morar: **`decisao_final`** (pertence ao ciclo; o candidato já lê `decisao_final` por allowlist em `explicacaoService`). Se o dashboard precisar mostrar o prazo sem ler `decisao_final`, a alternativa é a coluna em `candidaturas` — escolha do planejador.
6. Alerta no vencimento (D-10 — **só alerta**): função `varrer_prazos_reabertura()` SECURITY DEFINER (REVOKE de `anon`/`authenticated`, como `varrer_retry_notificacoes`) + job pg_cron diário; seleciona `reaberta_em IS NOT NULL AND prazo_nova_decisao_em < now() AND alerta_prazo_enviado_em IS NULL AND em <= reaberta_em` (sem nova decisão) → `net.http_post` a `notificar-rh` com evento novo (ex.: `prazo_reabertura_vencido`, classe `interno`) → grava `alerta_prazo_enviado_em`. Obrigações de D.1 inteiras, **inclusive a exclusão na varredura de retry**. Badge na fila é opcional e barato (a view `v_fila_trabalho` já mostra `decisao_final`).
7. Cópias a mudar (e-mail e página **têm** de dizer a mesma coisa — regra da 42-UI-SPEC):
   - `email-templates.ts:220` `COPY_REVISAO_REVERTIDA = "Após a revisão, a decisão anterior foi revista."` → «sua candidatura foi reaberta e será decidida novamente até DD/MM/AAAA» (a EF precisa ler `prazo_nova_decisao_em` — hoje lê só `revisao_veredito`, `index.ts:246-253`);
   - `ExplicacaoCandidatoPage.tsx:94` `revertida: 'a decisão anterior foi revista.'`;
   - RH: `ResponderRevisaoDialog.tsx:141-147` («Reverter a decisão? A decisão original deixará de valer.») e `responderRevisaoSchema.ts:69-71` («A decisão original deixa de valer.») → dizer que a candidatura volta a «Decisão final» com prazo de 10 dias;
   - testes que pinam o texto antigo: `email-templates.test.ts:331`, `notificar-candidato.test.ts:597-598,652`, `ExplicacaoCandidatoPage.test.tsx:60,165` [VERIFIED].
8. **Painel do candidato numa candidatura reaberta:** etapa «Decisão Final», status `em_analise` («Em Análise»), e a `PrazoEstimadoLinha` mostra o SLA da etapa — hoje **«Em decisão final — resposta em até 3 dias úteis.»** (`config_sla_etapa`) [VERIFIED], que **contradiz** o prazo de 10 dias do e-mail. O planejador precisa de um ramo de reabertura nessa linha (ou esconder o SLA quando reaberta).

**Invariantes que precisam sobreviver:** revisor ≠ decisor (no ato de responder — já está); só RH/admin respondem e redecidem; a redecisão **não** é automática em nenhum ramo (D-01/D-10).

**Pergunta em aberto (operador):** o decisor original pode registrar a nova decisão depois da reabertura? Nenhuma regra hoje impede.

---

## F. JORN-24 — parar a IA depois do knockout

**Disparo** [VERIFIED]: trigger `trg_candidaturas_analise` AFTER INSERT em `candidaturas` → `trg_candidatura_analise()` → `net.http_post` a `analise-candidato-individual` com `{candidatura_id, vaga_id}`, sem guarda nenhuma. `submit_candidatura_atomic` **insere com `status='aguardando_resposta'`** e só depois aplica o knockout por UPDATE — então **nenhuma guarda no trigger AFTER INSERT pode funcionar** (é o mesmo motivo documentado no survivor-guard de `notificar-candidato`, `index.ts:196-201`). O `pg_net` só entrega depois do COMMIT, e a EF vê o estado final.

**Guarda mínima:** na EF, **antes** do upsert `pendente` (`index.ts:257-260`, que hoje roda antes de ler a candidatura), ler a candidatura com `status, opcao_knockout_id, motivo_rejeicao` e devolver `200 {ok:true, skipped:"knockout"}` sem criar linha e sem chamar `callAi`. Predicado: `status='rejeitado' AND opcao_knockout_id IS NOT NULL` (espelha o survivor-guard). Teste deno com `handler(req, deps)` mockado: nenhuma chamada a `callAi`, nenhuma escrita.

**D-02 — medição** [VERIFIED]. Predicado: `candidaturas.motivo_rejeicao='knockout_automatico' AND opcao_knockout_id IS NOT NULL` com linha em `analise_candidato_vaga` e `analise.created_at >= historico(auto_rejeitado).criado_em`.

| candidatura | knockout em | análise criada | Δ | status | conta |
|---|---|---|---|---|---|
| `92522073-484c-46a3-9e9d-8e80afa3c062` | 2026-09-06 10:59:47 | +0,54 s | | sucesso | `+claude` (teste) |
| `0f7b217c-dcb0-44cd-939b-72b7f2c36856` | 2026-09-06 12:51:48 | +0,52 s | | sucesso | `+claude` (teste) |
| `25a4231c-612b-4f86-9c5a-904ca09f18f4` | 2026-09-20 13:58:37 | +0,56 s | | sucesso | `+claude` (teste) |

**3 linhas, não 1** (CONTEXT diz 1). Todas de contas de teste do operador. A marcação é `UPDATE` retroativo **já autorizado** por D-02 — mesmo assim com contagem antes/depois (esperado 3).

**Esquema da marca:** `analise_candidato_vaga` não tem coluna de finalidade (colunas: `id, candidatura_id, vaga_id, score_match, pontos_fortes, gaps, flags, resumo_cv, resumo_respostas, status, erro, created_at, updated_at`; `status ∈ {pendente,sucesso,falhou}`) [VERIFIED]. Recomendado: **coluna nova** (ex.: `descartada_em timestamptz` + `descartada_motivo text CHECK (descartada_motivo IN ('knockout_automatico'))`) em vez de novo valor em `status` — `status` é lido por `v_triagem_panel.analise_status`, pela fila e pelo hub; mudar o vocabulário dele arrasta leitores.

**Portões que uma coluna nova aciona:**
- `check:export-allowlist` compara o artefato com `docs/compliance/catalogo-vivo-44.json` (**snapshot versionado**, não o banco) — fica verde sozinho. Quem pega a coluna é `docs/compliance/sql/05-export-allowlist-drift.sql`, que rodado hoje (só leitura) **já acusa 9 colunas sem veredito** (`candidatos.faixa_etaria_materializada`, `candidaturas.encerrada_a_pedido_em` e 7 de `solicitacoes_dados`, inclusive `recibo_enviado_em`) [VERIFIED]. Coluna nova em `analise_candidato_vaga`, `solicitacoes_dados`, `decisao_final` ou `candidaturas` soma nessa lista. Decisão: entra na cópia do titular? (para D-02 **deveria**: a marca é justamente o que torna a contradição auditável ao titular) → atualizar `export-scope-rules.yaml`, `pii-inventory.yaml`, regenerar (`node docs/compliance/sql/gen-export-allowlist.cjs`), subir `versao` (1.1.0) e rodar `check:recibo-exclusao`, `check:pii-inventory-md`.
- `database.types.ts`: regenerar pelo comando com `< /dev/null` (CONTEXT §code_context).
- Matriz de retenção: não (a tabela segue a candidatura).

⚠ Parar a análise reduz o Defeito 25 daqui para frente, mas **não** o conserta (o comparativo segue sem filtrar por `status`).

---

## G. JORN-06 — investigação (D-13)

### Tabela de evidência

| Afirmação | Situação | Evidência |
|---|---|---|
| O 401 veio de `gerar-devolutiva-bigfive` | **provado** | edge log 2026-09-20 02:46:54.725 UTC, `POST /functions/v1/gerar-devolutiva-bigfive` → 401, `function_id eb465c1b…`, versão 22 |
| Veio da **guarda no código**, não do gateway | **provado** | function_logs 02:46:54.716: `warning [gerar-devolutiva-bigfive] Rejected request: invalid/absent Bearer` (a string do `console.warn` de `guardDevolutivaBearer`, `index.ts:621`); deploy com `verify_jwt=false` (GET `/v1/projects/…/functions`) e `supabase/config.toml:33-34` |
| A chave do ambiente das EFs é formato novo `sb_secret_` | **provado (indireto, forte)** | o `apikey` da chamada interna tem `prefix = sb_secret_…` no edge log (`request.sb.apikey.prefix`); o client interno é `createClient(SUPABASE_URL, SERVICE_KEY)` e `fetchWithAuth` põe `apikey = supabaseKey`; chaves legadas **desligadas** (`GET /api-keys/legacy` → `{"enabled":false}`) |
| O bundle de `submit-bigfive-final` v11 usa supabase-js que omite o Bearer para `sb_secret_` | **provado** | bundle deployado contém `supabase-js@2.110.9` e `omitApiKeyAsBearer`; no código dessa versão: `f = !(i?.omitApiKeyAsBearer && I(e))` com `I = e => e.startsWith("sb_publishable_") \|\| e.startsWith("sb_secret_")`, e `Authorization` só é posto se `m ?? (f ? e : null)` — sem sessão (`m = null`) e com `sb_secret_`, **nada**; `this.functionsFetch = L(..., {omitApiKeyAsBearer: !0})` e `get functions(){ return new R(..., {customFetch: this.functionsFetch}) }` |
| A requisição interna chegou **sem** `Authorization` | **quase provado** | o edge log da chamada interna **não tem** bloco `sb.jwt.authorization` (o da chamada do candidato tem, com payload) e `auth_user = None`; o que falta é ver o header ausente num log que o nomeie |
| A quebra começou em 2026-07-07 | **NÃO provado** | só existem **2** Big Five na história (2026-06-26 com devolutiva; 2026-09-19 sem). Entre 06-26 e 09-19 nenhum submit ocorreu (o Defeito 5 bloqueava o envio). A data é inferência sobre a introdução da guarda |
| Drift deploy × repositório | sem drift evidente | marcadores do fonte (`SEM early-return em`, `timingSafeEqualStr`, `DEVOLUTIVA_INVOKE_SECRET`) presentes nos bundles; comparação byte a byte impossível (o bundler reescreve imports/espaços) |

### Causas candidatas, por evidência

1. **H1 (evidência forte):** supabase-js ≥ versão com `omitApiKeyAsBearer` + chave de ambiente `sb_secret_` ⇒ `functions.invoke` sem sessão **não envia `Authorization`** ⇒ `guardDevolutivaBearer` lê Bearer vazio ⇒ 401. Explica também por que o comentário SEC-04 («o valor que o único chamador já envia como Bearer») era verdadeiro quando escrito e deixou de ser.
2. H2 (improvável): o invoke envia um Bearer diferente do `SUPABASE_SERVICE_ROLE_KEY` da função chamada — os dois processos leem o mesmo segredo do mesmo projeto, e H1 explica tudo sem H2.
3. H3 (descartada): gateway `verify_jwt` — deploy `verify_jwt=false` e o log da função mostra o código rodando.

### Instrumentação mínima (uma submissão real prova)

Em `gerar-devolutiva-bigfive`, **antes** de `guardDevolutivaBearer`, um log só de formato:

```ts
// nunca o valor — só presença, esquema, classe de formato e comprimento
function formato(v: string): string {
  if (!v) return "vazio";
  if (v.startsWith("sb_secret_")) return "sb_secret";
  if (v.startsWith("sb_publishable_")) return "sb_publishable";
  if (v.startsWith("eyJ") && v.split(".").length === 3) return "jwt";
  return "outro";
}
const auth = req.headers.get("Authorization") ?? "";
const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
console.log("[gerar-devolutiva-bigfive] diag-auth", {
  auth_presente: auth !== "",
  esquema: auth === "" ? "ausente" : auth.startsWith("Bearer ") ? "Bearer" : "outro",
  recebido_formato: formato(bearer), recebido_len: bearer.length,
  esperado_env: "SUPABASE_SERVICE_ROLE_KEY",
  esperado_formato: formato(SERVICE_KEY), esperado_len: SERVICE_KEY.length,
  apikey_formato: formato(req.headers.get("apikey") ?? ""),
});
```

E em `submit-bigfive-final`, trocar o `catch {}` mudo e o descarte de `error` por um log por código (`error?.name`, `error?.context?.status`), mantendo o `{ ok: true }` ao candidato. **H1 prevê:** `auth_presente:false, esquema:"ausente", apikey_formato:"sb_secret", esperado_formato:"sb_secret"`.

Conta para a prova: uma conta de teste com candidatura em `avaliacao_assincrona` (o gate de `submit-bigfive-final:178`).

**Consertos derivados (só depois da prova):** (a) `supabaseAdmin.functions.invoke(nome, { body, headers: { Authorization: \`Bearer ${serviceKey}\` } })` — `fetchWithAuth` respeita um `Authorization` já presente (`if(!h.has("Authorization"))`), e o handler precisa receber `serviceKey` nas deps; ou (b) `fetch` explícito. Ambos mandam `Bearer sb_secret_…` = env da função chamada ⇒ guarda passa. `verify_jwt=false` na chamada é o que permite um Bearer não-JWT (não mudar). A observabilidade (log por código) fica de qualquer jeito.

**Backlog:** **1** candidatura com Big Five sem devolutiva (`bf26ee3c-0ae3-4e92-a99b-6e05efc2a662`, conta de teste da jornada); 1 devolutiva no banco (2026-06-30) [VERIFIED]. Geração retroativa é aditiva; é só esta.

**Janela de logs:** os logs da plataforma disponíveis começam em 2026-09-20 01:37 UTC (≈ 1 dia de retenção). A instrumentação tem de ser lida **no mesmo dia** do submit de prova.

---

## H. JORN-D5 — `local_ou_link`

- Escrita: **PostgREST direto** em `agendamentos_entrevista` sob a policy `rh_gerencia_agendamento` (ALL); `agendamentoService.ts:163` (insert) e `:191` (update com patch parcial); também `:211` (`status='cancelada'`) e `:226` (`compareceu`) atualizam a linha [VERIFIED]. Não há RPC.
- Form: `AgendamentoBlock.tsx:294` (`register('local_ou_link')`), placeholder `:295-299` (a CONTEXT diz `:298` — deriva de ~4 linhas); rótulo muda por modalidade («Local» × «Link da videochamada»). Schema `agendamentoSchema.ts`: `local_ou_link: z.string().optional()` [VERIFIED].
- `isSafeHttpUrl` mora **dentro** de `AgendamentoCandidatoCard.tsx:69` (não exportado) — mover para um util compartilhado e usar no Zod.
- **O campo guarda endereço no presencial** [VERIFIED]: 2 linhas vivas — `presencial` com texto de 57 caracteres, com dígitos e vírgula (endereço); `online` com `dddd` (4 letras) — **1 violação**, conta de teste, status `reagendada`. `tipo ∈ {online, presencial}` (enum `tipo_entrevista_avaliacao`).
- **Regra recomendada:** obrigatório nos dois (texto não vazio); URL http(s) **só** quando `tipo='online'`.
- ⚠ **`CHECK ... NOT VALID` não basta**: um CHECK é reavaliado em **qualquer** UPDATE da linha, então cancelar ou marcar comparecimento na linha `dddd` passaria a falhar. Use trigger `BEFORE INSERT OR UPDATE` que valida só quando `NEW.local_ou_link IS DISTINCT FROM OLD.local_ou_link OR NEW.tipo IS DISTINCT FROM OLD.tipo` (ou no INSERT). A linha legada fica intocada sem `UPDATE` retroativo.
- `.ics`: não mexer (não-URL vai para LOCATION — correto).

---

## I. Varredura de portões (D-17)

`grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql` → **246** linhas em 38 arquivos (igual à medição da JORNADA de 2026-09-20) [VERIFIED].

**Smokes que esta fase toca, classificados:**

| Smoke | Asserção | Forma | Classe | Afetado por |
|---|---|---|---|---|
| `p42_notif_revisao_smoke.sql:181` | `v_aceitos <> 6` iterando lista literal de 6 eventos | lista literal | **fotografia** (não reprova — não vigia o evento novo) | todo `evento` novo |
| `p43_guard_marketing_smoke.sql:344` | idem, 6 eventos | lista literal | **fotografia** | idem |
| `p43_guard_marketing_smoke.sql:738` | `count(classe_evento_notificacao) <> 7` | contagem × constante | **fotografia — já reprova hoje** (PROD tem **8** classes) | toda classe nova |
| `p43_guard_marketing_smoke.sql:616` | triggers em `notificacoes_enviadas` `<> 2` | contagem | escopo deliberado (nenhum trigger novo previsto ali) | — |
| `p37_fidelidade_schema_smoke.sql:155,225` | CHECK de evento com 4 valores; 16/18 colunas | literal/contagem | **fotografia — já reprova hoje** (PROD: 8 eventos, 20 colunas) | CHECK novo |
| `p39_rewire_triggers_smoke.sql:189` | `trg_notif_*` `<> 3` | contagem | **fotografia — já reprova hoje** (PROD tem **6**) | — |
| `p42_invent05_cron_smoke.sql:182-206` (a.iii) | nenhum `jobname` além dos 4 conhecidos | allowlist fechada de jobs | **escopo deliberado** (detecta job intruso) — **vai reprovar o cron novo até ser atualizado na mesma entrega** | cron do prazo de reabertura |
| `p46_purga_smoke.sql:2330-2340` | os 3 jobs herdados existem (NOT EXISTS) | pertencimento | escopo deliberado; não reprova job novo | — |
| `p41_recon_retry_smoke.sql:234` | `notif-retry-sweep` existe 1 vez | contagem de 1 objeto nomeado | escopo deliberado | mudança em `varrer_retry_notificacoes` (exclusão de evento RH) — conferir se o smoke pina o corpo |
| `p42_revisao_art20_smoke.sql` (h.2, `:598`) | chama `responder_revisao_decisao(..., 'revertida', ...)` numa fixture | comportamento | **vai mudar de efeito**: com JORN-19 o veredito passa a **mutar `candidaturas`** e gravar histórico; o teardown (`:138-153`) só apaga `decisao_final`/histórico da decisão. A fixture escolhe uma candidatura **real** de `candidato.funil@teste.com` sem decisão — precisa de etapa `rejeitado` e de teardown da candidatura/histórico, ou a asserção passa a deixar resíduo | JORN-19 |
| `p45_motor_exclusao_smoke.sql` (C6, fixtures `:853`, `:2238`) | espera encerramento de `triagem/rejeitado` | comportamento | **codifica o Defeito 26** — vai reprovar o conserto correto | JORN-26 |
| `oper31_rejeitar_candidatura_smokes.sql:224` | exatamente 1 linha de histórico por rejeição | contagem de efeito | escopo deliberado; segue válido com `feedback_rejeicao` | JORN-22 |
| `seg33_agendamento_smokes.sql` | RLS de agendamento; insere/atualiza linhas | comportamento | conferir se a fixture insere `online` sem URL — se sim, a validação nova reprova a fixture | JORN-D5 |

⚠ **Três smokes já estão vermelhos contra PROD hoje** (p37, p39, p43 y2) por fotografia envelhecida — não é regressão desta fase; o planejador deve decidir se converte para baseline (D-17) ou só registra, **antes** de usar qualquer um deles como portão.

---

## J. Segurança / ameaças

- **Grants:** `pg_default_acl` de `public` concede `EXECUTE` a `anon`, `authenticated`, `service_role` em toda função nova [VERIFIED]. `CREATE OR REPLACE` preserva os grants atuais: hoje `rejeitar_candidatura`, `registrar_decisao`, `solicitar_revisao_decisao`, `explicacao_rejeicao_automatica` têm `anon` EXECUTE=true (guardados por dentro); `responder_revisao_decisao`, `retirar_candidatura`, `*_pedido_exclusao` têm `anon`=false; `varrer_retry_notificacoes` sem `anon`/`authenticated` [VERIFIED]. Toda função nova (`candidatura_encerrada`, `varrer_prazos_reabertura`, RPC de explicação tri-estado) precisa de `REVOKE` explícito conforme o papel.
- ⚠ **Guard fail-open latente em `registrar_decisao`:** `IF v_role NOT IN ('rh','administrador')` com `v_role` NULL avalia NULL e **não** levanta; a chamada sem JWT só falha depois, por acaso, no `NOT NULL` de `por_usuario`. É a classe do «NOT IN falha aberto» (42-06). Como JORN-19 redefine a função, corrigir para `coalesce(v_role,'') NOT IN (...)` [VERIFIED: pg_get_functiondef].
- `registrar_decisao` **não tem guard de estado**: decide sobre knockout, sobre `finalizado`, sobre qualquer etapa. Com o predicado canônico disponível, vale ao menos recusar decisão sobre knockout (JORN-26 espírito) — decisão do planejador.
- **Revisor ≠ decisor** fica no ato de responder (já está). Reabrir dentro de `responder_revisao_decisao` herda esse guard.
- **Candidato não chama RPC do RH:** guards por `app_metadata.role` (JWT assinado pelo hook) em todas; manter.
- **PII nos e-mails novos:** só nome, título da vaga, datas; nenhum dado de avaliação (grep-guard); nenhum `solicitacao_id`; nenhum literal do canal de privacidade; link por base URL validada (anti-link-quebrado/hostil, como `montarUrlFila`).
- **Log da instrumentação JORN-06:** só formato/comprimento/presença — nunca o valor (a EF de destino tem o segredo; um log com o Bearer vazaria a chave de serviço nos logs da plataforma).
- **Aviso ao titular é controle de segurança** (conta invadida): falha de envio não pode ser silenciosa.
- **Validação de URL do agendamento:** defesa em profundidade já existe na renderização (`isSafeHttpUrl`); a validação na escrita não substitui a da renderização.

### Applicable ASVS Categories (L1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não (sem mudança de login) | — |
| V3 Session Management | não | — |
| V4 Access Control | **sim** | guards de role/posse nas RPCs SECURITY DEFINER; `REVOKE` em funções novas; own-row na explicação |
| V5 Input Validation | **sim** | Zod no form + trigger no banco (`local_ou_link`); `char_length` ≥ 50; uuid no `historico_id` do corpo da EF |
| V6 Cryptography | não | comparação de segredo já é constant-time na guarda |
| V7 Error Handling & Logging | **sim** | logs por código, sem segredo nem PII (`logSeguro`) |
| V8 Data Protection | **sim** | allowlists de colunas; texto neutro em `feedback_rejeicao`; export allowlist versionada |

### Known Threat Patterns

| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Fail-open por `NOT IN` com NULL | Elevation | `coalesce(...) NOT IN` / `IS DISTINCT FROM` |
| Evento sem classe ou fora da exclusão de retry | DoS / Repudiation | 5 obrigações de D.1 na mesma entrega |
| Segredo em log de diagnóstico | Information disclosure | log só de formato/comprimento |
| Link `javascript:` em `local_ou_link` | Tampering | URL http(s) validada na escrita + `isSafeHttpUrl` na renderização |
| Oráculo de existência na RPC de explicação | Information disclosure | `false/null` cobre «não é sua» e «não se aplica» (padrão da `20260906000007`) |

---

## Architecture Patterns

### Fluxo de dados (depois da fase)

```
RH clica Rejeitar (triagem) ──► rejeitar_candidatura
      guard: NOT candidatura_encerrada(etapa,status)          (D3)
      UPDATE etapa='rejeitado', status='rejeitado', motivo, etapa_justificativa, feedback_rejeicao=<neutro>
            └► avancar_etapa ► historico(id=H) ► trg_notif_transicao ► body{evento:'decisao', candidatura_id, historico_id:H}
                                                                    └► notificar-candidato: chave {cand}:decisao:{H}
                                                                        desfecho = historico(H).etapa_para
Candidato ► painel: cartão (feedback_rejeicao) ► /candidato/explicacao/:id
      decisao_final? não ► RPC tri-estado ► 'humana_triagem' ► página com razão humana neutra

Revisor responde 'revertida' ► responder_revisao_decisao (1 transação)
      UPDATE decisao_final (veredito + reaberta_em + prazo)     ► snapshot (1)
      UPDATE candidaturas etapa='decisao_final', status='em_analise', justificativa própria, data_decisao_final=NULL
            └► historico (rejeitado→decisao_final) ► sem despacho
      trg_notif_revisao_respondida ► notificar-candidato (chave com ciclo) ► «reaberta… até DD/MM»
cron diário ► varrer_prazos_reabertura ► notificar-rh 'prazo_reabertura_vencido' (só alerta)
RH redecide ► registrar_decisao (upsert) ► snapshot arquiva ciclo ► zera ciclo ► historico(H2) ► 'decisao' {cand}:decisao:{H2}

Inscrição com knockout ► INSERT (aguardando) ► trg_candidatura_analise ► (pós-COMMIT) EF lê status='rejeitado'+ko ► skip
Titular pede/cancela exclusão ► executar-direito-titular ► RPC ► e-mail ao titular ► aviso_*_enviado_em
```

### Recommended structure (onde cada peça mora)

```
supabase/migrations/2026092xxxxxxx_*.sql     # uma por conserto; sem BEGIN/COMMIT; aplicar via p46apply.cjs
supabase/functions/_shared/email-config.ts   # base URL do app (mover APP_BASE_URL_PADRAO + validação para cá)
supabase/functions/_shared/email-templates.ts# confirmação (D-09), link U2 por parâmetro, cópia revertida
supabase/functions/notificar-candidato/      # historico_id → chave; desfecho do histórico; prazo na revisão
supabase/functions/notificar-rh/             # evento novo do prazo
supabase/functions/analise-candidato-individual/ # skip knockout
supabase/functions/executar-direito-titular/ # aviso ao titular (pedir/cancelar)
supabase/functions/submit-bigfive-final/ + gerar-devolutiva-bigfive/  # diagnóstico → conserto
src/features/<dominio>/utils/candidaturaEncerrada.ts   # espelho TS do predicado (ou em funil/)
src/features/explicacao/                     # origem 'humana_triagem'; cópia revertida
src/features/hub-candidato/components/HubCandidatoRH.tsx # ações só se não encerrada
src/features/agendamento/{schemas,utils}/    # Zod + isSafeHttpUrl compartilhado
```

### Anti-Patterns to Avoid
- **Guardar estado de knockout no trigger AFTER INSERT** — o INSERT nasce `aguardando_resposta`; a guarda vai na EF.
- **Reusar `recibo_enviado_em` para o aviso do pedido** — mata o recibo final.
- **`CHECK NOT VALID` para linha legada que ainda sofre UPDATE** — o CHECK volta a valer no próximo UPDATE de qualquer coluna.
- **Link de login no `layoutBase` comum** — vaza para e-mails do RH e para o recibo pós-exclusão.
- **Evento novo sem as 5 obrigações** (CHECK, classe, vocabulário, exclusão de retry, smokes).
- **Nova constante em smoke** — converter para baseline da própria execução (D-17).
- **Editar migration antiga** para «corrigir» o predicado — migrations são histórico (e `statements[1]` é conferido por md5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotência de e-mail | lógica ad hoc de «já mandei?» | claim `upsert(onConflict:'dedupe_key', ignoreDuplicates)` + `Idempotency-Key` do Resend (padrão `notificar-candidato`) | já resolve corrida e retry |
| Retry de e-mail | loop na EF | `notif-retry-sweep` (pg_cron) + branch `retry_id` | cap 5 + backoff já testados |
| Validação de URL | regex própria | `new URL()` + checagem de protocolo (`isSafeHttpUrl`) | regex de URL erra borda |
| Base URL de link em e-mail | string literal nova | `APP_BASE_URL` + default + `montarUrlFila` | fail-safe para env malformada |
| Anti-open-redirect | checagem nova | `resolveRedirect` | já cobre `//`, `/\`, controle |
| Envio ao titular | nova infra | mecânica de `enviarRecibo` (modo, sink de teste, chave do Vault) | modo teste e guard non-prod prontos |
| Varredura agendada | EF com setInterval | função SQL + `cron.schedule` + `net.http_post` | padrão de `varrer_retry_notificacoes` |
| Predicado de «encerrada» | `NOT IN` espalhado | uma função SQL + um helper TS | a varredura achou 6 cópias divergentes |

**Key insight:** todos os consertos desta fase têm molde vivo no repositório; o risco não é técnico, é esquecer um dos pontos de registro (CHECK/classe/vocabulário/retry/smoke/export) — cada um falha em silêncio.

## Runtime State Inventory

Não é fase de rename, mas há estado de runtime que muda de significado:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `notificacoes_enviadas.dedupe_key` no formato `{cand}:decisao` (6 linhas `decisao`) | nenhuma migração — chaves novas têm sufixo e não colidem |
| Stored data | 2 `encerrada_a_pedido_em` erradas (knockout); 1 rejeição sem `feedback_rejeicao`; 3 análises pós-knockout | checkpoint para os dois primeiros (D-18); o terceiro autorizado por D-02 |
| Live service config | segredos das EFs: `NOTIFICACOES_MODO=producao`; `APP_BASE_URL` **ausente** (default usado); `NOTIFICAR_SECRET`, `ANALISE_SECRET` presentes | nenhuma, a menos que se queira `APP_BASE_URL` explícito |
| OS-registered state | pg_cron: `ai-cost-aggregation`, `notif-retry-sweep`, `ai-logs-retention-cleanup`, `purga-retencao-sweep` | +1 job (prazo de reabertura) → atualizar `p42_invent05_cron_smoke` (a.iii) |
| Secrets/env vars | chave de serviço das EFs é `sb_secret_`; legado desligado | não mudar; o conserto JORN-06 passa o Bearer explicitamente |
| Build artifacts | `database.types.ts` | regenerar após colunas/funções novas (`< /dev/null`) |

## Common Pitfalls

### Pitfall 1: O e-mail que «não sai» sem erro
**What goes wrong:** claim colide (`ignoreDuplicates`) → 200 `skipped:"duplicate"`, sem linha nova.
**Why:** chave sem discriminador.
**How to avoid:** chave por `historico_id`; em toda verificação, procurar a linha **nova** em `notificacoes_enviadas` com a chave nova.
**Warning signs:** log `skipped: "duplicate"` na EF.

### Pitfall 2: Guarda no trigger AFTER INSERT de `candidaturas`
**What goes wrong:** nunca vê o knockout.
**How to avoid:** guarda na EF, lendo o estado pós-COMMIT.

### Pitfall 3: Evento do RH re-postado na EF do candidato para sempre
**What goes wrong:** `varrer_retry_notificacoes` usa denylist de eventos; evento novo de RH entra no loop de 15 min.
**How to avoid:** acrescentar a exclusão na mesma migration do evento.

### Pitfall 4: Regressão de etapa com justificativa residual
**What goes wrong:** `rejeitado → decisao_final` passa usando o texto velho (Defeito 17).
**How to avoid:** a reabertura escreve `etapa_justificativa` própria no mesmo UPDATE.

### Pitfall 5: Ciclo de revisão herdado pela nova decisão
**What goes wrong:** a nova rejeição mostra «revertida» e bloqueia novo pedido de revisão.
**How to avoid:** arquivar e zerar o ciclo na redecisão (Desenho A, passo 3).

### Pitfall 6: Smoke que reprova o conserto correto
**What goes wrong:** p45 (C6) espera o Defeito 26; p42 (h.2) passa a mutar candidatura real.
**How to avoid:** atualizar os smokes **no mesmo plano** do conserto, provando que ainda mordem.

### Pitfall 7: Deploy da EF antes da migration (ou front parado)
**What goes wrong:** EF que espera `historico_id` recebe body antigo (ou o inverso); front no disco com migration no ar.
**How to avoid:** EF tolerante à ausência do campo (chave legada); ordem `migration → EF → cliente`; `git log origin/main..HEAD` vazio.

### Pitfall 8: Promessa nova que o sistema não cumpre
**What goes wrong:** «avisaremos quando houver algo para você fazer» × `liberar_cognitivo` sem e-mail; «3 dias úteis» × prazo de 10 dias.
**How to avoid:** checar cada ação pedida ao candidato antes de publicar o texto (D-09: publicar por último).

## Code Examples

### Chave de dedupe com discriminador (padrão já existente no reagendamento)
```ts
// Source: supabase/functions/notificar-candidato/helpers.ts:78-93 (padrão vivo)
export function montarDedupeKey(e: EventoLedger, candidaturaId: string, agendamentoId?: string, versao?: string): string {
  if (e === "convite") { /* ... */ return versao ? `${agendamentoId}:convite:${versao}` : `${agendamentoId}:convite`; }
  // proposta: decisao → `${candidaturaId}:decisao:${historicoId}` quando o trigger mandar historico_id
  return `${candidaturaId}:${e}`;
}
```

### Survivor-guard pós-COMMIT (molde para JORN-24)
```ts
// Source: supabase/functions/notificar-candidato/index.ts:196-213
if (evento === "confirmacao" && (candidatura.status === "rejeitado" || candidatura.opcao_knockout_id !== null)) {
  console.log("[notificar-candidato]", logSeguro({ evento, candidatura_id, skipped: "knockout" }));
  return jsonResponse({ ok: true, skipped: "knockout" }, 200);
}
```

### Despacho por trigger (molde para o historico_id e para a varredura do prazo)
```sql
-- Source: pg_get_functiondef(public.trg_notif_transicao) — definição viva
PERFORM net.http_post(
  url := v_project_url || '/functions/v1/notificar-candidato',
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_invoke_key),
  body := jsonb_build_object('evento', v_evento, 'candidatura_id', NEW.candidatura_id)  -- + 'historico_id', NEW.id
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chaves legadas JWT (`anon`/`service_role`) | `sb_publishable_` / `sb_secret_`; legado desligado neste projeto | antes de 2026-09-20 (data exata não medida) | supabase-js recente **não** manda `sb_secret_` como Bearer em `functions.invoke` sem sessão (`omitApiKeyAsBearer`) — causa provável do JORN-06 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A requisição interna à devolutiva chegou **sem** header `Authorization` (e não com um valor diferente) | G | baixo — a instrumentação decide; os dois consertos candidatos mandam o Bearer certo em qualquer caso |
| A2 | A quebra da devolutiva começou na introdução da guarda (2026-07-07) | G | nenhum para o conserto; só para a narrativa |
| A3 | «10 dias corridos» = data em `America/Sao_Paulo` + 10, vencendo no fim do dia | E | médio — divergência de 1 dia entre e-mail e alerta; confirmar com o operador |
| A4 | Zerar `data_decisao_final` na reabertura é desejado (cartão some até nova decisão) | E | médio — alternativa é manter o cartão apontando para a decisão revertida |
| A5 | `em_espera` não conta como «nova decisão» para o alerta de prazo | E | médio — decisão do operador |
| A6 | A marca de D-02 deve entrar na cópia LGPD do titular | F | baixo/médio — muda o `versao_allowlist` |
| A7 | As 4 linhas `finalizado` em etapa de trabalho são legado/semente (sem histórico) | A | baixo — o predicado as trata como encerradas de qualquer forma |
| A8 | Texto neutro sugerido para a rejeição humana | B | baixo — discrição do Claude, revisável |

## Open Questions (RESOLVED)

> Todas fechadas em 2026-09-21 — pelas decisões pós-pesquisa do operador (`48-CONTEXT.md` D-20..D-23) ou por checkpoint de plano. A resolução de cada uma está na linha `RESOLVED` logo abaixo dela.

1. **JORN-22 — o que a página de explicação diz para a rejeição na triagem, e se oferece revisão** (BLOQUEANTE, operador). O que sabemos: sem mudança, o cartão leva a «Esta página não está disponível». Recomendação: `checkpoint:decision` no primeiro plano de JORN-22; opção mínima = explicação humana neutra + canal, sem revisão.
   - **RESOLVED** por **D-20**: explicação + canal, sem pedido de revisão. Implementado em `48-09`.
2. **JORN-27 — onde registrar o aviso ao titular** (BLOQUEANTE, operador, D-14). A letra do requisito manda escrever `recibo_enviado_em`, o que suprimiria o recibo final. Recomendação: colunas próprias (`aviso_pedido_enviado_em`, `aviso_cancelamento_enviado_em`) e ajustar o texto do requisito.
   - **RESOLVED**: colunas próprias `aviso_*`, fora de `recibo_enviado_em` (correção de fato registrada na CONTEXT; requisito JORN-27 reescrito). Implementado em `48-07`.
3. **D5 da varredura — a purga nunca alcança o knockout.** Consertar nesta fase ou registrar como retenção declarada? Recomendação: registrar (mecanismo destrutivo, `p46_purga_smoke` pesado, flip `dry_run→live` pendente).
   - **RESOLVED** por **D-21**: a purga fica registrada em Deferred, não consertada; `48-01` falha se `candidaturas_alem_da_janela` for redefinida.
4. **D-09 × `liberar_cognitivo` e `em_espera` sem aviso.** Acrescentar avisos, ou calibrar o texto? Recomendação: perguntar ao operador antes de publicar a cópia de D-09 (que é a última task por dependência).
   - **RESOLVED** por **D-22**: a liberação cognitiva passa a avisar (`48-10`); `em_espera` não é decisão comunicada e segue sem aviso.
5. **Decisor original pode redecidir após reabertura?** Hoje nada impede.
   - **RESOLVED** por **D-23**: quem teve a decisão revertida **não** registra a nova decisão daquele caso — bloqueio duro server-side em `registrar_decisao` (`48-11`); qualquer outro RH/admin decide.
6. **Correção retroativa** das 2 marcas de encerramento e do `feedback_rejeicao` da Marina — ambos contas de teste; checkpoint com contagem (2 e 1).
   - **RESOLVED**: `checkpoint:decision` do operador na execução, com contagem (2 e 1) — `48-12`.
7. **Smokes já vermelhos (p37, p39, p43 y2)** — converter para baseline nesta fase ou só registrar?
   - **RESOLVED** por **D-17**: os que esta fase toca viram baseline com prova de que ainda mordem (`48-06`); os não tocados (ex.: `p39`) ficam registrados em Deferred.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, vitest, p46apply | ✓ | v24.18.0 | — |
| Deno | testes das EFs | ✓ | 2.9.4 | — |
| Supabase Management API (token no Keychain) | apply, logs, metadata de EF | ✓ | token `sbp_…` (44 chars) | — |
| `p46apply.cjs` | migrations/smokes/SQL | ✓ | — | contrato no CLAUDE.md |
| Deploy de EF | `efdeploy.cjs` na raiz (não inspecionado nesta pesquisa) | ✓ (arquivo existe) | — | `supabase functions deploy` |
| Logs da plataforma | prova do JORN-06 | ✓ | retenção ≈ 1 dia | ler no mesmo dia |
| `timeout` (coreutils) | — | ✗ | — | não usar em comandos |

**Missing dependencies with no fallback:** nenhuma.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (front) | Vitest (`vite.config.ts` → `test`, happy-dom, `tests/setup.ts`; inclui `**/__tests__/**/*.{test,spec}.{ts,tsx}`; exclui `supabase/functions/**` exceto `strict-schema.test.ts`) |
| Framework (EFs) | `deno test` — chamam `handler(req, deps)` direto e **não** exercitam o wiring de `Deno.serve` (onde morava o Defeito 5 e onde mora o `functions.invoke` do JORN-06) |
| SQL | smokes em `supabase/tests/*.sql` via `node p46apply.cjs run supabase/tests/<arquivo>.sql` (escrevem em PROD com fixture/rollback — rodar é escrita) |
| Quick run | `npx vitest run <pasta>` · `deno test --allow-all supabase/functions/<ef>/` |
| Full suite | `npm run test:run` · `deno test --allow-all supabase/functions/` · `npm run lint` (tsc ≤ 90) |
| Baseline medida hoje | vitest nas pastas tocadas: 22 arquivos / 223 testes verdes; deno (5 EFs tocadas): 156 verdes; deno `notificar-candidato` + `email-templates`: 53 verdes; tsc: **90** |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | Verificação em PROD (D-19) — resultado esperado |
|--------|----------|-----------|-------------------|-------------|
| JORN-26 | predicado canônico; exclusão não marca knockout | unit (TS helper) + smoke SQL | `npx vitest run src/<helper>` · smoke novo/atualizado (p45 C6 refeito) | `select count(*) from candidaturas where encerrada_a_pedido_em is not null and not (etapa_atual not in ('aprovado','rejeitado') and status not in ('rejeitado','finalizado')) and encerrada_a_pedido_em > '<deploy>'` → **0**; `select count(*) from v_fila_trabalho where status in ('rejeitado','finalizado')` → **0** |
| JORN-22 | rejeição grava texto neutro; explicação alcançável | smoke SQL (RPC) + vitest (`explicacaoService`, página) | `npx vitest run src/features/explicacao` | após rejeitar conta de teste na triagem: `select feedback_rejeicao is not null, data_decisao_final is null from candidaturas where id=<id>` → `true,true`; RPC de explicação com JWT da candidata → `'humana_triagem'` |
| JORN-18 | 2ª decisão gera linha nova | deno (`montarDedupeKey`, handler com `historico_id`) | `deno test --allow-all supabase/functions/notificar-candidato/` | `select dedupe_key, status from notificacoes_enviadas where candidatura_id=<id> and evento='decisao' order by criado_em` → **2 linhas**, chaves distintas `…:decisao:<uuid>`, ambas `entregue` |
| JORN-20 | rejeição na triagem avisa | coberto por JORN-18 + integração | idem | conta de teste **sem** `decisao` anterior, rejeitada na triagem: 1 linha `decisao` nova `entregue`; log da EF sem `skipped` |
| JORN-15 | confirmação sem «a cada etapa» | deno (`email-templates.test.ts`: ausência da frase + presença da nova) | `deno test --allow-all supabase/functions/_shared/__tests__/email-templates.test.ts` | nova inscrição de teste: e-mail recebido (conferência humana do texto) + linha `confirmacao` `entregue` |
| JORN-U2 | link em todo e-mail de candidato | deno: cada `renderarEmail(evento)` contém `https://rh.beautysmile.com.br/auth/login`; RH e recibo **não** contêm | idem | `grep` do HTML num envio real de teste (Resend sink) |
| JORN-27 | aviso ao titular no pedido/cancelamento | deno (`executar-direito-titular` handler com `fetchImpl` mock: 1 POST ao Resend por ação; falha não desfaz pedido) | `deno test --allow-all supabase/functions/executar-direito-titular/` | `select aviso_pedido_enviado_em is not null, aviso_cancelamento_enviado_em is not null, recibo_enviado_em is null from solicitacoes_dados where id=<id>` → `true,true,true` |
| JORN-24 | knockout não analisa; 3 marcadas | deno (handler: `callAi` não chamado, sem upsert) | `deno test --allow-all supabase/functions/analise-candidato-individual/` | nova inscrição de teste com knockout: `select count(*) from analise_candidato_vaga where candidatura_id=<id>` → **0**; `select count(*) from ai_call_logs where created_at > <t> and candidato_id=<cand>` → **0**; D-02: `select count(*) from analise_candidato_vaga where descartada_motivo='knockout_automatico'` → **3** |
| JORN-06 | causa provada; devolutiva gerada | deno (handler de `submit-bigfive-final` com invoke mock recebe `Authorization`) — ⚠ não cobre `Deno.serve` | `deno test --allow-all supabase/functions/submit-bigfive-final/ supabase/functions/gerar-devolutiva-bigfive/` | (1) log `diag-auth` do submit de prova com os campos previstos por H1; (2) depois do conserto: `select count(*) from devolutivas_candidato where candidatura_id=<id>` → **1**, e edge log `gerar-devolutiva-bigfive` 200 |
| JORN-19 | reabrir, prazo, e-mail, alerta | smoke SQL (responder `revertida` → etapa/status/histórico; guard decisor; redecisão arquiva ciclo) + deno (cópia com data) + vitest (página, dialog) | `node p46apply.cjs run supabase/tests/<p48_reabertura_smoke>.sql` | após responder `revertida` com RH2/RH3: `etapa_atual='decisao_final'`, `status='em_analise'`, `prazo_nova_decisao_em ≈ now()+10d`, 1 linha nova em `historico_candidatura` `rejeitado→decisao_final` com `criterio_texto` próprio; linha `revisao_respondida` nova `entregue`; depois da redecisão: 2ª linha `decisao` com chave nova e `revisao_veredito IS NULL` na linha vigente |
| JORN-D5 | link obrigatório/validado | vitest (Zod: online exige http(s), presencial aceita endereço, vazio recusado) + smoke SQL (trigger) | `npx vitest run src/features/agendamento` | tentativa de INSERT `online` com `dddd` → erro; `update ... set status='cancelada'` na linha legada `dddd` → **aceito** |

### Sampling Rate
- **Por commit de task:** vitest da pasta + deno da EF tocada + `npm run lint` (≤ 90).
- **Por wave:** `npm run test:run` + `deno test --allow-all supabase/functions/`.
- **Portão da fase:** suítes verdes + consultas de PROD acima com o resultado esperado, antes de `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] smoke SQL novo para o predicado canônico (enumerar o enum por `pg_enum` na própria execução — baseline, não constante)
- [ ] smoke SQL de reabertura (JORN-19) com fixture própria e teardown da candidatura/histórico
- [ ] refazer fixture de `p45_motor_exclusao_smoke.sql` (C6) e ajustar `p42_revisao_art20_smoke.sql` (h.2)
- [ ] atualizar `p42_invent05_cron_smoke.sql` (a.iii) junto com o cron novo
- [ ] testes deno: `montarDedupeKey` com `historico_id`; skip de knockout; aviso ao titular; invoke com `Authorization`
- [ ] (decisão) converter p37/p39/p43-y2 para baseline ou registrar como fotografias vermelhas

## L. Ordem e dependências

**Sequências obrigatórias `migration → EF → cliente`** (o passo seguinte tem de estar num plano desta fase — D-18):

| Cadeia | Ordem | Dono |
|---|---|---|
| JORN-18 | migration (`trg_notif_transicao` passa `historico_id`; triggers de revisão passam ciclo) → EFs `notificar-candidato`/`notificar-rh` (usam o campo; **toleram ausência**) | executor; EF pode ir antes se tolerante — preferir EF primeiro (tolerante) e migration depois, para nunca haver body com campo que a EF rejeite |
| JORN-19 | migration (colunas, `responder_revisao_decisao`, `registrar_decisao`, snapshot, varredura + cron, CHECK/classe/exclusão de retry) → EFs (`notificar-candidato` cópia+prazo, `notificar-rh` evento) → front (página, dialog, linha de prazo) → push `main` | executor; ⚠ **depende de JORN-18** (chaves do ciclo) |
| JORN-22 | migration (`rejeitar_candidatura` + RPC tri-estado) → front (`explicacaoService` + página) → push | executor, após `checkpoint:decision` |
| JORN-26 | migration (função canônica; D1/D2/D3/D4) → front (hub) → push | executor; D3 **antes** de publicar JORN-18 |
| JORN-27 | migration (colunas) → EF `executar-direito-titular` | executor, após confirmação do operador |
| JORN-24 | EF (skip) → migration (coluna de marca) → UPDATE retroativo (3, autorizado) → export/PII | executor |
| JORN-06 | EF instrumentação (deploy) → submit de prova (operador) → leitura de logs no mesmo dia → EF conserto → geração retroativa (1) | executor + operador |
| JORN-D5 | front (Zod) e migration (trigger) independentes | executor |
| JORN-15/U2 | EF templates → **por último** | executor |

**Waves propostas:**

- **Wave 0 (sem escrita de produto):** atualizar/criar smokes e testes (Wave 0 Gaps); diagnóstico JORN-06 (instrumentação é deploy aditivo); **checkpoints de decisão** (Open Questions 1–4).
- **Wave 1 (paralelo):** JORN-26 (predicado canônico + D1–D4 + hub) · JORN-24 (skip + marca) · JORN-D5 · JORN-06 (conserto, depois da prova).
- **Wave 2:** JORN-18 (chaves) — depende de D3 (Wave 1) para não re-notificar knockout · JORN-22 (depende da decisão 1; usa o predicado) · JORN-27 (depende da decisão 2).
- **Wave 3:** JORN-19 (depende de JORN-18) · JORN-20 (verificação em PROD, depende de JORN-18).
- **Wave 4:** JORN-15 + JORN-U2 (publicar o texto novo só quando a promessa for verdade — D-09) · verificação final em PROD.

## Sources

### Primary (HIGH confidence)
- PROD só-leitura via `node p46apply.cjs sql "SET TRANSACTION READ ONLY; …"`: `pg_get_functiondef` de 25 funções, `pg_trigger`, `pg_constraint`, `pg_views`, `pg_policies`, `pg_enum`, `pg_default_acl`, `cron.job`, contagens das tabelas citadas.
- Management API (GET): `/v1/projects/{ref}/functions` (versão, `verify_jwt`), `/functions/{slug}/body` (bundles deployados), `/analytics/endpoints/logs.all` (`function_edge_logs`, `function_logs` de 2026-09-20), `/secrets` (só nomes; digest SHA-256 usado para identificar `NOTIFICACOES_MODO`), `/api-keys/legacy`.
- Código do repositório (arquivos e linhas citados em cada seção); `supabase/functions/deno.lock`.
- Bundle `https://esm.sh/@supabase/supabase-js@2.110.9/denonext/supabase-js.mjs` (código de `fetchWithAuth`/`functionsFetch`).

### Secondary (MEDIUM confidence)
- GitHub supabase/supabase issue #37648 e discussão #29260 (variáveis de ambiente das EFs após migrar para chaves novas) — não conclusivas; a conclusão da seção G vem dos logs e do bundle, não delas.

### Tertiary (LOW confidence)
- nenhuma usada como base de recomendação.

## Metadata

**Confidence breakdown:**
- Varredura / defeitos vivos: HIGH — definições vivas e contagens medidas.
- JORN-06 causa: HIGH que é a guarda e que o Bearer não vem; MEDIUM-HIGH que é ausência (não valor diferente) — fecha com 1 submit instrumentado.
- JORN-19 desenho: MEDIUM — desenho recomendado sobre fatos verificados; escolhas de produto em aberto (A3–A5).
- JORN-27 desenho: MEDIUM — depende de confirmação do operador.
- Pitfalls: HIGH — cada um tem precedente medido no repositório.

**Research date:** 2026-09-21
**Valid until:** 2026-09-28 (PROD muda a cada apply; logs expiram em ~1 dia)
