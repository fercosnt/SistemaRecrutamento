---
id: publicar-cliente-nao-pertence-a-plano-nenhum
created: 2026-08-03
source: Phase 43 — incidente do cadastro em 400, e a re-verificacao que o seguiu
priority: high
resolves_phase: 44
tags: [processo, deploy, cliente, vercel, observabilidade, m8]
---

# Publicar o cliente nao pertence a plano, fase ou todo nenhum — e tres fases futuras dependem disso

**Achado:** re-verificacao da Phase 43 (2026-08-03), confirmado por varredura de
`.planning/`. Custou um incidente real antes de ser nomeado.

## O que aconteceu

O checkpoint 43-07 executou a ordem obrigatoria `migration → EF → cliente` ate o passo
2 e parou. O passo 3 nao existia em plano nenhum. Resultado: o cadastro de candidato
devolveu `400 VALIDATION` em producao por ~10 horas, porque a EF v16 e deliberadamente
BREAKING contra bundles antigos (o `.strict()` do `autorizacoesSchema` — comportamento
CORRETO, D-04/LGPD-01).

Zero candidatos afetados, e isso foi **circunstancia, nao desenho**: houve 0 cadastros
nos 30 dias anteriores (ultimo real em 2026-06-26). Com trafego, teria sido incidente.

## O problema estrutural, que e maior que o incidente

**Nenhum artefato deste repositorio observa o artefato DEPLOYADO.** Consequencias
medidas no mesmo dia:

- o Vercel nao buildava com sucesso **desde 2026-06-27**. Os 20 deployments visiveis
  estavam todos em ERROR, pelo mesmo erro (`No Output Directory named "dist"`). O site
  seguia servindo um build de junho, congelado. **Cinco semanas invisiveis**;
- deep link nunca funcionou (faltava o SPA fallback): `/cadastro`,
  `/candidato/privacidade`, refresh em rota interna, link compartilhado — todos 404;
- variaveis de ambiente ausentes no build deixavam a pagina em branco.

Os tres passaram por CI verde, `tsc` na baseline, 1400+ testes verdes e build local
funcionando. O repo prova exaustivamente o que ele CONTEM e nada sobre o que esta NO AR.

## Por que e `high` e por que resolve na Phase 44

**As Phases 44, 45 e 47 entregam frontend.** A 44 (Exportacao & Acesso) da ao candidato
uma tela para pedir copia dos proprios dados; a 45, exclusao. Repetir o padrao ali
significa entregar um direito do titular que existe em teste e nao no navegador — que e
precisamente a classe de defeito que este milestone existe para eliminar, so que aplicada
ao proprio milestone.

## O que fazer

**1. Um passo de publicacao explicito no plano de toda fase que toque `src/`.**
Nao um lembrete em prosa: uma task com `<verify>` proprio, no mesmo nivel do apply de
migration. A ordem `migration → EF → cliente` ja esta escrita nos cabecalhos das
migrations; falta ela existir onde a execucao a le.

> ⚠ **Isto e mudanca de TEMPLATE de planejamento, nao entregavel de uma fase.** Se a
> Phase 44 o implementar so para si mesma, as Phases 45 e 47 repetem o defeito — que e
> exatamente o padrao que este todo existe para quebrar. A alteracao tem de viver onde os
> planos sao GERADOS, nao dentro de um plano. `resolves_phase: 44` marca QUANDO isso deixa
> de poder ser adiado, nao o escopo do conserto.

**2. Um gate que observe o DEPLOY, nao o repo.** O minimo util, em ordem de custo:

- `curl` da rota raiz + uma rota interna (prova o SPA fallback) apos cada publicacao;
- assercao de que o bundle no ar contem um marcador da fase (ex.: a presenca de
  `autorizacao_marketing_vagas` provou hoje que o deploy era o codigo novo);
- checagem do estado do ultimo deployment do Vercel — o unico sinal que teria pego as
  cinco semanas.

**3. Decidir de quem e o passo.** Hoje o push e do operador. Isso e legitimo, mas entao
o plano tem de PARAR e pedir, em vez de seguir como se o passo nao existisse. A regra ja
esta registrada em memoria (`deploy-cuja-proxima-etapa-nao-tem-plano-para`): antes de um
deploy, perguntar se o passo SEGUINTE da sequencia obrigatoria pertence a algum plano.

## Relacionado

- `STATE.md` § "BLOQUEADOR FECHADO" — o registro completo do incidente
- `43-07-SUMMARY.md` § "O que este checkpoint NAO entrega" — o aviso que acertou o
  diagnostico antes de acontecer, preservado com bloco de correcao
- `vercel.json` — as duas correcoes (`outputDirectory` e o rewrite de SPA)
