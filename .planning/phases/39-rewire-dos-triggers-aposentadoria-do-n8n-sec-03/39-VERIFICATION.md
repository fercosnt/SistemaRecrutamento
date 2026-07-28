---
phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
verified: 2026-07-28T02:30:00Z
revised: 2026-07-28T09:40:00Z
status: human_needed
score: 4/4 critérios verificados + UAT ao vivo EXECUTADO — CR-02 provado diretamente (skipped:knockout, zero linhas); CR-01 com a cadeia inteira provada por execução, faltando só conferência VISUAL do assunto no dashboard do Resend
overrides_applied: 0
gaps:
  - id: CR-01
    severity: critical
    requirement: DISPATCH-01
    summary: "Candidato APROVADO recebe o e-mail de REJEIÇÃO"
    status: fix_deployed
    fix_commit: f3b7304
    deployed: "2026-07-28 — notificar-candidato v2 → v3 (MCP deploy_edge_function, verify_jwt=false)"
    evidence: "Fonte deployada confirmada via get_edge_function: COPY_APROVACAO presente, corpoDecisao/SUBJECTS ramificam em `desfecho`, allowlist da EF inclui etapa_atual"
  - id: CR-02
    severity: critical
    requirement: DISPATCH-02
    summary: "Survivor-guard do knockout é dead code — knockout recebe a confirmação"
    status: fix_deployed
    fix_commit: f3b7304
    deployed: "2026-07-28 — notificar-candidato v2 → v3"
    evidence: "Fonte deployada confirmada: guard `evento==='confirmacao' && (status==='rejeitado' || opcao_knockout_id!==null)` na linha 192, ANTES do claim (linha 250)"
human_verification:
  - test: "Conferência VISUAL do assunto do e-mail de aprovação no dashboard do Resend (https://resend.com/emails), message id 1aec8ab7-0911-4442-befc-8d2d1c64411c"
    expected: "Assunto = 'Boa notícia sobre sua candidatura — [TESTE] Dentista — Funil E2E' (NUNCA 'Atualização sobre sua candidatura' com corpo de recusa)"
    why_human: "A EF não registra assunto/corpo em log nem no ledger, por disciplina de PII (helper logSeguro). A cadeia inteira já foi provada por execução; falta só o olho humano no conteúdo renderizado."
---

# Phase 39: Rewire dos Triggers & Aposentadoria do n8n (SEC-03) — Verification Report

**Verified:** 2026-07-28T02:30:00Z
**Status:** gaps_found
**Re-verification:** No — verificação inicial, executada **retroativamente**. A fase foi
aplicada em PROD (`39-04`, 2026-07-26) e marcada `executed` **sem que este relatório
existisse**. Os 2 defeitos críticos abaixo são consequência direta desse gate pulado.

## Evidência ao vivo (coletada pelo orquestrador via Supabase MCP)

Subagentes GSD não recebem os tools MCP do Supabase (anthropics/claude-code#13898), então
toda inspeção de PROD foi feita no main thread.

| Verificação | Resultado |
|---|---|
| Triggers `trg_n8n_*` restantes | **0** — os 4 foram DROPPADOS ✓ |
| `trg_notif_transicao` em `historico_candidatura` | AFTER INSERT, presente ✓ |
| `trg_notif_confirmacao` em `candidaturas` | AFTER INSERT, presente ✓ |
| `trg_notif_convite` em `agendamentos_entrevista` | AFTER INSERT, presente ✓ |
| Postura das 3 funções | `SECURITY DEFINER` + `SET search_path=''` ✓ |
| Segredos | lidos do Vault (`project_url`, `edge_invoke_key`), graceful-skip em NULL ✓ |
| Corpo do `net.http_post` | ids-only, zero PII ✓ |
| Fail-open | `EXCEPTION WHEN OTHERS → RAISE WARNING → RETURN NEW` ✓ |
| Ledger da migration | version `20260726000001` reconciliada ao prefixo ✓ |
| `submit-candidatura` | v12, redeployada 2026-07-26, sem o `fetch` n8n ✓ |
| `net._http_response` | ids 58/60/61 = **200 `{"ok":true}`** (o 401 do id 57 é o gap da P38 já corrigido) |
| Tráfego de funil desde 2026-06-26 | **nenhum** (última candidatura e histórico em 06-26; 0 agendamentos) |

## Success Criteria

| # | Critério (DISPATCH) | Veredito |
|---|---|---|
| 1 | Trigger CASE em `historico_candidatura` é fonte canônica única, ids-only, graceful-skip (DISPATCH-01) | ✅ **VERIFICADO (após gap closure)** — o trigger sempre esteve correto na forma; o `CASE` colapsa `aprovado`/`rejeitado` num evento `decisao` ids-only e o **desfecho é resolvido na EF** a partir de `etapa_atual`. Fix `f3b7304` **deployado (v3)** em 2026-07-28 ⇒ CR-01 fechado. Confirmação ao vivo = `human_verification` |
| 2 | Satélites cobrem confirmação (com survivor-guard) e convite; exatamente um e-mail por evento (DISPATCH-02) | ✅ **VERIFICADO (após gap closure)** — os 2 satélites existem; o survivor-guard **migrou do trigger para a EF**, onde o estado pós-COMMIT é visível, e roda **antes do claim**. Fix `f3b7304` **deployado (v3)** ⇒ CR-02 fechado. Confirmação ao vivo = `human_verification` |
| 3 | Triggers n8n DROPPADOS + disparo do `submit-candidatura` aposentado na mesma migration (DISPATCH-03) | ✅ **VERIFICADO** — 0 `trg_n8n_*` vivos; EF redeployada sem o `fetch`. Pendente só o cleanup **externo** do n8n cloud (ação humana, fora do banco/código) |
| 4 | Hop trigger→EF com Bearer self-auth do Vault, corpo ids-only (DISPATCH-04) | ✅ **VERIFICADO** — Bearer `edge_invoke_key` do Vault, corpo ids-only, e o hop **prova-se funcional** pelos 200 no `net._http_response` |

## Gaps

### CR-01 (crítico, DISPATCH-01) — aprovado recebe rejeição

Cadeia: trigger mapeia `etapa_para IN ('aprovado','rejeitado')` → evento `decisao` (corpo
ids-only) → `helpers.ts` `EVENTO_MAP.decisao = 'decisao_final'` → `email-templates.ts:151`
`decisao_final: corpoDecisao` → `corpoDecisao` usava **exclusivamente** `COPY_REJEICAO`
(*"Sua candidatura não seguirá para as próximas etapas deste processo seletivo."*).

O `NEUTRO` do docblock significa neutro quanto a **dado de avaliação** (D-15/RNF-07a), não
neutro entre aprovar e rejeitar. **Todo aprovado receberia a rejeição.**

**Fix (`f3b7304`, EF-only):** `COPY_APROVACAO` congelada sob a mesma disciplina D-15;
`corpoDecisao`/`SUBJECTS` ramificam por `desfecho`, derivado de `candidaturas.etapa_atual` —
que a EF **já resolvia** na allowlist (`index.ts:185`) e simplesmente ignorava. Desfecho
ausente ⇒ rejeição (fail-safe).

### CR-02 (crítico, DISPATCH-02) — survivor-guard morto

`trg_notif_confirmacao` é AFTER INSERT e testa `NEW.status` / `NEW.opcao_knockout_id`, mas
`submit_candidatura_atomic` INSERE sem knockout (`20260709000014:61-73`) e só aplica o
knockout num **UPDATE posterior** (`:138-144`). A guarda nunca pode ser verdadeira ⇒
**knockouts recebiam a confirmação**, violando a decisão de kickoff "knockout = zero e-mail".

**Fix (`f3b7304`, EF-only):** a guarda vive na EF, que é o lugar correto — `net.http_post` é
assíncrono e só entrega **depois do COMMIT**, então a linha já reflete o estado final. Roda
**antes do claim**, então um knockout não deixa linha `pendente` para a varredura da P41
re-tentar.

### Refutado — CR-03 do code review (Bearer mismatch)

O review afirmou que todo dispatch 401 porque os triggers mandam `edge_invoke_key` e a EF
aceita `NOTIFICAR_SECRET ?? SUPABASE_SERVICE_ROLE_KEY`. **Falso:** o `net._http_response`
mostra `200 {"ok":true}` nos ids 58/60/61, posteriores ao fix da P38 que setou
`NOTIFICAR_SECRET = edge_invoke_key`. O 401 (id 57, 17:54) é justamente o gap **já
corrigido**. O "ledger vazio é a assinatura" também cai: não há tráfego de funil desde
**2026-06-26**, e a linha do smoke da P38 foi limpa deliberadamente.

## Estado do fix

✅ **RESOLVIDO em 2026-07-28 — `f3b7304` está DEPLOYADO.** A EF `notificar-candidato` foi
redeployada **v2 → v3** (MCP `deploy_edge_function`, `verify_jwt=false`, ACTIVE) assim que o
acesso de escrita foi restabelecido (MCP sem `read_only`; `current_user=postgres`,
`transaction_read_only=off`). A EF viva **não contém mais** os dois defeitos.

Testes do fix: EF Deno **260/0** (era 251 — +5 EF, +4 templates), vitest 128 files/1025,
`tsc` 97→97 (teto do CI 104). O teste de aprovação asserta `!includes(COPY_REJEICAO)`, logo
reprova contra o código antigo — é guard de regressão real, não asserção decorativa.

Re-validado no momento do deploy (2026-07-28): Deno alvo do fix **28/0**
(`notificar-candidato/` + `email-templates.test.ts`), vitest **128 files / 1025 tests**.
> Nota: rodar `deno test` apontando diretamente para `_shared/` faz o runner ignorar o
> `exclude` do `deno.json` e coletar `__tests__/strict-schema.test.ts`, que é um teste
> **Vitest** (`node:fs`/`__dirname`) e falha com `__dirname is not defined`. É ruído de
> invocação, não regressão: o arquivo vem da P08 (`1ea5bc3`) e está explicitamente em
> `deno.json → exclude`.

### Evidência do deploy (via MCP, main thread)

| Verificação | Resultado |
|---|---|
| `notificar-candidato` versão viva | **v3** ACTIVE, `verify_jwt=false` ✓ |
| Fonte deployada = repo | `get_edge_function` confirma `COPY_APROVACAO`, ramificação por `desfecho`, survivor-guard e allowlist expandida ✓ |
| Ordem guard × claim | guard na linha 192, claim (`upsert`) na 250 ⇒ knockout **não** deixa linha `pendente` ✓ |
| Self-auth preservada | `curl` sem Bearer → **401**; Bearer inválido → **401**; corpo `{"error_code":"UNAUTHORIZED"}` (resposta da própria EF, não do gateway) ✓ |
| Logs da EF | `POST | 401 | .../notificar-candidato` em `version: 3` ✓ |
| Efeito colateral | `notificacoes_enviadas` = **0 linhas**; `net._http_response` inalterado (max id 61) ✓ |

## Contenção → resolução

O relatório original registrou que os dois defeitos estavam **latentes** apenas porque todo
envio falhava com `403 domain not verified` — um acidente de configuração, não um controle.
**Essa dependência acabou:** o fix está vivo, então fechar DELIV-01 já **não** converte
CR-01/CR-02 em dano a candidatos. A ordem obrigatória foi cumprida na sequência correta:
redeploy da `notificar-candidato` (v3) **antes** do apply do 41-05 e antes de qualquer
habilitação de entrega.

## UAT ao vivo EXECUTADO (2026-07-28, após DELIV-01 fechar)

Com o domínio **Verified** no Resend e `NOTIFICACOES_MODO=teste` (desvio obrigatório ao sink
`@resend.dev`), os dois defeitos foram exercitados **contra a cadeia real de gatilhos** em
PROD. Estado capturado antes e **restaurado byte-a-byte** depois.

### CR-02 — ✅ PROVADO DIRETAMENTE (fechado)

`opcao_knockout_id` marcado numa candidatura de teste (UPDATE não dispara
`trg_notif_confirmacao`, que é INSERT-only), depois dispatch `evento=confirmacao` via
`net.http_post` com Bearer do Vault.

| Evidência | Resultado |
|---|---|
| Resposta da EF (`net._http_response` id 64) | **`{"ok":true,"skipped":"knockout"}`** |
| Linhas criadas em `notificacoes_enviadas` | **0** |

Prova as duas metades do fix: a guarda **existe de fato** (antes era dead code) **e** roda
**antes do claim** — zero linha `pendente`, logo nada para a varredura `*/15` re-tentar.
Contraste no mesmo `net._http_response`: ids 62 e 63, sem knockout, deram `status:enviado`.

> ⚠ O ramo `status='rejeitado'` da guarda NÃO foi exercitado: `trg_candidaturas_guard_rejeicao`
> proíbe cruzar para `rejeitado` sem trilha de auditoria (RNF-07a/LGPD-02) e **não foi
> contornado** — controle de segurança legítimo. O ramo `opcao_knockout_id` cobre o caminho
> real do knockout (aplicado por `submit_candidatura_atomic`), que é o do defeito.

### CR-01 — ✅ CADEIA PROVADA POR EXECUÇÃO (falta só conferência visual)

`etapa_atual` da candidatura de funil E2E movida para `aprovado`, disparando a cadeia
canônica: `avancar_etapa()` → `historico_candidatura` → `trg_notif_transicao` → EF → Resend.

| Elo | Resultado |
|---|---|
| Trigger classificou o evento | `evento='decisao'`, `template='decisao_final'` ✓ |
| Envio | `status='enviado'`, `provider_message_id=1aec8ab7-0911-4442-befc-8d2d1c64411c`, `ultimo_erro=null` ✓ |
| Webhook real do Resend | reconciliou para **`entregue`** ✓ |
| Modo / DELIV-03 | `destinatario_email='delivered+decisao_final@resend.dev'`, `destinatario_original='candidato.funil@teste.com'` — candidato real **não** contatado ✓ |
| `desfecho` que a EF derivaria | `etapa_atual='aprovado'` ⇒ `desfecho='aprovado'` (fonte deployada auditada) |
| Render local da MESMA fonte | `aprovado` ⇒ assunto **"Boa notícia sobre sua candidatura — …"**, corpo com `COPY_APROVACAO` e **sem** `COPY_REJEICAO` |

O único elo não observado diretamente é o **conteúdo renderizado do e-mail entregue** — a EF
não registra assunto/corpo (disciplina de PII do `logSeguro`), então isso vive só no
dashboard do Resend. Daí o `human_needed` remanescente: é uma conferência visual de um
assunto, não uma dúvida sobre a lógica.

**Restauração pós-teste (verificada):** `etapa_atual` de volta a `decisao_final`, `status`
`em_analise`, histórico de volta a **2** linhas (trilha `entrevista_online → decisao_final`,
as linhas de 2026-07-28 removidas), `opcao_knockout_id` de volta a `null`,
`notificacoes_enviadas` = **0 linhas**. Nenhum candidato real recebeu e-mail.

## Por que `human_needed` e não `passed`

**CR-02 está fechado por completo** — provado diretamente ao vivo (`skipped:knockout` + zero
linhas). **CR-01 teve a cadeia inteira provada por execução**, do gatilho à entrega
reconciliada; o que resta é confirmar com o olho humano que o assunto entregue foi
*"Boa notícia sobre sua candidatura"* e não a cópia de recusa.

Esse último elo não é automatizável **por decisão de design**: a EF nunca registra assunto,
corpo nem destinatário em log (allowlist do `logSeguro`, disciplina de PII), e o ledger
guarda só metadado. O conteúdo renderizado existe apenas no dashboard do Resend. Fechar isso
é 1 clique em https://resend.com/emails no message id
`1aec8ab7-0911-4442-befc-8d2d1c64411c`.
