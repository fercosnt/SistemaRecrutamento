---
phase: 49-consertos-da-jornada-bloco-2
fixed_at: 2026-09-30
review_path: .planning/phases/49-consertos-da-jornada-bloco-2/49-REVIEW-GAPS-2.md
iteration: 1
scope: "CR-01, WR-04, WR-05 — aprovado pelo operador em 2026-09-30 («1- sim»)"
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# 49-REVIEW-GAPS-2: relatório dos consertos

**Escopo.** CR-01, WR-04 e WR-05. O operador aprovou esse escopo em 2026-09-30 («1- sim»). Não foram tocados WR-01, WR-02, WR-03 nem os IN-01..IN-05. Também não houve deploy, apply de migration, escrita em PROD nem push. O `49-REVIEW-GAPS-2.md` não foi editado.

**Onde a verificação rodou:** no checkout principal (`workflow.use_worktrees: false`), sem worktree.

## Consertados

### CR-01: na SJT caso aberto, o sinal tirava a nota da Decisão Final

**Commits:** `fa1c609b` (RED) e `88b127f6` (GREEN).
**Arquivos:**
- `supabase/functions/avaliar-redacao/index.ts`
- `supabase/functions/avaliar-redacao/__tests__/index.test.ts`
- `supabase/functions/_shared/sinal-revisao.ts` (comentário)
- `src/features/avaliacao/services/scoresRhService.ts` (comentário)
- `src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx`
- `49-39-SUMMARY.md` e `49-41-SUMMARY.md` (nota datada acrescentada no fim; o texto original não foi reescrito)

**O que mudou:**
- `sinalizada` saiu da condição do `status`. O código `instrucao_ao_modelo` continua em `metadata.motivos_revisao`, inclusive numa linha `sucesso`.
- O docblock não diz mais que o sinal manda a linha para revisão humana. Ele registra que o `pendente_humano` foi leitura do planejador (49-39) da decisão (a).
- O comentário da metadata («em `sucesso` a chave não existe») foi corrigido.

**Prova:**
- Teste novo «CR-01 — …normalizeSjtComposite…». Ele usa o `normalizeSjtComposite` real do `consolidar-decisao-final` sobre a sub-linha MC 4/10 mais o caso aberto que o handler gravou, com e sem a frase. Exige o mesmo valor, e um valor diferente do que sai só do MC.
  - No RED (código antigo, que é a mutação `|| sinalizada`): com sinal **40**, sem sinal **68,57**.
  - No GREEN: os dois valores são iguais.
- Guarda nova: sinal + red_flag continua em `pendente_humano`, com `["red_flag","instrucao_ao_modelo"]`.

**`ScorecardAvaliacao`:** o componente não mudou. Ele já decide o aviso só pelos motivos, independente do status, como a key-decision do 49-41 prevê. O teste novo prende isso: numa linha `sucesso` com o código, o rótulo aparece e o marcador «Requer revisão humana» não aparece. Esse teste passou já no RED.

**Status:** fixed: requires human verification. É mudança de lógica: um caso aberto sinalizado sem outra causa passa a ser `sucesso` e a contar na Decisão Final.

### WR-04: atribuições ao operador que ele não deu

**Commit:** `dec41825`.
**Arquivos:**
- `supabase/functions/_shared/injection-detector.ts`
- `supabase/functions/_shared/__tests__/injection-detector.test.ts`
- `supabase/functions/_shared/ai-error-codes.ts`

**O que mudou:**
- **(1)** «Não é uma escolha deste plano: é a letra da decisão» passou a «leitura do planejador (49-36) da letra da decisão (a)». O texto acrescenta que o custo com destinatário humano não foi levado ao operador.
- **(2)** «Mudança AUTORIZADA pela decisão (a)» passou a «rebaixamento do planejador dentro da decisão (a)».
- **(3)** O docblock de `CAUSA_FALLBACK_ROTULO` agora ressalva que o rótulo de `prompt_injection_flagged` foi redigido pelo planejador.
- Nos itens (1) e (2), as palavras do operador aparecem verbatim: «1 ok confirmado» e «2- A» (2026-09-30, 49-36-SUMMARY), com a ressalva de que nenhuma das duas cobre aqueles trechos.
- **(4)** O bloco do `avaliar-redacao` foi reescrito no commit do CR-01 (`88b127f6`). Ele cita a decisão (a) como está registrada no `<decisions>` do 49-36-PLAN e atribui o `pendente_humano` ao planejador.

**Prova de que só mudaram comentários:** o sha256 do código sem comentários (printer do TypeScript com `removeComments`) é idêntico antes e depois nos três arquivos. O contrato do detector e o teste de PII passam 253/253, e o portão de docblock do 49-37 continua verde.

### WR-05: o alerta de perda de auditoria do sinal falava em bloqueio

**Commit:** `3ff15af6`.
**Arquivos:**
- `supabase/functions/_shared/audit-logger.ts`
- `supabase/functions/_shared/ai-client.ts` (comentário)
- `supabase/functions/_shared/__tests__/ai-client.test.ts`

**O que mudou:** para `prompt_injection_flagged`, a mensagem agora é «o sinal de revisão ACONTECEU (o modelo foi chamado e a análise seguiu, marcada) e NÃO ficou registrado em ai_call_logs.». A mensagem dos caminhos de bloqueio ficou byte a byte igual. O docblock deixou de afirmar que o alerta só roda com `hold`.

**Prova:** o teste WR-05 roda os dois caminhos com a escrita da linha falhando.
- No flag, a mensagem não contém «bloqueio» e diz que a análise seguiu.
- No block, a mensagem é exatamente a antiga.
- As duas mensagens diferem.

No RED, o caminho flag devolveu «o bloqueio ACONTECEU».

## Verificação final (checkout principal)

| Portão | Resultado |
|---|---|
| Deno: `_shared/__tests__/` + as 7 EFs de IA + `consolidar-decisao-final` | `ok \| 681 passed \| 0 failed` |
| Vitest: avaliacao, admin/ai-logs, decisao, transcrição, hub, triagem, comparativo | 52 arquivos, 480 testes, todos verdes |
| Vitest: `src/__tests__` (guards) | 11 arquivos, 114 testes, todos verdes |
| `npm run lint` (tsc) | 89 erros, igual ao baseline, sem aumento |

## Não consertado / fora do escopo

- WR-01, WR-02, WR-03 e IN-01..IN-05 estão fora do escopo aprovado. Eles pedem PARADA e levar o caso ao operador.
- **Commit do RED.** Ele foi feito primeiro com o prefixo `test(49-43)`. Antes de qualquer outro commit, o prefixo foi corrigido para `fix(49-43)` por `git commit --amend`, só na mensagem, com os hooks rodando. O commit não tinha sido publicado.
- **Deploy.** A mudança em `avaliar-redacao`, `audit-logger` e `ai-client` só vale em PROD depois do redeploy das EFs, que é trabalho do 49-43 e não foi feito aqui. A ordem já registrada continua valendo: nenhuma EF sobe antes da migration `20260930000001`.
