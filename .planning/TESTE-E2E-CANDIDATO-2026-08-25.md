# Teste E2E do fluxo do candidato — 2026-08-25

Cadastro → login → candidatura → análise de IA, percorrido em **produção**
(`rh.beautysmile.com.br`) com conta descartável e vaga de teste isolada.

- **Conta:** `fernandinho.costa.neto+cand1@gmail.com` (plus addressing), criada pelo operador.
- **Vaga:** `teste-e2e-social-media` — cópia da de Social Media, com as 6 perguntas e o knockout.
- **Candidatura:** `d31c78bb-46b4-4585-8b62-1c9e8e3c2e7a`.

---

## 🟡 1. A análise de IA FUNCIONA — mas leva ~93s e o disparo sempre parece falhar

⚠ **ESTA SEÇÃO CORRIGE UMA CONCLUSÃO FALSA MINHA, e a correção é a parte útil.**

Primeiro afirmei que "a análise de IA nunca roda". Era **falso**, e as duas evidências que usei
tinham outra explicação:

| O que medi | O que concluí | O que era |
|---|---|---|
| `net._http_response`: `Timeout of 5000 ms` | "a chamada morre, a análise não roda" | o `pg_net` desiste de ESPERAR; a Edge Function segue rodando e grava |
| `analise_candidato_vaga`: 0 linhas para a candidatura | "não rodou" | **olhei cedo demais** — gravou 93 s depois |
| as 7 análises são todas de 2026-08-22 | "parou de funcionar naquele dia" | **não houve candidatura nenhuma** entre 22/08 e 25/08 |

Linha do tempo medida:

```
23:36:15  inscrição — trigger dispara (net id 116)
23:36:20  pg_net desiste (timeout default de 5 s)
23:37:48  a Edge Function GRAVA a análise  ← 93 s após o disparo, sem intervenção
23:38:21  meu disparo manual (redundante)
23:39:52  segunda gravação (updated_at)
```

O erro é o mesmo que o `PENDENCIAS-PROXIMA-SESSAO.md` já documenta: **concluir a partir de um
fragmento produz um fato falso que parece medido** — vem com autoridade de consulta. O
`error_msg` era real; a inferência sobre ele, não.

### O que É defeito, e continua valendo

**Não existe como distinguir sucesso de falha pelo dispatch.** O `pg_net` registra timeout em
TODA análise, porque ela sempre leva mais que 5 s. Então:

- se a EF falhar de verdade, o registro fica **idêntico** ao de uma execução bem-sucedida;
- ninguém é avisado. O RH veria a candidatura sem score e não teria como saber por quê.

`analise_candidato_vaga` tem colunas `status` e `erro` que só são preenchidas se a EF chegar a
gravar. Uma EF que morre antes disso não deixa rastro em lugar nenhum.

**Conserto proposto (não aplicado — é mudança de arquitetura, precisa de decisão):** passar
`timeout_milliseconds` coerente com os ~93 s medidos serve para o log parar de mentir, mas a
correção de verdade é a EF responder 202 imediatamente e processar em segundo plano, com o
`status` da linha sendo a fonte da verdade — e uma varredura que acuse análises presas em
`processando` há muito tempo.

⚠ **Antes de mexer, meça de novo.** 93 s foi UMA execução, com um CV de 4 KB. Um currículo
grande pode levar mais.

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
