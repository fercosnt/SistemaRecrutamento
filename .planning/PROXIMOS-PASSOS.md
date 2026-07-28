# Próximos Passos — o que fazer e testar (M7 / v7.0)

**Criado:** 2026-07-28
**Contexto:** o milestone v7.0 (Comunicação com o Candidato) foi fechado e arquivado.
Todo o pipeline está vivo em produção e provado ponta-a-ponta — **mas em modo `teste`**,
o que significa que **nenhum candidato real recebe e-mail ainda**.

Este arquivo é o handoff. Faça na ordem: os itens 1 → 2 são sequenciais e o 1 protege o 2.

---

## Onde as coisas estão

| Coisa | Onde |
|---|---|
| Supabase (projeto PROD) | `isljnozzlvckrgjjbjwp` |
| Painel Resend | https://resend.com |
| Secrets da Edge Function | Supabase → **Project Settings → Edge Functions** |
| Webhook registrado | `https://isljnozzlvckrgjjbjwp.supabase.co/functions/v1/resend-webhook` |
| Domínio remetente | `rh.beautysmile.com.br` (**Verified** ✅) |
| Remetente | `nao-responda@rh.beautysmile.com.br` · Reply-To `rh@beautysmile.com.br` |

---

## 🔴 1. Teste de caixa de entrada — FAÇA ANTES DE LIGAR PRODUÇÃO

> **Por que primeiro:** tudo que foi testado até agora foi para o *sandbox* do Resend
> (`@resend.dev`). **Nenhum e-mail chegou a uma caixa de entrada real ainda.** Se houver
> problema de spam, você quer descobrir com a sua própria caixa — não com um candidato.

Este é o **UAT-36-1**, o único teste do milestone que continua aberto.

### Como fazer

Envie um e-mail de teste **de** `nao-responda@rh.beautysmile.com.br` **para** duas contas
suas: uma **Gmail** e uma **Outlook/Hotmail**. (Dá para disparar pelo painel do Resend.)

### Checklist

- [ ] Chegou na **Caixa de entrada** no Gmail — não em Spam, não em Promoções
- [ ] Chegou na **Caixa de entrada** no Outlook/Hotmail — não em Lixo Eletrônico
- [ ] No Gmail: abrir o e-mail → menu ⋮ → **"Mostrar original"** → confirmar os três:
  - [ ] `SPF: PASS`
  - [ ] `DKIM: PASS`
  - [ ] `DMARC: PASS`
- [ ] O remetente aparece na lista como **"Beauty Smile Recrutamento"** (não como e-mail cru)
- [ ] Responder o e-mail → a resposta chega em **`rh@beautysmile.com.br`**
- [ ] No Resend → Domains → `rh.beautysmile.com.br` → **Settings**: open tracking e click
      tracking estão **DESLIGADOS**

### Se cair em spam

Não ligue a produção. O DNS está correto (SPF/DKIM/MX confirmados, DMARC herdado do
domínio raiz com `p=quarantine`), então o problema seria reputação de domínio novo —
subdomínio recém-verificado costuma precisar de aquecimento. Nesse caso me chame.

---

## 🟠 2. Ligar a produção

> Só depois do item 1 passar.

Esta é a **única** chave entre o pipeline provado e o candidato real.

### Antes de virar, confirme

- [ ] O ledger está vazio (senão a varredura dispara o acumulado de uma vez):
  ```sql
  select count(*) from public.notificacoes_enviadas;
  ```
  Esperado: **0** (era 0 no fecho do milestone)

- [ ] Você sabe que **estes 4 eventos passam a mandar e-mail para pessoas**:
  1. `confirmacao` — candidatura recebida (dispara em **toda** submissão)
  2. `avanco` — avanço para avaliação assíncrona
  3. `convite` — convite de entrevista (com anexo `.ics`)
  4. `decisao` — aprovação **ou** recusa

### Como virar

Supabase → **Project Settings → Edge Functions** → secret `NOTIFICACOES_MODO`:

```
teste  →  producao
```

Valor exato: `producao` — minúsculo, sem acento, sem aspas. **Qualquer outra coisa cai em
`teste`** (é fail-safe por design: ligar a produção tem que ser um ato deliberado).

### Como verificar que pegou

No primeiro evento real depois do flip:

```sql
select modo, destinatario_email, destinatario_original, status, criado_em
  from public.notificacoes_enviadas
 order by criado_em desc limit 1;
```

- ✅ **Certo:** `modo='producao'` e `destinatario_email` **igual** ao `destinatario_original`
- ❌ **Não pegou:** `destinatario_email` ainda mostra `delivered+...@resend.dev`

### Rollback

Volte o secret para `teste`. Vale **imediatamente**, sem redeploy — a função lê o modo a
cada requisição, não na inicialização.

---

## 🟡 3. Duas limpezas de segurança

Independentes entre si e dos itens acima. Nenhuma bloqueia operação, mas as duas são
credenciais/superfícies vivas que ninguém está monitorando.

### 3a. Desligar o n8n antigo

- [ ] Entrar em `fernandocosta.app.n8n.cloud`
- [ ] **Desativar ou apagar** a(s) workflow(s) de recrutamento
- [ ] Se houver credenciais do Supabase guardadas dentro do n8n → **revogar**

**Por que importa:** o banco e o código já não chamam mais o n8n (a Phase 39 removeu os 4
triggers e o `fetch` hardcoded). Mas enquanto a workflow existir e estiver ativa, ela
continua sendo um **endpoint público acionável** — "ninguém chama" não é o mesmo que "não
pode ser chamada". Se ela tiver credenciais dentro, é um caminho de acesso paralelo ao
sistema.

Detalhes: `.planning/todos/pending/m7-cleanup-n8n-cloud.md`

### 3b. Revogar a chave Resend duplicada

- [ ] Encontrar o **projeto Supabase errado** onde a chave foi gravada por engano
- [ ] Rodar `select vault.delete_secret(<uuid>);` para a linha `resend_api_key` lá

**Por que importa:** está registrado no UAT-36-2 que a primeira tentativa de provisionar a
chave gravou no projeto errado e **a cópia nunca foi removida**. É uma credencial de envio
viva, num projeto que ninguém acompanha. Se vazar, alguém envia e-mail como Beauty Smile.

---

## ✅ O que JÁ está pronto (não precisa fazer nada)

Para você não gastar tempo re-verificando:

| Item | Estado |
|---|---|
| Domínio `rh.beautysmile.com.br` | **Verified** no Resend |
| DNS (SPF, DKIM, MX) | Publicados e confirmados por `dig` |
| DMARC | **Coberto por herança** do domínio raiz (`p=quarantine`, RFC 7489) — **não há DNS pendente** |
| `resend_api_key` | No Vault |
| `resend_webhook_secret` | No Vault (você provisionou) |
| Webhook no dashboard Resend | Registrado (delivered/bounced/complained) |
| EF `notificar-candidato` | **v5** ACTIVE — com as correções CR-01, CR-02 e W-01 |
| EF `resend-webhook` | **v1** ACTIVE |
| Migration `20260727000001` | Aplicada + ledger reconciliado + smoke 5/5 |
| Cron `notif-retry-sweep` | Ativo, a cada 15 min |
| Triggers do n8n no banco | **0** (removidos) |
| Ledger `notificacoes_enviadas` | 0 linhas (limpo) |

### Já provado em produção nesta sessão

- Aprovação real → e-mail com **"Boa notícia sobre sua candidatura"** e cópia de aprovação
  (nunca a de recusa) — o defeito CR-01 está morto
- Knockout → **zero e-mail**, zero linha no ledger (`skipped:knockout`) — CR-02 morto
- Envio real → `enviado` → webhook real do Resend → `entregue` em **5 segundos**
- Webhook forjado / sem assinatura / replay → **400**, zero escrita
- Reenvio duplicado → bloqueado em duas camadas (nosso banco + idempotência do Resend)

---

## Débito opcional (nada bloqueia)

| Item | Como resolver |
|---|---|
| Cobertura Nyquist | 4 fases em `draft`, 2 sem arquivo → `/gsd-validate-phase N` |
| `.husky/pre-commit` sempre vermelho | Baseline de 97 erros `tsc`; hoje força `--no-verify` em todo commit |
| 7 migrations órfãs no ledger | Drift pré-existente, causa nunca identificada |
| W-1 | Histórico mostra UUID do recrutador em vez do nome |
| DBMIG-01 · CC0-01 | Carregados de M4–M6 |
| Rate-limit do Resend | Nunca medido (free tier: 100/dia, 3.000/mês, 10 req/s) |
| Ramo `status='rejeitado'` do survivor-guard | Não exercitado ao vivo (guard de auditoria impede, corretamente) |

Rastreados em `.planning/todos/pending/`.

---

## Próximo ciclo

Quando quiser abrir o próximo milestone:

```
/gsd-new-milestone
```

As fases continuam a partir da **Phase 42**. Inbox de ideias: go-live da comunicação,
W-1, DBMIG-01, TALENT (banco de talentos), LGPD-OPS (retenção/Art. 20), PSICO, relatórios
completos + export.

---

## Referências

| Documento | O quê |
|---|---|
| `.planning/milestones/v7.0-MILESTONE-AUDIT.md` | Auditoria completa, 21/21 requisitos |
| `.planning/milestones/v7.0-phases/39-*/39-VERIFICATION.md` | Os 2 defeitos críticos e como foram provados fechados |
| `.planning/milestones/v7.0-phases/41-*/41-VERIFICATION.md` | Prova ponta-a-ponta do webhook |
| `.planning/milestones/v7.0-phases/36-*/36-HUMAN-UAT.md` | UAT-36-1 detalhado (o teste de inbox) |
| `.planning/RETROSPECTIVE.md` | Lições do ciclo |
| `.planning/todos/pending/` | Débito rastreado |
| `docs/runbooks/resend-dominio-envio.md` | Runbook do domínio de envio |
