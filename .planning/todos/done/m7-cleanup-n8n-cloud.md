---
id: m7-cleanup-n8n-cloud
created: 2026-07-28
source: M7 / Phase 39 (DISPATCH-03) — aposentadoria do n8n concluída no banco e no código; falta a superfície EXTERNA
priority: medium
resolves_phase: null
tags: [m7, phase-39, dispatch-03, sec-03, n8n, acao-humana, superficie-externa]
---

# Cleanup do n8n cloud — desativar a(s) workflow(s) externa(s)

A Phase 39 aposentou o n8n de **tudo que é nosso**. Falta desligar a superfície que
vive fora do nosso controle: o próprio n8n cloud.

## O que JÁ está feito (verificado em PROD, 2026-07-28)

- **Banco:** `0` triggers `trg_n8n_*` — os 4 foram DROPPADOS na migration `20260726000001`.
- **Código:** `submit-candidatura` v12 redeployada **sem** o `fetch` hardcoded ao n8n.
- **Vault:** o segredo `n8n_webhook_base` não existe mais (nada a remover).
- Substituídos pelos 3 triggers canônicos da P39 (`trg_notif_transicao`,
  `trg_notif_confirmacao`, `trg_notif_convite`) → EF `notificar-candidato`.

## O que FALTA (ação humana do Fernando)

Desativar ou apagar a(s) workflow(s) em `fernandocosta.app.n8n.cloud`.

## Por que ainda importa (não é só higiene)

Enquanto a workflow existir e estiver ativa, ela permanece um **endpoint público
acionável**. Nada no nosso sistema a chama mais — mas "ninguém chama" não é o mesmo que
"não pode ser chamada". Se alguém (ou algum resto de integração) disparar aquele webhook,
ele executa com as credenciais que estiverem configuradas lá dentro.

O SEC-03 foi resolvido **por substituição** no nosso lado. Este item fecha a outra ponta.

## Como verificar que fechou

1. Abrir `fernandocosta.app.n8n.cloud` e confirmar que as workflows de recrutamento estão
   **inativas ou removidas**.
2. Opcional, mais forte: revogar/rotacionar quaisquer credenciais do Supabase que estejam
   guardadas dentro do n8n — se houver, elas são um caminho de acesso paralelo ao nosso.

## Contexto

- Origem: `[M4/Phase 24 · SEC-03]` — 3 triggers `AFTER` com `net.http_post` deixados dormentes.
- A P39 descobriu que eram **4**, não 3 (o 4º = `trg_n8n_novo_candidato` em `candidatos`).
- Ver `.planning/phases/39-*/39-VERIFICATION.md` (critério 3, DISPATCH-03).
