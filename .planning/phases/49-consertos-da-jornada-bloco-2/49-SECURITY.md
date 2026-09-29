---
phase: "49"
slug: "consertos-da-jornada-bloco-2"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-29"
---

# Phase 49 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Registro montado dos `<threat_model>` dos 29 planos (autorados em tempo de plano) + as seções
> «Threat Flags» dos 29 SUMMARYs. Verificação ASVS L1 (grep/leitura), `block_on: high`, por
> `gsd-security-auditor` em 2026-09-29. Nada foi executado contra PROD nesta auditoria: a evidência
> de PROD é a registrada no `49-PROVA-PROD.md` e nos SUMMARYs.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Cliente (RH autenticado) → RPC / PostgREST | RPCs SECURITY DEFINER e tabelas sob RLS | decisões de funil, justificativas, análises de IA |
| Cliente (RH) → Edge Functions de IA | comparativo, redação, transcrição, guia, análise individual | PII de candidatos no input do modelo |
| Edge Function → provedores de IA (Anthropic / OpenAI fallback) | `callAi` com fallback e teto de custo | texto de candidatos, mascarado quando aplicável |
| Banco → titular (exportação / recibo de exclusão, Art. 18) | `exportAllowlist` e motor de exclusão | dados do próprio titular, trilha de auditoria |
| `anon` → schema público | superfície pública | nenhuma (EXECUTE revogado nas funções tocadas) |

---

## Threat Register

130 ameaças nos 29 planos: 71 high (29 delas são as linhas SC «zero instalação»), 53 medium,
6 low. Disposição: 128 mitigate, 2 accept, 0 transfer. Os IDs 14-02, 14-04 e 14-07 são lacunas
da numeração, não ameaças ausentes.

Linhas CLOSED agrupadas por plano; toda linha não-fechada ou aceita aparece individualmente.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-49-12-03 | Information Disclosure | justificativa da decisão final em `historico_candidatura.criterio_texto`, exportada ao titular | high | **accept** (era mitigate) | D-47 recusada pelo operador — ver Accepted Risks Log AR-49-01. Metade de dados novos fechada pelo T-49-06-03 (`20260922000004:574-581`) | closed (accepted) |
| T-49-18-04 | Denial of Service | comparativo real do RH cai no modelo reserva durante a janela de fallback forçado | low | accept | janela de minutos, aprovada pelo operador, resultado marcado como contingência | closed (accepted) |
| T-49-20-05 | Elevation of Privilege | cliente setando o GUC `app.motor_exclusao` | low | accept | `app.*` não é settable por PostgREST/RPC; limpo na linha seguinte ao UPDATE; smokes (B21)/(B22) | closed (accepted) |
| T-49-*-SC (29) | Tampering (supply chain) | dependências | high | mitigate | `git diff 1a45fb70..HEAD` sem mudança em `package.json`/`package-lock.json`/`deno.json`/`deno.lock`; único specifier novo é `deno.land/std@0.224.0/assert`, só de teste e já usado em 40 arquivos | closed |
| T-49-01-01..04 | vários | migração de proveniência (`20260922000002`) | — | mitigate | REVOKE PUBLIC/anon :212-215; pós-portão anon :397-400; nulabilidade :350; `solicitado_por` fora do export | closed |
| T-49-02-01..05 | vários | `_shared/ai-client.ts` | — | mitigate | replay de fallback recusado :519-526; alerta de perda de auditoria :704-711/:758; tentativa falha loga só `{stop_reason, usage}` :888; soma diária sem filtro de sucesso :591-609 | closed |
| T-49-03-01..03 | vários | `notificar-candidato` | — | mitigate | guarda antes do claim `index.ts:328-333`; dry-run registrado | closed |
| T-49-04-01..03 | vários | embed de candidato / bloco cognitivo | — | mitigate | allowlist sem `cpf`/`data_nascimento` (`candidaturasService.ts:53,59,86`); `cognitivoBanda.ts:52`; `ScoreCard.tsx:50,139` | closed |
| T-49-05-01..02 | vários | Kanban / modal de status | — | mitigate | predicado canônico (`KanbanBoard.tsx:140,233`; `UpdateStatusModal.tsx:77-88`) | closed |
| T-49-06-01..06 | vários | trava de funil (`20260922000003`/`…04`) | — | mitigate | trava :157-158; reset de GUC :329-335; pré-portões md5 :102-120; `auth.uid() IS NOT NULL` :502-505; pós-portões | closed |
| T-49-07-01..03 | vários | trigger de snapshot (`20260922000006`) | — | mitigate | `to_jsonb` menos 2 colunas :146-147; paridade (g) no `p49_snapshot_smoke` | closed |
| T-49-08-01..05 | vários | `comparativo-candidatos` | — | mitigate | posse da vaga :280-286; 403 único :324-328; auditoria conferida :512-525; teto 4 | closed |
| T-49-09-01..04 | vários | `avaliar-redacao-cultural` | — | mitigate | `index.ts:330-332,371,406`; rubrica constante importada pelas telas | closed |
| T-49-10-01..06 | vários | `registrar_analise_entrevista` (`…07`/`…08`) | — | mitigate | advisory lock :148; REVOKE authenticated :238-245; `coalesce(v_role,'')` | closed |
| T-49-11-01..03 | vários | `analise-candidato-individual` / `efdeploy.cjs` | — | mitigate | `index.ts:345-353,620-649,682-696`; tabela VERIFY_JWT | closed |
| T-49-12-01,02,04,05 | vários | retroativos (`…09`/`…11`) | — | mitigate | conjunto autorizado literal com `IS DISTINCT FROM`, portão md5, deltas de fila/notificação | closed |
| T-49-13..17 (todas) | vários | comparativo/rótulos, motor de exclusão, logs de IA, entrevista, inventário | — | mitigate | ver `49-13..17-SUMMARY.md`; motor `20260923000002` :813/:842/:905-932/:1264/:1288; `check:*` verdes | closed |
| T-49-18-01..03 | vários | prova de PROD / fallback forçado | — | mitigate | guarda de valor esperado `p49_fallback_forcado_liga.sql:55-84`; `model_id` restaurado e relido | closed |
| T-49-19-01..04 | vários | 1ª execução real do motor | — | mitigate | autorização literal do operador (`49-PROVA-PROD.md:822-860`); `p36_outros_intactos` | closed |
| T-49-20..29 (demais) | vários | motor, recibo, SJT, guia, purga, desvinculação | — | mitigate | ver SUMMARYs; `metadata - 'respostas'` `20260923000002:1125`; `p46_purga_smoke.sql:872-897` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-49-01 | T-49-12-03 | A D-47 (normalizar o texto nas 5 linhas antigas da trilha) **editaria uma trilha de auditoria sem que a trilha registrasse ter sido editada** — a única coisa não recuperável da proposta (`49-12-SUMMARY.md:78-104`). Ficam 5 linhas de `historico_candidatura.criterio_texto` (4 candidaturas — `0b1c887b`, `6e5d8051`, `2ce20fbf` ×2, `d31c78bb`, esta de conta real; ids conferidos no `49-17-SUMMARY.md:201`) que levam ao **próprio titular**, na exportação, o texto da justificativa da decisão sobre ele. A BD-9 **continua `open`** no `WINDOWS.md` (`unmet-truth`): aceitar o risco não é declará-la resolvida. Caminho de mitigação que não edita a trilha, se reaberto: omitir `criterio_texto` na exportação quando igual à justificativa | operador (recusa da D-47 em 2026-09-22; aceite formal na cauda em 2026-09-29) | 2026-09-29 |
| AR-49-02 | T-49-18-04 | Janela de fallback forçado de minutos, aprovada, resultado marcado como contingência (`49-PROVA-PROD.md` §5) | operador | 2026-09-27 |
| AR-49-03 | T-49-20-05 | `app.*` não é settable por PostgREST/RPC; o GUC é limpo na linha seguinte ao UPDATE (smokes B21/B22) | plano 49-20 | 2026-09-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Fora do registro — sinalizado nos SUMMARYs

- **Pré-existente, aberto (WINDOWS 85):** `v_analises_presas` é view de dono `postgres` sem
  `security_invoker`, com SELECT para `authenticated`; expõe a coluna `erro` e ids de
  candidatura/vaga. Nasceu na `20260826000002`, não nesta fase — nenhuma ameaça do registro a cobre.
- **Pré-existente, fechado pela fase:** EXECUTE de `anon` em 7 funções (49-06/07/10), revogado e
  vigiado por pós-portões.
- **Residual documentado:** hashes de texto removido (D-70); WINDOWS 82 e 86 são defeitos de
  escrituração, não superfície de ataque.
- **Fora dos 29 registros:** `20260929000001`/`…0002` (JORN-50/51) são só de dados — sem funções,
  grants, policies ou RLS novos.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-29 | 130 | 129 | 1 (T-49-12-03, high) | gsd-security-auditor (ASVS L1) |
| 2026-09-29 | 130 | 130 | 0 | operador aceitou T-49-12-03 como AR-49-01 |

Evidência local medida pelo auditor: vitest 2321/2321 (217 arquivos); Deno 748/0; os 4 `check:*` OK.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-29
