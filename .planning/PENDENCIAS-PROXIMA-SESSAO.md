---
tipo: handoff
gerado: 2026-08-13
milestone: v8.0 — M8 Dados do Candidato & Direitos do Titular (LGPD-OPS)
estado: 5 de 6 fases implementadas; 1 fase nunca começou
---

# Pendências — o que falta, em ordem de dependência

**M1–M7 estão SHIPPED** (201 requirements Validated). **O M8 é o único milestone aberto**, e
não há M9 planejado — fechar o M8 é fechar o projeto como ele está escopado hoje.

---

## ✅ 0. RESOLVIDO em 2026-08-22 — a migration foi aplicada antes do deploy

`20260813000001_p47_ip_no_servidor` **aplicada**, ledger reconciliado (`20260822004104` →
`20260813000001`, em sequência, zero drift novo). Conferido por fora: coluna nullable, trigger
**BEFORE**, `search_path=""`, `SECURITY INVOKER`, **23 linhas e 0 IPs nulos** — zero resíduo.
`pii-inventory.yaml` atualizado e `.md` regenerado (o gate mordeu antes, passou depois).

## 🟠 0b. O defeito que o apply descobriu por acidente — **decisão sua**

**O log de acesso está morto na prática, e não tem relação com o trabalho do IP.**

O primeiro apply **abortou com `23514`** porque minha sonda usou um `evento` inválido. O gate
pegou o próprio autor — e ao expor o CHECK, expôs isto:

`EventoAcesso` (TS) declara **8** valores; `check_evento` (banco) aceita **8 outros**; a
interseção é de **3** (`login_sucesso`, `login_falha`, `logout`). Os cinco ilegais são
`sessao_expirada`, `acesso_negado`, `password_reset_request`, `password_reset_completed`,
`password_reset_failed` — e **`sessao_expirada` é exatamente o que o único chamador vivo
manda** (`useSessionTimeout.ts:76`).

Aquele INSERT falha com `23514` **em toda execução**, e `logAccessEvent` engole o erro de
propósito. **Medido:** a tabela só tem `login_sucesso` (21) e `login_falha` (2), e a última
linha é de **2026-04-20**. Quatro meses sem registro.

**Duas saídas, e é decisão de domínio:** alargar o CHECK para os valores pt-BR que faltam, ou
alinhar o TS ao vocabulário do banco. ⚠ Não fiz de carona na migration do IP — mudar
constraint de domínio dentro de uma migration sobre outra coisa é como o drift entra.
`WINDOWS.md` item **34**.

---

## 🟠 1. Phase 46 — **nunca começou**, e é a única assim

`0/?` planos. Não tem CONTEXT, não tem plano, não tem nada. É **a maior peça de trabalho
restante do projeto inteiro**.

**Purga Automática (dry-run → live)** — o dado expira sozinho, dentro de um cerco, e a
primeira coisa que a purga faz em produção é **não apagar nada**.

⚠ **Estritamente sequencial após a 45**, e a razão está no ROADMAP: *"cabear um cron a um
motor destrutivo não provado é como um bug vira incidente"*. O motor agora tem smoke verde
24/24, mas **nunca rodou sobre um titular real** (0 tombstones). O item 4 abaixo é
pré-requisito real, não formalidade.

⚠ Herança da Phase 43 a lembrar no planejamento: `previa_retencao()` devolve zero por
**aritmética**, não por defeito (a matriz está em 24 meses e o sistema é mais novo que a
janela). **A Phase 46 é a primeira consumidora real desse predicado** e deve tratar a
contagem como **não-exercitada**.

Comando: `/gsd-plan-phase 46` (o discuss vem antes, se `skip_discuss=false`).

---

## 🟠 2. WR-A — o recibo que subdeclara retenção · **decisão sua**

O recibo **na tela** honra `obrigatorio` (`ReciboExclusao.tsx:113`); o **por e-mail** não
(`helpers.ts:359`). Medido no recorte majoritário (`temCurriculo=true`,
`temDecisaoRegistrada=false`): tela **8** itens, e-mail **7** — falta
`justificativa_do_recrutador`, que é `obrigatorio: true`.

⚠ **Resolver ANTES da execução real.** É o documento de compliance enviado *depois* de apagar
os dados irreversivelmente, e hoje ele **subdeclara o que foi retido**.

⚠ **A pegadinha:** o teste `(mm)` (`index.test.ts:1659`) **pina o lado divergente**. Um
conserto correto quebra a suíte — o que sugere que alguém escolheu essa forma de propósito,
ou não percebeu. **É essa a pergunta que precisa de resposta antes do conserto.**

---

## 🟡 3. A sessão de navegador — `.planning/UAT-SESSAO-CONSOLIDADA.md`

14 itens que fecham 5 fases numa sessão só, **numa ordem que não se autodestrói**. Três
ordenações são obrigatórias (o pedido de exclusão encerra as candidaturas; o primeiro clique
do export queima o cooldown de 24 h; o item de 43 exige cadastro **novo** com a caixa de
retenção **marcada**).

| Seção | Fecha |
|---|---|
| §A | O único item aberto da **Phase 43** |
| §B, §C | O G1 e o checkpoint do `44-05`, e o `44-07` |
| §D | **`45-06` Task 2** — pré-requisito da execução real |
| §E | O `PRESENT_BEHAVIOR_UNVERIFIED` da **47** e dois itens da **42** |

✅ Já resolvidos e removidos do roteiro: a Conta E não precisa ser criada (cinco contas RH já
existem — falta **senha**, não conta); o BD-8 está decidido (a fila é do administrador); o
`p47_historico_smoke` já passou 6/6.

---

## 🔴 4. `45-11` Task 3 — a execução real vigiada · ⛔ **NÃO É TRABALHO DE AGENTE**

Conta descartável + **operador presente**. Apaga PII irreversivelmente: o Storage **não tem
backup** e o PITR está desligado. Um CV apagado é irrecuperável por qualquer meio.

**Pré-requisitos:** item 2 (WR-A) e o §D do roteiro. As Tasks 1 e 2 já fecharam — review
round 4 aprovado e smoke **24/24 verde em PROD**, com estado conferido por fora.

---

## 🟢 5. Itens menores, mas que destravam outros

| # | Item | Nota |
|---|---|---|
| 5.1 | `npm run db:types` | Destrava **dois** itens de uma vez: a ponte de tipos do `triagemService` (`WINDOWS.md` 18) e o `as never` do `historicoCandidaturaService` (item 27) |
| 5.2 | A copy pública **não tem guarda** | 1892/1892 passaram depois de eu trocar 9 strings voltadas ao usuário. Nenhum teste pina o rótulo — só o e-mail. Mesma família do CONSOL-04 |
| 5.3 | Os 9 itens abertos da P45 | Nenhum bloqueia o portão. `WR-B`, `WR-C`, `WR-D`, `WR-F`, `WR-G` e `DI-45-16-01` seguem em `deferred-items.md` |
| 5.4 | `m7-ativar-modo-producao` | ⚠ `NOTIFICACOES_MODO` **já está em `producao`** (medido 2026-08-11). O todo do backlog está stale |
| 5.5 | `m7-cleanup-n8n-cloud` | Superfície externa do n8n segue ativa no painel do Fernando |
| 5.6 | DBMIG-01, CC0-01 | Carregados desde o M4/M5 |

---

## 🏁 6. Fecho do milestone

Só depois de 1–4:

```
/gsd-audit-milestone   →   /gsd-complete-milestone 8.0   →   /gsd-cleanup
```

Ou `/gsd-autonomous`, que encadeia os três.

---

## ⚠ A lição operacional desta sessão, porque ela vai se repetir

**Registro desatualizado custa o mesmo que registro ausente.** Em um único dia, o ledger e o
`STATE.md` estavam errados em **sete** pontos, e cada erro custou trabalho real:

| O que dizia | O que era |
|---|---|
| O `(B3/email)` falha por estado de fixture | Falso — e apontava para o conserto errado. A asserção media depois do próprio rollback |
| `47-04`: os seis países não são medíveis | Medidos desde 2026-08-11 |
| Nenhuma navegação leva às páginas públicas | `RodapePublico` montado nas cinco superfícies |
| `20260809000001` provavelmente não aplicada | Aplicada, byte a byte idêntica |
| `DI-45-07-01`, `DI-45-10-01`, `DI-45-10-02` abertos | **Resolvidos no código**, abertos no ledger |
| G1: export nunca exercitado, 0 linhas | Exercitado em 2026-08-11, `atendido` em 5 s |
| 3 vagas "do administrador" | ⚠ **esta linha estava errada, e o erro era MEU** — ver abaixo |

⚠ **E em 2026-08-22 a lição se aplicou a MIM, duas vezes seguidas, pelo mesmo erro.** Juntei
por `usuarios_rh.id` quando a chave é `usuarios_rh.user_id` (o `id` é surrogate), e produzi
duas afirmações falsas com a mesma confiança das medidas certas:

| Eu afirmei | O que é verdade |
|---|---|
| As 3 vagas apontam para um UUID de seed **sem linha em `usuarios_rh`** | É o `user_id` do `recruiter@teste.com`, papel `administrador`, `ativo: false` |
| **Nenhuma** das 5 contas RH tem login (`last_sign_in_at` nulo) | Todas têm conta de auth, e **três já logaram** |

A decisão do BD-8 sobreviveu — o ramo `rh` segue morto porque **o papel não existe**, não por
falta de dado — mas o argumento de apoio estava errado. **Medir a coisa errada com o SQL certo
produz um fato falso que parece medido**, e é mais perigoso que não medir: vem com a autoridade
de uma consulta. Antes de concluir de um `JOIN`, confira que a chave é a chave.

**Antes de planejar trabalho a partir de um registro, meça o que ele afirma.** Foi assim que
um verificador suspeitou de uma regressão de produção que não existia, e assim que o `STATE`
quase mandou consertar o smoke pelo lado errado.
