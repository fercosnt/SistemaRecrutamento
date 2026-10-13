---
decisao: conserto-do-review-1-e-autorizacao-previa
data: 2026-10-13
hora: "~09:50 -03 (12:50Z)"
plano: 52-21
review: 52-REVIEW-LIMPEZA-1.md (bb6b1671 — critical 0, warning 7, info 9, changes_required)
registrado_por: orquestrador (/gsd-execute-phase 52), na parada blocking-human da Task 2
---

# 52-21 — decisão do operador sobre o review LIMPEZA-1 e autorização prévia da Task 2

## Resposta do operador (verbatim)

```
(1) Escopo do conserto: WR-01 + WR-02 + WR-04 + WR-06 + WR-03 mínimo (a migration recusa, antes de qualquer DELETE, se o md5 canônico do alvo que ela calcula ≠ populacao_md5 aprovado 1b4b21a9…). Depois o 52-REVIEW-LIMPEZA-2 e só então o pin.
(2) Task 2: apagar — autorizo já; gravar no 52-21-DECISAO.md só depois do LIMPEZA-2 verde, como o portão exige.
(3) export_escopo: aceito (sem sessões/refresh/MFA/one-time tokens; colunas token em branco; encrypted_password guardado). O export em ~/p52-export-limpeza/ é apagado pelo operador depois da prova pós-limpeza do 52-22.
(4) Aprovo a perda das 8 linhas de historico_acoes da candidatura f8318f39 (no export), com o trigger desligado/religado só dentro da transação.
(5) WR-05 e WR-07: pendências nomeadas no 52-22.
Calendário: Task 3 amanhã, 2026-10-14, na janela após o backup diário. Vagas reais podem ser criadas e ATIVADAS hoje (não casam padrão de teste nem são vagas_teste); o operador não faz login nem abre o hub de nenhuma das 30 contas da população até o apply.
```

## O que vale a partir daqui

1. **Conserto** em código revisado, escopo fechado: WR-01 e WR-02 (`scripts/p52_limpeza_portao.cjs` + auto-teste), WR-04 (`comando_md5_aprovado` amarrado à versão revisada), WR-06 (prova pós-Storage sem constante de captura), WR-03 mínimo (a `20261011000004` recusa, antes de qualquer DELETE, se o md5 canônico do alvo que ela calcula for diferente de `1b4b21a93ff00a9d01f7d10926dd1f54`). Nenhum outro arquivo. Nenhum apply, nenhum pin.
2. **Depois:** `52-REVIEW-LIMPEZA-2.md` (critical 0) → `52-21-DECISAO.md` com `decisao: apagar`, `export_escopo: aceito`, `comando_md5_aprovado` do comando consertado → pin `refs/gsd/52-21/sha`.
3. **Task 3** só em 2026-10-14, na janela após o backup diário (~03:28–12:00 BRT), pelo `52-21-COMANDO-APPLY.sh`.
4. **Backlog nomeado no 52-22:** WR-05 (restauração pelo export nunca ensaiada: colunas geradas, triggers de INSERT), WR-07 (3 `auth.users` órfãos, `deleted_at` da `9f6ccf1a`, 64 `ai_call_logs` anuladas, purga de `notificacoes_enviadas` deferida), retenção do export (apagado pelo operador após a prova pós-limpeza do 52-22).
5. **Janela de cadastro:** vagas reais podem ser criadas e ativadas hoje; nenhuma das 30 contas da população é acessada até o apply (o `--conferir --vivo` recusaria).
