---
tipo: evidencia-operacional
criado: 2026-08-22
proposito: conta descartável do RUNBOOK-45-06-T2-E-45-11-T3 (FASE 0)
estado: FASE 0 em andamento
---

# Conta descartável — `45-06` T2 + `45-11` T3

⚠ **Esta conta existe para ser APAGADA.** Ela é o sujeito da execução real e irreversível da
FASE 2. Nenhuma conta de pessoa real é tocada pelo runbook.

## Identificadores

| Campo | Valor |
|---|---|
| `candidato_id` | `317ff71a-6e61-476c-a123-335dfe2f9994` |
| `user_id` (auth) | `0940e2e8-9080-455c-a60d-c0c62b1c5ec7` |
| e-mail | `fernandinhocostaneto@icloud.com` (caixa do operador, para ler o recibo) |
| senha | `TesteP45descartavel1` |
| nome | `Zorilda Testequilha Descartavel` |
| nascimento | `1990-03-15` · cidade `São Paulo` / `SP` |
| criada em | `2026-08-22 01:24:04-03` |
| host de produção | `https://rh.beautysmile.com.br` |

> O nome é deliberadamente raro: a busca de re-identificação da FASE 2 só significa alguma
> coisa se o quase-identificador for distintivo.

## Consentimento — gravado pelo fluxo REAL, não fabricado

O cadastro foi feito pelo navegador, etapa por etapa. Criar a linha por SQL teria **fabricado**
o registro de consentimento — escrever no sistema de LGPD a afirmação de que alguém consentiu
quando ninguém consentiu. É o mesmo argumento que barrou a criação por SQL da conta A.

| Campo | Valor | Confere |
|---|---|---|
| `consent_text_version` | `v2-2026-08` | ✅ |
| `consent_text_hash` | presente | ✅ |
| `consent_registrado_em` | `2026-08-22 01:24:04.814-03` | ✅ |
| `policy_version` | `v1.0-2026-04` | ✅ |
| `ip_aceite` | presente | ✅ |
| `autorizacao_uso_dados` | `true` (obrigatória, marcada) | ✅ |
| `autorizacao_comunicacao` | `true` | ✅ |
| `autorizacao_retencao_curriculo` | **`true`** (marcada de propósito — ver abaixo) | ✅ |
| `autorizacao_marketing_vagas` | **`false`** | ✅ bate com a caixa deixada desmarcada |
| `autorizacao_analise_video` | `null` | ✅ |
| `faixa_etaria_materializada` | `null` | ✅ correto — só é materializada na exclusão |

### Por que a caixa de retenção foi MARCADA

Ela normalmente seria deixada desmarcada, mas foi marcada por dois motivos:

1. **Não afeta a exclusão.** `autorizacao_retencao_curriculo` aparece em
   `20260805000006_p45_anonimizar_candidato.sql`, mas **só dentro da fixture da
   auto-verificação** — e aquela fixture a marca `true` e mesmo assim exige exclusão completa.
   O motor não ramifica nela: um pedido do Art. 18 sobrevém ao consentimento de retenção.

2. **Ela fecha o §A da Phase 43 de carona.** O bloco de guarda do currículo só renderiza o ramo
   `autorizado === true` (`GuardaCurriculoBloco.tsx:114`), e a conta de teste anterior tinha
   justamente aquela caixa desmarcada. Com esta conta dá para observar o ramo autorizado
   **antes** de a FASE 2 apagá-la — poupando a criação de uma conta A separada.

## Invariantes da UI-SPEC conferidos ao vivo no cadastro

- ✅ As duas opcionais **nascem desmarcadas**
- ✅ O canal transacional é **linha informativa, não controle** («Não é possível desativar»), com
  base legal citada (Art. 7º, V)
- ✅ **Zero menção** a análise de vídeo
- ✅ Os dois eixos de versão **nomeados separadamente**: «Política de Privacidade na versão
  **v1.0-2026-04** · texto destas autorizações na versão **v2-2026-08**»
- ✅ **A copy do canal já é a nova**: «escreva para o nosso **canal de privacidade**:
  lgpd@beautysmile.com.br» — o conserto de `f8e76e2` está vivo em produção
- ⚠ O achado cosmético registrado no roteiro (o ponto final caindo sozinho depois de «Seus dados
  e autorizações») **NÃO reproduziu** nesta largura; o ponto está colado

## Vagas ativas disponíveis para as candidaturas

| id | título |
|---|---|
| `a32fe930-6b17-46f4-842e-04aa8d250d99` | [TESTE] Dentista — Funil E2E |
| `bc370a8b-4aff-4417-a304-1a53fa33cae5` | [TESTE] Analista de Marketing Digital |
| `53b73af6-d397-4dbb-8c77-7935e320a6c5` | [TESTE] Coordenador de Recursos Humanos |
| `53f75c81-a152-43d8-87d3-03a275f678b9` | [TESTE] Auxiliar de Saúde Bucal (ASB) |
| `9f6ccf1a-ef25-4425-a312-6cc2a23a388e` | Dev Backend |

## ✅ FASE 0 COMPLETA — 2026-08-22

- [x] Conta descartável criada pelo fluxo real, consentimento honesto
- [x] Duas candidaturas, ambas com currículo, pelo formulário real
- [x] `historico_candidatura.ator` = titular
- [x] `decisao_final` com justificativa ≥50 + `decisao_final_historico`
- [x] **TRÊS objetos no Storage — 2 com ponteiro e 1 ÓRFÃO** (Pitfall 4)
- [x] Fixture nas seis satélites
- [x] Medição ANTES transcrita

### As candidaturas

| # | `candidatura_id` | vaga | `curriculo_url` |
|---|---|---|---|
| 1 | `c912aa17-f348-407c-8f31-b427aade75fa` | [TESTE] Dentista — Funil E2E | `0940e2e8…/4c096d7e….pdf` |
| 2 | `a111296a-4a56-4eda-a6b8-3c5312048e3a` | [TESTE] Analista de Marketing Digital | `0940e2e8…/667e3b7b….pdf` |

⚠ **O `curriculo_url` confirma o vetor do CR-04 no concreto:** o `auth.uid()`
(`0940e2e8-…`) está em **texto claro** dentro do caminho, e `curriculo_nome_original` carrega o
nome do arquivo. É exatamente o que aquela asserção separada existe para pegar — e o que a busca
por quase-identificadores **não** pegaria.

### O órfão do Pitfall 4 — como foi produzido, e por que assim

| objeto | ponteiro | bytes |
|---|---|---|
| `0940e2e8…/4c096d7e….pdf` | ✅ candidatura 1 | 736 |
| `0940e2e8…/667e3b7b….pdf` | ✅ candidatura 2 | 613 |
| `0940e2e8…/b1b67760….pdf` | ❌ **NENHUM** | 212 |

A aplicação **não tem caminho normal de re-upload que orfane**: `cvUploadService` usa
`upsert: false` («fresh UUID per call») e o `FormularioCandidaturaPage` faz rollback com
`removeCV` se o INSERT falhar. O órfão real nasce quando **esse rollback falha** — e é esse
estado que a fixture reproduz.

Ele foi criado pela **mesma API de Storage que o app usa, autenticado como o próprio titular**
(token da sessão do navegador, chave publicável, `x-upsert: false`) — não por `INSERT` em
`storage.objects`, que criaria metadado sem bytes e não exercitaria a varredura de verdade.

### Medição ANTES — 2026-08-22

| Medida | Valor |
|---|---|
| `historico_candidatura` (total) | **7** |
| `decisao_final` (total) | **2** |
| `decisao_final_historico` (total) | **1** |
| `auth.users` (total) | **30** |
| `candidatos` / `candidaturas` (total) | **23 / 11** |
| Storage sob o prefixo do titular | **3** (2 com ponteiro + 1 órfão) |
| `historico_candidatura.ator` = titular | **1** |
| `logs_acesso` do titular | **1** |
| `recruiter_alerts` do titular | **1** |
| `ai_call_logs` do titular | **1** |
| `candidate_ai_decisions` do titular | **1** |
| `autorizacoes` do titular | **1** |
| `notificacoes_enviadas` do titular | **2** (confirmações, `entregue`) |

⚠ **As três tabelas de IA e alertas estavam VAZIAS em produção** (`ai_call_logs`,
`candidate_ai_decisions`, `recruiter_alerts` = 0 linhas). Sem estas fixtures, as asserções da
FASE 2 sobre as 5 tabelas `SET NULL` passariam por **vacuidade** — contariam verde sem ter
medido nada. É o modo de falha que o runbook existe para evitar.

---

# ✅ FASE 1 — o pedido AGENDA · `45-06` Task 2 · 2026-08-22

**Nada foi apagado.** O pedido é cancelável até 06/09/2026 pelo botão da própria página.

## 1a. Sonda de fronteira — passa, e pelo critério certo

| Requisição | Status | Corpo |
|---|---|---|
| **sem** `Authorization` | 401 | `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}` — **gateway** |
| **com** publishable key | 401 | `{"ok":false,"error_code":"UNAUTHORIZED","message":"Sessão inválida."}` — **handler** |

⚠ **Os dois são 401 — e é por isso que o discriminador é a DIFERENÇA entre os corpos, nunca o
401 sozinho.** A segunda resposta é string do próprio `index.ts`, inalcançável se o módulo
tivesse morrido no boot: o import de `_shared/` sobreviveu ao bundler.

## 1b. A tela — 8 checagens

| # | Item | Resultado |
|---|---|---|
| 1 | Seção 4 abaixo da 3, seções 1–3 intactas | ✅ |
| 2 | CTA glass-branco, ≥44px, não full-bleed | ✅ **medido**: altura **50px**, largura 194 de 540 (não full-bleed), `rgba(255,255,255,0.15)` |
| 3 | Prosa da consequência inteira, «o que o cancelamento NÃO desfaz» em parágrafo próprio | ✅ |
| 4 | Ponteiro para «Retirar minha candidatura» em texto, sem link/botão | ✅ |
| 5 | Confirmação em **duas etapas** | ✅ diálogo + «Confirmar a exclusão dos seus dados?» |
| 6 | Estado B «Exclusão agendada» | ✅ com a data e a nota de que cancelar não reabre |
| 7 | **Persiste após recarregar** | ✅ — não é estado local |
| 8 | 320px sem rolagem horizontal | ⚠ **NÃO EXECUTADA** — ver abaixo |

⚠ **A checagem de 320px não foi feita, e não vou marcá-la como passou.** O `resize_window` para
320×800 **não alterou o viewport** (`clientWidth` seguiu em 1425), então o teste não aconteceu.
No viewport real medido não há overflow (`scrollWidth == clientWidth`, zero elementos
estourando), mas isso não é a mesma afirmação. **Fica como item de navegador em aberto.**

⚠ **DIVERGÊNCIA MEDIDA — a data não está por extenso.** O critério de aceitação do `45-06` pede
«**Exclusão agendada**» com a **data por extenso**. A tela renderiza **`06/09/2026`**, formato
numérico. É o único item do `45-06` que diverge do escrito. Não afeta função; é decisão de copy,
e está registrado aqui em vez de silenciado.

## 1c. As asserções — todas verdes

| Asserção | Esperado | Medido |
|---|---|---|
| Linha nova em `solicitacoes_dados` | 1, `tipo='exclusao'`, `situacao='agendado'` | ✅ `ccd44bb0-…` |
| `executar_em - solicitado_em` | **15 dias** | ✅ **15** |
| `cancelado_em` / `atendido_em` / `causa` | NULOS | ✅ os três |
| Candidaturas `encerrada_a_pedido_em` | preenchida | ✅ **2** |
| Candidaturas `deleted_at` | **NULL** (RH continua vendo) | ✅ **0** |
| `historico_candidatura` total | inalterado (7) | ✅ **7** |
| ⊖ `auto_rejeitado = true` | **0** | ✅ **0** |
| ⊖ `notificacoes_enviadas` com `evento='decisao'` | **0** | ✅ **0** |
| ⊖ pedido de exclusão na fila de acesso do RH | **0** | ✅ **0** |
| ⊖ `contar_pedidos_dados_pendentes()` | não conta | ✅ **0** |
| ⊖ Storage sob o prefixo | **intacto (3)** | ✅ **3** |
| ⊖ `auth.users` | **intacto (30)** | ✅ **30** |
| **Idempotência** | mesma data, sem linha nova | ✅ 200, **mesma** `executar_em`, `candidaturas_encerradas: 0`, total segue **1** |

⚠ **O guard da fila de RH mordeu de verdade:** `listar_pedidos_dados()` recusou com **`42501`**
quando chamado sem claims. A asserção só pôde ser medida impersonando `app_metadata.role =
administrador` — que é o guard funcionando, não um obstáculo.

⚠ **E ao ler o guard, um achado que corrobora o BD-8 por outro ângulo:** ele aceita
`'administrador'` **ou `'rh'`** — e `'rh'` é um papel que `usuarios_rh` **nunca atribui** (só
existem `administrador` e `recrutador`). O código ramifica num valor que o sistema não produz.

## 1d. Os e-mails que a FASE 1 disparou 📧

`notificacoes_enviadas` foi de 2 para **8**. As seis novas são **todas ao RH**, nenhuma ao
candidato: `candidatura_encerrada_a_pedido` × 3 destinatários × 2 candidaturas.

| Destinatário | Entregues |
|---|---|
| `fernando@beautysmile.com.br` | 2 · `entregue` |
| `recrutador.rh@teste.com` | 2 · `entregue` |
| `e2e.admin@beautysmile.com.br` | 2 · `enviado` |

É o comportamento correto — o RH é avisado de que uma candidatura foi encerrada a pedido do
titular — e nenhuma delas é `evento='decisao'`, que é o que a asserção negativa exige.

---

### Achados incidentais da FASE 0

1. **O pipeline COMM do M7 funciona ao vivo.** As duas candidaturas dispararam confirmação e as
   duas chegaram: `status = entregue`, `modo = producao`, em ~150 ms.

2. **O trigger de IP aplicado hoje funciona como desenhado.** O `INSERT` em `logs_acesso` sem
   `x-forwarded-for` (chamada MCP, não PostgREST) gravou `ip_address = NULL` — a resposta
   honesta, nunca um valor inventado.

3. **`decisao_final` só tem gatilhos de `UPDATE`.** Um `INSERT` não dispara notificação — por
   isso a fixture da decisão não contaminou a asserção nº 5 nem mandou e-mail.

4. **O primeiro clique em «Candidatar-se a esta vaga» não registra**, nas duas vagas; o segundo
   sim. Provável estado de carregamento sem feedback visual. Cosmético, mas reprodutível.

5. **O achado cosmético do roteiro não reproduziu**: o ponto final depois de «Seus dados e
   autorizações» está colado nesta largura.
