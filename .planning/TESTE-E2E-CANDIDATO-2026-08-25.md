# Teste E2E do fluxo do candidato — 2026-08-25

Cadastro → login → candidatura → análise de IA, percorrido em **produção**
(`rh.beautysmile.com.br`) com conta descartável e vaga de teste isolada.

- **Conta:** `fernandinho.costa.neto+cand1@gmail.com` (plus addressing), criada pelo operador.
- **Vaga:** `teste-e2e-social-media` — cópia da de Social Media, com as 6 perguntas e o knockout.
- **Candidatura:** `d31c78bb-46b4-4585-8b62-1c9e8e3c2e7a`.

---

## ⛔ 1. A ANÁLISE DE IA NUNCA RODA — o defeito mais grave, e era invisível

O trigger `trg_candidaturas_analise` dispara na inscrição, mas a chamada **morre por
timeout** antes de a análise terminar:

```
net._http_response id=116
  status_code : null
  error_msg   : Timeout of 5000 ms reached. Total time: 5002.476 ms
                (DNS 139ms · TCP/SSL 112ms · HTTP Request/Response 4750ms)
```

`net.http_post` tem default de **5 segundos** e nem o trigger
(`20260610000002_analise_trigger.sql:51`) nem o `reprocessar_analise`
(`20260610000003_reprocessar_rpc.sql:72`) passam `timeout_milliseconds`. A Edge Function
chama a API de IA e leva **muito mais que isso**.

**Provado por execução:** o mesmo dispatch, com `timeout_milliseconds := 60000`, completou —
`status = sucesso`, `score_match = 89`, resumo do CV extraído, as 5 competências da rubrica
identificadas como pontos fortes. Só o timeout separava o funcionando do quebrado.

⚠ **Como isso passou despercebido:** as 7 análises que existem no banco são **todas de
2026-08-22** e nenhuma nasceu depois. A inscrição continua funcionando e o candidato é
encaminhado para `triagem` normalmente — o funil parece sadio. O que falta é o score, e a
ausência dele não levanta erro em lugar nenhum. Um dado que **nunca chega** é mais silencioso
que um dado errado.

**Conserto:** passar `timeout_milliseconds` nos dois dispatches. Valor precisa vir de medição —
a execução observada levou dezenas de segundos. Alternativa mais robusta: a EF responder
imediatamente (202) e processar em segundo plano, tornando o timeout irrelevante.

---

## ⛔ 2. Quatro das nove opções de "Como conheceu a vaga?" IMPEDEM o cadastro

| Formulário oferece | `check_como_conheceu` aceita |
|---|---|
| instagram · facebook · linkedin · indicacao · google | ✅ os mesmos |
| **catho · vagas_com · solides** | ❌ não existem no CHECK |
| **outros** | ❌ o banco tem `outro`, no singular |
| — | (o CHECK ainda aceita `site`, que o front não oferece) |

O Zod do front valida contra a **própria** lista (`candidatoSchema.ts:140`), então a tela
aprova; a Edge Function aceita `z.string()` (`_shared/schemas.ts:184`) e repassa; o `INSERT`
quebra no banco. O candidato lê *"Não foi possível registrar o candidato."*

**Reproduzido duas vezes** (23:19 e 23:26, com `Catho`) e resolvido trocando para `Instagram`
(23:31). Nada ficou órfão: `auth.users` e `candidatos` seguiram zerados nas falhas.

⚠ Vale medir quantos cadastros reais foram perdidos por isso. "Outros" costuma ser das
opções mais escolhidas, e a diferença é de **uma letra**.

**Escolha de produto antes do conserto:** a Beauty Smile quer rastrear portais de emprego
(Catho, Vagas.com, Sólides)? Se sim, migration alargando o CHECK; se não, remover do front.
Em ambos os casos, `outros`→`outro` e um teste que trave as duas listas juntas.

---

## 🟡 3. O foco fica preso no campo Número (Etapa 2)

Detalhado em [BUG-foco-preso-numero-endereco.md](BUG-foco-preso-numero-endereco.md).
Reincidiu durante este teste, ao voltar para a etapa: o toast do CEP redisparou e o foco
pulou para o Número.

---

## 🟢 4. Os nomes crus dos blocos viram cabeçalho de seção no formulário

O formulário do candidato exibe `curriculo`, `jornada`, `tecnologia`, `valores` como títulos —
minúsculos, sem acento. São os valores do CHECK de `perguntas_formulario.bloco`, feitos para o
banco, não para leitura humana.

**Conserto:** um mapa de rótulos (`curriculo` → "Sobre sua experiência", `jornada` →
"Disponibilidade", `tecnologia` → "Ferramentas e rotina", `valores` → "Motivação"), ou
simplesmente não renderizar o nome do bloco.

---

## ✅ O que funcionou, e vale registrar

| | |
|---|---|
| Cadastro em 4 etapas | ViaCEP preencheu o endereço; conta criada com `email_confirmed_at` |
| Upload de currículo | PDF aceito, 4.127 bytes, gravado em `curriculo_nome_original` |
| As 6 perguntas | todas gravadas em `respostas_formulario`, na ordem certa |
| **Knockout** | **não disparou** com disponibilidade integral — `motivo_rejeicao = null`, `etapa_atual = triagem`. O sweep rodou e deixou passar, que é o comportamento correto |
| Histórico | `inscricao → triagem`, `auto_rejeitado = false` |
| E-mail de confirmação | enviado e **reconciliado como `entregue`** pelo `resend-webhook` |
| Extração do CV | o `unpdf` leu o PDF e o resumo cita o conteúdo |
| **A rubrica** | a IA nomeou **exatamente as 5 competências** escritas na rubrica como pontos fortes, com 0 gaps e score 89 |

O item da rubrica é o que fecha a cadeia inteira: rubrica escrita → gravada → lida pela Edge
Function → refletida no julgamento. Só faltava o disparo automático chegar até lá.

---

## O que NÃO foi testado

- O **caminho do knockout** (responder "apenas trabalho remoto") — exigiria uma segunda conta.
- A **visão do RH** sobre esta candidatura: painel de triagem, score na tela, botão reprocessar.
- Avaliações (SJT, Big Five, cognitivo) e as etapas seguintes do funil.
