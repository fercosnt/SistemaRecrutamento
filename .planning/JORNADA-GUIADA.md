# Jornada guiada — validação ponta a ponta com um candidato só

> **Como usar:** percorra um passo por vez. Em cada um há **o que fazer**, **o que tem de
> acontecer** e um espaço **📝 O que aconteceu** para você preencher. Quando terminar um
> passo, me avise — eu confiro no banco antes de liberar o próximo.

**Data de início:** 2026-09-19 · **Operador:** Fernando

---

## A identidade de teste

Use **esta** em tudo. É um alias do seu Gmail, então os e-mails chegam na sua caixa.

| Campo | Valor |
|---|---|
| **E-mail** | `fernandinho.costa.neto+claude4@gmail.com` |
| **Senha** | `Teste123!` |
| Nome completo | `Marina Alves Tavares` |
| Data de nascimento | `14/03/1996` |
| Celular | `(11) 98844-2317` |
| CEP | `01310-100` (Av. Paulista) |
| Número | `1578` |
| Complemento | `Conj 42` |
| Como conheceu | **Outros** → «Indicação de uma amiga que é paciente» |

**Vaga escolhida:** `Consultor(a) de Relacionamento e Pré-vendas` — porque é a única com
**todas** as 5 perguntas e a opção de knockout, então serve para o caminho feliz **e** para
o caminho da eliminação automática depois.

### Duas janelas

| Janela | URL | Conta |
|---|---|---|
| **Candidato** | `rh.beautysmile.com.br/vagas` | Marina (acima) |
| **RH** | `rh.beautysmile.com.br/auth/login-rh` | `fernando@beautysmile.com.br` |

⚠ Use **janela anônima** para a do candidato. Sessões dos dois papéis no mesmo perfil já
causaram recusa de login legítimo (§7.19).

---

## Etapa 1 · Inscrição

### 🧑 Candidato

1. `rh.beautysmile.com.br/vagas` → abrir **Consultor(a) de Relacionamento e Pré-vendas**
2. «Candidatar-se» → criar conta com os dados acima
3. **Etapa 4 (autorizações):** marque a **obrigatória** e a de **retenção de currículo**.
   Deixe marketing **desmarcada**.
4. Formulário da vaga — **responda exatamente assim** (é o que passa no knockout):

| Pergunta | Resposta |
|---|---|
| Disponibilidade | ✅ **«Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial»** |
| Tempo em atendimento/vendas | «Entre 2 e 5 anos…» |
| Atendeu decisão de valor alto? | «Sim, atendi cliente decidindo valor alto em clínica odontológica, estética ou de saúde» |
| Atividades de rotina *(múltipla)* | marque as **4 primeiras** |
| O que te atrai | «Ser o primeiro contato de quem chega buscando resolver algo que carrega há anos» |

⛔ **NÃO marque «Tenho disponibilidade apenas para trabalho remoto»** — essa é a opção de
knockout, e ela encerra a candidatura na hora. Vamos usá-la de propósito na Etapa 9.

5. Anexe um PDF qualquer como currículo.

### 👀 O que observar

- [ ] **Defeito 1 (B8):** antes de enviar, **saia e volte** no formulário. O progresso
      **se perde** — é defeito conhecido, confirme que ainda acontece.
- [ ] As 3 caixas de autorização nascem **desmarcadas**.
- [ ] O e-mail de confirmação chega. **Anote o tempo.**

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 2 · Triagem e a análise da IA

### 👔 RH

1. `/rh/candidatos` → achar Marina
2. Abrir o perfil dela → ver a **análise da IA** (leva ~2 min depois da inscrição)

### 👀 O que observar

- [ ] A análise cita as respostas dela, não genéricos
- [ ] **Nenhum** score decide sozinho — o sistema nunca rejeita por nota (RNF-07a)

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 3 · Avaliações assíncronas

### 👔 RH
Avançar Marina para **Avaliação Assíncrona**.

### 🧑 Candidato
Fazer o que aparecer no painel (SJT / redação cultural / Big Five).

### 👀 O que observar

- [ ] **Defeito 2:** a devolutiva do Big Five fala em «avaliação comportamental» e
      **nunca** «teste psicológico»
- [ ] O e-mail de liberação chega

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 4 · Entrevista online — agendar e reagendar

### 👔 RH
Agendar entrevista online para Marina.

### 👀 O que observar

- [ ] O convite chega com **`.ics`** — abra no seu calendário
- [ ] **Reagende** para outro dia: a candidata é avisada, e o painel dela mostra o
      horário **novo** (não «sem horário definido»)

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 5 · Guia de entrevista (IA) — e a espera

### 👔 RH
No perfil de Marina → **«Gerar guia»**.

### 👀 O que observar

- [ ] O botão **trava** e a tela avisa que leva **1–2 minutos**
- [ ] **Julgamento seu:** a espera é tolerável?
- [ ] ⚠ **Não clique de novo.** Cliques repetidos esgotaram o limite de concorrência e
      fizeram *todas* as funções de IA responderem «Failed to fetch» (§4 do RETOMAR)

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 6 · Entrevista presencial e análise da transcrição

### 👔 RH
Agendar a presencial → marcar comparecimento → colar uma transcrição qualquer →
**«Analisar transcrição»**.

### 👀 O que observar

- [ ] A análise cita trechos **daquela** transcrição
- [ ] Cole uma transcrição **diferente** e gere de novo: a análise **muda**
      *(foi defeito grave — o cache servia a análise anterior — e está consertado)*

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 7 · Decisão final — **APROVAR** (contratar)

### 👔 RH
`/rh/candidato/:id/decisao` → **Aprovar** com justificativa ≥50 caracteres.

### 👀 O que observar

- [ ] O consolidado usa **os 3 pesos** (SJT + redação + entrevista), não um terço
- [ ] E-mail de aprovação chega para Marina
- [ ] No painel dela: cartão **«Entenda a decisão sobre sua candidatura»**

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 8 · RESET → **REJEITAR** na decisão final

> **Me avise aqui.** Eu apago a decisão no banco e a candidatura volta para a etapa
> anterior — sem criar conta nova.

### 👔 RH
Refazer a decisão, agora **Rejeitando**.

### 👀 O que observar (aqui moram 2 defeitos)

- [ ] Marina recebe e-mail, vê a explicação e **pode pedir revisão** (Art. 20)
- [ ] **Defeito 3:** **recarregue a página de explicação 3×**. Cada visita cria uma linha
      no histórico do Art. 20. Eu conto no banco depois e te mostro
- [ ] Peça a revisão como Marina → responda como RH. ⚠ **Quem decidiu não pode responder**
      — se você decidiu com a sua conta, precisa responder com **RH2** ou **RH3**

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 9 · RESET → **rejeitar na triagem** (rejeição humana, cedo)

> **Me avise.** Eu volto a candidatura para `triagem`.

### 👔 RH
Rejeitar direto na triagem, com justificativa ≥50 caracteres.

### 👀 O que observar — **o portão que mais importa**

- [ ] **NÃO** aparece cartão de explicação no painel de Marina. É diferente da Etapa 8 de
      propósito: aquela foi decisão avaliada; esta é triagem
- [ ] ⚠ O texto que você escrever **entra na cópia de dados** que ela pode baixar — a tela
      avisa isso ao lado do campo. Confira que o aviso está lá

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 10 · Knockout automático

### 🧑 Candidato
Marina se candidata à **Social Media** e, na disponibilidade, marca
**«Tenho disponibilidade apenas para trabalho remoto»**.

### 👀 O que observar

- [ ] Encerra **na hora**, sem avaliação humana
- [ ] E-mail chega
- [ ] A explicação diz **«automaticamente, sem avaliação de uma pessoa»** e **não** oferece
      revisão — no lugar, `lgpd@beautysmile.com.br`
- [ ] ⚠ **O critério nunca é revelado** — ela não pode descobrir qual resposta a eliminou

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 11 · Comparativo com os candidatos fictícios

### 👔 RH
`/rh/vagas/:id/comparativo` na Consultor.

### 👀 O que observar

- [ ] Os 6 fictícios aparecem ranqueados
- [ ] **Julgamento seu:** a ordem faz sentido? *(a variância da IA é backlog P1 — 89/75/80
      no mesmo candidato em rodadas diferentes)*

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 12 · Direitos do titular (como Marina)

`/candidato/privacidade`

### 👀 O que observar

- [ ] Pedir cópia dos dados → chega
- [ ] Pedir **2ª vez** → botão desabilitado **com o motivo e a hora ao lado**
- [ ] Pedir exclusão → **Defeito 4:** a data sai `dd/mm/aaaa`, e a especificação pede
      **por extenso**
- [ ] Cancelar → volta ao normal

📝 **O que aconteceu:**
```
(preencha)
```

---

## Etapa 13 · Telas de admin (os 4 defeitos restantes)

- [ ] **Defeito 5:** `/rh/configuracoes` → RH2 e RH3 dizem «**Nunca acessou**» e «Aguardando
      1º acesso», e as duas já entraram no sistema
- [ ] **Defeito 6:** `/admin/prompt-versions` → `Resumo de currículo` aparece com «(1)» como
      os outros, mas está **inativo** — a tela conta versões, não ativações
- [ ] **Defeito 7:** `/admin/ai-costs` → «sem dados». **Está correto** (agrega o dia
      anterior); anote se a mensagem deixa isso claro
- [ ] **Defeito 8:** deixe a aba do admin parada, espere a sessão expirar, recarregue → cai
      no login que diz «**Acesse sua conta de candidato**»
- [ ] **Suspeita C2:** `/rh/vagas` → editar uma vaga, mudar **descrição curta** ou **modelo
      de trabalho**, salvar, **recarregar**. Persistiu? *(há indício de que não, com toast
      de sucesso falso)*

📝 **O que aconteceu:**
```
(preencha)
```

---

## Como eu faço o RESET

Nas etapas 8 e 9 eu apago no banco, **só para esta candidata**:

| Reset | O que apago |
|---|---|
| Voltar da decisão final | a linha de `decisao_final` + volta `etapa_atual` e `status` |
| Voltar para a triagem | idem + limpa `etapa_justificativa` e `motivo_rejeicao` |

Sempre com contagem antes e depois, e **nunca** tocando em outro candidato.

---

## Registro final

📝 **Defeitos NOVOS encontrados:**
```
(preencha)
```

📝 **O que te incomodou, mesmo sem ser defeito:**
```
(preencha)
```
