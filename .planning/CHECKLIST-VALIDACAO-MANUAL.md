# Checklist da validação manual — o que sobrou, 2026-09-07

> **Este arquivo existe porque o `GUIA-VALIDACAO-FINAL.md` tem 83 itens e 1214 linhas, e
> 49 deles já foram percorridos.** O resultado de cada um está lá no §7, mas o §7 é um
> **diário cronológico**, não uma lista de conferência — descobrir o que falta exigiria
> ler 900 linhas. Isto aqui é o complemento, não o substituto: quando um item precisar de
> contexto, o guia é a fonte.

**São 12 itens de tela + 4 julgamentos que só você pode fazer.** Uma tarde, não uma semana.

---

## Antes de começar

| | |
|---|---|
| Senha de todas as contas | `Teste123!` |
| Painel interno | `/auth/login-rh` — **`/login` é 404** |
| Ao trocar de papel no mesmo navegador | **limpe o `localStorage`** |
| Depois de um deploy | **Cmd+Shift+R**, senão a aba pede um chunk que não existe mais |

| Conta | Estado |
|---|---|
| `…+claude1@` (T1) | aprovada, funil completo |
| `…+claude2@` (T2) | knockout; exclusão pedida **e cancelada** |
| `…+claude3@` (T3) | rejeitada na decisão final, revisão **respondida**; e knockout na Consultor |

⛔ **Não rode o teardown** (`p47_teardown_dados_de_teste.sql`) antes de terminar — ele
apaga exatamente estas contas.

---

## A · Como candidato (T1, no celular de verdade)

- [ ] **B11** · `/candidato/perfil` — editar telefone e endereço, recarregar: **persistiu?**
      A navbar tem «Área do candidato»?
- [ ] **D6** · `/candidato/avaliacao/:id/bigfive` → devolutiva — o texto fala em
      **«avaliação comportamental»** e **nunca** «teste psicológico» (RNF/linguagem de
      produto). Nenhum rótulo clínico, nenhum diagnóstico.
- [ ] **D8** · Prova de raciocínio (Raven) — faz a prova até o fim; o gabarito **não**
      aparece em lugar nenhum do lado do candidato.

## B · Como RH/admin (desktop)

- [ ] **C2** · `/rh/vagas` → editar uma vaga, mudar **`descrição curta`** ou
      **`modelo de trabalho`**, salvar, **recarregar**. ⚠ **Há suspeita registrada de que
      não persiste** e o toast de sucesso seja falso (backlog P2 — `updateVagaBase`). Se
      confirmar, é defeito real.
- [ ] **C4** · «Reprocessar» num candidato — roda, o `updated_at` muda, o score novo é
      próximo do anterior.
- [ ] **D7** · Liberar a avaliação de raciocínio **nominalmente** para a T1 — o botão é
      legível, e a T1 só enxerga a prova **depois** disso.
- [ ] **F5** · `/rh/pedidos-dados` — os pedidos aparecem na fila com o **prazo do Art. 19
      (15 dias)** visível.

## C · Direitos do titular (T3)

- [ ] **F4** · Pedir a cópia **duas vezes** — no 2º clique o botão fica desabilitado
      **com o motivo e a hora de liberação ao lado** (não escondido em tooltip).
- [ ] **F6** · Pedir exclusão — «Exclusão agendada» com a data. ⚠ **Divergência conhecida:**
      a data sai `dd/mm/aaaa` e a especificação pede **por extenso**. Anote se incomoda.
      Recarregar tem de persistir.
- [ ] **F8** · O e-mail `candidatura_encerrada_a_pedido` chega — em **tempo passado**, sem
      identificador interno, **com** a linha da justificativa.

> ℹ **F3, F7 e F9 já estão provados** — conferi no banco agora: o pedido de acesso da T3
> está `atendido` com causa nula, o de exclusão da T2 tem **exatamente 15 dias** entre
> pedido e execução, e o cancelamento voltou a situação. Não precisa repetir.

## D · Público (aba anônima)

- [ ] **B16** · A 320 px de largura, **nenhuma tela do candidato estoura na horizontal**.
      *(Medi a 390 px; 320 é o caso apertado que não testei.)*

---

## Os 4 julgamentos que só você pode fazer

Estes não são itens de conferência — são perguntas que quem construiu o sistema **não
consegue responder**, porque já sabe demais sobre ele.

1. **A copy faz sentido para quem chega de fora?** Li tudo de dentro. «Isto está claro?»
   não é pergunta respondível por quem escreveu o texto.
2. **Como fica no telefone na mão?** Medi em 390×844 num navegador de desktop, que não é
   a mesma coisa — toque, rolagem, teclado virtual cobrindo campo.
3. **Os e-mails, na caixa de entrada real.** Remetente, formatação, se caem em spam, se o
   `.ics` do convite abre no seu calendário.
4. **A espera de 1–2 minutos** para gerar o guia de entrevista é tolerável na prática? Há
   aviso na tela e o botão trava (§7.25), mas «tolerável» é julgamento de quem usa.

---

## Defeitos já conhecidos — não gaste tempo caçando

| O quê | Registro |
|---|---|
| «Nunca acessou» / «Aguardando 1º acesso» para contas que já entraram | §7.31 · P2 |
| Cada visita à página de explicação cria linha no histórico do Art. 20 | §7.28 · P2 |
| Rota `/admin/*` com sessão expirada manda para o login de **candidato** | §7.32 |
| `/manifesto` é público, órfão (nada o linka) e sem rodapé | §7.30 |
| `/admin/prompt-versions` conta versões, não ativações | §7.30 |
| `/admin/ai-costs` vazio — **está correto**, agrega o dia anterior | §7.30 |
| Data da exclusão em `dd/mm/aaaa` e não por extenso | P3 |
| Sair e voltar no formulário de inscrição perde o progresso (B8) | §7 · ⛔ registrado |

---

## O que fica para depois da sua validação

1. **C6** — variância da IA (reprocessar cada fictício 3×, medir média/desvio). É meu, e
   está no backlog como **P1**: decide se «Camila ≥ Rafael» é sinal ou ruído.
2. **Teardown** dos 33 candidatos de teste — script pronto e medido.
3. **Storage** — 16 currículos de teste, segundo passo pela API.
4. **O flip da purga** (H6/H7/H8) — portão verde desde 06/09, irreversível, quando você quiser.
5. **Fechamento do M8** (I1/I4/I5).
