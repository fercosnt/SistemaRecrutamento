---
phase: 45
plan: 03
subsystem: motor-de-exclusao
tags: [lgpd, erase, edge-function, rls, security-definer, tracer]
status: complete

requires:
  - "public.solicitacoes_dados (Phase 44 / 20260804000002)"
  - "public.tocar_atualizado_em() (P37)"
  - "supabase/functions/exportar-meus-dados (molde estrutural da EF)"
  - "src/features/privacidade/ (a casa declarada pela Phase 43)"
provides:
  - "public.config_janela_exclusao (singleton + policy de leitura para authenticated)"
  - "solicitacoes_dados.{executar_em,cancelado_em,plano,storage_concluido_em,postgres_concluido_em,auth_concluido_em,recibo_enviado_em}"
  - "candidaturas.encerrada_a_pedido_em"
  - "public.registrar_pedido_exclusao(uuid) / public.cancelar_pedido_exclusao(uuid)"
  - "EF executar-direito-titular (acoes pedir/cancelar) — o arquivo em que 45-10 entra"
  - "exclusaoService + usePedidoExclusao + usePedirExclusao + ExcluirDadosBloco"
affects:
  - "45-06 (aplica as duas migrations e faz o deploy da EF)"
  - "45-07 (a severacao quebra o .eq('user_id') da EF — por desenho)"
  - "45-08 (o AlertDialog de confirmacao e o botao Cancelar a exclusao)"
  - "45-10 (os tres passos destrutivos entram NESTA EF, nao numa nova)"
  - "Phase 46 (a clausula de encerrada_a_pedido_em em candidaturas_alem_da_janela())"

tech-stack:
  added: []
  patterns:
    - "Guard NULL-safe por IS DISTINCT FROM em duas metades (uid NULL + titularidade)"
    - "REVOKE nominal de anon + GRANT unico a service_role"
    - "Auto-verificacao de migration por DO block em subtransacao revertida (metodo da SONDA 6)"
    - "Idempotencia por ESTADO na RPC, nunca por try/catch"
    - "Ponte de tipos para tabela ausente do database.types.ts (idioma unico autorizado)"
    - "Backstop estrutural de button[disabled] + backstop de COOCORRENCIA de copy"

key-files:
  created:
    - supabase/migrations/20260805000001_p45_pedido_exclusao.sql
    - supabase/migrations/20260805000002_p45_rpc_pedido_exclusao.sql
    - supabase/functions/executar-direito-titular/index.ts
    - supabase/functions/executar-direito-titular/helpers.ts
    - supabase/functions/executar-direito-titular/index.test.ts
    - src/features/privacidade/services/exclusaoService.ts
    - src/features/privacidade/hooks/usePedidoExclusao.ts
    - src/features/privacidade/hooks/usePedirExclusao.ts
    - src/features/privacidade/components/ExcluirDadosBloco.tsx
    - src/features/privacidade/components/__tests__/ExcluirDadosBloco.test.tsx
  modified:
    - src/features/privacidade/components/PrivacidadeCandidatoPage.tsx
    - src/features/privacidade/hooks/usePrivacidade.ts

key-decisions:
  - "A janela de 15 dias vive em `config_janela_exclusao`, tabela NOVA com SELECT para authenticated — nao em `config_sla_dados`, que e RH-only por desenho e cujo arquivo proibe abrir leitura de titular. Os 15 da fila do RH sao o TETO do Art. 19, II; os 15 daqui sao politica interna de arrependimento. Coincidem no numero e sao fatos juridicos distintos."
  - "O pedido de exclusao SOBREVIVE ao tombstone: a FK segue NO ACTION, agora por decisao registrada em COMMENT e nao por adiamento. O que morre e o vinculo de sessao, nao a linha — ela e a prova datada de que o direito foi exercido."
  - "O encerramento e coluna aditiva em `candidaturas`, com as TRES recusas medidas escritas no COMMENT (historico_candidatura tem um unico escritor; deleted_at some de 5 leituras de RH; etapa_processo deixa o encerrado na fila e o tira da retencao por INNER JOIN)."
  - "A EF resolve o pedido a cancelar NO SERVIDOR: o cliente nunca conhece o solicitacao_id (Invariante 12), entao nunca pode forja-lo. O corpo do request e lido SO para `acao`."
  - "O estado vazio da secao 4 so e afirmado quando foi MEDIDO — `nao sei` desabilita o CTA com motivo, nunca renderiza 'voce ainda nao se candidatou'."

requirements-completed: [ERASE-05, ERASE-06]

coverage:
  - deliverable: "As duas migrations do pedido (estado, janela, encerramento, 2 RPCs)"
    verification:
      - kind: command
        ref: "node -e <gate de forma das migrations> (sem BEGIN;, sem ADD COLUMN IF NOT EXISTS, sem caminho de rejeicao, tokens de ACL/guard presentes)"
        status: pass
      - kind: command
        ref: "12 criterios de aceitacao conferidos por grep/awk (policies, seed, 6+7 valores de CHECK, COMMENTs, delimitadores nomeados, REVOKE/GRANT)"
        status: pass
    human_judgment: true
    rationale: "O SQL NAO foi aplicado — o apply e 45-06. A prova de que a migration EXECUTA (o DO block de auto-verificacao, os DROP CONSTRAINT, os ADD COLUMN sem IF NOT EXISTS) so existe apos o apply em PROD. O gate estatico prova FORMA, nunca execucao."
  - deliverable: "EF executar-direito-titular nas acoes pedir/cancelar"
    verification:
      - kind: test
        ref: "supabase/functions/executar-direito-titular/index.test.ts#14 casos"
        status: pass
      - kind: command
        ref: "deno test supabase/functions/executar-direito-titular/ (sem --allow-net)"
        status: pass
    human_judgment: false
  - deliverable: "Secao 4 de /candidato/privacidade (Estados A e B, vazio, erros)"
    verification:
      - kind: test
        ref: "src/features/privacidade/components/__tests__/ExcluirDadosBloco.test.tsx#w1-w14"
        status: pass
      - kind: command
        ref: "npx vitest run src/features/privacidade — 114/114"
        status: pass
      - kind: command
        ref: "npm run lint — 97 erros TS = baseline congelada"
        status: pass
    human_judgment: true
    rationale: "A adequacao da copy sob pressao — se a pessoa REALMENTE entende, antes do primeiro clique, que cancelar nao reabre as candidaturas — nao e asseravel por teste. Os backstops provam coocorrencia e integridade do texto, nunca compreensao. Verificacao visual em 320px pendente de UAT."

metrics:
  duration: "~1h35m"
  completed: 2026-08-05

actuals:
  tokens: 91000
  tasks: 3
  commits: 6
---

# Phase 45 Plano 03: O tracer da fase — o titular pede a exclusão, e nada é apagado Summary

Fatia vertical não-destrutiva que atravessa migration → RPC `SECURITY DEFINER` → Edge Function
privilegiada → service → hooks → componente → página, pelo caminho mais fino que existe: *o titular
pede a exclusão, o sistema registra o pedido, encerra as candidaturas em andamento e mostra a data*.

**Duração:** ~1h35m · **Tarefas:** 3/3 · **Arquivos:** 10 criados, 2 modificados · **Commits:** 6

## Accomplishments

- **As duas migrations do estado do pedido**, escritas e **não aplicadas** (o apply é 45-06). Cabeçalho
  M8 completo nas duas, sem wrapper `BEGIN;`, com reparo de ledger e conferência `md5`.
- **`config_janela_exclusao`**: singleton nova, uma policy de SELECT para `authenticated`, zero policy
  de escrita, seed `ON CONFLICT DO NOTHING` com 15 dias.
- **Sete colunas aditivas** em `solicitacoes_dados` (a máquina de estados que torna retomável a
  mutação não-atômica do 45-10) e **`candidaturas.encerrada_a_pedido_em`**, todas sem `IF NOT EXISTS`.
- **Dois CHECK recriados** com vocabulário fechado (6 situações, 7 causas) e `COMMENT` explicando o
  que acontece quando cliente e banco divergem.
- **`registrar_pedido_exclusao` / `cancelar_pedido_exclusao`**: guard NULL-safe em duas metades,
  `REVOKE` nominal de `anon`, `GRANT` só a `service_role`, idempotência por estado, e um `DO` block
  que exercita o **caminho feliz** numa subtransação revertida.
- **EF `executar-direito-titular`** — 14 testes verdes sem rede. É o mesmo arquivo em que os três
  passos destrutivos entram no 45-10.
- **Seção 4 de `/candidato/privacidade`** nos Estados A e B, com os seis backstops da UI-SPEC.

## Task Commits

| Task | Commit | O que entrou |
| --- | --- | --- |
| 1 (tracer) | `d3ebda9` | As duas migrations |
| 2 (RED) | `ed7e5e6` | Espec da EF — 14 casos |
| 2 (GREEN) | `120da46` | `index.ts` + `helpers.ts` |
| 3 (RED) | `9fa848d` | Espec da seção 4 — 14 casos |
| 3 (GREEN) | `870794d` | service + 2 hooks + componente + página |
| 3 (fix) | *(ver git log)* | O docblock que caía na própria armadilha |

## Deviations from Plan

### [Rule 1 — Bug] O estado vazio era afirmado a partir de uma leitura que falhou

- **Encontrado em:** Task 3, pelos casos (w3)/(w9) — os backstops estruturais.
- **Problema:** `temCandidatura = estado.data?.temCandidatura ?? false`. Com a leitura em erro,
  `data` é `undefined` e o padrão `false` fazia o bloco renderizar **"Você ainda não se candidatou a
  nenhuma vaga."** — um fato sobre a vida da pessoa inventado a partir de uma leitura que falhou — e,
  de quebra, engolia o CTA sem motivo visível, violando E1/error.
- **Correção:** `vazioMedido = Boolean(estado.data) && !temCandidatura`. "Não sei" agora desabilita o
  CTA com motivo; o vazio só é afirmado quando foi medido.
- **Commit:** `870794d`

### [Rule 1 — Bug] O docblock que explicava a armadilha de coocorrência caía nela

- **Encontrado em:** Task 3, ao rodar a suíte completa.
- **Problema:** o parágrafo do (w5) justapunha o advérbio de automatismo e o substantivo deste direito
  dentro da janela de 140 caracteres do `copyPortoesLgpd`, disparando o portão "automatismo ⨝ exclusão".
- **Correção:** reescrito para nomear os dois casos históricos sem justapor os tokens. **A saída
  recusada foi isentar o arquivo no portão** — uma exceção datada sobrevive à data.

### [Rule 1 — Instrumento] A regex de coocorrência do (w10) era estreita demais

- A spec usa **duas ordens de palavras** ("candidaturas encerradas não voltam" no Estado A; "não reabre
  as candidaturas encerradas" no Estado B). A regex original só casava a primeira e teria reprovado a
  copy que o próprio contrato exige. Ampliada para as duas, sem enfraquecer a exigência.

### [Escopo] Dois acréscimos fora da lista de `files_modified`

1. **`usePrivacidade.ts`** ganhou a chave `pedidoExclusao` na fábrica existente. A alternativa — chave
   literal dentro do hook — violaria a convenção que o próprio arquivo documenta ("duas fábricas na
   mesma feature é o começo de duas convenções de invalidação").
2. **`titularTemCandidatura`** no `exclusaoService`. O behavior 8 exige saber se há candidatura, e
   **reusar `listarMeusCurriculos` teria sido uma mentira medida**: aquela leitura filtra
   `.not('curriculo_url','is',null)`, então um titular com candidaturas e sem currículo faria a tela
   afirmar que ele nunca se candidatou.

## ⚠ Achado que exige decisão do operador — o portão do CONSOL-04 ficou VERDE por falso positivo

**Este é o item mais importante deste SUMMARY.** Não é um defeito do meu código; é uma medição.

`copyPortoesLgpd.test.ts` decide se uma promessa de exclusão é órfã por:

```
motorDeExclusaoExiste() = existe(supabase/functions/executar-direito-titular/index.ts)
                          && alguma migration contém a substring "anonimizar_candidato"
```

As duas metades passaram a ser verdadeiras **sem que o motor exista**:

1. A **Task 2 deste plano** criou `executar-direito-titular/index.ts` — que o plano 45-03 manda criar,
   e que o 45-10 vai reusar. A sonda assumia que esse caminho só nasceria no 45-10.
2. `20260805000003_p45_bias_k5.sql` (plano irmão da wave 2) **apenas menciona** `p45_anonimizar_candidato`
   numa linha de comentário `--`. A sonda procura substring, não objeto vivo.

**Consequência:** o teste *"nenhuma promessa de exclusão futura sem código que a execute"* está
**verde**, e a promessa continua **órfã** — não há tombstone, não há `deleteUser`, não há passo de
Storage. O portão parou de dizer a verdade exatamente na fase que ele existe para vigiar.

**O que NÃO fiz, deliberadamente:** não toquei em `copyPortoesLgpd.test.ts`. O meta-teste
`o portão do CONSOL-04 mede o disco de verdade` está **vermelho** justamente para forçar esta
conversa — ele funcionou como projetado. Silenciá-lo seria trocar a única guarda que cobre a
superfície de exclusão por uma nota de rodapé.

**Correção sugerida (do operador, não minha):** trocar a sonda de substring por uma que exija o
**objeto vivo**, p.ex. `CREATE OR REPLACE FUNCTION public.anonimizar_candidato` — um comentário não
satisfaz, e o 45-07 a satisfaz naturalmente ao criar a função.

## Estado da suíte

| Antes deste plano | Depois |
| --- | --- |
| 1 falha: *"nenhuma promessa de exclusão futura sem código que a execute"* | 1 falha: *"o portão do CONSOL-04 mede o disco de verdade"* |

`1 failed | 1623 passed (1624)`. **Zero `--no-verify`** — os 6 commits passaram pelo `.husky/pre-commit`
com `tsc = 97`, a baseline congelada.

## Verification

- `deno test supabase/functions/executar-direito-titular/` — **14/14**, sem `--allow-net`.
- `npx vitest run src/features/privacidade` — **114/114**.
- `npm run lint` — **97** erros `tsc` = baseline.
- `npm run build` — verde, com `assert-no-secrets` e `assert-chunks`.
- Gate de forma das migrations — **OK**; as duas **não foram aplicadas**.
- `git diff --stat` da `PrivacidadeCandidatoPage.tsx` — **15 inserções, 0 remoções**;
  `AutorizacoesLista`, `PedirCopiaBloco` e `CurriculosBloco` ausentes do diff.

## Known Stubs

| Item | Arquivo | Por quê / quem resolve |
| --- | --- | --- |
| Estado B sem botão "Cancelar a exclusão" | `ExcluirDadosBloco.tsx` | Por desenho — o `AlertDialog` de confirmação e o botão de cancelar são do **45-08**. Nada na tela anuncia o controle ausente. |
| `causaDaFalha` sem chamador | `executar-direito-titular/helpers.ts` | Tradutor do vocabulário fechado de `causa`, exigido pelo plano; ganha chamador no **45-10**. Testado agora. |
| `plano` e os 4 carimbos por sistema nascem NULOS | migration `…000001` | A máquina de estados do ERASE-04; preenchida pelo **45-10**. |

## Issues Encountered

Além do achado do CONSOL-04 acima: a nota da UI-SPEC de que *"o cadastro na coluna 'sai' existe em
qualquer titular"* está em tensão com o estado vazio chaveado por candidaturas — um titular com
cadastro e zero candidaturas **tem** dados a apagar, mas não vê o CTA. Implementei como o plano e a
UI-SPEC especificam; registro a tensão para o 45-08/45-11 decidirem se o vazio deve ser chaveado por
"tem cadastro" em vez de "tem candidatura".

## Next

Pronto para **45-06** (aplicar as duas migrations por MCP e fazer o deploy da EF, com `verify_jwt`
preservado). O portão destrutivo do 45-11 **continua bloqueado** pelo G1 em aberto.

## Self-Check: PASSED

Os 11 arquivos declarados existem em disco; os 5 hashes de commit de tarefa existem no repositório.
