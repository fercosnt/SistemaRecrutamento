# Próximos Passos — guia passo a passo (M7 / v7.0)

**Criado:** 2026-07-28
**Estado:** o pipeline de e-mail está vivo em produção e provado ponta-a-ponta, **mas em
modo `teste`** — nenhum candidato real recebe e-mail ainda.

---

## Entenda a sequência antes de começar

São **duas coisas separadas**, e a ordem protege você:

```
PARTE 1  →  Testar se o e-mail chega na caixa de entrada
            (mandando direto pela API do Resend — o SISTEMA NÃO É TOCADO)
            Risco: zero. Se cair em spam, você descobre aqui.

PARTE 2  →  Ligar o modo produção
            (o sistema passa a mandar e-mail para candidatos de verdade)
            Só faça se a Parte 1 passar.

PARTE 3  →  Duas limpezas de segurança (independentes, pode fazer quando quiser)
```

O motivo de a Parte 1 vir primeiro: hoje **todo** e-mail do sistema vai para o sandbox do
Resend. Ninguém nunca recebeu um e-mail de verdade deste domínio. Se houver problema de
spam/reputação, é melhor descobrir mandando para você mesmo do que ligando o sistema.

---
---

# PARTE 1 — Testar a caixa de entrada

> Aqui você manda um e-mail **direto pela API do Resend**. Isso não passa pelo sistema, não
> cria linha no banco, não afeta candidato nenhum. É só para responder: *"e-mail deste
> domínio chega na inbox ou cai no spam?"*

## Passo 1.1 — Pegar a chave da API

A chave está guardada no Vault do Supabase.

1. Abra https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/sql/new
2. Cole e execute:

```sql
select decrypted_secret from vault.decrypted_secrets where name = 'resend_api_key';
```

3. Copie o valor que aparecer (começa com `re_`).

> ⚠️ **Cuidado com essa chave.** Ela envia e-mail como Beauty Smile. Use só no terminal do
> passo seguinte. **Não** cole em chat, não salve em arquivo, não commite. Depois de usar,
> feche o terminal ou limpe o histórico (`history -c`).

## Passo 1.2 — Mandar o e-mail de teste

Abra o Terminal e cole o comando abaixo, **trocando as duas coisas marcadas**:

- `re_COLE_SUA_CHAVE_AQUI` → a chave do passo 1.1
- `seuemail@gmail.com` → o seu Gmail de verdade

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_COLE_SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Beauty Smile Recrutamento <nao-responda@rh.beautysmile.com.br>",
    "to": "seuemail@gmail.com",
    "reply_to": "rh@beautysmile.com.br",
    "subject": "Teste de entregabilidade — Beauty Smile",
    "html": "<p>Olá,</p><p>Este é um teste de entregabilidade do sistema de recrutamento da Beauty Smile.</p><p>Se você está lendo isto na sua Caixa de entrada (e não no Spam), o domínio de envio está saudável.</p><p>Atenciosamente,<br>Equipe Beauty Smile</p>"
  }'
```

**Resposta esperada:** um JSON com um `id`, tipo `{"id":"abc123-..."}`.
Se vier erro, me chame com a mensagem.

**Repita o mesmo comando** trocando o `to` para o seu **Outlook/Hotmail**.

## Passo 1.3 — Conferir no Gmail

Abra o Gmail e procure o e-mail "Teste de entregabilidade — Beauty Smile".

### ✅ Checklist

- [ ] **Onde chegou?** Tem que estar na **Caixa de entrada**.
      Se estiver em **Spam** ou em **Promoções** com aviso de remetente suspeito → ⚠️ pare
      e me chame.

- [ ] **Como aparece o remetente na lista?** Tem que mostrar **"Beauty Smile Recrutamento"**,
      não o endereço cru `nao-responda@...`.

- [ ] **Os cabeçalhos de autenticação.** Este é o item mais importante:
      1. Abra o e-mail
      2. Clique nos **três pontinhos ⋮** no canto superior direito da mensagem
      3. Clique em **"Mostrar original"** (abre uma aba nova)
      4. No topo aparece um quadro. Confirme os três:

      ```
      SPF:    PASS
      DKIM:   PASS
      DMARC:  PASS
      ```

      Se algum vier `FAIL`, `SOFTFAIL` ou `NEUTRAL` → me chame com o print.

- [ ] **O Reply-To funciona.** Clique em **Responder**. O campo "Para" tem que preencher
      automaticamente com **`rh@beautysmile.com.br`** (e não com `nao-responda@...`).
      Pode mandar a resposta e conferir se chegou nessa caixa.

## Passo 1.4 — Conferir no Outlook/Hotmail

- [ ] Chegou na **Caixa de entrada** (não em Lixo Eletrônico)
- [ ] Remetente aparece como "Beauty Smile Recrutamento"

*(O Outlook não mostra os cabeçalhos tão facilmente quanto o Gmail — se chegou na inbox,
está bom.)*

## Passo 1.5 — Desligar o rastreamento

1. Abra https://resend.com/domains
2. Clique em **`rh.beautysmile.com.br`**
3. Procure **Settings** (ou a aba de configurações do domínio)
4. Confirme que estão **DESLIGADOS**:
   - [ ] **Open tracking** (rastreamento de abertura)
   - [ ] **Click tracking** (rastreamento de cliques)

**Por que desligar:** o rastreamento reescreve os links do e-mail e injeta um pixel
invisível. Isso (a) piora a reputação de entregabilidade, (b) é coleta de dado
comportamental do candidato que ninguém pediu — desnecessário para e-mail transacional e
questionável sob a LGPD.

---

## ⛔ Se algo falhar na Parte 1

**Não siga para a Parte 2.** Me chame com o que apareceu. O DNS está correto (confirmei
SPF, DKIM e MX por `dig`, e o DMARC é herdado do domínio raiz), então uma falha aqui seria
reputação de domínio novo — o que se resolve com aquecimento gradual, não com configuração.

---
---

# PARTE 2 — Ligar o modo produção

> Só depois da Parte 1 passar em tudo.

## Passo 2.1 — Checar que o ledger está vazio

Se houver e-mails represados, a varredura automática dispara todos de uma vez ao ligar.

1. Abra https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/sql/new
2. Execute:

```sql
select count(*) as linhas, status::text
  from public.notificacoes_enviadas
 group by status;
```

- [ ] **Resultado esperado: nenhuma linha** (tabela vazia). Era 0 quando fechei o milestone.
- Se aparecer alguma coisa com status `pendente` ou `falhou` → me chame antes de ligar.

## Passo 2.2 — Saber o que passa a ser real

A partir do flip, **estes 4 eventos mandam e-mail para pessoas de verdade**:

| Evento | Quando dispara |
|---|---|
| Confirmação de candidatura | **toda** submissão de candidatura |
| Avanço para avaliação | candidatura vai para `avaliacao_assincrona` |
| Convite de entrevista | agendamento criado (com anexo `.ics`) |
| Decisão | aprovação **ou** recusa |

- [ ] Li e entendi que isso passa a ser real

## Passo 2.3 — Virar a chave

1. Abra https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/settings/functions
2. Ache o secret **`NOTIFICACOES_MODO`** (você criou hoje com o valor `teste`)
3. Mude o valor para:

```
producao
```

**Exatamente assim:** minúsculo, sem acento, sem aspas, sem espaço.
Qualquer outra coisa (`Produção`, `PROD`, `production`) cai de volta em `teste` — é
proposital, ligar a produção tem que ser deliberado.

4. Salve.

> Não precisa fazer redeploy. A função lê esse valor a cada requisição.

## Passo 2.4 — Testar com uma candidatura SUA

Você tem 3 candidaturas de teste com o **seu próprio e-mail** (`fernando@beautysmile.com.br`).
Vamos usar uma delas para provar o caminho real, sem tocar em candidato nenhum.

**Candidatura escolhida:** `[TESTE] Auxiliar de Saúde Bucal (ASB)`
ID: `0f09fed1-e6ba-4a16-946f-81a979b98d68` (hoje na etapa `triagem`)

### Disparar

No SQL Editor, execute — isto move a candidatura para "avaliação assíncrona", o que dispara
o e-mail de **avanço**:

```sql
update public.candidaturas
   set etapa_atual = 'avaliacao_assincrona'
 where id = '0f09fed1-e6ba-4a16-946f-81a979b98d68';
```

Espere **uns 15 segundos**.

### Conferir no banco

```sql
select modo,
       destinatario_email,
       destinatario_original,
       status::text,
       ultimo_erro
  from public.notificacoes_enviadas
 where candidatura_id = '0f09fed1-e6ba-4a16-946f-81a979b98d68';
```

**✅ Deu certo se:**

| Campo | Valor esperado |
|---|---|
| `modo` | **`producao`** |
| `destinatario_email` | **`fernando@beautysmile.com.br`** |
| `destinatario_original` | `fernando@beautysmile.com.br` (igual ao de cima) |
| `status` | `enviado` ou `entregue` |
| `ultimo_erro` | vazio (`null`) |

**❌ Não pegou se:** `destinatario_email` ainda mostrar `delivered+...@resend.dev`.
Nesse caso o secret não foi salvo — volte ao passo 2.3.

### Conferir na caixa

- [ ] Chegou um e-mail em `fernando@beautysmile.com.br` com assunto
      **"Sua candidatura avançou — [TESTE] Auxiliar de Saúde Bucal (ASB)"**

### Limpar depois do teste

```sql
-- devolve a candidatura para triagem (a justificativa é exigida pelo sistema
-- em qualquer retrocesso de etapa — é um controle de auditoria, não um bug)
update public.candidaturas
   set etapa_atual = 'triagem',
       etapa_justificativa = 'Reversao de teste de go-live 2026-07-28'
 where id = '0f09fed1-e6ba-4a16-946f-81a979b98d68';

update public.candidaturas
   set etapa_justificativa = null
 where id = '0f09fed1-e6ba-4a16-946f-81a979b98d68';

-- remove a linha do teste do ledger
delete from public.notificacoes_enviadas
 where candidatura_id = '0f09fed1-e6ba-4a16-946f-81a979b98d68';

-- remove a linha de histórico criada pelo teste
delete from public.historico_candidatura
 where candidatura_id = '0f09fed1-e6ba-4a16-946f-81a979b98d68'
   and criado_em::date = current_date;
```

*(Voltar para `triagem` não dispara e-mail — o sistema só notifica avanço, convite e decisão.)*

## Passo 2.5 — Se der errado: rollback

Volte o secret `NOTIFICACOES_MODO` para `teste`.

Vale **na hora**, sem redeploy — a função lê o modo a cada requisição. A partir daí todo
e-mail volta para o sandbox.

### As outras 2 candidaturas de teste com seu e-mail

Guardadas caso queira testar outros eventos:

| ID | Vaga |
|---|---|
| `04864650-61d9-4bb9-9ccf-083318319f98` | `[TESTE] Coordenador de Recursos Humanos` |
| `387e91c0-cc39-4d7e-943f-f4de3fb01171` | `Dev Backend` |

Para testar o e-mail de **decisão/aprovação**, troque `avaliacao_assincrona` por `aprovado`
no comando do passo 2.4. O assunto deve vir **"Boa notícia sobre sua candidatura"**.

> ⚠️ Cada candidatura só manda **um** e-mail por tipo de evento (proteção contra duplicata,
> vale 24h no Resend também). Para repetir um teste, use outra candidatura da lista.

---
---

# PARTE 3 — Duas limpezas de segurança

Independentes das partes 1 e 2. Nenhuma bloqueia operação, mas as duas são credenciais ou
superfícies vivas que ninguém está monitorando.

## 3a. Desligar o n8n antigo

1. Entre em `fernandocosta.app.n8n.cloud`
2. Ache a(s) workflow(s) de recrutamento
3. **Desative ou apague**
4. Se houver credenciais do Supabase salvas dentro do n8n → **revogue**

**Por que importa:** o banco e o código já não chamam mais o n8n — a Phase 39 removeu os 4
gatilhos e o disparo hardcoded. Mas enquanto a workflow existir e estiver ativa, ela
continua sendo um **endereço público que qualquer um pode acionar**. "Ninguém chama" não é
o mesmo que "não pode ser chamada". E se ela tiver credenciais do banco guardadas dentro,
isso é uma porta de entrada paralela ao sistema.

## 3b. Revogar a chave Resend duplicada

Está registrado no histórico do projeto que, ao provisionar a chave do Resend, a primeira
tentativa **gravou no projeto Supabase errado** — e essa cópia nunca foi removida.

1. Descubra em qual outro projeto Supabase ela foi parar
2. No SQL Editor **daquele** projeto:

```sql
-- primeiro veja se existe (não mostra o valor)
select id, name, created_at from vault.secrets where name = 'resend_api_key';

-- depois remova, usando o id retornado acima
select vault.delete_secret('<cole-o-id-aqui>');
```

**Por que importa:** é uma credencial capaz de enviar e-mail como Beauty Smile, viva, num
projeto que ninguém acompanha. Se vazar, alguém manda e-mail se passando pela empresa.

---
---

# ✅ O que já está pronto (não precisa verificar)

| Item | Estado |
|---|---|
| Domínio `rh.beautysmile.com.br` | **Verified** no Resend |
| DNS: SPF, DKIM, MX | Publicados, confirmados por `dig` |
| DMARC | **Herdado do domínio raiz** (`p=quarantine`) — **não há DNS pendente** |
| `resend_api_key` no Vault | ✅ |
| `resend_webhook_secret` no Vault | ✅ (você provisionou) |
| Webhook registrado no Resend | ✅ (delivered / bounced / complained) |
| EF `notificar-candidato` | **v5** ACTIVE (com as correções CR-01, CR-02, W-01) |
| EF `resend-webhook` | **v1** ACTIVE |
| Migration `20260727000001` | Aplicada + ledger reconciliado + smoke 5/5 |
| Cron de retry (15 em 15 min) | Ativo |
| Gatilhos do n8n no banco | **0** (removidos) |
| Tabela `notificacoes_enviadas` | 0 linhas (limpa) |

## Já provado em produção

- Aprovação real → e-mail **"Boa notícia sobre sua candidatura"** com a cópia de aprovação,
  sem nenhum traço da recusa *(o defeito crítico CR-01 está morto)*
- Knockout → **zero e-mail**, zero linha no banco *(CR-02 morto)*
- Envio real → `enviado` → webhook do Resend → `entregue` em **5 segundos**
- Webhook forjado, sem assinatura, ou replay → **400**, nenhuma escrita
- Reenvio duplicado → bloqueado em **duas camadas** (nosso banco + idempotência do Resend)

---

# Débito opcional (nada bloqueia)

| Item | Como resolver |
|---|---|
| Cobertura Nyquist | 4 fases em `draft`, 2 sem arquivo → `/gsd-validate-phase N` |
| `.husky/pre-commit` sempre vermelho | Baseline de 97 erros `tsc`; força `--no-verify` em todo commit |
| 7 migrations órfãs no ledger | Drift pré-existente, causa nunca identificada |
| W-1 | Histórico mostra UUID do recrutador em vez do nome |
| DBMIG-01 · CC0-01 | Carregados de M4–M6 |
| Rate-limit do Resend | Nunca medido (free: 100/dia, 3.000/mês, 10 req/s) |

Rastreados em `.planning/todos/pending/`.

---

# Próximo ciclo

```
/gsd-new-milestone
```

Fases continuam a partir da **Phase 42**. Ideias no inbox: go-live da comunicação, W-1,
DBMIG-01, TALENT (banco de talentos), LGPD-OPS (retenção/Art. 20), PSICO, relatórios +
export.

---

# Referências

| Documento | O quê |
|---|---|
| `.planning/milestones/v7.0-MILESTONE-AUDIT.md` | Auditoria completa, 21/21 requisitos |
| `.planning/milestones/v7.0-phases/39-*/39-VERIFICATION.md` | Os 2 defeitos críticos e a prova de que fecharam |
| `.planning/milestones/v7.0-phases/41-*/41-VERIFICATION.md` | Prova ponta-a-ponta do webhook |
| `.planning/milestones/v7.0-phases/36-*/36-HUMAN-UAT.md` | UAT-36-1 original (teste de inbox) |
| `.planning/RETROSPECTIVE.md` | Lições do ciclo |
| `docs/runbooks/resend-dominio-envio.md` | Runbook do domínio de envio |
