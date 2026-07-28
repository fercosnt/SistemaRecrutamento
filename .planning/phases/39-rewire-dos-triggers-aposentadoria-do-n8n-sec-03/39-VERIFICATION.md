---
phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
verified: 2026-07-28T02:30:00Z
status: gaps_found
score: 3/4 roadmap success criteria verified (DISPATCH-01 falha na semântica do desfecho; DISPATCH-02 falha no survivor-guard)
overrides_applied: 0
gaps:
  - id: CR-01
    severity: critical
    requirement: DISPATCH-01
    summary: "Candidato APROVADO recebe o e-mail de REJEIÇÃO"
    status: fix_committed_not_deployed
    fix_commit: f3b7304
    blocks: "redeploy da EF notificar-candidato (acesso de escrita indisponível)"
  - id: CR-02
    severity: critical
    requirement: DISPATCH-02
    summary: "Survivor-guard do knockout é dead code — knockout recebe a confirmação"
    status: fix_committed_not_deployed
    fix_commit: f3b7304
    blocks: "redeploy da EF notificar-candidato (acesso de escrita indisponível)"
human_verification:
  - test: "Após o redeploy da notificar-candidato: provar CR-01 ao vivo — registrar uma decisão de APROVAÇÃO e confirmar que o e-mail recebido traz a COPY_APROVACAO, nunca a COPY_REJEICAO"
    expected: "E-mail com assunto 'Boa notícia sobre sua candidatura — <vaga>' e corpo com a cópia de aprovação; ledger grava evento='decisao'"
    why_human: "Exige entrega real (gated em DELIV-01) e uma decisão registrada por humano no painel do RH."
  - test: "Após o redeploy: provar CR-02 ao vivo — submeter uma candidatura que dispare knockout e confirmar ZERO e-mail de confirmação e ZERO linha nova em notificacoes_enviadas"
    expected: "Resposta skipped:knockout no log da EF; nenhuma linha `pendente` criada (a guarda roda antes do claim)"
    why_human: "Exige o fluxo real de submissão com opção de knockout ativa."
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
| 1 | Trigger CASE em `historico_candidatura` é fonte canônica única, ids-only, graceful-skip (DISPATCH-01) | ⚠ **GAP** — o trigger existe e está correto na forma, mas o `CASE` colapsa `aprovado` e `rejeitado` num único evento `decisao` **sem discriminador no corpo**, e o template renderizava só rejeição ⇒ **CR-01** |
| 2 | Satélites cobrem confirmação (com survivor-guard) e convite; exatamente um e-mail por evento (DISPATCH-02) | ⚠ **GAP** — os 2 satélites existem, mas o survivor-guard é **inalcançável** (AFTER INSERT lê estado pré-knockout) ⇒ **CR-02** |
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

⚠ **`f3b7304` está commitado mas NÃO deployado.** A EF `notificar-candidato` viva em PROD
(v2) ainda contém os dois defeitos. O redeploy exige acesso de escrita, indisponível nesta
sessão (MCP `read_only=true`, sem Supabase CLI / projeto não linkado).

Testes do fix: EF Deno **260/0** (era 251 — +5 EF, +4 templates), vitest 128 files/1025,
`tsc` 97→97 (teto do CI 104). O teste de aprovação asserta `!includes(COPY_REJEICAO)`, logo
reprova contra o código antigo — é guard de regressão real, não asserção decorativa.

## Contenção atual

Os dois defeitos estão **latentes** apenas porque todo envio falha com
`403 domain not verified`. Isso é um acidente de configuração, **não um controle**. O DNS
Resend de `rh.beautysmile.com.br` já foi publicado (SPF + DKIM + MX), então **fechar DELIV-01
ou aplicar o 41-05 converteria ambos em dano real a candidatos**.

**Ordem obrigatória:** redeploy da `notificar-candidato` → depois DELIV-01 / 41-05.
