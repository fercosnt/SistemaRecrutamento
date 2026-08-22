---
phase: 45-motor-de-exclus-o-anonimiza-o
verified: 2026-08-22T05:30:00Z
status: passed
score: 5/5 critérios de sucesso verificados
veredito: >-
  O motor de exclusão foi EXECUTADO EM PRODUÇÃO sobre uma conta descartável, e os três
  sistemas mutaram na ordem imposta — Storage → Postgres → Auth — sem levar junto a trilha
  de decisão. As sete asserções negativas passam, o CR-04 passa, a re-identificação por
  quase-identificadores devolve zero, e o órfão do Pitfall 4 foi detectado e removido.
  Uma divergência de LETRA (não de intenção) está registrada e explicada.
overrides_applied: 0
behavior_unverified: 0
human_verification:
  # ✅ FECHADO em 2026-08-22 — o operador comparou o HTML gerado com o e-mail na tela
  # e confirmou: "tá igual". Os três trechos aparecem ÍNTEGROS no cliente. A truncagem
  # existia apenas no texto COLADO — artefato de seleção, não defeito do sistema.
  # O gerador havia sido executado antes de qualquer acusação (8.691 bytes, os 3 pontos
  # completos), que foi o que evitou registrar um defeito inexistente.
  - test: "REDEPLOY das 3 EFs que mandam e-mail, do terminal do operador (o CLI trava fora de TTY)."
    expected: "executar-direito-titular > v2 (verify_jwt TRUE) · notificar-candidato > v7 e notificar-rh > v2 (ambas verify_jwt FALSE, exigem --no-verify-jwt). Depois disso a logo aparece e os links do e-mail ao RH deixam de apontar para host morto."
    why_human: "⚠ Tentado DUAS vezes pelo agente e travou sem erro visível nas duas — mesmo bloqueio de TTY que o STATE.md já registrava para `supabase login`, agora atingindo `deploy`. Conferido: executar-direito-titular segue em v2 com o mesmo ezbr_sha256, ou seja NADA foi deployado. O caminho MCP foi descartado de propósito: exigiria retranscrever o bundle inteiro, e um byte divergente em código que apaga PII não é risco aceitável (mesmo precedente do 45-01)."
---

# Phase 45 — Verificação

## Veredito

**PASSA.** O motor foi exercitado em produção, ponta a ponta, pela Edge Function com o JWT do
titular — não pela RPC isolada. Evidência completa em `45-11-EVIDENCIA-PORTAO.md`; a montagem do
cenário em `.planning/45-CONTA-DESCARTAVEL.md`.

## Os cinco critérios de sucesso

### SC#1 — o candidato distingue retirar de apagar, e o pedido tem janela de arrependimento

✅ A tela separa «Retirar minha candidatura» (ponteiro em **texto**, sem botão) de «Apagar meus
dados» (CTA próprio). O pedido criou **1 linha** `tipo='exclusao'`, `situacao='agendado'`, com
`executar_em - solicitado_em` = **exatamente 15 dias**, e o Estado B renderiza «Exclusão
agendada» com o botão **Cancelar a exclusão**, persistindo após recarregar.

⚠ **Divergência de copy, medida:** o critério do `45-06` pede a data **por extenso**; a tela
renderiza `06/09/2026`. Não afeta função — registrado para decisão.

### SC#2 — os três sistemas, nessa ordem, idempotente e retomável

✅ Storage **3 → 0**, tombstone completo em Postgres, `auth.users` **30 → 29** (−1 exato). Os
caminhos foram capturados no passo 0 **antes** da primeira mutação: o `plano` persistido registra
`previsto` e `contagens`, e terminou **sem nenhum caminho de Storage**, só com contagens.

⚠ **Idempotência por re-invocação é estruturalmente impossível de testar pela EF**: depois do
`deleteUser` o JWT do titular é recusado (**401 `Sessão inválida.`**). O estado foi re-medido
após a tentativa e **não mudou**.

### SC#3 — ninguém volta do tombstone à pessoa

✅ `user_id` = **NULL** (nenhum tombstone retém `user_id` vivo: 0). As 5 tabelas `SET NULL`
tratadas **explicitamente**: `logs_acesso` e `autorizacoes` severadas, `ai_call_logs` e
`recruiter_alerts` removidas, e `candidate_ai_decisions` **desidentificada no conteúdo** — a
saída da obrigação **M2**, já que suas colunas são `NOT NULL` com `ON DELETE SET NULL`
inexequível. O `candidato_id` dela aponta para um tombstone, não para uma pessoa.

✅ **Re-identificação por faixa etária + UF + vaga + timestamp: 0 linhas.**

✅ **CR-04** — o vetor que os quase-identificadores não pegam: `curriculo_url` contendo o
`auth.uid()` = **0**, `curriculo_nome_original` não-nulo = **0**.

### SC#4 — a trilha de decisão sobrevive, e nenhuma FK foi relaxada

✅ As 3 FKs `NO ACTION` seguem `a, a, a`. `historico_candidatura` **7 = 7** e `decisao_final`
**2 = 2**.

⚠ **`decisao_final_historico` foi de 1 para 2 — divergência da LETRA, não da intenção.** O
`trg_decisao_final_snapshot` é `AFTER UPDATE` **sem `WHEN`** e reinsere `OLD.justificativa`; é a
obrigação **M1** que o smoke `45-04` impôs, exigindo que o scrub do arquivo fosse o **último**
statement do par. **E foi**: as duas linhas estão desidentificadas, e o texto identificável não
sobrevive em lugar nenhum. Quem reler decide se re-redige a asserção.

### SC#5 — a série de bias não é corrompida pela exclusão

✅ `faixa_etaria_materializada` = **`35-44`**, materializada **antes** da anonimização. O
snapshot pós-execução mostra o titular **na mesma faixa** e **`excluidos_sem_data: 0`**. Células
com menos de 5 saem suprimidas, com `supressao_complementar_aplicada: true`.

## Os cinco itens do portão de fase destrutiva do M8

| # | Item | Estado |
|---|---|---|
| 1 | `VERIFICATION.md` com veredito | ✅ este arquivo |
| 2 | Code review bloqueante **ANTES** do apply | ✅ 4 rodadas · `45-REVIEW-4.md`, 2 blockers fechados em `76976bb` |
| 3 | Asserções negativas medidas antes e depois | ✅ 7 + CR-04 + re-identificação, transcritas |
| 4 | Zero `--no-verify` | ✅ em toda a fase |
| 5 | Dry-run pela **mesma query** do delete real | ✅ `(C3)` do smoke, verde 24/24 em PROD |

## O recibo

✅ Chegou. **Tempo passado** em todo o corpo, duas colunas empilhadas, e **nenhum identificador
proibido**: sem nome, CPF, telefone, `candidato_id`, `solicitacao_id`, nome de vaga ou link
autenticado.

✅ **A linha `obrigatorio: true` «A justificativa escrita pelo recrutador sobre a decisão»
APARECE** — o conserto do **WR-A** (`f67d664`) está vivo. Provado por execução nos **três**
recortes, inclusive o majoritário (`temDecisaoRegistrada=false`) que era o quebrado.

✅ **Asserção 7:** o recibo **não** gerou linha em `notificacoes_enviadas` (D-45-12 / R1), e
`recibo_enviado_em` está preenchida.

✅ **Os três trechos que chegaram truncados eram artefato de COLAGEM, não defeito.** O operador
comparou o HTML gerado com o e-mail **na tela** e confirmou: «tá igual». As frases aparecem
íntegras no cliente.

⚠ **A ordem importou aqui:** o gerador foi executado **antes** de qualquer acusação (8.691 bytes,
os 3 pontos completos). Foi isso que evitou registrar um defeito inexistente — e é a mesma
disciplina que, no sentido inverso, expôs o `(B3/email)` como defeito real.

⚠ **Sem logo — DUAS peças, e uma só não resolve.** O asset foi publicado em `c9e43cd`
(`public/logos/`, provado por build: chega em `build/logos/`). O host foi corrigido em `eb6f63d`.
Mas o `LOGO_URL` vive no bundle das **Edge Functions**: sem **redeploy** delas, os e-mails seguem
apontando para o host morto. ⚠ **O redeploy NÃO foi feito** — ver abaixo.

## O ledger de e-mail

`notificacoes_enviadas` do titular: 8 linhas, e o **único** destinatário registrado é
`anonimizado+317ff71a-…@invalido.local`. O endereço real foi apagado das 8 (`scrub_ledger_email:
8` bate com o plano). Fica o registro de que houve envio, sem o endereço.
