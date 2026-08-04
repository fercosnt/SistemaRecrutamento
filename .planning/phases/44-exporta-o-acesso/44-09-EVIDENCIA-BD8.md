# 44-09 — Evidência BD-8 (camada de dados) + um achado que muda o UAT

**Executado pelo orquestrador em:** 2026-08-04, por impersonação real contra PROD, **somente leitura**.
**Origem:** checkpoint `<human-check>` da Task 3 do 44-09.
**Estado:** metade do checkpoint fechada; a outra metade **não é fechável como planejada** — §3.

---

## 1 · Os dois predicados são idênticos (lido do catálogo, não do arquivo)

`pg_get_functiondef` das duas RPCs confirma que o bloco de escopo do BD-8 é **textualmente o
mesmo** em `listar_pedidos_dados` e `contar_pedidos_dados_pendentes`:

```sql
v_role = 'administrador'
OR (v_role = 'rh' AND EXISTS (
      SELECT 1 FROM public.candidaturas cd
       WHERE cd.candidato_id = s.candidato_id
         AND cd.deleted_at IS NULL AND cd.is_rascunho = false
         AND cd.vaga_id IN (SELECT vg.id FROM public.vagas vg WHERE vg.created_by = v_uid)))
```

A diferença entre as duas é só o recorte de situação (`contar` fixa `pendente`; `listar` usa
`p_incluir_atendidos OR situacao='pendente'`). Logo a igualdade a provar é
`contar() ≡ count(listar(false))`.

## 2 · Igualdade medida — e por que ela ainda NÃO é prova

| Papel | contador | fila(false) | igualdade |
|---|---|---|---|
| `administrador` | 0 | 0 | ✅ |
| `rh` (recrutador real `fba9bc0f…`) | 0 | 0 | ✅ |

⚠ **`0 = 0` é verdadeiro trivialmente.** `solicitacoes_dados` tem 0 linhas, então a igualdade
vale por vacuidade e **não** discrimina um predicado correto de um errado. Isto é evidência
fraca, e está registrado como fraca de propósito. A prova forte exige ao menos uma linha
`pendente` cujo escopo **inclua** um papel e **exclua** o outro.

## 3 · O ACHADO — o UAT do 44-09 não fecharia BD-8 nem se fosse executado

O SUMMARY do 44-09 prevê "0 linhas · sem badge nos dois papéis" e trata isso como a igualdade.
A `<precondition>` alertava: sem vaga própria, a fila fica vazia **por escopo**, indistinguível
de vazia por ausência de pedidos. Medi a precondição. Ela **não é satisfeita** — e não por
acidente desta conta:

```
dono da vaga (created_by)             | vagas | papel do dono
--------------------------------------|-------|---------------
(NULL)                                |   6   | —
bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb  |   3   | administrador
```

**Zero vagas em PROD pertencem a um usuário de papel `rh`.** O recrutador real `fba9bc0f…` é
dono de **0** vagas.

Consequências, em ordem de gravidade:

1. **O ramo `rh` do predicado BD-8 não pode retornar linha nenhuma em PROD hoje**, para
   *qualquer* recrutador — o `EXISTS` depende de `vagas.created_by = auth.uid()` e nenhuma vaga
   tem um `rh` em `created_by`. A fila do RH é estruturalmente vazia, independente de quantos
   pedidos existam.
2. **Se um candidato pedir cópia hoje, nenhum recrutador verá o pedido.** Só o administrador. As
   6 vagas com `created_by` NULL são invisíveis a todo papel `rh` por construção.
3. Portanto o UAT planejado seria **inconclusivo por desenho**: "0 linhas nos dois papéis" é o
   resultado esperado *tanto* se o BD-8 estiver certo *quanto* se estiver errado.

Isto **não é defeito do 44-08 nem do 44-09** — os dois implementaram o predicado que o BD-8
especifica. É um descasamento entre o predicado escolhido (`vagas.created_by`) e como a
propriedade de vaga existe de fato neste deployment. A decisão é do operador, não da engenharia,
e cabe em uma de três: popular `created_by` das 6 vagas órfãs; trocar o predicado para a tabela
de associação `vagas_associadas_recrutadores`; ou aceitar que a fila é de administrador.

**Para fechar BD-8 de verdade** é preciso, em ordem: (a) resolver o item acima; (b) criar UMA
linha `pendente` de um candidato com candidatura a uma vaga do recrutador; (c) medir os dois
papéis; (d) remover a linha. Deliberadamente **não** executado aqui: a inserção queimaria a
janela de cooldown de 24 h do titular usado e escreveria em PROD durante um deferral que o
operador pediu — escrita não solicitada.

## 4 · Guarda de papel — provada mordendo (esta parte é forte)

Diferente da igualdade, os negativos são conclusivos:

| Chamador | Resultado |
|---|---|
| `role='candidato'` | ❌ `ERROR 42501: forbidden` |
| **sem JWT** (`request.jwt.claims` vazio ⇒ `v_role` NULL) | ❌ `ERROR 42501: forbidden` |

O segundo é o que importa. É exatamente o caso que a forma `NOT IN` teria deixado **falhar
aberto** (`NULL NOT IN (...)` avalia NULL, o `IF` não é tomado) num `SECURITY DEFINER` que
bypassa RLS — o defeito real medido na 42-06 e rastreado em
`.planning/todos/pending/42-anon-execute-definer-sistemico.md`. A forma `IS DISTINCT FROM`
escolhida pelo 44-02 **falha fechada**, e isso está agora provado por execução, não por leitura.

---

## Veredito

- Guarda de papel (incl. NULL-safe): **provada**, forte.
- Predicados idênticos: **provado** por catálogo.
- Igualdade fila ≡ contador: medida ✅ mas **trivial** — não conta como prova.
- Escopo RH do BD-8: **não provado, e não provável no estado atual dos dados** — ver §3.
