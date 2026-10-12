---
decisao: fechar-o-sistema-hoje
data: 2026-10-12
hora: "18:28 -03 (21:28Z)"
emenda: D-41 (segunda emenda; a primeira é a de 2026-10-11, PITR recusado)
substitui: "condição 1 da D-41 emendada (backup diário COMPLETED posterior ao último apply da fase) e a R5 do 52-31"
registrado_por: orquestrador (janela do /gsd-execute-phase 52 --gaps-only), com medição própria antes de gravar
---

# Decisão do operador — bloco D hoje, sem esperar o backup da manhã

## Resposta do operador (verbatim)

```
Decisão do operador (2026-10-12, verbatim): «quero terminar o sistema hoje e nao amanha, amanha de manha ja quero estar com as vagas abertas».

Consequência: a condição de backup do bloco D (D-41/R5: backup diário COMPLETED posterior ao último apply) é substituída por esta, medida pela janela verificadora às 21:28Z:
- backup físico COMPLETED 2026-10-12T06:31:59Z (id 1941159569);
- escritas em PROD desde então: SOMENTE migrations reaplicáveis do git (20261011000006, aplicada 21:04:42Z, e a(s) do 52-32 quando aplicadas) + atividade das contas de teste que estão na população exportada; 0 vagas criadas/alteradas e 0 candidaturas criadas desde o backup.
- Antes do 52-21, remedir: nenhuma escrita fora dessa lista desde 06:31:59Z. Se houver, parar.
Registrar isso como emenda à D-41 (restauração completa = backup de 06:31Z + reaplicar as migrations listadas a partir do git + export prévio da população).

Ordem, tudo hoje: 52-32 como já planejado (sem dividir) → /gsd-verify-work 52 at → 52-21 → 52-22. No 52-19, perguntar ao operador sobre as vagas ativas fdbe1a4a (Consultor) e e897f709 (Social Media): reaproveitar ou limpar. A janela de cadastro de vagas não grava em PROD nem commita até o 52-22 fechar.

Agora: /gsd-plan-phase 52 --gaps (52-32).
```

## Medição independente desta janela (2026-10-12T21:31Z, só leitura)

- Management API `database/backups`: `walg_enabled=true`, `pitr_enabled=false`; último backup `COMPLETED physical 2026-10-12T06:31:59.437Z id=1941159569` (anteriores: 2026-10-11T06:26:10Z, 2026-10-10T06:29:02Z).
- PROD (`set transaction read only`), desde `2026-10-12T06:31:59Z`: `vagas_criadas=0`, `vagas_alteradas=0` (por `updated_at`), `candidaturas_criadas=0`, `candidaturas_alteradas=0` (por `updated_at`); migrations no ledger com versão ≥ `20261011000006`: só a `20261011000006` (aplicada 21:04:42Z pelo 52-31, md5 do ledger = arquivo no git).
- Os números batem com os da janela verificadora citada pelo operador.

## D-41 — segunda emenda (o que vale a partir de agora para o bloco D)

1. **Ponto de restauração** = o backup físico COMPLETED `2026-10-12T06:31:59Z` (id 1941159569) — NÃO se espera o backup diário seguinte.
2. **Restauração completa**, se precisar = esse backup + reaplicar a partir do git, na ordem do ledger, toda migration aplicada depois dele (`20261011000006` e a(s) do 52-32, quando aplicadas; todas reaplicáveis, texto no repositório com md5 conferido no ledger) + o export prévio local da população aprovada (condição 2 da primeira emenda, inalterada: fora do git, md5 no SUMMARY).
3. **Pré-condição medida antes do 52-21 (o passo destrutivo), e de novo imediatamente antes do comando:** nenhuma escrita em PROD fora desta lista desde `2026-10-12T06:31:59Z` — (a) migrations do git registradas no ledger; (b) atividade das contas de teste que estão na população exportada. Em particular: 0 vagas criadas/alteradas e 0 candidaturas criadas desde o backup. **Qualquer escrita fora da lista = PARAR** e levar ao operador.
4. **Ordem do dia (operador):** 52-32 como já planejado, sem dividir → `/gsd-verify-work 52` → 52-19 (com a pergunta sobre as vagas ativas `fdbe1a4a` Consultor e `e897f709` Social Media: reaproveitar ou limpar) → 52-20/52-27 → 52-21 → 52-22. Tudo hoje.
5. **Janela de cadastro de vagas:** não grava em PROD nem commita até o 52-22 fechar (memória «publicação com janela concorrente: pausar»).

Efeito sobre textos existentes: a frase «na prática, a manhã seguinte» da R5 (52-31) e das linhas emendadas do `52-19-PLAN.md` (:24, :120, :148) fica superada por esta emenda; o `p52_backup.cjs` do 52-19, que exige backup posterior ao maior `aplicado_ate`, recusaria hoje por construção — o 52-19 tem de ler ESTA emenda (o planejamento do bloco D decide se o `--auto-teste`/modo real ganham a condição 3 acima ou se o plano é emendado) — levar ao `/gsd-plan-phase`/executor do 52-19 como pré-condição escrita, nunca contornar o script por conta própria.

## Correção de ordem (operador, 2026-10-12 ~19:50 -03 / 22:50Z) — o bloco D NÃO roda hoje

Texto do operador (verbatim):

```
Correção de ordem (operador, 2026-10-12): o bloco D NÃO roda hoje à noite. Motivo: o p52_backup.cjs do 52-19 exige por máquina backup posterior ao último apply e recusaria hoje (R5 do 52-32); emendar o portão custaria outra rodada de planejamento, e o apply destrutivo cairia de madrugada. Nova ordem: hoje 52-32 completo → /gsd-verify-work 52 até complete; amanhã de manhã, após o backup físico diário (~06:30Z de 2026-10-13, posterior à 0007), 52-19 → 52-20/52-27 → 52-21 → 52-22 com o portão como está escrito (sem mexer no p52_backup.cjs). A segunda emenda da D-41 fica registrada, mas não é usada. Registrar essa correção datada no 52-DECISAO-2026-10-12-bloco-d-hoje.md. Vagas reais podem ser cadastradas INATIVAS em PROD hoje pela outra janela (sem «[TESTE» no título, sem «teste-» no slug, sem commit); ativação só depois do 52-21. Seguir com a sessão A do 52-32 até a parada da Task 1.
```

O que vale a partir daqui:

1. **A segunda emenda da D-41 (seção anterior) fica REGISTRADA e NÃO É USADA.** O bloco D roda com a condição 1 da primeira emenda, por máquina, como o `52-19-PLAN.md` escreve: backup diário físico COMPLETED posterior ao maior `aplicado_ate` do `52-APLICACOES.json` (será o da `20261011000007` do 52-32). Na prática: depois do backup de ~06:30Z de 2026-10-13. Nada no `p52_backup.cjs` muda.
2. **Hoje:** 52-32 completo (as quatro sessões + a conferência do operador) → `/gsd-verify-work 52` até `status: complete` no `52-UAT.md` (a precondition do 52-19 exige).
3. **Amanhã, após o backup:** 52-19 (com a pergunta sobre as vagas ativas `fdbe1a4a` Consultor e `e897f709` Social Media: reaproveitar ou limpar) → 52-20/52-27 → 52-21 → 52-22.
4. **Vagas reais INATIVAS em PROD a partir de hoje, pela janela de cadastro de vagas** (sem «[TESTE» no título, sem «teste-» no slug, sem commit no repositório; ativação só depois do 52-21). Consequências a observar:
   - **52-32:** a população de `vagas` muda durante o dia (contagem «15 vagas, 12 pelo predicado» do planejamento é fotografia). O smoke52a lê atores e população na execução; a sonda do WR-02 escolhe a vaga por predicado (`status <> 'ativa' AND deleted_at IS NULL`) dentro de subtransações que revertem, no ensaio que aborta — uma vaga real inativa pode ser a escolhida; nada persiste (três camadas + `vagas_estado`), mas a sessão B deve registrar na FRONTEIRA qual vaga a sonda usou (prefixo do id e se é de teste), e, se a forma do plano permitir sem mudar o texto revisado, preferir vaga de teste.
   - **52-19 (varredura da população de teste):** vagas reais inativas NÃO são população de teste — a lista da D-30 (contas `+claudeN`, `+cand1`, `@teste.com`, `@invalido.local`, vagas «[TESTE»/`teste-`) não as alcança; a D-32 leva a `629a5f31` ao portão. O executor do 52-19 confere que a varredura não as lista.
   - **Janela única:** a janela de cadastro de vagas NÃO empurra, NÃO aplica migration e NÃO commita; só escreve linhas em `vagas` pela interface. Isso não colide com os portões do 52-32 (`p52_portao.cjs` vigia árvore e git, não dados de PROD), mas o `--vistas` do ensaio compara views externas: se um `P52V FAIL (vistas)` aparecer na sessão B, a causa provável é essa escrita — registrar, não «consertar» o portão.
