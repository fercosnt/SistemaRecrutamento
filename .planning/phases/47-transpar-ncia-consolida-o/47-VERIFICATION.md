---
phase: 47-transpar-ncia-consolida-o
verified: 2026-08-23T15:12:00Z
status: human_needed
veredito: "O código da fase está inteiro, ligado e agora PROVADO POR EXECUÇÃO CONTRA PROD — a RPC do CONSOL-02 foi chamada ao vivo por esta verificação e devolveu rótulo de texto, zero uuid, zero vazio, e recusou com 42501 tanto o papel candidato quanto o chamador sem claim. O que sobra não é código: é um parecer jurídico que ninguém escreveu e uma tela que ninguém abriu."
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
mudou_desde_a_verificacao_anterior: "SC#2 saiu de PRESENT_BEHAVIOR_UNVERIFIED para VERIFIED por execução própria contra PROD (7/8 → 8/8, behavior_unverified 1 → 0), e os dois destinos de rede pendentes fecharam em 2026-08-13 por ELIMINAÇÃO da transferência — restam 2 itens humanos (parecer do Encarregado e a tela do Histórico aberta no navegador), contra 3 antes."
re_verification:
  previous_status: human_needed
  previous_score: 7/8
  previous_behavior_unverified: 1
  gaps_closed:
    - "SC#2 — `listar_historico_candidatura` está aplicada em PROD e responde: medido por catálogo, por ledger byte-a-byte e por CHAMADA REAL desta verificação (não por leitura do documento de evidência)."
    - "Os dois destinos de rede sem ficha (`api.ipify.org`, `www.youtube.com`) deixaram de ser `pendente-de-decisao` — não por classificação, e sim por eliminação da transferência (2026-08-13). Zero entradas `pendente-de-decisao` restam no arquivo."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Abrir o Histórico do RH, no navegador logado como recrutador/administrador, numa candidatura real (ex.: `a1dd4c42-bc92-4c37-a584-dc19a59a631d`, que tem 2 linhas) e conferir que o bloco renderiza o rótulo de texto na linha de metadado."
    expected: "A tela mostra um dos quatro rótulos — hoje, com o dado vivo, será «Sistema» nas 13 linhas — e nunca um uuid, nunca um espaço em branco, nunca um erro de banco."
    why_human: "O smoke é explícito em NÃO cobrir isto: «NÃO COBRE: o componente `HistoricoBlock` nem o serviço (plano 47-07)» (`p47_historico_smoke.sql:100`). O lado de banco está provado por execução; o lado de render está provado só por Vitest com mocks. Ninguém abriu a tela — e foi exatamente esse buraco que, na P39 deste projeto, deixou um `42804` viver em PROD."
  - test: "Revisão FORMAL do Encarregado (DPO) dos quatro itens de publicação: os seis países + a base legal de cada um, a formulação do provedor de hospedagem, a qualificação do serviço público de CEP, e a copy das duas páginas públicas."
    expected: "Parecer escrito do Encarregado, aprovando ou pedindo mudança de copy."
    why_human: "Julgamento jurídico/regulatório — não verificável por código, e nada mudou desde 2026-08-12. `WINDOWS.md` itens 26 e 30 seguem `open`; a publicação atual foi liberada apenas pelo operador em 2026-08-11, e `47-08-SUMMARY.md` recusa deliberadamente equiparar as duas coisas."
higiene_de_registro:
  - "`WINDOWS.md` item 24 (`unrun-verify`, p47_historico_smoke) segue `open` — o smoke rodou 6/6 hoje. É a MESMA classe do achado crítico anterior, com o sinal trocado: um run sem artefato de escrituração é indistinguível de um run que não aconteceu."
  - "`WINDOWS.md` item 28 (montagem do `RodapePublico`) segue `open` — contradito pelo código nas cinco superfícies."
  - "`WINDOWS.md` itens 29, 31 e 32 (os dois destinos `pendente-de-decisao`) seguem `open` — resolvidos em 2026-08-13, com migration `20260813000001` APLICADA e trigger `trg_preencher_ip_logs_acesso` vivo em PROD."
---

# Phase 47: Transparência & Consolidação — Reverificação

**Phase Goal:** O que o sistema faz com o dado está escrito onde o candidato lê — e nenhuma promessa de compliance sobrevive neste repositório sem código que a execute.
**Verified:** 2026-08-23T15:12:00Z
**Status:** human_needed
**Re-verification:** Sim — segunda passada, após as medições de fechamento de gaps

## Como esta verificação mediu (e por que isso importa)

A verificação anterior (2026-08-12) registrou, corretamente, que **não conseguia olhar o banco**: o subagente verificador não recebe os tools MCP do Supabase. Ela roteou o SC#2 para verificação humana em vez de reprovar — decisão certa, e o desfecho provou que a suspeita era procedimentalmente correta e factualmente errada.

**Esta passada não repetiu a limitação, e também não aceitou a medição alheia.** O repositório contém, desde a Phase 46, um caminho de consulta pela Management API do Supabase (`p46apply.cjs sql`, contrato escrito em `CLAUDE.md`). Todas as medições abaixo foram feitas **por esta verificação**, em requisições próprias, **somente `SELECT` e catálogo** — nenhuma migration, nenhum DDL, nenhum re-run do smoke, nenhuma escrita.

Prova de que nada foi mutado, medida no início e no fim da sessão:

| | antes das medições | depois |
|---|---|---|
| `candidaturas` · `candidatos` · `historico_candidatura` | 20 · 31 · 13 | **20 · 31 · 13** |
| `auth.users` · `logs_auditoria` · `vagas` · `autorizacoes` | 37 · 6 · 12 · 19 | **37 · 6 · 12 · 19** |
| linhas de fixture `P47H%` sobreviventes | 0 | **0** |

Esse último número é evidência independente da asserção `(f)` do smoke: o run de hoje escreveu e reverteu, e **nada sobrou** na trilha append-only.

---

## 1. O que mudou: SC#2 fecha, por execução

### 1.1 O catálogo vivo, medido nesta sessão

| Propriedade | Valor vivo (medido) | Confere |
|---|---|---|
| `to_regprocedure('public.listar_historico_candidatura(uuid)')` | `listar_historico_candidatura(uuid)` | ✅ |
| `prosecdef` | `true` | ✅ |
| `provolatile` | `s` (STABLE) | ✅ |
| `proconfig` | `{"search_path=\"\""}` | ✅ |
| `proacl` | `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` — **`anon` FORA** | ✅ |
| `md5(prosrc)` | `770e20574cd086d05db796939f8e9298` | ✅ (bate com o registrado em `47-EVIDENCIA-APPLY-CONSOL-02.md`) |

### 1.2 O ledger bate com o disco — conferido dos dois lados por esta verificação

| version | `md5 -q` do arquivo | `md5(statements[1] \|\| E'\n')` medido | octetos arquivo / ledger |
|---|---|---|---|
| `20260809000001` | `a0afa7f1866a61179caa72ffecd251c5` | **idêntico** | 23955 / 23954 |
| `20260809000002` | `fa25249cf8793f81da462e4d5c03ddea` | **idêntico** | 20837 / 20836 |
| `20260809000003` | `36d6b38de19289993c48c8b49faf3315` | **idêntico** | 13664 / 13663 |

A diferença de 1 octeto é o `\n` final que a via de apply antiga descartava — a mesma assinatura já identificada na Phase 46. Não é divergência de conteúdo.

### 1.3 ⚠ A prova que faltava: a função foi CHAMADA, ao vivo, por esta verificação

O smoke prova o contrato; mas o smoke é o documento de outra pessoa. Esta verificação chamou a RPC diretamente, em leitura pura (a função é `STABLE`), sobre a candidatura real com mais histórico (`a1dd4c42-…`, 2 linhas):

| Medida | Resultado |
|---|---|
| linhas devolvidas como `administrador` | **2** |
| rótulos distintos | **`["Sistema"]`** — rótulo de texto, um dos quatro |
| rótulos com forma de uuid | **0** |
| rótulos nulos ou vazios | **0** |
| chamada com papel `candidato` | **`42501: FORBIDDEN: apenas rh ou administrador podem ler o historico da candidatura`** |
| chamada **sem claim nenhuma** | **`42501`** — o guard NÃO é NULL-cego |

As duas últimas linhas são as recusas que a mudança de tier (RLS → `SECURITY DEFINER`) poderia ter apagado em silêncio. Elas foram exercitadas contra PROD, não lidas num SUMMARY.

**⚠ Achado honesto, que nenhum documento desta fase registra.** Todas as **13** linhas vivas de `historico_candidatura` têm `ator IS NULL`. Consequência: **hoje, com dado real, a tela mostraria «Sistema» em todas as linhas** — o rótulo do *nome do recrutador*, que é a redação literal do SC#2, só é exercitado por fixture inserida e revertida (asserções `(a)` e `(e)` do smoke). Isso **não** invalida o critério: a capacidade de resolver o nome está provada por execução, e o uuid provadamente não vaza. Mas é a diferença entre «a função sabe fazer» e «alguém já viu acontecer com dado de gente», e ela pertence ao registro.

### 1.4 CONSOL-02 conta como VERIFIED

O item `behavior_unverified` da passada anterior era: *«a existência da função em PROD e a execução do smoke não têm evidência corroborada»*. Ambas as metades foram medidas — a primeira por catálogo e por chamada real, a segunda pelo run 6/6 do orquestrador, corroborado aqui por duas medições independentes (contagens idênticas antes/depois; zero linhas `P47H%` sobreviventes). **Score sobe de 7/8 para 8/8; `behavior_unverified` cai de 1 para 0.**

---

## 2. Julgamento do conserto do portão (commit `6187b7c`)

O prompt desta reverificação pede três julgamentos. Os três foram medidos, não deduzidos.

### 2.1 O conserto está correto? **SIM**

Reproduzido por execução read-only nesta sessão, avaliando os seletores antigo e novo como consultas puras:

| Seletor | Escolhe | Titular resolvido |
|---|---|---|
| fallback **antigo** (`ORDER BY created_at DESC`, sem filtro) | `a111296a-4a56-4eda-a6b8-3c5312048e3a` | **NULL** ← o caso que reprovava |
| fallback **novo** (`JOIN candidatos` + `WHERE ca.user_id IS NOT NULL`) | `a802bc05-4325-4b0c-9c0a-ae9f69d62bdc` | `1079ccf7-…` (utilizável) |

E a causa-raiz confere com o banco: **exatamente 1 de 31** `candidatos` tem `user_id` nulo, e `candidatos_user_id_fkey` tem `confdeltype = 'n'` (**SET NULL**) — deliberado, para o candidato sobreviver à remoção da conta. O diagnóstico do portão antigo (*«a candidatura … nao resolve o user_id do titular»*) **culpava o DADO** por uma propriedade que o próprio seletor havia deixado de exigir. É a forma nº 1 da tabela de `CLAUDE.md`: portão que reprova trabalho correto com diagnóstico falso.

**Nota de precisão que a evidência acerta e vale reforçar:** a correção do seletor do *caminho feliz* (`:161-162`) é **hardening de defeito latente, não conserto de falha observada** — medido: o seletor feliz devolve `NULL` tanto na forma antiga quanto na nova, porque nenhuma linha viva tem `ator` não-nulo. O raciocínio de que `IS DISTINCT FROM` devolve TRUE contra NULL e elegeria uma candidatura impossível está **correto** e a instância era real; ela só não é a que mordeu hoje.

### 2.2 A varredura por forma é verdadeira? **SIM, com uma nota de escopo**

Varri `supabase/tests/` e `supabase/migrations/` por `IS DISTINCT FROM`. Classificação dos achados:

- **Comparação contra literal ou contra variável dentro de `IF`** (a esmagadora maioria — `current_setting(...) IS DISTINCT FROM 'y'`, `v_role IS DISTINCT FROM 'administrador'`, etc.): idioma **correto**, não é a forma.
- **`NEW.x IS DISTINCT FROM OLD.x`** nos triggers de `20260623100003` e `20260609000002`: idioma **correto e deliberado** (detecção NULL-safe de mudança).
- **`p47_historico_smoke.sql:211/225/232`** — comparam coluna contra `v_titular`, que o guard de `:202` garante não-nulo. Correto, e a evidência já o registra.
- **`p46_purga_smoke.sql:649`** — `i.janela_meses_aplicada IS DISTINCT FROM m.janela_meses`, coluna contra coluna, dentro de `WHERE`. **É o único achado que a evidência não menciona.** Não é a mesma forma: é uma **asserção que conta divergências**, não um **seletor de fixture cujo consumidor exige uma propriedade que ele não pediu** — e o arquivo já tem a asserção irmã `v_i_nulos`, que conta separadamente os nulos daquelas mesmas colunas. Aqui o `IS DISTINCT FROM` é o idioma certo, e o próprio comentário do arquivo (`:625-629`) explica a escolha.

**Veredito:** a alegação «nenhuma outra instância» é verdadeira **no escopo em que foi feita** (seletor de fixture). Registro o achado de `p46_purga_smoke.sql:649` para que a próxima varredura não o reencontre como surpresa.

### 2.3 O portão continua capaz de FALHAR? **SIM — reexecutado por esta verificação**

Não aceitei a tabela de «prova de mordida» do documento; reproduzi-a. Simulei, em relação derivada e read-only, um banco em que **nenhum** titular tem conta (`SELECT id, NULL::uuid AS user_id FROM candidatos`) e rodei o seletor **consertado** contra ela:

```
fallback_mordida_sem_titular_com_conta → NULL
```

`NULL` faz a fixture cair no `RAISE EXCEPTION` de `:193-195` — o smoke **aborta alto**, com a mensagem nova, que agora nomeia a propriedade que falta e ainda indica a query de diagnóstico. O portão **falha fechado**.

Duas travas adicionais que confirmam que ele não foi anestesiado:

1. **Nenhuma asserção contada foi tocada.** O diff de `6187b7c` (25 inserções / 3 deleções, a maioria comentário) está **inteiramente contido no bloco de fixture**, linhas 154-194. As seis asserções `(a)`–`(f)` e o esperado fixo `v_esperado := 6` do RESUMO `(z)` estão byte-idênticos. Um conserto que baixasse o esperado de 6 para 5, ou que trocasse um `RAISE` por um `NOTICE`, seria anestesia — não é o caso.
2. **A única perda é um diagnóstico morto.** Com os dois seletores garantindo `ca.user_id IS NOT NULL`, o `IF v_titular IS NULL THEN RAISE` de `:202-204` tornou-se **inalcançável**. Não é anestesia: a mesma classe de entrada continua abortando o smoke, mais cedo e com mensagem mais verdadeira. É código morto que vale marcar na próxima passada por aquele arquivo.

**Conclusão:** o conserto move o portão de *«reprova trabalho correto acusando o dado»* para *«reprova quando o banco realmente não oferece o caso»*. É a direção certa, e está provado por execução em vez de afirmado.

---

## 3. O que NÃO mudou — e não foi graduado para cima

### 3.1 O parecer formal do Encarregado (DPO): **SEGUE ABERTO**

Medido, não presumido: `WINDOWS.md` itens **26** e **30** continuam `status: open`, sem `resolved_at`. A publicação foi liberada pelo operador em 2026-08-11 e `47-08-SUMMARY.md` é explícito em não confundir isso com parecer do Encarregado. **Isto é julgamento jurídico. Não se fecha por código, e esta verificação não o fecha.** Segue como item humano nº 2.

### 3.2 A tela do Histórico: **SEGUE HUMANA** — e a resposta é sim, plenamente

O prompt pede a resposta às claras: **sim, permanece item humano.** O smoke declara o próprio escopo em `p47_historico_smoke.sql:100`:

> «NÃO COBRE: o componente `HistoricoBlock` nem o serviço (plano 47-07)»

O que está provado: a função de banco, por execução (§1.3), e o caminho de cliente (`historicoCandidaturaService.listHistorico` → `.rpc('listar_historico_candidatura')` → `HistoricoBlock.tsx:91` renderiza `row.ator_rotulo`), por Vitest **com mocks**. O que não está provado: que um navegador logado como RH, contra a PROD real, pinta aquele rótulo. Nenhuma das duas provas substitui a outra — e este projeto já pagou por confundi-las.

### 3.3 CONSOL-03 e o portão de fase destrutiva: **o portão NÃO se aplica, e isso foi medido**

O `ROADMAP.md:68` registra que a Phase 47 **saiu** do portão destrutivo em 2026-08-09, porque o CONSOL-03 foi resolvido pela outra saída que o próprio critério nomeia — *«removido OU adotado com escritas reais»* — e o operador escolheu **adotar**. Não aceitei isso do documento; medi as duas pontas:

| Verificação | Resultado |
|---|---|
| `DROP TABLE` / `DROP COLUMN` / `DELETE FROM` / `UPDATE ... SET` nas três migrations da fase | **nenhuma ocorrência** |
| `public.data_deletion_log` em PROD | **EXISTE** (`to_regclass` resolve), **0 linhas** |
| `COMMENT ON TABLE` vivo | reescrito: nomeia `anonimizar_candidato` como motor real, declara `tabela_sem_vinculo_com_titular`, e registra que a promessa órfã da Phase 15 «fecha aqui» |
| `public.rollback_to_version` chama `log_auditoria` | **`true`** (medido em `prosrc`) |

**O `DROP` não aconteceu.** Sem `DROP`, sem `DELETE` e sem `UPDATE` retroativo, a condição de disparo do portão está ausente e seus cinco critérios não têm o que graduar nesta fase. Registro, ainda assim, que o critério 1 (`VERIFICATION.md` presente e com veredito) está satisfeito por este próprio arquivo, e que a árvore de trabalho está limpa com `tsc` em **96** (baseline 97, teto 104), sem `--no-verify`.

### 3.4 ⚠ Correção de fato ao prompt desta verificação: os dois destinos de rede **JÁ NÃO estão pendentes**

O prompt instrui a não graduar para cima a classificação de `api.ipify.org` e `www.youtube.com`, afirmando que *«ambos ainda aparecem como `pendente-de-decisao`»*. O prompt também instrui a medir em vez de confiar em qualquer documento, **inclusive nele próprio**. Medido:

| Medição | Resultado |
|---|---|
| `grep "disposicao: 'pendente-de-decisao'"` em `destinosDeRedeComFicha.test.ts` | **zero ocorrências** |
| `api.ipify.org` em código executável | **ausente** — restam apenas comentários históricos (`logAccessService.ts:131`) |
| migration `20260813000001_p47_ip_no_servidor` no ledger de PROD | **presente** |
| trigger `trg_preencher_ip_logs_acesso` em `pg_trigger` | **vivo** |
| `www.youtube.com` no componente | virou `www.youtube-nocookie.com` sob clique explícito (`InstrucoesFormularioPage.tsx:48`), com decisão registrada em `DECISOES` |
| suíte do portão | 29/29 passando, **incluindo** a prova de detecção com destino sintético (não passa por vacuidade) |

**A decisão veio em 2026-08-13, e não foi a conclusão provável:** em vez de *declarar* as duas transferências dando-lhes ficha, o operador **eliminou** as duas. O IP agora é preenchido pelo servidor — o que de quebra matou um defeito que ninguém tinha ligado ao destino (quando o `fetch` ao terceiro falhava, o sistema gravava `127.0.0.1`, um IP falso, num registro de auditoria).

**Este item está FECHADO**, e fechá-lo não é graduar para cima: é medir. O que seria graduação indevida — e não foi feito — é dar por resolvido o parecer do Encarregado, que continua aberto em §3.1.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC#1a — Qualquer visitante lê, numa página pública, com quem os dados são compartilhados (Art. 18, VII) | ✓ VERIFIED | `subprocessadores.ts` com 6 entradas, país medido, sem sentinela; rota `/subprocessadores` em `routes.tsx:157` sem guard de sessão; validadores exercitados com fixture sintética |
| 2 | SC#1b — «o que é guardado, por quanto tempo e por quê», derivada da matriz de retenção como **dado** | ✓ VERIFIED | `matriz-retencao.yaml` → `gen-matriz-retencao.cjs --check` (**exit 0, executado nesta verificação**) → `matrizRetencao.generated.ts` → consumido por `PrivacidadePublicaPage`/`MatrizRetencaoPublica`; rota `/privacidade` em `routes.tsx:166` |
| 3 | SC#1c — As duas páginas são ALCANÇÁVEIS por navegação de produção | ✓ VERIFIED | `RodapePublico` importado e renderizado em `LandingPage:103`, `VagasPublicasPage:535`, `VagaDetalhePage:493`, `SubprocessadoresPage:96`, `PrivacidadePublicaPage:175` — e em nenhuma rota interna (`rodapeMontagem.test.tsx` trava os dois sentidos) |
| 4 | SC#2 — O Histórico do candidato (VISRH-03) mostra o **nome do recrutador**, não o UUID do `ator` | ✓ **VERIFIED (era ⚠️)** | **Medido ao vivo por esta verificação:** função existe (`prosecdef`, `search_path=""`, `anon` fora da ACL), ledger byte-a-byte com o disco, RPC **chamada**: 2 linhas, rótulo de texto, **0** com forma de uuid, **0** vazio; recusa `candidato` e recusa sem-claim, ambas `42501`. Smoke 6/6 corroborado por estado idêntico antes/depois e 0 fixtures sobreviventes. Ver §1.3, incluindo o achado dos 13 `ator` nulos |
| 5 | SC#3a — Toda promessa de retenção/exclusão tem código vivo que a executa, provado por checklist VERSIONADO (não vacuoso) | ✓ VERIFIED | `promessasComExecutor.test.ts` + `destinosDeRedeComFicha.test.ts` + `portoesInvocados.test.ts` — **29/29 executados nesta verificação**; poder de detecção provado com árvore temporária sintética nos dois sentidos |
| 6 | SC#3b — O zumbi `data_deletion_log` foi resolvido (adotado com escritas reais) | ✓ VERIFIED | **Medido em PROD:** tabela existe, `COMMENT` vivo reescrito nomeando `anonimizar_candidato` como motor real, e `rollback_to_version.prosrc` contém `log_auditoria` — a escrita dupla está no corpo vivo, não só no arquivo |
| 7 | CONSENT-05 — coluna de consentimento de análise de vídeo deixa de fabricar resposta | ✓ VERIFIED | **Medido em PROD:** `autorizacoes.autorizacao_analise_video` com `column_default = null`, `is_nullable = YES`, e **1 de 19** linhas genuinamente NULL — a coluna parou de fabricar `false` |
| 8 | SC#4 — As 6 fases do M7 sem veredito Nyquist têm `VALIDATION.md` com veredito real | ✓ VERIFIED | 6 arquivos presentes em `.planning/milestones/v7.0-phases/`, **6/6** com `status: validated` (nenhum `draft`) |

**Score:** 8/8 truths verified (0 present, behavior-unverified) — era 7/8 com 1.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/compliance/matriz-retencao.yaml` + gerador + `.generated.ts` | matriz derivada com portão | ✓ VERIFIED | `check:matriz-retencao` exit 0 |
| `src/features/transparencia/constants/subprocessadores.ts` | 6 entradas, país obrigatório | ✓ VERIFIED | Sem sentinela remanescente |
| Páginas + `RodapePublico` | 2 páginas públicas + rodapé | ✓ VERIFIED | Existem, importados, montados em 5 superfícies |
| `20260809000001_…listar_historico_candidatura.sql` | RPC de leitura do histórico | ✓ **VERIFIED (arquivo + APLICADA + EXECUTADA)** | Era «apply não corroborado». Agora: catálogo, ledger byte-a-byte e chamada real |
| `20260809000002_…adotar_data_deletion_log.sql` | adoção + dual-write | ✓ VERIFIED | `COMMENT` e `log_auditoria` confirmados **no corpo vivo de PROD** |
| `20260809000003_…consent05_analise_video.sql` | CONSENT-05 | ✓ VERIFIED | Estado da coluna medido em PROD |
| `20260813000001_p47_ip_no_servidor.sql` | IP preenchido pelo servidor (novo desde a passada anterior) | ✓ VERIFIED | No ledger de PROD; trigger `trg_preencher_ip_logs_acesso` vivo |
| `supabase/tests/p47_historico_smoke.sql` | espec executável de 6 asserções | ✓ VERIFIED | Rodou 6/6; seletores de fixture consertados e reprovados/aprovados por reexecução read-only |
| Testes de portão do CONSOL-04 | checklist versionado | ✓ VERIFIED | 29/29 executados |
| 6× `VALIDATION.md` do M7 | veredito Nyquist real | ✓ VERIFIED | 6/6 `status: validated` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `listar_historico_candidatura` (PROD) | `historicoCandidaturaService.listHistorico` | `.rpc(...)` | ✓ **WIRED, e a ponta de servidor foi CHAMADA** | Antes: «função no servidor não confirmada». Agora medida ao vivo |
| `HISTORICO_ALLOWLIST`/`projetarLinha` | `HistoricoBlock.tsx` (`row.ator_rotulo`) | prop drilling | ✓ WIRED (mocks) | `row.ator` não aparece em lugar nenhum; render em navegador é o item humano nº 1 |
| `rollback_to_version` | `log_auditoria` + `data_deletion_log` | `PERFORM` na mesma transação | ✓ WIRED **no corpo vivo** | `prosrc LIKE '%log_auditoria%'` = true |
| `matrizRetencao.generated.ts` | `PrivacidadePublicaPage`/`MatrizRetencaoPublica` | import + render | ✓ WIRED | `check:matriz-retencao` exit 0 |
| `RodapePublico` | 5 superfícies públicas | import + JSX | ✓ WIRED | E travado nos dois sentidos por `rodapeMontagem.test.tsx` |
| `trg_preencher_ip_logs_acesso` | `logs_acesso.ip` | trigger vivo | ✓ WIRED | Substitui a chamada eliminada a `api.ipify.org` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Função existe e responde em PROD | `SELECT ... FROM listar_historico_candidatura(<candidatura real>)` como administrador | 2 linhas · rótulo «Sistema» · 0 uuid · 0 vazio | ✓ PASS |
| Recusa do papel `candidato` | mesma RPC com claim `role=candidato` | `42501 FORBIDDEN` | ✓ PASS |
| Recusa sem claim (guard NULL-safe) | mesma RPC com claims vazias | `42501 FORBIDDEN` | ✓ PASS |
| Ledger × disco, 3 migrations | `md5(statements[1]‖E'\n')` vs `md5 -q` | 3/3 idênticos | ✓ PASS |
| Portão de fixture ainda MORDE | seletor consertado contra relação sem titular com conta | `NULL` → fixture levanta | ✓ PASS |
| Regressão do seletor antigo | fallback sem filtro | escolhe `a111296a-…` (titular NULL) — o caso que reprovava | ✓ PASS (reproduz o defeito) |
| Estado do banco inalterado | contagens antes/depois de todas as medições | 20·31·13·37·6·12·19 idênticos; 0 fixtures `P47H%` | ✓ PASS |
| Portões de artefato | `check:matriz-retencao`, `check:pii-inventory-md`, `check:recibo-exclusao`, `check:export-allowlist` | 4× exit 0 | ✓ PASS |
| Testes de portão da fase | `npx vitest run promessasComExecutor + destinosDeRedeComFicha + portoesInvocados` | 29/29 | ✓ PASS |
| Baseline de tipos | `npm run -s lint \| grep -c "error TS"` | **96** (baseline 97, teto 104) | ✓ PASS |
| Render do `HistoricoBlock` em navegador | — | fora do escopo do smoke, por declaração do próprio arquivo | ? SKIP → human_verification |

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|-------------|----------------|--------|----------|
| TRANSP-01 | 47-04, 47-08, 47-09 | ✓ SATISFIED | Truths 1, 3 · §3.4 fecha o achado de destinos sem ficha |
| TRANSP-02 | 47-01, 47-06, 47-08 | ✓ SATISFIED | Truths 2, 3 |
| CONSOL-01 | 47-05 | ✓ SATISFIED | Truth 8 |
| CONSOL-02 | 47-02, 47-07 | ✓ **SATISFIED** (era ⚠️ PARTIAL) | Truth 4 · §1 — apply e execução medidos; render em navegador é item humano |
| CONSOL-03 | 47-03 | ✓ SATISFIED | Truth 6 · §3.3 — adotado, não dropado; portão destrutivo não se aplica |
| CONSOL-04 | 47-09 | ✓ SATISFIED | Truth 5 |
| CONSENT-05 | 47-03 | ✓ SATISFIED | Truth 7 — estado da coluna medido em PROD |

Nenhuma requirement órfã: as sete IDs declaradas nas frontmatters dos 9 planos batem com `REQUIREMENTS.md` e com o cabeçalho da fase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | `TBD` / `FIXME` / `XXX` nos arquivos tocados hoje (`p47_historico_smoke.sql`, `47-EVIDENCIA-CONSOL-02-MEDIDA.md`) | — | **Nenhuma ocorrência** |
| `supabase/tests/p47_historico_smoke.sql` | 202-204 | `IF v_titular IS NULL THEN RAISE` tornou-se **inalcançável** após o conserto — ambos os seletores já garantem não-nulo | ℹ️ Info | Diagnóstico morto, não anestesia: a mesma entrada continua abortando em `:193`, antes e com mensagem melhor |
| `supabase/tests/p46_purga_smoke.sql` | 649 | `IS DISTINCT FROM` coluna-a-coluna em `WHERE` — fora do escopo da varredura declarada | ℹ️ Info | É asserção, não seletor, e tem asserção-irmã contando nulos. Registrado para a próxima varredura não reencontrá-lo como surpresa |

### Higiene de registro — o ledger está defasado em 5 entradas da Phase 47

Não é gap de código e não altera o veredito, mas é a **mesma lição** que este projeto acabou de pagar, com o sinal invertido:

| Item | Diz | É verdade |
|---|---|---|
| `WINDOWS.md` **24** | `open` — «smoke do CONSOL-02 escrito e NAO executado» | **Rodou 6/6 hoje.** Um run sem escrituração é indistinguível de um run que não aconteceu |
| `WINDOWS.md` **28** | `open` — «montagem do RodapePublico não executada» | **Executada**, nas cinco superfícies |
| `WINDOWS.md` **29 / 31 / 32** | `open` — `api.ipify.org` e `www.youtube.com` pendentes | **Resolvidos em 2026-08-13**, por eliminação; migration aplicada e trigger vivo |

Recomendação: `gsd-tools windows fixed 24 28 29 31 32`, com a razão apontando para este arquivo e para `20260813000001`. Enquanto ficarem abertos, `windows_enforce` bloqueia o ship por defeitos que já não existem — que é a forma barata de ensinar a equipe a ignorar o ledger.

### Human Verification Required

#### 1. Abrir o Histórico do RH no navegador

**Test:** Logado como recrutador ou administrador, abrir o Histórico de uma candidatura real — sugestão `a1dd4c42-bc92-4c37-a584-dc19a59a631d`, que tem 2 linhas.
**Expected:** O bloco renderiza o rótulo de texto na linha de metadado — hoje, com o dado vivo, «Sistema» — e nunca um uuid, nunca um espaço em branco, nunca um erro de banco.
**Why human:** O smoke declara em `:100` que **NÃO cobre** `HistoricoBlock` nem o serviço. O lado de banco está provado por execução; o lado de render está provado só com mocks. As duas provas não se substituem — e este projeto já pagou uma vez por confundi-las.

#### 2. Revisão formal do Encarregado (DPO)

**Test:** Obter parecer escrito do Encarregado sobre os quatro itens: os seis países + base legal (cinco são EUA), a formulação do provedor de hospedagem, a qualificação do serviço de CEP, e a copy das duas páginas públicas.
**Expected:** Aprovação registrada ou lista de mudanças de copy.
**Why human:** Julgamento jurídico/regulatório. `WINDOWS.md` 26 e 30 seguem `open`; a publicação atual foi decisão do operador, e `47-08-SUMMARY.md` recusa deliberadamente equiparar as duas coisas.

### Gaps Summary

**Não há gaps.** Todos os 8 must-haves estão verificados, e o que era o único item não-verificado da passada anterior — a existência e o funcionamento da RPC do CONSOL-02 em PROD — foi medido por esta verificação em requisição própria, incluindo a **chamada real da função** e as duas recusas `42501`, e não por leitura do documento de evidência.

O status permanece `human_needed` por dois itens que **não se fecham por código**, e inventar trabalho para transformá-los em `passed` seria a desonestidade que este processo existe para evitar:

1. **A tela nunca foi aberta.** O smoke é explícito em não cobrir o componente nem o serviço. Tudo abaixo daquela fronteira está provado; nada acima dela está.
2. **O Encarregado nunca opinou.** A publicação foi liberada pelo operador. As duas coisas são diferentes e o próprio 47-08 se recusa a confundi-las.

Fora do veredito, dois registros para quem vier depois: **(a)** hoje as 13 linhas vivas de histórico têm `ator` nulo, então o rótulo do *nome do recrutador* — a redação literal do SC#2 — só foi exercitado por fixture revertida, nunca por dado de gente; **(b)** o ledger `WINDOWS.md` carrega 5 entradas defasadas desta fase, e a de nº 24 é a mesma lição do achado crítico anterior invertida: **um run sem artefato é indistinguível de um run que não aconteceu.**

---

*Verified: 2026-08-23T15:12:00Z*
*Verifier: Claude (gsd-verifier) — medições próprias contra PROD, somente leitura, estado do banco idêntico antes e depois*
