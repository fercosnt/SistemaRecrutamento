# Phase 50: Acesso do Recrutador — Context

**Gathered:** 2026-10-05 (em `/gsd-plan-phase 50`, sem discuss-phase; respostas do operador às perguntas abertas do `50-RESEARCH.md`)
**Status:** Ready for planning

<domain>
## Phase Boundary

O recrutador **ativo** vê tudo o que o administrador vê sobre vagas e candidaturas (todas as vagas — ativas, inativas, arquivadas — e as filas de pedidos de revisão e de dados). O predicado `vagas.created_by = auth.uid()` deixa de ser autorização em policies, funções e Edge Functions. Fora: associação vaga↔recrutador e qualquer granularidade por vaga; JORN-42..49.
</domain>

<decisions>
## Implementation Decisions

### Escopo do alargamento
- **D-01:** Recrutador ativo vê **todas** as vagas e tudo que pende delas — sem associação por vaga (operador, 2026-10-04/05, `44-PENDENCIAS-2026-10-03.md` §G4-b).
- **D-02:** Um único helper vivo (`public.is_active_rh_user()`, checa `usuarios_rh.ativo` em tempo real) em todo ramo alargado — fecha a janela de até 1 h do JWT de um recrutador desativado. O ramo do administrador fica byte-idêntico.
- **D-03:** SC4 lido no sentido estrito: as filas (`listar_pedidos_dados`, `contar_pedidos_dados_pendentes`, `listar_revisoes_decisao`, `contar_revisoes_pendentes`) devolvem ao recrutador ativo **exatamente** o que devolvem ao administrador, órfãos inclusive.

### Inclusões decididas pelo operador
- **D-04:** Consertar nesta fase os dois guards que deixam passar chamador sem papel (`reprocessar_analise`, `salvar_revisao_redacao`) e revogar `EXECUTE` de `anon` nas funções reescritas que o têm. Fecha a parte correspondente de `.planning/todos/pending/42-anon-execute-definer-sistemico.md` (apenas para estas funções).
- **D-05:** `v_analises_presas` passa a `security_invoker = true`.
- **D-06:** `upsert_pergunta_opcoes_metadata` também é alargada (consistência com a policy `rh_gerencia_opcao_metadata`).

### O que NÃO muda
- **D-07:** Os dados de teste (`fixture-p46`, vagas `[TESTE]`) ficam visíveis ao recrutador real — nenhuma exclusão nesta fase.
- **D-08:** Gates de dono por regra de negócio continuam: REVISAO-05 (decisor não responde à própria revisão) e D-23; as funções de autoria (`created_by` como registro, não autorização) não são tocadas — em especial `anonimizar_candidato` e `plano_exclusao_titular`, cujo md5 o smoke da 45 fixa.
- **D-09:** Checagens de integridade nas EFs permanecem (comparativo `3c` — candidaturas de outra vaga → 403; cross-check do gerar-guia). Alargar ≠ remover integridade.

### Prova
- **D-10:** SC1 exige sessão real: o operador cria um recrutador (RH2, papel `recrutador`, caixa de e-mail real) em `/rh/configuracoes` — `checkpoint:human-action`. Não reativar `recrutador.rh@teste.com` (e-mail com hard-bounce).
- **D-11:** SC2 pode ser provado por impersonação no smoke; prova real de desativação é opcional.
- **D-12:** Mudança de controle de acesso: review bloqueante antes do apply; prova de que nada abriu para `anon`/candidato (incluindo views).

### Claude's Discretion
- Divisão em migrations atômicas, ordem das ondas, forma exata do helper e do smoke-portão (seguir `50-RESEARCH.md`).
</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/50-acesso-do-recrutador/50-RESEARCH.md` — inventário medido em PROD (14 policies, 18 funções, 5 EFs), padrões, tabela de testes legados
- `.planning/phases/44-exporta-o-acesso/44-PENDENCIAS-2026-10-03.md` §G4-b — decisão do operador
- `CLAUDE.md` — via de apply (`p46apply.cjs`), varredura por forma, push depois de apply visível
</canonical_refs>

<deferred>
## Deferred Ideas

- Associação vaga↔recrutador (`vagas_associadas_recrutadores`) — alternativa citada, não escolhida.
- Limpeza dos dados de teste em PROD — não decidida para esta fase.
- O resto do `42-anon-execute-definer-sistemico` (funções fora das reescritas aqui).
</deferred>
