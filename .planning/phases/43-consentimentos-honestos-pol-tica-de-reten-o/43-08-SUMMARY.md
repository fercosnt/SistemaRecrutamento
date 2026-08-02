---
phase: 43
plan: 08
subsystem: privacidade-candidato
status: complete
tags: [lgpd, consentimento, revogacao, own-row, allowlist, retencao, a11y, zero-destrutivo]
requires:
  - public.autorizacoes.autorizacao_marketing_vagas (coluna viva em PROD desde o 43-07)
  - public.pode_receber_marketing() (43-05 — a MESMA semântica de "qual linha vale")
  - policy "Candidatos podem atualizar suas autorizacoes" (UPDATE own-row, qual + with_check)
  - src/__tests__/copyPortoesLgpd.test.ts (portão de copy do 43-02, com privacidade/ na allowlist)
provides:
  - rota /candidato/privacidade sob RoleGuard role="candidato"
  - src/features/privacidade/ (serviço own-row + 2 hooks + 4 componentes + lib de datas)
  - card de navegação para a página nova em MeuPerfilCandidatoPage
  - AUTORIZACOES_ALLOWLIST (7 colunas nomeadas — a projeção que a suíte assere)
  - 20 testes novos (7 do tracer + 8 da página + 5 do bloco de currículo)
affects:
  - 44 (EXPORT-01: "pedir cópia dos dados" ocupa esta mesma página, sem inventar rota nova)
  - 45 (ERASE: "pedir exclusão" idem; e é a fase que dá corpo ao canal humano do Encarregado)
  - 46 (PURGA: o "Prazo previsto" desta tela e a matriz config_retencao_etapa terão de ser
      reconciliados quando algo passar a apagar — dependência registrada no código)
tech-stack:
  added: []
  patterns:
    - "leitura own-row com a MESMA ordenação da função do banco que decide o mesmo fato"
    - "componente de consentimento SEM estado interno de valor — não há onde a antecipação morar"
    - "erro de escrita de consentimento é alerta inline persistente, nunca toast"
    - "asserção da allowlist sobre o ARGUMENTO de select, com o serviço real contra um dublê do cliente"
    - "ausência de linha no servidor cai no estado POR LINHA, nunca num vazio de lista"
key-files:
  created:
    - src/features/privacidade/services/privacidadeService.ts
    - src/features/privacidade/hooks/usePrivacidade.ts
    - src/features/privacidade/hooks/useRevogarMarketing.ts
    - src/features/privacidade/lib/datas.ts
    - src/features/privacidade/components/ConsentimentoSwitchRow.tsx
    - src/features/privacidade/components/AutorizacoesLista.tsx
    - src/features/privacidade/components/GuardaCurriculoBloco.tsx
    - src/features/privacidade/components/PrivacidadeCandidatoPage.tsx
    - src/features/privacidade/components/__tests__/ConsentimentoSwitchRow.test.tsx
    - src/features/privacidade/components/__tests__/PrivacidadeCandidatoPage.test.tsx
    - src/features/privacidade/components/__tests__/GuardaCurriculoBloco.test.tsx
  modified:
    - src/router/routes.tsx
    - src/components/pages/MeuPerfilCandidatoPage.tsx
decisions:
  - "A leitura usa `ORDER BY created_at DESC, id DESC LIMIT 1` — a MESMA expressão de pode_receber_marketing(). Hoje é no-op observável (zero candidato com mais de uma linha), e é por isso que está escrita: no dia da segunda linha, tela e guard já concordam."
  - "O Prazo previsto sai da autorização + 24 meses (o teto consentido), NÃO da matriz config_retencao_etapa: aquela é configuração interna, chaveada por estado da candidatura, e um administrador pode encurtá-la sem que a copy consentida mude."
  - "A guarda do currículo NÃO ganha switch: não existe motor de exclusão (Phase 45), então um switch desligaria uma flag e nada mais aconteceria — promessa órfã sobre o dado mais sensível da fase. A revogabilidade do Art. 8º §5 é atendida pelo Encarregado."
  - "Candidato SEM linha de autorizações (4 dos 21) não recebe switch fantasma nem backfill: a linha exibe o estado real (fail-closed) e nomeia o canal humano."
  - "Nenhum toast.error na falha de escrita: o erro é alerta inline persistente, porque é o caso em que a pessoa precisa saber que a autorização dela NÃO mudou."
metrics:
  duration: ~40min
  completed: 2026-08-02
  tasks: 3
  commits: 4
actuals:
  tokens: 21000
  tasks: 3
  commits: 4
---

# Phase 43 Plan 08: Seus Dados e Autorizações Summary

`/candidato/privacidade` existe: a primeira superfície deste sistema em que um
consentimento coletado pode ser desfeito pela própria pessoa — sem diálogo, sem motivo,
sem contra-oferta — e a primeira em que `autorizacao_retencao_curriculo` é lido por
alguém.

## O que foi entregue

**Task 1 (tracer, TDD) — a revogação ponta a ponta.** `privacidadeService` lê
`public.autorizacoes` por **allowlist nomeada de 7 colunas**, own-row, ordenando pela
**mesma expressão** de `pode_receber_marketing()` (`created_at DESC, id DESC LIMIT 1`).
A escrita é `UPDATE` own-row direto por PostgREST sob a policy viva (`qual` **e**
`with_check` medidos) — **nenhuma RPC `SECURITY DEFINER` nova** —, e devolve a linha
atualizada pela mesma allowlist. `ConsentimentoSwitchRow` **não tem estado interno de
valor**: não existe lugar onde a antecipação otimista pudesse morar.

**Task 2 — a página, as três linhas e os dois caminhos de chegada.** `ScreenShell`
clonado verbatim do `ExplicacaoCandidatoPage`. Três linhas na ordem contratual
(transacional → marketing → guarda do currículo), bloco de guarda em três casos, rota sob
`RoleGuard role="candidato"` e card de navegação a partir do perfil.

**Task 3 — a suíte do que a tela NÃO faz.** 13 casos, 4 deles asserções negativas
estruturais.

## Verificação executada

| Gate | Resultado |
|------|-----------|
| `npx vitest run src/features/privacidade` | **20/20** (3 arquivos) |
| `npm run test:run` — repositório INTEIRO | **149 arquivos / 1355 testes verdes** |
| `npm run -s lint` (`tsc`) | **97** — idêntico à baseline congelada |
| Portão de copy do 43-02 | **11/11**, agora varrendo `src/features/privacidade/` de verdade |
| `grep -rn "pessoa natural" src/` | **0** |
| `select('*')` na feature | **0** (só as duas menções em docblock que a proíbem) |
| `text-xs` autorado na feature | **0** — toda string nova renderiza a 14px |
| Zero `--no-verify` | confirmado — os 4 commits passaram pelo hook de `tsc` |

## As duas invariantes que a suíte torna irreversíveis

**Sem UI otimista, provado no instante certo.** O caso (c) das duas suítes assere o
`aria-checked` do controle **DURANTE** uma promessa que nunca resolve: o desejado é
`false`, o servidor ainda diz `true`, e é `true` que está na tela. Um `onMutate`
acrescentado daqui a seis meses reprova aqui. Um teste que lesse o código-fonte não
perceberia.

**A allowlist provada sobre o argumento de `select`.** O caso (e) chama o serviço **real**
contra um dublê do cliente PostgREST e assere a string enviada — `expect(colunas).toBe(
AUTORIZACOES_ALLOWLIST)`, sem `*`, sem as duas colunas de PII do aceite. Uma asserção
sobre o tipo TypeScript não provaria nada: o tipo some no runtime e a estrela viajaria
pela rede do mesmo jeito.

**A linha do transacional não é um controle, e isso é estrutural.** O caso (a) varre a
região por seletor (`role="checkbox"`, `role="switch"`, `aria-checked`, `aria-disabled`,
`input`, `button`) — zero. Um leitor de tela ouve informação, não opção desabilitada.

## Decisões registradas no código (não só aqui)

1. **De onde sai o "Prazo previsto"** — autorização + 24 meses, o teto que a pessoa leu e
   aceitou. Não vem de `config_retencao_etapa`, e o porquê está escrito no docblock de
   `GuardaCurriculoBloco`, junto com a **dependência da Phase 46**: quando a purga for
   ligada, esta data e a matriz têm de ser reconciliadas ou a copy revista.
2. **Por que a guarda do currículo não ganha switch** — não existe motor de exclusão. Um
   switch desligaria uma flag e nada mais aconteceria. A revogabilidade do Art. 8º §5 é
   atendida por canal humano nomeado e existente (o Encarregado), e a copy **não** promete
   que a autogestão chegará: isso é roadmap, não compromisso com o titular.

## Deviations from Plan

### 1. [Rule 2 — 4 candidatos reais caem num caminho que o plano não nomeou] O caso "sem linha de autorizações"

- **Encontrado em:** Task 2, ao compor a lista.
- **Problema:** **4 dos 21 candidatos vivos não têm linha de consentimento nenhuma** (o
  `INSERT` era best-effort e falhou 4 vezes; medido no 43-07). O plano especifica a linha
  do marketing como `ConsentimentoSwitchRow`, que precisa de um `id` de linha para
  atualizar. Sem linha não há o que atualizar, e a BD-4 proíbe backfill — consentimento
  retroativo é fabricar prova.
- **Correção:** a linha 2 cai num **estado por linha** (exatamente o que a E3 da UI-SPEC
  manda: ausência de valor nunca vira vazio de lista): estado real `Desativado`
  (fail-closed, o mesmo que `pode_receber_marketing` devolve), o texto do consentimento
  visível, e o canal humano nomeado. **Nenhum switch fantasma** e **nenhuma criação de
  linha**.
- **Arquivo:** `AutorizacoesLista.tsx` (`COPY_SEM_REGISTRO`) · **Commit:** `065649a`

### 2. [Rule 3 — a UI-SPEC é silenciosa e o caso é real] Copy autorada em três pontos

- **Encontrado em:** Task 2.
- **Problema:** a 43-UI-SPEC dá copy verbatim para o transacional, o switch de marketing e
  o bloco de guarda — mas é silenciosa sobre (i) a **linha de leitura** da guarda dentro da
  lista, que o plano exige como 3ª linha; (ii) o candidato sem linha (deviação 1); (iii) a
  falha **isolada** da leitura de currículo.
- **Correção:** três `const` nomeados e marcados como AUTORADOS no docblock, todos
  derivados do texto já consentido (`consent-text.json`) ou do padrão de erro da própria
  spec. A linha 3 responde "o que eu autorizei" e **aponta** para a seção 2, que responde
  "o que guardamos e por quê" — o canal de revogação vive num lugar só, sem duplicação. A
  falha isolada do currículo é de escopo de SEÇÃO: derrubar a página inteira tiraria o
  direito de revogar por causa de uma informação de leitura.
- **Arquivos:** `AutorizacoesLista.tsx`, `PrivacidadeCandidatoPage.tsx` · **Commit:** `065649a`

### 3. [Rule 3 — o tipo do primitivo não aceitava o call site] Card de navegação por `GlassButton`, não `GlassCard`

- **Problema:** `GlassCard` aceita apenas `GlassProps` e **não** repassa props não-estilo
  ao elemento — `onClick` nem compila. `GlassButton` é o primitivo que ganhou o spread de
  `...rest` no 42-11 e renderiza um `<button>` real.
- **Correção:** card montado com `GlassButton` (`w-full justify-start text-left
  min-h-[44px]`), filhos em `<span>` para não aninhar `<div>` dentro de `<button>`.
- **Arquivo:** `MeuPerfilCandidatoPage.tsx` · **Commit:** `065649a`

### 4. [decisão de execução] O portão do tracer foi resolvido pelo `<verify>` automatizado

O `type="tracer"` da Task 1 pede um portão de realimentação antes de qualquer task de
expansão. O `<verify>` do tracer é **inteiramente automatizado** (`vitest` + contagem
`tsc`), o plano declara `autonomous: true` e não contém nenhuma task
`checkpoint:*`. O portão foi honrado executando o `<verify>` ponta a ponta — 7/7 verdes,
`tsc` 97 — **antes** de escrever a primeira linha da Task 2. Parar para pedir a um humano
que re-rodasse um comando automatizado que acabara de passar seria cerimônia, não
verificação.

## O que este plano NÃO entrega, e é preciso dizer

- **Nada disto está em produção.** O 43-07 aplicou as 4 migrations e deployou a Edge
  Function; **o bundle do cliente não foi publicado por plano nenhum desta fase**. A
  página existe em código e em teste, não no navegador de ninguém.
- **`/candidato/privacidade` cobre UM direito.** Acessar (Phase 44) e pedir eliminação
  (Phase 45) continuam sem código, e a copy diz exatamente isso: os dois apontam para o
  Encarregado, que é um canal humano que existe — não para um botão que não existe.
- **Nenhum candidato já cadastrado receberá divulgação de vagas** (BD-5). Quem abrir a
  página hoje verá o switch **desligado**, mesmo tendo marcado "comunicações" no cadastro
  antigo. Isso é a correção, não regressão: o consentimento separado não existia, e herdá-lo
  seria reconstruir consentimento por inferência.
- **Verificação visual real a 320px não foi feita** — `happy-dom` não calcula layout. Fica
  para o UAT da fase, como já ficou o backstop equivalente do 43-03.

## Known Stubs

Nenhum. Todos os três casos do bloco de currículo, os três estados do switch e os dois
estados de falha renderizam dado real do servidor. A única superfície citada e ainda
inexistente é o pedido de cópia/eliminação — que a copy trata pelo canal humano em vez de
prometer botão.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As cinco mitigações previstas
foram implementadas e testadas: **T-43-38** (allowlist nomeada + caso (e) sobre o argumento
de `select`), **T-43-39** (escrita own-row sob a policy viva, sem RPC nova), **T-43-40**
(zero `onMutate`; caso (c) sobre o `aria-checked` em voo), **T-43-41** (a mesma ordenação
de `pode_receber_marketing`, com a medição do 43-07 no docblock), **T-43-42** (caso (b):
nenhum diálogo, nenhuma dissuasão, asserção estrutural em `document.body`).
**T-43-SC**: zero dependência npm nova.

## Commits

| # | Hash | Tipo | Conteúdo |
|---|------|------|----------|
| 1 | `b732a0c` | test | Task 1 RED — 7 casos sobre a linha ligada aos hooks reais (7 falhas) |
| 2 | `60127c1` | feat | Task 1 GREEN — leitura por allowlist, escrita own-row, switch sem estado interno |
| 3 | `065649a` | feat | Task 2 — página, 3 linhas na ordem contratual, bloco do currículo, rota + card |
| 4 | `d389d43` | test | Task 3 — 13 casos, 4 asserções negativas estruturais |

## Self-Check: PASSED

Os 11 arquivos criados existem em disco; os 4 hashes de commit existem em `git log`.
Verificado após a escrita deste arquivo.
