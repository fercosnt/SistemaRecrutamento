---
id: 49-banco-sjt-aplicado-e-nao-conectado
created: 2026-09-29
source: medido no fechamento da Phase 49, fora do escopo dela
priority: high
resolves_phase: null
tags: [sjt, banco-de-perguntas, vaga-ativa, social-media, videomaker, marketing, dois-canais, jorn-50]
---

# Os bancos SJT novos existem em PROD e **ninguém os usa**

**Medido em 2026-09-29, só leitura.** A migration `20260929000001_banco_sjt_marketing` está
no ledger de PROD e os itens estão no banco:

| `cargo` | itens SJT `active` |
|---|---|
| `social-media` | **7** |
| `videomaker-storymaker` | **7** |
| `sdr-social-seller` (o antigo) | **1** |
| `recepcionista` | 1 |
| `vaga-generica` | 1 |

**E as 3 vagas — inclusive a Social Media ATIVA — seguem apontando para
`sdr-social-seller`**, o banco de 1 item, cujo cenário é de vendas.

## Por que isso é `high` e não cosmético

O defeito que o próprio cabeçalho da migration nomeia **segue vivo na vaga no ar**: o
candidato de conteúdo responde a uma pergunta situacional do cargo errado — e o SJT pesa
**30%** na composição. Não é um banco ocioso; é um banco certo existindo ao lado de uma
avaliação errada em produção.

Aplicar sem conectar é meia-operação, e a metade que ficou é a que não aparece: quem olhar o
banco vê 21 itens novos e conclui que está resolvido.

## Por que NÃO foi feito agora

Mexer em vaga **ativa** durante o fechamento do M8 — com a jornada de prova recém-executada e
os portões da fase 49 por rodar — trocaria o instrumento debaixo da medição. A decisão é do
operador e tem data própria.

## O que fecha

Ligar cada vaga ao banco do seu cargo (`social-media`, `videomaker-storymaker`), e decidir o
destino do `sdr-social-seller` de 1 item — aposentar ou manter como fallback explícito. Vale
conferir, na mesma passada, se alguma candidatura JÁ RESPONDIDA ficou avaliada pelo banco
errado: se ficou, é dado de avaliação a corrigir, não só configuração.

⚠ **Relacionado:** enquanto o arquivo `supabase/migrations/20260929000001_banco_sjt_marketing.sql`
não entrar no git, o repositório **não reproduz PROD** — a divergência de dois canais do
CLAUDE.md, na direção Supabase. O arquivo é de outra sessão e foi pedido a ela que commite.
