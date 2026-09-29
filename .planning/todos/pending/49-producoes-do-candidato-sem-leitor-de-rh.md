---
id: 49-producoes-do-candidato-sem-leitor-de-rh
created: 2026-09-29
source: Phase 49 / sessao de UAT 27-29/09 — medido fora do escopo, registrado para nao se perder
priority: medium
resolves_phase: null
tags: [visrh, leitura, hub-rh, portfolio, caso-pratico, sjt, spec-visrh-04, m9]
---

# O candidato produz, a IA lê, o RH não vê — três faces do mesmo TODO de leitura

**Fora do escopo da Phase 49.** Registrado aqui porque a medição foi feita durante a
UAT dela e se perderia. Amplia `docs/specs/SPEC-VISRH-04-portfolio-visivel-rh.md`
(escrita 2026-09-28, **não implementada**, D1 e D2 em aberto).

## O fato, medido em 2026-09-29

Três produções do candidato que **entram na análise automática e na exportação**, mas
não têm tela de RH:

| Face | Onde o dado mora | Leitor de RH |
|---|---|---|
| Portfólio | `respostas_formulario` | **nenhum** (a spec VISRH-04 já descreve) |
| Caso prático | `respostas_avaliacao` (`teste='sjt_caso_aberto'`) | **nenhum** para o texto |
| Entregável externo (Marketing) | lugar nenhum — hoje é texto solto em `sobre_cargo` | não existe campo |

O caso prático **já é etapa do produto**: card `sjt_caso_aberto`, rótulo «Caso prático»,
rota `/candidato/avaliacao/:id/caso`.

## ⚠ A distinção que o primeiro relato errou, e que muda o conserto

O relato inicial dizia «`caso_aberto` → 0 ocorrências no lado RH». **Não é verdade, e a
verdade é mais interessante:**

- `scoresRhService.ts` **é** leitor de RH (`ScoreSubtipo = 'mc' | 'caso_aberto'`, lê
  `scores_candidato` pela allowlist) e é consumido por `hub-candidato/analiseCandidatoService`,
  `triagem/revisaoRedacaoService`, `entrevista/entrevistaService` e `ScorecardAvaliacao`.
- `respostas_avaliacao` tem leitor em **5 arquivos**, e nenhum é de RH: 2 de LGPD
  (`reciboExclusao.generated.ts`, `exportacaoService.ts`) e 3 do caminho do PRÓPRIO
  candidato (`RedacaoEditorScreen`, `useAutosaveAvaliacao`, `avaliacaoService` — autosave
  e recuperação de rascunho).

**Logo: o SCORE do caso prático chega ao RH; o que o candidato ESCREVEU não chega.** O RH
vê um número sobre um texto que não pode ler. Isso não é «falta uma tela» — é uma tela que
existe pela metade, e o conserto é diferente: estender um leitor vivo, não criar o primeiro.

### ⚠⚠ E é pior que um número: o RH vê os TRECHOS que a IA escolheu

`ScorecardAvaliacao.tsx:128` (`CasoAbertoBreakdown`) lê `row.citacoes` — que está na
allowlist do `scoresRhService.ts:126` — e **renderiza as citações**. Quer dizer: a tela
mostra a SELEÇÃO que o modelo fez do texto do candidato, e não oferece o texto de onde a
seleção saiu.

Isso deixa de ser lacuna de UX e vira **buraco de auditabilidade**: quem decide vê a prova
recortada pela IA sem poder conferir o original. É a mesma família do que a Phase 49 passou
consertando em outras telas — mostrar conclusão sem mostrar de onde veio.

**Efeito no corte:** a Parte A fica mais BARATA e mais VALIOSA ao mesmo tempo. O leitor
(`scoresRhService`) e o card (`CasoAbertoBreakdown`) já existem; falta pôr a resposta
íntegra ao lado da citação. Não é tela nova — é um campo a mais num card que já renderiza.

Encosta no **defeito nº 5 da UAT** («2 registro(s) disponíveis para revisão» sem CTA,
`HubCandidatoRH.tsx:389-399`): mesma família — o hub anuncia a existência do material e
não oferece caminho até ele.

## Consequência de escopo — o corte que importa

Nas duas primeiras faces o dado **já está gravado** e **já entra na exportação e no
recibo**. Falta só leitura, que não cria tabela nem exige a §4 (o maquinário de LGPD do M8).

- **Parte A — leitura no Hub do RH.** Sem tabela nova, sem wiring de LGPD. Portfólio e
  caso prático. É a parte que entrega valor e não toca o M8.
- **Parte B — nota/observação do RH + entregável externo.** Tabela nova, §4 inteira, e
  `supabase/tests/p49_motor_antes_depois.sql` **também vira superfície** (dado novo do
  titular ⇒ o motor de exclusão precisa alcançá-lo, e a prova precisa medi-lo).

**Só a Parte B depende do maquinário do M8.** A Parte A pode ir sozinha.

## Por que não foi feito agora

O M8 fecha com a Phase 49 e não há M9 planejado (CLAUDE.md). Isto é escopo de produto, não
conserto de jornada — entra na conversa do próximo milestone, ou como fatia A isolada.
