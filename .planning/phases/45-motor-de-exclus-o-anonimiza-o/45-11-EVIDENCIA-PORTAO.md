---
fase: 45-motor-de-exclus-o-anonimiza-o
plano: 11
task: 3 — a execução real, vigiada
executado_em: 2026-08-22T05:14:47Z
autorizacao: explícita do operador, nesta sessão, após o agente parar e perguntar (⛔ STATE.md:87)
conta: descartável, criada para isto — nenhuma conta de pessoa real foi tocada
resultado: CONCLUÍDO — os três sistemas
---

# `45-11` Task 3 — a execução real, e o que ela mediu

## A conta

| | |
|---|---|
| `candidato_id` | `317ff71a-6e61-476c-a123-335dfe2f9994` |
| `user_id` | `0940e2e8-9080-455c-a60d-c0c62b1c5ec7` |
| nome | `Zorilda Testequilha Descartavel` — sintético e raro, de propósito |
| e-mail | caixa do operador, para poder ler o recibo |
| criada | 2026-08-22, pelo fluxo real, para ser apagada |

**Nenhuma conta de pessoa real foi tocada.** Detalhe da montagem em
`.planning/45-CONTA-DESCARTAVEL.md`.

## Como foi disparado

`executar_em` antecipada por `UPDATE` com `WHERE` estreito (candidato + tipo + situação), e a
execução **pela Edge Function com o JWT do titular** — nunca a RPC direto. O que se mediu foi o
motor inteiro: EF, claims, ordem dos três sistemas.

```
POST /functions/v1/executar-direito-titular   {"acao":"executar"}
200 · 5.473 ms
{"ok":true,"acao":"executar","concluido_em":"2026-08-22T05:14:47.322Z","arquivos_apagados":3}
```

## Os três sistemas — ANTES × DEPOIS

| Medida | ANTES | DEPOIS | |
|---|---|---|---|
| **Storage** sob o prefixo do titular | **3** (2 com ponteiro + **1 órfão**) | **0** | ✅ |
| **Auth** — o `user_id` existe | sim | **não** | ✅ |
| **Auth** — total | 30 | **29** (−1 exato) | ✅ |
| `candidatos` / `candidaturas` (linhas) | 23 / 11 | 23 / 11 | ✅ tombstone, não `DELETE` |
| `historico_candidatura` | 7 | **7** | ✅ |
| `decisao_final` | 2 | **2** | ✅ |
| `decisao_final_historico` | 1 | **2** | ⚠ ver abaixo |

### O tombstone, coluna a coluna

| coluna | valor |
|---|---|
| `nome_completo` | `[titular removido a pedido]` |
| `email` | `anonimizado+317ff71a-…@invalido.local` — sentinela derivada do id, única por linha |
| `cpf` | `NULL` |
| `celular` | `(00) 00000-0000` — casa o `check_celular_format`, não é prosa |
| `data_nascimento` | `1900-01-01` — não-nula, no passado, diferente da original |
| `genero`, `como_conheceu` | `NULL` |
| `cidade` | `[removido]` · `estado` `SP` preservado (agregável) |
| `user_id` | **`NULL`** — severado |
| `faixa_etaria_materializada` | **`35-44`** — materializada ANTES da anonimização |

## As sete asserções negativas

| # | Asserção | Medido |
|---|---|---|
| 1 | 3 FKs `NO ACTION` inalteradas | **`a,a,a`** ✅ |
| 2 | Contagens da trilha idênticas | `historico` 7=7 ✅ · `decisao_final` 2=2 ✅ · `decisao_final_historico` **1→2** ⚠ |
| 3 | Nenhum tombstone retém `user_id` vivo | **0** ✅ (`user_id` do titular = `NULL`) |
| 4 | Zero `historico_candidatura.ator` no titular | **0** ✅ |
| 5 | Zero notificação `evento='decisao'` | **0** ✅ |
| 6 | Zero `auto_rejeitado = true` | **0** ✅ |
| 7 | Zero linha de ledger para o **recibo** (D-45-12 / R1) | **0** ✅ |

### ⚠ A asserção 2 diverge da letra, e a divergência é conhecida

`decisao_final_historico` foi de **1 para 2**. A letra da asserção pede contagens **idênticas**.

**O mecanismo é documentado:** `trg_decisao_final_snapshot` é `AFTER UPDATE` **sem `WHEN`** e
reinsere `OLD.justificativa`. Quando o motor faz o `UPDATE` para desidentificar
`decisao_final`, o trigger arquiva o valor ANTIGO — identificável — em
`decisao_final_historico`. É a obrigação **M1** que o smoke `45-04` impôs ao `45-07`
(`WINDOWS.md` item 10): *o scrub de `decisao_final_historico` tem de ser o ÚLTIMO statement do par.*

**E foi.** As DUAS linhas estão desidentificadas:

```
decisao_final           → "[justificativa preservada de forma desidentificada a pedido do titular …]"
decisao_final_historico → "[justificativa arquivada, preservada de forma desidentificada …]"  (×2)
```

**Veredito:** a contagem sobe por um mecanismo previsto, o texto identificável **não sobrevive
em lugar nenhum**, e a intenção da asserção — a trilha sobrevive, o identificável não — está
satisfeita. Registrado como divergência da letra, **não** como falha. Quem reler decide se
re-redige a asserção.

## ⚠ A asserção do CR-04 — o vetor que os quase-identificadores não pegam

| | Medido |
|---|---|
| `candidaturas.curriculo_url` contendo o `auth.uid()` | **0** ✅ |
| `candidaturas.curriculo_nome_original` não-nulo | **0** ✅ |

Antes da execução esses dois campos carregavam, em texto claro, o `auth.uid()` dentro do caminho
(`0940e2e8-…/4c096d7e….pdf`) e o nome do arquivo. Nenhuma busca por faixa+UF+vaga+timestamp
acharia isso.

## Re-identificação — o gate

Busca por **faixa etária `35-44` + UF `SP` + vaga + janela de timestamp**, excluindo o próprio
tombstone: **0 linhas**. ✅ A anonimização resiste ao ataque por quase-identificadores.

## O plano, esvaziado — e o que ele registrou

```json
{"previsto":   {"storage_remove":3, "severar_user_id":2, "auth_delete_user":1,
                "scrub_ledger_email":8, "tombstone_candidato":5,
                "severar_fks_set_null":5, "tombstone_decisao_final":2},
 "contagens":  {"storage_remove":3, "severar_user_id":4, "scrub_ledger_email":8,
                "tombstone_candidato":3, "severar_fks_set_null":5,
                "tombstone_decisao_final":3},
 "achados_resumo": {"blob_orfao":1, "nao_devolvidos":0,
                    "ponteiro_morto":0, "fora_do_prefixo":0}}
```

✅ **Nenhum caminho de Storage sobrou** — só contagens, que é o exigido.

⚠ **`blob_orfao: 1`** — o motor **detectou e contou o órfão explicitamente**. Era o caso difícil
do Pitfall 4 (objeto no bucket sem linha que o aponte), e ele foi removido junto: `storage_remove`
= 3 de 3. `fora_do_prefixo: 0` e `ponteiro_morto: 0`.

## As cinco tabelas `SET NULL` — severadas ou desidentificadas

| tabela | depois |
|---|---|
| `logs_acesso` com o `user_id` | **0** — severado |
| `autorizacoes` com o `user_id` | **0** — severado |
| `ai_call_logs` do titular | **0** — removido |
| `recruiter_alerts` do titular | **0** — removido |
| `candidate_ai_decisions` do titular | **1** — ⚠ ver abaixo |

⚠ **`candidate_ai_decisions` sobrevive, e está CORRETO.** Suas colunas `candidato_id` e `vaga_id`
são `NOT NULL` com cláusula `ON DELETE SET NULL` **inexequível** — é a obrigação **M2** que o
smoke registrou (`WINDOWS.md` item 10), com duas saídas: afrouxar as colunas, ou **desidentificar
o conteúdo**. O motor escolheu a segunda:

```
ai_reasoning_summary → "[sumario de raciocinio desidentificado a pedido do titular]"
```

O `candidato_id` aponta para um **tombstone**, não para uma pessoa. Não há caminho de
re-identificação, e a linha continua servindo de registro de que houve avaliação.

## O ledger de e-mail

`notificacoes_enviadas` do titular: 8 linhas, e **o único destinatário registrado é
`anonimizado+317ff71a-…@invalido.local`**. O endereço real foi apagado das 8
(`scrub_ledger_email: 8` bate). Fica o registro de que houve envio, sem o endereço.

---

# ⚠ O que NÃO foi verificado — e não vou marcar como se tivesse

| Item | Por quê |
|---|---|
| **Idempotência por re-invocação** | **Estruturalmente impossível pela EF.** Depois do `deleteUser`, o JWT do titular é recusado: a segunda chamada devolveu **401 `Sessão inválida.`**. O critério «re-invocar e confirmar que nada muda» não é testável por esse caminho — a conta não existe mais para se autenticar. O estado foi re-medido e **não mudou**. |
| **O recibo — conteúdo** | `recibo_enviado_em` está **preenchida** e o ledger **não** registra o envio (asserção 7 ✅, D-45-12/R1). Mas **confirmar que o e-mail chegou, que está em tempo passado, e que NÃO contém nome/CPF/telefone/ids/link autenticado exige abrir a caixa** — é do operador. |
| **A linha obrigatória do WR-A no recibo** | Depende da leitura acima. ⚠ Verificar que «A justificativa escrita pelo recrutador sobre a decisão» **aparece** — se sumir, o conserto de `f67d664` regrediu. |
| **320px** | O `resize_window` não alterou o viewport na FASE 1; o teste não aconteceu. |

---

# Veredito

**Os três sistemas mutaram na ordem imposta, e nada além do titular foi tocado.** As sete
asserções negativas passam (uma com divergência de letra documentada), o CR-04 passa, a
re-identificação devolve zero, o órfão do Pitfall 4 foi detectado e removido, e o SC#5 se
sustenta: o titular segue na faixa `35-44` e `excluidos_sem_data` é **0** — a série EEOC não
foi corrompida.

**Pendente para fechar 5/5:** a leitura do recibo na caixa do operador.
