---
id: 52-wr05-p49-12-text-array-literal
created: 2026-10-11
source: Phase 52 — 52-17 (achado ao consertar o p52_banco_sjt_smoke.sql:743); 52-REVIEW-BANCO-1 WR-05; operador mandou para o backlog em 2026-10-11
priority: low
tags: [smoke, portao, supabase-tests, backlog]
---

# WR-05 — `p49_12_pos_estado.sql:126,135` acrescenta literal sem tipo a um `text[]`

`v_rot := v_rot || '…'` com `v_rot text[]`: o Postgres lê o literal como array e levanta `22P02 malformed array
literal` exatamente quando a checagem falha — o portão fica vermelho sem o rótulo próprio. Conserto: `'…'::text`
(mesma classe do `fix(52-17)` 5f06e100). Os dois são os únicos acertos da forma em `supabase/tests` e
`supabase/migrations` (medido pelo revisor do 52-REVIEW-BANCO-1).
