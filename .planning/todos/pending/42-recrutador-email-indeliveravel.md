---
id: 42-recrutador-email-indeliveravel
created: 2026-07-31
source: Phase 42 / checkpoint da 42-07 (smoke ao vivo do REVISAO-01)
priority: high
tags: [roster, rh, resend, bounce, notificacoes, m8]
---

# O único recrutador vivo tem endereço indeliverável (`@teste.com`)

**Achado:** no smoke ao vivo do REVISAO-01 (2026-07-31), o roster de destinatários do
nudge ao RH resolveu 5 pessoas, das quais **3 em `@teste.com`** — domínio de terceiro
parqueado, que dá **hard bounce**.

| E-mail | Papel | Estado após o checkpoint |
|--------|-------|--------------------------|
| `fernando@beautysmile.com.br` | administrador | ativo ✅ entrega real provada |
| `e2e.admin@beautysmile.com.br` | administrador | ativo ✅ entrega real provada |
| `admin.rh@teste.com` | administrador | **desativado** (seed, `user_id` `aaaa…`) |
| `recruiter@teste.com` | administrador | **desativado** (seed, `user_id` `bbbb…`) |
| `recrutador.rh@teste.com` | **recrutador** | **ativo** — ver abaixo |

## Por que o recrutador foi mantido ativo

É o **único** `usuarios_rh.role = 'recrutador'` do sistema — a persona primária da fila
`/rh/revisoes`. Desativá-lo:

1. o removeria de **todo** nudge de revisão futuro (os planos 42-09/42-10 constroem a fila
   e o badge justamente para ele); e
2. bloquearia o login usado para exercitar o papel `recrutador` nos planos 42-10/42-11 —
   o JWT dele é o único que produz `app_metadata.role = 'rh'` pelo
   `custom_access_token_hook`.

## O custo enquanto não for resolvido

**Todo pedido de revisão real gera 1 hard bounce** contra o domínio verificado
`rh.beautysmile.com.br`, numa conta Resend de free-tier. Bounce sustentado degrada
reputação de remetente e, no limite, suspende a conta — e o mesmo domínio carrega os 4
e-mails de candidato do M7, que são o pipeline de produção.

## Resolução

Trocar `usuarios_rh.email` do recrutador por um endereço real da Beauty Smile (ou
desativar a conta **depois** de existir um recrutador de verdade). Decisão de negócio —
quem é o recrutador real da operação. Não bloqueia nenhum plano da Phase 42.

Relacionado: `m7-ativar-modo-producao` (já concluído — `NOTIFICACOES_MODO=producao`
confirmado de PROJETO, não por função, no checkpoint da 42-07).
