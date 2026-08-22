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
