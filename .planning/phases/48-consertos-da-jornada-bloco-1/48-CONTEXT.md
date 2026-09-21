# Phase 48: Consertos da Jornada — Bloco 1 - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning
**Mode:** Express — decisões vindas de `.planning/JORNADA-GUIADA.md` (operador, 2026-09-21) + duas
decisões tomadas no kickoff desta fase (D-09, D-10). **Não houve discuss-phase, de propósito:** as
decisões já estavam tomadas e o operador proibiu reabri-las.

<domain>
## Phase Boundary

O que a validação manual de 13 etapas em PROD (2026-09-19..21, **medida no banco, não na tela**)
achou ferindo candidato **agora**, em produção, no caminho mais comum do funil.

**Entra na fase — exatamente estes 11 itens:**

| ID | Defeito (número = linha da tabela «Defeitos — acumulado» da JORNADA) |
|---|---|
| JORN-22 | Art. 20 inalcançável para quem é rejeitado na triagem |
| JORN-26 | Pedido de exclusão marca «encerrada a pedido» candidatura que o knockout eliminou |
| JORN-20 | Rejeitar na triagem não avisa o candidato |
| JORN-27 | Titular não é avisada de pedido/cancelamento de exclusão |
| JORN-18 | 2ª decisão não gera aviso — `dedupe_key = <candidatura>:decisao` |
| JORN-15 | «Avisaremos por e-mail a cada etapa» — avisa em 1 de 4 |
| JORN-U2 | E-mail transacional sem link para o login do candidato (subiu do Bloco 4 por D-09) |
| JORN-24 | IA analisa quem o knockout já eliminou (US$ 0,045 cada) |
| JORN-06 | Devolutiva do Big Five 401 desde 2026-07-07 — **causa NÃO provada** |
| JORN-19 | «Revertida» não reverte nada |
| JORN-D5 | `local_ou_link` obrigatório e validado na escrita |

**NÃO entra:** Blocos 2, 3 e 4 da fila de consertos (`JORNADA-GUIADA.md` §«FILA DE CONSERTOS»).
Em particular, e porque tocam o mesmo código: o **17** (justificativa gruda), o **3b** (ler a
explicação versiona a decisão), o **25** (comparativo ranqueia rejeitados), o **28** (troca
silenciosa de modelo) e o **PP-16** (`lgpd@` → `rh@`) **ficam de fora**. Onde um conserto deste
bloco esbarra num deles, o plano **contorna sem consertar** e registra o contato (ver §Integração).

**Estado de PROD na abertura (medido em 2026-09-21, não presumido):** 42 candidatos, 32
candidaturas reais. O único write de código da validação foi `submit-bigfive-final` **v11**
(conserto do preflight CORS, Defeito 5). `tsc` com baseline congelada em **96** e hoje em **90**.

</domain>

<decisions>
## Implementation Decisions

### Decisões do operador (JORNADA-GUIADA.md §«DECISÕES TOMADAS», 2026-09-21) — NÃO reabrir

- **D-01:** **Reabrir, não reverter** (JORN-19). Veredito `revertida` devolve a candidatura a `decisao_final`, **aguardando nova decisão** — nunca a `aprovado`. «Reverter» significa que a rejeição não se sustenta, não que o candidato foi aprovado; aprovar automaticamente seria o sistema decidindo o que nenhum humano decidiu. **Exige prazo** (valor em D-10) e **exige corrigir o e-mail**, que hoje diz «a decisão anterior foi revista» e passa a dizer «sua candidatura foi reaberta e será decidida novamente».
- **D-02:** **Marcar, não apagar** (JORN-24 parte b). Escopo: **só as análises geradas após knockout automático** — não as de quem pediu exclusão, nem as de não-contratados. Hoje é 1 candidatura (medir de novo no plano). Marcar (ex.: `finalidade='descartada_por_knockout'`) em vez de apagar: apagar é irreversível, o titular já recebeu essa análise numa cópia LGPD, e a marca deixa auditável que houve tratamento sem finalidade e que foi corrigido. O conserto principal segue sendo **parar de analisar após o knockout** (parte a).
- **D-03 [informational]:** `sessionStorage`, não banco, para o rascunho do formulário (Defeito 1 — Bloco 4). Não é desta fase.
- **D-04 [informational]:** análise da IA em append por etapa, exibindo a mais recente (Defeito 12 — Bloco 2). Não é desta fase.
- **D-05:** **Só a parte antecipada do D5 entra aqui** (JORN-D5): tornar o campo `local_ou_link` **obrigatório e validado na escrita**. `isSafeHttpUrl` já existe e já funcionou (impediu o `dddd` de virar link clicável em `AgendamentoCandidatoCard.tsx:210`); só não é exigido na escrita. O redesenho do agendamento (janelas + escolha do candidato + confirmação, PP-8) é fase própria, **depois** do Bloco 2 — fora daqui.
- **D-06 [informational]:** `ANALISE_HUB_ALLOWLIST` passa a mostrar `resumo_respostas` e segue escondendo `resumo_cv` (Bloco 3). Não é desta fase.
- **D-07 [informational]:** `rh@beautysmile.com.br` existe e é lido; a troca `lgpd@` → `rh@` (PP-16) tem escopo medido de 4 lugares e **não está no Bloco 1**. Consequência para esta fase: **nenhum texto novo pode introduzir uma quinta ocorrência literal** do endereço do canal de privacidade — se um e-mail novo precisar citar o canal, derive-o da mesma fonte que os outros usam ou não o cite, para que o PP-16 continue sendo troca em lugares contados.
- **D-08 [informational]:** avançar **não** exige evidência da etapa (Defeito 14). Nenhum conserto desta fase pode introduzir portão de evidência no avanço.

### Decisões tomadas no kickoff desta fase (operador, 2026-09-21)

- **D-09:** **Defeito 15 — mudar a promessa, não avisar em cada avanço** (JORN-15, JORN-U2). O texto do e-mail de confirmação passa a apontar para o painel, na linha de: «acompanhe no seu painel a qualquer momento; avisaremos quando houver algo para você fazer ou uma decisão». **Condição do operador, obrigatória:** o link para o login do candidato nos e-mails (U2) **sobe para este bloco** — senão a promessa aponta para um lugar inalcançável. Depois desta fase a promessa tem de ser **verdade**: todo desfecho avisa (JORN-20, JORN-18, e o knockout já avisa) e toda ação pedida ao candidato avisa (`avaliacao_liberada`, `convite`).
- **D-10:** **Prazo da reabertura = 10 dias corridos** (JORN-19). O e-mail ao candidato diz a data exata. Vencido o prazo sem nova decisão, **só alerta o RH** — nenhuma decisão automática, nem aprovar nem rejeitar (é a lógica da própria D-01).

### Decisões pós-pesquisa (operador, 2026-09-21, sobre os achados do `48-RESEARCH.md`)

- **D-20:** **Rejeição humana na triagem: explicação + canal, sem pedido de revisão** (JORN-22). A pesquisa provou que o cartão, uma vez visível, leva a «Esta página não está disponível» — a RPC `explicacao_rejeicao_automatica` devolve `true` só para knockout. A página passa a servir este caso com razão **neutra própria** («analisada por uma pessoa da nossa equipe», sem motivo nem critério) e o canal de contato, **sem** oferecer revisão — espelhando o knockout. Revisão para a triagem, se vier, é fluxo novo e fica fora desta fase.
- **D-21:** **Escopo da varredura D-11 = todas as instâncias não-destrutivas; a purga fica registrada, não consertada** (JORN-26). Um predicado canônico de «candidatura encerrada» (o critério certo já existe como `STATUS_TERMINAIS = {'rejeitado','finalizado'}` em `DashboardCandidatoPage.tsx:65`, com etapa **e** status) aplicado em: `registrar_pedido_exclusao` (Defeito 26), `retirar_candidatura`, a trava terminal de `rejeitar_candidatura` (**obrigatória** — sem ela, com o JORN-18 consertado, re-rejeitar um knockout manda um 2º e-mail de rejeição), a view `v_fila_trabalho`, os botões Avançar/Rejeitar do `HubCandidatoRH`, e o KPI do funil (`funil_kpis` + `CandidatosRHPage.tsx:258`). **Fora:** `candidaturas_alem_da_janela()` (a purga nunca alcança knockout) — mecanismo destrutivo com o flip `dry_run→live` pendente; registrar como retenção não declarada em Deferred, não tocar.
- **D-22:** **Liberar a avaliação cognitiva passa a avisar o candidato** (JORN-15). Medido: `liberar_cognitivo` não notifica. Para o texto de D-09 («avisaremos quando houver algo para você fazer») ser verdade, a liberação ganha e-mail, como `avaliacao_liberada`. `em_espera` **não** é decisão comunicada ao candidato e segue sem aviso.
- **D-23:** **Quem teve a decisão revertida não registra a nova decisão daquele caso** (JORN-19). Bloqueio duro, server-side, no mesmo espírito do «revisor ≠ decisor»: depois de uma reabertura, `registrar_decisao` recusa o `por_usuario` da decisão revertida. Qualquer outro RH/admin decide.

### Correções de fato trazidas pela pesquisa (medidas em PROD, só leitura, 2026-09-21)

Registradas aqui porque a CONTEXT acima e a JORNADA afirmavam o contrário. **Nenhuma muda uma decisão do operador; mudam o mecanismo.**

| Afirmação anterior | Fato medido | Consequência |
|---|---|---|
| «`rejeitar_candidatura` não dispara notificação nenhuma» (Defeito 20) | A rejeição **dispara** `decisao` pelo trigger de `historico_candidatura`; o log da EF (2026-09-20 16:03:25 UTC) mostra `skipped:"duplicate"` na chave `…:decisao` ocupada pela aprovação | **JORN-20 é o mecanismo do JORN-18.** Reusar o evento `decisao`; não criar evento novo. JORN-20 se prova com conta de teste que nunca teve `decisao` |
| «o backend cobre os 3 casos» (Defeito 22) | `explicacao_rejeicao_automatica` serve **só** knockout; a migration `20260906000007` lista o caso (b) para distingui-lo, não para servi-lo | JORN-22 inclui a página de explicação (D-20) |
| «`recibo_enviado_em` existe e não é escrito» (Defeito 27) | É o cinto do **recibo pós-exclusão** (`executar-direito-titular/index.ts` passo 4, `if (!estado.recibo_enviado_em)`); há 1 pedido concluído com ele preenchido | Escrevê-lo no pedido **suprimiria o recibo final**. O aviso ao titular ganha colunas próprias (ex.: `aviso_pedido_enviado_em`, `aviso_cancelamento_enviado_em`), **fora** de `notificacoes_enviadas` (que exige `candidatura_id`; 16/42 titulares não têm candidatura) |
| D-02 «hoje é 1 candidatura» | **3** análises pós-knockout, todas de contas de teste `+claude` | A marcação retroativa autorizada por D-02 é de 3 linhas (contagem antes/depois) |
| texto neutro do knockout em `20260608000001:197` | definição viva em `20260709000014:143` (`submit_candidatura_atomic`); mesmo texto | citar a viva |
| «redecidir só por reset manual» | `RegistrarDecisaoForm` + upsert de `registrar_decisao` **já** permitem redecidir pela UI | o Defeito 18 é alcançável em uso normal hoje; D-23 incide sobre esse caminho |
| 32 candidaturas | **33** | — |
| Defeito 6 «desde 2026-07-07» | só houve **2** envios de Big Five na história; a data é inferência | não muda o conserto; 1 devolutiva a gerar retroativamente |
| Defeito 6: causa desconhecida | **quase provada** (H1): a guarda no código recusa (log dela presente; `verify_jwt=false`); a chave do ambiente é `sb_secret_`; supabase-js 2.110.9 não põe `Authorization` para `sb_secret_` sem sessão | D-13 continua valendo: **uma** submissão de prova com instrumentação de formato, lida no mesmo dia (retenção de log ≈ 1 dia), antes do conserto |
| o mesmo defeito de chave só no evento `decisao` | as chaves do ciclo de revisão (`revisao_respondida`, `revisao_solicitada`) também são uma por candidatura | com a reabertura (D-01), uma 2ª revisão seria engolida — JORN-19 depende do conserto de chave estendido ao ciclo |
| `local_ou_link` é link | guarda **endereço** no presencial | URL obrigatória **só** em `tipo='online'`; validar por trigger que só age quando o link/tipo muda (um `CHECK NOT VALID` quebraria cancelar a linha legada `dddd`) |

### Restrições de execução impostas pelo operador para esta fase — NÃO negociáveis

- **D-11:** **Os Defeitos 22 e 26 são o MESMO erro** — código que usa `etapa_atual` para saber se a candidatura acabou (ou está em andamento), ignorando `status`. **Varrer pela FORMA antes de consertar os dois casos conhecidos**, como o `CLAUDE.md` manda fazer com portões («varra pela forma, não pelo sintoma»). Senão o terceiro aparece depois. A varredura tem de: (a) cobrir `src/`, `supabase/functions/` **e as definições VIVAS** das funções/views/triggers do banco (a migration mais recente de um objeto, ou `pg_get_functiondef` em PROD — não o histórico de migrations como se fosse código vivo); (b) sair como **artefato** com cada ocorrência classificada como *escopo deliberado* (ex.: o knockout preserva `etapa_atual='inscricao'` **por desenho**) ou *defeito*; (c) registrar o **padrão de busca** usado, para que possa ser re-rodado; (d) ser feita **antes** das tasks que consertam 22 e 26, e alimentá-las. Knockout mantém `etapa_atual='inscricao'` com `status='rejeitado'` por desenho — qualquer predicado de «acabou» que olhe só `etapa_atual` erra exatamente nesse caso.
- **D-12:** **O conserto do Defeito 22 já está escolhido e confirmado por experimento na Etapa 10 — não redecidir.** `rejeitar_candidatura` passa a gravar `feedback_rejeicao` com texto **neutro**, que é o que o knockout já faz (`20260608000001:197`). O front (`DashboardCandidatoPage.tsx:148-159`, condição `data_decisao_final OR feedback_rejeicao`) **não muda**. Alternativa **rejeitada**: mexer na condição do front — deixaria o candidato com cartão mas sem texto de feedback. O texto neutro **não** é a `etapa_justificativa` do RH nem revela o motivo.
- **D-13:** **O Defeito 6 NÃO tem causa provada** e é o único do bloco que precisa de **investigação antes de virar tarefa de conserto** — tratá-lo como conserto conhecido gera chute. O plano tem de ter, nesta ordem: (1) **medir a causa** — o QUÊ está provado (401 em `gerar-devolutiva-bigfive` no mesmo instante do 200 do `submit-bigfive-final`; guarda SEC-04 `guardDevolutivaBearer` criada em `595727da`, 2026-07-07; única devolutiva do banco é de 2026-06-30), o PORQUÊ não; (2) **só então** o conserto derivado da causa medida. As duas vias registradas na JORNADA: **instrumentar** (logar o PREFIXO/formato do Bearer recebido, **nunca o valor**) ou **trocar `supabaseAdmin.functions.invoke` por `fetch` explícito** com `Authorization: Bearer ${SERVICE_KEY}`. A segunda só é conserto se a medição mostrar que a causa é o que o `invoke` envia; aplicada às cegas é o chute que esta restrição proíbe. A investigação também tem de distinguir se o 401 vem do **gateway** (`verify_jwt` da função, antes de o código rodar) ou da **guarda no código** — são causas diferentes com consertos diferentes.
- **D-14:** **As decisões D-01..D-10 são do operador, não do executor.** Nenhum plano, task ou checkpoint as reabre. Se a execução achar que uma delas é inexequível como escrita, o executor **para e reporta** — não escolhe outra.

### Restrições de ambiente (CLAUDE.md + memória do projeto)

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

</decisions>

<code_context>
## Existing Code Insights

Pontos de entrada **citados pela JORNADA com linha** — o pesquisador confere cada um antes de o planejador confiar.

### Rejeição, Art. 20 e o eixo `etapa_atual` × `status` (JORN-22, JORN-26)
- `src/.../DashboardCandidatoPage.tsx:148-159` — `hasDecisaoFinal`: `houveDesfecho = etapasDecisao.includes(etapa) || status === 'rejeitado'` e depois `data_decisao_final || feedback_rejeicao`. **Não muda** (D-12).
- RPC `rejeitar_candidatura` — `supabase/migrations/20260714100001*`. Grava `motivo_rejeicao` + `etapa_justificativa`; não grava `feedback_rejeicao`; não despacha notificação.
- Knockout grava `feedback_rejeicao` neutro em `20260608000001:197`; notifica via `20260906000006_notifica_rejeicao_automatica.sql`.
- `20260906000007_explicacao_knockout.sql` — backend da explicação já cobre os 3 casos (decisão final, rejeição humana na triagem, knockout). A RPC lê a coluna sensível sem devolvê-la (allowlist restritiva é decisão de privacidade correta — ver memória «allowlist restritiva torna causas indistinguíveis»).
- Pedido de exclusão (`executar-direito-titular` / RPCs da Phase 45, `20260805000007_p45_retirada_e_evento.sql`) — o filtro de «em andamento» que marcou `encerrada_a_pedido_em` na candidatura do knockout (`etapa_atual='inscricao'`, `status='rejeitado'`) e **não** na rejeitada pelo RH (`etapa_atual='rejeitado'`). Também disparou `candidatura_encerrada_a_pedido_rh` para os 3 RH.
- **Referência provável de predicado terminal correto:** PURGA-07 (Phase 46) — «allowlist de estados terminais, nunca denylist de estados ativos», com `COALESCE` explícito. Conferir se é reusável.

### Notificações (JORN-20, JORN-27, JORN-18, JORN-15, JORN-U2, JORN-19)
- Ledger `notificacoes_enviadas` — CHECK de `evento` com lista literal (`confirmacao`, `avanco`, `convite`, `decisao`, `revisao_solicitada`, `revisao_respondida`, …); ver `20260730000004_p42_evento_revisao_respondida.sql:69-74` e `20260801000003_p43_guard_marketing.sql:111-121` para o padrão de ampliar o CHECK.
- Despacho por trigger → `net.http` → EF `notificar-candidato` / `notificar-rh`; `20260726000001_p39_rewire_triggers_aposenta_n8n.sql:78` (`v_evento := 'decisao'`, «auto-rejeição NÃO notifica» — depois mudado por `20260906000006`).
- `dedupe_key` `<candidatura_id>:decisao` — colisão da aprovação com a rejeição descartou o 2º aviso **sem erro e sem linha nova** (Etapa 8).
- `revisao_respondida` tem chave própria (`<candidatura>:revisao_respondida`) — o Art. 20 não é alcançado pelo Defeito 18.
- `templates_email` (3 linhas). O e-mail de confirmação contém «Avisaremos por e-mail a cada etapa».
- `solicitacoes_dados.recibo_enviado_em` — coluna existe e **não é escrita** no pedido de exclusão.
- Rota de login do candidato: conferir no `src/router/routes.tsx` (`/login` é 404; RH é `/auth/login-rh`). Host de PROD: `rh.beautysmile.com.br`.

### Reabertura (JORN-19)
- RPC de resposta à revisão (REVISAO-03, `20260730000001_p42_revisao_art20.sql`, D-P42-02): só grava `revisao_veredito`/`revisao_resultado`; `decisao_final` não tem policy de UPDATE (write-path é RPC `SECURITY DEFINER`).
- ⚠ **`UNIQUE (candidatura_id)` em `decisao_final`**: hoje redecidir só é alcançável por reset manual. Reabrir para uma **nova decisão** esbarra nessa constraint — o desenho tem de dizer como a nova decisão é registrada sem apagar a trilha anterior.
- ⚠ **Portão de regressão** `avancar_etapa()` (trigger): «Regressão de etapa exige justificativa preenchida» (P0001). `rejeitado → decisao_final` **é** regressão — a reabertura tem de fornecer justificativa própria (ex.: o texto do veredito), **não** depender do valor que sobrou em `etapa_justificativa` (Defeito 17, Bloco 2: a coluna gruda e desarma esse portão).
- `trg_decisao_final_snapshot` arquiva a cada UPDATE de `decisao_final` (Defeito 3b, Bloco 2) — uma redecisão real **deve** gerar snapshot; não consertar o 3b aqui.

### Análise de IA após knockout (JORN-24)
- `analise_candidato_vaga` criada 0,6 s após o knockout (`created_at`), 47 s de processamento, US$ 0,0445 em `ai_call_logs`. Achar o disparo (provável `submit-candidatura` → `analise-candidato-individual`, ou trigger).
- A cópia LGPD (`exportar-meus-dados`, `versao_allowlist` 1.1.0) entrega essa análise ao titular. Coluna nova em tabela inventariada pode acionar os portões de inventário PII/allowlist — conferir.

### Devolutiva Big Five (JORN-06)
- `supabase/functions/submit-bigfive-final/index.ts:241-258` — invoca `gerar-devolutiva-bigfive` inline com `supabaseAdmin.functions.invoke`, dentro de `try/catch` best-effort.
- `supabase/functions/gerar-devolutiva-bigfive/` — `guardDevolutivaBearer` (SEC-04) exige Bearer igual ao `SUPABASE_SERVICE_ROLE_KEY`. O comentário da própria função descreve o modo de falha para a chave `DEVOLUTIVA_INVOKE_SECRET` removida.
- `submit-bigfive-final` está em **v11** em PROD (deploy da validação). Conferir se o fonte deployado bate com o repositório antes de mexer.
- O Big Five grava em `scores_candidato` (`tipo='big_five'`); `respostas_bigfive`/`scores_bigfive` são tabelas mortas (0 linhas na história). A devolutiva vai para `devolutivas_candidato`.

### Agendamento (JORN-D5)
- `AgendamentoBlock.tsx:298` — `local_ou_link` é texto livre, placeholder `ex.: https://meet.google.com/...`.
- `AgendamentoCandidatoCard.tsx:210` — `isSafeHttpUrl` já decide se renderiza `<a href>`.
- `.ics` põe não-URL em LOCATION — comportamento correto, não mexer.

### Established Patterns
- Features em `src/features/<dominio>/`; services com classes de erro; Zod pt-BR; TanStack Query com query keys hierárquicas.
- Toda escrita privilegiada via RPC `SECURITY DEFINER` ou Edge Function; nunca service_role no cliente.
- `database.types.ts` só pelo CLI — **`npm run db:types` pendura e trunca o arquivo** sem tty; a via que funciona é `SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w) npx supabase gen types typescript --project-id isljnozzlvckrgjjbjwp < /dev/null > database.types.ts` (o `< /dev/null` é load-bearing).
- Testes: vitest (front), deno (EFs — lembrar que chamam `handler(req, deps)` direto e **não** exercitam o wiring do `Deno.serve`, que foi onde o Defeito 5 morava), smokes SQL em `supabase/tests/*.sql`.

</code_context>

<specifics>
## Specific Ideas

- **Ordem que a JORNADA sugere e as dependências impõem** (ver §Integração): a varredura D-11 antes de 22 e 26; 18 (chave de dedupe) antes ou junto de 20 e de 19 — sem ele, a nova decisão depois da reabertura colide com a chave da decisão anterior e o aviso some de novo, exatamente o Defeito 18; o texto de D-09 só depois de 20/18/U2 estarem prontos, para a promessa ser verdade no dia em que for publicada.
- **Verificação em PROD com as contas de teste da jornada** (Marina `fernandinho.costa.neto+claude4@gmail.com`, T1–T3, RH2/RH3), medida no banco pelas consultas de conferência da JORNADA (§«Consultas de conferência»). O decisor da revisão não pode responder a ela — responder com RH2 ou RH3.
- **Retroatividade é decisão do operador, não do executor:** (a) nenhum e-mail retroativo a candidatos reais sobre rejeições passadas; (b) backfill de `feedback_rejeicao` para rejeições humanas **já feitas** (o que devolveria o Art. 20 a quem foi rejeitado antes do conserto) é `UPDATE` retroativo sobre candidatos reais → `checkpoint:decision` com a contagem medida, nunca silencioso; (c) idem para a marcação do D-02, que é a única escrita retroativa já autorizada.
- Linguagem de produto: «avaliação comportamental/cognitiva», nunca «teste psicológico». O sistema nunca rejeita por score (RNF-07a).

</specifics>

<integration>
## Integração — onde os consertos se tocam

| Conserto | Toca | Consequência para o plano |
|---|---|---|
| JORN-18 (chave) | JORN-20, JORN-19 | 18 primeiro ou junto; a nova decisão pós-reabertura e a rejeição na triagem passam pela mesma chave |
| JORN-19 (reabrir) | Defeito 17 (fora) | a regressão `rejeitado → decisao_final` precisa de justificativa **própria**; não confiar em `etapa_justificativa` residual |
| JORN-19 (reabrir) | `UNIQUE(candidatura_id)` em `decisao_final`; Defeito 3b (fora) | desenhar o registro da nova decisão sem apagar a trilha; snapshot na redecisão é correto |
| JORN-22 / JORN-26 | D-11 (varredura) | a varredura vem antes e alimenta os dois consertos e qualquer terceiro achado |
| JORN-24 (parte a) | Defeito 25 (fora) | parar a análise pós-knockout reduz o 25 daqui para frente, mas **não** o conserta (o comparativo segue sem filtrar por `status`) — não declarar o 25 resolvido |
| JORN-15 (texto) | JORN-20, JORN-18, JORN-U2 | publicar o texto novo **depois** que a promessa for verdade |
| JORN-27 (titular) | D-07 | e-mail novo não introduz ocorrência literal nova do canal de privacidade |
| Novos eventos / cron | D-17 | varredura de portões antes; smokes com lista literal de `evento`/`jobname` têm de ser atualizados ou convertidos para baseline |

</integration>

<deferred>
## Deferred Ideas

- Blocos 2, 3 e 4 da fila de consertos — incluindo 17, 3b, 25, 28, 13, 7, 12, 14, 2, 11, 5, 29, 21, 6b, e o Bloco 4 inteiro exceto o U2 (que subiu por D-09).
- PP-8 (redesenho do agendamento) — fase própria depois do Bloco 2 (D-05).
- PP-16 (`lgpd@` → `rh@`) — decidido, escopo medido, não está no Bloco 1 (D-07).
- PP-15 (requisitos eliminatórios na página da vaga) — decidido, não está no Bloco 1.
- **Purga não alcança knockout** (`candidaturas_alem_da_janela()`, allowlist `elegivel_purga` por etapa — achado D5 da varredura): retenção indefinida não declarada para candidaturas eliminadas por knockout. Mecanismo destrutivo, flip `dry_run→live` pendente — fora desta fase por D-21.
- Pedido de revisão para rejeição humana na triagem — fluxo novo, fora por D-20.
- Smokes já vermelhos contra PROD por fotografia envelhecida e **não tocados** por esta fase (ex.: `p39_rewire_triggers_smoke.sql:189`) — registrar; os que esta fase toca seguem D-17.
- Avisar o candidato em **cada** avanço de etapa — rejeitado pelo operador em D-09.

</deferred>
