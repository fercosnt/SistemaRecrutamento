# Cognitivo — Knowledge Base

> **Pivot 2026-06-05:** o ICAR60 (e antes o Raven) foram **descartados** como instrumento. O slot cognitivo do funil M2 é preenchido por uma **prova técnica de raciocínio lógico** com itens **CC0**, online, não-psicológica, contextual. A pasta mantém o nome `icar60/` por continuidade histórica, mas o instrumento mudou. Ver [`PRD-cognitivo-raciocinio.md`](../../prds/m2-funil-rh/PRD-cognitivo-raciocinio.md).

## Por que o pivot (resumo)

A Deep Research #1 confirmou que o **ICAR60 é inviável em produção comercial no Brasil** — 4 bloqueios concorrentes:
1. Licença "non-commercial research" (uso em ATS comercial fora de escopo)
2. Zero validação PT-BR publicada
3. Fora do SATEPSI (CFP 31/2022 + Lei 4.119/62)
4. Sem normas brasileiras

**Solução:** reposicionar como **prova técnica de raciocínio lógico** (não teste psicológico), usando **apenas itens CC0** do dataset Harvard Dataverse (matriz + letra-número), aplicada **online com proctoring leve**, com papel **contextual** (nunca eliminatória).

## Conteúdo

### Pesquisa (fonte da decisão)
- **`PESQUISA-icar60-cognitivo.md`** — deep research: viabilidade, scoring CTT, adverse impact, plan B, legal
- **`fontes/alternativas-icar60-testes-cognitivos-brasil.md`** — alternativas mapeadas (G-36, R-1, SJT, etc.)

### Artefatos de implementação (criados 2026-06-05)
- **`item-bank-raciocinio.md`** — fontes CC0, seções (matriz + letra-número), modelo de item, hospedagem de assets
- **`scoring-algorithm.md`** — CTT soma simples + conversão para banda qualitativa + deep module + testes
- **`interpretacao-contextual.md`** — o que o gestor vê, templates de texto por banda, devolutiva, strings proibidas (RNF-12)
- **`bias-mitigation-icar.md`** — auditoria 4/5 adaptada, banding, flag demográfico, DIF, checklist go-live

## Decisões locked (2026-06-05)

- **Instrumento:** prova técnica de raciocínio lógico não-psicológica (não exige psicólogo, diferente do Big Five)
- **Item bank:** matriz + séries letra-número, itens **CC0** (Harvard Dataverse `doi:10.7910/DVN/TZJGAT`)
- **Modo:** online com proctoring leve (não mais presencial)
- **Papel:** contextual, nunca eliminatório (RF-27)
- **Opt-in:** `vaga.aplica_cognitivo` boolean, default false
- **Resultado:** banda qualitativa de 5 faixas — sem percentil/QI
- **Schema:** `scores_candidato` tipo `raciocinio_logico` + `cognitivo_respostas_em_progresso`
- **Reuso:** shell de UI `TesteRavenPage.tsx` (UI), mas scoring/persistência/anti-cheat/item-model são net-new

## ⚠️ Ação P0 pendente (Q-C5)
Auditar git history por imagens Raven legadas (`src/assets/images/raven/`) — já removidas do working tree, mas podem persistir no histórico. Rodar `git filter-repo` se necessário (ver `raven-onboarding-prd.md` §5.4 / RL-08).
