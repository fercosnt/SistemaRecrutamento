---
tipo: roteiro-uat-consolidado
gerado: 2026-08-12
fases_cobertas: [42, 43, 44, 45, 47]
itens: 14
escopo: apenas o que exige NAVEGADOR e login real — nada que exija a execucao destrutiva
status: pronto-para-execucao
---

# Roteiro consolidado — a sessão de navegador que fecha 5 fases

Os itens de UAT em aberto das fases 42–47 estão espalhados por seis `SUMMARY`s e duas seções
de `STATE.md`. Este arquivo os junta **numa ordem que funciona**, porque vários deles se
destroem mutuamente se rodados fora de sequência.

---

## ⛔ Leia antes de abrir o navegador

**1. `NOTIFICACOES_MODO` está em `producao`.** Medido no ledger em 2026-08-11 — não lido de
config. Qualquer ação que dispare notificação manda **e-mail real**, inclusive para os 5 RH.
Os passos abaixo que disparam e-mail estão marcados com 📧.

**2. Três coisas são IRREVERSÍVEIS ou de sentido único nesta sessão:**

| Ação | Por que não dá para desfazer |
|---|---|
| Pedir exclusão (§D) | Encerra **todas** as candidaturas do titular (`encerrada_a_pedido_em`). Cancelar o pedido **não as reabre** — está na própria copy da tela |
| Primeiro clique no export (§C1) | Queima a janela de **cooldown de 24 h** daquela conta. O segundo clique é o próprio teste (§C3) — mas um terceiro só em 24 h |
| Upload de currículo | Storage **não tem backup** e o PITR está desligado |

**3. Ordem entre seções é obrigatória: A → B → C → D.** A §D encerra as candidaturas da conta,
e §B/§C precisam delas vivas. **Rodar §D antes invalida tudo que vem antes, na mesma conta.**

**4. Nada aqui executa a exclusão real.** O `45-11` Task 3 **não** faz parte desta sessão.
§D só agenda (15 dias) e é integralmente reversível pelo botão de cancelar.

---

## As contas

| # | Conta | Papel | De onde vem |
|---|---|---|---|
| **A** | ⚠ **criar nova** | candidato | Cadastro fresco **com a caixa `autorizacao_retencao_curriculo` MARCADA** — é o que o item de 43 exige, e nenhuma conta existente serve |
| **B** | `candidato.funil@teste.com` | candidato | `STATE.md` § Blockers |
| **C** | `e2e.admin@beautysmile.com.br` | administrador | idem |
| **D** | recrutador `fba9bc0f-4053-4eff-bc71-9cc8d1cddbe7` | recrutador | idem |
| **E** | ⚠ **segundo login RH distinto** | rh/recrutador | O item de 42 (D6) exige **dois** RH diferentes; sem o segundo ele não fecha |

> **Por que a conta A tem de ser nova:** o ramo que satisfaz o RETEN-03 só renderiza sob
> `autorizado === true` (`GuardaCurriculoBloco.tsx:114`), e o cadastro de teste ao vivo de
> 2026-08-03 deixou justamente aquela caixa **desmarcada** — o que já foi visto é o ramo
> NÃO-autorizado. Não há como alternar isso pela tela de privacidade sem refazer o consentimento.

---

## §A — Cadastro novo e a guarda do currículo · fecha **Phase 43**

**Conta A.** Aba anônima.

| # | Passo | O que medir |
|---|---|---|
| A1 | Cadastrar, **marcando `autorizacao_retencao_curriculo`** e subindo um currículo | Cadastro conclui; `consent_registrado_em` preenchida |
| A2 | Abrir `/candidato/privacidade` | O bloco de guarda renderiza o **ramo autorizado** |
| A3 | Ler a linha da guarda | Diz literalmente **«Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.»** — com data e prazo **preenchidos**, não placeholders |

✅ **Fecha:** o único item aberto da `43-VERIFICATION.md` (`verification_deferred_human`).

⚠ **Achado cosmético conhecido, confirmar de passagem:** no bloco LGPD do passo de autorizações,
o ponto final de *"…na página **Seus dados e autorizações**"* cai sozinho na linha de baixo.
Provável `<strong>` seguido de nó de texto com espaço. Não afeta função — anotar se persiste.

---

## §B — Export, o caminho feliz · fecha **G1 da Phase 44** e o checkpoint do `44-05`

**Conta A** (já logada de §A). ⚠ Antes de clicar, medir `solicitacoes_dados` por SQL.

| # | Passo | O que medir |
|---|---|---|
| B1 | `/candidato/privacidade` → seção de export | A **seção 3** renderiza **abaixo** das duas vivas; seções 1 e 2 intactas |
| B2 | Clicar em exportar | Botão **desabilita** durante a operação e o **segundo clique não passa** |
| B3 | Baixar o `.json` | Arquivo chega ao aparelho e abre |
| B4 | SQL depois | **+1** linha `tipo='acesso'`, `situacao='atendido'`, `causa` **NULA**, `atendido_em` preenchida |
| B5 | Clicar de novo (o teste do cooldown) | Erro de cooldown na tela, e **nenhuma linha nova** no banco |

⚠ **B5 queima a janela de 24 h da conta A.** Se algo em §C precisar de um export novo, faça §C
antes — ou use a conta B.

⚠ **A v1 da EF falhava ABERTO** em timestamp ilegível. `STATE.md` (G2 da P44) registra que os 8
commits de fix estão no `main`; **confirmar que a versão viva é a corrigida** antes de concluir
que o cooldown funciona.

---

## §C — Currículo, TTL e as negativas do DevTools · fecha o `44-07`

**Conta A.** DevTools aberto na aba **Network**, «Preserve log» ligado.

| # | Passo | O que medir |
|---|---|---|
| C1 | Abrir o próprio currículo em `/candidato/privacidade` | Abre o PDF/arquivo certo |
| C2 | Copiar a URL assinada e esperar **>60 s** | Reabrir a URL **falha** — o TTL de 60 s expira de verdade |
| C3 | As **3 asserções negativas** do DevTools | Nenhuma resposta carrega a **service key**; a URL assinada **não** aparece em log persistente; nenhuma chamada devolve o caminho bruto do Storage sem assinatura |

⚠ **Precondição não re-verificada desde 2026-08-03:** as **2 policies de SELECT** do bucket
`curriculos`. Re-conferir por MCP antes de C1 — o `44-07` as mediu no M4 e nunca re-mediu.

---

## §D — O tracer da exclusão · fecha o `45-06` Task 2

> ⛔ **ÚLTIMO na conta A.** Encerra todas as candidaturas dela. Detalhe completo em
> `45-06-PLAN.md` § Task 2 — aqui está o essencial.

**Antes**, por SQL: `solicitacoes_dados` (total e `tipo='exclusao'`), `historico_candidatura`,
`notificacoes_enviadas` com `evento='decisao'`, e as candidaturas do titular com `etapa_atual`
e `deleted_at`.

| # | Passo | O que medir |
|---|---|---|
| D1 | `/candidato/privacidade`, **seção 4** | Aparece **abaixo** da seção 3, mesmo `border-t border-white/15 pt-6`; seções 1–3 idênticas |
| D2 | O CTA | **Glass-branco** — não vermelho, não accent, não full-bleed. Toque **≥44px** |
| D3 | A prosa da consequência | Inteira e legível, **não truncada, não em accordion**. «o que o cancelamento NÃO desfaz» é **parágrafo próprio** |
| D4 | O ponteiro para «Retirar minha candidatura» | Em **texto** — sem link, sem botão |
| D5 | Clicar 📧 | Botão desabilita, «Registrando seu pedido…» + spinner, motivo **ao lado** (não em `title`) |
| D6 | A tela vira Estado B | «**Exclusão agendada**», **data por extenso**, nota de que cancelar não reabre |
| D7 | **Recarregar** | Estado B **persiste** — não é estado local |
| D8 | A 320px (DevTools) | Nada estoura, **zero** rolagem horizontal, botão cresce em altura |

**Depois**, as negativas — todas obrigatórias:

- `solicitacoes_dados`: **exatamente +1**, `tipo='exclusao'`, `situacao='agendado'`,
  `executar_em - solicitado_em = 15 days`
- candidaturas: `encerrada_a_pedido_em` preenchida **e** `deleted_at` ainda **NULL**
- `historico_candidatura`: contagem **inalterada**, **zero** linha nova com `auto_rejeitado = true`
- `notificacoes_enviadas`: **zero** linha nova com `evento='decisao'` para aquelas candidaturas
- `listar_pedidos_dados()` e `contar_pedidos_dados_pendentes()`: **não** incluem a linha nova
- Segunda invocação com o mesmo JWT: **mesma data**, total inalterado

⚠ **Não deixe agendado.** Ao fim, clicar em **cancelar** e confirmar que `situacao` volta —
senão a purga da Phase 46 encontra um pedido real de uma conta de teste daqui a 15 dias.

---

## §E — As telas de RH · fecha **Phase 47 (SC#2)**, o `44-09` e o item de **42**

**Contas C, D e E.**

| # | Conta | Passo | O que medir |
|---|---|---|---|
| E1 | D | Abrir o **Histórico** de uma candidatura real | Renderiza um dos **quatro rótulos** — Sistema / O próprio candidato / nome do recrutador / Recrutador removido. **Nunca um UUID, nunca erro de banco** |
| E2 | C | Abrir a tela de **auditoria de viés** | Carrega. ⚠ Confirma ao vivo a premissa do **CR-02**: ela chama `gerar_bias_snapshot` como `authenticated`. Se esta tela funciona, o `GRANT` está certo e **não deve ser revogado** |
| E3 | C + D | A fila de pedidos: comparar **fila ≡ contador** (BD-8) | Os dois números batem, nos dois papéis |
| E4 | D **e** E | O guard **REVISAO-05** contra JWT de navegador (D6 do `42-10`) | Dois RH **distintos**: cada um só alcança o que lhe cabe |

⚠ **E3 é inconclusivo por desenho, e isso é decisão sua, não bug:** **0 de 9** vagas em PROD
pertencem a usuário de papel `rh` (6 com `created_by` NULL, 3 do administrador). O ramo `rh` do
predicado não devolve linha alguma hoje. As três saídas registradas: popular `created_by` das 6
órfãs · trocar o predicado para `vagas_associadas_recrutadores` · aceitar que a fila é de
administrador. **Decida antes de E3, ou E3 não mede nada.**

⚠ **E1 é a metade de tela do único `PRESENT_BEHAVIOR_UNVERIFIED` da `47-VERIFICATION.md`.** A
metade de banco **já está provada**: a `20260809000001` está aplicada, corpo byte-a-byte idêntico
(`md5` `770e2057…`) — ver `47-EVIDENCIA-APPLY-CONSOL-02.md`.

---

## O que este roteiro NÃO cobre

| Item | Por quê |
|---|---|
| `45-11` Task 3 — a execução real | ⛔ Apaga PII irreversivelmente. Conta descartável + operador presente. **Não é trabalho de agente** |
| `p45_motor_exclusao_smoke.sql` | Escrita em PROD (fixture). Os CR-01/CR-02 estão consertados no disco e **nunca foram executados** |
| `p47_historico_smoke.sql` | Idem — `INSERT` em `historico_candidatura` sob rollback |
| Revisão do **Encarregado** (DPO) | Julgamento jurídico. `WINDOWS.md` 26 e 30 |
| `api.ipify.org` e `www.youtube.com` | Classificação é ato do Encarregado. `WINDOWS.md` 29 e 31 |
| Caminho do recrutador ponta a ponta (42) | Bloqueado por endereço indeliverável — ver `42-recrutador-email-indeliveravel` |

---

## Depois da sessão

Cada seção fechada atualiza um alvo diferente:

```
§A            → /gsd-verify-work 43
§B, §C        → a §Deferred Verification da Phase 44 (G1) e o checkpoint do 44-05
§D            → 45-06-EVIDENCIA-APPLY.md (a Task 2 tem <resume-signal> proprio)
§E1           → /gsd-verify-work 47   (fecha o PRESENT_BEHAVIOR_UNVERIFIED)
§E3, §E4      → /gsd-verify-work 42
```

⚠ **Registre as contagens ANTES e DEPOIS de cada seção, não só o veredito.** O portão de fase
destrutiva do M8 exige asserção negativa **medida**, e «passou» não é medição. Foi exatamente
uma asserção negativa que pegou o `42804` da Phase 43, que um smoke 10/10 deixou passar.
