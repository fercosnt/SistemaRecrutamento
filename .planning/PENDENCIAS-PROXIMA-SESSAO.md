---
tipo: handoff
gerado: 2026-08-13
atualizado: 2026-08-22
milestone: v8.0 — M8 Dados do Candidato & Direitos do Titular (LGPD-OPS)
estado: 5 de 6 fases implementadas e verificadas; 1 fase (46) nunca começou
---

# Pendências — o que falta, em ordem de dependência

**M1–M7 estão SHIPPED** (201 requirements Validated). **O M8 é o único milestone aberto**, e não
há M9 planejado — fechar o M8 é fechar o projeto como ele está escopado hoje.

---

## 🟠 1. Phase 46 — **nunca começou**, e agora está DESTRAVADA

`0/?` planos. Sem CONTEXT, sem plano, sem nada. É **a maior peça de trabalho restante do projeto
inteiro** e o próximo passo óbvio.

**Purga Automática (dry-run → live)** — o dado expira sozinho, dentro de um cerco, e a primeira
coisa que a purga faz em produção é **não apagar nada**.

Era estritamente sequencial após um motor **provado**. ✅ **O motor foi provado por execução em
2026-08-22** — ver `45-VERIFICATION.md`. A dependência está paga.

⚠ **Três coisas que o planejamento da 46 TEM de carregar:**

1. **`previa_retencao()` devolve zero por ARITMÉTICA, não por defeito.** A matriz está em 24
   meses e o sistema é mais novo que a janela. **A 46 é a primeira consumidora real desse
   predicado** e deve tratar a contagem como **não-exercitada**. Ler zero como «nada a purgar»
   seria construir sobre uma medição que nunca aconteceu.
2. **A purga é destrutiva por natureza.** O ⛔ do `STATE.md` vale inteiro: planejar e escrever
   pode; **armar o cron sobre dado real é checkpoint do operador**.
3. O motor da 45 agora tem **evidência de execução real** para consumir — não um palpite.

Comando: `/gsd-plan-phase 46` (discuss antes, se `skip_discuss=false`).

---

## 🟡 2. Os itens de navegador que restam

`.planning/UAT-SESSAO-CONSOLIDADA.md` — ⚠ **o §D saiu** (virou o runbook, e já foi executado).

| Seção | Fecha | Estado |
|---|---|---|
| §A | O item aberto da **Phase 43** | ✅ **FECHADO em 2026-08-22** — o ramo autorizado foi observado ao vivo, com data e prazo preenchidos |
| §B, §C | O G1 e o checkpoint do `44-05`, e o `44-07` | ⏸ aberto |
| §E | O `PRESENT_BEHAVIOR_UNVERIFIED` da **47** e dois itens da **42** | ⏸ aberto |

✅ Já resolvidos: a Conta E **não precisa ser criada nem de reset** (`recrutador.rh@teste.com` e
`e2e.admin` são duas contas RH distintas e **ativas**, ambas com login registrado); o BD-8 está
decidido (a fila é do administrador); o `p47_historico_smoke` passou 6/6.

---

## 🟢 3. Itens menores

| # | Item | Nota |
|---|---|---|
| 3.1 | `npm run db:types` | Destrava **dois** de uma vez: a ponte de tipos do `triagemService` (`WINDOWS.md` 18) e o `as never` do `historicoCandidaturaService` (item 27) |
| 3.2 | A copy pública **não tem guarda** | 1892/1892 passaram depois de trocar 9 strings voltadas ao usuário. Nenhum teste pina o rótulo — só o e-mail |
| 3.3 | Duas divergências de LETRA da P45 | A data na tela não está «por extenso» (`06/09/2026`); e a asserção de contagem que o mecanismo M1 faz subir (`decisao_final_historico` 1→2, com as duas linhas desidentificadas) |
| 3.4 | Os itens abertos da P45 | Nenhum bloqueia. `WR-B`…`WR-G` e `DI-45-16-01` em `deferred-items.md` |
| 3.5 | `m7-cleanup-n8n-cloud` | Superfície externa do n8n segue ativa |
| 3.6 | DBMIG-01, CC0-01 | Carregados desde o M4/M5 |

---

## 🏁 4. Fecho do milestone

Só depois de 1 e 2: `/gsd-audit-milestone` → `/gsd-complete-milestone 8.0` → `/gsd-cleanup`.

---

# ✅ O que FECHOU em 2026-08-22 — não replanejar

| Item | Como fechou |
|---|---|
| **Phase 45 inteira** | `VERIFICATION` com veredito **passed**, 5/5, portão destrutivo 5/5, **zero** verificação humana em aberto |
| `45-11` Task 3 — execução real | **Executada**, com autorização explícita. Storage 3→0 (incluindo o órfão), `auth.users` 30→29, trilha intacta, re-identificação zero |
| `45-06` Task 2 — tracer | Executado como FASE 1 do runbook |
| CR-01 e CR-02 | Consertados (`76976bb`); smoke **24/24 verde** em PROD |
| Pins de `md5` do `(C3/i)` | Gravados com conferência **cruzada** vivo × arquivo (`6aa249a`) |
| **WR-A** | Consertado (`f67d664`) e **em vigor** — as EFs foram redeployadas |
| Copy do «Encarregado» | A empresa decidiu não designar; 9 strings corrigidas (`f8e76e2`) |
| `api.ipify.org` e o iframe do YouTube | **Eliminados** em vez de declarados (`03909dd`) |
| Vocabulário de `logs_acesso.evento` | O log estava **morto desde 2026-04-20**; CHECK alargado e aplicado |
| Host `recruta.beautysmile.com.br` | **Nunca existiu** — corrigido para `rh.beautysmile.com.br` (`eb6f63d`) |
| Logo | Asset publicado (`c9e43cd`) + host + **3 EFs redeployadas** |
| §A da Phase 43 | Observado ao vivo na conta descartável |

---

# ⚠ A lição que vale carregar, e ela mudou de forma hoje

O handoff anterior dizia: *«registro desatualizado custa o mesmo que registro ausente»* — e isso
segue verdade (sete pontos do ledger/`STATE` estavam errados num único dia).

**Mas em 2026-08-22 apareceu uma forma pior, e ela me pegou TRÊS vezes:**

| O que eu concluí | De onde tirei | O que era |
|---|---|---|
| «as 3 vagas apontam para UUID órfão» e «nenhuma conta RH tem login» | Um `JOIN` pela coluna errada (`usuarios_rh.id` em vez de `user_id`) | Ambas falsas |
| «o deploy trava por bloqueio de TTY» | Duas tentativas sem ler saída | Refutada pela evidência do operador |
| «a auth do CLI quebrou, falta `~/.supabase/profile`» | A **primeira linha** de um log `--debug` | O resto do log dizia `Deployed Functions.` |

**Concluir a partir de um FRAGMENTO produz um fato falso que parece medido** — vem com a
autoridade de uma consulta ou de um log, e por isso é mais perigoso que não medir.

**O procedimento que funcionou o dia inteiro, no sentido inverso:** medir o **efeito no sistema**,
não inferir do texto. Foi o que expôs o `(B3/email)` como defeito real, o que evitou acusar o
recibo de um defeito inexistente, e o que confirmou que as EFs subiram (`version` mudou?).

⚠ E o detalhe desconfortável: **nas três vezes foi evidência externa que me corrigiu** — o
operador, o log completo, o catálogo. Nenhuma veio de reler o próprio raciocínio.
