---
id: admin-retencao-services-e-hooks-sem-teste
created: 2026-08-03
source: Phase 43 — apontado em TRÊS passadas consecutivas do verificador sem virar arquivo
priority: high
resolves_phase: 44
tags: [testes, cobertura, retencao, admin, m8, phase-46-dependency]
---

# `admin/retencao` — o caminho de escrita não tem teste, só teve um evento

**Medido:** `src/features/admin/retencao/services/` e `src/features/admin/retencao/hooks/`
têm **ZERO arquivos de teste**. Os 17 casos de `EditarJanelaDialog.test.tsx` **mockam a
mutação**, então param antes do serviço.

O caminho `useSalvarJanela → retencaoService.salvarJanela → rpc('salvar_janela_retencao')`
foi exercitado UMA vez, ao vivo, em 2026-08-03 (o operador editou `rejeitado` de 24 para 18).
Funcionou, e a trilha de auditoria nasceu correta.

**Mas a prova é um EVENTO, não um MECANISMO.** Uma regressão amanhã não reprova nada: a
suíte fica verde, porque não existe teste que passe por ali.

## Por que isso é `high` e não "seria bom ter"

O verificador da Phase 43 nomeou isso em **três passadas consecutivas** — e nas três não
virou arquivo. Este todo existe para quebrar esse ciclo.

E há um custo concreto à frente: **a Phase 46 arma um cron `DELETE` sobre exatamente estas
funções.** A `origem` da matriz (`seed` × `admin`) é o discriminador que a purga tem de
consultar antes de apagar qualquer coisa, e hoje o caminho que ESCREVE essa procedência não
tem rede.

## O que a Phase 43 já provou, e que NÃO precisa ser refeito

O lado do SERVIDOR está forte: `p43_matriz_retencao_smoke.sql` roda 11/11 contra PROD e
cobre os quatro modos de recusa da RPC, a atomicidade da linha de auditoria dentro da mesma
transação, o hardening de EXECUTE, e — desde 2026-08-03 — o caminho feliz da leitura.

O que falta é o **lado do cliente**: o hop `hook → service → rpc`.

## O que fazer

**1. `retencaoService.test.ts`** — contra um dublê do PostgREST, no idioma que o 43-08 já
usa em `privacidadeService`:
   - `listarMatriz` chama `rpc('listar_matriz_retencao')` sem argumento;
   - `salvarJanela` chama `rpc('salvar_janela_retencao')` com `{ p_etapa, p_meses }` — e
     **asserir os nomes dos parâmetros**, porque um rename silencioso vira `42883` só em
     runtime;
   - os SQLSTATE de recusa (42501 / 22023) viram erro tipado e legível, não string crua.

**2. `useSalvarJanela.test.ts`** — o que já quase mordeu hoje:
   - `onSuccess` invalida **as duas** queries (`matriz` e `previa`). Isso está correto hoje
     e não tem teste; se alguém remover a invalidação da prévia, a tela passa a mostrar um
     número velho depois de salvar, **e ninguém percebe** — é o modo de falha mais caro
     desta tela, porque um número de retenção desatualizado parece plausível.

**3. Não duplicar o servidor.** As recusas já estão provadas por execução no smoke. O que
falta é o contrato do hop, não a semântica da RPC.

## Relacionado

- `43-VERIFICATION.md` — as três passadas que apontaram isto
- `supabase/tests/p43_matriz_retencao_smoke.sql` — o que o servidor já cobre (11 asserções)
- `publicar-cliente-nao-pertence-a-plano-nenhum.md` — o outro buraco de processo da mesma fase
