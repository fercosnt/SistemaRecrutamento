---
phase: 44-exporta-o-acesso
review: 44-REVIEW.md
reviewed: 2026-10-07T01:25:33Z
diff: 0fde284f..31d24652
counts: {critical: 1, warning: 6, info: 2}
---

# Disposição dos achados — revisão pós-CR-01 (44-14..44-16)

A disposição da re-revisão anterior (G5) está preservada em `44-REVIEW-DISPOSITION-2026-10-06-G5.md`.

Todas as linhas nascem `open`. **CR-01 é texto ao titular JÁ PUBLICADO** (push `31d24652`, chunk `index-DTxaEkc3.js`, 2026-10-07T01:15Z). O orquestrador conferiu a premissa no disco antes de registrar: `entrevista_guias` tem `candidatura_id` e um `guia` derivado do currículo, e `export-scope-rules.yaml:372` a classifica como `configuracao_do_produto` — a família que a frase descreve como «o mesmo para todos os candidatos».

WR-01 e CR-01 pedem decisão do operador (reclassificar `entrevista_guias`/entregá-la, ou reescrever a frase; e se «pedir algum deles» fica diante de BD-10/BD-9).

| ID | Severidade | Achado | Disposição |
|---|---|---|---|
| CR-01 | critical | A frase nova diz que a configuração retida «é o mesmo para todos os candidatos», mas `entrevista_guias` é por candidatura e derivada do currículo; o portão por família não a vê | open |
| WR-01 | warning | «ou pedir algum deles» convida pedidos de itens que o controlador decidiu não entregar (BD-10, terceiros, BD-9) | open |
| WR-02 | warning | As afirmações positivas da frase («o motivo e as datas entram», «o andamento e as datas do pedido entram», «a decisão em si entra») não têm portão | open |
| WR-03 | warning | A frase vem da allowlist do bundle, mas o arquivo é carimbado com a versão da allowlist da EF — descompasso de deploy a torna falsa de novo | open |
| WR-04 | warning | (k) ainda não vê linhas executadas que não são literais `('x','y')` — duas rotas provadas deixam todo portão local verde | open |
| WR-05 | warning | (k3) não prende o fluxo de controle dentro do `DO $gate$` — `RETURN;`, `IF false THEN` ou reatribuir `r` calam a guarda de drift (provado) | open |
| WR-06 | warning | cp3/cp4 varrem só `src/**/*.ts(x)`, mais estreito que «um canal no sistema inteiro»; cp4 casa por substring | open |
| IN-01 | info | Controles 2 e 4 da (cr3) acoplados a decisões ainda abertas (BD-13 (ii), BD-9) | open |
| IN-02 | info | O docblock do canal ainda descreve o endereço antigo | open |
