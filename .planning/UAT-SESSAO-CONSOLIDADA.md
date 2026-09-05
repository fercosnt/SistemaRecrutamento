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
| Primeiro clique no export (§B2) | Queima a janela de **cooldown de 24 h** daquela conta. O segundo clique é o próprio teste (§B5) — mas um terceiro só em 24 h |
| Upload de currículo | Storage **não tem backup** e o PITR está desligado |

**3. Ordem entre seções é obrigatória: A → B → C.** A §A cria a conta, e §B/§C dependem dela e
das candidaturas vivas. A §E é independente (contas de RH) e pode vir antes ou depois.

**4. Nada aqui apaga dado nenhum.** O pedido de exclusão **saiu desta sessão** em 2026-08-22 —
ele e a execução real são as duas metades do mesmo fluxo e foram para
`.planning/RUNBOOK-45-06-T2-E-45-11-T3.md`, numa **conta descartável**. Ver o §D abaixo.

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

## §D — ⚠ MOVIDO em 2026-08-22 — **não faça na conta A**

> **Use `.planning/RUNBOOK-45-06-T2-E-45-11-T3.md`.**
>
> Descobriu-se, ao montar o runbook, que o `45-06` T2 e o `45-11` T3 são **as duas metades do
> mesmo fluxo**: o T3 começa literalmente com *"pedir a exclusão pela tela, e então antecipar
> `executar_em`"*. Fazer o pedido aqui, na conta A, **encerraria as candidaturas dela e agendaria
> a exclusão dela à toa** — e a conta A ainda serve os itens de 43 e 44.
>
> Os dois se fazem numa sessão só, **na conta descartável**, que o runbook manda montar com o
> cenário completo (duas candidaturas, decisão registrada, **dois** currículos sendo um órfão, e
> fixture nas seis tabelas satélite).
>
> ⚠ Sem esse cenário, metade das asserções do T3 passa por **vacuidade** — que é como um gate
> conta verde sem ter medido nada.

<details>
<summary>Texto original do §D (mantido só como registro — não executar aqui)</summary>

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

</details>

## §E — As telas de RH · fecha **Phase 47 (SC#2)**, o `44-09` e o item de **42**

**Contas C, D e E.**

| # | Conta | Passo | O que medir |
|---|---|---|---|
| E1 | D | Abrir o **Histórico** de uma candidatura real | Renderiza um dos **quatro rótulos** — Sistema / O próprio candidato / nome do recrutador / Recrutador removido. **Nunca um UUID, nunca erro de banco** |
| E2 | C | Abrir a tela de **auditoria de viés** | Carrega. ⚠ Confirma ao vivo a premissa do **CR-02**: ela chama `gerar_bias_snapshot` como `authenticated`. Se esta tela funciona, o `GRANT` está certo e **não deve ser revogado** |
| E3 | C | A fila de pedidos: **fila ≡ contador** (BD-8), no ramo **administrador** | Os dois números batem |
| E4 | D **e** E | O guard **REVISAO-05** contra JWT de navegador (D6 do `42-10`) | Dois RH **distintos**: cada um só alcança o que lhe cabe |

✅ **BD-8 decidido em 2026-08-13 — a fila é do administrador**, e por isso o E3 mudou de ramo.
As três opções não estavam empatadas quando medidas:

- **`vagas_associadas_recrutadores` está refutada:** a tabela tem **0 linhas** e não é usada em
  lugar nenhum do app. Trocaria um predicado vazio por outro vazio.
- **Popular `created_by` das 6 órfãs foi recusado:** inventaria autoria numa coluna auditável —
  da mesma família que o tombstone da P45 *severa*. Fabricar provenance para um teste passar é
  fabricar evidência.
- **A realidade:** `usuarios_rh` tem **4 administradores e 1 recrutador. Zero papel `rh`.** O
  ramo `rh` não está sem dado — está morto por construção.

⚠ **CORRIGIDO em 2026-08-22 — eu tinha errado o join.** `usuarios_rh` tem coluna `user_id`
separada; o `id` é surrogate. Juntei por `id` e tirei duas conclusões falsas. As duas caem:

- As 3 vagas ditas "do administrador" **têm dono resolvível**: `bbbbbbbb-…-bbbb` é o `user_id`
  do `recruiter@teste.com`, papel **`administrador`**, `ativo: false`. Não é UUID órfão.
- **As cinco contas RH TÊM conta de auth, e três já logaram**: `fernando@beautysmile.com.br`
  (2026-08-03), `e2e.admin` (07-17), `recrutador.rh` (06-26).

**A decisão do BD-8 NÃO muda** — e é importante que não mude pelo motivo certo: continua não
existindo papel `rh` em `usuarios_rh` (só `administrador` e `recrutador`), então o ramo segue
morto **por construção**, não por falta de dado. O que estava errado era o meu argumento de
apoio, não o veredito.

⚠ **CORRIGIDO em 2026-09-05 — o parágrafo abaixo ficou FALSO.** Medido em `usuarios_rh`: as
quatro contas RH de teste (`recrutador.rh@teste.com`, `e2e.admin@…`, `recruiter@teste.com`,
`admin.rh@teste.com`) estão **`ativo = false`** desde a limpeza de 23/08; o único RH ativo é
`fernando@beautysmile.com.br`. Para o E4 e para responder a revisão do Art. 20 é preciso **criar
um segundo RH** (papel `recrutador`) em `/rh/configuracoes` — item A1 do
`GUIA-VALIDACAO-FINAL.md`. Não reative `recrutador.rh@teste.com`: o endereço é indeliverável
(bounce medido em `notificacoes_enviadas`).

~~✅ **Conta E não precisa ser criada, e provavelmente nem de reset.**~~
`recrutador.rh@teste.com` (recrutador, `user_id fba9bc0f-…`) e `e2e.admin@beautysmile.com.br`
(administrador, `user_id 4a1fa998-…`) são duas contas RH distintas e **ativas**, ambas com
login registrado. ⚠ `recruiter@teste.com` e `admin.rh@teste.com` estão **`ativo: false`** —
não servem. E `recruiter@teste.com` tem papel **administrador**, apesar do nome.

⚠ **E1 é a metade de tela do único `PRESENT_BEHAVIOR_UNVERIFIED` da `47-VERIFICATION.md`.** A
metade de banco **já está provada**: a `20260809000001` está aplicada, corpo byte-a-byte idêntico
(`md5` `770e2057…`) — ver `47-EVIDENCIA-APPLY-CONSOL-02.md`.

---

## O que este roteiro NÃO cobre

| Item | Por quê |
|---|---|
| `45-11` Task 3 — a execução real | ⛔ Apaga PII irreversivelmente. Conta descartável + operador presente. **Não é trabalho de agente** |
| `p45_motor_exclusao_smoke.sql` | Escrita em PROD (fixture). Os CR-01/CR-02 estão consertados no disco e **nunca foram executados** |
| ~~`p47_historico_smoke.sql`~~ | ✅ **RODOU e passou 6/6** em 2026-08-13 |
| ~~Revisão do **Encarregado** (DPO)~~ | ✅ **RESOLVIDO** — a empresa decidiu não designar Encarregado (`.planning/DECISAO-ENCARREGADO.md`). Os quatro itens são decisão do operador, já dada |
| ~~`api.ipify.org` e `www.youtube.com`~~ | ✅ **ELIMINADOS** em vez de declarados (`03909dd`) |
| Caminho do recrutador ponta a ponta (42) | Bloqueado por endereço indeliverável — ver `42-recrutador-email-indeliveravel` |

---

## Depois da sessão

Cada seção fechada atualiza um alvo diferente:

```
§A            → /gsd-verify-work 43
§B, §C        → a §Deferred Verification da Phase 44 (G1) e o checkpoint do 44-05
§D            → SAIU desta sessao — ver RUNBOOK-45-06-T2-E-45-11-T3.md
§E1           → /gsd-verify-work 47   (fecha o PRESENT_BEHAVIOR_UNVERIFIED)
§E3, §E4      → /gsd-verify-work 42
```

⚠ **Registre as contagens ANTES e DEPOIS de cada seção, não só o veredito.** O portão de fase
destrutiva do M8 exige asserção negativa **medida**, e «passou» não é medição. Foi exatamente
uma asserção negativa que pegou o `42804` da Phase 43, que um smoke 10/10 deixou passar.
