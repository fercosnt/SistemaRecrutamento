---
id: m7-ativar-modo-producao
created: 2026-07-28
resolved: 2026-07-29
status: done
source: M7 — pipeline completo e provado ao vivo em modo `teste`; falta a decisão de negócio de ligar a entrega real
priority: high
resolves_phase: null
tags: [m7, deliv-03, go-live, notificacoes-modo, decisao-de-negocio, acao-humana, resolvido]
---

## ✅ RESOLVIDO — 2026-07-29: o sistema está EM PRODUÇÃO

O Fernando executou o go-live completo. **A comunicação com o candidato está ativa.**

### O que foi feito, na ordem correta

**1. Entregabilidade validada ANTES do flip** (sem tocar o sistema — envio direto pela API
do Resend, isolando "o domínio entrega?" de "o sistema está ligado?"):

| Verificação | Resultado |
|---|---|
| Gmail — Caixa de entrada | ✅ (não spam, não promoções) |
| Gmail — `SPF` / `DKIM` / `DMARC` | ✅ **os três PASS** |
| Gmail — remetente exibido | ✅ "Beauty Smile Recrutamento" |
| Gmail — Reply-To | ✅ preenche `rh@beautysmile.com.br` |
| Outlook/Hotmail — Caixa de entrada | ✅ (com **latência maior** — ver nota) |
| Open tracking | ✅ desligado |
| Click tracking | ⚠️ **não confirmado** — ver pendência residual |

**2. Flip para produção** — `NOTIFICACOES_MODO` = `producao`.

**3. Prova do caminho real**, usando uma candidatura de teste com o e-mail do próprio
operador (`fernando@beautysmile.com.br`), sem expor candidato algum:

```
modo=producao · destinatario_email=fernando@beautysmile.com.br
destinatario_original=fernando@beautysmile.com.br  (IGUAIS ⇒ sem desvio ao sink)
status=entregue · ultimo_erro=null
```

E-mail recebido: *"Sua candidatura avançou — [TESTE] Auxiliar de Saúde Bucal (ASB)"*.

**4. Limpeza pós-teste — verificada por consulta ao vivo:** ledger de volta a **0 linhas**,
candidatura restaurada em `triagem`, `etapa_justificativa` nula, histórico do dia removido.

### Auditoria de segurança do go-live

`net._http_response` nas 36 h seguintes ao flip registra **um único disparo** (id 68,
`{"ok":true,"status":"enviado"}`) — exatamente o teste acima. **Nenhum candidato real
recebeu e-mail por acidente.** Zero linhas `pendente`/`falhou`.

### Notas

- **Latência maior no Outlook** é esperada e não é defeito: subdomínio recém-verificado
  ainda não tem reputação acumulada nos filtros da Microsoft. Tende a normalizar com
  volume orgânico. Vale reparar se persistir depois de algumas semanas de tráfego real.
- **Passo 2.1 do guia mostrou 1 linha `entregue`** em vez da tabela vazia esperada. Era a
  própria linha do teste (ordem de execução das consultas), não tráfego inesperado —
  confirmado pelo dispatch único no `net._http_response`.

### ⚠️ Pendência residual

O checkbox de **click tracking** ficou desmarcado no registro do operador, enquanto o de
open tracking foi marcado. Não é verificável por API a partir daqui. **Conferir em**
Resend → Domains → `rh.beautysmile.com.br` → Settings que *ambos* estão desligados.

Se o click tracking estiver ativo, todo link do e-mail é reescrito para um redirecionador
do Resend — piora entregabilidade e coleta comportamento de clique do candidato sem
finalidade declarada (questionável sob a LGPD para e-mail transacional).

---
*(corpo original abaixo, preservado)*

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
