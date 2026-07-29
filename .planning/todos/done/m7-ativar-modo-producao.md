---
id: m7-ativar-modo-producao
created: 2026-07-28
source: M7 — pipeline completo e provado ao vivo em modo `teste`; falta a decisão de negócio de ligar a entrega real
priority: high
resolves_phase: null
tags: [m7, deliv-03, go-live, notificacoes-modo, decisao-de-negocio, acao-humana]
---

# Virar `NOTIFICACOES_MODO` para `producao` (go-live da comunicação)

**Esta é a única chave entre o pipeline provado e o candidato real.** Todo o M7 está
vivo, deployado e verificado ponta-a-ponta — mas em modo `teste`, o que significa que
**nenhum candidato real recebe e-mail hoje**.

## Estado atual (2026-07-28)

| Item | Estado |
|---|---|
| `NOTIFICACOES_MODO` | **`teste`** (secret da Edge Function) |
| Destino efetivo | `delivered+<evento>@resend.dev` (sandbox do provedor, aceita e descarta) |
| `destinatario_original` no ledger | e-mail REAL do candidato (auditoria preservada) |
| Domínio `rh.beautysmile.com.br` | **Verified** no Resend ✓ |
| Envio real | provado funcionando (`status='enviado'` + `entregue` via webhook) |

## Como ligar

Supabase Dashboard → **Project Settings → Edge Functions** → secret
`NOTIFICACOES_MODO` = `producao`.

Só a string exata `producao` (após `trim().toLowerCase()`) habilita. Qualquer outro valor,
vazio ou ausente ⇒ `teste`. É fail-safe **por design** (DELIV-03): a intenção é que ligar a
produção seja um ato explícito, nunca um efeito colateral de deploy ou de env mal
configurada.

## ⚠ Antes de virar — o que passa a ser real

A partir do flip, **estes 4 eventos passam a mandar e-mail para pessoas**:

1. `confirmacao` — candidatura recebida (dispara em toda submissão)
2. `avanco` — avanço para avaliação assíncrona
3. `convite` — convite de entrevista (com anexo `.ics`)
4. `decisao` — aprovação **ou** recusa

Vale conferir antes:

- **Volume represado:** confirmar que `notificacoes_enviadas` não tem linhas `pendente`/`falhou`
  acumuladas que a varredura `*/15` fosse disparar de uma vez ao ligar. Hoje: **0 linhas**.
- **Candidaturas de teste em PROD:** existem 8, várias com e-mail `@teste.com` e vagas `[TESTE]`.
  Elas não disparam sozinhas (o gatilho é o evento do funil), mas qualquer mexida nelas depois
  do flip vira e-mail de verdade.
- **Rate limit / free-tier do Resend:** questão em aberto desde o kickoff do M7, nunca medida.
  Se houver um burst inicial, o cap de `LIMIT 20` por sweep e o `tentativas < 5` seguram — mas o
  limite do plano em si não foi verificado.

## Como verificar que ficou certo

Após o flip, num evento real, checar no ledger:

```sql
select modo, destinatario_email, destinatario_original, status
  from public.notificacoes_enviadas order by criado_em desc limit 1;
```

Esperado: `modo='producao'` e `destinatario_email` **igual** ao `destinatario_original`
(sem o desvio `delivered+…@resend.dev`).

## Rollback

Voltar o secret para `teste`. O efeito é imediato na próxima invocação — a EF resolve o modo
a cada request, não em tempo de boot. Não exige redeploy.
